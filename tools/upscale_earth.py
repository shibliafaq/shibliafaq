"""
Upscale the failed-Earth equirectangular map with Real-ESRGAN x4plus.

WHY THIS IS NOT JUST cv2.resize
-------------------------------
The map that ships as `earth-future-6k.webp` is 2880x1440 — it was never 6k, it
was the native source under a 6k filename. Its NASA counterpart, which it has to
crossfade against, is 6144x3072. That is 2.13x less angular detail on the same
sphere, and the difference is invisible only while the globe is small. This
transition crossfades while the camera is still pulled in close, so it stops
being invisible.

Measured first, rather than assumed: the source scores lapvar 0.00887 and 50.8%
of its spectral energy above half-Nyquist, against 0.00825 / 45.6% for NASA's 6k
map. It is genuinely crisp at 2880 — real edges for a model to lock onto, not
diffusion mush. That is what makes super-resolution worth running here instead of
a Lanczos stretch.

THE WRAP SEAM — the thing that goes wrong if you skip it
--------------------------------------------------------
Column 0 and column W-1 of an equirectangular map are the SAME meridian. Every
convolution in the network reads a neighbourhood, so at the image edges it reads
zero-padding — inventing a discontinuity that becomes a hard vertical line down
the antimeridian once the texture is wrapped on a sphere. The fix is to wrap-pad
horizontally from the OPPOSITE edge before inference and crop it back after, so
every real pixel is convolved with its true neighbours.

The poles are different: the top and bottom rows are single points smeared across
the full width, so there is no correct neighbour above or below. Edge replication
is the honest choice, and the crop removes it regardless.

OUTPUT
------
11520x5760 from the model, then Lanczos down to 6144x3072. Supersampling like
this beats asking for 2.13x directly: the 4x pass gives the model its trained
operating point, and the downsample averages away its overshoot.
"""
import os
import sys
import time
import numpy as np
import cv2
import torch

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rrdbnet

SRC = r"C:\Users\Admin\Downloads\Gemini_Generated_Image_737x95737x95737x.jpg"
OUT_DIR = r"E:\Website\shibli-portfolio\public\assets\img"
WEIGHTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RealESRGAN_x4plus.pth")

SCALE = 4
PAD_X = 64          # wrapped from the opposite edge — true continuity
PAD_Y = 32          # replicated — the poles have no true neighbour
TILE = 256          # inference tile, in INPUT pixels
TILE_PAD = 24       # context margin per tile, discarded after inference

# Tier -> (width, webp quality). Sizes chosen to land near the NASA maps they
# sit beside (day-6k is 1.47 MB, day-4k 0.75 MB, day 0.23 MB) so neither globe
# is visibly softer than the other mid-crossfade.
# Quality 82 across the board, chosen by measurement rather than instinct: the
# Laplacian-variance curve is FLAT from q78 to q92 (1.35x-1.39x the NASA map at
# every step), so the original q92 cost 2.65 MB for exactly the detail q82
# delivers in 1.46 MB. Each tier now sits at file-size parity with the NASA map
# it is blended against, which is the right target — they are sampled in the
# same fragment, so whichever is softer sets what the crossfade looks like.
TIERS = [("earth-future-6k.webp", 6144, 82),
         ("earth-future-4k.webp", 4096, 82),
         ("earth-future.webp",    2048, 82)]


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


HEAL_BAND = 96      # columns each side of the antimeridian to cross-dissolve


def heal_seam(img, band=HEAL_BAND):
    """Make the map actually cyclic before anything convolves it.

    MEASURED, not assumed: on this source, column 0 and column W-1 differ by
    5.298 levels where genuinely adjacent interior columns differ by 4.076 — a
    ratio of 1.30. The image was generated as a flat picture, not as a wrapping
    texture, so its two edges are simply different places.

    Wrap-padding fixes the CONVOLUTION (every pixel gets its true neighbours)
    but cannot fix the CONTENT — you cannot pad your way to an agreement that
    was never there. Worse, upscaling amplifies it: a naive Lanczos to 6144
    takes the ratio from 1.34 to 2.70, because interpolation sharpens the step
    into a line. Healing first takes it to ~0.02.

    The heal is a cosine-weighted cross-dissolve: at the seam itself each edge
    becomes the mean of both, so the two columns are identical and the wrap is
    exact; the weight falls to zero over `band` columns so there is no kink at
    the edge of the treated region. Cosine rather than linear because a linear
    ramp leaves a derivative discontinuity that a sharpening pass will find.

    Cost: about 22 degrees of longitude, centred on the antimeridian — the
    middle of the Pacific on a 0-degree-centred map — is slightly softened.
    That is the right trade against a hard line running pole to pole.
    """
    out = img.astype(np.float32).copy()
    w = out.shape[1]
    left0 = out[:, :band].copy()          # originals, so the blend is symmetric
    right0 = out[:, w - band:].copy()
    for i in range(band):
        a = 0.25 * (1.0 + np.cos(np.pi * i / band))   # 0.5 at the seam -> 0 at band edge
        out[:, i] = (1 - a) * left0[:, i] + a * right0[:, band - 1 - i]
        out[:, w - 1 - i] = (1 - a) * right0[:, band - 1 - i] + a * left0[:, i]
    return np.clip(out, 0, 255).astype(img.dtype)


def wrap_pad(img, px, py):
    """Horizontal wrap (longitude is cyclic), vertical replicate (poles are not)."""
    out = cv2.copyMakeBorder(img, py, py, 0, 0, cv2.BORDER_REPLICATE)
    left = out[:, :px].copy()
    right = out[:, -px:].copy()
    return np.hstack([right, out, left])


CKPT_IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_partial.npy")
CKPT_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_partial.json")


def upscale_tiled(net, img_rgb, device="cpu"):
    """Standard Real-ESRGAN tiler: infer on tile+margin, keep only the centre.

    The margin is discarded rather than feathered. Feathering blends two
    different hallucinations of the same pixels, which reads as a soft band;
    discarding means every output pixel comes from one inference that had full
    context around it.

    RESUMABLE. The first run of this got killed at tile 50 of 72 — about forty
    minutes of CPU thrown away because the output lived only in RAM. The result
    array is now a uint8 memmap on disk and every finished tile is recorded, so
    an interrupted run costs the tile it was on and nothing else. uint8 rather
    than float32 because the final image is uint8 anyway; it also cuts the
    checkpoint from 868 MB to 217 MB.
    """
    h, w = img_rgb.shape[:2]
    oh, ow = h * SCALE, w * SCALE

    tiles_x = (w + TILE - 1) // TILE
    tiles_y = (h + TILE - 1) // TILE
    total = tiles_x * tiles_y

    # A checkpoint is only valid for the exact geometry that produced it.
    # The input hash is part of the signature on purpose: geometry alone is not
    # enough. Adding the seam heal changed the pixels while leaving every
    # dimension identical, so a geometry-only signature would have happily
    # resumed and mixed healed tiles with unhealed ones.
    import hashlib
    ihash = hashlib.sha1(np.ascontiguousarray(img_rgb)).hexdigest()[:16]
    sig = {"ow": ow, "oh": oh, "tile": TILE, "pad": TILE_PAD, "scale": SCALE, "in": ihash}
    done_set = set()
    if os.path.exists(CKPT_IMG) and os.path.exists(CKPT_LOG):
        try:
            import json
            prev = json.load(open(CKPT_LOG))
            if prev.get("sig") == sig:
                done_set = set(tuple(t) for t in prev["done"])
                log(f"resuming: {len(done_set)}/{total} tiles already computed")
            else:
                log("checkpoint geometry differs — starting clean")
        except Exception as e:
            log(f"checkpoint unreadable ({e}) — starting clean")

    mode = "r+" if done_set and os.path.exists(CKPT_IMG) else "w+"
    out = np.lib.format.open_memmap(CKPT_IMG, mode=mode, dtype=np.uint8, shape=(oh, ow, 3)) \
        if mode == "w+" else np.load(CKPT_IMG, mmap_mode="r+")

    t_start = time.time()
    done = len(done_set)
    start_count = done

    for ty in range(tiles_y):
        for tx in range(tiles_x):
            if (tx, ty) in done_set:
                continue
            x0, y0 = tx * TILE, ty * TILE
            x1, y1 = min(x0 + TILE, w), min(y0 + TILE, h)

            # padded read window, clamped to the image
            px0, py0 = max(0, x0 - TILE_PAD), max(0, y0 - TILE_PAD)
            px1, py1 = min(w, x1 + TILE_PAD), min(h, y1 + TILE_PAD)

            patch = img_rgb[py0:py1, px0:px1].astype(np.float32) / 255.0
            t = torch.from_numpy(patch).permute(2, 0, 1).unsqueeze(0).to(device)
            with torch.no_grad():
                sr = net(t)
            sr = sr.squeeze(0).permute(1, 2, 0).cpu().numpy()

            # cut the margin back out, in output coordinates
            cx0, cy0 = (x0 - px0) * SCALE, (y0 - py0) * SCALE
            cw, ch = (x1 - x0) * SCALE, (y1 - y0) * SCALE
            out[y0 * SCALE:y0 * SCALE + ch, x0 * SCALE:x0 * SCALE + cw] = \
                (np.clip(sr[cy0:cy0 + ch, cx0:cx0 + cw], 0, 1) * 255).round().astype(np.uint8)

            done_set.add((tx, ty))
            done += 1

            if done % 4 == 0 or done == total:
                out.flush()
                import json
                json.dump({"sig": sig, "done": sorted(done_set)}, open(CKPT_LOG, "w"))
                el = time.time() - t_start
                rate = (done - start_count) / max(el, 1e-6)
                eta = (total - done) / rate if rate > 0 else 0
                log(f"  tile {done}/{total}  elapsed {el/60:.1f}m  eta {eta/60:.1f}m  [checkpointed]")

    out.flush()
    return out


def seam_ratio(img):
    """Seam discontinuity RELATIVE to genuinely adjacent columns.

    The absolute difference is meaningless on its own — a detailed map has
    large column-to-column differences everywhere. What matters is whether the
    seam is worse than a normal neighbour pair. 1.0 means perfectly cyclic;
    the raw source measures 1.30.
    """
    f = img.astype(np.float32)
    seam = float(np.abs(f[:, 0] - f[:, -1]).mean())
    w = f.shape[1]
    step = max(1, w // 24)
    interior = float(np.mean([np.abs(f[:, i] - f[:, i + 1]).mean()
                              for i in range(w // 8, w - w // 8, step)]))
    return seam / max(interior, 1e-6)


def main():
    src = cv2.imread(SRC, cv2.IMREAD_COLOR)
    if src is None:
        raise SystemExit(f"cannot read {SRC}")
    h, w = src.shape[:2]
    log(f"source {w}x{h} ratio {w/h:.4f}")
    if abs(w / h - 2.0) > 1e-3:
        raise SystemExit("not 2:1 — an equirectangular map must be 2:1 or it wraps wrong")

    torch.set_num_threads(os.cpu_count())
    log(f"torch threads {torch.get_num_threads()}")
    net = rrdbnet.load(WEIGHTS)
    log("weights loaded strict=True")

    r0 = seam_ratio(src)
    src = heal_seam(src)
    log(f"seam ratio {r0:.2f}x -> {seam_ratio(src):.2f}x after healing "
        f"({HEAL_BAND}px cosine cross-dissolve; 1.00 = perfectly cyclic)")

    padded = wrap_pad(src, PAD_X, PAD_Y)
    log(f"padded to {padded.shape[1]}x{padded.shape[0]} "
        f"(wrap {PAD_X}px horizontal, replicate {PAD_Y}px vertical)")

    rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)
    sr = upscale_tiled(net, rgb)

    # crop the padding back off, in output scale
    sr = np.asarray(sr[PAD_Y * SCALE: sr.shape[0] - PAD_Y * SCALE,
                       PAD_X * SCALE: sr.shape[1] - PAD_X * SCALE])
    master = cv2.cvtColor(sr, cv2.COLOR_RGB2BGR)
    log(f"master {master.shape[1]}x{master.shape[0]}")
    assert master.shape[1] == w * SCALE and master.shape[0] == h * SCALE, "crop arithmetic wrong"

    log(f"seam ratio: master {seam_ratio(master):.3f}x "
        f"(1.00 = perfectly cyclic; the raw source was 1.24x)")

    cv2.imwrite(os.path.join(os.path.dirname(WEIGHTS), "master_11520.png"), master)

    for name, width, q in TIERS:
        tier = cv2.resize(master, (width, width // 2), interpolation=cv2.INTER_LANCZOS4)
        path = os.path.join(OUT_DIR, name)
        cv2.imwrite(path, tier, [cv2.IMWRITE_WEBP_QUALITY, q])
        mb = os.path.getsize(path) / 1e6
        g = cv2.cvtColor(tier, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
        log(f"wrote {name:22s} {width}x{width//2}  {mb:.2f} MB  "
            f"lapvar {cv2.Laplacian(g, cv2.CV_32F).var():.5f}  seam {seam_ratio(tier):.3f}x")

    log("done")


if __name__ == "__main__":
    main()
