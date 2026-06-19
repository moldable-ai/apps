import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide
const IMG = 'assets/sample.jpg'

const QBR_IMG = 'assets/qbr-cover.jpg'
const EXEC_SECTION = 'assets/exec-section.jpg'
const EXEC_TEAM = 'assets/exec-team.jpg'

export const executiveReview: Template = {
  id: 'executive-review',
  categories: ['Reporting', 'Strategy'],
  name: 'Executive Review',
  tagline: 'Dark, authoritative board-room deck',
  audiences: ['executive', 'board', 'qbr', 'corporate'],
  description:
    'A warm near-black executive deck with a refined serif, a single crimson accent, KPI dashboards, scorecards, and rich carved-wood imagery. A complete board-review narrative you tailor with your own numbers.',
  fonts: {
    display: 'Fraunces',
    body: 'Satoshi',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap',
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#14110e',
    '--text': '#f1eae1',
    '--muted': '#a59a8c',
    '--accent': '#cf4b3e',
    '--accent-2': '#cf4b3e',
    '--display': "'Fraunces', serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '500',
    '--title-size': '128px',
    '--headline-size': '78px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--card-bg': 'rgba(255,255,255,0.045)',
    '--card-border': 'rgba(255,255,255,0.12)',
    '--radius': '12px',
    '--stat-size': '108px',
    '--metric-size': '124px',
    '--th-border': 'rgba(255,255,255,0.5)',
    '--table-border': 'rgba(255,255,255,0.1)',
    '--rule-color': 'rgba(255,255,255,0.14)',
    '--track': 'rgba(255,255,255,0.1)',
    '--donut-hole': '#14110e',
    '--media-border': '1px solid rgba(255,255,255,0.1)',
    '--media-shadow': '0 60px 120px -45px rgba(0,0,0,0.8)',
    '--scrim':
      'linear-gradient(180deg, rgba(20,17,14,0.2) 0%, rgba(20,17,14,0.55) 50%, rgba(20,17,14,0.95) 100%)',
    '--pos': '#5fb98b',
    '--neg': '#cf4b3e',
  },
  stageBg: '#14110e',
  assets: ['qbr-cover.jpg', 'exec-section.jpg', 'exec-team.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num { color: var(--accent); }
.bar-fill { background: var(--accent); }
.lede { font-family: var(--display); font-weight: 500; font-size: 60px; line-height: 1.16; letter-spacing: -0.01em; color: var(--text); max-width: 22ch; }
.ag { display: flex; gap: 26px; align-items: baseline; padding: 22px 0; border-top: 1px solid var(--card-border); }
.ag-n { font-family: var(--display); font-weight: 600; font-size: 38px; color: var(--accent); flex: 0 0 auto; }
.ag-t { font-family: var(--display); font-weight: 500; font-size: 42px; color: var(--text); }
.ag-d { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 4px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
.kpi { padding: 0 46px; }
.kpi:first-child { padding-left: 0; }
.kpi + .kpi { border-left: 1px solid var(--card-border); }
.kpi-val { font-family: var(--display); font-weight: 600; font-size: 88px; line-height: 1; letter-spacing: -0.02em; color: #fff; font-variant-numeric: tabular-nums; }
.kpi-label { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 14px; }
.delta { display: inline-flex; align-items: center; gap: 7px; font-family: var(--body); font-weight: 700; font-size: 24px; margin-top: 14px; }
.delta.up { color: var(--pos); } .delta.down { color: var(--accent); }
.delta.up::before { content: '\\25B2'; font-size: 15px; } .delta.down::before { content: '\\25BC'; font-size: 15px; }
.callout { border-left: 4px solid var(--accent); background: rgba(207,75,62,0.1); padding: 34px 42px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 21px; color: var(--accent); margin-bottom: 12px; }
.status { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 600; font-size: 26px; }
.status::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.status.on::before { background: var(--pos); } .status.risk::before { background: #e0a23c; } .status.off::before { background: var(--accent); }
.sec-rule { width: 120px; height: 3px; background: var(--accent); }
.legend { display: flex; flex-direction: column; gap: 20px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 18px; height: 18px; border-radius: 5px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); }
@media (max-width: 640px) {
  html.deck-can-flow .lede { font-size: min(42px, 12vw) !important; line-height: 1.12 !important; max-width: 100% !important; }
  html.deck-can-flow .ag-t { font-size: min(30px, 8vw) !important; line-height: 1.1 !important; }
  html.deck-can-flow .ag-n { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .kpi-grid { grid-template-columns: 1fr !important; }
  html.deck-can-flow .kpi { padding: 22px 0 0 !important; }
  html.deck-can-flow .kpi:first-child { padding-top: 0 !important; }
  html.deck-can-flow .kpi + .kpi { border-left: none !important; border-top: 1px solid var(--card-border) !important; }
  html.deck-can-flow .kpi-val { font-size: min(52px, 14vw) !important; }
  html.deck-can-flow .callout { padding: 26px 22px !important; }
}`,
  notes:
    'A complete board-review deck: open and close on the carved-wood full-bleed (assets/qbr-cover.jpg), break acts with the marble section divider (assets/exec-section.jpg), and use the portrait silk (assets/exec-team.jpg) for the team split. Lead with .kpi-grid dashboards, .bars and multi-segment .donut for performance, .table scorecards with .status pills, .timeline for the roadmap, .callout for the headline insight. Refined Fraunces serif on near-black, ONE crimson accent, gravitas over decoration. Keep the numbers tabular and the story tight.',
  sampleSlides: [
    s({
      id: 'qbr-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${QBR_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Quarterly Business Review · Q2 2026</div>
    <h1 class="display reveal" style="--display-size:144px;margin-top:8px">Steady hands,<br/>rising tide.</h1>
    <p class="lead reveal">Acme Corporation · Executive Leadership Team</p>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Agenda</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:10px">What we'll cover today.</h2>
  <div class="cols-2 reveal" style="gap:0 90px">
    <div class="ag"><div class="ag-n">01</div><div><div class="ag-t">Performance</div><div class="ag-d">Revenue, margin, retention</div></div></div>
    <div class="ag"><div class="ag-n">04</div><div><div class="ag-t">Team &amp; resources</div><div class="ag-d">Headcount and investment</div></div></div>
    <div class="ag"><div class="ag-n">02</div><div><div class="ag-t">Execution</div><div class="ag-d">Goals, accomplishments, scorecard</div></div></div>
    <div class="ag"><div class="ag-n">05</div><div><div class="ag-t">Challenges</div><div class="ag-d">What slowed us, what we learned</div></div></div>
    <div class="ag"><div class="ag-n">03</div><div><div class="ag-t">Outlook</div><div class="ag-d">Roadmap and financial guide</div></div></div>
    <div class="ag"><div class="ag-n">06</div><div><div class="ag-t">Decisions</div><div class="ag-d">What we need from the board</div></div></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-summary',
      name: 'Executive summary',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Executive summary</div>
      <p class="lede" style="margin-top:14px">A strong quarter — ahead of plan on revenue, with margins compounding.</p>
    </div>
    <div>
      <ul class="bullets" style="--gap:24px">
        <li class="bullet"><span><b>Revenue beat</b> guidance by 7% on enterprise strength.</span></li>
        <li class="bullet"><span><b>Margins expanded</b> six points as efficiency programs landed.</span></li>
        <li class="bullet"><span><b>One watch item:</b> hiring trails the FY plan — back on track in Q3.</span></li>
      </ul>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-sec1',
      name: 'Section · Performance',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${EXEC_SECTION}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Section 01</div>
    <h2 class="display reveal" style="--display-size:130px">Performance</h2>
    <div class="sec-rule reveal" style="margin-top:20px"></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-kpi',
      name: 'KPI dashboard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The quarter at a glance</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Key performance indicators.</h2>
  <div class="kpi-grid reveal">
    <div class="kpi"><div class="kpi-val">$48.2M</div><div class="kpi-label">Revenue</div><div class="delta up">7% vs plan</div></div>
    <div class="kpi"><div class="kpi-val">73%</div><div class="kpi-label">Gross margin</div><div class="delta up">6 pts QoQ</div></div>
    <div class="kpi"><div class="kpi-val">118%</div><div class="kpi-label">Net retention</div><div class="delta up">4 pts</div></div>
    <div class="kpi"><div class="kpi-val">11 mo</div><div class="kpi-label">CAC payback</div><div class="delta down">1 mo slower</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-trend',
      name: 'Revenue trend',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Revenue trend</div>
      <h2 class="headline" style="margin-top:6px">Four quarters of compounding.</h2>
      <div class="callout" style="margin-top:26px">
        <div class="callout-k">Headline</div>
        <p class="body" style="max-width:none">Enterprise drove <b>71%</b> of net-new ARR — the highest mix we've recorded.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:46%"><div class="bar-fill" data-val="$31M"></div><div class="bar-label">Q3'25</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" data-val="$38M"></div><div class="bar-label">Q4'25</div></div>
      <div class="bar" style="--h:74%"><div class="bar-fill" data-val="$44M"></div><div class="bar-label">Q1'26</div></div>
      <div class="bar" style="--h:92%"><div class="bar-fill" data-val="$48M"></div><div class="bar-label">Q2'26</div></div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-mix',
      name: 'Revenue mix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#cf4b3e 0 58%, #e0a23c 58% 82%, #8a7d6e 82% 100%)"><div class="donut-label">58%</div></div>
    </div>
    <div>
      <div class="kicker">Revenue by segment</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:24px">Enterprise leads the mix.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:#cf4b3e"></span>Enterprise<span class="v">58%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#e0a23c"></span>Mid-market<span class="v">24%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#8a7d6e"></span>Self-serve<span class="v">18%</span></div>
      </div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-sec2',
      name: 'Section · Execution',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${EXEC_SECTION}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Section 02</div>
    <h2 class="display reveal" style="--display-size:130px">Execution</h2>
    <div class="sec-rule reveal" style="margin-top:20px"></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-wins',
      name: 'Accomplishments',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key accomplishments</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">Three that mattered most.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="metric" style="--metric-size:84px">3</div><div class="card-title">Tier-1 logos</div><div class="card-body">Signed three reference enterprises, each fully deployed.</div></div>
    <div class="card"><div class="metric" style="--metric-size:84px">−22%</div><div class="card-title">Cloud spend</div><div class="card-body">Re-architecture cut infrastructure cost per account.</div></div>
    <div class="card"><div class="metric" style="--metric-size:84px">4.8</div><div class="card-title">CSAT</div><div class="card-body">Support satisfaction hit an all-time high.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-scorecard',
      name: 'Scorecard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Goal scorecard</div>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>Objective</th><th class="num">Target</th><th class="num">Actual</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Net-new ARR</td><td class="num">$12M</td><td class="num">$13.4M</td><td><span class="status on">Beat</span></td></tr>
      <tr><td>Gross margin</td><td class="num">70%</td><td class="num">73%</td><td><span class="status on">Beat</span></td></tr>
      <tr><td>Enterprise logos</td><td class="num">4</td><td class="num">3</td><td><span class="status risk">Near</span></td></tr>
      <tr><td>Headcount</td><td class="num">+40</td><td class="num">+27</td><td><span class="status off">Behind</span></td></tr>
    </tbody>
  </table>
</div>`,
    }),
    s({
      id: 'qbr-team',
      name: 'Team & resources',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Team &amp; resources</div>
    <h2 class="headline reveal">Investing where it compounds.</h2>
    <div class="stats reveal" style="margin-top:8px">
      <div class="stat"><div class="stat-num">312</div><div class="stat-label">Total headcount</div></div>
      <div class="stat"><div class="stat-num">42%</div><div class="stat-label">In product &amp; eng</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${EXEC_TEAM}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'qbr-challenges',
      name: 'Challenges & learnings',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Challenges &amp; learnings</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">What slowed us — and what we changed.</h2>
  <div class="cols-2 reveal" style="gap:28px">
    <div class="card"><div class="callout-k">Challenge</div><div class="card-title" style="font-size:36px">Hiring lagged the plan.</div><div class="card-body">A tight market pushed senior hires out by a quarter.</div></div>
    <div class="card" style="background:rgba(95,185,139,0.08);border-color:rgba(95,185,139,0.25)"><div class="callout-k" style="color:var(--pos)">Response</div><div class="card-title" style="font-size:36px">Opened two new geos.</div><div class="card-body">Recruiting pipeline now 2.3× deeper heading into Q3.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-sec3',
      name: 'Section · Outlook',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${EXEC_SECTION}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Section 03</div>
    <h2 class="display reveal" style="--display-size:130px">Outlook</h2>
    <div class="sec-rule reveal" style="margin-top:20px"></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The road ahead</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:10px">Next three quarters.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q3 '26</div><div class="tl-what"><b>Catch up on hiring</b> and ship the integrations platform to GA.</div></div>
    <div class="tl-row"><div class="tl-when">Q4 '26</div><div class="tl-what"><b>Reach operating breakeven</b> and launch the enterprise tier.</div></div>
    <div class="tl-row"><div class="tl-when">Q1 '27</div><div class="tl-what"><b>Expand internationally</b> — EMEA pilot with two design partners.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-financials',
      name: 'Financial guide',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Financial summary &amp; guide</div>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>($M)</th><th class="num">Q2 actual</th><th class="num">Q3 guide</th><th class="num">FY guide</th></tr></thead>
    <tbody>
      <tr><td>Revenue</td><td class="num">48.2</td><td class="num">52–54</td><td class="num">200–206</td></tr>
      <tr><td>Gross margin</td><td class="num">73%</td><td class="num">73–74%</td><td class="num">73%</td></tr>
      <tr><td>Operating income</td><td class="num">4.2</td><td class="num">5–6</td><td class="num">18–22</td></tr>
      <tr class="row-em"><td>Cash &amp; equivalents</td><td class="num">86.0</td><td class="num">88</td><td class="num">95+</td></tr>
    </tbody>
  </table>
</div>`,
    }),
    s({
      id: 'qbr-asks',
      name: 'Decisions needed',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">From the board</div>
      <h2 class="headline" style="margin-top:6px">Three decisions today.</h2>
    </div>
    <ul class="checks" style="--gap:26px">
      <li class="check"><span>Approve the <b>EMEA expansion</b> budget for Q1.</span></li>
      <li class="check"><span>Ratify the <b>raised FY guide</b> of $200–206M.</span></li>
      <li class="check"><span>Greenlight the <b>senior hiring plan</b> (+13 roles).</span></li>
    </ul>
  </div>
</div>`,
    }),
    s({
      id: 'qbr-thanks',
      name: 'Thank you',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${QBR_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Discussion</div>
    <h2 class="display reveal" style="--display-size:124px">Thank you.</h2>
    <p class="lead reveal">Questions, challenges, and decisions welcome.</p>
  </div>
</div>`,
    }),
  ],
}

// ── 10. Consulting (professional-services engagement) ─────────────────────
