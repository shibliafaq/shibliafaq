# The Valley — the second Experience map

> **New here? Read [`CONTEXT.md`](CONTEXT.md) first.** It is the narrative —
> what was tried, what was thrown away and why. This file is the technical
> record and assumes you have it.


Written 2026-08-13. A from-scratch replacement for the §9 map, built after
re-reading the references rather than by editing the old one further.

**A separate note in a separate file on purpose.** A second session was editing
`journey.js`, `worldmap.js` and `HANDOFF.md` at the same time as this was
written, and there is no version control in this project. When the two efforts
are reconciled, fold this into HANDOFF §9 and delete it.

## Files

| | |
|---|---|
| `src/modules/pixel/valley.js` | sheets, sprite sizes, Scene, map data, grade |
| `src/modules/pixel/valleybuild.js` | `buildValley()` — composes the scene |
| `lab/valley.html` | renders the whole map, with zoom / marks / grade toggles |

**Self-contained by design.** It imports nothing from `cutefantasy.js`,
`journey.js` or `worldmap.js` — only `gradeSheets` from `recolour.js`, which is
a pure function. That costs ~60 duplicated lines and buys the guarantee that
neither map can break the other.

## Why it was rebuilt

The old map grew by accretion over many sessions and stopped being editable.
More to the point, it was missing the grammar all three usable references share:

1. **One strong linear feature** runs the whole length — a river, a street, a
   cliff line — and everything is arranged against it. The old map's device was
   a road with buildings beside it, which is why it read as a list.
2. **Hard-edged terrain.** Every water body has a bank; every level change is a
   cliff. Nothing fades.
3. **Crossings punctuate.** Reference 5 has no road at all — bridges and
   clearings do all the structural work.
4. **Vegetation masses and overlaps** at three or four sizes.
5. **The ground is never bare.**
6. **Props crowd the buildings** — that belt of small objects says "inhabited"
   more than the building does.
7. **The frame crops things**, so the world continues past the border.

## The two bugs that mattered, and the fix

Both had one cause: **the path and the buildings were hand-placed against a
river that is a sine curve.** Nothing hand-positioned stays correct when the
thing it is positioned against is computed.

- **Seven buildings stood in the river**, three of them milestones.
- **The route was drowned across six stretches** totalling ~40 rows. Drowned
  road cells are deleted, so the road came out in six disconnected pieces. Three
  hardcoded bridges covered almost none of the real crossings.

The fix was to stop hand-placing:

- **`waterCrossings()` derives the bridges** by walking the route and emitting a
  deck wherever it goes wet, running two tiles onto dry land at each end. A
  derived bridge cannot disagree with the route.
- **Buildings declare a `row` and a `side`, not a column.** `findSlot()`
  enumerates every legal slot at that row and scores them: requested side of the
  road first, then nearest to it, because a building marooned at the map edge
  reads as unrelated and in every reference buildings front the street.
- **The row is a preference.** A horizontal leg of the path blocks every column
  across a band several rows deep, so the search relaxes outward — but is
  **clamped to the building's own chapter**, because unclamped it walked
  medicfibers nine rows out of Delhi into the Ranchi practice band. A visual fix
  that breaks the chronology is not a fix.

`buildValley()` returns a `check` object — `unplaced`, `buildingsOnWater`,
`pathGaps` — reported on every render so this cannot regress silently. All three
should be empty/zero.

## Traps hit while building it, worth not repeating

- **A one-tile-wide blob has no interior**, so every cell resolves to a corner
  tile and a river bank renders as a thin broken line.
- **`beach` is a shoreline sheet whose edges are sand-meets-*water*.** Blobbed
  along a river's land side it paints a bright blue stripe down both banks — the
  same trap §9.8 records for the desert. The water sheet's own nine-slice edge
  already *is* the bank.
- **Testing a sprite's anchor cell is not testing the sprite.** `treeAutumn` is
  73×126 — five tiles wide, eight tall — so a tree three tiles clear of a façade
  still buries it. `boxClear()` tests the whole drawn box. Expect it to reject
  most candidates: asking a mass for 0.85 fill and getting a third of it is
  correct; taking 0.85 is what buries the buildings.
- **Conifers are not date palms.** Standing them in for Dhahran puts a Nordic
  forest in the Gulf. When this was written no pack here shipped a palm, so
  Dhahran had no trees at all — bare sand and rock drifts. *Superseded on
  2026-08-15:* the desert pack ships seven palms and two baobabs. See below.
- **Rotating green to amber at the source's own lightness lands on HSL l25** —
  mud, not amber. Grass needs lifting (§9.8 again). The path only wants a small
  rotation; the full −12° drove it to salmon-pink.

## State

Seven milestones placed, each in its correct chapter; zero on water; zero path
gaps; two derived crossings (the river at its narrowest, and the sea causeway).
One filler cannot place and is reported rather than drawn somewhere wrong.

**Not wired into `index.html`.** The walk (`walk.js`) still drives the old map.
Connecting it means giving `valley.js` the same `PATH`/`pointAt`/`STOPS[].at`
contract the walk expects — the shapes already match, but the `at` distances
have not been re-measured against the new path length.

---

## The desert pack (added 2026-08-15)

CraftPix **2D RPG Desert Tileset**, free tier. It fills the gap this document
recorded above: the Dhahran chapter had no vegetation because no pack shipped a
palm. It now ships seven, plus two baobabs and ten cacti.

### It is not pixel art as shipped, and that is the whole story

The pack has `.ai` and `.eps` sources. Its sprites are 200–560px of smooth
vector shading — a 285×297 tree holds **1,147 distinct colours** — and every one
carries a soft black drop shadow baked into its alpha. Pasted into a 16px-tile
map it reads as clip-art dropped onto a game.

So `tools/desert-pixelate.py` converts rather than crops. Three steps, each
wrong without the others:

1. **The shadow goes first.** Across the pack, pixels with alpha 60–200 have a
   mean luma of 2–16 — that band is not edge anti-aliasing, it is the shadow.
   Cut it *before* the resize or it smears into a grey halo.
2. **The resize is premultiplied.** Resizing straight RGBA averages the colour
   of fully transparent pixels into the edges, and here those pixels are black.
   Every sprite would come back fringed.
3. **The alpha ends up binary.** A soft edge at 16px is a smudge, and it breaks
   `vector.js`, which groups geometry by exact colour.

### Palette size was the wrong knob

The first pass quantised to 20–26 colours and still looked airbrushed, even
though the valley's own sprites use 11–25. Counting colours was measuring the
wrong thing. The right measure is **mean horizontal colour-run length** — how
far you travel before the colour changes:

| | run length |
|---|---|
| Cute Fantasy houses | 2.0 – 2.4 |
| `tree_autumn` | 3.1 |
| `rock_big` | 4.1 |
| converted palms, first pass | **1.28** |

Same palette size, sprayed instead of blocked. Foliage now gets a 3×3 median
before quantising (`"flatten": true`), which lands it at 2.0–2.1. Buildings do
not: the filter eats window mullions, and 14 colours alone puts them at 2.2–2.4.
`dsPyramid` sits at 1.62 and is left there — it is a brick texture, legitimately
busy, and flattening it destroys the brickwork.

### `land_*` are not tiles

Despite the name. Only `bg.png` is seamless — its edges match its interior to
within 1/255. The `land_*` files carry a drawn dark border (`land_12`'s edge
averages RGB 53,37,24 against an interior of 118,85,53), so laying them as tiles
produced **a dark lattice across the ground, like graph paper**. They are
illustrations of a patch of ground. The tile path now crops the border off and
then forces the result to wrap by averaging each edge with the one it will meet.

### `road_*` are a nine-slice set with no naming scheme

26 loose 64×64 files. Which one is the north-west corner was found by
measurement, not by reading filenames: each edge strip is tested for the sand
transition band (RGB 196,145,71) or transparency, and an edge >90% either is
facing off the paving. That yields two exact 3×3 sets — `road_1..9` warm,
`road_14..22` grey — plus four inner-corner variants each that a nine-slice
cannot use. Assembled into `dsRoadWarm` / `dsRoadGrey`.

### What landed

- **55 sprites** in `public/assets/pixel/desert/`, plus 2 nine-slice sheets. 152 KB total.
- **5 new palette groups** in the editor: buildings, plants, rocks, props, ground patches.
- **5 new terrain brushes**: Dune, Gravel, Cracked earth, Desert road, Stone paving.
- Terrain ids **7–11**, appended. Ids are the saved value, so they are never
  renumbered; old documents contain none of them and open unchanged.
- `lab/desert.html` renders the kit beside the valley's own art at the same zoom.

### The limit, stated plainly

Conversion cannot change the drawing underneath. Side by side in
`lab/desert.html` the desert art is warmer and softer, the Cute Fantasy art
harder-edged and higher-contrast. As a **whole region** the desert reads fine and
internally coherent. **Intercut tile-by-tile with valley art it will not.** Keep
the two to their own chapters.

### Licence — unresolved

The pack ships `TXT/license.txt` containing one URL and nothing else:
`craftpix.net/file-licenses/`. CraftPix free assets may be used in games
including commercial ones; **redistributing the assets themselves is not
allowed**, and a website serves the sprite files directly. Same open question
HANDOFF §9.10 records for Pixel 16 and TopDownFantasy_Forest. Worth settling
before the site ships. The footer credit is in place either way.

## Map protection (added 2026-08-15)

The map has been lost twice, both times identically: the document in the page was
replaced by a fresh generate, and the next save wrote that generate over hours of
hand-editing. A one-deep backup does not survive it — the second save rolls the
bad state into the backup too.

- `/__save-valley` now **snapshots the file it is about to replace** into
  `.map-history/`, outside `public/` so snapshots never ship. Names carry
  milliseconds: a click plus the autosave inside one second was overwriting the
  earlier snapshot, which is the exact state the history exists to keep.
- A save that **drops object count by more than half is refused** with HTTP 409
  and nothing is written. The editor shows what it would have lost and accepts a
  repeat click within 30s as confirmation, so deliberate mass deletion is two
  clicks rather than a dead end.
- `PROTECTED-*.json` in `.map-history/` is never pruned.

## Growing the map (added 2026-08-15)

`44x140 -> 44x164`, twenty-four rows of desert inserted at row 137 — below both
Dhahran milestones, above the closing paved band.

**Changing `COLS`/`ROWS` alone cannot do this.** `migrateDoc` re-indexes terrain
on load and keeps every object at its own `(c,r)`, which grows the map at the
right edge and the bottom only. Space in the *middle* means everything below the
insertion point moves down with it — a change to the document, not to a constant.
`migrateDoc` also truncates when the numbers shrink, so a typo there deletes work
silently.

So it is `tools/grow-map.mjs`, which transforms the document explicitly and then
checks the result **against the original**, cell by cell and object by object,
before writing a byte. Any failure exits and writes nothing. The run that landed:
14,667 checks, 643 objects untouched, 2 rocks shifted by exactly 24, 0 decor
moved. The verifier was itself tested by sabotage — a single altered terrain
cell, a dropped object, and an off-by-one shift were each caught.

Dry run by default; `--write` applies and snapshots first.

    node tools/grow-map.mjs --at=137 --count=24 --template=136

`--template` is the row the new rows copy, so the ground and any road running
through it continue rather than restarting as grass.

### Two generator fixes this exposed

Neither affects a saved document; both affect **Regenerate**.

1. **`PATH` ended at row 138** — written when the map was 140 rows. A fresh
   generate would have left the new rows roadless. Extended to 162.
2. **A fresh generate recorded ZERO sand.** Step 2 floors each chapter by calling
   `tile(groundTile[region.ground], …)`, and for Dhahran that sheet is `beach` —
   but `DocScene.tile` only recorded `grass` and `bridge`. The desert DREW as
   sand and BAKED as grass, so a generate looked right on screen and came back
   green the moment it was reloaded from its own document. `DocScene.tile` now
   records `beach` and the three desert grounds. `earth` is deliberately still
   absent: it is the path sheet graded darker, has no terrain id, and recording
   it as PATH would turn two chapters into road.

The second one is why the sand in the current map is hand-painted — 1,396 cells
against 0 from the generator.

### Ground is painted, not placed (2026-08-15)

The seven desert grounds shipped first as placeable sprites. That was wrong, and
it showed: ninety-four `dsBg` and seven `dsSand2` went down as individual
objects — one click per 16px cell — before anyone said so. All seven are now
terrain brushes (ids 12–15 added alongside 7–9).

**The sprite entries were deliberately NOT removed.** `Scene.sprite` silently
returns when a name is missing from `SPRITES`, so deleting them would have made
those hundred-odd already-placed patches vanish without a word. They stay; the
palette group is relabelled to point at the brushes instead.

`FLAT_TERRAIN` also changed from a list to a map of `id -> sheet cell`, because
the two kinds of flat ground need different cells: `beach` is a 3×3 shoreline
sheet and must take its centre (1,1), while the desert grounds are single 16×16
images where (0,0) is the whole tile. `renderDoc` now reads that map instead of
testing ids one by one.

## The two real buildings (2026-08-15)

BIT Mesra and KFUPM, from the user's own artwork — the only assets here that are
not stand-ins for the places the map is about.

Same conversion as the desert pack, for a different reason. They *look* like
pixel art and are not: BIT Mesra is 2400×1792 with **79,965 distinct colours**,
KFUPM 3776×1120 with **46,547**, and a 1:1 crop shows a wall fading across a
gradient with no pixel grid anywhere. Colour-run length measured 1.26 and 1.28
against a valley band of 2.0–4.1.

One difference from the desert pack worth recording: **these have no drop
shadow.** Their semi-transparent alpha band has a mean luma of 74 and 85, which
is edge anti-aliasing; the desert pack's band measured 2–16, i.e. black. The
same `SHADOW_CUT` still does the right thing here — it hardens the anti-aliased
edge and trims to the content box, which is what pixel art wants — but the two
cases are not the same and the measurement is how you tell them apart.

| | source | output | tiles | colours | run length |
|---|---|---|---|---|---|
| `bitMesra` | 2280×1314 content | 256×148 | 16 × 9.3 | 20 | 2.03 |
| `kfupm` | 3776×1120 | 320×95 | 20 × 5.9 | 20 | 2.07 |

Both landed inside the valley band on the first pass, with no `flatten` — these
are architectural, and mullions, arcade columns and stair treads are one or two
pixels wide at these sizes, which a median filter eats.

KFUPM is deliberately the widest sprite on the map. The real campus reads as a
long low arcade; house-scaling it would lose the one silhouette that identifies
it.

`tools/desert-pixelate.py` now takes `--manifest=`, so the pipeline serves any
pack rather than only the desert one:

    python tools/desert-pixelate.py --manifest=tools/campus-pack.json --sheet --compare

They sit in their own palette group at the top of the editor, above Buildings.
No footer credit — they are the user's own work.

## Finalising the path (2026-08-15)

The map is hand-finished, so `valley.js`'s `PATH` polyline is now fiction — it
describes the road the *generator* drew, not the one that is painted. This
project already learned the lesson in the other direction, when seven buildings
ended up in the river because they were hand-placed against a computed sine
curve. The rule is symmetric: **whichever of the two is authored by hand is the
truth, and the other must be derived from it.** The terrain is now the truth.

### The road supports alternatives, measured

| | |
|---|---|
| walkable cells (path + bridge + desert paving) | 1,784 |
| connected components | **1** — one network, no islands |
| rows with 2+ separate runs (a genuine fork) | **67 of 164** |
| road width per row | min 3, median 7, max 44 |

`tools/derive-paths.mjs` finds routes by Dijkstra over those cells, 8-neighbour
so the walker runs diagonally instead of staircasing, with diagonals costing
√2 and forbidden unless both orthogonal neighbours are road — otherwise the
route squeezes through the corner between two buildings that do not connect.
Alternatives come from re-running with every cell of every earlier route made
expensive, then discarding anything overlapping an earlier route by more than
`--maxshare`. Distinct by construction, not by hope. On the current map,
top-to-bottom: 3 routes sharing 1% and 3%.

### Focal points are marked, not inferred

They used to be found by matching sprite name against an expected row. Editing
destroyed that completely:

| stop | what happened |
|---|---|
| `barch` | drifted 13 rows; two `instAcademic` on the map |
| `chadda` | **six** copies of `offManor2` — unresolvable |
| `metarch1` | drifted 10 rows |
| `jaiswal` | drifted **72 rows** — now decoration at row 10 |
| `kfupm` | `instResearch` **deleted from the map entirely** |

So the id lives in the document. The editor's inspector has a **Focal pt**
dropdown; the chosen id is stored as `stop` on the object, drawn on the overlay
in amber, and counted in the status bar. Assignment is **exclusive** — taking an
id removes it from whatever held it, because a stop id carries one job's dates
and role, and a duplicate would let the route derivation pick whichever it met
first. A mark is a fact; a guess about position is not.

### Legs, not one polyline

The runtime model the route file serves: the visitor steers their own way and
sees whichever focal point they reach, but a plain scroll auto-follows the
correct continuation from the last focal point. That cannot be one polyline with
a global distance, because the distance would mean different things on different
branches. So the file is a **chain of legs between fixed focal points, each leg
carrying its own alternatives**:

    { stops: [{id, anchor, cell}], legs: [{from, to, alts: [{id, length, points}]}] }

Scroll advances along the current leg's default alternative; steering at a fork
swaps which alternative of *that leg* is being walked. A focal point can never
be skipped or reordered, whatever the visitor does. Distinct journeys = the
product of the per-leg alternative counts.

Buildings stand beside the road, not on it, so each focal point snaps to the
nearest road cell within 12 tiles — that is what makes the route pass the door
rather than through the wall.

**The tool refuses to write while any of the seven is unmarked**, and exits 1. A
route file missing a stop is worse than no route file, because it looks complete.

### Routes are drawn, not searched (revised same day)

The Dijkstra version above was replaced within the hour. A searched route is only
ever the *cheapest* way across the road, and a journey through someone's career
is not a shortest-path problem — the interesting route is the one that goes past
the right things, and no cost function knows which those are.

So the editor gained a **Route** tool (key `4`):

- **Set start / Set end** — the journey's two endpoints, drawn as rings.
- **+ New route** — any number of named alternatives, each its own colour.
- Clicking the map appends a corner. **Backspace** removes the last one.
- Points are *corners*: the walk runs straight between them, so a curve needs a
  point at each bend, not at every tile.
- All routes draw dim, the one being edited draws bright with its points shown —
  you cannot place the next corner accurately without seeing the last.

`doc.routes`, `doc.start` and `doc.end` are part of the undo snapshot. Leaving
them out is not "no undo for routes", it is worse: undoing a building move would
roll routes back to whatever they were when that snapshot was taken.

One bug worth recording because the obvious code has it. The route click first
called `commit()` and *then* decided whether the click changed anything, so a
duplicate click pushed an identical snapshot and the next Undo appeared to do
nothing. Commit only when the click will actually change something.

### `tools/check-paths.mjs` — verify by machine

| check | why it exists |
|---|---|
| start / end set | without them there is no journey, only line segments |
| ≥ 2 points | one point is a dot |
| **every segment on road** | points are corners and the walk runs *straight* between them, so a segment can cross a river even when both endpoints are on road |
| begins at start, ends at end | every alternative is a whole journey, not a fragment |
| passes every focal point | the seven are constant across every route — the whole premise |
| **in chronological order** | a route may wander, but it may not deliver 2021 before 2018. The check that matters most, and the one no eye catches on a 164-row map |

Verified against a synthetic document with a deliberately reversed route: it
caught 252 off-road cells and reported
`kfupm -> metarch2 -> … -> barch` as out of order.

It refuses to write while any check fails, and exits 1.

`tools/derive-paths.mjs` is kept as a starting suggestion — run it to see one
plausible line, then trace your own over it.

## Wired into index.html (2026-08-15)

The Experience section now walks the **valley**, not the first map.

### The seam

`walk.js` used to read four things straight off module imports — `STOPS`,
`PATH_LENGTH`, `pointAt`, `regionAt` from `journey.js` — which tied it to one
map. There are now two, and they differ *only* in where the geometry comes from:
the camera, gait, card hysteresis and pinning are identical. So geometry became a
parameter rather than the walk being duplicated:

    initWalk(stage, { world })   // anything omitted falls back to the first map

`DEFAULT_WORLD` holds the original, so `lab/walk.html` and every existing caller
keep working untouched.

`src/modules/pixel/valleyjourney.js` is the valley's implementation of that
contract, and it reads **the document, not source**. `valley.js` still carries a
`PATH` array and a `row`/`side` per stop; both are stale — the road was
repainted, the map grew 24 rows, the buildings moved. The only current truth is
`valley-map.json`.

**Derived:** where the route goes, how long it is, where each focal point falls
along it, which chapter a row is in.
**Not derived:** the prose. Dates, role, employer and note stay in `valley.js`'s
STOPS and are joined on the `stop` id. Geometry changes on every edit; the CV
does not.

### Measured, against Route 1

| stop | tiles along | tiles from route | scroll px |
|---|---|---|---|
| barch | 24 | 2 | 480 |
| chadda | 90 | 2 | 2,160 |
| metarch1 | 116 | **7** | 3,040 |
| jaiswal | 131 | 2 | 3,700 |
| medicfibers | 184 | 2 | 5,120 |
| metarch2 | 248 | 4 | 6,760 |
| kfupm | 324 | 3 | 8,640 |

Scroll positions are monotonic and the pinned section is 9,420px.

**The single-card invariant now has room.** It requires stops more than
`2*EXIT_R` = 10 tiles apart; the tightest gap is **15**. On the first map it was
11 against a spec that assumed 17, which is why the radii had to be tightened to
3.5/5.0 in the first place.

### Two things that bit

- **The hero is not in the valley's sheet list.** It was written to draw a map;
  the walking figure belongs to the walk. Its eight sheets are pulled from the
  first map's list — one place still names those files — and merged *after*
  grading, ungraded. VALLEY_GRADE rotates greens to amber for the autumn; run
  over the hero it would tint his clothes to match the trees.
- **`buildRail` reads `s.anchor[1]`.** The adapter first named that field `cell`
  and the whole mount died with "cannot read properties of undefined". The
  adapter exists to satisfy the existing contract, not to rename it.

### Known limits

- **Route 2 is not used.** `check-paths` fails it: it misses `chadda` by 9.2
  tiles and `medicfibers` by 16.1, so a visitor taking it would never see two of
  the seven jobs. Route 1 is loaded; Route 2 needs those two detours drawn in.
- **Runtime route switching is not wired.** `setRoute()` re-measures correctly,
  but `initWalk` spreads `STOPS`/`PATH_LENGTH` once at init, so a swap needs a
  re-init. The visitor-steers-at-a-fork model needs this next.
- **`metarch1` sits 7 tiles off the route** where the others are 2–4. The card
  still fires, but he is further from that door than from any other.
- **14.6 MB of the 29 MB build is dev leftovers** — `final/_road_debug.png` and
  `final/base_map.png`, referenced only by `walkmap.js`, which nothing imports.
  Left alone because they belong to the other session's files.

---

## Session of 2026-08-15, in order

Everything below happened in one sitting, after the map was declared finished.

### 1. The framing

The stage was full bleed. A floating tab now sits over the artwork, and at full
width it covered map rather than margin. `.journey-bleed` pulls in to 35% of the
page padding, and past 1280px switches to a fixed `clamp(1rem, 3vw, 3.5rem)`
gutter. Measured 39px each side at 1200px.

### 2. The walker was off the road — and it was not the route

The complaint was that he did not walk down the middle. The obvious cause was
the route: it is drawn by clicking cells and the road is 3–7 cells wide, so the
line should hug whichever edge was clicked. A pass was written to resample every
half tile and slide each sample to the middle of the road.

**It was the wrong fix, and measuring said so before it shipped.** Against a
continuous edge-distance metric the hand-drawn route sits a median of **0.03
tiles** off centre — it was already centred. The pass moved the mean from 0.45
to 0.47 and the worst case from 1.80 to 2.12, and resampling ~350 tiles into
~700 points re-parameterised arc length, which is what made the scroll feel
wrong. Removed; a note stands where it was, because "centre the route on the
road" is an obvious idea that will occur to the next person too.

**The actual cause was a coordinate convention.** `journey.js` returns raw cell
indices and `walk.js` does the centring itself:

    feetX = p.x * TILE + TILE / 2      // middle of the cell
    feetY = p.y * TILE + TILE          // bottom of the cell

The adapter returned pre-centred points, so the half tile was applied twice and
he was drawn half a tile right and half a tile down. On a three-wide road that is
the verge. After the fix: **0 of 400 samples put his feet off the road**, median
0.43 tiles from centre.

A first metric said the centring pass made things worse when it had not — it
counted road cells in whole-tile steps from what were now fractional positions,
so the rounding biased it. Two rounds were spent tuning against that artefact
before it was replaced with continuous sub-tile stepping. **Check that a metric
survives the change it is measuring.**

### 3. Free roam — arrow keys and WASD

Two modes share one character:

| | |
|---|---|
| `route` | scroll drives distance along the drawn route. The default. |
| `free` | keys drive position directly, anywhere the road goes |

A key press enters free mode from wherever he stands, so there is no jump. A
**deliberate** scroll leaves it — thresholded at 60px from where free mode began,
because ScrollTrigger pushes a value every frame of a pin and reacting to any
change at all would drop the visitor out the instant they entered.

He cannot leave the road: `W.isRoad` is the same terrain test the editor brush
and the route checker use, so "walkable" means one thing project-wide. Movement
resolves per axis, so running into a wall at an angle slides along it instead of
stopping dead — without that, following a road round a corner needs two keys
pressed in exactly the right order.

Cards in free mode trigger on **proximity to the building**, not distance along a
route: he may be nowhere near the route when he reaches one.

Leaving free mode does not move the page from inside the walk. The scroller
belongs to ScrollTrigger and Lenis, so the walk reports which stop to resume
from and `experience.js` scrolls there through Lenis (§10). Free roam is offered
only when the world supplies `isRoad`, so the first map never turns it on.

### 4. The speech bubble

A comic bubble at his shoulder, **separate from the card** — the card is the
record and sits where a caption sits; this is one line he says on arriving. Both
appear together. A first attempt replaced the card with the bubble and was
rejected; the correction is that they are two things in two places.

`walk.js` publishes `--hero-x` / `--hero-y` in stage pixels each frame — he is
painted into a canvas and the bubble is a DOM element, so a shared coordinate is
the only way they can agree. Size, which side it opens on and edge clearance are
CSS, because those are layout.

Three faults found by checking rather than by looking:

- The properties were written **only while a bubble existed**, so a new bubble
  mounted at the previous stop's coordinates and slid across as the next frame
  corrected it.
- It sat **across his chest**; raised to clear his head (34px gap).
- It **tucked under the chapter rail** near the left edge; the left clamp now
  accounts for the rail's 170px.

Copy lives in a hidden `.tli__says` in the matching `li`, the way `.tli__note`
already does — one copy of every string in the DOM, crawlable, and translated for
free. A `bg.says.*` key with no dictionary entry leaves the English in place, so
the other six languages can follow later.

## State at the end of the session

| | |
|---|---|
| map | 44×164, 903 objects, 841 decor |
| routes | Route 1 (22 pts, 345 tiles), Route 2 (23 pts, 322 tiles) |
| focal points | all 7 marked |
| pinned scroll | ~9,450px, ZOOM 2, min stop gap 15 tiles against a 10-tile floor |
| build | passes |

### Still open

1. **Route 2 fails `check-paths`** — misses `chadda` by 9.2 tiles and
   `medicfibers` by 16.1. A visitor taking it would never see two of the seven
   jobs. Route 1 is the one loaded. Draw those two detours in and it is usable.
2. **Runtime route switching is not wired.** `setRoute()` re-measures correctly,
   but `initWalk` reads the stop table once at init, so a swap needs a re-init.
   This is the remaining piece of the steer-at-a-fork model.
3. **`end` is column 44 on a 44-column map** — a click one past the right edge.
   `alt-routes.mjs` clamps it when it runs; the document still holds 44.
4. **The bubble has not been watched during a real scroll.** Verification parked
   the walker at stops programmatically, so the transition *between* stops is
   unobserved.
5. **14.6 MB of a 29 MB build is dev leftovers** — `final/_road_debug.png` and
   `final/base_map.png`, referenced only by `walkmap.js`, which nothing imports.
   Left alone: they belong to the other session's files.
6. **CraftPix licence** — free assets may be used in games, but redistribution is
   not permitted and a website serves the sprite files directly. Same open
   question §9.10 records for Pixel 16.
