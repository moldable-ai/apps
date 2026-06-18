import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/campaign-brief-cover.jpg'
const MOCKUP_IMG = 'assets/campaign-brief-mockup.jpg'

export const campaignBrief: Template = {
  id: 'campaign-brief',
  categories: ['Marketing', 'Creative'],
  name: 'Campaign Brief',
  tagline: 'Bold, loud creative campaign brief',
  audiences: ['marketing', 'creative', 'brand', 'agency'],
  description:
    'A high-voltage creative campaign brief in hot magenta on black and cream. A giant idea statement, an insight-to-idea flow, channel-mix cards, KPI target chips, and a full-bleed execution mockup carry one campaign from the brief in a line to the ask.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#faf7f2',
    '--text': '#0a0a0a',
    '--muted': '#6f6a63',
    '--accent': '#db2777',
    '--accent-2': '#db2777',
    '--display': "'Clash Display', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '600',
    '--title-size': '140px',
    '--headline-size': '82px',
    '--lead-size': '38px',
    '--subhead-size': '50px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': 'rgba(10,10,10,0.12)',
    '--card-shadow': '0 22px 50px -32px rgba(10,10,10,0.28)',
    '--radius': '20px',
    '--stat-size': '108px',
    '--metric-size': '124px',
    '--th-border': '#0a0a0a',
    '--table-border': 'rgba(10,10,10,0.12)',
    '--track': 'rgba(10,10,10,0.08)',
    '--donut-hole': '#faf7f2',
    '--bar-gap': '34px',
    '--media-radius': '20px',
    '--media-shadow': '0 50px 110px -45px rgba(10,10,10,0.5)',
    '--scrim':
      'linear-gradient(180deg, rgba(10,10,10,0.05) 0%, rgba(10,10,10,0.4) 52%, rgba(10,10,10,0.9) 100%)',
    '--pos': '#16a34a',
    '--neg': '#db2777',
  },
  stageBg: '#0a0a0a',
  assets: ['campaign-brief-cover.jpg', 'campaign-brief-mockup.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tl-when { color: var(--accent); }

/* Section divider — magenta field, cream type, oversized index */
.brief-div { position: absolute; inset: 0; background: var(--accent); padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; overflow: hidden; }
.brief-div-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.24em; font-size: 22px; color: rgba(250,247,242,0.85); text-transform: uppercase; }
.brief-div-title { font-family: var(--display); font-weight: 600; font-size: 168px; line-height: 0.92; letter-spacing: -0.03em; color: #faf7f2; }
.brief-div-ghost { position: absolute; right: -40px; bottom: -120px; font-family: var(--display); font-weight: 600; font-size: 520px; line-height: 0.8; color: rgba(250,247,242,0.12); pointer-events: none; }

/* Giant idea statement — the signature huge declarative line */
.idea { font-family: var(--display); font-weight: 600; font-size: 196px; line-height: 0.9; letter-spacing: -0.035em; color: var(--text); text-wrap: balance; }
.idea em { font-style: normal; color: var(--accent); }
.idea-mark { font-family: var(--display); font-weight: 600; font-size: 30px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }

/* Insight -> idea flow — two big claim plates joined by a magenta arrow */
.ii { display: grid; grid-template-columns: 1fr 92px 1fr; align-items: stretch; gap: 0; }
.ii-cell { padding: 52px 48px; border-radius: var(--radius); border: 1px solid var(--card-border); background: var(--card-bg); box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 16px; }
.ii-cell.solid { background: var(--accent); border-color: var(--accent); }
.ii-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 20px; color: var(--accent); }
.ii-cell.solid .ii-k { color: rgba(250,247,242,0.9); }
.ii-t { font-family: var(--display); font-weight: 600; font-size: 48px; line-height: 1.04; letter-spacing: -0.01em; color: var(--text); }
.ii-cell.solid .ii-t { color: #faf7f2; }
.ii-arrow { display: grid; place-items: center; }
.ii-arrow::after { content: ''; width: 26px; height: 26px; border-top: 5px solid var(--accent); border-right: 5px solid var(--accent); transform: rotate(45deg); }

/* Channel-mix cards — accent corner tab + role weight */
.chan { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 26px; }
.ch { position: relative; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 32px 34px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
.ch::before { content: ''; position: absolute; top: 0; left: 0; width: 64px; height: 8px; background: var(--accent); border-radius: 0 0 8px 0; }
.ch-role { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 18px; color: var(--accent); margin-top: 8px; }
.ch-name { font-family: var(--display); font-weight: 600; font-size: 40px; line-height: 1.02; color: var(--text); }
.ch-d { font-family: var(--body); font-size: 23px; line-height: 1.4; color: var(--muted); }
.ch-w { margin-top: auto; font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); padding-top: 18px; border-top: 1px solid var(--card-border); }
.ch-w b { color: var(--accent); }

/* KPI target chips — pill metrics with a target ring */
.kpis { display: flex; flex-wrap: wrap; gap: 22px; }
.kpi-chip { display: flex; align-items: center; gap: 26px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 999px; padding: 22px 40px 22px 26px; box-shadow: var(--card-shadow); }
.kpi-ring { width: 64px; height: 64px; border-radius: 50%; flex: 0 0 auto; background: conic-gradient(var(--accent) calc(var(--p, 70) * 1%), var(--track) 0); display: grid; place-items: center; }
.kpi-ring::after { content: ''; width: 42px; height: 42px; border-radius: 50%; background: var(--card-bg); }
.kpi-chip .kv { font-family: var(--display); font-weight: 600; font-size: 56px; line-height: 1; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
.kpi-chip .kl { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 4px; }

/* Persona card — audience snapshot */
.persona { background: var(--text); color: #faf7f2; border-radius: var(--radius); padding: 48px 46px; display: flex; flex-direction: column; gap: 18px; }
.persona-tag { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 19px; color: var(--accent); }
.persona-name { font-family: var(--display); font-weight: 600; font-size: 64px; line-height: 1; letter-spacing: -0.02em; }
.persona-d { font-family: var(--body); font-size: 27px; line-height: 1.45; color: rgba(250,247,242,0.78); }
.persona-tags { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; }
.persona-pill { font-family: var(--body); font-weight: 600; font-size: 21px; padding: 9px 20px; border-radius: 999px; border: 1px solid rgba(250,247,242,0.28); color: #faf7f2; }

/* Magenta callout — the brief in one line and key claims */
.callout { border-left: 6px solid var(--accent); background: rgba(219,39,119,0.08); padding: 32px 40px; border-radius: 0 14px 14px 0; }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }`,
  notes:
    'A complete creative campaign brief: Clash Display + Inter, ink-black on warm cream, ONE hot-magenta accent, loud but disciplined. Open and close on the magenta key-visual full-bleed (assets/campaign-brief-cover.jpg); reveal sample executions on the OOH mockup full-bleed (assets/campaign-brief-mockup.jpg). Signature pieces: the giant .idea statement for the big idea, the .ii insight-to-idea flow plates, .chan channel-mix cards (corner tab + role weight), .kpi-chip target chips with a conic ring, a dark .persona audience card, magenta .brief-div section breaks with an oversized ghost numeral, and a .callout for the one-line brief. Use .stats for audience size, .steps for content & assets, .timeline for flighting, .bars/.donut + .table for KPIs and budget. Keep the type huge and the palette to magenta, black, cream — no gradients.',
  sampleSlides: [
    s({
      id: 'cb-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Campaign Brief · Spring/Summer 2026</div>
    <h1 class="display reveal" style="--display-size:160px;margin-top:8px">Loud<br/>on purpose.</h1>
    <p class="lead reveal">Aera — the integrated brand campaign to make a quiet label impossible to ignore.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cb-brief-line',
      name: 'The brief in one line',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The brief, in one line</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">What we're here to do.</h2>
  <div class="callout reveal" style="max-width:30ch">
    <div class="callout-k">The assignment</div>
    <p class="subhead" style="font-family:var(--display);font-weight:600">Make Aera the brand a new generation chooses without thinking — and prove it with first-time buyers.</p>
  </div>
  <div class="row reveal wrap" style="--gap:18px;margin-top:30px">
    <span class="pill">Objective · Awareness &amp; trial</span>
    <span class="pill">Timing · 12 weeks</span>
    <span class="pill">Budget · $1.8M</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">The brief</span></div>
</div>`,
    }),
    s({
      id: 'cb-audience',
      name: 'The audience',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:84px;align-items:center">
    <div class="persona">
      <div class="persona-tag">Who we're talking to</div>
      <div class="persona-name">The Considered<br/>First-Mover</div>
      <p class="persona-d">22–32, urban, online-native. Buys with intent, screenshots before she shares, and trusts people over brands. Allergic to anything that tries too hard.</p>
      <div class="persona-tags">
        <span class="persona-pill">Discovery-led</span>
        <span class="persona-pill">Mobile-first</span>
        <span class="persona-pill">Values over logos</span>
      </div>
    </div>
    <div>
      <div class="kicker">The opportunity</div>
      <h2 class="subhead" style="margin-top:6px;margin-bottom:26px">A real, reachable audience.</h2>
      <div class="stats">
        <div class="stat"><div class="stat-num">4.2M</div><div class="stat-label">Reachable in-market in our six core cities</div></div>
        <div class="stat"><div class="stat-num">71%</div><div class="stat-label">Discover brands first on social, not search</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">The audience</span></div>
</div>`,
    }),
    s({
      id: 'cb-div-idea',
      name: 'Section · The idea',
      transition: 'fade',
      bodyHtml: `<div class="brief-div">
  <div class="brief-div-ghost">01</div>
  <div class="brief-div-num reveal">01 — The idea</div>
  <div class="brief-div-title reveal">The big<br/>idea.</div>
</div>`,
    }),
    s({
      id: 'cb-big-idea',
      name: 'The big idea',
      transition: 'fade',
      bodyHtml: `<div class="pad">
  <div class="idea-mark reveal">The platform idea</div>
  <p class="idea reveal" style="margin-top:18px">Found,<br/>not <em>fed.</em></p>
  <p class="lead reveal" style="max-width:34ch;margin-top:30px">A campaign built to be discovered — seeded, not shouted — so finding Aera feels like a secret worth sharing.</p>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">The big idea</span></div>
</div>`,
    }),
    s({
      id: 'cb-why-works',
      name: 'Why it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why it works</div>
      <h2 class="headline" style="margin-top:8px">Discovery beats<br/>declaration.</h2>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span><b>It earns the share.</b> A find feels like status; an ad feels like noise.</span></li>
      <li class="check"><span><b>It fits the channels.</b> Seeding lives natively where she already discovers.</span></li>
      <li class="check"><span><b>It scales the truth.</b> The product is genuinely good — discovery lets it speak.</span></li>
      <li class="check"><span><b>It's measurable.</b> Every find is a tracked, attributable first touch.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Why it works</span></div>
</div>`,
    }),
    s({
      id: 'cb-insight-idea',
      name: 'Insight to idea',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we got here</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">From insight to idea.</h2>
  <div class="ii reveal">
    <div class="ii-cell">
      <div class="ii-k">The insight</div>
      <div class="ii-t">The win is being first to find it — not being told to buy it.</div>
    </div>
    <div class="ii-arrow"></div>
    <div class="ii-cell solid">
      <div class="ii-k">The idea</div>
      <div class="ii-t">Found, not fed — a campaign engineered to be discovered.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">The idea</span></div>
</div>`,
    }),
    s({
      id: 'cb-territory',
      name: 'Creative territory',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Creative territory</div>
    <h2 class="headline reveal">High-contrast,<br/>handmade, loud.</h2>
    <p class="lead reveal">Hot magenta against deep black. Real faces, real motion, zero stock gloss. Posters that look found on a wall, not bought on a billboard.</p>
  </div>
  <figure class="media reveal"><img src="${COVER_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cb-div-plan',
      name: 'Section · The plan',
      transition: 'fade',
      bodyHtml: `<div class="brief-div">
  <div class="brief-div-ghost">02</div>
  <div class="brief-div-num reveal">02 — The plan</div>
  <div class="brief-div-title reveal">The<br/>plan.</div>
</div>`,
    }),
    s({
      id: 'cb-channels',
      name: 'Channel mix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Channel mix</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Where she finds us.</h2>
  <div class="chan reveal" style="--cols:4">
    <div class="ch"><div class="ch-role">Lead</div><div class="ch-name">Social &amp; creators</div><div class="ch-d">Seeded short-form and creator collabs drive the first find.</div><div class="ch-w"><b>45%</b> of budget</div></div>
    <div class="ch"><div class="ch-role">Amplify</div><div class="ch-name">Out-of-home</div><div class="ch-d">Wild-posting and billboards in six core-city culture zones.</div><div class="ch-w"><b>25%</b> of budget</div></div>
    <div class="ch"><div class="ch-role">Convert</div><div class="ch-name">Paid digital</div><div class="ch-d">Retargeting and search capture intent after discovery.</div><div class="ch-w"><b>20%</b> of budget</div></div>
    <div class="ch"><div class="ch-role">Own</div><div class="ch-name">CRM &amp; site</div><div class="ch-d">Email, landing, and a referral loop turn finds into fans.</div><div class="ch-w"><b>10%</b> of budget</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Channel mix</span></div>
</div>`,
    }),
    s({
      id: 'cb-assets',
      name: 'Content & assets',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Content &amp; assets</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What we'll make.</h2>
  <ol class="steps reveal" style="--gap:26px">
    <li class="step"><span><b>Hero film</b> — one 30s anthem plus six-cut social edits for the launch wave.</span></li>
    <li class="step"><span><b>Creator kit</b> — product, brief, and hooks for 40 seeded first-find collaborations.</span></li>
    <li class="step"><span><b>OOH suite</b> — wild-posting, billboard, and transit in magenta-and-black.</span></li>
    <li class="step"><span><b>Always-on</b> — paid templates, landing pages, and a CRM referral flow.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Content &amp; assets</span></div>
</div>`,
    }),
    s({
      id: 'cb-flighting',
      name: 'Media flighting',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Media flighting</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Twelve weeks, three beats.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Wks 1–4</div><div class="tl-what"><b>Tease &amp; seed</b> — creators and OOH go live first; no logos, all intrigue.</div></div>
    <div class="tl-row"><div class="tl-when">Wks 5–8</div><div class="tl-what"><b>Reveal &amp; reach</b> — hero film launches across social and paid at peak weight.</div></div>
    <div class="tl-row"><div class="tl-when">Wks 9–12</div><div class="tl-what"><b>Convert &amp; sustain</b> — retargeting, referral push, and always-on optimization.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Media flighting</span></div>
</div>`,
    }),
    s({
      id: 'cb-div-measure',
      name: 'Section · Measure',
      transition: 'fade',
      bodyHtml: `<div class="brief-div">
  <div class="brief-div-ghost">03</div>
  <div class="brief-div-num reveal">03 — Measure</div>
  <div class="brief-div-title reveal">How we<br/>measure.</div>
</div>`,
    }),
    s({
      id: 'cb-kpis',
      name: 'KPIs & targets',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">KPIs &amp; targets</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:30px">What success looks like.</h2>
      <div class="kpis">
        <div class="kpi-chip"><span class="kpi-ring" style="--p:82"></span><span><span class="kv">+18pt</span><span class="kl">Prompted awareness</span></span></div>
        <div class="kpi-chip"><span class="kpi-ring" style="--p:64"></span><span><span class="kv">120K</span><span class="kl">First-time buyers</span></span></div>
        <div class="kpi-chip"><span class="kpi-ring" style="--p:48"></span><span><span class="kv">3.2x</span><span class="kl">Earned-to-paid reach</span></span></div>
      </div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:30%"><div class="bar-fill" data-val="12%"></div><div class="bar-label">Baseline</div></div>
      <div class="bar" style="--h:54%"><div class="bar-fill" data-val="21%"></div><div class="bar-label">Wk 4</div></div>
      <div class="bar" style="--h:78%"><div class="bar-fill" data-val="27%"></div><div class="bar-label">Wk 8</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="30%"></div><div class="bar-label">Wk 12</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">KPIs &amp; targets</span></div>
</div>`,
    }),
    s({
      id: 'cb-budget',
      name: 'Budget',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:104px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#db2777 0 45%, #0a0a0a 45% 70%, #8a8580 70% 90%, #c9a9bb 90% 100%)"><div class="donut-label">$1.8M</div></div>
    </div>
    <div>
      <div class="kicker">Budget allocation</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:20px">Where the money goes.</h2>
      <table class="table">
        <thead><tr><th>Channel</th><th class="num">Share</th><th class="num">Spend</th></tr></thead>
        <tbody>
          <tr><td>Social &amp; creators</td><td class="num">45%</td><td class="num">$810K</td></tr>
          <tr><td>Out-of-home</td><td class="num">25%</td><td class="num">$450K</td></tr>
          <tr><td>Paid digital</td><td class="num">20%</td><td class="num">$360K</td></tr>
          <tr><td>CRM &amp; production</td><td class="num">10%</td><td class="num">$180K</td></tr>
          <tr class="row-em"><td>Total</td><td class="num">100%</td><td class="num">$1.8M</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Budget</span></div>
</div>`,
    }),
    s({
      id: 'cb-executions',
      name: 'Sample executions',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${MOCKUP_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Sample executions</div>
    <h2 class="display reveal" style="--display-size:120px">Found on<br/>every wall.</h2>
    <p class="lead reveal">Wild-posting and billboard concepts in the campaign's magenta-on-black territory.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cb-quote',
      name: 'Belief',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:80px">"The brands she loves, she found herself. Our job is to be findable — and worth the find."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Creative Strategy</span><span class="cite-role">Aera campaign team</span></div>
  <div class="runner reveal"><span class="runner-brand">Aera</span><span class="runner-label">Our belief</span></div>
</div>`,
    }),
    s({
      id: 'cb-ask',
      name: 'The ask',
      transition: 'fade',
      bodyHtml: `<div class="brief-div">
  <div class="brief-div-ghost">→</div>
  <div class="brief-div-num reveal">The ask</div>
  <div class="brief-div-title reveal" style="font-size:120px;max-width:18ch">Approve the idea, the $1.8M, and a launch date.</div>
  <p class="lead reveal" style="color:rgba(250,247,242,0.9);max-width:38ch;margin-top:10px">Sign off this week and we go live in six. hello@aera.co</p>
</div>`,
    }),
  ],
}
