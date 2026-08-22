import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';
import './styles/book.css';
import './styles/i18n.css';

import { initScroll, ScrollTrigger } from './modules/scroll.js';
import { initReveals } from './modules/reveals.js';
import { initHero } from './modules/hero.js';
import { initWheels } from './modules/wheel.js';
import { initSkills } from './modules/skills.js';
import { initExperience } from './modules/experience.js';
import { initModal, initArch, initLightbox } from './modules/modal.js';
import { initNav, initCursor, initForm } from './modules/ui.js';
import { initRiyadhReveal } from './modules/riyadh.js';
import { initBook } from './modules/book.js';
import { initMediaGuard } from './modules/protect.js';
import { initInstagram } from './modules/insta.js';

const idleInit = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn)
  : (fn) => setTimeout(fn, 200);

initScroll();
// Two delegated listeners; cheap, and must be live before media appears.
initMediaGuard();
initNav();
initCursor();
initHero();
initReveals();
initWheels();
// Runs on load rather than near-viewport: it swaps the tag list for the canvas,
// and doing that late would show the list and then visibly replace it. The rAF
// loop inside is still gated on the section being on screen.
initSkills();
initModal();
initArch();
// The architecture flipbook. Binds a delegated click on [data-book], so it does
// not care that the wheel rebuilds its cards.
initBook();
initLightbox();
initForm();
// Last section on the page and it fetches, so it waits for idle.
idleInit(() => initInstagram());

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

    /* THE TRANSITION, AND THE RESTS BETWEEN IT.

       The first version mapped something to every pixel of scroll: the camera
       was still pulling back while the surface was already turning, and the
       moment that finished the dive began. Nothing ever held still, so there
       was no point at which a reader could stop and look — which is tiring to
       watch and worse than tiring for anyone sensitive to motion.

       Each beat now runs, finishes, and then HOLDS:

         zoom    0 -> copy-clear      camera pulls back while the hero copy goes
         decay   copy-clear -> +0.14  the surface turns, quickly, straight after
         hold    the rest of the range — the failed Earth simply sits there

       The hold is over half the scrub. That is the point: it is the only part
       where the reader is not being moved.

       WHERE THE DECAY STARTS IS MEASURED, NOT GUESSED. The brief was that the
       texture should change as soon as the hero text is gone, and the text is
       faded by a separate trigger anchored to #hero in pixels. Hard-coding a
       progress figure would drift the moment a section height or a viewport
       changed — and it already differs between desktop and phone, because
       .hero is 100svh on one and content-height on the other. So it is derived
       from the same pixel distance hero.js uses, converted into this scrub's
       own progress each refresh. */
    const range = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

    /* The surface turn is smoothstepped, not linear.
       I argued for linear here originally on the grounds that easing would
       linger in the half-and-half state. That was backwards: smoothstep has
       zero gradient at both ends and its steepest point in the MIDDLE, so it
       leaves and arrives gently while crossing the ambiguous middle faster
       than linear does. It removes the abrupt onset and the abrupt stop, which
       is what made the change feel like a switch being thrown. */
    const smoothstep = (t) => t * t * (3 - 2 * t);

    const HERO_COPY_FADE = 0.55;   // must match hero.js
    const DECAY_SPAN = 0.30;       // how much of the scrub the surface turn takes

    let pCopyGone = 0.4;           // recomputed on every refresh, below
    let pDecayEnd = 0.54;

    ScrollTrigger.create({
      trigger: document.querySelector('.worlds__two') || worlds,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      onRefresh: (self) => {
        const px = self.end - self.start;                 // this scrub, in pixels
        if (!px) return;
        pCopyGone = Math.min(0.6, (window.innerHeight * HERO_COPY_FADE) / px);
        pDecayEnd = Math.min(0.85, pCopyGone + DECAY_SPAN);
      },
      onUpdate: (self) => {
        const p = self.progress;
        // Camera finishes as the copy clears, so the two never compete for
        // attention and the surface turn gets the frame to itself.
        const z = easeInOut(range(p, 0, Math.max(0.05, pCopyGone - 0.02)));
        earth.setZoom(z);
        earth.setDecay(smoothstep(range(p, pCopyGone, pDecayEnd)));
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
      /* 1.5 screens, not the one screen 'top top' gives. Anchoring both ends to
         About's top edge fixed the dive at exactly one viewport of scroll, so
         the descent had no room to finish early and rest — it was still moving
         when the heading arrived. */
      end: () => `+=${Math.round(window.innerHeight * 1.5)}`,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        /* The dive finishes at 78% and holds. Running it to the very end meant
           the plate was still settling as About's first line arrived, so the
           reader was reading and being moved at the same time. */
        const p = self.progress;
        earth.setDive(range(self.progress, 0, 0.62));
        /* The plate arrives LATE — the descent has to carry deep into the
           continent first, or the reader jumps from a whole peninsula to city
           blocks in one frame and the scales never connect. By 0.86 the globe's
           surface is flat and rushing, so there is nothing left to give the
           swap away.

           The plate also keeps moving through the handover: it arrives 22%
           oversized and settles, so the approach continues across the cut
           rather than stopping dead at it. */
        const f = Math.min(1, Math.max(0, (p - 0.52) / 0.12));
        riyadh.style.opacity = f.toFixed(3);
        riyadh.style.setProperty('--plate', (1.22 - 0.16 * f).toFixed(3));
      },
    });

    initRiyadhReveal(riyadh);
  });
});
