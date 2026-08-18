import { reducedMotion } from './scroll.js';

/**
 * Vertical 3D card wheels.
 *
 * Cards sit on the surface of a cylinder lying on its side, and the wheel turns
 * under the pointer's scroll. The far side stays visible through the gaps
 * between the near cards, which is the point — it reads as one object with
 * depth rather than as a list that happens to be animated.
 *
 * GEOMETRY
 * For N cards the angular step is 360/N. Place card i at `rotateX(-i*step)
 * translateZ(R)` and it lands on the cylinder facing outward. The radius that
 * makes adjacent cards exactly touch is
 *
 *     R = (h / 2) / tan(step / 2)
 *
 * TAN, not sin. The first version used the chord — 2*R*sin(step/2) — which is
 * the straight-line distance between card CENTRES, not the spacing between
 * their edges around the ring. It over-solved the radius by a third, and
 * combined with a 564px tallest card that put the neighbouring card 471px off
 * centre in a 533px stage: a 26px sliver of it showed and everything else was
 * clipped. One card on screen at a time, which is exactly why it did not read
 * as a wheel. At the correct radius five cards are in frame at once and the
 * cylinder is legible.
 *
 * The height fed in is a FIXED card height, not the tallest natural card. A
 * wheel with irregular spokes does not read as a wheel, and the poster card was
 * 564px against 344px for the rest.
 *
 * WHY THE FAR SIDE IS DIMMED RATHER THAN HIDDEN
 * `backface-visibility: hidden` would empty the gaps and lose the depth. Left
 * fully visible, the far cards are mirrored and legible enough to fight the
 * front for attention. Dimming and blurring them by depth resolves both: they
 * read as structure, not as content competing to be read.
 */

/* 0.60, and it is not a taste value — it was solved.
   The gap that matters is the PROJECTED one between the front card's edge and
   its neighbour's, after perspective has scaled both. At 0.10 with a 284px card
   that distance came out at -43px: the neighbour sat on top of the front card,
   which is what made the ring look like a stack of glued cards rather than a
   wheel with spokes. 0.60 on a 230px card gives +46px of real daylight. */
const GAP = 0.60;
const SNAP_AFTER = 140;    // ms of stillness before easing to the nearest card
const WHEEL_K = 0.22;      // degrees of turn per pixel of scroll

export function initWheels() {
  const wheels = [...document.querySelectorAll('[data-wheel]')];
  if (!wheels.length) return;
  wheels.forEach(setupWheel);
}

function setupWheel(root) {
  const ring = root.querySelector('.wheel__ring');
  if (!ring) return;
  const cards = [...ring.querySelectorAll('.wheel__card')];
  const n = cards.length;
  if (!n) return;

  const step = 360 / n;
  let radius = 0;
  let angle = 0;        // current ring rotation, degrees
  let target = 0;       // where it is easing to
  let raf = 0;
  let idleTimer = 0;

  /* Radius is derived from the rendered card height, so it survives a font
     swap, a breakpoint, or a card that turns out taller than its siblings —
     none of which a hardcoded number would. */
  function measure() {
    /* offsetHeight, and only once the cards are actually laid out.
       The first version ran this during init and read 564px — the height the
       cards had while still in normal document flow, before the absolute
       positioning and width cap applied. That inflated the radius by 64% and
       drove the front card clean out of its column. Anything that changes card
       height (fonts, images, a breakpoint) has to re-run this, hence the
       callers below. */
    const h = cards.reduce((m, c) => Math.max(m, c.offsetHeight), 0);
    if (!h) return;
    radius = ((h / 2) / Math.tan((step / 2) * Math.PI / 180)) * (1 + GAP);
    ring.style.setProperty('--r', `${radius.toFixed(1)}px`);
    cards.forEach((c, i) => {
      c.style.setProperty('--a', `${(-i * step).toFixed(3)}deg`);
    });
    paint();
  }

  /** Depth cues, recomputed from each card's actual angle to the viewer. */
  function paint() {
    ring.style.transform = `translateZ(${(-radius).toFixed(1)}px) rotateX(${angle.toFixed(3)}deg)`;
    for (let i = 0; i < n; i++) {
      // How far this card is from facing the viewer, 0 (front) .. 180 (back).
      let d = Math.abs(((angle - i * step) % 360 + 540) % 360 - 180);
      d = 180 - d;
      const t = d / 180;                        // 1 = front, 0 = directly behind
      const c = cards[i];
      c.style.setProperty('--depth', t.toFixed(3));
      // Only the card actually facing the reader should take a click; without
      // this the far side stays in the hit-test and swallows presses aimed at
      // the front through the gaps.
      c.style.pointerEvents = t > 0.72 ? 'auto' : 'none';
      c.setAttribute('aria-hidden', t > 0.72 ? 'false' : 'true');
      c.tabIndex = t > 0.72 ? 0 : -1;
    }
  }

  function tick() {
    raf = 0;
    const diff = target - angle;
    if (Math.abs(diff) < 0.02) { angle = target; paint(); return; }
    angle += diff * 0.16;
    paint();
    raf = requestAnimationFrame(tick);
  }

  function run() { if (!raf) raf = requestAnimationFrame(tick); }

  function snap() {
    target = Math.round(target / step) * step;
    run();
  }

  function turn(deltaDeg) {
    target += deltaDeg;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(snap, SNAP_AFTER);
    run();
  }

  /* Wheel input.
     `data-lenis-prevent` on the container keeps Lenis from also consuming this,
     and preventDefault stops the page scrolling underneath — which is the
     interaction asked for: over a wheel, the wheel turns; anywhere else on the
     section, the page moves. The section is laid out with real margins either
     side precisely so that escape route exists. */
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    turn(e.deltaY * WHEEL_K);
  }, { passive: false });

  // Keyboard: the wheel is a list, and a list has to be operable without a
  // mouse. Arrows move one card; the roving tabindex above keeps only the
  // front card in the tab order.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { turn(step); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { turn(-step); e.preventDefault(); }
  });

  // Drag, for trackpads and touch. Vertical only — horizontal is not this
  // control's axis and stealing it would break page gestures.
  let dragging = false;
  let lastY = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    dragging = true; lastY = e.clientY;
    root.setPointerCapture?.(e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - lastY;
    lastY = e.clientY;
    turn(dy * WHEEL_K * 1.6);
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    root.releasePointerCapture?.(e.pointerId);
    snap();
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  /* A ResizeObserver on a card, not a list of events that might mean the card
     resized.

     Two rounds of this bug were the same shape: measure fires, the card is not
     yet at its final height, and the radius is solved against the wrong number
     with nothing to correct it. First it read 564px of flow layout; then, after
     the height was fixed in CSS, it still caught 486px and settled there — the
     wheel only snapped right when something happened to fire a resize. Deferring
     by more frames just moves the race.

     The observer removes the guesswork: whatever eventually decides the card's
     height — stylesheet arrival, fonts, a breakpoint, an image — the radius is
     re-solved when the height actually changes. */
  const ro = new ResizeObserver(() => measure());
  ro.observe(cards[0]);
  ro.observe(root);
  measure();

  if (reducedMotion) {
    // No easing loop: jumps straight to the target so the wheel still works,
    // it just does not spin to get there.
    ring.style.transition = 'none';
  }
}
