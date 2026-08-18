# Shibli Afaq — portfolio v2

_Last updated: 2026-08-18._

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

**Paint and hit-test disagree inside `preserve-3d`.** A real click on a card in
the 3D ring resolves its target to the ancestor section; `elementFromPoint` at
the same coordinates resolves correctly. `src/modules/book.js` depends on that
fallback — without it the books are unreachable by mouse. Note `.click()` works
either way, so this class of bug survives casual testing.

**Build image maps from measured pixel content, never from filenames.** The
Olaya before/after pair arrived twice with the meaning of "before" flipped.

---

## Asset pipeline

Originals are never committed. Conversion scripts live in the scratchpad and are
documented in CONTEXT.md.

Architecture pages ship in **two tiers** because the book zooms to 4×: a
half-spread is ~750 CSS px, so full zoom is a 3000px rendering.

- `p01.webp` — 1600px q84, the spread
- `p01-hi.webp` — 3000px q90, fetched only when the reader magnifies
- `p01-t.webp` — 320px q74, thumbnails

Quality is chosen by measurement, and the answer differs by content type: the
Earth photograph went flat above q78, while line art keeps paying back quality
through q94 because hard edges are the DCT's worst case. Never upscale a source.

---

## Content

Front-page copy lives in `docs/site-copy.md`, synced by
`tools/sync-site-copy.mjs`. Timeline and speech-bubble text have their own docs.
Several strings still have no translations (`projects.title`, `projects.lead`,
`atlas.lead`, `future.*`).
