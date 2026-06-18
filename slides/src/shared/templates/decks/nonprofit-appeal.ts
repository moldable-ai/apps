import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/nonprofit-appeal-cover.jpg'
const STORY_IMG = 'assets/nonprofit-appeal-story.jpg'
const IMPACT_IMG = 'assets/nonprofit-appeal-impact.jpg'

export const nonprofitAppeal: Template = {
  id: 'nonprofit-appeal',
  categories: ['Fundraising', 'People'],
  name: 'Nonprofit Appeal',
  tagline: 'Humane, photographic annual fundraising appeal',
  audiences: ['donors', 'board', 'foundation', 'community'],
  description:
    'A warm, emotive nonprofit appeal in earth-brown, deep green, and cream. Big photographic people imagery, an impact stat band, donor-tier cards, a beneficiary story quote, and a clear give CTA carry a full annual-appeal narrative you tailor with your own mission and numbers.',
  fonts: {
    display: 'Bitter',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f6efe2',
    '--text': '#2b2018',
    '--muted': '#7a6a58',
    '--accent': '#14532d',
    '--accent-2': '#6b4226',
    '--display': "'Bitter', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#fbf7ee',
    '--card-border': '#e3d6c0',
    '--card-shadow': '0 22px 50px -32px rgba(43,32,24,0.32)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '116px',
    '--th-border': '#2b2018',
    '--table-border': '#e3d6c0',
    '--track': '#e3d6c0',
    '--donut-hole': '#f6efe2',
    '--bar-gap': '34px',
    '--bar-fill': '#14532d',
    '--media-radius': '18px',
    '--media-shadow': '0 50px 110px -45px rgba(43,32,24,0.5)',
    '--media-border': '1px solid #e3d6c0',
    '--scrim':
      'linear-gradient(180deg, rgba(31,22,14,0.12) 0%, rgba(31,22,14,0.46) 52%, rgba(31,22,14,0.88) 100%)',
    '--bleed-text': '#f6efe2',
    '--pos': '#14532d',
    '--neg': '#9a3324',
  },
  stageBg: '#1f160e',
  assets: [
    'nonprofit-appeal-cover.jpg',
    'nonprofit-appeal-story.jpg',
    'nonprofit-appeal-impact.jpg',
  ],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent-2); }
.tl-when { color: var(--accent-2); }
.cite-dot { background: var(--accent-2); }
.bullet::before { background: var(--accent-2); }

/* Section divider — warm cream field with a hand-drawn rule */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider::before { content: ''; position: absolute; inset: 40px; border: 2px solid var(--card-border); border-radius: 26px; pointer-events: none; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--accent-2); position: relative; }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 138px; line-height: 0.98; letter-spacing: -0.02em; color: var(--text); position: relative; }
.divider-rule { width: 120px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 14px; position: relative; }

/* Impact stat band — full-width forest-green strip */
.impact { background: var(--accent); border-radius: 22px; display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); padding: 58px 44px; }
.impact-cell { padding: 0 46px; }
.impact-cell + .impact-cell { border-left: 1px solid rgba(246,239,226,0.22); }
.impact-num { font-family: var(--display); font-weight: 700; font-size: 92px; line-height: 1; letter-spacing: -0.025em; color: #f6efe2; font-variant-numeric: tabular-nums; }
.impact-label { font-family: var(--body); font-size: 24px; line-height: 1.34; color: rgba(246,239,226,0.82); margin-top: 14px; }

/* Donor-tier cards — earthy ledger cards with a top rule + leaf mark */
.tier { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.tcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 40px 36px 38px; box-shadow: var(--card-shadow); position: relative; overflow: hidden; }
.tcard::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: var(--accent-2); }
.tcard.feature::before { background: var(--accent); }
.tcard-amt { font-family: var(--display); font-weight: 700; font-size: 64px; line-height: 1; letter-spacing: -0.02em; color: var(--accent); font-variant-numeric: tabular-nums; }
.tcard-name { font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--accent-2); margin-top: 8px; }
.tcard-d { font-family: var(--body); font-size: 24px; line-height: 1.42; color: var(--muted); margin-top: 16px; }

/* Beneficiary story quote band — large serif on cream */
.story-q { font-family: var(--display); font-weight: 500; font-style: italic; font-size: 70px; line-height: 1.18; letter-spacing: -0.01em; color: #f6efe2; max-width: 22ch; text-wrap: balance; }

/* The need — single human statement */
.statement { font-family: var(--display); font-weight: 500; font-size: 78px; line-height: 1.12; letter-spacing: -0.015em; color: var(--text); max-width: 20ch; text-wrap: balance; }
.statement b { color: var(--accent); font-weight: 700; }

/* Give CTA — warm pill button + ways-to-give row */
.give { display: inline-flex; align-items: center; gap: 14px; padding: 24px 44px; border-radius: 999px; background: var(--accent); color: #f6efe2; font-family: var(--display); font-weight: 700; font-size: 36px; letter-spacing: -0.01em; }
.give::after { content: '\\2192'; font-size: 0.9em; }
.give-ways { display: flex; gap: 18px; flex-wrap: wrap; }
.give-way { display: inline-flex; align-items: center; gap: 10px; padding: 14px 26px; border-radius: 999px; border: 1.5px solid rgba(246,239,226,0.5); font-family: var(--body); font-weight: 600; font-size: 26px; color: #f6efe2; }

/* Gap callout — earth-brown framed note */
.note { border-left: 5px solid var(--accent-2); background: rgba(107,66,38,0.07); padding: 30px 38px; border-radius: 0 14px 14px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 10px; }

/* Where-it-goes legend */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 18px; height: 18px; border-radius: 5px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 600; }`,
  notes:
    'A complete annual fundraising appeal for a fictional community nonprofit. Bitter serif display + Inter body, warm cream #f6efe2, ink #2b2018, deep-green #14532d primary accent with earth-brown #6b4226 secondary (used for eyebrows). Open and close on the full-bleed people photography (assets/nonprofit-appeal-cover.jpg); tell the beneficiary story with the portrait split (assets/nonprofit-appeal-story.jpg) and put the shared-meal impact image on the full-bleed quote (assets/nonprofit-appeal-impact.jpg). Signature pieces: the .impact forest-green stat band for impact-this-year, .tier donor-tier cards (top-rule, mark a .feature tier), the .statement single human line for the need, the full-bleed .story-q beneficiary quote, and the .give pill CTA with .give-way pills. Use .bars for the funding gap, .donut + .legend for where gifts go, a .table for ways to give, .flow for how we work, .timeline for matching milestones. Humane and emotive, never clinical — let one photograph and one number carry each slide. Keep the .runner footer on content slides.',
  sampleSlides: [
    s({
      id: 'na-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#e7d9bf">2026 Annual Appeal · Rootwell Community Foundation</div>
    <h1 class="display reveal" style="--display-size:130px;margin-top:10px">Grow what<br/>holds us together.</h1>
    <p class="lead reveal" style="color:#f1e7d4;opacity:0.95">When neighbors are fed, housed, and heard, a whole community takes root.</p>
  </div>
</div>`,
    }),
    s({
      id: 'na-need',
      name: 'The need',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The need</div>
  <p class="statement reveal" style="margin-top:14px">This year, <b>1 in 6 families</b> in our county skipped meals to make rent.</p>
  <p class="lead reveal" style="max-width:36ch;margin-top:18px">They are not a statistic. They are the kids in the back row, the grandparents on the block, the neighbors we pass every morning.</p>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">The need</span></div>
</div>`,
    }),
    s({
      id: 'na-div1',
      name: 'Section · Who we serve',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Who we serve</div>
  <div class="divider-title reveal">The people<br/>behind the need.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'na-story',
      name: "Maria's story",
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">A neighbor's story</div>
    <h2 class="headline reveal">Maria came for groceries. She stayed to lead.</h2>
    <p class="lead reveal" style="max-width:30ch">After a layoff, Maria found a warm meal at our pantry. Two years on, she runs the volunteer kitchen that feeds 200 families a week.</p>
    <div class="pill reveal" style="align-self:flex-start">Pantry guest, 2024 → Kitchen lead, 2026</div>
  </div>
  <figure class="media reveal"><img src="${STORY_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'na-impact',
      name: 'Impact this year',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Our impact this year</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">What your support made possible.</h2>
  <div class="impact reveal" style="--cols:4;padding:52px 36px">
    <div class="impact-cell"><div class="impact-num">312K</div><div class="impact-label">Meals served across nine neighborhoods</div></div>
    <div class="impact-cell"><div class="impact-num">1,840</div><div class="impact-label">Families kept in stable housing</div></div>
    <div class="impact-cell"><div class="impact-num">96%</div><div class="impact-label">Of every dollar reaching programs</div></div>
    <div class="impact-cell"><div class="impact-num">540</div><div class="impact-label">Neighbors who became volunteers</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Impact this year</span></div>
</div>`,
    }),
    s({
      id: 'na-how',
      name: 'How we work',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we work</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">From a knock on the door to a neighbor who leads.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="tcard"><div class="tcard-name" style="color:var(--accent)">01 · Meet</div><div class="card-title" style="font-size:34px;margin-top:6px">Meet the need</div><div class="tcard-d">Open doors, no questions — a meal, a bed, a listening ear, today.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="tcard"><div class="tcard-name" style="color:var(--accent)">02 · Steady</div><div class="card-title" style="font-size:34px;margin-top:6px">Steady the ground</div><div class="tcard-d">Case workers connect families to housing, work, and care.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="tcard"><div class="tcard-name" style="color:var(--accent)">03 · Grow</div><div class="card-title" style="font-size:34px;margin-top:6px">Grow new leaders</div><div class="tcard-d">Yesterday's guests become today's volunteers and mentors.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">How we work</span></div>
</div>`,
    }),
    s({
      id: 'na-quote',
      name: "Beneficiary's words",
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${IMPACT_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#e7d9bf">In her words</div>
    <blockquote class="story-q reveal">"I walked in needing help and walked out with a family. That table is where I found my feet again."</blockquote>
    <div class="cite reveal" style="margin-top:30px"><span class="cite-dot"></span><span class="cite-name" style="color:#f6efe2">Maria Delgado</span><span class="cite-role" style="color:rgba(246,239,226,0.78)">Volunteer kitchen lead</span></div>
  </div>
</div>`,
    }),
    s({
      id: 'na-div2',
      name: 'Section · The gap',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — The year ahead</div>
  <div class="divider-title reveal">The gap we<br/>must close.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'na-gap',
      name: 'The funding gap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The gap</div>
      <h2 class="headline" style="margin-top:8px">Demand is rising faster than our funding.</h2>
      <div class="note" style="margin-top:28px">
        <div class="note-k">Why it matters</div>
        <p class="body" style="max-width:none">Requests for help grew <b>34%</b> this year. To meet them, we need to raise <b>$1.2M</b> by December.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="$640K"></div><div class="bar-label">2023</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="$880K"></div><div class="bar-label">2024</div></div>
      <div class="bar" style="--h:82%"><div class="bar-fill" data-val="$1.1M"></div><div class="bar-label">2025</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="$1.2M" style="background:var(--accent-2)"></div><div class="bar-label">2026 goal</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">The gap</span></div>
</div>`,
    }),
    s({
      id: 'na-goes',
      name: 'Where your gift goes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#14532d 0 46%, #6b4226 46% 74%, #b08d57 74% 92%, #d8c4a0 92% 100%)"><div class="donut-label">96&cent;</div></div>
    </div>
    <div>
      <div class="kicker">Where your gift goes</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Ninety-six cents of every dollar.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:#14532d"></span>Food &amp; nutrition<span class="v">46%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#6b4226"></span>Housing support<span class="v">28%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#b08d57"></span>Jobs &amp; mentoring<span class="v">18%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#d8c4a0"></span>Operations<span class="v">8%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Your gift at work</span></div>
</div>`,
    }),
    s({
      id: 'na-tiers',
      name: 'Donor tiers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What your gift can do</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Every gift takes root.</h2>
  <div class="tier reveal" style="--cols:4">
    <div class="tcard"><div class="tcard-amt">$50</div><div class="tcard-name">Seed</div><div class="tcard-d">A week of warm dinners for a family of four.</div></div>
    <div class="tcard"><div class="tcard-amt">$150</div><div class="tcard-name">Sprout</div><div class="tcard-d">A month of after-school meals for one child.</div></div>
    <div class="tcard feature"><div class="tcard-amt">$500</div><div class="tcard-name">Sustainer</div><div class="tcard-d">Emergency housing help that keeps a family home.</div></div>
    <div class="tcard"><div class="tcard-amt">$2,500</div><div class="tcard-name">Grove</div><div class="tcard-d">A neighbor's full path from pantry to paid mentor.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Your gift can do</span></div>
</div>`,
    }),
    s({
      id: 'na-ways',
      name: 'Ways to give',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Ways to give</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Give in a way that fits your life.</h2>
  <table class="table reveal">
    <thead><tr><th>Way to give</th><th>Best for</th><th class="num">Tax-deductible</th><th class="num">Impact</th></tr></thead>
    <tbody>
      <tr><td>One-time gift</td><td class="muted">Meeting today's need right now</td><td class="num"><span class="pos">Yes</span></td><td class="num">Immediate</td></tr>
      <tr class="row-em"><td>Monthly sustaining</td><td class="muted">Steady, reliable support all year</td><td class="num"><span class="pos">Yes</span></td><td class="num">12&times; / year</td></tr>
      <tr><td>Stock &amp; DAF</td><td class="muted">Maximizing your tax benefit</td><td class="num"><span class="pos">Yes</span></td><td class="num">Amplified</td></tr>
      <tr><td>Legacy gift</td><td class="muted">Leaving a lasting community gift</td><td class="num"><span class="pos">Yes</span></td><td class="num">Generational</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">All gifts are tax-deductible to the fullest extent of the law. EIN on request.</p>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Ways to give</span></div>
</div>`,
    }),
    s({
      id: 'na-match',
      name: 'Matching & milestones',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Matching &amp; milestones</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Your gift, doubled — if we move together.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Now</div><div class="tl-what"><b>The Hartwell Match</b> doubles every gift up to $400,000 — through year-end only.</div></div>
    <div class="tl-row"><div class="tl-when">$600K</div><div class="tl-what"><b>Open a tenth pantry</b> in the underserved east neighborhoods.</div></div>
    <div class="tl-row"><div class="tl-when">$900K</div><div class="tl-what"><b>Hire two case workers</b> to cut the housing waitlist in half.</div></div>
    <div class="tl-row"><div class="tl-when">$1.2M</div><div class="tl-what"><b>Fund the full year</b> — every program, every neighbor, no gap.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Matching &amp; milestones</span></div>
</div>`,
    }),
    s({
      id: 'na-div3',
      name: 'Section · Join us',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Join us</div>
  <div class="divider-title reveal">Be the reason<br/>someone stays.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'na-why',
      name: 'Why now',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why now</div>
      <h2 class="headline" style="margin-top:8px">A gift today does double the good.</h2>
      <p class="lead">Until December 31, every dollar is matched — and every dollar reaches a neighbor who can't wait for next year.</p>
    </div>
    <ul class="checks reveal" style="--gap:26px">
      <li class="check"><span>Your gift is <b>matched dollar-for-dollar</b> through year-end.</span></li>
      <li class="check"><span><b>96 cents of every dollar</b> goes straight to programs.</span></li>
      <li class="check"><span>You'll get a <b>year-end impact report</b> with the neighbors you helped.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Rootwell Foundation</span><span class="runner-label">Why now</span></div>
</div>`,
    }),
    s({
      id: 'na-give',
      name: 'Give · CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#e7d9bf">Will you give?</div>
    <h2 class="display reveal" style="--display-size:116px">Plant something<br/>that lasts.</h2>
    <p class="lead reveal" style="color:#f1e7d4;opacity:0.95;max-width:34ch">Make your gift before December 31 and watch it grow — doubled, and rooted right here at home.</p>
    <div class="row reveal" style="margin-top:14px;gap:22px;flex-wrap:wrap">
      <span class="give">Give at rootwell.org/appeal</span>
      <div class="give-ways">
        <span class="give-way">Text ROOT to 53-555</span>
        <span class="give-way">Call (555) 014-2200</span>
      </div>
    </div>
  </div>
</div>`,
    }),
  ],
}
