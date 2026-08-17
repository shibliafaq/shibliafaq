# Front page copy

Every word on the front page except the Background timeline, which has its
own document (`timeline-copy.md`) because its seven entries have six fields
each.

**Edit the text after each `- ` and run:**

```bash
node tools/sync-site-copy.mjs           # show what would change
node tools/sync-site-copy.mjs --write   # apply it
```

## Rules

- **One line per string.** A wrapped line breaks the parser — let it run long.
- **Do not touch the `### key` headings.** That is what ties the text to its
  place in the page. Renaming one makes the tool stop rather than guess.
- **HTML is allowed and entities are literal.** `&amp;` stays `&amp;`.
  `<em class="serif">…</em>` works and is used for thesis titles.
- **To delete a string, empty it** — leave the `- ` and the heading. Removing
  the heading makes the tool refuse the whole run.
- Keys beginning `about.`, `atlas.` etc. are also i18n keys: editing here
  changes the English. Other languages come from `src/i18n/strings.js` and
  fall back to whatever is in the markup.

---

## Hero

### hero.hey
- Hey, I’m

### hero.1
- <span class="hero__name-line">Shibli</span> <span class="hero__name-line hero__name-line--2">Afaq</span>

### hero.desc
- Architect evolving into an <strong>urban data scientist</strong>, driven by a passion for building climate-resilient cities through spatial data. Expanding my toolkit to include GIS, machine learning, and remote sensing — currently finishing my M.Sc. at KFUPM (GPA&nbsp;4.0/4.0). <strong>Open to innovative smart city roles, research collaborations, and fully funded PhD opportunities.</strong>

### hero.2
- <span data-i18n="hero.cta.research">View Research</span> <span class="btn__arrow">↓</span>

### hero.3
- GitHub <span class="btn__arrow">↗</span>

### hero.4
- <span data-i18n="hero.cta.demo">Live Demo</span> <span class="btn__arrow">↗</span>

### hero.5
- ⇩ <span data-i18n="hero.cta.resume">Resume</span>

### hero.6
- #01

### hero.7
- #02

### hero.8
- #03

### hero.9
- #04

## The other outcome — second globe

### future.label
- The other outcome

### future.title
- The same planet.<br><em>If we fail.</em>

### future.lead
- Deserts where the tropics were, ice gone from both poles, dust over every ocean. This is not a different world — it is this one, with the heat left unchecked. Everything below is work aimed at the other version.

## About

### about.label
- About

### about.title
- The <em>problem</em><br>I’m solving

### about.p1
- I’m a licensed architect with <strong>4+ years across professional design and project delivery</strong> who made a deliberate pivot. After managing architectural projects across India and leading a $720K portfolio spanning commercial, educational, and residential spaces, I realised that the escalating urban and climate crises I witnessed could not be solved at the building scale alone.

### about.pull
- “To effectively tackle the climate crisis in our cities, I needed a deeper understanding of city-scale informatics — so I set out to build it.”

### about.p2
- Now completing an <strong>M.Sc. in Smart and Sustainable Cities at KFUPM</strong> (GPA 4.0/4.0), I combine architectural spatial thinking with satellite remote sensing, GIS, and machine learning to build evidence-based heat adaptation tools for the Arabian Peninsula.

### about.p3
- Whether driving innovation in a research lab, a spatial data consultancy, or a municipal smart city team, I bridge the gap between <strong>technical data science and the physical realities of urban design</strong>.

### about.1
- <span class="acard__icon">🎓</span><div><p class="acard__t" data-i18n="about.c1">M.Sc. Smart &amp; Sustainable Cities</p><p class="acard__s">KFUPM · GPA 4.0/4.0 · 2025–2026</p></div>

### about.2
- <span class="acard__icon">🧠</span><div><p class="acard__t" data-i18n="about.c2">Research — UHI, Digital Twins &amp; ML</p><p class="acard__s">Remote Sensing · Climate Analytics · PostGIS</p></div>

### about.3
- <span class="acard__icon">🏛️</span><div><p class="acard__t" data-i18n="about.c3">B.Arch. Architecture — First Class with Distinction</p><p class="acard__s">BIT Mesra · CGPA 7.61/10 · 2016–2021</p></div>

### about.4
- <span class="acard__icon">🏅</span><div><p class="acard__t" data-i18n="about.c4">Licensed Architect &amp; Professional Member</p><p class="acard__s">Council of Architecture (IN) · Associate Member IIA</p></div>

### about.5
- <span class="acard__icon">📍</span><div><p class="acard__t" data-i18n="about.c5">Dhahran, Saudi Arabia</p><p class="acard__s">Open to Smart City Roles, Research &amp; PhDs</p></div>

## Research direction

### direction.label
- Research Direction

### direction.title
- Why <em>climate</em><br>drives everything

### direction.p1
- There's a reason all my work circles back to the same thing: the planet is getting hotter, and cities are making it worse. Urban Heat Islands aren't a niche academic curiosity — they are a measurable, preventable cause of heat deaths, worsening air quality, and mounting energy demand in some of the world's most vulnerable communities. That bothers me. A lot.

### direction.pull
- “I don't want to spend my career describing a problem. I want to build the tools that let cities actually fix it.”

### direction.p2
- Everything I've built — the satellite pipelines, the GIS vulnerability frameworks, the IoT dashboards — is oriented toward one goal: making urban climate data <strong>actionable</strong>, not just publishable. That means getting it to the right resolution, the right people, and in time for it to matter.

### direction.c1l
- PhD Target

### direction.c1t
- Urban Climate Informatics — Digital Twins for Heat Adaptation at City Scale

### direction.c1s
- Seeking funded positions with supervisors working at the intersection of remote sensing, urban climate modelling, and spatial data science

### direction.c2l
- Geographic Focus

### direction.c2t
- Arabian Peninsula &amp; Global South arid cities

### direction.c2s
- Where extreme heat stress is most acute and urban climate data is most scarce — and where good tools could save the most lives

### direction.c3l
- Open To

### direction.c3t
- Fully funded PhD · Smart city research roles · GIS analytics consultancy

### direction.c3s
- Based in Dhahran — open to relocation globally for the right opportunity

## Thermal sequence

### thermal.label
- Multi-City Surface Temperature

### thermal.1
- Three cities.<br><em>Three continents.</em>

### thermal.2
- 25,905 real NASA MODIS measurements. Every 10° northward, 9.1&thinsp;°C colder.

### thermal.3
- <span class="thermal__dot" style="--c:#f59e0b"></span>Dammam <em>26°N</em> <b>31.5&thinsp;°C</b>

### thermal.4
- <span class="thermal__dot" style="--c:#4ade80"></span>Dublin <em>53°N</em> <b>9.6&thinsp;°C</b>

### thermal.5
- <span class="thermal__dot" style="--c:#a5f3fc"></span>Reykjavík <em>64°N</em> <b>−3.7&thinsp;°C</b>

## Projects

### projects.label
- Research &amp; Projects

### projects.title
- Seven projects

### projects.lead
- <span class="lead__meta">During the M.Sc</span><span class="lead__body">I was doing architectural projects but now I learned working with real-time satellite pipelines,</span><span class="lead__meta">All the works are based on one question:</span><em class="lead__ask">How do we make cities survive the climate crisis?</em>

### projects.1
- <span class="badge__dot"></span>M.Sc. Thesis

### projects.2
- KFUPM · Aug 2026

### projects.3
- Architecture &amp; City Design

### projects.4
- A Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting, and Mitigation

### projects.14
- Google Earth Engine

### projects.15
- PostgreSQL/PostGIS

### projects.16
- FastAPI

### projects.17
- Prophet

### projects.18
- deck.gl

### projects.19
- MapLibre

### projects.20
- Docker Compose

### projects.22
- Open the study →

### projects.5
- Built on a <strong>Design Science methodology

### projects.23
- CRP 583 · Urban Informatics · KFUPM

### projects.24
- GIS &amp; Remote Sensing UHI Assessment — Dammam Metro Area

### projects.25
- NDBI Dominance (R²=0.511) · 57.3 km² Urgent Exposure Zone · 4.18× Hotspot Scale Multiplier

### projects.26
- ArcGIS Pro 3.6

### projects.27
- Landsat 8/9 &amp; Sentinel-2

### projects.28
- Getis-Ord Gi*

### projects.29
- HVI

### projects.30
- Spatial SQL

### projects.31
- ICS 574 · Big Data Analytics · KFUPM <span class="live">Live</span>

### projects.32
- Real-Time Smart City IoT Monitoring Pipeline

### projects.33
- Sub-2-Second Ingestion · 5-Minute Tumbling Windows · 10 Simulated Urban Zones

### projects.34
- Apache Kafka

### projects.35
- PySpark Streaming

### projects.36
- PostgreSQL + PostGIS

### projects.37
- MQTT (Mosquitto)

### projects.38
- Docker Compose

### projects.39
- ICS 574 · Big Data Analytics · KFUPM

### projects.40
- Multi-City Surface Temperature Analysis — 3 Continents

### projects.41
- r=−0.995 Near-Perfect Correlation · R²=0.990 · 25,905 Valid MODIS Measurements

### projects.42
- MODIS (Terra)

### projects.43
- Google Earth Engine

### projects.44
- Kepler.gl

### projects.45
- GeoPandas

### projects.46
- Spatial Regression

### projects.47
- CE 584 · Intelligent Transportation Systems · KFUPM

### projects.48
- ITS-Based Congestion Management — Aramco Stadium Corridor, Al Khobar

### projects.49
- Alternative C Recommended · 20–35% Travel Time Reduction · SAR 28–47M Plan

### projects.50
- Adaptive Signal Control (ATSC)

### projects.51
- ATMS / TMC

### projects.52
- Smart Parking

### projects.53
- Multi-Criteria Matrix

### projects.54
- ARC 514 · Sustainable Urbanism · KFUPM · Under Review

### projects.55
- A Systematic Review of Soundscape and Thermal Comfort Interactions in Hot-Arid Environments

### projects.56
- 1,011 records screened · ITAP framework · PRISMA 2020

### projects.57
- PRISMA 2020

### projects.58
- Thermal Comfort

### projects.59
- Soundscape

### projects.60
- B.Arch Thesis · BIT Mesra · 2021

### projects.61
- Twin Tower Complex — Net-Zero Mixed-Use Development

### projects.62
- 69 storeys · Net-zero energy · Diagrid structure · Full BIM

### projects.63
- Revit BIM

### projects.64
- Net-Zero

### projects.65
- Diagrid

### projects.66
- AutoCAD

### projects.67
- 01 / 07

## Atlas

### atlas.label
- Thesis Coverage

### atlas.title
- Five cities.<br><em>One framework.</em>

### atlas.lead
- Riyadh, Jeddah, Dammam, Makkah, and NEOM. Three climate contexts, 15.8 million metropolitan residents, ~5.5M inside the analysed urban footprint, one satellite pipeline delivering land-surface temperature, vulnerability, and intervention estimates on a single 500&nbsp;m grid.

### atlas.1
- <span class="atlas__n">01</span> Riyadh <em>Hyper-arid inland plateau · BWh</em>

### atlas.2
- <span class="atlas__n">02</span> Jeddah <em>Coastal humid (Red Sea) · BWh</em>

### atlas.3
- <span class="atlas__n">03</span> Dammam <em>Gulf coastal humid · BWh</em>

### atlas.4
- <span class="atlas__n">04</span> Makkah <em>Enclosed valley · BWh</em>

### atlas.5
- <span class="atlas__n">05</span> NEOM <em>Northwest highland · BWh/BSh</em>

### atlas.6
- Interactive map unavailable on this device

## Publications

### pubs.label
- Publications

### pubs.title
- Research <em>Output</em>

### pubs.lead
- Three papers produced in one M.Sc. year — building toward a peer-reviewed publication record for doctoral research.

### publications.1
- <span class="pub__n display">01</span> <div class="pub__body"> <h3 class="pub__title">A Systematic Review of Soundscape and Thermal Comfort Interactions in Hot-Arid Environments</h3> <p class="pub__meta">Shibli Afaq · Advisors: Dr. Yusuf A. Adenle &amp; Dr. Muhammad Aamir Basheer · 2025 · Target: Landscape and Urban Planning / Urban Climate</p> <span class="pub__status pub__status--review">⏳ Under Review</span> <p class="pub__abs">Systematic review of 22 articles (2005–2025) examining how soundscape design affects thermal comfort in hot-arid cities. Findings show soundscapes can reduce perceived heat stress and support psychological recovery through green and blue infrastructure, yielding evidence-based recommendations for walkable public spaces aligned with Vision 2030.</p> </div>

### publications.2
- <span class="pub__n display">02</span> <div class="pub__body"> <h3 class="pub__title">GIS and Remote Sensing-Based Assessment of Urban Heat Island in the Dammam Metropolitan Area, Saudi Arabia</h3> <p class="pub__meta">Shibli Afaq, Sultan Aldhafeeri · Supervisor: Dr. Baqer Al-Ramadan · 2026 · Target: Urban Climate / Sustainable Cities and Society</p> <span class="pub__status pub__status--prep">✍️ Manuscript in Preparation</span> <p class="pub__abs">Five-step GIS and remote sensing model assessing LST and heat vulnerability across the Dammam Metropolitan Area using Landsat 8/9, Sentinel-2, and WorldPop over a 500&nbsp;m fishnet (12,954 cells). NDBI is the strongest LST predictor (r&nbsp;=&nbsp;0.715). Composite HVI classified 92.6% of cells as High vulnerability, with the HVI hot spot 4.18× larger than temperature-only mapping, revealing planning priorities hidden by single-factor analysis.</p> </div>

### publications.3
- <span class="pub__n display">03</span> <div class="pub__body"> <h3 class="pub__title">ITS-Based Congestion Management for Event Corridors in Arid Cities: A Case Study of the Aramco Stadium Corridor, Al Khobar</h3> <p class="pub__meta">Shibli Afaq, H. Alnasser, H. Alghamdi, S. Aldhafeeri · Instructor: Dr. Muhammad Abdullah · 2026 · Target: Journal of Intelligent Transportation Systems / Transportation Research Part C</p> <span class="pub__status pub__status--prep">✍️ Manuscript in Preparation</span> <p class="pub__abs">Al Khobar's Aramco Stadium corridor (47,000-seat capacity) suffers 48.5% evening congestion, set to worsen before the 2034 FIFA World Cup. Four cumulative ITS alternatives were evaluated via weighted multi-criteria analysis, ranging from adaptive signal control to demand-management pricing. The optimal strategy projects 20–35% travel time reduction within a SAR 28–47M plan, piloting Vision 2030 smart mobility.</p> </div>

## Skills

### skills.label
- Skills

### skills.title
- Tools &amp; <em>Methods</em>

### skills.hint
- Push them around · click to scatter

### skills.g1
- Spatial &amp; GIS

### skills.1
- ArcGIS Pro 3.6

### skills.2
- Google Earth Engine

### skills.3
- Kepler.gl (3D Analytics)

### skills.4
- Landsat 8/9 &amp; Sentinel-2

### skills.5
- MODIS (Daily Thermal)

### skills.6
- NDVI / NDBI Extraction

### skills.7
- WorldPop (100m Demographics)

### skills.8
- Spatial Analysis

### skills.9
- deck.gl (WebGL Layers)

### skills.g2
- Data Pipelines &amp; Analytics

### skills.10
- Python (pandas / scikit-learn)

### skills.11
- Apache Kafka (3-Broker Cluster)

### skills.12
- PySpark Structured Streaming

### skills.13
- PostgreSQL + PostGIS (Spatial SQL)

### skills.14
- Facebook Prophet Time-Series

### skills.15
- Streamlit &amp; Plotly Dashboards

### skills.16
- FastAPI Microservices

### skills.17
- MQTT (Mosquitto Bridge)

### skills.18
- Docker &amp; Docker Compose

### skills.19
- GitHub Version Control

### skills.20
- React (Front-End UI)

### skills.21
- Claude Code (AI Pair Programming)

### skills.g3
- Architecture &amp; Design

### skills.22
- AutoCAD (2D Documentation)

### skills.23
- Revit (BIM)

### skills.24
- Rhino &amp; SketchUp 3D

### skills.25
- V-Ray &amp; Lumion Visualization

### skills.26
- Adobe Photoshop

### skills.27
- Adobe InDesign

### skills.28
- Adobe Premiere Pro

### skills.29
- Adobe After Effects

### skills.g4
- Research Methods

### skills.30
- PRISMA 2020 Protocol

### skills.31
- Design Science Framework

### skills.32
- Thematic Content Analysis

### skills.33
- Pearson Correlation &amp; Regression

### skills.g5
- Creative &amp; Personal

### skills.34
- Photography

### skills.35
- Videography

### skills.36
- Cinematography

### skills.37
- Storytelling

### skills.38
- Sketching

### skills.39
- Travelling

### skills.40
- Relaxing

## Background — headings and chrome

### bg.label
- Background

### bg.title
- Experience &amp; <em>Education</em>

### bg.lead
- Let me walk you through the Journey so far.

### background.1
- <span data-i18n="bg.hint">Keep scrolling</span>

## Contact

### contact.label
- Contact

### contact.title
- Let’s talk <em>research</em>

### contact.lead
- I’m actively looking for <strong>fully funded PhD positions</strong> in urban climate informatics, smart city analytics, and GIS-based climate adaptation, particularly in the UK, EU, North America, and the GCC. If you’re working on heat resilience, digital twins, or spatial data for sustainable cities, I’d love to connect. Also open to smart city research roles and GIS consultancy in KSA.

### contact.1
- shibliafaq4@gmail.com

### contact.form
- Send a message

### contact.2
- <span data-i18n="contact.send">Send message</span> <span class="btn__arrow">→</span>

### contact.ok
- ✓ Message sent — thank you.

### contact.3
- LinkedIn <span class="btn__arrow">↗</span>

### contact.4
- GitHub <span class="btn__arrow">↗</span>

### contact.5
- Instagram <span class="btn__arrow">↗</span>

### contact.6
- Live Demo <span class="btn__arrow">↗</span>

## Navigation and footer

### _nav.1
- Skip to content

### _nav.2
- Shibli <em>Afaq</em>

### _nav.3
- <a href="#about" data-i18n="nav.about">About</a>

### _nav.4
- <a href="#projects" data-i18n="nav.research">Research</a>

### _nav.5
- <a href="#publications" data-i18n="nav.publications">Publications</a>

### _nav.6
- <a href="#background" data-i18n="nav.background">Background</a>

### _nav.7
- <span data-i18n="nav.contact">Get in touch</span> <span class="btn__arrow">↗</span>

### nav.about
- About

### nav.direction
- Direction

### nav.research
- Research

### nav.publications
- Publications

### nav.skills
- Skills

### nav.background
- Background

### nav.contact
- Contact

### _nav.20
- © 2026 Shibli Afaq

### _nav.21
- KFUPM · M.Sc. Smart &amp; Sustainable Cities

### _nav.22
- shibliafaq.vercel.app

### footer.arch
- 🏛 Architecture Portfolio

### footer.resume
- ⇩ Download Resume

### _nav.23
- Built with Vite · GSAP · three.js

### _nav.24
- <span data-i18n="footer.art">Pixel art</span>: Cute&nbsp;Fantasy (Kenmi) · Pixel&nbsp;Crawler (Anokolisa) · Mystic&nbsp;Woods (Game&nbsp;Endeavor) · Pixel&nbsp;16 · FREE_Adventurer · 2D&nbsp;RPG&nbsp;Desert (CraftPix)

### _nav.25
- ✕

### _nav.26
- ✕

### _nav.27
- ←

### _nav.28
- <b id="archCur">1</b> / <span id="archTot">18</span>

### _nav.29
- →

### _nav.30
- Click anywhere to close
