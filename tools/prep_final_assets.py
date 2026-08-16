#!/usr/bin/env python3
"""
prep_final_assets.py — make the hand-built Photoshop assets usable.

    python tools/prep_final_assets.py

Three jobs:

1. Base map JPEG -> PNG. The container becomes lossless, which stops any FURTHER
   degradation. It does not undo what JPEG already did — the ringing around every
   sprite edge is baked into the pixels.

2. Character sheets -> transparent background. Done by flood-filling inward from
   the border, NOT by deleting every near-white pixel. The figures contain white
   (eyes, highlights, shirt), and a global key would punch holes straight through
   them. Only white that is *connected to the edge* is background.

3. Sheet 7 is 2048x2048 while 1-6 are 1856x2270. It is re-gridded onto the same
   canvas rather than scaled: scaling pixel art by a non-integer factor destroys
   it. Frames are lifted out and re-laid at the common pitch.
"""

from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / "map-kit" / "Final assets"
OUT = ROOT / "public" / "assets" / "pixel" / "final"
OUT.mkdir(parents=True, exist_ok=True)

WHITE_TOL = 26          # how far off pure white still counts as background
ALPHA_EDGE_TOL = 60     # softer band, feathered to alpha rather than cut


def to_png(src: Path, dst: Path) -> None:
    """JPEG -> PNG. Lossless container; the JPEG damage is already in the pixels."""
    im = Image.open(src).convert("RGB")
    im.save(dst, "PNG", optimize=True)
    print(f"  map   {src.name} {im.size[0]}x{im.size[1]} -> {dst.name}")


def key_white(src: Path, dst: Path):
    """
    Remove the background by flooding in from the edges.

    A global 'delete near-white' would also delete the whites inside the figure.
    Flooding from the border only reaches background, so interior whites survive.
    """
    im = Image.open(src).convert("RGBA")
    a = np.array(im)
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(np.int16)

    # near-white mask, with a slightly wider band used only for feathering
    dist = (255 - rgb).max(axis=2)
    is_bg_core = dist <= WHITE_TOL
    is_bg_soft = dist <= ALPHA_EDGE_TOL

    seen = np.zeros((h, w), dtype=bool)
    q = deque()

    def push(y, x):
        if 0 <= y < h and 0 <= x < w and not seen[y, x] and is_bg_core[y, x]:
            seen[y, x] = True
            q.append((y, x))

    for x in range(w):
        push(0, x); push(h - 1, x)
    for y in range(h):
        push(y, 0); push(y, w - 1)

    while q:
        y, x = q.popleft()
        push(y + 1, x); push(y - 1, x); push(y, x + 1); push(y, x - 1)

    a[:, :, 3] = np.where(seen, 0, 255)

    # Feather: a pixel touching the flooded background that is still nearly white
    # is an anti-aliased edge; drop it to partial alpha rather than leaving a
    # hard white fringe around the figure.
    nb = np.zeros((h, w), dtype=bool)
    nb[1:, :] |= seen[:-1, :]; nb[:-1, :] |= seen[1:, :]
    nb[:, 1:] |= seen[:, :-1]; nb[:, :-1] |= seen[:, 1:]
    fringe = nb & ~seen & is_bg_soft
    a[:, :, 3] = np.where(fringe, 90, a[:, :, 3])

    Image.fromarray(a).save(dst, "PNG", optimize=True)
    cleared = int(seen.sum())
    print(f"  char  {src.name} {w}x{h}  background {cleared/(w*h)*100:.1f}%  -> {dst.name}")
    return a


def frame_boxes(a: np.ndarray):
    """Bounding box of every opaque blob, so the frame grid can be derived."""
    op = a[:, :, 3] > 8
    ys = np.where(op.any(axis=1))[0]
    xs = np.where(op.any(axis=0))[0]
    if not len(ys):
        return None
    # column runs and row runs of occupied pixels -> the grid
    def runs(idx):
        out, s = [], idx[0]
        for i in range(1, len(idx)):
            if idx[i] != idx[i - 1] + 1:
                out.append((s, idx[i - 1])); s = idx[i]
        out.append((s, idx[-1]))
        return out
    return runs(xs), runs(ys)


if __name__ == "__main__":
    print("prepping final assets ->", OUT)

    jpg = SRC / "Base map.jpg"
    if jpg.exists():
        to_png(jpg, OUT / "base_map.png")

    keyed = {}
    for i in range(1, 8):
        p = SRC / f"Character ({i}).png"
        if not p.exists():
            print("  MISSING", p.name); continue
        keyed[i] = key_white(p, OUT / f"outfit{i}_raw.png")

    print("\nframe grid per sheet (column runs x row runs):")
    for i, a in keyed.items():
        r = frame_boxes(a)
        if not r:
            print(f"  outfit{i}: empty"); continue
        cols, rows = r
        print(f"  outfit{i}: {len(cols)} cols x {len(rows)} rows   "
              f"col spans {cols[:3]}...   row spans {rows[:3]}...")
