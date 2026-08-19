import { projects, archPages } from '../data/projects.js';
import { DIAGRAMS } from './diagrams.js';
import { stopScroll, startScroll } from './scroll.js';
import { frontCard } from './wheel.js';

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

  /* The headline finding. A case study that only describes its machinery never
     says what it discovered — the reader leaves knowing how it was built and
     not what it showed. This goes directly under the title, above everything
     else, because it is the one sentence worth remembering. */
  const finding = data.finding
    ? `<figure class="mfind">
         <blockquote>${data.finding.claim}</blockquote>
         ${data.finding.note ? `<figcaption>${esc(data.finding.note)}</figcaption>` : ''}
       </figure>`
    : '';

  /* An architecture diagram drawn as SVG rather than shipped as an image, so a
     number can be corrected in a text editor. See modules/diagrams.js. */
  const diagram = data.diagram && DIAGRAMS[data.diagram]
    ? `<div class="msec">Architecture</div>
       <div class="mdiagram">${DIAGRAMS[data.diagram]()}</div>`
    : '';

  /* One worked example beats a capability list. "Ranks interventions by
     beneficiaries" is a feature; "one water feature cools 16,167 residents and
     one cool-pavement patch cools 602, for the same money" is a finding the
     reader can argue with. */
  const worked = data.worked
    ? `<div class="msec">${esc(data.worked.sec)}</div>
       <div class="mwork">
         <p class="mwork__lead">${data.worked.lead}</p>
         <div class="mwork__rows">${data.worked.rows
           .map((r) => `<div class="mwork__row">
              <span class="mwork__v">${r.v}</span>
              <span class="mwork__l">${esc(r.l)}</span>
            </div>`).join('')}</div>
         ${data.worked.foot ? `<p class="mwork__foot">${esc(data.worked.foot)}</p>` : ''}
       </div>`
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

  /* Grouped galleries.

     `images` puts every figure in one undifferentiated grid under a single
     heading, which is fine when the figures are illustrations and wrong when
     they are an argument. These maps ARE the argument — inputs, then four
     models that disagree, then the two hotspot layers that disagree most, then
     the intersection — so each group carries its own heading and its own line
     of reasoning, and the order is the reasoning. */
  const galleries = data.galleries?.length
    ? data.galleries.map((g) => `
        <div class="msec">${esc(g.sec)}</div>
        ${g.note ? `<p class="mgal__note">${g.note}</p>` : ''}
        <div class="mgal mgal--maps" style="--map-cols:${g.cols || 3}">${g.items.map((im) => `
          <figure>
            <img src="${im.src}" alt="${esc(im.cap)}" loading="lazy" data-zoom
                 ${im.zoom ? `data-zoom-src="${im.zoom}"` : ''}>
            <figcaption>${esc(im.cap)}</figcaption>
          </figure>`).join('')}</div>`).join('')
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

  // Where a relocated section is dropped in, if this project has one. Placed
  // after the metrics and method and before the static gallery: it is the live
  // version of what the gallery shows stills of, so it earns the higher slot.
  const embed = data.embed ? '<div class="membed" data-embed-slot></div>' : '';

  /* The live dashboard.

     Three states, and the middle one is the point. The iframe loads on demand
     (nothing is fetched until the reader asks for it), then sits VISIBLE but
     disarmed behind a transparent shield — because deck.gl treats the wheel as
     zoom, and an armed map in the middle of a scrolling article eats the scroll
     the moment the pointer crosses it. Clicking arms it; clicking away or
     pressing Escape disarms it again. */
  const twin = data.twin
    ? `<div class="msec">${esc(data.twin.sec)}</div>
       <p class="mtwin__lead">${esc(data.twin.lead)}</p>
       <div class="mtwin" data-twin>
         <iframe class="mtwin__frame" data-twin-frame
                 data-src="${esc(data.twin.src)}"
                 title="${esc(data.twin.title)}"
                 allow="fullscreen; geolocation"
                 referrerpolicy="no-referrer-when-downgrade"></iframe>
         <button class="mtwin__shield" type="button" data-twin-arm>
           <span class="mtwin__cue">
             <span class="mtwin__dot" aria-hidden="true"></span>
             <span class="mtwin__cta">Launch the dashboard</span>
             <span class="mtwin__hint">${esc(data.twin.hint)}</span>
           </span>
         </button>
         <div class="mtwin__bar">
           <button class="mtwin__btn" type="button" data-twin-full>Full screen</button>
           <button class="mtwin__btn" type="button" data-twin-release hidden>Release cursor</button>
         </div>
       </div>
       <p class="mtwin__note">${data.twin.note}</p>`
    : '';

  return `
    <p class="mcat">${esc(data.cat)}</p>
    <h2 class="mtitle" id="modalTitle">${esc(data.title)}</h2>
    ${finding}
    <p class="mdesc">${data.desc}</p>
    ${metrics}${embed}${twin}${diagram}${method}${worked}${gallery}${galleries}${videos}${extra}${tags}${links}
  `;
}

/* ============================================================
   EMBEDDED SECTIONS
   Two full sections now live inside project cards rather than in the page:
   #atlas (Thesis Coverage) inside the thesis card, #thermal (Multi-City
   Surface Temperature) inside the temp card.

   The node is MOVED, not cloned. Cloning would duplicate ~100 lines of markup
   and, worse, duplicate every `id` and `data-i18n` in it — the translation
   engine and `getElementById` would then both pick whichever copy came first.
   Moving keeps one copy that stays translated and stays in the document for a
   crawler, at the cost of having to put it back on close.
   ============================================================ */
const EMBEDS = {
  atlas: { id: 'atlas', load: () => import('./atlas.js').then((m) => m.initAtlas) },
  thermal: { id: 'thermal', load: () => import('./thermal.js').then((m) => m.initThermal) },
};

let liveEmbed = null;   // { node, home, destroy }

/* ============================================================
   THE LIVE DASHBOARD
   ============================================================
   An iframe, deliberately, and not a merged component. The dashboard is a
   full-viewport React/Vite app (height:100vh) with its own router, Tailwind
   build and deck.gl context; this site is none of those things. Inside an
   iframe its 100vh resolves to the FRAME's height rather than the window's, so
   the property that makes it impossible to merge is the same one that makes it
   trivial to embed — it fills whatever box it is given, unmodified.

   Three states, and the middle one is the whole reason this is not four lines
   of markup:

     cold    nothing fetched. A 54 MB app should not load because someone
             opened a project card.
     live    running and visible, but behind a transparent shield. deck.gl
             reads the wheel as zoom, so an armed map sitting in a scrolling
             article swallows the page scroll the moment the pointer crosses
             it — the reader tries to scroll past and silently zooms Riyadh.
     armed   the shield is off and the app has the pointer. Click away, or
             press Release, to hand scrolling back.
*/
function initTwin(root) {
  const box = root.querySelector('[data-twin]');
  if (!box) return null;

  const frame = box.querySelector('[data-twin-frame]');
  const arm = box.querySelector('[data-twin-arm]');
  const full = box.querySelector('[data-twin-full]');
  const release = box.querySelector('[data-twin-release]');

  const load = () => {
    if (box.classList.contains('is-loaded')) return;
    frame.src = frame.dataset.src;
    box.classList.add('is-loaded');
  };

  const setArmed = (on) => {
    box.classList.toggle('is-armed', on);
    release.hidden = !on;
  };

  arm.addEventListener('click', () => { load(); setArmed(true); });
  release.addEventListener('click', () => setArmed(false));

  full.addEventListener('click', () => {
    if (document.fullscreenElement === box) { document.exitFullscreen?.(); return; }
    load();
    setArmed(true);
    /* Native fullscreen rather than a fixed overlay of our own. The modal panel
       is transformed while it animates, and a transformed ancestor re-bases
       position:fixed onto itself — a hand-rolled overlay would be sized to the
       panel instead of the screen. Where the API is refused, a new tab is a
       worse experience but never a broken one. */
    const req = box.requestFullscreen?.({ navigationUI: 'hide' });
    if (req?.catch) req.catch(() => window.open(frame.dataset.src, '_blank', 'noopener'));
    else if (!req) window.open(frame.dataset.src, '_blank', 'noopener');
  });

  // Pointerdown rather than click, and capture, so the scroll comes back on the
  // press instead of after whatever the press activates.
  const outside = (e) => { if (!box.contains(e.target)) setArmed(false); };
  document.addEventListener('pointerdown', outside, true);

  const onFs = () => {
    const on = document.fullscreenElement === box;
    box.classList.toggle('is-full', on);
    full.textContent = on ? 'Exit full screen' : 'Full screen';
  };
  document.addEventListener('fullscreenchange', onFs);

  return {
    destroy() {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('fullscreenchange', onFs);
      if (document.fullscreenElement === box) document.exitFullscreen?.();
      // Cut the app dead. It holds a WebGL context and polls open-meteo; left
      // running behind a closed modal it would keep both.
      frame.src = 'about:blank';
    },
  };
}

let liveTwin = null;

async function mountEmbed(name, slot) {
  const spec = EMBEDS[name];
  if (!spec) return;
  const node = document.getElementById(spec.id);
  if (!node || !slot) return;

  // Remember exactly where it came from, so close() can put it back in the
  // same place rather than appending it to the end of the body.
  const home = { parent: node.parentNode, next: node.nextSibling };
  slot.appendChild(node);
  node.hidden = false;

  let destroy = null;
  try {
    const init = await spec.load();
    // The module may return a teardown. atlas.js must — it holds a WebGL
    // context, and browsers reclaim the oldest once a handful are live.
    destroy = init(node) || null;
  } catch (err) {
    console.warn(`[modal] embed "${name}" failed to start`, err);
  }
  liveEmbed = { node, home, destroy };
}

function unmountEmbed() {
  if (!liveEmbed) return;
  const { node, home, destroy } = liveEmbed;
  liveEmbed = null;
  try { destroy?.(); } catch (err) { console.warn('[modal] embed teardown failed', err); }
  node.hidden = true;
  home.parent?.insertBefore(node, home.next);
}

export function initModal() {
  const modal = document.getElementById('modal');
  const inner = document.getElementById('modalInner');
  if (!modal || !inner) return;

  const open = (id) => {
    const data = projects[id];
    if (!data) return;
    // Guard against opening over an already-open modal: without this the old
    // embed's node is destroyed by the innerHTML wipe below while `liveEmbed`
    // still points at it, and it never gets put back.
    if (!modal.hidden) unmountEmbed();
    lastFocus = document.activeElement;
    inner.innerHTML = render(data);
    inner.scrollTop = 0;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    lock();
    modal.querySelector('.modal__close')?.focus();
    if (data.embed) mountEmbed(data.embed, inner.querySelector('[data-embed-slot]'));
    liveTwin = initTwin(inner);
  };

  const close = () => {
    // BEFORE the innerHTML wipe, and before the close animation. The embed is a
    // borrowed node that lives elsewhere in the document; if `inner.innerHTML`
    // is cleared while it is still parented here, the only copy of a whole
    // section is destroyed and the card opens empty ever after.
    unmountEmbed();
    try { liveTwin?.destroy(); } catch (err) { console.warn('[modal] twin teardown failed', err); }
    liveTwin = null;
    modal.classList.remove('is-open');
    setTimeout(() => { modal.hidden = true; inner.innerHTML = ''; }, 420);
    unlock();
    lastFocus?.focus();
  };

  /* Delegated, with a positional fallback — and both halves are load bearing.

     Binding click straight onto each card looks obviously correct and does not
     work. The cards sit inside a preserve-3d ring, and the hit-test CHANGES
     mid-gesture: measured on the front card, pointerdown reports target
     .pcard__media (resolving to the card), while pointerup and click both
     report the ancestor .wheel. A listener on the card therefore never fires,
     and every research card silently did nothing when clicked. Only .click()
     from the console worked, which is exactly why it survived so long.

     So: listen on the document, and when the target walk comes up empty ask the
     POSITION instead — elementFromPoint resolves correctly at the moment of the
     click even though the event's own target does not. Same fix, same reason,
     as the architecture books in book.js. */
  document.addEventListener('click', (e) => {
    if (!modal.hidden) return;                 // never re-open from under an open modal
    let el = e.target.closest?.('[data-modal]');
    if (!el && e.clientX != null) {
      el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-modal]');
    }
    /* Last resort, and the one that actually carries the wheel: derive the front
       card from geometry. Neither the event target nor elementFromPoint can be
       trusted once the ring is rotated off zero — see frontCard() in wheel.js
       for the measurement. A click anywhere in the wheel opens whatever is
       facing the reader, which is also what the idiom promises. */
    if (!el) {
      const wheel = e.target.closest?.('.wheel');
      if (wheel) el = frontCard(wheel, '[data-modal]');
    }
    if (!el) return;
    open(el.dataset.modal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = e.target.closest?.('[data-modal]');
    if (!el || !modal.hidden) return;
    e.preventDefault();
    open(el.dataset.modal);
  });

  modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  // Delegate zoom so it also covers images injected after open.
  inner.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-zoom]');
    // Prefer the zoom tier. These map layouts carry their meaning in the
    // legend, and the gallery file is sized for a grid cell — magnifying it
    // shows a bigger blur rather than the classes and breaks it was made to
    // communicate.
    if (img) openLightbox(img.dataset.zoomSrc || img.src, img.alt);
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
