/**
 * Smart City Real-Time IoT Monitoring Dashboard.
 *
 * WHAT THIS REPLACES AND WHY
 * The deployed Streamlit page shows the right things and shows them plainly:
 * default typography, emoji headings, stock Plotly panels stacked down a
 * column. Nothing about it is wrong and nothing about it is memorable. This is
 * the same data and the same pipeline laid out as an operations dashboard: the
 * ingestion path across the top, telemetry and alerting side by side, the nodes
 * and the analytics beneath.
 *
 * THE STREAM IS THE SUBJECT
 * A monitoring dashboard for a streaming system has to be moving or it is a
 * report. One clock drives everything from a single seeded dataset: readings
 * arrive, the pipeline stages carry them, the chart scrolls, alerts land in the
 * feed as they fire. Nothing polls a server; the whole page is a deterministic
 * replay of the project's own generator, and it says so in the footer.
 *
 * WHY THE CHARTS ARE HAND-DRAWN
 * Four small canvases, against a charting library that would be the largest
 * dependency on the page. Canvas keeps the type, grid weight and colour ramp
 * identical to the rest of the site, which a themed library never quite
 * manages, and a streaming redraw is a loop over an array either way.
 *
 * THRESHOLDS ARE NOT THE ORIGINAL'S, DELIBERATELY
 * Streamlit alarms above 30 C. These nodes sit at 32.0 to 43.5 C by design, so
 * that fires on 87.3% of readings and the alert panel conveys nothing. Bands
 * here come from the distribution: p95 warning, p99 critical, per-node IQR for
 * anomalies. The page states the comparison rather than quietly rescaling.
 */
import './styles/iot-twin.css';

const DATA = '/assets/data/iot-dammam.json';

const CLASS = [
  { key: 'normal', name: 'Normal', css: '#7dd3fc', label: 'within band' },
  { key: 'warning', name: 'Warning', css: '#d97706', label: 'above p95' },
  { key: 'critical', name: 'Critical', css: '#dc2626', label: 'above p99' },
  { key: 'anomaly', name: 'Anomaly', css: '#9333ea', label: 'outside node IQR' },
  { key: 'cold', name: 'Cool', css: '#38bdf8', label: 'below p05' },
];

const METRICS = {
  t: { name: 'Temperature', unit: '°C', dp: 1 },
  h: { name: 'Humidity', unit: '%', dp: 0 },
  p: { name: 'Pressure', unit: ' hPa', dp: 0 },
};

/* Ten distinguishable hues, none of which is an alert colour — otherwise a
   perfectly healthy node reads as though it were alarming. */
const SERIES = ['#0369a1', '#0891b2', '#0d9488', '#15803d', '#65a30d',
  '#a16207', '#b45309', '#9a3412', '#7c3aed', '#4f46e5'];

const STAGES = [
  ['Sensors', '10 nodes · 2 min', 1],
  ['MQTT', 'Mosquitto :1883', 1],
  ['Kafka', 'sensor-data :9092', 1],
  ['Spark', '5-min windows', 1 / 2.5],
  ['PostgreSQL', 'readings + aggregates', 1 / 2.5],
];

const WINDOW_H = 6;              // hours in the live chart
const FEED_MAX = 40;

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const fmt = (v, m) => `${v.toFixed(m.dp)}${m.unit}`;

/** Size a canvas to the device, so strokes are crisp rather than doubled. */
function fitCanvas(c) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

(async function main() {
  const data = await (await fetch(DATA)).json();
  const S = data.sensors;
  const N = data.steps;
  const perHour = 60 / data.stepMinutes;

  let metric = 't';
  let cursor = 0;
  let playing = true;
  let speed = 300;               // simulated minutes per real second
  let lastIdx = -1;

  const endMs = new Date(data.endsAt).getTime();
  const startMs = endMs - (N - 1) * data.stepMinutes * 60000;
  const stamp = (i) => new Date(startMs + i * data.stepMinutes * 60000);
  const val = (s, i) => s[metric][Math.floor(i)] / 10;

  /* ---- static scaffolding ------------------------------------ */
  const KPI = [
    ['k-total', 'Readings ingested', ''],
    ['k-rate', 'Ingestion rate', 'kpi--accent'],
    ['k-lat', 'End-to-end latency', 'kpi--accent'],
    ['k-live', 'Nodes reporting', ''],
    ['k-alert', 'Active alerts', 'kpi--hot'],
  ];
  $('kpis').innerHTML = KPI.map(([id, k, mod]) =>
    `<div class="kpi ${mod}"><div class="kpi__v" id="${id}">—</div>`
    + `<div class="kpi__k">${k}</div><div class="kpi__sub" id="${id}-s"></div></div>`).join('');

  $('stages').innerHTML = STAGES.map(([n, sub], i) =>
    `<div class="stage"><div class="stage__name">${n}</div>`
    + `<div class="stage__sub">${sub}</div>`
    + `<div class="stage__rate" data-stage="${i}">—</div></div>`).join('');

  $('nodes').innerHTML = S.map((s) =>
    `<div class="node">
       <div class="node__top"><span class="node__pip"></span><span class="node__name">${s.label}</span></div>
       <div class="node__v">—</div>
       <canvas class="node__spark"></canvas>
     </div>`).join('');
  const nodeEls = [...document.querySelectorAll('.node')];

  $('chartLegend').innerHTML = S.map((s, i) =>
    `<span class="clg"><span class="clg__sw" style="background:${SERIES[i]}"></span>${s.label}</span>`).join('');

  $('whyBody').innerHTML =
    `The original pipeline alarms above <strong>${data.thresholds.genericHigh}°C</strong>. These nodes sit between `
    + `32.0 and 43.5°C by design, so that threshold fires on <strong>${data.thresholds.genericHighShare}%</strong> of all `
    + `readings and cannot separate a hot afternoon from a fault. Bands here are drawn from the data itself: warning `
    + `above ${data.thresholds.warn}°C (p95), critical above ${data.thresholds.critical}°C (p99), anomalies from each `
    + `node's own IQR. Every reading is classified once, into its most severe class, so the counts sum to the `
    + `${data.readings.toLocaleString()} readings rather than exceeding them.`;

  $('distNote').textContent = `All ${data.readings.toLocaleString()} readings, by alert class.`;

  /* ---- clock -------------------------------------------------
     Elapsed real time drives the cursor, so the replay runs at one speed on a
     60 Hz laptop and a 144 Hz monitor. The dt clamp stops a backgrounded tab
     fast-forwarding hours the moment it is focused again. */
  let last = performance.now();
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (playing) cursor = (cursor + (dt * speed) / data.stepMinutes) % N;
    render();
  }

  function render() {
    const i = Math.floor(cursor);
    const ts = stamp(i);
    $('clock').textContent = `${pad(ts.getHours())}:${pad(ts.getMinutes())}`;
    $('date').textContent =
      `${ts.toDateString().slice(0, 10)} · day ${Math.floor(i / (1440 / data.stepMinutes)) + 1}/${data.days}`;
    paintKpis(i);
    paintStages();
    drawFlow();
    drawChart(i);
    paintNodes(i);
    pushAlerts(i);
    drawDist();
    drawCorr(i);
  }

  /* ---- kpis ---------------------------------------------------- */
  function paintKpis(i) {
    const ingested = (i + 1) * S.length;
    const perMin = (S.length / data.stepMinutes) * (speed / 60);
    const alerting = S.filter((s) => [1, 2, 3].includes(s.c[i])).length;

    $('k-total').textContent = ingested.toLocaleString();
    $('k-total-s').textContent = `of ${data.readings.toLocaleString()} in the replay`;
    $('k-rate').textContent = `${Math.round(perMin)}/min`;
    $('k-rate-s').textContent = `${S.length} nodes every ${data.stepMinutes} min at ${speed / 60}×`;
    /* Latency belongs to the pipeline, not to the replay speed, so it does not
       scale with the transport. This is the repo's own measured figure. */
    $('k-lat').textContent = '2.8–4.5s';
    $('k-lat-s').textContent = 'publish to row committed';
    $('k-live').textContent = `${S.length}/${S.length}`;
    $('k-live-s').textContent = 'all nodes healthy';
    $('k-alert').textContent = String(alerting);
    $('k-alert-s').textContent = alerting ? 'nodes outside their band' : 'all nodes within band';

    $('pulse').classList.toggle('is-alert', alerting > 0);
    $('alertNote').textContent = alerting
      ? `${alerting} of ${S.length} nodes currently outside the normal band.`
      : `All ${S.length} nodes within the normal band.`;
  }

  function paintStages() {
    const perMin = (S.length / data.stepMinutes) * (speed / 60);
    document.querySelectorAll('[data-stage]').forEach((el, k) => {
      const r = perMin * STAGES[k][2];
      el.textContent = `${r < 10 ? r.toFixed(1) : Math.round(r)}/min`;
    });
  }

  /* ---- pipeline ------------------------------------------------
     Batches drift along one rail. Their position comes from the stream clock
     rather than a private animation timer, so pausing the stream pauses the
     pipeline and 20x genuinely looks like 20x. */
  function drawFlow() {
    const { ctx, w, h } = fitCanvas($('flow'));
    ctx.clearRect(0, 0, w, h);
    const n = STAGES.length;
    const y = h * 0.5;
    const m = w / (n * 2);
    const xs = STAGES.map((_, k) => m + (k * (w - m * 2)) / (n - 1));

    ctx.strokeStyle = 'rgba(3,105,161,.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xs[0], y);
    ctx.lineTo(xs[n - 1], y);
    ctx.stroke();

    const DOTS = 24;
    for (let d = 0; d < DOTS; d++) {
      const phase = ((cursor * 0.06) + d / DOTS) % 1;
      const x = xs[0] + phase * (xs[n - 1] - xs[0]);
      /* Downstream of Spark the volume drops, because aggregation is the whole
         point of that stage. Showing the same density either side would say the
         opposite. */
      const aggregated = x > xs[3];
      if (aggregated && d % 3 !== 0) continue;
      ctx.beginPath();
      ctx.arc(x, y, aggregated ? 2.4 : 3.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(3,105,161,${(0.25 + 0.55 * Math.sin(phase * Math.PI)).toFixed(3)})`;
      ctx.fill();
    }

    xs.forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(3,105,161,.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2.7, 0, Math.PI * 2);
      ctx.fillStyle = '#0369a1';
      ctx.fill();
    });
  }

  /* ---- live chart ----------------------------------------------- */
  function drawChart(i) {
    const { ctx, w, h } = fitCanvas($('chart'));
    const m = METRICS[metric];
    ctx.clearRect(0, 0, w, h);

    const span = Math.round(WINDOW_H * perHour);
    const from = Math.max(0, i - span);
    const L = 46, R = 12, T = 10, B = 22;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;

    let lo = Infinity;
    let hi = -Infinity;
    for (const s of S) {
      for (let k = from; k <= i; k++) {
        const v = s[metric][k] / 10;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!isFinite(lo)) return;
    const padY = (hi - lo) * 0.12 || 1;
    lo -= padY; hi += padY;

    const X = (k) => L + ((k - from) / Math.max(1, i - from)) * pw;
    const Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = 'rgba(15,23,42,.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(m.dp), L - 8, y + 3);
    }

    ctx.textAlign = 'center';
    for (let k = from; k <= i; k++) {
      const d = stamp(k);
      if (d.getMinutes() !== 0 || d.getHours() % 2 !== 0) continue;
      ctx.fillText(`${pad(d.getHours())}:00`, X(k), h - 6);
    }

    S.forEach((s, si) => {
      ctx.beginPath();
      for (let k = from; k <= i; k++) {
        const x = X(k);
        const y = Y(s[metric][k] / 10);
        if (k === from) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = SERIES[si];
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // The leading value, so "now" is findable on a scrolling chart.
      ctx.beginPath();
      ctx.arc(X(i), Y(s[metric][i] / 10), 2.7, 0, Math.PI * 2);
      ctx.fillStyle = SERIES[si];
      ctx.fill();
    });

    if (metric === 't') {
      [[data.thresholds.warn, '#d97706'], [data.thresholds.critical, '#dc2626']].forEach(([v, col]) => {
        if (v < lo || v > hi) return;
        const y = Math.round(Y(v)) + 0.5;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
        ctx.restore();
      });
    }
  }

  /* ---- nodes ------------------------------------------------------ */
  function paintNodes(i) {
    const m = METRICS[metric];
    const span = Math.round(2 * perHour);
    nodeEls.forEach((el, k) => {
      const s = S[k];
      const cls = CLASS[s.c[i]];
      el.querySelector('.node__pip').style.background = cls.css;
      el.querySelector('.node__v').textContent = fmt(val(s, i), m);
      el.classList.toggle('is-warn', s.c[i] === 1);
      el.classList.toggle('is-hot', s.c[i] === 2);
      el.classList.toggle('is-anom', s.c[i] === 3);

      const { ctx, w, h } = fitCanvas(el.querySelector('.node__spark'));
      ctx.clearRect(0, 0, w, h);
      const from = Math.max(0, i - span);
      let lo = Infinity;
      let hi = -Infinity;
      for (let j = from; j <= i; j++) {
        const v = s[metric][j] / 10;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const rng = hi - lo || 1;
      ctx.beginPath();
      for (let j = from; j <= i; j++) {
        const x = ((j - from) / Math.max(1, i - from)) * w;
        const y = h - 2 - ((s[metric][j] / 10 - lo) / rng) * (h - 4);
        if (j === from) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = cls.css;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });
  }

  /* ---- alert feed --------------------------------------------------
     Only TRANSITIONS into an alert class are events. A node that stays hot for
     an hour is one event, not thirty, and the difference is what keeps the feed
     readable at 20x. The catch-up loop is capped so scrubbing cannot enqueue
     thousands of rows at once. */
  function pushAlerts(i) {
    if (i === lastIdx) return;
    const steps = [];
    if (lastIdx < 0) steps.push(i);
    else for (let k = lastIdx + 1; k <= i && k - lastIdx <= 60; k++) steps.push(k);
    lastIdx = i;

    const fresh = [];
    for (const k of steps) {
      S.forEach((s) => {
        const c = s.c[k];
        const prev = k > 0 ? s.c[k - 1] : 0;
        if (c === 0 || c === prev) return;
        fresh.push({ who: s.label, cls: CLASS[c], t: stamp(k), v: s.t[k] / 10, hh: s.h[k] / 10 });
      });
    }
    const added = fresh.length > 0;
    if (!added) return;

    /* Prepend the new rows and trim the tail, rather than rebuilding innerHTML.
       Rebuilding restarts the entrance animation on EVERY row, so at 5x the
       whole feed sat permanently mid-fade and read as greyed out. Only rows
       that are actually new should animate. */
    const host = $('feed');
    const frag = document.createDocumentFragment();
    for (let k = fresh.length - 1; k >= 0; k--) {
      const f = fresh[k];
      const li = document.createElement('li');
      li.className = 'fitem';
      li.innerHTML =
        `<span class="fitem__bar" style="background:${f.cls.css}"></span>`
        + `<span class="fitem__who">${f.who}</span>`
        + `<span class="fitem__t">${pad(f.t.getHours())}:${pad(f.t.getMinutes())}</span>`
        + `<span class="fitem__what">${f.cls.name} · ${f.cls.label} · ${f.v.toFixed(1)}°C, ${f.hh.toFixed(0)}%</span>`;
      frag.appendChild(li);
    }
    host.prepend(frag);
    while (host.children.length > FEED_MAX) host.lastElementChild.remove();
  }

  /* ---- distribution ------------------------------------------------- */
  function drawDist() {
    const { ctx, w, h } = fitCanvas($('dist'));
    ctx.clearRect(0, 0, w, h);
    const vals = CLASS.map((c) => data.counts[c.key]);
    const max = Math.max(...vals);
    const B = 26;
    const bw = (w - 8) / vals.length;
    ctx.font = '10px "JetBrains Mono", monospace';
    vals.forEach((v, k) => {
      const bh = ((h - B - 16) * v) / max;
      const x = 4 + k * bw;
      ctx.fillStyle = CLASS[k].css;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x + 7, h - B - bh, bw - 14, bh);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.fillText(CLASS[k].name, x + bw / 2, h - B + 14);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`${((v / data.readings) * 100).toFixed(1)}%`, x + bw / 2, h - B - bh - 5);
    });
  }

  /* ---- correlation ---------------------------------------------------
     Sampled every third step, because four thousand dots on a 168px canvas is
     a filled rectangle rather than a scatter. */
  function drawCorr(i) {
    const { ctx, w, h } = fitCanvas($('corr'));
    ctx.clearRect(0, 0, w, h);
    const span = Math.round(WINDOW_H * perHour);
    const from = Math.max(0, i - span);
    const L = 34, B = 20, T = 8, R = 8;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;

    const pts = [];
    for (const s of S) {
      for (let k = from; k <= i; k += 3) pts.push([s.t[k] / 10, s.h[k] / 10, s.c[k]]);
    }
    if (pts.length < 3) return;

    const tx = pts.map((p) => p[0]);
    const hy = pts.map((p) => p[1]);
    const t0 = Math.min(...tx); const t1 = Math.max(...tx);
    const h0 = Math.min(...hy); const h1 = Math.max(...hy);

    ctx.strokeStyle = 'rgba(15,23,42,.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph);
    ctx.stroke();

    pts.forEach(([a, b, cl]) => {
      const x = L + ((a - t0) / (t1 - t0 || 1)) * pw;
      const y = T + ph - ((b - h0) / (h1 - h0 || 1)) * ph;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = CLASS[cl].css;
      ctx.globalAlpha = cl === 0 ? 0.32 : 0.9;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Pearson r on the visible window, computed rather than asserted.
    const n = pts.length;
    const mt = tx.reduce((a, b) => a + b, 0) / n;
    const mh = hy.reduce((a, b) => a + b, 0) / n;
    let num = 0; let dt = 0; let dh = 0;
    for (let k = 0; k < n; k++) {
      num += (tx[k] - mt) * (hy[k] - mh);
      dt += (tx[k] - mt) ** 2;
      dh += (hy[k] - mh) ** 2;
    }
    const r = num / Math.sqrt(dt * dh || 1);
    $('corrNote').textContent =
      `r = ${r.toFixed(3)} over the last ${WINDOW_H} h · ${n.toLocaleString()} sampled readings`;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(`${t0.toFixed(0)}°C`, L, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText(`${t1.toFixed(0)}°C`, L + pw, h - 6);
  }

  /* ---- controls -------------------------------------------------------- */
  $('playBtn').addEventListener('click', () => {
    playing = !playing;
    $('playIcon').textContent = playing ? '❚❚' : '▶';
    last = performance.now();
  });

  $('speedBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-speed]');
    if (!b) return;
    speed = Number(b.dataset.speed);
    $('speedBtns').querySelectorAll('.sbtn').forEach((x) => x.classList.toggle('is-on', x === b));
  });

  $('metricBtns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-metric]');
    if (!b) return;
    metric = b.dataset.metric;
    $('metricBtns').querySelectorAll('.chip').forEach((x) => x.classList.toggle('is-on', x === b));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); $('playBtn').click(); }
  });

  $('shell').hidden = false;
  $('boot').classList.add('is-done');
  setTimeout(() => { $('boot').style.display = 'none'; }, 450);
  loop();
})();
