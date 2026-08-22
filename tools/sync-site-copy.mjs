/**
 * Edit every word on the front page from one markdown file.
 *
 *     node tools/sync-site-copy.mjs --init     # one time: give every string an anchor
 *     node tools/sync-site-copy.mjs --export   # index.html -> docs/site-copy.md
 *     node tools/sync-site-copy.mjs            # docs/site-copy.md -> index.html, DRY RUN
 *     node tools/sync-site-copy.mjs --write    # apply it
 *
 * WHY THIS EXISTS
 * ---------------
 * The copy has to live in `index.html`: that is what ships in the HTML, what a
 * crawler reads, what shows with JavaScript off, and what the i18n engine
 * translates. All of that is right, and none of it makes a 1,200-line file a
 * good place to WRITE. This gives you one document, in reading order, and puts
 * the words back where they belong.
 *
 * `tools/sync-copy.mjs` already does this for the seven Background timeline
 * entries and their six fields. This is the whole rest of the page, and the two
 * do not overlap: anything carrying `class="tli__*"` is skipped here and stays
 * the other tool's job.
 *
 * HOW A STRING IS ANCHORED
 * ------------------------
 * Every editable element needs a stable, unique name that survives its text
 * changing. Two sources, in order:
 *
 *   1. `data-i18n="about.p1"` — already on ~98 elements, because the translation
 *      engine needs the same thing. Reused rather than duplicated.
 *   2. `data-copy="about.3"` — added by `--init` to everything else.
 *
 * Position is deliberately NOT used as an anchor. "The third paragraph in the
 * About section" stops meaning anything the moment you add a paragraph, and
 * silently writes your new text over the wrong element.
 *
 * WHY NOT A REGEX FOR THE CLOSING TAG
 * -----------------------------------
 * The obvious `(<p[^>]*>)([\s\S]*?)(</p>)` finds the FIRST `</p>`, which is the
 * wrong one the moment an element contains another of its own kind. `sliceInner`
 * counts opens and closes instead, so nesting is handled and a `<div>` wrapping
 * other `<div>`s is safe. Slower, and correct.
 *
 * WHAT IT REFUSES TO DO
 * ---------------------
 * It will not invent markup. Every anchor in the document must already exist in
 * the page; an unknown one stops the whole run rather than writing most of the
 * page and leaving one heading saying something nobody chose. It also refuses
 * to write if it parses headings but finds no fields — the failure mode that
 * made the timeline tool report "nothing to do" on every edit for a whole
 * session, because of CRLF line endings.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const HTML = 'index.html';
const DOC = 'docs/site-copy.md';
/* The baseline: what index.html said for each key the last time the two files
   were in agreement. Written by --export and refreshed after every successful
   --write, so it self-heals and never needs maintaining by hand. */
const LOCK = 'docs/.site-copy.lock.json';
const NL = String.fromCharCode(10);

const INIT = process.argv.includes('--init');
const EXPORT = process.argv.includes('--export');
const WRITE = process.argv.includes('--write');
const FORCE = process.argv.includes('--force');

/** Same normalisation the comparison uses, so a hash and a match agree. */
const norm = (t) => t.trim().replace(/\s+/g, ' ');
const hash = (t) => createHash('sha256').update(norm(t)).digest('hex').slice(0, 16);

function readLock() {
  if (!existsSync(LOCK)) return null;
  try { return JSON.parse(readFileSync(LOCK, 'utf-8')).keys || null; }
  catch { return null; }
}

function writeLock(items) {
  const keys = {};
  for (const it of items) keys[it.key] = hash(it.text);
  writeFileSync(LOCK, JSON.stringify({
    note: 'Baseline for tools/sync-site-copy.mjs. Generated - do not edit by hand.',
    generated: new Date().toISOString(),
    keys,
  }, null, 2) + NL);
}

/* Elements that carry prose. Deliberately a whitelist: <div> and <section> are
   containers, and treating them as copy would hand you the entire page as one
   uneditable blob. */
const TEXTY = ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'span', 'a', 'button',
  'blockquote', 'figcaption', 'summary', 'strong', 'em', 'small', 'label'];

/* Left alone on purpose:
   tli, tli__* the timeline — tools/sync-copy.mjs owns those, from its own doc.
               `tli` matters as much as `tli__`: without it --init anchored
               the seven <li class="tli"> wrappers too, so site-copy.md ended up
               owning the whole CV a second time
   sec-title   split into per-character spans by the reveal animation at runtime,
               but static in the file, so it IS editable — kept in.
   journey__   map chrome written by JS at runtime; editing the HTML does nothing */
const SKIP_CLASS = /\btli\b|\btli__|\bjourney__rail\b|\bjourney__cards\b/;

/** Human-readable section names, in page order. */
const SECTIONS = {
  hero: 'Hero', future: 'The other outcome — second globe',
  about: 'About', direction: 'Research direction',
  thermal: 'Thermal sequence', projects: 'Projects', atlas: 'Atlas',
  skills: 'Skills',
  background: 'Background — headings and chrome', contact: 'Contact',
  _nav: 'Navigation and footer',
};

/* ------------------------------------------------------------------ parsing */

/** Index just past `<tag ...>`, and the index of its matching `</tag>`.
    Counts nesting rather than trusting the first close. */
function sliceInner(html, tagStart, tag) {
  const open = html.indexOf('>', tagStart);
  if (open === -1) return null;
  if (html[open - 1] === '/') return { from: open + 1, to: open + 1 }; // self-closed
  const openRe = new RegExp(`<${tag}(\\s|>|/)`, 'gi');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1, i = open + 1;
  while (i < html.length) {
    openRe.lastIndex = i; closeRe.lastIndex = i;
    const o = openRe.exec(html), c = closeRe.exec(html);
    if (!c) return null;
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    depth--;
    if (depth === 0) return { from: open + 1, to: c.index };
    i = c.index + 1;
  }
  return null;
}

/** Every anchored element, OUTERMOST ONLY: {key, tag, from, to, text}.
 *
 *  Nested anchors are dropped, and this is the single most important rule in
 *  the file. `<p data-i18n="about.p1">… <em data-copy="about.7">word</em> …</p>`
 *  is TWO anchors over overlapping text: rewriting the paragraph replaces the
 *  span the `<em>` anchor pointed at, so the next run writes the old `<em>` text
 *  back into the middle of the new paragraph, or into nothing at all. Measured
 *  on the first pass: 61 of 352 anchors were nested like this.
 *
 *  Keeping the outer one is also what you want editorially — the paragraph and
 *  its inline emphasis are one sentence to edit, not two fragments. */
function collect(html) {
  const all = [];
  const re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    if (!TEXTY.includes(tag)) continue;
    const attrs = m[2];
    if (SKIP_CLASS.test(attrs)) continue;
    const key = (attrs.match(/\bdata-i18n="([^"]+)"/) || attrs.match(/\bdata-copy="([^"]+)"/) || [])[1];
    if (!key) continue;
    const span = sliceInner(html, m.index, tag);
    if (!span) continue;
    all.push({ key, tag, from: span.from, to: span.to, text: html.slice(span.from, span.to) });
  }
  // Document order means a parent always precedes its children, so one pass
  // with a high-water mark is enough.
  const out = [];
  let coveredTo = -1;
  for (const it of all) {
    if (it.from < coveredTo) continue;
    out.push(it);
    coveredTo = it.to;
  }
  return out;
}

/** Which section an offset falls in, for grouping the doc. */
function sectionAt(html, idx) {
  const before = html.slice(0, idx);
  const ids = [...before.matchAll(/<section[^>]*\bid="([^"]+)"/g)];
  if (!ids.length) return '_nav';
  const last = ids[ids.length - 1];
  const close = before.lastIndexOf('</section>');
  return close > last.index ? '_nav' : last[1];
}

/* -------------------------------------------------------------------- --init */

if (INIT) {
  let html = readFileSync(HTML, 'utf-8');
  const re = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  const adds = [];
  let m;
  /* Outermost only. Anything inside an element that already has an anchor —
     or that just got one — is part of that element's text, not a string of its
     own. Without this the run produced 352 anchors of which 61 were nested
     inside another, which is a corruption waiting to happen (see `collect`). */
  let coveredTo = -1;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    if (!TEXTY.includes(tag)) continue;
    if (m.index < coveredTo) continue;
    const attrs = m[2];
    if (SKIP_CLASS.test(attrs)) continue;
    const span = sliceInner(html, m.index, tag);
    if (!span) continue;
    if (/\bdata-i18n=|\bdata-copy=/.test(attrs)) { coveredTo = span.to; continue; }
    const inner = html.slice(span.from, span.to);
    // Only things that actually carry words. An element holding nothing but
    // other elements is scaffolding; its children are the copy.
    const bare = inner.replace(/<[^>]*>/g, '').trim();
    if (!bare) continue;
    adds.push({ at: m.index + 1 + tag.length, sec: sectionAt(html, m.index) });
    coveredTo = span.to;
  }
  // back to front, so earlier offsets stay valid
  const counters = {};
  const numbered = adds.map((a) => {
    counters[a.sec] = (counters[a.sec] || 0) + 1;
    return { ...a, key: `${a.sec}.${counters[a.sec]}` };
  });
  for (let i = numbered.length - 1; i >= 0; i--) {
    const a = numbered[i];
    html = html.slice(0, a.at) + ` data-copy="${a.key}"` + html.slice(a.at);
  }
  writeFileSync(HTML, html);
  console.log(`--init: ${numbered.length} strings given a data-copy anchor.`);
  console.log('Run --export next to build the document.');
  process.exit(0);
}

/* ------------------------------------------------------------------ --export */

if (EXPORT) {
  const html = readFileSync(HTML, 'utf-8');
  const items = collect(html);
  const bySec = new Map();
  for (const it of items) {
    const sec = sectionAt(html, it.from);
    if (!bySec.has(sec)) bySec.set(sec, []);
    bySec.get(sec).push(it);
  }
  const lines = [
    '# Front page copy',
    '',
    'Every word on the front page except the Background timeline, which has its',
    'own document (`timeline-copy.md`) because its seven entries have six fields',
    'each.',
    '',
    '**Edit the text after each `- ` and run:**',
    '',
    '```bash',
    'node tools/sync-site-copy.mjs           # show what would change',
    'node tools/sync-site-copy.mjs --write   # apply it',
    '```',
    '',
    '## Rules',
    '',
    '- **One line per string.** A wrapped line breaks the parser — let it run long.',
    '- **Do not touch the `### key` headings.** That is what ties the text to its',
    '  place in the page. Renaming one makes the tool stop rather than guess.',
    '- **HTML is allowed and entities are literal.** `&amp;` stays `&amp;`.',
    '  `<em class="serif">…</em>` works and is used for thesis titles.',
    '- **To delete a string, empty it** — leave the `- ` and the heading. Removing',
    '  the heading makes the tool refuse the whole run.',
    '- Keys beginning `about.`, `atlas.` etc. are also i18n keys: editing here',
    '  changes the English. Other languages come from `src/i18n/strings.js` and',
    '  fall back to whatever is in the markup.',
    '',
    '---',
    '',
  ];
  for (const [sec, name] of Object.entries(SECTIONS)) {
    const items2 = bySec.get(sec);
    if (!items2 || !items2.length) continue;
    lines.push(`## ${name}`, '');
    for (const it of items2) {
      lines.push(`### ${it.key}`, `- ${it.text.trim().replace(/\s+/g, ' ')}`, '');
    }
  }
  writeFileSync(DOC, lines.join(NL));
  writeLock(items);
  console.log(`--export: ${items.length} strings -> ${DOC}`);
  console.log(`--export: baseline for ${items.length} keys -> ${LOCK}`);
  process.exit(0);
}

/* --------------------------------------------------------------- doc -> html */

const html = readFileSync(HTML, 'utf-8');
const doc = readFileSync(DOC, 'utf-8');

const wanted = new Map();
let headings = 0;
{
  // Split on the heading lines. Tolerant of CRLF: that exact oversight made the
  // timeline tool report "nothing to do" on every single edit for a session.
  const parts = doc.split(/^###[ \t]+(.+?)[ \t]*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim();
    headings++;
    const body = parts[i + 1] || '';
    const line = body.match(/^-[ \t]+(.*)$/m);
    if (line) wanted.set(key, line[1].trim());
    else if (/^-[ \t]*$/m.test(body)) wanted.set(key, '');
  }
}

if (headings && !wanted.size) {
  console.error(`Parsed ${headings} headings but no "- " lines. Refusing to write.`);
  process.exit(1);
}

const items = collect(html);
const byKey = new Map(items.map((i) => [i.key, i]));

const missing = [...wanted.keys()].filter((k) => !byKey.has(k));
if (missing.length) {
  console.error(`These keys are in ${DOC} but not in ${HTML}:`);
  missing.forEach((k) => console.error('  ' + k));
  console.error('Refusing to write — a renamed heading would silently drop its text.');
  process.exit(1);
}

const changes = [];
for (const [key, text] of wanted) {
  const it = byKey.get(key);
  if (it.text.trim().replace(/\s+/g, ' ') === text) continue;
  changes.push({ key, from: it.from, to: it.to, was: it.text.trim(), now: text });
}

if (!changes.length) {
  console.log(`nothing to do — ${HTML} already matches ${DOC}.`);
  process.exit(0);
}

/* ------------------------------------------------- WHICH SIDE ACTUALLY MOVED

   A difference between the two files is not evidence about which one is newer,
   and this tool used to assume it was always the markdown. It is not:
   index.html gets hand-edited too, and nothing reconciles them.

   On 2026-08-21 that assumption nearly shipped a regression. `--write` wanted
   to change publications.1 and publications.3, and those were not whitespace:
   docs/site-copy.md still held the PRE-PUBLICATION text, so applying it would
   have reverted a paper that is published with a DOI back to "Under Review".
   It was caught only by reading `git diff` afterwards, which is not a safety
   net anyone should have to rely on.

   The baseline in docs/.site-copy.lock.json records what the HTML said for each
   key when the two files were last in agreement. That one extra fact makes the
   three cases distinguishable, where a plain diff cannot tell them apart:

     doc moved, html did not  -> the edit is in the doc. Safe; this is the point.
     html moved, doc did not  -> the doc is STALE, and writing REVERTS the page.
     both moved               -> a genuine conflict; nobody can pick for you. */
const lock = readLock();
const verdict = new Map();
for (const c of changes) {
  const base = lock && lock[c.key];
  if (!base) { verdict.set(c, 'unverified'); continue; }
  const docMoved = hash(c.now) !== base;
  const htmlMoved = hash(c.was) !== base;
  if (docMoved && !htmlMoved) verdict.set(c, 'safe');
  else if (!docMoved && htmlMoved) verdict.set(c, 'stale');
  else verdict.set(c, 'conflict');
}

const LABEL = {
  stale: '  [STALE DOC -- writing this REVERTS index.html]',
  conflict: '  [CONFLICT -- both sides changed since the baseline]',
  unverified: '  [unverified -- no baseline for this key]',
  safe: '',
};
for (const c of changes) {
  console.log(`  ${c.key}${LABEL[verdict.get(c)]}`);
  console.log(`      was: ${c.was.slice(0, 120)}`);
  console.log(`      now: ${c.now.slice(0, 120)}`);
}

const stale = changes.filter((c) => verdict.get(c) === 'stale');
const conflict = changes.filter((c) => verdict.get(c) === 'conflict');
const unverified = changes.filter((c) => verdict.get(c) === 'unverified');

if (stale.length || conflict.length) {
  console.error(`${NL}REFUSING TO WRITE.`);
  if (stale.length) {
    console.error(`${NL}${stale.length} key(s) changed in ${HTML} while ${DOC} kept the old text:`);
    stale.forEach((c) => console.error('  ' + c.key));
    console.error(`Applying would throw those edits away. If ${HTML} is right,`);
    console.error(`run --export to refresh ${DOC} from the page.`);
  }
  if (conflict.length) {
    console.error(`${NL}${conflict.length} key(s) changed on BOTH sides since the baseline:`);
    conflict.forEach((c) => console.error('  ' + c.key));
    console.error('Reconcile them by hand, then --export to re-baseline.');
  }
  console.error(`${NL}--force overrides this and writes ${DOC} over ${HTML} regardless.`);
  process.exit(1);
}

if (unverified.length && WRITE && !FORCE) {
  console.error(`${NL}REFUSING TO WRITE: no baseline for ${unverified.length} key(s).`);
  console.error(`${LOCK} is missing or does not cover them, so there is no way to`);
  console.error(`tell whether ${DOC} is newer than ${HTML} or staler.`);
  console.error(`${NL}If ${HTML} is currently correct:  node tools/sync-site-copy.mjs --export`);
  console.error(`If ${DOC} is currently correct:   add --force`);
  console.error('Either way the baseline is written afterwards, so this is a one-time step.');
  process.exit(1);
}

if (!WRITE) {
  console.log(`${NL}${changes.length} change(s). Add --write to apply.`);
  process.exit(0);
}

// Back to front so every offset stays valid as the string length changes.
let out = html;
for (const c of [...changes].sort((a, b) => b.from - a.from)) {
  out = out.slice(0, c.from) + c.now + out.slice(c.to);
}
writeFileSync(HTML, out);
/* The two files agree again, so re-baseline. This is what makes the guard
   self-healing: the lock never has to be maintained by hand. */
writeLock(collect(out));
console.log(`${NL}${changes.length} change(s) written to ${HTML}.`);
console.log(`baseline refreshed -> ${LOCK}`);
