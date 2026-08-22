/**
 * The Instagram strip — a scrollable row of recent posts that ends by handing
 * the reader over to Instagram.
 *
 * THE SECTION IS A FUNNEL, NOT A GALLERY, and every decision follows from that:
 * each tile is an <a> to its own permalink rather than a lightbox, because a
 * lightbox keeps people here and the whole point is to send them there. The last
 * card in the row is the invitation, positioned where a reader who has scrolled
 * the strip naturally arrives.
 *
 * DATA COMES FROM A MANIFEST, NOT FROM INSTAGRAM AT RUNTIME.
 * Fetching in the browser would need an access token in the bundle, and anything
 * in the bundle is public. So the strip reads a static JSON file whose shape is
 * deliberately Meta's /me/media shape — swapping hand-written entries for a
 * build-time fetch is then a script that writes this file, not a rewrite here.
 *
 * The images are LOCAL paths on purpose. Meta's media_url is a signed CDN link
 * that expires, so storing those would make the strip work for a few weeks and
 * then go silently blank — no error, no clue. Whatever writes this manifest must
 * download the pictures first.
 *
 * EMPTY IS A DESIGNED STATE. With no posts the section still renders the
 * invitation card on its own, so it is useful from the first deploy and gains
 * posts later rather than being broken until then.
 */

const MANIFEST = '/assets/insta/posts.json';
const PROFILE_FALLBACK = 'https://www.instagram.com/shibli_afaq';

function tile(post, profile) {
  const href = post.permalink || profile;
  const cap = (post.caption || '').trim();
  /* alt carries the caption because these are content, not decoration — a
     reader who cannot see the picture should still learn what the post was. */
  return `
    <a class="insta__post" href="${href}" target="_blank" rel="noopener"
       ${cap ? `aria-label="Instagram post: ${cap.replace(/"/g, '&quot;')}"` : 'aria-label="Instagram post"'}>
      <img src="${post.image}" alt="${cap.replace(/"/g, '&quot;')}" loading="lazy" decoding="async">
      ${cap ? `<span class="insta__cap">${cap}</span>` : ''}
    </a>`;
}

export async function initInstagram() {
  const section = document.getElementById('instagram');
  if (!section) return;
  const strip = section.querySelector('[data-insta-strip]');
  if (!strip) return;

  let data = null;
  try {
    const res = await fetch(MANIFEST, { cache: 'no-cache' });
    if (res.ok) data = await res.json();
  } catch {
    /* No manifest, offline, or malformed: fall through. The invitation card is
       rendered regardless, so a failed fetch costs the posts and not the
       section — the reader still gets the way through to Instagram. */
  }

  const profile = data?.profile || PROFILE_FALLBACK;
  const posts = Array.isArray(data?.posts) ? data.posts.filter((p) => p && p.image) : [];

  const invite = `
    <a class="insta__more" href="${profile}" target="_blank" rel="noopener">
      <span class="insta__more-glyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
             stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5"></rect>
          <circle cx="12" cy="12" r="4"></circle>
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"></circle>
        </svg>
      </span>
      <span class="insta__more-t">${posts.length ? 'See more' : 'Follow along'}</span>
      <span class="insta__more-h">@${profile.replace(/\/+$/, '').split('/').pop()}</span>
    </a>`;

  strip.innerHTML = posts.map((p) => tile(p, profile)).join('') + invite;
  section.classList.toggle('has-posts', posts.length > 0);

  /* A horizontal strip is a scroll container, and a scroll container that only
     answers to a trackpad is unusable with a mouse. Shift+wheel is the browser's
     own convention for that and costs one listener. Never plain wheel: the
     section is short and stealing vertical here would trap the page, which is a
     mistake this project has already made once in the projects wheel. */
  strip.addEventListener('wheel', (e) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    strip.scrollLeft += e.deltaY + e.deltaX;
  }, { passive: false });
}
