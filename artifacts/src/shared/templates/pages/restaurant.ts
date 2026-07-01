import type { Template } from '../types'

// An appetizing, editorial restaurant page for a modern wood-fired bistro,
// "Olive & Ember". Full-bleed photographic hero (warm charcoal→amber gradient
// fallback + scrim) with the name in a fine display serif, a philosophy strip,
// the menu as real sections (Starters / Mains / Desserts) — each item a leader-
// dotted row with tabular prices, italic descriptions, and "chef's pick" accent
// dots — a featured-dishes trio (two photos + one gradient tile), an "Hours &
// Reservations" card with a visual-only booking form, a small gallery, and a
// footer with address + socials. Charcoal + terracotta/amber + cream;
// Cormorant Garamond display + Inter body.

const CSS = `
:root {
  --char: #1c1a17;       /* charcoal ink / dark sections */
  --char-2: #262320;     /* raised charcoal */
  --cream: #f6f0e6;      /* page cream */
  --paper: #fdfaf3;      /* card cream */
  --ember: #c9612e;      /* terracotta / ember */
  --amber: #e0934a;      /* warm amber */
  --gold: #c9a24b;       /* aged gold */
  --ink: #211e1a;        /* body text on cream */
  --mut: #7a7065;        /* muted text */
  --faint: #a89a89;      /* faint text */
  --line: rgba(33,30,26,0.14);
  --line-soft: rgba(33,30,26,0.08);
  --display: 'Cormorant Garamond', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: var(--cream); color: var(--ink); font-family: var(--body); font-size: 17px; line-height: 1.65; }
.num { font-variant-numeric: tabular-nums; }
.serif { font-family: var(--display); }
h1, h2, h3 { font-family: var(--display); font-weight: 500; margin: 0; letter-spacing: 0.01em; }
::selection { background: rgba(201,97,46,0.22); }
a { color: var(--ember); text-decoration: none; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 56px); }

/* ---------- shared eyebrow / section heads ---------- */
.eyebrow {
  font-family: var(--body); text-transform: uppercase; letter-spacing: 0.34em;
  font-size: clamp(10px, 1.4vw, 12px); font-weight: 600; color: var(--ember);
  display: inline-flex; align-items: center; gap: 12px;
}
.eyebrow::before, .eyebrow.both::after {
  content: ''; width: clamp(20px, 5vw, 40px); height: 1px; background: currentColor; opacity: 0.55;
}
.section { padding: clamp(48px, 9vw, 104px) 0; }
.section-head { text-align: center; }
.section-head .eyebrow { margin-bottom: 14px; }
.section-title { font-size: clamp(34px, 6.4vw, 60px); line-height: 1.02; letter-spacing: 0.004em; }
.lede { max-width: 620px; margin: 16px auto 0; text-align: center; color: var(--mut); font-size: clamp(16px, 2.3vw, 19px); }

/* ---------- HERO ---------- */
.hero {
  position: relative; min-height: 100svh; display: grid; place-items: end center;
  text-align: center; overflow: hidden; isolation: isolate;
  padding: clamp(40px, 8vw, 84px) 20px clamp(48px, 9vw, 92px);
  /* warm charcoal->amber gradient fallback behind the photo */
  background:
    radial-gradient(120% 80% at 50% 8%, rgba(224,147,74,0.34), transparent 56%),
    linear-gradient(166deg, #2a241d 0%, #46342339 0%, #3a2a1d 30%, #5a3a22 64%, #8a4e28 100%);
}
.hero-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  z-index: -2; opacity: 0; transform: scale(1.07);
  animation: heroIn 2.6s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
  filter: saturate(1.02) brightness(0.98);
}
@keyframes heroIn { to { opacity: 1; transform: scale(1); } }
.hero::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(120% 86% at 50% 30%, transparent 30%, rgba(20,16,12,0.42) 100%),
    linear-gradient(180deg, rgba(20,16,12,0.46) 0%, rgba(20,16,12,0.10) 32%, rgba(20,16,12,0.72) 100%);
}
.hero-inner { position: relative; color: #fcf5ea; max-width: 880px; }
.hero .eyebrow { color: var(--amber); }
.hero .eyebrow::before, .hero .eyebrow.both::after { opacity: 0.8; }
.hero-name {
  font-size: clamp(64px, 17vw, 188px); line-height: 0.86; font-weight: 500;
  letter-spacing: 0.012em; margin: clamp(16px, 3vw, 26px) 0 clamp(14px, 2.6vw, 22px);
  text-shadow: 0 2px 40px rgba(20,16,12,0.5);
}
.hero-name .amp {
  display: inline-block; font-style: italic; color: var(--amber);
  font-weight: 400; margin: 0 0.06em; transform: translateY(0.02em);
}
.hero-tag {
  font-family: var(--display); font-style: italic; font-size: clamp(20px, 3.6vw, 32px);
  color: #f3e6d2; text-shadow: 0 1px 18px rgba(20,16,12,0.6); letter-spacing: 0.01em;
}
.hero-meta {
  display: inline-flex; align-items: center; flex-wrap: wrap; justify-content: center;
  gap: clamp(10px, 2.6vw, 22px); margin-top: clamp(22px, 4vw, 34px);
  font-size: clamp(11.5px, 1.8vw, 13.5px); letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba(252,245,234,0.92); text-shadow: 0 1px 12px rgba(20,16,12,0.6);
}
.hero-meta .sep { width: 4px; height: 4px; border-radius: 50%; background: var(--amber); flex: none; }
.hero-cta { margin-top: clamp(26px, 4.4vw, 38px); }
.btn {
  display: inline-flex; align-items: center; gap: 12px; cursor: pointer; border: 0;
  font-family: var(--body); font-weight: 600; font-size: 13.5px; letter-spacing: 0.16em;
  text-transform: uppercase; color: #fcf5ea; padding: 16px 30px; border-radius: 999px;
  background: linear-gradient(150deg, var(--amber), var(--ember));
  box-shadow: 0 18px 40px -16px rgba(201,97,46,0.8);
  transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 26px 50px -18px rgba(201,97,46,0.9); filter: brightness(1.05); }
.btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; }
.btn svg { width: 15px; height: 15px; }
.btn.ghost {
  background: transparent; color: #fcf5ea; box-shadow: none;
  border: 1px solid rgba(252,245,234,0.4);
}
.btn.ghost:hover { background: rgba(252,245,234,0.08); filter: none; }
.scroll-cue {
  position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
  color: rgba(252,245,234,0.78); font-size: 10px; letter-spacing: 0.32em;
  text-transform: uppercase; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.scroll-cue::after { content: ''; width: 1px; height: 30px; background: linear-gradient(rgba(252,245,234,0.85), transparent); animation: cue 2.2s ease-in-out infinite; transform-origin: top; }
@keyframes cue { 0%,100% { transform: scaleY(0.4); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }

/* ---------- PHILOSOPHY STRIP ---------- */
.philosophy { text-align: center; }
.philosophy .quote {
  font-family: var(--display); font-size: clamp(26px, 4.6vw, 44px); line-height: 1.22;
  font-weight: 500; max-width: 880px; margin: 0 auto; color: var(--ink); letter-spacing: 0.004em;
}
.philosophy .quote em { font-style: italic; color: var(--ember); }
.philosophy .sig {
  margin-top: 26px; color: var(--mut); font-size: 14px; letter-spacing: 0.04em;
  display: inline-flex; flex-direction: column; gap: 2px;
}
.philosophy .sig b { font-family: var(--display); font-style: italic; font-size: 21px; color: var(--ink); font-weight: 500; letter-spacing: 0.01em; }
.philosophy .marks { display: flex; justify-content: center; gap: clamp(26px, 6vw, 64px); margin-top: clamp(34px, 6vw, 52px); flex-wrap: wrap; }
.philosophy .mark { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--mut); }
.philosophy .mark svg { width: 26px; height: 26px; color: var(--ember); }
.philosophy .mark span { font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; }

/* ---------- MENU ---------- */
.menu { background: var(--char); color: #ece3d4; position: relative; }
.menu::before, .menu::after {
  content: ''; position: absolute; left: 0; right: 0; height: 60px; pointer-events: none;
}
.menu::before { top: 0; background: linear-gradient(180deg, rgba(0,0,0,0.22), transparent); }
.menu .section-title { color: #f6efe2; }
.menu .lede { color: #b6a994; }
.menu .eyebrow { color: var(--amber); }
.menu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px, 6vw, 80px) clamp(40px, 7vw, 88px); margin-top: clamp(40px, 7vw, 68px); }
.menu-col { display: flex; flex-direction: column; gap: clamp(28px, 4vw, 40px); }
.menu-cat .cat-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: clamp(16px, 2.6vw, 24px); }
.menu-cat .cat-head h3 { font-size: clamp(26px, 4vw, 36px); color: #f6efe2; font-style: italic; }
.menu-cat .cat-head .ico { width: 22px; height: 22px; color: var(--amber); flex: none; transform: translateY(2px); }
.menu-cat .cat-head .rule { flex: 1; height: 1px; background: rgba(236,227,212,0.16); }
.dish { display: grid; grid-template-rows: auto auto; gap: 5px; padding: 9px 0; }
.dish .top { display: flex; align-items: baseline; gap: 6px; }
.dish .name {
  font-family: var(--display); font-size: clamp(20px, 2.8vw, 24px); font-weight: 500;
  color: #f6efe2; letter-spacing: 0.01em; display: inline-flex; align-items: center; gap: 9px;
}
.dish .pick { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); flex: none; box-shadow: 0 0 0 3px rgba(224,147,74,0.18); }
.dish .leader { flex: 1; border-bottom: 1.5px dotted rgba(236,227,212,0.3); transform: translateY(-4px); min-width: 22px; }
.dish .price { font-family: var(--display); font-size: clamp(19px, 2.6vw, 23px); color: var(--amber); font-variant-numeric: tabular-nums; font-weight: 500; }
.dish .desc { font-size: 14.5px; line-height: 1.55; color: #b6a994; font-style: italic; max-width: 92%; }
.dish .desc .tags { font-style: normal; display: inline-flex; gap: 7px; margin-left: 8px; }
.dish .tag { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); border: 1px solid rgba(201,162,75,0.5); border-radius: 999px; padding: 2px 7px; font-style: normal; }
.menu-foot { margin-top: clamp(36px, 6vw, 56px); text-align: center; color: #9c8f7b; font-size: 13px; letter-spacing: 0.04em; }
.menu-foot .key { display: inline-flex; align-items: center; gap: 9px; }
.menu-foot .key .pick { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); display: inline-block; box-shadow: 0 0 0 3px rgba(224,147,74,0.18); }

/* ---------- FEATURED TRIO ---------- */
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2.6vw, 26px); margin-top: clamp(40px, 6vw, 60px); }
.feat {
  position: relative; aspect-ratio: 3 / 4; border-radius: 6px; overflow: hidden;
  box-shadow: 0 30px 60px -38px rgba(33,30,26,0.6);
}
.feat img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.feat .fb { position: absolute; inset: 0; z-index: 0; }
.feat.f1 .fb { background: linear-gradient(150deg, #d98a4a, #c9612e 55%, #7a3a1e); }
.feat.f2 .fb { background: linear-gradient(150deg, #4a5a3a, #6a5a32 60%, #c9a24b); }
.feat.f3 .fb {
  background:
    radial-gradient(80% 70% at 30% 18%, rgba(252,245,234,0.18), transparent 60%),
    linear-gradient(150deg, #2a241d, #5a3a22 70%, #8a4e28);
}
.feat .glyph { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; color: rgba(252,245,234,0.32); }
.feat .glyph svg { width: 56px; height: 56px; }
.feat.has-img .glyph { display: none; }
.feat .cap {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 3; padding: clamp(18px, 3vw, 26px);
  /* Hold the scrim near-opaque at the base and ~0.55 well up the card so the
     eyebrow + serif title stay legible over any bright region of the dish photo. */
  background: linear-gradient(0deg,
    rgba(20,16,12,0.92) 0%,
    rgba(20,16,12,0.80) 34%,
    rgba(20,16,12,0.62) 72%,
    rgba(20,16,12,0.22) 90%,
    transparent 100%);
  color: #fcf5ea;
}
.feat .cap .k { font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--amber); text-shadow: 0 1px 4px rgba(0,0,0,0.85), 0 1px 10px rgba(0,0,0,0.6); }
.feat .cap h3 { font-size: clamp(21px, 2.6vw, 26px); margin-top: 5px; text-shadow: 0 1px 8px rgba(0,0,0,0.55); }
.feat .cap p { font-size: 13.5px; color: rgba(252,245,234,0.86); margin-top: 5px; line-height: 1.5; text-shadow: 0 1px 6px rgba(0,0,0,0.5); }
.feat .cap .price { font-family: var(--display); font-style: italic; color: var(--amber); font-size: 18px; margin-top: 8px; display: inline-block; font-variant-numeric: tabular-nums; text-shadow: 0 1px 8px rgba(0,0,0,0.6); }

/* ---------- HOURS & RESERVATIONS ---------- */
.reserve {
  display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 64px); align-items: stretch;
  margin-top: clamp(40px, 6vw, 56px);
}
.hours-card, .book-card {
  background: var(--paper); border: 1px solid var(--line); border-radius: 8px;
  padding: clamp(26px, 4vw, 42px); box-shadow: 0 28px 56px -42px rgba(33,30,26,0.5);
}
.hours-card h3, .book-card h3 { font-size: clamp(24px, 3.4vw, 30px); margin-bottom: 4px; }
.hours-card .sub, .book-card .sub { color: var(--mut); font-size: 14.5px; margin-bottom: 22px; }
.hrow { display: grid; grid-template-columns: auto 1fr auto; align-items: baseline; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line-soft); }
.hrow:last-of-type { border-bottom: 0; }
.hrow .day { font-weight: 600; font-size: 14.5px; color: var(--ink); letter-spacing: 0.01em; }
.hrow .ldr { border-bottom: 1.5px dotted var(--line); transform: translateY(-3px); }
.hrow .time { font-variant-numeric: tabular-nums; font-size: 14.5px; color: var(--mut); white-space: nowrap; }
.hrow.closed .time { color: var(--faint); font-style: italic; }
.hrow.now { }
.hrow.now .day { color: var(--ember); }
.hrow.now .badge { font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; background: var(--ember); border-radius: 999px; padding: 2px 8px; margin-left: 8px; vertical-align: middle; }
.hours-note { margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--line-soft); color: var(--mut); font-size: 13.5px; display: flex; align-items: flex-start; gap: 11px; }
.hours-note svg { width: 17px; height: 17px; color: var(--ember); flex: none; margin-top: 2px; }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ember); margin-bottom: 8px; font-weight: 600; }
.field input, .field select {
  width: 100%; box-sizing: border-box; font-family: var(--body); font-size: 16px; color: var(--ink);
  background: #fff; border: 1px solid var(--line); border-radius: 5px;
  padding: 13px 15px; appearance: none; transition: border-color 0.22s ease, box-shadow 0.22s ease;
}
.field input::placeholder { color: var(--faint); }
.field input:focus, .field select:focus { outline: none; border-color: var(--ember); box-shadow: 0 0 0 4px rgba(201,97,46,0.14); }
.field select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23c9612e' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 15px center; padding-right: 40px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.book-card .btn { width: 100%; justify-content: center; margin-top: 8px; color: #fcf5ea; }
.thanks { display: none; text-align: center; padding: 8px 4px; }
.thanks.show { display: block; animation: thanksIn 0.7s cubic-bezier(0.22,1,0.36,1); }
@keyframes thanksIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.thanks .mark { width: 56px; height: 56px; margin: 0 auto 14px; color: var(--ember); }
.thanks h3 { font-size: clamp(24px, 4vw, 32px); font-style: italic; }
.thanks p { color: var(--mut); margin-top: 8px; font-size: 15px; }
.thanks .small { font-size: 13px; color: var(--faint); margin-top: 12px; }

/* ---------- GALLERY ---------- */
.gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(10px, 1.8vw, 16px); margin-top: clamp(40px, 6vw, 56px); }
.tile { aspect-ratio: 1; border-radius: 5px; position: relative; overflow: hidden; box-shadow: 0 20px 40px -32px rgba(33,30,26,0.55); }
.tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
.tile::after { content: ''; position: absolute; inset: 0; z-index: 3; box-shadow: inset 0 0 0 1px rgba(252,245,234,0.16); border-radius: 5px; pointer-events: none; }
/* faint warm grain + a soft inner vignette so every tile reads as an intentional
   captioned vignette rather than an empty colour swatch */
.tile::before {
  content: ''; position: absolute; inset: 0; z-index: 2; pointer-events: none; border-radius: 5px;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(252,245,234,0.12), transparent 55%),
    radial-gradient(140% 120% at 50% 120%, rgba(20,16,12,0.55), transparent 60%);
  opacity: 0.9;
}
.tile .gi {
  position: absolute; inset: 0; z-index: 4; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end; gap: 9px; padding: clamp(12px, 2vw, 18px);
  text-align: center; color: #fcf5ea;
}
.tile .gi svg { width: 22px; height: 22px; color: rgba(252,245,234,0.78); filter: drop-shadow(0 1px 4px rgba(0,0,0,0.45)); }
.tile .gi .lbl { font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(252,245,234,0.92); text-shadow: 0 1px 6px rgba(0,0,0,0.55); }
.tile.has-img .gi svg { display: none; }
.tile.has-img .gi { justify-content: flex-end; }
/* warm-only palette: ember / amber / aged gold / toasted charcoal — no cool greens */
.tile.g1 { background: linear-gradient(150deg, #d98a4a, #c9612e); }
.tile.g2 { background: linear-gradient(150deg, #8a4e28, #c9612e); aspect-ratio: 1 / 1.32; align-self: end; }
.tile.g3 { background: linear-gradient(150deg, #3a2a1d, #7a3a1e); }
.tile.g4 { background: linear-gradient(150deg, #c9a24b, #a8762e); }
.tile.g5 { background: linear-gradient(150deg, #5a3a22, #c9612e); aspect-ratio: 1 / 1.28; }
.tile.g6 { background: linear-gradient(150deg, #b07636, #7a3a1e); }
.tile.g7 { background: linear-gradient(150deg, #8a4e28, #e0934a); aspect-ratio: 1 / 1.3; align-self: end; }
.tile.g8 { background: linear-gradient(150deg, #2a241d, #5a3a22); }

/* ---------- FOOTER ---------- */
.foot { background: var(--char); color: #d8cdba; padding: clamp(56px, 9vw, 96px) 0 clamp(36px, 5vw, 52px); }
.foot-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: clamp(28px, 5vw, 56px); }
.foot .brand-name { font-family: var(--display); font-size: clamp(34px, 5vw, 48px); color: #f6efe2; font-weight: 500; }
.foot .brand-name .amp { font-style: italic; color: var(--amber); }
.foot .brand-tag { font-family: var(--display); font-style: italic; color: var(--amber); font-size: 19px; margin-top: 4px; }
.foot p { color: #b6a994; font-size: 14.5px; line-height: 1.6; margin-top: 16px; max-width: 320px; }
.foot h4 { font-family: var(--body); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--amber); font-weight: 600; margin: 0 0 16px; }
.foot .flist { display: flex; flex-direction: column; gap: 10px; font-size: 14.5px; color: #cdbfa9; }
.foot .flist a { color: #cdbfa9; }
.foot .flist a:hover { color: #f6efe2; }
.foot .socials { display: flex; gap: 12px; margin-top: 20px; }
.foot .socials a {
  width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  border: 1px solid rgba(236,227,212,0.2); color: #cdbfa9; transition: all 0.22s ease;
}
.foot .socials a:hover { border-color: var(--amber); color: var(--amber); transform: translateY(-2px); }
.foot .socials svg { width: 18px; height: 18px; }
.foot-bottom {
  margin-top: clamp(40px, 6vw, 56px); padding-top: 24px; border-top: 1px solid rgba(236,227,212,0.14);
  display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
  font-size: 12.5px; color: #9c8f7b; letter-spacing: 0.02em;
}

/* ---------- responsive ---------- */
@media (max-width: 820px) {
  body { font-size: 16px; }
  .menu-grid { grid-template-columns: 1fr; gap: clamp(34px, 7vw, 48px); }
  .feature-grid { grid-template-columns: 1fr; max-width: 440px; margin-left: auto; margin-right: auto; }
  .reserve { grid-template-columns: 1fr; }
  .gallery { grid-template-columns: repeat(2, 1fr); }
  .tile.g2, .tile.g5, .tile.g7 { align-self: auto; }
  .foot-grid { grid-template-columns: 1fr 1fr; }
  .foot .brand { grid-column: 1 / -1; }
}
@media (max-width: 560px) {
  .hero-meta { gap: 8px; }
  .hero-cta { display: flex; flex-direction: column; gap: 12px; align-items: center; }
  .hero-cta .btn { width: 100%; max-width: 300px; justify-content: center; }
  .field-row { grid-template-columns: 1fr; }
  .philosophy .marks { gap: 22px; }
  .foot-grid { grid-template-columns: 1fr; }
  .foot p { max-width: none; }
}
`.trim()

const HTML = `
<header class="hero">
  <img class="hero-img" src="assets/restaurant-hero.jpg" alt="A wood-fired hearth in the open kitchen at Olive &amp; Ember, flames catching a cast-iron pan" loading="eager" />
  <div class="hero-inner">
    <span class="eyebrow both">A Wood-Fired Bistro · Est. 2014</span>
    <h1 class="hero-name serif">Olive <span class="amp">&amp;</span> Ember</h1>
    <p class="hero-tag">Wood-fired. Seasonal. Unhurried.</p>
    <div class="hero-meta">
      <span>Open Tue – Sun, 5pm til late</span>
      <span class="sep"></span>
      <span>114 Kindling Row, Hudson, NY</span>
    </div>
    <div class="hero-cta">
      <button class="btn" type="button" data-scroll="#reserve">
        <svg viewBox="0 0 24 24" fill="none"><path d="M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Reserve a table
      </button>
      <button class="btn ghost" type="button" data-scroll="#menu">View the menu</button>
    </div>
  </div>
  <div class="scroll-cue">Scroll</div>
</header>

<section class="section philosophy">
  <div class="wrap">
    <span class="eyebrow both" style="display:flex;justify-content:center;margin-bottom:24px">Our Philosophy</span>
    <p class="quote reveal">We cook with <em>fire and patience</em> — letting the season set the table and the hearth do the talking. Nothing rushed, nothing wasted, everything shared.</p>
    <div class="sig reveal">
      <b>Mara Castellano</b>
      <span>Chef &amp; Proprietor</span>
    </div>
    <div class="marks reveal">
      <div class="mark">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3c2 3 5 4 5 8a5 5 0 01-10 0c0-2 1-3 2-4 .5 2 2 2 3 1-1-2-1-4 0-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        <span>Wood-Fired</span>
      </div>
      <div class="mark">
        <svg viewBox="0 0 24 24" fill="none"><path d="M11 3c-4 1-7 4-7 8 0 5 4 9 9 9 0-7-1-13-2-17z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 11c2-1 4-1 6 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        <span>Farm Sourced</span>
      </div>
      <div class="mark">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Slow Cooked</span>
      </div>
      <div class="mark">
        <svg viewBox="0 0 24 24" fill="none"><path d="M5 13s2-2 7-2 7 2 7 2M5 13a7 7 0 0014 0M9 6c-1 .8-1 2 0 3M13 5c-1 .8-1 2 0 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Open Kitchen</span>
      </div>
    </div>
  </div>
</section>

<section class="section menu" id="menu">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow both" style="display:inline-flex">The Bill of Fare</span>
      <h2 class="section-title" style="margin-top:14px">This Week's Menu</h2>
      <p class="lede">A short, ever-changing list built around what came off the farms and out of the fire this morning.</p>
    </div>

    <div class="menu-grid">
      <div class="menu-col">
        <div class="menu-cat">
          <div class="cat-head">
            <svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M5 3v8a3 3 0 003 3v7M9 3v6M5 3v6M19 3c-2 0-3 2-3 5s1 4 3 4v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <h3>To Begin</h3>
            <span class="rule"></span>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name"><span class="pick"></span>Ember-Charred Bread</span>
              <span class="leader"></span>
              <span class="price num">9</span>
            </div>
            <p class="desc">Sourdough blistered over coals, cultured butter, flaked sea salt.<span class="tags"><span class="tag">V</span></span></p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Burrata &amp; Burnt Honey</span>
              <span class="leader"></span>
              <span class="price num">16</span>
            </div>
            <p class="desc">Creamy burrata, hearth-roasted figs, burnt-honey drizzle, basil oil.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name"><span class="pick"></span>Smoked Trout Toast</span>
              <span class="leader"></span>
              <span class="price num">15</span>
            </div>
            <p class="desc">House-smoked trout, crème fraîche, pickled shallot, dill, rye.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Fire-Roasted Beets</span>
              <span class="leader"></span>
              <span class="price num">13</span>
            </div>
            <p class="desc">Coal-roasted beets, whipped goat cheese, toasted walnut, orange.<span class="tags"><span class="tag">GF</span></span></p>
          </div>
        </div>

        <div class="menu-cat">
          <div class="cat-head">
            <svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M12 3c-3 0-5 2-5 5 0 2 1 3 1 5 0 3-2 3-2 5 0 2 2 3 6 3s6-1 6-3c0-2-2-2-2-5 0-2 1-3 1-5 0-3-2-5-5-5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
            <h3>Desserts</h3>
            <span class="rule"></span>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name"><span class="pick"></span>Olive Oil Cake</span>
              <span class="leader"></span>
              <span class="price num">11</span>
            </div>
            <p class="desc">Warm citrus cake, mascarpone, rosemary syrup, a pinch of salt.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Burnt Basque Cheesecake</span>
              <span class="leader"></span>
              <span class="price num">12</span>
            </div>
            <p class="desc">Caramelised top, cloud-soft centre, ember-roasted plums.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Dark Chocolate Tart</span>
              <span class="leader"></span>
              <span class="price num">12</span>
            </div>
            <p class="desc">Smoked-salt ganache, cacao crust, crème anglaise.<span class="tags"><span class="tag">GF</span></span></p>
          </div>
        </div>
      </div>

      <div class="menu-col">
        <div class="menu-cat">
          <div class="cat-head">
            <svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M4 18s2-3 8-3 8 3 8 3M6 15a6 6 0 0112 0M12 4v3M9 5l1 2M15 5l-1 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <h3>From the Hearth</h3>
            <span class="rule"></span>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name"><span class="pick"></span>Wood-Grilled Ribeye</span>
              <span class="leader"></span>
              <span class="price num">42</span>
            </div>
            <p class="desc">14oz dry-aged ribeye, bone-marrow butter, charred scallion, fat chips.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Hearth Roast Chicken</span>
              <span class="leader"></span>
              <span class="price num">29</span>
            </div>
            <p class="desc">Half bird under brick, lemon &amp; thyme jus, confit potato.<span class="tags"><span class="tag">GF</span></span></p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name"><span class="pick"></span>Whole Branzino</span>
              <span class="leader"></span>
              <span class="price num">34</span>
            </div>
            <p class="desc">Salt-baked over coals, fennel, caper-herb salsa, grilled lemon.</p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Ember Mushroom Tagliatelle</span>
              <span class="leader"></span>
              <span class="price num">26</span>
            </div>
            <p class="desc">Hand-cut pasta, wild mushrooms, brown butter, aged pecorino.<span class="tags"><span class="tag">V</span></span></p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Charred Cauliflower Steak</span>
              <span class="leader"></span>
              <span class="price num">24</span>
            </div>
            <p class="desc">Whole roasted head, romesco, dukkah, pomegranate.<span class="tags"><span class="tag">VG</span></span></p>
          </div>
        </div>

        <div class="menu-cat">
          <div class="cat-head">
            <svg class="ico" viewBox="0 0 24 24" fill="none"><path d="M7 11h10M9 11V8a3 3 0 016 0v3M6 11h12l-1 8a2 2 0 01-2 2H9a2 2 0 01-2-2l-1-8z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <h3>Sides</h3>
            <span class="rule"></span>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Charred Greens</span>
              <span class="leader"></span>
              <span class="price num">9</span>
            </div>
            <p class="desc">Grilled broccolini, chili, garlic, lemon.<span class="tags"><span class="tag">VG</span></span></p>
          </div>
          <div class="dish">
            <div class="top">
              <span class="name">Ember Potatoes</span>
              <span class="leader"></span>
              <span class="price num">8</span>
            </div>
            <p class="desc">Crushed &amp; crisped in beef fat, rosemary salt.<span class="tags"><span class="tag">GF</span></span></p>
          </div>
        </div>
      </div>
    </div>

    <div class="menu-foot reveal" data-reveal="none">
      <span class="key"><span class="pick"></span> Chef's pick</span>
      &nbsp;&nbsp;·&nbsp;&nbsp; V vegetarian &nbsp; VG vegan &nbsp; GF gluten-free &nbsp;&nbsp;·&nbsp;&nbsp; A 20% gratuity is added for parties of six or more.
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow both" style="display:inline-flex">Off the Fire Tonight</span>
      <h2 class="section-title" style="margin-top:14px">Featured Plates</h2>
      <p class="lede">Three things we're especially proud of this week — limited covers, while the season lasts.</p>
    </div>
    <div class="feature-grid">
      <figure class="feat f1 reveal has-img" data-reveal="left">
        <div class="fb"></div>
        <img src="assets/dish-1.jpg" alt="Wood-grilled dry-aged ribeye resting under melting bone-marrow butter" loading="lazy" />
        <div class="glyph"><svg viewBox="0 0 24 24" fill="none"><path d="M4 18s2-3 8-3 8 3 8 3M6 15a6 6 0 0112 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
        <figcaption class="cap">
          <div class="k">Chef's Pick</div>
          <h3>Wood-Grilled Ribeye</h3>
          <p>Dry-aged forty days, kissed by oak smoke, bone-marrow butter melting on top.</p>
          <span class="price num">42</span>
        </figcaption>
      </figure>
      <figure class="feat f2 reveal scale has-img" data-reveal="scale">
        <div class="fb"></div>
        <img src="assets/dish-2.jpg" alt="A whole salt-baked branzino off the coals with fennel and grilled lemon" loading="lazy" />
        <div class="glyph"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12c4-5 10-5 14 0-4 5-10 5-14 0z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="12" r="1" fill="currentColor"/></svg></div>
        <figcaption class="cap">
          <div class="k">The Catch</div>
          <h3>Whole Branzino</h3>
          <p>Salt-crusted over coals, fennel and caper-herb salsa, charred lemon.</p>
          <span class="price num">34</span>
        </figcaption>
      </figure>
      <figure class="feat f3 reveal" data-reveal="right">
        <div class="fb"></div>
        <div class="glyph"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3c-3 0-5 2-5 5 0 2 1 3 1 5 0 3-2 3-2 5 0 2 2 3 6 3s6-1 6-3c0-2-2-2-2-5 0-2 1-3 1-5 0-3-2-5-5-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></div>
        <figcaption class="cap">
          <div class="k">Sweet Ending</div>
          <h3>Burnt Basque Cheesecake</h3>
          <p>Caramelised top, a cloud-soft centre, ember-roasted plums alongside.</p>
          <span class="price num">12</span>
        </figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="section" id="reserve" style="padding-top:0">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow both" style="display:inline-flex">Come Sit With Us</span>
      <h2 class="section-title" style="margin-top:14px">Hours &amp; Reservations</h2>
      <p class="lede">We hold a few tables for walk-ins each night at the bar — but for the dining room, a booking is wise.</p>
    </div>
    <div class="reserve">
      <div class="hours-card reveal" data-reveal="left">
        <h3>When We're Open</h3>
        <p class="sub">The kitchen closes thirty minutes before last call.</p>
        <div class="hrow closed"><span class="day">Monday</span><span class="ldr"></span><span class="time">Closed</span></div>
        <div class="hrow"><span class="day">Tuesday – Thursday</span><span class="ldr"></span><span class="time num">5:00 – 10:00pm</span></div>
        <div class="hrow"><span class="day">Friday</span><span class="ldr"></span><span class="time num">5:00 – 11:30pm</span></div>
        <div class="hrow"><span class="day">Saturday</span><span class="ldr"></span><span class="time num">4:00 – 11:30pm</span></div>
        <div class="hrow"><span class="day">Sunday <span class="badge">Roast</span></span><span class="ldr"></span><span class="time num">3:00 – 9:00pm</span></div>
        <div class="hours-note">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>
          <span>114 Kindling Row, Hudson, NY 12534 · Street parking after 6pm · We're up the stairs, past the open kitchen.</span>
        </div>
      </div>

      <div class="book-card reveal" data-reveal="right">
        <h3>Book a Table</h3>
        <p class="sub">Parties of seven or more, please call us at (518) 555-0147.</p>
        <form id="bookForm" novalidate>
          <div class="field">
            <label for="b-name">Name on the reservation</label>
            <input id="b-name" name="name" type="text" placeholder="e.g. Eleanor Whitfield" autocomplete="name" />
          </div>
          <div class="field-row">
            <div class="field">
              <label for="b-date">Date</label>
              <input id="b-date" name="date" type="text" placeholder="Sat, Jun 13" />
            </div>
            <div class="field">
              <label for="b-time">Time</label>
              <select id="b-time" name="time">
                <option>6:00pm</option>
                <option>6:30pm</option>
                <option selected>7:00pm</option>
                <option>7:30pm</option>
                <option>8:00pm</option>
                <option>8:30pm</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="b-party">Party size</label>
              <select id="b-party" name="party">
                <option>2 guests</option>
                <option>3 guests</option>
                <option selected>4 guests</option>
                <option>5 guests</option>
                <option>6 guests</option>
              </select>
            </div>
            <div class="field">
              <label for="b-seat">Seating</label>
              <select id="b-seat" name="seat">
                <option>Dining room</option>
                <option>Chef's counter</option>
                <option>Bar</option>
                <option>Terrace</option>
              </select>
            </div>
          </div>
          <button class="btn" type="submit">Request reservation</button>
        </form>
        <div class="thanks" id="bookThanks" role="status" aria-live="polite">
          <div class="mark"><svg viewBox="0 0 56 56" fill="none"><circle cx="28" cy="28" r="26" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><path d="M18 29l7 7 14-16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <h3 id="bookThanksHead">A table awaits</h3>
          <p id="bookThanksBody">We've noted your request and will confirm by email within the hour.</p>
          <p class="small">Olive &amp; Ember · 114 Kindling Row, Hudson, NY</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow both" style="display:inline-flex">A Look Inside</span>
      <h2 class="section-title" style="margin-top:14px">The Room &amp; the Fire</h2>
    </div>
    <div class="gallery reveal">
      <div class="tile g1 has-img">
        <img src="assets/restaurant-hero.jpg" alt="The candlelit dining room and stone hearth at Olive &amp; Ember" loading="lazy" />
        <div class="gi"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3c2 3 5 4 5 8a5 5 0 01-10 0c0-2 1-3 2-4 .5 2 2 2 3 1-1-2-1-4 0-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="lbl">The Hearth</span></div>
      </div>
      <div class="tile g2"><div class="gi"><span class="lbl">Cellar Door</span></div></div>
      <div class="tile g3"><div class="gi"><span class="lbl">By the Fire</span></div></div>
      <div class="tile g4 has-img">
        <img src="assets/dish-1.jpg" alt="Wood-grilled dry-aged ribeye with melting bone-marrow butter" loading="lazy" />
        <div class="gi"><svg viewBox="0 0 24 24" fill="none"><path d="M4 18s2-3 8-3 8 3 8 3M6 15a6 6 0 0112 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="lbl">Off the Grill</span></div>
      </div>
      <div class="tile g5"><div class="gi"><span class="lbl">The Bar</span></div></div>
      <div class="tile g6"><div class="gi"><svg viewBox="0 0 24 24" fill="none"><path d="M5 21V8l4-3 4 3v13M13 21V11l5-3v13M3 21h18" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span class="lbl">The Room</span></div></div>
      <div class="tile g7 has-img">
        <img src="assets/dish-2.jpg" alt="A whole salt-baked branzino off the coals with fennel and grilled lemon" loading="lazy" />
        <div class="gi"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12c4-5 10-5 14 0-4 5-10 5-14 0z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="12" r="1" fill="currentColor"/></svg><span class="lbl">From the Coals</span></div>
      </div>
      <div class="tile g8"><div class="gi"><span class="lbl">Last Call</span></div></div>
    </div>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="brand">
        <div class="brand-name serif">Olive <span class="amp">&amp;</span> Ember</div>
        <div class="brand-tag">Wood-fired. Seasonal. Unhurried.</div>
        <p>A neighbourhood bistro cooking over live fire in the heart of the Hudson Valley — sourced from the farms we can drive to, served at the pace a good evening deserves.</p>
        <div class="socials">
          <a href="#" aria-label="Olive &amp; Ember on Instagram"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.7"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg></a>
          <a href="#" aria-label="Olive &amp; Ember on Facebook"><svg viewBox="0 0 24 24" fill="none"><path d="M14 8h2V5h-2.5C12 5 11 6.2 11 8v2H9v3h2v6h3v-6h2l.5-3H14V8.5c0-.3.2-.5.5-.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg></a>
          <a href="#" aria-label="Email Olive &amp; Ember"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        </div>
      </div>
      <div>
        <h4>Find Us</h4>
        <div class="flist">
          <span>114 Kindling Row</span>
          <span>Hudson, NY 12534</span>
          <span class="num">(518) 555-0147</span>
          <a href="#">hello@oliveandember.co</a>
        </div>
      </div>
      <div>
        <h4>Hours</h4>
        <div class="flist">
          <span>Mon — Closed</span>
          <span class="num">Tue – Thu · 5 – 10pm</span>
          <span class="num">Fri – Sat · til 11:30pm</span>
          <span class="num">Sun · 3 – 9pm (Roast)</span>
        </div>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2014–2026 Olive &amp; Ember. All rights reserved.</span>
      <span>Made with fire in the Hudson Valley.</span>
    </div>
  </div>
</footer>
`.trim()

const JS = `
// ---- Smooth-scroll the hero / nav buttons to their target section ----
(function () {
  document.querySelectorAll('[data-scroll]').forEach(function (el) {
    el.addEventListener('click', function () {
      var sel = el.getAttribute('data-scroll');
      var target = sel ? document.querySelector(sel) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

// ---- Highlight tonight's hours row based on the current day ----
(function () {
  var rows = document.querySelectorAll('.hours-card .hrow');
  if (!rows.length) return;
  // Row order: 0 Mon(closed), 1 Tue-Thu, 2 Fri, 3 Sat, 4 Sun.
  var day = new Date().getDay(); // 0 Sun ... 6 Sat
  var idx = -1;
  if (day === 0) idx = 4;
  else if (day >= 2 && day <= 4) idx = 1;
  else if (day === 5) idx = 2;
  else if (day === 6) idx = 3;
  if (idx >= 0 && rows[idx] && !rows[idx].classList.contains('closed')) {
    rows[idx].classList.add('now');
    var day0 = rows[idx].querySelector('.day');
    if (day0 && !day0.querySelector('.badge')) {
      var b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'Tonight';
      day0.appendChild(b);
    }
  }
})();

// ---- Visual-only reservation request (no network) ----
(function () {
  var form = document.getElementById('bookForm');
  var thanks = document.getElementById('bookThanks');
  if (!form || !thanks) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nameInput = document.getElementById('b-name');
    var party = document.getElementById('b-party');
    var time = document.getElementById('b-time');
    var date = document.getElementById('b-date');

    var first = '';
    if (nameInput && nameInput.value.trim()) {
      first = nameInput.value.trim().split(/\\s+/)[0];
    }
    var head = document.getElementById('bookThanksHead');
    if (head) head.textContent = first ? ('See you soon, ' + first) : 'A table awaits';

    var body = document.getElementById('bookThanksBody');
    if (body) {
      var p = party && party.value ? party.value : 'your party';
      var t = time && time.value ? time.value : '7:00pm';
      var d = date && date.value.trim() ? date.value.trim() : 'your chosen evening';
      body.textContent = 'We\\u2019ve pencilled in ' + p + ' for ' + d + ' at ' + t +
        '. Watch your inbox \\u2014 we\\u2019ll confirm within the hour.';
    }

    form.style.display = 'none';
    thanks.classList.add('show');
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();

// ---- Swap in featured / gallery photos only if they actually load (keep gradient otherwise) ----
(function () {
  document.querySelectorAll('.feat img, .tile img').forEach(function (img) {
    var host = img.closest('.feat, .tile');
    if (!host) return;
    if (img.complete && img.naturalWidth === 0) host.classList.remove('has-img');
    img.addEventListener('error', function () { host.classList.remove('has-img'); });
    img.addEventListener('load', function () { if (img.naturalWidth > 0) host.classList.add('has-img'); });
  });
})();
`.trim()

export const restaurant: Template = {
  id: 'restaurant',
  kind: 'page',
  name: 'Restaurant',
  tagline: 'An appetizing restaurant site with menu',
  categories: ['Business'],
  audiences: ['restaurant', 'hospitality', 'local'],
  description:
    'A warm, editorial site for a modern wood-fired bistro: a full-bleed photographic hero with the name in a fine display serif, a chef\\u2019s philosophy strip, a real printed-style menu (Starters / Mains / Desserts / Sides) with leader-dotted rows, tabular prices, italic descriptions and chef\\u2019s-pick dots, a featured-dishes trio, an Hours & Reservations card with a visual-only booking form, a gallery, and a footer with address and socials. Charcoal, terracotta/amber and cream with Cormorant Garamond + Inter.',
  fonts: {
    display: 'Cormorant Garamond',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#1c1a17',
  assets: ['restaurant-hero.jpg', 'dish-1.jpg', 'dish-2.jpg'],
  notes:
    'Palette knobs live in :root — --char / --char-2 (dark menu + footer), --cream / --paper (light sections + cards), --ember (terracotta) and --amber are the warm accents, --gold for tags, --ink / --mut / --faint for text. Rename the place in several spots: .hero-name and the .foot .brand-name (note the .amp span around the ampersand), .hero-tag / .brand-tag, the chef name in .philosophy .sig, and the address/phone in the hero meta, .hours-note, and the footer. THE MENU is plain HTML: each dish is a .dish block with a .name, a .leader (the dotted rule), a tabular .price, and an italic .desc; add a <span class="pick"></span> inside .name to flag a chef\\u2019s pick, and append <span class="tags"><span class="tag">V</span></span> for dietary tags. Add or remove .menu-cat sections or whole .menu-col columns freely. Featured plates are three .feat figures — f1/f2 use assets/dish-1.jpg & dish-2.jpg with gradient fallbacks, f3 is a pure-gradient tile (swap in a third photo by adding an <img> and the .has-img class). The hero photo is assets/restaurant-hero.jpg with a charcoal→amber gradient + scrim behind it, so a missing image still reads intentionally — recolor that in .hero { background }. The Hours card auto-highlights tonight\\u2019s row from the device clock (edit the row order / day mapping in the JS if you change the schedule). The reservation form is visual-only: on submit it preventDefaults and reveals #bookThanks with a personalised confirmation — nothing is sent anywhere. Gallery tiles g1–g8 are warm-gradient vignettes (faint grain + inner vignette via .tile::before, an uppercase .gi .lbl caption on each); g1/g4/g7 also carry real photos (restaurant-hero.jpg / dish-1.jpg / dish-2.jpg) behind an .has-img class with the same load-guarded gradient fallback as the featured plates, so a missing image still reads intentionally. Swap any tile to a real photo by adding an <img src="assets/\\u2026"> plus the .has-img class, or edit the .gi .lbl text.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#1c1a17',
  },
}
