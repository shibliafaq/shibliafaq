#!/usr/bin/env node
/**
 * build-map-kit.mjs — export everything needed to rebuild/edit the Experience
 * map by hand in Photoshop.
 *
 *   node tools/build-map-kit.mjs [outDir]      default: ../map-kit
 *
 * Writes PNG, never WebP: Photoshop before 2022 cannot open WebP at all, and
 * the sources are PNG anyway so this loses nothing.
 *
 * Three things go in the box:
 *   1. every sprite the map uses, cut and named, by category
 *   2. every sprite it does NOT use but could — churches, museums, Szadi, the
 *      unused manors — so the alternatives are in the same place
 *   3. placement.csv — the exact pixel position of all ~6000 draw operations,
 *      in draw order, so the current composition can be reproduced exactly
 *      rather than eyeballed
 */

import { mkdirSync, copyFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || join(root, '..', 'map-kit'));
const INC = join(root, 'assets/tilesets/incoming/_x');

const dir = (...p) => { const d = join(OUT, ...p); mkdirSync(d, { recursive: true }); return d; };
const has = (p) => existsSync(p);

let copied = 0, converted = 0;

/** Copy a PNG straight through, or convert anything else to PNG. */
function put(src, destDir, name) {
  if (!has(src)) return false;
  const out = join(destDir, (name || basename(src, extname(src))) + '.png');
  if (extname(src).toLowerCase() === '.png') { copyFileSync(src, out); copied++; }
  else {
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, out], { stdio: 'pipe' });
      converted++;
    } catch { return false; }
  }
  return true;
}

/** Copy every file matching a filter from a source tree, flattened. */
function putTree(srcDir, destDir, filter = () => true, prefix = '') {
  if (!has(srcDir)) return 0;
  let n = 0;
  for (const e of readdirSync(srcDir)) {
    const p = join(srcDir, e);
    if (statSync(p).isDirectory()) { n += putTree(p, destDir, filter, prefix); continue; }
    if (!/\.png$/i.test(e) || !filter(e, p)) continue;
    if (put(p, destDir, prefix + basename(e, '.png'))) n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */

console.log('building map kit ->', OUT);

/* 1. terrain tiles ------------------------------------------------- */
{
  const d = dir('01-terrain-tiles');
  for (const n of ['grass', 'path', 'water', 'beach', 'cliff', 'farm', 'bridge', 'fences', 'decor'])
    put(join(root, 'public/assets/pixel/cf', n + '.webp'), d, n);
}

/* 2. buildings ----------------------------------------------------- */
{
  const used = dir('02-buildings', 'used-on-map');
  const free = dir('02-buildings', 'available-unused');
  const pre = join(root, 'public/assets/pixel/premade');
  for (const n of ['inst_academic', 'inst_research', 'off_manor1', 'off_manor2',
                   'off_manor3', 'off_cottage', 'off_lshape'])
    put(join(pre, n + '.webp'), used, n);
  put(join(root, 'public/assets/pixel/mix/house_red.webp'), used, 'house_red');
  put(join(root, 'public/assets/pixel/mix/house_blue.webp'), used, 'house_blue');
  put(join(root, 'public/assets/pixel/cf/house.webp'), used, 'house_cutefantasy');

  put(join(pre, 'off_farmhouse.webp'), free, 'off_farmhouse');
  const F = join(INC, 'freesamples/Free-Samples/buildings');
  putTree(join(F, 'church'), free, (e) => /church\d+\.png/i.test(e));
  putTree(join(F, 'museum'), free, (e) => /museum\d+\.png/i.test(e));
  putTree(join(F, 'noble-manor'), free, (e) => /noble-manor\d+\.png/i.test(e));
  putTree(join(F, 'market-stall'), free, (e) => /market-stall\d+\.png/i.test(e));
  putTree(join(INC, 'p16'), free, () => true, 'pixel16-village-sheet-');
}

/* 3. trees and plants ---------------------------------------------- */
{
  const used = dir('03-trees-and-plants', 'used-on-map');
  const free = dir('03-trees-and-plants', 'available-unused');
  const kib = join(root, 'public/assets/pixel/kib');
  for (const n of ['maple3', 'maple4', 'maple5', 'maple6', 'maple7', 'maple14',
                   'bush2', 'bush7', 'bush12', 'bush19'])
    put(join(kib, n + '.webp'), used, 'kibyra_' + n);
  for (const n of ['tree_autumn', 'tree_amber', 'conifer', 'conifer2', 'conifer_small'])
    put(join(root, 'public/assets/pixel/mix', n + '.webp'), used, 'pixelcrawler_' + n);
  put(join(root, 'public/assets/pixel/cf/tree.webp'), used, 'cutefantasy_oak');
  put(join(root, 'public/assets/pixel/cf/tree_small.webp'), used, 'cutefantasy_oak_small');

  // every maple, including the ones not chosen
  putTree(join(INC, 'freesamples/Free-Samples/structures/trees'), free, () => true, 'kibyra_');
  putTree(join(INC, 'freesamples/Free-Samples/structures/grasses-plants-bushes'), free, () => true, 'kibyra_');
  // all Pixel Crawler tree models and sizes (seasonal variants live inside each)
  putTree(join(INC, 'pixelcrawler/Pixel Crawler - Free Pack/Environment/Props/Static/Trees'),
          free, (e) => /^Size_\d+\.png$/i.test(e), 'pixelcrawler_tree_');
}

/* 4. props --------------------------------------------------------- */
{
  const d = dir('04-props');
  const kib = join(root, 'public/assets/pixel/kib');
  for (const n of ['well1', 'well4', 'pond1', 'pond3', 'mstall1', 'mstall2', 'mstall3'])
    put(join(kib, n + '.webp'), d, 'kibyra_' + n);
  for (const n of ['rock_big', 'rock_mid', 'rock_sm', 'stall', 'scarecrow', 'rocks', 'vegetation'])
    put(join(root, 'public/assets/pixel/mix', n + '.webp'), d, n);
  putTree(join(INC, 'freesamples/Free-Samples/structures/wells'), d, () => true, 'kibyra_');
  putTree(join(INC, 'freesamples/Free-Samples/structures/fishponds'), d, () => true, 'kibyra_');
  const P = join(INC, 'pixelcrawler/Pixel Crawler - Free Pack/Environment/Props/Static');
  for (const n of ['Farm', 'Resources', 'Vegetation', 'Rocks', 'Shadows'])
    put(join(P, n + '.png'), d, 'pixelcrawler_' + n.toLowerCase() + '_SHEET');
  putTree(join(INC, 'Resurrected RPG 1.1'), d, (e) => /Props|Plants|Grass|Wall/i.test(e), 'resurrected_');
}

/* 5. characters ---------------------------------------------------- */
{
  const hero = dir('05-characters', 'hero');
  const vil = dir('05-characters', 'villagers-used');
  const free = dir('05-characters', 'available-unused');
  for (const d of ['down', 'left', 'right', 'up']) {
    put(join(root, 'public/assets/pixel/hero', `idle_${d}.webp`), hero, `hero_idle_${d}`);
    put(join(root, 'public/assets/pixel/hero', `run_${d}.webp`), hero, `hero_run_${d}`);
  }
  const mix = join(root, 'public/assets/pixel/mix');
  for (const n of ['villager_a', 'villager_b', 'villager_c', 'villager_hold',
                   'villager_carry', 'villager_rogue', 'villager_knight', 'villager_wizard'])
    put(join(mix, n + '.webp'), vil, n);
  for (const n of ['animal_chicken', 'animal_cow', 'animal_sheep'])
    put(join(mix, n + '.webp'), vil, n);
  for (const n of ['villager_cf_side', 'villager_cf_up', 'villager_mw'])
    put(join(mix, n + '.webp'), free, n + '_20px_CORRECT_SCALE');
  put(join(root, 'public/assets/pixel/cf/player.webp'), free, 'cutefantasy_player_20px_CORRECT_SCALE');
  putTree(join(INC, "pixelcrawler/Pixel Crawler - Free Pack/Entities/Npc's"), free, () => true, 'pixelcrawler_npc_');
}

/* 6. full uncropped source sheets ---------------------------------- */
{
  const d = dir('06-full-source-sheets');
  putTree(join(INC, 'cute/Cute_Fantasy_Free'), d, () => true, 'cutefantasy_');
  putTree(join(INC, 'freesamples/Free-Samples'), d, (e) => /s\.png$/i.test(e), 'kibyra_');
  putTree(join(INC, 'forest'), d, (e) => /Tileset\.png|Decorations\.png/i.test(e), 'topdownforest_');
  put(join(INC, 'szadi/Houses_Pack/houses.png'), d, 'szadi_houses_PUBLIC_DOMAIN');
}

/* 7. references ---------------------------------------------------- */
{
  const d = dir('07-map-references');
  const R = join(root, 'assets/Pixel Art');
  if (has(R)) for (const e of readdirSync(R)) {
    const p = join(R, e);
    if (!statSync(p).isFile()) continue;
    try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', p, join(d, 'reference_' + basename(e, extname(e)) + '.png')], { stdio: 'pipe' }); converted++; } catch {}
  }
}

/* 8. exact placement of the current composition -------------------- */
{
  const d = dir('08-current-composition');
  const { buildScene } = await import('../src/modules/pixel/worldmap.js');
  const { SPRITES, TILE } = await import('../src/modules/pixel/cutefantasy.js');
  const { scene, cols, rows } = buildScene();

  // reverse-map an op back to the sprite name that produced it
  const bySig = new Map();
  for (const [name, s] of Object.entries(SPRITES))
    bySig.set(`${s.sheet}|${s.x}|${s.y}|${s.w}|${s.h}`, name);

  const lines = ['order,layer,name,sheet,src_x,src_y,width,height,dest_x,dest_y'];
  scene.ordered().forEach((op, i) => {
    const name = bySig.get(`${op.sheet}|${op.sx}|${op.sy}|${op.sw}|${op.sh}`)
      || (op.sw === TILE && op.sh === TILE ? `${op.sheet}_tile_${op.sx / TILE}_${op.sy / TILE}` : op.sheet);
    lines.push([i, op.layer ?? 0, name, op.sheet, op.sx, op.sy, op.sw, op.sh, op.x, op.y].join(','));
  });
  writeFileSync(join(d, 'placement.csv'), lines.join('\n'));
  writeFileSync(join(d, 'canvas-size.txt'),
    `${cols * TILE} x ${rows * TILE} px  (${cols} x ${rows} tiles of ${TILE}px)\n` +
    `draw operations: ${scene.ops.length}\n` +
    `placement.csv is in DRAW ORDER: ground first, then objects sorted by baseline.\n`);
  console.log('placement rows:', lines.length - 1);
}

/* 9. read me ------------------------------------------------------- */
writeFileSync(join(OUT, '00-READ-ME-FIRST.txt'), `EXPERIENCE MAP - ASSET KIT
=========================================================================
Everything used to build the Experience & Education map, plus everything
available that is not currently used. All PNG (Photoshop before 2022 cannot
open WebP).

-------------------------------------------------------------------------
THE ONE RULE THAT MATTERS: SCALE
-------------------------------------------------------------------------
Do not size anything by eye. Measure a DOOR.

A real door is 2.0 m. On the Kibyra buildings a door is 22-24 px, which fixes
the whole world at:

        ~12 px per metre     1 tile (16 px) = 1.33 m     an adult = 20 px

Checked against that:
  noble manor      107 px = 8.9 m   correct 2.5-storey house
  cottage          136 px = 11.3 m  tall house, fine
  Cute Fantasy man  20 px = 1.67 m  CORRECT
  current hero      34 px = 2.8 m   TOO BIG - a giant
  Pixel Crawler NPC 30 px = 2.5 m   too big
  "market-stall"   100 px = 8.3 m   NOT a stall - it is a small building
  mature tree      126 px = 10.5 m  correct

The buildings are right. The characters are too big. The 20 px characters in
05-characters/available-unused are the correctly scaled ones - they are marked
CORRECT_SCALE in their filenames.

-------------------------------------------------------------------------
FOLDERS
-------------------------------------------------------------------------
01-terrain-tiles        16px tiles. The terrain sheets are 3x3 NINE-SLICE
                        blobs: corners/edges/centre. The CENTRE tile is at
                        grid (1,1) - use that for plain fill. Using edge
                        tiles for a fill is why shores came out blue.
02-buildings            used-on-map / available-unused (churches, museums,
                        all four noble manors, market stalls, Pixel 16)
                        NOTE churches and museums have CHURCH / MUSEUM
                        painted on their signboards. On church1.png the
                        plaque and chains are at (48,66)-(86,84); clean grey
                        stone to patch from is at about (96,70).
03-trees-and-plants     used-on-map / available-unused. The Pixel Crawler
                        tree sheets hold SEASONAL VARIANTS in one image -
                        green, yellow, ORANGE, AMBER, bare, snowy - laid out
                        in a grid. The autumn ones are already the site's
                        palette; they need no recolouring.
04-props                wells, fishponds, stalls, rocks, scarecrow, and the
                        full farm/resources/vegetation sheets
05-characters           hero (8 direction sheets, 8 frames at 96x80 pitch,
                        figure centred x=48 with feet at y=58), villagers
                        used, and the correctly scaled 20px ones
06-full-source-sheets   complete uncropped pack sheets
07-map-references       the five pixel-art references the map is based on
08-current-composition  placement.csv - the exact pixel position of every
                        one of ~6000 draw operations, in draw order, plus the
                        canvas size. This reproduces the current map exactly.

-------------------------------------------------------------------------
LICENCES - read before publishing anything
-------------------------------------------------------------------------
Kibyra (Free-Samples)      commercial use permitted, no resale of the pack
Trislin (Pixel Lands)      any commercial or non-commercial project
Szadi (Houses_Pack)        PUBLIC DOMAIN - the cleanest terms here
FREE_Adventurer (hero)     any project, personal or commercial; no NFTs
Anokolisa (Pixel Crawler)  commercial use permitted
Cute Fantasy (Kenmi)       NON-COMMERCIAL only
Mystic Woods               NON-COMMERCIAL only
Pixel 16, TopDownForest    no licence file shipped - terms unread

Full text: v2/assets/tilesets/incoming/LICENCES.md
`);

console.log(`done. ${copied} copied, ${converted} converted -> ${OUT}`);
