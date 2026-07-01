import type { Template } from '../types'

// A bold, kinetic creative-agency site. Near-black canvas, one electric accent
// (acid lime), oversized Clash Display + Inter. Signature moments: a hero with
// kinetic word-by-word reveal + a glow that tracks the cursor, a seamless pure-CSS
// services marquee that pauses on hover, a work reel of CSS/SVG gradient artworks
// with hover label reveals, an indexed services list, text-set client logos, an
// awards strip, and a giant CTA footer with an animated gradient sweep. Fully
// self-contained — no images, no chart libs. Honors prefers-reduced-motion.

const CSS = `
:root {
  --bg: #0a0a0b;
  --bg-2: #101012;
  --ink: #f4f4ec;
  --mut: #8a8a82;
  --faint: #565650;
  --line: rgba(255,255,255,0.10);
  --acc: #d6ff3f;          /* acid lime — the one electric accent */
  --acc-deep: #aef000;
  --acc-ink: #0a0a0b;      /* text that sits ON the accent */
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --maxw: 1180px;
}
body {
  background: var(--bg);
  color: var(--ink);
  overflow-x: hidden;
}
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 clamp(20px, 5vw, 56px); }
a { color: inherit; text-decoration: none; }
::selection { background: var(--acc); color: var(--acc-ink); }

/* ---------- nav ---------- */
.nav {
  position: sticky; top: 0; z-index: 40;
  backdrop-filter: blur(14px);
  background: linear-gradient(to bottom, rgba(10,10,11,0.86), rgba(10,10,11,0.4));
  border-bottom: 1px solid var(--line);
}
.nav .wrap { display: flex; align-items: center; gap: 20px; height: 72px; }
.logo { font-family: var(--display); font-weight: 600; font-size: 20px; letter-spacing: -0.01em; display: inline-flex; align-items: center; gap: 11px; }
.logo .mk { width: 26px; height: 26px; border-radius: 8px; background: var(--acc); display: grid; place-items: center; color: var(--acc-ink); font-weight: 700; font-size: 15px; box-shadow: 0 0 28px -6px var(--acc); }
.nav .links { margin-left: auto; display: flex; gap: 28px; align-items: center; }
.nav .links a { color: var(--mut); font-size: 14px; font-weight: 500; transition: color 0.2s; }
.nav .links a:hover { color: var(--ink); }
.nav .cta { color: var(--acc-ink) !important; background: var(--acc); padding: 9px 16px; border-radius: 999px; font-weight: 600; transition: transform 0.18s, box-shadow 0.18s; }
.nav .cta:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -10px var(--acc); }
@media (max-width: 720px) { .nav .links a.hide { display: none; } }

/* ---------- hero ---------- */
.hero { position: relative; padding: clamp(64px, 13vw, 150px) 0 clamp(40px, 8vw, 84px); overflow: hidden; }
.hero .glow {
  position: absolute; pointer-events: none; z-index: 0;
  width: 720px; height: 720px; left: var(--mx, 64%); top: var(--my, 8%);
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(214,255,63,0.20), rgba(214,255,63,0) 62%);
  filter: blur(8px); transition: left 0.5s ease, top 0.5s ease;
}
.hero .grain {
  position: absolute; inset: 0; z-index: 0; opacity: 0.5; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
  background-size: 4px 4px;
  -webkit-mask-image: radial-gradient(120% 90% at 60% 10%, #000 30%, transparent 78%);
          mask-image: radial-gradient(120% 90% at 60% 10%, #000 30%, transparent 78%);
}
.hero .wrap { position: relative; z-index: 1; }
.avail { display: inline-flex; align-items: center; gap: 9px; color: var(--mut); font-size: 13px; font-weight: 500; letter-spacing: 0.01em;
  border: 1px solid var(--line); border-radius: 999px; padding: 7px 14px 7px 12px; margin-bottom: clamp(24px, 5vw, 40px); }
.avail::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--acc);
  box-shadow: 0 0 0 0 rgba(214,255,63,0.6); animation: pulse 2.4s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(214,255,63,0.55)} 70%{box-shadow:0 0 0 8px rgba(214,255,63,0)} 100%{box-shadow:0 0 0 0 rgba(214,255,63,0)} }

.hero h1 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(46px, 11.5vw, 168px); line-height: 0.9; letter-spacing: -0.03em;
  margin: 0; text-wrap: balance; max-width: 14ch;
}
.hero h1 .em { color: var(--acc); font-style: italic; }
.hero h1 .word { display: inline-block; }
/* kinetic word reveal */
.hero h1 .word { opacity: 0; transform: translateY(0.5em) rotate(2.5deg); }
.hero.reveal.in h1 .word { animation: rise 0.9s cubic-bezier(0.16,1,0.3,1) forwards; }
.hero.reveal.in h1 .word:nth-child(1){animation-delay:.05s} .hero.reveal.in h1 .word:nth-child(2){animation-delay:.14s}
.hero.reveal.in h1 .word:nth-child(3){animation-delay:.23s} .hero.reveal.in h1 .word:nth-child(4){animation-delay:.32s}
.hero.reveal.in h1 .word:nth-child(5){animation-delay:.41s} .hero.reveal.in h1 .word:nth-child(6){animation-delay:.50s}
@keyframes rise { to { opacity: 1; transform: none; } }
/* Fallback: if motion is reduced (animation neutralized) the words must still show. */
@media (prefers-reduced-motion: reduce) {
  .hero h1 .word { opacity: 1; transform: none; animation: none; }
}

.hero .lead { color: var(--mut); font-size: clamp(16px, 2.2vw, 21px); line-height: 1.5; max-width: 46ch;
  margin: clamp(24px, 4vw, 36px) 0 0; }
.hero .lead b { color: var(--ink); font-weight: 600; }
.hero .row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: clamp(28px, 5vw, 42px); }
.btn { font-weight: 600; font-size: 15px; border-radius: 999px; padding: 14px 24px; display: inline-flex; align-items: center; gap: 9px;
  transition: transform 0.18s, box-shadow 0.18s, background 0.2s; cursor: pointer; border: 0; }
.btn.primary { background: var(--acc); color: var(--acc-ink); box-shadow: 0 12px 38px -14px var(--acc); }
.btn.primary:hover { transform: translateY(-2px); box-shadow: 0 18px 50px -14px var(--acc); }
.btn.primary .arrow { transition: transform 0.2s; }
.btn.primary:hover .arrow { transform: translateX(4px); }
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.btn.ghost:hover { border-color: rgba(255,255,255,0.3); transform: translateY(-2px); }
.btn:focus-visible { outline: 2px solid var(--acc); outline-offset: 3px; }

.hero .stats { display: flex; gap: clamp(28px, 6vw, 64px); flex-wrap: wrap; margin-top: clamp(44px, 8vw, 76px); padding-top: clamp(28px, 4vw, 36px); border-top: 1px solid var(--line); }
.hero .stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5vw, 46px); letter-spacing: -0.02em; line-height: 1; }
.hero .stat .n i { color: var(--acc); font-style: normal; }
.hero .stat .l { color: var(--mut); font-size: 13.5px; margin-top: 8px; max-width: 18ch; }

/* ---------- marquee ---------- */
.marquee { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: clamp(18px, 3vw, 26px) 0; overflow: hidden;
  background: var(--bg-2); position: relative; }
.marquee::before, .marquee::after { content: ''; position: absolute; top: 0; bottom: 0; width: clamp(40px, 8vw, 120px); z-index: 2; pointer-events: none; }
.marquee::before { left: 0; background: linear-gradient(90deg, var(--bg-2), transparent); }
.marquee::after { right: 0; background: linear-gradient(270deg, var(--bg-2), transparent); }
.track { display: flex; width: max-content; gap: 0; animation: scroll 34s linear infinite; }
.marquee:hover .track { animation-play-state: paused; }
.track .item { font-family: var(--display); font-weight: 500; font-size: clamp(22px, 4vw, 40px); letter-spacing: -0.01em;
  color: var(--ink); padding: 0 clamp(20px, 3.5vw, 44px); display: inline-flex; align-items: center; gap: clamp(20px, 3.5vw, 44px); white-space: nowrap; }
.track .item::after { content: '✳'; color: var(--acc); font-size: 0.6em; }
.track .item.dim { color: var(--faint); -webkit-text-stroke: 0; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ---------- section frame ---------- */
.sec { padding: clamp(64px, 11vw, 132px) 0; }
.shead { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: clamp(34px, 6vw, 56px); flex-wrap: wrap; }
.kick { font-size: 12.5px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--acc);
  display: inline-flex; align-items: center; gap: 12px; }
.kick::before { content: ''; width: 30px; height: 1.5px; background: currentColor; }
.shead h2 { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5.6vw, 60px); line-height: 1; letter-spacing: -0.025em; margin: 16px 0 0; max-width: 16ch; }
.shead .aside { color: var(--mut); font-size: 14.5px; line-height: 1.55; max-width: 34ch; }

/* ---------- work reel ---------- */
.reel { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(14px, 2vw, 22px); }
.tile { position: relative; border-radius: 22px; overflow: hidden; aspect-ratio: 16 / 11; display: block;
  border: 1px solid var(--line); isolation: isolate; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
.tile.tall { aspect-ratio: 4 / 5; }
.tile svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; transition: transform 0.7s cubic-bezier(0.16,1,0.3,1); }
.tile:hover svg { transform: scale(1.06); }
.tile:hover { transform: translateY(-4px); }
.tile .veil { position: absolute; inset: 0; z-index: 1; background: linear-gradient(to top, rgba(10,10,11,0.78) 4%, rgba(10,10,11,0) 46%); }
.tile .meta { position: absolute; left: clamp(18px, 2.4vw, 26px); right: 18px; bottom: clamp(16px, 2.4vw, 22px); z-index: 2; }
.tile .cat { font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--acc);
  opacity: 0; transform: translateY(8px); transition: opacity 0.4s, transform 0.4s; }
.tile:hover .cat { opacity: 1; transform: none; }
.tile .name { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 2.8vw, 30px); letter-spacing: -0.01em; margin-top: 6px; }
.tile .yr { position: absolute; top: clamp(16px, 2.4vw, 22px); right: clamp(16px, 2.4vw, 22px); z-index: 2; font-size: 12px; color: var(--mut); font-variant-numeric: tabular-nums;
  border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; background: rgba(10,10,11,0.35); backdrop-filter: blur(6px); }
.tile:focus-visible { outline: 2px solid var(--acc); outline-offset: 3px; }

/* ---------- services list ---------- */
.svc { border-top: 1px solid var(--line); }
.srow { display: grid; grid-template-columns: clamp(58px, 8vw, 96px) 1fr 1.1fr; gap: clamp(16px, 3vw, 40px); align-items: start;
  padding: clamp(26px, 4vw, 40px) 0; border-bottom: 1px solid var(--line); position: relative; }
.srow .ix { font-family: var(--display); font-weight: 500; font-size: clamp(15px, 2vw, 19px); color: var(--faint); font-variant-numeric: tabular-nums; padding-top: 6px; }
.srow h3 { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.6vw, 40px); letter-spacing: -0.02em; margin: 0; line-height: 1.02;
  transition: color 0.25s, transform 0.35s cubic-bezier(0.16,1,0.3,1); }
.srow p { color: var(--mut); font-size: 14.5px; line-height: 1.6; margin: 0; }
.srow .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
.srow .tags span { font-size: 12px; color: var(--faint); border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; }
.srow:hover h3 { color: var(--acc); transform: translateX(8px); }
.srow .ix b { color: var(--acc); font-weight: 500; }

/* ---------- clients ---------- */
.clients { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: clamp(40px, 7vw, 68px) 0; }
.clients .lab { text-align: center; color: var(--faint); font-size: 12.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: clamp(28px, 4vw, 40px); }
.logos { display: grid; grid-template-columns: repeat(5, 1fr); gap: clamp(18px, 3vw, 36px); align-items: center; }
.logos span { font-family: var(--display); font-weight: 600; font-size: clamp(17px, 2.2vw, 25px); letter-spacing: -0.01em; text-align: center;
  color: var(--mut); opacity: 0.72; transition: opacity 0.25s, color 0.25s; }
.logos span:hover { opacity: 1; color: var(--ink); }

/* ---------- awards / press ---------- */
.awards { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2.4vw, 26px); }
.award { border: 1px solid var(--line); border-radius: 18px; padding: clamp(22px, 3vw, 30px); background: var(--bg-2); transition: border-color 0.25s, transform 0.3s; }
.award:hover { border-color: rgba(214,255,63,0.35); transform: translateY(-3px); }
.award .src { font-size: 12.5px; color: var(--acc); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.award h4 { font-family: var(--display); font-weight: 600; font-size: clamp(18px, 2.3vw, 24px); letter-spacing: -0.01em; margin: 14px 0 0; line-height: 1.18; }
.award .yr { color: var(--faint); font-size: 13px; margin-top: 12px; font-variant-numeric: tabular-nums; }

/* ---------- CTA footer ---------- */
.cta-foot { position: relative; overflow: hidden; padding: clamp(72px, 14vw, 168px) 0 clamp(48px, 7vw, 72px); border-top: 1px solid var(--line); }
.cta-foot .sweep {
  position: absolute; inset: -40% -10% auto -10%; height: 140%; z-index: 0; pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 180deg at 50% 50%, rgba(214,255,63,0) 0deg, rgba(214,255,63,0.16) 90deg, rgba(174,240,0,0.10) 180deg, rgba(214,255,63,0) 320deg);
  filter: blur(40px); animation: spin 22s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.cta-foot .wrap { position: relative; z-index: 1; }
.cta-foot .kick { justify-content: flex-start; }
.cta-foot h2 { font-family: var(--display); font-weight: 600; font-size: clamp(38px, 9vw, 124px); line-height: 0.92; letter-spacing: -0.03em; margin: 18px 0 0; text-wrap: balance; }
.cta-foot h2 .arrow { display: inline-block; color: var(--acc); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }
.cta-foot a.mail { font-family: var(--display); font-weight: 500; font-size: clamp(22px, 5vw, 56px); letter-spacing: -0.02em; display: inline-block;
  margin-top: clamp(32px, 6vw, 56px); position: relative; line-height: 1.1; word-break: break-word; }
.cta-foot a.mail::after { content: ''; position: absolute; left: 0; right: 100%; bottom: 0.04em; height: 2px; background: var(--acc); transition: right 0.4s cubic-bezier(0.16,1,0.3,1); }
.cta-foot a.mail:hover::after { right: 0; }
.cta-foot a.mail:hover ~ .nbsp, .cta-foot h2:hover .arrow { transform: translate(6px,-6px); }
.cta-foot a:focus-visible { outline: 2px solid var(--acc); outline-offset: 4px; border-radius: 4px; }

.foot { display: flex; align-items: center; justify-content: space-between; gap: 22px; flex-wrap: wrap;
  margin-top: clamp(56px, 10vw, 100px); padding-top: clamp(26px, 4vw, 36px); border-top: 1px solid var(--line); color: var(--mut); font-size: 13.5px; }
.foot .social { display: flex; gap: 22px; }
.foot .social a { color: var(--mut); transition: color 0.2s; }
.foot .social a:hover { color: var(--acc); }

/* ---------- responsive ---------- */
@media (max-width: 820px) {
  .reel { grid-template-columns: 1fr; }
  .tile, .tile.tall { aspect-ratio: 16 / 11; }
  .srow { grid-template-columns: clamp(44px, 12vw, 64px) 1fr; }
  .srow .desc { grid-column: 2; margin-top: 14px; }
  .awards { grid-template-columns: 1fr; }
  .logos { grid-template-columns: repeat(3, 1fr); row-gap: 28px; }
  .shead { align-items: flex-start; }
}
@media (max-width: 480px) {
  .hero .row { flex-direction: column; align-items: stretch; }
  .btn { justify-content: center; }
  .logos { grid-template-columns: repeat(2, 1fr); }
  .srow { grid-template-columns: 1fr; gap: 10px; }
  .srow .desc { grid-column: 1; }
  .foot { flex-direction: column; align-items: flex-start; gap: 16px; }
}
`.trim()

const HTML = `
<nav class="nav">
  <div class="wrap">
    <a class="logo" href="#top"><span class="mk">V</span> Voltage&nbsp;Studio</a>
    <div class="links">
      <a class="hide" href="#work">Work</a>
      <a class="hide" href="#services">Services</a>
      <a class="hide" href="#recognition">Recognition</a>
      <a class="cta" href="#contact">Start a project</a>
    </div>
  </div>
</nav>

<header class="hero reveal" data-reveal="none" id="top">
  <div class="grain"></div>
  <div class="glow" id="glow"></div>
  <div class="wrap">
    <span class="avail">Booking two new partners for Q3 2026</span>
    <h1><span class="word">We</span> <span class="word">build</span> <span class="word">brands</span> <span class="word">that</span> <span class="word em">move.</span></h1>
    <p class="lead">Voltage is an independent brand &amp; product studio for companies done blending in. We design <b>identities, sites, and motion systems</b> that turn attention into momentum.</p>
    <div class="row">
      <a class="btn primary" href="#contact">Start a project <span class="arrow">→</span></a>
      <a class="btn ghost" href="#work">See the work</a>
    </div>
    <div class="stats">
      <div class="stat"><div class="n num">12<i>+</i></div><div class="l">years shipping brands people remember</div></div>
      <div class="stat"><div class="n num">90<i>+</i></div><div class="l">launches across fintech, climate &amp; culture</div></div>
      <div class="stat"><div class="n num">4<i>×</i></div><div class="l">average lift in launch-week engagement</div></div>
    </div>
  </div>
</header>

<section class="marquee" aria-hidden="true">
  <div class="track" id="track">
    <span class="item">Brand Strategy</span><span class="item">Visual Identity</span><span class="item dim">Web Design</span><span class="item">Motion</span><span class="item dim">Art Direction</span><span class="item">Naming</span><span class="item dim">Packaging</span><span class="item">Campaigns</span>
    <span class="item">Brand Strategy</span><span class="item">Visual Identity</span><span class="item dim">Web Design</span><span class="item">Motion</span><span class="item dim">Art Direction</span><span class="item">Naming</span><span class="item dim">Packaging</span><span class="item">Campaigns</span>
  </div>
</section>

<section class="sec" id="work">
  <div class="wrap">
    <div class="shead reveal">
      <div>
        <span class="kick">Selected work</span>
        <h2>Brands we charged up.</h2>
      </div>
      <p class="aside">A small slice. Every project starts with strategy and ends with a system the team can actually run.</p>
    </div>
    <div class="reel">
      <a class="tile reveal" href="#contact" aria-label="Halcyon — Fintech rebrand">
        <svg viewBox="0 0 800 550" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Halcyon brand artwork">
          <defs><linearGradient id="w1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a1c5e"/><stop offset="1" stop-color="#0a0a0b"/></linearGradient></defs>
          <rect width="800" height="550" fill="url(#w1)"/>
          <circle cx="560" cy="180" r="230" fill="none" stroke="#d6ff3f" stroke-width="2" opacity="0.5"/>
          <circle cx="560" cy="180" r="150" fill="none" stroke="#8b7cff" stroke-width="2" opacity="0.6"/>
          <circle cx="560" cy="180" r="70" fill="#d6ff3f" opacity="0.9"/>
        </svg>
        <div class="veil"></div><span class="yr num">2026</span>
        <div class="meta"><div class="cat">Identity · Web</div><div class="name">Halcyon</div></div>
      </a>
      <a class="tile reveal" data-reveal="right" href="#contact" aria-label="Ferra — Climate hardware">
        <svg viewBox="0 0 800 550" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ferra brand artwork">
          <defs><linearGradient id="w2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5d3b"/><stop offset="0.6" stop-color="#b81d3a"/><stop offset="1" stop-color="#1a0608"/></linearGradient></defs>
          <rect width="800" height="550" fill="url(#w2)"/>
          <path d="M0,400 Q200,300 400,380 T800,360 L800,550 L0,550 Z" fill="#0a0a0b" opacity="0.45"/>
          <path d="M0,460 Q200,370 400,440 T800,420 L800,550 L0,550 Z" fill="#0a0a0b" opacity="0.55"/>
          <circle cx="170" cy="150" r="58" fill="#ffd84c"/>
        </svg>
        <div class="veil"></div><span class="yr num">2025</span>
        <div class="meta"><div class="cat">Brand · Campaign</div><div class="name">Ferra</div></div>
      </a>
      <a class="tile reveal" href="#contact" aria-label="Norð — Editorial platform">
        <svg viewBox="0 0 800 550" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Norð brand artwork">
          <defs><linearGradient id="w3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0f2e2a"/><stop offset="1" stop-color="#093d4f"/></linearGradient></defs>
          <rect width="800" height="550" fill="url(#w3)"/>
          <g stroke="#5fe6c8" stroke-width="2.5" fill="none" opacity="0.85">
            <path d="M120,440 L120,140 L300,440 L300,140"/>
            <path d="M400,140 Q540,140 540,260 Q540,360 400,360 L400,440"/>
            <path d="M620,140 L740,140 M680,140 L680,440"/>
          </g>
        </svg>
        <div class="veil"></div><span class="yr num">2025</span>
        <div class="meta"><div class="cat">Editorial · Type</div><div class="name">Norð</div></div>
      </a>
      <a class="tile reveal" data-reveal="right" href="#contact" aria-label="Lumen — Health app">
        <svg viewBox="0 0 800 550" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Lumen brand artwork">
          <defs>
            <radialGradient id="w4" cx="0.35" cy="0.4" r="0.8"><stop offset="0" stop-color="#ffe27a"/><stop offset="0.5" stop-color="#ff7eb6"/><stop offset="1" stop-color="#3a1040"/></radialGradient>
          </defs>
          <rect width="800" height="550" fill="url(#w4)"/>
          <g fill="none" stroke="#0a0a0b" stroke-width="3" opacity="0.28">
            <ellipse cx="400" cy="275" rx="300" ry="120"/><ellipse cx="400" cy="275" rx="220" ry="200"/><ellipse cx="400" cy="275" rx="120" ry="270"/>
          </g>
        </svg>
        <div class="veil"></div><span class="yr num">2024</span>
        <div class="meta"><div class="cat">Product · Motion</div><div class="name">Lumen</div></div>
      </a>
    </div>
  </div>
</section>

<section class="sec" id="services" style="padding-top:0">
  <div class="wrap">
    <div class="shead reveal">
      <div>
        <span class="kick">What we do</span>
        <h2>Four ways we move the needle.</h2>
      </div>
      <p class="aside">Engaged as a full system or a single sharp intervention — strategy threads through all of it.</p>
    </div>
    <div class="svc">
      <div class="srow reveal">
        <div class="ix">/&thinsp;<b>01</b></div>
        <h3>Brand Strategy</h3>
        <div class="desc">
          <p>Positioning, narrative, and naming that give a company a reason to exist out loud. We pressure-test the story before anyone touches a typeface.</p>
          <div class="tags"><span>Positioning</span><span>Naming</span><span>Messaging</span><span>Workshops</span></div>
        </div>
      </div>
      <div class="srow reveal">
        <div class="ix">/&thinsp;<b>02</b></div>
        <h3>Visual Identity</h3>
        <div class="desc">
          <p>Logos, type systems, color, and a full toolkit your team can run without us — documented, flexible, and built to scale across every surface.</p>
          <div class="tags"><span>Logo</span><span>Type system</span><span>Guidelines</span><span>Art direction</span></div>
        </div>
      </div>
      <div class="srow reveal">
        <div class="ix">/&thinsp;<b>03</b></div>
        <h3>Web &amp; Product</h3>
        <div class="desc">
          <p>Sites and product surfaces designed and built end to end. Fast, accessible, and animated with intent — never motion for the sake of motion.</p>
          <div class="tags"><span>Design</span><span>Front-end</span><span>Prototyping</span><span>CMS</span></div>
        </div>
      </div>
      <div class="srow reveal">
        <div class="ix">/&thinsp;<b>04</b></div>
        <h3>Motion &amp; Campaign</h3>
        <div class="desc">
          <p>Launch films, social systems, and the kinetic identity that ties a release together. We make the moment a brand goes loud feel inevitable.</p>
          <div class="tags"><span>Motion identity</span><span>Launch film</span><span>Social</span><span>3D</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="clients">
  <div class="wrap">
    <p class="lab">Trusted by teams at</p>
    <div class="logos">
      <span>Northwind</span><span>Cobalt</span><span>Atlas&amp;Co</span><span>Meridian</span><span>Solace</span>
      <span>Junō</span><span>Halcyon</span><span>Terra</span><span>Verve</span><span>Kindred</span>
    </div>
  </div>
</section>

<section class="sec" id="recognition">
  <div class="wrap">
    <div class="shead reveal">
      <div>
        <span class="kick">Recognition</span>
        <h2>The work gets noticed.</h2>
      </div>
      <p class="aside">Awards are nice. Clients shipping faster and standing out is the point.</p>
    </div>
    <div class="awards">
      <div class="award reveal"><div class="src">Awwwards</div><h4>Site of the Day — Ferra launch microsite</h4><div class="yr num">2025</div></div>
      <div class="award reveal"><div class="src">Communication Arts</div><h4>Typography &amp; identity excellence — Norð</h4><div class="yr num">2025</div></div>
      <div class="award reveal"><div class="src">The FWA</div><h4>Cutting Edge — Lumen motion system</h4><div class="yr num">2024</div></div>
      <div class="award reveal" data-reveal="left"><div class="src">D&amp;AD</div><h4>Wood Pencil — Halcyon brand identity</h4><div class="yr num">2026</div></div>
      <div class="award reveal"><div class="src">It's Nice That</div><h4>Studio to watch — independent agencies</h4><div class="yr num">2025</div></div>
      <div class="award reveal" data-reveal="right"><div class="src">CSS Design Awards</div><h4>Best UI &amp; Innovation — Voltage.studio</h4><div class="yr num">2026</div></div>
    </div>
  </div>
</section>

<footer class="cta-foot" id="contact">
  <div class="sweep"></div>
  <div class="wrap">
    <span class="kick">Let's talk</span>
    <h2 class="reveal">Let's make<br>something <span class="arrow">→</span></h2>
    <a class="mail" href="mailto:hello@voltage.studio">hello@voltage.studio</a>
    <div class="foot">
      <div>© 2026 Voltage Studio — Brooklyn &amp; remote. Independent since 2014.</div>
      <div class="social"><a href="#contact">Instagram</a><a href="#contact">Are.na</a><a href="#contact">LinkedIn</a></div>
    </div>
  </div>
</footer>
`.trim()

const JS = `
// Hero glow follows the cursor (subtle, eased via CSS transition).
(function () {
  var hero = document.getElementById('top');
  var glow = document.getElementById('glow');
  if (!hero || !glow) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * 100;
    var y = ((e.clientY - r.top) / r.height) * 100;
    glow.style.setProperty('--mx', x.toFixed(1) + '%');
    glow.style.setProperty('--my', y.toFixed(1) + '%');
  });
})();

// Match marquee duration to its content width so the seamless -50% loop runs at a
// steady speed regardless of viewport. The track holds two identical halves.
(function () {
  var track = document.getElementById('track');
  if (!track) return;
  function sync() {
    var half = track.scrollWidth / 2;
    var pxPerSec = 70;
    var dur = Math.max(16, Math.round(half / pxPerSec));
    track.style.animationDuration = dur + 's';
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(sync); }
  sync();
  window.addEventListener('resize', sync);
})();
`.trim()

export const agency: Template = {
  id: 'agency',
  kind: 'page',
  name: 'Creative Agency',
  tagline: 'A bold, kinetic creative-agency site',
  categories: ['Marketing'],
  audiences: ['agency', 'marketing', 'creative'],
  description:
    'A bold, kinetic creative-agency site on a near-black canvas with one electric acid-lime accent and oversized Clash Display type. A kinetic hero with a cursor-tracking glow, a seamless pure-CSS services marquee that pauses on hover, a work reel of hand-rolled CSS/SVG gradient artworks with hover label reveals, an indexed services list, text-set client logos, an awards strip, and a giant CTA footer with an animated gradient sweep. Fully self-contained — no images or chart libraries — and honors reduced-motion.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0a0a0b',
  notes:
    'One-accent system: edit `--acc` (acid lime) plus `--acc-deep`/`--acc-ink` in :root to reskin to electric blue or hot coral — everything (glow, marquee star, buttons, hover states, CTA sweep) keys off it. `--bg`/`--bg-2`/`--ink`/`--mut` set the near-black palette. Swap the studio name in the nav `.logo`, hero `<h1>` words, and footer; the hero reveal animates word-by-word so keep each word in its own `<span class="word">`. Work tiles are pure inline SVG gradients (ids w1–w4) — recolor the stops or duplicate a `.tile` to add a project (use `.tall` for a portrait tile on desktop). The marquee loops a doubled `.track`; JS auto-tunes its speed, or set `animation: scroll 34s` in CSS. Services are an indexed `.srow` list; client logos are styled text in `.logos`; awards are `.award` cards. Honors prefers-reduced-motion (glow + animations disable).',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0a0a0b',
  },
}
