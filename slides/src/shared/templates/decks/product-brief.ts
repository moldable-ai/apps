import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/product-brief-cover.jpg'
const FIG_IMG = 'assets/product-brief-fig.jpg'

export const productBrief: Template = {
  id: 'product-brief',
  categories: ['Project Management', 'Company'],
  name: 'Product Brief',
  tagline: 'Modern SaaS clarity with mono eyebrows',
  audiences: ['product manager', 'product', 'engineering', 'saas'],
  description:
    'A crisp, modern product deck: structured cards, monospace labels, a precise indigo accent, and feature matrices. A complete PRD narrative — problem to ship — you tailor with your own feature, metrics, and scope.',
  fonts: {
    display: 'General Sans',
    body: 'General Sans',
    mono: 'Space Mono',
    links: [
      'https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fafafb',
    '--text': '#0d0f15',
    '--muted': '#6b7280',
    '--accent': '#5b5bd6',
    '--accent-2': '#0ea5e9',
    '--display': "'General Sans', sans-serif",
    '--body': "'General Sans', sans-serif",
    '--mono': "'Space Mono', monospace",
    '--kicker-font': "'Space Mono', monospace",
    '--kicker-tracking': '0.14em',
    '--kicker-size': '21px',
    '--display-weight': '600',
    '--title-size': '116px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--card-bg': '#ffffff',
    '--card-border': '#e7e8ec',
    '--card-shadow': '0 2px 4px rgba(13,15,21,0.04)',
    '--radius': '18px',
    '--stat-size': '100px',
    '--metric-size': '120px',
    '--track': '#e7e8ec',
    '--donut-hole': '#fafafb',
    '--bar-gap': '32px',
    '--media-shadow': '0 50px 100px -40px rgba(13,15,21,0.32)',
    '--media-radius': '18px',
    '--th-border': '#0d0f15',
    '--table-border': '#e7e8ec',
    '--scrim':
      'linear-gradient(180deg, rgba(8,10,22,0.05) 0%, rgba(8,10,22,0.38) 52%, rgba(8,10,22,0.84) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#eef0f3',
  assets: ['product-brief-cover.jpg', 'product-brief-fig.jpg'],
  decoration: `.kicker { font-weight: 700; color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.card-num { font-family: var(--mono); color: var(--accent); font-size: 22px; letter-spacing: 0.04em; }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }

/* Mono document meta line — the PRD header signature */
.meta { display: flex; flex-wrap: wrap; gap: 14px 22px; font-family: var(--mono); font-size: 21px; letter-spacing: 0.02em; color: var(--muted); }
.meta b { color: var(--text); font-weight: 700; }
.meta .dot { color: var(--card-border); }

/* Section divider — quiet numbered slab on the light ground */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--mono); font-weight: 700; letter-spacing: 0.12em; font-size: 24px; color: var(--accent); text-transform: uppercase; }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.95; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 120px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 12px; }

/* Spec cards — mono tag header, hairline frame, signature look */
.spec { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 28px; }
.scard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 34px; box-shadow: var(--card-shadow); position: relative; }
.scard-tag { display: inline-flex; align-items: center; gap: 10px; font-family: var(--mono); font-weight: 700; font-size: 19px; letter-spacing: 0.08em; color: var(--accent); text-transform: uppercase; }
.scard-tag::before { content: ''; width: 9px; height: 9px; border-radius: 3px; background: var(--accent); }
.scard-t { font-family: var(--display); font-weight: 600; font-size: 33px; line-height: 1.06; color: var(--text); margin-top: 18px; }
.scard-d { font-family: var(--body); font-size: 23px; line-height: 1.42; color: var(--muted); margin-top: 10px; }

/* Two-column goals / non-goals split with mono column headers */
.colpair { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
.colhd { display: flex; align-items: center; gap: 14px; font-family: var(--mono); font-weight: 700; font-size: 22px; letter-spacing: 0.06em; text-transform: uppercase; padding-bottom: 18px; border-bottom: 2px solid var(--text); }
.colhd.is-out { color: var(--muted); border-bottom-color: var(--card-border); }
.colhd .badge { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; font-size: 20px; line-height: 1; }
.colhd .badge.go { background: rgba(91,91,214,0.12); color: var(--accent); }
.colhd .badge.no { background: #f1f2f5; color: var(--muted); }

/* Status pill for scope/risk tables */
.pillv { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 600; font-size: 25px; }
.pillv::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.pillv.in::before { background: var(--accent); }
.pillv.out::before { background: #cbcdd6; }
.pillv.later::before { background: var(--accent-2); }

/* Requirement / priority chip */
.prio { font-family: var(--mono); font-weight: 700; font-size: 18px; letter-spacing: 0.06em; padding: 5px 13px; border-radius: 7px; text-transform: uppercase; }
.prio.p0 { background: rgba(91,91,214,0.12); color: var(--accent); }
.prio.p1 { background: rgba(14,165,233,0.12); color: var(--accent-2); }
.prio.p2 { background: #f1f2f5; color: var(--muted); }

/* Tinted insight callout */
.callout { border-left: 5px solid var(--accent); background: rgba(91,91,214,0.06); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--mono); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 10px; }

/* Mono legend row beside the donut */
.legend { display: flex; flex-direction: column; gap: 20px; }
.legend-row { display: flex; align-items: center; gap: 16px; font-family: var(--body); font-size: 29px; color: var(--text); }
.legend-dot { width: 16px; height: 16px; border-radius: 5px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }`,
  notes:
    'A complete PRD for a new feature: General Sans display + body, Space Mono eyebrows/labels, ink #0d0f15 on near-white #fafafb, ONE precise indigo (#5b5bd6) accent with a sky-blue (#0ea5e9) secondary, generous whitespace, no gradients. Open and close on the frosted-glass full-bleed (assets/product-brief-cover.jpg); use the concept mock (assets/product-brief-fig.jpg) for the solution split. Signature pieces: the .meta mono document line on the cover, numbered .divider section slabs, .spec cards (mono tag header) for requirements/scope, the .colpair goals vs non-goals split with mono .colhd headers, .prio P0/P1/P2 chips and .pillv in/out/later status pills in tables, the indigo .callout for the headline insight, and a .legend beside the .donut. Use .stats and .bars for evidence, .flow for the user journey, .timeline for milestones, a .table for scope and risks. Mono labels everywhere; keep numbers tabular and the story crisp.',
  sampleSlides: [
    s({
      id: 'pb-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Product Requirements · Workspace Onboarding</div>
    <h1 class="display reveal" style="--display-size:132px;margin-top:8px">Instant<br/>onboarding.</h1>
    <p class="lead reveal">Get a new workspace to first value in under sixty seconds.</p>
    <div class="meta reveal" style="margin-top:30px;color:rgba(255,255,255,0.82)">
      <span><b style="color:#fff">PRD</b> v2.0</span><span class="dot">·</span>
      <span>Owner Maya Lin</span><span class="dot">·</span>
      <span>Status In review</span><span class="dot">·</span>
      <span>Target Q3 2026</span>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'pb-agenda',
      name: 'Overview',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">In this brief</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">The case, the plan, the bar.</h2>
  <ol class="steps reveal" style="--gap:22px">
    <li class="step"><span>The problem — who's stuck, and where activation breaks.</span></li>
    <li class="step"><span>The evidence — what the funnel and the support queue tell us.</span></li>
    <li class="step"><span>The solution — concept, flow, and key requirements.</span></li>
    <li class="step"><span>Scope, success metrics, milestones, and the open risks.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Overview</span></div>
</div>`,
    }),
    s({
      id: 'pb-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The problem</div>
      <h2 class="headline" style="margin-top:8px">Activation stalls in the first session.</h2>
      <div class="callout" style="margin-top:28px">
        <div class="callout-k">Who has it</div>
        <p class="body" style="max-width:none">New admins land in an <b>empty workspace</b>, can't tell what to do first, and leave before they ever see the product work.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Setup is a <b>blank slate</b> — no path, no sample, no momentum.</span></li>
      <li class="bullet"><span>Value lives <b>behind configuration</b> most users never finish.</span></li>
      <li class="bullet"><span>The drop-off is <b>silent</b> — they churn without a word.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'pb-evidence',
      name: 'Evidence',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The evidence</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">What the funnel tells us.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">22%</div><div class="stat-label">of signups reach first value</div></div>
    <div class="stat"><div class="stat-num">9 min</div><div class="stat-label">median time to a working setup</div></div>
    <div class="stat"><div class="stat-num">3.1</div><div class="stat-label">support tickets per 100 signups</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Evidence</span></div>
</div>`,
    }),
    s({
      id: 'pb-dropoff',
      name: 'Funnel drop-off',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Where it breaks</div>
      <h2 class="headline" style="margin-top:8px">Most users never finish setup.</h2>
      <p class="lead">Four of five new admins fall out before the workspace does anything useful. The cliff is the empty first screen.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="100%"></div><div class="bar-label">Sign up</div></div>
      <div class="bar" style="--h:61%"><div class="bar-fill" data-val="61%"></div><div class="bar-label">Open app</div></div>
      <div class="bar" style="--h:34%"><div class="bar-fill" data-val="34%"></div><div class="bar-label">Add data</div></div>
      <div class="bar" style="--h:22%"><div class="bar-fill" data-val="22%"></div><div class="bar-label">First value</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Evidence</span></div>
</div>`,
    }),
    s({
      id: 'pb-goals',
      name: 'Goals & non-goals',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Goals &amp; non-goals</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">What this release is — and isn't.</h2>
  <div class="colpair reveal">
    <div>
      <div class="colhd"><span class="badge go">&#10003;</span>Goals</div>
      <ul class="bullets" style="--gap:22px;margin-top:24px">
        <li class="bullet"><span>Get to first value in <b>under 60 seconds</b>.</span></li>
        <li class="bullet"><span>Make the first screen a <b>guided path</b>, never blank.</span></li>
        <li class="bullet"><span>Let users <b>see the product working</b> before they configure it.</span></li>
      </ul>
    </div>
    <div>
      <div class="colhd is-out"><span class="badge no">&times;</span>Non-goals</div>
      <ul class="bullets" style="--gap:22px;margin-top:24px;--bullet-color:#cbcdd6">
        <li class="bullet"><span>Rebuilding the <b>settings</b> or admin console.</span></li>
        <li class="bullet"><span>A full <b>migration importer</b> for legacy data.</span></li>
        <li class="bullet"><span>Changes to <b>billing or the paywall</b> position.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Goals</span></div>
</div>`,
    }),
    s({
      id: 'pb-div-solution',
      name: 'Section · The solution',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The solution</div>
  <div class="divider-title reveal">A first run that<br/>does the work.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'pb-concept',
      name: 'The concept',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">The concept</div>
    <h2 class="headline reveal">A guided first run.</h2>
    <p class="lead reveal">A short, role-aware checklist greets every new admin — three steps, resumable, with realistic sample data one click away.</p>
    <p class="body reveal" style="margin-top:6px">The workspace is never empty. By step three, they're looking at the product doing something useful with data that feels like theirs.</p>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt="Guided onboarding concept mock"></figure>
</div>`,
    }),
    s({
      id: 'pb-flow',
      name: 'User flow',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The user flow</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Sign up to first value, in four moves.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="scard"><div class="scard-tag">Step 1</div><div class="scard-t">Pick a role</div><div class="scard-d">One question tailors the path to what they do.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="scard"><div class="scard-tag">Step 2</div><div class="scard-t">Load sample</div><div class="scard-d">A realistic workspace appears in one click.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="scard"><div class="scard-tag">Step 3</div><div class="scard-t">Do one thing</div><div class="scard-d">Complete a single, real task end to end.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="scard"><div class="scard-tag">Step 4</div><div class="scard-t">Invite a teammate</div><div class="scard-d">Bring one person before the paywall.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">User flow</span></div>
</div>`,
    }),
    s({
      id: 'pb-requirements',
      name: 'Key requirements',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key requirements</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">What we must build.</h2>
  <div class="spec reveal" style="--cols:3">
    <div class="scard"><div class="scard-tag">Setup · P0</div><div class="scard-t">Guided checklist</div><div class="scard-d">Role-aware, three steps, resumable across sessions and devices.</div></div>
    <div class="scard"><div class="scard-tag">Data · P0</div><div class="scard-t">Sample workspace</div><div class="scard-d">One click to a realistic demo dataset, clearly labeled and easy to clear.</div></div>
    <div class="scard"><div class="scard-tag">Team · P1</div><div class="scard-t">Invite flow</div><div class="scard-d">Bring a teammate before the paywall, with a pre-filled message.</div></div>
    <div class="scard"><div class="scard-tag">Signal · P1</div><div class="scard-t">Progress events</div><div class="scard-d">Instrument every step so we can measure and tune the funnel.</div></div>
    <div class="scard"><div class="scard-tag">Resume · P2</div><div class="scard-t">Return nudge</div><div class="scard-d">A single follow-up that picks up exactly where they left off.</div></div>
    <div class="scard"><div class="scard-tag">A11y · P0</div><div class="scard-t">Accessible by default</div><div class="scard-d">Full keyboard path, screen-reader labels, reduced-motion support.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Requirements</span></div>
</div>`,
    }),
    s({
      id: 'pb-scope',
      name: 'Scope: in / out',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Scope</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">In v2, out of v2, and later.</h2>
  <table class="table reveal" style="margin-top:6px">
    <thead><tr><th>Capability</th><th>Owner</th><th class="num">Effort</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Role-aware guided checklist</td><td class="muted">Onboarding</td><td class="num">M</td><td><span class="pillv in">In v2</span></td></tr>
      <tr><td>One-click sample workspace</td><td class="muted">Data platform</td><td class="num">M</td><td><span class="pillv in">In v2</span></td></tr>
      <tr><td>Teammate invite flow</td><td class="muted">Growth</td><td class="num">S</td><td><span class="pillv in">In v2</span></td></tr>
      <tr><td>Full data importer</td><td class="muted">Data platform</td><td class="num">L</td><td><span class="pillv out">Out</span></td></tr>
      <tr><td>In-product checklist for existing users</td><td class="muted">Onboarding</td><td class="num">M</td><td><span class="pillv later">Later</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Scope</span></div>
</div>`,
    }),
    s({
      id: 'pb-div-metrics',
      name: 'Section · How we measure it',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — How we measure it</div>
  <div class="divider-title reveal">Shipped means<br/>activation moves.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'pb-metrics',
      name: 'Success metrics',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;--p:40"><div class="donut-label">40%</div></div>
    </div>
    <div>
      <div class="kicker">Success metrics</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Activation, end of quarter.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:var(--accent)"></span>Target activation rate<span class="v">40%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#cbcdd6"></span>Today's baseline<span class="v">22%</span></div>
      </div>
      <div class="callout" style="margin-top:30px">
        <div class="callout-k">Guardrail</div>
        <p class="body" style="max-width:none">No drop in <b>week-2 retention</b> and no rise in <b>support contact rate</b>.</p>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Success metrics</span></div>
</div>`,
    }),
    s({
      id: 'pb-milestones',
      name: 'Milestones',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Milestones</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Four checkpoints to GA.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Wk 1–2</div><div class="tl-what"><b>Spec &amp; design</b> — flows, copy, and the sample-data model locked with eng.</div></div>
    <div class="tl-row"><div class="tl-when">Wk 3–5</div><div class="tl-what"><b>Build</b> — checklist, one-click sample, and invite flow behind a flag.</div></div>
    <div class="tl-row"><div class="tl-when">Wk 6</div><div class="tl-what"><b>Beta</b> — 10% of new signups, instrumentation validated against the funnel.</div></div>
    <div class="tl-row"><div class="tl-when">Wk 8</div><div class="tl-what"><b>GA</b> — full rollout once activation clears the bar with guardrails green.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Milestones</span></div>
</div>`,
    }),
    s({
      id: 'pb-risks',
      name: 'Risks & open questions',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; open questions</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">What could slow us down.</h2>
  <table class="table reveal" style="margin-top:6px">
    <thead><tr><th>Risk / question</th><th>Owner</th><th class="num">Likelihood</th><th>Mitigation</th></tr></thead>
    <tbody>
      <tr><td>Sample-data quality feels fake</td><td class="muted">Design</td><td class="num"><span class="prio p1">Med</span></td><td class="muted">Ship two strong templates first; expand later.</td></tr>
      <tr><td>Invite service rate limits</td><td class="muted">Platform</td><td class="num"><span class="prio p0">High</span></td><td class="muted">Coordinate quota; queue and retry on send.</td></tr>
      <tr><td>Which roles do we tailor for at launch?</td><td class="muted">PM</td><td class="num"><span class="prio p2">Open</span></td><td class="muted">Decision needed by spec lock — top 3 by volume.</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'pb-quote',
      name: 'User quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">From a user interview</div>
  <blockquote class="quote reveal" style="--quote-size:72px;margin-top:14px">"I signed up, saw an empty box, and closed the tab. I never figured out what it actually did."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Admin, 14-person team</span><span class="cite-role">Churned in week one</span></div>
  <div class="runner reveal"><span class="runner-brand">Workspace Onboarding</span><span class="runner-label">User voice</span></div>
</div>`,
    }),
    s({
      id: 'pb-next',
      name: 'Next steps',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Next steps</div>
    <h2 class="display reveal" style="--display-size:118px">Lock the spec,<br/>start the build.</h2>
    <p class="lead reveal">Review by Friday · spec lock Monday · beta in six weeks. Comments in the doc.</p>
  </div>
</div>`,
    }),
  ],
}
