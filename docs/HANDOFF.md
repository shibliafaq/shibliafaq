# Portfolio v2 — handoff

Everything needed to pick this up in a fresh session. Written 2026-08-12, and
kept current as work lands — see §13.

---

## 1. What this is

A ground-up rebuild of Shibli Afaq's personal portfolio (deployed at
`shibliafaq.vercel.app`) in a cinematic, motion-led idiom.

**The brief:** the v1 site was content-rich but read as "a typical Claude design
website" — text-heavy and flat. The reference points given were three sites:

- `horizonx.so` — paid UI/template library; GSAP scroll choreography, WebGL, huge cards
- `getlayers.ai` — sells *prompts* not files; Next.js + three.js; indexes work by TONE (dark/light) and MOOD (luxe/technical/organic/playful/brutalist/calm)
- `framerate.space` — AI generator for 3D websites; cinematic photoreal heroes, giant display serif bleeding off-canvas

**The constraint:** keep all content identical. Only pacing, layout and delivery change.

### Paths

| | |
|---|---|
| **v2 project (working)** | `E:\Website\v2\` |
| **v1 original (untouched)** | `E:\Website\index.html` — 11 MB single file, keep as reference |
| Full-res source PNGs | `E:\Website\*.png` (2752×1536, 5–8 MB each) |
| Extracted v1 assets | `E:\Website\v2\assets\raw\` (gitignored, source of truth) |
| Deployed assets | `E:\Website\v2\public\assets\` |

```bash
cd E:\Website\v2
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

Vercel: framework preset **Vite**, build `npm run build`, output `dist`.

---

## 2. Diagnosis that drove the redesign

Five specific mechanisms made v1 read as text-heavy — worth keeping in mind
before changing anything:

1. **Type never got big.** Section headings capped at `clamp(1.9rem, 3.8vw, 2.85rem)` ≈ 46px; project card titles at `0.88rem`. Reference sites run display type at 8–15vw and let it bleed past the measure.
2. **Too much per viewport.** Section padding was a flat `88px`. The fix for "same content, less heavy" is redistribution — same words across 3× the vertical space, revealed progressively.
3. **Four co-equal accents** (amber / cyan / violet / green). That is the single strongest "dashboard" signal in a stylesheet.
4. **Motion was reveal-only** — IntersectionObserver fades. Reference sites use scroll as *choreography*: pinning, scrubbing, parallax at different depths.
5. **Image was a thumbnail, text was the page.** Needed inverting.

**The unfair advantage:** real thermal satellite imagery (LST rasters, NDBI maps,
Getis-Ord hotspot maps, Kepler.gl 3D recordings). Amber-and-red heat gradients on
dark ground is exactly the palette those reference sites fake. The instruction
throughout has been: make the *data* the cinema, don't bolt on generic particles.

---

## 3. Current state

### Built and visually verified

- Asset pipeline (11 MB → ~81 KB gzip initial payload)
- Vite project, split files, no inline base64
- Design system: single amber accent, Jost typography, viewport-relative rhythm
- Hero with rotating WebGL Earth (NASA textures, clouds, city lights, drag-to-rotate)
- Scroll choreography: Lenis + GSAP ScrollTrigger throughout
- Thermal section — three Kepler.gl recordings scroll-scrubbed across 320vh
- Projects — pinned horizontal travel, swipe fallback on mobile
- Atlas — instanced WebGL heat-plate, five thesis cities
- Publications / Skills / Background / Contact reflowed
- Project modal, lightbox, 18-slide architecture portfolio viewer
- Mobile pass: dedicated `max-width: 560px` block
- **Language switcher (i18n)** — verified in-browser 2026-08-12. See §7.
- **Skills field** — 40 skills as colliding balls inside a traced brain outline,
  replacing the four tag-list cards. Built and verified 2026-08-12/13. See §8.
- **Experience & Education** — full map composition built and rendering in
  `lab/journey.html`: four regions with real barriers, clustered settlements,
  hashed vegetation, 18 buildings across three sprite types, and real seasonal
  autumn trees mixed per region (§9.10), **and a working scroll walk** where the
  character crosses the map and one arrival card appears per stop (§9.11,
  `lab/walk.html`), populated with 11 distinct villagers, animals, rocks,
  scarecrows and bushes (§9.10). **Wired into `index.html` and verified
  in-browser 2026-08-13** — pinned by ScrollTrigger, cards built from the
  timeline markup, timeline kept as the reduced-motion / no-JS / narrow
  fallback, stop copy translated in all six languages, asset credits in the
  footer. **2026-08-14: the seven milestone buildings were replaced with
  complete artist sprites** — two three-manor institution composites bookending
  five office buildings — after the modular composer was judged not to read as
  buildings at all. See §9.12; that section also records why the composer route
  must not be restarted.

### Copy

Everything except the Skills section is v1 verbatim. Project detail content
lives in `src/data/projects.js`. The Skills list was edited on 2026-08-12 at the
user's request — see §8.

---

## 4. Design system

`src/styles/tokens.css` is the single source. Everything else consumes tokens.

### Palette — one accent

v1 ran amber, cyan, violet and green as equals. v2 commits to **amber only** over
a **warm-neutral black** (`#09090b`, not v1's blue-black `#060810` — amber sits on
neutral far better than on navy). Cyan is reserved for live/streaming states.

```
--ink #09090b   --amber #f59e0b   --ember #ff5f1f
--heat  linear-gradient(100deg, ember, amber 55%, amber-hi)
```

The `--heat` ramp is deliberately the same ramp as a thermal raster. That is why
it belongs on this particular site.

### Typography — one family

**Jost** (variable, upright 300–800 plus italics), loaded as a single Google
Fonts request. Four tokens (`--f-display`, `--f-body`, `--f-mono`, `--f-serif`)
all point at it, but are kept separate so any one role can be reassigned later
without touching the ~50 rules that consume them.

Replaced Syne / IBM Plex Sans / IBM Plex Mono / Cormorant Garamond. With no
monospace or serif in the system, role separation now comes from **weight,
tracking and case**. Four compensating adjustments were required:

| | Was | Is | Why |
|---|---|---|---|
| body weight | 300 | **400** | Jost Light is too fragile reversed out on near-black |
| `strong` | 500 | **600** | weight carries load a typeface change used to |
| sizes below display | — | **+1 step** | Jost's x-height is smaller than Plex's |
| `--ls-display` | −.045em | **−.028em** | geometric bowls collide under tight tracking |
| `--ls-label` | .16em | **.2em** | wide-tracked caps replace the monospace |

Grey ramp (`--t-1` … `--t-4`) was also lifted one step — Jost's strokes are
lighter than Plex's at the same size.

---

## 5. Architecture

```
index.html              ALL content, static and crawlable (SEO matters here —
                        admissions committees find this via search)
src/
  main.js               entry; idle-loads i18n and the globe, lazy-loads atlas
  data/projects.js      project detail copy (v1 verbatim) + 18 arch slides
  i18n/
    index.js            detect / apply / persist / switcher UI / disclaimer
    strings.js          ar, fr, de, es, zh, hi (English is NOT here — see §7)
  modules/
    scroll.js           Lenis <-> ScrollTrigger wiring, reduced-motion gate
    experience.js       the Experience map's seam with the page (§9.12)
    hero.js             typewriter, intro timeline, scroll choreography
    reveals.js          word-split headings, counters, marquee, progress bar
    thermal.js          three-city sticky sequence, scroll-scrubbed video
    projects.js         pinned horizontal travel (swipe fallback on mobile)
    earth.js            hero globe — three.js, custom shaders
    atlas.js            instanced heat-plate — three.js
    skills.js           brain-bounded physics field — 2D canvas, no library
    modal.js            project modal, lightbox, arch portfolio
    ui.js               nav, cursor, contact form
    pixel/              Experience-map art pipeline — see §9
      cutefantasy.js      sheet descriptor, Scene, nine-slice blob  [ACTIVE]
      recolour.js         per-sheet grading, SITE_GRADE             [ACTIVE]
      journey.js          REGIONS, PATH, STOPS, buildings, geometry [ACTIVE]
      worldmap.js         buildScene() — the one place the world is composed
      walk.js             scroll -> distance, camera, player, cards  [ACTIVE]
      tilemap.js          generic layered TileMap (CC0-set era)
      grid.js             Grid primitives + seeded rng
      build.js            procedural sprite generators (abandoned route, §9.1)
      sprites.js          hand-authored character grids (abandoned route)
      palettes.js         slot palettes for the generated sprites
      render.js           run-length sprite blitter, makePixelCanvas
  styles/               tokens / base / layout / sections / overlays / i18n
lab/                    dev-only pages, not in the build — see §9.7
tools/
  trace-brain.mjs       PNG -> silhouette anchor path (see §8); not part of build
assets/
  Brain_Reference.png   skills-field source image — NOT deployed, see §8
  tilesets/
    zelda-cc0/            CC0 Zelda-like set + LICENSE.md
    incoming/             downloaded itch packs + LICENCES.md (§9.3)
  raw/                  extracted v1 assets (gitignored)
public/assets/
  img/                  WebP
  video/                MP4 (thermal-*.mp4, dense keyframes for scrubbing)
  doc/                  résumé PDF
```

Note the two `assets` directories are different things: `public/assets/` ships,
plain `assets/` is source material that never reaches `dist/`.

**Loading strategy:** English content is in the HTML, so first paint never waits
on JS. three.js (128 KB gzip) and the i18n dictionary both load on
`requestIdleCallback`. The atlas chunk loads at 600px before its section.

---

## 6. The hero globe (`src/modules/earth.js`)

The most-iterated part of the site. Read this before changing it.

### Textures — all NASA public domain

| | URL | Used at |
|---|---|---|
| Day (surface) | `eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_8192.tif` | 6144 / 4096 / 2048 |
| Night (city lights) | `.../79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg` | 4096 / 2048 |
| Clouds | `.../57000/57747/cloud_combined_8192.tif` | 4096 / 2048 |

An earlier version used a **Google Earth screen capture** (`earth.jpg` from the
UHI_Presentation assets folder). It was replaced and deleted because Google's
terms require their attribution to remain visible on published use, and the crop
that removed the UI chrome also removed it. NASA imagery carries no such
requirement. **Do not reintroduce the Google capture.**

### Texture tiering — `tiers()`

Roughly 100° of longitude is on screen, so a W-wide equirectangular map supplies
about `W × 0.28` usable pixels across the viewport:

| Tier | Day map | Covers | Condition |
|---|---|---|---|
| 6K | 6144×3072 (1.4 MB) | ~1710 px | ≥1500 effective px, ≥8 GB RAM |
| 4K | 4096×2048 (730 KB) | ~1140 px | ≥760 px |
| 2K | 2048×1024 (220 KB) | ~570 px | phones / <4 GB |

Night and cloud maps stay one tier lower — diffuse, no fine detail, and a 6K
triple would cost ~200 MB of VRAM once mipmapped.

### Composition (current values)

```js
camera.position.set(0, 0, 3.1)      fov 36
rig.position  desktop (0.1, -1.45)   narrow (0, -1.28)
rig.scale     desktop 1.74           narrow 1.58
rig.rotation.z  -23.4°               // axial tilt
BASE_TILT_X = -0.62
```

Negative Y drops the sphere below frame centre so its **upper limb arcs across
the top** with space above. This was briefly inverted (globe above, limb at the
bottom) and reverted on request.

`BASE_TILT_X` is not cosmetic: with only the sphere's top cap in frame you are
looking at high northern latitudes, which is ice and open ocean. Leaning the
north pole away swings the land-heavy mid-latitudes into view. If you move
`rig.position.y`, you almost certainly need to retune this.

### Shading

- **Terminator** computed in-shader; city lights only where the sun has set
- **Ocean specular** — water mask derived from the day texture itself (`day.b − day.r`), no extra file
- **Clouds** scroll in U slightly faster than the surface — that is what sells them as weather rather than paint
- **Soft horizon** — the surface fades into haze toward the limb so it never reaches the silhouette at full contrast

### Atmosphere shell — the double-horizon trap

The shell is `SphereGeometry(GLOW_R)` rendered `BackSide` with additive blending.

A naive `pow(rim, n)` falloff **peaks at the shell's own silhouette**, drawing a
second bright arc out in space above the planet. That bug appeared and was fixed.

The fix: for a shell of radius R the planet's edge projects to
`rim = 1 − √(1 − 1/R²)`. That value is passed in as the `peak` uniform and the
glow is built as a band that rises to it and dies before the shell edge.

**If you change `GLOW_R`, the peak recomputes automatically — but verify the
falloff still ends below 1.0**, because as the shell thins the peak crowds
toward the edge:

```js
const peak = 1 - Math.sqrt(1 - 1/(R*R));
const fallEnd = peak + (1-peak)*0.82;   // must stay < 1
```

Current: `GLOW_R = 1.035` (peak 0.742, fades by 0.954). Colour is pure white
`#ffffff` — it was blue `#5b9bff`, changed on request because a saturated blue
rim reads as a drawn outline rather than light.

Current intensities: shell band `0.74`, surface rim add `0.42`, surface haze mix
`0.5`. **The haze mix is not part of the halo** — it is what softens the horizon.
Reducing it brings the hard edge back.

### Visitor orientation

`visitorLongitude()` derives longitude from the browser's UTC offset (15° per
hour). No permission prompt, no IP lookup, no network call. Accurate to about a
time-zone width, one hour out during DST — far more precision than "show me my
region" needs.

`lonToRotation(lon) = 90° − (lon + 180°)` — three.js maps u=0.25 to +Z, so 90°W
faces the camera at rotation 0.

### Drag

Bound to **the whole hero**, not the canvas. The headline, description and stats
all stack on top of the canvas, so a canvas-only listener only catches drags in
the thin strip above the copy. This was a real bug — the drag appeared to work
because auto-rotation was moving the globe between screenshots.

Pointerdown skips `a, button, input, textarea, select, label, [role="button"]`
so those still click.

---

## 7. Language switcher (`src/i18n/`) — VERIFIED 2026-08-12

**Rationale:** applying globally, so the page offers itself in the visitor's
language, with a deliberately self-deprecating disclaimer:
*"I am not sure if the translation works perfectly but I tried... Ha Ha 😅"*

### Languages

English (source) + **Arabic, French, German, Spanish, Chinese (Simplified), Hindi**
— chosen from the regions named in the contact section (UK/EU, North America, GCC).

### How it works

- **English is never in the dictionary.** It lives in `index.html` and is the
  source of truth. The engine snapshots the markup on load and restores from that
  snapshot, so English can be edited freely without translations drifting.
- **70 elements** carry `data-i18n="key"`; 3 carry `data-i18n-attr="placeholder:key"`.
- **Detection uses `navigator.language`** — the language the visitor asked their
  browser for. Better than IP or timezone: someone in Riyadh reading in English
  gets English.
- **Nothing switches automatically.** A supported visitor is *offered* the swap
  after 1.8s and can decline; the choice persists in `localStorage`
  (`sa-lang`, `sa-lang-declined`).
- Picking a language manually shows the disclaimer as a transient note.

### Deliberately NOT translated

Publication and paper titles, project names, metrics, journal names,
institutions, technical vocabulary and stack tags. These are proper nouns in
every language, and translating a paper title you submitted in English makes the
research record harder to verify, not easier to read. This is normal academic
practice — worth saying out loud if it ever looks like an omission.

### Cross-module wiring

The engine fires `sa:languagechange` with `{ code, dict, roles }`:

- `hero.js` listens and swaps the typewriter's `ROLES` array (those strings live
  in JS, so the DOM-based engine cannot reach them)
- `main.js` listens and calls `ScrollTrigger.refresh()` — translated copy reflows
  every section, and the pinned ones are measured in pixels, so without this the
  projects track and thermal sequence keep the English heights and end early

### RTL (Arabic)

`src/styles/i18n.css` sets `dir="rtl"` and `.is-rtl` on the root. Most layout is
already logical (`padding-inline`, `inset-inline`); the overrides cover the
places that had to stay physical: timeline rail, pull-quote border, eyebrow rule,
`dcard::before`, modal/arch close buttons, `mmethod` border.

**The projects track is forced back to `direction: ltr`** — it is driven by a
GSAP transform in pixels, which has no notion of direction. The cards inside are
set back to `rtl`.

### Verification results (2026-08-12)

All four original checks pass, at a 961px-wide viewport, no console errors:

1. **Switcher renders** in the nav, top-right, showing the active code (`EN`);
   opens a 7-item menu.
2. **Offer toast works** — spoofing `navigator.languages` to `de-DE` produced the
   German offer after 1.8s with both buttons. Decline writes
   `sa-lang-declined=1` and stores no language; accept applies and persists.
3. **Arabic mirrors correctly** — `<html lang="ar" dir="rtl">` plus `.is-rtl`,
   no horizontal document overflow, `.projects__pin` still forced to `ltr`.
   Document height re-measured on switch (17778 → 17674 px), confirming the
   `ScrollTrigger.refresh()` wiring in `main.js` actually fires.
4. **Typewriter picks up translated roles** — German showed
   "Spezialist für GI…".

**One real bug found and fixed:** the skills marquee rendered *empty* in Arabic.
Same root cause as the projects track — `reveals.js` animates `x` in pixels from
a left-edge origin, but under RTL the flex track lays out from the container's
right edge, putting all 6336px of it outside the `overflow: hidden` box. Fixed in
`src/styles/i18n.css` with `.is-rtl .marquee { direction: ltr; }`. The items are
Latin technical terms that are never translated, so LTR is the correct reading
order for them regardless — no inner override needed.

Remaining elements that bleed past the left edge in RTL are intentional and were
checked: the cursor dot and the three `object-fit`-overscaled thermal videos,
which bleed symmetrically on both sides.

**Translation quality caveat, stated plainly:** these are my translations and I
cannot verify them the way a native speaker can. The disclaimer covers casual
readers, but a German professor reading awkward German is a real risk for a
job-search site. Worth having a native speaker check German and French at
minimum, since those are the highest-value PhD markets in the list.

---

## 8. Skills field (`src/modules/skills.js`)

Built 2026-08-12. The four tag-list cards are replaced by 34 skills as balls
drifting in zero gravity inside a traced brain outline. The brief was "each
skill is a ball floating in this area… physics based… kinetic energy should get
transferred", with the category names as a legend underneath.

### Why it is shaped this way

A skills list has no inherent reading order, so scattering it costs nothing
semantically — which makes it the one section where this is free. It also
serves the §2 diagnosis directly: same content, redistributed across space
instead of stacked as text.

The four colours were the one point of friction. Four co-equal accents is
exactly what §4 removed, so instead of four hues the groups run a **thermal
scale** — ember for the work closest to the heat research, cyan for the work
furthest from it. The legend is then the same hot-to-cold key that sits beside
an LST raster, rather than a generic colour key.

### Groups — colour, size, contents

`GROUPS` at the top of the module, indexed by the group order in the markup:

| Group | Rim | Fill | Size | Balls |
|---|---|---|---|---|
| Spatial & GIS | `#ff5a2b` | `#551a08` | 0.94 | 9 |
| Data Pipelines & Analytics | `#f5a20b` | `#4a3004` | 0.99 | 12 |
| Architecture & Design | `#e4ded3` | `#474139` | **1.22** | 8 |
| Research Methods | `#22d3ee` | `#0a3d4b` | 1.06 | 4 |
| Creative & Personal | `#4ade80` | `#0f3a21` | **1.22** | 7 |

40 balls across five full categories. Green sits *off* the thermal ramp on
purpose — that group is not research work, so reading as the outlier is the
point rather than a lapse.

The legend is forced to **3 keys then 2** by a zero-height `.skillkey__break`
spliced in at `KEY_ROW`. Without it the five keys wrap wherever the text runs
out, which lands differently in German and Arabic than in English.

Balls are opaque with white labels, so `fill` is a dark tint of the rim colour —
the bright rim and glow carry the hue, the dark fill carries the text. Using the
vivid colour as the fill would make white labels unreadable on three of the four.

Sizes are per-group multipliers, in the order requested: Architecture >
Research > Spatial > Data. **Font scales with the ball**, so a smaller group is
smaller type, not overflowing type.

### Copy changes (the only non-v1 copy on the site)

- **Removed:** Heat Vulnerability Index (HVI), Dual-Threshold Exposure Mapping,
  Getis-Ord Gi* Hotspot Analysis, Academic Writing (APA Format)
- **Added to Spatial & GIS:** Spatial Analysis, deck.gl
- **Added to Data Pipelines:** React, Claude Code
- **Added to Architecture & Design:** Adobe Photoshop / InDesign / Premiere Pro /
  After Effects
- **Added as Creative & Personal (green):** Photography, Videography,
  Cinematography, Storytelling, Sketching, Travelling, Relaxing — the first four
  started in Architecture & Design and were moved here, keeping that group's
  1.22 size, which is why green and Architecture share a scale

Each tag carries `data-ball="short label"`. The ball shows the short label, the
full string shows on hover, and the full string stays in the DOM — the balls are
drawn from `#skillList`, which is hidden rather than removed, so nothing is lost
to search.

### The brain outline — traced, not drawn

Two earlier hand-authored outlines were rejected as reading "abstract" and
"like a speech bubble". They were, and no amount of anchor tuning fixes that.

`BRAIN` is now the outer silhouette of `assets/Brain_Reference.png`, extracted
by `tools/trace-brain.mjs`:

```
node tools/trace-brain.mjs assets/Brain_Reference.png 150 brain-path.js
```

The tracer has no dependencies — it decodes the PNG with Node's `zlib` (IHDR +
IDAT, un-filtering scanlines by hand), masks opaque pixels, keeps the largest
connected component (which discards the source's title and branding text as
separate components), walks the boundary with a Moore-neighbour trace, then
simplifies with Ramer–Douglas–Peucker.

3000×2100 → 4521 boundary points → **151 anchors at ~1 px of error.** The points
are dense enough (~5 units apart) to draw smoothly as straight segments, so the
same array is the drawn outline *and* the collision polygon — they cannot drift
apart. Paste a regenerated `brain-path.js` straight over `BRAIN`/`BRAIN_H`.

**Licensing, stated plainly.** The reference is a copyrighted commercial
illustration ("Rewire with Nicole Vignola"). It was flagged and the user chose
to proceed. What mitigates it: only the outer silhouette is taken — anatomy, not
authorship — none of the palette, internal linework, labels or branding; and
`assets/` is not a deployed directory, so the image never ships. What reaches
`dist/` is 151 coordinate pairs. If this ever needs to be airtight, re-run the
tracer against a public-domain plate (Gray's Anatomy 1918) and nothing else in
the module changes.

### Physics

Hand-written, ~80 lines, no library — 34 bodies is 561 pair checks a frame,
which is nothing, and a dependency for that is the wrong trade here.

- **Zero gravity.** Gravity would pile every ball along the bottom edge in
  seconds.
- **Impulse-based collision** along the contact normal, mass ∝ area, `REST`
  0.94. This is what makes the chain reactions read right: a big ball hitting a
  small one throws it hard.
- **Containment** against the concave polygon: point-in-polygon plus
  nearest-point-on-boundary, then reflect. Handles the temporal notch and the
  brainstem correctly — balls simply cannot fit into the stem, so they get
  pushed back out.
- **Cursor repels continuously**, not just on click, so sweeping through the
  field parts it. Click adds a sharp impulse; clicking empty space shoves
  everything within 220 px outward.
- **Drag is mouse-only.** Grabbing a ball on touch would have to swallow the
  gesture, and losing the ability to scroll past the section on a phone is a far
  worse trade than losing drag there.
- **Scroll inertia.** Scrolling down carries the section upward, so inside its
  frame the balls lag downward — liquid sloshing in a moving glass. The nudge is
  computed once per *frame* and spent on the first substep only; applying it in
  every substep the fixed-timestep accumulator happens to run would multiply it.
  `lastScroll` is re-seeded in `start()`, or the first frame after the section
  comes back on screen slams the whole accumulated offset in at once.
- Low-speed **wander** keeps the field alive; without it everything stalls into
  a still life within about a minute.

### Tuning

| Constant | Now | Effect |
|---|---|---|
| `DENSITY` | 0.34 | share of the brain's area the balls may fill. **Lower it to show more of the outline** — radius and type shrink together, so nothing breaks |
| `MIN_FS` | 7.5 | floor on type size; legibility wins over hitting `DENSITY` |
| `MIN_W` | 640 | below this viewport width the field does not mount at all |
| `KICK` / `PUSH_F` | 26 / 1.5 | click impulse and cursor repulsion |
| `SCROLL_F` / `SCROLL_MAX` | 0.06 / 70 | scroll inertia strength, and the per-frame scroll distance past which it stops growing |

Ball sizes are fitted to the **polygon** area, not the canvas — the brain's
interior is well under half its bounding box, so sizing against the canvas
overpacks it badly. That was the bug behind the first attempt, where balls ended
up outside the shape entirely.

### Fallbacks

The field never mounts under `prefers-reduced-motion`, without JS, or below
640 px. In each case `#skillList` stays visible and the section is the original
four cards. Thirty-four labelled balls inside a brain at phone width is not a
legible page; the list genuinely is the better one there.

### i18n

Group names are translated, so the legend is rebuilt on `sa:languagechange`.
Skill names are not translated (they are stack tags — see §7). Two new keys were
added to all six dictionaries: `skills.hint` and `skills.g5`.

---

## 9. Experience & Education — pixel-art map (LIVE in index.html)

Direction agreed 2026-08-13; art pipeline and journey data built 2026-08-13;
**wired into `index.html` and verified in-browser 2026-08-13 — see §9.12.**
The `<ol class="timeline">` of 7 `.tli` entries is still in the markup and is
still the section under reduced motion, without JS, and below 900px. §9.6 lists
what remains (item 1, the modular building composer, is the live one).

### The brief

Redo the section in **early-90s pixel game art**. Five references live in
`assets/Pixel Art/` (not deployed). They are all the same thing: a **top-down /
three-quarter RPG overworld map** — buildings sitting in a landscape linked by
paths, tiny character sprite for scale. SNES/GBA lineage (Secret of Mana, Zelda:
Minish Cap) and its modern revival (Stardew Valley, Sea of Stars). Not a
platformer, not character sprites, not UI chrome.

### Craft rules the references follow

- Fixed 3/4 overhead angle — roofs *and* façades visible, never true isometric
- One light source, top-left; each roof lit on one slope, shaded on the other
- Hard 1 px dark outlines, no anti-aliasing across silhouettes
- 3–4 value steps per material, no more
- Cast shadows as flat dark shapes offset bottom-right
- ~16–32 px tile grid, objects sized in whole tiles
- Paths are the compositional device that leads the eye between buildings

### Two things to know before starting

**Refs 3 and 4 are not matchable.** `51a64b6…` and `e65ffce…` look
AI-generated — the pixel grid is not uniform, some regions are blurred, and the
outlines break down at cliff edges. Real pixel art never mixes pixel densities.
Use them as mood only. Refs 1, 2 and 5 are true pixel art; **ref 5**
(`efaccf0…`, flat with bold outlines, GBA idiom) is the most achievable target.

**Ref-1 quality cannot be hand-drawn in code.** That density of placed detail is
weeks of an artist's work per screen. The realistic routes are a properly
licensed tileset (Kenney CC0, or a paid itch.io pack) or the flatter ref-5 style
authored as tiles. Raise this before building, not after — same lesson as the
brain outline in §8.

### Why a map suits this content

The B.Arch runs Jul 2016 – Jun 2021 with three internships **and** the
Medicfibers job inside that span. The current single-column timeline can only
render that as sequential, which is simply wrong. A map has no such constraint —
locations can cluster by place and era instead of queueing up.

### 9.1 The route that was tried and abandoned — procedural sprites

First attempt drew everything in code: character-grid sprites (`sprites.js`),
then procedural generators for shingled roofs, stone water banks and layered
tree canopies (`grid.js` + `build.js`), authored at ref-5 resolution.

It went from "very basic" to "decent" and stopped there. The user's verdict was
right: *"still very far from original, but better."* Ref-5 quality is not in its
techniques, it is in an artist hand-placing a forest canopy band, roof plants and
dappled light with no two buildings alike. Code does not produce that.

**Those modules still exist and still work.** Keep them — `Grid`, `rng` and
`drawSprite` are used by the tileset path too, and `build.js` is a reasonable
fallback if a licence ever forces the artwork out. But do not try to close the
quality gap with more generators. That road ends.

### 9.2 Network constraints — what can and cannot be reached

Tested directly, 2026-08-13:

| Host | Status |
|---|---|
| `opengameart.org` | ✅ reachable |
| `raw.githubusercontent.com`, `codeload.github.com` | ✅ reachable |
| `registry.npmjs.org` | ✅ reachable |
| `eoimages.gsfc.nasa.gov` (NASA) | ✅ reachable |
| `kenney.nl` | ❌ connection times out |
| `itch.io` and all `*.itch.io` | ❌ SSL connection reset — **the university network blocks gaming sites; it needs a VPN.** Not a code problem, do not debug it |
| `img.itch.zone` (their CDN) | ✅ reachable, but downloads do not route through it |

So itch.io packs must be downloaded by hand and dropped in
`assets/tilesets/incoming/`. OpenGameArt can be fetched directly.

### 9.3 Licence audit — four packs, two blocked

Full text with verbatim quotes in `assets/tilesets/incoming/LICENCES.md`.

| Pack | Commercial | Redistribution |
|---|---|---|
| **Pixel Crawler** (Anokolisa) | ✅ *"You can use these assets in creating commercial products"* | No bar; only "cannot be sold as a final product" |
| **Cute Fantasy** free (Kenmi) | ❌ *"non-commercial projects"* | ❌ *"can not redistribute or resale, even if modified"* |
| **Mystic Woods** free 2.1/2.2 (Game Endeavor) | ❌ *"only ... non-commercial projects"* | ❌ same clause |
| **Zelda-like** (ArMM1998, OpenGameArt) | ✅ CC0 — nothing required | ✅ none |
| **FREE_Adventurer 2D Pixel Art** (the hero) | ✅ *"any game project, personal or commercial"* | ❌ not "as a game asset"; fine inside a project. No NFTs. Credit appreciated |

**The user's decision, and it is a reasonable one:** the site sells nothing, runs
no ads and gates nothing, so it is non-commercial by any normal standard. The
redistribution clause is aimed at re-uploading or reselling the pack, not at a
browser rendering sprites — every web game serves assets the same way. Raised
once, decided, closed. Do not re-litigate it.

Two things agreed as good practice regardless:
- **Ship a trimmed atlas** of only the tiles the map uses, not the packs whole.
  Smaller, one request, and not "the asset pack" sitting on a public URL.
- **Credit all three authors in the footer.** Anokolisa's terms explicitly say
  it is appreciated. Not yet done.

### 9.4 Tileset decision — Cute Fantasy as base

The three itch packs **do not match each other**. Verified by rendering a tree
from each at the same zoom: Cute Fantasy uses a soft light keyline, Mystic Woods
a heavy black one, Pixel Crawler a fine painterly edge with more colour steps.
Mixed freely they read as a collage.

- **Cute Fantasy (Kenmi) — the base.** Closest to the original references, and
  the only pack of the four with a ready-made *exterior* house. Small (24 files)
  but complete: grass, path, water, cliff, beach, farmland, house, two oak trees,
  fences, bridge, decor sheet, 4-direction player.
- **Pixel Crawler (Anokolisa) — supplement.** Far more content (181 PNGs):
  terrain autotiles, trees in 3 models × 4 sizes × 4 seasons, modular
  walls/roofs, rocks, farm, full character. Use where Cute Fantasy is thin,
  graded to match its lighter outline.
- **Mystic Woods — left out.** Darker, moodier palette clashes hardest, and it
  has no exterior buildings (walls and doors are interior).

Installed as **lossless WebP, 26 KB total** in `public/assets/pixel/cf/`.
Lossless is not optional — any lossy step smears the hard edges.

### 9.5 Sheet structure (indexed, do not re-derive)

- **Terrain sheets** (`path`, `water`, `cliff`, `beach`, `farm`) are 48×96 —
  a **3×3 nine-slice blob** in the top-left (corners, edges, centre), then an
  island tile, then detail variants. `Scene.blob()` picks the right tile from a
  cell's orthogonal neighbours, which is what gives paths and ponds real edges.
- `grass.webp` is a single 16×16 tile.
- `house.webp` is 96×128 — one exterior, blue-grey roof.
- `tree.webp` 64×80, `tree_small.webp` 32×48.
- `decor.webp` is a **7×12 grid of 16px cells** — tufts, flowers, rocks, ores,
  stump, log, mushroom, lamp post, potted flowers. Named picks in `DECOR`.
- `player.webp` is 192×320 — **32×32 frames, 6 cols × 10 rows.**
  Row 0 idle-down, 1 idle-side, 2 idle-up, **3 walk-down, 4 walk-side,
  5 walk-up**, rows 6-9 sword animations. Six frames per row.

There is a reusable **tile picker at `/lab/tiles.html`** that renders any sheet
with per-tile coordinates. Use it rather than counting off a screenshot — the
first composition used wrong indices (tall-grass and stream tiles picked by eye)
and it was not obvious until rendered.

### 9.6 What is built, and exactly where it stopped

**Built and rendering** (`lab/village.html` — seven houses on a road, sea
crossing, seeded vegetation):

| Module | Does |
|---|---|
| `pixel/cutefantasy.js` | Sheet URLs, `SPRITES`, `DECOR` names, `loadAll()`, `Scene` (ordered draw ops mixing 16px tiles with 96×128 sprites), `blob()` nine-slice, `inRect`/`any` predicates |
| `pixel/recolour.js` | Per-sheet grading into offscreen canvases + `SITE_GRADE` |
| `pixel/journey.js` | `PATH` polyline, `STOPS` (7 entries, verbatim copy), `SEA`, `pointAt(d)`, `pathCells()`, `stopAnchor()` |
| `pixel/tilemap.js` | Generic layered `TileMap` (written for the CC0 set; superseded by `Scene` for Cute Fantasy but still valid) |

**The recolour brief — amber grass, orange trees.** A single CSS filter on the
output canvas cannot do this: turning grass amber turns houses pink and water
violet. `recolour.js` grades **each sheet separately, once at load**, into an
offscreen canvas. Green sits near 110° and amber near 40°, hence the ~−70°
rotations on grass/tree/decor while wood, stone and water are only nudged. The
player is deliberately `none` — he should read as himself, not as scenery.
**These values are a first pass and have never been seen rendered.**

**Done since (2026-08-13, later session):**

- **The grade is verified and fixed.** It had never rendered because
  `recolour.js` was imported by nothing — `village.html` was applying a
  hardcoded "Muted" CSS filter to the whole output canvas instead. Wired up, and
  three faults found and corrected by measurement (see §9.8).
- **`recolourGreens()`** added — a hue-selective pass. Necessary because the
  nine-slice terrain sheets *bake grass into their edge tiles*, so grading only
  `grass.webp` left a green keyline down both sides of every road. Measured
  34,259 stray green pixels (6.6% of the map) before, 14,274 after.
- **Regions.** `journey.js` now owns `REGIONS` — four life chapters, each with
  its own row band and terrain character (Mesra woodland → Delhi paved →
  Ranchi farmland → Dhahran sand). This settles the composition question that
  was §12.11: **regions, not one uniform road.**
- **`PATH` and `STOPS` rebuilt** oldest→newest, verified so every stop lands
  inside its intended region and the sea spans exactly rows 70-76.
- **`lab/journey.html`** renders the whole journey from `journey.js` — the first
  page to use it as the single source. `village.html` still has its own
  hardcoded layout and is now superseded.
- **Pixel Crawler building parts installed** — `public/assets/pixel/pc/`,
  `roofs.webp` + `walls.webp`, 13.8 KB lossless. Three roof types (brown wood,
  green shingle, blue slate) and ~7 wall materials (dark log, plank,
  plaster-and-beam, tan plaster, brick, white frame, glazed storefront). Not
  indexed or composed yet.

**The composition rebuild (2026-08-13, third pass).** The scatter is gone.
`journey.js` is now the single source and holds the whole design:

- **New region bands** — mesra [0,38], delhi [38,64], ranchi [64,80],
  dhahran [86,104], sea at 80-86. Old bands could not hold two clusters in
  mesra, and gave 28 rows to one desert building while a whole city got 24.
- **New `PATH`** (10 segments, `PATH_LENGTH` 155) and new `STOPS[].at`, each
  verified to land its walker inside the right region and **south of its
  building's façade** — see the facing rule at the top of `journey.js`.
  `jaiswal` was moved 72 → 76 for exactly that reason: at 72 the walker stands
  level with the façade, which the rule forbids.
- **`STOPS[].side` and `stopAnchor()` are gone.** Deriving a building position
  as `pointAt(at) + side*6` is *the mechanism that produced the scatter* — an
  offset from a path can only make beads on a string. Positions are now explicit
  `anchor` + `footprint`.
- **`PAVED`** — ten named plazas, quads and yards unioned with the 3-wide spine,
  with building footprints subtracted so roofs do not sit on path tiles.
- **`FILLERS`** — eleven non-event buildings. Seven events alone cannot make a
  settlement; the references run roughly this ratio, and it is the single
  biggest difference between a place and a menu.
- **Real barriers** — campus gate (cliff with a gap), river gorge + bridge,
  conifer tree line, sea + causeway. You now cross something to change chapter.
- **Vegetation is hashed, never scattered.** Every tree belongs to a named mass,
  hedgerow, orchard or palm row. `hash01(c,r)` is order-independent so masses
  fill separately and the world never reshuffles on reload.
- **Y-sorting done** — `Scene.ordered()` sorts objects by baseline (`y + height`)
  behind a cache invalidated on mutation. Load-bearing here: the NE grove is
  specified to overlap the academic block's eaves and the conifer line to
  overlap metarch2's ridge.

**STOPPED HERE — 2026-08-13, out of credits mid-task. Resume at item 1.**

The composition above is built and rendering in `lab/journey.html`. Two design
specs produced by a background workflow are saved as **`docs/pixel/`** —
`composition-spec.json` (the full per-region layout this was built from, with
more detail than is transcribed here) and `walk-spec.json` (the scroll/banner
interaction, not yet implemented). Read both before continuing; they were
expensive to produce and are not reproducible cheaply.

1. **Distinct buildings — THE ONE THING LEFT IN THE ART.** Every building on the
   map is still the single Cute Fantasy `house` sprite. Footprints already differ
   in the data (`STOPS[].footprint`, 4×4 up to 12×8) but nothing consumes them,
   so a college, three practices, a branding company and a desert university all
   render as the same blue-roofed cottage. The user rejected this explicitly.

   Parts are installed at `public/assets/pixel/pc/` (`roofs.webp`, `walls.webp`,
   13.8 KB). `tools/index-atlas.mjs` exists and runs — it does connected-component
   analysis with a merge gap. **But it cannot separate parts that touch in the
   sheet**: at `--gap=0` it still returns Walls #0 as one 672×169 box containing
   all seven materials, and Roofs #0 as one 256×234 box containing brown and
   green. The indexing agent was still working on this when the session ended and
   returned nothing — do not assume its output exists.

   The likely answer is **grid decomposition, not blob detection**: the sheets are
   laid out on a regular modular grid (Walls #0 is 672 wide over 7 materials =
   96 px each = 6 tiles; Walls #2 is 384 over 4 glazed variants = 96 px each).
   Verify that against the image with `--grid=16` before building on it.

   Then write the composer: `drawBuilding(scene, b)` in `lab/journey.html` is
   already isolated for exactly this — it is currently three lines and a
   placeholder. It needs `footprint [w,h] + walls + roof → draw ops`, with the
   wall material tiled across the footprint and the roof capping it.

   Materials are already assigned per building in `journey.js`: `plaster`, `log`,
   `timber`, `brick`, `glazed`, `pale`; roofs `wood`, `shingle`, `slate`, `flat`.
   `metarch1` and `metarch2` deliberately share materials and differ only in size
   — the return reads as a return without a label.

   Pixel Crawler will also need grading to match Cute Fantasy's lighter outline
   (§9.4), which means new `SITE_GRADE` entries for the two new sheets.

2. ~~**Scroll-driven walk with arrival banners.**~~ **BUILT** — `lab/walk.html`
   + `src/modules/pixel/walk.js`. See §9.11.
3. **Delhi plaza reads as a large empty slab** (cols 2-31, rows 51-60) at the
   current building sizes. Likely resolves itself once buildings occupy their real
   footprints — check before redesigning it.
4. **Full 47-tile blob.** The 3×3 nine-slice cannot express T-junctions or inner
   corners — visible where the plazas meet the spine.
5. ~~**Wire into `index.html`.**~~ **DONE 2026-08-13** — `src/modules/experience.js`,
   verified in-browser. See §9.12.
6. ~~**i18n for the stop copy.**~~ **DONE** — and it turned out to need no new
   lookup mechanism at all, because the cards are built from the timeline
   markup. See §9.12.
7. ~~**Footer credits.**~~ **DONE** — but the list is not the one §9.3 predicted;
   see §9.12 for which packs actually ship.

### 9.7 Lab pages

All under `lab/`, served by Vite in dev, not part of the build.

| Page | Purpose |
|---|---|
| `tiles.html` | **Tile picker** — any sheet with per-tile coordinates. Keep. |
| `village.html` | Current best composition, Cute Fantasy, ungraded vs graded |
| `palettes.html` | The original three-palette test on generated sprites |
| `detail.html` | Generated sprites vs a ref-5 crop, same zoom |
| `map.html` | The CC0 Zelda-like set, three grades |
| `journey.html` | The full still composition — regions, clusters, all cards visible |
| `walk.html` | **The scroll walk** — character + one arrival card at a time (§9.11) |

`walk.html` is still worth keeping now that the section is live: it drives the
same `initWalk()` through the sticky driver instead of ScrollTrigger (§9.12), so
it isolates walk bugs from pin/Lenis bugs. Both were re-verified after the
`initWalk` refactor.

### 9.8 Grade values — tuned by measurement, not by eye

Three faults, each found by sampling pixels rather than looking:

| Fault | Symptom | Fix |
|---|---|---|
| `grass brightness(.72)` | graded ground landed at HSL l25 — mud, not amber (source is l39) | `brightness(1.06)`, lands l≈36 |
| `path brightness(.78)` | once grass was lifted, the road's value gap fell 59 → 14 and it vanished into the field | `brightness(1.02)`, gap back to 57 |
| `beach`/`farm hue-rotate(-16deg)` | their source is already warm, so rotating the same way as the rest drove sand to h9 (salmon) and farmland to h23 at 82% saturation (neon clay) | rotate the **other** way: `+12deg` / `+4deg`, and halve the farm saturation |

The reference relationship to preserve: **ungraded grass sits at luminance 116
and path at 175, a gap of 59.** That gap is what makes the road read as the
spine of the map. Any future grade change should be checked against it.

Also note `beach` is a *shoreline* sheet — its nine-slice edges are
sand-meets-water. Blobbed as a plain rect it draws a ring of bright blue around
the whole desert. `lab/journey.html` pushes its left, right and bottom edges
off-map so only the top edge, which genuinely borders the sea, survives.

### 9.9 How RPG overworlds are actually composed

Written after the first composition was correctly called a scatter. These are
the rules the reference images follow and the current map breaks:

1. **Settlements are clusters, not beads on a string.** Buildings face a shared
   space — a square, a crossroads, a yard — at varied but related distances.
   One building per road bend, evenly spaced, reads as a menu rather than a place.
2. **The road serves the settlement.** It widens into a village, throws short
   spurs to each door, and narrows between. Buildings sit *off* the road and
   connect to it; they do not sit on it.
3. **Doors face the approach.** A building whose entrance faces away from the
   direction of travel looks like a mistake.
4. **Density has rhythm.** Open ground → dense cluster → open ground. Travel
   stretches must be sparse or arrival never reads as arrival. Uniform scatter
   makes everywhere feel like nowhere.
5. **Regions are separated by things you cross**, not by an invisible row where
   the colour changes: a bridge, a pass between cliffs, a tree line, a gate.
6. **Each region needs one dominant silhouette** to navigate by — the big roof,
   the tower — with the smaller structures deferring to it.
7. **Vegetation follows terrain logic.** Trees mass at edges and on unbuilt
   land, thin out near settlements, and grow in groves. Uniform random placement
   is the giveaway, and a lone tree in the middle of a square is never right.
8. **Depth comes from overlap.** Objects lower on screen draw in front, and
   canopies overlapping roof edges is what binds the layers together — which is
   why the missing y-sort (§9.6 item 4) is a composition bug, not just a
   rendering one.
### 9.10 Mix-and-match asset strategy (2026-08-13)

§9.4 chose Cute Fantasy as a single base. That was wrong in one specific way:
**the pack has exactly one house and one tree**, which is why every building and
every wood on the map was identical. The fix is to mix packs deliberately.

**Two findings that change earlier decisions:**

1. **The autumn trees already existed.** Pixel Crawler's tree sheets are
   `Model_01..03 / Size_02..05`, and each sheet carries *seasonal variants in a
   grid* — green, yellow-green, **orange `#d06732`**, **amber `#c98321`**, bare
   and snowy. Those two autumn colours are within a few degrees of the site's own
   ember and amber. All the hue-rotation of green canopies in §9.8 was standing in
   for artwork that shipped with the pack. The autumn sprites are used raw, graded
   `'none'`. **Do not grade them.**
2. **Model_02 is a conifer with no autumn variant** — correct, and useful: it
   stays green on purpose and is what the Ranchi tree-line barrier is built from.
   A dark cool mass is what gives an amber world a visible edge.

**Installed** at `public/assets/pixel/mix/` (49 KB lossless), cropped by
coordinates from `tools/index-atlas.mjs`:

| Sprite | Source | Rect |
|---|---|---|
| `treeAutumn` | PC Model_01/Size_04 | 3,130,73,126 |
| `treeAmber` | PC Model_01/Size_04 | 83,130,73,126 |
| `conifer` / `conifer2` | PC Model_02/Size_04 | 4,9,54,103 / 68,121,54,103 |
| `coniferSmall` | PC Model_02/Size_03 | 4,4,37,76 |
| `houseRed` | Pixel 16 village | 68,123,72,101 |
| `houseBlue` | Pixel 16 village | 148,155,115,69 |
| `stall` | Pixel 16 village | 19,120,43,40 |
| `rocks`, `vegetation` | PC props | whole sheets, not yet indexed |

Species are assigned **per region** in `lab/journey.html` (`SPECIES`), picked by
the same spatial hash so a wood is mixed but stable: Mesra autumn deciduous,
Delhi thin riverbank planting only, Ranchi conifer, Dhahran bare. Buildings are
assigned per institution in `SPRITE_FOR`, with `metarch1`/`metarch2` sharing a
sprite so the return reads as a return.

**Population (added same day).** A world map with nobody in it reads as a
diagram. Placed explicitly in `worldmap.js` — never scattered, same discipline
as the trees — with each figure doing something appropriate to where it stands:
carrying across the plazas, holding goods in the yard, animals in the fields.

| Sprite | Source | Rect |
|---|---|---|
| `villagerA` | PC `Npc's/Citizen_F/Peasant_A/Idle` | 0,0,64,64 |
| `villagerB` / `villagerC` | PC `Citizen_F/Tavern_A` / `Tavern_B` Idle_Side | 0,0,64,64 |
| `villagerHold` | PC `Tavern_A/Idle_Hold` | 0,0,64,64 |
| `villagerCarry` | PC `Tavern_B/Walk_Hold` | 0,0,64,64 |
| `villagerRogue` / `Knight` / `Wizard` | PC `Npc's/*/Idle` | 0,0,**32,32** |
| `villagerCfSide` / `CfUp` | Cute Fantasy `Player/Player.png` rows 1–2 | 0,32 / 0,64, 32×32 |
| `villagerMw` | Mystic Woods `characters/player.png` | 0,0,**48,48** |
| `rockBig/Mid/Sm` | PC `Props/Static/Rocks.png` (brown palette) | 2,19,28,43 / 35,19,26,27 / 48,51,15,10 |
| `animalChicken/Cow/Sheep` | Cute Fantasy `Animals/*` | 0,0,32,32 |

**The Body_A trap — do not repeat this.** The obvious-looking source for people
is `Entities/Characters/Body_A/Animations/`, which has exactly the activities you
want: Watering, Fishing, Collect, Carry, Crush. **Those are a base body layer.**
The free pack ships no clothing layers to composite over them, so used alone they
render as naked mannequins — on the map they read as skeletons wandering around.
Complete, clothed characters live in `Entities/Npc's/` only, and those have just
Idle / Walk / Hold. The Hold variants are what carry the "doing something"
reading. The user independently asked for exactly this: *"remove those people
asset that have no clothes, only choose those that have proper body and clothes
and eyes."*

**Frame sizes differ per pack and per character** — Citizen sheets are 64×64, the
other Pixel Crawler NPCs are 32×32, Mystic Woods is 48×48. Cropping at the wrong
size produces a **zero-byte file**, and `loadAll()` then rejects, taking the
whole map down with no useful error. Check each sheet before cropping.

**Eleven distinct characters, sixteen placements**, arranged so no two people
standing near each other are the same person — repeating one sprite around a
plaza is the tell that turns a crowd back into a texture. That exhausts every
complete character in the local packs; more variety means a new pack.

### The character-scale problem — RESOLVED 2026-08-13

The user reported the main character "looks smaller than the other characters".
He is right, and it is not a rendering bug. Measured drawn heights (content
bounding box inside each frame, not frame size):

| Character | Source | Drawn height |
|---|---|---|
| **Player** | Cute Fantasy `player.webp` | **20 px** |
| Citizen A/B/C, Hold, Carry | Pixel Crawler `Npc's/Citizen_F` | **30 px** |
| Rogue / Knight | PC `Npc's` | 30 / 29 px |
| Wizard | PC `Npc's` | 32 px |
| CF player variants | Cute Fantasy | 20 px |
| Mystic Woods player | Mystic Woods | 21 px |

**The packs are drawn to two different character scales**, roughly 1.5× apart.
Cute Fantasy's 20 px is the one that is *correct for a 16 px tile world* — the
hero is 1.25 tiles tall, which is the normal proportion. Pixel Crawler's people
are drawn for a larger tile size. So strictly the NPCs are wrong, not the hero —
but the hero is what reads as undersized because he is outnumbered.

**Why it cannot simply be fixed by swapping the hero:** a protagonist needs a
full walk cycle in three facings. The only complete-animation character in Pixel
Crawler is `Characters/Body_A`, and that is the naked base body (rendered and
confirmed by eye — bald, unclothed). Every clothed PC character has Idle/Walk
only, mostly single-facing. **There is no complete ~30 px hero in any local pack.**

**THE FIX (applied).** The user supplied **FREE_Adventurer 2D Pixel Art**, which
is a complete 4-direction hero — IDLE / RUN / ATTACK1 / ATTACK2 in down, left,
right, up. Its figure is **34 px tall**, which sits with the Pixel Crawler NPCs
instead of 1.5x under them. It is now the hero, replacing the Cute Fantasy
player, and the scale complaint is closed.

Installed at `public/assets/pixel/hero/` (36 KB, 8 sheets). Geometry, all
measured with `tools/index-atlas.mjs` rather than eyeballed and recorded as
constants at the top of `walk.js`:

    HERO_W 96, HERO_H 80, HERO_CX 48, HERO_FY 58, FRAMES 8

Eight frames at a 96x80 pitch, **one sheet per direction**, so there is no
mirroring — his sword and cloak stay on the correct side. `cutefantasy.js`
exposes them as `heroIdle{Down,Left,Right,Up}` / `heroRun{...}`, all graded
`'none'`.

**Its licence is the most permissive of any pack here** — *"You can use this
asset in any game project, personal or commercial"*, no redistribution as a
game asset, credit appreciated, no NFTs. Unlike Cute Fantasy and Mystic Woods
this one needs no non-commercial argument at all.

**The zip arrived named `WhatsApp Image 2024-02-08 at 11.23.15_24351091.jpg`** —
a ZIP with a `.jpg` extension (magic bytes `50 4b 03 04`). If a supplied image
will not open, check the magic bytes before assuming a bad download.

The old Cute Fantasy `player.webp` is still referenced as `player` in SHEETS and
is now unused by the walk. Left in place deliberately — it is the only 20 px
character with a full 4-way cycle, so it is the fallback if the Adventurer ever
has to go.

Do **not** attempt to fix it by drawing the player at a different zoom from the
world — that mixes pixel densities, which is precisely the flaw that makes the
AI-generated references in §9 unusable.

**`Resurrected RPG 1.1` — extracted by the user, and NOT usable as-is.** It ships
15 files: Grass, Plants, Props, Wall, portal. **No characters at all**, and it is
drawn at a larger tile scale — its plants measure ~7×12 of our tiles against our
trees' 4.5×8. Its sandstone monuments would suit Dhahran thematically, but only
after resolving the scale question below. `TopDownFantasy_Forest`
is extracted and its `Tiles/Tileset.png` has **cliff edges**, which is the
obvious source for elevation once levels are attempted. Also unused so far:
PC `Farm.png`, `Resources.png`, `Vegetation.png`, Mystic `objects.png` and
`decor_16x16.png`, and the forest pack's `Decorations.png` — all more props.

**Licence gap, noted not litigated:** neither `Pixel 16 v2 village free` nor
`TopDownFantasy_Forest` ships a licence file, and the Resurrected pack has not
been opened. §9.3 records the user's settled position on the non-commercial
question and it is not being re-opened — but unlike the first four packs, these
terms have never actually been *read*. Worth saving the download-page URLs.
### 9.11 The scroll walk (`src/modules/pixel/walk.js`)

Built 2026-08-13, demo at `lab/walk.html`. The character walks `PATH` as the page
scrolls and **one** card appears when he arrives at a stop, clearing as he
leaves. Full design in `docs/pixel/walk-spec.json`; this records what was
actually implemented and where it departs from that spec.

`src/modules/pixel/worldmap.js` was extracted at the same time so the still map
and the walk build the world from one `buildScene()`. That divergence has already
cost this section once — `village.html` and `journey.html` each grew their own
layout and the grade fix had to be applied twice.

**The mechanisms that matter:**

- **Ramps with dwells.** Scroll maps to distance through a table of travel ramps
  and dwell ramps, not linearly. A dwell consumes scroll but no distance, so he
  stands still while the card is readable. Without it a stop is a zero-width
  event and reading a card means holding the scroll perfectly still.
- **Walk frame is a pure function of distance** — `floor(d / 0.25) % 6`. No time
  term, so it cannot drift, it freezes automatically in a dwell, and it walks
  *backwards* when you scroll up. A moonwalk is not expressible.
- **Direction from a chord**, `pointAt(d±0.4)`, not `pointAt(d).dir` — the latter
  flips exactly at a vertex and jitters when the distance lands on one.
- **Camera leads** the direction of travel (0.42 / 0.58 of stage height), damped,
  and **the lead freezes while a card is up** or a corner yanks the view mid-read.
- **Card hysteresis** — mount at 3.5 tiles, unmount at 5.0, `MIN_SHOW_MS` 450.

**Three deviations from the spec, all deliberate:**

1. **Radii tightened to 3.5 / 5.0** from its 4.5 / 6.0. The spec was measured
   against the *old* path (length 162, stops 5..155) and asserts stops must be at
   least `2*EXIT_R` apart so two cards can never coexist. The current path is 155
   with a tightest gap of **11 tiles**, so its own EXIT_R of 6 would break that
   invariant. `initWalk` warns at runtime if the gap ever drops to 2*EXIT_R.
2. **ZOOM targets ~24 tiles tall, not 15.** At 15 the camera sits so close that
   the clusters, groves and barriers the composition is built from never fit on
   screen — you see one roof and a canopy.
3. **Sticky stage rather than ScrollTrigger pinning** in the lab, so it can be
   verified standalone. **When wiring into `index.html`, use ScrollTrigger**, and
   route any jump through `lenis.scrollTo` — `window.scrollTo` desyncs Lenis
   (§10).

**A bug worth not repeating:** the first version measured scroll from
`stage.getBoundingClientRect().top`. The stage is `position: sticky`, so its top
pins at 0 and never goes negative — distance was permanently 0 and no card ever
mounted, while the world still rendered perfectly. Measure against the
**scroller**, not the sticky child.

Total scroll is ~5,650 px at ZOOM 2 on a 900 px viewport (~6 screens). `SPEED_R`
is the knob if that needs shortening; do not shorten by cutting the dwells,
which are the readable part.

### 9.12 Wired into `index.html` — VERIFIED 2026-08-13

`src/modules/experience.js` is the seam between the pixel modules and the site.
It decides *when* the map may load, *whether* it is allowed to replace the
timeline, how scroll reaches it, and where the card copy comes from. The pixel
modules know nothing about the page.

**Markup** (`index.html`, `#background`): the eyebrow and heading in a `.wrap`,
then `.journey-bleed > .journey#journeyStage[hidden]`, then the existing
`<ol class="timeline" id="experienceList">` in a second `.wrap`. Each `li` gained
`data-stop="<id>"` and a `.tli__note` (hidden), and each `.tli__role` gained a
`data-i18n` key.

**The fallback is the content.** The timeline ships visible in the HTML and the
stage ships `hidden`. `initExperience()` returns before touching anything under
`prefers-reduced-motion`, and below `MIN_W` (900) it never even issues the
dynamic import — nothing is downloaded at phone width. If `loadAll()` rejects
(one 404 sheet is enough, §9.10) the catch puts the list back. So every failure
mode lands on the same page: the original seven `.tli` entries. Verified in
`dist/index.html` — it ships `id="journeyStage" hidden` and an unmodified
`class="timeline"`.

`MIN_W` is 900, not the skills field's 640: the world is 34 tiles wide and its
clusters span fourteen or more, so below that you see a roof and a canopy.

**Loading.** `idleInit(() => initExperience())` in `main.js`, alongside i18n and
three.js — *not* an IntersectionObserver. Same reason as the skills field: it
replaces the timeline, and doing that as the reader arrives would show the list
and then visibly swap it. The 220 KB of sheets and both pixel modules are behind
`import()`, so they land in a lazy chunk (`walk-*.js` 17.5 KB + `journey-*.js`
7.2 KB) rather than the main bundle.

**`initWalk()` now has two drivers.** `opts.external` picks:

| | Driver | Height owned by | Used by |
|---|---|---|---|
| `false` (default) | reads the sticky scroller's own top | the module | `lab/walk.html` |
| `true` | `api.setScroll(px)` from ScrollTrigger `onUpdate` | ScrollTrigger's pin | `index.html` |

The lab page is unchanged and still works — that isolation is the point.
`initWalk` also gained `renderCard`, `onStop`, `onRegion`, `refresh()`,
`setActive()`, `refreshCard()`, `scrollAtStop()` and `destroy()`.

**One copy of the copy.** Cards are built from `li[data-stop]`, never from the
`STOPS` strings — the walk-spec's own recommendation, and it makes §9.6 item 6
disappear rather than solving it. `period` and `org` come from the visible list
(dates and institution names, untranslated per §7); `role` and the condensed
`note` are `data-i18n` keys the existing engine rewrites. So the card needs no
dictionary lookup, no dict caching, and no ordering hazard — it just re-reads its
own source element on `sa:languagechange` via `api.refreshCard()`. 14 new keys
(`bg.hint`, 5 × `bg.role.*`, 7 × `bg.note.*`, `footer.art`) × 6 languages.
`bg.role.intern` is deliberately shared by the three internships: one phrase
translated once cannot drift into three variants.

**The chapter rail** (`.journey__rail`) is four ticks built from `REGIONS`,
marking the current chapter and jumping to it through
`lenis.scrollTo(st.start + api.scrollAtStop(stop))`. A six-screen pin with no
way to skip is a trap. Labels are place names and years, so nothing here needs
translating. Never `window.scrollTo` (§10).

#### Five things found by measuring, not by looking

1. **A negative margin on a pinned element gets recorded pre-bleed.**
   `margin-inline: calc(var(--pad-x) * -1)` on `#journeyStage` produced a stage
   pinned at **1296px inside a 1440px pin-spacer** — full-bleed on the left,
   144px short on the right. ScrollTrigger measures the element, *then* wraps it
   and relocates the margin to the spacer. The bleed now lives on
   `.journey-bleed`, so the stage's natural width is already correct.
2. **The canvas backing store was stale and the whole map drew stretched.**
   Measured 865×910 inside a 1296×900 box. The ramp table and the canvas are both
   sized in stage pixels, and hanging that off ScrollTrigger's refresh callbacks
   is unreliable: GSAP writes an explicit `width`/`height` onto a pinned element,
   so a callback can measure the pinned box instead of the natural one. A
   **ResizeObserver on the stage** sees the box that actually exists, whatever
   moved it. It re-runs `api.refresh()` and calls `ScrollTrigger.refresh()` only
   when `total` actually changed — unguarded it loops, because the pin resizes
   the stage.
3. **ZOOM is now width-aware.** Height alone picked ZOOM 2 on a 1440×900 stage,
   which draws the 34-tile world 1088px wide — **measured 176px of dead ink down
   each side, 24% of the viewport.** `fitW = min(3, ceil(stageW / mapW))` fixes
   it. Capped at 3 because `ceil(1920/544)` is 4 and ZOOM 4 on a 900px stage
   shows 14 rows, which is the framing §9.11 rejected. Verified: gutters 0px and
   3px at both 1024×660 and 1280×820.
4. **Scroll length is tied to the height-driven zoom, not the final one.** The
   width bump above is a framing decision, and letting it drive `pxPerTile` as
   well cost **1,550px of extra scroll (5,620 → 7,170 at 1440×900)** for a change
   that has nothing to do with pacing. Tiles-per-scroll-pixel is what sets the
   gait rate, so `pxPerTile = 10 * fitH` keeps the walk exactly as tuned and the
   section exactly as long. The stride still reads right at any zoom because
   stride and body scale together.
5. **The hint sat behind the nav the instant the pin engaged.** While pinned the
   stage top *is* the viewport top, and the nav is 74px of fixed chrome. It is
   now `top: calc(74px + …)`. The rail had the related problem — dim mono type
   over an amber-and-canopy tilemap, with three of four ticks invisible against
   the Mesra forest — and now sits on a translucent ink panel.

#### Verified in-browser (2026-08-13, localhost:5199)

At 1024×660, 1280×820, 760×900 and in Arabic, no console errors:

- Mounts on idle, hides the list, pin-spacer created; canvas backing store
  matches its box exactly at every size.
- Section length 4,948px at 1024×660 and 5,396px at 1280×820 — both match
  `155 × 10·fitH + 7 × 0.40·stageH` exactly.
- `scrollAtStop()` returns the hand-computed px for all seven stops.
- All four rail jumps land on the right stop, mount the right card, mark the
  right region, and **never mount more than one card**. A 4,084px jump produced
  exactly one mount, at 399ms — Lenis's easing front-loads ~50% of the distance
  into the first ~120ms, which is over the 10-tile fling threshold, so the guard
  suppresses the five stops passed on the way.
- Scrolled through with real wheel events: cards arrive and clear one at a time,
  the sea crossing and causeway render, the section unpins cleanly into Contact.
- Canvas fully covered at four positions along the walk — no gutters, no interior
  holes (sampled every 4px).
- 760px: stage hidden, ScrollTrigger disabled, pin reverted, all 7 `.tli`
  visible, `.tli__note` still hidden. Resizing back to 1280 re-enables, re-pins
  and re-measures to ZOOM 3.
- Arabic: the open card re-rendered in place with translated role and note while
  period and org stayed English, `<html lang="ar" dir="rtl">` with `.is-rtl`,
  rail mirrored to the right, **no horizontal document overflow.** The journey
  needs no RTL override block — unlike the projects track and the skills marquee
  (§10), nothing here is a flex row animated by pixel `x`; the card is
  `left: 50%` + `translate(-50%)`, which is direction-agnostic, and the rail uses
  logical properties.
- `lab/walk.html` re-verified after the refactor: sticky driver, scroller height
  `total + stageH`, one card, correct copy.
- `npm run build` passes. `window.__journey` is a dev-only debug handle behind
  `import.meta.env.DEV` and is **confirmed absent from `dist/`** — it exposes
  `{ api, st, lenis }`, which is the only way to inspect the scroll→distance
  mapping from the console.

**Footer credits — the list §9.3 predicted was wrong.** What actually ships in
`public/assets/pixel/` (219 KB) is Cute Fantasy, Pixel Crawler, **Mystic Woods**
(one villager, `villager_mw.webp`), **Pixel 16 v2 village** (`house_red`,
`house_blue`, `stall`) and FREE_Adventurer. ArMM1998's CC0 Zelda-like set is
**not** in the shipped map — it only feeds `lab/map.html` — so crediting it would
be crediting an unused asset, and CC0 requires nothing anyway. Game Endeavor was
missing from §9.3's list and is in. Two of the five have no author name recorded
anywhere in the pack, the licence file or `LICENCES.md`, so they are credited by
pack name; **if the Adventurer author's name is known it should be added.**

---

## 9.12 Premade buildings — the composer was the wrong idea (2026-08-14)

The user's verdict on `drawBuilding()` was *"the current building composer does
not look like buildings at all."* It was correct, and the fix was not a better
composer — it was to stop composing.

### What was actually wrong with the composer

Two real bugs were found and fixed before the direction changed. Both are worth
keeping because `building.js` still draws the small fillers:

1. **The doubled roof.** The composer repeated the whole 127px gable sprite and
   clipped each copy about its own ridge, so a wide building got two ridge posts
   butted together with no valley — which reads as one broken roof, not as two.
   The code argued a double-gabled block is what an institution looks like; true
   of real architecture, untrue of what it rendered.

   Fixed by cutting the gable into five parts and reassembling at any width:

   ```
   |  left cap  | ~~left slope~~ | ridge | ~~right slope~~ |  right cap  |
   0           50              61      67                78            127
   ```

   The caps carry the rising hip lines that close each end. The slope slices are
   taken from immediately beside the ridge, where the top edge has already
   levelled off, so tiling them **extends** the ridge instead of repeating the
   peak. Each side keeps its own slice, preserving the light/shade split.

2. **Black doors.** `door_stone.webp` is 31×47 with the arch in the **bottom
   18px**; the upper block is a dark stone lintel. The sprite rect took the
   top-left 26×24 — the lintel — and painted it onto every plaster and brick
   façade as a hole in the wall. Now `{ x: 1, y: 29, w: 24, h: 18 }`.

**The lesson, and it is the same as §9.1:** every composer fix was chasing a
problem that does not exist when the building is one finished drawing by an
artist. Do not restart this. `building.js` is for sheds and yard filler only.

### The three new packs

| Pack | Author | Licence | Verdict |
|---|---|---|---|
| **Free-Samples** | Kibyra | *"Use these assets in commercial projects"*; no resale/reupload | ✅ used |
| **Pixel Lands Village Demo** | Trislin | *"any commercial or non-commercial projects"*; credit appreciated | ✅ used |
| **Houses_Pack** | Szadi art | **Public domain**, commercial OK, cannot sell the pack | ✅ cleanest terms in the project — not yet used |

These are the three best licences in the whole project. Verbatim text in
`assets/tilesets/incoming/LICENCES.md`.

**Free-Samples** ships complete 128×128 buildings: 4 noble manors, 4 museums,
4 churches, 4 market stalls, plus trees, bushes, wells, fishponds.
**Pixel Lands** ships 3 premade houses. **Szadi** is a modular kit in three
colourways — long roof runs, cross roofs, tall gables, two-storey timber
façades with arched windows.

Museums and churches were rejected despite being the obvious institutions:
`MUSEUM` and `CHURCH` are painted on their signboards. Wrong words for a
university, and removing them means editing someone's artwork.

**Szadi was investigated for the offices and set aside.** A connected-component
scan of the 1024×1024 sheet (39 sprites, see `scan-atlas.mjs` approach in §9.6)
showed it is roof pieces and wall runs *separately* — sprite 12 is a roof with
no walls, sprite 30 is façade bands with no roof. Using it means composing,
which is the thing that just failed. Kept for later; it is high quality and
public domain, so it is the first place to look if more variety is needed.

### The institutions — three manors overlapped

Built at install time into two single sprites, so the map draws one image each:

```
instAcademic = manor1 + manor4(centre) + manor1   245x107  (16x7 tiles)  -> BIT Mesra
instResearch = manor3 + manor4(centre) + manor3   235x107  (15x7 tiles)  -> KFUPM
```

**Overlap of 34–36% is the whole trick.** Butted edge to edge they read as a
terrace; overlapped far enough that the roofs interlock, and sharing one ground
line, they read as one institution. The centre block draws *last* so its roof
sits over the wings — that is what makes the join a structure rather than a
collision. Both share manor4 as their centre, so the two bookends read as
related without being identical.

Bounding boxes were measured from alpha, not guessed — the sprites do not fill
their 128px cells (m1 108×107 at 10,6; m2 100×105 at 142,6; m3 104×107 at
12,136; m4 100×104 at 142,134).

### Current assignment

| Stop | Sprite | Footprint |
|---|---|---|
| barch (BIT Mesra) | `instAcademic` | 16×7 |
| chadda | `offManor2` | 7×7 |
| metarch1 | `offCottage` | 7×9 |
| jaiswal | `offManor3` | 7×7 |
| medicfibers | `offManor1` | 7×7 |
| metarch2 | `offLshape` | 11×9 |
| kfupm | `instResearch` | 15×7 |

metarch1 → cottage and metarch2 → L-shape deliberately: the return to Metarch is
the same practice grown larger, which the building says without a label.

Registered in `cutefantasy.js` `SHEETS`/`SPRITES` (const `PRE`) so the existing
`loadAll()` and `Scene.sprite()` pipeline draws them — no parallel path. Mapped
in `worldmap.js` `SPRITE_FOR`. **Never graded** (`'none'` in `SITE_GRADE`):
Kibyra's palette is already warm terracotta and cream, so it sits on amber
ground unaided, and the greens pass would only damage finished artwork.

### Known, not yet addressed

- **The Pixel Lands cottage does not match.** Cream/white against Kibyra's
  terracotta — different artist, lighter palette. Visible at metarch1. Either
  grade it warm or swap it for `offFarmhouse`/a Kibyra manor.
- **Footprints grew** (institutions are 15–16 tiles wide against the old 10–12).
  Region rects and `PAVED` plazas in `journey.js` have **not** been re-checked
  against the new sizes. Verify nothing overlaps a path or another building.
- `offFarmhouse` (196×130) is installed but unused.

---

## 9.13 Scale — the measured audit (2026-08-14)

### THE SCALE AUTHORITY: a door is 2 m, so an adult is 20 px

Read this before changing any sprite size. Earlier passes derived world scale
from the *hero* and reached the wrong answer twice, in opposite directions.

The correct reference is a **door**, because a door is 2.0 m in the real world
and every building sprite has one. Measured on Kibyra `noble-manor1.png` at 4x,
the arched door is **22-24 px**. That fixes the art's own scale at:

> **≈12 px per metre. 1 tile (16 px) = 1.33 m. A 1.7 m adult = 20 px.**

Everything follows, and it inverts the earlier conclusion in §9.13's table:

| Sprite | px | at 12 px/m | verdict |
|---|---|---|---|
| Cute Fantasy player | 20 | **1.67 m** | **correct — this was right all along** |
| Mystic Woods player | 21 | 1.75 m | correct |
| Pixel Crawler villagers | 30 | 2.5 m | too big |
| **hero FREE_Adventurer** | 34 | **2.8 m** | **a giant** |
| offManor1 | 107 | **8.9 m** | correct 2.5-storey house |
| offCottage | 136 | 11.3 m | tall house, fine |
| instAcademic | 107 | 8.9 m | fine as a house, short as an institution |
| Kibyra "market-stall" | 100 | **8.3 m** | **not a stall — a small building** |
| kibwell | 58 | 4.8 m | oversized for a well |
| kibmaple | 59 | 4.9 m | young tree |
| treeAutumn (PC) | 126 | 10.5 m | mature tree, correct |

**The buildings were never short. The characters are too big.** The chain of
events worth not repeating: the user said the hero looked smaller than the NPCs
(true — 20 px against Pixel Crawler's 30 px), so the hero was swapped for a 34 px
one; that made the hero and NPCs agree with each other but put both out of scale
with every building. Measuring against the buildings instead of against each
other would have caught it immediately.

**The consistent fix is to shrink the cast, not grow the buildings** — hero and
villagers to ~20 px, which means the Cute Fantasy and Mystic Woods characters.
The cost is variety: those are the only two ~20 px complete characters in the
project, against eleven at 30 px. **Not applied — it reverses a change the user
asked for, so it needs their call.** A ~20 px 4-direction character pack would
solve it outright.

### What was fixed on this measurement

- **Stalls.** The Kibyra market-stalls are 8.3 m — they are small buildings, and
  putting them out as market stalls is why the stall scale looked wrong. They are
  now used as buildings; stalls use the 43x40 sprite (3.6 m), which is a stall.
- **The Delhi river** was 3 rows — a ditch the bridge had nothing to span. Now 7
  rows (9.3 m), with sand banks, so the region is entered across real water.


The user reported the academic institutes "look small compared to other
buildings" and later that "the realistic scale of the things are not matching".
Both are true. Measured, taking the hero (FREE_Adventurer, 34 px drawn) as a
**1.7 m adult**, which fixes the world scale at **1 tile (16 px) = 0.80 m**:

| Sprite | px | implies | should be | verdict |
|---|---|---|---|---|
| hero | 34 | 1.7 m | 1.7 m | reference |
| villager (Pixel Crawler) | 30 | 1.5 m | 1.7 m | acceptable |
| villagerCf / villagerMw | 20 | **1.0 m** | 1.7 m | **children — removed** |
| kibmaple | 59 | **2.9 m** | 10–15 m | shrub |
| treeAutumn (PC) | 126 | 6.3 m | 10–15 m | best available |
| offManor1 | 107 | 5.3 m | 7–9 m | short |
| offCottage | 136 | 6.8 m | 7–9 m | ok |
| **instAcademic / instResearch** | **107** | **5.3 m** | 12–14 m | **the bug** |

### The institution problem, precisely

`instAcademic` is three manors overlapped **side by side** (245×107). It grew
**wide and never tall** — so it is exactly as tall as an ordinary manor and
*shorter than the cottage next to it*. Height is what reads as importance in a
3/4 top-down view, which is why a 15-tile-wide building still looks small.

**It cannot be fixed by choosing a different Kibyra sprite.** The whole pack tops
out at ~120 px: churches are 115–120, museums 108–121, manors 107. Measured, all
four of each. There is no institution-height building in it.

The remaining routes, in order of preference:

1. **Composite a taller centre.** `church1` has a **bell tower**, the only tall
   element in the pack. Building `manor + church(centre, raised) + manor` would
   give a central tower over flanking wings — which is what an academic block
   actually looks like. The user has explicitly authorised removing signboards.
   **The "CHURCH" plaque and its chains sit at (48,66)–(86,84) in `church1.png`**;
   clean grey stone to patch it from is at ~(96,70). Museums have `MUSEUM`
   painted on the same way.
2. **Szadi's kit** (§9.12) is public domain and has **tall gables and two-storey
   façades** — the only source of genuinely taller buildings. It needs composing,
   which is why it was set aside, but for *height* specifically it may be worth
   revisiting.
3. Accept the stylised scale. Note a 3–4× building-to-person ratio is normal for
   the genre (Stardew does it), so only the institutions are really wrong.

### What was fixed

- **Trees are mixed-age now.** Using only Kibyra maples made every wood a
  shrubbery (2.9 m). Pixel Crawler canopies are the mature layer, maples the
  understory — realistic, and it satisfies both complaints at once.
- **The 20 px villagers are gone.** They were 1.0 m tall standing among 1.5 m
  adults.
- **Trees no longer cover buildings.** `freeFor` tested only a sprite's ANCHOR
  cell with a 1-tile pad. A tree is anchored at its foot and drawn up to 8 tiles
  upward, so one planted two tiles below a manor threw its whole canopy over the
  roof — anchor clear, drawing not. `freeBox()` now tests the sprite's real drawn
  box in tiles.
- **Milestone clearance.** Every `STOPS` building has a 2-tile apron in
  `protectedCells` that nothing may be planted or placed inside.
- **Street furniture.** Kibyra wells, fishponds and market stalls fill the
  plazas, which were large empty slabs.
- **The coastline undulates.** The sea was a full-width rectangle, so
  grass → sea → sand was three straight lines stacked; that seam is what made
  Dhahran read as unfinished. Shore offsets are hashed per column, with sand on
  both banks.
- **No conifers in the desert**, and the Delhi/Ranchi tree line is rust maples —
  the conifers were the last Pixel Crawler trees and read as a different game.

**One trap worth repeating (it is §9.8 again):** the shore sand is placed with
`scene.tile('beach',1,1,…)`, **not** `blob()`. A strip two tiles thick is
entirely nine-slice EDGE tiles, and beach edges are sand-meets-water — blobbing
it painted a bright blue band along both shores.

### Still open

- **Institution height** — the whole of the section above.
- **NPCs do not move.** They are single static frames. Walk sheets exist for
  Citizen_F (`Walk-Sheet`, `Walk_Hold`), so a shared `t`-driven frame index and
  a short patrol segment per NPC would animate them.
- **Map width.** 34 tiles against 15-tile institutions is tight; the user asked
  for it to be "stretched". Widening means offsetting every `anchor` and `PATH`
  x by the same amount, then widening the region `masses`/`fields` rects.
- **Delhi plaza** is still a large empty slab in places.

---

## 10. Non-obvious gotchas

These all cost real debugging time. Do not re-derive them.

**GSAP `immediateRender: false`** on the hero's scrubbed tweens. They target the
same properties the intro timeline is still animating; without it GSAP samples
the in-flight value (0) as the scrub start and the role + description never
become visible.

**`data-lenis-prevent` on `#modalInner`.** Lenis calls `preventDefault` on wheel
events document-wide, so any independently scrollable overlay needs it or it will
not scroll. **Do not put it inside the pinned projects track** — it swallows the
wheel and stalls the horizontal travel. `overscroll-behavior: contain` causes the
same stall.

**`[hidden]` loses to any `display` rule.** `skills.js` hides the tag list with
`list.hidden = true`, but `.skills` sets `display: grid`, which outranks the UA
`[hidden] { display: none }` — the list stayed visible under the field until
`.skills[hidden] { display: none }` was added explicitly. Applies to any element
you hide this way that also has a `display` in a class rule.

**Any GSAP px-transform track needs `direction: ltr` under RTL.** This has now
bitten twice — the projects track and the skills marquee. A flex row animated by
pixel `x` assumes its origin is the container's left edge; RTL moves that origin
to the right edge and the whole strip translates off-screen. If you add another
horizontally-animated strip, add it to the RTL override block in `i18n.css`.

**No `vertexColors` on the atlas material.** `InstancedMesh.setColorAt` drives
colour through `instanceColor` on its own; enabling `vertexColors` makes the
shader look for a per-vertex `color` attribute `BoxGeometry` does not have, and
every bar renders black.

**Text selection during globe drag.** `preventDefault` on `pointerdown` is not
enough — the browser still fires the compatibility `mousedown`. Cancelling
`selectstart` while dragging is what actually works.

**Auto-rotation must start at full speed.** `drag.idle` initialises to `99` so
`resume` is 1 immediately. Starting at 0 makes the globe sit still for 1.2s and
then creep up, which reads as a stutter.

**`document.fonts.ready` → `ScrollTrigger.refresh()`.** Webfont swap changes text
metrics, which changes every pinned section's height.

**Flex `align-items: center` on `.projects__track`.** Default stretch makes every
card inherit the tallest card's height and fill with dead space.

**The featured project card is a horizontal split** above 760px. As a column it
is taller than the pinned viewport.

**Programmatic `window.scrollTo` desyncs Lenis.** For testing, use real wheel
events or `lenis.scrollTo`.

**A pinned element's own margin is measured before ScrollTrigger moves it.**
GSAP records the element's width, *then* wraps it in a pin-spacer and relocates
the margin there — so a full-bleed negative margin on the pinned element pins it
`2 × --pad-x` too narrow inside a full-width spacer. Put the bleed on a wrapper
and pin the child (§9.12).

**Do not size a canvas from a ScrollTrigger refresh callback.** GSAP writes an
explicit `width`/`height` onto a pinned element, so `onRefreshInit` can measure
the pinned box rather than the natural one, and a canvas sized there silently
keeps a stale backing store while its CSS box changes — the drawing then scales
by a non-integer factor, which for pixel art is fatal. Use a `ResizeObserver` on
the element and guard any `ScrollTrigger.refresh()` you fire from it, because the
pin itself resizes the element.

**Anything positioned at the top of a pinned full-height stage lands under the
nav.** While pinned the stage top *is* the viewport top, and `.nav` is 74px of
fixed chrome. Offset by it (§9.12 item 5).

---

## 11. Asset pipeline

Scripts were one-shot (in the session scratchpad, not committed). Regenerating is
manual. `ffmpeg` with `libwebp`, `libx264`, `libvpx-vp9` is the only dependency.

**Stills** → WebP q80–86 via `ffmpeg -c:v libwebp`.

**Thermal clips.** The three "GIFs" in v1 were **Kepler.gl screen recordings**,
UI chrome and all — 720×405, 12.5fps, 1.0–1.3 MB each. Processing:

```
crop=490:250:140:45      # strips sidebar, legend, timeline, top-right banner
hqdn3d=4:3:6:4           # GIF dithering is quantisation noise, not signal
libx264 -crf 26 -g 5     # dense keyframes so scroll scrubbing stays responsive
```

The crop keeps the map canvas and its timestamp. WebM was dropped — VP9 came out
larger than H.264 here and MP4 is universally supported.

Result: 54.8 MB of source → 7.5 MB deployable, none of it blocking first paint.

The three cities have distinct palettes that carry the three-continent story:
**Dammam amber/red, Dublin green, Reykjavík teal/white.**

---

## 12. Open items / decisions pending

1. **Marquee idle behaviour.** While verifying §7 the marquee tween appeared to
   stall between samples in English *and* Arabic, while other GSAP animations
   (the typewriter) kept ticking. This predates the RTL fix and may well be an
   artifact of the automated browser pane not compositing continuously — it was
   never reproduced by eye. **Watch it in a real browser** before treating it as
   a bug; if it is real, suspect the `timeScale` driver in the marquee's
   `ScrollTrigger.onUpdate` (`reveals.js:109`) going negative and rewinding the
   infinite tween to time 0.
2. **Skills field — outline visibility.** At `DENSITY` 0.34, and now 40 balls,
   most of the traced brain is covered. Now that the silhouette is worth seeing,
   ~0.25 is probably the better value. One constant, §8.
3. **Skills field — "Architecture & Design" name.** Still holds AutoCAD, Revit,
   Rhino, V-Ray and the four Adobe tools. Accurate now that the photography and
   storytelling items moved to Creative & Personal, so this may need no action —
   noted only because it was queried once.
4. **Skills field on mobile.** Below 640px the section falls back to the v1 tag
   list. Deliberate, but it means phones get no interactive version at all.
5. **"Six projects." vs seven cards.** The projects heading says six; the track
   holds the featured thesis plus six others. Carried over from v1 as-is.
6. **Thermal clips are 490×250 native.** Fine as atmospheric background plates,
   soft if ever shown large. Re-recording the Kepler.gl sessions at 1080p+ would
   let the pipeline produce something much sharper.
7. **"Shibli Afaq" at 1280px** fills the available width exactly, edge to edge.
   Intentional full-bleed, but zero margin. `9.6vw → 9vw` if it reads too tight.
8. **Globe sharpness on a real display** — was reported as pixelated at 2K, fixed
   with the 6K tier plus max anisotropy, but not confirmed on the user's monitor.
9. **Native-speaker review** of the German and French translations.
10. **Experience map — §9.6 item 1, the modular building composer.** Now the only
    thing left in the art, and the one the user rejected explicitly: every
    building on the live map is still one of three cottage sprites, while
    `STOPS[].footprint`, `walls` and `roof` already describe seven distinct
    institutions that nothing consumes. §9.6 item 1 has the grid-decomposition
    plan for `pc/walls.webp` + `pc/roofs.webp`.
11. ~~**Composition question never answered.**~~ Settled: four regions with
    barriers you cross (§9.6, third pass), and now shipping.
12. ~~**Footer credits.**~~ Done — see §9.12 for the corrected pack list. One gap
    remains: **the FREE_Adventurer author's name is recorded nowhere** (not in
    `License.txt`, not in `LICENCES.md`), and neither is Pixel 16's, so both are
    credited by pack name. If the names are known, add them.
13. **Trimmed atlas** instead of shipping whole packs — agreed, not done.
14. **Five packs still carry no licence file** (Resurrected RPG 1.1,
    TopDownFantasy_Forest, Pixel 16 v2 village, pixel_16_woods v2, resurrected)
    and "Pixel 16" is in the footer credits, so art from at least one is
    shipping. The commercial question is settled and is NOT being reopened —
    this is the narrower point that those terms have never been *read*. Also,
    `tools/crop-sprites.mjs` records no provenance, so a shipped `.webp` cannot
    be traced back to its pack. Cheapest fix: paste the download URLs into
    `LICENCES.md` while they are still known.
15. **Next, in order** (2026-08-14): re-check region rects against the larger
    building footprints (§9.12); fix or replace the Pixel Lands cottage whose
    palette does not match; then the outstanding user requests — a real bridge
    over the ocean, desert ground for Dhahran, moving NPCs, and denser trees
    (tasks 21 and 22). The
    `mix/` set is already effectively this; `cf/` and `pc/` are not.
14. **The Background list is now half-translated.** `.tli__role` and the new
    `.tli__note` carry `data-i18n`; `.tli__desc` (seven long paragraphs) does
    not, and never did. Invisible in practice — the map and the list are never
    shown at the same time, so a reader sees either fully-translated cards or the
    all-but-roles-English list — but it is an inconsistency, and closing it means
    42 more machine-translated paragraphs with the §7 quality caveat attached.
    Deliberately not done unasked.
15. **Section length.** The map is ~5,620px of pinned scroll on a 900px viewport
    (~6 screens), which is the value §9.11 tuned and §9.12 preserved through the
    zoom change. If it ever needs shortening, `SPEED_R` in `walk.js` is the knob;
    do not cut the dwells.

---

## 13. How the user works

- Iterates visually and in small increments — makes a change, looks, reacts.
- Cares about *why*, not just *what*. Explanations of mechanism land well.
- Will reverse a decision after seeing it (the globe inversion). Keep changes
  cheap to undo and say what was kept versus reverted.
- Wants quality over byte-thrift on the hero specifically ("don't compromise on
  its quality") — but the rest of the site should stay lean.
- Prefers being told when something is a real risk (licensing, translation
  quality) rather than having it silently handled. Says so, then decides — the
  brain reference was flagged and he chose to proceed anyway. Flag it, record
  the mitigation, move on.
- **Keep this document updated as work lands, not at the end of a section.**
  Asked for this directly on 2026-08-12. A half-finished section that is written
  up beats a finished one that is not, because the doc is the handoff artefact.
  Record in-flux decisions as open items rather than leaving them out.

---

## 9.14 The Photoshop map and 7-outfit character (2026-08-14) — BLOCKED ON RE-EXPORT

The user hand-built the final map and a 7-outfit character sheet in Photoshop.
Files in `E:\Website\map-kit\Final assets\`. The artwork is a large step up —
proper composition, institutions with towers, a desert that reads as desert.
**Neither asset can be wired in as delivered.** Both faults measured, not guessed:

| Asset | Size | Fault |
|---|---|---|
| `Base map.jpg` | 1376x3072 | **JPEG.** A 64x64 patch of flat sea holds **471 unique colours**; the source art has 2-4 there. Lossy compression has shredded the 1px edges and left ringing round every sprite. Irreversible — needs re-export. |
| `Character (1..7).png` | 1856x2270 (7th 2048x2048) | **No alpha at all** — 0 transparent pixels. Background is near-white and *noisy* (38 unique colours in a 64x64 corner patch), so it is not a clean key either. Drawn over the map each frame would be a white box. |

**What is needed from the user:**
1. Map re-exported as **PNG** (or lossless WebP). Never JPEG for pixel art.
2. Character sheets exported with a **transparent background**, and all seven at
   the **same canvas size and frame grid** — the 7th is 2048x2048 while 1-6 are
   1856x2270, so frame pitch differs and one shared index will not address them.

**What can be fixed here without them:** the white background can be keyed by
flood-filling from the border, which preserves whites *inside* the figure (eyes,
highlights) that a global "remove white" would eat. Only worth doing if a
transparent re-export is not possible — it is guesswork against a noisy key.

**Also unresolved: the milestone-to-building mapping.** The new map is a hand
composition, so nothing connects its buildings to the seven `STOPS`. Reading it
top-to-bottom the order is probably: cathedral (BIT Mesra) -> the two timber
buildings -> the three manors -> the desert institution (KFUPM), but which of the
two side-by-side timber buildings is `chadda` and which is `metarch1` cannot be
inferred. **Ask.**

**Architecture consequence.** A hand-painted map means `buildScene()` stops being
the source of the world: the map becomes one image, and `PATH`/`STOPS` must be
re-derived in the new 1376x3072 coordinate space (the old ones are for a 34x104
tile grid and do not transfer). `walk.js` needs a "prerendered" mode that blits
the image instead of the scene — the camera, ramps, gait and card logic are all
unaffected and should be kept as they are.

### 9.14b Asset prep done — and the character scale blocker (2026-08-14)

Python tooling, both reusable:
`tools/prep_final_assets.py` and `tools/normalise_character.py`.

**Done:**
- `Base map.jpg` -> `public/assets/pixel/final/base_map.png`, 1376x3072. Lossless
  *container* only; the JPEG ringing is in the pixels and cannot be recovered.
- All seven outfit sheets keyed to transparency by **flood-filling inward from
  the border**, not by deleting near-white globally — the figures contain white
  (eyes, highlights) that a global key punches holes through. ~51% cleared, with
  a 1px feathered fringe so there is no white halo.
- All seven normalised to an identical grid: **2048x2320, 8 cols x 4 rows,
  cell 256x580, 32 frames, bottom-centre anchored**. Sheet 7 was 2048x2048
  against the others' 1856x2270; it is re-gridded, never scaled.
- **Figures had to be cut by PITCH, not by gap.** Adjacent figures on sheets 1-6
  touch with zero transparent columns between them, so no gap threshold splits
  them — every value from 1 to 6 gave the same merged 850px blobs. Both sheet
  widths divide by 8, so each row band is cut into 8 equal cells and each cell
  trimmed to its own content. `PER_ROW = 8`.
- Frame layout, read off the sheet: row 1 front standing, row 2 side running,
  row 3 front + back standing, row 4 mixed front/side. All seven align
  frame-for-frame.

**THE BLOCKER — the character is ~13x too big for the map.** Measured on
`base_map.png` around the cathedral door at (600,330)-(860,520): the door is
**~48px** and the NPC standing on the path is **~47px**. So a person on this map
is **~45px tall**. The outfit figures are **580px**.

580 -> 45 is a 0.078 scale factor. That does not downscale — it destroys the art,
and no integer divisor lands near it (580/13 = 44.6). The sheets are drawn at
roughly 13x the world they have to stand in.

Options, in order of preference:
1. **Re-export the outfits with the figure ~45px tall** (cell about 20x45). That
   is the only route that keeps them as pixel art at map scale.
2. Redraw the map ~13x larger — 17,888 x 39,936 px. Not viable.
3. Smooth-downscale the character and accept it is no longer pixel art. It will
   read as a blurry sprite against a crisp map.

**Building-to-milestone order is settled** (user, 2026-08-14): top to bottom —
cathedral = BIT Mesra, then **Chadda, then Metarch**, then the three manors, then
the desert institution = KFUPM.

Still to build once the character is at scale: PATH/STOPS in the new 1376x3072
space, `walk.js` prerendered-map mode, outfit switching per milestone, moving
NPCs.

### 9.14c Character scale — RESOLVED by render-down (2026-08-14)

The 13x blocker in 9.14b is closed. The user's call: resize the character against
the door rather than re-export. `tools/resize_character.py` does it.

    python tools/resize_character.py            # default, door 48px
    python tools/resize_character.py --height 45
    python tools/resize_character.py --door 52

**It derives the target rather than taking a number.** A real door is 2.0m and an
adult 1.7m, so an adult is 0.85 of a door. The cathedral door on `base_map.png`
measures 48px, giving 41px — and the NPC the artist drew on that path is ~45px,
so the derivation agrees with the artwork. Verified by compositing frames either
side of that NPC: matching height and visual weight.

Result: **580px -> 41px, scale 0.0707, cell 256x580 -> 18x41, sheet 144x164**,
`outfit1..7_small.png` + `outfits_small.json`.

Three things in that script are load-bearing, and all three were bugs waiting to
happen:

1. **Alpha is premultiplied before scaling and un-premultiplied after.**
   Resampling straight RGBA averages colour into fully transparent pixels and
   drags a dark halo round every edge. Invisible at 580px, glaring at 41px.
2. **Each frame is resized individually into its own cell.** Scaling the whole
   2048x2320 sheet at once lets rounding drift across 8 columns, so frames
   gradually slide out of their cells and the character jitters as it animates.
3. **LANCZOS, not nearest.** At 0.0707 there is no integer factor anywhere near,
   so nearest would drop most rows and columns and return noise. This is a
   render-down of detailed art, not a pixel-art scale, and it has to be treated
   as one.

Remaining, all mechanical now: PATH/STOPS traced in the new 1376x3072 space,
`walk.js` prerendered-map mode, outfit switch per milestone (7 outfits, 7 stops),
moving NPCs.

### 9.14d Road traced, stops placed (2026-08-14)

`tools/trace_road.py` recovers PATH from the painted map by colour rather than by
clicking points off a screenshot. Outputs `road_path.json` (58 waypoints,
**3139 px** long) and `stops.json`, both in `public/assets/pixel/final/`.
`--debug` writes `_road_debug.png` with the trace drawn over the map — always
look at that before trusting a run.

**Two heuristics carry the whole thing, and the naive versions both failed:**

1. **Nearest run, not median.** Taking the median of all road pixels on a
   scanline throws the trace sideways wherever a side track branches, and the
   walker cuts across a field.
2. **Cap horizontal movement per row (`MAX_DX = 2 * step`), and hold the line
   when nothing is in reach.** Without it the trace struck out diagonally across
   open sea instead of taking the causeway, and climbed onto buildings. Holding
   straight on is nearly always right — it means a bridge, a gateway, or a
   stretch the colour key missed.

Also: the grey range is kept **narrow and only consulted when no sand is found**.
A broad grey matches every castle wall and roof on this map and drags the trace
up onto the architecture.

**Stops, in the user's settled order.** "Chadda then Metarch" is an order of
ARRIVAL, not a left/right claim — the road reaches the right-hand timber house
first, so that is Chadda. Geometry alone had them reversed, with a negative gap.

| stop | at (px) | stands |
|---|---|---|
| barch (cathedral) | 336 | 676,328 |
| chadda | 756 | 699,744 |
| metarch1 | 956 | 675,864 |
| jaiswal | 1290 | 708,1248 |
| medicfibers | 1540 | 693,1496 |
| metarch2 | 1831 | 702,1784 |
| kfupm (desert) | 2850 | 682,2792 |

Min gap **200px** against `2 * exit_r = 180`, so two cards can never be open at
once — the same invariant as 9.11, restated in pixels because the world is no
longer a tile grid. Where geometry tied (the two side-by-side timber houses) the
order is forced to the story order with `MIN_GAP`.

**Card radii are now in PIXELS: enter 60, exit 90.** The old 3.5/5.0 were tiles.

Next, and all mechanical: `walk.js` prerendered mode (blit `base_map.png`, drop
`buildScene`), swap PATH/STOPS for these, outfit switch per milestone (7 for 7),
moving NPCs. Camera, ramps, gait and card lifecycle carry over untouched.

### 9.14e walkmap.js — painted-map walk, outfits, moving NPCs (2026-08-14)

`src/modules/pixel/walkmap.js` + `lab/walkmap.html`. Supersedes `walk.js`:
the world is one painted image, so `buildScene()` is no longer the source of
anything. Every mechanism from 9.11 is kept, because none of them depended on how
the world was produced — ramps with dwells, gait as a pure function of distance,
camera lead frozen while a card is open, card hysteresis.

**Verified at init** (pane hidden, so the draw loop could not be seen run):
path 3138.8px over 58 waypoints, 7 stops, cell 18x41, scroll total 9313px at
1280x860. Data, art and ramps all load and build.

**New:**
- **Outfit per milestone.** `outfitFor(d)` counts how many stops are behind the
  walker and indexes `outfit1..7_small.png`. He changes as he arrives, so the
  outfit is a function of progress, not an event that can be missed by scrolling
  fast.
- **NPCs move.** Each patrols between two points on a sine, time-driven — they
  walk whether or not the reader scrolls, which is the difference between a place
  and a diorama. Placed in the `NPCS` array in `walkmap.js`, or passed in as
  `opts.npcs`. **These positions are first-pass and want checking against the
  painting.**

**Frame mapping is data-driven** in `FRAMES`, and this is the part most likely to
need changing. Measured: all four rows hold 8 filled frames with similar
frame-to-frame deltas (33-59), so they are pose sets rather than tight cycles —
**except row 1, an unmistakable side-on run.** Movement therefore uses row 1
regardless of heading; the road is nearly vertical and a side-on gait reads
correctly against a vertical scroll. If a row turns out to be a real front or
back walk, change `FRAMES` only.

**Two traps already paid for, do not reintroduce:**
- scroll is measured against the **scroller**, never the sticky stage (9.11)
- ZOOM is forced integer, or the painted map crawls as it scrolls

**Not yet done:** wire into `index.html` behind the timeline fallback, i18n keys
for the stop copy, and a visual pass on NPC placement and the frame mapping.

### 9.14f Corrections (2026-08-14) — hero, NPCs, and the path still wrong

User feedback, all three fair:

**1. Hero — reverted to FREE_Adventurer.** The Photoshop outfit sheets were
rendered down 13x to map scale and lost the read entirely at 41px. The
Adventurer is already in the library at `/assets/pixel/hero` and is **34px on a
map where a person is ~45px**, so it needs no resizing at all. `walkmap.js` now
loads its 8 directional sheets (96x80 pitch, figure at x=48 / feet y=58).
**Outfit-per-milestone is therefore removed** — that feature only existed for the
7 clothing sheets. If it is wanted back, the Adventurer needs 7 recolours at 34px.

**2. NPCs are their own people again.** They were drawing from the hero's own
sheet, so the street read as one man standing in seven places. Now from
`/assets/pixel/mix/villager_*.webp` — the Citizen_F, Rogue, Knight and Wizard
sprites already downloaded. They are single frames, so motion is conveyed by
travel plus a 1px bob; a real walk needs the Citizen_F `Walk-Sheet`.

**3. THE PATH IS STILL WRONG — do not trust `road_path.json`.** Colour tracing
has now failed three times and is the wrong tool here:

  - the first range (R>=150) swept up the manor roofs (#835130) and their
    shadows, so the trace climbed over rooftops
  - tightening to the sampled road (#d8a25c) fixed the roofs but the manors sit
    **on** the central axis with the road weaving **around** them, so the
    "hold the line" fallback drove straight through the buildings
  - widening `MAX_DX` to follow the curve got 5 of 7 stops onto road, but left
    `barch` on #6c4c3f and `medicfibers` on #220500 — both building pixels — and
    pulled `kfupm` off to x=430

**The recommendation is to stop tracing and hand-place the waypoints.** The road
is plainly visible in the painting; 15-25 points read off it would be exact and
take minutes, against a heuristic that keeps fighting roofs, shadows and
occlusion. `road_path.json` is plain JSON — `{"points": [[x,y], ...]}` in map
pixels, 1376x3072 — and `stops.json` `at` values are recomputed from it by the
snippet in 9.14d.

A useful check either way, since it catches exactly this class of error:
sample `base_map.png` at each stop's `stand` point. Anything dark (channel sum
< ~330) is a building outline, not ground.

### 9.14g Road and stops hand-placed — VERIFIED (2026-08-14)

Both are now hand-placed by the user through `lab/trace.html`, and both are
correct. **Do not regenerate either with the colour tracer** — it failed three
times (§9.14f) and `tools/trace_road.py` is kept only for reference.

`lab/trace.html` has two modes and writes straight to disk via dev-only Vite
middleware (`/__save-road`, `/__save-stops` in `vite.config.js`):

- **Road** — click along the road at 1:1, so a click IS a map pixel.
- **Stops** — click the seven in walking order; the bar names the one it is
  waiting for. Clicks **snap to the nearest road waypoint**, because the walker's
  position must be a distance ALONG the path or it is undefined — that snap is
  also what stops him standing inside a wall.

It carries the verbatim timeline copy across on save, and opens with the current
road and stops loaded so you adjust rather than start again.

**Verified state:** road 85 points / 5896px. All 7 stops on real ground, exactly
on the path, chronological, copy intact. Gaps
`1377 / 202 / 691 / 615 / 732 / 1308`, min 202 against the 180 required.

**The check worth keeping**, since it caught every earlier failure: sample
`base_map.png` at each stop's `stand`; a channel sum under ~330 is a building
outline, not ground.

Hand-placing beat the heuristic on pacing too, not just correctness: the
automated pass lumped three stops within 441px and left dead stretches either
side.

### 9.14h "The map looks low resolution" — it was the canvas, not the art (2026-08-14)

Reported as a resolution problem; asked whether an upscaler (GitHub/HuggingFace)
could enlarge the map without the AI look. Answer: no upscaler was needed, and
none would have helped. What was measured, in order:

> **SUPERSEDED 2026-08-14, read 9.15 first.** The base map was generated by
> **Gemini**, not assembled from the kit. Everything measured below is accurate
> but diagnoses the wrong layer — the art has no true pixel grid to begin with.
> The canvas dpr fix is still correct and still landed.

**Ruled out — downsampling.** `Base map.jpg` is 1376x3072 and `base_map.png` is
1376x3072, **pixel-for-pixel identical**. Nothing in the pipeline resized it.

**Ruled out — JPEG damage as the cause.** The export is quality 100 with 4:2:0
chroma subsampling, so colour really is stored at half resolution (chroma pairs
identical 0.56-0.59 of the time vs 0.20 for luma). But the damage is mild:

| measure | value | reading |
|---|---|---|
| blockiness on the 8px DCT grid | ratio **0.948** | no visible blocking at all |
| flattest 10% of 1274 sampled 40x40 patches | **1.06/255** neighbour variation | flat art is flat |
| colours in those flat patches | median **74** | mild noise, not smear |

An earlier claim of "678 shades of mush" in flat grass was **wrong** — that
sample landed on a detailed region, not flat art. Corrected by sampling 1274
patches and taking the flattest decile instead of one eyeballed crop. A crop
viewed at 2x confirms the art is crisp. This is the same lesson as the road
trace: **sample properly, do not conclude from one patch.**

A palette-snapping "restoration" tool was written and then **deleted** — with
damage this mild it would risk degrading good art for no visible gain.

**The actual cause — the canvas backing store was sized in CSS pixels.**
`canvas.width = stageW` where `stageW = stage.clientWidth`. `.journey__canvas`
is `width:100%` + `image-rendering: pixelated`, so the browser then scales that
bitmap to the device by dpr with **nearest neighbour**. One art pixel therefore
covered `ZOOM x dpr` device pixels, which is only an integer at some scalings:

| Windows scaling | dpr | before | after |
|---|---|---|---|
| 100% | 1.0 | 2.00 dev — even | 2 dev — even |
| **125%** | 1.25 | **2.50 dev — UNEVEN** | 3 dev — even |
| 150% | 1.5 | 3.00 dev — even | 3 dev — even |
| **175%** | 1.75 | **3.50 dev — UNEVEN** | 4 dev — even |
| 200% | 2.0 | 4.00 dev — even | 4 dev — even |

At 125% and 175% some pixel columns drew 2 wide and some 3. No detail is lost;
the grid is just irregular, and that is exactly what "low resolution" looks like.
The CSS comment on `.journey__canvas` already *assumed* `ZOOM x dpr` was an
integer — nothing had ever made it true.

Fix in `walkmap.js`: `stageWd/stageHd` (device px) added alongside `stageW/stageH`
(CSS px, still driving the scroll ramps so section length does not change with
display scaling); `ZOOM` now measured in device px, ceiling raised 4 -> 6 for the
dpr headroom; the backing store reallocates only on real resize instead of every
frame. Verified numerically across all five Windows scalings.

**Still outstanding, for the user:** re-export from Photoshop as **PNG**, not
JPEG (File > Export > Export As > PNG). That recovers the half-resolution chroma
for free. If the PSD is larger than 1376x3072, exporting at full size is a real
resolution gain; if scaling is ever needed use **Nearest Neighbor (hard edges)**
at an integer multiple, never Bicubic.

**On upscalers, for the record.** AI upscalers (Real-ESRGAN, waifu2x/nunif,
SwinIR) hallucinate detail from a learned prior and smooth the deliberate hard
edges — that is the "AI version" look, and it is the mechanism, not a setting.
Deterministic pixel-art scalers (hqx, xBRZ, Scale2x/AdvMAME, Eagle, SuperXBR)
invent no texture but still round corners and interpolate edges, which fights the
90s aesthetic. Neither adds real information: the kit tiles are natively 32-115px,
so everything above that is invention. Integer nearest-neighbour zoom — what the
canvas already does — is the only exact option.

### 9.14i trace.html — separate People and Animals placement modes (2026-08-14)

Four modes now: Road, Stops, People, Animals. Separate buttons and separate cast
dropdowns (8 people vs 3 animals) rather than one mixed list, so a cow cannot be
placed as a pedestrian. Two clicks make one patrol (start, then destination).
Speed is set by kind — 0.7 for people, 0.25 for animals; livestock moving at a
third of walking pace is most of what makes them read as animals. Markers are
amber for people, green for animals, with the patrol line drawn. Right-click
undoes and Clear clears only the active mode's list. Saves to `npcs.json` via
`/__save-npcs`; `walkmap.js` loads it when present and falls back to the
hardcoded list otherwise.

Unlike stops, NPCs are **not** snapped to the road — deliberate, so someone can
stand by a stall or a cow can stand in a field. The trade is that nothing stops a
marker landing inside a wall or in the sea.

### 9.15 The base map is Gemini-generated — REBUILD FROM THE KIT (2026-08-14)

Disclosed after the 9.14h diagnostic: `base_map.png` was **exported from
Gemini**, not composed from the itch.io tiles. Shibli is **not satisfied with
it**. Next task, to be raised in a fresh chat: **build a map like it using the
downloaded assets**.

**The evidence was already in hand and I misread it.** Template-matching every
`used-on-map/` asset against the map peaked at **0.39–0.47** — a real placement
scores 0.9+. Nothing matched anywhere. I attributed that to matcher bias instead
of drawing the obvious conclusion. Colour count says the same thing: **349,747**
on the map against **21** in a clean 64x64 kit tile.

**Why this is the root cause.** AI-generated pixel art is a *painting of* pixel
art. There is no consistent pixel grid underneath, so it can never be crisp at
magnification — which is the entire point of this section. No upscaler, no
re-export and no render fix can give it a grid it never had. The dpr fix in
9.14h is still correct and still worth having; it just was not the ceiling.

**Scope of the rebuild.**
- Sources: `E:\Website\map-kit\` (256 files, `used-on-map/` +
  `available-unused/`), `v2/assets/Pixel Art/`, `v2/assets/tilesets/`.
- Use the Gemini map as a **composition reference only** — region order, where
  the road runs, the general shape of the world. Never as source art.
- Rules already established, do not re-derive: scale anchored on a **door =
  2.0m -> 12px/m -> adult 20px** (never from the hero — circular, cost a session
  in 9.13); clearance tests a sprite's **drawn box**, not its anchor cell, or
  trees swallow buildings (9.12); terrain uses **centre tile (1,1)**, because
  edge tiles bake in shoreline and grass keylines (9.7); no unclothed `Body_A`
  NPCs; do not repeat the same villager everywhere.

**Invalidated by a new map — must be redone, not ported:**
| file | what it is | why it dies |
|---|---|---|
| `road_path.json` | 85 hand-traced points, 5896px | traced on the Gemini map |
| `stops.json` | 7 verified milestones | stand points are Gemini-map pixels |
| `npcs.json` | hand-placed cast | same |

All three are re-authored in `lab/trace.html`, which already has Road / Stops /
People / Animals modes built for exactly this (9.14i). `walkmap.js` needs no
change — it reads whatever those files contain.

**Process lesson.** Ask **how an asset was produced** before measuring it. One
question would have replaced the whole 9.14h investigation. Also: I over-claimed
mid-diagnosis ("678 shades of mush" in flat grass) from one eyeballed crop that
actually contained detail; 1274 sampled patches gave 1.06/255. Sample, don't
eyeball — the same failure as the three broken road traces.

### 9.16 Compose lab — SUPERSEDED by 9.17, kept for the failure record (2026-08-14)

Standalone lab page + Python composer that assembles the overworld from the
kit, guided by the Gemini reference. **Nothing in the site rendering path is
touched by this work** — it's a parallel pipeline that will eventually replace
`base_map.png`.

**Files:**
- `lab/compose.html` — side-by-side view (Gemini on the left, composition on
  the right). Sliders for tile size, cluster count, building threshold, tree
  and rock density; toggles for label overlay and tile grid. Recompose is one
  click.
- `tools/compose_map.py` — two learning passes every call:
  1. **Unsupervised** — Lloyd's K-means (numpy-only, k=14 default) on the
     reference's per-tile mean RGB. Discovers the artist's palette without me
     hard-coding thresholds.
  2. **Supervised** — HSV-band rules in `label_cluster()` map each centroid
     to `{water, grass, path, sand, farm, forest, rock, roof, void}`.
     Everything downstream talks that vocabulary; if the reference changes,
     `label_cluster()` is the only place to look.
  Then: paint centre tiles from Cute Fantasy (`Grass_Middle`, `Water_Middle`,
  `Path_Middle`, `FarmLand_Tile`, cliff-centre for rock). Flood-fill roof
  blobs -> pick a `02-buildings/` sprite with closest footprint area, from the
  three nearest matches for variety. Sprinkle `03-trees-and-plants` on
  forest/grass with a density slider. Sprinkle small props on rock/sand.
  Deterministic: every random pick is seeded from `(x, y)`, so buildings do
  not migrate between runs.
- `vite.config.js` — new `/__compose` endpoint runs the composer with query
  args and returns `lab/composed_map.png.json` (tile counts, placements,
  legend).

**First pass, honest read** (`lab/side_by_side_top.png`):
- Buildings placed roughly correctly (dark roof clusters -> nearest kit size).
- Water present but as blocky rectangles — no shore transitions from `beach.png`
  nine-slice yet.
- The winding sand road does NOT survive per-tile averaging — road cells at
  the edge get classified as grass or forest because a 16px tile straddles
  them. Fix: after classifying, run a thin-region detector on the reference at
  full resolution and force those cells to `path`.
- Autumn forest at the top of the reference comes out plain green — the kit is
  99% summer/spring trees. Either hue-shift a subset of tree sprites at load
  time or accept that the composition can't match Gemini's colour licence.
- Farm crop rows in the reference come out as flat `FarmLand_Tile` without any
  crop props on top — need to scatter `kibyra_*` crop props on farm cells.
- Blob-merging: adjacent buildings often fuse into one huge blob and get one
  big kit building instead of several small ones. Fix: split blobs by
  watershed on the reference's brightness channel.

**Iteration loop:** open http://localhost:5199/lab/compose.html, adjust
sliders, click Recompose. Under 3 s per run; the composed PNG also writes to
`lab/composed_map.png` for direct inspection.

**Deliberately NOT done yet:** wiring `composed_map.png` in as `base_map.png`.
The current output is a proof that the pipeline works, not a finished map. Once
it looks right, one line in `walkmap.js` swaps the source.

### 9.17 Compose lab, staged rebuild — the two measurements that fixed it (2026-08-14)

Rebuilt on Shibli's instruction: *"first get ready with Map then use buildings
then trees"*. One pass doing everything gave a mediocre everything. Now
`--stage terrain|buildings|trees|props` renders up to and including that stage,
and the lab page has a stage dropdown so each layer is judged on its own.

**Failure 1 — per-tile averaging killed the road.** v1 averaged each 16px
tile's colour then clustered that. A tile straddling the road edge averages
road+grass and lands as neither, so the winding road simply vanished. Fixed by
classifying every PIXEL and having each tile take a weighted vote, with road
winning on a 30% minority because roads are thin and matter more than the grass
beside them. `TILE_PRIORITY` holds those thresholds.

**Failure 2 — colour cannot separate roofs from autumn trees.** Both are dark
warm brown, so the colour rule for `roof` swallowed **4805 tiles (29% of the
map)** while finding **zero** forest. Two measured separations fixed it, and
both are worth keeping:

| confusion | wrong signal | measured separator |
|---|---|---|
| roof vs autumn tree | both dark warm brown | **saturation** — buildings are slate/stone/plaster, S<0.34; foliage is saturated. Caught 63 building-sized blobs, rejected canopy almost perfectly |
| autumn foliage vs dirt road | both saturated orange | **hue** — foliage clusters at H=17-20, every dirt/sand cluster at H=28-40. Boundary at 26. The earlier H<48 cut made canopy 51.7% of the map and ate the road |
| tree canopy vs grass | both green | **texture** — local std of V over 9x9. Grass 0.00-0.04, canopy 0.13+. Split at 0.085. Colour alone masked the grass out and left the map 54% dirt |

Object pixels are then EXCLUDED from the terrain vote, so a tile with a tree on
grass votes grass. Terrain is what is UNDER the objects — that reframing is what
made the ground layer correct.

**Architecture now:** `structure_mask()` and `canopy_mask()` run first at full
resolution. K-means (numpy-only, k=12) learns the ground palette from
non-object pixels only; `label_ground()` maps centroids to just four classes
(water/grass/path/farm) — it never has to tell a roof from a tree, which is
exactly what it was bad at. Then despeckle, `bridge_path()` (a road with
one-tile holes reads as rubble), nine-slice autotiling from the Cute Fantasy
3x6 sheets (rows 0-2 are the 3x3; centre is (1,1)), buildings from
`connectedComponentsWithStats` on the structure mask sized by width, trees by
canopy coverage per tile, props last.

**Current output:** 86x192 tiles, 35 buildings, 392 trees, 221 props. Road
traces correctly, river and sea correct, buildings sit along the road. Trees are
excluded from `path` and `water` tiles — a tree in the carriageway breaks the
illusion and blocks the walker.

**Still not right:**
- No autumn palette. The kit is summer/spring; the reference's orange top third
  cannot be matched without hue-shifting tree sprites at load time.
- Farm crop rows render as flat `FarmLand_Tile` with no crop props on top.
- Water edges are nine-sliced but there is no beach/shore band — `beach.png`
  (5x3, water->sand) is loaded but unused.
- Buildings are picked by width alone; a tall narrow blob can still get a wide
  squat house.
- Props repeat visibly; needs weighting by terrain rather than one flat list.

**Not done on purpose:** `composed_map.png` is NOT wired in as `base_map.png`.
This is a proof the pipeline works, not a finished map. When it looks right, one
line in `walkmap.js` swaps the source — and `road_path.json` / `stops.json` /
`npcs.json` must all be re-traced against the new map (see 9.15).

---

## 9.16 THE VALLEY IS NOW THE LIVE MAP (2026-08-15)

**Start with `docs/CONTEXT.md`** — the narrative of how the section got here,
including everything that was built and thrown away.

**§9's map is no longer what index.html renders.** The Experience section drives
a second, hand-authored map. This note is the pointer; the detail — 600+ lines of
it — is in **`docs/valley.md`**, kept separate because a second session was
editing §9's files at the time and there is no version control here.

### What changed at the seam

`walk.js` used to read `STOPS`, `PATH_LENGTH`, `pointAt` and `regionAt` straight
off `journey.js` imports, which tied it to one map. Geometry is now a parameter:

    initWalk(stage, { world })

`DEFAULT_WORLD` is §9's map, so **`lab/walk.html` and every existing caller are
untouched**. `src/modules/pixel/valleyjourney.js` is the valley's implementation
of that same contract.

### The one rule that matters here

**The document is the truth.** `valley.js` still carries a `PATH` polyline and a
`row`/`side` per stop and *both are stale* — the road was repainted by hand, the
map grew 24 rows, the buildings moved. Everything geometric is derived from
`public/assets/pixel/valley-map.json`. Only the CV prose is not: it stays in
`valley.js` STOPS and joins on the `stop` id, because the map changes on every
edit and the CV does not.

### New files

| | |
|---|---|
| `src/modules/pixel/valleyjourney.js` | the walk's view of the valley |
| `lab/editor.html` | the map editor — terrain, sprites, focal points, routes |
| `tools/check-paths.mjs` | validates hand-drawn routes, refuses to write on failure |
| `tools/alt-routes.mjs` | generates alternative routes between the fixed focal points |
| `tools/grow-map.mjs` | inserts rows without disturbing the work in the map |
| `tools/desert-pixelate.py` | converts non-pixel-art packs; `--manifest=` for any pack |
| `docs/valley.md` | all of the above, in full |

### Two things that will bite

- **`migrateDoc` truncates when `COLS`/`ROWS` shrink.** Growing is safe; a typo
  that makes them smaller silently deletes everything past the new edge.
- **The map file and `ROWS` must agree.** They are changed together or
  `migrateDoc` pads or truncates on the next load.

### Map safety

`/__save-valley` snapshots the file it is about to replace into `.map-history/`
(outside `public/`), and refuses any save that drops object count by more than
half — 409, nothing written, repeat within 30s to confirm. `PROTECTED-*.json`
snapshots are never pruned. This exists because the map was lost twice.

**§9 is not deleted and is not wrong** — it describes the first map, which still
runs `lab/walk.html`. Fold the two together only when the other session's work is
reconciled.


## 14. DONE — the Cost of Inaction frame (2026-08-23)

**Status: IMPLEMENTED and verified. See CONTEXT §49 for what changed against
this plan and for three measurement mistakes made on the way.** The plan below
is kept as written, because the reasoning still holds and one thing it did not
anticipate is worth seeing in contrast: it guarded `.ftags` against the 900px
breakpoint but not the COPY, and the copy going fixed while the tags stay in
flow is what actually broke the phone layout. Both now share one guard.

### What was asked

> The same has to be done for "The cost of Inaction ... untouched climate change".
> The whole text block should appear once the earth start changing in to bad
> earth and disappear once we start zooming in to the earth.
> And the tags are not floating, they are static, they should be floating around
> bad earth.

So: two jobs. (1) Give `#future` the same scroll-driven reveal `#whole` just
got. (2) Make the four `.ftag` labels actually float.

### Read §48 of CONTEXT.md first

`#future` is the same problem `#whole` had, and the solution and its two failed
predecessors are documented there. The load-bearing lesson: **gate on STATE, not
on a scroll position**, and **one element, one owner** — GSAP writes inline
styles, so a stylesheet rule on anything GSAP tweens silently loses.

### Measured, on the live page (vh 957, so recompute if the viewport differs)

| fact | value |
|---|---|
| `.worlds__two` scrub range | 0 → 3445px (`4402 - vh`) |
| `pCopyGone` | 0.153 → y 527 |
| `pDecayStart` (`+ HOLD 0.14`) | 0.293 → y 1009 |
| `pDecayEnd` (`+ DECAY_SPAN 0.30`) | 0.593 → y 2042 |
| `#whole` caption visible | y 585 → 1216 |
| dive (phase two) begins | `#about.top - vh` = **y 3445** — exactly where the worlds scrub ends |
| section tops | worlds 0, whole 957, future 2297, about 4402 |

**The bug, measured:** `#future .future__body` is `position: relative;
opacity: 1` and has **no scroll-driven visibility whatsoever** — confirmed by a
40-sample sweep, `futureAlwaysOpaque: true`. It simply scrolls past. Worse, it
does not enter the viewport until **y 3418**, which is 23px before the dive
starts at 3445. So today the copy arrives *exactly as the zoom-in begins* —
precisely inverted from what was asked. Same inherited-geometry cause as `#whole`
(the section is 220svh with the body at 68% of it).

**The tags are already animated,** contrary to first appearance:
`ftag-drift 11s/14s/12.5s/15s ease-in-out` with staggered negative delays. The
keyframe is the problem, not its absence:

```css
@keyframes ftag-drift {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(6px, -12px, 0); }
}
```

Measured live amplitude: **~5px x ~10px**. The authoring comment says
"suspended, not animated" and that intent overshot — at ~1px/s against a globe
filling a 957px viewport it is invisible. They also scroll away with the grid,
so any drift is swamped by scroll motion.

### The design that follows from the above

**1. Publish a `--cost` signal from `src/main.js`,** the same shape as `--whole`.
Do NOT rebuild it in CSS out of `--decay` and `--zoom` — that is failed attempt
#1 in CONTEXT §48, and it fails for the same reason: both inputs are flat where
the caption needs resolution.

- **In:** starts at `pDecayStart + WHOLE_OUT` (p 0.343, y 1181), which is the
  moment `#whole`'s caption has finished leaving, so the two never share a
  frame. At that point `decay` is only ~0.07 — the surface has *just* begun to
  turn, which is what "once the earth starts changing" means. Fade over
  `COST_IN = 0.07` (to y ~1423).
- **Out:** driven by the DIVE, not by the worlds scrub. Phase two is the
  `ScrollTrigger` on `#about` / `#riyadh`. It currently publishes **nothing** a
  stylesheet can read — that needs adding. Keep a `let divePos = 0` updated in
  phase two's `onUpdate`, and fade the copy out over the first ~0.14 of the dive.
- Both triggers are `scrub: true`, so there is **no lag mismatch** here and the
  `heroExit`-style cross-module gate is NOT needed. But `paintCost()` must be
  callable from BOTH `onUpdate`s (worlds gives the in, dive gives the out) —
  mirror the existing `paintCaption()` two-clock shape in main.js.
- Set `inert` from the same signal, as `#whole` does.

**Do not use the worlds progress reaching 1 as the exit signal** even though it
coincides with the dive start today. That equality is an accident of section
heights and will break the day `#about` moves.

**2. `#future .future__body` goes `position: fixed`,** bottom-RIGHT, mirroring
`#whole`'s bottom-left:
`right: var(--pad-x); bottom: clamp(3rem, 10vh, 7rem);` with `grid-row: 1`.
It already has `text-align: right` and `justify-self: end`. Note the stale
comment at layout.css:1195 claiming it "rises into frame exactly as the surface
finishes turning" — the measurement above disproves it; fix the comment too.

**3. `.ftags` must go `position: fixed; inset: 0`** so the `.ftag--a..d`
percentage anchors resolve against the VIEWPORT and the tags float around the
globe instead of scrolling with a grid cell. Drive its opacity from `--cost` as
well. Watch `layout.css:1075` — it currently relies on `grid-row: 2 / grid-column: 1`
and `margin: -26vh 0` to span the frame; fixed positioning replaces all of that.

**4. Replace the single shared keyframe with four distinct paths.** Triangle
loops (`0%,100%` / `33%` / `66%`) rather than a two-stop there-and-back, total
excursion ~30-45px, a little rotation (±1deg), durations 19-26s, keeping the
existing staggered negative delays so they never pulse together.

### Traps that apply to this specific change

- **`.future__body` is SHARED by `#whole` and `#future`.** Any rule written
  without an id prefix hits both. `#whole` is currently `position: fixed`
  bottom-left driven by `--whole`; do not disturb it.
- `.ftag` has an explicit `@media (prefers-reduced-motion: reduce)` block
  (`animation: none !important`) — keep it, and add the new keyframes to it.
- There is a `@media (max-width: 900px)` block that makes `.ftags` and `.ftag`
  `position: static` and stacks them under the copy. Fixed positioning must NOT
  leak into that breakpoint.
- `.ftag` must keep `white-space: nowrap` and must NOT get `text-wrap: balance`
  — the shorthand silently resets the wrap mode. This has already cost time once.
- **Line endings:** `layout.css`, `docs/*.md` are CRLF; `src/main.js` is LF.
  Convert per-file and read `git diff --numstat` after every scripted edit — a
  count far larger than the edit is a line-ending problem, not a real diff.
- Check the build's EXIT CODE, never its output.

### Also still open (unchanged from before)

- **15 commits are unpushed.** `origin/main` is behind; pushing deploys live to
  Vercel immediately, so it needs an explicit go-ahead.
- Stale translations: `hero.hey`, `hero.desc`, `about.label`, `about.title`,
  `about.p1`, `about.p2` still hold old copy in 6 locales, and the newer
  `data-copy` paragraphs have no translations at all.
- The stats panel says 3 research projects while the wheel holds 7 research
  tiles.
- `README.md` calls the Discover Cities paper "Under review" and misspells the
  journal as *Discovering* Cities. **Do not touch README.md** — that repo is
  also the GitHub profile repo.

### Exact rule inventory, from a four-agent read of the codebase

Every `#future` / `.future*` / `.ftag*` rule lives in **one file**,
`src/styles/layout.css`. `sections.css`, `base.css`, `overlays.css`,
`tokens.css` and `i18n.css` have zero hits, so there is no second place to look.

| what | where |
|---|---|
| `.future` box | layout.css:824 — `min-height: 220svh; grid-template-rows: 0.68fr auto 0.32fr; grid-template-columns: minmax(0, 1fr)` |
| small-screen height | layout.css:1037, inside `@media (max-width: 560px)` — `.future { min-height: 235svh }` |
| `.future__body` base | layout.css:861 — `position: relative; grid-row: 2; grid-column: 1; max-width: 62ch; text-align: center` |
| **bare restatement** | layout.css:1073 — `.future__body { position: relative; }` again |
| shared measure | layout.css:1198 — `#whole .future__body, #future .future__body { max-width: min(90vw, 34rem); margin-inline: 0 }` |
| right alignment | layout.css:1304 and :1307 |
| mobile recentre | layout.css:1343, `@media (max-width: 720px)` — recentres BOTH frames |

**Trap: `.future__body` is declared twice**, at 861 and again bare at 1073. Any
new `position: fixed` must sit *after* line 1073 or be id-prefixed, or the later
`position: relative` silently wins. (`#whole`'s rule is at ~1255, which is why
it works.)

**Trap: the tags carry `data-reveal`.** Every `.ftag` and the copy's children
are `data-reveal`, and `src/modules/reveals.js` drives those with an
IntersectionObserver that adds classes. **Check whether it sets `opacity` on
`[data-reveal]` before wiring `--cost` to the same elements** — if it does, that
is the "one element, one owner" collision from CONTEXT §48 all over again, and
it will look exactly like the `.hero__stats` inline-opacity bug. Resolve it by
driving `--cost` on the CONTAINER (`#future .future__body`, `.ftags`) and
leaving the reveal classes to the children, or by dropping `data-reveal` from
these specific nodes.

**`.worlds__two` has no CSS rule anywhere** — it is a plain block wrapper that
exists only as the ScrollTrigger's measuring box. Its height (4402px) is
therefore the sum of `#hero`, `#whole` and `#future`, so changing any of those
section heights re-times the entire earth sequence.

The `#future` copy is `.future__body.wrap`, and `.wrap` (base.css:146) sets
`max-width: var(--max)` = 1560px with `margin-inline: auto` — already overridden
to `margin-inline: 0` at layout.css:1198, but worth knowing it is there.

### RESOLVED before the session ended: how `data-reveal` interacts

Checked, so the next session does not have to:

```css
layout.css:246  [data-reveal]        { opacity: 0; transform: ...; }
layout.css:255  [data-reveal].is-in  { opacity: 1; transform: none; }
```

`src/modules/reveals.js:117` adds `.is-in` from a ScrollTrigger/IntersectionObserver.

**The containers are clean.** Neither `div.future__body.wrap` nor `ul.ftags`
carries `data-reveal` — only their children do. So driving `--cost` on the two
CONTAINERS composes correctly with the reveal system: parent opacity multiplies
with child opacity, and once the children are `.is-in` at 1 the container's
signal governs. Do it that way. Do **not** put `--cost` on the `.ftag` elements
themselves.

**But there is a real trap in going `position: fixed`.** The `[data-reveal]`
children currently earn `.is-in` by scrolling into view. Once their container is
fixed its geometry stops moving with the scroll, so those children can either
fire immediately at load or never fire at all — and a child that never fires is
stranded at `opacity: 0` forever, inside a container that is fading in
correctly. The result looks like "the signal is broken" when the signal is fine.
This is the same class of bug as CONTEXT §47 (headings vanishing) and §48
(GSAP animating detached nodes).

So after wiring this up, **verify the children actually carry `.is-in`**, e.g.
`[...document.querySelectorAll('#future [data-reveal]')].map(e => e.className)`,
before trusting any opacity reading. If they are stranded, the fix is to add
`.is-in` unconditionally to these particular nodes (as reveals.js:95 already
does in the reduced-motion path) rather than to fight the observer.

Note also that `.is-in` sets `transform: none`, which does NOT break
`ftag-drift`: a running CSS animation outranks a normal declaration in the
cascade. Any NEW transform added to `.ftag` as a normal declaration would be
overridden by the animation, so per-tag offsets must live in the keyframes or in
`top`/`left`, not in `transform`.
