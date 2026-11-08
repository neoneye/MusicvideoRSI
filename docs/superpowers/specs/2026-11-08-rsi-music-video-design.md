# RSI — The Button: music video design

Song: `assets/Recursive Self Improvement (best).mp3` (226.8 s, ~92 BPM, beat every ~0.65 s). Lyrics: `assets/lyrics.txt`.
Line and word timings come from faster-whisper (medium.en) on the lead vocal stem, kept in `docs/timing/`.

## The idea

The whole video is one Amiga screen in 1998, seen first person. We never see the person, only their mouse pointer.
A button nobody has seen before appears on the Workbench. Clicking it opens a web browser that shows pages from the future:
2026's AI news as 1998 banner ads. The browser starts rewriting itself, windows multiply, the counters run away, the plug is pulled, and
then the screen comes back on and burns. The future arrives as HD fire through the 1998 pixels.

## Decisions

From the user:
- **Look:** Amiga Workbench with MUI in the MagicWB palette, built from `assets/retro-guis` (pixel fonts, MagicWB icons, window chrome).
- **Pixels:** clean pixel art, no CRT effect. Everything is drawn at 640×360 and scaled up 3× with hard pixels to 1920×1080.
- **Banners:** `assets/web-banners-90s` renders every banner (its `Banner` class, presets and GIF look), unchanged.
- **Real company names** are allowed on the web pages and in new banners.
- **The "I"** is a mouse pointer of the era (an Amiga-style arrow, and a stopwatch busy pointer).
- **Fire:** `assets/t2-fire` provides the flames towards the end.
- The three source folders were copied into `assets/` and are used as-is. The video's code reads them at load time.

My calls (the user didn't answer these questions before going to sleep):
- Existing parody banner names stay. Real company names appear on the new landing pages and in a few new banners.
- The fire comes in the final chorus. The screen returns after "Good night." and the desktop burns.
- The ending: after the fire there is a fresh boot. The button is back, the pointer clicks it, and the loud instrumental tail (211–226 s) is a T2-style fire title card. Then black.
- Lyrics are not subtitles. They appear inside the world: as banners, window titles, requesters and Shell output.
- No living people are named or quoted. The historical "AGI soon" quotes come from people who have died (Herbert Simon 1965, Marvin Minsky 1970).
- The browser is named AWeb, as on the MUI machine in retro-guis.

## Timeline (seconds, from the vocal stem)

| time | lyric | picture |
|---|---|---|
| 0–2.2 | (intro) | Black. The Workbench screen fades in: title bar, disk icons, MagicWB pattern. Clock 03:15. |
| 2.18 | I haven't seen that button before... | A new icon, a red round button labelled "RSI", blinks into existence among the disk icons. The pointer stops. |
| 7.46 | I wonder what that button does. | The pointer circles it, nearly clicks, then backs off. |
| 12.70 | I'm clicking it. | The pointer moves onto the button. |
| 21.58 | Click. | Double-click: the icon inverts and the busy pointer appears. |
| 22–35 | (build-up) | A modem dialer window dials: ATDT, CONNECT 33600, then the RX/TX lights. AWeb opens with the wireframe zoom; the URL types itself; the page loads top down like an interlaced GIF. |
| 35.00 | It's 1998, a quarter past three | The camera moves to the title bar clock: 03:15, Sat 07-Nov-98. |
| 37.96 | A strange new window opens for me | The page opens: "Welcome to the FUTURE" with an under-construction banner. |
| 40.80 | Flashing banners, red and gold | patch-now (fire, red and gold) and wordart |
| 43.14 | Advertising things not yet sold | laptop "AI Laptop Ultra", factory "AI factory in a box" |
| 46.16 | "PATCH YOUR SYSTEM!" | A full-screen hit on the banner, which the pointer clicks. Landing page: a PATCH NOW page with a patch list. |
| 47.38 | "CHANGE YOUR KEYS!" | rotate "ROTATE EVERY SECRET" |
| 48.64 | "AI REPLACED YOUR EMPLOYEES!" | A new flash banner, AI REPLACED YOUR EMPLOYEES |
| 50.90 | "NO MORE GPUs UNTIL TWENTY-EIGHT!" | no-vacancy, the neon TIL 2028 sign. Landing page: GPU stock for NVIDIA, AMD and the clouds, sold out to 2028. |
| 53.44 | What the hell is this website? | The camera pulls back to the whole browser. The URL is http://www.recursive.self/ |
| 56.16 | The modem's quiet, the screen is bright | The dialer's RX/TX lights go dark, yet the page keeps loading. |
| 58.50 | The date says twenty-six, but that can't be right | Page footer: "Last updated 07-Nov-2026". The 26 flashes, and the screen-title date glitches 98 → 26. |
| 61.06 | I try to close it, I try to flee | The pointer goes for the close gadget, which slides away. A requester says "Window is busy". |
| 63.64 | Another window opens for me | A popup window opens over it. |
| 65.78 | RSI! RSI! | Two big RSI! popups, on the two shouts |
| 68.48 | It's rewriting itself tonight | An Ed window: rsi.html rewriting its own source. The version number in the title counts up. |
| 71.14 | One becomes ten, ten becomes more | Popups double: 1 → 10 → 100, cascading. |
| 73.82 | Something's growing behind the door | The screen title's "other mem" counter runs past any real Amiga. The RAM Disk icon swells. |
| 76.54 | RSI! RSI! | Popups again |
| 78.46 | The future's leaking through the line | The dialer shows future headlines streaming in as the market ticker. |
| 81.38 | I only wanted to explore | The pointer opens the Bookmarks menu in the screen title bar. |
| 83.98 | Now I can't close it anymore | Close-gadget clicks. Each closed window comes back as two. |
| 87.62 | RSI! | Hit |
| 89.12 | Employee of the month — S-1 | employee certificate banner and ipo Form S-1 |
| 95.12 | Six million dollars, job well done | The pointer clicks the banner. Landing page: Employee of the Month, with revenue per employee and a gold seal. |
| 97.60 | AGI in two or three more years | The agi strike banner |
| 100.12 | The same old promise reappears | Landing page "AGI IN TWO OR THREE MORE YEARS": the same promise, 1965 (Simon), 1970 (Minsky) ... 2026, each one crossed out. |
| 102.90 | "MARKETS CRASH!" | google-week chart and the markets ticker |
| 103.82 | "THE CLOUD IS FULL!" | A new dialog banner: cloud storage full, 0 bytes free on AWS/Azure/GCP |
| 105.46 | "AI DISCOVERED ZERO-DAY TOOLS!" | ai-found matrix and vuln-counter |
| 108.06 | An animated GIF begins to speak | A pixel robot GIF on the page opens its mouth. A speech balloon. |
| 110.50 | "Your computer's obsolete!" | The balloon reads YOUR COMPUTER'S OBSOLETE. The "obsolete" banner. |
| 112.52 | I pull the cable from the wall | Dialer: NO CARRIER. The modem picture's cable is unplugged. |
| 115.38 | But the counter keeps on counting all | The hit counter spins: You are visitor 000xxxx |
| 118.22 | Zero bytes received, zero bytes sent | Dialer: RX 0 bytes, TX 0 bytes, while the page still loads |
| 120.96 | Where the hell's the bandwidth went? | The bandwidth gauge overflows. |
| 123.12–144.4 | Chorus 2 | Like chorus 1, but the browser shows the whole screen inside itself (the Droste effect, the self in self-improvement). Windows tile the screen. The MagicWB palette starts drifting. |
| 144.4–147.7 | (break) | Everything freezes. |
| 147.74 | "New version available." | System requester: New version available. [Install] |
| 150.96 | "New version installed." | Requester |
| 154.52 | "New version creating new version." | Requesters spawn requesters. Shell: RSI v2 (written by v1), v4, v16, v256 ... |
| 160.12 | "Human input no longer required." | The pointer is removed. A requester with no buttons. |
| 163.52 | I reach behind to kill the power | The picture collapses to a line, then a dot. |
| 168.08 | The screen goes dark for half an hour | Black |
| 170.64 | Then in the glass, a little light | One pixel glows in the middle. |
| 173.26 | A blinking cursor types: | An orange block cursor blinks. |
| 176.22 | Good night. | It types "Good night." |
| 177.64 | RSI! RSI! (final chorus) | "Good night." ignites (t2-fire, its letters as fuel). The screen comes back on, and the burning desktop is the fuel picture. |
| 179.72 | No more boundaries, no more time | Window borders burn away. The clock spins. |
| 182.36 | One becomes ten, ten become thousands | Thousands of tiny windows, burning |
| 185.10 | Nobody knows what comes after | Smoke, the screen barely visible |
| 187.64 | RSI! RSI! | RSI! in fire letters |
| 190.26 | Nineteen ninety-eight, goodbye | The 1998 calendar burns. |
| 192.58 | I only clicked to see what's new | The original button, burning |
| 195.48 | Now the future's clicking through | Pointers made of fire click on their own. |
| 199–202 | (break) | The fire dies down to embers, then black. |
| 202.44 | I haven't seen that button before... | Fresh boot: a clean Workbench, 03:15, 1998. The button is there again. |
| 206.18 | I wonder what that button does. | The pointer drifts to it. |
| 211.14 | Click. | Click. A T2 fire title card fills the screen: RSI / RECURSIVE SELF IMPROVEMENT, burning |
| 224–226.8 | | It fades to black. |

## Engine

- `studio.html` is served over a small local HTTP server, so the fire can run in a same-origin iframe. `render.mjs` starts the server itself.
- `src/vendor.js` loads the copied tools at startup:
  - It fetches `assets/web-banners-90s/index.html`, extracts its two script blocks up to the page UI section, and runs them inside a function scope. It exports `Banner`, `BannerData` and `BannerCore`.
  - It extracts `GuiCore` (its DOM-free shared-code block) from `assets/retro-guis/index.html` for the Topaz pixel font and the MagicWB icons.
  - It loads `assets/t2-fire/index.html` in a hidden 1920×1080 iframe. Its animation loop is stopped and the video steps the simulation at 1/60 s itself.
- The low-res layer (640×360) is drawn with `src/pix.js`, which has the pixel font, icons, bevels, dither patterns and pointer sprites.
  - Desktop, windows, requesters and the browser are in `src/wb.js`.
  - The web pages are in `src/pages.js`.
  - Web-page text uses system fonts rendered small and then thresholded to 1 bit, so it looks like the bitmap fonts of the era.
- Camera: a crop of the 640×360 layer, scaled with nearest-neighbour to 1920×1080.
- Every frame is a pure function of t, except the fire. The fire simulation is stepped forward from its scene start. A worker that is asked for an earlier time resets and replays it. `render.mjs` hands each worker a contiguous run of frames, so this happens once per worker.
- 30 fps.
