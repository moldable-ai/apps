import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/sprint-review-cover.jpg'
const PRODUCT_IMG = 'assets/sprint-review-product.jpg'

export const sprintReview: Template = {
  id: 'sprint-review',
  categories: ['Project Management'],
  name: 'Sprint Review',
  tagline: 'Crisp product sprint demo & review',
  audiences: ['product', 'engineering', 'scrum', 'stakeholder'],
  description:
    'A near-black engineering deck with a single lime accent and a mono/sans pairing. Browser-frame demo shots, metric delta chips, a shipped checklist, burndown bars, and a velocity table carry a complete sprint demo from goal to next plan — tailor the sprint number, features, and numbers.',
  fonts: {
    display: 'Sora',
    body: 'Inter',
    mono: 'JetBrains Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#0c0c0d',
    '--text': '#f4f5f1',
    '--muted': '#8b8d86',
    '--accent': '#84cc16',
    '--accent-2': '#84cc16',
    '--display': "'Sora', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'JetBrains Mono', monospace",
    '--display-weight': '700',
    '--title-size': '126px',
    '--headline-size': '76px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-font': "'JetBrains Mono', monospace",
    '--kicker-tracking': '0.18em',
    '--kicker-size': '21px',
    '--card-bg': 'rgba(255,255,255,0.035)',
    '--card-border': 'rgba(255,255,255,0.1)',
    '--radius': '14px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--bullet-radius': '3px',
    '--th-border': 'rgba(255,255,255,0.45)',
    '--table-border': 'rgba(255,255,255,0.09)',
    '--rule-color': 'rgba(255,255,255,0.12)',
    '--track': 'rgba(255,255,255,0.08)',
    '--donut-hole': '#0c0c0d',
    '--bar-gap': '30px',
    '--media-border': '1px solid rgba(255,255,255,0.1)',
    '--media-shadow': '0 50px 110px -45px rgba(0,0,0,0.85)',
    '--scrim':
      'linear-gradient(180deg, rgba(10,10,11,0.15) 0%, rgba(10,10,11,0.55) 52%, rgba(10,10,11,0.94) 100%)',
    '--pos': '#84cc16',
    '--neg': '#f06d5a',
  },
  stageBg: '#070708',
  assets: ['sprint-review-cover.jpg', 'sprint-review-product.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }

/* Section divider — mono index over a big lime-ruled title */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--mono); font-weight: 600; letter-spacing: 0.16em; font-size: 24px; color: var(--accent); text-transform: uppercase; }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 150px; line-height: 0.94; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 132px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 18px; }

/* Browser / app screenshot frame — chrome mock around a figure */
.frame { border: 1px solid var(--card-border); border-radius: 16px; overflow: hidden; background: #141416; box-shadow: var(--media-shadow); }
.frame-bar { display: flex; align-items: center; gap: 18px; padding: 18px 24px; border-bottom: 1px solid var(--card-border); background: rgba(255,255,255,0.025); }
.frame-dots { display: flex; gap: 10px; }
.frame-dots i { width: 15px; height: 15px; border-radius: 50%; background: rgba(255,255,255,0.18); }
.frame-url { flex: 1; font-family: var(--mono); font-size: 22px; color: var(--muted); background: rgba(255,255,255,0.04); border-radius: 999px; padding: 8px 22px; }
.frame-shot { display: block; width: 100%; height: 100%; object-fit: cover; }
.frame .frame-shot { aspect-ratio: 16 / 9; }

/* Metric delta chips — ▲ up / ▼ down */
.chip { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-weight: 600; font-size: 24px; padding: 7px 16px; border-radius: 999px; }
.chip.up { color: var(--accent); background: rgba(132,204,22,0.13); border: 1px solid rgba(132,204,22,0.3); }
.chip.down { color: var(--neg); background: rgba(240,109,90,0.12); border: 1px solid rgba(240,109,90,0.3); }
.chip.flat { color: var(--muted); background: rgba(255,255,255,0.05); border: 1px solid var(--card-border); }
.chip.up::before { content: '\\25B2'; font-size: 15px; }
.chip.down::before { content: '\\25BC'; font-size: 15px; }
.chip.flat::before { content: '\\2013'; font-size: 18px; }

/* Stat tile that pairs a number with a delta chip */
.dtile { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 40px 38px; display: flex; flex-direction: column; gap: 14px; }
.dtile-num { font-family: var(--display); font-weight: 700; font-size: 88px; line-height: 1; letter-spacing: -0.02em; color: #fff; font-variant-numeric: tabular-nums; }
.dtile-label { font-family: var(--body); font-size: 25px; color: var(--muted); }

/* Shipped checklist — boxed lime check rows */
.shiplist { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 40px; }
.ship { display: flex; gap: 22px; align-items: flex-start; padding: 26px 30px; border: 1px solid var(--card-border); border-radius: 14px; background: var(--card-bg); }
.ship-box { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 9px; background: rgba(132,204,22,0.14); border: 1px solid rgba(132,204,22,0.4); color: var(--accent); display: grid; place-items: center; font-size: 24px; font-weight: 800; font-family: var(--display); }
.ship-t { font-family: var(--display); font-weight: 600; font-size: 30px; line-height: 1.12; color: var(--text); }
.ship-d { font-family: var(--body); font-size: 23px; line-height: 1.34; color: var(--muted); margin-top: 6px; }
.ship-tag { font-family: var(--mono); font-size: 19px; color: var(--accent); margin-top: 10px; letter-spacing: 0.04em; }

/* Sprint-goal verdict banner */
.verdict { display: inline-flex; align-items: center; gap: 16px; font-family: var(--mono); font-weight: 600; font-size: 28px; letter-spacing: 0.04em; padding: 14px 28px; border-radius: 999px; }
.verdict.hit { color: var(--accent); background: rgba(132,204,22,0.12); border: 1px solid rgba(132,204,22,0.35); }
.verdict.hit::before { content: '\\2713'; font-size: 26px; }

/* Code/spec callout block */
.callout { border-left: 4px solid var(--accent); background: rgba(132,204,22,0.07); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }

/* Risk / blocker callouts */
.risk { border: 1px solid var(--card-border); border-radius: 14px; padding: 30px 34px; background: var(--card-bg); border-top: 4px solid var(--neg); }
.risk.warn { border-top-color: #e0b341; }
.risk-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 19px; margin-bottom: 12px; }
.risk .risk-k { color: var(--neg); }
.risk.warn .risk-k { color: #e0b341; }
.risk-t { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); }
.risk-d { font-family: var(--body); font-size: 24px; line-height: 1.36; color: var(--muted); margin-top: 10px; }

/* Status pill for tables */
.status { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 600; font-size: 25px; }
.status::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.status.on::before { background: var(--accent); } .status.warn::before { background: #e0b341; } .status.off::before { background: var(--neg); }`,
  notes:
    'A complete product sprint demo/review: Sora display + Inter body + JetBrains Mono accents, near-black #0c0c0d, ONE lime accent #84cc16, generous whitespace, no gradients. Open on the dark product-UI full-bleed (assets/sprint-review-cover.jpg); demo Feature A inside the .frame browser/app chrome mock and Feature B with the product .split (assets/sprint-review-product.jpg). Signature pieces: .frame screenshot chrome, .chip up/down/flat delta chips, .shiplist boxed shipped checklist, .verdict goal banner, .dtile metric tiles, .risk blocker callouts. Use .bars for burndown/velocity, .table for quality (bugs/coverage) with .status pills, .flow or cards for carry-over, .steps for the next-sprint plan. Pin the .runner footer (squad left, sprint section right). Keep numbers tabular and mono, the story tight, ship/cut decisions explicit.',
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
    <div class="kicker reveal">Sprint 24 · Review &amp; Demo · Aug 30, 2026</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">What we<br/>shipped.</h1>
    <p class="lead reveal">Atlas Squad · Checkout &amp; Payments · two-week sprint</p>
  </div>
</div>`,
    }),
    s({
      id: 'sr-goal',
      name: 'Sprint goal',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The sprint goal</div>
      <h2 class="headline" style="margin-top:8px">Cut checkout drop-off with a one-step express path.</h2>
      <div class="verdict hit" style="margin-top:30px">Goal hit — shipped to 100%</div>
    </div>
    <ul class="bullets" style="--gap:24px">
      <li class="bullet"><span><b>Committed:</b> 38 points across 9 stories.</span></li>
      <li class="bullet"><span><b>Completed:</b> 36 points, 8 stories — one rolled to Sprint 25.</span></li>
      <li class="bullet"><span><b>Outcome:</b> express checkout live behind a 25% rollout flag.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Sprint goal</span></div>
</div>`,
    }),
    s({
      id: 'sr-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll cover</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Demo first, numbers second.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>What shipped this sprint — the demo highlights.</span></li>
    <li class="step"><span>Live walkthrough of the two headline features.</span></li>
    <li class="step"><span>The numbers: impact, velocity, and quality.</span></li>
    <li class="step"><span>What carried over, the risks, and the Sprint 25 plan.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'sr-shipped',
      name: 'What shipped',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What shipped</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Eight stories, in production.</h2>
  <div class="shiplist reveal">
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Express checkout flow</div><div class="ship-d">One-step path for returning, logged-in buyers.</div><div class="ship-tag">PAY-412 · behind flag</div></div></div>
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Saved payment methods</div><div class="ship-d">Tokenized cards with default selection.</div><div class="ship-tag">PAY-418</div></div></div>
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Address autocomplete</div><div class="ship-d">Inline suggestions cut form fields by half.</div><div class="ship-tag">PAY-421</div></div></div>
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Real-time tax preview</div><div class="ship-d">Totals update before the buyer commits.</div><div class="ship-tag">PAY-426</div></div></div>
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Decline retry handling</div><div class="ship-d">Graceful soft-decline recovery, no dead ends.</div><div class="ship-tag">PAY-430</div></div></div>
    <div class="ship"><div class="ship-box">&#10003;</div><div><div class="ship-t">Funnel instrumentation</div><div class="ship-d">Step-level events wired into analytics.</div><div class="ship-tag">PAY-433</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">What shipped</span></div>
</div>`,
    }),
    s({
      id: 'sr-div-demo',
      name: 'Section · Demo',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 / Demo</div>
  <div class="divider-title reveal">Let's see it<br/>working.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sr-feature-a',
      name: 'Feature A — express checkout',
      transition: 'slide',
      bodyHtml: `<div class="pad top" style="--pad-y:96px">
  <div class="kicker reveal">Demo · Feature A</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px;--headline-size:62px">Express checkout, in one step.</h2>
  <div class="two-col reveal" style="--col-gap:70px;align-items:center">
    <div class="frame">
      <div class="frame-bar"><span class="frame-dots"><i></i><i></i><i></i></span><span class="frame-url">app.northwind.store/checkout/express</span></div>
      <img class="frame-shot" src="${PRODUCT_IMG}" alt="">
    </div>
    <ul class="bullets" style="--gap:22px">
      <li class="bullet"><span>Returning buyers skip <b>five form fields</b> entirely.</span></li>
      <li class="bullet"><span>Default card and address are <b>pre-selected</b> and editable inline.</span></li>
      <li class="bullet"><span>Tax and shipping resolve <b>before</b> the confirm tap.</span></li>
      <li class="bullet"><span>Median time-to-purchase dropped to <b>22 seconds</b>.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Demo · Feature A</span></div>
</div>`,
    }),
    s({
      id: 'sr-feature-b',
      name: 'Feature B — saved methods',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Demo · Feature B</div>
    <h2 class="headline reveal" style="--headline-size:62px">Saved payment methods.</h2>
    <p class="lead reveal">Cards are tokenized at first use, stored against the account, and surfaced as a one-tap default — with full add, remove, and re-order support.</p>
    <div class="callout reveal" style="margin-top:18px">
      <div class="callout-k">Under the hood</div>
      <p class="body" style="max-width:none">No raw PAN ever touches our servers — tokens are vaulted with the processor, scoped per merchant.</p>
    </div>
  </div>
  <figure class="media reveal"><img src="${PRODUCT_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'sr-impact',
      name: 'Impact metrics',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Early impact · first 72 hours at 25%</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">The flag is already moving the funnel.</h2>
  <div class="cols-4 reveal">
    <div class="dtile"><div class="dtile-num">+18%</div><div class="dtile-label">Checkout completion</div><span class="chip up">vs control</span></div>
    <div class="dtile"><div class="dtile-num">22s</div><div class="dtile-label">Median time to purchase</div><span class="chip up">41s faster</span></div>
    <div class="dtile"><div class="dtile-num">&minus;31%</div><div class="dtile-label">Form-field drop-off</div><span class="chip up">improved</span></div>
    <div class="dtile"><div class="dtile-num">0.4%</div><div class="dtile-label">Payment error rate</div><span class="chip flat">no change</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Impact</span></div>
</div>`,
    }),
    s({
      id: 'sr-div-numbers',
      name: 'Section · The numbers',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 / The numbers</div>
  <div class="divider-title reveal">How the<br/>sprint ran.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sr-burndown',
      name: 'Burndown & velocity',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Burndown</div>
      <h2 class="headline" style="margin-top:8px">Remaining points, day by day.</h2>
      <div class="callout" style="margin-top:26px">
        <div class="callout-k">Read</div>
        <p class="body" style="max-width:none">A mid-sprint stall on day 6 (a flaky payment sandbox) was cleared, and we still burned down clean by day 10.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="38"></div><div class="bar-label">D1</div></div>
      <div class="bar" style="--h:84%"><div class="bar-fill" data-val="32"></div><div class="bar-label">D2</div></div>
      <div class="bar" style="--h:71%"><div class="bar-fill" data-val="27"></div><div class="bar-label">D4</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="25"></div><div class="bar-label">D6</div></div>
      <div class="bar" style="--h:42%"><div class="bar-fill" data-val="16"></div><div class="bar-label">D8</div></div>
      <div class="bar" style="--h:5%"><div class="bar-fill" data-val="2"></div><div class="bar-label">D10</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Burndown</span></div>
</div>`,
    }),
    s({
      id: 'sr-velocity',
      name: 'Velocity trend',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Velocity</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A steady, predictable team.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">36</div><div class="stat-label">Points completed this sprint</div></div>
    <div class="stat"><div class="stat-num">35</div><div class="stat-label">Three-sprint rolling average</div></div>
    <div class="stat"><div class="stat-num">95%</div><div class="stat-label">Commitment reliability</div></div>
    <div class="stat"><div class="stat-num">1</div><div class="stat-label">Story carried to next sprint</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Velocity</span></div>
</div>`,
    }),
    s({
      id: 'sr-quality',
      name: 'Quality',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Quality scorecard</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">Shipped clean.</h2>
  <table class="table reveal">
    <thead><tr><th>Metric</th><th class="num">Last sprint</th><th class="num">This sprint</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Bugs opened</td><td class="num">14</td><td class="num">9</td><td><span class="status on">Down</span></td></tr>
      <tr><td>Bugs closed</td><td class="num">11</td><td class="num">15</td><td><span class="status on">Ahead</span></td></tr>
      <tr><td>Escaped to production</td><td class="num">2</td><td class="num">1</td><td><span class="status on">Down</span></td></tr>
      <tr><td>Test coverage</td><td class="num">79%</td><td class="num">84%</td><td><span class="status on">Up</span></td></tr>
      <tr class="row-em"><td>P1 incidents</td><td class="num">1</td><td class="num">0</td><td><span class="status on">Clean</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Quality</span></div>
</div>`,
    }),
    s({
      id: 'sr-carryover',
      name: 'Carry-over & why',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Carry-over</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">One story slipped — here's the chain.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="card"><div class="card-num">PAY-441</div><div class="card-title" style="font-size:34px">Guest-to-account merge</div><div class="card-body">Carried to Sprint 25.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">Why</div><div class="card-title" style="font-size:34px">Sandbox outage</div><div class="card-body">Processor test env down ~1.5 days mid-sprint.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">Fix</div><div class="card-title" style="font-size:34px">Local stub vault</div><div class="card-body">Removes the external dependency for tests.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Carry-over</span></div>
</div>`,
    }),
    s({
      id: 'sr-div-next',
      name: 'Section · Next',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 / Next</div>
  <div class="divider-title reveal">Where we<br/>go next.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sr-next-plan',
      name: 'Next sprint plan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Sprint 25 · proposed plan</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Ramp the flag, finish the merge.</h2>
  <ol class="steps reveal" style="--gap:22px">
    <li class="step"><span>Ramp express checkout to <b>100%</b> behind a staged rollout.</span></li>
    <li class="step"><span>Ship <b>guest-to-account merge</b> (PAY-441) on the new local vault stub.</span></li>
    <li class="step"><span>Add <b>wallet payments</b> — Apple Pay and Google Pay in the express path.</span></li>
    <li class="step"><span>Close the funnel with a <b>post-purchase upsell</b> experiment.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Sprint 25 plan</span></div>
</div>`,
    }),
    s({
      id: 'sr-risks',
      name: 'Risks & blockers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; blockers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What could slow Sprint 25.</h2>
  <div class="cols-3 reveal">
    <div class="risk"><div class="risk-k">Blocker</div><div class="risk-t">Processor SLA review</div><div class="risk-d">Wallet payments need a contract sign-off before integration — legal is the long pole.</div></div>
    <div class="risk warn"><div class="risk-k">Watch</div><div class="risk-t">Flag-ramp load</div><div class="risk-d">100% express traffic is untested at peak — load test scheduled before ramp.</div></div>
    <div class="risk warn"><div class="risk-k">Watch</div><div class="risk-t">Designer split</div><div class="risk-d">Our designer is 50% on the mobile redesign; upsell specs may land late.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'sr-quote',
      name: 'Team quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"Best demo in months. We cut five fields and watched completion jump the same afternoon — that's the dream loop."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nadar</span><span class="cite-role">Engineering Lead, Atlas Squad</span></div>
  <div class="runner reveal"><span class="runner-brand">Atlas Squad</span><span class="runner-label">Team voice</span></div>
</div>`,
    }),
    s({
      id: 'sr-close',
      name: 'Closing',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Sprint 24 · done</div>
    <h2 class="display reveal" style="--display-size:118px">Thanks — ship<br/>questions our way.</h2>
    <p class="lead reveal">Retro Thursday 2pm · #atlas-squad · demo recording in the channel</p>
  </div>
</div>`,
    }),
  ],
}
