#!/usr/bin/env node
// index-atlas.mjs — measure the sprite boxes in a tilesheet.
//
// Loads a PNG (pure Node: zlib inflate + PNG unfilter, no npm deps), finds
// 8-connected components of non-transparent pixels, then merges components
// whose bounding boxes overlap or nearly touch, because one building part is
// usually drawn as several disjoint strokes (a roof ridge, its two slopes and
// a detached eave pixel are four components but one sprite).
//
// Usage:
//   node tools/index-atlas.mjs <file.png> [...more.png] [--gap=2] [--min=4]
//                                         [--json] [--ascii] [--grid=16]
//
// Output: one line per merged box:  #idx  x,y  w×h  (px=opaque pixel count)
//
// Written for the Pixel Crawler Roofs.png / Walls.png modular building sheets
// (HANDOFF §9.6 item 1). Do not eyeball these numbers off a screenshot.

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { basename } from 'node:path';

/* ---------------------------------------------------------------- PNG decode */

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a)
    throw new Error('not a PNG');

  let pos = 8;
  let ihdr = null;
  const idat = [];
  let plte = null;
  let trns = null;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colour: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (!ihdr) throw new Error('no IHDR');
  if (ihdr.interlace !== 0) throw new Error('interlaced PNG not supported');
  if (ihdr.depth !== 8) throw new Error(`bit depth ${ihdr.depth} not supported`);

  const { width, height, colour } = ihdr;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (!channels) throw new Error(`colour type ${colour} not supported`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = channels;              // bytes per pixel, depth 8
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  // undo the per-scanline PNG filters
  let sp = 0;
  for (let y = 0; y < height; y++) {
    const ft = raw[sp++];
    const line = raw.subarray(sp, sp + stride); sp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      const x = line[i];
      let v;
      switch (ft) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${ft} on row ${y}`);
      }
      cur[i] = v & 0xff;
    }
  }

  // expand to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    let r, g, b, a = 255;
    if (colour === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3]; }
    else if (colour === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; }
    else if (colour === 0) { r = g = b = out[i]; }
    else if (colour === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1]; }
    else { // palette
      const idx = out[i];
      r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2];
      a = trns && idx < trns.length ? trns[idx] : 255;
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { width, height, data: rgba };
}

/* ------------------------------------------------- connected components (8-way) */

// Crop to a window. Sprites on a hand-packed kit sheet often abut, so global
// component finding cannot separate them; cropping to a generously-drawn window
// and letting the script report the *tight* box inside it keeps the numbers
// measured while letting a human say which part is which.
function crop(img, x, y, w, h) {
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4), ox: x, oy: y };
  for (let j = 0; j < h; j++)
    img.data.copy(out.data, j * w * 4, ((y + j) * img.width + x) * 4,
                  ((y + j) * img.width + x + w) * 4);
  return out;
}

// inkMax >= 0 also treats near-black pixels as background. Pixel Crawler draws
// every part with its own closed 1px dark outline, so dropping the ink splits
// parts that merely abut — which plain alpha components cannot do on a
// hand-packed kit sheet. Boxes are grown by `grow` afterwards to put the
// outline back.
function components(img, alphaMin = 1, inkMax = -1) {
  const { width: W, height: H, data } = img;
  const label = new Int32Array(W * H).fill(-1);
  const boxes = [];
  const stack = new Int32Array(W * H);   // iterative flood fill — no recursion
  const solid = p => data[p * 4 + 3] >= alphaMin &&
    (inkMax < 0 || Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) > inkMax);

  for (let start = 0; start < W * H; start++) {
    if (label[start] !== -1 || !solid(start)) continue;
    const id = boxes.length;
    const box = { x0: W, y0: H, x1: -1, y1: -1, px: 0 };
    let sp = 0;
    stack[sp++] = start;
    label[start] = id;
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % W, y = (p / W) | 0;
      box.px++;
      if (x < box.x0) box.x0 = x;
      if (y < box.y0) box.y0 = y;
      if (x > box.x1) box.x1 = x;
      if (y > box.y1) box.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W || (dx === 0 && dy === 0)) continue;
          const q = ny * W + nx;
          if (label[q] !== -1 || !solid(q)) continue;
          label[q] = id;
          stack[sp++] = q;
        }
      }
    }
    boxes.push(box);
  }
  return boxes;
}

/* ----------------------------------------------------------------- box merging */

const near = (a, b, gap) =>
  a.x0 - gap <= b.x1 + gap && b.x0 - gap <= a.x1 + gap &&
  a.y0 - gap <= b.y1 + gap && b.y0 - gap <= a.y1 + gap;

// Repeatedly union any two boxes whose (gap-inflated) rects intersect, until
// a full pass makes no change. O(n^2) per pass — fine for a few hundred parts.
function mergeBoxes(boxes, gap) {
  let list = boxes.map(b => ({ ...b }));
  for (;;) {
    let merged = false;
    const out = [];
    const used = new Array(list.length).fill(false);
    for (let i = 0; i < list.length; i++) {
      if (used[i]) continue;
      const a = { ...list[i] };
      used[i] = true;
      for (let j = i + 1; j < list.length; j++) {
        if (used[j] || !near(a, list[j], gap)) continue;
        const b = list[j];
        a.x0 = Math.min(a.x0, b.x0); a.y0 = Math.min(a.y0, b.y0);
        a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1);
        a.px += b.px;
        used[j] = true;
        merged = true;
      }
      out.push(a);
    }
    list = out;
    if (!merged) break;
  }
  return list;
}

/* -------------------------------------------------------------- XY-cut / gutters */

// Connected components only separate sprites that do not touch. On a packed
// atlas the parts of a kit often abut, so also offer a recursive projection
// split: find fully-transparent rows/columns (gutters) at least `minGutter`
// wide, cut there, and recurse on each side, alternating axis.
function alphaProfile(img, box) {
  const { width: W, data } = img;
  const rows = new Int32Array(box.y1 - box.y0 + 1);
  const cols = new Int32Array(box.x1 - box.x0 + 1);
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++)
      if (data[(y * W + x) * 4 + 3] >= 1) { rows[y - box.y0]++; cols[x - box.x0]++; }
  return { rows, cols };
}

function gutters(profile, minGutter) {
  const cuts = [];
  let run = 0;
  for (let i = 0; i < profile.length; i++) {
    if (profile[i] === 0) run++;
    else { if (run >= minGutter && i - run > 0) cuts.push([i - run, i - 1]); run = 0; }
  }
  return cuts; // interior blank runs only; leading/trailing are trimmed elsewhere
}

function trim(profile) {
  let a = 0, b = profile.length - 1;
  while (a <= b && profile[a] === 0) a++;
  while (b >= a && profile[b] === 0) b--;
  return [a, b];
}

function xycut(img, box, minGutter, depth = 0, out = []) {
  const { rows, cols } = alphaProfile(img, box);
  const [ry0, ry1] = trim(rows), [rx0, rx1] = trim(cols);
  if (ry1 < ry0 || rx1 < rx0) return out;
  const b = { x0: box.x0 + rx0, x1: box.x0 + rx1, y0: box.y0 + ry0, y1: box.y0 + ry1 };

  const p = alphaProfile(img, b);
  const rowCuts = gutters(p.rows, minGutter);
  const colCuts = gutters(p.cols, minGutter);
  // cut on the axis with the widest gutter first
  const widest = a => a.reduce((m, [s, e]) => Math.max(m, e - s + 1), 0);
  const useRows = widest(rowCuts) >= widest(colCuts) ? rowCuts.length > 0 : false;
  const cuts = useRows || colCuts.length === 0 ? rowCuts : colCuts;
  const axis = useRows || colCuts.length === 0 ? 'y' : 'x';

  if (!cuts.length || depth > 24) {
    let px = 0;
    const { width: W, data } = img;
    for (let y = b.y0; y <= b.y1; y++)
      for (let x = b.x0; x <= b.x1; x++) if (data[(y * W + x) * 4 + 3] >= 1) px++;
    out.push({ ...b, px });
    return out;
  }

  const lo = axis === 'y' ? b.y0 : b.x0;
  const hi = axis === 'y' ? b.y1 : b.x1;
  let cur = lo;
  const segs = [];
  for (const [s, e] of cuts) { segs.push([cur, lo + s - 1]); cur = lo + e + 1; }
  segs.push([cur, hi]);
  for (const [s, e] of segs) {
    if (e < s) continue;
    xycut(img, axis === 'y'
      ? { x0: b.x0, x1: b.x1, y0: s, y1: e }
      : { x0: s, x1: e, y0: b.y0, y1: b.y1 }, minGutter, depth + 1, out);
  }
  return out;
}

/* --------------------------------------------------------------------- reporting */

// Rough colour summary of a box: the most common opaque RGB values.
function palette(img, box, top = 4) {
  const { width: W, data } = img;
  const counts = new Map();
  for (let y = box.y0; y <= box.y1; y++)
    for (let x = box.x0; x <= box.x1; x++) {
      const p = (y * W + x) * 4;
      if (data[p + 3] < 1) continue;
      const k = (data[p] << 16) | (data[p + 1] << 8) | data[p + 2];
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, top)
    .map(([k, n]) => ({ hex: '#' + k.toString(16).padStart(6, '0'), n }));
}

// Raw alpha occupancy, independent of any box finding — the honest picture of
// where the sheet is empty. '.' = fully transparent cell, digits = how full.
function occupancy(img, cell) {
  const { width: W, height: H, data } = img;
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const g = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] >= 1) g[(y / cell) | 0][(x / cell) | 0]++;
  const cap = cell * cell;
  const head = '     ' + Array.from({ length: cols },
    (_, c) => (c % 5 === 0 ? String((c * cell) % 100).padStart(1)[0] : ' ')).join('');
  return head + '\n' + g.map((r, i) => String(i * cell).padStart(4) + ' ' +
    r.map(v => v === 0 ? '.' : v === cap ? '#' : String(Math.min(9, Math.ceil(v / cap * 9)))).join('')
  ).join('\n');
}

// Exact nine-slice geometry: collapse consecutive rows that share the same
// opaque-run signature into a band. A nine-slice ring shows up as a handful of
// bands whose run boundaries ARE the slice boundaries — measured to the pixel,
// which eyeballing a zoomed screenshot cannot do.
function bands(img, ox = 0, oy = 0) {
  const { width: W, height: H, data } = img;
  const sig = y => {
    const runs = [];
    let s = -1;
    for (let x = 0; x < W; x++) {
      const on = data[(y * W + x) * 4 + 3] >= 1;
      if (on && s < 0) s = x;
      if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; }
    }
    if (s >= 0) runs.push([s, W - 1]);
    return runs;
  };
  const out = [];
  let prev = null, start = 0;
  for (let y = 0; y <= H; y++) {
    const k = y < H ? JSON.stringify(sig(y)) : null;
    if (prev !== null && k !== prev) {
      out.push({ y0: start + oy, y1: y - 1 + oy, h: y - start, runs: JSON.parse(prev) });
      start = y;
    }
    prev = k;
    if (k === null) break;
  }
  return out.map(b => ({
    ...b,
    runs: b.runs.map(([a, z]) => `${a + ox}..${z + ox}(${z - a + 1})`),
  }));
}

// Same idea down the other axis — column bands. Transposing and reusing bands()
// keeps one implementation.
function transpose(img) {
  const out = { width: img.height, height: img.width, data: Buffer.alloc(img.data.length) };
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      img.data.copy(out.data, (x * out.width + y) * 4, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
  return out;
}

function asciiMap(img, boxes, cell) {
  const { width: W, height: H } = img;
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  boxes.forEach((b, i) => {
    const tag = i.toString(36);
    for (let r = Math.floor(b.y0 / cell); r <= Math.floor(b.y1 / cell); r++)
      for (let c = Math.floor(b.x0 / cell); c <= Math.floor(b.x1 / cell); c++)
        if (grid[r]) grid[r][c] = tag;
  });
  return grid.map((r, i) => String(i * cell).padStart(4) + ' ' + r.join('')).join('\n');
}

/* -------------------------------------------------------------------------- main */

const args = process.argv.slice(2);
const files = args.filter(a => !a.startsWith('--'));
const opt = Object.fromEntries(args.filter(a => a.startsWith('--'))
  .map(a => { const [k, v] = a.slice(2).split('='); return [k, v === undefined ? true : v]; }));

const gap = Number(opt.gap ?? 2);
const minPx = Number(opt.min ?? 1);
const cell = Number(opt.grid ?? 16);

if (!files.length) {
  console.error('usage: node tools/index-atlas.mjs <file.png> [--gap=2] [--min=4] [--json] [--ascii] [--grid=16]');
  process.exit(1);
}

const report = [];
for (const f of files) {
  let img = decodePNG(readFileSync(f));
  let ox = 0, oy = 0;
  if (opt.region) {
    const [rx, ry, rw, rh] = String(opt.region).split(',').map(Number);
    img = crop(img, rx, ry, rw, rh);
    ox = rx; oy = ry;
  }
  const raw = components(img, 1, opt.ink === undefined ? -1 : Number(opt.ink === true ? 40 : opt.ink));
  const grow = Number(opt.grow ?? 0);
  if (grow) for (const b of raw) {
    b.x0 = Math.max(0, b.x0 - grow); b.y0 = Math.max(0, b.y0 - grow);
    b.x1 = Math.min(img.width - 1, b.x1 + grow); b.y1 = Math.min(img.height - 1, b.y1 + grow);
  }
  let merged;
  if (opt.xycut !== undefined) {
    const g = Number(opt.xycut === true ? 1 : opt.xycut);
    merged = xycut(img, { x0: 0, y0: 0, x1: img.width - 1, y1: img.height - 1 }, g);
  } else {
    merged = mergeBoxes(raw, gap);
  }
  merged = merged
    .filter(b => b.px >= minPx)
    .sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));

  const boxes = merged.map((b, i) => ({
    id: i,
    x: b.x0 + ox, y: b.y0 + oy,
    w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1,
    px: b.px,
    fill: +(b.px / ((b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1))).toFixed(3),
    tiles: `${+((b.x1 - b.x0 + 1) / cell).toFixed(2)}x${+((b.y1 - b.y0 + 1) / cell).toFixed(2)}`,
    colours: palette(img, b),
  }));

  report.push({ file: basename(f), width: img.width, height: img.height,
                rawComponents: raw.length, gap, boxes });

  if (!opt.json) {
    console.log(`\n=== ${basename(f)}  ${img.width}x${img.height}  `
      + `(${raw.length} raw components -> ${boxes.length} merged, gap<=${gap}px) ===`);
    for (const b of boxes) {
      console.log(
        `#${String(b.id).padStart(3)}  x=${String(b.x).padStart(3)} y=${String(b.y).padStart(3)} `
        + `w=${String(b.w).padStart(3)} h=${String(b.h).padStart(3)}  `
        + `tiles=${b.tiles.padEnd(11)} px=${String(b.px).padStart(5)} fill=${b.fill}  `
        + b.colours.map(c => `${c.hex}x${c.n}`).join(' '));
    }
    if (opt.ascii) console.log('\n' + asciiMap(img, merged, cell));
    if (opt.occ) console.log('\n' + occupancy(img, Number(opt.occ === true ? cell : opt.occ)));
    if (opt.bands) {
      console.log('\nrow bands (y0..y1 h=n : opaque x-runs)');
      for (const b of bands(img, ox, oy))
        console.log(`  y ${String(b.y0).padStart(3)}..${String(b.y1).padStart(3)} h=${String(b.h).padStart(3)}  ${b.runs.join(' ')}`);
    }
    if (opt.cbands) {
      console.log('\ncolumn bands (x0..x1 w=n : opaque y-runs)');
      for (const b of bands(transpose(img), oy, ox))
        console.log(`  x ${String(b.y0).padStart(3)}..${String(b.y1).padStart(3)} w=${String(b.h).padStart(3)}  ${b.runs.join(' ')}`);
    }
  }
}

if (opt.json) console.log(JSON.stringify(report, null, 2));
