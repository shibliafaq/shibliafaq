/**
 * Visitor counter, browser half. See api/visits.js for the other half.
 *
 * COUNTS VISITORS, NOT PAGE VIEWS. A page view counter on a site like this one
 * mostly counts the author reloading it — this session alone would have added
 * dozens. So a browser counts itself at most once a day, and the decision is
 * made HERE, from a value in localStorage, because the alternative is the
 * server keeping something that identifies the visitor in order to recognise
 * them. One integer on the server and one date in the browser is the whole
 * design, and there is nothing in it to tie a number to a person.
 *
 * A visitor who clears storage, or uses a second browser, counts again. That is
 * the honest cost of not tracking anyone, and it is the right trade for a
 * number that decorates a footer.
 *
 * FAILURE IS SILENT AND INVISIBLE. The element starts hidden and is only
 * revealed once a real number has arrived. No store attached, request blocked,
 * offline, running on a dev server with no functions — all of them leave the
 * footer exactly as it would have looked without this file, rather than showing
 * a zero, a dash, or an error where a count should be.
 */

const KEY = 'sa-visit-day';

export function initVisits() {
  const el = document.querySelector('[data-visits]');
  if (!el) return;

  /* Local date, not UTC: "once a day" should mean the visitor's day, so that
     an evening visit and the next morning's are two, wherever they are. */
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  let counted = false;
  try {
    counted = localStorage.getItem(KEY) === today;
  } catch {
    /* Private mode, or storage disabled. Falling through with `counted` false
       means this visit is counted every time rather than never — the friendlier
       of the two failures for a number meant to say "people come here". */
  }

  fetch('/api/visits', { method: counted ? 'GET' : 'POST' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.configured || typeof data.count !== 'number') return;

      if (!counted) {
        try { localStorage.setItem(KEY, today); } catch { /* see above */ }
      }

      const label = el.dataset.label || 'visitors';
      el.textContent = `${data.count.toLocaleString()} ${label}`;
      el.hidden = false;
    })
    .catch(() => { /* stays hidden */ });
}
