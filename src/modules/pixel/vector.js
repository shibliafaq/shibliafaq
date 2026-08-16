/**
 * Vectorising sprites, so scaling stops throwing pixels away.
 *
 * ── THE PROBLEM, STATED PRECISELY ─────────────────────────────────────────
 * A 245px-wide sprite drawn 368px wide has to map 245 source pixels onto 368
 * device pixels. Nearest-neighbour resolves that by giving some source pixels
 * two device pixels and others one — so lines go wobbly and single-pixel
 * details double or disappear. Below 1x it drops rows outright. Bilinear
 * smoothing avoids the wobble by blurring, which on pixel art is a smudge.
 *
 * Both are symptoms of the same thing: the sprite is being treated as a grid of
 * samples that must be re-sampled onto another grid.
 *
 * ── WHAT THIS DOES ────────────────────────────────────────────────────────
 * It stops being a grid. Each sprite is converted ONCE into filled geometry —
 * one `Path2D` per colour, built from the pixel boundaries — and then drawn
 * under a scale transform. The renderer fills real shapes, so:
 *
 *   - nothing is ever dropped: a 1px highlight is a 1x1 square in the path, and
 *     at 0.4x it is still drawn, just smaller and anti-aliased
 *   - nothing wobbles: every edge is at its exact fractional position rather
 *     than snapped to the nearest device pixel
 *   - any scale works, including non-uniform x/y, at no extra cost
 *
 * ── THE HONEST TRADE-OFF ──────────────────────────────────────────────────
 * This is resolution-independent, not magic. It cannot invent detail that was
 * never drawn: enlarged far enough, a vectorised sprite is smooth-edged blocks,
 * because that is what the artwork is. What it does guarantee is that no detail
 * is LOST at any size, which is the actual complaint.
 *
 * It also renders anti-aliased, so a vectorised building sits slightly softer
 * than the hard-edged pixel tiles around it. At 1x it is therefore NOT used —
 * the raw image is drawn instead, which keeps the map crisp and means only
 * deliberately resized objects pay the cost.
 *
 * ── HOW THE GEOMETRY IS BUILT ─────────────────────────────────────────────
 * Per colour, adjacent pixels are merged into maximal horizontal runs, and each
 * run becomes one rectangle subpath. All of a colour's rectangles go into a
 * single Path2D, so shared edges fuse when filled — emitting them as separate
 * fills would leave anti-aliased hairlines along every seam. Run-merging alone
 * takes a 245x107 sprite from ~26,000 rectangles to a couple of thousand.
 */

const cache = new Map();
const MAX_CACHE = 120;

/**
 * Build one Path2D per distinct colour.
 * @returns {{ w:number, h:number, layers:{fill:string, path:Path2D}[] }}
 */
export function vectorise(img, sw, sh, key) {
  const hit = cache.get(key);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.imageSmoothingEnabled = false;
  cx.drawImage(img, 0, 0, sw, sh);
  const d = cx.getImageData(0, 0, sw, sh).data;

  // Group horizontal runs by colour. A Map keyed by packed RGBA keeps the
  // palette walk to one pass rather than one pass per colour.
  const runs = new Map();
  for (let y = 0; y < sh; y++) {
    let x = 0;
    while (x < sw) {
      const i = (y * sw + x) * 4;
      const a = d[i + 3];
      if (a < 8) { x++; continue; }
      const packed = (d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | a;
      let end = x + 1;
      while (end < sw) {
        const j = (y * sw + end) * 4;
        const p2 = (d[j] << 24) | (d[j + 1] << 16) | (d[j + 2] << 8) | d[j + 3];
        if (p2 !== packed) break;
        end++;
      }
      let list = runs.get(packed);
      if (!list) { list = []; runs.set(packed, list); }
      list.push(x, y, end - x);
      x = end;
    }
  }

  const layers = [];
  for (const [packed, list] of runs) {
    const r = (packed >>> 24) & 255, g = (packed >>> 16) & 255;
    const b = (packed >>> 8) & 255, a = packed & 255;
    const path = new Path2D();
    for (let k = 0; k < list.length; k += 3) path.rect(list[k], list[k + 1], list[k + 2], 1);
    layers.push({ fill: `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`, path });
  }

  const out = { w: sw, h: sh, layers, rects: [...runs.values()].reduce((n, l) => n + l.length / 3, 0) };
  if (cache.size > MAX_CACHE) cache.clear();
  cache.set(key, out);
  return out;
}

/** Draw a vectorised sprite into `ctx` at an arbitrary size. */
export function drawVector(ctx, vec, x, y, dw, dh) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dw / vec.w, dh / vec.h);
  for (const l of vec.layers) { ctx.fillStyle = l.fill; ctx.fill(l.path); }
  ctx.restore();
}

/* ------------------------------------------------------------------ raster cache
   Filling thousands of paths is far too slow to repeat per frame — instAcademic
   alone traces to 13,105 colour layers, because these premade buildings are not
   low-palette artwork. So the vector form is rasterised ONCE per target size and
   the resulting canvas is reused. The map re-renders on every drag frame, so
   this is the difference between the feature being usable and unusable. */
const rasters = new Map();
const MAX_RASTERS = 200;

/**
 * A canvas of `img` at exactly dw x dh, drawn from vector geometry.
 * Returns null when scaling would be lossless anyway, so the caller can draw
 * the plain image and keep the map crisp.
 */
export function vectorRaster(img, sw, sh, dw, dh, key) {
  if (dw === sw && dh === sh) return null;
  // Whole-number scales are already exact under nearest-neighbour, and they keep
  // the hard pixel edges that match the tiles around them. Vector would only add
  // anti-aliasing and cost.
  const kx = dw / sw, ky = dh / sh;
  if (Number.isInteger(kx) && Number.isInteger(ky)) return null;

  const id = `${key}|${dw}x${dh}`;
  const hit = rasters.get(id);
  if (hit) return hit;

  const vec = vectorise(img, sw, sh, key);
  const c = document.createElement('canvas');
  c.width = Math.max(1, dw); c.height = Math.max(1, dh);
  drawVector(c.getContext('2d'), vec, 0, 0, dw, dh);

  if (rasters.size > MAX_RASTERS) rasters.clear();
  rasters.set(id, c);
  return c;
}

export const clearVectorCache = () => { cache.clear(); rasters.clear(); };
