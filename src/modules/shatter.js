/**
 * MAP -> SHARDS -> WHEELS.
 *
 * One continuous move across three beats:
 *
 *   crack     the Riyadh thermal plate splits into fourteen pieces
 *   drift     the pieces float in space while the reader is elsewhere
 *   gather    they converge into the two rings and become the project cards
 *
 * The reason it is worth the trouble is that it is TRUE rather than decorative:
 * the projects are the work done on that map, so the map becoming the projects
 * is the argument the section is making, not a transition effect applied to it.
 *
 * FOUR PROBLEMS, AND HOW EACH IS SOLVED
 *
 * 1. At progress 0 the pieces must be indistinguishable from the map.
 *    Every shard carries the SAME background image at viewport size, offset by
 *    its own cell position. Fourteen elements then tile back into one seamless
 *    picture — there is no seam to hide because there is no resampling.
 *
 * 2. A crack fragment is jagged; a card is a rectangle.
 *    `clip-path: polygon()` only interpolates between polygons with the same
 *    vertex count, so each shard is given a jagged outline and a rectangular
 *    one built from the SAME number of points, and morphs between them.
 *
 * 3. They must arrive exactly where the ring wants them.
 *    The ring's geometry is solved here from the same formula wheel.js uses,
 *    so the landing transform is the ring transform rather than an approximation
 *    of it — no drift at the handover.
 *
 * 4. It has to span three sections without the page jumping.
 *    The layer is fixed and driven by one scroll range, the way .worlds already
 *    works, so nothing is pinned and no document height changes.
 */

const N_PER_WHEEL = 7;
const COLS = 7;                 // the crack grid: 7 across
const ROWS = 2;                 // and 2 down -> 14 pieces, one per project

/** Deterministic pseudo-random. The drift has to be identical on every load, or
 *  a reader who scrolls back sees a different arrangement and the sequence stops
 *  reading as one object moving. */
function rnd(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A jagged outline for one cell, and a rectangle with the SAME point count, so
 *  clip-path can interpolate between them. Points run the perimeter in order. */
function outlines(i, per = 3) {
  const jag = [];
  const rect = [];
  const corners = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (let c = 0; c < 4; c++) {
    const [x0, y0] = corners[c];
    const [x1, y1] = corners[(c + 1) % 4];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      rect.push([x, y]);
      // Push the edge inward/outward, but never the corners — a torn edge that
      // moves its corners stops tiling with its neighbours.
      const amp = s === 0 ? 0 : 9;
      const nx = x + (rnd(i * 17 + c * 5 + s) - 0.5) * amp;
      const ny = y + (rnd(i * 17 + c * 5 + s, 2) - 0.5) * amp;
      jag.push([nx, ny]);
    }
  }
  // Returned as POINT ARRAYS, not strings. The crack has to grow from nothing,
  // and that means interpolating the vertices — swapping between two finished
  // polygons gives a cracked map at rest and a pop when it changes.
  return { jag, rect };
}

/** Blend two equal-length point lists into a clip-path. t=0 is the intact
 *  rectangle, t=1 the torn edge. */
function clipAt(rect, jag, t) {
  const pts = rect.map(([x, y], i) => {
    const [jx, jy] = jag[i];
    return `${(x + (jx - x) * t).toFixed(2)}% ${(y + (jy - y) * t).toFixed(2)}%`;
  });
  return `polygon(${pts.join(', ')})`;
}

export function initShatter(root, opts = {}) {
  if (!root) return null;
  const mapSrc = opts.map || '/assets/img/riyadh-heat.webp';
  const faces = opts.faces || [];

  const shards = [];
  const layer = document.createElement('div');
  layer.className = 'shatter__layer';
  root.appendChild(layer);

  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const el = document.createElement('div');
    el.className = 'shard';
    el.style.setProperty('--col', col);
    el.style.setProperty('--row', row);

    // The map slice. Sized to the whole viewport and offset by this cell, so
    // the fourteen of them reconstruct the original picture exactly.
    const mapFace = document.createElement('div');
    mapFace.className = 'shard__face shard__face--map';
    mapFace.style.backgroundImage = `url(${mapSrc})`;

    // What it becomes.
    const projFace = document.createElement('div');
    projFace.className = 'shard__face shard__face--proj';
    if (faces[i]) projFace.style.backgroundImage = `url(${faces[i].img})`;

    const label = document.createElement('span');
    label.className = 'shard__label';
    label.textContent = faces[i]?.label || '';

    el.append(mapFace, projFace, label);
    layer.appendChild(el);

    const o = outlines(i);
    shards.push({
      el, col, row, mapFace, projFace, label, ...o,
      // Where it drifts to. Spread through depth as well as across the frame,
      // or it reads as confetti on glass rather than debris in space.
      fx: (rnd(i, 1) - 0.5) * 2,
      fy: (rnd(i, 3) - 0.5) * 2,
      fz: -200 - rnd(i, 5) * 900,
      rx: (rnd(i, 7) - 0.5) * 160,
      ry: (rnd(i, 9) - 0.5) * 160,
      rz: (rnd(i, 11) - 0.5) * 90,
    });
  }

  /* ---- the ring each shard lands in --------------------------
     Solved with the same formula wheel.js uses — R = (h/2)/tan(step/2) * (1+GAP)
     — so the landing pose IS the ring pose. Deriving it independently here
     would leave a small mismatch at the handover, which is exactly the kind of
     seam that makes a transition look assembled rather than continuous. */
  function ringPose(i, vw, vh) {
    const wheel = i < N_PER_WHEEL ? 0 : 1;
    const idx = i % N_PER_WHEEL;
    const step = 360 / N_PER_WHEEL;

    const horizontal = vw <= 900;
    const cardW = Math.min(vw * 0.31, 460);
    const cardH = Math.min(vh * 0.33, 330);
    const along = horizontal ? cardW : cardH;
    const radius = (along / 2) / Math.tan((step / 2) * Math.PI / 180) * 1.52;

    // Column centres on desktop; stacked band centres on a phone.
    const cx = horizontal ? vw / 2 : (wheel === 0 ? vw * 0.27 : vw * 0.73);
    const cy = horizontal ? (wheel === 0 ? vh * 0.3 : vh * 0.72) : vh / 2;

    const a = -idx * step;
    return { cx, cy, a, radius, cardW, cardH, horizontal };
  }

  let progress = 0;

  function paint() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = progress;

    // Three beats, each with its own easing. Splitting them means the crack can
    // be sharp while the gather is soft, which is what makes it read as one
    // move rather than a single linear slide.
    const crack = Math.min(1, Math.max(0, p / 0.18));
    const drift = Math.min(1, Math.max(0, (p - 0.12) / 0.45));
    const gather = Math.min(1, Math.max(0, (p - 0.58) / 0.42));
    const gEase = gather < 0.5 ? 2 * gather * gather : 1 - ((-2 * gather + 2) ** 2) / 2;

    layer.style.setProperty('--vw', `${vw}px`);
    layer.style.setProperty('--vh', `${vh}px`);

    shards.forEach((s, i) => {
      const pose = ringPose(i, vw, vh);

      // Cell geometry, in viewport units.
      const cellW = vw / COLS;
      const cellH = vh / ROWS;
      const homeX = s.col * cellW;
      const homeY = s.row * cellH;

      // Drift target, in px from home.
      const driftX = s.fx * vw * 0.42;
      const driftY = s.fy * vh * 0.38;

      /* Landing target, relative to this shard's home cell.
         Centred on the shard's FINAL size, not its cell size. The shard is
         cellW wide at the start and cardW wide at the end, so subtracting
         cellW/2 here left every landing offset by half the difference — which
         is what pushed both rings out toward the edges of the frame. */
      const landX = pose.cx - pose.cardW / 2 - homeX;
      const landY = pose.cy - pose.cardH / 2 - homeY;

      const x = driftX * drift * (1 - gEase) + landX * gEase;
      const y = driftY * drift * (1 - gEase) + landY * gEase;
      const z = s.fz * drift * (1 - gEase);

      const rx = (s.rx * drift) * (1 - gEase) + (pose.horizontal ? 0 : pose.a) * gEase;
      const ry = (s.ry * drift) * (1 - gEase) + (pose.horizontal ? pose.a : 0) * gEase;
      const rz = (s.rz * drift) * (1 - gEase);

      // Size: a viewport cell at the start, a card at the end.
      const w = cellW + (pose.cardW - cellW) * gEase;
      const h = cellH + (pose.cardH - cellH) * gEase;
      const ringZ = pose.radius * gEase;

      s.el.style.width = `${w.toFixed(1)}px`;
      s.el.style.height = `${h.toFixed(1)}px`;
      /* The ring is pushed BACK by its own radius before the rotation, exactly
         as wheel.js does it. Without that leading translateZ(-r) the front card
         ends a full radius nearer the camera than the perspective origin and is
         magnified — measured at 732px wide for a 446px card, hanging off the
         left edge. Pushing back first puts the front card at z = 0 and its true
         size, and only the far side is scaled, downward. */
      s.el.style.transform =
        `translate3d(${(homeX + x).toFixed(1)}px, ${(homeY + y).toFixed(1)}px, ${z.toFixed(1)}px)`
        + ` translateZ(${(-ringZ).toFixed(1)}px)`
        + ` rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`
        + ` translateZ(${ringZ.toFixed(1)}px)`;

      // The map slice has to keep pointing at the same part of the picture while
      // the shard is still map-sized, so it is anchored to the ORIGINAL cell.
      s.mapFace.style.backgroundSize = `${vw}px ${vh}px`;
      s.mapFace.style.backgroundPosition = `${-homeX}px ${-homeY}px`;

      /* Intact at rest, torn while flying, square again as it becomes a card.
         The tear grows over the crack beat and closes over the gather, so at
         progress 0 the fourteen pieces are a seamless map — which is the whole
         illusion. Clipping to the jagged outline from the start left visible
         gaps and ate the outer edge of the picture. */
      const tear = Math.min(crack, 1 - gEase);
      s.el.style.clipPath = clipAt(s.rect, s.jag, tear);

      // Content crossfade happens in the middle of the flight, where neither
      // reading is being examined closely.
      const face = Math.min(1, Math.max(0, (p - 0.30) / 0.28));
      s.mapFace.style.opacity = String(1 - face);
      s.projFace.style.opacity = String(face);
      s.label.style.opacity = String(gEase > 0.7 ? (gEase - 0.7) / 0.3 : 0);
    });
  }

  function setProgress(v) {
    progress = Math.min(1, Math.max(0, v));
    paint();
  }

  window.addEventListener('resize', paint, { passive: true });
  paint();

  return { setProgress, shards, layer };
}
