import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/dark-tech-cover.jpg'
const PRODUCT_IMG = 'assets/dark-tech-product.jpg'

export const darkTech: Template = {
  id: 'dark-tech',
  categories: ['Sales', 'Company'],
  name: 'Dark Tech',
  tagline: 'Terminal-grade — neon on near-black, mono details',
  audiences: ['developer', 'engineering', 'conference', 'devtools'],
  description:
    'A near-black cinematic launch keynote with a faint grid, terminal-green accents, monospace details, benchmark tables and a full-bleed product reveal. A complete product-launch story you tailor with your own device and numbers.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Space Grotesk',
    mono: 'JetBrains Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#0a0d13',
    '--text': '#e8eef5',
    '--muted': '#8a97a8',
    '--accent': '#4ade80',
    '--accent-2': '#60a5fa',
    '--display': "'Space Grotesk', sans-serif",
    '--body': "'Space Grotesk', sans-serif",
    '--mono': "'JetBrains Mono', monospace",
    '--kicker-font': "'JetBrains Mono', monospace",
    '--kicker-tracking': '0.12em',
    '--kicker-size': '22px',
    '--title-size': '128px',
    '--headline-size': '82px',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--card-bg': '#111620',
    '--card-border': '#222b38',
    '--radius': '12px',
    '--bullet-radius': '2px',
    '--bullet-color': '#4ade80',
    '--stat-size': '108px',
    '--metric-size': '124px',
    '--th-border': '#2a3340',
    '--table-border': '#1c2531',
    '--chip-bg': '#111620',
    '--track': '#1c2531',
    '--donut-hole': '#0a0d13',
    '--bar-gap': '34px',
    '--media-border': '1px solid #222b38',
    '--media-shadow': '0 50px 100px -36px rgba(0,0,0,0.8)',
    '--scrim':
      'linear-gradient(180deg, rgba(10,13,19,0.30) 0%, rgba(10,13,19,0.92) 100%)',
    '--pos': '#4ade80',
    '--neg': '#f0717a',
  },
  stageBg: '#0a0d13',
  assets: ['dark-tech-cover.jpg', 'dark-tech-product.jpg'],
  decoration: `.slide {
  background-color: #0a0d13;
  background-image: radial-gradient(rgba(96,165,250,0.08) 1px, transparent 1px);
  background-size: 46px 46px;
}
.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.tag { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }

/* Section divider — terminal prompt over a faint scanline backdrop */
.act { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 22px; }
.act-num { font-family: var(--mono); font-weight: 500; font-size: 28px; letter-spacing: 0.12em; color: var(--accent-2); }
.act-title { font-family: var(--display); font-weight: 600; font-size: 158px; line-height: 0.92; letter-spacing: -0.025em; color: var(--text); text-wrap: balance; }
.act-rule { width: 120px; height: 4px; border-radius: 2px; background: var(--accent); margin-top: 16px; }

/* Spec card — mono value + label, terminal-green hairline top */
.spec { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); gap: 24px; }
.spec-cell { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 36px 32px; position: relative; overflow: hidden; }
.spec-cell::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--accent); opacity: 0.85; }
.spec-val { font-family: var(--display); font-weight: 700; font-size: 76px; line-height: 1; letter-spacing: -0.02em; color: var(--text); font-variant-numeric: tabular-nums; }
.spec-unit { font-family: var(--mono); font-size: 30px; color: var(--accent); }
.spec-label { font-family: var(--body); font-size: 24px; line-height: 1.32; color: var(--muted); margin-top: 16px; }

/* Terminal-window block — monospace "console" panel */
.term { background: #0c1018; border: 1px solid var(--card-border); border-radius: 12px; overflow: hidden; box-shadow: 0 40px 90px -40px rgba(0,0,0,0.8); }
.term-bar { display: flex; align-items: center; gap: 11px; padding: 18px 24px; border-bottom: 1px solid var(--card-border); }
.term-dot { width: 13px; height: 13px; border-radius: 50%; background: #2a3340; }
.term-dot.g { background: var(--accent); }
.term-title { font-family: var(--mono); font-size: 21px; color: var(--muted); margin-left: 12px; }
.term-body { padding: 32px 34px; font-family: var(--mono); font-size: 28px; line-height: 1.6; color: var(--text); }
.term-body .c { color: var(--muted); }
.term-body .p { color: var(--accent); }
.term-body .o { color: var(--accent-2); }

/* Feature spec strip — labelled hairline row inside the split */
.fstrip { display: flex; flex-direction: column; gap: 0; margin-top: 8px; }
.frow { display: flex; align-items: baseline; gap: 20px; padding: 22px 0; border-top: 1px solid var(--card-border); }
.frow:last-child { border-bottom: 1px solid var(--card-border); }
.frow-k { font-family: var(--mono); font-size: 24px; color: var(--accent); flex: 0 0 auto; min-width: 170px; }
.frow-v { font-family: var(--body); font-size: 30px; color: var(--text); }

/* Availability / pricing tier emphasis */
.col-us { background: rgba(74,222,128,0.06); }
.tier-name { font-family: var(--display); font-weight: 600; color: var(--text); }
.tier-price { font-family: var(--display); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }

/* One-more-thing accent badge */
.omt { display: inline-flex; align-items: center; gap: 14px; font-family: var(--mono); font-size: 26px; letter-spacing: 0.08em; color: var(--accent); }
.omt::before { content: ''; width: 12px; height: 12px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 6px rgba(74,222,128,0.18); }`,
  notes:
    'A complete product-launch keynote: cinematic near-black (#0a0d13) with a faint blue dot-grid, ONE terminal-green (#4ade80) accent + an electric-blue (#60a5fa) secondary, Space Grotesk display/body and JetBrains Mono for eyebrows, commands and console panels. Open on the dark device-silhouette full-bleed (assets/dark-tech-cover.jpg); reveal the product on a full-bleed and again in a .split (assets/dark-tech-product.jpg). Signature pieces: .act terminal section dividers, .spec cards for the specs row, the .term console block for "how it works", .fstrip labelled hairline rows in the feature split, .col-us to highlight the recommended tier, and the .omt "one more thing" badge. Use .flow for the pipeline, .bars for benchmarks, .table for the lineup and .timeline for availability. Terse, technical, confident copy; keep numbers tabular and mono.',
  sampleSlides: [
    s({
      id: 'dt-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">$ ./launch --2026</div>
    <h1 class="display reveal" style="--display-size:150px;margin-top:8px">Halo&nbsp;<span class="accent-text">Edge.</span></h1>
    <p class="lead reveal">The inference engine that runs where your data already lives.</p>
  </div>
</div>`,
    }),
    s({
      id: 'dt-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// agenda</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Twelve minutes, then a demo.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span>The shift moving compute back to the edge — and why now.</span></li>
    <li class="step"><span>What we built, and how the compiler works in four steps.</span></li>
    <li class="step"><span>The specs and benchmarks that make it real.</span></li>
    <li class="step"><span>The lineup, availability, and how to start today.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'dt-shift',
      name: 'The shift',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">// the shift</div>
      <h2 class="headline" style="margin-top:8px">Compute is moving back to the edge.</h2>
      <p class="lead" style="margin-top:22px">Latency, privacy, and cost are pulling intelligence out of the datacenter and onto the device. The cloud-only era is ending.</p>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-num">75%</div><div class="stat-label">of enterprise data created outside the cloud by 2026</div></div>
      <div class="stat"><div class="stat-num">10×</div><div class="stat-label">round-trip latency tax on every cloud inference call</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">The shift</span></div>
</div>`,
    }),
    s({
      id: 'dt-problem',
      name: 'The problem today',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Edge AI is still a science project.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-num">01</div><div class="card-title">Too slow</div><div class="card-body">Round-trips to the cloud add <span class="kbd">200ms+</span> before a single token ships.</div></div>
    <div class="card"><div class="card-num">02</div><div class="card-title">Too fragile</div><div class="card-body">Hand-tuned runtimes break on every new chip, kernel, and model.</div></div>
    <div class="card"><div class="card-num">03</div><div class="card-title">Too costly</div><div class="card-body">GPU fleets sit idle 80% of the day yet bill around the clock.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">The problem</span></div>
</div>`,
    }),
    s({
      id: 'dt-act1',
      name: 'Section · Introducing',
      transition: 'fade',
      bodyHtml: `<div class="act">
  <div class="act-num reveal">01 — introducing</div>
  <div class="act-title reveal">One runtime.<br/>Every edge.</div>
  <div class="act-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'dt-reveal',
      name: 'Product reveal — full bleed',
      transition: 'zoom',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${PRODUCT_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">// meet</div>
    <h2 class="display reveal" style="--display-size:138px">Halo&nbsp;Edge.</h2>
    <p class="lead reveal">A single inference engine that compiles once and runs on every chip you ship.</p>
  </div>
</div>`,
    }),
    s({
      id: 'dt-how',
      name: 'How it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// how it works</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Model in, native binary out.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="card"><div class="card-num">01</div><div class="card-title">Import</div><div class="card-body">Any framework — one <span class="kbd">.halo</span> graph.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">02</div><div class="card-title">Compile</div><div class="card-body">Quantize and fuse for the target chip.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">03</div><div class="card-title">Deploy</div><div class="card-body">Signed native binary, no runtime deps.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">04</div><div class="card-title">Run</div><div class="card-body">Local inference, zero cloud round-trips.</div></div></div>
  </div>
  <div class="term reveal" style="margin-top:42px">
    <div class="term-bar"><span class="term-dot"></span><span class="term-dot"></span><span class="term-dot g"></span><span class="term-title">halo — compile</span></div>
    <div class="term-body"><span class="p">$</span> halo build model.onnx <span class="o">--target</span> edge-npu <span class="o">--quant</span> int8<br/><span class="c"># fused 412 ops · 38MB binary · ready in 9.4s</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">How it works</span></div>
</div>`,
    }),
    s({
      id: 'dt-specs',
      name: 'The specs that matter',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// the specs that matter</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Built to disappear into the device.</h2>
  <div class="spec reveal" style="--cols:4">
    <div class="spec-cell"><div class="spec-val">9<span class="spec-unit">ms</span></div><div class="spec-label">p99 on-device latency</div></div>
    <div class="spec-cell"><div class="spec-val">38<span class="spec-unit">MB</span></div><div class="spec-label">Runtime footprint, statically linked</div></div>
    <div class="spec-cell"><div class="spec-val">14<span class="spec-unit">+</span></div><div class="spec-label">Supported chip targets, one codebase</div></div>
    <div class="spec-cell"><div class="spec-val">0<span class="spec-unit">deps</span></div><div class="spec-label">No interpreter, no cloud, no surprises</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">Specs</span></div>
</div>`,
    }),
    s({
      id: 'dt-feature',
      name: 'Deep feature — split',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">// deep dive</div>
    <h2 class="headline reveal">The adaptive compiler.</h2>
    <p class="lead reveal">Halo profiles your model against the silicon, then rewrites the graph — fusing, quantizing, and scheduling for the exact chip in front of it.</p>
    <div class="fstrip reveal">
      <div class="frow"><span class="frow-k">fusion</span><span class="frow-v">412 ops collapsed to 31 kernels</span></div>
      <div class="frow"><span class="frow-k">quant</span><span class="frow-v">int8 / int4, accuracy-preserving</span></div>
      <div class="frow"><span class="frow-k">schedule</span><span class="frow-v">per-target, profile-guided</span></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${PRODUCT_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'dt-act2',
      name: 'Section · The proof',
      transition: 'fade',
      bodyHtml: `<div class="act">
  <div class="act-num reveal">02 — the proof</div>
  <div class="act-title reveal">Faster, by<br/>every measure.</div>
  <div class="act-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'dt-bench',
      name: 'Benchmarks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">// benchmarks</div>
      <h2 class="headline" style="margin-top:8px">Tokens per second, same model, same chip.</h2>
      <p class="lead" style="margin-top:20px">Measured on a 7B model, edge-NPU target, batch size one. Higher is better.</p>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:24%"><div class="bar-fill" style="background:#2a3340" data-val="41"></div><div class="bar-label">Cloud API</div></div>
      <div class="bar" style="--h:38%"><div class="bar-fill" style="background:#2a3340" data-val="64"></div><div class="bar-label">Generic RT</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" style="background:var(--accent-2)" data-val="102"></div><div class="bar-label">Hand-tuned</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="171"></div><div class="bar-label">Halo Edge</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">Benchmarks</span></div>
</div>`,
    }),
    s({
      id: 'dt-quote',
      name: 'What people say',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"We shipped on-device inference in a weekend that our team had been chasing for two quarters. Halo just compiled and ran."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Nair</span><span class="cite-role">Principal Engineer, Lumen Robotics</span></div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">What people say</span></div>
</div>`,
    }),
    s({
      id: 'dt-lineup',
      name: 'Lineup & pricing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// the lineup</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Three editions, one runtime.</h2>
  <table class="table reveal">
    <thead><tr><th>Edition</th><th>Targets</th><th>Best for</th><th class="num">Per device / yr</th></tr></thead>
    <tbody>
      <tr><td class="tier-name">Core</td><td>CPU · Mobile NPU</td><td class="muted">Apps and prototypes</td><td class="num tier-price">Free</td></tr>
      <tr class="col-us"><td class="tier-name">Pro</td><td>+ Edge NPU · GPU</td><td class="muted">Production fleets</td><td class="num tier-price">$12</td></tr>
      <tr><td class="tier-name">Fleet</td><td>+ Custom silicon</td><td class="muted">OEMs at scale</td><td class="num tier-price">Custom</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">All editions include the compiler, signed binaries, and OTA model updates. Pro is the recommended starting point.</p>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">Lineup</span></div>
</div>`,
    }),
    s({
      id: 'dt-availability',
      name: 'Availability',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">// availability</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Rolling out this year.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Today</div><div class="tl-what"><b>Public beta</b> — Core and Pro editions, CPU and mobile-NPU targets, open SDK.</div></div>
    <div class="tl-row"><div class="tl-when">Q3 '26</div><div class="tl-what"><b>Edge-NPU &amp; GPU GA</b> — production SLAs, signed binaries, OTA model updates.</div></div>
    <div class="tl-row"><div class="tl-when">Q4 '26</div><div class="tl-what"><b>Fleet edition</b> — custom-silicon backends and on-prem build farm.</div></div>
    <div class="tl-row"><div class="tl-when">Q1 '27</div><div class="tl-what"><b>Halo Studio</b> — visual profiler and one-click rollback across the fleet.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">Availability</span></div>
</div>`,
    }),
    s({
      id: 'dt-onemore',
      name: 'One more thing',
      transition: 'zoom',
      bodyHtml: `<div class="pad center">
  <div class="omt reveal">one more thing</div>
  <h2 class="display reveal" style="--display-size:118px;margin-top:24px">It runs<br/><span class="accent-text">offline.</span></h2>
  <p class="lead reveal" style="margin-top:18px">Every model, every device, no connection required. Privacy by default — your data never leaves the silicon.</p>
  <div class="runner reveal"><span class="runner-brand">Halo</span><span class="runner-label">One more thing</span></div>
</div>`,
    }),
    s({
      id: 'dt-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">$ ./start</div>
    <h2 class="display reveal" style="--display-size:124px">Build at<br/>the edge.</h2>
    <p class="lead reveal"><span class="kbd">curl -fsSL halo.dev/install | sh</span> · halo.dev/launch</p>
  </div>
</div>`,
    }),
  ],
}
