import { reducedMotion } from './scroll.js';

/**
 * The thermal probe over Olaya — a wake, not a window.
 *
 * WHY A CANVAS RATHER THAN A CSS MASK
 * ------------------------------------
 * The first version was two stacked <img>s with a radial-gradient mask on the
 * top one. That can only ever express where the pointer IS. A wake has to
 * remember where it HAS BEEN and let that memory fade, which needs a buffer
 * that survives between frames and decays a little each one — not something a
 * gradient can hold, at any number of layers.
 *
 * So: one canvas, and an offscreen buffer holding nothing but alpha. Each frame
 * the buffer is faded slightly, then stamped along the path the pointer
 * actually travelled, and used as the cutout for the cool plate:
 *
 *   1. draw the cool plate across the whole frame
 *   2. destination-in the buffer   -> cool survives only inside the wake
 *   3. destination-over the heat   -> heat fills in behind everything else
 *
 * Two full-frame draws and one composite per frame, on a canvas sized to the
 * display rather than to the 2880px source.
 *
 * Both plates are the same pixels in register, so this is one place being
 * probed rather than two pictures being swapped — which is the whole reason the
 * gesture reads as an instrument instead of a wipe.
 */
export function initRiyadhReveal(root) {
  const canvas = document.getElementById('riyadhCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const small = window.matchMedia('(max-width: 760px)').matches;
  const url = (stem) => `/assets/img/${stem}${small ? '-sm' : ''}.webp`;

  /* The wake's lifetime in the only unit that means anything — seconds. The
     per-frame decay is derived from it, so the trail lasts as long on a 120Hz
     display as on a 60Hz one. A fixed per-frame figure would evaporate twice as
     fast on the better screen, which is exactly the kind of bug nobody finds
     because it only appears on hardware the author does not own. */
  const WAKE_SECONDS = 2.4;
  const R = small ? 58 : 96;

  /* The buffer runs at half display resolution. The wake is soft gradients with
     no edge finer than a few pixels, so there is no detail to lose, and it
     quarters the cost of the decay pass — the one operation that has to touch
     every pixel every frame. */
  const DIV = 2;

  let heat = null;
  let cool = null;
  let mask = null;
  let mctx = null;
  let px = 0; let py = 0;      // pointer, in root-local pixels
  let cx = 0; let cy = 0;      // the head — trails the pointer
  let lx = 0; let ly = 0;      // where the head was last frame, in buffer space
  let seeded = false;
  /* When the pointer last said anything. The wake decays to 2% after
     WAKE_SECONDS, so once that has passed with no input there is nothing left
     to animate and the loop can stand down until someone touches it again. */
  let lastInput = 0;
  let running = false;
  /* The one pending animation frame, or 0. Single source of truth for
     whether a callback is queued — see frame(). */
  let raf = 0;
  let t = 0;
  let last = 0;

  const load = (src) => new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });

  // Two full-bleed rasters is not something to spend on a reader who never
  // scrolls this far, so they are fetched only once the dive is close.
  let armed = false;
  const arm = () => {
    if (armed) return;
    if (root.getBoundingClientRect().top > window.innerHeight * 2.5) return;
    armed = true;
    Promise.all([load(url('riyadh-heat')), load(url('riyadh-cool'))])
      .then(([h, c]) => { heat = h; cool = c; size(); paint(); })
      .catch(() => {});
  };

  function size() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    if (!mask) {
      mask = document.createElement('canvas');
      mctx = mask.getContext('2d');
    }
    mask.width = Math.max(1, Math.round(r.width / DIV));
    mask.height = Math.max(1, Math.round(r.height / DIV));
  }

  /** Cover-fit, so the plate crops like a background instead of letter-boxing. */
  function cover(img, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    return [(w - dw) / 2, (h - dh) / 2, dw, dh];
  }

  /** One droplet. Soft all the way through — a hard core makes overlapping
   *  stamps read as a string of beads rather than as a single fluid body. */
  function stamp(x, y, r, a) {
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.45, `rgba(0,0,0,${a * 0.85})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.arc(x, y, r, 0, Math.PI * 2);
    mctx.fill();
  }

  function paint() {
    if (!heat || !cool || !canvas.width) return;
    const r = root.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    if (!w || !h) return;

    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    ctx.drawImage(cool, ...cover(cool, w, h));
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(mask, 0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(heat, ...cover(heat, w, h));
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    /* The same question the pointer handlers ask, so the loop cannot outlive
       the thing it is drawing. It used to test only this element's opacity,
       which is never lowered — see the note on live(). */
    if (!live()) { running = false; return; }
    if (!mctx || !heat) return;

    /* NOTHING TO DRAW WITHOUT A POINTER.

       The wake is entirely pointer-driven and fully decayed WAKE_SECONDS after
       the last input, but the loop kept repainting regardless: three full-canvas
       drawImage calls a frame, forever, over a plate that had been blank for
       minutes. That cost lands hardest in exactly the case it is least wanted —
       a fast scroll past the section, where the pointer is not moving at all and
       every frame is already contended.

       One extra second past the decay before standing down, so the tail of a
       wake is never cut short. track() restarts the loop on the next input. */
    if (lastInput && (now - lastInput) > (WAKE_SECONDS + 1) * 1000) {
      running = false;
      return;
    }

    /* Scheduled AFTER the exit test, and through a handle, so there is only
       ever one pending callback. Scheduling at the top meant a frame could be
       queued and then `running` set false on the same pass; if a pointermove
       arrived before that queued frame ran, it saw `!running`, set it true and
       queued a SECOND. Every time that raced, the number of live loops
       doubled. The handle makes double-scheduling impossible to express. */
    raf = requestAnimationFrame(frame);

    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    t += dt;

    // Decay first, so this frame's own stamps land at full strength.
    const keep = Math.pow(0.02, dt / WAKE_SECONDS);   // 2% left after WAKE_SECONDS
    mctx.globalCompositeOperation = 'destination-out';
    mctx.fillStyle = `rgba(0,0,0,${(1 - keep).toFixed(4)})`;
    mctx.fillRect(0, 0, mask.width, mask.height);
    mctx.globalCompositeOperation = 'source-over';

    // The head trails the pointer. This is what gives the body weight — welded
    // to the cursor it reads as a shape being dragged, not as a liquid.
    cx += (px - cx) * 0.16;
    cy += (py - cy) * 0.16;

    /* Stamp ALONG the path travelled since the last frame, not only at the head.
       A fast flick covers hundreds of pixels between two frames, and stamping
       just the endpoint leaves a dotted line where the wake should be
       continuous. */
    const sx = cx / DIV;
    const sy = cy / DIV;
    const dx = sx - lx;
    const dy = sy - ly;
    const steps = seeded
      ? Math.min(24, Math.max(1, Math.ceil(Math.hypot(dx, dy) / (R / DIV / 3))))
      : 1;

    const k = (R / DIV) * 0.26;
    const wob = reducedMotion ? 0 : 1;   // still reveals, just holds its shape
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const x = lx + dx * f;
      const y = ly + dy * f;
      // Three lobes on incommensurate periods, so the outline never
      // resynchronises into a findable circle.
      stamp(x + Math.sin(t * 0.90 + f) * k * wob,
            y + Math.cos(t * 0.70 + f) * k * wob, R / DIV, 0.55);
      stamp(x + Math.sin(t * 0.53 + 2.1) * k * 1.2 * wob,
            y + Math.sin(t * 0.81 + 1.3) * k * 1.2 * wob, (R / DIV) * 0.80, 0.45);
      stamp(x + Math.cos(t * 0.41 + 4.2) * k * 1.3 * wob,
            y + Math.cos(t * 0.67 + 0.6) * k * 1.3 * wob, (R / DIV) * 0.62, 0.40);
    }
    lx = sx;
    ly = sy;

    paint();
  }

  function track(clientX, clientY) {
    lastInput = performance.now();
    const r = root.getBoundingClientRect();
    px = clientX - r.left;
    py = clientY - r.top;
    if (!seeded) {
      cx = px; cy = py;
      lx = cx / DIV; ly = cy / DIV;
      seeded = true;
    }
    /* Guarded on the HANDLE rather than on `running`, for the reason in
       frame(): `running` can be false while a callback is still queued. */
    if (!raf) { running = true; last = 0; raf = requestAnimationFrame(frame); }
  }

  /* IS THE PLATE ACTUALLY ON SCREEN — not just "has it been faded in".

     This asked one question: is #riyadh's own opacity above 0.05. That value
     is set to 1 when the dive reveals the plate and is NEVER LOWERED again,
     because what takes the frame away is the parent stage fading and
     scrolling off, not this element. Measured on the live page: at y=6798 the
     stage is already opacity 0 with its top at -1775, and by y=18586 its top
     is -13563 — while root.style.opacity still reads 1.000 at every one of
     those points.

     So `live()` stayed true for the whole rest of the page. Every pointermove
     anywhere restarted the loop, the loop's own exit test could never fire,
     and it went on stamping up to 72 radial gradients a frame onto a canvas
     nobody could see for another 19,000px of scrolling. That is a phone
     rendering a hidden animation until it gets warm enough for the tab to be
     killed, which is what "too much interaction reloads the page" looks like
     from the outside.

     Three tests now, cheapest first: the element's own fade, then the stage
     that actually carries it away, then whether the box is on screen at all.
     The rect test alone would cover today's layout; the other two are kept
     because they are what the fade MEANS, and a future layout could keep the
     box in view while the frame is meant to be gone. */
  const stage = root.closest('.worlds__stage') || root.parentElement;
  const live = () => {
    if (parseFloat(root.style.opacity || '0') < 0.05) return false;
    if (stage && parseFloat(getComputedStyle(stage).opacity || '1') < 0.05) return false;
    const r = root.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  };

  /* live() is now a rect read as well as two opacity reads, and this fires on
     every pointer move across the whole document. Cheap as it is, it is not
     free, so it is only asked while the plate could plausibly be up. */
  window.addEventListener('pointermove', (e) => {
    if (live()) track(e.clientX, e.clientY);
  }, { passive: true });

  // Touch has no hover, so the probe follows a dragged finger. The plate is not
  // the globe's grab target, so this takes nothing away from scrolling.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && live()) track(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('resize', () => { size(); paint(); }, { passive: true });
  window.addEventListener('scroll', arm, { passive: true });

  size();
  arm();
}
