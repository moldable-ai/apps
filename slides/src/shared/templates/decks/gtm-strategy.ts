import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/gtm-strategy-cover.jpg'
const FIG_IMG = 'assets/gtm-strategy-fig.jpg'

export const gtmStrategy: Template = {
  id: 'gtm-strategy',
  categories: ['Marketing', 'Strategy'],
  name: 'GTM Strategy',
  tagline: 'A sharp, modern go-to-market plan',
  audiences: ['founder', 'marketing', 'product', 'executive'],
  description:
    'A confident go-to-market plan in deep purple with a single electric-lime accent. Segment matrix, ICP cards, a positioning box, a stacked-funnel motion diagram, channel economics, and a launch timeline carry a full opportunity-to-execution story you tailor to your launch.',
  fonts: {
    display: 'Sora',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#16121f',
    '--muted': '#6b647a',
    '--accent': '#5b21b6',
    '--accent-2': '#5b21b6',
    '--lime': '#a3e635',
    '--display': "'Sora', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '126px',
    '--headline-size': '76px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e7e2f0',
    '--card-shadow': '0 20px 50px -30px rgba(91,33,182,0.30)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#16121f',
    '--table-border': '#ece8f4',
    '--track': '#ece8f4',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--bar-fill': '#5b21b6',
    '--media-shadow': '0 50px 110px -45px rgba(45,21,90,0.5)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(34,12,72,0.18) 0%, rgba(34,12,72,0.50) 52%, rgba(28,9,62,0.90) 100%)',
    '--pos': '#3f9142',
    '--neg': '#c0392b',
  },
  stageBg: '#f4f1fa',
  assets: ['gtm-strategy-cover.jpg', 'gtm-strategy-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }
.bullet::before { background: var(--lime); border-radius: 4px; }

/* Lime is the spark — a deliberate second accent used sparingly */
.lime { color: var(--lime); }
.lime-hl { background: var(--lime); color: #1f2a06; border-radius: 8px; padding: 0 14px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
.lime-bar { width: 96px; height: 6px; border-radius: 3px; background: var(--lime); }

/* Section divider — full purple field, lime accents */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; background: var(--accent); }
.divider .divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.24em; font-size: 22px; color: var(--lime); text-transform: uppercase; }
.divider .divider-title { font-family: var(--display); font-weight: 800; font-size: 144px; line-height: 0.94; letter-spacing: -0.03em; color: #fff; }
.divider .divider-sub { font-family: var(--body); font-size: 34px; line-height: 1.3; color: rgba(255,255,255,0.78); max-width: 24ch; margin-top: 6px; }
.divider .lime-bar { margin-top: 14px; }
.divider .quote { color: #fff; }
.divider .cite-name, .divider .cite-role { color: rgba(255,255,255,0.86); }
.divider .cite-dot { background: var(--lime); }

/* Stacked funnel — the GTM motion, top wide to bottom narrow */
.funnel { display: flex; flex-direction: column; gap: 14px; }
.fn-row { display: grid; grid-template-columns: 1fr 220px; align-items: center; gap: 30px; }
.fn-bar { height: 92px; border-radius: 14px; display: flex; flex-direction: column; justify-content: center; padding: 0 38px; color: #fff; margin: 0 auto 0 0; }
.fn-bar.s1 { width: 100%; background: #3b1276; }
.fn-bar.s2 { width: 84%; background: #4a189c; }
.fn-bar.s3 { width: 66%; background: #5b21b6; }
.fn-bar.s4 { width: 48%; background: #6d2fcf; }
.fn-bar.s5 { width: 32%; background: #16121f; }
.fn-stage { font-family: var(--display); font-weight: 700; font-size: 30px; line-height: 1; }
.fn-motion { font-family: var(--body); font-size: 21px; color: rgba(255,255,255,0.82); margin-top: 5px; }
.fn-metric { font-family: var(--display); font-weight: 700; font-size: 44px; color: var(--text); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; text-align: right; }
.fn-metric.lime-on { color: var(--accent); }

/* Segment 2x2 matrix */
.matrix { position: relative; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); gap: 22px; height: 600px; }
.qd { border: 1px solid var(--card-border); border-radius: 18px; padding: 34px 36px; display: flex; flex-direction: column; gap: 10px; background: var(--card-bg); box-shadow: var(--card-shadow); }
.qd.win { background: var(--accent); border-color: var(--accent); }
.qd.win .qd-t, .qd.win .qd-d { color: #fff; }
.qd.win .qd-tag { background: rgba(163,230,53,0.22); color: var(--lime); }
.qd.win .qd-d { color: rgba(255,255,255,0.85); }
.qd-tag { align-self: flex-start; font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 17px; color: var(--accent); background: rgba(91,33,182,0.08); border-radius: 999px; padding: 7px 16px; }
.qd-t { font-family: var(--display); font-weight: 700; font-size: 38px; line-height: 1.04; color: var(--text); letter-spacing: -0.01em; }
.qd-d { font-family: var(--body); font-size: 24px; line-height: 1.36; color: var(--muted); }
.mx-axis-x { position: absolute; bottom: -50px; left: 0; right: 0; display: flex; justify-content: space-between; font-family: var(--body); font-weight: 600; font-size: 22px; color: var(--muted); }
.mx-axis-y { position: absolute; left: -56px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; align-items: center; }
.mx-axis-y span { writing-mode: vertical-rl; transform: rotate(180deg); font-family: var(--body); font-weight: 600; font-size: 22px; color: var(--muted); }

/* Channel cards — accent left-rule signature */
.ch { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 30px 32px; box-shadow: var(--card-shadow); border-left: 5px solid var(--accent); display: flex; flex-direction: column; gap: 12px; }
.ch-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.ch-t { font-family: var(--display); font-weight: 700; font-size: 31px; color: var(--text); letter-spacing: -0.01em; }
.ch-tier { font-family: var(--body); font-weight: 700; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); background: rgba(91,33,182,0.08); border-radius: 999px; padding: 6px 14px; }
.ch-tier.now { background: var(--lime); color: #1f2a06; }
.ch-d { font-family: var(--body); font-size: 23px; line-height: 1.38; color: var(--muted); }

/* Positioning statement box */
.posbox { border: 2px solid var(--accent); border-radius: 22px; padding: 60px 70px; background: rgba(91,33,182,0.035); position: relative; }
.posbox::before { content: 'POSITIONING'; position: absolute; top: -16px; left: 56px; background: var(--bg); padding: 0 16px; font-family: var(--body); font-weight: 700; letter-spacing: 0.2em; font-size: 20px; color: var(--accent); }
.pos-line { font-family: var(--display); font-weight: 600; font-size: 48px; line-height: 1.3; letter-spacing: -0.01em; color: var(--text); text-wrap: balance; }
.pos-line .fill { color: var(--accent); font-weight: 800; }
.pos-line .fill.on-lime { color: #1f2a06; background: var(--lime); border-radius: 6px; padding: 0 10px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }

/* Wedge callout */
.wedge { display: grid; grid-template-columns: auto 1fr; gap: 30px; align-items: center; border-left: 6px solid var(--lime); background: rgba(91,33,182,0.04); border-radius: 0 16px 16px 0; padding: 34px 44px; }
.wedge-mark { font-family: var(--display); font-weight: 800; font-size: 60px; color: var(--accent); line-height: 1; letter-spacing: -0.03em; }

/* ICP cards */
.icp { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 36px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 14px; }
.icp-ic { width: 56px; height: 56px; border-radius: 14px; background: rgba(91,33,182,0.1); display: grid; place-items: center; color: var(--accent); font-family: var(--display); font-weight: 800; font-size: 24px; }
.icp-t { font-family: var(--display); font-weight: 700; font-size: 32px; color: var(--text); letter-spacing: -0.01em; }
.icp-d { font-family: var(--body); font-size: 23px; line-height: 1.4; color: var(--muted); }
.icp-trait { font-family: var(--body); font-size: 21px; color: var(--accent); font-weight: 600; display: flex; align-items: center; gap: 10px; margin-top: auto; }
.icp-trait::before { content: ''; width: 9px; height: 9px; border-radius: 2px; background: var(--lime); flex: 0 0 auto; }

/* Risk callouts */
.risk { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 30px 34px; box-shadow: var(--card-shadow); }
.risk-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 18px; color: var(--accent); margin-bottom: 10px; }
.risk-t { font-family: var(--display); font-weight: 700; font-size: 30px; color: var(--text); line-height: 1.06; }
.risk-d { font-family: var(--body); font-size: 22px; line-height: 1.4; color: var(--muted); margin-top: 8px; }
.risk-d b { color: var(--text); }`,
  notes:
    'A complete go-to-market plan: Sora display + Inter body, ink #16121f on white, deep-purple #5b21b6 primary with electric-lime #a3e635 used only as a spark (never a wash). Open on the abstract purple-and-lime trajectory full-bleed (assets/gtm-strategy-cover.jpg); use the market-flow figure (assets/gtm-strategy-fig.jpg) for the wedge split. Break acts with the full-purple .divider (lime num + lime-bar) — one divider carries a pull-quote. Signature pieces: .funnel stacked-funnel for the GTM motion, .matrix 2x2 for segment prioritization (highlight the winning quadrant with .qd.win), .ch channel cards with .ch-tier pills, .posbox positioning statement box (wrap fill-ins in .fill / .fill.on-lime), .wedge for the unfair advantage, .icp cards for the ideal customer profile, .risk callouts for risks. Use .bars for channel economics, .donut + .stats for goals, .table for pricing, .timeline for launch, .steps for the first 90 days. Confident and strategic, restrained color, generous whitespace.',
  sampleSlides: [
    s({
      id: 'gtm-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:var(--lime)">Go-to-Market Plan · Helio Flow · FY26 Launch</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:10px">Win the<br/>first move.</h1>
    <p class="lead reveal">How we take the workflow-automation market — segment, motion, and the first ninety days.</p>
  </div>
</div>`,
    }),
    s({
      id: 'gtm-opportunity',
      name: 'The opportunity',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">The opportunity</div>
  <h2 class="display reveal" style="--display-size:86px;max-width:19ch;margin-top:8px">Mid-market teams automate by hand. <span class="lime-hl">We give them the first hour back.</span></h2>
  <p class="lead reveal" style="max-width:48ch;margin-top:12px">A single wedge — onboarding automation for 50–500 person companies — opens a $14B category before incumbents move down-market.</p>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Opportunity</span></div>
</div>`,
    }),
    s({
      id: 'gtm-market',
      name: 'Market & timing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Market &amp; timing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Big, growing, and ready now.</h2>
  <div class="stats reveal" style="margin-bottom:44px">
    <div class="stat"><div class="stat-num">$14B</div><div class="stat-label">Serviceable market by 2028, growing 22% a year</div></div>
    <div class="stat"><div class="stat-num">68%</div><div class="stat-label">Of mid-market teams still automate workflows manually</div></div>
    <div class="stat"><div class="stat-num">18 mo</div><div class="stat-label">Window before incumbents ship a mid-market tier</div></div>
  </div>
  <div class="wedge reveal">
    <div class="wedge-mark">Now</div>
    <p class="body" style="max-width:none">Budgets are shifting from headcount to tooling, and buyers want time-to-value in days. <b>The timing has never been better.</b></p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Market &amp; timing</span></div>
</div>`,
    }),
    s({
      id: 'gtm-div1',
      name: 'Section · Who & what',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Who &amp; what</div>
  <div class="divider-title reveal">Who we serve,<br/>and why us.</div>
  <div class="divider-sub reveal">Segments, the ideal customer, our position, and the wedge that gets us in.</div>
  <div class="lime-bar reveal"></div>
</div>`,
    }),
    s({
      id: 'gtm-segments',
      name: 'Target segments',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Target segments</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Where to play first.</h2>
  <div class="matrix reveal" style="margin-left:56px">
    <div class="qd"><div class="qd-tag">Watch</div><div class="qd-t">Enterprise IT</div><div class="qd-d">High value, but long cycles and heavy security review. Revisit post-Series A.</div></div>
    <div class="qd win"><div class="qd-tag">Beachhead</div><div class="qd-t">Mid-market ops teams</div><div class="qd-d">Acute pain, fast to buy, and underserved today. This is where we win.</div></div>
    <div class="qd"><div class="qd-tag">Skip</div><div class="qd-t">Solo &amp; freelancers</div><div class="qd-d">Willing but low value and high churn. Not worth the motion yet.</div></div>
    <div class="qd"><div class="qd-tag">Expand</div><div class="qd-t">SMB cross-team</div><div class="qd-d">Good economics, moderate urgency. Land via product-led expansion.</div></div>
    <div class="mx-axis-x"><span>Lower urgency</span><span>Higher urgency</span></div>
    <div class="mx-axis-y"><span>Higher value</span><span>Lower value</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Segments</span></div>
</div>`,
    }),
    s({
      id: 'gtm-icp',
      name: 'Ideal customer profile',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Ideal customer profile</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Who the perfect buyer is.</h2>
  <div class="cards reveal" style="--cols:3;gap:26px">
    <div class="icp"><div class="icp-ic">CO</div><div class="icp-t">The company</div><div class="icp-d">50–500 employees, scaling fast, drowning in manual handoffs across tools.</div><div class="icp-trait">Series A–C, ops-led</div></div>
    <div class="icp"><div class="icp-ic">BY</div><div class="icp-t">The buyer</div><div class="icp-d">A Head of Ops or RevOps who owns process and feels every dropped task.</div><div class="icp-trait">Budget owner, hands-on</div></div>
    <div class="icp"><div class="icp-ic">TR</div><div class="icp-t">The trigger</div><div class="icp-d">A painful quarter of onboarding errors, or a hiring wave they can't keep up with.</div><div class="icp-trait">Bought within 30 days</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">ICP</span></div>
</div>`,
    }),
    s({
      id: 'gtm-positioning',
      name: 'Positioning statement',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal" style="margin-bottom:26px">Our positioning</div>
  <div class="posbox reveal">
    <p class="pos-line">For <span class="fill">mid-market ops teams</span> who waste hours on manual handoffs, <span class="fill on-lime">Helio Flow</span> is the workflow-automation platform that goes live in <span class="fill">a day, not a quarter</span> — unlike legacy tools that need a consultant and a roadmap.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Positioning</span></div>
</div>`,
    }),
    s({
      id: 'gtm-wedge',
      name: 'Our wedge',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Our wedge</div>
    <h2 class="headline reveal">One painful job, done in a day.</h2>
    <p class="lead reveal">We don't sell a platform — we sell employee-onboarding automation that works before lunch. That single wedge lands the account; expansion follows.</p>
    <ul class="bullets reveal" style="--gap:22px;margin-top:14px">
      <li class="bullet"><span><b>Time-to-value in hours</b>, not the months legacy tools demand.</span></li>
      <li class="bullet"><span><b>No consultant required</b> — the buyer ships it themselves.</span></li>
      <li class="bullet"><span><b>Land then expand</b> into hiring, IT, and finance workflows.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'gtm-div2',
      name: 'Section · How we win',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — How we win</div>
  <div class="divider-title reveal">The motion,<br/>the channels,<br/>the price.</div>
  <div class="divider-sub reveal">How a stranger becomes a paying, expanding customer.</div>
  <div class="lime-bar reveal"></div>
</div>`,
    }),
    s({
      id: 'gtm-funnel',
      name: 'The funnel & motion',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The funnel &amp; motion</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">From stranger to advocate.</h2>
  <div class="funnel reveal">
    <div class="fn-row"><div class="fn-bar s1"><div class="fn-stage">Aware</div><div class="fn-motion">Content, community, founder-led social</div></div><div class="fn-metric">120K / mo</div></div>
    <div class="fn-row"><div class="fn-bar s2"><div class="fn-stage">Engaged</div><div class="fn-motion">Free template gallery &amp; interactive demo</div></div><div class="fn-metric">14K / mo</div></div>
    <div class="fn-row"><div class="fn-bar s3"><div class="fn-stage">Trial</div><div class="fn-motion">Product-led self-serve workspace</div></div><div class="fn-metric">2,800 / mo</div></div>
    <div class="fn-row"><div class="fn-bar s4"><div class="fn-stage">Paid</div><div class="fn-motion">In-product upgrade + assisted close</div></div><div class="fn-metric lime-on">520 / mo</div></div>
    <div class="fn-row"><div class="fn-bar s5"><div class="fn-stage">Expand</div><div class="fn-motion">Multi-team rollout, success-led</div></div><div class="fn-metric">128% NRR</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Funnel &amp; motion</span></div>
</div>`,
    }),
    s({
      id: 'gtm-channels',
      name: 'Channel mix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Channel mix</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Where growth comes from.</h2>
  <div class="two-col reveal" style="--col-gap:70px;align-items:center;grid-template-columns:1.25fr 1fr">
    <div style="display:flex;flex-direction:column;gap:20px">
      <div class="ch"><div class="ch-head"><div class="ch-t">Product-led growth</div><span class="ch-tier now">Lead</span></div><div class="ch-d">Free templates and a self-serve trial do the first sale before sales ever calls.</div></div>
      <div class="ch"><div class="ch-head"><div class="ch-t">Content &amp; SEO</div><span class="ch-tier">Scale</span></div><div class="ch-d">Own the "how to automate X" queries our buyers already search.</div></div>
      <div class="ch"><div class="ch-head"><div class="ch-t">Partnerships</div><span class="ch-tier">Test</span></div><div class="ch-d">Co-sell with HRIS and ATS platforms that sit upstream of our wedge.</div></div>
    </div>
    <div class="bars" style="--bars-height:340px">
      <div class="bar" style="--h:90%"><div class="bar-fill" data-val="52%"></div><div class="bar-label">PLG</div></div>
      <div class="bar" style="--h:56%"><div class="bar-fill" data-val="31%"></div><div class="bar-label">Content</div></div>
      <div class="bar" style="--h:22%"><div class="bar-fill" data-val="12%"></div><div class="bar-label">Partner</div></div>
      <div class="bar" style="--h:10%"><div class="bar-fill" data-val="5%"></div><div class="bar-label">Paid</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Channels</span></div>
</div>`,
    }),
    s({
      id: 'gtm-pricing',
      name: 'Pricing & packaging',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Pricing &amp; packaging</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Land low, expand on value.</h2>
  <table class="table reveal">
    <thead><tr><th>Plan</th><th>Who it's for</th><th>Workflows</th><th class="num">Per seat / mo</th></tr></thead>
    <tbody>
      <tr><td><b>Free</b></td><td class="muted">A single team trying one automation</td><td>Up to 3</td><td class="num">$0</td></tr>
      <tr><td><b>Team</b></td><td class="muted">Ops teams running the daily motion</td><td>Up to 25</td><td class="num">$29</td></tr>
      <tr class="row-em"><td><b>Growth</b></td><td class="muted">Multi-team rollout, our beachhead plan</td><td>Unlimited</td><td class="num">$59</td></tr>
      <tr><td><b>Enterprise</b></td><td class="muted">Security, SSO, and dedicated success</td><td>Unlimited</td><td class="num">Custom</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Free is the funnel, Team converts the wedge, Growth is the expansion target. Annual billing saves two months.</p>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Pricing</span></div>
</div>`,
    }),
    s({
      id: 'gtm-div3',
      name: 'Section · Execute',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Execute</div>
  <blockquote class="quote reveal" style="--quote-size:88px;max-width:20ch">"The market rewards the team that owns one painful problem first."</blockquote>
  <div class="cite reveal" style="margin-top:36px"><span class="cite-dot"></span><span class="cite-name">Founder &amp; CEO</span><span class="cite-role">Helio Flow</span></div>
</div>`,
    }),
    s({
      id: 'gtm-launch',
      name: 'Launch plan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Launch plan</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Four moves to launch.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Month 1</div><div class="tl-what"><b>Private beta</b> — 25 design-partner ops teams, weekly feedback, case studies seeded.</div></div>
    <div class="tl-row"><div class="tl-when">Month 2</div><div class="tl-what"><b>Public template gallery</b> — open the PLG top of funnel, launch the content engine.</div></div>
    <div class="tl-row"><div class="tl-when">Month 3</div><div class="tl-what"><b>General availability</b> — paid plans live, launch-day press and founder-led campaign.</div></div>
    <div class="tl-row"><div class="tl-when">Month 6</div><div class="tl-what"><b>Expansion motion</b> — success-led multi-team rollout and first partnership pilot.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Launch plan</span></div>
</div>`,
    }),
    s({
      id: 'gtm-goals',
      name: 'Goals & metrics',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:330px;--p:72"><div class="donut-label">72%</div></div>
      <div class="fine" style="margin-top:22px;text-align:center">Trial → paid target by month 6</div>
    </div>
    <div>
      <div class="kicker">Goals &amp; metrics</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:26px">What success looks like.</h2>
      <div class="stats" style="--gap:0">
        <div class="stat"><div class="stat-num">$2M</div><div class="stat-label">ARR by end of year one</div></div>
        <div class="stat"><div class="stat-num">128%</div><div class="stat-label">Net revenue retention</div></div>
      </div>
      <div class="stats" style="margin-top:34px">
        <div class="stat"><div class="stat-num">&lt;$900</div><div class="stat-label">Blended CAC per paid account</div></div>
        <div class="stat"><div class="stat-num">9 mo</div><div class="stat-label">CAC payback period</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Goals &amp; metrics</span></div>
</div>`,
    }),
    s({
      id: 'gtm-risks',
      name: 'Risks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Risks &amp; mitigations</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What could go wrong — and the plan.</h2>
  <div class="cards reveal" style="--cols:3;gap:26px">
    <div class="risk"><div class="risk-k">Risk · Market</div><div class="risk-t">Incumbents move down-market.</div><div class="risk-d">Mitigation: <b>own the wedge</b> and the brand before they ship a credible tier.</div></div>
    <div class="risk"><div class="risk-k">Risk · Motion</div><div class="risk-t">PLG stalls below paid.</div><div class="risk-d">Mitigation: <b>assisted-close playbook</b> ready, with in-product upgrade nudges.</div></div>
    <div class="risk"><div class="risk-k">Risk · Channel</div><div class="risk-t">Content takes time to compound.</div><div class="risk-d">Mitigation: <b>seed partnerships</b> early to diversify top-of-funnel.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">Risks</span></div>
</div>`,
    }),
    s({
      id: 'gtm-first90',
      name: 'The first 90 days',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The first 90 days</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">What we do the moment this is approved.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span><b>Days 1–15</b> — lock 25 design partners and ship the onboarding-automation wedge.</span></li>
    <li class="step"><span><b>Days 16–45</b> — stand up the template gallery and publish the first ten SEO pillars.</span></li>
    <li class="step"><span><b>Days 46–75</b> — turn on paid plans, instrument the funnel, and run the GA campaign.</span></li>
    <li class="step"><span><b>Days 76–90</b> — review CAC and trial-to-paid, then double down on the winning channel.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Helio Flow</span><span class="runner-label">First 90 days</span></div>
</div>`,
    }),
    s({
      id: 'gtm-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:var(--lime)">The ask</div>
    <h2 class="display reveal" style="--display-size:118px">Approve the<br/>first move.</h2>
    <p class="lead reveal">Greenlight the FY26 launch budget and we go live in ninety days.</p>
  </div>
</div>`,
    }),
  ],
}
