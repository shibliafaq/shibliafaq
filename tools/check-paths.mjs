/**
 * Check the hand-drawn routes, and export them for the walk.
 *
 * WHY CHECKED AND NOT SEARCHED
 * ----------------------------
 * The first version of this searched the painted road with Dijkstra and
 * produced three plausible routes. It was replaced because a searched route is
 * only ever the CHEAPEST way across the road, and a journey through someone's
 * career is not a shortest-path problem — the interesting route is the one that
 * goes past the right things, and no cost function knows which those are.
 *
 * So the routes are drawn by hand in the editor, and this checks them. Authoring
 * by hand, verifying by machine: the same split that stopped buildings ending up
 * in the river.
 *
 * WHAT IT CHECKS, AND WHY EACH ONE EXISTS
 *   start / end set          without them there is no journey, only line segments
 *   >= 2 points              one point is a dot, not a route
 *   every segment on road    points are corners and the walk runs STRAIGHT
 *                            between them, so a segment can cross a river even
 *                            when both of its endpoints are on the road. This is
 *                            the check that catches it.
 *   begins at start,
 *     ends at end            every alternative is a whole journey, not a fragment
 *   passes every focal pt    the seven are constant across every route — that is
 *                            the whole premise
 *   in chronological order   a route may wander, but it may not deliver 2021
 *                            before 2018. This is the check that matters most and
 *                            the one a human eye will not catch on a 164-row map.
 *
 * USAGE
 *   node tools/check-paths.mjs
 *   node tools/check-paths.mjs --out=public/assets/pixel/valley-paths.json
 *   node tools/check-paths.mjs --near=6     # how close a route must pass a focal point
 */

import { readFileSync, writeFileSync } from 'node:fs';

const MAP = 'public/assets/pixel/valley-map.json';
const ROAD = new Set([1, 6, 10, 11]);            // PATH, BRIDGE, DROAD, DPAVE
const SPEC_ORDER = ['barch', 'chadda', 'metarch1', 'jaiswal', 'medicfibers', 'metarch2', 'kfupm'];

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const NEAR = +arg('near', 6);
const ENDS = +arg('ends', 4);
const OUT = arg('out', null);

const doc = JSON.parse(readFileSync(MAP, 'utf-8'));
const { cols: C, rows: R } = doc;
const road = (c, r) => c >= 0 && r >= 0 && c < C && r < R && ROAD.has(doc.terrain[r * C + c]);
const routes = doc.routes || [];

/** Cells a straight run between two corners actually passes through. */
function walkSegment(a, b) {
  const out = [];
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  if (!steps) return [[a[0], a[1]]];
  for (let i = 0; i <= steps; i++) {
    out.push([Math.round(a[0] + (b[0] - a[0]) * i / steps),
              Math.round(a[1] + (b[1] - a[1]) * i / steps)]);
  }
  return out;
}
const routeCells = (pts) => pts.slice(1).reduce((acc, p, i) => {
  const seg = walkSegment(pts[i], p);
  acc.push(...(acc.length ? seg.slice(1) : seg));
  return acc;
}, []);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const length = (cells) => cells.slice(1).reduce((n, c, i) => n + dist(c, cells[i]), 0);

/* ------------------------------------------------------------ focal points */
const marked = doc.objects.filter((o) => o.stop);
const stops = SPEC_ORDER.map((id) => {
  const o = marked.find((x) => x.stop === id);
  return o ? { id, name: o.name, cell: [o.c, o.r] } : { id, missing: true };
});
const haveStops = stops.filter((s) => !s.missing);

console.log(`\nmap ${C}x${R} — ${doc.objects.length} objects`);
console.log(`start ${doc.start ? doc.start.join(',') : '— NOT SET —'}`
  + `   end ${doc.end ? doc.end.join(',') : '— NOT SET —'}`);
console.log(`focal points marked: ${haveStops.length}/7`
  + (haveStops.length < 7 ? `  missing ${stops.filter((s) => s.missing).map((s) => s.id).join(', ')}` : ''));

const problems = [];
if (!doc.start) problems.push('start is not set');
if (!doc.end) problems.push('end is not set');
for (const s of stops) if (s.missing) problems.push(`focal point ${s.id} is not marked`);
if (!routes.length) problems.push('no routes drawn');

/* ------------------------------------------------------------ check each route */
console.log(`\n${routes.length} route(s):\n`);
const payload = [];
for (const rt of routes) {
  const bad = [];
  if (rt.points.length < 2) {
    console.log(`  ${rt.name}: only ${rt.points.length} point(s) — not a route`);
    problems.push(`${rt.name} has fewer than 2 points`);
    continue;
  }
  const cells = routeCells(rt.points);

  // every cell of every straight run must be road
  const offRoad = cells.filter(([c, r]) => !road(c, r));
  if (offRoad.length) bad.push(`${offRoad.length} cells off-road (first at ${offRoad[0]})`);

  // endpoints
  if (doc.start && dist(cells[0], doc.start) > ENDS)
    bad.push(`starts ${dist(cells[0], doc.start).toFixed(1)} tiles from START`);
  if (doc.end && dist(cells[cells.length - 1], doc.end) > ENDS)
    bad.push(`ends ${dist(cells[cells.length - 1], doc.end).toFixed(1)} tiles from END`);

  // focal points: nearest approach, and the order they are met in
  const hits = [];
  for (const s of haveStops) {
    let bd = Infinity, bi = -1;
    cells.forEach((cell, i) => { const d = dist(cell, s.cell); if (d < bd) { bd = d; bi = i; } });
    hits.push({ id: s.id, at: bi, d: +bd.toFixed(1) });
    if (bd > NEAR) bad.push(`misses ${s.id} by ${bd.toFixed(1)} tiles`);
  }
  const order = hits.slice().sort((a, b) => a.at - b.at).map((h) => h.id);
  const wanted = haveStops.map((s) => s.id);
  const ordered = order.join() === wanted.join();
  if (!ordered) bad.push(`visits out of order: ${order.join(' -> ')}`);

  const len = length(cells);
  console.log(`  ${rt.name.padEnd(12)} ${String(rt.points.length).padStart(3)} points, `
    + `${cells.length} cells, ${len.toFixed(1)} tiles  ${bad.length ? 'FAIL' : 'ok'}`);
  for (const h of hits) console.log(`      ${h.id.padEnd(12)} nearest ${String(h.d).padStart(5)} tiles at cell ${h.at}`);
  for (const b of bad) console.log(`      ! ${b}`);
  if (bad.length) problems.push(`${rt.name}: ${bad.join('; ')}`);

  payload.push({ id: rt.id, name: rt.name, length: +len.toFixed(2), points: rt.points,
    stops: hits.map((h) => ({ id: h.id, at: h.at })) });
}

/* ------------------------------------------------------------------- verdict */
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
} else {
  console.log('\nall routes pass: on-road, start to end, all seven focal points in order.');
}

if (OUT) {
  if (problems.length) {
    console.error('\nREFUSING TO WRITE while any check fails — a route file that looks '
      + 'complete and skips a stop is worse than no file at all.');
    process.exit(1);
  }
  writeFileSync(OUT, JSON.stringify({ cols: C, rows: R, start: doc.start, end: doc.end,
    stops: stops.map((s) => ({ id: s.id, cell: s.cell })), routes: payload }, null, 1));
  console.log(`\nwritten to ${OUT}`);
} else {
  console.log('\n(check only — pass --out=<file> to write)');
}
