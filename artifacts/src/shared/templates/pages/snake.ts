import type { Template } from '../types'

// A polished, genuinely playable neon Snake game on a single <canvas>. The board
// lives in a glowing rounded frame with a subtle grid; the snake is a smooth,
// rounded gradient body (not raw squares) and the food glows + pulses. HUD shows
// live score, durable best score, and run length. Controls: arrow
// keys + WASD + an on-screen D-pad for touch. Crisp fixed-timestep loop, DPR-aware
// canvas, resize-safe, speeds up as you grow, can't reverse into itself, and a
// start + game-over overlay. Pure JS/canvas — no libraries, no image assets.
// Honors prefers-reduced-motion (dials back the glow pulsing).

const CSS = `
:root {
  --bg: #07080d;
  --bg-2: #0b0d16;
  --frame: #11131f;
  --line: rgba(255,255,255,0.07);
  --ink: #eef1ff;
  --mut: #8b91ad;
  --faint: #5a607a;
  --c1: #22e3c3;      /* neon teal   */
  --c2: #5b8cff;      /* neon blue   */
  --c3: #b56bff;      /* neon violet */
  --food: #ff4d8d;    /* hot pink    */
  --food-2: #ffb84d;  /* amber core  */
  --grad: linear-gradient(120deg, var(--c1), var(--c2) 55%, var(--c3));
  --display: 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 620px at 50% -8%, rgba(91,140,255,0.14), transparent 62%),
    radial-gradient(900px 520px at 92% 108%, rgba(181,107,255,0.12), transparent 60%),
    var(--bg);
  color: var(--ink);
  min-height: 100vh;
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

.wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(22px, 5vw, 56px) clamp(16px, 4vw, 28px) clamp(40px, 7vw, 80px);
  display: flex; flex-direction: column;
  align-items: center;
  gap: clamp(18px, 3vw, 26px);
}

/* ---- header / brand ---- */
.head { width: 100%; display: flex; align-items: center; gap: 14px; }
.mark {
  width: 38px; height: 38px; border-radius: 12px; flex: none; position: relative;
  background: var(--grad);
  box-shadow: 0 8px 26px -8px var(--c2), inset 0 0 14px rgba(255,255,255,0.25);
}
.mark::after {
  content: ''; position: absolute; inset: 9px; border-radius: 5px;
  background: var(--bg);
  box-shadow: 0 0 0 3px rgba(34,227,195,0.5);
}
.brand h1 {
  font-family: var(--display); font-weight: 600; font-size: clamp(20px, 3.2vw, 26px);
  letter-spacing: -0.02em; margin: 0; line-height: 1;
}
.brand p { color: var(--mut); margin: 5px 0 0; font-size: 13px; letter-spacing: 0.01em; }
.head .spacer { flex: 1; }
.kbd {
  display: none; gap: 6px;
}
.kbd kbd {
  font: 600 11px var(--body); color: var(--mut);
  background: var(--frame); border: 1px solid var(--line);
  border-bottom-width: 2px; border-radius: 7px;
  padding: 4px 8px; min-width: 22px; text-align: center;
}
@media (min-width: 560px) { .kbd { display: inline-flex; } }

/* ---- HUD ---- */
.hud {
  width: 100%;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(10px, 2vw, 14px);
}
.stat {
  background: linear-gradient(180deg, var(--frame), var(--bg-2));
  border: 1px solid var(--line); border-radius: 16px;
  padding: 13px 16px; position: relative; overflow: hidden;
}
.stat::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--grad); opacity: 0.85;
}
.stat .l {
  color: var(--mut); font-size: 11px; font-weight: 600;
  letter-spacing: 0.14em; text-transform: uppercase;
}
.stat .v {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(24px, 4.6vw, 32px); letter-spacing: -0.02em;
  margin-top: 5px; line-height: 1;
}
.stat.best .v { background: linear-gradient(110deg, var(--c1), var(--c3)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.stat .crown { font-size: 12px; color: var(--food-2); }

/* ---- board / frame ---- */
.board {
  position: relative;
  width: 100%;
  max-width: 560px;
  aspect-ratio: 1 / 1;
  border-radius: 26px;
  padding: clamp(10px, 2.4vw, 16px);
  background:
    radial-gradient(140% 120% at 50% 0%, rgba(91,140,255,0.10), transparent 55%),
    var(--frame);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 40px 90px -50px rgba(0,0,0,0.9),
    0 0 0 1px rgba(34,227,195,0.05),
    inset 0 1px 0 rgba(255,255,255,0.06),
    0 0 60px -28px rgba(91,140,255,0.55);
}
.board::after {
  content: ''; position: absolute; inset: 0; border-radius: 26px; pointer-events: none;
  box-shadow: inset 0 0 36px -10px rgba(34,227,195,0.18);
}
canvas#play {
  display: block; width: 100%; height: 100%;
  border-radius: 16px;
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(91,140,255,0.06), transparent 60%),
    var(--bg);
  outline: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
canvas#play:focus-visible { box-shadow: 0 0 0 2px var(--c1), 0 0 0 5px rgba(34,227,195,0.25); }

/* ---- overlays ---- */
.overlay {
  position: absolute; inset: clamp(10px, 2.4vw, 16px);
  border-radius: 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 16px; text-align: center;
  background: radial-gradient(120% 120% at 50% 30%, rgba(11,13,22,0.62), rgba(7,8,13,0.92));
  -webkit-backdrop-filter: blur(7px); backdrop-filter: blur(7px);
  padding: 24px; opacity: 0; visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
  z-index: 3;
  /* Let taps fall through to the canvas underneath (tap-to-start); only the
     interactive controls capture pointer events. Without this the shown overlay
     swallows the click and the game never starts. */
  pointer-events: none;
}
.overlay .btn, .overlay button, .overlay a { pointer-events: auto; }
.overlay.show { opacity: 1; visibility: visible; }
.overlay .eyebrow {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
  color: var(--c1);
}
.overlay h2 {
  font-family: var(--display); font-weight: 600; margin: 0;
  font-size: clamp(28px, 6.5vw, 46px); letter-spacing: -0.03em; line-height: 1;
}
.overlay h2 .grad { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.overlay p { color: var(--mut); margin: 0; font-size: 14.5px; max-width: 30ch; line-height: 1.5; }
.overlay .pill {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 9px 16px; border-radius: 999px;
  border: 1px solid var(--line); background: rgba(17,19,31,0.7);
  font-size: 13px; color: var(--ink); font-weight: 600;
}
.overlay .pill b { font-family: var(--display); font-size: 20px; }
.overlay .pill .div { width: 1px; height: 18px; background: var(--line); }
.overlay .pill .gold { color: var(--food-2); }
.btn {
  appearance: none; border: 0; cursor: pointer;
  font: 600 15px var(--body); letter-spacing: 0.01em; color: #05060a;
  padding: 13px 26px; border-radius: 999px;
  background: var(--grad);
  box-shadow: 0 16px 40px -14px var(--c2), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 22px 50px -14px var(--c2), inset 0 1px 0 rgba(255,255,255,0.4); }
.btn:focus-visible { outline: 2px solid var(--c1); outline-offset: 3px; }
.blink { animation: blink 1.6s ease-in-out infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.42; } }

/* ---- footer / controls ---- */
.foot {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
}
.hint { color: var(--faint); font-size: 12.5px; line-height: 1.5; max-width: 34ch; }
.hint b { color: var(--mut); font-weight: 600; }

/* on-screen d-pad (touch) */
.dpad {
  display: grid;
  grid-template-columns: repeat(3, 52px);
  grid-template-rows: repeat(3, 52px);
  gap: 7px;
  flex: none;
}
.dpad button {
  appearance: none; cursor: pointer;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, var(--frame), var(--bg-2));
  color: var(--mut); border-radius: 14px;
  display: grid; place-items: center;
  transition: transform 0.1s ease, color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
}
.dpad button:active, .dpad button.lit {
  color: var(--ink); border-color: rgba(34,227,195,0.6);
  background: linear-gradient(180deg, rgba(34,227,195,0.16), rgba(91,140,255,0.10));
  transform: scale(0.94);
}
.dpad button:focus-visible { outline: 2px solid var(--c1); outline-offset: 2px; }
.dpad svg { width: 19px; height: 19px; }
.dpad .up { grid-column: 2; grid-row: 1; }
.dpad .left { grid-column: 1; grid-row: 2; }
.dpad .down { grid-column: 2; grid-row: 3; }
.dpad .right { grid-column: 3; grid-row: 2; }
.dpad .core {
  grid-column: 2; grid-row: 2; border-radius: 50%;
  border: 1px solid var(--line); background: var(--bg-2);
  display: grid; place-items: center;
}
.dpad .core span { width: 9px; height: 9px; border-radius: 50%; background: var(--grad); box-shadow: 0 0 10px var(--c1); }

/* explicit small-phone pass (usable down to ~360px) */
@media (max-width: 640px) {
  .wrap { gap: 16px; }
  .head { gap: 11px; }
  .hud { gap: 9px; }
  .stat { padding: 11px 12px; border-radius: 13px; }
  .stat .l { font-size: 10px; letter-spacing: 0.1em; }
  .stat .v { font-size: clamp(20px, 7.5vw, 28px); }
  .board { border-radius: 20px; }
  .board::after { border-radius: 20px; }
  .overlay h2 { font-size: clamp(26px, 9vw, 38px); }
  .overlay p { font-size: 13.5px; }
}
@media (max-width: 560px) {
  .foot { flex-direction: column-reverse; align-items: stretch; }
  .hint { max-width: 100%; text-align: center; }
  .dpad { margin: 0 auto; grid-template-columns: repeat(3, 58px); grid-template-rows: repeat(3, 58px); }
}
@media (min-width: 561px) {
  /* d-pad is handy but optional on desktop — keep it, just smaller emphasis */
  .dpad { opacity: 0.92; }
}
@media (prefers-reduced-motion: reduce) {
  .blink { animation: none; }
}
`.trim()

const HTML = `
<div class="wrap">
  <header class="head reveal" data-reveal="none">
    <span class="mark" aria-hidden="true"></span>
    <div class="brand">
      <h1>Neon Snake</h1>
      <p>Eat the glow. Don't bite yourself.</p>
    </div>
    <span class="spacer"></span>
    <span class="kbd" aria-hidden="true">
      <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
    </span>
  </header>

  <section class="hud reveal" data-reveal="none" aria-label="Scoreboard">
    <div class="stat">
      <div class="l">Score</div>
      <div class="v num" id="score">0</div>
    </div>
    <div class="stat best">
      <div class="l"><span class="crown">&#9733;</span> Best</div>
      <div class="v num" id="best">0</div>
    </div>
    <div class="stat">
      <div class="l">Length</div>
      <div class="v num" id="len">3</div>
    </div>
  </section>

  <div class="board reveal" data-reveal="scale">
    <canvas id="play" tabindex="0" aria-label="Snake game board. Use arrow keys or W A S D to steer."></canvas>

    <div class="overlay show" id="ovStart">
      <span class="eyebrow">Ready</span>
      <h2><span class="grad">Neon Snake</span></h2>
      <p>Steer with the arrow keys, <b>WASD</b>, or the pad below. Grab the pink orbs to grow — it gets faster as you go.</p>
      <span class="pill blink">Press any key or tap to play</span>
    </div>

    <div class="overlay" id="ovOver">
      <span class="eyebrow" style="color:var(--food)">Game over</span>
      <h2 id="overTitle">Nice run</h2>
      <span class="pill">
        Score <b class="num" id="finalScore">0</b>
        <span class="div"></span>
        <span class="gold">&#9733;</span> Best <b class="num" id="finalBest">0</b>
      </span>
      <button class="btn" id="again" type="button">Play again</button>
    </div>
  </div>

  <div class="foot reveal" data-reveal="none">
    <p class="hint"><b>Arrows / WASD</b> to steer &middot; the snake speeds up as it grows &middot; your best score is saved on this device.</p>
    <div class="dpad" role="group" aria-label="Direction pad">
      <button class="up" data-dir="up" type="button" aria-label="Up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11l6-6 6 6"/></svg></button>
      <button class="left" data-dir="left" type="button" aria-label="Left"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6M11 6l-6 6 6 6"/></svg></button>
      <div class="core" aria-hidden="true"><span></span></div>
      <button class="right" data-dir="right" type="button" aria-label="Right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>
      <button class="down" data-dir="down" type="button" aria-label="Down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v13M6 13l6 6 6-6"/></svg></button>
    </div>
  </div>
</div>
`.trim()

// page.js — string concatenation only (no template literals), so the TS file
// always compiles. Fixed-timestep loop, DPR-aware canvas, resize-safe.
const JS = `
(function () {
  var canvas = document.getElementById('play');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- tunable knobs ----
  var GRID = 17;            // cells per side (square board)
  var START_LEN = 3;
  var BASE_STEP = 148;      // ms per move at length START_LEN (lower = faster)
  var MIN_STEP = 62;        // fastest the snake will ever move
  var SPEEDUP = 3.6;        // ms shaved off the step per food eaten

  // ---- palette (read from CSS variables so a recolor in CSS just works) ----
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    v = (v || '').trim();
    return v || fallback;
  }
  var COL_HEAD = cssVar('--c1', '#22e3c3');
  var COL_MID  = cssVar('--c2', '#5b8cff');
  var COL_TAIL = cssVar('--c3', '#b56bff');
  var COL_FOOD = cssVar('--food', '#ff4d8d');
  var COL_FOOD2 = cssVar('--food-2', '#ffb84d');
  var COL_GRID = 'rgba(255,255,255,0.045)';
  var COL_GRID2 = 'rgba(255,255,255,0.025)';

  // ---- DPR-aware sizing ----
  var dpr = 1, cell = 20, board = 0;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    var size = Math.max(160, Math.min(rect.width, rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    board = canvas.width;
    cell = board / GRID;
    draw();
  }
  window.addEventListener('resize', resize);

  // ---- game state ----
  var snake, dir, nextDir, food, score, alive, started, lastFood;
  var bestStore = window.moldableState('neon-snake:v1');
  var best = 0;
  bestStore.get({ best: 0 }).then(function (saved) {
    best = Number(saved && saved.best) || 0;
    if (elBest) elBest.textContent = String(best);
  }, function () {});

  var elScore = document.getElementById('score');
  var elBest = document.getElementById('best');
  var elLen = document.getElementById('len');
  var ovStart = document.getElementById('ovStart');
  var ovOver = document.getElementById('ovOver');
  var elFinal = document.getElementById('finalScore');
  var elFinalBest = document.getElementById('finalBest');
  var elOverTitle = document.getElementById('overTitle');
  var btnAgain = document.getElementById('again');

  if (elBest) elBest.textContent = String(best);

  function reset() {
    snake = [];
    var mid = Math.floor(GRID / 2);
    for (var i = 0; i < START_LEN; i++) {
      snake.push({ x: mid - i, y: mid });
    }
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    alive = true;
    placeFood();
    updateHud();
  }

  function placeFood() {
    var open = [];
    for (var y = 0; y < GRID; y++) {
      for (var x = 0; x < GRID; x++) {
        var hit = false;
        for (var i = 0; i < snake.length; i++) {
          if (snake[i].x === x && snake[i].y === y) { hit = true; break; }
        }
        if (!hit) open.push({ x: x, y: y });
      }
    }
    if (!open.length) { food = null; return; }
    food = open[Math.floor(Math.random() * open.length)];
    lastFood = performance.now();
  }

  function updateHud() {
    if (elScore) elScore.textContent = String(score);
    if (elLen) elLen.textContent = String(snake.length);
    if (elBest) elBest.textContent = String(best);
  }

  function stepMs() {
    var s = BASE_STEP - (snake.length - START_LEN) * SPEEDUP;
    return Math.max(MIN_STEP, s);
  }

  // ---- input ----
  // Validate against nextDir (the last queued turn), not the committed dir.
  // Otherwise two quick taps between ticks (right -> up -> left) could queue a
  // 180-degree reversal that kills the snake on the next step.
  function setDir(nx, ny) {
    var ref = nextDir || dir;
    if (nx === -ref.x && ny === -ref.y) return; // ignore reversal into the body
    if (nx === ref.x && ny === ref.y) return;   // ignore no-op
    nextDir = { x: nx, y: ny };
  }

  var DIRS = {
    up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
  };

  function handleKey(e) {
    var k = e.key;
    var mapped = null;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') mapped = 'up';
    else if (k === 'ArrowDown' || k === 's' || k === 'S') mapped = 'down';
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') mapped = 'left';
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') mapped = 'right';

    if (!started) {
      // any key starts the game; if a direction key, use it
      e.preventDefault();
      start();
      if (mapped) { var d0 = DIRS[mapped]; setDir(d0[0], d0[1]); }
      return;
    }
    if (mapped) {
      e.preventDefault();
      var d = DIRS[mapped];
      setDir(d[0], d[1]);
      litPad(mapped);
    } else if (k === ' ' || k === 'Enter') {
      if (!alive) { e.preventDefault(); start(); }
    }
  }
  // Listen on window so keys work whether or not the canvas grabbed focus
  // (keydown on the focused canvas bubbles to window too, so one listener covers
  // both cases without double-firing).
  window.addEventListener('keydown', handleKey);

  // d-pad
  function litPad(dirName) {
    var b = document.querySelector('.dpad .' + dirName);
    if (!b) return;
    b.classList.add('lit');
    setTimeout(function () { b.classList.remove('lit'); }, 130);
  }
  var pads = document.querySelectorAll('.dpad button[data-dir]');
  for (var p = 0; p < pads.length; p++) {
    (function (btn) {
      function go(ev) {
        ev.preventDefault();
        var name = btn.getAttribute('data-dir');
        if (!started) { start(); }
        var d = DIRS[name];
        if (d) setDir(d[0], d[1]);
        litPad(name);
        canvas.focus({ preventScroll: true });
      }
      btn.addEventListener('click', go);
      btn.addEventListener('touchstart', go, { passive: false });
    })(pads[p]);
  }

  // tap / click on the board to start (and to focus)
  canvas.addEventListener('pointerdown', function () {
    canvas.focus({ preventScroll: true });
    if (!started) start();
  });

  // swipe-to-steer on the board
  var touchStart = null;
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches[0]) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (!touchStart || !e.touches || !e.touches[0]) return;
    var dx = e.touches[0].clientX - touchStart.x;
    var dy = e.touches[0].clientY - touchStart.y;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
    e.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
    else setDir(0, dy > 0 ? 1 : -1);
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: false });

  if (btnAgain) {
    btnAgain.addEventListener('click', function () {
      start();
      canvas.focus({ preventScroll: true });
    });
  }

  // ---- game flow ----
  function showOverlay(el, on) {
    if (!el) return;
    if (on) el.classList.add('show'); else el.classList.remove('show');
  }

  function start() {
    reset();
    started = true;
    showOverlay(ovStart, false);
    showOverlay(ovOver, false);
    acc = 0;
    last = performance.now();
    canvas.focus({ preventScroll: true });
  }

  function gameOver() {
    alive = false;
    if (score > best) {
      best = score;
      bestStore.set({ best: best }).catch(function () {});
    }
    updateHud();
    if (elFinal) elFinal.textContent = String(score);
    if (elFinalBest) elFinalBest.textContent = String(best);
    if (elOverTitle) {
      if (score > 0 && score >= best && score >= 20) elOverTitle.textContent = 'New best!';
      else if (score >= 20) elOverTitle.textContent = 'Strong run';
      else if (score >= 8) elOverTitle.textContent = 'Nice run';
      else elOverTitle.textContent = 'So close';
    }
    showOverlay(ovOver, true);
  }

  function tick() {
    dir = nextDir;
    var head = snake[0];
    var nx = head.x + dir.x;
    var ny = head.y + dir.y;

    // wall collision
    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) { gameOver(); return; }
    // self collision (skip the tail cell, which will move away — unless we just ate)
    var willEat = (food && nx === food.x && ny === food.y);
    var checkLen = snake.length - (willEat ? 0 : 1);
    for (var i = 0; i < checkLen; i++) {
      if (snake[i].x === nx && snake[i].y === ny) { gameOver(); return; }
    }

    snake.unshift({ x: nx, y: ny });
    if (willEat) {
      score += 1;
      placeFood();
      updateHud();
      flash = 1;
    } else {
      snake.pop();
    }
  }

  // ---- rendering ----
  function lerpColor(a, b, t) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function rgbStr(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (a == null ? 1 : a) + ')';
  }
  var RGB_HEAD = hexToRgb(COL_HEAD);
  var RGB_MID = hexToRgb(COL_MID);
  var RGB_TAIL = hexToRgb(COL_TAIL);

  function snakeColor(t) {
    // t: 0 at head, 1 at tail. teal -> blue -> violet
    if (t < 0.5) return lerpColor(RGB_HEAD, RGB_MID, t * 2);
    return lerpColor(RGB_MID, RGB_TAIL, (t - 0.5) * 2);
  }

  // rounded-rect helper
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  var flash = 0; // brief glow when food eaten

  function drawGrid() {
    ctx.lineWidth = Math.max(1, dpr);
    for (var i = 1; i < GRID; i++) {
      var pos = Math.round(i * cell) + 0.5;
      ctx.strokeStyle = (i % 4 === 0) ? COL_GRID : COL_GRID2;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, board); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(board, pos); ctx.stroke();
    }
  }

  function drawFood(now) {
    if (!food) return;
    var cx = (food.x + 0.5) * cell;
    var cy = (food.y + 0.5) * cell;
    var pulse = reduce ? 0.5 : (0.5 + 0.5 * Math.sin((now - (lastFood || 0)) / 320));
    var rad = cell * (0.30 + 0.05 * pulse);

    // outer glow
    var glowR = cell * (0.95 + 0.35 * pulse);
    var g = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, glowR);
    g.addColorStop(0, rgbStr(hexToRgb(COL_FOOD), 0.55));
    g.addColorStop(0.5, rgbStr(hexToRgb(COL_FOOD), 0.18));
    g.addColorStop(1, rgbStr(hexToRgb(COL_FOOD), 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

    // orb body with amber core
    var body = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
    body.addColorStop(0, COL_FOOD2);
    body.addColorStop(0.55, COL_FOOD);
    body.addColorStop(1, rgbStr(hexToRgb(COL_FOOD), 0.85));
    ctx.fillStyle = body;
    ctx.shadowColor = COL_FOOD;
    ctx.shadowBlur = reduce ? 6 : 14 + 8 * pulse;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // sparkle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(cx - rad * 0.32, cy - rad * 0.32, rad * 0.22, 0, Math.PI * 2); ctx.fill();
  }

  function drawSnake(now) {
    var n = snake.length;
    if (!n) return;
    var pad = cell * 0.12;
    var seg = cell - pad * 2;
    var radius = seg * 0.42;

    // soft union glow under the whole body
    ctx.save();
    ctx.shadowColor = rgbStr(RGB_MID, 0.9);
    ctx.shadowBlur = reduce ? 4 : (10 + flash * 16);

    for (var i = n - 1; i >= 0; i--) {
      var s = snake[i];
      var t = n > 1 ? i / (n - 1) : 0;
      var col = snakeColor(t);

      // interpolate toward neighbor for a smooth, connected body
      var x = s.x * cell + pad;
      var y = s.y * cell + pad;

      // connect to previous segment by extending the rect toward it
      var ex = x, ey = y, ew = seg, eh = seg;
      if (i < n - 1) {
        var prev = snake[i + 1];
        var ddx = s.x - prev.x;
        var ddy = s.y - prev.y;
        if (ddx === 1) { ex = x - pad; ew = seg + pad; }
        else if (ddx === -1) { ew = seg + pad; }
        else if (ddy === 1) { ey = y - pad; eh = seg + pad; }
        else if (ddy === -1) { eh = seg + pad; }
      }

      // body gradient (subtle top-light sheen)
      var grad = ctx.createLinearGradient(ex, ey, ex, ey + eh);
      var light = lerpColor(col, { r: 255, g: 255, b: 255 }, 0.22);
      grad.addColorStop(0, rgbStr(light));
      grad.addColorStop(1, rgbStr(col));
      ctx.fillStyle = grad;

      rr(ex, ey, ew, eh, radius);
      ctx.fill();
    }
    ctx.restore();

    // head detailing (eyes + brighter cap) drawn without the union shadow
    var h = snake[0];
    var hx = h.x * cell + cell / 2;
    var hy = h.y * cell + cell / 2;
    var hr = seg * 0.42;

    // glossy head cap
    var hg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.3, hr * 0.1, hx, hy, hr);
    hg.addColorStop(0, rgbStr(lerpColor(RGB_HEAD, { r: 255, g: 255, b: 255 }, 0.45)));
    hg.addColorStop(1, rgbStr(RGB_HEAD, 0));
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();

    // eyes — placed by direction
    var ex2 = dir.x, ey2 = dir.y;
    var off = seg * 0.20;
    var eyeR = Math.max(1.5, seg * 0.10);
    // perpendicular offset for two eyes
    var px = -ey2, py = ex2;
    var e1x = hx + ex2 * off + px * off;
    var e1y = hy + ey2 * off + py * off;
    var e2x = hx + ex2 * off - px * off;
    var e2y = hy + ey2 * off - py * off;
    ctx.fillStyle = '#05060a';
    ctx.beginPath(); ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(e1x - eyeR * 0.3, e1y - eyeR * 0.3, eyeR * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e2x - eyeR * 0.3, e2y - eyeR * 0.3, eyeR * 0.42, 0, Math.PI * 2); ctx.fill();
  }

  function draw(now) {
    now = now || performance.now();
    ctx.clearRect(0, 0, board, board);
    drawGrid();
    if (snake) {
      drawFood(now);
      drawSnake(now);
    }
    if (flash > 0) flash = Math.max(0, flash - 0.06);
  }

  // ---- fixed-timestep loop ----
  var acc = 0, last = 0, rafId = 0;
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (!last) last = now;
    var dt = now - last;
    last = now;
    if (dt > 250) dt = 250; // clamp after tab-away

    if (started && alive) {
      acc += dt;
      var step = stepMs();
      while (acc >= step) {
        acc -= step;
        tick();
        if (!alive) break;
      }
    }
    draw(now);
  }

  // boot
  reset();
  // start in a paused/preview state behind the start overlay
  started = false;
  alive = true;
  resize();
  requestAnimationFrame(loop);

  // grab focus once the page is interactive so keys work immediately
  window.addEventListener('load', function () { try { canvas.focus({ preventScroll: true }); } catch (e) {} });
  setTimeout(function () { try { canvas.focus({ preventScroll: true }); } catch (e) {} }, 60);
})();
`.trim()

export const snake: Template = {
  id: 'snake',
  kind: 'page',
  name: 'Snake',
  tagline: 'A polished neon Snake game',
  categories: ['Games'],
  audiences: ['game', 'fun', 'interactive'],
  description:
    'A genuinely playable neon Snake game on a single canvas: a glowing rounded board with a subtle grid, a smooth rounded gradient snake with eyes, and a pulsing pink food orb. It speeds up as you grow, persists your best score through Moldable runtime state, and plays with arrow keys, WASD, an on-screen D-pad, or swipes. Pure JS/canvas with a crisp fixed-timestep loop — no libraries, no images.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#07080d',
  notes:
    "The whole game lives in page.js (no libraries). Tune gameplay via the knobs near the top: GRID (cells per side), START_LEN, BASE_STEP (ms per move — lower is faster), MIN_STEP (speed cap), and SPEEDUP (ms shaved off per food eaten). Colors are read from the CSS variables, so recoloring is just a CSS edit: --c1/--c2/--c3 are the snake head→mid→tail gradient, --food/--food-2 are the orb, and --grad drives the brand mark, buttons, and HUD accents. The board is a fixed square (aspect-ratio:1) inside a glowing .board frame; the canvas is DPR-aware and resize-safe. High score uses window.moldableState('neon-snake:v1'). Motion (food pulse, glow) is dialed back under prefers-reduced-motion. To change difficulty curve, edit stepMs(). The snake is drawn as connected rounded segments (not raw squares) in drawSnake(); the food orb + glow is in drawFood().",
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#07080d',
  },
}
