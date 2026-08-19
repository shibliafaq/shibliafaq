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
const GAP = 0.52;
/* Impulse per pixel of scroll, NOT degrees per pixel — the motion model is
   velocity-based now. Derived so that one ~120px wheel notch carries about one
   card: step * (1 - FRICTION) / 120, which for a 7-card ring at friction 0.955
   is 51.43 * 0.045 / 120 ≈ 0.019. */
const WHEEL_K = 0.019;

/**
 * The card currently at the front of a wheel, found by projected area.
 *
 * WHY NOT JUST HIT-TEST THE CLICK
 * Because the browser gets it wrong here, and only sometimes, which is worse.
 * The cards sit on a ring inside a preserve-3d scene. When the ring is at
 * rotateX(0) the front card hit-tests correctly; rotate the ring by one step
 * and the SAME card, still visually front and still fully opaque, stops being
 * hittable — elementFromPoint returns the .wheel__scene plane behind it, and a
 * click on the card reaches nothing. Measured side by side: the architecture
 * wheel at rotateX(0deg) resolved to the card, the M.Sc. wheel at
 * rotateX(51.429deg) resolved to wheel__scene, with both front cards at the
 * same size and screen position.
 *
 * So the front card is derived instead of detected. A ring turning about X
 * foreshortens every card except the one facing the viewer, so the largest
 * projected area IS the front card — true at any rotation, and it needs
 * nothing from the browser but a bounding box.
 */
export function frontCard(wheelEl, selector) {
  let best = null;
  let biggest = 0;
  wheelEl.querySelectorAll(selector).forEach((c) => {
    const r = c.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > biggest) { biggest = area; best = c; }
  });
  return best;
}

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

  /* Axis. `data-wheel="horizontal"` spins about Y instead of X and solves its
     radius from card WIDTH rather than height — the dimension that has to fit
     between spokes is whichever one lies along the direction of travel. Nothing
     else about the mechanism changes, which is the reason this is a parameter
     and not a second module. */
  /* "auto" means vertical on a desktop and horizontal on a phone. A vertical
     ring needs height to travel through and a narrow screen has none to spare,
     while a horizontal one needs width — which is exactly what a phone has more
     of, proportionally. Same mechanism, turned ninety degrees to suit the
     shape of the viewport.

     `let`, and re-evaluated on the media query, so rotating a tablet switches
     axis rather than leaving the ring solved for the wrong dimension. */
  const AUTO_H = window.matchMedia('(max-width: 900px)');
  const wanted = () => (root.dataset.wheel === 'horizontal')
    || (root.dataset.wheel === 'auto' && AUTO_H.matches);
  let horizontal = wanted();

  const step = 360 / n;
  let radius = 0;
  /* ENTRANCE. Not a set-piece — a settle.
     The page already spends its 3D budget on the globe sequence, and a second
     elaborate arrival three screens later competes with it rather than adding
     to it. So the ring simply comes to rest: it fades up while finishing a
     little over half a card of rotation, which reads as something that was
     already turning before you looked at it.

     Runs once, on first sight, and never again — an entrance that replays every
     time the section scrolls back into view stops being an entrance and becomes
     a tic. */
  let intro = 0;
  let introRunning = false;

  let angle = 0;        // current ring rotation, degrees
  let target = 0;       // where it is easing to
  let raf = 0;

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
    const h = cards.reduce(
      (m, c) => Math.max(m, horizontal ? c.offsetWidth : c.offsetHeight), 0);
    if (!h) return;
    radius = ((h / 2) / Math.tan((step / 2) * Math.PI / 180)) * (1 + GAP);
    ring.style.setProperty('--r', `${radius.toFixed(1)}px`);
    /* Also on the wheel root, because the label is a SIBLING of the ring now
       and has to read the same radius to sit on the axis. The unitless twin is
       for the counter-scale, which needs a number rather than a length. */
    root.style.setProperty('--r', `${radius.toFixed(1)}px`);
    root.style.setProperty('--r-num', radius.toFixed(1));
    cards.forEach((c, i) => {
      c.style.setProperty('--a', `${(-i * step).toFixed(3)}deg`);
      c.classList.toggle('is-h', horizontal);
    });
    fitLabel();
    paint();
  }

  /* ONE font size shared by BOTH wheels.

     Fitting each label to its own column made them equal in WIDTH but unequal
     in size — "M.Sc." set much larger than "Architecture" because it has fewer
     letters to fill the same space. Two labels of different sizes sitting side
     by side read as a mistake.

     So the size is solved once, from the LONGEST line across both wheels, and
     every label uses it. On two lines that longest line is "Architecture"; fit
     that to the column and everything else follows at the same size, narrower,
     which is what matching type is supposed to look like.

     Published on .wheels rather than set per element so both wheels genuinely
     share one value and cannot drift apart. */

  /* Fraction of the column width the longest RENDERED line fills.

     This number only became meaningful once the probe below started copying
     text-transform and letter-spacing. Before that it measured lowercase
     untracked text and under-read the real width by 46%, so 0.94 was quietly
     producing a label half again wider than the column — bleeding off both
     edges, which is what read as far too big.

     The floor is set by the card: at 36vw against a 619px column the card is
     0.84 of it, and a label narrower than that is completely covered whenever a
     card sits at the front, which is most of the time. Measured at 0.62 the
     label disappeared entirely. 0.94 leaves about 30px of type showing past
     each edge of the card — enough to read the ends and to see the card travel
     across them, without the type leaving the column. */
  const HUB_FILL = 0.94;
  function fitLabel() {
    const host = root.closest('.wheels');
    if (!host || !radius) return;
    const titles = [...host.querySelectorAll('.wheel__title')];
    if (!titles.length) return;

    // Reset before measuring, or each pass compounds the last one's result.
    titles.forEach((t) => { t.style.fontSize = ''; });

    const colW = root.clientWidth;
    if (!colW) return;

    /* Widest single LINE, not widest label — the lines wrap, so a two-line
       label is only ever as wide as its longest word. Measured by putting each
       line in a throwaway span, because scrollWidth on a wrapped block reports
       the container, not the text. */
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
    let widest = 0;
    for (const t of titles) {
      const cs = getComputedStyle(t);
      /* The font shorthand alone is NOT enough. It carries size and family but
         not text-transform or letter-spacing, and this label is uppercased and
         tracked out — so the probe measured lowercase untracked "Architecture"
         at 384px while the element rendered "ARCHITECTURE" at 559px. The fit
         then solved for a label 46% wider than it asked for, which is most of
         why it kept coming out too big. */
      probe.style.font = cs.font;
      probe.style.textTransform = cs.textTransform;
      probe.style.letterSpacing = cs.letterSpacing;
      for (const line of t.innerHTML.split(/<br\s*\/?>/i)) {
        probe.textContent = line.replace(/<[^>]*>/g, '').trim();
        host.appendChild(probe);
        widest = Math.max(widest, probe.getBoundingClientRect().width);
        probe.remove();
      }
    }
    if (!widest) return;

    const base = parseFloat(getComputedStyle(titles[0]).fontSize);
    const size = base * ((colW * HUB_FILL) / widest);
    host.style.setProperty('--hub-size', `${size.toFixed(2)}px`);
  }

  /** Depth cues, recomputed from each card's actual angle to the viewer. */
  function paint() {
    // The entrance offset decays to nothing, so once intro is 1 this is exactly
    // the resting transform and there is no residue to drift.
    const settle = (1 - intro) * step * 0.6;
    const a = angle + settle;
    ring.style.transform = horizontal
      ? `translateZ(${(-radius).toFixed(1)}px) rotateY(${a.toFixed(3)}deg)`
      : `translateZ(${(-radius).toFixed(1)}px) rotateX(${a.toFixed(3)}deg)`;
    root.style.setProperty('--intro', intro.toFixed(3));
    for (let i = 0; i < n; i++) {
      // How far this card is from facing the viewer, 0 (front) .. 180 (back).
      let d = Math.abs(((angle - i * step) % 360 + 540) % 360 - 180);
      d = 180 - d;
      const t = d / 180;                        // 1 = front, 0 = directly behind
      const c = cards[i];
      c.style.setProperty('--depth', t.toFixed(3));

      /* --vis is driven by the ANGLE, not by depth, and it is what actually
         stops the ring looking glued.

         On a full cylinder the cards near +/-90 degrees bunch together in
         projection — the same reason ferris-wheel cars crowd at the top — and
         the card on the far side projects back toward the centre. Measured on
         this ring: card 2 (103 deg) overlapped card 1 by 171px, and card 3
         (154 deg) poked 99px out of the FRONT card's own edge. No radius or gap
         fixes that; it is what a cylinder does.

         So everything past about 95 degrees is dropped to a ghost. Front and
         its two immediate neighbours carry the section; the rest still shows
         through the gaps as the back of the wheel, which is the brief, without
         colliding with the cards that have to stay readable. */
      const deg = 180 - d;                      // 0 at the front, 180 behind
      const vis = Math.max(0, Math.min(1, (95 - deg) / 50));
      c.style.setProperty('--vis', vis.toFixed(3));
      // Only the card actually facing the reader should take a click; without
      // this the far side stays in the hit-test and swallows presses aimed at
      // the front through the gaps.
      c.style.pointerEvents = t > 0.72 ? 'auto' : 'none';
      c.setAttribute('aria-hidden', t > 0.72 ? 'false' : 'true');
      c.tabIndex = t > 0.72 ? 0 : -1;
    }
  }

  /* MOTION: a flywheel, not an ease-to-target.

     The first model added each scroll to a target angle and eased toward it, so
     the ring stopped the instant that target was reached — the moment the
     gesture ended, the movement ended. A wheel with mass does not do that.

     Scroll now applies an IMPULSE to a velocity; friction bleeds it away each
     frame; and only once the spin is spent does it settle onto the nearest
     card. So letting go leaves it coasting and slowing, which is what makes it
     feel like an object rather than a slider.

     The two constants are tied together, not chosen separately. A decaying
     velocity travels v/(1-friction) in total, so for one wheel notch (~120px)
     to carry roughly one card:

         impulse = step * (1 - FRICTION) / 120  ->  WHEEL_K

     Changing FRICTION without re-deriving WHEEL_K changes how FAR a notch
     travels, not just how long it coasts. */
  const FRICTION = 0.955;
  let vel = 0;
  let settling = false;

  function tick() {
    if (settling) {
      const d = target - angle;
      if (Math.abs(d) < 0.02) { angle = target; paint(); raf = 0; return; }
      angle += d * 0.12;
    } else {
      angle += vel;
      vel *= FRICTION;
      // Spent. Hand over to the settle, which takes it to the nearest card.
      if (Math.abs(vel) < 0.05) {
        vel = 0;
        settling = true;
        target = Math.round(angle / step) * step;
      }
    }
    paint();
    raf = requestAnimationFrame(tick);
  }

  function run() { if (!raf) raf = requestAnimationFrame(tick); }

  function turn(deltaDeg) {
    // Any new input cancels the settle — otherwise a scroll during the final
    // glide fights it and the ring stutters.
    settling = false;
    vel += deltaDeg;
    run();
  }

  /* Is the pointer actually over the ring, rather than merely inside the
     section's box?

     This distinction was not needed while the wheels were two columns with page
     margins either side — there was always somewhere to put the pointer to
     scroll the page. Stacked full-width and gapless, the two sections tile the
     viewport, and capturing anywhere inside them meant the page could not be
     scrolled at all.

     The live region is the front card's box, stretched along the axis the cards
     travel on and left tight across it. So on a horizontal ring the whole width
     of the band responds, while the strip above and below the cards still
     belongs to the page. */
  function overRing(e) {
    const front = cards.find((c) => c.getAttribute('aria-hidden') === 'false') || cards[0];
    const b = front.getBoundingClientRect();
    if (!b.width) return false;
    const padX = horizontal ? window.innerWidth : b.width * 0.15;
    const padY = horizontal ? b.height * 0.12 : window.innerHeight;
    return e.clientX >= b.left - padX && e.clientX <= b.right + padX
        && e.clientY >= b.top - padY && e.clientY <= b.bottom + padY;
  }

  /* `data-lenis-prevent` on the container keeps Lenis from also consuming this,
     and preventDefault stops the page scrolling underneath — but only once the
     pointer is genuinely over the ring. Returning early leaves the event
     untouched, so the page scrolls normally everywhere else. */
  root.addEventListener('wheel', (e) => {
    if (!overRing(e)) return;
    e.preventDefault();
    turn((horizontal ? -1 : 1) * (e.deltaY + e.deltaX) * WHEEL_K);
  }, { passive: false });

  // Keyboard: the wheel is a list, and a list has to be operable without a
  // mouse. Arrows move one card; the roving tabindex above keeps only the
  // front card in the tab order.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { turn(step * (1 - FRICTION)); e.preventDefault(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { turn(-step * (1 - FRICTION)); e.preventDefault(); }
  });

  // Drag, for trackpads and touch. Vertical only — horizontal is not this
  // control's axis and stealing it would break page gestures.
  let dragging = false;
  let lastY = 0;
  let lastX = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    if (!overRing(e)) return;
    dragging = true; lastY = e.clientY; lastX = e.clientX;
    root.setPointerCapture?.(e.pointerId);
  });
  root.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const d = horizontal ? (e.clientX - lastX) : (e.clientY - lastY);
    lastY = e.clientY; lastX = e.clientX;
    turn((horizontal ? -1 : 1) * d * WHEEL_K * 1.6);
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    root.releasePointerCapture?.(e.pointerId);
    // No snap() call: releasing a drag leaves whatever velocity the last moves
    // built, so a flick coasts. The settle happens when that runs out.
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
  /* Fires once, when the wheel is first genuinely on screen. rootMargin pulls
     it slightly early so the settle is already underway by the time the reader
     is looking straight at it — an entrance that begins after you arrive reads
     as a delayed reaction. */
  function runIntro() {
    if (introRunning) return;
    introRunning = true;
    if (reducedMotion) { intro = 1; paint(); return; }
    const t0 = performance.now();
    const DUR = 900;
    (function step_(now) {
      const t = Math.min(1, (now - t0) / DUR);
      // Cubic ease-out: quick to commit, slow to settle.
      intro = 1 - Math.pow(1 - t, 3);
      paint();
      if (t < 1) requestAnimationFrame(step_);
    })(t0);
  }

  new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) runIntro();
  }, { rootMargin: '-12% 0px -12% 0px' }).observe(root);

  const ro = new ResizeObserver(() => measure());
  ro.observe(cards[0]);
  ro.observe(root);
  measure();

  AUTO_H.addEventListener('change', () => {
    const next = wanted();
    if (next === horizontal) return;
    horizontal = next;
    angle = 0; target = 0;      // the ring is solved for the other axis now
    measure();
  });

  if (reducedMotion) {
    // No easing loop: jumps straight to the target so the wheel still works,
    // it just does not spin to get there.
    ring.style.transition = 'none';
  }
}
