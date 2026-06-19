import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/flat-illustration-cover.jpg'
const SCENE_IMG = 'assets/flat-illustration-scene.jpg'

export const flatIllustration: Template = {
  id: 'flat-illustration',
  categories: ['Sales', 'Company', 'Marketing'],
  name: 'Flat Illustration',
  tagline: 'Friendly flat-vector consumer product pitch',
  audiences: ['founder', 'consumer', 'pitch', 'marketing'],
  description:
    'A bright, optimistic consumer-product deck built around premium flat geometric vector illustration. Rounded friendly cards, pill steps, a colorful stat band and a clean flow carry a full app pitch — indigo, coral and mint on white, Poppins over Inter. Drop in your own story and screens.',
  fonts: {
    display: 'Poppins',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0f1222',
    '--muted': '#6b7090',
    '--accent': '#4f46e5',
    '--accent-2': '#fb7185',
    '--display': "'Poppins', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '124px',
    '--headline-size': '76px',
    '--lead-size': '37px',
    '--subhead-size': '48px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e7e8f2',
    '--card-shadow': '0 22px 50px -30px rgba(15,18,34,0.28)',
    '--radius': '28px',
    '--bullet-color': '#fb7185',
    '--stat-size': '104px',
    '--metric-size': '116px',
    '--th-border': '#0f1222',
    '--table-border': '#e7e8f2',
    '--track': '#edeefb',
    '--donut-hole': '#ffffff',
    '--donut-size': '320px',
    '--bar-gap': '34px',
    '--media-radius': '28px',
    '--media-border': '1px solid #e7e8f2',
    '--media-shadow': '0 50px 110px -45px rgba(79,70,229,0.4)',
    '--scrim':
      'linear-gradient(180deg, rgba(15,18,34,0.05) 0%, rgba(15,18,34,0.36) 52%, rgba(15,18,34,0.84) 100%)',
    '--pos': '#10b981',
    '--neg': '#fb7185',
  },
  stageBg: '#f4f4fb',
  assets: ['flat-illustration-cover.jpg', 'flat-illustration-scene.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.cite-name { color: var(--text); }

/* Friendly rounded section divider — soft tinted field */
.fdiv { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 22px; background: #f4f4fb; }
.fdiv-num { display: inline-flex; align-items: center; gap: 14px; font-family: var(--body); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; font-size: 22px; color: var(--accent); }
.fdiv-num::before { content: ''; width: 46px; height: 46px; border-radius: 16px; background: var(--accent); }
.fdiv-title { font-family: var(--display); font-weight: 800; font-size: 138px; line-height: 0.96; letter-spacing: -0.025em; color: var(--text); }
.fdiv-dots { display: flex; gap: 14px; margin-top: 16px; }
.fdiv-dots span { width: 20px; height: 20px; border-radius: 50%; }

/* Rounded friendly feature cards — pastel tinted icon chip */
.fcards { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.fcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 28px; padding: 44px 40px 40px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 14px; }
.fcard-ic { width: 76px; height: 76px; border-radius: 22px; display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 32px; color: #fff; }
.fcard-t { font-family: var(--display); font-weight: 600; font-size: 36px; line-height: 1.06; color: var(--text); }
.fcard-d { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); }

/* Pill steps — rounded numbered chips for "how it works" */
.pills { display: flex; align-items: stretch; }
.pills .pstep { flex: 1; }
.pill-card { background: #f4f4fb; border: 1px solid var(--card-border); border-radius: 28px; padding: 38px 34px; height: 100%; display: flex; flex-direction: column; gap: 16px; }
.pill-n { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 999px; background: var(--accent); color: #fff; font-family: var(--display); font-weight: 700; font-size: 30px; }
.pill-t { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.04; color: var(--text); }
.pill-d { font-family: var(--body); font-size: 23px; line-height: 1.4; color: var(--muted); }

/* Colorful stat band — full-width rounded indigo field */
.statband { background: var(--accent); border-radius: 32px; display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); padding: 60px 48px; }
.statband-cell { padding: 0 48px; }
.statband-cell + .statband-cell { border-left: 1px solid rgba(255,255,255,0.22); }
.statband-num { font-family: var(--display); font-weight: 800; font-size: 92px; line-height: 1; letter-spacing: -0.03em; color: #fff; font-variant-numeric: tabular-nums; }
.statband-label { font-family: var(--body); font-size: 25px; line-height: 1.32; color: rgba(255,255,255,0.86); margin-top: 14px; }

/* Soft tinted callout */
.fcallout { background: #fff1f3; border: 1px solid #fcd9df; border-left: 6px solid var(--accent-2); border-radius: 0 22px 22px 0; padding: 34px 40px; }
.fcallout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 10px; }

/* Old-way / new-way comparison tiles */
.vs { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.vs-card { border-radius: 28px; padding: 44px 40px; display: flex; flex-direction: column; gap: 16px; }
.vs-old { background: #f4f4fb; border: 1px solid var(--card-border); }
.vs-new { background: #eef0ff; border: 2px solid var(--accent); }
.vs-tag { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; }
.vs-old .vs-tag { color: var(--muted); }
.vs-new .vs-tag { color: var(--accent); }
.vs-h { font-family: var(--display); font-weight: 600; font-size: 40px; line-height: 1.04; color: var(--text); }

/* Plan price emphasis + highlighted tier */
.tier-head { font-family: var(--display); font-weight: 600; }
.tier-price { font-family: var(--display); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.col-us { background: #eef0ff; }
.yes { color: var(--accent); font-weight: 700; }

@media (max-width: 640px) {
  html.deck-can-flow .fdiv { position: static !important; inset: auto !important; padding: 48px 22px !important; min-height: 56vh; justify-content: center; gap: 16px; }
  html.deck-can-flow .fdiv-title { font-size: min(47px, 13vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .fcards { grid-template-columns: 1fr !important; gap: 16px; }
  html.deck-can-flow .fcard { padding: 30px 24px !important; }
  html.deck-can-flow .fcard-t { font-size: min(28px, 8vw) !important; }
  html.deck-can-flow .pills { flex-direction: column !important; gap: 16px; }
  html.deck-can-flow .pills .pstep { flex: none !important; width: 100% !important; }
  html.deck-can-flow .pills .flow-arrow { display: none !important; }
  html.deck-can-flow .statband { grid-template-columns: 1fr !important; padding: 34px 26px !important; gap: 24px; }
  html.deck-can-flow .statband-cell { padding: 0 !important; }
  html.deck-can-flow .statband-cell + .statband-cell { border-left: 0 !important; border-top: 1px solid rgba(255,255,255,0.22); padding-top: 24px !important; }
  html.deck-can-flow .statband-num { font-size: min(52px, 14vw) !important; }
  html.deck-can-flow .vs { grid-template-columns: 1fr !important; gap: 16px; }
  html.deck-can-flow .vs-card { padding: 30px 24px !important; }
  html.deck-can-flow .vs-h { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .fcallout { padding: 26px 24px !important; }
}`,
  notes:
    'A complete consumer money / budgeting app pitch rendered in premium FLAT GEOMETRIC VECTOR illustration. Poppins display + Inter body, ink #0f1222 on white, indigo #4f46e5 primary with warm coral #fb7185 and a soft mint accent — bright and optimistic, never corporate. Open and close on the full-bleed flat-vector hero (assets/flat-illustration-cover.jpg, diverse people + app); use the flat-vector product scene (assets/flat-illustration-scene.jpg) for the product split. Signature pieces: .fdiv friendly rounded section dividers, .fcard rounded feature cards with pastel icon chips, .pills numbered pill steps for "how it works", the colorful indigo .statband for traction, .vs old-way/new-way tiles, .fcallout coral callout. Use .bars for growth, a 3-segment .donut for market, .timeline for the roadmap, a .table for pricing (.col-us highlights the recommended plan). Keep imagery flat-vector only — never photographic. Generous whitespace, rounded everything, numbers tabular.',
  sampleSlides: [
    s({
      id: 'fi-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.92">Seed Round · Penny — money that feels good</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Money,<br/>minus the stress.</h1>
    <p class="lead reveal">The budgeting app that turns "I have no idea where it went" into "I've got this."</p>
  </div>
</div>`,
    }),
    s({
      id: 'fi-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll cover</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Ten minutes, start to finish.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>The everyday money stress that nobody has fixed.</span></li>
    <li class="step"><span>Penny — the app, and how it works in three taps.</span></li>
    <li class="step"><span>The proof: traction, the people, and the market.</span></li>
    <li class="step"><span>Pricing, the roadmap, and how to get started.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'fi-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The problem</div>
      <h2 class="headline" style="margin-top:8px">Money is a daily source of quiet stress.</h2>
      <div class="fcallout" style="margin-top:28px">
        <div class="fcallout-k">The real cost</div>
        <p class="body" style="max-width:none"><b>73% of people</b> say money is their #1 stress — yet most still budget in their head or not at all.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Spending lives across <b>five apps</b> and three banks.</span></li>
      <li class="bullet"><span>Spreadsheets feel like <b>homework</b>, so they get abandoned.</span></li>
      <li class="bullet"><span>People find out they overspent <b>after</b> it already happened.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'fi-oldway',
      name: 'Old way vs us',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Why now</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Budgeting shouldn't feel like a chore.</h2>
  <div class="vs reveal">
    <div class="vs-card vs-old">
      <div class="vs-tag">The old way</div>
      <div class="vs-h">Punishing &amp; manual.</div>
      <ul class="bullets" style="--gap:18px;--bullet-color:#c8cadf">
        <li class="bullet"><span>Log every receipt by hand.</span></li>
        <li class="bullet"><span>Guilt-trip charts after you slip.</span></li>
        <li class="bullet"><span>One-size spreadsheet, zero context.</span></li>
      </ul>
    </div>
    <div class="vs-card vs-new">
      <div class="vs-tag">With Penny</div>
      <div class="vs-h">Automatic &amp; encouraging.</div>
      <ul class="bullets" style="--gap:18px;--bullet-color:#4f46e5">
        <li class="bullet"><span>Categorizes spending the moment it lands.</span></li>
        <li class="bullet"><span>Nudges you <b>before</b> you overspend.</span></li>
        <li class="bullet"><span>A plan that adapts to your real life.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Why now</span></div>
</div>`,
    }),
    s({
      id: 'fi-div1',
      name: 'Section · The product',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">Part 01 — The product</div>
  <div class="fdiv-title reveal">A money app<br/>that feels kind.</div>
  <div class="fdiv-dots reveal"><span style="background:#4f46e5"></span><span style="background:#fb7185"></span><span style="background:#10b981"></span></div>
</div>`,
    }),
    s({
      id: 'fi-meet',
      name: 'Meet the app',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Meet Penny</div>
    <h2 class="headline reveal">Your whole money life, on one calm screen.</h2>
    <p class="lead reveal">Penny links every account, sorts each transaction automatically, and shows you exactly what's safe to spend today — no math, no guilt.</p>
    <div class="row reveal" style="gap:14px;flex-wrap:wrap;margin-top:6px">
      <span class="pill">Auto-categorized</span>
      <span class="pill">Safe-to-spend</span>
      <span class="pill">Bank-grade secure</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${SCENE_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'fi-how',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How it works</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Set up in three taps.</h2>
  <div class="pills reveal">
    <div class="pstep"><div class="pill-card"><div class="pill-n">1</div><div class="pill-t">Connect</div><div class="pill-d">Securely link your banks and cards in under a minute.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="pstep"><div class="pill-card"><div class="pill-n">2</div><div class="pill-t">Plan</div><div class="pill-d">Penny builds a budget from your real spending — no blank pages.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="pstep"><div class="pill-card"><div class="pill-n">3</div><div class="pill-t">Relax</div><div class="pill-d">Get a friendly nudge the moment a category needs you.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'fi-features',
      name: 'Key features',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key features</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Everything, gently in one place.</h2>
  <div class="fcards reveal" style="--cols:3">
    <div class="fcard"><div class="fcard-ic" style="background:#4f46e5">$</div><div class="fcard-t">Safe-to-spend</div><div class="fcard-d">One honest number that updates live as money moves.</div></div>
    <div class="fcard"><div class="fcard-ic" style="background:#fb7185">~</div><div class="fcard-t">Auto-categorize</div><div class="fcard-d">Every transaction sorted instantly — learns your habits.</div></div>
    <div class="fcard"><div class="fcard-ic" style="background:#10b981">↑</div><div class="fcard-t">Goal jars</div><div class="fcard-d">Round-ups and auto-saves toward the things you want.</div></div>
    <div class="fcard"><div class="fcard-ic" style="background:#fb7185">!</div><div class="fcard-t">Smart nudges</div><div class="fcard-d">A friendly heads-up before a category runs short.</div></div>
    <div class="fcard"><div class="fcard-ic" style="background:#10b981">≈</div><div class="fcard-t">Shared budgets</div><div class="fcard-d">Split a household plan without sharing logins.</div></div>
    <div class="fcard"><div class="fcard-ic" style="background:#4f46e5">@</div><div class="fcard-t">Ask Penny</div><div class="fcard-d">Plain-language answers about your own money, anytime.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Features</span></div>
</div>`,
    }),
    s({
      id: 'fi-div2',
      name: 'Section · The proof',
      transition: 'fade',
      bodyHtml: `<div class="fdiv">
  <div class="fdiv-num reveal">Part 02 — The proof</div>
  <div class="fdiv-title reveal">People love it,<br/>and it's growing.</div>
  <div class="fdiv-dots reveal"><span style="background:#fb7185"></span><span style="background:#10b981"></span><span style="background:#4f46e5"></span></div>
</div>`,
    }),
    s({
      id: 'fi-traction',
      name: 'Traction',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Traction</div>
      <h2 class="headline" style="margin-top:8px">Word of mouth is doing the work.</h2>
      <p class="lead">Active users have compounded every quarter since launch — <b>62% arrive from a friend</b>.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:24%"><div class="bar-fill" data-val="40K"></div><div class="bar-label">Q1</div></div>
      <div class="bar" style="--h:44%"><div class="bar-fill" data-val="95K"></div><div class="bar-label">Q2</div></div>
      <div class="bar" style="--h:70%"><div class="bar-fill" data-val="180K"></div><div class="bar-label">Q3</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="310K"></div><div class="bar-label">Q4</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Traction</span></div>
</div>`,
    }),
    s({
      id: 'fi-band',
      name: 'Proof stat band',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">By the numbers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Small app, big habits.</h2>
  <div class="statband reveal" style="--cols:3">
    <div class="statband-cell"><div class="statband-num">310K</div><div class="statband-label">Monthly active users</div></div>
    <div class="statband-cell"><div class="statband-num">4.9★</div><div class="statband-label">Average app store rating</div></div>
    <div class="statband-cell"><div class="statband-num">$1.2K</div><div class="statband-label">Saved per user, first year</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">By the numbers</span></div>
</div>`,
    }),
    s({
      id: 'fi-quote',
      name: 'What users say',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:76px">"For the first time in my life I'm not scared to open my banking app. Penny just made it feel doable."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Maya R.</span><span class="cite-role">Penny user · two years saving</span></div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">User voice</span></div>
</div>`,
    }),
    s({
      id: 'fi-market',
      name: 'The market',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#4f46e5 0 52%, #fb7185 52% 80%, #10b981 80% 100%)"><div class="donut-label">52%</div></div>
    </div>
    <div>
      <div class="kicker">The market</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">A category still up for grabs.</h2>
      <div class="legend reveal" style="display:flex;flex-direction:column;gap:18px;font-family:var(--body);font-size:30px">
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:6px;background:#4f46e5"></span>Still budget by hand<span style="margin-left:auto;color:var(--muted)">52%</span></div>
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:6px;background:#fb7185"></span>Use a bank app only<span style="margin-left:auto;color:var(--muted)">28%</span></div>
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:6px;background:#10b981"></span>Use a dedicated app<span style="margin-left:auto;color:var(--muted)">20%</span></div>
      </div>
      <p class="fine reveal" style="margin-top:22px">A $12B personal-finance market — and 80% of people still aren't using a real tool.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">The market</span></div>
</div>`,
    }),
    s({
      id: 'fi-pricing',
      name: 'Pricing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Pricing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">Free to start, fair to grow.</h2>
  <table class="table reveal">
    <thead><tr><th>Plan</th><th>Best for</th><th>Accounts</th><th class="num">Per month</th></tr></thead>
    <tbody>
      <tr><td class="tier-head">Free</td><td class="muted">Getting your money in one place</td><td>Up to 2</td><td class="num tier-price">$0</td></tr>
      <tr class="col-us"><td class="tier-head">Plus</td><td class="muted">Goals, nudges &amp; shared budgets</td><td>Unlimited</td><td class="num tier-price">$8</td></tr>
      <tr><td class="tier-head">Family</td><td class="muted">A whole household, one calm plan</td><td>Up to 6 people</td><td class="num tier-price">$14</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Every plan includes bank-grade encryption and unlimited transaction history. Cancel anytime.</p>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Pricing</span></div>
</div>`,
    }),
    s({
      id: 'fi-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Roadmap</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Where Penny goes next.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Now</div><div class="tl-what"><b>Ask Penny</b> — plain-language coaching on your own spending, in beta.</div></div>
    <div class="tl-row"><div class="tl-when">Q3</div><div class="tl-what"><b>Bills &amp; subscriptions</b> radar that flags creep and cancels in a tap.</div></div>
    <div class="tl-row"><div class="tl-when">Q4</div><div class="tl-what"><b>Joint goals</b> for couples and roommates, with shared jars.</div></div>
    <div class="tl-row"><div class="tl-when">Next year</div><div class="tl-what"><b>Penny Invest</b> — a gentle on-ramp from saving to first investing.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Penny</span><span class="runner-label">Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'fi-cta',
      name: 'Get started',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.92">Let's build calm money together</div>
    <h2 class="display reveal" style="--display-size:122px">Join the<br/>round.</h2>
    <p class="lead reveal">hello@pennymoney.app · raising $4M seed to reach a million calmer people.</p>
  </div>
</div>`,
    }),
  ],
}
