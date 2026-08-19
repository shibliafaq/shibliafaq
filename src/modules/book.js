import { archBySlug, archPage, archPageHi } from '../data/arch.js';
import { reducedMotion, stopScroll, startScroll } from './scroll.js';
import { frontCard } from './wheel.js';

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
 * The spread is [verso, recto] = [2n+1, 2n+2], so the book opens on page 1 at
 * the left and each spread pairs an odd page with the even one after it.
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
   *
   *  Slot n is pages (2n+1, 2n+2): the book OPENS on page 1 at the left, and
   *  every spread is an odd page facing the even one after it.
   *
   *  This replaces a printer's convention — page 1 alone on the right with a
   *  blank facing it, the way a cover sits opposite an endpaper. That is how a
   *  physical book is bound, but these are portfolio sheets rather than a bound
   *  volume, and opening on a blank half reads as a missing page rather than as
   *  a front cover. Page 1 is the work; it goes first, on the left.
   *
   *  In single mode each slot IS a page, so the pair collapses to one. */
  const versoOf = (s) => (single ? 0 : s * 2 + 1);
  const rectoOf = (s) => (single ? s + 1 : s * 2 + 2);
  const lastSlot = () => (single ? project.pages - 1 : Math.ceil(project.pages / 2) - 1);

  function pageImg(n) {
    if (!n || n > project.pages) return null;
    const img = document.createElement('img');
    img.src = archPage(project.slug, n);
    img.alt = `${project.title} — page ${n} of ${project.pages}`;
    img.loading = 'eager';
    img.decoding = 'async';
    img.dataset.page = String(n);
    /* Not draggable. An <img> is a native drag source, so pressing on the page
       and moving starts Chrome's own image drag-and-drop after a few pixels —
       which swallows the pointer stream and freezes the pan mid-gesture. The
       CSS rule covers the same ground; both are here because this one is the
       one that survives someone rewriting the stylesheet. */
    img.draggable = false;
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

  /** Put a page into one side of the spread, replacing whatever was there. */
  function setFace(side, n, cls) {
    if (!side) return;
    side.replaceChildren(face(n, cls));
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

    const leftSide = stage.querySelector('.book__side--left');
    const rightSide = stage.querySelector('.book__side--right');

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

    /* Put the ARRIVING page underneath the leaf now, not when the turn ends.

       This is what a book does: the leaf lifts and the next page is already
       there beneath it. Waiting until the turn landed meant the old page sat in
       place for the whole 620ms and then swapped — which reads as the page
       updating late, because it is. Under the leaf it is invisible while it
       decodes, so by the time the sweep uncovers it there is nothing to wait
       for. */
    if (single || dir > 0) setFace(rightSide, rectoOf(next), 'book__face--recto');
    else setFace(leftSide, versoOf(next), 'book__face--verso');

    // Force a frame so the start transform is committed before the class that
    // animates it — without this the browser coalesces both and nothing moves.
    void leaf.offsetWidth;
    leaf.classList.add('is-turning');

    setTimeout(() => {
      spread = next;

      /* Move the leaf's back face into the side it landed on rather than
         rebuilding the spread. render() replaces every <img>, and a fresh
         element re-decodes even a cached file — a visible stall at the exact
         moment the reader is waiting for the page. This element is already on
         screen and already decoded; adopting the node costs nothing. */
      if (!single) {
        back.classList.remove('book__face--back');
        back.classList.add(dir > 0 ? 'book__face--verso' : 'book__face--recto');
        (dir > 0 ? leftSide : rightSide)?.replaceChildren(back);
      }

      leaf.remove();
      updateChrome();
      if (zoom > 1.01) upgradeFaces();
      preload(spread + 1);
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

  const MAX_ZOOM = 4;

  function applyZoom() {
    stage.style.setProperty('--zoom', zoom.toFixed(3));
    stage.style.setProperty('--pan-x', `${panX.toFixed(1)}px`);
    stage.style.setProperty('--pan-y', `${panY.toFixed(1)}px`);
    modal.classList.toggle('is-zoomed', zoom > 1.01);
    zoomOut.disabled = zoom <= 1.01;
    zoomIn.disabled = zoom >= MAX_ZOOM - 0.01;
  }

  /* Keep the page inside the viewport.

     Without this you can drag a magnified sheet clean out of frame and be left
     looking at an empty black rectangle with no way back except zooming out.
     The stage is scaled about its own centre, so the furthest it may travel in
     each axis is half the overflow — at 1x the overflow is negative, which
     clamps pan to zero and re-centres the spread automatically. */
  function clampPan() {
    const r = viewport.getBoundingClientRect();
    const w = stage.offsetWidth * zoom;
    const h = stage.offsetHeight * zoom;
    const mx = Math.max(0, (w - r.width) / 2);
    const my = Math.max(0, (h - r.height) / 2);
    panX = Math.min(mx, Math.max(-mx, panX));
    panY = Math.min(my, Math.max(-my, panY));
  }

  /* Zoom about a point rather than about the centre.

     The stage maps a local point p to the screen as C + pan + zoom*p, where C
     is the untransformed centre. Holding the point under the cursor fixed
     across a zoom change gives pan' = d - (z2/z1)(d - pan), with d the cursor's
     offset from C. Centre-anchored zoom is what makes a magnifier feel like it
     is fighting you: the detail you aimed at slides away as it grows. */
  function zoomAt(z, clientX, clientY) {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    if (Math.abs(next - zoom) < 0.001) return;
    const r = viewport.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2);
    const dy = clientY - (r.top + r.height / 2);
    const k = next / zoom;
    panX = dx - k * (dx - panX);
    panY = dy - k * (dy - panY);
    zoom = next;
    if (zoom <= 1.001) { panX = 0; panY = 0; }
    else upgradeFaces();
    clampPan();
    applyZoom();
  }

  /** Button and keyboard zoom, anchored on the middle of the viewport. */
  function setZoom(z) {
    const r = viewport.getBoundingClientRect();
    zoomAt(z, r.left + r.width / 2, r.top + r.height / 2);
  }

  /* ---- gestures ------------------------------------------------
     Wheel magnifies, two fingers pinch, double-click toggles. All three are
     what people already try on an image, and none of them should scroll the
     page underneath — the modal is the only thing on screen.

     Wheel is exponential rather than additive so the step feels the same at 1x
     and at 3x; a fixed +0.5 is a huge jump at the bottom and a nudge at the
     top. A trackpad pinch arrives as ctrl+wheel, which lands here too.

     0.0015 puts one notch at about 20%, so 1x to 4x is roughly eight notches.
     At 0.0022 it was 30% a notch and five notches crossed the whole range,
     which overshoots the detail you were aiming for. */
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  }, { passive: false });

  viewport.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    zoomAt(zoom > 1.01 ? 1 : 2.5, e.clientX, e.clientY);
  });

  /* Drag to pan, and two pointers to pinch.

     Pointers are tracked in a map because a pinch is just "more than one live
     pointer": the ratio of the current span to the span at gesture start is the
     zoom, and the midpoint is what stays put. Tracking them by id rather than
     counting touches keeps a stray third finger from corrupting the span. */
  const points = new Map();
  let dragging = false;
  let lx = 0;
  let ly = 0;
  let pinchSpan = 0;
  let pinchZoom = 1;

  const span = () => {
    const [a, b] = [...points.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...points.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };

  /* Capture is a nicety; the gesture state is not. setPointerCapture throws for
     a pointer the browser does not consider active, and sitting above the state
     update that meant one throw skipped the rest of the handler — pinchSpan
     stayed 0 and every pinch silently did nothing. State first, capture after,
     and never let the capture take the handler down with it. */
  const capture = (id) => { try { viewport.setPointerCapture?.(id); } catch { /* not a live pointer */ } };

  viewport.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (points.size === 2) {
      dragging = false;
      pinchSpan = span();
      pinchZoom = zoom;
    } else if (points.size === 1 && zoom > 1.01) {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    }
    capture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (points.size >= 2) {
      if (!pinchSpan) return;
      const m = mid();
      zoomAt(pinchZoom * (span() / pinchSpan), m.x, m.y);
      return;
    }
    if (!dragging) return;
    panX += e.clientX - lx;
    panY += e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    clampPan();
    applyZoom();
  });

  const endPointer = (e) => {
    points.delete(e.pointerId);
    try { viewport.releasePointerCapture?.(e.pointerId); } catch { /* never captured */ }
    if (points.size < 2) pinchSpan = 0;
    if (points.size === 0) dragging = false;
    // A finger lifting off a pinch should hand back to a pan, not freeze.
    if (points.size === 1 && zoom > 1.01) {
      const [q] = [...points.values()];
      dragging = true;
      lx = q.x;
      ly = q.y;
    }
  };
  viewport.addEventListener('pointerup', endPointer);
  viewport.addEventListener('pointercancel', endPointer);

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
     book is pages 7-8, but slot 3 of a single book is page 4. Convert through
     the page number so the reader stays where they were reading.

     Going to spread mode, take the page the reader was on and find the slot it
     sits in — floor((p-1)/2), the inverse of the (2n+1, 2n+2) pairing. */
  function setMode(toSingle) {
    if (!project || toSingle === single) return;
    const page = (single ? rectoOf(spread) : versoOf(spread)) || 1;
    single = toSingle;
    leaves = lastSlot();
    spread = single
      ? Math.max(0, page - 1)
      : Math.max(0, Math.floor((page - 1) / 2));
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
    // And when the ring is rotated off zero, neither of the above resolves at
    // all — fall back to the card that is geometrically at the front.
    if (!t) {
      const wheel = e.target.closest?.('.wheel');
      if (wheel) t = frontCard(wheel, '[data-book]');
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
