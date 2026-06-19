import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/webinar-cover.jpg'
const FIG_IMG = 'assets/webinar-fig.jpg'

export const webinar: Template = {
  id: 'webinar',
  categories: ['Marketing', 'Education'],
  name: 'Webinar',
  tagline: 'Friendly, speaker-led live session',
  audiences: ['marketing', 'educator', 'community', 'webinar'],
  description:
    'A warm, approachable webinar deck in cobalt-on-cream with one friendly blue accent. A speaker card, agenda steps, key-takeaway cards, and poll/Q&A callouts carry a complete welcome-to-thank-you live session you tailor to your topic and host.',
  fonts: {
    display: 'Plus Jakarta Sans',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#15233b',
    '--muted': '#647189',
    '--accent': '#2563eb',
    '--accent-2': '#2563eb',
    '--display': "'Plus Jakarta Sans', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '800',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e6e9f2',
    '--card-shadow': '0 20px 50px -32px rgba(37,99,235,0.28)',
    '--radius': '22px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--bullet-radius': '50%',
    '--th-border': '#15233b',
    '--table-border': '#e6e9f2',
    '--track': '#e4e9f5',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--chip-bg': 'rgba(37,99,235,0.1)',
    '--media-shadow': '0 50px 110px -45px rgba(21,35,59,0.4)',
    '--media-radius': '24px',
    '--scrim':
      'linear-gradient(180deg, rgba(13,26,54,0.08) 0%, rgba(13,26,54,0.4) 52%, rgba(13,26,54,0.84) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#f6f7fb',
  assets: ['webinar-cover.jpg', 'webinar-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.step::before { color: var(--accent); }

/* Soft cream content fields so white slides don't feel bare */
.slide { background: var(--bg); }

/* Big title hook — oversized welcome line with a friendly accent underline */
.hook { font-family: var(--display); font-weight: 800; font-size: 116px; line-height: 0.98; letter-spacing: -0.03em; color: var(--text); text-wrap: balance; }
.hook .accent-text { color: var(--accent); }
.hook-rule { width: 110px; height: 7px; border-radius: 4px; background: var(--accent); }

/* Section divider — quiet cream field with a soft blue rule */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; background: #f6f7fb; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.2em; font-size: 22px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 800; font-size: 146px; line-height: 0.95; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 120px; height: 7px; border-radius: 4px; background: var(--accent); margin-top: 16px; }

/* Speaker card — photo + bio + socials */
.speaker { display: grid; grid-template-columns: 0.82fr 1.18fr; gap: 64px; align-items: center; }
.speaker-photo { position: relative; aspect-ratio: 4 / 5; border-radius: 28px; overflow: hidden; box-shadow: var(--media-shadow); }
.speaker-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
.speaker-name { font-family: var(--display); font-weight: 800; font-size: 72px; line-height: 1; letter-spacing: -0.02em; color: var(--text); }
.speaker-role { font-family: var(--body); font-weight: 600; font-size: 30px; color: var(--accent); margin-top: 12px; }
.speaker-bio { font-family: var(--body); font-size: 30px; line-height: 1.45; color: var(--muted); margin-top: 22px; max-width: 30ch; }
.socials { display: flex; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
.social { display: inline-flex; align-items: center; gap: 10px; padding: 12px 22px; border-radius: 999px; background: rgba(37,99,235,0.08); border: 1px solid var(--card-border); font-family: var(--body); font-weight: 600; font-size: 25px; color: var(--text); }
.social::before { content: ''; width: 12px; height: 12px; border-radius: 4px; background: var(--accent); }

/* Key-takeaway cards — friendly rounded chip + number */
.takes { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.take { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 24px; padding: 42px 38px 40px; box-shadow: var(--card-shadow); position: relative; }
.take-n { display: inline-grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; background: rgba(37,99,235,0.1); color: var(--accent); font-family: var(--display); font-weight: 800; font-size: 28px; }
.take-t { font-family: var(--display); font-weight: 700; font-size: 36px; line-height: 1.06; color: var(--text); margin-top: 24px; }
.take-d { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); margin-top: 12px; }

/* Poll / Q&A live callout — friendly rounded card with a leading dot */
.callout { background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); border-radius: 22px; padding: 38px 44px; }
.callout-k { display: inline-flex; align-items: center; gap: 12px; font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 21px; color: var(--accent); margin-bottom: 14px; }
.callout-k::before { content: ''; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 6px rgba(37,99,235,0.16); }

/* Poll option bars — live-vote rows */
.poll { display: flex; flex-direction: column; gap: 22px; }
.poll-row { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center; }
.poll-bar { position: relative; height: 64px; border-radius: 14px; background: #eef1f9; overflow: hidden; }
.poll-fill { position: absolute; inset: 0 auto 0 0; width: var(--v, 50%); background: var(--accent); border-radius: 14px; opacity: 0.92; }
.poll-name { position: absolute; left: 26px; top: 0; bottom: 0; display: flex; align-items: center; font-family: var(--body); font-weight: 600; font-size: 28px; color: #fff; z-index: 1; }
.poll-pct { font-family: var(--display); font-weight: 800; font-size: 40px; color: var(--accent); font-variant-numeric: tabular-nums; min-width: 4ch; text-align: right; }

/* CTA card — bordered invitation block */
.cta { background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.55); border-radius: 24px; padding: 40px 46px; display: inline-flex; flex-direction: column; gap: 10px; }
.cta-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 22px; color: #fff; opacity: 0.85; }
.cta-line { font-family: var(--display); font-weight: 700; font-size: 44px; color: #fff; letter-spacing: -0.01em; }

/* Resource list rows */
.reslist { display: flex; flex-direction: column; }
.res { display: grid; grid-template-columns: 64px 1fr auto; gap: 28px; align-items: center; padding: 26px 0; border-top: 1px solid var(--card-border); }
.res:last-child { border-bottom: 1px solid var(--card-border); }
.res-ic { width: 56px; height: 56px; border-radius: 16px; background: rgba(37,99,235,0.1); display: grid; place-items: center; color: var(--accent); font-family: var(--display); font-weight: 800; font-size: 24px; }
.res-t { font-family: var(--display); font-weight: 700; font-size: 34px; color: var(--text); }
.res-d { font-family: var(--body); font-size: 25px; color: var(--muted); margin-top: 4px; }
.res-tag { font-family: var(--body); font-weight: 600; font-size: 24px; color: var(--accent); }

/* Phone reflow: scale bespoke decoration calibrated for the 1920px stage */
@media (max-width: 640px) {
  html.deck-can-flow .hook { font-size: min(40px, 11vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .divider { position: static !important; inset: auto !important; padding: 32px 22px !important; }
  html.deck-can-flow .divider-title { font-size: min(50px, 14vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .divider-num { font-size: min(18px, 5vw) !important; }
  html.deck-can-flow .speaker { grid-template-columns: 1fr !important; gap: 24px 0 !important; }
  html.deck-can-flow .speaker-photo { aspect-ratio: 4 / 3 !important; max-width: 320px !important; }
  html.deck-can-flow .speaker-name { font-size: min(36px, 10vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .speaker-bio { max-width: 100% !important; }
  html.deck-can-flow .take { padding: 26px 22px !important; }
  html.deck-can-flow .take-t { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .callout { padding: 26px 22px !important; }
  html.deck-can-flow .poll-row { grid-template-columns: 1fr !important; gap: 8px 0 !important; }
  html.deck-can-flow .poll-bar { height: auto !important; min-height: 52px !important; }
  html.deck-can-flow .poll-name { position: static !important; padding: 12px 18px !important; }
  html.deck-can-flow .poll-pct { text-align: left !important; min-width: 0 !important; font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .cta { padding: 26px 24px !important; }
  html.deck-can-flow .cta-line { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .res { grid-template-columns: 56px 1fr !important; gap: 12px 16px !important; }
  html.deck-can-flow .res-t { font-size: min(28px, 7vw) !important; }
  html.deck-can-flow .res-tag { grid-column: 2 !important; justify-self: start !important; margin-top: 4px !important; }
}`,
  notes:
    'A complete friendly live-webinar deck: Plus Jakarta Sans display + Inter body, cobalt #2563eb on white/soft-cream #f6f7fb, ONE warm-blue accent, rounded corners, generous whitespace, no gradients. Open and close on the friendly abstract full-bleed (assets/webinar-cover.jpg); use the speaker/studio figure (assets/webinar-fig.jpg) in the .speaker card and a key-concept .split. Signature pieces: the oversized .hook welcome line, the .speaker card (photo + bio + .socials), .steps for the agenda and the framework, .takes key-takeaway cards, .callout + .poll for live poll/Q&A moments, .reslist resources, and the .cta invitation card on the close. Use .stats for the problem, .flow for a concept walkthrough, .bars/.donut for the data point, .quote for a real example. Warm and welcoming, speaker-led, never corporate — write like you are talking to the room.',
  sampleSlides: [
    s({
      id: 'web-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.9">Live Webinar · Thursday, Jun 26 · 11:00 AM PT</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:10px">Write less,<br/>ship more.</h1>
    <p class="lead reveal">A practical hour on cutting busywork from your team's week — with live Q&amp;A.</p>
  </div>
</div>`,
    }),
    s({
      id: 'web-housekeeping',
      name: 'Housekeeping',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Before we start</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">A few quick housekeeping notes.</h2>
  <div class="two-col reveal" style="--col-gap:90px;align-items:start">
    <ul class="checks" style="--gap:26px">
      <li class="check"><span>We're <b>recording</b> — the replay and slides land in your inbox tomorrow.</span></li>
      <li class="check"><span>Mics are muted; drop questions in the <b>Q&amp;A panel</b> anytime.</span></li>
      <li class="check"><span>We'll <b>pause for two live polls</b> and save 10 minutes for Q&amp;A.</span></li>
    </ul>
    <div class="callout">
      <div class="callout-k">Say hi</div>
      <p class="body" style="max-width:none">New here? Tell us <b>where you're joining from</b> in the chat — we love to see the room.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Housekeeping</span></div>
</div>`,
    }),
    s({
      id: 'web-speaker',
      name: 'Meet your speaker',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="speaker reveal">
    <figure class="speaker-photo"><img src="${FIG_IMG}" alt=""></figure>
    <div>
      <div class="kicker">Your host</div>
      <div class="speaker-name" style="margin-top:10px">Maya Okonkwo</div>
      <div class="speaker-role">Head of Operations · author of "The Quiet Week"</div>
      <p class="speaker-bio">Maya has helped 200+ teams reclaim their calendars. She writes weekly about doing less, better — and answers every email herself.</p>
      <div class="socials">
        <span class="social">@mayaokonkwo</span>
        <span class="social">maya.studio/notes</span>
        <span class="social">in/mayaokonkwo</span>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Your speaker</span></div>
</div>`,
    }),
    s({
      id: 'web-agenda',
      name: "What you'll learn",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What you'll learn today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Four things, one hour.</h2>
  <ol class="steps reveal" style="--gap:26px">
    <li class="step"><span>Why your team's week quietly fills with <b>low-value busywork</b>.</span></li>
    <li class="step"><span>The two ideas that make <b>focus the default</b>, not the exception.</span></li>
    <li class="step"><span>A simple <b>weekly framework</b> you can run starting Monday.</span></li>
    <li class="step"><span>What changed for teams who tried it — and your <b>live questions</b>.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'web-div1',
      name: 'Section · The topic',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The topic</div>
  <div class="divider-title reveal">Where the<br/>week goes.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'web-problem',
      name: 'The problem',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The problem we all feel</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">Busy isn't the same as productive.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">62%</div><div class="stat-label">Of the work week spent on work <em>about</em> work</div></div>
    <div class="stat"><div class="stat-num">23</div><div class="stat-label">Average daily interruptions before noon</div></div>
    <div class="stat"><div class="stat-num">1 in 4</div><div class="stat-label">Meetings the attendees say could have been a note</div></div>
  </div>
  <p class="fine reveal" style="margin-top:34px">Sources: 2025 workplace focus survey of 1,400 knowledge workers.</p>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'web-concept1',
      name: 'Key concept · Protect the maker hours',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Key concept · 01</div>
    <h2 class="headline reveal">Protect the maker hours.</h2>
    <p class="lead reveal">Deep work happens in blocks, not in the gaps between meetings. The teams that ship most simply guard a few hours a day — and treat them as immovable.</p>
    <div class="callout reveal" style="margin-top:8px">
      <div class="callout-k">Try this</div>
      <p class="body" style="max-width:none">Pick <b>one daily two-hour block</b> the whole team keeps meeting-free. Defend it like a customer call.</p>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'web-concept2',
      name: 'Key concept · The decision loop',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key concept · 02</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Replace the status meeting with a loop.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="take"><div class="take-n">A</div><div class="take-t">Write</div><div class="take-d">Post the update once, where the work lives.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="take"><div class="take-n">B</div><div class="take-t">Read</div><div class="take-d">Everyone catches up on their own time.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="take"><div class="take-n">C</div><div class="take-t">Decide</div><div class="take-d">Only the open questions get a quick call.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="take"><div class="take-n">D</div><div class="take-t">Move</div><div class="take-d">Back to making, with the decision logged.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Concept 02</span></div>
</div>`,
    }),
    s({
      id: 'web-data',
      name: 'A data point that matters',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">A data point that matters</div>
      <h2 class="headline" style="margin-top:8px">Focus blocks add up fast.</h2>
      <p class="lead">Teams that protected one daily block recovered roughly a full working day every week — measured across a 90-day pilot.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:22%"><div class="bar-fill" data-val="2h"></div><div class="bar-label">Wk 1</div></div>
      <div class="bar" style="--h:46%"><div class="bar-fill" data-val="4h"></div><div class="bar-label">Wk 4</div></div>
      <div class="bar" style="--h:70%"><div class="bar-fill" data-val="6h"></div><div class="bar-label">Wk 8</div></div>
      <div class="bar" style="--h:92%"><div class="bar-fill" data-val="8h"></div><div class="bar-label">Wk 12</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">The data</span></div>
</div>`,
    }),
    s({
      id: 'web-scoreboard',
      name: 'Before & after',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">90 days in the pilot</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">What actually changed.</h2>
  <table class="table reveal">
    <thead><tr><th>Measure</th><th class="num">Before</th><th class="num">After</th><th class="num">Change</th></tr></thead>
    <tbody>
      <tr><td>Focus hours per person / week</td><td class="num">6.2</td><td class="num">13.8</td><td class="num pos">+7.6</td></tr>
      <tr><td>Recurring meetings / week</td><td class="num">11</td><td class="num">6</td><td class="num pos">&minus;5</td></tr>
      <tr><td>Median time to a decision</td><td class="num">3.4 d</td><td class="num">1.1 d</td><td class="num pos">&minus;68%</td></tr>
      <tr class="row-em"><td>Team-reported "good week"</td><td class="num">41%</td><td class="num">79%</td><td class="num pos">+38 pts</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Self-reported across 12 teams running the quiet-week loop for one quarter.</p>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Before &amp; after</span></div>
</div>`,
    }),
    s({
      id: 'web-quote',
      name: 'A real example',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"We killed our daily standup and protected mornings. Two weeks later the backlog was moving faster than it had in a year."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Jordan Reyes</span><span class="cite-role">Eng lead, a 40-person product team</span></div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">A real example</span></div>
</div>`,
    }),
    s({
      id: 'web-poll',
      name: 'Live poll',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="callout-k reveal" style="font-size:23px">Live poll · vote in the panel now</div>
  <h2 class="headline reveal" style="margin-top:14px;margin-bottom:30px">What eats most of your week?</h2>
  <div class="poll reveal">
    <div class="poll-row"><div class="poll-bar"><div class="poll-fill" style="--v:48%"></div><span class="poll-name">Meetings &amp; status updates</span></div><span class="poll-pct">48%</span></div>
    <div class="poll-row"><div class="poll-bar"><div class="poll-fill" style="--v:27%"></div><span class="poll-name">Context-switching &amp; pings</span></div><span class="poll-pct">27%</span></div>
    <div class="poll-row"><div class="poll-bar"><div class="poll-fill" style="--v:16%"></div><span class="poll-name">Reporting &amp; admin</span></div><span class="poll-pct">16%</span></div>
    <div class="poll-row"><div class="poll-bar"><div class="poll-fill" style="--v:9%"></div><span class="poll-name">Honestly, not sure</span></div><span class="poll-pct">9%</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Live poll</span></div>
</div>`,
    }),
    s({
      id: 'web-div2',
      name: 'Section · Apply it',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Apply it</div>
  <div class="divider-title reveal">Make it<br/>stick.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'web-takeaways',
      name: 'Three takeaways',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">If you remember nothing else</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Three takeaways.</h2>
  <div class="takes reveal" style="--cols:3">
    <div class="take"><div class="take-n">01</div><div class="take-t">Guard one block a day</div><div class="take-d">Protect a shared, meeting-free window and treat it as non-negotiable.</div></div>
    <div class="take"><div class="take-n">02</div><div class="take-t">Write before you meet</div><div class="take-d">Default to a written update; meet only for the open decisions.</div></div>
    <div class="take"><div class="take-n">03</div><div class="take-t">Cut, then measure</div><div class="take-d">Remove one ritual, watch the throughput, and keep what earns its place.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Takeaways</span></div>
</div>`,
    }),
    s({
      id: 'web-framework',
      name: 'A quick framework',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">A quick framework</div>
      <h2 class="headline" style="margin-top:8px">Run the quiet week.</h2>
      <p class="lead">A five-step loop you can start this Monday — no new tools required.</p>
    </div>
    <ol class="steps" style="--gap:24px">
      <li class="step"><span><b>Audit</b> last week — where did the hours actually go?</span></li>
      <li class="step"><span><b>Block</b> a daily focus window for the whole team.</span></li>
      <li class="step"><span><b>Convert</b> one recurring meeting into a written update.</span></li>
      <li class="step"><span><b>Protect</b> it for two weeks, no exceptions.</span></li>
      <li class="step"><span><b>Review</b> what moved, then keep or adjust.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Framework</span></div>
</div>`,
    }),
    s({
      id: 'web-resources',
      name: 'Resources',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Take this with you</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Resources &amp; next reads.</h2>
  <div class="reslist reveal">
    <div class="res"><div class="res-ic">PDF</div><div><div class="res-t">The Quiet Week worksheet</div><div class="res-d">A one-page audit and block planner you can print.</div></div><span class="res-tag">Free download</span></div>
    <div class="res"><div class="res-ic">VID</div><div><div class="res-t">Today's replay + slides</div><div class="res-d">Emailed to every registrant within 24 hours.</div></div><span class="res-tag">Tomorrow</span></div>
    <div class="res"><div class="res-ic">NL</div><div><div class="res-t">Weekly notes from Maya</div><div class="res-d">One short idea on doing less, better, every Friday.</div></div><span class="res-tag">Subscribe</span></div>
    <div class="res"><div class="res-ic">CM</div><div><div class="res-t">The community channel</div><div class="res-d">Compare what worked with other teams trying the loop.</div></div><span class="res-tag">Join</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Resources</span></div>
</div>`,
    }),
    s({
      id: 'web-qa',
      name: 'Live Q&A',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="callout-k" style="font-size:23px">Live now · Q&amp;A</div>
      <h2 class="hook" style="margin-top:18px">Your turn.<br/><span class="accent-text">Ask away.</span></h2>
      <div class="hook-rule" style="margin-top:26px"></div>
    </div>
    <div class="callout">
      <div class="callout-k">How to ask</div>
      <ul class="bullets" style="--gap:20px">
        <li class="bullet"><span>Type your question in the <b>Q&amp;A panel</b> — not the chat.</span></li>
        <li class="bullet"><span><b>Upvote</b> a question you'd like answered first.</span></li>
        <li class="bullet"><span>We'll get to as many as we can in the next <b>10 minutes</b>.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Lean Team Show</span><span class="runner-label">Live Q&amp;A</span></div>
</div>`,
    }),
    s({
      id: 'web-close',
      name: 'Thank you',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.9">Thanks for spending an hour with us</div>
    <h2 class="display reveal" style="--display-size:118px">See you<br/>next week.</h2>
    <div class="cta reveal" style="margin-top:30px">
      <span class="cta-k">Keep going</span>
      <span class="cta-line">maya.studio/quiet-week · @mayaokonkwo</span>
    </div>
  </div>
</div>`,
    }),
  ],
}
