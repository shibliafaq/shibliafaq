/**
 * Global Surface Temperature — 82 cities, Landsat at 30 m.
 *
 * WHY LANDSAT
 * Measured rather than assumed. Open-Meteo resolved 21 distinct cells across
 * 40 km of Dammam; Landsat resolves 892 x 805 pixels over the same window. MODIS
 * gave 617 cells per city. At 10 km a city is one or two cells and urban
 * structure does not exist; at 30 m the industrial corridor separates from the
 * parks. Frames here are 96 x 96 read through the COG overviews, which is 9,216
 * cells per city per date and ten times faster to fetch than full resolution
 * for statistics that survive intact.
 *
 * WHY TWO REGRESSIONS AND NOT ONE
 * Because the hemispheres are in opposite seasons and the pooled fit is weaker
 * than either half: r = -0.890 north, -0.499 south, and pooling them loses
 * information rather than adding it. A single line across both would describe
 * neither. The southern group also spans only 34 degrees against the north's 70,
 * because in this longitude corridor the land runs out at Cape Agulhas — a fact
 * about the planet, not a gap in the sampling, and the page says so.
 *
 * WHY DARK
 * This is thermal imagery, and thermal imagery sits on black. A 30 m heat
 * surface on a pale panel loses its top two stops before it reaches the eye.
 * The glass panels float over the map rather than boxing it away, which only
 * works on a dark ground.
 *
 * ONE FILE PER CITY, LOADED ON DEMAND
 * 36 MB across 82 cities. Nobody looks at 82 cities, so nobody downloads them:
 * the index is 20 KB and a city is ~500 KB fetched when it is clicked.
 */
import './styles/lst-twin.css';
import { Deck, MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { SolidPolygonLayer } from '@deck.gl/layers';

const INDEX = '/assets/data/lst/index.json';
const CITY = (s) => `/assets/data/lst/${s}.json`;
/* Esri Dark Gray Canvas rather than CARTO dark matter. Both are free and both
   are dark, but CARTO's is nearly featureless at city zoom over desert — the
   thermal surface floated on black with no context at all. Esri's carries roads,
   coastline and terrain shading while staying dark enough that the heat surface
   is still the only bright thing on screen.
   Note the tile path is {z}/{y}/{x}, not the usual {z}/{x}/{y}. */
const TILES = 'https://services.arcgisonline.com/ArcGIS/rest/services/'
  + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

/* Deep indigo through ice and teal into gold, with no white anywhere.

   Three rejected attempts are worth recording, because each failed for a
   different measurable reason. Inferno's dark end is near-black, so cool ground
   sank into the dark basemap and the coldest cities rendered as holes. A
   blue-through-pale-to-red diverging ramp fixed that and introduced a worse
   one: the pale midpoint reads as blank, so the middle of every city looked
   like missing data. The third turned cool-to-warm through sand, which is the
   same mistake wearing a warmer name — scored in CIELAB it put 22 near-grey
   samples on the scale, starting right at the middle where most cells sit.

   The constraint that actually drives the design is not the endpoints. A single
   scene occupies only about a third of this scale (see `robustRange`), so it is
   not enough for cold and hot to differ — every one-third window has to differ
   from ITSELF, or a whole city renders one flat colour. That is measurable, so
   it was measured: this ramp turns through teal rather than sand, holds L*
   rising from 11 to 83 without a reversal, keeps every 5% step above dE 7, and
   has zero low-chroma samples. Across a realistic scene window it moves dE 46
   to 68, where 2.3 is a just-noticeable difference. */
const RAMP = [
  [0,    [ 16,  26,  71]],   // deep indigo
  [0.14, [ 26,  68, 138]],   // blue
  [0.28, [ 33, 118, 172]],   // ocean
  [0.42, [ 64, 163, 190]],   // ice
  [0.56, [110, 180, 164]],   // teal, the cool-to-warm turn
  [0.70, [168, 180, 110]],   // olive
  [0.84, [219, 150,  55]],   // amber
  [1,    [250, 201,  52]],   // gold
];

/* Hemisphere identity colours, at full brightness.

   The first pass used a muted ice blue and ember, picked to sit politely
   against the glass panels. On a near-black ground that politeness read as
   washed out, and a 3.4px scatter dot has very little area in which to make its
   case. These are the same two hues pushed to near-maximum chroma.

   Both stay clear of the gold chrome so an interface element is never mistaken
   for a data series: the south is pushed toward red, away from the chrome's
   amber, rather than being merely a brighter version of it. */
const HEMI = { N: '#22e0ff', S: '#ff5c2b' };

const $ = (id) => document.getElementById(id);
const lerp = (a, b, t) => a + (b - a) * t;

function ramp(t) {
  const x = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (x <= RAMP[i][0]) {
      const [p0, c0] = RAMP[i - 1];
      const [p1, c1] = RAMP[i];
      const f = (x - p0) / (p1 - p0 || 1);
      return [lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f)];
    }
  }
  return RAMP[RAMP.length - 1][1];
}
const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;

/* The same ramp, made safe to set text in.

   A ramp built for extruded cells on a near-black basemap has to start dark,
   or the coolest cities read as holes in the map. That is right for fill and
   wrong for type: the city rail and the results table both print each mean in
   its own ramp colour, and at the cool end -- Tromso at 7.6 C, Murmansk at
   10.1 -- deep indigo on near-black was effectively invisible.

   Rather than compromise the map ramp, the hue and chroma are kept and only
   lightness is floored, so the colour still says the same thing about
   temperature while clearing the background it sits on. */
function rampText(t) {
  const [r, g, b] = ramp(t).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (l >= 0.6) return rgb(ramp(t));
  const d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const L = 0.62;
  const S = Math.min(1, sat * 1.15);
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const seg = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return rgb(seg.map((v) => (v + m) * 255));
}
const rampCSS = RAMP.map(([p, c]) => `${rgb(c)} ${(p * 100).toFixed(0)}%`).join(',');

/** base64 int16 tenths back into a Float32Array of degrees, NaN for nodata. */
function decode(b64, nodata) {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const i16 = new Int16Array(buf);
  const out = new Float32Array(i16.length);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] === nodata ? NaN : i16[i] / 10;
  return out;
}

function fitCanvas(c) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

/* A hinge: flat across the tropics, then a straight poleward decline.

   THREE MODELS WERE TRIED, AND THE FIRST TWO WERE WRONG IN DIFFERENT WAYS.

   A straight line came first, and the chart showed it failing: the fitted line
   ran about five degrees above every equatorial city, because it had to reach
   the mid latitudes. That is not a plotting bug, it is the model being wrong.
   Surface temperature does not peak at the equator. It peaks across the arid
   subtropics, because the equator is humid, cloudy and vegetated, and
   evaporation cools it. The five hottest cities here are Khartoum at 16°,
   N'Djamena at 12°, Aswan at 24°, Dammam at 26° and Livingstone at 18°, none of
   them equatorial. The southern hemisphere paid the most for this: R² 0.613.

   A quadratic fixed the equator and broke the pole. It fits well in the middle
   (R² 0.802 south) but a parabola forced through a maximum at 11° has to dive
   afterwards, and with only ONE southern city beyond 50° nothing holds the tail
   down. It undershot Punta Arenas by 4.5°C, and you could see the curve peel
   away from the last point.

   A hinge is the shape the physics actually has, and it cannot run away because
   its poleward limb is a straight line. Flat at 36.4°C to 20° north then losing
   5.7°C per ten degrees; flat at 32.7°C to 24° south then losing 8.3°C. R² 0.826
   and 0.819, better than either alternative in both hemispheres, with residuals
   that are small and no longer structured: the worst band is off by 2.8°C where
   the straight line was off by 5.1°C, and Punta Arenas lands at 8.0 against 9.3
   observed.

   The breakpoint is found by scanning, because with one free parameter inside a
   max() there is no closed form worth deriving for 78 points. */
function fitHinge(xs, ys) {
  const n = xs.length;
  const my = ys.reduce((a2, b2) => a2 + b2, 0) / n;
  let best = null;
  for (let brk = 5; brk <= 35.0001; brk += 0.5) {
    let md = 0;
    for (let i = 0; i < n; i++) md += Math.max(xs[i] - brk, 0);
    md /= n;
    let sdy = 0; let sdd = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.max(xs[i] - brk, 0) - md;
      sdy += d * (ys[i] - my); sdd += d * d;
    }
    const slope = sdd === 0 ? 0 : sdy / sdd;
    const plateau = my - slope * md;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      ss += (ys[i] - (plateau + slope * Math.max(xs[i] - brk, 0))) ** 2;
    }
    if (best === null || ss < best.ss) best = { ss, brk, plateau, slope };
  }
  let sst = 0;
  for (let i = 0; i < n; i++) sst += (ys[i] - my) ** 2;
  return {
    ...best, n,
    r2: 1 - best.ss / (sst || 1),
    at: (x) => best.plateau + best.slope * Math.max(x - best.brk, 0),
  };
}

function fit(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxy / (sxx || 1);
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy || 1), n };
}

(async function main() {
  const idx = await (await fetch(INDEX)).json();
  const CITIES = idx.cities;
  const GRID = idx.grid;
  const WIN = idx.window;

  let view = 'map';
  let hemi = 'all';
  let query = '';
  let active = null;        // loaded city payload
  let frame = 0;
  /* Vertical exaggeration, under the reader's control. There is no single right
     value: a 3D view is a picture of a slope, and how steep a slope has to be
     before the eye reads it as structure rather than noise depends on the pitch
     of the camera and on what the reader is looking for. */
  let exag = 1;
  let playing = false;
  const cache = new Map();

  /* ---- deck ---------------------------------------------------- */
  const deck = new Deck({
    canvas: 'deck',
    views: [new MapView({ id: 'm', controller: true })],
    initialViewState: { longitude: 20, latitude: 12, zoom: 2.1, pitch: 0, bearing: 0 },
    layers: [],
    onHover: (info) => {
      const el = $('tip');
      if (!info || !info.object || info.object.t === undefined) { el.hidden = true; return; }
      el.innerHTML = `<b>${info.object.t.toFixed(1)}°C</b>`;
      el.style.left = `${info.x}px`;
      el.style.top = `${info.y}px`;
      el.hidden = false;
    },
  });

  const base = () => new TileLayer({
    id: 'base', data: TILES, minZoom: 0, maxZoom: 16, tileSize: 256,
    renderSubLayers: (p) => {
      const { boundingBox: b } = p.tile;
      return new BitmapLayer(p, { data: null, image: p.data, bounds: [b[0][0], b[0][1], b[1][0], b[1][1]] });
    },
  });

  /* Cells are drawn as real lat/lon quads rather than fixed-metre squares. The
     extraction window is a degree box, so its ground width shrinks with the
     cosine of latitude — a metre-sized cell would gap at Tromso and overlap at
     Kampala. */
  /* The colour range is fixed per city and shared by all of its scenes, so that
     a colour means the same temperature in January as in July and the timeline
     animation shows seasonal change rather than a rescaling artefact.

     It is NOT the min and max, which is how this first shipped. Pooled across
     24 scenes those are set by a handful of outlier pixels in the two most
     extreme frames, and they stretch the scale so far that an ordinary scene
     lands in a sliver of it: Tromso in winter occupied 8% of the ramp and
     rendered as one flat blue. The 2nd to 98th percentile of all pixels across
     all scenes roughly doubles what a typical scene uses (median 23% -> 32%,
     and Kampala 27% -> 63%). The cost is that the extremes clip, which is the
     right trade — two frames losing their tails beats twenty-four frames
     losing their structure. */
  function robustRange(frames) {
    let n = 0;
    for (const f of frames) for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) n++;
    const all = new Float32Array(n);
    let k = 0;
    for (const f of frames) for (let i = 0; i < f.length; i++) if (Number.isFinite(f[i])) all[k++] = f[i];
    all.sort();
    const at = (q) => all[Math.min(n - 1, Math.max(0, Math.round(q * (n - 1))))];
    return [at(0.02), at(0.98)];
  }

  /* Height is normalised WITHIN each frame; colour stays fixed across the city.

     They used to do the same job: both read the cell's position in the city's
     whole-year range, so on any single date every column stood at almost the
     same height and the city rendered as a slab. Dammam measured 839 m of
     relief across a 28.8 km footprint, a 2.9% slope, which the eye reads as
     flat.

     Giving the two channels different jobs fixes it without inventing contrast
     that is not in the data. Colour still carries absolute temperature on a
     range fixed for the whole city, so a colour means the same thing in January
     as in July and the timeline still shows the season. Height is freed to show
     structure inside the frame you are looking at, at full range every time.

     The span scales with the city's ground width so a 32 km city and an 11 km
     one get the same visual slope rather than the same absolute metres. */
  function frameRange(values) {
    const v = [];
    for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i])) v.push(values[i]);
    if (!v.length) return [0, 1];
    v.sort((a, b) => a - b);
    const at = (q) => v[Math.min(v.length - 1, Math.max(0, Math.round(q * (v.length - 1))))];
    const lo = at(0.02);
    const hi = at(0.98);
    return [lo, hi > lo ? hi : lo + 1];
  }

  function reliefSpan(city) {
    return 2 * WIN * 111320 * Math.cos((city.lat * Math.PI) / 180) * 0.16;
  }

  function cellsFor(city, values, range) {
    /* The range is passed in, not read from `active`. This runs while the
       payload is still being built, so `active` is whatever was selected
       before — or null on first load, which is exactly how it failed. */
    const step = (WIN * 2) / GRID;
    const lat0 = city.lat - WIN;
    const lon0 = city.lon - WIN;
    const out = [];
    const [lo, hi] = range;
    const [flo, fhi] = frameRange(values);
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const v = values[r * GRID + c];
        if (!Number.isFinite(v)) continue;
        // Rows come out of the raster north-first; latitude therefore counts down.
        const la = lat0 + (GRID - 1 - r) * step;
        const ln = lon0 + c * step;
        const t = (v - lo) / (hi - lo || 1);
        out.push({
          polygon: [[ln, la], [ln + step, la], [ln + step, la + step], [ln, la + step]],
          t: v,
          color: ramp(t),
          hn: Math.max(0, Math.min(1, (v - flo) / (fhi - flo))),
        });
      }
    }
    return out;
  }

  function paintMap() {
    const layers = [base()];
    if (active && view === 'map') {
      layers.push(new SolidPolygonLayer({
        id: `cells-${active.summary.slug}-${frame}`,
        data: active.cells[frame],
        extruded: true,
        pickable: true,
        getPolygon: (d) => d.polygon,
        getFillColor: (d) => [...d.color, 235],
        getElevation: (c) => 25 + c.hn * active.span,
        elevationScale: exag,
        material: { ambient: 0.7, diffuse: 0.5, shininess: 20, specularColor: [60, 60, 60] },
      }));
    }
    deck.setProps({ layers });
  }

  /* ---- city list -------------------------------------------------- */
  function visible() {
    return CITIES.filter((c) =>
      (hemi === 'all' || c.hemisphere === hemi)
      && (!query || c.name.toLowerCase().includes(query) || c.country.toLowerCase().includes(query)));
  }

  function paintList() {
    const rows = visible();
    $('clist').innerHTML = rows.map((c) => `
      <li class="crow${active && active.summary.slug === c.slug ? ' is-on' : ''}" data-slug="${c.slug}">
        <span class="crow__n">${c.name}</span>
        <span class="crow__t" style="color:${rampText((c.mean - 5) / 45)}">${c.mean.toFixed(1)}°</span>
        <span class="crow__m">${c.lat.toFixed(1)}° · ${c.country} · ${c.dates} scenes</span>
      </li>`).join('');
  }

  async function select(slug) {
    if (active && active.summary.slug === slug) return;
    $('loading').hidden = false;
    let d = cache.get(slug);
    if (!d) {
      d = await (await fetch(CITY(slug))).json();
      // Decode once, on load. Doing it per frame would decode 9,216 cells sixty
      // times a second for no gain.
      d.values = d.frames.map((f) => decode(f, d.nodata));
      d.range = robustRange(d.values);
      d.cells = d.values.map((v) => cellsFor(d.summary, v, d.range));
      d.span = reliefSpan(d.summary);
      cache.set(slug, d);
    }
    active = d;
    frame = 0;
    $('loading').hidden = true;

    $('slider').max = String(d.dates.length - 1);
    $('slider').value = '0';
    paintList();
    paintReadout();
    paintMap();
    deck.setProps({
      initialViewState: {
        longitude: d.summary.lon, latitude: d.summary.lat,
        zoom: 9.4, pitch: 48, bearing: 0,
        transitionDuration: 900,
      },
    });
  }

  function paintReadout() {
    if (!active) return;
    const s = active.summary;
    const st = active.stats[frame];
    $('rCity').textContent = s.name;
    $('rMeta').textContent = `${s.country} · ${s.lat.toFixed(2)}°${s.hemisphere} · ${s.lon.toFixed(2)}°`;
    $('rMean').textContent = `${st[0].toFixed(1)}°`;
    $('rMin').textContent = `${st[1].toFixed(1)}°`;
    $('rMax').textContent = `${st[2].toFixed(1)}°`;
    $('rSpread').textContent = `${(st[2] - st[1]).toFixed(1)}°`;
    $('rDates').textContent = String(active.dates.length);
    $('rBar').style.background = `linear-gradient(90deg, ${rampCSS})`;
    $('rLo').textContent = `${active.range[0].toFixed(0)}°C`;
    $('rHi').textContent = `${active.range[1].toFixed(0)}°C`;
    $('tDate').textContent = active.dates[frame];
    $('tN').textContent = `scene ${frame + 1} of ${active.dates.length}`;
  }

  /* ---- analysis ----------------------------------------------------- */
  const N = CITIES.filter((c) => c.hemisphere === 'N');
  const S = CITIES.filter((c) => c.hemisphere === 'S');
  const fitN = fit(N.map((c) => Math.abs(c.lat)), N.map((c) => c.mean));
  const fitS = fit(S.map((c) => Math.abs(c.lat)), S.map((c) => c.mean));
  const fitAll = fit(CITIES.map((c) => Math.abs(c.lat)), CITIES.map((c) => c.mean));
  const q2N = fitHinge(N.map((c) => Math.abs(c.lat)), N.map((c) => c.mean));
  const q2S = fitHinge(S.map((c) => Math.abs(c.lat)), S.map((c) => c.mean));

  /* The subtitle is written from the index for the same reason the notes are:
     it read "82 cities · 69°N to 34°S" long after neither number was right. */
  function paintHeader() {
    const nl = Math.max(...N.map((c) => c.lat));
    const sl = Math.min(...S.map((c) => c.lat));
    const sub = `Landsat 8/9 · 30 m · ${CITIES.length} cities · `
      + `${nl.toFixed(0)}°N to ${Math.abs(sl).toFixed(0)}°S`;
    document.querySelector('.bar__sub').textContent = sub;
    document.title = `Global Surface Temperature — ${CITIES.length} Cities, Landsat 30 m | KFUPM`;
  }

  function paintAnalysis() {
    /* The equation printed here is the curve actually drawn on the chart. They
       disagreed before, because the card reported a straight line while the
       data plainly bends, and a reader comparing the two was right to say the
       equation and the values did not match. */
    const put = (pre, q, g) => {
      /* The MODEL, not a description of it.

         This slot used to read "T = 36.4°C up to 20°, then −0.569°C per degree".
         That says what the curve does, but a reader cannot put a latitude into
         it and get a temperature out, which is the one thing an equation is for.
         The hinge is a max(), so writing the max() is both shorter and exact —
         and it makes the breakpoint visible as the parameter it is rather than
         as a clause in a sentence. φ is defined once, in the header card. */
      $(`eq${pre}`).textContent =
        `T = ${q.plateau.toFixed(1)} ${q.slope < 0 ? '−' : '+'} `
        + `${Math.abs(q.slope).toFixed(3)} · max(φ − ${q.brk.toFixed(0)}, 0)`;
      const lats = g.map((c) => Math.abs(c.lat));
      /* "R² line" used to sit here. It answers "was a hinge worth it", which is
         a question about the modelling, not about the world, and it belongs in
         the note below where the comparison is explained. A reader looking at
         these five numbers wants to know how far off latitude alone can be, so
         that is what the slot now holds. */
      const err = Math.sqrt(g.reduce((s, c) => {
        const d = c.mean - q.at(Math.abs(c.lat));
        return s + d * d;
      }, 0) / g.length);
      $(`stat${pre}`).innerHTML = [
        ['R² hinge', q.r2.toFixed(3)],
        ['typical error', `±${err.toFixed(1)}°C`],
        // U+2212, to match the equation above it; a hyphen reads as a dash
        ['per 10° poleward',
          `${q.slope < 0 ? '−' : '+'}${Math.abs(q.slope * 10).toFixed(1)}°C`],
        ['cities', String(q.n)],
        ['range', `${Math.min(...lats).toFixed(0)}°–${Math.max(...lats).toFixed(0)}°`],
      ].map(([k, v]) => `<div><div class="stat__v">${v}</div><div class="stat__k">${k}</div></div>`).join('');
    };
    put('N', q2N, N);
    put('S', q2S, S);
    $('eqN').style.cssText = `color:${HEMI.N};background:${HEMI.N}14;border-color:${HEMI.N}44`;
    $('eqS').style.cssText = `color:${HEMI.S};background:${HEMI.S}14;border-color:${HEMI.S}44`;
    $('statN').querySelectorAll('.stat__v').forEach((e) => { e.style.color = HEMI.N; });
    $('statS').querySelectorAll('.stat__v').forEach((e) => { e.style.color = HEMI.S; });
    document.querySelectorAll('.acard .label').forEach((e) => {
      if (e.textContent.startsWith('Northern')) e.style.color = HEMI.N;
      if (e.textContent.startsWith('Southern')) e.style.color = HEMI.S;
    });

    /* These two notes used to be typed prose, and they went stale the moment the
       city list changed: they claimed a southern span of 34 degrees against the
       north's 70 and blamed Cape Agulhas, which stopped being true as soon as
       South America and New Zealand were added. Every number and the comparison
       between them is now derived, so the copy cannot contradict the chart
       above it. */
    const span = (g) => {
      const l = g.map((c) => Math.abs(c.lat));
      return Math.max(...l) - Math.min(...l);
    };
    const spanN = span(N);
    const spanS = span(S);
    const weaker = fitS.r * fitS.r < fitN.r * fitN.r;

    /* WHAT THE READER SHOULD TAKE AWAY, not how the fit was made.

       These notes used to describe the MODEL: "letting the fit bend once lifts
       R² from 0.78 to 0.83". True, and useless to anyone who came to find out
       what latitude does to temperature. Worse, the old phrasing hid the most
       interesting result in the chart. "Flat at about 36°C to 20°" reads as
       "the tropics are all 36°C", and they are not — the cities inside the flat
       part span seventeen degrees. The finding is that across the tropics
       latitude explains NONE of a very large spread; something else does.

       So each panel now says, in order: what the gradient does, how well
       latitude alone can place a city, and which cities it fails on. Every
       number is derived, so the prose cannot drift from the chart above it. */
    const resid = (g, q) => {
      const e = g.map((c) => ({ name: c.name, d: c.mean - q.at(Math.abs(c.lat)) }));
      const abs = e.map((x) => Math.abs(x.d)).sort((a2, b2) => a2 - b2);
      const rmse = Math.sqrt(e.reduce((s, x) => s + x.d * x.d, 0) / e.length);
      const flat = g.filter((c) => Math.abs(c.lat) <= q.brk).map((c) => c.mean);
      return {
        rmse,
        within3: Math.round(abs.filter((a2) => a2 <= 3).length / abs.length * 100),
        nFlat: flat.length,
        lo: Math.min(...flat),
        hi: Math.max(...flat),
        worst: e.slice().sort((a2, b2) => Math.abs(b2.d) - Math.abs(a2.d)).slice(0, 3),
      };
    };

    const note = (g, q, season) => {
      const r = resid(g, q);
      const miss = r.worst
        .map((x) => `${x.name} ${x.d > 0 ? '+' : '−'}${Math.abs(x.d).toFixed(1)}`)
        .join(', ');
      return `<strong>Across the first ${q.brk.toFixed(0)}° there is no gradient at `
        + `all.</strong> Those ${r.nFlat} cities run from ${r.lo.toFixed(0)} to `
        + `${r.hi.toFixed(0)}°C — ${(r.hi - r.lo).toFixed(0)} degrees of spread that `
        + `latitude does not explain, because the tropics are humid and cloudy and it `
        + `is the arid subtropics that get hottest. Past ${q.brk.toFixed(0)}° the `
        + `decline is steady: <strong>${Math.abs(q.slope * 10).toFixed(1)}°C colder for `
        + `every ten degrees</strong> poleward.<br><br>`
        + `Latitude alone places a ${season} city within about `
        + `<strong>±${r.rmse.toFixed(1)}°C</strong>, ${r.within3}% of them inside 3°C. `
        + `Where it misses it misses for reasons latitude cannot see — the largest are `
        + `${miss}.`;
    };

    $('noteN').innerHTML = note(N, q2N, 'northern');
    $('noteS').innerHTML = note(S, q2S, 'southern');

    /* WHY THE FITS ARE SPLIT, AND THE BIAS THAT SURVIVES THE SPLIT.

       This note used to say the hemispheres are fitted separately "because they
       are in opposite seasons". That is a real confound in general and it is not
       this one: each city's mean is taken across a whole year of acquisitions —
       measured, both hemispheres average 42% warm-season scenes across ten of
       twelve months, which is what an evenly sampled year looks like. Opposite
       seasons average out. The honest reason to split is that the two
       hemispheres are different populations — the south is far more ocean, and
       runs out of land at 53° where the north continues to 70°.

       The bias that does NOT average out is cloud. Landsat needs daylight and a
       gap in the cloud, and a city at 65° has much less of either in January
       than one at 5°, so the scenes that survive at high latitude are
       disproportionately summer ones. That is a bias which GROWS with latitude,
       which means it lifts the cold end of the gradient and flattens the slope.
       Reported here rather than buried, because it points one way: the true
       decline is steeper than the number above it. */
    const warmOf = (g) => {
      const w = g.map((c) => c.warm).filter((x) => typeof x === 'number');
      return w.length ? w.reduce((a2, b2) => a2 + b2, 0) / w.length : null;
    };
    const warmAll = warmOf(CITIES);
    const hi = CITIES.filter((c) => Math.abs(c.lat) >= 55);
    const lo = CITIES.filter((c) => Math.abs(c.lat) <= 15);
    const warmHi = warmOf(hi);
    const warmLo = warmOf(lo);

    let bias = '';
    if (warmHi !== null && warmLo !== null && warmHi > warmLo) {
      bias = ` <br><br><strong>One bias does not average out.</strong> Landsat needs `
        + `daylight and a break in the cloud, so a high-latitude city yields far fewer `
        + `usable winter scenes: cities beyond 55° are `
        + `<strong>${Math.round(warmHi * 100)}% warm-season</strong> against `
        + `${Math.round(warmLo * 100)}% within 15° of the equator. That lifts the cold `
        + `end of the curve, so the decline quoted above is a <strong>lower bound</strong> — `
        + `the real gradient is steeper.`;
    }

    $('splitNote').innerHTML =
      `<strong>T</strong> is mean surface temperature in °C and <strong>φ</strong> is degrees of latitude from the equator, unsigned — so each fit runs from its own equator to its own pole.<br><br>`
      + `Fitted separately because the hemispheres are different populations, not because `
      + `of season: each city's mean spans a full year of acquisitions, and both `
      + `hemispheres come out evenly sampled`
      + (warmAll !== null ? ` at ${Math.round(warmAll * 100)}% warm-season scenes` : '')
      + `, so the calendar averages out. The south is far more ocean and runs out of land `
      + `at ${Math.max(...CITIES.filter((c) => c.lat < 0).map((c) => Math.abs(c.lat))).toFixed(0)}° `
      + `where the north reaches `
      + `${Math.max(...CITIES.filter((c) => c.lat > 0).map((c) => c.lat)).toFixed(0)}°. `
      + `Pooling all ${fitAll.n} cities gives R² = ${(fitAll.r * fitAll.r).toFixed(3)}, `
      + `<strong>weaker than either hemisphere on its own</strong>, so a single line across `
      + `both describes neither. Each fit is flat across the tropics and straight `
      + `poleward of a breakpoint, because surface temperature does not peak at the `
      + `equator. It peaks across the arid subtropics: the equator is humid, cloudy and `
      + `vegetated, and evaporation cools it.${bias}`;

    $('tblNote').textContent =
      `${CITIES.length} cities, ${idx.source}. Mean is across each city's own Landsat acquisitions; `
      + `cloud limits how many each gets.`;

    $('tbl').innerHTML =
      '<thead><tr><th>City</th><th class="num">Lat</th><th class="num">Mean °C</th>'
      + '<th class="num">Min</th><th class="num">Max</th><th class="num">Scenes</th></tr></thead><tbody>'
      + CITIES.map((c) => `<tr data-slug="${c.slug}"${active && active.summary.slug === c.slug ? ' class="is-on"' : ''}>
          <td>${c.name} <span style="color:var(--faint)">${c.country}</span></td>
          <td class="num">${c.lat.toFixed(2)}</td>
          <td class="num" style="color:${rampText((c.mean - 5) / 45)};font-weight:700">${c.mean.toFixed(1)}</td>
          <td class="num">${c.min.toFixed(1)}</td>
          <td class="num">${c.max.toFixed(1)}</td>
          <td class="num">${c.dates}</td></tr>`).join('')
      + '</tbody>';

    drawFit();
  }

  function drawFit() {
    const { ctx, w, h } = fitCanvas($('fit'));
    ctx.clearRect(0, 0, w, h);
    // B grew from 30 to 44 to make room for the x axis title below the ticks.
    const L = 46, R = 16, T = 14, B = 44;
    const pw = w - L - R;
    const ph = h - T - B;
    if (pw <= 0 || ph <= 0) return;

    const temps = CITIES.map((c) => c.mean);
    const y0 = Math.min(...temps) - 3;
    const y1 = Math.max(...temps) + 3;
    const X = (lat) => L + (Math.abs(lat) / 72) * pw;
    const Y = (t) => T + ph - ((t - y0) / (y1 - y0)) * ph;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.fillStyle = 'rgba(247,243,236,.72)';
    for (let g = 0; g <= 4; g++) {
      const v = y0 + ((y1 - y0) * g) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(`${v.toFixed(0)}°`, L - 7, y + 3);
    }
    ctx.textAlign = 'center';
    for (let lat = 0; lat <= 70; lat += 10) ctx.fillText(`${lat}°`, X(lat), h - 20);

    /* AXIS TITLES. Both axes were labelled in degrees — 0° to 70° along the
       bottom and 5° to 48° up the side — with nothing saying that one is
       latitude and the other Celsius. A reader has to infer which is which from
       the shape of the data, and inferring the axes is not their job.

       Set apart from the tick labels: dimmer, letter-spaced, and the y title
       rotated up the left edge in the usual convention. */
    ctx.save();
    ctx.fillStyle = 'rgba(247,243,236,.42)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.letterSpacing = '0.08em';

    ctx.textAlign = 'center';
    ctx.fillText('DEGREES OF LATITUDE FROM THE EQUATOR', L + pw / 2, h - 5);

    ctx.translate(11, T + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('MEAN SURFACE TEMPERATURE °C', 0, 0);
    ctx.restore();

    /* The curve is sampled only across latitudes that actually have cities.

       The straight line before it was drawn from 0° to 72° regardless of where
       the data stopped, so at the left edge it sat five degrees above every
       equatorial city and at the right edge it ran past the last one. Half of
       the reported mismatch between the equation and the values was this:
       drawing a model outside the range it was fitted on. */
    const draw = (g, q, col) => {
      const lats = g.map((c) => Math.abs(c.lat));
      const lo = Math.min(...lats);
      const hi = Math.max(...lats);
      g.forEach((c) => {
        ctx.beginPath();
        ctx.arc(X(c.lat), Y(c.mean), 3.6, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const x = lo + ((hi - lo) * i) / 72;
        const px = X(x);
        const py = Y(q.at(x));
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    };
    draw(N, q2N, HEMI.N);
    draw(S, q2S, HEMI.S);

    ctx.font = '600 12px Jost, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = HEMI.N;
    ctx.fillText(`North  r = ${fitN.r.toFixed(3)}`, L + 12, T + 18);
    ctx.fillStyle = HEMI.S;
    ctx.fillText(`South  r = ${fitS.r.toFixed(3)}`, L + 12, T + 36);
  }

  /* ---- events -------------------------------------------------------- */
  $('clist').addEventListener('click', (e) => {
    const row = e.target.closest('[data-slug]');
    if (row) select(row.dataset.slug);
  });

  $('tbl').addEventListener('click', (e) => {
    const row = e.target.closest('[data-slug]');
    if (!row) return;
    show('map');
    select(row.dataset.slug);
  });

  $('rex').addEventListener('input', (e) => {
    exag = Number(e.target.value) / 100;
    $('rexV').textContent = `${exag.toFixed(exag < 1 ? 2 : 1)}×`;
    paintMap();
  });

  $('search').addEventListener('input', (e) => { query = e.target.value.toLowerCase(); paintList(); });

  $('hemi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]');
    if (!b) return;
    hemi = b.dataset.h;
    $('hemi').querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
    paintList();
  });

  $('slider').addEventListener('input', (e) => {
    frame = Number(e.target.value);
    paintReadout();
    paintMap();
  });

  $('play').addEventListener('click', () => {
    playing = !playing;
    $('playIcon').textContent = playing ? '❚❚' : '▶';
  });

  function show(v) {
    view = v;
    $('analysis').hidden = v !== 'analysis';
    ['rail', 'read', 'time', 'relief'].forEach((id) => { $(id).style.display = v === 'map' ? '' : 'none'; });
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-on', t.dataset.view === v));
    if (v === 'analysis') paintAnalysis();
    paintMap();
  }

  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) show(b.dataset.view);
  });

  window.addEventListener('resize', () => { if (view === 'analysis') drawFit(); }, { passive: true });

  // One acquisition a second: slow enough to read the date, fast enough to see
  // the seasons move.
  let acc = 0;
  let last = performance.now();
  (function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (!playing || !active) return;
    acc += dt;
    if (acc < 0.85) return;
    acc = 0;
    frame = (frame + 1) % active.dates.length;
    $('slider').value = String(frame);
    paintReadout();
    paintMap();
  })();

  paintHeader();
  paintList();
  paintMap();
  await select(CITIES.find((c) => c.slug === 'dammam') ? 'dammam' : CITIES[0].slug);
  $('boot').classList.add('is-done');
  setTimeout(() => { $('boot').style.display = 'none'; }, 500);
})();
