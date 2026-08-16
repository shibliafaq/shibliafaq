/**
 * The modular building composer.
 *
 * `drawBuilding(scene, b)` turns a footprint plus a material pair into draw ops,
 * so a 4x4 hut and a 12x8 university are the same code with different numbers.
 * This is HANDOFF §9.6 item 1 — the last thing left in the art, and the one the
 * user rejected explicitly: every building on the map was one of three cottage
 * sprites while `STOPS[].footprint`, `walls` and `roof` already described seven
 * distinct institutions that nothing consumed.
 *
 * ── WHY A COMPOSER AND NOT MORE SPRITES ───────────────────────────────────
 * Pixel Crawler ships no assembled exterior buildings at all. Its Walls.png and
 * Roofs.png are a kit; the pack's own GIF and Tavern.png are mock-ups of what
 * the kit can build, not usable art. The alternative source (Szadi's public
 * domain Houses_Pack) does ship assembled buildings, but they are a third
 * artist's idiom — heavier shingle detail, desaturated sage against our amber —
 * and 1.5-2x larger than the footprints the composition was designed around,
 * so using them would have meant bending the layout to the art. A composer
 * bends the art to the layout instead, which is the right way round.
 *
 * ── THE PARTS ─────────────────────────────────────────────────────────────
 * Six wall materials, each a **96x56 continuous front elevation** with its own
 * plinth, courses and cornice already drawn. Two **64x47 roof faces**, striped
 * so they tile. That is the whole kit; everything else here is arithmetic.
 * Rects and their derivation: tools/pc-building-parts.json.
 *
 * ── THE GEOMETRY, AND WHY THE ROOF IS FIXED ───────────────────────────────
 * Splitting a footprint between roof and wall proportionally looked obvious and
 * is wrong: it makes a small building's roof 20px tall, which loses the ridge
 * and the eave and reads as a flat lid. The roof is therefore **always its
 * natural 47px** and the wall takes the remainder:
 *
 *     roof band   = top 47px of the footprint
 *     wall band   = everything below it, tiled from the BOTTOM up
 *
 * Tiling the wall upward from the bottom is what makes height mean storeys: the
 * plinth always lands on the ground, and each repeat of the 56px run reads as
 * another floor with its own course line. A 4x4 hut gets 17px — a plinth and a
 * doorway. A 12x8 university gets 81px — two storeys. `_tower` at 4x11 gets
 * 129px, which is three. Nothing special-cases any of them.
 *
 * Horizontally both bands tile left to right and the last tile is clipped, then
 * the right edge is over-drawn with the run's own right-hand strip so the corner
 * post survives the clip. Without that every building has a cut-off right edge.
 */

import { TILE, SPRITES } from './cutefantasy.js';

/* ---- part geometry, all measured ---------------------------------------- */
const WALL_W = 96, WALL_H = 56;   // front-elevation run
const GABLE_W = 127, GABLE_H = 94; // the gable roof: both slopes + central ridge
const CAP_W  = 14;                // right-edge strip that restores the corner post

/** journey.js material names -> sheet keys. */
export const WALLS = {
  log:     'wallLog',
  plank:   'wallPlank',
  board:   'wallBoard',
  timber:  'wallTimber',
  plaster: 'wallPlaster',
  brick:   'wallBrick',
  glazed:  'wallGlazed',
  // KFUPM's "white/pale plaster": the timber run is the palest of the six, and
  // SITE_GRADE lifts it further.
  pale:    'wallTimber',
};

export const ROOFS = {
  wood:    'gableWood',
  shingle: 'gableShingle',
  slate:   'gableSlate',
  flat:    'gableFlat',
};

/** Windows, by wall material. A glazed shopfront is already all glass. */
const WINDOW = {
  brick:   'winArchBlue',
  pale:    'winArchBlue',
  plaster: 'winArch',
  timber:  'winArch',
  log:     'winFour',
  plank:   'winFour',
  board:   'winFour',
};

/** Doors, by wall material — a glazed shopfront should not get a plank door. */
const DOOR = {
  glazed: 'doorGlazed',
  brick:  'doorStone',
  pale:   'doorStone',
  plaster: 'doorStone',
};
const DOOR_DEFAULT = 'doorPlank';

/**
 * Compose one building into `scene`.
 *
 * `b` is a STOPS or FILLERS entry: `anchor` [col,row] bottom-left in tiles,
 * `footprint` [w,h] in tiles, `walls`, `roof`. Every op is pushed with the same
 * baseline — the façade line — so the building sorts as a single object.
 */
export function drawBuilding(scene, b) {
  const wallSheet = WALLS[b.walls] || WALLS.plank;
  const roofSheet = ROOFS[b.roof] || ROOFS.wood;

  const [c0, r1] = b.anchor;
  const [fw, fh] = b.footprint;

  const x0 = c0 * TILE;
  const y1 = (r1 + 1) * TILE;        // ground line: bottom edge of the anchor row
  const W  = fw * TILE;
  const H  = fh * TILE;
  const y0 = y1 - H;                 // top of the footprint

  const base = y1;                   // one baseline for the whole building

  /* ---- the overhang -----------------------------------------------------
     The composition spec defines a footprint as "the full drawn bounding box
     INCLUDING roof overhang", so the roof gets the whole width and the walls are
     inset underneath it. That one relationship is what makes a box read as a
     building: without it the roof is flush with the wall, there is no eave
     shadow falling across the façade, and the 3/4 angle disappears. Inset scales
     with width so a 4-tile hut does not end up with a 2-tile wall. */
  const inset = Math.max(4, Math.min(TILE, Math.floor(W / 8)));
  const wx0 = x0 + inset;
  const wW = Math.max(TILE, W - inset * 2);

  /* ---- roof: one or more real gables ------------------------------------
     The gable is a fixed 127x94 piece — both slopes rising to a central ridge —
     and a fixed width cannot be stretched, because shearing a slanted edge to a
     new length is authoring pixel art, which is the road HANDOFF §9.1 says ends.
     So instead of stretching one gable, a wide building gets SEVERAL, each
     clipped symmetrically about its own ridge. That is not a workaround: a
     double-gabled block is what a big institutional building actually looks
     like, and it is what finally distinguishes a university from a hut. */
  const wide = W > GABLE_W;
  // ~60% of the height, clipped off the gable's BOTTOM. Clipping the bottom
  // keeps the ridge and both slopes — the part that makes it read as a roof —
  // and the wall top covers the lost eave anyway. At the gable's natural 94px a
  // 7-tile building is 84% roof, which is why the first pass left nothing but a
  // sliver of wall and no room for windows.
  const roofH = Math.max(34, Math.min(GABLE_H, Math.round(H * 0.6)));
  const wallTop = y0 + roofH;
  // Walls run a few px up BEHIND the roof so the eave has something to sit on
  // and no grass shows through the joint.
  const wallSpan = Math.max(TILE, y1 - wallTop + 8);
  for (let y = 0; y < wallSpan; y += WALL_H) {
    // The topmost course is the one that gets cut, and it is cut from its TOP
    // (sy offset), keeping each course's base detail intact.
    const h = Math.min(WALL_H, wallSpan - y);
    const dy = y1 - y - h;
    const sy = WALL_H - h;
    for (let x = 0; x < wW; x += WALL_W) {
      const w = Math.min(WALL_W, wW - x);
      scene.part(wallSheet, 0, sy, w, h, wx0 + x, dy, base);
    }
    if (wW > CAP_W) {
      scene.part(wallSheet, WALL_W - CAP_W, sy, CAP_W, h, wx0 + wW - CAP_W, dy, base);
    }
  }

  /* ---- door and windows, on the wall, before the roof -------------------
     The wall runs are plain material bands — the pack expects openings to be
     placed onto them, which is exactly what its own mock-up does. Without this
     step a façade is a flat panel, which is the second half of why the first
     attempt did not read as a building. */
  const doorName = DOOR[b.walls] || DOOR_DEFAULT;
  const door = SPRITES[doorName];
  const doorW = door ? door.w : 0;
  const hasDoor = door && wW >= doorW + 6 && wallSpan >= door.h;
  if (hasDoor) {
    scene.part(door.sheet, door.x, door.y, door.w, door.h,
      wx0 + Math.round((wW - doorW) / 2), y1 - door.h, base);
  }

  // Windows on every storey, evenly spaced, skipping the door bay on the ground
  // floor. Glazed walls get none — they are already all glass.
  const win = SPRITES[WINDOW[b.walls]];
  if (win && b.walls !== 'glazed') {
    const pitch = win.w + 14;
    const cols = Math.floor((wW - 10) / pitch);
    const storeys = Math.max(1, Math.floor(wallSpan / 26));
    const spare = wW - cols * pitch;
    for (let s = 0; s < storeys; s++) {
      // Ground floor sits above the door head; upper floors sit in their band.
      const wy = y1 - 8 - s * 26 - win.h - (s === 0 && hasDoor ? door.h - 6 : 6);
      if (wy < y1 - wallSpan) break;
      for (let i = 0; i < cols; i++) {
        const wx = wx0 + Math.round(spare / 2) + i * pitch + 7;
        // Ground floor: leave the door its bay.
        if (s === 0 && hasDoor
          && Math.abs((wx + win.w / 2) - (wx0 + wW / 2)) < doorW / 2 + win.w / 2 + 4) continue;
        scene.part(win.sheet, win.x, win.y, win.w, win.h, wx, wy, base);
      }
    }
  }

  /* ---- chimney, BEHIND the roof ----------------------------------------
     Drawn before the roof so the slope buries its base and only the stack head
     shows. Drawn after, it towered over the ridge like a second building —
     which is exactly how it looked. Skipped on multi-gable blocks and on glazed
     and pale walls: an institution has no domestic chimney. */
  const ch = SPRITES.chimney;
  if (ch && !wide && b.walls !== 'glazed' && b.walls !== 'pale' && W >= 64) {
    const stack = Math.min(ch.h, Math.max(16, Math.round(roofH * 0.5)));
    scene.part(ch.sheet, ch.x, ch.y, ch.w, stack, x0 + Math.round(W * 0.2), y0 - 9, base);
  }

  /* ---- roof last, so its eave falls across the façade -------------------
     A wide building is ONE long roof, not several gables.

     The previous version repeated the whole 127px gable and clipped each copy
     about its own ridge. That is what produced the doubled roof: two ridge posts
     butted together with no valley between them reads as one broken roof, not as
     two. Real long buildings have a single ridge running the length with hipped
     ends, which is also what the pack's own mock-up shows.

     So the gable is cut into five parts and reassembled at any width:

         |  left cap  | ~~left slope~~ | ridge | ~~right slope~~ |  right cap  |
         0           50              61      67                78            127

     The caps carry the rising hip lines that close each end. The two slope
     slices are taken from immediately beside the ridge, where the top edge has
     already levelled off — so tiling them extends the ridge horizontally
     instead of repeating the peak. Each side keeps its own slice, which is what
     preserves the light/shade split across the ridge. */
  const roofY = y0;

  if (!wide) {
    const cw = Math.min(W, GABLE_W);
    const sx = Math.floor((GABLE_W - cw) / 2);
    scene.part(roofSheet, sx, 0, cw, roofH, x0 + Math.floor((W - cw) / 2), roofY, base);
  } else {
    const CAP_L = 50, RIDGE_X = 61, RIDGE_W = 6, CAP_R_X = 78;
    const CAP_R = GABLE_W - CAP_R_X;
    const SLICE = 10;
    const mid = x0 + Math.round(W / 2);

    // Left cap, then left slope tiled rightwards to the centre.
    scene.part(roofSheet, 0, 0, CAP_L, roofH, x0, roofY, base);
    for (let x = x0 + CAP_L; x < mid; x += SLICE) {
      const w = Math.min(SLICE, mid - x);
      scene.part(roofSheet, RIDGE_X - SLICE, 0, w, roofH, x, roofY, base);
    }

    // Right cap, then right slope tiled leftwards back to the centre.
    const capRx = x0 + W - CAP_R;
    scene.part(roofSheet, CAP_R_X, 0, CAP_R, roofH, capRx, roofY, base);
    for (let x = capRx - SLICE; x >= mid; x -= SLICE) {
      scene.part(roofSheet, RIDGE_X + RIDGE_W, 0, SLICE, roofH, x, roofY, base);
    }

    // The ridge post sits once, dead centre, over both slope fields.
    scene.part(roofSheet, RIDGE_X, 0, RIDGE_W, roofH, mid - Math.round(RIDGE_W / 2), roofY, base);
  }
}

/** Every building's façade row, for asserting nothing sits on a path tile. */
export function facadeRow(b) {
  return b.anchor[1];
}
