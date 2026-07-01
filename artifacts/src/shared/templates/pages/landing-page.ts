import type { Template } from '../types'

// Cadence — a flagship SaaS product landing page. A near-black hero (with the
// generated glass-wave visual) melts into a clean light body; an indigo→violet
// signature accent picks up the coral highlight from the hero image. Space
// Grotesk display + Inter body, tabular figures, hand-rolled SVG icons + sparkline
// (no chart libs). A sticky translucent nav solidifies on scroll, the hero image
// floats, and every section reveals on scroll. Fully responsive (380px → wide).

const CSS = `
:root {
  --ink: #0b0b12;          /* near-black hero ground */
  --ink-2: #12121d;
  --paper: #ffffff;        /* light body */
  --paper-2: #f6f5fb;
  --line: #e9e7f2;
  --line-dk: rgba(255,255,255,0.10);
  --text: #16151f;
  --text-mut: #6b6a7e;
  --text-faint: #9b99ad;
  --inv: #f4f3fb;          /* text on dark */
  --inv-mut: #a9a6be;
  --c1: #6d5cff;           /* indigo  */
  --c2: #a855f7;           /* violet  */
  --c3: #ff7a59;           /* coral (from hero) */
  --grad: linear-gradient(102deg, var(--c1), var(--c2) 60%, var(--c3));
  --grad-soft: linear-gradient(102deg, rgba(109,92,255,0.16), rgba(168,85,247,0.12));
  --display: 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --shadow: 0 30px 80px -28px rgba(20,16,60,0.28);
  --shadow-sm: 0 12px 34px -16px rgba(20,16,60,0.22);
  --maxw: 1140px;
}
* { box-sizing: border-box; }
body { background: var(--paper); color: var(--text); }
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
.wrap { width: 100%; max-width: var(--maxw); margin: 0 auto; padding: 0 28px; }
.grad-text {
  background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-family: var(--body); font-weight: 600; font-size: 12.5px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--c2);
}
.eyebrow::before { content: ''; width: 22px; height: 2px; border-radius: 2px; background: var(--grad); }
.eyebrow.on-dark { color: #c9bfff; }

/* ===== NAV ===== */
.nav {
  position: fixed; inset: 0 0 auto 0; z-index: 50;
  transition: background 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease;
  border-bottom: 1px solid transparent;
}
.nav .row { display: flex; align-items: center; gap: 28px; height: 70px; }
.brand { display: inline-flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.02em; color: var(--inv); }
.brand .mark { width: 30px; height: 30px; border-radius: 9px; background: var(--grad); box-shadow: 0 8px 22px -8px var(--c1); display: grid; place-items: center; }
.brand .mark svg { width: 17px; height: 17px; display: block; }
.nav .links { display: flex; align-items: center; gap: 26px; margin-left: auto; }
.nav .links a { font-size: 14px; font-weight: 500; color: var(--inv-mut); transition: color 0.2s ease; }
.nav .links a:hover { color: var(--inv); }
.nav .cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 999px;
  font-size: 13.5px; font-weight: 600; color: #0b0b12; background: var(--inv);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.nav .cta:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -12px rgba(255,255,255,0.5); }
/* Solidify on scroll (JS toggles .stuck): goes light + hairline + blur */
.nav.stuck { background: rgba(255,255,255,0.82); backdrop-filter: saturate(160%) blur(14px); border-bottom-color: var(--line); box-shadow: 0 8px 30px -22px rgba(20,16,60,0.4); }
.nav.stuck .brand { color: var(--text); }
.nav.stuck .links a { color: var(--text-mut); }
.nav.stuck .links a:hover { color: var(--text); }
.nav.stuck .cta { color: #fff; background: var(--ink); }
.nav.stuck .cta:hover { box-shadow: 0 12px 26px -12px rgba(20,16,60,0.5); }

/* ===== HERO ===== */
.hero {
  position: relative; background: var(--ink); color: var(--inv);
  padding: 138px 0 96px; overflow: hidden;
}
.hero::before { /* aurora glow behind copy */
  content: ''; position: absolute; left: -10%; top: -20%; width: 60%; height: 90%;
  background: radial-gradient(closest-side, rgba(109,92,255,0.28), transparent 70%);
  filter: blur(8px); pointer-events: none;
}
.hero::after { /* coral bloom bottom-right */
  content: ''; position: absolute; right: -8%; bottom: -30%; width: 55%; height: 90%;
  background: radial-gradient(closest-side, rgba(255,122,89,0.20), transparent 70%);
  pointer-events: none;
}
.hero .wrap { position: relative; z-index: 1; }
.hero-grid { display: grid; grid-template-columns: 1.04fr 0.96fr; gap: 56px; align-items: center; }
.hero h1 {
  font-family: var(--display); font-weight: 600; letter-spacing: -0.035em; line-height: 1.02;
  font-size: clamp(40px, 6.4vw, 70px); margin: 22px 0 0; text-wrap: balance;
}
.hero .sub {
  margin: 22px 0 0; max-width: 30ch; font-size: clamp(16px, 1.9vw, 19px);
  line-height: 1.55; color: var(--inv-mut);
}
.hero .ctas { display: flex; flex-wrap: wrap; gap: 13px; margin: 32px 0 0; }
.btn {
  display: inline-flex; align-items: center; gap: 9px; padding: 14px 24px; border-radius: 13px;
  font-family: var(--body); font-weight: 600; font-size: 15px; cursor: pointer; border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.btn svg { width: 16px; height: 16px; }
.btn-primary { color: #fff; background: var(--grad); border: 0; box-shadow: 0 16px 38px -14px rgba(109,92,255,0.7); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 22px 46px -14px rgba(109,92,255,0.85); }
.btn-ghost { color: var(--inv); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.16); }
.btn-ghost:hover { background: rgba(255,255,255,0.10); transform: translateY(-2px); }
.btn-dark { color: #fff; background: var(--ink); }
.btn-dark:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.trust { display: flex; align-items: center; gap: 11px; margin: 26px 0 0; font-size: 13px; color: var(--inv-mut); }
.avatars { display: inline-flex; }
.avatars span {
  width: 28px; height: 28px; border-radius: 50%; margin-left: -8px; border: 2px solid var(--ink);
  background: var(--grad); display: inline-block;
}
.avatars span:nth-child(2) { background: linear-gradient(135deg, #ff7a59, #a855f7); }
.avatars span:nth-child(3) { background: linear-gradient(135deg, #4cc4ff, #6d5cff); }
.avatars span:nth-child(4) { background: linear-gradient(135deg, #34d399, #6d5cff); }
.stars { color: var(--c3); letter-spacing: 1px; }

/* Hero visual — framed, floating, drifts slightly with scroll */
.hero-visual {
  position: relative; border-radius: 22px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 50px 110px -34px rgba(0,0,0,0.7);
  animation: float 7s ease-in-out infinite;
  transform: translateY(calc(var(--scroll-y, 0px) * -0.04));
}
.hero-visual img { display: block; width: 100%; height: 100%; object-fit: cover; aspect-ratio: 4 / 3.15; }
.hero-visual .glass {
  position: absolute; left: 18px; bottom: 18px; right: 18px;
  display: flex; align-items: center; gap: 13px;
  padding: 14px 16px; border-radius: 15px;
  background: rgba(14,12,24,0.55); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12);
}
.hero-visual .glass .ic { width: 38px; height: 38px; border-radius: 11px; background: var(--grad); display: grid; place-items: center; flex: none; }
.hero-visual .glass .ic svg { width: 19px; height: 19px; }
.hero-visual .glass .meta { line-height: 1.3; }
.hero-visual .glass .meta b { display: block; font-size: 14px; color: #fff; font-weight: 600; }
.hero-visual .glass .meta span { font-size: 12px; color: var(--inv-mut); }
.hero-visual .glass .spark { margin-left: auto; width: 78px; height: 32px; flex: none; }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
@media (prefers-reduced-motion: reduce) { .hero-visual { animation: none; transform: none; } }

/* ===== LOGO STRIP ===== */
.logos {
  background: var(--ink-2); color: var(--inv-mut); border-top: 1px solid var(--line-dk);
  padding: 26px 0;
}
.logos .row { display: flex; align-items: center; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.logos .lead { font-size: 12.5px; letter-spacing: 0.04em; color: var(--text-faint); white-space: nowrap; }
.logos .set { display: flex; align-items: center; gap: 38px; flex-wrap: wrap; }
.logos .lg { font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.01em; color: #cfcce0; opacity: 0.62; transition: opacity 0.25s ease; }
.logos .lg:hover { opacity: 1; }

/* ===== SECTION SCAFFOLD (light body) ===== */
.sec { padding: 96px 0; }
.sec.tight { padding: 76px 0; }
.sec-head { max-width: 640px; }
.sec-head.center { margin: 0 auto; text-align: center; }
.sec-head h2 {
  font-family: var(--display); font-weight: 600; letter-spacing: -0.03em; line-height: 1.05;
  font-size: clamp(30px, 4.4vw, 46px); margin: 16px 0 0; color: var(--text); text-wrap: balance;
}
.sec-head p { margin: 16px 0 0; font-size: 17px; line-height: 1.55; color: var(--text-mut); }
.sec-head.center p { margin-left: auto; margin-right: auto; }

/* ===== FEATURES ===== */
.feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 46px; }
.feat {
  background: var(--paper); border: 1px solid var(--line); border-radius: 20px; padding: 28px;
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease;
}
.feat:hover { transform: translateY(-6px); box-shadow: var(--shadow); border-color: transparent; }
.feat .ic {
  width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center;
  background: var(--grad-soft); color: var(--c1); border: 1px solid rgba(109,92,255,0.16);
}
.feat .ic svg { width: 24px; height: 24px; }
.feat h3 { font-family: var(--display); font-weight: 600; font-size: 20px; letter-spacing: -0.01em; margin: 18px 0 0; color: var(--text); }
.feat p { margin: 9px 0 0; font-size: 14.5px; line-height: 1.55; color: var(--text-mut); }

/* ===== HOW IT WORKS ===== */
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 46px; counter-reset: step; }
.stepc { position: relative; padding-top: 26px; counter-increment: step; }
.stepc::before {
  content: counter(step, decimal-leading-zero);
  font-family: var(--display); font-weight: 600; font-size: 13px; letter-spacing: 0.04em;
  color: #fff; background: var(--grad); width: 38px; height: 38px; border-radius: 11px;
  display: grid; place-items: center;
}
.stepc h3 { font-family: var(--display); font-weight: 600; font-size: 20px; letter-spacing: -0.01em; margin: 18px 0 0; color: var(--text); }
.stepc p { margin: 9px 0 0; font-size: 14.5px; line-height: 1.55; color: var(--text-mut); }
.stepc .conn { position: absolute; top: 19px; left: 50px; right: -22px; height: 2px; background: linear-gradient(90deg, var(--line), transparent); }
.stepc:last-child .conn { display: none; }

/* ===== STATS BAND ===== */
.statband { background: var(--ink); color: var(--inv); }
.statgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.statc { padding: 8px 8px; border-left: 1px solid var(--line-dk); }
.statc:first-child { border-left: 0; }
.statc .v { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 5vw, 50px); letter-spacing: -0.03em; line-height: 1; }
.statc .v .grad-text { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.statc .k { margin: 12px 0 0; font-size: 13.5px; color: var(--inv-mut); line-height: 1.4; }

/* ===== TESTIMONIAL ===== */
.quote-sec { background: var(--paper-2); }
.quote-wrap { max-width: 880px; margin: 0 auto; text-align: center; }
.quote-mark { font-family: var(--display); font-size: 64px; line-height: 0.5; color: var(--c2); opacity: 0.5; }
.quote {
  font-family: var(--display); font-weight: 500; letter-spacing: -0.02em; line-height: 1.2;
  font-size: clamp(24px, 3.6vw, 38px); color: var(--text); margin: 22px 0 0; text-wrap: balance;
}
.quote em { font-style: normal; }
.cite { display: inline-flex; align-items: center; gap: 13px; margin-top: 30px; }
.cite .ava { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, var(--c1), var(--c3)); flex: none; }
.cite .who { text-align: left; line-height: 1.35; }
.cite .who b { display: block; font-size: 15px; font-weight: 600; color: var(--text); }
.cite .who span { font-size: 13.5px; color: var(--text-mut); }

/* ===== PRICING ===== */
.price-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 50px; align-items: stretch; }
.tier {
  position: relative; display: flex; flex-direction: column;
  background: var(--paper); border: 1px solid var(--line); border-radius: 22px; padding: 30px 28px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.tier:hover { transform: translateY(-4px); box-shadow: var(--shadow-sm); }
.tier.pop {
  background: var(--ink); color: var(--inv); border-color: transparent; transform: scale(1.035);
  box-shadow: 0 40px 90px -30px rgba(60,40,160,0.45);
}
.tier.pop:hover { transform: scale(1.035) translateY(-4px); }
.tier .badge {
  position: absolute; top: 18px; right: 18px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: #fff; padding: 5px 11px;
  border-radius: 999px; background: var(--grad);
}
.tier .tname { font-family: var(--display); font-weight: 600; font-size: 16px; letter-spacing: 0.01em; color: inherit; }
.tier .tname.mut { color: var(--text-mut); }
.tier.pop .tname { color: #c9bfff; }
.tier .pricerow { display: flex; align-items: flex-end; gap: 4px; margin: 14px 0 0; }
.tier .price { font-family: var(--display); font-weight: 600; font-size: 44px; letter-spacing: -0.03em; line-height: 1; }
.tier .per { font-size: 14px; color: var(--text-mut); padding-bottom: 6px; }
.tier.pop .per { color: var(--inv-mut); }
.tier .blurb { margin: 12px 0 0; font-size: 13.5px; line-height: 1.5; color: var(--text-mut); }
.tier.pop .blurb { color: var(--inv-mut); }
.tier ul { list-style: none; margin: 22px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.tier li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.4; color: var(--text); }
.tier.pop li { color: var(--inv); }
.tier li svg { width: 17px; height: 17px; flex: none; margin-top: 1px; color: var(--c2); }
.tier.pop li svg { color: #c9bfff; }
.tier .pick { margin-top: 26px; width: 100%; justify-content: center; }
.tier .pick.muted { color: var(--text); background: var(--paper-2); border: 1px solid var(--line); }
.tier .pick.muted:hover { background: #efedf7; }

/* ===== FINAL CTA ===== */
.final { padding: 30px 0 110px; }
.final-panel {
  position: relative; overflow: hidden; border-radius: 28px; padding: clamp(40px, 6vw, 74px) clamp(28px, 5vw, 60px);
  background: var(--ink); color: var(--inv); text-align: center; box-shadow: var(--shadow);
}
.final-panel::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(900px 400px at 20% -40%, rgba(109,92,255,0.4), transparent 60%),
              radial-gradient(700px 400px at 100% 130%, rgba(255,122,89,0.32), transparent 60%);
  pointer-events: none;
}
.final-panel > * { position: relative; z-index: 1; }
.final-panel h2 { font-family: var(--display); font-weight: 600; letter-spacing: -0.03em; line-height: 1.05; font-size: clamp(30px, 5vw, 50px); margin: 14px 0 0; text-wrap: balance; }
.final-panel p { margin: 16px auto 0; max-width: 46ch; font-size: 17px; line-height: 1.55; color: var(--inv-mut); }
.final-panel .ctas { display: inline-flex; flex-wrap: wrap; gap: 13px; justify-content: center; margin-top: 30px; }
.final-panel .note { margin-top: 18px; font-size: 13px; color: var(--text-faint); }

/* ===== FOOTER ===== */
.foot { border-top: 1px solid var(--line); padding: 54px 0 40px; }
.foot-grid { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: 30px; }
.foot .brand { color: var(--text); }
.foot .blurb { margin: 16px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--text-mut); max-width: 30ch; }
.foot h4 { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); margin: 0 0 14px; }
.foot ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.foot ul a { font-size: 14px; color: var(--text-mut); transition: color 0.2s ease; }
.foot ul a:hover { color: var(--text); }
.foot-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--line); font-size: 13px; color: var(--text-faint); }
.foot-bar .soc { display: flex; gap: 14px; }
.foot-bar .soc a { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); display: grid; place-items: center; color: var(--text-mut); transition: color 0.2s ease, border-color 0.2s ease; }
.foot-bar .soc a:hover { color: var(--text); border-color: var(--text-faint); }
.foot-bar .soc svg { width: 17px; height: 17px; }

/* ===== RESPONSIVE ===== */
@media (max-width: 940px) {
  .feat-grid, .steps, .price-grid { grid-template-columns: 1fr 1fr; }
  .statgrid { grid-template-columns: 1fr 1fr; }
  .tier.pop { transform: none; }
  .tier.pop:hover { transform: translateY(-4px); }
  .stepc .conn { display: none; }
}
@media (max-width: 820px) {
  .hero-grid { grid-template-columns: 1fr; gap: 40px; }
  .hero { padding: 116px 0 76px; }
  .hero-visual { order: -1; }
  .nav .links { display: none; }
  .foot-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
  .wrap { padding: 0 20px; }
  .feat-grid, .steps, .price-grid, .statgrid, .foot-grid { grid-template-columns: 1fr; }
  .sec { padding: 70px 0; }
  .statc { border-left: 0; border-top: 1px solid var(--line-dk); padding-top: 22px; }
  .statc:first-child { border-top: 0; padding-top: 8px; }
  .logos .row { justify-content: center; }
  .logos .set { gap: 26px; justify-content: center; }
  .ctas .btn, .final-panel .ctas .btn { flex: 1 1 auto; justify-content: center; }
}
`.trim()

const HTML = `
<header class="nav" id="nav">
  <div class="wrap row">
    <a class="brand" href="#top">
      <span class="mark">
        <svg viewBox="0 0 24 24" fill="none"><path d="M5 14.5 9 9l3.5 4L19 5.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      Cadence
    </a>
    <nav class="links">
      <a href="#features">Features</a>
      <a href="#how">How it works</a>
      <a href="#pricing">Pricing</a>
      <a href="#story">Customers</a>
    </nav>
    <a class="cta" href="#start">Start free</a>
  </div>
</header>

<main id="top">
  <!-- HERO -->
  <section class="hero">
    <div class="wrap">
      <div class="hero-grid">
        <div class="hero-copy reveal" data-reveal="left">
          <span class="eyebrow on-dark">Planning for fast teams</span>
          <h1>Ship in <span class="grad-text">rhythm</span>, not in chaos.</h1>
          <p class="sub">Cadence turns scattered docs, tickets, and standups into one living plan — so your team always knows what's next and why it matters.</p>
          <div class="ctas">
            <a class="btn btn-primary" href="#start">
              Start free
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>
            <a class="btn btn-ghost" href="#how">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M10 9.5v5l4-2.5-4-2.5Z" fill="currentColor"/></svg>
              Watch the 2-min tour
            </a>
          </div>
          <div class="trust">
            <span class="avatars"><span></span><span></span><span></span><span></span></span>
            <span><span class="stars">★★★★★</span> &nbsp;Loved by <b class="num">12,000+</b> teams at high-growth startups</span>
          </div>
        </div>

        <div class="hero-visual reveal" data-reveal="right">
          <img src="assets/landing-hero.jpg" alt="Cadence planning surface">
          <div class="glass">
            <span class="ic">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 13l5 5L20 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="meta">
              <b>Sprint 24 · on track</b>
              <span>32 of 38 issues closed</span>
            </span>
            <svg class="spark" viewBox="0 0 78 32"><polyline points="0,26 13,22 26,24 39,15 52,17 65,8 78,4" fill="none" stroke="url(#sline)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="sline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d5cff"/><stop offset="1" stop-color="#ff7a59"/></linearGradient></defs></svg>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- LOGO STRIP -->
  <section class="logos">
    <div class="wrap row">
      <span class="lead">Trusted by teams shipping daily</span>
      <div class="set">
        <span class="lg">Northwind</span>
        <span class="lg">Lumen</span>
        <span class="lg">Drift&amp;Co</span>
        <span class="lg">Polaris</span>
        <span class="lg">Vega</span>
        <span class="lg">Hatch</span>
      </div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="sec" id="features">
    <div class="wrap">
      <div class="sec-head reveal">
        <span class="eyebrow">Everything in one place</span>
        <h2>One plan your whole team can actually keep up with.</h2>
        <p>Stop stitching the roadmap together by hand. Cadence keeps planning, execution, and updates in sync — automatically.</p>
      </div>
      <div class="feat-grid">
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.9"/><path d="M3 9h18M8 4v16" stroke="currentColor" stroke-width="1.9"/></svg>
          </span>
          <h3>Adaptive roadmaps</h3>
          <p>Drag a date and every dependency reflows. Your roadmap stays honest without a single manual edit.</p>
        </div>
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>
          </span>
          <h3>Automations that think</h3>
          <p>Route work, nudge owners, and flag slippage before it shows up in your burndown. No brittle if-this-then-that.</p>
        </div>
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <h3>Live velocity insight</h3>
          <p>Real burndown, cycle time, and forecast — recomputed as work moves, never a stale weekly export.</p>
        </div>
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.2a3 3 0 0 1 0 5.6M21 19a5 5 0 0 0-4-4.9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
          </span>
          <h3>Standups, summarized</h3>
          <p>Async updates roll up into a single readable digest — so meetings get shorter and context gets shared.</p>
        </div>
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <h3>Built for trust</h3>
          <p>SOC 2 Type II, SSO, granular roles, and audit logs. Enterprise-ready from your very first sprint.</p>
        </div>
        <div class="feat reveal">
          <span class="ic">
            <svg viewBox="0 0 24 24" fill="none"><path d="M10 4 3 12l7 8M14 4l7 8-7 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <h3>120+ integrations</h3>
          <p>Two-way sync with GitHub, Linear, Slack, Figma, and the rest of your stack. Cadence fits where you already work.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="sec tight" id="how" style="background:var(--paper-2)">
    <div class="wrap">
      <div class="sec-head center reveal">
        <span class="eyebrow">How it works</span>
        <h2>From kickoff to shipped in three steps.</h2>
      </div>
      <div class="steps">
        <div class="stepc reveal">
          <div class="conn"></div>
          <h3>Connect your tools</h3>
          <p>Link GitHub, Linear, and Slack in a click. Cadence imports your work and maps every dependency automatically.</p>
        </div>
        <div class="stepc reveal">
          <div class="conn"></div>
          <h3>Plan the cadence</h3>
          <p>Set goals and timelines once. Drag to re-sequence and watch the plan rebalance across the whole team.</p>
        </div>
        <div class="stepc reveal">
          <h3>Ship on rhythm</h3>
          <p>Automations keep work moving and everyone aligned — while you watch velocity climb, in real time.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- STATS BAND -->
  <section class="sec statband">
    <div class="wrap">
      <div class="statgrid">
        <div class="statc reveal"><div class="v num"><span class="grad-text">3.4×</span></div><div class="k">faster planning cycles after switching to Cadence</div></div>
        <div class="statc reveal"><div class="v num">41%</div><div class="k">fewer status meetings across the average team</div></div>
        <div class="statc reveal"><div class="v num">12k+</div><div class="k">product teams plan their week in Cadence</div></div>
        <div class="statc reveal"><div class="v num">99.98%</div><div class="k">uptime over the trailing twelve months</div></div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIAL -->
  <section class="sec quote-sec" id="story">
    <div class="wrap">
      <div class="quote-wrap reveal">
        <div class="quote-mark">&ldquo;</div>
        <blockquote class="quote">Cadence replaced three tools and a weekly meeting. We <em class="grad-text">cut our planning overhead in half</em> and shipped our biggest release two weeks early.</blockquote>
        <div class="cite">
          <span class="ava"></span>
          <span class="who">
            <b>Maya Okonkwo</b>
            <span>VP Engineering, Polaris</span>
          </span>
        </div>
      </div>
    </div>
  </section>

  <!-- PRICING -->
  <section class="sec" id="pricing">
    <div class="wrap">
      <div class="sec-head center reveal">
        <span class="eyebrow">Pricing</span>
        <h2>Simple plans that scale with your team.</h2>
        <p>Start free forever. Upgrade when you're ready — no per-seat surprises, cancel anytime.</p>
      </div>
      <div class="price-grid">
        <div class="tier reveal">
          <div class="tname mut">Starter</div>
          <div class="pricerow"><span class="price num">$0</span><span class="per">/ forever</span></div>
          <p class="blurb">For small teams getting their rhythm.</p>
          <ul>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Up to 5 members</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> 2 active roadmaps</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Core integrations</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Community support</li>
          </ul>
          <a class="btn btn-dark pick muted" href="#start">Get started</a>
        </div>

        <div class="tier pop reveal" data-reveal="scale">
          <span class="badge">Most popular</span>
          <div class="tname">Team</div>
          <div class="pricerow"><span class="price num">$12</span><span class="per">/ user · month</span></div>
          <p class="blurb">For growing teams shipping every week.</p>
          <ul>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Unlimited members</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Unlimited roadmaps</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Automations &amp; velocity insight</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> 120+ integrations</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Priority support</li>
          </ul>
          <a class="btn btn-primary pick" href="#start">Start 14-day trial</a>
        </div>

        <div class="tier reveal">
          <div class="tname mut">Enterprise</div>
          <div class="pricerow"><span class="price num">Custom</span></div>
          <p class="blurb">For organizations that need control.</p>
          <ul>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> SSO &amp; SCIM provisioning</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Advanced roles &amp; audit logs</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Dedicated success manager</li>
            <li><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg> 99.99% uptime SLA</li>
          </ul>
          <a class="btn btn-dark pick muted" href="#start">Talk to sales</a>
        </div>
      </div>
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="final">
    <div class="wrap">
      <div class="final-panel reveal" data-reveal="scale">
        <span class="eyebrow on-dark" style="justify-content:center">Get started in minutes</span>
        <h2>Find your team's cadence.</h2>
        <p>Join 12,000+ teams who plan, ship, and stay in sync without the busywork. Free to start — no credit card required.</p>
        <div class="ctas">
          <a class="btn btn-primary" href="#start" id="start">
            Start free
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <a class="btn btn-ghost" href="#story">Book a demo</a>
        </div>
        <p class="note">14-day Team trial · cancel anytime · setup in under 10 minutes</p>
      </div>
    </div>
  </section>
</main>

<!-- FOOTER -->
<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="reveal">
        <a class="brand" href="#top">
          <span class="mark"><svg viewBox="0 0 24 24" fill="none"><path d="M5 14.5 9 9l3.5 4L19 5.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          Cadence
        </a>
        <p class="blurb">The planning tool for fast teams. Plan in rhythm, ship on time, stay in sync.</p>
      </div>
      <div class="reveal">
        <h4>Product</h4>
        <ul><li><a href="#features">Features</a></li><li><a href="#pricing">Pricing</a></li><li><a href="#how">Integrations</a></li><li><a href="#start">Changelog</a></li></ul>
      </div>
      <div class="reveal">
        <h4>Company</h4>
        <ul><li><a href="#story">Customers</a></li><li><a href="#start">About</a></li><li><a href="#start">Careers</a></li><li><a href="#start">Blog</a></li></ul>
      </div>
      <div class="reveal">
        <h4>Resources</h4>
        <ul><li><a href="#start">Docs</a></li><li><a href="#start">Help center</a></li><li><a href="#start">Security</a></li><li><a href="#start">Status</a></li></ul>
      </div>
    </div>
    <div class="foot-bar">
      <span>© <span class="num">2026</span> Cadence Labs, Inc. · Privacy · Terms</span>
      <span class="soc">
        <a href="#start" aria-label="X"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4l16 16M20 4 4 20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></a>
        <a href="#start" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="none"><path d="M9 19c-4 1.4-4-2.2-6-2.6m12 4.6v-3.6a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.6a5 5 0 0 0-1.4-3.5 4.7 4.7 0 0 0-.1-3.5s-1.1-.3-3.6 1.3a12.4 12.4 0 0 0-6.4 0C5.6 1.6 4.5 1.9 4.5 1.9A4.7 4.7 0 0 0 4.4 5.4 5 5 0 0 0 3 9c0 5 3 6.2 5.9 6.6a3 3 0 0 0-.8 2.3V21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <a href="#start" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 17v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></a>
      </span>
    </div>
  </div>
</footer>
`.trim()

const JS = `
// Solidify the nav once the hero scrolls past a threshold.
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var ticking = false;
  function update() {
    ticking = false;
    if ((window.scrollY || window.pageYOffset || 0) > 48) nav.classList.add('stuck');
    else nav.classList.remove('stuck');
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

// Smooth-scroll in-page anchor links, accounting for the fixed nav height.
(function () {
  var links = document.querySelectorAll('a[href^="#"]');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function (e) {
      var id = (this.getAttribute('href') || '').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0) - 78;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }
})();
`.trim()

export const landingPage: Template = {
  id: 'landing-page',
  kind: 'page',
  name: 'Landing Page',
  tagline: 'A modern SaaS product launch page',
  categories: ['Marketing'],
  audiences: ['marketing', 'founders', 'product', 'startups'],
  description:
    'A studio-grade SaaS landing page for a fictional product (Cadence): a near-black hero with a framed, floating glass-wave visual that melts into a clean light body, an indigo→violet→coral accent, and a sticky translucent nav that solidifies on scroll. Full funnel — hero with dual CTAs and a trust line, a trusted-by logo strip, a 3-up feature grid with hand-rolled SVG icons and hover lift, a 3-step "how it works" row, a dark stats band, a large testimonial, a 3-tier pricing table with a highlighted "Most popular" plan, a glowing final CTA panel, and a footer. Tabular figures, scroll-reveals, and tasteful micro-interactions throughout. Swap the copy and ship your own launch.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0b0b12',
  assets: ['landing-hero.jpg'],
  notes:
    'Near-black hero → light body; the accent is the --c1/--c2/--c3 indigo→violet→coral gradient (--grad). Recolor the whole page by editing those three tokens. The nav gets `.stuck` (set in page.js past 48px) to flip from translucent-dark to light-glass — keep both states styled if you reskin. The hero image floats via a CSS keyframe + a subtle scroll parallax (transform keyed off var(--scroll-y)); it self-disables under prefers-reduced-motion. Section reveals key off `.reveal` (data-reveal="left|right|scale" for direction). All figures use .num (tabular). The highlighted pricing tier is `.tier.pop`. To add a feature/tier, copy a `.feat` / `.tier`.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#ffffff',
  },
}
