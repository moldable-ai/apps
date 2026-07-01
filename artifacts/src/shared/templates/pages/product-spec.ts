import type { Template } from '../types'

// A light "paper" product-spec / PRD document page. Editorial documentation feel
// (Linear/Notion doc, but more designed): a sticky left-sidebar table of contents
// with its own IntersectionObserver scrollspy (in page.js, separate from the
// provided reveal observer), status + priority chips, a requirements table, a
// numbered user flow, a vertical milestone timeline, success-metric cards, and
// open-question callouts. Pure CSS/SVG — no imagery.

const CSS = `
:root {
  --paper: #ffffff;
  --paper-2: #f7f7f5;
  --paper-3: #f1f1ee;
  --ink: #1c1d22;
  --ink-2: #4a4d57;
  --mut: #82858f;
  --faint: #b6b8bf;
  --line: #e7e7e3;
  --line-2: #efefec;
  --accent: #5b5bd6;        /* calm indigo */
  --accent-soft: #ececfb;
  --accent-ink: #3d3db8;
  --teal: #0e8a72;
  --teal-soft: #dff3ee;
  --amber: #b5730a;
  --amber-soft: #fbf0db;
  --rose: #c2334a;
  --rose-soft: #fbe6ea;
  --display: 'Newsreader', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, monospace;
  --page-font: var(--body);
}
body { background: var(--paper); color: var(--ink); line-height: 1.6; }
.num { font-variant-numeric: tabular-nums; }

/* ---- shell: sticky sidebar + doc column ---- */
.shell { max-width: 1180px; margin: 0 auto; padding: clamp(28px, 5vw, 64px) clamp(18px, 4vw, 44px) 120px; }
.layout { display: grid; grid-template-columns: 232px 1fr; gap: clamp(34px, 5vw, 72px); align-items: start; }

/* ---- table of contents (sticky, scrollspy) ---- */
.toc { position: sticky; top: 30px; align-self: start; }
.toc .eyebrow { font: 600 11px var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--mut); margin: 0 0 14px; padding-left: 14px; }
.toc ol { list-style: none; margin: 0; padding: 0; counter-reset: toc; }
.toc li { counter-increment: toc; }
.toc a {
  display: flex; align-items: baseline; gap: 11px;
  padding: 7px 12px 7px 14px; border-left: 2px solid var(--line);
  color: var(--mut); font-size: 13.5px; font-weight: 500; line-height: 1.4;
  transition: color 0.22s ease, border-color 0.22s ease, background 0.22s ease;
  position: relative;
}
.toc a::before { content: counter(toc, decimal-leading-zero); font: 600 10.5px var(--mono); color: var(--faint); transition: color 0.22s ease; min-width: 16px; }
.toc a:hover { color: var(--ink-2); background: var(--paper-2); }
.toc a.active { color: var(--accent-ink); border-left-color: var(--accent); font-weight: 600; }
.toc a.active::before { color: var(--accent); }
.toc .meta { margin-top: 22px; padding: 14px; border-radius: 12px; background: var(--paper-2); border: 1px solid var(--line); }
.toc .meta .k { font: 600 10px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--mut); }
.toc .meta .v { font-size: 13px; font-weight: 600; color: var(--ink); margin-top: 3px; }
.toc .meta .v.num { font-variant-numeric: tabular-nums; }
.toc .meta .row + .row { margin-top: 11px; }

/* ---- document column ---- */
.doc { min-width: 0; max-width: 760px; }

/* document header */
.kicker { display: inline-flex; align-items: center; gap: 9px; font: 600 11.5px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.kicker::before { content: ''; width: 22px; height: 1.5px; background: var(--accent); display: inline-block; }
.doc h1 { font-family: var(--display); font-weight: 500; font-size: clamp(34px, 5.4vw, 54px); line-height: 1.04; letter-spacing: -0.015em; margin: 16px 0 0; color: var(--ink); }
.doc h1 .em { font-style: italic; color: var(--accent-ink); }
.lede { font-size: clamp(16px, 2.2vw, 19px); color: var(--ink-2); margin: 16px 0 0; max-width: 60ch; line-height: 1.55; }

/* header meta strip: status pill, owners, updated, version */
.metabar { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 22px; margin-top: 26px; padding-bottom: 26px; border-bottom: 1px solid var(--line); }
.pill { display: inline-flex; align-items: center; gap: 8px; font: 600 12.5px var(--body); padding: 6px 13px; border-radius: 999px; letter-spacing: 0.01em; }
.pill::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pill.review { color: var(--amber); background: var(--amber-soft); }
.pill.review::before { box-shadow: 0 0 0 0 currentColor; animation: blip 2.4s infinite; }
@keyframes blip { 0%{box-shadow:0 0 0 0 rgba(181,115,10,0.45)} 70%{box-shadow:0 0 0 6px rgba(181,115,10,0)} 100%{box-shadow:0 0 0 0 rgba(181,115,10,0)} }
.owners { display: inline-flex; align-items: center; }
.avatar {
  width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
  font: 700 11px var(--body); color: #fff; border: 2px solid var(--paper); margin-left: -8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.12);
}
.avatar:first-child { margin-left: 0; }
.avatar.a1 { background: linear-gradient(140deg, #6d6df0, #4646c4); }
.avatar.a2 { background: linear-gradient(140deg, #14a98c, #0c7d66); }
.avatar.a3 { background: linear-gradient(140deg, #e08641, #c25f1f); }
.metafact { display: inline-flex; flex-direction: column; gap: 1px; }
.metafact .k { font: 600 10px var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--mut); }
.metafact .v { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.metafact .v.num { font-variant-numeric: tabular-nums; }

/* at-a-glance summary box */
.tldr { margin-top: 30px; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: var(--paper-2); }
.tldr .top { padding: 20px 24px; border-bottom: 1px solid var(--line); }
.tldr .tag { font: 600 10.5px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.tldr .top p { margin: 8px 0 0; font-size: 15.5px; color: var(--ink); line-height: 1.55; }
.tldr .facts { display: grid; grid-template-columns: repeat(2, 1fr); }
.tldr .fact { padding: 16px 24px; border-top: 0; }
.tldr .fact:nth-child(odd) { border-right: 1px solid var(--line); }
.tldr .fact:nth-child(n+3) { border-top: 1px solid var(--line); }
.tldr .fact .k { font: 600 10px var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--mut); }
.tldr .fact .v { font-size: 14.5px; font-weight: 600; color: var(--ink); margin-top: 4px; line-height: 1.4; }

/* ---- sections ---- */
.section { padding-top: 56px; scroll-margin-top: 24px; }
.section h2 { font-family: var(--display); font-weight: 500; font-size: clamp(23px, 3vw, 30px); letter-spacing: -0.01em; margin: 0; color: var(--ink); display: flex; align-items: baseline; gap: 12px; }
.section h2 .no { font: 600 12px var(--mono); color: var(--accent); letter-spacing: 0.04em; }
.section > p { font-size: 15.5px; color: var(--ink-2); margin: 14px 0 0; line-height: 1.62; }
.section > p + p { margin-top: 12px; }
.section h3 { font-size: 14px; font-weight: 700; letter-spacing: 0.01em; color: var(--ink); margin: 26px 0 12px; }
.hair { height: 1px; background: var(--line); border: 0; margin: 0; }

/* goals / non-goals two-column */
.gng { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 18px; }
.gcard { border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; background: var(--paper); }
.gcard .htitle { display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink); margin-bottom: 4px; }
.gcard ul { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.gcard li { display: flex; gap: 11px; align-items: flex-start; font-size: 14.5px; color: var(--ink-2); line-height: 1.45; }
.gcard li .mk { flex: none; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; margin-top: 1px; }
.gcard.goals .mk { background: var(--teal-soft); color: var(--teal); }
.gcard.nongoals .mk { background: var(--rose-soft); color: var(--rose); }
.gcard .mk svg { width: 12px; height: 12px; }

/* requirements table */
.table-wrap { margin-top: 18px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl thead th { text-align: left; font: 700 10.5px var(--mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--mut); padding: 13px 16px; background: var(--paper-2); border-bottom: 1px solid var(--line); }
.tbl tbody td { padding: 15px 16px; border-bottom: 1px solid var(--line-2); color: var(--ink); vertical-align: top; line-height: 1.45; }
.tbl tbody tr:last-child td { border-bottom: 0; }
.tbl tbody tr:hover td { background: var(--paper-2); }
.tbl .id { font: 600 12px var(--mono); color: var(--mut); white-space: nowrap; }
.tbl .desc { color: var(--ink-2); }
.tbl .desc b { color: var(--ink); font-weight: 600; }
.tbl .c { text-align: center; white-space: nowrap; }

/* priority + status chips */
.chip { display: inline-flex; align-items: center; gap: 6px; font: 700 11px var(--body); padding: 4px 10px; border-radius: 7px; letter-spacing: 0.01em; white-space: nowrap; }
.chip.p0 { color: var(--rose); background: var(--rose-soft); }
.chip.p1 { color: var(--amber); background: var(--amber-soft); }
.chip.p2 { color: var(--ink-2); background: var(--paper-3); }
.chip.st { font-weight: 600; }
.chip.st::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.chip.done { color: var(--teal); background: var(--teal-soft); }
.chip.prog { color: var(--accent-ink); background: var(--accent-soft); }
.chip.todo { color: var(--mut); background: var(--paper-3); }

/* user flow numbered steps */
.flow { list-style: none; margin: 22px 0 0; padding: 0; counter-reset: fl; }
.flow li { counter-increment: fl; display: flex; gap: 18px; padding-bottom: 22px; position: relative; }
.flow li::before {
  content: counter(fl); flex: none; width: 34px; height: 34px; border-radius: 10px;
  display: grid; place-items: center; font: 700 14px var(--display); font-style: italic;
  color: var(--accent-ink); background: var(--accent-soft); border: 1px solid #ddddf6;
}
.flow li::after { content: ''; position: absolute; left: 17px; top: 38px; bottom: 4px; width: 1.5px; background: var(--line); }
.flow li:last-child { padding-bottom: 0; }
.flow li:last-child::after { display: none; }
.flow .ft { font-size: 15px; font-weight: 600; color: var(--ink); }
.flow .fd { font-size: 14px; color: var(--ink-2); margin-top: 3px; line-height: 1.5; }
.flow code { font: 600 12.5px var(--mono); background: var(--paper-3); padding: 1px 6px; border-radius: 5px; color: var(--accent-ink); }

/* milestones vertical timeline */
.timeline { margin-top: 22px; position: relative; padding-left: 28px; }
.timeline::before { content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 1.5px; background: var(--line); }
.tl { position: relative; padding-bottom: 26px; }
.tl:last-child { padding-bottom: 0; }
.tl::before { content: ''; position: absolute; left: -28px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: var(--paper); border: 2px solid var(--faint); }
.tl.is-done::before { background: var(--teal); border-color: var(--teal); }
.tl.is-now::before { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.tl .when { font: 600 11.5px var(--mono); letter-spacing: 0.04em; color: var(--mut); }
.tl.is-now .when { color: var(--accent-ink); }
.tl .what { font-size: 15px; font-weight: 600; color: var(--ink); margin-top: 3px; }
.tl .det { font-size: 13.5px; color: var(--ink-2); margin-top: 3px; line-height: 1.5; }

/* success metric cards */
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px; }
.mcard { border: 1px solid var(--line); border-radius: 14px; padding: 20px; background: var(--paper); }
.mcard .ml { font: 600 11px var(--mono); letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
.mcard .mv { font-family: var(--display); font-weight: 500; font-size: 36px; letter-spacing: -0.02em; color: var(--ink); margin: 8px 0 2px; font-variant-numeric: tabular-nums; line-height: 1; }
.mcard .mt { font-size: 12.5px; color: var(--ink-2); }
.mcard .mt b { color: var(--teal); font-weight: 700; }
.mcard .track { height: 6px; border-radius: 4px; background: var(--paper-3); margin-top: 14px; overflow: hidden; }
.mcard .fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent), #8a8af0); width: 0; transition: width 1.3s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .mcard .fill { width: var(--w); }

/* open questions callouts */
.callouts { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
.callout { display: flex; gap: 14px; align-items: flex-start; border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 12px; padding: 16px 18px; background: var(--paper-2); }
.callout .q { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-ink); font: 700 14px var(--display); font-style: italic; }
.callout .body p { margin: 0; font-size: 14.5px; color: var(--ink); font-weight: 600; line-height: 1.45; }
.callout .body .owner { font-size: 12.5px; color: var(--mut); margin-top: 5px; display: flex; align-items: center; gap: 7px; }
.callout .body .owner b { color: var(--ink-2); font-weight: 600; }
.callout.open { border-left-color: var(--amber); }
.callout.open .q { background: var(--amber-soft); color: var(--amber); }

/* footer */
.foot { margin-top: 64px; padding-top: 22px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font-size: 12.5px; color: var(--mut); }
.foot .dot { width: 4px; height: 4px; border-radius: 50%; background: var(--faint); }

/* ---- responsive: sidebar to top, single column ---- */
@media (max-width: 820px) {
  .layout { grid-template-columns: 1fr; gap: 22px; }
  .toc {
    position: static; top: auto;
    background: var(--paper-2); border: 1px solid var(--line); border-radius: 14px; padding: 16px 16px 18px;
  }
  .toc .eyebrow { padding-left: 0; }
  .toc ol { display: flex; flex-wrap: wrap; gap: 6px; }
  .toc li { flex: 0 0 auto; }
  .toc a { border-left: 0; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; background: var(--paper); }
  .toc a.active { border-color: var(--accent); background: var(--accent-soft); }
  .toc .meta { display: none; }
  .doc { max-width: 100%; }
  .gng { grid-template-columns: 1fr; }
  .metrics { grid-template-columns: 1fr; }
  .tldr .facts { grid-template-columns: 1fr; }
  .tldr .fact:nth-child(odd) { border-right: 0; }
  .tldr .fact:nth-child(n+2) { border-top: 1px solid var(--line); }
}
@media (max-width: 540px) {
  .table-wrap { overflow-x: auto; }
  .tbl { min-width: 540px; }
  .metabar { gap: 12px 18px; }
}
`.trim()

const HTML = `
<div class="shell">
  <div class="layout">

    <!-- ===== TABLE OF CONTENTS (sticky, scrollspy) ===== -->
    <aside class="toc" aria-label="Contents">
      <p class="eyebrow">On this page</p>
      <ol id="toc">
        <li><a href="#overview" data-to="overview">Overview &amp; problem</a></li>
        <li><a href="#goals" data-to="goals">Goals &amp; non-goals</a></li>
        <li><a href="#requirements" data-to="requirements">Requirements</a></li>
        <li><a href="#flow" data-to="flow">User flow</a></li>
        <li><a href="#milestones" data-to="milestones">Milestones</a></li>
        <li><a href="#metrics" data-to="metrics">Success metrics</a></li>
        <li><a href="#questions" data-to="questions">Open questions</a></li>
      </ol>
      <div class="meta">
        <div class="row"><div class="k">Status</div><div class="v">In Review</div></div>
        <div class="row"><div class="k">Version</div><div class="v num">v1.3</div></div>
        <div class="row"><div class="k">Target</div><div class="v">Q3 release</div></div>
      </div>
    </aside>

    <!-- ===== DOCUMENT ===== -->
    <article class="doc">

      <header class="reveal" data-reveal="none">
        <span class="kicker">Product spec · PRD</span>
        <h1>Spec: <span class="em">Real-time</span> collaboration</h1>
        <p class="lede">Bring multiple people into the same document at once — live cursors, presence, and conflict-free editing — so teams stop emailing versions and start working together in real time.</p>

        <div class="metabar">
          <span class="pill review">In Review</span>
          <div class="owners" aria-label="Owners">
            <span class="avatar a1" title="Mara Quinn">MQ</span>
            <span class="avatar a2" title="Devon Park">DP</span>
            <span class="avatar a3" title="Sam Iredale">SI</span>
          </div>
          <div class="metafact"><span class="k">Last updated</span><span class="v">Jun 28, 2026</span></div>
          <div class="metafact"><span class="k">Version</span><span class="v num">v1.3</span></div>
          <div class="metafact"><span class="k">Eng lead</span><span class="v">Devon Park</span></div>
        </div>
      </header>

      <!-- TL;DR summary box -->
      <div class="tldr reveal">
        <div class="top">
          <span class="tag">TL;DR</span>
          <p>Add presence and live multiplayer editing to documents using a CRDT sync engine. Targets sub-150ms cursor latency for up to 25 concurrent editors, ships behind a flag in Q3, and is a prerequisite for the upcoming Comments and Suggestions work.</p>
        </div>
        <div class="facts">
          <div class="fact"><div class="k">Effort</div><div class="v">~8 eng-weeks · 2 engineers</div></div>
          <div class="fact"><div class="k">Surface</div><div class="v">Web editor · Desktop app</div></div>
          <div class="fact"><div class="k">Dependencies</div><div class="v">Sync gateway, Auth tokens v2</div></div>
          <div class="fact"><div class="k">Rollout</div><div class="v">Flagged → 5% → GA</div></div>
        </div>
      </div>

      <!-- ===== 1 · OVERVIEW ===== -->
      <section class="section" id="overview">
        <h2><span class="no">01</span> Overview &amp; problem</h2>
        <p>Today a document has exactly one editor at a time. When two people open the same doc, the second sees a read-only banner and has to wait — or worse, they duplicate the file and the two copies silently diverge. Support sees roughly <b>140 "which version is current?"</b> tickets a month, and our largest accounts cite the lack of co-editing as the top reason they keep a second tool around.</p>
        <p>We want editing to feel like everyone is in the same room: you see who else is here, where their cursor is, and every keystroke merges without a "someone else saved" wall. This spec covers the editing surface, the sync layer, and presence — comments and suggestions are explicitly a follow-up (see non-goals).</p>
      </section>

      <hr class="hair" style="margin-top:40px">

      <!-- ===== 2 · GOALS / NON-GOALS ===== -->
      <section class="section" id="goals">
        <h2><span class="no">02</span> Goals &amp; non-goals</h2>
        <div class="gng reveal">
          <div class="gcard goals">
            <div class="htitle"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span> Goals</div>
            <ul>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span> Multiple people edit one document simultaneously with no read-only lock.</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span> Live presence: avatars of who's here and labelled remote cursors.</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span> Conflict-free merges — concurrent edits never lose data.</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span> Graceful offline → reconnect that replays local changes.</li>
            </ul>
          </div>
          <div class="gcard nongoals">
            <div class="htitle"><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span> Non-goals</div>
            <ul>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span> Inline comments &amp; suggestion mode — separate spec, next quarter.</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span> Voice / video calls inside the document.</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span> Real-time collaboration on spreadsheets &amp; boards (doc only for v1).</li>
              <li><span class="mk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span> A full version-history / time-travel UI.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ===== 3 · REQUIREMENTS ===== -->
      <section class="section" id="requirements">
        <h2><span class="no">03</span> Requirements</h2>
        <p>Functional requirements with a priority (P0 must-ship, P1 should-ship, P2 stretch) and current build status.</p>
        <div class="table-wrap reveal">
          <table class="tbl">
            <thead>
              <tr><th>ID</th><th>Requirement</th><th class="c">Priority</th><th class="c">Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="id">REQ-01</td>
                <td class="desc"><b>Live cursors &amp; selections.</b> Each editor sees others' cursors and highlighted ranges, labelled and colour-coded.</td>
                <td class="c"><span class="chip p0">P0</span></td>
                <td class="c"><span class="chip st done">Done</span></td>
              </tr>
              <tr>
                <td class="id">REQ-02</td>
                <td class="desc"><b>CRDT merge engine.</b> Concurrent edits converge deterministically with no lost characters under network reordering.</td>
                <td class="c"><span class="chip p0">P0</span></td>
                <td class="c"><span class="chip st prog">In progress</span></td>
              </tr>
              <tr>
                <td class="id">REQ-03</td>
                <td class="desc"><b>Presence avatars.</b> Header shows who is currently in the document; updates within 1s of join/leave.</td>
                <td class="c"><span class="chip p0">P0</span></td>
                <td class="c"><span class="chip st done">Done</span></td>
              </tr>
              <tr>
                <td class="id">REQ-04</td>
                <td class="desc"><b>Offline replay.</b> Edits made while disconnected queue locally and re-sync on reconnect without conflicts.</td>
                <td class="c"><span class="chip p1">P1</span></td>
                <td class="c"><span class="chip st prog">In progress</span></td>
              </tr>
              <tr>
                <td class="id">REQ-05</td>
                <td class="desc"><b>Follow mode.</b> Click an avatar to track that person's viewport and cursor as they move.</td>
                <td class="c"><span class="chip p2">P2</span></td>
                <td class="c"><span class="chip st todo">Not started</span></td>
              </tr>
              <tr>
                <td class="id">REQ-06</td>
                <td class="desc"><b>Permission-aware sync.</b> Viewers receive updates but cannot broadcast edits; enforced server-side.</td>
                <td class="c"><span class="chip p1">P1</span></td>
                <td class="c"><span class="chip st todo">Not started</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===== 4 · USER FLOW ===== -->
      <section class="section" id="flow">
        <h2><span class="no">04</span> User flow</h2>
        <p>The happy path for a second person joining an open document.</p>
        <ol class="flow reveal">
          <li>
            <div>
              <div class="ft">Open a shared document</div>
              <div class="fd">Mara opens a doc Devon already has open. The client requests a sync session with <code>doc.id</code> and her edit token.</div>
            </div>
          </li>
          <li>
            <div>
              <div class="ft">Join the session &amp; hydrate</div>
              <div class="fd">The gateway streams the current CRDT state; Mara's editor renders it and her avatar appears in Devon's presence bar.</div>
            </div>
          </li>
          <li>
            <div>
              <div class="ft">Edit together live</div>
              <div class="fd">Both type at once. Each keystroke is a CRDT op broadcast to the room; remote cursors and selections render in real time.</div>
            </div>
          </li>
          <li>
            <div>
              <div class="ft">Drop &amp; reconnect</div>
              <div class="fd">Mara's wifi blips. Her edits queue offline; on reconnect the client replays them and the doc reconciles with zero conflicts.</div>
            </div>
          </li>
          <li>
            <div>
              <div class="ft">Leave the document</div>
              <div class="fd">She closes the tab. Her presence clears within a second and the room shrinks to remaining editors.</div>
            </div>
          </li>
        </ol>
      </section>

      <!-- ===== 5 · MILESTONES ===== -->
      <section class="section" id="milestones">
        <h2><span class="no">05</span> Milestones</h2>
        <div class="timeline reveal">
          <div class="tl is-done">
            <div class="when">MAY 12 · Shipped</div>
            <div class="what">Sync gateway &amp; presence prototype</div>
            <div class="det">WebSocket room service plus avatar presence behind an internal flag.</div>
          </div>
          <div class="tl is-done">
            <div class="when">JUN 09 · Shipped</div>
            <div class="what">Live cursors &amp; selections</div>
            <div class="det">Remote cursor rendering, colour assignment, and labelled selections (REQ-01).</div>
          </div>
          <div class="tl is-now">
            <div class="when">JUN 30 · In progress</div>
            <div class="what">CRDT merge engine &amp; offline replay</div>
            <div class="det">Deterministic convergence under reordering; local edit queue on reconnect (REQ-02, REQ-04).</div>
          </div>
          <div class="tl">
            <div class="when">JUL 21 · Planned</div>
            <div class="what">Permission-aware sync &amp; dogfood</div>
            <div class="det">Server-side edit gating, then a company-wide internal rollout for load testing.</div>
          </div>
          <div class="tl">
            <div class="when">AUG 18 · Planned</div>
            <div class="what">Staged GA — 5% → 100%</div>
            <div class="det">Gradual flag ramp with latency &amp; error-rate guardrails before general availability.</div>
          </div>
        </div>
      </section>

      <!-- ===== 6 · SUCCESS METRICS ===== -->
      <section class="section" id="metrics">
        <h2><span class="no">06</span> Success metrics</h2>
        <p>We'll consider real-time collaboration a success if, 60 days after GA, we hit these targets.</p>
        <div class="metrics reveal">
          <div class="mcard">
            <div class="ml">Cursor latency p95</div>
            <div class="mv num">142<span style="font-size:18px;color:var(--mut)">ms</span></div>
            <div class="mt">Target <b>&lt; 150ms</b> · currently 142ms</div>
            <div class="track"><div class="fill" style="--w:88%"></div></div>
          </div>
          <div class="mcard">
            <div class="ml">Multiplayer adoption</div>
            <div class="mv num">—</div>
            <div class="mt">Target <b>35%</b> of active docs co-edited weekly</div>
            <div class="track"><div class="fill" style="--w:35%"></div></div>
          </div>
          <div class="mcard">
            <div class="ml">"Which version" tickets</div>
            <div class="mv num">−70<span style="font-size:18px;color:var(--mut)">%</span></div>
            <div class="mt">Target <b>−60%</b> vs. current 140/mo</div>
            <div class="track"><div class="fill" style="--w:78%"></div></div>
          </div>
        </div>
      </section>

      <!-- ===== 7 · OPEN QUESTIONS ===== -->
      <section class="section" id="questions">
        <h2><span class="no">07</span> Open questions</h2>
        <div class="callouts reveal">
          <div class="callout open">
            <div class="q">?</div>
            <div class="body">
              <p>What is the hard cap on concurrent editors per document before we degrade gracefully?</p>
              <div class="owner">Owner <b>Devon Park</b> · needs load-test data</div>
            </div>
          </div>
          <div class="callout open">
            <div class="q">?</div>
            <div class="body">
              <p>How do we handle a viewer who is granted edit access mid-session — re-handshake, or live upgrade?</p>
              <div class="owner">Owner <b>Sam Iredale</b> · blocked on Auth tokens v2</div>
            </div>
          </div>
          <div class="callout">
            <div class="q">?</div>
            <div class="body">
              <p>Do remote cursor colours need to be deterministic per user across sessions, or can they be ephemeral?</p>
              <div class="owner">Owner <b>Mara Quinn</b> · design to decide</div>
            </div>
          </div>
        </div>

        <div class="foot">
          <span>Spec: Real-time collaboration</span><span class="dot"></span>
          <span class="num">v1.3</span><span class="dot"></span>
          <span>In Review</span><span class="dot"></span>
          <span>Last updated Jun 28, 2026</span>
        </div>
      </section>

    </article>
  </div>
</div>
`.trim()

const JS = `
// Scrollspy: highlight the active TOC link as the corresponding section scrolls
// through the upper part of the viewport. This is the page's OWN IntersectionObserver,
// separate from the renderer's reveal observer.
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('#toc a'));
  if (!links.length) return;

  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('data-to')] = a; });

  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('data-to')); })
    .filter(Boolean);
  if (!sections.length) return;

  function setActive(id) {
    links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-to') === id); });
  }

  // Track how much of each section is on screen; the one nearest the top wins.
  var ratios = {};

  if (!('IntersectionObserver' in window)) {
    setActive(sections[0].id);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      ratios[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0;
    });

    // Pick the visible section whose top is highest on the page (smallest top
    // offset that is still at/above the spy line). Falls back to most-visible.
    var spyLine = window.innerHeight * 0.28;
    var best = null, bestTop = Infinity;
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var rect = s.getBoundingClientRect();
      if (rect.top <= spyLine && rect.bottom > spyLine) {
        if (rect.top < bestTop) { bestTop = rect.top; best = s.id; }
      }
    }
    if (!best) {
      var bestR = -1;
      for (var id in ratios) {
        if (ratios[id] > bestR) { bestR = ratios[id]; best = id; }
      }
    }
    if (best) setActive(best);
  }, {
    threshold: [0, 0.15, 0.4, 0.75, 1],
    rootMargin: '-24% 0px -55% 0px'
  });

  sections.forEach(function (s) { io.observe(s); });

  // Smooth-scroll on click and set the active state immediately for snappiness.
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-to');
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      setActive(id);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      try { history.replaceState(null, '', '#' + id); } catch (err) {}
    });
  });

  // Initial state: respect a hash, else first section.
  var hash = (window.location.hash || '').replace('#', '');
  setActive(byId[hash] ? hash : sections[0].id);
})();
`.trim()

export const productSpec: Template = {
  id: 'product-spec',
  kind: 'page',
  name: 'Product Spec',
  tagline: 'A designed PRD / feature-spec document',
  categories: ['Writing'],
  audiences: ['product', 'design', 'engineering', 'pm'],
  description:
    'A light "paper" product-spec / PRD document with an editorial documentation feel. A sticky left-sidebar table of contents with its own scrollspy (IntersectionObserver) highlights the active section as you scroll; the doc has a status pill, owner avatars, and a TL;DR fact box, then Overview, Goals & Non-goals (checks vs crosses), a Requirements table with P0/P1/P2 + status chips, a numbered user flow, a vertical milestone timeline, success-metric cards, and open-question callouts. Pure CSS/SVG, fully responsive — swap in your own feature.',
  fonts: {
    display: 'Newsreader',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap',
    ],
  },
  stageBg: '#ffffff',
  notes:
    'Light "paper" PRD doc with a calm indigo accent. The sticky sidebar TOC uses its OWN IntersectionObserver scrollspy in page.js (independent of the renderer reveal) — keep section ids and the TOC `data-to` values in sync, and give every <section> the matching id. Priority chips (.chip.p0/.p1/.p2) and status chips (.chip.st.done/.prog/.todo) carry the requirements table; reuse them anywhere. Metric-card bars animate from `.reveal.in .fill width:var(--w)`. To add a section: append a `.section` with an id, add a TOC `<li><a data-to="…">` row, and it joins the scrollspy automatically. On ≤820px the sidebar becomes a horizontal chip rail at the top and all multi-column blocks collapse.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#ffffff',
  },
}
