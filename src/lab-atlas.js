/**
 * Entry for the map-concept page. Loads the atlas and nothing else — main.js
 * would boot the globe sequence, the skills field and the pixel map, none of
 * which exist here.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/atlas-lab.css';

import { initProjectAtlas } from './modules/projectatlas.js';

const atlas = initProjectAtlas();
if (atlas) {
  const list = document.getElementById('atlasList');
  const title = document.getElementById('atlasTitle');
  const note = document.getElementById('atlasNote');
  const idx = document.getElementById('atlasIdx');

  atlas.stops.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'atlas__item';
    b.innerHTML = `<span class="atlas__num">${String(i + 1).padStart(2, '0')}</span>
                   <span class="atlas__name">${s.label}</span>`;
    b.addEventListener('click', () => atlas.go(i));
    list.appendChild(b);
  });

  atlas.onChange((i) => {
    const s = atlas.stops[i];
    title.textContent = s.label;
    note.textContent = s.note;
    idx.textContent = `${String(i + 1).padStart(2, '0')} / ${String(atlas.stops.length).padStart(2, '0')}`;
    [...list.children].forEach((el, n) => el.classList.toggle('is-on', n === i));
  });

  atlas.go(0);

  /* Scroll steps between stops rather than scrolling the page. Throttled by a
     lock instead of by distance: a trackpad emits a burst of small deltas for
     one gesture, and counting pixels would skip four projects per flick. */
  let lock = false;
  addEventListener('wheel', (e) => {
    e.preventDefault();
    if (lock) return;
    lock = true;
    setTimeout(() => { lock = false; }, 620);
    const cur = [...list.children].findIndex((el) => el.classList.contains('is-on'));
    const next = Math.max(0, Math.min(atlas.stops.length - 1, cur + (e.deltaY > 0 ? 1 : -1)));
    atlas.go(next);
  }, { passive: false });

  addEventListener('keydown', (e) => {
    const cur = [...list.children].findIndex((el) => el.classList.contains('is-on'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') atlas.go(Math.min(atlas.stops.length - 1, cur + 1));
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') atlas.go(Math.max(0, cur - 1));
  });
}
