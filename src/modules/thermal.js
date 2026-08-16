import { reducedMotion } from './scroll.js';

const COPY = {
  dammam:    { title: 'Dammam.<br><em>26° North.</em>',    caption: 'Hot desert. Mean surface temperature 31.5&thinsp;°C across 14 days of MODIS observation.' },
  dublin:    { title: 'Dublin.<br><em>53° North.</em>',    caption: 'Temperate maritime. Mean 9.6&thinsp;°C — 21.9&thinsp;°C cooler than Dammam, 27° of latitude away.' },
  reykjavik: { title: 'Reykjavík.<br><em>64° North.</em>', caption: 'Subpolar. Mean −3.7&thinsp;°C. Latitude alone explains 99% of the variance: r = −0.995.' },
};

/**
 * Three Kepler.gl recordings of the same fortnight at three latitudes.
 *
 * This used to be a 320vh pinned section: scroll position picked the city and
 * scrubbed that city's clip frame by frame. It now lives inside the
 * "Multi-City Surface Temperature Analysis" project card, and a dialog has no
 * scroll runway to scrub against — the panel is barely taller than the
 * viewport. So the driver changes rather than the content: the legend becomes
 * the control, and each clip plays itself.
 *
 * The comparison survives the change because the comparison was never in the
 * scrubbing. It is in the three numbers — 31.5, 9.6, −3.7 — and in being able
 * to put them side by side, which a tab strip does more directly than a scroll
 * position ever did.
 *
 * Returns a teardown. Videos left playing behind a closed dialog keep decoding
 * frames and holding the decoder, which on a phone is a real battery cost.
 */
export function initThermal(root) {
  const section = root || document.getElementById('thermal');
  if (!section) return;

  const videos = [...section.querySelectorAll('.thermal__video')];
  const legend = [...section.querySelectorAll('.thermal__legend li')];
  const titleEl = section.querySelector('#thermalTitle');
  const captionEl = section.querySelector('#thermalCaption');
  if (!videos.length) return;

  let current = -1;

  const setCity = (index) => {
    if (index === current) return;
    current = index;
    const city = videos[index].dataset.city;

    videos.forEach((v, i) => {
      const on = i === index;
      v.classList.toggle('is-active', on);
      if (on) {
        // Load on demand. Three clips eagerly fetched is most of the section's
        // weight, and only one is ever on screen.
        v.loop = true;              // the page version scrubbed; a panel repeats
        if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
        if (!reducedMotion) {
          // `play()` on a `preload="none"` element that has just been asked to
          // load rejects — there is no data yet, and the rejection is silent.
          // Measured: the clip switched and the title updated while the frame
          // stayed on the poster. Wait for data when there is none.
          const go = () => v.play?.().catch(() => { /* autoplay policy — poster stands in */ });
          if (v.readyState >= 2) go();
          else v.addEventListener('canplay', go, { once: true });
        }
      } else {
        v.pause?.();
        v.currentTime = 0;
      }
    });

    legend.forEach((li) => li.classList.toggle('is-active', li.dataset.city === city));

    if (COPY[city]) {
      titleEl && (titleEl.innerHTML = COPY[city].title);
      captionEl && (captionEl.innerHTML = COPY[city].caption);
    }
  };

  /* The legend is the control now, so it has to behave like one: real buttons
     for keyboard and screen readers, not decorated list items with a click
     handler. `aria-pressed` is what tells a screen-reader user which of the
     three is showing — the amber dot only says it to people who can see it. */
  legend.forEach((li, i) => {
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-pressed', String(i === 0));
    li.style.cursor = 'pointer';
    const pick = () => {
      setCity(i);
      legend.forEach((o, j) => o.setAttribute('aria-pressed', String(i === j)));
    };
    li.addEventListener('click', pick);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
    });
  });

  setCity(0);

  return function destroy() {
    // Pause and rewind, but leave `src` alone. Stripping it would free the
    // decoder sooner and permanently break the clip on the next open, because
    // the source lives in the markup and nothing puts it back. Dropping
    // `preload` to none is enough: a paused, hidden video is not decoding.
    videos.forEach((v) => {
      v.pause?.();
      v.currentTime = 0;
      v.preload = 'none';
      v.classList.remove('is-active');
    });
    current = -1;
  };
}
