/**
 * Parallax for the floating mirror tiles behind Selected Work.
 *
 * Pointer on a desktop, device tilt on a phone. Both feed the same two numbers,
 * so there is one behaviour with two sources rather than two behaviours.
 *
 * WHY THE FIELD MOVES AND NOT EACH TILE
 * -------------------------------------
 * Every tile already runs its own drift keyframes on `transform`. Writing a
 * parallax transform onto the same property would mean one of the two winning
 * outright — the animation, since it is running — and the tiles would simply
 * ignore the pointer. So the two live on different elements: the drift stays on
 * the tile, the parallax goes on the field around it, and the browser composes
 * them. This is the "one element, one owner" rule from CONTEXT 48 applied to a
 * property rather than to an element.
 *
 * Depth comes free from the perspective already on the field: tiles at
 * different --z parallax by different amounts against a rotating parent without
 * anything here having to know their depths.
 *
 * DEVICE ORIENTATION IS NEVER PROMPTED FOR
 * ----------------------------------------
 * iOS gates it behind requestPermission(), which must be called from a user
 * gesture and shows a system dialog. Firing that at a reader who has scrolled
 * past a decorative background would be indefensible, so this listens only
 * where the events arrive unasked and does nothing where they do not. The
 * tiles still drift; they just do not tilt.
 */

const MAX = 7;        // degrees of field rotation at the extremes
const EASE = 0.06;    // how quickly it chases the target

export function initTileField(host) {
  const el = typeof host === 'string' ? document.querySelector(host) : host;
  if (!el) return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  let tx = 0, ty = 0;   // target
  let cx = 0, cy = 0;   // current
  let raf = 0;
  let visible = false;

  function frame() {
    raf = 0;
    cx += (tx - cx) * EASE;
    cy += (ty - cy) * EASE;
    el.style.setProperty('--fx', `${cy.toFixed(2)}deg`);
    el.style.setProperty('--fy', `${cx.toFixed(2)}deg`);
    /* Keep going only while it is still visibly catching up. A field at rest
       costs nothing, which matters on a page this long. */
    if (visible && (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01)) {
      raf = requestAnimationFrame(frame);
    }
  }

  function run() {
    if (!raf && visible) raf = requestAnimationFrame(frame);
  }

  function aim(nx, ny) {
    tx = Math.max(-1, Math.min(1, nx)) * MAX;
    ty = Math.max(-1, Math.min(1, ny)) * -MAX;
    run();
  }

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) run();
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0 }).observe(el);

  /* Pointer: normalised against the VIEWPORT rather than the element, so the
     tiles keep responding while the cursor is over the wheel in the middle of
     the section — which is where it spends most of its time here. */
  window.addEventListener('pointermove', (e) => {
    if (!visible || e.pointerType === 'touch') return;
    aim((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  /* Tilt, where it arrives without asking. gamma is left-right, beta is
     front-back; both are divided down because a phone is rarely held flat and
     the interesting range is small movements around wherever it is being
     held, not the full sweep. */
  if (typeof DeviceOrientationEvent !== 'undefined'
      && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      if (!visible || e.gamma == null || e.beta == null) return;
      aim(e.gamma / 30, (e.beta - 45) / 30);
    }, { passive: true });
  }

  return { destroy() { if (raf) cancelAnimationFrame(raf); } };
}
