import { projects, archPages } from '../data/projects.js';
import { stopScroll, startScroll } from './scroll.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let lastFocus = null;

function lock() { document.body.classList.add('is-locked'); stopScroll(); }
function unlock() { document.body.classList.remove('is-locked'); startScroll(); }

/* ============================================================
   PROJECT MODAL
   ============================================================ */

function render(data) {
  const metrics = data.metrics?.length
    ? `<div class="mmetrics">${data.metrics
        .map((m) => `<div><div class="mmv">${m.v}</div><div class="mml">${esc(m.l)}</div></div>`)
        .join('')}</div>`
    : '';

  const method = data.method
    ? `<div class="msec">Method</div><p class="mmethod">${esc(data.method)}</p>`
    : '';

  const gallery = data.images?.length
    ? `<div class="msec">Maps &amp; Visuals</div><div class="mgal">${data.images
        .map((im) => `<figure><img src="${im.src}" alt="${esc(im.cap)}" loading="lazy" data-zoom><figcaption>${esc(im.cap)}</figcaption></figure>`)
        .join('')}</div>`
    : '';

  const videos = data.videos?.length
    ? `<div class="msec">Kepler.gl 3D Recordings</div><div class="mgal">${data.videos
        .map((v) => `<figure><video src="${v.src}" poster="${v.poster}" muted loop playsinline controls preload="none"></video><figcaption>${esc(v.cap)}</figcaption></figure>`)
        .join('')}</div>`
    : '';

  const extra = data.images2?.length
    ? `<div class="mgal" style="margin-top:1.25rem">${data.images2
        .map((im) => `<figure><img src="${im.src}" alt="${esc(im.cap)}" loading="lazy" data-zoom><figcaption>${esc(im.cap)}</figcaption></figure>`)
        .join('')}</div>`
    : '';

  const tags = data.tags?.length
    ? `<div class="msec">Stack &amp; Methods</div><div class="tags">${data.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
    : '';

  const links = data.links?.length
    ? `<div class="mlinks">${data.links
        .map((l) => {
          if (l.dev) return `<span class="ml ml--dev">🚫 ${esc(l.t)}</span>`;
          if (!l.h) return '';
          return `<a href="${l.h}" target="_blank" rel="noopener" class="ml ${l.primary ? 'ml--primary' : 'ml--ghost'}">${esc(l.t)} ↗</a>`;
        })
        .join('')}</div>`
    : '';

  return `
    <p class="mcat">${esc(data.cat)}</p>
    <h2 class="mtitle" id="modalTitle">${esc(data.title)}</h2>
    <p class="mdesc">${data.desc}</p>
    ${metrics}${method}${gallery}${videos}${extra}${tags}${links}
  `;
}

export function initModal() {
  const modal = document.getElementById('modal');
  const inner = document.getElementById('modalInner');
  if (!modal || !inner) return;

  const open = (id) => {
    const data = projects[id];
    if (!data) return;
    lastFocus = document.activeElement;
    inner.innerHTML = render(data);
    inner.scrollTop = 0;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    lock();
    modal.querySelector('.modal__close')?.focus();
  };

  const close = () => {
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; inner.innerHTML = ''; }, 420);
    unlock();
    lastFocus?.focus();
  };

  document.querySelectorAll('[data-modal]').forEach((el) => {
    el.addEventListener('click', () => open(el.dataset.modal));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.dataset.modal); }
    });
  });

  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  // Delegate zoom so it also covers images injected after open.
  inner.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-zoom]');
    if (img) openLightbox(img.src, img.alt);
  });
}

/* ============================================================
   LIGHTBOX
   ============================================================ */

function openLightbox(src, alt) {
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  if (!box || !img) return;
  img.src = src;
  img.alt = alt || '';
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add('is-open'));
}

export function initLightbox() {
  const box = document.getElementById('lightbox');
  if (!box) return;
  const close = () => {
    box.classList.remove('is-open');
    setTimeout(() => { box.hidden = true; }, 320);
  };
  box.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !box.hidden) close();
  });
}

/* ============================================================
   ARCHITECTURE PORTFOLIO — 18 slides
   ============================================================ */

export function initArch() {
  const modal = document.getElementById('archModal');
  const stage = document.getElementById('archStage');
  const dotBar = document.getElementById('archDots');
  const openBtn = document.getElementById('archOpen');
  if (!modal || !stage || !openBtn) return;

  const curEl = document.getElementById('archCur');
  const totEl = document.getElementById('archTot');
  const prevBtn = document.getElementById('archPrev');
  const nextBtn = document.getElementById('archNext');

  let built = false;
  let index = 0;
  const slides = [];
  const dots = [];

  const build = () => {
    if (built) return;
    built = true;
    totEl.textContent = archPages.length;

    archPages.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'arch__slide' + (i === 0 ? ' is-current' : '');
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Architecture portfolio, page ${i + 1} of ${archPages.length}`;
      img.loading = i < 2 ? 'eager' : 'lazy';
      img.draggable = false;
      slide.appendChild(img);
      stage.appendChild(slide);
      slides.push(slide);

      const dot = document.createElement('button');
      dot.className = 'arch__dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Go to page ${i + 1}`);
      dot.addEventListener('click', () => go(i));
      dotBar.appendChild(dot);
      dots.push(dot);
    });
  };

  const go = (n) => {
    if (n < 0 || n >= slides.length) return;
    slides[index].classList.remove('is-current');
    index = n;
    slides[index].classList.add('is-current');
    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
    curEl.textContent = index + 1;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === slides.length - 1;
  };

  const open = () => {
    build();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    lock();
    go(0);
  };

  const close = () => {
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; }, 420);
    unlock();
  };

  openBtn.addEventListener('click', open);
  document.getElementById('archClose')?.addEventListener('click', close);
  prevBtn?.addEventListener('click', () => go(index - 1));
  nextBtn?.addEventListener('click', () => go(index + 1));

  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(index - 1); }
    if (e.key === 'Escape') close();
  });

  let touchX = 0;
  modal.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  modal.addEventListener('touchend', (e) => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 45) go(dx > 0 ? index + 1 : index - 1);
  }, { passive: true });
}
