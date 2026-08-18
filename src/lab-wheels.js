/**
 * Entry for the horizontal-wheel comparison page.
 *
 * Deliberately NOT main.js: that boots the globe, the scroll sequence, the
 * skills field and the pixel map, none of which exist on this page and several
 * of which would throw looking for elements that are not there. The point of
 * the page is to judge one component, so it loads one component.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/sections.css';
import './styles/overlays.css';

import { initWheels } from './modules/wheel.js';
import { initModal } from './modules/modal.js';

initWheels();
initModal();
