/**
 * Edit every word of the Background timeline from one markdown file.
 *
 * WHY
 * ---
 * The copy has to live in `index.html`: it is what ships in the HTML, what a
 * crawler reads, what shows with JS disabled, and what the i18n engine
 * translates. All of that is right, and none of it makes it a good place to
 * WRITE. Seven entries, five fields each, scattered across a thousand-line file
 * in the reverse of the order they are read.
 *
 * So `docs/timeline-copy.md` is where you write and `index.html` is where it is
 * served. One direction only.
 *
 *     node tools/sync-copy.mjs --export   # markup -> doc  (rebuild the doc)
 *     node tools/sync-copy.mjs            # doc -> markup, dry run
 *     node tools/sync-copy.mjs --write    # doc -> markup, apply
 *
 * `--export` exists because the markup can also be edited by hand, and there
 * needs to be a way to pull it back rather than losing it on the next sync.
 *
 * THE FIVE FIELDS
 *   period   the dates. Untranslated — proper nouns (HANDOFF §7).
 *   role     the job title. Translated.
 *   org      employer and place. Untranslated.
 *   desc     the long visible paragraph in the timeline.
 *   note     the short line the ARRIVAL CARD shows on the map. Hidden, translated.
 *   says     the line in the SPEECH BUBBLE. Hidden, translated.
 *
 * WHAT IT REFUSES TO DO
 * Every stop in the doc must exist in the markup and vice versa, and every field
 * it is asked to write must already exist as an element. It will not invent
 * markup — a typo in a stop id or a field name stops the whole run rather than
 * writing six of seven and leaving one entry saying something nobody chose.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const DOC = 'docs/timeline-copy.md';
const HTML = 'index.html';
const FIELDS = ['period', 'role', 'org', 'desc', 'note', 'says'];
const EXPORT = process.argv.includes('--export');
const WRITE = process.argv.includes('--write');

const NL = String.fromCharCode(10);
const html = readFileSync(HTML, 'utf-8');

/* ------------------------------------------------------------- read the markup
   Each field is one element carrying `class="tli__<field>"` inside the `li` for
   that stop. The tag varies — role is an h3, the rest are p — so the pattern
   captures whatever tag it finds and puts the same one back. */
const LI = /<li class="tli"[^>]*data-stop="([a-zA-Z0-9]+)"[^>]*>([\s\S]*?)<\/li>/g;
const fieldRe = (f) => new RegExp(`(<(\\w+) class="tli__${f}"[^>]*>)([\\s\\S]*?)(</\\2>)`);

const current = new Map();
const order = [];
for (const m of html.matchAll(LI)) {
  const id = m[1], body = m[2];
  const row = {};
  for (const f of FIELDS) {
    const fm = body.match(fieldRe(f));
    if (fm) row[f] = fm[3].trim();
  }
  current.set(id, row);
  order.push(id);
}
if (!current.size) { console.error(`no timeline entries found in ${HTML}`); process.exit(1); }

/* ------------------------------------------------------------------ --export */
if (EXPORT) {
  // Walked bottom-up: the list is newest-first, the journey is oldest-first, and
  // the doc is for a person reading the story.
  const journey = [...order].reverse();
  const out = [];
  out.push('# Timeline copy');
  out.push('');
  out.push('Every word of the Background section — the timeline list, the arrival');
  out.push('card on the map, and the speech bubble. **Edit here, then run:**');
  out.push('');
  out.push('```bash');
  out.push('node tools/sync-copy.mjs           # show what would change');
  out.push('node tools/sync-copy.mjs --write   # apply it');
  out.push('```');
  out.push('');
  out.push('## How to edit this');
  out.push('');
  out.push('- **One line per field.** A wrapped line breaks the parser; let it run long.');
  out.push('- **Keep the `- **field:**` prefix exactly as it is.** That is what is matched.');
  out.push('- **HTML is allowed and entities are literal.** `&amp;` must stay `&amp;`, not');
  out.push('  become `&` — this is the markup, verbatim. `<em class="serif">` works.');
  out.push('- **Do not rename a heading.** The `### id` is the stop id and it ties the');
  out.push('  entry to its building on the map.');
  out.push('- To pull hand edits back out of `index.html`: `node tools/sync-copy.mjs --export`.');
  out.push('');
  out.push('## What each field is');
  out.push('');
  out.push('| field | where it shows | translated |');
  out.push('|---|---|---|');
  out.push('| `period` | timeline + card | no — dates are proper nouns |');
  out.push('| `role` | timeline + card | yes |');
  out.push('| `org` | timeline + card | no — names and places |');
  out.push('| `desc` | timeline only, the long paragraph | no |');
  out.push('| `note` | **card only** — the short version | yes |');
  out.push('| `says` | **speech bubble** — keep it to a sentence | yes |');
  out.push('');
  out.push('Deleting a `says` line removes that bubble rather than showing an empty one.');
  out.push('');
  out.push('---');
  out.push('');
  for (const id of journey) {
    out.push(`### ${id}`);
    out.push('');
    for (const f of FIELDS) {
      if (current.get(id)[f] === undefined) continue;
      out.push(`- **${f}:** ${current.get(id)[f].replace(/\s*\n\s*/g, ' ')}`);
    }
    out.push('');
  }
  writeFileSync(DOC, out.join('\n'));
  console.log(`\n${DOC} written from ${HTML} — ${journey.length} entries, ${FIELDS.length} fields each.\n`);
  process.exit(0);
}

/* --------------------------------------------------------------- read the doc */
let doc;
try { doc = readFileSync(DOC, 'utf-8'); }
catch { console.error(`${DOC} not found — run: node tools/sync-copy.mjs --export`); process.exit(1); }

const wanted = new Map();
let id = null;
let sawField = false;
/* Split on either line ending.
   This file is edited in a Windows editor, so it comes back CRLF. Splitting on
   '\n' alone leaves a '\r' on the end of every line, the field pattern stops
   matching, and the tool reports "nothing to do" and exits 0 — it looks like a
   successful run that changed nothing, which is the worst possible way to fail
   when someone has just rewritten their copy. */
for (const line of doc.split(/\r?\n/)) {
  const h = line.match(/^###\s+([a-zA-Z0-9]+)\s*$/);
  if (h) { id = h[1]; wanted.set(id, {}); continue; }
  if (!id) continue;
  const f = line.match(/^-\s+\*\*(\w+):\*\*\s*(.*)$/);
  if (f) { sawField = true; wanted.get(id)[f[1]] = f[2].trim(); }
}

/* Parsing every heading and no field at all is not "no changes" - it is a
   broken read, and reporting it as success is how an afternoon of rewriting
   gets silently dropped. That is exactly what a stray carriage return did:
   the file came back CRLF, every field line carried one on the end, the
   pattern stopped matching, and the tool said "nothing to do" and exited 0. */
if (wanted.size && !sawField) {
  console.error(NL + `read ${wanted.size} entries from ${DOC} but not one field line.`);
  console.error('The "- **field:** value" lines are not being recognised - nothing written.');
  process.exit(1);
}

/* ------------------------------------------------------------- cross-check */
const problems = [];
for (const k of wanted.keys()) if (!current.has(k)) problems.push(`stop "${k}" is in the doc but not in ${HTML}`);
for (const k of current.keys()) if (!wanted.has(k)) problems.push(`stop "${k}" is in ${HTML} but not in the doc`);
for (const [k, row] of wanted) {
  if (!current.has(k)) continue;
  for (const f of Object.keys(row)) {
    if (!FIELDS.includes(f)) problems.push(`${k}: "${f}" is not a field`);
    else if (current.get(k)[f] === undefined) problems.push(`${k}: no <… class="tli__${f}"> in ${HTML} to write to`);
  }
}
if (problems.length) {
  console.error('\nthe doc and the markup disagree — nothing written:\n');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

/* ------------------------------------------------------------------- report */
const edits = [];
for (const [k, row] of wanted)
  for (const [f, v] of Object.entries(row))
    if (current.get(k)[f] !== v) edits.push({ id: k, field: f, was: current.get(k)[f], now: v });

console.log();
if (!edits.length) { console.log(`nothing to do — ${HTML} already matches the doc.\n`); process.exit(0); }
for (const e of edits) {
  console.log(`  ${e.id}.${e.field}`);
  console.log(`      was: ${e.was}`);
  console.log(`      now: ${e.now}`);
}
// The role key is shared by every internship, so three entries translate as one.
const roleEdits = edits.filter((e) => e.field === 'role').map((e) => e.id);
if (roleEdits.length) {
  console.log(`\n  note: role text is per-entry, but the i18n key bg.role.intern is SHARED by`);
  console.log(`  chadda, metarch1 and jaiswal — in a non-English language all three show the`);
  console.log(`  same string. Give one its own key in src/i18n/strings.js to break that.`);
}

if (!WRITE) { console.log(`\n${edits.length} change(s). Add --write to apply.\n`); process.exit(0); }

/* -------------------------------------------------------------------- write */
let out = html;
for (const e of edits) {
  const liRe = new RegExp(`(<li class="tli"[^>]*data-stop="${e.id}"[^>]*>[\\s\\S]*?</li>)`);
  const li = out.match(liRe);
  if (!li) { console.error(`lost the entry for ${e.id} mid-write — stopping`); process.exit(1); }
  const patched = li[1].replace(fieldRe(e.field), (_w, open, _tag, _old, close) => open + e.now + close);
  out = out.replace(li[1], patched);
}

// Nothing may have gone missing on the way through.
const after = [...out.matchAll(LI)].length;
if (after !== current.size) {
  console.error(`\nrefusing to write: ${current.size} entries went in, ${after} came out.`);
  process.exit(1);
}
writeFileSync(HTML, out);
console.log(`\n${edits.length} change(s) written to ${HTML}.\n`);
