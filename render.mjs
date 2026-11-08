// render.mjs: drive studio.html in headless Chrome. The page is served over a local HTTP server
// (the fire runs in a same-origin iframe, which file:// URLs do not allow).
//   node render.mjs --serve [--port=8123]                                   serve the studio for a browser
//   node render.mjs --sheet=23,23.5,24 [--cols=3] [--w=640] --out=out/check.jpg   contact sheet (fast visual check)
//   node render.mjs --stills=0.8,3,23.8 --out=out/test                     full-res PNG stills
//   node render.mjs --clip=0:6 --out=out/test.mp4                          short clip with audio
//   node render.mjs --frames=0:226.8 --workers=4                           full-res JPEG frames → out/frames (resumable)
//   node render.mjs --encode [--out=out/rsi.mp4]                           frames + song → MP4
//   node render.mjs --eval='JSON.stringify(...)'                           evaluate an expression in the studio page
//   node render.mjs --thumbs [--out=out/thumbs]                            the YouTube thumbnail candidates (1280×720 PNG)
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, extname, join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const CHROME = args.chrome || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
const DUR = 226.8, fps = +(args.fps || 30), SONG = 'assets/Recursive Self Improvement (best).mp3';
const FRAMES_DIR = 'out/frames';

const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });

if (args.encode) {
  const out = args.out || 'out/rsi.mp4', n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  console.log(`encoding ${n} frames → ${out}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(fps), '-i', `${FRAMES_DIR}/f%05d.jpg`, '-i', SONG,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k',
    '-movflags', '+faststart', '-shortest', out]);
  console.log('wrote ' + out);
  process.exit(0);
}

// ---- static server for the repo
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.css': 'text/css' };
const ROOT = resolve('.');
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = join(ROOT, p === '/' ? 'studio.html' : p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(f));
});
const port = await new Promise(ok => server.listen(+(args.port || 0), '127.0.0.1', () => ok(server.address().port)));
const BASE = `http://127.0.0.1:${port}/studio.html`;
if (args.serve) { console.log(`studio: ${BASE}`); await new Promise(() => {}); }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--window-size=1920,1080', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--autoplay-policy=no-user-gesture-required']
});
async function openPage(tag = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on('console', m => { if (['error', 'warn'].includes(m.type()) || args.verbose) console.log(`[page${tag}]`, m.text()); });
  page.on('pageerror', e => console.log(`[page error${tag}]`, e.message));
  await page.goto(BASE + '?render' + (args.test ? '&test=' + args.test : ''), { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 120000 });
  return page;
}
const frameOf = async (page, t, type, q) => {
  const url = await page.evaluate((t, type, q) => window.renderAt(t, type, q), t, type, q);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};
const times = s => String(s).split(',').map(Number);

if (args.eval) {
  const page = await openPage();
  console.log(await page.evaluate(String(args.eval)));
} else if (args.sheet) {
  const page = await openPage(), out = args.out || 'out/sheet.jpg'; mkdirSync(dirname(out), { recursive: true });
  const { url, ms } = await page.evaluate((ts, c, w) => window.renderSheet(ts, c, w), times(args.sheet), +(args.cols || 3), +(args.w || 640));
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${out}  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const page = await openPage(), out = args.out || 'out/stills'; mkdirSync(out, { recursive: true });
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page, s, 'image/png');
    const f = `${out}/t${s.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.thumbs) {
  const page = await openPage(), out = args.out || 'out/thumbs'; mkdirSync(out, { recursive: true });
  const n = await page.evaluate(() => THUMBS.length);
  for (let i = 0; i < n; i++) {
    const { url, name } = await page.evaluate(i => window.renderThumb(i), i);
    writeFileSync(`${out}/${name}.png`, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    console.log(`${out}/${name}.png`);
  }
} else if (args.frames) {
  // Parallel and resumable. Each worker takes contiguous runs of frames, so the fire (a simulation
  // stepped forward in time) only has to replay from its scene start once per run.
  const [a, b] = String(args.frames).split(':').map(Number), workers = +(args.workers || 4), RUN = +(args.run || 300);
  mkdirSync(FRAMES_DIR, { recursive: true });
  const first = Math.round(a * fps), last = Math.min(Math.ceil(DUR * fps) - 1, Math.round(b * fps) - 1);
  const todo = []; for (let i = first; i <= last; i++) { const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  const runs = []; for (let i = 0; i < todo.length; i += RUN) runs.push(todo.slice(i, i + RUN));
  console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), ${workers} workers, ${runs.length} runs`);
  let nextRun = 0, done = 0; const start = Date.now();
  const work = async w => {
    const page = await openPage('#' + w);
    while (nextRun < runs.length) {
      for (const i of runs[nextRun++]) {
        const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
        const buf = await frameOf(page, i / fps, 'image/jpeg', .95);
        writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
        if (++done % 60 === 0 || done === todo.length) {
          const el = (Date.now() - start) / 1000;
          console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame effective  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: workers }, (_, w) => work(w)));
} else {
  const page = await openPage();
  const [a, b] = args.clip ? String(args.clip).split(':').map(Number) : [0, DUR];
  const out = args.out || 'out/clip.mp4'; mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(a), '-t', String(b - a), '-i', SONG,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * fps), start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frameOf(page, a + i / fps, 'image/jpeg', .92);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 30 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}`);
}
await browser.close();
server.close();
