/**
 * Project detail content, carried over from v1 verbatim.
 *
 * The only edits are structural: image references now point at real files
 * instead of base64 blobs, the three Kepler.gl recordings are <video> rather
 * than GIF, and the per-metric colours are gone — v2 runs a single accent.
 */

const IMG = '/assets/img';
const VID = '/assets/video';

export const projects = {
  thesis: {
    // The Thesis Coverage globe (#atlas) is relocated into this card's modal.
    embed: 'atlas',
    cat: 'M.Sc. Thesis · KFUPM · Architecture & City Design',
    title: 'Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting & Mitigation',
    desc: 'Built on Design Science Research methodology, this digital twin platform pulls MODIS Land Surface Temperature via Google Earth Engine, runs a Prophet forecasting ensemble (Terra and Aqua modelled separately, day and night, monthly + 7-day + 2030 horizons), and computes an equity-weighted Heat Vulnerability Index. An intervention simulator ranks twelve mitigation measures by cooling delivered, spillover reach, cost, and beneficiaries — using own-data seasonal betas, not literature values. Served through a FastAPI + PostgreSQL/PostGIS backend and a deck.gl + MapLibre frontend. Five Saudi cities. One framework.',
    // The one sentence worth remembering — it goes above everything else.
    finding: {
      claim: 'Saudi cities are daytime <em>cool</em>-islands against the surrounding desert — the inverse of the classical Oke model.',
      note: 'Makkah’s cool-island reaches −0.01 °C by 2030.',
    },
    diagram: 'thesis',
    worked: {
      sec: 'Intervention Simulator — a worked example',
      lead: 'Twelve mitigation measures ranked by cooling delivered, spillover reach, cost, and beneficiaries — scored on this study’s own seasonal betas rather than literature values. In Dammam, for the same money:',
      rows: [
        { v: '16,167', l: 'residents cooled by one water feature' },
        { v: '602', l: 'residents cooled by one cool-pavement patch' },
      ],
      foot: 'Same budget, 27× the reach. Ranking by residents-per-riyal is what the simulator exists to do.',
    },
    metrics: [
      { v: '0.96–1.91°C', l: 'Monthly RMSE' },
      { v: 'r ≥ 0.85', l: 'MODIS vs Landsat' },
      { v: '1.37M', l: 'At-risk residents mapped' },
      { v: '5 cities', l: 'Riyadh · Jeddah · Dammam · Makkah · NEOM' },
    ],
    method: 'Google Earth Engine (on-demand ingestion) → PostgreSQL/PostGIS spatial DB → Prophet forecasting (Terra + Aqua separately, day + night) → Intervention Simulator (own-data seasonal OLS betas, exponential spillover kernel, Saudi/Gulf cost rates) → FastAPI backend → deck.gl + MapLibre dashboard. Kafka/Spark streaming layer designed for future automation.',
    /* The dashboard itself, running in the page.
       It is the static ("lite") build: the FastAPI backend is replaced by a
       frozen JSON snapshot, so there is no server to keep alive and nothing to
       go stale mid-demo. Everything below the surface is the real thing — the
       same deck.gl map, the same Prophet forecasts, the same simulator. */
    twin: {
      sec: 'The dashboard, running',
      lead: 'Not a screenshot. This is the platform itself, embedded — seven tabs across five cities, driven by a frozen snapshot of the study database so it runs without a backend.',
      title: 'UHI Digital Twin — interactive dashboard',
      src: '/uhi-twin/index.html',
      hint: 'Map · Weather · Climate · Statistics · Forecast · Interventions · System',
      note: 'The map basemap, the Esri 3D city mode and the weather tab stream live over HTTPS; the heat data is bundled and offline. <strong>Run Simulation</strong> on the Interventions tab is inert in this static build — every other control is live. Basemaps © CARTO, © OpenStreetMap contributors; 3D city content © Esri.',
    },
    tags: ['Google Earth Engine', 'PostgreSQL/PostGIS', 'FastAPI', 'Prophet', 'deck.gl', 'MapLibre', 'Docker Compose', 'Design Science Research', 'Heat Vulnerability Index', 'Intervention Simulator', 'Vision 2030'],
    links: [
      { t: 'Open the dashboard full screen', h: '/uhi-twin/index.html', primary: true },
      { t: 'Ask about the backend & data pipeline', h: 'mailto:shibliafaq4@gmail.com?subject=Digital%20Twin%20—%20backend%20walkthrough' },
    ],
  },

  gis: {
    cat: 'CRP 583: Urban Informatics · KFUPM · Jan–May 2026 · Co-author: Sultan Aldhafeeri',
    title: 'GIS & Remote Sensing UHI Assessment — Dammam Metropolitan Area',
    desc: 'Five-step GIS and remote sensing workflow across 12,954 grid cells (500m × 500m, 3,238 km²). Key finding: NDBI is 255× more predictive of LST than NDVI in arid cities — a direct reversal of temperate-city findings. The Composite HVI hotspot is 4.18× larger than LST-only analysis, proving that temperature-only mapping dangerously under-estimates true vulnerability.',
    metrics: [
      { v: '12,954', l: 'Grid cells analysed' },
      { v: 'R²=0.511', l: 'NDBI explains 51% of LST variance' },
      { v: '57.3 km²', l: 'Very High Exposure zone' },
      { v: '4.18×', l: 'HVI hotspot vs LST-only' },
    ],
    method: 'GEE data acquisition (Landsat 8/9, Sentinel-2, WorldPop) → SetNull() water masking → 500m fishnet → Zonal Statistics → Min-max normalisation → Pearson r & regression → Simplified HVI + Composite HVI → Getis-Ord Gi* (fixed 1,000m band) → 3-scenario sensitivity analysis',
    tags: ['ArcGIS Pro 3.6', 'Landsat 8/9 TIRS', 'Sentinel-2 MSI', 'WorldPop 2020', 'NDVI/NDBI', 'Composite HVI', 'Getis-Ord Gi*', 'Pearson Correlation', 'SetNull() Water Masking', 'Sensitivity Analysis'],
    /* The same assessment as a 3D twin, in the UHI dashboard's visual language.

       The thirteen maps below are the deliverable; this is the instrument. Flat
       sheets cannot answer "does this cell change class when the weighting
       changes", because that needs two maps held in one eye. Thirteen layers
       over one terrain turns that comparison into a click. */
    twin: {
      sec: 'The assessment, in three dimensions',
      lead: 'All thirteen layers over one 12,954-cell terrain. Height and colour both carry the value, the formula behind each index is on screen, and the priority control isolates the 229 cells where heat and population actually coincide.',
      title: 'Dammam heat vulnerability — 3D twin',
      src: '/gis-twin.html',
      hint: 'Inputs · five HVI weightings · agreement · exposure',
      note: 'Classification is by equal count, because the middle half of the cells spans only 3 to 15 per cent of each raw range and a linear scale renders the metro as a plateau. Legend breaks print the real values. Basemap © CARTO, © OpenStreetMap contributors.',
    },
    /* The full ArcGIS output, grouped so the maps make the argument in order:
       what went in, how the models disagree, where they disagree most, and what
       survives all of it. Every map is the original A4 layout — click to open
       the 2000px version, because the legend is where the meaning is. */
    galleries: [
      {
        sec: 'The inputs — six rasters on one 500 m grid',
        note: 'Landsat 8/9 TIRS, Sentinel-2 MSI and WorldPop, each resampled onto the same 12,954-cell fishnet so every later comparison is cell-for-cell.',
        items: [
        { src: `${IMG}/gis_lst2020.webp`, zoom: `${IMG}/gis_lst2020@2x.webp`, cap: 'Land Surface Temperature 2020 — Landsat 8/9 TIRS' },
        { src: `${IMG}/gis_lst2023.webp`, zoom: `${IMG}/gis_lst2023@2x.webp`, cap: 'Land Surface Temperature 2023 — peak recorded 65.8°C' },
        { src: `${IMG}/gis_lst2025.webp`, zoom: `${IMG}/gis_lst2025@2x.webp`, cap: 'Land Surface Temperature 2025' },
        { src: `${IMG}/gis_ndvi2023.webp`, zoom: `${IMG}/gis_ndvi2023@2x.webp`, cap: 'NDVI 2023 — vegetation, the weaker predictor in an arid city' },
        { src: `${IMG}/gis_ndbi2023.webp`, zoom: `${IMG}/gis_ndbi2023@2x.webp`, cap: 'NDBI 2023 — built-up index, the dominant LST predictor (r = 0.715, R² = 0.511)' },
        { src: `${IMG}/gis_pop2020.webp`, zoom: `${IMG}/gis_pop2020@2x.webp`, cap: 'WorldPop 2020 — population, the exposure term' },
        ],
      },
      {
        cols: 2,
        sec: 'One question, four answers',
        note: 'The same cells, scored by four weightings of the Heat Vulnerability Index. Depending on which model you accept, between roughly half and nine-tenths of the metropolitan area is High vulnerability — the choice of model, not the data, decides who counts.',
        items: [
        { src: `${IMG}/gis_hvi_simple.webp`, zoom: `${IMG}/gis_hvi_simple@2x.webp`, cap: 'Simplified HVI — LST 60% / population 40%; the most balanced split' },
        { src: `${IMG}/gis_hvi_heat.webp`, zoom: `${IMG}/gis_hvi_heat@2x.webp`, cap: 'Heat-weighted sensitivity — vulnerability follows temperature' },
        { src: `${IMG}/gis_hvi_pop.webp`, zoom: `${IMG}/gis_hvi_pop@2x.webp`, cap: 'Population-weighted sensitivity — vulnerability follows people' },
        { src: `${IMG}/gis_hvi_built.webp`, zoom: `${IMG}/gis_hvi_built@2x.webp`, cap: 'Built-up-weighted sensitivity — vulnerability follows surface' },
        ],
      },
      {
        cols: 2,
        sec: 'Where temperature alone misleads',
        note: 'Getis-Ord Gi* hot spots at 99% confidence, run twice. On temperature alone the priority area is 120.8 km²; on the Composite HVI it is 505.0 km² — <strong>4.18× larger</strong>. Mapping heat is not the same as mapping who is harmed by it.',
        items: [
        { src: `${IMG}/gis_hotspot_lst.webp`, zoom: `${IMG}/gis_hotspot_lst@2x.webp`, cap: 'LST hot spots — 120.8 km² at 99% confidence, 3.7% of the study area' },
        { src: `${IMG}/gis_hotspot_hvi.webp`, zoom: `${IMG}/gis_hotspot_hvi@2x.webp`, cap: 'Composite HVI hot spots — 505.0 km² at 99% confidence, 15.6%' },
        ],
      },
      {
        cols: 1,
        sec: 'What survives every test',
        note: 'The strictest reading: cells where high temperature and high population coincide. 229 cells — 57.3 km², 1.8% of the metropolitan area. This is the list a budget can actually act on.',
        items: [
        { src: `${IMG}/gis_exposure_map.webp`, zoom: `${IMG}/gis_exposure_map@2x.webp`, cap: 'High Exposure — 229 cells · 57.3 km² · central Dammam and the Al-Khobar core' },
        ],
      },
    ],
    links: [{ t: 'Manuscript — Under Departmental Review', dev: true }],
  },

  iot: {
    /* The pipeline, replayed. The Streamlit dashboard shows the same data as
       charts; this shows it arriving, which is the only property that makes a
       stream a stream. Thresholds are recalibrated here and the page says why:
       the original alarms above 30 °C, which in Dammam fires on 87.3% of all
       readings. */
    twin: {
      sec: 'The monitoring dashboard',
      lead: 'The pipeline as an operations console: ingestion across the top, live telemetry and the alert stream side by side, per-node sparklines and analytics beneath. One clock drives all of it, so readings arrive, stages carry them and alerts land as they fire.',
      title: 'Smart city real-time IoT monitoring dashboard',
      src: '/iot-twin.html',
      hint: 'Live telemetry · alert stream · node health · analytics',
      note: 'Simulated sensor data, seed 42, the same generator the deployed Streamlit demo uses, replayed deterministically. Alert bands are drawn from the distribution rather than the generic 30 °C default, which would flag <strong>87.3%</strong> of readings in a city whose nodes sit at 32 to 43.5 °C by design.',
    },
    cat: 'ICS 574: Big Data Analytics · KFUPM · Fall 2025 · Co-author: Sultan Aldhafeeri',
    title: 'Real-Time Smart City IoT Monitoring Pipeline',
    desc: 'End-to-end 5-layer streaming architecture for 300+ concurrent IoT sensors across 10 city zones. Sensors → MQTT → Kafka → Spark Streaming → PostgreSQL → Streamlit dashboard. ML temperature forecasting achieved R²=0.876. IQR-based anomaly detection flags threshold breaches in real time. Fully containerised with Docker Compose. Live on Streamlit Cloud.',
    metrics: [
      { v: '300+', l: 'Concurrent sensors' },
      { v: 'R²=0.876', l: 'ML forecast accuracy' },
      { v: '&lt;10 min', l: 'End-to-end latency' },
      { v: '10 zones', l: 'Dammam / Al-Khobar urban area' },
    ],
    method: 'MQTT IoT sensors (10 locations) → Mosquitto broker (port 1883) → Kafka bridge → Apache Kafka (port 9092) → PySpark Structured Streaming (port 4040) → PostgreSQL 15 (port 5432) → Streamlit dashboard (port 8501) with pydeck geographic map',
    tags: ['Apache Kafka', 'PySpark Streaming', 'MQTT (Mosquitto)', 'PostgreSQL 15', 'Docker Compose', 'Streamlit', 'pydeck', 'Python', 'LinearRegression ML', 'IQR Anomaly Detection', 'GitHub'],
    images: [
      { src: `${IMG}/iot_arch.webp`, cap: 'System Architecture — IoT Sensors → MQTT → Kafka → Spark → PostgreSQL → Streamlit Dashboard' },
    ],
    links: [
      { t: 'Live Dashboard', h: 'https://shibliafaq-iot-dashboard.streamlit.app', primary: true },
      { t: 'GitHub', h: 'https://github.com/shibliafaq/real-time-big-data-iot-monitoring-pipeline' },
    ],
  },

  temp: {
    // The Multi-City Surface Temperature section (#thermal) opens inside this card.
    embed: 'thermal',
    /* Three cities on ONE temperature scale. The Kepler.gl clips below render
       each city separately, which is why the finding needed a scatter plot to
       explain it: separately scaled, all three look the same. Sharing the scale
       makes the gradient visible before anything is read. */
    twin: {
      sec: 'Three cities, one scale',
      lead: 'All 25,905 MODIS measurements as 3D hexbins, the three cities side by side on a single shared temperature scale, with the latitude fit and the fourteen-day record beneath. Scrub the days or pool them.',
      title: 'Multi-city surface temperature — 3D comparison',
      src: '/mc-twin.html',
      hint: 'Shared scale · latitude fit · 14-day record',
      note: 'Real NASA MODIS/061/MOD11A1 data, cloud cover ≤ 10%. Every statistic recomputes from the CSV at runtime. Coverage is not equal across the three: MODIS needs a cloud-free overpass, so Dublin has seven of the fourteen days and the dashboard says so rather than interpolating.',
    },
    cat: 'ICS 574: Big Data Analytics · KFUPM · Fall 2025 · Co-author: Sultan Aldhafeeri',
    title: 'Multi-City Surface Temperature Analysis — 3 Cities · 3 Continents',
    desc: '25,905 real NASA MODIS/061/MOD11A1 measurements across Dammam (26°N), Dublin (53°N), and Reykjavik (64°N) over 14 days. Near-perfect latitude–temperature correlation: r = −0.995, R² = 0.990. Every 10° northward = 9.1°C colder. GPU-accelerated Kepler.gl 3D hexbin maps at 60 FPS. The 3D clips below are direct recordings of the live Kepler.gl visualisation.',
    metrics: [
      { v: '25,905', l: 'Real MODIS measurements' },
      { v: 'r=−0.995', l: 'Pearson correlation' },
      { v: 'R²=0.990', l: 'Latitude explains 99% of temp' },
      { v: '58.2°C', l: 'Temperature range' },
    ],
    method: 'MODIS/061/MOD11A1 (Terra) via Google Earth Engine API → Python/Colab (earthengine-api 0.1.400, pandas 2.0.3) → Cloud filter (≤10%) → Kelvin conversion → CSV export (25,905 rows) → Kepler.gl 2.5.5 WebGL 2.0 3D hexbin visualisation → Pearson r & linear regression',
    tags: ['NASA MODIS/061/MOD11A1', 'Google Earth Engine', 'Python (Colab)', 'Kepler.gl 2.5.5', 'WebGL 2.0', 'Pandas 2.0.3', 'Pearson Correlation', 'Linear Regression', 'GPU Rendering'],
    images: [
      { src: `${IMG}/mc_scatter.webp`, cap: 'Latitude–Temperature Regression · r = −0.995 · R² = 0.990 · T = −0.911φ + 56.0' },
      { src: `${IMG}/mc_trends.webp`, cap: 'Temperature Trends Across 14 Days · Dammam (blue) · Dublin (orange) · Reykjavik (green)' },
    ],
    videos: [
      { src: `${VID}/thermal-dammam.mp4`, poster: `${IMG}/thermal-dammam-poster.webp`, cap: 'Dammam, Saudi Arabia · 26°N · Hot Desert · Mean 31.5°C · Kepler.gl 3D Live Recording' },
      { src: `${VID}/thermal-dublin.mp4`, poster: `${IMG}/thermal-dublin-poster.webp`, cap: 'Dublin, Ireland · 53°N · Temperate Maritime · Mean 9.6°C · Kepler.gl 3D Live Recording' },
      { src: `${VID}/thermal-reykjavik.mp4`, poster: `${IMG}/thermal-reykjavik-poster.webp`, cap: 'Reykjavik, Iceland · 64°N · Subpolar · Mean −3.7°C · Kepler.gl 3D Live Recording' },
    ],
    images2: [
      { src: `${IMG}/thermal-dammam-workspace.webp`, cap: 'Kepler.gl workspace — 25,905 MODIS points rendered as a 3D hexbin layer' },
    ],
    links: [],
  },

  its: {
    cat: 'CE 584: Intelligent Transportation Systems · KFUPM · Jan–Apr 2026 · Team of 4',
    title: 'ITS-Based Congestion Management — Aramco Stadium Corridor, Al Khobar',
    desc: 'Multi-criteria ITS strategy for the Aramco Stadium Corridor, Al Khobar — a 47,000-capacity venue with 48.5% evening peak congestion (TomTom 2025). Four alternatives evaluated through a weighted scoring matrix. Recommended integrated 4-layer framework (Sense → Decide → Act → Influence) projects 20–35% travel time reduction within SAR 28–47M. Benchmarked against Qatar 2022 and London 2012.',
    metrics: [
      { v: '20–35%', l: 'Travel time reduction projected' },
      { v: '15–25%', l: 'Emissions cut' },
      { v: 'SAR 28–47M', l: '3-phase implementation budget' },
      { v: '4-layer', l: 'Sense → Decide → Act → Influence' },
    ],
    method: 'Corridor analysis (v/c ratio, peak hour factor) → 4-alternative MCA matrix (efficiency 40%, cost 25%, implementation 20%, environment 15%) → Phased ATMS/ATIS/Smart Parking framework → KPI projection → International benchmarking (Qatar 2022, London 2012)',
    tags: ['Adaptive Signal Control (ASCT)', 'ATMS / TMC', 'ATIS', 'Variable Message Signs', 'Smart Parking', 'Congestion Pricing', 'Multi-Criteria Analysis', 'Event Mobility', 'Vision 2030'],
    images: [
      { src: `${IMG}/its_corridor.webp`, cap: 'Study Area — Aramco Stadium, Al Khobar · King Fahd Road Corridor (48.5% peak congestion)' },
      { src: `${IMG}/its_traffic.webp`, cap: 'TomTom Traffic Index 2025 — Dammam Metro · Evening peak 48.5% · 44 hrs/year lost' },
      { src: `${IMG}/its_method.webp`, cap: 'Seven-Step Research Methodology — Define & Review → Analyse & Evaluate → Deliver' },
    ],
    links: [{ t: 'Manuscript — Under Departmental Review', dev: true }],
  },

  sound: {
    cat: 'ARC 514: Sustainable Urbanism · KFUPM · Advisors: Dr. Adenle & Dr. Basheer · Under Review',
    title: 'A Systematic Review of Soundscape and Thermal Comfort Interactions in Hot-Arid Environments',
    desc: 'PRISMA 2020 systematic review screening 1,011 records on acoustic–thermal comfort interactions in hot-arid urban spaces. Synthesises 22 full-text studies (2005–2025). Developed the Integrated Thermal-Acoustic-Perceptual (ITAP) framework for evidence-based public space design. Submitted to Discovering Cities (Springer Nature). The manuscript contains one toolkit figure which is under review and not reproduced here.',
    metrics: [
      { v: '1,011', l: 'Records screened (PRISMA 2020)' },
      { v: '22', l: 'Full-text studies synthesised' },
      { v: 'ITAP', l: 'New framework developed' },
      { v: 'Under Review', l: 'Discovering Cities · Springer Nature' },
    ],
    method: 'Multi-database search (Scopus, Web of Science, PubMed) → Duplicate removal → Title/abstract screening → Full-text eligibility → Data extraction → Thematic synthesis → ITAP framework development',
    tags: ['PRISMA 2020', 'Systematic Review', 'Thermal Comfort', 'Soundscape', 'Hot-Arid Cities', 'Urban Public Space', 'Environmental Psychology', 'KFUPM', 'ARC 514'],
    links: [],
  },

  arch: {
    cat: 'B.Arch Thesis · BIT Mesra · 2020–2021 · First Class with Distinction',
    title: 'Twin Tower Complex — Net-Zero Mixed-Use High-Rise Development',
    desc: '69-storey net-zero mixed-use complex for a high-seismic urban infill site (10.5 acres, River Basistha, Ranchi). Diagrid exoskeleton (steel, 60° diagonal) reduces structural steel by 20% vs conventional frame. Tuned mass damper at floors 55–58. Net-zero strategy: south-facing double-skin facade, passive natural ventilation through central atrium, PV arrays (est. 40% energy offset) + solar thermal. Full Revit BIM (LOD 300) with complete municipal documentation package.',
    metrics: [
      { v: '69', l: 'Storeys' },
      { v: 'Net-Zero', l: 'Energy design target' },
      { v: 'Diagrid', l: 'Structural system · 60° angle' },
      { v: 'LOD 300', l: 'Revit BIM level' },
    ],
    method: 'Site analysis → Programme stacking → Diagrid structural geometry optimisation → Passive cooling strategy (double-skin facade + atrium ventilation) → Active energy (PV + solar thermal) → Revit BIM modelling (LOD 300) → Full municipal documentation',
    tags: ['Revit BIM (LOD 300)', 'AutoCAD', 'Diagrid Structural System', 'Tuned Mass Damper', 'Net-Zero Energy', 'Double-Skin Facade', 'PV + Solar Thermal', 'Mixed-Use Urban Design'],
    images: [
      { src: `${IMG}/arch_render.webp`, cap: "Twin Tower Complex — Worm's-eye render · Diagrid exoskeleton · B.Arch Thesis 2021" },
      { src: `${IMG}/arch_form.webp`, cap: 'Form Generation & Structural Strategy — Site analysis · Massing · Diagrid structure' },
    ],
    links: [],
  },
};

/** The 18-slide B.Arch portfolio, shown in its own full-screen viewer. */
export const archPages = Array.from(
  { length: 18 },
  (_, i) => `${IMG}/arch_page_${String(i + 1).padStart(2, '0')}.webp`
);
