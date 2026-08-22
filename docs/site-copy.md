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
- Hey there, I’m

### hero.1
- <span class="hero__name-line">Shibli</span> <span class="hero__name-line hero__name-line--2">Afaq</span>

### hero.desc
- I started my journey as an architect in India. From the beginning, I was fascinated by a simple question: <strong>how do the spaces we design affect how we feel and live?</strong> Why do some places feel calm, cool, and inviting, while others feel exhausting and harsh?

### hero.desc2
- For years in practice, I tried to answer that by designing better spaces for people. But the more I designed, the more I realized something critical: the biggest challenges we face today—like extreme heat, energy stress, and climate change—cannot be solved one building at a time. <strong>The problem is city-wide.</strong>

### hero.desc3
- To understand cities at a deeper level, I moved to Saudi Arabia to pursue my <strong>M.Sc. in Smart and Sustainable Cities at KFUPM</strong>, where I graduated with a 4.0&nbsp;/&nbsp;4.0 GPA. Today, I combine my architectural background with satellite data, urban analytics, and machine learning to help cities survive and adapt to a changing climate.

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
- The Failed Earth

### future.title
- The Planet<br><em>If We Do Nothing</em>

### future.lead
- This interactive model shows what happens if extreme heat and greenhouse emissions go unchecked: deserts taking over once-green regions, ice disappearing from the poles, and cities becoming unlivable for human beings.

### future.lead2
- Drag and explore the globe to see the projected impact of unchecked climate change.

### future.lead3
- This isn’t just science fiction; it is the trajectory we are on if we don’t act. Seeing this reality is why I shifted my focus to research. I wanted to build tools and workflows that don’t just talk about climate change, but <strong>actively help our planet and cities survive in the long run.</strong>

## About

### about.label
- Looking at the Bigger Picture

### about.title
- Scaling Up to<br><em>the Whole Planet</em>

### about.p1
- Studying smart and sustainable cities changed the way I see the world. I learned that we cannot look at buildings in isolation anymore. <strong>Cities are living, interconnected ecosystems</strong> that actively change the local weather and trap heat.

### about.pull
- “To effectively tackle the climate crisis in our cities, I needed a deeper understanding of city-scale informatics, so I set out to build it.”

### about.p2
- If we want to protect communities from the climate crisis, we have to solve problems at a much larger scale—from neighborhood blocks to entire metropolitan regions. <strong>Move across the map to see what intervention does.</strong>

## Research direction

### direction.label
- Research Direction

### direction.title
- Why <em>climate</em><br>drives everything

### direction.p1
- There's a reason all my work circles back to the same thing: the planet is getting hotter, and cities are making it worse. Urban Heat Islands aren't a niche academic curiosity. They are a measurable, preventable cause of heat deaths, worsening air quality, and mounting energy demand in some of the world's most vulnerable communities. That bothers me. A lot.

### direction.pull
- “I don't want to spend my career describing a problem. I want to build the tools that let cities actually fix it.”

### direction.p2
- Everything I've built (the satellite pipelines, the GIS vulnerability frameworks, the IoT dashboards) is oriented toward one goal: making urban climate data <strong>actionable</strong>, not just publishable. That means getting it to the right resolution, the right people, and in time for it to matter.

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
- Where extreme heat stress is most acute and urban climate data is most scarce, and where good tools could save the most lives

### direction.c3l
- Open To

### direction.c3t
- Fully funded PhD · Smart city research roles · GIS analytics consultancy

### direction.c3s
- Based in Dhahran, open to relocation globally for the right opportunity

## Thermal sequence

### thermal.label
- Multi-City Surface Temperature

### thermal.1
- Three cities.<br><em>Three continents.</em>

### thermal.2
- 25,905 real NASA MODIS measurements. Three cities, fourteen days, rendered as GPU hexbins in Kepler.gl.

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

### bg.skip
- Skip the walk

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
- ✓ Message sent. Thank you.

### contact.3
- LinkedIn <span class="btn__arrow">↗</span>

### contact.4
- GitHub <span class="btn__arrow">↗</span>

### contact.5
- Instagram <span class="btn__arrow">↗</span>

### contact.6
- Live Demo <span class="btn__arrow">↗</span>

## Instagram

### instagram.1
- Elsewhere

### instagram.2
- Off the <em>clock</em>

### instagram.3
- Sketches, site visits, and the occasional sunset over Dhahran. The other half of the person doing the research.

## Navigation and footer

### _nav.1
- Skip to content

### _nav.2
- Shibli <em>Afaq</em>

### _nav.3
- <a href="#about" data-i18n="nav.about">About</a>

### _nav.4
- <a href="#projects" data-i18n="nav.research">Research</a>

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
