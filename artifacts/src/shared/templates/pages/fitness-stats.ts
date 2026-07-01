import type { Template } from '../types'

// An energetic personal fitness / activity dashboard. Every visual is hand-rolled
// SVG + CSS (no chart library): three concentric Apple-style activity rings that
// animate to fill on reveal, a weekly steps bar chart with a goal line, a smooth
// heart-rate line with a gradient under-fill, stat cards with tabular numbers and
// trend sparklines, a 30-day streak heatmap, and a recent-workouts list. Vivid
// lime / orange / cyan accents on a clean dark base. Pure CSS/SVG — no imagery.

const CSS = `
:root {
  --bg: #0b0e14;
  --panel: #12161f;
  --panel-2: #161b26;
  --line: rgba(255,255,255,0.07);
  --ink: #f3f6fb;
  --mut: #8c93a4;
  --faint: #565d6e;
  --move: #c6ff3d;   /* lime */
  --ex:   #ff6a3d;   /* orange */
  --stand:#3dd7ff;   /* cyan */
  --flame:#ffae3d;   /* amber */
  --pos: #5ee6a0;
  --neg: #ff7a8a;
  --track: rgba(255,255,255,0.06);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 560px at 88% -12%, rgba(198,255,61,0.10), transparent 58%),
    radial-gradient(900px 520px at -8% 8%, rgba(61,215,255,0.09), transparent 60%),
    var(--bg);
  color: var(--ink);
}
.shell { max-width: 1160px; margin: 0 auto; padding: clamp(20px,3.5vw,30px) clamp(16px,3vw,28px) 84px; }
.num { font-variant-numeric: tabular-nums; }

/* ---- header ---- */
.top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.greet h1 { font-family: var(--display); font-weight: 600; font-size: clamp(26px,4.4vw,42px); letter-spacing: -0.02em; margin: 0; line-height: 1.02; }
.greet h1 b { background: linear-gradient(95deg, var(--move), var(--stand)); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 600; }
.greet p { color: var(--mut); margin: 7px 0 0; font-size: 14px; font-weight: 500; }
.top .spacer { flex: 1; }
.streak { display: inline-flex; align-items: center; gap: 11px; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 9px 16px 9px 11px; }
.flame { width: 34px; height: 34px; flex: none; filter: drop-shadow(0 4px 12px rgba(255,174,61,0.45)); }
.flame .fl { transform-origin: 18px 30px; animation: flick 2.4s ease-in-out infinite; }
@keyframes flick { 0%,100%{ transform: scaleY(1) rotate(-1deg); } 50%{ transform: scaleY(1.06) rotate(1.5deg); } }
.streak .n { font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; }
.streak .k { color: var(--mut); font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-top: -2px; }

/* ---- layout ---- */
.grid { display: grid; gap: 16px; margin-top: clamp(18px,2.6vw,26px); }
.g-hero { grid-template-columns: 1.05fr 1.35fr; }
.g-2 { grid-template-columns: 1fr 1fr; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: clamp(18px,2.4vw,24px); position: relative; overflow: hidden; }
.panel h3 { font-size: 13.5px; font-weight: 600; margin: 0; letter-spacing: 0.01em; }
.panel .sub { color: var(--faint); font-size: 12px; margin: 3px 0 0; }
.phead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }

/* ---- activity rings ---- */
.rings-panel { display: flex; flex-direction: column; }
.rings-wrap { display: flex; align-items: center; gap: clamp(14px,2.4vw,26px); margin: auto 0; }
.rings { width: clamp(170px,40%,230px); flex: none; aspect-ratio: 1; }
.rings .bg { fill: none; stroke: var(--track); }
.rings .arc { fill: none; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%;
  stroke-dasharray: 0 999; transition: stroke-dasharray 1.5s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .rings .arc { stroke-dasharray: var(--dash); }
.rlist { display: flex; flex-direction: column; gap: 14px; flex: 1; min-width: 0; }
.rrow { display: flex; align-items: baseline; gap: 10px; }
.rrow .swatch { width: 11px; height: 11px; border-radius: 4px; flex: none; align-self: center; }
.rrow .lab { color: var(--mut); font-size: 12px; font-weight: 600; flex: 1; }
.rrow .v { font-family: var(--display); font-weight: 600; font-size: clamp(19px,2.4vw,24px); letter-spacing: -0.01em; }
.rrow .u { color: var(--faint); font-size: 11.5px; margin-left: 4px; }

/* ---- weekly bars ---- */
.barwrap { position: relative; margin-top: 14px; }
.bars { display: flex; align-items: flex-end; gap: clamp(7px,1.6vw,14px); height: 196px; position: relative; z-index: 1; }
.bcol { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 9px; height: 100%; justify-content: flex-end; }
.bcol .track { width: 100%; flex: 1; display: flex; align-items: flex-end; border-radius: 9px; }
.bcol .bar { width: 100%; border-radius: 9px 9px 4px 4px; background: linear-gradient(180deg, var(--move), #8fcf2a); height: 0; transition: height 1.05s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .bcol .bar { height: var(--h); }
.bcol.today .bar { background: linear-gradient(180deg, var(--ex), #ff3d6e); box-shadow: 0 6px 24px -8px var(--ex); }
.bcol .v { font: 600 11.5px var(--body); color: var(--ink); font-variant-numeric: tabular-nums; }
.bcol .k { font-size: 11px; color: var(--mut); font-weight: 600; }
.bcol.today .k { color: var(--ex); }
.goal { position: absolute; left: 0; right: 0; border-top: 1.5px dashed rgba(255,255,255,0.22); z-index: 2; }
.goal .tag { position: absolute; right: 0; top: -9px; background: var(--panel-2); border: 1px solid var(--line); color: var(--mut); font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.03em; }

/* ---- heart rate line ---- */
.hr-head .big { font-family: var(--display); font-weight: 600; font-size: clamp(24px,3vw,30px); letter-spacing: -0.02em; }
.hr-head .big small { font-size: 13px; color: var(--mut); font-weight: 500; font-family: var(--body); margin-left: 3px; }
.hr { width: 100%; height: 188px; display: block; margin-top: 8px; }
.hr .grid-l { stroke: var(--line); stroke-width: 1; }
.hr .axis { fill: var(--faint); font: 10.5px var(--body); }
.hr .ln { fill: none; stroke: url(#hrStroke); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
  stroke-dasharray: 1300; stroke-dashoffset: 1300; }
.reveal.in .hr .ln { animation: draw 1.7s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.hr .fill { opacity: 0; }
.reveal.in .hr .fill { animation: fade 1.1s ease 0.55s forwards; }
@keyframes fade { to { opacity: 1; } }
.hr .pk { opacity: 0; }
.reveal.in .hr .pk { animation: fade 0.5s ease 1.5s forwards; }
.hr .note { fill: var(--mut); font: 600 11px var(--body); }
.hr .note.peak { fill: var(--ex); }
.hr .note.rest { fill: var(--stand); }
.legend { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 10px; }
.legend span { color: var(--mut); font-size: 12px; display: inline-flex; align-items: center; gap: 7px; font-weight: 500; }
.legend i { width: 9px; height: 9px; border-radius: 3px; display: inline-block; }

/* ---- stat cards ---- */
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.stat { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 16px 16px 14px; position: relative; overflow: hidden; }
.stat .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 15px; margin-bottom: 12px; }
.stat .label { color: var(--mut); font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em; }
.stat .val { font-family: var(--display); font-weight: 600; font-size: clamp(22px,2.7vw,27px); letter-spacing: -0.02em; margin: 5px 0 0; line-height: 1; }
.stat .val .u { font-size: 12.5px; color: var(--mut); font-weight: 500; font-family: var(--body); margin-left: 3px; }
.stat .delta { font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; margin-top: 9px; }
.stat .delta.up { color: var(--pos); } .stat .delta.down { color: var(--neg); } .stat .delta.flat { color: var(--mut); }
.stat .delta.up::before { content: '▲'; font-size: 7px; } .stat .delta.down::before { content: '▼'; font-size: 7px; }
.stat .spark { position: absolute; right: 14px; top: 16px; width: 62px; height: 26px; opacity: 0.95; }

/* ---- streak heatmap ---- */
.heat { display: grid; grid-template-columns: repeat(15, 1fr); gap: 6px; margin-top: 14px; }
.heat .cell { aspect-ratio: 1; border-radius: 5px; background: var(--track); transform: scale(0.6); opacity: 0; }
.reveal.in .heat .cell { animation: pop 0.5s cubic-bezier(0.22,1,0.36,1) forwards; animation-delay: var(--d); }
@keyframes pop { to { transform: scale(1); opacity: 1; } }
.heat-key { display: flex; align-items: center; gap: 7px; color: var(--faint); font-size: 11px; margin-top: 13px; font-weight: 500; }
.heat-key i { width: 11px; height: 11px; border-radius: 4px; }

/* ---- workouts ---- */
.work { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.wrow { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 14px; padding: 11px 6px; border-bottom: 1px solid var(--line); }
.wrow:last-child { border-bottom: 0; }
.wrow .badge { width: 42px; height: 42px; border-radius: 13px; display: grid; place-items: center; font-size: 19px; }
.wrow .name { font-weight: 600; font-size: 14px; }
.wrow .meta { color: var(--mut); font-size: 12px; margin-top: 1px; }
.wrow .figs { text-align: right; }
.wrow .cal { font-family: var(--display); font-weight: 600; font-size: 17px; letter-spacing: -0.01em; }
.wrow .cal small { font-size: 11px; color: var(--mut); font-weight: 500; font-family: var(--body); margin-left: 2px; }
.wrow .dur { color: var(--mut); font-size: 11.5px; margin-top: 1px; font-variant-numeric: tabular-nums; }

@media (max-width: 820px) {
  .g-hero, .g-2 { grid-template-columns: 1fr; }
  .stats { grid-template-columns: repeat(2, 1fr); }
  .heat { grid-template-columns: repeat(10, 1fr); }
}
@media (max-width: 480px) {
  .shell { padding: 18px 14px 60px; }
  .top .spacer { display: none; }
  .streak { margin-left: auto; }
  .stats { grid-template-columns: repeat(2, 1fr); }
  .rings-wrap { flex-direction: column; align-items: flex-start; gap: 18px; }
  .rings { width: 56%; align-self: center; }
  .rlist { width: 100%; }
  .bars { height: 168px; }
  .heat { grid-template-columns: repeat(10, 1fr); }
  .wrow { grid-template-columns: 40px 1fr auto; gap: 11px; }
}
`.trim()

const HTML = `
<div class="shell">
  <header class="top reveal" data-reveal="none">
    <div class="greet">
      <h1>Good morning, <b>Alex</b></h1>
      <p>Monday, June 30 · Let's keep the streak alive</p>
    </div>
    <span class="spacer"></span>
    <div class="streak">
      <svg class="flame" viewBox="0 0 36 36" aria-hidden="true">
        <g class="fl">
          <path d="M18 3 C 20 9 26 11 25 19 C 24.4 24 20.5 27 18 27 C 15 27 11 24 11 18.5 C 11 15 13 14 14 12 C 15 16 16.5 16 17 14 C 17.6 11 16 8 18 3 Z" fill="url(#flameGrad)"/>
          <path d="M18 13 C 19.4 16 21 17.5 20.5 21 C 20.2 24 18.8 26 18 26 C 16.6 26 15 24 15 21 C 15 18.6 16.4 18 17 16.4 C 17.4 18 18 17.8 18 13 Z" fill="#fff5d6" opacity="0.92"/>
        </g>
        <defs><linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd34d"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient></defs>
      </svg>
      <div><div class="n num">42</div><div class="k">day streak</div></div>
    </div>
  </header>

  <div class="grid g-hero">
    <div class="panel rings-panel reveal">
      <div class="phead"><div><h3>Today's activity</h3><p class="sub">June 30 · all three rings within reach</p></div></div>
      <div class="rings-wrap">
        <svg class="rings" viewBox="0 0 100 100" aria-label="Move 86%, Exercise 72%, Stand 92%">
          <circle class="bg" cx="50" cy="50" r="42" stroke-width="9"/>
          <circle class="bg" cx="50" cy="50" r="31" stroke-width="9"/>
          <circle class="bg" cx="50" cy="50" r="20" stroke-width="9"/>
          <circle class="arc" cx="50" cy="50" r="42" stroke="var(--move)"  stroke-width="9" style="--dash:227 999"/>
          <circle class="arc" cx="50" cy="50" r="31" stroke="var(--ex)"    stroke-width="9" style="--dash:140 999"/>
          <circle class="arc" cx="50" cy="50" r="20" stroke="var(--stand)" stroke-width="9" style="--dash:116 999"/>
        </svg>
        <div class="rlist">
          <div class="rrow"><span class="swatch" style="background:var(--move)"></span><span class="lab">Move</span><span class="v num">512<span class="u num">/ 600 cal</span></span></div>
          <div class="rrow"><span class="swatch" style="background:var(--ex)"></span><span class="lab">Exercise</span><span class="v num">32<span class="u num">/ 45 min</span></span></div>
          <div class="rrow"><span class="swatch" style="background:var(--stand)"></span><span class="lab">Stand</span><span class="v num">11<span class="u num">/ 12 hr</span></span></div>
        </div>
      </div>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead">
        <div><h3>Weekly steps</h3><p class="sub">Steps per day · this week</p></div>
        <div style="text-align:right"><div class="big num" style="font-family:var(--display);font-weight:600;font-size:24px;letter-spacing:-0.02em">9,184</div><div class="sub" style="color:var(--mut)">daily avg</div></div>
      </div>
      <div class="barwrap">
        <div class="goal" style="bottom:62%"><span class="tag">Goal 10k</span></div>
        <div class="bars">
          <div class="bcol"><span class="v num">7.2k</span><div class="track"><div class="bar" style="--h:48%"></div></div><span class="k">Mon</span></div>
          <div class="bcol"><span class="v num">11.4k</span><div class="track"><div class="bar" style="--h:78%"></div></div><span class="k">Tue</span></div>
          <div class="bcol"><span class="v num">9.6k</span><div class="track"><div class="bar" style="--h:64%"></div></div><span class="k">Wed</span></div>
          <div class="bcol"><span class="v num">13.1k</span><div class="track"><div class="bar" style="--h:90%"></div></div><span class="k">Thu</span></div>
          <div class="bcol"><span class="v num">8.4k</span><div class="track"><div class="bar" style="--h:56%"></div></div><span class="k">Fri</span></div>
          <div class="bcol"><span class="v num">10.2k</span><div class="track"><div class="bar" style="--h:68%"></div></div><span class="k">Sat</span></div>
          <div class="bcol today"><span class="v num">4.4k</span><div class="track"><div class="bar" style="--h:30%"></div></div><span class="k">Sun</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="stats reveal" style="margin-top:16px">
    <div class="stat">
      <div class="ic" style="background:rgba(255,106,61,0.14);color:var(--ex)">🔥</div>
      <div class="label">Calories</div>
      <div class="val num">512<span class="u">cal</span></div>
      <div class="delta up num">8% vs avg</div>
      <svg class="spark" viewBox="0 0 62 26"><polyline points="0,20 10,18 20,21 31,12 41,14 52,8 62,5" fill="none" stroke="var(--ex)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="stat">
      <div class="ic" style="background:rgba(198,255,61,0.14);color:var(--move)">🏃</div>
      <div class="label">Distance</div>
      <div class="val num">6.8<span class="u">km</span></div>
      <div class="delta up num">12% vs avg</div>
      <svg class="spark" viewBox="0 0 62 26"><polyline points="0,17 10,19 20,14 31,15 41,9 52,11 62,6" fill="none" stroke="var(--move)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="stat">
      <div class="ic" style="background:rgba(61,215,255,0.14);color:var(--stand)">⏱️</div>
      <div class="label">Active min</div>
      <div class="val num">74<span class="u">min</span></div>
      <div class="delta up num">5% vs avg</div>
      <svg class="spark" viewBox="0 0 62 26"><polyline points="0,16 10,15 20,18 31,13 41,12 52,10 62,9" fill="none" stroke="var(--stand)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="stat">
      <div class="ic" style="background:rgba(139,123,255,0.16);color:#a59bff">😴</div>
      <div class="label">Sleep</div>
      <div class="val num">7<span class="u">h</span> 24<span class="u">m</span></div>
      <div class="delta down num">22m vs avg</div>
      <svg class="spark" viewBox="0 0 62 26"><polyline points="0,8 10,7 20,11 31,9 41,13 52,12 62,15" fill="none" stroke="#a59bff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div class="stat">
      <div class="ic" style="background:rgba(94,230,160,0.14);color:var(--pos)">❤️</div>
      <div class="label">Resting HR</div>
      <div class="val num">54<span class="u">bpm</span></div>
      <div class="delta up num">2 bpm lower</div>
      <svg class="spark" viewBox="0 0 62 26"><polyline points="0,9 10,11 20,10 31,13 41,12 52,16 62,17" fill="none" stroke="var(--pos)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  </div>

  <div class="grid g-2">
    <div class="panel reveal">
      <div class="phead hr-head">
        <div><h3>Heart rate</h3><p class="sub">Today · beats per minute</p></div>
        <div style="text-align:right"><div class="big num">142<small>peak</small></div><div class="sub" style="color:var(--mut)">54 resting</div></div>
      </div>
      <svg class="hr" viewBox="0 0 720 188" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hrStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3dd7ff"/><stop offset="0.55" stop-color="#c6ff3d"/><stop offset="1" stop-color="#ff6a3d"/></linearGradient>
          <linearGradient id="hrUnder" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a3d" stop-opacity="0.30"/><stop offset="1" stop-color="#ff6a3d" stop-opacity="0"/></linearGradient>
        </defs>
        <line class="grid-l" x1="0" y1="38" x2="720" y2="38"/>
        <line class="grid-l" x1="0" y1="84" x2="720" y2="84"/>
        <line class="grid-l" x1="0" y1="130" x2="720" y2="130"/>
        <path class="fill" fill="url(#hrUnder)" d="M0,150 C40,148 70,146 100,148 C140,150 160,150 200,142 C250,131 270,70 320,52 C360,38 380,96 420,108 C470,122 500,118 540,104 C580,90 600,84 650,118 C685,142 705,150 720,150 L720,188 L0,188 Z"/>
        <path class="ln" d="M0,150 C40,148 70,146 100,148 C140,150 160,150 200,142 C250,131 270,70 320,52 C360,38 380,96 420,108 C470,122 500,118 540,104 C580,90 600,84 650,118 C685,142 705,150 720,150"/>
        <g class="pk">
          <circle cx="320" cy="52" r="4.5" fill="var(--ex)"/>
          <circle cx="320" cy="52" r="9" fill="none" stroke="var(--ex)" stroke-width="1.5" opacity="0.4"/>
          <text class="note peak" x="320" y="40" text-anchor="middle">142 peak</text>
          <circle cx="100" cy="148" r="4" fill="var(--stand)"/>
          <text class="note rest" x="100" y="170" text-anchor="middle">54 resting</text>
        </g>
        <text class="axis" x="4" y="184">12a</text>
        <text class="axis" x="350" y="184" text-anchor="middle">12p</text>
        <text class="axis" x="716" y="184" text-anchor="end">now</text>
      </svg>
      <div class="legend"><span><i style="background:var(--stand)"></i> Resting zone</span><span><i style="background:var(--move)"></i> Cardio</span><span><i style="background:var(--ex)"></i> Peak</span></div>
    </div>

    <div class="panel reveal" data-reveal="right">
      <div class="phead"><div><h3>30-day streak</h3><p class="sub">Goal-completion intensity · last 30 days</p></div></div>
      <div class="heat" id="heat"></div>
      <div class="heat-key">Less <i style="background:var(--track)"></i><i style="background:rgba(198,255,61,0.28)"></i><i style="background:rgba(198,255,61,0.55)"></i><i style="background:rgba(198,255,61,0.82)"></i><i style="background:var(--move)"></i> More</div>
    </div>
  </div>

  <div class="panel reveal" style="margin-top:16px">
    <div class="phead"><div><h3>Recent workouts</h3><p class="sub">Last 5 sessions · this week</p></div></div>
    <div class="work">
      <div class="wrow">
        <div class="badge" style="background:rgba(255,106,61,0.14)">🏃</div>
        <div><div class="name">Morning Run</div><div class="meta">Today · 7:12 AM · 6.8 km · 158 avg bpm</div></div>
        <div class="figs"><div class="cal num">486 <small>cal</small></div><div class="dur">38:24</div></div>
      </div>
      <div class="wrow">
        <div class="badge" style="background:rgba(61,215,255,0.14)">🚴</div>
        <div><div class="name">Cycling</div><div class="meta">Yesterday · 6:40 PM · 18.2 km · 141 avg bpm</div></div>
        <div class="figs"><div class="cal num">612 <small>cal</small></div><div class="dur">52:10</div></div>
      </div>
      <div class="wrow">
        <div class="badge" style="background:rgba(198,255,61,0.14)">💪</div>
        <div><div class="name">Strength Training</div><div class="meta">Fri · 7:05 AM · Upper body · 118 avg bpm</div></div>
        <div class="figs"><div class="cal num">274 <small>cal</small></div><div class="dur">41:50</div></div>
      </div>
      <div class="wrow">
        <div class="badge" style="background:rgba(139,123,255,0.16)">🧘</div>
        <div><div class="name">Yoga Flow</div><div class="meta">Thu · 8:30 PM · Vinyasa · 96 avg bpm</div></div>
        <div class="figs"><div class="cal num">158 <small>cal</small></div><div class="dur">30:00</div></div>
      </div>
      <div class="wrow">
        <div class="badge" style="background:rgba(94,230,160,0.14)">🏊</div>
        <div><div class="name">Swimming</div><div class="meta">Wed · 6:15 AM · 1,400 m · 132 avg bpm</div></div>
        <div class="figs"><div class="cal num">395 <small>cal</small></div><div class="dur">34:12</div></div>
      </div>
    </div>
  </div>
</div>
`.trim()

const JS = `
// 30-day streak heatmap — 30 cells of varying goal-completion intensity.
(function () {
  var host = document.getElementById('heat'); if (!host) return;
  // Hand-tuned intensities (0 rest day → 1 all rings closed). Reads like a real month.
  var vals = [0.55,0.82,1,0.40,0.68,0.90,1,0.20,0.62,0.85,1,1,0.45,0.74,
              0.95,1,0.55,0.30,0.80,1,0.92,0.68,1,0.50,0.85,1,1,0.72,0.95,1];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    var cell = document.createElement('div');
    cell.className = 'cell';
    var bg = v <= 0.001
      ? 'var(--track)'
      : 'rgba(198,255,61,' + (0.20 + v * 0.78).toFixed(2) + ')';
    cell.style.background = bg;
    cell.style.setProperty('--d', (i * 26) + 'ms');
    if (v >= 0.999) cell.style.boxShadow = '0 0 0 1px rgba(198,255,61,0.35)';
    host.appendChild(cell);
  }
})();
`.trim()

export const fitnessStats: Template = {
  id: 'fitness-stats',
  kind: 'page',
  name: 'Fitness Dashboard',
  tagline: 'An activity dashboard with animated rings',
  categories: ['Dashboards'],
  audiences: ['health', 'fitness', 'personal'],
  description:
    'An energetic personal fitness dashboard: a greeting header with an animated streak flame, three concentric activity rings (Move / Exercise / Stand) that fill on scroll, a weekly steps bar chart with a goal line, a smooth heart-rate line with peak and resting annotations, five stat cards with trend sparklines, a 30-day streak heatmap, and a recent-workouts list. Every visual is hand-rolled SVG/CSS with tabular numerals on a vivid lime/orange/cyan dark base. Drop in your own numbers.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0b0e14',
  notes:
    "Palette knobs live in :root — `--move` (lime), `--ex` (orange), `--stand` (cyan) are the three ring colors and recur across bars, sparklines and the heatmap; `--flame` tints the streak badge. To change a ring's fill, edit its `--dash` on the matching `.arc` circle: the value is `arc-length gap`, where arc-length = 2·π·r·(percent). Radii are 42 / 31 / 20 so full circles are ~264 / 195 / 126; e.g. Move at 86% → 227. Weekly bars set height via `--h` (percent of the track) and the goal line sits at `bottom:62%` — keep them on the same scale. The heart-rate curve is one SVG `<path>`; reshape its `d` (and the matching `.fill` path) and move the peak/resting markers. The 30-day heatmap intensities are the `vals` array in the JS. All figures use `.num` (tabular). Every animation keys off `.reveal.in` so it replays when scrolled into view. To add a stat, copy a `.stat`; to add a workout, copy a `.wrow`.",
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0b0e14',
  },
}
