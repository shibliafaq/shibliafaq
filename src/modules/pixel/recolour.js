/**
 * Colour grading for the tilesheets.
 *
 * Two mechanisms, because one is not enough:
 *
 * 1. `recolour(img, filter)` — a CSS filter applied to a whole sheet. Cheap,
 *    and right when a sheet is all one material. A single filter over the
 *    *output canvas* would be wrong: turning the grass amber would turn the
 *    houses pink and the water violet, which is why grading is per sheet.
 *
 * 2. `recolourGreens(img, opts)` — rotates only the pixels whose hue falls in
 *    the green band, leaving everything else untouched.
 *
 * The second exists because the nine-slice terrain sheets **bake grass into
 * their edge tiles**. `path.webp` carries a grass-green transition border, so
 * grading only `grass.webp` left a 2–3px green keyline down both sides of every
 * road while the field around it went amber — measured at 34,259 stray green
 * pixels, 6.6% of the map. No per-sheet filter can fix that: the green and the
 * sand live in the same sheet. Only a hue-selective pass can.
 *
 * Both run once per sheet at load, never per draw call — `ctx.filter` and
 * `getImageData` are both far too expensive for a map that redraws every frame
 * behind a moving camera.
 */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function recolour(img, filter) {
  if (!filter || filter === 'none') return img;
  const { c, ctx } = makeCanvas(img.width, img.height);
  ctx.filter = filter;
  ctx.drawImage(img, 0, 0);
  return c;
}

/* HSL conversions. Note these are true HSL — CSS `hue-rotate()` is a matrix
   approximation and lands roughly 14deg short of the same nominal rotation, so
   the numbers here are not interchangeable with the filter strings. */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue(h + 1 / 3) * 255),
    Math.round(hue(h) * 255),
    Math.round(hue(h - 1 / 3) * 255),
  ];
}

/**
 * Rotate only the green pixels. `band` is the hue window treated as foliage;
 * `minSat` keeps near-greys (stone, outlines, shadow) out of it, which is what
 * stops the dark keylines around every sprite from turning brown.
 */
export function recolourGreens(img, opts = {}) {
  const { rotate = -84, sat = 1, light = 1, band = [70, 175], minSat = 0.12 } = opts;
  const { c, ctx } = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (s < minSat || h < band[0] || h > band[1]) continue;
    const [r, g, b] = hslToRgb(
      h + rotate,
      Math.min(1, s * sat),
      Math.min(1, l * light),
    );
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }

  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Site grade: the ground goes amber and the canopy orange to sit with the
 * page's heat palette, while wood, stone and water are only nudged.
 *
 * A value may be a filter string, or `{ filter, greens }`. **The filter runs
 * first, then the greens pass** — that ordering matters, because it lets the
 * selective pass land the foliage on its final hue rather than have a
 * subsequent whole-sheet filter drag it off again.
 *
 * Grass and path values are tuned by measurement, not by eye. Ungraded, grass
 * sits at luminance 116 and path at 175 — a gap of 59, and that gap is what
 * makes the road read as the compositional spine of the map. The first pass
 * used brightness(.72) on grass, which put it at l25 (mud, not amber); lifting
 * it then closed the road gap to 14 until the path was lifted to match. It now
 * runs grass 121.6 / path 178.9, a gap of 57.3.
 */
const FOLIAGE = { rotate: -84, sat: 1.55, light: 0.96 };  // green -> amber
const CANOPY  = { rotate: -82, sat: 1.45, light: 1.0 };   // green -> orange

export const SITE_GRADE = {
  grass:     { greens: FOLIAGE },
  tree:      { greens: CANOPY },
  treeSmall: { greens: CANOPY },
  decor:     { greens: FOLIAGE },

  // Terrain sheets keep their own character but must have their baked-in grass
  // edging rotated to match the field, or every edge shows a green keyline.
  path:      { filter: 'hue-rotate(-12deg) saturate(1.05) brightness(1.02)', greens: FOLIAGE },
  water:     { filter: 'hue-rotate(6deg) saturate(.7) brightness(.5)',       greens: FOLIAGE },
  cliff:     { filter: 'hue-rotate(-12deg) saturate(.95) brightness(.9)',    greens: FOLIAGE },
  // These two must rotate the *other* way. Their source is already warm, so the
  // -16deg the rest of the terrain uses drove them to h9 — salmon, not sand —
  // and the farmland to h23 at 82% saturation, which read as neon clay. Sand
  // wants to land near h40, tilled earth near h28 at roughly half that
  // saturation.
  // Measured, not guessed. At brightness 1.02 the sand sat at luminance 176.0
  // against a road at 178.9 — a gap of 2.9, which is no gap at all. The desert
  // did not read as desert because the sand and the road were the same colour,
  // so there was neither a road nor a landscape, just one beige field. Dropped
  // to a deeper ochre for a usable gap, and saturated to keep it sand rather
  // than mud.
  beach:     { filter: 'hue-rotate(8deg) saturate(1.05) brightness(.82)',    greens: FOLIAGE },
  farm:      { filter: 'hue-rotate(4deg) saturate(.55) brightness(.95)',     greens: FOLIAGE },
  bridge:    { filter: 'hue-rotate(-10deg) brightness(.95)',                 greens: FOLIAGE },

  house:     { filter: 'hue-rotate(-10deg) saturate(1.05) brightness(.92)',  greens: FOLIAGE },
  fences:    { filter: 'hue-rotate(-10deg) brightness(.95)',                 greens: FOLIAGE },

  player:    'none', // he should read as himself, not as scenery
  heroIdleDown: 'none', heroIdleLeft: 'none', heroIdleRight: 'none', heroIdleUp: 'none',
  heroRunDown: 'none', heroRunLeft: 'none', heroRunRight: 'none', heroRunUp: 'none',

  /* The mix-and-match sheets. The autumn trees ship in the pack already at
     orange #d06732 / amber #c98321 — within a few degrees of the site's own
     ember and amber — so grading them would only degrade real artwork. The
     conifers stay green on purpose: they are the barrier between regions, and a
     dark cool mass is what makes an amber world read as having an edge. */
  treeAutumn:   'none',
  treeAmber:    'none',
  conifer:      { filter: 'saturate(.85) brightness(.82)' },
  conifer2:     { filter: 'saturate(.85) brightness(.82)' },
  coniferSmall: { filter: 'saturate(.85) brightness(.82)' },
  /* Premade buildings are never graded. Kibyra's palette is already warm —
     terracotta roofs, cream plaster, warm stone — so it sits on the amber
     ground unaided, and running the greens pass over finished artwork would
     only damage it. Same reasoning as the autumn trees above. */
  instAcademic: 'none', instResearch: 'none',
  offManor1: 'none', offManor2: 'none', offManor3: 'none',
  /* The Pixel Lands houses are by a different artist and read cream/white
     against Kibyra's terracotta and warm stone. A warm nudge is enough to put
     them in the same street; full grading would flatten their detail. */
  offCottage:   { filter: 'hue-rotate(-8deg) saturate(1.25) brightness(.92)' },
  offLshape:    { filter: 'hue-rotate(-8deg) saturate(1.25) brightness(.92)' },
  offFarmhouse: { filter: 'hue-rotate(-8deg) saturate(1.25) brightness(.92)' },

  houseRed:     'none',
  houseBlue:    { filter: 'brightness(.92)' },
  stall:        'none',

  // People and animals are never graded, for the same reason the player is not:
  // they should read as themselves, not as scenery. The rocks take only a warm
  // nudge so they sit on amber ground instead of looking dropped onto it.
  rockBig:      { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
  rockMid:      { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
  rockSm:       { filter: 'hue-rotate(6deg) saturate(.9) brightness(.95)' },
  villagerA: 'none', villagerB: 'none', villagerC: 'none',
  villagerHold: 'none', villagerCarry: 'none', villagerRogue: 'none',
  villagerKnight: 'none', villagerWizard: 'none',
  villagerCfSide: 'none', villagerCfUp: 'none', villagerMw: 'none',
  scarecrow: 'none',
  // Bushes are green like the source canopies were, so they take the same
  // foliage rotation the grass does — otherwise they sit as green blots on
  // amber ground.
  bushGreen: { greens: { rotate: -84, sat: 1.4, light: 0.98 } },
  bushOlive: { greens: { rotate: -84, sat: 1.4, light: 0.98 } },
  animalChicken: 'none', animalCow: 'none', animalSheep: 'none',

  /* ---- the modular building kit -----------------------------------------
     Walls take the same warm nudge the Cute Fantasy house does, so the two
     idioms sit on the same ground. `pale` reuses the timber run and is lifted
     and desaturated here rather than in a seventh sheet — KFUPM's brief is
     white plaster and a flat pale roof, no shingle anywhere on it. */
  wallLog:     { filter: 'hue-rotate(-8deg) saturate(1.02) brightness(.94)' },
  wallPlank:   { filter: 'hue-rotate(-8deg) saturate(1.02) brightness(.96)' },
  wallBoard:   { filter: 'hue-rotate(-8deg) saturate(1.02) brightness(.92)' },
  wallTimber:  { filter: 'hue-rotate(-6deg) saturate(.92) brightness(1.04)' },
  wallPlaster: { filter: 'hue-rotate(-6deg) saturate(.98) brightness(1.0)' },
  wallBrick:   { filter: 'hue-rotate(-6deg) saturate(1.0) brightness(.98)' },
  wallGlazed:  { filter: 'hue-rotate(-6deg) saturate(.95) brightness(1.0)' },

  /* One 64x47 brown face, four roofs. The pack gives wood and green shingle;
     slate and flat are that same face rotated into blue-grey and flattened to
     pale, which keeps the shading and the eave identical across all four so a
     row of different buildings still reads as one world. */
  /* All four measured against the source rather than guessed. The pack's green
     roof is teal (#44c591, hue ~160) and its brown is hue ~25, so:
       - a `greens` rotate of -70 lands the teal on 90deg, which is LIME. Killed;
         a small rotate plus heavy desaturation is what puts it in an amber world.
       - hue-rotate(150deg) on brown lands on 175 — CYAN, not slate. Slate wants
         ~215, so the rotation has to be ~190deg, and desaturated hard or it
         reads as a drawn blue outline rather than as stone. */
  gableWood:    { filter: 'hue-rotate(-8deg) saturate(1.05) brightness(.95)' },
  gableShingle: { filter: 'hue-rotate(-26deg) saturate(.55) brightness(.82)' },
  gableSlate:   { filter: 'hue-rotate(188deg) saturate(.34) brightness(.8)' },
  gableFlat:    { filter: 'saturate(.16) brightness(1.18)' },

  doorPlank:   { filter: 'hue-rotate(-8deg) brightness(.96)' },
  doorGlazed:  { filter: 'hue-rotate(-6deg) brightness(1.0)' },
  doorStone:   { filter: 'hue-rotate(-6deg) brightness(1.0)' },
  chimney:     { filter: 'hue-rotate(-6deg) saturate(.9) brightness(.96)' },
  winArch:     { greens: FOLIAGE },  // its shutters are green
  winArchBlue: { filter: 'hue-rotate(-6deg) brightness(1.0)' },
  winFour:     { filter: 'hue-rotate(-6deg) brightness(1.0)' },

  benchWood:   { filter: 'hue-rotate(-8deg) brightness(.96)' },
  planter:     { filter: 'hue-rotate(-8deg) brightness(.96)' },
  // The hedge is green like the source canopies, so it takes the foliage rotation.
  hedge:       { greens: FOLIAGE },

  /* The bushes are the pack's own autumn artwork — rust and olive columns of the
     seasonal grid. Grading them would degrade real art, exactly as with the
     autumn trees (§9.10). The amber pair is the yellow-green column, which is
     already close enough to the site's amber to leave alone. */
  bushRustLg: 'none', bushRustMd: 'none', bushRustSm: 'none',
  bushOliveLg: 'none', bushOliveMd: 'none',
  bushAmberLg: 'none', bushAmberMd: 'none',
};

export function gradeSheets(sheets, grade) {
  const out = {};
  for (const [key, img] of Object.entries(sheets)) {
    const spec = grade[key];
    if (!spec || spec === 'none') { out[key] = img; continue; }
    if (typeof spec === 'string') { out[key] = recolour(img, spec); continue; }
    let cur = img;
    if (spec.filter) cur = recolour(cur, spec.filter);
    if (spec.greens) cur = recolourGreens(cur, spec.greens);
    out[key] = cur;
  }
  return out;
}
