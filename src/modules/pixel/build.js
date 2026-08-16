import { Grid, rng } from './grid.js';

/**
 * Sprite generators.
 *
 * Everything here returns a character grid in the same format as sprites.js.
 * The point of generating rather than hand-authoring is detail density: a
 * shingled roof is ~15 courses of alternating value, a window is a frame plus
 * mullions plus glass, and a tree canopy is layered clumps. Typing that by hand
 * at ref-5 resolution is where the first attempt lost its detail.
 *
 * Authoring resolution matches ref 5 — roughly 480px across a scene, so a
 * house is ~70px wide and has room for features rather than being a coloured
 * box with a triangle on top.
 */

/* ============================================================
   GROUND
   ============================================================ */

/**
 * Grass with clumps rather than single-pixel speckle. The references vary grass
 * in patches several pixels across; isolated dots just read as noise.
 */
export function makeGrass(size = 32, seed = 7) {
  const g = new Grid(size, size, 'g');
  const r = rng(seed);

  for (let i = 0; i < 14; i++) {
    const cx = Math.floor(r() * size);
    const cy = Math.floor(r() * size);
    const rx = 2 + Math.floor(r() * 3);
    const ry = 1 + Math.floor(r() * 2);
    g.ellipse(cx, cy, rx, ry, r() > 0.45 ? 'G' : 'h');
  }

  // Tufts — two-pixel uprights, the motif ref 5 scatters across open ground.
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(r() * size);
    const y = Math.floor(r() * size);
    g.set(x, y, 'h').set(x, y - 1, 'h').set(x + 1, y, 'G');
  }

  return g.toSprite();
}

export function makePath(size = 32, seed = 11) {
  const g = new Grid(size, size, 'p');
  const r = rng(seed);

  for (let i = 0; i < 10; i++) {
    const cx = Math.floor(r() * size);
    const cy = Math.floor(r() * size);
    g.ellipse(cx, cy, 1 + Math.floor(r() * 3), 1, r() > 0.5 ? 'P' : 'd');
  }
  // Pebbles.
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(r() * size);
    const y = Math.floor(r() * size);
    g.set(x, y, 'd').set(x + 1, y, 'P');
  }
  return g.toSprite();
}

export function makeWater(size = 32, seed = 23) {
  const g = new Grid(size, size, 'w');
  const r = rng(seed);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * size);
    const y = Math.floor(r() * size);
    const len = 2 + Math.floor(r() * 4);
    g.hLine(x, y, len, 'W');
  }
  return g.toSprite();
}

/**
 * Stone bank between grass and water. Ref 5 never lets water meet grass
 * directly — there is always a dark rocky lip, and it is most of why the water
 * reads as sunken rather than painted on.
 */
export function makeBank(w = 32, seed = 31) {
  const h = 10;
  const g = new Grid(w, h, '.');
  const r = rng(seed);

  g.rect(0, 0, w, 6, 'c');   // dark stone face
  g.rect(0, 0, w, 2, 'b');   // lit top edge

  // Block joints.
  let x = 0;
  while (x < w) {
    const bw = 4 + Math.floor(r() * 4);
    g.vLine(x, 1, 5, 'o');
    x += bw;
  }
  g.hLine(0, 5, w, 'o');

  // Scalloped waterline.
  for (let i = 0; i < w; i++) {
    const d = r() > 0.6 ? 1 : 0;
    g.set(i, 6 + d, 'W');
  }
  return g.toSprite();
}

/* ============================================================
   BUILDINGS
   ============================================================ */

/**
 * A house in 3/4 view: overhanging shingled roof, ridge cap, chimney, then a
 * façade with framed windows and a panelled door on a stone foundation.
 *
 * Light is top-left throughout — the left half of the roof takes 'R', the right
 * half 'r', and every course carries a dark line at its lower edge.
 */
export function makeHouse({
  wallW = 46,
  wallH = 26,
  roofH = 26,
  overhang = 6,
  windows = 2,
  chimney = true,
  seed = 3,
} = {}) {
  const roofW = wallW + overhang * 2;
  const w = roofW + 4;
  const h = roofH + wallH + 8;
  const g = new Grid(w, h, '.');
  const r = rng(seed);

  const cx = Math.floor(w / 2);
  const roofTop = chimney ? 6 : 2;
  const wallTop = roofTop + roofH;
  const wallX = cx - Math.floor(wallW / 2);

  // ---- chimney (drawn first so the roof overlaps its base) ----
  if (chimney) {
    const chx = cx - Math.floor(roofW / 4);
    g.rect(chx, 1, 7, 10, 'c');
    g.rect(chx, 1, 4, 10, 'b');
    g.hLine(chx - 1, 0, 9, 'B');
  }

  // ---- roof ----
  g.trapezoid(cx, roofTop, 10, roofW, roofH, 'r');

  // Lit slope: left of centre.
  for (let j = 0; j < roofH; j++) {
    const t = roofH === 1 ? 0 : j / (roofH - 1);
    const rw = Math.round(10 + (roofW - 10) * t);
    const x0 = Math.round(cx - rw / 2);
    g.rect(x0, roofTop + j, Math.round(rw * 0.46), 1, 'R');
  }

  // Shingle courses — a dark line every 4 rows, which is what stops the roof
  // reading as a flat triangle.
  for (let j = 3; j < roofH; j += 4) {
    const t = j / (roofH - 1);
    const rw = Math.round(10 + (roofW - 10) * t);
    const x0 = Math.round(cx - rw / 2);
    g.rect(x0, roofTop + j, rw, 1, 's');
    // Broken vertical joints, offset per course.
    const off = (j % 8 === 3) ? 0 : 4;
    for (let i = off; i < rw; i += 8) g.set(x0 + i, roofTop + j - 1, 's');
  }

  // Ridge cap.
  g.rect(cx - 6, roofTop, 12, 2, 'R');
  // Eaves shadow onto the wall.
  g.rect(cx - Math.floor(roofW / 2), wallTop, roofW, 1, 's');

  // ---- wall ----
  g.rect(wallX, wallTop + 1, wallW, wallH, 'b');
  // Lit face on the left third.
  g.rect(wallX, wallTop + 1, Math.round(wallW * 0.34), wallH, 'B');
  // Plank lines.
  for (let j = wallTop + 4; j < wallTop + wallH; j += 5) {
    g.rect(wallX, j, wallW, 1, 'c');
  }
  // Stone foundation.
  g.rect(wallX, wallTop + wallH - 3, wallW, 3, 'c');
  for (let i = 0; i < wallW; i += 6) g.vLine(wallX + i, wallTop + wallH - 3, 3, 'o');

  // ---- door ----
  const dw = 9;
  const dh = 14;
  const dx = cx - Math.floor(dw / 2);
  const dy = wallTop + wallH - dh;
  g.rect(dx - 1, dy - 1, dw + 2, dh + 1, 'o');
  g.rect(dx, dy, dw, dh, 'n');
  g.vLine(dx + 1, dy + 1, dh - 2, 'y');       // lit edge of the frame
  g.set(dx + dw - 2, dy + Math.floor(dh / 2), 'y'); // handle

  // ---- windows ----
  const ww = 9;
  const wh = 8;
  const wy = wallTop + 5;
  const span = wallW - 12;
  for (let i = 0; i < windows; i++) {
    const t = windows === 1 ? 0.5 : i / (windows - 1);
    let wx = Math.round(wallX + 6 + (span - ww) * t);
    // Keep clear of the doorway.
    if (Math.abs(wx + ww / 2 - cx) < dw) wx += wx < cx ? -(dw + 2) : (dw + 2);
    g.rect(wx - 1, wy - 1, ww + 2, wh + 2, 'o');
    g.rect(wx, wy, ww, wh, 'y');
    g.vLine(wx + Math.floor(ww / 2), wy, wh, 'o');       // mullion
    g.hLine(wx, wy + Math.floor(wh / 2), ww, 'o');       // transom
  }

  // A couple of roof-edge nicks so the silhouette is not machine-perfect.
  for (let i = 0; i < 3; i++) {
    const j = 4 + Math.floor(r() * (roofH - 8));
    const t = j / (roofH - 1);
    const rw = Math.round(10 + (roofW - 10) * t);
    g.set(Math.round(cx + rw / 2) - 1, roofTop + j, 's');
  }

  g.outline('o');
  g.shadow(2, 2, 'z');
  return g.toSprite();
}

/** Flat-roofed institutional block — reads as a campus beside a house. */
export function makeBlock({ w: bw = 74, wallH = 34, roofH = 12, floors = 2, seed = 5 } = {}) {
  const w = bw + 6;
  const h = roofH + wallH + 8;
  const g = new Grid(w, h, '.');
  const cx = Math.floor(w / 2);
  const wallX = cx - Math.floor(bw / 2);
  const wallTop = 2 + roofH;

  // Shallow roof.
  g.trapezoid(cx, 2, bw - 14, bw, roofH, 'r');
  for (let j = 0; j < roofH; j++) {
    const t = j / (roofH - 1);
    const rw = Math.round((bw - 14) + 14 * t);
    g.rect(Math.round(cx - rw / 2), 2 + j, Math.round(rw * 0.44), 1, 'R');
  }
  g.rect(cx - Math.floor(bw / 2), wallTop, bw, 1, 's');

  // Wall.
  g.rect(wallX, wallTop + 1, bw, wallH, 'b');
  g.rect(wallX, wallTop + 1, Math.round(bw * 0.3), wallH, 'B');
  g.rect(wallX, wallTop + wallH - 3, bw, 3, 'c');

  // Window bands — the repetition is what makes it read institutional.
  const rowH = Math.floor((wallH - 8) / floors);
  for (let f = 0; f < floors; f++) {
    const wy = wallTop + 4 + f * rowH;
    for (let wx = wallX + 5; wx < wallX + bw - 10; wx += 12) {
      g.rect(wx - 1, wy - 1, 9, 7, 'o');
      g.rect(wx, wy, 7, 5, 'y');
      g.vLine(wx + 3, wy, 5, 'o');
    }
  }

  // Entrance.
  const dx = cx - 6;
  const dy = wallTop + wallH - 13;
  g.rect(dx - 1, dy - 1, 14, 14, 'o');
  g.rect(dx, dy, 12, 13, 'n');
  g.vLine(cx, dy, 13, 'o');

  g.outline('o');
  g.shadow(2, 2, 'z');
  return g.toSprite();
}

/* ============================================================
   VEGETATION
   ============================================================ */

/**
 * Layered canopy. A single ellipse reads as a blob; the references build a
 * canopy from several overlapping clumps with the light catching the top-left
 * of each one.
 */
export function makeTree({ w: tw = 34, canopyH = 30, trunkH = 12, seed = 13 } = {}) {
  const w = tw + 4;
  const h = canopyH + trunkH + 6;
  const g = new Grid(w, h, '.');
  const r = rng(seed);
  const cx = Math.floor(w / 2);

  // Trunk first, so the canopy overlaps it.
  const trunkTop = canopyH - 4;
  g.rect(cx - 3, trunkTop, 6, trunkH, 't');
  g.vLine(cx - 3, trunkTop, trunkH, 'o');
  // Roots.
  g.hLine(cx - 6, trunkTop + trunkH - 1, 12, 't');
  g.hLine(cx - 5, trunkTop + trunkH, 10, 't');

  // Canopy clumps.
  const clumps = [
    [cx, 13, Math.round(tw * 0.5), 12],
    [cx - 10, 18, 10, 9],
    [cx + 10, 18, 10, 9],
    [cx - 5, 8, 9, 8],
    [cx + 6, 9, 9, 8],
  ];
  for (const [x, y, rx, ry] of clumps) g.ellipse(x, y, rx, ry, 'f');

  // Shade underside, then light on the top-left of each clump.
  for (const [x, y, rx, ry] of clumps) g.ellipse(x, y + 3, rx - 2, ry - 3, 'e');
  for (const [x, y, rx, ry] of clumps) g.ellipse(x - 2, y - 3, rx - 4, ry - 4, 'F');

  // Leaf speckle so the clumps do not read as smooth blobs.
  for (let i = 0; i < 26; i++) {
    const x = cx - tw / 2 + Math.floor(r() * tw);
    const y = 4 + Math.floor(r() * canopyH);
    if (g.get(x, y) === 'f') g.set(x, y, r() > 0.5 ? 'F' : 'e');
  }

  g.outline('o');
  g.ellipse(cx + 2, canopyH + trunkH + 1, Math.round(tw * 0.4), 3, 'z');
  return g.toSprite();
}

export function makeBush({ w: bw = 20, seed = 17 } = {}) {
  const g = new Grid(bw + 4, 16, '.');
  const r = rng(seed);
  const cx = Math.floor((bw + 4) / 2);
  g.ellipse(cx, 8, Math.round(bw / 2), 6, 'f');
  g.ellipse(cx - 4, 9, 6, 4, 'f');
  g.ellipse(cx + 4, 9, 6, 4, 'f');
  g.ellipse(cx, 10, Math.round(bw / 2) - 3, 4, 'e');
  g.ellipse(cx - 2, 6, Math.round(bw / 2) - 5, 3, 'F');
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(r() * (bw + 4));
    const y = Math.floor(r() * 14);
    if (g.get(x, y) === 'f') g.set(x, y, r() > 0.5 ? 'F' : 'e');
  }
  g.outline('o');
  g.ellipse(cx + 1, 14, Math.round(bw / 2) - 2, 2, 'z');
  return g.toSprite();
}

/* ============================================================
   BRIDGE
   ============================================================ */

/** Plank bridge with posts — every reference has one where a path meets water. */
export function makeBridge({ w: bw = 46, h: bh = 30 } = {}) {
  const g = new Grid(bw, bh, '.');

  g.rect(2, 0, bw - 4, bh, 'n');
  // Plank courses.
  for (let j = 2; j < bh; j += 4) g.hLine(2, j, bw - 4, 'o');
  // Rails.
  g.vLine(2, 0, bh, 'o');
  g.vLine(bw - 3, 0, bh, 'o');
  g.rect(0, 0, 4, bh, 'n');
  g.rect(bw - 4, 0, 4, bh, 'n');
  // Posts.
  for (const py of [0, Math.floor(bh / 2) - 2, bh - 5]) {
    g.rect(0, py, 4, 5, 'c');
    g.rect(bw - 4, py, 4, 5, 'c');
  }
  g.outline('o');
  return g.toSprite();
}

/* ============================================================
   CHARACTER
   ============================================================ */

/** 16x24 walker, four frames, facing down. */
export function makeHero() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const g = new Grid(16, 24, '.');
    // head
    g.ellipse(8, 6, 5, 5, 'k');
    g.rect(3, 1, 11, 4, 'a');       // hair
    g.set(6, 6, 'o').set(10, 6, 'o'); // eyes
    // body
    g.rect(4, 11, 9, 8, 'l');
    g.rect(4, 11, 4, 8, 'm');       // shaded side
    g.rect(3, 12, 2, 5, 'l');       // arms
    g.rect(12, 12, 2, 5, 'l');
    // legs — two-step cycle, held on frames 1 and 3
    const step = [0, 1, 0, -1][f];
    g.rect(5, 19, 3, 4 + step, 'm');
    g.rect(9, 19, 3, 4 - step, 'm');
    g.outline('o');
    g.ellipse(8, 23, 5, 1, 'z');
    frames.push(g.toSprite());
  }
  return frames;
}
