/**
 * Palettes for the Experience & Education map.
 *
 * Sprites are stored as character grids (see sprites.js), so a palette is just a
 * character -> colour map. The artwork is drawn once and every scheme is a
 * different lookup — which is why three variants cost almost nothing, and why a
 * fourth would cost nothing either.
 *
 * Every palette must define the same slots. A missing slot draws nothing, which
 * fails silently and looks like a hole in the sprite, so `assertComplete()`
 * below checks them at module load in dev.
 */

/** The slot vocabulary. Sprites may only reference these characters. */
export const SLOTS = [
  'o', // outline — the 1px dark keyline every silhouette carries
  'g', 'G', 'h', // ground: base, light, dark
  'p', 'P', 'd', // path: base, light, dark(edge)
  'w', 'W',      // water: base, highlight
  'b', 'B', 'c', // wall: base, light(lit face), shade
  'r', 'R', 's', // roof: base, light(lit slope), shade
  'n',           // wood — fences, bridges, beams
  't',           // trunk
  'e', 'f', 'F', // foliage: dark, mid, light
  'y',           // accent — lit windows, lamps, markers
  'k', 'a', 'l', 'm', // character: skin, hair, cloth, cloth shade
  'z',           // cast shadow (drawn semi-transparent)
];

/* ============================================================
   A — SITE PALETTE
   Ink ground, amber structures, the same thermal ramp the rest
   of the page runs on. Reads as this site's own artwork.
   ============================================================ */

export const SITE = {
  o: '#07070a',
  g: '#1b1c24', G: '#262833', h: '#131419',
  p: '#3d3324', P: '#584730', d: '#241d15',
  w: '#14232e', W: '#1e3a4a',
  b: '#2a2732', B: '#3a3644', c: '#1c1a22',
  r: '#b4650c', R: '#f59e0b', s: '#6d3c07',
  n: '#4a3a26',
  t: '#33281b',
  e: '#1a2a20', f: '#263d2c', F: '#35543a',
  y: '#ffc233',
  k: '#c99b6e', a: '#2b2119', l: '#f59e0b', m: '#a86a07',
  z: 'rgba(0,0,0,.42)',
};

/* ============================================================
   B — REFERENCE GREENS
   Faithful to ref 5: saturated grass, orange roofs, blue water.
   Obviously "a pixel game"; a hard tonal break from the page.
   ============================================================ */

export const GAME = {
  o: '#1a2418',
  g: '#5aa84a', G: '#7bc85e', h: '#3f8438',
  p: '#d9b676', P: '#efd7a1', d: '#a6844c',
  w: '#3fa9e0', W: '#7fd4f2',
  b: '#e8dcc0', B: '#fbf3dc', c: '#b9a67f',
  r: '#e2542b', R: '#f4813f', s: '#a5361c',
  n: '#c08a44',
  t: '#6b4a2a',
  e: '#1f5b32', f: '#2f8043', F: '#4fae5c',
  y: '#ffe066',
  k: '#f0c090', a: '#3c2a1c', l: '#3f7fd0', m: '#2a5a99',
  z: 'rgba(20,40,20,.35)',
};

/* ============================================================
   C — MUTED MIDDLE GROUND
   Desaturated greens and slate blues pulled toward the page's
   darkness, with amber reserved for paths and lit windows.
   ============================================================ */

export const MUTED = {
  o: '#101418',
  g: '#33473a', G: '#425b47', h: '#25352c',
  p: '#6b563a', P: '#8d7350', d: '#463726',
  w: '#2b4d63', W: '#3f6d86',
  b: '#4a4a52', B: '#5f6068', c: '#343439',
  r: '#a55f2a', R: '#d4863c', s: '#6b3a17',
  n: '#6b533a',
  t: '#3d3223',
  e: '#1e3226', f: '#2c4733', F: '#3d6044',
  y: '#f5c15a',
  k: '#c99b6e', a: '#2b2119', l: '#c98a3a', m: '#8a5a22',
  z: 'rgba(0,0,0,.34)',
};

export const PALETTES = {
  site: { key: 'site', label: 'Site palette', pal: SITE, bg: '#09090b' },
  game: { key: 'game', label: 'Reference greens', pal: GAME, bg: '#2c5a2f' },
  muted: { key: 'muted', label: 'Muted middle', pal: MUTED, bg: '#151a17' },
};

/**
 * A sprite referencing a slot the palette lacks draws nothing — a hole that is
 * easy to miss and hard to trace back. Cheaper to fail loudly at load.
 */
export function assertComplete() {
  const missing = [];
  for (const [name, entry] of Object.entries(PALETTES)) {
    for (const slot of SLOTS) {
      if (!entry.pal[slot]) missing.push(`${name}.${slot}`);
    }
  }
  if (missing.length) throw new Error(`palette slots missing: ${missing.join(', ')}`);
  return true;
}
