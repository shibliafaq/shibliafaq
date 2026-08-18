/**
 * THE MAP BREAKS LIKE GLASS.
 *
 *   crack    an impact point, radial and concentric fractures, ~50 shards
 *   drift    they tumble through space and can be shoved around with the mouse
 *   gather   fourteen of them square up, take a project photo, form the rings
 *
 * WHY RADIAL + CONCENTRIC RATHER THAN A VORONOI
 * Real glass does not break into evenly sized cells. It fails along rays running
 * out from the impact and rings running around it, so fragments are small and
 * sharp near the strike and large and blunt at the edges. Building the fracture
 * that way gives the size gradient and the shard SHAPES for free, and costs a
 * fraction of what a Voronoi would. The randomness lives in the ray angles and
 * the ring radii — which is exactly where a real break varies — so the glass
 * never breaks the same way twice.
 *
 * WHY ONLY SOME SHARDS BECOME CARDS
 * There are fourteen projects, but a convincing break needs far more than
 * fourteen pieces. So the shards are split: carriers square up and take a
 * photograph, the rest stay glass and are thrown clear. If every fragment became
 * a card the break would read as a grid that happened to be jagged.
 */

const N_RAYS = 13;             // radial fractures out from the impact
const N_RINGS = 4;             // concentric fractures around it
const PTS = 20;                // vertices per shard — fixed, so clip-path can morph
const CARRIERS = 14;           // shards that become project cards

const rand = (a, b) => a + Math.random() * (b - a);

/** Resample a polygon to exactly PTS vertices around its perimeter. Every shard
 *  needs the same count or clip-path cannot interpolate it to a rectangle. */
function resample(poly, n = PTS) {
  const segLen = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(d);
    total += d;
  }
  const out = [];
  let walked = 0;
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const want = (i / n) * total;
    while (seg < poly.length - 1 && walked + segLen[seg] < want) {
      walked += segLen[seg];
      seg++;
    }
    const t = segLen[seg] ? (want - walked) / segLen[seg] : 0;
    const a = poly[seg];
    const b = poly[(seg + 1) % poly.length];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** The fracture pattern, in viewport pixels. Rebuilt fresh every time. */
function fracture(vw, vh) {
  const ix = rand(0.28, 0.72) * vw;
  const iy = rand(0.28, 0.72) * vh;
  const maxR = Math.hypot(Math.max(ix, vw - ix), Math.max(iy, vh - iy)) * 1.2;

  const angles = Array.from({ length: N_RAYS }, () => Math.random() * Math.PI * 2)
    .sort((a, b) => a - b);
  angles.push(angles[0] + Math.PI * 2);

  // Radii grow faster than linearly, so fragments near the impact stay small —
  // the single strongest cue that something was struck at that point.
  const rings = [0];
  for (let i = 1; i <= N_RINGS; i++) {
    rings.push(maxR * Math.pow(i / N_RINGS, 1.7) * rand(0.85, 1.15));
  }
  rings[N_RINGS] = maxR;

  const cells = [];
  for (let r = 0; r < N_RINGS; r++) {
    for (let a = 0; a < N_RAYS; a++) {
      const a0 = angles[a];
      const a1 = angles[a + 1];
      const r0 = rings[r];
      const r1 = rings[r + 1];
      const j = () => rand(0.97, 1.03);   // no two fragments share a clean edge
      const poly = [];
      const steps = 3;
      for (let s = 0; s <= steps; s++) {
        const ang = a0 + (a1 - a0) * (s / steps);
        poly.push([ix + Math.cos(ang) * r0 * j(), iy + Math.sin(ang) * r0 * j()]);
      }
      for (let s = steps; s >= 0; s--) {
        const ang = a0 + (a1 - a0) * (s / steps);
        poly.push([ix + Math.cos(ang) * r1 * j(), iy + Math.sin(ang) * r1 * j()]);
      }
      cells.push(poly);
    }
  }
  return cells;
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

    const cells = fracture(vw, vh);

    // Carriers are the largest fragments — a photograph needs room to be read,
    // and the big pieces are the ones the eye follows anyway.
    const order = cells.map((poly, i) => {
      let a = 0;
      for (let k = 0; k < poly.length; k++) {
        const p1 = poly[k];
        const p2 = poly[(k + 1) % poly.length];
        a += p1[0] * p2[1] - p2[0] * p1[1];
      }
      return { i, area: Math.abs(a) / 2 };
    }).sort((x, y) => y.area - x.area);

    const carrierOf = new Map();
    order.slice(0, CARRIERS).forEach((c, n) => carrierOf.set(c.i, n));

    cells.forEach((poly, i) => {
      // A bounding box per shard: fifty viewport-sized elements would be fifty
      // full-screen composites every frame.
      const xs = poly.map((pt) => pt[0]);
      const ys = poly.map((pt) => pt[1]);
      const bx = Math.min(...xs);
      const by = Math.min(...ys);
      const bw = Math.max(2, Math.max(...xs) - bx);
      const bh = Math.max(2, Math.max(...ys) - by);

      const local = resample(poly).map(([x, y]) => [((x - bx) / bw) * 100, ((y - by) / bh) * 100]);
      const rect = resample([[0, 0], [100, 0], [100, 100], [0, 100]]);

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
        bx, by, bw, bh, local, rect,
        carrier: n,
        cx: bx + bw / 2, cy: by + bh / 2,
        ox: 0, oy: 0, vx: 0, vy: 0,
        rot: { x: rand(-1, 1), y: rand(-1, 1), z: rand(-1, 1) },
        /* Tumble, not a propeller. At 60-320 degrees most fragments passed
           through edge-on during the drift and simply vanished — a plane with
           no thickness is invisible at 90 degrees. Kept under a quarter turn so
           every shard stays face-on enough to read. */
        spin: rand(18, 105) * (Math.random() < 0.5 ? -1 : 1),
        /* Depth is SIGNED. Some fragments fly toward the reader and some
           recede — a break where everything retreats reads as a picture being
           pulled away rather than as glass coming apart around you. Weighted so
           more go back than forward, because a shard that comes too close just
           fills the frame. */
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
        + ' translateZ(' + ringZ.toFixed(1) + 'px)';

      // Torn while flying, square once it is a card. Debris never squares up.
      const tear = carrier ? Math.min(crack, 1 - gEase) : crack;
      const pts = [];
      for (let k = 0; k < s.local.length; k++) {
        const lx = s.local[k][0];
        const ly = s.local[k][1];
        const rxp = s.rect[k][0];
        const ryp = s.rect[k][1];
        pts.push((rxp + (lx - rxp) * tear).toFixed(2) + '% '
               + (ryp + (ly - ryp) * tear).toFixed(2) + '%');
      }
      s.el.style.clipPath = 'polygon(' + pts.join(',') + ')';

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
