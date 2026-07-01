import type { Template } from '../types'

// A dark, instrument-panel crypto / markets tracker. Everything is hand-rolled
// SVG / CSS — no chart libraries. Neon mint / cyan / magenta accents on a deep
// navy-black panel palette, tabular numerals throughout, a featured price area
// chart whose path swaps between 24H / 7D / 30D series via plain JS, an SVG
// donut allocation chart, a coin ticker strip with inline sparklines, and a
// markets table with per-row 7d sparklines + pos/neg coloring. Self-contained:
// no imagery, no network beyond the declared font links.

const CSS = `
:root {
  --bg: #06080f;
  --bg-2: #080b14;
  --panel: #0d1120;
  --panel-2: #11162a;
  --line: rgba(120,150,210,0.10);
  --line-2: rgba(120,150,210,0.06);
  --ink: #eef2fb;
  --mut: #8a93ad;
  --faint: #525b76;
  --mint: #2ff5b8;     /* primary neon */
  --cyan: #45c8ff;     /* secondary neon */
  --mag: #ff5cc8;      /* tertiary neon */
  --gold: #ffd166;     /* warm accent */
  --pos: #2ff5b8;
  --neg: #ff5d73;
  --grad: linear-gradient(120deg, var(--mint), var(--cyan));
  --display: 'Space Grotesk', sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(900px 500px at 88% -8%, rgba(69,200,255,0.10), transparent 60%),
    radial-gradient(760px 520px at 4% 4%, rgba(47,245,184,0.07), transparent 55%),
    var(--bg);
  color: var(--ink);
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.shell { max-width: 1200px; margin: 0 auto; padding: clamp(18px,3vw,30px) clamp(14px,3vw,30px) 84px; }

/* ===== top bar ===== */
.bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.brand { display: flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.logo { width: 30px; height: 30px; border-radius: 9px; background: var(--grad); position: relative; box-shadow: 0 0 22px -4px rgba(47,245,184,0.55); }
.logo::after { content: ''; position: absolute; inset: 7px; border-radius: 5px; border: 2px solid rgba(6,8,15,0.85); }
.bar .spacer { flex: 1; }
.live { display: inline-flex; align-items: center; gap: 7px; color: var(--mut); font-size: 12px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.live::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--mint); box-shadow: 0 0 0 0 rgba(47,245,184,0.6); animation: pulse 2.2s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(47,245,184,0.5)} 70%{box-shadow:0 0 0 7px rgba(47,245,184,0)} 100%{box-shadow:0 0 0 0 rgba(47,245,184,0)} }
.asof { color: var(--faint); font-size: 12px; }

/* ===== portfolio hero ===== */
.hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin: clamp(20px,3vw,30px) 0 clamp(16px,2.4vw,22px); }
.hero .lab { color: var(--mut); font-size: 12.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.hero .total { font-family: var(--display); font-weight: 600; font-size: clamp(40px,7vw,68px); letter-spacing: -0.03em; line-height: 0.96; margin: 8px 0 10px; }
.hero .total .cents { color: var(--mut); }
.hero .deltas { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tag { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; padding: 6px 11px; border-radius: 999px; }
.tag.up { color: var(--pos); background: rgba(47,245,184,0.10); box-shadow: inset 0 0 0 1px rgba(47,245,184,0.22); }
.tag.down { color: var(--neg); background: rgba(255,93,115,0.10); box-shadow: inset 0 0 0 1px rgba(255,93,115,0.22); }
.tag.up::before { content: '▲'; font-size: 9px; }
.tag.down::before { content: '▼'; font-size: 9px; }
.tag .pill { color: var(--mut); font-weight: 600; font-size: 13px; }
.hero .right { text-align: right; }
.hero .right .lab { display: block; }
.hero .right .big { font-family: var(--display); font-weight: 600; font-size: clamp(20px,3vw,26px); letter-spacing: -0.02em; margin-top: 6px; }
.hero .right .big.pos { color: var(--pos); } .hero .right .big.neg { color: var(--neg); }

/* ===== ticker strip ===== */
.tickwrap { border: 1px solid var(--line); border-radius: 16px; background: linear-gradient(180deg, var(--panel), var(--bg-2)); overflow: hidden; }
.tickscroll { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.tickscroll::-webkit-scrollbar { display: none; }
.ticker { display: flex; min-width: max-content; }
.tk { display: flex; align-items: center; gap: 11px; padding: 13px 18px; border-right: 1px solid var(--line-2); flex: none; }
.tk:last-child { border-right: 0; }
.tk .mono.sym { font-weight: 600; font-size: 12.5px; color: var(--ink); letter-spacing: 0.02em; }
.tk .px { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: 13px; color: var(--ink); }
.tk svg { width: 56px; height: 22px; display: block; }
.tk .chip { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; font-variant-numeric: tabular-nums; }
.chip.up { color: var(--pos); background: rgba(47,245,184,0.12); }
.chip.down { color: var(--neg); background: rgba(255,93,115,0.12); }

/* ===== grid ===== */
.grid { display: grid; gap: 16px; margin-top: 16px; }
.g-main { grid-template-columns: 1.62fr 1fr; }
.panel { background: linear-gradient(180deg, var(--panel), var(--bg-2)); border: 1px solid var(--line); border-radius: 20px; padding: clamp(16px,2.2vw,22px); position: relative; }
.panel h3 { font-size: 14px; font-weight: 600; margin: 0; letter-spacing: 0.01em; }
.panel .sub { color: var(--faint); font-size: 12px; margin: 3px 0 0; }
.phead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }

/* featured chart */
.coinlead { display: flex; align-items: center; gap: 12px; }
.mono.badge { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; font-family: var(--display); font-weight: 600; font-size: 14px; color: #06080f; background: var(--grad); flex: none; }
.coinlead .px { font-family: var(--display); font-weight: 600; font-size: clamp(24px,3.4vw,32px); letter-spacing: -0.02em; line-height: 1; }
.coinlead .meta { color: var(--mut); font-size: 12.5px; margin-top: 4px; }
.seg { display: inline-flex; background: var(--bg-2); border: 1px solid var(--line); border-radius: 999px; padding: 3px; }
.seg button { border: 0; background: transparent; color: var(--mut); font: 600 12px var(--body); padding: 6px 13px; border-radius: 999px; cursor: pointer; transition: color 0.2s, background 0.2s; }
.seg button.on { background: var(--ink); color: #06080f; }
.seg button:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.chart { position: relative; margin-top: 14px; }
.chart svg { width: 100%; height: clamp(190px,26vw,250px); display: block; overflow: visible; }
.chart .grid-l { stroke: var(--line-2); stroke-width: 1; }
.chart .ax { fill: var(--faint); font: 10.5px var(--mono); }
.chart .ln { fill: none; stroke: url(#stroke); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; transition: d 0.7s cubic-bezier(0.22,1,0.36,1); filter: drop-shadow(0 0 7px rgba(47,245,184,0.45)); }
.chart .fill { transition: d 0.7s cubic-bezier(0.22,1,0.36,1); }
/* draw-in on reveal */
.chart .ln { stroke-dasharray: 2000; stroke-dashoffset: 2000; }
.reveal.in .chart .ln { animation: draw 1.7s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.chart .fill { opacity: 0; }
.reveal.in .chart .fill { animation: fade 1s ease 0.5s forwards; }
@keyframes fade { to { opacity: 1; } }
/* crosshair */
.cross { position: absolute; top: 0; bottom: 22px; width: 1px; background: linear-gradient(180deg, transparent, rgba(69,200,255,0.55), transparent); left: 64%; pointer-events: none; }
.cross::before { content: ''; position: absolute; left: -3.5px; top: 22%; width: 8px; height: 8px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 12px 2px rgba(69,200,255,0.7); }
.cross .tip { position: absolute; left: 10px; top: 6%; background: var(--panel-2); border: 1px solid var(--line); border-radius: 9px; padding: 7px 10px; white-space: nowrap; box-shadow: 0 12px 30px -12px rgba(0,0,0,0.8); }
.cross .tip .t1 { font: 600 13px var(--mono); color: var(--ink); }
.cross .tip .t2 { font-size: 11px; color: var(--mut); margin-top: 1px; }

/* donut holdings */
.donut-wrap { display: flex; align-items: center; gap: 18px; margin-top: 12px; flex-wrap: wrap; }
.donut { width: 138px; height: 138px; flex: none; }
.donut circle { fill: none; stroke-width: 8; }
.donut .seg { stroke-dasharray: 0 100; stroke-linecap: round; transition: stroke-dasharray 1.1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .donut .seg { stroke-dasharray: var(--dash); }
.dlist { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 150px; }
.dlist .row { display: grid; grid-template-columns: 12px 1fr auto auto; align-items: center; gap: 9px; font-size: 12.5px; color: var(--mut); }
.dlist .row i { width: 10px; height: 10px; border-radius: 3px; }
.dlist .row .nm { color: var(--ink); font-weight: 500; }
.dlist .row .vl { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
.dlist .row .pc { color: var(--mut); font-variant-numeric: tabular-nums; min-width: 36px; text-align: right; }

/* markets table */
.tbl { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 13px; }
.tbl th { text-align: left; color: var(--faint); font-weight: 600; font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 9px 10px; border-bottom: 1px solid var(--line); }
.tbl td { padding: 12px 10px; border-bottom: 1px solid var(--line-2); color: var(--ink); font-variant-numeric: tabular-nums; vertical-align: middle; }
.tbl tr:last-child td { border-bottom: 0; }
.tbl tbody tr { transition: background 0.18s; }
.tbl tbody tr:hover { background: rgba(120,150,210,0.05); }
.tbl .r { text-align: right; }
.tbl .mut { color: var(--mut); }
.coin { display: flex; align-items: center; gap: 10px; }
.coin .mono.mark { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-weight: 600; font-size: 12px; color: #06080f; flex: none; }
.coin .nm { font-weight: 600; font-size: 13px; }
.coin .sub { color: var(--faint); font-size: 11px; font-family: var(--mono); }
.chip.tbl-chip { font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 7px; }
.spark7 { width: 84px; height: 26px; display: block; margin-left: auto; }

/* watchlist */
.watch { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; }
.wrow { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid var(--line-2); }
.wrow:last-child { border-bottom: 0; }
.wrow .nm { display: flex; align-items: baseline; gap: 8px; }
.wrow .nm b { font-weight: 600; font-size: 13px; }
.wrow .nm span { color: var(--faint); font-size: 11px; font-family: var(--mono); }
.wrow .px { font-family: var(--mono); font-variant-numeric: tabular-nums; font-size: 13px; }
.wrow .chip { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; min-width: 52px; text-align: center; }
.foot { color: var(--faint); font-size: 11.5px; margin-top: 24px; text-align: center; letter-spacing: 0.02em; }
.foot b { color: var(--mut); font-weight: 600; }

@media (max-width: 820px) {
  .g-main { grid-template-columns: 1fr; }
  .hero { align-items: flex-start; }
  .hero .right { text-align: left; }
}
@media (max-width: 560px) {
  .bar { gap: 9px; }
  .asof { width: 100%; order: 9; }
  .hero .total { font-size: clamp(38px,12vw,52px); }
  .seg button { padding: 6px 10px; }
  .phead { flex-direction: column; }
  .tbl { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tbl th, .tbl td { white-space: nowrap; }
}
`.trim()

const HTML = `
<div class="shell">

  <div class="bar reveal" data-reveal="none">
    <div class="brand"><span class="logo"></span> Lumen Markets</div>
    <span class="spacer"></span>
    <span class="live">Live</span>
    <span class="asof num">as of 09:41:07 UTC · Jun 30</span>
  </div>

  <div class="hero reveal">
    <div>
      <span class="lab">Portfolio value</span>
      <div class="total num">$284,617<span class="cents">.42</span></div>
      <div class="deltas">
        <span class="tag up num">$5,212.18</span>
        <span class="tag up num">1.86%<span class="pill">&nbsp;24h</span></span>
        <span class="tag down num">2.41%<span class="pill">&nbsp;7d</span></span>
      </div>
    </div>
    <div class="right">
      <span class="lab">All-time return</span>
      <div class="big pos num">+142.7%</div>
    </div>
  </div>

  <div class="tickwrap reveal">
    <div class="tickscroll">
      <div class="ticker">
        <div class="tk"><span class="mono sym">BTC</span><span class="px">$68,142</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,16 8,17 16,12 24,14 32,8 40,9 48,5 56,6"/></svg>
          <span class="chip up num">+2.4%</span></div>
        <div class="tk"><span class="mono sym">ETH</span><span class="px">$3,612</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,14 8,11 16,13 24,8 32,10 40,6 48,7 56,4"/></svg>
          <span class="chip up num">+3.1%</span></div>
        <div class="tk"><span class="mono sym">SOL</span><span class="px">$172.40</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--neg)" stroke-width="1.6" stroke-linecap="round" points="0,6 8,8 16,7 24,11 32,10 40,14 48,13 56,17"/></svg>
          <span class="chip down num">−1.8%</span></div>
        <div class="tk"><span class="mono sym">AVAX</span><span class="px">$41.06</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,15 8,13 16,14 24,10 32,12 40,8 48,9 56,5"/></svg>
          <span class="chip up num">+5.6%</span></div>
        <div class="tk"><span class="mono sym">LINK</span><span class="px">$18.92</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--neg)" stroke-width="1.6" stroke-linecap="round" points="0,8 8,7 16,10 24,9 32,12 40,11 48,15 56,14"/></svg>
          <span class="chip down num">−0.7%</span></div>
        <div class="tk"><span class="mono sym">MATIC</span><span class="px">$0.842</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,16 8,15 16,11 24,13 32,9 40,10 48,7 56,6"/></svg>
          <span class="chip up num">+1.2%</span></div>
        <div class="tk"><span class="mono sym">DOT</span><span class="px">$7.18</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,13 8,14 16,10 24,11 32,7 40,9 48,6 56,4"/></svg>
          <span class="chip up num">+0.9%</span></div>
        <div class="tk"><span class="mono sym">ARB</span><span class="px">$1.124</span>
          <svg viewBox="0 0 56 22" preserveAspectRatio="none"><polyline fill="none" stroke="var(--neg)" stroke-width="1.6" stroke-linecap="round" points="0,7 8,9 16,8 24,12 32,11 40,13 48,12 56,16"/></svg>
          <span class="chip down num">−2.2%</span></div>
      </div>
    </div>
  </div>

  <div class="grid g-main">

    <div class="panel reveal" id="featured">
      <div class="phead">
        <div class="coinlead">
          <span class="mono badge">₿</span>
          <div>
            <div class="px num" id="lead-px">$68,142.50</div>
            <div class="meta">Bitcoin · BTC/USD · <span id="lead-chg" class="num">+2.41%</span></div>
          </div>
        </div>
        <div class="seg" id="range" role="tablist" aria-label="Time range">
          <button data-k="24H" role="tab">24H</button>
          <button data-k="7D" class="on" role="tab" aria-selected="true">7D</button>
          <button data-k="30D" role="tab">30D</button>
        </div>
      </div>

      <div class="chart">
        <svg viewBox="0 0 760 250" preserveAspectRatio="none">
          <defs>
            <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2ff5b8"/><stop offset="0.6" stop-color="#45c8ff"/><stop offset="1" stop-color="#ff5cc8"/></linearGradient>
            <linearGradient id="under" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ff5b8" stop-opacity="0.30"/><stop offset="0.5" stop-color="#45c8ff" stop-opacity="0.10"/><stop offset="1" stop-color="#45c8ff" stop-opacity="0"/></linearGradient>
          </defs>
          <line class="grid-l" x1="0" y1="36" x2="760" y2="36"/>
          <line class="grid-l" x1="0" y1="92" x2="760" y2="92"/>
          <line class="grid-l" x1="0" y1="148" x2="760" y2="148"/>
          <line class="grid-l" x1="0" y1="204" x2="760" y2="204"/>
          <text class="ax" x="2" y="20">72k</text>
          <text class="ax" x="2" y="88">68k</text>
          <text class="ax" x="2" y="200">62k</text>
          <path class="fill" id="area-fill" fill="url(#under)" d=""/>
          <path class="ln" id="area-ln" d=""/>
          <g id="xlab"></g>
        </svg>
        <div class="cross"><div class="tip"><div class="t1 num" id="cx-px">$69,480</div><div class="t2" id="cx-t">Thu · 14:00</div></div></div>
      </div>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead"><div><h3>Holdings</h3><p class="sub">Allocation by asset</p></div></div>
      <div class="donut-wrap">
        <svg class="donut" viewBox="0 0 42 42" aria-label="Allocation donut chart">
          <circle cx="21" cy="21" r="15.915" stroke="rgba(120,150,210,0.10)"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--mint)" stroke-dashoffset="25" style="--dash:41 59"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--cyan)" stroke-dashoffset="84" style="--dash:26 74"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--mag)" stroke-dashoffset="58" style="--dash:15 85"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="var(--gold)" stroke-dashoffset="43" style="--dash:10 90"/>
          <circle class="seg" cx="21" cy="21" r="15.915" stroke="#3a4360" stroke-dashoffset="33" style="--dash:8 92"/>
          <text x="21" y="20" text-anchor="middle" fill="var(--ink)" font-size="4.6" font-weight="700" font-family="var(--display)">$284.6k</text>
          <text x="21" y="25" text-anchor="middle" fill="var(--mut)" font-size="2.4">5 assets</text>
        </svg>
        <div class="dlist">
          <div class="row"><i style="background:var(--mint)"></i><span class="nm">Bitcoin</span><span class="vl num">$116.7k</span><span class="pc num">41%</span></div>
          <div class="row"><i style="background:var(--cyan)"></i><span class="nm">Ethereum</span><span class="vl num">$74.0k</span><span class="pc num">26%</span></div>
          <div class="row"><i style="background:var(--mag)"></i><span class="nm">Solana</span><span class="vl num">$42.7k</span><span class="pc num">15%</span></div>
          <div class="row"><i style="background:var(--gold)"></i><span class="nm">Avalanche</span><span class="vl num">$28.5k</span><span class="pc num">10%</span></div>
          <div class="row"><i style="background:#3a4360"></i><span class="nm">Stables + other</span><span class="vl num">$22.7k</span><span class="pc num">8%</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid g-main">
    <div class="panel reveal">
      <div class="phead"><div><h3>Markets</h3><p class="sub">Top assets by market cap · 24h</p></div></div>
      <table class="tbl">
        <thead><tr><th>Asset</th><th class="r">Price</th><th class="r">24h</th><th class="r">7d</th><th class="r">Mkt cap</th></tr></thead>
        <tbody>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:var(--grad)">₿</span><div><div class="nm">Bitcoin</div><div class="sub">BTC</div></div></div></td>
            <td class="r num">$68,142.50</td>
            <td class="r"><span class="chip tbl-chip up num">+2.4%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,19 12,17 24,18 36,12 48,14 60,8 72,9 84,5"/></svg></td>
            <td class="r mut num">$1.34T</td>
          </tr>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:linear-gradient(120deg,#7c8cff,#45c8ff)">Ξ</span><div><div class="nm">Ethereum</div><div class="sub">ETH</div></div></div></td>
            <td class="r num">$3,612.08</td>
            <td class="r"><span class="chip tbl-chip up num">+3.1%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,17 12,13 24,15 36,9 48,11 60,6 72,8 84,4"/></svg></td>
            <td class="r mut num">$434.2B</td>
          </tr>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:linear-gradient(120deg,#ff5cc8,#9945ff)">◎</span><div><div class="nm">Solana</div><div class="sub">SOL</div></div></div></td>
            <td class="r num">$172.40</td>
            <td class="r"><span class="chip tbl-chip down num">−1.8%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--neg)" stroke-width="1.6" stroke-linecap="round" points="0,7 12,9 24,8 36,13 48,12 60,16 72,15 84,20"/></svg></td>
            <td class="r mut num">$81.6B</td>
          </tr>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:linear-gradient(120deg,#ff5d73,#ffd166)">▲</span><div><div class="nm">Avalanche</div><div class="sub">AVAX</div></div></div></td>
            <td class="r num">$41.06</td>
            <td class="r"><span class="chip tbl-chip up num">+5.6%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,20 12,18 24,19 36,13 48,15 60,9 72,7 84,4"/></svg></td>
            <td class="r mut num">$16.2B</td>
          </tr>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:linear-gradient(120deg,#45c8ff,#2ff5b8)">⬡</span><div><div class="nm">Chainlink</div><div class="sub">LINK</div></div></div></td>
            <td class="r num">$18.92</td>
            <td class="r"><span class="chip tbl-chip down num">−0.7%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--neg)" stroke-width="1.6" stroke-linecap="round" points="0,9 12,8 24,11 36,10 48,13 60,12 72,16 84,15"/></svg></td>
            <td class="r mut num">$11.8B</td>
          </tr>
          <tr>
            <td><div class="coin"><span class="mono mark" style="background:linear-gradient(120deg,#a96bff,#ff5cc8)">●</span><div><div class="nm">Polkadot</div><div class="sub">DOT</div></div></div></td>
            <td class="r num">$7.18</td>
            <td class="r"><span class="chip tbl-chip up num">+0.9%</span></td>
            <td class="r"><svg class="spark7" viewBox="0 0 84 26" preserveAspectRatio="none"><polyline fill="none" stroke="var(--mint)" stroke-width="1.6" stroke-linecap="round" points="0,15 12,16 24,12 36,13 48,8 60,10 72,7 84,5"/></svg></td>
            <td class="r mut num">$10.3B</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead"><div><h3>Watchlist</h3><p class="sub">Pinned pairs</p></div></div>
      <div class="watch">
        <div class="wrow"><div class="nm"><b>Render</b> <span>RNDR</span></div><span class="px">$9.84</span><span class="chip up num">+8.3%</span></div>
        <div class="wrow"><div class="nm"><b>Arbitrum</b> <span>ARB</span></div><span class="px">$1.124</span><span class="chip down num">−2.2%</span></div>
        <div class="wrow"><div class="nm"><b>Sui</b> <span>SUI</span></div><span class="px">$1.046</span><span class="chip up num">+4.1%</span></div>
        <div class="wrow"><div class="nm"><b>Injective</b> <span>INJ</span></div><span class="px">$27.30</span><span class="chip up num">+1.5%</span></div>
        <div class="wrow"><div class="nm"><b>Aave</b> <span>AAVE</span></div><span class="px">$94.12</span><span class="chip down num">−0.4%</span></div>
        <div class="wrow"><div class="nm"><b>Optimism</b> <span>OP</span></div><span class="px">$2.31</span><span class="chip up num">+3.7%</span></div>
      </div>
    </div>
  </div>

  <p class="foot">Prices are illustrative sample data · not financial advice. <b>Lumen Markets</b> · built with Artifacts.</p>
</div>
`.trim()

const JS = `
(function () {
  // ----- precomputed BTC price series, one per range. Each value is a price;
  // we map to the 760x250 viewBox (y inverted, padded). -----
  var SERIES = {
    '24H': [67120,67340,67010,67580,68020,67760,68240,68610,68190,68720,69010,68640,69180,69460,69210,68980,69340,69720,69510,69880,70120,69940,70260,70140],
    '7D':  [70980,70210,69640,70320,68880,69510,68240,67860,68720,68130,67410,68040,68590,67920,68460,69180,68740,69620,70110,69480,70260,69840,68910,68142],
    '30D': [58420,59180,57960,60240,61880,60510,62740,63920,62410,64680,66120,65240,67380,66810,68940,67520,69680,68240,70420,69180,71260,70140,68980,70620,69440,71080,70260,68740,69620,68142]
  };
  var XLAB = {
    '24H': ['00:00','06:00','12:00','18:00','now'],
    '7D':  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    '30D': ['Jun 1','Jun 8','Jun 15','Jun 22','Jun 30']
  };
  var LEAD = {
    '24H': { px: '$70,140.00', chg: '+4.50%', cls: 'pos' },
    '7D':  { px: '$68,142.50', chg: '−4.00%', cls: 'neg' },
    '30D': { px: '$68,142.50', chg: '+16.6%', cls: 'pos' }
  };

  var W = 760, H = 250, padT = 24, padB = 224; // drawable y-band

  function buildPaths(arr) {
    var min = Math.min.apply(null, arr), max = Math.max.apply(null, arr);
    var span = (max - min) || 1;
    var n = arr.length, line = '', i, x, y;
    for (i = 0; i < n; i++) {
      x = (i / (n - 1)) * W;
      y = padT + (1 - (arr[i] - min) / span) * (padB - padT);
      line += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    var fill = line + 'L' + W + ',' + H + ' L0,' + H + ' Z';
    return { line: line.trim(), fill: fill.trim() };
  }

  var lnEl = document.getElementById('area-ln');
  var fillEl = document.getElementById('area-fill');
  var xg = document.getElementById('xlab');
  var leadPx = document.getElementById('lead-px');
  var leadChg = document.getElementById('lead-chg');

  function renderXLabels(key) {
    if (!xg) return;
    while (xg.firstChild) xg.removeChild(xg.firstChild);
    var labs = XLAB[key], m = labs.length, j, lx, t;
    for (j = 0; j < m; j++) {
      lx = (j / (m - 1)) * W;
      t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('class', 'ax');
      t.setAttribute('x', Math.max(14, Math.min(W - 30, lx)).toFixed(0));
      t.setAttribute('y', '244');
      if (j === m - 1) t.setAttribute('text-anchor', 'end');
      else if (j === 0) t.setAttribute('text-anchor', 'start');
      else t.setAttribute('text-anchor', 'middle');
      t.textContent = labs[j];
      xg.appendChild(t);
    }
  }

  function setRange(key) {
    var p = buildPaths(SERIES[key]);
    if (lnEl) lnEl.setAttribute('d', p.line);
    if (fillEl) fillEl.setAttribute('d', p.fill);
    renderXLabels(key);
    var L = LEAD[key];
    if (L) {
      if (leadPx) leadPx.textContent = L.px;
      if (leadChg) {
        leadChg.textContent = L.chg;
        leadChg.style.color = L.cls === 'neg' ? 'var(--neg)' : 'var(--pos)';
      }
    }
  }

  // initial render (7D matches the .on tab)
  setRange('7D');

  var seg = document.getElementById('range');
  if (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); x.removeAttribute('aria-selected'); });
      b.classList.add('on'); b.setAttribute('aria-selected', 'true');
      setRange(b.getAttribute('data-k'));
    });
  }

  // gentle live tick on the portfolio total for an "instrument" feel
  var totalEl = document.querySelector('.hero .total');
  if (totalEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var base = 284617.42;
    setInterval(function () {
      var v = base + (Math.random() - 0.5) * 180;
      var c = Math.round(v * 100);           // total cents — avoids floor/round carry mismatch
      var whole = Math.floor(c / 100).toLocaleString('en-US');
      var cents = '.' + String(c % 100).padStart(2, '0');
      totalEl.innerHTML = '$' + whole + '<span class="cents">' + cents + '</span>';
    }, 2600);
  }
})();
`.trim()

export const cryptoDashboard: Template = {
  id: 'crypto-dashboard',
  kind: 'page',
  name: 'Markets Dashboard',
  tagline: 'A neon crypto / markets tracker',
  categories: ['Dashboards'],
  audiences: ['finance', 'crypto', 'trading'],
  description:
    'A dark, instrument-panel crypto and markets tracker: a big tabular portfolio total with 24h / 7d deltas, a scrolling coin ticker with inline sparklines, a featured SVG price area chart that swaps 24H / 7D / 30D series via JS with a crosshair tooltip, an SVG donut holdings allocation, a markets table with per-row 7d sparklines and pos/neg coloring, and a watchlist. Every visual is hand-rolled SVG/CSS with neon mint/cyan/magenta accents and tabular numerals — just swap in your own coins and numbers.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
  },
  stageBg: '#06080f',
  notes:
    'Instrument-panel markets tracker — all visuals are pure SVG/CSS, no chart libs. PALETTE: edit the neon tokens --mint / --cyan / --mag / --gold and --pos / --neg in :root; --grad is the mint→cyan signature. The deep base is --bg / --panel / --bg-2. FEATURED CHART: the three price series live in the SERIES object at the top of the JS (one array of prices per range key 24H/7D/30D); XLAB holds the x-axis tick labels and LEAD sets the headline price + change shown for each range. buildPaths() auto-scales any array to the SVG viewBox, so just replace the numbers. The y-axis tick labels (72k/68k/62k) are static <text> in the chart SVG — tweak them to match your range. TICKER + SPARKLINES: each .tk and each table .spark7 is an inline <polyline> — edit the points and the stroke (var(--mint) for up, var(--neg) for down) plus the % chip. DONUT: each .seg circle uses stroke-dasharray "len rest" (out of 100) and a stroke-dashoffset to position it; keep segments summing to ~100 and update the .dlist legend values. TABLE/WATCHLIST: copy a <tr> / .wrow row; monogram badges are styled via inline gradient on .mark. The portfolio total ticks gently via setInterval (disabled under prefers-reduced-motion) — change `base` or remove that block to freeze it. Keep every figure tabular via class="num".',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#06080f',
  },
}
