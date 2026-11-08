// lyrics.js: when each line is sung (seconds), from faster-whisper on the lead vocal stem
// (docs/timing/whisper_lead_vocals.json). The video never shows these as subtitles; scenes key off them.
'use strict';

const DUR = 226.8, FPS = 30;
const BEAT = 0.6502, BEAT0 = 2.30;   // librosa beat grid (docs/timing/beats.json)

const T = {
  seen: 2.18, wonder: 7.46, clicking: 12.70, click1: 21.58,
  y1998: 35.00, strange: 37.96, flashing: 40.80, advertising: 43.14,
  patch: 46.16, keys: 47.38, replaced: 48.64, gpus: 50.90, what: 53.44,
  modem: 56.16, date26: 58.50, close: 61.06, another: 63.64,
  ch1: 65.78, ch1rsi2: 67.46, ch1rewrite: 68.48, ch1ten: 71.14, ch1door: 73.82, ch1b: 76.54, ch1b2: 77.80, ch1leak: 78.46,
  ch1explore: 81.38, ch1cant: 83.98, rsi3: 87.62,
  employee: 89.12, sixm: 95.12, agi: 97.60, promise: 100.12, crash: 102.90, cloud: 103.82, zeroday: 105.46,
  gif: 108.06, obsolete: 110.50, cable: 112.52, counter: 115.38, zerobytes: 118.22, bandwidth: 120.96,
  ch2: 123.12, ch2rsi2: 124.22, ch2rewrite: 125.30, ch2ten: 127.92, ch2door: 130.64, ch2b: 133.32, ch2b2: 134.56, ch2leak: 135.34,
  ch2explore: 138.02, ch2cant: 140.90, ch2end: 144.44,
  available: 147.74, installed: 150.96, creating: 154.52, creating2: 157.04, human: 160.12,
  power: 163.52, dark: 168.08, glass: 170.64, cursor: 173.26, goodnight: 176.22,
  fc: 177.64, fcrsi2: 178.84, boundaries: 179.72, thousands: 182.36, nobody: 185.10, fcb: 187.64, fcb2: 189.06, goodbye: 190.26,
  clicked: 192.58, through: 195.48, fcend: 199.22,
  seen2: 202.44, wonder2: 206.18, click2: 211.14,
};
const beatAt = t => (t - BEAT0) / BEAT;            // fractional beat index
const beatPulse = (t, k = 6) => { const f = beatAt(t); return f < 0 ? 0 : Math.exp(-k * (f - Math.floor(f)) * BEAT); };
