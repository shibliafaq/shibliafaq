import * as THREE from 'three';

/**
 * CONCEPT: the projects live on the globe.
 *
 * The argument for this over a card list is not that it is prettier. It is that
 * for at least two of these projects the geography IS the finding:
 *
 *   Multi-City Surface Temperature runs Dammam 26N -> Dublin 53N -> Reykjavik
 *   64N and reports r = -0.995 between latitude and temperature. That is a
 *   north-south line on a sphere. On a card it is a number; on a globe it is
 *   the shape of the result.
 *
 *   The thesis covers five Saudi cities. On a card that is a list; on a globe
 *   it is a region.
 *
 * And the page has already taught this gesture — space, planet, continent,
 * city — so arriving at "the places the work happened" continues the descent
 * instead of starting a new idiom.
 *
 * Every coordinate below is the real study site. Nothing here is invented,
 * which is the whole point: no other portfolio can copy it.
 */

const R = 1;                       // globe radius in world units
const DEG = Math.PI / 180;

/** Lat/lon to a point on the sphere. The -90 aligns with how the equirectangular
 *  texture is wrapped, which is the same convention earth.js uses. */
function latLonToVec3(lat, lon, radius = R) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 90) * DEG;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export const STOPS = [
  {
    id: 'thesis', label: 'Smart Digital Twin Framework',
    note: 'Five Saudi cities · MODIS LST · Prophet forecasting · HVI',
    points: [
      ['Dhahran', 26.3069, 50.1442], ['Dammam', 26.4207, 50.0888],
      ['Riyadh', 24.7136, 46.6753], ['Jeddah', 21.4858, 39.1925],
      ['Makkah', 21.3891, 39.8579],
    ],
    zoom: 2.6,
  },
  {
    id: 'gis', label: 'GIS & Remote Sensing UHI Assessment',
    note: 'Dammam Metropolitan Area · NDBI dominance R² = 0.511',
    points: [['Dammam', 26.4207, 50.0888]],
    zoom: 1.55,
  },
  {
    id: 'iot', label: 'Real-Time Smart City IoT Pipeline',
    note: 'KFUPM, Dhahran · streaming sensor ingest',
    points: [['KFUPM, Dhahran', 26.3069, 50.1442]],
    zoom: 1.5,
  },
  {
    id: 'temp', label: 'Multi-City Surface Temperature Analysis',
    // The one where the map is the result rather than the location.
    note: '3 cities · 3 continents · r = −0.995 latitude vs temperature',
    points: [
      ['Reykjavik 64°N', 64.1466, -21.9426],
      ['Dublin 53°N', 53.3498, -6.2603],
      ['Dammam 26°N', 26.4207, 50.0888],
    ],
    zoom: 3.6,
  },
  {
    id: 'its', label: 'ITS-Based Congestion Management',
    note: 'Aramco Stadium corridor, Al Khobar',
    points: [['Al Khobar', 26.2794, 50.2083]],
    zoom: 1.5,
  },
  {
    id: 'sound', label: 'Soundscape & Thermal Comfort',
    note: 'Systematic review · hot-arid environments',
    points: [['KFUPM, Dhahran', 26.3069, 50.1442]],
    zoom: 1.6,
  },
  {
    id: 'arch', label: 'Twin Tower Complex',
    note: 'B.Arch thesis · BIT Mesra, Ranchi, India',
    points: [['BIT Mesra, Ranchi', 23.4120, 85.4400]],
    zoom: 1.9,
  },
];

export function initProjectAtlas(opts = {}) {
  const canvas = document.getElementById(opts.canvas || 'atlasCanvas');
  const labelHost = document.getElementById(opts.labels || 'atlasLabels');
  if (!canvas) return null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);

  // `rig` carries the framing, `spinner` the rotation — the same split earth.js
  // needed, and for the same reason: sharing one Euler between an axial tilt and
  // a spin makes the pole precess.
  const rig = new THREE.Group();
  const spinner = new THREE.Group();
  rig.add(spinner);
  scene.add(rig);

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  spinner.add(globe);

  // Thin atmosphere, so the limb is not a hard cut against the page.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.035, 48, 48),
    new THREE.ShaderMaterial({
      uniforms: { c: { value: new THREE.Color('#7fb2ff') } },
      vertexShader: `varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(mat3(modelMatrix)*normal);
        vP = (modelMatrix*vec4(position,1.)).xyz;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);} `,
      fragmentShader: `uniform vec3 c; varying vec3 vN; varying vec3 vP;
        void main(){ float rim = 1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vP)));
        gl_FragColor = vec4(c, pow(rim, 3.0) * 0.55); }`,
      side: THREE.BackSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  spinner.add(glow);

  /* ---- markers and routes ------------------------------------
     Markers sit slightly proud of the surface so they are not z-fought by it,
     and routes arc ABOVE the sphere rather than tunnelling through — a straight
     line between two coordinates passes through the planet, which reads as a
     mistake even when a viewer cannot say why. */
  const markerGroup = new THREE.Group();
  spinner.add(markerGroup);

  const ACCENT = new THREE.Color('#FFD429');
  const markers = [];

  STOPS.forEach((stop, si) => {
    stop.points.forEach(([name, lat, lon]) => {
      const pos = latLonToVec3(lat, lon, R * 1.004);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 12, 12),
        new THREE.MeshBasicMaterial({ color: ACCENT }),
      );
      dot.position.copy(pos);
      markerGroup.add(dot);
      markers.push({ stopIndex: si, name, mesh: dot, pos });
    });

    if (stop.points.length > 1) {
      for (let i = 0; i < stop.points.length - 1; i++) {
        const a = latLonToVec3(stop.points[i][1], stop.points[i][2]);
        const b = latLonToVec3(stop.points[i + 1][1], stop.points[i + 1][2]);
        // Lift the control point by the chord length, so long routes arc higher
        // than short ones — the arc reads as distance rather than decoration.
        const mid = a.clone().add(b).multiplyScalar(0.5)
          .normalize().multiplyScalar(R + a.distanceTo(b) * 0.32);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
          new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.55 }),
        );
        line.userData.stopIndex = si;
        markerGroup.add(line);
      }
    }
  });

  /* ---- camera state ------------------------------------------
     A stop is reached by rotating the globe so the site faces the camera and
     pulling the camera in — not by moving the camera around the sphere. Same
     thing geometrically, far simpler to interpolate, and it keeps the lighting
     and the limb consistent from every stop. */
  const cur = { lat: 20, lon: 20, dist: 4.2 };
  const tgt = { lat: 20, lon: 20, dist: 4.2 };
  let active = -1;

  function frameStop(i) {
    const stop = STOPS[i];
    if (!stop) return;
    active = i;
    // Centroid of the stop's points, so a multi-city project frames all of them
    // rather than snapping to the first.
    const v = new THREE.Vector3();
    stop.points.forEach(([, lat, lon]) => v.add(latLonToVec3(lat, lon)));
    v.divideScalar(stop.points.length).normalize();
    tgt.lat = Math.asin(v.y) / DEG;
    tgt.lon = (Math.atan2(v.z, -v.x) / DEG) - 90;
    tgt.dist = stop.zoom;
    onChange?.(i);
  }

  let onChange = null;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /** Shortest-path lerp for longitude, so flying from 85°E to −22°W goes the
   *  short way round instead of unwinding most of a revolution. */
  function lerpLon(a, b, t) {
    let d = ((b - a + 540) % 360) - 180;
    return a + d * t;
  }

  const tmp = new THREE.Vector3();
  function project(v) {
    tmp.copy(v).applyMatrix4(spinner.matrixWorld).project(camera);
    return {
      x: (tmp.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-tmp.y * 0.5 + 0.5) * canvas.clientHeight,
      z: tmp.z,
    };
  }

  // One DOM node per marker, positioned from the 3D point each frame. Labels in
  // HTML rather than sprites so they stay selectable, translatable and crisp.
  const labelEls = markers.map((m) => {
    const el = document.createElement('span');
    el.className = 'atlas__pin';
    el.textContent = m.name;
    labelHost?.appendChild(el);
    return el;
  });

  resize();
  window.addEventListener('resize', resize, { passive: true });

  new THREE.TextureLoader().load('/assets/img/earth-day-4k.webp', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    globe.material = new THREE.MeshBasicMaterial({ map: tex });
    canvas.classList.add('is-ready');
  });

  (function loop() {
    requestAnimationFrame(loop);

    cur.lat += (tgt.lat - cur.lat) * 0.055;
    cur.lon = lerpLon(cur.lon, lerpLon(cur.lon, tgt.lon, 1), 0.055);
    cur.dist += (tgt.dist - cur.dist) * 0.045;

    spinner.rotation.y = -(cur.lon + 90) * DEG;
    spinner.rotation.x = cur.lat * DEG;
    camera.position.set(0, 0, cur.dist);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    // Labels: hide any marker on the far side of the globe. Without the facing
    // test they bleed through the planet and the map reads as transparent.
    const camDir = new THREE.Vector3(0, 0, 1);
    markers.forEach((m, i) => {
      const world = m.pos.clone().applyMatrix4(spinner.matrixWorld).normalize();
      const facing = world.dot(camDir);
      const el = labelEls[i];
      const p = project(m.pos);
      const near = m.stopIndex === active;
      if (facing < 0.12 || p.z > 1) { el.style.opacity = '0'; return; }
      el.style.opacity = near ? '1' : String(0.16 + 0.3 * facing);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
      el.classList.toggle('is-active', near);
      m.mesh.scale.setScalar(near ? 1.6 : 1);
    });
  })();

  return {
    go: frameStop,
    stops: STOPS,
    onChange(fn) { onChange = fn; },
  };
}
