import type { Template } from '../types'

// A typography-forward blog index on warm paper. Fraunces serif titles + Inter
// meta, a generous ~66ch measure, ONE terracotta accent, and generative SVG
// cover/thumb artwork (no photos). Hover-lift cards, a tag cloud, an about
// blurb, a visual-only newsletter sign-up, and pagination. Pure CSS/SVG.

const CSS = `
:root {
  --paper: #f7f3ec;          /* warm paper */
  --paper-2: #fffdf8;        /* card surface */
  --ink: #211d18;            /* near-black warm ink */
  --soft: #6f6557;           /* muted brown */
  --faint: #9a8f7e;          /* faintest meta */
  --line: rgba(33,29,24,0.10);
  --line-2: rgba(33,29,24,0.06);
  --accent: #c8553d;         /* terracotta */
  --accent-2: #e08a5b;       /* warm tint for gradients */
  --accent-soft: rgba(200,85,61,0.10);
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --measure: 66ch;
}
body { background: var(--paper); color: var(--ink); }
.num { font-variant-numeric: tabular-nums; }
::selection { background: var(--accent-soft); }
a { color: inherit; text-decoration: none; }

.wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 40px); }

/* ---- sticky header ---- */
.site-head {
  position: sticky; top: 0; z-index: 20;
  background: color-mix(in srgb, var(--paper) 86%, transparent);
  -webkit-backdrop-filter: saturate(1.4) blur(10px);
  backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--line);
}
.site-head .wrap { display: flex; align-items: center; gap: 18px; height: 64px; }
.logo { font-family: var(--display); font-weight: 600; font-size: 22px; letter-spacing: -0.02em; }
.logo .mk { color: var(--accent); }
.nav { display: flex; gap: 24px; margin-left: 8px; }
.nav a { font-size: 14px; font-weight: 500; color: var(--soft); transition: color 0.2s; }
.nav a:hover { color: var(--ink); }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.search {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--paper-2); border: 1px solid var(--line); border-radius: 999px;
  padding: 7px 14px; color: var(--faint); font-size: 13px; cursor: text;
}
.search svg { width: 14px; height: 14px; stroke: var(--faint); }
.btn-sub {
  border: 0; cursor: pointer; font: 600 13.5px var(--body);
  color: var(--paper-2); background: var(--ink);
  padding: 9px 16px; border-radius: 999px; transition: transform 0.18s, background 0.2s;
}
.btn-sub:hover { background: var(--accent); transform: translateY(-1px); }
.btn-sub:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---- masthead ---- */
.masthead { padding: clamp(40px, 7vw, 76px) 0 clamp(20px, 4vw, 32px); }
.masthead .eyebrow {
  font-size: 12px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--accent);
}
.masthead h1 {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(34px, 7vw, 64px); line-height: 1.02; letter-spacing: -0.03em;
  margin: 14px 0 0; max-width: 14ch;
}
.masthead h1 em { font-style: italic; }
.masthead p {
  margin: 18px 0 0; max-width: var(--measure);
  font-size: clamp(15px, 2vw, 17px); line-height: 1.6; color: var(--soft);
}

/* ---- featured hero ---- */
.featured {
  display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(20px, 4vw, 48px);
  align-items: center;
  background: var(--paper-2); border: 1px solid var(--line); border-radius: 24px;
  padding: clamp(22px, 3.4vw, 40px); margin-top: 8px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 60px -40px rgba(33,29,24,0.4);
}
.featured .meta-top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--accent); background: var(--accent-soft);
  padding: 5px 11px; border-radius: 999px;
}
.dot-sep { color: var(--faint); }
.featured h2 {
  font-family: var(--display); font-weight: 500;
  font-size: clamp(27px, 4.4vw, 42px); line-height: 1.06; letter-spacing: -0.025em;
  margin: 16px 0 0; max-width: 18ch;
}
.featured h2 a { transition: color 0.2s; }
.featured h2 a:hover { color: var(--accent); }
.featured .excerpt {
  margin: 14px 0 0; font-size: clamp(14.5px, 1.8vw, 16px); line-height: 1.62; color: var(--soft);
  max-width: 52ch;
}
.byline { display: flex; align-items: center; gap: 10px; margin-top: 22px; font-size: 13.5px; color: var(--soft); }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; flex: none;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 13px;
  font-family: var(--display);
}
.byline b { color: var(--ink); font-weight: 600; }
.read-on {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 22px;
  font-weight: 600; font-size: 14px; color: var(--accent);
}
.read-on svg { width: 15px; height: 15px; stroke: var(--accent); transition: transform 0.22s; }
.featured:hover .read-on svg { transform: translateX(4px); }

/* generative cover art (SVG) */
.cover { width: 100%; aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; margin: 0;
  background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: block; }
.cover svg { display: block; width: 100%; height: 100%; }

/* ---- section heading ---- */
.sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
  margin: clamp(48px, 7vw, 80px) 0 22px; }
.sec-head h3 { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 3vw, 27px);
  letter-spacing: -0.02em; margin: 0; }
.sec-head .all { font-size: 13.5px; font-weight: 600; color: var(--accent); }

/* ---- layout: list + rail ---- */
.layout { display: grid; grid-template-columns: 1fr 296px; gap: clamp(24px, 4vw, 56px); align-items: start; }

/* post list */
.posts { display: flex; flex-direction: column; }
.post {
  display: grid; grid-template-columns: 132px 1fr; gap: 22px; align-items: center;
  padding: 24px 16px; margin: 0 -16px; border-radius: 18px;
  border-bottom: 1px solid var(--line-2);
  transition: transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s, background 0.22s;
}
.post:hover {
  transform: translateY(-3px);
  background: var(--paper-2);
  box-shadow: 0 24px 50px -36px rgba(33,29,24,0.45);
  border-bottom-color: transparent;
}
.thumb { width: 132px; height: 99px; border-radius: 12px; overflow: hidden; flex: none;
  margin: 0; background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
.thumb svg { display: block; width: 100%; height: 100%; }
.post .body { min-width: 0; }
.post .kt { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--faint); margin-bottom: 7px; }
.tag { font-size: 11.5px; font-weight: 600; color: var(--soft);
  background: var(--paper); border: 1px solid var(--line); padding: 3px 9px; border-radius: 999px; }
.post h4 { font-family: var(--display); font-weight: 500; font-size: clamp(18px, 2.4vw, 22px);
  line-height: 1.16; letter-spacing: -0.018em; margin: 0; }
.post h4 a { transition: color 0.2s; }
.post:hover h4 a { color: var(--accent); }
.post .ex { margin: 7px 0 0; font-size: 14px; line-height: 1.5; color: var(--soft);
  max-width: 56ch; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

/* ---- pagination ---- */
.pager { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 40px; }
.pager a, .pager span {
  min-width: 38px; height: 38px; padding: 0 6px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; color: var(--soft);
  border: 1px solid var(--line); background: var(--paper-2); cursor: pointer; transition: all 0.18s;
}
.pager a:hover { color: var(--ink); border-color: var(--ink); }
.pager .on { background: var(--ink); color: var(--paper-2); border-color: var(--ink); }
.pager .gap { border: 0; background: transparent; cursor: default; }
.pager .nav-a { font-weight: 500; gap: 6px; padding: 0 14px; }

/* ---- rail ---- */
.rail { display: flex; flex-direction: column; gap: 20px; position: sticky; top: 84px; }
.card { background: var(--paper-2); border: 1px solid var(--line); border-radius: 18px; padding: 22px; }
.card h5 { font-family: var(--display); font-weight: 600; font-size: 16px; letter-spacing: -0.01em; margin: 0 0 14px; }
.cloud { display: flex; flex-wrap: wrap; gap: 8px; }
.cloud a {
  font-size: 13px; font-weight: 500; color: var(--soft);
  background: var(--paper); border: 1px solid var(--line); padding: 6px 11px; border-radius: 999px;
  transition: all 0.18s;
}
.cloud a:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }
.cloud a .n { color: var(--faint); margin-left: 4px; font-size: 11.5px; }
.about p { font-size: 13.5px; line-height: 1.62; color: var(--soft); margin: 0; }
.about .who { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; }
.about .who b { font-family: var(--body); font-size: 14px; color: var(--ink); }
.about .who span { display: block; font-size: 12px; color: var(--faint); font-weight: 500; }

/* ---- newsletter strip ---- */
.news {
  margin: clamp(56px, 8vw, 96px) 0 0; border-radius: 26px; overflow: hidden;
  background: radial-gradient(120% 140% at 90% 0%, var(--accent-2), var(--accent) 55%, #a83f2c);
  color: #fff; padding: clamp(30px, 5vw, 54px); position: relative;
}
.news::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 80% at 12% 110%, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none; }
.news .inner { position: relative; max-width: 560px; }
.news .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.85; }
.news h3 { font-family: var(--display); font-weight: 500; font-size: clamp(24px, 4vw, 36px);
  line-height: 1.08; letter-spacing: -0.02em; margin: 12px 0 0; }
.news p { font-size: 15px; line-height: 1.55; opacity: 0.92; margin: 12px 0 0; max-width: 44ch; }
.form { display: flex; gap: 10px; margin-top: 22px; max-width: 440px; }
.form input {
  flex: 1; min-width: 0; border: 0; border-radius: 12px; padding: 13px 16px;
  font: 500 15px var(--body); color: var(--ink); background: rgba(255,255,255,0.95);
}
.form input::placeholder { color: var(--faint); }
.form input:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.form button {
  border: 0; cursor: pointer; border-radius: 12px; padding: 13px 20px;
  font: 700 14.5px var(--body); color: var(--accent); background: #fff; white-space: nowrap;
  transition: transform 0.18s, background 0.2s, color 0.2s;
}
.form button:hover { transform: translateY(-1px); }
.form button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.form.done button { background: var(--ink); color: #fff; }
.form .hint { margin-top: 12px; font-size: 12.5px; opacity: 0.8; }

/* ---- footer ---- */
.foot { margin: clamp(48px, 7vw, 80px) 0 0; border-top: 1px solid var(--line); padding: 40px 0 56px; }
.foot .wrap-f { display: flex; align-items: flex-start; justify-content: space-between; gap: 28px; flex-wrap: wrap; }
.foot .logo { font-size: 19px; }
.foot p { font-size: 13px; color: var(--soft); margin: 10px 0 0; max-width: 34ch; line-height: 1.55; }
.foot .cols { display: flex; gap: clamp(28px, 5vw, 60px); flex-wrap: wrap; }
.foot .col h6 { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--faint); margin: 0 0 12px; }
.foot .col a { display: block; font-size: 14px; color: var(--soft); margin-bottom: 9px; transition: color 0.2s; }
.foot .col a:hover { color: var(--accent); }
.foot .legal { margin-top: 36px; font-size: 12.5px; color: var(--faint); }

/* reveal accents */
.reveal { will-change: opacity, transform; }

/* ---- responsive ---- */
@media (max-width: 820px) {
  .nav { display: none; }
  .featured { grid-template-columns: 1fr; }
  .featured .cover { order: -1; aspect-ratio: 16 / 9; }
  .layout { grid-template-columns: 1fr; }
  .rail { position: static; flex-direction: column; }
}
@media (max-width: 560px) {
  .site-head .wrap { gap: 12px; }
  .search { display: none; }
  .post { grid-template-columns: 1fr; gap: 14px; }
  .thumb { width: 100%; height: 160px; }
  .post .ex { -webkit-line-clamp: 2; }
  .form { flex-direction: column; }
  .pager .nav-a span { display: none; }
}
`.trim()

const HTML = `
<header class="site-head">
  <div class="wrap">
    <a class="logo" href="#">The Slow <span class="mk">Build</span></a>
    <nav class="nav">
      <a href="#">Essays</a>
      <a href="#">Craft</a>
      <a href="#">Field Notes</a>
      <a href="#">Archive</a>
    </nav>
    <div class="head-actions">
      <span class="search" tabindex="0">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        Search
      </span>
      <button class="btn-sub" id="sub-top">Subscribe</button>
    </div>
  </div>
</header>

<main class="wrap">
  <section class="masthead reveal" data-reveal="none">
    <div class="eyebrow">Notes on making things well</div>
    <h1>Writing about <em>craft</em>, patience, and the work between the work.</h1>
    <p>A small, unhurried journal about software, design, and the slow practice of getting better. New essays most Sundays — no growth hacks, no hot takes, just things worth keeping.</p>
  </section>

  <article class="featured reveal" data-reveal="scale">
    <div class="lead">
      <div class="meta-top">
        <span class="chip">Featured · Essay</span>
        <span class="dot-sep">·</span>
        <span style="font-size:13px;color:var(--faint)">June 28, 2026 · 11 min read</span>
      </div>
      <h2><a href="#">The Cost of a Clever Abstraction</a></h2>
      <p class="excerpt">We reach for abstraction to save our future selves work — but the bill often comes due in comprehension. A field guide to knowing when a layer earns its keep, and when it's just hiding the thing you actually need to understand.</p>
      <div class="byline">
        <span class="avatar">EM</span>
        <span>by <b>Elena Mór</b> · in <b>Craft</b></span>
      </div>
      <a class="read-on" href="#">Read the essay
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
    <figure class="cover">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Abstract terracotta cover artwork of nested arcs">
        <defs>
          <linearGradient id="cov" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e08a5b"/><stop offset="1" stop-color="#a83f2c"/>
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#cov)"/>
        <g fill="none" stroke="#fff" stroke-opacity="0.32" stroke-width="1.5">
          <circle cx="300" cy="60" r="40"/><circle cx="300" cy="60" r="74"/>
          <circle cx="300" cy="60" r="108"/><circle cx="300" cy="60" r="142"/>
          <circle cx="300" cy="60" r="176"/>
        </g>
        <g stroke="#fff" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round">
          <path d="M40 230 C110 150 150 250 230 170 C290 110 330 200 380 140" fill="none"/>
        </g>
        <circle cx="40" cy="230" r="6" fill="#fff" fill-opacity="0.85"/>
        <circle cx="380" cy="140" r="5" fill="#211d18" fill-opacity="0.55"/>
      </svg>
    </figure>
  </article>

  <div class="sec-head reveal" data-reveal="none">
    <h3>Latest</h3>
    <a class="all" href="#">All essays →</a>
  </div>

  <div class="layout">
    <div class="posts">

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e08a5b"/><stop offset="1" stop-color="#c8553d"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t1)"/>
            <g stroke="#fff" stroke-opacity="0.4" stroke-width="1.4" fill="none">
              <path d="M-5 70 Q33 30 66 55 T140 40"/><path d="M-5 86 Q33 50 66 72 T140 60"/>
            </g>
            <circle cx="100" cy="30" r="14" fill="#fff" fill-opacity="0.85"/>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Craft</span> <span class="dot-sep">·</span> <span class="num">June 22</span> <span class="dot-sep">·</span> <span class="num">8 min</span></div>
          <h4><a href="#">Naming Things Is the Whole Job</a></h4>
          <p class="ex">If you can name it precisely, you usually understand it — and if you can't, no amount of code will rescue the design.</p>
        </div>
      </article>

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t2" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#c8553d"/><stop offset="1" stop-color="#e08a5b"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t2)"/>
            <g stroke="#fff" stroke-opacity="0.38" stroke-width="1.4" fill="none">
              <rect x="14" y="14" width="104" height="71" rx="8"/><rect x="30" y="30" width="72" height="39" rx="6"/>
            </g>
            <circle cx="66" cy="49" r="9" fill="#211d18" fill-opacity="0.4"/>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Design</span> <span class="dot-sep">·</span> <span class="num">June 15</span> <span class="dot-sep">·</span> <span class="num">6 min</span></div>
          <h4><a href="#">The Quiet Power of a Generous Margin</a></h4>
          <p class="ex">Whitespace isn't empty — it's the part of the page doing the listening. A short defense of restraint.</p>
        </div>
      </article>

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e08a5b"/><stop offset="1" stop-color="#a83f2c"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t3)"/>
            <g stroke="#fff" stroke-opacity="0.42" stroke-width="2" stroke-linecap="round">
              <path d="M22 80 L44 40 L66 64 L88 26 L110 52"/>
            </g>
            <circle cx="88" cy="26" r="4.5" fill="#fff"/>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Field Notes</span> <span class="dot-sep">·</span> <span class="num">June 9</span> <span class="dot-sep">·</span> <span class="num">5 min</span></div>
          <h4><a href="#">Shipping Is a Skill You Practice</a></h4>
          <p class="ex">Finishing has its own muscles. Here's the small ritual that helps me cross the last, hardest ten percent.</p>
        </div>
      </article>

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t4" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d96f4c"/><stop offset="1" stop-color="#b84830"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t4)"/>
            <g fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1.4">
              <circle cx="40" cy="50" r="30"/><circle cx="92" cy="50" r="30"/>
            </g>
            <circle cx="66" cy="50" r="6" fill="#211d18" fill-opacity="0.45"/>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Essay</span> <span class="dot-sep">·</span> <span class="num">June 1</span> <span class="dot-sep">·</span> <span class="num">9 min</span></div>
          <h4><a href="#">Two Kinds of Done</a></h4>
          <p class="ex">There's the done that ships and the done that's finished. Learning to tell them apart changed how I work.</p>
        </div>
      </article>

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t5" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e08a5b"/><stop offset="1" stop-color="#c8553d"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t5)"/>
            <g stroke="#fff" stroke-opacity="0.4" stroke-width="1.4">
              <line x1="20" y1="22" x2="112" y2="22"/><line x1="20" y1="42" x2="92" y2="42"/>
              <line x1="20" y1="62" x2="112" y2="62"/><line x1="20" y1="80" x2="74" y2="80"/>
            </g>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Craft</span> <span class="dot-sep">·</span> <span class="num">May 25</span> <span class="dot-sep">·</span> <span class="num">7 min</span></div>
          <h4><a href="#">Read the Code You Already Wrote</a></h4>
          <p class="ex">The cheapest way to write better is to reread yesterday's work as a stranger would. A weekly habit.</p>
        </div>
      </article>

      <article class="post reveal">
        <figure class="thumb">
          <svg viewBox="0 0 132 99" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative thumbnail">
            <defs><linearGradient id="t6" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#b84830"/><stop offset="1" stop-color="#e08a5b"/></linearGradient></defs>
            <rect width="132" height="99" fill="url(#t6)"/>
            <g fill="#fff" fill-opacity="0.7">
              <rect x="22" y="58" width="14" height="26" rx="3"/><rect x="44" y="42" width="14" height="42" rx="3"/>
              <rect x="66" y="30" width="14" height="54" rx="3"/><rect x="88" y="48" width="14" height="36" rx="3"/>
            </g>
          </svg>
        </figure>
        <div class="body">
          <div class="kt"><span class="tag">Field Notes</span> <span class="dot-sep">·</span> <span class="num">May 18</span> <span class="dot-sep">·</span> <span class="num">4 min</span></div>
          <h4><a href="#">A Month Without Dashboards</a></h4>
          <p class="ex">What happened when I stopped measuring everything and started paying attention instead.</p>
        </div>
      </article>

    </div>

    <aside class="rail">
      <div class="card reveal" data-reveal="right">
        <h5>Topics</h5>
        <div class="cloud">
          <a href="#">Craft <span class="n num">18</span></a>
          <a href="#">Design <span class="n num">12</span></a>
          <a href="#">Writing <span class="n num">9</span></a>
          <a href="#">Tools <span class="n num">7</span></a>
          <a href="#">Process <span class="n num">11</span></a>
          <a href="#">Focus <span class="n num">6</span></a>
          <a href="#">Field Notes <span class="n num">14</span></a>
          <a href="#">Reading <span class="n num">5</span></a>
        </div>
      </div>
      <div class="card about reveal" data-reveal="right">
        <h5>About this blog</h5>
        <div class="who">
          <span class="avatar">EM</span>
          <span><b>Elena Mór</b><span>Writer &amp; engineer · Lisbon</span></span>
        </div>
        <p>The Slow Build is a personal journal about doing careful work in a hurried industry. I write to think — about craft, design, and the long game of getting good at something. Pull up a chair.</p>
      </div>
    </aside>
  </div>

  <div class="pager reveal" data-reveal="none">
    <a class="nav-a" href="#"><span>Newer</span></a>
    <span class="on">1</span>
    <a href="#">2</a>
    <a href="#">3</a>
    <span class="gap">…</span>
    <a href="#">9</a>
    <a class="nav-a" href="#"><span>Older</span> →</a>
  </div>

  <section class="news reveal" data-reveal="scale">
    <div class="inner">
      <div class="eyebrow">The Sunday letter</div>
      <h3>One essay, every Sunday. Nothing else.</h3>
      <p>Join 6,400 makers reading along. No spam, no sponsors — unsubscribe in a click whenever the spirit moves you.</p>
      <form class="form" id="news-form" novalidate>
        <input type="email" id="news-email" placeholder="you@example.com" aria-label="Email address" autocomplete="email" />
        <button type="submit" id="news-btn">Subscribe</button>
      </form>
      <div class="hint" id="news-hint">We'll only ever email on Sundays.</div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <div class="wrap-f">
      <div>
        <div class="logo">The Slow <span class="mk">Build</span></div>
        <p>A quiet journal on craft, design, and patient work. Written by hand in Lisbon.</p>
      </div>
      <div class="cols">
        <div class="col">
          <h6>Read</h6>
          <a href="#">Latest</a><a href="#">Essays</a><a href="#">Craft</a><a href="#">Archive</a>
        </div>
        <div class="col">
          <h6>Follow</h6>
          <a href="#">RSS feed</a><a href="#">Newsletter</a><a href="#">Mastodon</a><a href="#">Bluesky</a>
        </div>
        <div class="col">
          <h6>More</h6>
          <a href="#">About</a><a href="#">Colophon</a><a href="#">Now</a><a href="#">Contact</a>
        </div>
      </div>
    </div>
    <div class="legal">© 2026 The Slow Build · Set in Fraunces &amp; Inter · Made slowly, on purpose.</div>
  </div>
</footer>
`.trim()

const JS = `
// Newsletter sign-up — visual only, no network.
(function () {
  var form = document.getElementById('news-form');
  var btn = document.getElementById('news-btn');
  var email = document.getElementById('news-email');
  var hint = document.getElementById('news-hint');
  if (!form || !btn || !email) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.classList.contains('done')) return;
    var val = (email.value || '').trim();
    var ok = /.+@.+\\..+/.test(val);
    if (!ok) {
      email.focus();
      if (hint) hint.textContent = 'Please enter a valid email address.';
      return;
    }
    form.classList.add('done');
    btn.textContent = 'Subscribed \\u2713';
    email.value = '';
    email.placeholder = val;
    email.setAttribute('disabled', 'disabled');
    if (hint) hint.textContent = 'You\\u2019re in. See you Sunday.';
  });
})();

// Subscribe button in header gently focuses the sign-up form.
(function () {
  var top = document.getElementById('sub-top');
  var email = document.getElementById('news-email');
  if (!top || !email) return;
  top.addEventListener('click', function () {
    email.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { try { email.focus(); } catch (e) {} }, 420);
  });
})();
`.trim()

export const blog: Template = {
  id: 'blog',
  kind: 'page',
  name: 'Blog',
  tagline: 'A typography-forward blog index',
  categories: ['Writing'],
  audiences: ['writer', 'blogger', 'personal'],
  description:
    'A typography-forward blog home on warm paper: a sticky serif masthead, a featured-essay hero with generative SVG cover art, a Latest list of posts with gradient thumbnails and hover-lift, a Topics tag cloud and About rail, a working visual-only newsletter sign-up, pagination, and a quiet footer. Set in Fraunces and Inter with a single terracotta accent and a generous ~66ch measure — every visual is hand-rolled CSS/SVG.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f7f3ec',
  notes:
    'Typography-forward blog index. PALETTE KNOBS (all in :root): `--paper`/`--paper-2` are the warm paper + card surfaces, `--ink` the text, `--accent`/`--accent-2`/`--accent-soft` the single terracotta accent (recolor these three to re-theme the whole page — chips, links, cover art, and the newsletter strip all derive from them). `--measure` (~66ch) controls the reading line length. TYPE: `--display` is Fraunces (titles, set in 500 weight with optional `<em>` italic), `--body` is Inter (meta + UI). To ADD A POST, copy one `<article class="post">` block — give its thumbnail a unique gradient id (t1, t2, …) and swap the tag/date/min/title/excerpt. The featured hero is the `.featured` article; its cover is a self-contained inline SVG you can redraw. The newsletter form is visual-only (no network) and flips to a "Subscribed ✓" state via JS. Cover/thumb art are pure inline SVG gradients + strokes — no images.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f7f3ec',
  },
}
