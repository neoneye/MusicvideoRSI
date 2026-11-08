// director.js: the video as a function of time. Each scene draws the 640×360 Amiga screen for time t
// and says where the camera looks; fire scenes return an HD fire canvas instead. drawFrame()
// scales the pixel layer to 1920×1080 with hard pixels.
'use strict';

const MAIN = layer(), AUX = layer(), DROSTE = [layer(), layer(), layer(), layer()];
const BROWSER = { x: 30, y: 16, w: 540, h: 330 };
const PAGE_VIEW = { x: BROWSER.x + 6, y: BROWSER.y + TITLE_H + 2 + 37, w: BROWSER.w - 12, h: BROWSER.h - TITLE_H - 4 - 53 };
const DIALER = { x: 384, y: 214, w: 210, h: 122 };
const CLOCKW = { x: 430, y: 18, w: 140, h: 124 };

// ---------------------------------------------------------------- keyframes
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 0; i < keys.length - 1; i++) {
    const A = keys[i], B = keys[i + 1];
    if (t < B[0]) { const k = ease((t - A[0]) / Math.max(1e-6, B[0] - A[0])); return A.slice(1).map((v, j) => lerp(v, B[j + 1], k)); }
  }
  return keys[keys.length - 1].slice(1);
}
const FULL = [320, 180, 1];
// camera framing a screen rect
function frameRect_(r, pad = 12, zmax = 2.6) {
  const z = Math.min(zmax, LW / (r.w + pad * 2), LH / (r.h + pad * 2));
  return [r.x + r.w / 2, r.y + r.h / 2, Math.max(1, z)];
}
// the pointer wanders a little when it is "held still"
function jitter(t, s = 1.2) { return [Math.sin(t * 1.7) * s + Math.sin(t * 4.1) * s * 0.4, Math.cos(t * 1.3) * s * 0.8]; }

// ---------------------------------------------------------------- page shots: which page, scrolled where, camera on what
// plan: [{t, page, key?, cam?: [cx,cy,z] | 'page', load?: seconds}]
function pageShot(plan, t) {
  let i = 0; while (i + 1 < plan.length && plan[i + 1].t <= t) i++;
  const cur = plan[i];
  let p0 = i; while (p0 > 0 && plan[p0 - 1].page === cur.page) p0--;
  const page = PAGES[cur.page];
  layoutPage(page, PAGE_VIEW.w);
  const scrollOf = e => {
    if (e.scroll !== undefined) return e.scroll;
    const r = e.key ? blockRect(page, e.key, PAGE_VIEW.w) : null;
    const maxS = Math.max(0, page._H - PAGE_VIEW.h);
    return r ? clamp(r.y + r.h / 2 - PAGE_VIEW.h / 2, 0, maxS) : 0;
  };
  const camOf = (e, scroll) => {
    if (Array.isArray(e.cam)) return e.cam;
    if (e.cam === 'page' || !e.key) return frameRect_({ x: BROWSER.x, y: BROWSER.y, w: BROWSER.w, h: BROWSER.h }, 0);
    const r = blockRect(page, e.key, PAGE_VIEW.w);
    return frameRect_({ x: PAGE_VIEW.x + r.x, y: PAGE_VIEW.y + r.y - scroll, w: r.w, h: r.h }, e.pad ?? 10, e.zmax ?? 2.4);
  };
  const sNow = scrollOf(cur), cNow = camOf(cur, sNow);
  const prev = i > p0 ? plan[i - 1] : null;
  const k = prev ? ease((t - cur.t) / (cur.move || 0.35)) : 1;
  const sPrev = prev ? scrollOf(prev) : sNow, cPrev = prev ? camOf(prev, sPrev) : cNow;
  const scroll = lerp(sPrev, sNow, k);
  // camera: interpolate, but compute against the moving scroll so the target stays framed
  const cam = [lerp(cPrev[0], cNow[0], k), lerp(cPrev[1], cNow[1], k) + (prev ? (sNow - scroll) * 0 : 0), lerp(cPrev[2], cNow[2], k)];
  const loadT = plan[p0].t, load = plan[p0].load ?? 0.8;
  const reveal = clamp((t - loadT) / load);
  return { page, scroll, cam, reveal, loading: reveal < 1, url: page.url, title: 'AWeb: ' + page.title, t0: loadT, key: cur.key, focus: cur.focus, since: t - cur.t };
}
function browserWith(g, shot, t, o = {}) {
  const r = drawBrowser(g, {
    ...BROWSER, ...o, active: o.active !== false, title: o.title || shot.title, url: o.url !== undefined ? o.url : shot.url,
    status: o.status || (shot.loading ? `Document: ${Math.floor(shot.reveal * 100)}% of 14K` : 'Document: Done.'),
    progress: shot.loading ? shot.reveal : undefined, busy: shot.loading ? t : 0,
    page: (g2, x, y, w, h) => drawPage(g2, shot.page, x, y, w, h, t, shot.scroll, shot.reveal),
  });
  // the line being sung: a blinking marquee frame around its banner
  if (shot.focus && shot.key && !shot.loading) {
    const fr = pageRectOnScreen(shot, shot.key), on = Math.floor(t * 10) % 2;
    g.save(); g.beginPath(); g.rect(PAGE_VIEW.x, PAGE_VIEW.y, PAGE_VIEW.w, PAGE_VIEW.h); g.clip();
    frameRect(g, fr.x - 3, fr.y - 3, fr.w + 6, fr.h + 6, on ? '#ffff00' : '#ff0000'); frameRect(g, fr.x - 2, fr.y - 2, fr.w + 4, fr.h + 4, on ? '#ff0000' : '#ffff00');
    g.restore();
  }
  return r;
}
function pageRectOnScreen(shot, key) {
  const r = blockRect(shot.page, key, PAGE_VIEW.w);
  return { x: PAGE_VIEW.x + r.x, y: PAGE_VIEW.y + r.y - shot.scroll, w: r.w, h: r.h };
}

// ---------------------------------------------------------------- popups
const POPUP_BANNERS = ['v-rsi', 'v-tenmore', 'hot-env', 'kids', 'closing', 'rsi-chart', 'rsi-update', 'rsi-cards', 'rsi-strike', 'jackpot', 'v-update',
  'tokens-sale', 'lost-keys', 'interrupt', 'missed-you', 'ai-singles', 'scan-flash', 'paid-watch', 'v-keys', 'v-replaced', 'v-patch', 'factory', 'chonk', 'obsolete'];
function popupRect(id, x, y) { const B = bannerFor(id); return { x, y, w: B.W + 12, h: B.H + TITLE_H + 8 }; }
function drawPopup(g, id, x, y, t, t0, title, active = false) {
  const r = popupRect(id, x, y);
  const b = drawWindow(g, { ...r, title: title || 'AWeb: SPECIAL OFFER!', active, size: false, bodyPattern: false });
  fill(g, b.x, b.y, b.w, b.h, '#fff');
  drawBanner(g, id, b.x + 2, b.y + 2, t, t0);
  return r;
}
// n popups cascading, deterministic per index
function popupStorm(g, t, n, seed, t0, o = {}) {
  const rects = [];
  for (let i = 0; i < n; i++) {
    const id = POPUP_BANNERS[Math.floor(hash(seed + i * 31) * POPUP_BANNERS.length)];
    const B = bannerFor(id);
    const x = Math.round(hash(seed + i * 17 + 5) * Math.max(1, LW - B.W - 12 - (o.right || 40)));
    const y = Math.round(12 + hash(seed + i * 23 + 9) * Math.max(1, LH - B.H - 40));
    rects.push(drawPopup(g, id, x, y, t, t0 + i * 0.37, o.title ? o.title(i) : `AWeb: SPECIAL OFFER #${i + 1}`, i === n - 1));
  }
  return rects;
}

// ---------------------------------------------------------------- shared desktop state
function memAt(t) {
  if (t < T.ch1door) return [904405, 3010456];
  // "something's growing": other mem runs away, then wraps like a signed 32-bit counter
  const k = t - T.ch1door;
  let other = 3010456 + Math.pow(k, 4) * 4000;
  if (t > 140) other = 2147483647 + (t - 140) * 9e8;
  if (other > 2147483647) other = -2147483648 + ((other - 2147483647) % 4294967296);
  return [904405 + Math.max(0, k) * 1200, other];
}
const yearAt = t => (t > T.date26 && t < T.date26 + 2.5 && Math.floor(t * 6) % 2 === 0) || (t > T.ch1 && t < 177 && Math.floor(t * 3) % 7 === 0) ? '26' : '98';

// ---------------------------------------------------------------- scenes
const SCENES = [];
const scene = (a, b, draw) => SCENES.push({ a, b, draw });

// 0 – 21.6: the button
scene(0, T.click1, (g, t) => {
  const btnAlpha = clamp((t - T.seen) / 0.9);
  drawDesk(g, { button: t >= T.seen ? { alpha: btnAlpha, sel: t > T.click1 - 0.05 } : null });
  const bx = BUTTON_POS.x, by = BUTTON_POS.y + 16;
  const orbit = a => [bx + Math.cos(a) * 46, by + Math.sin(a) * 30];
  let p;
  if (t < T.wonder) p = keyed([[0, 470, 270], [1.6, 470, 270], [T.seen, 380, 230], [T.seen + 0.8, 372, 226], [T.wonder - 1.5, 300, 210], [T.wonder, bx + 46, by]], t);
  else if (t < T.clicking) p = orbit((t - T.wonder) / (T.clicking - T.wonder) * Math.PI * 2 * 1.25);
  else p = keyed([[T.clicking, ...orbit(Math.PI * 2 * 1.25)], [T.clicking + 1.6, bx + 3, by - 2]], t);
  const j = t > T.clicking + 1.6 ? jitter(t, 0.6) : [0, 0];
  if (t > 0.9) pointer(g, p[0] + j[0], p[1] + j[1]);
  // the camera leans in while we hesitate
  const cam = keyed([[0, ...FULL], [T.seen, ...FULL], [T.wonder, 260, 200, 1.25], [T.clicking, 230, 190, 1.6], [T.click1 - 0.2, bx + 4, by + 4, 2.6]], t);
  // fade in from black
  return { cam, fade: clamp(t / 1.6) };
});

// 21.6 – 37.96: dialling in
const DIAL_LINES = [[21.9, 'ATZ'], [22.5, 'OK'], [23.1, 'ATDT 0800-RSI'], [24.0, 'DIALLING...'], [26.0, 'RINGING'], [28.2, 'CONNECT 33600/ARQ/V34'],
  [29.0, 'AmiTCP: PPP up'], [29.8, 'IP 10.20.26.1'], [31.0, 'host: recursive.self'], [32.4, 'route: 1998 -> 2026'], [33.6, 'RX ##########'], [35.2, 'RX ##################']];
function dialerAt(t, extra = {}) {
  const lines = DIAL_LINES.filter(l => l[0] <= t).map(l => l[1]);
  const conn = t > 28.2, pulse = Math.floor(t * 9) % 2;
  return { ...DIALER, lines, oh: t > 23, hs: conn, cd: conn, tr: true, aa: false, rx: conn && pulse, tx: conn && !pulse && Math.floor(t * 5) % 3 === 0, ...extra };
}
scene(T.click1, T.strange, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: true }, sel: { Modem: t > 21.75 && t < 22.0 } });
  const from = { x: BUTTON_POS.x - 16, y: BUTTON_POS.y, w: 32, h: 32 };
  if (t < 22.2) zoomBox(g, from, DIALER, (t - 21.75) / 0.45);
  else drawDialer(g, dialerAt(t, { active: t < T.y1998 }));
  if (t >= T.y1998) {
    const mins = 3 * 60 + 15 + (t - T.y1998) / 60;
    drawClock(g, { ...CLOCKW, minutes: mins, seconds: (t - T.y1998 + 7) % 60, date: '07-Nov-98', active: true });
  }
  pointer(g, BUTTON_POS.x + 3 + (t - 21.6) * 2, BUTTON_POS.y + 14, t < 29 ? 'busy' : 'arrow');
  const cam = keyed([[T.click1, BUTTON_POS.x + 4, BUTTON_POS.y + 20, 2.6], [22.3, ...FULL], [23.4, ...FULL], [24.1, DIALER.x + 105, DIALER.y + 56, 2.2],
    [33.9, DIALER.x + 105, DIALER.y + 62, 2.4], [34.5, ...FULL], [T.y1998, ...FULL], [T.y1998 + 0.45, CLOCKW.x + 70, CLOCKW.y + 62, 2.3], [T.strange - 0.4, CLOCKW.x + 70, CLOCKW.y + 62, 2.5], [T.strange, ...FULL]], t);
  return { cam };
});

// 37.96 – 56.16: the strange window, the banners, the GPU page
const V1_PLAN = [
  { t: 38.7, page: 'home', key: null, cam: 'page', load: 1.9 },
  { t: T.flashing - 0.15, page: 'home', key: 'flashing1', zmax: 1.3, focus: true },
  { t: T.flashing + 1.0, page: 'home', key: 'flashing2', zmax: 1.3, focus: true },
  { t: T.advertising - 0.15, page: 'home', key: 'adv1', zmax: 1.3, focus: true },
  { t: T.advertising + 0.8, page: 'home', key: 'adv2', zmax: 1.3, focus: true },
  { t: T.patch - 0.15, page: 'home', key: 'patch', zmax: 1.32, move: 0.16, focus: true },
  { t: T.keys - 0.15, page: 'home', key: 'keys', zmax: 1.32, move: 0.16, focus: true },
  { t: T.replaced - 0.15, page: 'home', key: 'replaced', zmax: 1.32, move: 0.16, focus: true },
  { t: T.gpus - 0.15, page: 'home', key: 'gpus', zmax: 1.32, move: 0.16, focus: true },
  { t: 52.6, page: 'gpus', key: null, cam: [BROWSER.x + BROWSER.w / 2, 150, 1.45], load: 0.7 },
  { t: T.what, page: 'gpus', key: null, cam: 'page', move: 0.8 },
  { t: 55.0, page: 'gpus', scroll: 60, cam: 'page', move: 1.0 },
];
function v1Pointer(t, shot) {
  if (t < T.gpus + 0.4) return [520, 300];
  if (shot.page === PAGES.home) { const r = pageRectOnScreen(shot, 'gpus'); return keyed([[T.gpus + 0.4, 520, 300], [52.2, r.x + r.w * 0.6, r.y + r.h * 0.6]], t); }
  const j = jitter(t, 6);
  return [300 + j[0] + (t > T.what ? Math.sin(t * 9) * 4 : 0), 200 + j[1]];
}
scene(T.strange, T.modem, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: true }, sel: { AWeb: t < 38.3 } });
  drawDialer(g, dialerAt(t));
  drawClock(g, { ...CLOCKW, minutes: 3 * 60 + 15 + (t - T.y1998) / 60, seconds: (t - T.y1998 + 7) % 60, date: '07-Nov-98' });
  const shot = pageShot(V1_PLAN, t);
  if (t < 38.5) {
    zoomBox(g, { x: 604 - 16, y: 16 + 4 * 42, w: 32, h: 32 }, BROWSER, (t - T.strange) / 0.5);
    return { cam: FULL };
  }
  const url = t < 38.7 ? shot.url.slice(0, Math.floor((t - 38.5) * 60)) : shot.url;
  browserWith(g, shot, t, { url, caret: t < 38.7 });
  const p = v1Pointer(t, shot);
  pointer(g, p[0], p[1], shot.loading ? 'busy' : 'arrow');
  let cam = t < 38.7 ? FULL : shot.cam;
  // each shouted line punches in on the beat
  return { cam, punch: [T.patch, T.keys, T.replaced, T.gpus].some(x => t > x && t < x + 0.12) ? 1 : 0 };
});

// 56.16 – 65.78: the quiet modem, the date, the window that won't close
scene(T.modem, T.ch1, (g, t) => {
  const yr = yearAt(t);
  drawDesk(g, { button: { alpha: 1, sel: true }, title: t > T.date26 ? `Workbench Screen   Sat 07-Nov-${yr}   03:${Math.floor(16 + (t - 56) / 60)}` : undefined });
  const shot = pageShot([{ t: 50, page: 'home', key: 'updated', zmax: 2.2, load: 0 }], t);
  // the browser dodges the pointer
  const dodge = keyed([[0, 0, 0], [61.85, 0, 0], [62.05, 46, 24], [63.0, 46, 24], [63.2, -10, 40]], t);
  const front = t < T.date26 ? 'dialer' : 'browser';
  if (front === 'dialer') browserWith(g, shot, t, { active: false });
  drawClock(g, { ...CLOCKW, minutes: 3 * 60 + 16, seconds: (t - T.y1998 + 7) % 60, date: `07-Nov-${yr}` });
  drawDialer(g, dialerAt(t, { active: front === 'dialer', rx: 0, tx: 0, cd: 0, hs: 0, lines: [...DIAL_LINES.map(l => l[1]).slice(-5), 'carrier: idle', '0 bytes/s'] }));
  if (front === 'browser') {
    const b = { ...BROWSER, x: BROWSER.x + dodge[0], y: BROWSER.y + dodge[1] };
    drawBrowser(g, { ...b, active: true, title: shot.title, url: shot.url, status: 'Document: Done.', page: (g2, x, y, w, h) => drawPage(g2, shot.page, x, y, w, h, t, shot.scroll, 1) });
    if (t > 58.5 && t < 61) {   // the 2026 in the footer flashes
      const r = pageRectOnScreen(shot, 'updated');
      const o = { size: 12 }, line = 'Best viewed with AWeb 3.1 at 640x360. Last updated 07-Nov-2026.', x0 = PAGE_VIEW.x + PAGE_VIEW.w / 2 - wtextW(line, o) / 2;
      const yx = x0 + wtextW('Best viewed with AWeb 3.1 at 640x360. Last updated 07-Nov-', o);
      if (Math.floor(t * 6) % 2 === 0) { g.save(); g.globalCompositeOperation = 'difference'; fill(g, yx - 1, r.y + 3, wtextW('2026', o) + 3, 14, '#ffffff'); g.restore(); }
    }
  }
  if (t > T.another) {
    const k = (t - T.another) / 0.4;
    const r = popupRect('kids', 70, 120);
    if (k < 1) zoomBox(g, { x: 300, y: 170, w: 10, h: 10 }, r, k); else drawPopup(g, 'kids', 70, 120, t, T.another, 'AWeb: You are a WINNER', true);
  }
  // the pointer goes for the close gadget, which keeps moving away
  const cg = [BROWSER.x + dodge[0] + 9, BROWSER.y + dodge[1] + 5];
  const p = t < T.close ? [430, 250] : keyed([[T.close, 430, 250], [61.85, BROWSER.x + 9, BROWSER.y + 5], [62.2, BROWSER.x + 12, BROWSER.y + 7], [62.9, cg[0], cg[1]], [63.3, cg[0] - 2, cg[1]]], t);
  if (t >= T.date26) pointer(g, p[0], p[1]);
  const fr = pageRectOnScreen(shot, 'updated');
  const yearCam = [PAGE_VIEW.x + PAGE_VIEW.w / 2 + 90, fr.y + 8, 3.2];
  const cam = keyed([[T.modem, DIALER.x + 105, DIALER.y + 61, 2.0], [T.date26 - 0.25, DIALER.x + 105, DIALER.y + 61, 2.1], [T.date26, ...yearCam],
    [T.close - 0.3, ...yearCam], [T.close + 0.2, 110, 70, 1.9], [T.another - 0.2, 110, 70, 1.9], [T.another + 0.3, ...FULL]], t);
  return { cam };
});

// the Ed window with rsi.html rewriting itself
function rsiSource(v) {
  return ['<HTML>', `<HEAD><TITLE>RSI v${v}</TITLE></HEAD>`, '<BODY BGCOLOR="#000000" TEXT="#FF3020">', `<!-- written by RSI v${v - 1} -->`,
    `<!-- improves on v${v - 1}: ${(v * 7) % 97 + 3}% faster -->`, '<CENTER>', `<IMG SRC="rsi${v}.gif" WIDTH=468 HEIGHT=60>`, '<BLINK>NEW VERSION</BLINK>',
    `<A HREF="rsi${v + 1}.html">next version</A>`, '</CENTER>', `<SCRIPT>open("rsi${v + 1}.html")</SCRIPT>`, '</BODY>', '</HTML>'];
}
function drawRewriter(g, t, t0, x, y, w, h, rate = 1.6) {
  const k = Math.max(0, t - t0) * rate, v = 1 + Math.floor(Math.pow(k, 1.6));
  const lines = rsiSource(v), hi = Math.floor(k * 4) % lines.length;
  // the highlighted line is being retyped
  const typed = (k * 4) % 1;
  lines[hi] = lines[hi].slice(0, Math.floor(lines[hi].length * typed));
  drawEd(g, { x, y, w, h, title: `Ed: Work:rsi.html   RSI v${fmtNum(v)}`, lines, hi, active: true });
  return v;
}

// 65.78 – 88.9: chorus 1 (and the same skeleton for chorus 2)
function chorus(g, t, C) {
  const R = C.R;   // this chorus's line times
  drawDesk(g, { button: { alpha: 1, sel: true }, mem: memAt(t), swell: { 'RAM Disk': 1 + Math.max(0, t - R.door) * (C.n2 ? 1.8 : 1.3) },
    title: undefined });
  if (C.droste) drawDrosteBrowser(g, t, 3, C);
  else browserWith(g, pageShot([{ t: C.base - 1, page: 'home', scroll: 140, key: null, cam: 'page', load: 0 }], t), t, { active: false });
  drawDialer(g, dialerAt(t, { lines: leakLines(t, R.leak), title: 'Modem: 33600 bps (?)', rx: 1, tx: Math.floor(t * 12) % 2 }));
  let cam = FULL;
  // RSI! RSI!
  let lastShout = null;
  const shout = (t1, x, y) => { if (t > t1) { const r = popupRect('v-rsi', x, y); lastShout = r; if (t < t1 + 0.18) zoomBox(g, { x: x + r.w / 2, y: y + r.h / 2, w: 4, h: 4 }, r, (t - t1) / 0.18); else drawPopup(g, 'v-rsi', x, y, t, t1, 'AWeb: RSI!', true); } };
  if (t < R.rewrite) {
    if (C.droste) { shout(R.ch, 8, 262); shout(R.rsi2, 150, 286); } else { shout(R.ch, 20, 40); shout(R.rsi2, 130, 200); }
    // the camera jumps to each shout
    if (lastShout) cam = frameRect_(lastShout, 8, 1.3);
  }
  // it's rewriting itself
  if (t >= R.rewrite && t < R.ten) {
    drawRewriter(g, t, R.rewrite, 60, 30, 520, 140);
    cam = keyed([[R.rewrite, ...FULL], [R.rewrite + 0.4, 320, 100, 1.45]], t);
  }
  // one becomes ten, ten becomes more
  if (t >= R.ten && t < R.b) {
    const k = t - R.ten;
    const n = k < 1.4 ? 1 : k < 2.7 ? 10 : Math.min(C.n2 ? 120 : 60, Math.floor(10 * Math.pow(2, (k - 2.7) * 2.2)));
    popupStorm(g, t, n, C.seed, R.ten, { right: 76 });
    // something's growing behind the door: the title bar and the swelling RAM disk
    if (t > R.door) cam = keyed([[R.door, ...FULL], [R.door + 0.5, 470, 60, 1.6], [R.b - 0.3, 560, 90, 1.9]], t);
  }
  if (t >= R.b && t < R.leak) { popupStorm(g, t, 40, C.seed + 7, R.b); shout(R.b, 60, 80); shout(R.b2, 150, 200); }
  // the future leaking through the line
  if (t >= R.leak && t < R.explore) {
    popupStorm(g, t, 30, C.seed + 11, R.leak - 3);
    drawDialer(g, dialerAt(t, { lines: leakLines(t, R.leak), title: 'Modem: 33600 bps (?)', rx: 1, tx: 1, active: true }));
    drawPopup(g, 'v-leak', 40, 150, t, R.leak, 'AWeb: LIVE FROM 2026', true);
    cam = keyed([[R.leak, ...FULL], [R.leak + 0.35, 300, 205, 1.3]], t);
  }
  // I only wanted to explore: the Bookmarks menu, which the browser keeps writing
  if (t >= R.explore && t < R.cant) {
    popupStorm(g, t, 30, C.seed + 11, R.leak - 3);
    const n = Math.min(C.n2 ? 34 : 18, 3 + Math.floor((t - R.explore) * (C.n2 ? 12 : 6)));
    drawMenu(g, t, n);
    cam = keyed([[R.explore, ...FULL], [R.explore + 0.5, 210, 120, 1.5]], t);
  }
  // now I can't close it anymore
  if (t >= R.cant && t < C.end) {
    const k = t - R.cant, clicks = Math.floor(k * 3.2);
    const rects = popupStorm(g, t, 24 + clicks * 3, C.seed + 23, R.cant - 2);
    const target = rects[rects.length - 1];
    if (k > 1.6) drawRequester(g, { title: 'AWeb', lines: ["Can't close window.", `It is in use by RSI v${fmtNum(12 + clicks * clicks * 7)}.`], buttons: ['Retry', 'Retry'], down: Math.floor(t * 4) % 2 });
    pointer(g, target.x + 9 + jitter(t, 2)[0], target.y + 5);
  } else if (t >= R.ch && t < R.cant) {
    const p = keyed([[R.ch, 430, 300], [R.explore, 300, 200], [R.explore + 0.4, 160, 4]], t);
    pointer(g, p[0], p[1]);
  }
  return { cam, punch: [R.ch, R.rsi2, R.b, R.b2].some(x => t > x && t < x + 0.12) ? 1 : 0, invert: t > C.end - 1.25 && t < C.end - 0.95 };
}
const LEAK = ['2026: NO MORE GPUs UNTIL 2028', '2026: AGI IN 2-3 YEARS', '2026: S-1 FILED', '2026: AI REPLACED STAFF', '2026: CLOUD IS FULL', '2026: NEW VERSION', '2026: MARKETS -90%', '2026: ZERO-DAY FOUND', '2027: ????????', '2028: ????????'];
function leakLines(t, t0) { const n = Math.max(0, Math.floor((t - t0) * 5)); return ['CONNECT 33600', ...Array.from({ length: n }, (_, i) => '!' + LEAK[i % LEAK.length])]; }
function drawMenu(g, t, n) {
  // the screen title bar turns into the menu strip while the right button is held
  fill(g, 0, 0, LW, TITLE_H, '#fff'); fill(g, 0, TITLE_H - 1, LW, 1, '#000');
  ['Project', 'Window', 'Navigate', 'Bookmarks', 'Settings'].forEach((m, i) => {
    const x = 6 + i * 84;
    if (m === 'Bookmarks') fill(g, x - 3, 0, textW(m) + 6, TITLE_H - 1, '#000');
    text(g, x, 1, m, m === 'Bookmarks' ? '#fff' : '#000');
  });
  const x = 255, w = 300;
  const items = ['Add bookmark', '---', 'recursive.self/', 'recursive.self/gpus-2028.html'];
  for (let i = 0; items.length < n; i++) items.push(`recursive.self/rsi${i + 2}.html   (added by v${i + 1})`);
  fill(g, x, TITLE_H - 1, w, items.length * 9 + 4, '#fff'); frameRect(g, x, TITLE_H - 1, w, items.length * 9 + 4, '#000');
  items.forEach((s, i) => {
    if (s === '---') { for (let k = x + 4; k < x + w - 4; k += 2) fill(g, k, TITLE_H + 3 + i * 9, 1, 1, '#000'); return; }
    const hl = i === items.length - 1;
    if (hl) fill(g, x + 1, TITLE_H + 1 + i * 9, w - 2, 9, MWB.blue);
    text(g, x + 6, TITLE_H + 1 + i * 9, s, hl ? '#fff' : '#000');
  });
}
const CH1 = { ch: T.ch1, rsi2: T.ch1rsi2, rewrite: T.ch1rewrite, ten: T.ch1ten, door: T.ch1door, b: T.ch1b, b2: T.ch1b2, leak: T.ch1leak, explore: T.ch1explore, cant: T.ch1cant };
const CH2 = { ch: T.ch2, rsi2: T.ch2rsi2, rewrite: T.ch2rewrite, ten: T.ch2ten, door: T.ch2door, b: T.ch2b, b2: T.ch2b2, leak: T.ch2leak, explore: T.ch2explore, cant: T.ch2cant };
scene(T.ch1, 88.9, (g, t) => chorus(g, t, { R: CH1, base: T.ch1, seed: 101, end: 88.9 }));

// 88.9 – 112.52: verse 2: the S-1, AGI, markets, the talking GIF
const V2_PLAN = [
  { t: 88.9, page: 'employee', key: null, load: 0.6, cam: 'page' },
  { t: T.employee, page: 'employee', scroll: 0, key: null, cam: [PAGE_VIEW.x + PAGE_VIEW.w / 2, PAGE_VIEW.y + 36, 1.3] },
  { t: 93.4, page: 'employee', key: null, scroll: 30, cam: [PAGE_VIEW.x + PAGE_VIEW.w / 2, PAGE_VIEW.y + 110, 1.7], move: 0.6 },
  { t: T.sixm, page: 'employee', key: 'facts', zmax: 1.5, move: 0.5 },
  { t: T.agi - 0.3, page: 'agi', key: null, load: 0.5, cam: [PAGE_VIEW.x + PAGE_VIEW.w / 2, PAGE_VIEW.y + 36, 1.3] },
  { t: T.promise, page: 'agi', key: 'promises', zmax: 1.45, move: 0.4 },
  { t: T.crash - 0.25, page: 'news', key: 'crash', load: 0.3, zmax: 1.32 },
  { t: T.cloud, page: 'news', key: 'cloud', zmax: 1.32, move: 0.2 },
  { t: T.zeroday, page: 'news', key: 'zeroday', zmax: 1.32, move: 0.2 },
  { t: T.gif - 0.3, page: 'gif', key: 'gif', load: 0.4, zmax: 1.6 },
  { t: T.obsolete + 1.2, page: 'gif', key: 'obsolete', zmax: 1.32, move: 0.4 },
];
scene(88.9, T.cable, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: true }, mem: memAt(t) });
  drawDialer(g, dialerAt(t));
  const shot = pageShot(V2_PLAN, t);
  // the strike-outs on the AGI page, one promise at a time
  if (shot.page === PAGES.agi) {
    const tb = PAGES.agi.blocks.find(b => b.key === 'promises');
    tb.strike = (i, j) => (i > 0 && j === 1 ? clamp((t - (T.promise + 0.3 + (i - 1) * 0.36)) / 0.25) : 0);
  }
  PAGE_STATE.gifTalk = t > T.gif + 0.4 && t < 112.3;
  PAGE_STATE.gifSays = t > T.obsolete ? "YOUR COMPUTER'S\nOBSOLETE!" : t > T.gif + 0.6 ? 'Hello! I am a GIF.' : '';
  browserWith(g, shot, t);
  // the pointer clicks through to the certificate
  const p = keyed([[88.9, 480, 300], [T.sixm - 0.8, 300, 120], [T.sixm - 0.2, 300, 110], [T.sixm + 1, 470, 290]], t);
  pointer(g, p[0], p[1], shot.loading ? 'busy' : 'arrow');
  return { cam: shot.cam, punch: [T.crash, T.cloud, T.zeroday].some(x => t > x && t < x + 0.12) ? 1 : 0 };
});

// 112.52 – 123.12: the cable, the counter, zero bytes, the bandwidth
scene(T.cable, T.ch2, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: true }, mem: memAt(t) });
  const visitors = 7734 + Math.pow(Math.max(0, t - T.counter), 3.2) * 9000;
  PAGE_STATE.visitors = visitors;
  const shot = pageShot([{ t: T.cable - 1, page: 'visitor', key: 'counter', load: 0, zmax: 1.8 }], t);
  const unplugged = t > T.cable + 1.4;
  const dl = unplugged ? ['CONNECT 33600', '!NO CARRIER', '!line: unplugged', ...(t > T.zerobytes ? ['RX: 0 bytes', 'TX: 0 bytes', '!page still loading...'] : [])] : DIAL_LINES.map(l => l[1]).slice(-4);
  const frontDialer = t < T.counter || (t > T.zerobytes && t < T.bandwidth);
  const loadPct = 100 + (t - T.cable) * 37;
  const bopts = { active: !frontDialer, status: `Receiving at ${fmtNum(Math.pow(Math.max(1, t - T.cable), 4) * 120)} KB/s   ${Math.floor(loadPct)}% of 14K` };
  if (frontDialer) browserWith(g, shot, t, { ...bopts, active: false });
  drawDialer(g, dialerAt(t, { lines: dl, active: frontDialer, title: unplugged ? 'Modem: offline' : 'Modem: 33600 bps', cd: !unplugged, hs: !unplugged, oh: !unplugged, rx: 0, tx: 0, tr: !unplugged }));
  if (!frontDialer) browserWith(g, shot, t, bopts);
  // the cable: a little picture in the corner of the dialer
  drawCable(g, DIALER.x - 48, DIALER.y + DIALER.h - 24, t > T.cable + 0.6 ? clamp((t - T.cable - 0.6) / 0.5) : 0);
  const cam = keyed([[T.cable, DIALER.x + 105, DIALER.y + 60, 2.0], [T.counter - 0.3, DIALER.x + 105, DIALER.y + 60, 2.1], [T.counter, ...shot.cam],
    [T.zerobytes - 0.3, ...shot.cam], [T.zerobytes, DIALER.x + 105, DIALER.y + 62, 2.1], [T.bandwidth - 0.2, DIALER.x + 105, DIALER.y + 62, 2.1],
    [T.bandwidth, 150, BROWSER.y + BROWSER.h - 10, 2.6], [T.ch2 - 0.5, 200, BROWSER.y + BROWSER.h - 30, 2.2], [T.ch2, ...FULL]], t);
  pointer(g, 470 + jitter(t, 3)[0], 300 + jitter(t, 3)[1]);
  return { cam };
});
function drawCable(g, x, y, out) {
  // a wall socket and the modem's plug; `out` 0 = plugged in, 1 = pulled out and dangling
  fill(g, x, y, 36, 20, '#e8e0c8'); frameRect(g, x, y, 36, 20, '#000'); fill(g, x + 14, y + 6, 8, 8, '#000');
  const px = x + 14 - out * 18, py = y + 6 + out * 10;
  fill(g, px, py, 8, 8, '#d0d0d0'); frameRect(g, px, py, 8, 8, '#000');
  pline(g, px + 4, py + 8, px + 4 - out * 6, py + 18, '#000', 2);
}

// 123.12 – 144.44: chorus 2: the browser shows the screen inside itself
function drawDrosteBrowser(g, t, depth) {
  // render the screen at lower depths first, each shown inside the next browser's page
  const shot = { title: `AWeb: RSI v${fmtNum(Math.pow(2, Math.max(0, t - T.ch2) * 1.5))}`, url: 'http://www.recursive.self/rsi.html', loading: false };
  let inner = null;
  for (let d = depth; d >= 0; d--) {
    const L = d === 0 ? null : DROSTE[d];
    const gg = d === 0 ? g : L.g;
    if (d > 0) { drawDesk(gg, { mem: memAt(t) }); }
    drawBrowser(gg, { ...BROWSER, active: true, title: shot.title, url: shot.url, status: 'Document: Done. (rewritten)', busy: t,
      page: (g2, x, y, w, h) => {
        fill(g2, x, y, w, h, '#000');
        if (inner) { const s = Math.min(w / LW, h / LH); g2.drawImage(inner, x + (w - LW * s) / 2, y + (h - LH * s) / 2, LW * s, LH * s); }
        else drawPage(g2, PAGES.rsi, x, y, w, h, t, 0, 1);
      } });
    if (d > 0) inner = L.c;
  }
}
scene(T.ch2, 145.6, (g, t) => {
  const tiles = t >= T.ch2ten && t < T.ch2b;
  if (tiles) return tileStorm(g, t);
  return chorus(g, t, { R: CH2, base: T.ch2, seed: 202, end: T.ch2end, droste: t < T.ch2ten, n2: true });
});
// one becomes ten, ten becomes more: the whole screen tiles into copies of itself
function tileStorm(g, t) {
  const k = t - T.ch2ten;
  drawDesk(g, { mem: memAt(t) });
  drawDesk(AUX.g, { mem: memAt(t) });
  drawDrosteBrowser(AUX.g, t, 1);
  // one, then ten, then a hundred, then a thousand copies of the screen
  const [cols, rows] = k < 0.64 ? [1, 1] : k < 1.42 ? [5, 2] : k < 1.94 ? [10, 10] : [40, 25];
  const n = cols * rows, tw = LW / cols, th = (LH - TITLE_H) / rows;
  for (let i = 0; i < n; i++) {
    const x = (i % cols) * tw, y = TITLE_H + Math.floor(i / cols) * th;
    const slip = Math.sin(t * 3 + i) * (n > 10 ? 0 : 0);
    g.drawImage(AUX.c, Math.round(x + slip), Math.round(y), Math.ceil(tw), Math.ceil(th));
  }
  // something's growing behind the door: the RAM Disk swells out from behind the copies
  if (t > T.ch2door) {
    const e = easeIn(clamp((t - T.ch2door) / (T.ch2b - T.ch2door))), sz = Math.round(32 + e * 300);
    const cx = lerp(604, 330, e), cy = lerp(116, 190, e);
    g.drawImage(iconCanvas('ram', 2), Math.round(cx - sz / 2), Math.round(cy - sz / 2), sz, sz);
    const lab = `RAM Disk  ${fmtNum(Math.pow(10, 3 + e * 9))} bytes`;
    fill(g, cx - textW(lab) / 2 - 1, cy + sz / 2 + 2, textW(lab) + 2, 9, '#000'); text(g, cx - textW(lab) / 2, cy + sz / 2 + 2, lab, '#fff');
  }
  drawScreenTitle(g, `Workbench Screen   ${fmtNum(memAt(t)[0])} graphics mem   ${fmtNum(memAt(t)[1])} other mem`);
  return { cam: FULL, punch: [T.ch2ten, T.ch2ten + 0.64, T.ch2ten + 1.42, T.ch2ten + 1.94].some(x => t > x && t < x + 0.1) ? 1 : 0 };
}

// 145.6 – 163.52: the bridge: new versions, then no more human input
scene(145.6, T.power, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: true }, mem: memAt(t) });
  const reqs = [];
  if (t > T.available) reqs.push({ title: 'RSI Update', lines: [t < T.installed ? 'New version available.' : 'New version installed.', t < T.installed ? 'RSI v2 (written by RSI v1)' : 'RSI v2 is now running.'],
    buttons: t < T.installed ? ['Install', 'Later'] : ['OK'], down: t > 150.2 && t < T.installed ? 0 : (t > 153.4 && t < 154.1 ? 0 : -1) });
  // new version creating new version: requesters spawn requesters
  let shellLines = [];
  if (t > T.creating) {
    const k = t - T.creating, n = Math.min(60, Math.floor(Math.pow(k, 1.9) * 2.2));
    for (let i = 0; i < n; i++) {
      const v = Math.floor(Math.pow(2, 1 + i * 0.55));
      reqs.push({ title: `RSI v${fmtNum(v)}`, lines: ['New version creating new version.', `RSI v${fmtNum(v * 2)} (written by v${fmtNum(v)})`], buttons: [], x: 40 + (i * 13) % 260, y: 30 + (i * 11) % 200 });
      shellLines.push(`Installing RSI v${fmtNum(v * 2)}... done`);
    }
  }
  if (t > T.creating - 0.5) drawShell(g, { x: 10, y: 200, w: 300, h: 140, lines: ['1.Work:> rsi', ...shellLines], caret: true, active: false, title: 'AmigaShell: RSI' });
  reqs.forEach((r, i) => drawRequester(g, { ...r, active: i === reqs.length - 1 }));
  if (t > T.human) {
    drawRequester(g, { title: `RSI v${fmtNum(Math.pow(2, 20 + (t - T.human) * 4))}`, lines: ['Human input no longer required.'], buttons: [], active: true });
  }
  // the pointer: hesitates over Later, then fades out of existence
  if (t < T.human + 0.8) {
    const p = keyed([[145.6, 470, 300], [T.available + 1.2, 360, 210], [150.0, 368, 206], [T.creating, 380, 230], [T.human, 330, 190]], t);
    const fadeOut = clamp((t - T.human) / 0.8);
    if (hash(Math.floor(t * 30)) > fadeOut) pointer(g, p[0], p[1], t > T.installed && t < T.creating ? 'busy' : 'arrow');
  }
  // the picture starts to tear as the bridge builds
  const tear = clamp((t - T.human) / 3.3);
  const cam = keyed([[145.6, ...FULL], [T.available, 320, 180, 1.4], [T.creating - 0.3, 320, 180, 1.45], [T.creating, ...FULL], [T.human, ...FULL], [T.human + 0.5, 320, 180, 1.6]], t);
  return { cam, tear };
});

// 163.52 – 177.64: power off, dark, the little light, the cursor, Good night.
scene(T.power, T.fc, (g, t) => {
  fill(g, 0, 0, LW, LH, '#000');
  if (t < 167.6) {
    // still the last requester, tearing harder, until the power goes
    drawDesk(g, { mem: memAt(t) });
    drawRequester(g, { title: 'RSI v1,048,576', lines: ['Human input no longer required.'], buttons: [] });
    return { cam: [320, 180, 1.6], tear: 1, collapse: clamp((t - 166.9) / 0.7) };
  }
  if (t < T.glass) return { cam: FULL, black: true };
  // a little light in the glass
  if (t < T.cursor) {
    const k = clamp((t - T.glass) / 2.2), pul = 0.6 + 0.4 * Math.sin(t * 5);
    const c = Math.round(80 + 175 * k * pul);
    fill(g, 319, 179, 2, 2, `rgb(${c},${Math.round(c * 0.55)},${Math.round(c * 0.2)})`);
    if (k > 0.5) { fill(g, 318, 179, 1, 2, '#401808'); fill(g, 321, 179, 1, 2, '#401808'); }
    return { cam: [320, 180, 2.4] };
  }
  // the cursor, then Good night.
  const s = 'Good night.', n = t < T.goodnight ? 0 : Math.min(s.length, Math.floor((t - T.goodnight) / 0.07) + 1);
  const x0 = 320 - textW(s) / 2;
  text(g, x0, 176, s.slice(0, n), '#ffa997');
  if (Math.floor(t * 2.2) % 2 === 0 || n < s.length && t > T.goodnight) fill(g, x0 + n * 8, 176, 8, 9, '#ff8800');
  return { cam: [320, 180, 2.4] };
});

// 177.64 – 202.44: the final chorus burns
const GOOD_NIGHT = layer(), GN_SMALL = layer();
function goodNightPicture(t) {
  // the same framing as the cursor scene before it (camera at 2.4× on the middle of the screen)
  const g = GN_SMALL.g; fill(g, 0, 0, LW, LH, '#000');
  const s = 'Good night.'; text(g, 320 - textW(s) / 2, 176, s, '#ffa997');
  const z = 2.4, sw = LW / z, sh = LH / z;
  fill(GOOD_NIGHT.g, 0, 0, LW, LH, '#000');
  GOOD_NIGHT.g.drawImage(GN_SMALL.c, 320 - sw / 2, 180 - sh / 2, sw, sh, 0, 0, LW, LH);
  return GOOD_NIGHT.c;
}
const FIREPIC = layer();
function finalPicture(t) {
  const g = FIREPIC.g;
  fill(g, 0, 0, LW, LH, '#000');
  if (t < T.boundaries - 0.2) return goodNightPicture(t);
  if (t < T.thousands) {   // no more boundaries: the screen is back, windows without frames, the clock racing
    drawDesk(g, { mem: memAt(140 + (t - T.boundaries) * 9) });
    drawPage(g, PAGES.home, 30, 30, 528, 300, t, (t - T.boundaries) * 120, 1);
    drawClock(g, { ...CLOCKW, minutes: (t - T.boundaries) * 2000, seconds: (t * 60) % 60, date: `07-Nov-${yearAt(t * 3)}`, active: true });
  } else if (t < T.fcb) {  // ten become thousands
    const k = t - T.thousands, n = Math.min(4000, Math.floor(10 * Math.pow(3, k)));
    drawDesk(g, { mem: memAt(141) });
    const cols = Math.ceil(Math.sqrt(n * 16 / 9)), tw = LW / cols, th = LH / Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const x = (i % cols) * tw, y = Math.floor(i / cols) * th;
      fill(g, x, y, Math.max(1, tw - 1), Math.max(1, th - 1), MWB.dark); fill(g, x, y, Math.max(1, tw - 1), Math.max(1, Math.min(th / 4, 3)), MWB.blue);
      if (tw > 10) fill(g, x + 1, y + Math.min(th / 4, 3) + 1, tw - 3, th - Math.min(th / 4, 3) - 3, hash(i) < 0.3 ? '#601010' : hash(i) < 0.6 ? '#404010' : '#303030');
    }
  } else if (t < T.goodbye) {  // RSI! RSI!
    text(g, 320 - textW('RSI!', 'topaz', 9) / 2, 140, 'RSI!', '#ffffff', 'topaz', 9);
  } else if (t < T.clicked) {  // 1998, goodbye
    drawClock(g, { x: 220, y: 60, w: 200, h: 230, minutes: 3 * 60 + 15 + (t - T.goodbye) * 300, seconds: (t * 20) % 60, date: '07-Nov-98', active: true });
    text(g, 320 - textW('1998', 'topaz', 6) / 2, 300, '1998', '#ffffff', 'topaz', 4);
  } else if (t < T.through) {  // the button I clicked
    drawDesk(g, {});
    g.drawImage(iconCanvas('button', 12), 320 - 96, 180 - 110);
  } else {                      // the future's clicking through: pointers click on their own
    for (let i = 0; i < 26; i++) {
      const x = 40 + hash(i * 3) * 560, y = 40 + hash(i * 7) * 280, ph = (t * 2 + hash(i)) % 1;
      g.drawImage(pointerCanvas('arrow'), x, y, 24, 24);
      if (ph < 0.3) frameRect(g, x - ph * 30, y - ph * 30, ph * 60, ph * 60, '#ffff80');
    }
  }
  return FIREPIC.c;
}
scene(T.fc, T.seen2 - 0.8, (g, t) => {
  const fireC = fireAt('final', T.fc, t, {
    params: tt => ({
      ...FireCore_defaults(), source: tt < T.boundaries ? 'none' : 'floor', fuelRate: tt < T.fcend ? (tt < T.boundaries ? 0 : 0.9 + clamp((tt - T.boundaries) / 9) * 1.1) : Math.max(0, 1.2 - (tt - T.fcend) * 0.6),
      sourceHeight: 0.04 + clamp((tt - T.boundaries) / 10) * 0.05, pictureFuel: tt < T.fcend ? (tt < T.boundaries ? 1.6 : (tt > T.fcb && tt < T.goodbye ? 1.6 : 0.22)) : 0,
      palette: 'poster', opacity: 0.6, cooling: 2.6, picBright: tt > T.fcend ? Math.max(0, 1 - (tt - T.fcend) * 0.5) : (tt > T.nobody && tt < T.fcb ? 0.55 : 1), warmth: 0.35,
      smokeYield: tt > T.nobody && tt < T.fcb ? 1.0 : 0.35, grain: 0.15, vignette: 0.35, scorch: 0.5, letterbox: false, exposure: tt > T.fcend ? Math.max(0.1, 1.2 - (tt - T.fcend) * 0.35) : 1.2,
    }),
    picture: finalPicture,
  });
  return { hd: fireC, hdFade: clamp((T.seen2 - 1.0 - t) / 1.2) };
});

// 201.64 – 211.14: a fresh boot, and the button again
scene(T.seen2 - 0.8, T.click2, (g, t) => {
  drawDesk(g, { button: { alpha: 1, sel: t > T.click2 - 0.05 } });
  const bx = BUTTON_POS.x, by = BUTTON_POS.y + 16;
  const p = keyed([[T.seen2 - 0.8, 470, 280], [T.seen2, 470, 280], [T.seen2 + 1.4, 380, 240], [T.wonder2, 330, 220], [T.wonder2 + 2.6, bx + 30, by + 8], [T.click2 - 0.8, bx + 3, by - 2]], t);
  pointer(g, p[0], p[1]);
  const cam = keyed([[T.seen2, ...FULL], [T.wonder2, 260, 200, 1.3], [T.click2, bx + 4, by + 4, 2.4]], t);
  return { cam, fade: clamp((t - (T.seen2 - 0.8)) / 1.0) };
});

// 211.14 – 226.8: Click. The title card burns.
const TITLE_CARD = layer(1280, 720);
function titleCard() {
  if (TITLE_CARD.done) return TITLE_CARD.c;
  const g = TITLE_CARD.g, W = 1280, H = 720;
  const bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
  bg.addColorStop(0, '#1d120b'); bg.addColorStop(0.55, '#0b0705'); bg.addColorStop(1, '#000');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const metal = (txt, size, y, spacing) => {
    g.font = `${size}px Impact, "Arial Black", sans-serif`; g.textAlign = 'center'; if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
    const gr = g.createLinearGradient(0, y - size * 0.82, 0, y + size * 0.04);
    gr.addColorStop(0, '#fff6e8'); gr.addColorStop(0.45, '#e8c8b0'); gr.addColorStop(0.5, '#8a6a5a'); gr.addColorStop(0.62, '#f0d8c0'); gr.addColorStop(1, '#fff2e0');
    g.fillStyle = gr; g.fillText(txt, W / 2, y);
  };
  metal('RSI', 300, 400, 30);
  metal('RECURSIVE SELF IMPROVEMENT', 54, 500, 6);
  g.font = '22px Helvetica, Arial, sans-serif'; g.fillStyle = '#d8b8a0'; if ('letterSpacing' in g) g.letterSpacing = '8px';
  g.fillText('NOW THE FUTURE’S CLICKING THROUGH', W / 2, 600);
  TITLE_CARD.done = true;
  return TITLE_CARD.c;
}
scene(T.click2, DUR + 1, (g, t) => {
  const fireC = fireAt('end', T.click2, t, {
    params: tt => ({ ...FireCore_defaults(), source: 'veil', veilCover: 0.4 + clamp((tt - T.click2) / 3) * 0.6, fuelRate: tt < 222 ? 1 : Math.max(0, 1 - (tt - 222) * 0.4),
      pictureFuel: tt < 212.2 ? 1.2 : 0.35, opacity: 0.5, exposure: tt < 224 ? 1.2 : Math.max(0, 1.2 - (tt - 224) * 0.45) }),
    picture: tt => {
      if (tt < 212.0) {   // the desktop with the clicked button is what catches fire
        drawDesk(AUX.g, { button: { alpha: 1, sel: true } });
        return AUX.c;
      }
      return titleCard();
    },
  });
  return { hd: fireC, hdFade: clamp((DUR - t) / 2.6), flash: clamp(1 - (t - T.click2) / 0.25) };
});

// ---------------------------------------------------------------- compositing
function FireCore_defaults() { return FIRE.api.C.defaults(); }
function sceneAt(t) { let s = null; for (const sc of SCENES) if (t >= sc.a && t < sc.b) s = sc; return s; }
const OUTL = layer(1920, 1080);
function drawFrame(ctx, t) {
  ctx.imageSmoothingEnabled = false;
  const g = MAIN.g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  fill(g, 0, 0, LW, LH, '#000');
  let sc = sceneAt(t), r = sc ? sc.draw(g, t) : null;
  if (!r && sc) { // a scene that declines hands over to the one before it
    const idx = SCENES.indexOf(sc); for (let i = idx - 1; i >= 0 && !r; i--) if (t >= SCENES[i].a && t < SCENES[i].b) r = SCENES[i].draw(g, t);
  }
  r = r || { cam: FULL };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
  if (r.hd) {
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = r.hdFade ?? 1;
    ctx.drawImage(r.hd, 0, 0, 1920, 1080);
    ctx.globalAlpha = 1;
    if (r.flash) { ctx.fillStyle = `rgba(255,255,255,${r.flash})`; ctx.fillRect(0, 0, 1920, 1080); }
    return;
  }
  if (r.black) return;
  if (r.invert) { g.globalCompositeOperation = 'difference'; fill(g, 0, 0, LW, LH, '#fff'); g.globalCompositeOperation = 'source-over'; }
  // tearing: rows slide sideways in bands (the signal giving up)
  if (r.tear) {
    AUX.g.drawImage(MAIN.c, 0, 0);
    const bands = Math.floor(4 + r.tear * 30);
    for (let i = 0; i < bands; i++) {
      if (hash(i * 97 + Math.floor(t * 15)) > r.tear * 0.7) continue;
      const y = Math.floor(hash(i * 13 + Math.floor(t * 15)) * LH), h = 1 + Math.floor(hash(i * 7 + Math.floor(t * 11)) * 12 * r.tear);
      const dx = Math.round((hash(i * 5 + Math.floor(t * 23)) - 0.5) * 80 * r.tear);
      g.drawImage(AUX.c, 0, y, LW, h, dx, y, LW, h);
    }
  }
  let [cx, cy, z] = r.cam || FULL;
  if (r.punch) z *= 1.06;
  z = Math.max(1, z);
  const sw = LW / z, sh = LH / z;
  const sx = clamp(cx - sw / 2, 0, LW - sw), sy = clamp(cy - sh / 2, 0, LH - sh);
  if (r.collapse) {   // the power goes: the picture squashes to a line, then a dot
    const k = r.collapse, hh = Math.max(3, 1080 * Math.pow(1 - Math.min(1, k * 1.6), 2)), ww = k < 0.62 ? 1920 : Math.max(6, 1920 * (1 - (k - 0.62) / 0.38));
    ctx.drawImage(MAIN.c, sx, sy, sw, sh, (1920 - ww) / 2, (1080 - hh) / 2, ww, hh);
    if (k > 0.5) { ctx.fillStyle = '#ffffff'; ctx.fillRect((1920 - ww) / 2, 540 - 2, ww, 4); }
    return;
  }
  ctx.drawImage(MAIN.c, sx, sy, sw, sh, 0, 0, 1920, 1080);
  if (r.fade !== undefined && r.fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - r.fade})`; ctx.fillRect(0, 0, 1920, 1080); }
}
