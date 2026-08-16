#!/usr/bin/env node
/**
 * render-map.mjs — composite the Experience map to a single flat PNG.
 *
 *   node tools/render-map.mjs [outFile] [--layers=all|ground|landwater] [--scale=N]
 *
 *   --layers=all        everything (default)
 *   --layers=ground     terrain layer only: land, water, paths, farmland, bridges
 *   --layers=landwater  bare land and water only - no roads, no farmland
 *   --scale=N           integer nearest-neighbour upscale. Integer only, and
 *                       nearest only: any other filter resamples the hard 1px
 *                       edges this art is made of into mush.
 *
 * Why this exists rather than a screenshot: a screenshot is at whatever zoom and
 * crop the browser happened to be at, and carries the page's own scaling. This
 * writes the map at exactly 1:1, 544x1664, straight from the same buildScene()
 * the site uses — so it lines up pixel-for-pixel with placement.csv.
 *
 * No image libraries: PNG in and out is done here with node:zlib. The pack art
 * is WebP on disk, so ffmpeg converts each sheet to PNG once into a temp dir.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const LAYERS = flag('layers', 'all');
const SCALE = Math.max(1, parseInt(flag('scale', '1'), 10) || 1);
const positional = argv.find((a) => !a.startsWith('--'));
const OUT = resolve(positional || join(root, '..', 'map-kit/08-current-composition/base-map.png'));

/** Which sheets count as bare land and water. */
const LAND_WATER = new Set(['grass', 'beach', 'water']);
const TMP = join(root, '.map-render-tmp');

/* ---------------- PNG decode (8-bit RGB/RGBA, non-interlaced) ------------- */
function decodePNG(buf) {
  let p = 8, ihdr = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const { w, h, depth, color, interlace } = ihdr;
  if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) throw new Error(`unsupported png depth=${depth} color=${color}`);
  const ch = color === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (ft === 1) v += a; else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
  }
  // normalise to RGBA
  if (ch === 4) return { w, h, px: out };
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1];
    rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255;
  }
  return { w, h, px: rgba };
}

/* ---------------- PNG encode ---------------- */
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(b) { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------- build ---------------- */
const { buildScene } = await import('../src/modules/pixel/worldmap.js');
const { SHEETS, TILE } = await import('../src/modules/pixel/cutefantasy.js');
const { scene, cols, rows } = buildScene();

mkdirSync(TMP, { recursive: true });
const cache = new Map();
function sheet(name) {
  if (cache.has(name)) return cache.get(name);
  const url = SHEETS[name];
  if (!url) { cache.set(name, null); return null; }
  const src = join(root, 'public', url.replace(/^\//, ''));
  if (!existsSync(src)) { console.warn('missing sheet:', name, src); cache.set(name, null); return null; }
  const png = join(TMP, name + '.png');
  if (!existsSync(png)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, png], { stdio: 'pipe' });
  const img = decodePNG(readFileSync(png));
  cache.set(name, img);
  return img;
}

const W = cols * TILE, H = rows * TILE;
const dst = Buffer.alloc(W * H * 4);
let drawn = 0, skipped = 0;

for (const op of scene.ordered()) {
  // Ground is layer 0; everything drawn on top of the world is layer 1.
  if (LAYERS !== 'all' && (op.layer ?? 0) !== 0) { skipped++; continue; }
  if (LAYERS === 'landwater' && !LAND_WATER.has(op.sheet)) { skipped++; continue; }
  const img = sheet(op.sheet);
  if (!img) { skipped++; continue; }
  for (let y = 0; y < op.sh; y++) {
    const sy = op.sy + y, dy = op.y + y;
    if (sy < 0 || sy >= img.h || dy < 0 || dy >= H) continue;
    for (let x = 0; x < op.sw; x++) {
      const sx = op.sx + x, dx = op.x + x;
      if (sx < 0 || sx >= img.w || dx < 0 || dx >= W) continue;
      const si = (sy * img.w + sx) * 4, a = img.px[si + 3];
      if (!a) continue;
      const di = (dy * W + dx) * 4;
      if (a === 255) {
        dst[di] = img.px[si]; dst[di + 1] = img.px[si + 1]; dst[di + 2] = img.px[si + 2]; dst[di + 3] = 255;
      } else {
        // straight src-over
        const ia = a / 255, na = dst[di + 3] / 255, oa = ia + na * (1 - ia);
        for (let k = 0; k < 3; k++) dst[di + k] = Math.round((img.px[si + k] * ia + dst[di + k] * na * (1 - ia)) / (oa || 1));
        dst[di + 3] = Math.round(oa * 255);
      }
    }
  }
  drawn++;
}

/* nearest-neighbour integer upscale — never anything smoother */
let outW = W, outH = H, outPx = dst;
if (SCALE > 1) {
  outW = W * SCALE; outH = H * SCALE;
  outPx = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = (y / SCALE) | 0;
    for (let x = 0; x < outW; x++) {
      const si = (sy * W + ((x / SCALE) | 0)) * 4, di = (y * outW + x) * 4;
      outPx[di] = dst[si]; outPx[di + 1] = dst[si + 1];
      outPx[di + 2] = dst[si + 2]; outPx[di + 3] = dst[si + 3];
    }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encodePNG(outW, outH, outPx));
rmSync(TMP, { recursive: true, force: true });
console.log(`${outW}x${outH} (x${SCALE})  layers=${LAYERS}  drawn ${drawn}, skipped ${skipped}  ->  ${OUT}`);
