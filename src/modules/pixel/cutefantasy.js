/**
 * Cute Fantasy (Kenmi) tileset descriptor + scene composer.
 *
 * The pack splits terrain into per-type sheets rather than one atlas, and each
 * terrain sheet is a 3x3 nine-slice blob (corners, edges, centre) laid out in
 * its top-left. So a "path" is not one tile — it is a region, and the correct
 * tile for each cell depends on its neighbours. `blob()` below does that
 * lookup, which is why paths and ponds get proper edges instead of hard squares.
 *
 * Licence: free version, non-commercial. Recorded in
 * assets/tilesets/incoming/LICENCES.md.
 */

export const TILE = 16;

const BASE = '/assets/pixel/cf';
const MIX = '/assets/pixel/mix';
const KIB = '/assets/pixel/kib';
const HERO = '/assets/pixel/hero';
const PCB = '/assets/pixel/pcb';
/** Complete buildings — Kibyra (Free-Samples) and Trislin (Pixel Lands). */
const PRE = '/assets/pixel/premade';

export const SHEETS = {
  grass: `${BASE}/grass.webp`,
  path: `${BASE}/path.webp`,
  water: `${BASE}/water.webp`,
  cliff: `${BASE}/cliff.webp`,
  beach: `${BASE}/beach.webp`,
  farm: `${BASE}/farm.webp`,
  house: `${BASE}/house.webp`,
  tree: `${BASE}/tree.webp`,
  treeSmall: `${BASE}/tree_small.webp`,
  decor: `${BASE}/decor.webp`,
  fences: `${BASE}/fences.webp`,
  bridge: `${BASE}/bridge.webp`,
  player: `${BASE}/player.webp`,

  /* The hero — FREE_Adventurer. Replaces the Cute Fantasy player, whose
     character is only 20px tall against Pixel Crawler's 30px NPCs; this one is
     34px and sits with them. Eight frames at a 96x80 pitch, one sheet per
     direction, so no mirroring is needed. Licence explicitly permits
     commercial use — the most permissive of any pack here. */
  /* Kibyra (Free-Samples). The pack the premade buildings come from, so it is
     internally in scale with them: its manors are 6.7 tiles tall and its maple
     trees 3.7 — half. The Pixel Crawler trees used until now are 7.9 tiles, as
     tall as a building, which is what made the map read as clutter. The maples
     also ship a full autumn range already (gold #f3bc3b, orange #e47010, rust),
     so they need no grading. */
  kibmaple3: `${KIB}/maple3.webp`,
  kibmaple4: `${KIB}/maple4.webp`,
  kibmaple5: `${KIB}/maple5.webp`,
  kibmaple6: `${KIB}/maple6.webp`,
  kibmaple7: `${KIB}/maple7.webp`,
  kibmaple14: `${KIB}/maple14.webp`,
  kibwell1: `${KIB}/well1.webp`,
  kibwell4: `${KIB}/well4.webp`,
  kibpond1: `${KIB}/pond1.webp`,
  kibpond3: `${KIB}/pond3.webp`,
  kibmstall1: `${KIB}/mstall1.webp`,
  kibmstall2: `${KIB}/mstall2.webp`,
  kibmstall3: `${KIB}/mstall3.webp`,
  kibbush2: `${KIB}/bush2.webp`,
  kibbush7: `${KIB}/bush7.webp`,
  kibbush12: `${KIB}/bush12.webp`,
  kibbush19: `${KIB}/bush19.webp`,

  heroIdleDown:  `${HERO}/idle_down.webp`,
  heroIdleLeft:  `${HERO}/idle_left.webp`,
  heroIdleRight: `${HERO}/idle_right.webp`,
  heroIdleUp:    `${HERO}/idle_up.webp`,
  heroRunDown:   `${HERO}/run_down.webp`,
  heroRunLeft:   `${HERO}/run_left.webp`,
  heroRunRight:  `${HERO}/run_right.webp`,
  heroRunUp:     `${HERO}/run_up.webp`,

  /* Mix-and-match set, cropped from the other packs by tools/index-atlas.mjs
     coordinates. Cute Fantasy alone has one house and one tree, which is what
     made every building and every wood identical. See §9.4/§9.10. */
  treeAutumn:   `${MIX}/tree_autumn.webp`,
  treeAmber:    `${MIX}/tree_amber.webp`,
  conifer:      `${MIX}/conifer.webp`,
  conifer2:     `${MIX}/conifer2.webp`,
  coniferSmall: `${MIX}/conifer_small.webp`,
  houseRed:     `${MIX}/house_red.webp`,
  houseBlue:    `${MIX}/house_blue.webp`,
  stall:        `${MIX}/stall.webp`,

  /* Population. A world map with nobody in it reads as a diagram — the
     references all put people mid-task. These are single frames lifted from
     Pixel Crawler's activity animations, so each figure is doing something
     rather than standing to attention. */
  rockBig:      `${MIX}/rock_big.webp`,
  rockMid:      `${MIX}/rock_mid.webp`,
  rockSm:       `${MIX}/rock_sm.webp`,
  villagerA:    `${MIX}/villager_a.webp`,
  villagerB:    `${MIX}/villager_b.webp`,
  villagerC:    `${MIX}/villager_c.webp`,
  villagerHold: `${MIX}/villager_hold.webp`,
  villagerCarry:`${MIX}/villager_carry.webp`,
  villagerRogue:`${MIX}/villager_rogue.webp`,
  villagerKnight:`${MIX}/villager_knight.webp`,
  villagerWizard:`${MIX}/villager_wizard.webp`,
  villagerCfSide:`${MIX}/villager_cf_side.webp`,
  villagerCfUp: `${MIX}/villager_cf_up.webp`,
  villagerMw:   `${MIX}/villager_mw.webp`,
  scarecrow:    `${MIX}/scarecrow.webp`,
  bushGreen:    `${MIX}/bush_green.webp`,
  bushOlive:    `${MIX}/bush_olive.webp`,
  animalChicken: `${MIX}/animal_chicken.webp`,
  animalCow:    `${MIX}/animal_cow.webp`,
  animalSheep:  `${MIX}/animal_sheep.webp`,

  /* ---- Pixel Crawler modular building kit (see pixel/building.js) --------
     Six wall materials as 96x56 continuous FRONT ELEVATIONS and two 64x47
     tileable roof faces. These are not sprites — `drawBuilding()` tiles and
     clips them to a footprint, which is what finally makes the seven milestones
     read as seven institutions instead of one cottage repeated (HANDOFF 9.6
     item 1). Rects and how they were derived: tools/pc-building-parts.json. */
  wallLog:     `${PCB}/wall_log.webp`,
  wallPlank:   `${PCB}/wall_plank.webp`,
  wallBoard:   `${PCB}/wall_board.webp`,
  wallTimber:  `${PCB}/wall_timber.webp`,
  wallPlaster: `${PCB}/wall_plaster.webp`,
  wallBrick:   `${PCB}/wall_brick.webp`,
  wallGlazed:  `${PCB}/wall_glazed4.webp`,

  /* The roofs. 127x94 gables — both slopes meeting at a central ridge, seen
     front-top-down, which is the only thing in the kit that reads as a roof
     rather than as a lid. Four roof names, two files: `slate` and `flat` are the
     brown gable regraded, which keeps the ridge and eave identical across all
     four so a street of different buildings still reads as one world. */
  gableWood:    `${PCB}/gable_wood.webp`,
  gableShingle: `${PCB}/gable_shingle.webp`,
  gableSlate:   `${PCB}/gable_wood.webp`,
  gableFlat:    `${PCB}/gable_wood.webp`,

  /* Premade buildings — complete artist sprites, not composed from parts.
     Composing a building from modular walls and roofs was tried twice and does
     not read as a building: the gable would not tile, the roof-to-wall ratio
     needed endless tuning, and every fix chased a problem that does not exist
     when the building is one finished drawing.

     The two institutions are each three Kibyra noble manors overlapped 34-36%
     and pre-composited into a single sprite — overlapped so their roofs
     interlock and they share one ground line, which is what makes three houses
     read as one institution rather than a terrace.

     Kibyra (Free-Samples): commercial use permitted.
     Trislin (Pixel Lands): "any commercial or non-commercial projects".
     Both recorded in assets/tilesets/incoming/LICENCES.md. */
  instAcademic: `${PRE}/inst_academic.webp`,
  instResearch: `${PRE}/inst_research.webp`,
  offManor1:    `${PRE}/off_manor1.webp`,
  offManor2:    `${PRE}/off_manor2.webp`,
  offManor3:    `${PRE}/off_manor3.webp`,
  offCottage:   `${PRE}/off_cottage.webp`,
  offLshape:    `${PRE}/off_lshape.webp`,
  offFarmhouse: `${PRE}/off_farmhouse.webp`,

  doorPlank:   `${PCB}/door_plank.webp`,
  doorGlazed:  `${PCB}/door_glazed.webp`,
  doorStone:   `${PCB}/door_stone.webp`,
  chimney:     `${PCB}/chimney.webp`,
  winArch:     `${PCB}/win_arch.webp`,
  winArchBlue: `${PCB}/win_arch_blue.webp`,
  winFour:     `${PCB}/win_four.webp`,

  /* Plaza dressing, and the bushes done properly. The old bushGreen/bushOlive
     are 43x91 — three of the sheet's bush cells cropped as ONE sprite, so every
     bush on the map is a stack of three — and then hue-rotated on top. The rust
     and olive columns already ARE autumn, exactly like the trees in 9.10. */
  benchWood:   `${PCB}/bench_wood.webp`,
  planter:     `${PCB}/planter.webp`,
  hedge:       `${PCB}/hedge.webp`,
  bushRustLg:  `${PCB}/bush_rust_lg.webp`,
  bushRustMd:  `${PCB}/bush_rust_md.webp`,
  bushRustSm:  `${PCB}/bush_rust_sm.webp`,
  bushOliveLg: `${PCB}/bush_olive_lg.webp`,
  bushOliveMd: `${PCB}/bush_olive_md.webp`,
  bushAmberLg: `${PCB}/bush_amber_lg.webp`,
  bushAmberMd: `${PCB}/bush_amber_md.webp`,
};

/** Multi-tile sprites, as pixel rects into their sheet. */
export const SPRITES = {
  /* Kibyra props. Rects are the MEASURED content bounding box, not the whole
     file — these sprites carry transparent padding, and anchoring to the file
     would float every one of them off its ground line. */
  kibmaple3:   { sheet: 'kibmaple3', x: 18, y: 2, w: 28, h: 59 },
  kibmaple4:   { sheet: 'kibmaple4', x: 7, y: 3, w: 50, h: 59 },
  kibmaple5:   { sheet: 'kibmaple5', x: 5, y: 5, w: 55, h: 58 },
  kibmaple6:   { sheet: 'kibmaple6', x: 10, y: 1, w: 41, h: 61 },
  kibmaple7:   { sheet: 'kibmaple7', x: 13, y: 2, w: 39, h: 60 },
  kibmaple14:  { sheet: 'kibmaple14', x: 10, y: 3, w: 45, h: 59 },
  kibwell1:    { sheet: 'kibwell1', x: 9, y: 4, w: 47, h: 58 },
  kibwell4:    { sheet: 'kibwell4', x: 9, y: 3, w: 46, h: 60 },
  kibpond1:    { sheet: 'kibpond1', x: 18, y: 10, w: 93, h: 101 },
  kibpond3:    { sheet: 'kibpond3', x: 10, y: 12, w: 109, h: 101 },
  kibmstall1:  { sheet: 'kibmstall1', x: 14, y: 12, w: 101, h: 100 },
  kibmstall2:  { sheet: 'kibmstall2', x: 17, y: 9, w: 94, h: 107 },
  kibmstall3:  { sheet: 'kibmstall3', x: 9, y: 11, w: 116, h: 95 },
  kibbush2:    { sheet: 'kibbush2', x: 3, y: 5, w: 26, h: 24 },
  kibbush7:    { sheet: 'kibbush7', x: 3, y: 5, w: 26, h: 25 },
  kibbush12:   { sheet: 'kibbush12', x: 2, y: 3, w: 28, h: 27 },
  kibbush19:   { sheet: 'kibbush19', x: 9, y: 3, w: 16, h: 27 },

  house:     { sheet: 'house', x: 0, y: 0, w: 96, h: 128 },
  tree:      { sheet: 'tree', x: 0, y: 0, w: 64, h: 80 },
  treeSmall: { sheet: 'treeSmall', x: 0, y: 0, w: 32, h: 48 },

  // Each mix sheet is a single pre-cropped sprite, so the rect is the whole file.
  // The autumn pair are the real seasonal artwork from the pack — orange #d06732
  // and amber #c98321, which is very nearly the site's own ember/amber. They are
  // deliberately NOT graded: hue-rotating a green tree was only ever a stand-in
  // for artwork that already existed.
  treeAutumn:   { sheet: 'treeAutumn', x: 0, y: 0, w: 73, h: 126 },
  treeAmber:    { sheet: 'treeAmber', x: 0, y: 0, w: 73, h: 126 },
  conifer:      { sheet: 'conifer', x: 0, y: 0, w: 54, h: 103 },
  conifer2:     { sheet: 'conifer2', x: 0, y: 0, w: 54, h: 103 },
  coniferSmall: { sheet: 'coniferSmall', x: 0, y: 0, w: 37, h: 76 },
  houseRed:     { sheet: 'houseRed', x: 0, y: 0, w: 72, h: 101 },
  houseBlue:    { sheet: 'houseBlue', x: 0, y: 0, w: 115, h: 69 },
  stall:        { sheet: 'stall', x: 0, y: 0, w: 43, h: 40 },

  rockBig:      { sheet: 'rockBig', x: 0, y: 0, w: 28, h: 43 },
  rockMid:      { sheet: 'rockMid', x: 0, y: 0, w: 26, h: 27 },
  rockSm:       { sheet: 'rockSm', x: 0, y: 0, w: 15, h: 10 },
  // Complete, clothed NPCs from Entities/Npc's. NOT Characters/Body_A — that is
  // a base body layer meant to be composited with clothing the free pack does
  // not ship, so on its own it renders as a naked mannequin. It looked like a
  // skeleton wandering the map.
  villagerA:    { sheet: 'villagerA', x: 0, y: 0, w: 64, h: 64 },
  villagerB:    { sheet: 'villagerB', x: 0, y: 0, w: 64, h: 64 },
  villagerC:    { sheet: 'villagerC', x: 0, y: 0, w: 64, h: 64 },
  villagerHold: { sheet: 'villagerHold', x: 0, y: 0, w: 64, h: 64 },
  villagerCarry:{ sheet: 'villagerCarry', x: 0, y: 0, w: 64, h: 64 },
  villagerRogue:{ sheet: 'villagerRogue', x: 0, y: 0, w: 32, h: 32 },
  // Eleven distinct people, drawn from every pack that ships a COMPLETE
  // character. Frame sizes differ per pack — Citizen sheets are 64, PC's other
  // NPCs are 32, Mystic Woods is 48. Cropping at the wrong size silently
  // produces a zero-byte file and loadAll() then rejects, taking the map down.
  villagerKnight:{ sheet: 'villagerKnight', x: 0, y: 0, w: 32, h: 32 },
  villagerWizard:{ sheet: 'villagerWizard', x: 0, y: 0, w: 32, h: 32 },
  villagerCfSide:{ sheet: 'villagerCfSide', x: 0, y: 0, w: 32, h: 32 },
  villagerCfUp: { sheet: 'villagerCfUp', x: 0, y: 0, w: 32, h: 32 },
  villagerMw:   { sheet: 'villagerMw', x: 0, y: 0, w: 48, h: 48 },
  scarecrow:    { sheet: 'scarecrow', x: 0, y: 0, w: 24, h: 47 },
  bushGreen:    { sheet: 'bushGreen', x: 0, y: 0, w: 43, h: 91 },
  bushOlive:    { sheet: 'bushOlive', x: 0, y: 0, w: 43, h: 91 },
  animalChicken: { sheet: 'animalChicken', x: 0, y: 0, w: 32, h: 32 },
  animalCow:    { sheet: 'animalCow', x: 0, y: 0, w: 32, h: 32 },
  animalSheep:  { sheet: 'animalSheep', x: 0, y: 0, w: 32, h: 32 },

  // Single bush cells at last, ungraded — the pack's own autumn colours.
  bushRustLg:  { sheet: 'bushRustLg', x: 0, y: 0, w: 43, h: 42 },
  bushRustMd:  { sheet: 'bushRustMd', x: 0, y: 0, w: 43, h: 32 },
  bushRustSm:  { sheet: 'bushRustSm', x: 0, y: 0, w: 43, h: 27 },
  bushOliveLg: { sheet: 'bushOliveLg', x: 0, y: 0, w: 43, h: 42 },
  bushOliveMd: { sheet: 'bushOliveMd', x: 0, y: 0, w: 43, h: 32 },
  bushAmberLg: { sheet: 'bushAmberLg', x: 0, y: 0, w: 43, h: 42 },
  bushAmberMd: { sheet: 'bushAmberMd', x: 0, y: 0, w: 43, h: 32 },

  // Premade buildings. Each sheet holds exactly one sprite, tightly cropped to
  // its alpha bounds at install time, so the rect is the whole file.
  instAcademic: { sheet: 'instAcademic', x: 0, y: 0, w: 245, h: 107 },
  instResearch: { sheet: 'instResearch', x: 0, y: 0, w: 235, h: 107 },
  offManor1:    { sheet: 'offManor1', x: 0, y: 0, w: 108, h: 107 },
  offManor2:    { sheet: 'offManor2', x: 0, y: 0, w: 100, h: 105 },
  offManor3:    { sheet: 'offManor3', x: 0, y: 0, w: 104, h: 107 },
  offCottage:   { sheet: 'offCottage', x: 0, y: 0, w: 104, h: 136 },
  offLshape:    { sheet: 'offLshape', x: 0, y: 0, w: 164, h: 140 },
  offFarmhouse: { sheet: 'offFarmhouse', x: 0, y: 0, w: 196, h: 130 },

  // Openings placed onto the plain wall runs by drawBuilding().
  doorPlank:   { sheet: 'doorPlank', x: 0, y: 0, w: 18, h: 35 },
  doorGlazed:  { sheet: 'doorGlazed', x: 0, y: 0, w: 21, h: 38 },
  // The sheet is 31x47 and the arch lives in the BOTTOM 18px — the upper block
  // is a dark stone lintel. Taking the top-left corner, as this did, drew that
  // black block onto every plaster and brick façade as a hole in the wall.
  doorStone:   { sheet: 'doorStone', x: 1, y: 29, w: 24, h: 18 },
  chimney:     { sheet: 'chimney', x: 0, y: 0, w: 20, h: 46 },
  winArch:     { sheet: 'winArch', x: 0, y: 0, w: 24, h: 31 },
  winArchBlue: { sheet: 'winArchBlue', x: 0, y: 0, w: 20, h: 29 },
  winFour:     { sheet: 'winFour', x: 0, y: 0, w: 20, h: 21 },

  benchWood:   { sheet: 'benchWood', x: 0, y: 0, w: 61, h: 20 },
  planter:     { sheet: 'planter', x: 0, y: 0, w: 30, h: 17 },
  hedge:       { sheet: 'hedge', x: 0, y: 0, w: 34, h: 21 },
};

/**
 * Decor sheet is a 7x12 grid of 16px cells. Named picks, read off the sheet —
 * indices are [col, row].
 */
export const DECOR = {
  tuft1: [0, 0], tuft2: [1, 0], tuft3: [2, 0],
  flowerYellow: [1, 1], flowerWhite: [4, 1], reeds: [6, 1],
  stump: [0, 2], rockSmall: [1, 2], rockMid: [2, 2],
  wheat: [5, 2], wheat2: [6, 2],
  rocks1: [0, 3], rocks2: [1, 3], rocks3: [2, 3],
  log: [0, 8], mushroom: [1, 8],
  lamp: [4, 5],
  potRed: [0, 9], potYellow: [1, 9],
};

export function loadAll() {
  const out = {};
  return Promise.all(
    Object.entries(SHEETS).map(([key, url]) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { out[key] = img; res(); };
      img.onerror = () => rej(new Error(`sheet failed: ${url}`));
      img.src = url;
    }))
  ).then(() => out);
}

/* ============================================================
   SCENE
   ============================================================ */

/**
 * An ordered list of draw operations rather than a fixed layer grid — the pack
 * mixes 16px terrain tiles with 96x128 building sprites, and forcing both into
 * one tile grid would mean slicing every building by hand.
 */
export class Scene {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.ops = [];
  }

  /** One 16px tile from a sheet's [col,row] grid. `layer` 0 is ground. */
  tile(sheet, col, row, cx, cy, layer = 0) {
    this.ops.push({ sheet, sx: col * TILE, sy: row * TILE, sw: TILE, sh: TILE, x: cx * TILE, y: cy * TILE, layer });
    this._sorted = null;
    return this;
  }

  /**
   * An arbitrary source rect at an arbitrary destination, with an explicit
   * baseline. `drawBuilding()` needs both: its parts are slices of a sheet
   * rather than named sprites, and a roof, a wall course and a chimney sit at
   * three different heights but must draw in a fixed order as ONE object. Left
   * to the default `y + sh` baseline they would interleave — the chimney would
   * sort behind the roof it stands on. Passing the façade line as `base` makes
   * the whole building sort where it meets the ground, which is also what makes
   * it y-sort correctly against trees and the player.
   */
  part(sheet, sx, sy, sw, sh, x, y, base, layer = 1) {
    this.ops.push({ sheet, sx, sy, sw, sh, x, y, layer, base });
    this._sorted = null;
    return this;
  }

  /**
   * A named multi-tile sprite, positioned by its bottom-left cell.
   *
   * `opt.scale` draws the sprite larger or smaller than its source. The packs
   * disagree about scale — a Pixel Lands cottage is 136px tall where a Kibyra
   * manor is 107 — so without this the most important building on the map is
   * physically shorter than an ordinary house. Nearest-neighbour keeps it
   * pixel art; rounding to whole pixels keeps it aligned to the tile grid.
   *
   * `opt.tag` is the sprite's identity. It defaults to name@cell, which is
   * stable because the map is seeded and deterministic — that is what lets the
   * editor say "hide this particular tree" and have it mean the same thing on
   * the next load.
   */
  sprite(name, cx, cy, opt = {}) {
    const s = SPRITES[name];
    if (!s) return this;
    const tag = opt.tag !== undefined ? opt.tag : `${name}@${cx},${cy}`;
    if (this.hidden && this.hidden.has(tag)) return this;
    const k = opt.scale || 1;
    const dw = Math.round(s.w * k), dh = Math.round(s.h * k);
    this.ops.push({
      sheet: s.sheet, sx: s.x, sy: s.y, sw: s.w, sh: s.h, dw, dh,
      x: cx * TILE, y: cy * TILE - dh + TILE,
      layer: 1, flip: !!opt.flip,
      name, tag, cell: [cx, cy], scale: k,
    });
    this._sorted = null;
    return this;
  }

  decor(name, cx, cy, opt = {}) {
    const d = DECOR[name];
    if (!d) return this;
    const tag = opt.tag !== undefined ? opt.tag : `decor:${name}@${cx},${cy}`;
    if (this.hidden && this.hidden.has(tag)) return this;
    this.ops.push({
      sheet: 'decor', sx: d[0] * TILE, sy: d[1] * TILE, sw: TILE, sh: TILE,
      x: cx * TILE, y: cy * TILE, layer: 1,
      name, tag, cell: [cx, cy], scale: 1, isDecor: true,
    });
    this._sorted = null;
    return this;
  }

  fillGrass() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) this.tile('grass', 0, 0, c, r);
    }
    return this;
  }

  /**
   * Nine-slice a region. `has(c,r)` says whether a cell belongs to the terrain;
   * the tile chosen depends on which orthogonal neighbours also do, so the
   * region gets corners and edges automatically.
   */
  blob(sheet, has) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!has(c, r)) continue;
        const n = has(c, r - 1), s = has(c, r + 1);
        const w = has(c - 1, r), e = has(c + 1, r);
        const col = w && e ? 1 : (w ? 2 : 0);
        const row = n && s ? 1 : (n ? 2 : 0);
        this.tile(sheet, col, row, c, r);
      }
    }
    return this;
  }

  /**
   * Draw order. Ground (layer 0) always goes down first, in insertion order.
   * Everything above it sorts by its **baseline** — the bottom edge of the
   * sprite — so a tree standing in front of a house covers it and a tree
   * standing behind it does not. Without this, ops draw in the order they were
   * added, which is why canopies were cutting across roofs.
   *
   * Sorted once and cached: the scroll walk re-renders every frame, and sorting
   * several thousand ops per frame would be the whole budget.
   */
  ordered() {
    if (this._sorted) return this._sorted;
    const base = (op) => (op.base !== undefined ? op.base : op.y + (op.dh !== undefined ? op.dh : op.sh));
    this._sorted = this.ops
      .map((op, i) => ({ op, i }))
      .sort((a, b) =>
        (a.op.layer - b.op.layer) ||
        (base(a.op) - base(b.op)) ||
        (a.i - b.i)) // stable: equal baselines keep insertion order
      .map((e) => e.op);
    return this._sorted;
  }

  render(ctx, sheets) {
    for (const op of this.ordered()) {
      const img = sheets[op.sheet];
      if (!img) continue;
      const dw = op.dw !== undefined ? op.dw : op.sw;
      const dh = op.dh !== undefined ? op.dh : op.sh;
      if (op.flip) {
        ctx.save();
        ctx.translate(op.x + dw, op.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, op.sx, op.sy, op.sw, op.sh, 0, 0, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(img, op.sx, op.sy, op.sw, op.sh, op.x, op.y, dw, dh);
      }
    }
  }

  /** The drawn box of an op, in map pixels — what the editor hit-tests against. */
  static box(op) {
    return {
      x: op.x, y: op.y,
      w: op.dw !== undefined ? op.dw : op.sw,
      h: op.dh !== undefined ? op.dh : op.sh,
    };
  }

  /**
   * Topmost selectable op at a map-pixel point. Walks the draw order backwards
   * so the thing drawn last — the thing you can actually see — is the thing you
   * pick, and ignores ground so clicking a tree never selects the grass under it.
   */
  pick(px, py) {
    const list = this.ordered();
    for (let i = list.length - 1; i >= 0; i--) {
      const op = list[i];
      if (op.layer === 0 || !op.tag) continue;
      const b = Scene.box(op);
      if (px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h) return op;
    }
    return null;
  }
}

/** Rect helper for blob predicates. */
export const inRect = (x, y, w, h) => (c, r) => c >= x && c < x + w && r >= y && r < y + h;

/** Union of predicates — lets a path be several rects without extra passes. */
export const any = (...fns) => (c, r) => fns.some((f) => f(c, r));
