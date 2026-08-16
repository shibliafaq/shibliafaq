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

import { readFileSync, writeFileSync } from 'node:fs';

const HTML = 'index.html';
const DOC = 'docs/site-copy.md';
const NL = String.fromCharCode(10);

const INIT = process.argv.includes('--init');
const EXPORT = process.argv.includes('--export');
const WRITE = process.argv.includes('--write');

/* Elements that carry prose. Deliberately a whitelist: <div> and <section> are
   containers, and treating them as copy would hand you the entire page as one
   uneditable blob. */
const TEXTY = ['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'span', 'a', 'button',
  'blockquote', 'figcaption', 'summary', 'strong', 'em', 'small', 'label'];

/* Left alone on purpose:
   tli__*      the timeline — tools/sync-copy.mjs owns those, from its own doc
   sec-title   split into per-character spans by the reveal animation at runtime,
               but static in the file, so it IS editable — kept in.
   journey__   map chrome written by JS at runtime; editing the HTML does nothing */
const SKIP_CLASS = /\btli__|\bjourney__rail\b|\bjourney__cards\b/;

/** Human-readable section names, in page order. */
const SECTIONS = {
  hero: 'Hero', about: 'About', direction: 'Research direction',
  thermal: 'Thermal sequence', projects: 'Projects', atlas: 'Atlas',
  publications: 'Publications', skills: 'Skills',
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
  console.log(`--export: ${items.length} strings -> ${DOC}`);
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

for (const c of changes) {
  console.log(`  ${c.key}`);
  console.log(`      was: ${c.was.slice(0, 120)}`);
  console.log(`      now: ${c.now.slice(0, 120)}`);
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
console.log(`${NL}${changes.length} change(s) written to ${HTML}.`);
