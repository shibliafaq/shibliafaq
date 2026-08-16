import { ScrollTrigger, reducedMotion, lenis } from './scroll.js';

/**
 * EXPERIENCE & EDUCATION — the pixel-art overworld, wired into the page.
 *
 * `src/modules/pixel/` composes and animates the map; this module is only the
 * seam between it and the site: when to load it, when it is allowed to replace
 * the timeline, how scroll reaches it, and where the card copy comes from.
 *
 * ── THE FALLBACK IS THE CONTENT ───────────────────────────────────────────
 * `<ol class="timeline" id="experienceList">` in index.html is the section. It
 * is what ships in the HTML, what search engines read, and what a reader gets
 * with no JS, under prefers-reduced-motion, or on a narrow viewport. The map
 * replaces it only once every sheet has actually loaded and the world has been
 * composed — if anything fails, the list stays and the section is unharmed.
 * Same contract as the skills field (HANDOFF §8), for the same reason.
 *
 * ── ONE COPY OF THE COPY ──────────────────────────────────────────────────
 * Arrival cards are built from the matching `li[data-stop]`, never from the
 * strings in pixel/journey.js. That keeps the card and the fallback list from
 * drifting, keeps the words crawlable, and makes translation free: the i18n
 * engine already rewrites those elements, so the card just re-reads them on
 * `sa:languagechange` (the walk-spec's own recommendation).
 */

/**
 * The map now runs at every width. This was 900, on the reasoning that a world
 * "34 tiles wide" could not be read on a phone — but that number described the
 * FIRST map, and the valley is 44 tiles wide and 164 tall. The premise was
 * wrong in both directions: the camera follows the character and has always
 * been free to crop, so seeing the whole width was never the requirement. At
 * ZOOM 2 a 390px phone shows ~12 tiles across and a building is 5-7 of them,
 * which frames a milestone better than the desktop view does.
 *
 * Kept as a floor rather than deleted because below ~320px there is no layout
 * at all, and the timeline remains the honest fallback there — as it still is
 * under prefers-reduced-motion, with JS off, and if any sheet fails to load.
 */
const MIN_W = 320;

export function initExperience() {
  const stage = document.getElementById('journeyStage');
  const list = document.getElementById('experienceList');
  const rail = document.getElementById('journeyRail');
  if (!stage || !list) return;

  // Reduced motion: return before anything is built. Deliberately not a static
  // map image instead — a six-screen pinned walk swapped for a decorative
  // picture is worse than the list, which is the actual content.
  if (reducedMotion) return;

  let api = null, st = null, io = null, ro = null;
  let mounted = false, loading = false, enabled = false, lastTotal = 0;

  /* ---- the card ---------------------------------------------------------- */

  const pick = (li, sel, fallback) => li?.querySelector(sel)?.innerHTML ?? fallback;

  /** innerHTML, not textContent: the source is our own markup and our own
      dictionary, and the thesis titles carry `<em class="serif">`. */
  function renderCard(stop) {
    const li = list.querySelector(`[data-stop="${stop.id}"]`);
    const el = document.createElement('article');
    el.className = 'journeycard';
    el.innerHTML =
      `<p class="journeycard__period">${pick(li, '.tli__period', stop.period)}</p>`
      + `<h3 class="journeycard__role">${pick(li, '.tli__role', stop.role)}</h3>`
      + `<p class="journeycard__org">${pick(li, '.tli__org', stop.org)}</p>`
      + `<p class="journeycard__note">${pick(li, '.tli__note', stop.note)}</p>`;
    return el;
  }

  /**
   * The speech bubble — separate from the card, and beside him.
   *
   * The card is the record and sits where a caption sits. This is one line he
   * says on arriving, and it belongs at his shoulder, the way a comic does it.
   * Both appear together; neither replaces the other.
   *
   * The line comes from a hidden `.tli__says` in the same `li`, exactly as
   * `.tli__note` already works — one copy of every string in the DOM, translated
   * for free. A `bg.says.*` key with no dictionary entry leaves the English in
   * place, so the other six languages can follow later without holding this up.
   * A stop with no line gets no bubble rather than an empty one.
   */
  function renderBubble(stop) {
    const line = list.querySelector(`[data-stop="${stop.id}"] .tli__says`)?.innerHTML;
    if (!line) return null;
    const el = document.createElement('p');
    el.className = 'saybubble';
    el.innerHTML = line;
    return el;
  }

  /* ---- the chapter rail -------------------------------------------------- */

  /** Four ticks, one per region, marking where you are and jumping to a
      chapter. A six-screen pin with no way to skip is a trap. */
  function buildRail(REGIONS, STOPS) {
    if (!rail) return;
    rail.textContent = '';
    for (const g of REGIONS) {
      const stop = STOPS.find((s) => s.anchor[1] >= g.rows[0] && s.anchor[1] < g.rows[1]);
      if (!stop) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'journey__tick';
      b.dataset.region = g.id;
      // Place names and dates — proper nouns, untranslated per HANDOFF §7.
      b.innerHTML = `<b>${g.label}</b><i>${g.years}</i>`;
      b.addEventListener('click', () => {
        if (!api || !st) return;
        // Through Lenis, never window.scrollTo — that desyncs it (§10).
        const y = st.start + api.scrollAtStop(stop);
        if (lenis) lenis.scrollTo(y, { duration: 1.2 });
        else window.scrollTo({ top: y });
      });
      rail.appendChild(b);
    }
  }

  const markRegion = (g) => {
    rail?.querySelectorAll('.journey__tick').forEach((t) => {
      t.classList.toggle('is-here', t.dataset.region === g.id);
    });
  };

  /* ---- mount ------------------------------------------------------------- */

  async function mount() {
    if (mounted || loading) return;
    loading = true;

    try {
      // Lazy: ~220 KB of lossless sheets plus the composer, none of which the
      // page needs to paint. Same treatment as three.js and the atlas chunk.
      // The VALLEY, not the first map. `journey.js` still describes the original
      // and is left alone; `valleyjourney.js` supplies the same four things —
      // STOPS, PATH_LENGTH, pointAt, regionAt — read out of the hand-authored
      // document rather than out of source. `load()` must resolve before
      // initWalk, because until the map file is parsed there is no route to
      // measure and no stop to place a card at.
      const [{ initWalk }, journey] = await Promise.all([
        import('./pixel/walk.js'),
        import('./pixel/valleyjourney.js'),
      ]);
      await journey.load();

      // Swap in one step. The stage must be laid out before initWalk measures
      // it, and showing the list and then visibly replacing it is exactly what
      // §8 avoided for the skills field. Running on idle means this happens
      // several screens above the reader, so the change is never seen.
      stage.hidden = false;
      list.classList.add('visually-hidden');

      api = await initWalk(stage, {
        external: true,
        renderCard,
        renderBubble,
        onRegion: markRegion,
        // The hint has done its job the moment the first card arrives.
        onStop: (stop) => { if (stop) stage.classList.add('is-walking'); },
        world: journey,
        /**
         * Leaving free roam. The walk does not move the page itself — the
         * scroller belongs to ScrollTrigger and Lenis, and jumping the walk's
         * own distance without moving the scrollbar desyncs the two. So it says
         * which stop to resume from and that happens here, through Lenis, never
         * window.scrollTo (§10).
         */
        onResume: (stop) => {
          if (!st || !api) return;
          const y = st.start + api.scrollAtStop(stop || api.stops[0]);
          if (lenis) lenis.scrollTo(y, { duration: 0.9 });
          else window.scrollTo({ top: y });
        },
        onMode: (m) => stage.classList.toggle('is-roaming', m === 'free'),
      });

      st = ScrollTrigger.create({
        trigger: stage,
        start: 'top top',
        end: () => `+=${api.total}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // The ramp table is measured in stage pixels, so it has to be rebuilt
        // before ScrollTrigger asks for `end`. onRefreshInit runs first.
        onRefreshInit: () => api.refresh(),
        onUpdate: (self) => api.setScroll(self.progress * api.total),
      });

      buildRail(journey.REGIONS, journey.STOPS);

      // Render while the stage is anywhere near the viewport — not on the pin's
      // own isActive, which is still false while the stage is rising into view
      // from below, and that is precisely when a blank canvas would show.
      io = new IntersectionObserver(
        (entries) => api.setActive(entries[0].isIntersecting),
        { rootMargin: '400px' },
      );
      io.observe(stage);

      // The canvas backing store and the ramp table are both measured in stage
      // pixels, so they must follow the stage's real box — and that box changes
      // for reasons ScrollTrigger's own refresh does not reliably cover in the
      // right order (GSAP writes an explicit width/height onto a pinned element,
      // so a refresh callback can measure the pinned box rather than the natural
      // one). A ResizeObserver sees the box that actually exists, whatever moved
      // it. This was a real bug: the canvas stayed at its first-paint size and
      // the whole map drew stretched.
      ro = new ResizeObserver(() => {
        if (!enabled || !api) return;
        const t = api.refresh();
        // Only refresh when the pin length actually changed — the pin itself
        // resizes the stage, so refreshing unconditionally would loop.
        if (Math.abs(t - lastTotal) > 1) { lastTotal = t; ScrollTrigger.refresh(); }
      });
      ro.observe(stage);

      mounted = true;
      enabled = true;
      loading = false;
      lastTotal = api.total;
      ScrollTrigger.refresh();

      // Dev-only handle. Stripped from the production bundle by Vite's constant
      // folding, and the one thing that makes the scroll->distance mapping
      // inspectable from the console — the lab pages get this for free via
      // window.__walk and this section is much harder to debug without it.
      if (import.meta.env.DEV) window.__journey = { api, st, get lenis() { return lenis; } };
    } catch (err) {
      // One missing sheet makes loadAll() reject and takes the whole map down
      // (HANDOFF §9.10). The list is the content — put it back.
      console.warn('[experience] map unavailable, keeping the timeline', err);
      stage.hidden = true;
      list.classList.remove('visually-hidden');
      loading = false;
    }
  }

  /* ---- narrow / wide ----------------------------------------------------- */

  function setEnabled(on) {
    if (!mounted || on === enabled) return;
    enabled = on;
    if (on) {
      stage.hidden = false;
      list.classList.add('visually-hidden');
      st.enable();
      api.setActive(true);
      lastTotal = api.refresh();
    } else {
      st.disable(true); // revert the pin, or the section keeps its spacer
      api.setActive(false);
      stage.hidden = true;
      list.classList.remove('visually-hidden');
    }
    ScrollTrigger.refresh();
  }

  const wide = () => window.innerWidth >= MIN_W;

  /** Only the mount/unmount decision lives here. Geometry is the
      ResizeObserver's job, so crossing MIN_W is all this has to notice. */
  function apply() {
    if (!wide()) { setEnabled(false); return; }
    if (mounted) setEnabled(true); else mount();
  }

  // Nothing is downloaded at phone width at all — the check comes before the
  // dynamic import, not after it.
  //
  // Mounted eagerly, NOT when the section comes near. Deferring it was tried,
  // to give a loading animation something to cover, and the cost was that the
  // timeline list stayed on screen until the reader arrived — so the section
  // visibly changed identity under them. Loading several screens early means
  // the map is simply already there.
  apply();

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(apply, 200);
  });

  // The engine has already rewritten the list by the time it fires this, so the
  // card just re-reads its own source element.
  window.addEventListener('sa:languagechange', () => api?.refreshCard());
}
