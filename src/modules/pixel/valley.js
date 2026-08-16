/**
 * THE VALLEY — a second, from-scratch Experience map.
 *
 * Written after re-reading the three usable references in `assets/Pixel Art/`
 * (the other two are AI-generated and unmatchable — HANDOFF §9). The first map
 * grew by accretion across many sessions and stopped being editable; this one
 * starts from what the references actually do rather than from what the old one
 * had become.
 *
 * ── DELIBERATELY SELF-CONTAINED ───────────────────────────────────────────
 * Its own sheet list, its own Scene, its own data. It imports NOTHING from
 * cutefantasy.js / journey.js / worldmap.js, because a second session is
 * editing those files at the same time and there is no version control here.
 * The cost is ~60 duplicated lines; the benefit is that neither effort can
 * destroy the other.
 *
 * ── WHAT THE REFERENCES ACTUALLY DO ───────────────────────────────────────
 * All three share one grammar, and the old map had none of it:
 *
 *  1. ONE STRONG LINEAR FEATURE runs the whole length — a river, a street, a
 *     cliff line. Everything else is arranged against it. The old map's device
 *     was a road with buildings beside it, which is why it read as a list.
 *  2. HARD-EDGED TERRAIN. Every water body has a stone bank; every level change
 *     is a cliff face. Nothing fades into anything.
 *  3. CROSSINGS PUNCTUATE. Bridges are where the eye stops. Ref 5 has no road
 *     at all — its bridges and clearings do all the structural work.
 *  4. VEGETATION MASSES AND OVERLAPS, at three or four sizes, clumping and
 *     covering each other. Never a uniform scatter, never one size.
 *  5. THE GROUND IS NEVER BARE. Tufts, flowers, stones, stumps everywhere, even
 *     in "empty" grass.
 *  6. PROPS CROWD THE BUILDINGS. In ref 1 every door has a planter, a lamp, a
 *     barrel, a sign within two tiles of it. That density is what says a place
 *     is inhabited — more than the building itself does.
 *  7. THE FRAME CROPS THINGS. Buildings and woods run off the edges, so the
 *     world reads as continuing past the border.
 */

/* ============================================================
   SHEETS — Cute Fantasy for terrain, Pixel Crawler for nature,
   the premade building art for the seven focal points.
   ============================================================ */

const CF = '/assets/pixel/cf';
const MIX = '/assets/pixel/mix';
const PCB = '/assets/pixel/pcb';
const PRE = '/assets/pixel/premade';
const KIB = '/assets/pixel/kib';
const PMX = '/assets/pixel/pmx';
const WLD = '/assets/pixel/wild';
const DSR = '/assets/pixel/desert';
const CMP = '/assets/pixel/campus';

import { vectorRaster } from './vector.js';

/**
 * Whether resized sprites are drawn from vector geometry.
 *
 * On: any non-whole-number scale is rebuilt from filled paths, so nothing is
 * dropped or doubled. Off: nearest-neighbour, which is crisper but wobbles and
 * loses single-pixel detail at fractional sizes. The editor exposes this as a
 * toggle so the two can be compared on the real map rather than in the abstract.
 */
export let VECTOR_SCALING = true;
export const setVectorScaling = (on) => { VECTOR_SCALING = !!on; };

export const TILE = 16;

export const SHEETS = {
  grass: `${CF}/grass.webp`,
  path: `${CF}/path.webp`,
  // The same sheet again, graded darker — see VALLEY_GRADE. The earth regions
  // are floored with this so the ROAD, which uses the normal path tile, still
  // reads against them. Flooring with the path tile itself made the road vanish.
  earth: `${CF}/path.webp`,
  water: `${CF}/water.webp`,
  cliff: `${CF}/cliff.webp`,
  beach: `${CF}/beach.webp`,
  farm: `${CF}/farm.webp`,
  decor: `${CF}/decor.webp`,
  fences: `${CF}/fences.webp`,
  bridge: `${CF}/bridge.webp`,
  tree: `${CF}/tree.webp`,
  treeSmall: `${CF}/tree_small.webp`,

  treeAutumn: `${MIX}/tree_autumn.webp`,
  treeAmber: `${MIX}/tree_amber.webp`,
  conifer: `${MIX}/conifer.webp`,
  conifer2: `${MIX}/conifer2.webp`,
  coniferSmall: `${MIX}/conifer_small.webp`,
  rockBig: `${MIX}/rock_big.webp`,
  rockMid: `${MIX}/rock_mid.webp`,
  rockSm: `${MIX}/rock_sm.webp`,
  scarecrow: `${MIX}/scarecrow.webp`,
  houseRed: `${MIX}/house_red.webp`,
  houseBlue: `${MIX}/house_blue.webp`,
  stall: `${MIX}/stall.webp`,
  villagerA: `${MIX}/villager_a.webp`,
  villagerB: `${MIX}/villager_b.webp`,
  villagerC: `${MIX}/villager_c.webp`,
  villagerHold: `${MIX}/villager_hold.webp`,
  villagerCarry: `${MIX}/villager_carry.webp`,
  villagerRogue: `${MIX}/villager_rogue.webp`,
  villagerKnight: `${MIX}/villager_knight.webp`,
  villagerWizard: `${MIX}/villager_wizard.webp`,
  villagerMw: `${MIX}/villager_mw.webp`,
  animalChicken: `${MIX}/animal_chicken.webp`,
  animalCow: `${MIX}/animal_cow.webp`,
  animalSheep: `${MIX}/animal_sheep.webp`,

  // Single-cell bushes in the pack's own autumn colours (see pc-building-parts).
  bushRustLg: `${PCB}/bush_rust_lg.webp`,
  bushRustMd: `${PCB}/bush_rust_md.webp`,
  bushRustSm: `${PCB}/bush_rust_sm.webp`,
  bushOliveLg: `${PCB}/bush_olive_lg.webp`,
  bushOliveMd: `${PCB}/bush_olive_md.webp`,
  bushAmberLg: `${PCB}/bush_amber_lg.webp`,
  bushAmberMd: `${PCB}/bush_amber_md.webp`,
  benchWood: `${PCB}/bench_wood.webp`,
  planter: `${PCB}/planter.webp`,
  hedge: `${PCB}/hedge.webp`,

  // Complete artist-drawn buildings — no composing. §9.1's lesson, taken.
  instAcademic: `${PRE}/inst_academic.webp`,
  instResearch: `${PRE}/inst_research.webp`,
  offLshape: `${PRE}/off_lshape.webp`,
  offFarmhouse: `${PRE}/off_farmhouse.webp`,
  offCottage: `${PRE}/off_cottage.webp`,
  offManor1: `${PRE}/off_manor1.webp`,
  offManor2: `${PRE}/off_manor2.webp`,
  offManor3: `${PRE}/off_manor3.webp`,

  well1: `${KIB}/well1.webp`,
  well4: `${KIB}/well4.webp`,
  mstall1: `${KIB}/mstall1.webp`,
  mstall2: `${KIB}/mstall2.webp`,
  mstall3: `${KIB}/mstall3.webp`,
  maple3: `${KIB}/maple3.webp`,
  maple5: `${KIB}/maple5.webp`,
  maple7: `${KIB}/maple7.webp`,
  maple14: `${KIB}/maple14.webp`,
  kbush2: `${KIB}/bush2.webp`,
  kbush7: `${KIB}/bush7.webp`,
  kbush12: `${KIB}/bush12.webp`,
  kbush19: `${KIB}/bush19.webp`,
  /* ---- COMPLETE BUILDINGS cut from the multi-building sheets that were
     sitting unused in premade/ (churches, museums, noblemanors, marketstalls,
     pixellands). Nineteen more artist-drawn buildings, tight-cropped by
     tools/premade-buildings.json — the sheets are 2x2 grids but the buildings
     do not fill their cells, so cutting on the grid would break bottom-centre
     anchoring. ---- */
  churchStone:  `${PMX}/church_stone.webp`,
  churchWhite:  `${PMX}/church_white.webp`,
  churchBrick:  `${PMX}/church_brick.webp`,
  churchLog:    `${PMX}/church_log.webp`,
  museumTeal:   `${PMX}/museum_teal.webp`,
  museumPurple: `${PMX}/museum_purple.webp`,
  museumLog:    `${PMX}/museum_log.webp`,
  museumClock:  `${PMX}/museum_clock.webp`,
  manorCream:   `${PMX}/manor_cream.webp`,
  manorTurret:  `${PMX}/manor_turret.webp`,
  manorTimber:  `${PMX}/manor_timber.webp`,
  manorGabled:  `${PMX}/manor_gabled.webp`,
  stallMarket:  `${PMX}/stall_market.webp`,
  stallBakery:  `${PMX}/stall_bakery.webp`,
  stallPottery: `${PMX}/stall_pottery.webp`,
  stallFish:    `${PMX}/stall_fish.webp`,
  plHall:       `${PMX}/pl_hall.webp`,
  plTower:      `${PMX}/pl_tower.webp`,
  plTerrace:    `${PMX}/pl_terrace.webp`,

  /* Everything else that was on disk and unreferenced. */
  cfHouse:      `${CF}/house.webp`,
  maple4:       `${KIB}/maple4.webp`,
  maple6:       `${KIB}/maple6.webp`,
  pond1:        `${KIB}/pond1.webp`,
  pond3:        `${KIB}/pond3.webp`,
  villagerCfSide: `${MIX}/villager_cf_side.webp`,
  villagerCfUp:   `${MIX}/villager_cf_up.webp`,
  doorPlank:    `${PCB}/door_plank.webp`,
  doorGlazed:   `${PCB}/door_glazed.webp`,
  doorStone:    `${PCB}/door_stone.webp`,
  winArch:      `${PCB}/win_arch.webp`,
  winArchBlue:  `${PCB}/win_arch_blue.webp`,
  winFour:      `${PCB}/win_four.webp`,
  chimney:      `${PCB}/chimney.webp`,
  /* ---- Forest animals (MinifolksForestAnimals) and a farmyard (Farm RPG
     FREE 16x16). Both ship animation sheets, so these are single frames cut
     by tools/new-packs.json. Neither pack carries a licence file — see the
     note there. ---- */
  wildBear:  `${WLD}/wild_bear.webp`,
  wildBird:  `${WLD}/wild_bird.webp`,
  wildBoar:  `${WLD}/wild_boar.webp`,
  wildBunny: `${WLD}/wild_bunny.webp`,
  wildDeer:  `${WLD}/wild_deer.webp`,
  wildStag:  `${WLD}/wild_stag.webp`,
  wildFox:   `${WLD}/wild_fox.webp`,
  wildWolf:  `${WLD}/wild_wolf.webp`,
  farmCowF:  `${WLD}/farm_cow_f.webp`,
  farmCowM:  `${WLD}/farm_cow_m.webp`,
  farmHenRed:   `${WLD}/farm_hen_red.webp`,
  farmHenGreen: `${WLD}/farm_hen_green.webp`,
  farmChick: `${WLD}/farm_chick.webp`,
  farmHouseA: `${WLD}/farm_house_a.webp`,
  farmHouseB: `${WLD}/farm_house_b.webp`,
  farmMaple: `${WLD}/farm_maple.webp`,
  farmSapling: `${WLD}/farm_sapling.webp`,
  farmChest: `${WLD}/farm_chest.webp`,

  // Craftpix desert pack, converted to pixel art by tools/desert-pixelate.py.
  // The source is vector art with baked drop shadows — see tools/desert-pack.json
  // for what the conversion does and why the sizes are what they are.
  // ds* = desert.

  dsBuildTall:   `${DSR}/dsBuildTall.webp`,
  dsBuildHall:   `${DSR}/dsBuildHall.webp`,
  dsBuildDome:   `${DSR}/dsBuildDome.webp`,
  dsBuildGable:  `${DSR}/dsBuildGable.webp`,
  dsBuildTwo:    `${DSR}/dsBuildTwo.webp`,
  dsPalmTwin:    `${DSR}/dsPalmTwin.webp`,
  dsPalm:        `${DSR}/dsPalm.webp`,
  dsPalmSmall:   `${DSR}/dsPalmSmall.webp`,
  dsPalmTall:    `${DSR}/dsPalmTall.webp`,
  dsPalmBent:    `${DSR}/dsPalmBent.webp`,
  dsPalmYoung:   `${DSR}/dsPalmYoung.webp`,
  dsPalmBroad:   `${DSR}/dsPalmBroad.webp`,
  dsBaobab:      `${DSR}/dsBaobab.webp`,
  dsBaobabWide:  `${DSR}/dsBaobabWide.webp`,
  dsDeadWide:    `${DSR}/dsDeadWide.webp`,
  dsDeadTall:    `${DSR}/dsDeadTall.webp`,
  dsDeadForked:  `${DSR}/dsDeadForked.webp`,
  dsSaguaro:     `${DSR}/dsSaguaro.webp`,
  dsShrubTiny:   `${DSR}/dsShrubTiny.webp`,
  dsCactusThin:  `${DSR}/dsCactusThin.webp`,
  dsShrub:       `${DSR}/dsShrub.webp`,
  dsCactusSmall: `${DSR}/dsCactusSmall.webp`,
  dsScrub:       `${DSR}/dsScrub.webp`,
  dsGrassTuft:   `${DSR}/dsGrassTuft.webp`,
  dsGrassTuft2:  `${DSR}/dsGrassTuft2.webp`,
  dsCactusBig:   `${DSR}/dsCactusBig.webp`,
  dsBush:        `${DSR}/dsBush.webp`,
  dsRockSm:      `${DSR}/dsRockSm.webp`,
  dsRockMd:      `${DSR}/dsRockMd.webp`,
  dsRockRound:   `${DSR}/dsRockRound.webp`,
  dsRockPair:    `${DSR}/dsRockPair.webp`,
  dsRockFlat:    `${DSR}/dsRockFlat.webp`,
  dsBoulder:     `${DSR}/dsBoulder.webp`,
  dsRockChip:    `${DSR}/dsRockChip.webp`,
  dsRockLow:     `${DSR}/dsRockLow.webp`,
  dsRockSlab:    `${DSR}/dsRockSlab.webp`,
  dsOutcrop:     `${DSR}/dsOutcrop.webp`,
  dsMesa:        `${DSR}/dsMesa.webp`,
  dsCliffMass:   `${DSR}/dsCliffMass.webp`,
  dsPyramid:     `${DSR}/dsPyramid.webp`,
  dsTent:        `${DSR}/dsTent.webp`,
  dsCrate:       `${DSR}/dsCrate.webp`,
  dsBoat:        `${DSR}/dsBoat.webp`,
  dsWagon:       `${DSR}/dsWagon.webp`,
  dsBarrel:      `${DSR}/dsBarrel.webp`,
  dsSignpost:    `${DSR}/dsSignpost.webp`,
  dsCamp:        `${DSR}/dsCamp.webp`,
  dsOasis:       `${DSR}/dsOasis.webp`,
  dsSand1:       `${DSR}/dsSand1.webp`,
  dsSand2:       `${DSR}/dsSand2.webp`,
  dsSand3:       `${DSR}/dsSand3.webp`,
  dsDune:        `${DSR}/dsDune.webp`,
  dsGravel:      `${DSR}/dsGravel.webp`,
  dsCracked:     `${DSR}/dsCracked.webp`,
  dsBg:          `${DSR}/dsBg.webp`,

  // Nine-slice paving, assembled by tools/desert-pixelate.py from the pack's 26
  // loose edge tiles. These are 48x48 sheets, not sprites, so they have no
  // SPRITES entry — they are addressed as terrain, like grass and path.
  dsRoadWarm:    `${DSR}/dsRoadWarm.webp`,
  dsRoadGrey:    `${DSR}/dsRoadGrey.webp`,

  // The two real places this map is about, converted from the user's own
  // artwork by tools/campus-pack.json. Landmark scale on purpose — KFUPM is
  // the widest sprite here because the campus reads as a long low arcade and
  // house-scaling it would lose the one silhouette that identifies it.
  bitMesra:      `${CMP}/bitMesra.webp`,
  kfupm:         `${CMP}/kfupm.webp`,
};

/** Sprite sizes, measured off the files. */
export const SPRITES = {
  tree: [64, 80], treeSmall: [32, 48],
  treeAutumn: [73, 126], treeAmber: [73, 126],
  conifer: [54, 103], conifer2: [54, 103], coniferSmall: [37, 76],
  rockBig: [28, 43], rockMid: [26, 27], rockSm: [15, 10],
  scarecrow: [24, 47], houseRed: [72, 101], houseBlue: [115, 69], stall: [43, 40],
  villagerA: [64, 64], villagerB: [64, 64], villagerC: [64, 64],
  villagerHold: [64, 64], villagerCarry: [64, 64],
  villagerRogue: [32, 32], villagerKnight: [32, 32], villagerWizard: [32, 32],
  villagerMw: [48, 48],
  animalChicken: [32, 32], animalCow: [32, 32], animalSheep: [32, 32],
  bushRustLg: [43, 42], bushRustMd: [43, 32], bushRustSm: [43, 27],
  bushOliveLg: [43, 42], bushOliveMd: [43, 32],
  bushAmberLg: [43, 42], bushAmberMd: [43, 32],
  benchWood: [61, 20], planter: [30, 17], hedge: [34, 21],
  instAcademic: [245, 107], instResearch: [235, 107],
  offLshape: [164, 140], offFarmhouse: [196, 130], offCottage: [104, 136],
  offManor1: [108, 107], offManor2: [100, 105], offManor3: [104, 107],
  well1: [64, 64], well4: [64, 64],
  mstall1: [128, 128], mstall2: [128, 128], mstall3: [128, 128],
  maple3: [64, 64], maple5: [64, 64], maple7: [64, 64], maple14: [64, 64],
  kbush2: [32, 32], kbush7: [32, 32], kbush12: [32, 32], kbush19: [32, 32],
  churchStone: [94,115], churchWhite: [92,115], churchBrick: [95,120], churchLog: [92,115],
  museumTeal: [122,109], museumPurple: [122,108], museumLog: [122,117], museumClock: [110,121],
  manorCream: [108,107], manorTurret: [100,105], manorTimber: [100,104], manorGabled: [104,107],
  stallMarket: [101,100], stallBakery: [94,107], stallPottery: [116,95], stallFish: [96,95],
  plHall: [158,131], plTower: [94,123], plTerrace: [190,123],
  cfHouse: [96,128],
  maple4: [64,64], maple6: [64,64], pond1: [128,128], pond3: [128,128],
  villagerCfSide: [32,32], villagerCfUp: [32,32],
  doorPlank: [18,35], doorGlazed: [21,38], doorStone: [26,24],
  winArch: [24,31], winArchBlue: [20,29], winFour: [20,21], chimney: [20,46],
  wildBear: [32,32], wildBird: [16,24], wildBoar: [32,32], wildBunny: [32,32],
  wildDeer: [32,32], wildStag: [32,32], wildFox: [32,32], wildWolf: [32,32],
  farmCowF: [32,32], farmCowM: [32,32],
  farmHenRed: [16,16], farmHenGreen: [16,16], farmChick: [16,16],
  farmHouseA: [72,86], farmHouseB: [72,95],
  farmMaple: [32,46], farmSapling: [20,33], farmChest: [32,16],
  // --- desert pack (see tools/desert-pack.json) ---
  dsBuildTall: [112,110], dsBuildHall: [144,84], dsBuildDome: [72,118],
  dsBuildGable: [72,135], dsBuildTwo: [92,115], dsPalmTwin: [80,83], dsPalm: [64,97],
  dsPalmSmall: [52,67], dsPalmTall: [40,105], dsPalmBent: [54,70], dsPalmYoung: [56,70],
  dsPalmBroad: [60,75], dsBaobab: [88,131], dsBaobabWide: [96,113], dsDeadWide: [60,47],
  dsDeadTall: [56,100], dsDeadForked: [60,82], dsSaguaro: [32,89], dsShrubTiny: [24,26],
  dsCactusThin: [30,56], dsShrub: [32,36], dsCactusSmall: [26,40], dsScrub: [30,26],
  dsGrassTuft: [32,30], dsGrassTuft2: [32,30], dsCactusBig: [48,52], dsBush: [30,25],
  dsRockSm: [34,25], dsRockMd: [34,31], dsRockRound: [34,32], dsRockPair: [64,44],
  dsRockFlat: [48,36], dsBoulder: [52,49], dsRockChip: [36,29], dsRockLow: [44,28],
  dsRockSlab: [40,27], dsOutcrop: [128,105], dsMesa: [208,94], dsCliffMass: [152,106],
  dsPyramid: [88,73], dsTent: [68,74], dsCrate: [36,36], dsBoat: [64,17], dsWagon: [92,46],
  dsBarrel: [38,29], dsSignpost: [40,43], dsCamp: [80,45], dsOasis: [144,57],
  dsSand1: [16,16], dsSand2: [16,16], dsSand3: [16,16], dsDune: [16,16], dsGravel: [16,16],
  dsCracked: [16,16], dsBg: [16,16],
  bitMesra: [256,148], kfupm: [320,95], 
  
};

/** Cute Fantasy's decor sheet is a 7x12 grid of 16px cells. */
export const DECOR = {
  tuft1: [0, 0], tuft2: [1, 0], tuft3: [2, 0],
  flowerYellow: [1, 1], flowerWhite: [4, 1], reeds: [6, 1],
  stump: [0, 2], rockSmall: [1, 2], rockMid: [2, 2],
  wheat: [5, 2], wheat2: [6, 2],
  rocks1: [0, 3], rocks2: [1, 3], rocks3: [2, 3],
  log: [0, 8], mushroom: [1, 8],
  lamp: [4, 5], potRed: [0, 9], potYellow: [1, 9],
};

export function loadAll() {
  const out = {};
  return Promise.all(Object.entries(SHEETS).map(([k, url]) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { out[k] = img; res(); };
    img.onerror = () => rej(new Error(`sheet failed: ${url}`));
    img.src = url;
  }))).then(() => out);
}

/* ============================================================
   SCENE — ordered draw ops, baseline-sorted.
   ============================================================ */

export class Scene {
  constructor(cols, rows) { this.cols = cols; this.rows = rows; this.ops = []; }

  tile(sheet, col, row, cx, cy, layer = 0) {
    this.ops.push({ sheet, sx: col * TILE, sy: row * TILE, sw: TILE, sh: TILE,
      x: cx * TILE, y: cy * TILE, layer });
    return this;
  }

  /**
   * A named sprite positioned by its BOTTOM-CENTRE cell — centring by default
   * is what stops every placement needing a hand-computed x offset.
   *
   * `scale` draws it at a different size. Note what that costs: these are
   * hand-drawn pixel sprites, so any factor other than a whole number makes
   * source pixels land on uneven numbers of screen pixels, and the sprite stops
   * having a uniform pixel grid — which is the specific flaw that makes two of
   * the project's five reference images unusable (HANDOFF §9). Whole numbers
   * are safe; the editor defaults to stepping in halves and says so.
   */
  sprite(name, cx, cy, layer = 1, sx = 1, sy = sx) {
    const s = SPRITES[name];
    if (!s) return this;
    const [w, h] = s;
    const dw = Math.max(1, Math.round(w * sx));
    const dh = Math.max(1, Math.round(h * sy));
    this.ops.push({ sheet: name, sx: 0, sy: 0, sw: w, sh: h, dw, dh,
      x: Math.round(cx * TILE + TILE / 2 - dw / 2), y: cy * TILE - dh + TILE, layer });
    return this;
  }

  decor(name, cx, cy) {
    const d = DECOR[name];
    return d ? this.tile('decor', d[0], d[1], cx, cy, 1) : this;
  }

  /** Nine-slice a region from a 3x3 blob sheet. */
  blob(sheet, has) {
    for (let r = -1; r <= this.rows; r++) {
      for (let c = -1; c <= this.cols; c++) {
        if (!has(c, r)) continue;
        const n = has(c, r - 1), s = has(c, r + 1);
        const w = has(c - 1, r), e = has(c + 1, r);
        this.tile(sheet, w && e ? 1 : (w ? 2 : 0), n && s ? 1 : (n ? 2 : 0), c, r);
      }
    }
    return this;
  }

  ordered() {
    if (this._sorted) return this._sorted;
    // Baseline is the DRAWN bottom edge, so a scaled sprite still sorts by where
    // it actually meets the ground rather than by its source height.
    const base = (op) => op.y + (op.dh ?? op.sh);
    this._sorted = this.ops.map((op, i) => ({ op, i }))
      .sort((a, b) => (a.op.layer - b.op.layer) || (base(a.op) - base(b.op)) || (a.i - b.i))
      .map((e) => e.op);
    return this._sorted;
  }

  render(ctx, sheets) {
    for (const op of this.ordered()) {
      const img = sheets[op.sheet];
      if (!img) continue;
      const dw = op.dw ?? op.sw, dh = op.dh ?? op.sh;
      /* Three cases, cheapest first:
           unscaled          draw the image
           whole-number      nearest-neighbour is already exact, and keeps the
                             hard edges that match the surrounding tiles
           anything else     vector geometry, rasterised once per size. Filled
                             shapes cannot drop a pixel or double one, which is
                             what nearest-neighbour does at every fractional
                             scale and what made resizing lose detail. */
      const alt = VECTOR_SCALING && (dw !== op.sw || dh !== op.sh)
        ? vectorRaster(img, op.sw, op.sh, dw, dh, op.sheet) : null;
      if (alt) ctx.drawImage(alt, 0, 0, alt.width, alt.height, op.x, op.y, dw, dh);
      else ctx.drawImage(img, op.sx, op.sy, op.sw, op.sh, op.x, op.y, dw, dh);
    }
  }
}

/* ============================================================
   THE MAP
   ============================================================ */

/**
 * Widened from 34 to 44 to leave working room on the east side.
 *
 * The extra ten columns go on the RIGHT, not split either side: objects are
 * stored by absolute column, so growing symmetrically would shift every placed
 * building and silently ruin a hand-edited map. Growing east means existing
 * coordinates stay exactly where they were, and `migrateDoc` can widen a saved
 * document by padding grass rather than by moving anything.
 */
export const COLS = 44;
// Grown from 140 on 2026-08-15 by tools/grow-map.mjs, which inserted 24 rows
// of desert at row 137 — below both Dhahran milestones, above the closing
// paved band. The saved document was transformed in the same operation, so
// this constant and public/assets/pixel/valley-map.json agree; changing one
// without the other makes migrateDoc pad or TRUNCATE the map.
export const ROWS = 164;

/**
 * Order-independent spatial hash. Same cell always gives the same answer, so
 * masses can be filled in any order and the world never reshuffles on reload.
 */
export function hash01(c, r, salt = 0) {
  const h = ((c * 73856093) ^ (r * 19349663) ^ (salt * 83492791)) >>> 0;
  return (h % 1000) / 1000;
}

/**
 * THE RIVER — the one linear feature everything is arranged against.
 * A centre-line per row plus a half-width, so it meanders instead of running
 * straight. Reference 2's river does exactly this and it is the single biggest
 * reason that map reads as a landscape rather than as a diagram.
 */
export function riverAt(row) {
  // Runs the full height now, entering at the TOP RIGHT rather than starting a
  // quarter of the way down the middle. Keeping it to the right-hand third for
  // its whole length leaves the left free for the road, so the two meet only
  // where a crossing is wanted instead of fighting each other all the way down.
  if (row < 0 || row > 118) return null;
  const t = row / 118;
  const centre = 32
    + 6 * Math.sin(t * Math.PI * 2.2 + 0.6)
    + 2.5 * Math.sin(t * Math.PI * 5.0);
  const half = 2.8 + 1.2 * Math.sin(t * Math.PI * 3.7);
  return { centre, half };
}


/**
 * Grading, so the valley sits in the site's amber world rather than in the
 * reference's bright green. Kept here rather than in SITE_GRADE because the
 * sheet names are this map's own — and because SITE_GRADE is being edited by
 * another session.
 *
 * The rule that matters: real autumn artwork is never graded. Pixel Crawler's
 * orange and amber trees, and the rust bushes, already ship the colours this
 * palette wants (HANDOFF §9.10). Only the greens that have no autumn variant —
 * grass, the Cute Fantasy canopies, the Kibyra maples — get rotated.
 */
const FOLIAGE = { rotate: -84, sat: 1.55, light: 0.96 };
const CANOPY = { rotate: -82, sat: 1.45, light: 1.0 };

export const VALLEY_GRADE = {
  // Lighter and less saturated than the old map's grass. Rotating green to
  // amber at the source's own lightness lands it near HSL l25 — mud, not amber —
  // which is the fault §9.8 records and which this map reproduced exactly on the
  // first pass. The lift is what puts it back in the amber band.
  grass: { greens: { rotate: -84, sat: 1.28, light: 1.16 } },
  decor: { greens: { rotate: -84, sat: 1.3, light: 1.1 } },
  tree: { greens: CANOPY },
  treeSmall: { greens: CANOPY },
  // Only a small rotation: the path is already a warm tan, and taking it the
  // full -12deg drove it to salmon-pink against the lifted grass.
  path: { filter: 'hue-rotate(-4deg) saturate(.82) brightness(1.04)', greens: FOLIAGE },
  // Two-thirds the brightness of the road and a touch more saturated: the
  // reference's ground is mid-brown earth with the tracks worn pale through it,
  // and that value gap is the only thing making a road read as a road.
  earth: { filter: 'hue-rotate(-6deg) saturate(1.02) brightness(.66)', greens: FOLIAGE },
  water: { filter: 'hue-rotate(6deg) saturate(.7) brightness(.5)', greens: FOLIAGE },
  cliff: { filter: 'hue-rotate(-12deg) saturate(.95) brightness(.9)', greens: FOLIAGE },
  beach: { filter: 'hue-rotate(12deg) saturate(.78) brightness(1.02)', greens: FOLIAGE },
  farm: { filter: 'hue-rotate(4deg) saturate(.55) brightness(.95)', greens: FOLIAGE },
  bridge: { filter: 'hue-rotate(-10deg) brightness(.95)', greens: FOLIAGE },
  fences: { filter: 'hue-rotate(-10deg) brightness(.95)', greens: FOLIAGE },

  // Kibyra's maples are green; the Pixel Crawler autumn pair are not.
  maple3: { greens: CANOPY }, maple5: { greens: CANOPY },
  maple7: { greens: CANOPY }, maple14: { greens: CANOPY },
  kbush2: { greens: FOLIAGE }, kbush7: { greens: FOLIAGE },
  kbush12: { greens: FOLIAGE }, kbush19: { greens: FOLIAGE },
  hedge: { greens: FOLIAGE },

  // Conifers stay cool and dark on purpose: they are the barrier between
  // chapters, and a dark mass is what gives an amber world a visible edge.
  conifer: { filter: 'saturate(.85) brightness(.82)' },
  conifer2: { filter: 'saturate(.85) brightness(.82)' },
  coniferSmall: { filter: 'saturate(.85) brightness(.82)' },

  houseBlue: { filter: 'brightness(.92)' },
  rockBig: { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
  rockMid: { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
  rockSm: { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
};

/** The four chapters. Bands are generous — the references give travel as much
    room as arrival, and the old map's 12-row regions could not breathe. */
export const REGIONS = [
  // `ground` is the base the whole band is painted with, before anything else.
  // The base-map reference gives every chapter its own floor colour — warm brown
  // earth under the autumn town, green under the farmland, sand at the coast —
  // and that single decision does more to separate the chapters than any barrier
  // does. The old map painted one grass everywhere and relied on trees to tell
  // them apart, which is why it read as one long strip.
  { id: 'mesra',    rows: [0, 34],    label: 'Mesra · Ranchi',    years: '2016 – 2021', ground: 'earth' },
  { id: 'town',     rows: [34, 68],   label: 'Ranchi',            years: '2018 – 2019', ground: 'earth' },
  { id: 'delhi',    rows: [68, 100],  label: 'New Delhi',         years: '2021 – 2022', ground: 'grass' },
  { id: 'practice', rows: [100, 122], label: 'Ranchi · Practice', years: '2022 – 2025', ground: 'grass' },
  { id: 'dhahran',  rows: [122, 164], label: 'Dhahran · KSA',     years: '2025 – 2026', ground: 'sand' },
];

/**
 * Field patchwork — the farmland's texture, and the thing the reference uses to
 * fill large areas without emptiness. Big rectangles of tilled earth and crop,
 * aligned to the paths rather than scattered, each fenced on its road edge.
 */
export const FIELDS = [
  [0, 102, 9, 8], [0, 112, 9, 7],
  [30, 102, 12, 7], [31, 111, 11, 8],
  [0, 76, 7, 9], [35, 78, 8, 10],
  [33, 92, 9, 6],
];

/** Stands of wheat — drawn as farm tiles with wheat decor, per the reference. */
export const WHEAT = [
  [0, 88, 6, 9], [36, 66, 8, 8], [2, 66, 6, 7],
];

/** Cliff crossings — gaps you pass through to change chapter (§9.9 rule 5). */
export const CROSSINGS = [
  { id: 'gate', kind: 'cliff', rows: [3, 5],   gap: [10, 14] },
  // The gap has to sit where the road actually is. Re-routing the road east
  // without moving this left the cliff straddling it and ten road cells were
  // deleted as un-buildable — the road came apart at the pass.
  { id: 'pass', kind: 'cliff', rows: [66, 68], gap: [36, 41] },
];

/** The sea between India and Saudi Arabia. */
export const SEA = { row: 120, height: 6 };

/**
 * THE SEVEN. `anchor` is the BOTTOM-CENTRE cell — buildings are placed by where
 * they meet the ground, which is how they get compared against a path or a
 * plaza. `sprite` is a complete drawing; nothing here is composed.
 */
export const STOPS = [
  { id: 'barch', sprite: 'instAcademic', row: 22, side: 'E', at: 20,
    period: 'Jul 2016 – Jun 2021',
    role: 'Bachelor of Architecture (B.Arch.) — First Class with Distinction',
    org: 'Birla Institute of Technology (BIT), Mesra · Ranchi, India',
    note: 'CGPA 7.61/10. Thesis: Twin Tower Complex — Mixed-Use Net-Zero Energy High-Rise.' },

  { id: 'chadda', sprite: 'offManor2', row: 46, side: 'W', at: 52,
    period: 'May 2018 – Jun 2018',
    role: 'Architectural Intern',
    org: 'Chadda and Associates · Ranchi, India',
    note: 'Floor plans, sections, elevations and structural drawings for municipal permitting.' },

  { id: 'metarch1', sprite: 'offCottage', row: 62, side: 'E', at: 70,
    period: 'May 2019 – Jun 2019',
    role: 'Architectural Intern',
    org: 'Metarch Studios · Ranchi, India',
    note: 'Measured drawings, construction documentation and 2D/3D CAD renderings.' },

  { id: 'jaiswal', sprite: 'offManor3', row: 82, side: 'E', at: 96,
    period: 'Jan 2021 – May 2021',
    role: 'Architectural Intern',
    org: 'Jaiswal & Associates · New Delhi, India',
    note: '3D models, photorealistic renderings and drawing sets for 10+ projects.' },

  { id: 'medicfibers', sprite: 'offManor1', row: 94, side: 'E', at: 112,
    period: 'May 2021 – Apr 2022',
    role: 'Graphic Designer',
    org: 'Medicfibers · New Delhi, India',
    note: 'Investment pitch decks and brand assets. Engagement 3×, brand visibility +40%.' },

  { id: 'metarch2', sprite: 'offFarmhouse', row: 114, side: 'W', at: 140,
    period: 'Mar 2022 – Aug 2025',
    role: 'Project Architect',
    org: 'Metarch Studios · Ranchi, India',
    note: 'Led a $720K portfolio. 100% on-time delivery, change orders down 8%.' },

  { id: 'kfupm', sprite: 'instResearch', row: 136, side: 'E', at: 172,
    period: 'Aug 2025 – Aug 2026 (Expected)',
    role: 'Master of Science in Smart & Sustainable Cities',
    org: 'King Fahd University of Petroleum & Minerals (KFUPM) · Dhahran, KSA',
    note: 'GPA 4.0/4.0. Thesis: Smart Digital Twin Framework for Urban Heat Island Monitoring.' },
];

/** Buildings that are not events — a settlement needs a far side. */
export const FILLERS = [
  { sprite: 'houseRed',   row: 14, side: 'W' },
  { sprite: 'offLshape',   row: 30, side: 'W' },
  { sprite: 'houseBlue',  row: 34, side: 'E' },
  { sprite: 'houseRed',   row: 42, side: 'E' },
  { sprite: 'offManor2',  row: 54, side: 'W' },
  { sprite: 'houseBlue',  row: 62, side: 'W' },
  { sprite: 'houseRed',   row: 70, side: 'W' },
  { sprite: 'offManor2',  row: 76, side: 'E' },
  { sprite: 'houseBlue',  row: 90, side: 'E' },
  { sprite: 'houseRed',   row: 104, side: 'W' },
  { sprite: 'houseRed',   row: 110, side: 'E' },
  { sprite: 'houseBlue',  row: 122, side: 'W' },
  { sprite: 'stall',      row: 132, side: 'W' },
];

/**
 * THE PATH. Follows the valley rather than cutting across it, and crosses the
 * river only at the bridges. Axis-aligned so `pointAt` stays trivial.
 */
/**
 * Routed AGAINST the river, not independently of it. The river makes a long
 * S-bend — east of centre to row 66, hard west across rows 66-94, back to the
 * middle by 106 — and the first path ignored that completely: it was drowned
 * across six separate stretches totalling forty rows, and since drowned road
 * cells are deleted, the road came out in six disconnected pieces.
 *
 * It now hugs the west bank down to row 58, crosses ONCE where the river is at
 * its narrowest (row 58, four tiles wide), runs the east bank the rest of the
 * way, and crosses the sea on the causeway. Two crossings, both deliberate,
 * both derived rather than declared — see `waterCrossings()`.
 */
export const PATH = [
  [10, 0], [10, 14],
  [5, 14], [5, 40],
  [13, 40], [13, 64],
  [38, 64], [38, 88],     // cross east over the river
  [20, 88], [20, 104],    // and back west
  [10, 104], [10, 122],
  [22, 122], [22, 162],   // the causeway, then the KFUPM plaza
  // ^ ran to 138 when the map was 140 rows. Extended with ROWS so a fresh
  // generate still carries the road to the bottom edge; the SAVED document
  // was grown separately by tools/grow-map.mjs and is unaffected by this.
];

/**
 * Spurs off the spine. The references never show a single road — they show a
 * network that branches to each door and dead-ends in yards, and that is most
 * of why their villages read as places rather than as a route with things
 * beside it. Same polyline form as PATH, drawn a tile narrower.
 */
export const SPURS = [
  [[5, 22], [14, 22]],
  [[5, 32], [12, 32], [12, 36]],
  [[13, 48], [22, 48]],
  [[13, 56], [6, 56]],
  [[38, 72], [30, 72]],
  [[20, 94], [12, 94]],
  [[10, 110], [2, 110]],
  [[10, 116], [18, 116]],
  [[22, 130], [34, 130]],
  [[22, 134], [12, 134]],
];

function segments() {
  const segs = []; let total = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [x0, y0] = PATH[i], [x1, y1] = PATH[i + 1];
    const len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
    segs.push({ x0, y0, x1, y1, len, start: total });
    total += len;
  }
  return { segs, total };
}
export const { segs: SEGMENTS, total: PATH_LENGTH } = segments();

export function pointAt(d) {
  const dist = Math.max(0, Math.min(PATH_LENGTH, d));
  for (const s of SEGMENTS) {
    if (dist <= s.start + s.len || s === SEGMENTS[SEGMENTS.length - 1]) {
      const t = s.len === 0 ? 0 : (dist - s.start) / s.len;
      return { x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t };
    }
  }
  return { x: PATH[0][0], y: PATH[0][1] };
}

/** True where water lies, before any bridge is considered. */
export function isWaterCell(c, r) {
  if (r >= SEA.row && r < SEA.row + SEA.height) return true;
  const rv = riverAt(r);
  if (!rv) return false;
  return c >= Math.round(rv.centre - rv.half) && c <= Math.round(rv.centre + rv.half);
}

/**
 * Bridges, DERIVED from where the path actually meets water.
 *
 * Hardcoding bridge rectangles and hoping they line up with the route is what
 * broke the first version — three declared bridges against six real crossings.
 * Walking the path and emitting a deck wherever it goes wet cannot disagree
 * with the route, because it is computed from it.
 */
export function waterCrossings() {
  const wet = [];
  for (let d = 0; d <= PATH_LENGTH; d += 0.5) {
    const p = pointAt(d);
    const c = Math.round(p.x), r = Math.round(p.y);
    if (isWaterCell(c, r)) wet.push([c, r]);
  }
  if (!wet.length) return [];

  // Group contiguous wet stretches into one deck each.
  const decks = [];
  let cur = null;
  for (const [c, r] of wet) {
    // Track the extent as min/max, not "last seen". Assigning c1 = c walks the
    // far edge backwards whenever the route crosses right-to-left, collapsing
    // the deck to a single column — which left seven road cells in open water
    // on the westward crossing.
    if (cur && Math.abs(r - cur.rLast) <= 1 && Math.abs(c - cur.cLast) <= 1) {
      cur.c0 = Math.min(cur.c0, c); cur.c1 = Math.max(cur.c1, c);
      cur.r0 = Math.min(cur.r0, r); cur.r1 = Math.max(cur.r1, r);
      cur.cLast = c; cur.rLast = r;
    } else {
      cur = { c0: c, c1: c, r0: r, r1: r, cLast: c, rLast: r };
      decks.push(cur);
    }
  }
  // A deck runs two tiles onto dry land at each end, so it lands on a bank
  // rather than stopping at the waterline.
  return decks.map((d, i) => ({
    id: `deck${i}`, kind: 'bridge',
    cols: [d.c0 - 1, d.c1 + 1],
    rows: [d.r0 - 2, d.r1 + 2],
  }));
}

/** Which columns the path occupies at a given row — what buildings front onto. */
export function pathColsAt(row) {
  const cols = [];
  for (const s of SEGMENTS) {
    if (s.y0 === s.y1) {
      if (s.y0 === row) { cols.push(Math.min(s.x0, s.x1), Math.max(s.x0, s.x1)); }
    } else if (row >= Math.min(s.y0, s.y1) && row <= Math.max(s.y0, s.y1)) {
      cols.push(s.x0);
    }
  }
  return cols;
}

/** Cells the 3-wide path covers. */
export function pathCells() {
  const cells = new Set();
  for (const line of SPURS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [x0, y0] = line[i], [x1, y1] = line[i + 1];
      const len = Math.abs(x1 - x0) + Math.abs(y1 - y0);
      const horiz = y0 === y1;
      for (let k = 0; k <= len; k++) {
        const t = len === 0 ? 0 : k / len;
        const x = Math.round(x0 + (x1 - x0) * t);
        const y = Math.round(y0 + (y1 - y0) * t);
        cells.add(`${x},${y}`);
        cells.add(`${x + (horiz ? 0 : 1)},${y + (horiz ? 1 : 0)}`);
      }
    }
  }
  for (const s of SEGMENTS) {
    for (let i = 0; i <= s.len; i++) {
      const t = s.len === 0 ? 0 : i / s.len;
      const x = Math.round(s.x0 + (s.x1 - s.x0) * t);
      const y = Math.round(s.y0 + (s.y1 - s.y0) * t);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) cells.add(`${x + dx},${y + dy}`);
    }
  }
  return cells;
}

/** Clearings — where the path widens into a settlement (§9.9 rule 2). */
export const CLEARINGS = [
  [7, 13, 12, 8],    // BIT quad
  [5, 44, 12, 10],   // town green
  [22, 56, 10, 12],  // metarch1 forecourt
  [5, 78, 14, 12],   // Delhi plaza west
  [20, 90, 12, 10],  // Delhi plaza east
  [5, 110, 14, 10],  // practice yard
  [14, 128, 18, 10], // KFUPM plaza
];
