/**
 * Sprite scaling that does not shred the artwork.
 *
 * ── WHY THE OBVIOUS THING LOOKS BROKEN ────────────────────────────────────
 * `drawImage` with `imageSmoothingEnabled = false` is nearest-neighbour. At a
 * whole-number factor that is exactly right — every source pixel becomes an
 * n×n block and nothing is lost. At any other factor it is destructive:
 *
 *   at 1.5x  some source pixels become 2 screen pixels and some become 1, so
 *            straight lines go wobbly and 1px highlights vanish or double
 *   below 1x  whole rows and columns are simply dropped — that is the "losing
 *            details" you are seeing, and no amount of care in the editor fixes
 *            it, because the information is discarded at draw time
 *
 * Turning smoothing ON instead trades that for a blur, which on pixel art reads
 * as a smudge.
 *
 * ── WHAT THIS DOES INSTEAD ────────────────────────────────────────────────
 * True vector scaling is not available — these are raster sprites with no
 * underlying paths. The closest honest equivalent is a pixel-art-aware
 * upscaler, which reconstructs edges rather than duplicating pixels:
 *
 *   whole-number factor   nearest-neighbour, untouched. Already lossless.
 *   enlarging (>1x)       EPX/Scale2x doubled until it exceeds the target, then
 *                         area-averaged down to the exact size. Scale2x reads
 *                         each pixel's four neighbours and rounds off diagonal
 *                         steps, so curves and outlines survive being enlarged
 *                         by a fraction instead of going ragged.
 *   shrinking (<1x)       area-average straight down. Detail is genuinely lost
 *                         when you throw away pixels, but averaging keeps the
 *                         colour and the silhouette, where dropping rows does
 *                         not.
 *
 * Everything is cached by target size, because the editor re-renders the whole
 * document on every drag frame and Scale2x is far too slow to run per frame.
 */

const cache = new Map();
const MAX_CACHE = 400;

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * EPX / Scale2x. For each source pixel, look at its four orthogonal neighbours
 * and split it into 2x2; a corner is replaced by a neighbour's colour only when
 * two adjacent neighbours agree and the opposing pair does not. That is what
 * turns a staircase into a bevel instead of a bigger staircase.
 */
function scale2x(src) {
  const w = src.width, h = src.height;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  const s = sctx.getImageData(0, 0, w, h);
  const out = canvasOf(w * 2, h * 2);
  const octx = out.getContext('2d');
  const d = octx.createImageData(w * 2, h * 2);

  const px = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return -1;
    const i = (y * w + x) * 4;
    return (s.data[i] << 24) | (s.data[i + 1] << 16) | (s.data[i + 2] << 8) | s.data[i + 3];
  };
  const put = (x, y, v) => {
    const i = (y * w * 2 + x) * 4;
    const si = ((v >> 24) & 255);
    d.data[i] = si; d.data[i + 1] = (v >> 16) & 255;
    d.data[i + 2] = (v >> 8) & 255; d.data[i + 3] = v & 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = px(x, y);
      const A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1);
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      put(x * 2, y * 2, p1); put(x * 2 + 1, y * 2, p2);
      put(x * 2, y * 2 + 1, p3); put(x * 2 + 1, y * 2 + 1, p4);
    }
  }
  octx.putImageData(d, 0, 0);
  return out;
}

/** Smooth resample to an exact size — used for the final fractional step. */
function resample(src, dw, dh) {
  const out = canvasOf(dw, dh);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, dw, dh);
  return out;
}

/**
 * A drawable for `img` at exactly dw x dh.
 *
 * Returns the source image itself when no work is needed, so the common case
 * costs nothing. `key` must identify the source (the sheet name is enough).
 */
export function scaledSprite(img, sw, sh, dw, dh, key) {
  if (dw === sw && dh === sh) return null;          // caller draws normally

  const kx = dw / sw, ky = dh / sh;
  // Whole-number and equal on both axes: nearest-neighbour is already exact.
  if (Number.isInteger(kx) && Number.isInteger(ky)) return null;

  const id = `${key}|${dw}x${dh}`;
  const hit = cache.get(id);
  if (hit) return hit;

  let work = null;
  if (kx > 1 || ky > 1) {
    // Double with Scale2x until both axes are covered, then come back down.
    let base = canvasOf(sw, sh);
    const bctx = base.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(img, 0, 0);
    let n = 1;
    const need = Math.max(kx, ky);
    while (n < need && n < 8) { base = scale2x(base); n *= 2; }
    work = (base.width === dw && base.height === dh) ? base : resample(base, dw, dh);
  } else {
    const base = canvasOf(sw, sh);
    const bctx = base.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(img, 0, 0);
    work = resample(base, dw, dh);
  }

  if (cache.size > MAX_CACHE) cache.clear();
  cache.set(id, work);
  return work;
}

export const clearScaleCache = () => cache.clear();
