import type { Template } from '../types'

// A warm editorial recipe page for a real dish (Brown Butter Chocolate Chip
// Cookies). A serif (Fraunces) display over clean sans (Inter), a cream + cocoa
// palette with a berry/amber accent. Hero photo with an appetizing gradient
// fallback, a sticky INGREDIENTS card with a tap-to-check, strike-through,
// session-persisted CHECKLIST, a big-numeral numbered METHOD, a tips & swaps
// callout, a per-serving nutrition row, a Print button (+ a clean @media print
// block), and a footer. No chart libs; every figure uses tabular numerals.

const CSS = `
:root {
  --cream: #f7f0e4;       /* page background, warm cream */
  --cream-2: #fbf6ec;     /* raised card cream */
  --paper: #fffdf8;       /* brightest surface */
  --cocoa: #2a1d15;       /* near-black cocoa ink */
  --ink: #3a2a1e;         /* body ink */
  --ink-soft: #6a5847;    /* muted body */
  --faint: #9a8470;       /* captions / meta */
  --line: #e6d8c2;        /* warm hairline */
  --line-2: #d8c6aa;      /* deeper hairline */
  --accent: #b23a48;      /* berry / cranberry */
  --accent-2: #c97b1f;    /* warm amber */
  --honey: #e8a33d;       /* highlight honey */
  --gold: #c19a52;        /* brass */
  --check: #7a6a3a;       /* checked olive-gold */
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --body: 'Inter', system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; }
body {
  background:
    radial-gradient(900px 520px at 86% -8%, rgba(232,163,61,0.12), transparent 60%),
    radial-gradient(760px 480px at 6% 12%, rgba(178,58,72,0.07), transparent 58%),
    var(--cream);
  color: var(--ink); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 56px); }

/* ===== top ribbon ===== */
.ribbon {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: clamp(20px, 3vw, 32px) 0 clamp(8px, 2vw, 18px);
  font: 700 12px/1 var(--body); letter-spacing: 0.22em; text-transform: uppercase; color: var(--faint);
}
.ribbon .mark { display: inline-flex; align-items: center; gap: 11px; color: var(--cocoa); letter-spacing: 0.18em; }
.ribbon .mark .glyph {
  width: 30px; height: 30px; border-radius: 9px; flex: none;
  background: linear-gradient(145deg, var(--accent), var(--accent-2)); color: #fff;
  display: grid; place-items: center; font: 700 16px/1 var(--display); letter-spacing: 0;
  box-shadow: 0 8px 20px -8px rgba(178,58,72,0.6);
}
.ribbon .spacer { flex: 1; }
.ribbon .cat { color: var(--accent); }

/* ===== hero ===== */
.hero { padding: clamp(10px, 2vw, 22px) 0 clamp(34px, 5vw, 60px); }
.hero__kicker {
  display: inline-flex; align-items: center; gap: 13px;
  font: 700 12.5px/1 var(--body); letter-spacing: 0.26em; text-transform: uppercase; color: var(--accent);
}
.hero__kicker::before { content: ''; width: 40px; height: 2px; background: var(--accent); opacity: 0.85; }
.hero__title {
  font-family: var(--display); font-weight: 380; font-optical-sizing: auto;
  font-size: clamp(42px, 8vw, 88px); line-height: 0.96; letter-spacing: -0.022em;
  color: var(--cocoa); margin: 18px 0 0; max-width: 16ch; text-wrap: balance;
}
.hero__title em { font-style: italic; font-weight: 420; color: var(--accent); }
.hero__lede {
  margin: 22px 0 0; max-width: 56ch;
  font: 400 clamp(16px, 1.6vw, 19.5px)/1.66 var(--body); color: var(--ink-soft);
}
.hero__lede .byline { color: var(--cocoa); font-weight: 600; }

/* meta chips */
.meta { display: flex; flex-wrap: wrap; gap: 10px; margin: 26px 0 0; }
.chip {
  display: inline-flex; flex-direction: column; gap: 3px;
  background: var(--paper); border: 1px solid var(--line); border-radius: 14px;
  padding: 11px 16px; min-width: 92px; box-shadow: 0 8px 22px -18px rgba(42,29,21,0.5);
}
.chip .k { font: 700 10.5px/1 var(--body); letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
.chip .v { font-family: var(--display); font-weight: 500; font-size: clamp(17px, 2vw, 21px); color: var(--cocoa); letter-spacing: -0.01em; }
.chip .v small { font-family: var(--body); font-weight: 600; font-size: 12.5px; color: var(--ink-soft); letter-spacing: 0.01em; }
.chip.diff .v { display: inline-flex; align-items: center; gap: 7px; }
.chip.diff .dots { display: inline-flex; gap: 3px; }
.chip.diff .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--line-2); }
.chip.diff .dots i.on { background: var(--accent); }

/* hero photo */
.hero__photo {
  position: relative; margin: clamp(28px, 4vw, 44px) 0 0; border-radius: 22px; overflow: hidden;
  aspect-ratio: 16 / 9;
  /* appetizing gradient fallback if assets/recipe-hero.jpg is missing */
  background:
    radial-gradient(120% 130% at 78% 14%, #e8a33d 0%, transparent 52%),
    radial-gradient(120% 130% at 12% 92%, #7a3a22 0%, transparent 56%),
    linear-gradient(150deg, #c97b1f 0%, #8a4a26 48%, #3a221a 100%);
  box-shadow: 0 40px 80px -44px rgba(42,29,21,0.55);
}
.hero__photo::after { content: ''; position: absolute; inset: 0; border-radius: 22px; box-shadow: inset 0 0 0 1px rgba(42,29,21,0.10); pointer-events: none; }
.hero__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hero__photo .credit {
  position: absolute; right: 14px; bottom: 12px; z-index: 2;
  color: rgba(255,251,243,0.92); font: 500 12px/1 var(--body); letter-spacing: 0.02em;
  text-shadow: 0 1px 8px rgba(0,0,0,0.5);
  background: rgba(28,18,12,0.28); border: 1px solid rgba(255,251,243,0.18);
  padding: 6px 11px; border-radius: 999px; backdrop-filter: blur(3px);
}
.hero__photo .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 58%, rgba(28,18,12,0.4) 100%); pointer-events: none; }
.reveal .hero__photo { opacity: 0; transform: translateY(26px) scale(0.99); transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .hero__photo { opacity: 1; transform: none; }

/* ===== working area ===== */
.work { display: grid; grid-template-columns: 0.92fr 1.35fr; gap: clamp(26px, 4vw, 56px); align-items: start;
  padding: clamp(20px, 3vw, 36px) 0 clamp(30px, 5vw, 60px); border-top: 1px solid var(--line); }

/* ingredients card (sticky) */
.ing { position: sticky; top: 20px; }
.card {
  background: var(--cream-2); border: 1px solid var(--line); border-radius: 20px;
  padding: clamp(22px, 3vw, 30px); box-shadow: 0 24px 60px -42px rgba(42,29,21,0.5);
}
.card__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin-bottom: 6px; }
.card__head h2 { font-family: var(--display); font-weight: 420; font-size: clamp(24px, 3vw, 31px); letter-spacing: -0.015em; color: var(--cocoa); margin: 0; }
.card__head h2 em { font-style: italic; color: var(--accent); }
.progress { font: 700 11.5px/1 var(--body); letter-spacing: 0.04em; color: var(--ink-soft); white-space: nowrap; }
.progress b { color: var(--accent); font-variant-numeric: tabular-nums; }
.serveswap { display: flex; align-items: center; gap: 9px; margin: 14px 0 18px; padding-bottom: 16px; border-bottom: 1px dashed var(--line-2); }
.serveswap .lab { font: 600 12.5px/1 var(--body); color: var(--ink-soft); margin-right: auto; }
.stepper { display: inline-flex; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: 999px; overflow: hidden; }
.stepper button { border: 0; background: transparent; color: var(--cocoa); font: 700 16px/1 var(--body); width: 32px; height: 30px; cursor: pointer; transition: background 0.15s ease; }
.stepper button:hover { background: rgba(178,58,72,0.08); }
.stepper button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.stepper .qty { font: 700 13.5px/1 var(--body); color: var(--cocoa); min-width: 64px; text-align: center; padding: 0 6px; font-variant-numeric: tabular-nums; }

.subhead { font: 700 11px/1 var(--body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent-2); margin: 16px 0 8px; }
.subhead:first-of-type { margin-top: 4px; }
ul.checklist { list-style: none; margin: 0; padding: 0; }
ul.checklist li { margin: 0; }
.tick {
  display: flex; align-items: flex-start; gap: 13px; width: 100%; text-align: left;
  background: transparent; border: 0; cursor: pointer;
  padding: 10px 4px; border-radius: 10px;
  font: 400 clamp(14.5px, 1.4vw, 16px)/1.45 var(--body); color: var(--ink);
  border-bottom: 1px solid var(--line); transition: background 0.15s ease;
}
ul.checklist li:last-child .tick { border-bottom: 0; }
.tick:hover { background: rgba(232,163,61,0.07); }
.tick:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.tick .box {
  flex: none; width: 21px; height: 21px; border-radius: 7px; margin-top: 1px;
  border: 2px solid var(--line-2); background: var(--paper); position: relative; transition: all 0.18s ease;
}
.tick .box::after {
  content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px;
  border: solid #fff; border-width: 0 2.4px 2.4px 0; transform: rotate(45deg) scale(0); transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
.tick .amt { font-weight: 700; color: var(--cocoa); font-variant-numeric: tabular-nums; white-space: nowrap; }
.tick .name { color: var(--ink); }
.tick .name .hint { color: var(--faint); }
.tick.done { color: var(--faint); }
.tick.done .box { background: var(--check); border-color: var(--check); }
.tick.done .box::after { transform: rotate(45deg) scale(1); }
.tick.done .amt, .tick.done .name { text-decoration: line-through; text-decoration-color: rgba(154,132,112,0.7); text-decoration-thickness: 1.5px; color: var(--faint); }
.card__foot { margin-top: 18px; padding-top: 16px; border-top: 1px dashed var(--line-2); display: flex; gap: 10px; flex-wrap: wrap; }
.reset {
  border: 1px solid var(--line); background: var(--paper); color: var(--ink-soft);
  font: 600 12.5px/1 var(--body); padding: 9px 14px; border-radius: 999px; cursor: pointer; transition: all 0.15s ease;
}
.reset:hover { color: var(--accent); border-color: var(--accent); }
.reset:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* method */
.method { min-width: 0; }
.method > h2 { font-family: var(--display); font-weight: 420; font-size: clamp(26px, 3.4vw, 38px); letter-spacing: -0.018em; color: var(--cocoa); margin: 0 0 4px; }
.method > h2 em { font-style: italic; color: var(--accent); }
.method > .note { color: var(--ink-soft); font: 400 14.5px/1.6 var(--body); margin: 0 0 24px; max-width: 56ch; }
.steps { list-style: none; counter-reset: step; margin: 0; padding: 0; }
.step { position: relative; display: grid; grid-template-columns: clamp(54px, 8vw, 78px) 1fr; gap: clamp(16px, 2.5vw, 26px); padding: clamp(18px, 2.6vw, 26px) 0; border-top: 1px solid var(--line); }
.step:first-child { border-top: 0; padding-top: 4px; }
.step__no {
  counter-increment: step; font-family: var(--display); font-weight: 300; font-optical-sizing: auto;
  font-size: clamp(44px, 7vw, 72px); line-height: 0.82; letter-spacing: -0.03em; color: var(--accent);
  position: relative;
}
.step__no::before { content: counter(step, decimal-leading-zero); }
.step__no::after { content: ''; position: absolute; left: 50%; top: calc(100% + 8px); bottom: -22px; width: 2px; transform: translateX(-50%); background: linear-gradient(var(--line-2), transparent); }
.step:last-child .step__no::after { display: none; }
.step__body h3 { font-family: var(--display); font-weight: 500; font-size: clamp(18px, 2.1vw, 22px); letter-spacing: -0.01em; color: var(--cocoa); margin: 6px 0 0; }
.step__body p { font: 400 clamp(15px, 1.4vw, 16.5px)/1.66 var(--body); color: var(--ink-soft); margin: 9px 0 0; max-width: 60ch; }
.step__body p b { color: var(--cocoa); font-weight: 600; }
.step__body p .temp { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }
.reveal .step { opacity: 0; transform: translateY(18px); transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .step { opacity: 1; transform: none; }
.reveal.in .step:nth-child(2) { transition-delay: 0.06s; }
.reveal.in .step:nth-child(3) { transition-delay: 0.12s; }
.reveal.in .step:nth-child(4) { transition-delay: 0.18s; }
.reveal.in .step:nth-child(5) { transition-delay: 0.24s; }
.reveal.in .step:nth-child(6) { transition-delay: 0.30s; }

/* ===== tips callout ===== */
.tips { margin: clamp(8px, 2vw, 22px) 0 0; border-top: 1px solid var(--line); padding-top: clamp(26px, 4vw, 44px); }
.tips__box {
  position: relative; background: linear-gradient(160deg, var(--cream-2), var(--paper));
  border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 16px;
  padding: clamp(22px, 3vw, 32px) clamp(22px, 3vw, 34px); box-shadow: 0 22px 56px -44px rgba(42,29,21,0.5);
}
.tips__box h2 { font-family: var(--display); font-weight: 420; font-size: clamp(22px, 2.8vw, 30px); letter-spacing: -0.015em; color: var(--cocoa); margin: 0 0 4px; }
.tips__box h2 em { font-style: italic; color: var(--accent); }
.tips__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 28px; margin-top: 18px; }
.tip { display: flex; gap: 12px; }
.tip .dot { flex: none; width: 26px; height: 26px; border-radius: 8px; background: rgba(201,123,31,0.14); color: var(--accent-2); display: grid; place-items: center; font: 700 13px/1 var(--display); margin-top: 1px; }
.tip h4 { font: 700 13px/1.2 var(--body); color: var(--cocoa); margin: 2px 0 4px; letter-spacing: 0.01em; }
.tip p { font: 400 14px/1.55 var(--body); color: var(--ink-soft); margin: 0; }
.tip p b { color: var(--cocoa); font-weight: 600; }

/* ===== nutrition ===== */
.nutri { margin: clamp(36px, 5vw, 64px) 0 0; border-top: 1px solid var(--line); padding-top: clamp(26px, 4vw, 44px); }
.nutri__head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.nutri__head h2 { font-family: var(--display); font-weight: 420; font-size: clamp(22px, 2.8vw, 30px); letter-spacing: -0.015em; color: var(--cocoa); margin: 0; }
.nutri__head .per { font: 600 12.5px/1 var(--body); letter-spacing: 0.04em; color: var(--faint); }
.nutri__row { display: grid; grid-template-columns: repeat(6, 1fr); gap: clamp(10px, 1.6vw, 18px); }
.stat { background: var(--paper); border: 1px solid var(--line); border-radius: 15px; padding: 16px 16px 14px; text-align: left; }
.stat .v { font-family: var(--display); font-weight: 500; font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -0.02em; color: var(--cocoa); font-variant-numeric: tabular-nums; }
.stat .v .u { font-family: var(--body); font-size: 0.45em; font-weight: 700; color: var(--faint); letter-spacing: 0.02em; margin-left: 2px; }
.stat .k { font: 700 10.5px/1 var(--body); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent-2); margin-top: 8px; }

/* ===== footer ===== */
.foot { margin: clamp(44px, 6vw, 80px) 0 clamp(36px, 5vw, 64px); padding-top: clamp(26px, 4vw, 40px); border-top: 2px solid var(--cocoa);
  display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.foot .left { font: 500 13.5px/1.5 var(--body); color: var(--ink-soft); }
.foot .left .sig { font-family: var(--display); font-style: italic; font-weight: 420; font-size: 21px; color: var(--cocoa); }
.foot .left .meta2 { color: var(--faint); margin-top: 4px; }
.printbtn {
  display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  background: var(--cocoa); color: var(--cream); border: 0; border-radius: 999px;
  font: 700 13px/1 var(--body); letter-spacing: 0.02em; padding: 13px 20px;
  box-shadow: 0 14px 30px -14px rgba(42,29,21,0.7); transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.printbtn:hover { transform: translateY(-1px); box-shadow: 0 18px 36px -14px rgba(42,29,21,0.7); }
.printbtn:active { transform: translateY(0); }
.printbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.printbtn svg { width: 16px; height: 16px; }

/* ===== responsive ===== */
@media (max-width: 880px) {
  .work { grid-template-columns: 1fr; gap: 30px; }
  .ing { position: static; }
  .nutri__row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .hero__photo { aspect-ratio: 4 / 3; }
  .meta .chip { min-width: 0; flex: 1 1 calc(50% - 5px); }
  .tips__grid { grid-template-columns: 1fr; }
  .nutri__row { grid-template-columns: repeat(2, 1fr); }
  .step { grid-template-columns: 46px 1fr; gap: 14px; }
  .foot { flex-direction: column; align-items: flex-start; }
}

/* ===== print ===== */
@media print {
  :root { --cream: #fff; }
  body { background: #fff !important; color: #000; }
  .ribbon, .printbtn, .reset, .card__foot, .serveswap, .hero__photo .credit, .scrim { display: none !important; }
  .wrap { max-width: 100%; padding: 0 8mm; }
  .hero__photo { box-shadow: none; aspect-ratio: 21 / 9; }
  .hero__title { color: #000; font-size: 32pt; }
  .hero__lede { font-size: 11pt; }
  .work { grid-template-columns: 0.85fr 1.2fr; gap: 16mm; border-top: 1px solid #ccc; page-break-inside: avoid; }
  .ing { position: static; }
  .card, .stat, .chip, .tips__box { box-shadow: none; border-color: #ccc; background: #fff; }
  .tick { border-color: #e3e3e3; padding: 5px 2px; }
  .tick .box { border-color: #999; }
  .step { page-break-inside: avoid; border-color: #ddd; }
  .step__no, .step__no::before { color: #000; }
  .step__no::after { display: none; }
  .reveal, .reveal .hero__photo, .reveal .step { opacity: 1 !important; transform: none !important; }
  .nutri, .tips { page-break-inside: avoid; }
  .foot { border-top: 1.5px solid #000; }
  a[href]::after { content: ''; }
}
`.trim()

const HTML = `
<div class="wrap">
  <div class="ribbon reveal" data-reveal="none">
    <span class="mark"><span class="glyph">o</span> The Standing Spoon</span>
    <span class="spacer"></span>
    <span class="cat">Baking · Cookies</span>
    <span>Tested 9 ways</span>
  </div>
</div>

<header class="wrap hero">
  <div class="reveal">
    <span class="hero__kicker">Weeknight Bake</span>
    <h1 class="hero__title">Brown Butter <em>Chocolate Chip</em> Cookies</h1>
    <p class="hero__lede"><span class="byline">By Mara Okafor.</span> I browned the butter on a whim one rainy Tuesday and never went back. Toasting it deepens everything — the dough smells like toffee before it even hits the oven — and a long chill plus flaky salt turns a familiar cookie into the one people text you about. Crisp lacy edges, a soft middle, puddles of dark chocolate.</p>
    <div class="meta">
      <div class="chip"><span class="k">Prep</span><span class="v num">20<small> min</small></span></div>
      <div class="chip"><span class="k">Chill</span><span class="v num">24<small> hr</small></span></div>
      <div class="chip"><span class="k">Bake</span><span class="v num">12<small> min</small></span></div>
      <div class="chip"><span class="k">Total</span><span class="v num">25<small> hr</small></span></div>
      <div class="chip"><span class="k">Makes</span><span class="v"><span class="num" id="yieldVal">18</span><small> cookies</small></span></div>
      <div class="chip diff"><span class="k">Difficulty</span><span class="v">Easy <span class="dots"><i class="on"></i><i class="on"></i><i></i></span></span></div>
    </div>
  </div>

  <figure class="hero__photo reveal">
    <img src="assets/recipe-hero.jpg" alt="A tray of golden brown-butter chocolate chip cookies cooling on parchment, edges crisp, centers studded with melting dark chocolate and flaky sea salt">
    <div class="scrim"></div>
    <figcaption class="credit">Fresh from the oven, salt still glinting.</figcaption>
  </figure>
</header>

<main class="wrap">
  <section class="work reveal">
    <aside class="ing">
      <div class="card">
        <div class="card__head">
          <h2>Ingredients</h2>
          <span class="progress"><b id="progNum">0</b> / <span id="progTot">11</span> got</span>
        </div>
        <div class="serveswap">
          <span class="lab">Batch size</span>
          <div class="stepper">
            <button type="button" id="minus" aria-label="Fewer cookies">−</button>
            <span class="qty"><span class="num" id="batchVal">18</span> ck</span>
            <button type="button" id="plus" aria-label="More cookies">+</button>
          </div>
        </div>

        <p class="subhead">The dough</p>
        <ul class="checklist" id="list">
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="226">226 g</span><span class="name">unsalted butter <span class="hint">(2 sticks), browned</span></span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="200">200 g</span><span class="name">dark brown sugar <span class="hint">(packed)</span></span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="100">100 g</span><span class="name">granulated sugar</span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="2">2</span><span class="name">large eggs <span class="hint">+ 1 yolk, cold</span></span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="2">2 tsp</span><span class="name">vanilla extract</span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="312">312 g</span><span class="name">all-purpose flour</span></button></li>
        </ul>

        <p class="subhead">To finish</p>
        <ul class="checklist" id="list2">
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="1.25">1¼ tsp</span><span class="name">baking soda</span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="1.5">1½ tsp</span><span class="name">fine sea salt</span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="250">250 g</span><span class="name">dark chocolate <span class="hint">(70%), chopped</span></span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="0">—</span><span class="name">flaky sea salt, <span class="hint">to top</span></span></button></li>
          <li><button type="button" class="tick"><span class="box"></span><span class="amt num" data-base="0">—</span><span class="name">your patience <span class="hint">(it chills overnight)</span></span></button></li>
        </ul>

        <div class="card__foot">
          <button type="button" class="reset" id="reset">Reset checklist</button>
        </div>
      </div>
    </aside>

    <div class="method">
      <h2>The <em>method</em></h2>
      <p class="note">Read it through once before you start. The only real trick is the brown butter — watch it closely, because it goes from nutty to burnt in about thirty seconds.</p>
      <ol class="steps">
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Brown the butter</h3>
            <p>Melt the butter in a light-bottomed saucepan over medium heat, swirling often. It will foam, then quiet, then the milk solids will turn <b>golden-amber and smell of toffee and hazelnut</b> — about 6–8 minutes. Pour it into a large bowl, scraping in every brown fleck. Let it cool 10 minutes.</p>
          </div>
        </li>
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Cream the sugars</h3>
            <p>Whisk both sugars into the warm butter until glossy and thick. Add the <b>eggs, yolk, and vanilla</b> and whisk hard for a full minute — until the batter lightens a shade and ribbons off the whisk. This is where the chew comes from.</p>
          </div>
        </li>
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Fold in the dry</h3>
            <p>Add the flour, baking soda, and fine salt. Fold with a spatula <b>just until no streaks remain</b> — don't overwork it. Fold in the chopped chocolate, saving a small handful to press on top later.</p>
          </div>
        </li>
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Chill (don't skip this)</h3>
            <p>Cover and refrigerate <b>at least 24 hours</b>, up to 72. The flour hydrates, the flavour concentrates, and the cookies bake up taller with crisper edges. Yes, overnight. It's worth it.</p>
          </div>
        </li>
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Scoop &amp; salt</h3>
            <p>Heat the oven to <span class="temp">175°C / 350°F</span>. Scoop into 60 g balls, spaced well apart on parchment. Press the reserved chocolate on top and finish each with a <b>pinch of flaky salt</b>.</p>
          </div>
        </li>
        <li class="step">
          <div class="step__no"></div>
          <div class="step__body">
            <h3>Bake &amp; bang</h3>
            <p>Bake <b>11–13 minutes</b>, until the edges are set but the centres still look underdone. For ripply edges, lift and drop the tray once at the 9-minute mark. Cool on the tray 5 minutes — they finish setting there.</p>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <section class="tips reveal">
    <div class="tips__box">
      <h2>Tips &amp; <em>swaps</em></h2>
      <div class="tips__grid">
        <div class="tip">
          <span class="dot">a</span>
          <div><h4>Weigh, don't scoop</h4><p>Cup measures of flour vary by up to 20%. A <b>kitchen scale</b> is the single biggest upgrade to your cookies.</p></div>
        </div>
        <div class="tip">
          <span class="dot">b</span>
          <div><h4>No time to chill?</h4><p>A 1-hour rest still helps. Or freeze the scooped dough solid and bake from frozen, adding <b>2 minutes</b>.</p></div>
        </div>
        <div class="tip">
          <span class="dot">c</span>
          <div><h4>Make it brown-butter brûlée</h4><p>Swap 50 g of the granulated sugar for <b>turbinado</b> for a faint crackle and caramel edge.</p></div>
        </div>
        <div class="tip">
          <span class="dot">d</span>
          <div><h4>Gluten-free</h4><p>A 1:1 GF flour blend works well here; chill the full 24 hours and the texture is nearly identical.</p></div>
        </div>
        <div class="tip">
          <span class="dot">e</span>
          <div><h4>Storage</h4><p>Best the day of, but they keep <b>4 days</b> in a tin. Refresh in a warm oven for 4 minutes to bring back the gooey middle.</p></div>
        </div>
        <div class="tip">
          <span class="dot">f</span>
          <div><h4>Chocolate matters</h4><p>Use a chopped <b>bar</b>, not chips — the irregular shards melt into pools instead of staying round.</p></div>
        </div>
      </div>
    </div>
  </section>

  <section class="nutri reveal">
    <div class="nutri__head">
      <h2>Per cookie</h2>
      <span class="per num">Approx. · 1 of 18 · 60 g each</span>
    </div>
    <div class="nutri__row">
      <div class="stat"><div class="v num">248<span class="u">kcal</span></div><div class="k">Calories</div></div>
      <div class="stat"><div class="v num">13<span class="u">g</span></div><div class="k">Fat</div></div>
      <div class="stat"><div class="v num">30<span class="u">g</span></div><div class="k">Carbs</div></div>
      <div class="stat"><div class="v num">20<span class="u">g</span></div><div class="k">Sugar</div></div>
      <div class="stat"><div class="v num">3<span class="u">g</span></div><div class="k">Protein</div></div>
      <div class="stat"><div class="v num">120<span class="u">mg</span></div><div class="k">Sodium</div></div>
    </div>
  </section>

  <footer class="foot reveal">
    <div class="left">
      <span class="sig">Mara Okafor</span>
      <div class="meta2 num">The Standing Spoon · Recipe v3 · Updated June 2026</div>
    </div>
    <button type="button" class="printbtn" id="printBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print recipe
    </button>
  </footer>
</main>
`.trim()

const JS = `
(function () {
  // ---- Checklist: tap to check / strike-through, persists for the session ----
  var STORE = 'recipe-cookies-checklist';
  var ticks = Array.prototype.slice.call(document.querySelectorAll('.tick'));
  var progNum = document.getElementById('progNum');
  var progTot = document.getElementById('progTot');
  if (progTot) progTot.textContent = String(ticks.length);

  var saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }

  function render() {
    var done = 0;
    ticks.forEach(function (t, i) {
      var on = !!saved[i];
      t.classList.toggle('done', on);
      t.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) done++;
    });
    if (progNum) progNum.textContent = String(done);
  }
  function persist() {
    try { sessionStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) {}
  }
  ticks.forEach(function (t, i) {
    t.setAttribute('aria-pressed', 'false');
    t.addEventListener('click', function () {
      saved[i] = !saved[i];
      if (!saved[i]) delete saved[i];
      render(); persist();
    });
  });
  render();

  var reset = document.getElementById('reset');
  if (reset) reset.addEventListener('click', function () {
    saved = {}; persist(); render();
  });

  // ---- Batch scaler: scale ingredient amounts + yield from a base of 18 ----
  var BASE = 18;
  var batch = BASE;
  var batchVal = document.getElementById('batchVal');
  var yieldVal = document.getElementById('yieldVal');
  var amounts = Array.prototype.slice.call(document.querySelectorAll('.amt[data-base]'));

  // pretty-print a number: keep nice fractions for small amounts, round grams
  function fmt(n) {
    if (n === 0) return '';
    var whole = Math.floor(n);
    var frac = n - whole;
    var glyph = '';
    if (Math.abs(frac - 0.25) < 0.04) glyph = '¼';
    else if (Math.abs(frac - 0.5) < 0.04) glyph = '½';
    else if (Math.abs(frac - 0.75) < 0.04) glyph = '¾';
    else if (Math.abs(frac - 0.33) < 0.05) glyph = '⅓';
    else if (Math.abs(frac - 0.67) < 0.05) glyph = '⅔';
    if (glyph) return (whole ? String(whole) + ' ' : '') + glyph;
    if (frac < 0.04 || frac > 0.96) return String(Math.round(n));
    return (Math.round(n * 10) / 10).toString();
  }

  function scale() {
    var k = batch / BASE;
    amounts.forEach(function (el) {
      var base = parseFloat(el.getAttribute('data-base'));
      if (!base) return; // '—' rows stay as-is
      var raw = el.getAttribute('data-unit');
      // derive the unit suffix from the original text once
      if (raw === null) {
        var t = el.textContent.trim();
        var m = t.replace(/^[0-9¼½¾⅓⅔.\\s]+/, '');
        raw = m ? (' ' + m) : '';
        el.setAttribute('data-unit', raw);
      }
      el.textContent = fmt(base * k) + raw;
    });
    if (batchVal) batchVal.textContent = String(batch);
    if (yieldVal) yieldVal.textContent = String(batch);
  }

  var minus = document.getElementById('minus');
  var plus = document.getElementById('plus');
  if (minus) minus.addEventListener('click', function () { batch = Math.max(6, batch - 6); scale(); });
  if (plus) plus.addEventListener('click', function () { batch = Math.min(48, batch + 6); scale(); });

  // ---- Print ----
  var printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
})();
`.trim()

export const recipe: Template = {
  id: 'recipe',
  kind: 'page',
  name: 'Recipe',
  tagline: 'A beautiful, usable recipe page',
  categories: ['Writing'],
  audiences: ['food', 'personal', 'blogger'],
  description:
    'A warm editorial recipe page for a real dish (brown butter chocolate chip cookies): a serif hero with a personal story lede and Prep/Chill/Bake/Total/Makes/Difficulty meta chips, an appetizing hero photo, and a two-column working area — a sticky ingredients card with a tap-to-check, session-persisted checklist and a batch scaler, beside a big-numeral numbered method. Rounds out with a Tips & swaps callout, a per-serving nutrition row, and a one-tap Print recipe button with a clean print stylesheet. Cream + cocoa palette with a berry/amber accent, Fraunces over Inter.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,400..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f7f0e4',
  assets: ['recipe-hero.jpg'],
  notes:
    'Warm editorial recipe page (sample: brown butter chocolate chip cookies). PALETTE KNOBS (in :root): --cream / --cream-2 / --paper (surfaces), --cocoa / --ink / --ink-soft / --faint (text), --accent berry, --accent-2 amber, --honey / --gold highlights, --check (the checked olive-gold). Recolor the whole piece from these. TYPE: display is Fraunces (use <em> for italic emphasis — it tints --accent); body is Inter; every figure carries tabular numerals via .num.\\n\\nSTRUCTURE: edit the hero (.hero__title, .hero__lede story, the .meta chips for Prep/Chill/Bake/Total/Makes/Difficulty — the difficulty dots light up with class "on"). INGREDIENTS live in two <ul class="checklist"> groups; each item is a <button class="tick"> with an <span class="amt" data-base="N"> (the numeric amount in the base batch of 18) and a <span class="name">; the checklist taps to strike through and persists in sessionStorage, and the +/- batch stepper rescales every amount that has a numeric data-base (use data-base="0" with "—" for to-taste rows). METHOD is an <ol class="steps"> of <li class="step"> with auto-numbered big numerals; wrap key actions in <b> and temperatures in <span class="temp">. Tips are a 2-col grid of .tip cards (lettered a–f). Update the .nutri stats (keep .num + the <span class="u"> unit). The Print button calls window.print() and the @media print block hides the chrome (ribbon, buttons, scrim) and lays it out cleanly on paper.\\n\\nPHOTO: one image is wired — assets/recipe-hero.jpg in .hero__photo, which has an appetizing warm gradient fallback so a missing image still looks intentional. To change the dish, swap the title/lede/photo, the ingredient list + data-base numbers (and BASE in page.js if your base yield is not 18), the steps, and the nutrition.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,400..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f7f0e4',
  },
}
