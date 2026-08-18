/**
 * The architecture portfolio, as books.
 *
 * Page counts come from the conversion of the print exports in
 * v2/public/assets/Architecture Portfolio — 4961px originals down to two tiers:
 * p01.webp at 1600px for the spread, and p01-hi.webp at 3000px fetched only
 * when the reader zooms. The book magnifies to 4x on a half-spread that
 * occupies about 750 CSS px, which is a 3000px rendering — so the zoom tier is
 * sized to the control rather than guessed at. These are architectural sheets;
 * the dimension strings and annotations ARE the content, and a magnifier that
 * returns mush is worse than no magnifier.
 *
 * The hero render is the tile image only. It is not part of the book: the
 * numbered files are the pages, in order, and the natural sort in that script
 * is load-bearing — sorted as strings, page 10 lands between 1 and 2, and a
 * portfolio whose pages are out of order is worse than one that loads slowly.
 *
 * `aspect` is width/height of a single page. Every project is square except
 * Miscellaneous, which is 3:2 — the spread has to be built from this rather
 * than assumed, or one book renders letterboxed inside another's proportions.
 */

const A = '/assets/arch';

export const archProjects = [
  {
    slug: 'odr',
    title: 'Odisha Development Reserve',
    meta: 'Urban design · masterplan',
    pages: 28,
    aspect: 1,
  },
  {
    slug: 'lkcr',
    title: 'LKCR Library',
    meta: 'Public building · civic',
    pages: 12,
    aspect: 1,
  },
  {
    slug: 'mts',
    title: 'MTS',
    meta: 'Mixed use',
    pages: 6,
    aspect: 1,
  },
  {
    slug: 'jonha',
    title: 'Jonha Eco Resort',
    meta: 'Hospitality · landscape',
    pages: 14,
    aspect: 1,
  },
  {
    slug: 'residence',
    title: 'Dr. Nitesh Residence',
    meta: 'Private residence',
    pages: 6,
    aspect: 1,
  },
  {
    slug: 'thesis',
    title: 'Twin Tower Complex — B.Arch Thesis',
    meta: 'Net-zero mixed use · BIT Mesra · 2021',
    pages: 6,
    aspect: 1,
  },
  {
    slug: 'misc',
    title: 'Miscellaneous',
    meta: 'Studies, competitions, sketches',
    pages: 14,
    aspect: 1.5,
  },
];

const pad = (n) => String(n).padStart(2, '0');

export const archHero = (slug) => `${A}/${slug}/hero.webp`;
export const archPage = (slug, n) => `${A}/${slug}/p${pad(n)}.webp`;
/** The zoom tier. Only ever requested when the reader magnifies past 1x, so a
 *  casual flip through 28 pages never pays for it. */
export const archPageHi = (slug, n) => `${A}/${slug}/p${pad(n)}-hi.webp`;
export const archThumb = (slug, n) => `${A}/${slug}/p${pad(n)}-t.webp`;
export const archBySlug = (slug) => archProjects.find((p) => p.slug === slug);
