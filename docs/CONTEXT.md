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
