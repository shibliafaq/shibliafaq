import { gsap, ScrollTrigger, reducedMotion } from './scroll.js';

/* ============================================================
   NAV — solid on scroll, section highlighting, mobile menu
   ============================================================ */

export function initNav() {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  if (!nav) return;

  ScrollTrigger.create({
    start: 'top -40',
    end: 99999,
    onUpdate: (self) => nav.classList.toggle('is-solid', self.scroll() > 40),
    onToggle: (self) => nav.classList.toggle('is-solid', self.isActive),
  });

  // Highlight whichever section owns the viewport.
  const links = [...nav.querySelectorAll('.nav__links a')];
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    const set = (on) => link.classList.toggle('is-current', on);
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => set(self.isActive),
    });
  });

  if (burger && menu) {
    const toggle = (force) => {
      const open = force ?? !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', () => toggle());
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) toggle(false);
    });
  }
}

/* ============================================================
   CURSOR — pointer devices only
   ============================================================ */

export function initCursor() {
  const glow = document.getElementById('cursorGlow');
  const dot = document.getElementById('cursorDot');
  if (!glow || !dot) return;
  if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    glow.remove();
    dot.remove();
    return;
  }

  const setGlow = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3' });
  const setGlowY = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3' });
  const setDot = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power2' });
  const setDotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power2' });

  gsap.set([glow, dot], { xPercent: -50, yPercent: -50 });

  document.addEventListener('pointermove', (e) => {
    setGlow(e.clientX); setGlowY(e.clientY);
    setDot(e.clientX); setDotY(e.clientY);
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const hot = e.target.closest('a, button, [data-modal], input, textarea, .atlas__list li');
    dot.classList.toggle('is-hot', !!hot);
  }, { passive: true });

  document.addEventListener('pointerleave', () => gsap.to([glow, dot], { opacity: 0, duration: 0.3 }));
  document.addEventListener('pointerenter', () => gsap.to([glow, dot], { opacity: 1, duration: 0.3 }));
}

/* ============================================================
   CONTACT FORM — Formspree, with a mailto fallback
   ============================================================ */

export function initForm() {
  const form = document.getElementById('cform');
  if (!form) return;

  const btn = document.getElementById('cf-send');
  const ok = document.getElementById('cf-ok');
  const fields = ['cf-name', 'cf-email', 'cf-msg'].map((id) => document.getElementById(id));

  const mailtoFallback = (name, email, message) => {
    const subject = encodeURIComponent(`Portfolio enquiry from ${name}`);
    const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`);
    window.location.href = `mailto:shibliafaq4@gmail.com?subject=${subject}&body=${body}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const [nameEl, emailEl, msgEl] = fields;
    const name = nameEl.value.trim();
    const email = emailEl.value.trim();
    const message = msgEl.value.trim();

    let invalid = false;
    fields.forEach((el) => {
      const bad = !el.value.trim() || (el.type === 'email' && !el.checkValidity());
      el.setAttribute('aria-invalid', String(bad));
      if (bad) invalid = true;
    });
    if (invalid) return;

    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch('https://formspree.io/f/mykvqwbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error('rejected');
      btn.textContent = 'Sent ✓';
      ok.hidden = false;
      form.reset();
      fields.forEach((el) => el.removeAttribute('aria-invalid'));
    } catch {
      btn.disabled = false;
      btn.innerHTML = label;
      mailtoFallback(name, email, message);
    }
  });
}
