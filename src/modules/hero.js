import { gsap, reducedMotion } from './scroll.js';

/* The line under the name. It is a typewriter that cycles, so a single line of
   "Architect · Urban Designer · Spatial Researcher" becomes three phrases rather
   than one string — the separators are what the animation replaces. */
const EN_ROLES = [
  'Architect',
  'Urban Designer',
  'Spatial Researcher',
];

// Mutable so the language switcher can swap the phrases mid-cycle without
// restarting the typewriter or leaving a half-typed English word on screen.
let ROLES = EN_ROLES;

function typewriter(el) {
  if (reducedMotion) { el.textContent = ROLES[0]; return; }

  let phrase = 0;
  let chars = 0;
  let deleting = false;

  const tick = () => {
    const text = ROLES[phrase];
    if (!deleting) {
      chars += 1;
      el.textContent = text.slice(0, chars);
      if (chars >= text.length) { deleting = true; setTimeout(tick, 2200); return; }
      setTimeout(tick, 68);
    } else {
      chars -= 1;
      el.textContent = text.slice(0, Math.max(chars, 0));
      if (chars <= 0) { deleting = false; phrase = (phrase + 1) % ROLES.length; setTimeout(tick, 450); return; }
      setTimeout(tick, 30);
    }
  };
  tick();
}

export function initHero() {
  const tw = document.getElementById('tw');
  if (tw) typewriter(tw);

  // The role phrases live in JS, so the i18n engine cannot reach them through
  // the DOM — it announces the change and this swaps the source array.
  window.addEventListener('sa:languagechange', (e) => {
    ROLES = e.detail.roles || EN_ROLES;
    if (tw) tw.textContent = '';
  });

  if (reducedMotion) return;

  // Entrance — the name arrives before anything else does.
  const intro = gsap.timeline({ delay: 0.25 });
  intro
    .from('.hero__hey', { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out' })
    .from('.hero__name-line', { yPercent: 112, duration: 1.35, ease: 'expo.out', stagger: 0.11 }, '-=0.6')
    .from('.hero__role', { opacity: 0, duration: 0.8 }, '-=0.7')
    .from('.hero__desc', { y: 18, opacity: 0, duration: 0.9, ease: 'power3.out' }, '-=0.6')
    .from('.hero__actions .btn', { y: 14, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, '-=0.65')
    .from('.hstat', { y: 16, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, '-=0.5');

  /* Scroll choreography — the name drifts up and dissolves while the globe
     pushes in behind it. This is the shot the reference sites open on.
     Built only AFTER the intro has finished, and declared with fromTo.

     Both of those are fixes for the same bug, reproduced: scroll down while the
     intro is still running, come back to the top, and the eyebrow, the role and
     the description stay at opacity 0 for good. Measured after the trip —
     hey 0, role 0, desc 0, actions 0.81.

     `.to()` SAMPLES its start value the first time it renders. If that happens
     while the intro's `.from()` tweens are mid-flight, the value it records is
     whatever they were passing through — so scrolling back to the top restores
     the text to a partial opacity, or to nothing at all. `immediateRender:false`
     was already here for exactly this reason and is not enough on its own: it
     defers the sampling, it does not stop it happening at a bad moment.

     `fromTo` declares both ends, so nothing is ever sampled. Waiting for the
     intro means the two timelines never touch the same property at the same
     time — and if the reader scrolls during the intro, ScrollTrigger applies
     the correct state for wherever they are the moment this is created. */
  const scrub = { ease: 'none', immediateRender: false };

  intro.eventCallback('onComplete', () => {
    gsap.timeline({
      /* Ends at 55% of a screen, not at the hero's bottom edge.
         The camera finishes pulling back at 602px of scroll (0.72 of an 837px
         range) while 'bottom top' put this fade's end at 910px — so the
         headline and the four CTAs were still half-opaque, sitting on the face
         of the planet, at the exact moment the whole Earth arrived. The copy
         has to be gone BEFORE the reveal it is standing in front of. */
      scrollTrigger: {
        trigger: '#hero', start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * 0.55)}`,
        scrub: 0.8, invalidateOnRefresh: true,
      },
    })
      .fromTo('.hero__name',
        { y: 0, scale: 1, opacity: 1 },
        { y: -80, scale: 1.04, opacity: 0.12, ...scrub }, 0)
      /* The globe used to be CSS-scaled here (1 -> 1.14, yPercent 5). Removed:
         the camera now pulls BACK over this exact range, so a CSS scale-up
         fought it frame for frame — and CSS-scaling a fixed-size WebGL buffer
         resamples the render, which shows as blur. The starfield backdrop keeps
         its drift because it is a plain div and reads as parallax. */
      .fromTo('.hero__space',
        { scale: 1, yPercent: 0 },
        { scale: 1.14, yPercent: 5, ...scrub }, 0)
      .fromTo(['.hero__hey', '.hero__role', '.hero__desc', '.hero__actions'],
        { y: 0, opacity: 1 },
        { y: -40, opacity: 0, ...scrub }, 0)
      /* Opacity 0 still hit-tests. These elements stay full-size and stacked
         over the canvas, and earth.js refuses to start a drag whose target is
         inside a link or button — so the four invisible CTAs, sitting dead
         centre of the zoomed-out planet, would have swallowed every grab.
         Toggled rather than scrubbed: pointer-events does not interpolate. */
      .set(['.hero__body', '.hero__stats'], { pointerEvents: 'none' }, 0.35)
      .set(['.hero__body', '.hero__stats'], { pointerEvents: 'auto' }, 0)
      .fromTo('.hero__stats',
        { y: 0, opacity: 1 },
        { y: -20, opacity: 0, ...scrub }, 0.15);
  });
}
