import type { Template } from '../types'

// A dark, premium product-analytics dashboard. Every chart is hand-rolled SVG /
// CSS (no chart library) with tabular numerals, an orange→violet signature
// gradient, delta polarity, and reveal-on-scroll animation. Pure CSS/SVG — no
// generated imagery needed.

const CSS = `
:root {
  --bg: #0a0b0f;
  --panel: #13141b;
  --panel-2: #171922;
  --line: rgba(255,255,255,0.07);
  --ink: #f4f5f7;
  --mut: #8b8f9c;
  --faint: #585d6b;
  --c1: #ff8a4c;      /* orange */
  --c2: #ff5d8f;      /* pink   */
  --c3: #8b5cf6;      /* violet */
  --c4: #4cc4ff;      /* cyan   */
  --pos: #34d399;
  --neg: #fb7185;
  --grad: linear-gradient(100deg, var(--c1), var(--c3));
  --display: 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: radial-gradient(1200px 600px at 80% -10%, rgba(139,92,246,0.12), transparent 60%), var(--bg); color: var(--ink); }
.shell { max-width: 1180px; margin: 0 auto; padding: 26px 26px 80px; }
.num { font-variant-numeric: tabular-nums; }

/* top bar */
.bar { display: flex; align-items: center; gap: 16px; padding-bottom: 22px; border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.01em; }
.dot { width: 30px; height: 30px; border-radius: 9px; background: var(--grad); box-shadow: 0 6px 20px -6px var(--c3); }
.bar .spacer { flex: 1; }
.seg { display: inline-flex; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 3px; }
.seg button { border: 0; background: transparent; color: var(--mut); font: 600 12.5px var(--body); padding: 6px 14px; border-radius: 999px; cursor: pointer; }
.seg button.on { background: var(--ink); color: #0b0b0f; }
.live { display: inline-flex; align-items: center; gap: 7px; color: var(--mut); font-size: 12.5px; font-weight: 500; }
.live::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--pos); box-shadow: 0 0 0 0 rgba(52,211,153,0.6); animation: pulse 2s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(52,211,153,0.5)} 70%{box-shadow:0 0 0 7px rgba(52,211,153,0)} 100%{box-shadow:0 0 0 0 rgba(52,211,153,0)} }

.head { margin: 30px 0 22px; }
.head h1 { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 4vw, 40px); letter-spacing: -0.025em; margin: 0; }
.head p { color: var(--mut); margin: 8px 0 0; font-size: 15px; }

/* KPI row */
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.kpi { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 20px 20px 16px; position: relative; overflow: hidden; }
.kpi .label { color: var(--mut); font-size: 12.5px; font-weight: 600; letter-spacing: 0.02em; }
.kpi .val { font-family: var(--display); font-weight: 600; font-size: 33px; letter-spacing: -0.02em; margin: 10px 0 6px; }
.kpi .delta { font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
.kpi .delta.up { color: var(--pos); } .kpi .delta.down { color: var(--neg); }
.kpi .delta.up::before { content: '▲'; font-size: 8px; } .kpi .delta.down::before { content: '▼'; font-size: 8px; }
.kpi .spark { position: absolute; right: 16px; bottom: 14px; width: 88px; height: 34px; opacity: 0.9; }

/* panels */
.grid { display: grid; gap: 16px; margin-top: 16px; }
.g-main { grid-template-columns: 1.7fr 1fr; }
.g-3 { grid-template-columns: 1.3fr 1fr 1fr; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 22px; }
.panel h3 { font-size: 14px; font-weight: 600; margin: 0; letter-spacing: 0.01em; }
.panel .sub { color: var(--faint); font-size: 12px; margin: 3px 0 0; }
.phead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.big { font-family: var(--display); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 6px; }
.legend span { color: var(--mut); font-size: 12px; display: inline-flex; align-items: center; gap: 7px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

/* area chart */
.area { width: 100%; height: 230px; display: block; margin-top: 6px; }
.area .grid-l { stroke: var(--line); stroke-width: 1; }
.area .axis { fill: var(--faint); font: 11px var(--body); }
.area .ln { fill: none; stroke: url(#stroke); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1600; stroke-dashoffset: 1600; }
.reveal.in .area .ln { animation: draw 1.6s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.area .fill { opacity: 0; }
.reveal.in .area .fill { animation: fade 1.2s ease 0.5s forwards; }
@keyframes fade { to { opacity: 1; } }

/* bars */
.bars { display: flex; align-items: flex-end; gap: 14px; height: 200px; margin-top: 14px; }
.bcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 9px; height: 100%; justify-content: flex-end; }
.bcol .bar { width: 100%; border-radius: 8px 8px 3px 3px; background: var(--grad); height: 0; transition: height 1.1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .bcol .bar { height: var(--h); }
.bcol .v { font: 600 12px var(--body); color: var(--ink); }
.bcol .k { font-size: 11.5px; color: var(--mut); }

/* donut */
.donut-wrap { display: flex; align-items: center; gap: 18px; margin-top: 8px; }
.donut { width: 132px; height: 132px; flex: none; }
.donut circle { fill: none; stroke-width: 9; }
.donut .seg { stroke-dasharray: 0 100; transition: stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .donut .seg { stroke-dasharray: var(--dash); }
.dlist { display: flex; flex-direction: column; gap: 11px; flex: 1; }
.dlist .row { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--mut); }
.dlist .row b { color: var(--ink); margin-left: auto; font-variant-numeric: tabular-nums; }
.dlist i { width: 10px; height: 10px; border-radius: 3px; }

/* funnel */
.funnel { display: flex; flex-direction: column; gap: 9px; margin-top: 12px; }
.frow { display: grid; grid-template-columns: 92px 1fr 64px; align-items: center; gap: 12px; font-size: 12.5px; }
.frow .k { color: var(--mut); } .frow .n { text-align: right; color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.ftrack { height: 26px; background: var(--panel-2); border-radius: 7px; overflow: hidden; }
.ffill { height: 100%; border-radius: 7px; background: var(--grad); width: 0; transition: width 1.2s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .ffill { width: var(--w); }

/* table */
.tbl { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 13px; }
.tbl th { text-align: left; color: var(--faint); font-weight: 600; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; padding: 8px 10px; border-bottom: 1px solid var(--line); }
.tbl td { padding: 13px 10px; border-bottom: 1px solid var(--line); color: var(--ink); font-variant-numeric: tabular-nums; }
.tbl tr:last-child td { border-bottom: 0; }
.tbl .r { text-align: right; }
.tbl .mut { color: var(--mut); }
.chip { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
.chip.up { color: var(--pos); background: rgba(52,211,153,0.12); }
.chip.down { color: var(--neg); background: rgba(251,113,133,0.12); }
.minibar { height: 6px; border-radius: 3px; background: var(--grad); }

@media (max-width: 820px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .g-main, .g-3 { grid-template-columns: 1fr; }
  .shell { padding: 20px 16px 60px; }
}
@media (max-width: 560px) {
  .bar { flex-wrap: wrap; gap: 10px; }
  .bar .spacer { display: none; }
  .seg { margin-left: auto; }
  .seg button { padding: 6px 11px; }
  .head h1 { font-size: 26px; }
  .phead { flex-direction: column; gap: 6px; }
  .phead > div:last-child { text-align: left !important; }
  .phead .delta { justify-content: flex-start !important; }
  .kpis { grid-template-columns: 1fr; }
  .tbl { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tbl th, .tbl td { white-space: nowrap; }
}
`.trim()

const HTML = `
<div class="shell">
  <div class="bar reveal" data-reveal="none">
    <div class="brand"><span class="dot"></span> Northwind Analytics</div>
    <span class="spacer"></span>
    <span class="live">Live</span>
    <div class="seg"><button>24h</button><button class="on">30d</button><button>QTD</button><button>YTD</button></div>
  </div>

  <div class="head reveal">
    <h1>Product overview</h1>
    <p>How the product is performing this month — engagement, revenue, and where users drop off.</p>
  </div>

  <div class="kpis reveal">
    <div class="kpi"><div class="label">Active users</div><div class="val num">48,217</div><span class="delta up num">12.4%</span>
      <svg class="spark" viewBox="0 0 88 34"><polyline points="0,28 12,24 24,26 36,18 48,20 60,12 72,9 88,4" fill="none" stroke="var(--c1)" stroke-width="2.5" stroke-linecap="round"/></svg></div>
    <div class="kpi"><div class="label">MRR</div><div class="val num">$284.6k</div><span class="delta up num">8.1%</span>
      <svg class="spark" viewBox="0 0 88 34"><polyline points="0,26 14,22 28,23 42,16 56,15 70,9 88,6" fill="none" stroke="var(--c3)" stroke-width="2.5" stroke-linecap="round"/></svg></div>
    <div class="kpi"><div class="label">Conversion</div><div class="val num">3.92%</div><span class="delta up num">0.6pt</span>
      <svg class="spark" viewBox="0 0 88 34"><polyline points="0,20 14,22 28,17 42,19 56,13 70,14 88,10" fill="none" stroke="var(--c4)" stroke-width="2.5" stroke-linecap="round"/></svg></div>
    <div class="kpi"><div class="label">Churn</div><div class="val num">1.8%</div><span class="delta down num">0.3pt</span>
      <svg class="spark" viewBox="0 0 88 34"><polyline points="0,8 14,11 28,10 42,15 56,14 70,18 88,21" fill="none" stroke="var(--c2)" stroke-width="2.5" stroke-linecap="round"/></svg></div>
  </div>

  <div class="grid g-main">
    <div class="panel reveal">
      <div class="phead">
        <div><h3>Revenue</h3><p class="sub">Net revenue · last 30 days</p></div>
        <div style="text-align:right"><div class="big num">$284,610</div><div class="delta up num" style="font-size:12.5px;justify-content:flex-end">+8.1% vs last period</div></div>
      </div>
      <svg class="area" viewBox="0 0 760 230" preserveAspectRatio="none">
        <defs>
          <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8a4c"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
          <linearGradient id="under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.34"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient>
        </defs>
        <line class="grid-l" x1="0" y1="40" x2="760" y2="40"/><line class="grid-l" x1="0" y1="95" x2="760" y2="95"/><line class="grid-l" x1="0" y1="150" x2="760" y2="150"/><line class="grid-l" x1="0" y1="205" x2="760" y2="205"/>
        <path class="fill" fill="url(#under)" d="M0,170 C60,150 90,160 150,120 C210,82 250,128 320,100 C390,72 430,96 500,64 C560,40 610,70 680,36 C710,24 740,30 760,22 L760,230 L0,230 Z"/>
        <path class="ln" d="M0,170 C60,150 90,160 150,120 C210,82 250,128 320,100 C390,72 430,96 500,64 C560,40 610,70 680,36 C710,24 740,30 760,22"/>
      </svg>
      <div class="legend"><span><i style="background:var(--grad)"></i> This period</span><span><i style="background:var(--faint)"></i> Prior period</span></div>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead"><div><h3>Traffic sources</h3><p class="sub">Sessions by channel</p></div></div>
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.915" stroke="#23252f"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--c1)" stroke-dashoffset="25" style="--dash:38 62"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--c3)" stroke-dashoffset="87" style="--dash:27 73"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--c4)" stroke-dashoffset="60" style="--dash:21 79"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="#3a3d49" stroke-dashoffset="39" style="--dash:14 86"/>
          <text x="21" y="20.4" text-anchor="middle" fill="var(--ink)" font-size="5.4" font-weight="700" font-family="var(--display)">48.2k</text>
          <text x="21" y="25.4" text-anchor="middle" fill="var(--mut)" font-size="2.5">sessions</text>
        </svg>
        <div class="dlist">
          <div class="row"><i style="background:var(--c1)"></i> Organic <b class="num">38%</b></div>
          <div class="row"><i style="background:var(--c3)"></i> Direct <b class="num">27%</b></div>
          <div class="row"><i style="background:var(--c4)"></i> Referral <b class="num">21%</b></div>
          <div class="row"><i style="background:#3a3d49"></i> Paid <b class="num">14%</b></div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid g-3">
    <div class="panel reveal">
      <div class="phead"><div><h3>Revenue by plan</h3><p class="sub">MRR contribution</p></div></div>
      <div class="bars">
        <div class="bcol"><span class="v num">$96k</span><div class="bar" style="--h:62%"></div><span class="k">Starter</span></div>
        <div class="bcol"><span class="v num">$128k</span><div class="bar" style="--h:84%"></div><span class="k">Growth</span></div>
        <div class="bcol"><span class="v num">$41k</span><div class="bar" style="--h:30%"></div><span class="k">Scale</span></div>
        <div class="bcol"><span class="v num">$19k</span><div class="bar" style="--h:16%"></div><span class="k">Ent.</span></div>
      </div>
    </div>
    <div class="panel reveal">
      <div class="phead"><div><h3>Activation funnel</h3><p class="sub">Signup → active</p></div></div>
      <div class="funnel">
        <div class="frow"><span class="k">Signed up</span><div class="ftrack"><div class="ffill" style="--w:100%"></div></div><span class="n num">12,400</span></div>
        <div class="frow"><span class="k">Onboarded</span><div class="ftrack"><div class="ffill" style="--w:74%"></div></div><span class="n num">9,176</span></div>
        <div class="frow"><span class="k">First value</span><div class="ftrack"><div class="ffill" style="--w:48%"></div></div><span class="n num">5,952</span></div>
        <div class="frow"><span class="k">Activated</span><div class="ftrack"><div class="ffill" style="--w:31%"></div></div><span class="n num">3,844</span></div>
      </div>
    </div>
    <div class="panel reveal" data-reveal="right">
      <div class="phead"><div><h3>Retention</h3><p class="sub">Weekly cohorts</p></div></div>
      <div id="heat"></div>
    </div>
  </div>

  <div class="panel reveal" style="margin-top:16px">
    <div class="phead"><div><h3>Top pages</h3><p class="sub">By unique visitors · 30 days</p></div></div>
    <table class="tbl">
      <thead><tr><th>Page</th><th class="r">Visitors</th><th class="r">Avg. time</th><th class="r">Trend</th><th class="r">Change</th></tr></thead>
      <tbody>
        <tr><td>/dashboard</td><td class="r num">21,884</td><td class="r mut num">4m 12s</td><td class="r"><div class="minibar" style="width:90%;margin-left:auto"></div></td><td class="r"><span class="chip up num">+14%</span></td></tr>
        <tr><td>/pricing</td><td class="r num">12,401</td><td class="r mut num">1m 48s</td><td class="r"><div class="minibar" style="width:62%;margin-left:auto"></div></td><td class="r"><span class="chip up num">+9%</span></td></tr>
        <tr><td>/integrations</td><td class="r num">8,742</td><td class="r mut num">2m 30s</td><td class="r"><div class="minibar" style="width:44%;margin-left:auto"></div></td><td class="r"><span class="chip up num">+22%</span></td></tr>
        <tr><td>/docs/quickstart</td><td class="r num">6,205</td><td class="r mut num">5m 02s</td><td class="r"><div class="minibar" style="width:33%;margin-left:auto"></div></td><td class="r"><span class="chip down num">−4%</span></td></tr>
        <tr><td>/changelog</td><td class="r num">3,990</td><td class="r mut num">1m 09s</td><td class="r"><div class="minibar" style="width:20%;margin-left:auto"></div></td><td class="r"><span class="chip up num">+6%</span></td></tr>
      </tbody>
    </table>
  </div>
</div>
`.trim()

const JS = `
// Period segmented control
document.querySelectorAll('.seg').forEach(function (seg) {
  seg.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(function (x){ x.classList.remove('on'); });
    b.classList.add('on');
  });
});
// Retention heatmap (cohort grid)
(function () {
  var host = document.getElementById('heat'); if (!host) return;
  var rows = 6, cols = 8;
  var g = document.createElement('div');
  g.style.cssText = 'display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:4px;margin-top:6px';
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var v = Math.max(0, 1 - r * 0.12 - c * 0.04 - (c > r ? 1 : 0));
      var cell = document.createElement('div');
      var on = c <= (cols - 1 - r);
      cell.style.cssText = 'aspect-ratio:1;border-radius:4px;background:' +
        (on ? 'rgba(139,92,246,' + (0.18 + v * 0.7).toFixed(2) + ')' : 'rgba(255,255,255,0.03)');
      g.appendChild(cell);
    }
  }
  host.appendChild(g);
})();
`.trim()

export const analyticsDashboard: Template = {
  id: 'analytics-dashboard',
  kind: 'page',
  name: 'Analytics Dashboard',
  tagline: 'A live-looking product metrics dashboard',
  categories: ['Dashboards'],
  audiences: ['product', 'growth', 'analytics', 'founders'],
  description:
    'A dark, premium product-analytics dashboard: KPI cards with sparklines and delta polarity, a gradient SVG revenue area chart, plan-revenue bars, an activation funnel, a retention cohort heatmap, and a top-pages table. Every visual is hand-rolled SVG/CSS with tabular numerals and reveal-on-scroll animation. Drop in your own numbers.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0a0b0f',
  notes:
    'Keep every figure tabular (.num). Charts are pure SVG/CSS — recolor via the --c1..--c4 tokens and the --grad gradient. Reveal animations key off `.reveal.in` so they replay when sections scroll into view. To add a metric, copy a `.kpi` or a `.panel`.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0a0b0f',
  },
}
