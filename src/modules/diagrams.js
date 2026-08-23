/**
 * Architecture diagrams, built from HTML and CSS rather than shipped as images.
 *
 * WHY NOT A PNG
 * -------------
 * The two WebP diagrams these replace went stale and stayed stale. They drew a
 * Streamlit dashboard long after the stack became FastAPI + deck.gl, said
 * "48-Hour Forecast RMSE < 1.5 °C" when the horizons are 7-day and monthly,
 * "5 Prophet Models (1 per city)" when there are twenty, and "2023-2025 (730
 * days)" against an eight-year series. Every one of those is a one-word edit
 * here and a redraw-and-re-export in an image editor — which is exactly why it
 * never happened.
 *
 * WHY HTML AND NOT SVG
 * --------------------
 * The previous version of this file drew the same thing in hand-placed SVG,
 * with every box at an absolute x/y. That is fine until a label changes length
 * or the panel changes width: nothing reflows, so text either overflows its
 * rect or the whole figure has to be re-solved by hand. Boxes in a grid wrap,
 * balance and re-flow on their own, the type is real type that scales with the
 * page and can be selected and translated, and a phone gets a legible stack of
 * the same content rather than a wide drawing scaled into illegibility.
 *
 * THE SOURCE
 * ----------
 * Both follow CORRECTED_manuscript.md — Figure 4.1 (end-to-end architecture,
 * four layers) and Figure 4.2 (technical data pipeline). The manuscript's own
 * convention is carried over exactly: solid is the operational batch/on-demand
 * path, dashed is the optional streaming layer, "started manually and not part
 * of the default deployment".
 *
 * That distinction is the one thing here that must not blur. It is NOT a
 * roadmap — the streaming layer is built and it runs; it simply is not what
 * runs by default. Labelling it as unbuilt would understate the work, and
 * drawing it identically to the rest would claim a live Kafka cluster. Dashed,
 * with the reason written on it, is the honest middle.
 */

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/** One box. `kind` is 'solid' for the operational path, 'dash' for optional. */
const node = (title, sub, kind = 'solid') => `
  <li class="dgx__node dgx__node--${kind}">
    <span class="dgx__t">${esc(title)}</span>
    ${sub ? `<span class="dgx__s">${esc(sub)}</span>` : ''}
  </li>`;

/** A labelled band of the diagram. */
const layer = (label, note, nodes, kind = 'solid') => `
  <section class="dgx__layer dgx__layer--${kind}">
    <header class="dgx__lh">
      <span class="dgx__ln">${esc(label)}</span>
      ${note ? `<span class="dgx__lnote">${esc(note)}</span>` : ''}
    </header>
    <ul class="dgx__row">${nodes.join('')}</ul>
  </section>`;

/** The connector between two layers. */
const flow = (kind = 'solid') => `<div class="dgx__flow dgx__flow--${kind}" aria-hidden="true"></div>`;

/* ---------------------------------------------------------------- Figure 4.1 */

export function thesisArchitecture() {
  return `
<figure class="dgx" role="group"
        aria-label="End-to-end digital twin architecture in four layers: ingestion, storage, an optional streaming layer, and serving.">
  <figcaption class="dgx__cap"><b>System architecture</b> — ingestion, storage, serving. The dashed band is the optional streaming layer.</figcaption>

  ${layer('Ingestion', 'Python pipeline · scheduled and on demand', [
    node('Google Earth Engine', 'MODIS LST · NDVI · NDBI, 2018–2026'),
    node('Open-Meteo API', 'Meteorological series'),
    node('WorldPop', 'Population, 100 m'),
  ])}

  ${flow()}

  ${layer('Processing', 'Regridding and index computation', [
    node('Equal-area regrid', '~500 m / 0.005° grid · urban–rural radius'),
    node('Sign-constrained regression', 'β NDVI · β NDBI · β albedo, per city'),
    node('Heat Vulnerability Index', 'LST, NDVI, NDBI and population, equally weighted'),
  ])}

  ${flow()}

  ${layer('Storage', 'The single source both paths write to', [
    node('PostgreSQL + PostGIS', 'Historical archive 2018–2026 · model training set'),
  ])}

  ${flow('dash')}

  ${layer('Streaming', 'Built and runs — started manually, not the default path', [
    node('Apache Kafka', 'lst-daily-v2 · weather-daily-v2 · vegetation-monthly-v2', 'dash'),
    node('Spark Structured Streaming', '30-second micro-batch, writes back to PostGIS', 'dash'),
    node('Derived topics', 'Heat alerts · refreshed forecast', 'dash'),
  ], 'dash')}

  ${flow()}

  ${layer('Serving', 'What the reader is looking at', [
    node('FastAPI', 'Reads PostGIS · REST and tiles'),
    node('deck.gl + MapLibre', 'Browser dashboard, seven tabs'),
  ])}
</figure>`;
}

/* ---------------------------------------------------------------- Figure 4.2 */

export function thesisPipeline() {
  return `
<figure class="dgx" role="group"
        aria-label="Technical data pipeline from satellite retrieval to decision output, with forecasting and simulation branches.">
  <figcaption class="dgx__cap"><b>Data pipeline</b> — from satellite retrieval to decision output.</figcaption>

  ${layer('Retrieve', 'Eight years, five cities', [
    node('MODIS Terra + Aqua', 'Day and night LST, 1 km native'),
    node('Landsat', 'Cross-sensor check · R > 0.85 in all five cities'),
  ])}

  ${flow()}

  ${layer('Model', 'Two branches off one store', [
    node('Prophet family', 'LST direct, day and night · monthly and 7-day'),
    node('Own-data betas', 'Fitted on each city’s summer, not borrowed'),
  ])}

  ${flow()}

  ${layer('Decide', 'What a planner actually reads', [
    node('Forecast', 'Monthly RMSE 0.96–1.91 °C day · 0.79–1.29 °C night'),
    node('Vulnerability', '1.37M residents in Very-High cells'),
    node('Intervention simulator', '12 measures · cooling, spillover, cost, residents reached'),
  ])}

  <p class="dgx__foot">Solid is the operational batch and on-demand path. The streaming layer in the architecture above feeds the same store on a near-real-time channel when it is started.</p>
</figure>`;
}

/* Both figures under one key, so the modal needs no change: a project asks for
   `diagram: 'thesis'` and gets the architecture and the pipeline in order. */
export const DIAGRAMS = {
  thesis: () => thesisArchitecture() + thesisPipeline(),
};
