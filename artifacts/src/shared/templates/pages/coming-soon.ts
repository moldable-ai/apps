import type { Template } from '../types'

// A premium, full-viewport "coming soon" / waitlist page. A living animated
// background drifts behind the content: a soft mesh-aurora (deep midnight indigo
// → violet) painted in CSS, overlaid with an elegant low-key <canvas> star/ember
// field that floats upward and twinkles. Centered content: an SVG monogram mark,
// a "Launching soon" eyebrow pill, a confident headline, a one-line subhead, a
// LIVE COUNTDOWN (days/hours/minutes/seconds, ticking each second), and a glassy
// email-capture row that — on submit — preventDefaults and morphs into a
// "You're on the list ✓" success state (purely visual, no network). Social links
// + a tasteful footer. Honors prefers-reduced-motion. Fully responsive. All art
// is CSS/SVG/canvas — zero image assets.

const CSS = `
:root {
  --bg: #07060f;
  --ink: #f3f0ff;
  --mut: rgba(208,202,236,0.66);
  --faint: rgba(190,184,224,0.42);
  --line: rgba(255,255,255,0.10);
  --glass: rgba(20,16,40,0.42);
  --c1: #7c5cff;    /* indigo-violet */
  --c2: #b06bff;    /* violet        */
  --c3: #ff6bd6;    /* magenta accent*/
  --c4: #4fd2ff;    /* cyan spark    */
  --grad: linear-gradient(108deg, var(--c1), var(--c3));
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: var(--bg); color: var(--ink); overflow-x: hidden; min-height: 100svh; }

/* ===== living background: drifting mesh aurora ===== */
.aurora {
  position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
  background:
    radial-gradient(58% 50% at 18% 16%, rgba(124,92,255,0.34), transparent 62%),
    radial-gradient(52% 48% at 86% 22%, rgba(255,107,214,0.22), transparent 60%),
    radial-gradient(60% 60% at 50% 100%, rgba(79,210,255,0.16), transparent 64%),
    var(--bg);
}
.aurora::before, .aurora::after {
  content: ''; position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.7; mix-blend-mode: screen;
}
.aurora::before {
  width: 56vw; height: 56vw; left: -10vw; top: -14vw;
  background: radial-gradient(circle at 50% 50%, rgba(124,92,255,0.85), transparent 66%);
  animation: drift1 26s ease-in-out infinite;
}
.aurora::after {
  width: 50vw; height: 50vw; right: -12vw; bottom: -16vw;
  background: radial-gradient(circle at 50% 50%, rgba(255,107,214,0.6), transparent 66%);
  animation: drift2 32s ease-in-out infinite;
}
@keyframes drift1 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(18vw, 12vh) scale(1.16); }
}
@keyframes drift2 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-16vw, -10vh) scale(1.12); }
}
/* the ember/star canvas floats above the aurora, below the vignette */
#field { position: fixed; inset: 0; z-index: 1; display: block; width: 100vw; height: 100vh; pointer-events: none; }
/* vignette so the orb of light sits in deep space, never flat */
.veil {
  position: fixed; inset: 0; z-index: 2; pointer-events: none;
  background:
    radial-gradient(135% 110% at 50% 30%, transparent 40%, rgba(7,6,15,0.5) 74%, rgba(4,3,9,0.92) 100%);
}
/* faint film grain via repeating soft noise — keeps gradients from banding */
.grain {
  position: fixed; inset: 0; z-index: 3; pointer-events: none; opacity: 0.045;
  background-image: radial-gradient(rgba(255,255,255,0.7) 0.5px, transparent 0.6px);
  background-size: 3px 3px;
}

/* ===== content stage ===== */
.wrap {
  position: relative; z-index: 4;
  min-height: 100svh;
  display: flex; flex-direction: column;
  padding: clamp(22px, 4vw, 44px) clamp(20px, 5vw, 56px);
}

/* top row: brand mark + tiny status */
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.mark { display: inline-flex; align-items: center; gap: 13px; font-family: var(--display); font-weight: 600; letter-spacing: -0.01em; font-size: clamp(15px, 1.6vw, 18px); }
.mono {
  width: 40px; height: 40px; flex: none; display: block; border-radius: 12px;
  background: linear-gradient(150deg, rgba(124,92,255,0.22), rgba(255,107,214,0.16));
  border: 1px solid var(--line);
  box-shadow: 0 10px 30px -10px var(--c1), inset 0 1px 0 rgba(255,255,255,0.14);
}
.mono svg { width: 100%; height: 100%; display: block; }
.status { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 500; color: var(--mut); letter-spacing: 0.01em; }
.status::before {
  content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--c4);
  box-shadow: 0 0 0 0 rgba(79,210,255,0.55); animation: ping 2.4s infinite;
}
@keyframes ping { 0%{box-shadow:0 0 0 0 rgba(79,210,255,0.5)} 70%{box-shadow:0 0 0 8px rgba(79,210,255,0)} 100%{box-shadow:0 0 0 0 rgba(79,210,255,0)} }

/* center hero */
.hero {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: clamp(20px, 2.6vw, 30px);
  padding: clamp(28px, 6vw, 60px) 0;
}
.pill {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 16px 8px 12px; border-radius: 999px;
  font-size: clamp(11px, 1.1vw, 12.5px); font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink);
  background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(14px) saturate(140%); backdrop-filter: blur(14px) saturate(140%);
  box-shadow: 0 10px 30px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06);
}
.pill .sparkle {
  width: 18px; height: 18px; border-radius: 999px; display: grid; place-items: center;
  background: var(--grad); box-shadow: 0 0 14px -2px var(--c2);
}
.pill .sparkle svg { width: 11px; height: 11px; }

h1.headline {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(38px, 8.2vw, 92px); line-height: 0.98; letter-spacing: -0.018em;
  word-spacing: 0.06em; margin: 0; max-width: 16ch; text-wrap: balance;
}
.headline .grad {
  background: linear-gradient(106deg, var(--c2) 6%, var(--c3) 50%, var(--c4) 98%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.subhead {
  font-size: clamp(15px, 1.8vw, 19px); line-height: 1.55; color: var(--mut);
  max-width: 52ch; margin: 0; font-weight: 400;
}

/* ===== countdown ===== */
.count {
  display: flex; gap: clamp(10px, 1.8vw, 18px); flex-wrap: wrap; justify-content: center;
  margin-top: clamp(4px, 1vw, 10px);
}
.unit {
  position: relative; min-width: clamp(70px, 16vw, 112px);
  padding: clamp(14px, 2vw, 22px) clamp(12px, 2vw, 20px) clamp(11px, 1.4vw, 16px);
  border-radius: 20px; background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 22px 56px -34px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07);
  overflow: hidden;
}
.unit::after {
  content: ''; position: absolute; left: 0; right: 0; top: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
}
.unit .n {
  font-family: var(--display); font-weight: 600; font-variant-numeric: tabular-nums;
  font-size: clamp(34px, 6vw, 56px); line-height: 1; letter-spacing: -0.03em;
  display: block;
  background: linear-gradient(180deg, #ffffff, #d6cdf6);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.unit .l {
  display: block; margin-top: 9px; font-size: clamp(10px, 1.1vw, 11.5px);
  font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--faint);
}

/* ===== email capture (visual only) ===== */
.capture { width: min(520px, 100%); margin-top: clamp(8px, 1.4vw, 14px); }
.formrow {
  display: flex; gap: 8px; padding: 7px; border-radius: 999px;
  background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 18px 48px -28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07);
  transition: box-shadow 0.4s ease, border-color 0.4s ease, opacity 0.4s ease, transform 0.4s ease;
}
.formrow:focus-within { border-color: rgba(176,107,255,0.55); box-shadow: 0 0 0 4px rgba(124,92,255,0.16), 0 18px 48px -28px rgba(0,0,0,0.85); }
.formrow input {
  flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  color: var(--ink); font: 500 15px var(--body); padding: 0 14px 0 16px; letter-spacing: 0.005em;
}
.formrow input::placeholder { color: var(--faint); }
.formrow button {
  flex: none; border: 0; cursor: pointer;
  font: 600 14.5px var(--body); letter-spacing: 0.005em; color: #0c0820;
  padding: 13px 22px; border-radius: 999px;
  background: var(--grad);
  box-shadow: 0 12px 30px -12px var(--c2);
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease, filter 0.3s ease;
  display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
}
.formrow button:hover { transform: translateY(-1px); box-shadow: 0 18px 40px -14px var(--c2); filter: saturate(1.08); }
.formrow button svg { width: 15px; height: 15px; transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); }
.formrow button:hover svg { transform: translateX(3px); }
.hint { margin: 11px 2px 0; font-size: 12.5px; color: var(--faint); }

/* success state — morphs in over the form */
.success {
  display: none; align-items: center; gap: 12px;
  padding: 15px 20px; border-radius: 999px;
  background: rgba(79,210,255,0.10); border: 1px solid rgba(79,210,255,0.32);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  color: var(--ink); font-weight: 500; font-size: 15px;
  box-shadow: 0 18px 48px -28px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08);
}
.capture.done .formrow { display: none; }
.capture.done .hint { display: none; }
.capture.done .success { display: flex; animation: pop 0.55s cubic-bezier(0.16,1,0.3,1) both; }
@keyframes pop { 0% { opacity: 0; transform: scale(0.94) translateY(6px); } 100% { opacity: 1; transform: none; } }
.success .check {
  width: 26px; height: 26px; flex: none; border-radius: 999px; display: grid; place-items: center;
  background: linear-gradient(150deg, var(--c4), var(--c1)); color: #06121a;
  box-shadow: 0 0 16px -2px var(--c4);
}
.success .check svg { width: 14px; height: 14px; }
.success b { font-weight: 600; }
.success .em { color: var(--c4); }

/* footer: socials + small print */
.foot {
  display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap;
  color: var(--faint); font-size: 12.5px;
}
.socials { display: flex; gap: 10px; }
.socials a {
  width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center;
  background: var(--glass); border: 1px solid var(--line); color: var(--mut);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  transition: color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, background 0.3s ease;
}
.socials a:hover { color: var(--ink); border-color: rgba(176,107,255,0.45); transform: translateY(-2px); background: rgba(124,92,255,0.14); }
.socials a svg { width: 17px; height: 17px; }
.foot .legal a { color: var(--mut); transition: color 0.3s ease; }
.foot .legal a:hover { color: var(--ink); }
:focus-visible { outline: 2px solid var(--c4); outline-offset: 3px; border-radius: 6px; }

@media (max-width: 640px) {
  .formrow { flex-direction: column; padding: 12px; border-radius: 22px; gap: 10px; }
  .formrow input { padding: 6px 6px; text-align: center; }
  .formrow button { width: 100%; justify-content: center; padding: 14px; }
  .unit { min-width: 0; flex: 1 1 21%; padding: 14px 8px 11px; border-radius: 16px; }
  .count { gap: 8px; }
  .foot { justify-content: center; text-align: center; }
  .top .status .txt { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .aurora::before, .aurora::after { animation: none; }
  .status::before { animation: none; }
}
`.trim()

const HTML = `
<div class="aurora" aria-hidden="true"></div>
<canvas id="field" aria-hidden="true"></canvas>
<div class="veil" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>

<main class="wrap">
  <header class="top reveal" data-reveal="none">
    <span class="mark">
      <span class="mono">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="mg" x1="8" y1="9" x2="32" y2="31" gradientUnits="userSpaceOnUse">
              <stop stop-color="#b06bff"/><stop offset="0.55" stop-color="#ff6bd6"/><stop offset="1" stop-color="#4fd2ff"/>
            </linearGradient>
          </defs>
          <path d="M11 29 L11 11 L20 24 L29 11 L29 29" stroke="url(#mg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="20" cy="20" r="1.7" fill="#4fd2ff"/>
        </svg>
      </span>
      Nova
    </span>
    <span class="status"><span class="txt">In private beta</span></span>
  </header>

  <section class="hero">
    <span class="pill reveal" data-reveal="scale">
      <span class="sparkle">
        <svg viewBox="0 0 24 24" fill="#0c0820" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/></svg>
      </span>
      Launching soon
    </span>

    <h1 class="headline reveal">Something new is<br><span class="grad">on the way.</span></h1>

    <p class="subhead reveal">We are putting the finishing touches on a calmer, faster way to ship. Join the waitlist to get early access and a founder's invite the moment we open the doors.</p>

    <div class="count reveal" id="count" role="timer" aria-live="off" aria-label="Time until launch">
      <div class="unit"><span class="n num" id="d">00</span><span class="l">Days</span></div>
      <div class="unit"><span class="n num" id="h">00</span><span class="l">Hours</span></div>
      <div class="unit"><span class="n num" id="m">00</span><span class="l">Minutes</span></div>
      <div class="unit"><span class="n num" id="s">00</span><span class="l">Seconds</span></div>
    </div>

    <div class="capture reveal" id="capture">
      <form class="formrow" id="form" novalidate>
        <input id="email" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com" aria-label="Email address" required>
        <button type="submit">Get early access
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
      <p class="hint">No spam. One email when we launch — then you decide.</p>
      <div class="success" role="status">
        <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>
        <span><b>You're on the list <span class="em">&#10003;</span></b> &mdash; we'll be in touch <span id="ename"></span>.</span>
      </div>
    </div>
  </section>

  <footer class="foot reveal" data-reveal="none">
    <nav class="socials" aria-label="Social links">
      <a href="#" aria-label="X / Twitter"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
      <a href="#" aria-label="GitHub"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.52.1.71-.23.71-.5v-1.97c-2.9.63-3.51-1.24-3.51-1.24-.48-1.2-1.16-1.52-1.16-1.52-.95-.65.07-.64.07-.64 1.05.08 1.6 1.08 1.6 1.08.93 1.6 2.45 1.14 3.05.87.09-.68.36-1.14.66-1.4-2.32-.26-4.76-1.16-4.76-5.16 0-1.14.41-2.07 1.07-2.8-.11-.26-.46-1.32.1-2.75 0 0 .87-.28 2.85 1.07a9.9 9.9 0 0 1 5.18 0c1.98-1.35 2.85-1.07 2.85-1.07.56 1.43.21 2.49.1 2.75.67.73 1.07 1.66 1.07 2.8 0 4.01-2.45 4.9-4.78 5.16.38.32.71.95.71 1.92v2.85c0 .28.19.61.72.5A10.5 10.5 0 0 0 12 1.5z"/></svg></a>
      <a href="#" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM2.4 9.5h5.16V22H2.4zM9.9 9.5h4.95v1.71h.07c.69-1.25 2.38-2.57 4.9-2.57 5.24 0 6.2 3.3 6.2 7.6V22h-5.16v-5.52c0-1.32-.02-3.02-1.85-3.02-1.85 0-2.13 1.43-2.13 2.92V22H9.9z"/></svg></a>
    </nav>
    <span class="legal">&copy; <span id="yr">2026</span> Nova Labs &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a></span>
  </footer>
</main>
`.trim()

// page.js — string concatenation only, NO template literals, so the TS module
// always compiles. (1) animated ember/star canvas, (2) live countdown, (3) the
// visual-only email capture that morphs into the success state.
const JS = `
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. elegant ember / star field on <canvas> ---------- */
  (function () {
    var canvas = document.getElementById('field');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var parts = [];
    var COLORS = ['rgba(176,107,255,', 'rgba(255,107,214,', 'rgba(79,210,255,', 'rgba(243,240,255,'];

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      var target = Math.round(Math.min(150, (W * H) / 11000));
      parts = [];
      for (var i = 0; i < target; i++) parts.push(spawn(true));
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + Math.random() * 40,
        r: 0.5 + Math.random() * 1.8,
        vy: 0.10 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.22,
        a: 0.18 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2,
        tws: 0.006 + Math.random() * 0.02,
        col: COLORS[(Math.random() * COLORS.length) | 0]
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!reduce) {
          p.y -= p.vy; p.x += p.vx; p.tw += p.tws;
          if (p.y < -10) { parts[i] = spawn(false); continue; }
        }
        var flick = 0.55 + 0.45 * Math.sin(p.tw);
        var alpha = (p.a * (reduce ? 1 : flick)).toFixed(3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.col + alpha + ')';
        ctx.shadowColor = p.col + '0.9)';
        ctx.shadowBlur = p.r * 4;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    var raf;
    window.addEventListener('resize', resize);
    resize();
    draw();
    if (reduce) draw(); // one static paint when motion is reduced
  })();

  /* ---------- 2. live countdown ---------- */
  (function () {
    var elD = document.getElementById('d'), elH = document.getElementById('h');
    var elM = document.getElementById('m'), elS = document.getElementById('s');
    var yr = document.getElementById('yr');
    if (yr) yr.textContent = String(new Date().getFullYear());
    if (!elD || !elH || !elM || !elS) return;

    // Target: 30 days from first load, pinned to the top of that day. Edit the
    // offset (or hardcode an ISO date) in notes — see template notes.
    var target = new Date();
    target.setDate(target.getDate() + 30);
    target.setHours(10, 0, 0, 0);
    var targetMs = target.getTime();

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function tick() {
      var diff = Math.max(0, targetMs - Date.now());
      var s = Math.floor(diff / 1000);
      var days = Math.floor(s / 86400); s -= days * 86400;
      var hrs = Math.floor(s / 3600); s -= hrs * 3600;
      var mins = Math.floor(s / 60); s -= mins * 60;
      elD.textContent = pad(days);
      elH.textContent = pad(hrs);
      elM.textContent = pad(mins);
      elS.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ---------- 3. email capture (visual only — morph to success) ---------- */
  (function () {
    var form = document.getElementById('form');
    var capture = document.getElementById('capture');
    var input = document.getElementById('email');
    var ename = document.getElementById('ename');
    if (!form || !capture) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = (input && input.value || '').trim();
      if (val && !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(val)) {
        if (input) { input.focus(); input.style.color = '#ff8fb0'; }
        return;
      }
      if (ename && val) {
        var at = val.indexOf('@');
        ename.textContent = 'at ' + (at > -1 ? val.slice(at + 1) : val);
      }
      capture.classList.add('done');
    });
  })();
})();
`.trim()

export const comingSoon: Template = {
  id: 'coming-soon',
  kind: 'page',
  name: 'Coming Soon',
  tagline: 'A premium launch / waitlist page with countdown',
  categories: ['Marketing'],
  audiences: ['startup', 'marketing', 'launch'],
  description:
    'A premium full-viewport coming-soon / waitlist page on a deep midnight-indigo→violet ground. A living background drifts behind everything — a soft CSS mesh-aurora plus an elegant low-key canvas ember/star field that floats upward and twinkles. Centered: an SVG monogram, a glassy “Launching soon” pill, a confident gradient headline, a live day/hour/minute/second countdown, and a visual-only email capture that morphs into a “You’re on the list ✓” state on submit. All art is CSS/SVG/canvas — no images — and motion honors prefers-reduced-motion.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#07060f',
  notes:
    "Palette knobs live in :root — --c1 (indigo), --c2 (violet), --c3 (magenta), --c4 (cyan spark), and --bg (deep ground); --grad is the headline/button gradient and recolors the monogram via the #mg stops in the SVG. Swap the brand: edit the `.mark` text (“Nova”), the monogram path in the `.mono` SVG, and the © line in the footer. COUNTDOWN: in page.js the target is computed as +30 days at 10:00 local — to pin a real launch, replace the `target.setDate(...)` lines with a hardcoded date, e.g. `var target = new Date('2026-09-01T10:00:00');`. The email form is intentionally non-networked: on submit it preventDefaults and morphs `.capture` into the `.success` state (no data leaves the page) — wire it to a real endpoint inside the submit handler if you want. The background has two layers: the CSS `.aurora` (edit the radial-gradient stops + drift keyframes) and the `#field` canvas ember count (the `Math.min(150, ...)` cap). All motion is gated on prefers-reduced-motion.",
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#07060f',
  },
}
