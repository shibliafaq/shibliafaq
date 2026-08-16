/**
 * Push the speech-bubble lines from docs/speech-bubbles.md into index.html.
 *
 * WHY THIS EXISTS
 * ---------------
 * The bubble copy lives in `index.html`, hidden inside each `li[data-stop]`,
 * because that is what makes it crawlable and what lets the i18n engine
 * translate it for free. That is right for the site and wrong for writing: the
 * seven lines are scattered across a thousand-line file in the reverse of the
 * order they are spoken, and rewriting them means hunting for each one.
 *
 * So the markdown table is the place to WRITE and index.html stays the place
 * that SERVES. One direction only — doc to html, never back. Editing the html
 * directly still works; the next sync just overwrites it, which is the normal
 * bargain with a generated field.
 *
 * WHAT IT REFUSES TO DO
 * Every id in the table must exist in index.html and every bubble in index.html
 * must appear in the table. A mismatch is a mistake — a renamed stop, a dropped
 * row, a typo in an id — and quietly writing six of seven lines would leave one
 * stop saying something nobody chose. It reports and writes nothing.
 *
 * USAGE
 *   node tools/sync-bubbles.mjs           # show what would change
 *   node tools/sync-bubbles.mjs --write   # apply it
 */

import { readFileSync, writeFileSync } from 'node:fs';

const DOC = 'docs/speech-bubbles.md';
const HTML = 'index.html';
const WRITE = process.argv.includes('--write');

/* ------------------------------------------------------------ read the table
   Rows look like:  | 2 | `chadda` | **519** | My first real office. |
   The id is the only column that identifies anything; the number and the line
   are read for the report but never trusted, because line numbers go stale the
   moment anything above them is edited. */
const doc = readFileSync(DOC, 'utf-8');
const wanted = new Map();
for (const line of doc.split('\n')) {
  const m = line.match(/^\|\s*\d+\s*\|\s*`([a-zA-Z0-9]+)`\s*\|[^|]*\|\s*(.+?)\s*\|\s*$/);
  if (m) wanted.set(m[1], m[2]);
}
if (!wanted.size) {
  console.error(`no rows found in ${DOC} — is the table still there?`);
  process.exit(1);
}

/* ----------------------------------------------------------- read the markup */
const html = readFileSync(HTML, 'utf-8');
const RE = /(<p class="tli__says" data-i18n="bg\.says\.([a-zA-Z0-9]+)"[^>]*>)([\s\S]*?)(<\/p>)/g;
const found = new Map();
for (const m of html.matchAll(RE)) found.set(m[2], m[3]);

/* ------------------------------------------------------------------ cross-check */
const missingInHtml = [...wanted.keys()].filter((k) => !found.has(k));
const missingInDoc = [...found.keys()].filter((k) => !wanted.has(k));
if (missingInHtml.length || missingInDoc.length) {
  console.error('\nthe table and the markup disagree — nothing written:\n');
  for (const k of missingInHtml) console.error(`  ${k.padEnd(14)} in ${DOC}, not in ${HTML}`);
  for (const k of missingInDoc) console.error(`  ${k.padEnd(14)} in ${HTML}, not in ${DOC}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- report */
let changed = 0;
console.log();
for (const [id, text] of wanted) {
  const now = found.get(id);
  if (now === text) { console.log(`  ${id.padEnd(14)} unchanged`); continue; }
  changed++;
  console.log(`  ${id.padEnd(14)} CHANGED`);
  console.log(`      was: ${now}`);
  console.log(`      now: ${text}`);
}
if (!changed) { console.log('\nnothing to do — index.html already matches the table.\n'); process.exit(0); }

if (!WRITE) {
  console.log(`\n${changed} line(s) would change. Add --write to apply.\n`);
  process.exit(0);
}

const out = html.replace(RE, (whole, open, id, _old, close) =>
  (wanted.has(id) ? open + wanted.get(id) + close : whole));

// Never write a file that lost a bubble on the way through.
const after = [...out.matchAll(RE)].length;
if (after !== found.size) {
  console.error(`\nrefusing to write: ${found.size} bubbles went in, ${after} came out.`);
  process.exit(1);
}
writeFileSync(HTML, out);
console.log(`\n${changed} line(s) written to ${HTML}.\n`);
