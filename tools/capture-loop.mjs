/**
 * Record a looping clip of a live dashboard, with no dependencies at all.
 *
 *   node tools/capture-loop.mjs --url http://localhost:5199/gis-twin.html \
 *        --out public/assets/loop/gis --settle 9000 --frames 36 --fps 12
 *
 * WHY NOT PLAYWRIGHT
 * It is the obvious answer and it costs a ~200 MB browser download plus a
 * dependency, to drive a Chromium that is already installed on this machine.
 * Node 24 ships a native WebSocket, and the Chrome DevTools Protocol is just
 * JSON over one, so the whole driver is the sixty lines below.
 *
 * WHY NOT --virtual-time-budget, WHICH LOOKS PERFECT FOR THIS
 * Chromium can fast-forward a page's clock and screenshot the result, which
 * would give deterministic frames for free. It does not work here and the
 * failure is quiet: with a budget of 6000 it produced the dashboard's LOADING
 * screen, and with 25000 it produced no file at all. These dashboards run a
 * continuous requestAnimationFrame loop, so virtual time never goes idle, the
 * budget never retires, and the capture hangs. Real time and real delays are
 * the only honest way to photograph something that never stops moving.
 *
 * WHY A SEPARATE PROFILE
 * Without --user-data-dir the launch attaches to the reader's existing browser
 * session and returns "Opening in existing browser session" instead of starting
 * a controllable instance. It also means this never touches their real profile.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const URL_ = arg('url');
const OUT = arg('out');
if (!URL_ || !OUT) {
  console.error('need --url and --out');
  process.exit(1);
}
const W = +arg('width', 1280);
const H = +arg('height', 720);
const FRAMES = +arg('frames', 36);
const FPS = +arg('fps', 12);
const SETTLE = +arg('settle', 9000);
const PORT = +arg('port', 9333);
/* A dashboard that does not animate itself has to be DRIVEN, or the recording
   is a still image with a filename that lies. Measured: all thirty frames of
   the Dammam twin hashed identically, because deck.gl renders once and stops.

   --init  runs once after the settle (set a playback speed, open a tab)
   --drive runs before every frame, with the frame index `i` and total `n` in
           scope, so it can step through layers or tabs as the clip plays
   --clip  x,y,w,h crops the capture, for when the interesting part of a
           dashboard is one panel rather than the whole console */
const INIT = arg('init', '');
const DRIVE = arg('drive', '');
const CLIP = arg('clip', '');

/* Whichever Chromium this machine already has. Edge before Brave: Edge is on
   every Windows install, and Brave is more likely to be the reader's daily
   browser with a session worth not disturbing. */
const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
];
const BROWSER = CANDIDATES.find((p) => existsSync(p));
if (!BROWSER) { console.error('no Chromium found'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = join(tmpdir(), `caploop-${Date.now()}`);
const frameDir = `${OUT}-frames`;
mkdirSync(frameDir, { recursive: true });

const child = spawn(BROWSER, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--mute-audio',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${PORT}`,
  `--window-size=${W},${H}`,
  'about:blank',
], { stdio: 'ignore' });

/** The debug endpoint is not up the instant the process is. */
async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not listening yet */ }
    await sleep(500);
  }
  throw new Error('devtools endpoint never came up');
}

const wsUrl = await target();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const n = ++id;
  pending.set(n, res);
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride',
  { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL_ });

/* A fixed settle rather than waiting on load: these dashboards fetch their
   payload and then spend seconds building layers, so `load` fires long before
   there is anything worth photographing. The gis twin showed its own
   "Loading 12,954 cells" screen for exactly this reason. */
console.log(`settling ${SETTLE}ms ...`);
await sleep(SETTLE);

if (INIT) {
  await send('Runtime.evaluate', { expression: INIT, awaitPromise: true });
  await sleep(1200);
}

let clip = null;
if (CLIP) {
  if (/^[-\d.,\s]+$/.test(CLIP)) {
    const [x, y, w, h] = CLIP.split(',').map(Number);
    clip = { x, y, width: w, height: h, scale: 1 };
  } else {
    /* A SELECTOR, MEASURED AT CAPTURE TIME, not pixel coordinates typed in.
       The rect of a panel depends on the viewport, and the viewport used for a
       recording is rarely the one it was measured in -- the IoT chart sits at
       y=445 in a 961px-tall pane and somewhere else entirely at 720. Asking the
       page where the element actually is removes the whole class of mistake. */
    const r = await send('Runtime.evaluate', {
      expression: `(() => { const e = document.querySelector(${JSON.stringify(CLIP)});
        if (!e) return null; const b = e.getBoundingClientRect();
        return JSON.stringify({x:b.left,y:b.top,width:b.width,height:b.height}); })()`,
      returnByValue: true,
    });
    const v = r?.result?.result?.value;
    if (!v) { console.error(`clip selector matched nothing: ${CLIP}`); process.exit(1); }
    const box = JSON.parse(v);
    clip = { x: Math.round(box.x), y: Math.round(box.y),
             width: Math.round(box.width), height: Math.round(box.height), scale: 1 };
    console.log(`clip ${CLIP} -> ${clip.width}x${clip.height} @ ${clip.x},${clip.y}`);
  }
}

const step = Math.round(1000 / FPS);
for (let i = 0; i < FRAMES; i++) {
  if (DRIVE) {
    await send('Runtime.evaluate', {
      expression: `(function(i,n){${DRIVE}})(${i},${FRAMES})`, awaitPromise: true });
  }
  const shot = await send('Page.captureScreenshot',
    clip ? { format: 'png', clip } : { format: 'png' });
  const data = shot?.result?.data;
  if (!data) { console.error(`frame ${i}: empty`); continue; }
  writeFileSync(join(frameDir, `f${String(i).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
  if (i % 6 === 0) process.stdout.write(`  ${i + 1}/${FRAMES}\r`);
  await sleep(step);
}
console.log(`\ncaptured ${FRAMES} frames -> ${frameDir}`);

ws.close();
child.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* windows holds it briefly */ }
