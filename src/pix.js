// pix.js: the low-res pixel layer and its tools. Everything on the Amiga screen is drawn at 640×360
// with hard pixels: the Topaz font and MagicWB icons from retro-guis, the MUI gadget images and
// patterns lifted from retro-guis' CSS, bevels, pointers, and web-page text thresholded to one bit.
'use strict';

const LW = 640, LH = 360;
const MWB = { grey: '#959595', black: '#000000', white: '#ffffff', blue: '#3b67a2', dark: '#7b7b7b', light: '#afafaf', beige: '#aa907c', pink: '#ffa997' };

function layer(w = LW, h = LH) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: false });
  g.imageSmoothingEnabled = false;
  return { c, g, w, h };
}
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const easeOut = t => { t = clamp(t); return 1 - (1 - t) * (1 - t) * (1 - t); };
const easeIn = t => { t = clamp(t); return t * t * t; };
// smooth step between a and b in time
const ramp = (t, a, b) => clamp((t - a) / (b - a));
function hash(n) { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x6d2b79f5 >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; }; }
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------------------------------------------------------------- images lifted from retro-guis' CSS
const CSSIMG = {};
async function loadCssImages(html) {
  const want = {
    desk: '.t-mui .desk {', body: '.t-mui .body {', close: '.t-mui .g-close {', depth: '.t-mui .g-depth {',
    zoom: '.t-mui .g-zoom {', iconify: '.t-mui .g-iconify {', size: '.t-mui .g-size {', cycle: '.t-mui .cycle {',
  };
  const lines = html.split('\n');
  for (const [k, sel] of Object.entries(want)) {
    const line = lines.find(l => l.includes(sel) && l.includes('data:image/svg+xml'));
    if (!line) { console.warn('css image missing', k); continue; }
    const m = /url\("(data:image\/svg\+xml,[^"]+)"\)/.exec(line);
    const img = new Image(); img.src = m[1].replace(/%23/g, '%23');
    await img.decode();
    // rasterize at 1:1 so it can be used as a canvas pattern / sprite
    const L = layer(img.width, img.height); L.g.drawImage(img, 0, 0);
    CSSIMG[k] = L.c;
  }
}
const PATTERNS = new Map();
function pattern(g, name) {
  const key = name; let p = PATTERNS.get(key);
  if (!p) { p = g.createPattern(CSSIMG[name], 'repeat'); PATTERNS.set(key, p); }
  return p;
}

// ---------------------------------------------------------------- Topaz pixel font (retro-guis FONTS)
const FONTCACHE = new Map();
function fontAtlas(fontName, color) {
  const key = fontName + color; let a = FONTCACHE.get(key);
  if (a) return a;
  const F = GUI.FONTS[fontName], chars = Object.keys(F.glyphs);
  const L = layer(F.cellW * chars.length, F.cellH);
  L.g.fillStyle = color;
  const index = {};
  chars.forEach((ch, i) => {
    index[ch] = i;
    F.glyphs[ch].bits.forEach((row, y) => row.forEach((b, x) => { if (b) L.g.fillRect(i * F.cellW + x, y, 1, 1); }));
  });
  a = { c: L.c, index, cw: F.cellW, ch: F.cellH, base: F.base };
  FONTCACHE.set(key, a); return a;
}
// text with its top-left at (x, y); returns the width
function text(g, x, y, s, color = '#000', font = 'topaz', scale = 1) {
  const A = fontAtlas(font, color);
  s = String(s);
  let cx = Math.round(x);
  for (const chRaw of s) {
    const ch = A.index[chRaw] !== undefined ? chRaw : (A.index[chRaw.toUpperCase()] !== undefined ? chRaw.toUpperCase() : '?');
    const i = A.index[ch];
    if (chRaw !== ' ') g.drawImage(A.c, i * A.cw, 0, A.cw, A.ch, cx, Math.round(y), A.cw * scale, A.ch * scale);
    cx += A.cw * scale;
  }
  return cx - Math.round(x);
}
const textW = (s, font = 'topaz', scale = 1) => String(s).length * GUI.FONTS[font].cellW * scale;
function textC(g, cx, y, s, color, font = 'topaz', scale = 1) { return text(g, cx - textW(s, font, scale) / 2, y, s, color, font, scale); }

// ---------------------------------------------------------------- icons (retro-guis ICONS, MagicWB palette) + our own
const MY_ICONS = {
  // the button nobody has seen before
  button: ['................', '.....kkkkkk.....', '...kkrrrrrrkk...', '..krrwwrrrrrrk..', '..krwwrrrrrrrk..', '.krrwrrrrrrrrRk.',
    '.krrrrrrrrrrrRk.', '.krrrrrrrrrrrRk.', '.krrrrrrrrrrRRk.', '.krrrrrrrrrRRRk.', '..krrrrrrrRRRk..', '..kRRrrRRRRRRk..', '...kkRRRRRRkk...',
    '.....kkkkkk.....', '................', '................'],
  modem: ['................', '................', '................', '.kkkkkkkkkkkkkk.', '.kllllllllllllk.', '.klwwwwwwwwwwlk.',
    '.kllllllllllllk.', '.klgkgkgkrkllLk.', '.kllllllllllllk.', '.kkkkkkkkkkkkkk.', '..kk........kk..', '................',
    '................', '................', '................', '................'],
  editor: ['..kkkkkkkkk.....', '..kwwwwwwwkk....', '..kwbbbbwwklk...', '..kwwwwwwwkkkk..', '..kwbbbbbbbwwk..', '..kwwwwwwwwwwk..',
    '..kwbbbbbwwkkk..', '..kwwwwwwwkyyk..', '..kwbbbbbkyyk...', '..kwwwwwkyyk....', '..kwbbbkyyk.....', '..kwwwkkkk......',
    '..kwwwkkwwwwwk..', '..kkkkkkkkkkkk..', '................', '................'],
};
const ICONCACHE = new Map(), FULL_COLOUR_ICONS = new Set(['button']);
function iconCanvas(name, scale = 2, sel = false) {
  const key = name + scale + sel; let c = ICONCACHE.get(key);
  if (c) return c;
  if (MY_ICONS[name] && !GUI.ICONS[name]) GUI.ICONS[name] = MY_ICONS[name];
  // the button is not from 1998: it keeps its own colours instead of the MagicWB eight
  const px = GUI.iconPixels(name, FULL_COLOUR_ICONS.has(name) ? 'full' : 'magicwb');
  const L = layer(16 * scale, 16 * scale);
  px.forEach((row, y) => row.forEach((col, x) => {
    if (!col) return;
    let cc = col;
    if (sel && FULL_COLOUR_ICONS.has(name)) { const v = parseInt(col.slice(1), 16); cc = '#' + [16, 8, 0].map(b => Math.floor(((v >> b) & 255) * 0.55).toString(16).padStart(2, '0')).join(''); }
    else if (sel) { const v = parseInt(col.slice(1), 16) ^ 0xffffff; cc = '#' + v.toString(16).padStart(6, '0'); }
    L.g.fillStyle = cc; L.g.fillRect(x * scale, y * scale, scale, scale);
  }));
  c = L.c; ICONCACHE.set(key, c); return c;
}
function icon(g, name, x, y, scale = 2, sel = false) { g.drawImage(iconCanvas(name, scale, sel), Math.round(x), Math.round(y)); }
// a Workbench desktop icon: picture plus label in black-backed white text (as MUI on retro-guis)
function deskIcon(g, name, label, cx, y, sel = false) {
  icon(g, name, cx - 16, y, 2, sel);
  const w = textW(label);
  g.fillStyle = '#000'; g.fillRect(Math.round(cx - w / 2) - 1, y + 33, w + 2, 9);
  text(g, cx - w / 2, y + 33, label, '#fff');
}

// ---------------------------------------------------------------- bevels and boxes
function fill(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function raised(g, x, y, w, h, hi = '#fff', lo = '#000') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  fill(g, x, y, w, 1, hi); fill(g, x, y, 1, h, hi); fill(g, x, y + h - 1, w, 1, lo); fill(g, x + w - 1, y, 1, h, lo);
}
const sunken = (g, x, y, w, h) => raised(g, x, y, w, h, '#000', '#fff');
function muiButton(g, x, y, w, h, label, down = false) {
  fill(g, x, y, w, h, down ? MWB.blue : MWB.light);
  if (down) sunken(g, x, y, w, h);
  else { raised(g, x, y, w, h); raised(g, x + 1, y + 1, w - 2, h - 2, '#c8c8c8', MWB.dark); }
  if (label) textC(g, x + w / 2 + (down ? 1 : 0), y + Math.floor((h - 9) / 2) + (down ? 1 : 0), label, down ? '#fff' : '#000');
}
function patternFill(g, x, y, w, h, name) { g.fillStyle = pattern(g, name); g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function hline(g, x, y, w, c) { fill(g, x, y, w, 1, c); }
function frameRect(g, x, y, w, h, c) { fill(g, x, y, w, 1, c); fill(g, x, y + h - 1, w, 1, c); fill(g, x, y, 1, h, c); fill(g, x + w - 1, y, 1, h, c); }

// ---------------------------------------------------------------- pointers (16-colour sprites of the era)
const POINTERS = {
  arrow: { hx: 0, hy: 0, rows: [
    'kk..........', 'kwkk........', 'kwrrkk......', '.krrrrkk....', '.krrrrrrkk..', '..krrrrrrrkk', '..krrrrrkkk.', '...krrkrrk..',
    '...krk.krrk.', '....k...krrk', '.........krk', '..........k.'] },
  busy: { hx: 7, hy: 8, rows: [
    '.....kkkkk......', '.....krrrk......', '......kkk.......', '....kkwwwkk.....', '...kwwwkwwwk....', '..kwwwwkwwwwk...',
    '..kwwwwkwwwwk...', '.kwwwwwkwwwwwk..', '.kwwwwwkkkkwwk..', '.kwwwwwwwwwwwk..', '..kwwwwwwwwwk...', '..kwwwwwwwwwk...',
    '...kwwwwwwwk....', '....kkwwwkk.....', '......kkk.......', '................'] },
};
const PCOL = { k: '#000000', w: '#ffffff', r: '#e83020' };
const PCACHE = new Map();
function pointerCanvas(kind, tint) {
  const key = kind + (tint || ''); let c = PCACHE.get(key);
  if (c) return c;
  const P = POINTERS[kind], L = layer(P.rows[0].length, P.rows.length);
  P.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { L.g.fillStyle = tint && ch === 'r' ? tint : PCOL[ch]; L.g.fillRect(x, y, 1, 1); } }));
  c = L.c; PCACHE.set(key, c); return c;
}
function pointer(g, x, y, kind = 'arrow', tint) {
  const P = POINTERS[kind];
  g.drawImage(pointerCanvas(kind, tint), Math.round(x - P.hx), Math.round(y - P.hy));
}

// ---------------------------------------------------------------- web text: system fonts thresholded to 1 bit
const WEBTEXT = new Map();
const WFONT = {
  serif: '"Times New Roman", Times, serif', sans: 'Helvetica, Arial, sans-serif', impact: 'Impact, "Arial Black", sans-serif',
  mono: '"Courier New", Courier, monospace', comic: '"Comic Sans MS", "Chalkboard SE", cursive', black: '"Arial Black", Arial, sans-serif',
};
function webText(s, { face = 'serif', size = 13, bold = false, italic = false, color = '#000', under = false, threshold = 120 } = {}) {
  const key = [s, face, size, bold, italic, color, under, threshold].join('|');
  let c = WEBTEXT.get(key);
  if (c) return c;
  const font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${WFONT[face] || face}`;
  const m = layer(4, 4).g; m.font = font;
  const w = Math.max(1, Math.ceil(m.measureText(s).width) + 2), h = Math.ceil(size * 1.3) + 2;
  const L = layer(w, h);
  L.g.font = font; L.g.textBaseline = 'alphabetic'; L.g.fillStyle = '#000';
  L.g.fillText(s, 1, Math.round(size * 1.0));
  const img = L.g.getImageData(0, 0, w, h), d = img.data;
  const [r, gg, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] >= threshold) { d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; } else d[i + 3] = 0;
  }
  if (under) { const y = Math.round(size * 1.0) + 2; for (let x = 1; x < w - 1; x++) { const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; } }
  L.g.putImageData(img, 0, 0);
  c = L.c; c.base = Math.round(size * 1.0); WEBTEXT.set(key, c);
  return c;
}
// draw web text with its baseline at y; returns the width
function wtext(g, x, y, s, o = {}) { const c = webText(s, o); g.drawImage(c, Math.round(x - 1), Math.round(y - c.base)); return c.width - 2; }
function wtextC(g, cx, y, s, o = {}) { const c = webText(s, o); g.drawImage(c, Math.round(cx - c.width / 2), Math.round(y - c.base)); return c.width - 2; }
const wtextW = (s, o = {}) => webText(s, o).width - 2;

// ---------------------------------------------------------------- dissolve between two layers (ordered dither)
function dissolve(g, src, k, ox = 0, oy = 0) {
  // draw `src` over g where the 4×4 Bayer threshold is below k (0..1), pixel-crisp
  if (k <= 0) return; if (k >= 1) { g.drawImage(src, ox, oy); return; }
  const m = MASKS.get(Math.floor(k * 16));
  const t = layer(src.width, src.height);
  t.g.drawImage(src, 0, 0); t.g.globalCompositeOperation = 'destination-in';
  t.g.fillStyle = t.g.createPattern(m, 'repeat'); t.g.fillRect(0, 0, src.width, src.height);
  g.drawImage(t.c, ox, oy);
}
const MASKS = new Map();
for (let n = 0; n <= 16; n++) {
  const L = layer(4, 4);
  for (let i = 0; i < 16; i++) if (BAYER4[i] < n) { L.g.fillStyle = '#fff'; L.g.fillRect(i % 4, i >> 2, 1, 1); }
  MASKS.set(n, L.c);
}

// ---------------------------------------------------------------- pixel lines and discs (no anti-aliasing)
function pline(g, x0, y0, x1, y1, col, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, o = Math.floor((w - 1) / 2);
  for (let n = 0; n < 4000; n++) {
    g.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function pdisc(g, cx, cy, r, col) {
  g.fillStyle = col;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    if (r * r - y * y >= 0) g.fillRect(Math.round(cx) - hw, Math.round(cy) + y, hw * 2 + 1, 1);
  }
}
