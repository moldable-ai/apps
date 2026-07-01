import type { Template } from '../types'

// A friendly-academic course landing page that sells an online class. Warm
// terracotta accent over a paper-cream canvas, a serif display + clean sans
// body. Hero with stat row, a "what you'll learn" check grid, an expandable
// curriculum accordion (JS), instructor card with a hand-rolled gradient avatar,
// testimonials, an enroll/pricing card, and an FAQ accordion. Pure CSS/SVG — no
// imagery, no chart libs. Fully responsive 380px → wide desktop.

const CSS = `
:root {
  --bg: #f7f2ea;          /* paper cream */
  --bg-2: #fffaf3;        /* lighter card */
  --ink: #20180f;         /* warm near-black */
  --mut: #6f6356;         /* muted brown-grey */
  --faint: #a99b8b;       /* hairline text */
  --line: #e7ddcf;        /* warm hairline */
  --accent: #c2622e;      /* terracotta */
  --accent-2: #e08a4d;    /* soft amber */
  --accent-ink: #8c3d16;  /* deep terracotta text */
  --leaf: #6b7b52;        /* sage, secondary */
  --gold: #e0a13a;        /* star gold */
  --grad: linear-gradient(125deg, var(--accent), var(--accent-2));
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background:
  radial-gradient(900px 520px at 88% -8%, rgba(224,138,77,0.16), transparent 60%),
  radial-gradient(760px 480px at -6% 8%, rgba(107,123,82,0.10), transparent 55%),
  var(--bg); color: var(--ink); }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 36px); }
.section { padding: clamp(46px, 7vw, 84px) 0; }
a { color: inherit; }
:focus-visible { outline: 2.5px solid var(--accent); outline-offset: 3px; border-radius: 6px; }

/* ---------- top nav ---------- */
.nav { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--bg) 82%, transparent); border-bottom: 1px solid var(--line); }
.nav .wrap { display: flex; align-items: center; gap: 14px; height: 64px; }
.logo { display: inline-flex; align-items: center; gap: 11px; font-family: var(--display);
  font-weight: 600; font-size: 19px; letter-spacing: -0.01em; }
.logo .mark { width: 30px; height: 30px; border-radius: 9px; background: var(--grad);
  display: grid; place-items: center; color: #fff; box-shadow: 0 8px 20px -8px var(--accent); }
.nav .links { margin-left: auto; display: flex; gap: 26px; font-size: 14px; font-weight: 500; color: var(--mut); }
.nav .links a { text-decoration: none; }
.nav .links a:hover { color: var(--ink); }
.nav .cta { margin-left: 8px; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  font: 600 15px/1 var(--body); padding: 13px 22px; border-radius: 12px; border: 0; cursor: pointer;
  text-decoration: none; transition: transform 0.16s ease, box-shadow 0.2s ease, background 0.2s ease; }
.btn.primary { background: var(--grad); color: #fff; box-shadow: 0 12px 28px -10px var(--accent); }
.btn.primary:hover { transform: translateY(-2px); box-shadow: 0 18px 34px -12px var(--accent); }
.btn.ghost { background: var(--bg-2); color: var(--ink); border: 1px solid var(--line); }
.btn.ghost:hover { transform: translateY(-2px); border-color: var(--accent); }
.btn.sm { padding: 9px 16px; font-size: 13.5px; border-radius: 10px; }
.btn.block { width: 100%; padding: 16px; font-size: 16px; }

/* ---------- hero ---------- */
.hero { padding-top: clamp(40px, 6vw, 70px); position: relative; overflow: hidden; }
.pill { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-ink);
  background: color-mix(in srgb, var(--accent) 14%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
  padding: 7px 14px; border-radius: 999px; }
.pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.hero h1 { font-family: var(--display); font-weight: 600; font-size: clamp(38px, 6.4vw, 76px);
  line-height: 1.02; letter-spacing: -0.025em; margin: 22px 0 0; max-width: 16ch; text-wrap: balance; }
.hero h1 em { font-style: italic; color: var(--accent); font-feature-settings: 'swsh' 1; }
.hero .lede { font-size: clamp(16px, 2.1vw, 19.5px); line-height: 1.6; color: var(--mut);
  margin: 22px 0 0; max-width: 54ch; }
.hero .actions { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 30px; align-items: center; }
.trial { font-size: 13px; color: var(--faint); display: inline-flex; align-items: center; gap: 7px; }

/* hero stat row */
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 44px;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 26px 0; }
.stat .v { font-family: var(--display); font-weight: 600; font-size: clamp(26px, 4vw, 34px);
  letter-spacing: -0.02em; display: inline-flex; align-items: baseline; gap: 6px; }
.stat .v .star { color: var(--gold); font-size: 0.74em; }
.stat .k { color: var(--mut); font-size: 13px; margin-top: 5px; }

/* signature: floating brush palette in hero corner */
.palette { position: absolute; right: clamp(-40px, -2vw, 0px); top: clamp(40px, 8vw, 90px);
  width: clamp(150px, 22vw, 270px); aspect-ratio: 1; pointer-events: none; opacity: 0.96;
  filter: drop-shadow(0 24px 40px rgba(140,61,22,0.18)); }
.palette .swatch { transform-origin: center; }
.reveal.in .palette .swatch { animation: pop 0.7s cubic-bezier(0.34,1.56,0.64,1) backwards; }
.palette .swatch:nth-child(1){ animation-delay: 0.05s; } .palette .swatch:nth-child(2){ animation-delay: 0.13s; }
.palette .swatch:nth-child(3){ animation-delay: 0.21s; } .palette .swatch:nth-child(4){ animation-delay: 0.29s; }
.palette .swatch:nth-child(5){ animation-delay: 0.37s; } .palette .swatch:nth-child(6){ animation-delay: 0.45s; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }

/* ---------- section header ---------- */
.shead { max-width: 60ch; }
.kicker { display: inline-flex; align-items: center; gap: 11px; font-size: 12.5px; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent-ink); }
.kicker::before { content: ''; width: 26px; height: 2px; background: var(--accent); border-radius: 2px; }
.shead h2 { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 4.4vw, 46px);
  letter-spacing: -0.02em; line-height: 1.05; margin: 16px 0 0; text-wrap: balance; }
.shead p { color: var(--mut); font-size: clamp(15px, 1.8vw, 17px); line-height: 1.6; margin: 14px 0 0; }

/* ---------- learn grid ---------- */
.learn-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 38px; }
.learn { display: flex; gap: 14px; background: var(--bg-2); border: 1px solid var(--line);
  border-radius: 16px; padding: 20px 22px; transition: transform 0.18s ease, border-color 0.2s ease; }
.learn:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent) 40%, var(--line)); }
.learn .check { flex: none; width: 30px; height: 30px; border-radius: 9px; background: color-mix(in srgb, var(--leaf) 16%, transparent);
  display: grid; place-items: center; color: var(--leaf); }
.learn b { font-size: 15.5px; font-weight: 600; display: block; }
.learn span { font-size: 13.5px; color: var(--mut); line-height: 1.5; display: block; margin-top: 4px; }

/* ---------- curriculum accordion ---------- */
.curric { margin-top: 36px; }
.cmeta { display: flex; flex-wrap: wrap; gap: 10px 22px; color: var(--mut); font-size: 13.5px; margin-bottom: 18px; }
.cmeta b { color: var(--ink); }
.module { border: 1px solid var(--line); border-radius: 16px; background: var(--bg-2); margin-bottom: 12px; overflow: hidden; }
.module > .mhead { display: flex; align-items: center; gap: 16px; width: 100%; text-align: left;
  background: transparent; border: 0; cursor: pointer; padding: 18px 20px; font: inherit; color: inherit; }
.module .mnum { flex: none; width: 34px; height: 34px; border-radius: 10px; font-family: var(--display);
  font-weight: 600; font-size: 15px; display: grid; place-items: center;
  background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent-ink); }
.module .mtitle { flex: 1; min-width: 0; }
.module .mtitle b { font-size: 16.5px; font-weight: 600; display: block; letter-spacing: -0.01em; }
.module .mtitle span { font-size: 13px; color: var(--faint); display: block; margin-top: 2px; }
.module .mdur { font-size: 13px; color: var(--mut); font-variant-numeric: tabular-nums; white-space: nowrap; }
.module .chev { flex: none; color: var(--faint); transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); }
.module.open .chev { transform: rotate(180deg); color: var(--accent); }
.module .lessons { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.36s cubic-bezier(0.22,1,0.36,1); }
.module.open .lessons { grid-template-rows: 1fr; }
.module .lessons > div { overflow: hidden; }
.module ul { list-style: none; margin: 0; padding: 0 20px 8px; }
.module li { display: flex; align-items: center; gap: 13px; padding: 11px 0; border-top: 1px solid var(--line); font-size: 14.5px; }
.module li .ic { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; }
.module li .ic.play { background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); }
.module li .ic.lock { background: color-mix(in srgb, var(--faint) 18%, transparent); color: var(--faint); }
.module li .lname { flex: 1; min-width: 0; }
.module li.free .tag { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--leaf); background: color-mix(in srgb, var(--leaf) 15%, transparent); padding: 3px 7px; border-radius: 6px; }
.module li .ltime { color: var(--faint); font-size: 12.5px; font-variant-numeric: tabular-nums; }

/* ---------- instructor ---------- */
.inst { display: grid; grid-template-columns: 200px 1fr; gap: clamp(22px, 4vw, 44px); align-items: center;
  background: var(--bg-2); border: 1px solid var(--line); border-radius: 24px; padding: clamp(24px, 4vw, 40px); margin-top: 36px; }
.avatar { width: 200px; height: 200px; border-radius: 22px; background: var(--grad); position: relative; overflow: hidden;
  box-shadow: 0 22px 44px -18px var(--accent); }
.avatar svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.inst .who { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.4vw, 30px); letter-spacing: -0.02em; }
.inst .role { color: var(--accent-ink); font-weight: 600; font-size: 14px; margin-top: 4px; }
.inst .bio { color: var(--mut); font-size: 15px; line-height: 1.65; margin: 14px 0 0; max-width: 60ch; }
.inst .creds { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 20px; }
.inst .cred { font-size: 13px; color: var(--mut); }
.inst .cred b { font-family: var(--display); font-weight: 600; font-size: 22px; color: var(--ink); display: block; letter-spacing: -0.01em; }

/* ---------- testimonials ---------- */
.quotes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 38px; }
.quote { background: var(--bg-2); border: 1px solid var(--line); border-radius: 18px; padding: 24px 24px 22px; }
.quote .stars { color: var(--gold); font-size: 14px; letter-spacing: 2px; }
.quote p { font-size: 15px; line-height: 1.6; margin: 14px 0 18px; color: var(--ink); }
.quote .by { display: flex; align-items: center; gap: 11px; }
.quote .by .pic { width: 36px; height: 36px; border-radius: 50%; flex: none; }
.quote .by b { font-size: 13.5px; font-weight: 600; display: block; }
.quote .by span { font-size: 12.5px; color: var(--faint); display: block; }

/* ---------- enroll / pricing ---------- */
.enroll { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(24px, 4vw, 44px); align-items: center;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 7%, var(--bg-2)), var(--bg-2));
  border: 1px solid var(--line); border-radius: 28px; padding: clamp(26px, 4vw, 48px); margin-top: 12px; }
.enroll .sell h3 { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.4vw, 32px);
  letter-spacing: -0.02em; line-height: 1.1; }
.enroll .incl { list-style: none; margin: 22px 0 0; padding: 0; display: grid; gap: 12px; }
.enroll .incl li { display: flex; gap: 11px; font-size: 14.5px; color: var(--ink); align-items: flex-start; }
.enroll .incl li svg { flex: none; color: var(--leaf); margin-top: 1px; }
.card { background: var(--bg-2); border: 1px solid var(--line); border-radius: 22px; padding: 28px;
  box-shadow: 0 30px 60px -30px rgba(140,61,22,0.3); }
.card .ribbon { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase; color: var(--accent-ink);
  background: color-mix(in srgb, var(--accent) 14%, transparent); padding: 6px 12px; border-radius: 999px; }
.price { display: flex; align-items: baseline; gap: 12px; margin: 18px 0 2px; }
.price .now { font-family: var(--display); font-weight: 600; font-size: clamp(40px, 6vw, 56px); letter-spacing: -0.03em; }
.price .was { color: var(--faint); text-decoration: line-through; font-size: 20px; font-variant-numeric: tabular-nums; }
.price .save { font-size: 12px; font-weight: 700; color: var(--leaf); background: color-mix(in srgb, var(--leaf) 14%, transparent);
  padding: 4px 9px; border-radius: 8px; align-self: center; }
.card .note { font-size: 13px; color: var(--mut); margin: 4px 0 20px; }
.card .mini { list-style: none; margin: 0 0 22px; padding: 0; display: grid; gap: 10px; }
.card .mini li { display: flex; gap: 10px; font-size: 13.5px; color: var(--mut); align-items: center; }
.card .mini li svg { flex: none; color: var(--accent); }
.guarantee { display: flex; align-items: center; gap: 12px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); }
.guarantee .badge { flex: none; width: 44px; height: 44px; }
.guarantee b { font-size: 13.5px; display: block; }
.guarantee span { font-size: 12.5px; color: var(--mut); display: block; margin-top: 2px; }

/* ---------- faq ---------- */
.faq { margin-top: 34px; max-width: 760px; }
.qa { border-bottom: 1px solid var(--line); }
.qa button { display: flex; align-items: center; gap: 16px; width: 100%; text-align: left;
  background: transparent; border: 0; cursor: pointer; padding: 22px 4px; font: inherit; color: inherit; }
.qa .q { flex: 1; font-size: clamp(15.5px, 2vw, 17.5px); font-weight: 600; font-family: var(--display); letter-spacing: -0.01em; }
.qa .pm { flex: none; width: 24px; height: 24px; position: relative; color: var(--accent); }
.qa .pm::before, .qa .pm::after { content: ''; position: absolute; background: currentColor; border-radius: 2px;
  top: 50%; left: 50%; transform: translate(-50%, -50%); transition: transform 0.3s ease; }
.qa .pm::before { width: 14px; height: 2px; } .qa .pm::after { width: 2px; height: 14px; }
.qa.open .pm::after { transform: translate(-50%, -50%) scaleY(0); }
.qa .ans { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.34s cubic-bezier(0.22,1,0.36,1); }
.qa.open .ans { grid-template-rows: 1fr; }
.qa .ans > div { overflow: hidden; }
.qa .ans p { margin: 0 0 22px; color: var(--mut); font-size: 15px; line-height: 1.65; max-width: 64ch; }

/* ---------- final cta band ---------- */
.band { background: var(--ink); color: #f7f2ea; border-radius: 28px; padding: clamp(34px, 5vw, 60px);
  text-align: center; position: relative; overflow: hidden; }
.band::after { content: ''; position: absolute; inset: 0;
  background: radial-gradient(560px 280px at 50% 130%, rgba(224,138,77,0.4), transparent 60%); pointer-events: none; }
.band h2 { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 4.4vw, 44px);
  letter-spacing: -0.02em; line-height: 1.08; position: relative; }
.band p { color: rgba(247,242,234,0.72); font-size: clamp(15px, 1.9vw, 17px); margin: 14px auto 0; max-width: 52ch; position: relative; }
.band .actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 13px; margin-top: 28px; position: relative; }
.band .btn.ghost { background: rgba(247,242,234,0.08); color: #f7f2ea; border-color: rgba(247,242,234,0.22); }

/* ---------- footer ---------- */
.foot { border-top: 1px solid var(--line); margin-top: clamp(46px, 7vw, 84px); }
.foot .wrap { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; padding-top: 30px; padding-bottom: 40px; }
.foot .logo { font-size: 17px; }
.foot nav { margin-left: auto; display: flex; flex-wrap: wrap; gap: 22px; font-size: 13.5px; color: var(--mut); }
.foot nav a { text-decoration: none; } .foot nav a:hover { color: var(--ink); }
.foot .copy { width: 100%; color: var(--faint); font-size: 12.5px; padding-top: 8px; }

/* ---------- responsive ---------- */
@media (max-width: 820px) {
  .nav .links { display: none; }
  .palette { display: none; }
  .stats { grid-template-columns: repeat(2, 1fr); gap: 22px 14px; }
  .learn-grid { grid-template-columns: 1fr; }
  .inst { grid-template-columns: 1fr; text-align: left; }
  .avatar { width: 120px; height: 120px; }
  .quotes { grid-template-columns: 1fr; }
  .enroll { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .nav .wrap { height: 58px; }
  .nav .cta { display: none; }
  .hero .actions .btn { flex: 1 1 auto; }
  .stat .v { font-size: 24px; }
  .module > .mhead { gap: 12px; padding: 15px 15px; }
  .module .mdur { display: none; }
  .price .now { font-size: 42px; }
  .inst .creds { gap: 16px; }
}
`.trim()

const HTML = `
<header class="nav">
  <div class="wrap">
    <span class="logo"><span class="mark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7c4-2 12-2 16 0v12c-4-2-12-2-16 0V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.2v12.6" stroke="currentColor" stroke-width="2"/></svg>
    </span> Atelier</span>
    <nav class="links">
      <a href="#learn">What you'll learn</a>
      <a href="#curriculum">Curriculum</a>
      <a href="#instructor">Instructor</a>
      <a href="#pricing">Pricing</a>
    </nav>
    <a href="#pricing" class="btn primary sm cta">Enroll now</a>
  </div>
</header>

<main class="wrap">

  <!-- HERO -->
  <section class="hero section reveal" data-reveal="none">
    <svg class="palette" viewBox="0 0 200 200" aria-hidden="true">
      <ellipse cx="100" cy="104" rx="92" ry="86" fill="#fffaf3" stroke="#e7ddcf" stroke-width="2"/>
      <circle cx="100" cy="150" r="22" fill="#f7f2ea"/>
      <circle class="swatch" cx="64" cy="58" r="20" fill="#c2622e"/>
      <circle class="swatch" cx="116" cy="48" r="20" fill="#e0a13a"/>
      <circle class="swatch" cx="150" cy="92" r="20" fill="#6b7b52"/>
      <circle class="swatch" cx="138" cy="138" r="20" fill="#7b9aa6"/>
      <circle class="swatch" cx="70" cy="120" r="20" fill="#b8536a"/>
      <circle class="swatch" cx="44" cy="98" r="16" fill="#e08a4d"/>
    </svg>
    <span class="pill"><span class="dot"></span> Watercolor · Self-paced studio course</span>
    <h1>Learn to paint <em>luminous</em> watercolor landscapes</h1>
    <p class="lede">A warm, unhurried studio course that takes you from blank paper to confident, glowing washes. Twelve modules of close-up demos, downloadable references, and gentle critique — paint along at your own pace.</p>
    <div class="actions">
      <a href="#pricing" class="btn primary">Enroll now — $149</a>
      <a href="#trailer" class="btn ghost">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.8v10.4a.6.6 0 0 0 .92.5l8.3-5.2a.6.6 0 0 0 0-1L3.92 1.3A.6.6 0 0 0 3 1.8Z"/></svg>
        Watch the trailer
      </a>
      <span class="trial">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#6b7b52" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="#6b7b52" stroke-width="2"/></svg>
        First two lessons free
      </span>
    </div>

    <div class="stats num">
      <div class="stat"><div class="v">62</div><div class="k">Lessons across 12 modules</div></div>
      <div class="stat"><div class="v">9.5</div><div class="k">Hours of HD video</div></div>
      <div class="stat"><div class="v">14,200<span style="font-size:0.6em">+</span></div><div class="k">Students enrolled</div></div>
      <div class="stat"><div class="v">4.9 <span class="star">★</span></div><div class="k">From 2,840 reviews</div></div>
    </div>
  </section>

  <!-- WHAT YOU'LL LEARN -->
  <section id="learn" class="section reveal">
    <div class="shead">
      <span class="kicker">What you'll learn</span>
      <h2>Skills that turn careful copies into paintings with light</h2>
      <p>Every module ends with a finished piece for your portfolio. By the last lesson you'll mix, layer, and let water do the work.</p>
    </div>
    <div class="learn-grid">
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Mix a clean, repeatable palette</b><span>Build a six-color kit and mix greens, greys and skies without mud.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Control water &amp; timing</b><span>Read the shine on your paper to land soft edges every time.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Paint glowing skies</b><span>Wet-on-wet gradients and clouds that feel lit from within.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Layer believable foliage</b><span>Loose, varied greenery without painting every leaf.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Design value &amp; composition</b><span>Plan light and dark with quick thumbnails before you paint.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Reflections &amp; water</b><span>Convincing rivers, puddles and shimmer with just a few strokes.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Rescue a painting</b><span>Lift, glaze and recover when a wash goes too far.</span></div></div>
      <div class="learn"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>Develop your own voice</b><span>Move past references and paint scenes that feel like yours.</span></div></div>
    </div>
  </section>

  <!-- CURRICULUM -->
  <section id="curriculum" class="section reveal">
    <div class="shead">
      <span class="kicker">Curriculum</span>
      <h2>Twelve modules, paced for real life</h2>
      <p>Click any module to see its lessons. Start with the free intro, then build week by week.</p>
    </div>
    <div class="curric">
      <div class="cmeta num">
        <span><b>12</b> modules</span><span><b>62</b> lessons</span><span><b>9h 32m</b> total runtime</span><span><b>Lifetime</b> access</span>
      </div>

      <div class="module open">
        <button class="mhead" type="button" aria-expanded="true">
          <span class="mnum">01</span>
          <span class="mtitle"><b>Getting set up</b><span>Paper, brushes &amp; a six-color palette</span></span>
          <span class="mdur num">38 min</span>
          <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="lessons"><div><ul>
          <li class="free"><span class="ic play"><svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.6v8.8a.5.5 0 0 0 .77.42l6.9-4.4a.5.5 0 0 0 0-.84l-6.9-4.4A.5.5 0 0 0 3 1.6Z"/></svg></span><span class="lname">Welcome &amp; how this course works</span><span class="tag">Free</span><span class="ltime num">6:10</span></li>
          <li class="free"><span class="ic play"><svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M3 1.6v8.8a.5.5 0 0 0 .77.42l6.9-4.4a.5.5 0 0 0 0-.84l-6.9-4.4A.5.5 0 0 0 3 1.6Z"/></svg></span><span class="lname">A simple, affordable kit</span><span class="tag">Free</span><span class="ltime num">9:24</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Stretching &amp; taping your paper</span><span class="ltime num">7:48</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Your first three washes</span><span class="ltime num">14:32</span></li>
        </ul></div></div>
      </div>

      <div class="module">
        <button class="mhead" type="button" aria-expanded="false">
          <span class="mnum">02</span>
          <span class="mtitle"><b>The language of water</b><span>Edges, timing &amp; the magic window</span></span>
          <span class="mdur num">51 min</span>
          <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="lessons"><div><ul>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Wet-on-wet vs. wet-on-dry</span><span class="ltime num">11:05</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Reading the shine on your paper</span><span class="ltime num">12:40</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Soft edges &amp; hard edges on demand</span><span class="ltime num">13:18</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Practice: a misty hillside</span><span class="ltime num">13:57</span></li>
        </ul></div></div>
      </div>

      <div class="module">
        <button class="mhead" type="button" aria-expanded="false">
          <span class="mnum">03</span>
          <span class="mtitle"><b>Skies that glow</b><span>Gradients, clouds &amp; golden hour</span></span>
          <span class="mdur num">1h 04m</span>
          <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="lessons"><div><ul>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">A flawless graded wash</span><span class="ltime num">10:22</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Lifting soft clouds</span><span class="ltime num">12:11</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Painting a golden-hour sky</span><span class="ltime num">19:46</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Project: a coastal sunset</span><span class="ltime num">21:35</span></li>
        </ul></div></div>
      </div>

      <div class="module">
        <button class="mhead" type="button" aria-expanded="false">
          <span class="mnum">04</span>
          <span class="mtitle"><b>Trees, fields &amp; foliage</b><span>Loose greenery without painting every leaf</span></span>
          <span class="mdur num">58 min</span>
          <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="lessons"><div><ul>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Mixing greens that aren't garish</span><span class="ltime num">13:02</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">The shape of a distant treeline</span><span class="ltime num">14:40</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Project: a sunlit meadow</span><span class="ltime num">30:08</span></li>
        </ul></div></div>
      </div>

      <div class="module">
        <button class="mhead" type="button" aria-expanded="false">
          <span class="mnum">05</span>
          <span class="mtitle"><b>Final project &amp; your voice</b><span>A finished landscape, start to finish</span></span>
          <span class="mdur num">1h 22m</span>
          <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
        <div class="lessons"><div><ul>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Planning your composition</span><span class="ltime num">15:30</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Painting the full scene (real time)</span><span class="ltime num">42:18</span></li>
          <li><span class="ic lock"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2"/></svg></span><span class="lname">Where to go next &amp; a final word</span><span class="ltime num">24:46</span></li>
        </ul></div></div>
      </div>
    </div>
  </section>

  <!-- INSTRUCTOR -->
  <section id="instructor" class="section reveal">
    <div class="shead">
      <span class="kicker">Your instructor</span>
      <h2>Taught by someone who remembers learning</h2>
    </div>
    <div class="inst">
      <div class="avatar">
        <svg viewBox="0 0 200 200" aria-label="Illustrated portrait of the instructor">
          <defs><radialGradient id="av-glow" cx="50%" cy="34%" r="70%"><stop offset="0" stop-color="#ffd9a8" stop-opacity="0.9"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/></radialGradient></defs>
          <rect width="200" height="200" fill="url(#av-glow)"/>
          <circle cx="100" cy="118" r="62" fill="#fff3e2" opacity="0.16"/>
          <circle cx="100" cy="86" r="34" fill="#fff3e2" opacity="0.95"/>
          <path d="M44 176c4-34 26-54 56-54s52 20 56 54Z" fill="#fff3e2" opacity="0.95"/>
          <path d="M66 78c2-26 18-40 34-40s32 14 34 40c-10-10-22-12-34-12s-24 2-34 12Z" fill="#7a3f1c"/>
        </svg>
      </div>
      <div class="body">
        <div class="who">Marguerite Laurent</div>
        <div class="role">Plein-air painter · 18 years teaching</div>
        <p class="bio">Marguerite paints light for a living — from Provence olive groves to grey Atlantic coasts — and has spent nearly two decades convincing nervous beginners that watercolor is forgiving, not fussy. Her demos are slow, close, and quietly encouraging. "Your paper wants to help you," she likes to say. "Most of the skill is learning to get out of its way."</p>
        <div class="creds num">
          <div class="cred"><b>14.2k</b> students taught</div>
          <div class="cred"><b>4.9★</b> average rating</div>
          <div class="cred"><b>30+</b> gallery shows</div>
        </div>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="section reveal">
    <div class="shead">
      <span class="kicker">From students</span>
      <h2>Paintings they didn't think they could make</h2>
    </div>
    <div class="quotes">
      <div class="quote"><div class="stars">★★★★★</div><p>"I'd quit watercolor twice before this. Module 2 alone — just learning to read the shine on the paper — changed everything. I finally trust the water."</p><div class="by"><span class="pic" style="background:linear-gradient(135deg,#c2622e,#e0a13a)"></span><div><b>Priya N.</b><span>Hobbyist · Bristol, UK</span></div></div></div>
      <div class="quote"><div class="stars">★★★★★</div><p>"The pacing is so kind. Nothing is rushed, nothing is showing off. My golden-hour sky from module 3 is framed in my hallway and people ask who painted it."</p><div class="by"><span class="pic" style="background:linear-gradient(135deg,#6b7b52,#8fa56b)"></span><div><b>Daniel R.</b><span>Retired teacher · Portland, OR</span></div></div></div>
      <div class="quote"><div class="stars">★★★★★</div><p>"Worth ten of the courses I've bought. The downloadable references and the real-time final demo are gold. I come back to it constantly."</p><div class="by"><span class="pic" style="background:linear-gradient(135deg,#b8536a,#e08a4d)"></span><div><b>Yuki T.</b><span>Illustrator · Kyoto, JP</span></div></div></div>
    </div>
  </section>

  <!-- PRICING / ENROLL -->
  <section id="pricing" class="section reveal">
    <div class="shead" style="margin-bottom:30px">
      <span class="kicker">Enroll</span>
      <h2>One payment. Yours for good.</h2>
      <p>No subscription, no expiry. Pay once and keep every lesson, update and resource forever.</p>
    </div>
    <div class="enroll">
      <div class="sell">
        <h3>Everything you need to start painting this weekend</h3>
        <ul class="incl">
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> 62 HD lessons across 12 modules (9h 32m)</li>
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Printable reference photos &amp; line drawings for every project</li>
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> A downloadable color-mixing chart &amp; supply list</li>
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Monthly live "paint-along" sessions with Marguerite</li>
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> A private student gallery &amp; gentle critique threads</li>
          <li><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Certificate of completion &amp; lifetime updates</li>
        </ul>
      </div>
      <div class="card">
        <span class="ribbon">★ Spring cohort · 20% off</span>
        <div class="price num"><span class="now">$149</span><span class="was">$189</span><span class="save">Save $40</span></div>
        <div class="note">One-time payment · or 3× $52 at checkout</div>
        <ul class="mini num">
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg> Lifetime access, learn at your pace</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4v6c0 5-4 8-8 9-4-1-8-4-8-9V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg> Watch on any device, download for offline</li>
          <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> First two lessons free — try before you buy</li>
        </ul>
        <a href="#enroll" class="btn primary block">Enroll now</a>
        <div class="guarantee">
          <svg class="badge" viewBox="0 0 48 48" fill="none"><path d="M24 4l16 7v11c0 11-7 18-16 22-9-4-16-11-16-22V11l16-7Z" fill="#6b7b52" opacity="0.14"/><path d="M24 4l16 7v11c0 11-7 18-16 22-9-4-16-11-16-22V11l16-7Z" stroke="#6b7b52" stroke-width="2" stroke-linejoin="round"/><path d="M17 24l5 5 9-10" stroke="#6b7b52" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <div><b>30-day money-back guarantee</b><span>Paint along, and if it isn't for you, full refund — no questions.</span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="section reveal">
    <div class="shead">
      <span class="kicker">FAQ</span>
      <h2>Questions, answered</h2>
    </div>
    <div class="faq">
      <div class="qa open">
        <button type="button" aria-expanded="true"><span class="q">Do I need any experience to start?</span><span class="pm"></span></button>
        <div class="ans"><div><p>None at all. The first module assumes you've never picked up a brush — we cover the kit, the paper, and your very first washes before anything else. If you're more advanced, skip ahead; the projects scale up nicely.</p></div></div>
      </div>
      <div class="qa">
        <button type="button" aria-expanded="false"><span class="q">What supplies do I need to buy?</span><span class="pm"></span></button>
        <div class="ans"><div><p>Less than you'd think. A downloadable supply list keeps it affordable — six tube colors, two brushes, a block of cold-press paper and a jar of water. Total cost is usually under $60, and the list links to budget and pro options.</p></div></div>
      </div>
      <div class="qa">
        <button type="button" aria-expanded="false"><span class="q">How long do I have access?</span><span class="pm"></span></button>
        <div class="ans"><div><p>Forever. It's a one-time payment with lifetime access, including every future update and any new bonus lessons we add. Watch at your own pace; there's no schedule and nothing expires.</p></div></div>
      </div>
      <div class="qa">
        <button type="button" aria-expanded="false"><span class="q">Can I get feedback on my paintings?</span><span class="pm"></span></button>
        <div class="ans"><div><p>Yes. Every student gets access to the private gallery and critique threads, plus a monthly live paint-along where Marguerite reviews student work on camera. It's warm, specific and never harsh.</p></div></div>
      </div>
      <div class="qa">
        <button type="button" aria-expanded="false"><span class="q">What if it's not for me?</span><span class="pm"></span></button>
        <div class="ans"><div><p>You're covered by a 30-day money-back guarantee. Paint along, see how it feels, and if it isn't a fit just email us within 30 days for a full refund — no forms, no questions.</p></div></div>
      </div>
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="section reveal">
    <div class="band">
      <h2>Your first glowing sky is one weekend away</h2>
      <p>Join 14,200 students painting with light. Start free, paint at your pace, and keep it for good.</p>
      <div class="actions">
        <a href="#pricing" class="btn primary">Enroll now — $149</a>
        <a href="#trailer" class="btn ghost">Watch the trailer</a>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <span class="logo"><span class="mark">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7c4-2 12-2 16 0v12c-4-2-12-2-16 0V7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6.2v12.6" stroke="currentColor" stroke-width="2"/></svg>
    </span> Atelier</span>
    <nav>
      <a href="#learn">Course</a>
      <a href="#instructor">Instructor</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
      <a href="#contact">Contact</a>
    </nav>
    <div class="copy">© 2026 Atelier Studio · Luminous Watercolor Landscapes · Made with pigment and patience.</div>
  </div>
</footer>
`.trim()

const JS = `
// Curriculum accordion — toggle one module open/closed (keeps multiple allowed).
document.querySelectorAll('.module .mhead').forEach(function (head) {
  head.addEventListener('click', function () {
    var mod = head.closest('.module');
    var open = mod.classList.toggle('open');
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
});

// FAQ accordion — single-open behavior for a tidy reading experience.
var faqBtns = document.querySelectorAll('.faq .qa button');
faqBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    var qa = btn.closest('.qa');
    var wasOpen = qa.classList.contains('open');
    document.querySelectorAll('.faq .qa').forEach(function (other) {
      other.classList.remove('open');
      var b = other.querySelector('button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) {
      qa.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Smooth-scroll the in-page nav/CTA links (respect reduced motion).
var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
});
`.trim()

export const course: Template = {
  id: 'course',
  kind: 'page',
  name: 'Online Course',
  tagline: 'A teaching / course landing page that converts',
  categories: ['Business'],
  audiences: ['education', 'creator', 'teaching'],
  description:
    'A warm, friendly-academic landing page for selling an online class — built around a self-paced watercolor course. It has a hero with a stat row (lessons, video hours, students, rating), a "what you\'ll learn" check grid, an expandable curriculum accordion with per-lesson durations and play/lock icons, an instructor card, student testimonials, a one-time-payment enroll card with a money-back guarantee, and an FAQ accordion. Pure CSS/SVG with a terracotta accent on paper cream — swap the copy and price to sell any course.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f7f2ea',
  notes:
    'Friendly-academic course landing page. **Palette knobs** live in `:root`: `--accent` (terracotta) + `--accent-2` (amber) drive the `--grad` gradient, CTAs, pills and the hero palette; `--leaf` (sage) is the secondary "approved/checks" color; `--gold` is the star color; `--bg`/`--bg-2` are the paper-cream surfaces and `--ink`/`--mut`/`--faint` the text scale. Type pairing is Fraunces (display serif, italic+swash for the hero `em`) over Inter (body) — change both via `--display`/`--body` and the font links. **To rebrand for a different course**, edit the hero `.pill`, `<h1>`/`.lede`, the four `.stat` figures, the eight `.learn` cards, the `.module` blocks (each `.mhead` has a number/title/duration and a `.lessons > div > ul` of `<li>` rows — use `.ic.play`/`.ic.lock` and add `class="free"` + a `.tag` for free previews), the instructor copy + `.cred` mini-stats, the three `.quote`s, the `.price` and `.incl`/`.mini` checklists, and the five `.qa` FAQ items. Curriculum and FAQ are JS accordions (curriculum allows multiple open, FAQ is single-open); both animate via CSS `grid-template-rows: 0fr→1fr`, so no height math is needed when you add rows. All figures use `.num` (tabular). The hero avatar/palette and the guarantee badge are inline SVG — recolor with the same tokens.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f7f2ea',
  },
}
