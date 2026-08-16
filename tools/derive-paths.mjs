/**
 * Derive the walk's route(s) from the road that is actually painted on the map.
 *
 * WHY DERIVED AND NOT WRITTEN DOWN
 * --------------------------------
 * `valley.js` has a `PATH` polyline, and it is now fiction. It described the
 * road the GENERATOR drew; the road on the map has since been painted by hand,
 * widened, rerouted and extended by twenty-four rows. This project already
 * learned this lesson once in the other direction — seven buildings ended up in
 * the river because they were hand-placed against a computed sine curve. The
 * rule is the same either way round: whichever of the two is authored by hand is
 * the truth, and the other must be derived from it.
 *
 * The painted terrain is now the truth. So the route is read out of it.
 *
 * WHAT COUNTS AS ROAD
 * PATH, BRIDGE, and the two desert paving terrains. Not sand, not grass — a
 * walker that cuts across open ground is not following a road.
 *
 * HOW ALTERNATIVES ARE FOUND
 * The road is 3-7 cells wide and forks on 41% of its rows, so "the route" is not
 * unique. Route 1 is the cheapest path. Each subsequent route re-runs the search
 * with every cell of every earlier route made expensive, which pushes the search
 * into genuinely different forks rather than returning the same line shifted by
 * one cell. Routes that still overlap an earlier one by more than `--maxshare`
 * are discarded, so what comes back is distinct by construction, not by hope.
 *
 * WAYPOINTS
 * With --waypoints, the route is solved as a chain of segments between fixed
 * cells and every route visits all of them in order. That is what keeps the
 * focal points constant while the connecting road varies.
 *
 * USAGE
 *   node tools/derive-paths.mjs --routes=3
 *   node tools/derive-paths.mjs --routes=3 --waypoints=19,22:18,46:40,52
 *   node tools/derive-paths.mjs --routes=3 --out=public/assets/pixel/valley-paths.json
 */

import { readFileSync, writeFileSync } from 'node:fs';

const MAP = 'public/assets/pixel/valley-map.json';
const ROAD = new Set([1, 6, 10, 11]);          // PATH, BRIDGE, DROAD, DPAVE

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const ROUTES = +arg('routes', 3);
const MAX_SHARE = +arg('maxshare', 0.75);
const OUT = arg('out', null);
const WAYPOINTS = (arg('waypoints', '') || '')
  .split(':').filter(Boolean).map((s) => s.split(',').map(Number));

const doc = JSON.parse(readFileSync(MAP, 'utf-8'));
const { cols: C, rows: R } = doc;
const idx = (c, r) => r * C + c;
const road = (c, r) => c >= 0 && r >= 0 && c < C && r < R && ROAD.has(doc.terrain[idx(c, r)]);

/* ------------------------------------------------------------------ Dijkstra
   8-neighbour so the route can run diagonally instead of staircasing, which
   matters because the walker is drawn facing along it. Diagonals cost sqrt(2)
   so they are not a free shortcut, and a diagonal is only legal when both of
   its orthogonal neighbours are road — otherwise the route squeezes through the
   corner between two buildings that do not actually connect. */
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
            [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

function shortest(from, to, penalty) {
  const dist = new Float64Array(C * R).fill(Infinity);
  const prev = new Int32Array(C * R).fill(-1);
  const seen = new Uint8Array(C * R);
  dist[idx(...from)] = 0;
  // A binary heap is overkill for 1,800 nodes; a linear scan is simpler to read
  // and finishes instantly at this size.
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
      if (dx && dy && !(road(c + dx, r) && road(c, r + dy))) continue;   // no corner-cutting
      const j = idx(a, b);
      const nd = bd + w + (penalty[j] || 0);
      if (nd < dist[j]) { dist[j] = nd; prev[j] = best; }
    }
  }
  const end = idx(...to);
  if (!isFinite(dist[end])) return null;
  const out = [];
  for (let i = end; i >= 0; i = prev[i]) { const c = i % C; out.push([c, (i - c) / C]); }
  return out.reverse();
}

/** Chain of shortest hops through every waypoint, in order. */
function through(points, penalty) {
  const full = [];
  for (let i = 0; i < points.length - 1; i++) {
    const leg = shortest(points[i], points[i + 1], penalty);
    if (!leg) return null;
    full.push(...(i ? leg.slice(1) : leg));
  }
  return full;
}

/* ------------------------------------------------------- ends of the network */
const rowCells = (r) => { const o = []; for (let c = 0; c < C; c++) if (road(c, r)) o.push(c); return o; };
const firstRow = [...Array(R).keys()].find((r) => rowCells(r).length);
const lastRow = [...Array(R).keys()].reverse().find((r) => rowCells(r).length);
const mid = (r) => { const cs = rowCells(r); return [cs[Math.floor(cs.length / 2)], r]; };

const START = mid(firstRow);
const END = mid(lastRow);

/* ------------------------------------------------------------- focal points
   Read from the document, not inferred from position. Every object carrying a
   `stop` id is a focal point; the order comes from the STOPS spec, which is the
   chronology of the CV and is not negotiable by where a building happens to sit.

   A building is not standing ON the road — it is beside it — so the waypoint is
   the nearest road cell to its anchor. Snapping is what lets the route pass the
   door rather than through the wall. */
const SPEC_ORDER = ['barch', 'chadda', 'metarch1', 'jaiswal', 'medicfibers', 'metarch2', 'kfupm'];

function nearestRoad(c, r, radius = 12) {
  let best = null, bd = Infinity;
  for (let dr = -radius; dr <= radius; dr++)
    for (let dc = -radius; dc <= radius; dc++) {
      const a = c + dc, b = r + dr;
      if (!road(a, b)) continue;
      const d = Math.hypot(dc, dr);
      if (d < bd) { bd = d; best = [a, b]; }
    }
  return best ? { cell: best, dist: bd } : null;
}

const marked = doc.objects.filter((o) => o.stop);
const stops = SPEC_ORDER.map((id) => {
  const o = marked.find((x) => x.stop === id);
  if (!o) return { id, missing: true };
  const near = nearestRoad(o.c, o.r);
  return { id, name: o.name, anchor: [o.c, o.r],
    cell: near?.cell, offRoad: !near, roadDist: near ? +near.dist.toFixed(1) : null };
});
const missing = stops.filter((s) => s.missing);
const usable = stops.filter((s) => s.cell);

/* --------------------------------------------- alternatives, leg by leg
   The route is NOT one polyline with alternatives. It is a chain of legs
   between fixed focal points, and each leg carries its own alternatives. That
   is what the runtime needs: scrolling follows the current leg's default route,
   and steering at a fork swaps which alternative of THAT leg is being walked,
   without any risk of skipping or reordering a focal point. */
function legRoutes(from, to, want) {
  const penalty = new Float64Array(C * R);
  const out = [];
  const key = (x) => x[1] * C + x[0];
  for (let attempt = 0; attempt < want * 4 && out.length < want; attempt++) {
    const p = shortest(from, to, penalty);
    if (!p) break;
    const set = new Set(p.map(key));
    const share = out.length
      ? Math.max(...out.map((q) => q.cells.filter((x) => set.has(key(x))).length / Math.min(q.cells.length, p.length)))
      : 0;
    if (!out.length || share <= MAX_SHARE) out.push({ cells: p, share });
    for (const x of p) penalty[key(x)] += 6;
  }
  return out;
}

const CHAIN = WAYPOINTS.length
  ? [START, ...WAYPOINTS, END]
  : [START, ...usable.map((s) => s.cell), END];

const legs = [];
for (let i = 0; i < CHAIN.length - 1; i++) {
  const fromId = i === 0 ? 'start' : (usable[i - 1]?.id ?? `w${i}`);
  const toId = i === CHAIN.length - 2 ? 'end' : (usable[i]?.id ?? `w${i + 1}`);
  legs.push({ from: fromId, to: toId, alts: legRoutes(CHAIN[i], CHAIN[i + 1], ROUTES) });
}

// Whole-journey routes, for the report only: the default is every leg's first
// alternative, and the count of genuinely distinct journeys is the product of
// the per-leg alternative counts.
const routes = legs.length
  ? [{ cells: legs.flatMap((l, i) => (i ? l.alts[0].cells.slice(1) : l.alts[0].cells)), share: 0 }]
  : [];

/* ------------------------------------------------- simplify + measure */
const simplify = (cells) => {
  const out = [cells[0]];
  for (let i = 1; i < cells.length - 1; i++) {
    const [px, py] = out[out.length - 1], [cx, cy] = cells[i], [nx, ny] = cells[i + 1];
    // keep only the cells where the direction changes
    if ((cx - px) * (ny - cy) !== (cy - py) * (nx - cx)) out.push(cells[i]);
  }
  out.push(cells[cells.length - 1]);
  return out;
};
const length = (cells) => cells.slice(1).reduce((n, c, i) =>
  n + Math.hypot(c[0] - cells[i][0], c[1] - cells[i][1]), 0);

console.log(`\nmap ${C}x${R} — road runs rows ${firstRow} to ${lastRow}`);
console.log(`start ${START}  end ${END}`);

console.log('\nfocal points, read from the document:');
for (const s of stops) {
  if (s.missing) { console.log(`  ${s.id.padEnd(12)} NOT MARKED`); continue; }
  console.log(`  ${s.id.padEnd(12)} ${s.name.padEnd(14)} anchor c${s.anchor[0]} r${s.anchor[1]}`
    + (s.cell ? `  -> road cell c${s.cell[0]} r${s.cell[1]} (${s.roadDist} tiles away)`
              : '  *** NO ROAD WITHIN 12 TILES ***'));
}
if (missing.length) {
  console.log(`\n  ${missing.length} of 7 not marked: ${missing.map((s) => s.id).join(', ')}`);
  console.log('  Mark them in the editor (select a building -> Focal pt) and run again.');
}

console.log(`\nlegs, each with its own alternatives (overlap cap ${MAX_SHARE}):\n`);
let journeys = 1;
const payload = legs.map((l) => {
  journeys *= Math.max(1, l.alts.length);
  const alts = l.alts.map((a, i) => {
    const poly = simplify(a.cells);
    const len = length(a.cells);
    console.log(`  ${(l.from + ' -> ' + l.to).padEnd(26)} alt ${i + 1}: `
      + `${String(a.cells.length).padStart(4)} cells, ${len.toFixed(1).padStart(6)} tiles, `
      + `${String(poly.length).padStart(3)} points`
      + (i ? `, shares ${(a.share * 100).toFixed(0)}%` : '  (default)'));
    return { id: `${l.from}-${l.to}-${i + 1}`, length: +len.toFixed(2), points: poly };
  });
  return { from: l.from, to: l.to, alts };
});

if (legs.length) {
  const total = length(routes[0].cells);
  console.log(`\n  default journey: ${total.toFixed(1)} tiles across ${legs.length} legs`);
  console.log(`  distinct journeys available: ${journeys.toLocaleString()}`
    + ` (product of the per-leg alternatives)`);
}

if (OUT) {
  if (missing.length) {
    console.error(`\nREFUSING TO WRITE: ${missing.length} focal point(s) unmarked. `
      + `A route file missing a stop is worse than no route file — it looks complete.`);
    process.exit(1);
  }
  writeFileSync(OUT, JSON.stringify({ cols: C, rows: R,
    stops: stops.map((s) => ({ id: s.id, anchor: s.anchor, cell: s.cell })),
    legs: payload }, null, 1));
  console.log(`\nwritten to ${OUT}`);
} else {
  console.log('\n(dry run — pass --out=<file> to write)');
}
