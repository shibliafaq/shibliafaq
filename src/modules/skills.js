import { reducedMotion } from './scroll.js';

/**
 * SKILLS FIELD
 *
 * The skill groups as balls drifting in zero gravity inside a brain-shaped
 * boundary, colour-coded along a thermal scale — ember for the work closest to
 * the heat research, cyan for the work furthest from it. The legend under the
 * field is the same hot-to-cold key that sits beside an LST raster.
 *
 * The balls are built by reading the real markup in #skillList, which stays in
 * the DOM. That keeps the full skill names crawlable (admissions committees
 * find this page by search) and means the section degrades to the original tag
 * list whenever the field cannot run — no JS, reduced motion, or a viewport too
 * narrow to fit thirty-odd labelled balls inside a brain.
 *
 * Physics is impulse-based circle collision plus a containment pass against the
 * boundary polygon, rather than a physics library: with ~34 bodies the naive
 * O(n²) pass is under 600 checks a frame, and a dependency for that would be
 * the wrong trade on a site whose whole point is a light payload.
 */

/* Hot to cold, in the group order the markup uses.
   `fill` is a dark tint of `c` so white labels stay readable on an opaque ball
   while the bright rim still carries the hue.
   `scale` is the requested size order: Architecture > Research > Spatial > Data. */
const GROUPS = [
  { c: '#ff5a2b', fill: '#551a08', scale: 0.94 }, // Spatial & GIS
  { c: '#f5a20b', fill: '#4a3004', scale: 0.99 }, // Data Pipelines & Analytics (0.86 +15%)
  { c: '#e4ded3', fill: '#474139', scale: 1.22 }, // Architecture & Design
  { c: '#22d3ee', fill: '#0a3d4b', scale: 1.06 }, // Research Methods
  // Green sits deliberately off the thermal ramp. This group is not research
  // work at all, so reading as the outlier is the point rather than a lapse.
  // Matched to Architecture's scale: the creative skills moved here from that
  // group and were asked to stay that size.
  { c: '#4ade80', fill: '#0f3a21', scale: 1.22 }, // Creative & Personal (no legend entry)
];

const KEY_ROW = 3;    // legend keys on the first row; the rest wrap below
/* Only a floor for "there is no layout at all". The brain used to be hidden
   below 640 because labelled balls cannot fit inside a phone-sized brain —
   true, and now handled by dropping the labels rather than the whole section
   (see fitDensity). The tag list remains the fallback under reduced motion. */
const MIN_W   = 320;
const BASE_FS = 10;
const MIN_R   = 20;
const MAX_R   = 40;
const PAD     = 8;
const DENSITY = 0.34; // share of the brain's area the balls may occupy
const MIN_FS  = 7.5;  // never shrink type past this to hit DENSITY
/* How far the balls may exceed the DENSITY budget before the labels are given
   up and the tooltip carries the names instead.

   Not a taste value — it is a packing limit. DENSITY 0.34 is a conservative
   look, so `ratio` here is really "how much denser than comfortable". Measured
   after the per-ball shrink lands: desktop 1.00 (34% of the brain covered),
   a 375px phone 1.87 (64%). 64% is random CLOSE packing for discs, i.e. the
   tightest a jumble of circles reaches without being deliberately arranged —
   achievable, with essentially no free space. 1.95 admits the phone and still
   refuses anything that genuinely cannot be packed. */
const OVERFLOW_OK = 1.95;

/** The site accent, as "r, g, b", read from the stylesheet so the canvas and
    the CSS can never disagree. */
const ACCENT_RGB = (getComputedStyle(document.documentElement)
  .getPropertyValue('--accent-rgb') || '245, 158, 11').trim();

const STEP   = 1 / 60; // fixed timestep; variable dt makes collisions jitter
const DAMP   = 0.995;  // near-frictionless — they should keep drifting
const WALL   = 0.86;   // boundary restitution
const REST   = 0.94;   // ball-to-ball restitution
const MAXV   = 16;
const PUSH_R = 130;    // cursor repulsion reach beyond a ball's own radius
const PUSH_F = 1.5;
const KICK   = 26;     // click impulse
const SCROLL_F = 0.06; // scroll inertia — see step()
const SCROLL_MAX = 70; // px of scroll per frame past which the nudge is capped

/* ------------------------------------------------------------------
   BRAIN OUTLINE — left-facing lateral view, frontal pole at x≈0 and
   occipital at x≈1000, with the cerebellum and brainstem below.

   Not hand-placed: this is the outer silhouette of assets/Brain_Reference.png,
   extracted by tools/trace-brain.mjs — mask the opaque pixels, keep the largest
   connected component, walk its boundary with a Moore-neighbour trace (4521
   points), then Ramer–Douglas–Peucker down to 151 at ~1px of error. Only the
   silhouette is taken; none of the source's palette, internal linework or
   labels, and the image itself is never deployed. To regenerate:

     node tools/trace-brain.mjs assets/Brain_Reference.png 150 brain-path.js

   The points are dense enough (~5 units apart) to draw smoothly as straight
   segments, so the same list is the drawn outline AND the collision polygon —
   they cannot disagree.
   ------------------------------------------------------------------ */
const BRAIN = [
  [465, 0], [490, 0], [519, 7], [524, 7], [545, 0], [595, 2],
  [608, 8], [629, 7], [649, 12], [703, 31], [715, 38], [718, 48],
  [737, 47], [755, 51], [769, 60], [786, 81], [810, 85], [825, 95],
  [843, 114], [878, 146], [888, 159], [894, 178], [907, 188], [918, 201],
  [927, 230], [942, 250], [952, 273], [962, 287], [966, 303], [980, 319],
  [989, 340], [997, 381], [995, 415], [1000, 437], [999, 469], [992, 497],
  [982, 520], [969, 538], [949, 555], [936, 561], [924, 565], [910, 564],
  [900, 559], [888, 561], [867, 556], [883, 580], [884, 588], [882, 595],
  [888, 605], [886, 617], [888, 622], [888, 629], [885, 636], [885, 644],
  [881, 650], [881, 662], [878, 666], [876, 678], [867, 687], [861, 699],
  [853, 706], [841, 713], [807, 723], [783, 723], [772, 728], [750, 726],
  [743, 731], [738, 733], [732, 740], [725, 742], [705, 760], [681, 763],
  [703, 822], [706, 842], [701, 851], [695, 856], [689, 856], [684, 864],
  [678, 866], [670, 866], [666, 870], [658, 870], [651, 863], [624, 814],
  [597, 771], [567, 738], [541, 720], [518, 697], [504, 676], [494, 651],
  [477, 652], [454, 647], [435, 636], [422, 624], [391, 630], [352, 632],
  [331, 629], [305, 615], [276, 615], [257, 610], [241, 598], [231, 583],
  [216, 569], [210, 557], [208, 537], [215, 498], [205, 498], [187, 503],
  [176, 503], [151, 492], [121, 484], [105, 481], [87, 482], [78, 480],
  [67, 474], [50, 461], [31, 442], [19, 426], [11, 402], [13, 380],
  [2, 353], [3, 325], [0, 312], [1, 290], [8, 275], [16, 261],
  [17, 231], [19, 215], [25, 203], [33, 195], [53, 183], [62, 174],
  [75, 155], [92, 137], [129, 108], [147, 100], [161, 98], [175, 84],
  [188, 75], [218, 61], [248, 51], [271, 50], [276, 43], [281, 41],
  [314, 32], [359, 24], [378, 24], [392, 26], [413, 12], [445, 3],
  [465, 1],
];
const BRAIN_W = 1000, BRAIN_H = 870;

/** Shoelace — used to size the balls against the room actually available. */
function polyArea(p) {
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j].x + p[i].x) * (p[j].y - p[i].y);
  return Math.abs(a / 2);
}

export function initSkills() {
  /* Reduced motion used to return here, which hid the brain entirely and left
     the tag list. That over-corrects: the preference asks for less MOTION, not
     less content, and the brain is the content — forty skills, grouped and
     colour-coded, that the flat list conveys far less well.

     So the field is still built and still drawn; what stops is the drifting.
     `startStill` below settles the layout without ever running the idle
     animation loop, and user-initiated motion — dragging a ball, tapping to
     scatter — stays available, because a gesture someone chose is not the kind
     of movement the setting is protecting them from. */

  const field  = document.getElementById('skillField');
  const canvas = document.getElementById('skillCanvas');
  const list   = document.getElementById('skillList');
  const key    = document.getElementById('skillKey');
  if (!field || !canvas || !list || !key) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* ---- read the markup ------------------------------------------- */

  const groups = [...list.querySelectorAll('.sgroup')];
  const seeds = [];
  groups.forEach((g, gi) => {
    if (gi >= GROUPS.length) return;
    g.querySelectorAll('[data-ball]').forEach((tag) => {
      seeds.push({ short: tag.dataset.ball, full: tag.textContent.trim(), g: gi });
    });
  });
  if (!seeds.length) return;

  /* ---- legend — group names are translated, so rebuild on switch --- */

  function buildKey() {
    const items = groups.slice(0, GROUPS.length).map((g, i) => {
      const name = g.querySelector('.sgroup__t')?.textContent.trim() ?? '';
      /* A real <button>, not a styled <li>. The keys open the written list
         below, which makes them a control — and a control has to be reachable
         by keyboard and announce its own state, which a list item cannot. */
      return `<li class="skillkey__i skillkey__i--btn">
        <button type="button" class="skillkey__btn" data-group="${i}"
                aria-expanded="false" aria-controls="skillList">
          <i class="skillkey__dot" style="--c:${GROUPS[i].c}"></i>${name}
        </button>
      </li>`;
    });
    // Forced break so the keys read 3 then 2, rather than wrapping wherever the
    // longest translation happens to push them — German and Arabic wrap at a
    // different point to English otherwise.
    if (items.length > KEY_ROW) items.splice(KEY_ROW, 0, '<li class="skillkey__break"></li>');
    key.innerHTML = items.join('');
  }

  /* ---- the legend opens the written list --------------------------

     The brain is a lovely object and a poor index: the balls carry short labels
     and drift, so "what exactly is under Research Methods" is a question it
     cannot answer. The full list already exists in the markup — it is the
     source the balls are built from and it is only `hidden` once the field
     mounts — so the legend reveals that rather than duplicating it anywhere.

     Clicking a key opens all five groups and highlights the one asked for.
     All five, not just that one, because the value of the list is comparison:
     it is the only place the collections can be read against each other. The
     same key closes it again, and Escape closes it from anywhere. */
  let openGroup = -1;

  function closeList() {
    openGroup = -1;
    list.hidden = true;
    list.classList.remove('is-open');
    groups.forEach((g) => g.classList.remove('is-active'));
    key.querySelectorAll('.skillkey__btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  function openList(i) {
    if (openGroup === i) { closeList(); return; }
    openGroup = i;
    list.hidden = false;
    list.classList.add('is-open');
    groups.forEach((g, gi) => g.classList.toggle('is-active', gi === i));
    key.querySelectorAll('.skillkey__btn').forEach((b) => {
      b.setAttribute('aria-expanded', String(Number(b.dataset.group) === i));
    });
    // Bring the opened group into view without yanking the page.
    groups[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* Delegated, because buildKey() replaces these buttons whenever the language
     changes — a listener bound to the elements would die on the first switch. */
  key.addEventListener('click', (e) => {
    const btn = e.target.closest('.skillkey__btn');
    if (!btn) return;
    openList(Number(btn.dataset.group));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openGroup >= 0) closeList();
  });

  const tip = document.createElement('div');
  tip.className = 'skillfield__tip';
  tip.setAttribute('role', 'status');
  field.appendChild(tip);

  /* ---- state ------------------------------------------------------ */

  let W = 0, H = 0, live = false;
  /** Set by fitDensity: false when the brain is too small to hold legible
      labels, which is every phone. Balls then carry colour and size only. */
  let showLabels = true;
  /** Last fitDensity result, for the DEV handle — so the labels/no-labels
      decision can be checked with a number instead of squinted at. */
  let lastFit = null;
  let poly = [];
  const balls = seeds.map((s) => ({
    ...s, x: 0, y: 0, vx: 0, vy: 0, r: 30, m: 900, lines: [s.short], fs: 10, lh: 12, hot: 0,
  }));

  const FONT = () => getComputedStyle(document.body).fontFamily;

  /** Wrap to at most two lines, splitting where the longer line is shortest. */
  function wrap(text) {
    const words = text.split(' ');
    if (words.length === 1) return [text];
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (!best || w < best.w) best = { w, lines: [a, b] };
    }
    return best.lines;
  }

  /** Radius that provably contains the text box (half its diagonal, plus
      padding), capped — long single words like "Cinematography" cannot wrap,
      so the font shrinks for those rather than the ball ballooning. */
  function measure(b, shrink = 1) {
    const sc = GROUPS[b.g].scale * shrink;
    const minR = MIN_R * sc, maxR = MAX_R * sc;
    // Never start below the legibility floor, and never fall through it.
    let size = Math.max(MIN_FS, BASE_FS * sc);
    let lines = [b.short], r = minR;

    for (let pass = 0; pass < 8; pass++) {
      ctx.font = `700 ${size}px ${FONT()}`;
      lines = wrap(b.short);
      const lh = size * 1.16;
      const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const th = lines.length * lh;
      r = Math.max(minR, Math.hypot(tw, th) / 2 + PAD * sc);
      if (r <= maxR || size <= MIN_FS) break;
      size = Math.max(MIN_FS, size * 0.92);
    }

    b.fs = size;
    b.lh = size * 1.16;
    b.lines = lines;
    /* Once the type is on the floor the radius has to honour the text, even
       past maxR — a ball that clips its own label is worse than one slightly
       larger than its group nominally allows. */
    b.r = size <= MIN_FS ? r : Math.min(r, maxR);
  }

  /** The brain's interior is well under half its bounding box, so ball sizes
      are fitted to the room actually enclosed rather than to the canvas.
      Radius and type shrink together, so text that fitted still fits. */
  function fitDensity() {
    const room = polyArea(poly) * DENSITY;
    const area = () => balls.reduce((s, b) => s + Math.PI * b.r * b.r, 0);

    /* Shrink the type toward the legibility floor and RE-MEASURE, rather than
       scaling the finished radii.

       The old pass multiplied r and fs by one factor, floored at the point
       where the *smallest* label hit MIN_FS — and the smallest label on the
       board, "Claude Code" at group scale 0.75, starts at exactly
       BASE_FS * 0.75 = 7.5 = MIN_FS. So the floor bound at 1.0 and nothing
       could shrink at all, which is why a phone had to give up its labels
       entirely. Shrinking per ball lets the big ones come down while the
       already-minimum ones hold, and re-measuring means each radius is the
       one its text actually needs at its new size — not a scaled guess. */
    let shrink = 1;
    for (let pass = 0; pass < 12; pass++) {
      const used = area();
      if (used <= room) break;
      const k = Math.sqrt(room / used);
      if (k > 0.995) break;
      const next = shrink * Math.max(k, 0.8);   // damped, or it overshoots tiny
      if (Math.abs(next - shrink) < 0.004) break;
      shrink = next;
      balls.forEach((b) => measure(b, shrink));
    }

    const used = area();
    const ratio = used / room;
    // Even at the floor the labels may not fit. Then, and only then, the names
    // come off and the tooltip carries them.
    showLabels = ratio <= OVERFLOW_OK;
    lastFit = { room, used, ratio, shrink, showLabels };

    if (!showLabels) {
      // Freed from holding text, so sized purely by what group it belongs to.
      balls.forEach((b) => { b.r = MIN_R * GROUPS[b.g].scale; });
      const bare = area();
      const k = bare > room ? Math.sqrt(room / bare) : 1;
      if (k < 1) balls.forEach((b) => { b.r *= k; });
    }
    balls.forEach((b) => { b.m = b.r * b.r; }); // mass ∝ area
  }

  /* ---- boundary --------------------------------------------------- */

  function buildPoly() {
    // Fit the brain inside the canvas, preserving its aspect, with a margin.
    const s = Math.min(W / BRAIN_W, H / BRAIN_H) * 0.98;
    const ox = (W - BRAIN_W * s) / 2;
    const oy = (H - BRAIN_H * s) / 2;
    poly = BRAIN.map(([x, y]) => ({ x: ox + x * s, y: oy + y * s }));
  }

  function inside(x, y) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  }

  /** Nearest point on the boundary, and how far the ball centre is from it. */
  function nearest(x, y) {
    let bd = Infinity, bx = 0, by = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b.x - a.x, dy = b.y - a.y;
      const L = dx * dx + dy * dy;
      let t = L ? ((x - a.x) * dx + (y - a.y) * dy) / L : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t, py = a.y + dy * t;
      const d = Math.hypot(x - px, y - py);
      if (d < bd) { bd = d; bx = px; by = py; }
    }
    return { d: bd, x: bx, y: by };
  }

  /** Keep a ball inside the brain, reflecting off the wall it touches. */
  function contain(b) {
    const inb = inside(b.x, b.y);
    const n = nearest(b.x, b.y);
    if (inb && n.d >= b.r) return;

    let ux = n.x - b.x, uy = n.y - b.y;      // ball centre -> boundary
    const L = Math.hypot(ux, uy) || 1;
    ux /= L; uy /= L;

    if (inb) {
      b.x = n.x - ux * b.r;
      b.y = n.y - uy * b.r;
      const vn = b.vx * ux + b.vy * uy;      // outward component
      if (vn > 0) { b.vx -= (1 + WALL) * vn * ux; b.vy -= (1 + WALL) * vn * uy; }
    } else {
      b.x = n.x + ux * b.r;                  // ux now points back inward
      b.y = n.y + uy * b.r;
      const vn = b.vx * ux + b.vy * uy;
      if (vn < 0) { b.vx -= (1 + WALL) * vn * ux; b.vy -= (1 + WALL) * vn * uy; }
    }
    b.hot = Math.max(b.hot, 0.3);
  }

  /* ---- sizing ------------------------------------------------------ */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPoly();
    // Arrow, not a bare reference: forEach passes the INDEX as the second
    // argument, which measure() now reads as its shrink factor.
    balls.forEach((b) => measure(b));
    fitDensity();
    balls.forEach(contain);
  }

  /** Greedy placement over a grid of interior points, largest ball first.
      Rejection sampling alone leaves balls stranded outside a shape this
      concave, which is exactly what a random scatter got wrong. */
  function scatter() {
    const gap = Math.max(7, Math.min(W, H) / 90);
    const cand = [];
    for (let y = gap; y < H; y += gap) {
      for (let x = gap; x < W; x += gap) {
        if (!inside(x, y)) continue;
        cand.push({ x, y, d: nearest(x, y).d });
      }
    }
    if (!cand.length) return;

    const placed = [];
    [...balls].sort((a, b) => b.r - a.r).forEach((b) => {
      let best = null, bestScore = -Infinity;
      for (const c of cand) {
        if (c.d < b.r) continue;
        let score = c.d;
        for (const p of placed) {
          const room = Math.hypot(p.x - c.x, p.y - c.y) - p.r - b.r;
          if (room < score) score = room;
        }
        if (score > bestScore) { bestScore = score; best = c; }
      }
      // Deepest interior point if nothing clears — physics sorts out the rest.
      if (!best) best = cand.reduce((a, c) => (c.d > a.d ? c : a), cand[0]);
      b.x = best.x; b.y = best.y;
      placed.push(b);
      const a = Math.random() * Math.PI * 2;
      const s = 0.6 + Math.random() * 0.9;
      b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s;
    });
  }

  /* ---- pointer ------------------------------------------------------ */

  const ptr = { x: -9999, y: -9999, on: false };
  let hovered = null, dragging = null, down = null;

  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const hit = (p) => balls.find((b) => Math.hypot(b.x - p.x, b.y - p.y) <= b.r);

  /* TWO LINES, AND THE GROUP CARRIES ITS OWN COLOUR.

     The tip used to be the skill name alone, which answers "what is this ball"
     and leaves "why is it that colour" to be guessed. Naming the group in the
     hue the ball is already painted in closes that loop: the colour stops being
     decoration and becomes a key the reader can read directly off the thing
     they clicked.

     The group name is read from the DOM at call time rather than captured once,
     because the headings are translated and the i18n engine rewrites them in
     place — a cached copy would go stale the moment anyone switched language.

     textContent on each line, never innerHTML on the pair: these strings come
     from the markup and one of them is user-facing copy that may contain an
     ampersand, and building this with a template would make that an escaping
     problem for no gain. */
  function setTip(b) {
    if (!b) return;
    const name = groups[b.g]?.querySelector('.sgroup__t')?.textContent.trim() ?? '';
    tip.textContent = '';
    if (name) {
      const g = document.createElement('span');
      g.className = 'skillfield__tipg';
      g.style.color = GROUPS[b.g].c;
      g.textContent = name;
      tip.appendChild(g);
    }
    const n = document.createElement('span');
    n.className = 'skillfield__tipn';
    n.textContent = b.full;
    tip.appendChild(n);
  }
  function placeTip() {
    const half = tip.offsetWidth / 2 + 6;
    const above = hovered.y - hovered.r - 12;
    const below = above < 34;
    tip.classList.toggle('is-below', below);
    tip.style.left = `${Math.min(Math.max(hovered.x, half), Math.max(half, W - half))}px`;
    tip.style.top = `${below ? hovered.y + hovered.r + 12 : above}px`;
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = at(e);
    ptr.x = p.x; ptr.y = p.y; ptr.on = true;

    if (dragging) {
      // Velocity from how fast the pointer actually moves, so releasing
      // mid-sweep flings the ball instead of dropping it.
      dragging.vx = (p.x - dragging.x) * 0.35;
      dragging.vy = (p.y - dragging.y) * 0.35;
      dragging.x = p.x; dragging.y = p.y;
      return;
    }
    // A drag only starts once the pointer has travelled, so a plain click
    // still reads as a click.
    if (down?.ball && down.mouse && Math.hypot(p.x - down.x, p.y - down.y) > 4) dragging = down.ball;

    const h = hit(p);
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = h ? 'grab' : '';
      if (h) { setTip(h); tip.classList.add('is-in'); }
      else tip.classList.remove('is-in');
    }
    if (hovered) placeTip();
  });

  canvas.addEventListener('pointerleave', () => {
    ptr.on = false; ptr.x = ptr.y = -9999;
    hovered = null; dragging = null; down = null;
    tip.classList.remove('is-in');
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = at(e);
    // Dragging is mouse-only: grabbing a ball on touch would have to swallow
    // the gesture, and losing the ability to scroll past the section on a
    // phone is a far worse trade than losing drag there.
    down = { x: p.x, y: p.y, ball: hit(p), mouse: e.pointerType === 'mouse' };
    if (down.ball && down.mouse) canvas.style.cursor = 'grabbing';

    /* Touch has no hover, so without this a ball on a phone has no way to say
       what it is — which matters far more now the labels are dropped at that
       size. Tapping empty space dismisses, so the tip is never stuck on. */
    if (!down.mouse) {
      hovered = down.ball;
      if (hovered) { setTip(hovered); tip.classList.add('is-in'); placeTip(); }
      else tip.classList.remove('is-in');
    }
  });

  window.addEventListener('pointerup', (e) => {
    if (!down) return;
    const p = at(e);
    if (dragging) {
      dragging = null;
    } else if (Math.hypot(p.x - down.x, p.y - down.y) <= 4) {
      if (down.ball) {
        const b = down.ball;
        let dx = b.x - down.x, dy = b.y - down.y;
        let d = Math.hypot(dx, dy);
        if (d < 1) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
        b.vx += (dx / d) * KICK; b.vy += (dy / d) * KICK; b.hot = 1;
      } else {
        balls.forEach((b) => {
          const dx = b.x - down.x, dy = b.y - down.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d > 220) return;
          const f = (1 - d / 220) * KICK * 0.9;
          b.vx += (dx / d) * f; b.vy += (dy / d) * f;
        });
      }
    }
    canvas.style.cursor = hit(p) ? 'grab' : '';
    down = null;
  });

  /* ---- simulation --------------------------------------------------- */

  function step(scrolled) {
    // Scroll inertia. Scrolling down carries the section upward, so inside its
    // frame the balls lag downward — liquid sloshing in a moving glass. Reads
    // as weight; without it the field ignores the page moving around it.
    const slosh = scrolled
      ? Math.max(-SCROLL_MAX, Math.min(SCROLL_MAX, scrolled)) * SCROLL_F
      : 0;

    for (const b of balls) {
      if (b === dragging) { contain(b); continue; }
      if (slosh) b.vy += slosh;

      // Continuous repulsion, so sweeping the cursor through the field parts
      // it rather than only doing something on click.
      if (ptr.on) {
        const dx = b.x - ptr.x, dy = b.y - ptr.y;
        const d = Math.hypot(dx, dy) || 1;
        const reach = PUSH_R + b.r;
        if (d < reach) {
          const f = (1 - d / reach) ** 2 * PUSH_F;
          b.vx += (dx / d) * f; b.vy += (dy / d) * f;
        }
      }

      b.vx *= DAMP; b.vy *= DAMP;

      // Without this they stall into a still life. A touch of wander keeps the
      // field alive without reading as drift.
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < 0.28) {
        b.vx += (Math.random() - 0.5) * 0.07;
        b.vy += (Math.random() - 0.5) * 0.07;
      } else if (sp > MAXV) {
        b.vx = (b.vx / sp) * MAXV; b.vy = (b.vy / sp) * MAXV;
      }

      b.x += b.vx; b.y += b.vy;
      contain(b);
      b.hot *= 0.94;
    }

    // Impulse-based resolution: momentum transfers along the contact normal in
    // proportion to mass, which is what makes the chain reactions read right.
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d >= min) continue;
        if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }

        const nx = dx / d, ny = dy / d;
        const total = a.m + b.m;

        // Separate first, weighted by mass, or they sink into each other.
        const ov = min - d;
        if (a !== dragging) { a.x -= nx * ov * (b.m / total); a.y -= ny * ov * (b.m / total); }
        if (b !== dragging) { b.x += nx * ov * (a.m / total); b.y += ny * ov * (a.m / total); }

        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn > 0) continue; // already separating

        const imp = (-(1 + REST) * vn) / (1 / a.m + 1 / b.m);
        if (a !== dragging) { a.vx -= (imp * nx) / a.m; a.vy -= (imp * ny) / a.m; }
        if (b !== dragging) { b.vx += (imp * nx) / b.m; b.vy += (imp * ny) / b.m; }

        const flash = Math.min(1, Math.abs(vn) / 12);
        a.hot = Math.max(a.hot, flash);
        b.hot = Math.max(b.hot, flash);
      }
    }
  }

  /* ---- render -------------------------------------------------------- */

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!poly.length) return;

    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,.018)';
    ctx.fill();
    ctx.lineWidth = 1.4;
    /* Canvas cannot use var(), so the accent is READ from the token rather
       than copied. A second hard-coded literal is how the brain outline
       stayed amber after the rest of the site went green. */
    ctx.strokeStyle = `rgba(${ACCENT_RGB}, .34)`;
    ctx.shadowBlur = 18;
    ctx.shadowColor = `rgba(${ACCENT_RGB}, .22)`;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const b of balls) {
      const G = GROUPS[b.g];
      const lift = b === hovered ? 1 : b.hot;

      ctx.save();
      ctx.translate(b.x, b.y);

      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fillStyle = G.fill;
      ctx.fill();

      ctx.lineWidth = 1.5 + lift * 1.2;
      ctx.strokeStyle = G.c;
      // The glow fires on impact and decays, so you can see which balls just
      // traded energy.
      ctx.shadowBlur = 8 + lift * 28;
      ctx.shadowColor = G.c;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (showLabels) {
        ctx.font = `700 ${b.fs}px ${FONT()}`;
        ctx.fillStyle = '#ffffff';
        const top = -((b.lines.length - 1) * b.lh) / 2;
        b.lines.forEach((l, i) => ctx.fillText(l, 0, top + i * b.lh));
      }

      ctx.restore();
    }
  }

  /* ---- loop ---------------------------------------------------------- */

  let raf = 0, last = 0, acc = 0, running = false, lastScroll = 0;

  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    // Clamped so returning to a backgrounded tab does not integrate a huge dt
    // and fire every ball through the boundary.
    acc = Math.min(acc + (t - last) / 1000, 0.1);
    last = t;

    const sy = window.scrollY;
    const scrolled = sy - lastScroll;
    lastScroll = sy;

    // The nudge is the frame's scroll, so it is spent once rather than applied
    // again in every substep the accumulator happens to run.
    let first = true;
    while (acc >= STEP) {
      step(first ? scrolled : 0);
      first = false;
      acc -= STEP;
    }
    draw();
  }

  function start() {
    if (running || !live) return;
    /* Under reduced motion the balls are settled once and then left alone.
       Stepping the solver ~90 times resolves the overlaps and lets them come
       to rest inside the outline — the same arrangement the animated version
       reaches, arrived at in one frame instead of over several seconds of
       visible drift. After this nothing moves unless the reader moves it. */
    if (reducedMotion) {
      // step()'s argument is the frame's SCROLL DELTA, not a timestep — it is
      // the slosh nudge. Passing STEP here would push every ball downward 90
      // times and pile them in the base of the skull.
      for (let i = 0; i < 90; i++) step(0);
      draw();
      return;
    }
    running = true; last = performance.now(); acc = 0;
    lastScroll = window.scrollY; // or the first frame slams in the whole offset
    raf = requestAnimationFrame(frame);
  }

  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---- mount / unmount ------------------------------------------------ */

  function mount() {
    if (live) return;
    live = true;
    field.hidden = false;
    list.hidden = true;
    buildKey();
    resize();
    scatter();
    draw();
  }

  function unmount() {
    if (!live) return;
    stop();
    live = false;
    field.hidden = true;
    list.hidden = false;
    tip.classList.remove('is-in');
  }

  /** The brain runs at every width now. MIN_W is only the floor below which
      there is no layout at all; whether the balls carry their labels is
      decided by fitDensity from the room actually enclosed. */
  function apply() {
    if (window.innerWidth >= MIN_W) {
      const wasLive = live;
      mount();
      if (wasLive) resize();
      if (field.getBoundingClientRect().top < innerHeight) start();
    } else {
      unmount();
    }
  }

  apply();

  // Dev-only handle. Folded out of the production bundle by Vite, and the one
  // thing that makes the labels/no-labels decision inspectable as a number.
  if (import.meta.env.DEV) {
    window.__skills = { get fit() { return lastFit; }, get balls() { return balls; } };
  }

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(apply, 150);
  });

  // Only run while on screen — the sim is cheap but not free.
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) start(); else stop();
  }, { rootMargin: '120px' }).observe(field);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (field.getBoundingClientRect().top < innerHeight) start();
  });

  window.addEventListener('sa:languagechange', () => {
    buildKey();
    if (hovered) setTip(hovered);
  });
}
