import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/sales-deck-cover.jpg'
const PRODUCT_IMG = 'assets/sales-deck-product.jpg'

export const salesDeck: Template = {
  id: 'sales-deck',
  categories: ['Sales'],
  name: 'Sales Deck',
  tagline: 'Confident, trustworthy B2B SaaS pitch',
  audiences: ['sales', 'enterprise', 'b2b', 'pitch'],
  description:
    'A crisp corporate sales deck in ink-on-white with one strong blue accent. Value-prop cards, a proof metric band, comparison and pricing tables, and a numbered process flow carry a full problem-to-close pitch you tailor to the buyer.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0f172a',
    '--muted': '#64748b',
    '--accent': '#1d4ed8',
    '--accent-2': '#1d4ed8',
    '--display': "'Space Grotesk', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '128px',
    '--headline-size': '76px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e2e8f0',
    '--card-shadow': '0 18px 44px -28px rgba(15,23,42,0.22)',
    '--radius': '16px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#0f172a',
    '--table-border': '#e2e8f0',
    '--track': '#e8edf5',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -45px rgba(15,23,42,0.4)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(8,16,40,0.10) 0%, rgba(8,16,40,0.42) 55%, rgba(8,16,40,0.86) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#eef2f8',
  assets: ['sales-deck-cover.jpg', 'sales-deck-product.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }

/* Section divider — quiet blue rule on white */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 150px; line-height: 0.96; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 128px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 14px; }

/* Value-prop cards — accent top-rule signature */
.vprop { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.vp { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 40px 36px 38px; box-shadow: var(--card-shadow); position: relative; overflow: hidden; }
.vp::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: var(--accent); }
.vp-ic { width: 60px; height: 60px; border-radius: 14px; background: rgba(29,78,216,0.1); display: grid; place-items: center; color: var(--accent); font-family: var(--display); font-weight: 700; font-size: 28px; }
.vp-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.05; color: var(--text); margin-top: 22px; }
.vp-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 12px; }

/* Proof metric band — full-width tinted strip */
.proof { background: #f4f7fc; border: 1px solid var(--card-border); border-radius: 18px; display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); padding: 52px 40px; }
.proof-cell { padding: 0 44px; }
.proof-cell + .proof-cell { border-left: 1px solid #dbe3f0; }
.proof-num { font-family: var(--display); font-weight: 700; font-size: 84px; line-height: 1; letter-spacing: -0.025em; color: var(--accent); font-variant-numeric: tabular-nums; }
.proof-label { font-family: var(--body); font-size: 24px; line-height: 1.32; color: var(--muted); margin-top: 14px; }

/* Comparison / pricing table cells */
.yes { color: var(--accent); font-weight: 700; }
.no { color: #cbd5e1; font-weight: 700; }
.col-us { background: rgba(29,78,216,0.05); }
.tier-head { font-family: var(--display); font-weight: 600; }
.tier-price { font-family: var(--display); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }

/* Numbered process flow — pill steps */
.pflow { display: flex; align-items: stretch; }
.pflow .pstep { flex: 1; }
.pcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 32px 30px; box-shadow: var(--card-shadow); height: 100%; }
.pcard-n { display: inline-grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; background: var(--accent); color: #fff; font-family: var(--display); font-weight: 700; font-size: 26px; }
.pcard-t { font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); margin-top: 20px; }
.pcard-d { font-family: var(--body); font-size: 22px; line-height: 1.38; color: var(--muted); margin-top: 8px; }

/* Muted logo strip */
.logostrip { display: flex; align-items: center; justify-content: space-between; gap: 40px; padding: 36px 48px; border: 1px solid var(--card-border); border-radius: 16px; background: #fafbfd; }
.logostrip .logo { font-family: var(--display); font-weight: 600; font-size: 36px; letter-spacing: -0.01em; color: #94a3b8; opacity: 0.9; }

/* Cost-of-status-quo callout */
.callout { border-left: 5px solid var(--accent); background: rgba(29,78,216,0.05); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }

@media (max-width: 640px) {
  html.deck-can-flow .divider { position: relative; inset: auto; padding: 64px 22px !important; min-height: 280px; }
  html.deck-can-flow .divider-title { font-size: min(51px, 14vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .divider-rule { width: 88px; }
  html.deck-can-flow .proof { grid-template-columns: 1fr !important; padding: 28px 22px !important; }
  html.deck-can-flow .proof-cell { padding: 16px 0 !important; }
  html.deck-can-flow .proof-cell + .proof-cell { border-left: 0; border-top: 1px solid #dbe3f0; }
  html.deck-can-flow .proof-num { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .vp { padding: 28px 22px 26px !important; }
  html.deck-can-flow .pflow { flex-direction: column; align-items: stretch; gap: 14px; }
  html.deck-can-flow .pflow .pstep { flex: none; width: 100%; }
  html.deck-can-flow .pflow .flow-arrow { width: 100%; height: 28px; transform: rotate(90deg); }
  html.deck-can-flow .pcard { padding: 24px 22px !important; }
  html.deck-can-flow .logostrip { flex-wrap: wrap; justify-content: center; gap: 16px 26px; padding: 24px 20px !important; }
  html.deck-can-flow .logostrip .logo { font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .callout { padding: 24px 22px !important; }
}`,
  notes:
    'A complete enterprise B2B SaaS sales pitch: Space Grotesk display + Inter body, ink #0f172a on white, ONE royal-blue (#1d4ed8) accent, generous whitespace, no gradients. Open and close on the blue glass-architecture full-bleed (assets/sales-deck-cover.jpg); use the translucent-glass dashboard (assets/sales-deck-product.jpg) for the product split. Signature pieces: .vprop value-prop cards (accent top-rule) for capabilities, the .proof tinted metric band for results, .pflow numbered pill steps for "how it works", a .logostrip for social proof, and tables for the competitive comparison (.yes/.no + .col-us) and pricing tiers (.tier-price). Use .bars for results, .timeline for implementation, .callout for the cost of the status quo. Confident and corporate, never flashy — sell the outcome, keep numbers tabular.',
  sampleSlides: [
    s({
      id: 'sd-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Enterprise Proposal · Helio Analytics × Northwind</div>
    <h1 class="display reveal" style="--display-size:138px;margin-top:8px">See every<br/>number sooner.</h1>
    <p class="lead reveal">The decision-intelligence platform for teams that can't wait for the report.</p>
  </div>
</div>`,
    }),
    s({
      id: 'sd-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll walk through</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">Twenty minutes, end to end.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>The cost of waiting on the data you already own.</span></li>
    <li class="step"><span>What Helio does — and how it works in four steps.</span></li>
    <li class="step"><span>The proof: results from teams like yours.</span></li>
    <li class="step"><span>How we compare, what it costs, and how we roll out.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'sd-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The status quo</div>
      <h2 class="headline" style="margin-top:8px">Your data is a week behind your decisions.</h2>
      <div class="callout" style="margin-top:28px">
        <div class="callout-k">The hidden cost</div>
        <p class="body" style="max-width:none">Analysts spend <b>60% of their week</b> stitching spreadsheets instead of answering questions.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Reports land <b>5–9 days</b> after the period closes.</span></li>
      <li class="bullet"><span>Every team keeps its own <b>conflicting version</b> of the truth.</span></li>
      <li class="bullet"><span>Leaders decide on <b>gut</b> because the dashboard isn't ready.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'sd-stakes',
      name: 'The stakes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What it's costing you</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The price of a slow answer.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">$2.4M</div><div class="stat-label">Annual analyst hours lost to manual reporting</div></div>
    <div class="stat"><div class="stat-num">7 days</div><div class="stat-label">Average lag from period close to insight</div></div>
    <div class="stat"><div class="stat-num">1 in 3</div><div class="stat-label">Decisions made before the data is ready</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">The stakes</span></div>
</div>`,
    }),
    s({
      id: 'sd-div1',
      name: 'Section · The solution',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The solution</div>
  <div class="divider-title reveal">Decisions at<br/>the speed of data.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sd-overview',
      name: 'Product overview',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Meet Helio</div>
    <h2 class="headline reveal">One platform from raw data to the answer.</h2>
    <p class="lead reveal">Helio connects to every source you already run, models it once, and serves live decisions to every team — no spreadsheets, no waiting.</p>
  </div>
  <figure class="media reveal"><img src="${PRODUCT_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'sd-how',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How it works</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Live in four steps.</h2>
  <div class="pflow reveal">
    <div class="pstep"><div class="pcard"><div class="pcard-n">1</div><div class="pcard-t">Connect</div><div class="pcard-d">Plug in your warehouse and apps in minutes.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="pstep"><div class="pcard"><div class="pcard-n">2</div><div class="pcard-t">Model</div><div class="pcard-d">Define metrics once in a shared semantic layer.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="pstep"><div class="pcard"><div class="pcard-n">3</div><div class="pcard-t">Explore</div><div class="pcard-d">Ask in plain language, get governed answers.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="pstep"><div class="pcard"><div class="pcard-n">4</div><div class="pcard-t">Act</div><div class="pcard-d">Alerts and dashboards land where work happens.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'sd-capabilities',
      name: 'Key capabilities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key capabilities</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Built for the whole company.</h2>
  <div class="vprop reveal" style="--cols:3">
    <div class="vp"><div class="vp-ic">SL</div><div class="vp-t">Shared semantic layer</div><div class="vp-d">One definition of revenue, retention, and margin — trusted everywhere.</div></div>
    <div class="vp"><div class="vp-ic">AI</div><div class="vp-t">Ask in plain language</div><div class="vp-d">Natural-language queries return governed, citable answers in seconds.</div></div>
    <div class="vp"><div class="vp-ic">RT</div><div class="vp-t">Real-time pipelines</div><div class="vp-d">Streaming sync keeps every dashboard current to the minute.</div></div>
    <div class="vp"><div class="vp-ic">GV</div><div class="vp-t">Enterprise governance</div><div class="vp-d">Row-level security, audit logs, and SSO out of the box.</div></div>
    <div class="vp"><div class="vp-ic">AL</div><div class="vp-t">Proactive alerts</div><div class="vp-d">Anomaly detection pushes the number that moved to the right inbox.</div></div>
    <div class="vp"><div class="vp-ic">EX</div><div class="vp-t">Embed anywhere</div><div class="vp-d">Drop live insights into the tools your teams already use.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Capabilities</span></div>
</div>`,
    }),
    s({
      id: 'sd-div2',
      name: 'Section · The proof',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — The proof</div>
  <div class="divider-title reveal">It works, and<br/>the numbers show it.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sd-results',
      name: 'Proof & results',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Time to insight</div>
      <h2 class="headline" style="margin-top:8px">From days to minutes.</h2>
      <p class="lead">Across 40+ deployments, the median reporting lag collapsed in the first quarter on Helio.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:92%"><div class="bar-fill" data-val="7.0d"></div><div class="bar-label">Before</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="2.5d"></div><div class="bar-label">Month 1</div></div>
      <div class="bar" style="--h:30%"><div class="bar-fill" data-val="9h"></div><div class="bar-label">Month 2</div></div>
      <div class="bar" style="--h:12%"><div class="bar-fill" data-val="20m"></div><div class="bar-label">Month 3</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Results</span></div>
</div>`,
    }),
    s({
      id: 'sd-proof-band',
      name: 'Customers & proof band',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Proven at scale</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Trusted by data-driven teams.</h2>
  <div class="proof reveal" style="--cols:3;margin-bottom:30px">
    <div class="proof-cell"><div class="proof-num">3.4x</div><div class="proof-label">Faster time to a trusted answer</div></div>
    <div class="proof-cell"><div class="proof-num">$1.8M</div><div class="proof-label">Average annual analyst hours recovered</div></div>
    <div class="proof-cell"><div class="proof-num">98%</div><div class="proof-label">Gross revenue retention across customers</div></div>
  </div>
  <div class="logostrip reveal">
    <span class="logo">Vantage</span><span class="logo">Meridian</span><span class="logo">Northstar</span><span class="logo">Cobalt</span><span class="logo">Lumen</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Proof</span></div>
</div>`,
    }),
    s({
      id: 'sd-quote',
      name: 'Customer quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"We retired four reporting tools and gave our analysts their week back. Helio paid for itself in a quarter."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Dana Okafor</span><span class="cite-role">VP of Data, Meridian Retail</span></div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Customer voice</span></div>
</div>`,
    }),
    s({
      id: 'sd-compare',
      name: 'Competitive comparison',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we compare</div>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>Capability</th><th class="col-us" style="text-align:center">Helio</th><th style="text-align:center">Legacy BI</th><th style="text-align:center">DIY stack</th></tr></thead>
    <tbody>
      <tr><td>Live, governed semantic layer</td><td class="col-us" style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td></tr>
      <tr><td>Natural-language queries</td><td class="col-us" style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td></tr>
      <tr><td>Real-time streaming sync</td><td class="col-us" style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td><td style="text-align:center"><span class="yes">&#10003;</span></td></tr>
      <tr><td>SSO, audit, row-level security</td><td class="col-us" style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td></tr>
      <tr><td>Live in under two weeks</td><td class="col-us" style="text-align:center"><span class="yes">&#10003;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td><td style="text-align:center"><span class="no">&#10007;</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Comparison</span></div>
</div>`,
    }),
    s({
      id: 'sd-pricing',
      name: 'Pricing tiers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Pricing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Plans that scale with you.</h2>
  <table class="table reveal">
    <thead><tr><th>Plan</th><th>Best for</th><th>Seats</th><th class="num">Annual</th></tr></thead>
    <tbody>
      <tr><td class="tier-head">Team</td><td class="muted">A single department getting started</td><td>Up to 25</td><td class="num tier-price">$24K</td></tr>
      <tr class="col-us"><td class="tier-head">Growth</td><td class="muted">Multiple teams, shared metrics</td><td>Up to 150</td><td class="num tier-price">$96K</td></tr>
      <tr><td class="tier-head">Enterprise</td><td class="muted">Company-wide, advanced governance</td><td>Unlimited</td><td class="num tier-price">Custom</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">All plans include onboarding, SSO, and a dedicated success manager. Northwind qualifies for the Growth tier.</p>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Pricing</span></div>
</div>`,
    }),
    s({
      id: 'sd-timeline',
      name: 'Implementation timeline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Implementation</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Live in two weeks, not two quarters.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 1</div><div class="tl-what"><b>Connect &amp; model</b> — link your warehouse and define the first ten metrics with our team.</div></div>
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Pilot team live</b> — first dashboards in production, hands-on enablement session.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Company rollout</b> — SSO, permissions, and embedded views across teams.</div></div>
    <div class="tl-row"><div class="tl-when">Week 8</div><div class="tl-what"><b>Value review</b> — measured impact against baseline, expansion plan agreed.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">Implementation</span></div>
</div>`,
    }),
    s({
      id: 'sd-ask',
      name: 'The ask',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Next steps</div>
      <h2 class="headline" style="margin-top:8px">Three steps to get started.</h2>
      <p class="lead">A focused two-week pilot on one team, with success criteria we agree up front.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span>Name a <b>pilot team</b> and the metrics that matter to them.</span></li>
      <li class="check"><span>Confirm <b>data access</b> and a security review window.</span></li>
      <li class="check"><span>Lock a <b>kickoff date</b> — we go live within ten business days.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Analytics</span><span class="runner-label">The ask</span></div>
</div>`,
    }),
    s({
      id: 'sd-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Let's get started</div>
    <h2 class="display reveal" style="--display-size:120px">See it on your<br/>own data.</h2>
    <p class="lead reveal">dana.reyes@helioanalytics.com · helioanalytics.com/northwind</p>
  </div>
</div>`,
    }),
  ],
}
