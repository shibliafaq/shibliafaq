import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';
import './styles/book.css';
import './styles/i18n.css';

import { initScroll, ScrollTrigger } from './modules/scroll.js';
import { initReveals } from './modules/reveals.js';
import { initHero, heroExit } from './modules/hero.js';
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
    const wholeCopy = document.querySelector('#whole .future__body');
    /* The Cost of Inaction frame's two halves. Both are CONTAINERS: neither
       carries data-reveal, only their children do, so driving opacity here
       multiplies with the reveal system instead of fighting it. Putting the
       signal on the .ftag elements themselves would be the "one element, one
       owner" collision from CONTEXT 48 all over again. */
    const costCopy = document.querySelector('#future .future__body');
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
    /* THE LIVING EARTH NEEDS A BEAT OF ITS OWN.

       The decay used to start at pCopyGone, the exact point the zoom finished,
       so the whole planet existed for one frame and immediately began dying.
       That left nowhere to put the Whole Picture caption, which is why it kept
       arriving on top of the departing hero: not because it was early, but
       because the only slot available to it was already occupied.

       This hold is that window. Measured, the scrub had 54.7% of its range
       (1884px) sitting idle AFTER the decay finished, so the beat is paid for
       out of scroll that was doing nothing at all. */
    const HOLD = 0.14;             // the planet stays whole for this much scrub
    const DECAY_SPAN = 0.30;       // how much of the scrub the surface turn takes
    const WHOLE_IN = 0.05;         // the caption arrives, after the hero clears
    const WHOLE_OUT = 0.05;        // and leaves again, as the turn begins
    /* The cost copy takes over exactly where the whole-picture caption leaves,
       so the two never share a frame. At that point decay is only ~0.07: the
       surface has JUST begun to turn, which is what "once the earth starts
       changing" means. */
    const COST_IN = 0.07;          // how much scrub the cost copy takes to arrive
    const COST_OUT = 0.14;         // and how much of the DIVE it takes to leave

    let pCopyGone = 0.4;           // recomputed on every refresh, below
    let pDecayStart = 0.54;
    let pDecayEnd = 0.84;

    /* Two clocks, one signal. The cost copy's arrival is owned by the worlds
       scrub and its exit by the dive, and those are separate ScrollTriggers, so
       the last value each reported is kept here and either can repaint.

       The exit is deliberately NOT "worlds progress reached 1", even though
       today that lands on the same pixel as the dive starting. That equality is
       an accident of section heights and breaks the day #about moves. */
    let worldsPos = 0;
    let divePos = 0;

    /* Painting the caption is its own function because two different clocks
       need to call it: the scroll, and the hero timeline settling after the
       scroll has stopped. Returns how far the hero has cleared, so the caller
       can tell whether the value just painted is final or still chasing. */
    let captionRaf = 0;
    const paintCaption = (p) => {
      const cleared = smoothstep(range(heroExit.progress(), 0.9, 1));
      const w = cleared
              * smoothstep(range(p, pCopyGone, pCopyGone + WHOLE_IN))
              * (1 - smoothstep(range(p, pDecayStart, pDecayStart + WHOLE_OUT)));
      /* On `worlds` rather than on the stage: custom properties inherit down
         and never sideways, and the caption is not inside the stage. */
      worlds.style.setProperty('--whole', w.toFixed(3));
      /* Invisible is not the same as absent. Once the caption has faded it is
         still focusable and still read aloud, so a keyboard reader would tab
         into three paragraphs about the living Earth while looking at the dead
         one. Set from the same signal the stylesheet uses to hide it. */
      if (wholeCopy) wholeCopy.inert = w < 0.02;
      return cleared;
    };

    /* The cost copy appears as the surface begins to turn and leaves as the
       dive begins. Both triggers are scrub: true, so unlike paintCaption there
       is no lag to reconcile and no heroExit-style state gate is needed here. */
    const paintCost = () => {
      const from = pDecayStart + WHOLE_OUT;
      const c = smoothstep(range(worldsPos, from, from + COST_IN))
              * (1 - smoothstep(range(divePos, 0, COST_OUT)));
      /* On `worlds` for the same reason as --whole and --decay: custom
         properties inherit down and never sideways, and #future is not inside
         the stage. */
      worlds.style.setProperty('--cost', c.toFixed(3));
      // Faded is not gone: without this a keyboard reader tabs into four tags
      // and three paragraphs that are no longer on screen.
      if (costCopy) costCopy.inert = c < 0.02;
      return c;
    };

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
        /* Clamped on the START rather than on the end, so that on a short
           scrub it is the hold that gives way under pressure and never the turn
           the hold exists to make room for: DECAY_SPAN survives either way. */
        pDecayStart = Math.min(0.62, pCopyGone + HOLD);
        pDecayEnd = Math.min(0.92, pDecayStart + DECAY_SPAN);
      },
      onUpdate: (self) => {
        const p = self.progress;
        worldsPos = p;
        // Camera finishes as the copy clears, so the two never compete for
        // attention and the surface turn gets the frame to itself.
        const z = easeInOut(range(p, 0, Math.max(0.05, pCopyGone - 0.02)));
        earth.setZoom(z);
        const d = smoothstep(range(p, pDecayStart, pDecayEnd));
        earth.setDecay(d);
        // Published as a custom property rather than tweened directly, so the
        // stylesheet still decides what the scrim and the heat glow LOOK like
        // and this only says how far through we are. Writing a property never
        // reads layout, so it cannot force a reflow.
        stage.style.setProperty('--zoom', z.toFixed(3));
        /* Decay goes on `worlds`, not on `stage`, because the copy needs to read
           it and the copy is not inside the stage — `.worlds` is the nearest
           element that is an ancestor of both. Custom properties inherit down
           and never sideways, which is a trap this project has already paid for
           once with `--form` on the wheel. */
        worlds.style.setProperty('--decay', d.toFixed(3));
        /* Zoom goes on `worlds` as well as on the stage. The stage copy drives
           the scrim; this one lets the Whole Picture copy know the pull-back has
           finished, which is the other half of deciding whether it should be on
           screen — decay alone reads 0 during the hero too. */
        worlds.style.setProperty('--zoom', z.toFixed(3));
        /* THE CAPTION WAITS FOR THE HERO'S STATE, NOT FOR A SCROLL POSITION.

           Two earlier attempts failed for the same underlying reason. The
           first rebuilt this in CSS from `--zoom` and `--decay`; both are flat
           through the hold, so the fade-in had nowhere to go but the last 14%
           of the zoom, which is scroll the hero is still using. The second
           gave the caption its own trigger at `scrub: 0.8` to match the hero's
           lag — but the caption's fade window is 172px against the hero's
           526px, so an equal lag in TIME is an unequal lag in PROGRESS, and it
           still arrived first.

           Gating on `heroExit.progress()` ends the class of bug rather than
           the instance: the caption cannot start until the hero timeline has
           actually finished, however fast the reader is moving.

           The EXIT deliberately stays on this instant scrub rather than a
           lagged one. It has to stay locked to the decay it is leaving ahead
           of — a lagged exit would let the words about a living planet linger
           over a visibly turning one, which is the exact state this whole
           sequence exists to avoid. */
        const settling = paintCaption(p) < 1;
        paintCost();
        /* THIS TRIGGER GOING QUIET IS NOT THE END OF THE STORY.

           The hero eases toward the scroll on a 0.8s follow of its own. A
           reader who flicks into the hold and then stops to look leaves the
           scroll motionless while the hero is still catching up behind them —
           no more scroll events, so no more updates here, and the caption
           would stay hidden over a living Earth that is just sitting there
           waiting for it. Measured: a fast flick skipped the caption
           completely, peak opacity 0 across the entire section.

           So when the value just painted was still chasing, keep painting
           until it is not. Bounded by the scrub follow itself: the loop stops
           the moment the hero reports it has cleared. */
        if (settling) {
          cancelAnimationFrame(captionRaf);
          const settle = () => {
            if (paintCaption(self.progress) < 1) {
              captionRaf = requestAnimationFrame(settle);
            }
          };
          captionRaf = requestAnimationFrame(settle);
        }
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
        /* The dive owns the cost copy's exit. Phase two published nothing a
           stylesheet could read before this; --plate is written on #riyadh,
           which is not an ancestor of #future. */
        divePos = p;
        paintCost();
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
