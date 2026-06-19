import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/classroom-cover.jpg'
const FIG_IMG = 'assets/classroom-fig.jpg'

export const classroom: Template = {
  id: 'classroom',
  categories: ['Education'],
  name: 'Classroom',
  tagline: 'Warm, friendly, and effortlessly legible',
  audiences: ['teacher', 'education', 'workshop', 'training'],
  description:
    'A warm, rounded K-12 lesson deck on cream paper with the ultra-legible Lexend typeface and soft shadows. The bundled sample is a complete ecosystems & food-webs science lesson — objectives, vocabulary, a labelled diagram, a hands-on activity, and a quiz — that you retitle for any subject.',
  fonts: {
    display: 'Lexend',
    body: 'Lexend',
    links: [
      'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fffdf7',
    '--text': '#332c26',
    '--muted': '#8a7d70',
    '--accent': '#ef6c4d',
    '--accent-2': '#1f9c8f',
    '--display': "'Lexend', sans-serif",
    '--body': "'Lexend', sans-serif",
    '--display-weight': '700',
    '--title-size': '120px',
    '--headline-size': '78px',
    '--lead-size': '40px',
    '--kicker-size': '23px',
    '--kicker-tracking': '0.18em',
    '--card-bg': '#ffffff',
    '--card-border': '#f0e7d8',
    '--card-shadow': '0 14px 40px -16px rgba(120,90,50,0.18)',
    '--radius': '30px',
    '--media-radius': '30px',
    '--media-shadow': '0 40px 80px -28px rgba(120,90,50,0.30)',
    '--chip-bg': '#fff3ec',
    '--pill-bg': '#fff3ec',
    '--stat-size': '104px',
    '--metric-size': '116px',
    '--th-border': '#332c26',
    '--table-border': '#f0e7d8',
    '--track': '#f0e7d8',
    '--donut-hole': '#fffdf7',
    '--bar-gap': '34px',
    '--scrim':
      'linear-gradient(180deg, rgba(60,40,24,0.04) 0%, rgba(60,40,24,0.34) 55%, rgba(50,32,18,0.80) 100%)',
    '--pos': '#1f9c8f',
    '--neg': '#ef6c4d',
  },
  stageBg: '#fbf3e6',
  assets: ['classroom-cover.jpg', 'classroom-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent-2); }
.bullet::before { width: 18px; height: 18px; }
.check::before { color: var(--accent-2); }
.step::before { color: #fff; background: var(--accent); border-color: var(--accent); }
.pill { background: var(--pill-bg); border-color: #f6d8c9; color: var(--accent); font-weight: 700; }
.flow-arrow::after { border-color: var(--accent); }
.full-bleed .title, .full-bleed .display { text-shadow: 0 2px 24px rgba(50,32,18,0.35); }

/* Section divider — sunny tinted card on cream */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { display: inline-flex; align-items: center; gap: 16px; font-family: var(--display); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 26px; color: var(--accent-2); }
.divider-num::before { content: ''; width: 56px; height: 4px; border-radius: 3px; background: var(--accent-2); }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 140px; line-height: 0.98; letter-spacing: -0.02em; color: var(--text); }
.divider-rule { width: 132px; height: 8px; border-radius: 4px; background: var(--accent); margin-top: 10px; }

/* Big friendly question lockup for the lesson hook */
.bigq { font-family: var(--display); font-weight: 700; font-size: 116px; line-height: 1.0; letter-spacing: -0.02em; color: var(--text); text-wrap: balance; }

/* Vocabulary cards — rounded emoji chip + term + meaning */
.vocab { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 30px; }
.vcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 26px; box-shadow: var(--card-shadow); padding: 34px 36px; display: flex; gap: 26px; align-items: flex-start; }
.vchip { flex: 0 0 auto; width: 78px; height: 78px; border-radius: 22px; background: var(--chip-bg); display: grid; place-items: center; font-size: 42px; line-height: 1; }
.vterm { font-family: var(--display); font-weight: 700; font-size: 38px; color: var(--text); }
.vdef { font-family: var(--body); font-size: 26px; line-height: 1.4; color: var(--muted); margin-top: 6px; }

/* Friendly callout — think-pair-share / teacher note */
.callout { border-left: 8px solid var(--accent-2); background: #ecf7f5; padding: 34px 42px; border-radius: 0 22px 22px 0; }
.callout-k { font-family: var(--display); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 22px; color: var(--accent-2); margin-bottom: 12px; }
.callout .body { color: var(--text); }

/* Diagram label tag pinned over a figure */
.figdot { display: inline-flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 700; font-size: 28px; color: var(--text); }
.figdot::before { content: ''; width: 18px; height: 18px; border-radius: 50%; flex: 0 0 auto; background: var(--accent); }
.figdot.t2::before { background: var(--accent-2); }
.figdot.t3::before { background: #e6a33c; }

/* Trophic-level flow chips inside the shared .flow diagram */
.trophic { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 26px; box-shadow: var(--card-shadow); padding: 30px 26px; text-align: center; }
.trophic .emoji { font-size: 56px; line-height: 1; }
.trophic .t-name { font-family: var(--display); font-weight: 700; font-size: 32px; color: var(--text); margin-top: 14px; }
.trophic .t-role { font-family: var(--body); font-size: 23px; line-height: 1.32; color: var(--muted); margin-top: 6px; }

/* Quiz cards — question with answer pill */
.quiz { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.qcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 26px; box-shadow: var(--card-shadow); padding: 36px 38px; }
.qnum { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--accent); color: #fff; font-family: var(--display); font-weight: 700; font-size: 26px; }
.qq { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.2; color: var(--text); margin-top: 18px; }
.qa { display: inline-block; margin-top: 18px; padding: 10px 22px; border-radius: 999px; background: #ecf7f5; color: var(--accent-2); font-family: var(--display); font-weight: 700; font-size: 24px; }

@media (max-width: 640px) {
  html.deck-can-flow .divider { position: relative !important; inset: auto !important; min-height: 280px; padding: 56px var(--pad-x, 22px) !important; gap: 14px; }
  html.deck-can-flow .divider-title { font-size: min(48px, 13vw) !important; line-height: 1.02 !important; }
  html.deck-can-flow .divider-num { font-size: min(18px, 5vw) !important; }
  html.deck-can-flow .bigq { font-size: min(39px, 11vw) !important; line-height: 1.06 !important; }
  html.deck-can-flow .vocab { grid-template-columns: 1fr !important; gap: 16px; }
  html.deck-can-flow .quiz { grid-template-columns: 1fr !important; gap: 16px; }
  html.deck-can-flow .vcard { padding: 24px 22px !important; gap: 18px; }
  html.deck-can-flow .vterm { font-size: min(26px, 7vw) !important; }
  html.deck-can-flow .vchip { width: 56px !important; height: 56px !important; font-size: 30px !important; }
  html.deck-can-flow .qcard { padding: 26px 22px !important; }
  html.deck-can-flow .qq { font-size: min(24px, 6vw) !important; }
  html.deck-can-flow .callout { padding: 24px 22px !important; border-radius: 0 16px 16px 0 !important; }
  html.deck-can-flow .callout .subhead { font-size: min(26px, 7vw) !important; line-height: 1.18 !important; }
  html.deck-can-flow .trophic { padding: 22px 18px !important; }
  html.deck-can-flow .trophic .emoji { font-size: 44px !important; }
  html.deck-can-flow .trophic .t-name { font-size: min(24px, 6vw) !important; }
}`,
  notes:
    'A complete, friendly K-12 science lesson on ecosystems & food webs — retitle the unit, objectives, vocabulary, and numbers for any subject and grade. Warm cream paper, rounded everything, soft shadows, ONE coral accent with a teal (--accent-2) secondary, big legible Lexend type, one idea per slide. Open and close on the woodland-meadow full-bleed (assets/classroom-cover.jpg); use the labelled tree/soil figure (assets/classroom-fig.jpg) for the .split diagram. Signature pieces: .divider section breaks, .bigq lesson hook, .vcard vocabulary cards, .trophic chips inside the shared .flow for the food chain, .callout for think-pair-share, .quiz cards for the check, and .checks for objectives and takeaways. Use .bars for population data, .steps for the hands-on activity, .table for the quiz key. Keep a .runner footer ("Mr. Rivera · Grade 5 Science" left, lesson step right) on content slides. Split dense content across more slides — never crowd a slide.',
  sampleSlides: [
    s({
      id: 'cl-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.95">Unit 4 · Ecosystems &amp; Food Webs</div>
    <h1 class="title reveal" style="--title-size:128px;margin-top:8px">Who eats whom,<br/>and why it matters.</h1>
    <p class="lead reveal" style="color:#fff;max-width:30ch">A Grade 5 science lesson on how energy moves through a living community.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cl-question',
      name: "Today's big question",
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Today's big question</div>
  <h2 class="bigq reveal" style="margin-top:14px">If every plant in the meadow vanished, what would happen to the owl?</h2>
  <p class="lead reveal" style="max-width:34ch;margin-top:14px">Hold onto your first guess. By the end of class you'll be able to explain it with a food web.</p>
</div>`,
    }),
    s({
      id: 'cl-objectives',
      name: "What you'll learn",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What you'll learn today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">By the end of class, I can&hellip;</h2>
  <ul class="checks reveal" style="--gap:26px;--bullet-size:38px">
    <li class="check"><span>Name a <b>producer</b>, a <b>consumer</b>, and a <b>decomposer</b> in a meadow.</span></li>
    <li class="check"><span>Draw arrows that show which way <b>energy flows</b> through a food chain.</span></li>
    <li class="check"><span>Use a <b>food web</b> to predict what happens when one species disappears.</span></li>
    <li class="check"><span>Explain why there are <b>fewer animals</b> at the top than at the bottom.</span></li>
  </ul>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Objectives</span></div>
</div>`,
    }),
    s({
      id: 'cl-div1',
      name: 'Section · The basics',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 1 &mdash; The basics</div>
  <div class="divider-title reveal">Everything is<br/>connected.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cl-roles',
      name: 'Three roles',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Living things have jobs</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Every creature plays one of three roles.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="metric" style="--metric-size:64px">🌱</div><div class="card-title">Producers</div><div class="card-body">Plants make their own food from sunlight, water, and air.</div></div>
    <div class="card"><div class="metric" style="--metric-size:64px">🦌</div><div class="card-title">Consumers</div><div class="card-body">Animals eat plants or other animals to get their energy.</div></div>
    <div class="card"><div class="metric" style="--metric-size:64px">🍄</div><div class="card-title">Decomposers</div><div class="card-body">Fungi and worms recycle dead matter back into the soil.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">The basics</span></div>
</div>`,
    }),
    s({
      id: 'cl-vocab',
      name: 'Key vocabulary',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Words for today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Five words to keep handy.</h2>
  <div class="vocab reveal" style="--cols:2">
    <div class="vcard"><div class="vchip">☀️</div><div><div class="vterm">Energy</div><div class="vdef">The power living things need to grow and move — it starts with the sun.</div></div></div>
    <div class="vcard"><div class="vchip">🌾</div><div><div class="vterm">Producer</div><div class="vdef">A living thing that makes its own food, like grass or a tree.</div></div></div>
    <div class="vcard"><div class="vchip">🦊</div><div><div class="vterm">Predator</div><div class="vdef">A consumer that hunts and eats other animals for energy.</div></div></div>
    <div class="vcard"><div class="vchip">🐇</div><div><div class="vterm">Prey</div><div class="vdef">An animal that gets eaten by a predator.</div></div></div>
    <div class="vcard"><div class="vchip">🕸️</div><div><div class="vterm">Food web</div><div class="vdef">All the food chains in one place, linked together like a web.</div></div></div>
    <div class="vcard"><div class="vchip">🏡</div><div><div class="vterm">Habitat</div><div class="vdef">The home where a living thing finds its food, water, and shelter.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Vocabulary</span></div>
</div>`,
    }),
    s({
      id: 'cl-diagram',
      name: 'Labelled diagram',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Look closely</div>
    <h2 class="headline reveal">One tree is a whole community.</h2>
    <div class="row wrap reveal" style="gap:18px 30px;margin-top:8px">
      <span class="figdot">Producer — the leafy tree</span>
      <span class="figdot t2">Consumer — the bird</span>
      <span class="figdot t3">Decomposers — worm &amp; fungi</span>
    </div>
    <p class="lead reveal" style="max-width:30ch;margin-top:6px">Sunlight feeds the leaves, the bird eats the bugs, and the soil recyclers feed the roots. Nothing is wasted.</p>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt="Cross-section of a tree and soil showing producers, a consumer, and decomposers"></figure>
</div>`,
    }),
    s({
      id: 'cl-flow',
      name: 'How energy flows',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Follow the arrows</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Energy flows one way: sun &rarr; predator.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="trophic"><div class="emoji">☀️</div><div class="t-name">Sun</div><div class="t-role">The starting energy</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="trophic"><div class="emoji">🌾</div><div class="t-name">Grass</div><div class="t-role">Producer</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="trophic"><div class="emoji">🐇</div><div class="t-name">Rabbit</div><div class="t-role">Eats the grass</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="trophic"><div class="emoji">🦊</div><div class="t-name">Fox</div><div class="t-role">Eats the rabbit</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="trophic"><div class="emoji">🦉</div><div class="t-name">Owl</div><div class="t-role">Top predator</div></div></div>
  </div>
  <p class="fine reveal" style="margin-top:30px;text-align:center">The arrow always points to <b>who gets the energy</b> — not who does the eating.</p>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Energy flow</span></div>
</div>`,
    }),
    s({
      id: 'cl-data',
      name: 'A data look',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">A data look</div>
      <h2 class="headline" style="margin-top:8px">Why so few at the top?</h2>
      <div class="callout" style="margin-top:26px">
        <div class="callout-k">Notice</div>
        <p class="body" style="max-width:none">Each level passes on only about <b>1/10</b> of its energy. That's why a meadow has lots of grass but only a couple of owls.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:94%"><div class="bar-fill" data-val="1000"></div><div class="bar-label">Grass</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" data-val="120"></div><div class="bar-label">Rabbits</div></div>
      <div class="bar" style="--h:30%"><div class="bar-fill" data-val="18"></div><div class="bar-label">Foxes</div></div>
      <div class="bar" style="--h:12%"><div class="bar-fill" data-val="2"></div><div class="bar-label">Owls</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Populations</span></div>
</div>`,
    }),
    s({
      id: 'cl-div2',
      name: "Section · Let's explore",
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 2 &mdash; Let's explore</div>
  <div class="divider-title reveal">Now it's<br/>your turn.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cl-activity',
      name: 'Hands-on activity',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Table activity · 15 minutes</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">Build a meadow food web.</h2>
  <ol class="steps reveal" style="--gap:24px;--bullet-size:34px">
    <li class="step"><span>Spread your <b>animal &amp; plant cards</b> face-up across the table.</span></li>
    <li class="step"><span>Draw an <b>arrow</b> from each living thing to whatever eats it.</span></li>
    <li class="step"><span>Find one <b>producer</b>, one <b>predator</b>, and one <b>decomposer</b> in your web.</span></li>
    <li class="step"><span>Cover up the grass card &mdash; trace every arrow that now breaks.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Activity</span></div>
</div>`,
    }),
    s({
      id: 'cl-tps',
      name: 'Think-pair-share',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="callout reveal" style="max-width:1180px;border-radius:24px;border-left:10px solid var(--accent-2)">
    <div class="callout-k">Think &middot; Pair &middot; Share</div>
    <h2 class="subhead" style="--subhead-size:56px;color:var(--text);line-height:1.12">A disease wipes out all the rabbits. Talk with your partner: what happens to the grass, the foxes, and the owls?</h2>
    <p class="body" style="max-width:none;margin-top:18px;color:var(--muted)">Think on your own for 30 seconds &middot; share with a partner for 1 minute &middot; be ready to tell the class.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cl-quiz',
      name: 'Check your understanding',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Check your understanding</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Quick quiz — flip your card to answer.</h2>
  <div class="quiz reveal">
    <div class="qcard"><span class="qnum">1</span><div class="qq">Which living thing is a producer?</div><span class="qa">Grass — it makes its own food</span></div>
    <div class="qcard"><span class="qnum">2</span><div class="qq">Which way does the food-chain arrow point?</div><span class="qa">Toward whoever gets the energy</span></div>
    <div class="qcard"><span class="qnum">3</span><div class="qq">What recycles dead leaves into soil?</div><span class="qa">Decomposers — worms &amp; fungi</span></div>
    <div class="qcard"><span class="qnum">4</span><div class="qq">Why are there only a few owls?</div><span class="qa">Energy shrinks at each level</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Check-in</span></div>
</div>`,
    }),
    s({
      id: 'cl-key',
      name: 'Answer key',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Teacher answer key</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">How did we do?</h2>
  <table class="table reveal">
    <thead><tr><th>Question</th><th>Answer</th><th class="num">Class got it</th></tr></thead>
    <tbody>
      <tr><td>Name a producer</td><td>Grass / tree</td><td class="num pos">96%</td></tr>
      <tr><td>Direction of the arrow</td><td>Toward the eater</td><td class="num pos">88%</td></tr>
      <tr><td>What decomposers do</td><td>Recycle nutrients</td><td class="num pos">91%</td></tr>
      <tr class="row-em"><td>Why few top predators</td><td>Energy is lost each level</td><td class="num neg">74%</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Re-teach the energy-pyramid idea tomorrow — that last one needs another pass.</p>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Answer key</span></div>
</div>`,
    }),
    s({
      id: 'cl-takeaways',
      name: 'Key takeaways',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Big ideas to remember</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">Three things to take home.</h2>
  <ul class="checks reveal" style="--gap:28px;--bullet-size:40px">
    <li class="check"><span>Energy starts with the <b>sun</b> and flows one way through the food web.</span></li>
    <li class="check"><span>Every living thing is a <b>producer, consumer, or decomposer</b> — and they're all linked.</span></li>
    <li class="check"><span>Remove one species and the <b>whole web feels it</b>. Everything is connected.</span></li>
  </ul>
  <div class="runner reveal"><span class="runner-brand">Mr. Rivera &middot; Grade 5 Science</span><span class="runner-label">Takeaways</span></div>
</div>`,
    }),
    s({
      id: 'cl-quote',
      name: 'Naturalist quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"When we try to pick out anything by itself, we find it hitched to everything else in the universe."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">John Muir</span><span class="cite-role">Naturalist</span></div>
</div>`,
    }),
    s({
      id: 'cl-close',
      name: 'Homework & close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.95">Homework · due Thursday</div>
    <h2 class="display reveal" style="--display-size:92px;color:#fff">Draw a food web<br/>from your own dinner. 🍎</h2>
    <p class="lead reveal" style="color:#fff;max-width:34ch">Start with the sun, add three arrows, and circle the decomposer. Bring it ready to share.</p>
  </div>
</div>`,
    }),
  ],
}
