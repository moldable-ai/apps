import type { Template } from '../types'

// SIGNAL '25 — a high-energy tech-conference site. Animated gradient/grid hero
// backdrop, kinetic event name, a live JS countdown, a stats bar, a speakers grid
// with hand-rolled SVG monogram avatars, a JS track-tab schedule, a tiered
// sponsors wall, ticket tiers, and a stylized SVG venue map. Electric
// blue→violet→pink accent on a near-black canvas. Pure CSS/SVG — no imagery, no
// chart libs. Self-contained.

const CSS = `
:root {
  --bg: #07070d;
  --bg-2: #0c0c16;
  --panel: rgba(255,255,255,0.035);
  --panel-2: rgba(255,255,255,0.05);
  --line: rgba(255,255,255,0.09);
  --line-2: rgba(255,255,255,0.14);
  --ink: #f5f6fb;
  --mut: #9a9cb2;
  --faint: #61637c;
  --c1: #3b82f6;      /* electric blue  */
  --c2: #8b5cf6;      /* violet         */
  --c3: #ec4899;      /* pink           */
  --c4: #22d3ee;      /* cyan accent    */
  --grad: linear-gradient(100deg, var(--c1), var(--c2) 52%, var(--c3));
  --grad-soft: linear-gradient(100deg, var(--c1), var(--c3));
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background: var(--bg);
  color: var(--ink);
  overflow-x: hidden;
}
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
.grad-text {
  background: var(--grad); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
section { position: relative; }

/* ===== NAV ===== */
.nav {
  position: sticky; top: 0; z-index: 40;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  border-bottom: 1px solid var(--line);
}
.nav .wrap { display: flex; align-items: center; gap: 18px; height: 64px; }
.logo { display: inline-flex; align-items: center; gap: 11px; font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.01em; }
.logo .mk { width: 30px; height: 30px; border-radius: 9px; background: var(--grad); box-shadow: 0 8px 24px -8px var(--c2); position: relative; }
.logo .mk::after { content: ''; position: absolute; inset: 8px; border-radius: 4px; border: 2px solid rgba(255,255,255,0.9); }
.nav-links { display: flex; gap: 26px; margin-left: 14px; }
.nav-links a { color: var(--mut); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.18s; }
.nav-links a:hover { color: var(--ink); }
.nav .spacer { flex: 1; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; cursor: pointer; font-family: var(--body); font-weight: 600;
  font-size: 14px; padding: 11px 20px; border-radius: 999px; color: #fff;
  background: var(--grad); box-shadow: 0 10px 30px -10px var(--c2);
  text-decoration: none; transition: transform 0.16s ease, box-shadow 0.16s ease;
  background-size: 160% 100%;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 16px 38px -12px var(--c3); background-position: 100% 0; }
.btn:focus-visible { outline: 2px solid var(--c4); outline-offset: 3px; }
.btn.ghost { background: var(--panel-2); color: var(--ink); box-shadow: none; border: 1px solid var(--line-2); }
.btn.ghost:hover { background: rgba(255,255,255,0.1); }
.btn.lg { font-size: 15.5px; padding: 15px 30px; }

/* ===== HERO ===== */
.hero { padding: clamp(56px, 11vw, 130px) 0 clamp(48px, 8vw, 96px); text-align: center; isolation: isolate; }
.hero-bg { position: absolute; inset: 0; z-index: -1; overflow: hidden; }
.hero-bg .glow {
  position: absolute; left: 50%; top: -10%; width: 1100px; height: 760px; transform: translateX(-50%);
  background: radial-gradient(46% 50% at 30% 18%, rgba(59,130,246,0.5), transparent 70%),
              radial-gradient(46% 50% at 72% 26%, rgba(236,72,153,0.45), transparent 70%),
              radial-gradient(40% 46% at 50% 60%, rgba(139,92,246,0.4), transparent 72%);
  filter: blur(20px); opacity: 0.85; animation: drift 16s ease-in-out infinite alternate;
}
@keyframes drift {
  0%   { transform: translateX(-50%) translateY(0) scale(1); }
  100% { transform: translateX(-50%) translateY(28px) scale(1.06); }
}
.grid-bg {
  position: absolute; inset: -2px; opacity: 0.5;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 54px 54px;
  -webkit-mask-image: radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%);
          mask-image: radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 78%);
}
.pill {
  display: inline-flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 600;
  color: var(--ink); padding: 7px 15px 7px 13px; border-radius: 999px;
  background: var(--panel-2); border: 1px solid var(--line-2); margin-bottom: 26px;
  letter-spacing: 0.01em;
}
.pill .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c3); box-shadow: 0 0 0 0 rgba(236,72,153,0.6); animation: pulse 1.9s infinite; }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(236,72,153,0.55)} 70%{box-shadow:0 0 0 8px rgba(236,72,153,0)} 100%{box-shadow:0 0 0 0 rgba(236,72,153,0)} }
.eyebrow { font-family: var(--body); font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; font-size: 13px; color: var(--c4); margin-bottom: 14px; }
.hero h1 {
  font-family: var(--display); font-weight: 600; line-height: 0.9;
  font-size: clamp(58px, 15vw, 184px); letter-spacing: -0.04em; margin: 0;
  text-wrap: balance;
}
.hero h1 .kin { display: inline-block; }
/* Each letter carries its OWN gradient fill: a transform on a child of a
   background-clip:text element makes the parent's clipped gradient drop out
   (paints transparent), so the gradient must live on the same element that is
   transformed. Self-contained per-letter gradient = always paints + animates. */
.hero h1 .kin span {
  display: inline-block; will-change: transform;
  background: var(--grad); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: float 4.5s ease-in-out infinite;
}
@keyframes float { 0%,100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-12px) rotate(-1.2deg); } }
.hero .meta { margin: 24px 0 0; display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 10px 22px; color: var(--mut); font-size: clamp(15px, 2vw, 18px); font-weight: 500; }
.hero .meta b { color: var(--ink); font-weight: 600; }
.hero .meta .sep { color: var(--faint); }
.hero .lede { max-width: 560px; margin: 20px auto 0; color: var(--mut); font-size: clamp(15px, 2vw, 17px); line-height: 1.55; }
.hero .cta { margin-top: 32px; display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 14px; }

/* countdown */
.count { margin: 40px auto 0; display: inline-flex; gap: 12px; }
.count .unit {
  min-width: 78px; padding: 16px 12px 12px; border-radius: 16px;
  background: var(--panel); border: 1px solid var(--line); text-align: center;
  backdrop-filter: blur(6px);
}
.count .unit .n { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 5vw, 40px); line-height: 1; letter-spacing: -0.02em; }
.count .unit .l { display: block; margin-top: 8px; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--faint); font-weight: 600; }

/* ===== STATS BAR ===== */
.stats { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--bg-2); }
.stats .wrap { display: grid; grid-template-columns: repeat(4, 1fr); }
.stat { padding: 30px 18px; text-align: center; border-right: 1px solid var(--line); }
.stat:last-child { border-right: 0; }
.stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5vw, 46px); letter-spacing: -0.025em; }
.stat .n.grad-text { background: var(--grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.stat .l { margin-top: 6px; color: var(--mut); font-size: 13.5px; font-weight: 500; }

/* ===== SECTION HEADS ===== */
.sec { padding: clamp(64px, 9vw, 110px) 0; }
.sec-head { margin-bottom: clamp(30px, 5vw, 50px); }
.sec-head.center { text-align: center; }
.sec-head .kick { font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; font-size: 12.5px; color: var(--c4); }
.sec-head h2 { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 6vw, 60px); letter-spacing: -0.03em; margin: 12px 0 0; line-height: 1.0; text-wrap: balance; }
.sec-head p { color: var(--mut); margin: 14px 0 0; font-size: clamp(15px, 2vw, 17px); max-width: 540px; line-height: 1.55; }
.sec-head.center p { margin-left: auto; margin-right: auto; }

/* ===== SPEAKERS ===== */
.speakers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.spk {
  background: var(--panel); border: 1px solid var(--line); border-radius: 20px;
  padding: 20px; transition: transform 0.22s cubic-bezier(0.22,1,0.36,1), border-color 0.22s, box-shadow 0.22s;
  position: relative; overflow: hidden;
}
.spk::before { content: ''; position: absolute; inset: 0; background: var(--grad-soft); opacity: 0; transition: opacity 0.22s; }
.spk:hover { transform: translateY(-6px); border-color: var(--line-2); box-shadow: 0 24px 50px -28px rgba(139,92,246,0.7); }
.spk > * { position: relative; }
.spk .av { width: 64px; height: 64px; border-radius: 16px; display: block; margin-bottom: 16px; }
.spk .nm { font-family: var(--display); font-weight: 600; font-size: 19px; letter-spacing: -0.015em; }
.spk .ro { color: var(--mut); font-size: 13.5px; margin-top: 4px; line-height: 1.4; }
.spk .ro b { color: var(--c4); font-weight: 600; }
.spk .tag { margin-top: 14px; display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line-2); }

/* ===== SCHEDULE ===== */
.tracks { display: inline-flex; gap: 6px; padding: 5px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); margin-bottom: 26px; flex-wrap: wrap; }
.tracks button {
  border: 0; background: transparent; color: var(--mut); cursor: pointer;
  font: 600 13.5px var(--body); padding: 9px 18px; border-radius: 999px; transition: color 0.18s;
}
.tracks button.on { color: #fff; background: var(--grad); box-shadow: 0 8px 22px -10px var(--c2); }
.tracks button:focus-visible { outline: 2px solid var(--c4); outline-offset: 2px; }
.sched { display: none; }
.sched.show { display: block; animation: slotIn 0.45s cubic-bezier(0.22,1,0.36,1); }
@keyframes slotIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.slot {
  display: grid; grid-template-columns: 118px 1fr auto; align-items: center; gap: 20px;
  padding: 20px 4px; border-top: 1px solid var(--line);
}
.slot:last-child { border-bottom: 1px solid var(--line); }
.slot .time { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 14px; color: var(--c4); }
.slot .time small { display: block; color: var(--faint); font-weight: 500; font-size: 11.5px; margin-top: 2px; letter-spacing: 0.04em; }
.slot .ttl { font-family: var(--display); font-weight: 500; font-size: clamp(17px, 2.3vw, 20px); letter-spacing: -0.015em; }
.slot .who { color: var(--mut); font-size: 13.5px; margin-top: 4px; }
.slot .who b { color: var(--ink); font-weight: 600; }
.slot .room { font-size: 12px; font-weight: 600; color: var(--mut); padding: 6px 12px; border-radius: 999px; border: 1px solid var(--line-2); white-space: nowrap; }
.slot.break .ttl { color: var(--mut); font-style: italic; font-family: var(--body); font-weight: 500; }

/* ===== SPONSORS ===== */
.sponsors { display: flex; flex-direction: column; gap: 30px; }
.tier { }
.tier .tlabel { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.tier .tlabel span { font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 12.5px; color: var(--mut); }
.tier .tlabel .ln { flex: 1; height: 1px; background: var(--line); }
.logos { display: grid; gap: 14px; }
.logos.platinum { grid-template-columns: repeat(3, 1fr); }
.logos.gold { grid-template-columns: repeat(4, 1fr); }
.logos.community { grid-template-columns: repeat(6, 1fr); }
.slogo {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  padding: 22px 14px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line);
  font-family: var(--display); font-weight: 600; letter-spacing: -0.01em; color: var(--ink);
  transition: border-color 0.2s, background 0.2s; text-align: center;
}
.slogo:hover { border-color: var(--line-2); background: var(--panel-2); }
.logos.platinum .slogo { font-size: 22px; }
.logos.gold .slogo { font-size: 17px; padding: 18px 12px; color: #cfd1e0; }
.logos.community .slogo { font-size: 13.5px; padding: 14px 10px; color: var(--mut); }
.slogo .gm { width: 18px; height: 18px; border-radius: 6px; background: var(--grad); flex: none; }

/* ===== TICKETS ===== */
.tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.tk {
  position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 22px;
  padding: 30px 26px; display: flex; flex-direction: column;
}
.tk.feat { border-color: transparent; background:
  linear-gradient(var(--bg-2), var(--bg-2)) padding-box,
  var(--grad) border-box; box-shadow: 0 30px 70px -40px rgba(139,92,246,0.9); }
.tk .badge { position: absolute; top: -12px; left: 26px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; background: var(--grad); padding: 5px 12px; border-radius: 999px; }
.tk .name { font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: -0.015em; }
.tk .desc { color: var(--mut); font-size: 13.5px; margin-top: 6px; line-height: 1.45; min-height: 38px; }
.tk .price { font-family: var(--display); font-weight: 600; font-size: 48px; letter-spacing: -0.03em; margin: 18px 0 2px; }
.tk .price small { font-family: var(--body); font-size: 14px; font-weight: 500; color: var(--mut); letter-spacing: 0; }
.tk .was { color: var(--faint); font-size: 13px; text-decoration: line-through; }
.tk ul { list-style: none; padding: 0; margin: 20px 0 24px; display: flex; flex-direction: column; gap: 11px; }
.tk li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--ink); }
.tk li::before { content: ''; width: 16px; height: 16px; border-radius: 50%; background: var(--grad-soft); flex: none; margin-top: 2px;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M6.4 11.2 3.2 8l1.1-1.1 2.1 2.1 5-5L12.5 5z'/%3E%3C/svg%3E") center/contain no-repeat;
          mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23000' d='M6.4 11.2 3.2 8l1.1-1.1 2.1 2.1 5-5L12.5 5z'/%3E%3C/svg%3E") center/contain no-repeat; }
.tk .btn { margin-top: auto; width: 100%; }

/* ===== VENUE ===== */
.venue { display: grid; grid-template-columns: 1.05fr 1fr; gap: 24px; align-items: stretch; }
.venue-card { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 32px; }
.venue-card h3 { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 3.4vw, 32px); letter-spacing: -0.02em; margin: 0; }
.venue-card .addr { color: var(--mut); font-size: 15px; line-height: 1.6; margin: 12px 0 0; }
.venue-card .addr b { color: var(--ink); font-weight: 600; }
.venue-facts { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.fact { font-size: 13px; font-weight: 500; color: var(--ink); padding: 9px 14px; border-radius: 999px; background: var(--panel-2); border: 1px solid var(--line); }
.map { position: relative; border-radius: 22px; overflow: hidden; border: 1px solid var(--line); min-height: 300px; background: #0a0a14; }
.map svg { display: block; width: 100%; height: 100%; }
.map .pin { position: absolute; left: 54%; top: 46%; transform: translate(-50%, -100%); }
.map .pin .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--grad); border: 3px solid var(--bg); box-shadow: 0 6px 16px -4px var(--c3); }
.map .pin .ring { position: absolute; left: 50%; top: 9px; width: 18px; height: 18px; border-radius: 50%; transform: translate(-50%, -50%); border: 2px solid var(--c3); animation: ping 2.2s ease-out infinite; }
@keyframes ping { 0% { transform: translate(-50%,-50%) scale(0.5); opacity: 0.9; } 100% { transform: translate(-50%,-50%) scale(3.4); opacity: 0; } }
.map .tag { position: absolute; left: 16px; bottom: 16px; font-size: 12.5px; font-weight: 600; color: var(--ink); background: color-mix(in srgb, var(--bg) 78%, transparent); border: 1px solid var(--line-2); padding: 7px 13px; border-radius: 999px; backdrop-filter: blur(6px); }

/* ===== CTA STRIP ===== */
.cta-strip { text-align: center; padding: clamp(56px, 8vw, 92px) 0; position: relative; overflow: hidden; }
.cta-strip::before { content: ''; position: absolute; inset: 0; z-index: -1; opacity: 0.5;
  background: radial-gradient(60% 120% at 50% 0%, rgba(139,92,246,0.4), transparent 70%); }
.cta-strip h2 { font-family: var(--display); font-weight: 600; font-size: clamp(32px, 6vw, 64px); letter-spacing: -0.03em; margin: 0; line-height: 1.0; text-wrap: balance; }
.cta-strip p { color: var(--mut); font-size: clamp(15px, 2vw, 18px); margin: 16px auto 30px; max-width: 480px; }

/* ===== FOOTER ===== */
footer { border-top: 1px solid var(--line); padding: 46px 0; }
footer .wrap { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
footer .logo { font-size: 17px; }
footer .fnav { display: flex; flex-wrap: wrap; gap: 22px; margin-left: auto; }
footer .fnav a { color: var(--mut); text-decoration: none; font-size: 13.5px; transition: color 0.18s; }
footer .fnav a:hover { color: var(--ink); }
footer .copy { width: 100%; color: var(--faint); font-size: 12.5px; margin-top: 6px; }

/* ===== REVEAL TUNING ===== */
.reveal { transition-duration: 0.7s; }

/* ===== RESPONSIVE ===== */
@media (max-width: 820px) {
  .nav-links { display: none; }
  .stats .wrap { grid-template-columns: repeat(2, 1fr); }
  .stat:nth-child(2) { border-right: 0; }
  .stat:nth-child(1), .stat:nth-child(2) { border-bottom: 1px solid var(--line); }
  .speakers { grid-template-columns: repeat(2, 1fr); }
  .logos.platinum { grid-template-columns: repeat(2, 1fr); }
  .logos.gold { grid-template-columns: repeat(2, 1fr); }
  .logos.community { grid-template-columns: repeat(3, 1fr); }
  .tiers { grid-template-columns: 1fr; }
  .tk.feat { order: -1; }
  .venue { grid-template-columns: 1fr; }
  .slot { grid-template-columns: 96px 1fr; }
  .slot .room { display: none; }
}
@media (max-width: 480px) {
  .count { gap: 8px; }
  .count .unit { min-width: 0; flex: 1; padding: 13px 6px 10px; }
  .speakers { grid-template-columns: 1fr 1fr; gap: 12px; }
  .spk { padding: 16px; }
  .logos.community { grid-template-columns: repeat(2, 1fr); }
  .slot { grid-template-columns: 78px 1fr; gap: 14px; padding: 16px 2px; }
  .hero .cta .btn { width: 100%; }
  .venue-card { padding: 24px; }
}
`.trim()

const HTML = `
<nav class="nav">
  <div class="wrap">
    <a class="logo" href="#top"><span class="mk"></span> SIGNAL</a>
    <div class="nav-links">
      <a href="#speakers">Speakers</a>
      <a href="#schedule">Schedule</a>
      <a href="#sponsors">Sponsors</a>
      <a href="#tickets">Tickets</a>
      <a href="#venue">Venue</a>
    </div>
    <span class="spacer"></span>
    <a class="btn" href="#tickets">Get tickets</a>
  </div>
</nav>

<section class="hero" id="top">
  <div class="hero-bg" aria-hidden="true">
    <div class="grid-bg"></div>
    <div class="glow"></div>
  </div>
  <div class="wrap">
    <span class="pill"><span class="live-dot"></span> Tickets selling fast — 82% sold</span>
    <div class="eyebrow">The conference for builders of the new web</div>
    <h1><span class="kin" id="kin">SIGNAL 26</span></h1>
    <div class="meta num">
      <b>Nov 12–14, 2026</b> <span class="sep">/</span> <b>San Francisco, CA</b> <span class="sep">/</span> <b>Pier 27</b>
    </div>
    <p class="lede">Three days of deep technical talks, hands-on workshops, and lightning demos from the people shipping the future — agents, edge infra, design systems, and the tools in between.</p>
    <div class="cta">
      <a class="btn lg" href="#tickets">Get tickets — from $249</a>
      <a class="btn ghost lg" href="#schedule">View schedule</a>
    </div>
    <div class="count num" id="count" aria-label="Time until SIGNAL 25 begins">
      <div class="unit"><div class="n" data-d="days">—</div><span class="l">Days</span></div>
      <div class="unit"><div class="n" data-d="hours">—</div><span class="l">Hours</span></div>
      <div class="unit"><div class="n" data-d="mins">—</div><span class="l">Mins</span></div>
      <div class="unit"><div class="n" data-d="secs">—</div><span class="l">Secs</span></div>
    </div>
  </div>
</section>

<section class="stats">
  <div class="wrap reveal" data-reveal="none">
    <div class="stat"><div class="n grad-text num">48</div><div class="l">Speakers</div></div>
    <div class="stat"><div class="n grad-text num">62</div><div class="l">Talks</div></div>
    <div class="stat"><div class="n grad-text num">14</div><div class="l">Workshops</div></div>
    <div class="stat"><div class="n grad-text num">3</div><div class="l">Days</div></div>
  </div>
</section>

<section class="sec" id="speakers">
  <div class="wrap">
    <div class="sec-head center reveal">
      <div class="kick">Headliners</div>
      <h2>Speakers shipping the future</h2>
      <p>Engineers, founders, and researchers from the teams defining what comes next. More announced weekly.</p>
    </div>
    <div class="speakers" id="speakers-grid"></div>
  </div>
</section>

<section class="sec" id="schedule" style="background:var(--bg-2)">
  <div class="wrap">
    <div class="sec-head reveal">
      <div class="kick">Three full days</div>
      <h2>The schedule</h2>
      <p>Switch tracks to see what's on. Day-one highlights below — full agenda drops with your ticket.</p>
    </div>
    <div class="tracks reveal" data-reveal="none" id="tracks" role="tablist" aria-label="Schedule tracks">
      <button class="on" data-track="main" role="tab" aria-selected="true">Main Stage</button>
      <button data-track="work" role="tab" aria-selected="false">Workshops</button>
      <button data-track="light" role="tab" aria-selected="false">Lightning</button>
    </div>

    <div class="sched show" data-sched="main">
      <div class="slot"><div class="time">09:30<small>30 min</small></div><div><div class="ttl">Opening keynote: The agentic web</div><div class="who"><b>Mara Okafor</b> · CTO, Vellum</div></div><span class="room">Main Stage</span></div>
      <div class="slot"><div class="time">10:15<small>40 min</small></div><div><div class="ttl">Designing systems that scale to a billion calls</div><div class="who"><b>Theo Lindqvist</b> · Principal Eng, Northstar</div></div><span class="room">Main Stage</span></div>
      <div class="slot break"><div class="time">11:00<small>20 min</small></div><div><div class="ttl">Coffee &amp; hallway track</div><div class="who">Espresso bar · level 2 atrium</div></div><span class="room">Atrium</span></div>
      <div class="slot"><div class="time">11:20<small>35 min</small></div><div><div class="ttl">Type, motion, and the feel of fast software</div><div class="who"><b>Priya Anand</b> · Head of Design, Loft</div></div><span class="room">Main Stage</span></div>
      <div class="slot"><div class="time">13:30<small>45 min</small></div><div><div class="ttl">Edge databases: consistency without the latency tax</div><div class="who"><b>Diego Marín</b> · Founder, Tidepool</div></div><span class="room">Main Stage</span></div>
    </div>

    <div class="sched" data-sched="work">
      <div class="slot"><div class="time">10:00<small>120 min</small></div><div><div class="ttl">Build a coding agent from scratch</div><div class="who"><b>Sana Yusuf</b> · DevRel, Forge</div></div><span class="room">Lab A</span></div>
      <div class="slot"><div class="time">10:00<small>120 min</small></div><div><div class="ttl">Production-grade RAG: eval, not vibes</div><div class="who"><b>Kenji Watanabe</b> · ML Lead, Cardinal</div></div><span class="room">Lab B</span></div>
      <div class="slot"><div class="time">13:30<small>120 min</small></div><div><div class="ttl">Design tokens to shipped UI in one afternoon</div><div class="who"><b>Priya Anand</b> · Head of Design, Loft</div></div><span class="room">Lab A</span></div>
      <div class="slot"><div class="time">13:30<small>120 min</small></div><div><div class="ttl">Observability for distributed systems</div><div class="who"><b>Theo Lindqvist</b> · Principal Eng, Northstar</div></div><span class="room">Lab C</span></div>
    </div>

    <div class="sched" data-sched="light">
      <div class="slot"><div class="time">15:00<small>8 min</small></div><div><div class="ttl">We replaced our backend with one prompt</div><div class="who"><b>Lena Roth</b> · Indie, shipd.dev</div></div><span class="room">Demo Pit</span></div>
      <div class="slot"><div class="time">15:08<small>8 min</small></div><div><div class="ttl">A 4KB physics engine for the web</div><div class="who"><b>Omar Bensalah</b> · Creative Tech</div></div><span class="room">Demo Pit</span></div>
      <div class="slot"><div class="time">15:16<small>8 min</small></div><div><div class="ttl">Offline-first is back, and it's better</div><div class="who"><b>Grace Liu</b> · Founder, Tilde</div></div><span class="room">Demo Pit</span></div>
      <div class="slot"><div class="time">15:24<small>8 min</small></div><div><div class="ttl">Shipping shaders without losing your mind</div><div class="who"><b>Felix Adebayo</b> · GPU nerd</div></div><span class="room">Demo Pit</span></div>
    </div>
  </div>
</section>

<section class="sec" id="sponsors">
  <div class="wrap">
    <div class="sec-head center reveal">
      <div class="kick">Backed by the best</div>
      <h2>Sponsors &amp; partners</h2>
      <p>The teams making SIGNAL '26 possible — and hiring on the expo floor.</p>
    </div>
    <div class="sponsors reveal" data-reveal="none">
      <div class="tier">
        <div class="tlabel"><span>Platinum</span><div class="ln"></div></div>
        <div class="logos platinum">
          <div class="slogo"><span class="gm"></span>Vellum</div>
          <div class="slogo"><span class="gm"></span>Northstar</div>
          <div class="slogo"><span class="gm"></span>Tidepool</div>
        </div>
      </div>
      <div class="tier">
        <div class="tlabel"><span>Gold</span><div class="ln"></div></div>
        <div class="logos gold">
          <div class="slogo">Forge</div>
          <div class="slogo">Cardinal</div>
          <div class="slogo">Loft</div>
          <div class="slogo">Tilde</div>
          <div class="slogo">Halcyon</div>
          <div class="slogo">Beacon</div>
          <div class="slogo">Lumen</div>
          <div class="slogo">Cobalt</div>
        </div>
      </div>
      <div class="tier">
        <div class="tlabel"><span>Community</span><div class="ln"></div></div>
        <div class="logos community">
          <div class="slogo">shipd.dev</div>
          <div class="slogo">DevHaus</div>
          <div class="slogo">OpenStack SF</div>
          <div class="slogo">Pixel Guild</div>
          <div class="slogo">RustBay</div>
          <div class="slogo">QueerInTech</div>
          <div class="slogo">Latinx Code</div>
          <div class="slogo">a11y Collective</div>
          <div class="slogo">Women Who Ship</div>
          <div class="slogo">EdgeLab</div>
          <div class="slogo">The Commit</div>
          <div class="slogo">Null Pointer</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="tickets" style="background:var(--bg-2)">
  <div class="wrap">
    <div class="sec-head center reveal">
      <div class="kick">Save your seat</div>
      <h2>Tickets</h2>
      <p>All passes include talks, the expo floor, lunch, and the after-party. Workshops included on Standard and up.</p>
    </div>
    <div class="tiers reveal">
      <div class="tk">
        <div class="name">Early Bird</div>
        <div class="desc">For the decisive. Limited allocation — going fast.</div>
        <div class="price num">$249 <small>/ pass</small></div>
        <div class="was num">$399 list</div>
        <ul>
          <li>All 3 days of talks</li>
          <li>Expo floor + hallway track</li>
          <li>Lunch &amp; the after-party</li>
          <li>Talk recordings, post-event</li>
        </ul>
        <a class="btn ghost" href="#top">Sold out in 48h last year</a>
      </div>
      <div class="tk feat">
        <span class="badge">Most popular</span>
        <div class="name">Standard</div>
        <div class="desc">The full experience, workshops and all.</div>
        <div class="price num">$449 <small>/ pass</small></div>
        <div class="was num">&nbsp;</div>
        <ul>
          <li>Everything in Early Bird</li>
          <li>All hands-on workshops</li>
          <li>Reserved main-stage seating</li>
          <li>Speaker dinner raffle entry</li>
        </ul>
        <a class="btn" href="#top">Get Standard</a>
      </div>
      <div class="tk">
        <div class="name">Team of 5</div>
        <div class="desc">Bring the whole squad and save 20%.</div>
        <div class="price num">$1,799 <small>/ 5 passes</small></div>
        <div class="was num">$2,245 if bought solo</div>
        <ul>
          <li>5 Standard passes</li>
          <li>Private team huddle room</li>
          <li>Priority workshop sign-up</li>
          <li>One bonus livestream seat</li>
        </ul>
        <a class="btn ghost" href="#top">Outfit your team</a>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="venue">
  <div class="wrap">
    <div class="sec-head reveal">
      <div class="kick">Where it happens</div>
      <h2>Pier 27, on the Embarcadero</h2>
    </div>
    <div class="venue reveal">
      <div class="venue-card">
        <h3>The Cruise Terminal</h3>
        <p class="addr"><b>Pier 27, The Embarcadero</b><br>San Francisco, CA 94111<br>Floor-to-ceiling glass over the Bay — and a sunset you'll want to skip the last talk for.</p>
        <div class="venue-facts">
          <span class="fact">8 min from Embarcadero BART</span>
          <span class="fact">Step-free access</span>
          <span class="fact">Bike valet on site</span>
          <span class="fact">Partner hotels nearby</span>
        </div>
      </div>
      <div class="map" role="img" aria-label="Stylized map showing the venue at Pier 27 on the San Francisco Embarcadero">
        <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1f3a"/><stop offset="1" stop-color="#0a1330"/></linearGradient>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11131f"/><stop offset="1" stop-color="#0c0d16"/></linearGradient>
          </defs>
          <rect width="400" height="320" fill="url(#water)"/>
          <path d="M0,0 L210,0 C200,60 230,110 200,160 C175,205 215,250 190,320 L0,320 Z" fill="url(#land)"/>
          <path d="M210,0 C200,60 230,110 200,160 C175,205 215,250 190,320" fill="none" stroke="rgba(34,211,238,0.35)" stroke-width="1.5"/>
          <g stroke="rgba(255,255,255,0.07)" stroke-width="1">
            <line x1="0" y1="70" x2="180" y2="58"/><line x1="0" y1="140" x2="200" y2="128"/><line x1="0" y1="210" x2="195" y2="200"/>
            <line x1="60" y1="0" x2="48" y2="320"/><line x1="130" y1="0" x2="120" y2="320"/>
          </g>
          <g>
            <rect x="208" y="120" width="64" height="34" rx="3" fill="rgba(139,92,246,0.18)" stroke="rgba(236,72,153,0.6)" stroke-width="1.5"/>
            <line x1="200" y1="137" x2="208" y2="137" stroke="rgba(236,72,153,0.6)" stroke-width="2"/>
          </g>
          <g fill="rgba(255,255,255,0.05)">
            <rect x="20" y="40" width="22" height="22" rx="3"/><rect x="70" y="90" width="30" height="18" rx="3"/>
            <rect x="30" y="160" width="26" height="26" rx="3"/><rect x="95" y="200" width="24" height="20" rx="3"/>
            <rect x="40" y="250" width="34" height="22" rx="3"/>
          </g>
        </svg>
        <div class="pin"><span class="ring"></span><span class="dot"></span></div>
        <span class="tag">Pier 27 · SIGNAL '26</span>
      </div>
    </div>
  </div>
</section>

<section class="cta-strip">
  <div class="wrap reveal">
    <h2>Don't watch the recap.<br>Be in the room.</h2>
    <p>Three days. Forty-eight speakers. One ticket between you and the next thing you build.</p>
    <a class="btn lg" href="#tickets">Get your ticket</a>
  </div>
</section>

<footer>
  <div class="wrap">
    <a class="logo" href="#top"><span class="mk"></span> SIGNAL '26</a>
    <nav class="fnav" aria-label="Footer">
      <a href="#speakers">Speakers</a>
      <a href="#schedule">Schedule</a>
      <a href="#sponsors">Sponsors</a>
      <a href="#tickets">Tickets</a>
      <a href="#venue">Venue</a>
      <a href="#top">Code of conduct</a>
    </nav>
    <div class="copy">© 2026 SIGNAL Conference. Pier 27, San Francisco. Built for people who ship.</div>
  </div>
</footer>
`.trim()

const JS = `
// ----- Speakers grid (SVG monogram avatars, no images) -----
(function () {
  var grid = document.getElementById('speakers-grid');
  if (!grid) return;
  var people = [
    { n: 'Mara Okafor', r: 'CTO', c: 'Vellum', tag: 'Keynote' },
    { n: 'Theo Lindqvist', r: 'Principal Eng', c: 'Northstar', tag: 'Infra' },
    { n: 'Priya Anand', r: 'Head of Design', c: 'Loft', tag: 'Design' },
    { n: 'Diego Marín', r: 'Founder', c: 'Tidepool', tag: 'Data' },
    { n: 'Sana Yusuf', r: 'DevRel', c: 'Forge', tag: 'Agents' },
    { n: 'Kenji Watanabe', r: 'ML Lead', c: 'Cardinal', tag: 'ML' },
    { n: 'Lena Roth', r: 'Indie Maker', c: 'shipd.dev', tag: 'Lightning' },
    { n: 'Grace Liu', r: 'Founder', c: 'Tilde', tag: 'Local-first' }
  ];
  // palette pairs for the avatar gradients (blue / violet / pink / cyan family)
  var pairs = [
    ['#3b82f6', '#8b5cf6'], ['#8b5cf6', '#ec4899'], ['#ec4899', '#f97316'],
    ['#22d3ee', '#3b82f6'], ['#6366f1', '#ec4899'], ['#14b8a6', '#3b82f6'],
    ['#a855f7', '#22d3ee'], ['#f43f5e', '#8b5cf6']
  ];
  function initials(name) {
    var parts = name.split(' ');
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  var html = '';
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    var pr = pairs[i % pairs.length];
    var gid = 'av' + i;
    var av =
      '<svg class="av" viewBox="0 0 64 64" role="img" aria-label="' + p.n + '">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="' + pr[0] + '"/><stop offset="1" stop-color="' + pr[1] + '"/>' +
        '</linearGradient></defs>' +
        '<rect width="64" height="64" rx="16" fill="url(#' + gid + ')"/>' +
        '<text x="32" y="33" text-anchor="middle" dominant-baseline="central" ' +
          'font-family="Clash Display, Space Grotesk, sans-serif" font-weight="600" ' +
          'font-size="26" fill="rgba(255,255,255,0.95)">' + initials(p.n) + '</text>' +
      '</svg>';
    html +=
      '<div class="spk reveal" data-reveal="scale">' + av +
        '<div class="nm">' + p.n + '</div>' +
        '<div class="ro">' + p.r + ' @ <b>' + p.c + '</b></div>' +
        '<span class="tag">' + p.tag + '</span>' +
      '</div>';
  }
  grid.innerHTML = html;
  // re-observe newly injected reveal elements if the controller is up
  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    grid.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    grid.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
})();

// ----- Schedule track tabs -----
(function () {
  var tracks = document.getElementById('tracks');
  if (!tracks) return;
  var btns = tracks.querySelectorAll('button');
  var panels = document.querySelectorAll('.sched');
  tracks.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var key = b.getAttribute('data-track');
    btns.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-selected', 'true');
    panels.forEach(function (pn) {
      pn.classList.toggle('show', pn.getAttribute('data-sched') === key);
    });
  });
})();

// ----- Live countdown to the event -----
(function () {
  var root = document.getElementById('count');
  if (!root) return;
  // Event opens Nov 12 at 09:30 PT. Keep the countdown alive in any demo: if
  // that date has already passed this year, roll the target forward to the next
  // November so the hero always shows a live, ticking countdown.
  var now = new Date();
  var year = now.getFullYear();
  var target = new Date(year + '-11-12T09:30:00-08:00').getTime();
  if (target - now.getTime() < 0) {
    target = new Date((year + 1) + '-11-12T09:30:00-08:00').getTime();
  }
  var cells = {
    days: root.querySelector('[data-d="days"]'),
    hours: root.querySelector('[data-d="hours"]'),
    mins: root.querySelector('[data-d="mins"]'),
    secs: root.querySelector('[data-d="secs"]')
  };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = target - Date.now();
    if (diff < 0) diff = 0;
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    if (cells.days) cells.days.textContent = d;
    if (cells.hours) cells.hours.textContent = pad(h);
    if (cells.mins) cells.mins.textContent = pad(m);
    if (cells.secs) cells.secs.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

// ----- Subtle hero parallax + per-letter kinetic split -----
(function () {
  var kin = document.getElementById('kin');
  if (kin) {
    var text = kin.textContent;
    kin.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = document.createElement('span');
      span.textContent = ch === ' ' ? '\\u00A0' : ch;
      span.style.animationDelay = (i * 0.08) + 's';
      kin.appendChild(span);
    }
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var glow = document.querySelector('.hero-bg .glow');
  var grid = document.querySelector('.grid-bg');
  window.addEventListener('scroll', function () {
    var y = window.pageYOffset || 0;
    if (y > 900) return;
    if (glow) glow.style.transform = 'translateX(-50%) translateY(' + (y * 0.18) + 'px)';
    if (grid) grid.style.transform = 'translateY(' + (y * 0.06) + 'px)';
  }, { passive: true });
})();
`.trim()

export const eventConf: Template = {
  id: 'event-conf',
  kind: 'page',
  name: 'Conference',
  tagline: 'A high-energy tech-conference site',
  categories: ['Business'],
  audiences: ['event', 'conference', 'tech'],
  description:
    "A high-energy tech-conference landing page (SIGNAL '26) on a near-black canvas with an electric blue→violet→pink gradient. It packs a kinetic hero over an animated gradient-grid backdrop, a live JS countdown and a 'selling fast' pill, a stats bar, a speakers grid with hand-rolled SVG monogram avatars, a track-tabbed schedule, a tiered sponsors wall, ticket tiers, and a stylized SVG venue map. Fully self-contained — pure CSS/SVG, no imagery or chart libraries — and responsive from 380px up.",
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@600&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#07070d',
  notes:
    "Palette lives in the `:root` tokens at the top of the CSS: --c1 (electric blue), --c2 (violet), --c3 (pink), --c4 (cyan accent), and the --grad / --grad-soft gradients built from them — recolor the whole site by editing these. Event identity is plain copy: change 'SIGNAL' in the nav/hero/footer, the date/city/venue in the `.hero .meta` line, and the countdown target in the JS (the `'-11-12T09:30:00-08:00'` month/day/time string, which auto-rolls to the next year once that date passes so the countdown always stays live). Speakers are a data array at the top of the JS (`people` + `pairs` for avatar gradients) — add/edit objects there; monogram avatars are generated automatically from initials. The schedule has three `.sched` panels keyed by `data-sched` (main/work/light) wired to the `.tracks` buttons via `data-track`; copy a `.slot` row to add a session, or mark a row `.slot.break` for a non-talk slot. Sponsors are grouped by `.tier` (platinum/gold/community) — the `.logos` grid columns differ per tier. Ticket tiers are three `.tk` cards; `.tk.feat` is the highlighted middle one. The venue map is inline SVG in `#venue` — move the `.map .pin` (left/top in CSS) to reposition the marker. All figures use `.num` for tabular numerals; reveal-on-scroll keys off `.reveal.in`.",
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@600&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#07070d',
  },
}
