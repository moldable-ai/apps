import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/charcoal-cover.jpg'
const FIG_IMG = 'assets/charcoal-fig.jpg'

export const charcoal: Template = {
  id: 'charcoal',
  categories: ['Creative', 'Education'],
  name: 'Charcoal',
  tagline: 'Hand-drawn, monochrome studio portfolio',
  audiences: ['studio', 'architecture', 'design', 'creative', 'portfolio'],
  description:
    'An artisanal architecture-and-design studio deck rendered in charcoal and graphite — warm paper, deep ink, and one whisper of ember. Hairline rules, a drop-cap statement, sketch-framed figures, and a refined index carry a studio philosophy-and-portfolio story you make your own.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f4f0e8',
    '--text': '#1c1a17',
    '--muted': '#6b655b',
    '--accent': '#b4541f',
    '--accent-2': '#b4541f',
    '--display': "'Fraunces', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '500',
    '--title-size': '128px',
    '--headline-size': '78px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.26em',
    '--kicker-size': '20px',
    '--kicker-font': "'Inter', sans-serif",
    '--card-bg': '#fbf8f1',
    '--card-border': 'rgba(28,26,23,0.16)',
    '--radius': '4px',
    '--stat-size': '104px',
    '--metric-size': '116px',
    '--bullet-color': '#1c1a17',
    '--bullet-radius': '0',
    '--th-border': '#1c1a17',
    '--table-border': 'rgba(28,26,23,0.16)',
    '--rule-color': 'rgba(28,26,23,0.2)',
    '--track': 'rgba(28,26,23,0.12)',
    '--donut-hole': '#f4f0e8',
    '--bar-fill': '#2a2722',
    '--bar-gap': '34px',
    '--media-radius': '3px',
    '--media-border': '1px solid rgba(28,26,23,0.22)',
    '--media-shadow': '0 40px 90px -42px rgba(28,26,23,0.5)',
    '--scrim':
      'linear-gradient(180deg, rgba(20,18,15,0.05) 0%, rgba(20,18,15,0.4) 52%, rgba(20,18,15,0.9) 100%)',
    '--bleed-text': '#f4f0e8',
    '--pos': '#5b7a4f',
    '--neg': '#b4541f',
  },
  stageBg: '#e8e2d6',
  assets: ['charcoal-cover.jpg', 'charcoal-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label, .tl-when { color: var(--accent); }
.bar-fill { background: var(--bar-fill); }
.flow-arrow::after { border-color: var(--accent); }
.check::before { color: var(--accent); }
.cite-dot { background: var(--accent); }
.section-num { color: var(--accent); }

/* Hairline graphite rule — the studio's signature divider */
.hair { height: 1px; background: var(--rule-color); width: 100%; border: 0; }
.hair-short { width: 96px; height: 2px; background: var(--accent); border: 0; }

/* Section divider — graphite plate on warm paper */
.plate { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 24px; }
.plate-num { font-family: var(--body); font-weight: 600; letter-spacing: 0.24em; font-size: 21px; color: var(--accent); text-transform: uppercase; }
.plate-title { font-family: var(--display); font-weight: 500; font-style: italic; font-size: 150px; line-height: 0.94; letter-spacing: -0.02em; color: var(--text); }
.plate-meta { font-family: var(--body); font-size: 26px; color: var(--muted); letter-spacing: 0.02em; }

/* Drop-cap statement — oversized ember initial via ::first-letter */
.dropcap { font-family: var(--display); font-weight: 400; font-size: 58px; line-height: 1.32; letter-spacing: -0.005em; color: var(--text); max-width: 30ch; }
.dropcap::first-letter { font-family: var(--display); font-weight: 500; font-size: 168px; line-height: 0.74; float: left; margin: 12px 24px 0 0; color: var(--accent); }

/* Sketch-framed figure — double hairline + ember corner ticks */
.sketch { position: relative; padding: 16px; background: var(--card-bg); border: 1px solid var(--card-border); }
.sketch .media { border-radius: 0; border: 1px solid var(--card-border); box-shadow: none; height: 100%; }
.sketch::before, .sketch::after { content: ''; position: absolute; width: 26px; height: 26px; pointer-events: none; }
.sketch::before { top: 5px; left: 5px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.sketch::after { bottom: 5px; right: 5px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }

/* Refined index — the portfolio register */
.index { display: flex; flex-direction: column; }
.idx-row { display: grid; grid-template-columns: 64px 1fr 230px 150px; gap: 36px; align-items: baseline; padding: 24px 0; border-top: 1px solid var(--card-border); }
.idx-row:last-child { border-bottom: 1px solid var(--card-border); }
.idx-no { font-family: var(--body); font-weight: 600; font-size: 24px; color: var(--accent); font-variant-numeric: tabular-nums; }
.idx-name { font-family: var(--display); font-weight: 500; font-size: 40px; line-height: 1.05; color: var(--text); }
.idx-name em { font-style: italic; }
.idx-meta { font-family: var(--body); font-size: 25px; color: var(--muted); }
.idx-year { font-family: var(--body); font-size: 25px; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }

/* Specimen card — quiet portfolio / recognition card */
.spec { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 38px 36px; display: flex; flex-direction: column; gap: 14px; }
.spec-k { font-family: var(--body); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; font-size: 19px; color: var(--accent); }
.spec-t { font-family: var(--display); font-weight: 500; font-size: 36px; line-height: 1.08; color: var(--text); }
.spec-t em { font-style: italic; }
.spec-d { font-family: var(--body); font-size: 24px; line-height: 1.42; color: var(--muted); }

/* Lede — large composed serif statement */
.lede { font-family: var(--display); font-weight: 400; font-style: italic; font-size: 62px; line-height: 1.16; letter-spacing: -0.01em; color: var(--text); max-width: 21ch; text-wrap: balance; }

/* Runner footer tuned to the studio mark */
.runner-brand::before { border-radius: 0; }`,
  notes:
    'A complete architecture-and-design studio deck — philosophy then portfolio — rendered in charcoal/graphite. Fraunces serif (use italics for warmth via .lede, .plate-title, idx-name em) + Inter body; warm paper #f4f0e8, charcoal ink #1c1a17, ONE restrained ember accent #b4541f used sparingly. Open and close on the charcoal cover drawing (assets/charcoal-cover.jpg, a dramatic structure); use the charcoal interior sketch (assets/charcoal-fig.jpg) inside the .sketch frame for the selected-work .split and the featured-project .hero. Signature pieces: .plate section dividers (italic display + ember number), the .dropcap philosophy statement, .sketch double-hairline figure frames, the .index portfolio register (no/name/type/year), .spec specimen cards for recognition, .hair / .hair-short graphite rules. Keep charts monochrome graphite (--bar-fill, --track) so data reads as a quiet interlude; reserve ember for kickers, numbers, the drop cap, and corner ticks. Artisanal and monochrome — let the serif, one charcoal drawing, and whitespace carry it. Runner = studio name left, section right.',
  sampleSlides: [
    s({
      id: 'charcoal-1',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Architecture &amp; Design · Selected Works 2026</div>
    <h1 class="display reveal" style="--display-size:150px;margin-top:10px">Atelier <em style="font-style:italic;font-weight:400">Graphite</em></h1>
    <p class="lead reveal" style="max-width:30ch">A studio drawing buildings in light, line, and shadow.</p>
  </div>
</div>`,
    }),
    s({
      id: 'charcoal-2',
      name: 'Studio at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The studio at a glance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">Eighteen years drawing in the dark.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">2008</div><div class="stat-label">Founded in a single drafting room</div></div>
    <div class="stat"><div class="stat-num">64</div><div class="stat-label">Built works across nine countries</div></div>
    <div class="stat"><div class="stat-num">22</div><div class="stat-label">Hands in the studio today</div></div>
    <div class="stat"><div class="stat-num">11</div><div class="stat-label">Awards for craft and restraint</div></div>
  </div>
  <hr class="hair reveal" style="margin-top:44px">
  <p class="fine reveal" style="margin-top:22px">Residential · Cultural · Adaptive reuse — drawn by hand before it is ever modelled.</p>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Overview</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-3',
      name: 'Our philosophy',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Our philosophy</div>
  <div class="two-col reveal" style="--col-gap:96px;align-items:start;margin-top:14px">
    <p class="dropcap">Architecture begins as a smudge of charcoal — a line drawn fast, in low light, before the certainty of a number arrives. We protect that first gesture all the way to the building.</p>
    <div style="display:flex;flex-direction:column;gap:26px">
      <p class="lede" style="font-size:48px;max-width:none">Draw slowly. Build to last. Leave room for the light.</p>
      <hr class="hair-short">
      <p class="body" style="max-width:32ch">Every project is a study in shadow before it is a study in space. We design for the hour the sun is lowest.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Philosophy</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-4',
      name: 'Section · How we work',
      transition: 'fade',
      bodyHtml: `<div class="plate">
  <div class="plate-num reveal">Section 01</div>
  <div class="plate-title reveal">How we<br/>work</div>
  <hr class="hair-short reveal" style="margin-top:8px">
  <div class="plate-meta reveal">From the first charcoal line to the handed-over key.</div>
</div>`,
    }),
    s({
      id: 'charcoal-5',
      name: 'The process',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The process</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Five movements, drawn in order.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="spec"><div class="spec-k">01</div><div class="spec-t">Listen</div><div class="spec-d">We walk the site at dawn and dusk and sketch what we hear.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="spec"><div class="spec-k">02</div><div class="spec-t">Sketch</div><div class="spec-d">Charcoal studies test mass, light, and shadow by hand.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="spec"><div class="spec-k">03</div><div class="spec-t">Resolve</div><div class="spec-d">The drawing hardens into plan, section, and detail.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="spec"><div class="spec-k">04</div><div class="spec-t">Build</div><div class="spec-d">We sit with the trades until the joint is right.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Process</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-6',
      name: 'Principles',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What we hold to</div>
      <h2 class="headline" style="margin-top:8px">Principles, not styles.</h2>
      <p class="lead" style="margin-top:18px">A studio is the sum of what it refuses. These five lines we will not cross.</p>
    </div>
    <ul class="checks" style="--gap:28px">
      <li class="check"><span><b>Light first.</b> The plan serves the hour, not the other way around.</span></li>
      <li class="check"><span><b>Honest material.</b> Concrete looks like concrete; timber stays timber.</span></li>
      <li class="check"><span><b>One bold move</b> per building — the rest holds its breath.</span></li>
      <li class="check"><span><b>Detail is the design</b> at one-to-one scale.</span></li>
      <li class="check"><span><b>Draw by hand</b> until the idea can survive a pencil.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Principles</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-7',
      name: 'A selected work',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Selected work · 01</div>
    <h2 class="headline reveal">The Ashgrove<br/>Stair.</h2>
    <p class="lead reveal" style="max-width:28ch">A cast-concrete spiral lit by a single oculus — drawn forty times in charcoal before a line was poured.</p>
    <hr class="hair-short reveal">
    <p class="fine reveal">Private residence · Adaptive reuse · 2024</p>
  </div>
  <div class="sketch reveal"><figure class="media"><img src="${FIG_IMG}" alt=""></figure></div>
</div>`,
    }),
    s({
      id: 'charcoal-8',
      name: 'Section · The work',
      transition: 'fade',
      bodyHtml: `<div class="plate">
  <div class="plate-num reveal">Section 02</div>
  <div class="plate-title reveal">The<br/>work</div>
  <hr class="hair-short reveal" style="margin-top:8px">
  <div class="plate-meta reveal">A register of recent buildings, and one drawn in full.</div>
</div>`,
    }),
    s({
      id: 'charcoal-9',
      name: 'Portfolio index',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Portfolio index</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Selected works, 2021–2026.</h2>
  <div class="index reveal">
    <div class="idx-row"><div class="idx-no">01</div><div class="idx-name">The Ashgrove <em>Stair</em></div><div class="idx-meta">Adaptive reuse</div><div class="idx-year">2024</div></div>
    <div class="idx-row"><div class="idx-no">02</div><div class="idx-name">Quarry <em>Pavilion</em></div><div class="idx-meta">Cultural</div><div class="idx-year">2023</div></div>
    <div class="idx-row"><div class="idx-no">03</div><div class="idx-name">House for a <em>Printmaker</em></div><div class="idx-meta">Residential</div><div class="idx-year">2023</div></div>
    <div class="idx-row"><div class="idx-no">04</div><div class="idx-name">The Slate <em>Library</em></div><div class="idx-meta">Civic</div><div class="idx-year">2022</div></div>
    <div class="idx-row"><div class="idx-no">05</div><div class="idx-name">Ember <em>Chapel</em></div><div class="idx-meta">Sacred</div><div class="idx-year">2021</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Index</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-10',
      name: 'A featured project',
      transition: 'slide',
      bodyHtml: `<div class="hero reverse">
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
  <div class="hero-text">
    <div class="kicker reveal">Featured · Quarry Pavilion</div>
    <h2 class="headline reveal">A room cut<br/>from the hill.</h2>
    <p class="lead reveal" style="max-width:26ch">Half buried in a disused quarry, the pavilion borrows the rock's own shadow and gives back a single shaft of north light.</p>
    <div class="stats reveal" style="margin-top:10px">
      <div class="stat"><div class="stat-num">1</div><div class="stat-label">North-lit aperture</div></div>
      <div class="stat"><div class="stat-num">620<span style="font-size:0.5em"> m²</span></div><div class="stat-label">Drawn entirely by hand</div></div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'charcoal-11',
      name: 'By the numbers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div>
      <div class="kicker">By the numbers</div>
      <h2 class="headline" style="margin-top:8px">A studio measured in care.</h2>
      <p class="lead">Hours on the drawing board per built square metre — we spend them where the light lands.</p>
      <hr class="hair-short" style="margin-top:22px">
      <p class="body" style="max-width:34ch;margin-top:18px"><b>92%</b> of projects are repeat or referred — the surest measure of a building that holds up.</p>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:40%"><div class="bar-fill" data-val="2.1h"></div><div class="bar-label">Concept</div></div>
      <div class="bar" style="--h:72%"><div class="bar-fill" data-val="3.8h"></div><div class="bar-label">Design</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="5.3h"></div><div class="bar-label">Detail</div></div>
      <div class="bar" style="--h:58%"><div class="bar-fill" data-val="3.0h"></div><div class="bar-label">On site</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">By the numbers</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-12',
      name: 'Discipline mix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#1c1a17 0 46%, #6b655b 46% 78%, #b4541f 78% 100%)"><div class="donut-label">46%</div></div>
    </div>
    <div>
      <div class="kicker">Where the work lives</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:26px">A balanced practice.</h2>
      <div class="index" style="gap:0">
        <div class="idx-row" style="grid-template-columns:24px 1fr 90px"><div class="idx-no" style="color:#1c1a17">■</div><div class="idx-meta" style="color:var(--text);font-size:30px">Residential &amp; reuse</div><div class="idx-year">46%</div></div>
        <div class="idx-row" style="grid-template-columns:24px 1fr 90px"><div class="idx-no" style="color:#6b655b">■</div><div class="idx-meta" style="color:var(--text);font-size:30px">Cultural &amp; civic</div><div class="idx-year">32%</div></div>
        <div class="idx-row" style="grid-template-columns:24px 1fr 90px"><div class="idx-no" style="color:var(--accent)">■</div><div class="idx-meta" style="color:var(--text);font-size:30px">Interiors &amp; objects</div><div class="idx-year">22%</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Practice</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-13',
      name: 'Recognition',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Recognition</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Quiet work, kindly noticed.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="spec"><div class="spec-k">2024 · Civic</div><div class="spec-t">Stone &amp; Light <em>Medal</em></div><div class="spec-d">The Slate Library, for daylight design in a public room.</div></div>
    <div class="spec"><div class="spec-k">2023 · International</div><div class="spec-t">Shadow <em>Prize</em></div><div class="spec-d">Quarry Pavilion, shortlisted for adaptive reuse of landscape.</div></div>
    <div class="spec"><div class="spec-k">2022 · Craft</div><div class="spec-t">Hand Drawing <em>Honour</em></div><div class="spec-d">For sustained excellence in pre-digital design study.</div></div>
  </div>
  <hr class="hair reveal" style="margin-top:38px">
  <div class="logos reveal" style="margin-top:26px;justify-content:space-between">
    <span class="logo">Stone &amp; Light</span><span class="logo">The Shadow Prize</span><span class="logo">Civic Trust</span><span class="logo">Form Quarterly</span><span class="logo">Atelier Awards</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Recognition</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-14',
      name: 'A client quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:76px">They handed us a building that knows what to do with an ordinary grey afternoon.</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Mara Lindqvist</span><span class="cite-role">Director, The Slate Library</span></div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">In their words</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-15',
      name: 'Section · Ahead',
      transition: 'fade',
      bodyHtml: `<div class="plate">
  <div class="plate-num reveal">Section 03</div>
  <div class="plate-title reveal">Ahead</div>
  <hr class="hair-short reveal" style="margin-top:8px">
  <div class="plate-meta reveal">What is on the drawing board, and how to begin.</div>
</div>`,
    }),
    s({
      id: 'charcoal-16',
      name: "What's next",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">On the drawing board</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">The next three years.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">2026</div><div class="tl-what"><b>Ember Chapel completes</b> — our first project drawn and built entirely off-grid.</div></div>
    <div class="tl-row"><div class="tl-when">2027</div><div class="tl-what"><b>A timber studio opens</b> — a second hand-drawing room dedicated to mass-timber research.</div></div>
    <div class="tl-row"><div class="tl-when">2028</div><div class="tl-what"><b>The charcoal monograph</b> — a printed survey of fifty studies that became buildings.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Ahead</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-17',
      name: 'Engage us',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we begin</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Three lines, then a building.</h2>
  <table class="table reveal">
    <thead><tr><th>Stage</th><th>What happens</th><th>Who joins</th><th class="num">Weeks</th></tr></thead>
    <tbody>
      <tr><td>The walk</td><td class="muted">We visit the site at first and last light.</td><td>Principal</td><td class="num">1</td></tr>
      <tr><td>The studies</td><td class="muted">Charcoal options, drawn by hand and reviewed together.</td><td>Studio</td><td class="num">3–5</td></tr>
      <tr><td>The drawings</td><td class="muted">Resolved plans, sections, and one-to-one details.</td><td>Studio + trades</td><td class="num">8–14</td></tr>
      <tr class="row-em"><td>The build</td><td class="muted">We stay on site until the last joint is right.</td><td>Everyone</td><td class="num">Varies</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Atelier Graphite</span><span class="runner-label">Engagement</span></div>
</div>`,
    }),
    s({
      id: 'charcoal-18',
      name: 'Contact',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Begin a drawing</div>
    <h2 class="display reveal" style="--display-size:120px">Let's find<br/>the light.</h2>
    <p class="lead reveal" style="max-width:34ch">studio@ateliergraphite.com · No. 7 Drafting Lane · By appointment</p>
  </div>
</div>`,
    }),
  ],
}
