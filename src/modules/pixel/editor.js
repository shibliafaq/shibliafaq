/**
 * The map editor — direct manipulation of the Experience map.
 *
 * Why this exists: the map was being corrected by describing problems in prose
 * and having the generator changed to match, which is a slow and lossy loop for
 * anything that is fundamentally a judgement about how a picture looks. This
 * lets the map be fixed by looking at it and moving things.
 *
 * The editor never rewrites the generator. Every correction is written to
 * `overlay.json` and applied on top of the procedural build (see buildScene's
 * `edit` argument). So the world stays generated, the corrections stay data, and
 * either can be thrown away without touching the other.
 *
 * The overlay has exactly three parts:
 *   terrain  paint over the generated ground; re-runs the nine-slice
 *   hidden   procedural sprites suppressed by hand
 *   objects  sprites placed by hand, with scale and flip
 *
 * Moving, resizing or flipping something procedural does not edit it in place —
 * it hides the original and creates a hand-placed copy (`materialise` below).
 * That keeps one rule for everything downstream and means the generator can
 * change underneath without the edits becoming half-valid.
 */

import { TILE, SPRITES, DECOR, Scene, loadAll } from './cutefantasy.js';
import { gradeSheets, SITE_GRADE } from './recolour.js';
import { buildScene } from './worldmap.js';
import { MAP_COLS, MAP_ROWS, REGIONS, STOPS } from './journey.js';

const OVERLAY_URL = '/assets/pixel/final/overlay.json';
const TERRAIN = ['grass', 'sand', 'water', 'road', 'field'];
const SWATCH = {
  grass: '#4a7c3f', sand: '#d9b273', water: '#3f6f9c', road: '#9a9086', field: '#8a6a3a',
};

/** Sprites are grouped for the palette by name, so the registry stays the one
    place a sprite is declared — no second list to keep in sync. */
function groupOf(name) {
  if (/^(kibmaple|tree|conifer)/.test(name)) return 'trees';
  if (/^(kibbush|bush|hedge|planter|tuft|flower|wheat|stump)/.test(name)) return 'plants';
  if (/^(inst|off)/.test(name)) return 'institutions & offices';
  if (/^(house|stall|kibmstall)/.test(name)) return 'buildings';
  if (/^(villager|scarecrow)/.test(name)) return 'people';
  if (/^animal/.test(name)) return 'animals';
  if (/^(kibwell|kibpond|bench)/.test(name)) return 'street furniture';
  if (/^(rock)/.test(name)) return 'rocks';
  if (/^(door|chimney|win)/.test(name)) return 'building parts';
  return 'other';
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export async function mountEditor(root) {
  const sheets = gradeSheets(await loadAll(), SITE_GRADE);

  /* ---- state ---- */
  let overlay = await fetch(OVERLAY_URL)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null) || { version: 1, terrain: {}, hidden: [], objects: [] };
  overlay.terrain ||= {}; overlay.hidden ||= []; overlay.objects ||= [];

  let scene = null;
  let selected = null;             // tag of the selected op
  let mode = 'select';             // select | paint | erase
  let brush = 'grass';
  let brushSize = 1;
  let armed = null;                // palette sprite waiting to be placed
  let zoom = 1, panX = 0, panY = 0;
  let dirty = false;
  const undo = [];
  let nextId = 1 + overlay.objects.reduce((m, o) => Math.max(m, +String(o.id).replace(/\D/g, '') || 0), 0);

  const mapW = MAP_COLS * TILE, mapH = MAP_ROWS * TILE;
  const buffer = document.createElement('canvas');
  buffer.width = mapW; buffer.height = mapH;
  const bctx = buffer.getContext('2d');
  bctx.imageSmoothingEnabled = false;

  /* ---- DOM ---- */
  root.innerHTML = SHELL;
  const view = root.querySelector('#view');
  const vctx = view.getContext('2d');
  const paletteEl = root.querySelector('#palette');
  const inspectEl = root.querySelector('#inspect');
  const statusEl = root.querySelector('#status');
  const searchEl = root.querySelector('#search');
  const unusedEl = root.querySelector('#unusedOnly');

  /* ---- build & draw ---- */
  function rebuild() {
    const t0 = performance.now();
    scene = buildScene(overlay).scene;
    bctx.clearRect(0, 0, mapW, mapH);
    scene.render(bctx, sheets);
    draw();
    statusEl.textContent =
      `${scene.ops.length} ops · ${overlay.objects.length} placed · ${overlay.hidden.length} hidden · `
      + `${Object.keys(overlay.terrain).length} painted · ${(performance.now() - t0).toFixed(0)}ms`
      + (dirty ? ' · UNSAVED' : '');
    renderPalette();
  }

  function fitView() {
    const r = view.parentElement.getBoundingClientRect();
    view.width = Math.floor(r.width);
    view.height = Math.floor(r.height);
    draw();
  }

  function draw() {
    vctx.imageSmoothingEnabled = false;
    vctx.fillStyle = '#0b0b0e';
    vctx.fillRect(0, 0, view.width, view.height);
    vctx.save();
    vctx.translate(panX, panY);
    vctx.scale(zoom, zoom);
    vctx.drawImage(buffer, 0, 0);

    // Region bands — the map is 113 tiles tall and every stop belongs to a
    // chapter; without these you lose track of which part of the story you are
    // standing in as soon as you zoom in.
    vctx.lineWidth = 1 / zoom;
    for (const g of REGIONS) {
      vctx.strokeStyle = 'rgba(245,158,11,.35)';
      vctx.setLineDash([4 / zoom, 4 / zoom]);
      vctx.beginPath();
      vctx.moveTo(0, g.rows[0] * TILE); vctx.lineTo(mapW, g.rows[0] * TILE);
      vctx.stroke();
      vctx.setLineDash([]);
      vctx.fillStyle = 'rgba(245,158,11,.9)';
      vctx.font = `${Math.max(7, 9 / zoom)}px Jost, sans-serif`;
      vctx.fillText(`${g.label} · ${g.years}`, 3, g.rows[0] * TILE + 10 / zoom);
    }

    // Milestone aprons: the two-tile clear zone the generator protects. Placing
    // something inside one is how buildings got covered before.
    vctx.strokeStyle = 'rgba(96,165,250,.45)';
    for (const b of STOPS) {
      const [c0, r1] = b.anchor, [w, h] = b.footprint;
      vctx.strokeRect((c0 - 2) * TILE, (r1 - h + 1 - 2) * TILE, (w + 4) * TILE, (h + 4) * TILE);
    }

    if (mode !== 'select') drawBrushCursor();

    if (selected) {
      const op = scene.ordered().find((o) => o.tag === selected);
      if (op) {
        const b = Scene.box(op);
        vctx.strokeStyle = '#f59e0b';
        vctx.lineWidth = 2 / zoom;
        vctx.strokeRect(b.x - .5, b.y - .5, b.w + 1, b.h + 1);
        vctx.fillStyle = 'rgba(245,158,11,.9)';
        vctx.fillRect(op.cell[0] * TILE, op.cell[1] * TILE + TILE - 2 / zoom, TILE, 2 / zoom);
      }
    }

    if (armed && hover.on) {
      const s = SPRITES[armed];
      vctx.globalAlpha = .6;
      if (s) {
        vctx.drawImage(sheets[s.sheet], s.x, s.y, s.w, s.h,
          hover.c * TILE, hover.r * TILE - s.h + TILE, s.w, s.h);
      }
      vctx.globalAlpha = 1;
    }
    vctx.restore();
  }

  const hover = { c: 0, r: 0, on: false };

  function drawBrushCursor() {
    if (!hover.on) return;
    const n = brushSize;
    const c0 = hover.c - ((n / 2) | 0), r0 = hover.r - ((n / 2) | 0);
    vctx.globalAlpha = .5;
    vctx.fillStyle = mode === 'erase' ? '#ef4444' : SWATCH[brush];
    vctx.fillRect(c0 * TILE, r0 * TILE, n * TILE, n * TILE);
    vctx.globalAlpha = 1;
    vctx.strokeStyle = '#fff';
    vctx.lineWidth = 1 / zoom;
    vctx.strokeRect(c0 * TILE, r0 * TILE, n * TILE, n * TILE);
  }

  /* ---- edit operations ---- */
  function snapshot() {
    undo.push(JSON.stringify(overlay));
    if (undo.length > 60) undo.shift();
    dirty = true;
  }

  /**
   * Turns whatever is selected into a hand-placed object that can be edited.
   *
   * A procedural sprite has no record to change — it is the output of a seeded
   * function. So the first time one is moved, scaled or flipped it is hidden and
   * replaced by an identical hand-placed copy. Every later edit then has
   * somewhere to be stored, and one code path handles both cases.
   */
  function materialise() {
    if (!selected) return null;
    if (selected.startsWith('user:')) {
      return overlay.objects.find((o) => `user:${o.id}` === selected) || null;
    }
    const op = scene.ordered().find((o) => o.tag === selected);
    if (!op) return null;
    const o = {
      id: `e${nextId++}`, name: op.name, kind: op.isDecor ? 'decor' : 'sprite',
      col: op.cell[0], row: op.cell[1], scale: op.scale || 1, flip: !!op.flip,
    };
    overlay.hidden.push(op.tag);
    overlay.objects.push(o);
    selected = `user:${o.id}`;
    return o;
  }

  function mutate(fn) {
    snapshot();
    const o = materialise();
    if (!o) { undo.pop(); return; }
    fn(o);
    rebuild(); inspect();
  }

  function removeSelected() {
    if (!selected) return;
    snapshot();
    if (selected.startsWith('user:')) {
      overlay.objects = overlay.objects.filter((o) => `user:${o.id}` !== selected);
    } else {
      overlay.hidden.push(selected);
    }
    selected = null;
    rebuild(); inspect();
  }

  function duplicateSelected() {
    const op = scene.ordered().find((o) => o.tag === selected);
    if (!op) return;
    snapshot();
    const o = {
      id: `e${nextId++}`, name: op.name, kind: op.isDecor ? 'decor' : 'sprite',
      col: clamp(op.cell[0] + 2, 0, MAP_COLS - 1), row: clamp(op.cell[1] + 1, 0, MAP_ROWS - 1),
      scale: op.scale || 1, flip: !!op.flip,
    };
    overlay.objects.push(o);
    selected = `user:${o.id}`;
    rebuild(); inspect();
  }

  function place(name, c, r) {
    snapshot();
    const o = {
      id: `e${nextId++}`, name, kind: DECOR[name] && !SPRITES[name] ? 'decor' : 'sprite',
      col: c, row: r, scale: 1, flip: false,
    };
    overlay.objects.push(o);
    selected = `user:${o.id}`;
    rebuild(); inspect();
  }

  function paintAt(c, r) {
    const n = brushSize;
    const c0 = c - ((n / 2) | 0), r0 = r - ((n / 2) | 0);
    let changed = false;
    for (let dc = 0; dc < n; dc++) {
      for (let dr = 0; dr < n; dr++) {
        const cc = c0 + dc, rr = r0 + dr;
        if (cc < 0 || rr < 0 || cc >= MAP_COLS || rr >= MAP_ROWS) continue;
        const k = `${cc},${rr}`;
        if (mode === 'erase') {
          if (k in overlay.terrain) { delete overlay.terrain[k]; changed = true; }
        } else if (overlay.terrain[k] !== brush) {
          overlay.terrain[k] = brush; changed = true;
        }
      }
    }
    return changed;
  }

  /* ---- inspector ---- */
  function inspect() {
    const op = selected && scene.ordered().find((o) => o.tag === selected);
    if (!op) {
      inspectEl.innerHTML = '<p class="hint">Nothing selected. Click anything on the map.</p>';
      return;
    }
    const isUser = op.tag.startsWith('user:');
    const th = thumb(op.name, 64);
    inspectEl.innerHTML = `
      <div class="ihead">${th ? `<img src="${th}" alt="">` : ''}
        <div><b>${op.name}</b><span>${isUser ? 'placed by hand' : 'from the generator'}</span></div></div>
      <label>Column <input id="fc" type="number" value="${op.cell[0]}" min="0" max="${MAP_COLS - 1}"></label>
      <label>Row <input id="fr" type="number" value="${op.cell[1]}" min="0" max="${MAP_ROWS - 1}"></label>
      <label>Scale <input id="fs" type="range" min="0.4" max="3" step="0.05" value="${op.scale || 1}">
        <b id="fsv">${(op.scale || 1).toFixed(2)}×</b></label>
      <div class="drawn">drawn ${Math.round(op.dw || op.sw)}×${Math.round(op.dh || op.sh)} px
        · ${((op.dh || op.sh) / TILE).toFixed(1)} tiles tall</div>
      <div class="row">
        <button id="bflip">${op.flip ? 'Unflip' : 'Flip'}</button>
        <button id="bdup">Duplicate</button>
        <button id="bdel" class="danger">${isUser ? 'Delete' : 'Hide'}</button>
      </div>
      <p class="hint">Arrow keys nudge · <kbd>[</kbd> <kbd>]</kbd> resize · <kbd>Del</kbd> remove
        · pick a sprite in the palette to swap this one.</p>`;

    inspectEl.querySelector('#fc').onchange = (e) => mutate((o) => { o.col = clamp(+e.target.value, 0, MAP_COLS - 1); });
    inspectEl.querySelector('#fr').onchange = (e) => mutate((o) => { o.row = clamp(+e.target.value, 0, MAP_ROWS - 1); });
    const fs = inspectEl.querySelector('#fs');
    fs.oninput = (e) => { inspectEl.querySelector('#fsv').textContent = `${(+e.target.value).toFixed(2)}×`; };
    fs.onchange = (e) => mutate((o) => { o.scale = +e.target.value; });
    inspectEl.querySelector('#bflip').onclick = () => mutate((o) => { o.flip = !o.flip; });
    inspectEl.querySelector('#bdup').onclick = duplicateSelected;
    inspectEl.querySelector('#bdel').onclick = removeSelected;
  }

  /* ---- palette ---- */
  const thumbCache = new Map();
  function thumb(name, max = 48) {
    const ck = `${name}:${max}`;
    if (thumbCache.has(ck)) return thumbCache.get(ck);
    const s = SPRITES[name];
    let url = '';
    if (s && sheets[s.sheet]) {
      const k = Math.min(max / s.w, max / s.h, 3);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(s.w * k));
      cv.height = Math.max(1, Math.round(s.h * k));
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      c2.drawImage(sheets[s.sheet], s.x, s.y, s.w, s.h, 0, 0, cv.width, cv.height);
      url = cv.toDataURL();
    }
    thumbCache.set(ck, url);
    return url;
  }

  function renderPalette() {
    const used = new Set(scene ? scene.ops.filter((o) => o.name).map((o) => o.name) : []);
    const q = searchEl.value.trim().toLowerCase();
    const onlyUnused = unusedEl.checked;

    const groups = new Map();
    for (const name of Object.keys(SPRITES)) {
      if (q && !name.toLowerCase().includes(q)) continue;
      if (onlyUnused && used.has(name)) continue;
      const g = groupOf(name);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(name);
    }

    let html = '';
    for (const [g, names] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
      html += `<h4>${g} <i>${names.length}</i></h4><div class="grid">`;
      for (const n of names) {
        const s = SPRITES[n];
        html += `<button class="cell${armed === n ? ' on' : ''}${used.has(n) ? '' : ' fresh'}"
                   data-name="${n}" title="${n} — ${s.w}×${s.h}px">
                   <img src="${thumb(n)}" alt=""><span>${n}</span></button>`;
      }
      html += '</div>';
    }
    paletteEl.innerHTML = html || '<p class="hint">Nothing matches.</p>';

    for (const btn of paletteEl.querySelectorAll('.cell')) {
      btn.onclick = () => {
        const name = btn.dataset.name;
        // A palette click with something selected means "swap this for that" —
        // the fastest way to fix a building that is the wrong building.
        if (selected) { mutate((o) => { o.name = name; o.kind = 'sprite'; }); return; }
        armed = armed === name ? null : name;
        renderPalette(); draw();
      };
    }
  }

  /* ---- pointer ---- */
  const toMap = (e) => {
    const r = view.getBoundingClientRect();
    return { x: (e.clientX - r.left - panX) / zoom, y: (e.clientY - r.top - panY) / zoom };
  };

  let drag = null;

  view.addEventListener('pointerdown', (e) => {
    view.setPointerCapture(e.pointerId);
    const p = toMap(e);
    const c = Math.floor(p.x / TILE), r = Math.floor(p.y / TILE);

    if (e.button === 1 || e.altKey) { drag = { kind: 'pan', x: e.clientX, y: e.clientY, px: panX, py: panY }; return; }

    if (mode !== 'select') {
      snapshot();
      drag = { kind: 'paint', any: paintAt(c, r) };
      if (drag.any) { scene = buildScene(overlay).scene; bctx.clearRect(0, 0, mapW, mapH); scene.render(bctx, sheets); }
      draw();
      return;
    }

    if (armed) { place(armed, c, r); armed = null; renderPalette(); return; }

    const op = scene.pick(p.x, p.y);
    selected = op ? op.tag : null;
    inspect();
    if (op) drag = { kind: 'move', c0: c, r0: r, moved: false };
    draw();
  });

  view.addEventListener('pointermove', (e) => {
    const p = toMap(e);
    hover.c = Math.floor(p.x / TILE);
    hover.r = Math.floor(p.y / TILE);
    hover.on = true;

    if (drag?.kind === 'pan') {
      panX = drag.px + (e.clientX - drag.x);
      panY = drag.py + (e.clientY - drag.y);
      draw(); return;
    }
    if (drag?.kind === 'paint') {
      if (paintAt(hover.c, hover.r)) {
        drag.any = true;
        scene = buildScene(overlay).scene;
        bctx.clearRect(0, 0, mapW, mapH);
        scene.render(bctx, sheets);
      }
      draw(); return;
    }
    if (drag?.kind === 'move') {
      if (hover.c !== drag.c0 || hover.r !== drag.r0) {
        const dc = hover.c - drag.c0, dr = hover.r - drag.r0;
        drag.c0 = hover.c; drag.r0 = hover.r;
        if (!drag.moved) { drag.moved = true; snapshot(); materialise(); }
        const o = overlay.objects.find((x) => `user:${x.id}` === selected);
        if (o) {
          o.col = clamp(o.col + dc, 0, MAP_COLS - 1);
          o.row = clamp(o.row + dr, 0, MAP_ROWS - 1);
          rebuild(); inspect();
        }
      }
      return;
    }
    if (mode !== 'select' || armed) draw();
  });

  const endDrag = () => {
    if (drag?.kind === 'paint') { if (!drag.any) undo.pop(); else { dirty = true; rebuild(); } }
    if (drag?.kind === 'move' && !drag.moved) undo.pop?.();
    drag = null;
  };
  view.addEventListener('pointerup', endDrag);
  view.addEventListener('pointercancel', endDrag);
  view.addEventListener('pointerleave', () => { hover.on = false; draw(); });

  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = view.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const before = { x: (mx - panX) / zoom, y: (my - panY) / zoom };
    zoom = clamp(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.25, 8);
    panX = mx - before.x * zoom;
    panY = my - before.y * zoom;
    draw();
  }, { passive: false });

  /* ---- keys ---- */
  window.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      const prev = undo.pop();
      if (prev) { overlay = JSON.parse(prev); rebuild(); inspect(); }
      e.preventDefault(); return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { duplicateSelected(); e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { save(); e.preventDefault(); return; }
    if (e.key === 'Escape') { armed = null; selected = null; renderPalette(); inspect(); draw(); return; }
    if (!selected) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { removeSelected(); e.preventDefault(); return; }
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (nudge) {
      mutate((o) => {
        o.col = clamp(o.col + nudge[0], 0, MAP_COLS - 1);
        o.row = clamp(o.row + nudge[1], 0, MAP_ROWS - 1);
      });
      e.preventDefault(); return;
    }
    if (e.key === '[' || e.key === ']') {
      mutate((o) => { o.scale = clamp((o.scale || 1) + (e.key === ']' ? .1 : -.1), 0.4, 3); });
      e.preventDefault();
    }
  });

  /* ---- save ---- */
  async function save() {
    const body = JSON.stringify(overlay, null, 2);
    try {
      const res = await fetch('/__save-overlay', { method: 'POST', body });
      if (!res.ok) throw new Error(await res.text());
      dirty = false;
      statusEl.textContent = 'saved to public/assets/pixel/final/overlay.json';
    } catch (err) {
      statusEl.textContent = `save failed: ${err.message}`;
    }
  }

  /* ---- toolbar ---- */
  root.querySelector('#save').onclick = save;
  root.querySelector('#download').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(overlay, null, 2)], { type: 'application/json' }));
    a.download = 'overlay.json';
    a.click();
  };
  root.querySelector('#reset').onclick = () => {
    if (!confirm('Discard every hand edit and go back to the generated map?')) return;
    snapshot();
    overlay = { version: 1, terrain: {}, hidden: [], objects: [] };
    selected = null;
    rebuild(); inspect();
  };
  root.querySelector('#fit').onclick = () => {
    zoom = clamp((view.height - 20) / mapH, 0.25, 8);
    panX = (view.width - mapW * zoom) / 2; panY = 10;
    draw();
  };
  searchEl.oninput = renderPalette;
  unusedEl.onchange = renderPalette;

  for (const b of root.querySelectorAll('[data-mode]')) {
    b.onclick = () => {
      mode = b.dataset.mode;
      for (const o of root.querySelectorAll('[data-mode]')) o.classList.toggle('on', o === b);
      root.querySelector('#brushbar').style.display = mode === 'paint' ? 'flex' : 'none';
      draw();
    };
  }
  for (const b of root.querySelectorAll('[data-terrain]')) {
    b.onclick = () => {
      brush = b.dataset.terrain;
      for (const o of root.querySelectorAll('[data-terrain]')) o.classList.toggle('on', o === b);
    };
  }
  root.querySelector('#bsize').oninput = (e) => {
    brushSize = +e.target.value;
    root.querySelector('#bsizev').textContent = `${brushSize}×${brushSize}`;
    draw();
  };

  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('resize', fitView);

  rebuild();
  fitView();
  zoom = clamp((view.height - 20) / mapH, 0.25, 8);
  panX = (view.width - mapW * zoom) / 2; panY = 10;
  draw();
  inspect();
}

const SHELL = `
<div class="bar">
  <strong>Map editor</strong>
  <span class="seg">
    <button data-mode="select" class="on">Select</button>
    <button data-mode="paint">Paint</button>
    <button data-mode="erase">Erase paint</button>
  </span>
  <span id="brushbar" class="seg" style="display:none">
    <button data-terrain="grass" class="on">grass</button>
    <button data-terrain="sand">sand</button>
    <button data-terrain="water">water</button>
    <button data-terrain="road">road</button>
    <button data-terrain="field">field</button>
    <label class="sz">size <input id="bsize" type="range" min="1" max="9" step="2" value="1"><b id="bsizev">1×1</b></label>
  </span>
  <span class="spacer"></span>
  <button id="fit">Fit</button>
  <button id="reset" class="danger">Reset</button>
  <button id="download">Download JSON</button>
  <button id="save" class="primary">Save</button>
</div>
<div class="body">
  <aside class="left">
    <div class="side-head">
      <input id="search" type="search" placeholder="search sprites…">
      <label class="chk"><input id="unusedOnly" type="checkbox"> only sprites not on the map</label>
    </div>
    <div id="palette"></div>
  </aside>
  <div class="stage"><canvas id="view"></canvas></div>
  <aside class="right">
    <div id="inspect"></div>
  </aside>
</div>
<div id="status" class="status"></div>`;
