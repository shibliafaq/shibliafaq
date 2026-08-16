#!/usr/bin/env node
/**
 * crop-sprites.mjs — cut sprites out of the downloaded packs into lossless WebP.
 *
 * Reads tools/pc-building-parts.json and shells out to ffmpeg. Lossless is not
 * optional: any lossy step smears the hard 1px outlines this art is made of.
 *
 * The point of this existing at all is that the rects stop being prose. Every
 * previous crop on this project was a one-shot command whose coordinates only
 * survived in HANDOFF tables, so re-cutting a sprite meant re-deriving it —
 * which is how the bushes ended up as three cells in one file (see the manifest).
 *
 *   node tools/crop-sprites.mjs                 # all sprites
 *   node tools/crop-sprites.mjs bush_ wall_     # only names with these prefixes
 *   node tools/crop-sprites.mjs --sheet         # also write a contact sheet
 *
 * --sheet writes _contact.png into the output dir: every sprite laid out on a
 * grid with its name, which is the cheap way to check a rect is right before
 * anything consumes it.
 */

import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const wantSheet = args.includes('--sheet');
const mArg = args.find((a) => a.startsWith('--manifest='));
const manifestPath = mArg ? mArg.slice(11) : 'tools/pc-building-parts.json';
const manifest = JSON.parse(readFileSync(join(root, manifestPath), 'utf8'));
const prefixes = args.filter((a) => !a.startsWith('--'));

const outDir = join(root, manifest.outDir);
mkdirSync(outDir, { recursive: true });

const ff = (cmdArgs) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...cmdArgs], { cwd: root });

const sprites = manifest.sprites.filter((s) => s.name
  && (!prefixes.length || prefixes.some((p) => s.name.startsWith(p))));

let made = 0;
const written = [];

for (const s of sprites) {
  const src = manifest.sources[s.src];
  if (!src) throw new Error(`${s.name}: unknown source "${s.src}"`);
  if (!existsSync(join(root, src))) throw new Error(`${s.name}: missing source ${src}`);

  const [x, y, w, h] = s.rect;
  const out = join(outDir, `${s.name}.webp`);
  ff(['-i', src, '-vf', `crop=${w}:${h}:${x}:${y}`, '-c:v', 'libwebp', '-lossless', '1', out]);

  // A zero-byte or absurdly small file means the crop fell outside the image.
  // loadAll() rejects on a broken sheet and takes the whole map down with no
  // useful error (HANDOFF 9.10), so fail loudly here instead.
  const size = readFileSync(out).length;
  if (size < 60) throw new Error(`${s.name}: crop produced ${size} bytes — rect ${s.rect} is probably off-sheet`);

  written.push({ ...s, w, h, size });
  made++;
  console.log(`${s.name.padEnd(16)} ${String(w).padStart(3)}x${String(h).padStart(3)}  ${String(size).padStart(6)}B  ${s.src}`);
}

console.log(`\n${made} sprites -> ${manifest.outDir}`);

if (wantSheet) {
  // One row per 8 sprites, each cell padded to the widest/tallest so the grid is
  // readable. Built with ffmpeg rather than a library for the same reason the
  // rest of this pipeline is: ffmpeg is already the only image dependency.
  const cols = 8;
  const cellW = Math.max(...written.map((s) => s.w)) + 8;
  const cellH = Math.max(...written.map((s) => s.h)) + 8;
  const rows = Math.ceil(written.length / cols);

  const inputs = written.flatMap((s) => ['-i', join(outDir, `${s.name}.webp`)]);
  const pads = written.map((s, i) =>
    `[${i}:v]pad=${cellW}:${cellH}:${Math.floor((cellW - s.w) / 2)}:${cellH - s.h - 4}:0x00000000[p${i}]`);
  const rowFilters = [];
  for (let r = 0; r < rows; r++) {
    const slice = written.map((_, i) => i).slice(r * cols, (r + 1) * cols);
    // vstack demands equal widths, so a short final row has to be padded out to
    // the full grid width rather than stacked as-is.
    const stackPart = slice.length > 1 ? `hstack=inputs=${slice.length},` : '';
    rowFilters.push(`${slice.map((i) => `[p${i}]`).join('')}${stackPart}pad=${cols * cellW}:${cellH}:0:0:0x00000000[r${r}]`);
  }
  const stack = rows > 1
    ? `${Array.from({ length: rows }, (_, r) => `[r${r}]`).join('')}vstack=inputs=${rows}[grid]`
    : '[r0]null[grid]';

  const filter = [...pads, ...rowFilters, stack,
    `[grid]pad=iw:ih:0:0:0x14141Aff,scale=iw*2:ih*2:flags=neighbor[out]`].join(';');

  ff([...inputs, '-filter_complex', filter, '-map', '[out]', join(outDir, '_contact.png')]);
  console.log(`contact sheet -> ${manifest.outDir}/_contact.png  (${cols} per row, order as listed above)`);
}
