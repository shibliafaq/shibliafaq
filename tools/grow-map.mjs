/**
 * Insert empty rows into the valley document without disturbing the work in it.
 *
 * WHY THIS IS A TOOL AND NOT TWO EDITED NUMBERS
 * ---------------------------------------------
 * Changing COLS/ROWS in valley.js does grow the map — `migrateDoc` re-indexes
 * the terrain on the next load and keeps every object at its own (c,r). But it
 * can only ever add space at the RIGHT EDGE and the BOTTOM, because it copies
 * cell (c,r) to (c,r). Space in the middle of the map is a different operation:
 * everything below the insertion point has to move down with it, and that is a
 * change to the document, not to a constant.
 *
 * It is also the operation with the most to lose. This map has been lost twice.
 * So the transform is written out explicitly, and then CHECKED AGAINST THE
 * ORIGINAL CELL BY CELL AND OBJECT BY OBJECT before a single byte is written.
 * If any check fails the process exits and nothing is touched.
 *
 * WHAT IT GUARANTEES
 *   - every row above the insertion point is byte-identical, cell for cell
 *   - every row below it is byte-identical, shifted down by exactly `count`
 *   - every object and decor keeps its name, id, column and scale; only the row
 *     of those at or below the insertion point changes, by exactly `count`
 *   - object and decor counts are unchanged
 *   - the new rows are copies of `template`, so the ground and any road running
 *     through it continue rather than restarting as grass
 *
 * USAGE
 *   node tools/grow-map.mjs --at=137 --count=24 --template=136
 *   node tools/grow-map.mjs --at=137 --count=24 --template=136 --write
 *
 * Without --write it is a dry run: it does the whole transform, runs every
 * check, prints the report, and writes nothing.
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const MAP = 'public/assets/pixel/valley-map.json';
const HISTORY = '.map-history';

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const AT = +arg('at', NaN);
const COUNT = +arg('count', NaN);
const TEMPLATE = +arg('template', NaN);
const WRITE = process.argv.includes('--write');

if (!Number.isInteger(AT) || !Number.isInteger(COUNT) || !Number.isInteger(TEMPLATE)) {
  console.error('need --at=<row> --count=<rows> --template=<row to copy>');
  process.exit(1);
}

const fail = (msg) => { console.error(`\n  FAILED: ${msg}\n  Nothing was written.`); process.exit(1); };

/* ---------------------------------------------------------------- read + guard */
const raw = readFileSync(MAP, 'utf-8');
const src = JSON.parse(raw);

if (!Array.isArray(src.terrain) || !Array.isArray(src.objects) || !Array.isArray(src.decors)) {
  fail('not a valley document');
}
if (src.terrain.length !== src.cols * src.rows) {
  fail(`terrain is ${src.terrain.length} cells but the document declares ${src.cols}x${src.rows}`);
}
if (AT < 0 || AT > src.rows) fail(`--at=${AT} is outside 0..${src.rows}`);
if (TEMPLATE < 0 || TEMPLATE >= src.rows) fail(`--template=${TEMPLATE} is outside the map`);
if (COUNT <= 0) fail('--count must be positive');

const { cols } = src;
const oldRows = src.rows;
const newRows = oldRows + COUNT;

/* ------------------------------------------------------------------- transform */
const row = (t, r) => t.slice(r * cols, (r + 1) * cols);
const tmpl = row(src.terrain, TEMPLATE);

const terrain = [];
for (let r = 0; r < AT; r++) terrain.push(...row(src.terrain, r));
for (let i = 0; i < COUNT; i++) terrain.push(...tmpl);
for (let r = AT; r < oldRows; r++) terrain.push(...row(src.terrain, r));

const shift = (list) => list.map((e) => (e.r >= AT ? { ...e, r: e.r + COUNT } : { ...e }));
const objects = shift(src.objects);
const decors = shift(src.decors);

const out = { ...src, rows: newRows, terrain, objects, decors,
  grownAt: { at: AT, count: COUNT, template: TEMPLATE, from: `${cols}x${oldRows}` } };

/* ------------------------------------------------------------ verify, then write
   Every check compares the RESULT back to the ORIGINAL. Checking the transform
   against the rules that produced it would only prove the code ran. */
let checks = 0;
const must = (cond, msg) => { checks++; if (!cond) fail(msg); };

must(terrain.length === cols * newRows,
  `terrain is ${terrain.length}, expected ${cols * newRows}`);

for (let r = 0; r < AT; r++)
  for (let c = 0; c < cols; c++)
    must(terrain[r * cols + c] === src.terrain[r * cols + c],
      `row ${r} col ${c} changed above the insertion point`);

for (let r = AT; r < AT + COUNT; r++)
  for (let c = 0; c < cols; c++)
    must(terrain[r * cols + c] === tmpl[c],
      `new row ${r} col ${c} is not a copy of row ${TEMPLATE}`);

for (let r = AT; r < oldRows; r++)
  for (let c = 0; c < cols; c++)
    must(terrain[(r + COUNT) * cols + c] === src.terrain[r * cols + c],
      `old row ${r} col ${c} did not survive the shift`);

must(objects.length === src.objects.length, 'object count changed');
must(decors.length === src.decors.length, 'decor count changed');

const same = (a, b, label, i) => {
  for (const k of Object.keys(a)) {
    if (k === 'r') continue;
    must(JSON.stringify(a[k]) === JSON.stringify(b[k]),
      `${label} ${i}: ${k} changed (${JSON.stringify(a[k])} -> ${JSON.stringify(b[k])})`);
  }
  must(Object.keys(b).length === Object.keys(a).length, `${label} ${i}: field count changed`);
  must(b.r === (a.r >= AT ? a.r + COUNT : a.r), `${label} ${i}: row is wrong`);
};
src.objects.forEach((o, i) => same(o, objects[i], 'object', i));
src.decors.forEach((d, i) => same(d, decors[i], 'decor', i));

/* ---------------------------------------------------------------------- report */
const moved = src.objects.filter((o) => o.r >= AT);
const movedD = src.decors.filter((d) => d.r >= AT);
console.log(`\n  ${cols}x${oldRows}  ->  ${cols}x${newRows}   (+${COUNT} rows at row ${AT})`);
console.log(`  new rows are copies of row ${TEMPLATE}: `
  + `${[...new Set(tmpl)].map((v) => `id ${v}`).join(', ')}`);
console.log(`\n  objects  ${src.objects.length} -> ${objects.length}   `
  + `(${moved.length} shifted down, ${src.objects.length - moved.length} untouched)`);
console.log(`  decor    ${src.decors.length} -> ${decors.length}   `
  + `(${movedD.length} shifted down, ${src.decors.length - movedD.length} untouched)`);
if (moved.length) {
  console.log('\n  shifted:');
  moved.forEach((o) => console.log(`     ${o.name}  row ${o.r} -> ${o.r + COUNT}  (col ${o.c})`));
}
console.log(`\n  ${checks.toLocaleString()} checks passed against the original.`);

if (!WRITE) {
  console.log('\n  DRY RUN — nothing written. Add --write to apply.\n');
  process.exit(0);
}

mkdirSync(HISTORY, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backup = `${HISTORY}/PROTECTED-pre-grow-${stamp}.json`;
copyFileSync(MAP, backup);
writeFileSync(MAP, JSON.stringify(out));
console.log(`\n  written.  previous version kept at ${backup}\n`);
