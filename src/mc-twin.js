/**
 * Multi-City Surface Temperature — five views over 25,905 MODIS readings.
 *
 * SCOPE
 * Everything the deployed Streamlit app shows, in this site's language: the
 * seventeen-city global comparison, the three measured cities as 3D hexbins,
 * the latitude regression with the spread behind it, the fourteen-day record,
 * and the methodology with the pipeline and the Colab profile.
 *
 * THE ONE DESIGN DECISION THAT MATTERS
 * A shared temperature scale. Rendered separately and stretched to its own
 * range, every city looks the same: hot bits and cold bits. On one scale
 * spanning -19.7 to 38.5 C, Dammam glows, Reykjavik goes blue, and the latitude
 * gradient is visible before a word is read. The original Kepler.gl clips were
 * produced one city at a time, which is exactly why the finding needed a
 * scatter plot to explain it.
 *
 * MEASURED IS NEVER DRAWN LIKE ESTIMATED
 * Only three of the seventeen cities are measurements. Seven are the project's
 * own regression, seven are climatology. The payload carries a `kind` per city
 * and the map draws estimates hollow, because a filled dot next to a filled dot
 * claims the same standing for both.
 *
 * TWO WEBGL CONTEXTS, NOT FIVE
 * One deck for the world view, one for the three city panels, created lazily
 * and only once. Browsers cap live contexts and reclaim the oldest.
 */
import './styles/mc-twin.css';
import { Deck, MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';

const DATA = '/assets/data/multicity.json';
const TILES = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';

/* Anchored on freezing, because 0 C is the one temperature that means the same
   thing to every reader without consulting a legend. */
const RAMP = [
  [-20, [8, 47, 73]], [-10, [3, 105, 161]], [0, [125, 211, 252]],
  [10, [167, 214, 178]], [20, [253, 205, 120]], [30, [230, 85, 13]], [40, [153, 20, 20]],
];

const TINT = { Dammam: '#b45309', Dublin: '#0891b2', Reykjavik: '#4f46e5' };

const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function ramp(v) {
  if (v <= RAMP[0][0]) return RAMP[0][1];
  for (let i = 1; i < RAMP.length; i++) {
    if (v <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1];
      const [b, cb] = RAMP[i];
      const f = (v - a) / (b - a);
      return [lerp(ca[0], cb[0], f), lerp(ca[1], cb[1], f), lerp(ca[2], cb[2], f)];
    }
  }
  return RAMP[RAMP.length - 1][1];
}
const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;

function fitCanvas(c) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

function table(el, head, rows, opts = {}) {
  el.innerHTML =
    `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${
      (r.cells || r).map((c, i) => `<td${i && !opts.text ? ' class="mono num"' : ''}>${c}</td>`).join('')
    }</tr>`).join('')}</tbody>`;
}

(async function main() {
  const data = await (await fetch(DATA)).json();
  /* South to north. The CSV order puts the coldest city in the middle, which
     destroys the only thing three side-by-side panels exist to show. */
  const C = [...data.cities].sort((a, b) => a.lat - b.lat);
  const NDAY = data.days.length;
  const M = data.model;

  let view = 'global';
  let day = -1;
  let playing = false;
  let worldKind = 'all';
  let cityDeck = null;
  let worldDeck = null;
  const home = {};

  /* ---- KPI strip ------------------------------------------- */
  const f = data.fitCity;
  $('kpis').innerHTML = [
    [data.n.toLocaleString(), 'MODIS measurements', '3 cities · 14 days', ''],
    [`r = ${f.r}`, 'Latitude vs temperature', 'on city means', 'kpi--accent'],
    [`R² = ${f.r2}`, 'Variance explained', 'latitude alone', 'kpi--accent'],
    [`${(f.slope * 10).toFixed(1)}°C`, 'Per 10° north', `T = ${f.slope}φ + ${f.intercept}`, 'kpi--hot'],
    [`${(data.tRange[1] - data.tRange[0]).toFixed(1)}°C`, 'Total span', `${data.tRange[0]} to ${data.tRange[1]}`, ''],
  ].map(([v, k, s, mod]) =>
    `<div class="kpi ${mod}"><div class="kpi__v">${v}</div><div class="kpi__k">${k}</div>`
    + `<div class="kpi__sub">${s}</div></div>`).join('');

  $('whyBody').innerHTML =
    `Latitude explains <strong>${(f.r2 * 100).toFixed(1)}%</strong> of the variance in city-mean surface temperature `
    + `across the three measured sites, at <strong>${(f.slope * 10).toFixed(1)}°C per ten degrees</strong> north. `
    + `That headline r is computed on city means, which is three points; across all ${data.n.toLocaleString()} `
    + `individual measurements it is ${data.fitPoint.r} (R² = ${data.fitPoint.r2}). Both are on the plot. `
    + `The gap between them is the within-city spread a three-point fit cannot see, and it is where urban heat `
    + `island effects live.`;

  $('southBody').innerHTML =
    `The model was calibrated on <strong>Northern Hemisphere</strong> autumn and early winter. In the Southern `
    + `Hemisphere, late October to November is spring, so Sydney, Buenos Aires and Cape Town all sit far warmer `
    + `than a northern fit predicts. They are excluded from the regression rather than quietly folded in. `
    + `The same caution applies at the tropical end: the model declares a valid range of `
    + `${M.range[0]}°N to ${M.range[1]}°N, and Singapore at 1.35°N is well outside it.`;

  const scaleHTML = RAMP.map(([v, c]) =>
    `<span class="scale__step"><span class="scale__sw" style="background:${rgb(c)}"></span>${v}°</span>`).join('');
  $('scale').innerHTML = scaleHTML;
  $('scaleWorld').innerHTML = scaleHTML;

  /* ══ 1. GLOBAL ═════════════════════════════════════════════ */
  function worldRows() {
    return data.world.filter((w) =>
      worldKind === 'all' || (worldKind === 'measured' ? w.kind === 'measured' : w.kind !== 'measured'));
  }

  function buildWorld() {
    if (!worldDeck) {
      worldDeck = new Deck({
        canvas: 'world',
        views: [new MapView({ id: 'w', controller: true })],
        initialViewState: { longitude: 20, latitude: 28, zoom: 1.1, pitch: 0, bearing: 0 },
        layers: [],
        onHover: (info) => tip(info, (o) =>
          `<b>${o.name}</b><br><span>${o.lat.toFixed(2)}° · ${o.mean.toFixed(1)}°C · ${o.kind}</span>`),
      });
    }
    const rows = worldRows();
    worldDeck.setProps({
      layers: [
        new TileLayer({
          id: 'wbase', data: TILES, minZoom: 0, maxZoom: 10, tileSize: 256,
          renderSubLayers: (p) => {
            const { boundingBox: b } = p.tile;
            return new BitmapLayer(p, { data: null, image: p.data, bounds: [b[0][0], b[0][1], b[1][0], b[1][1]] });
          },
        }),
        // Estimates are hollow. A filled dot beside a filled dot claims equal
        // standing for a measurement and a guess.
        new ScatterplotLayer({
          id: 'wcity', data: rows, pickable: true,
          radiusUnits: 'pixels', getRadius: (d) => (d.kind === 'measured' ? 9 : 7),
          stroked: true, lineWidthUnits: 'pixels', getLineWidth: 2,
          filled: true,
          getPosition: (d) => [d.lon, d.lat],
          getFillColor: (d) => (d.kind === 'measured' ? [...ramp(d.mean), 255] : [...ramp(d.mean), 70]),
          getLineColor: (d) => (d.kind === 'measured' ? [15, 23, 42, 220] : [...ramp(d.mean), 230]),
          updateTriggers: { getFillColor: [worldKind], getLineColor: [worldKind], getRadius: [worldKind] },
        }),
      ],
    });

    const meas = data.world.filter((w) => w.kind === 'measured').length;
    $('worldNote').textContent =
      `${data.world.length} cities, ${meas} measured by MODIS and ${data.world.length - meas} estimated `
      + `(${data.world.filter((w) => w.kind === 'regression').length} from this project's own regression, `
      + `${data.world.filter((w) => w.kind === 'climatology').length} from climatology). `
      + `Residual is the gap from the model; it is not computed for Southern Hemisphere cities, `
      + `which the model does not describe.`;

    table($('worldTable'),
      ['City', 'Lat', 'Mean °C', 'Source', 'Residual'],
      rows.map((w) => ({
        cls: w.kind === 'measured' ? 'is-measured' : '',
        cells: [
          `${esc(w.name)} <span class="dim">${esc(w.country)}</span>`,
          `${w.lat.toFixed(2)}°`,
          `<span style="color:${rgb(ramp(w.mean))};font-weight:700">${w.mean.toFixed(1)}</span>`,
          w.kind === 'measured' ? 'MODIS' : (w.kind === 'regression' ? 'regression' : 'climatology'),
          w.residual === null ? '—'
            : `${w.residual > 0 ? '+' : ''}${w.residual.toFixed(1)}`,
        ],
      })));
  }

  /* ══ 2. CITIES IN 3D ═══════════════════════════════════════ */
  const pointsOf = (c) => {
    const out = [];
    const [ox, oy] = c.origin;
    for (let i = 0; i < c.t.length; i++) {
      if (day >= 0 && c.d[i] !== day) continue;
      out.push({ p: [ox + c.dx[i] / data.scale, oy + c.dy[i] / data.scale], t: c.t[i] / 10 });
    }
    return out;
  };

  function frameCities() {
    const panelW = Math.max(200, $('maps').clientWidth / C.length);
    C.forEach((c) => {
      const [x0, y0, x1, y1] = c.bounds;
      const spanLon = (x1 - x0) / Math.cos((c.lat * Math.PI) / 180);
      const span = Math.max(spanLon, (y1 - y0) * 1.4) * 1.18;
      /* PITCH_GAIN is empirical and has to be. The zoom equation is top-down;
         tilt the camera and it covers far more ground. Measured on this layout
         the formula was about 1.45 zoom levels short. */
      home[c.name] = {
        longitude: (x0 + x1) / 2,
        latitude: (y0 + y1) / 2,
        zoom: Math.log2((panelW * 360) / (256 * span)) + 1.45,
        pitch: 42,
        bearing: 0,
      };
    });
  }

  function buildCities() {
    frameCities();
    if (!cityDeck) {
      cityDeck = new Deck({
        canvas: 'deck',
        views: C.map((c, i) => new MapView({
          id: c.name, x: `${(i * 100) / 3}%`, width: `${100 / 3}%`, controller: true,
        })),
        viewState: { ...home },
        layers: [],
        onViewStateChange: ({ viewState: vs }) => {
          // Locked: comparing three cities at different zooms compares framing,
          // not temperature.
          const next = {};
          C.forEach((c) => {
            next[c.name] = { ...home[c.name], zoom: vs.zoom, pitch: vs.pitch, bearing: vs.bearing };
          });
          cityDeck.setProps({ viewState: next });
        },
        onHover: (info) => tip(info, (o) => {
          const n = o.points ? o.points.length : 0;
          const mean = n ? o.points.reduce((a, p) => a + (p.source ? p.source.t : p.t), 0) / n : 0;
          return `<b>${mean.toFixed(1)}°C</b> mean<br><span>${n} measurements in this bin</span>`;
        }),
      });
    } else {
      cityDeck.setProps({ viewState: { ...home } });
    }

    const layers = [];
    C.forEach((c) => {
      layers.push(new TileLayer({
        id: `b-${c.name}`, data: TILES, minZoom: 0, maxZoom: 19, tileSize: 256,
        renderSubLayers: (p) => {
          const { boundingBox: b } = p.tile;
          return new BitmapLayer(p, { data: null, image: p.data, bounds: [b[0][0], b[0][1], b[1][0], b[1][1]] });
        },
      }));
      layers.push(new HexagonLayer({
        id: `h-${c.name}`, data: pointsOf(c),
        getPosition: (d) => d.p,
        radius: 420, extruded: true, pickable: true, coverage: 0.92,
        elevationScale: 1,
        // MEAN, not the default count. A count-based colour renders all three
        // cities identically and destroys the entire comparison.
        colorAggregation: 'MEAN', getColorWeight: (d) => d.t,
        colorDomain: data.tRange, colorScaleType: 'linear',
        colorRange: RAMP.map(([, col]) => col),
        elevationAggregation: 'MEAN', getElevationWeight: (d) => d.t,
        elevationDomain: data.tRange, elevationRange: [120, 3400],
        material: { ambient: 0.6, diffuse: 0.6, shininess: 40, specularColor: [255, 255, 255] },
        updateTriggers: { data: [day], getColorWeight: [day], getElevationWeight: [day] },
      }));
    });
    cityDeck.setProps({ layers });

    $('mapLabels').innerHTML = C.map((c, i) =>
      `<div class="mlab" style="left:${(i * 100) / 3}%;width:${100 / 3}%">
         <span class="mlab__name">${c.name}</span>
         <span class="mlab__meta mono">${c.lat.toFixed(1)}°N · ${esc(c.climate)}</span>
       </div>`).join('');

    paintCityCards();
  }

  function paintCityCards() {
    $('cityNote').textContent =
      'Sorted by latitude. MODIS needs a cloud-free overpass, so coverage is not equal: '
      + Object.entries(data.coverage).map(([k, v]) => `${k} ${v}/${NDAY}`).join(', ') + '.';
    $('cities').innerHTML = C.map((c) => {
      const row = day >= 0 ? c.daily[day] : null;
      const missing = day >= 0 && !row;
      const mean = day >= 0 ? (row ? row[0] : null) : c.mean;
      const n = day >= 0 ? (row ? row[3] : 0) : c.n;
      return `<div class="city${missing ? ' is-missing' : ''}" style="--tint:${TINT[c.name]}">
        <div class="city__top"><span class="city__name">${c.name}</span>
          <span class="city__lat mono">${c.lat.toFixed(2)}°N</span></div>
        <div class="city__v" style="color:${mean === null ? 'var(--faint)' : rgb(ramp(mean))}">${
          mean === null ? '—' : `${mean.toFixed(1)}°C`}</div>
        <div class="city__meta">${esc(c.country)} · ${esc(c.climate)}</div>
        <div class="city__meta mono">${missing
          ? 'no cloud-free pass this day'
          : `${n.toLocaleString()} readings · ${c.min}° to ${c.max}°`}</div>
        <div class="city__meta mono">σ ${c.std}° · day-to-day σ ${c.dayStd}° · ${data.coverage[c.name]}/${NDAY} days</div>
      </div>`;
    }).join('');
  }

  /* ══ 3. CORRELATION ════════════════════════════════════════ */
  function drawFit() {
    const { ctx, w, h } = fitCanvas($('fit'));
    ctx.clearRect(0, 0, w, h);
    const L = 46, R = 14, T = 12, B = 26;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;
    const x0 = 20, x1 = 70;
    const y0 = data.tRange[0] - 2, y1 = data.tRange[1] + 2;
    const X = (v) => L + ((v - x0) / (x1 - x0)) * pw;
    const Y = (v) => T + ph - ((v - y0) / (y1 - y0)) * ph;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = 'rgba(15,23,42,.07)';
    ctx.fillStyle = '#94a3b8';
    for (let g = 0; g <= 4; g++) {
      const v = y0 + ((y1 - y0) * g) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(`${v.toFixed(0)}°`, L - 7, y + 3);
    }
    ctx.textAlign = 'center';
    for (let lat = 20; lat <= 70; lat += 10) ctx.fillText(`${lat}°N`, X(lat), h - 8);

    C.forEach((c) => {
      const [, oy] = c.origin;
      ctx.fillStyle = TINT[c.name];
      ctx.globalAlpha = 0.13;
      for (let i = 0; i < c.t.length; i += 7) {
        if (day >= 0 && c.d[i] !== day) continue;
        ctx.beginPath();
        ctx.arc(X(oy + c.dy[i] / data.scale), Y(c.t[i] / 10), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    const fp = data.fitPoint;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(15,23,42,.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(fp.slope * x0 + fp.intercept));
    ctx.lineTo(X(x1), Y(fp.slope * x1 + fp.intercept));
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#0369a1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(f.slope * x0 + f.intercept));
    ctx.lineTo(X(x1), Y(f.slope * x1 + f.intercept));
    ctx.stroke();

    C.forEach((c) => {
      ctx.beginPath();
      ctx.arc(X(c.lat), Y(c.mean), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = TINT[c.name]; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 10px Jost, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, X(c.lat), Y(c.mean) - 11);
    });

    $('fitNote').innerHTML =
      `City means (circles) fit r = ${f.r}, R² = ${f.r2}. All ${data.n.toLocaleString()} points (dashed) fit `
      + `r = ${data.fitPoint.r}, R² = ${data.fitPoint.r2}.`;
  }

  /* Box and whisker per city. The three cities differ far more in SPREAD than
     the single-number means suggest, and a mean alone hides that Reykjavik
     swings twice as far as Dammam. */
  function drawBox() {
    const { ctx, w, h } = fitCanvas($('box'));
    ctx.clearRect(0, 0, w, h);
    const L = 46, R = 14, T = 14, B = 28;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;
    const y0 = data.tRange[0] - 2, y1 = data.tRange[1] + 2;
    const Y = (v) => T + ph - ((v - y0) / (y1 - y0)) * ph;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = 'rgba(15,23,42,.07)';
    ctx.fillStyle = '#94a3b8';
    for (let g = 0; g <= 4; g++) {
      const v = y0 + ((y1 - y0) * g) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(`${v.toFixed(0)}°`, L - 7, y + 3);
    }

    const bw = pw / C.length;
    C.forEach((c, i) => {
      const cx = L + bw * (i + 0.5);
      const bwid = Math.min(64, bw * 0.42);
      ctx.strokeStyle = TINT[c.name];
      ctx.fillStyle = TINT[c.name];
      ctx.lineWidth = 1.5;

      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, Y(c.min)); ctx.lineTo(cx, Y(c.max)); ctx.stroke();
      [c.min, c.max].forEach((v) => {
        ctx.beginPath(); ctx.moveTo(cx - 9, Y(v)); ctx.lineTo(cx + 9, Y(v)); ctx.stroke();
      });
      ctx.globalAlpha = 0.18;
      ctx.fillRect(cx - bwid / 2, Y(c.q3), bwid, Y(c.q1) - Y(c.q3));
      ctx.globalAlpha = 1;
      ctx.strokeRect(cx - bwid / 2, Y(c.q3), bwid, Y(c.q1) - Y(c.q3));
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(cx - bwid / 2, Y(c.median)); ctx.lineTo(cx + bwid / 2, Y(c.median)); ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px Jost, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.name, cx, h - 12);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`σ ${c.std}°`, cx, h - 2);
    });
  }

  /* ══ 4. FOURTEEN DAYS ══════════════════════════════════════ */
  function drawTrend() {
    const { ctx, w, h } = fitCanvas($('trend'));
    ctx.clearRect(0, 0, w, h);
    const L = 42, R = 12, T = 12, B = 28;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;
    const lo = data.tRange[0] - 1, hi = data.tRange[1] + 1;
    const X = (d) => L + (d / (NDAY - 1)) * pw;
    const Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = 'rgba(15,23,42,.07)';
    ctx.fillStyle = '#94a3b8';
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(`${v.toFixed(0)}°`, L - 7, y + 3);
    }

    /* Drawn as RUNS of consecutive days. Dublin has no pass on 7 of 14, and a
       single path joins day 2 straight to day 9, drawing a confident line
       through a week that was never measured. */
    C.forEach((c) => {
      const runs = [];
      let cur = [];
      c.daily.forEach((r, d) => {
        if (r) cur.push([d, r]);
        else if (cur.length) { runs.push(cur); cur = []; }
      });
      if (cur.length) runs.push(cur);

      runs.forEach((run) => {
        if (run.length > 1) {
          ctx.beginPath();
          run.forEach(([d, r], k) => (k ? ctx.lineTo(X(d), Y(r[2])) : ctx.moveTo(X(d), Y(r[2]))));
          for (let k = run.length - 1; k >= 0; k--) ctx.lineTo(X(run[k][0]), Y(run[k][1][1]));
          ctx.closePath();
          ctx.fillStyle = TINT[c.name]; ctx.globalAlpha = 0.12; ctx.fill(); ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        run.forEach(([d, r], k) => (k ? ctx.lineTo(X(d), Y(r[0])) : ctx.moveTo(X(d), Y(r[0]))));
        ctx.strokeStyle = TINT[c.name]; ctx.lineWidth = 2; ctx.stroke();
        if (run.length === 1) {
          ctx.beginPath(); ctx.arc(X(run[0][0]), Y(run[0][1][0]), 2.6, 0, Math.PI * 2);
          ctx.fillStyle = TINT[c.name]; ctx.fill();
        }
      });

      c.daily.forEach((r, d) => {
        if (r) return;
        ctx.beginPath(); ctx.arc(X(d), T + ph + 8, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = TINT[c.name]; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
      });
    });

    if (day >= 0) {
      const x = Math.round(X(day)) + 0.5;
      ctx.save(); ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(3,105,161,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    for (let d = 0; d < NDAY; d += 2) ctx.fillText(data.days[d].slice(5), X(d), h - 8);
  }

  function paintDayTables() {
    $('dailyNote').textContent = `Dashes are days with no cloud-free overpass.`;
    table($('dailyTable'),
      ['Date', ...C.map((c) => c.name)],
      data.days.map((dt, d) => ({
        cls: d === day ? 'is-sel' : '',
        cells: [dt.slice(5), ...C.map((c) => {
          const r = c.daily[d];
          return r
            ? `<span style="color:${rgb(ramp(r[0]))};font-weight:700">${r[0].toFixed(1)}</span>`
              + ` <span class="dim">${r[1].toFixed(0)}/${r[2].toFixed(0)}</span>`
            : '<span class="dim">—</span>';
        })],
      })));

    table($('varTable'),
      ['City', 'Day-to-day σ', 'Reading'],
      [...C].sort((a, b) => b.dayStd - a.dayStd).map((c) => ({
        cells: [
          c.name,
          `${c.dayStd.toFixed(2)}°C`,
          c.dayStd > 3 ? 'High — weather driven'
            : c.dayStd > 1.5 ? 'Moderate' : 'Stable — desert climate',
        ],
      })), { text: true });
  }

  /* ══ 5. METHOD ═════════════════════════════════════════════ */
  function paintMethod() {
    $('modelFormula').textContent = `T = ${M.slope} × latitude + ${M.intercept}`;
    table($('modelTable'), ['Metric', 'Value'], [
      ['Correlation r', M.r], ['R²', M.r2],
      ['Slope', `${M.slope} °C per degree`],
      ['Intercept', `${M.intercept} °C`],
      ['Stated prediction error', `± ${M.err} °C`],
      ['Valid range', `${M.range[0]}°N – ${M.range[1]}°N`],
      ['Fitted on', '3 measured cities'],
    ], { text: true });

    table($('pipeTable'), ['Component', 'Technology', 'Metric', 'Purpose'],
      data.pipeline.map((r) => ({ cells: r })), { text: true });

    const total = data.perf[data.perf.length - 1];
    $('perfNote').innerHTML =
      `Total ${total[1]} s. Data extraction alone is ${((data.perf[3][1] / total[1]) * 100).toFixed(0)}% of it, `
      + `and ${data.perf[3][4]} MB of the ${total[4]} MB transferred — Earth Engine API latency, not local compute.`;
    table($('perfTable'), ['Step', 'Time s', 'CPU %', 'Mem %', 'Net MB'],
      data.perf.map((r) => ({ cls: r[0] === 'TOTAL' ? 'is-total' : '', cells: r })));

    drawRes();
  }

  /* Residual against the published model, per city. The point is honesty about
     where the model applies: inside its stated 26-64N band the estimates sit
     close, and the tropical and Southern Hemisphere cities do not. */
  function drawRes() {
    const { ctx, w, h } = fitCanvas($('res'));
    ctx.clearRect(0, 0, w, h);
    const L = 42, R = 14, T = 12, B = 26;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;

    const nh = data.world.filter((x) => x.residual !== null);
    const mx = Math.max(...nh.map((x) => Math.abs(x.residual))) * 1.15 || 1;
    const X = (lat) => L + ((lat - 0) / 75) * pw;
    const Y = (r) => T + ph / 2 - (r / mx) * (ph / 2);

    ctx.strokeStyle = 'rgba(15,23,42,.18)';
    ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(w - R, Y(0)); ctx.stroke();

    // The band the model claims to be valid in.
    ctx.fillStyle = 'rgba(3,105,161,.07)';
    ctx.fillRect(X(M.range[0]), T, X(M.range[1]) - X(M.range[0]), ph);
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0369a1';
    ctx.textAlign = 'center';
    ctx.fillText(`valid ${M.range[0]}–${M.range[1]}°N`, (X(M.range[0]) + X(M.range[1])) / 2, T + 11);

    nh.forEach((x) => {
      const inband = x.lat >= M.range[0] && x.lat <= M.range[1];
      ctx.beginPath();
      ctx.arc(X(x.lat), Y(x.residual), x.kind === 'measured' ? 5 : 3.4, 0, Math.PI * 2);
      ctx.fillStyle = x.kind === 'measured' ? '#0369a1' : (inband ? 'rgba(100,116,139,.75)' : 'rgba(220,38,38,.7)');
      ctx.fill();
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (let lat = 0; lat <= 70; lat += 10) ctx.fillText(`${lat}°`, X(lat), h - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`+${mx.toFixed(0)}°`, L - 6, Y(mx) + 4);
    ctx.fillText(`−${mx.toFixed(0)}°`, L - 6, Y(-mx) + 4);

    const inb = nh.filter((x) => x.lat >= M.range[0] && x.lat <= M.range[1]);
    const maeIn = inb.reduce((a, x) => a + Math.abs(x.residual), 0) / inb.length;
    $('resNote').innerHTML =
      `Inside the stated band the mean absolute residual is <strong>${maeIn.toFixed(2)}°C</strong> `
      + `across ${inb.length} cities. Across all ${nh.length} Northern Hemisphere cities it is `
      + `${M.mae.toFixed(2)}°C — the difference is entirely the tropical cities the model never claimed to cover.`;
  }

  /* ---- shared tooltip ---------------------------------------- */
  function tip(info, fmt) {
    const el = $('tip');
    if (!info || !info.object) { el.hidden = true; return; }
    el.innerHTML = fmt(info.object);
    el.style.left = `${info.x}px`;
    el.style.top = `${info.y}px`;
    el.hidden = false;
  }

  /* ---- view switching ---------------------------------------- */
  function show(v) {
    view = v;
    document.querySelectorAll('.view').forEach((el) => { el.hidden = el.dataset.view !== v; });
    document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('is-on', el.dataset.view === v));
    $('whyPanel').hidden = !(v === 'fit' || v === 'cities');
    // Canvases measure zero while hidden, so every view draws on entry rather
    // than once at startup.
    if (v === 'global') buildWorld();
    if (v === 'cities') buildCities();
    if (v === 'fit') { drawFit(); drawBox(); }
    if (v === 'days') { drawTrend(); paintDayTables(); }
    if (v === 'method') paintMethod();
  }

  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) show(b.dataset.view);
  });

  $('worldFilter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-kind]');
    if (!b) return;
    worldKind = b.dataset.kind;
    $('worldFilter').querySelectorAll('.chip').forEach((x) => x.classList.toggle('is-on', x === b));
    buildWorld();
  });

  function setDay(d) {
    day = d;
    $('dayLabel').textContent = d < 0 ? 'All days' : `${data.days[d]} · ${d + 1}/${NDAY}`;
    $('allDays').classList.toggle('is-on', d < 0);
    if (view === 'cities') buildCities();
    if (view === 'fit') drawFit();
    if (view === 'days') { drawTrend(); paintDayTables(); }
  }

  $('scrub').addEventListener('input', (e) => setDay(Number(e.target.value)));
  $('allDays').addEventListener('click', () => { playing = false; $('playIcon').textContent = '▶'; setDay(-1); });
  $('playBtn').addEventListener('click', () => {
    playing = !playing;
    $('playIcon').textContent = playing ? '❚❚' : '▶';
    if (playing && day < 0) setDay(0);
  });

  window.addEventListener('resize', () => show(view), { passive: true });

  let acc = 0;
  let last = performance.now();
  (function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!playing) return;
    acc += dt;
    if (acc < 0.9) return;
    acc = 0;
    const d = (day + 1) % NDAY;
    $('scrub').value = String(d);
    setDay(d);
  })();

  $('shell').hidden = false;
  show('global');
  $('boot').classList.add('is-done');
  setTimeout(() => { $('boot').style.display = 'none'; }, 450);
})();
