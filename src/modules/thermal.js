import { ScrollTrigger, reducedMotion } from './scroll.js';

const COPY = {
  dammam:    { title: 'Dammam.<br><em>26° North.</em>',    caption: 'Hot desert. Mean surface temperature 31.5&thinsp;°C across 14 days of MODIS observation.' },
  dublin:    { title: 'Dublin.<br><em>53° North.</em>',    caption: 'Temperate maritime. Mean 9.6&thinsp;°C — 21.9&thinsp;°C cooler than Dammam, 27° of latitude away.' },
  reykjavik: { title: 'Reykjavík.<br><em>64° North.</em>', caption: 'Subpolar. Mean −3.7&thinsp;°C. Latitude alone explains 99% of the variance: r = −0.995.' },
};

/**
 * Three Kepler.gl recordings, one sticky viewport. Scroll position picks the
 * city and scrubs that city's clip frame by frame.
 */
export function initThermal() {
  const section = document.getElementById('thermal');
  if (!section) return;

  const videos = [...section.querySelectorAll('.thermal__video')];
  const legend = [...section.querySelectorAll('.thermal__legend li')];
  const titleEl = document.getElementById('thermalTitle');
  const captionEl = document.getElementById('thermalCaption');
  if (!videos.length) return;

  const band = 1 / videos.length;
  let current = -1;
  let loaded = false;

  const loadAll = () => {
    if (loaded) return;
    loaded = true;
    videos.forEach((v) => { v.preload = 'auto'; v.load(); });
  };

  const setCity = (index) => {
    if (index === current) return;
    current = index;
    const city = videos[index].dataset.city;

    videos.forEach((v, i) => v.classList.toggle('is-active', i === index));
    legend.forEach((li) => li.classList.toggle('is-active', li.dataset.city === city));

    if (COPY[city]) {
      titleEl.innerHTML = COPY[city].title;
      captionEl.innerHTML = COPY[city].caption;
    }
  };

  if (reducedMotion) {
    // Static poster frames only — no scrubbing, no autoplay.
    setCity(0);
    return;
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onEnter: loadAll,
    onEnterBack: loadAll,
    onUpdate: (self) => {
      const p = self.progress;
      const index = Math.min(videos.length - 1, Math.floor(p / band));
      setCity(index);

      // Position within this city's band drives its playhead.
      const local = Math.min(1, Math.max(0, (p - index * band) / band));
      const video = videos[index];
      if (video.readyState >= 1 && video.duration) {
        const t = local * (video.duration - 0.05);
        if (Math.abs(video.currentTime - t) > 0.02) video.currentTime = t;
      }
    },
  });

  // Clicking a legend entry jumps to that city's band.
  legend.forEach((li, i) => {
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => {
      const top = section.offsetTop + section.offsetHeight * (i * band + band / 2);
      window.scrollTo({ top: top - window.innerHeight / 2, behavior: 'smooth' });
    });
  });
}
