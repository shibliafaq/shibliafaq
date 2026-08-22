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
  /* HEADINGS ANIMATE FROM CSS, NOT FROM GSAP INLINE STYLES.

     Two separate failures forced this, and the second one explains the first.

     ScrollTrigger caches each start as a scroll offset measured at build time,
     and this page changes height afterwards — the skills field unhides, the map
     adds or removes a pin spacer, fonts land. Headings below the change never
     got released and sat stuck at translateY(92px) inside an overflow:hidden
     mask: not late, gone.

     Moving to an IntersectionObserver fixed the staleness and the headings were
     STILL stuck, which is what exposed the real cause. Measured: the tween
     reported progress 1 and played true, while its targets reported
     `document.contains() === false` for every one. Something round-trips the
     heading's innerHTML after the split — the live DOM held freshly parsed
     spans carrying `transform: translate(0%, 118%)` as a serialised attribute,
     while GSAP animated the orphans it still had references to.

     An inline style written by JS cannot survive that. A class can, and so can
     a custom property, because both serialise into the new markup unchanged. So
     the motion is a CSS transition keyed off one class on the heading, and the
     only thing JS does is add the class. Whatever re-parses the markup, the
     rule still applies to whatever is actually on screen. */
  const splitHeads = [...document.querySelectorAll('[data-split]')];
  splitHeads.forEach((el) => {
    const words = splitWords(el);
    words.forEach((w, i) => w.style.setProperty('--wi', i));
  });

  if (reducedMotion) {
    splitHeads.forEach((el) => el.classList.add('is-split-in'));
  } else {
    const headIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-split-in');
        headIO.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -22% 0px' });
    splitHeads.forEach((el) => headIO.observe(el));

    /* The generic [data-reveal] blocks below still use ScrollTrigger, so a real
       height change still has to invalidate their offsets. Guarded on an actual
       delta because refresh() can resize the body via pins and would otherwise
       feed this observer its own output. */
    let lastH = document.body.scrollHeight;
    let rt = 0;
    new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastH) < 4) return;
      lastH = h;
      clearTimeout(rt);
      rt = setTimeout(() => ScrollTrigger.refresh(), 160);
    }).observe(document.body);
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  // --- generic blocks ------------------------------------------
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reducedMotion) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    /* Index among REVEALING SIBLINGS, so a block cascades but a section does
       not. Grouping by parent is what keeps the delay bounded to the handful
       of things that actually arrive together — see the note on --reveal-i in
       layout.css. */
    const seen = new Map();
    reveals.forEach((el) => {
      const parent = el.parentElement || document.body;
      const i = seen.get(parent) || 0;
      seen.set(parent, i + 1);
      el.style.setProperty('--reveal-i', Math.min(i, 6));

      ScrollTrigger.create({
        trigger: el,
        /* 82%, not 92%. At 92 the element has barely crossed the bottom
           edge, so the whole transition happens below the reader's eye and
           by the time they are looking at it, it finished. The complaint was
           exactly that -- "it is already there". */
        start: 'top 82%',
        once: true,
        onEnter: () => {
          el.classList.add('is-in');
          // Release the compositor layer once the transition has run.
          setTimeout(() => el.classList.add('is-done'), 1600);
        },
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
