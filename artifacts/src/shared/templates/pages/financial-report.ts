import type { Template } from '../types'

// A refined LIGHT financial / investor report page — the "financial charting"
// use case. Warm-paper ground, ink type, a single deep-green accent, and
// red/green deltas. Serif display (Fraunces) over Inter body for a printed-
// report feel. Every chart is hand-rolled SVG (combo bar+line, donut, waterfall)
// with tabular numerals and reveal-on-scroll animation. Pure CSS/SVG — no images.

const CSS = `
:root {
  --paper: #faf8f3;
  --panel: #ffffff;
  --ink: #14171c;
  --ink-2: #3b4250;
  --mut: #6b7280;
  --faint: #9aa1ac;
  --line: rgba(20,23,28,0.10);
  --line-2: rgba(20,23,28,0.06);
  --accent: #1f5d4c;      /* deep green */
  --accent-2: #2f7d66;
  --accent-soft: rgba(31,93,76,0.08);
  --pos: #157a4a;
  --pos-soft: rgba(21,122,74,0.10);
  --neg: #b3261e;
  --neg-soft: rgba(179,38,30,0.09);
  --gold: #b08114;
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 520px at 88% -8%, rgba(31,93,76,0.05), transparent 60%),
    var(--paper);
  color: var(--ink);
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
.sheet { max-width: 1120px; margin: 0 auto; padding: 30px 30px 96px; overflow-x: clip; }

/* ---------- report header ---------- */
.rule { height: 1px; background: var(--line); border: 0; margin: 0; }
.masthead { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding-bottom: 18px; }
.brand { display: flex; align-items: center; gap: 14px; }
.mark { width: 40px; height: 40px; flex: none; }
.brand .co { font-family: var(--display); font-weight: 600; font-size: 23px; letter-spacing: -0.015em; line-height: 1; }
.brand .tk { color: var(--mut); font-size: 12px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 6px; }
.filing { text-align: right; font-size: 12.5px; color: var(--mut); line-height: 1.7; }
.filing b { color: var(--ink-2); font-weight: 600; }
.ticker { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.ticker .up { color: var(--pos); font-size: 12px; }

/* Two-column report hero: headline on the left, highlights card on the right. */
.herorow { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(36px, 6vw, 80px); align-items: end; margin: 36px 0 14px; }
.lede { max-width: 34ch; }
.hl { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 24px 26px; box-shadow: 0 1px 0 rgba(20,23,28,0.02), 0 18px 44px -34px rgba(20,23,28,0.30); }
.hl .lbl { color: var(--mut); font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 16px; }
.hl ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.hl li { position: relative; padding-left: 22px; font-size: 14px; line-height: 1.45; color: var(--ink-2); }
.hl li::before { content: ''; position: absolute; left: 0; top: 8px; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.hl li b { color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.eyebrow { display: inline-flex; align-items: center; gap: 12px; color: var(--accent); font-size: 12.5px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
.eyebrow::before { content: ''; width: 30px; height: 2px; background: var(--accent); border-radius: 2px; }
.lede h1 { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 6vw, 60px); line-height: 1.02; letter-spacing: -0.025em; margin: 16px 0 0; }
.lede p { color: var(--ink-2); font-size: clamp(15px, 1.6vw, 17px); line-height: 1.6; margin: 16px 0 0; max-width: 56ch; }

/* ---------- metrics band ---------- */
.band { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; margin-top: 30px; }
.metric { background: var(--panel); padding: 22px 22px 20px; position: relative; }
.metric .k { color: var(--mut); font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.metric .v { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 3.6vw, 38px); letter-spacing: -0.02em; margin: 12px 0 9px; line-height: 1; }
.metric .v small { font-size: 0.55em; color: var(--mut); font-weight: 500; margin-left: 2px; letter-spacing: 0; }
.chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.chip.up { color: var(--pos); background: var(--pos-soft); }
.chip.down { color: var(--neg); background: var(--neg-soft); }
.chip.up::before { content: '▲'; font-size: 7px; }
.chip.down::before { content: '▼'; font-size: 7px; }
.metric .note { color: var(--faint); font-size: 11.5px; margin-left: 8px; }

/* ---------- generic panel ---------- */
.grid { display: grid; gap: 18px; margin-top: 18px; }
.grid > * { min-width: 0; }
.g-2 { grid-template-columns: 1.6fr 1fr; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 26px; box-shadow: 0 1px 0 rgba(20,23,28,0.02), 0 18px 40px -34px rgba(20,23,28,0.30); min-width: 0; }
.phead { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 6px; }
.phead h3 { font-family: var(--display); font-weight: 600; font-size: 20px; letter-spacing: -0.01em; margin: 0; }
.phead .sub { color: var(--mut); font-size: 12.5px; margin: 4px 0 0; }
.legend { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; }
.legend span { color: var(--ink-2); font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 7px; }
.legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
.legend i.ln { width: 16px; height: 2px; border-radius: 2px; }

/* ---------- combo chart (bars + line) ---------- */
.combo { width: 100%; height: 300px; display: block; margin-top: 16px; }
.combo .gl { stroke: var(--line-2); stroke-width: 1; }
.combo .gl0 { stroke: var(--line); stroke-width: 1; }
.combo .axis { fill: var(--faint); font: 600 11px var(--body); }
.combo .axis.r { fill: var(--accent-2); }
.combo .col { fill: var(--accent); opacity: 0.92; transform: scaleY(0); transform-origin: bottom; transform-box: fill-box; transition: transform 0.95s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .combo .col { transform: scaleY(1); }
.combo .col.c1 { transition-delay: 0.04s; } .combo .col.c2 { transition-delay: 0.12s; }
.combo .col.c3 { transition-delay: 0.20s; } .combo .col.c4 { transition-delay: 0.28s; }
.combo .col.c5 { transition-delay: 0.36s; } .combo .col.c6 { transition-delay: 0.44s; }
.combo .col.c7 { transition-delay: 0.52s; } .combo .col.c8 { transition-delay: 0.60s; }
.combo .clab { fill: var(--ink); font: 700 11.5px var(--body); text-anchor: middle; font-variant-numeric: tabular-nums; opacity: 0; transition: opacity 0.5s ease 0.55s; }
.reveal.in .combo .clab { opacity: 1; }
.combo .gline { fill: none; stroke: var(--gold); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1400; stroke-dashoffset: 1400; }
.reveal.in .combo .gline { animation: draw 1.5s cubic-bezier(0.22,1,0.36,1) 0.35s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.combo .gdot { fill: var(--gold); opacity: 0; transition: opacity 0.4s ease; }
.reveal.in .combo .gdot { opacity: 1; transition-delay: 1.4s; }

/* ---------- segment donut ---------- */
.donut-wrap { display: flex; align-items: center; gap: 22px; margin-top: 10px; flex-wrap: wrap; }
.donut { width: 150px; height: 150px; flex: none; }
.donut circle { fill: none; stroke-width: 10; stroke-linecap: butt; }
.donut .seg { stroke-dasharray: 0 100; transition: stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .donut .seg { stroke-dasharray: var(--dash); }
.dlist { display: flex; flex-direction: column; gap: 13px; flex: 1; min-width: 180px; }
.dlist .row { display: grid; grid-template-columns: 12px 1fr auto auto; align-items: center; gap: 10px; font-size: 13px; }
.dlist .row .nm { color: var(--ink-2); font-weight: 600; }
.dlist .row .pct { color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; }
.dlist .row .amt { color: var(--mut); font-variant-numeric: tabular-nums; font-size: 12px; }
.dlist i { width: 12px; height: 12px; border-radius: 3px; }

/* ---------- P&L table ---------- */
.tscroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 8px; max-width: 100%; }
.pnl { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 460px; }
.pnl th { text-align: right; color: var(--mut); font-weight: 700; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 14px 14px; border-bottom: 2px solid var(--ink); white-space: nowrap; }
.pnl th:first-child { text-align: left; }
.pnl td { padding: 14px; border-bottom: 1px solid var(--line-2); color: var(--ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
.pnl td:first-child { text-align: left; color: var(--ink-2); font-weight: 500; }
.pnl tr:last-child td { border-bottom: 0; }
.pnl tr.em td { font-weight: 700; color: var(--ink); border-top: 1px solid var(--line); }
.pnl tr.em td:first-child { font-weight: 700; }
.pnl tr.total td { font-weight: 800; background: var(--accent-soft); }
.pnl tr.total td:first-child { color: var(--ink); }
.pnl .pos { color: var(--pos); font-weight: 700; }
.pnl .neg { color: var(--neg); font-weight: 700; }

/* ---------- waterfall ---------- */
.wf { width: 100%; height: 270px; display: block; margin-top: 14px; }
.wf .gl { stroke: var(--line-2); stroke-width: 1; }
.wf .axis { fill: var(--faint); font: 600 11px var(--body); }
.wf .bar { transform: scaleY(0); transform-origin: var(--ox) var(--oy); transition: transform 0.85s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .wf .bar { transform: scaleY(1); }
.wf .bar.b1 { transition-delay: 0.05s; } .wf .bar.b2 { transition-delay: 0.15s; }
.wf .bar.b3 { transition-delay: 0.25s; } .wf .bar.b4 { transition-delay: 0.35s; }
.wf .bar.b5 { transition-delay: 0.45s; } .wf .bar.b6 { transition-delay: 0.55s; }
.wf .pos { fill: var(--accent); } .wf .neg { fill: var(--neg); } .wf .tot { fill: var(--ink); }
.wf .conn { stroke: var(--faint); stroke-width: 1; stroke-dasharray: 3 3; }
.wf .wlab { fill: var(--ink); font: 700 11px var(--body); text-anchor: middle; font-variant-numeric: tabular-nums; opacity: 0; transition: opacity 0.5s ease 0.5s; }
.reveal.in .wf .wlab { opacity: 1; }
.wf .wcat { fill: var(--mut); font: 600 11px var(--body); text-anchor: middle; }

/* ---------- outlook callout ---------- */
.outlook { background: linear-gradient(150deg, #163e33 0%, #1f5d4c 60%, #2f7d66 130%); color: #eef4f1; border-radius: 20px; padding: 34px 34px 30px; margin-top: 18px; position: relative; overflow: hidden; }
.outlook::after { content: ''; position: absolute; right: -60px; top: -60px; width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%); }
.outlook .eyebrow { color: #9fe6cf; }
.outlook .eyebrow::before { background: #9fe6cf; }
.outlook h3 { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -0.02em; margin: 16px 0 4px; color: #fff; }
.outlook p.intro { color: #cfe4dc; font-size: 14.5px; line-height: 1.55; max-width: 60ch; margin: 0 0 24px; }
.guides { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; position: relative; z-index: 1; }
.guide { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.13); border-radius: 14px; padding: 18px 18px 16px; }
.guide .k { color: #9fe6cf; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
.guide .v { font-family: var(--display); font-weight: 600; font-size: 27px; letter-spacing: -0.02em; margin: 10px 0 6px; color: #fff; font-variant-numeric: tabular-nums; }
.guide .d { color: #b9d6cb; font-size: 12.5px; line-height: 1.45; }

/* ---------- footer ---------- */
.foot { margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; align-items: flex-start; }
.foot .fine { color: var(--faint); font-size: 11px; line-height: 1.65; max-width: 74ch; }
.foot .sig { color: var(--mut); font-size: 12px; text-align: right; line-height: 1.7; white-space: nowrap; }
.foot .sig b { color: var(--ink-2); font-weight: 600; }

@media (max-width: 820px) {
  .sheet { padding: 22px 18px 70px; }
  .herorow { grid-template-columns: 1fr; gap: 26px; align-items: start; }
  .lede { max-width: none; }
  .band { grid-template-columns: repeat(2, 1fr); }
  .g-2 { grid-template-columns: 1fr; }
  .guides { grid-template-columns: 1fr; }
  .filing { text-align: left; }
  .foot { flex-direction: column; }
  .foot .sig { text-align: left; }
  /* Stack each chart panel's heading + legend so the legend can't clip. */
  .phead { flex-direction: column; align-items: flex-start; gap: 10px; }
  .legend { margin-top: 2px; }
}
`.trim()

const HTML = `
<div class="sheet">
  <!-- report header -->
  <div class="reveal" data-reveal="none">
    <div class="masthead">
      <div class="brand">
        <svg class="mark" viewBox="0 0 40 40" aria-hidden="true">
          <rect x="1.5" y="1.5" width="37" height="37" rx="9" fill="none" stroke="var(--accent)" stroke-width="2"/>
          <path d="M9 27 L17 16 L23 22 L31 11" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="31" cy="11" r="2.4" fill="var(--gold)"/>
        </svg>
        <div>
          <div class="co">Meridian Labs, Inc.</div>
          <div class="tk">Annual &amp; Quarterly Results</div>
        </div>
      </div>
      <div class="filing num">
        <div><b>NASDAQ: MRDN</b> · <span class="ticker">$148.20 <span class="up">▲ 6.4%</span></span></div>
        <div>Q4 &amp; Full Year · Fiscal 2025</div>
        <div>Reported February 4, 2026 · After market close</div>
      </div>
    </div>
  </div>
  <hr class="rule">

  <div class="herorow reveal">
    <div class="lede">
      <span class="eyebrow">Q4 FY2025 Results</span>
      <h1>A record quarter, and a year of durable, profitable growth.</h1>
      <p>Meridian Labs closed fiscal 2025 with accelerating revenue, expanding gross margins, and its strongest free-cash-flow quarter on record — driven by enterprise platform adoption and improving net retention.</p>
    </div>
    <aside class="hl">
      <p class="lbl">FY2025 highlights</p>
      <ul>
        <li>Net revenue retention reached <b>124%</b>, a company record.</li>
        <li>Surpassed <b>4,200</b> enterprise customers, up <b>38%</b> year over year.</li>
        <li>Operating margin turned positive at <b>18.0%</b> as the platform scaled.</li>
        <li>Ended the year with <b>$396M</b> cash on hand and zero debt.</li>
      </ul>
    </aside>
  </div>

  <!-- metrics band -->
  <div class="band reveal">
    <div class="metric">
      <div class="k">Revenue (Q4)</div>
      <div class="v num">$214.7<small>M</small></div>
      <span class="chip up num">28.6%</span><span class="note">YoY</span>
    </div>
    <div class="metric">
      <div class="k">Gross margin</div>
      <div class="v num">79.4<small>%</small></div>
      <span class="chip up num">2.3pt</span><span class="note">YoY</span>
    </div>
    <div class="metric">
      <div class="k">EBITDA</div>
      <div class="v num">$58.1<small>M</small></div>
      <span class="chip up num">41.2%</span><span class="note">YoY</span>
    </div>
    <div class="metric">
      <div class="k">Free cash flow</div>
      <div class="v num">$47.3<small>M</small></div>
      <span class="chip up num">63.5%</span><span class="note">YoY</span>
    </div>
  </div>

  <!-- hero combo chart -->
  <div class="panel reveal" style="margin-top:18px">
    <div class="phead">
      <div>
        <h3>Quarterly revenue &amp; growth</h3>
        <p class="sub">Net revenue by quarter, with year-over-year growth · FY2024–FY2025</p>
      </div>
      <div class="legend">
        <span><i style="background:var(--accent)"></i> Revenue ($M)</span>
        <span><i class="ln" style="background:var(--gold)"></i> YoY growth (%)</span>
      </div>
    </div>
    <svg class="combo" viewBox="0 0 960 300" preserveAspectRatio="none" aria-hidden="true">
      <!-- left axis gridlines + labels (revenue $M, 0–240) -->
      <line class="gl0" x1="60" y1="250" x2="900" y2="250"/>
      <line class="gl" x1="60" y1="195" x2="900" y2="195"/>
      <line class="gl" x1="60" y1="140" x2="900" y2="140"/>
      <line class="gl" x1="60" y1="85" x2="900" y2="85"/>
      <line class="gl" x1="60" y1="30" x2="900" y2="30"/>
      <text class="axis" x="50" y="254" text-anchor="end">0</text>
      <text class="axis" x="50" y="199" text-anchor="end">60</text>
      <text class="axis" x="50" y="144" text-anchor="end">120</text>
      <text class="axis" x="50" y="89" text-anchor="end">180</text>
      <text class="axis" x="50" y="34" text-anchor="end">240</text>
      <!-- right axis labels (growth %, 0–40) -->
      <text class="axis r" x="912" y="254">0%</text>
      <text class="axis r" x="912" y="144">20%</text>
      <text class="axis r" x="912" y="34">40%</text>

      <!-- bars: scale 240 -> 220px (250..30). value/240*220 -->
      <rect class="col c1" x="86"  y="135.4" width="56" height="114.6" rx="3"/>
      <rect class="col c2" x="190" y="123.5" width="56" height="126.5" rx="3"/>
      <rect class="col c3" x="294" y="110.7" width="56" height="139.3" rx="3"/>
      <rect class="col c4" x="398" y="100.2" width="56" height="149.8" rx="3"/>
      <rect class="col c5" x="502" y="84.0"  width="56" height="166.0" rx="3"/>
      <rect class="col c6" x="606" y="67.8"  width="56" height="182.2" rx="3"/>
      <rect class="col c7" x="710" y="50.7"  width="56" height="199.3" rx="3"/>
      <rect class="col c8" x="814" y="33.2"  width="56" height="216.8" rx="3"/>

      <!-- value labels -->
      <text class="clab" x="114" y="128">125</text>
      <text class="clab" x="218" y="116">138</text>
      <text class="clab" x="322" y="103">152</text>
      <text class="clab" x="426" y="92">163</text>
      <text class="clab" x="530" y="76">181</text>
      <text class="clab" x="634" y="60">199</text>
      <text class="clab" x="738" y="43">217</text>
      <text class="clab" x="842" y="26" style="fill:var(--accent)">236</text>

      <!-- growth line (right axis 0–40%): y = 250 - g/40*220 -->
      <polyline class="gline" points="114,154.5 218,156.0 322,151.0 426,156.0 530,140.5 634,134.0 738,124.5 842,112.6"/>
      <circle class="gdot" cx="114" cy="154.5" r="3.5"/>
      <circle class="gdot" cx="218" cy="156.0" r="3.5"/>
      <circle class="gdot" cx="322" cy="151.0" r="3.5"/>
      <circle class="gdot" cx="426" cy="156.0" r="3.5"/>
      <circle class="gdot" cx="530" cy="140.5" r="3.5"/>
      <circle class="gdot" cx="634" cy="134.0" r="3.5"/>
      <circle class="gdot" cx="738" cy="124.5" r="3.5"/>
      <circle class="gdot" cx="842" cy="112.6" r="3.5"/>

      <!-- x labels -->
      <text class="axis" x="114" y="270" text-anchor="middle">Q1·24</text>
      <text class="axis" x="218" y="270" text-anchor="middle">Q2·24</text>
      <text class="axis" x="322" y="270" text-anchor="middle">Q3·24</text>
      <text class="axis" x="426" y="270" text-anchor="middle">Q4·24</text>
      <text class="axis" x="530" y="270" text-anchor="middle">Q1·25</text>
      <text class="axis" x="634" y="270" text-anchor="middle">Q2·25</text>
      <text class="axis" x="738" y="270" text-anchor="middle">Q3·25</text>
      <text class="axis" x="842" y="270" text-anchor="middle">Q4·25</text>
    </svg>
  </div>

  <!-- segment + table row -->
  <div class="grid g-2">
    <div class="panel reveal">
      <div class="phead">
        <div>
          <h3>Profit &amp; loss summary</h3>
          <p class="sub">Consolidated statement of operations · USD millions</p>
        </div>
      </div>
      <div class="tscroll">
        <table class="pnl">
          <thead>
            <tr><th>Line item</th><th>FY2025</th><th>FY2024</th><th>YoY</th></tr>
          </thead>
          <tbody>
            <tr><td>Revenue</td><td class="num">768.4</td><td class="num">601.9</td><td class="num pos">+27.7%</td></tr>
            <tr><td>Cost of revenue</td><td class="num">(159.3)</td><td class="num">(137.2)</td><td class="num neg">+16.1%</td></tr>
            <tr class="em"><td>Gross profit</td><td class="num">609.1</td><td class="num">464.7</td><td class="num pos">+31.1%</td></tr>
            <tr><td>Operating expenses</td><td class="num">(471.6)</td><td class="num">(388.4)</td><td class="num neg">+21.4%</td></tr>
            <tr class="em"><td>Operating income</td><td class="num">137.5</td><td class="num">76.3</td><td class="num pos">+80.2%</td></tr>
            <tr class="total"><td>Net income</td><td class="num">112.8</td><td class="num">61.4</td><td class="num pos">+83.7%</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead">
        <div>
          <h3>Revenue by segment</h3>
          <p class="sub">FY2025 · share of net revenue</p>
        </div>
      </div>
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 42 42" aria-hidden="true">
          <circle cx="21" cy="21" r="15.915" stroke="var(--line)"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--accent)"   style="--dash:47 53"  stroke-dashoffset="25"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--accent-2)" style="--dash:28 72"  stroke-dashoffset="78"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--gold)"     style="--dash:17 83"  stroke-dashoffset="50"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="#9aa1ac"         style="--dash:8 92"   stroke-dashoffset="33"/>
          <text x="21" y="20.4" text-anchor="middle" fill="var(--ink)" font-size="5.4" font-weight="700" font-family="var(--display)">$768M</text>
          <text x="21" y="25.6" text-anchor="middle" fill="var(--mut)" font-size="2.5">net revenue</text>
        </svg>
        <div class="dlist">
          <div class="row"><i style="background:var(--accent)"></i><span class="nm">Enterprise Platform</span><span class="pct num">47%</span><span class="amt num">$361M</span></div>
          <div class="row"><i style="background:var(--accent-2)"></i><span class="nm">Cloud Services</span><span class="pct num">28%</span><span class="amt num">$215M</span></div>
          <div class="row"><i style="background:var(--gold)"></i><span class="nm">Data &amp; AI</span><span class="pct num">17%</span><span class="amt num">$131M</span></div>
          <div class="row"><i style="background:#9aa1ac"></i><span class="nm">Professional Services</span><span class="pct num">8%</span><span class="amt num">$61M</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- waterfall -->
  <div class="panel reveal" style="margin-top:18px">
    <div class="phead">
      <div>
        <h3>Net cash bridge</h3>
        <p class="sub">From opening to closing cash · FY2025 · USD millions</p>
      </div>
      <div class="legend">
        <span><i style="background:var(--accent)"></i> Inflow</span>
        <span><i style="background:var(--neg)"></i> Outflow</span>
        <span><i style="background:var(--ink)"></i> Balance</span>
      </div>
    </div>
    <svg class="wf" viewBox="0 0 960 270" preserveAspectRatio="none" aria-hidden="true">
      <!-- gridlines: baseline at y=220, scale 0..620 over 190px (220..30). 1 unit = 0.3065px -->
      <line class="gl" x1="80" y1="220" x2="900" y2="220"/>
      <line class="gl" x1="80" y1="173" x2="900" y2="173"/>
      <line class="gl" x1="80" y1="126" x2="900" y2="126"/>
      <line class="gl" x1="80" y1="79"  x2="900" y2="79"/>
      <line class="gl" x1="80" y1="32"  x2="900" y2="32"/>
      <text class="axis" x="70" y="224" text-anchor="end">0</text>
      <text class="axis" x="70" y="177" text-anchor="end">150</text>
      <text class="axis" x="70" y="130" text-anchor="end">300</text>
      <text class="axis" x="70" y="83"  text-anchor="end">450</text>
      <text class="axis" x="70" y="36"  text-anchor="end">600</text>

      <!-- Opening 312 (total): bar 220 - 95.6 = 124.4, h 95.6 -->
      <rect class="bar b1 tot" x="96"  y="124.4" width="78" height="95.6" rx="2" style="--ox:135px;--oy:220px"/>
      <text class="wlab" x="135" y="116">$312</text>
      <text class="wcat" x="135" y="240">Opening</text>
      <line class="conn" x1="174" y1="124.4" x2="230" y2="124.4"/>

      <!-- +Operating cash 214: top at 124.4 - 65.6 = 58.8, h 65.6 -->
      <rect class="bar b2 pos" x="230" y="58.8" width="78" height="65.6" rx="2" style="--ox:269px;--oy:124.4px"/>
      <text class="wlab" x="269" y="50">+214</text>
      <text class="wcat" x="269" y="240">Operating</text>
      <line class="conn" x1="308" y1="58.8" x2="364" y2="58.8"/>

      <!-- −CapEx 58: from 58.8 down 17.8 -> 76.6, h 17.8 (grows downward) -->
      <rect class="bar b3 neg" x="364" y="58.8" width="78" height="17.8" rx="2" style="--ox:403px;--oy:58.8px"/>
      <text class="wlab" x="403" y="50">−58</text>
      <text class="wcat" x="403" y="240">CapEx</text>
      <line class="conn" x1="442" y1="76.6" x2="498" y2="76.6"/>

      <!-- −Buybacks 96: from 76.6 down 29.4 -> 106.0, h 29.4 -->
      <rect class="bar b4 neg" x="498" y="76.6" width="78" height="29.4" rx="2" style="--ox:537px;--oy:76.6px"/>
      <text class="wlab" x="537" y="68">−96</text>
      <text class="wcat" x="537" y="240">Buybacks</text>
      <line class="conn" x1="576" y1="106.0" x2="632" y2="106.0"/>

      <!-- +Financing 24: from 106.0 up 7.4 -> 98.6, h 7.4 -->
      <rect class="bar b5 pos" x="632" y="98.6" width="78" height="7.4" rx="2" style="--ox:671px;--oy:106.0px"/>
      <text class="wlab" x="671" y="90">+24</text>
      <text class="wcat" x="671" y="240">Financing</text>
      <line class="conn" x1="710" y1="98.6" x2="766" y2="98.6"/>

      <!-- Closing 396 (total): 220 - 121.4 = 98.6, h 121.4 -->
      <rect class="bar b6 tot" x="766" y="98.6" width="78" height="121.4" rx="2" style="--ox:805px;--oy:220px"/>
      <text class="wlab" x="805" y="90">$396</text>
      <text class="wcat" x="805" y="240">Closing</text>
    </svg>
  </div>

  <!-- outlook -->
  <div class="outlook reveal">
    <span class="eyebrow">Outlook · FY2026 Guidance</span>
    <h3>Guiding to durable growth and margin expansion.</h3>
    <p class="intro">Management's framework for fiscal 2026 reflects continued enterprise momentum, disciplined operating leverage, and ongoing investment in the Data &amp; AI segment. Figures are non-GAAP and subject to the disclaimer below.</p>
    <div class="guides">
      <div class="guide">
        <div class="k">Revenue</div>
        <div class="v num">$915–940M</div>
        <div class="d">~21% growth at the midpoint, led by Enterprise Platform.</div>
      </div>
      <div class="guide">
        <div class="k">Operating margin</div>
        <div class="v num">19–21%</div>
        <div class="d">+250bps of leverage as headcount growth moderates.</div>
      </div>
      <div class="guide">
        <div class="k">Free cash flow</div>
        <div class="v num">≥ $185M</div>
        <div class="d">~20% FCF margin; capital return program continues.</div>
      </div>
    </div>
  </div>

  <!-- footer -->
  <div class="foot reveal" data-reveal="none">
    <p class="fine">This report contains forward-looking statements within the meaning of applicable securities laws, including guidance for fiscal 2026. Actual results may differ materially due to risks and uncertainties. Certain measures (EBITDA, free cash flow, non-GAAP operating margin) are non-GAAP and should be considered in addition to, not as a substitute for, GAAP results. Meridian Labs, Inc. is a fictional company; all figures are illustrative and provided for demonstration purposes only.</p>
    <div class="sig num">
      <div><b>Meridian Labs, Inc.</b></div>
      <div>Investor Relations · ir@meridianlabs.example</div>
      <div>© 2026 · All rights reserved</div>
    </div>
  </div>
</div>
`.trim()

const JS = `
// Animate the ticker badge: count the close price up once it scrolls into view,
// then keep tabular figures crisp. Pure DOM, no template literals.
(function () {
  var el = document.querySelector('.ticker');
  if (!el) return;
  var target = 148.20;
  var node = el.firstChild; // the price text node
  if (!node || node.nodeType !== 3) return;
  var started = false;
  function run() {
    if (started) return; started = true;
    var t0 = null, dur = 900;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = '$' + (target * e).toFixed(2) + ' ';
      if (p < 1) requestAnimationFrame(step);
      else node.textContent = '$' + target.toFixed(2) + ' ';
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { run(); io.disconnect(); } });
    }, { threshold: 0.4 });
    io.observe(el);
  } else {
    run();
  }
})();
`.trim()

export const financialReport: Template = {
  id: 'financial-report',
  kind: 'page',
  name: 'Financial Report',
  tagline: 'An elegant printed-style investor results report',
  categories: ['Dashboards'],
  audiences: ['finance', 'founders', 'investors', 'operators'],
  description:
    'A refined light financial/investor report on warm paper: a filing-style masthead, a four-up metrics band with YoY delta chips, a hand-rolled combo chart (quarterly revenue bars + an overlaid YoY-growth line with dual axes), a P&L summary table with tabular nums and pos/neg coloring, a revenue-by-segment donut, a net-cash waterfall, a deep-green guidance callout, and a fine-print disclaimer footer. Serif display (Fraunces) over Inter, every figure tabular, all charts pure SVG with reveal-on-scroll. Swap in your own quarter.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap',
    ],
  },
  stageBg: '#faf8f3',
  notes:
    'A LIGHT printed-report aesthetic — warm paper (--paper), ink type, a single deep-green accent (--accent) plus red/green deltas (--pos/--neg) and a gold line accent (--gold). Keep every figure tabular (.num). All charts are hand-rolled SVG: the combo chart maps revenue to a left axis (0–240 over y 250→30) and growth% to a right axis (0–40 over y 250→30); the waterfall stacks bars from a y=220 baseline. To add a quarter, append a `.col`/`.clab` pair and extend the `.gline` polyline. Reveal animations key off `.reveal.in` so bars grow and the line draws when each panel scrolls in. P&L uses `.em` for subtotals and `.total` for the net-income row; `.pos`/`.neg` color the YoY column.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#faf8f3',
  },
}
