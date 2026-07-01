import type { Template } from '../types'

// A sublime long-form editorial reading experience. Warm paper ground, a committed
// Newsreader serif, an oversized drop cap, a measure that breaks for a pull-quote,
// superscript footnotes that link to a notes section, and a thin reading-progress
// bar driven by the renderer's --scroll variable. Pure CSS/SVG — the hero and the
// inline figure are hand-drawn generative artwork; no images, no chart libs.

const CSS = `
:root {
  --paper: #f6f2ea;        /* warm ivory ground */
  --paper-2: #efe9dd;      /* slightly deeper panel */
  --ink: #211d18;          /* near-black warm ink */
  --ink-soft: #4a443b;     /* secondary text */
  --ink-faint: #8a8275;    /* captions, meta */
  --rule: #ddd5c6;         /* hairlines */
  --accent: #b2452f;       /* terracotta — the single editorial accent */
  --accent-deep: #8a3322;
  --gold: #b08642;         /* warm secondary for the artwork */
  --teal: #2f6b66;         /* cool foil for the artwork */
  --measure: 38rem;        /* ~66ch reading column */
  --display: 'Newsreader', Georgia, 'Times New Roman', serif;
  --body: 'Newsreader', Georgia, serif;
  --sans: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: var(--paper); color: var(--ink); }
.num { font-variant-numeric: tabular-nums; }

/* ===== reading-progress bar (driven by --scroll from the renderer) ===== */
.progress {
  position: fixed; top: 0; left: 0; height: 3px; z-index: 60;
  width: calc(var(--scroll, 0) * 100%);
  background: linear-gradient(90deg, var(--accent), var(--gold));
  box-shadow: 0 0 14px -2px rgba(178,69,47,0.55);
}

/* ===== running masthead ===== */
.masthead {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 14px;
  padding: 14px clamp(18px, 5vw, 44px);
  font-family: var(--sans); font-size: 12.5px; letter-spacing: 0.02em;
  color: var(--ink-soft);
  background: color-mix(in srgb, var(--paper) 86%, transparent);
  backdrop-filter: blur(10px) saturate(1.1);
  border-bottom: 1px solid var(--rule);
}
.masthead .logo { display: inline-flex; align-items: center; gap: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink); }
.masthead .logo .mark { width: 22px; height: 22px; flex: none; }
.masthead .spacer { flex: 1; }
.masthead .issue { color: var(--ink-faint); }
.masthead .sub { color: var(--accent); font-weight: 600; }
@media (max-width: 560px) { .masthead .issue { display: none; } }

/* ===== shared column ===== */
.wrap { max-width: var(--measure); margin: 0 auto; padding: 0 clamp(20px, 6vw, 24px); }

/* ===== title block ===== */
.lede { padding: clamp(46px, 9vw, 96px) 0 clamp(20px, 4vw, 34px); text-align: center; }
.kicker {
  font-family: var(--sans); font-weight: 700; font-size: 12.5px;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--accent);
  display: inline-flex; align-items: center; gap: 14px;
}
.kicker::before, .kicker::after { content: ''; width: 26px; height: 1px; background: currentColor; opacity: 0.5; }
.lede h1 {
  font-family: var(--display); font-weight: 500; font-optical-sizing: auto;
  font-size: clamp(38px, 8vw, 76px); line-height: 1.02; letter-spacing: -0.018em;
  margin: 22px 0 0; text-wrap: balance; color: var(--ink);
}
.lede h1 em { font-style: italic; color: var(--accent-deep); }
.standfirst {
  font-family: var(--display); font-weight: 400; font-style: italic;
  font-size: clamp(18px, 2.6vw, 23px); line-height: 1.5; color: var(--ink-soft);
  max-width: 32rem; margin: 20px auto 0; text-wrap: pretty;
}
.byline {
  font-family: var(--sans); font-size: 13px; color: var(--ink-faint);
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
  gap: 10px 14px; margin-top: 26px;
}
.byline .who { color: var(--ink); font-weight: 600; }
.byline .sep { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-faint); }

/* ===== hero figure (generative SVG artwork) ===== */
.hero { margin: clamp(30px, 6vw, 52px) 0 0; }
.hero figure { margin: 0; }
.hero .canvas {
  position: relative; border-radius: 16px; overflow: hidden;
  border: 1px solid var(--rule);
  background:
    radial-gradient(120% 100% at 18% 0%, #fbf7ef 0%, var(--paper-2) 55%, #e7ddcb 100%);
  box-shadow: 0 30px 70px -40px rgba(40,30,18,0.5);
  aspect-ratio: 16 / 9;
}
.hero svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.hero figcaption, .infig figcaption {
  font-family: var(--sans); font-size: 12.5px; color: var(--ink-faint);
  margin-top: 12px; line-height: 1.5; display: flex; gap: 10px;
}
.hero figcaption b, .infig figcaption b { color: var(--ink-soft); font-weight: 600; flex: none; }

/* hero artwork stroke animation */
.orbit { fill: none; stroke-linecap: round; }
.orbit.draw { stroke-dasharray: 1400; stroke-dashoffset: 1400; }
.reveal.in .orbit.draw { animation: trace 2.6s cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes trace { to { stroke-dashoffset: 0; } }
.spark { transform-box: fill-box; transform-origin: center; opacity: 0; }
.reveal.in .spark { animation: pop 0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
.reveal.in .spark.s2 { animation-delay: 0.5s; }
.reveal.in .spark.s3 { animation-delay: 0.9s; }
.reveal.in .spark.s4 { animation-delay: 1.3s; }
@keyframes pop { 0% { opacity: 0; transform: scale(0.2); } 60% { opacity: 1; transform: scale(1.18); } 100% { opacity: 1; transform: scale(1); } }

/* ===== body prose ===== */
.body { padding: clamp(34px, 6vw, 56px) 0 0; }
.body p {
  font-family: var(--body); font-weight: 400;
  font-size: clamp(18px, 2.3vw, 20px); line-height: 1.66; letter-spacing: 0.003em;
  color: var(--ink); margin: 0 0 1.35em; text-wrap: pretty;
}
.body p.tight { margin-bottom: 0.7em; }
.body > p + p { text-indent: 0; }
.body h2 {
  font-family: var(--display); font-weight: 500; font-size: clamp(25px, 4vw, 34px);
  line-height: 1.12; letter-spacing: -0.012em; margin: 1.9em 0 0.55em; color: var(--ink);
  position: relative;
}
.body h2 .no {
  font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 0.16em;
  color: var(--accent); display: block; margin-bottom: 10px;
}
.body a.link { color: var(--accent-deep); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; text-decoration-color: rgba(138,51,34,0.4); }
.body a.link:hover { text-decoration-color: var(--accent); }

/* drop cap on the first paragraph */
.body .first::first-letter {
  font-family: var(--display); font-weight: 500;
  float: left; font-size: 4.9em; line-height: 0.72;
  padding: 0.06em 0.1em 0 0; margin: 0.02em 0 0;
  color: var(--accent); font-style: normal;
}
.body .first { text-indent: 0; }

/* small caps lead-in */
.smallcaps { font-variant: small-caps; letter-spacing: 0.04em; color: var(--ink-soft); font-weight: 500; }

/* ===== pull-quote (breaks the measure) ===== */
.pullquote {
  margin: 1.7em -8vw; padding: 0 8vw; text-align: center;
}
.pullquote p {
  font-family: var(--display); font-weight: 400; font-style: italic;
  font-size: clamp(24px, 4.4vw, 38px); line-height: 1.22; letter-spacing: -0.014em;
  color: var(--accent-deep); max-width: 22ch; margin: 0 auto; text-wrap: balance;
}
.pullquote .rule { width: 46px; height: 2px; background: var(--accent); margin: 0 auto 22px; opacity: 0.7; }
.pullquote cite { display: block; font-family: var(--sans); font-style: normal; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint); margin-top: 18px; }
@media (max-width: 760px) { .pullquote { margin-left: 0; margin-right: 0; padding: 0; } }

/* ===== inline figure ===== */
.infig { margin: 1.9em 0; }
.infig .plot {
  border-radius: 12px; border: 1px solid var(--rule); overflow: hidden;
  background: linear-gradient(180deg, #fbf8f1, var(--paper-2));
  aspect-ratio: 16 / 8;
}
.infig svg { display: block; width: 100%; height: 100%; }
.plot .gl { stroke: var(--rule); stroke-width: 1; }
.plot .axn { fill: var(--ink-faint); font: 11px var(--sans); }
.plot .ln { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.plot .ln.draw { stroke-dasharray: 1200; stroke-dashoffset: 1200; }
.reveal.in .plot .ln.draw { animation: trace 2s ease forwards 0.2s; }
.plot .dot { opacity: 0; }
.reveal.in .plot .dot { animation: pop 0.6s ease forwards 1.4s; }

/* ===== blockquote ===== */
.body blockquote {
  margin: 1.6em 0; padding: 4px 0 4px 26px;
  border-left: 3px solid var(--accent);
  font-family: var(--display); font-style: italic;
  font-size: clamp(19px, 2.6vw, 22px); line-height: 1.5; color: var(--ink-soft);
}
.body blockquote cite { display: block; font-family: var(--sans); font-style: normal; font-size: 12.5px; letter-spacing: 0.04em; color: var(--ink-faint); margin-top: 12px; }

/* ===== key-takeaways callout ===== */
.callout {
  margin: 2em 0; padding: clamp(22px, 4vw, 30px);
  background: var(--paper-2); border: 1px solid var(--rule); border-radius: 16px;
  position: relative;
}
.callout::before {
  content: ''; position: absolute; left: 0; top: 18px; bottom: 18px; width: 3px;
  background: linear-gradient(var(--accent), var(--gold)); border-radius: 2px;
}
.callout h3 {
  font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--accent); margin: 0 0 16px;
}
.callout ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 13px; }
.callout li {
  font-family: var(--body); font-size: clamp(16px, 2.1vw, 18px); line-height: 1.5;
  color: var(--ink); padding-left: 30px; position: relative;
}
.callout li::before {
  content: ''; position: absolute; left: 0; top: 0.62em; width: 13px; height: 13px;
  border-radius: 50%; border: 2px solid var(--accent);
  background: radial-gradient(circle at 50% 50%, var(--accent) 0 30%, transparent 32%);
}

/* ===== numbered list ===== */
.body ol.steps { counter-reset: step; list-style: none; margin: 1.5em 0; padding: 0; display: grid; gap: 16px; }
.body ol.steps li {
  position: relative; padding-left: 52px;
  font-family: var(--body); font-size: clamp(17px, 2.2vw, 19px); line-height: 1.55; color: var(--ink);
}
.body ol.steps li b { color: var(--ink); font-weight: 600; }
.body ol.steps li::before {
  counter-increment: step; content: counter(step);
  position: absolute; left: 0; top: -2px;
  width: 34px; height: 34px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--sans); font-weight: 700; font-size: 14px;
  color: var(--accent); background: var(--paper-2); border: 1.5px solid var(--accent);
}

/* ===== footnotes ===== */
.fn {
  font-family: var(--sans); font-size: 0.62em; font-weight: 600; vertical-align: super;
  line-height: 0; color: var(--accent); padding: 0 1px; text-decoration: none;
}
.fn:hover { text-decoration: underline; }
sup .fn { vertical-align: baseline; }
.notes { margin-top: 3em; padding-top: 1.6em; border-top: 1px solid var(--rule); }
.notes h3 { font-family: var(--sans); font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-faint); margin: 0 0 16px; }
.notes ol { margin: 0; padding-left: 1.3em; display: grid; gap: 10px; }
.notes li { font-family: var(--body); font-size: 15.5px; line-height: 1.55; color: var(--ink-soft); }
.notes li:target { background: color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 6px; }
.notes a.back { color: var(--accent); font-family: var(--sans); font-size: 12px; margin-left: 6px; text-decoration: none; }
.notes a.back:hover { text-decoration: underline; }

/* ===== share rail (fixed on desktop) ===== */
.rail {
  position: fixed; left: max(18px, calc(50vw - var(--measure)/2 - 78px)); top: 42vh; z-index: 30;
  display: flex; flex-direction: column; gap: 10px;
}
.rail a {
  width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--paper); border: 1px solid var(--rule); color: var(--ink-soft);
  transition: transform 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.rail a:hover { color: var(--accent); border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 10px 22px -12px rgba(178,69,47,0.5); }
.rail a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.rail svg { width: 18px; height: 18px; }
.rail .lbl { font-family: var(--sans); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-faint); writing-mode: vertical-rl; transform: rotate(180deg); margin: 4px auto 8px; }
@media (max-width: 1180px) { .rail { display: none; } }

/* ===== author bio ===== */
.bio {
  margin-top: 3em; padding: clamp(24px, 4vw, 32px);
  display: flex; gap: 22px; align-items: flex-start;
  background: var(--paper-2); border: 1px solid var(--rule); border-radius: 18px;
}
.bio .av {
  width: 64px; height: 64px; border-radius: 50%; flex: none; overflow: hidden;
  background: radial-gradient(circle at 32% 28%, var(--gold), var(--accent) 75%);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.4);
}
.bio .av svg { width: 100%; height: 100%; }
.bio h4 { font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin: 0 0 6px; }
.bio .name { font-family: var(--display); font-size: 21px; font-weight: 500; color: var(--ink); margin: 0 0 8px; }
.bio p { font-family: var(--body); font-size: 16px; line-height: 1.55; color: var(--ink-soft); margin: 0; }

/* ===== related reading ===== */
.related { padding: clamp(40px, 8vw, 72px) 0 clamp(60px, 10vw, 96px); }
.related .head { text-align: center; margin-bottom: clamp(24px, 4vw, 36px); }
.related .head .kicker { justify-content: center; }
.related .head h2 { font-family: var(--display); font-weight: 500; font-size: clamp(26px, 4vw, 34px); margin: 16px 0 0; color: var(--ink); }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2.5vw, 22px); }
.card {
  display: block; border: 1px solid var(--rule); border-radius: 14px; overflow: hidden;
  background: var(--paper); transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.card:hover { transform: translateY(-4px); box-shadow: 0 24px 50px -34px rgba(40,30,18,0.55); border-color: #cbbfa9; }
.card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.card .thumb { aspect-ratio: 16 / 10; position: relative; overflow: hidden; }
.card .thumb svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.card .meta { padding: 16px 18px 20px; }
.card .tag { font-family: var(--sans); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.card .ct { font-family: var(--display); font-size: 19px; font-weight: 500; line-height: 1.2; color: var(--ink); margin: 8px 0 0; text-wrap: balance; }
.card .cm { font-family: var(--sans); font-size: 12px; color: var(--ink-faint); margin-top: 10px; }

/* ===== closing flourish ===== */
.end { text-align: center; color: var(--accent); font-size: 22px; margin: 2.2em 0 0; letter-spacing: 0.4em; }

@media (max-width: 820px) {
  .cards { grid-template-columns: 1fr; max-width: 30rem; margin: 0 auto; }
}
@media (max-width: 560px) {
  .bio { flex-direction: column; gap: 14px; }
  .body .first::first-letter { font-size: 4.2em; }
}
`.trim()

const HTML = `
<div class="progress" aria-hidden="true"></div>

<header class="masthead">
  <span class="logo">
    <svg class="mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="5" stroke="var(--accent)" stroke-width="1.6"/>
      <path d="M7 17V7h4.4c2 0 3.2 1.1 3.2 2.9 0 1.5-.9 2.5-2.3 2.8L15 17h-2.3l-2.4-4.1H9V17H7Zm2-5.7h2.1c1 0 1.6-.5 1.6-1.4 0-.9-.6-1.3-1.6-1.3H9v2.7Z" fill="var(--accent)"/>
    </svg>
    The Reactor
  </span>
  <span class="spacer"></span>
  <span class="issue">Issue 14 · Systems &amp; Society</span>
  <span class="sub">Read</span>
</header>

<nav class="rail" aria-label="Share this essay">
  <span class="lbl">Share</span>
  <a href="#" aria-label="Share on X">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 2h3.3l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2l7.7-8.8L1.7 2h6.8l4.7 6.2L18.2 2Zm-1.2 18h1.8L7.1 3.9H5.2L17 20Z"/></svg>
  </a>
  <a href="#" aria-label="Share on LinkedIn">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.2 8.2h4.5V24H.2V8.2Zm7.3 0H12v2.2h.06c.6-1.1 2.06-2.3 4.24-2.3 4.54 0 5.38 2.98 5.38 6.86V24h-4.5v-7.1c0-1.7-.03-3.9-2.38-3.9-2.38 0-2.74 1.85-2.74 3.77V24h-4.5V8.2Z"/></svg>
  </a>
  <a href="#" aria-label="Copy link">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
  </a>
  <a href="#" aria-label="Save to read later">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  </a>
</nav>

<article>
  <div class="wrap lede reveal" data-reveal="none">
    <span class="kicker">Field Notes</span>
    <h1>The quiet machinery of <em>slow</em> ideas</h1>
    <p class="standfirst">Breakthroughs feel like lightning. In truth they are weather — accumulating for years in margins and footnotes before anyone calls them inevitable.</p>
    <div class="byline">
      <span class="who">Marguerite Vance</span>
      <span class="sep"></span><span>June 30, 2026</span>
      <span class="sep"></span><span class="num">11 min read</span>
    </div>
  </div>

  <div class="wrap hero reveal">
    <figure>
      <div class="canvas">
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <radialGradient id="hg" cx="22%" cy="20%" r="95%">
              <stop offset="0" stop-color="#fbf7ef"/><stop offset="0.55" stop-color="#efe7d7"/><stop offset="1" stop-color="#e3d8c4"/>
            </radialGradient>
            <linearGradient id="ho" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#b2452f"/><stop offset="1" stop-color="#b08642"/>
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill="url(#hg)"/>
          <g stroke="var(--rule)" stroke-width="1" opacity="0.6">
            <circle cx="800" cy="470" r="120" fill="none"/><circle cx="800" cy="470" r="230" fill="none"/>
            <circle cx="800" cy="470" r="345" fill="none"/><circle cx="800" cy="470" r="470" fill="none"/>
          </g>
          <path class="orbit draw" d="M120,640 C420,640 470,300 760,300 C1050,300 1110,600 1480,420" stroke="url(#ho)" stroke-width="4" opacity="0.9"/>
          <path class="orbit draw" d="M120,720 C500,720 520,470 800,470 C1080,470 1180,250 1480,250" stroke="var(--teal)" stroke-width="3" opacity="0.7" style="animation-delay:0.4s"/>
          <g fill="var(--accent)"><circle class="spark s1" cx="760" cy="300" r="11"/><circle class="spark s3" cx="1480" cy="420" r="9"/></g>
          <g fill="var(--teal)"><circle class="spark s2" cx="800" cy="470" r="10"/><circle class="spark s4" cx="1480" cy="250" r="8"/></g>
          <g fill="var(--gold)" opacity="0.85"><circle class="spark s2" cx="420" cy="588" r="6"/><circle class="spark s4" cx="1090" cy="372" r="6"/></g>
        </svg>
      </div>
      <figcaption><b>Above</b><span>Two trajectories of an idea: the visible arc the public remembers, and the quieter path it actually travelled. Generative illustration.</span></figcaption>
    </figure>
  </div>

  <div class="wrap body">
    <p class="first reveal" data-reveal="none"><span class="smallcaps">On the morning</span> a discovery is announced, it arrives fully formed — a number, a name, a date that schoolchildren will one day memorize. The story compresses. What took a generation collapses into a sentence, and the sentence becomes the myth: the apple, the bathtub, the dream of a snake biting its tail. We love these moments because they are tidy. We distrust the truth because it is not.<a class="fn" id="r1" href="#n1"><sup>1</sup></a></p>

    <p class="reveal" data-reveal="none">The truth is that most ideas worth having are slow. They are not invented so much as <em>composted</em> — assembled out of a hundred discarded attempts, half-read papers, and conversations that seemed to go nowhere. The breakthrough is the moment the pile finally tips, and the only reason it looks sudden is that nobody was watching the pile.</p>

    <h2 class="reveal" data-reveal="none"><span class="no">01 — The myth of the spark</span>Lightning is a poor model</h2>

    <p class="reveal" data-reveal="none">We reach for lightning because it flatters us. A spark needs no rent, no failed grant applications, no decade of being politely ignored at conferences. It needs only a genius and a flash. But the historian of science <a class="link" href="#">Steven Johnson</a> has spent years documenting the opposite pattern — what he calls the <em>slow hunch</em>: an idea that lives for years as a vague dissatisfaction before it finds the adjacent idea it was waiting for.<a class="fn" id="r2" href="#n2"><sup>2</sup></a></p>

    <div class="pullquote reveal" data-reveal="scale">
      <div class="rule"></div>
      <p>A hunch is not a smaller version of a good idea. It is a different shape entirely.</p>
      <cite>From the working notes</cite>
    </div>

    <p class="reveal" data-reveal="none">Consider the long gestation of the theory of plate tectonics. Alfred Wegener proposed continental drift in 1912 and was met, for half a century, with something close to ridicule. The continents <em>looked</em> like they fit, sure — but he had no engine, no mechanism to move a continent. The idea was correct and useless at the same time, which is the worst thing an idea can be. It waited fifty years for the seafloor data that would give it a motor.</p>

    <div class="infig reveal">
      <figure>
        <div class="plot">
          <svg viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">
            <line class="gl" x1="40" y1="40" x2="40" y2="320"/>
            <line class="gl" x1="40" y1="320" x2="780" y2="320"/>
            <line class="gl" x1="40" y1="240" x2="780" y2="240" opacity="0.5"/>
            <line class="gl" x1="40" y1="160" x2="780" y2="160" opacity="0.5"/>
            <line class="gl" x1="40" y1="80" x2="780" y2="80" opacity="0.5"/>
            <path class="ln draw" d="M40,310 C180,308 240,300 320,292 C400,284 430,276 470,250 C500,228 520,180 560,120 C600,62 660,52 780,44" stroke="var(--accent)"/>
            <path class="ln" d="M40,300 C200,298 360,296 520,290 C620,286 700,280 780,272" stroke="var(--gold)" opacity="0.7" stroke-dasharray="3 6"/>
            <circle class="dot" cx="470" cy="250" r="6" fill="var(--accent)"/>
            <circle class="dot" cx="560" cy="120" r="6" fill="var(--accent)"/>
            <text class="axn" x="44" y="56">attention</text>
            <text class="axn" x="690" y="338">decades →</text>
          </svg>
        </div>
        <figcaption><b>Fig. 1</b><span>Public attention (terracotta) lags the underlying confidence in an idea (gold) by years, then overshoots at the moment of acceptance.</span></figcaption>
      </figure>
    </div>

    <h2 class="reveal" data-reveal="none"><span class="no">02 — Why slow wins</span>The patience premium</h2>

    <p class="reveal" data-reveal="none">There is a counterintuitive advantage hidden in slowness. An idea that arrives too early dies of loneliness — there is nothing nearby to connect it to. An idea that takes its time arrives into a richer neighborhood, surrounded by the tools, data, and language it needs to be understood. Timing, in other words, is not luck. It is the slow accumulation of context.</p>

    <blockquote class="reveal" data-reveal="none">
      "The future is already here — it's just not very evenly distributed."
      <cite>— William Gibson</cite>
    </blockquote>

    <p class="reveal" data-reveal="none">This is why the same idea is so often discovered twice, independently, within a few years. Newton and Leibniz with the calculus; Darwin and Wallace with natural selection. When the surrounding context is ready, the idea becomes not just possible but nearly <em>inevitable</em> — it presses against several minds at once.<a class="fn" id="r3" href="#n3"><sup>3</sup></a></p>

    <div class="callout reveal">
      <h3>Key takeaways</h3>
      <ul>
        <li>Breakthroughs are weather, not lightning — they accumulate quietly before they appear sudden.</li>
        <li>A premature idea fails not because it is wrong but because its surrounding context is missing.</li>
        <li>Simultaneous discovery is the signal that an idea's time has finally arrived.</li>
        <li>The work that matters most is often the work of keeping a hunch alive long enough to connect.</li>
      </ul>
    </div>

    <h2 class="reveal" data-reveal="none"><span class="no">03 — Tending the pile</span>How to court a slow idea</h2>

    <p class="reveal" data-reveal="none">If breakthroughs are composted rather than struck, then the practical question changes. You stop asking how to be struck by genius and start asking how to keep more hunches alive, in contact, for longer. A few practices recur in the notebooks of people who do this well:</p>

    <ol class="steps reveal">
      <li><b>Keep a commonplace book.</b> Write the half-formed thought down before it evaporates. A hunch you can't find again was never really yours.</li>
      <li><b>Let ideas collide.</b> Store your fragments in one place so that an old note can ambush a new one. Connection, not collection, is the point.</li>
      <li><b>Protect the unfinished.</b> Resist the urge to resolve a question too quickly. A premature answer ends the search that would have found a better one.</li>
      <li><b>Stay near the edges.</b> The richest hunches form at the borders between fields, where one discipline's dead end is another's open door.</li>
    </ol>

    <p class="reveal" data-reveal="none">None of this is fast, and that is precisely the point. We have built a culture that rewards the announcement and ignores the gestation, that funds the harvest and starves the soil. The work of tending a slow idea is unglamorous, largely invisible, and almost never rewarded in the quarter it actually happens. It is also, quietly, where nearly everything important comes from.<a class="fn" id="r4" href="#n4"><sup>4</sup></a></p>

    <p class="reveal" data-reveal="none">So the next time a breakthrough is announced as if it fell from the sky, remember the pile. Somewhere, for years, somebody kept adding to it — one discarded draft, one stubborn question, one note in the margin at a time — until the morning it finally tipped, and the world mistook a long patience for a sudden flash.</p>

    <div class="end reveal" data-reveal="none" aria-hidden="true">· · ·</div>

    <section class="notes reveal" data-reveal="none" aria-label="Footnotes">
      <h3>Notes</h3>
      <ol>
        <li id="n1">The "tidy myth" of discovery is examined at length in histories of science that contrast the textbook version with the archival record. <a class="back" href="#r1" aria-label="Back to reference 1">↩</a></li>
        <li id="n2">Steven Johnson, <em>Where Good Ideas Come From</em> (2010) — the source of the "slow hunch" framing used throughout this piece. <a class="back" href="#r2" aria-label="Back to reference 2">↩</a></li>
        <li id="n3">On simultaneous (or "multiple") discovery, see Robert K. Merton's classic essays in the sociology of science. <a class="back" href="#r3" aria-label="Back to reference 3">↩</a></li>
        <li id="n4">Figures and timelines in this essay are illustrative composites, drawn to convey the shape of the argument rather than a specific dataset. <a class="back" href="#r4" aria-label="Back to reference 4">↩</a></li>
      </ol>
    </section>

    <aside class="bio reveal">
      <div class="av">
        <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="25" r="12" fill="rgba(255,255,255,0.85)"/><path d="M12 60c2-13 10-19 20-19s18 6 20 19" fill="rgba(255,255,255,0.85)"/></svg>
      </div>
      <div>
        <h4>About the author</h4>
        <div class="name">Marguerite Vance</div>
        <p>Marguerite writes about the history of ideas and the institutions that nurture them. She is a contributing editor at The Reactor and is at work on a book about the long lives of unfinished thoughts.</p>
      </div>
    </aside>
  </div>

  <section class="related">
    <div class="wrap head reveal" data-reveal="none">
      <span class="kicker">Keep reading</span>
      <h2>Related reading</h2>
    </div>
    <div class="wrap">
      <div class="cards">
        <a class="card reveal" href="#" data-reveal="none">
          <div class="thumb">
            <svg viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true"><rect width="320" height="200" fill="#efe7d7"/><g stroke="var(--accent)" stroke-width="2" fill="none" opacity="0.85"><path d="M20,150 C90,150 110,60 160,60 C210,60 230,120 300,90"/></g><circle cx="160" cy="60" r="7" fill="var(--accent)"/></svg>
          </div>
          <div class="meta"><span class="tag">Method</span><div class="ct">The commonplace book, reconsidered</div><div class="cm num">8 min read</div></div>
        </a>
        <a class="card reveal" href="#" data-reveal="none">
          <div class="thumb">
            <svg viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true"><rect width="320" height="200" fill="#e9e0cd"/><g stroke="var(--teal)" stroke-width="2" fill="none"><circle cx="160" cy="100" r="34"/><circle cx="160" cy="100" r="64" opacity="0.6"/></g><circle cx="160" cy="100" r="6" fill="var(--teal)"/></svg>
          </div>
          <div class="meta"><span class="tag">History</span><div class="ct">Fifty years of being wrong on purpose</div><div class="cm num">12 min read</div></div>
        </a>
        <a class="card reveal" href="#" data-reveal="none">
          <div class="thumb">
            <svg viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true"><rect width="320" height="200" fill="#efe7d7"/><g fill="var(--gold)" opacity="0.9"><rect x="40" y="120" width="26" height="50" rx="4"/><rect x="84" y="90" width="26" height="80" rx="4"/><rect x="128" y="60" width="26" height="110" rx="4"/><rect x="172" y="100" width="26" height="70" rx="4"/><rect x="216" y="40" width="26" height="130" rx="4"/></g></svg>
          </div>
          <div class="meta"><span class="tag">Essay</span><div class="ct">Why the best ideas arrive late</div><div class="cm num">9 min read</div></div>
        </a>
      </div>
    </div>
  </section>
</article>
`.trim()

const JS = `
// Smooth-scroll footnote jumps with a brief highlight on the target note,
// and gentle return for the back-arrows. Progressive enhancement only —
// the anchors work natively without this.
(function () {
  function flash(el) {
    if (!el) return;
    el.style.transition = 'background-color 0.5s ease';
    el.style.backgroundColor = 'rgba(178,69,47,0.16)';
    setTimeout(function () { el.style.backgroundColor = ''; }, 1100);
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flash(target.closest('li') || target);
      try { history.replaceState(null, '', '#' + id); } catch (err) {}
    });
  });
})();
`.trim()

export const article: Template = {
  id: 'article',
  kind: 'page',
  name: 'Article',
  tagline: 'A sublime long-form reading experience',
  categories: ['Writing'],
  audiences: ['writer', 'journalist', 'blogger'],
  description:
    'A flagship editorial reading experience for essays and long-form journalism. Warm-paper ground, a committed Newsreader serif at a true ~66ch measure, an oversized drop cap, a pull-quote that breaks the column, an inline generative figure, superscript footnotes that link to a notes section, a fixed share rail, an author bio, and a related-reading trio. A thin reading-progress bar rides the renderer’s scroll variable. Pure CSS/SVG — no images or chart libraries.',
  fonts: {
    display: 'Newsreader',
    body: 'Newsreader',
    links: [
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f6f2ea',
  notes:
    'Editorial long-form template. Palette knobs live in :root: --paper / --paper-2 (warm grounds), --ink / --ink-soft / --ink-faint (text), --accent + --accent-deep (the single terracotta accent — swap both to re-theme), and --gold / --teal (the generative artwork foils). --measure (default 38rem ≈ 66ch) controls the reading column width; widen it for longer lines. Body type is Newsreader at clamp(18–20px)/1.66 — change in .body p. The drop cap is .body .first::first-letter (resize via font-size em). The reading-progress bar width is driven by var(--scroll) from the renderer — no JS needed. Footnotes: a superscript <a class="fn" id="rN" href="#nN"> links to <li id="nN"> in .notes, with a ↩ back-link; the inline JS adds smooth-scroll + a highlight flash. The pull-quote uses negative margins to break the measure (neutralized under 760px). To add a section, copy an <h2> + paragraphs; to add a footnote, add a matching .fn / .notes <li> pair. The hero and inline figure are hand-drawn SVG that animate off .reveal.in — recolor via url(#ho)/stroke values.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f6f2ea',
  },
}
