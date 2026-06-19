import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/finance-pro-cover.jpg'
const FIG_IMG = 'assets/finance-pro-fig.jpg'

export const financePro: Template = {
  id: 'finance-pro',
  categories: ['Reporting'],
  name: 'Finance Pro',
  tagline: 'Authoritative serif headlines, data that leads',
  audiences: ['finance', 'investor', 'board', 'analyst'],
  description:
    'A sober, authoritative light deck: Fraunces serif headlines, IBM Plex body, hairline tables and tabular numerics. A complete CFO quarterly financial report — KPIs, P&L, segments, cash, guidance, and risks — you tailor with your own numbers.',
  fonts: {
    display: 'Fraunces',
    body: 'IBM Plex Sans',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0e2236',
    '--muted': '#5a6b7b',
    '--accent': '#0d7a6f',
    '--accent-2': '#123a6b',
    '--display': "'Fraunces', serif",
    '--body': "'IBM Plex Sans', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.18em',
    '--kicker-size': '21px',
    '--title-size': '116px',
    '--headline-size': '72px',
    '--lead-size': '36px',
    '--card-bg': '#f4f7f9',
    '--card-border': '#dde5ea',
    '--radius': '8px',
    '--metric-size': '128px',
    '--stat-size': '104px',
    '--th-border': '#0e2236',
    '--table-border': '#e0e7ec',
    '--track': '#e3eaef',
    '--donut-hole': '#ffffff',
    '--bar-gap': '30px',
    '--media-radius': '8px',
    '--media-shadow': '0 40px 90px -38px rgba(14,34,54,0.4)',
    '--scrim':
      'linear-gradient(180deg, rgba(8,18,32,0.12) 0%, rgba(8,18,32,0.5) 55%, rgba(8,18,32,0.9) 100%)',
    '--pos': '#0d7a6f',
    '--neg': '#c0392b',
  },
  stageBg: '#eef2f5',
  assets: ['finance-pro-cover.jpg', 'finance-pro-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent-2); }
.bar-fill { background: var(--accent); }
.section-num { color: var(--accent); }
.body, .card-body, .table td, .lead, .tl-when { font-variant-numeric: tabular-nums; }

/* Section divider — hairline-ruled, navy numeral on white */
.fdiv { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.fdiv-num { font-family: var(--mono); font-weight: 500; letter-spacing: 0.2em; font-size: 24px; color: var(--accent); }
.fdiv-title { font-family: var(--display); font-weight: 500; font-size: 148px; line-height: 0.96; letter-spacing: -0.02em; color: var(--text); }
.fdiv-rule { width: 120px; height: 3px; background: var(--accent); margin-top: 18px; }
.fdiv-sub { font-family: var(--body); font-size: 32px; color: var(--muted); max-width: 30ch; margin-top: 6px; }

/* KPI band — hairline-divided, tabular figures with a delta chip */
.kband { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); }
.kcell { padding: 0 48px; }
.kcell:first-child { padding-left: 0; }
.kcell + .kcell { border-left: 1px solid var(--card-border); }
.kval { font-family: var(--display); font-weight: 600; font-size: 92px; line-height: 1; letter-spacing: -0.02em; color: var(--accent-2); font-variant-numeric: tabular-nums; }
.klabel { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 16px; line-height: 1.3; }
.kdelta { display: inline-flex; align-items: center; gap: 7px; font-family: var(--body); font-weight: 600; font-size: 23px; margin-top: 14px; }
.kdelta.up { color: var(--pos); } .kdelta.down { color: var(--neg); } .kdelta.flat { color: var(--muted); }
.kdelta.up::before { content: '\\25B2'; font-size: 13px; } .kdelta.down::before { content: '\\25BC'; font-size: 13px; }

/* Ledger note — left-ruled navy callout for the headline read */
.note { border-left: 4px solid var(--accent); background: var(--card-bg); padding: 30px 38px; border-radius: 0 8px 8px 0; }
.note-k { font-family: var(--mono); font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }
.note-b { font-family: var(--body); font-size: 30px; line-height: 1.4; color: var(--text); }
.note-b b { font-weight: 600; }

/* Trend chip — small mono delta tag for inline reads */
.trend { font-family: var(--mono); font-weight: 500; font-size: 22px; letter-spacing: 0.02em; }
.trend.up { color: var(--pos); } .trend.down { color: var(--neg); }

/* Legend rows for the segment donut */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 16px; height: 16px; border-radius: 4px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; font-family: var(--mono); font-weight: 500; color: var(--muted); }

/* Risk grid — bordered cells with a likelihood tag */
.rgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
.rcell { border: 1px solid var(--card-border); border-radius: 8px; padding: 32px 34px; background: var(--card-bg); }
.rcell-h { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.rcell-t { font-family: var(--display); font-weight: 600; font-size: 36px; color: var(--text); }
.rtag { font-family: var(--mono); font-weight: 500; font-size: 19px; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--card-border); color: var(--muted); }
.rtag.med { color: #9a6a00; border-color: #e6d3a8; background: #fbf4e3; }
.rtag.high { color: var(--neg); border-color: #ecc6c0; background: #fbeae7; }
.rcell-d { font-family: var(--body); font-size: 26px; line-height: 1.42; color: var(--muted); margin-top: 14px; }

@media (max-width: 640px) {
  html.deck-can-flow .fdiv { position: relative !important; inset: auto !important; min-height: 320px; padding: 56px 22px !important; justify-content: center; }
  html.deck-can-flow .fdiv-title { font-size: min(50px, 14vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .fdiv-sub { font-size: min(20px, 6vw) !important; max-width: 100% !important; }
  html.deck-can-flow .kband { grid-template-columns: 1fr !important; }
  html.deck-can-flow .kcell { padding: 22px 0 !important; }
  html.deck-can-flow .kcell:first-child { padding-top: 0 !important; }
  html.deck-can-flow .kcell + .kcell { border-left: 0 !important; border-top: 1px solid var(--card-border); }
  html.deck-can-flow .kval { font-size: min(44px, 12vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .rgrid { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .rcell { padding: 26px 22px !important; }
  html.deck-can-flow .rcell-t { font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .note { padding: 24px 22px !important; }
  html.deck-can-flow .note-b { font-size: min(22px, 6vw) !important; }
  html.deck-can-flow .legend-row { font-size: min(22px, 6vw) !important; }
}`,
  notes:
    'A complete CFO quarterly financial report: Fraunces serif headlines, IBM Plex body, IBM Plex Mono eyebrows, ink #0e2236 on white, ONE deep-teal accent (#0d7a6f) with a navy secondary (#123a6b). Open on the architectural full-bleed cover (assets/finance-pro-cover.jpg) and use the still-life figure (assets/finance-pro-fig.jpg) for the commentary split. Lead with .table for financials (use .num, .pos/.neg, .row-em for totals), .kband for the KPI dashboard, .bars and the multi-segment .donut for performance, .timeline for initiatives, .note for the headline read, and the .rgrid risk cells. Tabular numerics everywhere; restrained color — let the numbers carry it. Break acts with the hairline .fdiv section divider.',
  sampleSlides: [
    s({
      id: 'fp-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Q3 FY2026 Financial Report · CFO Review</div>
    <h1 class="title reveal" style="margin-top:10px">Durable growth,<br/>compounding margins.</h1>
    <p class="lead reveal">Northwind Systems, Inc. · Prepared for the Board of Directors</p>
  </div>
</div>`,
    }),
    s({
      id: 'fp-summary',
      name: 'Executive summary',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Executive summary</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A strong quarter, ahead of plan.</h2>
  <div class="kband reveal" style="--cols:4">
    <div class="kcell"><div class="kval">$52.4M</div><div class="klabel">Total revenue</div><div class="kdelta up">38% YoY</div></div>
    <div class="kcell"><div class="kval">74.1%</div><div class="klabel">Gross margin</div><div class="kdelta up">3.2 pts</div></div>
    <div class="kcell"><div class="kval">$6.1M</div><div class="klabel">Operating income</div><div class="kdelta up">turned positive</div></div>
    <div class="kcell"><div class="kval">$184M</div><div class="klabel">Cash &amp; equivalents</div><div class="kdelta flat">21 mo runway</div></div>
  </div>
  <p class="lead reveal" style="max-width:62ch;margin-top:44px">Revenue beat the midpoint of guidance by <b>4%</b>, margins expanded as efficiency programs landed, and the business reached operating profitability a quarter ahead of plan.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Q3 FY2026</span></div>
</div>`,
    }),
    s({
      id: 'fp-revenue',
      name: 'Revenue performance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Revenue performance</div>
      <h2 class="headline" style="margin-top:8px">Five quarters of compounding.</h2>
      <div class="note" style="margin-top:30px">
        <div class="note-k">Headline read</div>
        <p class="note-b">Sequential growth re-accelerated to <b>11% QoQ</b> as enterprise bookings converted to recognized revenue.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="$32M"></div><div class="bar-label">Q3'25</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="$38M"></div><div class="bar-label">Q4'25</div></div>
      <div class="bar" style="--h:68%"><div class="bar-fill" data-val="$43M"></div><div class="bar-label">Q1'26</div></div>
      <div class="bar" style="--h:80%"><div class="bar-fill" data-val="$47M"></div><div class="bar-label">Q2'26</div></div>
      <div class="bar" style="--h:94%"><div class="bar-fill" data-val="$52M"></div><div class="bar-label">Q3'26</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Revenue</span></div>
</div>`,
    }),
    s({
      id: 'fp-pnl',
      name: 'P&L summary',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Profit &amp; loss summary</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Income statement.</h2>
  <table class="table reveal">
    <thead><tr><th>($M)</th><th class="num">Q3'25</th><th class="num">Q2'26</th><th class="num">Q3'26</th><th class="num">YoY</th></tr></thead>
    <tbody>
      <tr><td>Revenue</td><td class="num">37.9</td><td class="num">47.2</td><td class="num">52.4</td><td class="num pos">+38%</td></tr>
      <tr><td>Cost of revenue</td><td class="num">(11.2)</td><td class="num">(12.6)</td><td class="num">(13.6)</td><td class="num neg">+21%</td></tr>
      <tr class="row-em"><td>Gross profit</td><td class="num">26.7</td><td class="num">34.6</td><td class="num">38.8</td><td class="num pos">+45%</td></tr>
      <tr><td>Sales &amp; marketing</td><td class="num">(14.1)</td><td class="num">(15.8)</td><td class="num">(16.4)</td><td class="num neg">+16%</td></tr>
      <tr><td>Research &amp; development</td><td class="num">(9.8)</td><td class="num">(11.2)</td><td class="num">(11.9)</td><td class="num neg">+21%</td></tr>
      <tr><td>General &amp; administrative</td><td class="num">(4.1)</td><td class="num">(4.3)</td><td class="num">(4.4)</td><td class="num neg">+7%</td></tr>
      <tr class="row-em"><td>Operating income</td><td class="num">(1.3)</td><td class="num">3.3</td><td class="num">6.1</td><td class="num pos">+$7.4</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">P&amp;L</span></div>
</div>`,
    }),
    s({
      id: 'fp-margins',
      name: 'Margins & unit economics',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Margins &amp; unit economics</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:34px">Efficient, self-funding growth.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">123%</div><div class="stat-label">Net revenue retention · <span class="trend up">+5 pts</span></div></div>
    <div class="stat"><div class="stat-num">10 mo</div><div class="stat-label">CAC payback · <span class="trend up">1 mo faster</span></div></div>
    <div class="stat"><div class="stat-num">5.8×</div><div class="stat-label">LTV / CAC ratio · <span class="trend up">+0.4×</span></div></div>
    <div class="stat"><div class="stat-num">54</div><div class="stat-label">Rule of 40 score · <span class="trend up">+6</span></div></div>
  </div>
  <div class="note reveal" style="margin-top:48px;max-width:none">
    <div class="note-k">Why it matters</div>
    <p class="note-b">Each cohort now repays its acquisition cost faster than it did a year ago — growth is <b>compounding on itself</b> rather than consuming capital.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Unit economics</span></div>
</div>`,
    }),
    s({
      id: 'fp-sec1',
      name: 'Section · Segments',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">01 — Segments</div>
  <div class="fdiv-title reveal">Where the<br/>revenue lives.</div>
  <div class="fdiv-rule reveal"></div>
  <p class="fdiv-sub reveal">Mix, cohorts, and the durability of each line of business.</p>
</div>`,
    }),
    s({
      id: 'fp-segments',
      name: 'Segment breakdown',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Revenue by segment</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Enterprise leads the mix.</h2>
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:330px;background:conic-gradient(#0d7a6f 0 56%, #123a6b 56% 81%, #8aa0ad 81% 100%)"><div class="donut-label">56%</div></div>
    </div>
    <div>
      <div class="legend" style="margin-bottom:30px">
        <div class="legend-row"><span class="legend-dot" style="background:#0d7a6f"></span>Enterprise<span class="v">56%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#123a6b"></span>Mid-market<span class="v">25%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#8aa0ad"></span>Self-serve<span class="v">19%</span></div>
      </div>
      <table class="table" style="--table-size:26px">
        <thead><tr><th>Segment</th><th class="num">ARR</th><th class="num">YoY</th><th class="num">NRR</th></tr></thead>
        <tbody>
          <tr><td>Enterprise</td><td class="num">$118M</td><td class="num pos">+52%</td><td class="num">131%</td></tr>
          <tr><td>Mid-market</td><td class="num">$52M</td><td class="num pos">+28%</td><td class="num">114%</td></tr>
          <tr><td>Self-serve</td><td class="num">$40M</td><td class="num pos">+19%</td><td class="num">102%</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Segments</span></div>
</div>`,
    }),
    s({
      id: 'fp-cohorts',
      name: 'Cohort retention',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Net revenue retention by cohort</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Cohorts expand over time.</h2>
  <table class="table reveal">
    <thead><tr><th>Cohort</th><th class="num">Year 1</th><th class="num">Year 2</th><th class="num">Year 3</th><th class="num">Year 4</th></tr></thead>
    <tbody>
      <tr><td>FY2023</td><td class="num">100%</td><td class="num">112%</td><td class="num">128%</td><td class="num">141%</td></tr>
      <tr><td>FY2024</td><td class="num">100%</td><td class="num">116%</td><td class="num">133%</td><td class="num muted">—</td></tr>
      <tr><td>FY2025</td><td class="num">100%</td><td class="num">119%</td><td class="num muted">—</td><td class="num muted">—</td></tr>
      <tr class="row-em"><td>Blended</td><td class="num">100%</td><td class="num pos">+16%</td><td class="num pos">+30%</td><td class="num pos">+41%</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Each annual cohort retains and expands faster than the one before it — gross logo churn held at 4% for the quarter.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Cohorts</span></div>
</div>`,
    }),
    s({
      id: 'fp-cash',
      name: 'Cash & runway',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Cash &amp; runway</div>
      <h2 class="headline" style="margin-top:8px">Funded through profitability.</h2>
      <ul class="bullets" style="--gap:24px;margin-top:24px">
        <li class="bullet"><span><b>$184M</b> in cash and equivalents at quarter end.</span></li>
        <li class="bullet"><span><b>Free cash flow positive</b> for two consecutive quarters.</span></li>
        <li class="bullet"><span><b>No debt</b> drawn; revolver remains fully undrawn.</span></li>
      </ul>
    </div>
    <div>
      <div class="stats" style="margin-bottom:34px">
        <div class="stat"><div class="stat-num">$8.4M</div><div class="stat-label">Quarterly free cash flow</div></div>
        <div class="stat"><div class="stat-num">21 mo</div><div class="stat-label">Runway at current burn</div></div>
      </div>
      <div class="note">
        <div class="note-k">Capital position</div>
        <p class="note-b">With FCF positive, runway is now <b>effectively indefinite</b> at the current operating plan.</p>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Cash</span></div>
</div>`,
    }),
    s({
      id: 'fp-sec2',
      name: 'Section · Outlook',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">02 — Outlook</div>
  <div class="fdiv-title reveal">Guidance and<br/>the road ahead.</div>
  <div class="fdiv-rule reveal"></div>
  <p class="fdiv-sub reveal">Forward estimates, the risks around them, and where we invest next.</p>
</div>`,
    }),
    s({
      id: 'fp-guidance',
      name: 'Guidance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Guidance</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Raising the full-year outlook.</h2>
  <table class="table reveal">
    <thead><tr><th>($M)</th><th class="num">Q3'26 actual</th><th class="num">Q4'26 guide</th><th class="num">FY2026 guide</th><th class="num">Prior FY</th></tr></thead>
    <tbody>
      <tr><td>Revenue</td><td class="num">52.4</td><td class="num">55–57</td><td class="num">198–200</td><td class="num muted">188–192</td></tr>
      <tr><td>Gross margin</td><td class="num">74.1%</td><td class="num">74–75%</td><td class="num">73.5%</td><td class="num muted">72%</td></tr>
      <tr><td>Operating margin</td><td class="num">11.6%</td><td class="num">12–13%</td><td class="num">9–10%</td><td class="num muted">6–7%</td></tr>
      <tr class="row-em"><td>Free cash flow</td><td class="num">8.4</td><td class="num">9–11</td><td class="num">28–32</td><td class="num muted">18–22</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">FY revenue guide raised <b>$10M</b> at the midpoint on stronger enterprise net retention and a healthier pipeline coverage of 3.4×.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Guidance</span></div>
</div>`,
    }),
    s({
      id: 'fp-risks',
      name: 'Risks & sensitivities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; sensitivities</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:28px">What could move the numbers.</h2>
  <div class="rgrid reveal">
    <div class="rcell">
      <div class="rcell-h"><div class="rcell-t">Enterprise concentration</div><span class="rtag med">Medium</span></div>
      <div class="rcell-d">Top 10 accounts are 22% of ARR. A 5-pt swing in renewal rate moves FY revenue ±$4M.</div>
    </div>
    <div class="rcell">
      <div class="rcell-h"><div class="rcell-t">FX exposure</div><span class="rtag med">Medium</span></div>
      <div class="rcell-d">31% of revenue is EUR/GBP. A 10% currency move is roughly ±$2M to reported revenue.</div>
    </div>
    <div class="rcell">
      <div class="rcell-h"><div class="rcell-t">Sales cycle elongation</div><span class="rtag high">High</span></div>
      <div class="rcell-d">Macro caution is lengthening enterprise cycles ~2 weeks; pipeline coverage offsets it for now.</div>
    </div>
    <div class="rcell">
      <div class="rcell-h"><div class="rcell-t">Cloud cost inflation</div><span class="rtag med">Medium</span></div>
      <div class="rcell-d">Infrastructure is 8% of revenue. Committed-use discounts hedge most of the exposure.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'fp-initiatives',
      name: 'Key initiatives',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key initiatives</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:10px">Where we invest next.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q4 '26</div><div class="tl-what"><b>Pricing &amp; packaging refresh</b> — usage-based tier rolls out, expected +2 pts to net retention.</div></div>
    <div class="tl-row"><div class="tl-when">Q1 '27</div><div class="tl-what"><b>EMEA expansion</b> — Frankfurt data region live; localizes 31% of revenue and shortens enterprise cycles.</div></div>
    <div class="tl-row"><div class="tl-when">Q2 '27</div><div class="tl-what"><b>Finance automation platform</b> — internal close cut from 9 to 4 days, freeing the team for analysis.</div></div>
    <div class="tl-row"><div class="tl-when">Q3 '27</div><div class="tl-what"><b>Margin program II</b> — infrastructure re-architecture targets a further 2-pt gross-margin gain.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Initiatives</span></div>
</div>`,
    }),
    s({
      id: 'fp-commentary',
      name: 'CFO commentary',
      transition: 'fade',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">CFO commentary</div>
    <blockquote class="quote reveal" style="--quote-size:58px">"We crossed into profitability without easing off growth — and we did it on our own cash. That is the position we set out to reach."</blockquote>
    <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nair</span><span class="cite-role">Chief Financial Officer</span></div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'fp-appendix',
      name: 'Appendix · Definitions',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Appendix · Definitions</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:26px">Non-GAAP measures.</h2>
  <div class="cols-2 reveal" style="gap:30px">
    <div class="card"><div class="card-title" style="font-size:34px">Net revenue retention</div><div class="card-body">Trailing-12-month revenue from the prior-year cohort, including expansion and net of churn and contraction.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">Rule of 40</div><div class="card-body">Year-over-year revenue growth rate plus free-cash-flow margin, expressed as a single score.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">CAC payback</div><div class="card-body">Months of gross profit required to recover the fully loaded sales and marketing cost of a new customer.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">Free cash flow</div><div class="card-body">Operating cash flow less purchases of property, equipment, and capitalized software.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Systems</span><span class="runner-label">Appendix</span></div>
</div>`,
    }),
    s({
      id: 'fp-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Discussion</div>
    <h2 class="title reveal" style="--title-size:108px">Questions &amp;<br/>deep dives.</h2>
    <p class="lead reveal">Priya Nair · ir@northwindsystems.com · Detailed financials in the data room.</p>
  </div>
</div>`,
    }),
  ],
}
