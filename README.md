# Shibli Afaq — portfolio

Smart cities researcher, urban data scientist, architect. A single-page site
built with Vite, GSAP and three.js, with two hand-built set pieces: a physics
field of skills inside a traced outline of a brain, and a walkable pixel-art
overworld that carries the CV.

---

## Deploy to Vercel

Vercel reads `vercel.json` and needs no configuration in its dashboard.

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import that
   repository.
3. Accept the detected settings and **Deploy**. Framework Vite, build
   `npm run build`, output `dist/`.

Every push to the default branch redeploys. Pull requests get their own preview
URL.

### Running it locally

```bash
npm install
npm run dev
```

Then open the printed address. `npm run build` produces `dist/`, and
`npm run preview` serves that build.

---

## Editing the words

**All the text lives in `index.html`** — that is what ships in the HTML, what a
crawler reads, what shows with JavaScript off, and what the translation engine
rewrites. All of that is correct, and none of it makes a 1,200-line file a good
place to write. So there are two documents you edit instead, and a tool that
puts the words back.

### The front page — `docs/site-copy.md`

236 strings, in reading order, grouped by section.

```bash
node tools/sync-site-copy.mjs           # show what would change
node tools/sync-site-copy.mjs --write   # apply it to index.html
node tools/sync-site-copy.mjs --export  # pull hand edits back into the doc
```

### The Background timeline — `docs/timeline-copy.md`

The seven CV entries, six fields each: `period`, `role`, `org`, `desc`, `note`
(the card on the map), `says` (the speech bubble).

```bash
node tools/sync-copy.mjs           # show what would change
node tools/sync-copy.mjs --write   # apply it
node tools/sync-copy.mjs --export  # pull hand edits back
```

### Rules for both documents

- **One line per string.** A wrapped line breaks the parser — let it run long.
- **Never rename a `### key` heading.** That is what ties the text to its place
  in the page. Both tools stop rather than guess.
- **HTML is allowed and entities are literal.** `&amp;` stays `&amp;`.
  `<em class="serif">…</em>` works and is used for thesis titles.
- **To delete a string, empty it** — keep the heading and the `- `.

Both tools refuse to write rather than write partially: an unknown key, or a
document that parses headings but no fields, stops the whole run. That second
check exists because a CRLF line-ending bug once made the timeline tool report
"nothing to do" on every edit for a session.

### The normal editing loop

```bash
node tools/sync-site-copy.mjs           # read the diff
node tools/sync-site-copy.mjs --write   # apply
npm run build                           # confirm it still builds
git add -A && git commit -m "Copy edits"
git push
```

---

## Translations

Six languages in `src/i18n/strings.js`, keyed by the same `data-i18n` attributes
the copy tool uses. **A missing key falls back to the English in the markup**, so
translations can lag behind an edit without breaking anything — the page just
shows English for that string.

---

## Layout

```
index.html              the page. All copy lives here; edit it through the docs.
src/
  main.js               boots each module, most on idle
  modules/              one file per section
    pixel/              the overworld: walk, valley data, editor, tools
  styles/               tokens, base, layout, sections
  i18n/                 six dictionaries + the swap engine
public/assets/          everything the page serves — sprites, sheets, the map
docs/
  CONTEXT.md            READ FIRST. What was built, what was thrown away, why.
  valley.md             technical record of the map
  HANDOFF.md            the long-form running log
  site-copy.md          front page text
  timeline-copy.md      the seven CV entries
tools/                  copy sync, map growth, path checks, art conversion
lab/                    dev-only pages: the map editor, the route tracer
```

`assets/` — the raw itch.io packs, the CraftPix tileset, the PSDs, about 412 MB
— is **not** in this repository. Nothing in it is needed to build or run the
site; everything the page serves has already been converted into
`public/assets/pixel/`. The originals stay in the working copy.

---

## The map

The Experience section is a 44 × 164 tile overworld, hand-built in
`lab/editor.html`, stored as one document at
`public/assets/pixel/valley-map.json`. **That file is hours of hand work and has
been lost twice.** Before any tool writes it, `/__save-valley` snapshots it into
`.map-history/`, and a save that drops the object count by more than half is
refused with a 409.

**Never write it while `lab/editor.html` is open in a tab** — the editor
autosaves every 20 seconds and on unload, and will put its stale copy over
whatever you just wrote. `docs/CONTEXT.md` §7 has the full list.

---

## Credits

Pixel art assets from itch.io — Cute Fantasy, Pixel Crawler, Kibyra,
TopDownFantasy Forest, Pixel 16 — and the CraftPix 2D RPG Desert Tileset. The
BIT Mesra and KFUPM buildings are the author's own artwork.

CraftPix and several itch.io packs allow use in games including commercial ones
but **do not permit redistributing the assets themselves**, and a website serves
the sprite files directly. That question is open and worth settling before this
is treated as published — see `docs/valley.md`.
