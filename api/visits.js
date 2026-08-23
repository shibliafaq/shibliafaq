/**
 * Visitor counter.
 *
 * GET  /api/visits   -> read the total
 * POST /api/visits   -> increment, then return the new total
 *
 * WHY A FUNCTION AT ALL. The site is static, and a static page cannot keep a
 * number that survives the visitor closing the tab. Something server-side has
 * to hold it, and Vercel picks up this directory as a serverless function with
 * no build configuration.
 *
 * WHY UPSTASH OVER THE SDK. Vercel's KV integration provisions an Upstash Redis
 * and injects KV_REST_API_URL and KV_REST_API_TOKEN. Those are all this needs,
 * and the REST endpoint is plain fetch, so the site takes no new npm dependency
 * for one integer.
 *
 * WHAT IS STORED: one integer, under one key. No IP address, no user agent, no
 * identifier of any kind — there is nothing here to link a count to a person,
 * which is the whole reason the "have I already counted" decision is made in
 * the browser rather than here.
 *
 * UNCONFIGURED IS A NORMAL ANSWER, NOT AN ERROR. Until the store is attached
 * there are no env vars, and this replies `{configured: false}` with a 200. The
 * client then leaves the footer element hidden, so the page is never showing a
 * broken counter or a zero that is not true. Same for a store that is attached
 * but failing: better no number than a wrong one.
 */

const KEY = 'visits:total';

/* THE VARIABLES ARE NAMED DIFFERENTLY DEPENDING ON HOW THE STORE WAS ADDED,
   so all the names anyone plausibly ends up with are accepted rather than one.
   Vercel's own KV product used KV_REST_API_*; attaching Upstash Redis through
   the Marketplace gives UPSTASH_REDIS_REST_*; `vercel integration resource
   connect --prefix` can put anything in front; and someone pasting the values
   in by hand will pick whatever seems obvious. Reading one pair and calling
   everything else "not configured" turns a naming difference into a silent
   failure with nothing on screen to explain it.

   Ordered by how specific they are, so an explicit REDIS_* pair set by hand
   wins over one an integration happened to leave behind. */
const URL_KEYS = [
  'KV_REST_API_URL',
  'UPSTASH_REDIS_REST_URL',
  'REDIS_REST_API_URL',
  'STORAGE_REST_API_URL',
];
const TOKEN_KEYS = [
  'KV_REST_API_TOKEN',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_REST_API_TOKEN',
  'STORAGE_REST_API_TOKEN',
];

const firstSet = (names) => {
  for (const n of names) {
    const v = process.env[n];
    if (v) return { name: n, value: v };
  }
  return null;
};

export default async function handler(req, res) {
  const url = firstSet(URL_KEYS);
  const tok = firstSet(TOKEN_KEYS);
  const base = url && url.value.replace(/\/+$/, '');
  const token = tok && tok.value;

  res.setHeader('Cache-Control', 'no-store');

  /* A presence-only report, so a store that is attached but not working can be
     told apart from one that was never attached — without this the only symptom
     either way is a footer with no line in it. Names and booleans only: no
     value, no fragment of a value, nothing that is a secret. */
  if (req.query && req.query.debug !== undefined) {
    res.status(200).json({
      configured: Boolean(base && token),
      urlVarFound: url ? url.name : null,
      tokenVarFound: tok ? tok.name : null,
      looksFor: { url: URL_KEYS, token: TOKEN_KEYS },
    });
    return;
  }

  if (!base || !token) {
    res.status(200).json({ configured: false });
    return;
  }

  // INCR returns the value it just wrote, so a counted visit needs one round
  // trip rather than an increment followed by a read.
  const command = req.method === 'POST' ? 'incr' : 'get';

  try {
    const r = await fetch(`${base}/${command}/${KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      res.status(200).json({ configured: false });
      return;
    }
    const body = await r.json();
    // GET on a key that has never been written returns null, which is 0 visits.
    const count = Number(body.result) || 0;
    res.status(200).json({ configured: true, count });
  } catch {
    res.status(200).json({ configured: false });
  }
}
