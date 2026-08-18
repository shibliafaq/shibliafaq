/**
 * THE MAP LEAVES, THE TILES ARRIVE.
 *
 *   fade     the Riyadh plate dissolves
 *   arrive   fourteen glass tiles come in from far off, growing as they near
 *   float    they hang in space, drifting, and can be shoved with the pointer
 *   gather   they settle into the two rings
 *
 * This replaces a version that shattered the map into the tiles. Breaking it was
 * a better story on paper and a worse thing to watch: the fracture had to be
 * read, understood and then undone, all inside two screens of scroll, and the
 * fragments spent most of that time being neither a map nor a project. Letting
 * the map go and bringing the work in from depth says the same thing — this
 * place produced these projects — with one idea on screen at a time.
 *
 * It is also honest about scale. Fourteen tiles arriving from far away have room
 * to be looked at; fifty fragments never did.
 */

const CARRIERS = 14;
/* Must match `perspective` on .tilefield. The float placement is corrected for
   depth using this, so a wrong value shows up as a field that clumps toward the
   centre rather than as anything obviously broken. */
const PERSPECTIVE = 1400;
const rand = (a, b) => a + Math.random() * (b - a);

export function initTileField(root, opts = {}) {
  if (!root) return null;
  const faces = opts.faces || [];

  const layer = document.createElement('div');
  layer.className = 'tiles__layer';
  root.appendChild(layer);

  let tiles = [];
  let vw = 0;
  let vh = 0;
  let progress = 0;

  function build() {
    layer.innerHTML = '';
    tiles = [];
    vw = window.innerWidth;
    vh = window.innerHeight;

    const cardW = Math.min(vw * 0.31, 460);
    const cardH = Math.min(vh * 0.33, 330);

    /* Stratified placement, not fourteen independent random points.
       Independent samples clump — measured, they filled barely half the frame
       and left the right third empty, which reads as a mistake rather than as a
       scatter. Dealing one tile per cell of a coarse grid, jittering inside the
       cell, then shuffling which tile gets which cell, gives reliable coverage
       with no visible grid. */
    const COLS = 5;
    const cells = [];
    for (let c = 0; c < CARRIERS; c++) {
      cells.push([(c % COLS), Math.floor(c / COLS)]);
    }
    for (let c = cells.length - 1; c > 0; c--) {
      const k = Math.floor(Math.random() * (c + 1));
      [cells[c], cells[k]] = [cells[k], cells[c]];
    }
    const ROWS = Math.ceil(CARRIERS / COLS);

    for (let i = 0; i < CARRIERS; i++) {
      const el = document.createElement('div');
      el.className = 'tile';
      el.style.width = cardW + 'px';
      el.style.height = cardH + 'px';

      const back = document.createElement('div');
      back.className = 'tile__back';
      el.appendChild(back);

      const face = document.createElement('div');
      face.className = 'tile__face';
      if (faces[i]) face.style.backgroundImage = 'url(' + faces[i].img + ')';
      el.appendChild(face);

      const label = document.createElement('span');
      label.className = 'tile__label';
      label.textContent = faces[i] ? faces[i].label : '';
      el.appendChild(label);

      const edge = document.createElement('div');
      edge.className = 'tile__edge';
      el.appendChild(edge);

      const sheen = document.createElement('div');
      sheen.className = 'tile__sheen';
      el.appendChild(sheen);

      layer.appendChild(el);

      /* Where it floats. Spread across the frame AND through depth — a field
         that is only spread across the frame reads as a wall of thumbnails, and
         the depth is what makes it a space you could reach into. */
      const [gc, gr] = cells[i];
      const fx = 0.09 + ((gc + rand(0.15, 0.85)) / COLS) * 0.82;
      const fy = 0.11 + ((gr + rand(0.15, 0.85)) / ROWS) * 0.78;
      /* Depth spread widened. Everything at a similar distance reads as a wall
         of thumbnails however you rotate it; the range is what makes it a space
         with near and far things in it. */
      const fz = rand(-1900, -60);

      tiles.push({
        el, face, label, sheen,
        cardW, cardH,
        fx, fy, fz,
        /* Where it comes IN from: much further out, and offset, so each tile
           travels its own path rather than the whole set sliding in together. */
        sx: fx + rand(-0.5, 0.5),
        sy: fy + rand(-0.5, 0.5),
        sz: rand(-5200, -3000),
        /* A staggered entrance, but the stagger and the flight time have to add
           up to LESS than the time before the gather starts, or the last tiles
           are still arriving when the field begins to leave. At 0.42 stagger +
           0.34 flight the final tile landed at p=0.82 while the gather began at
           0.62 — measured, not one of the fourteen ever reached full opacity,
           and there was no float beat at all. 0.26 + 0.22 lands everything by
           0.52 and leaves a genuine pause. */
        delay: (i / CARRIERS) * 0.26,
        /* Every tile is turned differently, so no two present the same face to
           the camera. Wide enough to be obviously varied, short of the angle
           where a tile goes edge-on and disappears. */
        rot: { x: rand(-42, 42), y: rand(-52, 52), z: rand(-22, 22) },
        /* AND every tile is a different size and a different shape. Scaled
           rather than resized: changing width and height would relayout the
           label and the background on every frame, while a scale is composited.
           X and Y are independent, so the aspect varies too — uniform tiles at
           varied distances still read as one repeated object. Both converge on
           1 at the gather, because a ring with uneven spokes is not a ring. */
        mulX: rand(0.58, 1.32),
        mulY: rand(0.58, 1.32),
        ox: 0, oy: 0, vx: 0, vy: 0,
      });
    }
  }

  /** Ring pose, solved with the formula wheel.js uses so the landing IS the
   *  ring rather than an approximation of it. */
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

  const pointer = { x: -9999, y: -9999, on: false };
  root.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.on = true;
  }, { passive: true });
  root.addEventListener('pointerleave', () => { pointer.on = false; }, { passive: true });

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    paint(dt);
  }

  function paint(dt) {
    const p = progress;
    const gather = Math.min(1, Math.max(0, (p - 0.70) / 0.30));
    const gEase = ease(gather);

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const pose = ringPose(i, vw, vh);

      // Its own arrival window, so the field fills in rather than appearing.
      const arrive = Math.min(1, Math.max(0, (p - 0.04 - t.delay) / 0.22));
      const aEase = ease(arrive);
      const floating = aEase > 0.5 && gEase < 0.35;

      if (floating) {
        if (pointer.on) {
          const dx = (t.fx * vw + t.ox) - pointer.x;
          const dy = (t.fy * vh + t.oy) - pointer.y;
          const d2 = dx * dx + dy * dy;
          const R = 320;
          if (d2 < R * R && d2 > 1) {
            const d = Math.sqrt(d2);
            const push = (1 - d / R) * 3400 * dt;
            t.vx += (dx / d) * push;
            t.vy += (dy / d) * push;
          }
        }
        t.vx *= 0.955;
        t.vy *= 0.955;
        t.ox += t.vx * dt;
        t.oy += t.vy * dt;
        // Pulled home, so a shoved tile drifts back instead of being lost.
        t.ox -= t.ox * 0.45 * dt;
        t.oy -= t.oy * 0.45 * dt;
      } else {
        t.vx *= 0.85;
        t.vy *= 0.85;
        t.ox *= 0.85;
        t.oy *= 0.85;
      }

      // Far -> float.
      const nz = t.sz + (t.fz - t.sz) * aEase;

      /* Placement is corrected for depth.
         fx/fy are where the tile should appear ON SCREEN, but perspective drags
         anything behind the origin toward the vanishing point — a tile placed at
         x=130 with z=-1900 lands at x=470. Uncorrected, the field used only 37%
         of the frame width and looked clumped no matter how the positions were
         stratified. Scaling the offset from centre by (P + |z|) / P puts each
         tile where it was asked to be after projection, not before it. */
      const depth = (PERSPECTIVE - nz) / PERSPECTIVE;
      const wantX = (t.sx + (t.fx - t.sx) * aEase) * vw;
      const wantY = (t.sy + (t.fy - t.sy) * aEase) * vh;
      const nx = vw / 2 + (wantX - vw / 2) * depth - t.cardW / 2 + t.ox;
      const ny = vh / 2 + (wantY - vh / 2) * depth - t.cardH / 2 + t.oy;

      // Float -> ring.
      const lx = pose.cx - pose.cardW / 2;
      const ly = pose.cy - pose.cardH / 2;

      const x = nx + (lx - nx) * gEase;
      const y = ny + (ly - ny) * gEase;
      const z = nz * (1 - gEase);

      const rx = t.rot.x * (1 - gEase) + (pose.horizontal ? 0 : pose.a) * gEase;
      const ry = t.rot.y * (1 - gEase) + (pose.horizontal ? pose.a : 0) * gEase;
      const rz = t.rot.z * (1 - gEase);
      const ringZ = pose.radius * gEase;

      /* Pushed back by the ring radius before rotating, as wheel.js does —
         without it the front tile ends a radius nearer the camera than the
         perspective origin and is magnified. */
      t.el.style.transform =
        'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)'
        + ' translateZ(' + (-ringZ).toFixed(1) + 'px)'
        + ' rotateX(' + rx.toFixed(2) + 'deg)'
        + ' rotateY(' + ry.toFixed(2) + 'deg)'
        + ' rotateZ(' + rz.toFixed(2) + 'deg)'
        + ' translateZ(' + ringZ.toFixed(1) + 'px)'
        + ' scale(' + (t.mulX + (1 - t.mulX) * gEase).toFixed(3) + ','
                    + (t.mulY + (1 - t.mulY) * gEase).toFixed(3) + ')';

      t.el.style.opacity = aEase.toFixed(3);

      // The specular travels with the tile's attitude; a fixed gradient reads
      // as a printed stripe however bright it is.
      const sx = Math.sin((ry + rz) * Math.PI / 180);
      const sa = Math.cos((rx - rz) * Math.PI / 180);
      t.sheen.style.setProperty('--sx', (50 + sx * 42).toFixed(1) + '%');
      t.sheen.style.setProperty('--sa', (118 + sa * 46).toFixed(1) + 'deg');

      t.label.style.opacity = (gEase > 0.7 ? (gEase - 0.7) / 0.3 : 0).toFixed(2);
    }
  }

  function setProgress(v) { progress = Math.min(1, Math.max(0, v)); }

  window.addEventListener('resize', build, { passive: true });
  build();
  requestAnimationFrame(frame);

  return { setProgress, rebuild: build, get tiles() { return tiles; } };
}
