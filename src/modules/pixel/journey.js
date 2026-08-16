/**
 * The Experience & Education journey — regions, path, settlements and events.
 *
 * Ordered oldest to newest so scrolling down means moving forward in time and
 * arriving at the present. The DOM list in index.html stays newest-first for
 * the fallback; only the map reverses.
 *
 * The single-column timeline could not express that the B.Arch (2016-2021)
 * *contains* three of the internships and overlaps the Medicfibers job — it had
 * to render them as a queue, which is simply wrong. On a map they cluster by
 * place and era instead, which is the whole reason this section became a map.
 *
 * ── THE FACING RULE ──────────────────────────────────────────────────────
 * Cute Fantasy and the Pixel Crawler wall/roof parts only draw a FRONT
 * elevation facing the bottom of the screen. So "doors face the approach"
 * (HANDOFF §9.9 rule 3) becomes a hard geometric constraint: every shared space
 * must lie SOUTH of the buildings fronting it. Buildings range along a yard's
 * north edge, or sit flush to its east/west edge with their front row level
 * with the yard's bottom. Nothing is ever placed south of a yard facing away
 * from it — a cluster's fourth side is closed with fences or decor, never with
 * a building's back. The walker travels top-to-bottom, so he sees a façade the
 * whole time he is inside a cluster.
 *
 * ── ANCHORS ──────────────────────────────────────────────────────────────
 * Every `anchor: [col,row]` is a BOTTOM-LEFT anchor in tiles, matching
 * Scene.sprite(name, cx, cy), which draws at cy*TILE - h + TILE. So anchor
 * [10,12] with footprint [10,7] occupies cols 10..19, rows 6..12 — row 12 being
 * the façade. Footprints are the full drawn box including roof overhang.
 *
 * The previous version derived building positions from `pointAt(stop.at) +
 * side*6`. That is exactly what produced the scatter the user rejected: an
 * offset from a path can only make beads on a string, never a settlement.
 * Positions are now explicit.
 */

export const MAP_COLS = 34;
export const MAP_ROWS = 104;

/* ============================================================
   REGIONS — the four chapters, top to bottom.

   `masses` is the only way vegetation gets placed. Each is a named rectangle
   with a fill, resolved by a spatial hash rather than by a random walk over the
   whole region — uniform rnd() scatter is precisely what made the first
   composition read as noise (HANDOFF §9.9 rule 7).
   ============================================================ */
export const REGIONS = [
  {
    id: 'mesra', rows: [0, 38],
    label: 'Mesra · Ranchi', years: '2016 – 2021', chapter: 'The student years',
    ground: 'grass',
    barrier: 'campus gate — cliff across rows 1-2, 3-tile opening at cols 5-7',
    landmark: 'the BIT academic block, 10×7, the widest roof in the region',
    masses: [
      { id: 'top-forest',   rect: [0, 0, 34, 4],   fill: 0.85, skipCols: [4, 8] },
      { id: 'grove-ne',     rect: [24, 4, 10, 11], fill: 0.55 },
      { id: 'grove-w',      rect: [0, 14, 5, 8],   fill: 0.45 },
      { id: 'corridor-w',   rect: [0, 18, 12, 5],  fill: 0.60 },
      { id: 'corridor-e',   rect: [24, 18, 10, 5], fill: 0.60 },
      { id: 'margin-w',     rect: [0, 23, 8, 14],  fill: 0.35 },
      { id: 'margin-e',     rect: [28, 23, 6, 14], fill: 0.35 },
    ],
    // The one tree inside the town clearing. A clearing with nothing in it
    // reads as an empty lot; a clearing with one tree reads as a village green.
    singles: [{ kind: 'tree', at: [21, 24] }],
  },
  {
    id: 'delhi', rows: [38, 64],
    label: 'New Delhi', years: '2021 – 2022', chapter: 'The city',
    ground: 'grass',
    barrier: 'river gorge — full-width water rows 38-40, bridge at cols 12-14',
    landmark: 'the wall tower, 4×11 — dominant by height, not spread',
    // Zero trees inside the wall (rows 44-60). That absence is what makes the
    // region read as paved, and it is the sharpest contrast on the map.
    masses: [
      { id: 'belt-w', rect: [0, 61, 8, 4],  fill: 0.40 },
      { id: 'belt-e', rect: [26, 61, 8, 4], fill: 0.40 },
    ],
    willows: { rows: [41, 42], cols: [0, 3, 6, 9, 16, 19, 22, 25, 28, 31] },
    fields: [[0, 61, 9, 4], [26, 61, 8, 4]],
  },
  {
    id: 'ranchi', rows: [64, 80],
    label: 'Ranchi', years: '2022 – 2025', chapter: 'Practice',
    ground: 'grass',
    barrier: 'tree line — dense conifer band rows 64-66, 3-tile gap at cols 23-25',
    landmark: 'the Metarch studio, 8×6 — metarch1 grown, same materials',
    masses: [],
    // Every tree here is either the barrier or a hedgerow. Nothing free-standing.
    hedgerows: [{ col: 12, rows: [67, 74] }, { col: 26, rows: [67, 72] }],
    orchard: { cols: [28, 30, 32], rows: [77, 79] },
    fields: [[0, 66, 12, 8], [27, 66, 7, 6], [14, 77, 11, 2], [0, 78, 11, 2]],
  },
  {
    id: 'dhahran', rows: [86, 104],
    label: 'Dhahran · Saudi Arabia', years: '2025 – 2026', chapter: 'Research',
    ground: 'beach',
    barrier: 'the sea and the causeway — water rows 80-86, bridge at cols 12-14',
    landmark: 'KFUPM main block, 12×8 — the widest roof on the map',
    masses: [
      { id: 'margin-w', rect: [0, 91, 6, 13],  fill: 0.06, kind: 'decor' },
      { id: 'margin-e', rect: [28, 91, 6, 13], fill: 0.06, kind: 'decor' },
    ],
    // Formal planting only. The contrast with the organic clusters above is the
    // point — this is an institution in a desert, not a village.
    palms: { row: 103, cols: [8, 12, 16, 20, 24, 28] },
    gatePalms: [[10, 92], [16, 92]],
    rocks: [[0, 91, 7, 2], [27, 91, 7, 2]],
  },
];

/** The sea crossing, and the single causeway over it. */
export const SEA = { row: 80, height: 6 };
export const CAUSEWAY = { cols: [12, 14], rows: [79, 87] };

/* ============================================================
   PATH — axis-aligned throughout; `segments()` measures Manhattan length.
   Two bends per region at most. The long col-13 run (rows 26-56) is what
   carries the river crossing and the city gate without zigzagging.
   ============================================================ */
export const PATH = [
  [6, 0], [6, 17],        // ── Mesra: in through the campus gate
  [20, 17], [20, 26],     //    across the quad, down to the town
  [13, 26], [13, 56],     //    the long run: forest, river, city gate
  [24, 56], [24, 76],     // ── Delhi plaza, then south
  [13, 76], [13, 102],    // ── Ranchi yard, then the causeway
  [23, 102],              // ── Dhahran plaza
];

/**
 * Paved areas beyond the 3-wide spine. These are what make the road *serve*
 * the settlements rather than run past them (§9.9 rule 2) — a village is a
 * shared surface with buildings around it, not a track with buildings beside it.
 * Blob the union in one pass so the nine-slice gives every plaza real edges.
 */
export const PAVED = [
  { id: 'quad',         rect: [10, 13, 12, 4] },
  { id: 'hostel-apron', rect: [1, 13, 6, 2] },
  { id: 'town-apron',   rect: [13, 25, 8, 2] },
  { id: 'forecourt',    rect: [15, 34, 7, 3] },
  { id: 'forecourt-spur', rect: [13, 35, 3, 1] },
  { id: 'gate-street',  rect: [12, 46, 3, 5] },
  { id: 'delhi-plaza',  rect: [4, 52, 25, 5] },
  { id: 'ranchi-yard',  rect: [12, 72, 12, 4] },
  { id: 'barn-spur',    rect: [11, 76, 2, 2] },
  { id: 'kfupm-plaza',  rect: [14, 100, 16, 3] },
];

/* ============================================================
   BUILDINGS

   `walls` and `roof` name parts of the Pixel Crawler modular sheets, so the
   seven read as seven different institutions rather than one cottage repeated.
   metarch1 and metarch2 deliberately share a vocabulary and differ only in
   size — the return reads as a return without needing a label.
   ============================================================ */

/** The seven events. Each carries a card; `at` is its distance along PATH. */
export const STOPS = [
  {
    id: 'barch', at: 25, anchor: [9, 12], footprint: [16, 7], premade: 'instAcademic',
    walls: 'plaster', roof: 'wood',
    period: 'Jul 2016 – Jun 2021',
    role: 'Bachelor of Architecture (B.Arch.) — First Class with Distinction',
    org: 'Birla Institute of Technology (BIT), Mesra · Ranchi, India',
    note: 'CGPA 7.61/10. Thesis: Twin Tower Complex — Mixed-Use Net-Zero Energy High-Rise. Vice President of the Student Society of Architecture.',
  },
  {
    id: 'chadda', at: 45, anchor: [6, 25], footprint: [7, 7], premade: 'offManor2',
    walls: 'log', roof: 'wood',
    period: 'May 2018 – Jun 2018',
    role: 'Architectural Intern',
    org: 'Chadda and Associates · Ranchi, India',
    note: 'Floor plans, sections, elevations and structural drawings for municipal permitting and private development.',
  },
  {
    id: 'metarch1', at: 56, anchor: [16, 36], footprint: [7, 9], premade: 'offCottage',
    walls: 'timber', roof: 'shingle',
    period: 'May 2019 – Jun 2019',
    role: 'Architectural Intern',
    org: 'Metarch Studios · Ranchi, India',
    note: 'Measured drawings, construction documentation and 2D/3D CAD renderings for residential interiors and exteriors.',
  },
  {
    // 76, not the 72 originally proposed: at 72 the walker stands level with
    // this façade rather than south of it, which breaks the facing rule above.
    id: 'jaiswal', at: 76, anchor: [5, 51], footprint: [7, 7], premade: 'offManor3',
    walls: 'brick', roof: 'slate',
    period: 'Jan 2021 – May 2021',
    role: 'Architectural Intern',
    org: 'Jaiswal & Associates · New Delhi, India',
    note: '3D models, photorealistic renderings and drawing sets for 10+ projects. Designed the signature structure for MS Dhoni’s organic farm retail kiosk.',
  },
  {
    id: 'medicfibers', at: 88, anchor: [22, 54], footprint: [7, 7], premade: 'offManor1',
    walls: 'glazed', roof: 'slate',
    period: 'May 2021 – Apr 2022',
    role: 'Graphic Designer',
    org: 'Medicfibers · New Delhi, India',
    note: 'Investment pitch decks and brand assets for capital funding campaigns. Grew audience engagement 3× and brand visibility 40%.',
  },
  {
    id: 'metarch2', at: 114, anchor: [12, 71], footprint: [11, 9], premade: 'offLshape',
    walls: 'timber', roof: 'shingle',
    period: 'Mar 2022 – Aug 2025',
    role: 'Project Architect',
    org: 'Metarch Studios · Ranchi, India',
    note: 'Led a $720K portfolio across commercial, educational and residential work. 100% on-time delivery, change orders down 8%, drawing speed up 15%.',
  },
  {
    id: 'kfupm', at: 150, anchor: [15, 99], footprint: [15, 7], premade: 'instResearch',
    walls: 'pale', roof: 'flat',
    period: 'Aug 2025 – Aug 2026 (Expected)',
    role: 'MSc Researcher · Smart & Sustainable Cities',
    org: 'King Fahd University of Petroleum & Minerals (KFUPM) · Dhahran, KSA',
    note: 'GPA 4.0/4.0. Thesis: Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting and Mitigation.',
  },
];

/**
 * Buildings that are not events. Eleven against seven — roughly the ratio the
 * references run, and the single biggest difference between a place and a menu.
 * No card, no `at`; they exist to give each cluster a far side.
 */
export const FILLERS = [
  { id: '_hostel',    anchor: [0, 12],  footprint: [5, 5],  walls: 'plaster', roof: 'wood' },
  { id: '_workshop',  anchor: [22, 17], footprint: [6, 5],  walls: 'timber',  roof: 'shingle' },
  { id: '_teahouse',  anchor: [16, 22], footprint: [3, 3],  walls: 'log',     roof: 'wood' },
  { id: '_shed',      anchor: [8, 34],  footprint: [3, 3],  walls: 'log',     roof: 'wood' },
  { id: '_terrace',   anchor: [1, 51],  footprint: [3, 5],  walls: 'brick',   roof: 'slate' },
  { id: '_civic',     anchor: [16, 49], footprint: [5, 6],  walls: 'plaster', roof: 'slate' },
  { id: '_tower',     anchor: [29, 52], footprint: [4, 11], walls: 'brick',   roof: 'slate' },
  { id: '_annexe',    anchor: [27, 75], footprint: [4, 4],  walls: 'timber',  roof: 'shingle' },
  { id: '_barn',      anchor: [6, 77],  footprint: [5, 4],  walls: 'timber',  roof: 'wood' },
  { id: '_gatehouse', anchor: [15, 91], footprint: [3, 3],  walls: 'pale',    roof: 'flat' },
  { id: '_wing_w',    anchor: [6, 99],  footprint: [5, 6],  walls: 'pale',    roof: 'flat' },
  { id: '_wing_e',    anchor: [30, 99], footprint: [4, 6],  walls: 'pale',    roof: 'flat' },
];

export const BUILDINGS = [...STOPS, ...FILLERS];

/**
 * Density rhythm (§9.9 rule 4), as row bands so it can be asserted rather than
 * eyeballed. Tree fill inside an OPEN band must be either >0.5 (closed forest)
 * or <0.1 (bare) — never the 0.2-0.4 middle, which is what reads as scatter.
 */
export const DENSE_BANDS = [[6, 18], [22, 36], [44, 60], [66, 77], [91, 104]];
export const OPEN_BANDS  = [[0, 5], [19, 21], [37, 43], [61, 65], [78, 90]];

/* ============================================================
   PATH GEOMETRY
   ============================================================ */

function segments() {
  const segs = [];
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x0, y0] = PATH[i];
    const [x1, y1] = PATH[i + 1];
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0); // axis-aligned throughout
    segs.push({ x0, y0, x1, y1, len, start: total });
    total += len;
  }
  return { segs, total };
}

export const { segs: SEGMENTS, total: PATH_LENGTH } = segments();

/** Position (in tiles) at distance `d` along the path, plus facing. */
export function pointAt(d) {
  const dist = Math.max(0, Math.min(PATH_LENGTH, d));
  for (const s of SEGMENTS) {
    if (dist <= s.start + s.len || s === SEGMENTS[SEGMENTS.length - 1]) {
      const t = s.len === 0 ? 0 : (dist - s.start) / s.len;
      const x = s.x0 + (s.x1 - s.x0) * t;
      const y = s.y0 + (s.y1 - s.y0) * t;
      const dir = s.y1 !== s.y0 ? (s.y1 > s.y0 ? 'down' : 'up') : (s.x1 > s.x0 ? 'right' : 'left');
      return { x, y, dir };
    }
  }
  return { x: PATH[0][0], y: PATH[0][1], dir: 'down' };
}

/** Every tile the 3-wide spine covers. Union this with PAVED for the full road. */
export function pathCells() {
  const cells = new Set();
  for (const s of SEGMENTS) {
    const steps = s.len;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round(s.x0 + (s.x1 - s.x0) * t);
      const y = Math.round(s.y0 + (s.y1 - s.y0) * t);
      // Three wide, deliberately. Narrowing this to two was tried and rejected —
      // the road reads correctly at this width. The map's pavement problem was
      // the PLAZAS, which have been shrunk instead; the road was never the fault.
      for (let dx = -1; dx <= 1; dx++) cells.add(`${x + dx},${y}`);
      for (let dy = -1; dy <= 1; dy++) cells.add(`${x},${y + dy}`);
    }
  }
  return cells;
}

/** The tiles a building occupies, from its bottom-left anchor. */
export function footprintCells(b) {
  const [c0, r1] = b.anchor;
  const [w, h] = b.footprint;
  const cells = new Set();
  for (let c = c0; c < c0 + w; c++) for (let r = r1 - h + 1; r <= r1; r++) cells.add(`${c},${r}`);
  return cells;
}

/** Where a stop's card should point: centre of the façade, one tile above it. */
export function cardAnchor(stop) {
  const [c0, r1] = stop.anchor;
  const [w, h] = stop.footprint;
  return { col: c0 + w / 2, row: r1 - h };
}

/**
 * Deterministic spatial hash for vegetation. Same cell always gives the same
 * answer, so the world never reshuffles on reload — and unlike a sequential
 * rnd() it has no ordering, so masses can be filled independently.
 */
export function hash01(c, r) {
  const h = ((c * 73856093) ^ (r * 19349663)) >>> 0;
  return (h % 1000) / 1000;
}

export function regionAt(row) {
  return REGIONS.find((g) => row >= g.rows[0] && row < g.rows[1]) ?? null;
}
