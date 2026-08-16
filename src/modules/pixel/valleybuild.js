/**
 * Composes THE VALLEY into a Scene.
 *
 * Reads as one pass down the map, in the order the references are built:
 *   ground -> water and its banks -> cliffs -> path and clearings ->
 *   vegetation masses -> buildings -> prop aprons -> people
 *
 * The rules it enforces, each traceable to a reference (see valley.js header):
 *   - nothing is scattered by rnd(); every placement is a named mass or an
 *     explicit coordinate, resolved by a spatial hash so it is stable
 *   - vegetation comes in three sizes and is allowed to overlap itself
 *   - open grass always carries ground cover
 *   - every building gets a prop apron within two tiles of its front
 */

import {
  Scene, COLS, ROWS, REGIONS, CROSSINGS, SEA, STOPS, FILLERS,
  SPRITES, TILE, hash01, riverAt, pathCells, pathColsAt, FIELDS, WHEAT, SPURS,
  isWaterCell, waterCrossings, PATH_LENGTH as PATH_LENGTH_LOCAL, pointAt as pointAtLocal,
} from './valley.js';

const key = (c, r) => `${c},${r}`;
const inRect = ([x, y, w, h]) => (c, r) => c >= x && c < x + w && r >= y && r < y + h;

/** Tile footprint of a sprite placed by its bottom-centre cell. */
function box(name, cx, row) {
  const [w, h] = SPRITES[name];
  const tw = Math.ceil(w / TILE), th = Math.ceil(h / TILE);
  const c0 = cx - Math.floor(tw / 2);
  return { c0, c1: c0 + tw - 1, r0: row - th + 1, r1: row, tw, th };
}

/**
 * Find a column for a building at a given row.
 *
 * Buildings used to carry absolute anchors, which is how seven of them — three
 * of them milestones — ended up standing in the river: the anchors were chosen
 * against a mental picture of the water, and the water is a sine curve. Nothing
 * hand-placed can stay correct when the thing it is placed against is computed.
 *
 * So the row and the SIDE are declared and the column is searched for: every
 * legal slot is enumerated, then scored to prefer the requested side of the road
 * and, within that, the slot closest to it — because a building marooned at the
 * map edge reads as unrelated to the route, and in every reference the buildings
 * front the street.
 */
function slotsAtRow(name, row, blocked) {
  const [w] = SPRITES[name];
  const tw = Math.ceil(w / TILE);
  const half = Math.floor(tw / 2);
  const cands = [];
  for (let cx = half; cx < COLS - (tw - half - 1); cx++) {
    const b = box(name, cx, row);
    let ok = true;
    for (let c = b.c0; c <= b.c1 && ok; c++)
      for (let r = b.r0; r <= b.r1 && ok; r++) {
        if (r < 0 || c < 0 || c >= COLS || r >= ROWS) { ok = false; break; }
        if (blocked(c, r)) ok = false;
      }
    if (ok) cands.push(cx);
  }
  return cands;
}

function findSlot(name, row, side, blocked, bounds) {
  // The declared row is a preference, not a demand. A horizontal leg of the
  // path blocks every column across a band several rows deep, so a building
  // whose box straddles one has no legal slot at all — which is how seven
  // buildings, two of them milestones, silently failed to place. Walking
  // outwards from the requested row finds the nearest row that does work.
  //
  // `bounds` clamps that search to the building's own chapter. Without it the
  // relaxation is free to walk a milestone across a region boundary — which it
  // did: medicfibers is a Delhi job and drifted nine rows into the Ranchi
  // practice band, putting the right building in the wrong chapter. A visual
  // fix that breaks the chronology is not a fix.
  const [lo, hi] = bounds || [4, ROWS - 1];
  for (let d = 0; d <= 10; d++) {
    for (const row2 of d === 0 ? [row] : [row - d, row + d]) {
      if (row2 < Math.max(4, lo) || row2 > Math.min(ROWS - 1, hi)) continue;
      const cands = slotsAtRow(name, row2, blocked);
      if (!cands.length) continue;

      const pc = pathColsAt(row2);
      const px = pc.length ? pc.reduce((a, b2) => a + b2, 0) / pc.length : COLS / 2;
      cands.sort((a, b2) => {
        const sa = (side === 'W' ? a < px : a > px) ? 0 : 1;
        const sb = (side === 'W' ? b2 < px : b2 > px) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return Math.abs(a - px) - Math.abs(b2 - px);
      });
      return { cx: cands[0], row: row2 };
    }
  }
  return null;
}

/**
 * @param SceneClass  normally `Scene`. valleydoc.js passes a recording subclass
 *   so a fresh map can be captured into an editable document without this
 *   function having to know anything about editing — which keeps it the single
 *   description of how a map is composed.
 */
export function buildValley(SceneClass = Scene) {
  const scene = new SceneClass(COLS, ROWS);

  /* ---- 1. water ---------------------------------------------------------
     The river is the spine. Its banks are drawn as cliff tiles, because a hard
     stone edge is what every reference puts between water and land — a soft
     transition is the single clearest tell of a map that was not designed. */
  // Bridges are DERIVED from where the route actually meets water, so they
  // cannot disagree with it. Declared bridges are what left the road in six
  // disconnected pieces.
  const bridges = waterCrossings();
  const onBridge = (c, r) => bridges.some((b) =>
    c >= b.cols[0] && c <= b.cols[1] && r >= b.rows[0] && r <= b.rows[1]);

  const water = (c, r) => isWaterCell(c, r) && !onBridge(c, r);

  /* ---- 2. ground: one floor colour per chapter ---------------------------
     The reference gives each chapter its own ground — warm brown earth under
     the autumn town, green under the farmland, sand at the coast — and that one
     decision separates the chapters more effectively than any barrier. Painted
     as flat centre tiles, never blobbed: `path` and `beach` are both sheets
     whose EDGE tiles are drawn against something specific (grass, water), so
     nine-slicing them as a ground fill paints those edges everywhere. That is
     the same fault that ringed the old desert in blue. */
  const groundTile = { earth: 'earth', grass: 'grass', sand: 'beach' };
  const regionOfRow = (r) => REGIONS.find((g) => r >= g.rows[0] && r < g.rows[1]) || REGIONS[0];

  for (let r = 0; r < ROWS; r++) {
    const g = groundTile[regionOfRow(r).ground] || 'grass';
    for (let c = 0; c < COLS; c++) {
      scene.tile('grass', 0, 0, c, r);             // grass underneath everything
      if (g !== 'grass') scene.tile(g, 1, 1, c, r); // then the chapter's own floor
    }
  }

  /* ---- 2b. fields ---------------------------------------------------------
     Big aligned rectangles of tilled earth and crop. In the reference these do
     the work of filling open ground without it reading as empty, which is what
     the first version had no answer for. */
  const fieldCells = new Set();
  for (const rect of [...FIELDS, ...WHEAT]) {
    const [x, y, w, h] = rect;
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++)
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) fieldCells.add(key(c, r));
  }
  // Trimmed after the road is known, further down; for now the raw patches.
  scene.blob('farm', (c, r) => fieldCells.has(key(c, r)));

  // Crop rows on the tilled ground, and wheat where the reference puts wheat.
  for (const [x, y, w, h] of FIELDS)
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++)
        if (fieldCells.has(key(c, r)) && (r - y) % 2 === 0 && hash01(c, r, 21) < 0.7)
          scene.decor((c + r) % 2 ? 'wheat' : 'wheat2', c, r);
  for (const [x, y, w, h] of WHEAT)
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++)
        if (fieldCells.has(key(c, r)) && hash01(c, r, 33) < 0.85)
          scene.decor('wheat', c, r);

  scene.blob('water', water);

  const desert = REGIONS.find((g) => g.ground === 'sand');

  /* ---- 3. river banks ---------------------------------------------------
     A stone bank on both sides of every water body. Adjacency including
     diagonals was patchy — it left single-tile gaps wherever the meander turned
     — so the bank is built from the river's own centre-line instead, which
     guarantees a continuous edge down the whole length. */
  // TWO tiles wide, and drawn with the `beach` sheet rather than `cliff`.
  // Both details matter. A one-tile-wide blob has no interior, so every cell
  // resolves to a corner tile and the bank renders as a thin broken line — which
  // is exactly how it looked. And `beach` is a shoreline sheet: its nine-slice
  // edges are drawn as sand-meets-water (HANDOFF §9.8), which is the hard edge
  // every reference puts between land and water. `cliff` stays for the terraces.
  const bankCells = new Set();
  for (let r = 0; r < ROWS; r++) {
    const rv = riverAt(r);
    if (!rv) continue;
    const from = Math.round(rv.centre - rv.half);
    const to = Math.round(rv.centre + rv.half);
    for (const c of [from - 1, from - 2, to + 1, to + 2]) bankCells.add(key(c, r));
  }
  for (let c = -1; c <= COLS; c++)
    for (const r of [SEA.row - 1, SEA.row - 2, SEA.row + SEA.height, SEA.row + SEA.height + 1])
      bankCells.add(key(c, r));
  const isBank = (c, r) => bankCells.has(key(c, r)) && !water(c, r);
  // NOT blobbed as terrain. `beach` edge tiles are sand-meets-WATER, so laying
  // them on the land side paints a bright blue stripe down both banks — the same
  // trap §9.8 records for the desert. The water sheet's own nine-slice edge is
  // already the bank; this set is only used to decide where reeds and rocks go.

  /* ---- 4. cliff crossings ----------------------------------------------- */
  const cliffCells = new Set();
  for (const x of CROSSINGS.filter((k) => k.kind === 'cliff')) {
    for (let r = x.rows[0]; r <= x.rows[1]; r++)
      for (let c = -1; c <= COLS; c++) {
        if (c >= x.gap[0] && c <= x.gap[1]) continue;
        cliffCells.add(key(c, r));
      }
  }
  scene.blob('cliff', (c, r) => cliffCells.has(key(c, r)));

  /* ---- 5. the path and its clearings ------------------------------------
     Union of the 3-wide track and the named clearings, so the road WIDENS into
     each settlement instead of running past it. */
  const road = new Set(pathCells());
  // Only genuinely wet or cliffed cells are removed — and a bridged cell is not
  // wet, which is what keeps the route continuous across the water.
  for (const k of [...road]) {
    const [c, r] = k.split(',').map(Number);
    if (water(c, r) || cliffCells.has(k)) road.delete(k);
  }
  const isRoad = (c, r) => road.has(key(c, r));

  /* ---- 6. bridges -------------------------------------------------------- */
  for (const b of bridges)
    for (let r = b.rows[0]; r <= b.rows[1]; r++)
      for (let c = b.cols[0]; c <= b.cols[1]; c++) scene.tile('bridge', 1, 1, c, r, 0);

  /* ---- 7. what may be built on -------------------------------------------
     Buildings claim their own box plus a one-tile apron, and nothing else may
     be planted there. */
  const claimed = new Set();
  const claim = (name, cx, row, pad = 1) => {
    const b = box(name, cx, row);
    for (let c = b.c0 - pad; c <= b.c1 + pad; c++)
      for (let r = b.r0 - pad; r <= b.r1 + pad; r++) claimed.add(key(c, r));
  };

  // Milestones get first pick, then fillers fit around them. Anything that
  // cannot be placed is REPORTED rather than drawn somewhere wrong — a building
  // silently standing in a river is the failure this replaces.
  const placed = [];
  const unplaced = [];
  const blockedFor = (c, r) =>
    water(c, r) || isRoad(c, r) || cliffCells.has(key(c, r)) || claimed.has(key(c, r));

  for (const s of [...STOPS, ...FILLERS]) {
    const isStop = !!s.id;
    // A milestone may not leave its chapter; a filler is scenery and may roam.
    const g = REGIONS.find((x) => s.row >= x.rows[0] && s.row < x.rows[1]);
    const bounds = isStop && g ? [g.rows[0] + 6, g.rows[1] - 2] : null;
    const slot = findSlot(s.sprite, s.row, s.side, blockedFor, bounds);
    if (!slot) { unplaced.push(s.id || s.sprite); continue; }
    claim(s.sprite, slot.cx, slot.row, isStop ? 2 : 1);
    placed.push({ ...s, row: slot.row, anchor: [slot.cx, slot.row] });
  }
  const placedStops = placed.filter((p) => p.id);

  /* ---- 5b. clearings — the road WIDENS at each milestone -----------------
     Derived from where the building actually landed, not from a hardcoded rect,
     for the same reason the bridges are. */
  for (const p of placedStops) {
    const b = box(p.sprite, p.anchor[0], p.row);
    const pc = pathColsAt(p.row);
    const px = pc.length ? Math.round(pc.reduce((a, x) => a + x, 0) / pc.length) : COLS / 2;
    const from = Math.min(px, b.c0) - 1, to = Math.max(px, b.c1) + 1;
    for (let c = from; c <= to; c++)
      for (let r = p.row + 1; r <= p.row + 3; r++) {
        if (c < 0 || c >= COLS || r >= ROWS) continue;
        if (water(c, r) || cliffCells.has(key(c, r)) || claimed.has(key(c, r))) continue;
        road.add(key(c, r));
      }
  }
  scene.blob('path', isRoad);

  const free = (c, r) =>
    c >= 0 && r >= 0 && c < COLS && r < ROWS
    && !water(c, r) && !isRoad(c, r) && !claimed.has(key(c, r)) && !cliffCells.has(key(c, r));

  /**
   * Whether a sprite placed here would COVER anything it must not.
   *
   * Testing only the anchor cell was wrong and very visible: `treeAutumn` is
   * 73x126, i.e. 5 tiles wide and 8 tall, so a tree whose foot is three tiles
   * clear of a building still buries its whole façade — which is exactly what
   * happened to the academic block. The whole drawn box has to be checked, not
   * the one cell the sprite is anchored by.
   */
  const boxClear = (name, cx, cy) => {
    const [w, h] = SPRITES[name];
    const tw = Math.ceil(w / TILE), th = Math.ceil(h / TILE);
    const c0 = cx - Math.floor(tw / 2);
    for (let c = c0; c < c0 + tw; c++)
      for (let r = cy - th + 1; r <= cy; r++) {
        if (claimed.has(key(c, r))) return false;
        // Canopies may hang over a path edge, but not sit on the middle of it.
        if (isRoad(c, r) && r < cy) return false;
      }
    return true;
  };

  /* ---- 8. vegetation ----------------------------------------------------
     Masses, three sizes, allowed to overlap. The overlap is the point: in the
     references a wood is a single mass of canopies covering each other, not a
     row of separate trees. Only same-size collisions are rejected, and only
     within one tile, so clumps form. */
  const planted = [];
  const spaced = (c, r, min) => !planted.some(([pc, pr, pm]) =>
    Math.abs(pc - c) < Math.min(min, pm) && Math.abs(pr - r) < Math.min(min, pm));

  const plant = (name, c, r, min = 2) => {
    if (!free(c, r) || !spaced(c, r, min) || !boxClear(name, c, r)) return false;
    scene.sprite(name, c, r);
    planted.push([c, r, min]);
    return true;
  };

  /** A named mass: fill a rect with a species mix at a density. */
  const mass = (rect, fill, species, salt = 0, min = 2) => {
    const [x, y, w, h] = rect;
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++) {
        if (hash01(c, r, salt) >= fill) continue;
        const pick = species[Math.floor(hash01(c * 3, r * 7, salt) * species.length) % species.length];
        plant(pick, c, r, min);
      }
  };

  const AUTUMN = ['treeAutumn', 'treeAmber', 'maple3', 'maple5', 'maple7', 'maple14'];
  const CONIFER = ['conifer', 'conifer2', 'coniferSmall'];
  const SCRUB = ['bushRustLg', 'bushOliveLg', 'bushAmberLg', 'kbush2', 'kbush7', 'kbush12'];

  // Fills are high because `boxClear` rejects most candidates — a 5x8 canopy
  // near anything built simply cannot be placed. Asking for 0.5 and getting a
  // third of it is the intended behaviour; asking for 0.5 and TAKING it is what
  // buries the buildings.
  //
  // Top edge: a closed conifer wall, so the map begins by passing THROUGH
  // something (ref 5's top edge does exactly this).
  mass([0, 0, COLS, 5], 0.95, CONIFER, 1, 2);

  // Mesra woodland. The river now occupies the right third for the whole map,
  // so the woods are weighted LEFT and into the middle rather than hugging both
  // margins — a mass that would have sat on water simply never places.
  mass([0, 5, 12, 30], 0.9, AUTUMN, 2, 3);
  mass([14, 6, 10, 14], 0.6, AUTUMN, 3, 3);
  mass([12, 24, 14, 12], 0.7, AUTUMN, 4, 3);

  // Town — thinner, more scrub than canopy.
  mass([0, 36, 10, 30], 0.8, AUTUMN, 5, 3);
  mass([16, 38, 10, 24], 0.55, AUTUMN, 6, 3);
  mass([6, 62, 26, 5], 0.5, SCRUB, 7, 2);

  // The pass — a conifer line either side of the cliff gap.
  mass([0, 62, COLS, 5], 0.6, CONIFER, 8, 2);

  // Delhi — a green belt outside the built area.
  mass([0, 68, 8, 32], 0.75, AUTUMN, 9, 3);
  mass([24, 70, 8, 26], 0.5, AUTUMN, 10, 3);

  // Practice — a hedgerow dividing the fields, not free trees.
  for (let r = 104; r < 120; r += 2) plant('treeAmber', 14, r, 2);
  mass([0, 100, 8, 20], 0.75, AUTUMN, 11, 3);
  mass([26, 100, 8, 20], 0.6, AUTUMN, 12, 3);

  // Scrub along the river banks, at a smaller scale than the woods, so the
  // water edge is planted the way every reference plants it.
  mass([0, 26, COLS, 92], 0.12, SCRUB, 13, 2);

  // Dhahran gets NO trees at all.
  //
  // The obvious move is to stand conifers in as date palms, which is what the
  // old map did — and they read as pines, so the last chapter of the story looks
  // like a Nordic forest rather than the Gulf. No pack here ships a palm. Bare
  // sand with rock fields and one institution is both truer to the place and a
  // stronger contrast after four chapters of woodland: the desert reads as
  // arrival precisely because it is empty.

  /* ---- 9. ground cover ---------------------------------------------------
     The references never leave bare grass. This is the cheapest change with the
     biggest effect: tufts, flowers and stones across every open cell, at a
     density low enough to read as texture rather than as clutter. */
  const COVER = ['tuft1', 'tuft2', 'tuft3', 'flowerYellow', 'flowerWhite',
    'rockSmall', 'rocks1', 'mushroom', 'stump'];
  for (let r = 4; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!free(c, r)) continue;
      const h = hash01(c, r, 99);
      if (h >= 0.14) continue;
      const isDesert = r >= desert.rows[0];
      if (isDesert && h >= 0.05) continue;   // the desert stays sparse on purpose
      scene.decor(COVER[Math.floor(hash01(c * 5, r * 11, 42) * COVER.length) % COVER.length], c, r);
    }
  }

  // Reeds along the water line — every reference edges its water with planting.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isBank(c, r) || !free(c, r)) continue;
      if (hash01(c, r, 7) < 0.35) scene.decor('reeds', c, r);
    }
  }

  /* ---- 10. buildings ----------------------------------------------------- */
  for (const p of placed) scene.sprite(p.sprite, p.anchor[0], p.anchor[1]);

  /* ---- 11. prop aprons ---------------------------------------------------
     Two tiles in front of every focal building: a lamp either side, planters,
     a bench. In reference 1 this belt of small objects is doing more work than
     the buildings are — it is what makes somewhere look used. */
  for (const p of placedStops) {
    const b = box(p.sprite, p.anchor[0], p.row);
    const cx = p.anchor[0], cy = p.row;
    scene.decor('lamp', b.c0, cy);
    scene.decor('lamp', b.c1, cy);
    scene.decor('potRed', cx - 1, cy);
    scene.decor('potYellow', cx + 1, cy);
    if (cy + 2 < ROWS && !water(b.c0 + 2, cy + 2)) scene.sprite('benchWood', b.c0 + 2, cy + 2);
    if (cy + 2 < ROWS && !water(b.c1 - 2, cy + 2)) scene.sprite('planter', b.c1 - 2, cy + 2);
  }

  /* Fences. In every reference a fence is what turns open ground into a plot —
     they edge the fields, close the yards and line the roads. Drawn along each
     field's road-facing edge only, so they read as boundaries rather than pens. */
  for (const [x, y, w, h] of FIELDS) {
    for (let c = x; c < x + w; c++) {
      const r = y + h;
      if (r < ROWS && free(c, r)) scene.tile('fences', 1, 0, c, r, 1);
    }
  }

  /* Crates, barrels and chests at the doors. This belt of small objects is
     doing more work than the buildings in reference 1 — it is what says a place
     is used rather than drawn. */
  for (const p of placedStops) {
    const b = box(p.sprite, p.anchor[0], p.row);
    const at = (c, r, name) => {
      if (c < 0 || c >= COLS || r >= ROWS) return;
      if (water(c, r) || claimed.has(key(c, r))) return;
      scene.sprite(name, c, r);
    };
    at(b.c0 - 1, p.row, 'farmChest');
    at(b.c1 + 1, p.row + 1, 'planter');
    at(b.c0 + 1, p.row + 2, 'hedge');
  }

  // Village fittings, placed against the milestones that were actually laid
  // down rather than at fixed coordinates.
  const fit = (name, stopId, dc, dr) => {
    const p = placedStops.find((x) => x.id === stopId);
    if (!p) return;
    const c = p.anchor[0] + dc, r = p.row + dr;
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    if (water(c, r) || claimed.has(key(c, r))) return;
    scene.sprite(name, c, r);
  };
  fit('well1', 'barch', -9, 4);
  fit('well4', 'chadda', 5, 3);
  fit('mstall1', 'jaiswal', 6, 4);
  fit('mstall2', 'medicfibers', -7, 4);
  fit('mstall3', 'metarch1', 5, 3);

  /* ---- 12. people and animals -------------------------------------------
     Placed explicitly, never scattered, and never two of the same figure near
     each other — repeating one sprite around a plaza turns a crowd back into a
     texture (HANDOFF §9.10). */
  const PEOPLE = [
    ['villagerA', 13, 20], ['villagerCarry', 21, 19], ['villagerCfSide', 9, 28],
    ['villagerB', 8, 46], ['villagerHold', 12, 52], ['villagerC', 25, 60],
    ['villagerKnight', 15, 82], ['villagerMw', 11, 88], ['villagerRogue', 22, 94],
    ['villagerWizard', 20, 118], ['villagerA', 12, 114],
    ['villagerB', 18, 134], ['villagerC', 26, 134],
  ].filter(([n]) => SPRITES[n]);
  const ANIMALS = [
    ['animalChicken', 7, 50], ['animalChicken', 8, 51], ['animalSheep', 6, 112],
    ['animalCow', 13, 110], ['animalSheep', 20, 116], ['animalCow', 5, 108],
  ];
  for (const [n, c, r] of [...PEOPLE, ...ANIMALS]) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS || water(c, r)) continue;
    scene.sprite(n, c, r);
  }

  /* ---- 13. rocks and field furniture ------------------------------------ */
  for (const [n, c, r] of [
    ['rockBig', 3, 20], ['rockMid', 30, 32], ['rockSm', 5, 40],
    ['rockBig', 31, 74], ['rockMid', 2, 90], ['rockSm', 28, 106],
    ['scarecrow', 7, 106], ['scarecrow', 24, 118],
  ]) if (free(c, r)) scene.sprite(n, c, r);

  // Rock fields are the desert's only landscape. Hashed so they clump into
  // drifts rather than dotting evenly, and kept to the margins so the approach
  // to the campus stays clear.
  const ROCKS = ['rockBig', 'rockMid', 'rockSm'];
  for (let r = desert.rows[0]; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c > 5 && c < COLS - 6) continue;
      if (hash01(c, r, 55) >= 0.22 || !free(c, r)) continue;
      const pick = ROCKS[Math.floor(hash01(c * 9, r * 3, 55) * 3) % 3];
      if (spaced(c, r, 2)) { scene.sprite(pick, c, r); planted.push([c, r, 2]); }
    }
  }

  /* ---- 14. self-check ----------------------------------------------------
     Reported, not asserted: the map should still render so the fault can be
     seen, but it must never be silent. Both numbers should be zero. */
  const onWater = placed.filter((p) => {
    const b = box(p.sprite, p.anchor[0], p.row);
    for (let c = b.c0; c <= b.c1; c++)
      for (let r = b.r0; r <= b.r1; r++) if (isWaterCell(c, r)) return true;
    return false;
  }).map((p) => p.id || p.sprite);

  // Walk the route and count cells with no road under them — a connected path
  // has none.
  let gaps = 0;
  for (let d = 0; d <= PATH_LENGTH_LOCAL; d += 1) {
    const p = pointAtLocal(d);
    if (!isRoad(Math.round(p.x), Math.round(p.y))) gaps++;
  }

  return {
    scene, cols: COLS, rows: ROWS,
    treeCount: planted.length,
    ops: scene.ops.length,
    placed: placed.length,
    stops: placedStops.map((p) => ({ id: p.id, anchor: p.anchor })),
    bridges: bridges.map((b) => `${b.cols}/${b.rows}`),
    check: { unplaced, buildingsOnWater: onWater, pathGaps: gaps },
  };
}
