import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/annual-report-cover.jpg'
const FIG_IMG = 'assets/annual-report-fig.jpg'

export const annualReport: Template = {
  id: 'annual-report',
  categories: ['Reporting'],
  name: 'Annual Report',
  tagline: 'Stately, classic year-in-review for shareholders',
  audiences: ['board', 'shareholders', 'executive', 'investors'],
  description:
    'A dignified annual report in deep navy, antique gold, and warm cream with a Libre Caslon display and Inter body. A letter from the CEO, financial tables, bar and segment charts, a milestone timeline, and stately numbered dividers carry a complete year-in-review you fill with your own results.',
  fonts: {
    display: 'Libre Caslon Display',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f5f0e6',
    '--text': '#0a1e3f',
    '--muted': '#6b6354',
    '--accent': '#b08d3a',
    '--accent-2': '#0a1e3f',
    '--display': "'Libre Caslon Display', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '400',
    '--title-size': '128px',
    '--headline-size': '80px',
    '--section-size': '150px',
    '--lead-size': '38px',
    '--subhead-size': '48px',
    '--kicker-tracking': '0.26em',
    '--kicker-size': '21px',
    '--bullet-size': '34px',
    '--card-bg': '#fbf8f1',
    '--card-border': 'rgba(10,30,63,0.14)',
    '--card-shadow': '0 22px 50px -34px rgba(10,30,63,0.4)',
    '--radius': '6px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#0a1e3f',
    '--table-border': 'rgba(10,30,63,0.12)',
    '--track': 'rgba(10,30,63,0.1)',
    '--donut-hole': '#f5f0e6',
    '--bar-gap': '36px',
    '--bullet-color': '#b08d3a',
    '--bullet-radius': '2px',
    '--media-radius': '6px',
    '--media-border': '1px solid rgba(10,30,63,0.16)',
    '--media-shadow': '0 50px 110px -50px rgba(10,30,63,0.55)',
    '--scrim':
      'linear-gradient(180deg, rgba(10,30,63,0.20) 0%, rgba(10,30,63,0.52) 52%, rgba(10,30,63,0.92) 100%)',
    '--pos': '#3f7d52',
    '--neg': '#a23b2e',
    '--rule-color': 'rgba(10,30,63,0.16)',
  },
  stageBg: '#e7dfcd',
  assets: ['annual-report-cover.jpg', 'annual-report-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label, .tl-when { color: var(--accent); }
.bar-fill { background: var(--accent); }
.full-bleed .kicker { color: #d8bd7e; }

/* Formal numbered section divider — oversized roman-feel number on cream */
.fdiv { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 90px; }
.fdiv-num { font-family: var(--display); font-weight: 400; font-size: 420px; line-height: 0.8; color: var(--accent); opacity: 0.9; letter-spacing: -0.03em; }
.fdiv-body { display: flex; flex-direction: column; gap: 22px; }
.fdiv-kicker { font-family: var(--body); font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; font-size: 22px; color: var(--accent); }
.fdiv-title { font-family: var(--display); font-weight: 400; font-size: 128px; line-height: 0.98; letter-spacing: -0.015em; color: var(--text); }
.fdiv-rule { width: 130px; height: 2px; background: var(--accent); margin-top: 6px; }

/* Oversized year / headline number */
.bignum { font-family: var(--display); font-weight: 400; font-size: 300px; line-height: 0.86; letter-spacing: -0.02em; color: var(--accent); font-variant-numeric: tabular-nums; }
.bignum-cap { font-family: var(--body); font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; font-size: 24px; color: var(--muted); }

/* Letter from the CEO — serif lede with a gold initial rule */
.letter { border-left: 3px solid var(--accent); padding-left: 44px; }
.letter-lede { font-family: var(--display); font-weight: 400; font-size: 60px; line-height: 1.16; letter-spacing: -0.005em; color: var(--text); }
.signature { font-family: var(--display); font-weight: 400; font-style: italic; font-size: 46px; color: var(--text); }
.signature-role { font-family: var(--body); font-size: 26px; color: var(--muted); margin-top: 6px; }

/* Financial figure cards — ledger style with hairline rules */
.ledger { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); }
.ledger-cell { padding: 0 48px; border-left: 1px solid var(--card-border); }
.ledger-cell:first-child { padding-left: 0; border-left: 0; }
.ledger-val { font-family: var(--display); font-weight: 400; font-size: 92px; line-height: 1; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
.ledger-label { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 16px; line-height: 1.3; }
.ledger-delta { font-family: var(--body); font-weight: 600; font-size: 23px; margin-top: 12px; display: inline-flex; align-items: center; gap: 7px; }
.ledger-delta.up { color: var(--pos); } .ledger-delta.down { color: var(--neg); }
.ledger-delta.up::before { content: '\\25B2'; font-size: 13px; } .ledger-delta.down::before { content: '\\25BC'; font-size: 13px; }

/* Gold-rule callout for the headline insight */
.note { border-top: 2px solid var(--accent); padding-top: 26px; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 12px; }

/* Segment legend rows for the donut */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 16px; height: 16px; border-radius: 3px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 600; }

/* Leadership / board row */
.board { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 40px; }
.board-card { border-top: 2px solid var(--accent); padding-top: 24px; }
.board-name { font-family: var(--display); font-weight: 400; font-size: 40px; line-height: 1.05; color: var(--text); }
.board-role { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 8px; }

/* Agenda / contents rows */
.toc { display: grid; grid-template-columns: 1fr 1fr; gap: 0 96px; }
.toc-row { display: flex; gap: 28px; align-items: baseline; padding: 24px 0; border-top: 1px solid var(--card-border); }
.toc-n { font-family: var(--display); font-weight: 400; font-size: 40px; color: var(--accent); flex: 0 0 auto; }
.toc-t { font-family: var(--display); font-weight: 400; font-size: 42px; color: var(--text); line-height: 1; }
.toc-d { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 6px; }

/* Cards on cream — lift the shared card with a gold top rule */
.card { background: var(--card-bg); box-shadow: var(--card-shadow); }

@media (max-width: 640px) {
  html.deck-can-flow .fdiv { position: relative !important; inset: auto !important; grid-template-columns: 1fr !important; gap: 18px 0; padding: 56px 22px !important; min-height: 300px; align-content: center; }
  html.deck-can-flow .fdiv-num { font-size: min(143px, 40vw) !important; line-height: 0.82 !important; }
  html.deck-can-flow .fdiv-title { font-size: min(44px, 12vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .bignum { font-size: min(102px, 28vw) !important; line-height: 0.9 !important; }
  html.deck-can-flow .letter-lede { font-size: min(36px, 10vw) !important; line-height: 1.18 !important; }
  html.deck-can-flow .signature { font-size: min(36px, 10vw) !important; }
  html.deck-can-flow .ledger { grid-template-columns: 1fr 1fr !important; gap: 28px 0; }
  html.deck-can-flow .ledger-cell { padding: 0 20px !important; }
  html.deck-can-flow .ledger-cell:nth-child(odd) { padding-left: 0 !important; border-left: 0 !important; }
  html.deck-can-flow .ledger-val { font-size: min(56px, 15vw) !important; }
  html.deck-can-flow .toc { grid-template-columns: 1fr !important; gap: 0 0; }
  html.deck-can-flow .letter { padding-left: 18px !important; }
}`,
  notes:
    'A complete shareholder annual report: Libre Caslon Display + Inter, deep navy #0a1e3f text on warm cream #f5f0e6, ONE antique-gold accent #b08d3a. Open and close on the stately architectural full-bleed (assets/annual-report-cover.jpg); use the community/people figure (assets/annual-report-fig.jpg) for the sustainability split. Signature pieces: .fdiv formal numbered dividers with an oversized roman-feel numeral, .bignum for the headline year/number, .letter / .letter-lede / .signature for the CEO letter, .ledger ledger-style financial figure cards, .note gold-rule callouts, .legend for the segment donut, .board leadership row, .toc contents. Use .bars for revenue trend, .table for financial highlights and segment detail, .timeline for milestones, .stats for the year at a glance and people, .checks for sustainability commitments. Keep numbers tabular, the tone formal and dignified, gravitas over decoration.',
  sampleSlides: [
    s({
      id: 'ar-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Meridian Industries · Annual Report</div>
    <h1 class="display reveal" style="--display-size:300px;line-height:0.84;margin-top:10px">2025</h1>
    <p class="lead reveal" style="margin-top:14px">A year of disciplined growth and enduring purpose.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ar-contents',
      name: 'Contents',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Contents</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">Inside this report.</h2>
  <div class="toc reveal">
    <div class="toc-row"><div class="toc-n">I</div><div><div class="toc-t">A letter from the CEO</div><div class="toc-d">Reflections on the year</div></div></div>
    <div class="toc-row"><div class="toc-n">IV</div><div><div class="toc-t">Our impact</div><div class="toc-d">Milestones, community, people</div></div></div>
    <div class="toc-row"><div class="toc-n">II</div><div><div class="toc-t">The year at a glance</div><div class="toc-d">Headline results</div></div></div>
    <div class="toc-row"><div class="toc-n">V</div><div><div class="toc-t">The year ahead</div><div class="toc-d">Outlook and strategy</div></div></div>
    <div class="toc-row"><div class="toc-n">III</div><div><div class="toc-t">Performance</div><div class="toc-d">Revenue, financials, segments</div></div></div>
    <div class="toc-row"><div class="toc-n">VI</div><div><div class="toc-t">Leadership</div><div class="toc-d">Board and executive team</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Annual Report 2025</span></div>
</div>`,
    }),
    s({
      id: 'ar-letter',
      name: 'Letter from the CEO',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">A letter from the CEO</div>
    <div class="letter reveal" style="margin-top:14px">
      <p class="letter-lede">In a year that tested every assumption, our people held the line on quality and the company emerged stronger, leaner, and more trusted than ever.</p>
    </div>
    <p class="body reveal" style="max-width:38ch;margin-top:30px">We grew revenue 14% while expanding margins, returned capital to shareholders, and made our deepest investments yet in sustainability and our workforce. The chapters that follow tell that story in full.</p>
    <div class="reveal" style="margin-top:34px">
      <div class="signature">Eleanor Whitfield</div>
      <div class="signature-role">Chair &amp; Chief Executive Officer</div>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'ar-glance',
      name: 'The year at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The year at a glance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:38px">Twelve months, six numbers.</h2>
  <div class="stats reveal" style="margin-bottom:46px">
    <div class="stat"><div class="stat-num">$3.8B</div><div class="stat-label">Total revenue, up 14% year over year</div></div>
    <div class="stat"><div class="stat-num">28.6%</div><div class="stat-label">Operating margin, a record high</div></div>
    <div class="stat"><div class="stat-num">$612M</div><div class="stat-label">Returned to shareholders</div></div>
  </div>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">9,400</div><div class="stat-label">Employees across 18 countries</div></div>
    <div class="stat"><div class="stat-num">41%</div><div class="stat-label">Reduction in operational emissions</div></div>
    <div class="stat"><div class="stat-num">94%</div><div class="stat-label">Customer retention rate</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">At a glance</span></div>
</div>`,
    }),
    s({
      id: 'ar-sec-performance',
      name: 'Section · Performance',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">II</div>
  <div class="fdiv-body">
    <div class="fdiv-kicker reveal">Section Two</div>
    <div class="fdiv-title reveal">Performance.</div>
    <div class="fdiv-rule reveal"></div>
  </div>
</div>`,
    }),
    s({
      id: 'ar-revenue',
      name: 'Revenue & growth',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Revenue &amp; growth</div>
      <h2 class="headline" style="margin-top:8px">Five years of steady compounding.</h2>
      <div class="note" style="margin-top:30px">
        <div class="note-k">The headline</div>
        <p class="body" style="max-width:none">Revenue has grown at a <b>13% compound annual rate</b> since 2021, with the strongest acceleration in our services division.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:52%"><div class="bar-fill" data-val="$2.3B"></div><div class="bar-label">2021</div></div>
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="$2.7B"></div><div class="bar-label">2022</div></div>
      <div class="bar" style="--h:72%"><div class="bar-fill" data-val="$3.1B"></div><div class="bar-label">2023</div></div>
      <div class="bar" style="--h:82%"><div class="bar-fill" data-val="$3.3B"></div><div class="bar-label">2024</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$3.8B"></div><div class="bar-label">2025</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Performance</span></div>
</div>`,
    }),
    s({
      id: 'ar-financials',
      name: 'Financial highlights',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Financial highlights</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">A disciplined year.</h2>
  <table class="table reveal">
    <thead><tr><th>($ millions)</th><th class="num">2025</th><th class="num">2024</th><th class="num">Change</th></tr></thead>
    <tbody>
      <tr><td>Total revenue</td><td class="num">3,812</td><td class="num">3,343</td><td class="num pos">+14.0%</td></tr>
      <tr><td>Gross profit</td><td class="num">2,210</td><td class="num">1,889</td><td class="num pos">+17.0%</td></tr>
      <tr><td>Operating income</td><td class="num">1,090</td><td class="num">894</td><td class="num pos">+21.9%</td></tr>
      <tr><td>Net income</td><td class="num">786</td><td class="num">642</td><td class="num pos">+22.4%</td></tr>
      <tr><td>Free cash flow</td><td class="num">704</td><td class="num">588</td><td class="num pos">+19.7%</td></tr>
      <tr class="row-em"><td>Cash &amp; equivalents</td><td class="num">1,420</td><td class="num">1,118</td><td class="num pos">+27.0%</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Performance</span></div>
</div>`,
    }),
    s({
      id: 'ar-segments',
      name: 'Segment results',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Results by segment</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Where the growth came from.</h2>
  <div class="two-col reveal" style="--col-gap:100px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#0a1e3f 0 46%, #b08d3a 46% 76%, #6b6354 76% 100%)"><div class="donut-label" style="color:var(--text)">46%</div></div>
      <div class="legend" style="margin-top:38px">
        <div class="legend-row"><span class="legend-dot" style="background:#0a1e3f"></span>Industrial Systems<span class="v">46%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#b08d3a"></span>Services &amp; Software<span class="v">30%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#6b6354"></span>Materials<span class="v">24%</span></div>
      </div>
    </div>
    <table class="table" style="--table-size:28px">
      <thead><tr><th>Segment</th><th class="num">Revenue</th><th class="num">Growth</th></tr></thead>
      <tbody>
        <tr><td>Industrial Systems</td><td class="num">$1,754</td><td class="num pos">+9%</td></tr>
        <tr><td>Services &amp; Software</td><td class="num">$1,144</td><td class="num pos">+26%</td></tr>
        <tr><td>Materials</td><td class="num">$914</td><td class="num neg">-3%</td></tr>
        <tr class="row-em"><td>Total</td><td class="num">$3,812</td><td class="num pos">+14%</td></tr>
      </tbody>
    </table>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Performance</span></div>
</div>`,
    }),
    s({
      id: 'ar-sec-impact',
      name: 'Section · Impact',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">III</div>
  <div class="fdiv-body">
    <div class="fdiv-kicker reveal">Section Three</div>
    <div class="fdiv-title reveal">Our impact.</div>
    <div class="fdiv-rule reveal"></div>
  </div>
</div>`,
    }),
    s({
      id: 'ar-milestones',
      name: 'Milestones',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Milestones of the year</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Moments that defined 2025.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q1</div><div class="tl-what"><b>Opened the Lisbon plant</b> — our first carbon-neutral facility, adding 1,200 jobs.</div></div>
    <div class="tl-row"><div class="tl-when">Q2</div><div class="tl-what"><b>Acquired Vertex Software</b> for $340M, anchoring the Services &amp; Software segment.</div></div>
    <div class="tl-row"><div class="tl-when">Q3</div><div class="tl-what"><b>Crossed $1B in services revenue</b> for the first time in company history.</div></div>
    <div class="tl-row"><div class="tl-when">Q4</div><div class="tl-what"><b>Raised the dividend 12%</b> and announced a $250M share repurchase program.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Our impact</span></div>
</div>`,
    }),
    s({
      id: 'ar-sustainability',
      name: 'Sustainability & community',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Sustainability &amp; community</div>
    <h2 class="headline reveal">Building for the long term.</h2>
    <ul class="checks reveal" style="--gap:24px;margin-top:10px">
      <li class="check"><span><b>41% lower emissions</b> against our 2030 science-based target.</span></li>
      <li class="check"><span><b>$18M invested</b> in the communities where our people live and work.</span></li>
      <li class="check"><span><b>100% renewable</b> electricity across all owned facilities.</span></li>
      <li class="check"><span><b>26,000 volunteer hours</b> contributed by employees worldwide.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'ar-people',
      name: 'Our people',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="bignum-cap">Our people</div>
      <div class="bignum" style="margin-top:8px">9,400</div>
      <p class="body" style="max-width:30ch;margin-top:24px">Colleagues across 18 countries — the foundation of everything we build.</p>
    </div>
    <div class="stats reveal" style="flex-direction:column;align-items:stretch;gap:0">
      <div class="stat" style="padding:0 0 30px;border-bottom:1px solid var(--card-border)"><div class="stat-num" style="--stat-size:80px">87%</div><div class="stat-label">Employee engagement, up 5 points</div></div>
      <div class="stat" style="padding:30px 0;border-left:0;border-bottom:1px solid var(--card-border)"><div class="stat-num" style="--stat-size:80px">44%</div><div class="stat-label">Women in leadership roles</div></div>
      <div class="stat" style="padding:30px 0 0;border-left:0"><div class="stat-num" style="--stat-size:80px">96%</div><div class="stat-label">Voluntary retention of top talent</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Our impact</span></div>
</div>`,
    }),
    s({
      id: 'ar-sec-ahead',
      name: 'Section · Ahead',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">IV</div>
  <div class="fdiv-body">
    <div class="fdiv-kicker reveal">Section Four</div>
    <div class="fdiv-title reveal">The year ahead.</div>
    <div class="fdiv-rule reveal"></div>
  </div>
</div>`,
    }),
    s({
      id: 'ar-outlook',
      name: 'Outlook & strategy',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Outlook &amp; strategy</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Three priorities for 2026.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-num">01</div><div class="card-title">Scale services</div><div class="card-body">Grow the Services &amp; Software segment to 35% of revenue through deeper customer integration.</div></div>
    <div class="card"><div class="card-num">02</div><div class="card-title">Decarbonize operations</div><div class="card-body">Reach our 2027 emissions target two years early by electrifying the remaining sites.</div></div>
    <div class="card"><div class="card-num">03</div><div class="card-title">Invest in talent</div><div class="card-body">Add 1,500 roles and expand the apprenticeship program across three new regions.</div></div>
  </div>
  <p class="fine reveal" style="margin-top:30px">Guidance: revenue of $4.2&ndash;4.4B and operating margin of 29&ndash;30% for fiscal 2026.</p>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">The year ahead</span></div>
</div>`,
    }),
    s({
      id: 'ar-quote',
      name: 'Closing reflection',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"We measure a year not only by what we earned, but by the trust we kept and the future we made possible."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Eleanor Whitfield</span><span class="cite-role">Chair &amp; Chief Executive Officer</span></div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">In closing</span></div>
</div>`,
    }),
    s({
      id: 'ar-board',
      name: 'Board & leadership',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Board &amp; leadership</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The team behind the year.</h2>
  <div class="board reveal" style="--cols:4">
    <div class="board-card"><div class="board-name">Eleanor Whitfield</div><div class="board-role">Chair &amp; CEO</div></div>
    <div class="board-card"><div class="board-name">Marcus Adeyemi</div><div class="board-role">Chief Financial Officer</div></div>
    <div class="board-card"><div class="board-name">Priya Raman</div><div class="board-role">Chief Operating Officer</div></div>
    <div class="board-card"><div class="board-name">Daniel Okonkwo</div><div class="board-role">Lead Independent Director</div></div>
    <div class="board-card"><div class="board-name">Sofia Marchetti</div><div class="board-role">Chief Technology Officer</div></div>
    <div class="board-card"><div class="board-name">James Holloway</div><div class="board-role">Chief People Officer</div></div>
    <div class="board-card"><div class="board-name">Amara Diallo</div><div class="board-role">Director</div></div>
    <div class="board-card"><div class="board-name">Thomas Lindqvist</div><div class="board-role">Director</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Industries</span><span class="runner-label">Leadership</span></div>
</div>`,
    }),
    s({
      id: 'ar-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Meridian Industries · 2025</div>
    <h2 class="display reveal" style="--display-size:120px;line-height:0.92">Thank you to our<br/>shareholders.</h2>
    <p class="lead reveal">Full financial statements and notes are available at meridian-industries.com/annual.</p>
  </div>
</div>`,
    }),
  ],
}
