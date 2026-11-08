// wb.js: the Workbench screen with MUI windows in the MagicWB palette, after retro-guis' MUI desktop
// (HERON: an Amiga 4000/040 with MUI 3.8). Desktop, screen title bar, windows, requesters, and the
// programs the video needs: AWeb (browser), the modem dialer, AmigaShell, Ed and the Clock.
'use strict';

const TITLE_H = 11;

function fmtNum(n) { return Math.floor(n).toLocaleString('en-US'); }

// ---------------------------------------------------------------- desktop
const DESK_ICONS = [
  ['harddisk', 'Workbench'], ['harddisk', 'Work'], ['ram', 'RAM Disk'], ['modem', 'Modem'], ['browser', 'AWeb'], ['terminal', 'Shell'], ['clock', 'Clock'], ['trash', 'Trash'],
];
const BUTTON_POS = { x: 150, y: 168 };   // the strange new icon (centre x, top y)

function drawScreenTitle(g, label) {
  fill(g, 0, 0, LW, TITLE_H, '#fff'); fill(g, 0, TITLE_H - 1, LW, 1, '#000');
  text(g, 3, 1, label, '#000');
  // depth gadget at the right edge
  fill(g, LW - 23, 0, 1, TITLE_H - 1, '#000');
  g.drawImage(CSSIMG.depth, LW - 18, 1);
}
function drawDesk(g, st = {}) {
  patternFill(g, 0, 0, LW, LH, 'desk');
  const mem = st.mem || [904405, 3010456];
  drawScreenTitle(g, st.title || `Workbench Screen   ${fmtNum(mem[0])} graphics mem   ${fmtNum(mem[1])} other mem`);
  const sel = st.sel || {};
  DESK_ICONS.forEach(([ic, label], i) => {
    if (st.hideIcons && st.hideIcons.includes(label)) return;
    const sc = (st.swell && st.swell[label]) || 1;
    if (sc > 1.01) {
      const c = iconCanvas(ic, 2, !!sel[label]), s = Math.round(32 * sc);
      g.drawImage(c, Math.round(604 - s / 2), Math.round(16 + i * 42 + 16 - s / 2), s, s);
      const w = textW(label); fill(g, 604 - w / 2 - 1, 16 + i * 42 + 33, w + 2, 9, '#000'); text(g, 604 - w / 2, 16 + i * 42 + 33, label, '#fff');
    } else deskIcon(g, ic, label, 604, 16 + i * 42, !!sel[label]);
  });
  if (st.button) {
    const b = st.button;   // {alpha, sel, label}
    if (b.alpha >= 1 || hash(Math.floor(b.alpha * 97) + 3) < b.alpha) deskIcon(g, 'button', b.label || 'RSI', BUTTON_POS.x, BUTTON_POS.y, !!b.sel);
  }
}

// ---------------------------------------------------------------- windows
// A MUI window: 4px side borders, 2px bottom, 11px title bar with gadgets. Returns the body rect.
function windowBody(w) { return { x: w.x + 4, y: w.y + TITLE_H + 2, w: w.w - 8, h: w.h - TITLE_H - 4 }; }
function drawWindow(g, w) {
  const x = Math.round(w.x), y = Math.round(w.y), W = Math.round(w.w), H = Math.round(w.h);
  fill(g, x, y, W, H, MWB.grey);
  fill(g, x, y, 1, H, '#fff'); fill(g, x + W - 1, y, 1, H, '#000'); fill(g, x, y + H - 1, W, 1, '#000');
  // title bar
  const tb = w.active ? MWB.blue : MWB.grey;
  fill(g, x, y, W, TITLE_H, tb); fill(g, x, y, W, 1, '#fff'); fill(g, x, y + TITLE_H - 1, W, 1, '#000');
  const gad = (gx, gw, img) => { raised(g, gx, y, gw, TITLE_H); g.drawImage(CSSIMG[img], Math.round(gx + (gw - CSSIMG[img].width) / 2), y + 1); };
  let tx = x + 4, right = x + W;
  if (w.close !== false) { gad(x, 18, 'close'); tx = x + 22; }
  if (w.gadgets !== false) { right -= 23; gad(right, 23, 'depth'); right -= 23; gad(right, 23, 'zoom'); right -= 21; gad(right, 21, 'iconify'); }
  g.save(); g.beginPath(); g.rect(tx, y, right - tx - 2, TITLE_H); g.clip();
  text(g, tx, y + 1, w.title || '', w.active ? '#fff' : '#000');
  g.restore();
  const b = windowBody(w);
  if (w.bodyPattern !== false) patternFill(g, b.x, b.y, b.w, b.h, 'body');
  if (w.size !== false && W > 60) { g.drawImage(CSSIMG.size, x + W - 18 + 3, y + H - 10); }
  if (w.content) { g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip(); w.content(g, b.x, b.y, b.w, b.h); g.restore(); }
  return b;
}
// the wireframe outline Intuition draws while a window opens (k: 0 = icon rect, 1 = window rect)
function zoomBox(g, from, to, k) {
  for (let i = 0; i < 4; i++) {
    const kk = clamp(k - i * 0.08);
    if (kk <= 0) continue;
    const e = easeOut(kk);
    const x = lerp(from.x, to.x, e), y = lerp(from.y, to.y, e), w = lerp(from.w, to.w, e), h = lerp(from.h, to.h, e);
    g.save(); g.globalCompositeOperation = 'difference'; frameRect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), '#fff'); g.restore();
  }
}
// a System Request in the middle of the screen; returns the button rects
function drawRequester(g, r) {
  const lines = r.lines || [], bw = r.buttons || ['OK'];
  const w = r.w || Math.max(200, ...lines.map(l => textW(l) + 30), bw.length * 90 + 20);
  const h = TITLE_H + 14 + lines.length * 10 + 26;
  const x = r.x !== undefined ? r.x : Math.round((LW - w) / 2), y = r.y !== undefined ? r.y : Math.round((LH - h) / 2);
  drawWindow(g, { x, y, w, h, title: r.title || 'System Request', active: r.active !== false, gadgets: false, size: false, close: false });
  const b = windowBody({ x, y, w, h });
  // the text group
  fill(g, b.x + 4, b.y + 4, b.w - 8, lines.length * 10 + 8, MWB.light); sunken(g, b.x + 4, b.y + 4, b.w - 8, lines.length * 10 + 8);
  lines.forEach((l, i) => textC(g, b.x + b.w / 2, b.y + 8 + i * 10, l, '#000'));
  const rects = [];
  if (bw.length) {
    const gap = (b.w - 8 - bw.length * 80) / Math.max(1, bw.length - 1);
    bw.forEach((label, i) => {
      const bx = bw.length === 1 ? b.x + b.w / 2 - 40 : b.x + 4 + i * (80 + gap), by = y + h - 19;
      muiButton(g, bx, by, 80, 15, label, r.down === i); rects.push({ x: bx, y: by, w: 80, h: 15 });
    });
  }
  return { x, y, w, h, buttons: rects };
}

// ---------------------------------------------------------------- AWeb, the browser
// b: {x,y,w,h, active, title, url, caret, status, progress, page(g, x, y, w, h), down: 'Back'|..., closeAt}
function drawBrowser(g, b) {
  const inner = drawWindow(g, { ...b, title: b.title || 'AWeb', content: null });
  const { x, y, w, h } = inner;
  // toolbar
  const labels = ['Back', 'Fwd', 'Home', 'Reload', 'Stop'];
  labels.forEach((l, i) => muiButton(g, x + 2 + i * 50, y + 2, 48, 15, l, b.down === l));
  // spinning globe at the right of the toolbar (the busy indicator)
  const gx = x + w - 20;
  icon(g, 'browser', gx, y + 1, 1);
  if (b.busy) { const f = Math.floor(b.busy * 8) % 4; fill(g, gx + 4 + f * 2, y + 6, 2, 2, MWB.pink); }
  // URL line
  text(g, x + 4, y + 23, 'URL:', '#000');
  fill(g, x + 40, y + 20, w - 44, 14, b.urlFocus ? '#fff' : '#c4c4c4'); sunken(g, x + 40, y + 20, w - 44, 14);
  const url = b.url || '';
  text(g, x + 44, y + 23, url, '#000');
  if (b.caret) fill(g, x + 44 + textW(url), y + 22, 8, 10, '#ff8800');
  // the page
  const px = x + 2, py = y + 37, pw = w - 4, ph = h - 37 - 16;
  fill(g, px, py, pw, ph, b.pageBg || '#fff'); sunken(g, px - 1, py - 1, pw + 2, ph + 2);
  if (b.page) { g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip(); b.page(g, px, py, pw, ph); g.restore(); }
  // status line with a gauge
  const sy = y + h - 14;
  fill(g, x + 2, sy, w - 4, 13, MWB.light); sunken(g, x + 2, sy, w - 4, 13);
  if (b.progress !== undefined && b.progress < 1) {
    const gw = 90; fill(g, x + w - gw - 4, sy + 2, gw, 9, MWB.grey); sunken(g, x + w - gw - 4, sy + 2, gw, 9);
    fill(g, x + w - gw - 3, sy + 3, Math.round((gw - 2) * clamp(b.progress)), 7, MWB.blue);
  }
  text(g, x + 5, sy + 2, b.status || 'Document: Done.', '#000');
  return { px, py, pw, ph };
}

// ---------------------------------------------------------------- the modem dialer
// d: {x,y, lines[], rx, tx, cd, oh, title, bytesIn, bytesOut, cable}
function drawDialer(g, d) {
  const w = d.w || 210, h = d.h || 122;
  const inner = drawWindow(g, { x: d.x, y: d.y, w, h, title: d.title || 'Modem: 33600 bps', active: d.active });
  const { x, y } = inner;
  // the modem front panel with its lights
  fill(g, x + 4, y + 4, inner.w - 8, 20, '#c4c4c4'); sunken(g, x + 4, y + 4, inner.w - 8, 20);
  const lights = [['HS', d.hs], ['AA', d.aa], ['CD', d.cd], ['OH', d.oh], ['RD', d.rx], ['SD', d.tx], ['TR', d.tr], ['MR', 1]];
  lights.forEach(([lab, on], i) => {
    const lx = x + 10 + i * 24;
    fill(g, lx, y + 7, 8, 4, on ? '#ff3020' : '#5a1810'); frameRect(g, lx - 1, y + 6, 10, 6, '#000');
    text(g, lx - 3, y + 13, lab, '#000', 'fixed');
  });
  // terminal lines
  fill(g, x + 4, y + 27, inner.w - 8, inner.h - 31, '#000'); sunken(g, x + 3, y + 26, inner.w - 6, inner.h - 29);
  const L = d.lines || [];
  const maxLines = Math.floor((inner.h - 34) / 10);
  L.slice(-maxLines).forEach((l, i) => text(g, x + 7, y + 30 + i * 10, l.slice(0, Math.floor((inner.w - 14) / 8)), l.startsWith('!') ? '#ff6040' : '#ffa997'));
  return inner;
}

// ---------------------------------------------------------------- AmigaShell and Ed
function drawShell(g, s) {
  const inner = drawWindow(g, { x: s.x, y: s.y, w: s.w, h: s.h, title: s.title || 'AmigaShell', active: s.active, bodyPattern: false });
  fill(g, inner.x, inner.y, inner.w, inner.h, MWB.grey);
  const maxLines = Math.floor((inner.h - 4) / 9), cols = Math.floor((inner.w - 6) / 8);
  const lines = (s.lines || []).slice(-maxLines);
  lines.forEach((l, i) => text(g, inner.x + 3, inner.y + 2 + i * 9, l.slice(0, cols), '#000'));
  if (s.caret) {
    const last = lines[lines.length - 1] || '';
    fill(g, inner.x + 3 + Math.min(cols - 1, last.length) * 8, inner.y + 2 + Math.max(0, lines.length - 1) * 9, 8, 9, '#ff8800');
  }
  return inner;
}
// Ed: a text editor showing a file; `hi` highlights a line (the one being rewritten)
function drawEd(g, e) {
  const inner = drawWindow(g, { x: e.x, y: e.y, w: e.w, h: e.h, title: e.title, active: e.active, bodyPattern: false });
  fill(g, inner.x, inner.y, inner.w, inner.h, MWB.grey);
  const cols = Math.floor((inner.w - 6) / 8), max = Math.floor((inner.h - 4) / 9);
  (e.lines || []).slice(0, max).forEach((l, i) => {
    if (e.hi === i) fill(g, inner.x + 1, inner.y + 2 + i * 9, inner.w - 2, 9, MWB.blue);
    text(g, inner.x + 3, inner.y + 2 + i * 9, l.slice(0, cols), e.hi === i ? '#fff' : '#000');
  });
  return inner;
}
// the Clock: an analogue face plus the date
function drawClock(g, c) {
  const inner = drawWindow(g, { x: c.x, y: c.y, w: c.w || 110, h: c.h || 112, title: c.title || 'Clock', active: c.active });
  const cx = inner.x + inner.w / 2, cy = inner.y + (inner.h - 12) / 2, r = Math.min(inner.w, inner.h - 12) / 2 - 4;
  pdisc(g, cx, cy, r + 1, '#000'); pdisc(g, cx, cy, r, '#fff');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; fill(g, cx + Math.sin(a) * (r - 3) - 1, cy - Math.cos(a) * (r - 3) - 1, 2, 2, '#000'); }
  const hand = (a, len, wdt, col) => pline(g, cx, cy, cx + Math.sin(a) * len, cy - Math.cos(a) * len, col, wdt);
  const mins = c.minutes;   // minutes since midnight
  hand((mins / 720) * Math.PI * 2, r * 0.5, 3, '#000');
  hand(((mins % 60) / 60) * Math.PI * 2, r * 0.8, 2, '#000');
  if (c.seconds !== undefined) hand((c.seconds / 60) * Math.PI * 2, r * 0.85, 1, '#ff3020');
  textC(g, cx, inner.y + inner.h - 11, c.date || '07-Nov-98', '#000');
  return inner;
}
