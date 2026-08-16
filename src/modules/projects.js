import { gsap, ScrollTrigger, reducedMotion } from './scroll.js';

/**
 * The seven project cards travel horizontally while the section is pinned —
 * vertical scroll input, horizontal motion out. On narrow screens this becomes
 * an ordinary swipeable row instead, which is the better mobile interaction.
 */
export function initProjects() {
  const pin = document.getElementById('projectsPin');
  const track = document.getElementById('projectsTrack');
  const counter = document.getElementById('projectsCount');
  if (!pin || !track) return;

  const cards = [...track.children];
  if (counter) counter.textContent = `01 / ${String(cards.length).padStart(2, '0')}`;

  const mobile = window.matchMedia('(max-width: 760px)');

  const enableSwipe = () => {
    pin.style.height = 'auto';
    pin.style.overflowX = 'auto';
    pin.style.scrollSnapType = 'x mandatory';
    track.style.transform = 'none';
    track.style.paddingBlock = '2rem';
    cards.forEach((c) => { c.style.scrollSnapAlign = 'center'; });
  };

  if (reducedMotion || mobile.matches) { enableSwipe(); return; }

  const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(track).paddingLeft));

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.9,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (!counter) return;
        const i = Math.min(cards.length, Math.floor(self.progress * cards.length) + 1);
        counter.textContent = `${String(i).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      },
    },
  });

  // Each card lifts slightly as it crosses the centre of the viewport.
  cards.forEach((card) => {
    gsap.fromTo(card,
      { y: 34, opacity: 0.55 },
      {
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          containerAnimation: tween,
          start: 'left 88%',
          end: 'left 55%',
          scrub: true,
        },
      });
  });

  // If the viewport crosses the breakpoint, rebuild rather than leave a
  // half-pinned section behind.
  mobile.addEventListener('change', () => ScrollTrigger.refresh());
}
