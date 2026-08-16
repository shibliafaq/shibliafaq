import * as THREE from 'three';
import { reducedMotion } from './scroll.js';

/**
 * The centrepiece: an instanced bar field standing in for a land-surface
 * temperature raster. It deliberately echoes the Kepler.gl hexbin extrusions in
 * the thermal section — same visual language, rendered live.
 *
 * The five thesis cities sit at their real relative positions inside the Saudi
 * bounding box and push heat domes into the field.
 */

// lon/lat, plus how hard each city pushes the surface up.
const CITIES = [
  { id: 'riyadh',    lon: 46.72, lat: 24.71, weight: 1.00, spread: 0.075 },
  { id: 'jeddah',    lon: 39.19, lat: 21.49, weight: 0.86, spread: 0.068 },
  { id: 'dammam',    lon: 50.10, lat: 26.43, weight: 0.92, spread: 0.062 },
  { id: 'makkah',    lon: 39.83, lat: 21.39, weight: 0.72, spread: 0.052 },
  { id: 'neom',      lon: 35.29, lat: 27.90, weight: 0.64, spread: 0.058 },
];

const LON = [34, 56];
const LAT = [16, 32];
// Chunkier cells than a raster would use — these are meant to read as the
// Kepler.gl hexbins from the thermal section, not as a smooth surface.
const COLS = 50;
const ROWS = 36;

const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
};

/** Cheap deterministic value noise — enough texture without a dependency. */
function noise(x, y) {
  return (
    Math.sin(x * 3.1 + y * 1.7) * 0.5 +
    Math.sin(x * 6.7 - y * 4.3) * 0.28 +
    Math.sin(x * 12.9 + y * 9.1) * 0.14
  );
}

export function initAtlas() {
  const canvas = document.getElementById('atlasCanvas');
  const section = document.getElementById('atlas');
  const fallback = document.getElementById('atlasFallback');
  if (!canvas || !section) return;

  if (!hasWebGL()) {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
  camera.position.set(0, 11.5, 15);
  camera.lookAt(0, 0.3, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.4);
  key.position.set(5, 10, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5f1f, 1.3);
  rim.position.set(-7, 4, -5);
  scene.add(rim);

  const cell = 0.19;
  const geometry = new THREE.BoxGeometry(cell * 0.78, 1, cell * 0.78);
  geometry.translate(0, 0.5, 0); // grow upward from the base plane
  // No vertexColors here. InstancedMesh.setColorAt drives colour through the
  // instanceColor attribute on its own; switching vertexColors on would make
  // the shader look for a per-vertex `color` attribute that BoxGeometry does
  // not have, and every bar renders black.
  const material = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, COLS * ROWS);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  // Sit the plate right of centre and a little low, so the column of copy on
  // the left keeps clear ground. On narrow screens it recentres (see resize).
  const group = new THREE.Group();
  group.position.set(2.9, -0.7, -0.5);
  scene.add(group);
  group.add(mesh);

  // Normalised city positions inside the grid.
  const cityPts = CITIES.map((c) => ({
    ...c,
    u: (c.lon - LON[0]) / (LON[1] - LON[0]),
    v: 1 - (c.lat - LAT[0]) / (LAT[1] - LAT[0]),
    boost: 0,
  }));

  // Same ramp the Kepler.gl hexbins use in the thermal section: deep maroon
  // through ember to yellow. Keeping them identical makes the two sections
  // read as one visual system rather than two unrelated graphics.
  const cold = new THREE.Color('#3d0f2b');
  const warm = new THREE.Color('#e0451f');
  const hot = new THREE.Color('#ffc233');

  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();

  function build(time) {
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++, i++) {
        const u = c / (COLS - 1);
        const v = r / (ROWS - 1);

        let h = (noise(u * 2.2 + time * 0.06, v * 2.2 - time * 0.04) + 1) * 0.18;

        for (const city of cityPts) {
          const dx = u - city.u;
          const dy = v - city.v;
          const d2 = dx * dx + dy * dy;
          h += (city.weight + city.boost) * Math.exp(-d2 / city.spread) * 1.75;
        }

        // Fade the field out at the edges so it reads as a plate, not a wall.
        const edge = Math.min(u, 1 - u, v, 1 - v);
        h *= Math.min(1, edge * 7);
        h = Math.max(h, 0.012);

        dummy.position.set((u - 0.5) * COLS * cell, 0, (v - 0.5) * ROWS * cell);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const t = Math.min(1, h / 1.9);
        if (t < 0.42) colour.copy(cold).lerp(warm, t / 0.42);
        else colour.copy(warm).lerp(hot, (t - 0.42) / 0.58);
        mesh.setColorAt(i, colour);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function resize() {
    const w = section.clientWidth;
    const h = section.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Below the two-column breakpoint there is no side room, so the plate
    // recentres and drops behind the copy instead of sitting beside it.
    const narrow = w < 900;
    group.position.x = narrow ? 0 : 3.8;
    group.position.y = narrow ? -1.6 : -1.1;
    camera.position.set(0, narrow ? 13 : 12, narrow ? 17 : 15.5);
    camera.lookAt(0, 0.3, 0);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Pointer drifts the plate rather than orbiting it — subtler, less nauseating.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(hover: hover)').matches) {
    section.addEventListener('pointermove', (e) => {
      const rect = section.getBoundingClientRect();
      pointer.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
      pointer.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 0.28;
    }, { passive: true });
  }

  // Hovering a city in the list pushes its dome up.
  document.querySelectorAll('#atlasList li').forEach((li) => {
    const city = cityPts.find((c) => c.id === li.dataset.city);
    if (!city) return;
    const on = () => { city.target = 0.55; li.classList.add('is-active'); };
    const off = () => { city.target = 0; li.classList.remove('is-active'); };
    li.addEventListener('pointerenter', on);
    li.addEventListener('pointerleave', off);
    li.addEventListener('focus', on);
    li.addEventListener('blur', off);
  });

  if (reducedMotion) {
    build(0);
    group.rotation.y = -0.32;
    renderer.render(scene, camera);
    return;
  }

  // Only burn frames while the section is actually on screen.
  let visible = false;
  new IntersectionObserver(
    ([entry]) => { visible = entry.isIntersecting; },
    { rootMargin: '120px' }
  ).observe(section);

  const clock = new THREE.Clock();
  let frame = 0;

  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;

    const t = clock.getElapsedTime();

    for (const city of cityPts) {
      city.boost += ((city.target || 0) - city.boost) * 0.08;
    }

    // The height field is the expensive part — recompute every other frame.
    if (frame++ % 2 === 0) build(t);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    group.rotation.y = -0.32 + Math.sin(t * 0.08) * 0.12 + pointer.x;
    group.rotation.x = pointer.y * 0.5;

    renderer.render(scene, camera);
  }

  loop();
}
