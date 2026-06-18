import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/people-ops-cover.jpg'
const FIG_IMG = 'assets/people-ops-fig.jpg'

export const peopleOps: Template = {
  id: 'people-ops',
  categories: ['People'],
  name: 'People Ops',
  tagline: 'Warm, human people & culture review',
  audiences: ['people', 'hr', 'leadership', 'all-hands'],
  description:
    'A warm people-and-culture review in sage, terracotta, and cream with an Outfit + Lora pairing. Headcount stat bands, engagement donuts, DEI bars, program cards, a team photo grid, and pulse-survey voices carry a complete year-in-people story you tailor to your org.',
  fonts: {
    display: 'Outfit',
    body: 'Lora',
    links: [
      'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f3ec',
    '--text': '#2c352c',
    '--muted': '#7a7a6e',
    '--accent': '#4d7c5f',
    '--accent-2': '#c4623f',
    '--display': "'Outfit', sans-serif",
    '--body': "'Lora', serif",
    '--display-weight': '600',
    '--title-size': '128px',
    '--headline-size': '78px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--kicker-font': "'Outfit', sans-serif",
    '--card-bg': '#fffdf8',
    '--card-border': '#e4ddcf',
    '--card-shadow': '0 24px 56px -34px rgba(58,64,46,0.32)',
    '--radius': '20px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#2c352c',
    '--table-border': '#e4ddcf',
    '--track': '#e4ddcf',
    '--donut-hole': '#f7f3ec',
    '--bar-gap': '34px',
    '--bullet-color': '#4d7c5f',
    '--chip-bg': '#ece6d8',
    '--media-radius': '20px',
    '--media-border': '1px solid #e4ddcf',
    '--media-shadow': '0 48px 100px -42px rgba(58,64,46,0.46)',
    '--scrim':
      'linear-gradient(180deg, rgba(36,42,32,0.08) 0%, rgba(36,42,32,0.42) 52%, rgba(36,42,32,0.86) 100%)',
    '--pos': '#4d7c5f',
    '--neg': '#c4623f',
  },
  stageBg: '#ece6d8',
  assets: ['people-ops-cover.jpg', 'people-ops-fig.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.tl-when, .section-num { color: var(--accent-2); }
.step::before { color: var(--accent); }

/* Section divider — warm sage rule on cream */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--display); font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; font-size: 23px; color: var(--accent-2); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.96; letter-spacing: -0.025em; color: var(--text); text-wrap: balance; }
.divider-rule { width: 132px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 16px; }
.divider-sub { font-family: var(--body); font-style: italic; font-size: 34px; color: var(--muted); margin-top: 10px; max-width: 30ch; }

/* Headcount stat band — full-width tinted strip with hairline dividers */
.hcband { background: #fffdf8; border: 1px solid var(--card-border); border-radius: 22px; display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); padding: 54px 36px; box-shadow: var(--card-shadow); }
.hc { padding: 0 42px; }
.hc + .hc { border-left: 1px solid var(--card-border); }
.hc-num { font-family: var(--display); font-weight: 700; font-size: 86px; line-height: 1; letter-spacing: -0.025em; color: var(--accent); font-variant-numeric: tabular-nums; }
.hc-label { font-family: var(--body); font-size: 25px; line-height: 1.32; color: var(--muted); margin-top: 16px; }
.hc-delta { display: inline-flex; align-items: center; gap: 7px; font-family: var(--display); font-weight: 600; font-size: 23px; margin-top: 14px; color: var(--accent-2); }
.hc-delta::before { content: '\\2191'; font-size: 20px; }

/* Program cards — warm rounded card with a soft tinted icon chip */
.prog { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.pcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 40px 36px 38px; box-shadow: var(--card-shadow); }
.pcard-ic { width: 64px; height: 64px; border-radius: 18px; background: rgba(77,124,95,0.12); display: grid; place-items: center; color: var(--accent); font-family: var(--display); font-weight: 700; font-size: 28px; }
.pcard-ic.warm { background: rgba(196,98,63,0.12); color: var(--accent-2); }
.pcard-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.06; color: var(--text); margin-top: 24px; }
.pcard-d { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); margin-top: 12px; }
.pcard-tag { font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: 0.04em; color: var(--accent); margin-top: 16px; }

/* Team photo grid — montage tiles with a name plate */
.teamgrid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 26px; }
.tg { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--card-border); box-shadow: var(--card-shadow); aspect-ratio: 4 / 3; }
.tg img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tg-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(36,42,32,0) 38%, rgba(36,42,32,0.82) 100%); }
.tg-cap { position: absolute; left: 26px; right: 26px; bottom: 24px; color: #fff; }
.tg-team { font-family: var(--display); font-weight: 600; font-size: 31px; line-height: 1.05; }
.tg-meta { font-family: var(--body); font-size: 22px; opacity: 0.9; margin-top: 4px; }

/* Pulse-survey voice — warm quote cards with a leading mark */
.voices { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 28px; }
.voice { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 38px 36px 34px; box-shadow: var(--card-shadow); position: relative; }
.voice::before { content: '\\201C'; font-family: var(--display); font-weight: 700; font-size: 96px; line-height: 0.6; color: var(--accent-2); opacity: 0.55; display: block; height: 44px; }
.voice-q { font-family: var(--body); font-style: italic; font-size: 30px; line-height: 1.4; color: var(--text); margin-top: 6px; }
.voice-w { font-family: var(--display); font-weight: 600; font-size: 23px; letter-spacing: 0.02em; color: var(--muted); margin-top: 22px; }

/* Legend rows beside donuts / bars */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 31px; color: var(--text); }
.legend-dot { width: 18px; height: 18px; border-radius: 6px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-family: var(--display); font-weight: 600; font-variant-numeric: tabular-nums; color: var(--muted); }

/* Warm callout for a headline insight */
.note { border-left: 5px solid var(--accent-2); background: rgba(196,98,63,0.08); padding: 32px 40px; border-radius: 0 14px 14px 0; }
.note-k { font-family: var(--display); font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 12px; }

/* Big intro lede */
.lede { font-family: var(--display); font-weight: 500; font-size: 60px; line-height: 1.12; letter-spacing: -0.015em; color: var(--text); max-width: 22ch; }`,
  notes:
    'A complete year-in-people review: Outfit display + Lora serif body, ink-sage #2c352c on cream #f7f3ec, sage-green #4d7c5f primary with a terracotta #c4623f secondary, generous whitespace, no gradients. Open and close on the warm human full-bleed (assets/people-ops-cover.jpg); use the culture figure (assets/people-ops-fig.jpg) for the .split and reused in the .teamgrid montage. Signature pieces: the .hcband headcount stat band, .donut engagement scores with a .legend, .bars for what-people-value and DEI progress, .prog program cards (soft icon chips, .warm variant for terracotta), the .voices pulse-survey quote cards, and the .teamgrid photo montage. Use .table for hiring/attrition, .steps for forward priorities, .note for the headline insight. Warm and human, never corporate — let the people lead, keep the numbers tabular.',
  sampleSlides: [
    s({
      id: 'po-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">People &amp; Culture Review · FY2026</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">The year,<br/>in people.</h1>
    <p class="lead reveal">Northcurrent · A look at who we are, how we're growing, and where we're headed.</p>
  </div>
</div>`,
    }),
    s({
      id: 'po-headcount',
      name: 'Headcount & growth',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Headcount &amp; growth</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A bigger team, intentionally built.</h2>
  <div class="hcband reveal" style="--cols:4">
    <div class="hc"><div class="hc-num">428</div><div class="hc-label">Total team members</div><div class="hc-delta">31% YoY</div></div>
    <div class="hc"><div class="hc-num">102</div><div class="hc-label">New hires welcomed this year</div><div class="hc-delta">+18 vs plan</div></div>
    <div class="hc"><div class="hc-num">7.6%</div><div class="hc-label">Regretted attrition</div><div class="hc-delta" style="color:var(--accent)"><span style="font-style:normal">&#8595;</span> 2.1 pts</div></div>
    <div class="hc"><div class="hc-num">14</div><div class="hc-label">Offices &amp; remote hubs</div><div class="hc-delta">+3 regions</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Headcount</span></div>
</div>`,
    }),
    s({
      id: 'po-sec1',
      name: 'Section · Engagement',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Section 01</div>
  <div class="divider-title reveal">Engagement</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">How it feels to work here — in our own words and numbers.</p>
</div>`,
    }),
    s({
      id: 'po-engagement',
      name: 'Engagement score',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:360px;--p:81"><div class="donut-label">81</div></div>
    </div>
    <div>
      <div class="kicker">Engagement score</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:22px">Our highest reading yet.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:var(--accent)"></span>Favorable<span class="v">81%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#c9b78f"></span>Neutral<span class="v">12%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:var(--accent-2)"></span>Unfavorable<span class="v">7%</span></div>
      </div>
      <div class="note" style="margin-top:30px">
        <div class="note-k">Up year over year</div>
        <p class="body" style="max-width:none">Engagement rose <b>6 points</b>, with <b>92%</b> survey participation across every team.</p>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Engagement</span></div>
</div>`,
    }),
    s({
      id: 'po-values',
      name: 'What people value',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">What people value</div>
      <h2 class="headline" style="margin-top:8px">The things that make them stay.</h2>
      <p class="lead">Top drivers of favorability from this year's engagement survey, by share who named each.</p>
    </div>
    <div class="bars" style="--bars-height:360px;--bar-gap:30px">
      <div class="bar" style="--h:94%"><div class="bar-fill" data-val="89%"></div><div class="bar-label">Great<br/>teammates</div></div>
      <div class="bar" style="--h:82%"><div class="bar-fill" data-val="78%"></div><div class="bar-label">Meaningful<br/>work</div></div>
      <div class="bar" style="--h:74%"><div class="bar-fill" data-val="70%"></div><div class="bar-label">Flexibility</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="62%"></div><div class="bar-label">Growth</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="55%"></div><div class="bar-label">Leadership</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Engagement</span></div>
</div>`,
    }),
    s({
      id: 'po-voices',
      name: 'Pulse-survey voices',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">In their own words</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Pulse-survey voices.</h2>
  <div class="voices reveal" style="--cols:3">
    <div class="voice"><p class="voice-q">I've never had a manager invest in my growth like this. It changed how I see my career here.</p><div class="voice-w">Engineering · 2 yrs</div></div>
    <div class="voice"><p class="voice-q">The flexibility is real, not a slogan. I can do my best work and still be there for my family.</p><div class="voice-w">Customer Success · 4 yrs</div></div>
    <div class="voice"><p class="voice-q">For the first time at work, I feel like the whole me is welcome in the room.</p><div class="voice-w">Design · 1 yr</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Engagement</span></div>
</div>`,
    }),
    s({
      id: 'po-sec2',
      name: 'Section · Growth',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Section 02</div>
  <div class="divider-title reveal">Growth</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Who joined, who we kept, and how we're helping people grow.</p>
</div>`,
    }),
    s({
      id: 'po-hiring',
      name: 'Hiring & attrition',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Hiring &amp; attrition</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:18px">Healthy in, steady through.</h2>
      <table class="table" style="--table-size:28px">
        <thead><tr><th>Team</th><th class="num">Hires</th><th class="num">Attrition</th><th class="num">Net</th></tr></thead>
        <tbody>
          <tr><td>Engineering</td><td class="num">38</td><td class="num">6.4%</td><td class="num pos">+31</td></tr>
          <tr><td>Go-to-market</td><td class="num">29</td><td class="num">9.1%</td><td class="num pos">+18</td></tr>
          <tr><td>Customer</td><td class="num">21</td><td class="num">7.0%</td><td class="num pos">+14</td></tr>
          <tr class="row-em"><td>Company</td><td class="num">102</td><td class="num">7.6%</td><td class="num pos">+71</td></tr>
        </tbody>
      </table>
    </div>
    <div class="bars" style="--bars-height:340px;--bar-gap:30px">
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="9.7%"></div><div class="bar-label">FY23</div></div>
      <div class="bar" style="--h:84%"><div class="bar-fill" data-val="8.5%"></div><div class="bar-label">FY24</div></div>
      <div class="bar" style="--h:74%"><div class="bar-fill" data-val="7.6%"></div><div class="bar-label">FY25</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="6.8%"></div><div class="bar-label">FY26 goal</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Growth</span></div>
</div>`,
    }),
    s({
      id: 'po-learning',
      name: 'Learning & development',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Learning &amp; development</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Growing people, on purpose.</h2>
  <div class="prog reveal" style="--cols:3">
    <div class="pcard"><div class="pcard-ic">LP</div><div class="pcard-t">Learning budgets</div><div class="pcard-d">Every team member has a personal budget for courses, books, and conferences.</div><div class="pcard-tag">94% used it this year</div></div>
    <div class="pcard"><div class="pcard-ic warm">MG</div><div class="pcard-t">Manager academy</div><div class="pcard-d">A cohort program for new managers — coaching, feedback, and peer circles.</div><div class="pcard-tag">61 managers trained</div></div>
    <div class="pcard"><div class="pcard-ic">MV</div><div class="pcard-t">Internal mobility</div><div class="pcard-d">Open roles surface internally first; we promote and transfer before we hire out.</div><div class="pcard-tag">23% of roles filled within</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Growth</span></div>
</div>`,
    }),
    s({
      id: 'po-sec3',
      name: 'Section · Belonging',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Section 03</div>
  <div class="divider-title reveal">Belonging</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">The work of building a place where everyone can do their best.</p>
</div>`,
    }),
    s({
      id: 'po-dei',
      name: 'DEI progress',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">DEI progress</div>
      <h2 class="headline" style="margin-top:8px">Representation, moving the right way.</h2>
      <div class="note" style="margin-top:26px">
        <div class="note-k">Where we focus next</div>
        <p class="body" style="max-width:none">Women in leadership rose to <b>41%</b>; closing the senior-IC gap is our FY26 priority.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:340px;--bar-gap:26px">
      <div class="bar" style="--h:88%"><div class="bar-fill" data-val="47%"></div><div class="bar-label">Women,<br/>company</div></div>
      <div class="bar" style="--h:76%"><div class="bar-fill" data-val="41%"></div><div class="bar-label">Women in<br/>leadership</div></div>
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="34%"></div><div class="bar-label">Underrep.<br/>groups</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="0.99"></div><div class="bar-label">Pay equity<br/>ratio</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Belonging</span></div>
</div>`,
    }),
    s({
      id: 'po-programs',
      name: 'Programs & benefits',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Programs &amp; benefits</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Care that shows up in real life.</h2>
  <div class="prog reveal" style="--cols:3">
    <div class="pcard"><div class="pcard-ic warm">PL</div><div class="pcard-t">Paid family leave</div><div class="pcard-d">16 fully-paid weeks for every new parent, plus a phased return-to-work ramp.</div><div class="pcard-tag">38 parents supported</div></div>
    <div class="pcard"><div class="pcard-ic">WB</div><div class="pcard-t">Wellbeing stipend</div><div class="pcard-d">A monthly stipend for therapy, fitness, and whatever keeps people well.</div><div class="pcard-tag">88% participation</div></div>
    <div class="pcard"><div class="pcard-ic warm">ERG</div><div class="pcard-t">Resource groups</div><div class="pcard-d">Nine employee resource groups with real budgets and executive sponsors.</div><div class="pcard-tag">9 active ERGs</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Belonging</span></div>
</div>`,
    }),
    s({
      id: 'po-figure',
      name: 'Culture in practice',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Culture in practice</div>
    <h2 class="headline reveal">It's the small moments that compound.</h2>
    <ul class="bullets reveal" style="--gap:22px">
      <li class="bullet"><span><b>Mentor coffees</b> pair every new hire with a guide in week one.</span></li>
      <li class="bullet"><span><b>Demo days</b> let any team show the work they're proud of.</span></li>
      <li class="bullet"><span><b>Peer recognition</b> turns everyday wins into a shared habit.</span></li>
    </ul>
    <div class="stats reveal" style="margin-top:8px">
      <div class="stat"><div class="stat-num">4.6k</div><div class="stat-label">Peer kudos sent this year</div></div>
      <div class="stat"><div class="stat-num">96%</div><div class="stat-label">Say they'd recommend us</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'po-sec4',
      name: 'Section · Ahead',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Section 04</div>
  <div class="divider-title reveal">The year<br/>ahead</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Where we're putting our energy next.</p>
</div>`,
    }),
    s({
      id: 'po-priorities',
      name: 'Priorities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">FY26 priorities</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Four commitments for the year ahead.</h2>
  <ol class="steps reveal" style="--gap:28px">
    <li class="step"><span><b>Close the senior-IC representation gap</b> through sponsorship and targeted pipelines.</span></li>
    <li class="step"><span><b>Scale the manager academy</b> to every people leader, with quarterly coaching.</span></li>
    <li class="step"><span><b>Make mobility the default</b> — publish a clear internal-first path for every role.</span></li>
    <li class="step"><span><b>Protect what people value</b> — defend flexibility and great teammates as we grow.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Ahead</span></div>
</div>`,
    }),
    s({
      id: 'po-team',
      name: 'Team highlights',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Around the company</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">A few of the teams who made the year.</h2>
  <div class="teamgrid reveal" style="--cols:3">
    <div class="tg"><img src="${FIG_IMG}" alt=""><div class="tg-scrim"></div><div class="tg-cap"><div class="tg-team">Platform Engineering</div><div class="tg-meta">Shipped the reliability rewrite</div></div></div>
    <div class="tg"><img src="${COVER_IMG}" alt=""><div class="tg-scrim"></div><div class="tg-cap"><div class="tg-team">Customer Success</div><div class="tg-meta">Held NPS at an all-time high</div></div></div>
    <div class="tg"><img src="${FIG_IMG}" alt=""><div class="tg-scrim"></div><div class="tg-cap"><div class="tg-team">People &amp; Culture</div><div class="tg-meta">Launched the manager academy</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Ahead</span></div>
</div>`,
    }),
    s({
      id: 'po-quote',
      name: 'Culture quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:76px">"We don't build a culture in the offsite. We build it in how we treat each other on an ordinary Tuesday."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nair</span><span class="cite-role">Chief People Officer, Northcurrent</span></div>
  <div class="runner reveal"><span class="runner-brand">Northcurrent People</span><span class="runner-label">Culture</span></div>
</div>`,
    }),
    s({
      id: 'po-close',
      name: 'Thank you',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Thank you</div>
    <h2 class="display reveal" style="--display-size:120px">To every one<br/>of you.</h2>
    <p class="lead reveal">people@northcurrent.com · The full report and team dashboards are on the People hub.</p>
  </div>
</div>`,
    }),
  ],
}
