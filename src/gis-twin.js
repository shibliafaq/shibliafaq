/**
 * Dammam Heat Vulnerability — a 3D twin of the ArcGIS assessment.
 *
 * WHY THIS EXISTS
 * The study produced thirteen A4 map layouts. Flat, separate, and impossible to
 * compare: to see that the Composite HVI floods the map while the Simplified
 * HVI splits it down the middle, you have to hold two sheets side by side and
 * remember what you saw. Here they are thirteen layers over one terrain, so the
 * comparison is a click instead of an act of memory.
 *
 * WHAT IS REAL
 * Every value is the study's own. 12,954 fishnet cells joined 1:1 to the
 * published attribute table; LST converted back out of the min-max
 * normalisation using each year's raster range (2023 recovers 65.83 °C, the
 * figure the paper quotes). Nothing is modelled here, only drawn.
 *
 * The one derived layer is AGREEMENT — how many of the five published HVI
 * models call a cell High. It adds no data; it counts what the five already
 * say, which is the question the four separate sheets cannot answer.
 *
 * WHAT IS ABSENT, AND WHY
 * No Getis-Ord layer. The ArcGIS Gi* output was not kept, and a recomputation
 * did not reproduce the published 4.18x hotspot ratio — so it would be a made-up
 * number wearing the study's authority. The hotspot maps stay as figures in the
 * project card until the Gi_Bin field is exported.
 */
import './styles/gis-twin.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GridCellLayer } from '@deck.gl/layers';

const DATA = '/assets/data/gis-dammam.json';

/* CARTO positron, the same basemap the UHI twin uses. Light, unsaturated, and
   deliberately dull — every strong colour on screen should be data. */
const BASEMAP = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/* ---- colour ramps ------------------------------------------
   Stops are [position 0..1, [r,g,b]]. Interface blue never appears here: the
   chrome is #0369a1 and the data is heat, so the reader never has to wonder
   whether a colour means something. */
const RAMPS = {
  heat: [[0, [254, 243, 199]], [.35, [251, 191, 36]], [.6, [217, 119, 6]], [.82, [220, 38, 38]], [1, [127, 29, 29]]],
  veg: [[0, [241, 245, 249]], [.4, [163, 230, 53]], [.75, [22, 163, 74]], [1, [20, 83, 45]]],
  built: [[0, [248, 250, 252]], [.4, [196, 181, 253]], [.75, [124, 58, 237]], [1, [59, 7, 100]]],
  pop: [[0, [240, 249, 255]], [.4, [125, 211, 252]], [.75, [3, 105, 161]], [1, [8, 47, 73]]],
  hvi: [[0, [254, 249, 195]], [.3, [253, 186, 116]], [.55, [249, 115, 22]], [.8, [220, 38, 38]], [1, [127, 29, 29]]],
};

/* Class layers get discrete swatches, not a gradient — an ordinal scale drawn
   as a continuous ramp invites reading a 2 as "twice a 1". */
const CLASSES = {
  agreement: {
    colors: [[203, 213, 225], [253, 224, 71], [251, 146, 60], [249, 115, 22], [220, 38, 38], [127, 29, 29]],
    names: ['0 — none', '1 model', '2 models', '3 models', '4 models', '5 — all agree'],
  },
  exposure: {
    colors: [[226, 232, 240], [253, 224, 71], [249, 115, 22], [185, 28, 28]],
    names: ['Low', 'Moderate', 'High', 'Very high'],
  },
  /* Gi_Bin shifted from -3..+3 into 0..6. Blue for cold clusters, red for hot,
     neutral in the middle: the convention every Gi* map uses, so a reader who
     has seen one anywhere can read this one without the legend. */
  hotspot: {
    colors: [
      [44, 123, 182], [123, 177, 214], [190, 215, 232],
      [226, 232, 240],
      [253, 174, 97], [244, 109, 67], [215, 25, 28],
    ],
    names: [
      '99% cold spot', '95% cold spot', '90% cold spot',
      'not significant',
      '90% hot spot', '95% hot spot', '99% hot spot',
    ],
  },
};

/* ---- the layers --------------------------------------------
   `take` is the point of the whole thing: what a planner should conclude, not
   what the raster contains. Figures in it are computed at runtime from the
   payload wherever possible, so the prose cannot drift from the data. */
const LAYERS = [
  {
    group: 'Inputs', key: 'lst2023', name: 'Surface temp 2023', ramp: 'heat', unit: '°C', dp: 1,
    formula: 'Landsat 8/9 TIRS brightness temperature, emissivity corrected, zonal mean per 500 m cell',
    note: 'Ground temperature, not air temperature. Height and colour both follow the reading.',
    take: 'The hottest ground is industrial and bare rather than residential. Ranking by temperature alone sends cooling money to where <strong>nobody lives</strong>.',
  },
  {
    group: 'Inputs', key: 'lst2020', name: 'Surface temp 2020', ramp: 'heat', unit: '°C', dp: 1,
    formula: 'Landsat 8/9 TIRS, zonal mean per cell',
    note: 'The same measurement three years earlier, and the baseline for change.',
    take: 'Set against 2023 and 2025 the pattern barely moves. That makes this urban structure rather than a hot year.',
  },
  {
    group: 'Inputs', key: 'lst2025', name: 'Surface temp 2025', ramp: 'heat', unit: '°C', dp: 1,
    formula: 'Landsat 8/9 TIRS, zonal mean per cell',
    note: 'The most recent thermal capture in the series.',
    take: 'Peak temperature climbs while the metro mean does not. The extremes are stretching rather than the whole city warming.',
  },
  {
    group: 'Inputs', key: 'ndbi2023', name: 'Built-up index', ramp: 'built', unit: '', dp: 3,
    formula: 'NDBI = (SWIR − NIR) / (SWIR + NIR)',
    note: 'Sentinel-2 MSI. The share of each cell that is impervious built surface.',
    take: 'NDBI explains <strong>51%</strong> of the variance in temperature (R² = 0.511). In an arid city the built surface drives heat far harder than missing vegetation does.',
  },
  {
    group: 'Inputs', key: 'ndvi2023', name: 'Vegetation index', ramp: 'veg', unit: '', dp: 3,
    formula: 'NDVI = (NIR − Red) / (NIR + Red)',
    note: 'Green cover, the variable temperate-city studies usually lead with.',
    take: 'Sparse and fragmented across the metro, and a weak predictor here. Planting alone will not cool Dammam; surface and materials will.',
  },
  {
    group: 'Inputs', key: 'pop2020', name: 'Population', ramp: 'pop', unit: ' people', dp: 0,
    formula: 'WorldPop 2020 at 100 m, zonal SUM into each 500 m cell',
    note: 'The exposure term. Who is actually standing in the heat.',
    take: 'Population concentrates where temperature does not. That mismatch is the whole reason a vulnerability index exists.',
  },

  {
    group: 'Vulnerability models', key: 'hviSimple', name: 'Simplified HVI', ramp: 'hvi', unit: '', dp: 3,
    formula: 'HVI_Simple = 0.60 × LST_norm + 0.40 × Pop_norm',
    note: 'Two variables only, weighted toward heat. The most balanced of the five.',
    take: 'Splits the metro almost evenly, 49.2% Moderate against 47.1% High. Same cells and same data as the model below, with a different answer.',
  },
  {
    group: 'Vulnerability models', key: 'hviComposite', name: 'Composite HVI', ramp: 'hvi', unit: '', dp: 3,
    formula: 'HVI_Composite = (LST_norm + NDBI_norm + Pop_norm + (1 − NDVI_norm)) / 4',
    note: 'All four dimensions at equal weight. The published headline model.',
    take: 'Places <strong>92.6%</strong> of the metro in the High class. A model that selects almost everything cannot prioritise anything.',
  },
  {
    group: 'Vulnerability models', key: 'hviHeat', name: 'Heat-weighted', ramp: 'hvi', unit: '', dp: 3,
    formula: '0.40 × LST + 0.25 × Pop + 0.20 × NDBI + 0.15 × (1 − NDVI)',
    note: 'Sensitivity run with temperature given the single highest weight.',
    take: 'Vulnerability tracks the thermal surface and drifts away from where the residents are. 89.3% High.',
  },
  {
    group: 'Vulnerability models', key: 'hviPop', name: 'Population-weighted', ramp: 'hvi', unit: '', dp: 3,
    formula: '0.35 × Pop + 0.35 × LST + 0.20 × NDBI + 0.10 × (1 − NDVI)',
    note: 'Sensitivity run lifting population to co-primary status with heat.',
    take: 'The inverse case. Vulnerability collapses onto the residential core and 51.7% lands in High, because people sit off the peak heat.',
  },
  {
    group: 'Vulnerability models', key: 'hviBuilt', name: 'Built-up-weighted', ramp: 'hvi', unit: '', dp: 3,
    formula: '0.35 × NDBI + 0.30 × LST + 0.20 × Pop + 0.15 × (1 − NDVI)',
    note: 'Sensitivity run led by built surface, motivated by the regression result.',
    take: 'Nearly indistinguishable from the Composite at 92.3% High. The built term is most of what the Composite was measuring all along.',
  },

  {
    group: 'Synthesis', key: 'agreement', name: 'Model agreement', cls: 'agreement', unit: ' models', dp: 0,
    formula: 'count of the five weightings scoring this cell above 0.50',
    /* Named explicitly, because "five models" means nothing without the list.
       They are not five separate studies. They are the two published HVI models
       plus the three sensitivity re-weightings the paper used to test whether
       the Composite's conclusions survive a different set of weights. */
    models: [
      ['Composite HVI', '(LST + NDBI + Pop + (1−NDVI)) / 4'],
      ['Simplified HVI', '0.60 LST + 0.40 Pop'],
      ['Heat-weighted', '0.40 LST · 0.25 Pop · 0.20 NDBI · 0.15 (1−NDVI)'],
      ['Population-weighted', '0.35 Pop · 0.35 LST · 0.20 NDBI · 0.10 (1−NDVI)'],
      ['Built-up-weighted', '0.35 NDBI · 0.30 LST · 0.20 Pop · 0.15 (1−NDVI)'],
    ],
    note: 'How many of the five weightings listed below call this cell High or Very High. No new data, only a count of what the published models already say.',
    take: 'Where all five agree the finding survives any weighting. Where they split, the answer is an artefact of <strong>model choice</strong> rather than of the city.',
  },
  {
    group: 'Hot spot clustering', key: 'hotspotLst', name: 'Gi* on temperature', cls: 'hotspot', unit: '', dp: 0,
    formula: 'Getis-Ord Gi*, fixed 1,000 m band, FDR corrected. 99% class = Gi_Bin +3',
    note: 'Where high temperature clusters more than chance allows. Run in ArcGIS Pro on the study fishnet.',
    take: 'The temperature-only priority area is <strong>120.8 km\u00b2</strong>, 3.7% of the metro, and it sits on the western industrial corridor. Heat clusters tightly, and it clusters away from the residents.',
  },
  {
    group: 'Hot spot clustering', key: 'hotspotHvi', name: 'Gi* on Composite HVI', cls: 'hotspot', unit: '', dp: 0,
    formula: 'Getis-Ord Gi*, fixed 1,000 m band, FDR corrected. 99% class = Gi_Bin +3',
    note: 'The same statistic on the multi-factor index rather than on temperature alone.',
    take: 'The same test on vulnerability returns <strong>505.0 km\u00b2</strong>, which is 4.18 times the temperature-only footprint. Switch between these two layers: that gap is the whole argument for a vulnerability index over a heat map.',
  },
  {
    group: 'Synthesis', key: 'exposure', name: 'Exposure class', cls: 'exposure', unit: '', dp: 0,
    formula: 'Moderate: LST_norm > 0.50 AND Pop_norm > 0.50 · High: both > 0.60 · Very high: both > 0.70',
    note: 'The strict reading. Heat and population must both exceed the threshold in the same cell, so this is AND rather than a weighted sum.',
    take: 'Only <strong>229 cells, 57.3 km²</strong>, which is 1.8% of the metropolitan area. This is the list a budget can actually act on.',
  },
];

const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;

function rampColor(stops, t) {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (x <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const f = (x - p0) / (p1 - p0 || 1);
      return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)];
    }
  }
  return stops[stops.length - 1][1];
}

const rgb = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;

(async function main() {
  const res = await fetch(DATA);
  const data = await res.json();

  const byKey = Object.fromEntries(LAYERS.map((l) => [l.key, l]));
  let active = 'lst2023';
  let exaggeration = 1;
  let priority = false;
  let method = 'jenks';
  let hovered = null;

  /* One row per cell, built once. deck.gl re-reads accessors on every layer
     rebuild, so the array stays put and only the accessors change — rebuilding
     12,954 objects per interaction would be the whole frame budget. */
  const cells = new Array(data.n);
  for (let i = 0; i < data.n; i++) {
    cells[i] = { i, lon: data.lon[i], lat: data.lat[i] };
  }

  /** Cells to draw. Priority mode filters rather than recolours: dimming the
   *  rest still leaves 12,000 columns between the eye and the 229 that matter. */
  const visible = () => {
    if (!priority) return cells;
    const ex = data.layers.exposure.v;
    return cells.filter((c) => ex[c.i] === 3);
  };

  /* ---- contrast ------------------------------------------------
     Measured, because the eye was being lied to. The middle HALF of the cells
     occupies 10.9% of the LST range, 15.4% of the Composite HVI range and 3.4%
     of the NDBI range — so a linear min-max scale spends 85-97% of its colour
     and its height on a handful of outliers and renders the city as a plateau.

     Two devices, each doing the job it is good at:

     COLOUR is CLASSIFIED by equal count (quantile breaks). Every class holds a
     fifth of the cells, so all five colours are always used and the contrast is
     the same on every layer. This is also the study's own idiom — the ArcGIS
     legends are classified, with unequal widths, for exactly this reason. The
     legend prints the real value range of each class, so classification buys
     contrast without hiding what the numbers are.

     HEIGHT is by RANK, continuously. Classified height would give five terraces
     and lose the shape inside each class; rank keeps fine relief while still
     using the whole vertical range. Median cell, mid height, always.

     Both are cached per layer on first use. */
  const CLASS_N = 5;
  const stats = {};
  const breakCache = {};

  /* ---- classification -------------------------------------------
     Which method is used changes which cells are called vulnerable, so the
     legend names it rather than leaving the reader to assume.

     JENKS (natural breaks) is the default and is what the study's own ArcGIS
     maps use. It puts the cuts where the data is already sparse, minimising
     variance inside each class, so a class means "these cells resemble each
     other" rather than "these cells were the next twenty per cent".

     QUANTILE gives every class exactly a fifth of the cells. Even contrast,
     but on a peaked distribution the bottom class swallows a huge value range
     (0.204 to 0.534 on the built-up model) and reads as under-classified.

     EQUAL INTERVAL cuts the value range into five equal widths. Honest about
     magnitude and useless here: 97% of cells land in one or two classes. */
  const METHODS = {
    jenks:    'Natural breaks (Jenks)',
    quantile: 'Equal count (quantile)',
    equal:    'Equal interval',
  };

  /** Exact Fisher-Jenks, on the data reduced to weighted bins.
   *
   *  The textbook dynamic program is O(n^2 k), which on 12,954 values is about
   *  840 million inner steps per layer and would lock the page. Collapsing to
   *  200 weighted quantile bins first makes it 200^2 * 5, which is instant, and
   *  the breaks are indistinguishable because a break never falls inside a bin
   *  that holds 65 near-identical values. */
  function jenksBreaks(sorted, k) {
    const M = Math.min(200, sorted.length);
    const mean = [];
    const hi = [];
    const wt = [];
    for (let i = 0; i < M; i++) {
      const a = Math.floor((i * sorted.length) / M);
      const b = Math.floor(((i + 1) * sorted.length) / M);
      if (b <= a) continue;
      let sum = 0;
      for (let j = a; j < b; j++) sum += sorted[j];
      mean.push(sum / (b - a));
      hi.push(sorted[b - 1]);
      wt.push(b - a);
    }
    const m = mean.length;
    if (m <= k) return hi.slice();

    // Prefix sums, so the cost of any run is O(1).
    const w = new Float64Array(m + 1);
    const ws = new Float64Array(m + 1);
    const wss = new Float64Array(m + 1);
    for (let i = 0; i < m; i++) {
      w[i + 1] = w[i] + wt[i];
      ws[i + 1] = ws[i] + wt[i] * mean[i];
      wss[i + 1] = wss[i] + wt[i] * mean[i] * mean[i];
    }
    const sse = (a, b) => {
      const n = w[b] - w[a];
      if (n <= 0) return 0;
      const t = ws[b] - ws[a];
      return (wss[b] - wss[a]) - (t * t) / n;
    };

    const cost = [];
    const back = [];
    for (let c = 0; c <= k; c++) {
      cost.push(new Float64Array(m + 1).fill(Infinity));
      back.push(new Int32Array(m + 1));
    }
    cost[0][0] = 0;
    for (let c = 1; c <= k; c++) {
      for (let i = c; i <= m; i++) {
        for (let j = c - 1; j < i; j++) {
          const v = cost[c - 1][j] + sse(j, i);
          if (v < cost[c][i]) { cost[c][i] = v; back[c][i] = j; }
        }
      }
    }
    const cuts = [];
    let i = m;
    for (let c = k; c >= 1; c--) {
      cuts.unshift(hi[i - 1]);
      i = back[c][i];
    }
    return cuts;
  }

  function quantileBreaks(sorted, k) {
    const out = [];
    for (let i = 1; i <= k; i++) {
      out.push(sorted[Math.min(sorted.length - 1, Math.round((i / k) * (sorted.length - 1)))]);
    }
    return out;
  }

  function equalBreaks(sorted, k) {
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const out = [];
    for (let i = 1; i <= k; i++) out.push(lo + ((hi - lo) * i) / k);
    return out;
  }

  function breaks(key) {
    const id = key + ':' + method;
    if (breakCache[id]) return breakCache[id];
    const { sorted } = stat(key);
    const fn = method === 'quantile' ? quantileBreaks
             : method === 'equal' ? equalBreaks
             : jenksBreaks;
    breakCache[id] = fn(sorted, CLASS_N);
    return breakCache[id];
  }

  function stat(key) {
    if (stats[key]) return stats[key];
    const raw = data.layers[key].v;
    const sorted = raw.filter((v) => v != null).sort((a, b) => a - b);

    // Rank per cell, precomputed once: a binary search per cell per frame would
    // be 12,954 searches every time the camera moves.
    const rank = new Float32Array(raw.length);
    const n = sorted.length;
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (v == null) { rank[i] = 0; continue; }
      let lo = 0, hi = n - 1, m;
      while (lo < hi) { m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
      rank[i] = n > 1 ? lo / (n - 1) : 0;
    }

    stats[key] = { sorted, rank, lo: sorted[0], hi: sorted[n - 1] };
    return stats[key];
  }

  /** Which of the CLASS_N classes a value falls in. */
  function classOf(key, raw) {
    const cuts = breaks(key);
    for (let i = 0; i < cuts.length; i++) if (raw <= cuts[i]) return i;
    return cuts.length - 1;
  }

  function colorOf(cell) {
    const spec = byKey[active];
    const raw = data.layers[active].v[cell.i];
    if (raw == null) return [0, 0, 0, 0];
    if (spec.cls) {
      const c = CLASSES[spec.cls].colors[Math.round(raw)] || [200, 200, 200];
      return [...c, 240];
    }
    const k = classOf(active, raw);
    return [...rampColor(RAMPS[spec.ramp], k / (CLASS_N - 1)), 240];
  }

  function elevationOf(cell) {
    const raw = data.layers[active].v[cell.i];
    if (raw == null) return 0;
    const spec = byKey[active];
    // Ordinal layers step by their own value; continuous layers ride the rank.
    const t = spec.cls
      ? raw / (CLASSES[spec.cls].colors.length - 1)
      : stat(active).rank[cell.i];
    // A floor so the lowest cells read as ground rather than as holes, and a
    // deliberately tall ceiling — this is a 44 km wide city, and relief has to
    // survive being seen from across it.
    return (80 + t * 7200) * exaggeration;
  }

  function build() {
    return new GridCellLayer({
      id: 'cells',
      data: visible(),
      cellSize: data.cell,
      extruded: true,
      pickable: true,
      elevationScale: 1,
      getPosition: (d) => [d.lon, d.lat],
      getFillColor: colorOf,
      getElevation: elevationOf,
      material: { ambient: 0.55, diffuse: 0.6, shininess: 32, specularColor: [255, 255, 255] },
      updateTriggers: {
        getFillColor: [active, priority],
        getElevation: [active, exaggeration, priority],
      },
      onHover: (info) => {
        hovered = info.object ? info : null;
        paintTip();
      },
      transitions: { getElevation: 320, getFillColor: 260 },
    });
  }

  /* ---- map ---------------------------------------------------- */
  const map = new maplibregl.Map({
    container: 'map',
    style: BASEMAP,
    center: [data.centreLon, data.centreLat],
    zoom: 8.6,
    pitch: 52,
    bearing: -14,
    attributionControl: false,
    antialias: true,
  });

  const overlay = new MapboxOverlay({ interleaved: false, layers: [] });

  const HOME = { center: [data.centreLon, data.centreLat], zoom: 8.6, pitch: 52, bearing: -14 };

  map.on('load', () => {
    map.addControl(overlay);
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    refresh();
    ['chrome-nav', 'chrome-left', 'chrome-right', 'chrome-bottom'].forEach((id) => { $(id).hidden = false; });
    const boot = $('boot');
    boot.classList.add('is-done');
    setTimeout(() => { boot.style.display = 'none'; }, 450);
  });

  function refresh() {
    overlay.setProps({ layers: [build()] });
    paintReadout();
  }

  /* ---- tooltip ------------------------------------------------ */
  function paintTip() {
    const tip = $('tip');
    if (!hovered) { tip.hidden = true; return; }
    const spec = byKey[active];
    const raw = data.layers[active].v[hovered.object.i];
    if (raw == null) { tip.hidden = true; return; }
    const label = spec.cls
      ? CLASSES[spec.cls].names[Math.round(raw)]
      : `${raw.toFixed(spec.dp)}${spec.unit}`;
    tip.innerHTML = `<b>${label}</b><br><span>${spec.name}</span>`;
    tip.style.left = `${hovered.x}px`;
    tip.style.top = `${hovered.y}px`;
    tip.hidden = false;
  }

  /* ---- readout ------------------------------------------------ */
  function paintReadout() {
    const spec = byKey[active];
    const layer = data.layers[active];

    $('navLayer').textContent = spec.name;
    $('readTitle').textContent = spec.name;
    $('readNote').textContent = spec.note;
    $('takeBody').innerHTML = spec.take;

    // The formula, in the study's own terms. A vulnerability index IS a
    // weighting decision, so a reader who cannot see the weights cannot judge
    // the map, which is the whole reason five of them are on offer.
    const fx = $('formula');
    fx.hidden = !spec.formula;
    if (spec.formula) fx.textContent = spec.formula;

    const ml = $('models');
    ml.innerHTML = '';
    ml.hidden = !spec.models;
    if (spec.models) {
      spec.models.forEach(([name, f]) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="models__name">' + name + '</span>'
                     + '<span class="models__fx mono">' + f + '</span>';
        ml.appendChild(li);
      });
    }

    const fmt = (v) => `${v.toFixed(spec.dp)}${spec.unit}`;
    $('navRange').textContent = spec.cls
      ? `${data.n.toLocaleString()} cells`
      : `${fmt(layer.min)} — ${fmt(layer.max)}`;

    /* KPIs are computed here, never written into the copy, so they cannot go
       stale against a re-bake. */
    if (spec.key === 'agreement') {
      const all = layer.v.filter((v) => v === 5).length;
      const none = layer.v.filter((v) => v === 0).length;
      $('kpiA').textContent = `${(all * 0.25).toFixed(0)} km²`;
      $('capA').textContent = `all five models agree (${all.toLocaleString()} cells)`;
      $('kpiB').textContent = `${(none * 0.25).toFixed(0)} km²`;
      $('capB').textContent = `no model flags (${none.toLocaleString()} cells)`;
    } else if (spec.cls === 'hotspot') {
      const hot = layer.v.filter((v) => v === 6).length;      // 99%
      const cold = layer.v.filter((v) => v === 0).length;     // 99% cold
      $('kpiA').textContent = `${(hot * 0.25).toFixed(1)} km\u00b2`;
      $('capA').textContent = `99% hot spot — ${hot.toLocaleString()} cells`;
      $('kpiB').textContent = `${(cold * 0.25).toFixed(1)} km\u00b2`;
      $('capB').textContent = `99% cold spot — ${cold.toLocaleString()} cells`;
    } else if (spec.key === 'exposure') {
      const vh = layer.v.filter((v) => v === 3).length;
      const hi = layer.v.filter((v) => v === 2).length;
      $('kpiA').textContent = `${(vh * 0.25).toFixed(1)} km²`;
      $('capA').textContent = `very high — ${vh} cells`;
      $('kpiB').textContent = `${(hi * 0.25).toFixed(0)} km²`;
      $('capB').textContent = `high — ${hi.toLocaleString()} cells`;
    } else {
      const vals = layer.v.filter((v) => v != null);
      const hot = vals.filter((v) => v >= layer.min + (layer.max - layer.min) * 0.75).length;
      $('kpiA').textContent = fmt(layer.mean);
      $('capA').textContent = 'metro mean';
      $('kpiB').textContent = fmt(layer.max);
      $('capB').textContent = `peak · top quartile in ${(hot * 0.25).toFixed(0)} km²`;
    }

    paintLegend();
  }

  function paintLegend() {
    const spec = byKey[active];
    const layer = data.layers[active];
    const host = $('legend');
    host.innerHTML = '';
    const row = (color, text, tail) => {
      const el = document.createElement('div');
      el.className = 'legend__row';
      el.innerHTML = `<span class="legend__sw" style="background:${color}"></span>`
        + `<span class="legend__txt">${text}</span>`
        + (tail ? `<span class="legend__n mono">${tail}</span>` : '');
      host.appendChild(el);
    };
    if (spec.cls) {
      const c = CLASSES[spec.cls];
      const counts = {};
      let total = 0;
      layer.v.forEach((v) => { if (v != null) { counts[v] = (counts[v] || 0) + 1; total++; } });
      c.names.forEach((n, i) => {
        const k = counts[i] || 0;
        row(rgb(c.colors[i]), n, `${k.toLocaleString()} · ${((k / total) * 100).toFixed(1)}%`);
      });
      $('legendMethod').textContent = spec.cls === 'hotspot'
        ? 'ArcGIS Gi_Bin, FDR corrected'
        : 'Published classes, not derived';
    } else {
      const cuts = breaks(active);
      const { lo } = stat(active);
      const f = (v) => `${v.toFixed(spec.dp)}${spec.unit}`;
      // Count per class, so an over-full class is visible rather than implied.
      const counts = new Array(CLASS_N).fill(0);
      let total = 0;
      layer.v.forEach((v) => { if (v != null) { counts[classOf(active, v)]++; total++; } });
      for (let i = CLASS_N - 1; i >= 0; i--) {
        const from = i === 0 ? lo : cuts[i - 1];
        const pct = ((counts[i] / total) * 100).toFixed(1);
        row(rgb(rampColor(RAMPS[spec.ramp], i / (CLASS_N - 1))),
            `${f(from)} – ${f(cuts[i])}`, `${counts[i].toLocaleString()} · ${pct}%`);
      }
      $('legendMethod').textContent = METHODS[method];
    }
  }

  /* ---- layer buttons ------------------------------------------ */
  const groups = {};
  LAYERS.forEach((l) => { (groups[l.group] ||= []).push(l); });
  const host = $('layerGroups');
  Object.entries(groups).forEach(([name, items]) => {
    const wrap = document.createElement('div');
    wrap.className = 'lgroup';
    wrap.innerHTML = `<p class="lgroup__name">${name}</p>`;
    items.forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `lbtn${l.key === active ? ' is-on' : ''}`;
      b.textContent = l.name;
      b.dataset.layer = l.key;
      b.addEventListener('click', () => {
        active = l.key;
        // The tip belongs to the layer that was under the cursor; leaving it up
        // labels the new layer with the old layer's value and unit.
        hovered = null;
        paintTip();
        host.querySelectorAll('.lbtn').forEach((x) => x.classList.toggle('is-on', x.dataset.layer === active));
        refresh();
      });
      wrap.appendChild(b);
    });
    host.appendChild(wrap);
  });

  /* ---- controls ------------------------------------------------ */
  document.querySelectorAll('[data-method]').forEach((b) => {
    b.addEventListener('click', () => {
      method = b.dataset.method;
      document.querySelectorAll('[data-method]').forEach((x) =>
        x.classList.toggle('is-on', x.dataset.method === method));
      refresh();
    });
  });

  $('exag').addEventListener('input', (e) => {
    exaggeration = Number(e.target.value) / 100;
    $('exagOut').textContent = `${exaggeration.toFixed(1)}×`;
    refresh();
  });

  $('resetView').addEventListener('click', () => {
    map.easeTo({ ...HOME, duration: 900 });
  });

  $('priorityBtn').addEventListener('click', () => {
    priority = !priority;
    $('chrome-bottom').classList.toggle('is-on', priority);
    $('priorityBtn').lastElementChild.textContent = priority ? 'Show all cells' : 'Isolate priority zones';
    $('priorityNote').textContent = priority
      ? 'Showing only cells where high heat and high population coincide'
      : '229 cells · 57.3 km² · high heat and high population together';
    if (priority) {
      // Drop to the deck when isolating: 229 columns on a metro-wide frame are
      // invisible from the default altitude.
      map.easeTo({ zoom: 9.6, pitch: 58, duration: 900 });
    }
    refresh();
  });
})();
