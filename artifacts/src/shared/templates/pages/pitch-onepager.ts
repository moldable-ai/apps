import type { Template } from '../types'

// A dark, confident, investor-facing startup pitch one-pager for a fictional
// company ("Atlas — autonomous data infrastructure"). One electric accent, an
// off-white ink, hairline dividers, generous negative space. A thin running
// progress bar at the top is tied to var(--scroll). Every visual — the TAM/SAM/SOM
// concentric rings, the use-of-funds donut, traction metrics, the product mock —
// is hand-rolled SVG/CSS (no chart libraries). Uses assets/pitch-product.jpg for
// the framed, glowing product visual.

const CSS = `
:root {
  --bg: #0a0c10;
  --bg-2: #0d1016;
  --panel: #11151c;
  --line: rgba(255,255,255,0.08);
  --line-2: rgba(255,255,255,0.14);
  --ink: #f3f5f8;
  --mut: #99a0ae;
  --faint: #5d6470;
  --acc: #5b8cff;
  --acc-soft: rgba(91,140,255,0.14);
  --acc-glow: rgba(91,140,255,0.55);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 620px at 78% -8%, rgba(91,140,255,0.13), transparent 62%),
    radial-gradient(900px 700px at -6% 30%, rgba(91,140,255,0.05), transparent 60%),
    var(--bg);
  color: var(--ink);
}
.num { font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }

/* running progress bar tied to scroll */
.progress {
  position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 50;
  background: rgba(255,255,255,0.06);
}
.progress::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: calc(var(--scroll, 0) * 100%);
  background: linear-gradient(90deg, var(--acc), #9db8ff);
  box-shadow: 0 0 14px var(--acc-glow);
}

.wrap { max-width: 1060px; margin: 0 auto; padding: 0 28px; }

/* shared section scaffolding */
.section { padding: clamp(64px, 9vw, 132px) 0; border-top: 1px solid var(--line); }
.eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--acc); margin-bottom: 22px;
}
.eyebrow::before { content: ''; width: 26px; height: 1px; background: var(--acc); opacity: 0.7; }
h2.sec-title {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(28px, 3.9vw, 44px); line-height: 1.08; letter-spacing: -0.018em;
  margin: 0; max-width: 20ch;
}
.sec-lead { color: var(--mut); font-size: clamp(16px, 1.7vw, 19px); line-height: 1.55; max-width: 56ch; margin: 18px 0 0; }

/* ===== top nav ===== */
.nav {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  padding: 26px 0; max-width: 1060px; margin: 0 auto; padding-left: 28px; padding-right: 28px;
}
.wordmark { display: inline-flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; font-size: 20px; letter-spacing: -0.01em; }
.mark { width: 26px; height: 26px; }
.nav .raise-pill {
  font-size: 12.5px; font-weight: 600; color: var(--ink);
  border: 1px solid var(--line-2); border-radius: 999px; padding: 8px 16px;
  background: rgba(255,255,255,0.02);
}

/* ===== HERO ===== */
.hero { padding: clamp(34px, 6vw, 70px) 0 clamp(60px, 8vw, 104px); }
.hero .tagchip {
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 12.5px; font-weight: 600; color: var(--mut);
  border: 1px solid var(--line); border-radius: 999px; padding: 7px 15px; margin-bottom: 30px;
}
.hero .tagchip .live { width: 7px; height: 7px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 0 0 var(--acc-glow); animation: pulse 2.4s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(91,140,255,0.5)} 70%{box-shadow:0 0 0 8px rgba(91,140,255,0)} 100%{box-shadow:0 0 0 0 rgba(91,140,255,0)} }
.hero h1 {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(38px, 6.4vw, 74px); line-height: 1.05; letter-spacing: -0.02em;
  margin: 0; max-width: 18ch; text-wrap: balance;
}
.hero h1 .accent { color: var(--acc); }
.hero .vp { color: var(--mut); font-size: clamp(17px, 1.9vw, 20px); line-height: 1.58; max-width: 50ch; margin: 28px 0 0; }
.hero-meta { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; margin-top: 40px; }
.raise-line {
  display: inline-flex; align-items: baseline; gap: 12px;
  font-family: var(--display); font-weight: 600; font-size: clamp(20px, 2.6vw, 26px); letter-spacing: -0.02em;
}
.raise-line .amt { color: var(--acc); }
.raise-line .lbl { font-family: var(--body); font-weight: 500; font-size: 14px; color: var(--mut); letter-spacing: 0; }
.hero-stats { display: flex; gap: 0; }
.hero-stats .hs { padding: 0 22px; border-left: 1px solid var(--line); }
.hero-stats .hs:first-child { padding-left: 0; border-left: 0; }
.hero-stats .hs .n { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -0.02em; }
.hero-stats .hs .k { font-size: 12px; color: var(--faint); margin-top: 3px; }

/* ===== PROBLEM / SOLUTION ===== */
.ps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 88px); align-items: start; }
.point-list { margin: 30px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 0; }
.point-list li { padding: 22px 0; border-top: 1px solid var(--line); display: flex; gap: 18px; }
.point-list li:first-child { border-top: 0; padding-top: 0; }
.point-list .idx { font-family: var(--display); font-weight: 600; font-size: 14px; color: var(--faint); flex: none; width: 26px; padding-top: 2px; }
.point-list .pt-h { font-weight: 600; font-size: 17px; color: var(--ink); }
.point-list .pt-b { color: var(--mut); font-size: 14.5px; line-height: 1.5; margin-top: 5px; }
.sol-card {
  border: 1px solid var(--line); border-radius: 20px; padding: 32px;
  background: linear-gradient(180deg, rgba(91,140,255,0.06), rgba(91,140,255,0.01));
}
.sol-card h3 { font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; margin: 0 0 14px; }
.sol-card p { color: var(--mut); font-size: 15px; line-height: 1.6; margin: 0 0 22px; }
.sol-checks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 13px; }
.sol-checks li { display: flex; gap: 12px; align-items: flex-start; font-size: 14.5px; color: var(--ink); line-height: 1.45; }
.sol-checks li::before {
  content: ''; flex: none; width: 18px; height: 18px; margin-top: 1px; border-radius: 6px;
  background: var(--acc-soft);
  -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M9.55 17.6 4.4 12.45l1.4-1.4 3.75 3.7 8.25-8.25 1.4 1.4z'/></svg>") center / 14px no-repeat;
  mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M9.55 17.6 4.4 12.45l1.4-1.4 3.75 3.7 8.25-8.25 1.4 1.4z'/></svg>") center / 14px no-repeat;
  background-color: var(--acc); border-radius: 6px;
}

/* ===== PRODUCT ===== */
.product-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; flex-wrap: wrap; margin-bottom: 44px; }
.frame {
  position: relative; border-radius: 22px; overflow: hidden;
  border: 1px solid var(--line-2);
  box-shadow: 0 50px 120px -50px rgba(91,140,255,0.55), 0 30px 80px -40px rgba(0,0,0,0.8);
}
.frame::before {
  content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none;
  background: linear-gradient(180deg, rgba(10,12,16,0) 55%, rgba(10,12,16,0.5) 100%);
}
.frame::after {
  content: ''; position: absolute; inset: -1px; z-index: 3; pointer-events: none; border-radius: 22px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.10);
}
.frame .glow {
  position: absolute; left: 50%; top: 30%; width: 70%; height: 60%; transform: translateX(-50%);
  background: radial-gradient(closest-side, var(--acc-glow), transparent 70%); filter: blur(60px); opacity: 0.5; z-index: 0;
}
.frame img { display: block; width: 100%; height: auto; position: relative; z-index: 1; }
.frame .barlbl {
  position: absolute; left: 18px; bottom: 16px; z-index: 4;
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; color: var(--ink);
  background: rgba(10,12,16,0.6); border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px;
  backdrop-filter: blur(8px);
}
.frame .barlbl .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--acc); }
.product-pills { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 26px; }
.ppill { font-size: 13px; font-weight: 500; color: var(--mut); border: 1px solid var(--line); border-radius: 10px; padding: 9px 14px; }
.ppill b { color: var(--ink); font-weight: 600; }

/* ===== TRACTION (big hairline-divided metrics) ===== */
.traction-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 8px; }
.tract { padding: 8px 28px; border-left: 1px solid var(--line); }
.tract:first-child { padding-left: 0; border-left: 0; }
.tract .big { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 5.2vw, 58px); letter-spacing: -0.03em; line-height: 1; }
.tract .delta { font-size: 13px; font-weight: 600; color: var(--acc); margin-top: 12px; display: inline-flex; align-items: center; gap: 6px; }
.tract .delta::before { content: '▲'; font-size: 8px; }
.tract .k { font-size: 13.5px; color: var(--mut); margin-top: 8px; line-height: 1.4; }

/* ===== MARKET (concentric rings) ===== */
.market-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 80px); align-items: center; }
.rings { width: 100%; max-width: 380px; height: auto; display: block; margin: 0 auto; overflow: visible; }
.rings circle { transform-origin: 250px 250px; }
.rings .ring-fill { transition: transform 1.1s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease; transform: scale(0.4); opacity: 0; }
.reveal.in .rings .ring-fill { transform: scale(1); opacity: 1; }
.reveal.in .rings .ring-fill.r2 { transition-delay: 0.12s; }
.reveal.in .rings .ring-fill.r3 { transition-delay: 0.24s; }
.market-legend { display: flex; flex-direction: column; gap: 0; }
.market-legend .mrow { padding: 20px 0; border-top: 1px solid var(--line); display: flex; align-items: baseline; gap: 16px; }
.market-legend .mrow:first-child { border-top: 0; padding-top: 0; }
.market-legend .tag { font-family: var(--display); font-weight: 600; font-size: 13px; letter-spacing: 0.04em; color: var(--faint); flex: none; width: 48px; }
.market-legend .v { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.2vw, 34px); letter-spacing: -0.02em; }
.market-legend .d { color: var(--mut); font-size: 14px; margin-top: 4px; line-height: 1.45; }
.market-legend .mrow .txt { flex: 1; }

/* ===== BUSINESS MODEL ===== */
.model-line { font-family: var(--display); font-weight: 500; font-size: clamp(22px, 3.2vw, 34px); line-height: 1.28; letter-spacing: -0.02em; max-width: 22ch; margin: 0 0 50px; }
.model-line .hl { color: var(--acc); }
.tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.tier { border: 1px solid var(--line); border-radius: 18px; padding: 26px; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.3s ease, transform 0.3s ease; }
.tier:hover { border-color: var(--line-2); transform: translateY(-3px); }
.tier.feature { border-color: rgba(91,140,255,0.45); background: linear-gradient(180deg, rgba(91,140,255,0.07), rgba(91,140,255,0.01)); }
.tier .name { font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--mut); }
.tier.feature .name { color: var(--acc); }
.tier .price { font-family: var(--display); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; margin: 8px 0 2px; }
.tier .price small { font-family: var(--body); font-weight: 500; font-size: 13px; color: var(--faint); letter-spacing: 0; }
.tier .desc { color: var(--mut); font-size: 13.5px; line-height: 1.5; margin-top: 8px; }

/* ===== TEAM ===== */
.team-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(24px, 4vw, 44px); margin-top: 8px; }
.founder { display: flex; flex-direction: column; gap: 16px; }
.avatar {
  width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--display); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; color: var(--ink);
  border: 1px solid var(--line-2);
  position: relative; overflow: hidden;
}
.avatar::after { content: ''; position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 1px 0 rgba(255,255,255,0.12); }
.avatar.a1 { background: radial-gradient(120% 120% at 30% 20%, rgba(91,140,255,0.5), rgba(91,140,255,0.08)); }
.avatar.a2 { background: radial-gradient(120% 120% at 30% 20%, rgba(123,97,255,0.5), rgba(123,97,255,0.08)); }
.avatar.a3 { background: radial-gradient(120% 120% at 30% 20%, rgba(46,196,182,0.5), rgba(46,196,182,0.08)); }
.founder .fname { font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.01em; }
.founder .frole { font-size: 13px; font-weight: 600; color: var(--acc); margin-top: 2px; }
.founder .fcred { color: var(--mut); font-size: 14px; line-height: 1.5; margin-top: 8px; }

/* ===== THE ASK (raise + use-of-funds donut) ===== */
.ask-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: clamp(40px, 6vw, 80px); align-items: center; }
.ask-amt { font-family: var(--display); font-weight: 600; font-size: clamp(56px, 11vw, 116px); line-height: 0.9; letter-spacing: -0.04em; }
.ask-amt .sub { display: block; font-family: var(--body); font-weight: 500; font-size: clamp(15px, 1.8vw, 18px); color: var(--mut); letter-spacing: 0; margin-top: 18px; max-width: 36ch; line-height: 1.55; }
.use-wrap { display: flex; align-items: center; gap: clamp(20px, 3vw, 36px); }
.donut { width: clamp(170px, 24vw, 210px); height: auto; flex: none; }
.donut .seg-arc { transition: stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1); }
.donut.reveal-donut .seg-arc { stroke-dashoffset: 100; }
.reveal.in .donut .seg-arc { stroke-dashoffset: var(--off); }
.donut text.c { font-family: var(--display); }
.use-legend { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.use-legend .urow { display: flex; align-items: center; gap: 11px; font-size: 14px; color: var(--mut); }
.use-legend .urow i { width: 11px; height: 11px; border-radius: 3px; flex: none; }
.use-legend .urow b { color: var(--ink); margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 600; }

/* ===== FOOTER / CONTACT ===== */
.foot { padding: clamp(70px, 10vw, 130px) 0 90px; border-top: 1px solid var(--line); text-align: center; }
.foot .big-cta { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 5vw, 56px); letter-spacing: -0.03em; line-height: 1.04; margin: 0; }
.foot .em {
  display: inline-flex; align-items: center; gap: 11px; margin-top: 30px;
  font-size: clamp(16px, 2vw, 20px); font-weight: 500; color: var(--acc);
  border-bottom: 1px solid var(--acc-soft); padding-bottom: 4px; transition: border-color 0.25s ease;
}
.foot .em:hover { border-color: var(--acc); }
.foot .em::before {
  content: ''; width: 17px; height: 17px; background-color: var(--acc);
  -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13A1.5 1.5 0 0 1 20.5 20h-17A1.5 1.5 0 0 1 2 18.5zm2.2.5L12 11.2 19.8 6zM20 7.6l-7.45 4.97a1 1 0 0 1-1.1 0L4 7.6V18h16z'/></svg>") center / contain no-repeat;
  mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13A1.5 1.5 0 0 1 20.5 20h-17A1.5 1.5 0 0 1 2 18.5zm2.2.5L12 11.2 19.8 6zM20 7.6l-7.45 4.97a1 1 0 0 1-1.1 0L4 7.6V18h16z'/></svg>") center / contain no-repeat;
}
.foot .row { display: flex; gap: 26px; justify-content: center; flex-wrap: wrap; margin-top: 34px; color: var(--faint); font-size: 13px; }
.foot .row span { display: inline-flex; align-items: center; gap: 8px; }
.foot .row span::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--faint); }
.foot .row span:first-child::before { display: none; }

/* ===== RESPONSIVE ===== */
@media (max-width: 820px) {
  .nav { padding-top: 20px; padding-bottom: 20px; }
  .nav .raise-pill { display: none; }
  .ps-grid, .market-grid, .ask-grid { grid-template-columns: 1fr; gap: 44px; }
  .traction-grid { grid-template-columns: repeat(2, 1fr); gap: 8px 0; }
  .tract { padding: 18px 0; border-left: 0; border-top: 1px solid var(--line); }
  .tract:first-child { border-top: 0; }
  .tract:nth-child(2) { border-top: 0; }
  .tract:nth-child(even) { padding-left: 22px; border-left: 1px solid var(--line); border-top: 1px solid var(--line); }
  .tiers, .team-grid { grid-template-columns: 1fr; gap: 16px; }
  .use-wrap { flex-direction: column; align-items: flex-start; }
  .donut { width: clamp(160px, 50vw, 200px); }
  .hero-stats { width: 100%; }
}
@media (max-width: 480px) {
  .traction-grid { grid-template-columns: 1fr; }
  .tract, .tract:nth-child(even) { padding: 16px 0; border-left: 0; border-top: 1px solid var(--line); }
  .tract:first-child { border-top: 0; }
  .hero-meta { gap: 22px; }
}
`.trim()

const HTML = `
<div class="progress" aria-hidden="true"></div>

<nav class="nav reveal" data-reveal="none">
  <div class="wordmark">
    <svg class="mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" stroke="var(--acc)" stroke-width="1.5" opacity="0.5"/>
      <path d="M16 7 L25 24 H7 Z" fill="var(--acc)"/>
      <path d="M16 14.5 L20.2 22 H11.8 Z" fill="var(--bg)"/>
    </svg>
    Atlas
  </div>
  <span class="raise-pill">Seed · Investor Brief</span>
</nav>

<header class="wrap hero">
  <div class="reveal">
    <span class="tagchip"><span class="live"></span> Now raising — open round</span>
  </div>
  <h1 class="reveal">Autonomous data<br>infrastructure for the<br><span class="accent">AI-native</span> stack.</h1>
  <p class="vp reveal">Atlas runs your data pipelines like a self-driving system — provisioning, healing, and optimizing themselves, so teams ship reliable data products without an army of engineers.</p>
  <div class="hero-meta reveal">
    <div class="raise-line"><span class="amt num">Raising $4M</span> <span class="lbl">Seed</span></div>
    <div class="hero-stats">
      <div class="hs"><div class="n num">42</div><div class="k">design partners</div></div>
      <div class="hs"><div class="n num">$1.4M</div><div class="k">ARR run-rate</div></div>
      <div class="hs"><div class="n num">3.1×</div><div class="k">net retention</div></div>
    </div>
  </div>
</header>

<section class="section">
  <div class="wrap">
    <div class="ps-grid">
      <div class="reveal" data-reveal="left">
        <div class="eyebrow">The problem</div>
        <h2 class="sec-title">Modern data stacks are powerful — and impossibly brittle.</h2>
        <ul class="point-list">
          <li><span class="idx num">01</span><div><div class="pt-h">Pipelines break silently</div><div class="pt-b">A schema change upstream cascades into bad dashboards and broken models — discovered hours later, by the customer.</div></div></li>
          <li><span class="idx num">02</span><div><div class="pt-h">Headcount doesn't scale</div><div class="pt-b">Every new source means another integration to babysit. Data teams spend 60% of their time on maintenance, not insight.</div></div></li>
          <li><span class="idx num">03</span><div><div class="pt-h">Cloud spend runs wild</div><div class="pt-b">Idle warehouses and unbounded jobs quietly burn six figures a year with no system watching the meter.</div></div></li>
        </ul>
      </div>
      <div class="reveal" data-reveal="right">
        <div class="eyebrow">The solution</div>
        <div class="sol-card">
          <h3>A control plane that runs itself</h3>
          <p>Atlas sits over your warehouse and ingestion layer and operates it autonomously — an always-on engineer that watches every pipeline, predicts failures before they ship, and tunes cost in real time.</p>
          <ul class="sol-checks">
            <li>Self-healing pipelines recover from schema drift automatically</li>
            <li>Predictive anomaly detection flags bad data before it lands</li>
            <li>Autonomous cost governor right-sizes compute on every run</li>
            <li>One config — connects to Snowflake, BigQuery, Databricks, dbt</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="product-head reveal">
      <div>
        <div class="eyebrow">The product</div>
        <h2 class="sec-title">One console for every pipeline you run.</h2>
      </div>
      <p class="sec-lead" style="margin:0">Live lineage, health, and spend across your entire stack — with an autonomous agent acting on what it sees.</p>
    </div>
    <figure class="frame reveal" data-reveal="scale" style="margin:0">
      <span class="glow"></span>
      <img src="assets/pitch-product.jpg" alt="Atlas product console">
      <span class="barlbl"><span class="dot"></span> Atlas Console · live</span>
    </figure>
    <div class="product-pills reveal">
      <span class="ppill"><b>Lineage graph</b> — every dependency, end to end</span>
      <span class="ppill"><b>Agent timeline</b> — what Atlas fixed, and why</span>
      <span class="ppill"><b>Spend governor</b> — cost capped per workload</span>
      <span class="ppill"><b>SLA monitors</b> — freshness you can promise</span>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal">
      <div class="eyebrow">Traction</div>
      <h2 class="sec-title">Growing fast, with the numbers to back it.</h2>
    </div>
    <div class="traction-grid reveal">
      <div class="tract"><div class="big num">$1.4M</div><div class="delta num">28% MoM</div><div class="k">ARR run-rate, up from $190K a year ago</div></div>
      <div class="tract"><div class="big num">42</div><div class="delta num">11 this quarter</div><div class="k">design partners, incl. 4 public companies</div></div>
      <div class="tract"><div class="big num">137%</div><div class="delta num">net new logos</div><div class="k">net revenue retention across cohorts</div></div>
      <div class="tract"><div class="big num">9.4B</div><div class="delta num">2.1B last month</div><div class="k">pipeline runs orchestrated to date</div></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal" style="margin-bottom:48px">
      <div class="eyebrow">The market</div>
      <h2 class="sec-title">A category forming at the seams of the modern data stack.</h2>
    </div>
    <div class="market-grid">
      <div class="reveal" data-reveal="left">
        <svg class="rings" viewBox="0 0 500 500" aria-hidden="true">
          <circle class="ring-fill r1" cx="250" cy="250" r="240" fill="rgba(91,140,255,0.09)" stroke="rgba(91,140,255,0.28)" stroke-width="1"/>
          <circle class="ring-fill r2" cx="250" cy="250" r="158" fill="rgba(91,140,255,0.16)" stroke="rgba(91,140,255,0.42)" stroke-width="1"/>
          <circle class="ring-fill r3" cx="250" cy="250" r="78" fill="rgba(91,140,255,0.42)" stroke="rgba(157,184,255,0.8)" stroke-width="1.5"/>
          <text x="250" y="48" text-anchor="middle" fill="var(--mut)" font-size="17" font-weight="600" font-family="var(--display)">TAM</text>
          <text x="250" y="78" text-anchor="middle" fill="var(--ink)" font-size="24" font-weight="600" font-family="var(--display)">$84B</text>
          <text x="250" y="172" text-anchor="middle" fill="var(--mut)" font-size="15" font-weight="600" font-family="var(--display)">SAM</text>
          <text x="250" y="198" text-anchor="middle" fill="var(--ink)" font-size="20" font-weight="600" font-family="var(--display)">$19B</text>
          <text x="250" y="246" text-anchor="middle" fill="#dce6ff" font-size="13" font-weight="600" font-family="var(--display)">SOM</text>
          <text x="250" y="268" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="600" font-family="var(--display)">$1.2B</text>
        </svg>
      </div>
      <div class="market-legend reveal" data-reveal="right">
        <div class="mrow"><span class="tag">TAM</span><div class="txt"><div class="v num">$84B</div><div class="d">Global spend on data infrastructure, observability, and ops tooling by 2028.</div></div></div>
        <div class="mrow"><span class="tag">SAM</span><div class="txt"><div class="v num">$19B</div><div class="d">Cloud-native teams on Snowflake, BigQuery & Databricks who own production pipelines.</div></div></div>
        <div class="mrow"><span class="tag">SOM</span><div class="txt"><div class="v num">$1.2B</div><div class="d">Mid-market & enterprise data teams reachable in our first three years, bottoms-up.</div></div></div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal">
      <div class="eyebrow">Business model</div>
    </div>
    <p class="model-line reveal">Usage-based pricing per active pipeline — we make money <span class="hl">when our customers' data flows</span>, and grow as they do.</p>
    <div class="tiers reveal">
      <div class="tier"><div class="name">Starter</div><div class="price num">$0<small> / mo</small></div><div class="desc">Up to 5 pipelines. Self-healing + lineage. For teams kicking the tires.</div></div>
      <div class="tier feature"><div class="name">Growth</div><div class="price num">$1,800<small> / mo</small></div><div class="desc">Unlimited pipelines, cost governor, anomaly detection, SLA monitors. Our land-and-expand core.</div></div>
      <div class="tier"><div class="name">Enterprise</div><div class="price num">Custom</div><div class="desc">SSO, VPC deploy, dedicated success, volume runs. Annual contracts, six-figure ACVs.</div></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal" style="margin-bottom:44px">
      <div class="eyebrow">The team</div>
      <h2 class="sec-title">Built by the people who ran data at scale — and felt the pain.</h2>
    </div>
    <div class="team-grid">
      <div class="founder reveal">
        <div class="avatar a1">MR</div>
        <div><div class="fname">Maya Reyes</div><div class="frole">Co-founder & CEO</div><div class="fcred">Led the data platform team at Stripe (0→900 pipelines). Ex-Palantir.</div></div>
      </div>
      <div class="founder reveal">
        <div class="avatar a2">DK</div>
        <div><div class="fname">Daniel Kwon</div><div class="frole">Co-founder & CTO</div><div class="fcred">Built distributed orchestration at Databricks. Apache committer, 2× ML infra patents.</div></div>
      </div>
      <div class="founder reveal">
        <div class="avatar a3">AO</div>
        <div><div class="fname">Aisha Okafor</div><div class="frole">Co-founder & CPO</div><div class="fcred">Shipped the analytics suite at Figma to 4M users. Ex-Looker design lead.</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="reveal" style="margin-bottom:50px">
      <div class="eyebrow">The ask</div>
      <h2 class="sec-title">$4M to make autonomous data the default.</h2>
    </div>
    <div class="ask-grid">
      <div class="reveal" data-reveal="left">
        <div class="ask-amt num">$4M
          <span class="sub">Seed round on a $24M post. ~24 months of runway to reach $6M ARR and a Series A. Lead allocation open; $1.1M committed.</span>
        </div>
      </div>
      <div class="reveal" data-reveal="right">
        <div class="use-wrap">
          <svg class="donut reveal-donut" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="15.915" fill="none" stroke="#1a1f29" stroke-width="5"/>
            <circle class="seg-arc" cx="21" cy="21" r="15.915" fill="none" stroke="var(--acc)" stroke-width="5" stroke-dasharray="50 50" style="--off:0" transform="rotate(-90 21 21)"/>
            <circle class="seg-arc" cx="21" cy="21" r="15.915" fill="none" stroke="#7b8cff" stroke-width="5" stroke-dasharray="28 72" style="--off:-50" transform="rotate(-90 21 21)"/>
            <circle class="seg-arc" cx="21" cy="21" r="15.915" fill="none" stroke="#9db8ff" stroke-width="5" stroke-dasharray="14 86" style="--off:-78" transform="rotate(-90 21 21)"/>
            <circle class="seg-arc" cx="21" cy="21" r="15.915" fill="none" stroke="#2ec4b6" stroke-width="5" stroke-dasharray="8 92" style="--off:-92" transform="rotate(-90 21 21)"/>
            <text class="c" x="21" y="20" text-anchor="middle" fill="var(--ink)" font-size="5" font-weight="600">$4M</text>
            <text class="c" x="21" y="25.5" text-anchor="middle" fill="var(--mut)" font-size="2.4">use of funds</text>
          </svg>
          <div class="use-legend">
            <div class="urow"><i style="background:var(--acc)"></i> Engineering &amp; R&amp;D <b class="num">50%</b></div>
            <div class="urow"><i style="background:#7b8cff"></i> Go-to-market <b class="num">28%</b></div>
            <div class="urow"><i style="background:#9db8ff"></i> Infrastructure <b class="num">14%</b></div>
            <div class="urow"><i style="background:#2ec4b6"></i> Operations <b class="num">8%</b></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <h2 class="big-cta reveal">Let's build the autonomous<br>data layer together.</h2>
    <div class="reveal"><a class="em" href="mailto:maya@atlas.dev">maya@atlas.dev</a></div>
    <div class="row reveal">
      <span>Atlas Data, Inc.</span>
      <span>San Francisco, CA</span>
      <span>atlas.dev</span>
      <span>Seed · 2026</span>
    </div>
  </div>
</footer>
`.trim()

const JS = `
// Lightweight scroll parallax on the product frame's glow + a subtle wordmark
// lift. Everything visual is CSS/SVG; this only nudges decorative depth and is
// gated on prefers-reduced-motion so it never fights accessibility.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var glow = document.querySelector('.frame .glow');
  if (!glow) return;
  var ticking = false;
  function update() {
    ticking = false;
    var rect = glow.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    // progress of the frame through the viewport, -1 .. 1
    var p = (rect.top + rect.height / 2 - vh / 2) / vh;
    p = Math.max(-1, Math.min(1, p));
    glow.style.transform = 'translateX(-50%) translateY(' + (p * 26).toFixed(1) + 'px)';
    glow.style.opacity = (0.55 - Math.abs(p) * 0.28).toFixed(3);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
`.trim()

export const pitchOnepager: Template = {
  id: 'pitch-onepager',
  kind: 'page',
  name: 'Pitch One-Pager',
  tagline: 'A dark, confident investor one-pager for a seed raise',
  categories: ['Marketing'],
  audiences: ['founders', 'investors', 'startups'],
  description:
    'A dark, premium startup pitch one-pager (single scrolling page) for a fictional company, Atlas. A bold hero with the raise, problem → solution, a glowing framed product visual, big hairline-divided traction metrics, a TAM/SAM/SOM concentric-ring market chart, a business model with pricing tiers, three founders as avatar circles, the ask with a use-of-funds donut, and a contact footer. One electric accent, hairline dividers, a scroll-tied progress bar, reveal-on-scroll, fully responsive. Swap in your own company.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0a0c10',
  assets: ['pitch-product.jpg'],
  notes:
    'One accent only (--acc) — recolor the whole deck by changing it. Figures use .num for tabular alignment. The top progress bar is driven by var(--scroll); the market rings and use-of-funds donut animate on `.reveal.in`. Hairline dividers (1px var(--line)) carry the layout instead of boxes — keep metrics and points divider-separated, not carded. To rebrand: change the wordmark <svg>, the hero copy + raise, and the avatars (initials in .avatar a1/a2/a3).',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0a0c10',
  },
}
