import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';
import './styles/i18n.css';

import { initScroll, ScrollTrigger, reducedMotion } from './modules/scroll.js';
import { initReveals } from './modules/reveals.js';
import { initHero } from './modules/hero.js';
import { initProjects } from './modules/projects.js';
import { initSkills } from './modules/skills.js';
import { initExperience } from './modules/experience.js';
import { initModal, initArch, initLightbox } from './modules/modal.js';
import { initNav, initCursor, initForm } from './modules/ui.js';

const idleInit = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn)
  : (fn) => setTimeout(fn, 200);

initScroll();
initNav();
initCursor();
initHero();
initReveals();
initProjects();
// Runs on load rather than near-viewport: it swaps the tag list for the canvas,
// and doing that late would show the list and then visibly replace it. The rAF
// loop inside is still gated on the section being on screen.
initSkills();
initModal();
initArch();
initLightbox();
initForm();

// Language switching. Loaded on idle: English is already in the HTML, so
// nothing on first paint depends on the dictionary.
idleInit(() => import('./i18n/index.js').then((m) => m.initI18n()));

// The Experience map. On idle rather than near-viewport for the same reason as
// the skills field — it replaces the timeline, and doing that as the reader
// arrives would show the list and then visibly swap it. The 220 KB of sheets and
// the composer live in a lazy chunk inside, and nothing is fetched at all below
// 900px or under reduced motion.
idleInit(() => initExperience());

// three.js is the heaviest dependency on the page. The hero needs it, but not
// on the critical path — the CSS starfield paints instantly and the globe fades
// in over it, so first paint never waits on a 126 KB chunk plus two textures.
idleInit(() => {
  if (!document.getElementById('heroGlobe')) return;

  import('./modules/earth.js').then((m) => {
    /* host = the WRAPPER, not the sticky stage.
       Drag is bound to the host, and the stage is a SIBLING of the two
       sections rather than their ancestor — so a pointerdown anywhere over the
       copy (which covers the whole viewport) never reached it, and the
       zoomed-out globe could not be turned at all. Measured, not guessed:
       elementFromPoint at the centre of the frame returned #future with no
       path to the stage. Binding to .worlds puts a common ancestor under every
       pointerdown in both sections, and earth.js still ignores anything inside
       a link or a button. */
    const earth = m.initEarth({ host: 'worlds' });
    if (!earth) return;   // no WebGL — the CSS starfield stands in

    const worlds = document.getElementById('worlds');
    const stage = document.getElementById('worldsStage');
    if (!worlds || !stage) return;

    /* THE TRANSITION.
       One scrub over the whole two-section stage drives both channels. They
       deliberately do NOT share a range:

         zoom   0 -> 1   over progress 0.00 .. 0.72
         decay  0 -> 1   over progress 0.30 .. 0.95

       The camera moves first and alone. The reader pulls back on a planet they
       already recognise, and only once it is clearly the whole Earth does the
       surface begin to turn. Crossfading in lockstep with the dolly reads as a
       rendering glitch — two things changing at once, neither legible. Ending
       the decay before the scrub ends leaves the failed Earth sitting still and
       fully formed while the copy is read.

       ScrollTrigger, not a scroll listener: Lenis owns scrolling here, and
       window.scrollY lags its interpolated position by a frame or more. */
    const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    // Ease the framing only. Linear decay is correct — a crossfade with an
    // eased midpoint spends too long in the half-and-half state, which is the
    // one state that looks like neither planet.
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

    ScrollTrigger.create({
      trigger: document.querySelector('.worlds__two') || worlds,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const z = easeInOut(range(p, 0, 0.72));
        earth.setZoom(z);
        earth.setDecay(range(p, 0.30, 0.95));
        // Published as a custom property rather than tweened directly, so the
        // stylesheet still decides what the scrim and the heat glow LOOK like
        // and this only says how far through we are. Writing a property never
        // reads layout, so it cannot force a reflow.
        stage.style.setProperty('--zoom', z.toFixed(3));
      },
    });

    /* PHASE TWO — the dive, scrubbed against About's arrival.
       A separate trigger rather than more range on the first one: the two
       phases are anchored to different things, and folding them into one scrub
       would mean every edit to About's length silently re-times the pull-back
       two screens earlier. */
    const about = document.getElementById('about');
    const riyadh = document.getElementById('riyadh');
    if (!about || !riyadh) return;

    ScrollTrigger.create({
      trigger: about,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        earth.setDive(p);
        /* The plate arrives late and fast. Crossfading through the middle of
           the descent would show a half-transparent map over a still-curved
           globe — the one state that looks like neither. By 0.72 the sphere is
           scaled past the frame edges and its surface is flat, so there is
           nothing left to give the swap away. */
        riyadh.style.opacity = Math.min(1, Math.max(0, (p - 0.72) / 0.24)).toFixed(3);
      },
    });

    initRiyadhReveal(riyadh);
  });
});

/**
 * The thermal probe.
 *
 * Both frames are the same pixels in register, so this masks one image rather
 * than swapping two — the cursor reads as an instrument held over a single
 * place, not as a wipe between two pictures.
 *
 * Written to custom properties and never to layout: setting a property cannot
 * force a reflow, and the mask is composited. Pointer moves are coalesced onto
 * one rAF, because a pointermove stream on a desktop mouse runs well past
 * display rate and there is no point recomputing a mask twice for one frame.
 */
function initRiyadhReveal(root) {
  const heat = document.getElementById('riyadhHeat');
  const cool = document.getElementById('riyadhCool');
  if (!heat || !cool) return;

  // Loaded only when the dive is near — two full-bleed rasters is not something
  // to spend on a reader who never scrolls this far.
  const small = window.matchMedia('(max-width: 760px)').matches;
  const src = (stem) => `/assets/img/${stem}${small ? '-sm' : ''}.webp`;
  let armed = false;
  const arm = () => {
    if (armed) return;
    const r = root.getBoundingClientRect();
    if (r.top > window.innerHeight * 2.5) return;
    armed = true;
    heat.src = src('riyadh-heat');
    cool.src = src('riyadh-cool');
  };
  arm();
  window.addEventListener('scroll', arm, { passive: true });

  // Opens on first contact rather than sitting open, so the map is unbroken
  // until someone actually reaches for it. Small on purpose: a probe reads as
  // an instrument, a porthole reads as a page transition.
  const R_OPEN = small ? 64 : 104;
  let px = 0, py = 0;          // where the pointer is
  let cx = 0, cy = 0;          // where the probe is — it trails, see below
  let open = 0, running = false, seeded = false, t = 0;

  /* One rAF while the probe is live, rather than painting per pointermove.
     It has two jobs a per-event handler cannot do: ease the probe toward the
     cursor so it has weight instead of being welded to it, and drift the three
     lobes so the outline keeps changing shape. Both are what stop it reading as
     a cursor decoration. */
  const frame = () => {
    if (!running) return;
    requestAnimationFrame(frame);

    if (parseFloat(root.style.opacity || '0') < 0.05) { running = false; return; }

    // Trails the pointer. 0.18 is loose enough to feel physical, tight enough
    // that it never lags somewhere the reader is not looking.
    cx += (px - cx) * 0.18;
    cy += (py - cy) * 0.18;

    const r = root.getBoundingClientRect();
    if (!r.width) return;
    root.style.setProperty('--rx', `${((cx - r.left) / r.width * 100).toFixed(2)}%`);
    root.style.setProperty('--ry', `${((cy - r.top) / r.height * 100).toFixed(2)}%`);
    root.style.setProperty('--r', `${open.toFixed(0)}px`);

    if (cool && !reducedMotion) {
      // Three incommensurate periods, so the lobes never resynchronise into a
      // recognisable shape. Amplitudes stay under a third of the radius —
      // past that it stops being a blob and starts being three circles.
      t += 0.016;
      const k = R_OPEN * 0.3;
      cool.style.setProperty('--l1x', `${(Math.sin(t * 0.7) * k).toFixed(1)}px`);
      cool.style.setProperty('--l1y', `${(Math.cos(t * 0.53) * k).toFixed(1)}px`);
      cool.style.setProperty('--l2x', `${(Math.sin(t * 0.41 + 2.1) * k * 1.1).toFixed(1)}px`);
      cool.style.setProperty('--l2y', `${(Math.sin(t * 0.61 + 1.3) * k * 1.1).toFixed(1)}px`);
      cool.style.setProperty('--l3x', `${(Math.cos(t * 0.37 + 4.2) * k * 1.2).toFixed(1)}px`);
      cool.style.setProperty('--l3y', `${(Math.cos(t * 0.79 + 0.6) * k * 1.2).toFixed(1)}px`);
    }
  };

  const track = (x, y) => {
    px = x; py = y;
    if (!seeded) { cx = x; cy = y; seeded = true; }   // no swoop in from 0,0
    if (open < R_OPEN) open = R_OPEN;
    if (!running) { running = true; requestAnimationFrame(frame); }
  };

  window.addEventListener('pointermove', (e) => {
    // Only while the plate is actually on screen and visible.
    if (parseFloat(root.style.opacity || '0') < 0.05) return;
    track(e.clientX, e.clientY);
  }, { passive: true });

  // Touch has no hover, so the probe follows a finger dragged across the map.
  // The map is not the globe's grab target, so this steals nothing from scroll.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (parseFloat(root.style.opacity || '0') < 0.05) return;
    track(e.clientX, e.clientY);
  }, { passive: true });
}

// The atlas and the thermal sequence are no longer page sections — they are
// relocated into their project cards and mounted by modal.js when the card is
// opened. Nothing to preload here: three.js is the heaviest thing on the page
// and there is no reason to pay for it before someone asks for the globe.

// Web fonts change metrics, which changes every pinned section's height.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

window.addEventListener('load', () => ScrollTrigger.refresh());

// Translated copy reflows every section, and the pinned ones are measured in
// pixels — without this the projects track and thermal sequence keep the
// English heights and end early.
window.addEventListener('sa:languagechange', () => {
  requestAnimationFrame(() => ScrollTrigger.refresh());
});
