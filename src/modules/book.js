import { archBySlug, archPage, archPageHi } from '../data/arch.js';
import { reducedMotion, stopScroll, startScroll } from './scroll.js';

/**
 * A real book: two pages open at once, and leaves that turn about the spine.
 *
 * WHY LEAVES AND NOT A SLIDESHOW
 * A leaf is one sheet with a page printed on each side — front is the recto you
 * are reading, back is the verso you will read once it lands. That is the whole
 * trick: turning leaf N about the spine reveals page 2N on its own back and page
 * 2N+1 underneath, which is exactly what a book does. Crossfading two flat
 * images cannot produce that, because there is no back.
 *
 * The spread is [verso, recto] = [2n, 2n+1], with page 1 alone on the right at
 * the start the way a cover sits opposite a blank endpaper.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * No page-curl shading gradients that follow the fold, no paper texture, no
 * drop shadow that tracks the turn angle. Those are what make CSS flipbooks feel
 * like a novelty. The turn is the fold, the spine has depth, and the drawings
 * are the thing being looked at.
 */

const TURN_MS = 620;

export function initBook() {
  const modal = document.getElementById('bookModal');
  if (!modal) return;

  const stage = modal.querySelector('.book__stage');
  const titleEl = modal.querySelector('.book__title');
  const metaEl = modal.querySelector('.book__meta');
  const countEl = modal.querySelector('.book__count');
  const prevBtn = modal.querySelector('[data-book-prev]');
  const nextBtn = modal.querySelector('[data-book-next]');
  const zoomIn = modal.querySelector('[data-book-zoomin]');
  const zoomOut = modal.querySelector('[data-book-zoomout]');
  const closeBtn = modal.querySelector('[data-book-close]');
  const viewport = modal.querySelector('.book__viewport');

  let project = null;
  let spread = 0;          // 0 = cover, then leaves
  let leaves = 0;
  /* One page at a time on a phone. A two-page spread of square sheets gives
     each page about 170px across, which for a dimensioned drawing is not a
     page at all. Single mode keeps the same leaves and the same order — the
     spread just stops being a spread, and the spine moves to the left edge. */
  const narrow = window.matchMedia('(max-width: 720px)');
  let single = narrow.matches;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let turning = false;
  let lastFocus = null;

  /* ---- geometry ------------------------------------------------
     The book is sized to FIT, never to fill: a spread that overflows means the
     reader is scrolling a drawing instead of reading it. Two pages side by side
     make an aspect of 2*pageAspect, and whichever of width or height binds
     first decides the size. */
  function layout() {
    if (!project) return;
    const r = viewport.getBoundingClientRect();
    const spreadAspect = project.aspect * (single ? 1 : 2);
    let w = r.width * 0.94;
    let h = w / spreadAspect;
    if (h > r.height * 0.94) {
      h = r.height * 0.94;
      w = h * spreadAspect;
    }
    stage.style.width = `${w.toFixed(0)}px`;
    stage.style.height = `${h.toFixed(0)}px`;
    stage.style.setProperty('--page-w', `${(single ? w : w / 2).toFixed(2)}px`);
  }

  /** Page number for a slot, or 0 for a blank endpaper.
   *  In single mode each slot IS a page, so the pair collapses to one. */
  const versoOf = (s) => (single ? 0 : s === 0 ? 0 : s * 2);
  const rectoOf = (s) => (single ? s + 1 : s === 0 ? 1 : s * 2 + 1);
  const lastSlot = () => (single ? project.pages - 1 : Math.ceil((project.pages - 1) / 2));

  function pageImg(n) {
    if (!n || n > project.pages) return null;
    const img = document.createElement('img');
    img.src = archPage(project.slug, n);
    img.alt = `${project.title} — page ${n} of ${project.pages}`;
    img.loading = 'eager';
    img.decoding = 'async';
    img.dataset.page = String(n);
    return img;
  }

  function face(n, cls) {
    const el = document.createElement('div');
    el.className = `book__face ${cls}`;
    const img = pageImg(n);
    if (img) el.appendChild(img);
    else el.classList.add('is-blank');
    return el;
  }

  /** Rebuild the visible spread. Only three leaves ever exist in the DOM — the
   *  one turning and the two it reveals — so a 28-page book costs the same as a
   *  6-page one. */
  function render() {
    stage.innerHTML = '';

    if (!single) {
      const left = document.createElement('div');
      left.className = 'book__side book__side--left';
      left.appendChild(face(versoOf(spread), 'book__face--verso'));
      stage.appendChild(left);
    }

    const right = document.createElement('div');
    right.className = `book__side book__side--right${single ? ' is-single' : ''}`;
    right.appendChild(face(rectoOf(spread), 'book__face--recto'));
    stage.appendChild(right);

    if (!single) {
      const spine = document.createElement('div');
      spine.className = 'book__spine';
      stage.appendChild(spine);
    }

    updateChrome();
    if (zoom > 1.01) upgradeFaces();
    preload(spread + 1);
  }

  /** Fetch the next spread's pages while the reader is still on this one. */
  function preload(s) {
    [versoOf(s), rectoOf(s)].forEach((n) => {
      if (n && n <= project.pages) new Image().src = archPage(project.slug, n);
    });
  }

  function updateChrome() {
    const shown = [versoOf(spread), rectoOf(spread)].filter((n) => n && n <= project.pages);
    countEl.textContent = shown.length
      ? `${shown.join('–')} / ${project.pages}`
      : `— / ${project.pages}`;
    prevBtn.disabled = spread === 0;
    nextBtn.disabled = spread >= leaves;
  }

  /* ---- the turn ------------------------------------------------
     A temporary leaf is laid over the side being turned, carrying the page that
     is leaving on its front and the page that is arriving on its back. It
     rotates about the spine; when it lands, the spread is rebuilt and the leaf
     is thrown away. Building it per turn rather than keeping a stack means the
     DOM never holds more than one animating element. */
  function turn(dir) {
    if (turning || !project) return;
    const next = spread + dir;
    if (next < 0 || next > leaves) return;
    turning = true;

    if (reducedMotion) {
      spread = next;
      render();
      turning = false;
      return;
    }

    const leaf = document.createElement('div');
    leaf.className = `book__leaf book__leaf--${dir > 0 ? 'fwd' : 'back'}${single ? ' is-single' : ''}`;

    /* Which page rides on which face.

       Spread mode hinges at the spine in the middle. Single mode hinges at the
       left edge and the leaf covers the whole stage, so the pair is simply
       "the page you are on" and "the page you are going to" — and going
       BACKWARD the leaf starts already turned, which swaps which face is
       showing at rest. Reading versoOf here in single mode would return 0 and
       turn every backward page into a blank. */
    const frontN = single
      ? (dir > 0 ? rectoOf(spread) : rectoOf(next))
      : (dir > 0 ? rectoOf(spread) : versoOf(spread));
    const backN = single
      ? (dir > 0 ? rectoOf(next) : rectoOf(spread))
      : (dir > 0 ? versoOf(next) : rectoOf(next));

    const front = face(frontN, 'book__face--front');
    const back = face(backN, 'book__face--back');
    leaf.append(front, back);
    stage.appendChild(leaf);

    // Force a frame so the start transform is committed before the class that
    // animates it — without this the browser coalesces both and nothing moves.
    void leaf.offsetWidth;
    leaf.classList.add('is-turning');

    setTimeout(() => {
      spread = next;
      render();
      turning = false;
    }, TURN_MS);
  }

  /* ---- zoom ----------------------------------------------------
     Magnifying swaps in the 3000px tier rather than scaling the 1600px spread
     image. The arithmetic forces it: a half-spread is about 750 CSS px, so 4x
     is a 3000px rendering, and scaling the spread file there would double every
     pixel. On architectural sheets the dimension strings and annotations are
     the content — a magnifier that returns mush is worse than no magnifier.

     The cost is only paid by readers who actually zoom, and only for the pages
     they zoom on. The swap happens on load rather than on request, so the sharp
     file replaces the soft one in place and the reader never sees a gap. */
  const upgraded = new Set();

  function upgradeFaces() {
    if (!project) return;
    stage.querySelectorAll('img[data-page]').forEach((img) => {
      const n = img.dataset.page;
      const hi = archPageHi(project.slug, Number(n));
      if (img.src.endsWith(hi) || upgraded.has(`${project.slug}/${n}`)) {
        if (!img.src.endsWith(hi)) img.src = hi;
        return;
      }
      const probe = new Image();
      probe.onload = () => {
        upgraded.add(`${project.slug}/${n}`);
        // The face may have turned away while this was in flight; only swap if
        // the element is still showing the page it was fetched for.
        if (img.isConnected && img.dataset.page === n) img.src = hi;
      };
      probe.src = hi;
    });
  }

  function applyZoom() {
    stage.style.setProperty('--zoom', zoom.toFixed(2));
    stage.style.setProperty('--pan-x', `${panX.toFixed(0)}px`);
    stage.style.setProperty('--pan-y', `${panY.toFixed(0)}px`);
    modal.classList.toggle('is-zoomed', zoom > 1.01);
    zoomOut.disabled = zoom <= 1.01;
    zoomIn.disabled = zoom >= 3.99;
  }

  function setZoom(z) {
    zoom = Math.min(4, Math.max(1, z));
    if (zoom === 1) { panX = 0; panY = 0; }
    else upgradeFaces();
    applyZoom();
  }

  /* Drag to pan, but only while zoomed — otherwise a drag on the book would
     fight the page-turn gesture. */
  let dragging = false;
  let lx = 0;
  let ly = 0;
  viewport.addEventListener('pointerdown', (e) => {
    if (zoom <= 1.01 || e.target.closest('button')) return;
    dragging = true; lx = e.clientX; ly = e.clientY;
    viewport.setPointerCapture?.(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    panX += e.clientX - lx;
    panY += e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    applyZoom();
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    viewport.releasePointerCapture?.(e.pointerId);
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  /* ---- open / close -------------------------------------------- */
  function open(slug) {
    project = archBySlug(slug);
    if (!project) return;
    single = narrow.matches;
    leaves = lastSlot();
    spread = 0;
    setZoom(1);
    titleEl.textContent = project.title;
    metaEl.textContent = project.meta;
    lastFocus = document.activeElement;

    modal.hidden = false;
    // Two frames: hidden -> shown has to commit before the open class animates,
    // and layout needs the viewport to have a real size before it can fit.
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      layout();
      render();
      closeBtn.focus();
    });
    stopScroll();
    document.body.classList.add('is-locked');
  }

  function close() {
    modal.classList.remove('is-open');
    startScroll();
    document.body.classList.remove('is-locked');
    setTimeout(() => {
      modal.hidden = true;
      stage.innerHTML = '';
      project = null;
      lastFocus?.focus?.();
    }, 260);
  }

  prevBtn.addEventListener('click', () => turn(-1));
  nextBtn.addEventListener('click', () => turn(1));
  zoomIn.addEventListener('click', () => setZoom(zoom + 0.5));
  zoomOut.addEventListener('click', () => setZoom(zoom - 0.5));
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') turn(1);
    if (e.key === 'ArrowLeft') turn(-1);
    if (e.key === '+' || e.key === '=') setZoom(zoom + 0.5);
    if (e.key === '-') setZoom(zoom - 0.5);
  });

  /* Crossing the breakpoint changes the page-per-slot mapping, so the slot the
     reader is on has to be carried across rather than kept: slot 3 of a spread
     book is pages 6-7, but slot 3 of a single book is page 4. Convert through
     the page number so the reader stays where they were reading. */
  function setMode(toSingle) {
    if (!project || toSingle === single) return;
    const page = rectoOf(spread) || 1;
    single = toSingle;
    leaves = lastSlot();
    spread = single ? Math.max(0, page - 1) : Math.max(0, Math.floor(page / 2));
    layout();
    render();
  }

  narrow.addEventListener('change', (e) => setMode(e.matches));
  window.addEventListener('resize', () => { setMode(narrow.matches); layout(); }, { passive: true });

  /* Any card carrying data-book opens it.

     The elementFromPoint fallback is not defensive padding — it is load
     bearing. The cards live inside a preserve-3d ring, and a real click on a
     card there resolves its target to the ANCESTOR section rather than to the
     card: measured at both 1440 and 800 wide, a trusted click at the card's
     exact centre reported target `.wheel` while elementFromPoint at the very
     same coordinates returned the card. Paint and hit-test disagree inside the
     3D subtree. Synthetic .click() works, which is exactly why this survives
     casual testing and fails for every actual visitor.

     So when the target walk comes up empty, ask the position instead. */
  document.addEventListener('click', (e) => {
    let t = e.target.closest?.('[data-book]');
    if (!t && e.clientX != null) {
      t = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-book]');
    }
    if (!t) return;
    e.preventDefault();
    open(t.dataset.book);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest?.('[data-book]');
    if (!t) return;
    e.preventDefault();
    open(t.dataset.book);
  });

  return { open, close };
}
