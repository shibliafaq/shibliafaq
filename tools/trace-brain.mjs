/**
 * Traces the outer silhouette of the brain reference into an anchor path.
 * Decodes the PNG with zlib only (no deps), masks foreground, keeps the
 * largest connected component, walks its boundary, then RDP-simplifies.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const SRC = process.argv[2];
const TARGET = Number(process.argv[3] || 150);

/* ---------- minimal PNG decode ---------- */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let p = 8, ihdr = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        w: data.readUInt32BE(0), h: data.readUInt32BE(4),
        depth: data[8], color: data[9], interlace: data[12],
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr) throw new Error('no IHDR');
  const { w, h, depth, color, interlace } = ihdr;
  if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) {
    throw new Error(`unsupported png: depth=${depth} color=${color} interlace=${interlace}`);
  }
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
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
  }
  return { w, h, ch, px: out };
}

/* ---------- mask ---------- */
const img = decodePNG(fs.readFileSync(SRC));
const { w, h, ch, px } = img;
console.log(`image ${w}x${h} channels=${ch}`);

const mask = new Uint8Array(w * h);
let fg = 0;
for (let i = 0, n = w * h; i < n; i++) {
  const r = px[i * ch], g = px[i * ch + 1], b = px[i * ch + 2];
  const a = ch === 4 ? px[i * ch + 3] : 255;
  // Foreground = opaque and not near-white (covers both transparent and white grounds).
  const on = a > 128 && !(r > 244 && g > 244 && b > 244);
  mask[i] = on ? 1 : 0;
  if (on) fg++;
}
console.log(`foreground px: ${fg} (${((fg / (w * h)) * 100).toFixed(1)}%)`);

/* ---------- largest connected component (4-way BFS) ---------- */
const label = new Int32Array(w * h).fill(-1);
let best = { id: -1, size: 0 };
const queue = new Int32Array(w * h);
let comp = 0;
for (let s = 0; s < w * h; s++) {
  if (!mask[s] || label[s] !== -1) continue;
  let head = 0, tail = 0, size = 0;
  queue[tail++] = s; label[s] = comp;
  while (head < tail) {
    const q = queue[head++]; size++;
    const x = q % w, y = (q / w) | 0;
    if (x > 0)     { const t = q - 1; if (mask[t] && label[t] === -1) { label[t] = comp; queue[tail++] = t; } }
    if (x < w - 1) { const t = q + 1; if (mask[t] && label[t] === -1) { label[t] = comp; queue[tail++] = t; } }
    if (y > 0)     { const t = q - w; if (mask[t] && label[t] === -1) { label[t] = comp; queue[tail++] = t; } }
    if (y < h - 1) { const t = q + w; if (mask[t] && label[t] === -1) { label[t] = comp; queue[tail++] = t; } }
  }
  if (size > best.size) best = { id: comp, size };
  comp++;
}
console.log(`components: ${comp}, largest: ${best.size} px`);

const solid = new Uint8Array(w * h);
for (let i = 0; i < w * h; i++) solid[i] = label[i] === best.id ? 1 : 0;

/* ---------- Moore-neighbour boundary trace ---------- */
const get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : solid[y * w + x]);

let start = -1;
for (let i = 0; i < w * h && start < 0; i++) if (solid[i]) start = i;
const sx = start % w, sy = (start / w) | 0;

// Clockwise neighbourhood starting East.
const N8 = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const idxOf = (dx, dy) => N8.findIndex(([a, b]) => a === dx && b === dy);

const contour = [];
let bx = sx, by = sy;
// Row-major scan means the pixel west of the start is background, so that is
// where we "came from" for the first sweep.
let px_ = sx - 1, py_ = sy;
let guard = 0;
do {
  contour.push([bx, by]);
  const pi = idxOf(px_ - bx, py_ - by);
  let found = false;
  for (let k = 1; k <= 8; k++) {
    const d = (pi + k) % 8;
    const nx = bx + N8[d][0], ny = by + N8[d][1];
    if (get(nx, ny)) {
      // The last background examined — one step counter-clockwise — becomes
      // the backtrack for the next sweep.
      const pd = (d + 7) % 8;
      px_ = bx + N8[pd][0]; py_ = by + N8[pd][1];
      bx = nx; by = ny;
      found = true;
      break;
    }
  }
  if (!found) break;
  guard++;
} while (!(bx === sx && by === sy) && guard < w * h * 4);
console.log(`contour points: ${contour.length}`);

/* ---------- RDP simplify to ~TARGET points ---------- */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let maxD = -1, idx = -1;
    const [x1, y1] = pts[i], [x2, y2] = pts[j];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((pts[k][0] - x1) * dy - (pts[k][1] - y1) * dx) / len;
      if (d > maxD) { maxD = d; idx = k; }
    }
    if (maxD > eps && idx > 0) { keep[idx] = 1; stack.push([i, idx], [idx, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

let lo = 0.2, hi = 60, simple = contour;
for (let it = 0; it < 40; it++) {
  const mid = (lo + hi) / 2;
  simple = rdp(contour, mid);
  if (simple.length > TARGET) lo = mid; else hi = mid;
}
console.log(`simplified to ${simple.length} points (eps≈${hi.toFixed(2)})`);

/* ---------- normalise into a 1000-wide box ---------- */
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const [x, y] of simple) {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
}
const s = 1000 / (maxX - minX);
const boxH = Math.round((maxY - minY) * s);
const norm = simple.map(([x, y]) => [
  Math.round((x - minX) * s),
  Math.round((y - minY) * s),
]);

const lines = [];
for (let i = 0; i < norm.length; i += 6) {
  lines.push('  ' + norm.slice(i, i + 6).map(([x, y]) => `[${x}, ${y}]`).join(', ') + ',');
}
const src = `const BRAIN = [\n${lines.join('\n')}\n];\nconst BRAIN_W = 1000, BRAIN_H = ${boxH};\n`;
fs.writeFileSync(process.argv[4] || 'brain-path.js', src);
console.log(`bbox ${Math.round(maxX - minX)}x${Math.round(maxY - minY)} -> 1000x${boxH}`);
console.log(`wrote ${process.argv[4] || 'brain-path.js'}`);
