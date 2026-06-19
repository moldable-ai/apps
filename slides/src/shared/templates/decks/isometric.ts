import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/isometric-cover.jpg'
const SCENE_IMG = 'assets/isometric-scene.jpg'

export const isometric: Template = {
  id: 'isometric',
  categories: ['Sales', 'Company'],
  name: 'Isometric',
  tagline: 'Tidy isometric 3D for a cloud platform story',
  audiences: ['developer', 'platform', 'b2b', 'sales'],
  description:
    'A bright, modern deck for a cloud developer platform, built around clean isometric 3D imagery — matte clay servers and glowing cyan pipelines. Space Grotesk on off-white with an indigo + cyan duo, layered stack cards, node/connector chips, a metrics band, and a step flow carry a full "how it works" narrative you tailor.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f8fb',
    '--text': '#1e293b',
    '--muted': '#64748b',
    '--accent': '#4338ca',
    '--accent-2': '#06b6d4',
    '--display': "'Space Grotesk', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '700',
    '--title-size': '126px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e3e7f0',
    '--card-shadow': '0 22px 50px -32px rgba(30,41,59,0.28)',
    '--radius': '18px',
    '--chip-bg': '#eef0fa',
    '--stat-size': '104px',
    '--metric-size': '118px',
    '--bullet-color': '#06b6d4',
    '--th-border': '#1e293b',
    '--table-border': '#e3e7f0',
    '--rule-color': '#e3e7f0',
    '--track': '#e6e9f2',
    '--donut-hole': '#f7f8fb',
    '--bar-gap': '34px',
    '--media-radius': '20px',
    '--media-border': '1px solid #e3e7f0',
    '--media-shadow': '0 50px 110px -45px rgba(30,41,59,0.4)',
    '--scrim':
      'linear-gradient(180deg, rgba(13,16,40,0.05) 0%, rgba(13,16,40,0.38) 52%, rgba(13,16,40,0.84) 100%)',
    '--pos': '#0e9f6e',
    '--neg': '#e02424',
  },
  stageBg: '#eceef4',
  assets: ['isometric-cover.jpg', 'isometric-scene.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent-2); }
.tl-when { color: var(--accent); }
.step::before { color: var(--accent); }

/* Section divider — isometric grid wash + cyan rule */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px;
  background-image: linear-gradient(115deg, rgba(67,56,202,0.06) 1px, transparent 1px), linear-gradient(65deg, rgba(6,182,212,0.05) 1px, transparent 1px);
  background-size: 64px 64px; }
.divider-num { font-family: var(--mono); font-weight: 600; letter-spacing: 0.2em; font-size: 22px; color: var(--accent-2); }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 148px; line-height: 0.95; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 132px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 14px; }
.divider-rule::after { content: ''; display: inline-block; width: 44px; height: 6px; border-radius: 3px; background: var(--accent-2); margin-left: 8px; vertical-align: top; }

/* Layered "stack" cards — signature isometric depth */
.stackgrid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.stack { position: relative; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 34px 34px; box-shadow: var(--card-shadow); }
.stack::before, .stack::after { content: ''; position: absolute; left: 14px; right: 14px; border-radius: 16px; z-index: -1; }
.stack::before { top: -9px; height: 22px; background: #eef0fa; border: 1px solid var(--card-border); }
.stack::after { top: -17px; left: 28px; right: 28px; height: 20px; background: #f3f4fb; border: 1px solid var(--card-border); }
.stack-ic { width: 60px; height: 60px; border-radius: 15px; background: rgba(67,56,202,0.1); display: grid; place-items: center; color: var(--accent); font-family: var(--mono); font-weight: 600; font-size: 24px; }
.stack-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.05; color: var(--text); margin-top: 22px; }
.stack-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 10px; }

/* Node / connector chips — for integrations + inline tech tags */
.nodes { display: flex; flex-wrap: wrap; gap: 18px; }
.node { display: inline-flex; align-items: center; gap: 13px; padding: 16px 26px; border-radius: 14px; background: var(--card-bg); border: 1px solid var(--card-border); box-shadow: 0 12px 30px -24px rgba(30,41,59,0.4); font-family: var(--display); font-weight: 600; font-size: 27px; color: var(--text); }
.node::before { content: ''; width: 13px; height: 13px; border-radius: 50%; background: var(--accent-2); box-shadow: 0 0 0 5px rgba(6,182,212,0.16); flex: 0 0 auto; }
.node.indigo::before { background: var(--accent); box-shadow: 0 0 0 5px rgba(67,56,202,0.16); }

/* Metrics band — full-width tinted strip with hairline cells */
.band { background: #fff; border: 1px solid var(--card-border); border-radius: 20px; display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); padding: 52px 36px; box-shadow: var(--card-shadow); }
.band-cell { padding: 0 40px; }
.band-cell + .band-cell { border-left: 1px solid var(--card-border); }
.band-num { font-family: var(--display); font-weight: 700; font-size: 82px; line-height: 1; letter-spacing: -0.025em; color: var(--accent); font-variant-numeric: tabular-nums; }
.band-num .u { color: var(--accent-2); }
.band-label { font-family: var(--body); font-size: 23px; line-height: 1.32; color: var(--muted); margin-top: 14px; }

/* Step flow — connected pill cards */
.sflow { display: flex; align-items: stretch; }
.sflow .sstep { flex: 1; }
.scard { position: relative; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 30px 28px; box-shadow: var(--card-shadow); height: 100%; }
.scard-n { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 13px; background: var(--accent); color: #fff; font-family: var(--mono); font-weight: 600; font-size: 24px; }
.scard-t { font-family: var(--display); font-weight: 600; font-size: 29px; color: var(--text); margin-top: 20px; }
.scard-d { font-family: var(--body); font-size: 22px; line-height: 1.38; color: var(--muted); margin-top: 8px; }

/* Pricing + comparison cells */
.tier-head { font-family: var(--display); font-weight: 600; }
.tier-price { font-family: var(--display); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.col-us { background: rgba(67,56,202,0.05); }

/* Status / uptime pills for the reliability table */
.status { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 600; font-size: 26px; }
.status::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.status.on::before { background: var(--pos); } .status.watch::before { background: #d99317; }

/* Cost-of-status-quo callout */
.callout { border-left: 5px solid var(--accent-2); background: rgba(6,182,212,0.07); padding: 30px 38px; border-radius: 0 14px 14px 0; }
.callout-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }

@media (max-width: 640px) {
  html.deck-can-flow .divider-title { font-size: min(50px, 14vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .band-num { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .stack-t { font-size: min(28px, 8vw) !important; line-height: 1.1 !important; }
  html.deck-can-flow .scard-t { font-size: min(26px, 7vw) !important; }
  html.deck-can-flow .node { font-size: min(20px, 6vw) !important; padding: 12px 18px !important; max-width: 100% !important; }
  html.deck-can-flow .stack { padding: 28px 24px 24px !important; }
  html.deck-can-flow .band { padding: 28px 22px !important; }
  html.deck-can-flow .callout { padding: 24px 22px !important; }
  /* The connected step-flow is a horizontal flex row (~1140px); stack it on phone. */
  html.deck-can-flow .sflow { flex-direction: column !important; gap: 14px !important; }
  html.deck-can-flow .sflow .sstep { flex: none !important; }
}`,
  notes:
    'A complete cloud developer-platform "how it works" deck rendered in clean isometric 3D. Space Grotesk display + Inter body + IBM Plex Mono kickers, slate ink #1e293b on off-white #f7f8fb, an indigo #4338ca primary with a cyan #06b6d4 accent, no gradients on type. Open and close on the glowing isometric data-center full-bleed (assets/isometric-cover.jpg); use the isometric product/workflow scene (assets/isometric-scene.jpg) for the product split. Signature pieces: .stackgrid/.stack layered "stack" cards (with offset shadows for isometric depth) for capabilities, .node/.nodes connector chips for integrations and inline tech tags, the .band metrics strip for scale, .sflow connected step cards for the architecture, .divider with a faint isometric grid wash. Use .bars for performance, a .table with .status pills for reliability, a pricing/comparison .table, .timeline for rollout, .callout for the cost of the status quo. Keep the chrome clean and modern; let the isometric imagery carry the medium. Tabular numbers, one idea per slide.',
  sampleSlides: [
    s({
      id: 'iso-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Developer Platform · Built for ship velocity</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Ship the<br/>infrastructure,<br/>not the toil.</h1>
    <p class="lead reveal">Strata — the cloud platform that turns a git push into a global deployment.</p>
  </div>
</div>`,
    }),
    s({
      id: 'iso-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll cover</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">From the problem to the platform.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>Why running infrastructure is the work no one wants.</span></li>
    <li class="step"><span>What Strata is — and how a deploy actually works.</span></li>
    <li class="step"><span>The proof: performance, reliability, and the teams already on it.</span></li>
    <li class="step"><span>What it costs, how you roll out, and where to start.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'iso-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The status quo</div>
      <h2 class="headline" style="margin-top:8px">Infrastructure eats the roadmap.</h2>
      <div class="callout" style="margin-top:28px">
        <div class="callout-k">The hidden cost</div>
        <p class="body" style="max-width:none">Teams spend <b>40% of engineering time</b> on glue, pipelines, and on-call instead of product.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Every new service means <b>weeks of YAML</b>, IAM, and pipeline plumbing.</span></li>
      <li class="bullet"><span>Staging and prod <b>drift apart</b> until a release breaks at 2am.</span></li>
      <li class="bullet"><span>Scaling, regions, and rollbacks become <b>tribal knowledge</b>.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'iso-stakes',
      name: 'The stakes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What it's costing you</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The drag of undifferentiated heavy lifting.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">11 days</div><div class="stat-label">Median time to stand up a new production service</div></div>
    <div class="stat"><div class="stat-num">40%</div><div class="stat-label">Of engineering hours spent on infra, not product</div></div>
    <div class="stat"><div class="stat-num">1 in 5</div><div class="stat-label">Incidents traced to environment drift or config</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">The stakes</span></div>
</div>`,
    }),
    s({
      id: 'iso-div1',
      name: 'Section · The platform',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The platform</div>
  <div class="divider-title reveal">Push code.<br/>We run the rest.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'iso-what',
      name: 'What it is',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Meet Strata</div>
    <h2 class="headline reveal">One platform from git push to global deploy.</h2>
    <p class="lead reveal">Strata reads your repo, provisions the infrastructure it needs, and ships it to every region — with previews, rollbacks, and observability built in.</p>
  </div>
  <figure class="media reveal"><img src="${SCENE_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'iso-architecture',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How it works</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">A deploy in four moves.</h2>
  <div class="sflow reveal">
    <div class="sstep"><div class="scard"><div class="scard-n">1</div><div class="scard-t">Detect</div><div class="scard-d">Strata reads your repo and infers the build, runtime, and services.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="sstep"><div class="scard"><div class="scard-n">2</div><div class="scard-t">Provision</div><div class="scard-d">It stands up compute, data, and networking as declarative infra.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="sstep"><div class="scard"><div class="scard-n">3</div><div class="scard-t">Deploy</div><div class="scard-d">Immutable builds roll out region by region with health gates.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="sstep"><div class="scard"><div class="scard-n">4</div><div class="scard-t">Observe</div><div class="scard-d">Logs, traces, and metrics stream back — one click to roll back.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'iso-capabilities',
      name: 'Core capabilities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Core capabilities</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:40px">Everything a service needs, on day one.</h2>
  <div class="stackgrid reveal" style="--cols:3">
    <div class="stack"><div class="stack-ic">{}</div><div class="stack-t">Infra from code</div><div class="stack-d">Declare intent in your repo; Strata reconciles the real infrastructure.</div></div>
    <div class="stack"><div class="stack-ic">&gt;_</div><div class="stack-t">Instant previews</div><div class="stack-d">Every pull request gets a full, throwaway environment with a live URL.</div></div>
    <div class="stack"><div class="stack-ic">&#8635;</div><div class="stack-t">One-click rollback</div><div class="stack-d">Immutable deploys mean any release reverts cleanly in seconds.</div></div>
    <div class="stack"><div class="stack-ic">&#9673;</div><div class="stack-t">Global by default</div><div class="stack-d">Multi-region routing and edge caching without a networking team.</div></div>
    <div class="stack"><div class="stack-ic">&#9678;</div><div class="stack-t">Built-in observability</div><div class="stack-d">Logs, traces, and metrics correlated to the exact deploy that shipped.</div></div>
    <div class="stack"><div class="stack-ic">&#128274;</div><div class="stack-t">Secure by design</div><div class="stack-d">Scoped secrets, SSO, and audit trails wired in from the first deploy.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Capabilities</span></div>
</div>`,
    }),
    s({
      id: 'iso-integrations',
      name: 'Integrations',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Plugs into your stack</div>
      <h2 class="headline" style="margin-top:8px">It meets your tools where they are.</h2>
      <p class="lead">Connect the runtimes, datastores, and pipelines you already run. Strata wires the connectors and keeps them in sync.</p>
    </div>
    <div>
      <div class="nodes" style="margin-bottom:18px">
        <span class="node indigo">Git</span><span class="node indigo">Containers</span><span class="node">Postgres</span><span class="node">Redis</span>
      </div>
      <div class="nodes" style="margin-bottom:18px">
        <span class="node">Object Store</span><span class="node indigo">CI</span><span class="node">Queues</span>
      </div>
      <div class="nodes">
        <span class="node">Metrics</span><span class="node indigo">Secrets Vault</span><span class="node">DNS</span>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Integrations</span></div>
</div>`,
    }),
    s({
      id: 'iso-div2',
      name: 'Section · The proof',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — The proof</div>
  <div class="divider-title reveal">Fast, reliable,<br/>and measured.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'iso-performance',
      name: 'Performance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Time to deploy</div>
      <h2 class="headline" style="margin-top:8px">From days to a single push.</h2>
      <p class="lead">Across onboarded teams, the time from first commit to a live, multi-region service collapsed within the first month.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:94%"><div class="bar-fill" data-val="11d"></div><div class="bar-label">Before</div></div>
      <div class="bar" style="--h:52%"><div class="bar-fill" data-val="2d"></div><div class="bar-label">Week 1</div></div>
      <div class="bar" style="--h:24%"><div class="bar-fill" data-val="40m"></div><div class="bar-label">Week 2</div></div>
      <div class="bar" style="--h:10%"><div class="bar-fill" data-val="6m"></div><div class="bar-label">Steady state</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Performance</span></div>
</div>`,
    }),
    s({
      id: 'iso-reliability',
      name: 'Reliability',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Reliability</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">Production-grade, region by region.</h2>
  <table class="table reveal">
    <thead><tr><th>Region</th><th class="num">Uptime (90d)</th><th class="num">p99 latency</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>US-East</td><td class="num">99.99%</td><td class="num">38 ms</td><td><span class="status on">Healthy</span></td></tr>
      <tr><td>US-West</td><td class="num">99.99%</td><td class="num">41 ms</td><td><span class="status on">Healthy</span></td></tr>
      <tr><td>EU-Central</td><td class="num">99.98%</td><td class="num">44 ms</td><td><span class="status on">Healthy</span></td></tr>
      <tr><td>AP-South</td><td class="num">99.95%</td><td class="num">62 ms</td><td><span class="status watch">Scaling</span></td></tr>
      <tr class="row-em"><td>Fleet SLA</td><td class="num">99.99%</td><td class="num">46 ms</td><td><span class="status on">On target</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Reliability</span></div>
</div>`,
    }),
    s({
      id: 'iso-quote',
      name: 'Customer quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"We deleted our deploy pipeline and our on-call runbook. Now a push is the whole release process."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nandakumar</span><span class="cite-role">Head of Platform, Lattice Robotics</span></div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Customer voice</span></div>
</div>`,
    }),
    s({
      id: 'iso-scale',
      name: 'Scale metrics',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">At scale</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">What the platform runs today.</h2>
  <div class="band reveal" style="--cols:4">
    <div class="band-cell"><div class="band-num">4.2<span class="u">B</span></div><div class="band-label">Deploys orchestrated to date</div></div>
    <div class="band-cell"><div class="band-num">28</div><div class="band-label">Regions on the global fleet</div></div>
    <div class="band-cell"><div class="band-num">99.99<span class="u">%</span></div><div class="band-label">Fleet-wide uptime, trailing year</div></div>
    <div class="band-cell"><div class="band-num">6<span class="u">m</span></div><div class="band-label">Median push-to-live deploy time</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Scale</span></div>
</div>`,
    }),
    s({
      id: 'iso-pricing',
      name: 'Pricing tiers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Pricing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Plans that scale with the fleet.</h2>
  <table class="table reveal">
    <thead><tr><th>Plan</th><th>Best for</th><th>Environments</th><th class="num">Per month</th></tr></thead>
    <tbody>
      <tr><td class="tier-head">Builder</td><td class="muted">Solo devs and small projects</td><td>Up to 3</td><td class="num tier-price">$0</td></tr>
      <tr><td class="tier-head">Team</td><td class="muted">A product team shipping daily</td><td>Up to 25</td><td class="num tier-price">$900</td></tr>
      <tr class="col-us"><td class="tier-head">Scale</td><td class="muted">Multiple teams, multi-region</td><td>Up to 150</td><td class="num tier-price">$4,800</td></tr>
      <tr><td class="tier-head">Enterprise</td><td class="muted">Company-wide, dedicated regions</td><td>Unlimited</td><td class="num tier-price">Custom</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">All plans include previews, rollbacks, and observability. Scale and Enterprise add SSO, audit logs, and a dedicated solutions engineer.</p>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Pricing</span></div>
</div>`,
    }),
    s({
      id: 'iso-rollout',
      name: 'Rollout',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Rollout</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Live in two weeks, not two quarters.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 1</div><div class="tl-what"><b>Connect &amp; deploy one service</b> — link a repo, ship a pilot app to a preview and prod.</div></div>
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Migrate a real workload</b> — move a production service with rollbacks and observability on.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Team-wide adoption</b> — SSO, environments, and guardrails rolled out across squads.</div></div>
    <div class="tl-row"><div class="tl-when">Week 8</div><div class="tl-what"><b>Value review</b> — measured deploy velocity and incident reduction against baseline.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Rollout</span></div>
</div>`,
    }),
    s({
      id: 'iso-ask',
      name: 'Next steps',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Next steps</div>
      <h2 class="headline" style="margin-top:8px">Three steps to first deploy.</h2>
      <p class="lead">A focused two-week pilot on one service, with velocity goals we agree up front.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span>Pick a <b>pilot service</b> and the team that owns it.</span></li>
      <li class="check"><span>Confirm <b>repo and cloud access</b> plus a short security review.</span></li>
      <li class="check"><span>Lock a <b>kickoff date</b> — first deploy lands within five business days.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Strata</span><span class="runner-label">Next steps</span></div>
</div>`,
    }),
    s({
      id: 'iso-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Start shipping</div>
    <h2 class="display reveal" style="--display-size:118px">Your first deploy<br/>is one push away.</h2>
    <p class="lead reveal">hello@strata.dev · strata.dev/start</p>
  </div>
</div>`,
    }),
  ],
}
