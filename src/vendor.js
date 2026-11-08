// vendor.js: load the three tools copied into assets/ without changing them.
//   BANNERS  — web-banners-90s: Banner (one preset rendered as 1998 GIF frames), BannerData.PRESETS, BannerCore
//   GUI      — retro-guis: GuiCore (Topaz pixel font bitmaps, the 16×16 icons, the MagicWB palette)
//   FIRE     — t2-fire, running in a hidden same-origin iframe; its own animation loop is stopped
//              and the video steps the simulation itself (see fire.js)
'use strict';

async function fetchText(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ': ' + r.status); return r.text(); }
function scriptBlocks(html) { return [...html.matchAll(/<script(?: id="([^"]*)")?>([\s\S]*?)<\/script>/g)].map(m => ({ id: m[1] || '', code: m[2] })); }

let BANNERS = null, GUI = null, FIRE = null;

async function loadVendors() {
  // ---- banners: the shared core plus the drawing code, up to the page UI
  const bh = await fetchText('assets/web-banners-90s/index.html');
  const bs = scriptBlocks(bh);
  const core = bs.find(b => b.id === 'shared-code').code;
  const main = bs.find(b => b.code.includes('class Banner')).code;
  const cut = main.indexOf('// ===================================================================== page');
  // eslint-disable-next-line no-new-func
  BANNERS = new Function(core + '\n' + main.slice(0, cut) +
    '\nreturn { Banner, BannerData, BannerCore, TEMPLATES, resolvePreset, SPR, FACES };')();
  BANNERS.byId = Object.fromEntries(BANNERS.BannerData.PRESETS.map(p => [p.id, p]));

  // ---- retro GUIs: only the DOM-free core
  const gh = await fetchText('assets/retro-guis/index.html');
  const gcore = scriptBlocks(gh).find(b => b.id === 'shared-code').code;
  // eslint-disable-next-line no-new-func
  GUI = new Function(gcore + '\nreturn GuiCore;')();

  // ---- fire
  FIRE = await new Promise((ok, bad) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:-4000px;top:0;width:960px;height:540px;border:0;visibility:hidden';
    f.src = 'assets/t2-fire/index.html#';
    f.onload = () => {
      const w = f.contentWindow;
      const tryInit = () => {
        if (!w.__fire) return setTimeout(tryInit, 20);
        w.requestAnimationFrame = () => 0;       // stop its loop; we step it ourselves
        w.document.getElementById('main').classList.add('nopanel');
        w.__fire.resize();
        ok({ frame: f, win: w, api: w.__fire, canvas: w.document.getElementById('gl') });
      };
      tryInit();
    };
    f.onerror = bad;
    document.body.appendChild(f);
  });
}
