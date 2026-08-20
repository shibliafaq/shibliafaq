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

/* ============================================================ LISSAJOUS PATH

   The cards ride a 1:2 Lissajous curve at a phase offset of pi/2 — the
   figure-eight in the middle of the classic Bowditch table — carried into three
   dimensions.

       x = Rx * cos(theta)          // sin(theta + pi/2), the pi/2 column
       y = Ry * sin(2 * theta)      // the 1:2 frequency ratio
       z = Rz * sin(theta)          // the third dimension

   Look at it head-on, drop z, and what is left is exactly the curve in that
   table cell: x and y alone trace the figure-eight. What z adds is that the two
   lobes of the eight are no longer in the same plane — x and z together sweep a
   circle, so the near lobe swings toward the reader while the far one falls
   away. The crossing point of the eight becomes a real crossing in depth rather
   than an overlap on a flat page, which is the whole reason to do it in 3D.

   WHY THE CARDS DO NOT ROTATE WITH THE PATH
   A card banked into the tangent of the curve is edge-on for much of the loop
   and unreadable. These are billboards: they travel the path and keep facing
   the reader. The depth cue is scale and blur from z, which the scene's
   perspective already provides for free on the scale side.

   WHY z DRIVES EVERYTHING ELSE
   On the cylinder, "how far is this card from facing me" was an angle. Here
   there is no facing to speak of, so the same job falls to z: nearest is
   frontmost, gets full opacity and takes the click; the far half dims, blurs
   and stops being a hit target. `frontCard()` needs no change at all — the
   nearest card projects largest, which is the property it was already using. */
const LISS = {
  /* HOW MUCH OF THE STAGE THE FIGURE COVERS, not an amplitude.

     These are the rendered envelope -- curve plus the half-card that overhangs
     each end, after perspective -- as a fraction of the stage. lissFit() solves
     the amplitude that achieves them and recentres what is left, which is the
     only way to say "cover the width" about a shape that is not symmetric.
     See the ENVELOPE FIT block below.

     Rz is deep enough that the near card is clearly in front without the far
     one shrinking to nothing. */
  fillX: 0.99, fillY: 0.92, rz: 0.60,

  /* THE FRONT CARD IS A FRACTION OF THE STAGE, NOT A SCALE FACTOR.

     It used to be a scale -- `big: 0.86` -- applied to a card that is itself
     sized `36vw`. Two separate things then multiplied it before it reached the
     screen. The card is sized from the VIEWPORT and the amplitudes from the
     STAGE, so their ratio drifts with the layout; and `.wheel__stage` carries
     `perspective: 1000px`, which magnifies whatever sits at +Rz. On a 1728px
     stage that magnification is 1.81x, so a "0.86 scale" card rendered 1076px
     -- wider than the curve's entire 1036px horizontal span. The path could not
     possibly show, because a single card covered all of it. Measured at that
     setting: 82% of all card area was overlap, and two cards hung off the
     viewport edge.

     Expressed as a fraction of the stage and divided back through the
     perspective, the front card is 0.28 of the stage at every viewport and the
     constant means what it says. */
  front: 0.28,

  /* THE FAR CARDS SHRINK; THE NEAR ONE DOES NOT GROW.

     Perspective already enlarges with depth, so a scale ramp that ALSO grows
     toward the reader double-counts the same cue -- which is precisely how the
     front card reached 1076px. This ramp therefore only ever reduces: it is 1
     at the front and `back` at the rear, so it buys depth gradient by taking
     size off the far cards instead of adding it to the near one.

     That distinction is worth the whole difference. Scanned across amplitude,
     depth and scale, a 490px front card costs 31% overlap when the ramp grows
     forward and 10% when it shrinks backward -- and the shrinking one has the
     STEEPER gradient (9.1x front-to-back against 2.6x). Same front card, a
     third of the collisions.

     The exponent is 2.2 so the falloff is gentle across the front of the curve,
     where cards are being read, and steep at the back, where they are
     structure. Linear left the front three near-identical and the ordering
     stopped being legible. */
  back: 0.32, falloff: 2.2,
};

/** Position on the 1:2, pi/2 Lissajous curve at phase `th`, in unit amplitudes. */
/* PHI_Z BREAKS A SYMMETRY THAT PUTS TWO CARDS AT THE FRONT.

   With z = sin(theta) the depth axis is symmetric about theta = pi/2: theta and
   pi - theta return the SAME z. The arc-length distribution is symmetric about
   the same axis, so the cards paired up -- measured depths came out 0.99, 0.99,
   0.91, 0.91, 0.68, 0.68 and so on, seven pairs, two cards permanently sharing
   the front at identical size. With size carrying depth that is not a near-miss,
   it is the cue failing: there is no single frontmost card to read.

   Phasing z alone moves the symmetry axis off the one the card set is symmetric
   about, and the pairing disappears. It stays a genuine Lissajous -- x against z
   is 1:1 with a phase offset, x against y is still the 1:2 of the reference
   figure -- and viewed head-on the drawing is unchanged, because the front
   projection never involved z. It only tilts the curve in depth. */
const PHI_Z = 0.42;

function lissAt(th) {
  return {
    x: Math.cos(th),
    y: Math.sin(2 * th),
    z: Math.sin(th + PHI_Z),
  };
}

/* EVEN SPACING ALONG THE CURVE, NOT ALONG THETA.

   Placing card i at theta = i * 2pi/N is the obvious thing and it clumps. A
   Lissajous does not travel at constant speed: it crawls through the turns at
   the ends of each lobe and races through the crossing in the middle, so equal
   steps of theta put cards nose-to-tail at the extremes and leave gaps through
   the centre. With fourteen cards that reads as a pile-up, not a path.

   The fix is to walk the curve once, accumulate real arc length, and invert it:
   card i goes wherever the curve has travelled i/N of its total distance. Built
   once at module load because the shape never changes -- only its amplitudes do,
   and those scale every segment equally, so the same table is correct at any
   viewport size. */
const ARC_STEPS = 2048;
const ARC = (() => {
  const cum = new Float64Array(ARC_STEPS + 1);
  let prev = lissAt(0);
  for (let i = 1; i <= ARC_STEPS; i++) {
    const th = (i / ARC_STEPS) * 2 * Math.PI;
    const p = lissAt(th);
    // Unit amplitudes: the table is a shape, not a size.
    cum[i] = cum[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
    prev = p;
  }
  return cum;
})();
const ARC_TOTAL = ARC[ARC_STEPS];

/** The theta at which the curve has covered fraction `f` of its total length. */
function thetaAtFraction(f) {
  const target = ((f % 1) + 1) % 1 * ARC_TOTAL;
  let lo = 0, hi = ARC_STEPS;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ARC[mid] < target) lo = mid + 1; else hi = mid;
  }
  // Linear interpolation inside the segment we landed on.
  const i = Math.max(1, lo);
  const span = ARC[i] - ARC[i - 1] || 1;
  const t = (target - ARC[i - 1]) / span;
  return ((i - 1 + t) / ARC_STEPS) * 2 * Math.PI;
}

/* ============================================================ ENVELOPE FIT

   FITTING THE FIGURE TO THE STAGE, RATHER THAN GUESSING AMPLITUDES.

   `long` and `short` used to be amplitudes: fractions of the stage that the
   curve's unit radius was multiplied by. The trouble is that what the reader
   sees is not the curve, it is the curve AFTER perspective, PLUS half a card at
   each end -- and neither of those is proportional to the amplitude. So a
   number like 0.27 said nothing about how much of the stage got covered.
   Measured, it covered 75%, and unevenly: 384px of dead space on the left
   against 43px on the right.

   That lopsidedness is PHI_Z showing up in the drawing. Tilting the curve in
   depth is what gives the eight a near lobe and a far one, but the near lobe is
   magnified (1.25x at theta 0) and the far one shrunk (0.83x at theta pi), so
   the figure is genuinely wider on the near side. It is not a bug in the curve;
   it is what a tilted figure-eight looks like. It just cannot be centred by
   choosing a symmetric amplitude, because the shape itself is not symmetric.

   So the amplitude is SOLVED instead of chosen. Walk the curve, compute each
   sample's rendered offset (including its magnification) and the half-card that
   sticks out there, and find the amplitude whose envelope spans exactly
   `fillX` of the stage. Then shift the whole thing so that envelope is centred.
   `fillX` is the number a person actually wants to set: "cover the width".

   THE SHIFT HAS TO BE APPLIED AFTER PERSPECTIVE.
   Adding a constant to --lx does not move the figure by a constant on screen --
   it is multiplied by each card's own magnification, so the near cards would
   slide further than the far ones and the curve would shear. Dividing the
   wanted screen shift by that same magnification cancels it exactly, which is
   the same trick the scale uses. */
const FIT_STEPS = 512;

function lissFit(W, H, cardW, cardH, P) {
  const upright = H > W;
  const Rz = Math.min(W, H) * LISS.rz;
  const mFront = P / (P - Rz);
  const sBase = (W * LISS.front) / (cardW * mFront);

  const n = FIT_STEPS;
  const ux = new Float64Array(n);   // rendered x offset per unit amplitude
  const uy = new Float64Array(n);
  const hw = new Float64Array(n);   // half card width where the curve is there
  const hh = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = lissAt((i / n) * 2 * Math.PI);
    const m = P / (P - p.z * Rz);
    const t = (p.z + 1) / 2;
    const sc = sBase * (LISS.back + (1 - LISS.back) * Math.pow(t, LISS.falloff));
    // The slow frequency (cos) takes whichever screen axis has room.
    ux[i] = (upright ? p.y : p.x) * m;
    uy[i] = (upright ? p.x : p.y) * m;
    hw[i] = (cardW * sc * m) / 2;
    hh[i] = (cardH * sc * m) / 2;
  }

  /* span(amp) is a max of linear functions of amp, so it is convex, piecewise
     linear and increasing -- a secant lands on the answer in a few steps, and
     the `amp = 0` seed is exact free information (it is just the widest card). */
  const solve = (u, half, target) => {
    const envelope = (amp) => {
      let hi = -Infinity, lo = Infinity;
      for (let i = 0; i < n; i++) {
        const e = amp * u[i];
        if (e + half[i] > hi) hi = e + half[i];
        if (e - half[i] < lo) lo = e - half[i];
      }
      return { span: hi - lo, mid: (hi + lo) / 2 };
    };
    let a0 = 0, s0 = envelope(0).span;
    let a1 = Math.max(1, target / 2), s1 = envelope(a1).span;
    for (let k = 0; k < 16 && Math.abs(s1 - target) > 0.25; k++) {
      const d = s1 - s0;
      let next = Math.abs(d) < 1e-9 ? a1 * 1.5 : a1 + ((target - s1) * (a1 - a0)) / d;
      if (!isFinite(next) || next < 0) next = a1 * 1.5;
      a0 = a1; s0 = s1;
      a1 = next; s1 = envelope(a1).span;
    }
    const f = envelope(a1);
    return { amp: a1, mid: f.mid };
  };

  const fx = solve(ux, hw, W * LISS.fillX);
  const fy = solve(uy, hh, H * LISS.fillY);
  return {
    upright, Rz, sBase,
    ampX: fx.amp, ampY: fy.amp,
    // Negated: the envelope's centre is where it currently sits, and we want
    // that moved to the stage's centre.
    shiftX: -fx.mid, shiftY: -fy.mid,
  };
}

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

  /* Layout mode. 'lissajous' puts the cards on the Bowditch figure-eight
     instead of a cylinder; everything else -- the flywheel, the settle, the
     derived front card -- is shared, which is why this is a branch inside
     paint() rather than a second module. */
  const path = root.dataset.wheelPath === 'lissajous' ? 'lissajous' : 'ring';
  if (path === 'lissajous') root.classList.add('wheel--liss');

  const step = 360 / n;
  let radius = 0;
  /* The card's UNTRANSFORMED box and the stage's perspective, both cached by
     measure(). The Lissajous branch solves its scale from these, so they have
     to be the laid-out values rather than the CSS text: the card is
     `min(100%, 36vw)` and the perspective lives on `.wheel__stage`, and reading
     either one per frame would thrash layout on every tick of the flywheel. */
  let cardW0 = 0;
  let cardH0 = 0;
  /* The solved envelope fit, and the key it was solved for. Re-solved only when
     the stage or the card box actually changes -- it is 16 secant steps over 512
     samples, which is nothing once but wasteful every frame. */
  let fit = null;
  let fitKey = '';
  let persp = 1000;
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
    cardW0 = cards[0].offsetWidth || cardW0;
    cardH0 = cards[0].offsetHeight || cardH0;
    /* Read, never assumed to be 1000. The value is set in sections.css and a
       drift between the two would put the front card at the wrong size with
       nothing to show why. */
    const stage = root.querySelector('.wheel__stage');
    const pv = stage && parseFloat(getComputedStyle(stage).perspective);
    if (pv) persp = pv;
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
    root.style.setProperty('--intro', intro.toFixed(3));

    if (path === 'lissajous') {
      /* One shared parameter walks the curve; the cards are spread evenly along
         it. `angle` is still in degrees because the whole input model -- the
         impulse constant, the friction, the settle-to-nearest -- is expressed in
         card steps, and reusing it means the flywheel feels identical on both
         layouts. Only the placement differs. */
      const th0 = (a * Math.PI) / 180;
      // Amplitudes from the stage, so the figure scales with the viewport.
      const W = root.clientWidth || 1;
      const H = root.clientHeight || 1;
      /* ORIENTATION FOLLOWS THE CONTAINER.

         The Bowditch table draws this figure lying down, two lobes side by
         side, and that is what a 1:2 ratio gives when x carries the slow
         frequency. It needs width. These wheels live in a column beside the
         section heading -- measured 619x792 on a 1440 desktop -- so laid down
         the lobes ran straight over the title.

         Standing it up is the same curve with the two axes exchanged: the slow
         frequency goes on y, the doubled one on x, and the eight is upright.
         Nothing about the mathematics changes, and a figure-eight has no
         natural up, so this is a framing decision rather than a different
         shape. Whichever axis has room gets the slow frequency. */
      /* Perspective magnifies POSITION as well as size, so a card at the front
         is both enlarged and pushed further from centre -- which is what threw
         two cards off the viewport before, and what makes the figure lopsided
         once the curve is tilted in depth. Both are handled in lissFit(). */
      const key = `${W}x${H}x${cardW0}x${cardH0}x${persp}`;
      if (!fit || fitKey !== key) {
        fit = lissFit(W, H, cardW0 || W * 0.4, cardH0 || H * 0.48, persp);
        fitKey = key;
      }
      const { upright, Rz, sBase } = fit;

      ring.style.transform = 'none';
      for (let i = 0; i < n; i++) {
        // Fraction of the way round the curve, by DISTANCE, offset by the
        // scroll phase. i/n is then genuinely even spacing on the path.
        const th = thetaAtFraction(th0 / (2 * Math.PI) + i / n);
        const p = lissAt(th);
        const c = cards[i];
        /* This card's own perspective magnification. The recentring shift is
           divided by it so that what lands on screen is a constant offset
           rather than one that grows with depth and shears the curve. */
        const m = persp / (persp - p.z * Rz);
        // p.x carries cos(theta) -- the SLOW frequency -- and p.y sin(2 theta).
        // Upright swaps which screen axis each one drives.
        const sx = (upright ? p.y : p.x) * fit.ampX + fit.shiftX / m;
        const sy = (upright ? p.x : p.y) * fit.ampY + fit.shiftY / m;
        c.style.setProperty('--lx', `${sx.toFixed(1)}px`);
        c.style.setProperty('--ly', `${sy.toFixed(1)}px`);
        c.style.setProperty('--lz', `${(p.z * Rz).toFixed(1)}px`);

        /* z runs -1 (far) .. +1 (near); t is the same 1-at-the-front scale the
           cylinder used, so every depth rule downstream is untouched. */
        const t = (p.z + 1) / 2;
        c.style.setProperty('--depth', t.toFixed(3));

        /* SIZE IS A FUNCTION OF DEPTH, not of hover.

           The card at the front is the one being read, so it carries full size;
           everything behind it shrinks smoothly as it recedes. That is the
           whole depth cue, and it is continuous -- there is no state to enter
           or leave, and nothing changes size because a pointer happened to
           cross it. A hover that resized the tile fought this: the card under
           the cursor jumped to full size wherever it was on the curve, which
           contradicted the very ordering the path exists to show.

           The shape of the falloff, and why it shrinks the back rather than
           growing the front, is set out on LISS above. */
        const ramp = LISS.back + (1 - LISS.back) * Math.pow(t, LISS.falloff);
        const sc = sBase * ramp;
        c.style.setProperty('--liss-s', sc.toFixed(3));
        /* On the cylinder --vis existed because cards bunch near +/-90 degrees
           and the far side projects back over the front. A path has no such
           pile-up: the curve separates them in x and y as well as z, so
           visibility can follow depth directly and the far cards stay legible
           as structure. */
        c.style.setProperty('--vis', Math.max(0, Math.min(1, (t - 0.12) / 0.5)).toFixed(3));

        // Same rule as the ring: only the card nearest the reader takes a click.
        /* Lower than the ring's 0.72. On a cylinder everything past the front
           three overlapped, so only the front card could safely take a
           pointer. The curve separates cards in x and y as well as z, so the
           whole near half can be hovered -- which is what makes
           hover-to-enlarge usable rather than a front-card-only trick. */
        const live = t > 0.34;
        c.style.pointerEvents = live ? 'auto' : 'none';
        c.setAttribute('aria-hidden', live ? 'false' : 'true');
        c.tabIndex = live ? 0 : -1;
      }
      return;
    }

    ring.style.transform = horizontal
      ? `translateZ(${(-radius).toFixed(1)}px) rotateY(${a.toFixed(3)}deg)`
      : `translateZ(${(-radius).toFixed(1)}px) rotateX(${a.toFixed(3)}deg)`;
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
