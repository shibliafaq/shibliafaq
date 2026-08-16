#!/usr/bin/env python3
"""Adds an NPC-placing mode to lab/trace.html and a save endpoint to vite.config.js.

Kept as a script rather than done by hand so the edit is repeatable if trace.html
is ever regenerated.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ---------------------------------------------------------------- trace.html
p = ROOT / "lab" / "trace.html"
s = p.read_text(encoding="utf-8")

s = s.replace(
    '  <button class="alt" id="mStops">Stops</button>',
    '  <button class="alt" id="mStops">Stops</button>\n'
    '  <button class="alt" id="mNpc">NPCs</button>\n'
    '  <select id="art" title="who to place"></select>')

s = s.replace(
"""let pts = [];      // road waypoints
let stops = [];    // milestones, in walking order
let mode = 'road';""",
"""let pts = [];      // road waypoints
let stops = [];    // milestones, in walking order
let npcs = [];     // people, each with a patrol from->to
let animals = [];  // livestock, same shape
let pending = null;   // first click of a from->to pair
let mode = 'road';

// Everyone available. `kind` decides which list an entry lands in, because the
// two are drawn from different sheets and animals move at a third the speed.
const CAST = [
  ['villager_a', 'person', 'Villager A'],
  ['villager_b', 'person', 'Villager B'],
  ['villager_c', 'person', 'Villager C'],
  ['villager_hold', 'person', 'Villager, holding'],
  ['villager_carry', 'person', 'Villager, carrying'],
  ['villager_rogue', 'person', 'Rogue'],
  ['villager_knight', 'person', 'Knight'],
  ['villager_wizard', 'person', 'Wizard'],
  ['animal_cow', 'animal', 'Cow'],
  ['animal_sheep', 'animal', 'Sheep'],
  ['animal_chicken', 'animal', 'Chicken'],
];
const artSel = document.getElementById('art');
/** Only ever offer the cast that belongs to the current mode. */
function fillCast() {
  const want = mode === 'animals' ? 'animal' : 'person';
  artSel.innerHTML = '';
  CAST.forEach(([id, kind, label], i) => {
    if (kind !== want) return;
    const o = document.createElement('option');
    o.value = String(i); o.textContent = label;
    artSel.appendChild(o);
  });
  artSel.style.display = (mode === 'people' || mode === 'animals') ? '' : 'none';
}""")

# draw the NPC markers
s = s.replace(
"""  const next = ORDER[stops.length];""",
"""  [...npcs, ...animals].forEach((n) => {
    const isAnimal = animals.includes(n);
    x.strokeStyle = isAnimal ? '#4ade80' : '#f59e0b';
    x.lineWidth = 2; x.beginPath();
    x.moveTo(n.from[0] * SCALE, n.from[1] * SCALE);
    x.lineTo(n.to[0] * SCALE, n.to[1] * SCALE); x.stroke();
    [n.from, n.to].forEach((q, k) => {
      x.fillStyle = k ? '#000' : (isAnimal ? '#4ade80' : '#f59e0b');
      x.strokeStyle = isAnimal ? '#4ade80' : '#f59e0b';
      x.beginPath(); x.arc(q[0] * SCALE, q[1] * SCALE, 5, 0, 7);
      x.fill(); x.stroke();
    });
  });
  if (pending) {
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(pending.from[0] * SCALE, pending.from[1] * SCALE, 6, 0, 7); x.fill();
  }

  const next = ORDER[stops.length];""")

s = s.replace(
"""  document.getElementById('who').innerHTML = mode === 'road'
    ? '<b>Click along the road, top to bottom.</b>'
    : (next ? `<b>Click where he stands for: ${next[1]}</b>` : '<b>All seven placed.</b>');
  document.getElementById('count').textContent =
    mode === 'road' ? `${pts.length} road points` : `${stops.length}/7 stops`;
  document.getElementById('out').textContent = mode === 'road'
    ? JSON.stringify(pts)
    : stops.map((s, i) => `${i + 1} ${s.id.padEnd(12)} at=${Math.round(s.at)} (${s.stand})`).join('\\n');""",
"""  const who = document.getElementById('who');
  if (mode === 'road') who.innerHTML = '<b>Click along the road, top to bottom.</b>';
  else if (mode === 'stops') who.innerHTML = next
    ? `<b>Click where he stands for: ${next[1]}</b>` : '<b>All seven placed.</b>';
  else {
    const noun = mode === 'animals' ? 'the animal' : 'the person';
    who.innerHTML = pending
      ? `<b>Now click where ${noun} walks TO.</b>`
      : `<b>Click where ${noun} starts.</b> <span class="hint">two clicks = one patrol</span>`;
  }

  document.getElementById('count').textContent =
    mode === 'road' ? `${pts.length} road points`
    : mode === 'stops' ? `${stops.length}/7 stops`
    : mode === 'people' ? `${npcs.length} people placed`
    : `${animals.length} animals placed`;

  document.getElementById('out').textContent =
    mode === 'road' ? JSON.stringify(pts)
    : mode === 'stops'
      ? stops.map((s, i) => `${i + 1} ${s.id.padEnd(12)} at=${Math.round(s.at)} (${s.stand})`).join('\\n')
      : [...npcs.map((n) => `person ${CAST[n.cast][2].padEnd(20)} ${n.from} -> ${n.to}`),
         ...animals.map((n) => `animal ${CAST[n.cast][2].padEnd(20)} ${n.from} -> ${n.to}`)].join('\\n');""")

# clicking
s = s.replace(
"""  if (mode === 'road') { pts.push(p); pts.sort((a, b) => a[1] - b[1]); }
  else {
    if (stops.length >= ORDER.length) return;
    const { i, pt } = snap(p);
    const [id, label] = ORDER[stops.length];
    stops.push({ id, label, at: cumAt(i), stand: [pt[0], pt[1]] });
  }
  draw();""",
"""  if (mode === 'road') { pts.push(p); pts.sort((a, b) => a[1] - b[1]); }
  else if (mode === 'stops') {
    if (stops.length >= ORDER.length) return;
    const { i, pt } = snap(p);
    const [id, label] = ORDER[stops.length];
    stops.push({ id, label, at: cumAt(i), stand: [pt[0], pt[1]] });
  } else {
    // two clicks make one patrol: where they start, then where they walk to
    if (!pending) { pending = { from: p }; }
    else {
      const ci = Number(artSel.value);
      const [id, kind] = CAST[ci];   // kind follows the mode, the select is filtered
      // index within its own sheet list, which is what walkmap.js expects
      const idx = CAST.filter((c) => c[1] === kind).findIndex((c) => c[0] === id);
      const entry = { from: pending.from, to: p, art: idx, cast: ci,
                      speed: kind === 'animal' ? 0.25 : 0.7 };
      (kind === 'animal' ? animals : npcs).push(entry);
      pending = null;
    }
  }
  draw();""")

s = s.replace(
"""  if (mode === 'road') pts.pop(); else stops.pop();
  draw();""",
"""  if (mode === 'road') pts.pop();
  else if (mode === 'stops') stops.pop();
  else if (pending) pending = null;
  else if (mode === 'animals') animals.pop();
  else npcs.pop();
  draw();""")

s = s.replace(
"""document.getElementById('mStops').onclick = () => {
  mode = 'stops'; mStops.className = ''; mRoad.className = 'alt'; draw();
};""",
"""document.getElementById('mStops').onclick = () => {
  setMode('stops');
};
function setMode(m) {
  mode = m; pending = null;
  for (const [id, val] of [['mRoad', 'road'], ['mStops', 'stops'],
                           ['mPeople', 'people'], ['mAnimals', 'animals']])
    document.getElementById(id).className = (val === m ? '' : 'alt');
  fillCast(); draw();
}
document.getElementById('mPeople').onclick = () => setMode('people');
document.getElementById('mAnimals').onclick = () => setMode('animals');""")
s = s.replace(
"""  mode = 'road'; mRoad.className = ''; mStops.className = 'alt'; draw();""",
"""  setMode('road');""")

s = s.replace(
"""  if (mode === 'road') pts = []; else stops = [];
  draw();""",
"""  if (mode === 'road') pts = [];
  else if (mode === 'stops') stops = [];
  else if (mode === 'animals') { animals = []; pending = null; }
  else { npcs = []; pending = null; }
  draw();""")

# saving
s = s.replace(
"""  } else {
    if (stops.length < ORDER.length) {""",
"""  } else if (mode === 'people' || mode === 'animals') {
    url = '/__save-npcs';
    body = { map: [img.width, img.height], npcs, animals };
  } else {
    if (stops.length < ORDER.length) {""")
s = s.replace(
"""    ? `saved ${mode === 'road' ? 'road_path.json' : 'stops.json'}`""",
"""    ? `saved ${mode === 'road' ? 'road_path.json' : mode === 'stops' ? 'stops.json' : 'npcs.json'}`""")

# load existing npcs too
s = s.replace(
"""  const cur = await (await fetch(`${MAP}/stops.json`)).json();
  stops = cur.stops.map((s) => ({ id: s.id, label: s.id, at: s.at, stand: s.stand }));
  draw();""",
"""  const cur = await (await fetch(`${MAP}/stops.json`)).json();
  stops = cur.stops.map((s) => ({ id: s.id, label: s.id, at: s.at, stand: s.stand }));
  try {
    const n = await (await fetch(`${MAP}/npcs.json`)).json();
    npcs = n.npcs || []; animals = n.animals || [];
  } catch { /* none placed yet */ }
  draw();""")

p.write_text(s, encoding="utf-8")
print("trace.html: NPC mode added")

# ------------------------------------------------------------ vite.config.js
v = ROOT / "vite.config.js"
t = v.read_text(encoding="utf-8")
if "__save-npcs" not in t:
    anchor = ("        writeFileSync('public/assets/pixel/final/stops.json', b);\n"
              "        res.statusCode = 200; res.end('ok');\n      });\n    });")
    add = anchor + ("\n    server.middlewares.use('/__save-npcs', (req, res) => {\n"
                    "      if (req.method !== 'POST') return res.end();\n"
                    "      let b = '';\n"
                    "      req.on('data', (d) => { b += d; });\n"
                    "      req.on('end', () => {\n"
                    "        writeFileSync('public/assets/pixel/final/npcs.json', b);\n"
                    "        res.statusCode = 200; res.end('ok');\n      });\n    });")
    if anchor in t:
        v.write_text(t.replace(anchor, add), encoding="utf-8")
        print("vite.config.js: /__save-npcs added")
    else:
        print("!! vite anchor not found")
else:
    print("vite: already present")
