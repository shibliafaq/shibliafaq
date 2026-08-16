/**
 * The scroll-driven walk.
 *
 * The character walks PATH as the page scrolls; a card appears when he arrives
 * at a stop and clears as he leaves. Not seven cards pinned to a map at once —
 * that is a labelled diagram, which is what the first version was and what the
 * user rejected.
 *
 * Spec: docs/pixel/walk-spec.json. Deviations from it, all deliberate:
 *
 *  1. Its measured numbers were taken against the OLD path (length 162, stops
 *     5..155). The current path is 155 with stops 25..150, and the tightest gap
 *     is 11 tiles, not 17. Its own invariant — stops must be at least 2*EXIT_R
 *     apart so two cards can never coexist — therefore fails at its suggested
 *     EXIT_R of 6. Radii are tightened to 3.5/5.0, which keeps the 1.5-tile
 *     hysteresis band and restores the invariant with a tile to spare. Asserted
 *     at init.
 *  2. ZOOM targets ~24 tiles tall, not its 15. At 15 the camera sits so close
 *     that the clusters, groves and barriers the whole composition is made of
 *     never fit on screen — you see one roof and a canopy.
 *  3. The card is a bottom-centre sheet at every width, not anchored beside the
 *     building above ~900px. The map is 34 tiles wide, so at ZOOM 2 it already
 *     fills 1088px of a desktop viewport — there is no gutter to put a card of
 *     four lines of prose in, and anchoring it would clamp against a stage edge
 *     on nearly every stop. The hero is parked at 0.42–0.58 of stage height, so
 *     a card at the bottom never covers him; he is standing at the door while it
 *     is up, which is what makes it read as arrival.
 *
 * ── TWO DRIVERS ──────────────────────────────────────────────────────────
 * `opts.external` picks how scroll reaches this module:
 *
 *   false (default) — the lab page. The stage is `position: sticky` and this
 *     module reads the scroller's own top and owns the scroller's height. Lets
 *     lab/walk.html verify the walk standalone with no site around it.
 *   true — index.html. ScrollTrigger owns the pin and the height, and pushes
 *     scroll in through `api.setScroll(px)`. Any jump must go through
 *     `lenis.scrollTo`; `window.scrollTo` desyncs Lenis (HANDOFF §10).
 */

import { reducedMotion } from '../scroll.js';
import { TILE as CF_TILE, loadAll } from './cutefantasy.js';
import { gradeSheets, SITE_GRADE } from './recolour.js';
import { buildScene as buildSceneDefault } from './worldmap.js';
import { STOPS as STOPS_DEFAULT, PATH_LENGTH as LEN_DEFAULT,
  pointAt as pointAtDefault, regionAt as regionAtDefault } from './journey.js';

/**
 * The first map, as a world.
 *
 * `initWalk` used to read these four things straight off the module imports,
 * which tied the walk to one map. There are now two — the original and the
 * valley — and they differ only in where the geometry comes from: the walk
 * itself, the camera, the gait, the card hysteresis and the pinning are
 * identical. So the geometry is a parameter and the walk is not duplicated.
 *
 * `opts.world` replaces this wholesale. Anything it omits falls back here, so
 * lab/walk.html and any existing caller keep working untouched.
 */
const DEFAULT_WORLD = {
  TILE: CF_TILE,
  buildScene: buildSceneDefault,
  loadSheets: () => loadAll().then((raw) => gradeSheets(raw, SITE_GRADE)),
  get STOPS() { return STOPS_DEFAULT; },
  get PATH_LENGTH() { return LEN_DEFAULT; },
  pointAt: pointAtDefault,
  regionAt: regionAtDefault,
};

/* ---- the hero sheet ----------------------------------------------------
   FREE_Adventurer: 8 frames at a 96x80 pitch, one sheet per direction. All
   four numbers below were measured off the sheet with tools/index-atlas.mjs,
   not eyeballed — the drawn figure is 34px tall, standing centred at x=48
   with his feet at y=58 inside the frame. */
const HERO_W = 96, HERO_H = 80, HERO_CX = 48, HERO_FY = 58, FRAMES = 8;

/* ---- tunables ---------------------------------------------------------- */
const STRIDE  = 0.22;  // tiles of travel per frame — 8 frames ≈ 1.8 tiles a cycle
const ENTER_R = 3.5;   // mount a card within this many tiles of a stop
const EXIT_R  = 5.0;   // unmount past this — the gap is the hysteresis band
const MIN_SHOW_MS = 450;
/* Columns of the world that must stay on screen whatever the zoom rules want.
   The valley is 44 wide; 20 is a shade under half, enough to see the road
   ahead and the buildings it is heading for. */
const MIN_COLS = 20;
const LEAD_DOWN = 0.42; // player parked here vertically when walking down
const LEAD_UP   = 0.58;
const TAU = 0.35;       // seconds, camera lead damping
const DEAD_X = 0.18;    // player may drift this fraction of the stage before camX moves
const TAU_X = 0.25;     // seconds, horizontal camera damping
const FLING = 10;       // tiles in one frame past which no card mounts
/* Usable top of the stage, in px. The fixed nav covers the first 74, and below
   700px the chapter rail sits at 78 and is 46 tall — so nothing may be placed
   above 124 without landing on one or the other. A bubble that opens upward
   from a character standing high on screen would otherwise be clipped by the
   stage edge, which is the "not fully visible" case. */
const SAFE_TOP = 132;

/** Trapezoid speed profile integrated to a CDF, so he decelerates into a stop
    and accelerates out. A single smootherstep over a whole ramp makes him
    visibly sprint through the middle of the long stretches. */
function makeCdf(k, steps = 24) {
  const ss = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
  const v = [];
  let sum = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = ss(t / k) * ss((1 - t) / k);
    v.push(s); sum += s;
  }
  const cdf = [0];
  let acc = 0;
  for (let i = 1; i <= steps; i++) { acc += (v[i] + v[i - 1]) / 2; cdf.push(acc); }
  const total = cdf[cdf.length - 1] || 1;
  return cdf.map((c) => c / total);
}

function sampleCdf(cdf, u) {
  const n = cdf.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, u * n));
  const i = Math.floor(x);
  return cdf[i] + (cdf[i + 1] - cdf[i]) * (x - i);
}

/** The lab card. index.html passes its own renderer so the copy has one source
    in the DOM and the i18n engine translates it for free. */
function defaultCard(stop) {
  const el = document.createElement('div');
  el.className = 'walkcard';
  el.innerHTML =
    `<em>${stop.period}</em><b>${stop.role}</b><span>${stop.org}</span><p>${stop.note}</p>`;
  return el;
}

export function initWalk(stage, opts = {}) {
  const canvas = stage.querySelector('canvas');
  const cardHost = stage.querySelector('[data-cards]') || stage;
  const ctx = canvas.getContext('2d');

  const external = !!opts.external;
  const renderCard = opts.renderCard || defaultCard;
  const renderBubble = opts.renderBubble || null;

  const W = { ...DEFAULT_WORLD, ...(opts.world || {}) };
  const TILE = W.TILE;
  const STOPS = W.STOPS;
  const PATH_LENGTH = W.PATH_LENGTH;
  const pointAt = W.pointAt;
  const regionAt = W.regionAt;

  // The invariant the whole single-card design rests on.
  const gaps = STOPS.slice(1).map((s, i) => s.at - STOPS[i].at);
  const minGap = Math.min(...gaps);
  if (minGap <= 2 * EXIT_R) {
    console.warn(`[walk] stops ${minGap.toFixed(1)} tiles apart but 2*EXIT_R is ${2 * EXIT_R} — two cards could overlap`);
  }

  const { scene, cols, rows } = W.buildScene();
  const mapW = cols * TILE, mapH = rows * TILE;

  /* ---- offscreen: render the world once at 1x, blit a viewport per frame --- */
  const world = document.createElement('canvas');
  world.width = mapW; world.height = mapH;
  const wctx = world.getContext('2d');
  wctx.imageSmoothingEnabled = false;

  /* ---- scroll ramps: travel, then a dwell at each stop ------------------- */
  let ramps = [], total = 0, ZOOM = 3, stageH = 0, stageW = 0;
  /* Where the camera parks him vertically. Viewport-dependent, because the
     arrival card is a bottom sheet and on a phone it is ~34vh of the screen:
     measured on 375x812, LEAD_UP 0.58 puts his feet at y=471 against a card
     top of y=392, so the card covers him from the knees up and it looks like
     he never arrived. Tightened on a narrow stage to keep 50px of daylight
     between his feet and the card in both directions. */
  let leadDown = LEAD_DOWN, leadUp = LEAD_UP;

  function buildRamps() {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    // Two constraints; the looser one wins. Vertically we want ~24 tiles on
    // screen, not the spec's 15 (see the header). Horizontally the world is only
    // 34 tiles wide, so height alone picks ZOOM 2 on a 1440x900 stage and the
    // map then covers 1088px — measured 176px of dead ink down each side. Bump
    // the zoom until it covers the width, but cap that bump at 3: ceil(1920/544)
    // is 4, and ZOOM 4 on a 900px stage shows 14 rows, which is the framing the
    // spec was rejected for.
    const fitH = Math.max(2, Math.min(4, Math.round(stageH / (TILE * 24))));
    const fitW = Math.min(3, Math.ceil(stageW / mapW));

    /* A third constraint, and on a phone the binding one: never stand so close
       that the reader cannot see where he is going.

       Both rules above are about filling the stage, and on a wide screen that
       is the whole story — at 1280px ZOOM 2 already shows forty of the world's
       forty-four columns. On a 375px phone the same zoom shows TWELVE, which
       is one house and one tree with the road running off the edge. It reads
       as a close-up, not a map.

       So the zoom is also capped by how much world has to stay on screen.
       MIN_COLS is horizontal on purpose: a portrait phone is starved of width
       and has height to spare, so width is what actually runs out. */
    const context = Math.max(1, Math.floor(stageW / (TILE * MIN_COLS)));
    ZOOM = Math.min(Math.max(2, Math.min(4, Math.max(fitH, fitW))), context);

    // Matches the 700px breakpoint the card's own media query uses. Keeping the
    // two in step is the whole point — the lead exists to clear that card.
    const narrow = stageW < 700;
    leadDown = narrow ? 0.32 : LEAD_DOWN;
    leadUp = narrow ? 0.42 : LEAD_UP;

    // Scroll length is tied to the HEIGHT-driven zoom, never to the final one.
    // The width bump above is a framing decision, and letting it stretch the
    // section as well costs ~1550px of extra scroll (measured: 5620 -> 7170 on a
    // 1440x900 stage) for a change that has nothing to do with pacing. What sets
    // the gait rate is tiles per scroll pixel, so holding this fixed keeps the
    // walk cycle exactly as tuned — and the stride stays right at any zoom
    // because stride and body scale together.
    const pxPerTile = 10 * fitH;
    const DWELL = 0.40 * stageH;
    const EASE = 0.18 * stageH;

    // Sized here rather than per frame: assigning canvas.width reallocates the
    // backing store and resets every context flag, which is not something to do
    // sixty times a second.
    //
    // Deliberately dpr 1. The art is nearest-neighbour upscaled by an integer
    // ZOOM, and `image-rendering: pixelated` makes the browser's own canvas->
    // screen step nearest-neighbour too, so on a 2x display one source texel
    // still lands on exactly 2*ZOOM aligned device pixels. Rendering at dpr 2
    // would quadruple the per-frame fill for a pixel-identical result.
    if (canvas.width !== stageW || canvas.height !== stageH) {
      canvas.width = stageW;
      canvas.height = stageH;
      ctx.imageSmoothingEnabled = false;
      /* Assigning width or height WIPES the backing store, and this runs from
         ScrollTrigger's onRefreshInit — which fires when the pin engages and
         again when it releases, i.e. exactly at the start and the end of the
         walk. ScrollTrigger.refresh() is synchronous and re-measures every
         trigger on the page, so the blank canvas can be on screen for several
         frames before the next rAF repaints it. That reads as the map
         reloading each time he sets off or arrives.

         Repainting here closes the gap: the pixels are back before the browser
         gets a chance to composite the empty canvas. The hero is redrawn by
         the next frame a few milliseconds later; the ground never blinks. */
      if (world && lastCam) blitWorld(lastCam.ox, lastCam.oy, lastCam.Z);
    }
    ctx.imageSmoothingEnabled = false;

    ramps = [];
    let d0 = 0, px = 0;
    const travel = (d1) => {
      const len = Math.max(1, Math.abs(d1 - d0) * pxPerTile);
      const k = Math.min(0.5, Math.max(0.06, EASE / (2 * len)));
      ramps.push({ kind: 'travel', px0: px, pxLen: len, d0, d1, cdf: makeCdf(k) });
      px += len; d0 = d1;
    };
    for (const s of STOPS) {
      travel(s.at);
      // A dwell consumes scroll but no distance: he stands still, the card is
      // readable, and the walk cycle freezes on its own because the frame index
      // is a function of distance.
      ramps.push({ kind: 'dwell', px0: px, pxLen: DWELL, d0, d1: d0 });
      px += DWELL;
    }
    travel(PATH_LENGTH);
    total = px;
    return total;
  }

  function distanceAt(px) {
    const p = Math.min(total, Math.max(0, px));
    let lo = 0, hi = ramps.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ramps[m].px0 <= p) lo = m; else hi = m - 1; }
    const r = ramps[lo];
    if (r.kind === 'dwell') return { d: r.d0, still: true };
    const u = Math.min(1, (p - r.px0) / r.pxLen);
    return { d: r.d0 + (r.d1 - r.d0) * sampleCdf(r.cdf, u), still: false };
  }

  /** Scroll px at which a stop's dwell begins — what a jump affordance targets. */
  function scrollAtStop(stop) {
    const r = ramps.find((x) => x.kind === 'dwell' && x.d0 === stop.at);
    return r ? r.px0 : 0;
  }

  /* ---- props that may occlude the player -------------------------------- */
  // Only ops near the path can ever overlap him, so the per-frame re-draw is a
  // handful of calls rather than the whole prop layer.
  const tall = scene.ordered().filter((op) => op.layer === 1 && op.sh > TILE);

  /* ---- state ------------------------------------------------------------ */
  let sheets = null, leadY = LEAD_DOWN, lastT = 0, lastD = 0;
  let card = null, cardStop = null, cardAt = 0;
  let bubble = null;   // the comic bubble at his shoulder, if the caller wants one
  let camX = null, region = null;
  let scrollPx = 0, active = true, raf = 0;

  /** Last camera the frame loop used, so a resize can repaint without waiting
      for the next rAF. */
  let lastCam = null;

  /** Blit the visible window of the world, and only that.
      This used to pass the entire map as the source rect — 704x2624 scaled to
      1408x5248 — and leave the clipping to the browser. Measured against a
      375x812 phone stage that is 24x more source pixels than are on screen,
      about 0.44 Gpx/s of nearest-neighbour blit at 60fps. A desktop GPU absorbs
      it; a phone drops to a crawl, and a canvas cleared every frame and
      repainted once a second reads as a black stage with a character who will
      not move.

      Integer arithmetic throughout: sx0/sy0 floor to whole SOURCE texels and
      the destination is offset by `sx0 * Z - ox`, which stays integer because
      ox, oy and Z all are. Rounding the source instead would make the tilemap
      shimmer as it scrolls. */
  function blitWorld(ox, oy, Z) {
    const sx0 = Math.max(0, Math.floor(ox / Z));
    const sy0 = Math.max(0, Math.floor(oy / Z));
    const sx1 = Math.min(mapW, Math.ceil((ox + stageW) / Z));
    const sy1 = Math.min(mapH, Math.ceil((oy + stageH) / Z));
    const sw = sx1 - sx0, sh = sy1 - sy0;
    if (sw > 0 && sh > 0) {
      ctx.drawImage(world, sx0, sy0, sw, sh,
        sx0 * Z - ox, sy0 * Z - oy, sw * Z, sh * Z);
    }
  }

  function paintWorld() {
    wctx.clearRect(0, 0, mapW, mapH);
    scene.render(wctx, sheets);
  }

  /* ---- the card --------------------------------------------------------- */
  const retire = (el) => {
    el.classList.remove('is-in');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    // Belt and braces: a card mounted in a background tab never gets a
    // transitionend, and would otherwise sit in the DOM at opacity 0 forever.
    setTimeout(() => el.remove(), 600);
  };

  function showCard(stop) {
    if (cardStop === stop) return;
    if (card) {
      // Never crossfade two cards; if one is still inside MIN_SHOW, drop it.
      if (performance.now() - cardAt < MIN_SHOW_MS) card.remove();
      else retire(card);
    }
    // Capture the element locally: the rAF must reveal the card it was queued
    // for, not whatever `card` happens to point at a frame later.
    const el = renderCard(stop);
    cardHost.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    card = el;
    cardStop = stop;
    cardAt = performance.now();

    /* The speech bubble is its own element, beside HIM, and separate from the
       card in every way that matters: the card is the record — dates, role,
       employer — and sits where a caption sits, while this is one line he says
       on arriving, and belongs at his shoulder. Two things, two places. It is
       optional, so a caller that supplies no `renderBubble` gets the walk
       exactly as it was. */
    if (renderBubble) {
      bubble?.remove();
      const b = renderBubble(stop);
      if (b) {
        cardHost.appendChild(b);
        requestAnimationFrame(() => b.classList.add('is-in'));
        bubble = b;
      }
    }
    opts.onStop?.(stop);
  }

  function hideCard(hard = false) {
    if (!card) return;
    if (!hard && performance.now() - cardAt < MIN_SHOW_MS) return; // let it be readable
    if (hard) card.remove(); else retire(card);
    card = null; cardStop = null;
    if (bubble) { if (hard) bubble.remove(); else retire(bubble); bubble = null; }
    opts.onStop?.(null);
  }

  /* ============================================================ FREE ROAM
     Arrow keys / WASD, so the map can be explored instead of only witnessed.

     Two modes share one character:

       route  scroll drives distance along the drawn route. The default, and
              what a visitor who never touches a key experiences.
       free   the keys drive position directly, anywhere the road goes — every
              branch, spur and dead end that the route does not use.

     A key press enters free mode from wherever he currently stands, so there is
     no jump. A deliberate scroll leaves it, and rather than teleporting him back
     to the route the caller is told which stop to resume from — index.html then
     scrolls there through Lenis, which keeps ScrollTrigger and the walk in
     agreement instead of desyncing them (§10).

     HE CANNOT LEAVE THE ROAD. `W.isRoad` is the same terrain test the editor's
     brush and the route checker use, so "walkable" means one thing across the
     whole project. Movement is resolved per axis so that running into a wall at
     an angle slides along it rather than stopping dead — without that, following
     a road round a corner needs the two keys pressed in exactly the right order.

     Free roam is only offered when the world supplies `isRoad`. The first map
     has no terrain grid, so there it simply never turns on. */
  /* Speed, and the stride that has to match it.
     STRIDE above is tuned for the SCROLL walk, where the tiles-per-second is
     whatever the reader's wheel produces — usually slow. Free roam moves at a
     fixed, much higher speed, and reusing that stride would run the animation at
     FREE_SPEED / 0.22 = fifty frames a second: a blur, which reads as sliding
     just as much as a frozen frame does.
     So free roam gets its own stride, and it is expressed as a LENGTH rather
     than a frame rate: half a tile of ground per animation frame. That is what
     stops the feet skating — the cycle advances because he covered distance, not
     because time passed, so however the speed is retuned the legs keep up with
     the floor. The drawn figure is about two tiles tall, so an eight-frame cycle
     covering four tiles is two strides of roughly his own height. */
  const FREE_SPEED = 11;         // tiles per second — was 7, too slow to explore with
  const FREE_STRIDE = 0.5;       // tiles of ground per animation frame
  const FREE_ENTER_R = 4.5;      // a card mounts within this in free mode...
  const FREE_EXIT_R = 6.5;       // ...and clears past this
  const SCROLL_EXIT = 60;        // px of deliberate scroll that ends free mode

  const canRoam = typeof W.isRoad === 'function';
  const keys = new Set();
  /** Analog stick vector, magnitude 0..1. `on` is held-down, not non-zero:
      releasing at full lean must stop him, not coast. */
  const stick = { x: 0, y: 0, on: false };
  const free = { x: 0, y: 0, dir: 'down', moving: false, dist: 0 };
  let mode = 'route';
  let freeScrollAnchor = 0;
  let lastReached = null;        // the stop to resume the route from

  const KEYMAP = {
    arrowup: 'up', keyw: 'up', arrowdown: 'down', keys: 'down',
    arrowleft: 'left', keya: 'left', arrowright: 'right', keyd: 'right',
  };

  function enterFree() {
    if (!canRoam || mode === 'free') return;
    mode = 'free';
    freeScrollAnchor = scrollPx;
    stage.classList.add('is-roaming');
    opts.onMode?.('free');
  }

  function exitFree() {
    if (mode !== 'free') return;
    mode = 'route';
    keys.clear();
    stage.classList.remove('is-roaming');
    opts.onMode?.('route');
    // "Follow the correct route from the last focal point" — the caller owns
    // the scroller, so it is told where to go rather than being moved from here.
    opts.onResume?.(lastReached);
  }

  function onKey(e) {
    if (!canRoam || !active) return;
    const k = KEYMAP[e.code?.toLowerCase()] || KEYMAP[e.key?.toLowerCase()];
    if (!k) return;
    // Do not steal keys from anything the visitor is typing into.
    const el = document.activeElement;
    if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
    if (e.type === 'keydown') {
      keys.add(k);
      enterFree();
      e.preventDefault();       // arrows must not also scroll the page
    } else {
      keys.delete(k);
    }
  }

  /* ---- the on-screen stick ------------------------------------------------
     Touch only. There is no keyboard on a phone, so without this free roam
     simply does not exist there — the map would be a thing you scroll past
     rather than a thing you walk.

     Gated on `(pointer: coarse)`, not on width: a narrow desktop window has a
     mouse and a keyboard and wants neither a stick nor the 44px touch targets,
     while a large tablet has no keyboard and needs both. Width is the wrong
     question to ask about input.                                            */
  let stickEl = null, stickPointer = null;

  function buildStick() {
    if (stickEl) return;
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;

    stickEl = document.createElement('div');
    stickEl.className = 'journeystick';
    /* Lenis must keep its hands off this element.
       `syncTouch: true` is what makes the pinned section work on a phone at all
       — without it Lenis never emits a scroll event for touch and every
       ScrollTrigger freezes at progress 0. The cost is that Lenis then
       intercepts touchmove document-wide, and a drag that starts on the stick
       is swallowed as scroll input before the stick's own pointermove sees it.
       `touch-action: none` stops the BROWSER scrolling; it does nothing about a
       library listening on document. This attribute is Lenis's own opt-out, and
       `#modalInner` already relies on it for the same reason. */
    stickEl.setAttribute('data-lenis-prevent', '');
    stickEl.setAttribute('aria-hidden', 'true');   // the timeline is the accessible path
    stickEl.innerHTML = '<span class="journeystick__thumb"></span>';
    stage.appendChild(stickEl);
    const thumb = stickEl.firstElementChild;

    // Radius comes from the rendered element, so CSS stays the single source of
    // the stick's size — a hardcoded radius here would silently disagree with a
    // media query there.
    const radius = () => stickEl.getBoundingClientRect().width / 2;

    const move = (e) => {
      if (stickPointer !== e.pointerId) return;
      const b = stickEl.getBoundingClientRect();
      let dx = e.clientX - (b.left + b.width / 2);
      let dy = e.clientY - (b.top + b.height / 2);
      const r = radius();
      const d = Math.hypot(dx, dy) || 1;
      // Past the rim the stick pegs at full lean rather than reaching further,
      // so a finger that slides off the control keeps walking in that direction.
      const clamped = Math.min(d, r);
      const nx = (dx / d) * (clamped / r);
      const ny = (dy / d) * (clamped / r);
      // Deadzone: a thumb resting on the centre must not creep.
      const mag = Math.hypot(nx, ny);
      stick.x = mag < 0.18 ? 0 : nx;
      stick.y = mag < 0.18 ? 0 : ny;
      thumb.style.transform = `translate(${(dx / d) * clamped}px, ${(dy / d) * clamped}px)`;
      e.preventDefault();
    };

    const end = (e) => {
      if (stickPointer !== e.pointerId) return;
      stickPointer = null;
      stick.on = false; stick.x = 0; stick.y = 0;
      thumb.style.transform = '';
      stickEl.classList.remove('is-held');
    };

    stickEl.addEventListener('pointerdown', (e) => {
      if (!active) return;
      stickPointer = e.pointerId;
      stickEl.setPointerCapture(e.pointerId);
      stickEl.classList.add('is-held');
      stick.on = true;
      enterFree();
      move(e);
    });
    stickEl.addEventListener('pointermove', move);
    stickEl.addEventListener('pointerup', end);
    stickEl.addEventListener('pointercancel', end);
  }

  /** One frame of free movement, resolved per axis so walls are slid along. */
  function stepFree(dt) {
    // The stick wins when it is being held. It is analog — a small lean walks
    // slowly — where the keys are always full speed, so normalising the two
    // into one path would throw away the only thing the stick does better.
    let dx, dy;
    if (stick.on) {
      dx = stick.x; dy = stick.y;
      free.moving = !!(dx || dy);
      if (!free.moving) return;
    } else {
      dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
      free.moving = !!(dx || dy);
      if (!free.moving) return;
      if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; } // no diagonal bonus
    }

    const step = FREE_SPEED * dt;
    const nx = free.x + dx * step;
    const ny = free.y + dy * step;
    const wasX = free.x, wasY = free.y;
    if (dx && W.isRoad(Math.floor(nx), Math.floor(free.y))) free.x = nx;
    if (dy && W.isRoad(Math.floor(free.x), Math.floor(ny))) free.y = ny;
    // Distance he ACTUALLY covered, not what was asked for — walking into a wall
    // must not keep the legs cycling on the spot.
    free.dist += Math.hypot(free.x - wasX, free.y - wasY);

    free.dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up')
                                            : (dx > 0 ? 'right' : 'left');
  }

  /** In free mode a card is proximity to a BUILDING, not distance along a route
      — he may be nowhere near the route when he reaches one. */
  function freeCards() {
    let near = null, bd = Infinity;
    for (const s of STOPS) {
      const q = Math.hypot(free.x - s.anchor[0], free.y - s.anchor[1]);
      if (q < bd) { bd = q; near = s; }
    }
    if (near && bd < FREE_ENTER_R) {
      lastReached = near;
      if (cardStop !== near) showCard(near);
    } else if (cardStop && bd > FREE_EXIT_R) {
      hideCard();
    }
  }

  /* ---- frame ------------------------------------------------------------ */
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!sheets || !active || document.hidden) { lastT = t; return; }
    const dt = Math.min(0.1, (t - lastT) / 1000 || 0.016);
    lastT = t;

    if (!external) {
      // Measure against the SCROLLER, not the stage: the stage is sticky, so its
      // own top pins at 0 and never goes negative — reading it gives a distance
      // that is permanently zero.
      const top = (stage.parentElement || stage).getBoundingClientRect().top;
      scrollPx = -top + (opts.offset || 0);
    }
    const { d, still } = distanceAt(Math.min(total, Math.max(0, scrollPx)));
    const dd = d - lastD;          // used by the fling guard below

    let p, dir, moving;
    if (mode === 'free') {
      stepFree(dt);
      p = { x: free.x, y: free.y };
      dir = free.dir;
      moving = free.moving;
    } else {
      p = pointAt(d);
      // Direction from a chord, not pointAt().dir — that flips exactly at a
      // vertex and jitters when the distance sits on one.
      const a = pointAt(Math.max(0, d - 0.4)), b = pointAt(Math.min(PATH_LENGTH, d + 0.4));
      const dx = b.x - a.x, dy = b.y - a.y;
      const back = (d - lastD) < -1e-4;
      dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
      if (back) dir = { down: 'up', up: 'down', left: 'right', right: 'left' }[dir];
      moving = !still;
      free.x = p.x; free.y = p.y; free.dir = dir;   // keep the free cursor in sync
    }
    const feetX = p.x * TILE + TILE / 2;
    const feetY = p.y * TILE + TILE;

    const Z = ZOOM;
    const targetLead = dir === 'down' ? leadDown : dir === 'up' ? leadUp : (leadDown + leadUp) / 2;
    // Freeze the lead while a card is up, or a corner yanks the view mid-read.
    // Easing the camera is a second motion layered on his: it keeps drifting
    // after he stops. Snap to the target instead when motion is reduced.
    if (!cardStop) leadY = reducedMotion ? targetLead
      : leadY + (targetLead - leadY) * (1 - Math.exp(-dt / TAU));

    // Horizontal: a dead zone, not a hard follow. The path swings between col 6
    // and col 24, so following his x directly makes every corner a full lateral
    // pan — the section becomes unpleasant to look at.
    if (mapW * Z <= stageW) {
      camX = -(stageW - mapW * Z) / 2;
    } else {
      const lim = mapW * Z - stageW;
      const dz = stageW * DEAD_X;
      const clampX = (v) => Math.min(lim, Math.max(0, v));
      if (camX === null || camX < 0) camX = clampX(feetX * Z - stageW / 2);
      const sx = feetX * Z - camX;
      const want = sx < stageW / 2 - dz ? feetX * Z - (stageW / 2 - dz)
        : sx > stageW / 2 + dz ? feetX * Z - (stageW / 2 + dz) : camX;
      camX = reducedMotion ? clampX(want)
        : clampX(camX + (want - camX) * (1 - Math.exp(-dt / TAU_X)));
    }
    // The distance -> position mapping is never damped: damping it would let the
    // card and the character disagree about where he is during a fast scroll.
    const camY = Math.min(mapH * Z - stageH, Math.max(0, feetY * Z - stageH * leadY));
    const ox = Math.round(camX), oy = Math.round(camY);

    ctx.clearRect(0, 0, stageW, stageH);
    blitWorld(ox, oy, Z);
    lastCam = { ox, oy, Z };

    // The hero. One sheet per direction — no mirroring, so his gear stays on the
    // correct side. Eight frames at a 96x80 pitch; within a frame he stands
    // centred at x=48 with his feet at y=58, measured off the sheet.
    const cap = dir[0].toUpperCase() + dir.slice(1);
    const img = sheets[(moving ? 'heroRun' : 'heroIdle') + cap] || sheets.heroIdleDown;
    /* The gait is a pure function of DISTANCE TRAVELLED, so the feet match the
       ground at any speed. Which distance depends on who is driving: scroll
       advances `d` along the route, keys advance `free.dist`. Reading `d` in
       free mode was the bug that made him slide — scroll is not moving, so the
       frame never changed and he held one pose across the whole map. */
    const gait = mode === 'free' ? free.dist / FREE_STRIDE : d / STRIDE;
    const col = !moving
      // Standing still means STILL under reduced motion. The idle cycle is a
      // loop that runs forever with no input behind it — exactly the kind of
      // ambient movement the preference is asking to stop.
      ? (reducedMotion ? 0 : Math.floor(t / 160) % FRAMES)  // idle is time-driven
      : ((Math.floor(gait) % FRAMES) + FRAMES) % FRAMES;

    const dxp = Math.round(feetX * Z - HERO_CX * Z - ox);
    const dyp = Math.round(feetY * Z - HERO_FY * Z - oy);

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(Math.round(feetX * Z - ox), Math.round(feetY * Z - oy) - 2 * Z, 7 * Z, 3 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (img) ctx.drawImage(img, col * HERO_W, 0, HERO_W, HERO_H, dxp, dyp, HERO_W * Z, HERO_H * Z);

    /* Where he is on screen, in stage pixels, published for the speech bubble.
       The bubble is a DOM element and the character is painted into a canvas, so
       this is the only way the two can be made to agree. Custom properties
       rather than direct positioning: the bubble's size, which side it opens on
       and how it keeps clear of the stage edge are layout, and layout belongs in
       CSS. Setting a property writes and never reads, so it cannot force a
       reflow even at sixty frames a second. */
    // Written every frame, not only while a bubble is up. Gating it on the
    // bubble leaves the properties holding the PREVIOUS stop's position at the
    // moment a new bubble mounts, so it appears at the last building and then
    // slides across to this one as the next frame corrects it.
    stage.style.setProperty('--hero-x', `${Math.round(feetX * Z - ox)}px`);
    stage.style.setProperty('--hero-y', `${Math.round(feetY * Z - oy)}px`);

    /* How tall he is DRAWN, in stage pixels. The bubble has to clear his head,
       and the CSS was doing that with a fixed 5.75rem — a number derived for
       ZOOM 2, written in the comment as "at ZOOM 2 he occupies roughly 68px".
       Phones now run at ZOOM 1, where he is half that, so the bubble floated a
       visible gap above him. Publishing the real height lets the CSS clear his
       head at any zoom instead of one. 34 is the drawn figure inside the 80px
       frame, measured off the sheet (see the HERO_* note at the top). */
    stage.style.setProperty('--hero-h', `${34 * Z}px`);

    /* WHERE THE BUBBLE GOES. Everything else about it is layout and lives in
       CSS, but this is arithmetic over four boxes CSS cannot compare: his
       position, the bubble's rendered height, the stage, and the arrival card.

       Three things have to hold at once, and the first version only handled
       one of them:

       1. Clear his head — at the CURRENT zoom, hence `--hero-h`.
       2. Stay off the nav and the chapter rail (`SAFE_TOP`). At the top of the
          map the camera clamps and he stands high, and the bubble opened
          straight up through both with its top cut off.
       3. Stay off the arrival card. At the LAST stop the camera clamps at the
          bottom of the map, so he stands low — right where the card is.

       The bubble stays ON HIS HEAD and THE CARD MOVES. An earlier version did
       the opposite, sliding the bubble up until it cleared the card, and the
       measurement showed why that is wrong: at `kfupm` on a 1280x900 stage his
       head is at y=800 and the bubble ended up at 473-533 — a 267px gap. A
       bubble that far from the speaker is not speech, it is a caption. The card
       is a floating sheet with nothing anchoring it, so it is the thing that
       can afford to move. */
    if (bubble) {
      const h = bubble.offsetHeight;
      const heroTop = (feetY * Z - oy) - 34 * Z;
      let y = heroTop - 8;                       // desired BOTTOM edge of the bubble

      const below = y - h < SAFE_TOP;
      if (below) y = (feetY * Z - oy) + 8;       // no room above: hang under him
      bubble.classList.toggle('is-below', below);
      stage.style.setProperty('--say-y', `${Math.round(y)}px`);

      /* Horizontal: centred on him, but kept off the joystick.
         On a phone at the last stop he stands low and the stick is bottom
         right, and the two collided — measured, bubble x 43-299 against a stick
         at 214-334. Shifting sideways alone cannot fix it: the bubble is 256px
         wide and only 214px of stage remain to the left of the stick, so the
         clamp also narrows it via `--say-max-w`. Only while their vertical
         bands actually overlap, so a bubble higher up keeps its full width and
         stays centred on him. */
      const w = bubble.offsetWidth;
      const half = w / 2;
      let x = feetX * Z - ox;
      let maxW = stageW;
      if (stickEl) {
        const sr = stickEl.getBoundingClientRect(), st2 = stage.getBoundingClientRect();
        const sTopY = sr.top - st2.top, sBotY = sr.bottom - st2.top;
        const bTop = below ? y : y - h, bBot = below ? y + h : y;
        if (!(bBot < sTopY || bTop > sBotY)) {
          const room = (sr.left - st2.left) - 12;   // usable stage left of the stick
          maxW = Math.max(120, room - 12);
          x = Math.min(x, room - Math.min(half, maxW / 2));
        }
      }
      x = Math.max(Math.min(half, maxW / 2) + 8, Math.min(x, stageW - 8 - Math.min(half, maxW / 2)));
      stage.style.setProperty('--say-x', `${Math.round(x)}px`);
      stage.style.setProperty('--say-max-w', `${Math.round(maxW)}px`);

      /* Lift the card clear of wherever the bubble ended up. Measured against
         the card's UNLIFTED position — its own rect plus the lift already
         applied — or each frame would read the position it just set and creep
         upward until the card left the stage. */
      const card = cardHost.querySelector('.journeycard');
      if (card) {
        const sTop = stage.getBoundingClientRect().top;
        const now = parseFloat(stage.style.getPropertyValue('--card-lift')) || 0;
        const r = card.getBoundingClientRect();
        // Where the card would sit with no lift at all.
        const restTop = r.top - sTop + now, restBottom = r.bottom - sTop + now;
        const bubTop = below ? y : y - h;
        const bubBottom = below ? y + h : y;

        /* ONLY when they would actually collide. Lifting unconditionally put
           the card above the bubble at every stop — measured 567-601px of lift,
           which pushed it clean off the top of the stage. At six of the seven
           stops he stands mid-screen and the bubble is nowhere near the card. */
        const collides = !(bubBottom < restTop || bubTop > restBottom);
        const want = collides ? Math.max(0, Math.round(restBottom - (bubTop - 12))) : 0;
        if (Math.abs(want - now) > 1) stage.style.setProperty('--card-lift', `${want}px`);
      }
    } else if (stage.style.getPropertyValue('--card-lift')) {
      // No bubble at this stop — let the card sit where it normally does.
      stage.style.setProperty('--card-lift', '0px');
    }

    // Anything whose baseline is below his feet is in front of him.
    for (const op of tall) {
      const base = op.y + op.sh;
      if (base <= feetY) continue;
      if (Math.abs(op.x - feetX) > 120 || Math.abs(base - feetY) > 160) continue;
      const src = sheets[op.sheet];
      if (src) ctx.drawImage(src, op.sx, op.sy, op.sw, op.sh,
        Math.round(op.x * Z - ox), Math.round(op.y * Z - oy), op.sw * Z, op.sh * Z);
    }

    // Card lifecycle — hysteresis, never two at once. The fling guard keeps a
    // jump (a rail click, an anchor link) from strobing every card on the way.
    if (mode === 'free') {
      freeCards();
    } else if (Math.abs(dd) > FLING) {
      hideCard(true);
    } else {
      const near = STOPS.find((s) => Math.abs(d - s.at) < ENTER_R);
      if (near) { showCard(near); lastReached = near; }
      else if (cardStop && Math.abs(d - cardStop.at) > EXIT_R) hideCard();
    }

    // Which chapter he is in. Null between regions (the sea, the gorge), so the
    // last real one is held rather than blanking the label mid-crossing.
    const g = regionAt(Math.round(p.y));
    if (g && g !== region) { region = g; opts.onRegion?.(g); }

    lastD = d;
  }

  /* ---- go --------------------------------------------------------------- */
  return W.loadSheets().then((loaded) => {
    sheets = loaded;
    paintWorld();
    buildRamps();

    if (!external) {
      stage.parentElement.style.height = `${total + stageH}px`;
      window.addEventListener('resize', () => {
        buildRamps();
        stage.parentElement.style.height = `${total + stageH}px`;
      });
    }

    if (canRoam) {
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKey);
      buildStick();
    }
    raf = requestAnimationFrame(frame);

    return {
      get total() { return total; },
      get zoom() { return ZOOM; },
      minGap,
      stops: STOPS,
      /** Rebuild the ramp table and resize the canvas — call from a refresh. */
      refresh() { return buildRamps(); },
      /**
       * A deliberate scroll ends free roam.
       *
       * Thresholded, because ScrollTrigger pushes a value on every frame of a
       * pin and the browser emits sub-pixel scroll of its own; reacting to any
       * change at all would drop the visitor out of free mode the instant they
       * entered it. SCROLL_EXIT is measured from where free mode began, so a
       * nudge is ignored and an intent is not.
       */
      setScroll(px) {
        if (mode === 'free' && Math.abs(px - freeScrollAnchor) > SCROLL_EXIT) exitFree();
        scrollPx = px;
      },
      setActive(on) {
        active = !!on;
        if (!on) { hideCard(true); keys.clear(); if (mode === 'free') exitFree(); }
      },
      /** 'route' | 'free' — for a hint that says which keys do what. */
      get mode() { return mode; },
      get canRoam() { return canRoam; },
      /** Scroll px of a stop's dwell, for a jump affordance. */
      scrollAtStop,
      /** Re-render the open card in place — used after a language switch. */
      refreshCard() {
        if (!card || !cardStop) return;
        const next = renderCard(cardStop);
        next.classList.add('is-in');
        card.replaceWith(next);
        card = next;
      },
      destroy() {
        cancelAnimationFrame(raf);
        hideCard(true);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
        stickEl?.remove();
        stickEl = null;
      },
    };
  });
}
