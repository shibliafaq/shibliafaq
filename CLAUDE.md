# Shibli Afaq — portfolio v2

_Last updated: 2026-08-20 (session 3)._

Vanilla JS + Vite 7. No React. GSAP ScrollTrigger + Lenis for scroll, three.js
for the globe, canvas for the pixel valley. Multi-page build via
`rollupOptions.input`.

**Read `docs/CONTEXT.md` before changing anything.** It is the source of truth
for this site — what was built, what was tried and thrown away, and why. This
file is only the standing rules; CONTEXT.md is the reasoning.

---

## Hard rules

**1. All work happens in `E:\Website\shibli-portfolio`.**
`E:\Website\v2` is the archive. It is still useful as a source of original
assets (the architecture portfolio originals live there), but nothing is edited
there and nothing is served from there.

**2. Never overwrite `README.md`.**
This repo deploys from `shibliafaq/shibliafaq`, which is **also the GitHub
profile repo** — that README renders on the user's GitHub profile page. A
generated project README would replace their profile. Touch it only if asked
explicitly.

**3. The valley map is precious.**
`public/assets/pixel/valley-map.json` is hand-authored and has been lost twice.
Snapshot before any write (`/__save-valley` does this into `.map-history/`), and
never write while an editor tab is autosaving — the tab will save over you.

**4. Keep `docs/CONTEXT.md` live.**
Append a numbered, dated section as work lands. Do not batch it to the end of a
session; the reasoning is worth more than the diff and it is the first thing
read next time.

---

## Running it

```bash
npx vite --port 5199
```

Prefer the Browser pane's `preview_start` with the root `launch.json` entry
**`portfolio`** (port 5199) over running a server by hand.

When driving the page in a browser, **scroll with wheel events, not
`scrollTo`** — the earth sequence and the wheels are scroll-scrubbed, and
jumping the scroll position skips the states you are trying to observe.

---

## Method

**Measure before fixing, and check the metric survives the change.** Several
wrong conclusions on this project came from a broken instrument rather than
broken code:

- a verification regex that could never see the thing it was checking for
- reading canvas pixels while the element sat at `opacity: 0`, two screens early
- a parse sweep that checked files which did not exist
- a 0.625× screenshot downscale that manufactured a seam line
- a font probe that copied `font` but not `text-transform`/`letter-spacing`,
  under-reading rendered width by 46% (see CONTEXT §23)

So: verify the instrument, then the code. And after a fix, re-measure — a metric
that no longer applies is not a passing metric.

**Parameters cannot fix a wrong concept.** When the user objects to a direction,
say so after the first objection rather than tuning sizes and angles through a
third. The projects-section tile-field was rebuilt three times before the real
problem — the transition had kept the motion and discarded the reason — got
named.

**Ask how an asset was produced before diagnosing it.** AI-generated "pixel art"
has no real pixel grid, so grid-based repair tools cannot work on it.

---

## Traps that have already cost time

**CSS specificity: `.wheels .pcard` (0,2,0) beats `.wheel__card` (0,1,0).**
Cards carry both classes. This has caused three separate bugs — `transform`,
`height` and `width` each silently overridden. Geometry belongs on
`.wheel__card`; appearance on `.pcard`. Do not restate one on the other.

**Anchor scripted CSS edits on the full declaration text, not the selector.**
`s.index('.wheels .wheel__title {')` matched a one-liner inside a media query
rather than the real rule below it, and the replacement swallowed 154 lines.
Check `git diff --stat` before building.

**Backticks inside GLSL comments terminate the JS template literal.**

**`position: sticky` dies inside any `overflow: hidden` ancestor,** and is
constrained by the **margin** box — a negative margin-bottom collapses it.

**Paint and hit-test disagree inside `preserve-3d`, and it is worse than it
first looks.** A real click on a wheel card resolves its target to the ancestor
`.wheel`, so a listener bound to the card never fires. `elementFromPoint` is
*also* unreliable: it resolves the front card at `rotateX(0deg)` and returns the
`.wheel__scene` plane behind it once the ring turns one step. Both `modal.js`
and `book.js` therefore fall back to `frontCard()` in `wheel.js`, which derives
the front card from the largest projected area and needs nothing from the
browser but a bounding box. `.click()` works either way, so this survives casual
testing. If a card "will not open", check the ring rotation first.

**Build image maps from measured pixel content, never from filenames.** The
Olaya before/after pair arrived twice with the meaning of "before" flipped.

**A colour ramp is a measurable object, so measure it.** Three ramps were
rejected in a row on this project, and the third — indigo/blue/ice/sand/gold —
had 22 near-grey samples starting at t=0.50, the same pale-midpoint failure that
had already been complained about twice. `tools/lst/ramp_check.py` scores L*
monotonicity, minimum dE per 5% step, and distance from the grey axis. And the
endpoints are rarely the constraint: here a single scene occupies only a third
of the scale, so every one-third window has to differ from itself or a whole
city renders flat. See CONTEXT §26.

**A ramp built for a dark map is unreadable as text on it.** The same values
printed as type in the city rail measured 1.19:1 against the page. Floor the
lightness and keep hue and chroma (`rampText()`), rather than compromising the
map ramp.

**Fixed colour ranges should be percentiles, not min/max.** Pooled across 24
scenes, min/max are set by outlier pixels in two extreme frames; ordinary scenes
then land in a sliver. p2-p98 roughly doubled the usable span.

**Do not let colour and height encode the same variable identically.** On the
Landsat map both read the cell's position in the city's whole-year range, so on
any one date every column stood at the same height: Dammam had 839 m of relief
across a 28.8 km footprint, a 2.9% slope. Fix by giving them different jobs,
colour fixed across the city and height normalised within the frame, and scale
the height span by the city's ground width so every city gets the same visual
slope. See CONTEXT §27.

**When a fitted line misses the data, suspect the model before the plot.** The
"equation and values not matching" report was a straight line fitted to a
relationship that is flat across the tropics and falls only poleward. A hinge
beat both the line and a quadratic in both hemispheres (0.826/0.819 against
0.780/0.613 and 0.801/0.802). Also: sample a fitted curve ONLY across the range
that has data, never the full axis.

**A physical filter does not catch cloud.** Thin cloud reads as a perfectly
plausible -30 C, so `repair_lst.py`'s -70/+80 window passed whole cloud-covered
frames: Abuja had 12% of its pixels below 0 C, in Nigeria. An absolute threshold
cannot separate them either, because Abuja's bogus -23.6 C overlaps
Ulaanbaatar's real -23.9 C. Threshold on the CITY'S OWN distribution of frame
medians (`tools/lst/clean_frames.py`).

**Check the build's EXIT CODE, never its output.** `npx vite build | grep error;
echo "build ok"` prints success regardless, because `echo` runs either way. That
masked a genuinely failing build for four steps. Use
`npx vite build >/tmp/b.log 2>&1 && echo PASSED || { echo FAILED; tail /tmp/b.log; }`.

**An explicit `display` overrides `[hidden]`.** `.view { display: grid }` beats
the browser's `[hidden] { display: none }`, so hidden panels render anyway —
stacked, while the tab bar highlights one you cannot see. Any element given a
display needs `.thing[hidden] { display: none }` restated.

**Never gate startup on a third-party load event.** `map.on('load')` did not fire
on the IoT page even with the style parsed and tiles arriving. Start on whichever
comes first, the event or a short timer.

**A fade-in entrance hides the newest rows of a fast feed.** At 5x, new rows land
faster than a 0.28s fade completes, so the top of the list is permanently
invisible. Slide, do not fade — and prepend rows rather than rebuilding
`innerHTML`, which restarts the animation on every row.

---

**`touch-action` has to mirror whichever axis the control actually owns.**
`.wheel` sets `touch-action: pan-x` because the wheel owns vertical input — true
on the desktop. Below 900px `data-wheel="auto"` flips the wheel to its horizontal
axis and the drag handler starts reading `clientX` only, so a vertical swipe was
refused by the browser AND ignored by the JS. Measured on a phone: phase 0, page
scroll 0, over 83% of the viewport width. If a component changes axis at a
breakpoint, `touch-action` changes with it. See CONTEXT §38.

**A reduced-motion fallback must take the CONTAINER out of 3D, not just the
items.** Setting the cards to `position: relative; transform: none` is correct
and insufficient: the stage keeps `overflow: hidden` and a fixed height, so
fourteen cards needing 5040px rendered three. And `.wheel__scene` between the
stage and the ring is `position: absolute; inset: 0` — leave that and the stage
collapses to **0 height** even after the ring is fixed. Stage, scene and ring,
all three. `prefers-reduced-motion` cannot be emulated from the page, so verify
by applying the block's exact declarations at runtime and measuring.

**A diff cannot tell you which side is newer.** `tools/sync-site-copy.mjs` wrote
`docs/site-copy.md` over `index.html` on the assumption the markdown was always
the newer copy. It is not — the HTML gets hand-edited too, and the two produce an
identical diff whichever side moved. It nearly reverted a published paper to
"Under Review". `docs/.site-copy.lock.json` now records what the HTML said when
the two last agreed, which is the one fact that separates "doc edited" from "doc
stale"; the tool refuses on stale and on conflict. Do not delete that lockfile.

## Asset pipeline

Originals are never committed. Conversion scripts live in the scratchpad and are
documented in CONTEXT.md — except the Landsat pipeline, which is committed at
`tools/lst/` because without it the 57 MB under `public/assets/data/lst/` cannot
be rebuilt, only re-downloaded by hand.

Architecture pages ship in **two tiers** because the book zooms to 4×: a
half-spread is ~750 CSS px, so full zoom is a 3000px rendering.

- `p01.webp` — 1600px q84, the spread
- `p01-hi.webp` — 3000px q90, fetched only when the reader magnifies
- `p01-t.webp` — 320px q74, thumbnails

The ArcGIS map layouts follow the same two-tier shape: `gis_*.webp` at 900px for
the gallery grid and `gis_*@2x.webp` at 2000px that the lightbox swaps in. On a
map layout the legend IS the content, so a lightbox that re-serves the gallery
file only shows a bigger blur.

Quality is chosen by measurement, and the answer differs by content type: the
Earth photograph went flat above q78, while line art keeps paying back quality
through q94 because hard edges are the DCT's worst case. Never upscale a source.

---

## The five dashboards

They all live inside project cards as **iframes**, never merged into this site's
JS tree, and they are all full-viewport apps. Inside an iframe `100vh` resolves
to the iframe's height rather than the window's, so the property that makes them
impossible to merge is the same one that makes them trivial to embed.

| card | page | weight |
|---|---|---|
| UHI Digital Twin (thesis card) | `E:\KFUPM\uhi_digital_twin_v2\portfolio\uhi-twin-portfolio\dist` | `public/uhi-twin/` (54 MB) |
| Dammam 3D twin (GIS card) | `gis-twin.html` | 1.25 MB payload |
| IoT monitoring (IoT card) | `iot-twin.html` | 12 KB JS + 12 KB CSS, no map libs |
| Global Landsat LST (temp card) | `lst-twin.html` | ~45 MB, one file per city, fetched on demand |

`mc-twin.html` (3-city MODIS) was **retired on 2026-08-20** — lst-twin replaced
it on the temp card. Files, build entry and the `twinLegacy` block are gone.
See `docs/CONTEXT.md` §28.

The embed has three states, and the middle one is the point: **cold** (nothing
fetched), **live** (running and visible behind a transparent shield), **armed**
(shield off). deck.gl reads the wheel as zoom, so an armed map inside a
scrolling modal eats the page scroll the moment the cursor crosses it. Full
screen uses the native Fullscreen API because the modal panel is transformed
while animating, and a transformed ancestor re-bases `position: fixed`.

Declared per project via `twin: {...}` in `src/data/projects.js`. deck.gl and
maplibre are a separate rollup chunk so the front page bundle is unchanged.

All five share one rule: **the accent never carries data**. Chrome is `#0369a1`
on the four light dashboards and gold `#e0a355` on the dark Landsat one, and
each dataset has its own scale, so no colour on screen is ambiguous. Watch for
the case where a chosen palette names one colour for both — the Landsat southern
hemisphere series had to move to a deeper amber for exactly this reason.

Two of them were built twice, both times because the brief was read as "copy the
idiom" rather than "copy the design language and cover the same components".
The IoT one first arrived as a 3D city map when what was wanted was a monitoring
console; the multi-city one first covered two of its Streamlit app's five pages.
**Before rebuilding someone's dashboard, enumerate the pages it already has.**

### The Dammam twin specifically

15 layers over 12,954 cells. Every readout figure is computed from the payload
at runtime rather than typed into the copy, so it cannot drift: exposure returns
57.3 km2 / 229 cells and the hot spots 120.8 / 505.0 km2, all matching the paper.

**Classification is stated, not assumed.** Natural breaks (Jenks) by default,
switchable to equal count and equal interval, with the active method printed
above the legend and the cell count and share shown per class. The methods
disagree about who counts as vulnerable: on the built-up model, equal interval
puts 71% of cells in one class and quantile leaves a bottom class spanning
0.204 to 0.534. Jenks here is the exact Fisher-Jenks DP run on 200 weighted
bins, because the textbook O(n^2 k) form is 840 million steps per layer.

**No Getis-Ord layer shipped until it reproduced.** A from-scratch recomputation
gave a 0.93x hotspot ratio against the published 4.18x, so it was thrown away
rather than shipped wearing the study's authority. The real answer was FDR
correction, which `arcpy.stats.HotSpots` leaves off by default and the paper's
method section does not mention. See `docs/CONTEXT.md` section 24.

---

## Content

Front-page copy lives in `docs/site-copy.md`, synced by
`tools/sync-site-copy.mjs`. Timeline and speech-bubble text have their own docs.
Several strings still have no translations (`projects.title`, `projects.lead`,
`atlas.lead`, `future.*`).
