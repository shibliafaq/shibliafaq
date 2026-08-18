import { defineConfig } from 'vite';
import { writeFileSync, readFileSync, existsSync, mkdirSync, copyFileSync,
         readdirSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';

/* ---------------------------------------------------------------- map history
   Every write to valley-map.json snapshots the file it is about to replace,
   into a directory OUTSIDE public/ so the snapshots never ship with the build.

   This exists because the map has been lost twice, both times the same way: the
   document in the page was replaced by a fresh generate, and the next save wrote
   that generate over hours of hand-editing. A one-deep backup does not survive
   that, because the second save rolls the bad state into the backup too. An
   append-only history does — the pre-write state is always on disk under its own
   name, and nothing overwrites it.

   Files whose names start with PROTECTED- are never pruned. */
const MAP_FILE = 'public/assets/pixel/valley-map.json';
const MAP_HISTORY = '.map-history';
const KEEP_SNAPSHOTS = 60;

// Milliseconds are in the name deliberately: two saves inside one second is
// ordinary (a click plus the autosave), and a second-resolution name makes the
// later one silently overwrite the earlier snapshot — losing the very state the
// history exists to keep.
function stamp() {
  const d = new Date(), p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
       + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
       + `-${p(d.getMilliseconds(), 3)}`;
}

/** Copy the current map aside. Returns the snapshot name, or null if there was
 *  nothing to snapshot. Never throws — a failed snapshot must not block a save. */
function snapshotMap() {
  try {
    if (!existsSync(MAP_FILE)) return null;
    mkdirSync(MAP_HISTORY, { recursive: true });
    const name = `valley-${stamp()}.json`;
    copyFileSync(MAP_FILE, `${MAP_HISTORY}/${name}`);
    const old = readdirSync(MAP_HISTORY)
      .filter((f) => f.startsWith('valley-') && f.endsWith('.json'))
      .sort();
    while (old.length > KEEP_SNAPSHOTS) {
      const drop = old.shift();
      try { unlinkSync(`${MAP_HISTORY}/${drop}`); } catch {}
    }
    return name;
  } catch (e) {
    console.warn('[map] snapshot failed:', e.message);
    return null;
  }
}

/** Object count of the map currently on disk, or null if unreadable. */
function currentMapObjects() {
  try { return JSON.parse(readFileSync(MAP_FILE, 'utf-8')).objects.length; }
  catch { return null; }
}

// dev-only: lets lab/trace.html write the hand-traced road straight to disk
const saveRoad = {
  name: 'save-road',
  configureServer(server) {
    server.middlewares.use('/__save-road', (req, res) => {
      if (req.method !== 'POST') return res.end();
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        writeFileSync('public/assets/pixel/final/road_path.json', b);
        res.statusCode = 200; res.end('ok');
      });
    });
    server.middlewares.use('/__save-stops', (req, res) => {
      if (req.method !== 'POST') return res.end();
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        writeFileSync('public/assets/pixel/final/stops.json', b);
        res.statusCode = 200; res.end('ok');
      });
    });
    server.middlewares.use('/__save-npcs', (req, res) => {
      if (req.method !== 'POST') return res.end();
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        writeFileSync('public/assets/pixel/final/npcs.json', b);
        res.statusCode = 200; res.end('ok');
      });
    });
    // dev-only: lab/editor.html writes the hand-edit overlay here. Kept as its
    // own file rather than folded into journey.js so the generator stays the
    // source of the world and every hand correction stays revertible.
    server.middlewares.use('/__save-overlay', (req, res) => {
      if (req.method !== 'POST') return res.end();
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        try {
          JSON.parse(b);                       // never write a file that won't parse
          writeFileSync('public/assets/pixel/final/overlay.json', b);
          res.statusCode = 200; res.end('ok');
        } catch (e) {
          res.statusCode = 400; res.end(String(e));
        }
      });
    });
    // dev-only: lab/editor.html writes the whole valley document here.
    //
    // This replaced a File System Access API save, which cannot work in every
    // browser context: showSaveFilePicker created the file but queryPermission
    // came back "denied" and createWritable threw NotAllowedError, so the file
    // sat at zero bytes. Going through the dev server needs no browser
    // permission at all, and it puts the map in the repo where it is visible
    // and backed up rather than in a localStorage slot.
    server.middlewares.use('/__save-valley', (req, res) => {
      if (req.method !== 'POST') return res.end();
      const force = new URL(req.url, 'http://x').searchParams.get('force') === '1';
      let b = '';
      req.on('data', (d) => { b += d; });
      req.on('end', () => {
        try {
          const doc = JSON.parse(b);           // never write a file that will not parse
          if (!doc || !Array.isArray(doc.terrain) || !Array.isArray(doc.objects)) {
            throw new Error('not a valley document');
          }
          // Refuse anything that is not a whole map. The endpoint is one curl
          // away from replacing hours of work with a stub — which is exactly
          // what a 46-byte test payload did — so the shape is checked here as
          // well as in the page. A document whose terrain does not match its own
          // declared dimensions is not a document.
          if (!doc.cols || !doc.rows || doc.terrain.length !== doc.cols * doc.rows) {
            throw new Error(`terrain is ${doc.terrain.length} cells but the document `
              + `declares ${doc.cols}x${doc.rows} — refusing to write a partial map`);
          }
          // A save that halves the map is the signature of a replaced document,
          // not of editing. Snapshots make it recoverable; this makes it visible
          // BEFORE the write, which is the difference between "restore from
          // history" and "never noticed". Deliberate mass deletion passes ?force=1.
          const prev = currentMapObjects();
          if (!force && prev !== null && prev >= 20 && doc.objects.length < prev * 0.5) {
            res.statusCode = 409;
            res.setHeader('content-type', 'application/json');
            return res.end(JSON.stringify({ ok: false, needsForce: true,
              prevObjects: prev, objects: doc.objects.length,
              error: `this save drops ${prev} objects to ${doc.objects.length}. `
                + `Nothing was written. Save again to confirm.` }));
          }
          const snapshot = snapshotMap();      // the file being replaced, kept
          writeFileSync(MAP_FILE, b);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: true, bytes: b.length,
            objects: doc.objects.length, prevObjects: prev, snapshot,
            path: MAP_FILE }));
        } catch (e) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
        }
      });
    });

    // dev-only: run tools/compose_map.py, stream args from the query string,
    // reply with the info JSON the composer wrote alongside the PNG.
    server.middlewares.use('/__compose', (req, res) => {
      const url = new URL(req.url, 'http://x');
      const q = url.searchParams;
      const args = ['tools/compose_map.py',
        '--tile', q.get('tile') || '16',
        '--k',    q.get('k')    || '10',
        '--bth',  q.get('bth')  || '45',
        '--trees',q.get('trees')|| '55',
        '--rocks',q.get('rocks')|| '6',
        '--stage',q.get('stage')|| 'all'];
      if (q.get('labels') === '1') args.push('--labels');
      if (q.get('grid')   === '1') args.push('--grid');
      const proc = spawn('python', args, { cwd: process.cwd() });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d; });
      proc.on('close', (code) => {
        if (code !== 0) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          return res.end(JSON.stringify({ error: 'compose failed', code, stderr }));
        }
        try {
          const info = JSON.parse(readFileSync('lab/composed_map.png.json', 'utf-8'));
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(info));
        } catch (e) {
          res.statusCode = 500; res.end(String(e));
        }
      });
    });
  },
};

export default defineConfig({
  plugins: [saveRoad],
  build: {
    // Never re-inline assets as base64 — undoing that is the whole point of v2.
    assetsInlineLimit: 0,
    target: 'es2020',
    rollupOptions: {
      // Two entry pages. The second is the horizontal-wheel comparison, kept out
      // of the site's navigation but built so it can be looked at on the deploy
      // rather than only on a dev server.
      input: {
        main: 'index.html',
        wheelsHorizontal: 'wheels-horizontal.html',
        projectsMap: 'projects-map.html',
      },
      output: {
        manualChunks: {
          three: ['three'],
          motion: ['gsap', 'lenis'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
