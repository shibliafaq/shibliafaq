import * as THREE from 'three';
import { reducedMotion, stopScroll, startScroll } from './scroll.js';

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

/* Where the visitor actually is, to city precision, from the IANA time-zone
   name the browser already exposes.

   `Intl.DateTimeFormat().resolvedOptions().timeZone` returns "Asia/Riyadh",
   "Europe/London" and so on. It costs no permission prompt, no IP lookup and no
   network call — the same standard the longitude guess above was held to, which
   is why this is used rather than the Geolocation API. The trade is precision:
   a zone is a city-sized answer, not a street-sized one, which is all "fly me
   home" needs.

   Not exhaustive by design. Missing zones fall through to a continent default
   paired with the offset-derived longitude, which still lands on the right part
   of the right landmass. */
const ZONE_LATLON = {
  'Asia/Riyadh': [24.71, 46.68], 'Asia/Dubai': [25.20, 55.27], 'Asia/Qatar': [25.29, 51.53],
  'Asia/Kuwait': [29.38, 47.99], 'Asia/Bahrain': [26.23, 50.59], 'Asia/Muscat': [23.59, 58.41],
  'Asia/Karachi': [24.86, 67.01], 'Asia/Kolkata': [22.57, 88.36], 'Asia/Calcutta': [22.57, 88.36],
  'Asia/Dhaka': [23.81, 90.41], 'Asia/Kathmandu': [27.72, 85.32], 'Asia/Colombo': [6.93, 79.86],
  'Asia/Tehran': [35.69, 51.39], 'Asia/Baghdad': [33.32, 44.36], 'Asia/Jerusalem': [31.77, 35.21],
  'Asia/Amman': [31.95, 35.93], 'Asia/Beirut': [33.89, 35.50], 'Asia/Damascus': [33.51, 36.29],
  'Asia/Istanbul': [41.01, 28.98], 'Europe/Istanbul': [41.01, 28.98],
  'Asia/Bangkok': [13.76, 100.50], 'Asia/Singapore': [1.35, 103.82], 'Asia/Jakarta': [-6.21, 106.85],
  'Asia/Manila': [14.60, 120.98], 'Asia/Kuala_Lumpur': [3.14, 101.69], 'Asia/Ho_Chi_Minh': [10.82, 106.63],
  'Asia/Shanghai': [31.23, 121.47], 'Asia/Hong_Kong': [22.32, 114.17], 'Asia/Taipei': [25.03, 121.57],
  'Asia/Tokyo': [35.68, 139.69], 'Asia/Seoul': [37.57, 126.98], 'Asia/Tashkent': [41.30, 69.24],
  'Europe/London': [51.51, -0.13], 'Europe/Dublin': [53.35, -6.26], 'Europe/Lisbon': [38.72, -9.14],
  'Europe/Madrid': [40.42, -3.70], 'Europe/Paris': [48.86, 2.35], 'Europe/Brussels': [50.85, 4.35],
  'Europe/Amsterdam': [52.37, 4.90], 'Europe/Berlin': [52.52, 13.40], 'Europe/Zurich': [47.38, 8.54],
  'Europe/Vienna': [48.21, 16.37], 'Europe/Prague': [50.08, 14.44], 'Europe/Warsaw': [52.23, 21.01],
  'Europe/Rome': [41.90, 12.50], 'Europe/Athens': [37.98, 23.73], 'Europe/Stockholm': [59.33, 18.07],
  'Europe/Oslo': [59.91, 10.75], 'Europe/Copenhagen': [55.68, 12.57], 'Europe/Helsinki': [60.17, 24.94],
  'Europe/Moscow': [55.76, 37.62], 'Europe/Kyiv': [50.45, 30.52], 'Europe/Kiev': [50.45, 30.52],
  'Africa/Cairo': [30.04, 31.24], 'Africa/Lagos': [6.52, 3.38], 'Africa/Nairobi': [-1.29, 36.82],
  'Africa/Johannesburg': [-26.20, 28.05], 'Africa/Casablanca': [33.57, -7.59], 'Africa/Algiers': [36.75, 3.06],
  'Africa/Tunis': [36.81, 10.18], 'Africa/Accra': [5.60, -0.19], 'Africa/Addis_Ababa': [9.02, 38.75],
  'America/New_York': [40.71, -74.01], 'America/Toronto': [43.65, -79.38], 'America/Chicago': [41.88, -87.63],
  'America/Denver': [39.74, -104.99], 'America/Phoenix': [33.45, -112.07], 'America/Los_Angeles': [34.05, -118.24],
  'America/Vancouver': [49.28, -123.12], 'America/Mexico_City': [19.43, -99.13], 'America/Bogota': [4.71, -74.07],
  'America/Lima': [-12.05, -77.04], 'America/Santiago': [-33.45, -70.67], 'America/Sao_Paulo': [-23.55, -46.63],
  'America/Argentina/Buenos_Aires': [-34.60, -58.38],
  'Australia/Sydney': [-33.87, 151.21], 'Australia/Melbourne': [-37.81, 144.96],
  'Australia/Brisbane': [-27.47, 153.03], 'Australia/Perth': [-31.95, 115.86],
  'Australia/Adelaide': [-34.93, 138.60], 'Pacific/Auckland': [-36.85, 174.76],
};

// Fallback latitudes by region prefix — paired with the offset-derived
// longitude, this still lands on the right part of the right landmass.
const REGION_LAT = {
  Africa: 5, America: 35, Antarctica: -75, Asia: 30, Atlantic: 38,
  Australia: -30, Europe: 50, Indian: -10, Pacific: -15,
};

/**
 * @returns {{lat:number, lon:number, zone:string|null}}
 */
function visitorLatLon() {
  let zone = null;
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch {}

  if (zone && ZONE_LATLON[zone]) {
    const [lat, lon] = ZONE_LATLON[zone];
    return { lat, lon, zone };
  }
  const lon = visitorLongitude();
  const region = zone ? zone.split('/')[0] : null;
  const lat = (region && REGION_LAT[region] !== undefined) ? REGION_LAT[region] : 25;
  return { lat, lon, zone };
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
  const grabEl = document.getElementById(opts.grab || 'worldsGrab');
  const hero = document.getElementById(opts.host || 'hero');
  if (!canvas || !hero || !hasWebGL()) return null;

  const TEX = { day: DAY, future: FUTURE, night: NIGHT, clouds: CLOUDS, ...(opts.textures || {}) };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  /* Near plane at 0.01, not the usual 0.1.
     The dive ends with the surface about 0.03 world units from the camera, so a
     0.1 near plane would clip the ground away and punch a hole through the
     middle of the frame at exactly the moment the thermal plate takes over.
     Nothing else in this scene is anywhere near the camera, and it holds only a
     sphere, a glow shell with depthWrite off, and a starfield — so the depth
     precision this costs has nothing to fight over. */
  const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100);
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

  /* WHERE THE DIVE LANDS — the visitor's own city, not a fixed point.

     Resolved from the IANA time zone the browser already reports, so it costs
     no permission prompt and no network call. A reader in Lagos flies down to
     Lagos; the planet stops being an illustration and becomes the one they are
     standing on, which is the whole argument the section is making.

     Falls back to Riyadh when the zone is unrecognised — the research region,
     and the city the thermal plates below actually show. */
  const HOME = visitorLatLon();
  const DIVE_LON = Number.isFinite(HOME.lon) ? HOME.lon : 46.6753;
  const DIVE_LAT = Number.isFinite(HOME.lat) ? HOME.lat : 24.7136;
  /* How far in the dive goes — and it is HARD-CAPPED by the camera.

     The sphere is centred at z = 0 and the camera sits at z = 3.1, so its near
     surface reaches the camera at scale 3.1 exactly. The first attempt used 9:
     by 70% of the descent the scale was already 3.73, the camera was INSIDE the
     planet, and since the surface renders front faces only the screen went
     black. It read as the globe disappearing; it was the globe swallowing the
     camera.

     0.84 of the camera distance keeps the surface ~0.5 units in front of it.
     At that range the visible patch spans about a third of a world unit across
     a sphere of radius 2.6, so the horizon is gone and the surface is flat —
     which is the condition for handing over to a flat map without a cut. */
  const DIVE_SCALE = 2.75;  // must stay below camera.position.z (3.1)

  /* THE LENS OPENS ON THE WAY DOWN — this is what makes it a descent.

     Scaling the sphere at a fixed field of view is geometrically identical to
     dollying the camera, so the first version was not wrong; it just looked
     wrong. 36 degrees is a telephoto lens. Telephoto flattens depth, so the
     planet grew without the reader ever feeling they moved — magnification,
     not travel.

     Widening to 74 while the surface keeps closing is the dolly-zoom: the
     subject holds roughly its size in frame while the perspective behind it
     stretches, and that mismatch is precisely the sensation of being pulled
     into a scene. It also matches what actually happens to a human descending
     — peripheral vision fills with ground. */
  const FOV_HIGH = 36;      // orbit: the framing the whole hero was tuned at
  const FOV_LOW = 74;       // low over the city, everything in peripheral view

  /* The descent is driven by the planet's ANGULAR radius, not by rig.scale.

     Driving scale directly looked right on paper and was wrong on screen: as
     the lens opened, the frame grew faster than the sphere did, so between
     roughly 25% and 50% of the dive the planet visibly SHRANK before rushing
     in. Fill ratio ran 0.86 -> 0.74 -> ... — a pull-back in the middle of a
     descent.

     Stating the angular radius makes the thing the reader actually perceives
     the controlled variable, and the scale is solved back out of it:
         angular radius = asin(R / d)   =>   R = d * sin(angle)
     Now every frame is guaranteed to show more planet than the last, whatever
     the lens is doing. */
  const ANG_HIGH = 15.5;    // degrees — the pulled-back globe with space around it
  /* 82, not 65. At 65 the descent stopped with the whole Arabian Peninsula
     still in frame and then cut straight to city blocks — two scales with
     nothing between them, so the reader never connects the map to the planet.
     At 82 the horizon is gone and the surface is rushing, which is the state
     the flat plate can take over from without a visible seam.

     sin(82) = 0.990, so the sphere still stops short of the camera. */
  const ANG_LOW = 82;

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
  const drag = { active: false, vx: 0, vy: 0, lastX: 0, lastY: 0, idle: 99,
                 // touch axis lock: undecided / rejected-as-scroll / Lenis paused
                 pending: false, declined: false, heldScroll: false,
                 startX: 0, startY: 0 };

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
  /* THE DIVE — 0 is the pulled-back globe, 1 is nose-down over Riyadh at the
     moment the flat thermal plate takes over. Kept separate from `zoom` because
     they are different journeys: `zoom` pulls AWAY from the reader, this drives
     straight back in at one point on the surface. */
  let dive = 0;
  let diveFrom = null;   // spin captured when the dive starts, so it eases from
                         // wherever the idle rotation and the reader left it
  // rig.scale at the close-up framing, per breakpoint. Drag sensitivity is
  // measured against this so it reads the same on a phone as on a desktop.
  let baseScale = 1.74;
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
    baseScale = fromScale;   // the drag reference for THIS breakpoint
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

    /* On a tall frame the copy occupies the lower half, so the sphere is lifted
       out of it. 0.45, not the 0.30 it started at: at 0.30 the planet spanned
       roughly y 127-443 of an 812px viewport while the headline began near 250,
       so the two lines of display type sat straight across the planet's middle.
       0.45 moves it up about 60px and puts the text under the disc rather than
       through it. Desktop is wide enough that the copy clears the sphere on its
       own, so it stays centred. */
    const toY = narrow ? 0.45 : 0;

    /* The dive rides ON TOP of the pulled-back framing rather than replacing
       it, so the two never fight: `zoom` decides where the globe sits, `dive`
       then drives the camera into it from there. Easing is cubic-in — slow to
       leave, fast at the end — because a dive that decelerates into the surface
       reads as a lift rather than a descent. */
    const d = dive * dive * dive;
    rig.position.set(lerp(fromX, 0, zoom) * (1 - d), lerp(fromY, toY, zoom) * (1 - d), 0);
    if (dive <= 0) {
      rig.scale.setScalar(lerp(fromScale, toScale, zoom));
    } else {
      // Solve the scale from the angular size we want to show.
      const ang = THREE.MathUtils.degToRad(lerp(ANG_HIGH, ANG_LOW, dive * dive));
      // sin() can never reach 1 here, so R stays below the camera distance and
      // the sphere can never swallow the camera — the failure that turned the
      // screen black when this was a raw scale lerp.
      const want = camera.position.z * Math.sin(ang);
      rig.scale.setScalar(Math.max(lerp(fromScale, toScale, zoom), want));
    }

    // The axial tilt is a fact about the planet seen from outside. Diving to a
    // point on the surface, it just reads as a crooked horizon, so it is taken
    // out on the way down.
    rig.rotation.z = THREE.MathUtils.degToRad(-23.4) * (1 - dive);

    /* The lens opens on a gentler curve than the descent so it leads slightly:
       the view starts widening before the ground is obviously rushing, which is
       the order that reads as committing to a dive rather than reacting to one. */
    // Exponent > 1 so the lens opens LATE. At 0.7 it opened faster than the
    // ground closed, which is what produced the shrink described above.
    const fovT = Math.pow(dive, 1.6);
    const wantFov = lerp(FOV_HIGH, FOV_LOW, fovT);
    if (Math.abs(camera.fov - wantFov) > 0.01) {
      camera.fov = wantFov;
      camera.updateProjectionMatrix();
    }

    /* Entering the atmosphere. The starfield is what tells the reader they are
       in space; leaving it lit while the ground fills the frame is the single
       loudest cue that nothing has actually moved. The limb glow goes with it —
       from below it is overhead, not a halo on the horizon. */
    if (stars?.material) {
      stars.material.opacity = 0.5 * (1 - Math.min(1, dive * 1.4));
    }
    if (glow?.material) {
      glow.material.opacity = 1 - Math.min(1, dive * 1.25);
      glow.visible = dive < 0.8;
    }

    // The axial tilt is framed for a view where the pole was off-screen. Ease
    // it toward upright as the whole sphere comes into frame, or the planet
    // arrives lying on its side.
    tiltTarget = lerp(BASE_TILT_X, -0.18, zoom);
    syncGrab();
  }

  /* Where the sphere's silhouette actually lands on screen, in CSS pixels.

     Not the naive `scale * pxPerWorld`: under perspective the silhouette of a
     sphere of radius R at distance d subtends asin(R/d), which projects to
     f * tan(asin(R/d)) — noticeably larger than R projected at the centre
     plane. At the hero close-up that is 950px against a naive 786px, and a hit
     test built on the naive figure would refuse grabs over the outer fifth of
     the visible planet. */
  function projectedDisc() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    const f = (h / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // px
    const d = camera.position.z;                    // sphere centre sits at z = 0
    const rPx = f * Math.tan(Math.asin(Math.min(0.999, rig.scale.x / d)));
    const pxPerWorld = f / d;
    return {
      cx: w / 2 + rig.position.x * pxPerWorld,
      cy: h / 2 - rig.position.y * pxPerWorld,      // screen Y runs the other way
      rPx, w, h,
    };
  }

  /* The grab target only switches on once the planet is a DISCRETE object with
     room to scroll past it. At the hero close-up the disc is wider than the
     viewport, so making it swallow touches there would leave the first screen
     of the site unscrollable on a phone — the globe is a backdrop at that
     point, not a control. */
  function syncGrab() {
    if (!grabEl) return;
    const disc = projectedDisc();
    if (!disc) return;
    const discrete = disc.rPx * 2 < disc.h * 0.78;
    if (!discrete) { grabEl.style.pointerEvents = 'none'; return; }
    const r = disc.rPx;
    grabEl.style.pointerEvents = 'auto';
    grabEl.style.left = `${disc.cx - r}px`;
    grabEl.style.top = `${disc.cy - r}px`;
    grabEl.style.width = `${r * 2}px`;
    grabEl.style.height = `${r * 2}px`;
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

    /* AXIS LOCK — touch only.
       On a phone one finger has to serve two jobs: scrolling the page and
       turning the globe. Lenis runs with syncTouch, so it reads the same
       touchmove stream this handler does, and claiming every gesture meant a
       diagonal swipe scrolled AND rotated at once — the page slid away under
       the reader while the planet spun.

       So a touch gesture starts undecided. Nothing is claimed, nothing is
       prevented, no pointer capture is taken, until the finger has moved far
       enough to say what it is. Then it locks for the rest of the gesture —
       switching axis mid-swipe feels far worse than picking wrong.

       Biased toward scrolling: rotation has to beat vertical by 15% to win.
       Scrolling is how the page is read; turning the globe is a bonus, and a
       page that resists scrolling is broken in a way a stiff globe is not.

       A mouse needs none of this. The wheel scrolls and the button drags, so
       there is nothing to disambiguate — it claims immediately, as before. */
    const AXIS_LOCK_PX = 10;   // travel before the gesture is judged
    const H_BIAS = 1.15;       // how much horizontal must beat vertical by

    const releaseScroll = () => {
      if (drag.heldScroll) { startScroll(); drag.heldScroll = false; }
    };

    const claim = (e) => {
      drag.active = true;
      drag.pending = false;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      document.body.classList.add('is-grabbing');
      hero.setPointerCapture?.(e.pointerId);
    };

    const down = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      // Let clicks on links and buttons behave like clicks.
      if (e.target.closest?.(INTERACTIVE)) return;

      drag.vx = drag.vy = 0;
      drag.startX = drag.lastX = e.clientX;
      drag.startY = drag.lastY = e.clientY;
      drag.declined = false;

      if (e.pointerType === 'touch') {
        /* Landed on the planet itself? Then it is a rotation and nothing else —
           no axis guessing, no scrolling, however the finger then moves. This
           is the trackball rule: touch the ball, you turn the ball.

           `worldsGrab` is only hit-testable while the disc is discrete, so this
           branch cannot fire over the full-bleed hero backdrop and strand the
           reader on an unscrollable first screen. And because that element
           carries `touch-action: none`, the browser has already decided not to
           pan for this gesture before we get here — which is the part
           stopScroll() alone could never deliver, since stopping Lenis just
           hands scrolling back to the native pan it was suppressing. */
        if (grabEl && e.target === grabEl) {
          stopScroll();
          drag.heldScroll = true;
          claim(e);
          return;
        }
        // Off the planet: undecided. Deliberately no preventDefault and no
        // capture here — both would take the gesture away from the scroller
        // before we know it is ours, which is the bug this exists to stop.
        drag.pending = true;
        drag.active = false;
        return;
      }

      e.preventDefault();
      window.getSelection?.()?.removeAllRanges();
      claim(e);
    };

    const move = (e) => {
      if (drag.declined) return;

      if (drag.pending) {
        const tx = e.clientX - drag.startX;
        const ty = e.clientY - drag.startY;
        if (Math.hypot(tx, ty) < AXIS_LOCK_PX) return;   // too early to tell

        if (Math.abs(tx) <= Math.abs(ty) * H_BIAS) {
          // Vertical. It belongs to the scroller; stay out of it entirely.
          drag.pending = false;
          drag.declined = true;
          return;
        }
        // Horizontal. Take it, and hold the scroller off for the duration so
        // the page cannot slide while the planet turns.
        stopScroll();
        drag.heldScroll = true;
        claim(e);
        return;
      }

      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      /* Sensitivity rises as the sphere gets smaller, because a point on the
         surface should follow the finger. For a sphere of on-screen radius R
         pixels, dragging dx pixels turns it by about dx/R radians — so radians
         per pixel goes as 1/R, i.e. INVERSELY with rig.scale.

         This was written the wrong way round at first (scale / 1.74), which
         cut sensitivity exactly where the sphere is smallest: on a phone at
         full pull-back that is 0.381 / 1.74 = 0.219, a 4.6x loss, and the
         globe barely moved under a full-width swipe. The hardcoded 1.74 was
         wrong too — it is the DESKTOP close-up scale, while phones start at
         1.58.

         sqrt rather than the full 1/R: the tuned 0.0045 rad/px is already about
         3.5x faster than one-to-one tracking, which suits a big sphere you only
         see a patch of. Applying the full inverse on a small full-disc sphere
         made a 44px drag spin it a whole radian. The square root keeps it
         clearly more responsive when small without becoming uncontrollable. */
      const grip = Math.min(2.4, Math.sqrt(baseScale / Math.max(rig.scale.x, 0.05)));
      drag.vx = dx * 0.0045 * grip;
      drag.vy = dy * 0.0035 * grip;
      spin.y += drag.vx;
      // Clamped so it can never tip past the poles into an upside-down globe.
      spin.x = Math.max(tiltTarget - 0.75, Math.min(tiltTarget + 0.6, spin.x + drag.vy));
      drag.idle = 0;
    };

    const up = (e) => {
      // Always run, even for a gesture we declined — the scroller must be
      // handed back on every path out, including pointercancel, or one stray
      // gesture leaves the page permanently unscrollable.
      drag.pending = false;
      drag.declined = false;
      releaseScroll();
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
    /** 0 = pulled back, 1 = nose-down over Riyadh.
     *  Rotation finishes in the first 45% and the descent runs the whole way,
     *  so the planet swings round to Arabia and only then drops — the order the
     *  reader can actually follow. Doing both evenly reads as a tumble. */
    setDive(p) {
      const v = Math.min(1, Math.max(0, p));
      if (v === dive) return;

      if (v > 0 && diveFrom === null) {
        // Capture once, on entry. The target is chosen as the nearest
        // equivalent turn to where the globe already is, so it never unwinds
        // several revolutions to reach a longitude it is almost facing.
        const target = lonToRotation(DIVE_LON);
        const turns = Math.round((spin.y - target) / (Math.PI * 2));
        diveFrom = { y: spin.y, x: spin.x, toY: target + turns * Math.PI * 2 };
      }
      if (v === 0) { diveFrom = null; }

      dive = v;
      if (diveFrom) {
        const swing = Math.min(1, v / 0.45);
        const e = swing < 0.5 ? 2 * swing * swing : 1 - ((-2 * swing + 2) ** 2) / 2;
        spin.y = lerp(diveFrom.y, diveFrom.toY, e);
        /* Latitude is a rotation about X, and the sign was wrong: the dive
           landed on Madagascar — 18.8S 46.9E against Riyadh's 24.7N 46.7E.
           Same longitude, mirrored latitude, which is exactly what an inverted
           X rotation produces and is why the longitude solve was never in
           question. Positive tips the northern hemisphere toward the camera. */
        /* Clamped away from the poles: past about 70 degrees the dive ends
           looking straight down at an ice cap with the horizon nowhere in
           frame, which reads as a bug rather than as a destination. */
        const lat = Math.max(-70, Math.min(70, DIVE_LAT));
        spin.x = lerp(diveFrom.x, THREE.MathUtils.degToRad(lat), e);
      }
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
        } else if (dive > 0) {
          /* Hands off entirely while diving. The idle spin and the tilt settle
             both pull toward a framing chosen for the pulled-back globe, and
             either one would drag the camera off Riyadh on the way down. */
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
