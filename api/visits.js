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

export default async function handler(req, res) {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  res.setHeader('Cache-Control', 'no-store');

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
