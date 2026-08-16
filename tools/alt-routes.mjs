/**
 * Generate alternative routes from the one that was drawn by hand.
 *
 * THE DIVISION OF LABOUR
 * ----------------------
 * The prominent route is authored: it wanders where it should, fronts the
 * buildings it should, and no cost function would have produced it. What it also
 * does is establish the CONSTRAINTS — where the journey starts and ends, which
 * seven buildings it must pass, and in what order. Those are mechanical, and
 * once they are pinned down a machine can propose other lines that satisfy them.
 *
 * So this does not invent a journey. It answers: given the same seven focal
 * points in the same order, what OTHER ways across the painted road exist?
 *
 * HOW THE ALTERNATIVES ARE MADE TO DIVERGE
 * Every cell of every route already known — the hand-drawn one first, then each
 * alternative as it is produced — is made expensive. Without that the search
 * returns the same line every time, because the same line is still the cheapest.
 * With it, each new route is pushed onto roads the others did not use, and the
 * overlap is measured rather than assumed: anything sharing more than
 * `--maxshare` of its cells with an earlier route is thrown away and the search
 * runs again with the penalty raised.
 *
 * ORDER IS NOT NEGOTIABLE. Alternatives are solved leg by leg — start to the
 * first focal point, then focal point to focal point, then the last to the end.
 * A leg cannot skip its destination, so no alternative can reorder the career.
 *
 * USAGE
 *   node tools/alt-routes.mjs --n=3
 *   node tools/alt-routes.mjs --n=3 --write
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const MAP = 'public/assets/pixel/valley-map.json';
const HISTORY = '.map-history';
const ROAD = new Set([1, 6, 10, 11]);
const SPEC_ORDER = ['barch', 'chadda', 'metarch1', 'jaiswal', 'medicfibers', 'metarch2', 'kfupm'];

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const N = +arg('n', 3);
const MAX_SHARE = +arg('maxshare', 0.6);
const SNAP = +arg('snap', 12);
const WRITE = process.argv.includes('--write');

const doc = JSON.parse(readFileSync(MAP, 'utf-8'));
const { cols: C, rows: R } = doc;
const road = (c, r) => c >= 0 && r >= 0 && c < C && r < R && ROAD.has(doc.terrain[r * C + c]);
const key = (p) => p[1] * C + p[0];

/* ------------------------------------------------------------------ clamping
   A click on the right-hand edge of the stage can land on column 44 of a
   44-column map. It is off the grid, so it is not road, so every check
   downstream fails on a cell the map does not have. Clamp it and say so — this
   is a mis-click to correct, not a decision to respect. */
const clampCell = (p) => [Math.min(C - 1, Math.max(0, p[0])), Math.min(R - 1, Math.max(0, p[1]))];
const clamped = [];
const fix = (p, what) => {
  if (!p) return p;
  const q = clampCell(p);
  if (q[0] !== p[0] || q[1] !== p[1]) clamped.push(`${what} ${p} -> ${q}`);
  return q;
};
doc.start = fix(doc.start, 'start');
doc.end = fix(doc.end, 'end');
for (const rt of doc.routes || []) rt.points = rt.points.map((p, i) => fix(p, `${rt.name}[${i}]`));

/* ------------------------------------------------------------- focal points */
function nearestRoad(c, r, radius = SNAP) {
  let best = null, bd = Infinity;
  for (let dr = -radius; dr <= radius; dr++)
    for (let dc = -radius; dc <= radius; dc++) {
      const a = c + dc, b = r + dr;
      if (!road(a, b)) continue;
      const d = Math.hypot(dc, dr);
      if (d < bd) { bd = d; best = [a, b]; }
    }
  return best;
}
const marked = doc.objects.filter((o) => o.stop);
const stops = SPEC_ORDER.map((id) => {
  const o = marked.find((x) => x.stop === id);
  if (!o) return { id, missing: true };
  return { id, anchor: [o.c, o.r], cell: nearestRoad(o.c, o.r) };
});
const missing = stops.filter((s) => s.missing || !s.cell);
if (missing.length || !doc.start || !doc.end) {
  console.error('cannot generate: '
    + (missing.length ? `${missing.map((s) => s.id).join(', ')} unmarked or off-road; ` : '')
    + (!doc.start ? 'no start; ' : '') + (!doc.end ? 'no end' : ''));
  process.exit(1);
}

/* ----------------------------------------------------------------- Dijkstra */
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
            [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

function shortest(from, to, penalty) {
  const dist = new Float64Array(C * R).fill(Infinity);
  const prev = new Int32Array(C * R).fill(-1);
  const seen = new Uint8Array(C * R);
  dist[key(from)] = 0;
  for (;;) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < dist.length; i++) if (!seen[i] && dist[i] < bd) { bd = dist[i]; best = i; }
    if (best < 0) break;
    seen[best] = 1;
    const c = best % C, r = (best - c) / C;
    if (c === to[0] && r === to[1]) break;
    for (const [dx, dy, w] of NB) {
      const a = c + dx, b = r + dy;
      if (!road(a, b)) continue;
      // A diagonal needs both of its orthogonal neighbours, or the route slips
      // through the corner between two roads that do not actually join.
      if (dx && dy && !(road(c + dx, r) && road(c, r + dy))) continue;
      const j = key([a, b]);
      const nd = bd + w + (penalty[j] || 0);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = best; }
    }
  }
  if (!isFinite(dist[key(to)])) return null;
  const out = [];
  for (let i = key(to); i >= 0; i = prev[i]) { const c = i % C; out.push([c, (i - c) / C]); }
  return out.reverse();
}

const CHAIN = [doc.start, ...stops.map((s) => s.cell), doc.end];
const legChain = (penalty) => {
  const all = [];
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const leg = shortest(CHAIN[i], CHAIN[i + 1], penalty);
    if (!leg) return null;
    all.push(...(i ? leg.slice(1) : leg));
  }
  return all;
};

/* -------------------------------------- seed the penalty with what exists */
const penalty = new Float64Array(C * R);
const walkSeg = (a, b) => {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  const o = [];
  for (let i = 0; i <= (steps || 0); i++)
    o.push([Math.round(a[0] + (b[0] - a[0]) * (steps ? i / steps : 0)),
            Math.round(a[1] + (b[1] - a[1]) * (steps ? i / steps : 0))]);
  return o;
};
const existing = [];
for (const rt of doc.routes || []) {
  const cells = rt.points.slice(1).reduce((acc, p, i) => {
    const s = walkSeg(rt.points[i], p);
    acc.push(...(acc.length ? s.slice(1) : s));
    return acc;
  }, []);
  existing.push({ name: rt.name, cells });
  for (const p of cells) penalty[key(p)] += 8;
}

/* ---------------------------------------------------------- generate N alts */
/**
 * Keep only the corners — but a REVERSAL is a corner, even though it is
 * collinear.
 *
 * The obvious collinearity test drops any point lying on the line between its
 * neighbours, and a there-and-back spur lies exactly on that line: out to a
 * building standing off the road, then back the way it came. Dropping its
 * turning point collapses the whole detour to nothing, and the route silently
 * stops visiting the building it went there for. That is precisely how Alt 3
 * came back "missing medicfibers by 16 tiles" while the generator had routed
 * straight through its doorstep — the cell was in the path and then simplified
 * out of existence.
 *
 * So a point survives if the direction turns OR if it reverses.
 */
const simplify = (cells) => {
  const out = [cells[0]];
  for (let i = 1; i < cells.length - 1; i++) {
    const p = out[out.length - 1], c = cells[i], n = cells[i + 1];
    const ax = c[0] - p[0], ay = c[1] - p[1];
    const bx = n[0] - c[0], by = n[1] - c[1];
    const straight = ax * by === ay * bx;          // same line
    const forward = ax * bx + ay * by > 0;         // ...and still going that way
    if (!straight || !forward) out.push(c);
  }
  out.push(cells[cells.length - 1]);
  return out;
};

/** Re-walk a simplified polyline and confirm it still passes every focal point.
 *  Generating a route and trusting it is how the last one got through. */
function verify(poly, cells) {
  const walked = poly.slice(1).reduce((acc, p, i) => {
    const s = walkSeg(poly[i], p);
    acc.push(...(acc.length ? s.slice(1) : s));
    return acc;
  }, []);
  const offRoad = walked.filter(([c, r]) => !road(c, r)).length;
  const misses = stops.filter((s) => {
    let bd = Infinity;
    for (const w of walked) bd = Math.min(bd, Math.hypot(w[0] - s.anchor[0], w[1] - s.anchor[1]));
    return bd > 8;
  }).map((s) => s.id);
  return { offRoad, misses, cells: walked.length };
}
const len = (cells) => cells.slice(1).reduce((n, c, i) => n + Math.hypot(c[0] - cells[i][0], c[1] - cells[i][1]), 0);

console.log(`\nmap ${C}x${R}   start ${doc.start}   end ${doc.end}`);
if (clamped.length) { console.log('clamped off-grid cells:'); for (const c of clamped) console.log('   ' + c); }
console.log(`\nexisting: ${existing.map((e) => `${e.name} (${e.cells.length} cells)`).join(', ') || 'none'}`);
console.log(`\ngenerating ${N} alternative(s), overlap cap ${MAX_SHARE}:\n`);

const made = [];
for (let attempt = 0; made.length < N && attempt < N * 5; attempt++) {
  const cells = legChain(penalty);
  if (!cells) break;
  const set = new Set(cells.map(key));
  const pool = [...existing, ...made];
  const share = pool.length
    ? Math.max(...pool.map((e) => e.cells.filter((p) => set.has(key(p))).length / Math.min(e.cells.length, cells.length)))
    : 0;
  for (const p of cells) penalty[key(p)] += 8;      // always raise, even if rejected
  if (share > MAX_SHARE) continue;
  const poly = simplify(cells);
  // Verify the SIMPLIFIED form, not the raw path. The raw path is correct by
  // construction; the stored polyline is what everything downstream reads, and
  // it is the thing that can differ.
  const v = verify(poly, cells);
  if (v.offRoad || v.misses.length) {
    console.log(`  (rejected a candidate: ${v.offRoad} off-road cells`
      + `${v.misses.length ? ', misses ' + v.misses.join(', ') : ''})`);
    continue;
  }
  made.push({ name: `Alt ${made.length + 1}`, cells, poly, share, length: len(cells) });
  console.log(`  Alt ${made.length}: ${String(cells.length).padStart(4)} cells, `
    + `${made[made.length - 1].length.toFixed(1).padStart(6)} tiles, `
    + `${String(poly.length).padStart(3)} corners, shares ${(share * 100).toFixed(0)}% with the closest existing route`);
}

if (!made.length) {
  console.log('  none — every candidate overlapped an existing route beyond the cap.');
  console.log('  The road may simply not fork between these focal points. Try --maxshare=0.8.');
}

const SIDE = arg('out', null);
if (SIDE) {
  doc.routes = [...(doc.routes || []),
    ...made.map((m, i) => ({ id: 'alt' + (i + 1), name: m.name, points: m.poly }))];
  writeFileSync(SIDE, JSON.stringify(doc));
  console.log(`
written to ${SIDE} — ${doc.routes.length} routes.`);
  console.log('The live map was NOT touched. Import this file in the editor, or');
  console.log('close the editor tab and re-run with --write.');
} else if (WRITE) {
  mkdirSync(HISTORY, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  copyFileSync(MAP, `${HISTORY}/PROTECTED-pre-alt-${stamp}.json`);
  doc.routes = [...(doc.routes || []),
    ...made.map((m, i) => ({ id: 'alt' + (i + 1), name: m.name, points: m.poly }))];
  writeFileSync(MAP, JSON.stringify(doc));
  console.log(`\nwritten — ${doc.routes.length} routes now on the map.`);
  console.log(`previous version kept at ${HISTORY}/PROTECTED-pre-alt-${stamp}.json`);
  console.log('Reload the editor, then: node tools/check-paths.mjs');
} else {
  console.log('\n(dry run — add --write to put these on the map)');
}
