import { gsap, reducedMotion } from './scroll.js';

const EN_ROLES = [
  'Smart Cities Researcher',
  'GIS & Remote Sensing Specialist',
  'Urban Data Scientist',
  'Climate Resilience Analyst',
  'Architect → Data Science',
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

  // Scroll choreography — the name drifts up and dissolves while the photograph
  // pushes in behind it. This is the shot the reference sites open on.
  //
  // immediateRender:false matters here. These tweens target the same properties
  // the intro timeline is still animating; without it GSAP samples the in-flight
  // value (0) as the scrub start and the text never becomes visible.
  const scrub = { ease: 'none', immediateRender: false };

  gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
  })
    .to('.hero__name', { y: -80, scale: 1.04, opacity: 0.12, ...scrub }, 0)
    .to(['.hero__globe', '.hero__space'], { scale: 1.14, yPercent: 5, ...scrub }, 0)
    .to(['.hero__hey', '.hero__role', '.hero__desc', '.hero__actions'], { y: -40, opacity: 0, ...scrub }, 0)
    .to('.hero__stats', { y: -20, opacity: 0, ...scrub }, 0.15);
}
