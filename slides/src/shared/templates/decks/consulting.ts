import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide
const IMG = 'assets/sample.jpg'

const ENGAGE_IMG = 'assets/engage-cover.jpg'
const CONSULT_TEAM = 'assets/consult-team.jpg'
const CONSULT_SECTION = 'assets/consult-section.jpg'

export const consulting: Template = {
  id: 'consulting',
  categories: ['Consulting', 'Strategy'],
  name: 'Consulting',
  tagline: 'Warm, polished professional-services deck',
  audiences: ['consulting', 'agency', 'kickoff', 'proposal'],
  description:
    'A calm, premium cream deck with an editorial serif, forest-green and gold accents, phase flows, governance grids, and soft imagery. A complete client-kickoff narrative you tailor to the engagement.',
  fonts: {
    display: 'Newsreader',
    body: 'Satoshi',
    links: [
      'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap',
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f6f0',
    '--text': '#2a3325',
    '--muted': '#6f7563',
    '--accent': '#3d5a40',
    '--accent-2': '#9a7c3f',
    '--display': "'Newsreader', serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '500',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--card-bg': '#ffffff',
    '--card-border': '#e6e3d6',
    '--card-shadow': '0 14px 40px -22px rgba(60,70,45,0.18)',
    '--radius': '14px',
    '--th-border': '#2a3325',
    '--table-border': '#e6e3d6',
    '--track': '#e6e3d6',
    '--donut-hole': '#f7f6f0',
    '--media-shadow': '0 50px 100px -40px rgba(60,70,45,0.35)',
  },
  stageBg: '#efeee6',
  assets: ['engage-cover.jpg', 'consult-team.jpg', 'consult-section.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.donut { --accent: #3d5a40; }
.bar-fill { background: var(--accent); }
.lede { font-family: var(--display); font-weight: 500; font-size: 58px; line-height: 1.18; letter-spacing: -0.01em; color: var(--text); max-width: 22ch; }
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.2em; font-size: 24px; color: var(--accent-2); }
.divider-title { font-family: var(--display); font-weight: 500; font-size: 148px; line-height: 0.98; letter-spacing: -0.01em; color: var(--text); }
.divider-rule { width: 120px; height: 3px; background: var(--accent-2); margin-top: 12px; }
.ag { display: flex; gap: 24px; align-items: baseline; padding: 20px 0; border-top: 1px solid var(--card-border); }
.ag-n { font-family: var(--display); font-weight: 600; font-size: 36px; color: var(--accent); flex: 0 0 auto; }
.ag-t { font-family: var(--display); font-weight: 500; font-size: 40px; color: var(--text); }
.ag-d { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 3px; }
.flow-step .phase { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 32px 30px; box-shadow: var(--card-shadow); height: 100%; }
.phase-n { font-family: var(--body); font-weight: 700; color: var(--accent-2); letter-spacing: 0.1em; font-size: 20px; }
.phase-t { font-family: var(--display); font-weight: 500; font-size: 34px; color: var(--text); margin-top: 8px; }
.phase-d { font-family: var(--body); font-size: 23px; color: var(--muted); line-height: 1.35; margin-top: 10px; }
.flow-arrow::after { border-color: var(--accent-2); }
.note { border-left: 4px solid var(--accent-2); background: rgba(154,124,63,0.1); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 10px; }
.gov { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px 56px; }
.gov-item { display: flex; gap: 22px; align-items: flex-start; }
.gov-ic { flex: 0 0 auto; width: 58px; height: 58px; border-radius: 12px; background: rgba(61,90,64,0.1); display: grid; place-items: center; color: var(--accent); font-family: var(--display); font-weight: 600; font-size: 28px; }
.gov-t { font-family: var(--display); font-weight: 500; font-size: 34px; color: var(--text); }
.gov-d { font-family: var(--body); font-size: 24px; color: var(--muted); line-height: 1.35; margin-top: 4px; }`,
  notes:
    'A complete client-kickoff deck: editorial Newsreader serif on warm cream, forest-green primary with a gold (.accent-2) eyebrow. Clean cream section dividers (.divider/.divider-title/.divider-rule); soft imagery (engage-cover on the cover/hero, consult-section + consult-team for splits). Use the .flow arrow diagram with .phase cards for methodology, .timeline for the workplan, .gov grid for governance, .donut for effort mix, .table for risks, .stats for KPIs, .note for the key callout. Quietly confident — never loud.',
  sampleSlides: [
    s({
      id: 'cg-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="hero">
  <div class="hero-text">
    <div class="kicker reveal">Engagement Kickoff · Acme × Northwind</div>
    <h1 class="title reveal">Aligning for the work ahead.</h1>
    <p class="lead reveal">A shared plan for the next twelve weeks.</p>
  </div>
  <figure class="media reveal"><img src="${ENGAGE_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cg-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Today</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:8px">How we'll spend this hour.</h2>
  <div class="cols-2 reveal" style="gap:0 90px">
    <div class="ag"><div class="ag-n">01</div><div><div class="ag-t">Where you are</div><div class="ag-d">The situation and the why-now</div></div></div>
    <div class="ag"><div class="ag-n">04</div><div><div class="ag-t">How we'll measure</div><div class="ag-d">Success criteria &amp; governance</div></div></div>
    <div class="ag"><div class="ag-n">02</div><div><div class="ag-t">What we'll do</div><div class="ag-d">Objectives, scope, approach</div></div></div>
    <div class="ag"><div class="ag-n">05</div><div><div class="ag-t">What could go wrong</div><div class="ag-d">Risks and how we manage them</div></div></div>
    <div class="ag"><div class="ag-n">03</div><div><div class="ag-t">Who &amp; when</div><div class="ag-d">Team, roles, and the workplan</div></div></div>
    <div class="ag"><div class="ag-n">06</div><div><div class="ag-t">Next steps</div><div class="ag-d">What we each do this week</div></div></div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-context',
      name: 'Situation',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">The situation</div>
    <h2 class="headline reveal">Growth has outpaced the operating model.</h2>
    <p class="lead reveal">The team doubled in a year — but the processes that worked at 30 are now the bottleneck at 80.</p>
  </div>
  <figure class="media reveal"><img src="${CONSULT_SECTION}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cg-div1',
      name: 'Section · Engagement',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Engagement</div>
  <div class="divider-title reveal">What we'll do<br/>together.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cg-objectives',
      name: 'Objectives & scope',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Objectives &amp; scope</div>
  <h2 class="headline reveal" style="margin-top:6px">What success looks like.</h2>
  <ul class="bullets reveal" style="margin-top:8px">
    <li class="bullet"><span><b>Diagnose</b> the bottlenecks slowing time-to-value.</span></li>
    <li class="bullet"><span><b>Design</b> a streamlined operating model with your team.</span></li>
    <li class="bullet"><span><b>Pilot</b> it on one team, then <b>deliver</b> a 90-day rollout plan.</span></li>
  </ul>
  <div class="note reveal" style="margin-top:30px">
    <div class="note-k">In scope · out of scope</div>
    <p class="body" style="max-width:none">We focus on RevOps and delivery. Hiring strategy and tooling procurement are explicitly out of scope for this engagement.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cg-approach',
      name: 'Approach',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Approach &amp; methodology</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">Four phases, twelve weeks.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="phase"><div class="phase-n">WK 1–2</div><div class="phase-t">Discover</div><div class="phase-d">Interviews, data, and a baseline.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">WK 3–6</div><div class="phase-t">Design</div><div class="phase-d">Co-create the target model.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">WK 7–10</div><div class="phase-t">Pilot</div><div class="phase-d">Prove it on one team.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">WK 11–12</div><div class="phase-t">Embed</div><div class="phase-d">Train, document, hand over.</div></div></div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-workplan',
      name: 'Workplan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The workplan</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:8px">Milestones &amp; checkpoints.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Baseline readout</b> — the current state, quantified, with quick wins.</div></div>
    <div class="tl-row"><div class="tl-when">Week 6</div><div class="tl-what"><b>Target model sign-off</b> — agreed design and pilot scope.</div></div>
    <div class="tl-row"><div class="tl-when">Week 10</div><div class="tl-what"><b>Pilot results</b> — measured impact and go / no-go.</div></div>
    <div class="tl-row"><div class="tl-when">Week 12</div><div class="tl-what"><b>Rollout plan handover</b> — a 90-day plan your team owns.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-team',
      name: 'Team & roles',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Your team</div>
    <h2 class="headline reveal">Senior-led, lean by design.</h2>
    <div class="stats reveal" style="margin-top:8px">
      <div class="stat"><div class="subhead">Partner</div><p class="body">Owns outcomes and the steering relationship.</p></div>
      <div class="stat"><div class="subhead">Lead</div><p class="body">Runs the engagement day to day.</p></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${CONSULT_TEAM}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cg-div2',
      name: 'Section · Value',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Value</div>
  <div class="divider-title reveal">How we'll<br/>measure it.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cg-kpis',
      name: 'Success criteria',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Success criteria</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:26px">Three numbers we'll move.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">−30%</div><div class="stat-label">Time to value</div></div>
    <div class="stat"><div class="stat-num">+18</div><div class="stat-label">Team NPS points</div></div>
    <div class="stat"><div class="stat-num">90d</div><div class="stat-label">To self-sufficient</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-effort',
      name: 'Effort by phase',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:100px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--p:62;--donut-size:320px"><div class="donut-label">62%</div></div>
    </div>
    <div>
      <div class="kicker">Where the time goes</div>
      <h2 class="headline" style="margin-top:6px">Front-loaded discovery.</h2>
      <p class="lead">Most effort lands in design &amp; pilot — investing early in understanding makes the build faster and cleaner.</p>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-governance',
      name: 'Governance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Governance &amp; communication</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">How we stay aligned.</h2>
  <div class="gov reveal">
    <div class="gov-item"><div class="gov-ic">W</div><div><div class="gov-t">Weekly working session</div><div class="gov-d">90 minutes, hands-on, with the core team.</div></div></div>
    <div class="gov-item"><div class="gov-ic">B</div><div><div class="gov-t">Bi-weekly steering</div><div class="gov-d">30 minutes with sponsors — decisions only.</div></div></div>
    <div class="gov-item"><div class="gov-ic">D</div><div><div class="gov-t">Shared dashboard</div><div class="gov-d">Live status, risks, and decisions log.</div></div></div>
    <div class="gov-item"><div class="gov-ic">E</div><div><div class="gov-t">Async by default</div><div class="gov-d">Written updates so meetings are for thinking.</div></div></div>
  </div>
</div>`,
    }),
    s({
      id: 'cg-div3',
      name: 'Section · Getting started',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Getting started</div>
  <div class="divider-title reveal">Risks, then<br/>first steps.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cg-risks',
      name: 'Risks & mitigation',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; mitigation</div>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>Risk</th><th>Likelihood</th><th>Mitigation</th></tr></thead>
    <tbody>
      <tr><td>Stakeholder availability</td><td>Medium</td><td>Fixed weekly cadence, named owners</td></tr>
      <tr><td>Data access delays</td><td>Medium</td><td>Week-1 data request with fallbacks</td></tr>
      <tr><td>Change fatigue</td><td>Low</td><td>Pilot first, communicate early and often</td></tr>
      <tr><td>Scope creep</td><td>Medium</td><td>Written scope; changes via steering</td></tr>
    </tbody>
  </table>
</div>`,
    }),
    s({
      id: 'cg-next',
      name: 'Next steps',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">This week</div>
      <h2 class="headline" style="margin-top:6px">Three things to start.</h2>
    </div>
    <ul class="checks" style="--gap:26px">
      <li class="check"><span>Confirm the <b>steering group</b> and the weekly slot.</span></li>
      <li class="check"><span>Share <b>data access</b> and any prior assessments.</span></li>
      <li class="check"><span>Schedule the first <b>six discovery interviews</b>.</span></li>
    </ul>
  </div>
</div>`,
    }),
    s({
      id: 'cg-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Let's begin</div>
  <h2 class="display reveal" style="--display-size:120px">Excited to get to work.</h2>
  <p class="lead reveal">questions@northwind.co · northwind.co/acme</p>
</div>`,
    }),
  ],
}

// ── 11. Research (science / STEM report) ──────────────────────────────────
