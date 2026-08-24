import { projects, archPages } from '../data/projects.js';
import { DIAGRAMS } from './diagrams.js';
import { stopScroll, startScroll } from './scroll.js';
import { frontCard, cardAtPoint } from './wheel.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let lastFocus = null;

function lock() { document.body.classList.add('is-locked'); stopScroll(); }
function unlock() { document.body.classList.remove('is-locked'); startScroll(); }

/* ============================================================
   PROJECT MODAL
   ============================================================ */

function render(data) {
  /* The paper's own abstract, verbatim.

     `desc` is the pitch — what the work is and why it matters, written for the
     card. An abstract is the author's own compression of the paper, and for the
     three research entries it is the thing a reader actually wants: it says what
     was done and what was found in the terms the paper itself uses. Kept
     separate rather than folded into `desc` so it can be quoted exactly and,
     where the paper is published, matched word for word against the record of
     version. */
  /* THE THREE FINDINGS, THEN THE ABSTRACT UNDERNEATH.

     An abstract is the right thing to carry and the wrong thing to lead with:
     2,250 characters of unbroken prose is where a card loses the reader it
     just earned. The paper names its own three findings, so they come out as
     cards and the abstract goes behind a disclosure — nothing is removed, the
     order is just reversed to put the conclusions before the compression. */
  const findings = data.findings?.length
    ? `<ol class="mfind3">${data.findings.map((f, i) => `
        <li class="mfind3__c">
          <span class="mfind3__n">0${i + 1}</span>
          <span class="mfind3__v">${esc(f.v)}</span>
          <span class="mfind3__k">${esc(f.k)}</span>
          <p class="mfind3__t">${f.t}</p>
        </li>`).join('')}</ol>`
    : '';

  const abstract = data.abstract
    ? `${findings}<details class="mabs__wrap">
         <summary><span>Read the full abstract</span></summary>
         <p class="mabs">${data.abstract}</p>
       </details>`
    : findings;

  const metrics = data.metrics?.length
    ? `<div class="mmetrics">${data.metrics
        .map((m) => `<div><div class="mmv">${m.v}</div><div class="mml">${esc(m.l)}</div></div>`)
        .join('')}</div>`
    : '';

  /* A METHOD IS A SEQUENCE, so it is drawn as one where the data says so.

     `method` is a single string and renders as a paragraph, which is right
     for a short description. An arrow-separated chain of nine stages is not a
     paragraph — it is a diagram someone typed into one — and it hides exactly
     what a reader wants: where a stage ends, which stages belong together,
     and which of them are checks rather than more processing.

     `methodFlow` carries the phases and their steps, and gets numbered from
     its own index so inserting a stage cannot leave the numbering stale. */
  let stepNo = 0;
  const methodFlow = data.methodFlow?.length
    ? `<figure class="mflow">${data.methodFlow.map((g, gi) => `
        ${gi ? '<div class="mflow__join" aria-hidden="true">→</div>' : ''}
        <section class="mflow__p">
          <h4 class="mflow__ph">${esc(g.phase)}</h4>
          <ol class="mflow__steps">${g.steps.map((st, si) => `
            ${si ? '<li class="mflow__arrow" aria-hidden="true">→</li>' : ''}
            <li class="mflow__s">
              <span class="mflow__n">${String(++stepNo).padStart(2, '0')}</span>
              <span class="mflow__t">${esc(st.t)}</span>
              ${st.s ? `<span class="mflow__d">${esc(st.s)}</span>` : ''}
            </li>`).join('')}</ol>
        </section>`).join('')}
       </figure>`
    : '';

  const method = data.method || data.methodFlow
    ? `<div class="msec">Method</div>${data.method
        ? `<p class="mmethod">${esc(data.method)}</p>` : ''}${methodFlow}`
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
  /* TWO MATRICES, OR THE OLD PAIR OF BIG NUMBERS.

     `worked` used to be a lead, two headline figures and a footnote, which is
     the right shape for a single worked example. The thesis card now carries
     the real result — the same example repeated in every city, which is two
     tables — so this renders either: `cooling`/`reach` if they are present,
     and the original `rows` if they are not. The other projects still use the
     simple shape and are untouched.

     Both tables are wrapped in their own scroller. A five-city matrix cannot
     be made narrow enough for a phone without either shrinking the type past
     reading or dropping columns, and dropping columns from a table whose
     entire point is the comparison across cities would be the worst of the
     three. It scrolls sideways inside its own box, so the page never does. */
  const heat = (v) => {
    // 0 is a real measured result here, not a gap, so it is never dimmed away.
    const a = Math.abs(v);
    return a >= 8 ? 3 : a >= 3 ? 2 : a > 0 ? 1 : 0;
  };

  /* A HEAT GRID, NOT A TABLE OF NUMBERS.

     Still a <table> underneath — it is tabular data, it has two headed axes,
     and a screen reader should get the rows and columns rather than a list of
     coloured divs. What changes is that each cell CARRIES its value as colour
     as well as printing it, so the pattern the two tables exist to show — the
     reflectivity levers behaving alike everywhere, the vegetation levers
     varying wildly by city — is visible before a single number is read.

     Intensity is |value| against the strongest cell in the whole grid, so the
     comparison is across the figure rather than within a row. Makkah's zero
     gets its own treatment: a hatch rather than an absent colour, because a
     blank cell reads as missing data and this zero is a measured result. */
  const coolTable = data.worked?.cooling
    ? `<figure class="mgrid">
         <div class="mtable__scroll"><table class="mgrid__t">
           <thead><tr><th scope="col"><span class="vh">Measure</span></th>${data.worked.cooling.cities
             .map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
           <tbody>${(() => {
             const peak = Math.max(...data.worked.cooling.rows.flatMap((r) => r.v.map(Math.abs)));
             return data.worked.cooling.rows.map((r) => `<tr>
               <th scope="row">${esc(r.m)}</th>${r.v.map((v) => {
                 const k = peak ? Math.abs(v) / peak : 0;
                 return `<td class="mgrid__c${v === 0 ? ' is-zero' : ''}" style="--k:${k.toFixed(3)}">
                   <span>${v === 0 ? '0' : v.toFixed(2)}</span></td>`;
               }).join('')}
             </tr>`).join('');
           })()}</tbody>
         </table></div>
         <div class="mgrid__key" aria-hidden="true">
           <span>0 °C</span><i class="mgrid__ramp"></i>
           <span>−${Math.max(...data.worked.cooling.rows.flatMap((r) => r.v.map(Math.abs))).toFixed(1)} °C</span>
           <i class="mgrid__zero"></i><span>measured zero</span>
         </div>
         <figcaption>${esc(data.worked.cooling.cap)}${data.worked.cooling.note
           ? ` <span class="mtable__note">${data.worked.cooling.note}</span>` : ''}</figcaption>
       </figure>`
    : '';

  const num = (n) => n.toLocaleString('en-US');

  /* A GROUPED BAR CHART, because the finding IS a shape.

     "A water feature reaches 16,167 and a cool pavement reaches 602" is a
     sentence you have to do arithmetic on. Two bars of visibly different
     length is the same fact arriving before you have finished reading it, and
     the whole argument of the simulator is that one of these is 27 times the
     other. A table could not make that land; a chart cannot avoid it.

     Square-root scale, as before — 16,167 against 2 is 8,000:1, and on a
     linear axis four of the five cities would be invisible. Marked as such in
     the key, because a chart with a non-linear axis that does not say so is
     lying about proportion. The exact figure is printed on every bar, so the
     bar carries the comparison and the number carries the value. */
  const SERIES = [
    { k: 'w', label: 'Water feature' },
    { k: 'g', label: 'Urban greening' },
    { k: 'l', label: 'Any local measure' },
  ];
  const reachTable = data.worked?.reach
    ? `<figure class="mchart">
         <div class="mchart__key" aria-hidden="true">${SERIES
           .map((sr) => `<span class="mchart__ks mchart__ks--${sr.k}">${sr.label}</span>`).join('')}
           <span class="mchart__note">√ scale</span></div>
         <div class="mchart__plot">${(() => {
           const peak = Math.sqrt(Math.max(...data.worked.reach.rows
             .flatMap((r) => [r.w[1], r.g[1], r.l[1]])));
           return data.worked.reach.rows.map((r) => `
             <div class="mchart__g">
               <div class="mchart__city">${esc(r.c)}</div>
               <div class="mchart__bars">${SERIES.map((sr) => {
                 const [cells, people] = r[sr.k];
                 const w = peak ? (Math.sqrt(people) / peak * 100) : 0;
                 return `<div class="mchart__b mchart__b--${sr.k}"
                      style="--w:${w.toFixed(1)}%"
                      title="${esc(sr.label)}: ${num(people)} residents across ${cells} cell${cells === 1 ? '' : 's'}">
                   <span class="mchart__v">${num(people)}</span>
                   <span class="mchart__c">${cells}&nbsp;cell${cells === 1 ? '' : 's'}</span>
                 </div>`;
               }).join('')}</div>
             </div>`).join('');
         })()}</div>
         <figcaption>${esc(data.worked.reach.cap)}${data.worked.reach.note
           ? ` <span class="mtable__note">${data.worked.reach.note}</span>` : ''}</figcaption>
       </figure>`
    : '';

  const workedRows = data.worked?.rows
    ? `<div class="mwork__rows">${data.worked.rows
        .map((r) => `<div class="mwork__row">
           <span class="mwork__v">${r.v}</span>
           <span class="mwork__l">${esc(r.l)}</span>
         </div>`).join('')}</div>`
    : '';

  const worked = data.worked
    ? `<div class="msec">${esc(data.worked.sec)}</div>
       <div class="mwork">
         <p class="mwork__lead">${data.worked.lead}</p>
         ${workedRows}${coolTable}${reachTable}
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

  /* THE PUBLICATION RECORD, RELOCATED FROM THE RETIRED "RESEARCH OUTPUT"
     SECTION.

     A paper introduces itself in a fixed order — who wrote it, where it
     appeared, whether it is real yet — and that order is why this sits directly
     under the title instead of being folded into the prose below it. Authors,
     supervisors and target journals were stated on the front page and nowhere
     else; once the section is gone they have to live on the entry itself or the
     only claim to peer review goes with it.

     `state` drives the badge, and only 'published' gets the solid amber fill.
     That rule is carried over from the retired section rather than reinvented:
     published outranks the other statuses, so it is the one that should read at
     a glance without being read. */
  const pub = data.pub
    ? `<div class="mpub">
         <p class="mpub__authors">${esc(data.pub.authors)}</p>
         ${data.pub.venue ? `<p class="mpub__venue">${esc(data.pub.venue)}</p>` : ''}
         <p class="mpub__row">
           <span class="mpub__status mpub__status--${data.pub.state === 'published' ? 'published' : 'prep'}">${data.pub.state === 'published' ? '✅' : '✍️'} ${esc(data.pub.status)}</span>
           ${data.pub.doi
             ? `<a class="mpub__doi" href="${esc(data.pub.doi)}" target="_blank" rel="noopener">${esc(data.pub.doi.replace('https://', ''))} ↗</a>`
             : ''}
         </p>
       </div>`
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
       ${data.twin.note ? `<p class="mtwin__note">${data.twin.note}</p>` : ''}`
    : '';

  return `
    <p class="mcat">${esc(data.cat)}</p>
    <h2 class="mtitle" id="modalTitle">${esc(data.title)}</h2>
    ${pub}
    ${finding}
    <p class="mdesc">${data.desc}</p>
    ${abstract}${metrics}${embed}${twin}${diagram}${method}${worked}${gallery}${galleries}${videos}${extra}${tags}${links}
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
    /* THE MOMENT THE HEAVY THING ACTUALLY ARRIVES.

       Announced here rather than when the modal opens, because the iframe is
       loaded on demand — a reader can open the card, read the abstract and
       close it again without the dashboard ever existing. Freeing the globe
       then would cost a re-upload for nothing.

       An event rather than a direct call: this module knows nothing about
       the globe and should not start now. main.js owns that handle and does
       the listening, the same way sa:languagechange is wired. */
    window.dispatchEvent(new CustomEvent('sa:twinload'));
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
      /* The counterpart to sa:twinload. Fires even if the frame was never
         armed, which is why the listener has to be idempotent. */
      window.dispatchEvent(new CustomEvent('sa:twinfree'));
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
    /* INSIDE A WHEEL, THE FRONT CARD IS THE ONLY ANSWER.

       This used to try the event target first, then elementFromPoint, and
       only fall back to the front card. That ordering is what let two
       projects open at once again: a click on the thesis tile resolves
       [data-modal] straight from the event target, while over in book.js
       the same click finds no [data-book] on the target and drops to
       elementFromPoint — which inside `preserve-3d` does not return what
       is visually in front (CLAUDE.md records this) and happily landed on
       the Miscellaneous tile behind. Modal opened the thesis, book opened
       misc, from one click.

       CONTEXT 31 fixed this for the LAST fallback and left the first two
       branches able to disagree. Resolving through frontCard() whenever
       the click is inside a wheel means both handlers ask the same
       question and exactly one of them can answer yes. Outside a wheel
       there is no depth to get wrong, so the ordinary lookups stand. */
    const inWheel = e.target.closest?.('.wheel');
    let el = null;
    if (inWheel) {
      /* THE CARD AIMED AT, falling back to the front one.

         This resolved through frontCard() alone, so every click inside a
         wheel opened whichever card happened to be frontmost no matter
         where the reader had clicked. cardAtPoint() answers the question
         that was actually asked, by the same geometry and without
         elementFromPoint, which cannot be trusted in a preserve-3d scene.

         frontCard() still covers the case with no coordinates at all --
         a keyboard Enter, or a synthetic click -- so the wheel stays
         operable without a pointer.

         Both this file and its twin resolve through the SAME call, which
         is what keeps them from disagreeing and opening two different
         projects from one click. */
      const aimed = e.clientX != null
        ? cardAtPoint(inWheel, '.wheel__card', e.clientX, e.clientY)
        : null;
      const front = aimed || frontCard(inWheel, '.wheel__card');
      el = front && front.hasAttribute('data-modal') ? front : null;
      if (!el) return;
    }
    if (!inWheel) el = e.target.closest?.('[data-modal]');
    if (!inWheel && !el && e.clientX != null) {
      el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-modal]');
    }
    /* The old event-target and elementFromPoint fallbacks for the wheel
       lived here. They are gone: inside a wheel the front card is now
       resolved up front and nothing else may answer, which is what stops
       this handler and the other one disagreeing. */
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
