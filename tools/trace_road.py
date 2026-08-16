#!/usr/bin/env python3
"""
trace_road.py — find the road on the hand-painted map and turn it into a PATH.

    python tools/trace_road.py [--debug]

The map is now one painted image, so PATH can no longer come from tile data. The
road is however a distinct sandy colour, so it can be recovered rather than
guessed at by clicking points off a screenshot.

Method: mask the road by colour, then for each scanline take the centre of the
road run NEAREST THE PREVIOUS ROW'S CENTRE. Plain median-of-all-road-pixels fails
badly here — where a side track branches off, the median jumps sideways into open
ground and the walker cuts across a field. Tracking the nearest run keeps to one
continuous carriageway through every junction.

Output: waypoints in map pixels, ready for journey.js, plus an optional debug PNG
with the trace drawn over the map.
"""

import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "public" / "assets" / "pixel" / "final"

# sandy road / paving, sampled off the map
# Sampled off the map, not guessed. Open road is #d8a25c (216,162,92). The
# earlier range started at R=150 and swept up the manor roofs (#835130) and
# their shadows, so the trace climbed over the rooftops and the walker ended up
# standing on #240c02 — a roof outline. Keep the floor above the roof browns.
ROAD_LO = np.array([185, 140, 70])
ROAD_HI = np.array([245, 200, 150])
# The causeway is grey stone — but so is every castle wall and roof on this map,
# so a broad grey range drags the trace up onto buildings. Kept deliberately
# narrow and only consulted when no sand is found on the row.
# Paved courtyard and desert plaza: #9a8d7d and #a5937b. Still narrow, still
# only consulted when no sand is found on the row.
STONE_LO = np.array([140, 130, 110])
STONE_HI = np.array([190, 180, 160])


def road_mask(rgb: np.ndarray):
    sand = np.all((rgb >= ROAD_LO) & (rgb <= ROAD_HI), axis=2)
    stone = np.all((rgb >= STONE_LO) & (rgb <= STONE_HI), axis=2)
    return sand, stone


def runs_in_row(row: np.ndarray, min_w: int):
    idx = np.where(row)[0]
    if not len(idx):
        return []
    out, s, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i != prev + 1:
            if prev - s + 1 >= min_w:
                out.append((s, prev))
            s = i
        prev = i
    if prev - s + 1 >= min_w:
        out.append((s, prev))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-width", type=int, default=14)
    ap.add_argument("--step", type=int, default=8, help="sample every N rows")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    im = Image.open(DIR / "base_map.png").convert("RGB")
    W, H = im.size
    rgb = np.array(im)
    sand, stone = road_mask(rgb)
    print(f"map {W}x{H}, sand {sand.sum()/(W*H)*100:.1f}%, stone {stone.sum()/(W*H)*100:.1f}%")

    # A road bends; it does not teleport. Capping horizontal movement per sampled
    # row is what stops the trace hopping onto a parallel track, cutting the
    # corner across a field, or — as it did — striking out diagonally across open
    # sea instead of taking the causeway.
    # The manors sit ON the central axis and the road weaves AROUND them, so a
    # tight cap plus "hold the line" drove the trace straight through the
    # buildings — the walker ended up standing on a roof outline (#240c02).
    # Wide enough to follow a road bending round an obstacle, still far short of
    # the ~200px leap that would carry it across open sea.
    MAX_DX = max(6, args.step * 7)

    pts = []
    last = None
    for y in range(0, H, args.step):
        rs = runs_in_row(sand[y], args.min_width)
        if not rs:
            rs = runs_in_row(stone[y], args.min_width)   # causeway, paved plaza
        if last is None:
            if not rs:
                continue
            s, e = max(rs, key=lambda r: r[1] - r[0])
            c = (s + e) // 2
        else:
            near = [r for r in rs if abs((r[0] + r[1]) / 2 - last) <= MAX_DX]
            if near:
                s, e = min(near, key=lambda r: abs((r[0] + r[1]) / 2 - last))
                c = (s + e) // 2
            else:
                # nothing within reach: hold the line rather than jump. Straight
                # on is nearly always right — it is a bridge, a gateway or a
                # stretch the colour key missed.
                c = last
        pts.append((int(c), int(y)))
        last = c

    print(f"traced {len(pts)} centre points")

    # simplify: keep points that deviate from a straight run
    simp = [pts[0]]
    for p in pts[1:-1]:
        ax, ay = simp[-1]
        if abs(p[0] - ax) >= 10 or p[1] - ay >= 64:
            simp.append(p)
    simp.append(pts[-1])
    print(f"simplified to {len(simp)} waypoints")

    (DIR / "road_path.json").write_text(json.dumps({
        "map": [W, H], "units": "map pixels",
        "note": "centreline of the painted road, traced by colour",
        "points": simp,
    }, indent=2))
    print("->", DIR / "road_path.json")

    if args.debug:
        dbg = im.convert("RGBA")
        a = np.array(dbg)
        for i in range(len(simp) - 1):
            x0, y0 = simp[i]; x1, y1 = simp[i + 1]
            n = max(abs(x1 - x0), abs(y1 - y0), 1)
            for t in range(n + 1):
                x = int(x0 + (x1 - x0) * t / n); y = int(y0 + (y1 - y0) * t / n)
                a[max(0, y-1):y+2, max(0, x-1):x+2] = [255, 0, 128, 255]
        Image.fromarray(a).save(DIR / "_road_debug.png")
        print("->", DIR / "_road_debug.png")


if __name__ == "__main__":
    main()
