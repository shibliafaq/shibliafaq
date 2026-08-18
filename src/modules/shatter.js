/**
 * THE MAP BREAKS INTO PLATES.
 *
 *   crack    the map splits into ~50 rectangles of wildly different sizes
 *   drift    they tumble through space and can be shoved around with the mouse
 *   gather   fourteen of them take a project photo and form the rings
 *
 * RECTANGLES, NOT SHARDS — and it is a better fit than the glass version was.
 * The pieces are already the shape they have to end up as, so there is no
 * polygon morph at the end and no moment where a fragment visibly squares
 * itself up. It also matches what the rest of the page is made of: every card,
 * plate and tile on this site is a rectangle.
 *
 * The split is recursive and always across the LONGER side of whichever plate
 * it picks, which is what keeps the sizes varied without producing slivers. A
 * uniform grid gives fifty identical tiles and reads as a spreadsheet; splitting
 * the biggest plate each time gives a few large faces and many small ones, which
 * is what makes it look broken rather than divided.
 *
 * WHY ONLY SOME PLATES BECOME CARDS
 * Fourteen projects, but a convincing break needs far more than fourteen pieces.
 * Carriers take a photograph, the rest stay blank and are thrown clear.
 */

const N_RAYS = 13;             // radial fractures out from the impact
const N_RINGS = 4;             // concentric fractures around it
const CARRIERS = 14;           // shards that become project cards

const rand = (a, b) => a + Math.random() * (b - a);

/** Recursive split into rectangles. Always cuts the LONGER side of the plate
 *  it picks, so nothing degenerates into a sliver, and it biases toward the
 *  biggest remaining plate so the result is a few large faces and many small
 *  ones rather than fifty of the same size. */
function fracture(vw, vh, target = 52) {
  let rects = [{ x: 0, y: 0, w: vw, h: vh }];
  const MIN = Math.min(vw, vh) * 0.028;   // below this a plate reads as grit

  let guard = 0;
  while (rects.length < target && guard++ < target * 12) {
    rects.sort((a, b) => b.w * b.h - a.w * a.h);
    /* Reach across the WHOLE list, not just the top ten.
       Always splitting the largest plate equalises everything: measured, it
       gave only a 3.3x spread between the biggest and smallest piece, which
       reads as a mosaic rather than a break. Sampling the full sorted list with
       a mild bias toward the front means some large faces survive untouched
       while some small ones get split again — which is where the wide range of
       sizes in a real break comes from. */
    const idx = Math.floor(Math.pow(Math.random(), 1.7) * rects.length);
    const r = rects[idx];
    const cutVertical = r.w >= r.h;
    const span = cutVertical ? r.w : r.h;
    if (span < MIN * 2) continue;
    const t = rand(0.32, 0.68);
    rects.splice(idx, 1);
    if (cutVertical) {
      const cut = Math.max(MIN, Math.min(r.w - MIN, r.w * t));
      rects.push({ x: r.x, y: r.y, w: cut, h: r.h });
      rects.push({ x: r.x + cut, y: r.y, w: r.w - cut, h: r.h });
    } else {
      const cut = Math.max(MIN, Math.min(r.h - MIN, r.h * t));
      rects.push({ x: r.x, y: r.y, w: r.w, h: cut });
      rects.push({ x: r.x, y: r.y + cut, w: r.w, h: r.h - cut });
    }
  }
  return rects;
}

export function initShatter(root, opts = {}) {
  if (!root) return null;
  const mapSrc = opts.map || '/assets/img/riyadh-heat.webp';
  const faces = opts.faces || [];

  const layer = document.createElement('div');
  layer.className = 'shatter__layer';
  root.appendChild(layer);

  let shards = [];
  let vw = 0;
  let vh = 0;
  let progress = 0;

  function build() {
    layer.innerHTML = '';
    shards = [];
    vw = window.innerWidth;
    vh = window.innerHeight;

    const rects = fracture(vw, vh);

    // Carriers are the largest plates — a photograph needs room to be read, and
    // the big faces are the ones the eye follows anyway.
    const order = rects
      .map((r, i) => ({ i, area: r.w * r.h }))
      .sort((x, y) => y.area - x.area);
    const carrierOf = new Map();
    order.slice(0, CARRIERS).forEach((c, n) => carrierOf.set(c.i, n));

    rects.forEach((r, i) => {
      const bx = r.x;
      const by = r.y;
      const bw = r.w;
      const bh = r.h;

      const el = document.createElement('div');
      el.className = 'shard';
      el.style.width = bw + 'px';
      el.style.height = bh + 'px';

      const mapFace = document.createElement('div');
      mapFace.className = 'shard__face shard__face--map';
      mapFace.style.backgroundImage = 'url(' + mapSrc + ')';
      mapFace.style.backgroundSize = vw + 'px ' + vh + 'px';
      mapFace.style.backgroundPosition = (-bx) + 'px ' + (-by) + 'px';
      el.appendChild(mapFace);

      const n = carrierOf.has(i) ? carrierOf.get(i) : -1;
      let projFace = null;
      let label = null;
      if (n >= 0 && faces[n]) {
        projFace = document.createElement('div');
        projFace.className = 'shard__face shard__face--proj';
        projFace.style.backgroundImage = 'url(' + faces[n].img + ')';
        label = document.createElement('span');
        label.className = 'shard__label';
        label.textContent = faces[n].label;
        el.append(projFace, label);
      }

      const sheen = document.createElement('div');
      sheen.className = 'shard__sheen';
      el.appendChild(sheen);
      layer.appendChild(el);

      shards.push({
        el, mapFace, projFace, label,
        bx, by, bw, bh,
        carrier: n,
        cx: bx + bw / 2, cy: by + bh / 2,
        ox: 0, oy: 0, vx: 0, vy: 0,
        rot: { x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1) },
        spin: rand(18, 105) * (Math.random() < 0.5 ? -1 : 1),
        /* Depth is SIGNED: about a third of the plates come toward the reader
           and the rest recede. Everything retreating reads as a picture being
           pulled away rather than as something breaking around you. */
        zdir: Math.random() < 0.34 ? rand(0.35, 1) : -rand(0.3, 1),
        zamt: rand(180, 620),
      });
    });
  }

  /* ---- where the carriers land -------------------------------
     Solved with the formula wheel.js uses, so the landing pose IS the ring pose
     rather than an approximation of it. */
  function ringPose(n, w, h) {
    const per = CARRIERS / 2;
    const wheel = n < per ? 0 : 1;
    const idx = n % per;
    const step = 360 / per;
    const horizontal = w <= 900;
    const cardW = Math.min(w * 0.31, 460);
    const cardH = Math.min(h * 0.33, 330);
    const radius = ((horizontal ? cardW : cardH) / 2)
      / Math.tan((step / 2) * Math.PI / 180) * 1.52;
    const cx = horizontal ? w / 2 : (wheel === 0 ? w * 0.27 : w * 0.73);
    const cy = horizontal ? (wheel === 0 ? h * 0.3 : h * 0.72) : h / 2;
    return { cx, cy, a: -idx * step, radius, cardW, cardH, horizontal };
  }

  /* ---- pointer shove ----------------------------------------- */
  const pointer = { x: -9999, y: -9999, on: false };
  root.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.on = true;
  }, { passive: true });
  root.addEventListener('pointerleave', () => { pointer.on = false; }, { passive: true });

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    paint(dt);
  }

  function paint(dt) {
    const p = progress;
    const crack = Math.min(1, Math.max(0, p / 0.16));
    const drift = Math.min(1, Math.max(0, (p - 0.10) / 0.42));
    const gather = Math.min(1, Math.max(0, (p - 0.60) / 0.40));
    const gEase = gather < 0.5 ? 2 * gather * gather : 1 - Math.pow(-2 * gather + 2, 2) / 2;
    const floating = drift > 0.05 && gEase < 0.4;

    for (const s of shards) {
      /* Physics only while floating. Outside that window the offsets are damped
         to zero so the gather can place each shard exactly — a lingering
         velocity would leave the rings subtly crooked. */
      if (floating) {
        if (pointer.on) {
          const dx = (s.cx + s.ox) - pointer.x;
          const dy = (s.cy + s.oy) - pointer.y;
          const d2 = dx * dx + dy * dy;
          const R = 280;
          if (d2 < R * R && d2 > 1) {
            const d = Math.sqrt(d2);
            const push = (1 - d / R) * 3000 * dt;
            s.vx += (dx / d) * push;
            s.vy += (dy / d) * push;
          }
        }
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.ox += s.vx * dt;
        s.oy += s.vy * dt;
        // A soft pull home, so a shoved fragment drifts back instead of being
        // lost off-screen for the rest of the sequence.
        s.ox -= s.ox * 0.4 * dt;
        s.oy -= s.oy * 0.4 * dt;
      } else {
        s.vx *= 0.86;
        s.vy *= 0.86;
        s.ox *= 0.86;
        s.oy *= 0.86;
      }

      const carrier = s.carrier >= 0;
      const pose = carrier ? ringPose(s.carrier, vw, vh) : null;

      /* Spread, not eviction. At 1.1 the outward push doubled every fragment's
         distance from centre and most of the field left the viewport, leaving
         the drift beat almost empty. 0.3 opens the pattern up while keeping the
         debris on screen, which is the point of the beat. */
      const outX = (s.cx - vw / 2) * 0.3 * drift;
      const outY = (s.cy - vh / 2) * 0.3 * drift;
      const outZ = s.zdir * s.zamt * drift;

      let x = outX + s.ox;
      let y = outY + s.oy;
      let z = outZ;
      let w = s.bw;
      let h = s.bh;
      let ringZ = 0;
      let rx = s.rot.x * s.spin * drift;
      let ry = s.rot.y * s.spin * drift;
      let rz = s.rot.z * s.spin * drift;

      if (carrier) {
        const landX = pose.cx - pose.cardW / 2 - s.bx;
        const landY = pose.cy - pose.cardH / 2 - s.by;
        x = x * (1 - gEase) + landX * gEase;
        y = y * (1 - gEase) + landY * gEase;
        z = z * (1 - gEase);
        w = s.bw + (pose.cardW - s.bw) * gEase;
        h = s.bh + (pose.cardH - s.bh) * gEase;
        ringZ = pose.radius * gEase;
        rx = rx * (1 - gEase) + (pose.horizontal ? 0 : pose.a) * gEase;
        ry = ry * (1 - gEase) + (pose.horizontal ? pose.a : 0) * gEase;
        rz = rz * (1 - gEase);
      } else {
        // Debris is thrown clear rather than fading on the spot, so the frame
        // empties outward and the rings are what is left behind.
        x += (s.cx - vw / 2) * gEase * 1.8;
        y += (s.cy - vh / 2) * gEase * 1.8;
        z -= 1100 * gEase;
      }

      /* NO clip-path. Every plate is already the shape it has to end up as, so
         there is nothing to morph — which also removes a per-frame polygon
         string for all 52 elements.

         The break is expressed as a GAP instead: each plate shrinks slightly
         while the crack runs, opening dark seams between neighbours, so the
         surface reads as coming apart rather than as tiles fading.

         Declared HERE, above the transform that uses it. It was written below
         and every frame threw "Cannot access 'seam' before initialization",
         which silently froze all 52 plates at the origin. */
      const seam = 1 - 0.05 * crack * (1 - gEase);

      /* The ring is pushed BACK by its own radius before the rotation, exactly
         as wheel.js does. Without it the front card ends a full radius nearer
         the camera than the perspective origin and is magnified. */
      s.el.style.width = w.toFixed(1) + 'px';
      s.el.style.height = h.toFixed(1) + 'px';
      s.el.style.transform =
        'translate3d(' + (s.bx + x).toFixed(1) + 'px,' + (s.by + y).toFixed(1) + 'px,' + z.toFixed(1) + 'px)'
        + ' translateZ(' + (-ringZ).toFixed(1) + 'px)'
        + ' rotateX(' + rx.toFixed(2) + 'deg)'
        + ' rotateY(' + ry.toFixed(2) + 'deg)'
        + ' rotateZ(' + rz.toFixed(2) + 'deg)'
        + ' translateZ(' + ringZ.toFixed(1) + 'px)'
        + ' scale(' + seam.toFixed(4) + ')';

      if (s.projFace) {
        const face = Math.min(1, Math.max(0, (p - 0.24) / 0.30));
        s.mapFace.style.opacity = String(1 - face);
        s.projFace.style.opacity = String(face);
        s.label.style.opacity = String(gEase > 0.72 ? (gEase - 0.72) / 0.28 : 0);
      } else {
        s.el.style.opacity = String(Math.max(0, 1 - gEase * 1.5));
      }
    }
  }

  function setProgress(v) { progress = Math.min(1, Math.max(0, v)); }

  window.addEventListener('resize', build, { passive: true });
  build();
  requestAnimationFrame(frame);

  return { setProgress, rebuild: build, get shards() { return shards; } };
}
