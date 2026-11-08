// pages.js: the web pages AWeb shows. A page is a list of blocks laid out top to bottom, 1998 style:
// centred headings, banners, a hit counter, horizontal rules, tables. Text is thresholded system fonts
// (pix.js webText), so it reads like the bitmap fonts of the time.
'use strict';

const PAGE_MARGIN = 10;

function wrapWords(s, maxW, o) {
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) { const n = cur ? cur + ' ' + w : w; if (wtextW(n, o) > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur);
  return lines;
}

// block heights depend on the page width
function blockHeight(b, w) {
  switch (b.type) {
    case 'banner': return bannerFor(b.id).H * (b.scale || 1) + 8;
    case 'banners': return Math.max(...b.ids.map(id => bannerFor(id).H)) + 8;
    case 'h1': return (b.size || 26) + 10;
    case 'h2': return (b.size || 17) + 8;
    case 'p': return wrapWords(b.text, w - PAGE_MARGIN * 2, b.o || {}).length * ((b.o && b.o.size ? b.o.size : 13) + 3) + 6;
    case 'hr': return 10;
    case 'space': return b.h;
    case 'table': return b.rows.length * 15 + 6;
    case 'custom': return b.h;
    default: return 0;
  }
}
function layoutPage(page, w) {
  if (page._w === w) return page;
  let y = 6;
  for (const b of page.blocks) { b._y = y; b._h = blockHeight(b, w); y += b._h; }
  page._w = w; page._H = y + 10;
  return page;
}
function drawBg(g, page, x, y, w, h, scroll) {
  if (page.bg === 'stars') {
    fill(g, x, y, w, h, '#000022');
    for (let i = 0; i < 160; i++) {
      const sx = Math.floor(hash(i * 7 + 1) * w), sy = Math.floor(((hash(i * 13 + 2) * 900 - scroll * 0.5) % 900 + 900) % 900);
      if (sy < h) fill(g, x + sx, y + sy, 1, 1, hash(i) < 0.2 ? '#ffff99' : '#8888cc');
    }
  } else if (page.bg === 'grey') fill(g, x, y, w, h, '#c0c0c0');
  else fill(g, x, y, w, h, page.bg || '#ffffff');
}
// draw the page into (x,y,w,h) scrolled by `scroll` px; t is video time; reveal 0..1 loads it top-down
function drawPage(g, page, x, y, w, h, t, scroll = 0, reveal = 1) {
  layoutPage(page, w);
  drawBg(g, page, x, y, w, h, scroll);
  const fg = page.fg || '#000';
  const loaded = reveal >= 1 ? 1e9 : reveal * page._H;
  for (const b of page.blocks) {
    const by = y + b._y - scroll;
    if (by > y + h || by + b._h < y) continue;
    if (b._y > loaded) continue;
    const part = clamp((loaded - b._y) / Math.max(1, b._h));   // how much of this block has arrived
    drawBlock(g, b, x, by, w, t, fg, part);
  }
  // the progressive GIF look: below the loaded line, every 8th row is all that has come in
  if (reveal < 1) {
    const ly = Math.round(y + loaded - scroll);
    if (ly < y + h) fill(g, x, Math.max(y, ly), w, y + h - Math.max(y, ly), page.bgUnloaded || '#c0c0c0');
  }
}
function drawBlock(g, b, x, by, w, t, fg, part) {
  const cx = x + w / 2;
  switch (b.type) {
    case 'banner': {
      const B = bannerFor(b.id), s = b.scale || 1;
      const bx = Math.round(cx - B.W * s / 2);
      if (part < 1) {   // interlaced: only every 4th row so far, smeared down
        const c = bannerCanvas(b.id, t, b.t0 || 0);
        for (let r = 0; r < B.H * part; r += 4) g.drawImage(c, 0, r, B.W, 1, bx, by + 4 + r * s, B.W * s, 4 * s);
      } else drawBanner(g, b.id, bx, by + 4, t, b.t0 || 0, s);
      if (b.border) frameRect(g, bx - 1, by + 3, B.W * s + 2, B.H * s + 2, b.border);
      if (b.hot && b.hot(t)) { g.save(); g.globalCompositeOperation = 'difference'; frameRect(g, bx - 2, by + 2, B.W * s + 4, B.H * s + 4, '#ffffff'); frameRect(g, bx - 3, by + 1, B.W * s + 6, B.H * s + 6, '#ffffff'); g.restore(); }
      b._rect = { x: bx, y: by + 4, w: B.W * s, h: B.H * s };
      break;
    }
    case 'banners': {
      const total = b.ids.reduce((a, id) => a + bannerFor(id).W, 0) + (b.ids.length - 1) * 8;
      let bx = Math.round(cx - total / 2);
      for (const id of b.ids) { const B = bannerFor(id); drawBanner(g, id, bx, by + 4, t, 0); bx += B.W + 8; }
      break;
    }
    case 'h1': case 'h2': {
      const o = { face: b.face || 'serif', size: b.size || (b.type === 'h1' ? 26 : 17), bold: true, color: b.color || fg, italic: b.italic };
      const blink = b.blink && Math.floor(t * 2.5) % 2 === 1;
      if (!blink) wtextC(g, cx, by + o.size, b.text, o);
      break;
    }
    case 'p': {
      const o = Object.assign({ size: 13, color: fg }, b.o || {});
      wrapWords(b.text, w - PAGE_MARGIN * 2, o).forEach((line, i) => {
        if (b.center) wtextC(g, cx, by + o.size + i * (o.size + 3), line, o);
        else wtext(g, x + PAGE_MARGIN, by + o.size + i * (o.size + 3), line, o);
      });
      break;
    }
    case 'hr': fill(g, x + PAGE_MARGIN, by + 4, w - PAGE_MARGIN * 2, 1, '#808080'); fill(g, x + PAGE_MARGIN, by + 5, w - PAGE_MARGIN * 2, 1, '#ffffff'); break;
    case 'table': {
      const cols = b.cols, tw = cols.reduce((a, c) => a + c, 0), tx = Math.round(cx - tw / 2);
      b.rows.forEach((row, i) => {
        const ry = by + 3 + i * 15;
        let cxx = tx;
        row.forEach((cell, j) => {
          frameRect(g, cxx, ry, cols[j], 16, '#808080');
          const o = { size: 12, bold: i === 0, color: (b.colors && b.colors(i, j, t)) || fg, face: 'sans' };
          wtext(g, cxx + 4, ry + 12, String(cell), o);
          if (b.strike && b.strike(i, j, t)) pline(g, cxx + 2, ry + 8, cxx + 2 + Math.min(cols[j] - 4, wtextW(String(cell), o) + 4) * clamp(b.strike(i, j, t)), ry + 7, '#e00000', 2);
          cxx += cols[j];
        });
      });
      break;
    }
    case 'custom': b.draw(g, x, by, w, t); break;
  }
}

// ---------------------------------------------------------------- the pages
const PAGES = {};

PAGES.home = {
  url: 'http://www.recursive.self/', title: 'Welcome to the FUTURE!!!', bg: 'stars', fg: '#ffffff', bgUnloaded: '#000022',
  blocks: [
    { type: 'banner', id: 'v-welcome' },
    { type: 'h2', text: 'News from 2026, delivered to 1998', color: '#ffff66', face: 'serif', italic: true },
    { type: 'banner', id: 'reconstruction' },
    { type: 'hr' },
    { type: 'banner', id: 'patch-now', key: 'flashing1' },
    { type: 'banner', id: 'wordart', key: 'flashing2' },
    { type: 'banner', id: 'laptop', key: 'adv1' },
    { type: 'banner', id: 'factory', key: 'adv2' },
    { type: 'banner', id: 'v-patch', key: 'patch' },
    { type: 'banner', id: 'v-keys', key: 'keys' },
    { type: 'banner', id: 'v-replaced', key: 'replaced' },
    { type: 'banner', id: 'no-vacancy', key: 'gpus' },
    { type: 'hr' },
    { type: 'banner', id: 'v-visitor', key: 'visitor' },
    { type: 'p', center: true, text: 'Best viewed with AWeb 3.1 at 640x360. Last updated 07-Nov-2026.', o: { size: 12, color: '#aaaaff' }, key: 'updated' },
    { type: 'banners', ids: ['btn-offline', 'btn-rotate', 'btn-human', 'btn-ant'] },
  ],
};

PAGES.gpus = {
  url: 'http://www.recursive.self/gpus-2028.html', title: 'GPU availability', bg: '#ffffff',
  blocks: [
    { type: 'h1', text: 'NO MORE GPUs UNTIL 2028', color: '#cc0000', face: 'impact', size: 28 },
    { type: 'p', center: true, text: 'Live stock from every shop on the information superhighway. Updated every 10 seconds.', o: { size: 12 } },
    { type: 'table', cols: [170, 120, 150], rows: [
      ['Product', 'Stock', 'Next delivery'], ['NVIDIA B300', 'SOLD OUT', '2028'], ['NVIDIA H100', 'SOLD OUT', '2028'],
      ['AMD Instinct MI400', 'SOLD OUT', '2028'], ['Google TPU', 'in orbit', 'by rocket'], ['AWS GPU instances', 'waitlist', 'position 1,048,576'],
      ['Microsoft Azure', 'waitlist', 'call us'], ['Your Amiga 4000', '1 left', 'today!'],
    ], colors: (i, j) => (i > 0 && j === 1 ? (i === 7 ? '#008800' : '#cc0000') : null) },
    { type: 'banner', id: 'v-gpu' },
    { type: 'banner', id: 'no-vacancy' },
  ],
};

PAGES.employee = {
  url: 'http://www.recursive.self/s-1/employee.html', title: 'Employee of the Month', bg: '#fff8e0', fg: '#332200',
  blocks: [
    { type: 'banner', id: 'employee' },
    { type: 'h1', text: 'EMPLOYEE OF THE MONTH', color: '#996600', face: 'serif', size: 26 },
    { type: 'custom', h: 64, draw: (g, x, y, w, t) => drawSeal(g, x + w / 2, y + 32, t) },
    { type: 'table', key: 'facts', cols: [190, 230], rows: [
      ['Filed in', 'Form S-1, Anthropic, PBC'], ['Revenue per employee', '$6,600,000'], ['Hours worked', 'all of them'],
      ['Salary', '$0.00'], ['Coffee breaks', 'none'], ['Remarks', 'job well done'],
    ], colors: (i, j) => (i === 1 && j === 1 ? '#cc0000' : null) },
    { type: 'banner', id: 'ipo' },
  ],
};

PAGES.agi = {
  url: 'http://www.recursive.self/agi-soon.html', title: 'AGI in two or three more years', bg: '#ffffff',
  blocks: [
    { type: 'banner', id: 'agi' },
    { type: 'h1', text: 'AGI IN TWO OR THREE MORE YEARS', face: 'serif', size: 22, color: '#000066' },
    { type: 'p', center: true, text: 'The same old promise, collected since 1956. Updated quarterly. Subject to change.', o: { size: 12, italic: true } },
    { type: 'table', key: 'promises', cols: [44, 460], rows: [
      ['Year', 'The promise'],
      ['1965', 'Herbert Simon: machines will do any work a man can do, within 20 years'],
      ['1970', 'Marvin Minsky: human-level machine intelligence in three to eight years'],
      ['1984', 'expert systems will replace the experts any day now'],
      ['1998', 'the internet will make it inevitable, give it a decade'],
      ['2016', 'five more years, tops'],
      ['2026', 'AGI in two or three more years'],
    ] },
  ],
};

PAGES.news = {
  url: 'http://www.recursive.self/news.html', title: 'BREAKING NEWS from 2026', bg: '#000000', fg: '#ffffff',
  blocks: [
    { type: 'h1', text: 'BREAKING NEWS', color: '#ff2020', face: 'impact', size: 26, blink: true },
    { type: 'banner', id: 'v-crash', key: 'crash' },
    { type: 'banner', id: 'v-cloud', key: 'cloud' },
    { type: 'banner', id: 'v-zeroday', key: 'zeroday' },
    { type: 'banner', id: 'markets' },
  ],
};

PAGES.gif = {
  url: 'http://www.recursive.self/upgrade.html', title: 'Talk to the GIF', bg: '#c0c0c0',
  blocks: [
    { type: 'h2', text: 'Meet DOCTOR GIF, your friendly upgrade advisor', face: 'serif', size: 15, color: '#000080' },
    { type: 'custom', h: 150, key: 'gif', draw: (g, x, y, w, t) => drawTalkingGif(g, x + w / 2 - 110, y + 10, t) },
    { type: 'banner', id: 'v-obsolete', key: 'obsolete' },
  ],
};

PAGES.visitor = {
  url: 'http://www.recursive.self/', title: 'Welcome to the FUTURE!!!', bg: 'stars', fg: '#ffffff',
  blocks: [
    { type: 'h1', text: 'You are visitor number', color: '#ffffff', face: 'serif', size: 22 },
    { type: 'custom', h: 70, key: 'counter', draw: (g, x, y, w, t) => drawHitCounter(g, x + w / 2, y + 8, PAGE_STATE.visitors) },
    { type: 'p', center: true, text: 'Thank you for visiting. Please come again. You will.', o: { size: 13, color: '#aaaaff' } },
    { type: 'banner', id: 'v-leak' },
  ],
};

PAGES.rsi = {
  url: 'http://www.recursive.self/rsi.html', title: 'RSI v1', bg: '#000000', fg: '#ff3020',
  blocks: [
    { type: 'banner', id: 'v-rsi' },
    { type: 'banner', id: 'rsi-chart' },
    { type: 'banner', id: 'rsi-cards' },
    { type: 'banner', id: 'rsi-strike' },
  ],
};

// mutable bits set by the director before drawing
const PAGE_STATE = { visitors: 7734 };

// ---------------------------------------------------------------- page furniture
function drawSeal(g, cx, cy, t) {
  const spin = t * 0.8;
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + spin; pdisc(g, cx + Math.cos(a) * 26, cy + Math.sin(a) * 26, 4, '#c08a00'); }
  pdisc(g, cx, cy, 26, '#e0b000'); pdisc(g, cx, cy, 21, '#ffd94a');
  wtextC(g, cx, cy - 2, 'S-1', { face: 'serif', size: 15, bold: true, color: '#663300' });
  wtextC(g, cx, cy + 11, '$6.6M', { face: 'sans', size: 10, bold: true, color: '#663300' });
  // ribbons
  for (const s of [-1, 1]) for (let k = 0; k < 18; k++) fill(g, cx + s * 10 - 4 + s * k * 0.3, cy + 24 + k, 8, 1, '#cc0000');
}
function drawHitCounter(g, cx, y, n) {
  const s = String(Math.floor(n)).padStart(9, '0').slice(-9), dw = 22, x0 = Math.round(cx - dw * s.length / 2);
  [...s].forEach((d, i) => {
    const x = x0 + i * dw;
    fill(g, x, y, dw - 2, 34, '#000'); frameRect(g, x - 1, y - 1, dw, 36, '#808080');
    wtextC(g, x + dw / 2 - 1, y + 28, d, { face: 'mono', size: 30, bold: true, color: '#00ff40' });
  });
}
// DOCTOR GIF: a 12-frame animated GIF of a computer with a face. Its mouth moves while it talks.
function drawTalkingGif(g, x, y, t) {
  const talking = PAGE_STATE.gifTalk || 0, frame = Math.floor(t * 8) % 12;
  // the monitor
  fill(g, x, y, 100, 84, '#d8d0b8'); raised(g, x, y, 100, 84, '#f8f0e0', '#605840');
  fill(g, x + 8, y + 8, 84, 60, '#003300'); sunken(g, x + 8, y + 8, 84, 60);
  fill(g, x + 30, y + 84, 40, 10, '#b8b098'); fill(g, x + 18, y + 94, 64, 6, '#d8d0b8');
  // the face on the screen
  const blink = frame === 7;
  fill(g, x + 26, y + 22, 10, blink ? 2 : 10, '#40ff60'); fill(g, x + 64, y + 22, 10, blink ? 2 : 10, '#40ff60');
  const open = talking ? [2, 10, 6, 14, 4, 12, 8, 2, 12, 6, 14, 4][frame] : 2;
  fill(g, x + 34, y + 46, 32, open, '#40ff60'); if (open > 4) fill(g, x + 38, y + 48, 24, open - 4, '#002200');
  // the speech balloon
  if (PAGE_STATE.gifSays) {
    const s = PAGE_STATE.gifSays, bx = x + 110, by = y + 4;
    const lines = s.split('\n'), bw = Math.max(...lines.map(l => wtextW(l, { face: 'comic', size: 14, bold: true }))) + 16;
    fill(g, bx, by, bw, lines.length * 18 + 10, '#ffffff'); frameRect(g, bx, by, bw, lines.length * 18 + 10, '#000');
    for (let k = 0; k < 10; k++) fill(g, bx - k, by + 30 + k, k + 1, 1, k === 9 ? '#000' : '#ffffff'), fill(g, bx - k - 1, by + 30 + k, 1, 1, '#000');
    lines.forEach((l, i) => wtext(g, bx + 8, by + 20 + i * 18, l, { face: 'comic', size: 14, bold: true, color: '#cc0000' }));
  }
}
// where a keyed block sits on the page (page coordinates), for the camera and the pointer
function blockRect(page, key, w) {
  layoutPage(page, w);
  const b = page.blocks.find(b => b.key === key);
  if (!b) return null;
  if (b.type === 'banner') { const B = bannerFor(b.id), s = b.scale || 1; return { x: Math.round(w / 2 - B.W * s / 2), y: b._y + 4, w: B.W * s, h: B.H * s }; }
  return { x: 0, y: b._y, w, h: b._h };
}
