import * as THREE from 'three';
import { reducedMotion } from './scroll.js';

/**
 * The hero backdrop: a real, rotating, draggable Earth.
 *
 * Textures are NASA public domain — Blue Marble land/shallow topography for the
 * surface, VIIRS day-night band for city lights, and the Blue Marble cloud
 * composite for weather. The terminator is computed in the shader, so lights
 * only appear where the sun has actually set.
 *
 * The look is aimed at Google Earth rather than a textbook globe: clouds sit on
 * their own shell so they parallax against the surface, oceans take a specular
 * highlight, and the limb dissolves into a thick atmosphere instead of ending
 * at a hard silhouette.
 */

/* ============================================================
   TEXTURE TIERS
   ============================================================ */

/**
 * Roughly 100 degrees of longitude are on screen, so a W-wide equirectangular
 * map supplies about W * 0.28 usable pixels across the viewport: 4096 covers
 * ~1140px, 6144 covers ~1710px. Pick the first tier that clears the display.
 *
 * Only the surface map gets the top tier. Clouds and city lights are diffuse by
 * nature, and matching them tier-for-tier would triple VRAM for no visible gain.
 */
function tiers() {
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  const mem = navigator.deviceMemory; // undefined outside Chromium

  if (px < 760 || (mem !== undefined && mem < 4)) return { day: '', rest: '' };
  if (px >= 1500 && (mem === undefined || mem >= 8)) return { day: '-6k', rest: '-4k' };
  return { day: '-4k', rest: '-4k' };
}

const T = tiers();

const DAY = `/assets/img/earth-day${T.day}.webp`;
// The failed-climate surface, at the same tier the present-day one resolved to.
// Both are sampled in the same fragment at the same UV, so a mismatch in size
// shows up as one of them going soft halfway through the crossfade.
const FUTURE = `/assets/img/earth-future${T.day}.webp`;
const NIGHT = `/assets/img/earth-night${T.rest}.webp`;
const CLOUDS = `/assets/img/earth-clouds${T.rest}.webp`;

/* ============================================================
   WHERE IS THE VISITOR?
   ============================================================ */

/**
 * Longitude from the browser's UTC offset — 15 degrees per hour. No permission
 * prompt, no IP lookup, no network call: the visitor's own clock is enough to
 * put their part of the world in front of them.
 *
 * Accurate to roughly a time-zone width, and one hour out during DST. That is
 * far more precision than "show me my region" needs.
 */
function visitorLongitude() {
  try {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const lon = offsetMinutes / 4; // 60 min per 15 deg
    return Math.max(-180, Math.min(180, lon));
  } catch {
    return 45; // Arabian Peninsula — where the research is
  }
}

/** three.js maps u=0.25 to +Z, so 90W faces the camera at rotation 0. */
const lonToRotation = (lon) => THREE.MathUtils.degToRad(90 - (lon + 180));

/* ============================================================
   SHADERS
   ============================================================ */

const SURFACE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SURFACE_FRAG = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D futureMap;
  uniform sampler2D nightMap;
  uniform sampler2D cloudMap;
  uniform float decay;
  uniform vec3 sunDir;
  uniform vec3 atmoColor;
  uniform float cloudOffset;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 sun = normalize(sunDir);
    float ndl = dot(n, sun);

    // Wide terminator so the handover reads as dusk rather than a seam.
    float daylight = smoothstep(-0.22, 0.30, ndl);

    // THE CROSSFADE, and it is deliberately the only place it happens.
    // Everything downstream — the water mask, the lit term, the specular — is
    // derived from 'day', so blending here propagates correctly to all of them.
    // A second blend further down would double-apply it; blending at only some
    // of several sampling sites would tear. One site, one mix.
    //
    // The emergent behaviour is the good part: the water mask is derived from
    // the surface colour, so as the oceans go to dust the sun glint retreats on
    // its own. Nothing had to be written to make the seas stop shining.
    vec3 day = mix(texture2D(dayMap, vUv).rgb, texture2D(futureMap, vUv).rgb, decay);
    vec3 night = texture2D(nightMap, vUv).rgb;

    // Oceans are the blue-dominant, dark pixels of the Blue Marble map. Deriving
    // the water mask from the surface texture avoids shipping a separate one.
    float water = smoothstep(0.02, 0.16, day.b - day.r) * (1.0 - smoothstep(0.25, 0.5, day.g));

    // Blinn-Phong highlight, water only — the sun glint Google Earth shows.
    vec3 halfVec = normalize(sun + viewDir);
    float spec = pow(max(dot(n, halfVec), 0.0), 78.0) * water * 1.5;

    // Ambient is deliberately generous — this is a backdrop, not a physics demo,
    // and a hard falloff to black leaves most of the visible cap unreadable.
    vec3 lit = day * (0.30 + 1.15 * max(ndl, 0.0));
    lit += vec3(0.55, 0.72, 0.95) * spec * max(ndl, 0.0);

    // Night side: pulled down hard and warmed. The raw VIIRS composite is far
    // too bright to sit behind display type.
    // Dimmed but never extinguished as it decays: the planet stays inhabited,
    // which is what makes it read as a future rather than as a dead rock.
    vec3 lights = pow(night, vec3(1.9)) * vec3(1.3, 0.92, 0.55) * 1.35 * (1.0 - 0.45 * decay);

    vec3 col = mix(lights, lit, daylight);

    // --- clouds -------------------------------------------------
    // Drifting slightly faster than the surface, which is what sells them as
    // weather rather than as painted-on texture.
    float cloud = texture2D(cloudMap, vec2(vUv.x + cloudOffset, vUv.y)).r;
    cloud = smoothstep(0.16, 0.82, cloud);
    vec3 cloudLit = vec3(1.0) * (0.10 + 0.95 * max(ndl, 0.0));
    // Weather stops with the decay. The cloud composite is present-day Earth's
    // water cycle, and leaving it running over a burnt surface was the one
    // thing still arguing the planet was fine — white cumulus over dead ground
    // reads as a colour-grade, not as a consequence. Fading it out is also what
    // finally exposes the surface: the failed map's detail was half-hidden
    // under weather that belonged to the other world.
    float weather = 1.0 - decay;
    col = mix(col, cloudLit, cloud * 0.82 * mix(0.35, 1.0, daylight) * weather);

    // --- atmosphere ---------------------------------------------
    // Thick forward-scattering haze toward the limb. This is what removes the
    // hard horizon: the surface never reaches the silhouette at full contrast.
    float rim = 1.0 - max(dot(n, viewDir), 0.0);
    float haze = pow(rim, 2.2);
    // The mix is kept moderate so the surface still reads through the haze; the
    // brightness comes from the additive term concentrated hard at the limb.
    float sunAmount = smoothstep(-0.55, 0.75, ndl);
    col = mix(col, atmoColor, haze * 0.5 * sunAmount);
    col += atmoColor * pow(rim, 4.2) * 0.34 * sunAmount;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const GLOW_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Outer shell, rendered back-face, additively blended.
 *
 * The naive `pow(rim, n)` falloff peaks at the SHELL's own silhouette, which
 * draws a second bright arc out in space above the planet — a double horizon.
 * For a shell of radius R the planet's edge projects to rim = 1 - sqrt(1 - 1/R^2),
 * so the glow is built as a band that peaks there and dies before the shell
 * edge, leaving one horizon.
 */
const GLOW_FRAG = /* glsl */ `
  uniform vec3 glowColor;
  uniform vec3 sunDir;
  uniform float peak;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = 1.0 - abs(dot(n, viewDir));

    float rise = smoothstep(peak * 0.35, peak, rim);
    float fall = 1.0 - smoothstep(peak, peak + (1.0 - peak) * 0.82, rim);
    float band = rise * fall * 0.74;

    // Brightest where the sun grazes the limb, gone on the night side.
    float sunAmount = smoothstep(-0.42, 0.55, dot(n, normalize(sunDir)));
    gl_FragColor = vec4(glowColor * band * sunAmount, band * sunAmount);
  }
`;

/* ============================================================
   INIT
   ============================================================ */

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
};

/**
 * @param {object} [opts]
 * @param {string} [opts.canvas]  id of the <canvas> to draw into
 * @param {string} [opts.host]    id of the element that owns pointer drag and
 *                                the visibility test — usually the section
 * @param {object} [opts.textures] {day, night, clouds} URLs, defaulting to the
 *                                 present-day set chosen by `tiers()`
 *
 * Parameterised so the same globe can be built twice. The second instance is
 * the same planet under a failed-climate surface map: one texture swap, no
 * duplicated shader, lighting or interaction code. If the two ever diverge in
 * how they rotate or how they are lit, the comparison stops being a comparison.
 */
export function initEarth(opts = {}) {
  const canvas = document.getElementById(opts.canvas || 'heroGlobe');
  const hero = document.getElementById(opts.host || 'hero');
  if (!canvas || !hero || !hasWebGL()) return null;

  const TEX = { day: DAY, future: FUTURE, night: NIGHT, clouds: CLOUDS, ...(opts.textures || {}) };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0, 3.1);

  // The globe hangs above the frame so its lower limb arcs across the top and
  // the copy below sits on open space. Aiming the visible disc near the equator
  // is what keeps land — not ocean — in front of the viewer.
  // TWO groups, not one. `rig` owns framing (position/scale) and the axial
  // tilt; `spinner` owns the rotation. They were the same object, which put
  // rotation.z (the 23.4-degree tilt) and rotation.y (the spin) into a single
  // XYZ Euler — so the tilt was applied first and then swung about world Y, and
  // the pole traced a cone once per revolution instead of holding still.
  //
  // The current crop hides it: the pole is off-screen. Framing the whole sphere
  // puts it dead centre, where a wobbling axis is the first thing you notice.
  const rig = new THREE.Group();
  const spinner = new THREE.Group();
  rig.add(spinner);
  scene.add(rig);

  // Lifted well above the equator: only the sphere's top cap is in frame, so a
  // low sun leaves the whole visible band near the terminator and reads as dim.
  const sunDir = new THREE.Vector3(0.52, 0.72, 0.58).normalize();
  // Pure white rather than sky blue — a saturated blue rim reads as a drawn
  // outline, white reads as light.
  const atmoColor = new THREE.Color('#ffffff');

  const surfaceUniforms = {
    dayMap: { value: null },
    futureMap: { value: null },
    decay: { value: 0 },
    nightMap: { value: null },
    cloudMap: { value: null },
    sunDir: { value: sunDir },
    atmoColor: { value: atmoColor },
    cloudOffset: { value: 0 },
  };

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 128),
    new THREE.ShaderMaterial({
      uniforms: surfaceUniforms,
      vertexShader: SURFACE_VERT,
      fragmentShader: SURFACE_FRAG,
    })
  );
  spinner.add(globe);

  // Shell radius sets the halo thickness: it extends from the surface at 1.0
  // out to this, so 1.035 reaches half as far as 1.07 did. The `peak` uniform
  // below is derived from it, so the band re-centres on the planet's edge
  // automatically rather than drifting and reintroducing a second horizon.
  const GLOW_R = 1.035;
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(GLOW_R, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: atmoColor },
        sunDir: { value: sunDir },
        // Where the planet's silhouette lands on this shell, in rim units.
        peak: { value: 1 - Math.sqrt(1 - 1 / (GLOW_R * GLOW_R)) },
      },
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  spinner.add(glow);

  // Starfield — deterministic so every load is identical.
  const starCount = 1100;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const a = i * 2.39996;
    const r = 16 + ((i * 37) % 13);
    const y = 1 - (i / starCount) * 2;
    const rad = Math.sqrt(Math.max(0, 1 - y * y));
    starPos[i * 3] = Math.cos(a) * rad * r;
    starPos[i * 3 + 1] = y * r;
    starPos[i * 3 + 2] = Math.sin(a) * rad * r - 8;
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPos, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.5 })
  );
  scene.add(stars);

  /* ---- orientation ------------------------------------------ */

  // Only the top cap of the sphere is in frame, and that cap is high northern
  // latitude — ice and open ocean. Leaning the north pole away from the camera
  // swings the land-heavy mid-latitudes up into the visible band.
  const BASE_TILT_X = -0.62;

  // How much of the frame the fully pulled-back sphere is allowed to fill.
  // 1.0 would have the limb touch both edges exactly; this leaves the planet
  // visibly surrounded by space, which is what makes it read as pulled back
  // rather than merely smaller.
  const FIT_MARGIN = 0.82;

  // Where the idle settle eases back to, and the centre of the drag clamp.
  // A variable rather than the constant, because the comfortable tilt for a
  // cropped close-up is not the comfortable tilt for a full sphere.
  let tiltTarget = BASE_TILT_X;

  const spin = { y: lonToRotation(visitorLongitude()), x: BASE_TILT_X };
  // idle starts high so the globe is already turning at full speed the moment it
  // appears. Starting at 0 makes it sit still for a beat and then creep up,
  // which reads as a stutter rather than as a planet.
  const drag = { active: false, vx: 0, vy: 0, lastX: 0, lastY: 0, idle: 99 };

  rig.rotation.z = THREE.MathUtils.degToRad(-23.4); // axial tilt — on the PARENT, so it does not precess

  /* ---- framing ------------------------------------------------
     `zoom` runs 0..1: 0 is the cropped hero close-up, 1 is the whole sphere
     centred in frame. Everything about the framing is derived from it, and
     NOTHING writes rig.position or rig.scale except applyFraming().

     That rule exists because the previous layout() set the framing constants
     unconditionally on every resize. Any scroll-driven value written straight
     to the rig was destroyed the next time the window changed size — including
     a phone URL bar collapsing mid-scroll, which would have snapped the globe
     from full-sphere back to close-up in the middle of the transition. Keeping
     `zoom` as the single source of truth and re-deriving from it makes resize
     and scroll independent instead of adversarial. */

  let zoom = 0;
  let ready = false;          // textures in, safe to render
  let pendingFrame = false;   // coalesces on-demand renders under reduced motion

  const lerp = (a, b, t) => a + (b - a) * t;

  function applyFraming() {
    const w = canvas.clientWidth || hero.clientWidth;
    const narrow = w < 760;

    // FROM: the close-up. Negative Y drops the sphere below the frame centre so
    // its upper limb arcs across the viewport with open space above it. Phones
    // are tall and narrow, so the same offset drops the limb further down —
    // hence a separate pair.
    const fromScale = narrow ? 1.58 : 1.74;
    const fromY = narrow ? -1.28 : -1.45;
    const fromX = narrow ? 0 : 0.1;

    // TO: the whole sphere, in frame. DERIVED from the viewport rather than
    // hardcoded per breakpoint, because which edge the sphere hits first
    // changes with the aspect ratio:
    //
    //   visible half-height at the sphere plane = tan(fov/2) * cameraZ
    //                                           = tan(18deg) * 3.1 = 1.007
    //   visible half-width                      = half-height * aspect
    //
    // On desktop (aspect ~1.06) height binds. On a 375x812 phone the aspect is
    // 0.46, so half-width is only 0.465 — and the old hardcoded 0.66 was a
    // radius HALF AGAIN larger than the frame could hold, which is why the
    // planet ran off both sides instead of pulling back. Taking the smaller of
    // the two makes it correct at every width, including the ones between the
    // breakpoints that a two-value guess never covers.
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const toScale = halfH * Math.min(1, camera.aspect) * FIT_MARGIN;

    // On a tall frame the copy occupies the bottom third, so centring the
    // sphere would bury the headline in it. Lift it into the space above.
    const toY = narrow ? 0.30 : 0;

    rig.position.set(lerp(fromX, 0, zoom), lerp(fromY, toY, zoom), 0);
    rig.scale.setScalar(lerp(fromScale, toScale, zoom));

    // The axial tilt is framed for a view where the pole was off-screen. Ease
    // it toward upright as the whole sphere comes into frame, or the planet
    // arrives lying on its side.
    tiltTarget = lerp(BASE_TILT_X, -0.18, zoom);
  }

  function layout() {
    // Sized from the CANVAS's own box, not the host's. The host is now a tall
    // scroll container and the canvas is a viewport-height sticky child inside
    // it — measuring the host would make camera.aspect wrong by the whole
    // container/viewport ratio and blow the framebuffer up by the same factor.
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyFraming();
  }

  /* ---- drag to rotate ---------------------------------------- */

  function bindDrag() {
    // Bound to the hero, not the canvas. The headline, description and stats all
    // stack on top of the canvas, so a canvas-only listener would only catch
    // drags that start in the thin strip above the copy.
    hero.classList.add('is-draggable');

    // Preventing pointerdown is not enough: the browser still fires the
    // compatibility mousedown, which starts a selection as soon as the pointer
    // sweeps over the headline. Cancelling selectstart is what actually stops it.
    document.addEventListener('selectstart', (e) => {
      if (drag.active) e.preventDefault();
    });

    const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"]';

    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // Let clicks on links and buttons behave like clicks.
      if (e.target.closest?.(INTERACTIVE)) return;

      e.preventDefault();
      window.getSelection?.()?.removeAllRanges();
      document.body.classList.add('is-grabbing');
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.vx = drag.vy = 0;
      hero.setPointerCapture?.(e.pointerId);
    };

    const move = (e) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      // Scaled by apparent size. A fixed radians-per-pixel rate means the
      // zoomed-out globe — roughly half the on-screen radius — spins twice as
      // fast per pixel dragged, which feels slippery exactly where the reader is
      // meant to be able to turn it deliberately.
      const grip = rig.scale.x / 1.74;
      drag.vx = dx * 0.0045 * grip;
      drag.vy = dy * 0.0035 * grip;
      spin.y += drag.vx;
      // Clamped so it can never tip past the poles into an upside-down globe.
      spin.x = Math.max(tiltTarget - 0.75, Math.min(tiltTarget + 0.6, spin.x + drag.vy));
      drag.idle = 0;
    };

    const up = (e) => {
      if (!drag.active) return;
      drag.active = false;
      document.body.classList.remove('is-grabbing');
      hero.releasePointerCapture?.(e.pointerId);
    };

    hero.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /* ---- go ---------------------------------------------------- */

  /* ---- the handle the page drives it by ----------------------
     initEarth returns this. Scroll code sets `zoom` and `decay` and knows
     nothing about three.js; this module owns every rendering decision. Values
     are clamped here rather than trusted, because a scrub can overshoot past
     0 and 1 during a fling and an unclamped decay would sample the crossfade
     outside its range. */
  function requestFrame() {
    // Only needed when no rAF loop is running (reduced motion). Coalesced so a
    // burst of scroll events costs one render, not one per event.
    if (!ready || pendingFrame || !reducedMotion) return;
    pendingFrame = true;
    requestAnimationFrame(() => {
      pendingFrame = false;
      spinner.rotation.y = spin.y;
      spinner.rotation.x = spin.x;
      renderer.render(scene, camera);
    });
  }

  const api = {
    /** 0 = cropped hero close-up, 1 = whole sphere centred. */
    setZoom(p) {
      const v = Math.min(1, Math.max(0, p));
      if (v === zoom) return;
      zoom = v;
      applyFraming();
      requestFrame();
    },
    /** 0 = present-day Earth, 1 = the failed one. */
    setDecay(p) {
      const v = Math.min(1, Math.max(0, p));
      if (v === surfaceUniforms.decay.value) return;
      surfaceUniforms.decay.value = v;
      requestFrame();
    },
    get isReady() { return ready; },
  };

  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  Promise.all([load(TEX.day), load(TEX.future), load(TEX.night), load(TEX.clouds)])
    .then(([day, future, night, clouds]) => {
      for (const t of [day, future, night, clouds]) {
        t.colorSpace = THREE.SRGBColorSpace;
        // Most of the visible disc is viewed at a grazing angle — exactly the
        // case trilinear filtering blurs and anisotropic filtering rescues.
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
      }
      // Clouds scroll in U, so they have to wrap rather than clamp.
      clouds.wrapS = THREE.RepeatWrapping;

      surfaceUniforms.dayMap.value = day;
      surfaceUniforms.futureMap.value = future;
      surfaceUniforms.nightMap.value = night;
      surfaceUniforms.cloudMap.value = clouds;

      layout();
      window.addEventListener('resize', layout, { passive: true });
      canvas.classList.add('is-ready');

      ready = true;
      renderer.render(scene, camera);

      /* REDUCED MOTION.
         The old branch returned here after one frame — no drag, no loop, and
         (once this became a scroll-driven transition) no way to ever reach the
         second Earth. That is content removal wearing a motion preference's
         clothes, and the house rule is the opposite: less motion, not less
         content.

         So: no idle spin, no cloud drift, no starfield rotation — nothing moves
         on its own. But scroll and drag are things the reader is DOING, not
         animation happening at them, so both stay live and each schedules a
         single frame. The whole transition is still reachable; it just never
         moves unless a hand moves it. */
      if (reducedMotion) {
        bindDrag();
        return;
      }

      bindDrag();

      let visible = true;
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(hero);

      const clock = new THREE.Clock();
      (function loop() {
        requestAnimationFrame(loop);
        if (!visible) return;
        const dt = Math.min(clock.getDelta(), 0.05);

        if (drag.active) {
          drag.idle = 0;
        } else {
          // Fling carries on and decays, then the idle spin eases back in.
          drag.vx *= 0.94;
          drag.vy *= 0.94;
          spin.y += drag.vx;
          spin.x = Math.max(tiltTarget - 0.75, Math.min(tiltTarget + 0.6, spin.x + drag.vy));

          drag.idle += dt;
          const resume = Math.min(1, Math.max(0, (drag.idle - 1.2) / 2.5));
          spin.y += dt * 0.022 * resume;                        // ~4.7 min per revolution
          spin.x += (tiltTarget - spin.x) * dt * 0.4 * resume; // settle back to the framing tilt
        }

        spinner.rotation.y = spin.y;
        spinner.rotation.x = spin.x;
        surfaceUniforms.cloudOffset.value -= dt * 0.0016; // weather outruns the ground
        stars.rotation.y += dt * 0.003;

        renderer.render(scene, camera);
      })();
    })
    .catch(() => {
      // Textures unavailable — leave the CSS starfield placeholder in place.
      canvas.remove();
    });

  return api;
}
