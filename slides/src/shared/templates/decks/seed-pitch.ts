import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/seed-pitch-cover.jpg'
const FIG_IMG = 'assets/seed-pitch-fig.jpg'

export const seedPitch: Template = {
  id: 'seed-pitch',
  categories: ['Fundraising'],
  name: 'Seed Pitch',
  tagline: 'Warm, founder-personal seed-round story',
  audiences: ['founder', 'pitch', 'investor', 'seed'],
  description:
    'A warm, optimistic seed pitch in cream and sunrise orange with a single teal accent. Sentient serif over Satoshi, a founder-story full-bleed, an oversized problem statement, traction bars, a market donut, a headshots row, and a warm "ask" callout — a complete, personal raise narrative you make your own.',
  fonts: {
    display: 'Sentient',
    body: 'Satoshi',
    links: [
      'https://api.fontshare.com/v2/css?f[]=sentient@400,500,600,700&display=swap',
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fff8f0',
    '--text': '#1c1917',
    '--muted': '#8a7f76',
    '--accent': '#f97316',
    '--accent-2': '#f97316',
    '--display': "'Sentient', serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '600',
    '--title-size': '130px',
    '--headline-size': '80px',
    '--lead-size': '38px',
    '--subhead-size': '48px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#fffdf9',
    '--card-border': '#efe3d4',
    '--card-shadow': '0 22px 50px -34px rgba(120,72,24,0.30)',
    '--radius': '20px',
    '--stat-size': '108px',
    '--metric-size': '120px',
    '--bullet-color': '#f97316',
    '--th-border': '#1c1917',
    '--table-border': '#efe3d4',
    '--rule-color': '#efe3d4',
    '--track': '#f3e7d8',
    '--donut-hole': '#fff8f0',
    '--bar-gap': '34px',
    '--media-radius': '22px',
    '--media-border': '1px solid #efe3d4',
    '--media-shadow': '0 50px 110px -45px rgba(120,72,24,0.42)',
    '--scrim':
      'linear-gradient(180deg, rgba(36,22,8,0.06) 0%, rgba(36,22,8,0.34) 52%, rgba(28,18,8,0.86) 100%)',
    '--pos': '#14b8a6',
    '--neg': '#e0552f',
  },
  stageBg: '#f3e7d8',
  assets: ['seed-pitch-cover.jpg', 'seed-pitch-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }

/* Warm section divider — cream field, sunrise rule */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; font-size: 22px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.96; letter-spacing: -0.02em; color: var(--text); }
.divider-sub { font-family: var(--body); font-size: 34px; line-height: 1.32; color: var(--muted); max-width: 30ch; margin-top: 6px; }
.divider-rule { width: 130px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 8px; }

/* Oversized problem statement — big calm serif with one orange word */
.bigstate { font-family: var(--display); font-weight: 600; font-size: 116px; line-height: 1.02; letter-spacing: -0.02em; color: var(--text); max-width: 17ch; text-wrap: balance; }
.bigstate em { font-style: normal; color: var(--accent); }
.bigstate-foot { font-family: var(--body); font-size: 32px; line-height: 1.4; color: var(--muted); max-width: 40ch; margin-top: 18px; }

/* Founder note — warm, personal aside */
.fnote { border-left: 5px solid var(--accent); padding: 30px 40px; background: #fffdf9; border-radius: 0 16px 16px 0; box-shadow: var(--card-shadow); }
.fnote-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 12px; }
.fnote-sig { font-family: var(--display); font-weight: 500; font-style: italic; font-size: 32px; color: var(--text); margin-top: 16px; }

/* Why-now reason cards — soft warm tiles */
.why { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 28px; }
.why-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 34px; box-shadow: var(--card-shadow); position: relative; }
.why-yr { font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--accent); }
.why-t { font-family: var(--display); font-weight: 600; font-size: 36px; line-height: 1.06; color: var(--text); margin-top: 14px; }
.why-d { font-family: var(--body); font-size: 25px; line-height: 1.4; color: var(--muted); margin-top: 12px; }

/* Traction bars — caption + accent fill, soft track */
.tbars { background: #fffdf9; border: 1px solid var(--card-border); border-radius: 20px; padding: 56px 50px 44px; box-shadow: var(--card-shadow); }

/* Market donut legend */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 18px; height: 18px; border-radius: 6px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-variant-numeric: tabular-nums; color: var(--muted); }

/* Team headshots row */
.team { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 36px; }
.member { display: flex; flex-direction: column; gap: 16px; }
.face { aspect-ratio: 1 / 1; border-radius: 24px; display: grid; place-items: center; font-family: var(--display); font-weight: 600; font-size: 72px; color: #fffdf9; box-shadow: var(--card-shadow); }
.face.a { background: #f97316; } .face.b { background: #14b8a6; } .face.c { background: #c2410c; } .face.d { background: #1c1917; }
.member-n { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.04; color: var(--text); }
.member-r { font-family: var(--body); font-size: 24px; color: var(--muted); }
.member-x { font-family: var(--body); font-size: 23px; line-height: 1.35; color: var(--muted); margin-top: 2px; }

/* The ask — big warm callout */
.ask { background: #1c1917; border-radius: 24px; padding: 64px 70px; color: #fff8f0; display: grid; grid-template-columns: 1fr 1.2fr; gap: 70px; align-items: center; }
.ask-amt { font-family: var(--display); font-weight: 700; font-size: 132px; line-height: 0.96; letter-spacing: -0.02em; color: var(--accent); }
.ask-sub { font-family: var(--body); font-size: 30px; line-height: 1.4; color: #d8cfc4; margin-top: 14px; }
.unlock { display: flex; flex-direction: column; gap: 22px; margin: 0; padding: 0; list-style: none; }
.unlock-item { display: flex; gap: 22px; align-items: flex-start; font-family: var(--body); font-size: 31px; line-height: 1.32; color: #fff8f0; }
.unlock-item::before { content: '\\2192'; flex: none; color: var(--accent); font-weight: 700; }
.unlock-item b { color: #fff8f0; font-weight: 700; }`,
  notes:
    'A complete, warm seed-stage pitch told personally by the founder: Sentient serif display + Satoshi body, ink #1c1917 on cream #fff8f0, ONE sunrise-orange (#f97316) accent with a single teal (#14b8a6) for positives. Open and close on the warm sunrise full-bleed (assets/seed-pitch-cover.jpg); use the sunlit founding-team figure (assets/seed-pitch-fig.jpg) for the founder "why" full-bleed and the product split. Signature pieces: the oversized .bigstate problem line (one orange word), the .fnote founder note for personal voice, .why-card "why now" tiles, .tbars traction bars, the market .donut + .legend, the .team headshots row (.face A/B/C/D), and the dark .ask callout (.ask-amt + .unlock list). Restraint above all — generous cream whitespace, no gradients, optimistic and human. Keep numbers tabular and the founder voice in first person.',
  sampleSlides: [
    s({
      id: 'seed-1',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Seed Round · 2026</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Mornings,<br/>made gentle.</h1>
    <p class="lead reveal">Aubade — the calm-morning app that helps people start the day on their own terms.</p>
  </div>
</div>`,
    }),
    s({
      id: 'seed-2',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where we're headed today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">A short, honest story.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>Why I'm building this — and the morning that started it.</span></li>
    <li class="step"><span>The problem, why now, and the calm we're shipping.</span></li>
    <li class="step"><span>Early traction, the market, and how we make money.</span></li>
    <li class="step"><span>The team, the plan, and what your investment unlocks.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'seed-3',
      name: "Founder's why",
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${FIG_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Why I'm here</div>
    <h2 class="display reveal" style="--display-size:104px;max-width:18ch">I lost my mornings to my phone — so I built the opposite.</h2>
    <p class="lead reveal" style="max-width:34ch">Three years of dreading the alarm taught me the day is won or lost in the first hour.</p>
  </div>
</div>`,
    }),
    s({
      id: 'seed-4',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The problem</div>
  <div class="bigstate reveal" style="margin-top:12px">The first thing <em>89%</em> of us touch each day is the one thing built to hijack it.</div>
  <p class="bigstate-foot reveal">Alarm, feed, inbox, dread — in that order, before we're even awake. Mornings set the tone for everything after, and they're being quietly stolen.</p>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'seed-5',
      name: 'Why now',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Why now</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">The world finally wants this.</h2>
  <div class="why reveal" style="--cols:3">
    <div class="why-card"><div class="why-yr">2023</div><div class="why-t">Screen-time guilt went mainstream</div><div class="why-d">"Digital wellbeing" became a default phone setting, not a niche idea.</div></div>
    <div class="why-card"><div class="why-yr">2025</div><div class="why-t">Wearables made mornings measurable</div><div class="why-d">Sleep and readiness scores gave us the data to build a real ritual on.</div></div>
    <div class="why-card"><div class="why-yr">2026</div><div class="why-t">On-device AI got personal</div><div class="why-d">A gentle, private morning coach now runs entirely on the phone.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Why now</span></div>
</div>`,
    }),
    s({
      id: 'seed-6',
      name: 'Section · The solution',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Our solution</div>
  <div class="divider-title reveal">A morning that<br/>roots for you.</div>
  <div class="divider-sub reveal">Not another alarm. A calm, guided first hour that adapts to how you slept and what your day needs.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'seed-7',
      name: 'The solution',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What Aubade does</div>
      <h2 class="headline" style="margin-top:8px">One gentle ritual, tuned to your day.</h2>
      <div class="fnote" style="margin-top:28px">
        <div class="fnote-k">The promise</div>
        <p class="body" style="max-width:none">No feed, no inbox, no metrics screaming at you — just the right next small thing, in the right order.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:28px">
      <li class="bullet"><span>A <b>sunrise wake</b> that reads your sleep, not the clock.</span></li>
      <li class="bullet"><span>A <b>two-minute plan</b> for the day, spoken not scrolled.</span></li>
      <li class="bullet"><span>Breath, light, and movement <b>cues</b> that flex to your energy.</span></li>
      <li class="bullet"><span>The phone stays <b>locked</b> until the ritual is done.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">The solution</span></div>
</div>`,
    }),
    s({
      id: 'seed-8',
      name: 'The product',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">The product</div>
    <h2 class="headline reveal">Calm you can feel by day three.</h2>
    <p class="lead reveal">Aubade lives on the lock screen and the wrist. It learns your patterns in a week, runs fully on-device, and never sells a minute of your attention.</p>
    <div class="row reveal wrap" style="--gap:14px;margin-top:8px">
      <span class="pill">On-device AI</span><span class="pill">Private by default</span><span class="pill">Watch + phone</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'seed-9',
      name: 'Section · Early signs',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Early signs</div>
  <div class="divider-title reveal">People keep<br/>coming back.</div>
  <div class="divider-sub reveal">A small private beta, growing on word of mouth alone — the clearest signal we have.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'seed-10',
      name: 'Early traction',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Early traction</div>
      <h2 class="headline" style="margin-top:8px">Weekly active mornings.</h2>
      <div class="fnote" style="margin-top:26px">
        <div class="fnote-k">The signal</div>
        <p class="body" style="max-width:none"><b>71%</b> of week-one users are still here at week eight — retention we haven't had to buy.</p>
      </div>
    </div>
    <div class="tbars">
      <div class="bars" style="--bars-height:300px">
        <div class="bar" style="--h:24%"><div class="bar-fill" data-val="0.9k"></div><div class="bar-label">Jan</div></div>
        <div class="bar" style="--h:40%"><div class="bar-fill" data-val="1.6k"></div><div class="bar-label">Feb</div></div>
        <div class="bar" style="--h:58%"><div class="bar-fill" data-val="2.4k"></div><div class="bar-label">Mar</div></div>
        <div class="bar" style="--h:78%"><div class="bar-fill" data-val="3.3k"></div><div class="bar-label">Apr</div></div>
        <div class="bar" style="--h:100%"><div class="bar-fill" data-val="4.5k"></div><div class="bar-label">May</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Traction</span></div>
</div>`,
    }),
    s({
      id: 'seed-11',
      name: 'The market',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:360px;background:conic-gradient(#f97316 0 22%, #14b8a6 22% 52%, #e8d6c2 52% 100%)"><div class="donut-label">$9B</div></div>
    </div>
    <div>
      <div class="kicker">The market</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">A wedge into a calmer hour.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:#f97316"></span>Mindfulness &amp; meditation<span class="v">$2.0B</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#14b8a6"></span>Sleep &amp; readiness<span class="v">$2.7B</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#e8d6c2"></span>Habit &amp; productivity<span class="v">$4.3B</span></div>
      </div>
      <p class="fine reveal" style="margin-top:24px">$9B serviceable today, growing 14% a year. We start at the morning and expand into the day.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Market</span></div>
</div>`,
    }),
    s({
      id: 'seed-12',
      name: 'Business model',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we make money</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A subscription people are glad to keep.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">$59</div><div class="stat-label">Annual subscription, billed yearly</div></div>
    <div class="stat"><div class="stat-num">8.4%</div><div class="stat-label">Free-to-paid conversion in beta</div></div>
    <div class="stat"><div class="stat-num">14×</div><div class="stat-label">LTV to CAC on early cohorts</div></div>
  </div>
  <table class="table reveal" style="margin-top:46px">
    <thead><tr><th>Plan</th><th>Who it's for</th><th class="num">Price / yr</th></tr></thead>
    <tbody>
      <tr><td>Daily</td><td class="muted">One person, one calmer morning</td><td class="num">$59</td></tr>
      <tr class="row-em"><td>Household</td><td class="muted">Up to five people who share a roof</td><td class="num">$119</td></tr>
      <tr><td>Teams</td><td class="muted">Wellbeing benefit, billed per seat</td><td class="num">Custom</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Business model</span></div>
</div>`,
    }),
    s({
      id: 'seed-13',
      name: 'The team',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The team</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Four people who needed this first.</h2>
  <div class="team reveal" style="--cols:4">
    <div class="member"><div class="face a">MR</div><div class="member-n">Mara Reyes</div><div class="member-r">Founder &amp; CEO</div><div class="member-x">Built sleep tools at a Series-C wearable.</div></div>
    <div class="member"><div class="face b">JT</div><div class="member-n">Jonah Tan</div><div class="member-r">Co-founder &amp; CTO</div><div class="member-x">Shipped on-device ML for two iOS apps.</div></div>
    <div class="member"><div class="face c">PA</div><div class="member-n">Priya Anand</div><div class="member-r">Head of Design</div><div class="member-x">Led calm, award-winning health UX.</div></div>
    <div class="member"><div class="face d">DK</div><div class="member-n">Dr. Lena Koch</div><div class="member-r">Clinical Advisor</div><div class="member-x">Sleep researcher, 40+ papers.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Team</span></div>
</div>`,
    }),
    s({
      id: 'seed-14',
      name: 'The plan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The plan</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">The next eighteen months.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q3 '26</div><div class="tl-what"><b>Public launch</b> on iOS and watch — open the beta to everyone on the list.</div></div>
    <div class="tl-row"><div class="tl-when">Q4 '26</div><div class="tl-what"><b>Household plans</b> and the first habit pack beyond mornings.</div></div>
    <div class="tl-row"><div class="tl-when">Q2 '27</div><div class="tl-what"><b>Android &amp; Teams</b> — bring Aubade to wellbeing benefits at work.</div></div>
    <div class="tl-row"><div class="tl-when">Q4 '27</div><div class="tl-what"><b>100k paying mornings</b> and a Series A from a position of strength.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">The plan</span></div>
</div>`,
    }),
    s({
      id: 'seed-15',
      name: 'A note from the founder',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:76px;max-width:22ch">"I want a million people to win their mornings before they ever check a screen. That's the whole company."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Mara Reyes</span><span class="cite-role">Founder &amp; CEO, Aubade</span></div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">Founder voice</span></div>
</div>`,
    }),
    s({
      id: 'seed-16',
      name: 'The ask',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The ask</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">What we're raising — and what it unlocks.</h2>
  <div class="ask reveal">
    <div>
      <div class="ask-amt">$2.5M</div>
      <p class="ask-sub">Seed round, on a SAFE — enough runway to reach the metrics a Series A wants to see.</p>
    </div>
    <ul class="unlock">
      <li class="unlock-item"><span>Ship the <b>public launch</b> and Household plans.</span></li>
      <li class="unlock-item"><span>Grow the team to <b>nine</b> — two engineers, one designer, one clinician.</span></li>
      <li class="unlock-item"><span>Reach <b>100k paying mornings</b> and 18 months of runway.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aubade</span><span class="runner-label">The ask</span></div>
</div>`,
    }),
    s({
      id: 'seed-17',
      name: 'Vision close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Let's build calm mornings</div>
    <h2 class="display reveal" style="--display-size:118px">Start the day<br/>on your terms.</h2>
    <p class="lead reveal">mara@aubade.app · join the round</p>
  </div>
</div>`,
    }),
  ],
}
