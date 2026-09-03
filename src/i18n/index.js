/**
 * Language switching.
 *
 * English lives in index.html and is never stored in the dictionary. On load the
 * engine snapshots whatever the markup actually says for each tagged key, and
 * switching back to English restores from that snapshot — so the English can be
 * edited freely without the translations drifting out of sync with it.
 *
 * Nothing is detected and nothing is offered. navigator.language used to drive
 * an opt-in offer toast, but it is not a reliable signal of what a visitor
 * actually wants to read — plenty of Indian visitors' devices (Xiaomi/MIUI
 * phones especially) report Chinese as a system/keyboard language even though
 * the visitor is browsing in English, so the offer kept surfacing Chinese to
 * people who never asked for it. The only way a language other than English
 * is ever shown now is the reader picking it from the toolbar switcher
 * themselves; that choice is remembered for next visit.
 */

import { LANGUAGES, strings } from './strings.js';

const STORE_KEY = 'sa-lang';

let current = 'en';
let english = null; // snapshot of the source markup

const byCode = (code) => LANGUAGES.find((l) => l.code === code);

/* ============================================================
   SNAPSHOT / APPLY
   ============================================================ */

function snapshotEnglish() {
  const snap = { text: new Map(), attrs: new Map() };

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    snap.text.set(el, el.innerHTML);
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const pairs = el.dataset.i18nAttr.split(',').map((p) => p.trim());
    const saved = {};
    pairs.forEach((pair) => {
      const [attr] = pair.split(':');
      saved[attr] = el.getAttribute(attr) ?? '';
    });
    snap.attrs.set(el, saved);
  });

  return snap;
}

function applyLanguage(code) {
  const lang = byCode(code);
  if (!lang) return;

  const dict = code === 'en' ? null : strings[code];
  if (code !== 'en' && !dict) return;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (dict) {
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    } else {
      const original = english.text.get(el);
      if (original !== undefined) el.innerHTML = original;
    }
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(',').map((p) => p.trim()).forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (dict) {
        if (dict[key] !== undefined) el.setAttribute(attr, dict[key]);
      } else {
        const saved = english.attrs.get(el);
        if (saved && saved[attr] !== undefined) el.setAttribute(attr, saved[attr]);
      }
    });
  });

  document.documentElement.lang = code;
  document.documentElement.dir = lang.dir;
  document.documentElement.classList.toggle('is-rtl', lang.dir === 'rtl');

  current = code;
  syncSwitcher();

  // The typewriter owns its own copy of the role strings, and the pinned
  // sections are measured in pixels — both need telling that the text changed.
  window.dispatchEvent(new CustomEvent('sa:languagechange', {
    detail: { code, dict, roles: rolesFor(code) },
  }));
}

function rolesFor(code) {
  if (code === 'en') return null;
  const dict = strings[code];
  if (!dict) return null;
  const roles = [];
  for (let i = 0; dict[`role.${i}`] !== undefined; i++) roles.push(dict[`role.${i}`]);
  return roles.length ? roles : null;
}

/* ============================================================
   SWITCHER UI
   ============================================================ */

let switcherEl = null;
let menuEl = null;

function buildSwitcher() {
  const mount = document.getElementById('langMount');
  if (!mount) return;

  switcherEl = document.createElement('div');
  switcherEl.className = 'lang';
  switcherEl.innerHTML = `
    <button class="lang__btn" id="langBtn" aria-haspopup="true" aria-expanded="false" aria-label="Change language">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>
      </svg>
      <span class="lang__code" id="langCode">EN</span>
    </button>
    <ul class="lang__menu" id="langMenu" role="menu" hidden>
      ${LANGUAGES.map((l) => `
        <li role="none">
          <button role="menuitem" class="lang__item" data-lang="${l.code}">
            <span class="lang__native">${l.native}</span>
            <span class="lang__label">${l.label}</span>
          </button>
        </li>`).join('')}
    </ul>
  `;
  mount.appendChild(switcherEl);

  menuEl = switcherEl.querySelector('#langMenu');
  const btn = switcherEl.querySelector('#langBtn');

  const close = () => { menuEl.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  const open = () => { menuEl.hidden = false; btn.setAttribute('aria-expanded', 'true'); };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuEl.hidden ? open() : close();
  });

  switcherEl.querySelectorAll('.lang__item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      close();
      setLanguage(item.dataset.lang, { remember: true });
    });
  });

  document.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  syncSwitcher();
}

function syncSwitcher() {
  if (!switcherEl) return;
  const code = switcherEl.querySelector('#langCode');
  if (code) code.textContent = current.toUpperCase();
  switcherEl.querySelectorAll('.lang__item').forEach((i) => {
    i.classList.toggle('is-current', i.dataset.lang === current);
  });
}

/**
 * Shown when the reader picks a language themselves — the same friendly caveat,
 * without the offer, so it never lands silently.
 */
function showDisclaimer(code) {
  const dict = strings[code];
  if (!dict) return;
  const existing = document.querySelector('.langnote');
  existing?.remove();

  const note = document.createElement('div');
  note.className = 'langnote';
  note.setAttribute('role', 'status');
  note.textContent = dict['lang.disclaimer'];
  document.body.appendChild(note);
  requestAnimationFrame(() => note.classList.add('is-in'));
  setTimeout(() => {
    note.classList.remove('is-in');
    setTimeout(() => note.remove(), 400);
  }, 5200);
}

/* ============================================================
   PUBLIC
   ============================================================ */

export function setLanguage(code, { remember = false, quiet = false } = {}) {
  if (!byCode(code)) return;
  applyLanguage(code);
  if (remember) {
    try { localStorage.setItem(STORE_KEY, code); } catch {}
  }
  if (!quiet && code !== 'en') showDisclaimer(code);
}

export function initI18n() {
  english = snapshotEnglish();
  buildSwitcher();

  // The only language a visitor ever sees besides English is one they picked
  // themselves from the switcher — restore that choice if there is one.
  let stored = null;
  try {
    stored = localStorage.getItem(STORE_KEY);
  } catch {}

  if (stored && byCode(stored)) {
    setLanguage(stored, { quiet: true });
  }
}
