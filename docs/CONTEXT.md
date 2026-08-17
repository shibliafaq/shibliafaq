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

