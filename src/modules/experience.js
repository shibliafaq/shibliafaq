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
  /* EARNED PER PAGE VIEW, NOT REMEMBERED ACROSS RELOADS.

     This used to read `journeyPlayed` out of sessionStorage and put
     `has-played` on the stage at init, so that a reader who reloaded
     mid-session did not have to earn the way out twice. On a desktop that
     is a kindness. On a phone it was the bug: a reload is not a rare event
     there — the URL bar, switching apps and the back gesture all cause one
     — so the button was already sitting on the stage the first time the
     walk was reached in what, to the reader, was a fresh visit. Measured at
     scrollY=0 straight after a reload: class `journey has-played`, skip
     visible, opacity 1, before a single step had been walked.

     So the crossing has to be made in THIS page view. Nothing is persisted
     and nothing is restored; `skipped` starts false every time the module
     mounts and is set only by actually reaching the end below. The offer is
     then made on a later pass, exactly as before.

     The sessionStorage write went with the read. Keeping a key nothing
     consumes is how a stale flag survives long enough to be trusted by
     something later. */
  let skipped = false;

  /* THE SKIP HAS TO GO THE WAY THE READER IS ALREADY GOING.

     Getting past this section means leaving it by the near edge, and which edge
     that is depends on travel: coming down, the way out is #contact below;
     coming back up -- which is the case that prompted this -- it is #skills
     above. A skip that always jumped to #contact would send someone scrolling
     up back DOWN through the walk they were trying to escape, which is the
     opposite of the favour. */
  const skipBtn = stage?.querySelector('.journey__skip');
  const skipArrow = skipBtn?.querySelector('.journey__skip-arrow');
  let skipDir = 0;
  function aimSkip(dir) {
    if (!skipBtn || dir === skipDir) return;
    skipDir = dir;
    const up = dir < 0;
    skipBtn.setAttribute('href', up ? '#skills' : '#contact');
    if (skipArrow) skipArrow.textContent = up ? '↑' : '↓';
  }
  const list = document.getElementById('experienceList');
  const rail = document.getElementById('journeyRail');
  if (!stage || !list) return;

  /* Reduced motion used to return here, and the section stayed a list.
     The reasoning was that a six-screen pinned walk swapped for a decorative
     picture is worse than the list — which is true of a PICTURE, and this is
     not one. The map is live: the chapter rail jumps between milestones, the
     cards carry the CV, and on touch the stick still walks him around. What
     the preference is protecting against is motion the reader did not ask for,
     and under it the walk no longer moves on its own — `walk.js` skips the
     idle gait and the camera easing, and he only moves when someone moves him.

     The timeline remains the fallback for JS off, a failed sheet, and widths
     under 320. It is still the content; it is no longer the only option for
     someone who has asked their phone to calm down. */

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
        onUpdate: (self) => {
          api.setScroll(self.progress * api.total);
          aimSkip(self.direction);
          /* THE WAY OUT APPEARS ONLY TO SOMEONE WHO HAS ALREADY WALKED IT.

             The walk is scrubbed by scroll position, so scrolling back up plays
             it again from the end. That is the right behaviour -- it is a
             position, not a one-shot animation -- but it means a reader who has
             seen the whole thing and comes back has to sit through it a second
             time to get past.

             So a skip appears once, and only once, they have actually reached
             the end. Offering it before then would be offering to skip
             something they have not been shown yet. Not remembered past
             this page view -- see the note where `skipped` is declared. */
          /* Reaching the end RECORDS the crossing but does not offer the
             skip. Showing it here would put the button on screen during the
             very first descent, in the last moments of the walk the reader is
             still watching — offering to skip something they are in the middle
             of enjoying. */
          if (!skipped && self.progress > 0.98) skipped = true;
        },
        /* The offer is made on a LATER pass, which is the only time it is worth
           anything: they have seen the walk, they are meeting it again, and the
           replay is now a toll rather than a delight. Both directions count —
           coming back up after crossing it, or arriving a second time from
           above. */
        onEnter: () => { if (skipped) stage.classList.add('has-played'); },
        onEnterBack: () => { if (skipped) stage.classList.add('has-played'); },
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

      /* THE ARRIVAL IS A TRANSITION, NOT A STATE.

         The 400px observer above exists so the canvas is already drawing before
         the stage rises into view — it must not double as the reveal, or the
         map would fade in while still 400px below the fold and be finished
         before anyone saw it. This one has no margin: it fires when the stage
         is genuinely on screen.

         Opacity only. The stage is the pinned element, and a transform or a
         filter on it would re-base the pin; opacity creates a stacking context
         but not a containing block, so it is the one property that is safe to
         animate here. */
      const revealIO = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        requestAnimationFrame(() => stage.classList.add('is-ready'));
        revealIO.disconnect();
      }, { rootMargin: '0px 0px -8% 0px' });
      revealIO.observe(stage);

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
  /* Returns mount()'s promise, which matters for the Load button: without it
     `Promise.resolve(apply())` settles on the same tick and the prompt is
     dismissed before a single sheet has decoded, leaving a gap where the map
     is about to be. Measured: the is-loading state was already gone 200ms
     after the click. */
  function apply() {
    if (!wide()) { setEnabled(false); return undefined; }
    if (mounted) { setEnabled(true); return undefined; }
    return mount();
  }

  /* MOUNTED EAGERLY, several screens before the reader arrives.

     A Click-to-load button was tried here and removed: it made the reader ask
     for the section instead of finding it, and the map is the section. The
     original reasoning stands — deferring leaves the timeline list on screen
     until the reader arrives, so the section visibly changes identity under
     them; loading early means the map is simply already there.

     It does not appear abruptly, though. `is-ready` fades it in when the stage
     actually reaches the viewport, so the arrival is a transition rather than a
     thing that was always there. Nothing is downloaded at phone width at all:
     the width check comes before the dynamic import, not after it. */
  apply();

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    // Once mounted, resizing is a geometry question and apply() handles it.
    // Before that it is an OFFER question — crossing back above 320px should
    // put the button back, not silently start a download.
    rt = setTimeout(apply, 200);
  });

  // The engine has already rewritten the list by the time it fires this, so the
  // card just re-reads its own source element.
  window.addEventListener('sa:languagechange', () => api?.refreshCard());
}
