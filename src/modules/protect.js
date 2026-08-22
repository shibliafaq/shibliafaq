/**
 * Media guard — friction against casually saving the images and video.
 *
 * WHAT THIS HONESTLY DOES, AND WHAT IT CANNOT
 *
 * It cannot stop a download. By the time a picture is on screen the browser has
 * already fetched it, and the file is one devtools Network tab, one view-source,
 * or one `curl` on the asset URL away. Nothing running inside the page can
 * change that, and any code claiming otherwise is either lying or is breaking
 * the browser for everyone in order to inconvenience nobody.
 *
 * What it does do is close the two paths that people actually use without
 * thinking: right-click -> Save image as, and drag the picture onto the desktop.
 * On a phone it also suppresses the long-press "Save Image" sheet, which is the
 * single most common way an image leaves a site.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * No blocking of F12, Ctrl+U, Ctrl+S or the developer tools. Those defences do
 * not work — every one is a menu item away — and the cost is real: they break
 * keyboard accessibility, they fight screen readers, and they make the site feel
 * hostile to the exact technical reader this portfolio is aimed at. A page that
 * fights its visitor to protect a 400 KB WebP has its priorities inverted.
 *
 * The context menu is suppressed ON MEDIA ONLY, never page-wide. Text stays
 * selectable, links stay openable in new tabs, and the browser's own menu keeps
 * working everywhere that is not a picture.
 *
 * IF THE FILES GENUINELY MATTER, the answers are upstream of the browser:
 * publish smaller renditions, watermark, or do not publish the original at all.
 * The architecture booklet already ships a 1600px page and only fetches the
 * 3000px one on zoom, which is that principle applied.
 *
 * THE SETTING lives on <html data-protect-media>. Remove the attribute and none
 * of this runs.
 */

/** Nodes whose own context menu offers "Save image/video as". */
const MEDIA = 'img, video, picture, canvas, svg';

function isMedia(el) {
  return !!(el && el.closest && el.closest(MEDIA));
}

export function initMediaGuard() {
  const root = document.documentElement;
  if (!root.hasAttribute('data-protect-media')) return;

  /* Delegated, not per element. The page adds media after load — the wheel
     swaps in its recordings, the booklet builds pages on open, the modal
     renders galleries — so anything that walked the DOM once would miss most of
     it, and a MutationObserver would be a lot of machinery for two listeners.
     One listener on the document covers everything that will ever exist. */
  document.addEventListener('dragstart', (e) => {
    if (isMedia(e.target)) e.preventDefault();
  });

  document.addEventListener('contextmenu', (e) => {
    if (isMedia(e.target)) e.preventDefault();
  });
}
