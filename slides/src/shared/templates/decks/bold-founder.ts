import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/bold-founder-cover.jpg'
const PRODUCT_IMG = 'assets/bold-founder-product.jpg'

export const boldFounder: Template = {
  id: 'bold-founder',
  categories: ['Fundraising'],
  name: 'Bold Founder',
  tagline: 'A VC pitch deck — restrained, confident, narrative-led',
  audiences: ['founder', 'pitch', 'startup', 'fundraising'],
  description:
    'A near-black Series A investor deck built to win the room: a cohesive problem-to-ask story arc, oversized confident type, a single electric accent, hairline-divided columns, CSS charts, and a running footer for cohesion.',
  fonts: {
    display: 'Clash Display',
    body: 'Satoshi',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#0a0b0f',
    '--text': '#f5f6f8',
    '--muted': '#888fa3',
    '--accent': '#5b8cff',
    '--accent-2': '#5b8cff',
    '--display': "'Clash Display', sans-serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '600',
    '--kicker-tracking': '0.2em',
    '--title-size': '146px',
    '--display-size': '176px',
    '--headline-size': '104px',
    '--headline-weight': '600',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--card-bg': 'rgba(255,255,255,0.035)',
    '--card-border': 'rgba(255,255,255,0.12)',
    '--radius': '16px',
    '--stat-size': '120px',
    '--metric-size': '116px',
    '--section-size': '180px',
    '--rule-color': 'rgba(255,255,255,0.14)',
    '--th-border': 'rgba(255,255,255,0.5)',
    '--table-border': 'rgba(255,255,255,0.1)',
    '--track': 'rgba(255,255,255,0.08)',
    '--donut-hole': '#0a0b0f',
    '--bar-gap': '34px',
    '--media-border': '1px solid rgba(255,255,255,0.10)',
    '--media-shadow': '0 60px 120px -45px rgba(0,0,0,0.75)',
    '--scrim':
      'linear-gradient(180deg, rgba(10,11,15,0.20) 0%, rgba(10,11,15,0.45) 45%, rgba(10,11,15,0.94) 100%)',
    '--pos': '#5dd6a0',
    '--neg': '#ff6b6b',
  },
  stageBg: '#0a0b0f',
  assets: ['bold-founder-cover.jpg', 'bold-founder-product.jpg'],
  // One whisper-quiet accent glow at the top — depth without "AI gradient slop".
  decoration: `.slide {
  background:
    radial-gradient(1500px 900px at 50% -16%, rgba(91,140,255,0.10), transparent 62%),
    #0a0b0f;
}
.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: #ffffff; }
.stat-num { letter-spacing: -0.03em; }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }

/* ---- Signature: numbered section divider on near-black ---- */
.div { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.div-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.24em; font-size: 24px; color: var(--accent); text-transform: uppercase; }
.div-title { font-family: var(--display); font-weight: 600; font-size: 176px; line-height: 0.92; letter-spacing: -0.025em; color: var(--text); text-wrap: balance; }
.div-rule { width: 120px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 12px; }

/* ---- Signature: hairline value cards (boxless, rule-topped) ---- */
.vcard { padding-top: 30px; border-top: 2px solid var(--accent); display: flex; flex-direction: column; gap: 14px; }
.vcard-n { font-family: var(--body); font-weight: 700; font-size: 22px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); }
.vcard-t { font-family: var(--display); font-weight: 600; font-size: 40px; line-height: 1.04; color: var(--text); }
.vcard-d { font-family: var(--body); font-size: 27px; line-height: 1.42; color: var(--muted); }

/* ---- Signature: 2×2 competition matrix ---- */
/* Wrapper carries the axis labels so they sit OUTSIDE the matrix's overflow:hidden
   (which clips the rounded corners) and don't get clipped into the quadrants. */
.matrix-wrap { position: relative; }
.matrix { position: relative; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; background: var(--card-border); border: 1px solid var(--card-border); border-radius: 18px; overflow: hidden; aspect-ratio: 1.55 / 1; }
.quad { background: #0c0e13; padding: 38px 40px; display: flex; flex-direction: column; justify-content: flex-end; gap: 8px; }
.quad.us { background: rgba(91,140,255,0.12); }
.quad-tag { font-family: var(--body); font-weight: 700; font-size: 20px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.quad.us .quad-tag { color: var(--accent); }
.quad-name { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.02; color: var(--text); }
.m-axis-x { position: absolute; bottom: -52px; left: 0; right: 0; text-align: center; font-family: var(--body); font-size: 24px; letter-spacing: 0.04em; color: var(--muted); }
/* Vertical axis label sits entirely to the LEFT of the matrix (right:100% anchors its
   right edge at the matrix's left edge); writing-mode keeps its box tall+narrow so it
   can't bleed into the quadrants the way a rotate()'d wide span did. */
.m-axis-y { position: absolute; top: 0; bottom: 0; right: 100%; margin-right: 18px; display: flex; align-items: center; }
.m-axis-y span { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; font-family: var(--body); font-size: 24px; letter-spacing: 0.04em; color: var(--muted); }

/* ---- Signature: funds-of-use allocation bars ---- */
.alloc { display: flex; flex-direction: column; gap: 30px; }
.alloc-row { display: grid; grid-template-columns: 290px 1fr 90px; align-items: center; gap: 32px; }
.alloc-name { font-family: var(--display); font-weight: 600; font-size: 36px; color: var(--text); }
.alloc-track { height: 22px; border-radius: 11px; background: var(--track); overflow: hidden; }
.alloc-bar { height: 100%; border-radius: 11px; background: var(--accent); }
.alloc-pct { font-family: var(--display); font-weight: 700; font-size: 38px; color: #fff; text-align: right; font-variant-numeric: tabular-nums; }

/* ---- Signature: founder/team chips ---- */
.team { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.member { padding-top: 26px; border-top: 1px solid var(--card-border); display: flex; flex-direction: column; gap: 6px; }
.member-name { font-family: var(--display); font-weight: 600; font-size: 40px; color: var(--text); }
.member-role { font-family: var(--body); font-weight: 700; font-size: 24px; color: var(--accent); letter-spacing: 0.02em; }
.member-prev { font-family: var(--body); font-size: 26px; line-height: 1.36; color: var(--muted); margin-top: 6px; }

/* ---- Phone reflow: tame bespoke decoration sized for the 1920px stage ---- */
@media (max-width: 640px) {
  /* Section divider: 176px title + edge padding */
  html.deck-can-flow .div { padding: 40px 26px !important; }
  html.deck-can-flow .div-title { font-size: min(60px, 17vw) !important; line-height: 1.0 !important; }

  /* Value cards */
  html.deck-can-flow .vcard-t { font-size: min(32px, 9vw) !important; line-height: 1.08 !important; }

  /* Competition 2x2 matrix: collapse to one column, drop fixed aspect-ratio, unhide axes */
  html.deck-can-flow .matrix { grid-template-columns: 1fr !important; grid-template-rows: auto !important; aspect-ratio: auto !important; }
  html.deck-can-flow .quad { padding: 22px 22px !important; justify-content: flex-start !important; }
  html.deck-can-flow .quad-name { font-size: min(30px, 8vw) !important; line-height: 1.06 !important; }
  html.deck-can-flow .m-axis-x { position: static !important; margin-top: 16px; text-align: left !important; }
  html.deck-can-flow .m-axis-y { display: none !important; }

  /* Use-of-funds allocation bars: fixed 290px/90px columns crush the track and clip the % */
  html.deck-can-flow .alloc-row { grid-template-columns: 1fr auto !important; gap: 6px 16px !important; }
  html.deck-can-flow .alloc-name { grid-column: 1 / -1 !important; font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .alloc-track { grid-column: 1 !important; }
  html.deck-can-flow .alloc-pct { grid-column: 2 !important; font-size: min(28px, 8vw) !important; }

  /* Founder/team chips: 3-up grid clips the third member at phone width */
  html.deck-can-flow .team { grid-template-columns: 1fr !important; gap: 28px !important; }
  html.deck-can-flow .member-name { font-size: min(32px, 9vw) !important; }
}`,
  notes:
    'This is a Series A VC pitch deck — design it like a product, not a slideshow. Hold ONE narrative thread and let each slide advance it (problem → why now → solution → product → how it works → traction → market → model → competition → team → roadmap → ask → vision); slides should never feel interchangeable. Ruthless restraint: near-black, one electric-blue accent used sparingly (a single key word via .accent-text, the .accent-bar / .div-rule under a hero line, stat figures, chart fills), NO gradient text and NO busy backgrounds beyond the one quiet top glow. Confidence comes from scale and space — 4–8 words per headline, lots of black. Number the story in the eyebrow ("01 — The problem") and in the .div section breaks. Prefer hairline-divided columns (.stats / .vcard / .member) over heavy boxed cards. Put a .runner footer (brand left, narrative step right) on content slides for cohesion. Signature pieces: .div section dividers, .vcard rule-topped value cards, the .matrix 2×2 for competition, .alloc bars for use of funds, .team founder chips. Use the shared .bars for growth, .donut for market size, .table for the business model, .flow for how-it-works, .timeline for the roadmap. Treat images as moody, full-bleed product heroes with the dark scrim and bottom-anchored text.',
  sampleSlides: [
    s({
      id: 'bf-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Oath · Series A · 2026</div>
    <h1 class="display reveal" style="--display-size:150px;margin-top:10px">Ship AI you can<br/><span class="accent-text">prove</span> is safe.</h1>
    <div class="accent-bar reveal" style="margin-top:18px"></div>
    <p class="lead reveal" style="margin-top:22px;max-width:32ch">Continuous compliance for AI-native teams.</p>
  </div>
</div>`,
    }),
    s({
      id: 'bf-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The story</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">What we'll walk through.</h2>
  <div class="cols-2 reveal" style="gap:18px 96px">
    <div class="vcard"><div class="vcard-n">01</div><div class="vcard-t">The problem &amp; why now</div></div>
    <div class="vcard"><div class="vcard-n">04</div><div class="vcard-t">Market &amp; business model</div></div>
    <div class="vcard"><div class="vcard-n">02</div><div class="vcard-t">The product &amp; how it works</div></div>
    <div class="vcard"><div class="vcard-n">05</div><div class="vcard-t">Competition &amp; the team</div></div>
    <div class="vcard"><div class="vcard-n">03</div><div class="vcard-t">Traction to date</div></div>
    <div class="vcard"><div class="vcard-n">06</div><div class="vcard-t">The roadmap &amp; the ask</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'bf-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">01 — The problem</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Shipping AI is easy.<br/>Proving it's <span class="accent-text">safe</span> isn't.</h2>
  <p class="lead reveal" style="max-width:38ch;margin-bottom:8px">Every launch stalls for weeks in manual review — and a single missed gap can sink the company.</p>
  <div class="stats reveal" style="margin-top:10px">
    <div class="stat"><div class="stat-num">6 wks</div><div class="stat-label">Average review per AI release</div></div>
    <div class="stat"><div class="stat-num">73%</div><div class="stat-label">Of evidence still gathered by hand</div></div>
    <div class="stat"><div class="stat-num">$14M</div><div class="stat-label">Median fine for a governance gap</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'bf-whynow',
      name: 'Why now',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">02 — Why now</div>
      <h2 class="headline" style="margin-top:6px">Trust just became <span class="accent-text">law.</span></h2>
      <p class="lead" style="margin-top:18px">The EU AI Act and model-level SOC&nbsp;2 turn "responsible AI" from a value into a hard requirement — overnight, every team needs an audit trail it doesn't have.</p>
    </div>
    <ul class="bullets" style="--gap:30px">
      <li class="bullet"><span><b>Regulation landed.</b> Binding AI rules now cover every market we sell into.</span></li>
      <li class="bullet"><span><b>Buyers demand proof.</b> Enterprise security reviews now ask for model evidence.</span></li>
      <li class="bullet"><span><b>Volume exploded.</b> Teams ship AI weekly — manual review can't keep pace.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Why now</span></div>
</div>`,
    }),
    s({
      id: 'bf-div-solution',
      name: 'Section · The solution',
      transition: 'fade',
      bodyHtml: `<div class="div">
  <div class="div-num reveal">Section 01</div>
  <div class="div-title reveal">A single layer<br/>for AI trust.</div>
  <div class="div-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'bf-solution',
      name: 'The solution',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">03 — The solution</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:26px">One layer. Always audit-ready.</h2>
  <div class="cols-3 reveal">
    <div class="vcard"><div class="vcard-n">Connect</div><div class="vcard-t">Wire in once</div><div class="vcard-d">Plug into the model, data, and pipeline you already run — no rebuild.</div></div>
    <div class="vcard"><div class="vcard-n">Monitor</div><div class="vcard-t">Watch continuously</div><div class="vcard-d">Continuous evals turn live risk into a signed, immutable record.</div></div>
    <div class="vcard"><div class="vcard-n">Prove</div><div class="vcard-t">Export in a click</div><div class="vcard-d">Hand auditors, customers, and your board a report they can trust.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Solution</span></div>
</div>`,
    }),
    s({
      id: 'bf-product',
      name: 'Product — image',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${PRODUCT_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">04 — The product</div>
    <h2 class="display reveal" style="--display-size:134px;margin-top:8px">Risk, made visible.</h2>
    <p class="lead reveal" style="max-width:36ch">A live record your auditors, customers, and board can all read at a glance.</p>
  </div>
</div>`,
    }),
    s({
      id: 'bf-how',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">05 — How it works</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">From model to proof in four moves.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="vcard"><div class="vcard-n">01</div><div class="vcard-t">Connect</div><div class="vcard-d">SDK and proxy tap your live AI stack.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vcard"><div class="vcard-n">02</div><div class="vcard-t">Evaluate</div><div class="vcard-d">Policy-as-code evals run on every request.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vcard"><div class="vcard-n">03</div><div class="vcard-t">Record</div><div class="vcard-d">Each result is signed into a tamper-proof log.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vcard"><div class="vcard-n">04</div><div class="vcard-t">Report</div><div class="vcard-d">One click exports an audit-ready dossier.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'bf-div-momentum',
      name: 'Section · Momentum',
      transition: 'fade',
      bodyHtml: `<div class="div">
  <div class="div-num reveal">Section 02</div>
  <div class="div-title reveal">The numbers<br/>are moving.</div>
  <div class="div-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'bf-traction',
      name: 'Traction',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">06 — Traction</div>
      <h2 class="headline" style="margin-top:6px">Twelve months in.</h2>
      <p class="lead" style="margin-top:18px">ARR has compounded every quarter since launch — enterprise now drives the majority of net-new.</p>
      <div class="stats" style="margin-top:30px">
        <div class="stat"><div class="stat-num">12×</div><div class="stat-label">Revenue growth, YoY</div></div>
        <div class="stat"><div class="stat-num">98%</div><div class="stat-label">Net revenue retention</div></div>
      </div>
    </div>
    <div class="bars" style="--bars-height:400px">
      <div class="bar" style="--h:14%"><div class="bar-fill" data-val="$190K"></div><div class="bar-label">Q1</div></div>
      <div class="bar" style="--h:30%"><div class="bar-fill" data-val="$520K"></div><div class="bar-label">Q2</div></div>
      <div class="bar" style="--h:56%"><div class="bar-fill" data-val="$1.1M"></div><div class="bar-label">Q3</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="$2.4M"></div><div class="bar-label">Q4</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Traction</span></div>
</div>`,
    }),
    s({
      id: 'bf-market',
      name: 'Market size',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:360px;--p:33;--track:rgba(255,255,255,0.08)"><div class="donut-label">$42B</div></div>
    </div>
    <div>
      <div class="kicker">07 — Market size</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:24px">A new line item for <span class="accent-text">every</span> AI team.</h2>
      <div class="stats">
        <div class="stat"><div class="stat-num">$42B</div><div class="stat-label">TAM — AI governance spend by 2030</div></div>
        <div class="stat"><div class="stat-num">$8.5B</div><div class="stat-label">SAM — regulated AI-native teams</div></div>
        <div class="stat"><div class="stat-num">$310M</div><div class="stat-label">SOM — our 3-year reachable market</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Market</span></div>
</div>`,
    }),
    s({
      id: 'bf-model',
      name: 'Business model',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">08 — Business model</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Seat-light, usage-led, expands with trust.</h2>
  <table class="table reveal">
    <thead><tr><th>Tier</th><th>Built for</th><th class="num">Annual</th><th class="num">Net expansion</th></tr></thead>
    <tbody>
      <tr><td>Launch</td><td class="muted">First AI feature in production</td><td class="num">$24K</td><td class="num pos">+18%</td></tr>
      <tr class="row-em"><td>Scale</td><td class="muted">Multiple models under one policy</td><td class="num">$60K</td><td class="num pos">+47%</td></tr>
      <tr><td>Enterprise</td><td class="muted">Company-wide, custom controls</td><td class="num">Custom</td><td class="num pos">+62%</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Blended ACV of <b style="color:var(--text)">$60K</b> and <b style="color:var(--text)">2.3×</b> net expansion in year one — land on one model, expand across the org.</p>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Business model</span></div>
</div>`,
    }),
    s({
      id: 'bf-competition',
      name: 'Competition',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">09 — Competition</div>
      <h2 class="headline" style="margin-top:6px">The only one that's<br/><span class="accent-text">live</span> and <span class="accent-text">model-aware.</span></h2>
      <p class="lead" style="margin-top:18px">Legacy GRC tools audit on a calendar. Point evals catch issues but never prove them. We do both — continuously.</p>
    </div>
    <div class="matrix-wrap">
      <div class="matrix">
        <div class="quad"><div class="quad-tag">Manual · periodic</div><div class="quad-name">Legacy GRC</div></div>
        <div class="quad us"><div class="quad-tag">Continuous · model-aware</div><div class="quad-name">Oath</div></div>
        <div class="quad"><div class="quad-tag">Manual · point-in-time</div><div class="quad-name">Spreadsheets</div></div>
        <div class="quad"><div class="quad-tag">Continuous · no proof</div><div class="quad-name">Eval tools</div></div>
      </div>
      <div class="m-axis-x">Periodic &rarr; Continuous</div>
      <div class="m-axis-y"><span>Generic &rarr; Model-aware</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Competition</span></div>
</div>`,
    }),
    s({
      id: 'bf-team',
      name: 'The team',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">10 — The team</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Operators who've shipped trust at scale.</h2>
  <div class="team reveal">
    <div class="member"><div class="member-name">Maya Okonkwo</div><div class="member-role">Co-founder · CEO</div><div class="member-prev">Led AI risk at a top-tier cloud; shipped the first model-audit standard.</div></div>
    <div class="member"><div class="member-name">Daniel Reyes</div><div class="member-role">Co-founder · CTO</div><div class="member-prev">Built compliance infra used by 400+ banks; two prior exits.</div></div>
    <div class="member"><div class="member-name">Priya Anand</div><div class="member-role">VP Engineering</div><div class="member-prev">Scaled an eval platform to 10B requests a day.</div></div>
  </div>
  <div class="stats reveal" style="margin-top:48px">
    <div class="stat"><div class="stat-num">3</div><div class="stat-label">Prior exits across the founding team</div></div>
    <div class="stat"><div class="stat-num">14</div><div class="stat-label">Engineers, ex-cloud &amp; fintech security</div></div>
    <div class="stat"><div class="stat-num">2</div><div class="stat-label">Published AI-governance standards authored</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Team</span></div>
</div>`,
    }),
    s({
      id: 'bf-quote',
      name: 'Pull quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">From a design partner</div>
  <blockquote class="quote reveal" style="--quote-size:80px;margin-top:14px">"Oath turned a six-week audit scramble into a button. It's now a gate in our release pipeline."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Lena Hoffmann</span><span class="cite-role">Chief Trust Officer, a Fortune 100 lender</span></div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Customer voice</span></div>
</div>`,
    }),
    s({
      id: 'bf-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">11 — The roadmap</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">What this round funds.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q3 '26</div><div class="tl-what"><b>Ship the audit marketplace</b> — pre-built policy packs for the EU AI Act and SOC 2.</div></div>
    <div class="tl-row"><div class="tl-when">Q1 '27</div><div class="tl-what"><b>Open the platform</b> — public API and partner integrations across the AI tool stack.</div></div>
    <div class="tl-row"><div class="tl-when">Q3 '27</div><div class="tl-what"><b>Reach default status</b> — Oath becomes the trust gate every enterprise launch passes through.</div></div>
    <div class="tl-row"><div class="tl-when">Q1 '28</div><div class="tl-what"><b>Set the standard</b> — co-author the reference framework regulators point to.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'bf-ask',
      name: 'The ask',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">12 — The ask</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:26px">Raising <span class="accent-text">$12M</span> Series A.</h2>
  <div class="alloc reveal">
    <div class="alloc-row"><div class="alloc-name">Engineering &amp; product</div><div class="alloc-track"><div class="alloc-bar" style="width:45%"></div></div><div class="alloc-pct">45%</div></div>
    <div class="alloc-row"><div class="alloc-name">Go-to-market</div><div class="alloc-track"><div class="alloc-bar" style="width:30%"></div></div><div class="alloc-pct">30%</div></div>
    <div class="alloc-row"><div class="alloc-name">Security &amp; certifications</div><div class="alloc-track"><div class="alloc-bar" style="width:15%"></div></div><div class="alloc-pct">15%</div></div>
    <div class="alloc-row"><div class="alloc-name">Operations &amp; reserve</div><div class="alloc-track"><div class="alloc-bar" style="width:10%"></div></div><div class="alloc-pct">10%</div></div>
  </div>
  <p class="fine reveal" style="margin-top:30px">Capital takes us to <b style="color:var(--text)">$15M ARR</b> and category leadership over the next 24 months.</p>
  <div class="runner reveal"><span class="runner-brand">Oath</span><span class="runner-label">The ask</span></div>
</div>`,
    }),
    s({
      id: 'bf-vision',
      name: 'Vision close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The vision</div>
    <h2 class="display reveal" style="--display-size:138px">Set the standard<br/>for AI trust.</h2>
    <div class="accent-bar reveal" style="margin-top:18px"></div>
    <p class="lead reveal" style="margin-top:22px">Let's build it together. · maya@oath.ai · oath.ai</p>
  </div>
</div>`,
    }),
  ],
}
