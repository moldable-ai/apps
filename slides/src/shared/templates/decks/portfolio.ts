import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/portfolio-cover.jpg'
const WORK1_IMG = 'assets/portfolio-work1.jpg'
const WORK2_IMG = 'assets/portfolio-work2.jpg'

export const portfolio: Template = {
  id: 'portfolio',
  categories: ['Creative'],
  name: 'Portfolio',
  tagline: 'Gallery-quiet, image-forward selected work',
  audiences: ['designer', 'creative', 'studio', 'portfolio'],
  description:
    'A gallery-white creative portfolio with a high-contrast Cormorant Garamond display, calm Inter body, and one charcoal accent. Full-bleed work shots, hairline captions, a numbered project index, and a credits row carry a designer’s selected-work narrative you swap for your own projects.',
  fonts: {
    display: 'Cormorant Garamond',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#161616',
    '--muted': '#8a847c',
    '--accent': '#161616',
    '--accent-2': '#161616',
    '--display': "'Cormorant Garamond', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '500',
    '--title-size': '168px',
    '--display-size': '210px',
    '--headline-size': '108px',
    '--section-size': '180px',
    '--subhead-size': '58px',
    '--lead-size': '34px',
    '--body-size': '30px',
    '--quote-size': '92px',
    '--quote-weight': '500',
    '--kicker-font': "'Inter', sans-serif",
    '--kicker-tracking': '0.34em',
    '--kicker-size': '20px',
    '--card-bg': '#ffffff',
    '--card-border': '#e7e3dc',
    '--radius': '0px',
    '--stat-size': '116px',
    '--metric-size': '128px',
    '--th-border': '#161616',
    '--table-border': '#e7e3dc',
    '--track': '#ece8e1',
    '--donut-hole': '#ffffff',
    '--bar-gap': '40px',
    '--bar-fill': '#161616',
    '--media-radius': '0px',
    '--media-border': '0',
    '--media-shadow': 'none',
    '--scrim':
      'linear-gradient(180deg, rgba(15,14,13,0.04) 0%, rgba(15,14,13,0.30) 52%, rgba(15,14,13,0.80) 100%)',
    '--bleed-text': '#ffffff',
    '--pad-x': '150px',
    '--pad-y': '120px',
    '--pos': '#3f6f54',
    '--neg': '#a23c3c',
  },
  stageBg: '#f3f1ec',
  assets: ['portfolio-cover.jpg', 'portfolio-work1.jpg', 'portfolio-work2.jpg'],
  decoration: `.kicker { color: var(--muted); }
.metric, .stat-num, .donut-label { color: var(--text); }
.bar-fill { background: var(--text); }

/* Generous title lockup — name + discipline, hairline rule under */
.lockup-name { font-family: var(--display); font-weight: 500; font-size: 196px; line-height: 0.9; letter-spacing: -0.02em; color: var(--text); }
.lockup-name em { font-style: italic; font-weight: 400; }
.lockup-disc { font-family: var(--body); font-weight: 500; font-size: 26px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--muted); }
.lockup-rule { width: 100%; height: 1px; background: var(--text); opacity: 0.85; margin: 30px 0; }

/* Big image slides with thin hairline captions */
.shot-cap { display: flex; align-items: baseline; justify-content: space-between; gap: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.5); }
.shot-cap.dark { border-top: 1px solid var(--card-border); }
.shot-no { font-family: var(--body); font-weight: 600; font-size: 22px; letter-spacing: 0.22em; text-transform: uppercase; }
.shot-meta { font-family: var(--body); font-weight: 400; font-size: 22px; letter-spacing: 0.04em; opacity: 0.85; }

/* Project index — numbered list with hairline rows */
.index { display: flex; flex-direction: column; }
.idx-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 44px; align-items: baseline; padding: 34px 0; border-top: 1px solid var(--card-border); }
.idx-row:last-child { border-bottom: 1px solid var(--card-border); }
.idx-no { font-family: var(--body); font-weight: 500; font-size: 26px; letter-spacing: 0.14em; color: var(--muted); }
.idx-title { font-family: var(--display); font-weight: 500; font-size: 64px; line-height: 1; letter-spacing: -0.01em; color: var(--text); }
.idx-title em { font-style: italic; font-weight: 400; }
.idx-tag { font-family: var(--body); font-weight: 500; font-size: 22px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }

/* Role / credits row — labelled hairline columns */
.credits { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 0; border-top: 1px solid var(--card-border); }
.credit { padding: 36px 48px 0 0; }
.credit + .credit { padding-left: 48px; border-left: 1px solid var(--card-border); }
.credit-k { font-family: var(--body); font-weight: 600; font-size: 20px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); }
.credit-v { font-family: var(--display); font-weight: 500; font-size: 44px; line-height: 1.04; letter-spacing: -0.01em; color: var(--text); margin-top: 14px; }
.credit-v em { font-style: italic; font-weight: 400; }

/* Quiet numbered section divider with index */
.plate { position: absolute; inset: 0; padding: var(--pad-y) var(--pad-x); display: flex; flex-direction: column; justify-content: center; gap: 26px; }
.plate-no { font-family: var(--body); font-weight: 500; font-size: 24px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); }
.plate-title { font-family: var(--display); font-weight: 500; font-size: 172px; line-height: 0.92; letter-spacing: -0.02em; color: var(--text); }
.plate-title em { font-style: italic; font-weight: 400; }
.plate-rule { width: 96px; height: 1px; background: var(--text); margin-top: 8px; }

/* Stat row, gallery-style hairline labels */
.stat-num { font-weight: 500; }`,
  notes:
    'A designer’s selected-work portfolio. Cormorant Garamond display (use the italic <em> for one or two words per heading) on gallery white, calm Inter body, ONE near-black charcoal (#161616) used sparingly — let the work images carry the deck. Open on the gallery full-bleed (assets/portfolio-cover.jpg); the two project shots are assets/portfolio-work1.jpg (product/identity still life) and assets/portfolio-work2.jpg (spatial/architectural). Signature pieces: the .lockup-name title lockup, the numbered .index project list, full-bleed work shots with thin .shot-cap hairline captions, and the labelled .credits role row. Use .split/.hero/.full-bleed generously, .steps for a process moment, a .stats row for results, .quote for the testimonial. Keep chrome near-zero: hairline rules over boxes, vast whitespace, no shadows, no gradients. Captions are quiet and factual (medium, year, role).',
  sampleSlides: [
    s({
      id: 'pf-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:rgba(255,255,255,0.78)">Selected Work · 2021—2026</div>
    <h1 class="display reveal" style="--display-size:208px;margin-top:10px;color:#fff">Mara <em style="font-style:italic;font-weight:400">Ellison</em></h1>
    <p class="lead reveal" style="color:rgba(255,255,255,0.86);max-width:none;letter-spacing:0.06em">Design Director — Brand, Print &amp; Spatial Systems</p>
  </div>
</div>`,
    }),
    s({
      id: 'pf-statement',
      name: 'Intro statement',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Statement</div>
  <h2 class="headline reveal" style="margin-top:18px;max-width:20ch">I design <em style="font-style:italic;font-weight:400">quiet</em> systems that let the work speak.</h2>
  <p class="lead reveal" style="margin-top:24px;max-width:30ch">Twelve years across identity, editorial, and the spaces people move through — a practice built on restraint, material, and the patience to leave things out.</p>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Statement</span></div>
</div>`,
    }),
    s({
      id: 'pf-index',
      name: 'Selected work index',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Contents</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:26px">Selected <em style="font-style:italic;font-weight:400">work</em>.</h2>
  <div class="index reveal">
    <div class="idx-row"><div class="idx-no">01</div><div class="idx-title">Hearth <em>Ceramics</em></div><div class="idx-tag">Identity · Print</div></div>
    <div class="idx-row"><div class="idx-no">02</div><div class="idx-title">Meridian <em>Press</em></div><div class="idx-tag">Editorial System</div></div>
    <div class="idx-row"><div class="idx-no">03</div><div class="idx-title">Solene <em>Atelier</em></div><div class="idx-tag">Spatial · Wayfinding</div></div>
    <div class="idx-row"><div class="idx-no">04</div><div class="idx-title">Field <em>Notes</em></div><div class="idx-tag">Type &amp; Web</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Contents</span></div>
</div>`,
    }),
    s({
      id: 'pf-p1-plate',
      name: 'Project 01 · Plate',
      transition: 'fade',
      bodyHtml: `<div class="plate">
  <div class="plate-no reveal">Project 01</div>
  <div class="plate-title reveal">Hearth <em>Ceramics</em></div>
  <div class="plate-rule reveal"></div>
  <p class="lead reveal" style="margin-top:14px;max-width:34ch">A maker’s identity built from clay, fire, and the seam of a hand-thrown rim.</p>
</div>`,
    }),
    s({
      id: 'pf-p1-shot',
      name: 'Project 01 · Full-bleed shot',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${WORK1_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="shot-cap reveal">
      <span class="shot-no" style="color:#fff">01 — Hearth Ceramics</span>
      <span class="shot-meta" style="color:rgba(255,255,255,0.85)">Identity &amp; printed matter · 2024</span>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'pf-p1-detail',
      name: 'Project 01 · Approach',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Project 01 · Approach</div>
    <h2 class="headline reveal" style="font-size:84px">Marks that <em style="font-style:italic;font-weight:400">remember</em> the hand.</h2>
    <p class="lead reveal" style="max-width:30ch">A wordmark cut from the studio’s own glaze tests, a warm-grey paper system, and a stamp that reads as well pressed into clay as printed on a card.</p>
    <div class="credits reveal" style="--cols:2;margin-top:14px">
      <div class="credit"><div class="credit-k">Role</div><div class="credit-v">Identity <em>lead</em></div></div>
      <div class="credit"><div class="credit-k">Deliverables</div><div class="credit-v">Mark, <em>system</em>, print</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${WORK1_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pf-p2-plate',
      name: 'Project 02 · Plate',
      transition: 'fade',
      bodyHtml: `<div class="plate">
  <div class="plate-no reveal">Project 02</div>
  <div class="plate-title reveal">Solene <em>Atelier</em></div>
  <div class="plate-rule reveal"></div>
  <p class="lead reveal" style="margin-top:14px;max-width:34ch">Wayfinding and spatial identity for a single-room gallery and its slow light.</p>
</div>`,
    }),
    s({
      id: 'pf-p2-hero',
      name: 'Project 02 · Hero shot',
      transition: 'slide',
      bodyHtml: `<div class="hero reverse">
  <div class="hero-text">
    <div class="kicker reveal">Project 02 · Spatial</div>
    <h2 class="headline reveal" style="font-size:90px">Space as the <em style="font-style:italic;font-weight:400">page</em>.</h2>
    <p class="lead reveal" style="max-width:28ch">A wayfinding language drawn from the building’s plaster and raking daylight — type set quietly into the architecture, never on top of it.</p>
    <div class="shot-cap dark reveal" style="border-top-color:var(--card-border)">
      <span class="shot-no">02 — Solene Atelier</span>
      <span class="shot-meta">Spatial &amp; wayfinding · 2025</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${WORK2_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pf-process',
      name: 'Process moment',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How the studio works</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:30px">Four <em style="font-style:italic;font-weight:400">movements</em>.</h2>
  <ol class="steps reveal" style="--gap:30px;max-width:34ch">
    <li class="step"><span><b>Listen</b> — material, history, and the smallest true detail.</span></li>
    <li class="step"><span><b>Reduce</b> — strip until only the necessary marks remain.</span></li>
    <li class="step"><span><b>Make</b> — prototype in the real medium: paper, clay, wall.</span></li>
    <li class="step"><span><b>Hand off</b> — a system the client can live in for years.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Process</span></div>
</div>`,
    }),
    s({
      id: 'pf-results',
      name: 'Results stat row',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The work, measured</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:40px">Quiet, but it <em style="font-style:italic;font-weight:400">carries</em>.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">38</div><div class="stat-label">Identity &amp; spatial systems shipped since 2014</div></div>
    <div class="stat"><div class="stat-num">11</div><div class="stat-label">Design awards across print, type, and environment</div></div>
    <div class="stat"><div class="stat-num">92%</div><div class="stat-label">Clients who return for a second engagement</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Results</span></div>
</div>`,
    }),
    s({
      id: 'pf-mix',
      name: 'Practice mix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:120px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:360px;background:conic-gradient(#161616 0 46%, #8a847c 46% 78%, #cdc7bd 78% 100%)"><div class="donut-label">46%</div></div>
    </div>
    <div>
      <div class="kicker">Where the time goes</div>
      <h2 class="headline" style="margin-top:10px;margin-bottom:30px;font-size:88px">Practice <em style="font-style:italic;font-weight:400">mix</em>.</h2>
      <div class="index" style="border:0">
        <div class="idx-row" style="grid-template-columns:1fr auto;border-top-color:var(--card-border);padding:22px 0"><div class="row" style="--gap:18px"><span style="width:16px;height:16px;background:#161616;flex:none"></span><span class="idx-tag" style="text-transform:none;letter-spacing:0.02em;font-size:30px;color:var(--text)">Brand &amp; identity</span></div><span class="idx-tag" style="color:var(--text)">46%</span></div>
        <div class="idx-row" style="grid-template-columns:1fr auto;border-top-color:var(--card-border);padding:22px 0"><div class="row" style="--gap:18px"><span style="width:16px;height:16px;background:#8a847c;flex:none"></span><span class="idx-tag" style="text-transform:none;letter-spacing:0.02em;font-size:30px;color:var(--text)">Editorial &amp; print</span></div><span class="idx-tag" style="color:var(--text)">32%</span></div>
        <div class="idx-row" style="grid-template-columns:1fr auto;border-top-color:var(--card-border);padding:22px 0"><div class="row" style="--gap:18px"><span style="width:16px;height:16px;background:#cdc7bd;flex:none"></span><span class="idx-tag" style="text-transform:none;letter-spacing:0.02em;font-size:30px;color:var(--text)">Spatial &amp; environment</span></div><span class="idx-tag" style="color:var(--text)">22%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Practice mix</span></div>
</div>`,
    }),
    s({
      id: 'pf-p3-shot',
      name: 'Project 03 · Full-bleed',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${WORK2_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:rgba(255,255,255,0.78)">Project 03</div>
    <h2 class="display reveal" style="--display-size:150px;color:#fff">Meridian <em style="font-style:italic;font-weight:400">Press</em></h2>
    <div class="shot-cap reveal" style="margin-top:18px">
      <span class="shot-no" style="color:#fff">03 — Meridian Press</span>
      <span class="shot-meta" style="color:rgba(255,255,255,0.85)">Editorial system &amp; type · 2023</span>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'pf-recognition',
      name: 'Recognition & clients',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Recognition &amp; clients</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:30px">Good <em style="font-style:italic;font-weight:400">company</em>.</h2>
  <div class="credits reveal" style="--cols:3;margin-bottom:40px">
    <div class="credit"><div class="credit-k">Selected clients</div><div class="credit-v">Hearth, Solene, <em>Meridian</em></div></div>
    <div class="credit"><div class="credit-k">Sectors</div><div class="credit-v">Craft, culture, <em>retail</em></div></div>
    <div class="credit"><div class="credit-k">Recognition</div><div class="credit-v">Type, D&amp;AD, <em>FWA</em></div></div>
  </div>
  <div class="logos reveal" style="gap:72px">
    <span class="logo">Hearth</span><span class="logo">Solene</span><span class="logo">Meridian</span><span class="logo">Field Notes</span><span class="logo">Atrium</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Recognition</span></div>
</div>`,
    }),
    s({
      id: 'pf-exhibitions',
      name: 'Exhibitions timeline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Shown &amp; published</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:18px">A few <em style="font-style:italic;font-weight:400">marks</em> in time.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">2026</div><div class="tl-what"><b>Solene Atelier</b> — spatial identity exhibited, Lisbon Design Week.</div></div>
    <div class="tl-row"><div class="tl-when">2025</div><div class="tl-what"><b>Quiet Systems</b> — solo print survey, Atrium Gallery, Copenhagen.</div></div>
    <div class="tl-row"><div class="tl-when">2024</div><div class="tl-what"><b>Hearth Ceramics</b> — identity featured in the annual type review.</div></div>
    <div class="tl-row"><div class="tl-when">2023</div><div class="tl-what"><b>Meridian Press</b> — editorial system shortlisted, D&amp;AD.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Exhibitions</span></div>
</div>`,
    }),
    s({
      id: 'pf-ledger',
      name: 'Selected projects ledger',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">For the record</div>
  <h2 class="headline reveal" style="margin-top:12px;margin-bottom:18px">Selected <em style="font-style:italic;font-weight:400">projects</em>.</h2>
  <table class="table reveal">
    <thead><tr><th>Project</th><th>Discipline</th><th>Role</th><th class="num">Year</th></tr></thead>
    <tbody>
      <tr><td>Hearth Ceramics</td><td class="muted">Brand &amp; print</td><td class="muted">Identity lead</td><td class="num">2024</td></tr>
      <tr><td>Solene Atelier</td><td class="muted">Spatial &amp; wayfinding</td><td class="muted">Design director</td><td class="num">2025</td></tr>
      <tr><td>Meridian Press</td><td class="muted">Editorial &amp; type</td><td class="muted">Design director</td><td class="num">2023</td></tr>
      <tr class="row-em"><td>Field Notes</td><td class="muted">Type &amp; web</td><td class="muted">Designer</td><td class="num">2022</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">Ledger</span></div>
</div>`,
    }),
    s({
      id: 'pf-quote',
      name: 'Testimonial',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:92px;max-width:22ch">She found the one thing our brand was always trying to say, and removed everything else.</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Tomas Berg</span><span class="cite-role">Founder, Hearth Ceramics</span></div>
  <div class="runner reveal"><span class="runner-brand">Mara Ellison</span><span class="runner-label">In their words</span></div>
</div>`,
    }),
    s({
      id: 'pf-about',
      name: 'About',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">About</div>
    <h2 class="headline reveal" style="font-size:84px">A studio of <em style="font-style:italic;font-weight:400">one</em>, by design.</h2>
    <p class="lead reveal" style="max-width:32ch">Based between Lisbon and Copenhagen. I take on a small number of projects each year so each one gets the attention restraint requires — usually working directly with founders and curators.</p>
  </div>
  <figure class="media reveal"><img src="${COVER_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pf-close',
      name: 'Contact close',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Let’s make something quiet</div>
  <h2 class="display reveal" style="--display-size:168px;margin-top:14px">Get in <em style="font-style:italic;font-weight:400">touch</em>.</h2>
  <div class="lockup-rule reveal" style="margin:38px 0 30px"></div>
  <div class="credits reveal" style="--cols:3">
    <div class="credit" style="padding-top:0"><div class="credit-k">Email</div><div class="credit-v" style="font-size:36px">studio@<em>maraellison</em>.com</div></div>
    <div class="credit" style="padding-top:0"><div class="credit-k">Instagram</div><div class="credit-v" style="font-size:36px">@mara.<em>ellison</em></div></div>
    <div class="credit" style="padding-top:0"><div class="credit-k">Based</div><div class="credit-v" style="font-size:36px">Lisbon · <em>Copenhagen</em></div></div>
  </div>
</div>`,
    }),
  ],
}
