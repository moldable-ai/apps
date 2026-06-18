import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/all-hands-cover.jpg'
const CULTURE_IMG = 'assets/all-hands-culture.jpg'

export const allHands: Template = {
  id: 'all-hands',
  categories: ['Company'],
  name: 'All-Hands',
  tagline: 'Warm, confident company all-hands',
  audiences: ['company', 'team', 'all-hands', 'leadership'],
  description:
    'A warm, human company all-hands in deep teal and amber on cream. Circled section numbers, goal progress bars, a team photo grid, amber-tick win cards, and an agenda timeline carry a full quarter-in-review story you tailor with your own wins, goals, and people.',
  fonts: {
    display: 'Clash Display',
    body: 'Satoshi',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap',
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f4ec',
    '--text': '#1a1c1a',
    '--muted': '#6b6f68',
    '--accent': '#0f4c4c',
    '--accent-2': '#f0a830',
    '--display': "'Clash Display', sans-serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '600',
    '--title-size': '136px',
    '--headline-size': '80px',
    '--lead-size': '38px',
    '--subhead-size': '48px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#fffdf8',
    '--card-border': 'rgba(15,76,76,0.14)',
    '--card-shadow': '0 26px 60px -38px rgba(15,76,76,0.45)',
    '--radius': '20px',
    '--stat-size': '108px',
    '--metric-size': '120px',
    '--th-border': '#0f4c4c',
    '--table-border': 'rgba(15,76,76,0.14)',
    '--track': 'rgba(15,76,76,0.12)',
    '--donut-hole': '#f7f4ec',
    '--bar-gap': '34px',
    '--chip-bg': 'rgba(15,76,76,0.06)',
    '--media-radius': '20px',
    '--media-border': '1px solid rgba(15,76,76,0.12)',
    '--media-shadow': '0 50px 110px -45px rgba(15,76,76,0.5)',
    '--scrim':
      'linear-gradient(180deg, rgba(12,40,40,0.08) 0%, rgba(12,40,40,0.45) 52%, rgba(12,40,40,0.9) 100%)',
    '--bleed-text': '#fbf8f1',
    '--pos': '#2f8f6b',
    '--neg': '#c9603a',
  },
  stageBg: '#ece7da',
  assets: ['all-hands-cover.jpg', 'all-hands-culture.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.tl-when { color: var(--accent); }
.cite-dot { background: var(--accent-2); }
.runner-brand::before { background: var(--accent-2); }
.step::before { color: var(--accent); }

/* Section divider — big circled number signature */
.numsec { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; align-items: center; gap: 70px; }
.numcircle { flex: 0 0 auto; width: 300px; height: 300px; border-radius: 50%; border: 4px solid var(--accent); display: grid; place-items: center; }
.numcircle span { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 1; color: var(--accent); }
.numcircle.amber { border-color: var(--accent-2); }
.numcircle.amber span { color: var(--accent-2); }
.numsec-kicker { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; font-size: 22px; color: var(--accent-2); }
.numsec-title { font-family: var(--display); font-weight: 600; font-size: 132px; line-height: 0.96; letter-spacing: -0.02em; color: var(--text); margin-top: 14px; text-wrap: balance; }

/* Win cards — amber tick signature */
.wins { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.win { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 40px 38px 38px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 14px; }
.win-tick { width: 56px; height: 56px; border-radius: 50%; background: var(--accent-2); display: grid; place-items: center; color: #1a1c1a; font-size: 30px; font-weight: 800; line-height: 1; }
.win-tick::before { content: '\\2713'; }
.win-metric { font-family: var(--display); font-weight: 600; font-size: 70px; line-height: 1; letter-spacing: -0.02em; color: var(--accent); font-variant-numeric: tabular-nums; margin-top: 6px; }
.win-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.05; color: var(--text); }
.win-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); }

/* Goal progress bars signature */
.goals { display: flex; flex-direction: column; gap: 42px; }
.goal-top { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; margin-bottom: 16px; }
.goal-name { font-family: var(--display); font-weight: 600; font-size: 40px; color: var(--text); }
.goal-pct { font-family: var(--display); font-weight: 600; font-size: 40px; color: var(--accent); font-variant-numeric: tabular-nums; }
.goal-track { height: 22px; border-radius: 999px; background: var(--track); overflow: hidden; }
.goal-fill { height: 100%; border-radius: 999px; background: var(--accent); width: var(--v, 50%); }
.goal-fill.amber { background: var(--accent-2); }
.goal-note { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 12px; }

/* Team photo grid signature */
.team-grid { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 24px; }
.tcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; overflow: hidden; box-shadow: var(--card-shadow); }
.tcard-photo { aspect-ratio: 4 / 3; background: var(--accent); position: relative; overflow: hidden; }
.tcard-photo::after { content: ''; position: absolute; inset: 0; background: linear-gradient(150deg, var(--accent) 0%, #0c3a3a 100%); }
.tcard-photo .ini { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--display); font-weight: 600; font-size: 64px; color: var(--accent-2); z-index: 1; }
.tcard-body { padding: 24px 26px 28px; }
.tcard-name { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); }
.tcard-role { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 4px; }

/* Agenda timeline signature — dotted spine */
.atl { display: flex; flex-direction: column; }
.atl-row { display: grid; grid-template-columns: 88px 1fr; gap: 36px; align-items: flex-start; }
.atl-mark { display: flex; flex-direction: column; align-items: center; }
.atl-dot { width: 26px; height: 26px; border-radius: 50%; background: var(--accent); border: 5px solid var(--bg); box-shadow: 0 0 0 2px var(--accent); flex: 0 0 auto; }
.atl-line { width: 3px; flex: 1; background: var(--track); min-height: 44px; }
.atl-row:last-child .atl-line { display: none; }
.atl-num { font-family: var(--body); font-weight: 700; font-size: 20px; letter-spacing: 0.14em; color: var(--accent-2); }
.atl-t { font-family: var(--display); font-weight: 600; font-size: 42px; line-height: 1.02; color: var(--text); margin-top: 2px; }
.atl-d { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 6px; padding-bottom: 30px; }

/* One-liner callout */
.oneline { font-family: var(--display); font-weight: 500; font-size: 66px; line-height: 1.14; letter-spacing: -0.01em; color: var(--text); max-width: 20ch; }
.oneline b { color: var(--accent); font-weight: 600; }`,
  notes:
    'A complete Q2 company all-hands: Clash Display + Satoshi, near-black text on cream #f7f4ec, deep-teal #0f4c4c primary with warm-amber #f0a830 secondary, generous whitespace, no gradients on type. Open and close on the warm office full-bleed (assets/all-hands-cover.jpg); use the culture figure (assets/all-hands-culture.jpg) for the people split. Signature pieces: big circled section numbers (.numsec/.numcircle), .win amber-tick cards for wins, .goals progress bars for OKRs, the .team-grid photo grid for new joiners, and the .atl agenda timeline. Use .stats for headline metrics, .bars for a deep-dive, .steps for priorities, .timeline for the roadmap, .checks for values, .quote for customer love. Warm and human, never corporate-cold — celebrate the team, keep numbers tabular.',
  sampleSlides: [
    s({
      id: 'ah-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Company All-Hands · Q2 2026</div>
    <h1 class="display reveal" style="--display-size:148px;margin-top:10px">One quarter,<br/>one team.</h1>
    <p class="lead reveal">Where we landed, what we learned, and where we're headed next.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ah-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Agenda</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The next forty minutes.</h2>
  <div class="atl reveal">
    <div class="atl-row"><div class="atl-mark"><div class="atl-dot"></div><div class="atl-line"></div></div><div><div class="atl-num">01</div><div class="atl-t">The quarter in one line</div><div class="atl-d">Where we landed and the headline numbers.</div></div></div>
    <div class="atl-row"><div class="atl-mark"><div class="atl-dot"></div><div class="atl-line"></div></div><div><div class="atl-num">02</div><div class="atl-t">Our wins</div><div class="atl-d">The work we're proudest of this quarter.</div></div></div>
    <div class="atl-row"><div class="atl-mark"><div class="atl-dot"></div><div class="atl-line"></div></div><div><div class="atl-num">03</div><div class="atl-t">Our focus</div><div class="atl-d">Priorities, goals, and the roadmap ahead.</div></div></div>
    <div class="atl-row"><div class="atl-mark"><div class="atl-dot"></div></div><div><div class="atl-num">04</div><div class="atl-t">Our people</div><div class="atl-d">New faces, shout-outs, and how we live our values.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'ah-oneline',
      name: 'The quarter in one line',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The quarter in one line</div>
  <p class="oneline reveal" style="margin-top:18px">We grew faster than plan, shipped the launch on time, and our customers <b>noticed</b>.</p>
  <div class="stats reveal" style="margin-top:60px">
    <div class="stat"><div class="stat-num">+34%</div><div class="stat-label">Revenue, quarter over quarter</div></div>
    <div class="stat"><div class="stat-num">9,400</div><div class="stat-label">New active teams onboarded</div></div>
    <div class="stat"><div class="stat-num">71</div><div class="stat-label">Net promoter score, all-time high</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">The quarter</span></div>
</div>`,
    }),
    s({
      id: 'ah-sec1',
      name: 'Section · Our wins',
      transition: 'fade',
      bodyHtml: `<div class="numsec">
  <div class="numcircle reveal"><span>01</span></div>
  <div>
    <div class="numsec-kicker reveal">Section one</div>
    <div class="numsec-title reveal">Our<br/>wins.</div>
  </div>
</div>`,
    }),
    s({
      id: 'ah-wins',
      name: 'Top wins',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Top wins this quarter</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Three we're proudest of.</h2>
  <div class="wins reveal" style="--cols:3">
    <div class="win"><div class="win-tick"></div><div class="win-metric">12 days</div><div class="win-t">Shipped Atlas on time</div><div class="win-d">Our biggest launch ever went out a day early, with zero rollback.</div></div>
    <div class="win"><div class="win-tick"></div><div class="win-metric">−41%</div><div class="win-t">Cut support wait time</div><div class="win-d">First-response time dropped from 9 hours to under 6 — across every region.</div></div>
    <div class="win"><div class="win-tick"></div><div class="win-metric">3</div><div class="win-t">New marquee customers</div><div class="win-d">Three industry leaders went live and became reference accounts.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Our wins</span></div>
</div>`,
    }),
    s({
      id: 'ah-deepdive',
      name: 'Metric deep-dive',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Growth deep-dive</div>
      <h2 class="headline" style="margin-top:8px">Four quarters of momentum.</h2>
      <p class="lead">Active teams have compounded every quarter since the redesign shipped — and Q2 was the steepest yet.</p>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:44%"><div class="bar-fill" data-val="4.1K"></div><div class="bar-label">Q3 '25</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="5.4K"></div><div class="bar-label">Q4 '25</div></div>
      <div class="bar" style="--h:74%"><div class="bar-fill" data-val="7.0K"></div><div class="bar-label">Q1 '26</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="9.4K"></div><div class="bar-label">Q2 '26</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Deep-dive</span></div>
</div>`,
    }),
    s({
      id: 'ah-scorecard',
      name: 'Wins scorecard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">By the numbers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">How the quarter scored.</h2>
  <table class="table reveal">
    <thead><tr><th>Metric</th><th class="num">Q1</th><th class="num">Q2</th><th class="num">Change</th></tr></thead>
    <tbody>
      <tr><td>Active teams</td><td class="num">7,000</td><td class="num">9,400</td><td class="num pos">+34%</td></tr>
      <tr><td>Net revenue retention</td><td class="num">112%</td><td class="num">119%</td><td class="num pos">+7 pts</td></tr>
      <tr><td>Support first-response</td><td class="num">9.2h</td><td class="num">5.4h</td><td class="num pos">−41%</td></tr>
      <tr><td>NPS</td><td class="num">64</td><td class="num">71</td><td class="num pos">+7</td></tr>
      <tr class="row-em"><td>Net promoter detractors</td><td class="num">11%</td><td class="num">6%</td><td class="num pos">−5 pts</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Scorecard</span></div>
</div>`,
    }),
    s({
      id: 'ah-quote',
      name: 'Customer love',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Customer love</div>
  <blockquote class="quote reveal" style="--quote-size:76px;margin-top:18px">"Atlas changed how our whole team plans the week. It feels like it was built by people who actually do the work."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Raman</span><span class="cite-role">Head of Operations, Meridian Health</span></div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Customer love</span></div>
</div>`,
    }),
    s({
      id: 'ah-sec2',
      name: 'Section · Our focus',
      transition: 'fade',
      bodyHtml: `<div class="numsec">
  <div class="numcircle amber reveal"><span>02</span></div>
  <div>
    <div class="numsec-kicker reveal">Section two</div>
    <div class="numsec-title reveal">Our<br/>focus.</div>
  </div>
</div>`,
    }),
    s({
      id: 'ah-priorities',
      name: 'Top priorities',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Next quarter</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Four things, done well.</h2>
  <ol class="steps reveal" style="--gap:28px">
    <li class="step"><span><b>Make Atlas the default</b> — migrate every existing team off the legacy planner by July.</span></li>
    <li class="step"><span><b>Win the enterprise tier</b> — ship SSO, audit logs, and admin controls.</span></li>
    <li class="step"><span><b>Delight on mobile</b> — a ground-up app that's faster than the web.</span></li>
    <li class="step"><span><b>Keep support world-class</b> — hold first-response under five hours as we scale.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Priorities</span></div>
</div>`,
    }),
    s({
      id: 'ah-goals',
      name: 'Goals & progress',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Company goals · where we stand</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:40px">Progress toward our Q3 OKRs.</h2>
  <div class="goals reveal">
    <div class="goal"><div class="goal-top"><div class="goal-name">Migrate teams to Atlas</div><div class="goal-pct">78%</div></div><div class="goal-track"><div class="goal-fill" style="--v:78%"></div></div><div class="goal-note">7,300 of 9,400 teams moved · on track for full migration by July 31.</div></div>
    <div class="goal"><div class="goal-top"><div class="goal-name">Enterprise readiness</div><div class="goal-pct amber" style="color:var(--accent-2)">45%</div></div><div class="goal-track"><div class="goal-fill amber" style="--v:45%"></div></div><div class="goal-note">SSO shipped; audit logs and admin roles in review — slightly behind.</div></div>
    <div class="goal"><div class="goal-top"><div class="goal-name">Mobile app beta</div><div class="goal-pct">62%</div></div><div class="goal-track"><div class="goal-fill" style="--v:62%"></div></div><div class="goal-note">Core flows live in internal beta; public TestFlight in three weeks.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Goals</span></div>
</div>`,
    }),
    s({
      id: 'ah-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The road ahead</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Where we're headed.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">July</div><div class="tl-what"><b>Full Atlas migration</b> — every team on the new planner, legacy retired.</div></div>
    <div class="tl-row"><div class="tl-when">August</div><div class="tl-what"><b>Enterprise GA</b> — SSO, audit, and admin controls ship to all plans.</div></div>
    <div class="tl-row"><div class="tl-when">September</div><div class="tl-what"><b>Mobile public beta</b> — iOS and Android open to every customer.</div></div>
    <div class="tl-row"><div class="tl-when">Q4</div><div class="tl-what"><b>First integrations marketplace</b> — partners can build on top of Atlas.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'ah-sec3',
      name: 'Section · Our people',
      transition: 'fade',
      bodyHtml: `<div class="numsec">
  <div class="numcircle reveal"><span>03</span></div>
  <div>
    <div class="numsec-kicker reveal">Section three</div>
    <div class="numsec-title reveal">Our<br/>people.</div>
  </div>
</div>`,
    }),
    s({
      id: 'ah-joiners',
      name: 'New joiners',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Welcome aboard</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Eleven new faces this quarter.</h2>
  <div class="team-grid reveal" style="--cols:4">
    <div class="tcard"><div class="tcard-photo"><span class="ini">MO</span></div><div class="tcard-body"><div class="tcard-name">Maya Osei</div><div class="tcard-role">Product Designer</div></div></div>
    <div class="tcard"><div class="tcard-photo"><span class="ini">JL</span></div><div class="tcard-body"><div class="tcard-name">Jon Lindqvist</div><div class="tcard-role">Staff Engineer</div></div></div>
    <div class="tcard"><div class="tcard-photo"><span class="ini">AR</span></div><div class="tcard-body"><div class="tcard-name">Aisha Rahman</div><div class="tcard-role">Customer Success</div></div></div>
    <div class="tcard"><div class="tcard-photo"><span class="ini">DT</span></div><div class="tcard-body"><div class="tcard-name">Diego Torres</div><div class="tcard-role">Sales, EMEA</div></div></div>
  </div>
  <p class="fine reveal" style="margin-top:26px">…and seven more across engineering, support, and people ops. Say hi in #welcome.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">New joiners</span></div>
</div>`,
    }),
    s({
      id: 'ah-shoutouts',
      name: 'Shout-outs',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Shout-outs</div>
    <h2 class="headline reveal">The people behind the quarter.</h2>
    <ul class="bullets reveal" style="--gap:24px;margin-top:6px">
      <li class="bullet"><span><b>The Atlas crew</b> for a flawless launch night — and the calm that came with it.</span></li>
      <li class="bullet"><span><b>Aisha &amp; the CS team</b> for turning three trials into reference customers.</span></li>
      <li class="bullet"><span><b>Sam in support</b> for personally answering 1,200 tickets and still smiling.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${CULTURE_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'ah-values',
      name: 'Living our values',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we live our values</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Seen in the work this quarter.</h2>
  <div class="cols-2 reveal" style="gap:30px 96px">
    <ul class="checks" style="--gap:26px">
      <li class="check"><span><b>Customers first</b> — we shipped the two features they asked for most.</span></li>
      <li class="check"><span><b>Default to trust</b> — every team went remote-first for launch week.</span></li>
    </ul>
    <ul class="checks" style="--gap:26px">
      <li class="check"><span><b>Sweat the craft</b> — zero P1 bugs in the Atlas release.</span></li>
      <li class="check"><span><b>Grow together</b> — 22 internal mentorships started this quarter.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Our values</span></div>
</div>`,
    }),
    s({
      id: 'ah-thanks',
      name: 'Thank you',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Q&amp;A · Thank you</div>
    <h2 class="display reveal" style="--display-size:128px">Onward,<br/>together.</h2>
    <p class="lead reveal">Questions are open — drop them in the chat or come find us after.</p>
  </div>
</div>`,
    }),
  ],
}
