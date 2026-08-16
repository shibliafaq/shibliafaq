/**
 * Sprites for the Experience & Education map.
 *
 * Each sprite is an array of equal-length strings; every character is a palette
 * slot from palettes.js, and '.' is transparent. Storing artwork this way means
 * the whole map ships as a few KB of text, recolours by swapping one object, and
 * stays editable in the source — no spritesheet, no binary, no build step.
 *
 * The 3/4 overhead craft rules the references follow, and these keep:
 *   - roofs AND façades visible, never true isometric
 *   - one light source, top-left: 'R'/'B' are lit faces, 's'/'c' are shaded
 *   - a hard 1px outline 'o' around every silhouette
 *   - 3-4 value steps per material, no more
 */

export const TILE = 16;

/* ---- ground ------------------------------------------------ */

export const GRASS = [
  'gggggggggggggggg',
  'ggGgggggggggggGg',
  'ggggggghgggggggg',
  'gggggggggggggggg',
  'ghggggggggggGggg',
  'gggggGgggggggggg',
  'gggggggggggggghg',
  'gggggggggggggggg',
  'gggGggggggghgggg',
  'gggggggggggggggg',
  'ggggggggGggggggg',
  'ghgggggggggggggg',
  'ggggggggggggGggg',
  'gggggggggggggggg',
  'gGgggggghggggggG',
  'gggggggggggggggg',
];

export const PATH = [
  'pppppppppppppppp',
  'ppPppppppppppppp',
  'ppppppppppdppppp',
  'pppppppppppppppp',
  'pdppppppppppPppp',
  'ppppppPppppppppp',
  'ppppppppppppppdp',
  'pppppppppppppppp',
  'pppPpppppppdpppp',
  'pppppppppppppppp',
  'ppppppppPppppppp',
  'pdpppppppppppppp',
  'ppppppppppppPppp',
  'pppppppppppppppp',
  'pPppppppdppppppP',
  'pppppppppppppppp',
];

export const WATER = [
  'wwwwwwwwwwwwwwww',
  'wwWWwwwwwwwWWwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwWWwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wWWwwwwwwwwwwWWw',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwWWwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwWWwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwWWwww',
  'wwwwwwwwwwwwwwww',
  'wWWwwwwwWWwwwwww',
  'wwwwwwwwwwwwwwww',
  'wwwwwwwwwwwwwwww',
];

/* ---- vegetation -------------------------------------------- */

export const TREE = [
  '.....oooooo.....',
  '...ooFFFFFFoo...',
  '..oFFFFFFFFFFo..',
  '.oFFFFFffffFFFo.',
  '.oFFFffffffffFo.',
  'oFFFffffffffffFo',
  'oFFffffeeeefffFo',
  'oFfffffeeeeffffo',
  'oFffffeeeeeefffo',
  'oFfffffeeeeffffo',
  'oFFffffffffffffo',
  '.oFffffffffffFo.',
  '.oFFfffffffffFo.',
  '..oFFffffffFFo..',
  '...ooFFFFFFoo...',
  '.....otttto.....',
  '.....otttto.....',
  '.....otttto.....',
  '....ozttttzo....',
  '....oozzzzoo....',
];

export const BUSH = [
  '....oooooo....',
  '..ooFFFFFFoo..',
  '.oFFffffffFFo.',
  'oFffffeeefffFo',
  'oFfffeeeeefffo',
  'oFffffffffffFo',
  '.oFfffffffFFo.',
  '..oozzzzzzoo..',
];

/* ---- buildings ---------------------------------------------
   A house reads as: lit roof slope, ridge, shaded slope, then a
   façade strip with door and windows, then a cast shadow.
   ------------------------------------------------------------ */

export const HOUSE = [
  '........oooooooo........',
  '.......oRRRRRRRRo.......',
  '......oRRRRRRRRRRo......',
  '.....oRRRRRRRRRRRRo.....',
  '....oRRRRRRRRRRRRRRo....',
  '...oRRRRRRRRRRRRRRRRo...',
  '..oRRRRRRRRRRRRRRRRRRo..',
  '.oRRRRRRRRRRRRRRRRRRRRo.',
  'orrrrrrrrrrrrrrrrrrrrrro',
  'osssssssssssssssssssssso',
  'osssssssssssssssssssssso',
  'oooooooooooooooooooooooo',
  'oBBBBBBBBBBBBBBBBBBBBBBo',
  'oBByyyyBBBBBBBBByyyyBBBo',
  'oBByyyyBBBoooooByyyyBBBo',
  'oBBooooBBBonnnoBooooBBBo',
  'obbbbbbbbbonnnobbbbbbbbo',
  'obbbbbbbbbonnnobbbbbbbbo',
  'occccccccconnnocccccccco',
  'oooooooooooooooooooooooo',
  '.zzzzzzzzzzzzzzzzzzzzzz.',
  '..zzzzzzzzzzzzzzzzzzzz..',
];

/** Bigger, flat-roofed block — reads as institutional next to HOUSE. */
export const CAMPUS = [
  '....oooooooooooooooooooo....',
  '...oRRRRRRRRRRRRRRRRRRRRo...',
  '..oRRRRRRRRRRRRRRRRRRRRRRo..',
  '.oRRRRRRRRRRRRRRRRRRRRRRRRo.',
  'orrrrrrrrrrrrrrrrrrrrrrrrrro',
  'osssssssssssssssssssssssssso',
  'oooooooooooooooooooooooooooo',
  'oBBBBBBBBBBBBBBBBBBBBBBBBBBo',
  'oByyyyBByyyyBByyyyBByyyyBBBo',
  'oByyyyBByyyyBByyyyBByyyyBBBo',
  'oBooooBBooooBBooooBBooooBBBo',
  'obbbbbbbbbbbbbbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbooobbbbbbbbbbbo',
  'obbbbbbbbbbbbonnobbbbbbbbbbo',
  'occcccccccccconnocccccccccco',
  'oooooooooooooooooooooooooooo',
  '.zzzzzzzzzzzzzzzzzzzzzzzzzz.',
  '..zzzzzzzzzzzzzzzzzzzzzzzz..',
];

/* ---- character ---------------------------------------------
   Two-frame walk cycle, facing down. Two frames is enough at this
   size — the references' sprites are 2-4 and read fine in motion.
   ------------------------------------------------------------ */

export const HERO_DOWN = [
  [
    '..oooooo..',
    '.oaaaaaao.',
    'oakkkkkkao',
    'oakokkokao',
    'oakkkkkkao',
    'oaokkkkoao',
    '.ookkkkoo.',
    '.ollllllo.',
    'ollllllllo',
    'olllmmlllo',
    'ollmmmmllo',
    '.ommmmmmo.',
    '.omm..mmo.',
    '.omo..omo.',
    '.ooo..ooo.',
    '.zz....zz.',
  ],
  [
    '..oooooo..',
    '.oaaaaaao.',
    'oakkkkkkao',
    'oakokkokao',
    'oakkkkkkao',
    'oaokkkkoao',
    '.ookkkkoo.',
    '.ollllllo.',
    'ollllllllo',
    'olllmmlllo',
    'ollmmmmllo',
    '.ommmmmmo.',
    '..ommmmo..',
    '.omo..omo.',
    '.oo....oo.',
    '..zz..zz..',
  ],
];

/* ---- validation -------------------------------------------- */

/**
 * A row one character short shifts every pixel after it and is close to
 * invisible in a 16px sprite. Cheaper to fail at load than to hunt later.
 */
export function validate() {
  const named = {
    GRASS, PATH, WATER, TREE, BUSH, HOUSE, CAMPUS,
    HERO_DOWN_0: HERO_DOWN[0], HERO_DOWN_1: HERO_DOWN[1],
  };
  const problems = [];
  for (const [name, sprite] of Object.entries(named)) {
    const w = sprite[0].length;
    sprite.forEach((row, i) => {
      if (row.length !== w) problems.push(`${name} row ${i}: ${row.length} (expected ${w})`);
    });
  }
  return problems;
}
