// thumbs.js: three YouTube thumbnail candidates, 1280×720. Each is drawn at 640×360 in the video's own
// pixels (and, for the third, burned by the t2-fire simulation) and scaled up 2× with hard pixels.
'use strict';

const THUMB_L = layer();

// big Topaz text with a hard black outline, for the thumbnail titles
function bigText(g, x, y, s, color, scale, outline = '#000', o = 2) {
  for (let dx = -o; dx <= o; dx++) for (let dy = -o; dy <= o; dy++) if (dx || dy) text(g, x + dx, y + dy, s, outline, 'topaz', scale);
  text(g, x, y, s, color, 'topaz', scale);
}
const bigTextC = (g, cx, y, s, color, scale, outline, o) => bigText(g, Math.round(cx - textW(s, 'topaz', scale) / 2), y, s, color, scale, outline, o);
function toThumb(ctx, src, sx = 0, sy = 0, sw = LW, sh = LH) {
  ctx.imageSmoothingEnabled = false; ctx.drawImage(src, sx, sy, sw, sh, 0, 0, 1280, 720);
}

const THUMBS = [
  {
    // 1: the button, huge, with the pointer about to click it
    name: 'thumb1_the_button',
    draw(ctx) {
      const g = THUMB_L.g;
      drawDesk(g, {});
      // a zoomed-in crop of the desktop around a big button
      const Z = layer(); patternFill(Z.g, 0, 0, LW, LH, 'desk');
      g.drawImage(Z.c, 0, 0);
      drawScreenTitle(g, 'Workbench Screen   904,405 graphics mem   3,010,456 other mem');
      // the button at 7× with its label
      g.drawImage(iconCanvas('button', 14), 330, 62);
      fill(g, 330 + 112 - 66, 62 + 210, 132, 30, '#000'); textC(g, 330 + 112, 62 + 214, 'RSI', '#fff', 'topaz', 3);
      // the pointer, big, just about to click
      g.drawImage(pointerCanvas('arrow'), 470, 150, 72, 72);
      // title
      bigText(g, 18, 40, 'RSI', '#e83020', 9, '#000', 3);
      bigText(g, 22, 140, "I wonder what", '#ffffff', 3, '#000', 2);
      bigText(g, 22, 172, 'that button', '#ffffff', 3, '#000', 2);
      bigText(g, 22, 204, 'does...', '#ffffff', 3, '#000', 2);
      bigText(g, 22, 300, '1998', '#3b67a2', 4, '#fff', 2);
      toThumb(ctx, THUMB_L.c);
    },
  },
  {
    // 2: the banner storm: popups everywhere, the browser, a shouted RSI!
    name: 'thumb2_banner_storm',
    draw(ctx) {
      const g = THUMB_L.g, t = 60;
      drawDesk(g, { button: { alpha: 1, sel: true } });
      popupStorm(g, t, 14, 77, 50, { right: 0 });
      const r = drawPopup(g, 'v-rsi', 86, 120, 68.2, 66, 'AWeb: RSI!', true);
      drawPopup(g, 'v-replaced', 150, 214, 49, 48.6, 'AWeb: SPECIAL OFFER!', false);
      drawPopup(g, 'no-vacancy', 20, 280, 51, 50.9, 'AWeb: SPECIAL OFFER!', false);
      // the shout, big
      fill(g, 0, 18, LW, 92, '#000');
      bigTextC(g, 320, 24, 'RSI! RSI!', '#ffff40', 9, '#c00000', 3);
      fill(g, 0, 330, LW, 30, '#000');
      bigTextC(g, 320, 337, '2026 IS LEAKING INTO 1998', '#ffffff', 2, '#000', 2);
      toThumb(ctx, THUMB_L.c);
    },
  },
  {
    // 3: the desktop on fire, with the T2 fire, and RSI burning in the middle
    name: 'thumb3_desktop_on_fire',
    draw(ctx) {
      const P = layer();
      const pic = () => {
        const g = P.g;
        drawDesk(g, { button: { alpha: 1, sel: true }, mem: [904405, -2147483648] });
        drawBrowser(g, { ...BROWSER, active: true, title: 'AWeb: RSI v1,048,576', url: 'http://www.recursive.self/rsi.html', status: 'Human input no longer required.',
          page: (g2, x, y, w, h) => drawPage(g2, PAGES.rsi, x, y, w, h, 70, 0, 1) });
        fill(g, 0, 100, LW, 140, '#000');
        bigTextC(g, 320, 116, 'RSI', '#ffffff', 12, '#000', 3);
        return P.c;
      };
      const fc = fireAt('thumb', 0, 3.5, {
        params: tt => ({ ...FireCore_defaults(), source: 'floor', fuelRate: 1.5, sourceHeight: 0.07, pictureFuel: 0.25, opacity: 0.5, cooling: 2.4,
          palette: 'poster', warmth: 0.25, grain: 0, vignette: 0.5, scorch: 0.6, exposure: 0.95 }),
        picture: pic,
      });
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(fc, 0, 0, 1280, 720);
      // the title stays crisp on top
      const T2 = layer(); T2.g.clearRect(0, 0, LW, LH);
      bigTextC(T2.g, 320, 14, 'RECURSIVE SELF IMPROVEMENT', '#ffd890', 2, '#000', 2);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(T2.c, 0, 0, 1280, 720);
      FS.scene = null;   // the next video frame replays its own fire
    },
  },
];
