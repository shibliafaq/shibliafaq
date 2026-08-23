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
import { initVisits } from './modules/visits.js';
import { initEmWave } from './modules/emwave.js';

const idleInit = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn)
  : (fn) => setTimeout(fn, 200);

/* A RELOAD STARTS AT THE TOP, BECAUSE THE POSITION IT WOULD RESTORE IS A LIE.

   The browser restores scrollY before any of this runs. Then the lazy chunks
   land, ScrollTrigger builds its pin spacers, and the document grows by
   thousands of pixels — so the number it restored no longer points at the
   place it was taken from. Measured: parked at 15893, reloaded, landed at
   9642. That is 6251px earlier and a different section entirely, and it was
   what kept depositing readers back at the projects wheel on refresh.

   Restoring it CORRECTLY is not really available. It would mean waiting for
   every lazy module to initialise and every pin to be measured before jumping,
   and those land on idle callbacks with no well-defined "done" — so the jump
   would happen late and visibly, which is worse than not jumping at all. And
   there is nothing to go back to: this page is a single scrubbed narrative, so
   a restored position drops the reader into the middle of an animation with no
   idea how they got there.

   The hash is left alone. Nav links are #about, #projects and so on, and those
   are a deliberate request for a place, unlike a restored scroll offset.

   TWO MECHANISMS REMEMBER THE POSITION, AND BOTH HAVE TO BE TOLD.

   Setting history.scrollRestoration alone did nothing — measured, it read
   back as "auto" and the page still landed at 9642. ScrollTrigger keeps its
   OWN scroll memory and restores it around a refresh, and resets the history
   flag while doing so, so whichever of the two is set first simply loses.
   `clearScrollMemory` is the sanctioned way to tell it both things at once:
   forget the remembered offsets, and leave restoration manual.

   Re-asserted after the first refresh as well. The pins are not measured yet
   at this point in the file, so the refresh that follows the lazy chunks is
   the one that would otherwise put the reader back. One shot, removed
   immediately, so a later resize refresh does not yank a reading page to the
   top. */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) {
  ScrollTrigger.clearScrollMemory('manual');
  window.scrollTo(0, 0);
  const toTopOnce = () => {
    ScrollTrigger.removeEventListener('refresh', toTopOnce);
    window.scrollTo(0, 0);
  };
  ScrollTrigger.addEventListener('refresh', toTopOnce);
}

/* Before initScroll, so Lenis takes its starting position from the reset
   rather than from whatever the browser had already put there. */
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
// A number in the footer is never urgent, and this is a network round trip.
idleInit(() => initVisits());

// Decoration behind the Direction headings. On idle, and the module parks its
// own loop unless the section is on screen.
idleInit(() => initEmWave('.dirs__wave'));

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
    /* The heat map's own caption. Held back until the map it describes is
       actually on screen; see the dive below. */
    /* NOTHING PINNED MAY PAINT OVER A SECTION IT DOES NOT BELONG TO.

       The three captions and the tag field are `position: fixed`, so the ONLY
       thing keeping them off the rest of the page is their signal reaching 0.
       That is a single point of failure: any stale scrub, any trigger that
       never fires its last update, any refresh that re-times a range, and a
       caption sits over whatever happens to be on screen. Reported exactly
       that way — the Urban Heat Islands copy over the projects wheel, and on a
       phone the floating tags "pinned to the screen always".

       So the signal decides how it LOOKS and this decides whether it may be
       seen at all: a section that is not intersecting the viewport hides its
       own pinned children outright. It cannot drift, because it is not derived
       from a scroll position — the observer reports the geometry itself. */
    for (const sel of ['#whole', '#future', '#about']) {
      const sec = document.querySelector(sel);
      if (!sec) continue;
      new IntersectionObserver(([en]) => {
        sec.classList.toggle('is-offstage', !en.isIntersecting);
      }, { threshold: 0 }).observe(sec);
    }

    const aboutWrap = document.querySelector('#about > .wrap');
    const aboutHead = document.querySelector('#about [data-split-hold]');
    /* Two clocks again. The dive brings the caption in; a second trigger on
       About's own tail takes it out. It needs one because the caption is now
       PINNED, and a pinned block with no exit simply rides on into the next
       section. It also needs to leave roughly when its backdrop does: the
       stage is sticky only until y4337 here, after which the heat map slides
       away for the remaining 900px of the section, and a caption still nailed
       to the viewport over a departing map reads as broken. */
    let heatIn = 0;
    let heatOut = 0;
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
       out of scroll that was doing nothing at all.

       0.14 WAS TOO LITTLE, AND THE SAME MEASUREMENT SAYS WHY. At 0.14 the beats
       came out, on a 1255x694 screen with a 2443px scrub:

           living Earth   333px      (zoom done -> turn starts)
           the turn       733px      (decay 0 -> 1)
           failed Earth   987px      (turn done -> end of the scrub) + the dive

       — reported as "the green earth has less time and bad earth has more
       scroll time", which is exactly what a 1:3 split feels like. The whole
       planet is the subject of a third of this sequence and got a ninth of it.

       The idle stretch after the turn IS the failed Earth's dwell, so the two
       are the same budget seen from either end and one number moves both. With
       pCopyGone measured at 0.156 and DECAY_SPAN at 0.30, balancing them is:

           HOLD + 0.02 = 1 - pCopyGone - HOLD - DECAY_SPAN   =>   HOLD ~ 0.26

       which lands the living Earth at ~684px against ~694px for the failed one,
       with the turn between them unchanged at 733px. NOTHING ELSE MOVES: both
       clamps below stay slack at this value (pDecayStart 0.416 against a 0.62
       ceiling, pDecayEnd 0.716 against 0.92), so the turn is not compressed and
       the tuned section heights are left alone. */
    const HOLD = 0.26;             // the planet stays whole for this much scrub
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

    /* Seeded for the same reason --dive-copy is: the stylesheet falls back to 1
       so nothing is trapped invisible without JS, and writing 0 here stops that
       fallback also applying in the frames before the scrub first reports. */
    worlds.style.setProperty('--cost', '0');

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

    /* Start the caption hidden the moment we know JS is running.

       The stylesheet reads the fallback form on purpose: with no JS at all it
       resolves to 1 and the words are never trapped invisible. But a fallback
       also applies BEFORE the dive has published anything, which measured as
       the caption fully visible from y3200 against a map that does not arrive
       until y4040 — 840px early, which is the bug this was meant to fix.
       Writing 0 here narrows the fallback to the case it is actually for. */
    const paintHeat = () => {
      const h = heatIn * (1 - heatOut);
      worlds.style.setProperty('--dive-copy', h.toFixed(3));
      if (aboutWrap) aboutWrap.inert = h < 0.02;
      /* Fired once and only forward: the rise is a one-way transition, and
         re-adding the class on the way back up would replay it every time the
         reader scrolled through. */
      if (h > 0.04 && aboutHead) aboutHead.classList.add('is-split-in');
    };

    /* THE MAP HAS ONE OWNER, AND IT HAD TO BECAUSE IT NOW HAS TWO SOURCES.

       The dive fades the plate IN as the descent lands on it; the tail below
       fades it OUT as the frame ends. Those are two different triggers, and
       both used to be free to assign `riyadh.style.opacity` directly — which is
       the "one element, one owner" collision this file keeps re-learning
       (CONTEXT 48, and again as the --heat name clash in 59). Whichever fired
       last would win, so scrolling back up through the handover would leave the
       map at whatever the other one had decided.

       So the two publish INTENTIONS and this multiplies them. mapIn only ever
       describes the arrival and mapOut only ever the departure. */
    let mapIn = 0;
    let mapOut = 0;
    const paintMap = () => {
      /* ARRIVAL IS THE PLATE'S; DEPARTURE IS THE WHOLE FRAME'S.

         Fading only #riyadh on the way out was wrong, and looked it: the plate
         went and revealed the WebGL canvas still sitting behind it, showing the
         dived-in planet surface. Measured at that point the map read 0 while
         the screen was a flat warm wash — the ground the descent had landed on,
         with nothing on it. Which is worse than the overlap it replaced,
         because it reads as an unfinished state rather than as a transition.

         The map, the canvas, the scrim and the vignette are all children of the
         stage, so the exit belongs there: one frame withdrawing, not a plate
         lifting off a backdrop that stays. */
      riyadh.style.opacity = mapIn.toFixed(3);
      stage.style.setProperty('--frame-out', mapOut.toFixed(3));
    };

    worlds.style.setProperty('--dive-copy', '0');
    document.documentElement.style.setProperty('--dir-in', '0');

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
        /* THE HEAT MAP OWNS ITS OWN CAPTION.

           "Where the heat becomes personal" is the caption for the Riyadh
           plate, and it used to arrive on the generic reveal machinery: a
           ScrollTrigger at `top 82%` for the fade and an IntersectionObserver
           for the word rise. Two different clocks, neither of them the one
           that brings the map in, and measured they had already disagreed —
           the block was fully faded in (`is-in` on all four children) while
           the rise had never fired at all, so the words were simply sitting
           there having never moved.

           Both now hang off the dive, a beat after the plate itself lands at
           0.52-0.64, so the words arrive onto a map that is already there
           rather than onto empty ground. */
        heatIn = smoothstep(range(p, 0.60, 0.74));
        paintHeat();
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
        mapIn = f;
        paintMap();
        riyadh.style.setProperty('--plate', (1.22 - 0.16 * f).toFixed(3));
      },
    });

    /* THE CAPTION LEAVES WITH THE MAP.

       Anchored to About's own bottom edge rather than to the next section, so
       it does not silently re-time if anything is inserted after it. Progress
       0 is the moment About's bottom reaches the foot of the viewport, and
       that single instant is three things at once: the sticky stage lets go,
       the map starts sliding, and the NEXT section starts climbing into view.

       So the fade begins there rather than a quarter later. It was 0.25-0.6
       first, which measured as the caption sitting at full opacity from y5000
       to y5200 over a #direction that had already entered at y4968, and not
       clearing until y5500 — 500px of a pinned block hanging over the next
       section's heading. The caption gets its stillness before this point,
       not after it: roughly 890px of it, from y4080 to y4968. */
    /* THE FRAME CLEARS BEFORE THE NEXT ONE ARRIVES, RATHER THAN UNDER IT.

       Measured on the old timing: #direction entered the viewport at y3875 with
       the map still at full opacity, and the map never faded at all — it held 1
       from y3375 to y6075 while the next section climbed over the top of it.
       The caption did fade, but over y3789-3981, which is exactly when
       #direction was arriving. So the two frames were dissolved into each other
       and the whole handover read as an ordinary scroll.

       Anchoring the exit a full viewport EARLIER is what separates them. By the
       time About's bottom reaches the fold — the instant the sticky stage lets
       go and #direction starts to climb — both the words and the map are
       already gone, and the reader is looking at empty ground. #direction's own
       reveals then fire as it enters, which is after, without needing to be
       held back by anything: the sequence comes from the geometry rather than
       from a second mechanism co-ordinating with this one.

       The runway for it comes out of the 175vh tail .about--overmap already
       carries, so nothing gets longer.

       WORDS FIRST, THEN THE MAP. They overlap by design — the map begins going
       at 0.40 while the caption is finishing at 0.45 — because a hard sequence
       of two separate fades reads as two events, and what is wanted is one
       frame withdrawing. Leading with the words is what makes it read that way
       round: the argument finishes, then its illustration goes. */
    ScrollTrigger.create({
      trigger: about,
      start: 'bottom bottom+=100%',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        heatOut = smoothstep(range(p, 0, 0.45));
        paintHeat();
        mapOut = smoothstep(range(p, 0.40, 0.92));
        paintMap();

        /* THE NEXT SECTION ARRIVES; IT DOES NOT SCROLL IN.

           Driven from THIS trigger rather than its own, because the whole
           point is that it happens after the frame has gone, and two
           triggers measuring the same boundary from different anchors is
           how the caption and the map ended up dissolving into each other
           in the first place (CONTEXT 66). One clock, three signals.

           0.92 is where the map finishes, so the arrival starts on empty
           ground and runs to the end of the range. Short on purpose: over a
           long range this is a fade, and a fade is what it already did.
           Compressed into the last 8% it reads as something appearing. */
        /* ON THE ROOT, NOT ON `worlds`. #direction is a SIBLING of #worlds,
           not a descendant — the earth sections live inside .worlds__copy and
           this one comes after it closes. Published on `worlds` the value was
           measured moving 0 to 1 correctly while the consumer inherited
           nothing and silently used its fallback, which is the --heat collision
           from CONTEXT 59 in a different costume: a signal that exists, reads
           correctly at its source, and never reaches the element it is for. */
        const dir = smoothstep(range(p, 0.92, 1));
        document.documentElement.style.setProperty('--dir-in', dir.toFixed(3));
      },
    });

    initRiyadhReveal(riyadh);
  });
});
