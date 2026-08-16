/**
 * Builds the Experience map scene — the single place the world is composed.
 *
 * Extracted from lab/journey.html so the still map and the scrolling walk cannot
 * drift apart. That has already happened once on this section: village.html and
 * journey.html each grew their own hardcoded layout, and the grade fix had to be
 * applied twice.
 *
 * Composition rules are §9.9; the region/cluster data is journey.js.
 */

import { Scene, TILE, SPRITES, inRect } from './cutefantasy.js';
import {
  REGIONS, PAVED, BUILDINGS, STOPS, SEA, CAUSEWAY,
  MAP_COLS, MAP_ROWS, pathCells, footprintCells, hash01,
} from './journey.js';

/**
 * Which sprite each building draws.
 *
 * The seven milestones now use PREMADE buildings — complete artist drawings
 * rather than anything composed from wall and roof parts. The timeline reads
 * institution → five offices → institution, so the two institutions are the
 * three-manor composites and bookend the map:
 *
 *   barch  -> instAcademic   symmetric, matching wings, calmer  (BIT Mesra)
 *   kfupm  -> instResearch   heavier stone, deeper gables       (KFUPM)
 *
 * Both share manor4 as their centre block, so they read as related without
 * being identical. The five offices are the remaining Kibyra manors and the
 * Pixel Lands houses — all complete sprites, all one art family.
 *
 * metarch1 -> offCottage and metarch2 -> offLshape: the return to Metarch is
 * the same practice grown larger, which the L-shaped building says without
 * needing a label.
 *
 * Fillers keep the small composed sprites; a shed does not warrant a manor.
 */
export const SPRITE_FOR = {
  barch: 'instAcademic', chadda: 'offManor2', metarch1: 'offCottage',
  jaiswal: 'offManor3', medicfibers: 'offManor1', metarch2: 'offLshape',
  kfupm: 'instResearch',
  _hostel: 'house', _workshop: 'houseRed', _teahouse: 'houseRed', _shed: 'stall',
  _terrace: 'house', _civic: 'houseBlue', _tower: 'house',
  _annexe: 'house', _barn: 'houseRed',
  _gatehouse: 'stall', _wing_w: 'houseBlue', _wing_e: 'house',
};

/** Different woods in different chapters — one species everywhere reads as a
    texture rather than as places. */
export const SPECIES = {
  // Kibyra maples, not the Pixel Crawler giants. The maples are 3.7 tiles tall
  // against 7.9 and come from the same pack as the buildings, so a tree is now
  // half a manor instead of taller than one. That single ratio is most of what
  // made the map read as clutter.
  // Mixed-age planting, which is both realistic and the only way to satisfy
  // both scale complaints at once. Taking the hero as a 1.7m adult, 1 tile =
  // 0.80m: the Pixel Crawler canopies are 6.3m (3.7x a person) and read as
  // mature trees; the Kibyra maples are 2.9m (1.7x) and read as young or
  // ornamental. Using only maples turned every wood into shrubs.
  mesra:   ['treeAutumn', 'kibmaple4', 'treeAmber', 'kibmaple5'],
  delhi:   ['kibmaple3', 'kibmaple14'],
  ranchi:  ['treeAmber', 'kibmaple7', 'kibmaple6'],
  dhahran: ['kibmaple3'],
};

/** Forest bands use the deepest maples rather than the Pixel Crawler canopies.
    Mixing the two packs is visible: Kibyra's maples are vivid autumn, Pixel
    Crawler's are olive-tan and twice the height, and side by side they read as
    two different games. One art family throughout, density doing the work of
    size. */
const FOREST_POOL = ['treeAutumn', 'treeAmber'];
const BIG_TREE_MASSES = /forest|corridor/;

// The Delhi river. Widened from 3 rows to 7: at 3 it read as a ditch rather
// than as the barrier the region is supposed to be entered across, and the
// bridge had nothing to span. 7 rows = 5.6m at 1 tile = 0.80m.
const RIVER = { row: 37, height: 7 };

const key = (c, r) => `${c},${r}`;
const rectCells = ([x, y, w, h]) => {
  const s = new Set();
  for (let c = x; c < x + w; c++) for (let r = y; r < y + h; r++) s.add(key(c, r));
  return s;
};
const union = (...sets) => { const o = new Set(); for (const s of sets) for (const v of s) o.add(v); return o; };

/**
 * Builds the world.
 *
 * `edit` is the overlay written by lab/editor.html — hand corrections layered
 * on top of the procedural map rather than baked into it. Keeping them as data
 * means the generator stays the source of the world and the edits stay
 * revertible; baking them in would make every future generator change a merge.
 *
 *   edit.terrain  { "c,r": 'grass'|'water'|'sand'|'road'|'field' }
 *   edit.hidden   [tag]      procedural sprites suppressed by hand
 *   edit.objects  [{ name, col, row, scale, flip, id }]
 */
export function buildScene(edit = null) {
  const COLS = MAP_COLS, ROWS = MAP_ROWS;
  const scene = new Scene(COLS, ROWS);
  scene.hidden = new Set(edit?.hidden || []);
  const paint = new Map(Object.entries(edit?.terrain || {}));

  const buildingCells = union(...BUILDINGS.map(footprintCells));

  // Road = 3-wide spine + every paved plaza, minus building footprints, or the
  // roofs sit on path tiles at their eaves.
  const roadCells = union(pathCells(), ...PAVED.map((p) => rectCells(p.rect)));
  for (const c of buildingCells) roadCells.delete(c);
  const road = (c, r) => roadCells.has(key(c, r));

  // An undulating coastline, not a rectangle. The sea was a full-width rect, so
  // grass -> sea -> sand was three straight lines stacked, which is what made
  // the whole Dhahran transition read as a seam rather than as a shore. The
  // offsets are hashed per column, so the coast is irregular but stable.
  //
  // Quantised into RUNS, not per column. Hashing every column meant the coast
  // stepped up and down on a 1-tile pitch, and a 3x3 nine-slice has no
  // inside-corner tile — so every notch resolved to a square castellation and
  // the sea rendered as a battlement wall rather than water. Holding each
  // offset across a 5-6 column run gives the blob edges long enough to draw
  // properly, and the steps then read as coves.
  const RUN_T = 5, RUN_B = 6;
  const shoreTop = (c) => {
    const b = Math.floor(c / RUN_T) * RUN_T;
    return SEA.row + (hash01(b * 5, 7) < 0.34 ? 1 : 0) + (hash01(b * 11, 3) < 0.18 ? 1 : 0);
  };
  const shoreBot = (c) => {
    const b = Math.floor(c / RUN_B) * RUN_B;
    return SEA.row + SEA.height - (hash01(b * 13, 29) < 0.34 ? 1 : 0) - (hash01(b * 17, 5) < 0.18 ? 1 : 0);
  };
  const seaCells = new Set();
  for (let c = 0; c < COLS; c++) for (let r = shoreTop(c); r < shoreBot(c); r++) seaCells.add(key(c, r));
  const causeway = (c, r) => c >= CAUSEWAY.cols[0] && c <= CAUSEWAY.cols[1]
    && r >= CAUSEWAY.rows[0] && r <= CAUSEWAY.rows[1];
  const sea = (c, r) => seaCells.has(key(c, r)) && !causeway(c, r);

  // The river gets the same undulating banks as the sea. Stripped of buildings
  // and trees it was plainly a rectangle, which is the thing that made the sea
  // read as a seam before it was fixed — a straight-edged waterway looks drawn
  // on rather than eroded.
  // Same run-quantising as the coast, and for the same reason.
  const rTop = (c) => RIVER.row + (hash01(Math.floor(c / 4) * 4 * 7, 19) < 0.38 ? 1 : 0);
  const rBot = (c) => RIVER.row + RIVER.height - (hash01(Math.floor(c / 5) * 5 * 23, 11) < 0.38 ? 1 : 0);
  const riverCells = new Set();
  for (let c = 0; c < COLS; c++) for (let r = rTop(c); r < rBot(c); r++) riverCells.add(key(c, r));
  const riverBridge = (c, r) => c >= 12 && c <= 14 && r >= RIVER.row - 1 && r <= RIVER.row + RIVER.height;
  const river = (c, r) => riverCells.has(key(c, r)) && !riverBridge(c, r);
  const water = (c, r) => sea(c, r) || river(c, r);

  // Hand corrections to the terrain. Every predicate above is a closure over
  // these Sets, so editing the Sets here re-routes the whole downstream build —
  // the nine-slice, the beaches, the tree exclusion zones — without any of it
  // needing to know the edit happened. That is the entire reason terrain is
  // stored as Sets and not as a baked tile grid.
  const sandPaint = new Set();
  for (const [k, t] of paint) {
    roadCells.delete(k); seaCells.delete(k); riverCells.delete(k);
    if (t === 'road') roadCells.add(k);
    else if (t === 'water') seaCells.add(k);
    else if (t === 'sand') sandPaint.add(k);
  }

  /* ---- ground ---- */
  scene.fillGrass();
  for (const g of REGIONS) {
    if (g.ground === 'grass') continue;
    // `beach` is a shoreline sheet — its nine-slice edges are sand-meets-water,
    // so a plain rect rings the desert in blue. Push sides and bottom off-map.
    const last = g.rows[1] >= ROWS;
    scene.blob(g.ground, inRect(-2, g.rows[0], COLS + 4, (g.rows[1] - g.rows[0]) + (last ? 4 : 0)));
  }

  const fieldCells = new Set();
  for (const g of REGIONS) for (const f of (g.fields || [])) for (const c of rectCells(f)) fieldCells.add(c);
  for (const c of buildingCells) fieldCells.delete(c);
  for (const c of roadCells) fieldCells.delete(c);
  for (const [k, t] of paint) { fieldCells.delete(k); if (t === 'field') fieldCells.add(k); }
  scene.blob('farm', (c, r) => fieldCells.has(key(c, r)));

  // Sand on both shores — the north bank as well as the desert side. Land
  // meeting open water with no beach is the other half of why it read as a cut.
  const shoreSand = (c, r) => {
    if (water(c, r) || road(c, r)) return false;
    const t = shoreTop(c), b = shoreBot(c);
    return (r >= t - 2 && r < t) || (r >= b && r < b + 2);
  };
  // NOT blob(): a strip two tiles thick is entirely nine-slice EDGE tiles, and
  // beach edges are sand-meets-water, so blobbing it painted a bright blue band
  // along both shores. The centre tile (1,1) is plain sand — that is what a
  // beach strip wants. Same trap as HANDOFF 9.8.
  for (let c = 0; c < COLS; c++)
    for (let r = SEA.row - 3; r < SEA.row + SEA.height + 3; r++)
      if (shoreSand(c, r)) scene.tile('beach', 1, 1, c, r);
  // Hand-painted sand. Plain centre tile for the same reason as the strip above.
  for (const k of sandPaint) {
    const [c, r] = k.split(',').map(Number);
    scene.tile('beach', 1, 1, c, r);
  }

  scene.blob('water', water);
  scene.blob('path', road);

  for (let r = CAUSEWAY.rows[0]; r <= CAUSEWAY.rows[1]; r++)
    for (let c = CAUSEWAY.cols[0]; c <= CAUSEWAY.cols[1]; c++) scene.tile('bridge', 1, 1, c, r, 0);
  for (let r = RIVER.row - 1; r <= RIVER.row + RIVER.height; r++)
    for (let c = 12; c <= 14; c++) scene.tile('bridge', 1, 1, c, r, 0);
  // Sand banks on the river too, same reason as the sea shore.
  for (let c = 0; c < COLS; c++)
    for (const r of [rTop(c) - 1, rTop(c) - 2, rBot(c), rBot(c) + 1])
      if (r >= 0 && r < ROWS && !water(c, r) && !road(c, r)) scene.tile('beach', 1, 1, c, r);

  scene.blob('cliff', (c, r) => (r === 1 || r === 2) && !(c >= 4 && c <= 8) && !road(c, r));

  /* ---- buildings ---- */
  for (const b of BUILDINGS) {
    const name = SPRITE_FOR[b.id] || 'house';
    const s = SPRITES[name];
    // Centre the sprite in its declared footprint: sprites differ in width and
    // the footprint is what the layout was designed around.
    const off = Math.round((b.footprint[0] - s.w / TILE) / 2);
    scene.sprite(name, b.anchor[0] + Math.max(0, off), b.anchor[1]);
  }

  /* ---- vegetation: named masses only, hashed, never scattered ---- */
  const treeCells = [];
  // Milestone buildings get a guaranteed clear apron. Each one is the whole
  // point of its stop, so nothing may be planted or placed inside this.
  const CLEAR = 2;
  const protectedCells = new Set();
  for (const b of STOPS) {
    const [c0, r1] = b.anchor, [w, h] = b.footprint;
    for (let c = c0 - CLEAR; c < c0 + w + CLEAR; c++)
      for (let r = r1 - h + 1 - CLEAR; r <= r1 + CLEAR; r++) protectedCells.add(key(c, r));
  }

  /**
   * Whether a sprite anchored at (c,r) may be placed.
   *
   * The old version tested the ANCHOR cell only, with a one-tile pad. That is
   * why trees kept covering buildings: a tree is up to 8 tiles tall and is
   * anchored at its FOOT, so one planted two tiles below a manor still threw its
   * whole canopy over the roof — the anchor was clear, the drawing was not.
   * This tests the sprite's actual drawn box in tiles.
   */
  const freeBox = (kind, c, r) => {
    const sp = SPRITES[kind];
    const w = sp ? Math.ceil(sp.w / TILE) : 1;
    const h = sp ? Math.ceil(sp.h / TILE) : 1;
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        const cc = c + dc, rr = r - dr;           // sprites grow UP from the foot
        if (cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS) return false;
        const k = key(cc, rr);
        if (buildingCells.has(k) || protectedCells.has(k)) return false;
      }
    }
    // The foot must stand on open ground.
    if (road(c, r) || water(c, r) || fieldCells.has(key(c, r))) return false;
    return true;
  };

  const freeFor = (c, r) => {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (road(c, r) || water(c, r) || fieldCells.has(key(c, r))) return false;
    if (protectedCells.has(key(c, r))) return false;
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++)
      if (buildingCells.has(key(c + dc, r + dr))) return false;
    return true;
  };
  const spaced = (c, r, min = 2) =>
    !treeCells.some(([tc, tr]) => Math.abs(tc - c) < min && Math.abs(tr - r) < min);

  const plant = (kind, c, r) => { scene.sprite(kind, c, r); treeCells.push([c, r]); };

  function plantMass(m, region) {
    const kinds = SPECIES[region.id] || ['tree'];
    const [x, y, w, h] = m.rect;
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (m.skipCols && c >= m.skipCols[0] && c <= m.skipCols[1]) continue;
        if (hash01(c, r) >= m.fill) continue;
        if (m.kind === 'decor') { if (!freeFor(c, r)) continue; scene.decor(['tuft1', 'tuft2', 'tuft3'][(c + r) % 3], c, r); continue; }
        if (!spaced(c, r)) continue;
        const pool = BIG_TREE_MASSES.test(m.id || '') ? FOREST_POOL : kinds;
        const kind = pool[Math.floor(hash01(c * 3, r * 7) * pool.length) % pool.length];
        if (!freeBox(kind, c, r)) continue;
        plant(kind, c, r);
      }
    }
  }

  for (const g of REGIONS) {
    for (const m of (g.masses || [])) plantMass(m, g);
    for (const s of (g.singles || [])) if (freeFor(...s.at)) plant(s.kind, ...s.at);
    if (g.willows) for (const c of g.willows.cols) for (const r of g.willows.rows)
      if (freeBox('kibmaple3', c, r)) plant('kibmaple3', c, r);
    if (g.hedgerows) for (const hr of g.hedgerows)
      for (let r = hr.rows[0]; r <= hr.rows[1]; r++)
        if (freeBox(r % 2 ? 'kibmaple14' : 'kibmaple6', hr.col, r)) plant(r % 2 ? 'kibmaple14' : 'kibmaple6', hr.col, r);
    if (g.orchard) for (const c of g.orchard.cols) for (const r of g.orchard.rows)
      if (freeBox('kibmaple3', c, r)) plant('kibmaple3', c, r);
    if (g.palms) for (const c of g.palms.cols) if (freeFor(c, g.palms.row)) plant('kibmaple3', c, g.palms.row);
    if (g.gatePalms) for (const [c, r] of g.gatePalms) if (freeFor(c, r)) plant('kibmaple3', c, r);
    if (g.rocks) for (const rect of g.rocks) for (const cell of rectCells(rect)) {
      const [c, r] = cell.split(',').map(Number);
      if (hash01(c, r) < 0.35 && freeFor(c, r)) scene.decor(['rocks1', 'rockSmall'][(c + r) % 2], c, r);
    }
  }

  // The tree line between Delhi and Ranchi — dense, with the road gap. Deep
  // rust maples rather than conifers: the conifers were the last Pixel Crawler
  // trees left and read as a different game beside Kibyra's autumn palette.
  // Half the height now, so the band is planted denser to still read as a wall.
  for (let r = 64; r <= 67; r++) for (let c = 0; c < COLS; c++) {
    if (c >= 23 && c <= 25) continue;
    const kind = (c + r) % 3 ? 'kibmaple14' : 'kibmaple7';
    if (!spaced(c, r, 1) || !freeBox(kind, c, r)) continue;
    plant(kind, c, r);
  }

  /* ---- population -------------------------------------------------------
     Placed explicitly, never scattered — the same discipline as the trees. A
     world map with nobody in it reads as a diagram, and the references all put
     figures mid-task rather than standing to attention. Each person is doing
     something appropriate to where they are: watering in the fields, carrying
     across the plazas, fishing at the water, harvesting by the farmland. */
  // Sixteen placements across eleven distinct characters, arranged so no two
  // people standing near each other are the same person. Repeating one sprite
  // around a plaza is the tell that turns a crowd back into a texture.
  const PEOPLE = [
    // Mesra — campus quad, then the town below it
    ['villagerA', 11, 16], ['villagerCarry', 18, 15], ['villagerC', 19, 26],
    ['villagerHold', 20, 35], ['villagerB', 13, 30],
    // Delhi — the walled plaza, the busiest place on the map
    ['villagerC', 8, 57], ['villagerB', 26, 58], ['villagerRogue', 20, 59],
    ['villagerRogue', 14, 53], ['villagerKnight', 6, 55],
    // Ranchi — a working yard and its fields
    ['villagerHold', 20, 74], ['villagerC', 6, 70], ['villagerA', 24, 73],
    // Dhahran — the causeway shore and the campus plaza
    ['villagerWizard', 20, 79], ['villagerA', 10, 102], ['villagerB', 27, 102],
  ];
  const ANIMALS = [
    ['animalChicken', 14, 76], ['animalChicken', 15, 77], ['animalSheep', 8, 72],
    ['animalCow', 5, 69], ['animalSheep', 30, 68], ['animalCow', 3, 79],
  ];
  // Props: scarecrows watching the fields they belong to, bushes softening the
  // margins where a mass of trees would be too heavy.
  const PROPS = [
    // Mesra — a village green and its well
    ['kibwell1', 10, 20], ['kibbush12', 8, 19], ['kibbush2', 22, 20],
    ['stall', 17, 30], ['kibbush7', 11, 31], ['kibpond1', 26, 32],
    ['scarecrow', 4, 71], ['scarecrow', 30, 69],
    // Delhi — the busiest plaza, so the most furniture
    ['stall', 17, 58], ['stall', 26, 55],
    ['kibbush19', 4, 53], ['kibbush12', 30, 53], ['kibbush2', 20, 61],
    // Ranchi — a working yard, a pond behind it
    ['kibpond3', 4, 76], ['kibwell1', 21, 76], ['kibbush7', 28, 74],
    // Dhahran — formal, sparse, and dry
    ['kibbush19', 30, 96],
  ];
  const ROCKS = [
    ['rockBig', 26, 8], ['rockMid', 31, 12], ['rockSm', 2, 20],
    ['rockMid', 5, 67], ['rockSm', 29, 67],
    ['rockBig', 3, 92], ['rockMid', 5, 93], ['rockBig', 30, 92], ['rockSm', 28, 93],
    ['rockMid', 2, 88], ['rockSm', 31, 89],
  ];

  // Rocks respect the same clearances as trees; people may stand on the road,
  // which is rather the point of a road.
  let placedProps = 0;
  for (const [kind, c, r] of [...ROCKS, ...PROPS])
    if (freeBox(kind, c, r)) { scene.sprite(kind, c, r); placedProps++; }
  for (const [kind, c, r] of [...PEOPLE, ...ANIMALS]) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
    if (water(c, r) || buildingCells.has(key(c, r))) continue;
    scene.sprite(kind, c, r);
  }

  // Hand-placed objects last, so an edit always wins over the generator. They
  // still y-sort with everything else — a manor dropped in front of a wood
  // occludes it correctly, which is what makes placing by hand feel safe.
  for (const o of (edit?.objects || [])) {
    const opt = { scale: o.scale || 1, flip: !!o.flip, tag: `user:${o.id}` };
    if (o.kind === 'decor') scene.decor(o.name, o.col, o.row, opt);
    else scene.sprite(o.name, o.col, o.row, opt);
  }

  return {
    scene, cols: COLS, rows: ROWS,
    treeCount: treeCells.length,
    peopleCount: PEOPLE.length + ANIMALS.length,
    rockCount: ROCKS.length,
    propCount: PROPS.length, placedProps,
  };
}
