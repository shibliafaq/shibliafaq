#!/usr/bin/env python3
"""
compose_map.py — build the overworld from itch.io tiles, guided by the reference.

    python tools/compose_map.py --stage terrain
    python tools/compose_map.py --stage all

STAGED, because one pass doing everything gives a mediocre everything:

    terrain  -> ground, water, road, farm. Nine-sliced. No sprites at all.
    buildings-> detected structures become kit buildings.
    trees    -> canopy where the reference has canopy.
    props    -> rocks, crops, fences.

--stage renders up to and including that stage.

TWO THINGS THE FIRST VERSION GOT WRONG, both fixed here.

1. PER-TILE AVERAGING KILLED THIN FEATURES. Averaging a 16px tile's colour and
   clustering that lost the road: a tile straddling the road edge averages
   road+grass and lands as neither. Now every PIXEL is classified and each tile
   takes a weighted vote, where road wins on a minority share because roads are
   thin and matter more than the grass beside them.

2. COLOUR CANNOT SEPARATE ROOFS FROM AUTUMN TREES. Both are dark warm brown, so
   a colour rule for "roof" swallowed 29% of the map while finding zero forest.
   Measured fix: buildings are made of LOW-SATURATION material (slate, stone,
   cream plaster) and vegetation is SATURATED (green or autumn orange). That one
   test separates them almost perfectly — see `structure_mask`.

Object pixels are excluded from the terrain vote, so a tile with a tree standing
on grass votes grass, not "dark". Terrain is what is UNDER the objects.
"""

from __future__ import annotations
import argparse
import json
import random
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "public" / "assets" / "pixel" / "final" / "base_map.png"
OUT = ROOT / "lab" / "composed_map.png"
KIT = ROOT.parent / "map-kit"
CUTE = ROOT / "assets" / "tilesets" / "incoming" / "_x" / "cute" / "Cute_Fantasy_Free" / "Tiles"

STAGES = ["terrain", "buildings", "trees", "props"]
TERRAIN = ["water", "grass", "path", "farm"]
LABEL_COLOUR = {"water": "#3fa7d6", "grass": "#7cbf5a", "path": "#c39a5d", "farm": "#d9a441"}

# first rule to fire wins; road/water win on a minority because they are thin
TILE_PRIORITY = [("water", 0.34), ("path", 0.30), ("farm", 0.40)]


# ------------------------------------------------------------------ masks
def hsv_of(ref: np.ndarray):
    hsv = cv2.cvtColor(ref, cv2.COLOR_RGB2HSV).astype(np.float32)
    return hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255


def structure_mask(H, S, V):
    """Buildings, bridges and stonework.

    Measured, not guessed: every building on the reference is built from
    LOW-SATURATION material — grey slate, stone, cream plaster — while every
    tree is saturated, green or autumn orange. S < 0.34 catches the buildings
    and rejects the canopy almost perfectly. CLOSE fills the window gaps so a
    house reads as one blob; OPEN drops the stray grey speckle in the dirt.
    """
    m = ((S < 0.34) & (V > 0.30) & (V < 0.92)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return m


def canopy_mask(H, S, V, built):
    """Vegetation, separated from ground by TWO measured tests, not one.

    Hue splits autumn foliage from the dirt road: both are saturated orange,
    and an earlier H<48 cut ate the entire road (canopy hit 51.7% of the map).
    Foliage clusters sit at H=17-20, every dirt/sand cluster at H=28-40, so the
    boundary goes at 26.

    Texture splits tree canopy from grass: both are green, so colour alone
    masked out the grass and left the map 54% dirt. Canopy carries dark outlines
    and reads rough; a grass field is smooth. Local std of V over a 9x9 window
    separates them at 0.085 (measured: grass 0.00-0.04, canopy 0.13+).
    """
    m1 = cv2.blur(V, (9, 9))
    std = np.sqrt(np.maximum(cv2.blur(V * V, (9, 9)) - m1 * m1, 0))
    green = (H >= 60) & (H <= 175) & (S > 0.30) & (std >= 0.085)
    autumn = ((H < 26) | (H > 335)) & (S > 0.55) & (V > 0.22) & (V < 0.86)
    m = ((green | autumn) & (built == 0)).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


# ------------------------------------------------------------------ K-means
def kmeans(pts: np.ndarray, k: int, iters: int = 14, seed: int = 7):
    rng = np.random.default_rng(seed)
    idx = [int(rng.integers(len(pts)))]
    for _ in range(k - 1):
        d2 = np.min(((pts[:, None, :] - pts[idx][None, :, :]) ** 2).sum(-1), axis=1)
        s = d2.sum()
        idx.append(int(rng.choice(len(pts), p=d2 / s)) if s > 0 else int(rng.integers(len(pts))))
    C = pts[idx].astype(np.float32)
    for _ in range(iters):
        lab = ((pts[:, None, :] - C[None, :, :]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            m = lab == j
            if m.any():
                C[j] = pts[m].mean(0)
    return C


def rgb_to_hsv(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    mx, mn = max(r, g, b), min(r, g, b)
    v = mx
    s = 0 if mx == 0 else (mx - mn) / mx
    if mx == mn:
        h = 0
    elif mx == r:
        h = (60 * (g - b) / (mx - mn) + 360) % 360
    elif mx == g:
        h = 60 * (b - r) / (mx - mn) + 120
    else:
        h = 60 * (r - g) / (mx - mn) + 240
    return h, s, v


def label_ground(rgb) -> str:
    """Only four ground types. Objects are handled by their own masks, so this
    never has to tell a roof from a tree — which is exactly what it was bad at."""
    r, g, b = [int(c) for c in rgb]
    h, s, v = rgb_to_hsv(r, g, b)
    if 180 <= h <= 245 and s > 0.18:
        return "water"
    if 60 <= h <= 175 and s > 0.20:
        return "grass"
    if 33 <= h <= 58 and s > 0.45 and v > 0.72:
        return "farm"           # gold crop rows
    if 15 <= h <= 60:
        return "path"           # the whole dirt / sand / road family
    return "grass"


# ------------------------------------------------------------------ sheets
def load_rgba(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert("RGBA"))


def nine(sheet: np.ndarray, T: int = 16):
    return [[sheet[r * T:(r + 1) * T, c * T:(c + 1) * T] for c in range(3)] for r in range(3)]


def slice_for(mask: int):
    n, e, s, w = mask & 1, mask & 2, mask & 4, mask & 8
    row = 1 if (n and s) else (0 if not n else 2)
    col = 1 if (e and w) else (0 if not w else 2)
    return row, col


def paste(dest, tile, x, y):
    if tile is None or tile.ndim != 3:
        return
    h, w = tile.shape[:2]
    Hh, Ww = dest.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(x + w, Ww), min(y + h, Hh)
    if x1 <= x0 or y1 <= y0:
        return
    src = tile[y0 - y:y1 - y, x0 - x:x1 - x]
    if src.shape[2] == 4:
        a = src[..., 3:4].astype(np.float32) / 255.0
        dst = dest[y0:y1, x0:x1]
        dst[..., :3] = (src[..., :3] * a + dst[..., :3] * (1 - a)).astype(np.uint8)
        dst[..., 3] = np.maximum(dst[..., 3], src[..., 3])
    else:
        dest[y0:y1, x0:x1, :3] = src[..., :3]
        dest[y0:y1, x0:x1, 3] = 255


# ------------------------------------------------------------------ terrain
def classify_ground(ref, ignore, k):
    """Per-pixel ground label, learned only from pixels that ARE ground."""
    flat = ref.reshape(-1, 3).astype(np.float32)
    ok = (ignore.reshape(-1) == 0)
    rng = np.random.default_rng(3)
    pool = flat[ok]
    sample = pool[rng.choice(len(pool), size=min(60000, len(pool)), replace=False)]
    C = kmeans(sample, k)
    lut = np.array([TERRAIN.index(label_ground(c)) for c in C], np.int8)
    out = np.empty(len(flat), np.int8)
    CH = 400_000
    for i in range(0, len(flat), CH):
        blk = flat[i:i + CH]
        out[i:i + CH] = lut[((blk[:, None, :] - C[None, :, :]) ** 2).sum(-1).argmin(1)]
    return out.reshape(ref.shape[:2]), C


def vote_tiles(px, ignore, T):
    """Tile label from a vote of its GROUND pixels only."""
    Hh, Ww = px.shape
    tH, tW = Hh // T, Ww // T
    valid = (ignore == 0)[:tH * T, :tW * T].reshape(tH, T, tW, T)
    blocks = px[:tH * T, :tW * T].reshape(tH, T, tW, T)
    nvalid = valid.sum((1, 3)).astype(np.float32)
    nvalid[nvalid == 0] = 1
    grid = np.full((tH, tW), TERRAIN.index("grass"), np.int8)
    fr = {}
    for i, name in enumerate(TERRAIN):
        fr[name] = ((blocks == i) & valid).sum((1, 3)) / nvalid
    grid[fr["grass"] > 0] = TERRAIN.index("grass")
    for name, th in reversed(TILE_PRIORITY):
        grid[fr[name] >= th] = TERRAIN.index(name)
    return grid


def despeckle(grid):
    out = grid.copy()
    Hh, Ww = grid.shape
    pad = np.pad(grid, 1, mode="edge")
    for y in range(Hh):
        for x in range(Ww):
            nb = [pad[y, x + 1], pad[y + 2, x + 1], pad[y + 1, x], pad[y + 1, x + 2]]
            if all(n != grid[y, x] for n in nb):
                v, c = np.unique(nb, return_counts=True)
                out[y, x] = v[c.argmax()]
    return out


def bridge_path(grid):
    """A road with one-tile holes reads as rubble. Fill a gap that has road on
    both opposite sides."""
    P = TERRAIN.index("path")
    out = grid.copy()
    Hh, Ww = grid.shape
    for y in range(1, Hh - 1):
        for x in range(1, Ww - 1):
            if grid[y, x] == P:
                continue
            if (grid[y - 1, x] == P and grid[y + 1, x] == P) or \
               (grid[y, x - 1] == P and grid[y, x + 1] == P):
                out[y, x] = P
    return out


def paint_terrain(grid, T):
    tH, tW = grid.shape
    canvas = np.zeros((tH * T, tW * T, 4), np.uint8)
    canvas[..., 3] = 255
    grass = load_rgba(CUTE / "Grass_Middle.png")
    sheets = {"water": nine(load_rgba(CUTE / "Water_Tile.png"), T),
              "path": nine(load_rgba(CUTE / "Path_Tile.png"), T),
              "farm": nine(load_rgba(CUTE / "FarmLand_Tile.png"), T)}
    for y in range(tH):
        for x in range(tW):
            paste(canvas, grass, x * T, y * T)
    for lab in ("farm", "path", "water"):
        m = grid == TERRAIN.index(lab)
        if not m.any():
            continue
        sh = sheets[lab]
        pad = np.pad(m, 1, constant_values=False)
        for y in range(tH):
            for x in range(tW):
                if not m[y, x]:
                    continue
                bit = (1 if pad[y, x + 1] else 0) | (2 if pad[y + 1, x + 2] else 0) \
                    | (4 if pad[y + 2, x + 1] else 0) | (8 if pad[y + 1, x] else 0)
                r, c = slice_for(bit)
                paste(canvas, sh[r][c], x * T, y * T)
    return canvas


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", type=int, default=16)
    ap.add_argument("--k", type=int, default=12)
    ap.add_argument("--stage", default="all", choices=STAGES + ["all"])
    ap.add_argument("--bth", type=int, default=45, help="min building blob area/32")
    ap.add_argument("--trees", type=int, default=55)
    ap.add_argument("--rocks", type=int, default=6)
    ap.add_argument("--labels", action="store_true")
    ap.add_argument("--grid", action="store_true")
    args = ap.parse_args()
    T = args.tile
    upto = STAGES.index(args.stage) if args.stage != "all" else len(STAGES) - 1

    ref = np.array(Image.open(MAP).convert("RGB"))
    Hh, Ss, Vv = hsv_of(ref)
    built = structure_mask(Hh, Ss, Vv)
    canopy = canopy_mask(Hh, Ss, Vv, built)
    ignore = ((built | canopy) > 0).astype(np.uint8)
    print(f"reference {ref.shape[1]}x{ref.shape[0]}  "
          f"structure {built.mean()*100:.1f}%  canopy {canopy.mean()*100:.1f}%")

    px, C = classify_ground(ref, ignore, args.k)
    grid = bridge_path(despeckle(vote_tiles(px, ignore, T)))
    tH, tW = grid.shape
    counts = {n: int((grid == i).sum()) for i, n in enumerate(TERRAIN)}
    print(f"{tW}x{tH} tiles  " + "  ".join(f"{k}={v}" for k, v in counts.items()))

    canvas = paint_terrain(grid, T)
    n_b = n_t = n_r = 0
    taken = np.zeros((tH, tW), bool)          # tiles a building already owns

    # ---- buildings: connected structure blobs -> kit buildings ------------
    if upto >= 1:
        files = list((KIT / "02-buildings" / "used-on-map").glob("*.png")) + \
                list((KIT / "02-buildings" / "available-unused").glob("*.png"))
        blds = [b for b in (load_rgba(p) for p in files) if 24 < b.shape[1] < 200]
        n, lbl, stats, cent = cv2.connectedComponentsWithStats(built, 8)
        # widest first, so the big manors claim their ground before the sheds
        order = sorted(range(1, n), key=lambda i: -stats[i, cv2.CC_STAT_AREA])
        for i in order:
            x, y, w, h, a = (stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_TOP],
                             stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT],
                             stats[i, cv2.CC_STAT_AREA])
            if a < args.bth * 32 or w < 26 or h < 26:
                continue
            if w > 500 or h > 500:            # the fused bridge/shore blob
                continue
            rng = random.Random(int(x) * 7919 + int(y) * 104729)
            fit = sorted(blds, key=lambda b: abs(b.shape[1] - w))
            b = rng.choice(fit[:3])
            bx = x + w // 2 - b.shape[1] // 2
            by = y + h - b.shape[0]           # feet on the blob's bottom edge
            paste(canvas, b, bx, by)
            n_b += 1
            t0x, t0y = max(0, bx // T), max(0, by // T)
            taken[t0y:(by + b.shape[0]) // T + 1, t0x:(bx + b.shape[1]) // T + 1] = True

    # ---- trees: density from the canopy mask ------------------------------
    if upto >= 2:
        tf = list((KIT / "03-trees-and-plants" / "used-on-map").glob("*.png")) + \
             [p for p in (KIT / "03-trees-and-plants" / "available-unused").glob("*.png")
              if "sheet" not in p.name.lower() and "trees" not in p.name.lower()]
        trees = [t for t in (load_rgba(p) for p in tf) if 8 < t.shape[1] < 64]
        cov = canopy[:tH * T, :tW * T].reshape(tH, T, tW, T).mean((1, 3))
        for y in range(tH):
            for x in range(tW):
                # never on the road or in the water: a tree standing in the
                # carriageway is the fastest way to break the illusion, and the
                # walker has to get through
                if taken[y, x] or TERRAIN[grid[y, x]] in ("water", "path"):
                    continue
                c = cov[y, x]
                if c < 0.28:
                    continue
                rng = random.Random(x * 91 + y * 137 + 3)
                if rng.random() < c * args.trees / 100 * 1.4 and trees:
                    t = rng.choice(trees)
                    paste(canvas, t, x * T + T // 2 - t.shape[1] // 2,
                          y * T + T - t.shape[0] + 2)
                    n_t += 1

    # ---- props ------------------------------------------------------------
    if upto >= 3:
        props = []
        for p in (KIT / "Final assets" / "04-props").glob("*.png"):
            t = load_rgba(p)
            if t.shape[1] < 48 and t.shape[0] < 48:
                props.append(t)
        for y in range(tH):
            for x in range(tW):
                if taken[y, x] or TERRAIN[grid[y, x]] not in ("farm", "grass"):
                    continue
                rng = random.Random(x * 191 + y * 227 + 11)
                if rng.random() < args.rocks / 100 and props:
                    r = rng.choice(props)
                    paste(canvas, r, x * T + T // 2 - r.shape[1] // 2,
                          y * T + T - r.shape[0])
                    n_r += 1

    if args.labels:
        for y in range(tH):
            for x in range(tW):
                hx = LABEL_COLOUR[TERRAIN[grid[y, x]]]
                rgb = np.array([int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16)])
                pane = canvas[y * T:(y + 1) * T, x * T:(x + 1) * T, :3].astype(np.float32)
                canvas[y * T:(y + 1) * T, x * T:(x + 1) * T, :3] = \
                    (pane * 0.55 + rgb * 0.45).astype(np.uint8)
    if args.grid:
        canvas[::T, :, :3] = 40
        canvas[:, ::T, :3] = 40

    Image.fromarray(canvas).save(OUT)
    Path(str(OUT) + ".json").write_text(json.dumps(
        {"tilesW": tW, "tilesH": tH, "stage": args.stage, "buildings": n_b,
         "trees": n_t, "rocks": n_r, "counts": counts,
         "legend": [[n, LABEL_COLOUR[n]] for n in TERRAIN if counts.get(n)]}, indent=1))
    print(f"-> {OUT}  stage={args.stage}  {n_b} buildings, {n_t} trees, {n_r} props")


if __name__ == "__main__":
    main()
