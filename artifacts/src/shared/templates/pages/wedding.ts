import type { Template } from '../types'

// An elegant, romantic wedding invitation page. Full-bleed photographic hero with
// an ivory→blush gradient fallback + soft scrim, a fine high-contrast serif name
// lockup with an ampersand flourish, a live JS countdown to the wedding date,
// "Our Story", a refined schedule timeline, travel & stay cards, a visual-only
// RSVP form, a small gallery, and delicate hand-drawn floral SVG dividers.
// Palette: ivory / blush / sage. Type: Cormorant Garamond + EB Garamond.

const CSS = `
:root {
  --ivory: #faf6f0;
  --paper: #fffdfa;
  --blush: #e8c7c3;
  --blush-soft: #f4e2df;
  --rose: #c98a86;
  --sage: #8a9a83;
  --sage-soft: #d7ddd1;
  --ink: #3a3330;
  --mut: #8c817a;
  --faint: #b7aca4;
  --line: rgba(58,51,48,0.12);
  --gold: #b89a6a;
  --display: 'Cormorant Garamond', Georgia, serif;
  --body: 'EB Garamond', Georgia, serif;
  --page-font: var(--body);
}
body { background: var(--ivory); color: var(--ink); font-family: var(--body); font-size: 18px; line-height: 1.7; }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 56px); }
.serif { font-family: var(--display); }
h1, h2, h3 { font-family: var(--display); font-weight: 500; margin: 0; letter-spacing: 0.01em; }
::selection { background: var(--blush-soft); }
a { color: var(--rose); }

/* ---------- eyebrow / kicker ---------- */
.eyebrow {
  font-family: var(--body); text-transform: uppercase; letter-spacing: 0.42em;
  font-size: clamp(10px, 1.4vw, 12px); color: var(--rose); font-weight: 500;
  display: inline-block;
}
.section-kicker { text-align: center; margin-bottom: 10px; }
.section-title { text-align: center; font-size: clamp(34px, 6vw, 56px); line-height: 1.05; letter-spacing: 0.005em; }

/* ---------- HERO ---------- */
.hero {
  position: relative; min-height: 100svh; display: grid; place-items: center;
  text-align: center; overflow: hidden; isolation: isolate; padding: 56px 20px;
  /* gradient fallback behind the photo so a missing image still reads intentionally */
  background:
    radial-gradient(120% 90% at 50% 12%, rgba(255,255,255,0.55), transparent 55%),
    linear-gradient(168deg, #fbf3ee 0%, #f3ddd8 46%, #e8c7c3 78%, #dcb6b2 100%);
}
.hero-img {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  z-index: -2; opacity: 0;
  animation: heroIn 2.4s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
  transform: scale(1.06);
  filter: saturate(0.92) brightness(1.02);
}
@keyframes heroIn { to { opacity: 1; transform: scale(1); } }
.hero::after {
  /* soft ivory scrim for legibility, vignetted */
  content: ''; position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(110% 80% at 50% 38%, transparent 38%, rgba(58,51,48,0.18) 100%),
    linear-gradient(180deg, rgba(250,246,240,0.34) 0%, rgba(250,246,240,0.10) 30%, rgba(58,51,48,0.30) 100%);
}
.hero-inner { position: relative; color: #fffaf4; max-width: 780px; }
.hero .eyebrow { color: rgba(255,250,244,0.92); text-shadow: 0 1px 14px rgba(58,51,48,0.45); }
.hero-names {
  font-size: clamp(58px, 15vw, 152px); line-height: 0.92; font-weight: 500;
  letter-spacing: 0.01em; margin: 18px 0 6px;
  text-shadow: 0 2px 30px rgba(58,51,48,0.4);
}
.hero-names .amp {
  display: block; font-style: italic; font-size: clamp(40px, 9vw, 92px);
  color: var(--blush); margin: -6px 0; font-weight: 400;
  text-shadow: 0 2px 24px rgba(58,51,48,0.45);
}
.hero-meta {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: clamp(10px, 3vw, 26px);
  margin-top: 22px; font-size: clamp(13px, 2.2vw, 17px);
  letter-spacing: 0.18em; text-transform: uppercase;
  text-shadow: 0 1px 12px rgba(58,51,48,0.5);
}
.hero-meta > span:not(.sep) { white-space: nowrap; }
.hero-meta .sep { width: 5px; height: 5px; border-radius: 50%; background: var(--blush); flex: none; }
.scroll-cue {
  position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
  color: rgba(255,250,244,0.8); font-size: 11px; letter-spacing: 0.3em;
  text-transform: uppercase; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.scroll-cue::after { content: ''; width: 1px; height: 34px; background: linear-gradient(rgba(255,250,244,0.85), transparent); animation: cue 2.2s ease-in-out infinite; transform-origin: top; }
@keyframes cue { 0%,100% { transform: scaleY(0.4); opacity: 0.4; } 50% { transform: scaleY(1); opacity: 1; } }

/* ---------- floral divider ---------- */
.divider { display: flex; align-items: center; justify-content: center; gap: 18px; margin: clamp(46px, 9vw, 96px) 0; color: var(--sage); }
.divider svg { width: clamp(120px, 30vw, 240px); height: auto; }
.divider .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blush); }

/* ---------- COUNTDOWN ---------- */
.count { text-align: center; margin-top: clamp(40px, 8vw, 72px); }
.count h2 { font-size: clamp(26px, 4.5vw, 38px); font-style: italic; color: var(--ink); }
.count .sub { color: var(--mut); margin-top: 6px; letter-spacing: 0.04em; }
.count-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(12px, 2.6vw, 26px);
  max-width: 700px; margin: 34px auto 0;
}
.count-box {
  background: var(--paper); border: 1px solid var(--line); border-radius: 4px;
  padding: clamp(18px, 3.4vw, 30px) 10px; position: relative;
  box-shadow: 0 18px 40px -30px rgba(58,51,48,0.5);
}
.count-box::before {
  content: ''; position: absolute; inset: 6px; border: 1px solid var(--blush-soft); border-radius: 2px; pointer-events: none;
}
.count-box .n {
  font-family: var(--display); font-weight: 500; font-size: clamp(38px, 8vw, 64px);
  line-height: 1; color: var(--ink); font-variant-numeric: tabular-nums;
}
.count-box .l {
  text-transform: uppercase; letter-spacing: 0.26em; font-size: clamp(9px, 1.6vw, 11px);
  color: var(--rose); margin-top: 10px;
}

/* ---------- generic section ---------- */
.section { padding: clamp(20px, 4vw, 40px) 0; }
.lede { max-width: 660px; margin: 14px auto 0; text-align: center; color: var(--mut); font-size: clamp(17px, 2.4vw, 20px); }

/* ---------- STORY ---------- */
.story { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: clamp(28px, 6vw, 72px); align-items: center; }
.story-copy h2 { font-size: clamp(30px, 5vw, 46px); margin-bottom: 16px; }
.story-copy p { color: #5a514c; margin: 0 0 16px; }
.story-copy .first::first-letter {
  font-family: var(--display); font-size: 3.4em; line-height: 0.7; float: left;
  margin: 8px 12px 0 0; color: var(--rose); font-weight: 500;
}
.story-frame {
  position: relative; aspect-ratio: 4 / 5; border-radius: 4px; overflow: hidden;
  background: linear-gradient(150deg, var(--blush-soft), var(--sage-soft));
  box-shadow: 0 30px 60px -36px rgba(58,51,48,0.55);
}
.story-frame::after { content: ''; position: absolute; inset: 12px; border: 1px solid rgba(255,253,250,0.65); border-radius: 2px; }
.story-frame .glyph {
  position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,253,250,0.85);
  font-family: var(--display); font-style: italic; font-size: clamp(30px, 7vw, 54px); letter-spacing: 0.02em;
}
.story-sig { font-family: var(--display); font-style: italic; font-size: clamp(20px, 3vw, 26px); color: var(--rose); margin-top: 4px; }

/* ---------- SCHEDULE TIMELINE ---------- */
.timeline { max-width: 720px; margin: clamp(30px, 6vw, 50px) auto 0; position: relative; }
.timeline::before {
  content: ''; position: absolute; left: clamp(58px, 14vw, 92px); top: 8px; bottom: 8px;
  width: 1px; background: linear-gradient(var(--blush), var(--sage-soft), var(--blush));
}
.tl-row { display: grid; grid-template-columns: clamp(58px, 14vw, 92px) 36px 1fr; align-items: start; gap: clamp(8px, 2vw, 16px); padding: clamp(14px, 3vw, 22px) 0; }
.tl-time { text-align: right; font-family: var(--display); font-size: clamp(18px, 3vw, 24px); color: var(--ink); padding-top: 1px; font-variant-numeric: tabular-nums; }
.tl-time small { display: block; font-family: var(--body); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--faint); }
.tl-node { display: grid; place-items: center; padding-top: 6px; }
.tl-node i { width: 13px; height: 13px; border-radius: 50%; background: var(--paper); border: 2px solid var(--rose); box-shadow: 0 0 0 5px var(--ivory); position: relative; z-index: 1; }
.tl-row:nth-child(even) .tl-node i { border-color: var(--sage); }
.tl-body h3 { font-size: clamp(20px, 3.4vw, 27px); }
.tl-body p { color: var(--mut); margin: 4px 0 0; font-size: clamp(15px, 2.2vw, 17px); }

/* ---------- TRAVEL CARDS ---------- */
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(16px, 2.6vw, 26px); margin-top: clamp(28px, 5vw, 44px); }
.card {
  background: var(--paper); border: 1px solid var(--line); border-radius: 4px;
  padding: clamp(22px, 3.2vw, 32px); position: relative; overflow: hidden;
  box-shadow: 0 22px 46px -34px rgba(58,51,48,0.45);
}
.card .badge {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  background: var(--blush-soft); color: var(--rose); margin-bottom: 16px;
}
.card:nth-child(2) .badge { background: var(--sage-soft); color: var(--sage); }
.card .badge svg { width: 22px; height: 22px; }
.card h3 { font-size: clamp(21px, 3vw, 26px); }
.card .place { color: var(--rose); font-style: italic; font-family: var(--display); font-size: 18px; margin: 2px 0 10px; }
.card p { color: var(--mut); margin: 0 0 14px; font-size: 16px; }
.card .meta { display: flex; flex-direction: column; gap: 6px; font-size: 14.5px; color: #5a514c; }
.card .meta span { display: flex; gap: 8px; }
.card .meta b { color: var(--ink); font-weight: 600; }

/* ---------- RSVP ---------- */
.rsvp {
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255,253,250,0.7), transparent 60%),
    linear-gradient(160deg, var(--blush-soft), var(--sage-soft));
  border-radius: 6px; padding: clamp(34px, 6vw, 70px) clamp(22px, 5vw, 60px);
  text-align: center; position: relative; overflow: hidden;
  box-shadow: 0 40px 80px -50px rgba(58,51,48,0.5);
}
.rsvp::before, .rsvp::after {
  content: ''; position: absolute; width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,253,250,0.5), transparent 70%); pointer-events: none;
}
.rsvp::before { top: -90px; left: -70px; }
.rsvp::after { bottom: -110px; right: -80px; background: radial-gradient(circle, rgba(138,154,131,0.28), transparent 70%); }
.rsvp h2 { font-size: clamp(30px, 5.5vw, 50px); position: relative; }
.rsvp .lede { color: #5a514c; margin-top: 12px; }
.rsvp-form { max-width: 560px; margin: 30px auto 0; text-align: left; position: relative; }
.field { margin-bottom: 18px; }
.field label { display: block; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--rose); margin-bottom: 8px; }
.field input, .field select {
  width: 100%; box-sizing: border-box; font-family: var(--body); font-size: 17px; color: var(--ink);
  background: rgba(255,253,250,0.86); border: 1px solid rgba(58,51,48,0.16); border-radius: 3px;
  padding: 14px 16px; appearance: none; transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.field input::placeholder { color: var(--faint); }
.field input:focus, .field select:focus {
  outline: none; border-color: var(--rose); box-shadow: 0 0 0 4px rgba(201,138,134,0.18);
}
.field select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23c98a86' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; padding-right: 42px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.btn {
  width: 100%; border: 0; cursor: pointer; font-family: var(--display); font-weight: 500;
  font-size: clamp(18px, 2.6vw, 22px); letter-spacing: 0.06em; color: #fffaf4;
  background: linear-gradient(150deg, var(--rose), #b3756f); border-radius: 3px;
  padding: 16px 22px; margin-top: 8px; transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 16px 32px -16px rgba(179,117,111,0.8);
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 22px 40px -18px rgba(179,117,111,0.9); }
.btn:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.thanks {
  display: none; text-align: center; padding: 14px 6px; position: relative;
}
.thanks.show { display: block; animation: thanksIn 0.7s cubic-bezier(0.22,1,0.36,1); }
@keyframes thanksIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.thanks .mark { width: 64px; height: 64px; margin: 0 auto 18px; color: var(--rose); }
.thanks h3 { font-size: clamp(26px, 5vw, 40px); font-style: italic; color: var(--ink); }
.thanks p { color: #5a514c; margin-top: 8px; }

/* ---------- GALLERY ---------- */
.gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(10px, 1.8vw, 16px); margin-top: clamp(28px, 5vw, 44px); }
.tile {
  aspect-ratio: 3 / 4; border-radius: 3px; position: relative; overflow: hidden;
  box-shadow: 0 18px 36px -28px rgba(58,51,48,0.5);
}
.tile::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(255,253,250,0.55); border-radius: 3px; }
.tile.t1 { background: linear-gradient(150deg, var(--blush), var(--blush-soft)); }
.tile.t2 { background: linear-gradient(150deg, var(--sage-soft), #c4cdba); aspect-ratio: 3 / 3.4; align-self: end; }
.tile.t3 { background: linear-gradient(150deg, #f0dcd8, var(--blush)); aspect-ratio: 3 / 3.6; }
.tile.t4 { background: linear-gradient(150deg, #e3d6c4, var(--blush-soft)); }
.tile.t5 { background: linear-gradient(150deg, var(--blush-soft), var(--sage-soft)); aspect-ratio: 3 / 3.5; align-self: end; }
.tile.t6 { background: linear-gradient(150deg, #d8cdbb, #efe2d6); }
.tile.t7 { background: linear-gradient(150deg, var(--sage-soft), var(--blush-soft)); aspect-ratio: 3 / 3.7; }
.tile.t8 { background: linear-gradient(150deg, var(--blush), #e9d2cd); }
.tile .heart { position: absolute; inset: 0; display: grid; place-items: center; color: rgba(255,253,250,0.7); }
.tile .heart svg { width: 26px; height: 26px; }

/* ---------- FOOTER ---------- */
.foot { text-align: center; padding: clamp(50px, 9vw, 96px) 0 60px; }
.foot .mono { font-family: var(--display); font-style: italic; font-size: clamp(28px, 5vw, 44px); color: var(--ink); }
.foot .tag { color: var(--mut); letter-spacing: 0.04em; margin-top: 10px; }
.foot .hash { display: inline-block; margin-top: 22px; padding: 9px 20px; border: 1px solid var(--line); border-radius: 999px; color: var(--rose); letter-spacing: 0.14em; text-transform: uppercase; font-size: 12px; }

/* ---------- responsive ---------- */
@media (max-width: 820px) {
  body { font-size: 17px; }
  .story { grid-template-columns: 1fr; gap: 30px; }
  .story-frame { max-width: 420px; margin: 0 auto; width: 100%; }
  .cards { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; }
  .gallery { grid-template-columns: repeat(2, 1fr); }
  .tile.t2, .tile.t5, .tile.t7 { align-self: auto; }
}
@media (max-width: 560px) {
  .count-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; max-width: 340px; }
  .hero-meta { flex-direction: column; gap: 10px; }
  .hero-meta .sep { width: 26px; height: 1px; border-radius: 0; }
  .field-row { grid-template-columns: 1fr; }
  .timeline::before { left: 46px; }
  .tl-row { grid-template-columns: 46px 28px 1fr; }
}
`.trim()

const HTML = `
<header class="hero">
  <img class="hero-img" src="assets/wedding-hero.jpg" alt="Amara and Noah embracing in a sunlit garden" loading="eager" />
  <div class="hero-inner">
    <span class="eyebrow">Together with their families</span>
    <h1 class="hero-names serif">Amara<span class="amp">&amp;</span>Noah</h1>
    <div class="hero-meta">
      <span>Saturday, the Nineteenth of September</span>
      <span class="sep"></span>
      <span>Two Thousand Twenty-Six</span>
    </div>
    <div class="hero-meta" style="margin-top:14px">
      <span>Villa Aurelia</span>
      <span class="sep"></span>
      <span>Sonoma, California</span>
    </div>
  </div>
  <div class="scroll-cue">Scroll</div>
</header>

<div class="wrap">

  <section class="count section" id="countdown">
    <span class="eyebrow section-kicker">Counting the days</span>
    <h2 class="serif">Until we say "I do"</h2>
    <p class="sub">September 19, 2026 · 3:00 in the afternoon</p>
    <div class="count-grid" id="clock">
      <div class="count-box"><div class="n num" data-days>—</div><div class="l">Days</div></div>
      <div class="count-box"><div class="n num" data-hours>—</div><div class="l">Hours</div></div>
      <div class="count-box"><div class="n num" data-mins>—</div><div class="l">Minutes</div></div>
      <div class="count-box"><div class="n num" data-secs>—</div><div class="l">Seconds</div></div>
    </div>
  </section>

  <div class="divider reveal" data-reveal="none">
    <svg viewBox="0 0 240 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 12h78" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M160 12h78" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M120 4c-6 4-10 6-10 8s4 4 10 8c6-4 10-6 10-8s-4-4-10-8z" fill="#e8c7c3"/>
      <path d="M120 5c-9-3-18 1-18 7M120 5c9-3 18 1 18 7M120 19c-7 2-13-1-13-6M120 19c7 2 13-1 13-6" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>
      <circle cx="92" cy="12" r="2" fill="currentColor" opacity="0.55"/>
      <circle cx="148" cy="12" r="2" fill="currentColor" opacity="0.55"/>
    </svg>
  </div>

  <section class="section" id="story">
    <span class="eyebrow section-kicker">How it began</span>
    <h2 class="section-title">Our Story</h2>
    <div class="story reveal" style="margin-top:clamp(28px,5vw,48px)">
      <div class="story-copy">
        <p class="first">It started over a shared umbrella and a spilled flat white, on a grey October morning outside a tiny bookshop in Lisbon. Amara was chasing a runaway page of her notebook; Noah was the stranger who caught it.</p>
        <p>One coffee turned into six hours of conversation, then a year of postcards across two time zones, then a quiet decision that the distance was no longer worth keeping. Five winters later, on the same cobbled corner where it all began, Noah got down on one knee.</p>
        <p>Now we'd be honoured to have you beside us as we begin the next chapter — surrounded by the people who make our story whole.</p>
        <p class="story-sig">With all our love, Amara &amp; Noah</p>
      </div>
      <div class="story-frame" data-reveal="right">
        <div class="glyph">est. 2021</div>
      </div>
    </div>
  </section>

  <div class="divider reveal" data-reveal="none">
    <span class="dot"></span>
    <svg viewBox="0 0 200 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M100 3C92 9 84 9 84 14c0 4 7 6 16 6s16-2 16-6c0-5-8-5-16-11z" fill="#d7ddd1"/>
      <path d="M100 3c4 5 9 7 16 8M100 3c-4 5-9 7-16 8" stroke="#8a9a83" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M2 14h74M124 14h74" stroke="#8a9a83" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    </svg>
    <span class="dot"></span>
  </div>

  <section class="section" id="schedule">
    <span class="eyebrow section-kicker">A day to remember</span>
    <h2 class="section-title">Schedule of the Day</h2>
    <p class="lede">Villa Aurelia opens its gardens to you for an afternoon and evening of celebration. Come early, stay late.</p>
    <div class="timeline">
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">2:30<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>Arrival &amp; Welcome</h3><p>Sparkling lemonade on the terrace as guests are seated beneath the olive trees.</p></div>
      </div>
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">3:00<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>The Ceremony</h3><p>We exchange our vows in the rose garden. Please silence phones — our photographer has the moment.</p></div>
      </div>
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">4:00<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>Cocktail Hour</h3><p>Garden spritzes, a string quartet, and far too many canapés on the south lawn.</p></div>
      </div>
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">6:00<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>Dinner &amp; Toasts</h3><p>A long-table feast under the festoon lights, with words from those who know us best.</p></div>
      </div>
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">8:30<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>First Dance &amp; Revelry</h3><p>The band strikes up and the dance floor opens. Comfortable shoes encouraged.</p></div>
      </div>
      <div class="tl-row reveal" data-reveal="left">
        <div class="tl-time num">11:30<small>pm</small></div>
        <div class="tl-node"><i></i></div>
        <div class="tl-body"><h3>A Starlit Send-Off</h3><p>Sparklers, one last slow song, and a farewell beneath the Sonoma sky.</p></div>
      </div>
    </div>
  </section>

  <div class="divider reveal" data-reveal="none">
    <svg viewBox="0 0 240 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2 12h78" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M160 12h78" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M120 4c-6 4-10 6-10 8s4 4 10 8c6-4 10-6 10-8s-4-4-10-8z" fill="#e8c7c3"/>
      <path d="M120 5c-9-3-18 1-18 7M120 5c9-3 18 1 18 7M120 19c-7 2-13-1-13-6M120 19c7 2 13-1 13-6" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>
      <circle cx="92" cy="12" r="2" fill="currentColor" opacity="0.55"/>
      <circle cx="148" cy="12" r="2" fill="currentColor" opacity="0.55"/>
    </svg>
  </div>

  <section class="section" id="travel">
    <span class="eyebrow section-kicker">Plan your trip</span>
    <h2 class="section-title">Travel &amp; Stay</h2>
    <p class="lede">Sonoma is an hour north of San Francisco. Here's everything you'll need to find us and rest your head.</p>
    <div class="cards">
      <div class="card reveal">
        <div class="badge"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.6" stroke="currentColor" stroke-width="1.6"/></svg></div>
        <h3>The Venue</h3>
        <div class="place">Villa Aurelia</div>
        <p>A 1920s estate framed by olive groves and rose gardens, with a grand terrace for dancing.</p>
        <div class="meta">
          <span>1840 Vineyard Lane,<br/>Sonoma, CA 95476</span>
          <span><b>Parking</b> · Complimentary valet on arrival</span>
        </div>
      </div>
      <div class="card reveal">
        <div class="badge"><svg viewBox="0 0 24 24" fill="none"><path d="M3 21V8l9-5 9 5v13" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 21h18M9 21v-5h6v5M7 11h2M15 11h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
        <h3>Where to Stay</h3>
        <div class="place">The Olive Inn</div>
        <p>We've reserved a block of rooms a short stroll from the venue, held until May 1st.</p>
        <div class="meta">
          <span><b>Code</b> · AMARANOAH26</span>
          <span><b>From</b> · $189 / night, breakfast included</span>
        </div>
      </div>
      <div class="card reveal">
        <div class="badge"><svg viewBox="0 0 24 24" fill="none"><path d="M5 16l-2 4M19 16l2 4M4 16h16l-1.4-5.2A3 3 0 0015.7 8.5H8.3a3 3 0 00-2.9 2.3L4 16z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="7.5" cy="16" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="16" r="1.6" stroke="currentColor" stroke-width="1.6"/></svg></div>
        <h3>Getting Here</h3>
        <div class="place">By air &amp; road</div>
        <p>Fly into SFO or OAK, then drive north. A welcome shuttle loops from The Olive Inn.</p>
        <div class="meta">
          <span><b>Shuttle</b> · 2:00pm &amp; 2:20pm pickups</span>
          <span><b>Rideshare</b> · Available throughout the evening</span>
        </div>
      </div>
    </div>
  </section>

  <div class="divider reveal" data-reveal="none">
    <span class="dot"></span>
    <svg viewBox="0 0 200 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M100 3C92 9 84 9 84 14c0 4 7 6 16 6s16-2 16-6c0-5-8-5-16-11z" fill="#d7ddd1"/>
      <path d="M100 3c4 5 9 7 16 8M100 3c-4 5-9 7-16 8" stroke="#8a9a83" stroke-width="0.9" stroke-linecap="round"/>
      <path d="M2 14h74M124 14h74" stroke="#8a9a83" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
    </svg>
    <span class="dot"></span>
  </div>

  <section class="section" id="rsvp">
    <div class="rsvp reveal">
      <span class="eyebrow" style="color:var(--rose)">Kindly reply by May 1st</span>
      <h2 class="serif" style="margin-top:8px">Will you join us?</h2>
      <p class="lede">Let us know you're coming so we can save you a seat at the table — and a slice of cake.</p>
      <form class="rsvp-form" id="rsvpForm" novalidate>
        <div class="field">
          <label for="rsvp-name">Full name</label>
          <input id="rsvp-name" name="name" type="text" placeholder="e.g. Eleanor Whitfield" autocomplete="name" />
        </div>
        <div class="field-row">
          <div class="field">
            <label for="rsvp-attend">Will you attend?</label>
            <select id="rsvp-attend" name="attending">
              <option>Joyfully accepts</option>
              <option>Regretfully declines</option>
            </select>
          </div>
          <div class="field">
            <label for="rsvp-guests">Number of guests</label>
            <select id="rsvp-guests" name="guests">
              <option>Just me</option>
              <option>2 guests</option>
              <option>3 guests</option>
              <option>4 guests</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="rsvp-note">A note or dietary needs (optional)</label>
          <input id="rsvp-note" name="note" type="text" placeholder="Vegetarian, a song request, a hello…" />
        </div>
        <button class="btn" type="submit">Send our RSVP</button>
      </form>
      <div class="thanks" id="thanks" role="status" aria-live="polite">
        <div class="mark"><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="1.5" opacity="0.4"/><path d="M20 33l8 8 16-18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3 id="thanksName">Thank you</h3>
        <p>We can't wait to celebrate with you. Watch your inbox — details to follow closer to the day.</p>
      </div>
    </div>
  </section>

  <section class="section" id="gallery">
    <span class="eyebrow section-kicker">A few of our favourites</span>
    <h2 class="section-title">Moments</h2>
    <div class="gallery reveal">
      <div class="tile t1"></div>
      <div class="tile t2"><div class="heart"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-5.2-9.6-9.3C.8 8.4 2.4 5 5.6 5 7.7 5 9 6.2 12 9c3-2.8 4.3-4 6.4-4 3.2 0 4.8 3.4 3.2 6.7C19.5 15.8 12 21 12 21z"/></svg></div></div>
      <div class="tile t3"></div>
      <div class="tile t4"></div>
      <div class="tile t5"></div>
      <div class="tile t6"><div class="heart"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-5.2-9.6-9.3C.8 8.4 2.4 5 5.6 5 7.7 5 9 6.2 12 9c3-2.8 4.3-4 6.4-4 3.2 0 4.8 3.4 3.2 6.7C19.5 15.8 12 21 12 21z"/></svg></div></div>
      <div class="tile t7"></div>
      <div class="tile t8"></div>
    </div>
  </section>

  <footer class="foot">
    <div class="divider" style="margin-top:0">
      <svg viewBox="0 0 240 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M2 12h78" stroke="#8a9a83" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
        <path d="M160 12h78" stroke="#8a9a83" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
        <path d="M120 4c-6 4-10 6-10 8s4 4 10 8c6-4 10-6 10-8s-4-4-10-8z" fill="#e8c7c3"/>
        <circle cx="92" cy="12" r="2" fill="#8a9a83" opacity="0.55"/>
        <circle cx="148" cy="12" r="2" fill="#8a9a83" opacity="0.55"/>
      </svg>
    </div>
    <div class="mono">Amara &amp; Noah</div>
    <p class="tag">September 19, 2026 · Villa Aurelia · Sonoma, California</p>
    <span class="hash">#AmaraAndNoah</span>
  </footer>

</div>
`.trim()

const JS = `
// ---- Live countdown to the wedding ----
(function () {
  // Target: Saturday, September 19, 2026, 3:00pm local time. Safety net — if the
  // date has already passed (e.g. a template viewed long after authoring), roll
  // the year forward so the countdown always ticks instead of dying at zero.
  var target = new Date('2026-09-19T15:00:00');
  while (target - new Date() <= 0) { target.setFullYear(target.getFullYear() + 1); }
  var elDays = document.querySelector('[data-days]');
  var elHours = document.querySelector('[data-hours]');
  var elMins = document.querySelector('[data-mins]');
  var elSecs = document.querySelector('[data-secs]');
  if (!elDays) return;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick() {
    var diff = target - new Date();
    if (diff <= 0) {
      elDays.textContent = '0';
      elHours.textContent = '00';
      elMins.textContent = '00';
      elSecs.textContent = '00';
      var h2 = document.querySelector('#countdown h2');
      if (h2) h2.textContent = 'Today is the day';
      return false;
    }
    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400);
    var hours = Math.floor((s % 86400) / 3600);
    var mins = Math.floor((s % 3600) / 60);
    var secs = s % 60;
    elDays.textContent = String(days);
    elHours.textContent = pad(hours);
    elMins.textContent = pad(mins);
    elSecs.textContent = pad(secs);
    return true;
  }

  tick();
  var timer = setInterval(function () {
    if (tick() === false) clearInterval(timer);
  }, 1000);
})();

// ---- Visual-only RSVP (no network) ----
(function () {
  var form = document.getElementById('rsvpForm');
  var thanks = document.getElementById('thanks');
  if (!form || !thanks) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nameInput = document.getElementById('rsvp-name');
    var attend = document.getElementById('rsvp-attend');
    var first = '';
    if (nameInput && nameInput.value.trim()) {
      first = nameInput.value.trim().split(/\\s+/)[0];
    }
    var declining = attend && /declin/i.test(attend.value);
    var head = document.getElementById('thanksName');
    if (head) {
      if (declining) {
        head.textContent = first ? ('We\\u2019ll miss you, ' + first) : 'We\\u2019ll miss you';
      } else {
        head.textContent = first ? ('Thank you, ' + first + '!') : 'Thank you!';
      }
    }
    var msg = thanks.querySelector('p');
    if (msg) {
      msg.textContent = declining
        ? 'We understand, and we\\u2019ll raise a glass to you from afar. Thank you for letting us know.'
        : 'We can\\u2019t wait to celebrate with you. Watch your inbox \\u2014 details to follow closer to the day.';
    }
    form.style.display = 'none';
    thanks.classList.add('show');
    thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();
`.trim()

export const wedding: Template = {
  id: 'wedding',
  kind: 'page',
  name: 'Wedding',
  tagline: 'An elegant wedding invite with live countdown',
  categories: ['Personal'],
  audiences: ['personal', 'event', 'wedding'],
  description:
    'A romantic, editorial wedding invitation: a full-bleed photographic hero with a fine high-contrast serif name lockup, a live JS countdown ticking down to the wedding day, "Our Story", a refined schedule timeline, travel & stay cards, a tastefully styled RSVP form (visual-only, with a gracious thank-you), a soft gallery, and delicate floral SVG dividers. Ivory, blush, and sage with Cormorant Garamond + EB Garamond.',
  fonts: {
    display: 'Cormorant Garamond',
    body: 'EB Garamond',
    links: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
    ],
  },
  stageBg: '#faf6f0',
  assets: ['wedding-hero.jpg'],
  notes:
    'Palette knobs live in :root — --ivory (page), --blush / --blush-soft / --rose (warm accents), --sage / --sage-soft (cool accents), --gold, --ink (text). Swap the couple in HTML: .hero-names (note the .amp span for the italic ampersand), the .hero-meta lines, the #countdown sub-line, .foot, and #AmaraAndNoah. CHANGE THE DATE in TWO places: the JS target new Date(2026-09-19T15:00:00) drives the live countdown (it auto-rolls the year forward if the date has passed so the timer never dies), and the human-readable strings in the hero / countdown / footer (keep the weekday word in sync with the date). The hero photo is assets/wedding-hero.jpg; a layered ivory→blush gradient sits behind it as a fallback, so a missing image still looks intentional — recolor that fallback in .hero { background }. Schedule is a list of .tl-row items (time + title + blurb); add/remove rows freely. Travel is three .card blocks. The RSVP form is visual-only: on submit it preventDefaults and reveals #thanks (it personalizes the greeting from the first name and handles a "declines" path) — no data is sent anywhere. Gallery tiles t1–t8 are gradient placeholders; swap any for <img src="assets/…"> if you add photos. Floral dividers are inline SVG — recolor via currentColor / the fill hexes.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#faf6f0',
  },
}
