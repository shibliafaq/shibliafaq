import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';
import './styles/i18n.css';

import { initScroll, ScrollTrigger } from './modules/scroll.js';
import { initReveals } from './modules/reveals.js';
import { initHero } from './modules/hero.js';
import { initProjects } from './modules/projects.js';
import { initSkills } from './modules/skills.js';
import { initExperience } from './modules/experience.js';
import { initModal, initArch, initLightbox } from './modules/modal.js';
import { initNav, initCursor, initForm } from './modules/ui.js';
import { initRiyadhReveal } from './modules/riyadh.js';

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
        /* The plate arrives LATE — the descent has to carry deep into the
           continent first, or the reader jumps from a whole peninsula to city
           blocks in one frame and the scales never connect. By 0.86 the globe's
           surface is flat and rushing, so there is nothing left to give the
           swap away.

           The plate also keeps moving through the handover: it arrives 22%
           oversized and settles, so the approach continues across the cut
           rather than stopping dead at it. */
        const f = Math.min(1, Math.max(0, (p - 0.86) / 0.14));
        riyadh.style.opacity = f.toFixed(3);
        riyadh.style.setProperty('--plate', (1.22 - 0.16 * f).toFixed(3));
      },
    });

    initRiyadhReveal(riyadh);
  });
});
