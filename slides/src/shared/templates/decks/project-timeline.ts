import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/project-timeline-cover.jpg'

export const projectTimeline: Template = {
  id: 'project-timeline',
  categories: ['Project Management'],
  name: 'Project Timeline',
  tagline: 'Blueprint roadmap for shipping a product',
  audiences: ['product', 'program', 'engineering', 'leadership'],
  description:
    'A blueprint-blue product roadmap deck: a horizontal phase timeline, gantt-style bars, swimlanes, milestone markers, and dependency flows. Sora display on Inter body with IBM Plex Mono labels. A complete plan-to-execution narrative you re-time with your own phases and dates.',
  fonts: {
    display: 'Sora',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0f1c3f',
    '--muted': '#5b6b8c',
    '--accent': '#1e3a8a',
    '--accent-2': '#0ea5e9',
    '--display': "'Sora', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '700',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#dbe3f2',
    '--card-shadow': '0 18px 44px -30px rgba(15,28,63,0.28)',
    '--radius': '14px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--th-border': '#1e3a8a',
    '--table-border': '#dbe3f2',
    '--track': '#e2e9f6',
    '--donut-hole': '#ffffff',
    '--bar-gap': '30px',
    '--bar-fill': '#1e3a8a',
    '--media-shadow': '0 50px 110px -45px rgba(15,28,63,0.45)',
    '--media-radius': '16px',
    '--scrim':
      'linear-gradient(180deg, rgba(10,21,55,0.18) 0%, rgba(10,21,55,0.50) 52%, rgba(10,21,55,0.90) 100%)',
    '--pos': '#0e9f6e',
    '--neg': '#dc2626',
    '--bullet-color': '#0ea5e9',
  },
  stageBg: '#eaf0fb',
  assets: ['project-timeline-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent-2); }
.tl-when { color: var(--accent); font-family: var(--mono); font-size: 30px; font-weight: 600; }

/* Blueprint grid wash — faint cyan drafting grid on every content slide */
.grid-slide { position: relative; }
.grid-slide::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px);
  background-size: 64px 64px;
}
.grid-slide > * { position: relative; z-index: 1; }

/* Section divider — blueprint navy field with cyan ticks */
.bp-divider { position: absolute; inset: 0; background: var(--accent); color: #fff; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; overflow: hidden; }
.bp-divider::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 72px 72px; }
.bp-num { position: relative; font-family: var(--mono); font-weight: 500; letter-spacing: 0.22em; font-size: 22px; color: var(--accent-2); }
.bp-title { position: relative; font-family: var(--display); font-weight: 700; font-size: 150px; line-height: 0.95; letter-spacing: -0.025em; color: #fff; text-wrap: balance; }
.bp-rule { position: relative; width: 128px; height: 5px; border-radius: 3px; background: var(--accent-2); margin-top: 10px; }
.bp-lead { position: relative; font-family: var(--body); font-size: 34px; line-height: 1.32; color: rgba(255,255,255,0.78); max-width: 30ch; margin-top: 6px; }

/* Horizontal phase timeline with milestone markers */
.roadmap { position: relative; padding: 60px 0 24px; }
.roadmap-track { position: absolute; left: 0; right: 0; top: 60px; height: 4px; background: var(--track); border-radius: 2px; }
.roadmap-phases { display: grid; grid-template-columns: repeat(var(--phases, 3), 1fr); gap: 26px; position: relative; }
.rm-phase { position: relative; padding-top: 64px; }
.rm-dot { position: absolute; top: 50px; left: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--accent); border: 4px solid #fff; box-shadow: 0 0 0 3px var(--accent); }
.rm-phase.cyan .rm-dot { background: var(--accent-2); box-shadow: 0 0 0 3px var(--accent-2); }
.rm-band { border-radius: 14px; background: rgba(30,58,138,0.05); border: 1px solid var(--card-border); border-left: 5px solid var(--accent); padding: 26px 28px 28px; }
.rm-phase.cyan .rm-band { border-left-color: var(--accent-2); background: rgba(14,165,233,0.06); }
.rm-when { font-family: var(--mono); font-weight: 500; font-size: 22px; letter-spacing: 0.04em; color: var(--accent); }
.rm-phase.cyan .rm-when { color: var(--accent-2); }
.rm-name { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.04; color: var(--text); margin-top: 10px; }
.rm-desc { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 12px; }

/* Gantt-style bars — labelled rows with positioned fill */
.gantt { display: flex; flex-direction: column; gap: 22px; }
.gantt-head { display: grid; grid-template-columns: 320px 1fr; gap: 36px; font-family: var(--mono); font-size: 20px; letter-spacing: 0.06em; color: var(--muted); text-transform: uppercase; padding-bottom: 14px; border-bottom: 1px solid var(--card-border); }
.gantt-cols { display: grid; grid-template-columns: repeat(4, 1fr); }
.gantt-cols span { text-align: left; }
.gantt-row { display: grid; grid-template-columns: 320px 1fr; gap: 36px; align-items: center; }
.gantt-label { font-family: var(--body); font-weight: 600; font-size: 28px; color: var(--text); }
.gantt-label small { display: block; font-family: var(--mono); font-weight: 400; font-size: 19px; color: var(--muted); letter-spacing: 0.04em; margin-top: 4px; }
.gantt-lane { position: relative; height: 46px; background: var(--track); border-radius: 8px; }
.gantt-fill { position: absolute; top: 0; bottom: 0; left: var(--start, 0%); width: var(--len, 40%); background: var(--accent); border-radius: 8px; display: flex; align-items: center; padding: 0 18px; }
.gantt-fill.cyan { background: var(--accent-2); }
.gantt-fill span { font-family: var(--mono); font-weight: 500; font-size: 18px; color: #fff; white-space: nowrap; letter-spacing: 0.03em; }

/* Swimlanes — workstream rows with chips */
.lanes { display: flex; flex-direction: column; gap: 18px; }
.lane { display: grid; grid-template-columns: 280px 1fr; gap: 30px; align-items: center; padding: 22px 0; border-top: 1px solid var(--card-border); }
.lane:last-child { border-bottom: 1px solid var(--card-border); }
.lane-name { display: flex; align-items: center; gap: 16px; font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); }
.lane-name::before { content: ''; width: 14px; height: 14px; border-radius: 4px; background: var(--accent); flex: 0 0 auto; }
.lane.cyan .lane-name::before { background: var(--accent-2); }
.lane-chips { display: flex; gap: 14px; flex-wrap: wrap; }
.chip { font-family: var(--body); font-weight: 600; font-size: 23px; color: var(--accent); background: rgba(30,58,138,0.07); border: 1px solid rgba(30,58,138,0.18); border-radius: 999px; padding: 9px 22px; }
.lane.cyan .chip { color: var(--accent-2); background: rgba(14,165,233,0.08); border-color: rgba(14,165,233,0.25); }

/* Milestone diamond markers (used inline) */
.diamond { display: inline-block; width: 16px; height: 16px; background: var(--accent-2); transform: rotate(45deg); margin-right: 4px; vertical-align: middle; }

/* Flow phase cards inside the shared .flow arrow diagram */
.fnode { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; box-shadow: var(--card-shadow); padding: 30px 28px; height: 100%; }
.fnode-k { font-family: var(--mono); font-size: 19px; letter-spacing: 0.08em; color: var(--accent-2); text-transform: uppercase; }
.fnode-t { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); margin-top: 12px; line-height: 1.06; }
.fnode-d { font-family: var(--body); font-size: 22px; line-height: 1.4; color: var(--muted); margin-top: 8px; }

/* Risk / buffer callouts */
.note { border-left: 5px solid var(--accent-2); background: rgba(14,165,233,0.06); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.note.risk { border-left-color: #e0a23c; background: rgba(224,162,60,0.08); }
.note-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 19px; color: var(--accent-2); margin-bottom: 10px; }
.note.risk .note-k { color: #c4862a; }

/* Status pills for the milestone table */
.status { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 600; font-size: 25px; }
.status::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.status.done::before { background: var(--pos); } .status.now::before { background: var(--accent-2); } .status.next::before { background: var(--muted); }`,
  notes:
    'A complete product-roadmap deck: Sora display + Inter body, IBM Plex Mono for dates/labels, ink navy #0f1c3f on white, ONE blueprint-blue accent (#1e3a8a) with a cyan secondary (#0ea5e9) for grid lines and milestones. Open and close on the blueprint-grid full-bleed (assets/project-timeline-cover.jpg); break acts with the navy .bp-divider. Signature pieces: the horizontal .roadmap phase timeline (dots + bands, add .cyan to alternate), .gantt rows for phase-level scheduling (--start/--len position the fill), .lanes swimlanes for workstreams, .flow + .fnode cards for dependencies, .note callouts for risks/buffers (add .risk), and .status pills (done/now/next) in the milestone .table. Add class="grid-slide" to content .pad wrappers for the faint drafting grid. Keep dates in mono, the story phase-ordered, and the plan honest about buffers.',
  sampleSlides: [
    s({
      id: 'pt-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:var(--accent-2)">Product Roadmap · FY26 — H1</div>
    <h1 class="display reveal" style="--display-size:130px;margin-top:10px">From blueprint<br/>to launch.</h1>
    <p class="lead reveal">Atlas Platform · The plan to ship in three phases.</p>
  </div>
</div>`,
    }),
    s({
      id: 'pt-vision',
      name: 'The destination',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide center">
  <div class="kicker reveal">The destination</div>
  <h2 class="display reveal" style="--display-size:96px;max-width:20ch;margin-top:10px">A single workspace where every team plans, builds, and ships together.</h2>
  <p class="lead reveal" style="max-width:40ch;margin-top:8px">One year. Three phases. Everything below is in service of that one line.</p>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Vision</span></div>
</div>`,
    }),
    s({
      id: 'pt-principles',
      name: 'Guiding principles',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="kicker reveal">How we'll build it</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Five principles that shape the plan.</h2>
  <div class="two-col reveal" style="--col-gap:90px;align-items:start">
    <ul class="checks" style="--gap:24px">
      <li class="check"><span><b>Ship in thin slices</b> — every phase ends in something usable.</span></li>
      <li class="check"><span><b>Sequence by dependency</b>, not by team preference.</span></li>
      <li class="check"><span><b>Buffer the unknowns</b> — 20% slack baked into each phase.</span></li>
    </ul>
    <ul class="checks" style="--gap:24px">
      <li class="check"><span><b>One owner per workstream</b>, accountable end to end.</span></li>
      <li class="check"><span><b>Measure before we move</b> — gates between phases.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Principles</span></div>
</div>`,
    }),
    s({
      id: 'pt-sec1',
      name: 'Section · The plan',
      transition: 'fade',
      bodyHtml: `<div class="bp-divider">
  <div class="bp-num reveal">01 — The plan</div>
  <div class="bp-title reveal">The roadmap,<br/>phase by phase.</div>
  <div class="bp-rule reveal"></div>
  <p class="bp-lead reveal">Three phases over two quarters, each with a clear exit gate.</p>
</div>`,
    }),
    s({
      id: 'pt-roadmap',
      name: 'Roadmap at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide top" style="--pad-y:96px">
  <div class="kicker reveal">The roadmap at a glance</div>
  <h2 class="headline reveal" style="margin-top:8px">Three phases, one trajectory.</h2>
  <div class="roadmap reveal" style="--phases:3">
    <div class="roadmap-track"></div>
    <div class="roadmap-phases">
      <div class="rm-phase"><div class="rm-dot"></div><div class="rm-band"><div class="rm-when">Q1 · Weeks 1–8</div><div class="rm-name">Foundations</div><div class="rm-desc">Data model, auth, and the shared workspace shell.</div></div></div>
      <div class="rm-phase cyan"><div class="rm-dot"></div><div class="rm-band"><div class="rm-when">Q1–Q2 · Weeks 9–18</div><div class="rm-name">Core workflows</div><div class="rm-desc">Planning, build tracking, and real-time collaboration.</div></div></div>
      <div class="rm-phase"><div class="rm-dot"></div><div class="rm-band"><div class="rm-when">Q2 · Weeks 19–26</div><div class="rm-name">Launch &amp; scale</div><div class="rm-desc">Integrations, performance hardening, and GA rollout.</div></div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'pt-phase1',
      name: 'Phase 1 detail',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide top" style="--pad-y:92px">
  <div class="kicker reveal">Phase 01 · Foundations — Weeks 1–8</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Lay the rails everything rides on.</h2>
  <div class="two-col reveal" style="--col-gap:80px;align-items:center">
    <div class="cards" style="--cols:1;gap:20px">
      <div class="card"><div class="card-title" style="font-size:34px">Data model &amp; schema</div><div class="card-body">The single source of truth — entities, relationships, migrations.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">Identity &amp; access</div><div class="card-body">SSO, roles, and the permission model for every later feature.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">Workspace shell</div><div class="card-body">Navigation, layout system, and the design tokens we build on.</div></div>
    </div>
    <div class="gantt">
      <div class="gantt-row"><div class="gantt-label">Data model<small>Backend</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:0%;--len:42%"><span>Wk 1–3</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">Identity &amp; access<small>Platform</small></div><div class="gantt-lane"><div class="gantt-fill cyan" style="--start:28%;--len:44%"><span>Wk 3–6</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">Workspace shell<small>Frontend</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:55%;--len:45%"><span>Wk 5–8</span></div></div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Phase 01</span></div>
</div>`,
    }),
    s({
      id: 'pt-phase2',
      name: 'Phase 2 detail',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide top" style="--pad-y:92px">
  <div class="kicker reveal">Phase 02 · Core workflows — Weeks 9–18</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">The product people will use every day.</h2>
  <div class="two-col reveal" style="--col-gap:80px;align-items:center">
    <div class="cards" style="--cols:1;gap:20px">
      <div class="card"><div class="card-title" style="font-size:34px">Planning &amp; boards</div><div class="card-body">Roadmaps, backlogs, and the planning surface teams live in.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">Build tracking</div><div class="card-body">Linked work items, status, and progress rollups.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">Real-time collaboration</div><div class="card-body">Live presence, comments, and notifications across the workspace.</div></div>
    </div>
    <div class="gantt">
      <div class="gantt-row"><div class="gantt-label">Planning &amp; boards<small>Product</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:0%;--len:48%"><span>Wk 9–13</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">Build tracking<small>Backend</small></div><div class="gantt-lane"><div class="gantt-fill cyan" style="--start:32%;--len:46%"><span>Wk 12–16</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">Collaboration<small>Realtime</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:58%;--len:42%"><span>Wk 15–18</span></div></div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Phase 02</span></div>
</div>`,
    }),
    s({
      id: 'pt-phase3',
      name: 'Phase 3 detail',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide top" style="--pad-y:92px">
  <div class="kicker reveal">Phase 03 · Launch &amp; scale — Weeks 19–26</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Harden it, connect it, ship it.</h2>
  <div class="two-col reveal" style="--col-gap:80px;align-items:center">
    <div class="cards" style="--cols:1;gap:20px">
      <div class="card"><div class="card-title" style="font-size:34px">Integrations</div><div class="card-body">Source-control, chat, and calendar connectors out of the box.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">Performance &amp; scale</div><div class="card-body">Load testing, caching, and the path to 10k concurrent users.</div></div>
      <div class="card"><div class="card-title" style="font-size:34px">GA rollout</div><div class="card-body">Migration tooling, docs, and the staged general-availability launch.</div></div>
    </div>
    <div class="gantt">
      <div class="gantt-row"><div class="gantt-label">Integrations<small>Platform</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:0%;--len:46%"><span>Wk 19–22</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">Performance<small>Infra</small></div><div class="gantt-lane"><div class="gantt-fill cyan" style="--start:30%;--len:48%"><span>Wk 21–25</span></div></div></div>
      <div class="gantt-row"><div class="gantt-label">GA rollout<small>All teams</small></div><div class="gantt-lane"><div class="gantt-fill" style="--start:62%;--len:38%"><span>Wk 24–26</span></div></div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Phase 03</span></div>
</div>`,
    }),
    s({
      id: 'pt-deps',
      name: 'Dependencies',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="kicker reveal">Critical path</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">What has to land before what.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="fnode"><div class="fnode-k">Gate A</div><div class="fnode-t">Data model</div><div class="fnode-d">Schema locked before any feature builds on it.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="fnode"><div class="fnode-k">Gate B</div><div class="fnode-t">Auth &amp; shell</div><div class="fnode-d">Identity and navigation ready for workflows.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="fnode"><div class="fnode-k">Gate C</div><div class="fnode-t">Core workflows</div><div class="fnode-d">Planning and tracking stable before integrations.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="fnode"><div class="fnode-k">Gate D</div><div class="fnode-t">GA launch</div><div class="fnode-d">Performance bar met, migration tooling shipped.</div></div></div>
  </div>
  <div class="note reveal" style="margin-top:42px"><div class="note-k">Hard dependency</div><p class="body" style="max-width:none">The data model on the critical path — a one-week slip there pushes every downstream gate. It gets the most senior owner and the earliest start.</p></div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Dependencies</span></div>
</div>`,
    }),
    s({
      id: 'pt-milestones',
      name: 'Milestones & dates',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="kicker reveal">Milestones &amp; dates</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">The dates we're committing to.</h2>
  <table class="table reveal">
    <thead><tr><th>Milestone</th><th>Owner</th><th class="num">Target date</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Schema &amp; migrations frozen</td><td class="muted">Backend</td><td class="num">Feb 14</td><td><span class="status done">Done</span></td></tr>
      <tr><td>Auth &amp; workspace shell GA-ready</td><td class="muted">Platform</td><td class="num">Mar 7</td><td><span class="status done">Done</span></td></tr>
      <tr><td>Planning &amp; boards beta</td><td class="muted">Product</td><td class="num">Apr 18</td><td><span class="status now">In flight</span></td></tr>
      <tr><td>Real-time collaboration live</td><td class="muted">Realtime</td><td class="num">May 9</td><td><span class="status next">Next</span></td></tr>
      <tr class="row-em"><td>General availability</td><td class="muted">All teams</td><td class="num">Jun 27</td><td><span class="status next">Next</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Milestones</span></div>
</div>`,
    }),
    s({
      id: 'pt-sec2',
      name: 'Section · Execution',
      transition: 'fade',
      bodyHtml: `<div class="bp-divider">
  <div class="bp-num reveal">02 — Execution</div>
  <div class="bp-title reveal">Who builds it,<br/>and what could<br/>go wrong.</div>
  <div class="bp-rule reveal"></div>
  <p class="bp-lead reveal">Workstreams, resourcing, the risks we're watching, and how we'll know it worked.</p>
</div>`,
    }),
    s({
      id: 'pt-lanes',
      name: 'Workstreams',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide top" style="--pad-y:96px">
  <div class="kicker reveal">Workstreams</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Five swimlanes, one schedule.</h2>
  <div class="lanes reveal">
    <div class="lane"><div class="lane-name">Backend &amp; data</div><div class="lane-chips"><span class="chip">Schema</span><span class="chip">APIs</span><span class="chip">Migrations</span></div></div>
    <div class="lane cyan"><div class="lane-name">Platform</div><div class="lane-chips"><span class="chip">Auth</span><span class="chip">Permissions</span><span class="chip">Integrations</span></div></div>
    <div class="lane"><div class="lane-name">Frontend &amp; design</div><div class="lane-chips"><span class="chip">Shell</span><span class="chip">Boards</span><span class="chip">Collaboration UI</span></div></div>
    <div class="lane cyan"><div class="lane-name">Realtime &amp; infra</div><div class="lane-chips"><span class="chip">Presence</span><span class="chip">Scale</span><span class="chip">Performance</span></div></div>
    <div class="lane"><div class="lane-name">Go-to-market</div><div class="lane-chips"><span class="chip">Docs</span><span class="chip">Beta program</span><span class="chip">GA launch</span></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Workstreams</span></div>
</div>`,
    }),
    s({
      id: 'pt-resourcing',
      name: 'Resourcing',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="kicker reveal">Resourcing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The team behind the plan.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">24</div><div class="stat-label">People across five workstreams</div></div>
    <div class="stat"><div class="stat-num">62%</div><div class="stat-label">Allocated to engineering &amp; platform</div></div>
    <div class="stat"><div class="stat-num">26 wk</div><div class="stat-label">Plan length, end to end</div></div>
    <div class="stat"><div class="stat-num">20%</div><div class="stat-label">Buffer reserved in every phase</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Resourcing</span></div>
</div>`,
    }),
    s({
      id: 'pt-risks',
      name: 'Risks & buffers',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="kicker reveal">Risks &amp; buffers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">What we're watching — and our answer.</h2>
  <div class="cols-2 reveal" style="gap:30px">
    <div class="note risk"><div class="note-k">Risk · Schema churn</div><p class="body" style="max-width:none">Late data-model changes ripple downstream. <b>Buffer:</b> freeze the schema at Gate A, version every change after.</p></div>
    <div class="note risk"><div class="note-k">Risk · Hiring lag</div><p class="body" style="max-width:none">Two senior roles still open on platform. <b>Buffer:</b> contractor bridge funded through Phase 1.</p></div>
    <div class="note"><div class="note-k">Buffer · Phase slack</div><p class="body" style="max-width:none">Each phase carries <b>20% schedule slack</b>. A typical slip is absorbed without moving the GA date.</p></div>
    <div class="note"><div class="note-k">Buffer · Scope valve</div><p class="body" style="max-width:none">Integrations are <b>de-scopable</b> to fast-follow if performance work runs long.</p></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'pt-metrics',
      name: 'Success metrics',
      transition: 'slide',
      bodyHtml: `<div class="pad grid-slide">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:330px;--p:85"><div class="donut-label">85%</div></div>
    </div>
    <div>
      <div class="kicker">How we'll know it worked</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:22px">Success metrics for GA.</h2>
      <ul class="bullets" style="--gap:22px">
        <li class="bullet"><span><b>85% of pilot teams</b> active weekly by launch.</span></li>
        <li class="bullet"><span><b>&lt; 200ms</b> p95 load on the planning surface.</span></li>
        <li class="bullet"><span><b>Zero P0s</b> open in the two weeks before GA.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Metrics</span></div>
</div>`,
    }),
    s({
      id: 'pt-quote',
      name: 'Pull quote',
      transition: 'fade',
      bodyHtml: `<div class="pad grid-slide center">
  <blockquote class="quote reveal" style="--quote-size:76px">"A roadmap isn't a promise of dates. It's a shared bet on the order of the work."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nadkarni</span><span class="cite-role">Head of Product, Atlas Platform</span></div>
  <div class="runner reveal"><span class="runner-brand">Atlas Platform</span><span class="runner-label">Why this plan</span></div>
</div>`,
    }),
    s({
      id: 'pt-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:var(--accent-2)">The next gate</div>
    <h2 class="display reveal" style="--display-size:116px">Phase 1 ships<br/>in eight weeks.</h2>
    <p class="lead reveal">Review the plan, sign off the dates, and we start Monday.</p>
  </div>
</div>`,
    }),
  ],
}
