/**
 * A travelling electromagnetic wave, behind the two Direction headings.
 *
 * WHY NOT REUSE THE ONE IN wheel.js
 * --------------------------------
 * That one is welded to the Lissajous: it samples the solved curve, rides the
 * ring's rotation for its phase, and sits at a depth measured from the deepest
 * card. None of that exists here. What carries over is the PALETTE and the
 * physics — E and B orthogonal, same frequency, same phase — because the point
 * is that the two sections look like they belong to one site.
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
  freq: 2.6,          // crests across the width
  speed: 0.12,        // travel, in wavelengths a second
  amp: 0.26,          // of half the canvas height
  oblique: (58 * Math.PI) / 180,  // the B field's angle out of the page
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

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0, h = 0, dpr = 1;
  let hue = ['#f87171', '#38bdf8'];
  let raf = 0;
  let visible = false;

  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const a = cs.getPropertyValue('--tag-msc').trim();
    const b = cs.getPropertyValue('--tag-arch').trim();
    if (a && b) hue = [a, b];
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
    return true;
  }

  function draw(now) {
    raf = 0;
    if (!w || !h) return;
    const travel = (now / 1000) * CFG.speed * Math.PI * 2;
    const midY = h / 2;
    const amp = (h / 2) * CFG.amp;
    const cO = Math.cos(CFG.oblique);
    const sO = Math.sin(CFG.oblique);

    ctx.clearRect(0, 0, w, h);

    /* The axis the wave travels along. Faint: it is there to say the two
       fields share one line, not to be looked at. */
    ctx.globalAlpha = CFG.axisOpacity;
    ctx.strokeStyle = hue[1];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    /* E vertical, B oblique — the same relationship the projects wave draws,
       so the two read as the same diagram seen from different distances. */
    for (let k = 0; k < 2; k++) {
      ctx.globalAlpha = CFG.opacity;
      ctx.strokeStyle = hue[k];
      ctx.lineWidth = CFG.width;
      ctx.beginPath();
      for (let i = 0; i <= CFG.points; i++) {
        const t = i / CFG.points;
        const x = t * w;
        const s = Math.sin(CFG.freq * t * Math.PI * 2 - travel);
        const a = amp * s;
        const px = k === 0 ? x : x + a * cO * 0.55;
        const py = k === 0 ? midY - a : midY - a * sO;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (visible && !reduced) raf = requestAnimationFrame(draw);
  }

  function run() {
    if (raf || !visible || !w) return;
    raf = requestAnimationFrame(draw);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
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
  }, { threshold: 0 }).observe(el);

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
