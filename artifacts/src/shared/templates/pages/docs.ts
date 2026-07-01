import type { Template } from '../types'

// A refined developer documentation page. Soft "ink on warm paper" light theme
// with a single indigo accent. Three-column layout: sticky left sidebar nav
// (scrollspy-highlighted), a center content column with anchored h2/h3 sections,
// code blocks (filename header + working Copy button + faux syntax highlight),
// admonition callouts, a params table, and a tabs component (npm/pnpm/yarn).
// A right "On this page" TOC, also scrollspy-highlighted. Pure CSS/SVG — no
// images, no chart libs. Sidebars collapse on phones into a slide-over drawer.

const CSS = `
:root {
  --bg: #fbfaf7;          /* warm paper */
  --bg-2: #f4f2ec;        /* sunken panel */
  --card: #ffffff;
  --line: #e8e4da;        /* hairline */
  --line-2: #ded9cd;
  --ink: #1c1b19;         /* near-black text */
  --ink-2: #45433d;       /* body */
  --mut: #837e72;         /* muted */
  --faint: #a8a293;       /* faintest labels */
  --accent: #4f46e5;      /* indigo */
  --accent-soft: #eef0fe;
  --accent-ink: #3730a3;
  --code-bg: #1a1b26;     /* deep slate for code */
  --code-line: rgba(255,255,255,0.07);
  --note: #4f46e5; --note-bg: #eef0fe;
  --tip: #0d9488; --tip-bg: #e6f6f3;
  --warn: #d97706; --warn-bg: #fdf1e0;
  --pos: #16a34a;
  --display: 'Space Grotesk', system-ui, sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, 'Fira Code', monospace;
  --page-font: var(--body);
  --side-w: 248px;
  --toc-w: 220px;
  --top-h: 60px;
}
body { background: var(--bg); color: var(--ink-2); font-family: var(--body); line-height: 1.65; }
.num, code, pre { font-variant-numeric: tabular-nums; }
::selection { background: color-mix(in srgb, var(--accent) 22%, transparent); }
a { color: var(--accent); text-decoration: none; }

/* ===== Top bar ===== */
.topbar {
  position: sticky; top: 0; z-index: 40; height: var(--top-h);
  display: flex; align-items: center; gap: 16px;
  padding: 0 clamp(14px, 3vw, 26px);
  background: color-mix(in srgb, var(--bg) 86%, transparent);
  backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--line);
}
.brand { display: inline-flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 600; font-size: 16.5px; letter-spacing: -0.02em; color: var(--ink); flex: none; }
.brand .mark { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(140deg, var(--accent), #7c6cf5); display: grid; place-items: center; box-shadow: 0 6px 16px -7px var(--accent); }
.brand .mark svg { width: 16px; height: 16px; }
.ver { font: 600 11px var(--mono); color: var(--accent-ink); background: var(--accent-soft); border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); padding: 3px 8px; border-radius: 999px; letter-spacing: -0.01em; flex: none; }
.search { flex: 1; max-width: 380px; position: relative; }
.search input {
  width: 100%; height: 38px; border: 1px solid var(--line-2); border-radius: 10px;
  background: var(--card); padding: 0 40px 0 36px; font: 400 13.5px var(--body); color: var(--ink-2);
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.search input::placeholder { color: var(--faint); }
.search input:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: var(--faint); pointer-events: none; }
.search .kbd { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font: 600 10.5px var(--mono); color: var(--mut); background: var(--bg-2); border: 1px solid var(--line-2); border-bottom-width: 2px; border-radius: 6px; padding: 2px 6px; pointer-events: none; }
.toplinks { display: flex; align-items: center; gap: 22px; flex: none; }
.toplinks a { color: var(--mut); font-size: 13.5px; font-weight: 500; transition: color .15s; }
.toplinks a:hover { color: var(--ink); }
.gh { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; border: 1px solid var(--line-2); background: var(--card); color: var(--ink); }
.gh svg { width: 17px; height: 17px; }
.menu-btn { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--line-2); background: var(--card); color: var(--ink); flex: none; cursor: pointer; }
.menu-btn svg { width: 18px; height: 18px; }

/* ===== Layout ===== */
.layout {
  max-width: 1380px; margin: 0 auto;
  display: grid; grid-template-columns: var(--side-w) minmax(0,1fr) var(--toc-w);
  gap: clamp(28px, 4vw, 56px);
  padding: 0 clamp(14px, 3vw, 26px);
  align-items: start;
}

/* ===== Left sidebar ===== */
.sidebar { position: sticky; top: var(--top-h); align-self: start; max-height: calc(100vh - var(--top-h)); overflow-y: auto; padding: 30px 0 60px; }
.sidebar::-webkit-scrollbar { width: 8px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--line-2); border-radius: 8px; }
.nav-group { margin-bottom: 22px; }
.nav-group > .g-label { font: 700 11px var(--body); text-transform: uppercase; letter-spacing: 0.1em; color: var(--faint); padding: 0 12px; margin-bottom: 8px; }
.nav-group ul { list-style: none; margin: 0; padding: 0; }
.nav-group li a {
  display: flex; align-items: center; gap: 9px; position: relative;
  padding: 6.5px 12px; border-radius: 8px; margin: 1px 0;
  color: var(--mut); font-size: 13.5px; font-weight: 500; line-height: 1.35;
  transition: color .14s, background .14s;
}
.nav-group li a:hover { color: var(--ink); background: var(--bg-2); }
.nav-group li a.active { color: var(--accent-ink); background: var(--accent-soft); font-weight: 600; }
.nav-group li a.active::before { content: ''; position: absolute; left: -1px; top: 50%; transform: translateY(-50%); width: 3px; height: 16px; border-radius: 3px; background: var(--accent); }
.nav-group li a .tag { margin-left: auto; font: 700 9px var(--mono); padding: 1.5px 5px; border-radius: 5px; letter-spacing: 0.03em; }
.tag.new { color: #fff; background: var(--accent); }
.tag.beta { color: var(--warn); background: var(--warn-bg); }

/* ===== Content ===== */
.content { min-width: 0; padding: 36px 0 90px; }
.crumbs { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mut); margin-bottom: 18px; }
.crumbs span.sep { color: var(--faint); }
.content h1 { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 4.6vw, 44px); line-height: 1.06; letter-spacing: -0.03em; color: var(--ink); margin: 0 0 14px; text-wrap: balance; }
.lead { font-size: clamp(16px, 1.9vw, 18.5px); color: var(--mut); line-height: 1.6; margin: 0 0 12px; max-width: 64ch; }
.meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: 22px 0 6px; padding-bottom: 26px; border-bottom: 1px solid var(--line); }
.pill { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ink-2); background: var(--card); border: 1px solid var(--line-2); padding: 5px 11px; border-radius: 999px; }
.pill .d { width: 7px; height: 7px; border-radius: 50%; background: var(--pos); }
.pill.mono { font-family: var(--mono); font-size: 11.5px; }

.content section { scroll-margin-top: calc(var(--top-h) + 18px); }
.content h2 { font-family: var(--display); font-weight: 600; font-size: clamp(22px, 3vw, 28px); letter-spacing: -0.02em; color: var(--ink); margin: 52px 0 4px; padding-top: 6px; }
.content h3 { font-family: var(--display); font-weight: 600; font-size: 17.5px; letter-spacing: -0.01em; color: var(--ink); margin: 34px 0 2px; }
.content h2 .anchor, .content h3 .anchor {
  opacity: 0; margin-left: 8px; color: var(--faint); font-weight: 400; font-size: 0.7em;
  text-decoration: none; transition: opacity .15s, color .15s; vertical-align: middle;
}
.content h2:hover .anchor, .content h3:hover .anchor { opacity: 1; }
.content h2 .anchor:hover, .content h3 .anchor:hover { color: var(--accent); }
.content p { margin: 14px 0; max-width: 70ch; color: var(--ink-2); }
.content p, .content li { font-size: 15px; }
.content ul.body, .content ol.body { max-width: 70ch; padding-left: 22px; margin: 14px 0; }
.content ul.body li, .content ol.body li { margin: 7px 0; }
.content ul.body li::marker { color: var(--accent); }
.content a.link { font-weight: 500; border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, transparent); transition: border-color .15s; }
.content a.link:hover { border-color: var(--accent); }
.content strong { color: var(--ink); font-weight: 600; }
.hr { height: 1px; background: var(--line); border: 0; margin: 46px 0; }

/* inline code */
code.inl { font: 500 0.85em var(--mono); color: var(--accent-ink); background: var(--accent-soft); padding: 2px 6px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--accent) 12%, transparent); white-space: nowrap; }

/* ===== Code blocks ===== */
.code {
  position: relative; margin: 20px 0; border-radius: 12px; overflow: hidden;
  background: var(--code-bg); border: 1px solid #2a2c3a;
  box-shadow: 0 12px 30px -16px rgba(20,20,40,0.5);
}
.code .chead { display: flex; align-items: center; gap: 10px; padding: 9px 12px; background: #14151e; border-bottom: 1px solid var(--code-line); }
.code .chead .dots { display: inline-flex; gap: 6px; margin-right: 4px; }
.code .chead .dots i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.code .chead .fname { font: 500 12px var(--mono); color: #c5c8d6; letter-spacing: -0.01em; }
.code .chead .lang { font: 600 10px var(--mono); color: #8b8fa3; text-transform: uppercase; letter-spacing: 0.08em; }
.code .chead .spacer { flex: 1; }
.copy {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font: 600 11.5px var(--body); color: #b6bacb; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 7px; padding: 4px 9px; transition: background .15s, color .15s;
}
.copy:hover { background: rgba(255,255,255,0.1); color: #fff; }
.copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.copy svg { width: 13px; height: 13px; }
.copy.done { color: #6ee7b7; }
.code pre { margin: 0; padding: 16px 16px; overflow-x: auto; }
.code pre code { font: 400 13px/1.7 var(--mono); color: #d7dae6; display: block; tab-size: 2; }
.code pre::-webkit-scrollbar { height: 8px; }
.code pre::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 8px; }
/* faux syntax highlight */
.tok-key { color: #c792ea; }
.tok-str { color: #c3e88d; }
.tok-com { color: #5f6783; font-style: italic; }
.tok-fn  { color: #82aaff; }
.tok-num { color: #f78c6c; }
.tok-punc{ color: #89ddff; }
.tok-var { color: #f07178; }

/* ===== Callouts ===== */
.callout { display: grid; grid-template-columns: 22px 1fr; gap: 12px; margin: 22px 0; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--line); border-left-width: 3px; background: var(--card); }
.callout .ico { width: 20px; height: 20px; margin-top: 1px; }
.callout .ct { margin: 0; font-size: 14px; color: var(--ink-2); }
.callout .ct b { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
.callout.note { border-left-color: var(--note); background: var(--note-bg); }
.callout.note .ico, .callout.note .ct b { color: var(--note); }
.callout.tip { border-left-color: var(--tip); background: var(--tip-bg); }
.callout.tip .ico, .callout.tip .ct b { color: var(--tip); }
.callout.warn { border-left-color: var(--warn); background: var(--warn-bg); }
.callout.warn .ico, .callout.warn .ct b { color: var(--warn); }

/* ===== Tabs ===== */
.tabs { margin: 22px 0; }
.tablist { display: inline-flex; gap: 2px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; padding: 3px; }
.tablist button { border: 0; background: transparent; cursor: pointer; font: 600 12.5px var(--mono); color: var(--mut); padding: 6px 14px; border-radius: 7px; transition: color .14s, background .14s; }
.tablist button[aria-selected="true"] { background: var(--card); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.tablist button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tabpanel { display: none; margin-top: 10px; }
.tabpanel.show { display: block; }

/* ===== Params table ===== */
.tablewrap { margin: 20px 0; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
table.params { width: 100%; border-collapse: collapse; font-size: 13.5px; background: var(--card); }
table.params th { text-align: left; font: 700 10.5px var(--body); text-transform: uppercase; letter-spacing: 0.07em; color: var(--mut); padding: 11px 14px; background: var(--bg-2); border-bottom: 1px solid var(--line); }
table.params td { padding: 13px 14px; border-bottom: 1px solid var(--line); vertical-align: top; color: var(--ink-2); }
table.params tr:last-child td { border-bottom: 0; }
table.params td.name { font: 600 12.5px var(--mono); color: var(--ink); white-space: nowrap; }
table.params td.type code { font: 500 11.5px var(--mono); color: var(--accent-ink); background: var(--accent-soft); padding: 2px 7px; border-radius: 6px; white-space: nowrap; }
.req { font: 700 9px var(--body); color: #b91c1c; background: #fde8e8; padding: 2px 6px; border-radius: 5px; letter-spacing: 0.04em; text-transform: uppercase; margin-left: 6px; }
.opt { font: 700 9px var(--body); color: var(--mut); background: var(--bg-2); padding: 2px 6px; border-radius: 5px; letter-spacing: 0.04em; text-transform: uppercase; margin-left: 6px; }

/* ===== Helpful footer + prev/next ===== */
.helpful { margin: 56px 0 0; padding: 22px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); display: flex; align-items: center; flex-wrap: wrap; gap: 14px; }
.helpful .q { font: 600 14.5px var(--body); color: var(--ink); }
.helpful .btns { display: flex; gap: 8px; margin-left: auto; }
.helpful button { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font: 600 13px var(--body); color: var(--ink-2); background: var(--bg); border: 1px solid var(--line-2); border-radius: 9px; padding: 8px 14px; transition: border-color .14s, color .14s, background .14s; }
.helpful button:hover { border-color: var(--accent); color: var(--accent); }
.helpful button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.helpful button.picked { border-color: var(--accent); background: var(--accent-soft); color: var(--accent-ink); }
.helpful button svg { width: 15px; height: 15px; }
.helpful .thanks { font-size: 13px; color: var(--pos); font-weight: 600; }

.prevnext { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 22px; }
.pn { display: block; padding: 16px 18px; border: 1px solid var(--line-2); border-radius: 12px; background: var(--card); transition: border-color .15s, transform .15s, box-shadow .15s; }
.pn:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 12px 28px -18px var(--accent); }
.pn .dir { font-size: 11.5px; color: var(--mut); font-weight: 600; }
.pn .ttl { font-family: var(--display); font-weight: 600; font-size: 15.5px; color: var(--ink); margin-top: 4px; letter-spacing: -0.01em; }
.pn.next { text-align: right; }

.docfoot { margin-top: 46px; padding-top: 22px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; font-size: 12.5px; color: var(--mut); }
.docfoot a { color: var(--mut); } .docfoot a:hover { color: var(--ink); }
.docfoot .spacer { flex: 1; }

/* ===== Right TOC ===== */
.toc { position: sticky; top: calc(var(--top-h) + 36px); align-self: start; max-height: calc(100vh - var(--top-h) - 60px); overflow-y: auto; padding-bottom: 40px; }
.toc .label { font: 700 11px var(--body); text-transform: uppercase; letter-spacing: 0.1em; color: var(--faint); margin: 0 0 12px; }
.toc ul { list-style: none; margin: 0; padding: 0; border-left: 2px solid var(--line); }
.toc li a { display: block; padding: 5px 0 5px 14px; margin-left: -2px; border-left: 2px solid transparent; color: var(--mut); font-size: 13px; line-height: 1.4; transition: color .14s, border-color .14s; }
.toc li a:hover { color: var(--ink); }
.toc li.sub a { padding-left: 26px; font-size: 12.5px; }
.toc li a.active { color: var(--accent-ink); border-left-color: var(--accent); font-weight: 600; }

/* ===== Scrim for mobile drawer ===== */
.scrim { position: fixed; inset: 0; z-index: 35; background: rgba(20,18,12,0.4); backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity .2s; }
.scrim.show { opacity: 1; pointer-events: auto; }

/* ===== Reveal hooks ===== */
.reveal { opacity: 1; }

/* ===== Responsive ===== */
@media (max-width: 1080px) {
  .layout { grid-template-columns: var(--side-w) minmax(0,1fr); }
  .toc { display: none; }
}
@media (max-width: 820px) {
  :root { --side-w: 280px; }
  .menu-btn { display: inline-flex; }
  .toplinks a:not(.gh) { display: none; }
  .layout { grid-template-columns: minmax(0,1fr); }
  .sidebar {
    position: fixed; top: 0; left: 0; z-index: 36; width: var(--side-w); max-height: 100vh; height: 100vh;
    background: var(--bg); border-right: 1px solid var(--line); padding: 22px 14px 60px;
    transform: translateX(-100%); transition: transform .24s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 18px 0 40px -24px rgba(0,0,0,0.4);
  }
  .sidebar.open { transform: translateX(0); }
  .content { padding-top: 26px; }
}
@media (max-width: 560px) {
  .search .kbd { display: none; }
  .ver { display: none; }
  .prevnext { grid-template-columns: 1fr; }
  .pn.next { text-align: left; }
  .helpful .btns { margin-left: 0; width: 100%; }
  .helpful .btns button { flex: 1; justify-content: center; }
  .meta-row { gap: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .pn { transition: none; } .sidebar { transition: none; }
}
`.trim()

const HTML = `
<div class="topbar">
  <button class="menu-btn" id="menuBtn" aria-label="Open navigation" aria-expanded="false">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
  </button>
  <a class="brand" href="#top">
    <span class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg></span>
    Halcyon
  </a>
  <span class="ver">v2.4.0</span>
  <div class="search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>
    <input type="text" placeholder="Search the docs…" aria-label="Search documentation" />
    <span class="kbd">⌘K</span>
  </div>
  <nav class="toplinks">
    <a href="#guides">Guides</a>
    <a href="#api">API</a>
    <a href="#changelog">Changelog</a>
    <a class="gh" href="#github" aria-label="GitHub repository"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg></a>
  </nav>
</div>

<div class="scrim" id="scrim"></div>

<div class="layout" id="top">
  <!-- LEFT SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="nav-group">
      <div class="g-label">Getting started</div>
      <ul>
        <li><a href="#overview">Overview</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#quickstart">Quickstart</a></li>
        <li><a href="#authentication">Authentication</a></li>
      </ul>
    </div>
    <div class="nav-group">
      <div class="g-label">Core concepts</div>
      <ul>
        <li><a href="#the-client">The client <span class="tag new">NEW</span></a></li>
        <li><a href="#streaming">Streaming responses</a></li>
        <li><a href="#errors">Error handling</a></li>
        <li><a href="#retries">Retries &amp; timeouts <span class="tag beta">BETA</span></a></li>
      </ul>
    </div>
    <div class="nav-group">
      <div class="g-label">Reference</div>
      <ul>
        <li><a href="#client-options">Client options</a></li>
        <li><a href="#rate-limits">Rate limits</a></li>
        <li><a href="#webhooks">Webhooks</a></li>
      </ul>
    </div>
    <div class="nav-group">
      <div class="g-label">Resources</div>
      <ul>
        <li><a href="#changelog">Changelog</a></li>
        <li><a href="#support">Support</a></li>
      </ul>
    </div>
  </aside>

  <!-- CONTENT -->
  <main class="content">
    <nav class="crumbs"><a href="#">Docs</a><span class="sep">/</span><a href="#">Getting started</a><span class="sep">/</span><span style="color:var(--ink-2)">Overview</span></nav>

    <section id="overview" class="reveal" data-reveal="none">
      <h1>Halcyon JavaScript SDK</h1>
      <p class="lead">A typed, batteries-included client for the Halcyon API. Send requests, stream completions, and handle errors with a single dependency — built for Node, Deno, Bun, and the edge.</p>
      <div class="meta-row">
        <span class="pill"><span class="d"></span> All systems operational</span>
        <span class="pill mono">@halcyon/sdk</span>
        <span class="pill mono">v2.4.0</span>
        <span class="pill">Updated Jun 12, 2026</span>
      </div>
      <p>The SDK wraps every Halcyon endpoint with first-class TypeScript types, automatic retries with exponential backoff, and ergonomic streaming. It ships zero runtime dependencies and works everywhere <code class="inl">fetch</code> is available.</p>
    </section>

    <section id="installation" class="reveal" data-reveal="none">
      <h2>Installation <a class="anchor" href="#installation" aria-label="Link to this section">#</a></h2>
      <p>Install the package with your preferred package manager. The SDK targets ES2022 and ships both ESM and CommonJS builds.</p>
      <div class="tabs" data-tabs>
        <div class="tablist" role="tablist" aria-label="Install command">
          <button role="tab" aria-selected="true" data-tab="npm">npm</button>
          <button role="tab" aria-selected="false" data-tab="pnpm">pnpm</button>
          <button role="tab" aria-selected="false" data-tab="yarn">yarn</button>
          <button role="tab" aria-selected="false" data-tab="bun">bun</button>
        </div>
        <div class="tabpanel show" data-panel="npm">
          <div class="code">
            <div class="chead"><span class="lang">bash</span><span class="spacer"></span><button class="copy" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button></div>
            <pre><code><span class="tok-fn">npm</span> install @halcyon/sdk</code></pre>
          </div>
        </div>
        <div class="tabpanel" data-panel="pnpm">
          <div class="code">
            <div class="chead"><span class="lang">bash</span><span class="spacer"></span><button class="copy" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button></div>
            <pre><code><span class="tok-fn">pnpm</span> add @halcyon/sdk</code></pre>
          </div>
        </div>
        <div class="tabpanel" data-panel="yarn">
          <div class="code">
            <div class="chead"><span class="lang">bash</span><span class="spacer"></span><button class="copy" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button></div>
            <pre><code><span class="tok-fn">yarn</span> add @halcyon/sdk</code></pre>
          </div>
        </div>
        <div class="tabpanel" data-panel="bun">
          <div class="code">
            <div class="chead"><span class="lang">bash</span><span class="spacer"></span><button class="copy" type="button" aria-label="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button></div>
            <pre><code><span class="tok-fn">bun</span> add @halcyon/sdk</code></pre>
          </div>
        </div>
      </div>
      <div class="callout note">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor"/></svg>
        <p class="ct"><b>Note</b>Node 18+ is required for the built-in <code class="inl">fetch</code> and <code class="inl">ReadableStream</code> globals. On older runtimes, supply a polyfill via the <code class="inl">fetch</code> client option.</p>
      </div>
    </section>

    <section id="quickstart" class="reveal" data-reveal="none">
      <h2>Quickstart <a class="anchor" href="#quickstart" aria-label="Link to this section">#</a></h2>
      <p>Create a client with your API key and make your first request in under a minute. Store secrets in environment variables — never commit them to source control.</p>
      <div class="code">
        <div class="chead">
          <span class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>
          <span class="fname">index.ts</span><span class="spacer"></span><span class="lang">typescript</span>
          <button class="copy" type="button" aria-label="Copy code" style="margin-left:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>
        </div>
        <pre><code><span class="tok-key">import</span> { Halcyon } <span class="tok-key">from</span> <span class="tok-str">'@halcyon/sdk'</span>

<span class="tok-com">// Reads HALCYON_API_KEY from the environment by default</span>
<span class="tok-key">const</span> client <span class="tok-punc">=</span> <span class="tok-key">new</span> <span class="tok-fn">Halcyon</span>({
  apiKey<span class="tok-punc">:</span> process.env.<span class="tok-var">HALCYON_API_KEY</span>,
  timeout<span class="tok-punc">:</span> <span class="tok-num">30_000</span>,
})

<span class="tok-key">const</span> reply <span class="tok-punc">=</span> <span class="tok-key">await</span> client.messages.<span class="tok-fn">create</span>({
  model<span class="tok-punc">:</span> <span class="tok-str">'halcyon-large'</span>,
  input<span class="tok-punc">:</span> <span class="tok-str">'Summarize the CAP theorem in one sentence.'</span>,
})

console.<span class="tok-fn">log</span>(reply.output_text)</code></pre>
      </div>
      <div class="callout tip">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>
        <p class="ct"><b>Tip</b>Pass <code class="inl">stream: true</code> to receive tokens incrementally — perfect for chat UIs. See <a class="link" href="#streaming">Streaming responses</a> below.</p>
      </div>
    </section>

    <section id="authentication" class="reveal" data-reveal="none">
      <h2>Authentication <a class="anchor" href="#authentication" aria-label="Link to this section">#</a></h2>
      <p>Every request is authenticated with a bearer token. The SDK reads <code class="inl">HALCYON_API_KEY</code> automatically, or you can pass <code class="inl">apiKey</code> explicitly. Keys are scoped per project and can be rotated from the dashboard without downtime.</p>
      <div class="callout warn">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor"/></svg>
        <p class="ct"><b>Warning</b>Never expose your secret key in client-side code. For browser apps, proxy requests through your backend or issue short-lived <strong>ephemeral tokens</strong> from a trusted server.</p>
      </div>
    </section>

    <hr class="hr" />

    <section id="the-client" class="reveal" data-reveal="none">
      <h2>The client <a class="anchor" href="#the-client" aria-label="Link to this section">#</a></h2>
      <p>The <code class="inl">Halcyon</code> class is the single entry point. It exposes resource namespaces (<code class="inl">messages</code>, <code class="inl">files</code>, <code class="inl">embeddings</code>) and is safe to reuse across requests — instantiate it once and share it.</p>

      <h3>Constructor options <a class="anchor" href="#the-client" aria-label="Link to this section">#</a></h3>
      <p>All options are optional except <code class="inl">apiKey</code>. The defaults are tuned for serverless environments.</p>
      <div class="tablewrap">
        <table class="params">
          <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
          <tbody>
            <tr>
              <td class="name">apiKey<span class="req">Req</span></td>
              <td class="type"><code>string</code></td>
              <td class="num">—</td>
              <td>Your secret project key. Falls back to <code class="inl">process.env.HALCYON_API_KEY</code>.</td>
            </tr>
            <tr>
              <td class="name">baseURL<span class="opt">Opt</span></td>
              <td class="type"><code>string</code></td>
              <td class="num">api.halcyon.dev</td>
              <td>Override the API host — useful for proxies and self-hosted gateways.</td>
            </tr>
            <tr>
              <td class="name">timeout<span class="opt">Opt</span></td>
              <td class="type"><code>number</code></td>
              <td class="num">60000</td>
              <td>Per-request timeout in milliseconds before the call is aborted.</td>
            </tr>
            <tr>
              <td class="name">maxRetries<span class="opt">Opt</span></td>
              <td class="type"><code>number</code></td>
              <td class="num">2</td>
              <td>How many times to retry transient <code class="inl">429</code>/<code class="inl">5xx</code> errors.</td>
            </tr>
            <tr>
              <td class="name">fetch<span class="opt">Opt</span></td>
              <td class="type"><code>FetchFn</code></td>
              <td class="num">globalThis</td>
              <td>Custom fetch implementation for polyfills, proxies, or instrumentation.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="streaming" class="reveal" data-reveal="none">
      <h2>Streaming responses <a class="anchor" href="#streaming" aria-label="Link to this section">#</a></h2>
      <p>Set <code class="inl">stream: true</code> to receive an async iterable of server-sent events. Each chunk carries an incremental delta you can render the moment it arrives.</p>
      <div class="code">
        <div class="chead">
          <span class="dots"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></span>
          <span class="fname">stream.ts</span><span class="spacer"></span><span class="lang">typescript</span>
          <button class="copy" type="button" aria-label="Copy code" style="margin-left:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>
        </div>
        <pre><code><span class="tok-key">const</span> stream <span class="tok-punc">=</span> <span class="tok-key">await</span> client.messages.<span class="tok-fn">create</span>({
  model<span class="tok-punc">:</span> <span class="tok-str">'halcyon-large'</span>,
  input<span class="tok-punc">:</span> <span class="tok-str">'Write a haiku about distributed systems.'</span>,
  stream<span class="tok-punc">:</span> <span class="tok-key">true</span>,
})

<span class="tok-key">for await</span> (<span class="tok-key">const</span> event <span class="tok-key">of</span> stream) {
  <span class="tok-key">if</span> (event.type <span class="tok-punc">===</span> <span class="tok-str">'delta'</span>) {
    process.stdout.<span class="tok-fn">write</span>(event.text)  <span class="tok-com">// render as it arrives</span>
  }
}</code></pre>
      </div>
    </section>

    <section id="errors" class="reveal" data-reveal="none">
      <h2>Error handling <a class="anchor" href="#errors" aria-label="Link to this section">#</a></h2>
      <p>Failed requests throw a typed <code class="inl">HalcyonError</code> subclass. Inspect <code class="inl">error.status</code> and <code class="inl">error.code</code> to branch precisely, and read <code class="inl">error.requestId</code> for support tickets.</p>
      <ul class="body">
        <li><code class="inl">AuthenticationError</code> — the key is missing, malformed, or revoked (<code class="inl">401</code>).</li>
        <li><code class="inl">RateLimitError</code> — you hit a quota; respect the <code class="inl">retry-after</code> header (<code class="inl">429</code>).</li>
        <li><code class="inl">APIError</code> — an upstream or validation failure (<code class="inl">4xx</code>/<code class="inl">5xx</code>).</li>
      </ul>
    </section>

    <section id="retries" class="reveal" data-reveal="none">
      <h2>Retries &amp; timeouts <a class="anchor" href="#retries" aria-label="Link to this section">#</a></h2>
      <p>Transient failures are retried automatically with full jitter and exponential backoff, capped by <code class="inl">maxRetries</code>. Idempotent requests are safe to retry; the SDK attaches an idempotency key for you.</p>
      <div class="callout note">
        <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="7.5" r="0.6" fill="currentColor"/></svg>
        <p class="ct"><b>Note</b>Set <code class="inl">maxRetries: 0</code> to disable automatic retries — useful when you manage your own queueing and backpressure.</p>
      </div>
    </section>

    <!-- Helpful + prev/next -->
    <div class="helpful reveal" data-reveal="none">
      <span class="q">Was this page helpful?</span>
      <div class="btns">
        <button type="button" data-vote="up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11"/><path d="M11 5.5 9 10v11h8.4a2 2 0 0 0 2-1.7l1.3-8A2 2 0 0 0 18.7 9H14V5.5a2 2 0 0 0-3.6-1.2z"/></svg>Yes</button>
        <button type="button" data-vote="down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3"/><path d="M13 18.5 15 14V3H6.6a2 2 0 0 0-2 1.7l-1.3 8A2 2 0 0 0 5.3 15H10v3.5a2 2 0 0 0 3.6 1.2z"/></svg>No</button>
      </div>
    </div>

    <div class="prevnext reveal" data-reveal="none">
      <a class="pn prev" href="#installation"><div class="dir">← Previous</div><div class="ttl">Installation</div></a>
      <a class="pn next" href="#streaming"><div class="dir">Next →</div><div class="ttl">Streaming responses</div></a>
    </div>

    <footer class="docfoot">
      <a href="#edit">Edit this page on GitHub</a>
      <span class="spacer"></span>
      <span>© 2026 Halcyon Labs</span>
      <a href="#privacy">Privacy</a>
      <a href="#terms">Terms</a>
    </footer>
  </main>

  <!-- RIGHT TOC -->
  <aside class="toc">
    <p class="label">On this page</p>
    <ul id="tocList">
      <li><a href="#overview">Overview</a></li>
      <li><a href="#installation">Installation</a></li>
      <li><a href="#quickstart">Quickstart</a></li>
      <li><a href="#authentication">Authentication</a></li>
      <li><a href="#the-client">The client</a></li>
      <li class="sub"><a href="#streaming">Streaming responses</a></li>
      <li class="sub"><a href="#errors">Error handling</a></li>
      <li class="sub"><a href="#retries">Retries &amp; timeouts</a></li>
    </ul>
  </aside>
</div>
`.trim()

const JS = `
(function () {
  'use strict';

  // ---- Copy buttons on code blocks ----
  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var block = btn.closest('.code');
      var code = block ? block.querySelector('code') : null;
      var text = code ? code.innerText : '';
      var done = function () {
        var label = btn.lastChild;
        var prev = btn.classList.contains('done');
        btn.classList.add('done');
        if (label && label.nodeType === 3) label.textContent = 'Copied!';
        clearTimeout(btn._t);
        btn._t = setTimeout(function () {
          btn.classList.remove('done');
          if (label && label.nodeType === 3) label.textContent = 'Copy';
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });

  // ---- Tabs (npm / pnpm / yarn / bun) ----
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[data-tab]');
    var panels = root.querySelectorAll('[data-panel]');
    function select(name) {
      tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-tab') === name ? 'true' : 'false'); });
      panels.forEach(function (p) { p.classList.toggle('show', p.getAttribute('data-panel') === name); });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var dir = e.key === 'ArrowRight' ? 1 : -1;
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus(); select(next.getAttribute('data-tab'));
      });
    });
  });

  // ---- Helpful vote ----
  var helpful = document.querySelector('.helpful');
  if (helpful) {
    helpful.querySelectorAll('[data-vote]').forEach(function (b) {
      b.addEventListener('click', function () {
        helpful.querySelectorAll('[data-vote]').forEach(function (x) { x.classList.remove('picked'); });
        b.classList.add('picked');
        if (!helpful.querySelector('.thanks')) {
          var t = document.createElement('span');
          t.className = 'thanks';
          t.textContent = 'Thanks for the feedback!';
          helpful.appendChild(t);
        }
      });
    });
  }

  // ---- Mobile drawer ----
  var menuBtn = document.getElementById('menuBtn');
  var sidebar = document.getElementById('sidebar');
  var scrim = document.getElementById('scrim');
  function setDrawer(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (scrim) scrim.classList.toggle('show', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setDrawer(!sidebar.classList.contains('open')); });
  if (scrim) scrim.addEventListener('click', function () { setDrawer(false); });
  if (sidebar) sidebar.addEventListener('click', function (e) {
    if (e.target.closest('a')) setDrawer(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  // ---- Scrollspy for sidebar + TOC ----
  var sections = Array.prototype.slice.call(document.querySelectorAll('.content section[id]'));
  var sideLinks = {};
  var tocLinks = {};
  document.querySelectorAll('.sidebar a[href^="#"]').forEach(function (a) {
    sideLinks[a.getAttribute('href').slice(1)] = a;
  });
  document.querySelectorAll('.toc a[href^="#"]').forEach(function (a) {
    tocLinks[a.getAttribute('href').slice(1)] = a;
  });

  var current = null;
  function setActive(id) {
    if (id === current) return;
    current = id;
    Object.keys(sideLinks).forEach(function (k) { sideLinks[k].classList.toggle('active', k === id); });
    Object.keys(tocLinks).forEach(function (k) { tocLinks[k].classList.toggle('active', k === id); });
    var t = tocLinks[id];
    if (t && t.scrollIntoView) {
      var toc = document.querySelector('.toc');
      if (toc) {
        var r = t.getBoundingClientRect(), tr = toc.getBoundingClientRect();
        if (r.top < tr.top || r.bottom > tr.bottom) t.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function onScroll() {
    var probe = 130; // px below the sticky header
    var best = null;
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].getBoundingClientRect().top;
      if (top - probe <= 0) best = sections[i].id;
    }
    if (!best && sections.length) best = sections[0].id;
    // bottom of page → last section
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4 && sections.length) {
      best = sections[sections.length - 1].id;
    }
    if (best) setActive(best);
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  // ---- Smooth focus on anchor click (offset-aware via scroll-margin) ----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    });
  });

  // ---- Cmd/Ctrl-K focuses search ----
  var search = document.querySelector('.search input');
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (search) search.focus();
    }
  });
})();
`.trim()

export const docs: Template = {
  id: 'docs',
  kind: 'page',
  name: 'Documentation',
  tagline: 'A clean dev-docs page with sidebar + TOC',
  categories: ['Writing'],
  audiences: ['developer', 'product', 'technical'],
  description:
    'A polished developer documentation page on a warm "ink on paper" light theme with a single indigo accent. Three columns: a sticky left section nav and a right "On this page" TOC, both highlighted by scrollspy as you read, around a center content column with anchored headings, syntax-highlighted code blocks (filename header + working Copy button), note/tip/warning callouts, a parameters table, and an npm/pnpm/yarn tabs widget. Pure CSS/SVG, fully responsive — sidebars collapse into a slide-over drawer on phones.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    mono: 'JetBrains Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#fbfaf7',
  notes:
    'Palette knobs live in :root. --bg/--bg-2/--card set the warm paper surfaces; --ink/--ink-2/--mut/--faint are the text ramp; --accent (indigo) + --accent-soft/--accent-ink drive every highlight (active nav, links, inline code, tabs). --code-bg is the deep code surface; recolor faux highlighting via the .tok-* classes (key/str/com/fn/num/punc/var). Callout colors: --note/--tip/--warn (+ matching *-bg). Layout widths: --side-w (left nav), --toc-w (right TOC), --top-h (sticky header). To ADD a doc section: add a `<section id="x">` with an `<h2>` (include the `<a class="anchor">` and a `.reveal` wrapper), then add matching `<a href="#x">` entries to BOTH the .sidebar nav and the #tocList — scrollspy wires up automatically from the ids. Code blocks: wrap a `<pre><code>` in `.code`, give it a `.chead` (filename/lang + a `.copy` button) and hand-tag tokens with `<span class="tok-*">`. The npm/pnpm/yarn TABS, Copy buttons, scrollspy, mobile drawer, ⌘K-search-focus, and the helpful vote are all wired in JS with zero dependencies. Swap "Halcyon" and the API copy for the real product.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#fbfaf7',
  },
}
