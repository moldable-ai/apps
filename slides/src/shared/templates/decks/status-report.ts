import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/status-report-cover.jpg'

export const statusReport: Template = {
  id: 'status-report',
  categories: ['Project Management', 'Reporting'],
  name: 'Status Report',
  tagline: 'Exec RAG program status, at a glance',
  audiences: ['executive', 'sponsor', 'pmo', 'steering-committee'],
  description:
    'A disciplined slate-and-RAG program status report. A bold red/amber/green status banner, a workstream table with status pills, risk and issue callouts, a decisions-needed list, and a milestone timeline carry a complete steering-committee update you retitle with your own program.',
  fonts: {
    display: 'Inter',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#1f2937',
    '--muted': '#6b7280',
    '--accent': '#1f2937',
    '--accent-2': '#1f2937',
    '--display': "'Inter', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '800',
    '--title-size': '120px',
    '--headline-size': '72px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e5e7eb',
    '--card-shadow': '0 16px 40px -30px rgba(31,41,55,0.30)',
    '--radius': '14px',
    '--stat-size': '100px',
    '--metric-size': '112px',
    '--th-border': '#1f2937',
    '--table-border': '#e5e7eb',
    '--track': '#e5e7eb',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -45px rgba(31,41,55,0.4)',
    '--media-radius': '16px',
    '--scrim':
      'linear-gradient(180deg, rgba(17,24,39,0.12) 0%, rgba(17,24,39,0.50) 52%, rgba(17,24,39,0.92) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
    '--bullet-color': '#1f2937',
    '--bullet-radius': '3px',
  },
  stageBg: '#eef0f3',
  assets: ['status-report-cover.jpg'],
  decoration: `.kicker { color: var(--muted); }
.runner-brand::before { background: var(--accent); }

/* RAG status colors — the program's whole language */
:root {
  --red: #dc2626;
  --amber: #f59e0b;
  --green: #16a34a;
  --red-bg: rgba(220,38,38,0.08);
  --amber-bg: rgba(245,158,11,0.10);
  --green-bg: rgba(22,163,74,0.08);
}

/* Big RAG status banner — the cornerstone of the report */
.ragbanner { display: grid; grid-template-columns: 200px 1fr; align-items: center; gap: 48px; border-radius: 18px; padding: 52px 60px; border: 1px solid var(--card-border); }
.ragbanner.is-red { background: var(--red-bg); border-color: rgba(220,38,38,0.30); }
.ragbanner.is-amber { background: var(--amber-bg); border-color: rgba(245,158,11,0.32); }
.ragbanner.is-green { background: var(--green-bg); border-color: rgba(22,163,74,0.28); }
.rag-orb { width: 168px; height: 168px; border-radius: 50%; display: grid; place-items: center; font-family: var(--mono); font-weight: 600; font-size: 30px; color: #fff; letter-spacing: 0.04em; }
.is-red .rag-orb { background: var(--red); box-shadow: 0 0 0 14px var(--red-bg); }
.is-amber .rag-orb { background: var(--amber); box-shadow: 0 0 0 14px var(--amber-bg); }
.is-green .rag-orb { background: var(--green); box-shadow: 0 0 0 14px var(--green-bg); }
.rag-eyebrow { font-family: var(--mono); font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; font-size: 22px; color: var(--muted); }
.rag-label { font-family: var(--display); font-weight: 800; font-size: 76px; line-height: 1; letter-spacing: -0.02em; color: var(--text); margin-top: 8px; }
.is-red .rag-label { color: var(--red); }
.is-amber .rag-label { color: #b45309; }
.is-green .rag-label { color: var(--green); }
.rag-line { font-family: var(--body); font-size: 32px; line-height: 1.34; color: var(--text); margin-top: 16px; max-width: 30ch; }

/* Status pills — used in the workstream table and elsewhere */
.pill-rag { display: inline-flex; align-items: center; gap: 11px; font-family: var(--body); font-weight: 600; font-size: 25px; padding: 8px 20px; border-radius: 999px; }
.pill-rag::before { content: ''; width: 13px; height: 13px; border-radius: 50%; flex: 0 0 auto; }
.pill-rag.red { color: var(--red); background: var(--red-bg); } .pill-rag.red::before { background: var(--red); }
.pill-rag.amber { color: #b45309; background: var(--amber-bg); } .pill-rag.amber::before { background: var(--amber); }
.pill-rag.green { color: var(--green); background: var(--green-bg); } .pill-rag.green::before { background: var(--green); }
.trend { font-family: var(--mono); font-size: 24px; font-weight: 500; color: var(--muted); }
.trend.up { color: var(--green); } .trend.down { color: var(--red); } .trend.flat { color: var(--muted); }

/* Risk / issue callout cards */
.risk { border-radius: 14px; border: 1px solid var(--card-border); border-left-width: 6px; background: var(--card-bg); padding: 32px 36px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 12px; }
.risk.red { border-left-color: var(--red); }
.risk.amber { border-left-color: var(--amber); }
.risk-top { display: flex; align-items: center; gap: 16px; }
.risk-id { font-family: var(--mono); font-weight: 600; font-size: 22px; color: var(--muted); letter-spacing: 0.04em; }
.risk-sev { font-family: var(--mono); font-weight: 600; font-size: 19px; letter-spacing: 0.10em; text-transform: uppercase; padding: 5px 14px; border-radius: 6px; margin-left: auto; }
.risk.red .risk-sev { color: var(--red); background: var(--red-bg); }
.risk.amber .risk-sev { color: #b45309; background: var(--amber-bg); }
.risk-title { font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.1; color: var(--text); }
.risk-body { font-family: var(--body); font-size: 25px; line-height: 1.4; color: var(--muted); }
.risk-mit { font-family: var(--body); font-size: 25px; line-height: 1.4; color: var(--text); }
.risk-mit b { font-weight: 700; }

/* Decisions-needed list — numbered, owner + by-when chips */
.decisions { display: flex; flex-direction: column; gap: 22px; counter-reset: dec; }
.decision { counter-increment: dec; display: grid; grid-template-columns: 78px 1fr; gap: 30px; align-items: start; border-top: 1px solid var(--card-border); padding-top: 26px; }
.decision:first-child { border-top: 0; padding-top: 0; }
.decision::before { content: counter(dec, decimal-leading-zero); font-family: var(--display); font-weight: 800; font-size: 56px; line-height: 0.9; color: var(--accent); font-variant-numeric: tabular-nums; }
.dec-ask { font-family: var(--display); font-weight: 700; font-size: 36px; line-height: 1.12; color: var(--text); }
.dec-ask b { color: var(--red); }
.dec-meta { display: flex; gap: 14px; margin-top: 12px; flex-wrap: wrap; }
.dec-chip { font-family: var(--mono); font-size: 21px; color: var(--muted); background: #f3f4f6; border: 1px solid var(--card-border); border-radius: 8px; padding: 5px 14px; }
.dec-chip b { color: var(--text); font-weight: 600; }

/* Section divider — slate field, mono section number */
.divider { position: absolute; inset: 0; background: var(--text); padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider .divider-num { font-family: var(--mono); font-weight: 500; letter-spacing: 0.2em; font-size: 24px; color: #9aa3b2; }
.divider .divider-title { font-family: var(--display); font-weight: 800; font-size: 148px; line-height: 0.96; letter-spacing: -0.03em; color: #fff; }
.divider .divider-sub { font-family: var(--body); font-size: 34px; color: #c3c9d2; max-width: 30ch; margin-top: 6px; }
.divider .divider-dots { display: flex; gap: 14px; margin-top: 16px; }
.divider .ddot { width: 26px; height: 26px; border-radius: 50%; }
.divider .ddot.r { background: var(--red); } .divider .ddot.a { background: var(--amber); } .divider .ddot.g { background: var(--green); }

/* Schedule / budget helper bits */
.legend-rag { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 8px; }
.legend-rag .lr { display: inline-flex; align-items: center; gap: 11px; font-family: var(--body); font-size: 24px; color: var(--muted); }
.legend-rag .ld { width: 14px; height: 14px; border-radius: 50%; }
.legend-rag .ld.r { background: var(--red); } .legend-rag .ld.a { background: var(--amber); } .legend-rag .ld.g { background: var(--green); }
.milestone-flag { font-family: var(--mono); font-size: 21px; font-weight: 500; padding: 4px 12px; border-radius: 6px; }
.milestone-flag.done { color: var(--green); background: var(--green-bg); }
.milestone-flag.now { color: #b45309; background: var(--amber-bg); }
.milestone-flag.next { color: var(--muted); background: #f3f4f6; }`,
  notes:
    "A complete executive program-status report in the RAG idiom: Inter throughout (tight 800 display weight), IBM Plex Mono for eyebrows/codes/dates, neutral slate #1f2937 ink on white, and the three status colors — red #dc2626, amber #f59e0b, green #16a34a — as the deck's entire signal vocabulary. Open and close on the calm slate architectural full-bleed (assets/status-report-cover.jpg); break acts with the dark slate .divider (with RAG dots). Cornerstone pieces: the big .ragbanner (set .is-red/.is-amber/.is-green) for overall status, the .table of workstreams with .pill-rag status pills and .trend arrows, .risk red/amber callout cards for the risk register, the numbered .decisions list with owner/by-when .dec-chip metadata, and the shared .timeline for milestones (tag rows with .milestone-flag done/now/next). Use .stats for the executive summary, .bars for budget/scope, .flow for dependencies, .checks for next-period focus. Keep it honest and tabular — colors mean status, never decoration.",
  sampleSlides: [
    s({
      id: 'sr-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#c3c9d2">Program Status Report · Period 07 · FY26</div>
    <h1 class="display reveal" style="--display-size:128px;margin-top:10px">Atlas ERP<br/>Program.</h1>
    <p class="lead reveal" style="color:#dfe3e9">Steering Committee Review · Reporting period closing 12 Jun 2026</p>
  </div>
</div>`,
    }),
    s({
      id: 'sr-overall',
      name: 'Overall status',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Overall program status</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Where the program stands.</h2>
  <div class="ragbanner is-amber reveal">
    <div class="rag-orb">AMBER</div>
    <div>
      <div class="rag-eyebrow">Trending stable · last period AMBER</div>
      <div class="rag-label">At risk, recoverable</div>
      <p class="rag-line">Delivery is on scope and on budget, but a vendor integration slip puts the September go-live date under pressure. Two decisions today keep us on track.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Overall status</span></div>
</div>`,
    }),
    s({
      id: 'sr-summary',
      name: 'Executive summary',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Executive summary</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:34px">The period in four numbers.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">62%</div><div class="stat-label">Overall completion against the baseline plan</div></div>
    <div class="stat"><div class="stat-num" style="color:var(--amber)">−9d</div><div class="stat-label">Schedule variance on the critical path</div></div>
    <div class="stat"><div class="stat-num" style="color:var(--green)">+1.4%</div><div class="stat-label">Budget remaining versus forecast to date</div></div>
    <div class="stat"><div class="stat-num" style="color:var(--red)">2</div><div class="stat-label">Open red risks needing a steering decision</div></div>
  </div>
  <div class="legend-rag reveal" style="margin-top:40px">
    <span class="lr"><span class="ld g"></span>On track / Green</span>
    <span class="lr"><span class="ld a"></span>At risk / Amber</span>
    <span class="lr"><span class="ld r"></span>Off track / Red</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Executive summary</span></div>
</div>`,
    }),
    s({
      id: 'sr-div1',
      name: 'Section · By workstream',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Delivery</div>
  <div class="divider-title reveal">By workstream.</div>
  <div class="divider-sub reveal">Status, progress, and schedule across the six delivery tracks.</div>
  <div class="divider-dots reveal"><span class="ddot g"></span><span class="ddot a"></span><span class="ddot r"></span></div>
</div>`,
    }),
    s({
      id: 'sr-workstreams',
      name: 'Workstream status',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Workstream scorecard</div>
  <table class="table reveal" style="margin-top:12px;--table-size:28px">
    <thead><tr><th>Workstream</th><th>Owner</th><th class="num">% Complete</th><th>Trend</th><th style="text-align:right">Status</th></tr></thead>
    <tbody>
      <tr><td>Finance &amp; GL</td><td class="muted">R. Mehta</td><td class="num">78%</td><td><span class="trend flat">→ steady</span></td><td style="text-align:right"><span class="pill-rag green">On track</span></td></tr>
      <tr><td>Supply chain</td><td class="muted">L. Ortega</td><td class="num">71%</td><td><span class="trend up">▲ improving</span></td><td style="text-align:right"><span class="pill-rag green">On track</span></td></tr>
      <tr><td>Data migration</td><td class="muted">S. Park</td><td class="num">54%</td><td><span class="trend flat">→ steady</span></td><td style="text-align:right"><span class="pill-rag amber">At risk</span></td></tr>
      <tr><td>Vendor integration</td><td class="muted">J. Bauer</td><td class="num">41%</td><td><span class="trend down">▼ slipping</span></td><td style="text-align:right"><span class="pill-rag red">Off track</span></td></tr>
      <tr><td>Change &amp; training</td><td class="muted">A. Idris</td><td class="num">60%</td><td><span class="trend up">▲ improving</span></td><td style="text-align:right"><span class="pill-rag amber">At risk</span></td></tr>
      <tr><td>Cutover &amp; ops</td><td class="muted">D. Cole</td><td class="num">35%</td><td><span class="trend flat">→ steady</span></td><td style="text-align:right"><span class="pill-rag green">On track</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Workstreams</span></div>
</div>`,
    }),
    s({
      id: 'sr-milestones',
      name: 'Schedule & milestones',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Schedule &amp; milestones</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Critical path to go-live.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Mar '26</div><div class="tl-what"><b>Design freeze</b> — process designs signed off across all six workstreams. <span class="milestone-flag done">Complete</span></div></div>
    <div class="tl-row"><div class="tl-when">May '26</div><div class="tl-what"><b>Build &amp; unit test</b> — core configuration and 1,400 unit tests passed. <span class="milestone-flag done">Complete</span></div></div>
    <div class="tl-row"><div class="tl-when">Jul '26</div><div class="tl-what"><b>System integration test</b> — at risk; vendor connector slipping into the window. <span class="milestone-flag now">In progress</span></div></div>
    <div class="tl-row"><div class="tl-when">Aug '26</div><div class="tl-what"><b>User acceptance &amp; dress rehearsal</b> — cutover playbook validated. <span class="milestone-flag next">Upcoming</span></div></div>
    <div class="tl-row"><div class="tl-when">Sep '26</div><div class="tl-what"><b>Go-live</b> — phased cutover, finance first, then supply chain. <span class="milestone-flag next">Upcoming</span></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Schedule</span></div>
</div>`,
    }),
    s({
      id: 'sr-budget',
      name: 'Budget & scope',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Budget &amp; scope</div>
      <h2 class="headline" style="margin-top:6px">Spend tracks the plan.</h2>
      <p class="lead">Cumulative spend is 1.4% under the forecast-to-date curve. Contingency draw remains within the approved 8% envelope; no change requests pending this period.</p>
      <div class="legend-rag" style="margin-top:18px">
        <span class="lr"><span class="ld g"></span>Forecast</span>
        <span class="lr"><span class="ld a"></span>Actual</span>
      </div>
    </div>
    <div class="bars" style="--bars-height:360px;--bar-gap:26px">
      <div class="bar" style="--h:34%"><div class="bar-fill" data-val="$2.1M" style="background:var(--green)"></div><div class="bar-label">Q1</div></div>
      <div class="bar" style="--h:55%"><div class="bar-fill" data-val="$3.4M" style="background:var(--green)"></div><div class="bar-label">Q2</div></div>
      <div class="bar" style="--h:78%"><div class="bar-fill" data-val="$4.9M" style="background:var(--amber)"></div><div class="bar-label">Q3 fcst</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$6.1M" style="background:var(--track)"></div><div class="bar-label">Q4 plan</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Budget &amp; scope</span></div>
</div>`,
    }),
    s({
      id: 'sr-scope-table',
      name: 'Scope & quality',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Scope &amp; quality health</div>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>Dimension</th><th class="num">Baseline</th><th class="num">Current</th><th class="num">Variance</th><th style="text-align:right">Status</th></tr></thead>
    <tbody>
      <tr><td>In-scope requirements</td><td class="num">420</td><td class="num">420</td><td class="num">0</td><td style="text-align:right"><span class="pill-rag green">Held</span></td></tr>
      <tr><td>Open change requests</td><td class="num">—</td><td class="num">3</td><td class="num">+3</td><td style="text-align:right"><span class="pill-rag amber">Review</span></td></tr>
      <tr><td>Defects — high severity</td><td class="num">0</td><td class="num">5</td><td class="num neg">+5</td><td style="text-align:right"><span class="pill-rag red">Action</span></td></tr>
      <tr><td>Test pass rate</td><td class="num">95%</td><td class="num">91%</td><td class="num neg">−4 pts</td><td style="text-align:right"><span class="pill-rag amber">Watch</span></td></tr>
      <tr class="row-em"><td>Budget consumed</td><td class="num">$5.5M</td><td class="num">$5.4M</td><td class="num pos">−1.4%</td><td style="text-align:right"><span class="pill-rag green">On plan</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Scope &amp; quality</span></div>
</div>`,
    }),
    s({
      id: 'sr-div2',
      name: 'Section · Attention',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Attention</div>
  <div class="divider-title reveal">Risks, issues<br/>&amp; decisions.</div>
  <div class="divider-sub reveal">What is in the way, and what we need from the committee to clear it.</div>
  <div class="divider-dots reveal"><span class="ddot r"></span><span class="ddot a"></span></div>
</div>`,
    }),
    s({
      id: 'sr-risks',
      name: 'Top risks & issues',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Top risks &amp; issues</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:24px">The four worth your attention.</h2>
  <div class="cols-2 reveal" style="gap:28px">
    <div class="risk red">
      <div class="risk-top"><span class="risk-id">RISK-014</span><span class="risk-sev">Red · High</span></div>
      <div class="risk-title">Vendor connector behind schedule</div>
      <div class="risk-body">Payments integration is two sprints late; SIT entry is at risk.</div>
      <div class="risk-mit"><b>Mitigation:</b> escalate to vendor exec; stand up parallel build team this week.</div>
    </div>
    <div class="risk red">
      <div class="risk-top"><span class="risk-id">ISS-008</span><span class="risk-sev">Red · Open</span></div>
      <div class="risk-title">Five high-severity defects open</div>
      <div class="risk-body">GL posting and tax-engine defects block end-to-end finance testing.</div>
      <div class="risk-mit"><b>Mitigation:</b> daily triage; fix-forward target by 28 Jun, retest in next cycle.</div>
    </div>
    <div class="risk amber">
      <div class="risk-top"><span class="risk-id">RISK-021</span><span class="risk-sev">Amber · Med</span></div>
      <div class="risk-title">Data migration quality</div>
      <div class="risk-body">Legacy master-data gaps drive a 6% reconciliation exception rate.</div>
      <div class="risk-mit"><b>Mitigation:</b> data-cleansing sprint; business owners validating by workstream.</div>
    </div>
    <div class="risk amber">
      <div class="risk-top"><span class="risk-id">RISK-019</span><span class="risk-sev">Amber · Med</span></div>
      <div class="risk-title">User readiness for go-live</div>
      <div class="risk-body">Training completion sits at 60% against a 90% gate for cutover.</div>
      <div class="risk-mit"><b>Mitigation:</b> mandatory sessions added; super-user network expanded.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Risks &amp; issues</span></div>
</div>`,
    }),
    s({
      id: 'sr-decisions',
      name: 'Decisions needed',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Decisions needed today</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Three asks of the committee.</h2>
  <div class="decisions reveal">
    <div class="decision">
      <div>
        <div class="dec-ask">Approve a <b>two-week SIT extension</b> to absorb the vendor connector slip without compressing UAT.</div>
        <div class="dec-meta"><span class="dec-chip">Owner · <b>J. Bauer</b></span><span class="dec-chip">By · <b>19 Jun</b></span><span class="dec-chip">Impact · <b>Schedule</b></span></div>
      </div>
    </div>
    <div class="decision">
      <div>
        <div class="dec-ask">Authorize a <b>$180K contingency draw</b> to fund the parallel integration build team.</div>
        <div class="dec-meta"><span class="dec-chip">Owner · <b>PMO</b></span><span class="dec-chip">By · <b>19 Jun</b></span><span class="dec-chip">Impact · <b>Budget</b></span></div>
      </div>
    </div>
    <div class="decision">
      <div>
        <div class="dec-ask">Confirm the <b>phased go-live</b> sequence (finance first) over a single big-bang cutover.</div>
        <div class="dec-meta"><span class="dec-chip">Owner · <b>D. Cole</b></span><span class="dec-chip">By · <b>26 Jun</b></span><span class="dec-chip">Impact · <b>Scope</b></span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Decisions</span></div>
</div>`,
    }),
    s({
      id: 'sr-dependencies',
      name: 'Dependencies',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Critical dependencies</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">What has to happen, in order.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="risk green" style="border-left-color:var(--green)"><div class="risk-top"><span class="pill-rag green">Done</span></div><div class="risk-title" style="font-size:30px">Connector spec signed</div><div class="risk-body">Vendor &amp; security approved the API contract.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="risk amber"><div class="risk-top"><span class="pill-rag amber">Now</span></div><div class="risk-title" style="font-size:30px">Connector build &amp; SIT</div><div class="risk-body">Parallel team in flight; gates the test window.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="risk" style="border-left-color:var(--card-border)"><div class="risk-top"><span class="pill-rag" style="color:var(--muted);background:#f3f4f6">Next</span></div><div class="risk-title" style="font-size:30px">UAT &amp; dress rehearsal</div><div class="risk-body">Cannot start until SIT exit is clean.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="risk" style="border-left-color:var(--card-border)"><div class="risk-top"><span class="pill-rag" style="color:var(--muted);background:#f3f4f6">Next</span></div><div class="risk-title" style="font-size:30px">Go-live cutover</div><div class="risk-body">Phased; finance leads, then supply chain.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Dependencies</span></div>
</div>`,
    }),
    s({
      id: 'sr-div3',
      name: 'Section · Ahead',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Ahead</div>
  <div class="divider-title reveal">The road<br/>ahead.</div>
  <div class="divider-sub reveal">Focus for the next period and the commitment we are making.</div>
  <div class="divider-dots reveal"><span class="ddot g"></span><span class="ddot a"></span><span class="ddot g"></span></div>
</div>`,
    }),
    s({
      id: 'sr-next',
      name: 'Next period focus',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Next period · Period 08</div>
      <h2 class="headline" style="margin-top:6px">What we will land.</h2>
      <p class="lead">A tight set of commitments to move the program back to green by the next review.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span>Clear the <b>five high-severity defects</b> and restore the 95% test pass rate.</span></li>
      <li class="check"><span>Bring the <b>vendor connector</b> into SIT with the parallel build team.</span></li>
      <li class="check"><span>Lift <b>training completion</b> from 60% to the 90% go-live gate.</span></li>
      <li class="check"><span>Close the <b>data reconciliation</b> exceptions below the 1% threshold.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Next period</span></div>
</div>`,
    }),
    s({
      id: 'sr-quote',
      name: 'Sponsor note',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:70px;--quote-weight:600">"We are amber for a reason, not by surprise. The plan is sound, the team is on it, and the two decisions in front of you keep September intact."</blockquote>
  <div class="cite reveal"><span class="cite-dot" style="background:var(--amber)"></span><span class="cite-name">Priya Nadar</span><span class="cite-role">Executive Sponsor &amp; CFO</span></div>
  <div class="runner reveal"><span class="runner-brand">Atlas ERP</span><span class="runner-label">Sponsor note</span></div>
</div>`,
    }),
    s({
      id: 'sr-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#c3c9d2">Next review · Period 08 · 10 Jul 2026</div>
    <h2 class="display reveal" style="--display-size:116px">Decisions,<br/>then forward.</h2>
    <p class="lead reveal" style="color:#dfe3e9">Atlas ERP PMO · pmo@northwind.example · status board updated weekly</p>
  </div>
</div>`,
    }),
  ],
}
