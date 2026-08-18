/**
 * Prototype: the map fades, the tiles arrive from depth, they gather into the
 * rings. A slider drives it so each beat can be held still and judged.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/tilefield-lab.css';

import { initTileField } from './modules/tilefield.js';

const IMG = '/assets/img';
const FACES = [
  { img: IMG + '/hero-thesis@1x.webp', label: 'Smart Digital Twin Framework' },
  { img: IMG + '/hero-gis@1x.webp',    label: 'GIS & Remote Sensing UHI' },
  { img: IMG + '/hero-iot@1x.webp',    label: 'Real-Time IoT Pipeline' },
  { img: IMG + '/hero-temp@1x.webp',   label: 'Multi-City Surface Temperature' },
  { img: IMG + '/hero-its@1x.webp',    label: 'ITS Congestion Management' },
  { img: IMG + '/hero-sound@1x.webp',  label: 'Soundscape & Thermal Comfort' },
  { img: IMG + '/hero-thesis@1x.webp', label: 'Research project 7' },
  { img: IMG + '/hero-arch@1x.webp',   label: 'Twin Tower Complex' },
  { img: IMG + '/arch_page_02.webp',   label: 'Architecture project 2' },
  { img: IMG + '/arch_page_03.webp',   label: 'Architecture project 3' },
  { img: IMG + '/arch_page_04.webp',   label: 'Architecture project 4' },
  { img: IMG + '/arch_page_05.webp',   label: 'Architecture project 5' },
  { img: IMG + '/arch_page_06.webp',   label: 'Architecture project 6' },
  { img: IMG + '/arch_page_07.webp',   label: 'Architecture project 7' },
];

const stage = document.getElementById('tfStage');
const mapEl = document.getElementById('tfMap');
const slider = document.getElementById('tfP');
const beat = document.getElementById('tfBeat');

mapEl.style.backgroundImage = 'url(' + IMG + '/riyadh-heat.webp)';

const field = initTileField(stage, { faces: FACES });

function name(p) {
  if (p < 0.05) return 'THE MAP';
  if (p < 0.52) return 'FADE / ARRIVE';
  if (p < 0.70) return 'FLOAT';
  if (p < 0.99) return 'GATHER';
  return 'WHEELS';
}

function apply(v) {
  field.setProgress(v);
  /* The map is gone before the first tile has finished arriving, so the two are
     never both competing for the frame — which was the whole problem with
     breaking one into the other. */
  mapEl.style.opacity = String(Math.max(0, 1 - v / 0.16));
  beat.textContent = name(v);
}

slider.addEventListener('input', () => apply(+slider.value / 1000));
apply(0);

let p = 0;
addEventListener('wheel', (e) => {
  e.preventDefault();
  p = Math.min(1, Math.max(0, p + e.deltaY * 0.0006));
  slider.value = String(Math.round(p * 1000));
  apply(p);
}, { passive: false });
