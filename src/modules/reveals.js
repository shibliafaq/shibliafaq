import { gsap, ScrollTrigger, reducedMotion } from './scroll.js';

/**
 * Wraps every word of a [data-split] heading so the words can rise
 * independently. Done in JS so the HTML stays readable and crawlable.
 */
function splitWords(el) {
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (!text.trim()) return;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((chunk) => {
          if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return; }
          const outer = document.createElement('span');
          outer.className = 'word';
          const inner = document.createElement('span');
          inner.textContent = chunk;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        walk(child);
      }
    });
  };
  walk(el);
  return el.querySelectorAll('.word > span');
}

export function initReveals() {
  // --- headings ------------------------------------------------
  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    if (reducedMotion) return;
    gsap.from(words, {
      yPercent: 118,
      duration: 1.15,
      ease: 'expo.out',
      stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  // --- generic blocks ------------------------------------------
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reducedMotion) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    reveals.forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => el.classList.add('is-in'),
      });
    });
  }

  // --- counters ------------------------------------------------
  document.querySelectorAll('[data-target]').forEach((el) => {
    const target = parseFloat(el.dataset.target);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const suffix = el.dataset.suf || '';
    const write = (v) => { el.textContent = v.toFixed(dec) + suffix; };

    if (reducedMotion) { write(target); return; }

    const counter = { v: 0 };
    write(0);
    gsap.to(counter, {
      v: target,
      duration: 1.6,
      ease: 'power2.out',
      onUpdate: () => write(counter.v),
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });

  // --- progress bar --------------------------------------------
  const bar = document.getElementById('progressBar');
  if (bar) {
    gsap.to(bar, {
      width: '100%',
      ease: 'none',
      scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
    });
  }

}
