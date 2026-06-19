import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/onboarding-cover.jpg'
const TEAM_IMG = 'assets/onboarding-fig.jpg'

export const onboarding: Template = {
  id: 'onboarding',
  categories: ['People'],
  name: 'Onboarding',
  tagline: 'Warm, sunny new-hire welcome deck',
  audiences: ['new-hire', 'people-ops', 'hr', 'manager'],
  description:
    'A friendly new-hire onboarding deck in sunny yellow on ink and white, with rounded Quicksand display and clean Inter body. Week-by-week timeline, first-day checklist cards, people-to-meet cards, a tools grid, and a 30-60-90 plan carry a complete welcome-to-week-one story you tailor to your company.',
  fonts: {
    display: 'Quicksand',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#1c1917',
    '--muted': '#78716c',
    '--accent': '#f5b800',
    '--accent-2': '#1c1917',
    '--display': "'Quicksand', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '128px',
    '--headline-size': '78px',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#fffdf6',
    '--card-border': '#efe7d2',
    '--card-shadow': '0 18px 44px -30px rgba(28,25,23,0.22)',
    '--radius': '22px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--bullet-color': '#f5b800',
    '--th-border': '#1c1917',
    '--table-border': '#efe7d2',
    '--track': '#f1ead7',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -45px rgba(28,25,23,0.42)',
    '--media-radius': '24px',
    '--chip-bg': '#fdf3d4',
    '--scrim':
      'linear-gradient(180deg, rgba(28,25,23,0.06) 0%, rgba(28,25,23,0.38) 52%, rgba(28,25,23,0.82) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#fbf7ec',
  assets: ['onboarding-cover.jpg', 'onboarding-fig.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent-2); }
.bar-fill { background: var(--accent); }
.step::before { color: var(--accent-2); background: var(--chip-bg); border-color: var(--accent); }
.tl-when { color: var(--accent-2); }
.check::before { color: var(--accent-2); }
.cite-dot { background: var(--accent); }

/* Sunny section divider — big rounded title with a yellow underline */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; background: var(--accent); }
.divider .divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--accent-2); text-transform: uppercase; }
.divider .divider-title { font-family: var(--display); font-weight: 700; font-size: 150px; line-height: 0.96; letter-spacing: -0.02em; color: var(--accent-2); }
.divider .divider-sub { font-family: var(--body); font-size: 34px; line-height: 1.35; color: rgba(28,25,23,0.78); max-width: 30ch; margin-top: 8px; }
.divider-rule { width: 132px; height: 8px; border-radius: 4px; background: var(--accent-2); margin-top: 14px; }

/* Checklist cards — friendly rounded card with a check token */
.checklist { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 26px; }
.cl { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; padding: 34px 36px; box-shadow: var(--card-shadow); display: flex; gap: 24px; align-items: flex-start; }
.cl-box { flex: 0 0 auto; width: 50px; height: 50px; border-radius: 14px; background: var(--accent); display: grid; place-items: center; color: var(--accent-2); font-family: var(--display); font-weight: 700; font-size: 28px; }
.cl-box::before { content: '\\2713'; }
.cl-t { font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.06; color: var(--text); }
.cl-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 8px; }

/* People-to-meet cards — round avatar initial + role */
.people { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 28px; }
.person { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; padding: 38px 34px; box-shadow: var(--card-shadow); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.avatar { width: 104px; height: 104px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 44px; color: var(--accent-2); margin-bottom: 16px; }
.person-name { font-family: var(--display); font-weight: 700; font-size: 36px; color: var(--text); }
.person-role { font-family: var(--body); font-weight: 600; font-size: 24px; color: var(--accent-2); }
.person-note { font-family: var(--body); font-size: 23px; line-height: 1.38; color: var(--muted); margin-top: 8px; }

/* Tools grid — soft tile with a yellow icon chip */
.tools { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 24px; }
.tool { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 30px 32px; box-shadow: var(--card-shadow); display: flex; align-items: center; gap: 22px; }
.tool-ic { flex: 0 0 auto; width: 64px; height: 64px; border-radius: 16px; background: var(--chip-bg); border: 1px solid var(--card-border); display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 26px; color: var(--accent-2); }
.tool-t { font-family: var(--display); font-weight: 700; font-size: 30px; color: var(--text); }
.tool-d { font-family: var(--body); font-size: 22px; line-height: 1.34; color: var(--muted); margin-top: 4px; }

/* Norms cards — "how we work" do/keep-in-mind tiles */
.norms { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 26px; }
.norm { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; padding: 36px 38px; box-shadow: var(--card-shadow); border-top: 6px solid var(--accent); }
.norm-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 19px; color: var(--accent-2); margin-bottom: 12px; }
.norm-t { font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.08; color: var(--text); }
.norm-d { font-family: var(--body); font-size: 24px; line-height: 1.42; color: var(--muted); margin-top: 10px; }

/* Friendly note callout — warm tinted card */
.note { background: var(--chip-bg); border-radius: 22px; padding: 38px 44px; border-left: 8px solid var(--accent); }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 12px; }

/* Tinted help-row band for "where to get help" */
.help { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 24px; }
.help-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; padding: 34px 34px; box-shadow: var(--card-shadow); }
.help-tag { display: inline-flex; align-items: center; gap: 10px; font-family: var(--body); font-weight: 700; font-size: 21px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-2); margin-bottom: 14px; }
.help-tag::before { content: ''; width: 14px; height: 14px; border-radius: 5px; background: var(--accent); }
.help-t { font-family: var(--display); font-weight: 700; font-size: 33px; color: var(--text); }
.help-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 8px; }

/* Schedule table — day cell */
.day { font-family: var(--display); font-weight: 700; color: var(--accent-2); }

@media (max-width: 640px) {
  html.deck-can-flow .divider { position: relative !important; inset: auto !important; min-height: 340px; padding: 56px 26px !important; gap: 14px; }
  html.deck-can-flow .divider .divider-title { font-size: min(51px, 14vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .divider .divider-sub { font-size: min(30px, 8vw) !important; max-width: 100% !important; }
  html.deck-can-flow .divider .divider-num { font-size: min(15px, 4vw) !important; }
  html.deck-can-flow .checklist { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .cl { padding: 26px 22px !important; }
  html.deck-can-flow .tools { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .people { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .norms { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .norm { padding: 26px 24px !important; }
  html.deck-can-flow .help { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .note { padding: 28px 24px !important; }
}`,
  notes:
    'A complete, warm new-hire onboarding deck: rounded Quicksand display + Inter body, ink #1c1917 on white, ONE sunny-yellow (#f5b800) accent, generous whitespace, no gradients. Open on the bright-office full-bleed (assets/onboarding-cover.jpg) and use the friendly team figure (assets/onboarding-fig.jpg) for a split. Section dividers are full sunny-yellow panels (.divider). Signature pieces: .checklist cards for the first-day checklist, .tools grid for setup, the shared .timeline for the week-by-week plan, .people cards for who to meet, .norms cards for how we work, .help cards for where to get help, .note for a warm welcome callout. Use .stats for "who we are", .steps for the 30-60-90 plan, .checks for values, a centered .quote for a teammate voice. Keep it encouraging and human — speak directly to the new hire ("you", "we"), pin a .runner footer on content slides.',
  sampleSlides: [
    s({
      id: 'onb-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff">Onboarding · Northwind &amp; Co.</div>
    <h1 class="display reveal" style="--display-size:158px;margin-top:8px">Welcome!</h1>
    <p class="lead reveal">We're so glad you're here. Here's everything you need for a great first few weeks.</p>
  </div>
</div>`,
    }),
    s({
      id: 'onb-note',
      name: "We're glad you're here",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">A warm hello</div>
      <h2 class="headline" style="margin-top:8px">You said yes — and we couldn't be happier.</h2>
      <p class="lead" style="margin-top:8px">Take a breath. This deck is your map for the first few weeks — read it at your own pace.</p>
    </div>
    <div class="note">
      <div class="note-k">From the team</div>
      <p class="body" style="max-width:none;font-size:34px;line-height:1.4">We hired you for <b>who you are</b>, not just what you know. The first weeks are about settling in, meeting people, and finding your feet — <b>not</b> proving yourself. Ask anything.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Welcome</span></div>
</div>`,
    }),
    s({
      id: 'onb-who',
      name: 'Who we are',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Who we are, in 30 seconds</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The shape of the place you just joined.</h2>
  <div class="stats reveal" style="margin-bottom:8px">
    <div class="stat"><div class="stat-num">2014</div><div class="stat-label">The year we started, in a one-room studio</div></div>
    <div class="stat"><div class="stat-num">240</div><div class="stat-label">People across product, design, and support</div></div>
    <div class="stat"><div class="stat-num">12</div><div class="stat-label">Countries our teammates call home</div></div>
    <div class="stat"><div class="stat-num">1</div><div class="stat-label">Shared belief: do good work, kindly</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Who we are</span></div>
</div>`,
    }),
    s({
      id: 'onb-div1',
      name: 'Section · Your first day',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Today</div>
  <div class="divider-title reveal">Your first day.</div>
  <div class="divider-sub reveal">No deadlines today. Just getting set up, saying hello, and finding the coffee.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'onb-checklist',
      name: 'First-day checklist',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Your first-day checklist</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">A handful of things to tick off.</h2>
  <div class="checklist reveal" style="--cols:2">
    <div class="cl"><div class="cl-box"></div><div><div class="cl-t">Get your laptop set up</div><div class="cl-d">IT will meet you at 9:30 to hand over your machine and badge.</div></div></div>
    <div class="cl"><div class="cl-box"></div><div><div class="cl-t">Sign in to the essentials</div><div class="cl-d">Email, chat, and the docs hub — passwords are in your welcome email.</div></div></div>
    <div class="cl"><div class="cl-box"></div><div><div class="cl-t">Meet your buddy</div><div class="cl-d">Your onboarding buddy will grab a coffee with you before lunch.</div></div></div>
    <div class="cl"><div class="cl-box"></div><div><div class="cl-t">Say hi in #welcome</div><div class="cl-d">Post a quick hello and a photo of something you love — no pressure.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">First day</span></div>
</div>`,
    }),
    s({
      id: 'onb-tools',
      name: 'Your setup & tools',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Your setup &amp; tools</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">The kit you'll use every day.</h2>
  <div class="tools reveal" style="--cols:3">
    <div class="tool"><div class="tool-ic">@</div><div><div class="tool-t">Email &amp; Calendar</div><div class="tool-d">Where invites and the day's schedule live.</div></div></div>
    <div class="tool"><div class="tool-ic">#</div><div><div class="tool-t">Team Chat</div><div class="tool-d">Day-to-day conversation, channels per team.</div></div></div>
    <div class="tool"><div class="tool-ic">D</div><div><div class="tool-t">Docs Hub</div><div class="tool-d">Handbook, how-tos, and project notes.</div></div></div>
    <div class="tool"><div class="tool-ic">B</div><div><div class="tool-t">Project Board</div><div class="tool-d">What everyone's working on, by team.</div></div></div>
    <div class="tool"><div class="tool-ic">G</div><div><div class="tool-t">Code &amp; Repos</div><div class="tool-d">For builders — request access on day one.</div></div></div>
    <div class="tool"><div class="tool-ic">$</div><div><div class="tool-t">People &amp; Pay</div><div class="tool-d">Benefits, time off, and expense claims.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Tools</span></div>
</div>`,
    }),
    s({
      id: 'onb-div2',
      name: 'Section · Your first week',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — This week</div>
  <div class="divider-title reveal">Your first week.</div>
  <div class="divider-sub reveal">A gentle rhythm of intros, context, and a first small win by Friday.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'onb-week',
      name: 'Week-by-week plan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Your week-by-week plan</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">How the first month unfolds.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 1</div><div class="tl-what"><b>Settle in.</b> Meet your team, set up your tools, and read the handbook at your own pace.</div></div>
    <div class="tl-row"><div class="tl-when">Week 2</div><div class="tl-what"><b>Get context.</b> Shadow a few teammates, sit in on the rituals, and ask all the questions.</div></div>
    <div class="tl-row"><div class="tl-when">Week 3</div><div class="tl-what"><b>First small win.</b> Pick up a starter task with your buddy close by — ship something real.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Find your stride.</b> Own a piece of work end to end and share it at the team demo.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">First week</span></div>
</div>`,
    }),
    s({
      id: 'onb-schedule',
      name: 'Your first-week schedule',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Your first-week schedule</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">A loose plan for the week ahead.</h2>
  <table class="table reveal">
    <thead><tr><th>Day</th><th>Morning</th><th>Afternoon</th></tr></thead>
    <tbody>
      <tr><td class="day">Mon</td><td>Laptop setup &amp; accounts with IT</td><td>Coffee with your buddy Devon</td></tr>
      <tr><td class="day">Tue</td><td>First 1:1 with Maya, your manager</td><td>Read the handbook, meet the team</td></tr>
      <tr><td class="day">Wed</td><td>Shadow a product ritual</td><td><b>Focus time</b> — settle in, no meetings</td></tr>
      <tr><td class="day">Thu</td><td>Walkthrough of the project board</td><td>Pair on a starter task</td></tr>
      <tr><td class="day">Fri</td><td>Pick up your first small task</td><td>Team demo &amp; a friendly happy hour</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Nothing here is fixed — your manager will shape it with you on day one.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Your week</span></div>
</div>`,
    }),
    s({
      id: 'onb-ramp',
      name: "You're not alone",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:104px;align-items:center">
    <div>
      <div class="kicker">You're not alone</div>
      <h2 class="headline" style="margin-top:8px">Everyone finds their feet — usually faster than they expect.</h2>
      <div class="note" style="margin-top:28px">
        <div class="note-k">Good to know</div>
        <p class="body" style="max-width:none"><b>94%</b> of new teammates said they felt settled by the end of month one. The other 6% just needed a little more coffee.</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:34px">
      <div class="bars reveal" style="--bars-height:300px;width:100%">
        <div class="bar" style="--h:34%"><div class="bar-fill" data-val="34%"></div><div class="bar-label">Week 1</div></div>
        <div class="bar" style="--h:58%"><div class="bar-fill" data-val="58%"></div><div class="bar-label">Week 2</div></div>
        <div class="bar" style="--h:78%"><div class="bar-fill" data-val="78%"></div><div class="bar-label">Week 3</div></div>
        <div class="bar" style="--h:94%"><div class="bar-fill" data-val="94%"></div><div class="bar-label">Week 4</div></div>
      </div>
      <div class="fine muted" style="text-align:center">Share of new hires who feel "settled in"</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Ramping in</span></div>
</div>`,
    }),
    s({
      id: 'onb-people',
      name: 'People to meet',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">People to meet</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">A few friendly faces this week.</h2>
  <div class="people reveal" style="--cols:3">
    <div class="person"><div class="avatar">M</div><div class="person-name">Maya Chen</div><div class="person-role">Your manager</div><div class="person-note">Your first 1:1 is Tuesday — bring questions, no agenda needed.</div></div>
    <div class="person"><div class="avatar">D</div><div class="person-name">Devon Park</div><div class="person-role">Your onboarding buddy</div><div class="person-note">Your go-to for the small stuff. Ping anytime, truly.</div></div>
    <div class="person"><div class="avatar">P</div><div class="person-name">Priya Nair</div><div class="person-role">People &amp; Culture</div><div class="person-note">Benefits, time off, and anything that feels awkward to ask.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">People</span></div>
</div>`,
    }),
    s({
      id: 'onb-norms',
      name: 'How we work',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we work</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">A few ways we like to do things.</h2>
  <div class="norms reveal" style="--cols:2">
    <div class="norm"><div class="norm-k">Default to</div><div class="norm-t">Writing things down</div><div class="norm-d">Decisions live in docs, not in someone's head — so everyone can catch up.</div></div>
    <div class="norm"><div class="norm-k">Default to</div><div class="norm-t">Asking early</div><div class="norm-d">A question at hour one beats a guess at hour five. Nobody minds.</div></div>
    <div class="norm"><div class="norm-k">We protect</div><div class="norm-t">Focus time</div><div class="norm-d">Wednesday afternoons are meeting-free. Block your calendar freely.</div></div>
    <div class="norm"><div class="norm-k">We assume</div><div class="norm-t">Good intent</div><div class="norm-d">We give feedback kindly and take it generously. Always.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">How we work</span></div>
</div>`,
    }),
    s({
      id: 'onb-team',
      name: 'You belong here',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Your team</div>
    <h2 class="headline reveal">You're joining real people who can't wait to work with you.</h2>
    <p class="lead reveal">We come from different places and backgrounds, but we share one thing: we like making good things together — and having a good time doing it.</p>
  </div>
  <figure class="media reveal"><img src="${TEAM_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'onb-306090',
      name: 'Your 30-60-90',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Ramping up · your 30-60-90</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What "going well" looks like.</h2>
  <ol class="steps reveal" style="--gap:30px">
    <li class="step"><span><b>By day 30 — Learn.</b> You know your team, your tools, and where things live. You've shipped one small thing.</span></li>
    <li class="step"><span><b>By day 60 — Contribute.</b> You own regular work, give input in reviews, and your questions are getting sharper.</span></li>
    <li class="step"><span><b>By day 90 — Belong.</b> You're trusted with a project end to end, and you're helping the next new person feel at home.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">30-60-90</span></div>
</div>`,
    }),
    s({
      id: 'onb-help',
      name: 'Where to get help',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where to get help</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Stuck? Here's exactly who to ask.</h2>
  <div class="help reveal" style="--cols:3">
    <div class="help-card"><div class="help-tag">Day-to-day</div><div class="help-t">Your buddy, Devon</div><div class="help-d">Logins, where's-the-thing, "is this normal?" — ask in chat anytime.</div></div>
    <div class="help-card"><div class="help-tag">Your work</div><div class="help-t">Your manager, Maya</div><div class="help-d">Priorities, feedback, growth, and anything about your role.</div></div>
    <div class="help-card"><div class="help-tag">Everything else</div><div class="help-t">#ask-anything</div><div class="help-d">Pay, tools, accounts, or office logistics — the channel that answers fast.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Get help</span></div>
</div>`,
    }),
    s({
      id: 'onb-values',
      name: 'Our values',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Our values</div>
      <h2 class="headline" style="margin-top:8px">The things we actually mean.</h2>
      <p class="lead">Not poster words — how we make decisions when nobody's watching.</p>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span><b>People first.</b> We're kind by default, to each other and to our users.</span></li>
      <li class="check"><span><b>Own it.</b> See a problem? It's yours to flag, and yours to help fix.</span></li>
      <li class="check"><span><b>Keep it simple.</b> Clear beats clever. Short beats long.</span></li>
      <li class="check"><span><b>Stay curious.</b> The best idea can come from the newest person — maybe you.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">Values</span></div>
</div>`,
    }),
    s({
      id: 'onb-quote',
      name: 'A teammate quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"My first week, three people I'd never met offered to grab coffee. That's when I knew I'd picked the right place."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Sam Rivera</span><span class="cite-role">Joined 18 months ago · Product</span></div>
  <div class="runner reveal"><span class="runner-brand">Northwind</span><span class="runner-label">A teammate</span></div>
</div>`,
    }),
    s({
      id: 'onb-close',
      name: "You've got this",
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff">One more thing</div>
    <h2 class="display reveal" style="--display-size:128px">You've got this.</h2>
    <p class="lead reveal">Take it slow, ask everything, and welcome to the team. We're glad you're here.</p>
  </div>
</div>`,
    }),
  ],
}
