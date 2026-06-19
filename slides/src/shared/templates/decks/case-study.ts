import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/case-study-cover.jpg'
const FIG_IMG = 'assets/case-study-fig.jpg'

export const caseStudy: Template = {
  id: 'case-study',
  categories: ['Sales', 'Marketing'],
  name: 'Case Study',
  tagline: 'A warm, results-driven customer success story',
  audiences: ['sales', 'marketing', 'customer', 'prospect'],
  description:
    'A narrative customer success story in warm neutral and ink with one bright sky-blue accent. A big customer quote, before/after metric pairs, challenge-approach-result section labels, and a results stat band carry a complete story from the customer at a glance to the outcome — tailor the customer and the numbers.',
  fonts: {
    display: 'Instrument Serif',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f5f1ea',
    '--text': '#26211b',
    '--muted': '#8a8175',
    '--accent': '#0ea5e9',
    '--accent-2': '#0ea5e9',
    '--display': "'Instrument Serif', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '400',
    '--title-size': '150px',
    '--headline-size': '92px',
    '--section-size': '170px',
    '--lead-size': '38px',
    '--subhead-size': '52px',
    '--bullet-size': '34px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--kicker-font': "'Inter', sans-serif",
    '--card-bg': '#ffffff',
    '--card-border': '#e6dfd2',
    '--card-shadow': '0 22px 54px -34px rgba(38,33,27,0.32)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '128px',
    '--th-border': '#26211b',
    '--table-border': '#e6dfd2',
    '--rule-color': '#e0d8c8',
    '--track': '#e6dfd2',
    '--donut-hole': '#f5f1ea',
    '--bar-gap': '36px',
    '--media-radius': '20px',
    '--media-border': '1px solid #e6dfd2',
    '--media-shadow': '0 50px 110px -45px rgba(38,33,27,0.45)',
    '--quote-weight': '400',
    '--quote-size': '92px',
    '--scrim':
      'linear-gradient(180deg, rgba(28,24,18,0.12) 0%, rgba(28,24,18,0.40) 52%, rgba(28,24,18,0.86) 100%)',
    '--pos': '#15803d',
    '--neg': '#b91c1c',
  },
  stageBg: '#efe9df',
  assets: ['case-study-cover.jpg', 'case-study-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.step::before { color: var(--accent); background: #ffffff; border-color: var(--card-border); }

/* Section divider — challenge / approach / result label on warm cream */
.cs-section { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.cs-phase { font-family: var(--body); font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; font-size: 22px; color: var(--accent); display: inline-flex; align-items: center; gap: 18px; }
.cs-phase::before { content: ''; width: 56px; height: 2px; background: currentColor; opacity: 0.6; }
.cs-section-title { font-family: var(--display); font-weight: 400; font-size: 176px; line-height: 0.92; letter-spacing: -0.01em; color: var(--text); }
.cs-section-sub { font-family: var(--body); font-size: 34px; line-height: 1.4; color: var(--muted); max-width: 30ch; margin-top: 8px; }

/* Customer logo + context card */
.cust { display: flex; align-items: center; gap: 28px; padding: 30px 40px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; box-shadow: var(--card-shadow); }
.cust-mark { flex: 0 0 auto; width: 92px; height: 92px; border-radius: 20px; background: var(--accent); color: #fff; display: grid; place-items: center; font-family: var(--display); font-weight: 400; font-size: 52px; line-height: 1; }
.cust-name { font-family: var(--display); font-weight: 400; font-size: 50px; line-height: 1; color: var(--text); }
.cust-meta { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 8px; }
.fact { display: grid; grid-template-columns: 200px 1fr; gap: 30px; padding: 22px 0; border-top: 1px solid var(--card-border); align-items: baseline; }
.fact-k { font-family: var(--body); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 21px; color: var(--muted); }
.fact-v { font-family: var(--body); font-size: 31px; line-height: 1.32; color: var(--text); }
.fact-v b { font-weight: 700; }

/* Before / after metric pair */
.ba { display: grid; grid-template-columns: 1fr 64px 1fr; align-items: stretch; gap: 0; }
.ba-cell { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 40px 42px; box-shadow: var(--card-shadow); }
.ba-cell.before { background: transparent; box-shadow: none; border-style: dashed; border-color: var(--rule-color); }
.ba-tag { font-family: var(--body); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 19px; color: var(--muted); }
.ba-cell.after .ba-tag { color: var(--accent); }
.ba-num { font-family: var(--display); font-weight: 400; font-size: 104px; line-height: 1; letter-spacing: -0.01em; color: var(--text); font-variant-numeric: tabular-nums; margin: 12px 0 6px; }
.ba-cell.after .ba-num { color: var(--accent); }
.ba-desc { font-family: var(--body); font-size: 24px; line-height: 1.34; color: var(--muted); }
.ba-arrow { display: grid; place-items: center; }
.ba-arrow::after { content: ''; width: 18px; height: 18px; border-top: 3px solid var(--accent); border-right: 3px solid var(--accent); transform: rotate(45deg); }

/* Results stat band — full-width tinted strip */
.band { background: #ffffff; border: 1px solid var(--card-border); border-radius: 20px; box-shadow: var(--card-shadow); display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); padding: 52px 44px; }
.band-cell { padding: 0 42px; }
.band-cell + .band-cell { border-left: 1px solid var(--card-border); }
.band-num { font-family: var(--display); font-weight: 400; font-size: 96px; line-height: 1; letter-spacing: -0.01em; color: var(--accent); font-variant-numeric: tabular-nums; }
.band-label { font-family: var(--body); font-size: 23px; line-height: 1.34; color: var(--muted); margin-top: 14px; }

/* Big customer pull-quote mark */
.cs-quote { position: relative; }
.cs-quote::before { content: '\\201C'; position: absolute; top: -0.42em; left: -0.06em; font-family: var(--display); font-weight: 400; font-size: 240px; line-height: 1; color: var(--accent); opacity: 0.18; }
.cs-quote .quote { position: relative; }

/* Soft inset note callout */
.note { border-left: 4px solid var(--accent); background: rgba(14,165,233,0.07); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 10px; }

@media (max-width: 640px) {
  /* Section dividers are absolute on the 1920 stage — un-absolute so they keep height in reflow */
  html.deck-can-flow .cs-section { position: relative !important; inset: auto !important; padding: 64px 22px !important; min-height: 300px; gap: 12px; }
  html.deck-can-flow .cs-section-title { font-size: min(60px, 16vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .cs-section-sub { font-size: min(20px, 5vw) !important; max-width: 100% !important; }
  html.deck-can-flow .cs-phase { font-size: min(16px, 4vw) !important; }

  /* Customer logo + context card */
  html.deck-can-flow .cust { gap: 18px; padding: 22px 22px !important; }
  html.deck-can-flow .cust > div { min-width: 0; }
  html.deck-can-flow .cust-mark { width: 64px; height: 64px; font-size: min(36px, 10vw) !important; border-radius: 14px; }
  html.deck-can-flow .cust-name { font-size: min(34px, 9vw) !important; }
  html.deck-can-flow .fact { grid-template-columns: 1fr !important; gap: 6px 0; padding: 16px 0; }

  /* Before / after metric pairs — collapse 3-track row, rotate arrow */
  html.deck-can-flow .ba { grid-template-columns: 1fr !important; gap: 14px 0; }
  html.deck-can-flow .ba-cell { padding: 26px 22px !important; }
  html.deck-can-flow .ba-num { font-size: min(56px, 15vw) !important; }
  html.deck-can-flow .ba-arrow { transform: rotate(90deg); height: 30px; }

  /* Results stat band — stack cells, flip left borders to top */
  html.deck-can-flow .band { grid-template-columns: 1fr !important; padding: 28px 24px !important; gap: 0; }
  html.deck-can-flow .band-cell { padding: 18px 0 !important; }
  html.deck-can-flow .band-cell + .band-cell { border-left: 0; border-top: 1px solid var(--card-border); }
  html.deck-can-flow .band-num { font-size: min(54px, 15vw) !important; }

  /* Oversized pull-quote mark + note callout padding */
  html.deck-can-flow .cs-quote::before { font-size: min(120px, 32vw) !important; }
  html.deck-can-flow .note { padding: 24px 22px !important; }
}`,
  notes:
    'A complete customer success case study: Instrument Serif display + Inter body, ink #26211b on warm cream #f5f1ea, ONE bright sky-blue (#0ea5e9) accent, generous whitespace, no gradients. Open and close on the warm bakery/workspace full-bleed (assets/case-study-cover.jpg); use the team-results figure (assets/case-study-fig.jpg) for the customer-voice split. Structure the narrative in three labelled acts with .cs-section (Challenge / Approach / Result). Signature pieces: .cust customer logo + context card with .fact rows for "at a glance", .ba before/after metric pairs for outcomes, the .band results stat strip, the oversized .cs-quote pull-quote, and .note for the headline insight. Use .bars for the "before" pain, .steps/.flow for what we did, .timeline for the rollout, .donut for impact mix. Warm and human, evidence-led — lead with the customer, keep numbers tabular and the story tight.',
  sampleSlides: [
    s({
      id: 'cs-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Customer Story · Rowan &amp; Field × Cadence</div>
    <h1 class="display reveal" style="--display-size:158px;margin-top:10px">How a corner<br/>bakery scaled<br/>to a brand.</h1>
    <p class="lead reveal">A 24-month story of growth, told in the numbers.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cs-glance',
      name: 'Customer at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The customer</div>
      <h2 class="headline" style="margin-top:10px;margin-bottom:30px">Rowan &amp; Field, at a glance.</h2>
      <div class="cust">
        <div class="cust-mark">R</div>
        <div>
          <div class="cust-name">Rowan &amp; Field</div>
          <div class="cust-meta">Artisan bakery &amp; cafe · Portland, OR</div>
        </div>
      </div>
    </div>
    <div>
      <div class="fact"><div class="fact-k">Industry</div><div class="fact-v">Specialty food &amp; hospitality</div></div>
      <div class="fact"><div class="fact-k">Founded</div><div class="fact-v"><b>2019</b> — single storefront, six staff</div></div>
      <div class="fact"><div class="fact-k">Customer since</div><div class="fact-v"><b>2024</b> — across all four locations</div></div>
      <div class="fact"><div class="fact-k">Using</div><div class="fact-v">Cadence for orders, loyalty &amp; wholesale</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">Customer story</span></div>
</div>`,
    }),
    s({
      id: 'cs-headline',
      name: 'The headline result',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">The headline result</div>
  <h2 class="display reveal" style="--display-size:172px;margin-top:14px;line-height:0.9">3.2× revenue<br/>in two years.</h2>
  <p class="lead reveal" style="max-width:34ch;margin-top:18px">From one counter to a four-location brand — without adding a single back-office hire.</p>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The result</span></div>
</div>`,
    }),
    s({
      id: 'cs-sec-challenge',
      name: 'Section · Challenge',
      transition: 'fade',
      bodyHtml: `<div class="cs-section">
  <div class="cs-phase reveal">Act 01</div>
  <div class="cs-section-title reveal">The challenge.</div>
  <p class="cs-section-sub reveal">Growth was outrunning the tools holding the business together.</p>
</div>`,
    }),
    s({
      id: 'cs-not-working',
      name: 'What wasn’t working',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What wasn't working</div>
      <h2 class="headline" style="margin-top:10px">Manual work scaled faster than sales.</h2>
      <div class="note" style="margin-top:28px">
        <div class="note-k">The breaking point</div>
        <p class="body" style="max-width:none">Wholesale orders arrived by <b>text, email, and voicemail</b> — and someone re-keyed every one by hand.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:34%"><div class="bar-fill" data-val="6 hrs"></div><div class="bar-label">2022</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="11 hrs"></div><div class="bar-label">2023</div></div>
      <div class="bar" style="--h:92%"><div class="bar-fill" data-val="18 hrs"></div><div class="bar-label">2024</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The challenge</span></div>
</div>`,
    }),
    s({
      id: 'cs-stakes',
      name: 'The stakes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Why it mattered</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:34px">What the chaos was costing.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">18 hrs</div><div class="stat-label">Owner's time per week lost to manual order entry</div></div>
    <div class="stat"><div class="stat-num">1 in 9</div><div class="stat-label">Wholesale orders shipped with an error</div></div>
    <div class="stat"><div class="stat-num">2 cities</div><div class="stat-label">Expansion stalled — the system couldn't stretch</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The stakes</span></div>
</div>`,
    }),
    s({
      id: 'cs-sec-approach',
      name: 'Section · Approach',
      transition: 'fade',
      bodyHtml: `<div class="cs-section">
  <div class="cs-phase reveal">Act 02</div>
  <div class="cs-section-title reveal">The approach.</div>
  <p class="cs-section-sub reveal">One system for orders, loyalty, and wholesale — rolled out without downtime.</p>
</div>`,
    }),
    s({
      id: 'cs-what-we-did',
      name: 'What we did',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we did</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:28px">A single source of truth, in three moves.</h2>
  <ol class="steps reveal" style="--gap:30px">
    <li class="step"><span><b>Unified intake.</b> Every wholesale and retail order flows into one queue — no more re-keying texts and emails.</span></li>
    <li class="step"><span><b>Automated fulfilment.</b> Production lists, invoices, and delivery routes generate themselves each morning.</span></li>
    <li class="step"><span><b>Built-in loyalty.</b> A connected rewards program turns first-time walk-ins into regulars automatically.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The approach</span></div>
</div>`,
    }),
    s({
      id: 'cs-rollout',
      name: 'The rollout',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The rollout</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:12px">Live in six weeks, not six months.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 1</div><div class="tl-what"><b>Migrate &amp; map</b> — imported two years of orders and standing wholesale accounts.</div></div>
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Flagship live</b> — first store running on Cadence, staff trained in a single shift.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Wholesale online</b> — 40 cafe and grocery accounts ordering through the portal.</div></div>
    <div class="tl-row"><div class="tl-when">Week 6</div><div class="tl-what"><b>All locations</b> — loyalty switched on chain-wide, owner fully off manual entry.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The approach</span></div>
</div>`,
    }),
    s({
      id: 'cs-sec-result',
      name: 'Section · Result',
      transition: 'fade',
      bodyHtml: `<div class="cs-section">
  <div class="cs-phase reveal">Act 03</div>
  <div class="cs-section-title reveal">The result.</div>
  <p class="cs-section-sub reveal">The numbers moved — and so did the ceiling on the business.</p>
</div>`,
    }),
    s({
      id: 'cs-outcomes',
      name: 'Outcomes · before & after',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The outcomes</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:30px">Before Cadence, and after.</h2>
  <div class="ba reveal" style="margin-bottom:30px">
    <div class="ba-cell before"><div class="ba-tag">Before</div><div class="ba-num">18 hrs</div><div class="ba-desc">Owner's weekly hours on manual orders</div></div>
    <div class="ba-arrow"></div>
    <div class="ba-cell after"><div class="ba-tag">After</div><div class="ba-num">2 hrs</div><div class="ba-desc">Now reviewed, not re-keyed</div></div>
  </div>
  <div class="ba reveal">
    <div class="ba-cell before"><div class="ba-tag">Before</div><div class="ba-num">11%</div><div class="ba-desc">Wholesale orders with an error</div></div>
    <div class="ba-arrow"></div>
    <div class="ba-cell after"><div class="ba-tag">After</div><div class="ba-num">0.4%</div><div class="ba-desc">Caught automatically before fulfilment</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The result</span></div>
</div>`,
    }),
    s({
      id: 'cs-impact',
      name: 'Impact by the numbers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Impact by the numbers</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:30px">Two years on Cadence.</h2>
  <div class="band reveal" style="--cols:4;margin-bottom:40px">
    <div class="band-cell"><div class="band-num">3.2×</div><div class="band-label">Total revenue growth</div></div>
    <div class="band-cell"><div class="band-num">+58%</div><div class="band-label">Repeat-customer rate via loyalty</div></div>
    <div class="band-cell"><div class="band-num">4</div><div class="band-label">Locations, one back office</div></div>
    <div class="band-cell"><div class="band-num">9 mo</div><div class="band-label">Payback on the platform</div></div>
  </div>
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:300px;background:conic-gradient(#0ea5e9 0 64%, #c7b89a 64% 100%)"><div class="donut-label">64%</div></div>
    </div>
    <div>
      <h3 class="subhead" style="margin-bottom:14px">Where the new revenue came from.</h3>
      <p class="body" style="max-width:none"><b>64%</b> of growth came from wholesale accounts the team simply couldn't service before — the rest from loyalty-driven retail repeat visits.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The result</span></div>
</div>`,
    }),
    s({
      id: 'cs-quote',
      name: 'The customer’s words',
      transition: 'fade',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="cs-quote reveal">
      <blockquote class="quote" style="--quote-size:80px">We grew four times over and our office stayed exactly the same size. Cadence gave me my mornings back.</blockquote>
    </div>
    <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Maya Rowan</span><span class="cite-role">Founder &amp; Owner, Rowan &amp; Field</span></div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cs-scorecard',
      name: 'Results scorecard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The scorecard</div>
  <h2 class="headline reveal" style="margin-top:10px;margin-bottom:14px">Goals set at kickoff, measured at year two.</h2>
  <table class="table reveal" style="margin-top:8px">
    <thead><tr><th>Goal</th><th class="num">Baseline</th><th class="num">Target</th><th class="num">Achieved</th></tr></thead>
    <tbody>
      <tr><td>Weekly admin hours</td><td class="num">18</td><td class="num">&lt; 5</td><td class="num pos">2</td></tr>
      <tr><td>Wholesale accounts served</td><td class="num">12</td><td class="num">35</td><td class="num pos">61</td></tr>
      <tr><td>Order error rate</td><td class="num">11%</td><td class="num">&lt; 2%</td><td class="num pos">0.4%</td></tr>
      <tr class="row-em"><td>Annual revenue</td><td class="num">$0.9M</td><td class="num">$2.0M</td><td class="num pos">$2.9M</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">The result</span></div>
</div>`,
    }),
    s({
      id: 'cs-whats-next',
      name: 'What’s next',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What's next</div>
      <h2 class="headline" style="margin-top:10px">The story is still being written.</h2>
      <p class="lead">With the back office finally quiet, Rowan &amp; Field is building on the foundation — not firefighting it.</p>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span>Two new locations opening in <b>2026</b>, onboarded in days.</span></li>
      <li class="check"><span>A <b>subscription bread club</b> launching on the loyalty engine.</span></li>
      <li class="check"><span>Regional <b>wholesale distribution</b> across the Pacific Northwest.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Cadence</span><span class="runner-label">What's next</span></div>
</div>`,
    }),
    s({
      id: 'cs-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Write your own story</div>
    <h2 class="display reveal" style="--display-size:128px">See what Cadence<br/>could do for you.</h2>
    <p class="lead reveal">hello@cadence.co · cadence.co/stories</p>
  </div>
</div>`,
    }),
  ],
}
