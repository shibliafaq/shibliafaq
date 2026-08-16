/**
 * THE DOCUMENT MODEL — what makes the valley editable.
 *
 * `buildValley()` is a generator: the river is a sine curve, the woods are a
 * spatial hash, the buildings are a slot search. That is good for producing a
 * coherent map and useless for editing one, because there is nothing to grab —
 * every pixel is the output of a rule, and moving a building means changing the
 * rule that placed it.
 *
 * So the generator is run ONCE and its output is captured into a document:
 *
 *   terrain   Uint8Array, one terrain id per cell — the ground, baked flat
 *   objects   [{ name, c, r }]  every sprite, in draw order
 *   decors    [{ name, c, r }]  every 16px decor tile
 *
 * From then on the document is the truth and the generator is irrelevant. The
 * editor moves entries in `objects`, paints ids into `terrain`, and `renderDoc`
 * turns the whole thing back into a Scene. Nothing procedural survives into the
 * edit loop, which is what makes every part of the map reachable.
 *
 * Capturing is done with a Scene subclass rather than by rewriting the
 * generator, so the generator stays the single description of how a fresh map is
 * composed and cannot drift from what the editor loads.
 */

import { Scene, COLS, ROWS, TILE, SPRITES, DECOR } from './valley.js';
import { buildValley } from './valleybuild.js';

/** Terrain ids. Order matters at render time — see `renderDoc`. */
export const T = {
  GRASS: 0, PATH: 1, WATER: 2, CLIFF: 3, SAND: 4, FARM: 5, BRIDGE: 6,
  // Desert grounds, from the Craftpix pack. Appended, never renumbered: the id
  // IS the saved value, so changing an existing number silently repaints every
  // document ever saved. New ids are safe because no old document contains them.
  DUNE: 7, GRAVEL: 8, CRACKED: 9, DROAD: 10, DPAVE: 11,
  // The remaining four desert grounds. These shipped first as placeable sprites,
  // which meant covering ground one 16px click at a time — nearly a hundred of
  // them went down that way before this existed. They are terrain; terrain is
  // painted. The sprite entries stay in valley.js so the ones already placed
  // keep drawing, but the brush is the way to lay ground from here on.
  SAND1: 12, SAND2: 13, SAND3: 14, DFLAT: 15,
};

export const TERRAIN_NAME = {
  [T.GRASS]: 'grass', [T.PATH]: 'path', [T.WATER]: 'water',
  [T.CLIFF]: 'cliff', [T.SAND]: 'beach', [T.FARM]: 'farm', [T.BRIDGE]: 'bridge',
  [T.DUNE]: 'dsDune', [T.GRAVEL]: 'dsGravel', [T.CRACKED]: 'dsCracked',
  [T.DROAD]: 'dsRoadWarm', [T.DPAVE]: 'dsRoadGrey',
  [T.SAND1]: 'dsSand1', [T.SAND2]: 'dsSand2', [T.SAND3]: 'dsSand3',
  [T.DFLAT]: 'dsBg',
};

const SHEET_TO_ID = {
  grass: T.GRASS, path: T.PATH, water: T.WATER,
  cliff: T.CLIFF, beach: T.SAND, farm: T.FARM, bridge: T.BRIDGE,
  dsDune: T.DUNE, dsGravel: T.GRAVEL, dsCracked: T.CRACKED,
  dsRoadWarm: T.DROAD, dsRoadGrey: T.DPAVE,
  dsSand1: T.SAND1, dsSand2: T.SAND2, dsSand3: T.SAND3, dsBg: T.DFLAT,
};

/**
 * Terrain laid as flat tiles, and WHICH CELL of its sheet to lay.
 *
 * The distinction matters and is easy to get wrong. `beach` is a 3x3 shoreline
 * sheet, so laying it flat means taking its CENTRE cell (1,1) — its edge cells
 * are sand-meets-water and paint a blue stripe against dry land. The desert
 * grounds are single 16x16 images, so cell (0,0) is the whole tile.
 *
 * Everything not listed here is nine-sliced instead, in `renderDoc`.
 */
export const FLAT_TERRAIN = {
  [T.SAND]: [1, 1],
  [T.DUNE]: [0, 0], [T.GRAVEL]: [0, 0], [T.CRACKED]: [0, 0],
  [T.SAND1]: [0, 0], [T.SAND2]: [0, 0], [T.SAND3]: [0, 0], [T.DFLAT]: [0, 0],
};

/** Human labels for the palette. */
export const TERRAIN_LABEL = {
  [T.GRASS]: 'Grass', [T.PATH]: 'Path', [T.WATER]: 'Water',
  [T.CLIFF]: 'Cliff', [T.SAND]: 'Sand', [T.FARM]: 'Farm', [T.BRIDGE]: 'Bridge',
  [T.DUNE]: 'Dune', [T.GRAVEL]: 'Gravel', [T.CRACKED]: 'Cracked earth',
  [T.DROAD]: 'Desert road', [T.DPAVE]: 'Stone paving',
  [T.SAND1]: 'Sand A', [T.SAND2]: 'Sand B', [T.SAND3]: 'Sand C',
  [T.DFLAT]: 'Desert flat',
};

/**
 * A Scene that records what it is asked to draw.
 *
 * `blob(sheet, has)` is the interesting one: the generator describes terrain as
 * a predicate over the grid, so evaluating that predicate once per cell is
 * exactly the bake. Later blobs overwrite earlier ones, which reproduces the
 * generator's own layering (sand under water under cliff under path).
 */
class DocScene extends Scene {
  constructor(cols, rows) {
    super(cols, rows);
    this.terrain = new Uint8Array(cols * rows);
    this.objects = [];
    this.decors = [];
  }

  blob(sheet, has) {
    const id = SHEET_TO_ID[sheet];
    if (id !== undefined) {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          if (has(c, r)) this.terrain[r * this.cols + c] = id;
    }
    return super.blob(sheet, has);
  }

  /**
   * Ground laid as flat tiles has to be recorded too, not just the blobs.
   *
   * This recorded only `grass` and `bridge`, which quietly lost the whole desert:
   * step 2 of the generator floors each chapter by calling
   * `tile(groundTile[region.ground], 1, 1, c, r)`, and for Dhahran that sheet is
   * `beach`. It DREW as sand and BAKED as grass, so a fresh generate looked
   * right on screen and came back green the moment it was reloaded from its own
   * document. Confirmed by counting: a generate produced 0 cells of T.SAND.
   *
   * `earth` is deliberately absent — it is the path sheet graded darker, used as
   * a floor colour, and there is no terrain id for it; recording it as PATH would
   * turn two whole chapters into road.
   */
  tile(sheet, col, row, cx, cy, layer = 0) {
    if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) {
      const id = { grass: T.GRASS, bridge: T.BRIDGE, beach: T.SAND,
        dsDune: T.DUNE, dsGravel: T.GRAVEL, dsCracked: T.CRACKED,
        dsSand1: T.SAND1, dsSand2: T.SAND2, dsSand3: T.SAND3, dsBg: T.DFLAT }[sheet];
      if (id !== undefined) this.terrain[cy * this.cols + cx] = id;
    }
    return super.tile(sheet, col, row, cx, cy, layer);
  }

  decor(name, cx, cy) {
    if (DECOR[name]) this.decors.push({ name, c: cx, r: cy });
    return super.decor(name, cx, cy);
  }

  sprite(name, cx, cy, layer = 1, sx = 1, sy = sx) {
    if (SPRITES[name]) this.objects.push({ name, c: cx, r: cy, sx, sy });
    return super.sprite(name, cx, cy, layer, sx, sy);
  }
}

/** Generate a fresh document from the procedural map. */
export function makeDoc() {
  const captured = [];
  // buildValley constructs its own Scene, so swap the constructor it sees.
  const built = buildValley(DocScene, captured);
  const s = built.scene;
  return {
    version: 1,
    cols: COLS, rows: ROWS,
    terrain: Array.from(s.terrain),
    objects: s.objects.map((o, i) => ({ id: `o${i}`, ...o })),
    decors: s.decors.map((d, i) => ({ id: `d${i}`, ...d })),
    check: built.check,
  };
}

/** Turn a document back into a renderable Scene. */
export function renderDoc(doc) {
  const scene = new Scene(doc.cols, doc.rows);
  const terr = doc.terrain;
  /**
   * Out-of-bounds reads CLAMP to the edge cell rather than reporting "nothing".
   *
   * This is what removes the blue border round the desert. `beach` is a
   * shoreline sheet — its nine-slice edge tiles are drawn as sand-meets-water
   * (HANDOFF §9.8) — and the generator dodged that by pushing the beach rect two
   * tiles off the map so its edges never drew. Baking the terrain into a grid
   * clips it back to the map, so every boundary cell became an edge again and
   * the sheet duly drew its blue water edge along the frame.
   *
   * Clamping makes a boundary cell see itself as its own neighbour, so it
   * resolves to a centre tile and the terrain runs off the frame the way it did
   * before the bake. Fixes the same class of seam for water, path and cliff.
   */
  const at = (c, r) => terr[
    Math.min(doc.rows - 1, Math.max(0, r)) * doc.cols + Math.min(doc.cols - 1, Math.max(0, c))
  ];

  // Grass underneath everything, so a cell painted back to grass has ground.
  for (let r = 0; r < doc.rows; r++)
    for (let c = 0; c < doc.cols; c++) scene.tile('grass', 0, 0, c, r);

  /**
   * SAND IS NOT NINE-SLICED. Every other terrain is.
   *
   * `beach` is a shoreline sheet: its edge tiles are drawn as sand-meets-WATER.
   * Nine-slicing it means it paints that blue shoreline against *any* neighbour
   * that is not sand — so the desert came out ringed in blue not only at the map
   * frame but along both sides of the path running through it, which is where
   * the border actually came from. There is no arrangement of neighbours that
   * makes those edge tiles correct against dry land.
   *
   * So sand is laid as its centre tile everywhere and simply butts against what
   * is next to it. The generator got this right by accident — it pushed the
   * beach rect two tiles off the map so only centre tiles ever drew — and the
   * bake is what exposed it. The path's own blob draws its edges on top, which
   * is what gives the join a proper edge.
   */
  for (let r = 0; r < doc.rows; r++)
    for (let c = 0; c < doc.cols; c++) {
      const cell = FLAT_TERRAIN[at(c, r)];
      if (cell) scene.tile(TERRAIN_NAME[at(c, r)], cell[0], cell[1], c, r);
    }

  // Blobbed in the generator's own order — later types sit on earlier ones.
  // The desert paving blobs last so it lays over the ground it crosses,
  // the same way the valley path does.
  for (const id of [T.FARM, T.WATER, T.CLIFF, T.PATH, T.DROAD, T.DPAVE]) {
    scene.blob(TERRAIN_NAME[id], (c, r) => at(c, r) === id);
  }

  for (let r = 0; r < doc.rows; r++)
    for (let c = 0; c < doc.cols; c++)
      if (at(c, r) === T.BRIDGE) scene.tile('bridge', 1, 1, c, r, 0);

  for (const d of doc.decors) scene.decor(d.name, d.c, d.r);
  for (const o of doc.objects) scene.sprite(o.name, o.c, o.r, 1, xs(o), ys(o));

  return scene;
}

/**
 * Independent x and y scale. `scale` is still honoured so documents saved before
 * the resizer became two-axis still open.
 */
export const xs = (o) => o.sx ?? o.scale ?? 1;
export const ys = (o) => o.sy ?? o.scale ?? 1;

/** The exact drawn rect in map pixels — what the resize handles operate on. */
export function objRect(o) {
  const s = SPRITES[o.name] || [TILE, TILE];
  const dw = Math.max(1, Math.round(s[0] * xs(o)));
  const dh = Math.max(1, Math.round(s[1] * ys(o)));
  return { x: Math.round(o.c * TILE + TILE / 2 - dw / 2), y: o.r * TILE - dh + TILE, dw, dh, sw: s[0], sh: s[1] };
}

/**
 * Place an object so its drawn rect matches `rect`, deriving the anchor back
 * out. The anchor is bottom-centre, so the bottom edge and the horizontal
 * centre are what determine it — this is the inverse of objRect and is what
 * lets a drag handle move an edge and have the opposite edge stay put.
 */
export function setObjRect(o, x, y, dw, dh) {
  const s = SPRITES[o.name] || [TILE, TILE];
  o.sx = Math.max(0.05, dw / s[0]);
  o.sy = Math.max(0.05, dh / s[1]);
  delete o.scale;
  o.c = Math.round((x + dw / 2 - TILE / 2) / TILE);
  o.r = Math.round((y + dh - TILE) / TILE);
}

/** The tile box a placed object covers — what click-picking and nudging use. */
export function objBox(o) {
  const s = SPRITES[o.name];
  if (!s) return { c0: o.c, c1: o.c, r0: o.r, r1: o.r, tw: 1, th: 1 };
  const tw = Math.max(1, Math.ceil((s[0] * xs(o)) / TILE));
  const th = Math.max(1, Math.ceil((s[1] * ys(o)) / TILE));
  const c0 = o.c - Math.floor(tw / 2);
  return { c0, c1: c0 + tw - 1, r0: o.r - th + 1, r1: o.r, tw, th };
}

/** Topmost object covering a cell — later entries draw in front, so search back. */
export function pickAt(doc, c, r) {
  for (let i = doc.objects.length - 1; i >= 0; i--) {
    const b = objBox(doc.objects[i]);
    if (c >= b.c0 && c <= b.c1 && r >= b.r0 && r <= b.r1) return doc.objects[i];
  }
  for (let i = doc.decors.length - 1; i >= 0; i--) {
    const d = doc.decors[i];
    if (d.c === c && d.r === r) return d;
  }
  return null;
}

export const serialise = (doc) => JSON.stringify(doc);

/**
 * Widen a document saved before the map grew, by padding grass onto the EAST
 * edge. Objects keep their coordinates untouched, which is the whole reason the
 * map was widened eastward rather than symmetrically — growing on both sides
 * would shift every hand-placed building.
 */
export function migrateDoc(d) {
  if (d.cols === COLS && d.rows === ROWS) return d;
  const terr = new Array(COLS * ROWS).fill(T.GRASS);
  for (let r = 0; r < Math.min(d.rows, ROWS); r++)
    for (let c = 0; c < Math.min(d.cols, COLS); c++)
      terr[r * COLS + c] = d.terrain[r * d.cols + c];
  d.terrain = terr;
  d.migratedFrom = `${d.cols}x${d.rows}`;
  d.cols = COLS; d.rows = ROWS;
  return d;
}

export const deserialise = (json) => {
  const d = typeof json === 'string' ? JSON.parse(json) : json;
  if (!d || !Array.isArray(d.terrain)) throw new Error('not a valley document');
  return migrateDoc(d);
};
