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

  tiltPosters(cards);
}

/**
 * Pointer-follow tilt on the poster cards.
 *
 * The card leans toward the cursor and its text plate, which sits on
 * `translateZ(38px)`, parallaxes against the image behind it. That separation
 * is the effect — without a raised layer the card is just a photograph that
 * leans, which reads as a gimmick rather than as depth.
 *
 * Written as two custom properties rather than a transform, so the CSS keeps
 * ownership of what the hover state actually looks like: this supplies two
 * angles, the stylesheet decides the lift, the scale and the shadow. Setting a
 * property never reads layout, so it cannot force a reflow.
 *
 * Gated on a fine pointer and on reduced motion. On touch there is no hover to
 * follow — a tap would tilt the card and leave it tilted.
 */
function tiltPosters(cards) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (reducedMotion) return;

  const MAX = 5;   // degrees. Past about 7 the text edge distorts and it reads as a toy.

  for (const card of cards) {
    if (!card.classList.contains('pcard--poster')) continue;

    card.addEventListener('pointermove', (e) => {
      const b = card.getBoundingClientRect();
      // -1..1 from the centre of the card.
      const px = (e.clientX - b.left) / b.width * 2 - 1;
      const py = (e.clientY - b.top) / b.height * 2 - 1;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', `${(px * MAX).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-py * MAX).toFixed(2)}deg`);
    });

    const flat = () => {
      // Drop the no-transition class FIRST so the card eases back to flat
      // instead of snapping — the snap is what makes a tilt feel cheap.
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    };
    card.addEventListener('pointerleave', flat);
    card.addEventListener('blur', flat);
  }
}
