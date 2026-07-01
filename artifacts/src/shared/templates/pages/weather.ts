import type { Template } from '../types'

// A delightful, fully self-contained weather page. The whole design reads as a
// sky: a bright-blue day at the top warming into dusk lower down. Everything is
// hand-rolled CSS/SVG — an animated sun-and-cloud hero icon, an hourly strip with
// an SVG temperature curve drawn behind it, a 7-day forecast with hi–lo range
// bars, and detail cards (wind compass, humidity, a UV gauge, a sunrise/sunset
// arc with a moving sun). Glassmorphism cards float over the sky gradient.
// Tabular numerals everywhere. No imagery, no libraries, instant render.

const CSS = `
:root {
  /* ---- sky palette (top → bottom) — the big tunable knobs ---- */
  --sky-1: #4aa3ff;   /* bright zenith blue */
  --sky-2: #79c0ff;   /* daytime blue */
  --sky-3: #a9d6ff;   /* hazy horizon */
  --sky-4: #ffd6a8;   /* warm dusk */
  --sky-5: #ff9e7d;   /* sunset glow */
  /* ---- accents ---- */
  --sun:   #ffd24a;
  --sun-2: #ffb238;
  --hot:   #ff7a59;   /* warm temps */
  --cool:  #58b6ff;   /* cool temps */
  --ink:   #15293f;   /* deep slate-blue text */
  --ink-2: #3a5573;
  --mut:   #5f7791;
  --glass: rgba(255,255,255,0.42);
  --glass-line: rgba(255,255,255,0.6);
  --glass-shadow: 0 18px 50px -22px rgba(23,55,94,0.5);
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}

body {
  color: var(--ink);
  background:
    radial-gradient(140% 90% at 78% -8%, rgba(255,255,255,0.55), transparent 46%),
    linear-gradient(178deg, var(--sky-1) 0%, var(--sky-2) 26%, var(--sky-3) 50%, var(--sky-4) 80%, var(--sky-5) 100%);
  background-attachment: fixed;
  -webkit-font-smoothing: antialiased;
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
.shell { max-width: 1080px; margin: 0 auto; padding: clamp(20px, 4vw, 44px) clamp(16px, 4vw, 36px) 80px; }

/* drifting clouds in the far background */
.skyfx { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.skyfx .cl { position: absolute; opacity: 0.5; filter: blur(0.4px); will-change: transform; }
.skyfx .c1 { top: 12%; left: -18%; animation: drift1 64s linear infinite; }
.skyfx .c2 { top: 34%; left: -26%; animation: drift2 92s linear infinite; opacity: 0.36; transform: scale(1.4); }
.skyfx .c3 { top: 6%;  left: -22%; animation: drift1 110s linear infinite; opacity: 0.28; transform: scale(0.8); }
@keyframes drift1 { to { transform: translateX(140vw); } }
@keyframes drift2 { to { transform: translateX(150vw) scale(1.4); } }
.shell { position: relative; z-index: 1; }

/* ---- top bar ---- */
.bar { display: flex; align-items: center; gap: 14px; }
.loc { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 15px; letter-spacing: -0.01em; color: var(--ink); }
.loc .pin { width: 22px; height: 22px; }
.bar .spacer { flex: 1; }
.unit { display: inline-flex; background: var(--glass); border: 1px solid var(--glass-line); border-radius: 999px; padding: 3px; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.unit button { border: 0; background: transparent; color: var(--ink-2); font: 600 13px var(--body); padding: 6px 15px; border-radius: 999px; cursor: pointer; transition: all 0.2s; }
.unit button.on { background: #fff; color: var(--ink); box-shadow: 0 3px 10px -4px rgba(23,55,94,0.5); }
.unit button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

/* ---- hero ---- */
.hero { display: grid; grid-template-columns: 1.1fr auto; align-items: center; gap: clamp(20px, 5vw, 60px); margin: clamp(22px, 5vw, 48px) 0 clamp(20px, 4vw, 38px); }
.hero .when { font-weight: 600; font-size: 13.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-2); }
.hero h1 { font-family: var(--display); font-weight: 400; font-size: clamp(34px, 6vw, 56px); line-height: 1; letter-spacing: -0.02em; margin: 8px 0 4px; }
.temp { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0 2px; }
.temp .big { font-family: var(--display); font-weight: 300; font-size: clamp(86px, 18vw, 168px); line-height: 0.82; letter-spacing: -0.04em; color: var(--ink); }
.temp .deg { font-family: var(--display); font-weight: 300; font-size: clamp(34px, 7vw, 64px); line-height: 1; color: var(--ink-2); margin-top: clamp(8px, 2vw, 16px); }
.cond { font-size: clamp(16px, 2.6vw, 22px); font-weight: 600; color: var(--ink); margin: 6px 0 14px; }
.hilo { display: flex; gap: 20px; flex-wrap: wrap; }
.hilo span { display: inline-flex; align-items: center; gap: 7px; font-size: 14.5px; font-weight: 600; color: var(--ink-2); }
.hilo i { font-style: normal; font-weight: 700; }
.hilo .hi i { color: var(--hot); } .hilo .lo i { color: var(--cool); }
.hilo .feels { color: var(--mut); font-weight: 500; }

/* animated hero weather icon */
.hicon { width: clamp(150px, 34vw, 230px); height: clamp(150px, 34vw, 230px); flex: none; filter: drop-shadow(0 22px 38px rgba(255,150,60,0.35)); }
.hicon .rays { transform-origin: 96px 92px; animation: spin 44s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.hicon .sun { transform-origin: 96px 92px; animation: pulse 5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.045); } }
.hicon .cloud { animation: bob 6.5s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateX(0); } 50% { transform: translateX(9px); } }
.hicon .cloud2 { animation: bob 9s ease-in-out infinite reverse; }

/* ---- glass card base ---- */
.card { background: var(--glass); border: 1px solid var(--glass-line); border-radius: 22px; padding: clamp(16px, 2.6vw, 22px); backdrop-filter: blur(16px) saturate(1.2); -webkit-backdrop-filter: blur(16px) saturate(1.2); box-shadow: var(--glass-shadow); }
.card h2 { font-size: 12.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 14px; display: flex; align-items: center; gap: 8px; }
.card h2 svg { opacity: 0.75; }

/* ---- hourly strip ---- */
.hourly { position: relative; margin-bottom: clamp(16px, 3vw, 22px); overflow: hidden; }
.hwrap { position: relative; }
.hcurve { position: absolute; inset: 38px 0 30px; width: 100%; height: calc(100% - 68px); pointer-events: none; z-index: 0; }
.hcurve .ln { fill: none; stroke: url(#hgrad); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1200; stroke-dashoffset: 1200; }
.reveal.in .hcurve .ln { animation: draw 1.7s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.hcurve .fill { fill: url(#hfill); opacity: 0; }
.reveal.in .hcurve .fill { animation: fadein 1s ease 0.6s forwards; }
@keyframes fadein { to { opacity: 1; } }
.hcurve .dot { fill: #fff; stroke: var(--sun-2); stroke-width: 2; opacity: 0; }
.reveal.in .hcurve .dot { animation: fadein 0.5s ease 1.2s forwards; }
.hrow { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(12, minmax(54px, 1fr)); }
.hcell { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 4px 0; }
.hcell .t { font-size: 12px; font-weight: 600; color: var(--ink-2); }
.hcell .ic { width: 26px; height: 26px; }
.hcell .d { font-size: 15px; font-weight: 700; color: var(--ink); margin-top: 42px; }
.hcell.now { position: relative; }
.hcell.now .t { color: var(--ink); font-weight: 700; } .hcell.now .d { color: var(--hot); }
.hcell.now::after { content: ''; position: absolute; left: 50%; top: 0; transform: translateX(-50%); width: 30px; height: 3px; border-radius: 3px; background: var(--hot); }

/* small reusable inline weather glyphs */
.g-sun circle { fill: var(--sun); } .g-sun line { stroke: var(--sun-2); stroke-width: 2.4; stroke-linecap: round; }
.g-cloud path { fill: #fff; } .g-cloud .sn { fill: var(--sun); }
.g-rain .drop { stroke: var(--cool); stroke-width: 2.4; stroke-linecap: round; }

/* ---- main two-column area ---- */
.main { display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(16px, 3vw, 22px); align-items: start; }

/* 7-day forecast */
.days { display: flex; flex-direction: column; gap: 2px; }
.day { display: grid; grid-template-columns: 56px 30px 1fr 38px 96px 32px; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid rgba(255,255,255,0.4); }
.day:last-child { border-bottom: 0; }
.day .dn { font-size: 14px; font-weight: 600; color: var(--ink); }
.day .di { width: 26px; height: 26px; }
.day .dc { font-size: 13px; color: var(--mut); font-weight: 500; }
.day .lo { text-align: right; font-size: 14px; font-weight: 600; color: var(--mut); }
.day .hi { font-size: 14px; font-weight: 700; color: var(--ink); }
.range { position: relative; height: 7px; border-radius: 999px; background: rgba(23,55,94,0.12); overflow: hidden; }
.range .seg { position: absolute; top: 0; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--cool), var(--sun), var(--hot)); width: 0; transition: width 1s cubic-bezier(0.22,1,0.36,1), left 1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .range .seg { left: var(--l); width: var(--w); }

/* detail cards grid */
.details { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(16px, 3vw, 22px); }
.metric .v { font-family: var(--display); font-weight: 400; font-size: clamp(28px, 4vw, 38px); letter-spacing: -0.02em; line-height: 1; }
.metric .u { font-size: 13px; color: var(--mut); font-weight: 500; margin-top: 6px; }

/* wind compass */
.compass { width: 96px; height: 96px; margin: 2px auto 0; display: block; }
.compass .ring { fill: rgba(255,255,255,0.3); stroke: rgba(23,55,94,0.16); stroke-width: 1.4; }
.compass .tick { stroke: rgba(23,55,94,0.3); stroke-width: 1.4; }
.compass .lab { fill: var(--ink-2); font: 700 9px var(--body); }
.compass .needle { fill: var(--hot); transform-origin: 48px 48px; transform: rotate(0deg); transition: transform 1.2s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .compass .needle { transform: rotate(var(--dir)); }
.compass .needle-b { fill: rgba(23,55,94,0.35); transform-origin: 48px 48px; transform: rotate(0deg); transition: transform 1.2s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .compass .needle-b { transform: rotate(var(--dir)); }
.wind-row { display: flex; align-items: center; gap: 16px; }
.wind-row .meta { flex: 1; }

/* humidity */
.hum-bar { height: 10px; border-radius: 999px; background: rgba(23,55,94,0.12); overflow: hidden; margin-top: 14px; }
.hum-bar > i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--cool), #7ed0ff); width: 0; transition: width 1.1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .hum-bar > i { width: var(--w); }
.hum-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--mut); margin-top: 8px; font-weight: 500; }

/* UV gauge */
.gauge { width: 130px; height: 80px; margin: 4px auto 0; display: block; }
.gauge .track { fill: none; stroke: rgba(23,55,94,0.12); stroke-width: 11; stroke-linecap: round; }
.gauge .val { fill: none; stroke: url(#uvgrad); stroke-width: 11; stroke-linecap: round; stroke-dasharray: 220; stroke-dashoffset: 220; }
.reveal.in .gauge .val { transition: stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1); stroke-dashoffset: var(--off); }
.gauge .needle { stroke: var(--ink); stroke-width: 2.6; stroke-linecap: round; transform-origin: 65px 64px; transform: rotate(-90deg); transition: transform 1.3s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .gauge .needle { transform: rotate(var(--ang)); }
.gauge-cap { text-align: center; font-size: 13px; font-weight: 600; color: var(--ink); margin-top: 2px; }
.gauge-cap b { font-family: var(--display); font-weight: 400; font-size: 22px; }

/* sun arc */
.sunarc { position: relative; }
.arc-svg { width: 100%; height: 118px; display: block; overflow: visible; }
.arc-svg .horizon { stroke: rgba(23,55,94,0.18); stroke-width: 1.4; stroke-dasharray: 3 4; }
.arc-svg .path-bg { fill: none; stroke: rgba(23,55,94,0.16); stroke-width: 2; stroke-dasharray: 3 5; }
.arc-svg .path-done { fill: none; stroke: url(#arcgrad); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 330; stroke-dashoffset: 330; }
.reveal.in .arc-svg .path-done { transition: stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1); stroke-dashoffset: var(--arc-off); }
.arc-svg .sun-pos { fill: var(--sun); filter: drop-shadow(0 0 8px rgba(255,200,60,0.8)); opacity: 0; }
.reveal.in .arc-svg .sun-pos { animation: fadein 0.6s ease 1.4s forwards; }
.sun-times { display: flex; justify-content: space-between; margin-top: 6px; }
.sun-times div { font-size: 13px; }
.sun-times .lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mut); }
.sun-times .tm { font-weight: 700; color: var(--ink); font-size: 15px; }

.foot { text-align: center; color: var(--ink-2); font-size: 12.5px; margin-top: 30px; opacity: 0.8; }

/* ---- reveal defaults ---- */
.reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1); }
.reveal.in { opacity: 1; transform: none; }

@media (max-width: 820px) {
  .main { grid-template-columns: 1fr; }
  .hero { grid-template-columns: 1fr; }
  .hicon { order: -1; margin: 0 auto; }
  .hero .htext { text-align: center; }
  .hilo { justify-content: center; }
  .hourly { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .hrow { min-width: 600px; }
  .hcurve { min-width: 600px; }
}
@media (max-width: 560px) {
  .bar { flex-wrap: wrap; }
  .day { grid-template-columns: 48px 24px 1fr 70px 30px; gap: 9px; }
  .day .dc { display: none; }
  .details { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .hicon .rays, .hicon .sun, .hicon .cloud, .hicon .cloud2,
  .skyfx .cl { animation: none !important; }
}
`.trim()

// reusable inline SVG glyphs (kept as JS strings, concatenated below)
const G_SUN =
  '<svg class="ic g-sun" viewBox="0 0 28 28"><circle cx="14" cy="14" r="6.4"/><g><line x1="14" y1="2" x2="14" y2="5"/><line x1="14" y1="23" x2="14" y2="26"/><line x1="2" y1="14" x2="5" y2="14"/><line x1="23" y1="14" x2="26" y2="14"/><line x1="5.5" y1="5.5" x2="7.6" y2="7.6"/><line x1="20.4" y1="20.4" x2="22.5" y2="22.5"/><line x1="22.5" y1="5.5" x2="20.4" y2="7.6"/><line x1="7.6" y1="20.4" x2="5.5" y2="22.5"/></g></svg>'
const G_PART =
  '<svg class="ic g-cloud" viewBox="0 0 28 28"><circle class="sn" cx="10" cy="10" r="5.2" style="fill:var(--sun)"/><g style="stroke:var(--sun-2);stroke-width:1.8;stroke-linecap:round"><line x1="10" y1="1.5" x2="10" y2="3.4"/><line x1="2.6" y1="4.6" x2="3.9" y2="5.9"/><line x1="1" y1="10" x2="2.9" y2="10"/></g><path d="M9 22h11a4.2 4.2 0 0 0 .3-8.38A6 6 0 0 0 9 14.5 4 4 0 0 0 9 22Z"/></svg>'
const G_CLOUD =
  '<svg class="ic g-cloud" viewBox="0 0 28 28"><path d="M8 22h13a4.6 4.6 0 0 0 .3-9.2A6.6 6.6 0 0 0 8 14a4.4 4.4 0 0 0 0 8Z"/></svg>'
const G_RAIN =
  '<svg class="ic g-cloud g-rain" viewBox="0 0 28 28"><path d="M8 17h13a4.6 4.6 0 0 0 .3-9.2A6.6 6.6 0 0 0 8 9a4.4 4.4 0 0 0 0 8Z"/><g class="r"><line class="drop" x1="9" y1="20" x2="7.5" y2="24"/><line class="drop" x1="14" y1="20" x2="12.5" y2="24"/><line class="drop" x1="19" y1="20" x2="17.5" y2="24"/></g></svg>'

const HTML =
  '<div class="skyfx" aria-hidden="true">' +
  '<svg class="cl c1" width="220" height="84" viewBox="0 0 220 84"><path fill="rgba(255,255,255,0.9)" d="M40 70h130a30 30 0 0 0 2-59.8A42 42 0 0 0 96 16 27 27 0 0 0 56 36 26 26 0 0 0 40 70Z"/></svg>' +
  '<svg class="cl c2" width="260" height="96" viewBox="0 0 260 96"><path fill="rgba(255,255,255,0.9)" d="M46 80h150a34 34 0 0 0 2-68A48 48 0 0 0 110 18 31 31 0 0 0 64 41 30 30 0 0 0 46 80Z"/></svg>' +
  '<svg class="cl c3" width="180" height="70" viewBox="0 0 180 70"><path fill="rgba(255,255,255,0.9)" d="M34 58h108a25 25 0 0 0 1.6-49.8A35 35 0 0 0 80 13 22 22 0 0 0 47 30 21 21 0 0 0 34 58Z"/></svg>' +
  '</div>' +
  '<div class="shell">' +
  '<div class="bar reveal" data-reveal="none">' +
  '<div class="loc"><svg class="pin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" fill="#ffffff" stroke="var(--ink-2)" stroke-width="1.6"/><circle cx="12" cy="10" r="2.4" fill="var(--hot)"/></svg> San Francisco, CA</div>' +
  '<span class="spacer"></span>' +
  '<div class="unit" role="group" aria-label="Temperature units"><button class="on" data-u="f">&deg;F</button><button data-u="c">&deg;C</button></div>' +
  '</div>' +
  '<div class="hero reveal">' +
  '<div class="htext">' +
  '<div class="when">Now &middot; Monday, 2:40 PM</div>' +
  '<h1>Clear skies, easy afternoon</h1>' +
  '<div class="temp"><span class="big num" data-f="72" data-c="22">72</span><span class="deg">&deg;</span></div>' +
  '<div class="cond">Partly Cloudy</div>' +
  '<div class="hilo">' +
  '<span class="hi">High <i class="num" data-f="75" data-c="24">75&deg;</i></span>' +
  '<span class="lo">Low <i class="num" data-f="58" data-c="14">58&deg;</i></span>' +
  '<span class="feels">Feels like <b class="num" data-f="74" data-c="23">74&deg;</b></span>' +
  '</div>' +
  '</div>' +
  // animated sun + cloud hero icon
  '<svg class="hicon" viewBox="0 0 192 184" aria-label="Partly cloudy" role="img">' +
  '<g class="rays" stroke="var(--sun-2)" stroke-width="6" stroke-linecap="round">' +
  '<line x1="96" y1="14" x2="96" y2="36"/><line x1="96" y1="148" x2="96" y2="170"/>' +
  '<line x1="18" y1="92" x2="40" y2="92"/><line x1="152" y1="92" x2="174" y2="92"/>' +
  '<line x1="41" y1="37" x2="57" y2="53"/><line x1="135" y1="131" x2="151" y2="147"/>' +
  '<line x1="151" y1="37" x2="135" y2="53"/><line x1="57" y1="131" x2="41" y2="147"/>' +
  '</g>' +
  '<circle class="sun" cx="96" cy="92" r="40" fill="url(#sungrad)"/>' +
  '<path class="cloud2" d="M58 150h88a26 26 0 0 0 1.6-51.8A36 36 0 0 0 78 104 24 24 0 0 0 58 150Z" fill="rgba(255,255,255,0.78)"/>' +
  '<path class="cloud" d="M52 158h96a28 28 0 0 0 1.8-55.8A39 39 0 0 0 76 112 26 26 0 0 0 52 158Z" fill="#ffffff"/>' +
  '<defs><radialGradient id="sungrad" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#ffe27a"/><stop offset="0.6" stop-color="var(--sun)"/><stop offset="1" stop-color="var(--sun-2)"/></radialGradient></defs>' +
  '</svg>' +
  '</div>' +
  // hourly strip with temperature curve behind it
  '<div class="card hourly reveal">' +
  '<h2><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2" stroke="var(--ink-2)" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="3.4" stroke="var(--ink-2)" stroke-width="1.6"/></svg> Next 12 hours</h2>' +
  '<div class="hwrap">' +
  '<svg class="hcurve" viewBox="0 0 1140 120" preserveAspectRatio="none" aria-hidden="true">' +
  '<defs>' +
  '<linearGradient id="hgrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--cool)"/><stop offset="0.5" stop-color="var(--sun)"/><stop offset="1" stop-color="var(--hot)"/></linearGradient>' +
  '<linearGradient id="hfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sun)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--sun)" stop-opacity="0"/></linearGradient>' +
  '</defs>' +
  // curve points map to the 12 temps below (lower y = warmer)
  '<path class="fill" d="M47,46 L142,40 L237,34 L332,30 L427,36 L522,48 L617,58 L712,70 L807,78 L902,84 L997,92 L1092,98 L1092,120 L47,120 Z"/>' +
  '<polyline class="ln" points="47,46 142,40 237,34 332,30 427,36 522,48 617,58 712,70 807,78 902,84 997,92 1092,98"/>' +
  '<g><circle class="dot" cx="47" cy="46" r="4"/><circle class="dot" cx="142" cy="40" r="4"/><circle class="dot" cx="237" cy="34" r="4"/><circle class="dot" cx="332" cy="30" r="4"/><circle class="dot" cx="427" cy="36" r="4"/><circle class="dot" cx="522" cy="48" r="4"/><circle class="dot" cx="617" cy="58" r="4"/><circle class="dot" cx="712" cy="70" r="4"/><circle class="dot" cx="807" cy="78" r="4"/><circle class="dot" cx="902" cy="84" r="4"/><circle class="dot" cx="997" cy="92" r="4"/><circle class="dot" cx="1092" cy="98" r="4"/></g>' +
  '</svg>' +
  '<div class="hrow">' +
  '<div class="hcell now"><span class="t">Now</span>' +
  G_PART +
  '<span class="d num" data-f="72" data-c="22">72&deg;</span></div>' +
  '<div class="hcell"><span class="t">3 PM</span>' +
  G_SUN +
  '<span class="d num" data-f="73" data-c="23">73&deg;</span></div>' +
  '<div class="hcell"><span class="t">4 PM</span>' +
  G_SUN +
  '<span class="d num" data-f="74" data-c="23">74&deg;</span></div>' +
  '<div class="hcell"><span class="t">5 PM</span>' +
  G_SUN +
  '<span class="d num" data-f="75" data-c="24">75&deg;</span></div>' +
  '<div class="hcell"><span class="t">6 PM</span>' +
  G_PART +
  '<span class="d num" data-f="73" data-c="23">73&deg;</span></div>' +
  '<div class="hcell"><span class="t">7 PM</span>' +
  G_PART +
  '<span class="d num" data-f="70" data-c="21">70&deg;</span></div>' +
  '<div class="hcell"><span class="t">8 PM</span>' +
  G_CLOUD +
  '<span class="d num" data-f="67" data-c="19">67&deg;</span></div>' +
  '<div class="hcell"><span class="t">9 PM</span>' +
  G_CLOUD +
  '<span class="d num" data-f="64" data-c="18">64&deg;</span></div>' +
  '<div class="hcell"><span class="t">10 PM</span>' +
  G_CLOUD +
  '<span class="d num" data-f="62" data-c="17">62&deg;</span></div>' +
  '<div class="hcell"><span class="t">11 PM</span>' +
  G_RAIN +
  '<span class="d num" data-f="61" data-c="16">61&deg;</span></div>' +
  '<div class="hcell"><span class="t">12 AM</span>' +
  G_RAIN +
  '<span class="d num" data-f="60" data-c="16">60&deg;</span></div>' +
  '<div class="hcell"><span class="t">1 AM</span>' +
  G_RAIN +
  '<span class="d num" data-f="59" data-c="15">59&deg;</span></div>' +
  '</div>' +
  '</div>' +
  '</div>' +
  '<div class="main">' +
  // 7-day forecast
  '<div class="card reveal">' +
  '<h2><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="var(--ink-2)" stroke-width="1.6"/><path d="M3.5 9h17M8 3v3M16 3v3" stroke="var(--ink-2)" stroke-width="1.6" stroke-linecap="round"/></svg> 7-day forecast</h2>' +
  '<div class="days">' +
  // each .range seg: --l left% (lo position over 40-80F scale), --w width%
  '<div class="day"><span class="dn">Today</span><span class="di">' +
  G_PART +
  '</span><span class="dc">Partly Cloudy</span><span class="lo num">58&deg;</span><div class="range"><i class="seg" style="--l:45%;--w:42%"></i></div><span class="hi num">75&deg;</span></div>' +
  '<div class="day"><span class="dn">Tue</span><span class="di">' +
  G_SUN +
  '</span><span class="dc">Sunny</span><span class="lo num">60&deg;</span><div class="range"><i class="seg" style="--l:50%;--w:43%"></i></div><span class="hi num">78&deg;</span></div>' +
  '<div class="day"><span class="dn">Wed</span><span class="di">' +
  G_SUN +
  '</span><span class="dc">Sunny</span><span class="lo num">61&deg;</span><div class="range"><i class="seg" style="--l:52%;--w:45%"></i></div><span class="hi num">81&deg;</span></div>' +
  '<div class="day"><span class="dn">Thu</span><span class="di">' +
  G_PART +
  '</span><span class="dc">Partly Cloudy</span><span class="lo num">59&deg;</span><div class="range"><i class="seg" style="--l:47%;--w:40%"></i></div><span class="hi num">76&deg;</span></div>' +
  '<div class="day"><span class="dn">Fri</span><span class="di">' +
  G_CLOUD +
  '</span><span class="dc">Cloudy</span><span class="lo num">55&deg;</span><div class="range"><i class="seg" style="--l:38%;--w:34%"></i></div><span class="hi num">69&deg;</span></div>' +
  '<div class="day"><span class="dn">Sat</span><span class="di">' +
  G_RAIN +
  '</span><span class="dc">Showers</span><span class="lo num">52&deg;</span><div class="range"><i class="seg" style="--l:30%;--w:32%"></i></div><span class="hi num">64&deg;</span></div>' +
  '<div class="day"><span class="dn">Sun</span><span class="di">' +
  G_PART +
  '</span><span class="dc">Clearing</span><span class="lo num">54&deg;</span><div class="range"><i class="seg" style="--l:35%;--w:38%"></i></div><span class="hi num">71&deg;</span></div>' +
  '</div>' +
  '</div>' +
  // detail cards
  '<div class="details">' +
  // wind + compass
  '<div class="card metric reveal" data-reveal="scale">' +
  '<h2>Wind</h2>' +
  '<div class="wind-row">' +
  '<svg class="compass" viewBox="0 0 96 96" aria-label="Wind from the west-northwest">' +
  '<circle class="ring" cx="48" cy="48" r="42"/>' +
  '<g class="tick"><line x1="48" y1="8" x2="48" y2="14"/><line x1="48" y1="82" x2="48" y2="88"/><line x1="8" y1="48" x2="14" y2="48"/><line x1="82" y1="48" x2="88" y2="48"/></g>' +
  '<text class="lab" x="48" y="22" text-anchor="middle">N</text>' +
  '<text class="lab" x="48" y="79" text-anchor="middle">S</text>' +
  '<text class="lab" x="80" y="51" text-anchor="middle">E</text>' +
  '<text class="lab" x="16" y="51" text-anchor="middle">W</text>' +
  // needle points where the wind is coming FROM (WNW ~ 292deg)
  '<g class="needle" style="--dir:292deg"><path d="M48 16 L43 48 L48 44 L53 48 Z"/></g>' +
  '<g class="needle-b" style="--dir:292deg"><path d="M48 80 L43 48 L48 52 L53 48 Z"/></g>' +
  '<circle cx="48" cy="48" r="3.4" fill="var(--ink)"/>' +
  '</svg>' +
  '<div class="meta"><div class="v num">9<span style="font-size:0.5em;color:var(--mut)"> mph</span></div><div class="u">From WNW &middot; gusts 16 mph</div></div>' +
  '</div>' +
  '</div>' +
  // humidity
  '<div class="card metric reveal" data-reveal="scale">' +
  '<h2>Humidity</h2>' +
  '<div class="v num">61<span style="font-size:0.5em;color:var(--mut)">%</span></div>' +
  '<div class="hum-bar"><i style="--w:61%"></i></div>' +
  '<div class="hum-row"><span>Dew point 57&deg;</span><span>Comfortable</span></div>' +
  '</div>' +
  // UV index gauge
  '<div class="card reveal" data-reveal="scale">' +
  '<h2>UV Index</h2>' +
  '<svg class="gauge" viewBox="0 0 130 80" aria-label="UV index 6, high">' +
  '<defs><linearGradient id="uvgrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#58b6ff"/><stop offset="0.4" stop-color="#7ed957"/><stop offset="0.65" stop-color="var(--sun)"/><stop offset="1" stop-color="var(--hot)"/></linearGradient></defs>' +
  // semicircle from 180deg to 0deg, r=55, centre (65,64), len ~= 173
  '<path class="track" d="M10 64 A55 55 0 0 1 120 64"/>' +
  // value arc — dashoffset set so ~6/11 of the arc shows (off ~ 95)
  '<path class="val" d="M10 64 A55 55 0 0 1 120 64" style="--off:96"/>' +
  '<line class="needle" x1="65" y1="64" x2="65" y2="22" style="--ang:8deg"/>' +
  '<circle cx="65" cy="64" r="4" fill="var(--ink)"/>' +
  '</svg>' +
  '<div class="gauge-cap"><b class="num">6</b> &middot; High</div>' +
  '</div>' +
  // sunrise / sunset arc
  '<div class="card sunarc reveal" data-reveal="scale">' +
  '<h2>Sun</h2>' +
  '<svg class="arc-svg" viewBox="0 0 240 120" aria-label="Sunrise 6:14 AM, sunset 8:31 PM">' +
  '<defs><linearGradient id="arcgrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--sun-2)"/><stop offset="1" stop-color="var(--hot)"/></linearGradient></defs>' +
  '<line class="horizon" x1="8" y1="100" x2="232" y2="100"/>' +
  '<path class="path-bg" d="M16 100 A104 104 0 0 1 224 100"/>' +
  // sun ~62% across the day → progress; dashoffset ~ 330*(1-0.62)=125
  '<path class="path-done" d="M16 100 A104 104 0 0 1 224 100" style="--arc-off:126"/>' +
  // sun position at ~62% along the arc
  '<circle class="sun-pos" cx="171" cy="32" r="9"/>' +
  '</svg>' +
  '<div class="sun-times"><div><div class="lab">Sunrise</div><div class="tm num">6:14 AM</div></div><div style="text-align:right"><div class="lab">Sunset</div><div class="tm num">8:31 PM</div></div></div>' +
  '</div>' +
  '</div>' +
  '</div>' +
  '<div class="foot">Updated just now &middot; Forecast is illustrative sample data. Tap &deg;F / &deg;C to switch units.</div>' +
  '</div>'

const JS =
  '(function () {' +
  '  var unit = "f";' +
  '  function toC(f) { return Math.round((f - 32) * 5 / 9); }' +
  '  function render() {' +
  '    var nodes = document.querySelectorAll("[data-f]");' +
  '    for (var i = 0; i < nodes.length; i++) {' +
  '      var el = nodes[i];' +
  '      var f = parseInt(el.getAttribute("data-f"), 10);' +
  '      var raw = el.textContent || "";' +
  '      var hasDeg = raw.indexOf("\\u00B0") !== -1;' +
  '      var v = unit === "f" ? f : toC(f);' +
  '      el.textContent = hasDeg ? (v + "\\u00B0") : ("" + v);' +
  '    }' +
  '  }' +
  '  var btns = document.querySelectorAll(".unit button");' +
  '  for (var j = 0; j < btns.length; j++) {' +
  '    btns[j].addEventListener("click", function (e) {' +
  '      var b = e.currentTarget;' +
  '      unit = b.getAttribute("data-u");' +
  '      for (var k = 0; k < btns.length; k++) { btns[k].classList.remove("on"); }' +
  '      b.classList.add("on");' +
  '      render();' +
  '    });' +
  '  }' +
  '})();'

export const weather: Template = {
  id: 'weather',
  kind: 'page',
  name: 'Weather',
  tagline: 'A delightful weather page with animated sky',
  categories: ['Dashboards'],
  audiences: ['personal', 'utility', 'design'],
  description:
    'A delightful, fully self-contained weather page whose whole design reads as a sky — a bright-blue day at the top warming into dusk below. A hero shows the city, a huge tabular temperature, an animated pure-SVG sun-and-cloud icon, and hi/lo/feels-like; an hourly strip draws a temperature curve behind the next 12 hours; a 7-day list uses hi–lo range bars; and glassmorphism detail cards cover wind (with a compass), humidity, a UV gauge, and a sunrise/sunset arc. A °F/°C toggle recomputes every figure live. No images, no libraries — pure CSS/SVG, instant.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#79c0ff',
  notes:
    'The sky is the soul of this template. Recolor the whole mood by editing the `--sky-1..--sky-5` gradient stops in :root (top → bottom): cool blues for a clear day, grey for overcast, deep indigo→violet for night. Warm accents (`--sun`, `--sun-2`, `--hot`) and the cool accent (`--cool`) drive every glyph, the hourly curve gradient (#hgrad), the UV gauge (#uvgrad), and the sun arc.\n\nTo change the CURRENT CONDITIONS edit the `.hero`: city in `.loc`, headline `<h1>`, condition `.cond`, and the temps in `.temp`/`.hilo` — figures carry both `data-f` and `data-c` so the °F/°C toggle stays correct (keep them in sync). Swap the animated hero icon by replacing the sun/cloud `<svg class="hicon">` or removing the `.cloud` paths for a pure sun.\n\nHOURLY: each `.hcell` is one hour (time, a glyph G_SUN/G_PART/G_CLOUD/G_RAIN, and a temp). The curve behind it is a separate `<polyline class="ln">` plus matching `.fill` and `.dot` circles in `.hcurve` — keep their x positions evenly spaced across the 1140-wide viewBox and set y lower (≈30) for warm, higher (≈100) for cool. 7-DAY: each `.range .seg` uses `--l` (left %) and `--w` (width %) to place the hi–lo bar on a shared temperature scale. DETAIL CARDS: wind needle `--dir` (deg the wind comes FROM), humidity `--w`, UV gauge `--off` (stroke-dashoffset; smaller = higher) + needle `--ang`, and the sun arc `--arc-off` + the `.sun-pos` circle cx/cy for the sun’s position along the day. All motion honors prefers-reduced-motion.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#79c0ff',
  },
}
