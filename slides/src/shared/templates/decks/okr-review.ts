import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/okr-review-cover.jpg'

export const okrReview: Template = {
  id: 'okr-review',
  categories: ['Reporting', 'Strategy'],
  name: 'OKR Review',
  tagline: 'Structured quarterly OKR scorecard',
  audiences: ['executive', 'leadership', 'product', 'operations'],
  description:
    'A disciplined quarterly OKR review in indigo-on-white with an amber accent. Objective cards each carry a progress donut, key-result rows track on progress bars, and RAG status, scoring-scale, and confidence chips keep the read honest. A complete grade-the-quarter narrative you retitle with your own objectives and scores.',
  fonts: {
    display: 'Plus Jakarta Sans',
    body: 'Inter',
    mono: 'JetBrains Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#161433',
    '--muted': '#6b6890',
    '--accent': '#4338ca',
    '--accent-2': '#4338ca',
    '--display': "'Plus Jakarta Sans', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'JetBrains Mono', monospace",
    '--display-weight': '700',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e6e5f2',
    '--card-shadow': '0 20px 48px -30px rgba(22,20,51,0.28)',
    '--radius': '18px',
    '--stat-size': '102px',
    '--metric-size': '116px',
    '--th-border': '#161433',
    '--table-border': '#e6e5f2',
    '--track': '#eceaf6',
    '--donut-hole': '#ffffff',
    '--donut-label-size': '52px',
    '--bar-gap': '32px',
    '--media-shadow': '0 50px 110px -45px rgba(22,20,51,0.42)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(20,18,52,0.08) 0%, rgba(20,18,52,0.40) 52%, rgba(20,18,52,0.88) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#edecf6',
  assets: ['okr-review-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.section-num { font-family: var(--mono); }

/* Section divider — quiet indigo rule on white */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--mono); font-weight: 700; letter-spacing: 0.18em; font-size: 24px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 800; font-size: 146px; line-height: 0.95; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 124px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 12px; }

/* Objective card — donut + meta header, KR rows below */
.obj { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; padding: 48px 52px; box-shadow: var(--card-shadow); }
.obj-head { display: grid; grid-template-columns: 1fr auto; gap: 48px; align-items: center; }
.obj-meta { display: flex; flex-direction: column; gap: 16px; }
.obj-owner { font-family: var(--body); font-weight: 600; font-size: 24px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.obj-title { font-family: var(--display); font-weight: 700; font-size: 50px; line-height: 1.04; letter-spacing: -0.015em; color: var(--text); }
.obj-donut { display: grid; place-items: center; gap: 12px; }
.obj-score { font-family: var(--mono); font-weight: 700; font-size: 22px; letter-spacing: 0.04em; color: var(--muted); }

/* Key-result rows — label + progress bar + score */
.krs { display: flex; flex-direction: column; gap: 26px; margin-top: 38px; }
.kr { display: grid; grid-template-columns: 1fr 360px 86px; gap: 34px; align-items: center; }
.kr-label { font-family: var(--body); font-size: 28px; line-height: 1.28; color: var(--text); }
.kr-label b { font-weight: 700; }
.kr-track { height: 18px; border-radius: 999px; background: var(--track); overflow: hidden; }
.kr-fill { height: 100%; border-radius: 999px; background: var(--accent); }
.kr-fill.amber { background: #f59e0b; }
.kr-fill.red { background: #dc2626; }
.kr-val { font-family: var(--mono); font-weight: 700; font-size: 30px; text-align: right; color: var(--text); font-variant-numeric: tabular-nums; }

/* RAG status pills */
.rag { display: inline-flex; align-items: center; gap: 11px; font-family: var(--body); font-weight: 600; font-size: 24px; padding: 9px 22px; border-radius: 999px; border: 1px solid var(--card-border); color: var(--text); }
.rag::before { content: ''; width: 13px; height: 13px; border-radius: 50%; background: var(--muted); }
.rag.green::before { background: #16a34a; }
.rag.amber::before { background: #f59e0b; }
.rag.red::before { background: #dc2626; }
.rag.green { background: rgba(22,163,74,0.08); border-color: rgba(22,163,74,0.25); }
.rag.amber { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.30); }
.rag.red { background: rgba(220,38,38,0.08); border-color: rgba(220,38,38,0.25); }

/* Scoring-scale chip (0.0–1.0) */
.scale { display: inline-flex; align-items: center; gap: 14px; font-family: var(--mono); font-weight: 700; font-size: 26px; padding: 12px 24px; border-radius: 14px; background: rgba(67,56,202,0.07); border: 1px solid rgba(67,56,202,0.18); color: var(--accent); }
.scale .v { font-size: 34px; letter-spacing: 0.02em; }
.scale .l { font-family: var(--body); font-weight: 600; font-size: 22px; color: var(--muted); }

/* Confidence chip */
.conf { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 600; font-size: 22px; padding: 8px 18px; border-radius: 999px; background: var(--card-bg); border: 1px solid var(--card-border); color: var(--muted); }
.conf .dots { display: inline-flex; gap: 5px; }
.conf .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--track); }
.conf .dot.on { background: var(--accent); }

/* Scoring legend rows */
.scaleband { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.scalecard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 40px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 14px; }
.scalecard-range { font-family: var(--mono); font-weight: 700; font-size: 40px; letter-spacing: 0.01em; color: var(--accent); }
.scalecard-name { font-family: var(--display); font-weight: 700; font-size: 34px; color: var(--text); }
.scalecard-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); }

/* Proposed-objective cards (next quarter) */
.prop { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.pcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 40px 38px; box-shadow: var(--card-shadow); position: relative; overflow: hidden; }
.pcard::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: var(--accent); }
.pcard-tag { font-family: var(--mono); font-weight: 700; font-size: 22px; letter-spacing: 0.06em; color: var(--accent); }
.pcard-t { font-family: var(--display); font-weight: 700; font-size: 36px; line-height: 1.08; color: var(--text); margin-top: 14px; }
.pcard-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 12px; }

/* Risk callouts */
.callout { border-left: 5px solid var(--accent); background: rgba(67,56,202,0.05); padding: 30px 38px; border-radius: 0 14px 14px 0; }
.callout.warn { border-left-color: #f59e0b; background: rgba(245,158,11,0.07); }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }
.callout.warn .callout-k { color: #b8770a; }

@media (max-width: 640px) {
  html.deck-can-flow .divider-title { font-size: min(50px, 14vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .obj-title { font-size: min(36px, 10vw) !important; line-height: 1.08 !important; }
  html.deck-can-flow .scalecard-range { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .scalecard-name { font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .pcard-t { font-size: min(28px, 8vw) !important; line-height: 1.12 !important; }
  html.deck-can-flow .obj-head { grid-template-columns: 1fr !important; gap: 24px 0; }
  html.deck-can-flow .obj-donut { justify-self: start; }
  html.deck-can-flow .kr { grid-template-columns: 1fr auto !important; gap: 10px 14px; }
  html.deck-can-flow .kr .kr-label { grid-column: 1 / -1; }
  html.deck-can-flow .kr .kr-track { grid-column: 1; min-width: 0; }
  html.deck-can-flow .kr .kr-val { grid-column: 2; }
  html.deck-can-flow .scaleband { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .prop { grid-template-columns: 1fr !important; gap: 18px 0; }
  html.deck-can-flow .obj { padding: 28px 22px !important; }
  html.deck-can-flow .scalecard { padding: 26px 24px !important; }
  html.deck-can-flow .pcard { padding: 28px 24px !important; }
  html.deck-can-flow .callout { padding: 24px 22px !important; }
}`,
  notes:
    'A complete quarterly OKR review: Plus Jakarta Sans display + Inter body, JetBrains Mono for every score and range, indigo #4338ca on white with ONE amber #f59e0b accent reserved for at-risk/milestone marks. Open and close on the abstract indigo goals full-bleed (assets/okr-review-cover.jpg); break acts with the clean .divider. Signature pieces: .obj objective cards (header = .obj-title + .obj-donut, body = .krs key-result rows with .kr-track/.kr-fill progress bars, recolor .kr-fill.amber/.red when off track); .rag green/amber/red status pills; the .scale 0.0–1.0 scoring chip and .scaleband legend cards for "how to read this"; .conf confidence chips; .prop/.pcard proposed-objective cards for next quarter. Use .stats for the quarter at a glance, .bars for cross-cutting progress, .checks for learnings, .steps for focus/bets, .callout (add .warn for amber) for risks. Keep every numeric grade in the 0.0–1.0 OKR convention and tabular. Honest over rosy — show the amber and red.',
  sampleSlides: [
    s({
      id: 'okr-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Quarterly OKR Review · Q2 2026</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Grading<br/>the quarter.</h1>
    <p class="lead reveal">Northwind Product &amp; Growth · Leadership Review</p>
  </div>
</div>`,
    }),
    s({
      id: 'okr-howto',
      name: 'How to read this',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How to read this review</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Every objective scored 0.0 to 1.0.</h2>
  <div class="scaleband reveal">
    <div class="scalecard"><div class="scalecard-range">0.7 – 1.0</div><div class="scalecard-name">On track</div><div class="scalecard-d">Delivered as committed. Green RAG. The expected landing zone for a well-set objective.</div></div>
    <div class="scalecard"><div class="scalecard-range">0.4 – 0.6</div><div class="scalecard-name">Progress, behind</div><div class="scalecard-d">Real movement, short of target. Amber RAG. Needs a named unblock or a reset.</div></div>
    <div class="scalecard"><div class="scalecard-range">0.0 – 0.3</div><div class="scalecard-name">Missed</div><div class="scalecard-d">Stalled or not started. Red RAG. We say why, and what changes next quarter.</div></div>
  </div>
  <div class="row wrap reveal" style="margin-top:34px;--gap:18px">
    <span class="scale"><span class="v">0.7</span><span class="l">target for a stretch objective</span></span>
    <span class="rag green">Green</span><span class="rag amber">Amber</span><span class="rag red">Red</span>
    <span class="conf">Confidence<span class="dots"><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span><span class="dot"></span></span></span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">How to read this</span></div>
</div>`,
    }),
    s({
      id: 'okr-glance',
      name: 'Quarter at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The quarter at a glance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A solid quarter — one objective at risk.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">0.71</div><div class="stat-label">Average objective score across the company</div></div>
    <div class="stat"><div class="stat-num">3 / 4</div><div class="stat-label">Objectives graded green or near-green</div></div>
    <div class="stat"><div class="stat-num">11 / 14</div><div class="stat-label">Key results hit their committed target</div></div>
    <div class="stat"><div class="stat-num">+0.09</div><div class="stat-label">Improvement on last quarter's average</div></div>
  </div>
  <div class="row wrap reveal" style="margin-top:40px;--gap:16px">
    <span class="rag green">2 Green</span>
    <span class="rag amber">1 Amber</span>
    <span class="rag red">1 Red</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">At a glance</span></div>
</div>`,
    }),
    s({
      id: 'okr-div1',
      name: 'Section · Objectives',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — This quarter</div>
  <div class="divider-title reveal">The objectives,<br/>graded.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'okr-obj1',
      name: 'Objective 1',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="obj reveal">
    <div class="obj-head">
      <div class="obj-meta">
        <div class="row" style="--gap:18px"><span class="obj-owner">Objective 01 · Growth</span><span class="rag green">On track</span></div>
        <div class="obj-title">Make activation the strongest lever in the funnel.</div>
        <div class="row wrap" style="--gap:14px"><span class="scale"><span class="v">0.82</span><span class="l">final score</span></span><span class="conf">Confidence<span class="dots"><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span></span></span></div>
      </div>
      <div class="obj-donut"><div class="donut" style="--donut-size:230px;--p:82"><div class="donut-label">0.82</div></div><div class="obj-score">objective score</div></div>
    </div>
    <div class="krs">
      <div class="kr"><div class="kr-label"><b>KR1</b> — Lift 30-day activation from 41% to 60%</div><div class="kr-track"><div class="kr-fill" style="width:95%"></div></div><div class="kr-val">0.95</div></div>
      <div class="kr"><div class="kr-label"><b>KR2</b> — Ship the guided-setup flow to 100% of new accounts</div><div class="kr-track"><div class="kr-fill" style="width:100%"></div></div><div class="kr-val">1.00</div></div>
      <div class="kr"><div class="kr-label"><b>KR3</b> — Cut time-to-first-value from 4 days to under 1</div><div class="kr-track"><div class="kr-fill amber" style="width:55%"></div></div><div class="kr-val">0.55</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Objective 01</span></div>
</div>`,
    }),
    s({
      id: 'okr-obj2',
      name: 'Objective 2',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="obj reveal">
    <div class="obj-head">
      <div class="obj-meta">
        <div class="row" style="--gap:18px"><span class="obj-owner">Objective 02 · Product</span><span class="rag green">On track</span></div>
        <div class="obj-title">Make the platform something teams trust at scale.</div>
        <div class="row wrap" style="--gap:14px"><span class="scale"><span class="v">0.74</span><span class="l">final score</span></span><span class="conf">Confidence<span class="dots"><span class="dot on"></span><span class="dot on"></span><span class="dot on"></span><span class="dot"></span></span></span></div>
      </div>
      <div class="obj-donut"><div class="donut" style="--donut-size:230px;--p:74"><div class="donut-label">0.74</div></div><div class="obj-score">objective score</div></div>
    </div>
    <div class="krs">
      <div class="kr"><div class="kr-label"><b>KR1</b> — Raise platform uptime from 99.5% to 99.95%</div><div class="kr-track"><div class="kr-fill" style="width:90%"></div></div><div class="kr-val">0.90</div></div>
      <div class="kr"><div class="kr-label"><b>KR2</b> — Reduce P1 incidents from 9 to 2 per quarter</div><div class="kr-track"><div class="kr-fill" style="width:80%"></div></div><div class="kr-val">0.80</div></div>
      <div class="kr"><div class="kr-label"><b>KR3</b> — Achieve SOC 2 Type II readiness across all controls</div><div class="kr-track"><div class="kr-fill amber" style="width:50%"></div></div><div class="kr-val">0.50</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Objective 02</span></div>
</div>`,
    }),
    s({
      id: 'okr-obj3',
      name: 'Objective 3',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="obj reveal">
    <div class="obj-head">
      <div class="obj-meta">
        <div class="row" style="--gap:18px"><span class="obj-owner">Objective 03 · Revenue</span><span class="rag red">At risk</span></div>
        <div class="obj-title">Turn expansion into our most reliable growth engine.</div>
        <div class="row wrap" style="--gap:14px"><span class="scale"><span class="v">0.38</span><span class="l">final score</span></span><span class="conf">Confidence<span class="dots"><span class="dot on"></span><span class="dot on"></span><span class="dot"></span><span class="dot"></span></span></span></div>
      </div>
      <div class="obj-donut"><div class="donut" style="--donut-size:230px;--p:38;--accent:#dc2626"><div class="donut-label" style="color:#dc2626">0.38</div></div><div class="obj-score">objective score</div></div>
    </div>
    <div class="krs">
      <div class="kr"><div class="kr-label"><b>KR1</b> — Grow net revenue retention from 108% to 120%</div><div class="kr-track"><div class="kr-fill amber" style="width:45%"></div></div><div class="kr-val">0.45</div></div>
      <div class="kr"><div class="kr-label"><b>KR2</b> — Launch usage-based pricing to the full base</div><div class="kr-track"><div class="kr-fill red" style="width:25%"></div></div><div class="kr-val">0.25</div></div>
      <div class="kr"><div class="kr-label"><b>KR3</b> — Reach $4M in expansion ARR booked</div><div class="kr-track"><div class="kr-fill amber" style="width:45%"></div></div><div class="kr-val">0.45</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Objective 03</span></div>
</div>`,
    }),
    s({
      id: 'okr-crosscut',
      name: 'Cross-cutting progress',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Cross-cutting score</div>
      <h2 class="headline" style="margin-top:8px">Three quarters of compounding focus.</h2>
      <p class="lead">The company-average objective score has climbed steadily as we narrowed to fewer, sharper bets each quarter.</p>
      <div class="row wrap" style="margin-top:24px;--gap:14px"><span class="scale"><span class="v">0.71</span><span class="l">this quarter</span></span><span class="rag green">Trending up</span></div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:54%"><div class="bar-fill" data-val="0.54"></div><div class="bar-label">Q3'25</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="0.58"></div><div class="bar-label">Q4'25</div></div>
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="0.62"></div><div class="bar-label">Q1'26</div></div>
      <div class="bar" style="--h:71%"><div class="bar-fill" data-val="0.71"></div><div class="bar-label">Q2'26</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Cross-cutting</span></div>
</div>`,
    }),
    s({
      id: 'okr-scorecard',
      name: 'Objective scorecard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The full scorecard</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">Every objective on one page.</h2>
  <table class="table reveal">
    <thead><tr><th>Objective</th><th>Owner</th><th class="num">Target</th><th class="num">Score</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Activation as the funnel's strongest lever</td><td class="muted">Growth</td><td class="num">0.70</td><td class="num">0.82</td><td><span class="rag green">On track</span></td></tr>
      <tr><td>A platform teams trust at scale</td><td class="muted">Product</td><td class="num">0.70</td><td class="num">0.74</td><td><span class="rag green">On track</span></td></tr>
      <tr><td>Expansion as our reliable growth engine</td><td class="muted">Revenue</td><td class="num">0.70</td><td class="num">0.38</td><td><span class="rag red">At risk</span></td></tr>
      <tr><td>A hiring bar that scales the org</td><td class="muted">People</td><td class="num">0.70</td><td class="num">0.61</td><td><span class="rag amber">Behind</span></td></tr>
      <tr class="row-em"><td>Company average</td><td class="muted">—</td><td class="num">0.70</td><td class="num">0.71</td><td><span class="rag green">On track</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Scorecard</span></div>
</div>`,
    }),
    s({
      id: 'okr-learned',
      name: 'What we learned',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What we learned</div>
      <h2 class="headline" style="margin-top:8px">Four reads on the quarter.</h2>
      <p class="lead">The objectives that scored highest shared one trait — a single owner and a metric nobody argued about.</p>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span><b>Narrow beats broad.</b> Our two green objectives each had one owner and three crisp KRs.</span></li>
      <li class="check"><span><b>Pricing was under-resourced.</b> We set a 0.7 target with half a team — the score showed it.</span></li>
      <li class="check"><span><b>Leading metrics work.</b> Activation moved because we tracked time-to-value weekly, not at close.</span></li>
      <li class="check"><span><b>Set fewer, commit harder.</b> Four objectives was right; the fifth we cut never would have landed.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Learnings</span></div>
</div>`,
    }),
    s({
      id: 'okr-div2',
      name: 'Section · Next quarter',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Looking ahead</div>
  <div class="divider-title reveal">Where we<br/>point Q3.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'okr-proposed',
      name: 'Proposed objectives',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Proposed for Q3 2026</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Three objectives, one carried forward.</h2>
  <div class="prop reveal" style="--cols:3">
    <div class="pcard"><div class="pcard-tag">O1 · GROWTH</div><div class="pcard-t">Make activation self-sustaining.</div><div class="pcard-d">Push 30-day activation past 65% and cut time-to-value below one day for every plan.</div></div>
    <div class="pcard"><div class="pcard-tag">O2 · REVENUE — CARRIED</div><div class="pcard-t">Reset expansion as a real engine.</div><div class="pcard-d">Relaunch usage-based pricing with a dedicated team and a phased rollout this time.</div></div>
    <div class="pcard"><div class="pcard-tag">O3 · TRUST</div><div class="pcard-t">Close out enterprise readiness.</div><div class="pcard-d">Finish SOC 2 Type II and ship the admin controls our top accounts asked for.</div></div>
  </div>
  <div class="row wrap reveal" style="margin-top:30px;--gap:16px"><span class="scale"><span class="v">0.7</span><span class="l">stretch target on every objective</span></span><span class="conf">Carried-forward · candid reset</span></div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Proposed Q3</span></div>
</div>`,
    }),
    s({
      id: 'okr-focus',
      name: 'Focus & bets',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Focus &amp; bets</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">How we'll spend the quarter.</h2>
  <ol class="steps reveal" style="--gap:26px">
    <li class="step"><span><b>Staff the pricing bet properly.</b> A dedicated squad owns expansion end to end — no more borrowed time.</span></li>
    <li class="step"><span><b>Instrument every objective weekly.</b> Each KR gets a leading metric reviewed in the Monday standup.</span></li>
    <li class="step"><span><b>Protect the green.</b> Keep activation and platform-trust funded so they don't regress while we fix revenue.</span></li>
    <li class="step"><span><b>Cut anything off-roadmap.</b> If work doesn't ladder to one of the three objectives, it waits.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Focus &amp; bets</span></div>
</div>`,
    }),
    s({
      id: 'okr-risks',
      name: 'Risks & watch items',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; watch items</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What could keep us from 0.7.</h2>
  <div class="cols-2 reveal" style="gap:30px">
    <div class="callout warn"><div class="callout-k">Amber — capacity</div><p class="body" style="max-width:none">The pricing squad pulls two senior engineers off platform. If trust regresses, we re-balance by week 4.</p></div>
    <div class="callout"><div class="callout-k">Watch — dependency</div><p class="body" style="max-width:none">SOC 2 sign-off depends on an external auditor's calendar. Slot is booked, but slippage moves Objective 03.</p></div>
    <div class="callout warn"><div class="callout-k">Amber — adoption</div><p class="body" style="max-width:none">Usage-based pricing needs 40% of accounts to opt in. Below that, expansion ARR misses again.</p></div>
    <div class="callout"><div class="callout-k">Watch — hiring</div><p class="body" style="max-width:none">Two squad leads still open. Filling both by month one is the unlock for the focus plan above.</p></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'okr-quote',
      name: 'Leadership quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"A 0.7 isn't a miss — it's the sign we set the bar high enough. The one to fix is the 0.38, and we know exactly why."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Menon</span><span class="cite-role">Chief Operating Officer, Northwind</span></div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Leadership view</span></div>
</div>`,
    }),
    s({
      id: 'okr-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Commit &amp; move</div>
    <h2 class="display reveal" style="--display-size:118px">Same bar.<br/>Sharper bets.</h2>
    <p class="lead reveal">Q3 objectives locked at the next leadership sync · okrs@northwind.co</p>
  </div>
</div>`,
    }),
  ],
}
