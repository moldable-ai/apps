import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/company-overview-cover.jpg'
const FIG_IMG = 'assets/company-overview-fig.jpg'

export const companyOverview: Template = {
  id: 'company-overview',
  categories: ['Company'],
  name: 'Company Overview',
  tagline: 'Confident modern company profile',
  audiences: ['company', 'corporate', 'investor', 'recruiting'],
  description:
    'A confident "who we are" company profile in ink-navy with one coral accent. A full-bleed brand statement, oversized key numbers, what-we-do cards, a markets footprint band, and a leadership row carry a complete company story from mission to where you are going.',
  fonts: {
    display: 'Bricolage Grotesque',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0b1f3a',
    '--muted': '#5a6b82',
    '--accent': '#ff6b5e',
    '--accent-2': '#ff6b5e',
    '--display': "'Bricolage Grotesque', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '132px',
    '--headline-size': '80px',
    '--lead-size': '38px',
    '--subhead-size': '48px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#dde3ec',
    '--card-shadow': '0 20px 48px -30px rgba(11,31,58,0.28)',
    '--radius': '18px',
    '--stat-size': '108px',
    '--metric-size': '128px',
    '--th-border': '#0b1f3a',
    '--table-border': '#dde3ec',
    '--track': '#e7ebf2',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -45px rgba(11,31,58,0.42)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(11,31,58,0.18) 0%, rgba(11,31,58,0.55) 52%, rgba(11,31,58,0.92) 100%)',
    '--pos': '#1f9d6b',
    '--neg': '#ff6b5e',
  },
  stageBg: '#eef1f6',
  assets: ['company-overview-cover.jpg', 'company-overview-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }

/* Full-bleed navy brand statement (mission) */
.statement { position: absolute; inset: 0; background: var(--text); display: flex; flex-direction: column; justify-content: center; padding: var(--pad-y, 110px) var(--pad-x, 130px); }
.statement .kicker { color: var(--accent); }
.statement-line { font-family: var(--display); font-weight: 700; font-size: 112px; line-height: 1.04; letter-spacing: -0.025em; color: #ffffff; text-wrap: balance; max-width: 22ch; }
.statement-line em { font-style: normal; color: var(--accent); }
.statement-rule { width: 120px; height: 6px; border-radius: 3px; background: var(--accent); margin-bottom: 38px; }

/* Section divider — quiet coral rule on white */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 156px; line-height: 0.94; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 132px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 16px; }

/* Oversized key numbers — impact band */
.bignums { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 0; }
.bignum { padding: 0 50px; }
.bignum:first-child { padding-left: 0; }
.bignum + .bignum { border-left: 1px solid var(--card-border); }
.bignum-val { font-family: var(--display); font-weight: 700; font-size: 118px; line-height: 0.96; letter-spacing: -0.03em; color: var(--accent); font-variant-numeric: tabular-nums; }
.bignum-label { font-family: var(--body); font-size: 25px; line-height: 1.34; color: var(--muted); margin-top: 18px; }

/* "What we do" cards — coral corner-tab signature */
.dowhat { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.do-card { position: relative; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 44px 38px 40px; box-shadow: var(--card-shadow); overflow: hidden; }
.do-card::before { content: ''; position: absolute; top: 0; left: 0; width: 64px; height: 6px; background: var(--accent); }
.do-num { font-family: var(--body); font-weight: 700; font-size: 22px; letter-spacing: 0.06em; color: var(--accent); }
.do-t { font-family: var(--display); font-weight: 600; font-size: 36px; line-height: 1.06; color: var(--text); margin-top: 22px; }
.do-d { font-family: var(--body); font-size: 24px; line-height: 1.42; color: var(--muted); margin-top: 12px; }

/* Footprint / markets band — navy stat strip */
.footprint { background: var(--text); border-radius: 20px; display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); padding: 56px 44px; }
.foot-cell { padding: 0 44px; }
.foot-cell:first-child { padding-left: 0; }
.foot-cell + .foot-cell { border-left: 1px solid rgba(255,255,255,0.16); }
.foot-num { font-family: var(--display); font-weight: 700; font-size: 80px; line-height: 1; letter-spacing: -0.025em; color: #ffffff; font-variant-numeric: tabular-nums; }
.foot-num em { font-style: normal; color: var(--accent); }
.foot-label { font-family: var(--body); font-size: 24px; line-height: 1.32; color: #aebacb; margin-top: 14px; }

/* Leadership row — portrait-initial people cards */
.team { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 28px; }
.person { display: flex; flex-direction: column; gap: 8px; }
.person-av { width: 100%; aspect-ratio: 1 / 1; border-radius: 18px; display: grid; place-items: center; background: #f1f4f9; border: 1px solid var(--card-border); font-family: var(--display); font-weight: 700; font-size: 64px; color: var(--accent); letter-spacing: -0.02em; }
.person-name { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.04; color: var(--text); margin-top: 18px; }
.person-role { font-family: var(--body); font-size: 23px; line-height: 1.32; color: var(--muted); }

/* Founder pull-quote callout (used inline on problem slide) */
.callout { border-left: 5px solid var(--accent); background: rgba(255,107,94,0.07); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }

/* Region legend rows beside the markets table */
.legend { display: flex; flex-direction: column; gap: 18px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 28px; color: var(--text); }
.legend-dot { width: 16px; height: 16px; border-radius: 5px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); }

@media (max-width: 640px) {
  html.deck-can-flow .statement-line { font-size: min(38px, 11vw) !important; line-height: 1.06 !important; max-width: 100% !important; }
  html.deck-can-flow .divider-title { font-size: min(53px, 15vw) !important; line-height: 0.98 !important; }
  html.deck-can-flow .bignums { grid-template-columns: 1fr 1fr !important; gap: 28px 24px; }
  html.deck-can-flow .bignum { padding: 0 !important; }
  html.deck-can-flow .bignum + .bignum { border-left: none !important; }
  html.deck-can-flow .bignum-val { font-size: min(54px, 15vw) !important; }
  html.deck-can-flow .dowhat { grid-template-columns: 1fr !important; gap: 20px; }
  html.deck-can-flow .do-card { padding: 28px 22px 26px !important; }
  html.deck-can-flow .do-t { font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .do-d { font-size: 18px !important; }
  html.deck-can-flow .footprint { grid-template-columns: 1fr 1fr !important; gap: 28px 20px; padding: 32px 24px !important; }
  html.deck-can-flow .foot-cell { padding: 0 !important; }
  html.deck-can-flow .foot-cell + .foot-cell { border-left: none !important; }
  html.deck-can-flow .foot-num { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .team { grid-template-columns: 1fr 1fr !important; gap: 24px 18px; }
  html.deck-can-flow .person-av { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .person-name { font-size: min(24px, 7vw) !important; }
  html.deck-can-flow .callout { padding: 22px 22px !important; }
}`,
  notes:
    'A complete "who we are" company overview: Bricolage Grotesque display + Inter body, ink-navy #0b1f3a on white, ONE coral (#ff6b5e) accent, generous whitespace, no gradients. Open on the architectural full-bleed cover (assets/company-overview-cover.jpg) and use the office figure (assets/company-overview-fig.jpg) for the "who we serve" split. Signature pieces: .statement full-bleed navy mission slide, .bignum oversized key-number band for impact, .dowhat coral corner-tab cards for "what we do", the navy .footprint band plus a markets .table for where you operate, and the .team leadership row of portrait-initial cards. Use the shared .flow for "how it works", .bars for traction, .timeline for "where we are going", and a centered .quote for the founder. Break acts with the clean coral .divider. Confident and modern, never flashy — let the numbers and one architectural image carry it; keep figures tabular.',
  sampleSlides: [
    s({
      id: 'co-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Company Overview · 2026</div>
    <h1 class="display reveal" style="--display-size:150px;margin-top:8px">We build the<br/>infrastructure of<br/>modern commerce.</h1>
    <p class="lead reveal">Northbeam — the operating layer for businesses that move.</p>
  </div>
</div>`,
    }),
    s({
      id: 'co-mission',
      name: 'Mission statement',
      transition: 'fade',
      bodyHtml: `<div class="statement">
  <div class="statement-rule reveal"></div>
  <div class="kicker reveal" style="margin-bottom:30px">Our mission</div>
  <div class="statement-line reveal">To make running a business as <em>simple as running a search.</em></div>
</div>`,
    }),
    s({
      id: 'co-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What's inside</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Who we are, in six minutes.</h2>
  <div class="cols-2 reveal" style="gap:30px">
    <ol class="steps" style="--gap:22px">
      <li class="step"><span>Why we exist — the problem we set out to solve.</span></li>
      <li class="step"><span>What we do, and how it works.</span></li>
      <li class="step"><span>Our impact, by the numbers.</span></li>
    </ol>
    <ol class="steps" style="--gap:22px" start="4">
      <li class="step"><span>Who we serve and where we operate.</span></li>
      <li class="step"><span>The team and the values behind it.</span></li>
      <li class="step"><span>Where we are going next.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'co-div1',
      name: 'Section · Why we exist',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Why we exist</div>
  <div class="divider-title reveal">The problem we<br/>set out to solve.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'co-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why we exist</div>
      <h2 class="headline" style="margin-top:8px">Running a business still means running a dozen tools.</h2>
      <div class="callout" style="margin-top:28px">
        <div class="callout-k">The cost</div>
        <p class="body" style="max-width:none">The average operator loses <b>one day a week</b> moving data between systems that were never meant to talk.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Orders, payments, and inventory live in <b>separate silos</b>.</span></li>
      <li class="bullet"><span>Every new market means <b>another stack</b> to stitch together.</span></li>
      <li class="bullet"><span>Owners fly blind between <b>month-end reports</b>.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'co-div2',
      name: 'Section · What we do',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — What we do</div>
  <div class="divider-title reveal">One platform.<br/>Every operation.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'co-dowhat',
      name: 'What we do',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we do</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">The operating layer for modern commerce.</h2>
  <div class="dowhat reveal" style="--cols:3">
    <div class="do-card"><div class="do-num">01</div><div class="do-t">Unify operations</div><div class="do-d">Orders, payments, inventory, and customers in one system of record.</div></div>
    <div class="do-card"><div class="do-num">02</div><div class="do-t">Automate the busywork</div><div class="do-d">Reconciliation, restocking, and reporting run themselves in the background.</div></div>
    <div class="do-card"><div class="do-num">03</div><div class="do-t">Decide in real time</div><div class="do-d">Live margins, cash, and demand — so you act on today, not last month.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">What we do</span></div>
</div>`,
    }),
    s({
      id: 'co-how',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How it works</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:40px">From signup to running on Northbeam.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="do-card" style="box-shadow:none"><div class="do-num">Connect</div><div class="do-t" style="font-size:34px">Plug in your channels</div><div class="do-d">Storefronts, marketplaces, and bank in minutes.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="do-card" style="box-shadow:none"><div class="do-num">Unify</div><div class="do-t" style="font-size:34px">One source of truth</div><div class="do-d">We model your operation into a single live ledger.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="do-card" style="box-shadow:none"><div class="do-num">Run</div><div class="do-t" style="font-size:34px">Operate from anywhere</div><div class="do-d">Automations and dashboards run the day-to-day.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'co-div3',
      name: 'Section · Our impact',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Our impact</div>
  <div class="divider-title reveal">The numbers<br/>behind the work.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'co-impact',
      name: 'Impact by the numbers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Impact by the numbers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:48px">What we've built so far.</h2>
  <div class="bignums reveal" style="--cols:4">
    <div class="bignum"><div class="bignum-val">38K</div><div class="bignum-label">Businesses running on Northbeam</div></div>
    <div class="bignum"><div class="bignum-val">$14B</div><div class="bignum-label">Commerce processed last year</div></div>
    <div class="bignum"><div class="bignum-val">99.99%</div><div class="bignum-label">Platform uptime across 2025</div></div>
    <div class="bignum"><div class="bignum-val">6 hrs</div><div class="bignum-label">Saved per operator, every week</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Impact</span></div>
</div>`,
    }),
    s({
      id: 'co-serve',
      name: 'Who we serve',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Who we serve</div>
    <h2 class="headline reveal">Built for the people who run things.</h2>
    <p class="lead reveal">From a first storefront to a fifty-location operation, Northbeam grows with the businesses that keep the world stocked, served, and shipped.</p>
    <div class="stats reveal" style="margin-top:8px">
      <div class="stat"><div class="stat-num">5</div><div class="stat-label">Industries, from retail to logistics</div></div>
      <div class="stat"><div class="stat-num">82%</div><div class="stat-label">Are small and mid-sized teams</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'co-traction',
      name: 'Traction & growth',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Traction &amp; growth</div>
      <h2 class="headline" style="margin-top:8px">Compounding, year over year.</h2>
      <p class="lead">Annual recurring revenue has more than doubled every year since launch — driven almost entirely by customers expanding.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:22%"><div class="bar-fill" data-val="$9M"></div><div class="bar-label">2022</div></div>
      <div class="bar" style="--h:40%"><div class="bar-fill" data-val="$22M"></div><div class="bar-label">2023</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="$58M"></div><div class="bar-label">2024</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="$121M"></div><div class="bar-label">2025</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Traction</span></div>
</div>`,
    }),
    s({
      id: 'co-markets',
      name: 'Where we operate',
      transition: 'slide',
      bodyHtml: `<div class="pad top" style="--pad-y:64px">
  <div class="kicker reveal">Where we operate</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">A global footprint, run locally.</h2>
  <div class="footprint reveal" style="--cols:4;margin-bottom:30px;padding:44px">
    <div class="foot-cell"><div class="foot-num">3<em>4</em></div><div class="foot-label">Countries served</div></div>
    <div class="foot-cell"><div class="foot-num">6</div><div class="foot-label">Regional offices</div></div>
    <div class="foot-cell"><div class="foot-num">1<em>2</em></div><div class="foot-label">Local currencies</div></div>
    <div class="foot-cell"><div class="foot-num">24<em>/7</em></div><div class="foot-label">Follow-the-sun support</div></div>
  </div>
  <div class="two-col reveal" style="--col-gap:80px;align-items:center">
    <table class="table" style="font-size:27px">
      <thead><tr><th>Region</th><th class="num">Customers</th><th class="num">Volume</th></tr></thead>
      <tbody>
        <tr><td>North America</td><td class="num">21,400</td><td class="num">$7.8B</td></tr>
        <tr><td>Europe</td><td class="num">9,600</td><td class="num">$3.6B</td></tr>
        <tr><td>Asia-Pacific</td><td class="num">5,100</td><td class="num">$1.9B</td></tr>
        <tr class="row-em"><td>Latin America</td><td class="num">1,900</td><td class="num">$0.7B</td></tr>
      </tbody>
    </table>
    <div class="legend">
      <div class="legend-row"><span class="legend-dot" style="background:#0b1f3a"></span>North America<span class="v">56%</span></div>
      <div class="legend-row"><span class="legend-dot" style="background:#ff6b5e"></span>Europe<span class="v">25%</span></div>
      <div class="legend-row"><span class="legend-dot" style="background:#5a6b82"></span>Asia-Pacific<span class="v">14%</span></div>
      <div class="legend-row"><span class="legend-dot" style="background:#aebacb"></span>Latin America<span class="v">5%</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Footprint</span></div>
</div>`,
    }),
    s({
      id: 'co-team',
      name: 'Team & leadership',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Team &amp; leadership</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The people steering the work.</h2>
  <div class="team reveal" style="--cols:4">
    <div class="person"><div class="person-av">MR</div><div class="person-name">Maya Reyes</div><div class="person-role">Co-founder &amp; CEO</div></div>
    <div class="person"><div class="person-av">DO</div><div class="person-name">Dele Okonkwo</div><div class="person-role">Co-founder &amp; CTO</div></div>
    <div class="person"><div class="person-av">LC</div><div class="person-name">Lena Chu</div><div class="person-role">Chief Product Officer</div></div>
    <div class="person"><div class="person-av">AS</div><div class="person-name">Arman Soto</div><div class="person-role">Chief Operating Officer</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Leadership</span></div>
</div>`,
    }),
    s({
      id: 'co-values',
      name: 'Our values',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What we stand for</div>
      <h2 class="headline" style="margin-top:8px">Four values, no compromises.</h2>
      <p class="lead">They are not posters on a wall — they decide what we build and who we hire.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span><b>Operators first.</b> Every decision starts with the person running the business.</span></li>
      <li class="check"><span><b>Earn the trust.</b> We are custodians of money and data — we act like it.</span></li>
      <li class="check"><span><b>Ship the simple thing.</b> Power should feel effortless, never busy.</span></li>
      <li class="check"><span><b>Default to clarity.</b> Plain numbers, plain words, no surprises.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Values</span></div>
</div>`,
    }),
    s({
      id: 'co-future',
      name: 'Where we are going',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where we are going</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">The next three years.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">2026</div><div class="tl-what"><b>Open the platform</b> — a developer API and app marketplace for every workflow.</div></div>
    <div class="tl-row"><div class="tl-when">2027</div><div class="tl-what"><b>Embedded finance</b> — instant payouts, lending, and capital built into the ledger.</div></div>
    <div class="tl-row"><div class="tl-when">2028</div><div class="tl-what"><b>Autonomous operations</b> — agents that restock, reconcile, and forecast on their own.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'co-quote',
      name: 'Founder quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:80px">"We started Northbeam because the people who keep the economy running deserved tools as good as the ones they sell."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Maya Reyes</span><span class="cite-role">Co-founder &amp; CEO</span></div>
  <div class="runner reveal"><span class="runner-brand">Northbeam</span><span class="runner-label">Founder note</span></div>
</div>`,
    }),
    s({
      id: 'co-close',
      name: 'Contact & close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Let's build what's next</div>
    <h2 class="display reveal" style="--display-size:118px">Come run<br/>with us.</h2>
    <p class="lead reveal">hello@northbeam.co · northbeam.co · careers.northbeam.co</p>
  </div>
</div>`,
    }),
  ],
}
