#!/usr/bin/env python
"""
Turn the Craftpix desert tileset into pixel art the valley can actually use.

WHY THIS EXISTS
---------------
The desert pack is not pixel art. It ships .ai and .eps sources, its sprites are
200-560px of smooth vector shading (a 285x297 tree holds 1,147 distinct colours),
and every one of them has a soft black drop shadow baked into the alpha channel.
Dropped into a 16px-tile map next to Cute Fantasy sprites it would read as
clip-art pasted onto a game.

So it is converted rather than cropped. Three things have to happen, in order,
and each one is wrong without the others:

  1. THE SHADOW GOES FIRST. Measured across the pack, every pixel with alpha
     between 60 and 200 has a mean luma of 2-16 — that band is not edge
     anti-aliasing, it is the drop shadow. Cutting it before the resize stops it
     smearing into a grey halo when the sprite gets small.

  2. THE RESIZE IS PREMULTIPLIED. Resizing straight RGBA averages the colour of
     fully transparent pixels into the edges, and in this pack those pixels are
     black — so every sprite would come back with a dark fringe. Premultiply,
     resize, unpremultiply.

  3. THE ALPHA ENDS UP BINARY. Pixel art has hard edges. A soft edge at 16px is
     a smudge, and it also breaks the vector path tracing in vector.js, which
     groups by exact colour. One threshold, no partial alpha, no dithering.

Only then is the palette cut down, on the opaque pixels alone, which is what
makes the result read as drawn rather than photographed.

WHAT IT CANNOT DO
-----------------
It cannot change the drawing underneath. These are chunky, thick-outlined
cartoon shapes, and shrinking them to 16px-tile scale narrows the gap with Cute
Fantasy a great deal but does not close it. Judge the contact sheet, not this
docstring.

USAGE
    python tools/desert-pixelate.py            # write the sprites
    python tools/desert-pixelate.py --sheet    # ...and a contact sheet
    python tools/desert-pixelate.py --compare  # ...and a side-by-side with the source
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The pipeline is not desert-specific — anything drawn as smooth vector art and
# needed as pixel art goes through the same three steps. --manifest= points it at
# a different pack; the default keeps the original call working.
_m = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--manifest=")), None)
MANIFEST = os.path.join(ROOT, _m) if _m else os.path.join(ROOT, "tools", "desert-pack.json")
SHEET_PREFIX = os.path.splitext(os.path.basename(MANIFEST))[0].replace("-pack", "")

# Alpha at or under this is drop shadow, not artwork. See note 1 above.
SHADOW_CUT = 200
# Post-resize alpha split. 128 keeps the silhouette honest without eating
# single-pixel details like cactus spines.
EDGE_CUT = 128


def sheet_path(name):
    """Review sheets go to lab/, never to public/.

    They are a megabyte apiece and they are for looking at, not for serving —
    anything under public/ ends up in the production build.
    """
    d = os.path.join(ROOT, "lab")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, name)


def load_rgba(path):
    return np.array(Image.open(path).convert("RGBA")).astype(np.float64)


def strip_shadow(a):
    """Drop the baked shadow, then trim to what is left."""
    a = a.copy()
    a[..., 3][a[..., 3] < SHADOW_CUT] = 0
    ys, xs = np.nonzero(a[..., 3])
    if len(ys) == 0:
        return a
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def resize_premultiplied(a, w, h):
    """Resize without pulling transparent black into the edges. See note 2."""
    alpha = a[..., 3:4] / 255.0
    rgb = a[..., :3] * alpha                       # premultiply
    stack = np.concatenate([rgb, a[..., 3:4]], axis=2)
    im = Image.fromarray(stack.astype(np.uint8), "RGBA")
    im = im.resize((max(1, w), max(1, h)), Image.LANCZOS)
    out = np.array(im).astype(np.float64)
    a2 = out[..., 3:4] / 255.0
    with np.errstate(divide="ignore", invalid="ignore"):
        rgb2 = np.where(a2 > 0, out[..., :3] / np.maximum(a2, 1e-6), 0)   # unpremultiply
    return np.concatenate([np.clip(rgb2, 0, 255), out[..., 3:4]], axis=2)


def harden_alpha(a):
    """Binary alpha. See note 3."""
    a = a.copy()
    m = a[..., 3] >= EDGE_CUT
    a[..., 3] = np.where(m, 255, 0)
    return a


def flatten(a):
    """Break a gradient into blocks by taking a 3x3 median of the colour.

    Palette size alone does not make art look drawn. Measured against the
    valley's own sprites by mean horizontal colour-run length — how far you can
    travel before the colour changes — a Cute Fantasy house sits at 2.0-2.4 and
    a rock at 4.1, while the converted palms came out at 1.28: the same number
    of colours, but sprayed rather than blocked. A median pass moves foliage to
    ~2.1 without touching the silhouette.

    It is opt-in per sprite because it also eats one-pixel detail, which is fine
    on a palm frond and not fine on a window mullion. Buildings do not use it.
    """
    rgb = Image.fromarray(a[..., :3].astype(np.uint8), "RGB")
    out = a.copy()
    out[..., :3] = np.array(rgb.filter(ImageFilter.MedianFilter(3))).astype(np.float64)
    return out


def quantise(a, colours):
    """Cut the palette using the opaque pixels only.

    Quantising with the transparent pixels included spends palette slots on
    colours nobody sees, and on this pack those slots go to the black behind the
    shadow — so the sprite comes back with a black entry it never uses and one
    fewer shade of ochre that it does.
    """
    rgb = Image.fromarray(a[..., :3].astype(np.uint8), "RGB")
    alpha = a[..., 3].astype(np.uint8)
    opaque = alpha > 0
    if opaque.sum() == 0:
        return a

    ys, xs = np.nonzero(opaque)
    strip = a[..., :3][ys, xs].astype(np.uint8).reshape(-1, 1, 3)
    pal_src = Image.fromarray(strip, "RGB").quantize(
        colors=colours, method=Image.MEDIANCUT, dither=Image.NONE)
    mapped = rgb.quantize(palette=pal_src, dither=Image.NONE).convert("RGB")

    out = np.dstack([np.array(mapped).astype(np.float64), alpha.astype(np.float64)])
    out[..., 3] = alpha
    return out


def convert(src, w, h, colours, flat=False):
    a = load_rgba(src)
    a = strip_shadow(a)
    a = resize_premultiplied(a, w, h)
    a = harden_alpha(a)
    if flat:
        a = flatten(a)
    a = quantise(a, colours)
    a[..., :3][a[..., 3] == 0] = 0                 # nothing hidden under transparency
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def tile_convert(src, size, colours, inset=0.14):
    """Ground tiles.

    THE land_* FILES ARE NOT SEAMLESS TILES, whatever their name suggests. Only
    bg.png is: measured, its edge pixels match its interior to within 1/255 and
    it wraps left-to-right at 0.6. The land_* files carry a drawn dark border —
    land_12's edge averages RGB 53,37,24 against an interior of 118,85,53 — so
    laying them as tiles produced a dark lattice across the ground, exactly like
    graph paper. They are illustrations of a patch of ground, not tiles.

    So the border is cropped off before anything else, and the result is then
    forced to wrap: each edge is averaged with the edge it will meet when the
    tile repeats. At 16px these textures are nearly flat, so that blend is
    invisible in itself and removes the seam completely.
    """
    im = Image.open(src).convert("RGB")
    k = int(min(im.width, im.height) * inset)
    if k:
        im = im.crop((k, k, im.width - k, im.height - k))
    im = im.resize((size, size), Image.BOX)     # area-average: no ringing at the seam

    a = np.array(im).astype(np.float64)
    a = (a + np.roll(a, size // 2, axis=0)) / 2   # wrap vertically
    a = (a + np.roll(a, size // 2, axis=1)) / 2   # wrap horizontally

    a = np.dstack([a, np.full((size, size), 255.0)])
    a = quantise(a, colours)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def blob_sheet(base, out_dir, e):
    """Assemble a 3x3 nine-slice sheet from nine separate edge tiles.

    The pack ships its paving as 26 loose 64x64 files with no naming scheme, so
    which file is the north-west corner was worked out by measurement, not by
    reading the filenames: for each tile, each edge strip is tested for the sand
    transition band (RGB 196,145,71) or transparency, and an edge that is >90%
    either of those is facing off the paving. That gives two exact 3x3 sets —
    road_1..9 warm, road_14..22 grey — plus four inner-corner variants each that
    a nine-slice cannot use.

    The cell order here is the order Scene.blob() indexes:
        col = west && east ? 1 : west ? 2 : 0
        row = north && south ? 1 : north ? 2 : 0
    so column 0 is the tile with nothing to its west, and row 2 is the tile with
    nothing to its south. Get that backwards and the road turns inside out.
    """
    size = e.get("size", 16)
    sheet = Image.new("RGBA", (size * 3, size * 3), (0, 0, 0, 0))
    for idx, num in enumerate(e["tiles"]):
        col, row = idx % 3, idx // 3
        im = Image.open(os.path.join(base, f"{e['prefix']}{num}.png")).convert("RGBA")
        a = resize_premultiplied(np.array(im).astype(np.float64), size, size)
        a = harden_alpha(a)
        a = quantise(a, e.get("colours", 10))
        a[..., :3][a[..., 3] == 0] = 0
        sheet.paste(Image.fromarray(a.astype(np.uint8), "RGBA"), (col * size, row * size))
    dst = os.path.join(out_dir, e["name"] + ".webp")
    sheet.save(dst, "WEBP", lossless=True, quality=100)
    return sheet


def main():
    man = json.load(open(MANIFEST, encoding="utf-8"))
    base = os.path.join(ROOT, man["srcDir"])
    out_dir = os.path.join(ROOT, man["outDir"])
    os.makedirs(out_dir, exist_ok=True)

    made, sizes = [], {}
    for e in man["sprites"]:
        if "_" in e:
            continue
        src = os.path.join(base, e["src"] + ".png")
        if not os.path.exists(src):
            print(f"  MISSING {e['src']}.png", file=sys.stderr)
            continue
        colours = e.get("colours", man.get("colours", 20))
        if e.get("tile"):
            im = tile_convert(src, e["size"], colours, e.get("inset", 0.14))
        else:
            im = convert(src, e["w"], e["h"], colours, e.get("flatten", False))
        dst = os.path.join(out_dir, e["name"] + ".webp")
        im.save(dst, "WEBP", lossless=True, quality=100)
        made.append((e["name"], im.width, im.height, e["src"]))
        sizes[e["name"]] = [im.width, im.height]
        print(f"  {e['name']:22} {im.width:4}x{im.height:<4} <- {e['src']}.png")

    for e in man.get("blobs", []):
        sh = blob_sheet(base, out_dir, e)
        print(f"  {e['name']:22} {sh.width:4}x{sh.height:<4} <- {e['prefix']}{e['tiles']}")

    print(f"\n{len(made)} sprites -> {man['outDir']}")

    # The SPRITES block for valley.js, printed rather than patched in — the file
    # is edited by hand and by another session, and a script that rewrites it
    # would eventually lose an edit.
    print("\n--- SPRITES entries ---")
    line = "  "
    for n, w, h, _ in made:
        piece = f"{n}: [{w},{h}], "
        if len(line) + len(piece) > 92:
            print(line.rstrip())
            line = "  "
        line += piece
    print(line.rstrip().rstrip(","))

    if "--sheet" in sys.argv:
        contact(out_dir, made)
    if "--compare" in sys.argv:
        compare(base, out_dir, made)


def contact(out_dir, made):
    """One sheet at 3x, which is how the map draws at its usual zoom."""
    Z, PAD, COLS = 3, 14, 8
    cw = max(w for _, w, _, _ in made) * Z + PAD * 2
    ch = max(h for _, _, h, _ in made) * Z + PAD * 2 + 16
    rows = (len(made) + COLS - 1) // COLS
    sheet = Image.new("RGBA", (COLS * cw, rows * ch), (36, 38, 42, 255))
    for i, (n, w, h, _) in enumerate(made):
        # .convert("RGBA") is not decoration: a fully opaque WebP (every ground
        # tile) reloads as mode RGB, and alpha_composite refuses a mismatched pair.
        im = Image.open(os.path.join(out_dir, n + ".webp")).convert("RGBA")
        im = im.resize((w * Z, h * Z), Image.NEAREST)
        x = (i % COLS) * cw + (cw - im.width) // 2
        y = (i // COLS) * ch + (ch - 16 - im.height) // 2
        sheet.alpha_composite(im, (max(0, x), max(0, y)))
    p = sheet_path(f"{SHEET_PREFIX}_contact.png")
    sheet.save(p)
    print("contact sheet ->", p)


def compare(base, out_dir, made):
    """Source beside result, both at the same on-screen height, so the question
    'did the conversion lose it or was it never there' can be answered."""
    H, PAD, COLS = 150, 10, 6
    rows = (len(made) + COLS - 1) // COLS
    cw = H * 2 + PAD * 3
    sheet = Image.new("RGBA", (COLS * cw, rows * (H + PAD * 2)), (36, 38, 42, 255))
    for i, (n, w, h, src) in enumerate(made):
        a = Image.open(os.path.join(base, src + ".png")).convert("RGBA")
        a.thumbnail((H, H), Image.LANCZOS)
        b = Image.open(os.path.join(out_dir, n + ".webp")).convert("RGBA")
        k = max(1, H // max(b.width, b.height))
        b = b.resize((b.width * k, b.height * k), Image.NEAREST)
        ox = (i % COLS) * cw + PAD
        oy = (i // COLS) * (H + PAD * 2) + PAD
        sheet.alpha_composite(a, (ox, oy + (H - a.height) // 2))
        sheet.alpha_composite(b, (ox + H + PAD, oy + (H - b.height) // 2))
    p = sheet_path(f"{SHEET_PREFIX}_compare.png")
    sheet.save(p)
    print("compare sheet ->", p)


if __name__ == "__main__":
    main()
