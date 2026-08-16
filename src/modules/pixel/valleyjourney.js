/**
 * The valley as something the walk can drive.
 *
 * `walk.js` was written against the first map and takes four things from
 * `journey.js`: STOPS with a distance along the path, PATH_LENGTH, pointAt(d)
 * and regionAt(row). This supplies the same four from the valley — but from the
 * DOCUMENT, not from a polyline written in source.
 *
 * ── WHY THE DOCUMENT ──────────────────────────────────────────────────────
 * The map and its routes are both hand-authored now. `valley.js` still carries a
 * `PATH` array and a `row`/`side` per stop, and both are stale: the road has been
 * repainted, the map grew twenty-four rows, and the seven buildings have been
 * moved. The only current truth is `public/assets/pixel/valley-map.json` —
 * terrain, objects, the hand-drawn routes, the start and end cells, and a `stop`
 * id on each of the seven focal buildings.
 *
 * So this reads that file and derives everything from it. Nothing here is
 * written down twice.
 *
 * ── WHAT IS AND IS NOT DERIVED ────────────────────────────────────────────
 * Derived: geometry. Where the route goes, how long it is, where along it each
 * focal point falls, which chapter a row belongs to.
 *
 * Not derived: prose. The dates, role, employer and description of each stop
 * live in `valley.js`'s STOPS and are joined on the `stop` id. Geometry changes
 * every time the map is edited; the CV does not.
 *
 * ── MULTIPLE ROUTES ───────────────────────────────────────────────────────
 * The document can hold several routes, all visiting the same seven focal points
 * in the same order. Each is measured independently, so `STOPS[i].at` means
 * "distance along THIS route" and changes when the route changes. `setRoute()`
 * swaps which one is live and re-measures; everything downstream reads the same
 * four exports and does not need to know a swap happened.
 */

import { TILE, loadAll, VALLEY_GRADE, REGIONS,
  STOPS as STOP_COPY } from './valley.js';
import { renderDoc, deserialise } from './valleydoc.js';
import { SHEETS as CF_SHEETS } from './cutefantasy.js';
import { gradeSheets } from './recolour.js';

const MAP_URL = '/assets/pixel/valley-map.json';

/** Terrain ids a person can stand on: path, bridge and the two desert pavings. */
export const ROAD_IDS = new Set([1, 6, 10, 11]);

let doc = null;
let routes = [];
let active = null;

/** Is this cell road? The one place the walkable test is written down. */
export const isRoad = (c, r) => !!doc
  && c >= 0 && r >= 0 && c < doc.cols && r < doc.rows
  && ROAD_IDS.has(doc.terrain[r * doc.cols + c]);

/* ---------------------------------------------------------- NOT re-centred

   A pass used to live here that resampled each route every half tile and slid
   the samples to the middle of the road, on the assumption that a line drawn by
   clicking cells would hug whichever edge was clicked.

   It was removed because the assumption was wrong, and measuring said so:
   against a continuous edge-distance metric the hand-drawn route sits a median
   of 0.03 tiles off the centre of its road. It was already centred. The pass
   changed the mean from 0.45 to 0.47 and the worst case from 1.80 to 2.12 — it
   made things slightly worse, and resampling ~350 tiles of route into ~700
   points also re-parameterised arc length, which is what made the scroll feel
   wrong.

   What actually put the walker off the road was a coordinate-convention bug, one
   file down in pointAt: journey.js returns raw cell indices and walk.js adds the
   half tile itself, so returning a pre-centred point applied it twice.

   Left as a note rather than deleted silently, because "centre the route on the
   road" is an obvious idea that will occur to the next person too.
*/

/* ------------------------------------------------------------------ geometry
   A route is stored as corners. Everything the walk asks for is a position at a
   distance, so each route is measured once into cumulative arc lengths and then
   answered by binary search. */
function measure(points) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len === 0) continue;                 // a doubled corner has no direction
    seg.push({ a, b, len, from: total });
    total += len;
  }
  return { seg, total };
}

/** Position at distance `d` along the live route, in TILES. */
export function pointAt(d) {
  if (!active || !active.seg.length) return { x: 0, y: 0, dir: 'down' };
  const t = Math.max(0, Math.min(active.total, d));
  let lo = 0, hi = active.seg.length - 1;
  while (lo < hi) {                          // last segment starting at or before t
    const mid = (lo + hi + 1) >> 1;
    if (active.seg[mid].from <= t) lo = mid; else hi = mid - 1;
  }
  const s = active.seg[lo];
  const k = (t - s.from) / s.len;
  /**
   * CELL INDICES, NOT CENTRES. journey.js returns raw cell coordinates and
   * walk.js does the centring itself:
   *
   *     feetX = p.x * TILE + TILE / 2      // middle of the cell
   *     feetY = p.y * TILE + TILE          // bottom of the cell
   *
   * Returning a pre-centred point here adds that half-tile twice, and the walker
   * is drawn half a tile right and half a tile down of the route he is meant to
   * be on. On a road three tiles wide that is the difference between the middle
   * and the verge — which is exactly how it looked.
   */
  const x = s.a[0] + (s.b[0] - s.a[0]) * k;
  const y = s.a[1] + (s.b[1] - s.a[1]) * k;
  const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
  const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left')
                                          : (dy > 0 ? 'down' : 'up');
  return { x, y, dir };
}

export let PATH_LENGTH = 0;
export let STOPS = [];

/** Which chapter a map row belongs to. */
export function regionAt(row) {
  return REGIONS.find((g) => row >= g.rows[0] && row < g.rows[1]) || REGIONS[REGIONS.length - 1];
}

/* ------------------------------------------------------------- focal points
   A focal point is a BUILDING, and the route passes it rather than landing on
   it. Its distance is therefore the point of nearest approach — sampled along
   the route, because the nearest point can fall in the middle of a segment and
   not at a corner. */
function measureStops(route, marked) {
  const out = [];
  for (const copy of STOP_COPY) {
    const o = marked.find((m) => m.stop === copy.id);
    if (!o) continue;
    let best = Infinity, at = 0;
    const step = 0.25;
    for (let d = 0; d <= route.total; d += step) {
      const p = pointAt(d);
      const q = Math.hypot(p.x - o.c, p.y - o.r);
      if (q < best) { best = q; at = d; }
    }
    // `anchor` and not `cell`: journey.js named it that, and the rail in
    // experience.js reads s.anchor[1] to decide which chapter a stop sits in.
    // The adapter exists to satisfy the existing contract, not to rename it.
    out.push({ ...copy, at: +at.toFixed(2), near: +best.toFixed(2), anchor: [o.c, o.r] });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Make `id` the live route and re-measure everything against it. */
export function setRoute(id) {
  const r = routes.find((x) => x.id === id) || routes[0];
  if (!r) return null;
  active = r;
  PATH_LENGTH = r.total;
  STOPS = measureStops(r, doc.objects.filter((o) => o.stop));
  return r;
}

export const listRoutes = () => routes.map((r) => ({ id: r.id, name: r.name, length: r.total }));
export const activeRoute = () => (active ? { id: active.id, name: active.name } : null);

/* ------------------------------------------------------------------- loading */
let loading = null;

export function load() {
  if (loading) return loading;
  loading = fetch(MAP_URL, { cache: 'no-cache' })
    .then((r) => { if (!r.ok) throw new Error(`valley-map.json ${r.status}`); return r.text(); })
    .then((text) => {
      doc = deserialise(text);
      routes = (doc.routes || [])
        .filter((r) => r.points && r.points.length >= 2)
        .map((r) => ({ id: r.id, name: r.name, points: r.points, ...measure(r.points) }));
      if (!routes.length) throw new Error('valley-map.json has no usable route');
      setRoute(routes[0].id);
      return { doc, routes: listRoutes(), stops: STOPS.length };
    });
  return loading;
}

/** The scene, ready for walk.js to blit. Same shape buildScene() returns. */
export function buildScene() {
  if (!doc) throw new Error('valleyjourney.load() must resolve first');
  return { scene: renderDoc(doc), cols: doc.cols, rows: doc.rows };
}

/**
 * Sheets: the valley's own, graded, plus the hero.
 *
 * The valley sheet list has no character in it — it was written to draw a map,
 * and the walking figure belongs to the walk. Its eight sheets are pulled from
 * the first map's list rather than copied here, so there is still one place
 * where the hero's files are named.
 *
 * They are merged AFTER grading and are deliberately ungraded. VALLEY_GRADE
 * rotates greens to amber to give the map its autumn; run over the hero it
 * would tint his clothes to match the trees. (`gradeSheets` only touches keys
 * the spec names, so this is belt and braces — but the ordering makes the
 * intent explicit rather than accidental.)
 */
const heroSheets = () => {
  const urls = Object.entries(CF_SHEETS).filter(([k]) => k.startsWith('hero'));
  const out = {};
  return Promise.all(urls.map(([k, url]) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { out[k] = img; res(); };
    img.onerror = () => rej(new Error(`hero sheet failed: ${url}`));
    img.src = url;
  }))).then(() => out);
};

export const loadSheets = () => Promise.all([loadAll(), heroSheets()])
  .then(([raw, hero]) => ({ ...gradeSheets(raw, VALLEY_GRADE), ...hero }));

export { TILE, REGIONS };
