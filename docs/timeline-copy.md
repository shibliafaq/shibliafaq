# Timeline copy

Every word of the Background section — the timeline list, the arrival
card on the map, and the speech bubble. **Edit here, then run:**

```bash
node tools/sync-copy.mjs           # show what would change
node tools/sync-copy.mjs --write   # apply it
```

## How to edit this

- **One line per field.** A wrapped line breaks the parser; let it run long.
- **Keep the `- **field:**` prefix exactly as it is.** That is what is matched.
- **HTML is allowed and entities are literal.** `&amp;` must stay `&amp;`, not
  become `&` — this is the markup, verbatim. `<em class="serif">` works.
- **Do not rename a heading.** The `### id` is the stop id and it ties the
  entry to its building on the map.
- To pull hand edits back out of `index.html`: `node tools/sync-copy.mjs --export`.

## What each field is

| field | where it shows | translated |
|---|---|---|
| `period` | timeline + card | no — dates are proper nouns |
| `role` | timeline + card | yes |
| `org` | timeline + card | no — names and places |
| `desc` | timeline only, the long paragraph | no |
| `note` | **card only** — the short version | yes |
| `says` | **speech bubble** — keep it to a sentence | yes |

Deleting a `says` line removes that bubble rather than showing an empty one.

---

### barch

- **period:** Jul 2016 – Jun 2021
- **role:** Bachelor of Architecture (B.Arch.) — First Class with Distinction
- **org:** Birla Institute of Technology (BIT), Mesra · Ranchi, India · CGPA: 7.61/10
- **desc:** <strong class="tli__stat">Cumulative GPA: 7.61/10.0 · First Class with Distinction</strong> Thesis: <em class="serif">Twin Tower Complex – Mixed-Use Net-Zero Energy High-Rise Development</em>. Leadership: Vice President of the Student Society of Architecture (orchestrated events for 300+ members and led the Vajra Pavilion build); Executive Member of the National Service Scheme (managed welfare initiatives for 10 villages). Awards: 1st Place Interior Design Trophy (Zonasa 2019) · 2nd Place Café Design (NASA 2017) · National Top 66 Finalist (ANDC Embark 2019) · Shortlisted Main Design Trophy (Zonasa 2018).
- **note:** <strong class="tli__stat">Cumulative GPA: 7.61/10.0 · First Class with Distinction</strong> Awards: 1st Place Interior Design Trophy (Zonasa 2019); 2nd Place Café Design (NASA 2017); Shortlisted Main Design Trophy (Zonasa 2018); National Top 66: Embark Competition (ANDC 2019).
- **says:** I spent five years here and learned the basics of design.

### chadda

- **period:** May 2018 – Jun 2018
- **role:** Architectural Intern
- **org:** Chadda and Associates · Ranchi, India
- **desc:** Contributed directly to real-world infrastructure projects by drafting floor plans, building sections, elevations, and structural drawings for municipal permitting and private development initiatives.
- **note:** Contributed directly to real-world infrastructure projects by drafting floor plans, building sections, elevations, and structural drawings for municipal permitting and private development initiatives.
- **says:** My first real office; it was hard learning the professional dynamics.

### metarch1

- **period:** May 2019 – Jun 2019
- **role:** Architectural Intern
- **org:** Metarch Studios · Ranchi, India
- **desc:** Gained professional studio experience producing precise working drawings and 3D models/renderings for interior and exterior design projects.
- **note:**Gained professional studio experience producing precise working drawings and 3D models/renderings for interior and exterior design projects.
- **says:** The second summer internship in my favorite office.

### jaiswal

- **period:** Jan 2021 – May 2021
- **role:** Architectural Intern
- **org:** Jaiswal &amp; Associates · New Delhi, India
- **desc:** Produced comprehensive 3D models, renders, floor plans, sections, & elevations for 10+ diverse projects (residences, group housing, factories) using industry-standard software. Developed  a high-profile kiosk for MS Dhoni’s organic farm business, adhering to branding guidelines and exceeding client expectations.
- **note:** Produced comprehensive 3D models, renders, floor plans, sections, & elevations for 10+ diverse projects (residences, group housing, factories) using industry-standard software. Developed  a high-profile kiosk for MS Dhoni’s organic farm business, adhering to branding guidelines and exceeding client expectations.
- **says:** I went to Delhi for a five-month internship, and I learned a lot there.

### medicfibers

- **period:** May 2021 – Apr 2022
- **role:** Graphic Designer
- **org:** Medicfibers · New Delhi, India
- **desc:** Crafted strategic investment pitch decks and visual brand assets supporting capital funding campaigns. Developed and executed a comprehensive social media strategy expanding online audience engagement by 3× and increasing overall brand visibility by 40%.
- **note:** Crafted strategic investment pitch decks and visual brand assets supporting capital funding campaigns. Developed and executed a comprehensive social media strategy expanding online audience engagement by 3× and increasing overall brand visibility by 40%.
- **says:** I joined this office for a detour into design because of the pandemic.

### metarch2

- **period:** Mar 2022 – Aug 2025
- **role:** Project Architect
- **org:** Metarch Studios · Ranchi, India
- **desc:** Led the full project lifecycle for a $720K commercial, educational, and residential portfolio with 100% on-time and on-budget delivery. Managed multi-disciplinary teams across 4 concurrent projects, reducing construction change orders by 8% and coordination delays by 10%. Boosted team drawing delivery speed by 15% through workflow standardisation and pioneered BIM/3D visualisation pipelines, increasing client satisfaction by 20%.
- **note:** Led the full project lifecycle for a $720K commercial, educational, and residential portfolio with 100% on-time and on-budget delivery. Managed multi-disciplinary teams across 4 concurrent projects, reducing construction change orders by 8% and coordination delays by 10%. Boosted team drawing delivery speed by 15% through workflow standardisation and pioneered BIM/3D visualisation pipelines, increasing client satisfaction by 20%.
- **says:** I rejoined Metarch Studios, this time leading every project.

### kfupm

- **period:** Aug 2025 – Aug 2026 (Expected)
- **role:** Master of Science in Smart &amp; Sustainable Cities
- **org:** King Fahd University of Petroleum &amp; Minerals (KFUPM), Dhahran, KSA
- **desc:** <strong class="tli__stat">Cumulative GPA: 4.0/4.0 · Specialisation in Urban Informatics &amp; Sustainability</strong> Thesis: <em class="serif">Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting, and Mitigation</em>. Coursework: Big Data Analytics, Smart City Systems &amp; IoT, GIS &amp; Spatial Analysis, Environmental Economics, Urban Informatics, Circular Economy.
- **note:** <strong class="tli__stat">GPA 4.0/4.0 · Specialisation in Urban Informatics &amp; Sustainability</strong> Thesis: <em class="serif">Smart Digital Twin Framework for Urban Heat Island Monitoring, Forecasting, and Mitigation</em>. Coursework: Big Data Analytics, Smart City Systems &amp; IoT, GIS &amp; Spatial Analysis, Environmental Economics, Urban Informatics, Circular Economy.
- **says:** I decided to pursue an M.Sc in Smart and Sustainable Cities at KFUPM, Dhahran.
