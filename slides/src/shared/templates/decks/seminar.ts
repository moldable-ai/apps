import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide
const IMG = 'assets/sample.jpg'

const LECTURE_IMG = 'assets/lecture-cover.jpg'
const SEM_FIG = 'assets/seminar-fig.jpg'
const SEM_SECTION = 'assets/seminar-section.jpg'

export const seminar: Template = {
  id: 'seminar',
  categories: ['Education'],
  name: 'Seminar',
  tagline: 'Modern, design-forward lecture deck',
  audiences: ['lecture', 'course', 'education', 'university'],
  description:
    'A soft, modern teaching deck with a clean grotesque, a confident magenta accent and dusty-teal support, very rounded cards, polls, and editorial imagery. A complete lecture you adapt to your topic.',
  fonts: {
    display: 'General Sans',
    body: 'General Sans',
    links: [
      'https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fdf1f5',
    '--text': '#322a52',
    '--muted': '#7c7596',
    '--accent': '#d6447a',
    '--accent-2': '#5f9ea2',
    '--display': "'General Sans', sans-serif",
    '--body': "'General Sans', sans-serif",
    '--display-weight': '600',
    '--title-size': '120px',
    '--headline-size': '76px',
    '--card-bg': '#ffffff',
    '--card-border': '#f4dde6',
    '--card-shadow': '0 18px 48px -22px rgba(214,68,122,0.2)',
    '--radius': '24px',
    '--media-radius': '24px',
    '--bullet-color': '#d6447a',
    '--track': '#f4dde6',
    '--donut-hole': '#fdf1f5',
    '--chip-bg': '#fde7ef',
    '--th-border': '#322a52',
    '--table-border': '#f4dde6',
    '--media-shadow': '0 40px 90px -34px rgba(214,68,122,0.3)',
    '--scrim':
      'linear-gradient(180deg, rgba(50,42,82,0.05) 0%, rgba(50,42,82,0.35) 45%, rgba(50,42,82,0.85) 100%)',
  },
  stageBg: '#fbe7ef',
  assets: ['lecture-cover.jpg', 'seminar-fig.jpg', 'seminar-section.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.step::before { color: #fff; background: var(--accent); border-color: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.lede { font-family: var(--display); font-weight: 600; font-size: 60px; line-height: 1.14; letter-spacing: -0.01em; color: var(--text); max-width: 20ch; }
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.divider-num { font-family: var(--display); font-weight: 700; font-size: 34px; color: var(--accent-2); letter-spacing: 0.06em; }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 138px; line-height: 0.98; letter-spacing: -0.01em; color: var(--text); }
.divider-rule { width: 120px; height: 6px; border-radius: 3px; background: var(--accent); margin-top: 12px; }
.reflect { background: var(--chip-bg); border: 1px solid var(--card-border); border-radius: 24px; padding: 36px 40px; }
.reflect-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }
.flow-step .concept { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 28px 26px; box-shadow: var(--card-shadow); height: 100%; }
.concept-t { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); }
.concept-d { font-family: var(--body); font-size: 22px; color: var(--muted); line-height: 1.35; margin-top: 8px; }
@media (max-width: 640px) {
  html.deck-can-flow .divider { position: static !important; inset: auto !important; padding: 40px 22px !important; gap: 10px; min-height: 56vw; }
  html.deck-can-flow .divider-title { font-size: min(47px, 13vw) !important; line-height: 1.04 !important; word-break: break-word; }
  html.deck-can-flow .divider-num { font-size: min(22px, 6vw) !important; }
  html.deck-can-flow .divider-rule { width: 80px !important; height: 5px !important; }
  html.deck-can-flow .lede { font-size: min(36px, 10vw) !important; line-height: 1.12 !important; max-width: 100% !important; }
  html.deck-can-flow .reflect { padding: 26px 22px !important; }
}`,
  notes:
    'Modern, warm, design-forward. Clean General Sans, confident magenta accent with dusty-teal (.accent-2) support, very rounded cards and soft shadows. Open full-bleed on lecture-cover; use seminar-fig / seminar-section for splits. Soft-pink section dividers (.divider). Use .steps for the roadmap, .cards for objectives/concepts, the .flow arrow diagram with .concept cards for "how it fits", .donut + .reflect for the live poll, .checks for takeaways. Friendly, never stuffy.',
  sampleSlides: [
    s({
      id: 'sm-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${LECTURE_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Lecture 6 · Design Systems</div>
    <h1 class="display reveal" style="--display-size:138px">Structure &amp;<br/>best practices</h1>
    <p class="lead reveal">How good systems scale without slowing you down.</p>
  </div>
</div>`,
    }),
    s({
      id: 'sm-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Today's roadmap</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:8px">Where we're headed.</h2>
  <ol class="steps reveal">
    <li class="step"><span>Why systems beat one-off screens.</span></li>
    <li class="step"><span>Tokens — the single source of truth.</span></li>
    <li class="step"><span>Components &amp; composition.</span></li>
    <li class="step"><span>Governance — keeping it alive.</span></li>
  </ol>
</div>`,
    }),
    s({
      id: 'sm-objectives',
      name: 'Objectives',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Learning objectives</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">By the end, you'll be able to…</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-title">Name it</div><div class="card-body">Identify the parts of a design system.</div></div>
    <div class="card"><div class="card-title">Build it</div><div class="card-body">Turn tokens into reusable components.</div></div>
    <div class="card"><div class="card-title">Scale it</div><div class="card-body">Keep it consistent as the team grows.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'sm-div1',
      name: 'Section · Foundations',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 01</div>
  <div class="divider-title reveal">Foundations</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sm-why',
      name: 'Why this matters',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Why this matters</div>
    <h2 class="headline reveal">Decisions, not screens.</h2>
    <p class="lead reveal">A system turns hundreds of one-off choices into a handful — so the team moves faster and the work stays coherent.</p>
  </div>
  <figure class="media reveal"><img src="${SEM_FIG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'sm-concepts',
      name: 'Core concepts',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Core concepts</div>
  <div class="cards reveal" style="--cols:3;margin-top:14px">
    <div class="card"><div class="card-num">01</div><div class="card-title">Tokens</div><div class="card-body">Colour, type, and spacing as named values.</div></div>
    <div class="card"><div class="card-num">02</div><div class="card-title">Components</div><div class="card-body">Tokens assembled into reusable parts.</div></div>
    <div class="card"><div class="card-num">03</div><div class="card-title">Patterns</div><div class="card-body">Components arranged into flows.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'sm-flow',
      name: 'How it fits',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How it fits together</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">From value to product.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="concept"><div class="concept-t">Tokens</div><div class="concept-d">The atoms.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="concept"><div class="concept-t">Components</div><div class="concept-d">The molecules.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="concept"><div class="concept-t">Patterns</div><div class="concept-d">The organisms.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="concept"><div class="concept-t">Product</div><div class="concept-d">The page.</div></div></div>
  </div>
</div>`,
    }),
    s({
      id: 'sm-div2',
      name: 'Section · In practice',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 02</div>
  <div class="divider-title reveal">In practice</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sm-example',
      name: 'Worked example',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">A worked example</div>
    <h2 class="headline reveal">One button, everywhere.</h2>
    <p class="lead reveal">Change the accent token once, and every button, link, and chip across 40 screens updates — instantly and consistently.</p>
  </div>
  <figure class="media reveal"><img src="${SEM_SECTION}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'sm-poll',
      name: 'Active learning',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Active learning · poll</div>
      <h2 class="headline" style="margin-top:6px">Quick show of hands.</h2>
      <div class="reflect" style="margin-top:22px">
        <div class="reflect-k">Reflect</div>
        <p class="body" style="max-width:none">Most teams adopt a system <b>after</b> the pain. What would starting earlier have saved you?</p>
      </div>
    </div>
    <div style="display:grid;place-items:center">
      <div class="donut" style="--p:78;--donut-size:300px"><div class="donut-label">78%</div></div>
      <div class="fine" style="margin-top:18px">…wish they'd started sooner</div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'sm-pitfalls',
      name: 'Common pitfalls',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Common pitfalls</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">Where systems go wrong.</h2>
  <div class="cols-2 reveal" style="gap:28px">
    <div class="card"><div class="card-title">Too rigid, too soon</div><div class="card-body">Locking everything down before patterns emerge kills adoption.</div></div>
    <div class="card"><div class="card-title">No owner</div><div class="card-body">A system without a steward quietly rots into inconsistency.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'sm-div3',
      name: 'Section · Wrap up',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part 03</div>
  <div class="divider-title reveal">Wrap up</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'sm-takeaways',
      name: 'Takeaways',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key takeaways</div>
  <ul class="checks reveal" style="margin-top:8px">
    <li class="check"><span>Start with <b>tokens</b> — they're the cheapest thing to change.</span></li>
    <li class="check"><span>Components should encode <b>decisions</b>, not just styles.</span></li>
    <li class="check"><span>A system is a <b>product</b> — it needs an owner.</span></li>
  </ul>
</div>`,
    }),
    s({
      id: 'sm-resources',
      name: 'Going further',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Going further</div>
  <h2 class="headline reveal" style="margin-top:6px">Take it home.</h2>
  <div class="row wrap reveal" style="gap:18px;margin-top:8px">
    <span class="pill">Read: <b style="margin-left:6px">Atomic Design</b></span>
    <span class="pill">Audit your own buttons</span>
    <span class="pill">Name 10 tokens</span>
    <span class="pill">Office hours · Thu</span>
  </div>
</div>`,
    }),
    s({
      id: 'sm-qa',
      name: 'Q&A',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Over to you</div>
  <h2 class="display reveal" style="--display-size:128px">Questions?</h2>
  <p class="lead reveal">Slides &amp; readings posted to the course page.</p>
</div>`,
    }),
  ],
}
