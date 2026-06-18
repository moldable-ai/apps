import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/weekly-update-cover.jpg'

export const weeklyUpdate: Template = {
  id: 'weekly-update',
  categories: ['Company', 'Reporting'],
  name: 'Weekly Update',
  tagline: 'Ultra-minimal, information-dense team update',
  audiences: ['team', 'manager', 'standup', 'leadership'],
  description:
    'A near-white, restrained weekly team update in Inter with JetBrains Mono labels and ONE green accent. Status pills, a compact metric row, a shipped/in-flight/next board, inline spark bars, and clean tables carry a full week-in-review you tailor to your team.',
  fonts: {
    display: 'Inter',
    body: 'Inter',
    mono: 'JetBrains Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fafafa',
    '--text': '#334155',
    '--muted': '#94a3b8',
    '--accent': '#16a34a',
    '--accent-2': '#16a34a',
    '--display': "'Inter', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'JetBrains Mono', monospace",
    '--display-weight': '800',
    '--title-size': '120px',
    '--headline-size': '66px',
    '--subhead-size': '42px',
    '--lead-size': '34px',
    '--body-size': '30px',
    '--bullet-size': '32px',
    '--kicker-font': "'JetBrains Mono', monospace",
    '--kicker-tracking': '0.16em',
    '--kicker-size': '20px',
    '--card-bg': '#ffffff',
    '--card-border': '#e7e9ec',
    '--card-shadow': '0 12px 34px -26px rgba(15,23,42,0.18)',
    '--radius': '14px',
    '--stat-size': '88px',
    '--metric-size': '104px',
    '--th-border': '#334155',
    '--table-border': '#e7e9ec',
    '--table-size': '28px',
    '--rule-color': '#e7e9ec',
    '--track': '#eef0f2',
    '--donut-hole': '#fafafa',
    '--bar-gap': '26px',
    '--bar-fill': '#16a34a',
    '--media-radius': '14px',
    '--media-shadow': '0 40px 90px -45px rgba(15,23,42,0.35)',
    '--scrim':
      'linear-gradient(180deg, rgba(250,250,250,0) 0%, rgba(250,250,250,0.35) 50%, rgba(250,250,250,0.92) 100%)',
    '--bleed-text': '#334155',
    '--pos': '#16a34a',
    '--neg': '#b91c1c',
    '--pad-y': '96px',
    '--pad-x': '120px',
  },
  stageBg: '#f1f2f4',
  assets: ['weekly-update-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--text); }
.bar-fill { background: var(--accent); }

/* Mono section label — the quiet eyebrow that anchors the system */
.mlabel { font-family: var(--mono); font-weight: 600; font-size: 19px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); display: inline-flex; align-items: center; gap: 14px; }
.mlabel::before { content: ''; width: 9px; height: 9px; border-radius: 2px; background: var(--accent); }
.mlabel .idx { color: var(--accent); }

/* Status pills — on-track / at-risk / blocked */
.spill { display: inline-flex; align-items: center; gap: 10px; font-family: var(--mono); font-weight: 600; font-size: 20px; letter-spacing: 0.02em; padding: 8px 18px; border-radius: 999px; border: 1px solid var(--card-border); background: #fff; color: var(--text); white-space: nowrap; }
.spill::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); flex: 0 0 auto; }
.spill.on { color: #15803d; border-color: rgba(22,163,74,0.32); background: rgba(22,163,74,0.07); }
.spill.on::before { background: #16a34a; }
.spill.risk { color: #a16207; border-color: rgba(202,138,4,0.34); background: rgba(202,138,4,0.08); }
.spill.risk::before { background: #ca8a04; }
.spill.blocked { color: #b91c1c; border-color: rgba(185,28,28,0.32); background: rgba(185,28,28,0.07); }
.spill.blocked::before { background: #b91c1c; }

/* Compact metric row — tight hairline-divided KPI strip with mono deltas */
.mrow { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); border: 1px solid var(--card-border); border-radius: 16px; background: #fff; overflow: hidden; }
.mcell { padding: 38px 40px; display: flex; flex-direction: column; gap: 10px; }
.mcell + .mcell { border-left: 1px solid var(--card-border); }
.mcell-k { font-family: var(--mono); font-size: 18px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.mcell-v { font-family: var(--display); font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
.mdelta { font-family: var(--mono); font-weight: 600; font-size: 21px; display: inline-flex; align-items: center; gap: 7px; }
.mdelta.up { color: var(--pos); } .mdelta.up::before { content: '\\2191'; }
.mdelta.down { color: var(--neg); } .mdelta.down::before { content: '\\2193'; }
.mdelta.flat { color: var(--muted); } .mdelta.flat::before { content: '\\2192'; }

/* Three-column board — shipped / in-flight / next */
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 26px; }
.bcol { background: #fff; border: 1px solid var(--card-border); border-radius: 16px; padding: 30px 30px 34px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 16px; }
.bcol-h { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--card-border); }
.bcol-t { font-family: var(--mono); font-weight: 700; font-size: 21px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); }
.bcol-c { font-family: var(--mono); font-weight: 600; font-size: 19px; color: var(--muted); }
.btask { display: flex; gap: 14px; align-items: flex-start; font-family: var(--body); font-size: 25px; line-height: 1.34; color: var(--text); }
.btask::before { content: ''; flex: 0 0 auto; width: 9px; height: 9px; margin-top: 0.55em; border-radius: 50%; background: var(--accent); }
.bcol.shipped .btask::before { background: #16a34a; }
.bcol.flight .btask::before { background: #ca8a04; }
.bcol.next .btask::before { background: var(--muted); }
.btask .who { font-family: var(--mono); font-size: 19px; color: var(--muted); margin-left: 4px; }

/* Tiny inline spark bars — micro-trend beside a label */
.spark { display: inline-flex; align-items: flex-end; gap: 4px; height: 34px; vertical-align: bottom; }
.spark > i { width: 8px; background: var(--track); border-radius: 2px; display: block; }
.spark > i.a { background: var(--accent); }

/* Blocker / ask callout cards */
.bnote { background: #fff; border: 1px solid var(--card-border); border-left: 5px solid var(--muted); border-radius: 0 14px 14px 0; padding: 30px 36px; display: flex; flex-direction: column; gap: 10px; }
.bnote.block { border-left-color: var(--neg); }
.bnote.ask { border-left-color: var(--accent); }
.bnote-k { font-family: var(--mono); font-weight: 600; font-size: 18px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.bnote.block .bnote-k { color: var(--neg); }
.bnote.ask .bnote-k { color: var(--accent); }
.bnote-t { font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.1; color: var(--text); }
.bnote-d { font-family: var(--body); font-size: 25px; line-height: 1.38; color: var(--muted); max-width: none; }
.bnote-d b { color: var(--text); font-weight: 600; }

/* Quiet section divider on near-white */
.wdiv { position: absolute; inset: 0; padding: var(--pad-y) var(--pad-x); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.wdiv-num { font-family: var(--mono); font-weight: 600; font-size: 22px; letter-spacing: 0.16em; color: var(--accent); }
.wdiv-title { font-family: var(--display); font-weight: 800; font-size: 118px; line-height: 0.98; letter-spacing: -0.03em; color: var(--text); }
.wdiv-rule { width: 104px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 12px; }

/* TL;DR oversized number list */
.tldr { display: flex; flex-direction: column; gap: 30px; }
.tldr-row { display: flex; gap: 30px; align-items: baseline; padding-bottom: 30px; border-bottom: 1px solid var(--card-border); }
.tldr-row:last-child { border-bottom: 0; }
.tldr-n { font-family: var(--mono); font-weight: 700; font-size: 28px; color: var(--accent); flex: 0 0 auto; padding-top: 6px; }
.tldr-t { font-family: var(--display); font-weight: 600; font-size: 44px; line-height: 1.16; letter-spacing: -0.01em; color: var(--text); }`,
  notes:
    'A complete weekly team update: Inter throughout with JetBrains Mono for labels, deltas, and metrics; near-white #fafafa, slate #334155 text, ONE green #16a34a accent (muted red #b91c1c for blockers only). Open on the calm minimal full-bleed cover (assets/weekly-update-cover.jpg). Anchor content slides with the mono .mlabel eyebrow + a .runner footer. Signature pieces: status pills (.spill on/risk/blocked), the compact .mrow metric strip with .mdelta arrows, the shipped/in-flight/next .board (.bcol shipped/flight/next), tiny .spark inline bars, and .bnote block/ask callouts. Use .checks for what shipped, a .table with .spill pills for in-flight, .bars for the small trend, .steps for next week, .quote for the notable mention. Keep it dense, scannable, and quiet — restraint over decoration, numbers tabular.',
  sampleSlides: [
    s({
      id: 'wu-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="mlabel reveal" style="font-size:22px">Platform Team · Weekly Update</div>
    <h1 class="display reveal" style="--display-size:128px;margin-top:14px">Week of<br/>June 9.</h1>
    <p class="lead reveal" style="color:var(--text);opacity:0.78;max-width:30ch">A steady week — shipped the migration, one blocker cleared, retention ticking up.</p>
  </div>
</div>`,
    }),
    s({
      id: 'wu-tldr',
      name: 'TL;DR',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">00</span> &nbsp;TL;DR</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:34px">Three things, if you read nothing else.</h2>
  <div class="tldr reveal">
    <div class="tldr-row"><div class="tldr-n">01</div><div class="tldr-t">Billing migration <span class="accent-text">shipped to 100%</span> — zero rollbacks, error rate flat.</div></div>
    <div class="tldr-row"><div class="tldr-n">02</div><div class="tldr-t">Activation up <span class="accent-text">to 41%</span> after the onboarding rework landed Tuesday.</div></div>
    <div class="tldr-row"><div class="tldr-n">03</div><div class="tldr-t">Search relevance is <span style="color:var(--neg)">blocked</span> on the data export — we need eng-platform by Thursday.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Week of Jun 9</span></div>
</div>`,
    }),
    s({
      id: 'wu-metrics',
      name: 'Metrics this week',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">01</span> &nbsp;Metrics this week</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:30px">The numbers that moved.</h2>
  <div class="mrow reveal" style="--cols:4">
    <div class="mcell"><div class="mcell-k">Weekly active</div><div class="mcell-v">38.4k</div><div class="mdelta up">+6.2% WoW</div></div>
    <div class="mcell"><div class="mcell-k">Activation</div><div class="mcell-v">41%</div><div class="mdelta up">+5 pts</div></div>
    <div class="mcell"><div class="mcell-k">P95 latency</div><div class="mcell-v">214ms</div><div class="mdelta down">+18ms</div></div>
    <div class="mcell"><div class="mcell-k">Error rate</div><div class="mcell-v">0.08%</div><div class="mdelta flat">flat</div></div>
  </div>
  <p class="fine reveal" style="margin-top:26px;font-family:var(--mono);letter-spacing:0.04em">Deltas vs. week of Jun 2 · green = improving, red = needs attention</p>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Metrics</span></div>
</div>`,
    }),
    s({
      id: 'wu-div1',
      name: 'Section · Progress',
      transition: 'fade',
      bodyHtml: `<div class="wdiv">
  <div class="wdiv-num reveal">02 — Progress</div>
  <div class="wdiv-title reveal">What we<br/>got done.</div>
  <div class="wdiv-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'wu-shipped',
      name: 'What shipped',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">02</span> &nbsp;Shipped</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:28px">Live this week.</h2>
  <div class="cols-2 reveal" style="gap:18px 80px">
    <ul class="checks" style="--gap:22px">
      <li class="check"><span><b>Billing migration</b> rolled to 100% of accounts. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">PLAT-441</span></span></li>
      <li class="check"><span><b>Onboarding rework</b> shipped — new three-step flow. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">GRW-118</span></span></li>
      <li class="check"><span><b>SSO for Enterprise</b> in GA, two customers live. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">SEC-92</span></span></li>
    </ul>
    <ul class="checks" style="--gap:22px">
      <li class="check"><span><b>Audit-log export</b> behind a flag for design partners. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">SEC-97</span></span></li>
      <li class="check"><span><b>Dashboard load</b> cut 40% via query caching. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">PLAT-460</span></span></li>
      <li class="check"><span><b>14 bugs</b> closed, including two P1s from last week. <span style="font-family:var(--mono);color:var(--muted);font-size:0.7em">BUG</span></span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Shipped</span></div>
</div>`,
    }),
    s({
      id: 'wu-board',
      name: 'Shipped / In flight / Next',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">03</span> &nbsp;The board</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:26px">Where everything stands.</h2>
  <div class="board reveal">
    <div class="bcol shipped">
      <div class="bcol-h"><span class="bcol-t">Shipped</span><span class="bcol-c">6</span></div>
      <div class="btask"><span>Billing migration <span class="who">@maya</span></span></div>
      <div class="btask"><span>Onboarding rework <span class="who">@dev</span></span></div>
      <div class="btask"><span>Enterprise SSO <span class="who">@priya</span></span></div>
    </div>
    <div class="bcol flight">
      <div class="bcol-h"><span class="bcol-t">In flight</span><span class="bcol-c">4</span></div>
      <div class="btask"><span>Search relevance v2 <span class="who">@leo</span></span></div>
      <div class="btask"><span>Usage-based billing <span class="who">@maya</span></span></div>
      <div class="btask"><span>Mobile push <span class="who">@sam</span></span></div>
    </div>
    <div class="bcol next">
      <div class="bcol-h"><span class="bcol-t">Up next</span><span class="bcol-c">5</span></div>
      <div class="btask"><span>Audit-log GA <span class="who">@priya</span></span></div>
      <div class="btask"><span>Onboarding A/B test <span class="who">@dev</span></span></div>
      <div class="btask"><span>Latency budget review <span class="who">@leo</span></span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">The board</span></div>
</div>`,
    }),
    s({
      id: 'wu-inflight',
      name: 'In flight',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">04</span> &nbsp;In flight</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:18px">Open work and where it's at.</h2>
  <table class="table reveal">
    <thead><tr><th>Initiative</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Search relevance v2</td><td>@leo</td><td>Jun 20</td><td><span class="spill blocked">Blocked</span></td></tr>
      <tr><td>Usage-based billing</td><td>@maya</td><td>Jun 27</td><td><span class="spill on">On track</span></td></tr>
      <tr><td>Mobile push notifications</td><td>@sam</td><td>Jun 23</td><td><span class="spill risk">At risk</span></td></tr>
      <tr><td>Audit-log GA</td><td>@priya</td><td>Jun 18</td><td><span class="spill on">On track</span></td></tr>
      <tr><td>Onboarding A/B test</td><td>@dev</td><td>Jun 25</td><td><span class="spill on">On track</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">In flight</span></div>
</div>`,
    }),
    s({
      id: 'wu-div2',
      name: 'Section · Risks',
      transition: 'fade',
      bodyHtml: `<div class="wdiv">
  <div class="wdiv-num reveal">05 — Risks</div>
  <div class="wdiv-title reveal">Blockers<br/>&amp; asks.</div>
  <div class="wdiv-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'wu-blockers',
      name: 'Blockers & asks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">05</span> &nbsp;Blockers &amp; asks</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:26px">Where we need help.</h2>
  <div class="cols-2 reveal" style="gap:26px">
    <div class="bnote block">
      <div class="bnote-k">Blocked · Search v2</div>
      <div class="bnote-t">Waiting on the data export.</div>
      <div class="bnote-d">Relevance retraining can't start until eng-platform ships the <b>warehouse export</b>. Slipping into next week unless unblocked by <b>Thursday</b>.</div>
    </div>
    <div class="bnote ask">
      <div class="bnote-k">Ask · Eng-platform</div>
      <div class="bnote-t">Two days of @nadia's time.</div>
      <div class="bnote-d">A short pairing window to finish the export pipeline. <b>@raj</b> to confirm priority at Monday's sync.</div>
    </div>
    <div class="bnote risk" style="border-left-color:#ca8a04">
      <div class="bnote-k" style="color:#a16207">At risk · Mobile push</div>
      <div class="bnote-t">APNs review pending.</div>
      <div class="bnote-d">Apple review may push GA past Jun 23. Mitigation: <b>soft-launch to internal builds</b> first.</div>
    </div>
    <div class="bnote ask">
      <div class="bnote-k">Ask · Design</div>
      <div class="bnote-t">Final onboarding copy.</div>
      <div class="bnote-d">Need the three confirmation strings by <b>Wed</b> to lock the A/B variant. Owner: <b>@dev</b>.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Blockers &amp; asks</span></div>
</div>`,
    }),
    s({
      id: 'wu-trend',
      name: 'Trend',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="mlabel"><span class="idx">06</span> &nbsp;Trend</div>
      <h2 class="headline" style="margin-top:14px">Activation, six weeks.</h2>
      <p class="lead" style="margin-top:14px">The onboarding rework is the clear inflection — five points in a single week, the biggest jump this quarter.</p>
      <div class="row" style="margin-top:24px;gap:14px"><span class="mlabel" style="color:var(--text)">Weekly signups converting</span> <span class="spark"><i style="height:40%"></i><i style="height:44%"></i><i style="height:52%"></i><i style="height:58%"></i><i style="height:64%"></i><i class="a" style="height:88%"></i></span></div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="28%"></div><div class="bar-label">May 5</div></div>
      <div class="bar" style="--h:54%"><div class="bar-fill" data-val="31%"></div><div class="bar-label">May 12</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" data-val="34%"></div><div class="bar-label">May 19</div></div>
      <div class="bar" style="--h:64%"><div class="bar-fill" data-val="35%"></div><div class="bar-label">May 26</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="36%"></div><div class="bar-label">Jun 2</div></div>
      <div class="bar" style="--h:92%"><div class="bar-fill" data-val="41%"></div><div class="bar-label">Jun 9</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Trend</span></div>
</div>`,
    }),
    s({
      id: 'wu-split',
      name: 'Focus shipped',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="mlabel reveal"><span class="idx">07</span> &nbsp;Highlight</div>
    <h2 class="headline reveal">The migration, done quietly.</h2>
    <p class="lead reveal">Two months of dual-writing, then a clean cutover. No rollbacks, no customer-facing incidents, and a third of the legacy code gone with it.</p>
    <div class="stats reveal" style="margin-top:10px">
      <div class="stat"><div class="stat-num">100%</div><div class="stat-label">Accounts migrated</div></div>
      <div class="stat"><div class="stat-num">0</div><div class="stat-label">Rollbacks</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${COVER_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'wu-div3',
      name: 'Section · Ahead',
      transition: 'fade',
      bodyHtml: `<div class="wdiv">
  <div class="wdiv-num reveal">08 — Ahead</div>
  <div class="wdiv-title reveal">Next<br/>week.</div>
  <div class="wdiv-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'wu-plan',
      name: "Next week's plan",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">08</span> &nbsp;The plan</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:26px">What we're committing to.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span><b>Unblock search v2</b> — get the export landed and kick off retraining.</span></li>
    <li class="step"><span><b>Ship audit-log GA</b> Wednesday after the security sign-off.</span></li>
    <li class="step"><span><b>Launch the onboarding A/B test</b> to 50% of new signups.</span></li>
    <li class="step"><span><b>Resolve the latency regression</b> — own the +18ms before it compounds.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">The plan</span></div>
</div>`,
    }),
    s({
      id: 'wu-focus',
      name: 'One focus',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">09</span> &nbsp;One focus</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:30px">If we do one thing well.</h2>
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="metric" style="--metric-size:128px;color:var(--accent)">v2</div>
      <p class="subhead" style="margin-top:8px">Get search relevance unblocked and into testing.</p>
    </div>
    <ul class="bullets" style="--gap:24px">
      <li class="bullet"><span>It's the <b>only blocked</b> item — and the one most users feel.</span></li>
      <li class="bullet"><span>Everything else is on track; this is where the leverage is.</span></li>
      <li class="bullet"><span>Clearing it this week keeps the quarter goal in reach.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">One focus</span></div>
</div>`,
    }),
    s({
      id: 'wu-quote',
      name: 'Notable mention',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="mlabel reveal" style="margin-bottom:8px"><span class="idx">10</span> &nbsp;Notable mention</div>
  <blockquote class="quote reveal" style="--quote-size:66px;font-weight:600">"Maya caught the dual-write edge case in review that would've corrupted balances at cutover. The clean migration is hers."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Raj Mehta</span><span class="cite-role">Eng Lead, Platform</span></div>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Kudos</span></div>
</div>`,
    }),
    s({
      id: 'wu-close',
      name: 'Links & close',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="mlabel reveal"><span class="idx">11</span> &nbsp;Links &amp; close</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:30px">Dig in or ping us.</h2>
  <div class="cols-2 reveal" style="gap:18px 80px">
    <ul class="bullets" style="--gap:22px">
      <li class="bullet"><span><b>Board</b> — <span style="font-family:var(--mono);color:var(--muted)">go/platform-week</span></span></li>
      <li class="bullet"><span><b>Metrics dashboard</b> — <span style="font-family:var(--mono);color:var(--muted)">go/platform-kpis</span></span></li>
    </ul>
    <ul class="bullets" style="--gap:22px">
      <li class="bullet"><span><b>Migration writeup</b> — <span style="font-family:var(--mono);color:var(--muted)">go/billing-postmortem</span></span></li>
      <li class="bullet"><span><b>Questions</b> — <span style="font-family:var(--mono);color:var(--muted)">#platform-team</span></span></li>
    </ul>
  </div>
  <div class="rule reveal" style="margin:42px 0 30px"></div>
  <p class="subhead reveal">Next update: <span class="accent-text">Friday, June 20.</span></p>
  <div class="runner reveal"><span class="runner-brand">Platform Team</span><span class="runner-label">Week of Jun 9</span></div>
</div>`,
    }),
  ],
}
