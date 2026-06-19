import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide
const IMG = 'assets/sample.jpg'

const RESEARCH_IMG = 'assets/experiment-cover.jpg'
const RESEARCH_FIG = 'assets/research-fig.jpg'
const RESEARCH_SECTION = 'assets/research-section.jpg'

export const research: Template = {
  id: 'research',
  categories: ['Education'],
  name: 'Research',
  tagline: 'Bright, structured STEM report',
  audiences: ['science', 'research', 'student', 'stem'],
  description:
    'A clean white STEM deck with a friendly grotesque, fresh green and sunflower-yellow accents, charts, variable cards, and bright geometric imagery. A complete experiment write-up you fill with your own data.',
  fonts: {
    display: 'Hanken Grotesk',
    body: 'Hanken Grotesk',
    links: [
      'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#1d2418',
    '--muted': '#5d6b57',
    '--accent': '#4f9b2e',
    '--accent-2': '#f2b705',
    '--display': "'Hanken Grotesk', sans-serif",
    '--body': "'Hanken Grotesk', sans-serif",
    '--display-weight': '800',
    '--title-size': '116px',
    '--headline-size': '74px',
    '--card-bg': '#f6f9f1',
    '--card-border': '#e3ead7',
    '--radius': '18px',
    '--bullet-color': '#4f9b2e',
    '--track': '#e8eedd',
    '--donut-hole': '#ffffff',
    '--th-border': '#1d2418',
    '--table-border': '#e3ead7',
    '--media-shadow': '0 50px 100px -40px rgba(40,60,20,0.25)',
  },
  stageBg: '#eef2e7',
  assets: ['experiment-cover.jpg', 'research-fig.jpg', 'research-section.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent-2); }
.bar:nth-child(even) .bar-fill { background: var(--accent); }
.card { border-top: 4px solid var(--accent-2); }
.card:nth-child(even) { border-top-color: var(--accent); }
.lede { font-family: var(--display); font-weight: 800; font-size: 64px; line-height: 1.08; letter-spacing: -0.02em; color: var(--text); max-width: 18ch; }
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.divider-num { font-family: var(--display); font-weight: 800; font-size: 38px; color: var(--accent); letter-spacing: 0.04em; }
.divider-title { font-family: var(--display); font-weight: 800; font-size: 138px; line-height: 0.95; letter-spacing: -0.02em; color: var(--text); }
.divider-rule { width: 130px; height: 6px; border-radius: 3px; background: var(--accent-2); margin-top: 12px; }
.var { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 32px 34px; border-top: 4px solid var(--accent); }
.var.dep { border-top-color: var(--accent-2); }
.var-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 20px; color: var(--accent); }
.var.dep .var-k { color: #b8870a; }
.var-t { font-family: var(--display); font-weight: 700; font-size: 34px; color: var(--text); margin-top: 8px; }
.var-d { font-family: var(--body); font-size: 24px; color: var(--muted); line-height: 1.35; margin-top: 8px; }
.mat { columns: 2; column-gap: 70px; }
.mat .check { break-inside: avoid; }
.finding { border-left: 5px solid var(--accent); background: rgba(79,155,46,0.08); padding: 32px 40px; border-radius: 0 14px 14px 0; }
.finding-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }
@media (max-width: 640px) {
  html.deck-can-flow .divider { padding: 64px var(--pad-x) !important; justify-content: center; }
  html.deck-can-flow .divider-title { font-size: min(47px, 13vw) !important; line-height: 1.0 !important; overflow-wrap: break-word; word-break: break-word; hyphens: auto; }
  html.deck-can-flow .divider-num { font-size: min(26px, 7vw) !important; }
  html.deck-can-flow .lede { font-size: min(36px, 10vw) !important; line-height: 1.1 !important; max-width: 100% !important; }
  html.deck-can-flow .finding { padding: 24px 22px !important; }
}`,
  notes:
    'Bright, optimistic, organized. Friendly Hanken Grotesk, green primary with a sunflower-yellow secondary; cards carry a colored top border (alternating green/yellow). Clean white section dividers (.divider). Use the geometric mosaic (experiment-cover) on the cover, research-fig for the science split, research-section as a findings hero. Use .var boxes for variables, .mat checklist for materials, .steps for procedure, .table for raw data, .bars for results, .donut + .finding for interpretation. Clear and structured, never cluttered; keep figures tabular.',
  sampleSlides: [
    s({
      id: 'rs-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="hero reverse">
  <figure class="media reveal"><img src="${RESEARCH_IMG}" alt=""></figure>
  <div class="hero-text">
    <div class="kicker reveal">Science Fair · Grade 8</div>
    <h1 class="title reveal">Does light colour change how plants grow?</h1>
    <p class="lead reveal">A four-week controlled experiment.</p>
  </div>
</div>`,
    }),
    s({
      id: 'rs-agenda',
      name: 'What we did',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">At a glance</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">The experiment in four steps.</h2>
  <ol class="steps reveal">
    <li class="step"><span><b>Ask</b> — does the colour of light change plant growth?</span></li>
    <li class="step"><span><b>Predict</b> — form a hypothesis and define the variables.</span></li>
    <li class="step"><span><b>Test</b> — grow seedlings under four light colours.</span></li>
    <li class="step"><span><b>Measure</b> — track height and compare the results.</span></li>
  </ol>
</div>`,
    }),
    s({
      id: 'rs-why',
      name: 'Why it matters',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Why it matters</div>
    <h2 class="headline reveal">Plants are picky about light.</h2>
    <p class="lead reveal">Chlorophyll absorbs some colours far better than others — so the colour of light a plant gets might change how fast it grows.</p>
  </div>
  <figure class="media reveal"><img src="${RESEARCH_FIG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'rs-background',
      name: 'Background',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Background research</div>
    <h2 class="headline reveal">What scientists already know.</h2>
    <ul class="bullets reveal" style="--gap:20px;margin-top:4px">
      <li class="bullet"><span>Chlorophyll absorbs <b>red and blue</b> light most strongly.</span></li>
      <li class="bullet"><span>It reflects <b>green</b> light — which is why leaves look green.</span></li>
      <li class="bullet"><span>Grow-lights are tuned to <b>red + blue</b> for this reason.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${RESEARCH_SECTION}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'rs-div1',
      name: 'Section · Method',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 01</div>
  <div class="divider-title reveal">Method</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'rs-hypothesis',
      name: 'Hypothesis',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Hypothesis</div>
  <p class="lede reveal">If plants grow under red and blue light, then they will grow tallest — because those colours fuel photosynthesis best.</p>
</div>`,
    }),
    s({
      id: 'rs-variables',
      name: 'Variables',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Variables</div>
  <div class="cols-3 reveal" style="margin-top:14px">
    <div class="var"><div class="var-k">Independent</div><div class="var-t">Light colour</div><div class="var-d">Red, blue, green, or white — one per group.</div></div>
    <div class="var dep"><div class="var-k">Dependent</div><div class="var-t">Plant height</div><div class="var-d">Measured in cm every two days.</div></div>
    <div class="var"><div class="var-k">Controlled</div><div class="var-t">Everything else</div><div class="var-d">Water, soil, pot size, temperature, hours of light.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'rs-materials',
      name: 'Materials',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Materials</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">What we used.</h2>
  <ul class="checks mat reveal">
    <li class="check"><span>16 identical bean seedlings</span></li>
    <li class="check"><span>4 LED grow-lights (red, blue, green, white)</span></li>
    <li class="check"><span>Same potting soil &amp; pots</span></li>
    <li class="check"><span>Measuring ruler &amp; log sheet</span></li>
    <li class="check"><span>Timer for equal light hours</span></li>
    <li class="check"><span>Spray bottle for equal watering</span></li>
  </ul>
</div>`,
    }),
    s({
      id: 'rs-procedure',
      name: 'Procedure',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Procedure</div>
  <ol class="steps reveal" style="margin-top:10px">
    <li class="step"><span>Plant four seedlings in identical pots for each light colour.</span></li>
    <li class="step"><span>Place each group the same distance under its light.</span></li>
    <li class="step"><span>Give every plant the same water and 12 hours of light daily.</span></li>
    <li class="step"><span>Measure and log height every two days for four weeks.</span></li>
    <li class="step"><span>Average each group and compare.</span></li>
  </ol>
</div>`,
    }),
    s({
      id: 'rs-div2',
      name: 'Section · Findings',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 02</div>
  <div class="divider-title reveal">Findings</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'rs-data',
      name: 'Raw data',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The data</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:10px">Average height (cm).</h2>
  <table class="table reveal">
    <thead><tr><th>Light</th><th class="num">Wk 1</th><th class="num">Wk 2</th><th class="num">Wk 3</th><th class="num">Wk 4</th></tr></thead>
    <tbody>
      <tr><td>Red</td><td class="num">5</td><td class="num">9</td><td class="num">14</td><td class="num">18</td></tr>
      <tr><td>Blue</td><td class="num">5</td><td class="num">8</td><td class="num">12</td><td class="num">16</td></tr>
      <tr><td>White</td><td class="num">4</td><td class="num">6</td><td class="num">8</td><td class="num">9</td></tr>
      <tr><td>Green</td><td class="num">3</td><td class="num">4</td><td class="num">5</td><td class="num">6</td></tr>
    </tbody>
  </table>
</div>`,
    }),
    s({
      id: 'rs-chart',
      name: 'Results chart',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Results</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:56px">Final height after 4 weeks.</h2>
  <div class="bars reveal" style="--bars-height:240px">
    <div class="bar" style="--h:90%"><div class="bar-fill" data-val="18cm"></div><div class="bar-label">Red</div></div>
    <div class="bar" style="--h:80%"><div class="bar-fill" data-val="16cm"></div><div class="bar-label">Blue</div></div>
    <div class="bar" style="--h:45%"><div class="bar-fill" data-val="9cm"></div><div class="bar-label">White</div></div>
    <div class="bar" style="--h:30%"><div class="bar-fill" data-val="6cm"></div><div class="bar-label">Green</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'rs-interpret',
      name: 'Interpretation',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--p:86;--donut-size:300px"><div class="donut-label">3×</div></div>
      <div class="fine" style="margin-top:18px">Red vs green growth</div>
    </div>
    <div>
      <div class="kicker">Interpretation</div>
      <h2 class="headline" style="margin-top:6px">The hypothesis held.</h2>
      <div class="finding" style="margin-top:22px">
        <div class="finding-k">Key finding</div>
        <p class="body" style="max-width:none">Red light produced plants <b>3× taller</b> than green — exactly what chlorophyll absorption predicts.</p>
      </div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'rs-challenges',
      name: 'Challenges',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Challenges &amp; adaptations</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">What we'd do differently.</h2>
  <div class="cols-2 reveal" style="gap:28px">
    <div class="card"><div class="card-title">Uneven warmth</div><div class="card-body">Some lights ran hotter — next time we'd add a small fan to keep temperature equal.</div></div>
    <div class="card"><div class="card-title">Small sample</div><div class="card-body">Four plants per group is few — more plants would make the average more reliable.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'rs-conclusion',
      name: 'Conclusion',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Conclusion</div>
  <h2 class="display reveal" style="--display-size:104px">Colour really does matter. 🌱</h2>
  <ul class="checks reveal" style="margin-top:18px;max-width:30ch">
    <li class="check"><span>Red and blue light grew the tallest plants.</span></li>
    <li class="check"><span>Next: test red + blue <b>together</b>.</span></li>
  </ul>
</div>`,
    }),
  ],
}

// ── 12. Literary (book report / humanities) ───────────────────────────────
