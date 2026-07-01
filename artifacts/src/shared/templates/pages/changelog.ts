import type { Template } from '../types'

// A polished product CHANGELOG / release-notes page. Light, editorial layout:
// a vertical timeline with version badges + tabular dates on a left rail, cards
// with colored category tags (New=green, Improved=blue, Fixed=amber), bullet
// notes, and occasional generative SVG "highlight" graphics. Sticky month
// markers, a working filter row (All/New/Improved/Fixed), a load-more reveal,
// and an "all caught up" end state. Pure CSS/SVG — no imagery, no chart libs.

const CSS = `
:root {
  --bg: #fbfbfa;
  --panel: #ffffff;
  --ink: #16181d;
  --mut: #6b7180;
  --faint: #9aa0ad;
  --line: #ececf1;
  --line-2: #e2e3e9;
  --accent: #5b54ec;       /* indigo focal */
  --accent-soft: #efeefe;
  /* tag colors */
  --new: #0f9d6b; --new-bg: #e7f6ee;
  --imp: #2563eb; --imp-bg: #e8f0ff;
  --fix: #c0820c; --fix-bg: #fbf2dd;
  --display: 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --rail: 168px;
}
body { background:
  radial-gradient(900px 500px at 88% -8%, rgba(91,84,236,0.07), transparent 62%),
  radial-gradient(700px 420px at -6% 4%, rgba(15,157,107,0.05), transparent 58%),
  var(--bg);
  color: var(--ink); }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 880px; margin: 0 auto; padding: clamp(26px, 5vw, 56px) clamp(18px, 4vw, 28px) 96px; }

/* ===== header ===== */
.masthead { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
.glyph { width: 46px; height: 46px; border-radius: 13px; flex: none;
  background: linear-gradient(150deg, var(--accent), #8b7bff);
  box-shadow: 0 12px 28px -12px rgba(91,84,236,0.7); position: relative; overflow: hidden; }
.glyph::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(18px 18px at 70% 26%, rgba(255,255,255,0.85), transparent 60%); }
.glyph::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 11px; height: 3px;
  border-radius: 3px; background: rgba(255,255,255,0.55);
  box-shadow: 0 -7px 0 rgba(255,255,255,0.32), 0 -14px 0 rgba(255,255,255,0.2); }
.mast-txt { flex: 1; min-width: 220px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.eyebrow::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 0 0 rgba(91,84,236,0.5); animation: ping 2.4s infinite; }
@keyframes ping { 0%{box-shadow:0 0 0 0 rgba(91,84,236,0.45)} 70%{box-shadow:0 0 0 7px rgba(91,84,236,0)} 100%{box-shadow:0 0 0 0 rgba(91,84,236,0)} }
h1 { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5.4vw, 46px);
  letter-spacing: -0.03em; margin: 12px 0 0; line-height: 1.02; }
.lede { color: var(--mut); margin: 11px 0 0; font-size: clamp(15px, 2.2vw, 16.5px); max-width: 52ch; line-height: 1.55; }
.subscribe { flex: none; display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
  font: 600 13.5px var(--body); color: #fff; padding: 11px 17px 11px 14px; border: 0;
  border-radius: 999px; background: linear-gradient(150deg, var(--accent), #7a6ff5);
  box-shadow: 0 10px 24px -10px rgba(91,84,236,0.85); transition: transform .18s ease, box-shadow .18s ease; }
.subscribe:hover { transform: translateY(-1px); box-shadow: 0 16px 30px -12px rgba(91,84,236,0.9); }
.subscribe:active { transform: translateY(0); }
.subscribe svg { width: 16px; height: 16px; }
.subscribe.subbed { background: var(--new-bg); color: var(--new); box-shadow: none; }

/* ===== filter bar (sticky) ===== */
.filters { position: sticky; top: 0; z-index: 30; margin: clamp(26px, 4vw, 38px) 0 4px;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  /* Frosted glass: a translucent fill low enough that the blurred content
     folding under the bar reads as soft frost (not solid cream) while still
     hiding the sharp text. */
  padding: 13px 0 15px;
  background: rgba(251, 251, 250, 0.6);
  -webkit-backdrop-filter: saturate(1.4) blur(14px); backdrop-filter: saturate(1.4) blur(14px); }
.seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px;
  background: var(--panel); border: 1px solid var(--line-2); box-shadow: 0 2px 8px -6px rgba(20,24,29,0.25); }
.seg button { border: 0; background: transparent; cursor: pointer; color: var(--mut);
  font: 600 13px var(--body); padding: 7px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 7px;
  transition: color .16s ease, background .16s ease; }
.seg button:hover { color: var(--ink); }
.seg button.on { color: var(--ink); background: var(--accent-soft); box-shadow: inset 0 0 0 1px rgba(91,84,236,0.18); }
.seg button .ct { font-variant-numeric: tabular-nums; font-size: 11px; font-weight: 700; color: var(--faint);
  background: #f1f2f6; border-radius: 999px; padding: 1px 6px; min-width: 18px; text-align: center; }
.seg button.on .ct { color: var(--accent); background: #fff; }
.seg button.f-new.on { background: var(--new-bg); box-shadow: inset 0 0 0 1px rgba(15,157,107,0.22); }
.seg button.f-imp.on { background: var(--imp-bg); box-shadow: inset 0 0 0 1px rgba(37,99,235,0.22); }
.seg button.f-fix.on { background: var(--fix-bg); box-shadow: inset 0 0 0 1px rgba(192,130,12,0.28); }
.seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.filters .spacer { flex: 1; }
.count-note { font-size: 12.5px; color: var(--faint); font-weight: 500; }
.count-note .num { color: var(--mut); font-weight: 700; }

/* ===== timeline ===== */
.feed { position: relative; margin-top: 8px; }
/* the continuous spine */
.feed::before { content: ''; position: absolute; top: 6px; bottom: 0;
  left: calc(var(--rail) - 1px); width: 2px;
  background: linear-gradient(var(--line-2), var(--line-2) 86%, transparent); }

/* The month divider is the second sticky layer (just under the filter bar); it
   gets the SAME frost so content folding under "June 2026" and its ruler blurs
   too, instead of sliding sharply beneath it. */
.month { position: sticky; top: 52px; z-index: 20; display: flex; align-items: center; gap: 12px;
  padding: 14px 0 13px; margin-left: 0;
  background: rgba(251, 251, 250, 0.6);
  -webkit-backdrop-filter: saturate(1.4) blur(14px); backdrop-filter: saturate(1.4) blur(14px); }
.month h2 { font-family: var(--display); font-weight: 600; font-size: 15px; letter-spacing: 0.02em;
  color: var(--ink); margin: 0; padding-right: 12px; white-space: nowrap; }
.month .yr { color: var(--faint); font-weight: 500; }
.month .ruler { flex: 1; height: 1px; background: var(--line); }

.entry { position: relative; display: grid; grid-template-columns: var(--rail) 1fr; gap: 0;
  padding-bottom: 30px; }
/* node on the spine */
.entry::before { content: ''; position: absolute; left: calc(var(--rail) - 6px); top: 9px;
  width: 12px; height: 12px; border-radius: 50%; background: var(--panel);
  border: 2px solid var(--accent); box-shadow: 0 0 0 4px var(--bg); z-index: 2; }
.entry.is-new::before { border-color: var(--new); }
.entry.is-imp::before { border-color: var(--imp); }
.entry.is-fix::before { border-color: var(--fix); }

.rail { padding-right: 26px; text-align: right; padding-top: 4px; }
.ver { font-family: var(--display); font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums; color: var(--ink); display: inline-block;
  padding: 3px 9px; border-radius: 8px; background: var(--panel); border: 1px solid var(--line-2); }
.date { display: block; margin-top: 8px; font-size: 12.5px; color: var(--mut);
  font-variant-numeric: tabular-nums; }
.ago { display: block; margin-top: 3px; font-size: 11.5px; color: var(--faint); }

.card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
  padding: clamp(16px, 2.4vw, 22px); box-shadow: 0 1px 0 rgba(20,24,29,0.02), 0 12px 30px -22px rgba(20,24,29,0.3);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 1px 0 rgba(20,24,29,0.02), 0 22px 44px -26px rgba(20,24,29,0.32); border-color: var(--line-2); }
.card h3 { font-family: var(--display); font-weight: 600; font-size: clamp(17px, 2.6vw, 20px);
  letter-spacing: -0.015em; margin: 0; line-height: 1.18; }
.tagrow { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 11px; }
.tag { font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 7px; display: inline-flex; align-items: center; gap: 5px; }
.tag::before { content: ''; width: 6px; height: 6px; border-radius: 2px; }
.tag.new { color: var(--new); background: var(--new-bg); } .tag.new::before { background: var(--new); }
.tag.imp { color: var(--imp); background: var(--imp-bg); } .tag.imp::before { background: var(--imp); }
.tag.fix { color: var(--fix); background: var(--fix-bg); } .tag.fix::before { background: var(--fix); }

.notes { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 9px; }
.notes li { position: relative; padding-left: 22px; color: #3b414d; font-size: 14.5px; line-height: 1.5; }
.notes li::before { content: ''; position: absolute; left: 4px; top: 9px; width: 6px; height: 6px;
  border-radius: 50%; border: 1.5px solid var(--accent); }
.notes li.n-new::before { border-color: var(--new); }
.notes li.n-imp::before { border-color: var(--imp); }
.notes li.n-fix::before { border-color: var(--fix); }
.notes li b { color: var(--ink); font-weight: 600; }
.notes code { font: 600 12.5px var(--display); background: #f3f3f7; color: var(--accent);
  padding: 1px 6px; border-radius: 5px; }

/* highlight visual area */
.shot { margin-top: 16px; border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden;
  background: linear-gradient(160deg, #f8f8fc, #f1f1f7); }
.shot svg { display: block; width: 100%; height: auto; }

/* faux UI snippet (command palette) */
.snip { margin-top: 16px; border: 1px solid var(--line-2); border-radius: 12px; overflow: hidden;
  background: linear-gradient(180deg, #fdfdff, #f5f5fb); box-shadow: inset 0 1px 0 #fff; }
.snip-bar { display: flex; align-items: center; gap: 8px; padding: 10px 13px; border-bottom: 1px solid var(--line); }
.snip-bar svg { width: 15px; height: 15px; color: var(--faint); flex: none; }
.snip-q { font: 500 13px var(--body); color: var(--mut); }
.snip-q .cur { display: inline-block; width: 1.5px; height: 14px; background: var(--accent);
  vertical-align: -2px; margin-left: 1px; animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.snip ul { list-style: none; margin: 0; padding: 6px; }
.snip li { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px;
  font: 500 13px var(--body); color: #3b414d; }
.snip li.sel { background: var(--accent-soft); color: var(--ink); }
.snip li .ic { width: 22px; height: 22px; border-radius: 6px; flex: none; display: grid; place-items: center;
  background: #fff; border: 1px solid var(--line-2); font-size: 12px; }
.snip li .kbd { margin-left: auto; font: 600 11px var(--display); color: var(--faint);
  border: 1px solid var(--line-2); border-radius: 5px; padding: 1px 6px; background: #fff; font-variant-numeric: tabular-nums; }

.hidden { display: none !important; }
.dim { opacity: 0.32; filter: saturate(0.4); pointer-events: none; }

/* reveal motion (keyed off renderer's .reveal.in) */
.entry.reveal .card, .entry.reveal .rail { opacity: 0; transform: translateY(14px); }
.entry.reveal.in .card { opacity: 1; transform: none; transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1); }
.entry.reveal.in .rail { opacity: 1; transform: none; transition: opacity .6s ease .05s, transform .6s ease .05s; }

/* ===== load more / caught up ===== */
.more-wrap { display: grid; place-items: center; padding-top: 8px; }
.loadmore { font: 600 13.5px var(--body); color: var(--ink); cursor: pointer;
  background: var(--panel); border: 1px solid var(--line-2); border-radius: 999px;
  padding: 11px 22px; box-shadow: 0 6px 18px -12px rgba(20,24,29,0.4); transition: transform .16s ease, border-color .16s ease; }
.loadmore:hover { transform: translateY(-1px); border-color: var(--accent); }
.loadmore:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.loadmore .num { color: var(--faint); font-weight: 600; }

.caught { display: none; flex-direction: column; align-items: center; text-align: center; gap: 10px;
  padding: 26px 0 4px; }
.caught.show { display: flex; }
.caught .badge { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center;
  background: var(--new-bg); color: var(--new); }
.caught .badge svg { width: 24px; height: 24px; }
.caught .badge { animation: pop .5s cubic-bezier(.18,1.4,.4,1) both; }
@keyframes pop { from { transform: scale(.4); opacity: 0; } }
.caught strong { font-family: var(--display); font-weight: 600; font-size: 17px; letter-spacing: -0.01em; }
.caught span { color: var(--mut); font-size: 13.5px; }

.empty { display: none; text-align: center; color: var(--mut); padding: 40px 0; font-size: 14.5px; }
.empty.show { display: block; }

footer { margin-top: 46px; padding-top: 22px; border-top: 1px solid var(--line);
  display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; color: var(--faint); font-size: 12.5px; }
footer a { color: var(--mut); text-decoration: none; font-weight: 500; }
footer a:hover { color: var(--accent); }
footer .spacer { flex: 1; }

/* ===== responsive: rail collapses ABOVE the card ===== */
@media (max-width: 720px) {
  :root { --rail: 0px; }
  .feed::before { left: 7px; }
  .month { top: 64px; }
  .entry { grid-template-columns: 1fr; padding-left: 26px; padding-bottom: 26px; }
  .entry::before { left: 1px; top: 6px; }
  .rail { text-align: left; padding: 0 0 11px; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .date { display: inline; margin: 0; }
  .ago { display: inline; margin: 0 0 0 8px; }
  .month h2 { font-size: 14px; }
}
@media (max-width: 480px) {
  .masthead { gap: 14px; }
  .subscribe { order: 3; }
  .seg button { padding: 7px 11px; }
  .filters { gap: 8px; }
}
`.trim()

const HTML = `
<div class="wrap">
  <header class="masthead reveal" data-reveal="none">
    <span class="glyph" aria-hidden="true"></span>
    <div class="mast-txt">
      <span class="eyebrow">Changelog</span>
      <h1>What&rsquo;s new in Halcyon</h1>
      <p class="lede">Every shipped improvement to the workspace &mdash; new features, refinements, and fixes. Updated as we release. Read the highlights below.</p>
    </div>
    <button class="subscribe" id="subBtn" type="button" aria-pressed="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      <span class="sub-label">Subscribe to updates</span>
    </button>
  </header>

  <nav class="filters reveal" data-reveal="none" aria-label="Filter releases">
    <div class="seg" role="tablist">
      <button class="f-all on" data-f="all" role="tab" aria-selected="true">All <span class="ct num">7</span></button>
      <button class="f-new" data-f="new" role="tab" aria-selected="false">New <span class="ct num">3</span></button>
      <button class="f-imp" data-f="imp" role="tab" aria-selected="false">Improved <span class="ct num">3</span></button>
      <button class="f-fix" data-f="fix" role="tab" aria-selected="false">Fixed <span class="ct num">2</span></button>
    </div>
    <span class="spacer"></span>
    <span class="count-note"><span class="num" id="showing">7</span> releases</span>
  </nav>

  <div class="feed" id="feed">

    <!-- ===== JUNE ===== -->
    <div class="month" data-month="0"><h2>June <span class="yr">2026</span></h2><span class="ruler"></span></div>

    <article class="entry is-new reveal" data-cat="new" data-month="0">
      <div class="rail">
        <span class="ver num">v3.2.0</span>
        <span class="date num">Jun 24, 2026</span>
        <span class="ago">6 days ago</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag new">New</span></div>
        <h3>Command palette, everywhere</h3>
        <p class="lede" style="margin:9px 0 0;font-size:14.5px;color:var(--mut)">Jump to any project, doc, or action without leaving the keyboard.</p>
        <div class="snip" aria-hidden="true">
          <div class="snip-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <span class="snip-q">Create new<span class="cur"></span></span>
          </div>
          <ul>
            <li class="sel"><span class="ic">&#9998;</span> Create new document <span class="kbd">&crarr;</span></li>
            <li><span class="ic">&#128193;</span> New project &mdash; from template <span class="kbd">&#8984;N</span></li>
            <li><span class="ic">&#128101;</span> Invite teammate <span class="kbd">&#8984;I</span></li>
          </ul>
        </div>
        <ul class="notes">
          <li class="n-new">Open it anywhere with <code>&#8984;K</code> &mdash; fuzzy search across projects, docs, people, and 40+ actions.</li>
          <li class="n-new">Recent and frequent items surface first, so the thing you want is usually one keystroke away.</li>
          <li class="n-new">Arrow-key navigation, scoped search (type <code>&gt;</code> for actions), and full screen-reader labels.</li>
        </ul>
      </div>
    </article>

    <article class="entry is-imp reveal" data-cat="imp" data-month="0">
      <div class="rail">
        <span class="ver num">v3.1.4</span>
        <span class="date num">Jun 17, 2026</span>
        <span class="ago">13 days ago</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag imp">Improved</span></div>
        <h3>Boards load 3&times; faster</h3>
        <ul class="notes">
          <li class="n-imp"><b>Virtualized rendering</b> &mdash; large boards now paint only what&rsquo;s on screen. A 2,000-card board opens in under 400ms.</li>
          <li class="n-imp">Drag-and-drop is smoother on touch trackpads, with momentum and snap-to-column.</li>
          <li class="n-imp">Filters and grouping now persist per board instead of resetting on reload.</li>
        </ul>
        <div class="shot" aria-hidden="true">
          <svg viewBox="0 0 600 132" preserveAspectRatio="none" role="img">
            <defs>
              <linearGradient id="barG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#7aa2ff"/></linearGradient>
            </defs>
            <text x="20" y="34" fill="#9aa0ad" font-family="var(--body)" font-size="11" font-weight="600">BEFORE</text>
            <rect x="20" y="42" width="540" height="14" rx="7" fill="#e7e9f0"/>
            <rect x="20" y="42" width="540" height="14" rx="7" fill="#cdd2e0"/>
            <text x="566" y="53" text-anchor="end" fill="#6b7180" font-family="var(--display)" font-size="12" font-weight="600">1.2s</text>
            <text x="20" y="86" fill="#2563eb" font-family="var(--body)" font-size="11" font-weight="700">AFTER</text>
            <rect x="20" y="94" width="540" height="14" rx="7" fill="#e8f0ff"/>
            <rect x="20" y="94" width="180" height="14" rx="7" fill="url(#barG)"/>
            <text x="566" y="105" text-anchor="end" fill="#2563eb" font-family="var(--display)" font-size="12" font-weight="700">0.38s</text>
          </svg>
        </div>
      </div>
    </article>

    <article class="entry is-fix reveal" data-cat="fix" data-month="0">
      <div class="rail">
        <span class="ver num">v3.1.3</span>
        <span class="date num">Jun 9, 2026</span>
        <span class="ago">21 days ago</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag fix">Fixed</span></div>
        <h3>Maintenance &amp; reliability</h3>
        <ul class="notes">
          <li class="n-fix">Fixed a race condition where rapidly toggling a checklist item could revert the change on slow connections.</li>
          <li class="n-fix">Resolved a CSV export that mis-escaped commas inside quoted fields.</li>
          <li class="n-fix">Dark-mode contrast on disabled buttons now meets WCAG AA.</li>
          <li class="n-fix">Timezone labels no longer drift by an hour around DST boundaries.</li>
        </ul>
      </div>
    </article>

    <!-- ===== MAY ===== -->
    <div class="month" data-month="1"><h2>May <span class="yr">2026</span></h2><span class="ruler"></span></div>

    <article class="entry is-new reveal" data-cat="new" data-month="1">
      <div class="rail">
        <span class="ver num">v3.1.0</span>
        <span class="date num">May 28, 2026</span>
        <span class="ago">May</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag new">New</span></div>
        <h3>Insights, built in</h3>
        <p class="lede" style="margin:9px 0 0;font-size:14.5px;color:var(--mut)">A live pulse on throughput, cycle time, and where work piles up.</p>
        <div class="shot" aria-hidden="true">
          <svg viewBox="0 0 600 150" role="img">
            <defs>
              <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f9d6b" stop-opacity="0.28"/><stop offset="1" stop-color="#0f9d6b" stop-opacity="0"/></linearGradient>
            </defs>
            <line x1="20" y1="38" x2="580" y2="38" stroke="#ececf1"/>
            <line x1="20" y1="78" x2="580" y2="78" stroke="#ececf1"/>
            <line x1="20" y1="118" x2="580" y2="118" stroke="#ececf1"/>
            <path d="M20,108 C90,96 130,104 190,80 C250,56 300,86 360,66 C420,46 470,58 520,36 C545,26 565,30 580,24 L580,128 L20,128 Z" fill="url(#area)"/>
            <path d="M20,108 C90,96 130,104 190,80 C250,56 300,86 360,66 C420,46 470,58 520,36 C545,26 565,30 580,24" fill="none" stroke="#0f9d6b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="580" cy="24" r="4" fill="#0f9d6b"/>
            <text x="20" y="146" fill="#9aa0ad" font-family="var(--body)" font-size="11">Week 1</text>
            <text x="580" y="146" text-anchor="end" fill="#0f9d6b" font-family="var(--display)" font-size="11" font-weight="700">+42%</text>
          </svg>
        </div>
        <ul class="notes">
          <li class="n-new">A new <b>Insights</b> tab charts completed work, average cycle time, and bottlenecks &mdash; no setup required.</li>
          <li class="n-new">Slice by assignee, label, or project, and export any view as a shareable snapshot.</li>
        </ul>
      </div>
    </article>

    <article class="entry is-imp reveal" data-cat="imp" data-month="1">
      <div class="rail">
        <span class="ver num">v3.0.6</span>
        <span class="date num">May 14, 2026</span>
        <span class="ago">May</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag imp">Improved</span></div>
        <h3>Search that actually finds it</h3>
        <ul class="notes">
          <li class="n-imp">Rebuilt the index for <b>typo-tolerant, ranked</b> results &mdash; matches in titles now outrank body mentions.</li>
          <li class="n-imp">Added operators: <code>in:project</code>, <code>from:@me</code>, <code>is:open</code>, and date ranges like <code>after:may-1</code>.</li>
          <li class="n-imp">Results stream in as you type, usually within 50ms.</li>
        </ul>
      </div>
    </article>

    <!-- ===== entries below the fold (revealed by Load more) ===== -->

    <article class="entry is-fix reveal more-hidden hidden" data-cat="fix" data-month="1">
      <div class="rail">
        <span class="ver num">v3.0.5</span>
        <span class="date num">May 6, 2026</span>
        <span class="ago">May</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag fix">Fixed</span></div>
        <h3>Notifications &amp; sync fixes</h3>
        <ul class="notes">
          <li class="n-fix">Mentions in comments now reliably trigger a notification, even inside collapsed threads.</li>
          <li class="n-fix">Offline edits no longer occasionally duplicate when reconnecting.</li>
          <li class="n-fix">The unread badge clears immediately instead of on next refresh.</li>
        </ul>
      </div>
    </article>

    <!-- ===== APRIL ===== -->
    <div class="month more-hidden hidden" data-month="2"><h2>April <span class="yr">2026</span></h2><span class="ruler"></span></div>

    <article class="entry is-new reveal more-hidden hidden" data-cat="new" data-month="2">
      <div class="rail">
        <span class="ver num">v3.0.0</span>
        <span class="date num">Apr 22, 2026</span>
        <span class="ago">April</span>
      </div>
      <div class="card">
        <div class="tagrow"><span class="tag new">New</span><span class="tag imp">Improved</span></div>
        <h3>Halcyon 3.0 &mdash; a calmer workspace</h3>
        <ul class="notes">
          <li class="n-new"><b>Redesigned shell</b> with a quieter sidebar, themeable accent, and a focus mode that hides everything but the work.</li>
          <li class="n-new">Real-time multiplayer cursors and presence across docs and boards.</li>
          <li class="n-imp">Cut the initial bundle by 38% &mdash; first paint is noticeably snappier on mid-range laptops.</li>
        </ul>
      </div>
    </article>

  </div>

  <div class="more-wrap">
    <button class="loadmore" id="loadMore" type="button">Load older releases <span class="num">(2)</span></button>
  </div>

  <div class="caught" id="caught">
    <span class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
    <strong>You&rsquo;re all caught up</strong>
    <span>That&rsquo;s every release so far. Subscribe above to get the next one in your inbox.</span>
  </div>

  <p class="empty" id="empty">No releases match this filter.</p>

  <footer>
    <span>Halcyon &mdash; build log</span>
    <span class="spacer"></span>
    <a href="#">RSS</a>
    <a href="#">Status</a>
    <a href="#">Docs</a>
  </footer>
</div>
`.trim()

const JS = `
(function () {
  var feed = document.getElementById('feed');
  if (!feed) return;
  var entries = Array.prototype.slice.call(feed.querySelectorAll('.entry'));
  var months = Array.prototype.slice.call(feed.querySelectorAll('.month'));
  var segButtons = Array.prototype.slice.call(document.querySelectorAll('.seg button'));
  var showingEl = document.getElementById('showing');
  var emptyEl = document.getElementById('empty');
  var caughtEl = document.getElementById('caught');
  var loadMore = document.getElementById('loadMore');
  var moreWrap = loadMore ? loadMore.parentElement : null;
  var current = 'all';

  // ----- subscribe pill (visual toggle) -----
  var subBtn = document.getElementById('subBtn');
  if (subBtn) {
    subBtn.addEventListener('click', function () {
      var on = subBtn.classList.toggle('subbed');
      subBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var label = subBtn.querySelector('.sub-label');
      if (label) label.textContent = on ? 'Subscribed' : 'Subscribe to updates';
    });
  }

  // ----- helpers -----
  function isExpanded() { return !feed.querySelector('.more-hidden.hidden'); }

  // Hide a month header whose visible entries are all filtered/collapsed out.
  function syncMonths() {
    months.forEach(function (m) {
      var key = m.getAttribute('data-month');
      var anyVisible = entries.some(function (e) {
        return e.getAttribute('data-month') === key && !e.classList.contains('hidden');
      });
      m.classList.toggle('hidden', !anyVisible);
    });
  }

  function apply() {
    var shown = 0;
    entries.forEach(function (e) {
      var matchesFilter = current === 'all' || e.getAttribute('data-cat') === current;
      // an entry below the fold stays collapsed until Load more (unless filtering hides it anyway)
      var collapsed = e.classList.contains('more-hidden') && !isExpanded();
      var visible = matchesFilter && !collapsed;
      e.classList.toggle('hidden', !visible);
      if (visible) shown++;
    });
    syncMonths();

    if (showingEl) showingEl.textContent = String(shown);
    if (emptyEl) emptyEl.classList.toggle('show', shown === 0);

    // load-more vs caught-up: only meaningful while viewing "all"
    var hasCollapsed = !isExpanded();
    if (moreWrap) moreWrap.style.display = (current === 'all' && hasCollapsed) ? '' : 'none';
    if (caughtEl) caughtEl.classList.toggle('show', shown > 0 && !hasCollapsed);
  }

  // ----- filter row -----
  segButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      current = b.getAttribute('data-f');
      segButtons.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      apply();
    });
  });

  // ----- load more -----
  if (loadMore) {
    loadMore.addEventListener('click', function () {
      feed.querySelectorAll('.more-hidden').forEach(function (el) {
        el.classList.remove('more-hidden');
        el.classList.remove('hidden');
      });
      // let the renderer's reveal observer pick up the newly shown entries
      apply();
    });
  }

  apply();
})();
`.trim()

export const changelog: Template = {
  id: 'changelog',
  kind: 'page',
  name: 'Changelog',
  tagline: 'A scannable product changelog timeline',
  categories: ['Writing'],
  audiences: ['product', 'startup', 'developer'],
  description:
    'A polished product changelog / release-notes page: a vertical timeline grouped by month with sticky markers, version badges and tabular dates on a left rail, and cards carrying colored category tags (New, Improved, Fixed), bullet notes, and occasional generative SVG highlight graphics. The filter row, load-more reveal, and "all caught up" end state are all live JS. Pure CSS/SVG, fully responsive, no imagery — swap in your own releases.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#fbfbfa',
  notes:
    'Each release is an `<article class="entry is-new|is-imp|is-fix" data-cat="new|imp|fix" data-month="N">` with two columns: a `.rail` (version badge `.ver`, `.date`, `.ago`) and a `.card`. To add a release, copy an `.entry`, set its `data-cat` and the matching `is-*` class (these drive the timeline node color), give it the same `data-month` as its month header, and bump the filter counts in the `.seg` buttons + the `#showing` figure. Month dividers are `<div class="month" data-month="N">`. Anything tagged `more-hidden hidden` stays collapsed behind the Load-more button — remove those classes to surface it by default. Palette knobs live in `:root`: `--accent` (the indigo focal) plus the three tag pairs `--new/--new-bg`, `--imp/--imp-bg`, `--fix/--fix-bg`. The rail width is `--rail`; below 720px it collapses above each card. Keep every figure/version/date `.num` (tabular). Highlight visuals are inline SVG (`.shot`) or the faux command-palette snippet (`.snip`) — optional per entry.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#fbfbfa',
  },
}
