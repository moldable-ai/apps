import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/market-analysis-cover.jpg'

export const marketAnalysis: Template = {
  id: 'market-analysis',
  categories: ['Marketing', 'Strategy'],
  name: 'Market Analysis',
  tagline: 'Analytic, evidence-led market study',
  audiences: ['strategy', 'marketing', 'investor', 'product'],
  description:
    'A rigorous market-analysis deck in deep navy with one amber accent and IBM Plex type. Concentric TAM/SAM/SOM rings, trend bars, competitor and segment tables, and a 2×2 positioning map carry a full size-to-strategy study you tailor with your own market.',
  fonts: {
    display: 'IBM Plex Sans',
    body: 'IBM Plex Sans',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#0c2340',
    '--text': '#f4f7fb',
    '--muted': '#93a4bd',
    '--accent': '#f59e0b',
    '--accent-2': '#f59e0b',
    '--display': "'IBM Plex Sans', sans-serif",
    '--body': "'IBM Plex Sans', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '600',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': 'rgba(255,255,255,0.045)',
    '--card-border': 'rgba(255,255,255,0.13)',
    '--radius': '14px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--bullet-radius': '3px',
    '--th-border': 'rgba(245,158,11,0.6)',
    '--table-border': 'rgba(255,255,255,0.11)',
    '--rule-color': 'rgba(255,255,255,0.14)',
    '--track': 'rgba(255,255,255,0.09)',
    '--donut-hole': '#0c2340',
    '--bar-gap': '32px',
    '--media-border': '1px solid rgba(255,255,255,0.12)',
    '--media-shadow': '0 55px 110px -45px rgba(0,0,0,0.7)',
    '--scrim':
      'linear-gradient(180deg, rgba(8,22,42,0.30) 0%, rgba(8,22,42,0.58) 52%, rgba(8,22,42,0.94) 100%)',
    '--pos': '#34d399',
    '--neg': '#f87171',
  },
  stageBg: '#081626',
  assets: ['market-analysis-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.bullet b, .check b, .tl-what b { color: #fff; }
.tag { color: var(--accent); }

/* Section divider — mono index + amber rule on navy */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--mono); font-weight: 500; letter-spacing: 0.2em; font-size: 24px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.95; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 132px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 12px; }
.divider-sub { font-family: var(--body); font-size: 32px; color: var(--muted); max-width: 34ch; margin-top: 6px; }

/* TAM/SAM/SOM concentric rings — bespoke nested circles */
.tss { position: relative; width: 540px; height: 540px; margin: 0 auto; }
.tss-ring { position: absolute; border-radius: 50%; display: flex; align-items: flex-start; justify-content: center; }
.tss-tam { inset: 0; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.16); }
.tss-sam { inset: 16%; background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.22); }
.tss-som { inset: 34%; background: rgba(245,158,11,0.16); border: 2px solid var(--accent); }
.tss-cap { font-family: var(--mono); font-weight: 500; font-size: 21px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-top: 20px; }
.tss-som .tss-cap { color: var(--accent); margin-top: 28px; }
.tss-val { font-family: var(--display); font-weight: 700; font-size: 40px; color: var(--text); }
.tss-som .tss-val { color: var(--accent); }
.tss-center { position: absolute; inset: 34%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px; }

/* Driver / headwind columns */
.fcol { border-radius: 14px; border: 1px solid var(--card-border); padding: 38px 40px 40px; background: rgba(255,255,255,0.03); height: 100%; }
.fcol.drive { border-top: 4px solid var(--pos); }
.fcol.head { border-top: 4px solid var(--neg); }
.fcol-k { font-family: var(--mono); font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; font-size: 21px; margin-bottom: 24px; }
.fcol.drive .fcol-k { color: var(--pos); }
.fcol.head .fcol-k { color: var(--neg); }
.fitem { display: flex; gap: 18px; align-items: flex-start; font-family: var(--body); font-size: 30px; line-height: 1.34; color: var(--text); padding: 18px 0; border-top: 1px solid var(--card-border); }
.fitem:first-of-type { border-top: 0; padding-top: 0; }
.fitem b { color: #fff; }
.fitem::before { content: ''; flex: 0 0 auto; width: 11px; height: 11px; border-radius: 2px; margin-top: 0.5em; }
.fcol.drive .fitem::before { background: var(--pos); }
.fcol.head .fitem::before { background: var(--neg); }

/* 2×2 positioning map */
.matrix { position: relative; width: 100%; aspect-ratio: 1.32 / 1; border: 1.5px solid var(--card-border); border-radius: 14px; background:
  repeating-linear-gradient(0deg, transparent, transparent 79px, rgba(255,255,255,0.04) 79px, rgba(255,255,255,0.04) 80px),
  repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(255,255,255,0.04) 79px, rgba(255,255,255,0.04) 80px);
}
.matrix-axis-x { position: absolute; left: 0; right: 0; top: 50%; height: 2px; background: rgba(255,255,255,0.2); transform: translateY(-50%); }
.matrix-axis-y { position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: rgba(255,255,255,0.2); transform: translateX(-50%); }
.matrix-pt { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 8px; }
.matrix-dot { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,255,255,0.34); border: 2px solid rgba(255,255,255,0.5); }
.matrix-pt.us .matrix-dot { width: 34px; height: 34px; background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 8px rgba(245,158,11,0.18); }
.matrix-lab { font-family: var(--body); font-weight: 600; font-size: 25px; color: var(--text); white-space: nowrap; }
.matrix-pt.us .matrix-lab { color: var(--accent); font-weight: 700; }
.axis-cap { position: absolute; font-family: var(--mono); font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

/* Trend / segment legend */
.legend { display: flex; flex-direction: column; gap: 20px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 18px; height: 18px; border-radius: 5px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }

/* Headline callout */
.callout { border-left: 4px solid var(--accent); background: rgba(245,158,11,0.09); padding: 32px 40px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--mono); font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 12px; }

/* Where-to-play cards with mono rank */
.play-rank { font-family: var(--mono); font-weight: 500; font-size: 24px; color: var(--accent); letter-spacing: 0.08em; }`,
  notes:
    'A complete market-analysis study: IBM Plex Sans + IBM Plex Mono, deep navy #0c2340 with ONE amber #f59e0b accent, generous whitespace, no gradients. Open and close on the abstract navy data-grid full-bleed (assets/market-analysis-cover.jpg). Signature pieces: the .tss concentric TAM/SAM/SOM rings (nested circles) for market sizing, .fcol drivers-vs-headwinds columns, the .matrix 2×2 positioning map (use --top/--left inline % on .matrix-pt to place players, add .us for the subject), .legend rows beside .bars and .donut, .callout for the headline read. Use .table for competitor landscape and segment economics, .flow for the value chain. Mono for indices, kickers, and figures; keep numbers tabular. Analytic and evidence-led — every claim earns its place.',
  sampleSlides: [
    s({
      id: 'ma-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Market Analysis · Connected Home Energy · 2026</div>
    <h1 class="display reveal" style="--display-size:128px;margin-top:10px">Where the<br/>market is going.</h1>
    <p class="lead reveal">A sizing, dynamics, and positioning study of the residential energy-management market.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ma-question',
      name: 'The question',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:100px;align-items:center">
    <div>
      <div class="kicker">The question</div>
      <h2 class="headline" style="margin-top:10px">Is connected home energy a market worth entering — and where do we win?</h2>
    </div>
    <div>
      <p class="lead" style="max-width:30ch;margin-bottom:30px">This study answers four questions, in order, from the evidence.</p>
      <ol class="steps" style="--gap:22px">
        <li class="step"><span>How big is it, and how fast is it growing?</span></li>
        <li class="step"><span>What forces are shaping it?</span></li>
        <li class="step"><span>Who already plays, and how do they compete?</span></li>
        <li class="step"><span>So where should we play?</span></li>
      </ol>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">The question</span></div>
</div>`,
    }),
    s({
      id: 'ma-takeaways',
      name: 'Executive takeaways',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Executive takeaways</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">What the evidence says.</h2>
  <ul class="checks reveal" style="--gap:30px;--bullet-size:38px">
    <li class="check"><span>The market is <b>large and accelerating</b> — $48B today, compounding 14% a year.</span></li>
    <li class="check"><span>Growth is <b>policy- and electrification-driven</b>, not a fad; the tailwinds are structural.</span></li>
    <li class="check"><span>The field is <b>fragmented</b> — no player holds more than 14% and incumbents are slow.</span></li>
    <li class="check"><span>The opening is the <b>premium, design-led prosumer</b> — underserved and high-margin.</span></li>
  </ul>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Takeaways</span></div>
</div>`,
    }),
    s({
      id: 'ma-sec1',
      name: 'Section · Size',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 / 04</div>
  <div class="divider-title reveal">Size</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">How big the opportunity is, and how fast it is compounding.</div>
</div>`,
    }),
    s({
      id: 'ma-tam',
      name: 'Market size · TAM/SAM/SOM',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div class="tss">
      <div class="tss-ring tss-tam"><div style="text-align:center"><div class="tss-cap">TAM</div><div class="tss-val">$48.0B</div></div></div>
      <div class="tss-ring tss-sam"><div style="text-align:center"><div class="tss-cap">SAM</div><div class="tss-val">$12.6B</div></div></div>
      <div class="tss-center"><div class="tss-cap" style="color:var(--accent);margin:0">SOM</div><div class="tss-val" style="color:var(--accent)">$840M</div></div>
    </div>
    <div>
      <div class="kicker">Market sizing</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:22px">A reachable beachhead inside a big market.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:rgba(255,255,255,0.4)"></span>Total addressable (TAM)<span class="v">$48.0B</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:rgba(255,255,255,0.6)"></span>Serviceable (SAM)<span class="v">$12.6B</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:var(--accent)"></span>Obtainable, yr 3 (SOM)<span class="v">$840M</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Size · TAM/SAM/SOM</span></div>
</div>`,
    }),
    s({
      id: 'ma-growth',
      name: 'Growth & trends',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Growth &amp; trends</div>
      <h2 class="headline" style="margin-top:8px">Five years of compounding, not a spike.</h2>
      <div class="callout" style="margin-top:26px">
        <div class="callout-k">The read</div>
        <p class="body" style="max-width:none">A <b>14% CAGR</b> through 2030 — demand is being pulled by electrification, not pushed by hype.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:42%"><div class="bar-fill" data-val="$48B"></div><div class="bar-label">2026</div></div>
      <div class="bar" style="--h:54%"><div class="bar-fill" data-val="$55B"></div><div class="bar-label">2027</div></div>
      <div class="bar" style="--h:66%"><div class="bar-fill" data-val="$63B"></div><div class="bar-label">2028</div></div>
      <div class="bar" style="--h:81%"><div class="bar-fill" data-val="$72B"></div><div class="bar-label">2029</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$82B"></div><div class="bar-label">2030</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Size · Growth</span></div>
</div>`,
    }),
    s({
      id: 'ma-sec2',
      name: 'Section · Dynamics',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 / 04</div>
  <div class="divider-title reveal">Dynamics</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">The forces pulling the market forward — and the ones holding it back.</div>
</div>`,
    }),
    s({
      id: 'ma-forces',
      name: 'Drivers & headwinds',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Drivers &amp; headwinds</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What moves this market.</h2>
  <div class="cols-2 reveal" style="gap:34px">
    <div class="fcol drive">
      <div class="fcol-k">Drivers</div>
      <div class="fitem"><span><b>Electrification</b> — EVs and heat pumps double household load.</span></div>
      <div class="fitem"><span><b>Policy &amp; rebates</b> — incentives now cover up to 30% of install cost.</span></div>
      <div class="fitem"><span><b>Falling hardware cost</b> — sensors and storage down 40% in three years.</span></div>
      <div class="fitem"><span><b>Volatile tariffs</b> — time-of-use pricing makes optimization pay for itself.</span></div>
    </div>
    <div class="fcol head">
      <div class="fcol-k">Headwinds</div>
      <div class="fitem"><span><b>Install friction</b> — retrofits need an electrician and a permit.</span></div>
      <div class="fitem"><span><b>Fragmented standards</b> — devices still speak different protocols.</span></div>
      <div class="fitem"><span><b>Trust &amp; data</b> — homeowners wary of who sees their usage.</span></div>
      <div class="fitem"><span><b>Utility gatekeeping</b> — grid programs vary wildly by region.</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Dynamics · Forces</span></div>
</div>`,
    }),
    s({
      id: 'ma-valuechain',
      name: 'Value chain',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where value accrues</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The value chain, end to end.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="tag">01</div><div class="subhead" style="font-size:38px;margin-top:8px">Hardware</div><p class="fine" style="margin-top:8px">Meters, sensors, storage. Thin margin, commoditizing fast.</p></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="tag">02</div><div class="subhead" style="font-size:38px;margin-top:8px">Connectivity</div><p class="fine" style="margin-top:8px">Gateways and protocols that bind devices together.</p></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="tag">03</div><div class="subhead" style="font-size:38px;margin-top:8px">Software</div><p class="fine" style="margin-top:8px">Optimization &amp; UX. <b style="color:var(--accent)">The margin pool.</b></p></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="tag">04</div><div class="subhead" style="font-size:38px;margin-top:8px">Grid services</div><p class="fine" style="margin-top:8px">Selling flexibility back to utilities. Emerging upside.</p></div>
  </div>
  <div class="callout reveal" style="margin-top:42px">
    <div class="callout-k">Why it matters</div>
    <p class="body" style="max-width:none">Value is migrating <b>downstream into software and grid services</b> — exactly where incumbents are weakest.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Dynamics · Value chain</span></div>
</div>`,
    }),
    s({
      id: 'ma-sec3',
      name: 'Section · Players',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 / 04</div>
  <div class="divider-title reveal">Players</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">Who competes today, how they're positioned, and who buys.</div>
</div>`,
    }),
    s({
      id: 'ma-competitors',
      name: 'Competitor landscape',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Competitor landscape</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">A fragmented field, no clear winner.</h2>
  <table class="table reveal">
    <thead><tr><th>Competitor</th><th>Archetype</th><th class="num">Share</th><th class="num">Growth</th><th>Weakness</th></tr></thead>
    <tbody>
      <tr><td>Voltline</td><td class="muted">Utility incumbent</td><td class="num">14%</td><td class="num pos">+6%</td><td class="muted">Dated UX, slow</td></tr>
      <tr><td>Gridwise</td><td class="muted">Hardware OEM</td><td class="num">11%</td><td class="num pos">+9%</td><td class="muted">No software layer</td></tr>
      <tr><td>Embergrid</td><td class="muted">Software startup</td><td class="num">8%</td><td class="num pos">+38%</td><td class="muted">Thin on trust</td></tr>
      <tr><td>Nestwatt</td><td class="muted">Consumer brand</td><td class="num">7%</td><td class="num pos">+22%</td><td class="muted">Narrow device set</td></tr>
      <tr><td>Long tail</td><td class="muted">200+ regionals</td><td class="num">60%</td><td class="num">—</td><td class="muted">Sub-scale, local</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Share of the $12.6B serviceable market. The leader holds 14% — the field is wide open.</p>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Players · Landscape</span></div>
</div>`,
    }),
    s({
      id: 'ma-positioning',
      name: 'Positioning map',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:80px;align-items:center;grid-template-columns:1.18fr 1fr">
    <div style="position:relative;padding:0 0 44px 70px">
      <div class="matrix">
        <div class="matrix-axis-x"></div>
        <div class="matrix-axis-y"></div>
        <div class="matrix-pt" style="top:72%;left:26%"><div class="matrix-dot"></div><div class="matrix-lab">Voltline</div></div>
        <div class="matrix-pt" style="top:60%;left:46%"><div class="matrix-dot"></div><div class="matrix-lab">Gridwise</div></div>
        <div class="matrix-pt" style="top:34%;left:58%"><div class="matrix-dot"></div><div class="matrix-lab">Embergrid</div></div>
        <div class="matrix-pt" style="top:46%;left:40%"><div class="matrix-dot"></div><div class="matrix-lab">Nestwatt</div></div>
        <div class="matrix-pt us" style="top:22%;left:80%"><div class="matrix-dot"></div><div class="matrix-lab">The opening</div></div>
        <span class="axis-cap" style="right:0;top:50%;transform:translateY(-50%) translateX(46px)">Premium</span>
        <span class="axis-cap" style="left:0;top:50%;transform:translateY(-50%) translateX(-58px)">Value</span>
        <span class="axis-cap" style="top:-32px;left:50%;transform:translateX(-50%)">Software-led</span>
        <span class="axis-cap" style="bottom:0;left:50%;transform:translateX(-50%)">Hardware-led</span>
      </div>
    </div>
    <div>
      <div class="kicker">Positioning</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:18px">The premium software corner is empty.</h2>
      <p class="lead">Incumbents cluster in value, hardware-led quadrants. The high-end, design-forward, software-led space is uncontested.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Players · Positioning</span></div>
</div>`,
    }),
    s({
      id: 'ma-segments',
      name: 'Customer segments',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#f59e0b 0 32%, #6f86a6 32% 60%, #3f5876 60% 82%, #25405e 82% 100%)"><div class="donut-label">32%</div></div>
    </div>
    <div>
      <div class="kicker">Customer segments</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:22px">Who actually buys.</h2>
      <table class="table" style="--table-size:27px">
        <thead><tr><th>Segment</th><th class="num">Share</th><th class="num">ARPU</th></tr></thead>
        <tbody>
          <tr><td><span class="legend-dot" style="display:inline-block;background:#f59e0b;vertical-align:middle;margin-right:14px"></span>Prosumers</td><td class="num">32%</td><td class="num pos">$680</td></tr>
          <tr><td><span class="legend-dot" style="display:inline-block;background:#6f86a6;vertical-align:middle;margin-right:14px"></span>Mainstream owners</td><td class="num">28%</td><td class="num">$240</td></tr>
          <tr><td><span class="legend-dot" style="display:inline-block;background:#3f5876;vertical-align:middle;margin-right:14px"></span>Landlords</td><td class="num">22%</td><td class="num">$160</td></tr>
          <tr><td><span class="legend-dot" style="display:inline-block;background:#25405e;vertical-align:middle;margin-right:14px"></span>Builders</td><td class="num">18%</td><td class="num">$310</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Players · Segments</span></div>
</div>`,
    }),
    s({
      id: 'ma-sec4',
      name: 'Section · Implications',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">04 / 04</div>
  <div class="divider-title reveal">Implications</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">From the evidence to a clear answer: where to play.</div>
</div>`,
    }),
    s({
      id: 'ma-wheretoplay',
      name: 'Where to play',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where to play</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Three moves the evidence supports.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="play-rank">MOVE 01</div><div class="card-title">Own the prosumer</div><div class="card-body">Lead with the premium, design-led segment — 32% of value, $680 ARPU, and no credible incumbent.</div></div>
    <div class="card"><div class="play-rank">MOVE 02</div><div class="card-title">Win on software</div><div class="card-body">Compete in the margin pool — optimization and UX — not on commoditizing hardware.</div></div>
    <div class="card"><div class="play-rank">MOVE 03</div><div class="card-title">Build for grid services</div><div class="card-body">Architect early for selling flexibility back to utilities — the emerging upside others ignore.</div></div>
  </div>
  <div class="stats reveal" style="margin-top:48px">
    <div class="stat"><div class="stat-num">$840M</div><div class="stat-label">Obtainable market by year three</div></div>
    <div class="stat"><div class="stat-num">32%</div><div class="stat-label">Of value in the target segment</div></div>
    <div class="stat"><div class="stat-num">14%</div><div class="stat-label">Share held by the current leader</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Implications · Where to play</span></div>
</div>`,
    }),
    s({
      id: 'ma-quote',
      name: 'Strategist quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"You don't win a fragmented market by being a little better everywhere. You win it by being undeniably best in the corner no one is defending."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nandakumar</span><span class="cite-role">Head of Strategy</span></div>
  <div class="runner reveal"><span class="runner-brand">Market Analysis</span><span class="runner-label">Point of view</span></div>
</div>`,
    }),
    s({
      id: 'ma-close',
      name: 'Closing',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The recommendation</div>
    <h2 class="display reveal" style="--display-size:112px">Enter — at the<br/>premium edge.</h2>
    <p class="lead reveal">A large, accelerating market with an open corner. The next step is a beachhead plan for the prosumer segment.</p>
  </div>
</div>`,
    }),
  ],
}
