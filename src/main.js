import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';
import './styles/i18n.css';

import { initScroll, ScrollTrigger } from './modules/scroll.js';
import { initReveals } from './modules/reveals.js';
import { initHero } from './modules/hero.js';
import { initProjects } from './modules/projects.js';
import { initSkills } from './modules/skills.js';
import { initExperience } from './modules/experience.js';
import { initModal, initArch, initLightbox } from './modules/modal.js';
import { initNav, initCursor, initForm } from './modules/ui.js';

const idleInit = window.requestIdleCallback
  ? (fn) => window.requestIdleCallback(fn)
  : (fn) => setTimeout(fn, 200);

initScroll();
initNav();
initCursor();
initHero();
initReveals();
initProjects();
// Runs on load rather than near-viewport: it swaps the tag list for the canvas,
// and doing that late would show the list and then visibly replace it. The rAF
// loop inside is still gated on the section being on screen.
initSkills();
initModal();
initArch();
initLightbox();
initForm();

// Language switching. Loaded on idle: English is already in the HTML, so
// nothing on first paint depends on the dictionary.
idleInit(() => import('./i18n/index.js').then((m) => m.initI18n()));

// The Experience map. On idle rather than near-viewport for the same reason as
// the skills field — it replaces the timeline, and doing that as the reader
// arrives would show the list and then visibly swap it. The 220 KB of sheets and
// the composer live in a lazy chunk inside, and nothing is fetched at all below
// 900px or under reduced motion.
idleInit(() => initExperience());

// three.js is the heaviest dependency on the page. The hero needs it, but not
// on the critical path — the CSS starfield paints instantly and the globe fades
// in over it, so first paint never waits on a 126 KB chunk plus two textures.
idleInit(() => {
  if (document.getElementById('heroGlobe')) {
    import('./modules/earth.js').then((m) => m.initEarth());
  }
});

// The atlas and the thermal sequence are no longer page sections — they are
// relocated into their project cards and mounted by modal.js when the card is
// opened. Nothing to preload here: three.js is the heaviest thing on the page
// and there is no reason to pay for it before someone asks for the globe.

// Web fonts change metrics, which changes every pinned section's height.
if (document.fonts?.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

window.addEventListener('load', () => ScrollTrigger.refresh());

// Translated copy reflows every section, and the pinned ones are measured in
// pixels — without this the projects track and thermal sequence keep the
// English heights and end early.
window.addEventListener('sa:languagechange', () => {
  requestAnimationFrame(() => ScrollTrigger.refresh());
});
