/**
 * The scroll walk over the hand-painted map.
 *
 * Supersedes the scene-composited walk in walk.js. The world is now one painted
 * image (base_map.png, 1376x3072), so buildScene() is no longer the source of
 * anything — but every mechanism that was hard-won in walk.js is kept, because
 * none of it depended on how the world was produced:
 *
 *   - scroll -> distance through ramps WITH DWELLS, so he stops at each stop and
 *     the card is readable without holding the scroll perfectly still
 *   - the gait is a PURE FUNCTION OF DISTANCE, so it cannot drift, freezes in a
 *     dwell by itself, and runs backwards when you scroll up
 *   - the camera leads, and freezes its lead while a card is open
 *   - card hysteresis, so one card is open at a time and never two
 *
 * What is new: the outfit changes at every milestone, and the NPCs move.
 *
 * Units are MAP PIXELS now, not tiles. Radii that were 3.5/5.0 tiles are 60/90px.
 */

import { reducedMotion } from '../scroll.js';

const MAP = '/assets/pixel/final';

/* ---- tunables ---------------------------------------------------------- */
const STRIDE   = 6;     // px of travel per animation frame
const ENTER_R  = 60;    // mount a card within this many px of a stop
const EXIT_R   = 90;    // unmount past this — the gap is the hysteresis band
const MIN_SHOW_MS = 450;
const LEAD_DOWN = 0.42;
const LEAD_UP   = 0.58;
const TAU = 0.35;
const PX_PER_PX = 2.2;  // screen px scrolled per map px travelled
const NPC_SPEED = 0.018; // px per ms

/**
 * Which row of the sheet plays for what.
 *
 * Measured rather than assumed: every row holds 8 filled frames with similar
 * frame-to-frame deltas (33-59), so these are pose sets, not tight cycles —
 * except row 1, which is an unmistakable side-on run. That is why movement uses
 * row 1 regardless of heading. The road is almost entirely vertical, and a
 * side-on gait reads correctly against a vertical scroll.
 *
 * If a row turns out to be a genuine front or back walk, change it here only.
 */
export const HERO = {
  // FREE_Adventurer, already in the library at /assets/pixel/hero. One sheet per
  // direction, 8 frames at a 96x80 pitch, figure centred x=48 with feet at y=58.
  // The Photoshop outfit sheets were tried and abandoned: rendered down 13x to
  // map scale they lost the read entirely. On this map a person is ~45px and the
  // Adventurer is 34px, so it sits without any resizing at all.
  W: 96, H: 80, CX: 48, FY: 58, FRAMES: 8,

  /**
   * The hero is drawn slightly larger than the world.
   *
   * He is 34px tall while the figures painted into the map are ~45px, so at a
   * shared zoom he is genuinely the smallest person on his own map. Rather than
   * resample his sprite — 34 -> 45 is 1.32x, which has no integer factor and
   * would give him uneven pixels — he is drawn at a HIGHER INTEGER zoom than the
   * world. At world zoom 2 that is 3, so 102 screen px against the map's 90:
   * he reads as the protagonist, and every pixel is still a clean square.
   *
   * Raise to 2 to make him larger again; it stays integer at any world zoom.
   */
  SCALE: 1.2,
};

/* trapezoid speed profile -> CDF, so he decelerates into a stop and out of it */
function makeCdf(k, steps = 24) {
  const ss = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
  const v = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps; v.push(ss(t / k) * ss((1 - t) / k)); }
  const cdf = [0];
  let acc = 0;
  for (let i = 1; i <= steps; i++) { acc += (v[i] + v[i - 1]) / 2; cdf.push(acc); }
  const tot = cdf[cdf.length - 1] || 1;
  return cdf.map((c) => c / tot);
}
function sampleCdf(cdf, u) {
  const n = cdf.length - 1;
  const x = Math.min(n - 1e-6, Math.max(0, u * n));
  const i = Math.floor(x);
  return cdf[i] + (cdf[i + 1] - cdf[i]) * (x - i);
}

const load = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => rej(new Error(`failed: ${src}`));
  i.src = src;
});

export async function initWalkMap(stage, opts = {}) {
  if (reducedMotion) return null;
  const canvas = stage.querySelector('canvas');
  const cardHost = stage.querySelector('[data-cards]') || stage;
  const ctx = canvas.getContext('2d');

  /* ---- data ---- */
  const [road, stopData, meta] = await Promise.all(
    ['road_path.json', 'stops.json', 'outfits_small.json']
      .map((f) => fetch(`${MAP}/${f}`).then((r) => r.json())),
  );
  const PATH = road.points.map(([x, y]) => ({ x, y }));
  const STOPS = stopData.stops;
  const [CW, CH] = meta.cell;

  /* segment table, in map pixels */
  const SEG = [];
  let total = 0;
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    SEG.push({ a, b, len, start: total });
    total += len;
  }
  const PATH_LEN = total;

  function pointAt(d) {
    const dist = Math.min(PATH_LEN, Math.max(0, d));
    for (const s of SEG) {
      if (dist <= s.start + s.len || s === SEG[SEG.length - 1]) {
        const t = s.len ? (dist - s.start) / s.len : 0;
        return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
      }
    }
    return PATH[0];
  }

  /* ---- art ---- */
  const world = await load(`${MAP}/base_map.png`);

  // hero: one sheet per direction
  const HERO_DIRS = ['Down', 'Left', 'Right', 'Up'];
  const hero = {};
  await Promise.all(HERO_DIRS.flatMap((d) => [
    load(`/assets/pixel/hero/idle_${d.toLowerCase()}.webp`).then((i) => { hero['idle' + d] = i; }),
    load(`/assets/pixel/hero/run_${d.toLowerCase()}.webp`).then((i) => { hero['run' + d] = i; }),
  ]));

  // NPCs are their own people, from the packs — NOT recoloured copies of the
  // hero. Reusing the protagonist's sheet for the crowd is what made the street
  // read as one man standing in seven places.
  // Eight different people and three animals. Nothing is a recolour of the
  // hero, and nothing is drawn from his sheet — the crowd has to be other
  // people or the street reads as one man standing in several places.
  // All of these are 29-32px against the hero's 34px, so NOTHING IS RESIZED:
  // they already agree, and on this map a person is ~45px.
  const NPC_ART = ['villager_a', 'villager_b', 'villager_c', 'villager_hold',
    'villager_carry', 'villager_rogue', 'villager_knight', 'villager_wizard'];
  const ANIMAL_ART = ['animal_cow', 'animal_sheep', 'animal_chicken'];
  const npcImgs = await Promise.all(NPC_ART.map((n) => load(`/assets/pixel/mix/${n}.webp`)));
  const animalImgs = await Promise.all(ANIMAL_ART.map((n) => load(`/assets/pixel/mix/${n}.webp`)));

  /* ---- scroll ramps: travel, then a dwell at each stop ---- */
  let ramps = [], scrollTotal = 0, stageW = 0, stageH = 0, ZOOM = 2;
  // Device pixels. Kept apart from stageW/stageH because those drive the scroll
  // ramps, which must stay in CSS pixels or the section's length changes with
  // the user's display scaling.
  let stageWd = 0, stageHd = 0;
  const DPR = Math.max(1, window.devicePixelRatio || 1);

  function buildRamps() {
    stageW = stage.clientWidth; stageH = stage.clientHeight;
    // The backing store is sized in DEVICE pixels, not CSS pixels. Windows
    // commonly runs at 125% or 150% scaling, and a CSS-sized canvas is then
    // stretched by that fraction. Because the canvas is `image-rendering:
    // pixelated` the stretch is nearest-neighbour, so at 125% one art pixel
    // covers 2.5 device pixels and lands 2 wide in one column and 3 in the
    // next. That uneven grid is what reads as "low resolution" — no detail is
    // missing, the pixels are just different sizes. The CSS comment on
    // .journey__canvas already assumed ZOOM x dpr was an integer; this is what
    // actually makes that true.
    stageWd = Math.round(stageW * DPR); stageHd = Math.round(stageH * DPR);
    // Integer zoom only: a fractional scale resamples the art and the map crawls.
    // Measured in device pixels now, so the art keeps its physical size on a
    // scaled display instead of shrinking. Ceiling raised from 4 to 6 to leave
    // room for that multiplier.
    // Floor of 2, not 1. `round(stageH / 900)` returned 1 at every realistic
    // viewport height (720-1080), so the whole world drew at 1:1 and the hero
    // was 34 screen pixels on an 800px stage — which is why he looked tiny.
    ZOOM = Math.max(2, Math.min(6, Math.round(stageHd / 420)));
    const DWELL = 0.40 * stageH;
    const EASE = 0.18 * stageH;
    ramps = [];
    let d0 = 0, px = 0;
    const travel = (d1) => {
      const len = Math.max(1, Math.abs(d1 - d0) * PX_PER_PX);
      const k = Math.min(0.5, Math.max(0.06, EASE / (2 * len)));
      ramps.push({ kind: 'travel', px0: px, pxLen: len, d0, d1, cdf: makeCdf(k) });
      px += len; d0 = d1;
    };
    for (const s of STOPS) {
      travel(s.at);
      ramps.push({ kind: 'dwell', px0: px, pxLen: DWELL, d0, d1: d0 });
      px += DWELL;
    }
    travel(PATH_LEN);
    scrollTotal = px;
    return px;
  }

  function distanceAt(px) {
    const p = Math.min(scrollTotal, Math.max(0, px));
    let lo = 0, hi = ramps.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ramps[m].px0 <= p) lo = m; else hi = m - 1; }
    const r = ramps[lo];
    if (r.kind === 'dwell') return { d: r.d0, still: true };
    const u = Math.min(1, (p - r.px0) / r.pxLen);
    return { d: r.d0 + (r.d1 - r.d0) * sampleCdf(r.cdf, u), still: false };
  }

  /* ---- NPCs: placed by hand, and they walk ----
     Each patrols between two points on its own clock. Static figures are what
     made the earlier map read as a diorama rather than a place. */
  // Placed by hand along the road and around the settlements, each on its own
  // clock so they never march in step. Positions are a first pass against the
  // painting and are meant to be nudged.
  // Hand-placed via lab/trace.html if npcs.json is present; the list below is
  // only the fallback for before that has been done.
  let placed = null;
  try {
    const r = await fetch(`${MAP}/npcs.json`);
    if (r.ok) placed = await r.json();
  } catch { /* not placed yet */ }

  const NPCS = (opts.npcs || placed?.npcs || [
    // the cathedral courtyard and the market street
    { from: [600, 430], to: [790, 430], art: 0, speed: 0.9 },
    { from: [520, 560], to: [640, 560], art: 6, speed: 0.6 },
    { from: [860, 545], to: [980, 545], art: 3, speed: 0.8 },
    { from: [430, 600], to: [560, 620], art: 1, speed: 0.5 },
    // the timber houses
    { from: [640, 900], to: [860, 900], art: 4, speed: 0.7 },
    { from: [900, 830], to: [1000, 900], art: 2, speed: 0.6 },
    // the farm manors
    { from: [560, 1300], to: [560, 1420], art: 5, speed: 0.5 },
    { from: [880, 1560], to: [1010, 1560], art: 7, speed: 0.8 },
    { from: [520, 1830], to: [760, 1880], art: 0, speed: 0.7 },
    { from: [900, 1900], to: [1040, 1900], art: 3, speed: 0.9 },
    // the desert plaza
    { from: [480, 2860], to: [820, 2860], art: 1, speed: 1.0 },
    { from: [880, 2760], to: [1010, 2800], art: 6, speed: 0.6 },
    { from: [560, 2960], to: [880, 2960], art: 4, speed: 0.8 },
  ]).map((n, i) => ({ ...n, phase: i * 0.37 }));

  // Livestock, on the farmland either side of the road. Slower than people,
  // which is most of what makes them read as animals rather than small humans.
  const ANIMALS = (opts.animals || placed?.animals || [
    { from: [250, 1400], to: [330, 1430], art: 0, speed: 0.22 },
    { from: [300, 1560], to: [380, 1540], art: 1, speed: 0.28 },
    { from: [1080, 1440], to: [1160, 1470], art: 1, speed: 0.25 },
    { from: [1120, 1680], to: [1180, 1660], art: 0, speed: 0.20 },
    { from: [420, 1900], to: [470, 1920], art: 2, speed: 0.45 },
    { from: [440, 1930], to: [500, 1905], art: 2, speed: 0.5 },
    { from: [1040, 1200], to: [1110, 1225], art: 1, speed: 0.24 },
  ]).map((n, i) => ({ ...n, phase: i * 0.53 }));

  /* ---- cards ---- */
  let card = null, cardStop = null, cardAt = 0;
  function showCard(stop) {
    if (cardStop === stop) return;
    if (card) {
      const old = card;
      if (performance.now() - cardAt < MIN_SHOW_MS) old.remove();
      else { old.classList.remove('is-in'); old.addEventListener('transitionend', () => old.remove(), { once: true }); }
    }
    card = document.createElement('div');
    card.className = 'walkcard';
    card.innerHTML = `<em>${stop.period || ''}</em><b>${stop.role || stop.label}</b>`
      + `<span>${stop.org || ''}</span>${stop.note ? `<p>${stop.note}</p>` : ''}`;
    cardHost.appendChild(card);
    requestAnimationFrame(() => card.classList.add('is-in'));
    cardStop = stop; cardAt = performance.now();
  }
  function hideCard() {
    if (!card || performance.now() - cardAt < MIN_SHOW_MS) return;
    const old = card;
    old.classList.remove('is-in');
    old.addEventListener('transitionend', () => old.remove(), { once: true });
    card = null; cardStop = null;
  }

  /* ---- draw ---- */
  let leadY = LEAD_DOWN, lastT = 0, lastD = 0, raf = 0, running = false;

  function blitFrame(img, idx, dx, dy, Z) {
    const c = idx % FRAMES.cols, r = (idx / FRAMES.cols) | 0;
    ctx.drawImage(img, c * CW, r * CH, CW, CH, dx, dy, CW * Z, CH * Z);
  }

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (t - lastT) / 1000 || 0.016);
    lastT = t;

    // measure against the SCROLLER: the stage is sticky, so its own top pins at
    // 0 and never goes negative (this exact bug cost a session in 9.11)
    const top = (stage.parentElement || stage).getBoundingClientRect().top;
    const { d, still } = distanceAt(Math.min(scrollTotal, Math.max(0, -top)));

    const p = pointAt(d);
    const a = pointAt(Math.max(0, d - 6)), b = pointAt(Math.min(PATH_LEN, d + 6));
    const dy = b.y - a.y, dx = b.x - a.x;
    const back = d < lastD - 1e-4;
    let dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left');
    if (back) dir = { down: 'up', up: 'down', left: 'right', right: 'left' }[dir];

    const Z = ZOOM;
    const targetLead = dir === 'down' ? LEAD_DOWN : dir === 'up' ? LEAD_UP : 0.5;
    if (!cardStop) leadY += (targetLead - leadY) * (1 - Math.exp(-dt / TAU));

    const mapW = world.width * Z, mapH = world.height * Z;
    let camX = mapW <= stageWd ? -(stageWd - mapW) / 2
      : Math.min(mapW - stageWd, Math.max(0, p.x * Z - stageWd / 2));
    let camY = Math.min(mapH - stageHd, Math.max(0, p.y * Z - stageHd * leadY));
    // Whole device pixels. A fractional camera offset shifts the whole tilemap
    // off the pixel grid and the art shimmers as it scrolls.
    camX = Math.round(camX); camY = Math.round(camY);

    // Only reallocate on an actual resize — assigning width every frame throws
    // away the backing store and resets the context state each time.
    if (canvas.width !== stageWd || canvas.height !== stageHd) {
      canvas.width = stageWd; canvas.height = stageHd;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, stageWd, stageHd);
    ctx.drawImage(world, 0, 0, world.width, world.height, -camX, -camY, mapW, mapH);

    // Everyone on the map draws at the same integer zoom, hero and crowd alike.
    // Drawing the NPCs at world zoom while the hero was raised made him a giant
    // among his own townspeople.
    const HZ = Math.max(Z, Math.round(Z * HERO.SCALE));   // integer, never fractional

    // NPCs and livestock — time-driven, because they move whether or not the
    // reader scrolls. A world that only animates while you scroll is a diagram.
    for (const n of [...NPCS, ...ANIMALS]) {
      const u = (Math.sin(t * NPC_SPEED * n.speed * 0.001 + n.phase) + 1) / 2;
      const nx = n.from[0] + (n.to[0] - n.from[0]) * u;
      const ny = n.from[1] + (n.to[1] - n.from[1]) * u;
      const moving = Math.abs(Math.cos(t * NPC_SPEED * n.speed * 0.001 + n.phase)) > 0.08;
      const pool = ANIMALS.includes(n) ? animalImgs : npcImgs;
      const img = pool[n.art % pool.length];
      // a small vertical bob stands in for a walk cycle: these NPC sprites are
      // single frames, so nothing else can convey motion
      const bob = moving ? (Math.floor(t / 180 + n.phase * 6) % 2) : 0;
      ctx.drawImage(img,
        Math.round(nx * Z - (img.width * HZ) / 2 - camX),
        Math.round(ny * Z - img.height * HZ - camY - bob * HZ),
        img.width * HZ, img.height * HZ);
    }

    // the hero, in the outfit for how far he has come
    const cap = dir[0].toUpperCase() + dir.slice(1);
    const sheet = hero[(still ? 'idle' : 'run') + cap] || hero.idleDown;
    const col = still ? 0
      : (((Math.floor(d / STRIDE) % HERO.FRAMES) + HERO.FRAMES) % HERO.FRAMES);

    ctx.save();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(Math.round(p.x * Z - camX), Math.round(p.y * Z - camY) - 1 * Z, 5 * Z, 2 * Z, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();

    ctx.drawImage(sheet, col * HERO.W, 0, HERO.W, HERO.H,
      Math.round(p.x * Z - HERO.CX * HZ - camX),
      Math.round(p.y * Z - HERO.FY * HZ - camY),
      HERO.W * HZ, HERO.H * HZ);

    const near = STOPS.find((s) => Math.abs(d - s.at) < ENTER_R);
    if (near) showCard(near);
    else if (cardStop && Math.abs(d - cardStop.at) > EXIT_R) hideCard();

    lastD = d;
  }

  const start = () => { if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const h = buildRamps();
  stage.parentElement.style.height = `${h + stageH}px`;
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { stage.parentElement.style.height = `${buildRamps() + stageH}px`; }, 150);
  });
  new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop()), { rootMargin: '120px' }).observe(stage);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  return { scrollTotal, pathLength: PATH_LEN, stops: STOPS.length, cell: [CW, CH] };
}
