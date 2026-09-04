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

## 51. Pinning the heat caption, and three wrong ideas about where the globe is (2026-08-23)

A run of small requests on the two earth frames. The interesting part is not the
changes, it is that three of them were placed against a globe that was not the
size anyone assumed.

### MEASURE THE SILHOUETTE

The `.ftag` labels were positioned twice against `min(vw, vh) / 2` — radius 450
on a 1440x900 screen, a disc filling the viewport height. That is wrong. The
globe is drawn by `earth.js`, and `#worldsGrab` is already sized from its
PROJECTED silhouette: measured **radius 333, centred (720, 483)**, leaving 387px
of clear space down each side, 150px above, 84px below.

So the sequence of complaints all had one cause:

| placement | distance from centre | verdict |
|---|---|---|
| original corners | 560-691px | "not floating across bad Earth" |
| first fix | 197-384px | "too much over the earth" |
| second fix, 6 on a ring | 200-384px | "should not come over the earth" |
| now, side bands | clear of the disc by 34-221px | on the planet: none |

Every one of those was measured and reported as passing, because the metric was
distance from a centre with the wrong radius attached to it. `#worldsGrab` was
sitting in the DOM the whole time with the right answer in it.

### An anchor is not a position

The tags are animated, so the anchor is only where they start. At `2%` off each
edge the outermost tag measured **x1445 against a 1440 viewport** — off screen —
and a single-frame check of the anchor could never have shown it. Verified now
across two full drift cycles with the durations temporarily compressed: every tag
stays clear of the disc, on screen, and off the caption at every point.

The horizontal travel came down to about 20px for the same reason. The side bands
are ~390px wide with the planet on one side and the screen edge on the other, so
X is the axis with nowhere to go; Y carries the float at ~50px instead.

### The caption is pinned, and pinning changed the section's height

`#about > .wrap` is now `position: fixed`, vertically centred, driven by `--heat`
on two clocks exactly as `--cost` is: the dive brings it in, a trigger on About's
own bottom edge takes it out.

**Pinning it emptied the section.** With the copy out of flow, `#about` became
padding and nothing else. The first attempt at holding the map longer raised
`padding-bottom` from 52vh to 120vh and gained only 136px overall, because the
pin had removed 476px of content at the same time. 175vh is what actually buys
the hold.

### Where the map's hold actually comes from

Not obvious and worth stating: the map sits in `.worlds__stage`, which is
`sticky; top: 0` inside `.worlds`, so it stops being stuck at `.worlds` bottom
minus one viewport. `#about` is the last thing inside `.worlds`, so **#about's
height IS the map's remaining hold.**

| | before | after |
|---|---|---|
| map held still | 337px | **840px** |
| caption visible | — | 4080 → 5160, 1080px |
| stage releases | y4337 | y4968 |

### The exit had to move to the release, not sit after it

The caption's fade was set to run over 0.25-0.6 of its exit trigger, which put it
at full opacity from y5000 to y5200 while `#direction` had already entered at
y4968. Moved to 0-0.28: the moment About's bottom reaches the foot of the screen
is three things at once — the stage lets go, the map starts sliding, and the next
section starts climbing in — so the caption leaves there.

**A note on the metric.** "Next section is on screen" flagged 4 bad frames even
after the fix, and they were not real: a section counts as on screen when a 1px
sliver crosses the bottom edge. Measured against the next section's HEADING,
which is the thing that actually competes, the overlap is 0 and the heading first
appears when the caption is already at 0.14.

### Also in this run

- The interaction cue is separated: `.future__cue` had no rules anywhere, so
  "Drag and explore the globe" rendered as a second identical `.lead` against the
  first. Now under a hairline rule in the mono label face.
- Six tags, not eight. The two dropped were mine, and were the two that
  overlapped their neighbours in meaning.
- The tags arrive one at a time: each subtracts `--ti * 0.08` from `--cost`
  before scaling, so they fill in rather than switching on together. This takes
  opacity ownership away from `[data-reveal]` on those elements deliberately, by
  specificity — which is the "one element, one owner" rule applied, not broken.
- `--cost` is seeded to 0 at startup for the same reason `--heat` is: the
  stylesheet falls back to 1 so nothing is trapped invisible without JS, and the
  seed stops that fallback also applying before the scrub first reports.

### The paragraph came off the planet too, and the tags moved to make room

Same fault as the tags, one element later. `#future .future__body` was
bottom-right at its full 544px measure, x824 to x1368 — and the globe's disc
reaches x1053, so **229px of the paragraph was sitting on the planet.**

The right band is only 387px wide, so it cannot hold both the copy and three
tags. All six tags moved to the LEFT band and the copy took the right one, which
is a better composition anyway: labels one side, argument the other, planet
between them.

- Copy narrowed to `min(300px, 26vw)` and vertically centred rather than
  bottom-anchored; at 300px wide the block is tall enough that hanging it off the
  floor pushed its title up into the globe's edge.
- `text-align: justify` KEPT. It was raised as looking ragged and then explicitly
  asked for, so it stays; cutting the paragraph is what fixes the raggedness,
  since justification opens gaps in proportion to how much text is fighting the
  measure.
- The lead is cut from 213 characters to 98, dropping the general thesis
  sentence and keeping the one that describes what is on screen. **That cut is
  mine and worth a read.**

Measured after: copy clear of the disc by 44px, on screen, justify intact, 2
lines instead of 3, and every tag clear of both the copy and the globe.

### And the same for Looking at the Whole Picture (2026-08-23)

Identical fault to the Cost of Inaction block, and worse. Fixed bottom-left at
the full 544px measure it ran **x72 to x616 against a disc starting at x387**, so
184px of it sat on the planet, versus 229px for its twin.

This frame has no tags, so the left band was free and the copy took it outright.
The two now mirror each other exactly: Whole Picture left, Cost of Inaction
right, both `min(300px, 26vw)`, both vertically centred, both **44px clear of the
disc**.

The lead is trimmed 421 -> 295 characters by dropping two whole sentences, the
setup and a compressed restatement of the sentence after it. Nothing was
reworded; every remaining word is the author's. `text-align: justify` kept.

Note this block is **not** managed by `tools/sync-site-copy.mjs` — there are no
`whole.*` keys in `docs/site-copy.md`, so `index.html` is the only source. The
first attempt edited site-copy.md and failed to match, which is how that was
found.

### A consistency bug the mobile check caught

All three frames now pin on desktop and return to flow below 901px. Checking that
at 800px showed `#future` at opacity 1 but **`#whole` and `#about` at opacity 0**.

Their opacity gates were in base rules rather than inside the desktop guard, so
at phone widths the blocks were in normal flow while still being driven by a
scrub that no longer matched where they sat. `#future` had this right because the
guard was written around the whole rule; its two siblings were written earlier and
did not. All three are now consistent: pinned and gated above 901px, flowed and
fully visible below it.

Verified after, desktop: all three fixed, windows in sequence — whole, then
future 1200-3300, then about 4200-5100 — and **zero frames with two captions
visible at once**.

### The heat caption joins the caption scale (2026-08-23)

Once pinned over the map, `#about` was still being set at CHAPTER scale while
its two siblings were captions. Measured side by side:

| | whole | future | about, before |
|---|---|---|---|
| box width | 300px | 300px | **1440px** |
| title | 40px | 40px | **108px** |
| lead | 14.4px | 14.4px | **23.04px** |
| lead align | justify | justify | start |

Fixed by adding `#about` to the existing rule groups rather than writing new
numbers, so there is one definition of "caption scale" and the three frames
cannot drift apart:

- `#whole .sec-title, #future .sec-title` gains `#about .sec-title`
- the shared `.lead` rule gains `#about > .wrap .lead`
- `text-align-last: left` and the eyebrow alignment likewise

The comment already sitting above that group turned out to describe the new
member exactly: "smaller and quieter than a section head, because these are
captions on a picture rather than the start of a chapter."

Two things the copy needed beyond the group: `.wrap` carries
`max-width: var(--max)` = 1560px from base.css, which had to be cleared, and the
section's second paragraph is not a `.lead`, so it needed telling separately or
it sat at body scale beside a caption-scale one.

Placement is the left band, matching `#whole`. This frame sits over a flat map
rather than a globe, so there is no disc to avoid and the side is a composition
choice; left keeps the heading where it already began.

Verified at 1440: all three now 300px wide, 40px title, 14.4px justified lead,
whole and about in the left band, future in the right. At 800: all three in
flow, all visible, all on the same 25.6px/14.4px scale.

## 52. A behaviour audit, and giving the phone the same model (2026-08-23)

Asked to check the site behaves properly, then that it behaves the same way on a
phone. Four real faults came out of it, three of them mine from this session.

### Desktop

**A first-load flash.** Sampling at scroll 0 immediately after load caught the
tags and the Cost caption at full opacity; the same read on a settled page
returned 0. Cause: the stylesheet fell back to 1 and `main.js` seeds 0 inside
`idleInit`, so between first paint and idle the fallback applied.

The fallback was 1 on the reasoning that no-JS visitors should not get a blank
block. **That reasoning was wrong**: the `.no-js` rule at layout.css:261 is never
applied by anything — no script sets or clears the class and the markup does not
carry it — so every `[data-reveal]` element already fails closed without JS.
`--whole` had always used 0. All fallbacks are now 0.

**The tags lagged the scrub by 700px.** `--cost` hit 0 at y3500 while the tags
were still fading at y4200. They carry `[data-reveal]`, which sets an opacity
transition, and taking the opacity over without also taking the transition left
the reveal system easing a value that is already scrubbed. `transition: none`.

Two things checked and found NOT to be faults: the two zero-size images are the
lightbox and book-cover placeholders, and `#riyadh` keeping opacity 1 to the
document end is fine because it scrolls away rather than fading.

### The phone had the fallback layout, not the design

Everything dropped into normal flow below 901px, which was safe rather than
right. Measured, the constraint is real and worth writing down:

| | 1440x900 | 375x812 |
|---|---|---|
| globe radius | 333 | 176 |
| clear left / right | 387 / 387 | **12 / 12** |
| clear below | 84 | **369** |

There are no side bands on a phone, so the desktop ARRANGEMENT cannot carry over.
The MODEL now does: the copy is pinned and driven by the same `--whole`,
`--cost` and `--heat`, at the bottom instead of in a side band; the tags are
fixed, float, and arrive staggered off `--cost`.

**Three tags, not six.** The band between the globe (ends y393) and the pinned
caption (starts y575) is 182px. Four pills at 35px plus drift measured 1px of
clearance from the planet and 997px of overlap with the caption. Three fit with
real gaps, and the drift is scaled down to ~7px because the desktop's ~50px is
most of the band.

Verified across a full compressed drift cycle at 375x812: 17px clear of the
globe, 0 overlap with the caption, 0 tag-on-tag overlap, 0 frames off screen.

### Two more leaks of the same kind

The mobile stack was overlapping the copy by **59075px** before any of this:
`.ftags` and `.future__body` are deliberately placed in the SAME grid cell so
they can overlap on a desktop, and the phone block never moved them apart. It
also set `margin-top` while leaving the base `margin: -26vh 0` bottom at -211px,
and `align-self: stretch` was making each pill 74px tall against 31px of content.

And `text-align-last: right` for the Cost frame sat unguarded LATER in the file
than the phone block, so it won there and left a right-ranged last line in a
left-ranged layout. Now guarded at 901px, like `.ftags` position before it.

**The pattern, three times now:** a desktop-composition rule written without a
media guard, sitting after the phone block, silently winning. If a rule encodes
where something sits or which way it ranges, it belongs inside `min-width: 901px`.

### A self-inflicted one worth recording

One edit inserted comment TEXT where the preceding comment had already closed,
leaving prose raw in the stylesheet. It invalidated the rule immediately after
it, so `.ftag--a` kept its desktop 10% and sat on the planet while its siblings
moved. The measurement caught it as "clearance -320px", which is a nonsense
number and exactly the sort that means the instrument is reading a broken state
rather than a bad value.

## 53. The projects wheel became a scroll trap (2026-08-23)

Reported from the live site: "i am not able to move part the projects section,
the wheel is working but other parts are not triggering any vertical scroll."
Correct, and self-inflicted two commits earlier.

### Cause

`overRing()` decides whether a wheel notch turns the ring or scrolls the page.
It originally described a narrow column — one card's width plus 15% — so most of
the section fell through to the page and leaving was never a question. CONTEXT 51
widened it to the union of every card box to fix "scrolling over the tiles does
nothing", and that produced the opposite fault.

Measured on the live site at 1440x900: the card union covers **76% of the
viewport**, leaving 59px above it and 111px below. A pointer anywhere over the
figure consumed every notch, and the page never advanced.

Both faults are the same missing idea. The question was never "how much of the
screen does the wheel own", it was **"for how long"**.

### Fix: a budget, not a footprint

The wheel keeps the whole figure, and consumes scroll only until the ring has
turned once — by which point all fourteen cards have come past. After that it
stops calling `preventDefault` and the page carries on. An IntersectionObserver
re-arms it when the figure leaves the viewport, so returning to it later spins it
again; it cannot re-arm from inside the wheel handler, which only fires while the
pointer is over a figure that is by definition on screen.

### The budget has to be measured on the RING, not on the input

First version summed the wheel impulses. One notch is `deltaY 120 * WHEEL_K` =
**2.28 degrees**, so a 360 degree budget wanted about 158 notches, and measured,
120 synthetic notches were still all consumed — no release at all.

The ring has a flywheel: a flick keeps spinning long after the event that caused
it, and that rotation is what the reader actually gets. Spending the budget
against `angle` instead, which already includes the momentum:

| | impulse-based | ring-based |
|---|---|---|
| notches before release | never (>120) | **20** |
| notches passed to the page | 0 of 120 | **140 of 160** |

Verified with real scroll input from the centre of the figure: the page advances
1000px and the wheel leaves the screen. Verified re-arming: after leaving and
returning it consumes 20 again.

**The general shape, worth keeping.** A scroll-driven component that calls
`preventDefault` owes the reader an exit, and the honest exit is "when I have
nothing left to show", not a region of the screen they have to find with the
pointer. Both versions of this bug came from answering the geometry question
instead of the duration one.

## 54. Pinned blocks leaking into other sections (2026-08-23)

Two reports from the live site: the Urban Heat Islands copy painting over the
projects wheel, and on a phone the floating tags "pinned to the screen always".
Then the general form of it: *each section text do not overlap in the other
section.*

### The structural fault

Sections 49-52 made three captions and the tag field `position: fixed`. A fixed
element does not leave when its section does — the ONLY thing keeping it off the
rest of the page is its signal reaching 0. That is a single point of failure with
several ways to fail: a scrub whose last `onUpdate` never fires, a `refresh()`
that re-times a range after a late layout change, a reader landing mid-page, or
simply reading a value before `idleInit` has seeded it.

Worth being honest about the diagnosis: it did not reproduce locally. Swept with
`scrollTo` and again with real wheel input at both 1440x900 and the reporter's
1274x890, `--heat` went 0 -> >0 -> 0 correctly every time and no frame showed a
caption outside its own section. Three separate sweeps produced phantom failures
instead, all from sampling before the page had settled after a reload.

**So the fix does not chase the trigger, it removes the dependency.** The signal
decides how a block LOOKS; a per-section IntersectionObserver decides whether it
may be seen at all. `main.js` toggles `.is-offstage` on `#whole`, `#future` and
`#about` from their own geometry, and the stylesheet hides their pinned children
outright while it is set.

`visibility`, not `opacity`, for two reasons: opacity is already owned by the
scroll signals and a second owner is the collision this codebase keeps paying for
(CONTEXT 48), and `visibility: hidden` also removes the block from hit-testing
and from the accessibility tree, which is right for something not on stage.

It cannot drift, because it is not derived from a scroll position at all — the
observer reports the geometry itself.

### Verified

Swept the whole document at both sizes, checking every pinned block against
whether its own section intersects the viewport:

| viewport | samples | frames where a pinned block showed outside its section |
|---|---|---|
| 1274x890 | 108 | **0** |
| 375x812 | 102 | **0** |

On the phone the tags are visible y1400-3800 against a `#future` that occupies
y2037-3945 and enters the viewport at y1225, so they are confined to their own
section rather than riding the whole page.

**The general rule this earns:** anything `position: fixed` driven by a scroll
signal needs a second, geometric gate that does not depend on that signal being
correct. The signal is for the transition; the gate is for the guarantee.

## 55. The phone gets its own composition, not a squeezed copy of the desktop (2026-08-23)

Seven things were wrong on a phone and right on a desktop. They are worth
recording together because six of the seven have the same cause: a rule written
for the desktop composition, left unguarded, and placed late enough in the file
to win at every width.

**The tags appeared at load and then never left.** Reported as "it is there in
the beginning for some time and then it dissappear" and, separately, "Once they
are on the screen they are not dissappearing also even if there section is
gone". Both halves are one bug. The phone rule was written as a bare `.ftag`,
specificity (0,1,0), and it lost to `[data-reveal].is-in { opacity: 1 }` at
(0,2,0). So the reveal system owned the opacity and `--cost` never got a say:
the tags came up with the rest of the page and went away only when the offstage
guard from section 54 caught them. The desktop rule had always been
`#future .ftag`, (1,1,0), which is why none of this showed there. Prefixing the
phone rule with the id fixed both symptoms at once.

This is the third bug in this file whose cause is specificity rather than
logic. The pattern to watch for: a phone override that names only a class, when
the desktop rule it is trying to override names an id.

**The tags could not float, because they were too big to.** The full phrases
measure 138-253px. A 253px pill next to a 352px globe on a 375px screen has
nowhere to go, so the previous attempt stacked them in a column underneath and
read as a list. `data-short` now carries a one-or-two-word version, swapped in
with `font-size: 0` on the element and `content: attr(data-short)` on `::after`.
The pills drop to about 80px and there is room to place them around the planet.
The full text stays in the markup for the desktop and for anything reading the
document.

**Where they went took two attempts.** The first ring put a pair at `top: 30%`,
which measured 116 and 125px from the globe centre against a radius of 136 —
on the planet's face, because 30% is its widest point. The globe is not one
size here either: 136 mid-sequence, 176 at rest. So a single ring cannot stay
outside it at both, and the six now spread down both edges above and below the
equator instead. Measured on 375x812: distances 185/199/163/177/227/217 against
radius 136, none over the globe, none over the copy, none off screen, no pair
overlapping.

**The captions were ranged left in a single-column layout.** On a desktop
`#whole` and `#future` sit in a side band beside the planet and range toward
their own edge, which is right there and wrong on a phone, where the block sits
under the planet with nothing to range against. They are now bottom-centre with
`text-align: justify; text-align-last: center`, the same treatment the hero copy
takes.

That last-line rule is the whole reason justification is usable at this measure.
The standing argument against justifying a narrow column is that too few words
per line makes rivers, and it is a good argument, but what actually reads as
broken is the final short line sitting hard against the left edge under a
justified block. Centring it makes the block read as deliberate. Both the hero
copy and the captions had previously been dropped to ranged-left under 640 and
720px on that argument; both are back to justified with a centred last line, at
explicit request.

Note which of the three rules that touch these leads decides the outcome: the
720px one, because it is last in the file. The phone block further up cannot
win however it is written.

**Five stats across two columns is three rows** with a lone one at the end,
reading as an afterthought — the same fault the desktop grid was widened to five
to avoid. Three columns gives two rows and a deliberate 3 + 2.

**The tiles were too close together.** `GAP` is the extra circumference beyond
what the cards strictly need. The phone ring turns about Y and solves its radius
from card WIDTH, which is 300px against a 210px height, so the same fraction
leaves neighbours visibly tighter than the vertical ring does. `GAP_PHONE = 0.9`
against the desktop 0.52 takes the radius from 999 to 1249.

A measurement note on that last one. `getBoundingClientRect().width` on a card
is perspective-scaled — 174px for a card whose `offsetWidth` is 300 — and
working back from the scaled figure produced a radius that matched the OLD gap
almost exactly, by coincidence, and nearly sent a correct change back for a
second fix. Solve against `offsetWidth`, which is what the code uses.

## 56. One leftover rule kept the Whole Picture caption scrolling (2026-08-23)

Section 55 claimed both captions were pinned on a phone. One of them was not,
and the claim was made without ever measuring that specific block — the sweep
that produced §55's table checked the Cost of Inaction caption and the tags, and
inferred the other from the fact that they share a selector list.

They do share it, at :1334. But 430 lines further down sat this:

```css
@media (max-width: 900px) {
  /* Back into flow with everything else on a phone. */
  #whole .future__body { position: relative; left: auto; bottom: auto; }
}
```

Same `(1,1,0)` specificity as the pinning rule, later in the file, so it won.
`#future` never had a counterpart, which is the entire reason one caption
behaved and its mirror image did not. Deleted.

**The lesson is about which fault a symptom points to.** A block that fades in
and out on cue while also drifting up the frame looks like a timing bug. It was
not: `--whole` was published correctly the whole time and the opacity rule was
reading it correctly. Nothing about the signal was wrong. The block was simply
`position: relative` and therefore in flow, so it travelled with the page while
its opacity did exactly as it was told. Check `position` before checking the
signal when the complaint is that something MOVES.

**Three instrument failures on the way to that, all mine, all worth keeping.**

`scrollTo` will not do. Driving the sweep with `scrollTo` showed `--cost`
rising normally and `--whole` flat at 0 for the entire document, which reads as
"the Whole Picture signal is broken" and is an artefact: `--whole` is gated on
`heroExit.progress()` reaching 0.9, and jumping the scroll position leaves that
pinned trigger stale. `--cost` has no such gate, which is exactly why it
survived the bad instrument and made the artefact look like a real asymmetry.
This is the standing rule in the brief and it earned itself again here.

Synthetic `WheelEvent`s will not do either. Dispatching them on `window` and
`document` moved the page — 20135px of it — and still left `--whole` at 0. Lenis
does not take them the way it takes real input. Only `computer{action:"scroll"}`
reproduced the real sequence.

And read the custom property off an element that inherits it. `--whole` is set
on `#worlds`, not on `:root`; `getComputedStyle(document.documentElement)`
returns empty, which coerces to 0 and looks exactly like a signal that never
fires.

**A peak worth not chasing.** The first good measurement had `--whole` topping
out at 0.668, which would mean a caption that never reaches full strength. It
was scrub lag from scrolling faster than a reader ever would. At reading pace it
reaches a clean 1. Before treating a scrubbed value as a defect, re-measure at
the speed a person actually scrolls.

Measured after the fix, with real scroll input: `position: fixed` throughout,
`top` constant at 503 across all 1322 visible frames, spread 0. The Whole
Picture caption lives from scroll 802 to 1005 and Cost of Inaction from 1153 to
1755, with zero frames where both are visible.

## 57. Clearance from the measured disc, and the living Earth gets its share (2026-08-23)

Two faults, unrelated in cause, both found by measuring the same sequence.

### The caption sat on the planet at anything narrower than 1440

`#future .future__body` was `width: min(300px, 26vw)` at `right: 3%`, tuned at
1440x900 where it leaves 44px between the copy and the disc. It does not scale.
The disc shrinks with the viewport and a 300px column does not, so the clear
band closes from both sides at once: at 1094x694 the caption overlapped the disc
by 27px and the text was unreadable against the planet. `#whole` had the same
fault mirrored.

Worth stating that this was found while checking something else, and that the
check mattered. The lead copy had just been replaced with a sentence 34% longer,
so a caption overlapping the globe looked exactly like the copy change having
overflowed. Measured both texts in-page at identical viewport and scroll: 27px
of overlap with the old sentence, 27px with the new, `left: 776` in both. The
new text adds 24px of HEIGHT and moves nothing sideways, and the closest point
of the box to the disc centre is horizontal, so height cannot matter. The copy
was innocent.

The fix follows the rule this file already states for the tags and then did not
follow for the captions: MEASURE THE SILHOUETTE, DO NOT ASSUME IT. earth.js
already computes the projected disc every frame for the drag hit-test, so it now
publishes `--disc-cx`, `--disc-cy`, `--disc-r`, and each caption sizes itself
from the real clearance:

```css
width: clamp(15rem, calc(100vw - (var(--disc-cx) + var(--disc-r))
                         - var(--disc-gap) - 3vw), 300px);
```

44px is kept as `--disc-gap` — the clearance the 1440 tuning produced, promoted
from an accident of one screen size to the target at every size. Measured after:
44px exactly, on both captions, constant across every frame of both windows.

Tracking a moving target is normally how the drift bug in section 56 happens, so
note why it cannot here: while either caption is visible the planet has settled,
measured as a single distinct radius across every frame of both windows. Off
that window the values do change and nothing is reading them.

### The living Earth had a ninth of the sequence and the failed one had a third

Reported as "the green earth has less time and bad earth has more scroll time".
Measured on 1255x694 with a 2443px scrub:

| beat | before | after |
|---|---|---|
| living Earth | 333px | 692px |
| the turn | 733px | 714px |
| failed Earth | 987px | 726px |

The two are the SAME BUDGET seen from either end, which is what makes this a
one-number fix. The hold before the turn and the idle stretch after it are both
carved out of one scrub, so lengthening the first shortens the second. With
`pCopyGone` measured at 0.156 and `DECAY_SPAN` at 0.30, balancing them is:

    HOLD + 0.02 = 1 - pCopyGone - HOLD - DECAY_SPAN    =>    HOLD ~ 0.26

`HOLD` 0.14 -> 0.26. Predicted 684px, measured 692px.

I first talked myself into believing `pDecayStart` was pinned at its 0.62 clamp,
which would have meant `HOLD` was inert and the turn had to be compressed to buy
the time. That came from misreading `pCopyGone` as ~0.5. It is 0.156:
`innerHeight * 0.55 / px` is 694 * 0.55 / 2443. Both clamps are slack at the new
value (`pDecayStart` 0.416 against 0.62, `pDecayEnd` 0.716 against 0.92), so the
turn keeps its full span and the tuned section heights were never touched.

Phones get the same, from the same constant: 921 / 903 / 794.

**One asymmetry left, deliberately.** The captions are still 708px against
1410px, because the Cost copy holds through the dive's lead-in while the Whole
Picture copy ends with its own beat. The EARTH states are balanced, which is
what was asked for. Trimming the caption means `COST_OUT`.

### Instrument note

A `requestAnimationFrame` recorder calling `getComputedStyle` on several
elements every frame will starve the WebGL render loop: after a long session of
this the canvas painted black while every signal read correct and no error was
logged. It looked exactly like a scroll-up regression. Reload before believing a
render fault found through a running probe, and confirm with the probe off.

## 58. A constant left behind by the 7-to-14 card merge (2026-08-23)

### The second hero question ran to three lines on a phone

Measured at 375px: question one is 55 characters and sets in two lines,
question two was 89 and set in three. Two lines was wanted for both.

The useful part is that the ceiling was measured rather than guessed. Testing
candidate strings in place, two lines holds up to about 73 characters and breaks
somewhere before 89 — so the whole of "better and more" is exactly what had to
go, and nothing else did:

> Why do some places feel ~~better and more~~ welcoming while others feel
> exhausting and harsh?

73 characters, two lines, and it holds at 335 / 320 / 300 / 280px, which is the
same range over which question one holds. The first instinct was a much harder
cut to about 56 characters, which would have lost "harsh" and the second "feel"
for no reason. Measure the ceiling before deciding how much to cut.

### The wheel ran at twice its intended rate, and had since the merge

Reported as "too fast to notice in some places". The cause is a constant that
was correct when it was written and was never re-derived.

The motion is a flywheel: scroll applies an impulse to a velocity, friction
bleeds it away, and the two constants are tied together so that one ~120px wheel
notch carries about one card:

    impulse = step * (1 - FRICTION) / 120

That was written out as the literal `0.019`, which is the formula solved for a
SEVEN-card ring: `51.43 * 0.045 / 120`. The ring has fourteen cards now. `step`
halved to 25.71 and the literal did not, so every notch carried 50.67 degrees —
two cards — and the deck went past at twice the rate anything in the file
claimed it would. The file even warns about this failure mode, from the other
direction: "Changing FRICTION without re-deriving WHEEL_K changes how FAR a
notch travels." The card COUNT changing does the same thing, and nothing said so.

It is derived from `step` at the call site now, so adding or removing a card
re-solves it. `FRICTION` moved to module scope to sit beside it, since a
constant and the thing derived from it drifting apart is the whole bug.

Also slowed, deliberately rather than by derivation: `FRICTION` 0.955 -> 0.97,
so the ring coasts longer and decays more gently, and the settle 0.12 -> 0.09,
because the settle is the last thing the eye follows and a snap there undoes an
otherwise unhurried coast. One notch now travels one card over about 2.0s.

**Why the obvious verification does not work here.** Counting how many cards the
front position advances is NOT a measure of angular travel on this ring: the
cards are spaced evenly along the CURVE, not evenly in the parameter, so a fixed
angle crosses a variable number of them. Repeated single-notch trials gave 1, 2,
1, 3 for deltas of 120, 120, 240, 360 — noise, not linearity, and the ambient
drift moved the ring between trials on top of that. What does work: hover first
(`drifts()` is false while hovering), then fire N notches on an N-card ring,
which is exactly one revolution if the derivation holds. Measured: net one card
off a full turn. And confirm the constant is actually live in the module Vite is
serving, not just on disk.

**One reading of the report I did not act on.** "Too fast in SOME PLACES" may
describe the rate VARYING around the curve rather than being uniformly high — a
Lissajous does not travel at constant speed, so evenly-spaced cards sweep past
faster through some regions than others. Evening that out means modulating the
angular velocity inversely to the curve speed, which is a different and much
larger change. The global slowdown addresses the fast regions too, so it is the
safer of the two readings to act on first.

## 59. Two bugs behind one screenshot: an unpayable toll and a name collision (2026-08-23)

Asked for a screenshot of the browser, and it showed the Urban Heat Islands
caption painted across the projects wheel. Alongside it came a report: after
reloading near the end of the page, you cannot scroll past the projects section.
Different causes, found together.

### The wheel's toll was denominated in the wrong currency

`SPIN_BUDGET = 360` holds the reader until the ring has turned once, which is a
promise about the RING. How much SCROLLING that costs depends on `WHEEL_K` and
`FRICTION`, so any change to how the ring moves silently changes how hard the
section is to leave. Section 58 halved `WHEEL_K` to slow the deck down, and
measured here, the toll went from about 13 notches to **27** — 27 notches
swallowed before the page moved at all. Slowing the deck down made it a trap.
That is the second time this section has been reported as inescapable.

The fix has the same shape as the offstage gate in section 54: let the
expressive mechanism be expressive, and add a second, dumber mechanism that
guarantees the floor. The angle decides when the ring has finished SAYING
something; a hard ceiling in scroll distance decides when the reader has PAID
enough. Whichever comes first.

Counted in scroll PIXELS, not in events, because a trackpad emits many small
deltas where a mouse emits few large ones — an event count would release almost
instantly on a trackpad and hardly ever on a mouse. Measured at `PX_BUDGET`
1000: 9 mouse notches x 120px = 1080px, and 56 trackpad-sized events x 18px =
1008px. Same distance, and the device no longer matters.

### `--heat` was a design token and a scroll signal at the same time

`opacity: var(--heat, 0)` on the About caption can never reach its own fallback,
because the name always resolves — `--heat` is also a gradient in tokens.css,
used as a background in layout.css and sections.css. So when the signal has not
been written, the declaration becomes `opacity: linear-gradient(...)`, which is
invalid, is dropped, and leaves the caption at opacity 1 over whatever is on
screen.

The window where nothing has written it is not theoretical. main.js returns
early when there is no WebGL — `if (!earth) return`, the supported CSS-starfield
path — and then nothing ever writes it, so those visitors get the Urban Heat
Islands copy nailed over the entire page, permanently. `--whole` and `--cost`
have no token of the same name, which is exactly why only this one misbehaved.

Renamed the SIGNAL to `--dive-copy`, not the token: fewer call sites, and the
token is a shared design value other files legitimately use. Verified by
clearing the signal to simulate the no-WebGL path — opacity resolves to 0 now
where it resolved to 1 before.

This is CONTEXT 48's "one element, one owner" one level up: one NAME, two
owners, two types. A custom property is a global. Signals and tokens should not
be able to meet in the same namespace by accident.

### Still open: reload does not land where it left

Measured: parked at scrollY 15893, reloaded, landed at 9642 — 6251px earlier.
The lazy chunks load after the browser has already restored the position, and
ScrollTrigger's pin spacers then re-measure, so the restored number no longer
points at the same place. That drop is what was depositing the reader back at
the projects section in the first place. The toll fix means they can now leave
it, but the jump itself is untouched, and fixing it means deciding whether a
reload should keep your place at all on a scrubbed page.

### Instrument notes

A synthetic `WheelEvent` never scrolls the page, so "the page did not move" is
not evidence of a trap — every dispatch reads as held. Check
`event.defaultPrevented` instead, which is what the handler actually decides.

And probes are not free: 40 dispatched notches spun the ring ~1028 degrees and
spent the budget, so every measurement after that showed a wheel that released
immediately. The signature of an already-released wheel is specific —
`defaultPrevented` false AND the ring not turning — and is worth recognising,
because it looks identical to "the handler is not attached".

Finally, a WebGL page cannot absorb unlimited reloads. After roughly ten, a tab
stopped initialising the earth at all: no signals written, no offstage
observers, `--disc-r` empty. It looked exactly like a deep-reload regression and
was context exhaustion. A fresh tab was correct on the first load.

## 60. The half of the wheel's toll that had never been measured (2026-08-23)

Section 59 fixed the downward toll and shipped. Reported straight back: still
cannot get past the projects section, going ABOVE it.

Measured: climbing back up out of the section cost 9 notches, 1080px — the full
budget again. The handler had never looked at which direction the reader was
going, and the observer re-arms on every exit, so every pass in either direction
was charged in full. Both previous fixes tested downward only, which is why two
rounds of work on exactly this trap missed it.

Going back up is navigation, not reading. The hold exists so the deck gets seen
on the way DOWN through the page; someone scrolling up has already passed it and
is going somewhere else, so the wheel now returns before it does anything at all
on an upward delta and the page gets the notch:

```js
if ((e.deltaY + e.deltaX) <= 0) return;
```

Direction from the raw delta rather than from the ring's own axis, because the
question is which way the PAGE would move, and that is the same question on a
horizontal ring as on a vertical one.

`PX_BUDGET` also cut 1000 -> 600. Three separate reports about this one section
being hard to get past is the section telling you the toll is too high whatever
the intent was, so the hold is now deliberately light: five mouse notches, half
a screen. Measured after: **up 0 notches, down 5 notches / 600px**, and the ring
still turns while held, so the beat still reads.

Spinning the deck BACKWARDS is unaffected — drag and the arrow keys both still
do it in either direction. Only the upward wheel gesture was reassigned, and it
was the one gesture the reader needs in order to leave.

The general lesson is about symmetry. A scroll-jacking mechanism has two
directions and a reader uses both; testing one of them is testing half the
feature. Every measurement in sections 53, 58 and 59 fired positive deltas.

## 61. A reload starts at the top, and two mechanisms had to be told (2026-08-23)

Measured before: parked at scrollY 15893, reloaded, landed at 9642 — 6251px
earlier and in a different section. The browser restores the offset before any
of this code runs; then the lazy chunks land and ScrollTrigger builds its pin
spacers, the document grows by thousands of pixels, and the restored number no
longer points at the place it was taken from. That drop is what kept depositing
readers back at the projects wheel on refresh.

Restoring it CORRECTLY is not really on offer. It would mean waiting for every
lazy module to initialise and every pin to be measured before jumping, and those
land on idle callbacks with no well-defined "done", so the jump would happen
late and visibly — worse than not jumping. And there is nothing to go back to:
this page is one scrubbed narrative, so a restored offset drops the reader into
the middle of an animation with no idea how they got there.

**Setting `history.scrollRestoration = 'manual'` alone did nothing.** Measured,
it read back as `"auto"` and the page still landed at 9642. ScrollTrigger keeps
its OWN scroll memory and restores it around a refresh, resetting the history
flag while it does — so whichever of the two is set first simply loses.
`ScrollTrigger.clearScrollMemory('manual')` tells it both things at once: forget
the remembered offsets, and leave restoration manual.

It also needs re-asserting after the first refresh, because the pins are not
measured at that point in main.js and the refresh that follows the lazy chunks
is the one that would otherwise move the reader. One shot, and the listener
removes itself, so a later resize refresh cannot yank a reading page to the top.

The hash is left alone, and that is the case worth not breaking: nav links are
`#about`, `#projects` and so on, and those are a deliberate request for a place,
unlike a restored offset. Verified both paths — no hash lands at 0; `#projects`
lands at 5477 with the section's top exactly at the viewport top.

The general shape is the same one as sections 54 and 59: when a guarantee has
more than one owner, setting one of them is not a fix, it is a coin toss over
which one runs last.

## 62. Three tags instead of six, and a visitor counter (2026-08-23)

### The tag field stopped repeating the paragraph next to it

The Cost of Inaction lead now ends "...expanding deserts, lost polar ice, and
unlivable cities", which was word for word what three of the six floating tags
said. At this size a floating label that restates the paragraph beside it is not
reinforcement, it is the same sentence twice.

Asked which half should give way; the answer was to keep the lead as written and
drop the three duplicates. So the field is Oceans getting dirty / Crops failing
in longer droughts / Heatwaves lasting weeks, not days — the three the lead does
NOT cover — renumbered to `--a/b/c` so `--ti`, the arrival stagger, stays
contiguous from 0.

The phone placements were not re-derived: the three kept are exactly three of
the six already measured clear at 185 / 177 / 227px from a 136px disc, and they
happen to be the best spread of the six (upper left, middle right, lower left).
Re-measured after: 3 tags, 546 / 435 / 450px from a 254px disc on desktop, none
on the globe, none off screen, none touching the caption, no pair overlapping.

Note the copy pipeline needed a re-baseline. `--write` reported "nothing to do"
because index.html and site-copy.md were edited to agree by hand, but the lock
still listed tag4/5/6, so the recorded baseline described a page that no longer
existed. `--export` is the sanctioned fix when the HTML is the correct side;
verified it left site-copy.md byte-identical and only rewrote the lock.

### A visitor counter in the footer

Static pages cannot keep a number, so `api/visits.js` is a Vercel function —
that directory is picked up with no build configuration. GET reads, POST
increments and returns the new value in one round trip.

**It counts visitors, not page views**, and that decision is made in the browser
from a date in localStorage. A page-view counter on a site like this mostly
counts the author reloading it; this session alone would have added dozens.
Keeping the "have I counted this person" state client-side is also what keeps
the server side free of anything identifying: one integer under one key, no IP,
no user agent, nothing to link a count to a person. A visitor who clears storage
or uses a second browser counts twice, which is the honest cost of not tracking
anyone.

**Unconfigured is a normal answer, not an error.** Until a store is attached
there are no env vars, and the function replies `{configured: false}` with a
200. The footer element ships EMPTY and `hidden`, and is only filled and
revealed once a real number arrives — so a missing store, a blocked request, or
a dev server with no functions all leave the footer looking exactly as it did
before, rather than showing a zero that is not true. Empty markup also keeps it
out of the site-copy tooling, which only collects elements carrying words.

`[hidden]` is declared explicitly, because the footer makes its children flex
items and `display: flex` would otherwise beat the UA stylesheet's
`display: none`.

Tested without deploying: the handler was exercised directly for all six paths —
no env, GET, POST, a key never written (null -> 0), an Upstash 500, and a thrown
request — confirming the URLs `/get/visits:total` and `/incr/visits:total` and
`Cache-Control: no-store` throughout. The browser half was checked against a
stubbed endpoint for first visit (POST), same day (GET), next day (POST), and an
unconfigured reply (stays hidden).

**Still needs provisioning to show anything.** Attach a KV / Upstash Redis store
to the Vercel project; it injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`,
which is all the function reads. Until then the footer simply omits the line.

## 63. The counter accepts whatever the store is called (2026-08-23)

Section 62 shipped `api/visits.js` reading `KV_REST_API_URL` and
`KV_REST_API_TOKEN`, the names Vercel's own KV product used. That product no
longer exists as a separate thing, and the replacement does not use those names:
attaching Upstash Redis through the Marketplace gives `UPSTASH_REDIS_REST_*`,
`vercel integration resource connect --prefix` can put anything in front, and
anyone pasting values in by hand picks whatever seems obvious.

Reading one pair and calling everything else "not configured" turns a naming
difference into a silent failure whose only symptom is a footer with no line in
it — indistinguishable from not having set anything up. So all four plausible
pairs are accepted, most specific first, and the URL is stripped of a trailing
slash because half the dashboards show it with one.

`?debug` reports which variable names were FOUND, and which it looks for, as
names and booleans — never a value or a fragment of one. That is the difference
between "attached but misnamed" and "never attached", which is otherwise
invisible from outside.

Verified against all four naming routes, a trailing-slash URL, a half-configured
pair (url set, token missing -> not configured), and nothing set.

The lesson is the same one as the `--heat` collision in section 59, one layer
out: a contract with the outside world should be permissive about the shapes it
accepts and strict about what it promises, and "I could not find my input" is
something to report, not something to fail silently on.

## 64. The scroll rule rewritten: spatial, no toll (2026-08-23)

Sections 53, 58, 59 and 60 are all the same bug being treated four times. Each
one kept the premise — the wheel claims a large region and the reader is let go
after paying something — and argued about the price. The section was still
reported as hard to get past. The premise was the bug.

**The rule now, entire:** scrolling over the area where the front tiles move
turns the tiles; anywhere else scrolls the page. No budget, no direction test,
no re-arming, nothing that runs out. Outside the zone every event is left
untouched, in both directions, indefinitely, on the first encounter and the
tenth. Getting out is a matter of where the pointer is, which is visible, rather
than how much has been spent, which is not.

### Defining "where the front tiles move"

Taken literally — the tiles' current boxes — it is a trap, and this was measured
earlier: the ring drifts on its own, so a region built from where tiles ARE
slides out from under a stationary cursor, and a reader scrolling in a gap gets
a tile drifting under the pointer and the page stops mid-gesture. 31% of the
stage was over a tile at any instant and which side of the line you were on
changed by itself.

The fix is the union over a full revolution rather than a snapshot. That is
still exactly where the front tiles move — it is the corridor they sweep — but
it is a property of the geometry, not of the clock, so it cannot change under a
cursor that is not moving. The previous attempt solved the same problem with a
fixed rectangle in the middle of the stage: stable, but it claimed a lot of
ground no tile ever visits, and it was not the rule anyone asked for.

Built as a 72x48 occupancy mask, not a bounding box, because the swept corridor
is a curve and its bounding box would hand the wheel the empty corners the curve
arcs around. Rebuilt only when the solved fit changes, since that key already
covers every input — viewport, card box, perspective, type size.

`onTile`, the touch test, now delegates to the same function. It used to
hit-test live tile boxes while the wheel used a different region entirely, so a
phone and a desktop were answering two similar but non-identical questions.

### Measured

Projection maths checked against reality first: 131 live front-tile centres
sampled over 20 frames, all 131 inside the computed corridor.

| | desktop 1184x686 | phone 375x812 |
|---|---|---|
| share of the stage | 53.7% | 68.6% |
| share of the viewport | 42.6% | 35.6% |

Desktop, by point: stage centre takes the scroll down AND up and still on the
30th consecutive notch — there is no toll left to run out — while all four stage
edges leave every event to the page.

Touch, on the phone, against a no-swipe control: drift alone moves card 0 by
0-3px in the window, a swipe at the left edge by 7-8px (that is the settle
snapping to the nearest card, not a drag), and a swipe at the stage centre by
81-119px. An order of magnitude apart.

Raising the threshold barely tightens it — 0.55 gives 42.6% of the viewport and
0.90 still gives 37.5% — because perspective makes front tiles large, so even
the frontmost one alone sweeps a wide corridor. ~40% is simply the honest size
of "where the front tiles move", so the threshold stays tied to the plate
definition and means one thing throughout the file.

**The trade being made, stated plainly:** inside that region the page will not
scroll at all, by design, forever. That is strictly worse than a toll for
someone who does not realise they can move the pointer, and strictly better for
everyone else, because the region is where the tiles visibly are and the escape
is the margins rather than a hidden quota. On a phone the risk is sharper — the
stage sits mid-screen and a thumb naturally swipes there — so the number to
watch is that 35.6%, with the page above and below the stage always free.

### Instrument notes

A synthetic `PointerEvent` cannot test this directly: `setPointerCapture` throws
on a pointerId that was never real, which aborts the handler before it turns
anything, so every simulated touch reads as "not claimed" whatever the zone
says. Stub the capture methods, then measure whether the ring MOVED.

And "the front card changed" is not a measure of a gesture here. Ambient drift
changes it on its own within seconds, and tiles are spaced by arc length so they
travel at very uneven speed — a single control window is not a baseline. Take
several, and compare path length in pixels.

## 65. Project copy gets its own document (2026-08-23)

`docs/site-copy.md` covers the front page, `docs/timeline-copy.md` the
Background timeline and `docs/speech-bubbles.md` the map. The project cards had
no equivalent: their words lived only in `src/data/projects.js`, 28 KB of nested
object literal where a stray apostrophe is a syntax error rather than a typo.
`docs/project-copy.md` and `tools/sync-project-copy.mjs` close that gap, same
shape as the other three — `--export` rebuilds the doc, no flag is a dry run,
`--write` applies.

**It edits in place rather than regenerating.** The obvious implementation —
import the module, edit the object, print it back — would delete all 29 comments
in that file, and they carry what the numbers mean. So the tool scans for the
exact source span of each string literal and replaces only that span.

The scan is quote-aware rather than line-based, because 284 strings in that file
contain an escaped quote and a line regex mangles those in a way that surfaces
much later as a stray backslash on a card.

**Two scanner bugs worth recording, because both were silent.** Paths came out
as `0.thesis.cat`: the root container was being opened twice, once as the seed
stack entry and again by the loop, pushing an empty segment. And array indices
never advanced, so four metric objects all produced `metrics.0` — every row in
every array shared one key. That second one is the dangerous kind: the doc is
parsed into a Map, so duplicate keys collapse into one and edits to the second,
third and fourth metric would have gone nowhere while reporting success. Caught
by checking that 132 keys were 132 UNIQUE keys, which is worth doing whenever a
generated key is supposed to be an identity.

Verified: a plain edit lands and the module still parses; a value containing an
apostrophe, a double quote and a backslash round-trips exactly; and restoring
the doc from a pristine source and syncing back leaves projects.js
byte-identical with all 29 comments intact.

Structure is deliberately NOT editable from the doc — which projects exist, how
many metrics each has, image paths, embed keys, links and tag lists stay in the
source, because their shape matters as much as their text.

## 66. The heat map frame withdraws before the next one arrives (2026-08-23)

Reported as the heat map just scrolling away normally instead of handing over.
Measured, and it was worse than that: `#direction` entered the viewport at y3875
with the map at FULL opacity, and the map never faded at all — it held 1 from
y3375 to y6075 while the next section climbed over the top of it. The caption
did fade, but across y3789-3981, which is precisely when `#direction` was
arriving. Two frames dissolved into each other, which is why the whole handover
read as an ordinary scroll.

**Anchoring the exit a viewport earlier is what separates them.** The tail
trigger was `bottom bottom` -> `bottom top`, which starts at the exact instant
the sticky stage lets go and the next section starts climbing. It is now
`bottom bottom+=100%` -> `bottom bottom`, so the whole departure happens while
`#direction` is still below the fold. Its own reveals then fire as it enters,
which is afterwards, without being held back by anything — the sequence comes
from the geometry rather than from a second mechanism co-ordinating with this
one. The runway comes out of the 175vh tail `.about--overmap` already carried,
so nothing got longer.

Words lead, the map follows, and they overlap on purpose: the map starts going
at 0.40 while the caption is finishing at 0.45, because two cleanly separated
fades read as two events where what is wanted is one frame withdrawing.

### Fading the plate alone was wrong, and looked it

First attempt faded `#riyadh`. Measured after: the map read 0 and the screen was
a flat warm wash — the WebGL canvas behind it, still showing the dived-in planet
surface with nothing on it. That is worse than the overlap it replaced, because
an unfinished state reads as a bug where an overlap only reads as clumsy.

The canvas, the scrim, the heat wash and the plate are all children of
`.worlds__stage`, so the exit belongs there: `--frame-out` is published from the
tail and the stylesheet fades the stage. One frame withdrawing, not a plate
lifting off a backdrop that stays.

### And the map got a single owner on the way

The dive fades the plate IN, the tail fades the frame OUT, and both used to be
free to assign `riyadh.style.opacity` directly — the same "one element, one
owner" collision as CONTEXT 48 and as the `--heat` name clash in 59. Whichever
fired last would win, so scrolling back up through the handover left the map at
whatever the other one had decided. They publish intentions now (`mapIn`,
`mapOut`) and one painter resolves them.

### Measured after

| | desktop 1184x686 | phone 375x812 |
|---|---|---|
| caption gone | y3375 | y4107 |
| frame gone | y3725 | y4457 |
| #direction enters | y3825 | y4557 |
| its heading readable | y4425 | y5157 |

Strictly ordered on both, with about 100px of cleared ground between the frame
leaving and the next section arriving.

## 67. Thesis card: stats checked against the database, layout opened up (2026-08-23)

### The numbers were audited, not retyped

Every metric on the thesis card was recomputed from `public/uhi-twin/db`, the
frozen snapshot the embedded dashboard runs on — so the card and the dashboard
underneath it cannot disagree.

| claim | data | verdict |
|---|---|---|
| Monthly RMSE 0.96-1.91 °C | monthly lst_day 0.98-1.87 across the five cities | overstated at both ends |
| r ≥ 0.85 MODIS vs Landsat | nothing in the snapshot to check it against | **unverifiable — removed** |
| 1.37M at-risk residents | 1,365,862 = the TOP HVI quintile exactly | right number, ambiguous label |
| ~5.5M in the footprint | 5,542,572 over 12,390 cells | correct |

The 1.37M case is the interesting one. The figure is exact, but the database's
own `pop_at_risk` field means the top TWO quintiles and totals 2,479,809 — so
"at-risk residents" pointed a reader at 2.48M by the study's own definition
while showing 1.37M. Relabelled to name the quintile. A number can be correct
and still mislead, and that is not visible from the number.

`r ≥ 0.85` was replaced with R² 0.91-0.99, which the snapshot does support
(monthly day and night models, all five cities). Removing a claim nothing can
check is not a downgrade — an unverifiable statistic on a research card is worth
less than a smaller one that holds.

### Five columns, and the plate gets its own row

The city list was five full-width rows stacked under the copy, which is why the
animated plate behind it had nothing left: rows plus paragraph claimed the whole
frame. Five columns puts it on one line of the layout instead of five.

In the modal the canvas also stops being a backdrop. On the page it is
full-bleed behind the copy with a raking scrim keeping the headline legible;
in a panel a third the width, that puts the lead paragraph straight across the
surface and the plate reads as a texture rather than a figure. Inside `.modal`
it becomes a stack — words, then figure in a row of its own.

The rows have to be assigned explicitly. The canvas comes FIRST in the markup,
because on the page it is painted behind everything, so left to source order the
grid handed it row 1 and it grew to 777px above the words. Measured after: words
end at 1064, plate starts at 1078, overlap 0.

### Still blocked on the manuscript

The abstract, the intervention results and the two diagram rebuilds all need
source material that is not in this repo. `assets/img/thesis_arch.webp` and
`thesis_pipeline.webp` are manuscript figures and ARE here, but they disagree
with the shipped copy — they show a Streamlit dashboard where the site says
FastAPI + deck.gl + MapLibre, and "48-Hour Forecast RMSE < 1.5 °C" where the
measured monthly range is 0.98-1.87. They look like an earlier draft, so they
cannot simply be traced.

## 68. The thesis card, rebuilt from the manuscript (2026-08-23)

Source: `E:\KFUPM\uhi_digital_twin_v2\CORRECTED_manuscript.md`.

### A correction to section 67, which was wrong

Section 67 "verified" the card's statistics against `public/uhi-twin/db` and
changed two of them. The manuscript says otherwise, and the manuscript wins:

| | §67 changed it to | manuscript |
|---|---|---|
| Monthly RMSE | 0.98-1.87 °C | **0.96-1.91 °C by day**, 0.79-1.29 by night, r 0.94-0.99 |
| MODIS vs Landsat | removed as unverifiable | **R > 0.85 in all five cities** |

Both original figures were right and I retired one of them. The snapshot is a
frozen export the embedded demo runs on; the thesis is the result, and the two
are not the same dataset. **Checking a claim against the nearest available data
rather than against its source can retire a true statement** — which is a worse
outcome than leaving it unchecked, because it looks like diligence.

What did survive: 1.37M is exact, and the label "at-risk residents" was
genuinely ambiguous, since the database's own `pop_at_risk` field means the top
TWO HVI classes and totals 2.48M. It now names the Very-High class.

### Findings first, abstract second

The abstract is 2,250 characters, which is where a card loses the reader it just
earned. It also names its own structure — "three findings. First... Second...
Third..." — so those come out as three cards and the abstract goes behind a
disclosure. Nothing is removed; the order is reversed to put the conclusions
before the compression.

### The worked example became the actual result

The card quoted the Dammam pair (16,167 against 602) as a worked example. Those
numbers were right, but they are one row of a five-row finding, so the pattern
they were chosen to illustrate could not be seen. Tables 5.22 and 5.23 are both
there now — per-cell cooling by measure and city, and cells/residents reached.

Each cell carries a bar behind its number. Two scaling decisions matter:

- **Cooling bars scale to the whole table**, not per row. Per-row normalisation
  would make Makkah's zero-coefficient greening as long as Dammam's -3.10, which
  is the one comparison the figure exists to make.
- **Reach bars use a square root.** Dammam's 16,167 against NEOM's 2 is 8,000:1,
  and on a linear bar every city but the top two is an invisible sliver — the
  figure would show one fact and hide four. The exact number is printed beside
  the bar, so the bar carries the shape and the digits carry the value.

### Diagrams: HTML, and the roadmap lane is gone

Rebuilt from Figures 4.1 and 4.2 as HTML boxes in auto-fitting grids rather than
SVG at hand-placed coordinates. The old version could not reflow — a longer
label overflowed its rect and the figure had to be re-solved by hand — and had a
720px floor, so a panel narrower than that scrolled sideways.

The `ROADMAP — DESIGNED, NOT DEPLOYED` lane is removed, and the distinction it
was drawing is restored to what the manuscript actually says: the streaming
layer is **built and it runs**, it is simply "started manually and not part of
the default deployment". Calling it a roadmap understated finished work;
drawing it solid would have claimed a live Kafka cluster. Dashed, with the
reason written on it, is the honest middle.

### One type scale, not a dozen clamps

The panel had accumulated per-element sizes, so "smaller on a phone" meant
re-tuning each one and the RELATIONSHIPS drifted every time: a heading two steps
above its body on a desktop ended up one step above it on a phone. There is now
a single `--ms` root on `.modal` with every size a ratio of it, so one number
moves the whole hierarchy and it keeps its proportions. 16 -> 15 -> 14px across
the two phone widths.

### A bug the removals exposed

Deleting `twin.note` printed the literal string "undefined" into the panel: the
template interpolated it unguarded. Worth noting because it is invisible in the
data — the field was simply gone, correctly — and only shows up on screen.

## 69. The ambient gradient broke modal scrolling (2026-08-23)

Reported immediately after 68 shipped: the project panel could not be scrolled.

`.modal__panel` is `position: absolute` with an inset, and that is the whole
mechanism — it is what constrains the panel to the viewport so that
`.modal__inner`, the actual scroller, has a bounded height to scroll inside. The
ambient-gradient rule was written as:

```css
.modal__panel { position: relative; isolation: isolate; }
```

`isolation` was the point; `position: relative` was typed alongside it out of
habit, because a decorative `::before` usually needs a positioned parent. Here
the parent was already positioned, and overriding it took away the constraint:
the panel grew to its content — 5089px against a 686px viewport — so
`.modal__inner` had nothing left to scroll and 1016px of the card was clipped
off the bottom with no way to reach it.

Measured after removing the one declaration: panel back to `absolute` at 645px,
inner 5046px of content in a 619px box, scrolls to the last pixel. On a phone,
6695px in a 737px box, also to the last pixel, with no sideways overflow.

**The lesson is about reflexes.** `position: relative` on the parent of an
absolutely-positioned pseudo-element is correct so often that it gets typed
without checking whether the parent is already positioned — and when it is, the
override is silent, because nothing about a gradient suggests it could disable
scrolling three elements down. Add `isolation` alone; add `position` only after
checking there is not one already.

## 70. Justification, done properly this time (2026-08-23)

Reported as the text still not being justified. Two faults, both mine.

**The list only covered a third of the paragraphs.** Four classes were named —
`.mabs`, `.mdesc`, `.mprose > p`, `.mmethod`, `.mtwin__lead` — and eight more
were not: the finding cards, the simulator lead and footnote, both diagram
captions, the table captions and the atlas lead. Every block added after the
rule was written would have missed it too, which is the failure mode of
enumerating class names for something that is really a ROLE. It now selects
paragraphs inside the panel and lists the exceptions — labels, single phrases,
table cells — once, in one place.

**And my own opt-out was switching it off exactly where it was reported.** There
was a `max-width: 560px` block turning justification back to left on phones,
which is why a 375px viewport showed ragged text. The argument for it is real —
a narrow measure distributes badly — but it was not mine to apply against an
instruction, and the identical opt-out had already been removed from the hero
copy earlier in this session for the same reason. Twice is a pattern: a
typographic preference kept reasserting itself as a breakpoint. `hyphens: auto`
is what actually makes justification hold at this measure; it does the work the
opt-out was avoiding.

Measured after: 375px, 12 paragraphs, all justified. 1184px, 14 paragraphs, all
justified, with the result tables keeping their own right/left alignment.

**A CSS escape that a heredoc ate.** `content: '\2212'` for the open-state minus
went through a shell heredoc into Python, which read `\221` as an octal escape,
so the stylesheet shipped `content: '2'` and the control read "READ THE FULL
ABSTRACT 2". It renders as a plain digit, which looks like a typo rather than
like broken markup, so nothing about it says "escaping problem". A literal `−`
avoids the whole class of it — worth preferring in generated CSS whenever the
character is typeable.

## 71. The result figures became figures (2026-08-23)

Asked for the figures to be graphical rather than tabular. Both are now drawn,
and both stayed honest about their scales.

**Cooling: a heat grid.** Still a `<table>` underneath — it is tabular data with
two headed axes, and a screen reader should get rows and columns rather than a
list of coloured divs. What changed is that each cell carries its value as
colour as well as printing it, so the pattern the figure exists to show is
visible before a number is read: cool pavement is a solid amber band straight
across all five cities (the reflectivity levers sit on a physics-based albedo
term and behave alike everywhere) while the vegetation rows vary wildly.

Intensity is `|value|` against the strongest cell in the WHOLE grid, so the
comparison is across the figure rather than within a row.

Makkah's zero is **hatched, not blank**. A blank cell reads as missing data, and
this zero is a measured result — the city's NDVI coefficient really is zero. The
key says "measured zero" for the same reason.

**Reach: a grouped bar chart.** "A water feature reaches 16,167 and a cool
pavement reaches 602" is a sentence you have to do arithmetic on; two bars of
visibly different length is the same fact arriving before you finish reading.
The entire argument of the simulator is that one is 27× the other, and a table
could not make that land.

The axis is a square root, and the key SAYS so. 16,167 against NEOM's 2 is
8,000:1 — on a linear axis four of the five cities are an invisible sliver, so
the figure would show one fact and hide four. A chart with a non-linear axis
that does not declare it is lying about proportion, so the note is not optional
decoration. Every bar prints its exact figure, so the bar carries the shape and
the number carries the value.

Bars have a `min-width` of 5.5rem: NEOM's 2 residents would otherwise be a bar
too short to hold its own label, and a value you cannot read is not plotted.

Verified at 375px: the grid scrolls inside its own box, every bar's label fits
inside its bar, the page never scrolls sideways.

## 72. Landmark labels bolded, two claims dropped (2026-08-23)

The `.msec` section headings were weight 400 in a mono face at label size, which
gave them no more emphasis than the body they were meant to divide — and they
are the only landmarks in a panel that is now several screens long. 700, with
the colour stepping up as well, because weight alone does not carry at that
size. Same for the diagram layer names and the figure caption lead-ins.

Two claims removed at request, and both are worth recording as CHOICES rather
than corrections, because the record above them says the opposite:

- `R > 0.85 · MODIS vs Landsat` — the manuscript supports it. Section 68
  describes restoring it after I wrongly retired it against the dashboard
  snapshot. It is now gone again, deliberately.
- The `→ 0 by 2030` finding card. The claim itself stays in the abstract
  verbatim, where the paper makes it in its own words and with its own
  qualifications; what is gone is only its promotion to a headline card.

The finding cards renumber themselves from their index, so removing the middle
one left 01 and 02 rather than 01 and 03, and `auto-fit` collapsed the empty
third track so the two remaining cards split the row evenly at 484px each.
Nothing needed adjusting for either — worth noting only because a hand-numbered
list and a fixed three-column grid would both have needed it, and this is the
argument for deriving presentation from data rather than writing it out.

## 73. Connecting dashes removed from the panel, and air between sections (2026-08-23)

The no-connecting-dashes rule has stood since the start of this work and I broke
it repeatedly in the copy written over the last few sections — seven fields in
the thesis card and three strings in the diagrams. Worth noting HOW: none was a
decision. Each one arrived while writing a sentence that had two clauses, which
is exactly the shape the rule exists to prevent, so the rule needs applying at
the point of writing rather than as a pass afterwards.

Three of them were in the abstract, which is supposed to be verbatim, and all
three were introduced by me rather than present in the manuscript:

| manuscript | what I had shipped |
|---|---|
| `five desert and coastal cities: Riyadh, ...` | `cities — Riyadh, ... — is` |
| `intensity (or urban cool-island), and` | `intensity — an urban cool-island — and` |

Both are now closer to the source than before the fix, which is the point: a
verbatim quotation that has been silently re-punctuated is not verbatim, and
nothing in the card said it had been touched.

Remaining em dashes: one inside a `mailto:` subject line, which is a URL rather
than prose.

**Spacing.** The panel had grown to findings, abstract, stat band, two diagrams,
two figures and a tag list, all on the same 2.25rem rhythm as the paragraphs
inside them, so the column read as one continuous run. The heading owns the gap
now rather than the block above it — one rule to change, and top margins on
headings collapse predictably.

A `:first-of-type` exception was written and removed rather than fixed. It never
matched: `.msec` is a `<div>`, so `:first-of-type` means the first DIV among its
siblings, not the first `.msec`. It was also unnecessary, since the first
heading sits below the findings rather than at the top of the panel. A rule that
does nothing is worse than no rule, because the next reader assumes it works.

## 74. One type scale, actually applied (2026-08-24)

Reported as the text jumping between big and small with no consistent
hierarchy. Measured, and that is exactly what it was: **fifteen distinct sizes
in one panel** — 40.7, 38.4, 28.5, 21.3, 19.2, 17.9, 16, 14.4, 14.1, 12.6, 12.5,
11.7, 11.5, 10.9, 10.4.

Section 68 introduced a `--ms` scale of eight steps and hooked about a third of
the panel to it. Everything else kept its own `--fs-*` value and landed a
fraction off a step: 14.4 beside 14.1, 12.6 beside 12.5, 11.7 beside 11.5.

**Those near-misses are the actual fault, not the range.** A difference of a
third of a pixel is not read as hierarchy — it has no meaning to convey — so it
reads as sloppiness instead. A panel with eight sizes that are clearly distinct
looks deliberate; the same panel with fifteen sizes, seven of which are almost
another one, looks like nobody chose. Where a size sat between two steps it went
to the nearer one rather than becoming a ninth step, since a scale's usefulness
is that it is short.

Measured after: **exactly eight sizes, all of them steps on the ladder.**

The last one to go was `.ml`, the action links, at 12.6 against 12.5. Worth
chasing a tenth of a pixel not because anyone can see it but because it means
the number came from somewhere else, and the next change to the scale would have
left it behind.

### The plate was offset for a layout it is no longer in

On the page the atlas plate sits right of centre because the headline and city
list occupy the left band. Section 67 moved the copy ABOVE the canvas inside a
modal, into its own grid row — so there was nothing left to clear, and the same
offset simply parked the figure against the right edge with dead space beside
it.

The condition is `section.closest('.modal')`, not a width. Those are different
questions: a wide desktop modal is well over the 900px narrow breakpoint and
still has no side column, so a width test would have kept the offset exactly
where it was wrong.

### Removed

The thesis Method paragraph, at request. `method` remains on the other three
research projects, which still render it.

## 75. The GIS card, and a test that measured the wrong project (2026-08-24)

Three edits to `gis`: the co-author removed from the byline, the "Key finding"
sentences cut from `desc`, and the method chain turned into a figure.

**`desc` after the cut says what the work IS.** It had been carrying the
findings — "NDBI is 255× more predictive", "4.18× larger", "proving that
temperature-only mapping dangerously under-estimates" — which the abstract
already states, with the qualifications a claim like that needs. A card summary
repeating a paper's conclusions in stronger language than the paper uses is the
wrong place for them twice over.

**`method` became `methodFlow`.** It was one line of arrow-separated text: nine
stages readable as a sentence and useless as a method, because nothing showed
where a stage ended, which stages belonged together, or that the last two are
CHECKS on the result rather than more processing. It is now four phases —
Acquire, Structure, Analyse, Locate and test — with numbered steps.

Numbering comes from the render index, so inserting a stage renumbers the rest;
the phases are the paper's own five-step structure. `method` as a plain string
still renders for the three projects that use it.

### The test was measuring a different project

Worth recording in full, because everything about it looked like a pass.
Clicking `[data-modal="gis"]` and then asserting `sultanGone`, `keyFindingGone`
and `arrowChainGone` returned true for all three — and the modal on screen was
the THESIS. The wheel only opens its FRONT card (CONTEXT 47), so the click had
opened whatever was at the front, and every assertion was a check for the
ABSENCE of something, which is trivially true in a document that never contained
it.

**Absence assertions cannot tell you they are pointed at the wrong thing.** A
test that only asks "is X gone" passes hardest when nothing is there at all. The
one assertion that would have caught it immediately — is the right project even
open — was the one not being made, and the fix was to check the title first.

Getting the right card to the front then needed a drag rather than scroll
notches: the spin budget from section 71 releases after 600px, so a
wheel-notch loop stops turning long before an arbitrary card comes round. Drag
has no budget, which is the correct asymmetry, and it took 15 drags.

## 76. The type scale, fixed at the source instead of by list (2026-08-24)

Reported again, on the GIS card this time. The offenders were the publication
block: `.mpub__authors` at 14.4 against the 14.1 step, `.mpub__venue` and
`.mpub__status` at 11.7 against 11.5.

**The reason it kept coming back is worth more than the fix.** Section 68
declared the scale on `.modal` and then added `.modal .x { font-size: var(--ms-*) }`
overrides for each element — a list maintained by hand, layered over base rules
that kept their own `--fs-*` values. Anything not on the list shipped off-scale,
and the list could only ever contain what I had happened to look at. The
publication block exists on the three papers and not on the thesis, so the audit
in section 74 was run against a card that does not have one.

That is the same failure as section 75's test: **verifying against one instance
and generalising**. Twice in two days, both times with a passing check.

So the base rules take the scale directly now, and the override list is deleted.
The scale moved to `:root` so it resolves outside a panel too, with `.modal`
still overriding `--ms` itself, which is what makes the hierarchy shrink together
on a phone.

A static audit — every modal-scoped `font-size` declaration that does not
reference `--ms` — went from 39 to 0. Three more came from other stylesheets
entirely: `.tag` from base.css, and the thermal embed's own headings from
sections.css, which arrive inside a panel carrying page-sized type. Those are
scoped rather than changed, because they are shared page components.

Verified by opening every research project in turn and checking each rendered
size against the eight steps: thesis, temp, gis, its, iot, sound — all clean.
Checking one and stopping is what caused this.

### Arrows

The method flow now has them, and they are real elements in the markup rather
than pseudo-elements, so they WRAP with the steps. A pseudo-element pinned to a
box edge cannot: on a narrow panel the last item of a wrapped line would have an
arrow pointing off the side. As flex items they reflow with the boxes and rotate
to vertical when the steps stack.

## 77. The IoT architecture image was the method (2026-08-24)

`assets/img/iot_arch.webp` sat under "Maps & Visuals" and drew exactly what the
`method` string said: seven boxes, six arrows, sensors through to the dashboard.
Two problems in one.

**It was filed as a result.** "Maps & Visuals" is where a project's outputs go —
the thing the work produced. A system architecture is not an output, it is how
the work was done, and a reader looking for what this project FOUND had to scroll
past a diagram of its plumbing to discover there wasn't one there.

**And it was a picture of text.** White background, colours belonging to no part
of this site, fixed width, and a port number that could only be corrected by
reopening an image editor — every fault the note at the top of diagrams.js
records about the two WebP diagrams that were replaced in section 68. Keeping it
and only moving the heading would have preserved all of that.

So it is drawn instead, as a `methodFlow` of four phases: Collect, Stream,
Store, Serve. The ports are kept — 1883, 9092, 4040, 5432, 8501 — because they
are what separates a diagram of a system someone built from a diagram of a
system someone sketched. The raster and the duplicate `method` string are both
gone; the information is entirely preserved and now takes the panel's own type,
colour and reflow.

The card no longer has a "Maps & Visuals" section at all, which is correct: it
never had visuals, it had one diagram in the wrong place.

## 78. A credit removed in one place and left in five (2026-08-24)

Asked to remove a co-author's name from the IoT card. Grepping first found it in
more places than the one asked about — and, more to the point, in a place the
EARLIER removal should already have caught:

| where | what it was |
|---|---|
| `projects.js` gis `pub.authors` | removed in section 75 |
| `index.html` gis card | **still there** |
| `projects.js` iot + temp `cat` | still there |
| `index.html` iot + temp cards | still there |
| `iot-twin.html` credit line | still there |

Section 75 removed the byline from the GIS MODAL and reported it done. The card
on the wheel carries its own copy of the same line in `index.html`, and it kept
still carrying the co-author credit the whole time. The report was true about
what it changed and wrong about what a reader would see.

**A name in a codebase is not one string.** The same credit appears wherever the
project is described — the data, the card, and in this case inside the embedded
dashboard — and a removal that fixes only the copy someone happened to point at
leaves the others to be found later, one report at a time. Grep for the name,
not for the line that was mentioned.

### One left deliberately

`its.pub.authors` was a four-name list.
That is a four-person group project, not a co-author credit, and striking one
name from a team list while keeping the other two makes a specific claim about
who did the work. Flagged rather than removed.

## 79. The name came out of the record too (2026-08-24)

The four-name group list on `its` was the last one on the site, removed at
request. Worth a line about `docs/CONTEXT.md` itself: sections 78 and this one
described the removal by quoting the name, and this file is committed to a
public repository. A credit taken off every page while the engineering notes
beside it still spell it out has not really been taken off.

So the record says "the co-author credit" and "a four-name list" instead. The
lesson those sections carry is about grepping for a name rather than for the one
line someone pointed at, and about a removal that edited the modal while the
card kept its own copy. Neither needs the name to make sense.

## 80. The Multi-City card still had the old project's name (2026-08-24)

Reported as the tab being wrong for what the dashboard now contains, and it was:
the title read "3 Cities · GPU Hexbin Pipeline" while the card's centrepiece is
the 134-city Landsat dashboard that replaced the MODIS build on 2026-08-20.

The comment in `projects.js` already said to read the counts off
`public/assets/data/lst/index.json` rather than trust the comment, so that is
where these came from: **134 cities, Tromsø 69.65°N to Punta Arenas 53.16°S, 78
northern and 56 southern.**

The metrics had the same problem and were arguably worse, because they were
CAREFULLY honest about the wrong thing: "3 · Cities, a demo sample not a study
population" and "25,905 MODIS measurements" are true, well-qualified statements
about a pipeline demo that is no longer what the card is for. A caveat on a
headline figure does not help when the figure itself is describing the previous
version of the work. They lead with the dashboard now, and the demo keeps one
line at the end.

**What made this outlive the rebuild** is that the replacement was thorough
everywhere except the label. The twin section was rewritten to say 134 cities,
`desc` was rewritten to explain that three points always fall near a line, the
scatter caption was rewritten to say the same — and the title, which is the
first thing anyone reads and the only part visible without opening the card,
kept the old name. A rename is not finished until the thing is renamed where it
is READ, not only where it is described.

Fixed in the data, the card markup and the aria-label. The card carries its own
copy of the title in `index.html`, which is exactly the split that left a
removed credit on screen in section 78 — checked this time before reporting.

## 81. Checking the Multi-City tile found an error the rebuild left behind (2026-08-24)

Asked to check whether the tile's text is correct. Reading every claim against
`public/assets/data/lst` rather than against the card found one that is not.

**"Cities carry between 6 and 24 usable acquisitions" — the floor is 2.** Read
across all 134 per-city files: Perth has 24, Dar es Salaam has 2. Corrected, and
the note now names both ends, because "2 to 24" without the reason invites the
reader to assume the low end is a bug rather than cloud.

The number matters more than it looks. A city resting on two frames has a mean
computed from two acquisitions, and the card offers those means on a common
scale — so the floor is the reader's cue about how much weight any single city
carries.

Everything else checked out: 134 cities, Tromsø 69.65°N to Punta Arenas 53.16°S,
78 north and 56 south, Landsat 8/9 Collection 2 Level 2 band ST_B10 at 30 m,
1 Nov 2024 to 30 Nov 2025.

**One claim I could not verify: R² 0.688.** It appears in `desc` and now in the
metrics, and it is not in the payload or in lst-twin.html — the dashboard
computes its fit at runtime. It is not disputed, only unchecked, and it is
flagged here rather than left to look verified because everything around it now
has a source.

### Method and gallery

The method still described the retired MODIS demo — Colab, a 10% cloud filter, a
25,905-row CSV, Kepler.gl — all true of the three-city pipeline and none of it
true of the dashboard the card leads with. Replaced with the Landsat pipeline as
a `methodFlow`: Acquire, Mask, Grid, Fit. `grid: 96` and `window: 0.12` in the
payload are a 96 × 96 raster over a 0.12° box, confirmed by opening a city file.

Maps & Visuals removed at request. The Kepler.gl recordings stay under their own
heading, which is where the three-city demo belongs: it is still worth showing
and it is no longer the subject.

## 82. ITS and Soundscape: findings out of desc, methods drawn (2026-08-24)

Both cards had the same fault as the GIS one in section 75: `desc` carrying the
paper's results in compressed form, and a method that was a chain of arrows in a
sentence.

**ITS `desc`** lost the congestion figures, the dual-regime framing and the
recommended alternative. All of it is in the abstract directly below, and the
metrics carry the two numbers a reader actually stops on. What remains says what
the work is and which venue it is about.

**ITS method** is now Define, Choose, Design. The chain hid the shape of the
study — this paper defines a problem, scores four options against each other,
picks one, and designs from the winner. The scoring step is the hinge, so
Alternative C keeps its score of 3.75 on it: a multi-criteria matrix that does
not say what the chosen option scored is asking to be taken on trust.

**Soundscape `desc`** lost the screening counts, the theme count and the two
outputs, all of which the abstract states.

**Soundscape method was the one genuinely losing information as prose.** PRISMA
exists so a reader can audit the funnel — how many were found, how many were
discarded, at which gate — and a run-on line of numbers separated by arrows
makes that arithmetic something you have to do yourself. Drawn as Identify,
Screen, Include, Synthesise.

The counts reconcile, which is the point of the diagram and worth checking
rather than transcribing: 1,011 screened less 931 excluded leaves the 80 sought;
78 assessed, two having not been retrieved, less 56 excluded leaves the 22 the
abstract reports.

### The paper link

Changed from the DOI to `https://rdcu.be/fqyAT`, the Springer Nature SharedIt
link, so a reader without a subscription reaches the full text rather than a
landing page. The DOI stays in `pub`, where it belongs — it is the citation
identifier and it is what someone quoting the work needs. Two different jobs,
and the card now does both instead of using one for both.

The link label also lost its connecting dash, which had survived the sweep in
section 73 because that pass only looked at rendered prose and this string is an
attribute of a link.

## 83. The seventh research card, deliberately thin (2026-08-24)

`index.html` carried a placeholder — `pcard--todo`, `data-msc-slot="7"`, titled
"Research project 7" and pointing at the thesis key so the wheel had something
to open. The legend counted seven M.Sc. cards; six existed. That slot is now the
Urban Mycelium Network.

**What is disclosed, and what is not.** Asked for the abstract and at most two
illustrations and nothing else, so there is no method, no metrics, no tag list
and no link. This is a live competition entry: the financing mechanism, the
three scenario tests and the phasing are its substance, and publishing them
ahead of the competition is not the site's call to make.

That absence is now written into the data as the brief rather than left looking
like an entry someone did not finish — because every other card has those
fields, and the next person here would otherwise read the gap as a to-do.

**The abstract is verbatim** from UMN-Abstract.pdf, 31 July 2026. Two changes,
both recorded at the field: `<strong>` on the terms the source itself sets bold,
and two commas replacing a dash pair around the list of six systems, per the
no-connecting-dashes rule.

**The two illustrations** are the deck's last two slides, which are the before
and the after of the same two views: the sketches show the intent drawn over
photographs of the real street, the visualisation shows it built. If the count
is two, that pair carries more than any two single images could.

Rendered from `Urban-Mycelium-Network-Deck-v3.4.pdf` at 150 dpi with `pdftoppm`
and converted with PIL, since neither ImageMagick, cwebp nor sharp is available
here — worth noting because the obvious three tools are all absent and PIL is
not. 1800px WebP for the gallery, 1200px for the card.

The v3.3 `.pptx` is newer by file date than the v3.4 `.pdf`; the higher version
number was taken as the later work. Worth confirming if the deck moves again.

## 84. Four site-wide changes, and a signal that reached nothing (2026-08-24)

**The section after the heat map arrives rather than scrolls in.** Once the
frame clears, the reader is looking at empty ground, and the next thing should
appear on it. `--dir-in` runs over the last 8% of the same trigger that takes
the map away — one clock, three signals, because two triggers measuring the same
boundary from different anchors is exactly how the caption and the map ended up
dissolving into each other in section 66.

Short on purpose. Over a long range this is a fade, and a fade is what it
already did; compressed into 80px it reads as something appearing. The blur is
what sells it — 6px clearing to 0 makes the block RESOLVE rather than merely
brighten. The scale only goes to 0.965: a big scale reads as a zoom and fights
the dive that just finished.

Measured: frame gone at 4893, arrival 4973 to 5053, strictly ordered.

**And it did nothing at all on the first attempt.** `--dir-in` was published on
`worlds`, where `--whole`, `--cost` and `--dive-copy` all live. `#direction` is
a SIBLING of `#worlds`, not a descendant — the earth sections are inside
`.worlds__copy` and this one comes after it closes. So the signal moved 0 to 1
correctly at its source, inherited nothing, and the consumer silently used its
fallback. That is the `--heat` collision from section 59 wearing a different
costume: **a signal can be correct, readable, and still never reach the element
it exists for.** Moved to the root, where `--disc-*` already lives for the same
reason.

The fallback being `1` rather than `0` is deliberate and load-bearing: without
JS, or before the trigger publishes, the section is simply visible. A default of
0 would leave Research Direction blurred to nothing for anyone the scrub never
reaches.

**The three status cards are gone** — PhD target, geographic focus, open to. The
grid that held them beside the prose is one column now, since a two-column grid
with one child leaves the copy stranded in a half-width track. The copy tool
refused to sync until its nine orphaned keys were dealt with, which is the guard
working: `--export` removed exactly those nine and nothing else.

**The hero questions are amber.** They sat at `--t`, the same colour as the
biography under them, so the questions and the answer read as one block and the
questions carried no more weight than the prose.

**The heat-map caption is one step larger**, through a single `--cap-up` factor
rather than four separate sizes, so title, lead, body and eyebrow keep exactly
the relationships the shared caption block established. Verified: the
title-to-lead ratio is 2.471 against the siblings' 2.472. The clamp is scaled at
all three terms, because scaling only the preferred value would move where the
type starts and stops growing and it would no longer be the same curve.

It can be larger than its two siblings because it does not share their
constraint: they sit in a 300px side band beside the planet, and this one is
pinned across the bottom of the frame with the full measure available.

## 85. Two directions, mirrored, over a wave (2026-08-24)

### Bold, not bold-and-italic

The second half of every display heading — "the Whole Picture", "of Inaction",
"becomes personal" — was a light serif italic set against a heavy sans. Two
contrasts doing one job: the weight already says this half is the emphasis, and
the italic on top made the pair read as two typefaces arguing rather than one
sentence with a stressed half. Same family and weight now, distinguished by
colour alone.

`.dirs em` opts back in, and the exception is the interesting part: that section
has no weight contrast to fall back on, because both halves of each title are
the same size and the second half is the whole point. The italic is doing real
work there and nowhere else, which is the test for whether a style should exist.

### The section is two headings facing each other

Research ranges RIGHT, Design ranges LEFT. That puts the two ragged edges on the
outside and two clean edges either side of the gap, so the pair reads as one
statement with a seam down the middle rather than as two unrelated blocks.

Getting there took two corrections, both the same mistake in different clothes.
First a `max-width: 14ch` on titles that already carry a `<br>` at the line they
should break on — the measure broke them again somewhere else, so one title came
out two lines and the other three. Then, with the measure gone, they still
wrapped: the section heading clamp resolved to **83px**, which is sized for one
full-width heading, and at that size "Making better" alone is wider than half
the wrap. Two headings sharing a line need roughly half the type.

Both times the symptom was "the columns will not shrink to their content", and
both times the cause was that the content genuinely was that wide.

### The wave

`emwave.js`, not a reuse of the one in wheel.js. That one is welded to the
Lissajous — it samples the solved curve, takes its phase from the ring's
rotation, and sits at a depth measured from the deepest card. What carries over
is the palette and the physics: E and B orthogonal, same frequency, same phase.

The colours are READ from `--tag-msc` and `--tag-arch` rather than written out,
so the two waves cannot drift apart when the palette moves. Those are the same
tokens the wheel tags its two collections with, which is why the two sections
look related.

Parked unless on screen, and under reduced motion it draws one static frame and
stops — the figure is still there, it simply does not travel.

## 86. The wave earns its place, and fourteen tiles float behind the work (2026-08-24)

### The wave

Four sinusoids: each colour a PAIR at two amplitudes, which draws a ribbon
rather than a line, and the second colour the exact negation of the first.
Negating rather than phase-shifting matters — a half-wavelength shift looks like
a mirror only where the curve is symmetric and drifts visibly out of register
everywhere else.

**Amplitude follows the scroll**, measured from the section crossing the
viewport rather than from page offset, so it behaves the same wherever the
section ends up as the page grows. It is read in the draw loop rather than in a
scroll listener: the loop is already running whenever this is on screen, and a
listener would repeat the same layout read on a different clock. A 0.30 floor,
because a background that disappears entirely reads as a rendering fault rather
than as a response.

**It grows outward from the seam, squared.** A linear ramp is already visibly
wide a fifth of the way out, so "starting small" reads as a brief flat spot;
squaring holds it near zero across the middle third and then opens quickly.

**Two colour corrections, both mine.** "Amber" was taken at face value and given
`--amber`, the site's yellow — but the projects section's warm tone is
`--tag-msc`, a red, and the whole point of the palette was to rhyme with that
section. Then the mirror tint went yellow and came back to blue.

**And the meeting point was 46px off.** The canvas spans the section; the
headings are a centred PAIR inside a narrower wrap, and the two columns are
different widths because their text is. Measured: the seam sat at x=510 while
the canvas centre was 557, so a wave meeting at w/2 met 46px away from the thing
it was supposed to meet. It reads the columns now and hands over where they
actually meet — measured after at 508 against 510.

That is the sort of near-miss worth naming: it does not look like a bug, it
looks like carelessness, and nothing about "meet in the middle" suggests the
middle of the canvas is not the middle of the layout.

### The tiles

Fourteen, one per card, at their own depths behind the wheel. Each has its own
duration and its own NEGATIVE delay, so they start mid-cycle and scattered
through the loop — everything setting off together is the giveaway that a field
is animated rather than adrift. Durations are deliberately not multiples of each
other so it never resynchronises.

**The parallax is on the FIELD, not on the tiles**, and that is forced rather
than chosen: every tile already animates `transform` for its drift, so a second
transform on the same property would simply lose to the running animation. The
drift stays on the tile, the parallax goes on the parent, and the browser
composes them. CONTEXT 48's one-owner rule, applied to a property.

Depth then comes free: one rotation of a parent with perspective becomes
fourteen different displacements, without the parallax code knowing any depths.

**Device orientation is never prompted for.** iOS gates it behind
`requestPermission()`, which needs a user gesture and shows a system dialog.
Firing that at someone who has scrolled past a decorative background would be
indefensible, so it listens only where the events arrive unasked. The tiles
still drift there; they just do not tilt.

## 87. The skills tooltip says which group, in that group's colour (2026-08-24)

The tip was the skill name alone. That answers "what is this ball" and leaves
"why is it that colour" to be guessed — the field is colour-coded along a
thermal ramp and nothing you can click tells you what the ramp means.

It now carries two lines: the group name, small and uppercase, painted in the
hue the ball is already painted in, above the skill name. The colour stops being
decoration and becomes a key the reader can read straight off the thing they
touched, without going to the legend and back.

**The group name is read from the DOM at call time, not captured once.** Those
headings are translated and the i18n engine rewrites them in place, so a cached
copy would go stale the moment anyone switched language — and it would go stale
silently, showing the previous language's group name beside the new language's
skill name.

Built with `textContent` on each line rather than a template into `innerHTML`.
Both strings come from the markup, one of them is copy that already contains an
ampersand, and a template would turn that into an escaping problem for nothing.

Verified: hovering a ball gives "Spatial & GIS" at 10.4px in rgb(255,90,43) —
the group's own hue — above "NDVI / NDBI Extraction" at 12.6px.

Also: the skills cards are left-aligned and 10% down via a single `--sg` that
scales heading, tags, padding and gaps together, so the card gets smaller rather
than looser. `text-align` is set explicitly rather than inherited, because these
sit under a centred section heading and inheriting alignment from an ancestor
that may or may not be centred is how a list ends up centred by accident.

## 88. The five group cards wear their own colours (2026-08-24)

The panel a legend key opens had amber headings on all five cards, whichever
group they belonged to. The brain above paints its balls on a thermal ramp and
the legend dots match it, so the one place the collections are actually listed
was the one place the colour meant nothing. Five identical boxes, and no way to
tell from the panel that the colours upstream were a system.

Each card now takes its group hue on three things: the heading, a 3px bar down
the leading edge at .55 opacity, and the tag borders through
`color-mix(in oklab, var(--c) 34%, var(--line))`. The mix is deliberately weak.
Forty tags at full strength is a colour chart, and the information on this panel
is the words; the border identifies the group, the text stays readable. The card
opened from a key takes its own hue for the active state too, where it used to
go amber regardless.

THE PALETTE MOVED INTO CSS. The five values had been written only in skills.js,
so colour-coding the panel would have meant a second copy in the stylesheet with
nothing keeping the two in step. They live on `.sgroup:nth-of-type(n)` as `--c`
now, and skills.js reads them back at mount with its own values as the fallback.
One list: change a hue and the ball, the legend dot and the card all move
together. This is the same fix as emwave.js reading `--tag-msc` rather than
writing the red out, and the opposite of the `--heat` duplication in 59.

Measured after: five distinct hues on heading, edge and tag border
(`#ff5a2b`, `#f5a20b`, `#e4ded3`, `#22d3ee`, `#4ade80`), active card cyan.

Also re-measured, both already built and both confirmed working rather than
rebuilt: the wave amplitude follows vertical scroll — 271px of drawn ink with
the section high in the viewport, 98px at the bottom of its range, against 95px
predicted by the 0.30 floor — and the mirror field answers the cursor, −6.0deg
to +5.6deg across the viewport width, while the tiles keep their own
`wtile-drift` animation on the same property. Tilt listens where it arrives
unasked and still never prompts on iOS.

## 89. The legend is left aligned, including the lines that wrap (2026-08-24)

The dots were already flush left on desktop and the labels looked ragged anyway.
The cause was the UA stylesheet: a `<button>` computes `text-align: center`, and
`font: inherit` does not carry text-align with it, so the two labels long enough
to wrap put their second line ("ANALYTICS", "DESIGN") centred under the first
while every dot stayed at x=56. A key whose rows do not share a left edge reads
as a list that was never aligned rather than as a legend.

`text-align: start` on `.skillkey__btn`. START, NOT LEFT: Arabic is one of the
five languages and `i18n/index.js` sets `is-rtl` on the root for it, where a
hardcoded `left` would strand every label on the far side of its own dot. The
two render identically in English, so this costs nothing and removes a bug
nobody would have found until someone switched language. The same substitution
was applied to `.sgroup`, written as `left` in 88 for the same reason.

The ≤720px key also went from `justify-content: center` to `flex-start`, so the
key packs to the leading edge at every width rather than centring below the
breakpoint and left-aligning above it.

Measured after — desktop: both wrapped labels' line boxes start within a pixel
of each other (73/73 and 74/74, against dots at 56); the 2px spread across rows
is first-glyph side bearing, not alignment. Mobile 375px: all five items at
x=20, the section's own padding, `justify-content: flex-start`.

Left alone, and worth a decision later: `.skillkey__break` still forces a
full-width break after the third item. At 720px that produces the 3-then-2 wrap
it was written for; at 375px every item is already on its own line, so it only
adds about 11px of extra gap between ARCHITECTURE & DESIGN and RESEARCH METHODS.
Pre-existing, and it now reads either as a stray gap or as grouping depending on
who is looking.

## 90. The way out of the walk has to be earned each visit (2026-08-24)

Reported as the skip button showing up on a first run on a phone. The logic read
correctly on paper — `skipped` only goes true at `progress > 0.98`, and the class
that reveals the button is added on `onEnter`/`onEnterBack`, a LATER pass — and a
full first descent at 375px confirmed it: the button stayed hidden the whole way
down and `journeyPlayed` flipped to "1" only at the end.

The bug was one line above all of that. Init read `journeyPlayed` out of
sessionStorage and put `has-played` straight on the stage, so the offer survived
a reload. Measured at scrollY=0 immediately after one: class `journey has-played`,
skip `visible`, opacity 1, before a single step had been walked.

On a desktop that restore is a kindness — you reload, you keep what you earned.
On a phone a reload is not a rare event: the URL bar, switching apps and the back
gesture all cause one, so the reader kept meeting a fresh page that already had
the exit sitting on it. The session memory was the whole feature and also the
whole defect.

So the crossing is made per page view now. The read went, the restore went, and
the write went with them — a key nothing consumes is how a stale flag survives
long enough for something later to trust it.

Measured after, with `journeyPlayed=1` deliberately LEFT in storage so the dead
path would show if it were still live: at load `journey`, hidden. Whole first
descent, 45 steps to the foot of the page: never revealed. Back up: revealed at
y=17788, visible. All three states are what was asked for.

## 91. Three copy and type adjustments (2026-08-24)

THE TWO QUESTIONS, BALANCED. Asked for two lines on a phone. They were already
two lines at every phone width — the longer one needs 521px at 16px and the
widest phone box is 404px, so three was never possible — but they split badly:
328px then 62px, a full line followed by the single word "live?". `text-wrap:
balance` below 780px gives 199/190 and 244/264 instead, two even couplets.

Not one line each, which is the other reading of "two lines" and what the
desktop rule does above 780px. That would need 10.8px type at 375px and 9.2px at
320px, making the two questions the whole site answers the smallest text in the
hero. Flagged rather than done.

THE DIRECTION PAIR, BIGGER. `4.2vw -> 5.2vw`, cap `3.1rem -> 3.9rem`, about a
quarter up, with the eyebrows following at +12% so the label stays subordinate.
Measured first: at 1113px the columns were 234px and 326px inside a 967px wrap
with a 78px gap, so the pair could take 1.58x before it stopped fitting. A
quarter lands at 771px against a predicted 772, leaves 231px of slack, and both
titles still break exactly where their `<br>` says. The clamp MINIMUM did not
move, so everything below 609px renders as before and phones are untouched.

LIVE DEMO REMOVED from the contact links; four remain. `sync-site-copy.mjs
--export` re-baselined the 135 keys, so docs/site-copy.md no longer carries it
either.

## 92. The Direction crossing: one clock, five signals, and a dwell (2026-08-24)

Everything between the heat map leaving and Selected Work arriving is now
scrubbed from a single trigger anchored on #direction:

    --dir-wave   0.02-0.20   the wave opens out of a single point
    --dir-in     0.26-0.38   the two headings arrive on it
                 0.38-0.58   NOTHING. The dwell.
    --tiles-in   0.58-0.70   the mirrors of the next section come up
    --dir-out    0.70-0.82   headings and wave go
    --works-in   0.82-0.94   Selected Work lands

Ranges overlap by a couple of points each: five hard fades read as five events,
overlapped they read as one handoff. Same reason the map exit leads with its
words.

ON THE ROOT, and it has to be. #direction, #projects and #worlds are siblings,
so there is no common ancestor below the root that all five consumers inherit
from. TOP LEVEL, not inside the earth block, which sits behind an
`if (!earth) return` for machines with no WebGL — beside it, those machines
would get no signals and, since the seeds are 0, an invisible Direction section
and an invisible Selected Work heading. The CSS fallbacks are all the FINISHED
state, so if the trigger never runs the page is simply the page.

THREE THINGS HAD TO CHANGE STRUCTURALLY, each from a specific complaint.

"The wave should start at a point at the centre of the screen." It could not.
The canvas was absolute inside #direction, and at the moment the map clears,
#direction has not entered the viewport — its top is level with the viewport
bottom and its own centre is 240px below the fold, so there was no pixel at the
screen centre to put the point on. The canvas is fixed to the viewport now.
Measured: ink centre (517, 342) against a screen centre of (518, 343).

"The text is coming from bottom, it should come then and there only." Two
causes. `[data-reveal]` translates 34px up from below and was on all four
elements; it came off, and the headings' word split is released by this clock
instead, through the `[data-split-hold]` attribute reveals.js already provides
for headings that arrive on someone else's clock. And the block itself was flow
content, so any fade was also a journey — it is fixed to the middle of the
viewport now. Measured across the whole crossing: the heading group's centre
sits at y=343 at every sample, which is the viewport half.

"Should remain for a bit of vertical scroll just like sections before." That is
the 0.38-0.58 gap, worth about 500px of scrolling on a 686px viewport, bought by
giving #direction `min-height: 200vh` while its content stays fixed. Same effect
as the pins before it, done with position rather than a pin spacer, because the
content is two headings and a canvas and none of it needs the layout surgery a
real pin performs.

THE COLUMNS WERE EQUALISED so the seam IS the screen centre. They were
max-content — 289px against 404px — and a centred grid puts its own middle at
the centre, which for unequal columns is not the gap: measured 57px off, putting
the point the wave opens from 49px left of centre. Invisible once the headings
explain it, very visible in the seconds when the dot is the only thing on
screen. `1fr` each fixes it and the text does not move, since both columns still
range toward the gap and the extra width becomes outer margin. Seam 518 against
a screen centre of 518; on a phone the columns stack but stay equal and centred,
so the same expression still yields the middle (188 against 188).

Also: the wave's `pointer-events` and the wrap's. The fixed heading block is
`pointer-events: none` and only as tall as its content rather than `inset: 0` —
a full-viewport transparent sheet over Selected Work that ate clicks would be
the classic way a decorative overlay breaks a page long after anyone remembers
it is there.

Verified end to end at 1035px and at 375px: point at centre → wave opens (ink
4px → 220 → 1028) with the headings still at 0 → headings arrive → nothing
changes for ~500px → mirrors up (field 0 → 1) with the headings still full →
headings and wave go (ink 0) → Selected Work lands last.

## 93. The dot that followed the reader, and the mirrors that arrived offstage (2026-08-24)

Two faults from 92, both created by moving things onto the viewport.

THE SEED DOT ON EVERY OTHER SECTION. `stop()` cancelled the animation frame and
left the canvas painted. That was harmless while the canvas was absolute inside
#direction — the stale frame stayed inside a section nobody was looking at. Fixed
to the viewport it is a different object entirely: the leftover frame, in
practice the seed dot as the smallest and last thing drawn, sat in the middle of
whatever the reader scrolled to. Measured at y=411 with #direction 4064px below:
29 painted pixels still on the canvas.

Parking now clears, and a frame already queued when the observer parks clears
and returns rather than repainting what stop() just wiped. Verified at y=0 and
at y=16199: zero painted pixels at both ends of the page.

THE MIRRORS WERE REVEALED WHERE NOBODY COULD SEE IT. The order was also wrong,
and the two turned out to be the same fault. `--tiles-in` ran at 0.58-0.70 of the
direction clock, and at 0.58 #projects does not start until y=865 on a 686px
viewport — the entire fade happened below the fold, and the tiles then rose into
view already lit. That is what "coming by scrolling down" was: the fade was never
the thing being watched, only its result arriving from underneath.

So the field is fixed to the viewport too, and the exit was reordered to what was
actually asked for — the headings and wave go FIRST, onto empty ground, and the
mirrors come up on that:

    --dir-out    0.56-0.68   headings and wave go
    --tiles-in   0.74-0.88   the mirrors come up in place
    --works-in   0.88-1.00   Selected Work lands

The field being the viewport also means each tile's --y is a percentage of the
screen rather than of 1087px of section, so all fourteen spread across what the
reader can see instead of a third of them sitting below it.

--tiles-out IS THE PRICE OF BEING FIXED. Nothing confines the field to #projects
any more, so without a way down it would hang over Skills, Background and Contact
for the rest of the page. Published from #projects leaving, and from `bottom
center` rather than `bottom bottom`: the section is 1087px on a 686px viewport and
its wheel is NOT pinned (the only pin spacer on the page belongs to the journey),
so `bottom bottom` began the fade 686px early and left the mirrors fully lit for
340px and dimming through the whole wheel they are meant to sit behind. From
`bottom center` they hold for 947px and go once the next section owns half the
screen.

Measured end to end: out 1.00 and wave ink 0 at y5243, mirrors 0.77 at y5510 with
Selected Work still 0, works 1.00 at y5955, field still 1 through y6468, gone by
y6955. Across all of it the tiles' top edge reads 72px and the heading group's
centre 343px — neither travels.

## 94. Reveal in place, hold, vanish in place — for the whole page (2026-08-24)

"The rest of the portion is also coming like scroll down." Two mechanisms were
still sliding content upward, and both are gone.

`[data-reveal]` translated 34px up from below, and `[data-split]` raised each
word 118% out of an overflow mask. Every heading on the site announced itself by
moving up while the section under it was ALSO moving up, which is what made the
page feel scrolled at rather than read. Both are now a small scale plus opacity:
.985 for blocks, .92 per word. The stagger is untouched — that was always the
point of the split rule, not the direction of travel. .word keeps its mask; a
shrink cannot overflow the box it started in, so it clips nothing new, and
leaving it alone avoids an inline-block baseline shift. Verified from a cold
load: 25 pending blocks and 26 pending words, every one a scale, zero translate.

THE HANDOVER. Each section now publishes --sec-in/--sec-out ON ITSELF, so it
owns its own pair and its children inherit; one name on the root shared by five
sections would be the --heat collision with five participants. Two shapes,
because the geometry genuinely differs:

  plain  (#projects, #contact)   top top -> bottom top      fades out as it exits
  staged (#skills, #instagram)   top top -> bottom bottom   arrives, holds, goes

`top top -> bottom bottom` is exactly the window in which a sticky child is
pinned, so for a staged section the whole cycle happens without the content
moving. Measured on Skills: titleY reads 81 through fade-in, hold and fade-out,
and the fade completes 27px before it unsticks.

WHY ONLY TWO ARE STAGED. Measured on a 686px viewport: the contact form is 855px
and the projects intro and wheel together 1052px. A sticky box taller than the
viewport pins its own top and takes its bottom out of reach, so holding either
would put the Send button and the lower project cards permanently below the fold.
They fade and keep scrolling. #background was never a candidate and never needed
to be — it is the pinned walk and has held still since long before this.

THREE THINGS THIS COST, each found by measuring rather than by looking:

`.section`'s 116.7px block padding was eating the stick budget. A sticky child
ranges over its parent's CONTENT box, so a 1373px section with a 686px stage had
only 453px of stick and the fade-out ran after it had already come unstuck. At
`padding-block: 0` the content box is the full 200vh and the stick matches the
trigger range to the pixel. The nav clearance that padding provided moved onto
the sticky box itself, where box-sizing: border-box means min-height: 100vh
already includes it and it costs no budget.

REFRESH ORDER, and this was the bad one. Everything below the Experience walk
sits 8,860px lower once that pin builds its spacer. A global refresh tears the
spacers down and rebuilds them, and at the default priority these triggers
measured in between: Contact cached a start of 9744 against a real position of
18604, so by the time a reader arrived its progress was past 1 and the section
had already faded to nothing. It was invisible on arrival — content that exists,
reads correctly in the DOM, and cannot be seen. Proved rather than guessed:
ScrollTrigger.refresh(true) left the numbers untouched while .refresh() on the
trigger itself corrected start to 18604 immediately. That is an ORDER problem,
and `refreshPriority: -1` is what it is for.

THE LAST SECTION NEVER VANISHES. Nothing follows Instagram but the footer, so
the page cannot scroll far enough for it to leave and its progress simply
reached 1 while it was still the thing on screen: measured at the foot of the
page, opacity 0 with 875px of it still in the viewport, and the site ended on a
blank screen. It arrives and holds; it has nowhere to hand over to.

Left as-is and worth a look later: at maximum scroll the footer pushes the
Instagram stage up by its own height, so the last screen shows the strip and
lead without the heading above them.

## 95. Six corrections to the projects handover (2026-08-24)

1. THE TILE FIELD IS ABSOLUTE AGAIN, and this is a revert of 93. Fixing it to
the viewport was how the mirrors got revealed in place, and it broke two things
that matter more. The field stopped being the section box and became the screen,
so every tile --y went from a percentage of 1087px to a percentage of 686px and
the flock compressed upward onto the section title; and `perspective-origin` is
the centre of THAT box, so it moved from 543.5px to 343px and every tile was
projected through a different vanishing point, which is the tiles visibly
changing shape. Checked against production side by side at 1512x945: field
1510px, origin 756 x 754.906, tile sizes 76x59 / 115x119 / 67x53 / 95x71, three
tiles crossing behind the words. Local now reports every one of those
identically. The tiles travel with the section again, which is the live
behaviour and the one that was asked for.

2 and 5. THE CROSSING IS SLOWER. #direction went 200vh -> 340vh and the phases
were respread, so on a 686px viewport the range is 3020px rather than 2058.
Measured through it: wave open by +489, headings by +1163, dwell to about +1700,
headings and wave gone by +2424, Selected Work landed by +3044. The dwell more
than doubled and "the word Projects" now arrives over 499px instead of 247. A
scrub crossed faster than the eye can follow reads as dropped frames whether or
not a frame was dropped.

3. THE WHEEL OPENS WHAT YOU AIM AT. Both modal.js and book.js resolved every
click inside a wheel through frontCard(), so whichever card was frontmost opened
no matter where the reader clicked, and .is-front marked that same card. New
`cardAtPoint()` answers the question actually asked, by the same geometry
frontCard() uses and for the same reason: elementFromPoint cannot be trusted in
a preserve-3d scene. A candidate must contain the point, and among those that
do the largest projected area wins, which is the depth proxy this module already
relies on — so where a near and a far card both cover the pointer, the near one
takes it. Both files resolve through the SAME call from the same coordinates,
which is what keeps them from disagreeing and opening two projects at once.
`.is-hot` follows the pointer and `has-hot` stands the front mark down, so there
is only ever one highlight. Verified: front was `iot`, aimed at `temp`, hot at
click was `temp`, and the modal that opened was Multi-City Surface Temperature.

4. Tools & Methods is a plain section again — `data-stage` removed.

6. The contact copy is replaced, heading and three paragraphs.

WHAT IS NOT DONE, and why. "The projects section stay for few scroll" is the one
part of 5 that is not in. Holding a section means sticking it, and a sticky box
taller than the viewport pins its own top and takes its bottom out of reach:
measured, intro 411 + wheel 641 = 1053 against a 686px viewport, and the same
proportion at 1512x945. Holding it would put the lower half of the wheel
somewhere no scroll can reach. It also cannot be given extra height without
stretching the tile field, which is exactly what 1 above was fixing. What it did
get is the slower approach in 2. Worth revisiting as either a sticky heading
alone, or an inner wrapper that lets the section grow while the field keeps the
box its fourteen positions were authored against.

ALSO STALE: contact.title and contact.lead still carry the OLD English wording in
all four translations in strings.js. contact.lead2 and lead3 have no entries at
all, which is safe rather than broken — setLanguage only overwrites an element
when the key exists — but it means those two paragraphs stay English under every
language.

## 96. The projects entrance slows down, and the tile subtitle becomes legible
(2026-08-24)

THE ENTRANCE. `runIntro`'s DUR went 1400ms -> 2600ms. It was marked "fast on
purpose" and it was too fast to read: fourteen tiles travelling a curve, a wave
lighting under them and eight letters striking, all inside 1.4 seconds, blur into
one flash — which is what "frames are getting missed" describes whether or not a
frame was ever dropped. The tile choreography is expressed as fractions of that
timer so it stretched on its own; the CSS durations are not, and had to be scaled
by hand or their stage would finish early and the overlap the entrance was
composed around would come apart. Wave .55s -> 1s, per-letter 55ms -> 100ms,
legend .45s -> .8s with its delay .1s -> .18s, caret .28s -> .5s.

Measured after: eight letters, last one delayed 0.7s instead of 0.385s, lighting
between +680ms and +862ms. "PROJECTS" now types over 700ms rather than 385, which
is the difference between a typewriter and a word simply appearing. Note for next
time: THIS wordmark is what "the word Projects" meant, not the section title —
95 slowed --works-in on that assumption, which was also worth doing but was not
what was asked.

THE SMALL LINE ON EACH TILE. Every project tile carries a title and, above it, a
mono line with the course, institution and field. Measured on a card: the title
is #fafafa at 18.4px on #101014, ratio 18.19; the small line was `--t-3`,
#6d6d77 at 13.12px, ratio 3.71. That is under the 4.5:1 floor for text that
size, and it was the SMALLER of the two — the line needing the most help was
getting the least. #d9d9e0 takes it to 13.52 while staying clearly short of the
title's 18.98, so the hierarchy still reads. It now separates itself with three
signals rather than one: size, uppercase mono, and an off-white tone instead of
grey. Dimming was the least useful of the three and was carrying all the weight.

CONTACT, JUSTIFIED. `text-align: justify; hyphens: none;` on `.contact__lead`,
which all three paragraphs share, so it covers the block rather than part of it —
worth stating because the last attempt at justification here landed on four class
names out of twelve, and the fix after that was undone by a max-width opt-out
that switched it off again on phones. No opt-out here.

And the spacing that exposed: the rule carried no bottom margin because it had
only ever styled one paragraph. With three, measured tops of 223/307/362 against
a 28px line meant they ran together as one wall, and justifying them made it
worse — flush edges on both sides removes the last cue that a paragraph ended.
`.contact__lead + .contact__lead { margin-top: .85em }` gives an even 15px
between them and leaves the block's spacing to the email address alone.

## 97. A missing import, and two clocks cancelling a caption (2026-08-24)

THE CLOSE BUTTON, and this one was mine. 96's edit to book.js was applied by a
script that asserted its way through two files and aborted partway: modal.js got
both the import and the call, book.js got only the call. So every click anywhere
inside a wheel threw `ReferenceError: cardAtPoint is not defined` from book.js,
and a throw in one document-level click handler takes the rest of that click with
it — which is why the symptom was the modal's CLOSE button rather than anything
about opening cards.

THE BUILD PASSED THE WHOLE TIME. An undefined identifier is a runtime
ReferenceError, not a bundling error, so `npx vite build` had nothing to say
about it. The exit-code check that has caught everything else this month cannot
catch this class at all; only running the page does. Verified after the fix by
opening and closing a modal twice at 375px and twice at 1035px, and by an audit
that every file calling cardAtPoint also imports it.

THE MIRRORS ON A PHONE. `frontMax: 0.62` exists to stop a narrow screen solving
for a card wider than its own stage, and it was also letting the 9pt type floor
push the front card most of the way across a phone: measured at 375px the solve
landed at 0.578 of a 335px stage, a 195px card, with 22.1% of all card area as
overlap against roughly 2% on a desktop. A separate `frontMaxNarrow: 0.46` for
stages under 520px takes that to a 153px card and 7.5% overlap. It costs type --
the rendered title line goes 17.7px -> 13.9px -- and that is the trade: a title
you can read on a card you can tell apart beats a larger title on a card lost in
a pile. The desktop never reaches either cap.

THE HEAT-MAP CAPTION WAS NEVER ARRIVING. Reported as coming and going too fast.
It was not a duration problem. `--dive-copy` is `heatIn * (1 - heatOut)` and the
two are set by DIFFERENT triggers: measured on an 812px viewport the dive runs
3035-4253 and puts heatIn at 3766-3936, while the exit trigger starts at 3733 --
thirty-three pixels BEFORE the caption begins to arrive. heatOut was climbing
through the entire arrival, so the caption peaked around 0.43 and fell away
without ever being fully visible.

My first attempt made it worse, and instructively so: widening heatIn to 0.88
pushed its completion further into the exit's range and dropped the peak to 0.28.
Stretching a signal that is being cancelled just gives the canceller more room.
The fix is to stop them overlapping — heatOut now starts at 0.25 of its range,
which is 3936, exactly where heatIn completes. Measured after: peak 0.89 at a
sample 200px apart, so effectively full, then fading to 0 by 4338. The map still
leaves behind the words, which is the ordering that trigger was built around.

Also: contact ranges left under 640px, as asked. Note that .hero__desc--just does
the opposite deliberately — it carried the same guard once and the centred-justify
was asked for back at every width — so this is a documented divergence rather than
a pattern to copy.

## 98. The modal close button was drawn but not reachable (2026-08-24)

Reported as the cross not working and not being visible, on both desktop and
phone. Both halves were real and they had different causes.

NOT REACHABLE. `.modal__panel > *` at overlays.css:1080 lifts the panel's real
children above the ambient gradient on ::before. It also caught `.modal__close`,
and both selectors are a single class, so they are equally specific and the
later one wins. That quietly turned the button from `position: absolute` into
`position: relative` and dropped its z-index from 3 to 1 — which put it into the
flow at the top of the panel, UNDER `.modal__inner`. Measured with a project
modal open: the button reported 39x22 at (336, 71), and elementFromPoint at its
own centre returned `.modal__inner`. The cross was painted and a click on it went
to the scroll container behind it. `:not(.modal__close)` excludes it and carries
no specificity of its own, so nothing else moved. The 22px height went with it:
that was the flow layout, not a height override — back to 40x40 the moment it
was absolute again.

AND THIS IS WHY 97's FIX LOOKED LIKE IT WORKED. That test called
`btn.dispatchEvent(click)` directly on the element, which skips hit-testing
entirely. It proved the handler was bound; it could not have proved the button
was clickable, and the button was not. A close-button test has to resolve
elementFromPoint at the control's own centre and dispatch on THAT, or it is
testing the listener rather than the affordance.

NOT VISIBLE. The glyph sat at --t-2 on the panel wash, measured 6.91:1, on a mark
only 12.32px tall. That is a fine ratio for body text and not for a small mark
that has to be spotted rather than read, over media tiles that are bright in
places. --t takes it to 18.47:1 and the glyph to 16.8px, with the border up to
--line-3 and the hover ring going amber. Same argument the walk's skip button
won: everything else on the panel stays quiet so it does not compete with the
content, and the way OUT is the exception.

Touch targets: 40px only just clears the 44px guideline and misses once a finger
is aiming. `@media (pointer: coarse)` takes it to 46px, measured 45x45 on the
phone preset with the RTL mirror kept in step.

Verified at 1035px and at 375px, on two different tiles each time, by resolving
elementFromPoint at the button's centre and clicking THAT: reaches the button,
and the modal closes.

## 99. The walk says what its art is borrowed from (2026-08-24)

The Background lead becomes "Let me walk you through the Journey so far in 90's
gaming style", and a small tag sits over the map itself reading "Gaming graphics
adapted (Fantasy)(Medieval)(90's Nintendo Style)", with the three bracketed
terms in the accent.

A LABEL, NOT A BUTTON, despite being asked for as a button tag. It does nothing
when pressed, and a control that controls nothing is worse than a plain tag: it
takes a tab stop, it answers to Enter, and it promises something it cannot do.
`pointer-events: none` for a second reason — the stage under it is draggable on
touch, and a decorative chip must never swallow a press meant for the character.

Bottom-left is the one free corner: the chapter rail holds the left edge at
mid-height, the hint sits top-centre, the way out sits bottom-right. Checked
against all three with the walk running, plus the distance to the skip button
(471px of clearance at 1374px wide).

Two corrections after seeing it. At 32rem it wrapped and split "(90's Nintendo
Style)" across two lines, which reads as a mistake rather than as a list; the
measure went wider and each bracketed term is now `white-space: nowrap`, so a
break can only ever fall between them. And asked to make it smaller, the colour
went UP as the size came down — .64rem at --t-3 would have been the project-tile
subtitle mistake all over again, the smallest text on the surface carrying the
least contrast. --t-2 holds it at 10.24px, one line, 25px tall against 50.

bg.lead has no entry in any of the six dictionaries, so it was already
English-only and this introduced no translation drift.

## 100. Three tags, and a smaller contact block (2026-08-24)

THE MAP CREDIT BECOMES THREE TAGS. Asked for as separate buttons after 99 made
them one run of bracketed text, so the outer pill went and each term carries its
own. The brackets went with it: a pill already says where a term starts and
stops, and keeping both says it twice. The row is flex with `nowrap` on each
tag, so a break can only fall BETWEEN terms, never inside one. Measured at
1374px: Fantasy 69x24, Medieval 75x24, 90's Nintendo Style 145x24, all on one
line beside the label.

They are still spans rather than <button>. Raised once in 99 and not re-argued
here, but recorded so the next person does not "fix" it by accident: they have
no action, and a real button would take a tab stop, answer to Enter and promise
something. If they ever get behaviour they should become buttons the same day.

THE CONTACT BLOCK IS SET SMALLER. One factor on the heading and the prose
together first, so the relationship between them survived and only the group
shrank: measured at 1374px the title was 103.05px on the 7.5vw branch of
--fs-h2 and the paragraphs 21.98px on the 1.6vw branch of --fs-lead, a ratio of
4.69, and the four of them stood 514px. At .76 the ratio was still 4.69.

Then the heading alone came down again to .56, because at .76 it still ran the
full width of the wrap. It now sets 57.7px against a 1237px wrap, 728px wide on
one line, and the block is 312px against the original 514.

Both are calc() ON THE TOKENS rather than fixed px, so they keep their clamps
and stay responsive. Both carry a floor, at different heights and for the same
reason: .76 of --fs-lead's 1.1rem minimum is 13.4px, too small to read a
paragraph in on a phone, so max() holds it at 16px; .56 of --fs-h2's 2.75rem
minimum is 24.6px, which stops being a section heading, so max() holds that at
32px.

A NOTE ON A BUG THAT WAS NOT ONE. The contact heading rendered as black text on
amber blocks in two consecutive screenshots and looked badly broken. Nothing in
the DOM had a background: it was a live text selection of exactly "Let's
Collaborate & Connect", left behind by this session's own measurement code
calling range.selectNodeContents() on the title, against a site that styles
::selection as amber on ink. Measurement that selects text has to clear the
selection afterwards, or the next screenshot is a lie.

## 101. The Whole Picture frame stops saying itself twice (2026-08-24)

The eyebrow read "The Whole Picture" directly above a title reading "Looking at
the Whole Picture", so the frame spent its first two lines on the same four
words before saying anything. The eyebrow is gone. The title is untouched —
same markup, same `.display sec-title`, and measured after: Jost, 40px, weight
800, identical to the #future frame beside it.

`.future__body` STAYS even though it now holds one fewer child. It is the
element `--whole` is published on, so the frame's entire fade lives on that
container; emptying it of a heading costs nothing and deleting it would take
the fade with it.

Three now-dead `#whole .future__body .eyebrow` fragments came out of grouped
selectors that also serve #future and #about, leaving those groups intact. The
three `#whole .sec-title` fragments stayed, because that element still exists.
Checked afterwards for dangling commas and selector-less rules: none.

TWO PROCESS NOTES, both mine.

The first pass removed BOTH the eyebrow and the title, on a straightforward
reading of "remove THE WHOLE PICTURE / LOOKING AT THE WHOLE PICTURE" as naming
two lines to delete. It meant keep the second. Reverting the four touched files
with `git checkout --` and redoing only the eyebrow was cheaper and safer than
unpicking six selector deletions by hand.

And the visual check did not land. #whole's frame is `position: fixed` at
`opacity: var(--whole, 0)`, so it is invisible outside its beat in the earth
sequence; forcing the variable failed because the scrub republishes it every
frame, and forcing the container's opacity failed because its children carry
[data-reveal] and had not been revealed at that scroll position. Verified by DOM
instead — element absent, title text and computed font unchanged against its
sibling. Worth knowing before anyone else tries to screenshot these frames.

## 102. Full-site audit (2026-08-24)

Swept at 1374px and 375px, top to bottom, after the session's changes.

CLEAN. No horizontal overflow at either width, sampled every ~1500px of the
whole page. No duplicate ids. No in-page anchor pointing at a missing target.
Every section present and sized (#thermal and #atlas measure 0 and are hidden by
design — they are embeds modal.js relocates). No runtime errors or unhandled
rejections across a full traversal at either width. Project modals open the card
aimed at and close from a real coordinate click. The architecture book opens
from its own cards, does NOT also open the project modal, and its cover matches
the card aimed at. Six languages switch and English restores. The contact form
has three required fields, all labelled, and an empty submit does not show the
success line.

TWO THINGS FIXED. `<img id="lightboxImg" src="">` carried an empty src, which is
invalid and resolves against the document URL rather than to nothing; the
attribute is gone and lightbox.js assigns .src on open regardless, verified by
loading an image into it with no attribute present. And main.js still claimed
"nothing is fetched at all below 900px", which stopped being true when the map's
width gate was dropped to MIN_W = 320 — measured at 375px, the stage mounts at
349x812 and 177 pixel assets load. The comment now says what happens.

THREE NON-FINDINGS, recorded so they are not chased again. /favicon.ico 404s,
but the Performance API shows the browser never requests it: an inline SVG icon
is declared and used, and the 404 only appears if something asks explicitly.
#experienceList reports hidden=false while the map is up, which looks like the
timeline and the map both rendering — it carries `visually-hidden` and measures
25x1, which is the screen-reader pattern working correctly. And a book card
appeared to open the project modal too, which was stale state from the previous
test in the same session, not a real double-open; from a clean start it does not.

ONE OPEN ITEM, and it needs a dashboard rather than code. Production
/api/visits returns 200 with {"configured": false} and the debug view reports
urlVarFound: null, tokenVarFound: null — no Redis/Upstash store is attached in
Vercel, so the footer counter stays hidden rather than showing a zero, which is
the designed behaviour for a missing store. The endpoint itself is healthy. The
dev-server 404 on the same path is expected: Vite does not run Vercel functions.

NOT COVERED, so nobody reads this as broader than it is: real touch hardware
(only the emulated pointer), any browser other than this Chromium pane, the
prefers-reduced-motion path, print styles, a keyboard-only or screen-reader
pass, and the Formspree endpoint — which was deliberately left alone, since
exercising it sends a real message.

## 103. The hero premise lines come off on phones (2026-08-24)

"I was always driven by simple questions:" and the two questions under it are
hidden below 640px. Desktop keeps all three, unchanged.

.hero__desc--intro, NOT .hero__desc, and this is the whole care in the change.
The biography carries the same base class — `hero__desc hero__desc--2
hero__desc--just` — so a bare `.hero__desc { display: none }` would have taken
the opening paragraph with it, on the one screen where the biography is the
first thing worth reading. The modifier exists only so this rule cannot reach
it. Checked at 375px after: intro none, asks none, biography still 335x182 and
reading correctly.

640px, not the 779px used just above it in the same file. That rule is about
whether one question fits on one line, which is typesetting; this is about how
much hero a small screen should carry, and it should not fire on a tablet where
there is room for both.

`display: none` rather than visibility or opacity, so the space goes with the
text and a screen reader is not read three lines that are not on the page.

Measured at 1374px afterwards to confirm the desktop is untouched: intro 765x35,
asks 864x66, both questions present.

Note for anyone verifying this kind of change: the first check said the rule had
not applied, and it had — Vite had not pushed the new stylesheet yet. A reload
showed `none` at the same width. Stale CSS reads exactly like a selector that
does not match.

## 104. The heat map's loop never stopped (2026-08-24)

Reported from the live site: heavy interaction with the heat map makes the page
reload. A reload nobody asked for is a tab being killed and recovered, so the
question was what runs away.

WHAT WAS WRONG. `live()` asked one thing — is #riyadh's own opacity above 0.05.
That value is set to 1 when the dive reveals the plate and is never lowered,
because what takes the frame away is the PARENT stage fading and scrolling off,
not this element. Measured across the page: at y=6798 the stage is already
opacity 0 with its top at -1775; by y=18586 its top is -13563; and at every one
of those points root.style.opacity still reads 1.000.

So the predicate was true for the whole rest of the page. Every pointermove
anywhere restarted the loop, the loop's own exit test could never fire, and it
kept stamping up to 72 radial gradients a frame onto a canvas nobody could see
for another 19,000px of scrolling. On a phone that is a hidden animation running
until the tab gets warm enough to be killed, which is exactly what the report
describes from the outside.

`live()` now asks three questions, cheapest first: the element's own fade, the
stage that actually carries it away, and whether the box is on screen at all.
frame() uses the same predicate instead of its own copy of the opacity test, so
the loop cannot outlive what it is drawing.

AND A SECOND FAULT FOUND WHILE READING IT. frame() scheduled its next rAF at the
TOP, before the test that sets running=false. A frame could therefore be queued
and then running cleared on the same pass; if a pointermove arrived before that
queued callback ran, it saw !running, set it true and queued a SECOND. Every time
that raced, the number of live loops doubled. Scheduling now happens after the
exit test and through a handle (`raf`), and start is guarded on the handle rather
than on `running`, so double-scheduling cannot be expressed. This was reasoned
from the code, not observed — the race needs the opacity to cross 0.05, which the
first fault made impossible.

Measured after: 309 rAF/sec at the plate with it live, 185 once past it, a drop
of about 124/sec. Before, the loop ran everywhere. The wake still works — a
70-step pointer sweep changed the canvas by 3031 across 12,473 alpha samples.

NOT REPRODUCED, and worth saying plainly. The crash itself never happened here:
desktop Chromium with 16GB, heap flat at 24MB throughout. What is fixed is a
measured defect that is the most plausible cause of a phone killing the tab, not
a crash I watched and cured. Re-test on the device that showed it.

A measurement note: the first check of the wake reported NO CHANGE and looked
like a regression. It had sampled the canvas's top-left 400x300 while the sweep
ran across the vertical centre. Re-sampled over the full canvas it was fine.
Second time this session a bad probe nearly became a bug report.

## 105. The globe's texture budget, and the walk cleared (2026-08-24)

Following 104, the other two heavy loops were audited for the same class of
fault. One had a worse problem than the heat map; the other is clean.

THE GLOBE WAS SIZING ITS MAPS BY THE WRONG NUMBER. tiers() gated on
`innerWidth * min(dpr, 2)`, meant as "how many real pixels is this display". It
conflates a small high-DPI phone with a large screen, and phones lost: 390 CSS px
at dpr 3 resolves to 780, clears the 760 gate and took the -4k tier. So did
412@2.6 and 430@3. An 820pt iPad in portrait cleared 1500 and took the SIX k one.
And navigator.deviceMemory is undefined on Safari, so the `mem < 4` arm never
fired on any iPhone or iPad at all.

What that cost, measured from the decoded sizes: -4k is 4096x2048, about 45MB of
GPU memory each with mipmaps. Four maps — day, future, night, clouds — is
roughly 170MB on a phone, and the portrait-iPad case was about 277MB. That is a
real way to have a tab killed and recovered, which is what a page reloading on
its own is.

CSS width is the honest gate: the globe can never be drawn larger than its layout
box, and setPixelRatio is already capped at 2, so a 390pt phone renders it into
at most ~780 device pixels and a 2048px map is already more than double what it
can show. Nothing visible is lost. Under 900 CSS px takes the 2k tier, about
43MB for all four. The 6k tier additionally requires 1400 CSS px, which is above
every iPad in landscape including the 12.9 Pro at 1366 and below every desktop
worth giving it to. Checked after: phones and portrait tablets 2k, laptop at 1374
still 4k, desktop at 1920 still 6k.

AND IT COULD NOT SURVIVE A LOST CONTEXT. There was no `webglcontextlost`
listener, and the default action of that event is to make the loss permanent.
Mobile GPUs drop contexts under memory pressure and when a tab is backgrounded,
so the globe would simply be gone for the rest of the visit with nothing but the
CSS starfield behind it, silently. preventDefault() plus a restore log now; three
re-uploads its own buffers, so there is nothing else to rebuild.

THE PIXEL WALK IS CLEAN, and worth recording so it is not re-audited. frame()
reschedules unconditionally but early-returns unless `sheets && active &&
!document.hidden`, so an off-screen walk does no canvas work; `raf` is a single
handle reassigned each frame, so it cannot multiply the way riyadh's could; and
walkmap.js has an explicit start/stop pair with cancelAnimationFrame.
setActive(false) does not cancel the frame, only flags it — that leaves one empty
callback per frame running forever, which is a rounding error against what it
would cost to render, and not worth changing.

Measured across the page afterwards: rAF scheduling flat at 184, 187 and 184 per
second at the globe, at the walk, and past both. Nothing accumulates. The globe
still renders — canvas 1374x910, context not lost, 4k maps on this display.

## 106. It was pull-to-refresh, not a crash (2026-08-24)

104 and 105 fixed two real defects and neither stopped the reload, because the
reload was never a crash. It is the browser's own gesture.

`.worlds.is-draggable` carries `touch-action: pan-y` so a reader can still scroll
past the globe with a finger resting on it. That means a vertical drag over the
globe and the heat plate scrolls the PAGE. Drag upward enough times and the page
arrives at scroll-top; the next downward drag is no longer a scroll, it is
pull-to-refresh, and the page reloads. "Too much interaction" is precisely the
condition — one drag never does it, a dozen do, which is why it read as
something building up rather than as a gesture.

Nothing at the document level was stopping it. `overscroll-behavior` appears
three times in the stylesheets and all three are local: modals, the pinned note,
and the Instagram strip, each set so scrolling that thing does not scroll the
page out from under it. html and body had none, so the refresh gesture was fully
available everywhere.

`overscroll-behavior-y: contain` on both, because which element is the scrolling
one differs by engine and the property only takes effect on the one that is.
`contain` rather than `none`: it stops the refresh and scroll chaining while
leaving the rubber-band bounce, which is platform feel and costs nothing.
Verified after: contain on both, scrollingElement is html, and scrolling still
runs 0 to 19166 and back to 0.

THE LESSON, and it is the expensive one. Two rounds of fixes went out against
"the page reloads" without ever reproducing it, on a reading — tab killed and
recovered — that was never tested. Both found genuine defects, so both were
worth shipping, but neither was the reported bug, and shipping them read as
progress. A reload has two causes and only one of them is a crash; the cheap
check is whether the page state survives, and it was never made. Ask what kind
of reload before hunting for what could crash.

Support note: overscroll-behavior needs iOS 16 or later. Below that the gesture
is still reachable and there is no CSS answer; it would need touchmove
interception at the document level, which is worse for everything else.

## 107. iPhone Safari, and what is actually left (2026-08-24)

The reload was described precisely: iPhone Safari, mid-page, and the WELCOME
screen plays again. That last detail settles it. The boot animation only runs on
a fresh document load, so this is not a crash-and-restore (which returns you
where you were) and not pull-to-refresh either (which only fires at scroll-top,
and this happens in between). It is WebKit evicting the tab's web content
process under memory pressure and reloading it, which is iOS's normal behaviour
and looks exactly like this from the outside.

VERIFIED DEPLOYED before hunting further, because "still happening" means
nothing if the fix was not live: the production earth chunk contains the 1400
gate and the webglcontextlost handler, and html/body both compute
overscroll-behavior-y: contain. All of 104-106 is in production.

MEASURED ON AN EMULATED PHONE, so the numbers are indicative rather than
Safari's own: 9.2MB transferred, 19.2MB across seven DOM canvases, 27MB JS heap,
and the globe correctly taking the 2k tier now (earth-day.webp, not -4k). The
walk's offscreen world canvas is 44x164 tiles at TILE 16, so 704x2624 and about
7.4MB — checked because it is invisible to a DOM query, and cleared. The eleven
animated card loops are 440x248 to 480x270, about 0.5MB a frame. Nothing here is
individually damning.

THE FRAMEBUFFER WAS THE LAST THING I COULD TAKE without changing what the site
does. `antialias: true` asks for a multisampled buffer, and at 375 CSS px with
dpr 2 the drawing buffer was 750x1624 — 4.9MB before the sample count multiplies
it. Phones now render without MSAA and cap the pixel ratio at 1.5, giving
562x1218 and 2.6MB with no multiplier. Measured after: antialias false, buffer
2.6MB, globe still rendering and looking right on a phone. Desktops untouched.

WHAT IS LEFT IS A TRADE, NOT A BUG. The globe is the largest remaining
allocation on a phone: three.js to parse, a WebGL context, four 2048x1024 maps
at roughly 45MB with mipmaps, and a live render loop — and it is only ever
needed for the hero and the dive, in the first fifth of the page. It cannot
simply be disposed afterwards because scrolling back up must bring it back.
Cutting it on phones would free the most by far and the CSS starfield fallback
is already built and shipping, but it would take the dive with it, which is the
site's opening argument. That is the owner's call and is being put to him rather
than taken.

PROCESS NOTE, second one in three sections. Three rounds went out against this
report before anyone asked what KIND of reload it was. "I see the welcome screen
again" was available for the asking on day one and rules out two of the three
candidate causes in five words. Ask what the failure looks like before
theorising about what could produce it.

## 108. Measuring the fast-scroll case, and idling the wake (2026-08-24)

Owner's read after the last round: it happens less, and it looks like the phone
cannot keep up with the number of animations during a fast up-and-down scroll.
That is testable rather than something to theorise about, so it was measured.

FAST SCRUBBING, on emulation and therefore indicative only: p50 frame 17ms, p90
33ms, p99 67ms, worst 100ms, ten frames over 50ms, eight long tasks with the
worst at 83ms. Heap flat at 28MB. That is desktop-class hardware already showing
strain, and an iPhone CPU multiplies it. The reading holds up.

WHAT CAME OUT. The wake loop repainted every frame whether or not anyone was
touching it — three full-canvas drawImage calls a frame over a plate that had
been blank for however long. It is entirely pointer-driven and fully decayed
WAKE_SECONDS after the last input, so there was nothing to draw. It now stands
down one second past the decay and track() restarts it on the next input.

Measured in the band where the plate is genuinely live: 219 drawImage calls in
1200ms while the wake is alive, 0 after it decays, and 180 again on the next
pointer move. It stops and it comes back.

A USEFUL NUMBER FOUND WHILE LOOKING FOR THE TEST POSITION. The plate is only
live between y=3619 and about y=4394 — the stage is at opacity 0 by 4394 and
stays there. So 105's visibility gate had already cut this loop from the entire
page down to roughly 400px of scroll; today's change removes what was left
inside that band. Two earlier attempts to measure this landed outside the band
and read as "the loop is not running", which was true and meant nothing.

WHAT IS NOT DONE. The globe cannot be skipped during a fast scroll the way the
wake can: the dive is scroll-driven, so dropping its frames would make the
sequence stutter rather than save anything the reader would thank us for. If the
phone still gives up, the remaining levers are halving the phone textures again
(2048 to 1024, roughly 45MB to 11MB) or dropping the globe on phones for the CSS
starfield that already ships. Both were put to the owner and both were declined
in favour of testing what is already in.

## 109. Three iPad faults (2026-08-24)

STUCK ON THE PROJECT WHEEL, and DIAGONAL DOING NOTHING. Both are the same rule.
The touch model that makes the wheel work with a finger — `pan-y` on the figure
so the page keeps vertical, `none` on the tiles so a drag on a card still turns
the ring — lives inside `@media (max-width: 900px)`. An iPad is 810 to 1366 CSS
px, so it never saw it and fell back to the base `touch-action: pan-x`, which
hands VERTICAL to the wheel and keeps only horizontal for the browser.

On a desktop that is correct: the cursor turns the ring and the page still
scrolls from the margins either side. With a finger it means a swipe anywhere on
the figure turns the ring and cannot scroll the page, and on an iPad the figure
is most of the width. That is "stuck on the project wheel".

The diagonal is the same rule seen from another angle. Under `pan-x` the browser
claims a diagonal as a horizontal pan; there is nothing to pan horizontally, so
the gesture is swallowed and neither the page nor the ring moves. Under `pan-y`
it resolves to the vertical component and the page scrolls.

`@media (pointer: coarse)` now applies the phone model at every width, placed
after the 900px block so it wins over the base rule rather than only below the
breakpoint.

THE DASHBOARD RELOAD. /uhi-twin is a separate 54MB app — 7MB of map features per
city, 3MB HVI geojsons — that opens in an iframe and draws its own 3D view in its
own WebGL context, on top of a page whose globe textures are still resident. The
width gate from 107 still handed an iPad the 4k tier, because 1024 to 1366
clears 900 comfortably, so about 170MB of maps were sitting there when the
dashboard asked for room. A coarse pointer now takes the 2k tier and skips MSAA
regardless of width, which hands 127MB back.

NOT VERIFIED ON THE DEVICE, and this needs saying. The browser pane here reports
maxTouchPoints 0 and `pointer: fine` at every size, so the coarse branch cannot
be exercised locally at all — what was checked is that both rules compile into
the build (one `pointer:coarse` block in main.css, two matchMedia calls in the
earth chunk) and that the desktop path is untouched: pan-x, card auto, 4k
textures, antialias true. The iPad behaviour itself is reasoned, not observed.

IF THE DASHBOARD STILL RELOADS, the next lever is releasing the globe's textures
while a fullscreen embed is open rather than merely shrinking them. It is hidden
behind the modal, so there is nothing to see while they are gone, and the reader
is at the projects section when it closes, so a re-upload would be invisible.
That is real work in earth.js and was not taken speculatively.

## 110. The globe hands the GPU to the dashboard (2026-08-24)

The thesis twin is a separate 54MB application that opens in an iframe over this
page and draws its own 3D city in its own WebGL context. Everything earth.js
holds stayed resident the whole time, for a globe completely hidden behind the
modal. On an iPad that combination is what reloaded the tab.

The four maps are now handed back while the dashboard is up and taken again when
it closes. Both moments are safe precisely because nothing can see the globe in
between: the modal covers the viewport going in, and coming out the reader is
down at the projects wheel, several screens below the hero.

FIRED WHEN THE IFRAME ACTUALLY LOADS, not when the modal opens. The dashboard is
armed on demand, so a reader can open the card, read the abstract and close it
without the twin ever existing; freeing the globe then would buy a re-upload for
nothing. modal.js dispatches sa:twinload and sa:twinfree, main.js listens and
calls earth — the same seam sa:languagechange uses, so modal.js still knows
nothing about three.js.

A 1x1 STUB RATHER THAN null. A shader sampler set to null is undefined
behaviour, not an empty texture: three warns and some drivers draw garbage or
drop the context, which is the exact failure being avoided. Four samplers
pointing at one black pixel costs four bytes and keeps every draw call legal.

`released` is cleared BEFORE the await in restore, not after. Two closes in
quick succession would otherwise both see it set, both start a fetch, and the
second set of maps would leak with nothing referencing it. Both calls are
idempotent in the other direction too.

Verified end to end: launching the dashboard fired sa:twinload, closing fired
sa:twinfree, the texture requests went 4 to 6 (a real re-fetch), no errors, and
the globe came back with its imagery — checked by screenshot, because readPixels
on a presented WebGL buffer returns black without preserveDrawingBuffer and read
as a failure when it was not. Third time this session a bad probe nearly became
a bug report.

Also: .hstat__lbl goes off-white. Each stat is a loud amber number with the thing
it measures underneath, and the label was --t-3 — the smallest text in the block
carrying the least contrast, over a photographic globe. Same fault as
.pcard__course, so it takes the same #d9d9e0 rather than a second opinion about
what off-white means. Measured 14.17 against the ink. .hstat__idx stays at --t-4:
"#01" is an index mark, not supporting text, and should stay almost invisible.

## 111. Measuring which system to blame, and a switch to prove it (2026-08-24)

Still crashing on the phone after six rounds. Before cutting anything, the two
heavy systems were finally weighed against each other rather than argued about:

    globe textures      42.6 MB   (four 2048x1024 with mipmaps)
    walk world canvas    7.0 MB   (704x2624)
    walk sprites         5.7 MB   (184 files, decoded)
    globe framebuffer    2.6 MB

The walk costs about 13MB all in. The globe costs about 45MB — nearly four times
as much, from the system that is on screen for the first fifth of the page. Every
instinct that said "184 sprite files must be the problem" was wrong, and the
count was doing the misleading: they are tiny.

SO THE GLOBE TOOK ANOTHER HALVING, and without a third set of files. applyMaps
downscales each map into a canvas before upload on any coarse pointer, taking
42.6MB to 10.6MB. A phone renders the globe into at most ~780 device pixels, so
a 1024px map is still more than it can resolve; nothing is lost that the screen
could have shown. Verified on the phone preset: globe renders, imagery intact.
Across the three rounds the phone budget for these four maps has gone 170MB ->
42.6 -> 10.6.

AND THAT IS WHERE GUESSING STOPS. Total measured on a phone is now roughly 65MB
across everything, which should not evict a modern iPhone — which means the
memory theory may simply be wrong, and six rounds of memory work would have been
the wrong tree. The alternative is the main-thread watchdog: measured fast
scrubbing hit 83ms long tasks on desktop-class hardware, and a phone multiplies
that.

`?lite=1` exists to settle it. It skips the globe and the walk and changes
nothing else, leaning on fallbacks that already ship — the CSS starfield and the
timeline <ol>. Open the site, make it fail; open ?lite=1, try just as hard. If it
survives, the graphics load is the cause and we know which half to cut. If it
still fails, it was never the graphics. Verified both paths: lite loads zero
earth textures and zero sprites with the starfield and timeline standing in;
normal still mounts a 562x1218 globe and 170 sprites.

The lesson from 106 is being applied properly this time: stop shipping fixes
against a failure nobody here can see, and build the smallest thing that tells us
which half of the site is guilty.

## 112. Regulating the globe instead of removing it (2026-08-24)

?lite settled it: the site does not crash with the globe and the walk off. So it
is the graphics load, and the question stops being "what else can be trimmed"
and becomes "why are both systems resident when neither is needed".

THEY NEVER OVERLAP. The globe serves the hero and the dive — the first fifth of
the page — and is never shown again. The walk sits thousands of pixels below it.
Yet the globe's maps, its context and three.js itself stayed resident for the
other four fifths, roughly 20,000px of scrolling during which a phone carries the
largest single allocation on the page for something it cannot show.

So it is released when the reader is more than a viewport past `.worlds`, and
taken again a viewport before they could see it. The machinery already existed —
110 built releaseTextures/restoreTextures for the dashboard — and this is the
same pair on a second trigger.

ONE PREDICATE, NOT TWO CALLERS. The globe wants its maps when the reader is near
the top AND the dashboard is not open over it. Two independent conditions heading
for two independent callers is how a release ends up racing a restore and the
globe comes back black, so both inputs set a flag and one function decides.
Release and restore are each idempotent, so calling it more often than necessary
costs nothing.

A FULL VIEWPORT OF MARGIN either side. Without hysteresis a reader resting on the
boundary would release and restore once per wobble, which is worse than never
releasing: a re-upload is more expensive than holding.

Verified over a 22,481px round trip: nothing fetches on the way down, all four
maps re-fetch on the way back, no errors, globe visibly restored with its
imagery.

?lite ALSO LEARNED TO NAME A HALF. `?lite=globe` and `?lite=walk` skip one system
each, so a failure can be pinned rather than merely bracketed. Both verified:
=globe leaves 169 sprites and a mounted walk with no earth textures; =walk leaves
a 562x1218 ready globe with no sprites and the timeline standing in.

NOT DONE, and the obvious next step if the phone still struggles: the walk mounts
on idle at page load and holds its sprites and world canvas from then on, the
same fault the globe just had. Deferring it until the section is near is the
matching fix, but creating that pin late changes document height mid-scroll,
which is the refresh-order problem from 94 in a worse place. It needs doing
carefully rather than quickly.

## 113. Phones get the content without the choreography (2026-08-24)

Asked for directly: on a phone, keep the earth, the heat map and the walking
game, but drop the transitions between them and just scroll normally. That is
the right instinct — ?lite proved the graphics load is the cause, and the
choreography is the part of that load which exists purely to move.

FOUR THINGS CHANGE BELOW 900px, and no content is among them.

Lenis is off. It runs its own rAF loop, writes a transform every frame and
drives ScrollTrigger.update from it. On a desktop that buys smoothing worth
having; on a phone the platform already scrolls smoothly, so the whole apparatus
is duplicated work on the one device that cannot afford it — and it lands on
every frame of exactly the fast flick that was killing the tab. Kept OUT of
`reducedMotion`, which ten modules read and which means "this reader asked for
less movement". A phone has asked for nothing. Only the smoothing decision is
shared.

The Direction crossing does not run. All five signals are published once at
their settled values — wave open, headings up, mirrors lit, Selected Work landed,
--dir-out at 0 so the headings stay — and the trigger is never created. The
section drops from 340vh to its natural 667px and its content returns to normal
flow, because 340vh with a fixed block inside is the machinery of a scrub and
nothing else.

The section handover does not bind. --sec-in and --sec-out are never published,
so every consumer falls back to 1 and 0, which is the visible state.

And the wave canvas goes back to absolute. It was fixed to the viewport so it
could hold still under headings that were also fixed; with the section in normal
flow it has to travel with the words it sits behind.

MEASURED, and this is the number that matters. A realistic fast flick — 180px a
frame, continuously, up and down — now runs p50 14ms, p90 21ms, p99 28ms, worst
frame 35ms, ZERO frames over 50ms and ZERO long tasks. The same page previously
produced eight long tasks topping 83ms. The page is also 3,500px shorter.

A MEASUREMENT TRAP WORTH RECORDING. The first comparison said everything had got
WORSE — p99 67 to 83, worst 100 to 236, long tasks 8 to 18. It had not: the
earlier run drove synthetic wheel events through Lenis, which interpolates, and
the new one called scrollBy(2600) fourteen times in a row, which teleports. The
input method changed with the scroll mechanism, so the two were never comparable.
Changing what you measure at the same time as what you are measuring produces a
number that looks like a regression and means nothing.

The globe, the heat map and the walk are all still there and still work. What is
gone is the scrubbed sequencing between them.

## 114. A LinkedIn card beside the Instagram one (2026-08-24)

The Off the clock strip ends on an invitation rather than a cut-off tile, and
there are two places worth inviting someone to: the personal one and the
professional one. `connect` is appended after `invite` in insta.js and wears the
same `.insta__more` component.

DELIBERATELY THE SAME CARD. It is the same kind of thing in the same row, and
giving it its own treatment would say it was a different kind. Only the wash and
the glyph change — which is already the only thing separating one tile from
another in this strip.

The glyph keeps the amber the Instagram card uses rather than turning LinkedIn
blue. Brand colour lives in the background on both, and the house rule is that
the accent never carries data; an amber mark on one card and a blue mark on the
other would make the accent a label for which network you are looking at.

One radial in the wash, not two. The Instagram card needs a pair because its
brand is a gradient; LinkedIn is one colour, and faking a gradient out of it
would only make it look like a worse version of its neighbour.

Rendered unconditionally, for the same reason the invite is: the posts can fail
to load and the section still has to be a way through to somewhere.

Verified: two cards, Instagram then LinkedIn, both 230x230, both carrying
target=_blank and rel=noopener, both with a glyph, and the modifier class on the
second. NOT verified visually — the browser pane would not composite a frame at
the time, so the tint and the pairing want an eyeball before anyone trusts them.

A note on the edit rather than the code: the first attempt to write this failed
because a Python string containing `.join('')` closed itself on the JS quotes.
Nothing was written, because the asserts run before the write. Building JS
template literals from inside single-quoted Python is a trap worth avoiding —
use double quotes for any line carrying JS quotes.


## 115. The Interventions tab was still wearing a dark theme (2026-09-02)

The M.Sc. card's dashboard is the UHI twin, source at
`E:/KFUPM/uhi_digital_twin_v2/portfolio/uhi-twin-portfolio`, built to `dist/`
and copied into `public/uhi-twin/`. Its Interventions tab was reported as
having "a shadow effect which is not looking nice" and text leaving the panels.
Both turned out to be leftovers from when the app was dark.

`InterventionsPage.jsx` is the only file in that app that hand-rolls its panel
chrome instead of using the `.glass-*` classes in `index.css`. Its `GLASS`
constant carried

    boxShadow:  ... 0 24px 64px rgba(0,0,0,0.60), 0 4px 16px rgba(0,0,0,0.35)
    textShadow: 0 1px 4px rgba(0,0,0,0.85)

and `textShadow` inherits, so every word in all eight panels of that tab was
painted with an 85%-black blur behind dark slate text. That is the smudge. The
shadow is now the one the rest of the app uses, `0 6px 24px rgba(15,23,42,0.10)`
plus a 1px white inset, and the text shadow is gone. The panel fill went
0.66 -> 0.82 white, because the black text-shadow had been doing the legibility
work over the map and something had to replace it.

Four more of the same vintage in that file: the map hover tooltip was
`rgba(7,15,28,0.96)` with `#0f172a` text -- black on black, so the district
name, the city and every label were invisible and only the green value read.
The basemap style menu was `rgba(4,8,15,0.98)`, a black box in a light UI. The
coverage popover and the enlarged-results modal both cast 60%-black. Three
sub-cards inside the results panel were filled `rgba(0,0,0,0.18)`-`0.22`, which
over the frosted panel renders as a mid-grey slab.

### The text leaving the panel is a width problem, not a wrapping one

The opacity row is `[dot Layer] [range] [100%]` in a 200px panel. A range input
has an intrinsic min-width and `min-width: auto` on a flex item, so the row
could not shrink and `100%` printed 21px past the panel edge. `minWidth: 0` on
the input, `flexShrink: 0` on the label.

The bigger one only appears at the size the site actually embeds this at. The
top strip is `left: 216, right: 490`; the modal panel is `max-width: 1080px`,
so the strip gets about 270px for four category pills -- roughly 43px each.
The four category labels have `whiteSpace/overflow/textOverflow` and clip; the
Literature Basis pill, written out separately below them, was missing those
three properties on its title line, so "Literature Basis" wrapped and printed
onto the map. The count badge and the caret escaped every pill, because nothing
on the button clipped and nothing was `flexShrink: 0`.

Clipping alone would have left four unreadable stubs, so the strip now wraps:
`flexWrap` with `flex: '1 1 130px'` per pill gives four across when there is
room and 2x2 when there is not, with no breakpoint. A `ResizeObserver` on
`headStripRef` (already there for outside-click) sets `stripCompact` below
560px, which drops the tagline line -- at 990px that is a 70px strip instead of
a 140px one over the map.

Verified at 900, 990, 1440 and 1920: zero elements with `scrollWidth >
clientWidth` under visible overflow anywhere on the tab, in the empty state and
with a simulation run; every child of every pill measured 11px inside its
edges. The one remaining overflow report on the tab is an open dropdown being
wider than its anchor, which is what a dropdown is. The navbar clips its last
tab below ~950px, but that is `Navbar.jsx` and affects all seven tabs -- not
touched.

Rebuild is `node_modules/.bin/vite build` in that folder (~40-110s), then copy
`dist/index.html` and `dist/assets/*` over `public/uhi-twin/`, clearing the old
hashed files first. `db/`, `districts/` and `figures/` are unchanged data and
do not need recopying.

## 116. Language switching stops guessing (2026-09-03)

Reported: visitors in India were "sometimes" seeing the site in Chinese without
choosing it. `src/i18n/index.js` had never force-switched anything — it detected
`navigator.language`, and if that resolved to a supported non-English code it
surfaced an opt-in toast ("This page is available in Chinese — yes / stay in
English") 1.8s after load. Requiring a click was meant to make this safe.

The signal itself was the bug. `navigator.languages` reflects whatever
languages/keyboards are installed system-wide, not what the visitor reads in —
and Xiaomi/MIUI phones (extremely common in India) commonly carry a Chinese
system component that reports `zh` in that list even when the device's actual
UI and the visitor's browsing language are English. So the toast kept
offering Chinese to English-reading visitors in India specifically, which read
to them as "the site changed language on its own."

Fix: deleted the detection entirely. `initI18n()` now only restores a language
the visitor previously *picked from the toolbar switcher themselves*
(`localStorage['sa-lang']`, set only by the switcher's click handler with
`remember:true`); it no longer reads `navigator.language` at all, and there is
no timer, no toast, no offer/decline choice to track. Removed with it:
`showOffer()`, the `sa-lang-declined` localStorage key, and the now-dead
`.langtoast*` CSS block in `src/styles/i18n.css`. `showDisclaimer()` (the small
"machine-assisted translation" note) stays — it still fires after a manual
switcher pick, which is the one path left that ever shows a non-English page.

`lang.offer`/`lang.apply`/`lang.dismiss` keys are now unused in every language
block of `src/i18n/strings.js` (21 lines) — left in place since dead dictionary
entries are harmless and touching all seven blocks wasn't worth the risk for
this fix; worth a cleanup pass if `strings.js` is touched for other reasons.

Verified in the dev server: switcher lists all seven languages, waiting past
the old 1.8s delay produces no toast, `vite build` passes, picking a language
from the toolbar sets `html[lang]`, persists to `localStorage`, and shows the
disclaimer note; a fresh load with no stored preference stays English.

## 117. Social-preview card: stale title, static-image reality, and a real hero-globe frame (2026-09-04)

The share-preview card (WhatsApp/iMessage/LinkedIn) was still saying "Smart
Cities Researcher, Urban Data Scientist" — a label the site itself dropped a
while ago. The live typewriter under the hero name now cycles "Architect /
Urban Designer / Spatial Researcher" (`src/modules/hero.js` `EN_ROLES`), and
the `<title>`, meta description, `og:title`/`og:description`, and
`twitter:title`/`twitter:description` had never been updated to match. Fixed
all of them to the current framing, and rewrote the description to the
current, accurate facts (GPA 4.0/4.0, satellite-driven digital twin for UHI,
seeking fully funded PhD positions — matching `#contact .contact__lead`
verbatim in substance) rather than the old vaguer "smart city roles" line.
`og:url` also still said `shibliafaq.vercel.app`; now `shibliafaq.com`.

**Worth knowing for next time: link-preview cards never animate `og:image`.**
Every platform that renders one (WhatsApp, iMessage, LinkedIn, Slack...)
extracts a single static frame even from an actual `.gif` — asked to use "a
GIF of the site scrolling / the earth rotating," the real deliverable is one
well-chosen still frame, not a truly animated preview.

**Getting a real frame out of the three.js globe was the actual work.**
`document.getElementById('heroGlobe').toDataURL()` returns near-empty PNGs
(single-digit KB) most of the time — the renderer does not set
`preserveDrawingBuffer`, so the drawing buffer is typically already cleared by
the time JS reads it. Calling `toDataURL()` inside a double
`requestAnimationFrame` (i.e. wait two frames, then read) reliably lands
between a render and the clear — same canvas went from a 27 KB near-blank
capture to an 886 KB real one this way, no renderer changes needed.

Getting that data OUT of the sandboxed preview pane was the second problem:
neither an `<a download>` click nor `Read`-ing a "screenshot" produces a file
on disk from this environment. What worked: spin up a one-shot local HTTP
server (`http.server`, CORS-open, writes whatever body it receives to a named
file and shuts itself down), then `fetch(dataURL).then(r => r.blob())` and
`fetch('http://127.0.0.1:8765/upload', {method:'POST', body: blob})` from the
page. The blob crosses the sandbox boundary fine even when nothing
download-shaped does.

The raw capture was composited afterward with Pillow — trimmed to the
sphere's own bounding box, scaled to overflow the 630px card height for an
immersive crop rather than a small centered dot, placed asymmetric-right on
the site's actual `#09090b` background (matching `theme-color`, not a guessed
black) — and shipped as `public/assets/img/og-earth.webp` (33 KB). Also added
`og:image:width/height/alt` and `twitter:image`, which the original tags
never had.
