/**
 * Prototype for the map -> shards -> wheels move. A slider drives the whole
 * sequence so each beat can be inspected at rest, which scrubbing by scroll
 * makes almost impossible.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/shatter-lab.css';

import { initShatter } from './modules/shatter.js';

const IMG = '/assets/img';
const FACES = [
  { img: `${IMG}/hero-thesis@1x.webp`, label: 'Smart Digital Twin Framework' },
  { img: `${IMG}/hero-gis@1x.webp`,    label: 'GIS & Remote Sensing UHI' },
  { img: `${IMG}/hero-iot@1x.webp`,    label: 'Real-Time IoT Pipeline' },
  { img: `${IMG}/hero-temp@1x.webp`,   label: 'Multi-City Surface Temperature' },
  { img: `${IMG}/hero-its@1x.webp`,    label: 'ITS Congestion Management' },
  { img: `${IMG}/hero-sound@1x.webp`,  label: 'Soundscape & Thermal Comfort' },
  { img: `${IMG}/hero-thesis@1x.webp`, label: 'Research project 7' },
  { img: `${IMG}/hero-arch@1x.webp`,   label: 'Twin Tower Complex' },
  { img: `${IMG}/arch_page_02.webp`,   label: 'Architecture project 2' },
  { img: `${IMG}/arch_page_03.webp`,   label: 'Architecture project 3' },
  { img: `${IMG}/arch_page_04.webp`,   label: 'Architecture project 4' },
  { img: `${IMG}/arch_page_05.webp`,   label: 'Architecture project 5' },
  { img: `${IMG}/arch_page_06.webp`,   label: 'Architecture project 6' },
  { img: `${IMG}/arch_page_07.webp`,   label: 'Architecture project 7' },
];

const stage = document.getElementById('shatterStage');
const slider = document.getElementById('shatterP');
const beat = document.getElementById('shatterBeat');

const s = initShatter(stage, { map: `${IMG}/riyadh-heat.webp`, faces: FACES });

function name(p) {
  if (p < 0.02) return 'THE MAP';
  if (p < 0.18) return 'CRACK';
  if (p < 0.58) return 'DRIFT';
  if (p < 0.99) return 'GATHER';
  return 'WHEELS';
}

function apply(v) {
  s.setProgress(v);
  beat.textContent = name(v);
}

slider.addEventListener('input', () => apply(+slider.value / 1000));
apply(0);

// Scroll also drives it, so the real scrubbed feel can be judged.
let p = 0;
addEventListener('wheel', (e) => {
  e.preventDefault();
  p = Math.min(1, Math.max(0, p + e.deltaY * 0.0006));
  slider.value = String(Math.round(p * 1000));
  apply(p);
}, { passive: false });
