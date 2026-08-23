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

---

## 11. Session of 2026-08-16 — mobile, and the two bugs under it

### The map and the brain now run at every width

Both sections used to hide below a width gate and show their HTML fallback.
`MIN_W` was 900 for the map, justified in a comment by "the world is 34 tiles
wide" — that described the FIRST map; the valley is 44 x 164. The premise was
wrong anyway: the camera follows the character and has always cropped, so
seeing the whole width was never the requirement. Both floors are now 320, the
width below which there is no layout at all.

**The brain drops its labels instead of hiding.** At 375px the brain draws about
367x320 and 40 labelled balls need roughly four times that area. `fitDensity`
now shrinks type toward `MIN_FS` PER BALL and re-measures each radius, rather
than scaling finished radii by one factor — which cut ball area from 133,740 to
37,468 and let the labels survive on a phone at 63% fill. Only if that still
does not fit do the names come off and move to the tooltip.

Two coincidences in the numbers cost real time here, both worth knowing:

- The smallest label, "Claude Code" at group scale 0.75, is `BASE_FS * 0.75`
  = exactly `MIN_FS`. So a `kFloor = MIN_FS / smallest` test evaluated to
  exactly 1.0 and collapsed to "labels only if nothing needs shrinking at all",
  stripping every name on DESKTOP too.
- `forEach(measure)` passes the array INDEX as the second argument. Adding a
  `shrink` parameter to `measure` silently made every ball shrink by its own
  index until the call site became `forEach((b) => measure(b))`.

### The blackout: Lenis was not syncing touch

Reported as "the scroll just makes everything black when the character is about
to move". Measured on an emulated phone:

    lenis.scroll = 0        while  window.scrollY = 13814
    st.progress  = 0        while  scrollY was between start 11778 and end 20951
    stage top    = -2036    pin-spacer height 9985

Lenis emits its `scroll` event from its own animation loop, and that loop only
runs for input it OWNS. With `syncTouch` off, touch was left to the browser, so
`lenis.on('scroll', ScrollTrigger.update)` never fired — every ScrollTrigger's
progress stayed frozen at 0, the Experience pin never engaged, and because the
spacer was still 9,985px tall the stage simply scrolled away and left ten
thousand pixels of black section. The same frozen progress meant distance 0,
which is why the character never took a step while the joystick still worked.

Proved before changing anything: one hand-fired `lenis.emit('scroll')` snapped
the stage from top -2036 to 0 and progress from 0 to its correct 0.222.
`syncTouch: true` in `initScroll`. It can feel heavier than native momentum on
iOS; `syncTouchLerp` tunes it, but the pin cannot work on touch without it.

### 24x overdraw in the walk

`walk.js` passed the WHOLE map as the source rect every frame and let the
browser clip — 704x2624 scaled to 1408x5248. Against a 375x812 phone stage that
is 24x more source pixels than are on screen, about 0.44 Gpx/s of
nearest-neighbour blit at 60fps. `blitWorld()` now culls to the visible window,
verified pixel-identical to the old draw at seven camera positions including
both clamped edges and the negative-camX letterbox. Source pixels per frame:
1,847,296 -> ~76,400.

It is also called from `buildRamps` after a resize, because assigning
`canvas.width` wipes the backing store and `ScrollTrigger.refresh()` is
synchronous — the blank canvas was on screen for several frames every time the
pin engaged or released, which read as the map reloading.

### Mobile chrome

- **Zoom**: a third constraint, `MIN_COLS = 20`. The two existing rules are both
  about FILLING the stage, and on a 375px phone ZOOM 2 filled it while showing
  twelve of forty-four columns. Phones now land on ZOOM 1; every other size is
  unchanged. Pacing is untouched — `pxPerTile` still derives from `fitH`.
- **Chapter rail** lies down along the top under 700px. Vertical on the left it
  took 35% of the width, and at `z-index: 2` it drew OVER the arrival card and
  clipped the first characters of every line. Ticks are `flex: 1 1 0` so five
  always fit whatever the translation.
- **Joystick**, touch only, gated on `(pointer: coarse)` rather than width —
  a narrow desktop window has a keyboard, a large tablet does not. Positioned
  with physical `right`, not `inset-inline-end`: handedness does not mirror in
  Arabic.
- **Camera lead** tightens to 0.32/0.42 on a narrow stage. The desktop values
  parked him under the card — measured 79px of overlap walking up.

### A loading animation was built and reverted

Rejected on sight. Worth recording because it exposed something real: to give
the loader something to cover, the mount was deferred until the section came
near, and THAT is what made the timeline fallback linger visibly. The eager
idle mount is the reason the swap is never witnessed. Do not defer it.

Also learned: an `IntersectionObserver` on `#background` with
`rootMargin: '100% 0px'` never fired a single callback on this page, with the
section filling the viewport. Cause unproven — Lenis owns the scroll and GSAP
transforms the pinned wrapper. **The `IntersectionObserver` in `mount()` that
drives `setActive` may be equally dead**, which would mean the walk never pauses
off-screen. Unverified, worth checking.

### Method note

Most of this session was spent on a belief that was never tested: that the
agent's browser could not run `requestAnimationFrame`, so nothing could be
verified visually. It was wrong. The pane throttles BACKGROUND tabs; the first
probe happened to land on one, and the conclusion was carried for a dozen turns
without re-checking. Measured properly: 61 rAF callbacks in 1016ms,
`document.hidden` false. Front the tab, then screenshot.

---

## 12. Packaging (2026-08-16)

This folder IS the deployable repository. `E:\Website\v2` remains the working
copy with the 412 MB of source art beside it.

| | |
|---|---|
| checked in | 411 files, 16 MB |
| built (`dist/`) | 15 MB |
| deploy | Vercel, `vercel.json` pins framework/build/output |

**Left out on purpose:** `assets/` (412 MB of itch.io packs, the CraftPix
tileset, PSDs and raw scans — none of it needed to build); `node_modules`;
`dist`; `.map-history`; and `final/_road_debug.png` + `final/base_map.png`
(14.6 MB, referenced only by `walkmap.js`, which only `lab/walkmap.html` imports
and which belongs to the superseded first map).

**One `.gitignore` trap, caught by counting.** Written as `assets/`, the pattern
matches a directory of that name at ANY depth — so it silently excluded
`public/assets/` as well: every sprite, every sheet, and `valley-map.json`. The
staged file count was 101 instead of 411. It has to be `/assets/`, anchored to
the root. **Check `git ls-files | grep -c public/assets` after touching that
file** — 310 is the expected number.

### `tools/sync-site-copy.mjs` — the front page in one document

`docs/site-copy.md` holds 236 strings in reading order. `sync-copy.mjs` keeps
the seven timeline entries; the two do not overlap, because anything carrying
`class="tli__*"` is skipped by the new tool.

Anchoring is by attribute, never by position: `data-i18n` where it already
exists (98 elements, shared with the translation engine), and `data-copy`
added by `--init` to the other 180. "The third paragraph in About" stops meaning
anything the moment a paragraph is added.

**Outermost anchors only, and this is the important rule.**
`<p data-i18n="about.p1">… <em data-copy="about.7">word</em> …</p>` is two
anchors over overlapping text: rewriting the paragraph replaces the span the
`<em>` pointed at. The first `--init` produced 352 anchors of which **61 were
nested**. `collect()` now keeps a high-water mark and drops anything starting
inside the previous anchor, and `--init` will not add one inside an existing
one. It is also the right editorial unit — a paragraph and its inline emphasis
are one sentence to edit, not two fragments.

Closing tags are found by counting opens and closes, not by a non-greedy regex,
which finds the wrong `</p>` the moment an element contains another of its kind.

Verified by round trip: edit a string in the doc, `--write`, confirm it lands in
the markup, restore the doc, `--write` again — `index.html` came back
byte-identical.

---

## 13. Where the work happens (from 2026-08-16)

**`E:\Website\shibli-portfolio` is the working copy.** It is the git repository
that deploys to Vercel, and every change goes here.

**`E:\Website\v2` is an archive. Do not edit it.** Editing both is how the two
diverge and the wrong one gets pushed.

```bash
npm --prefix E:\Website\shibli-portfolio run dev -- --port 5199 --strictPort
```

### The one thing this folder does not have

The 412 MB `assets/` tree of raw source art — the itch.io packs, the CraftPix
desert tileset, the PSDs and scans — is deliberately not here. Nothing in it is
needed to build: everything the page serves was already converted into
`public/assets/pixel/` and is committed.

The consequence is worth knowing before a tool fails in a confusing way. These
still reference the source tree and **will not run from this folder**:

| tool | needs |
|---|---|
| `build-map-kit.mjs`, `render-map.mjs` | `assets/tilesets`, `../map-kit` |
| `compose_map.py`, `prep_final_assets.py` | `../map-kit`, `assets/` |
| `desert-pack.json`, `campus-pack.json`, `new-packs.json` | source art paths |

All of them are one-off conversion scripts that have already been run, and their
output is committed. If new art ever needs converting: run them from
`E:\Website\v2`, where the sources still are, then copy the resulting `.webp`
into this repo's `public/assets/pixel/` and commit that.

Everything used routinely works here — `sync-site-copy.mjs`, `sync-copy.mjs`,
`check-paths.mjs`, `grow-map.mjs`, and `lab/editor.html`.

---

## 14. GitHub and Vercel (2026-08-16)

**Repo:** `https://github.com/shibliafaq/shibliafaq` — remote `origin`, branch `main`.
**Live:** `https://shibliafaq.vercel.app`

### README.md is the GitHub profile page. Do not replace it.

`shibliafaq/shibliafaq` is the special *username/username* repository, so its
`README.md` renders on the public profile at github.com/shibliafaq — thesis
summary, the Dammam UHI figures, publications, PhD availability.

The first push was rejected (`fetch first`), and that rejection was lucky: the
remote already held seven commits, and a plain force would have rewritten a
public bio into a build guide. **The project's own README lives at
`docs/DEVELOPMENT.md`.** Anything that would normally go in a project README
goes there.

### What the merge did

The repo was already serving the site as an 11 MB single-file `index.html` with
51 base64-inlined assets and no build step.

| | |
|---|---|
| `README.md` | the profile text, byte-for-byte unchanged |
| `index.html` | now the 53 KB Vite entry point |
| `docs/DEVELOPMENT.md` | build, deploy and copy-editing guide |
| old single-file site | still in history at `adfafc4` |

Merged with `--allow-unrelated-histories`; only `index.html` conflicted and was
resolved to ours. SEO is unchanged — same `<title>`, same `og:url`, five
meta/OG/Twitter tags.

### Vercel

`vercel.json` pins framework `vite`, build `npm run build`, output `dist`. The
project used to serve this repo as **static files**, so after the switch confirm
the deployment log says *Framework: Vite* and actually runs a build. If it
deploys instantly without building, set Project → Settings → General → Framework
Preset to **Vite** and redeploy.

**There is no staging step.** A push to `main` replaces the live site as soon as
the build succeeds. To look first:

```bash
git push origin main:preview     # own preview URL, live untouched
```

### Still open

- **Asset licensing.** CraftPix and several itch.io packs permit use in games
  including commercial ones but **forbid redistributing the assets themselves**,
  and both a public repo and a website redistribute the sprite files directly.
  Making the repo private while keeping the deployment public would narrow it.
- **`E:\Website\v2` holds the only copy of the 412 MB source art.** It is not in
  the repo and is not backed up anywhere else. Do not delete that folder.
- The `IntersectionObserver` driving `setActive` in `experience.js` may be as
  dead as the one that had to be replaced in §11 — which would mean the walk
  never pauses off-screen. Costs battery, breaks nothing. Unverified.

---

## 15. Two sections moved inside project cards (2026-08-16)

`#atlas` (Thesis Coverage — the three.js globe) now opens inside the **Smart
Digital Twin** card, and `#thermal` (Multi-City Surface Temperature — the three
Kepler recordings) inside the **Multi-City Surface Temperature Analysis** card.
Neither is a page section any more.

A modal system already existed (`modal.js` + `data/projects.js`, keyed by
`data-modal`), so the work was relocation and lifecycle, not new UI.

### The node is MOVED, not cloned

Cloning would duplicate ~100 lines of markup and, worse, every `id` and
`data-i18n` inside it — after which `getElementById` and the translation engine
both silently pick whichever copy comes first. So the live node is appended into
the dialog on open and put back on close, which also means it stays translated
and stays in the document for a crawler. `modal.js` records `{parent, next}`
before moving so it returns to the same place, not the end of `<body>`.

`unmountEmbed()` runs **before** `inner.innerHTML = ''`. Clearing the dialog
while a borrowed node is still parented inside it destroys the only copy of a
whole section, and the card opens empty from then on.

### Scroll-driven had to become click-driven

`thermal.js` was a 320vh pin that scrubbed each clip frame by frame from scroll
progress. A dialog has no scroll runway, so the legend became the control:
three buttons, one clip playing and looping at a time. The comparison survives
because it was never in the scrubbing — it is in the three numbers, 31.5, 9.6
and −3.7, and a tab strip puts those side by side more directly than a scroll
position did. The legend entries are real buttons with `aria-pressed`, since the
amber dot only says which is active to people who can see it.

### The WebGL fix, which was wrong first

`atlas.js` had no teardown, so the first version disposed the renderer and
called `forceContextLoss()` on close — textbook correct, and wrong here. The
canvas is a fixed element in the markup, so the next open built a new renderer
on the SAME canvas, and **a canvas whose context has been force-lost can never
get another**. Measured: `gl.isContextLost()` returned true on the sixth
open/close cycle and the globe went black with no console error.

The scene is now built once and merely paused and resumed. Browsers limit
*simultaneous* contexts and there is only ever one here. Verified over eight
cycles plus alternating between the two embeds: context never lost, both
sections returned home and hidden every time.

### Smaller things found on the way

- The thermal section carried a "Full study" button with `data-modal="temp"` —
  which would now reopen the dialog it sits inside. Removed.
- `preload="none"` plus an immediate `play()` rejects silently: the clip
  switched and the title updated while the frame stayed on the poster. It now
  waits for `canplay` when there is no data yet, and sets `loop`.
- `.modal .atlas` was first given a fixed `height` clamp. Measured, the copy and
  the five-city list come to 529px against a 468px box and `overflow: hidden`
  ate NEOM off the list. Height follows content with a floor instead.
- The Projects heading said "Six projects" against seven cards. Corrected.
- `main.js` no longer imports either module, and the three.js chunk is no longer
  fetched until someone opens the globe.

---

## 16. Reduced motion, and a joystick regression I caused (2026-08-16)

### The "old design on mobile" was not a deploy problem

Reported as the live site still showing the old Tools and Experience sections on
a phone. It was not. Verified against `shibliafaq.vercel.app` directly: the
deployed JS carries `syncTouch` and `pointer: coarse`, the deployed CSS carries
`journeystick` and `tli__stat`, HTML is served `max-age=0, must-revalidate` so
no stale copy is possible, and at 375x812 the live site mounts the brain and the
map correctly.

The cause was **`prefers-reduced-motion` on the device**. Both modules returned
before building anything:

    experience.js  if (reducedMotion) return;
    skills.js      if (reducedMotion) return;

which leaves the tag list and the timeline — precisely "the old design".

### What changed, and why it is not a bypass

The setting is honoured, not ignored. It asks for less MOTION, not less
content, and the previous behaviour removed the content.

| | before | now |
|---|---|---|
| skills brain | not built | built, settled with ~90 solver steps in one frame, then still |
| dragging a ball | n/a | still works — a gesture the reader chose is not ambient motion |
| the map | not built | built; rail, cards and the stick all work |
| idle gait | n/a | frozen on frame 0 rather than cycling on a timer |
| camera lead / camX | n/a | snaps to target instead of easing |

The timeline and tag list remain the fallback for JS off, a failed sheet, and
widths under 320.

`step()` takes the frame's **scroll delta**, not a timestep. The settle loop
calls `step(0)`; passing `STEP` would have nudged every ball downward ninety
times and piled them in the base of the skull.

### The joystick regression, which was mine

`syncTouch: true` — added in §11 to make the pin work on touch — makes Lenis
intercept `touchmove` document-wide. A drag starting on the stick was being
swallowed as scroll input before the stick's own `pointermove` ever saw it. The
joystick worked before that change and stopped after it.

`touch-action: none` does not help: it stops the BROWSER scrolling and says
nothing to a library listening on document. The fix is Lenis's own opt-out,
`data-lenis-prevent`, which `#modalInner` already relied on for the same reason.

Two measurement traps on the way to that, both mine:
- `--hero-x/--hero-y` cannot detect free-roam movement. The camera follows him,
  so his SCREEN position is pinned at the lead by design. Canvas frame
  signatures showed 11 distinct frames during a push — the stick was working all
  along in emulation.
- The first run started from a polluted session already in free mode at tile
  (0,0), which is off-road, so nothing could move in any direction.

### Still to verify on a real device

The stillness of the reduced-motion brain was checked by reading the code path,
not observed: emulating the media query mid-session leaves the page's original
animated instance drawing to the same canvas, so a second instance cannot be
measured. Worth one look on a phone with Reduce Motion on.

---

## 17. Speech bubble placement (2026-08-16)

Reported as bubbles sometimes cut off and sometimes covering something
important. Three separate causes, all found by walking every stop at both
widths and comparing rectangles.

### 1. The head clearance was hard-coded for one zoom

`top: calc(var(--hero-y) - 5.75rem)`, with a comment deriving 5.75rem from "at
ZOOM 2 he occupies roughly 68px". Phones run at ZOOM 1 since §11, where he is
half that, so the bubble floated a visible gap above him. `walk.js` now
publishes `--hero-h` (`34 * Z`, the drawn figure at the current zoom) and the
CSS clears his actual head.

### 2. Nothing kept it inside the stage

At the first stop the camera clamps at the top of the map and he stands high;
the bubble opened upward through the fixed nav and the chapter rail with its top
cut off. There is now an `is-below` flip — tail inverted, hanging under his feet
— chosen in `walk.js`, because deciding needs his position, the bubble's
rendered height and the stage box, and CSS cannot compare those. `SAFE_TOP` is
132: the nav takes 74, and under 700px the rail sits at 78 and is 46 tall.

### 3. It collided with the card, and on a phone with the joystick

At the last stop the camera clamps at the BOTTOM, so he stands low — where the
card is.

The first fix slid the bubble up until it cleared the card, and the measurement
condemned it: at `kfupm` on 1280x900 his head is at y=800 and the bubble landed
at 473-533, **a 267px gap**. A bubble that far from the speaker is a caption.
So the bubble stays on his head and **the card moves** — `--card-lift`, applied
to its `bottom` and transitioned. The card is a floating sheet with nothing
anchoring it; it is the thing that can afford to give way.

That lift must be conditional. Applying it whenever a card existed lifted it at
every stop — measured 567-601px, pushing it off the top of the stage. It now
fires only when the two rectangles actually intersect: 0px at six stops, 117px
at `kfupm`.

On a phone the same stop put the bubble on the joystick instead (bubble x
43-299 against a stick at 214-334). Shifting sideways cannot solve it — the
bubble is 256px wide and only 214px of stage remain left of the stick — so
`--say-x` and `--say-max-w` are also resolved in `walk.js`, and only while the
two share a vertical band. Result: 256px wide at six stops, 190px at `kfupm`.

The lift is computed from the card's UNLIFTED position (its rect plus the lift
already applied), or each frame reads the position it just set and the card
creeps off the stage.

### Verified

Every stop, both widths, comparing bubble against stage, card, rail, joystick
and the nav: 7/7 clean at 1280x900 and 7/7 at 375x812.

---

## 18. Hero text vanishing on the way back to the top (2026-08-16)

Reported as text sometimes disappearing when scrolling back up. Reproduced: go
down while the intro is still playing, come straight back, and the eyebrow, the
role line and the description stay at **opacity 0 permanently**. Measured after
the trip — hey 0, role 0, desc 0, actions 0.81, and the page looks like the
screenshot with only the name and the buttons.

**`.to()` samples its start value the first time it renders.** The scroll
timeline fades `.hero__hey`, `.hero__role`, `.hero__desc` and `.hero__actions`
out, and the intro timeline is animating those same properties with `.from()`.
If the first scroll happens mid-intro, the value the scrub records as "start" is
whatever the intro was passing through — so scrolling back restores the text to
a partial opacity, or to zero.

`immediateRender: false` was already there for exactly this reason, and the
comment beside it said so. It is not enough: it defers the sampling, it does not
stop it happening at a bad moment.

Two changes, both needed:

1. **`fromTo` instead of `to`** — declares both ends, so nothing is sampled.
2. **The scroll timeline is built in the intro's `onComplete`** — the two
   timelines then never touch the same property at the same time. If the reader
   scrolls during the intro, ScrollTrigger applies the correct state for wherever
   they are at the moment it is created.

Verified: the original repro restores all six elements to opacity 1, plus five
rapid up/down thrashes, a deep scroll and jump home, and a resize mid-scroll
followed by a jump home.

---

## 19. The relocated Thesis Coverage section was still on the page (2026-08-16)

Reported as the section appearing twice. It was: `#atlas` carried the `hidden`
attribute after §15 moved it into the project card, but measured
`display: grid` and **941px tall**, so the globe rendered once in the flow and
once inside the card.

**`hidden` is only a UA rule of `display: none`, and any stylesheet declaration
outranks it.** `.atlas { display: grid }` did. `.thermal` never showed the fault
because it sets no display of its own — which is what made it easy to miss:
one was checked, looked right, and both were assumed fine.

Guard added on the class the two relocated sections share, so it covers
`#thermal` too if its CSS ever gains a display:

    .is-embed[hidden] { display: none; }

The same trap is recorded at `.skills[hidden]` from an earlier session. **State
it as a rule: anything hidden with the `hidden` attribute needs its own
`[hidden] { display: none }` if its class sets display at all.** An audit over
every element that ships with the attribute found nothing else exposed.

Page height dropped 24,080 -> 23,139. Verified the card still mounts it (583px),
and closing returns it hidden at 0px.

---

## 20. Thesis content corrected against the actual research (2026-08-16)

The thesis card and modal described a system that does not exist in that form.
Corrections supplied by the author; recorded here because several are the kind
of claim that gets repeated once it is in the markup.

| claim shown | reality |
|---|---|
| "Under Development" | submitted; defence Aug 2026. Now "In Defence" |
| "17M (70%) population coverage" | 15.8M metro total, ~5.5M analysed urban footprint. 70% mapped to nothing |
| "<10 min pipeline latency" | aspirational. Ingestion is on-demand via GEE |
| "<1.5°C forecast RMSE" | no horizon given. Monthly 0.96-1.91°C day, 7-day 2.4-3.3°C |
| "Streamlit + Kepler.gl" | actual stack is FastAPI + deck.gl + MapLibre |
| Kafka / Spark as live | designed, not running |
| "multi-satellite feeds" | MODIS Terra+Aqua, Landsat for validation. VIIRS extracted but not in pipeline |
| HVI described, simulator absent | the intervention simulator is the largest deliverable |
| "Mountain arid" (Makkah) | enclosed valley |

Card metrics are now 5 cities / 0.96-1.91°C monthly RMSE / 1.37M in the top
vulnerability quintile / 12 measures in the simulator. Modal metrics carry
r >= 0.85 for MODIS vs Landsat instead.

**Two escaping notes.** `cat` and `title` go through `esc()` in `modal.js`, so
the data must hold a plain `&` — a pre-escaped `&amp;` renders literally as
"&amp;". `desc` and `metrics[].v` are inserted raw and may carry entities.

**Kepler.gl and Streamlit still appear elsewhere and that is correct** — they
are genuinely the stack for the IoT pipeline and the multi-city temperature
study. Only the thesis claimed them wrongly.

### Not done, and needing the author

- **The two architecture diagrams are images** (`thesis_arch.webp`,
  `thesis_pipeline.webp`) and still draw Kafka, Spark and Streamlit as live
  blocks, "48-Hour Forecast RMSE < 1.5°C", "5 Prophet Models" (actually 20),
  "2023-2025 (730 days)" (actually 2018-2025), and omit beta_NDBI. The captions
  now say the diagrams predate the stack, which is a stopgap, not a fix. They
  need redrawing — ideally separating Delivered (solid) from Roadmap (dashed).
- **The generic 3D heatmap** should be a real dashboard screenshot.
- **Structural suggestions still open:** a headline finding above the fold
  (Saudi cities are daytime cool-islands against the desert — the inverse of
  Oke), an Intervention Simulator mini-section with the Dammam worked example
  (one water feature cools 16,167 residents; one cool-pavement patch cools 602),
  a Delivered/Roadmap split, and a Chapters strip.
- **`atlas.lead` has no translations.** Six carried "17 million" and
  "near-real-time" and were removed rather than left contradicting the English.

---

## 21. Card 1 redesigned — poster face, case-study interior (2026-08-16)

Two changes, in that order: the card face became a poster, and the modal behind
it became a case study instead of a listing. Cards 2–7 are untouched; the plan
is one at a time.

### The face

`.pcard--poster`: full-bleed image, badges, title, stack tags, one call to
action. The description and all four metrics come off the face and live in the
modal.

The description STAYS in the HTML as `.pcard__crawl`, visually hidden. Moving it
"inside" would move it into `projects.js`, which no crawler and no JS-off reader
ever sees — and that paragraph was the only indexable description of the thesis.
Hidden with `clip-path`, not `display: none`, which is dropped from the
accessibility tree.

**The 3D is a pointer-follow tilt**, capped at 5°: past about 7 the text edges
distort and it reads as a toy. What makes it depth rather than a leaning
photograph is that the text plate sits on `translateZ(38px)` and parallaxes
against the image. `projects.js` writes `--rx`/`--ry` and the stylesheet owns
what hover looks like. Gated on `hover: hover and pointer: fine` and off under
reduced motion — on touch a tap would tilt the card and leave it tilted.

The scrim was re-ramped against measured positions, not by eye: on a 565px card
the badge row starts 52% up, where the original gradient had decayed to ~0.28
alpha, which is why badges washed out over bright frames.

### The interior

Three new optional fields in `data/projects.js`, rendered by `modal.js` when
present, so any project can adopt them:

| field | what it is |
|---|---|
| `finding` | the headline claim, set as a pull quote directly under the title |
| `diagram` | names an SVG builder in `modules/diagrams.js` |
| `worked` | one worked example — lead, two or more figures, a closing line |

`finding` exists because the modal described machinery and never said what the
study **found**. It now opens with the cool-island inversion.

`worked` exists because a capability list is not evidence. "Ranks interventions
by beneficiaries" is a feature; "one water feature cools 16,167 residents, one
cool-pavement patch cools 602, same budget" is a result a reader can argue with.

### The diagrams are SVG now

`thesis_arch.webp` and `thesis_pipeline.webp` are gone. They had been wrong for
a while — Kafka/Spark/Streamlit drawn as live, "48-Hour RMSE < 1.5°C", "5
Prophet Models" against twenty, "2023-2025 (730 days)" against an eight-year
series, no beta_NDBI — and staying wrong is what an image guarantees: every one
of those is a one-word edit in `diagrams.js` and a redraw-and-re-export in an
image editor.

`thesisDiagram()` draws two lanes. **Solid boxes are running; dashed boxes are
designed and not deployed.** The old diagrams drew both identically, which is
how the site came to claim a live Kafka cluster. Inline SVG also scales without
blurring, follows the theme through CSS custom properties, and puts its labels
in the DOM where a screen reader and a translator can reach them.

Still outstanding: the generic 3D render on the card face wants replacing with a
real dashboard screenshot — the poster layout leans on that image far harder
than the old split card did.

## 22. One globe, two worlds — the scroll-scrubbed zoom-out (2026-08-17)

The hero Earth and the failed Earth are the SAME globe. Scrolling pulls the
camera back from the cropped close-up to the whole sphere while the surface
crossfades to a climate-failed map. One canvas, one scene, one rotation, fully
reversible, draggable throughout.

This replaced two earlier attempts in one session — a marquee, then a second
globe flipped with `scaleY(-1)` to read as a reflection. Both are gone.

### Structure

```
.worlds                     the scroll container the transition is scrubbed against
  .worlds__stage            position: sticky, top 0, height 100svh  <- the canvas
  .worlds__copy             margin-top: -100svh
    #hero                   transparent
    #future                 transparent
```

**The stage must not be inside `.hero`.** `.hero` sets `overflow: hidden`, which
makes it a scroll container, and `position: sticky` is confined to its nearest
scrollport — a sticky canvas in there behaves like `position: relative` and
scrolls away, silently, with nothing to see in devtools.

**The overlap pulls the COPY up, not the stage down.** The first version used
`margin-bottom: -100svh` on the stage. Layout was right and the release was
wrong: sticky constrains an element by its MARGIN box, that margin made the
margin box zero tall, and the stage stayed stuck a full screen past the end of
`.worlds` — the globe showed straight through the About section.

### Driving it

`initEarth()` returns `{ setZoom, setDecay, isReady }`. main.js owns one
ScrollTrigger over `.worlds` and knows no three.js.

    zoom   0 -> 1  over progress 0.00 .. 0.72   (eased)
    decay  0 -> 1  over progress 0.30 .. 0.95   (linear)

The ranges deliberately differ. The camera moves first and alone, so the reader
pulls back on a planet they recognise before it starts to turn; crossfading in
lockstep reads as a rendering glitch. Decay is linear because an eased crossfade
lingers in the half-and-half state, the one state that looks like neither planet.

`--zoom` is published to the stage as a custom property so CSS keeps ownership
of the scrim and heat-glow fade — both exist to buy ground for the hero copy and
have no job once it is gone, and the scrim's centred ellipse would otherwise sit
as a grey disc on the planet's face.

### Four things in earth.js that had to change

1. **`layout()` no longer writes framing.** It used to set position/scale
   unconditionally on every resize, which would have destroyed any scroll-driven
   value — including when a phone URL bar collapses mid-transition. `zoom` is now
   the single source of truth and `applyFraming()` re-derives from it.
2. **The axial tilt moved to a parent group.** `rotation.z` (tilt) and
   `rotation.y` (spin) shared one XYZ Euler, so the pole precessed on a 23.4-degree
   cone once per revolution. The old crop hid it; a centred full sphere does not.
3. **The zoomed-out scale is derived, not hardcoded.** `halfH * min(1, aspect) *
   0.82`. Which edge binds changes with aspect: at 375x812 the half-width is
   0.465, so the old hardcoded 0.66 was a radius half again larger than the frame
   could hold and the planet ran off both sides.
4. **Drag sensitivity scales with `rig.scale`.** Fixed radians-per-pixel made the
   zoomed-out globe spin twice as fast per pixel.

### Drag binds to `.worlds`, not the stage

The stage is a SIBLING of the sections, so nothing bubbles to it — and the copy
covers the whole viewport. Measured: `elementFromPoint` at frame centre returned
`#future` with no path to the stage, i.e. the zoomed-out globe could not be
turned at all. `.worlds` is the one common ancestor of both.

Separately, `.hero__body`/`.hero__stats` reach `opacity: 0` but still hit-test,
and earth.js refuses drags targeting links — so the four invisible CTAs sat dead
centre of the planet. They get `pointer-events: none` via a `.set()`, since
pointer-events does not interpolate.

### Reduced motion

The old branch rendered one frame and returned before `bindDrag()`. Carried
forward that would have made the second Earth permanently unreachable — content
removal wearing a motion preference's clothes. Now: no idle spin, no cloud drift,
no starfield rotation, but scroll and drag stay live and each schedules a single
coalesced frame. Less motion, not less content.

### Clouds

Cloud opacity is multiplied by `1 - decay`. The composite is present-day Earth's
water cycle, and white cumulus over burnt ground read as a colour-grade rather
than a consequence. Fading it out is also what finally exposes the failed map's
surface detail.

### Runway

`.future`'s height IS the scrub range. Desktop measures 837px (0.92 screens).
Phones needed an explicit fix: `.hero` drops to `min-height: auto` at 560px, so
at 375x812 the range was only 570px — 0.70 of a screen, about one flick. Raised
to `118svh`, giving ~1.0 screens. The extra height lands above the bottom-aligned
copy, which is where the planet is.

### Texture

`earth-future-6k.webp` shipped at 2880x1440 under a 6k filename, against a
6144-wide NASA day map — 2.13x less angular detail, blended in the same fragment
at the same UV. Rebuilt with Real-ESRGAN x4plus (4x to 11520, Lanczos down to
6144). See tools note: the source is NOT cyclic (seam 1.24x normal adjacency), so
it is seam-healed with a cosine cross-dissolve BEFORE upscaling — a plain Lanczos
takes the seam to 2.96x, healed takes it to 0.03x.


### The texture rebuild, as run (2026-08-17)

`tools/upscale_earth.py` + `tools/rrdbnet.py`. Real-ESRGAN x4plus on CPU, ~45 min
for 72 tiles at 256px. RRDBNet is written out rather than imported: `basicsr`
does not install on Windows + Python 3.11, and `load_state_dict(strict=True)` is
what proves the reimplementation matches the checkpoint.

Results, against the NASA map each tier is blended with:

| tier | size | MB | NASA MB | sharpness | seam |
|---|---|---|---|---|---|
| earth-future-6k | 6144x3072 | 1.46 | 1.47 | 1.38x | 0.66x |
| earth-future-4k | 4096x2048 | 0.77 | 0.75 | 1.98x | 0.58x |
| earth-future    | 2048x1024 | 0.24 | 0.23 | 3.09x | 0.50x |

Three things worth keeping:

- **Heal the seam before upscaling.** The Gemini source is not cyclic — its two
  edges measure 1.24x normal column-to-column difference. Upscaling sharpens that
  step into a line: plain Lanczos to 6144 takes it to 2.96x. Healed first, 0.03x.
  Wrap-padding alone is not enough; it fixes the convolution, not the content.
- **Quality 92 was pure waste.** The lapvar curve is flat from q78 up, so 2.65 MB
  bought exactly what 1.46 MB does. Measure the curve before picking a number.
- **Checkpoint anything this long.** The first run was killed at tile 50/72 and
  lost 40 minutes because the output lived only in RAM. The checkpoint signature
  includes a hash of the INPUT, not just the geometry — adding the seam heal
  changed every pixel while leaving all dimensions identical, and a geometry-only
  signature would have resumed happily and mixed healed tiles with unhealed ones.

### Pacing, and where the dive lands (2026-08-18)

**Rest points.** Every pixel of scroll used to drive something, so there was
nowhere to stop and look. Each beat now runs, finishes, and holds. Sized in
scroll gestures rather than taste: a wheel notch through Lenis moves about a
third of a screen, so `.future` at 220svh leaves a ~594px hold — three notches —
after the surface turn completes. `.about--overmap` gets 52vh below its copy for
the same reason, and the dive completes at 62% of a 1.5-screen scrub.

**The decay start is derived, not hard-coded.** The brief was "as soon as the
hero text is gone", and that text is faded by a separate trigger anchored to
`#hero` in pixels. A progress constant would drift with any section or viewport
change, and it already differed between desktop and phone because `.hero` is
`100svh` on one and content-height on the other. `onRefresh` converts the same
pixel distance `hero.js` uses into this scrub's own progress.

**The surface turn is smoothstepped.** §22 argued for linear on the grounds that
easing lingers in the half-and-half state. That was backwards: smoothstep has
zero gradient at both ends and its steepest point in the middle, so it leaves and
arrives gently while crossing the ambiguous middle *faster* than linear. Span
also widened 0.14 -> 0.30 of the scrub.

**The dive lands on the VISITOR's city, not Riyadh.** Resolved from the IANA zone
name via `Intl.DateTimeFormat().resolvedOptions().timeZone` and a lookup table —
no permission prompt, no IP lookup, no network call, which is the same standard
`visitorLongitude()` was already held to. Unknown zones fall back to a continent
latitude paired with the offset-derived longitude, which still lands on the right
part of the right landmass; unknown regions fall back to Riyadh. Latitude is
clamped to +/-70 so the dive never ends staring at an ice cap.

**Open tension:** the thermal plates are Olaya, Riyadh, but the dive now lands
wherever the reader is. For most visitors the globe flies to their city and then
hands over to a map of Riyadh. The copy says "This is Olaya, Riyadh", so it is
not a lie — but it is a jump, and it wants either a line acknowledging it or a
plate per region.

---

## 23. The architecture flipbook, and the resolution argument behind it (2026-08-18)

Seven architecture projects live in `v2/public/assets/Architecture Portfolio`,
folders `01-`..`07-`. Inside each: one hero render, and numbered files
`Name (1).jpg` .. `Name (28).jpg`. The user's rule, stated directly:

> hero is meant for tile only / rest is 1,2,3,4....like this which is book

So the hero is the wheel tile and is NOT a page; the numbered files are the book
in reading order. `arch_pages.py` sorts on the integer inside the parentheses —
sorted as strings, page 10 lands between 1 and 2, and a portfolio whose pages
are out of order is worse than one that loads slowly.

### Two resolution tiers, and why 1500px was wrong

The first conversion shipped one tier at 1500px, justified in that script as
"a little softness under magnification is a far better trade than 90 MB of
originals." The user pushed back:

> i hope you dont compromize with quality of the pages because each details is
> highly relevant

They were right, and the argument that settles it is arithmetic rather than
taste. A half-spread occupies roughly 750 CSS px. The book magnifies to 4x. So
at full zoom the reader is looking at a **3000px-wide rendering** — ship 1500
and every pixel is doubled at max zoom, soft by construction, whatever a
sharpness score says. On architectural sheets the dimension strings and
annotations ARE the content; a magnifier that returns mush is worse than none.

Measured PSNR against lossless at 3000px: q78 43.6, q82 44.6, q86 45.7, q90
47.3, q94 49.0. Note this curve does **not** flatten the way a photograph's
does — the Earth texture went flat above q78. Line art keeps paying back
quality because hard edges are the worst case for the DCT. Hence q90.

    p01.webp      1600px q84   the spread            20.3 MB total
    p01-hi.webp   3000px q90   fetched only on zoom  64.9 MB total
    p01-t.webp     320px q74   thumbnails

`book.js` swaps in the `-hi` file when zoom passes 1x, on load rather than on
request, so the sharp file replaces the soft one in place with no visible gap.
The weight is only paid by readers who actually magnify, and only for the pages
they magnify. Verified in browser: at 2x the swapped image reports
`naturalWidth: 3000` and the ground-floor-plan dimension strings are legible.

Sources are never upscaled — Miscellaneous is only 2400px wide at source and
stays there. Inventing pixels costs bytes and buys nothing.

### The leaf model

A leaf is one sheet with a page on each face. Turning leaf N sweeps its front
page away and brings its own back page down into the opposite position. That is
why a crossfade cannot do this: a crossfade has no back. Only three leaves ever
exist in the DOM, so a 28-page book costs what a 6-page one does.

Below 720px the book switches to one page per slot, spine at the left edge.
A two-page spread on a phone gives each page about 170px, which for a
dimensioned drawing is not a page. Crossing the breakpoint converts through the
page NUMBER, not the slot — slot 3 is pages 6-7 in spread mode but page 4 in
single mode, so keeping the slot would silently move the reader.

### A real bug: paint and hit-test disagree inside the 3D ring

Clicking a card did nothing for a real visitor while `card.click()` worked
perfectly — the failure mode most likely to survive casual testing.

Measured at both 1440 and 800 wide: a trusted click at a card's exact centre
reported `event.target` as the ancestor `.wheel`, while
`document.elementFromPoint()` at the very same coordinates returned the card.
The cards sit inside a `preserve-3d` ring and the hit-test disagrees with the
paint there. `book.js` therefore falls back to `elementFromPoint` when the
target walk comes up empty. That fallback is load-bearing, not defensive
padding — without it the books are unreachable by mouse.

### Hub labels: the measurement was lying

The user twice reported the hub labels as too big. The cause was not the chosen
size but the instrument. `fitLabel()` measures the longest line with a throwaway
span and copies the computed `font` shorthand — which carries size and family
but NOT `text-transform` or `letter-spacing`. The labels are uppercased and
tracked out, so the probe measured lowercase untracked "Architecture" at 384px
while the element rendered "ARCHITECTURE" at 559px: a 46% under-read. `HUB_FILL`
0.94 was therefore producing a label half again wider than its column, bleeding
off both edges.

With the probe copying transform and tracking, `HUB_FILL` now means what it
says. It is back at 0.94, which renders 582px inside a 619px column instead of
~847px overflowing it.

**Known trade-off, not yet resolved.** One shared font size across both wheels
was an explicit request. But equal size means unequal width, and the card is
518px: "ARCHITECTURE" clears it by 63px while "PROJECTS" is 141px short, so the
left hub is fully covered whenever a card sits at the front. Sizing off the
SHORTER label instead would clear both but push "ARCHITECTURE" far past the
column — which is what the user rejected. The lever that actually resolves it is
card width (`min(100%, 36vw)`), and the user asked for BIGGER tiles, so this is
theirs to call rather than mine.

### A self-inflicted wound worth recording

Patching `.wheels .wheel__title` by `s.index(selector)` matched the one-liner
inside the `@media (max-width: 900px)` block rather than the real rule further
down, and the replacement swallowed 154 lines including every wheel-card
internal style. Recovered with `git checkout` and re-applied by anchoring on the
full declaration text instead of the selector. Anchor scripted CSS edits on
something unique to the rule, and check `git diff --stat` before building.

### Resume here (as of 2026-08-18)

Done and verified in browser: the two-tier page assets, `src/data/arch.js`,
`src/modules/book.js`, `src/styles/book.css`, the `#bookModal` markup, the seven
real architecture cards, `initBook()` in `main.js`, and the `fitLabel` probe fix.

Open, in the order it probably matters:

1. **Card subtitles are inferred, not authored.** "Urban design · masterplan",
   "Mixed use", "Hospitality · landscape" and the rest came from folder names.
   Titles too. These need the real project descriptions, and `arch.js` carries
   the same guesses in its `meta` fields.
2. **The left hub label is covered by the front card.** One shared font size was
   an explicit request, but equal size means unequal width: against a 518px card
   "ARCHITECTURE" clears by 63px while "PROJECTS" falls 141px short. Sizing off
   the shorter label clears both and pushes "ARCHITECTURE" past the column,
   which was already rejected. The lever is card width (`min(100%, 36vw)`) and
   the user asked for bigger tiles — so it is theirs to decide, not a bug to fix
   quietly.
3. The 7th M.Sc. research project is still a `pcard--todo` placeholder.
4. The dive lands on the visitor's own city but the thermal plates are Olaya,
   Riyadh. Either acknowledge the mismatch in a line of copy, or carry a plate
   per region.
5. `projects.title`, `projects.lead`, `atlas.lead` and `future.*` have no
   translations.

Repo weight note: `public/assets/arch` is 84 MB, of which 64.9 MB is the zoom
tier. It is committed deliberately — Vercel serves straight from the repo and
the tier is the whole point of the quality decision above. No single file
exceeds ~0.8 MB.

---

## 24. Two dashboards, and a statistic that would not reproduce (2026-08-19)

Two project cards now open onto running dashboards rather than screenshots.

### Why iframes, and why that is not a compromise

Both apps are full-viewport (`height: 100vh`), which is normally the awkward
part of embedding. Inside an iframe that resolves to the IFRAME's height, not
the window's. So the property that makes them impossible to merge into this
site's tree is the same property that makes them trivial to embed: they fill
whatever box they are given, unmodified. The UHI twin is React + Tailwind + its
own router and this site is vanilla JS; there was never a merge to consider.

The embed has three states and the middle one is the entire design:

    cold    nothing fetched. A 54 MB app must not load because someone
            opened a project card.
    live    running and visible, but behind a transparent shield.
    armed   shield off, the app has the pointer.

deck.gl reads the wheel as zoom. An armed map sitting in a scrolling article
swallows the page scroll the moment the pointer crosses it, and the reader
silently zooms Riyadh while trying to scroll past. Clicking arms it; clicking
away or pressing Release hands scrolling back. Full screen uses the native
Fullscreen API rather than a fixed overlay, because the modal panel is
transformed while it animates and a transformed ancestor re-bases
`position: fixed` onto itself.

### The Dammam twin

Built here rather than borrowed: `gis-twin.html`, `src/gis-twin.js`,
`src/styles/gis-twin.css`, deck.gl `GridCellLayer` over MapLibre, in the UHI
twin's visual language (Jost / JetBrains Mono, `#eef2f7`, frosted panels,
`#0369a1` chrome, the `cmd-panel` corner brackets). One rule enforced
throughout: the interface accent never touches the data. Chrome is blue, data is
heat, so the reader never has to ask which colours carry meaning.

The data was recovered rather than re-derived. `Fishnet_500m_Clip.shp` has
12,954 polygons and `DMA_Clean_Analysis.xlsx` has 12,954 attribute rows keyed by
FID, a clean 1:1 join. Workbook values are min-max normalised, and the masked
rasters in `02_Processed` are still there, so LST was converted back into degrees
using each year's own raster range. Two independent checks passed before
anything was drawn: 2023 recovers a 65.83 °C maximum, and Very-High Exposure
comes out at 57.2 km² against the paper's 57.3.

### Contrast had to be measured, not eyeballed

The first render read as a flat plateau. The reason, measured: the middle HALF
of the cells occupies 10.9% of the LST range, 15.4% of the Composite HVI range
and 3.4% of the NDBI range. A linear min-max scale therefore spends 85 to 97% of
its colour and its height on a handful of outliers.

Colour is now CLASSIFIED and the method is named in the legend, because the
choice changes which cells are called vulnerable:

    Natural breaks (Jenks)  default, and what the study's own ArcGIS maps use
    Equal count (quantile)  even contrast, but the bottom class on the built-up
                            model spans 0.204 to 0.534, wider than the other
                            four together
    Equal interval          71% of cells in one class; present to show why it
                            is not the default

Each legend row also carries its cell count and share, so an over-full class is
visible rather than inferred. Jenks is the exact Fisher-Jenks dynamic program
run on 200 weighted quantile bins, because the textbook O(n²k) form is about 840
million inner steps per layer and would lock the page; the breaks are
indistinguishable, since no cut ever falls inside a bin of 65 near-identical
values.

Height stays continuous and rank-based rather than classified, so relief
survives inside each class instead of terracing into five plateaus.

### The Getis-Ord layer that was thrown away, twice

The published headline is that the Composite HVI 99% hot spot is 4.18× the area
of the LST-only one, 505.0 km² against 120.8. The ArcGIS Gi* output did not
survive: no `.aprx`, no `.gdb`, no `Gi_Bin` column in either workbook.

A from-scratch recomputation returned 0.93×. It was not shipped. A number that
contradicts the author's own paper while wearing the paper's authority is worse
than an absent layer, and the bake script was written with that check built in
so the failure was loud rather than silent.

The fishnet could not simply be re-run either, because it has no `.dbf` at all —
geometry with no attribute table, and Hot Spot Analysis needs an input FIELD. So
the table was rejoined from the workbook into
`01_DMA\05_ForHotspot\Fishnet_500m_HVI.shp`, with a `CELLID` field carrying the
original FID, because Hot Spot Analysis writes a NEW feature class whose
OBJECTID is its own and a row-order join is one edit away from silently wrong.

Run in ArcGIS Pro at the documented 1,000 m band, it still missed: 1,311 and
2,343 cells, a ratio of 1.79×. The diagnosis came from the class MEANS matching
the paper almost exactly (0.530 / 0.538 / 0.576 / 0.614 / 0.624 / 0.682 against
0.523 / 0.532 / 0.575 / 0.620 / 0.632 / 0.689) while the COUNTS did not. Matching
means with wrong counts points at a significance threshold, not at the statistic.

Applying Benjamini-Hochberg FDR correction to the exported p-values reproduced
every class count exactly:

    bin      no FDR   with FDR   paper
     -2        2058       1639    1639
     -1         657       1370    1370
      0        4635       5529    5528
     +1         497        523     523
     +2         744        636     636
     +3        2343       2020    2020

    LST 99% hot: 483 cells = 120.8 km²   (paper 483 / 120.8)
    HVI 99% hot: 2020 cells = 505.0 km²  (paper 2020 / 505.0)
    ratio 4.18x                          (paper 4.18x)

`arcpy.stats.HotSpots` leaves FDR correction off by default and the paper's
method section says only "Getis-Ord Gi*, fixed 1,000 m band". **As published the
result cannot be reproduced.** One clause in the method fixes it, and that is
worth raising if the paper is ever revised.

The join back was verified rather than assumed: ArcGIS exported `SOURCE_ID`
instead of the planted `CELLID`, so the HVI value each hot-spot row carries was
checked against the value of the cell `SOURCE_ID` points at. Max mismatch
0.00000000 across 12,954 rows. A silent off-by-one there would have put every
hot spot on the wrong cell while still looking entirely plausible.

### Also in this session

The thirteen ArcGIS map layouts were added to the GIS card in four argued
groups (inputs, four models, the two hot spot layers, the intersection) rather
than one undifferentiated grid, at 900px with a 2000px zoom tier, since on a map
layout the legend is the content.

And a live bug: none of the seven M.Sc. cards opened for a real visitor. See
CLAUDE.md; the short version is that `elementFromPoint` is only reliable while
the ring sits at `rotateX(0deg)`, so the front card is now derived from
projected area instead of hit-tested.

---

## 25. Three project dashboards, one visual language (2026-08-19)

Three project cards now open onto working dashboards rather than screenshots,
all in the UHI Digital Twin's design system: Jost and JetBrains Mono, frosted
white panels on #eef2f7, #0369a1 as the interface accent, the cmd-panel corner
brackets. One rule holds across all three — **the accent never carries data**.
Chrome is blue and the data has its own scale, so no colour on screen is
ambiguous.

| card | page | weight |
|---|---|---|
| M.Sc. thesis | `public/uhi-twin/` (copied build) | 54 MB |
| GIS & Remote Sensing | `gis-twin.html` | 1.25 MB payload |
| IoT pipeline | `iot-twin.html` | 12 KB JS + 12 KB CSS |
| Multi-city temperature | ~~`mc-twin.html`~~ | **retired 2026-08-20, see §28** |

### The IoT one: same components, better dashboard

The first attempt got the brief wrong. "Same style as the Dammam twin" was read
as "use the map idiom", and a 3D city replay was built. What was wanted was the
design language applied to the Streamlit dashboard's own components: a
continuous-monitoring console showing the flow from sensors through Kafka and
Spark into the database.

Rebuilt as an operations console — ingestion pipeline across the top with
batches animating along the rail, live telemetry beside the alert stream, node
cards with sparklines, distribution and correlation beneath. One clock drives
all of it. Dropping the map also dropped deck.gl and MapLibre entirely, which is
why the page is 12 KB rather than a megabyte; the four canvases are hand-drawn.

Two findings in the deployed Streamlit app, both worth fixing at the source:

- **The 30 °C alarm fires on 87.3% of readings.** The nodes' own baselines run
  32.0 to 43.5 °C by design, so a temperate-climate default cannot separate a
  hot afternoon from a fault. Bands here come from the distribution: p95
  warning, p99 critical, per-node IQR for anomalies. Result: 90% normal.
- **"Normal" renders as a negative number** on the live page. `app.py:364`
  computes `len(df) − total_alerts`, but a reading counted in both `high_temp`
  and `anomalies` is counted twice, so with 490 records and 518 alert-rows it
  underflows to −28. Here each reading is classified once, most severe wins, and
  the classes sum to 50,410.

### The multi-city one: all five pages

Same mistake in a different form — the first build covered roughly two of the
Streamlit app's five pages. It has a seventeen-city global view (three measured,
fourteen estimated) and a methodology page that were missing entirely. Rebuilt
with all five as tabbed views.

The design decision that carries it is a **shared temperature scale**. Rendered
separately and stretched to its own range, every city looks the same: hot bits
and cold bits. On one scale spanning −19.7 to 38.5 °C, Dammam glows, Reykjavik
goes blue, and the gradient is visible before a word is read. The original
Kepler.gl clips were produced one city at a time, which is exactly why the
finding needed a scatter plot to explain it.

Everything recomputes from the CSV at runtime, and every published figure
reproduced exactly: 25,905 measurements, r = −0.9948, R² = 0.9896, −9.1 °C per
10° north, 58.2 °C span.

Three things the data said that the original did not:

- **The headline r = −0.995 is on city means, which is three points.** Across
  all 25,905 individual measurements it is −0.972 (R² = 0.9455). Both are
  plotted. The gap is the within-city spread a three-point fit cannot see.
- **Dublin is missing 7 of 14 days entirely** — no cloud-free MODIS overpass,
  which is ordinary for Ireland in November. The first build silently
  substituted the all-days mean for missing days, printing a confident 9.6 °C
  for a day never measured, and drew the trend line straight through the gaps.
  Now: "no cloud-free pass", and the line renders as separate runs.
- **The ±1.4 °C stated error holds only inside the model's own valid range.**
  Within 26–64°N the mean absolute residual is 0.97 °C across 9 cities; across
  all 14 NH cities it is 3.66 °C, and the whole difference is tropical cities
  the model never claimed to cover. Shown with the valid band shaded, which
  makes it a strength rather than a hole.

Also: the app's sidebar says 3 measured + 14 estimated while its page text says
"16 cities". It is 17.

### Bugs worth remembering

**A build check that always passed.** `npx vite build … | grep error; echo
"build ok"` — the `echo` runs regardless of exit code, so it printed success
through several genuinely failing builds and a stray brace in `gis-twin.js` sat
broken for four steps behind a false green. Check the exit code, not the output.

**`display` beats `[hidden]`.** `.view { display: grid }` silently overrides the
browser's `[hidden] { display: none }`, so all five multi-city views rendered
stacked while the tab bar correctly highlighted one that could not be seen. The
IoT `.shell` had the same latent trap, masked only because the boot overlay
covered it. Any element given an explicit display needs `[hidden]` restated.

**A fade-in on a high-rate feed hides the newest rows.** The alert stream
rebuilt its `innerHTML` on every push, restarting the entrance animation on
every row, so at 5× the whole feed sat permanently mid-fade. Rows now prepend,
only new ones animate, and the animation slides without fading.

**Startup gated on a third-party event.** `map.on('load')` never fired on the
IoT page even though the style parsed 93 layers and the tiles arrived. A local
dataset should not be hostage to a CDN event; startup now runs on whichever
comes first, the load event or a short timer.

Smaller ones: a fractional replay cursor used as an array index (surfacing far
away as deck.gl failing to read a colour), a day counter dividing by 720 instead
of 1440 giving "day 14 of 7", an `elevationScale` applied on top of an already
metric range making 1.4 km columns 36 km tall, and a map framing routine that
measured its container while the shell was still hidden and fell back to a
160 px floor.

---

## 26. The global Landsat dashboard, and designing a colour ramp by measurement (2026-08-20)

`lst-twin.html` is the fourth dashboard: surface temperature for cities across
both hemispheres, extracted from Landsat 8/9 Collection 2 Level 2 at 30 m via
the Microsoft Planetary Computer STAC (no credentials needed), 24 acquisitions
per city, rendered as extruded 30 m cells with a timeline and a second tab of
per-hemisphere regressions.

### What the resolution argument settled

The first attempt used Open-Meteo reanalysis grids, and the user's response was
"this is very coarse". They were right, and the number says why: Open-Meteo puts
**21 cells across Dammam with a 2.40 °C spread**. MODIS gives 617 cells. Landsat
gives **892 × 805 cells at 30 m**. Urban heat island structure is a street-level
phenomenon; at reanalysis resolution the thing being studied does not exist.

Two extraction traps cost real time:

**Landsat fill values are not zero.** ST_B10 has a valid DN range starting at
**293**; masking only `DN == 0` leaves sub-293 fill in place, and it scales to
about −122 °C. One such frame gave Kinshasa a mean of **12.0 °C** and flattened
the entire Southern Hemisphere regression to R² 0.076. After masking to a
physical −70/+80 °C window, Kinshasa reads 33.3 °C and Southern R² is 0.249.
The dangerous part is that 12 °C looks merely surprising rather than obviously
broken — it would have shipped. The repair pass caught fourteen more cities when
the dataset expanded: **Manila 7.8 → 32.6 °C, Jakarta 9.3 → 36.5, Mumbai
19.1 → 32.5**. Humid tropical cities are the worst affected, because they are
the ones whose scenes are most often part-cloudy.

**A cloud-free scene is not a complete scene.** A scene reporting 0% cloud
covered only 6% of the AOI, yielding 13% valid pixels. Scene selection now
requires `COVER_MIN = 0.98` and gets 100% valid.

### The colour ramp, and why eyeballing it failed three times

Three ramps were rejected in a row, and the useful part is that each failed for
a different, measurable reason:

1. **Inferno** — the dark end is near-black, so cool ground sank into the dark
   basemap and the coldest cities rendered as holes.
2. **Blue → white → red** — fixed that and introduced worse: a pale midpoint
   reads as blank, so the middle of every city looked like missing data.
3. **Indigo → blue → ice → sand → gold** — the same mistake wearing a warmer
   name. Scored in CIELAB it put **22 near-grey samples on the scale, starting
   at t = 0.50**, exactly where most cells sit.

The third rejection is the one worth remembering, because it was caught by
measurement rather than by taste, and only after the same complaint had already
been made twice about other ramps. `scratchpad/ramp_check.py` scores a candidate
on the three properties this page actually needs: L\* rising monotonically so
hotter always reads brighter, minimum ΔE across a 5% step so no window goes
flat, and distance from the grey axis so nothing reads as missing data.

**But the endpoints were never the real constraint.** The binding one is that a
single scene occupies only about a third of the scale, so it is not enough for
cold and hot to differ — *every one-third window has to differ from itself*. The
shipped ramp turns through **teal** rather than sand: L\* 11 → 83 without a
reversal, every 5% step above ΔE 7, **zero** low-chroma samples, and ΔE 46–68
across a realistic scene window where 2.3 is a just-noticeable difference.

### The range mattered more than the ramp

Colour is fixed per city and shared across its scenes, so that a colour means
the same temperature in January as in July and the timeline shows seasonal
change rather than a rescaling artefact. That part was right. Using **min and
max** for it was not: pooled across 24 scenes those are set by a handful of
outlier pixels in the two most extreme frames, and they stretch the scale so far
that an ordinary scene lands in a sliver of it.

| city | scene span, min/max range | scene span, p2–p98 range |
|---|---|---|
| Tromso | 22% | 32% |
| Kampala | 27% | **63%** |
| Cape Town | 29% | **54%** |
| Dammam | 11% | 16% |

Tromso in winter occupied **8%** of the ramp and rendered as one flat blue. The
2nd–98th percentile of all pixels across all scenes roughly doubles what a
typical scene uses. The extremes clip, which is the right trade: two frames
losing their tails beats twenty-four frames losing their structure.

Dammam stays low because it genuinely has a huge seasonal swing — November reads
25.6–44.1 °C and June 32.8–65.8 °C. That flatness is true to the data, and
pushing contrast past what the data holds would be a lie.

### A map ramp is not a text ramp

The city rail and the results table print each mean in its own ramp colour. A
ramp that must start dark for the map is unreadable as type on the same ground:
Tromso's mean measured **1.19:1** against the page, where WCAG AA wants 4.5:1.
`rampText()` keeps hue and chroma and floors lightness only, so the colour still
carries temperature while clearing the background — 5.24:1 at the coldest row.

### The southern fit was a statement about the range, not the relationship

This is the finding worth keeping. On the original Europe–Africa corridor the
southern regression came out at **R² 0.249 across 30 cities and 34 degrees**,
against the north's 0.79 across 52 cities and 69 degrees. The natural reading is
that latitude governs surface temperature less well in the south — season,
maritime influence, something physical.

It was none of those. The corridor was chosen to hold longitude roughly fixed so
that latitude was the only variable, which is defensible, but in that band the
land stops at Cape Agulhas. The southern group had **half the lever arm on half
the sample**, and that alone accounts for the weak fit.

Adding Asia, Australasia and South America — Punta Arenas at −53.2°, Dunedin at
−45.9° — costs the fixed-longitude control and buys back the range:

| | Europe–Africa corridor | worldwide |
|---|---|---|
| North | R² 0.793, 52 cities, 69° | R² **0.755**, 78 cities, 69° |
| South | R² 0.249, 30 cities, 34° | R² **0.611**, 57 cities, 53° |

The northern fit barely moved, which is the control: adding longitude variation
did not damage a relationship that had enough range to show itself. The southern
fit more than doubled. **A weak fit over a third of the range is a statement
about the range**, and the Analysis tab now says so in those words.

Final dataset: **135 cities, 78 N / 57 S, 70°N to 53°S**. Polokwane yielded no
scene meeting the 98% coverage bar and was dropped.

### Copy that cannot go stale

The Analysis tab asserted "34 degrees against the north's 70" and blamed Cape
Agulhas for the southern span. Both were true of the original Europe–Africa
corridor and both became false the moment South America and Australasia were
added — Punta Arenas sits at −53.2°. Every figure in those notes, the header
subtitle and the document title are now **derived from the index at runtime**,
including the comparison between hemispheres, so the prose cannot contradict the
chart above it. This is the same discipline as the Dammam twin's readouts, and
for the same reason: a typed number drifts, a computed one cannot.

### Palette

Chrome is gold `#e0a355`; hemispheres are ice blue `#63b8d4` (north) and ember
`#e0742f` (south). The chosen palette named the same gold for chrome and for the
southern series — an interface colour and a measurement wearing one colour — so
the southern line was moved to a deeper amber. **The accent never carries data**
still holds across all four dashboards.

Secondary text is off-white rather than grey, at the user's request. The three
tiers still exist so hierarchy survives, but they are compressed into the top of
the range: most labelling here is at 0.58rem, and a mid grey at that size on a
near-black ground is genuinely hard to read.

---

## 27. Three wrong models, and why the columns looked flat (2026-08-20)

Four complaints about the Landsat dashboard turned out to share two root causes.

### Cloud that survived the physical filter

`repair_lst.py` masks pixels outside a physical −70/+80 °C window. That catches
raw fill but not thin cloud, whose brightness temperature is a perfectly
"physical" −30 °C. What survived was not scattered noise but **entire frames**:
Abuja 2025‑07‑22 had a median of −23.6 °C, Rome 2025‑11‑25 −57.6 °C, Bulawayo
2025‑01‑13 −61.5 °C. Abuja ended up with **12% of its pixels below 0 °C**, in
Nigeria. Singapore's colour range read **−46.4 to 48.8 °C**.

An absolute threshold cannot fix this, and that is the interesting part: Abuja's
bogus −23.6 °C overlaps Ulaanbaatar's entirely genuine −23.9 °C in February.
Cloud is cold *relative to the city's own seasonal envelope*, so `clean_frames.py`
thresholds on the city's own distribution of frame medians, rejecting a frame
more than 25 °C below the 25th percentile of them. Result: **12 frames across 11
of 135 cities**, every one obviously cloud, and no legitimate winter frame
touched anywhere, including Yakutsk, Harbin, Tromso, Murmansk and Ulaanbaatar.
Northern R² went 0.755 → 0.780.

### Colour and height were doing the same job

Both read the cell's position in the city's whole‑year range, so on any single
date every column stood at nearly the same height. Measured: **Dammam had 839 m
of relief across a 28.8 km footprint, a 2.9% slope**. Singapore 3.2%. That is
flat, and the user said so.

Giving the channels different jobs fixes it without inventing contrast that is
not in the data. Colour still carries absolute temperature on a range fixed for
the whole city, so the timeline still shows the season. **Height is normalised
within the frame**, at full range every time. The span scales with the city's
ground width, so every city now gets the same visual slope instead of the
accidental spread from 3.2% (Singapore) to 17.7% (Tromso):

| city | before | after, at 1× |
|---|---|---|
| Dammam | 3.5% | 16.0% |
| Singapore | 3.2% | 16.0% |
| Kampala | 12.3% | 16.0% |

A `Relief` slider (0.2× to 3.2×) exposes the exaggeration, because there is no
single right value: how steep a slope must be before the eye reads it as
structure depends on camera pitch and on what the reader is looking for.

### Three models, and the two that were wrong

The user reported that "the equation and values are not matching". They were
right, and it was not a plotting bug. It was the model.

**A straight line** ran about five degrees above every equatorial city, because
it had to reach the mid‑latitudes. Surface temperature does not peak at the
equator; it peaks across the arid subtropics, because the equator is humid,
cloudy and vegetated and evaporation cools it. The five hottest cities here are
Khartoum (16°), N'Djamena (12°), Aswan (24°), Dammam (26°) and Livingstone
(18°), none equatorial. The southern hemisphere paid most: R² 0.613.

**A quadratic** fixed the equator and broke the pole. R² 0.802 south, but a
parabola forced through a maximum at 11° must dive afterwards, and with only
**one** southern city beyond 50° nothing holds the tail down. It undershot Punta
Arenas by 4.5 °C, visibly peeling away from the last point on the chart.

**A hinge** is the shape the physics has, and cannot run away because its
poleward limb is straight:

| | linear | quadratic | hinge |
|---|---|---|---|
| North | 0.780 | 0.801 | **0.826** |
| South | 0.613 | 0.802 | **0.819** |

Flat at 36.4 °C to 20° north then −5.7 °C per ten degrees; flat at 32.7 °C to
24° south then −8.3 °C. Residuals are small and no longer structured: worst band
off by 2.8 °C where the straight line was off by 5.1 °C, and Punta Arenas lands
at 8.0 against 9.3 observed.

Two smaller fixes in the same pass. The curve is now **sampled only across
latitudes that have cities**; the old line was drawn 0°–72° regardless of where
the data stopped, which was half the reported mismatch on its own. And the
hemisphere accents went to near‑maximum chroma (`#22e0ff`, `#ff5c2b`), because a
3.6px scatter dot has very little area in which to make its case.

## 28. mc-twin retired; lst-twin is the temperature dashboard (2026-08-20)

The 135-city Landsat build replaced the 3-city MODIS one. `mc-twin.html`,
`src/mc-twin.js`, `src/styles/mc-twin.css` and the 440 KB
`public/assets/data/multicity.json` are deleted, and the `mcTwin` entry is out
of `vite.config.js`. **502 KB off the build.**

It was already orphaned: `src/data/projects.js` pointed the temperature card at
`/lst-twin.html`, and the `twinLegacy` block that still named `mc-twin.html` was
read by nothing. That block is gone too.

### The card copy was stale, and by more than a rounding

Written when the payload held 82 cities. Measured against
`public/assets/data/lst/index.json`, it holds **135** — 79 north, 56 south,
69.7°N to 53.2°S. The card advertised *"82 cities ... Tromsø at 69°N to
Gqeberha at 34°S"*, understating the southern reach by nineteen degrees.
Corrected to 135 and to Punta Arenas at 53°S in `sec`, `lead` and `hint`.

**Read the counts off the payload, not off the prose.** The comment in
`projects.js` now says so.

### What was thrown away, and the one thing worth keeping

mc-twin carried 68 lines of uncommitted, working, verified changes: a Relief
slider, per-city height normalisation, and a deck.gl colour fix. All of it went,
because the page had no route to a user. The finding behind the colour fix is
worth keeping, because it will recur anywhere `colorRange` is used:

> **deck.gl does not place a `colorRange` at the values you think.** It builds a
> linear-filtered texture one texel per colour and samples at
> `u = (v - lo) / (hi - lo)`, so stop *i* lands at the texel centre
> `(i + 0.5) / N` of the domain, not at the ramp’s own anchor. With a 7-stop
> ramp the map disagreed with the legend printed beneath it by up to 5.7°C —
> worst at 26°C, where map and card were **65 apart in RGB**. A corrected
> `colorDomain` does not help: the texel-centre inset survives any domain. The
> fix is to hand deck.gl a dense range already sampled at the texel centres it
> will use — 128 texels took the worst error to **3 RGB**.

**`lst-twin` is not affected.** It computes `ramp(t)` per datum and passes
explicit RGB through `getFillColor`, so there is no colour texture to mis-sample.

The deleted files are in git at `8371aca`; the uncommitted diff was preserved
outside the repo before deletion and is not in history.

## 29. Water was never masked, and the analysis panels described the fit (2026-08-20)

### The bug: one missing bit

`extract_lst.py` masked `QA_PIXEL` bits 1, 3 and 4 — dilated cloud, cloud,
cloud shadow. In Landsat Collection 2 **bit 7 is Water**, and it was not in the
mask, so every coastal city averaged sea surface into its land temperature.
Provable from the source; no measurement needed to establish it.

Measured on a trial extraction, the size of it was the surprise:

| city | pixels dropped | mean before → after |
|---|---|---|
| Reykjavik | **57.1%** | 12.14 → 16.86 (**+4.72 °C**) |
| Edinburgh | 43.2% | 15.59 → 17.91 (+2.32 °C) |
| Mumbai | 38.2% | 32.40 → 34.95 (+2.55 °C) |
| Singapore | 33.0% | 37.44 → 31.58 (**−5.86 °C**) |
| Dammam | 0.8% | 41.91 → 42.01 (+0.10 °C) |
| Riyadh *(control)* | **0.0%** | no change |

**More than half of Reykjavik was sea.** Riyadh dropping exactly nothing is the
check that the mask selects water rather than just deleting pixels.

**Singapore moves the other way.** Everywhere else water cooled the city; in
tropical water it warmed it. The bias changes sign with climate, so it distorts
a latitude gradient rather than merely offsetting it — which is why it could not
be left in and corrected for later.

Bit 2 (cirrus) was added in the same line, per-pixel, which is a finer and
earlier version of what `clean_frames.py` does a whole frame at a time. Bit 5
(snow) is deliberately NOT masked: snow is the real surface of a winter city.

### What re-extraction changed

| | old | new |
|---|---|---|
| North plateau | 36.4 °C | **38.3 °C** |
| South plateau | 32.7 °C | **34.7 °C** |
| North slope /10° | −5.69 | −5.83 |
| South slope /10° | −8.35 | −8.05 |
| North R² | 0.826 | 0.789 |
| South R² | 0.819 | 0.793 |

**A prediction that half failed.** Removing cool coastal water should steepen
the poleward decline. North did; south went flatter. The reasoning was too
simple and is recorded as wrong rather than quietly dropped.

**R² fell in both, and that is not a regression.** Water is thermally uniform,
so averaging it in made cities resemble one another; the old fits were partly
fitting ocean. What is left is real variance between real cities.

### Casualties

- **Yakutsk lost entirely** — 6 scenes, all summer, none survived the stricter
  mask. 135 → 134 cities. It was the largest northern residual.
- **Polokwane removed from `cities.py`** — returned NO USABLE SCENES across the
  whole period, so it never produced a file and silently made the defined count
  (136) disagree with the extracted count (135).
- **Dar es Salaam is down to 2 scenes.** A "mean across a year" from two
  acquisitions is not one. Still shipping; flag or drop it.

### Libreville was in the wrong hemisphere

`0.42°N`, filed in `SOUTH` with the note *"just north, kept for continuity"* —
deliberate, and sound when this was a single Europe-Africa corridor that needed
every southern city it could reach. That corridor was abandoned; the reason went
with it. It matters more than one city should, because the hemispheres are fitted
separately, so a misfiled city is fitted against the wrong population.

Note that `summary.hemisphere` is baked in at extraction time, so editing
`cities.py` is not enough — the city has to be re-extracted.

### The panels described the fit, not the world

They said *"letting the fit bend once lifts R² from 0.78 to 0.83"* — a fact about
modelling, to a reader who came to find out what latitude does to temperature.
Worse, *"flat at about 36°C to 20°"* reads as "the tropics are all 36°C". They
are not: the cities inside the flat part span **21 °C**. The finding is that
across the tropics latitude explains **none** of a very large spread.

Each panel now gives, in order: what the gradient does, how well latitude alone
places a city (**±4.6 °C** north, 64% within 3 °C), and which cities it fails on
— La Paz sits 9 °C below its latitude because it is 3,600 m up. All derived, so
the prose cannot drift from the chart.

`R² line` left the stat row for **typical error ±°C**. Whether a hinge beat a
straight line is a modelling question and belongs in the split note, where it is.

### Two claims on that tab were false

**"Fitted separately because the hemispheres are in opposite seasons."** Measured:
both hemispheres average **42% warm-season scenes across ten of twelve months**,
which is what an evenly sampled year looks like. Each mean spans a full year;
the calendar averages out. The honest reason to split is that they are different
populations — the south is far more ocean and runs out of land at 53° where the
north reaches 70°.

**The bias that does not average out is cloud.** Landsat needs daylight and a gap
in the cloud, so high-latitude cities yield far fewer usable winter scenes:
**60% warm-season beyond 55° against 34% within 15° of the equator**,
r = 0.55 against latitude. That lifts the cold end and flattens the slope, so the
quoted decline is a **lower bound**. Recorded in the panel rather than buried,
because it points one way.

`repair_lst.py` now writes a `warm` field per city so the page derives this
instead of asserting it.

### Also on that tab

- **Axis titles.** Both axes were labelled in degrees — `0°–70°` across, `5°–48°`
  up — with nothing saying one was latitude and the other Celsius.
- **The equations are now equations.** `T = 36.4°C up to 20°, then −0.569°C per
  degree` describes the curve; you cannot put a latitude in and get a temperature
  out. Now `T = 38.3 − 0.583 · max(φ − 20, 0)`, with `φ` defined once as unsigned
  degrees from the equator — without which a reader could try φ = −53 for Punta
  Arenas. Verified by substitution: Tromsø 69.65° → 8.1 °C against 7.56 observed.

### Pipeline

`extract_lst.py`, `repair_lst.py` and `clean_frames.py` all honour `LST_OUT`, so
the whole chain runs into a staging directory and only a finished, repaired set
is swapped into `public/`. The old water-included set was kept aside for
comparison before the swap.

## 30. Three papers read, and the numbers that did not survive it (2026-08-20)

The soundscape review was published; the other two research tiles were restructured
to match. Every tile is now **abstract + metrics, no figures** — only the GIS one
keeps its dashboard.

### The soundscape paper is published, and the site had it wrong three ways

*Discover Cities* (Springer Nature) 2026, 3:123, Open Access CC BY-NC-ND,
DOI `10.1007/s44327-026-00314-z`. Authors: Shibli Afaq, Yusuf A. Adenle,
Muhammad Aamir Basheer.

| | the site said | the paper says |
|---|---|---|
| Journal | Discovering Cities | **Discover Cities** |
| ITAP | Integrated Thermal-Acoustic-**Perceptual** | Integrated Thermo-Acoustic **Planning** |
| Status | Under Review | **Published**, June 2026 |

Crossref resolved the metadata but carries no abstract, and Springer redirects
both the article and the PDF to an IdP endpoint, so the abstract came from the
published PDF itself. PRISMA numbers verified against Fig. 1: Scopus 737 +
Semantic Scholar 250 + Elicit 24 -> **1,011 screened -> 931 excluded -> 80 sought
-> 78 assessed -> 56 excluded -> 22 included**, five themes. Those the site had
right.

### The ITS metrics were not in the manuscript

The most important find. Checked against the final manuscript
(`Final_CE584_ITS_Term_Paper_..._V0.3.docx`):

| | the site claimed | the manuscript says |
|---|---|---|
| Travel time | 20-35% reduction | **10-20%**, cited from the ATSC literature |
| Emissions | 15-25% cut | **absent from the paper entirely** |
| Budget | SAR 28-47M | **~$4.3M-$12.1M USD**, Alternative C |

The paper is explicit that its costs are "very approximate order of magnitude
estimates" from FHWA and HDR benchmarks and that KPI figures are literature
ranges, not results. The tile now says so. Overstated numbers on a portfolio
aimed at doctoral admissions are exactly what a reviewer checks.

### `galleries`, and a check that was not a check

Asked to remove the figures, the first pass reported all three tiles clean. They
were not: the GIS figures were in a **`galleries`** field, and the audit only
looked for `images`, `images2` and `videos`. Thirteen maps, 26 image references,
sitting in a field the check never named.

The fix afterwards was to audit **every** entry for every media field rather than
the three that had been asked about. **A field-by-field check is only as good as
the list of fields**, and the list has to be derived from what the renderer
actually reads — `modal.js` renders `images`, `images2`, `videos`, `galleries`,
`worked`, `diagram`, `embed` and `twin`.

The thirteen are no real loss from the page: the dashboard renders the same
thirteen layers over one terrain, which was the argument for building it.

### Structure

`modal.js` gained an `abstract` block, rendered before the metrics and styled
with a rule down the left (`.mabs`) so it reads as quoted from the source rather
than written for the page. It is kept separate from `desc` — `desc` is the pitch,
the abstract is the author's own compression — so it can be quoted exactly and,
where published, matched word for word against the version of record.

Word counts: sound 278, gis 226, its 214.

### Also

- `gis` co-author removed from the tile at the user's request. The publications
  list still carries both authors, because that entry is a citation and the
  author line is the paper's own.
- A `pub__status--published` badge, solid rather than outlined: published
  outranks the other two states and should read without being read.
- Two other entries still credit the same co-author on the Big Data / multi-city
  project. Different work, deliberately untouched.

## 31. The Lissajous path, and two cues fighting over size (2026-08-20)

The fourteen project cards were moved off the cylinder and onto a 1:2 Bowditch
curve at phase pi/2 — the cell circled in the reference table — carried into 3D
as `x = cos t`, `y = sin 2t`, `z = sin(t + phi)`. Both wheels were merged into
one path, so the section holds a single figure of fourteen cards.

### What was actually wrong

The first version looked, in the reader's words, "totally wrong", and the
measurements say so plainly. At a 1728x820 stage:

| | before | after |
|---|---|---|
| front card | 1076 px | 481 px |
| card area that is overlap | 82% | 11% |
| overlapping pairs | 40 | 7 |
| cards hanging off the viewport | 2 | 0 |

The front card was **wider than the curve's entire 1036 px horizontal span**, so
the path could not show: one card covered all of it. It was a pile, not a
figure.

The cause was two cues owning the same channel and multiplying. `LISS.big =
0.86` was read as "the front card is 0.86 of a card", but

- the card is sized `min(100%, 36vw)` — from the VIEWPORT — while the amplitudes
  are fractions of the STAGE, so their ratio drifts with the layout; and
- `.wheel__stage` carries `perspective: 1000px`, which magnifies anything at
  `+Rz`. At `rz = 0.55` that is **1.81x**.

So 691 x 0.86 x 1.81 = 1076. Perspective magnifies POSITION as well, which is
what pushed two cards off the viewport — the near part of the curve is thrown
outward by the same factor that enlarges it.

The cylinder code already knew this: there is a counter-scale in `sections.css`
that undoes exactly this magnification, and a comment noting "at r=665 and
perspective 1500 that is a 1.8x enlargement". The path branch reintroduced the
problem the ring had already solved.

### Why the earlier checks passed

Two verification passes had gone green on this exact layout — "widths are
monotonic front to back" and "no two cards share a depth". Both were true. Both
are also true of a pile: they describe the ORDERING of the cards and say
nothing about whether the cards collide or stay on screen. The metric that
mattered — overlapping area as a share of card area — was not being measured at
all, and adding it put the number at 82% immediately.

Same shape as the other instrument failures in section 23 and the CLAUDE.md
list: the code was not lying, the question was.

### The fix

**The front card is a fraction of the stage, and the perspective is divided back
out.** `LISS.front = 0.28` means the frontmost card occupies 0.28 of the stage
width on screen, at any viewport:

    const mFront = persp / (persp - Rz);
    const sBase  = (W * LISS.front) / (cardW0 * mFront);

`persp` is READ from `.wheel__stage` rather than assumed to be 1000, so a change
in the stylesheet cannot silently resize the figure. `cardW0` is the card's
laid-out width, cached by `measure()` — the same ResizeObserver that already
re-solves the ring radius.

**The ramp shrinks the far cards instead of growing the near one.** Perspective
already enlarges with depth, so a ramp that also grows forward double-counts it.
The ramp is now 1 at the front and `back = 0.32` at the rear:

    const ramp = LISS.back + (1 - LISS.back) * Math.pow(t, LISS.falloff);

That direction is worth the whole difference. Scanned across amplitude, depth
and scale, a 490 px front card costs **31% overlap when the ramp grows forward
and 10% when it shrinks backward** — and the shrinking one has the steeper
gradient, 9.1x front-to-back against 2.6x. Same front card, a third of the
collisions.

### The tradeoff is real and worth knowing

Fourteen cards on one curve cannot have a big centre card AND a legible path.
Scanned with clipping forbidden, the best achievable overlap per front size:

| front card | lowest overlap |
|---|---|
| 405 px | 1.9% |
| 445 px | 4.9% |
| **490 px (shipped)** | **10%** |
| 533 px | 15% |

Anything past ~530 px climbs steeply. If a more dominant centre card is wanted,
the price is paid in collisions, and the honest lever is `LISS.front`.

### Method note

The tuning was done against a PREDICTOR, not the browser. A ~60-line model of
`paint()` + the CSS + the perspective divide reproduced all fourteen live card
widths to within 1 px, which made a four-parameter scan over ~200k combinations
possible offline; the browser was then used only to confirm. Three rounds of
guess-and-screenshot had failed before that, which is the CLAUDE.md rule
("parameters cannot fix a wrong concept") arriving from the other direction —
the concept was wrong, and only a model that included the perspective term made
that visible.

Scale invariance was then verified rather than assumed — 0.278 / 0.279 / 0.279 /
0.278 of the stage at 1920 / 1440 / 1280 / 1024, with no clipping at any of
them. The old scheme drifted from 1076 px to a predicted 48% overlap and 22
clipped cards across the same range, because card size tracked the viewport and
amplitude tracked the stage.

### Also gone: hover-to-enlarge

Size now carries depth, so a hover that resized the card contradicted the
ordering — whichever card the pointer crossed jumped to full size wherever it
sat on the curve. Removed. Clicking and focus are unchanged.

### One asymmetry that had to be added

With `z = sin t` the depth axis is symmetric about `t = pi/2`, and the
arc-length spacing shares that axis, so the cards paired up: depths came out
0.99, 0.99, 0.91, 0.91, ... — seven pairs, two cards permanently sharing the
front at identical size. With size carrying depth that is the cue failing, not a
near miss. `PHI_Z = 0.42` phases z alone, which moves the symmetry off the one
the card set has. It stays a genuine Lissajous (x:z is 1:1 with a phase, x:y is
still 1:2) and the head-on drawing is unchanged, because the front projection
never involved z.

### Still open

- Cards travel across the "PROJECTS" hub label. That label is sized to 0.94 of
  the column, which was chosen when there were two narrow wheels; on one
  full-width figure it is very large. Not yet decided whether the heading should
  move above the curve.
- The figure sits ~68 px below the stage centre. It comes from the phase
  asymmetry interacting with the perspective divide, it varies with rotation, so
  a static correction would make the whole figure wobble as it turns. Left as
  is.

---

## 32. NEXT SESSION: three tasks, in priority order (2026-08-20)

Written as a handoff. Everything needed to act is below, so a fresh session
should not need to re-derive any of it. State at handoff: build passes, no
console errors, 134 cities in `lst-twin`, cards still open correctly after the
Lissajous rewrite (the old hit-test regression did **not** come back).

### TASK 1 (priority). The site contradicts itself on its central claim

`src/data/projects.js` lines 158, 161, 162, 168 present the Multi-City card as:

- `r = −0.995`, `R² = 0.990`
- "Latitude explains 99% of temp"
- "Every 10° northward = 9.1°C colder"
- figure caption `T = −0.911φ + 56.0`

**Those are computed from three cities.** Dammam, Dublin, Reykjavik. With n = 3
a correlation of −0.995 is not evidence of anything, because almost any three
points fall near a line. The 25,905 figure is measurements, not independent
observations, and it does nothing for the degrees of freedom.

`lst-twin`, on the same site, measures the same physical relationship across
**134 cities** and finds:

| | Multi-City card (n = 3) | lst-twin (n = 134) |
|---|---|---|
| R² | 0.990 | 0.688 pooled |
| gradient | 9.1 °C per 10° | 5.8 °C per 10° north, past 20° |
| tropics | implied linear throughout | **no gradient at all** across the first 20° |

A reader who opens both sees the conflict, and on a portfolio aimed at PhD
applications that reads as overclaiming rather than as strength. The 134-city
result is the better piece of work and the weaker number sitting beside it is
what undercuts it.

**Fix:** reframe the Multi-City card as what it honestly is, a three-city
teaching demonstration of a GPU hexbin pipeline, and delete the "99%" headline
and the 9.1 °C per 10° claim. Point the statistical claim at `lst-twin` instead.
Do not simply delete the card; the Kepler.gl work is worth showing, it is only
the inference that overreaches.

### TASK 2. Cards ride across the giant PROJECTS label

Already logged under §31 "Still open", raised again on review because it is the
first thing the eye hits. The hub label is sized for the old layout of two
narrow wheels and is now very large on one full-width figure, so cards travel
straight over the letterforms and both compete.

- `src/styles/sections.css:2202` `.wheels .wheel__title`, and `:2302`
  `.wheels--h .wheel__title { font-size: clamp(2.6rem, 8vw, 6.5rem) }`
- Undecided in §31: whether the heading should move above the curve instead of
  sitting behind it. Moving it is probably right now that there is one figure.
- Also open from §31: the figure sits about 68 px below stage centre. That comes
  from the phase asymmetry meeting the perspective divide and it varies with
  rotation, so a static correction would make the figure wobble. Leave it.

### TASK 3. Connecting dashes, still in the front-page prose

The "no connecting dashes between sentences" instruction only ever reached the
dashboard copy, and has since regressed there too (`src/lst-twin.js` currently
has 19).

**Front page copy is authored in `docs/site-copy.md`**, then pushed into
`index.html`:

```bash
node tools/sync-site-copy.mjs            # dry run
node tools/sync-site-copy.mjs --write    # apply
```

31 instances on the rendered page. Lines to fix in `docs/site-copy.md`: 38, 73,
84, 87, 90, 101, 107, 113, 125, 134, 205, 397, 459.

**Do not blind-replace.** Three different constructs share the character and
only the first is in scope:

1. *Sentence connector*, in scope. "This is Olaya, Riyadh — surface temperature
   on a summer afternoon."
2. *Parenthetical pair*, judgment call. Line 107 "Everything I've built — the
   satellite pipelines, the GIS vulnerability frameworks, the IoT dashboards —
   is oriented toward one goal". Commas or parentheses, not a straight deletion.
3. *Title separator*, arguably fine to keep. Line 113, 459, and the card titles
   in `src/data/projects.js:49, 63, 86, 151, 157, 184`.

**Must not be touched:** line 154 uses a minus sign in `−3.7 °C`, and lines 208
and 214 use en dashes for number ranges (`2005–2025`, `20–35%`, `SAR 28–47M`).
Those are correct typography, not connectors.

### Not selected this round

Committing was offered and not chosen as a task, so it was done rather than
deferred: the ~600 uncommitted lines of Lissajous wheel work are now committed
and pushed, because a handoff that leaves work only on one disk is the actual
risk. Nothing was rewritten to do it.

---

## 33. The three-city statistic, removed from four places (2026-08-21)

Task 1 of the section 32 handoff. The Multi-City card presented `r = -0.995`,
`R2 = 0.990`, "Latitude explains 99% of temp" and "every 10 degrees northward =
9.1 C colder" as findings. All of it is computed from **three cities**, and any
three points fall near a line, so the number measures the sample rather than the
world.

### It was in more places than the handoff recorded

Section 32 named `src/data/projects.js` lines 158, 161, 162 and 168. Grepping for
the figures found the same claim in three further files, and leaving any of them
would have left the contradiction on the page:

| file | what it said |
|---|---|
| `src/data/projects.js` | desc, two metric tiles, the scatter caption |
| `src/modules/projectatlas.js` | the globe pin note, and the module header comment |
| `src/modules/thermal.js` | Reykjavik caption: "Latitude alone explains 99% of the variance" |
| `docs/site-copy.md` + `index.html` | front page: "Every 10 degrees northward, 9.1 C colder" |

### The replacement numbers were measured, not copied

Fitted directly from `public/assets/data/lst/index.json` rather than trusting the
handoff:

| fit | n | R2 | per 10 degrees |
|---|---|---|---|
| pooled, abs(lat) vs mean | 134 | **0.688** | -4.2 C |
| north, poleward of 20 | 55 | 0.727 | -5.7 C |
| north, tropics 0 to 20 | 23 | **0.148** | +3.4 C |
| south, poleward of 24 | 27 | 0.847 | -7.9 C |

The tropical fit is the one that kills the old claim: R2 0.148 with a slightly
**positive** slope. There is no gradient there at all, so a single straight line
through three cities was never describing the physics.

The card keeps the Kepler.gl clips and is now framed as what it is, a GPU hexbin
pipeline demonstration on three cities, and it points at the Landsat dashboard
for the statistics. The scatter caption still quotes `r = -0.995` but now states
`n = 3` beside it, which is more honest than hiding a number the figure visibly
shows.

### 135 cities that were never there

The `twin` block claimed 135 cities in three places. `index.json` holds 134. The
comment directly above it already said to read the count off that file rather
than trust the comment, which is exactly the check that had not been run.
`src/lst-twin.js` had the same rot in its header, at 82. Both now say 134.

### The copy pipeline refused to write, and it was right

`tools/sync-site-copy.mjs` blocked on seven `projects.60` to `projects.66` keys
present in `docs/site-copy.md` but absent from `index.html`. They anchor a card
whose markup was later rewritten without anchors, so they were orphaned.

Clearing them exposed something worse. With the block lifted, the dry run also
wanted to change `publications.1` and `publications.3`, and those were not
whitespace: `docs/site-copy.md` still held the **pre-publication** text, so
`--write` reverted a paper that is published with a DOI back to "Under Review".
It was caught only by reading `git diff` after applying, which is the CLAUDE.md
rule about checking the diff earning its place a second time.

**So `docs/site-copy.md` is not automatically the newer copy.** `index.html` gets
hand-edited too, and nothing reconciles them. Before `--write`, check that every
line the dry run wants to change is a line you actually changed. The stale blocks
here were refreshed by running `--export` into a scratch copy and splicing the
two entries back.

---

## 34. Fourteen cards, and the one lever the scan could not see (2026-08-21)

Tasks 2 and 3. Measured first, at 1440x900, stage 1296x792, card 518x360,
perspective 1000.

### The overlap was never the problem

Section 31 shipped this on an overlap budget and the number holds up: **3.0%
overlap, 6 overlapping pairs, 0 cards clipped.** Better than the 10% section 31
recorded, because that was measured on a wider 1728px stage.

What is wrong is legibility, and it is a different quantity. A card is scaled by
`--liss-s` and then magnified by the stage perspective, so the title a reader
actually sees is the card's own font size times `rendered width / 518`. Measured
across the fourteen:

    14.4  13.4  10.5  9.3  6.5  6.1  3.8  3.4  2.7  2.6  2.2  2.1  2.0  1.9  pt

Ten of fourteen sat below 7pt. The rearmost card was 42px wide carrying a 1.3pt
title, which is not small text, it is noise arranged in the shape of a word.

**An instrument note.** The first pass at this multiplied the font size by
`--liss-s` and reported a 6.1pt front card. That is wrong: `--liss-s` is the
pre-perspective scale and the front card is magnified 1.9x on top of it. The
right measure is `getBoundingClientRect().width / offsetWidth`. Same failure mode
as the font probe in section 23, one term short of the real transform.

### The scan said geometry could not fix it

A model of `paint()` plus `lissFit()` plus the perspective divide reproduced all
fourteen live card widths to within **0.63px**, so it could be scanned offline.
Over amplitude, depth, scale, falloff and card count, with clipping forbidden and
overlap capped at 12%, the best any configuration reaches is **five** readable
titles out of fourteen, and buying that fifth one costs five times the overlap
and flattens the very size ramp that carries depth. Even at the most generous
setting that still fits the stage, the rearmost title renders at 2.4pt.

So yes, fourteen cards on one curve is too many **for readable content**. It is a
perfectly good number for a path.

### The lever the scan could not see is the card's own type

The scan only ever moved geometry, and geometry is the expensive lever:

| lever | front title | overlap |
|---|---|---|
| shipped | 11.1pt | 1.8% |
| `front` 0.28 to 0.36 | 14.3pt | **12.3%** |
| card font size 16.56 to 21.6px | **14.4pt** | **1.8%** |

The card is scaled as a unit, so its type scales with it and the geometry never
hears about it. Same legibility, none of the collisions. `LISS.front` therefore
did not move at all, and the fix lives in the stylesheet.

### What actually changed

- `fillX` 0.99 to **0.94**, `fillY` 0.92 to **0.88**. At 0.99 the envelope is
  fitted to 99% of the stage by construction, so cards graze the edge: closest
  approach across a full rotation was **7px**. Now 39px. That was the "several
  cards sit tight against the top-left stage edge" report.
- `back` 0.32 to **0.40**. The rearmost card goes 41px to 52px.
- Card title `clamp(.95rem, 1.15vw, 1.12rem)` to `clamp(1.15rem, 1.5vw, 1.45rem)`.
- **`is-plate`** below `--depth` 0.55: the card drops its body and keeps its
  image. Fading `.pcard__body` takes the dark scrim with it, because the scrim is
  a gradient on the body rather than a separate element, so a plate ends up as
  the bare photograph. This is the honest answer to "should the back fade rather
  than shrink": neither on its own, because no size rescues 2pt text. It stops
  carrying text instead, and that costs no geometry.
- **`is-front`**: a hairline accent frame on the frontmost card. Section 31
  removed hover-to-enlarge because size already carries depth, and left nothing
  in its place, so the layout never said which card was clickable. The cue cannot
  be size, for the same reason the hover went.
- The click target now matches the readable set. It was `t > 0.34`, eight cards
  clickable against three legible. A click target you cannot read is a blind
  click.

Verified over 24 rotation states: the card marked `is-front` and the card
`frontCard()` derives from projected area are the same card every time, with 0
disagreements, so the mark and the click cannot drift apart.

| | before | after |
|---|---|---|
| front title | 11.5pt | **15.1pt** |
| titles at or above 8pt | 3 | **4** |
| rearmost card | 42px | 52px |
| overlap | 3.0% | 3.7% |
| clipped | 0 | 0 |
| closest edge approach | 7px | 39px |
| front card marked | none | 1 |

### The heading: moved, then moved back

Task 3 was the giant PROJECTS label with cards riding across it. The handoff
pointed at `sections.css` `clamp(2.6rem, 8vw, 6.5rem)`, but that clamp is only a
fallback. The real size is solved in `fitLabel()` and published as `--hub-size`:
measured **241.42px**, the label **1218px wide**, which is `HUB_FILL = 0.94` of a
1296px stage. Editing the clamp alone does nothing.

The label was moved above the stage, and it measured clean, with cards-over-label
going to zero. Rejected on sight: the label in the middle with the cards crossing
it is the effect the section is for. It is back on the axis at 241.42px,
unchanged. Small caps were tried as a middle path and also rejected.

Worth knowing that the section already carries its own `<h2>` above the wheel, so
the hub label is a second heading. That was the argument for moving it, and it
did not survive contact with how it looks.

### Two real bugs found while doing it

**`getComputedStyle().font` can be empty, and it fails silently.** While small
caps were briefly on the label, `fitLabel()`'s probe inherited no font at all,
measured the label at the browser default 16px, and the solver answered with a
**2500px** hub, one letterform taller than the viewport. The shorthand serialises
to `""` whenever a font property outside it has a non-initial value, and
`font-feature-settings` is outside it. The probe now copies the longhands one at
a time, and any fit taller than the stage is clamped, because a hub taller than
the stage is a broken measurement rather than a bold choice. This is the second
time this one property has caused a bug here; section 23 is the first.

**The wheel was claiming a fraction of its own figure.** `overRing()` decides
whether a scroll turns the ring or scrolls the page, and it derived the band from
one card's box: correct on a cylinder, where every card sits in the same place.
On the path it described a narrow moving strip. Measured, it claimed a band
**208px** wide against a figure **1190px** wide, covering **14.3%** of it, so most
of the figure fell through to the page. It also picked the first card in DOM
order rather than the front one, via `cards.find(aria-hidden === 'false')`, so the
strip did not even track the card it was named after. It now uses the union of
all card boxes and covers 100%.

---

## 35. Connecting dashes, by construct rather than by character (2026-08-21)

Task 4. The character appears in constructs that are not the same thing, so the
work was classification rather than replacement.

**Front page, 11 changed.** Full stop where the dash joined two independent
clauses (`hero.desc`, `future.lead`, `direction.p1`, `contact.ok`); colon where it
introduced a gloss on the noun before it (`about.p1`, "This is Olaya, Riyadh:
surface temperature on a summer afternoon"); comma where it introduced a trailing
clause or participial phrase (`about.pull`, `about.p2`, `direction.c2s`,
`direction.c3s`, `pubs.lead`).

**The parenthetical pair took parentheses, not commas.** `direction.p2` reads
"Everything I've built, the satellite pipelines, the GIS vulnerability
frameworks, the IoT dashboards, is oriented toward one goal" if commas are used,
which is five commas in a row and a lost subject. The interruption is itself a
comma-separated list of three, so only parentheses keep the spine readable.

**Kept, deliberately.** Title separators: `direction.c1t`, the B.Arch degree line,
the four wheel card titles, and the `projects.js` titles. Also the
`01 / 14 - scroll to travel` chrome, which is a label separator rather than a
sentence connector and sits outside the copy tool's anchors.

**Untouched, as instructed.** The minus sign in `-3.7 C`, and the en dashes in
`2005-2025`, `$4.3-12.1M` and `10-20%`. Also `green-blue infrastructure`, which is
a compound en dash and correct.

**`src/lst-twin.js`: 19 found, 4 changed.** Fourteen of the nineteen are in code
comments, which are not site copy, and the file's house style uses them
throughout. Only five reach the page, and one of those is the document title, a
separator. The four real connectors were fixed. Zero rendered em dashes remain
outside the title.

One further connector was fixed that no list named: the `publications.1` abstract
gained "public space - but the benefit narrows" when that block was refreshed
from `index.html` during section 33.

### Method note that generalises

The task list gave line numbers against commit 196935d. Section 33 had already
inserted and deleted lines in the same file, so those numbers had moved before
the work started. Everything here was located by **content and by construct**,
then cross-checked against the named lines. All 13 named lines were confirmed to
contain a dash, and the three protected ones were confirmed to be the minus sign
and two ranges. Three further occurrences turned out to be the markdown file's
own scaffolding, its preamble bullets and its section headings, which are not
page copy.

---

## 36. The word gets crossed, and a merge that had been opening two projects (2026-08-21)

Follow-on to section 34, driven by looking at it rather than by measuring it.

### Every click was opening two projects

The real bug of the session, and it had been shipped. `modal.js` and `book.js`
each end their click handler with the same geometric fallback, because a real
click on a card resolves its target to the ancestor `.wheel` rather than to the
card:

    if (wheel) el = frontCard(wheel, '[data-modal]');   // modal.js
    if (wheel) t  = frontCard(wheel, '[data-book]');    // book.js

That asks "of the cards I care about, which is furthest forward". It was safe
while there were two wheels: the research wheel held no `[data-book]` and the
architecture wheel held no `[data-modal]`, so one of the two handlers always came
up empty. **Section 31 merged both wheels into one figure of fourteen**, seven of
each, and from that moment both selectors always matched something. Every click
ran both fallbacks and opened a research modal *and* an architecture book.

Fixed by resolving the front card across **all** cards and then testing what it
is, so exactly one handler can act:

    const front = frontCard(wheel, '.wheel__card');
    el = front && front.hasAttribute('data-modal') ? front : null;

Verified both ways from a clean state: with a `data-modal` card frontmost only
the modal opens, with a `data-book` card frontmost only the book opens, one
dialog each time.

A note on testing this: the first attempt reported two dialogs open and it was
wrong. A modal left over from the previous probe was still open, because the
synthetic Escape had not closed it. The check has to read the before state as
well as the after state, or it measures the residue of the last test.

### Where the label sits in depth is a plane, and z-index is NOT how you set it

Section 34 put the label at `z-index: 150`, the value a card reaches at
`--depth 0.5`, and reasoned that a stacking index on a sibling would decide
paint order. It does not. **Inside a preserve-3d subtree the browser sorts by 3D
position and ignores z-index between transformed siblings.**

This cost three rounds before it was caught, because the numbers looked like they
were working: the index was taken 150 -> 190 -> 196, and each time the rendering
appeared slightly different. It was not. The wheel had simply turned to a
different phase between screenshots, and the correlation between a card's
z-index and its depth made the readings look consistent. The reader said twice
that nothing had changed, and the reader was right.

The test that settled it: force the label to `z-index: 99999` and screenshot.
Nothing moved by a pixel. One deliberate extreme beat three plausible
increments, which is the general lesson. If a lever is doing nothing, push it
to an absurd value before tuning it again.

**The lever that works is translateZ.** The label is now parked at 0.95 of Rz,
nearly the front of the cards range, so only the tile actually arriving at the
centre comes through: it surfaces from under the type, is largest crossing it,
and drops behind immediately after. Measured: 1 card in front of the word and it
is the marked front card, 4 of 4 right-hand cards behind.

Rz is solved per viewport in `lissFit()`, so it cannot be written into the
stylesheet. `paint()` publishes it as `--liss-rz` and `--liss-rz-num`.

**The counter-scale is not optional.** Moving the label forward puts it under the
stage perspective, which magnifies it by P/(P - z); undoing that with (P - z)/P
keeps the rendered size exactly what `fitLabel()` solved for. Verified: the title
renders 1218px wide at 241.42px both before and after, so the depth is tunable
without the type resizing. Same trick, opposite sign, as the cylinder rule.

### PHI_Z, and both things it controls

`PHI_Z` sets the depth lean at the ends of the figure, `sin(phi)`, which is what
makes cards pass behind the word on one side and in front on the other. It also
puts the size peak at `(sin phi, sin 2phi)` from the centre crossing, so the same
constant decides how far the largest card sits from the middle of the
composition. The two pull opposite ways:

| phi | peak off centre | phases with a near-tie at the front |
|---|---|---|
| 0.00 | 0.000 | 64.7% |
| **0.20 (now)** | **0.437** | **56.4%** |
| 0.42 (was) | 0.849 | 31.9% |

0.42 was chosen in section 31 when a near-tie meant there was no way to tell
which card was frontmost. That is no longer true: `.is-front` marks it outright
and the click target follows the same card, so a tie now costs a little size
ambiguity rather than the cue failing. A 0.02 depth tie is about a 6% size
difference, and one of the two wears an accent frame. Measured after the change:
overlap 5.1% against a 10% budget, 0 clipped, 50px edge clearance, largest card
46px right and 49px below the figure centre.

### Also

The hub label measures 241.42px and is centred on the stage to the pixel, offset
(0, 0), with the figure's own centre 3px away. `HUB_FILL` was briefly taken to
0.7787 for a 200px label and reverted.

`01 / 14 — scroll to travel` removed, along with its now-orphaned `projects.67`
copy key, so `sync-site-copy.mjs` stays clean.

A margin of `clamp(1.75rem, 5vh, 4rem)` now separates the lead question from the
figure. The cards reach within about 40px of the stage edge, so without it the
question ran straight into the top of the curve.

### The sign of PHI_Z is the shape of the figure, not a knob (2026-08-21)

Tried and reverted in one round. The request was that tiles crossing the R and
the O should ride OVER the word while the right-hand side stays behind it, and
the sign of `PHI_Z` is exactly the control for which half of the flow comes
forward: at +0.20 the size peak sits at x = +0.199, right of centre; at -0.20 it
mirrors to x = -0.199, left of centre.

It did what it was supposed to. Measured over 20 phases at -0.20, the cards
crossing in front ran from x = -314 to +158 with a mean of -73, so the near half
had genuinely moved left. But the same constant tilts the curve in depth, and
the reader judged both the right-hand side and the path itself worse for it.
Reverted to +0.20.

**The constraint, stated plainly, so it is not rediscovered:** with the label as
a flat plane, "near on the left AND far on the right" is the sign of `PHI_Z`, and
that sign is the tilt of the figure. There is no setting that puts the near half
on the left while leaving the curve as it renders at +0.20. Two levers exist and
they do different jobs:

- `PHI_Z` sign: which side comes forward. Changes the curve.
- `--liss-label-z`: how much of the flow crosses in front at all. Changes nothing
  about the curve. Measured sweep, at -0.20, in-front cards per phase and their
  x range: 0.90 -> 2.29 cards, -401..269; 0.95 -> 1.67, -314..158; 0.985 -> 0.83,
  -229..50; 0.992 -> 0.54, -140..-4.

So the plane can decide *how many* tiles cross the word, but only the sign can
decide *which side* they cross on, and the sign is not free.

---

## 37. The eight could not do what was being asked, and the check came far too late (2026-08-21)

The section is meant to read as a channel: tiles sweep forward across one
diagonal and return behind the hub label along the other. Green forward, blue
behind, in the reader's own annotation.

### The reachability check that should have come first

Six rounds went into tuning constants toward that: the label plane at 0.72, 0.95,
1.02; `PHI_Z` at 0.42, 0.20, then negated to -0.20 and reverted. Each round the
reader said it was wrong, and each time the response was another constant.

The target was not in the parameter space at all.

On a 1:2 Bowditch curve, `y = sin(2t)`, so `y(t + pi) = y(t)`. The near and far
extremes of `z = sin(t + phi)` are exactly pi apart in t. Therefore **the nearest
point and the farthest point are forced to the same height, for every value of
phi.** Measured vertical separation: 0.000. Forward-above and behind-below is not
a tuning problem on that curve, it is unreachable.

| ratio | forward point | behind point | vertical gap |
|---|---|---|---|
| 1:2, the eight | y = 0.39 | y = 0.39 | **0.000** |
| 1:1, an ellipse | y = -0.59 | y = 0.59 | **1.96** |
| 1:3 | y = -0.83 | y = 0.83 | 1.65 |

**The lesson, and it generalises past this component.** When a reader rejects
three successive settings of the same constant, the next move is not a fourth
setting. It is to ask whether the thing being asked for is reachable at all.
That check took one short script and it invalidated every round that preceded it.
It is the same failure as CONTEXT 31's "widths are monotonic" pass and section
34's z-index: the instrument was fine, the question was wrong.

### What changed

`FREQ_Y` is now 1, so the figure is an ellipse rather than a figure-eight, and
`PHI_Z = -2.2` puts the nearest point at (-0.81, -0.59), upper left, and the
farthest at (+0.81, +0.59), lower right. Screen y grows downward, so negative y
is up. `--liss-label-z` is 0, the midpoint of the depth range, which splits the
loop exactly in half: the near semicircle crosses in front of the word, the far
one passes behind it.

It measures better than what it replaced, which was not the reason for the
change but is worth recording:

| | eight | ellipse |
|---|---|---|
| overlap | 5.1% | **1.3%** |
| overlapping pairs | 7 | **3** |
| cards clipped | 0 | 0 |
| in front / behind | 1 / 13 | **7 / 7** |
| titles at or above 8pt | 4 | 4 |
| front card title | 15.1pt | 15.0pt |

### What was given up

The figure-eight came off the Bowditch reference table in CONTEXT 31 and was the
section's identity, including a genuine crossing point in the middle where the
two lobes met in depth. An ellipse has no crossing. That cost was put to the
reader explicitly before the change and accepted.

`FREQ_Y` is a named constant precisely so this is one edit to reverse. Setting it
back to 2 restores the eight, and everything downstream re-solves from the shape,
because the arc-length table and the envelope fit both read the curve rather than
assuming it.

### Also settled in this stretch

- `01 / 14 - scroll to travel` removed, with its orphaned `projects.67` copy key.
- A `clamp(1.75rem, 5vh, 4rem)` margin now separates the lead question from the
  figure; the cards reach within about 40px of the stage edge, so without it the
  question ran into the top of the curve.
- The hub label stays at 241.42px, centred on the stage to the pixel. `HUB_FILL`
  was taken to 0.7787 for a 200px label and reverted.

### REVERSED: the ellipse was rejected on sight, the eight is back (2026-08-21)

Everything above about WHY the eight cannot stack its halves vertically still
stands and is still worth knowing. The conclusion drawn from it does not: the
ellipse was built, measured better than the eight on every collision metric, and
was rejected immediately. The eight is the shape the section is meant to have,
and that outranks the measurements.

Current state: `FREQ_Y = 2`, `PHI_Z = 0.20`, `--liss-label-z: 0`.

The label plane at 0 is the part worth keeping from the whole exercise. It sits
at the midpoint of the cards' depth range, so the loop splits **7 cards in front
of the word and 7 behind it** — a real front-and-back effect on the eight, which
is what was being asked for all along. What it does not do, and cannot, is put
the front half above and the back half below; on a 1:2 curve those halves
interleave across the figure.

| | eight at plane 0 (now) | ellipse (rejected) |
|---|---|---|
| overlap | 5.1% | 1.3% |
| overlapping pairs | 7 | 3 |
| clipped | 0 | 0 |
| in front / behind | **7 / 7** | 7 / 7 |
| front card title | 15.1pt | 15.0pt |

**The process lesson is the expensive one, and it is not about geometry.** Six
rounds went into tuning constants toward an unreachable target, then a seventh
into changing the curve to reach it, and the answer was that the reader wanted
the original shape. The reachability check was worth doing and came far too late;
but it should have been followed by asking which of the two constraints to drop,
not by assuming the newer one won. When a request and an existing design conflict,
the question is which gives way, and that is the reader's call rather than a thing
to infer from measurements.

### Confining the in-front set to one side: how close it gets (2026-08-21)

Asked for: the left of the flow entirely behind the word, the right side's
behaviour preserved exactly. Both levers were scanned before touching anything.

**It is not fully reachable with a flat label.** The in-front set is whatever
clears the label plane, and a plane cuts by DEPTH, which does not separate left
from right. The set is always a band centred on the depth peak, and the peak sits
at x = sin(PHI_Z), only slightly right of centre. Raising the plane thins the
band from both ends; raising PHI_Z slides the peak right but re-tilts the whole
curve, so the right side changes too.

Scanned over 240 phases, left-in-front vs right-in-front events:

| PHI_Z | plane 0.85 | plane 0.95 |
|---|---|---|
| 0.20 | 302 / 340 | 146 / 256 |
| 0.42 | 228 / 330 | **56 / 264** |
| 0.55 | 172 / 338 | 4 / 258 |

Nothing reaches zero on the left. 0.55 gets closest but throws the size peak
1.03 from the centre, which contradicts the earlier ask that the largest tile sit
near the middle.

Shipped `PHI_Z = 0.42` (CONTEXT 31's original value) with the plane at 0.95, and
verified in BOTH scroll directions, which matter because the flywheel is
symmetric and a one-direction check would miss an asymmetry:

| | scrolling down | scrolling up |
|---|---|---|
| left in front | 7 / 30 phases | 6 / 30 phases |
| right in front | 34 / 30 phases | 31 / 30 phases |

Per phase that is 0.22 left against 1.08 right. Against the previous setting
(PHI_Z 0.20, plane 0) at 3.33 left and 3.67 right, the left drops 93% and the
right drops 71%. So the left is very nearly clear, but the right is NOT preserved
untouched, and no setting delivers both. Tilting the label with rotateY is the
only thing that would separate the sides geometrically, and it needs about 23
degrees, which magnifies the word's left end nearly 2x against its right end.
Rejected as a visible distortion of the type rather than a depth change.

### The leading tile flicking behind the word, and why sampling missed it (2026-08-21)

Reported as: the tile arriving at the centre drops behind PROJECTS for a
microsecond. It was real, and two rounds of measurement failed to see it.

**Why the first checks came back clean.** They drove the wheel with synthetic
`WheelEvent`s and read the DOM once per step, which samples the phase in jumps
and skips the frames in between. An analytic sweep also came back clean: with
`PHI_Z = 0.42` the leading card's depth bottoms at 0.9723 of Rz against a fixed
plane at 0.95, so it is never *actually* behind. Both instruments agreed and both
were answering the wrong question.

**What was really happening.** The margin, not the sign. Measured at a 1049px
stage the leading card cleared the plane by as little as **10px out of 457**,
about 2%. `--lz` is written to one decimal and the plane comes out of a `calc()`,
so at that separation subpixel rounding decides the 3D sort, and at the handover
from one leading card to the next it can flip for a frame. A "never behind"
result and a visible flicker are both true when the margin is that thin.

**The fix.** The plane stopped being a constant. `paint()` tracks the deepest
card while it is already walking them and publishes

    --liss-plane = min(0.95, maxLz / Rz - 0.05)

so 0.95 is now a ceiling and the plane is held a clear 5% of Rz behind whatever
card is leading. The label's counter-scale is computed from the same variable and
cancels the perspective exactly, so the type does not change size as the plane
moves: measured 1218px wide at every frame.

Verified per-frame rather than per-step, over a real eased scroll in both
directions:

| | before | after |
|---|---|---|
| frames with the leading tile behind | flickering | **0 of 2202** |
| smallest depth margin | 10px | **23-24px** |
| plane fraction | fixed 0.95 | tracks 0.923 to 0.95 |
| cards in front, left / right per frame | 0.22 / 1.08 | 0.27 / 1.15 |

The last row is the check that everything else still behaves as it did; the plane
dipping slightly lets marginally more cards through, and that is the whole cost.

**The lesson is about the instrument again, and it is a new failure mode.** Both
earlier checks were correct and neither could see a one-frame event, because both
sampled state per interaction rather than per frame. Anything described as a
flicker has to be measured with `requestAnimationFrame` against a real eased
input. And "never crosses the threshold" is not the same claim as "cannot flip":
when the margin approaches the precision the values are written at, the ordering
is decided by rounding.

### The incoming tile, and why clamping to the LEADING card was not enough (2026-08-21)

The clamp above guarantees the deepest card is in front of the word. The report
that followed was precise and pointed at what that misses: "just after this frame
it comes forward, it is never always forward while its incoming".

The deepest card and the tile the eye calls "the centre one" were not the same
card. The depth peak sits at `x = sin(PHI_Z)`, and at 0.42 that is 0.408 of the
half-width, well right of centre. So a tile becomes the leading card only AFTER
it has passed the middle. On the way in it is behind the plane, the clamp does
not protect it, and it pops forward once it takes the lead.

Clamping harder cannot fix this, because the clamp tracks depth and the problem
is that depth peaks in the wrong PLACE.

**PHI_Z is now 0.05**, which puts the peak essentially on the visual centre, so
the tile arriving at the middle is already the deepest one and the clamp covers
its whole approach. Not exactly 0: at 0 the depth is symmetric about the centre
and cards pair to identical z, which is coplanar and lets paint order fall back
to DOM order. 0.05 breaks the tie while moving the peak only 0.05 of the
half-width off centre.

Measured per frame over a real eased scroll, both directions:

| | before (0.42) | after (0.05) |
|---|---|---|
| frames the centre tile is behind the word | flickering | **0 of 85** |
| frames the leading tile is behind | 0 | 0 |
| smallest depth margin | 24px | 24px |
| frames the top two cards are within 6px wide | low | 12 of 85 |

That last row is the price, and it is the pairing CONTEXT 31 removed PHI_Z 0.42
to avoid: on 14% of frames the front two cards are near-identical in size. It is
affordable now only because `.is-front` marks the leading card outright and the
click target follows the same card, so a size tie no longer means the reader
cannot tell which card is live.

**This also settles an earlier request for free.** The largest tile now sits at
the centre of the flow, which was asked for several rounds back and refused then
because 0.42 put the peak 0.849 away from the middle. One constant was serving
three different requirements, and only once all three were on the table did the
value that satisfies them become obvious.

### Final tuning and the label glow (2026-08-21)

`PHI_Z` 0.05 -> **0.03**, moving the depth peak a little closer still to the
visual centre, and `PLANE_MARGIN` 0.05 -> **0.07**, widening the gap the label is
held behind the leading card.

The hub label gained a soft outer glow: two shadows, a tight halo at `.10em` and
a wide bloom at `.34em`, both amber at low opacity. Sized in `em` so they scale
with the label, which `fitLabel()` solves per viewport and can be anywhere from
about 150px to 240px. It has to out-specify `.wheels .wheel__title`, which sets
`text-shadow: none`. Kept subtle on purpose: cards now pass both in front of and
behind this word, and a heavy glow would read as a light source that the tiles in
front of it are not respecting.

Verified per frame over an eased scroll in both directions, 108 frames:

| | |
|---|---|
| frames the centre tile is behind the word | **0** |
| frames the leading tile is behind | **0** |
| smallest depth margin | **33px**, up from 24 |
| frames the top two cards are within 6px wide | 16 of 108 |
| rendered title width | 1218px, unchanged by the glow |

Accepted by the reader at this setting.

## 38. Below 900px, and a copy tool that could not tell which side moved (2026-08-21)

The section 37 handoff's four tasks. The branch was merged first, because three
commits living on one disk is a risk that outranks any of the work in them:
`wheel-depth-and-honest-stats` fast-forwarded onto `main` and was pushed, 11
files, +1118/-109. README.md was confirmed absent from the merge before it ran,
since that file is also the GitHub profile page.

### The wheel below 900px had never been looked at, and three things were wrong

`data-wheel="auto"` flips the wheel to its horizontal axis at 900px. Everything
sections 34 and 36 added was built and measured above that line.

**What survived the breakpoint unharmed**, measured at 880x860 and 390x844:
`is-front` is always exactly one card and always the same card `frontCard()`
derives from projected area; `is-plate` still drops the body on the back half;
`--liss-plane` still tracks (0.9208 to 0.9295); the hub label keeps its glow and
its solved size; `overRing()` claims 97.7% of the stage and consumes the event,
because its lissajous branch uses the union of the card boxes and never looks at
`horizontal` at all. 0 cards clipped at every width tested.

**A vertical swipe over the figure did nothing whatsoever.** The base rule is
`.wheel { touch-action: pan-x }`, which tells the browser not to pan vertically
over the section -- correct while the wheel owns vertical, which it does on the
desktop. Below 900px the wheel's own axis is horizontal and the drag handler
reads `clientX` and ignores `clientY`. So the browser refused to scroll and the
JS refused to turn. Measured on a 390x844 phone: phase moved 0, page scrolled 0.

The base rule's own comment argued that the escape route was the section's
margins. That was written when `.wheels` held two narrow wheels in a grid.
Section 31 merged them into one full-width figure, which leaves 32px of margin
on the left and 33px on the right of a 390px viewport -- so 83% of the width was
a dead band 371px tall. Fixed with `touch-action: pan-y` inside the 900px block,
the exact mirror of the axis the wheel actually uses there: the browser keeps
vertical, JS keeps horizontal, and both gestures work. Verified after the change
that a horizontal swipe still turns the wheel.

**Every title on a phone is illegible, and that one is left open.** At 390x844
the stage is 350x371, the front card renders 97px wide and its title at 4.5pt;
the smallest is 1.2pt. **0 of 14 titles reach 8pt**, against 4 of 14 on the
desktop. This is `LISS.front = 0.28` doing exactly what it is told -- 0.28 of a
350px stage is 98px -- and section 34's lever, the card's own type, cannot
rescue a 0.33 scale factor by itself.

The root of it is the stage height. `44vh` was chosen so that TWO stages plus no
gap totalled 88vh and both rings were visible at once. That arrangement stopped
existing when section 31 merged the wheels, so 44vh is now a small number with
no argument left behind it. Raising it is a visible change to how the section
reads on a phone rather than a bug fix, so it is recorded here and in the
stylesheet and left for a decision. The same cause shows up at 880x860 as
**19.5% overlap across 13 pairs**, against the 12% budget section 34 worked to.

Also removed there: `.wheels { grid-template-columns: 1fr; gap: 0 }`, which the
same block still carried for the second wheel. `.wheels` is `display: block` and
holds one section, so both declarations were inert.

### Reduced motion was showing three projects out of fourteen

The worst of the four, and it was never mobile-specific -- it was broken at every
width, for anyone with the accessibility setting on.

The fallback set the cards to `position: relative; transform: none`, which takes
them out of the 3D placement correctly, and then left them stacked in normal flow
inside a stage that is still `height: clamp(600px, 88vh, 820px)` with
`overflow: hidden`. Measured:

| | desktop 1440x900 | phone 390x844 |
|---|---|---|
| height 14 cards need | 5040px | 2940px |
| stage height | 792px | 371px |
| cards visible | **3 of 14** | **2 of 14** |

The comment promised "a plain readable grid" and there was no grid: the ring is
`display: block`, so the cards simply stacked and the stage clipped them.

The part that had been missed is that the CONTAINER has to leave the 3D framing
too, not just the cards. Three elements, not one: the stage stops clipping and
stops being a fixed height; `.wheels .wheel__scene`, which is
`position: absolute; inset: 0` and sits between the stage and the ring, has to
go back into flow or **the stage collapses to 0 height even after the ring is
fixed** -- measured exactly that on the first attempt; and the ring becomes the
grid. The head comes off the ring's axis, and the label drops its solved 241px
`--hub-size`, which is sized to be crossed by moving cards and means nothing
above a static grid.

`overRing()` also returns false under reduced motion now. Without it the wheel
still claimed the union of the card boxes -- in a grid, all of them -- and
`preventDefault()` on that band stopped the page scrolling past a section the
reader cannot turn anyway.

| after | desktop | phone |
|---|---|---|
| cards visible | **14 of 14** | **14 of 14** |
| cards clipped | 0 | 0 |
| overlapping pairs | 0 | 0 |
| grid columns | 4 | 1 |
| smallest title | 16.2pt | 13.8pt |

Verified by applying the block's exact declarations at runtime and measuring,
because `prefers-reduced-motion` cannot be emulated from inside the page.

### The retired projects module is gone

`src/modules/projects.js`, the horizontal pinned-track implementation the wheel
replaced. Confirmed unreachable before deleting rather than after: `initProjects`
appears only at its own definition, and `projectsCount`, `projectsPin` and
`projectsTrack` appear only inside that same file. No static import, no dynamic
`import()` (the lazy ones are i18n, earth, atlas, thermal, walk, valleyjourney,
worldmap and cutefantasy), and it is not a `rollupOptions.input` entry. It would
have returned at its own first line anyway, since `projectsPin` no longer exists.
Build passes without it.

### The copy tool now knows which side moved

`tools/sync-site-copy.mjs` treated `docs/site-copy.md` as authoritative and wrote
it over `index.html`. That assumption is wrong, and section 33 recorded how close
it came: `--write` wanted to change `publications.1` and `publications.3`, and
the markdown still held the pre-publication text, so applying it would have
reverted a paper published with a DOI back to "Under Review". It was caught by
reading `git diff` afterwards.

The reason it could not be caught automatically is that **a difference between
two files says nothing about which one is newer.** "The doc was edited" and "the
page was edited and the doc is stale" produce an identical diff.

One extra fact separates them: what the HTML said when the two last agreed.
`docs/.site-copy.lock.json` now stores a hash per key, written by `--export` and
refreshed after every successful `--write`, so it self-heals and is never
maintained by hand. Three cases become distinguishable:

| doc moved | html moved | verdict |
|---|---|---|
| yes | no | safe, and this is the point of the tool |
| no | yes | **STALE DOC -- writing reverts the page. Refuse.** |
| yes | yes | **CONFLICT -- refuse, reconcile by hand.** |

All three were tested against the live files by simulating each edit and
restoring afterwards; `index.html` finished byte-identical. The stale case prints
the offending keys, exits 1, and says to run `--export` if the page is the
correct side. A missing baseline refuses `--write` rather than guessing, with
`--force` as the documented override.

**The other half of that task is recorded, not done.** 28 strings of real page
copy carry no anchor and are invisible to the tool: the 14 `.pcard__title`s and
the 14 `.pcard__course` lines in the wheel. That is what orphaned `projects.60`
to `projects.66`. Anchoring them was the other option the handoff offered; the
guard was chosen because it is the half that prevents content loss, and an
unanchored string cannot be reverted by a tool that cannot see it. 158 strings
are managed, 123 are not.

### Still open

- The 44vh mobile stage, and the 4.5pt titles and 19.5% overlap that follow from
  it. That needs a decision about how the section should read on a phone, not a
  tune -- and section 37's lesson applies: ask which constraint gives way.
- Anchoring the 28 wheel-card strings, if that copy should be editable from the
  markdown document.

## 39. Telling the two collections apart (2026-08-21)

Fourteen tiles are two sets of seven — M.Sc. research, then architecture — and
nothing on the figure said which was which.

### Almost every channel was already carrying something

Size, blur, opacity and paint order all carry depth. The frame and the white
title carry `is-front`. The presence of body text carries `is-plate`. Hover was
removed in section 31 and does not exist on touch. So the cue had to survive
`is-plate` (seven of fourteen tiles show image only), stay legible at a 52px
card, survive the reduced-motion grid, and avoid amber, which is chrome here and
on all five dashboards.

The information already existed and never reached anyone: `.pcard__course` reads
"M.Sc. Thesis - KFUPM ...", but `is-plate` deletes it across the back half and
only four of the remaining titles clear 8pt. **A text cue cannot answer this.**

### The arrangement was already doing half the work

The two sets are contiguous in the markup, and `paint()` places card i at
arc-length fraction i/n, so each collection travels as one unbroken convoy.
Measured over 28 phases: the frontmost tile belongs to the dominant convoy in
**28 of 28**, and the near half of the loop averages **75% one set**. The wheel
already shows roughly one collection at a time; it simply never said so.

### What shipped

**A per-card bar on the media.** `.pcard__media::before` (`::after` is the
scrim), 1.1% of card height, crimson `#f87171` for research and azure `#38bdf8`
for architecture. On the media rather than the body, so it survives `is-plate`.
A bar rather than a frame, because `.is-front` already owns the frame and two
cues wearing the same treatment is how a cue stops meaning anything.

Height is a PERCENTAGE, not pixels: the whole card is scaled by the path, so a
3px bar would render 0.3px on the rearmost tile. First attempt at 2.4% measured
6px on the front card and was too heavy; 1.1% gives 2.7px.

**A gap at the seam, with a pip in it.** `GROUP_GAP = 0.035` of the loop per
seam, with the runs read from the markup rather than hardcoded to 7/7, so adding
a project re-solves the spacing instead of putting the gap in the wrong place.
Measured in curve space: seam gaps 324 and 323 against within-group gaps of 179
to 256, **1.52x wider, and every seam exceeds every normal gap** — matching the
1.53x the arithmetic predicts. The pips ride the curve by the same rules as the
cards, so they foreshorten and dim with depth (measured 6px and 4px at one
phase) instead of floating on top.

### The colour was chosen by measurement, and the first pair was wrong

Teal and violet were rejected on sight. The measurement says why, and it is not
what it looks like: that pair was the **furthest** from the wordmark's yellow
(126 and 168 degrees against a hue of 48). So the clash was never about hue
distance — two cool colours against a warm gold site is a temperature clash. One
warm plus one cool is the fix, which is what crimson/azure is: 48 and 158
degrees from the yellow, 110 degrees apart from each other.

**An instrument note.** The first check of the seam gap measured distance in
SCREEN pixels and reported that the seam was not wider. It was wrong: screen
distance mixes the arc gap with perspective, so a near-side normal gap (292px)
can exceed a far-side seam (186px). Measured in curve space, where depth does
not contaminate spacing, the seam is unambiguously wider at every phase. Same
failure as section 34's font probe — one term short of the real transform.

### Known limit

The bar renders at 2.7px on the front tile and 0.4px on the rearmost: **6 of 14
tiles carry a bar of at least 1px.** The eight that do not are exactly the eight
`is-plate` tiles, so the cue is legible wherever the card itself is legible, and
absent where the card is already structure rather than content. That is coherent
but it is not "all fourteen are labelled", and it should not be described as if
it were.

### The wave (option D), and an fps instrument that was lying

An electromagnetic wave rides the curve: an E component and a B component, in
phase, oscillating in perpendicular planes, with field vectors drawn between the
axis and each crest. It travels at 0.18 loops per second, its amplitude and
thickness foreshorten with depth because each point is scaled by its own
perspective factor, and it is parked a clear 60px behind the deepest card so it
can never cross in front of a tile. Its two arcs are recoloured every frame from
the live card positions, so they track the convoys as the wheel turns.

**A canvas, not SVG.** The prototype rebuilt 200 `<path>` elements per frame;
the shipped version touches no DOM at all, and its draw calls are batched by
(collection, depth band) into Path2D buckets -- **56 strokes a frame instead of
about 960**, because alpha and width only vary with depth and depth is smooth.

**The fps numbers that drove that rewrite were worthless, and this is the part
worth keeping.** Three separate measurements were quoted -- 27.6 against 34 for
the SVG version, 31.6 against 36.4 for the canvas -- and a fourth came back at
60fps WITH the wave against 39.7 WITHOUT, which is impossible. Re-run with the
order reversed and a settle between samples, the four readings were 59.3, 34.5,
26.5 and 27.0, varying only by when they were taken.

So rAF pacing in this browser pane is dominated by sampling order, not by the
work being measured, and every frame-rate figure taken through it is unusable.
The batching is still right -- 56 draw calls against 960 is a property of the
code, readable without an instrument -- but the claim that the wave cost "a
fifth of the frame budget" was never measured, it was assumed from a broken
proxy. Real profiling has to come from a normal browser's performance panel.

Same lesson as sections 34, 36 and 37, arriving from yet another direction:
verify the instrument, then the code. A number that cannot be reproduced when
you change only the order of measurement is not a number.

### The legend, below the figure

The bar on a tile says "these two are the same kind of thing"; it cannot say
which kind. That needs words, and words cannot go on the tiles for the reason
above. So the naming happens once, below the stage, at a size that is always
readable, and the tiles only have to carry the match. The swatch is a thin bar
at the size the cue actually renders, rather than a dot or a chip, so the reader
does not have to translate between the key and the thing it keys.

It sits BELOW the figure deliberately: it explains something you have already
seen, and a key read before the thing it keys is just a list.

The counts are written by `wheel.js` from the cards themselves, never typed into
the markup -- the same rule the five dashboards follow, so an eighth project
cannot leave the key quietly claiming seven.

## 40. The phone titles, and a fraction that could not be constant (2026-08-21)

The one thing section 38 recorded and left open: on a 390x844 phone the front
card rendered 97px wide with a 4.5pt title, the smallest was 1.2pt, and **0 of
14 titles reached 8pt**.

### Why the existing constant could not fix it

`LISS.front = 0.28` is the front card as a fraction of the stage, and it does
exactly what it says at every viewport. That is the problem. 0.28 of a 1296px
desktop stage is a 363px card carrying an 11.2pt title, which is what it was
tuned for; 0.28 of a 350px phone stage is a 98px card carrying 4.5pt. The
constant was never wrong -- **legibility is measured in points and 0.28 is
measured in stages**, so a single fraction cannot serve both.

Section 34's lever, the card's own type, is genuinely the cheap one on a desktop
and it does not help here: on a phone it is already at its stop. The title is
clamped to `1.15rem` at that width and the card box is only 300px, so there is
no more type to give.

### The fraction gets a floor solved from the type

Rearranging section 34's own measurement --
`pt = fontSize x (rendered / cardBox) x 0.75`, with `rendered = W x front` --
gives the fraction needed to clear a target size:

    front = pt x cardBox / (0.75 x fontSize x W)

`lissFit()` now takes the measured title size and uses the larger of the tuned
0.28 and whatever that floor demands, capped at 0.62 so a very narrow screen
cannot solve for a card wider than its own stage.

The font size is READ from the rendered title rather than assumed, because it is
a `clamp()` on vw and therefore differs per viewport -- the same reason `persp`
is read from the stylesheet rather than hardcoded to 1000.

### What it does at each end

| | desktop 1440x900 | phone 390x844 |
|---|---|---|
| floor asks for | 0.222 | 0.557 |
| front actually used | **0.28, unchanged** | **0.557** |
| front card | 359px | 97 -> **195px** |
| front title | 11.2pt | 4.5 -> **8.9pt** |
| titles at or above 8pt | 4 | 0 -> **3** |
| cards clipped | 0 | 0 |

The floor is below the tuned value on any normal desktop, so it never binds
there and the composition is untouched -- measured 0.277 against 0.278 before,
which is rounding.

### The stage height is a separate dial, and it is not the fix

`44vh` on mobile was sized so two stages fitted in 88vh, an arrangement section
31 deleted. It is now 58vh. Worth being exact about what that buys, because it
is easy to assume it is what made the titles readable: **it changes nothing
about type size at all.** Rz is `min(W, H)` and W is the smaller axis on a
phone, so height does not touch the card scale. It only buys vertical spread:

| mobile stage | overlap | titles at or above 8pt |
|---|---|---|
| 44vh | 1.6% | 0 |
| 58vh (shipped) | 30.3% | 3 |
| 68vh | 22.6% | 3 |

So height trades density against how much of the screen the section eats, and
nothing else. 68vh measures better and 58vh was preferred on sight; the reader
picked, which is right, because the measurement has nothing to say about it.

Thirty percent overlap would be a failure on the desktop, where it was budgeted
at 12%. On a phone with fourteen tiles and a 350px stage it is what a dominant
centre card costs, and eight of the fourteen are `is-plate` images at that
moment rather than text competing with text.

## 41. Moving tiles: recording the dashboards, drawing the papers (2026-08-21)

The six M.Sc. research tiles carried static hero images. They now carry motion:
four recordings of the dashboards themselves and two animations built from the
two papers.

### Capture, with nothing installed

`tools/capture-loop.mjs` drives whichever Chromium the machine already has over
the DevTools Protocol. Node 24 ships a native `WebSocket` and CDP is JSON over
one, so the whole driver is about sixty lines and needs no Playwright, no
Puppeteer and no ~200 MB browser download.

Three things had to be learned the hard way:

**`--virtual-time-budget` cannot photograph these pages.** It is the obvious
tool -- fast-forward the page clock, screenshot, done -- and it fails quietly: at
6000 it produced the Dammam twin's own LOADING screen, and at 25000 it produced
no file at all. These dashboards run a continuous `requestAnimationFrame` loop,
so virtual time never goes idle, the budget never retires and the capture hangs.
Real time and real delays are the only honest way to photograph something that
never stops moving.

**Without `--user-data-dir` the launch attaches to the reader's own browser**
and prints "Opening in existing browser session" instead of starting a
controllable instance. A throwaway profile also means it never touches theirs.

**A dashboard that does not animate itself has to be DRIVEN.** The first Dammam
capture looked fine and was worthless: **all thirty frames hashed identically**,
because deck.gl renders once and stops. It would have shipped as a still image
under a filename implying motion. Hashing the frames caught it; looking at one
frame never would. So the tool grew `--init`, `--drive` (evaluated per frame with
the frame index in scope) and `--clip`.

`--clip` takes a SELECTOR, not coordinates, and is measured at capture time: the
IoT chart sits at y=445 in a 961px-tall pane and somewhere else entirely at 720,
so a typed-in rectangle is wrong the moment the viewport changes.

### What each tile plays

| tile | driven how | size |
|---|---|---|
| thesis | UHI twin, cycling Riyadh/Jeddah/Dammam/Makkah/NEOM | 67 KB |
| gis | Dammam twin, clicking through its layer buttons | 79 KB |
| iot | live sensor graph, clipped to `.panel--chart`, at 20x | 301 KB |
| temp | from the existing Kepler.gl recording | 104 KB |

`thesis-cover.mp4` was already in the repo and was NOT used: it is unrelated
footage, which the reader spotted. The tile now shows the dashboard the card
actually links to.

### Animated WebP, not GIF

The ask was for GIFs. The mechanism GIF offers is the right one -- it drops into
the existing `<img>` with no markup change, where a `<video>` needs markup and
autoplay handling -- but the encoding is not: the Dammam loop is **79 KB as
animated WebP against roughly 1.5-3 MB as GIF**, with 256-colour banding thrown
in. All four loops together are smaller than one GIF would be. ffmpeg has both
`libwebp_anim` and `gif`, so GIFs remain one command away from the same frames.

**Delete the frame directories.** They were written under `public/assets/loop/`
and came to 21.5 MB of PNG, which would have shipped into `dist`.

### The two papers

Neither is decoration; every number is the paper's own.

`sound.svg` puts an acoustic field against a thermal one and overlaps them,
because the review's subject is their INTERACTION. The overlap brightens and
fades rather than staying lit: the paper is careful that the benefit is bounded
-- real under moderate heat, gone in extreme -- and a permanently glowing overlap
would overclaim it. The cascade is the PRISMA count, 1,011 screened to 22
synthesised to 5 themes.

`its.svg` runs the corridor congested and loosens it as the four cumulative
layers arm in order. The layers stay lit once on, because the paper's
alternatives are cumulative and a blinking layer would misdescribe the strategy.
Nothing is dressed as a result -- the easing shows as flow, never as a number
improving on screen -- because the paper states its cost and KPI figures are
indicative planning estimates rather than measured outcomes.

**Two SVG traps, both silent.** A literal `<g>` inside a CSS comment breaks the
file: SVG is XML, so anything angle-bracketed inside `<style>` is parsed as
markup. Both files now wrap their CSS in `CDATA`. And `transform-origin` on a
`<g>` resolves against the SVG VIEWPORT, not the element -- the heat columns hung
at staggered heights and the outermost theme dot flew clear of its row entirely.
`transform-box: fill-box` is the fix, applied to the shape rather than a wrapper.

### Every tile plays, and why the poster stays in the markup

A front-card-only swap was built first, on the argument that an animated WebP
decodes at full rate however small it renders -- a 52px plate at the back of the
curve costs what the 359px card at the front does. The reader overruled it, and
the reason is sound: six still tiles around one moving one reads as five images
that failed to load. The concern stands as a known cost, not a blocker.

The loop is still swapped in from JS rather than being the `src` in the HTML,
for one reason: **an animated image cannot be paused, so
`prefers-reduced-motion` has no way to opt out of it.** Leaving the still in the
markup means a reader who asked for less motion simply never gets the swap.

### The expensive mistake, and it was not about video

A scripted edit computed a span to delete and got the end index wrong. It ate
the `return;` that exits the lissajous branch of `paint()`, so execution fell
through into `tick()` and `paint()` called itself -- `Maximum call stack size
exceeded`, every frame. It also removed `function tick()` and the ring branch,
about sixty lines.

**The build passed the whole time.** Rollup parsed the result happily because it
was still valid JavaScript, just wrong; only the browser console showed it. The
fix was to restore the file from the commit and re-apply the change as a pure
INSERT, which is why the diff is +22/-0.

The rule that follows: when scripting an edit to a large file, insert rather
than replace a computed range. A wrong start index fails loudly; a wrong end
index deletes structure silently and leaves something that still compiles.

A second-order trap on top of it: the console kept showing the recursion errors
after the fix. They were stale buffered entries -- the page's script timestamp
had moved on. Comparing the error's timestamp against the loaded script is what
separated them; trusting the list would have meant re-diagnosing a solved bug.

## 42. The architecture tiles move too, and what that broke (2026-08-22)

The seven architecture tiles carried static renders. Six now carry the project
walkthroughs; the seventh carries its own sheets. Thirteen of the fourteen tiles
are now moving, the exception being the "TO ADD" placeholder, which has nothing
to show.

### The videos were already on the disk, in the archive

`v2/public/assets/Architecture Portfolio/` — six MP4s, all 1280x720, 24 fps, ten
seconds. CLAUDE.md says the archive is still the source of the architecture
originals, and this is exactly that case.

Encoded the same way as the dashboard loops but at lower quality, because a
walkthrough compresses far worse than a UI: flat console colour is cheap and a
rendered building is not. At q40/440x248 they land at 238-352 KB each against
67-301 KB for the dashboards.

**Then sped up.** 4 seconds of source played at 1.6x into the same 2.5s loop, so
each tile shows more of its building without running longer. Cost: 302-422 KB.

### Miscellaneous had no video, so it plays its own pages

Fifteen sheets -- studies, competitions, sketches -- cutting through at 1.9 fps.
Each is letterboxed on the site's ink rather than cropped, because `arch.js`
records that those pages are three different shapes (six square boards, five
photographs in both orientations, four A-series landscape) and a crop would
butcher the portrait ones. 82 KB, the lightest loop of the set.

### The render comes before the booklet

Opening an architecture project now lands on the render, and the booklet is one
click further in. The ordering is the argument: the film sells the building, the
render states it, the sheets explain it.

Built as a LAYER over the book rather than a slot in the paging. `versoOf`,
`rectoOf` and `lastSlot` map a slot to page numbers and bound the turn;
threading a cover through them means shifting every slot by one and teaching
four functions about a page that is not a page. A layer leaves the booklet
behaving exactly as it did, which is what was asked for. +38/-1, insert-only.

**Unverified in motion.** The browser pane's scroll froze repeatedly, so an
architecture card could never be brought to the front, and the book resolves by
front card rather than by what is clicked. Verified at rest instead: the cover
exists inside the viewport, starts hidden, styles apply, image and hint present.
One real bug came out of that attempt -- it was starting VISIBLE inside the
closed modal, because it was never given the hidden class at construction.

### Replacing stills with recordings broke every contrast assumption

The biggest lesson of the day, and it applies past this component.

The tile treatment was tuned when the tiles carried dark hero renders. Three of
the dashboards are LIGHT -- the UHI twin, the Dammam twin and the IoT console are
white-backed. Measured on the raw frames, the luminance of the band the title
sits in:

| tile | band luminance | contrast vs the title |
|---|---|---|
| iot | 0.975 | **1.02** |
| thesis | 0.938 | **1.02** |
| gis | 0.813 | **1.17** |
| odr | 0.092 | 7.08 |
| its | 0.010 | 16.8 |

Against a `rgb(250,250,250)` title, three tiles were white on white. The base
scrim (0.75 at the foot, gone by 45%) averages about 0.43 alpha across that band
and left the worst near 2.9:1.

**The line above the wordmark had the same disease and worse.** `--t-4`
(#45454e) at 8.8px measures **2.05:1** against the page -- barely above nothing --
with four bright tiles crossing it at any moment. Measuring the whole text scale
rather than guessing twice: t-4 2.10, t-3 3.89, t-2 7.13, t-1 14.55. It is now
t-2 at .72rem with a shadow, and the shadow is doing a job rather than
decorating: a flat colour fails precisely when a bright tile passes behind, and
that is what the shadow covers.

### The tint carries the collection

Since a wash had to go under the title anyway, it carries meaning instead of
being neutral: research tiles bleed a deep crimson, architecture a deep azure --
the same pair already used by the bar on each tile, the legend under the figure,
and the two arcs of the wave. One more place saying the same thing rather than a
new thing to learn.

Three constraints held it honest:

- **The hues are dark on purpose.** #260c10 and #08182a measure 0.0071 and
  0.0087 luminance, so they darken as hard as black does. Measured after: worst
  tile 7.25 against 7.65 for pure black, everything clear of 4.5. A tint bright
  enough to actually read as "red" or "blue" would have spent the legibility the
  gradient exists to buy.
- **The colour stops before the picture starts** -- tinted through the text band,
  neutral above it, so nothing washes over the part of a dashboard where colour
  IS the data.
- **The stops are placed against where the text sits**, the same method the
  poster cards' scrim already used.

### An instrument note that matters

The contrast figures above are the RAW FRAME sampled to a canvas, with the scrim
applied analytically afterwards -- composited pixels cannot be read back from the
page without rasterising it. The ranking and the direction are solid and the
before/after gap is far larger than the modelling error, but the exact ratios are
close estimates rather than readings, and should not be quoted as measurements.

## 43. Calls to action move, and the walk gets an exit (2026-08-22)

Five changes, four of them a single argument about where a call to action
belongs and one about a delight that becomes a toll.

### The hero stopped asking for four things at once

The hero carried four buttons — View Research, GitHub, Live Demo, Resume — and a
row of four counters. Four equal-weight buttons is not a call to action, it is a
menu, and none of them was the thing the page actually wants.

They are gone. GitHub and Resume moved to the top bar next to Get in touch,
which is where a reader looks for them and where they stay reachable from every
section rather than only from the top. They were also added to the contact
section at the foot, so the two ends of the page offer the same three exits.
Nothing was lost: View Research and Live Demo already exist as their own
sections, reachable from the nav.

### A fifth stat, and why it had to stay on one line

"6+ Architectural Projects" now sits alongside the research counters. It is the
half of the work the stats had been silent about.

Five into a grid built for four wrapped to two rows, which reads as two
categories of fact rather than one. `repeat(5, 1fr)` with a clamped gap keeps the
row intact; the nav gap became `clamp(.9rem, 2vw, 2rem)` for the same reason, and
measured clear — links end at 796, the new group starts at 823. Below 860px the
links and both new buttons drop out and the burger menu carries them, which is
why they were added to `.navmenu` as well.

### The walk needed a way out, and the way out has a direction

Scrolling back up through the Experience section replays the whole walk. That is
correct behaviour — the walk is scrubbed by scroll position, it is not a one-shot
animation — but it means a reader who has already seen it has to sit through it
again to get past. A delight on first meeting is a toll on second.

So a skip appears, and two constraints shaped it:

**It appears only to someone who has already finished it.** `experience.js` sets
`.has-played` on the stage when the ScrollTrigger progress passes 0.98, and
remembers it in `sessionStorage`. Offering to skip something before it has been
shown is offering nothing. Remembered for the session rather than forever,
because a fresh visit should still get the walk.

**Its target follows the direction of travel.** This is the part that is easy to
get wrong, and I got it wrong first: the button pointed at `#contact`
unconditionally. But getting past the section means leaving by the NEAR edge, and
which edge that is depends on which way the reader is going. Coming down, that is
`#contact` below; coming back up — the exact case that prompted the request — it
is `#skills` above. A fixed `#contact` would have sent someone scrolling up back
DOWN through the walk they were trying to escape. The arrow glyph flips with it,
so the button says which way it goes.

Verified in both directions from a clean session: hidden on first load, armed at
the end of the walk, `#contact` with a down arrow while descending, `#skills` with
an up arrow while ascending, and the click lands on the right section either way.
`visibility: hidden` rather than opacity alone, so it cannot take a click while
invisible — checked with `elementFromPoint`, which returns the canvas behind it.

**Styled as the site's own highlighter, not a new quiet thing.** First attempt was
a translucent amber outline, which disappeared against bright pixel art.
Everything else on that stage — the chapter rail, the hint — is deliberately faint
so it does not compete with the map, and this is the one control that must not be:
a reader hunting for the exit is already slightly frustrated, and a subtle escape
hatch is not an escape hatch. It is now solid `--amber` on `--ink`, the same pair
as Get in touch, with a 3px ring of page ink so the pill keeps a hard edge over
both bright straw and dark canopy.

Bottom-right, clear of everything at both sizes: on the desktop the visible
journey card ends at 940 and the button starts at 1033; on the phone the chapter
rail moves to the top of the stage, so the foot is empty. Translated into all five
locales as `bg.skip`, because the hint sitting beside it is translated and an
English button next to an Arabic hint reads as breakage.

### Three instrument notes

All three looked like findings and none of them was.

A scroll loop reported the page frozen — 200 wheel events moved it 2px. It was
not frozen: dispatching a wheel and reading `getBoundingClientRect()` 30ms later
reads a rect mid-Lenis-animation, so the loop's exit test kept seeing a stale
position. Ten events with a 50ms settle moved it 5943px. Settle before measuring,
or the measurement describes the animation rather than the layout.

`.journey__cards` is a full-stage wrapper, so testing the button against it
reported an overlap with something that has no pixels. The visible card is its
child, and it ends 93px short. Test against what is drawn, not against the box
that holds it.

And the one caught only by reading `git diff --stat`: a 44-line edit to
`experience.js` reported **639 changed lines**. A scripted edit had appended the
line terminator to its replacement text and only then converted line endings
across the whole string, converting the terminator it had just appended and
leaving one doubled carriage return mid-file. That single stray character was
enough to stop git normalising the file, so every line read as changed and the
real diff was invisible. `--ignore-cr-at-eol` separated the two in one command;
normalised, the diff was +44/-1. Do the conversion first, then append — and treat
a diffstat far larger than the edit as a line-ending problem until proven
otherwise, because it buries the change you meant to review.

## 44. Retiring "Research Output" into the tiles (2026-08-22)

The Publications section sat directly under Projects and described three papers
that already had tiles on the wheel. Two descriptions of the same three things,
a screen apart. It is gone, and what it knew that the tiles did not has moved
onto the tiles.

### What the tiles were actually missing

Far less than the section's length suggested. Compared field by field, the tiles
already carried each paper's abstract verbatim, its metrics, its method, its
tags and, for the published one, the DOI. The section's own abstracts were
compressions of text the tiles held in full.

What was genuinely only in the section was the publication metadata:

| | sound | gis | its |
|---|---|---|---|
| co-authors | had it in `cat` | **missing** | only "Team of 4" |
| supervisor / instructor | n/a | **missing** | **missing** |
| target journals | n/a | **missing** | **missing** |
| status pill | in `metrics` | **missing** | implied only |

So the migration is a new `pub` record on those three tiles — authors, venue,
state, status, optional DOI — rendered by `modal.js` directly under the title,
because that is the order in which a paper introduces itself: who wrote it,
where it appeared, whether it is real yet. `cat` was trimmed on all three: on
`sound` it *was* the venue line and would otherwise have said it twice, and on
the other two it said "Unpublished manuscript", which is now the pill's job.

### The one thing that is genuinely gone

The section lead — "Three papers produced in one M.Sc. year, building toward a
peer-reviewed publication record for doctoral research." It is a claim about the
body of work rather than about any one paper, so no tile can hold it. The hero
counter still says 3 Papers; the sentence framing them as a doctoral trajectory
is not stated anywhere now. Recorded here rather than quietly dropped.

The wider cost is reach, not content: a reader could previously see "peer
reviewed, Springer Nature, DOI" without opening anything, and now must open a
tile. That was raised before the work and the instruction stood.

### Four traps, three of which a hand-sweep missed

`grep '#publications'` returns three lines and would have left the site broken.

**The copy tool hard-blocks between the two halves of this edit.**
`sync-site-copy.mjs` exits 1 if any key in `docs/site-copy.md` has no anchor in
`index.html`. Deleting the section orphans eight keys, so from that moment until
`--export` runs, *every* copy operation on *every* string on the page refuses.
Delete and re-export in one sitting or leave the repo unusable. And never reach
for `--force`: it cannot bypass that check anyway, and it is the reflex.

**The two nav links owned different doc keys.** The desktop `<li>` owns
`_nav.5`; the burger `<a>` owns `nav.publications`, because the collector keeps
only outermost anchors and the desktop anchor is swallowed by its parent `<li>`.
Removing one and not the other orphans a key *and* leaves a dead link.

**`.is-rtl .pub__meta` was one line inside a six-selector group** shared with
`.tag`, `.pcard__result`, `.hstat__val`, `.m-v` and `.mmv`. Deleting the rule
would have silently broken RTL digit isolation across tags, project cards and
hero stats. It was not deleted but *moved*: `.mpub__venue` carries the same mix
of Arabic numerals and Latin journal names that earned the isolation, so the
rule followed the content. Verified in Arabic: `unicode-bidi: isolate` resolves
on the relocated element.

**The responsive `.pub` lines live inside a shared `@media`** whose other line
styles `.about__grid` and `.direction__grid`. Two lines out, not the block.

Also worth stating: `_nav.N` ids are literal attributes, not positional. The gap
left by `_nav.5` is correct and must not be closed by renumbering — the doc
headings must match character for character, and gaps are already the norm
(`_nav.8`–`_nav.19` appear nowhere).

### Two process notes

I edited `projects.js` while a read-only audit of that same file was still
running, so one auditor reported the supervisor and target journals as "already
covered" — reading my own edit rather than the original state. The content is
right, but that agent's result on that point is not independent evidence and is
not counted as such. Do not write to files an audit is reading.

The adversarial verification of the removal plan did not run: it died on a
session limit. The plan was executed on the strength of two independent sweeps
plus a hand-check, with every claim verified in the browser afterward — section
gone, zero dead anchors, all three records rendering, RTL intact, console clean.
That is weaker than the intended check and is recorded as such.

### The verification landed, and it found the debris next door

The adversarial pass eventually ran and confirmed the removal independently:
zero `publications` in `index.html`, zero `.pub__` in `sections.css`, zero
`pubs.*` in `strings.js`, `_nav.6` correctly not renumbered, zero dead anchors
across all five entry points, no JSON-LD or sitemap to update, no test suite or
build-config reference, both copy pipelines green. It read `modal.js` and
`overlays.css` rather than trusting the claim that the relocated record renders,
and established something the sweeps had not: `modal.js` is the ONLY importer of
`projects.js` — `book.js` imports `arch.js` — so there is no second, unstyled
render path for the new `pub` block.

It also endorsed moving rather than deleting the RTL rule, noting that following
the original plan literally would now strip bidi isolation from the live modal.

**But it made the same process mistake twice over.** The plan it was auditing
described the repository at git HEAD, while the work had already been executed
on disk — because the audit was again running against files being written. Its
own headline is that the plan is stale. The verification is still worth having:
it re-derived from disk and checked the *result*. But the intended shape — audit,
verify, then act — collapsed into acting while both ran. Twice in one task is a
habit, not an accident: **do not start a read-only audit of files you are about
to edit, or the audit describes a repository that no longer exists.**

**What it found that was genuinely missed:** eighteen orphaned i18n entries from
the *adjacent* change in the same uncommitted diff. `hero.cta.research`,
`hero.cta.demo` and `hero.cta.resume` were anchored in HEAD's `index.html` three
times and nowhere on disk after §43 removed the hero buttons — dead in all six
locales, referenced nowhere in `src/`. Exactly the silent-orphan class this
section describes for `pubs.*`, missed on the other half of the change set,
because orphaned keys produce no error, no warning and no build failure. Removed.

A consequence worth stating: the Resume button *was* translated in six locales
when it lived in the hero. It moved to the nav without a `data-i18n` anchor, so
it and the GitHub button beside it are now English-only. Deleting the orphan is
correct — the key was dead — but the coverage loss is real and unaddressed.

Two more it surfaced, both left alone deliberately. `tools/sync-copy.mjs` is a
SECOND copy pipeline (timeline text) that no sweep had mentioned; it is
unaffected, but that was luck rather than coverage, and it is checked now.
And `README.md` still calls the published paper "Under review" and misspells the
journal as *Discovering* Cities — untouched, because that file is the GitHub
profile page.

## 45. The wheel turns on its own (2026-08-22)

The projects wheel was a flywheel: it moved when pushed and came to rest on a
card. It now turns continuously at 2.5 degrees a second whenever nobody is
using it — about two and a half minutes for a full circuit, with the front card
changing roughly every eight seconds.

Three consequences had to be dealt with, all of them downstream of the fact that
the old loop was built to STOP.

**The snap has no meaning on a wheel that never rests.** Settling to the nearest
card and then immediately drifting off it is incoherent, so while the drift runs
a spent flick decays into the drift instead of handing over to the settle. The
settle was not deleted — it still runs in every case where the drift is off,
which is what makes hovering feel like the wheel parking rather than freezing
mid-stride.

**It pauses whenever anyone is actually there.** `modal.js` and `book.js`
resolve a click through `frontCard()` rather than through what was clicked (see
the standing note in CLAUDE.md), so on a moving ring the card you open is the
one that happens to be front when the click lands, not the one you aimed at.
Hover, drag and keyboard focus all stop the drift, so the instant a reader shows
intent the ring settles onto a card and holds still. Ambient when ignored,
stable when used. Keyboard focus counts because a reader arrowing through the
cards cannot hover, and a list that walks away under the arrow keys is worse
than one that never moves.

**It is time-based, not frame-based.** The impulse physics counts frames, which
is fine for a transient nobody times; a constant drift is not, because
frame-counting turns twice as fast on a 120 Hz display. `dt` is clamped at 50 ms
so a backgrounded tab cannot bank a jump.

Off screen it does not run at all — measured 0 rAF callbacks while away, against
~40 per 1.5 s in view. Hover is evaluated at the TOP of a frame rather than in
the pointermove handler, because `overRing()` reads bounding boxes while
`paint()` writes transforms every frame; reading from the event handler forces a
synchronous reflow, reading before the paint uses the layout the previous frame
already committed. It is only re-evaluated when the pointer has actually moved,
so an unattended wheel costs nothing extra.

### The bug that only appeared on a fast scroll

Worth recording because it was intermittent rather than dead, which is the
harder kind.

The entrance animation runs on its own rAF and only calls `paint()`; the drift
lives in `tick()`. Their observers have different margins — the drift's fires
early (+10%), the entrance's late (-12%) — so the usual order is: the drift
observer starts `tick`, `tick` sees `intro` still at 0, declines to drift,
settles, and **parks itself with `raf = 0`**. The entrance then finishes into a
loop that is no longer running, and the wheel sits perfectly still until some
unrelated event happens to call `run()`.

So whether it drifted depended on which observer won, which depended on how fast
the reader scrolled in. It worked in the first test and not the second, and the
difference was scroll speed. `runIntro()` now calls `run()` when it completes.

A second, latent one fixed at the same time: Chrome does not reliably fire
`pointerleave` when an element scrolls out from under a cursor that has not
moved, so a reader who rested the pointer on a card, scrolled away and came back
would find a wheel frozen by a hover that ended long ago — and frozen until they
happened to move the mouse. The intersection observer now clears the hover when
the wheel leaves the screen.

### Instrument notes

Three readings during this work were wrong before they were right, all the same
shape: **testing the wrong element's geometry.**

Scrolling to `#projects`'s top does not put the wheel on screen — the `.wheel`
element begins ~865 px further down, so "the drift did not resume" was a scroll
target, not a bug. Centring on the wheel by bisection then overshot the other
way, because the section is pinned and scrolling inside it drives the rotation
rather than moving the element; stepping down until the element is genuinely
visible is the only reliable approach.

And `document.hasFocus()` is `false` in the automated pane, so `element.focus()`
sets `activeElement` without dispatching `focusin` at all. The first focus test
therefore "proved" that focus did not pause the drift, when nothing had been
delivered to the handler. Dispatching the event directly tested the code; the
residual 3 px it then showed was the settle easing to the nearest card, not a
failure to pause — visible only after allowing the settle time to finish.

Finally, the rate does **not** scale linearly with the constant: the cards are
spread evenly along the CURVE, not evenly in the parameter, so 3.5 deg/s gave a
front-card change every 4.4 s and 2.5 deg/s gives 8.1 s. The comment in the code
quotes the measured figure rather than a derived one, having first quoted a
derived one that was wrong.

## 46. Sections arrive instead of being there (2026-08-22)

Everything after the heat-map section was simply present as you reached it. Now
each block assembles as it comes into view, the projects wheel has a
choreographed entrance, and the pixel map is loaded on request rather than for
everyone.

### The reveal system existed; the stagger is what was missing

`[data-reveal]` → `.is-in` was already there and already working — 19 below-fold
elements measured at opacity 0 on load. What made it read as "everything is just
visible" is that a whole block arrived on one frame, which reads as the page
finishing loading rather than as the block assembling.

So `--reveal-i` now carries the element's index among its revealing SIBLINGS,
and the transition delays by that. Siblings, not section position: an element
eight screens down would otherwise inherit an eight-step delay and arrive
visibly late for no reason. Capped at six steps. The trigger also moved from
`top 92%` to `top 88%` — at 92 the element has barely crossed the edge and the
move reads as a twitch at the bottom of the screen.

**Two sections could not take a generic reveal, and the reason is the same.**
`.wheels` contains a `position: sticky` stage and `.journey-bleed` contains a
ScrollTrigger pin. The reveal applies a `transform`, and a transformed ancestor
re-bases both. Those two needed their own entrances — which is what the rest of
this section is.

### The projects entrance

Three overlapping stages inside 1.4s, driven from `runIntro`:

1. **The wave lights first.** It is the path the tiles are about to arrive on,
   so lighting it before they move means they land on something already there.
2. **The tiles walk in from the farthest point**, one after another. Not a fade
   and not a slide from off-screen — each card travels along the curve itself,
   from the figure's deepest z to its own slot, so it arrives already explaining
   the shape it belongs to. `FAR_FRAC` is solved at module load by scanning the
   curve, because the figure-eight's deepest point is not at a round fraction of
   its length and "roughly the back" starts visibly off the path.
3. **The wordmark types itself**, one letter at a time, once most tiles have
   landed.

Nothing in stage 2 fades anything: `--vis` is already a function of depth, and
depth at the far point is 0, so a tile that starts there starts invisible and
resolves as it comes forward. The entrance rides the depth cue that existed.

Measured: tile spread goes 0 → 255 → 352 → 381px across the entrance, so they
genuinely stack at one point and separate along the path.

**Two traps this walked into.**

The staging must read off LINEAR time, not `intro`. `intro` is cubic-eased,
which front-loads — staging against it fires every stage early and bunches the
last tiles. `introT` is the linear twin; timing reads off it, motion off `intro`.

And the wordmark had to be split at SETUP, not when the entrance starts.
`runIntro` fires from an observer with a -12% margin, so by then the word has
already been on screen as ordinary text — splitting at that moment makes it
appear, vanish, then type back in. Splitting early means the letters are hidden
from the first paint. The `white-space: nowrap` beside `.wl` is load-bearing for
the reason recorded in §23: per-letter inline-block spans create a break
opportunity between every pair, and this label is solved to fill its column.
Verified after the change: `getClientRects().length === 1`, hub 189.82px.

### The map now asks first, and the old reasoning is superseded not contradicted

The walk used to mount eagerly, several screens early. Deferring had been tried
once and rejected, because the timeline list stayed on screen until the reader
arrived and the section then visibly changed identity under them.

That objection was about a change the reader did not ask for and could not
predict — and a button removes exactly that. They press Load, so the swap is the
answer to their own question. The ~220 KB of sheets that every visitor used to
fetch, including everyone who never reached the section, is now fetched only by
people who want the map. Verified: nothing matching `walk|valleyjourney` appears
in the resource timing until the button is pressed.

One real defect found by testing: `apply()` did not return `mount()`'s promise,
so `Promise.resolve(apply())` settled on the same tick and the prompt was
dismissed before a single sheet had decoded — the is-loading state was already
gone 200ms after the click, and the code comment claimed the opposite. It now
returns the promise and the prompt holds for the ~815ms the load actually takes.

### Instrument note, third occurrence

Two "regressions" during this work were both the same broken measurement:
scrolling in 700px steps with 45ms between them reads bounding boxes mid-Lenis
animation, so the loop overshoots the section entirely and everything reports
inert. The wheel was at top -4723 with `--intro` still 0 — never entered, not
broken. Small steps with ~110ms of settle between them find it every time. This
is now the third time in two days that a stale rect has been mistaken for a bug;
the rule from §45 stands and clearly needs applying by default, not after a
false alarm.

## 47. Why the headings kept vanishing (2026-08-22)

Reported as "important text missing, especially the yellow headings". It was
real, it was intermittent, and the first two fixes were both wrong in
instructive ways.

### The measurement

The Experience heading measured `translateY(92.1691px)` on its word spans while
sitting at y=202 in a 674px viewport — hundreds of pixels past its own 88%
trigger. `.word` is `overflow: hidden`, so a word pushed 118% down is not late,
it is gone, and nothing on the page ever brings it back. `gsap.from` applies
that start state the instant it is created, which is what makes this failure
absolute rather than cosmetic.

### Two wrong diagnoses, and what each one taught

**First: stale ScrollTrigger offsets.** Plausible — ScrollTrigger caches each
start as a scroll offset measured at build time, and this page changes height
afterwards (the skills field unhides, the map adds or removes a pin spacer,
fonts land). Added a refresh on real height change. It helped and it was not
enough, because any height change the observer misses leaves every offset below
it wrong again.

**Second: move the headings to an IntersectionObserver.** An IO has no cached
geometry, so this should have been airtight. Every heading was still stuck —
and that is what exposed the real cause, because now the tween reported
`progress: 1` and `played: true` while the words had not moved.

**The actual cause:** `targets().filter(n => document.contains(n)).length === 0`.
Every node the tween held was DETACHED. Something round-trips each heading's
innerHTML after the split; the live DOM held freshly parsed spans carrying
`transform: translate(0%, 118%)` as a serialised attribute, while GSAP animated
orphans. The tween was working perfectly on elements nobody could see.

### The fix

An inline style written by JS cannot survive an innerHTML round-trip. A class
and a custom property can, because both serialise into the new markup unchanged.
So the motion is now a CSS transition keyed off one class on the heading, with
`--wi` carrying the per-word stagger, and the only thing JS does is add the
class from an observer. Whatever re-parses the markup, the rule still applies to
whatever is actually on screen.

Verified from the top of the page at a human scroll speed: all seven visible
headings animate on arrival, none stuck.

### The same failure shape, twice more

**The wheel entrance could be skipped entirely.** Tightening its trigger so the
animation would start on arrival rather than finishing before the reader got
there made it possible to scroll straight past the band — measured 2756px past
the stage with `intro` still 0.000. At intro 0 every tile sits stacked at the far
point with depth 0, which is invisible. So there is now a second clause: once the
stage's top has passed the top of the viewport, `runIntro(true)` snaps to the
finished state. Half an entrance is missing content, not a subtle effect.

**And the general lesson.** Three separate mechanisms on this page hide content
first and reveal it on a signal — `data-reveal`, the split headings, the wheel
entrance. Every one of them has now failed at least once by never receiving the
signal. Anything built this way needs a guarantee, not just a trigger: a path
that ends in the visible state no matter what was missed.

### Also in this pass

- The wheel no longer swallows page scroll. It called `preventDefault()` over a
  region spanning x 87..1035 of an 1132px viewport, so twelve consecutive
  scrolls with the cursor near the middle moved the page 0px and the only escape
  was a ~90px margin at the screen edge. Fair when the ring only moved if you
  moved it; not fair now that it turns by itself. Drag and arrow keys still turn
  it deliberately.
- Reveal triggers moved from `top 92%` to `top 82%`, and the heading observer to
  `-22%`. At 92 the whole transition happened below the reader's eye — the
  complaint was exactly "it is already there".
- The Education prompt is one centred button. The written timeline is hidden but
  NOT deleted: `renderCard` builds every arrival card in the walk by reading
  those `<li>` elements, so they are the map's data source as well as its no-JS
  fallback. Deleting them would empty the game.


## 48. Giving the living Earth a beat of its own (2026-08-23)

The report was two things in one sentence: "can you add a better transition
here? also this paragraph is starting to appear when the previous page has not
finished disappearing". The second half turned out to be the cause of the first.

**There was no gap to transition INTO.** The timing model had
`zoom` finishing at `pCopyGone - 0.02` and `decay` starting at `pCopyGone`. The
whole planet therefore existed for one frame before it began dying, and the
Whole Picture caption had nowhere to be except on top of the departing hero. It
was not early; there was no slot.

Measured, the scrub had **54.7% of its range (1884px) idle after the decay
finished**, so a hold cost nothing that was in use. `HOLD = 0.14` now sits
between them, and `pDecayStart` is clamped rather than `pDecayEnd` so that on a
short scrub the hold gives way under pressure and never the turn it exists to
make room for.

### Three attempts, and why the first two could not have worked

**1. Reconstruct the caption's opacity in CSS from `--zoom` and `--decay`.**
This is what was there. It needed the magic multiplier `calc(var(--zoom) * 7 - 6)`,
and the multiplier is the tell: both inputs are FLAT through the window the
caption cares about — zoom pinned at 1, decay at 0 for the whole hold. The only
resolution left was the last 14% of the zoom, which is scroll the hero is still
using. A signal that is constant where you need detail cannot be rescued by
scaling it.

**2. Match the hero's lag with a second trigger at `scrub: 0.8`.** The hero copy
is tweened in `hero.js` on a 0.8s follow, while `--whole` rode the worlds
trigger's `scrub: true`. Equal lag looked like the fix and was not: the
caption's fade window is **172px against the hero's 526px**, so an equal lag in
TIME is an unequal lag in PROGRESS. Measured under a fast flick, the hero was
still at **0.58 opacity with the caption already at 1**.

**3. Gate on the hero's actual state.** `hero.js` now exports
`heroExit = { progress: () => ... }` and the caption multiplies by
`smoothstep(range(heroExit.progress(), 0.9, 1))`. This ends the class of bug
rather than the instance — "gone" is a state, not a scroll position, and no
fixed offset can express it because the required offset is a function of scroll
velocity. It defaults to `1` ("already gone") so a timeline that is never built
cannot block the caption out of existence forever.

### The bug the fix caused

Gating on the hero made the fast flick clean and made the caption **never appear
at all** — peak opacity 0 across the whole section. The hero eases on its own
clock, so a reader who flicks into the hold and stops leaves the scroll
motionless while the hero is still catching up: no more scroll events, no more
`onUpdate`, and the caption stays hidden over a living Earth that is just
sitting there. `paintCaption()` is therefore callable from two clocks, and the
scroll handler starts a short rAF settle whenever the value it just painted was
still chasing. Bounded by the follow itself — it stops the moment the hero
reports clear.

### Measured, before and after

| | before | after |
|---|---|---|
| overlap at reading pace | 476px | **0** |
| overlap under a fast flick | hero 0.58 vs caption 1.0 | **0** |
| caption peak opacity | 0.90 | **1.00** |
| fully readable hold | — | **360px** |
| decay when the caption is gone | 0.89 | **0.10** |

Reading pace: caption first visible at y=585, the exact sample at which the hero
clears. Gone by y=1216 with the surface only a tenth turned, so the words about
a living planet are never on a visibly dying one.

### And a rule that was being broken quietly

The first pass at this added a CSS fade on `.hero__body, .hero__stats` keyed to
`--zoom`. It could not have worked and the failure is worth keeping:

- `.hero__stats` is tweened by GSAP, which writes an **inline** opacity. The
  stylesheet lost that half outright, so the stats sat at full strength while
  the body faded and the two halves of one block came apart mid-exit. This is
  why the first measurement read `stats: 1` while `hero: 0`.
- `.hero__body` failed more quietly: GSAP fades its **children** individually
  (`.hero__hey`, `.hero__role`, `.hero__desc`, `.hero__actions`), so a rule on
  the parent MULTIPLIED with them and the body left at roughly twice the
  intended rate. It also flattened `.hero__name`, which the timeline
  deliberately holds at 0.12 rather than taking to 0.

**One element, one owner.** The hero timeline owns the hero's exit; `layout.css`
only decides when the caption that follows may arrive. The stylesheet also
carries **no transition** on `--whole`: it is already scrubbed, and a transition
on top of a scrubbed value re-eases on every tick and only adds the lag that
caused this in the first place. The easing lives in the smoothstep that produces
the number.

---

## 49. The Cost of Inaction frame, and three unfair comparisons (2026-08-23)

The plan was written and measured in HANDOFF §14 and is not repeated here. This
records what changed against it, and the measurement mistakes made on the way,
which were the expensive part.

### What shipped

**`--cost`, published from `main.js` on two clocks.** The worlds scrub owns the
arrival, the dive owns the exit, and `paintCost()` is callable from both
`onUpdate`s. Unlike `paintCaption()` there is no `heroExit`-style state gate,
because both triggers are `scrub: true` and there is no lag to reconcile.

The exit is driven by `divePos`, NOT by worlds progress reaching 1, even though
today those land on the same pixel. Phase two previously published nothing a
stylesheet could read: `--plate` is written on `#riyadh`, which is not an
ancestor of `#future`.

**Both containers go `position: fixed`**, the copy bottom-right against
`#whole`'s bottom-left, and `.ftags` at `inset: 0` so the `.ftag--a..d`
percentage anchors resolve against the viewport instead of a grid cell that
scrolls away.

**Four distinct drift paths** replace the one shared keyframe. Measured
excursion went from ~5x10px to **41-47px per tag**, each on its own triangle
loop over 19-26s so no tag retraces its own path.

Measured after, at 1440x900:

| | |
|---|---|
| cost copy visible from / to | y1260 → y3300 |
| decay when it arrives | **0.24** (surface just turning) |
| fade begins after the dive starts | 30px |
| fully gone | y3430, 14% into the dive |
| frames both captions visible | **0** |
| `inert` once faded | yes |
| tag travel | 41, 45, 41, 47px |

### The mobile regression, which the plan did not anticipate

HANDOFF §14 correctly flagged that `.ftags` must not take fixed positioning into
the `@media (max-width: 900px)` block, and guarding it was easy. **It did not
flag the same risk for the copy, and that turned out to matter more.** Below
900px the tags return to normal flow and stack under the caption; a fixed
caption has LEFT that flow, so it floats over them instead. Measured at 800px:
two tags overlapping the copy by ~7000px each.

So the whole treatment now shares one `@media (min-width: 901px)` guard, opacity
included. Under 900px the frame keeps its original behaviour entirely. A flowed
block whose opacity is driven by a scrub it no longer matches would just be the
original bug pointing the other way.

### Three unfair comparisons, all read as regressions

This is the part worth keeping. Nothing below was a real fault, and each cost a
round to disprove.

**1. "The rule is not applying."** Both containers read `opacity: 1` where they
should have been 0. The page had restored to scrollY 2914 on reload, and at that
position `cost: 1.000` is correct. Check where the page IS before concluding what
it should be showing.

**2. "I broke `#whole`."** A `scrollTo` sweep reported `--whole` peaking at 0,
which is the exact signature of the §48 bug. It was the instrument: `paintCaption`
gates on `heroExit.progress()`, and jumping the scroll with one rAF between
samples never lets the hero timeline settle, so the gate never opens. Under real
wheel events the caption reaches 0.762.

**3. "I broke `#whole`, again."** A second comparison put HEAD at 0.762 and the
change at 0.003 — but the two runs had scrolled to different depths at different
speeds through a window §48 explicitly documents as speed-sensitive. Re-run at
the same position with the same input, both read **0.762, identical**.

The common thread: a scrubbed, lag-gated, speed-sensitive sequence cannot be
sampled by teleporting the scroll, and two runs are only comparable if the input
matches. `scrollTo` is fine for reading a value that depends only on position
(`--cost` is; `--whole` is not).

### Pre-existing, found while checking, NOT fixed

At `<=900px` the tags overlap the copy by ~30000px even at HEAD. The
`@media (max-width: 900px)` block sets `margin-top: 1.25rem` on `.ftags` but
never clears the base `margin: -26vh 0`, so the bottom margin stays at -234px and
pulls the stack up into the caption. Verified by stashing the change and
measuring HEAD directly: 28893/30419 against 33532/28786 with the change, i.e.
the same bug either way. Left alone deliberately: it is a separate fault and this
change neither caused nor worsened it.

### Follow-up: the tags were floating in the corners, not over the planet

Reported straight after the change above: "the tags are not floating in space
across bad Earth". Correct, and the measurement was unambiguous — on a 1440x900
viewport with the globe centred at (720, 450) and a radius of about 450, all
four tags sat **560 to 691px from that centre**, every one of them outside the
disc, in the black corners.

**The cause was the fix itself, half-applied.** The anchors read 6%/left 3%,
20%/right 4%, 78%/left 6%, 92%/right 7%, and those were correct while `.ftags`
was a grid cell stretched open with `margin: -26vh 0`: that box was taller than
the viewport, so even 92% landed on the planet. Moving the field to
`position: fixed; inset: 0` changed what the percentages resolve against, and
corner values then mean actual corners. Changing the container without re-placing
what it contains is the whole of the bug.

New anchors put each tag 200-384px from the globe's centre, all four on the face,
none overlapping the caption (fixed bottom right, roughly x 824-1368, y 645-810
at this size, which is why `d` sits left of centre) and none overlapping each
other. All four now use `left` rather than a mix of `left` and `right`: those
position the tag's LEFT edge, and the tags differ in width by nearly 2x, so
mixing them made spacing depend on phrase length.

**The lesson is small and general:** a percentage offset is meaningless without
knowing its containing block, so any change to `position` has to be followed by
re-reading every offset that depended on the old one. The excursion measurement
that "verified" the tags after the previous commit measured MOTION and never
asked WHERE, which is why it passed while all four were off the planet.

## 50. The heat-map caption arrives with the map (2026-08-23)

Reported as: the "Where the heat becomes personal" group has no fast text
animation, and should appear only once the heat map is there.

### Both halves were true, and they had the same cause

The heading carries `data-reveal` AND `data-split`, and those run on two
different clocks, neither of which is the one that brings the map in:

- `[data-reveal]` -> ScrollTrigger at `top 82%`, adds `.is-in`, which is what
  makes the block opaque.
- `[data-split]` -> a separate IntersectionObserver at `rootMargin -22%`, adds
  `.is-split-in`, which is what actually plays the per-word rise.

Measured mid-page: all four children had `.is-in` while the heading did **not**
have `.is-split-in`. So the words were fully visible having never moved. That is
the "no fast text animation": the animation was not missing, it had been made
irrelevant by the fade arriving first and from a different trigger.

ScrollTrigger caches its start as a scroll offset at build time, which is exactly
the staleness the comment at the top of reveals.js already describes for these
headings; the IntersectionObserver was added to fix it for the split and the
generic reveals were left on the old mechanism.

### The fix: one owner, and it is the dive

`#about` sits over the Riyadh plate, so the plate's own clock should own its
caption. The dive already ramps `riyadh.style.opacity` over progress 0.52-0.64.
It now also publishes `--heat = smoothstep(range(p, 0.60, 0.74))` on `.worlds`,
a beat later, and:

- `#about > .wrap` takes its opacity from `--heat`. Driven on the WRAP, not on
  the four children, because each child owns its own opacity through
  `[data-reveal]`; gating the container multiplies with that instead of fighting
  it. Same arrangement as the Cost of Inaction frame in §49.
- `main.js` adds `.is-split-in` when `--heat` first passes 0.04, so the word rise
  plays at that moment rather than on mere visibility.
- A new `[data-split-hold]` attribute opts a heading out of reveals.js's viewport
  observer while keeping the word split itself. Left observed, the rise would
  race the dive and whichever fired first would win.

### The fallback that undid it, first time round

`opacity: var(--heat, 1)` reads 1 with no JS, so the words can never be trapped
invisible. But a fallback also applies BEFORE the dive has published anything,
and measured that put the caption fully visible from **y3200 against a map that
does not arrive until y4040** — 840px early, i.e. the exact bug being fixed,
wearing a different hat. `main.js` now writes `--heat: 0` once when the dive is
created, which narrows the fallback to the case it is actually for.

### Measured, from a clean scroll of 0

| | |
|---|---|
| map first visible | y4000 |
| caption first visible | **y4080**, 80px later |
| word rise fires | **y4080** |
| map opacity when the caption starts | **0.85** |

Both halves of the caption now arrive together, onto a map that is already there.

**Worth carrying forward:** a `once: true` class that is only ever added, never
removed, will look like it fired at the wrong scroll position if the browser
restores scroll on reload. Two readings here said the rise fired at y3000 before
that was understood. Measure from a known scroll position, not from whatever the
reload left behind.
