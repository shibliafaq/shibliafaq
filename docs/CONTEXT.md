# The whole story

Written 2026-08-15 so a fresh session can pick this up without re-deriving it.
`valley.md` is the technical record; this is the narrative — what was tried, what
was thrown away, and why. Read this first, then `valley.md`.

---

## 1. What the section is

The **Experience & Education** section of Shibli Afaq's portfolio is a top-down
pixel-art RPG overworld. A character walks a road through a valley; as the reader
scrolls, he arrives at seven buildings, one per milestone in the CV, and each
arrival raises a card and a speech bubble.

The seven are fixed and in chronological order — they are the CV:

| id | what it is |
|---|---|
| `barch` | B.Arch, BIT Mesra, 2016–2021 |
| `chadda` | Chadda and Associates, intern, summer 2018 |
| `metarch1` | Metarch Studios, intern, summer 2019 |
| `jaiswal` | Jaiswal & Associates, New Delhi, intern, 2021 |
| `medicfibers` | Medicfibers, New Delhi, graphic designer, 2021–22 |
| `metarch2` | Metarch Studios, project architect, 2022–25 |
| `kfupm` | KFUPM, Dhahran, MSc, 2025–26 |

**The timeline list is the content, not a fallback.** `<ol class="timeline">` in
`index.html` ships in the HTML, is what a crawler reads, and is what shows with
JS off, under `prefers-reduced-motion`, or below 900px. The map replaces it only
after every sheet has loaded. If anything fails, the list stays.

---

## 2. What was tried and thrown away

This matters more than what survived. Each of these was built, rejected, and the
reason is now a rule.

### AI-generated pixel art — rejected
The original base map was made with Gemini. It looks like pixel art and is not:
there is no pixel grid, so it cannot be tiled, cut, or scaled with anything else.
**Rule: ask how art was produced before diagnosing it.**

### The building composer — rejected
`drawBuilding()` assembled buildings from Pixel Crawler wall/roof/door parts. Two
rounds of output were rejected: *"does not look like a building"*, then *"the
walls are flat, no door or windows, the roof should slant both sides"*. Replaced
by using complete artist-drawn buildings. `building.js` and `lab/buildings.html`
still exist; nothing uses them.

### The first map (HANDOFF §9) — superseded, not deleted
It grew by accretion over many sessions until it stopped being editable, and it
lacked the grammar the references share. It still drives `lab/walk.html`.

### Deriving the route with Dijkstra — replaced within the hour
`tools/derive-paths.mjs` searched the painted road and produced three plausible
routes. Replaced because **a searched route is only the cheapest way across the
road**, and a journey through someone's career is not a shortest-path problem.
The user draws routes by hand; the machine checks them.

### Re-centring the route on the road — built, measured, removed
The walker looked off-centre, so a pass resampled each route every half tile and
slid it to the middle of the road. Measuring said the hand-drawn route was
already centred (**median 0.03 tiles**), the pass made the mean slightly worse,
and resampling re-parameterised arc length — which is what made the scroll feel
wrong. The real cause was a coordinate convention (§5). A note stands where the
pass was, because the idea will occur again.

### The speech bubble replacing the card — rejected
First version swapped the CV card for a bubble. *"no not like this — revert it."*
The correction: they are **two things in two places**. The card is the record and
sits where a caption sits; the bubble is one line he says, at his shoulder.

---

## 3. The valley, as it stands

Rebuilt from scratch after studying the references, using Cute Fantasy and Pixel
Crawler art. `44 × 164` tiles, `TILE = 16`.

**Five chapters** by row band: Mesra·Ranchi (0–34), Ranchi (34–68), New Delhi
(68–100), Ranchi·Practice (100–122), Dhahran·KSA (122–164).

The generator (`valleybuild.js`) produced the first version; it is now largely
historical. **The document is the truth** — `public/assets/pixel/valley-map.json`
holds the terrain, ~900 objects, decor, the focal-point marks, the hand-drawn
routes and the start/end cells. `valley.js` still carries a `PATH` polyline and a
row/side per stop and **both are stale**.

The user edits it in `lab/editor.html`: terrain brushes, sprite placement, vector
resize, focal-point marking, route drawing, undo, save history.

---

## 4. Art pipeline

Assets came from ~15 itch.io packs. Two problems recur.

**Packs that are not pixel art.** The CraftPix desert tileset ships `.ai`/`.eps`
sources — a 285×297 tree holds 1,147 colours and every sprite has a black drop
shadow baked into its alpha. `tools/desert-pixelate.py` converts rather than
crops: strip the shadow *first*, resize *premultiplied* (or transparent black
bleeds into the edges), then make alpha *binary*, then cut the palette.

**Palette size was the wrong knob.** The first conversion used the same number of
colours as the valley's own art and still looked airbrushed. The measure that
matters is **mean horizontal colour-run length** — Cute Fantasy houses sit at
2.0–2.4, the converted palms came out at 1.28. Foliage now gets a 3×3 median
before quantising. Same pipeline converted the user's own BIT Mesra and KFUPM
buildings (`tools/campus-pack.json`).

Two traps found by measuring: `land_*` are **not** seamless tiles (they carry a
drawn dark border and tiled into a lattice), and `road_*` is a **nine-slice set
with no naming scheme** — which file is the north-west corner was found by
testing each edge for the sand transition band.

---

## 5. The walk, and how it reaches the page

`walk.js` owns the camera, gait, card hysteresis and pinning. It used to read its
geometry straight off `journey.js` imports, which tied it to one map. Geometry is
now a parameter:

```js
initWalk(stage, { world })   // DEFAULT_WORLD is the first map
```

`valleyjourney.js` is the valley's implementation of that contract — `STOPS`,
`PATH_LENGTH`, `pointAt`, `regionAt` — all read from the JSON. Only the CV prose
is not derived: it stays in `valley.js` STOPS and joins on the `stop` id, because
the map changes on every edit and the CV does not.

**The bug that cost the most time:** `journey.js` returns *raw cell indices* and
`walk.js` adds the half tile itself (`feetX = p.x * TILE + TILE/2`). The adapter
returned pre-centred points, so it applied twice and the walker was drawn half a
tile right and half a tile down — the verge of a three-wide road.

Two modes share the character: `route` (scroll drives distance) and `free` (arrow
keys/WASD, confined to road, per-axis so walls are slid along). A deliberate
scroll — thresholded at 60px — leaves free mode, and the walk *reports* which
stop to resume from rather than moving the page itself, because the scroller
belongs to ScrollTrigger and Lenis.

---

## 6. Rules that emerged

1. **The document is the truth.** Whichever of two representations is authored by
   hand wins; the other is derived. This cut both ways — buildings once stood in
   a river because they were hand-placed against a computed sine curve, and later
   the route polyline went stale because the road had been repainted by hand.
2. **Measure the suspected cause before building the fix**, and check the metric
   survives the change. Two fixes this session were built for problems that were
   somewhere else; one was tuned for two rounds against a measurement artefact.
3. **Author by hand, verify by machine.** Routes are drawn, then checked for
   on-road, start-to-end, and all seven focal points in order.
4. **A tool that can destroy work must be able to fail.** `grow-map.mjs` was
   sabotage-tested three ways before it was trusted.
5. **Silence is the worst failure.** `sync-copy.mjs` first reported "nothing to
   do" and exited 0 on every edit because of CRLF line endings — it now refuses
   when it parses headings but no fields.

---

## 7. Map safety — the map has been lost twice

Both times identically: the document in the page was replaced by a fresh
generate, and the next autosave wrote it over hours of hand-editing.

- `/__save-valley` **snapshots the file it is about to replace** into
  `.map-history/` (outside `public/`), names carrying milliseconds
- It **refuses any save dropping object count by more than half** — 409, nothing
  written, repeat within 30s to confirm
- `PROTECTED-*.json` are never pruned
- **localStorage is per-origin.** Port 5199 and 5173 have separate storage. This
  once looked exactly like data loss and was not.

**A live editor tab autosaves every 20s and on `beforeunload`.** It overwrote
tool-written changes three times in one session. Confirm no editor page is open
before writing, or write to a side file.

**Never leave a `fetch` or `localStorage.setItem` patch installed in a page.** A
write-block installed for testing silently swallowed the user's own saves and
produced "DISK SAVE FAILED" against a healthy server.

---

## 8. Where the copy lives

All Background text is in `index.html` — crawlable, translatable, works with JS
off. That is right for the site and poor for writing, so:

```bash
node tools/sync-copy.mjs           # docs/timeline-copy.md -> index.html, dry run
node tools/sync-copy.mjs --write   # apply
node tools/sync-copy.mjs --export  # pull hand edits back into the doc
```

Six fields per entry: `period`, `role`, `org`, `desc`, `note` (the card),
`says` (the bubble). Translations live in `src/i18n/strings.js`; a missing key
falls back to the English in the markup, so they can be filled in later.

---

## 9. Open work

1. **Route 2 fails `check-paths`** — misses `chadda` by 9.2 tiles and
   `medicfibers` by 16.1. Only Route 1 is loaded.
2. **Runtime route switching not wired** — `setRoute()` re-measures but
   `initWalk` reads the stop table once at init.
3. **Free-roam gait unverified visually** — speed 7→11 tiles/sec and the gait
   rebuilt after the user reported sliding. Never seen running.
4. **The bubble has never been watched during a real scroll.**
5. `doc.end` is column 44 on a 44-column map; tools clamp it, the file still has it.
6. 14.6 MB of a 29 MB build is dev leftovers from the first map.
7. CraftPix licence unresolved for a site that serves the sprite files directly.
8. Older, still-open: ground cover on the first map; the composer never wired.

---

## 10. How the user works

Fast, iterative, and blunt when something is wrong — *"no not like this"*,
*"revert it"*, *"the buildings do not look like buildings"*. Take that at face
value and revert rather than defend.

He does the art and layout decisions himself and expects the machinery to serve
that: editors, brushes, validators, sync tools. He edits in his own browser and
his own editor, so **assume files change under you** and re-read before writing.

Show measurements, not claims. Report failures plainly, including your own —
several of the most useful findings this session came from admitting a fix was
built against the wrong cause.

One environment note: **do not use Python heredocs to write JS containing `\n` or
`\r`** — they get interpreted and produce broken strings. This has bitten twice.
