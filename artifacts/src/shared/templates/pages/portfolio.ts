import type { Template } from '../types'

// A gallery-grade design portfolio. Off-black canvas, oversized kinetic Clash
// Display type, a sticky minimal top bar, and an ASYMMETRIC project grid where
// every tile is its OWN generative artwork — pure CSS/SVG gradient meshes,
// layered blobs, and geometric compositions, all different. Hover zooms the art
// and slides up a caption row. About strip + stat row, a client logos marquee,
// and an oversized email CTA footer. Self-contained: no photo assets, the art is
// all code.

const CSS = `
:root {
  --bg: #0b0b0d;
  --bg-2: #101013;
  --ink: #f3f1ec;
  --mut: #9a978f;
  --faint: #5f5d58;
  --line: rgba(243,241,236,0.10);
  --line-2: rgba(243,241,236,0.06);
  /* signature vivid art palette — recolor everything from these */
  --a1: #ff5f3d;   /* coral   */
  --a2: #ffd23f;   /* amber   */
  --a3: #7c5cff;   /* violet  */
  --a4: #2de2c5;   /* mint    */
  --a5: #ff5fa2;   /* magenta */
  --a6: #4ea3ff;   /* azure   */
  --accent: var(--a1);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --max: 1240px;
}
body {
  background:
    radial-gradient(1100px 620px at 82% -8%, rgba(124,92,255,0.12), transparent 62%),
    radial-gradient(900px 560px at 4% 8%, rgba(255,95,61,0.08), transparent 60%),
    var(--bg);
  color: var(--ink);
  overflow-x: hidden;
}
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: var(--max); margin: 0 auto; padding: 0 clamp(18px, 4vw, 40px); }
a { color: inherit; text-decoration: none; }
:focus-visible { outline: 2px solid var(--a2); outline-offset: 3px; border-radius: 4px; }

/* ===== sticky top bar ===== */
.bar {
  position: sticky; top: 0; z-index: 60;
  backdrop-filter: blur(14px) saturate(1.3);
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  border-bottom: 1px solid var(--line-2);
}
.bar .row {
  max-width: var(--max); margin: 0 auto;
  padding: clamp(13px, 1.6vw, 17px) clamp(18px, 4vw, 40px);
  display: flex; align-items: center; gap: 18px;
}
.mark { display: inline-flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 600; font-size: 17px; letter-spacing: -0.01em; }
.mark .glyph {
  width: 26px; height: 26px; border-radius: 8px; flex: none; position: relative; overflow: hidden;
  background: conic-gradient(from 150deg, var(--a1), var(--a3), var(--a4), var(--a2), var(--a1));
  box-shadow: 0 4px 16px -4px var(--a3), inset 0 0 8px rgba(255,255,255,0.32);
}
.mark .glyph::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--bg); }
.bar .spacer { flex: 1; }
.nav { display: flex; align-items: center; gap: 26px; }
.nav a { color: var(--mut); font-size: 14px; font-weight: 500; transition: color .2s ease; }
.nav a:hover { color: var(--ink); }
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 600; color: var(--bg);
  background: var(--ink); border: 0; border-radius: 999px;
  padding: 9px 17px; cursor: pointer;
  transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px -10px rgba(243,241,236,0.5); }
.btn .arr { transition: transform .25s ease; }
.btn:hover .arr { transform: translate(3px,-3px); }

/* ===== hero ===== */
.hero { padding: clamp(56px, 11vw, 132px) 0 clamp(40px, 6vw, 70px); }
.pill {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.02em; color: var(--mut);
  background: var(--bg-2); border: 1px solid var(--line); border-radius: 999px;
  padding: 7px 14px 7px 11px;
}
.pill .live { width: 8px; height: 8px; border-radius: 50%; background: var(--a4); box-shadow: 0 0 0 0 rgba(45,226,197,0.6); animation: ping 2.4s infinite; }
@keyframes ping { 0%{box-shadow:0 0 0 0 rgba(45,226,197,0.5)} 70%{box-shadow:0 0 0 8px rgba(45,226,197,0)} 100%{box-shadow:0 0 0 0 rgba(45,226,197,0)} }
.hero h1 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(56px, 13vw, 188px); line-height: 0.88; letter-spacing: -0.035em;
  margin: clamp(20px,3vw,30px) 0 0; text-wrap: balance;
}
.hero h1 em {
  font-style: italic; font-weight: 500;
  background: linear-gradient(96deg, var(--a1), var(--a5) 42%, var(--a3) 78%, var(--a6));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
/* kinetic word-by-word rise */
.hero h1 .w { display: inline-block; transform: translateY(112%); opacity: 0; }
.reveal.in .hero h1 .w, .hero.in h1 .w { animation: rise .9s cubic-bezier(.16,1,.3,1) forwards; }
.hero h1 .w:nth-child(2) { animation-delay: .07s; }
.hero h1 .w:nth-child(3) { animation-delay: .14s; }
@keyframes rise { to { transform: translateY(0); opacity: 1; } }
.hero .lede {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: 22px; margin-top: clamp(26px, 4vw, 42px);
}
.hero .lede p { max-width: 38ch; color: var(--mut); font-size: clamp(15px,1.6vw,18px); line-height: 1.55; margin: 0; }
.hero .lede p b { color: var(--ink); font-weight: 600; }
.scrollcue { display: inline-flex; align-items: center; gap: 10px; color: var(--faint); font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
.scrollcue .ln { width: 46px; height: 1px; background: linear-gradient(90deg, var(--faint), transparent); }

/* ===== project grid (asymmetric) ===== */
.work { padding: clamp(26px,4vw,46px) 0 clamp(48px,7vw,90px); }
.work-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: clamp(20px,3vw,32px); }
.work-head h2 { font-family: var(--display); font-weight: 600; font-size: clamp(22px,3vw,30px); letter-spacing: -0.02em; margin: 0; }
.work-head .count { color: var(--faint); font-size: 13px; font-weight: 600; letter-spacing: 0.04em; }

.grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 168px;
  gap: clamp(12px, 1.4vw, 18px);
}
/* tile spans — varied sizes for an asymmetric, gallery rhythm */
.t-a { grid-column: span 4; grid-row: span 3; }
.t-b { grid-column: span 2; grid-row: span 2; }
.t-c { grid-column: span 2; grid-row: span 2; }
.t-d { grid-column: span 3; grid-row: span 2; }
.t-e { grid-column: span 3; grid-row: span 2; }
.t-f { grid-column: span 2; grid-row: span 3; }
.t-g { grid-column: span 4; grid-row: span 3; }

.tile {
  position: relative; overflow: hidden; border-radius: 18px;
  background: var(--bg-2); border: 1px solid var(--line);
  display: block; cursor: pointer; isolation: isolate;
  transition: transform .5s cubic-bezier(.22,1,.36,1), border-color .4s ease, box-shadow .5s ease;
}
.tile:hover { transform: translateY(-4px); border-color: rgba(243,241,236,0.2); box-shadow: 0 24px 60px -28px rgba(0,0,0,0.8); }
.art { position: absolute; inset: 0; transition: transform .8s cubic-bezier(.22,1,.36,1), filter .5s ease; }
.tile:hover .art { transform: scale(1.08); }
.art svg { display: block; width: 100%; height: 100%; }
/* soft grain/vignette over each artwork so it sits in the gallery */
.tile::after {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(120% 120% at 50% 0%, transparent 52%, rgba(0,0,0,0.42) 100%);
  mix-blend-mode: multiply;
}

/* persistent label (top) */
.tlabel { position: absolute; top: 16px; left: 17px; right: 17px; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.tlabel .disc {
  font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink); background: rgba(11,11,13,0.45); backdrop-filter: blur(6px);
  border: 1px solid rgba(243,241,236,0.14); border-radius: 999px; padding: 5px 11px;
}
.tlabel .no { font-family: var(--display); font-weight: 600; font-size: 13px; color: rgba(243,241,236,0.62); font-variant-numeric: tabular-nums; }

/* caption row slides up on hover */
.cap {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3;
  padding: clamp(14px,1.6vw,20px) clamp(15px,1.8vw,22px);
  display: flex; align-items: flex-end; justify-content: space-between; gap: 14px;
  background: linear-gradient(0deg, rgba(11,11,13,0.92), rgba(11,11,13,0.62) 55%, transparent);
  transform: translateY(38%); opacity: 0; transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .4s ease;
}
.tile:hover .cap, .tile:focus-visible .cap { transform: translateY(0); opacity: 1; }
.cap h3 { font-family: var(--display); font-weight: 600; font-size: clamp(18px,2.1vw,26px); letter-spacing: -0.015em; margin: 0 0 3px; line-height: 1.04; }
.cap .meta { color: var(--mut); font-size: 12.5px; }
.cap .view { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; }
.cap .view .arr { transition: transform .3s ease; }
.tile:hover .cap .view .arr { transform: translateX(4px); }
/* always-visible title for the big hero tile (no hover on touch) */
.tile .standing { position: absolute; left: clamp(16px,2vw,26px); bottom: clamp(16px,2vw,26px); right: clamp(16px,2vw,26px); z-index: 2; transition: opacity .4s ease; }
.tile:hover .standing { opacity: 0; }
.tile .standing h3 { font-family: var(--display); font-weight: 600; font-size: clamp(22px,3vw,38px); letter-spacing: -0.02em; margin: 0; line-height: 1; }
.tile .standing span { color: var(--mut); font-size: 13px; }

/* ===== about strip ===== */
.about { padding: clamp(48px,7vw,96px) 0; border-top: 1px solid var(--line-2); }
.about .inner { display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(28px,5vw,72px); align-items: center; }
.about .kick { font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--a1); margin: 0 0 18px; }
.about h2 { font-family: var(--display); font-weight: 600; font-size: clamp(26px,4vw,46px); line-height: 1.04; letter-spacing: -0.025em; margin: 0 0 18px; text-wrap: balance; }
.about p { color: var(--mut); font-size: clamp(15px,1.6vw,17px); line-height: 1.65; margin: 0 0 14px; max-width: 50ch; }
.about p b { color: var(--ink); font-weight: 600; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.stat { background: var(--bg-2); border: 1px solid var(--line); border-radius: 16px; padding: clamp(18px,2.4vw,26px); position: relative; overflow: hidden; }
.stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(34px,5vw,52px); letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; background: linear-gradient(120deg, var(--ink), var(--mut)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.stat .k { color: var(--mut); font-size: 12.5px; font-weight: 500; margin-top: 9px; }
.stat::before { content: ''; position: absolute; right: -30px; top: -30px; width: 90px; height: 90px; border-radius: 50%; background: var(--g); opacity: 0.16; filter: blur(8px); }
.stat:nth-child(1) { --g: radial-gradient(circle, var(--a1), transparent 70%); }
.stat:nth-child(2) { --g: radial-gradient(circle, var(--a3), transparent 70%); }
.stat:nth-child(3) { --g: radial-gradient(circle, var(--a4), transparent 70%); }

/* ===== clients marquee ===== */
.clients { padding: clamp(30px,4vw,46px) 0; border-top: 1px solid var(--line-2); }
.clients .lbl { color: var(--faint); font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; text-align: center; margin-bottom: 22px; }
.marquee { position: relative; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 11%, #000 89%, transparent); mask-image: linear-gradient(90deg, transparent, #000 11%, #000 89%, transparent); }
.track { display: flex; gap: clamp(40px,6vw,84px); width: max-content; animation: slide 32s linear infinite; }
.marquee:hover .track { animation-play-state: paused; }
@keyframes slide { to { transform: translateX(-50%); } }
.logo { display: inline-flex; align-items: center; gap: 11px; color: var(--mut); font-family: var(--display); font-weight: 600; font-size: clamp(18px,2.2vw,24px); letter-spacing: -0.01em; opacity: 0.7; transition: opacity .3s ease, color .3s ease; }
.logo:hover { opacity: 1; color: var(--ink); }
.logo .m { width: 16px; height: 16px; flex: none; }

/* ===== contact footer ===== */
.contact { padding: clamp(60px,10vw,128px) 0 clamp(40px,6vw,64px); border-top: 1px solid var(--line-2); position: relative; overflow: hidden; }
.contact .aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; background: radial-gradient(800px 360px at 50% 120%, rgba(124,92,255,0.18), transparent 70%); }
.contact .inner { position: relative; z-index: 1; }
.contact .kick { font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--a4); margin: 0 0 clamp(18px,3vw,26px); }
.maillink { display: block; font-family: var(--display); font-weight: 600; font-size: clamp(34px,9vw,118px); line-height: 0.95; letter-spacing: -0.03em; color: var(--ink); position: relative; width: max-content; max-width: 100%; }
.maillink .fillbar { background: linear-gradient(96deg, var(--a1), var(--a5) 45%, var(--a3)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; transition: -webkit-text-fill-color .35s ease; }
.maillink:hover { color: transparent; }
.maillink .ul { display: block; height: 2px; margin-top: 10px; background: var(--line); position: relative; overflow: hidden; }
.maillink .ul::after { content: ''; position: absolute; inset: 0; transform: translateX(-101%); background: linear-gradient(90deg, var(--a1), var(--a3)); transition: transform .5s cubic-bezier(.22,1,.36,1); }
.maillink:hover .ul::after { transform: translateX(0); }
.foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px; margin-top: clamp(40px,6vw,64px); padding-top: 22px; border-top: 1px solid var(--line-2); }
.foot .social { display: flex; gap: 22px; }
.foot .social a { color: var(--mut); font-size: 14px; font-weight: 500; transition: color .2s ease; }
.foot .social a:hover { color: var(--ink); }
.foot .copy { color: var(--faint); font-size: 13px; }

/* reveal defaults */
.reveal { opacity: 0; transform: translateY(26px); transition: opacity .8s ease, transform .8s cubic-bezier(.16,1,.3,1); }
.reveal.in { opacity: 1; transform: none; }
.reveal[data-reveal="none"] { opacity: 1; transform: none; }

/* ===== responsive ===== */
@media (max-width: 980px) {
  .about .inner { grid-template-columns: 1fr; gap: 30px; }
}
@media (max-width: 820px) {
  .nav { display: none; }
  .grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 150px; }
  .t-a, .t-g { grid-column: span 2; grid-row: span 2; }
  .t-b, .t-c, .t-f { grid-column: span 1; grid-row: span 2; }
  .t-d, .t-e { grid-column: span 2; grid-row: span 2; }
  .hero .lede { flex-direction: column; align-items: flex-start; }
  .scrollcue { display: none; }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; grid-auto-rows: 200px; }
  .t-a, .t-b, .t-c, .t-d, .t-e, .t-f, .t-g { grid-column: span 1; grid-row: span 1; }
  .t-a, .t-g { grid-row: span 1; }
  .stats { grid-template-columns: 1fr; }
  .cap { transform: translateY(0); opacity: 1; }
  .tile .standing { display: none; }
  .bar .row { gap: 12px; }
  .btn { padding: 8px 14px; }
}
`.trim()

const HTML = `
<header class="bar reveal" data-reveal="none">
  <div class="row">
    <a class="mark" href="#top"><span class="glyph"></span> Marlow&nbsp;&amp;&nbsp;Field</a>
    <span class="spacer"></span>
    <nav class="nav">
      <a href="#work">Work</a>
      <a href="#about">Studio</a>
      <a href="#clients">Clients</a>
    </nav>
    <a class="btn" href="#contact">Get in touch <span class="arr">↗</span></a>
  </div>
</header>

<main class="wrap" id="top">
  <section class="hero reveal" data-reveal="none">
    <span class="pill"><span class="live"></span> Available for select projects · Q3</span>
    <h1>
      <span class="w">Selected</span> <span class="w"><em>Works</em></span> <span class="w">'26</span>
    </h1>
    <div class="lede">
      <p><b>Marlow &amp; Field</b> is an independent design studio shaping brand systems, editorial interfaces, and motion for companies that refuse to look like everyone else.</p>
      <span class="scrollcue"><span class="ln"></span> Scroll to explore</span>
    </div>
  </section>

  <section class="work" id="work">
    <div class="work-head reveal">
      <h2>Recent commissions</h2>
      <span class="count num">07 projects · 2024–2026</span>
    </div>

    <div class="grid">

      <!-- 01 — big hero tile: aurora mesh -->
      <a class="tile t-a reveal" href="#contact" aria-label="Aether — brand identity & motion system">
        <div class="art">
          <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <radialGradient id="p1a" cx="28%" cy="32%" r="60%"><stop offset="0" stop-color="#7c5cff"/><stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/></radialGradient>
              <radialGradient id="p1b" cx="74%" cy="64%" r="58%"><stop offset="0" stop-color="#ff5f3d"/><stop offset="100%" stop-color="#ff5f3d" stop-opacity="0"/></radialGradient>
              <radialGradient id="p1c" cx="62%" cy="20%" r="50%"><stop offset="0" stop-color="#2de2c5"/><stop offset="100%" stop-color="#2de2c5" stop-opacity="0"/></radialGradient>
              <filter id="b1"><feGaussianBlur stdDeviation="34"/></filter>
            </defs>
            <rect width="800" height="600" fill="#16121f"/>
            <g filter="url(#b1)">
              <rect width="800" height="600" fill="url(#p1a)"/>
              <rect width="800" height="600" fill="url(#p1b)"/>
              <rect width="800" height="600" fill="url(#p1c)"/>
            </g>
            <g stroke="rgba(255,255,255,0.10)" fill="none">
              <path d="M-40,170 C200,120 360,260 540,180 C700,108 820,200 860,150"/>
              <path d="M-40,260 C200,210 360,350 540,270 C700,198 820,290 860,240"/>
              <path d="M-40,350 C200,300 360,440 540,360 C700,288 820,380 860,330"/>
            </g>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Identity · Motion</span><span class="no">01</span></div>
        <div class="standing"><h3>Aether</h3><span>A living brand system for a climate-tech platform</span></div>
        <div class="cap"><div><h3>Aether</h3><div class="meta">Brand identity & motion · 2026</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 02 — concentric arcs -->
      <a class="tile t-b reveal" data-reveal="scale" href="#contact" aria-label="Halcyon — editorial system">
        <div class="art">
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="400" height="400" fill="#0e1414"/>
            <g fill="none" stroke-linecap="round">
              <circle cx="120" cy="300" r="60" stroke="#2de2c5" stroke-width="26"/>
              <circle cx="120" cy="300" r="118" stroke="#2de2c5" stroke-width="10" opacity="0.55"/>
              <circle cx="120" cy="300" r="180" stroke="#4ea3ff" stroke-width="5" opacity="0.4"/>
              <circle cx="300" cy="90" r="44" stroke="#ffd23f" stroke-width="20"/>
              <circle cx="300" cy="90" r="92" stroke="#ffd23f" stroke-width="7" opacity="0.5"/>
            </g>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Editorial</span><span class="no">02</span></div>
        <div class="cap"><div><h3>Halcyon</h3><div class="meta">Editorial system · 2025</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 03 — soft duotone blob -->
      <a class="tile t-c reveal" data-reveal="scale" href="#contact" aria-label="Pace — product UI">
        <div class="art">
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="p3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ff5f3d"/></linearGradient>
              <filter id="b3"><feGaussianBlur stdDeviation="14"/></filter>
            </defs>
            <rect width="400" height="400" fill="#1a1014"/>
            <g filter="url(#b3)">
              <path fill="url(#p3)" d="M210,70 C300,60 360,140 340,230 C322,312 240,360 160,340 C70,318 40,230 80,150 C112,86 150,78 210,70 Z"/>
            </g>
            <circle cx="200" cy="200" r="3" fill="#fff" opacity="0.8"/>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Product UI</span><span class="no">03</span></div>
        <div class="cap"><div><h3>Pace</h3><div class="meta">Mobile product · 2025</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 04 — striped geometric -->
      <a class="tile t-d reveal" href="#contact" aria-label="Field Notes — typography">
        <div class="art">
          <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="600" height="400" fill="#13110c"/>
            <g>
              <rect x="0" y="0" width="600" height="400" fill="#ffd23f" opacity="0.0"/>
              <rect x="40" y="60" width="80" height="280" rx="40" fill="#ff5f3d"/>
              <rect x="150" y="60" width="80" height="280" rx="40" fill="#ffd23f"/>
              <rect x="260" y="60" width="80" height="280" rx="40" fill="#0b0b0d"/>
              <rect x="370" y="60" width="80" height="280" rx="40" fill="#ff5fa2"/>
              <rect x="480" y="60" width="80" height="280" rx="40" fill="#7c5cff"/>
            </g>
            <circle cx="300" cy="200" r="74" fill="#0b0b0d"/>
            <circle cx="300" cy="200" r="74" fill="none" stroke="#fff" stroke-width="1" opacity="0.3"/>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Typography</span><span class="no">04</span></div>
        <div class="cap"><div><h3>Field Notes</h3><div class="meta">Type & wordmark · 2024</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 05 — radial sunburst lines -->
      <a class="tile t-e reveal" href="#contact" aria-label="Solar — campaign">
        <div class="art">
          <svg viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><radialGradient id="p5" cx="50%" cy="118%" r="100%"><stop offset="0" stop-color="#ff5f3d"/><stop offset="55%" stop-color="#ff5fa2"/><stop offset="100%" stop-color="#1a0e16"/></radialGradient></defs>
            <rect width="600" height="400" fill="url(#p5)"/>
            <g stroke="rgba(11,11,13,0.5)" stroke-width="2" id="rays"></g>
            <circle cx="300" cy="430" r="120" fill="#ffd23f" opacity="0.9"/>
            <circle cx="300" cy="430" r="120" fill="none" stroke="rgba(255,255,255,0.25)"/>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Campaign</span><span class="no">05</span></div>
        <div class="cap"><div><h3>Solar</h3><div class="meta">Launch campaign · 2025</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 06 — tall woven grid -->
      <a class="tile t-f reveal" data-reveal="left" href="#contact" aria-label="Loom — design system">
        <div class="art">
          <svg viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="p6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ea3ff"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs>
            <rect width="400" height="600" fill="#0d101a"/>
            <g id="loom" fill="url(#p6)"></g>
            <g stroke="rgba(255,255,255,0.08)" stroke-width="1" id="loomgrid"></g>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Design System</span><span class="no">06</span></div>
        <div class="cap"><div><h3>Loom</h3><div class="meta">Component library · 2026</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

      <!-- 07 — second big tile: layered topographic blobs -->
      <a class="tile t-g reveal" href="#contact" aria-label="Tidewater — spatial brand">
        <div class="art">
          <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="p7" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1f1c"/><stop offset="100%" stop-color="#06302a"/></linearGradient>
              <linearGradient id="p7b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2de2c5"/><stop offset="100%" stop-color="#4ea3ff"/></linearGradient>
            </defs>
            <rect width="800" height="600" fill="url(#p7)"/>
            <g fill="none" stroke-width="2.5">
              <path d="M-20,420 C160,360 280,470 440,410 C600,350 720,440 820,400" stroke="url(#p7b)" opacity="0.95"/>
              <path d="M-20,360 C160,300 280,410 440,350 C600,290 720,380 820,340" stroke="url(#p7b)" opacity="0.7"/>
              <path d="M-20,300 C160,240 280,350 440,290 C600,230 720,320 820,280" stroke="url(#p7b)" opacity="0.5"/>
              <path d="M-20,240 C160,180 280,290 440,230 C600,170 720,260 820,220" stroke="url(#p7b)" opacity="0.34"/>
              <path d="M-20,180 C160,120 280,230 440,170 C600,110 720,200 820,160" stroke="url(#p7b)" opacity="0.22"/>
            </g>
            <circle cx="612" cy="150" r="46" fill="#ffd23f"/>
            <circle cx="612" cy="150" r="46" fill="none" stroke="rgba(255,255,255,0.4)"/>
          </svg>
        </div>
        <div class="tlabel"><span class="disc">Spatial · Brand</span><span class="no">07</span></div>
        <div class="standing"><h3>Tidewater</h3><span>Wayfinding & spatial identity for a coastal museum</span></div>
        <div class="cap"><div><h3>Tidewater</h3><div class="meta">Spatial brand · 2024</div></div><span class="view">View <span class="arr">→</span></span></div>
      </a>

    </div>
  </section>

  <section class="about" id="about">
    <div class="inner">
      <div class="reveal" data-reveal="left">
        <p class="kick">The Studio</p>
        <h2>We design the things a brand is remembered by.</h2>
        <p>Founded in 2017, <b>Marlow &amp; Field</b> is a two-person studio working at the seam of identity, editorial, and interface. We take a small number of projects each year and give each one our full attention.</p>
        <p>No templates, no decks of stock ideas — every system is drawn from scratch and pressure-tested in the wild. We partner with founders, museums, and publishers who care about craft.</p>
      </div>
      <div class="stats reveal" data-reveal="right">
        <div class="stat"><div class="n num">9</div><div class="k">Years independent</div></div>
        <div class="stat"><div class="n num">64</div><div class="k">Projects shipped</div></div>
        <div class="stat"><div class="n num">31</div><div class="k">Clients worldwide</div></div>
      </div>
    </div>
  </section>

  <section class="clients" id="clients">
    <div class="reveal">
      <p class="lbl">Trusted by teams who sweat the details</p>
      <div class="marquee">
        <div class="track" id="track"></div>
      </div>
    </div>
  </section>
</main>

<footer class="contact wrap" id="contact">
  <div class="aura"></div>
  <div class="inner reveal" data-reveal="scale">
    <p class="kick">Start a project</p>
    <a class="maillink" href="mailto:hello@marlowfield.studio">
      <span class="fillbar">hello@marlowfield.studio</span>
      <span class="ul"></span>
    </a>
    <div class="foot">
      <div class="social">
        <a href="#">Instagram</a>
        <a href="#">Are.na</a>
        <a href="#">Read.cv</a>
        <a href="#">LinkedIn</a>
      </div>
      <span class="copy num">© 2026 Marlow &amp; Field — designed in code.</span>
    </div>
  </div>
</footer>
`.trim()

const JS = `
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kick the hero word-rise without waiting for the IO controller.
  var hero = document.querySelector('.hero');
  if (hero) { requestAnimationFrame(function () { hero.classList.add('in'); }); }

  // --- procedurally build the sunburst rays (tile 05) ---
  var rays = document.getElementById('rays');
  if (rays) {
    var cx = 300, cy = 430, html = '';
    for (var i = 0; i < 26; i++) {
      var ang = (Math.PI) * (i / 25) + Math.PI; // top half fan
      var x = cx + Math.cos(ang) * 700;
      var y = cy + Math.sin(ang) * 700;
      html += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
    }
    rays.innerHTML = html;
  }

  // --- build the woven grid (tile 06) ---
  var loom = document.getElementById('loom');
  var loomgrid = document.getElementById('loomgrid');
  if (loom && loomgrid) {
    var cols = 5, rowsN = 8, cw = 400 / cols, ch = 600 / rowsN, cells = '', lines = '';
    for (var r = 0; r < rowsN; r++) {
      for (var c = 0; c < cols; c++) {
        // checker-ish weave with a couple of accent gaps
        var fill = ((r + c) % 2 === 0) && !((r === 2 && c === 1) || (r === 5 && c === 3));
        if (fill) {
          var op = (0.30 + ((r * 7 + c * 3) % 5) * 0.13).toFixed(2);
          cells += '<rect x="' + (c * cw).toFixed(1) + '" y="' + (r * ch).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1) + '" opacity="' + op + '"/>';
        }
      }
    }
    for (var gc = 1; gc < cols; gc++) { lines += '<line x1="' + (gc * cw).toFixed(1) + '" y1="0" x2="' + (gc * cw).toFixed(1) + '" y2="600"/>'; }
    for (var gr = 1; gr < rowsN; gr++) { lines += '<line x1="0" y1="' + (gr * ch).toFixed(1) + '" x2="400" y2="' + (gr * ch).toFixed(1) + '"/>'; }
    loom.innerHTML = cells;
    loomgrid.innerHTML = lines;
  }

  // --- client logos marquee (duplicated track for seamless loop) ---
  var track = document.getElementById('track');
  if (track) {
    var names = ['Kindred', 'Meridian', 'Polaris', 'Atlas Press', 'Verdant', 'Northbeam', 'Foundry', 'Lumen'];
    var glyphs = ['#ff5f3d', '#ffd23f', '#7c5cff', '#2de2c5', '#ff5fa2', '#4ea3ff', '#ff5f3d', '#2de2c5'];
    function build() {
      var out = '';
      for (var i = 0; i < names.length; i++) {
        out += '<span class="logo"><svg class="m" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="' + glyphs[i] + '" stroke-width="2"/><circle cx="8" cy="8" r="2.4" fill="' + glyphs[i] + '"/></svg>' + names[i] + '</span>';
      }
      return out;
    }
    track.innerHTML = build() + build(); // two copies => -50% translate loops seamlessly
    if (reduce) { track.style.animation = 'none'; }
  }

  // --- cursor-follow tilt micro-interaction on tiles (pointer devices only) ---
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    var tiles = document.querySelectorAll('.tile');
    tiles.forEach(function (t) {
      var art = t.querySelector('.art');
      t.addEventListener('pointermove', function (e) {
        var r = t.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        if (art) { art.style.transform = 'scale(1.08) translate(' + (dx * -14).toFixed(1) + 'px,' + (dy * -14).toFixed(1) + 'px)'; }
      });
      t.addEventListener('pointerleave', function () {
        if (art) { art.style.transform = ''; }
      });
    });
  }
})();
`.trim()

export const portfolio: Template = {
  id: 'portfolio',
  kind: 'page',
  name: 'Design Portfolio',
  tagline: 'An asymmetric work grid with hover reveals',
  categories: ['Personal'],
  audiences: ['designer', 'creative', 'developer'],
  description:
    'A gallery-grade portfolio on an off-black canvas: oversized kinetic Clash Display type, a sticky minimal top bar, and an asymmetric project grid where every tile is its own generative CSS/SVG artwork (gradient meshes, layered blobs, geometric compositions). Hover zooms the art and slides up a caption with a View link; a studio About strip, stat row, animated client marquee, and an oversized email CTA round it out. Fully self-contained — the art is all code, no photo assets.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0b0b0d',
  notes:
    'Off-black gallery portfolio, fully self-contained (no images). PALETTE: edit the vivid art tokens --a1..--a6 in :root (coral/amber/violet/mint/magenta/azure) — they drive every tile artwork, gradient text, glows, and the marquee dots. Canvas tones are --bg / --bg-2 / --ink / --mut / --line. TYPE: --display is Clash Display (Fontshare) with Space Grotesk fallback; --body is Inter. CONTENT: each project is one `<a class="tile t-*">` — the `.t-a`..`.t-g` classes set its grid span (size), the inline `<svg>` in `.art` is its unique generative artwork, `.tlabel` is the discipline pill + number, and `.cap` is the hover caption (title/meta/View). To add a project, copy a tile, give it a new `.t-*` span, and draw a fresh SVG. The two big tiles (.t-a, .t-g) also show a `.standing` title that is always visible. Tiles 05 (sunburst rays) and 06 (woven grid) are generated in JS — see the #rays / #loom blocks. Swap studio name (Marlow & Field), the hero headline + availability pill, the About copy/stats, the client names array in JS, and the mailto link in the footer. On phones (<560px) tiles stack to one column and captions show without hover.',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0b0b0d',
  },
}
