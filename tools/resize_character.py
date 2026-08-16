#!/usr/bin/env python3
"""
resize_character.py — bring the outfit sheets down to map scale.

    python tools/resize_character.py                 # default: 45px figure
    python tools/resize_character.py --height 40
    python tools/resize_character.py --door 48       # derive height from a door

WHY 45: measured on base_map.png at the cathedral door, region
(600,330)-(860,520). The door is ~48px and the NPC standing on the path is ~47px.
A real door is 2.0m and an adult 1.7m, so an adult is 0.85 of a door: 48 * 0.85
= 41px, and the drawn NPC agrees at ~45. That is the scale of this world. The
normalised sheets draw the figure at 580px — about 13x too big.

HOW, and why it is not just Image.resize:

  * Alpha is PREMULTIPLIED before scaling and un-premultiplied after. Resampling
    straight RGBA averages colour into fully transparent pixels, which drags a
    dark halo around every edge — very visible on a 45px sprite.
  * Each frame is resized INDIVIDUALLY into its own cell. Scaling the whole
    2048x2320 sheet in one go lets rounding drift across 8 columns, so frames
    slowly slide out of their cells and the character jitters as it animates.
  * LANCZOS, then an optional light sharpen. At a 13x reduction this is a
    render-down of detailed art, not a pixel-art scale — there is no integer
    factor anywhere near 0.078, so nearest-neighbour would just delete most
    rows and columns and produce noise.
"""

import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "public" / "assets" / "pixel" / "final"


def premultiply(im: Image.Image) -> Image.Image:
    a = np.array(im).astype(np.float32)
    a[:, :, :3] *= (a[:, :, 3:4] / 255.0)
    return Image.fromarray(a.astype(np.uint8))


def unpremultiply(im: Image.Image) -> Image.Image:
    a = np.array(im).astype(np.float32)
    al = np.clip(a[:, :, 3:4], 1, 255) / 255.0
    a[:, :, :3] = np.clip(a[:, :, :3] / al, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--height", type=int, default=0, help="target figure height in px")
    ap.add_argument("--door", type=int, default=48, help="door height on the map, px")
    ap.add_argument("--sharpen", type=float, default=0.6, help="0 = off")
    args = ap.parse_args()

    man = json.loads((DIR / "outfits.json").read_text())
    cw, ch = man["cell"]
    cols, rows = man["cols"], man["rows"]

    # a 1.7m adult against a 2.0m door
    target = args.height or max(8, round(args.door * 1.7 / 2.0))

    src = Image.open(DIR / "outfit1.png").convert("RGBA")
    a = np.array(src)[0:ch, 0:cw, 3] > 8
    ys = np.where(a.any(axis=1))[0]
    drawn = int(ys[-1] - ys[0]) + 1

    scale = target / drawn
    ncw, nch = max(1, round(cw * scale)), max(1, round(ch * scale))
    print(f"figure {drawn}px -> {target}px  (scale {scale:.4f})")
    print(f"cell {cw}x{ch} -> {ncw}x{nch}   sheet -> {ncw*cols}x{nch*rows}")

    for i in range(1, 8):
        p = DIR / f"outfit{i}.png"
        if not p.exists():
            print("  missing", p.name); continue
        sheet = Image.open(p).convert("RGBA")
        out = Image.new("RGBA", (ncw * cols, nch * rows), (0, 0, 0, 0))
        for n in range(cols * rows):
            r, c = divmod(n, cols)
            cell = sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            if not cell.getbbox():
                continue
            small = unpremultiply(premultiply(cell).resize((ncw, nch), Image.LANCZOS))
            if args.sharpen > 0:
                small = small.filter(ImageFilter.UnsharpMask(radius=1, percent=int(args.sharpen * 100), threshold=2))
            out.paste(small, (c * ncw, r * nch))
        out.save(DIR / f"outfit{i}_small.png", optimize=True)
        print(f"  wrote outfit{i}_small.png")

    man2 = dict(man)
    man2.update({"cell": [ncw, nch], "figure_height": target,
                 "derived_from": f"door {args.door}px on base_map.png, adult = 0.85 x door",
                 "source_cell": [cw, ch], "scale": round(scale, 5)})
    (DIR / "outfits_small.json").write_text(json.dumps(man2, indent=2))
    print("manifest ->", DIR / "outfits_small.json")


if __name__ == "__main__":
    main()
