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
    /* THE ACTUAL ABSTRACT, from CORRECTED_manuscript.md. `desc` is the short
       card summary and stays; this is what the modal leads with. The other
       paper on this site already uses an `abstract` field, so the modal
       already knows how to render one. */
    /* THE ABSTRACT NAMES ITS OWN STRUCTURE — "three findings. First... Second...
       Third..." — so these are not a summary written over the top of it, they
       are its own three claims lifted out and given a shape. The abstract
       stays verbatim underneath; this is what a reader sees first, because a
       2,250-character paragraph is where a card loses people. */
    findings: [
      {
        k: 'Cool, not hot',
        v: 'negative UHI',
        t: 'The cities are COOLER by day than the surrounding desert. That is the inverse of the classical model. The daytime signal is driven by built-up density (NDBI), not vegetation.',
      },
      {
        k: 'Reach beats intensity',
        v: '27× ',
        t: 'The broadest measure protects most. One water feature reaches 16,167 residents in Dammam through spillover; a cool pavement three times as cold reaches 602.',
      },
    ],
    abstract: 'Saudi Arabia’s largest cities are getting hotter, but not according to the traditional urban heat island model. Using an 8-year (2018–2026) grid of MODIS LST data (1 km native, analysed on a ~500 m / 0.005° grid), the thermal behaviour of five desert and coastal cities (Riyadh, Jeddah, Dammam, Makkah and NEOM) is characterised, and an operational digital-twin dashboard is developed to monitor, forecast and mitigate extreme heat. The work is supported by three findings. First, the cities are cooler by day than the surrounding desert, which results in a negative urban heat island intensity (or urban cool-island), and the daytime signal is driven primarily by built-up density (NDBI) rather than by vegetation, quantified by a sign-constrained regression fit on each city’s own summer data instead of by coefficients borrowed from the literature. Second, the cool-island is not static: a Prophet forecasting family, forecasting land-surface temperature directly for both day and night on a corrected equal-area geometry, reproduces the seasonal cycle (monthly RMSE 0.96–1.91 °C by day and 0.79–1.29 °C by night, r 0.94–0.99) and projects a progressive decrease of the cool-island toward zero by 2030, with a warming trend in both desert and city, to −0.01 °C in Makkah but remaining between −0.67 and −1.31 °C in the other four cities. Third, the heat-vulnerability index and the intervention simulator convert this physics into planning decisions: the simulation uses the same own-data coefficients to estimate cell-level cooling, its spatial spillover, the residents and elderly who benefit, an approximate cost, and the districts affected. The cross-sensor comparison against Landsat returned a correlation of R > 0.85 in all five cities. The broadest intervention, not the most localised, provides the most protection: a single water feature reaches tens of thousands of residents through spillover, whereas an intense but local measure such as a cool roof protects only the few hundred residents of the block it covers. The dashboard packages monitoring, forecasting, vulnerability and mitigation in one interface, and builds on recent urban-digital-twin research from a single pilot microclimate to a multi-city, decision-support scale.',
    /* SHORT, AND DELIBERATELY NOT A SUMMARY OF THE ABSTRACT.

       This used to be a stack list — MODIS, Prophet, HVI, the simulator,
       FastAPI, deck.gl — every item of which the abstract below now states
       properly, in the paper's own words. Two paragraphs saying the same thing
       in the same place makes the reader skim both.

       So `desc` does the one job the abstract cannot: it says why the work
       exists before the reader has agreed to read anything. The gap it names is
       the one the literature review identifies — plenty of description of where
       it has been hot, almost no operational capacity to act on where it is hot
       now. */
    desc: 'Most heat research describes where it has already been hot. This is built for the questions that come after: how hot it is now, where that is heading, and what a given intervention would actually change. Five Saudi cities, in one interface a planner can use.',
    diagram: 'thesis',
    /* TABLES 5.22 AND 5.23, which are the two results the simulator exists
       to produce. The previous version quoted only the Dammam pair (16,167
       against 602) and called it a worked example; those numbers were right
       but they were one row of a five-row finding, so the pattern they were
       chosen to illustrate could not actually be seen. */
    worked: {
      sec: 'Intervention simulator: what reaches people',
      lead: 'Repeating one worked example at the hottest inhabited cell in every city gives two matrices, and the lesson is in the gap between them. Intensity and benefit have almost nothing to do with each other: the six local measures each cool only the block they sit on, however hard they cool it, while the two wide-spillover measures carry across the neighbourhood.',
      /* cooling at the treated cell, before spillover (Table 5.22) */
      cooling: {
        cap: 'Direct per-cell surface cooling (°C), summer betas, standard intensity',
        cities: ['Riyadh', 'Jeddah', 'Dammam', 'Makkah', 'NEOM'],
        rows: [
          { m: 'Cool pavement',   v: [-9.12, -8.88, -9.11, -8.66, -9.90] },
          { m: 'Cool roof',       v: [-3.04, -2.96, -3.04, -2.89, -3.30] },
          { m: 'Green roof',      v: [-1.78, -2.38, -3.07, -1.44, -1.98] },
          { m: 'De-paving',       v: [-2.18, -1.43, -2.43, -4.05, -0.29] },
          { m: 'Water feature',   v: [-2.00, -2.00, -2.00, -2.00, -2.00] },
          { m: 'Urban greening',  v: [-0.35, -1.06, -3.10,  0.00, -0.33] },
        ],
        note: 'The reflectivity levers sit on a physics-based albedo term and behave almost identically everywhere. The vegetation levers follow each city\u2019s own regression, strongest in Dammam and honestly zero in Makkah, whose NDVI coefficient is zero.',
      },
      /* neighbourhood reach and residents benefited (Table 5.23) */
      reach: {
        cap: 'Cells reached and residents benefited, same cell, same intensity',
        rows: [
          { c: 'Riyadh', w: [21, 14613], g: [9, 6286], l: [1, 696] },
          { c: 'Jeddah', w: [12, 9109],  g: [6, 4541], l: [1, 734] },
          { c: 'Dammam', w: [27, 16167], g: [9, 5473], l: [1, 602] },
          { c: 'Makkah', w: [11, 810],   g: [0, 0],    l: [1, 65] },
          { c: 'NEOM',   w: [27, 56],    g: [9, 18],   l: [1, 2] },
        ],
        note: 'Makkah\u2019s greening column is zero because its greening coefficient is zero, and NEOM\u2019s counts are negligible because its hottest cells are almost uninhabited. Both are kept rather than hidden: a simulator that only reports where it works is not a simulator.',
      },
      foot: 'In Dammam one water feature cools 16,167 residents while a −9 °C cool pavement cools 602. That is 27× the reach for the weaker measure. Ranking by residents reached, not by degrees delivered, is what the simulator exists to do.',
    },
    /* FROM THE MANUSCRIPT, WHICH OUTRANKS THE DASHBOARD SNAPSHOT.

       These were briefly "corrected" against public/uhi-twin/db and that was
       wrong. The snapshot is a frozen export the embedded demo runs on; the
       thesis is the result. Where they differ the manuscript wins, and it
       states monthly RMSE 0.96-1.91 C by day and 0.79-1.29 C by night with
       r 0.94-0.99, and R > 0.85 against Landsat in all five cities. The
       from the card by choice, not by doubt). The snapshot showed 0.98-1.87
       and carried no cross-sensor comparison at all, which is why checking a
       claim against the nearest data rather than its source can retire a true

       1.37M is the population of the Very-High HVI class summed across the
       five cities. Named as the class rather than as "at-risk", because the
       database also has a pop_at_risk field meaning the top TWO classes,
       which totals 2.48M -- so the looser word pointed at the wrong figure. */
    metrics: [
      { v: '0.96–1.91 °C', l: 'Monthly LST RMSE by day · 0.79–1.29 by night' },
      { v: '1.37M', l: 'Residents in Very-High vulnerability cells' },
      { v: '2018–2026', l: 'Eight years of MODIS LST on a 500 m grid' },
    ],
    /* The dashboard itself, running in the page.
       It is the static ("lite") build: the FastAPI backend is replaced by a
       frozen JSON snapshot, so there is no server to keep alive and nothing to
       go stale mid-demo. Everything below the surface is the real thing — the
       same deck.gl map, the same Prophet forecasts, the same simulator. */
    twin: {
      sec: 'The dashboard, running',
      lead: 'This is the lite version with frozen data in a dashboard; it shows tabs across five cities of the study database and it runs without a backend.',
      title: 'UHI Digital Twin · interactive dashboard',
      src: '/uhi-twin/index.html',
      hint: 'Map · Weather · Climate · Statistics · Forecast · Interventions · System',

    },
    tags: ['Google Earth Engine', 'PostgreSQL/PostGIS', 'FastAPI', 'Prophet', 'deck.gl', 'MapLibre', 'Docker Compose', 'Design Science Research', 'Heat Vulnerability Index', 'Intervention Simulator', 'Vision 2030'],
    links: [
      { t: 'Open the dashboard full screen', h: '/uhi-twin/index.html', primary: true },
      { t: 'Ask about the backend & data pipeline', h: 'mailto:shibliafaq4@gmail.com?subject=Digital%20Twin%20—%20backend%20walkthrough' },
    ],
  },

  gis: {
    cat: 'CRP 583: Urban Informatics · KFUPM · Jan–May 2026',
    /* Supervisor, co-author and target journals existed only in the retired
       "Research Output" section. The status pill now carries "unpublished",
       which `cat` used to say, so `cat` no longer repeats it. */
    pub: {
      authors: 'Shibli Afaq · Supervisor: Dr. Baqer Al-Ramadan',
      venue: '2026 · Target: Urban Climate / Sustainable Cities and Society',
      state: 'prep',
      status: 'Manuscript in Preparation',
    },
    title: 'GIS & Remote Sensing UHI Assessment — Dammam Metropolitan Area',
    /* The manuscript's own abstract, verbatim (final version, May 2026).
       Unpublished, so this is the submitted text rather than a version of
       record; the entry says so above rather than implying peer review. */
    abstract: 'The problem of urban heat island (UHIs) is an increasing health concern in hot-arid cities. This paper evaluates patterns of land surface temperature (LST) and heat vulnerability across the Dammam Metropolitan Area (DMA) using a five-step GIS and remote sensing model. LST was derived from Landsat 8/9 TIRS data for 2020, 2023, and 2025, while NDVI and NDBI were derived from Sentinel-2 MSI and population exposure was represented using WorldPop 2020 data. These datasets were processed using a 500 m fishnet grid with 12,954 cells. Pearson correlation, linear regression, two Heat Vulnerability Index (HVI) models, dual-threshold exposure mapping, Getis-Ord Gi* hotspot analysis, and sensitivity testing using three scenarios were used to analyze these data. The results show that NDBI is the strongest LST predictor in all years. In 2020, NDBI had r = 0.715 and R² = 0.511. The regression slope indicates that a 0.10-unit decrease in normalized built-up intensity is associated with an approximate 0.130-unit reduction in normalized LST. Composite HVI classified 92.6% of cells as High vulnerability. The dual-threshold exposure map identified 229 cells, equal to 57.3 km² or 1.8% of the DMA, as Very High Exposure. The HVI 99% Hot Spot covered 505 km², which is 4.18 times larger than the LST-only 99% Hot Spot of 120.8 km². This confirms that multi-factor vulnerability analysis reveals planning priorities that temperature-only mapping does not show.',
    desc: 'A five-step GIS and remote-sensing assessment of heat and who is exposed to it, across 12,954 grid cells covering the 3,238 km² Dammam Metropolitan Area at 500 m resolution.',
    metrics: [
      { v: '12,954', l: 'Grid cells analysed' },
      { v: 'R²=0.511', l: 'NDBI explains 51% of LST variance' },
      { v: '57.3 km²', l: 'Very High Exposure zone' },
      { v: '4.18×', l: 'HVI hotspot vs LST-only' },
    ],
    /* THE NINE STEPS, AS STEPS. This was one line of arrow-separated text —
       readable as a sentence, useless as a method: nothing showed where one
       stage ended, which stages belonged together, or that the last two are
       checks on the result rather than more processing. The phases are the
       paper's own five-step structure; the numbering is the order they run. */
    methodFlow: [
      {
        phase: 'Acquire',
        steps: [
          { t: 'GEE data acquisition', s: 'Landsat 8/9 TIRS · Sentinel-2 MSI · WorldPop' },
          { t: 'SetNull() water masking', s: 'Gulf and inland water removed before statistics' },
        ],
      },
      {
        phase: 'Structure',
        steps: [
          { t: '500 m fishnet', s: '12,954 cells over 3,238 km²' },
          { t: 'Zonal statistics', s: 'LST, NDVI, NDBI and population per cell' },
          { t: 'Min-max normalisation', s: 'Every input onto a common 0–1 range' },
        ],
      },
      {
        phase: 'Analyse',
        steps: [
          { t: 'Pearson r and regression', s: 'Which index actually predicts LST' },
          { t: 'Simplified and Composite HVI', s: 'Two vulnerability models, built separately' },
        ],
      },
      {
        phase: 'Locate and test',
        steps: [
          { t: 'Getis-Ord Gi*', s: 'Fixed 1,000 m band · statistically significant clusters' },
          { t: '3-scenario sensitivity analysis', s: 'Does a cell change class when the weighting does' },
        ],
      },
    ],
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
    /* The thirteen maps that used to sit here are gone. They were the paper's
       figures, and the tile is now abstract + metrics + the dashboard: the twin
       renders the same thirteen layers over one terrain, which is the thing a
       flat sheet could not do. Kept in git if they are ever wanted back. */
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
    /* The Landsat build REPLACED the MODIS one on 2026-08-20: 134 cities
       instead of 3, 30 m instead of 1 km, and both hemispheres fitted
       separately. mc-twin.html has been deleted. The counts below are read
       off public/assets/data/lst/index.json — if the payload is rebuilt,
       re-check them there rather than trusting this comment. */
    twin: {
      sec: 'Surface temperature, 134 cities',
      lead: 'Landsat 8/9 thermal imagery at 30 m for 134 cities along a north–south transect, from Tromsø at 70°N to Punta Arenas at 53°S. Pick a city to see its heat surface in 3D and scrub a year of acquisitions; the analysis tab fits each hemisphere separately.',
      title: 'Global surface temperature — Landsat 30 m',
      src: '/lst-twin.html',
      hint: '134 cities · 30 m · a year of acquisitions · two hemispheres',
      note: 'Landsat 8/9 Collection 2 Level 2 (USGS) via Microsoft Planetary Computer, band ST_B10, cloud and shadow masked per pixel with QA_PIXEL. Cities carry between 6 and 24 usable acquisitions depending on cloud. Basemap © Esri, © OpenStreetMap contributors.',
    },
    cat: 'ICS 574: Big Data Analytics · KFUPM · Fall 2025 · Co-author: Sultan Aldhafeeri',
    title: 'Multi-City Surface Temperature — 3 Cities · GPU Hexbin Pipeline',
    desc: '25,905 NASA MODIS/061/MOD11A1 measurements across Dammam (26°N), Dublin (53°N), and Reykjavik (64°N) over 14 days, rendered as GPU-accelerated 3D hexbin layers in Kepler.gl at 60 FPS. This is a demonstration of the pipeline rather than a study of latitude. Three cities give three points, and three points always fall near a line, so the correlation it produces describes the sample and is not evidence of a gradient. The Landsat dashboard on this card measures the same relationship across 134 cities and finds a pooled R² of 0.688, with no gradient at all across the first 20° of latitude. The 3D clips below are direct recordings of the live Kepler.gl visualisation.',
    metrics: [
      { v: '25,905', l: 'MODIS measurements · 3 cities, 14 days' },
      { v: '3', l: 'Cities · a demo sample, not a study population' },
      { v: '60 FPS', l: 'GPU hexbin rendering · Kepler.gl, WebGL 2.0' },
      { v: '58.2°C', l: 'Temperature range across the three cities' },
    ],
    method: 'MODIS/061/MOD11A1 (Terra) via Google Earth Engine API → Python/Colab (earthengine-api 0.1.400, pandas 2.0.3) → Cloud filter (≤10%) → Kelvin conversion → CSV export (25,905 rows) → Kepler.gl 2.5.5 WebGL 2.0 3D hexbin visualisation → Pearson r & linear regression',
    tags: ['NASA MODIS/061/MOD11A1', 'Google Earth Engine', 'Python (Colab)', 'Kepler.gl 2.5.5', 'WebGL 2.0', 'Pandas 2.0.3', 'Pearson Correlation', 'Linear Regression', 'GPU Rendering'],
    images: [
      { src: `${IMG}/mc_scatter.webp`, cap: 'Latitude–temperature regression on three city means, r = −0.995 with n = 3. Three points always fall near a line, so this describes the sample rather than a gradient; the 134-city fit is in the Landsat dashboard.' },
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
    cat: 'CE 584: Intelligent Transportation Systems · KFUPM · Jan–Apr 2026',
    /* "Team of 4" was all the tile said about authorship; the retired section
       actually named them, and named the instructor and the target journals. */
    pub: {
      authors: 'Shibli Afaq, H. Alnasser, H. Alghamdi, S. Aldhafeeri · Instructor: Dr. Muhammad Abdullah',
      venue: '2026 · Target: Journal of Intelligent Transportation Systems / Transportation Research Part C',
      state: 'prep',
      status: 'Manuscript in Preparation',
    },
    title: 'ITS-Based Congestion Management — Aramco Stadium Corridor, Al Khobar',
    desc: 'A corridor-level ITS strategy for the 47,000-capacity Aramco Stadium in Al Khobar, host venue for the 2027 AFC Asian Cup and 2034 FIFA World Cup. The corridor already runs at 48.5% evening congestion with 44 hours lost per driver per year (TomTom 2025), and faces a dual-regime problem: chronic daily load overlaid by concentrated event surges. Four cumulative alternatives were scored on a weighted multi-criteria matrix; the recommended one integrates adaptive signal control, ATMS/ATIS, smart parking and park-and-ride, with demand pricing held back as a conditional final phase.',
    /* The manuscript's own abstract, verbatim (final version, May 2026).
       Unpublished and under departmental review, so this is the submitted text.
       Note it makes no outcome claims of its own -- the paper is careful that
       its cost and KPI figures are indicative planning estimates drawn from
       published literature, not measured results, and the metrics below say so. */
    abstract: 'Urban corridors next to major sports venues present a traffic challenge. Chronic daily congestion that already strains the network is overlaid by concentrated, directional event surges that conventional infrastructure alone cannot absorb. The Aramco Stadium corridor in Al Khobar, Saudi Arabia, illustrates this challenge precisely. According to TomTom\'s 2025 Traffic Index, the Dammam metropolitan area (including Al Khobar) has 48.5 percent congestion during the evening rush hour and an average 44 hours of time lost per driver annually. This paper develops a data-supported, integrated Intelligent Transportation Systems (ITS) strategy to reduce congestion on the corridor under both daily and event conditions. The methodology draws exclusively on peer-reviewed literature, official government and institutional sources, and verified traffic indices. Four cumulative strategy alternatives are evaluated using a weighted multi-criteria scoring matrix. The proposed strategy layers include Adaptive Traffic Signal Control (ATSC) as the operational layer, Advanced Traffic Management System (ATMS) and Advanced Traveler Information System (ATIS) as the monitoring and information layer, smart parking guidance and park-and-ride as the event-access layer, and demand-management pricing as the optional, final layer. This paper proposes a three-stage implementation plan with indicative cost and KPI improvement estimates. The corridor, if managed with the proposed strategy, can be used as a pilot of smart mobility projects in Saudi Arabia\'s Vision 2030.',
    /* Every figure here is checked against the manuscript. The previous set was
       not: it claimed 20-35% travel time reduction, a 15-25% emissions cut and a
       SAR 28-47M budget, none of which appear in the paper. The paper cites
       10-20% from the ATSC literature and prices Alternative C at roughly
       $4.3M-$12.1M in indicative US dollars. */
    metrics: [
      { v: '48.5%', l: 'Evening peak congestion · TomTom 2025, Dammam metro' },
      { v: '10–20%', l: 'Travel-time saving from ATSC · published empirical range' },
      { v: '$4.3–12.1M', l: 'Indicative cost, recommended alternative · planning-level' },
      { v: '4-layer', l: 'Sense → Decide → Act → Influence' },
    ],
    method: 'Corridor and dual-regime problem definition → literature and international case review (Qatar 2022, London 2012) → four cumulative alternatives → weighted multi-criteria scoring matrix on seven criteria → Alternative C selected (score 3.75) → four-layer ITS architecture → three-phase implementation plan with indicative costs from FHWA and HDR benchmarks',
    tags: ['Adaptive Signal Control (ATSC)', 'ATMS / TMC', 'ATIS', 'Variable Message Signs', 'Smart Parking', 'Park-and-Ride', 'Congestion Pricing', 'Multi-Criteria Analysis', 'Event Mobility', 'Vision 2030'],
    links: [{ t: 'Manuscript — Under Departmental Review', dev: true }],
  },

  sound: {
    cat: 'Peer-reviewed journal article · Open Access',
    /* THE PUBLICATION RECORD, MOVED HERE FROM THE RETIRED "RESEARCH OUTPUT"
       SECTION. Authors, venue and status used to be stated once on the front
       page and nowhere else; folded into the tile they have to live on the
       entry itself, or the only claim to peer review disappears with the
       section. `cat` was the venue line before this and would now say it
       twice, so it is back to naming the kind of work. */
    pub: {
      authors: 'Shibli Afaq, Yusuf A. Adenle, Muhammad Aamir Basheer',
      venue: 'Discover Cities (Springer Nature) · 2026 · 3:123 · Open Access',
      state: 'published',
      status: 'Published · June 2026',
      doi: 'https://doi.org/10.1007/s44327-026-00314-z',
    },
    title: 'A Systematic Review of Soundscape and Thermal Comfort Interactions in Hot-Arid Environments',
    desc: 'Published in Discover Cities, June 2026. A PRISMA 2020 systematic review of how the acoustic environment shapes outdoor thermal comfort in hot-arid cities. 1,011 records screened across Scopus, Semantic Scholar and AI-assisted snowballing; 22 studies (2005–2025) synthesised into five interlinked themes. Introduces the Integrated Thermo-Acoustic Planning (ITAP) Framework and a persona-based Interdisciplinary Implementation Toolkit for Vision 2030 public space design.',
    /* The published abstract, verbatim from Discover Cities (2026) 3:123.
       Not a paraphrase: the paper is open access under CC BY-NC-ND, this is the
       version of record, and a portfolio that restates an abstract in its own
       words invites the reader to wonder which version they are reading. */
    abstract: 'In hot-arid cities, the soundscape of public space has been an underutilized element of urban design, often treated as a secondary consideration relative to visual appearance. This neglect contributes to thermal discomfort and the underutilization of urban outdoor public space, a problem that is especially prevalent in the Gulf region, where the lack of shade renders the outdoor public space uninhabitable for a significant portion of the year. To fill this gap, this study aims to conduct a PRISMA-guided systematic review of 22 peer-reviewed studies (2005–2025) that focus on the soundscape design, outdoor thermal comfort, and urban space quality in hot-arid and thermally comparable environments. Thematic content analysis reveals five theme areas that are interlinked: (i) integrated thermal-acoustic design, (ii) the function of green and blue infrastructure in soundscapes, (iii) multisensory perception and psychological restoration, (iv) problems and concerns with human-centered soundscape planning, and (v) the impact of urban morphology on microclimate and sound propagation. The synthesis shows that, under moderate thermal stress conditions, positive soundscapes (created with natural sounds and green-blue infrastructure) can positively influence the thermoceptive comfort perception and decrease the perceived heat stress as well as encourage active use of public space. These benefits, however, are limited, becoming much less pronounced in extreme heat and are predominantly psychological and cognitive in nature, operating through individual appraisal rather than direct sensory response. Based on these findings, the paper introduces the Integrated Thermo-Acoustic Planning (ITAP) Framework as a multi-scalar, evidence-based design model and a persona-based Interdisciplinary Implementation Toolkit. These outputs, combined, offer context-specific guidelines for the design of walkable, thermally comfortable, and acoustically restorative public spaces to support the Saudi Arabia Vision 2030 Quality of Life Programme.',
    metrics: [
      { v: '1,011', l: 'Records screened · Scopus 737, Semantic Scholar 250, Elicit 24' },
      { v: '22', l: 'Studies synthesised (2005–2025) · from 78 assessed for eligibility' },
      { v: '5', l: 'Interlinked themes identified' },
      { v: 'Published', l: 'Discover Cities · 2026 · 3:123 · Open Access' },
    ],
    method: 'Multi-database search (Scopus, Semantic Scholar) + AI-assisted snowballing (Elicit) → 1,011 records screened → 931 excluded → 80 sought, 78 assessed → 56 excluded on inclusion criteria → 22 included → two-stage thematic content analysis, consensus across all co-authors → five themes → ITAP Framework + Interdisciplinary Implementation Toolkit',
    tags: ['PRISMA 2020', 'Systematic Review', 'Thermal Comfort', 'Soundscape', 'Hot-Arid Cities', 'Green/Blue Infrastructure', 'Urban Morphology', 'Environmental Psychology', 'Vision 2030', 'Open Access'],
    links: [
      { t: 'Read the paper — Discover Cities (Open Access)', h: 'https://doi.org/10.1007/s44327-026-00314-z', primary: true },
    ],
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
