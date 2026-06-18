import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/workshop-cover.jpg'
const FIG_IMG = 'assets/workshop-fig.jpg'

export const workshop: Template = {
  id: 'workshop',
  categories: ['Education'],
  name: 'Workshop',
  tagline: 'Energetic, hands-on facilitation deck',
  audiences: ['facilitator', 'educator', 'team', 'training'],
  description:
    'A high-energy hands-on workshop deck in electric orange on warm paper. Numbered exercise badges, timer chips, materials checklists, and "your turn" callouts carry a complete design-thinking session you run end to end — just swap in your own exercises and timing.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fffdf7',
    '--text': '#1c1917',
    '--muted': '#78716c',
    '--accent': '#ea580c',
    '--accent-2': '#ea580c',
    '--display': "'Space Grotesk', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '130px',
    '--headline-size': '78px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#ece7dc',
    '--card-shadow': '0 18px 44px -30px rgba(28,25,23,0.28)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '120px',
    '--th-border': '#1c1917',
    '--table-border': '#ece7dc',
    '--track': '#f0e9da',
    '--donut-hole': '#fffdf7',
    '--bar-gap': '34px',
    '--bullet-color': '#ea580c',
    '--chip-bg': '#fdecdf',
    '--media-shadow': '0 50px 110px -45px rgba(28,25,23,0.5)',
    '--media-radius': '20px',
    '--scrim':
      'linear-gradient(180deg, rgba(28,25,23,0.08) 0%, rgba(28,25,23,0.40) 52%, rgba(28,25,23,0.88) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
  },
  stageBg: '#f3ede0',
  assets: ['workshop-cover.jpg', 'workshop-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.step::before { color: var(--accent); background: var(--chip-bg); border-color: #f6d8c1; }

/* Section divider — bold orange rule on paper */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--display); font-weight: 700; letter-spacing: 0.2em; font-size: 24px; color: var(--accent); text-transform: uppercase; }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 152px; line-height: 0.94; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 132px; height: 7px; border-radius: 4px; background: var(--accent); margin-top: 18px; }

/* Signature: numbered exercise badge (big circular marker) */
.exbadge { display: inline-flex; align-items: center; gap: 22px; }
.exbadge-n { width: 92px; height: 92px; flex: 0 0 auto; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 46px; box-shadow: 0 14px 30px -10px rgba(234,88,12,0.6); }
.exbadge-k { font-family: var(--display); font-weight: 700; text-transform: uppercase; letter-spacing: 0.16em; font-size: 22px; color: var(--accent); }
.exbadge-t { font-family: var(--display); font-weight: 700; font-size: 56px; line-height: 1.0; letter-spacing: -0.02em; color: var(--text); margin-top: 4px; }

/* Signature: timer / duration chip */
.chip { display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px 12px 20px; border-radius: 999px; background: var(--chip-bg); border: 1px solid #f6d8c1; font-family: var(--display); font-weight: 600; font-size: 26px; color: #9a3412; }
.chip::before { content: ''; width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--accent); border-top-color: transparent; transform: rotate(20deg); }
.chip.solid { background: var(--accent); border-color: var(--accent); color: #fff; }
.chip.solid::before { border-color: rgba(255,255,255,0.85); border-top-color: transparent; }
.chiprow { display: flex; flex-wrap: wrap; gap: 16px; }

/* Signature: materials checklist (boxed ticks) */
.materials { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 18px 40px; }
.mat { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.mat-box { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 9px; border: 2px solid var(--accent); display: grid; place-items: center; color: var(--accent); font-size: 24px; font-weight: 800; }

/* Signature: "your turn" callout */
.yourturn { border: 2px dashed var(--accent); background: #fef3ec; border-radius: 20px; padding: 36px 44px; display: flex; align-items: center; gap: 30px; }
.yourturn-tag { font-family: var(--display); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; font-size: 21px; color: #fff; background: var(--accent); padding: 10px 20px; border-radius: 999px; flex: 0 0 auto; }
.yourturn-text { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.18; color: var(--text); }

/* Signature: agenda timeline rows with duration chip */
.agenda { display: flex; flex-direction: column; }
.ag-row { display: grid; grid-template-columns: 168px 1fr auto; gap: 40px; align-items: center; padding: 26px 0; border-top: 1px solid var(--card-border); }
.ag-row:last-child { border-bottom: 1px solid var(--card-border); }
.ag-time { font-family: var(--display); font-weight: 700; font-size: 34px; color: var(--accent); font-variant-numeric: tabular-nums; }
.ag-name { font-family: var(--display); font-weight: 600; font-size: 38px; color: var(--text); }
.ag-name span { display: block; font-family: var(--body); font-weight: 400; font-size: 25px; color: var(--muted); margin-top: 4px; }

/* Activity card for share-back */
.actcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 36px; box-shadow: var(--card-shadow); border-top: 6px solid var(--accent); }
.actcard-n { font-family: var(--display); font-weight: 700; font-size: 26px; color: var(--accent); }
.actcard-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.06; color: var(--text); margin-top: 14px; }
.actcard-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 10px; }`,
  notes:
    'A complete hands-on design-thinking workshop run-of-show: Space Grotesk display + Inter body, charcoal #1c1917 on warm paper #fffdf7, ONE electric-orange (#ea580c) accent, lots of whitespace, no gradients. Open and close on the overhead-hands full-bleed (assets/workshop-cover.jpg); use the activity figure (assets/workshop-fig.jpg) for an exercise split. Signature pieces: .exbadge numbered exercise badges, .chip timer/duration chips (.chip.solid for the active timer), .materials boxed checklist, .yourturn dashed callout for prompts, and the .agenda timeline with duration chips. Use .steps for exercise instructions, .checks for ground rules and takeaways, .bars for the reflection data, .actcard cards for share-back, .quote for the participant voice. Keep energy high and timing explicit — every exercise gets a badge and a timer chip.',
  sampleSlides: [
    s({
      id: 'ws-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Hands-On Workshop · Half-Day Session</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:8px">Design<br/>thinking,<br/>by doing.</h1>
    <p class="lead reveal">A practical sprint through the full problem-to-prototype loop — sleeves up, markers out.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ws-goal',
      name: "Today's goal",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Today's goal</div>
      <h2 class="headline" style="margin-top:8px">Leave with a tested idea, not just notes.</h2>
    </div>
    <div>
      <ul class="bullets" style="--gap:26px">
        <li class="bullet"><span><b>Reframe</b> a real problem from the user's point of view.</span></li>
        <li class="bullet"><span><b>Generate</b> far more ideas than feel comfortable.</span></li>
        <li class="bullet"><span><b>Build &amp; test</b> a rough prototype before you leave the room.</span></li>
      </ul>
      <div class="chiprow reveal" style="margin-top:36px">
        <span class="chip">3.5 hours</span>
        <span class="chip">teams of 4</span>
        <span class="chip">5 exercises</span>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Today's goal</span></div>
</div>`,
    }),
    s({
      id: 'ws-agenda',
      name: 'Agenda & timing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Run of show</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">How the time breaks down.</h2>
  <div class="agenda reveal">
    <div class="ag-row"><div class="ag-time">0:00</div><div class="ag-name">Warm-up &amp; framing<span>Ground rules and the day's challenge</span></div><span class="chip">20 min</span></div>
    <div class="ag-row"><div class="ag-time">0:20</div><div class="ag-name">Empathize &amp; define<span>Exercise 1 — reframe the problem</span></div><span class="chip">45 min</span></div>
    <div class="ag-row"><div class="ag-time">1:05</div><div class="ag-name">Ideate<span>Exercise 2 — diverge, then converge</span></div><span class="chip">40 min</span></div>
    <div class="ag-row"><div class="ag-time">1:45</div><div class="ag-name">Prototype &amp; test<span>Build rough, test fast, share back</span></div><span class="chip">60 min</span></div>
    <div class="ag-row"><div class="ag-time">2:45</div><div class="ag-name">Reflect &amp; wrap<span>What we learned and where it goes next</span></div><span class="chip">45 min</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'ws-rules',
      name: 'Ground rules',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Ground rules</div>
      <h2 class="headline" style="margin-top:8px">Five agreements for the room.</h2>
      <p class="lead">Keep these in view all day — they're what make a fast, messy workshop feel safe.</p>
    </div>
    <ul class="checks" style="--gap:26px;--bullet-size:36px">
      <li class="check"><span><b>Defer judgment.</b> Every idea earns a sticky note first.</span></li>
      <li class="check"><span><b>Go for volume.</b> Quantity now, quality later.</span></li>
      <li class="check"><span><b>Build on others.</b> "Yes, and" beats "no, but".</span></li>
      <li class="check"><span><b>Stay visual.</b> Sketch it before you explain it.</span></li>
      <li class="check"><span><b>One voice at a time.</b> Headlines, not speeches.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Ground rules</span></div>
</div>`,
    }),
    s({
      id: 'ws-div1',
      name: 'Section · Warm-up',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 01 — Warm-up</div>
  <div class="divider-title reveal">Get the<br/>room moving.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'ws-icebreaker',
      name: 'Ice-breaker',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Ice-breaker · everyone</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The worst idea, on purpose.</h2>
  <div class="yourturn reveal">
    <span class="yourturn-tag">Your turn</span>
    <span class="yourturn-text">In 90 seconds, sketch the <b>worst possible solution</b> to "getting to work on time", then pitch it to your table in one breath.</span>
  </div>
  <div class="chiprow reveal" style="margin-top:34px">
    <span class="chip solid">90 seconds to sketch</span>
    <span class="chip">1 minute per table to share</span>
  </div>
  <p class="lead reveal" style="margin-top:30px;max-width:40ch">Bad ideas dissolve the fear of the blank page — and they're usually one flip away from a great one.</p>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Ice-breaker</span></div>
</div>`,
    }),
    s({
      id: 'ws-framework',
      name: 'The framework',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The framework</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Five modes, one loop.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="actcard"><div class="actcard-n">01</div><div class="actcard-t">Empathize</div><div class="actcard-d">Watch and listen before you assume.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="actcard"><div class="actcard-n">02</div><div class="actcard-t">Define</div><div class="actcard-d">Frame the real problem to solve.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="actcard"><div class="actcard-n">03</div><div class="actcard-t">Ideate</div><div class="actcard-d">Diverge wide, then converge.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="actcard"><div class="actcard-n">04</div><div class="actcard-t">Prototype</div><div class="actcard-d">Make it rough and tangible.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="actcard"><div class="actcard-n">05</div><div class="actcard-t">Test</div><div class="actcard-d">Learn, then loop back.</div></div></div>
  </div>
  <p class="fine reveal" style="margin-top:30px">It isn't linear — every test sends you back a step. That's the point.</p>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">The framework</span></div>
</div>`,
    }),
    s({
      id: 'ws-div2',
      name: 'Section · Build',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 02 — Build</div>
  <div class="divider-title reveal">Hands on<br/>the work.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'ws-ex1',
      name: 'Exercise 1',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="exbadge reveal">
    <span class="exbadge-n">1</span>
    <span><span class="exbadge-k">Exercise · Empathize &amp; define</span><span class="exbadge-t">Reframe the problem.</span></span>
  </div>
  <ol class="steps reveal" style="--gap:22px;margin-top:38px">
    <li class="step"><span>Each person writes <b>three real frustrations</b> a user has — one per sticky.</span></li>
    <li class="step"><span>Cluster the stickies at your table and <b>name the patterns</b> you see.</span></li>
    <li class="step"><span>Turn the strongest pattern into a <b>"How might we…"</b> question.</span></li>
  </ol>
  <div class="chiprow reveal" style="margin-top:36px">
    <span class="chip solid">45 minutes</span>
    <span class="chip">stickies + markers</span>
    <span class="chip">one HMW per table</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Exercise 1</span></div>
</div>`,
    }),
    s({
      id: 'ws-ex2',
      name: 'Exercise 2',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="exbadge reveal">
      <span class="exbadge-n">2</span>
      <span><span class="exbadge-k">Exercise · Ideate</span><span class="exbadge-t">Diverge, then converge.</span></span>
    </div>
    <p class="lead reveal" style="margin-top:8px">Silent solo sketching first — eight ideas in eight minutes — then dot-vote as a table to pick one to build.</p>
    <div class="chiprow reveal">
      <span class="chip solid">8 min silent</span>
      <span class="chip">3 dots each</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'ws-shareback',
      name: 'Share-back',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Share-back · 3 minutes per table</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Pitch it in three frames.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="actcard"><div class="actcard-n">Frame 01</div><div class="actcard-t">The user &amp; their need</div><div class="actcard-d">Who is this for, and what were they stuck on?</div></div>
    <div class="actcard"><div class="actcard-n">Frame 02</div><div class="actcard-t">Your idea, in one line</div><div class="actcard-d">The single move that changes their day.</div></div>
    <div class="actcard"><div class="actcard-n">Frame 03</div><div class="actcard-t">What you'd test next</div><div class="actcard-d">The riskiest assumption you still need to check.</div></div>
  </div>
  <div class="yourturn reveal" style="margin-top:30px">
    <span class="yourturn-tag">Your turn</span>
    <span class="yourturn-text">Tape your prototype to the wall. <b>One presenter, three frames, no slides.</b></span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Share-back</span></div>
</div>`,
    }),
    s({
      id: 'ws-reflect',
      name: 'Reflection data',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">A quick reflection</div>
      <h2 class="headline" style="margin-top:8px">Confidence climbs as you make.</h2>
      <p class="lead">Self-rated confidence in the idea, captured at each mode across past cohorts. The jump happens when teams stop talking and start building.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:28%"><div class="bar-fill" data-val="2.1"></div><div class="bar-label">Empathize</div></div>
      <div class="bar" style="--h:42%"><div class="bar-fill" data-val="3.0"></div><div class="bar-label">Define</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" data-val="3.8"></div><div class="bar-label">Ideate</div></div>
      <div class="bar" style="--h:82%"><div class="bar-fill" data-val="4.4"></div><div class="bar-label">Prototype</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="4.7"></div><div class="bar-label">Test</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Reflection</span></div>
</div>`,
    }),
    s({
      id: 'ws-div3',
      name: 'Section · Wrap',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 03 — Wrap</div>
  <div class="divider-title reveal">Carry it<br/>forward.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'ws-takeaways',
      name: 'Key takeaways',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Key takeaways</div>
      <h2 class="headline" style="margin-top:8px">Four habits to keep.</h2>
      <p class="lead">You don't need a workshop to work this way — these five-minute versions fit into any meeting.</p>
    </div>
    <ul class="checks" style="--gap:26px;--bullet-size:36px">
      <li class="check"><span><b>Start from the user</b>, not the solution.</span></li>
      <li class="check"><span><b>Make ideas visible</b> before you debate them.</span></li>
      <li class="check"><span><b>Prototype to think</b> — rough beats perfect.</span></li>
      <li class="check"><span><b>Test early</b>; let real reactions decide.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Takeaways</span></div>
</div>`,
    }),
    s({
      id: 'ws-resources',
      name: 'Resources & next steps',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:start">
    <div>
      <div class="kicker">Take it home</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Your starter kit.</h2>
      <div class="materials" style="--cols:1">
        <div class="mat"><span class="mat-box">&#10003;</span>The "How might we…" prompt cards</div>
        <div class="mat"><span class="mat-box">&#10003;</span>Crazy-8s ideation sheet (PDF)</div>
        <div class="mat"><span class="mat-box">&#10003;</span>One-page test-script template</div>
        <div class="mat"><span class="mat-box">&#10003;</span>This deck and the photo wall</div>
      </div>
    </div>
    <div>
      <div class="kicker">Next steps</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:18px">In the next two weeks.</h2>
      <table class="table">
        <thead><tr><th>When</th><th>Do this</th><th class="num">Time</th></tr></thead>
        <tbody>
          <tr><td>Day 1–3</td><td>Test today's prototype with five real users</td><td class="num">45m</td></tr>
          <tr><td>Week 1</td><td>Share the wall; pick the next iteration</td><td class="num">30m</td></tr>
          <tr class="row-em"><td>Week 2</td><td>Book a focused sprint on the strongest idea</td><td class="num">60m</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Resources</span></div>
</div>`,
    }),
    s({
      id: 'ws-quote',
      name: 'Participant quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"I came in skeptical about sticky notes. I left with a prototype my team is actually shipping."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nair</span><span class="cite-role">Product Manager · past cohort</span></div>
  <div class="runner reveal"><span class="runner-brand">Design Thinking Lab</span><span class="runner-label">Participant voice</span></div>
</div>`,
    }),
    s({
      id: 'ws-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Thanks for building with us</div>
    <h2 class="display reveal" style="--display-size:128px">Now go<br/>make it real.</h2>
    <p class="lead reveal">facilitator@designthinkinglab.org · slides &amp; templates in your inbox today</p>
  </div>
</div>`,
    }),
  ],
}
