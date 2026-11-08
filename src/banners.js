// banners.js: the web-banners-90s renderer at video time. Each banner is built once (palette-reduced
// GIF frames, as a 1998 browser showed them) and its frame at time t is looked up from the GIF delays.
// Most banners are presets from web-banners-90s; the ones below are new, for lines in the lyrics.
'use strict';

const NEW_BANNERS = {
  'v-patch': { tpl: 'fire', t: ['PATCH YOUR SYSTEM!', 'flaws found by frontier models, faster than you can patch'] },
  'v-keys': { tpl: 'starburst', t: ['CHANGE YOUR KEYS!', 'Treat every environment variable as decrypted.', 'NOW!'], c: ['#ffffff', '#003399', '#ff3333', '#ffffff'] },
  'v-replaced': { tpl: 'flash', t: ['AI REPLACED YOUR EMPLOYEES!', 'They work nights. They never ask for a raise.', 'HIRE AI'], c: ['#cc0000', '#ffff00', '#000000', '#ffffff'] },
  'v-welcome': { tpl: 'wordart', t: ['Welcome to the FUTURE!!!', 'news from 2026, delivered to 1998'], c: ['#000066', '#6699ff', '#330033', '#ffffff'] },
  'v-cloud': { tpl: 'dialog', t: ['Cloud Storage', 'THE CLOUD IS FULL!', 'AWS, Azure and Google Cloud: 0 bytes free until 2028.', 'OK|Buy more cloud'], s: 'cloud' },
  'v-crash': { tpl: 'chart', t: ['MARKETS CRASH!', 'NASDAQ: software stocks -90%', '100|98|99|92|80|81|60|41|22|9', 'SELL! SELL! SELL!'], c: ['#000000', '#330000', '#ff2020', '#ffffff'] },
  'v-zeroday': { tpl: 'matrix', t: ['AI DISCOVERED ZERO-DAY TOOLS!', 'found by a model at 3:15 a.m. while you slept'] },
  'v-obsolete': { tpl: 'flash', t: ["YOUR COMPUTER'S OBSOLETE!", 'Needs 128 GB RAM and an NPU. You have 16 MB.', 'UPGRADE'], c: ['#000000', '#00ff66', '#ff0066', '#ffffff'] },
  'v-visitor': { tpl: 'odometer', t: ['You are visitor number', '0007734', 'since 07-Nov-2026'], c: ['#ffffff', '#000080', '#000000', '#ffffff'], font: 'times' },
  'v-rsi': { tpl: 'wordart', t: ['RSI! RSI!', "it's rewriting itself tonight"], c: ['#330000', '#ff3300', '#000000', '#ffff00'] },
  'v-tenmore': { tpl: 'flash', t: ['ONE BECOMES TEN!', 'ten becomes more. click to open more windows', 'MORE'], c: ['#ffff00', '#cc0000', '#0000cc', '#000000'] },
  'v-leak': { tpl: 'led', t: ['*** THE FUTURE IS LEAKING THROUGH THE LINE *** 2026 *** RSI *** NO MORE GPUs UNTIL 2028 *** AGI IN 2-3 YEARS *** NEW VERSION AVAILABLE ***'], c: ['#200000', '#ff3020', '#3a0800'] },
  'v-gpu': { tpl: 'price', t: ['NVIDIA H100', 'now only', 'SOLD OUT', 'Next shipment: 2028. Bring your own power plant.'], c: ['#f0fff0', '#003300', '#ff3300', '#ffffff'], s: 'gpu' },
  'v-update': { tpl: 'dialog', t: ['Software Update', 'New version available.', 'It was written by the previous version.', 'Install|Install'], s: 'robot' },
};

const BANNER_CACHE = new Map();
function bannerFor(id) {
  let b = BANNER_CACHE.get(id);
  if (b) return b;
  const preset = NEW_BANNERS[id] ? { id, ...NEW_BANNERS[id] } : BANNERS.byId[id];
  if (!preset) throw new Error('no banner ' + id);
  const look = Object.assign({ speed: 1 }, BANNERS.BannerCore.LOOKS.gif);
  const banner = new BANNERS.Banner(preset, look, preset.size);
  const L = layer(banner.W, banner.H);
  b = { banner, L, last: -1, W: banner.W, H: banner.H };
  BANNER_CACHE.set(id, b);
  return b;
}
// the banner's canvas at video time t (seconds), started at t0
function bannerCanvas(id, t, t0 = 0) {
  const b = bannerFor(id);
  const f = b.banner.frameAt(Math.max(0, (t - t0)) * 100);
  if (f !== b.last) { b.L.g.putImageData(b.banner.frame(f), 0, 0); b.last = f; }
  return b.L.c;
}
function drawBanner(g, id, x, y, t, t0 = 0, scale = 1) {
  const c = bannerCanvas(id, t, t0);
  g.drawImage(c, Math.round(x), Math.round(y), Math.round(c.width * scale), Math.round(c.height * scale));
  return c;
}
