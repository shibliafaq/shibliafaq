/**
 * Edit every word of the project cards from one markdown file.
 *
 * WHY
 * ---
 * `src/data/projects.js` is 28 KB of nested object literal. It is the right
 * place for the copy to LIVE — it is what the cards and the modals render from
 * — and a poor place to WRITE: seven projects, a dozen prose fields each, all
 * of it wrapped in quotes and commas where a stray apostrophe is a syntax error
 * rather than a typo.
 *
 * So `docs/project-copy.md` is where you write and `src/data/projects.js` is
 * what ships. Same arrangement as docs/site-copy.md and docs/timeline-copy.md.
 *
 *     node tools/sync-project-copy.mjs --export   # data -> doc  (rebuild it)
 *     node tools/sync-project-copy.mjs            # doc -> data, dry run
 *     node tools/sync-project-copy.mjs --write    # doc -> data, apply
 *
 * HOW IT WRITES, AND WHY NOT BY REGENERATING THE FILE
 * The obvious implementation — import the module, edit the object, print it
 * back — would silently delete every comment in projects.js, and the comments
 * there carry the reasoning for what the numbers mean. So this edits IN PLACE:
 * it scans for the exact source span of each string literal and replaces only
 * that span. Everything it does not understand, it does not touch.
 *
 * The scan is quote-aware rather than line-based, because 284 of the strings in
 * that file contain an escaped quote and a line regex gets those wrong in a way
 * that is not obvious until something downstream renders a backslash.
 *
 * WHAT IT REFUSES TO DO
 * Only fields that already exist can be written. A key in the doc that has no
 * span in the source stops the whole run rather than writing nine of ten and
 * leaving one card saying something nobody chose. Structure — which projects
 * exist, how many metrics each has, image paths, links, embeds — is not
 * editable here at all: this file is for words.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const DOC = 'docs/project-copy.md';
const SRC = 'src/data/projects.js';

const EXPORT = process.argv.includes('--export');
const WRITE = process.argv.includes('--write');

/* The prose worth editing. Anything not named here is structure — ids, file
   paths, embed keys, tag lists that double as filter values — and is left to
   the source file where its shape is visible. */
const FIELDS = new Set([
  'cat', 'title', 'desc', 'method', 'abstract',
  'claim', 'note', 'sec', 'lead', 'foot', 'hint',
  'authors', 'venue', 'status', 'v', 'l', 't',
]);

/* ------------------------------------------------------------------ scan */

/* A quote-aware walk that records, for every string literal, the key path it
   sits under and its exact span in the source. Arrays contribute a numeric
   step to the path, so the second metric's label is `thesis.metrics.1.l` and
   stays stable however the words change. */
function scan(src) {
  const out = [];
  const path = [];
  let i = src.indexOf('export const projects');
  if (i < 0) throw new Error('projects object not found');
  /* Past the opening brace, not on it: the root is already represented by the
     seed entry on the stack, and letting the loop open it too pushed an empty
     segment so every path came out as `.thesis.cat`. */
  i = src.indexOf('{', i) + 1;

  /* The ROOT container contributes no path segment — it is `projects` itself,
     and every key already carries the project id. An earlier version pushed one
     and every path came out as `0.thesis.cat`. */
  const stack = [{ type: 'object', index: 0, root: true }];
  let pendingKey = null;

  while (i < src.length && stack.length) {
    const ch = src[i];

    // comments
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }

    if (ch === '{' || ch === '[') {
      const parent = stack[stack.length - 1];
      /* A container's own name comes from its PARENT: the index if the parent
         is an array, the pending key if it is an object. */
      path.push(parent.type === 'array' ? String(parent.index) : pendingKey);
      stack.push({ type: ch === '{' ? 'object' : 'array', index: 0 });
      pendingKey = null;
      i++;
      continue;
    }

    if (ch === '}' || ch === ']') {
      stack.pop();
      path.pop();
      /* Closing a child ADVANCES the parent array, which is what makes four
         metric objects come out as .0 .1 .2 .3 rather than four times .0.
         Without this every row in every array shared one key, and two doc
         entries with the same key silently collapse into one on the way back. */
      const parent = stack[stack.length - 1];
      if (parent && parent.type === 'array') parent.index++;
      pendingKey = null;
      i++;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      const from = i;
      i++;
      let raw = '';
      while (i < src.length) {
        if (src[i] === '\\') { raw += src[i] + src[i + 1]; i += 2; continue; }
        if (src[i] === quote) break;
        raw += src[i];
        i++;
      }
      i++; // closing quote
      const top = stack[stack.length - 1];
      const key = top.type === 'array' ? String(top.index) : pendingKey;
      if (key !== null && FIELDS.has(top.type === 'array' ? '' : key)) {
        out.push({ path: [...path, key].join('.'), from, to: i, quote, raw });
      } else if (top.type === 'array') {
        // a bare string in an array (tags, and nothing else prose-worthy)
        out.push({ path: [...path, key].join('.'), from, to: i, quote, raw, bare: true });
      }
      if (top.type === 'array') top.index++;
      pendingKey = null;
      continue;
    }

    if (ch === ',') { pendingKey = null; i++; continue; }

    // an identifier followed by a colon is a key
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < src.length && /[\w$]/.test(src[j])) j++;
      let k = j;
      while (k < src.length && /\s/.test(src[k])) k++;
      if (src[k] === ':') { pendingKey = src.slice(i, j); i = k + 1; continue; }
      i = j;
      continue;
    }

    i++;
  }
  return out;
}

/* JS source text -> the actual characters, and back again. Only the escapes
   this file uses; anything else would mean the source grew a construct this
   tool does not understand, which is a reason to stop rather than guess. */
const unescape = (raw) => raw.replace(/\\(['"`\\nt])/g, (m, c) =>
  c === 'n' ? '\n' : c === 't' ? '\t' : c);
const escapeFor = (text, quote) =>
  text.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote)
      .replace(/\n/g, '\\n');

/* ------------------------------------------------------------------ doc */

const HEAD = [
  '# Project copy',
  '',
  'Every word on the project cards and inside their modals. Edit the lines that',
  'begin with `- ` and nothing else: the `###` keys are how each line finds its',
  'way back into `src/data/projects.js`.',
  '',
  '    node tools/sync-project-copy.mjs           # what would change',
  '    node tools/sync-project-copy.mjs --write   # apply it',
  '',
  'HTML is allowed and is kept as written — several fields already carry `<em>`',
  'and `<strong>`. What is NOT here is structure: which projects exist, how many',
  'metrics each has, image paths, links and tags all live in the source file,',
  'because their shape matters as much as their text.',
  '',
];

const TITLES = {
  thesis: 'M.Sc. Thesis — Smart Digital Twin',
  gis: 'GIS & Remote Sensing UHI Assessment',
  iot: 'Real-Time Smart City IoT Pipeline',
  temp: 'Multi-City Surface Temperature',
  its: 'ITS-Based Congestion Management',
  sound: 'Soundscape & Thermal Comfort Review',
  arch: 'Twin Tower Complex',
};

function buildDoc(items) {
  const lines = [...HEAD];
  let project = null;
  for (const it of items) {
    const top = it.path.split('.')[0];
    if (top !== project) {
      project = top;
      lines.push('', `## ${TITLES[top] || top}  \`${top}\``, '');
    }
    lines.push(`### ${it.path}`, `- ${unescape(it.raw)}`, '');
  }
  return lines.join('\n');
}

function parseDoc(text) {
  const map = new Map();
  const re = /^### (.+)$\n^- ([\s\S]*?)(?=\n^### |\n^## |\n*$)/gm;
  let m;
  while ((m = re.exec(text))) map.set(m[1].trim(), m[2].replace(/\s+$/, ''));
  return map;
}

/* ------------------------------------------------------------------ run */

const src = readFileSync(SRC, 'utf8');
const items = scan(src).filter((it) => !it.bare);

if (EXPORT) {
  writeFileSync(DOC, buildDoc(items), 'utf8');
  console.log(`--export: ${items.length} strings -> ${DOC}`);
  process.exit(0);
}

let doc;
try {
  doc = readFileSync(DOC, 'utf8');
} catch {
  console.error(`${DOC} does not exist yet. Run --export first.`);
  process.exit(1);
}

const wanted = parseDoc(doc);
const byPath = new Map(items.map((it) => [it.path, it]));

const missing = [...wanted.keys()].filter((k) => !byPath.has(k));
if (missing.length) {
  console.error('These keys are in the doc but not in the source:');
  missing.forEach((k) => console.error('  ' + k));
  console.error('\nNothing written. Re-run --export to rebuild the doc from the source.');
  process.exit(1);
}

const changes = [];
for (const [path, next] of wanted) {
  const it = byPath.get(path);
  const now = unescape(it.raw);
  if (now !== next) changes.push({ it, now, next });
}

if (!changes.length) {
  console.log(`nothing to do — ${SRC} already matches ${DOC}.`);
  process.exit(0);
}

for (const c of changes) {
  console.log(`  ${c.it.path}`);
  console.log(`      was: ${c.now.slice(0, 100)}`);
  console.log(`      now: ${c.next.slice(0, 100)}`);
}

if (!WRITE) {
  console.log(`\n${changes.length} change(s). Add --write to apply.`);
  process.exit(0);
}

/* Back to front, so every span offset stays valid as the text grows or shrinks. */
let out = src;
for (const c of [...changes].sort((a, b) => b.it.from - a.it.from)) {
  const lit = c.it.quote + escapeFor(c.next, c.it.quote) + c.it.quote;
  out = out.slice(0, c.it.from) + lit + out.slice(c.it.to);
}
writeFileSync(SRC, out, 'utf8');
console.log(`\n${changes.length} change(s) written to ${SRC}.`);
