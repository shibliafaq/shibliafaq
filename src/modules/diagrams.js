/**
 * Architecture diagrams, drawn as inline SVG rather than shipped as images.
 *
 * WHY NOT A PNG
 * -------------
 * The two WebP diagrams these replace went stale and stayed stale: they drew
 * Kafka, Spark and Streamlit as live blocks long after the stack changed, said
 * "48-Hour Forecast RMSE < 1.5°C" when the horizons are 7-day and monthly,
 * "5 Prophet Models" when there are twenty, and "2023-2025 (730 days)" against
 * an eight-year series. Every one of those is a one-word edit here and a
 * redraw-and-re-export in an image editor — which is exactly why it never
 * happened.
 *
 * Inline SVG also scales to any width without blurring, inherits the page's
 * colours through CSS custom properties so it follows the theme, and puts its
 * labels in the DOM where a screen reader and a translator can reach them.
 *
 * DELIVERED vs ROADMAP
 * --------------------
 * The single most important thing this diagram does is separate what runs from
 * what is designed. Solid boxes are built and running; dashed boxes are the
 * streaming layer that exists as a design and not as a deployment. The previous
 * version drew both identically, which is how the site ended up claiming a live
 * Kafka cluster.
 */

const BOX = (x, y, w, h, title, sub, kind = 'solid') => `
  <g class="dg-node dg-node--${kind}" transform="translate(${x},${y})">
    <rect width="${w}" height="${h}" rx="10"/>
    <text class="dg-t" x="14" y="26">${title}</text>
    ${sub ? `<text class="dg-s" x="14" y="46">${sub}</text>` : ''}
  </g>`;

/** Arrow between two points. `dash` marks a roadmap connection. */
const ARROW = (x1, y1, x2, y2, dash = false) =>
  `<path class="dg-link${dash ? ' dg-link--dash' : ''}" d="M${x1},${y1} L${x2},${y2}" marker-end="url(#dg-head)"/>`;

const LANE = (x, y, w, h, label, kind) => `
  <g class="dg-lane dg-lane--${kind}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/>
    <text class="dg-lane-t" x="${x + 16}" y="${y + 22}">${label}</text>
  </g>`;

/**
 * The thesis pipeline. Every figure here is the corrected one — see
 * docs/CONTEXT.md §20 for what each replaced.
 */
export function thesisDiagram() {
  return `
<svg class="dg" viewBox="0 0 1020 470" role="img"
     aria-label="Digital twin pipeline. Delivered: Google Earth Engine ingestion, PostGIS store, twenty Prophet models, Heat Vulnerability Index, intervention simulator, FastAPI backend and a deck.gl dashboard. Roadmap: Kafka and Spark streaming, VIIRS multi-sensor, scheduled ingestion.">
  <defs>
    <marker id="dg-head" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="dg-arrow"/>
    </marker>
  </defs>

  ${LANE(8, 8, 1004, 292, 'DELIVERED — RUNNING', 'live')}

  ${BOX(28, 46, 200, 66, 'Google Earth Engine', 'MODIS Terra + Aqua LST', 'solid')}
  ${BOX(268, 46, 200, 66, 'PostgreSQL / PostGIS', '500 m grid · 2018–2025', 'solid')}
  ${BOX(508, 46, 232, 66, 'Prophet ensemble', '20 models · 5 cities × 2 sensors × day/night', 'solid')}
  ${BOX(780, 46, 212, 66, 'Landsat cross-validation', 'r ≥ 0.85', 'solid')}

  ${ARROW(232, 79, 262, 79)}
  ${ARROW(472, 79, 502, 79)}
  ${ARROW(744, 79, 774, 79)}

  ${BOX(28, 160, 200, 66, 'Heat Vulnerability Index', 'equity-weighted · 1.37M at risk', 'solid')}
  ${BOX(268, 160, 232, 66, 'Intervention Simulator', '12 measures · own-data seasonal betas', 'solid')}
  ${BOX(540, 160, 180, 66, 'FastAPI', 'REST + tiles', 'solid')}
  ${BOX(760, 160, 232, 66, 'deck.gl + MapLibre', 'browser dashboard', 'solid')}

  ${ARROW(232, 193, 262, 193)}
  ${ARROW(504, 193, 534, 193)}
  ${ARROW(724, 193, 754, 193)}

  <!-- forecast feeds the vulnerability layer on the row below -->
  <path class="dg-link" d="M624,116 L624,140 L128,140 L128,156" marker-end="url(#dg-head)"/>

  <text class="dg-note" x="28" y="266">Monthly RMSE 0.96–1.91 °C day · 0.79–1.29 °C night &#160;·&#160; 7-day 2.4–3.3 °C &#160;·&#160; regressors β<tspan baseline-shift="sub" font-size="9">NDVI</tspan> β<tspan baseline-shift="sub" font-size="9">NDBI</tspan> β<tspan baseline-shift="sub" font-size="9">Albedo</tspan></text>

  ${LANE(8, 316, 1004, 146, 'ROADMAP — DESIGNED, NOT DEPLOYED', 'plan')}

  ${BOX(28, 356, 200, 66, 'Apache Kafka', '3-broker ingest bus', 'dash')}
  ${BOX(268, 356, 200, 66, 'PySpark Streaming', 'event-time watermarking', 'dash')}
  ${BOX(508, 356, 200, 66, 'Scheduled ingestion', 'replaces on-demand pulls', 'dash')}
  ${BOX(748, 356, 244, 66, 'VIIRS multi-sensor', 'extracted, not yet in pipeline', 'dash')}

  ${ARROW(232, 389, 262, 389, true)}
  ${ARROW(472, 389, 502, 389, true)}
</svg>`;
}

export const DIAGRAMS = { thesis: thesisDiagram };
