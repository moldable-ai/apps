import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/project-kickoff-cover.jpg'
const FIG_IMG = 'assets/project-kickoff-fig.jpg'

export const projectKickoff: Template = {
  id: 'project-kickoff',
  categories: ['Project Management'],
  name: 'Project Kickoff',
  tagline: 'Energetic, friendly project kickoff deck',
  audiences: ['project', 'team', 'stakeholders', 'kickoff'],
  description:
    'A bright, optimistic kickoff deck in teal and coral on white. Goal cards, a RACI roles table, scope in/out panels, risk callouts, and a milestone timeline carry a complete first-day-of-the-project story you tailor to your team.',
  fonts: {
    display: 'Outfit',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0f2e2b',
    '--muted': '#5b7570',
    '--accent': '#0d9488',
    '--accent-2': '#0d9488',
    '--display': "'Outfit', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '130px',
    '--headline-size': '78px',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#dce8e5',
    '--card-shadow': '0 18px 44px -28px rgba(13,148,136,0.28)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#0f2e2b',
    '--table-border': '#dce8e5',
    '--track': '#e3efed',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--bullet-color': '#f97316',
    '--media-shadow': '0 50px 110px -45px rgba(13,148,136,0.4)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(7,40,38,0.06) 0%, rgba(7,40,38,0.34) 52%, rgba(7,40,38,0.82) 100%)',
    '--pos': '#0d9488',
    '--neg': '#e2603a',
  },
  stageBg: '#eaf3f1',
  assets: ['project-kickoff-cover.jpg', 'project-kickoff-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.check::before { color: var(--coral, #f97316); }
.tl-when { color: var(--accent); }

/* Coral as the energetic secondary */
:root { --coral: #f97316; }

/* Section divider — confident teal numeral on white */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--coral); }
.divider-title { font-family: var(--display); font-weight: 800; font-size: 152px; line-height: 0.95; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 132px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 16px; }

/* Goal cards — coral corner tab + big numeral */
.goals { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.goal { position: relative; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 40px 36px 38px; box-shadow: var(--card-shadow); overflow: hidden; }
.goal::after { content: ''; position: absolute; top: 0; right: 0; width: 64px; height: 64px; background: var(--coral); clip-path: polygon(100% 0, 0 0, 100% 100%); opacity: 0.92; }
.goal-n { font-family: var(--display); font-weight: 800; font-size: 56px; line-height: 1; letter-spacing: -0.03em; color: var(--accent); }
.goal-t { font-family: var(--display); font-weight: 600; font-size: 33px; line-height: 1.08; color: var(--text); margin-top: 18px; }
.goal-d { font-family: var(--body); font-size: 23px; line-height: 1.42; color: var(--muted); margin-top: 10px; }

/* Scope in/out two-column panels */
.scope { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
.panel { border-radius: 18px; padding: 40px 42px; border: 1px solid var(--card-border); }
.panel.in { background: rgba(13,148,136,0.06); border-color: rgba(13,148,136,0.28); }
.panel.out { background: rgba(249,115,22,0.06); border-color: rgba(249,115,22,0.3); }
.panel-h { display: inline-flex; align-items: center; gap: 14px; font-family: var(--display); font-weight: 700; font-size: 38px; letter-spacing: -0.01em; margin-bottom: 24px; }
.panel.in .panel-h { color: var(--accent); }
.panel.out .panel-h { color: var(--coral); }
.panel-h .tick { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 24px; font-weight: 800; }
.panel.in .panel-h .tick { background: var(--accent); }
.panel.out .panel-h .tick { background: var(--coral); }
.panel ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
.panel li { font-family: var(--body); font-size: 27px; line-height: 1.34; color: var(--text); }

/* Risk callout */
.risk { border-left: 5px solid var(--coral); background: rgba(249,115,22,0.06); padding: 30px 38px; border-radius: 0 14px 14px 0; }
.risk-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--coral); margin-bottom: 10px; }

/* RACI legend chips + cells */
.raci-key { display: flex; gap: 30px; flex-wrap: wrap; margin-bottom: 20px; }
.raci-key span { font-family: var(--body); font-size: 24px; color: var(--muted); }
.raci-key b { color: var(--text); font-weight: 700; }
.rc { display: inline-grid; place-items: center; width: 46px; height: 46px; border-radius: 12px; font-family: var(--display); font-weight: 700; font-size: 24px; }
.rc-r { background: var(--accent); color: #fff; }
.rc-a { background: var(--coral); color: #fff; }
.rc-c { background: rgba(13,148,136,0.14); color: var(--accent); }
.rc-i { background: #eef2f1; color: var(--muted); }

/* Cadence cards (tools & rituals) */
.cad { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.cad-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 34px 34px 32px; box-shadow: var(--card-shadow); }
.cad-when { display: inline-block; font-family: var(--body); font-weight: 700; font-size: 19px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--coral); }
.cad-t { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); margin-top: 14px; }
.cad-d { font-family: var(--body); font-size: 23px; line-height: 1.4; color: var(--muted); margin-top: 8px; }

/* Approach phase pills inside the shared .flow */
.phase { background: rgba(13,148,136,0.06); border: 1px solid rgba(13,148,136,0.22); border-radius: 16px; padding: 30px 28px; height: 100%; }
.phase-n { font-family: var(--body); font-weight: 700; font-size: 19px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--coral); }
.phase-t { font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); margin-top: 12px; }
.phase-d { font-family: var(--body); font-size: 22px; line-height: 1.36; color: var(--muted); margin-top: 8px; }

@media (max-width: 640px) {
  html.deck-can-flow .divider { position: relative !important; inset: auto !important; padding: 56px var(--pad-x, 26px) !important; min-height: 300px; }
  html.deck-can-flow .divider-title { font-size: min(52px, 14vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .goal-n { font-size: min(36px, 10vw) !important; }
  html.deck-can-flow .scope { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .panel { padding: 28px 24px !important; }
  html.deck-can-flow .panel-h { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .raci-key { flex-direction: column !important; gap: 12px; }
  html.deck-can-flow .raci-key span { width: 100% !important; white-space: normal !important; }
}`,
  notes:
    'A complete first-day project kickoff deck: Outfit display + Inter body, deep-teal ink (#0f2e2b) on white, ONE teal accent (#0d9488) with a coral (#f97316) secondary for energy, generous whitespace, no gradients. Open and close on the bright flat-lay full-bleed (assets/project-kickoff-cover.jpg); use the whiteboard collaboration figure (assets/project-kickoff-fig.jpg) for the ways-of-working split. Signature pieces: .goals goal cards (coral corner tab) for objectives, .scope in/out panels for what is and is not in scope, .phase pills inside the shared .flow for the approach, the RACI .table with .rc-r/.rc-a/.rc-c/.rc-i role chips for responsibilities, .cad cadence cards for rituals & tools, .risk callout + a risks .table for mitigations, .timeline for milestones, .donut/.stats for the key metric. Friendly and optimistic, never corporate — momentum over gravitas, keep dates and owners concrete.',
  sampleSlides: [
    s({
      id: 'pk-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Project Kickoff · Atlas Onboarding Revamp</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Day one,<br/>same page.</h1>
    <p class="lead reveal">Aligning the team on why, what, and how — before we write a line of code.</p>
  </div>
</div>`,
    }),
    s({
      id: 'pk-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll cover</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">Thirty minutes, one shared picture.</h2>
  <div class="cols-2 reveal" style="gap:0 90px">
    <ol class="steps" style="--gap:22px">
      <li class="step"><span>Why we're here — the problem worth solving.</span></li>
      <li class="step"><span>Objectives and what "done well" looks like.</span></li>
      <li class="step"><span>The plan: scope, approach, and milestones.</span></li>
    </ol>
    <ol class="steps" style="--gap:22px;counter-reset:step 3">
      <li class="step"><span>The team: who owns what, and how we work.</span></li>
      <li class="step"><span>Risks we see — and how we'll stay ahead of them.</span></li>
      <li class="step"><span>What we need from you to get moving.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'pk-why',
      name: 'Why we are here',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why we're here</div>
      <h2 class="headline" style="margin-top:8px">New users get stuck before they ever get value.</h2>
      <div class="risk" style="margin-top:28px;border-left-color:var(--accent);background:rgba(13,148,136,0.06)">
        <div class="risk-k" style="color:var(--accent)">The opportunity</div>
        <p class="body" style="max-width:none">Fixing the first ten minutes could lift activation enough to move the whole growth curve.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Only <b>34%</b> of signups reach their first "aha" moment.</span></li>
      <li class="bullet"><span>Setup takes <b>six screens</b> and an average of nine minutes.</span></li>
      <li class="bullet"><span>Support sees the <b>same five questions</b> every single week.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Why we're here</span></div>
</div>`,
    }),
    s({
      id: 'pk-objectives',
      name: 'Objectives & success',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Objectives &amp; success criteria</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Three goals, each one measurable.</h2>
  <div class="goals reveal" style="--cols:3">
    <div class="goal"><div class="goal-n">01</div><div class="goal-t">Faster first value</div><div class="goal-d">Cut time-to-first-action from 9 minutes to under 3.</div></div>
    <div class="goal"><div class="goal-n">02</div><div class="goal-t">Higher activation</div><div class="goal-d">Lift week-one activation from 34% to 55%.</div></div>
    <div class="goal"><div class="goal-n">03</div><div class="goal-t">Fewer setup tickets</div><div class="goal-d">Halve onboarding support volume within two months of launch.</div></div>
  </div>
  <ul class="checks reveal" style="--gap:18px;margin-top:36px">
    <li class="check"><span><b>How we'll know:</b> a weekly funnel dashboard, reviewed by the whole team.</span></li>
    <li class="check"><span><b>Done means:</b> every metric above hit and holding for two consecutive weeks.</span></li>
  </ul>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Objectives</span></div>
</div>`,
    }),
    s({
      id: 'pk-div1',
      name: 'Section · The plan',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The plan</div>
  <div class="divider-title reveal">What we'll do,<br/>and by when.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'pk-scope',
      name: 'Scope: in & out',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Scope</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Clear on what we're not doing yet.</h2>
  <div class="scope reveal">
    <div class="panel in">
      <div class="panel-h"><span class="tick">&#10003;</span>In scope</div>
      <ul>
        <li>Redesigned signup and first-run experience</li>
        <li>Guided setup checklist with smart defaults</li>
        <li>In-product tips for the top five questions</li>
        <li>Activation analytics and the funnel dashboard</li>
      </ul>
    </div>
    <div class="panel out">
      <div class="panel-h"><span class="tick">&times;</span>Out of scope</div>
      <ul>
        <li>Pricing and packaging changes</li>
        <li>The mobile app onboarding (phase two)</li>
        <li>Migrating existing legacy accounts</li>
        <li>A full visual rebrand of the product</li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Scope</span></div>
</div>`,
    }),
    s({
      id: 'pk-approach',
      name: 'Approach',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Our approach</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Four phases, learning as we go.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="phase"><div class="phase-n">Phase 1</div><div class="phase-t">Discover</div><div class="phase-d">Interview users and map every drop-off in the funnel.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">Phase 2</div><div class="phase-t">Design</div><div class="phase-d">Prototype the new flow and test it with five users.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">Phase 3</div><div class="phase-t">Build</div><div class="phase-d">Ship behind a flag in weekly increments.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="phase"><div class="phase-n">Phase 4</div><div class="phase-t">Launch</div><div class="phase-d">Roll out, measure against goals, and iterate.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Approach</span></div>
</div>`,
    }),
    s({
      id: 'pk-milestones',
      name: 'Milestones & timeline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Milestones</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Eight weeks to a measurable launch.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Discovery complete</b> — funnel mapped, top drop-offs agreed and prioritized.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Design signed off</b> — prototype validated with users, build-ready specs handed over.</div></div>
    <div class="tl-row"><div class="tl-when">Week 6</div><div class="tl-what"><b>Beta behind a flag</b> — new flow live for 10% of signups, instrumentation on.</div></div>
    <div class="tl-row"><div class="tl-when">Week 8</div><div class="tl-what"><b>General availability</b> — full rollout, dashboard live, first results reviewed.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Milestones</span></div>
</div>`,
    }),
    s({
      id: 'pk-div2',
      name: 'Section · The team',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — The team</div>
  <div class="divider-title reveal">Who owns what,<br/>and how we work.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'pk-raci',
      name: 'Roles & responsibilities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Roles &amp; responsibilities</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">No ambiguity on who decides.</h2>
  <div class="raci-key reveal">
    <span><span class="rc rc-r" style="width:32px;height:32px;font-size:18px">R</span> &nbsp;<b>Responsible</b> — does the work</span>
    <span><span class="rc rc-a" style="width:32px;height:32px;font-size:18px">A</span> &nbsp;<b>Accountable</b> — owns the call</span>
    <span><span class="rc rc-c" style="width:32px;height:32px;font-size:18px">C</span> &nbsp;<b>Consulted</b></span>
    <span><span class="rc rc-i" style="width:32px;height:32px;font-size:18px">I</span> &nbsp;<b>Informed</b></span>
  </div>
  <table class="table reveal" style="--table-size:27px">
    <thead><tr><th>Workstream</th><th style="text-align:center">PM</th><th style="text-align:center">Design</th><th style="text-align:center">Eng</th><th style="text-align:center">Data</th><th style="text-align:center">Sponsor</th></tr></thead>
    <tbody>
      <tr><td>Discovery &amp; research</td><td style="text-align:center"><span class="rc rc-a">A</span></td><td style="text-align:center"><span class="rc rc-r">R</span></td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-r">R</span></td><td style="text-align:center"><span class="rc rc-i">I</span></td></tr>
      <tr><td>Flow design</td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-a">A</span></td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-i">I</span></td><td style="text-align:center"><span class="rc rc-i">I</span></td></tr>
      <tr><td>Build &amp; release</td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-a">A</span></td><td style="text-align:center"><span class="rc rc-c">C</span></td><td style="text-align:center"><span class="rc rc-i">I</span></td></tr>
      <tr><td>Launch &amp; results</td><td style="text-align:center"><span class="rc rc-a">A</span></td><td style="text-align:center"><span class="rc rc-i">I</span></td><td style="text-align:center"><span class="rc rc-r">R</span></td><td style="text-align:center"><span class="rc rc-r">R</span></td><td style="text-align:center"><span class="rc rc-c">C</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Roles</span></div>
</div>`,
    }),
    s({
      id: 'pk-ways',
      name: 'Ways of working',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Ways of working</div>
    <h2 class="headline reveal">How we'll move together.</h2>
    <ol class="steps reveal" style="--gap:22px;margin-top:8px">
      <li class="step"><span>Ship in weekly increments behind a flag.</span></li>
      <li class="step"><span>Decisions written down in the project doc, same day.</span></li>
      <li class="step"><span>Default to async; meet only when it unblocks.</span></li>
      <li class="step"><span>If we're stuck for a day, we escalate — no heroics.</span></li>
    </ol>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pk-tools',
      name: 'Tools & cadences',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Tools &amp; cadences</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Light rituals, clear homes.</h2>
  <div class="cad reveal" style="--cols:3">
    <div class="cad-card"><span class="cad-when">Daily · async</span><div class="cad-t">Standup thread</div><div class="cad-d">A short written update in the team channel — blockers first.</div></div>
    <div class="cad-card"><span class="cad-when">Weekly · 30 min</span><div class="cad-t">Demo &amp; plan</div><div class="cad-d">Show real progress, review the funnel, pick the next slice.</div></div>
    <div class="cad-card"><span class="cad-when">Biweekly · 30 min</span><div class="cad-t">Stakeholder sync</div><div class="cad-d">Sponsor check-in on goals, risks, and any decisions needed.</div></div>
    <div class="cad-card"><span class="cad-when">Source of truth</span><div class="cad-t">Project board</div><div class="cad-d">Every task, owner, and status — the single place we look.</div></div>
    <div class="cad-card"><span class="cad-when">Decisions</span><div class="cad-t">The project doc</div><div class="cad-d">Living record of scope, decisions, and open questions.</div></div>
    <div class="cad-card"><span class="cad-when">Signals</span><div class="cad-t">Metrics dashboard</div><div class="cad-d">Live activation funnel, refreshed daily and visible to all.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Cadences</span></div>
</div>`,
    }),
    s({
      id: 'pk-div3',
      name: 'Section · Risks',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Risks</div>
  <div class="divider-title reveal">What could trip<br/>us — and the plan.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'pk-risks',
      name: 'Risks & mitigations',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; mitigations</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Named early, so they stay small.</h2>
  <table class="table reveal" style="--table-size:28px">
    <thead><tr><th>Risk</th><th style="text-align:center">Likelihood</th><th style="text-align:center">Impact</th><th>Mitigation</th></tr></thead>
    <tbody>
      <tr><td>Scope creep from new requests</td><td style="text-align:center">Med</td><td style="text-align:center">High</td><td>Park new asks in phase two; sponsor guards the line.</td></tr>
      <tr><td>Data instrumentation slips</td><td style="text-align:center">Med</td><td style="text-align:center">High</td><td>Wire analytics in week one, before any UI work.</td></tr>
      <tr><td>Key dependency on the auth team</td><td style="text-align:center">Low</td><td style="text-align:center">Med</td><td>Confirm their capacity at kickoff; fallback path designed.</td></tr>
      <tr><td>Beta feedback arrives late</td><td style="text-align:center">Med</td><td style="text-align:center">Med</td><td>Recruit beta users now so they're ready in week six.</td></tr>
    </tbody>
  </table>
  <div class="risk reveal" style="margin-top:30px">
    <div class="risk-k">Watch closely</div>
    <p class="body" style="max-width:none">Instrumentation is our top risk — if we can't measure activation, we can't prove the work. It gets done <b>first</b>.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'pk-metric',
      name: 'The metric that matters',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;--p:55"><div class="donut-label">55%</div></div>
    </div>
    <div>
      <div class="kicker">The one number we're chasing</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Week-one activation, 34% &rarr; 55%.</h2>
      <div class="stats">
        <div class="stat"><div class="stat-num">34%</div><div class="stat-label">Activation today</div></div>
        <div class="stat"><div class="stat-num">+21pt</div><div class="stat-label">The target lift</div></div>
        <div class="stat"><div class="stat-num">8 wk</div><div class="stat-label">To measured launch</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">North-star metric</span></div>
</div>`,
    }),
    s({
      id: 'pk-asks',
      name: 'Asks & decisions',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What we need today</div>
      <h2 class="headline" style="margin-top:8px">Three decisions to unblock us.</h2>
      <p class="lead">Quick yeses here keep the eight-week clock running from this week.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span>Confirm the <b>activation goal</b> (34% &rarr; 55%) as our north star.</span></li>
      <li class="check"><span>Approve the <b>scope line</b> — mobile and migration wait for phase two.</span></li>
      <li class="check"><span>Commit <b>auth-team time</b> in weeks 5–6 for the release.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Onboarding</span><span class="runner-label">Asks &amp; decisions</span></div>
</div>`,
    }),
    s({
      id: 'pk-close',
      name: 'Kickoff close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <blockquote class="quote reveal" style="--quote-size:80px;color:#fff;max-width:20ch">"None of us is as smart as all of us — let's build it together."</blockquote>
    <div class="cite reveal" style="margin-top:34px"><span class="cite-dot"></span><span class="cite-name" style="color:#fff">Let's kick off.</span><span class="cite-role" style="color:rgba(255,255,255,0.82)">First standup, tomorrow 9:30</span></div>
  </div>
</div>`,
    }),
  ],
}
