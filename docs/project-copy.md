# Project copy

Every word on the project cards and inside their modals. Edit the lines that
begin with `- ` and nothing else: the `###` keys are how each line finds its
way back into `src/data/projects.js`.

    node tools/sync-project-copy.mjs           # what would change
    node tools/sync-project-copy.mjs --write   # apply it

HTML is allowed and is kept as written — several fields already carry `<em>`
and `<strong>`. What is NOT here is structure: which projects exist, how many
metrics each has, image paths, links and tags all live in the source file,
because their shape matters as much as their text.


## M.Sc. Thesis — Smart Digital Twin  `thesis`

### thesis.cat
- M.Sc. Thesis · KFUPM · Architecture & City Design

### thesis.title
- Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting & Mitigation

### thesis.findings.0.v
- negative UHI

### thesis.findings.0.t
- The cities are COOLER by day than the surrounding desert. That is the inverse of the classical model. The daytime signal is driven by built-up density (NDBI), not vegetation.

### thesis.findings.1.v
- 27× 

### thesis.findings.1.t
- The broadest measure protects most. One water feature reaches 16,167 residents in Dammam through spillover; a cool pavement three times as cold reaches 602.

### thesis.abstract
- Saudi Arabia’s largest cities are getting hotter, but not according to the traditional urban heat island model. Using an 8-year (2018–2026) grid of MODIS LST data (1 km native, analysed on a ~500 m / 0.005° grid), the thermal behaviour of five desert and coastal cities (Riyadh, Jeddah, Dammam, Makkah and NEOM) is characterised, and an operational digital-twin dashboard is developed to monitor, forecast and mitigate extreme heat. The work is supported by three findings. First, the cities are cooler by day than the surrounding desert, which results in a negative urban heat island intensity (or urban cool-island), and the daytime signal is driven primarily by built-up density (NDBI) rather than by vegetation, quantified by a sign-constrained regression fit on each city’s own summer data instead of by coefficients borrowed from the literature. Second, the cool-island is not static: a Prophet forecasting family, forecasting land-surface temperature directly for both day and night on a corrected equal-area geometry, reproduces the seasonal cycle (monthly RMSE 0.96–1.91 °C by day and 0.79–1.29 °C by night, r 0.94–0.99) and projects a progressive decrease of the cool-island toward zero by 2030, with a warming trend in both desert and city, to −0.01 °C in Makkah but remaining between −0.67 and −1.31 °C in the other four cities. Third, the heat-vulnerability index and the intervention simulator convert this physics into planning decisions: the simulation uses the same own-data coefficients to estimate cell-level cooling, its spatial spillover, the residents and elderly who benefit, an approximate cost, and the districts affected. The cross-sensor comparison against Landsat returned a correlation of R > 0.85 in all five cities. The broadest intervention, not the most localised, provides the most protection: a single water feature reaches tens of thousands of residents through spillover, whereas an intense but local measure such as a cool roof protects only the few hundred residents of the block it covers. The dashboard packages monitoring, forecasting, vulnerability and mitigation in one interface, and builds on recent urban-digital-twin research from a single pilot microclimate to a multi-city, decision-support scale.

### thesis.desc
- Most heat research describes where it has already been hot. This is built for the questions that come after: how hot it is now, where that is heading, and what a given intervention would actually change. Five Saudi cities, in one interface a planner can use.

### thesis.worked.sec
- Intervention simulator: what reaches people

### thesis.worked.lead
- Repeating one worked example at the hottest inhabited cell in every city gives two matrices, and the lesson is in the gap between them. Intensity and benefit have almost nothing to do with each other: the six local measures each cool only the block they sit on, however hard they cool it, while the two wide-spillover measures carry across the neighbourhood.

### thesis.worked.cooling.note
- The reflectivity levers sit on a physics-based albedo term and behave almost identically everywhere. The vegetation levers follow each city\u2019s own regression, strongest in Dammam and honestly zero in Makkah, whose NDVI coefficient is zero.

### thesis.worked.reach.note
- Makkah\u2019s greening column is zero because its greening coefficient is zero, and NEOM\u2019s counts are negligible because its hottest cells are almost uninhabited. Both are kept rather than hidden: a simulator that only reports where it works is not a simulator.

### thesis.worked.foot
- In Dammam one water feature cools 16,167 residents while a −9 °C cool pavement cools 602. That is 27× the reach for the weaker measure. Ranking by residents reached, not by degrees delivered, is what the simulator exists to do.

### thesis.metrics.0.v
- 0.96–1.91 °C

### thesis.metrics.0.l
- Monthly LST RMSE by day · 0.79–1.29 by night

### thesis.metrics.1.v
- 1.37M

### thesis.metrics.1.l
- Residents in Very-High vulnerability cells

### thesis.metrics.2.v
- 2018–2026

### thesis.metrics.2.l
- Eight years of MODIS LST on a 500 m grid

### thesis.twin.sec
- The dashboard, running

### thesis.twin.lead
- This is the lite version with frozen data in a dashboard; it shows tabs across five cities of the study database and it runs without a backend.

### thesis.twin.title
- UHI Digital Twin · interactive dashboard

### thesis.twin.hint
- Map · Weather · Climate · Statistics · Forecast · Interventions · System

### thesis.links.0.t
- Open the dashboard full screen

### thesis.links.1.t
- Ask about the backend & data pipeline


## GIS & Remote Sensing UHI Assessment  `gis`

### gis.cat
- CRP 583: Urban Informatics · KFUPM · Jan–May 2026

### gis.pub.authors
- Shibli Afaq · Supervisor: Dr. Baqer Al-Ramadan

### gis.pub.venue
- 2026 · Target: Urban Climate / Sustainable Cities and Society

### gis.pub.status
- Manuscript in Preparation

### gis.title
- GIS & Remote Sensing UHI Assessment — Dammam Metropolitan Area

### gis.abstract
- The problem of urban heat island (UHIs) is an increasing health concern in hot-arid cities. This paper evaluates patterns of land surface temperature (LST) and heat vulnerability across the Dammam Metropolitan Area (DMA) using a five-step GIS and remote sensing model. LST was derived from Landsat 8/9 TIRS data for 2020, 2023, and 2025, while NDVI and NDBI were derived from Sentinel-2 MSI and population exposure was represented using WorldPop 2020 data. These datasets were processed using a 500 m fishnet grid with 12,954 cells. Pearson correlation, linear regression, two Heat Vulnerability Index (HVI) models, dual-threshold exposure mapping, Getis-Ord Gi* hotspot analysis, and sensitivity testing using three scenarios were used to analyze these data. The results show that NDBI is the strongest LST predictor in all years. In 2020, NDBI had r = 0.715 and R² = 0.511. The regression slope indicates that a 0.10-unit decrease in normalized built-up intensity is associated with an approximate 0.130-unit reduction in normalized LST. Composite HVI classified 92.6% of cells as High vulnerability. The dual-threshold exposure map identified 229 cells, equal to 57.3 km² or 1.8% of the DMA, as Very High Exposure. The HVI 99% Hot Spot covered 505 km², which is 4.18 times larger than the LST-only 99% Hot Spot of 120.8 km². This confirms that multi-factor vulnerability analysis reveals planning priorities that temperature-only mapping does not show.

### gis.desc
- A five-step GIS and remote-sensing assessment of heat and who is exposed to it, across 12,954 grid cells covering the 3,238 km² Dammam Metropolitan Area at 500 m resolution.

### gis.metrics.0.v
- 12,954

### gis.metrics.0.l
- Grid cells analysed

### gis.metrics.1.v
- R²=0.511

### gis.metrics.1.l
- NDBI explains 51% of LST variance

### gis.metrics.2.v
- 57.3 km²

### gis.metrics.2.l
- Very High Exposure zone

### gis.metrics.3.v
- 4.18×

### gis.metrics.3.l
- HVI hotspot vs LST-only

### gis.methodFlow.0.steps.0.t
- GEE data acquisition

### gis.methodFlow.0.steps.1.t
- SetNull() water masking

### gis.methodFlow.1.steps.0.t
- 500 m fishnet

### gis.methodFlow.1.steps.1.t
- Zonal statistics

### gis.methodFlow.1.steps.2.t
- Min-max normalisation

### gis.methodFlow.2.steps.0.t
- Pearson r and regression

### gis.methodFlow.2.steps.1.t
- Simplified and Composite HVI

### gis.methodFlow.3.steps.0.t
- Getis-Ord Gi*

### gis.methodFlow.3.steps.1.t
- 3-scenario sensitivity analysis

### gis.twin.sec
- The assessment, in three dimensions

### gis.twin.lead
- All thirteen layers over one 12,954-cell terrain. Height and colour both carry the value, the formula behind each index is on screen, and the priority control isolates the 229 cells where heat and population actually coincide.

### gis.twin.title
- Dammam heat vulnerability — 3D twin

### gis.twin.hint
- Inputs · five HVI weightings · agreement · exposure

### gis.twin.note
- Classification is by equal count, because the middle half of the cells spans only 3 to 15 per cent of each raw range and a linear scale renders the metro as a plateau. Legend breaks print the real values. Basemap © CARTO, © OpenStreetMap contributors.

### gis.links.0.t
- Manuscript — Under Departmental Review


## Real-Time Smart City IoT Pipeline  `iot`

### iot.twin.sec
- The monitoring dashboard

### iot.twin.lead
- The pipeline as an operations console: ingestion across the top, live telemetry and the alert stream side by side, per-node sparklines and analytics beneath. One clock drives all of it, so readings arrive, stages carry them and alerts land as they fire.

### iot.twin.title
- Smart city real-time IoT monitoring dashboard

### iot.twin.hint
- Live telemetry · alert stream · node health · analytics

### iot.twin.note
- Simulated sensor data, seed 42, the same generator the deployed Streamlit demo uses, replayed deterministically. Alert bands are drawn from the distribution rather than the generic 30 °C default, which would flag <strong>87.3%</strong> of readings in a city whose nodes sit at 32 to 43.5 °C by design.

### iot.cat
- ICS 574: Big Data Analytics · KFUPM · Fall 2025

### iot.title
- Real-Time Smart City IoT Monitoring Pipeline

### iot.desc
- End-to-end 5-layer streaming architecture for 300+ concurrent IoT sensors across 10 city zones. Sensors → MQTT → Kafka → Spark Streaming → PostgreSQL → Streamlit dashboard. ML temperature forecasting achieved R²=0.876. IQR-based anomaly detection flags threshold breaches in real time. Fully containerised with Docker Compose. Live on Streamlit Cloud.

### iot.metrics.0.v
- 300+

### iot.metrics.0.l
- Concurrent sensors

### iot.metrics.1.v
- R²=0.876

### iot.metrics.1.l
- ML forecast accuracy

### iot.metrics.2.v
- &lt;10 min

### iot.metrics.2.l
- End-to-end latency

### iot.metrics.3.v
- 10 zones

### iot.metrics.3.l
- Dammam / Al-Khobar urban area

### iot.methodFlow.0.steps.0.t
- IoT sensors

### iot.methodFlow.0.steps.1.t
- Mosquitto MQTT broker

### iot.methodFlow.1.steps.0.t
- Kafka bridge

### iot.methodFlow.1.steps.1.t
- Apache Kafka

### iot.methodFlow.1.steps.2.t
- PySpark Structured Streaming

### iot.methodFlow.2.steps.0.t
- PostgreSQL 15

### iot.methodFlow.3.steps.0.t
- Streamlit dashboard

### iot.links.0.t
- Live Dashboard

### iot.links.1.t
- GitHub


## Multi-City Surface Temperature  `temp`

### temp.twin.sec
- Surface temperature, 134 cities

### temp.twin.lead
- Landsat 8/9 thermal imagery at 30 m for 134 cities along a north–south transect, from Tromsø at 70°N to Punta Arenas at 53°S. Pick a city to see its heat surface in 3D and scrub a year of acquisitions; the analysis tab fits each hemisphere separately.

### temp.twin.title
- Global surface temperature — Landsat 30 m

### temp.twin.hint
- 134 cities · 30 m · a year of acquisitions · two hemispheres

### temp.twin.note
- Landsat 8/9 Collection 2 Level 2 (USGS) via Microsoft Planetary Computer, band ST_B10, cloud and shadow masked per pixel with QA_PIXEL. Cities carry between 6 and 24 usable acquisitions depending on cloud. Basemap © Esri, © OpenStreetMap contributors.

### temp.cat
- ICS 574: Big Data Analytics · KFUPM · Fall 2025

### temp.title
- Multi-City Surface Temperature · 134 Cities at Landsat 30 m

### temp.desc
- 25,905 NASA MODIS/061/MOD11A1 measurements across Dammam (26°N), Dublin (53°N), and Reykjavik (64°N) over 14 days, rendered as GPU-accelerated 3D hexbin layers in Kepler.gl at 60 FPS. This is a demonstration of the pipeline rather than a study of latitude. Three cities give three points, and three points always fall near a line, so the correlation it produces describes the sample and is not evidence of a gradient. The Landsat dashboard on this card measures the same relationship across 134 cities and finds a pooled R² of 0.688, with no gradient at all across the first 20° of latitude. The 3D clips below are direct recordings of the live Kepler.gl visualisation.

### temp.metrics.0.v
- 134

### temp.metrics.0.l
- Cities · Landsat 8/9 thermal at 30 m

### temp.metrics.1.v
- 69.7°N – 53.2°S

### temp.metrics.1.l
- Tromsø to Punta Arenas · 78 north, 56 south

### temp.metrics.2.v
- R² 0.688

### temp.metrics.2.l
- Pooled latitude fit, both hemispheres separately

### temp.metrics.3.v
- 25,905

### temp.metrics.3.l
- MODIS readings in the 3-city pipeline demo below

### temp.method
- MODIS/061/MOD11A1 (Terra) via Google Earth Engine API → Python/Colab (earthengine-api 0.1.400, pandas 2.0.3) → Cloud filter (≤10%) → Kelvin conversion → CSV export (25,905 rows) → Kepler.gl 2.5.5 WebGL 2.0 3D hexbin visualisation → Pearson r & linear regression


## ITS-Based Congestion Management  `its`

### its.cat
- CE 584: Intelligent Transportation Systems · KFUPM · Jan–Apr 2026

### its.pub.authors
- Shibli Afaq, H. Alnasser, H. Alghamdi · Instructor: Dr. Muhammad Abdullah

### its.pub.venue
- 2026 · Target: Journal of Intelligent Transportation Systems / Transportation Research Part C

### its.pub.status
- Manuscript in Preparation

### its.title
- ITS-Based Congestion Management — Aramco Stadium Corridor, Al Khobar

### its.desc
- A corridor-level ITS strategy for the 47,000-capacity Aramco Stadium in Al Khobar, host venue for the 2027 AFC Asian Cup and 2034 FIFA World Cup. The corridor already runs at 48.5% evening congestion with 44 hours lost per driver per year (TomTom 2025), and faces a dual-regime problem: chronic daily load overlaid by concentrated event surges. Four cumulative alternatives were scored on a weighted multi-criteria matrix; the recommended one integrates adaptive signal control, ATMS/ATIS, smart parking and park-and-ride, with demand pricing held back as a conditional final phase.

### its.abstract
- Urban corridors next to major sports venues present a traffic challenge. Chronic daily congestion that already strains the network is overlaid by concentrated, directional event surges that conventional infrastructure alone cannot absorb. The Aramco Stadium corridor in Al Khobar, Saudi Arabia, illustrates this challenge precisely. According to TomTom's 2025 Traffic Index, the Dammam metropolitan area (including Al Khobar) has 48.5 percent congestion during the evening rush hour and an average 44 hours of time lost per driver annually. This paper develops a data-supported, integrated Intelligent Transportation Systems (ITS) strategy to reduce congestion on the corridor under both daily and event conditions. The methodology draws exclusively on peer-reviewed literature, official government and institutional sources, and verified traffic indices. Four cumulative strategy alternatives are evaluated using a weighted multi-criteria scoring matrix. The proposed strategy layers include Adaptive Traffic Signal Control (ATSC) as the operational layer, Advanced Traffic Management System (ATMS) and Advanced Traveler Information System (ATIS) as the monitoring and information layer, smart parking guidance and park-and-ride as the event-access layer, and demand-management pricing as the optional, final layer. This paper proposes a three-stage implementation plan with indicative cost and KPI improvement estimates. The corridor, if managed with the proposed strategy, can be used as a pilot of smart mobility projects in Saudi Arabia's Vision 2030.

### its.metrics.0.v
- 48.5%

### its.metrics.0.l
- Evening peak congestion · TomTom 2025, Dammam metro

### its.metrics.1.v
- 10–20%

### its.metrics.1.l
- Travel-time saving from ATSC · published empirical range

### its.metrics.2.v
- $4.3–12.1M

### its.metrics.2.l
- Indicative cost, recommended alternative · planning-level

### its.metrics.3.v
- 4-layer

### its.metrics.3.l
- Sense → Decide → Act → Influence

### its.method
- Corridor and dual-regime problem definition → literature and international case review (Qatar 2022, London 2012) → four cumulative alternatives → weighted multi-criteria scoring matrix on seven criteria → Alternative C selected (score 3.75) → four-layer ITS architecture → three-phase implementation plan with indicative costs from FHWA and HDR benchmarks

### its.links.0.t
- Manuscript — Under Departmental Review


## Soundscape & Thermal Comfort Review  `sound`

### sound.cat
- Peer-reviewed journal article · Open Access

### sound.pub.authors
- Shibli Afaq, Yusuf A. Adenle, Muhammad Aamir Basheer

### sound.pub.venue
- Discover Cities (Springer Nature) · 2026 · 3:123 · Open Access

### sound.pub.status
- Published · June 2026

### sound.title
- A Systematic Review of Soundscape and Thermal Comfort Interactions in Hot-Arid Environments

### sound.desc
- Published in Discover Cities, June 2026. A PRISMA 2020 systematic review of how the acoustic environment shapes outdoor thermal comfort in hot-arid cities. 1,011 records screened across Scopus, Semantic Scholar and AI-assisted snowballing; 22 studies (2005–2025) synthesised into five interlinked themes. Introduces the Integrated Thermo-Acoustic Planning (ITAP) Framework and a persona-based Interdisciplinary Implementation Toolkit for Vision 2030 public space design.

### sound.abstract
- In hot-arid cities, the soundscape of public space has been an underutilized element of urban design, often treated as a secondary consideration relative to visual appearance. This neglect contributes to thermal discomfort and the underutilization of urban outdoor public space, a problem that is especially prevalent in the Gulf region, where the lack of shade renders the outdoor public space uninhabitable for a significant portion of the year. To fill this gap, this study aims to conduct a PRISMA-guided systematic review of 22 peer-reviewed studies (2005–2025) that focus on the soundscape design, outdoor thermal comfort, and urban space quality in hot-arid and thermally comparable environments. Thematic content analysis reveals five theme areas that are interlinked: (i) integrated thermal-acoustic design, (ii) the function of green and blue infrastructure in soundscapes, (iii) multisensory perception and psychological restoration, (iv) problems and concerns with human-centered soundscape planning, and (v) the impact of urban morphology on microclimate and sound propagation. The synthesis shows that, under moderate thermal stress conditions, positive soundscapes (created with natural sounds and green-blue infrastructure) can positively influence the thermoceptive comfort perception and decrease the perceived heat stress as well as encourage active use of public space. These benefits, however, are limited, becoming much less pronounced in extreme heat and are predominantly psychological and cognitive in nature, operating through individual appraisal rather than direct sensory response. Based on these findings, the paper introduces the Integrated Thermo-Acoustic Planning (ITAP) Framework as a multi-scalar, evidence-based design model and a persona-based Interdisciplinary Implementation Toolkit. These outputs, combined, offer context-specific guidelines for the design of walkable, thermally comfortable, and acoustically restorative public spaces to support the Saudi Arabia Vision 2030 Quality of Life Programme.

### sound.metrics.0.v
- 1,011

### sound.metrics.0.l
- Records screened · Scopus 737, Semantic Scholar 250, Elicit 24

### sound.metrics.1.v
- 22

### sound.metrics.1.l
- Studies synthesised (2005–2025) · from 78 assessed for eligibility

### sound.metrics.2.v
- 5

### sound.metrics.2.l
- Interlinked themes identified

### sound.metrics.3.v
- Published

### sound.metrics.3.l
- Discover Cities · 2026 · 3:123 · Open Access

### sound.method
- Multi-database search (Scopus, Semantic Scholar) + AI-assisted snowballing (Elicit) → 1,011 records screened → 931 excluded → 80 sought, 78 assessed → 56 excluded on inclusion criteria → 22 included → two-stage thematic content analysis, consensus across all co-authors → five themes → ITAP Framework + Interdisciplinary Implementation Toolkit

### sound.links.0.t
- Read the paper — Discover Cities (Open Access)


## Twin Tower Complex  `arch`

### arch.cat
- B.Arch Thesis · BIT Mesra · 2020–2021 · First Class with Distinction

### arch.title
- Twin Tower Complex — Net-Zero Mixed-Use High-Rise Development

### arch.desc
- 69-storey net-zero mixed-use complex for a high-seismic urban infill site (10.5 acres, River Basistha, Ranchi). Diagrid exoskeleton (steel, 60° diagonal) reduces structural steel by 20% vs conventional frame. Tuned mass damper at floors 55–58. Net-zero strategy: south-facing double-skin facade, passive natural ventilation through central atrium, PV arrays (est. 40% energy offset) + solar thermal. Full Revit BIM (LOD 300) with complete municipal documentation package.

### arch.metrics.0.v
- 69

### arch.metrics.0.l
- Storeys

### arch.metrics.1.v
- Net-Zero

### arch.metrics.1.l
- Energy design target

### arch.metrics.2.v
- Diagrid

### arch.metrics.2.l
- Structural system · 60° angle

### arch.metrics.3.v
- LOD 300

### arch.metrics.3.l
- Revit BIM level

### arch.method
- Site analysis → Programme stacking → Diagrid structural geometry optimisation → Passive cooling strategy (double-skin facade + atrium ventilation) → Active energy (PV + solar thermal) → Revit BIM modelling (LOD 300) → Full municipal documentation
