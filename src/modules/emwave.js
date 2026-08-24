/**
 * A travelling electromagnetic wave, behind the two Direction headings.
 *
 * WHY NOT REUSE THE ONE IN wheel.js
 * --------------------------------
 * That one is welded to the Lissajous: it samples the solved curve, rides the
 * ring's rotation for its phase, and sits at a depth measured from the deepest
 * card. None of that exists here. What carries over is the PALETTE, so the two
 * sections look like they belong to one site.
 *
 * The figure itself is four sinusoids: each colour a pair at two amplitudes,
 * and the second colour the exact negation of the first. See draw().
 *
 * The colours are read from --tag-msc and --tag-arch rather than written out,
 * so the two waves cannot drift apart when the palette changes. Those are the
 * same tokens the projects wheel tags its two collections with.
 *
 * WHAT IT COSTS
 * -------------
 * One canvas, 160 points a frame, two strokes. It runs only while the section
 * is on screen — an IntersectionObserver parks the loop otherwise, so a reader
 * anywhere else on this long page pays nothing. Under reduced motion it draws
 * one static frame and stops: the figure is still there, it just does not move.
 */

const CFG = {
  points: 160,
  freq: 3.2,          // crests across the width
  speed: 0.12,        // travel, in wavelengths a second
  amp: 0.62,          // of half the canvas height, at the outer edges
  width: 2,
  opacity: 0.5,
  axisOpacity: 0.14,
};

export function initEmWave(host) {
  const el = typeof host === 'string' ? document.querySelector(host) : host;
  if (!el) return null;

  const canvas = el.querySelector('canvas');
  if (!canvas || !canvas.getContext) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  /* THE SECTION, WHICH IS NOT THE CANVAS ANY MORE.

     The canvas is fixed to the viewport (see sections.css), so its own rect
     is the viewport on every frame and is useless for anything that wants to
     know where #direction has got to. Everything that used to read the host
     for that -- the drive, the visibility gate -- reads this instead. */
  const sect = el.closest('#direction') || el.parentElement;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, dpr = 1;
  let hue = ['#f87171', '#38bdf8'];
  let raf = 0;
  let visible = false;
  let drive = 0;      // 0 to 1, how far the section has crossed the viewport
  let seam = 0.5;     // where the two colours meet, as a fraction of the width

  /* THE MEETING POINT IS MEASURED, NOT ASSUMED TO BE THE MIDDLE.

     The canvas spans the section; the two headings are a centred PAIR inside a
     narrower wrap, and the two columns are different widths because their text
     is. Measured on a 1113px canvas the gap between the columns sat at x=510
     while the canvas centre was 557 — so a wave that met at w/2 met 46px to the
     right of the seam it was supposed to be meeting at, which is exactly the
     sort of near-miss that reads as sloppiness rather than as a mistake.

     Falls back to the middle if the columns are not there, so the figure still
     draws if the markup changes under it. */
  function readSeam() {
    const cols = el.parentElement && el.parentElement.querySelectorAll('.dirs__col');
    if (!cols || cols.length !== 2 || !w) { seam = 0.5; return; }
    const rf = el.getBoundingClientRect();
    const a = cols[0].getBoundingClientRect();
    const b = cols[1].getBoundingClientRect();
    if (!rf.width) { seam = 0.5; return; }
    seam = Math.min(0.85, Math.max(0.15, ((a.right + b.left) / 2 - rf.left) / rf.width));
  }

  /* AMPLITUDE FOLLOWS THE SCROLL.

     Measured from the section crossing the viewport rather than from page
     offset, so it behaves the same wherever the section ends up as the page
     grows. 0 as it enters, 1 as it leaves.

     Read in the draw loop, not in a scroll listener: the loop is already
     running whenever this is on screen, and a listener would do the same
     getBoundingClientRect work again on a different clock. Reading layout once
     per frame, at the top of the frame, is the cheap version of this. */
  function readDrive() {
    const r = sect.getBoundingClientRect();
    const span = innerHeight + r.height;
    if (span <= 0) return;
    drive = Math.min(1, Math.max(0, (innerHeight - r.top) / span));
  }

  /* THE PROJECTS PALETTE, both halves. --tag-msc is the warm one there and it
     is a red rather than the site's yellow --amber; taking "amber" at face
     value and reaching for --amber gave a yellow that matched the headings and
     not the section this figure is meant to rhyme with. The pair has to be the
     pair the wheel already uses, or the two sections stop looking related. */
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const a = cs.getPropertyValue('--tag-msc').trim();
    const b = cs.getPropertyValue('--tag-arch').trim();
    if (a) hue[0] = a;
    if (b) hue[1] = b;
  }

  /* THE TWO SIGNALS THE SECTION'S OWN CLOCK PUBLISHES.

     Read off the root element's INLINE style, not through getComputedStyle.
     main.js sets them with setProperty on document.documentElement, so the
     value is sitting on that style object and reading it back is a property
     lookup. getComputedStyle here would force a style resolution on every
     frame of a loop that already does one layout read for the drive, to
     recover a number that is not styled by anything.

     The fallbacks are the FINISHED state, full reach and not gone, so the
     figure is whole for a reader the scrub never reaches and for the gap
     between this module mounting on idle and the trigger first publishing. */
  const rootStyle = document.documentElement.style;
  function signal(name, fallback) {
    const v = rootStyle.getPropertyValue(name);
    if (v === '') return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /* WHERE THE FIGURE SITS ON THE SCREEN: the middle of it, always.

     This briefly tracked the section centre and eased to the screen centre,
     to keep the wave under headings that were still travelling. The headings
     do not travel any more -- they are fixed to the middle of the viewport
     (see layout.css) -- so both are simply centred on the same point and the
     tracking was solving a problem that no longer exists.

     h is the canvas height and the canvas is the viewport, so this is the
     centre of the screen and not the centre of the section. */
  function figureY() {
    return h / 2;
  }

  function size() {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readSeam();
    return true;
  }

  function draw(now) {
    raf = 0;
    if (!w || !h) return;
    /* A frame already queued when the observer parked would repaint the
       canvas straight after stop() had cleared it, and there would be
       nothing left to clear it again. */
    if (!visible) { ctx.clearRect(0, 0, w, h); return; }
    const travel = (now / 1000) * CFG.speed * Math.PI * 2;
    const midY = figureY();
    const midX = w * seam;
    readDrive();
    readSeam();
    /* 0.30 floor: at zero the figure would vanish entirely as the section
       entered, and a background that disappears reads as a rendering fault
       rather than as a response. It breathes between a third and full. */
    const amp = (h / 2) * CFG.amp * (0.30 + 0.70 * drive);

    /* REACH IS HOW MUCH OF THE WIDTH EXISTS YET, measured from the seam out.
       At 0 the two halves collapse onto the same x and the figure is a point;
       at 1 it spans the canvas. LIFE is the other end of the crossing: the
       whole figure fading once the mirrors of the next section are up. */
    const reach = Math.min(1, Math.max(0, signal('--dir-wave', 1)));
    const life = 1 - Math.min(1, Math.max(0, signal('--dir-out', 0)));

    ctx.clearRect(0, 0, w, h);
    if (life <= 0.004) {
      /* Gone, but the loop stays alive: this is a scrub position and not a
         one-shot, so scrolling back up has to bring it straight back. */
      if (visible && !reduced) raf = requestAnimationFrame(draw);
      return;
    }

    const spanL = midX * reach;
    const spanR = (w - midX) * reach;

    /* The axis grows with it. Left full width it would be a rule lying across
       an empty section before anything else arrived, which gives away that a
       point is about to become a line. */
    ctx.globalAlpha = CFG.axisOpacity * life;
    ctx.strokeStyle = hue[1];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX - spanL, midY);
    ctx.lineTo(midX + spanR, midY);
    ctx.stroke();

    /* THE SEED.

       At reach 0 both halves are a zero-length path, and a zero-length stroke
       paints nothing in canvas however the caps are set. Without this the
       figure would not grow out of a point, it would appear at the first
       reach wide enough to stroke. A filled dot at the seam covers that, and
       dissolves over the first 24px of opening so it never sits on top of the
       finished wave.

       hue[0] because the left colour owns the seam going outward. Either
       would do at this size, and picking one stops it flickering between. */
    const seed = 1 - Math.min(1, (spanL + spanR) / 24);
    if (seed > 0.01) {
      ctx.globalAlpha = CFG.opacity * life * seed;
      ctx.fillStyle = hue[0];
      ctx.beginPath();
      ctx.arc(midX, midY, CFG.width, 0, Math.PI * 2);
      ctx.fill();
    }

    /* TWO HALVES, MIRRORED, GROWING OUTWARD.

       Amber runs under Research on the left, blue under Design on the right,
       and the right half is the left negated — so wherever amber is above the
       axis, blue is the same distance below it.

       The amplitude envelope is |x - centre|, so both start flat where the two
       headings meet and open up toward the outer edges. That is the right way
       round for this layout: the seam between the columns is the one place the
       eye needs to be quiet, and the margins are the one place there is room
       for the figure to be large.

       Squared, not linear. A linear ramp is already visibly wide a fifth of the
       way out and the "starting small" reads as a brief flat spot rather than a
       growth; squaring holds it near zero across the middle third and then
       opens quickly, which is what makes it look like it is growing at all.

       Each colour is still a PAIR at two amplitudes — the double wave — so each
       side is a ribbon rather than a line. */
    const AMPS = [1, 0.55];
    for (let k = 0; k < 2; k++) {
      const sign = k === 0 ? -1 : 1;        // screen y runs downward
      /* Each colour runs from the seam OUTWARD to wherever reach has got to,
         so the handover stays where the headings meet and the two ends walk
         away from it together. */
      const x0 = k === 0 ? midX - spanL : midX;
      const x1 = k === 0 ? midX : midX + spanR;
      if (x1 - x0 < 0.5) continue;          // still the seed, nothing to stroke
      /* Points in proportion to the width actually drawn, so a half open wave
         costs half the work rather than crowding the full count into a sliver. */
      const steps = Math.max(2, Math.round(CFG.points * ((x1 - x0) / w)));
      ctx.strokeStyle = hue[k];
      for (let a = 0; a < AMPS.length; a++) {
        ctx.globalAlpha = CFG.opacity * life * (a === 0 ? 1 : 0.62);
        ctx.lineWidth = CFG.width * (a === 0 ? 1 : 0.8);
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = x0 + (x1 - x0) * (i / steps);
          /* Phase off ABSOLUTE x, never off the drawn span. Tie it to the
             span and the crests slide along the wave as it opens, which
             reads as the figure moving sideways rather than extending, and
             the two halves stop being mirrors of each other. */
          const t = x / w;
          const grow = Math.pow(Math.abs(x - midX) / midX, 2);
          const y = midY + sign * amp * AMPS[a] * grow
                  * Math.sin(CFG.freq * t * Math.PI * 2 - travel);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (visible && !reduced) raf = requestAnimationFrame(draw);
  }
  function run() {
    if (raf || !visible || !w) return;
    raf = requestAnimationFrame(draw);
  }

  /* PARKING MUST ALSO WIPE THE CANVAS.

     This only cancelled the frame. That was harmless while the canvas was
     absolute inside #direction: the last frame stayed painted, but it stayed
     painted inside a section that was off screen, so nobody saw it.

     Fixed to the viewport it is a different object. The canvas is now over
     whatever the reader is looking at, so the leftover frame -- in practice the
     seed dot, the smallest and last thing drawn before the section left --
     sat in the middle of every other section on the page. Measured at y=411
     with #direction 4064px below: 29 painted pixels still on the canvas.

     So the rule is that nothing is painted unless the section is on screen,
     and leaving has to clear rather than merely stop. */
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (w && h) ctx.clearRect(0, 0, w, h);
  }

  readPalette();
  if (!size()) return null;

  /* Parked unless on screen. This section sits well down a very long page, so
     without the gate the loop would run for the whole visit to animate
     something nobody is looking at. */
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) { if (reduced) requestAnimationFrame(draw); else run(); }
    else stop();
  }, { threshold: 0 }).observe(sect);

  /* Under reduced motion the loop does not run, so the scroll response needs
     its own trigger or the amplitude would freeze at whatever it was when the
     section appeared. Still one draw per scroll frame, never a loop. */
  if (reduced) {
    let sRaf = 0;
    window.addEventListener('scroll', () => {
      if (sRaf || !visible) return;
      sRaf = requestAnimationFrame((t) => { sRaf = 0; draw(t); });
    }, { passive: true });
  }

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      if (size() && visible) { if (reduced) requestAnimationFrame(draw); else run(); }
    });
  }, { passive: true });

  return { destroy() { stop(); } };
}
