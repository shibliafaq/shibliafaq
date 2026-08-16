/**
 * Language switching.
 *
 * English lives in index.html and is never stored in the dictionary. On load the
 * engine snapshots whatever the markup actually says for each tagged key, and
 * switching back to English restores from that snapshot — so the English can be
 * edited freely without the translations drifting out of sync with it.
 *
 * Detection uses navigator.language, which is the language the visitor asked
 * their browser for. That is a far better signal than IP or timezone: someone in
 * Riyadh reading in English gets English, which is what they wanted.
 *
 * Nothing is switched automatically. A visitor whose language is supported is
 * offered the swap and can decline; the choice is remembered.
 */

import { LANGUAGES, strings } from './strings.js';

const STORE_KEY = 'sa-lang';
const DECLINED_KEY = 'sa-lang-declined';

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

/* ============================================================
   THE OFFER
   ============================================================ */

function showOffer(code) {
  const dict = strings[code];
  if (!dict) return;

  const toast = document.createElement('div');
  toast.className = 'langtoast';
  toast.setAttribute('role', 'dialog');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <p class="langtoast__offer">${dict['lang.offer']}</p>
    <p class="langtoast__note">${dict['lang.disclaimer']}</p>
    <div class="langtoast__actions">
      <button class="btn btn--solid langtoast__yes">${dict['lang.apply']}</button>
      <button class="btn langtoast__no">${dict['lang.dismiss']}</button>
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-in'));

  const dismiss = () => {
    toast.classList.remove('is-in');
    setTimeout(() => toast.remove(), 400);
  };

  toast.querySelector('.langtoast__yes').addEventListener('click', () => {
    setLanguage(code, { remember: true });
    dismiss();
  });

  toast.querySelector('.langtoast__no').addEventListener('click', () => {
    try { localStorage.setItem(DECLINED_KEY, '1'); } catch {}
    dismiss();
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

  let stored = null;
  let declined = false;
  try {
    stored = localStorage.getItem(STORE_KEY);
    declined = localStorage.getItem(DECLINED_KEY) === '1';
  } catch {}

  if (stored && byCode(stored)) {
    setLanguage(stored, { quiet: true });
    return;
  }

  // navigator.language is what the visitor asked their browser for.
  const preferred = (navigator.languages || [navigator.language || 'en'])
    .map((l) => String(l).toLowerCase().split('-')[0])
    .find((l) => l !== 'en' && byCode(l) && strings[l]);

  if (preferred && !declined) {
    setTimeout(() => showOffer(preferred), 1800);
  }
}
