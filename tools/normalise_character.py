#!/usr/bin/env python3
"""
normalise_character.py — turn the seven hand-drawn outfit sheets into seven
identical, uniformly gridded sprite sheets.

    python tools/normalise_character.py

Why this is needed: the sheets are hand-laid, not engine-exported. Row heights
differ, figures touch each other, and sheet 7 is 2048x2048 while 1-6 are
1856x2270. There is no constant frame pitch to index, and one shared frame index
cannot address all seven as delivered.

Method — no scaling anywhere, because scaling pixel art by a non-integer factor
destroys it:
  1. find each figure by row-band then column-run projection of the alpha
  2. take the largest figure box across ALL sheets as the common cell
  3. re-lay every figure into that cell, aligned BOTTOM-CENTRE

Bottom-centre is the correct anchor for a character: feet stay on the ground line
and the figure does not bob when the outfit changes mid-stride.
"""

from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "public" / "assets" / "pixel" / "final"
GAP = int(__import__("os").environ.get("GAP", 2))   # min transparent columns separating two figures
MIN_PX = 400     # ignore specks
PER_ROW = 8      # figures per row — both sheet sizes divide by 8


def figures(a: np.ndarray):
    """Bounding box of every figure, in reading order."""
    op = a[:, :, 3] > 8

    def runs(mask, min_gap):
        idx = np.where(mask)[0]
        if not len(idx):
            return []
        out, s, prev = [], idx[0], idx[0]
        for i in idx[1:]:
            if i - prev > min_gap:
                out.append((s, prev)); s = i
            prev = i
        out.append((s, prev))
        return out

    # Row bands separate cleanly. Columns do NOT: adjacent figures touch, with
    # zero transparent columns between them, so no gap threshold can split them.
    # The sheets are regular though, so each band is cut into PER_ROW equal
    # cells by pitch and each cell trimmed to its own content.
    boxes = []
    W = a.shape[1]
    pitch = W / PER_ROW
    for (y0, y1) in runs(op.any(axis=1), GAP):
        band = op[y0:y1 + 1]
        for c in range(PER_ROW):
            x0, x1 = int(round(c * pitch)), int(round((c + 1) * pitch)) - 1
            sub = band[:, x0:x1 + 1]
            if sub.sum() < MIN_PX:
                continue
            ys = np.where(sub.any(axis=1))[0]
            xs = np.where(sub.any(axis=0))[0]
            boxes.append((x0 + int(xs[0]), y0 + int(ys[0]),
                          int(xs[-1] - xs[0]) + 1, int(ys[-1] - ys[0]) + 1))
    return boxes


if __name__ == "__main__":
    sheets = {}
    for i in range(1, 8):
        p = DIR / f"outfit{i}_raw.png"
        if not p.exists():
            print("missing", p.name); continue
        a = np.array(Image.open(p).convert("RGBA"))
        b = figures(a)
        sheets[i] = (a, b)
        print(f"outfit{i}: {len(b)} figures, "
              f"largest {max(x[2] for x in b)}x{max(x[3] for x in b)}")

    if not sheets:
        raise SystemExit("nothing to do")

    counts = {i: len(b) for i, (_, b) in sheets.items()}
    if len(set(counts.values())) != 1:
        print("\n!! frame counts differ between sheets:", counts)
        print("   the outfits cannot share one frame index until they match.")

    cw = max(box[2] for _, b in sheets.values() for box in b)
    ch = max(box[3] for _, b in sheets.values() for box in b)
    cols = max(counts.values())
    # lay out as a single row per sheet is too wide; use the source's own rows
    per_row = PER_ROW
    rows = (cols + per_row - 1) // per_row
    print(f"\ncommon cell {cw}x{ch}, grid {per_row}x{rows}")

    manifest = {"cell": [cw, ch], "cols": per_row, "rows": rows, "frames": cols,
                "anchor": "bottom-centre",
                "note": "feet sit on the cell's bottom edge; x centred"}

    for i, (a, boxes) in sheets.items():
        out = np.zeros((ch * rows, cw * per_row, 4), dtype=np.uint8)
        for n, (x, y, w, h) in enumerate(boxes[:cols]):
            r, c = divmod(n, per_row)
            dx = c * cw + (cw - w) // 2      # centred
            dy = r * ch + (ch - h)           # bottom aligned
            out[dy:dy + h, dx:dx + w] = a[y:y + h, x:x + w]
        Image.fromarray(out).save(DIR / f"outfit{i}.png", optimize=True)
        print(f"  wrote outfit{i}.png  {cw*per_row}x{ch*rows}  ({len(boxes)} frames)")

    (DIR / "outfits.json").write_text(json.dumps(manifest, indent=2))
    print("\nmanifest ->", DIR / "outfits.json")
