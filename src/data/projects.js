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
    cat: 'M.Sc. Thesis · KFUPM · Architecture & City Design · Under Development',
    title: 'Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting & Mitigation',
    desc: 'Currently under active development. Built on Design Science Research methodology, this near-real-time digital twin platform ingests multi-satellite feeds via Google Earth Engine, runs city-specific Prophet ML forecasting models, and outputs an equity-weighted Heat Vulnerability Index — all served through a Streamlit + Kepler.gl dashboard. Five Saudi cities. One framework. &lt;10-min satellite-to-screen latency.',
    metrics: [
      { v: '&lt;10 min', l: 'Pipeline latency' },
      { v: '&lt;1.5°C', l: 'Forecast RMSE target' },
      { v: '100K+', l: 'At-risk residents mapped' },
      { v: '5 cities', l: 'Riyadh · Jeddah · Dammam · Makkah · NEOM' },
    ],
    method: 'Google Earth Engine API → Apache Kafka 3-broker cluster → PySpark Structured Streaming (event-time watermarking) → PostgreSQL + PostGIS → Facebook Prophet (city-specific, meteorological exogenous regressors) → Streamlit dashboard + Kepler.gl 3D HVI map',
    tags: ['Google Earth Engine', 'Apache Kafka', 'PySpark Streaming', 'PostgreSQL + PostGIS', 'Facebook Prophet', 'Streamlit', 'Kepler.gl 3D', 'Docker Compose', 'Design Science Research', 'Heat Vulnerability Index', 'Vision 2030'],
    images: [
      { src: `${IMG}/thesis_arch.webp`, cap: 'System Architecture — Input → Processing Engine → Output Dashboard → End Users' },
      { src: `${IMG}/thesis_pipeline.webp`, cap: 'Technical Data Pipeline — Satellite Data → GEE → Kafka → Spark → PostgreSQL → Streamlit' },
    ],
    links: [{ t: 'Under Development — No Public Demo Yet', dev: true }],
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
    images: [
      { src: `${IMG}/gis_lst.webp`, cap: 'Land Surface Temperature 2023 — Landsat 8/9 TIRS (mean 49.3°C · max 65.8°C)' },
      { src: `${IMG}/gis_ndbi.webp`, cap: 'NDBI 2023 — Built-up Index, dominant LST predictor (r = 0.715, R² = 0.511)' },
      { src: `${IMG}/gis_hvi.webp`, cap: 'HVI Simple — 92.6% of DMA cells classified High or Very High Vulnerability' },
      { src: `${IMG}/gis_exposure.webp`, cap: 'High Exposure Map — 229 cells · 57.3 km² · Central Dammam & Al-Khobar core' },
    ],
    links: [{ t: 'Manuscript — Under Departmental Review', dev: true }],
  },

  iot: {
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
