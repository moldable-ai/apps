import type { Template } from '../types'

// A juicy, fully-playable brick-breaker on <canvas> (pure JS, no libraries).
// Paddle by mouse / touch / arrow keys, ball with angle-dependent paddle
// reflection + speed cap, gradient brick rows, particle pops, screen shake,
// 3 lives, infinite levels (each faster with a new layout), game-over + level
// -clear overlays. DPR-aware, fixed-timestep loop, resize-safe, reduced-motion
// aware. All art is CSS/canvas — no image assets.

const CSS = `
:root {
  --bg: #07060f;
  --ink: #f3f0ff;
  --mut: rgba(206,201,236,0.66);
  --faint: rgba(206,201,236,0.4);
  --line: rgba(255,255,255,0.10);
  --c1: #ff4d8d;   /* hot pink   */
  --c2: #ff9a3c;   /* amber      */
  --c3: #ffe14d;   /* gold       */
  --c4: #44e0a8;   /* mint       */
  --c5: #3fc7ff;   /* sky        */
  --c6: #9b6bff;   /* violet     */
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Space Grotesk', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 620px at 18% -8%, rgba(155,107,255,0.16), transparent 60%),
    radial-gradient(900px 560px at 96% 0%, rgba(63,199,255,0.12), transparent 62%),
    var(--bg);
  color: var(--ink);
  overflow-x: hidden;
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

.wrap {
  max-width: 740px;
  margin: 0 auto;
  padding: clamp(18px, 4vw, 40px) clamp(14px, 4vw, 28px) clamp(40px, 7vw, 72px);
}

/* ===== header ===== */
.top { display: flex; align-items: center; gap: 14px; margin-bottom: clamp(16px, 3vw, 26px); }
.brand { display: inline-flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; letter-spacing: -0.01em; font-size: clamp(17px, 2.4vw, 21px); }
.glyph { width: 30px; height: 30px; border-radius: 9px; flex: none; position: relative;
  background: conic-gradient(from 130deg, var(--c1), var(--c2), var(--c3), var(--c4), var(--c5), var(--c6), var(--c1));
  box-shadow: 0 6px 22px -6px var(--c6), inset 0 0 10px rgba(255,255,255,0.32); }
.glyph::after { content: ''; position: absolute; inset: 8px 8px auto 8px; height: 5px; border-radius: 3px; background: rgba(7,6,15,0.92); }
.glyph::before { content: ''; position: absolute; inset: auto 11px 9px 11px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.95); box-shadow: 0 0 10px rgba(255,255,255,0.8); }
.brand small { display: block; font-family: var(--body); font-weight: 500; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--faint); margin-top: 1px; }
.top .spacer { flex: 1; }
.badge { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--mut);
  border: 1px solid var(--line); border-radius: 999px; padding: 6px 13px; background: rgba(255,255,255,0.03); }
.badge i { width: 7px; height: 7px; border-radius: 50%; background: var(--c4); box-shadow: 0 0 10px var(--c4); }

/* ===== HUD ===== */
.hud { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; }
.stat { border: 1px solid var(--line); border-radius: 14px; padding: 11px 15px; background: rgba(255,255,255,0.025); position: relative; overflow: hidden; }
.stat .k { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--faint); font-weight: 600; }
.stat .v { font-family: var(--display); font-weight: 600; font-size: clamp(22px, 4.4vw, 30px); letter-spacing: -0.02em; margin-top: 3px; line-height: 1; display: flex; align-items: baseline; gap: 8px; }
.stat .v small { font-family: var(--body); font-size: 11px; font-weight: 500; color: var(--faint); letter-spacing: 0; }
.lives { display: inline-flex; gap: 5px; }
.lives .ball { width: 13px; height: 13px; border-radius: 50%;
  background: radial-gradient(circle at 32% 30%, #fff, var(--c5) 60%, #1f7fb8);
  box-shadow: 0 0 9px rgba(63,199,255,0.7); transition: opacity .3s ease, transform .3s ease; }
.lives .ball.gone { opacity: 0.12; transform: scale(0.6); box-shadow: none; background: rgba(255,255,255,0.18); }

/* ===== stage ===== */
.stage {
  position: relative; border-radius: 20px; overflow: hidden;
  border: 1px solid var(--line);
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(155,107,255,0.18), transparent 60%),
    linear-gradient(180deg, #0c0a1a, #08070f);
  box-shadow: 0 40px 90px -50px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06);
  aspect-ratio: 3 / 4;
  max-height: 78vh;
}
canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: none; }
.stage.shake { animation: shake 0.32s cubic-bezier(.36,.07,.19,.97); }
@keyframes shake {
  10%,90% { transform: translate(-1px,0); }
  20%,80% { transform: translate(2px,0); }
  30%,50%,70% { transform: translate(-4px,0); }
  40%,60% { transform: translate(4px,0); }
}
.stage.flash::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 100%, rgba(255,77,141,0.42), transparent 60%);
  animation: flash 0.5s ease-out forwards; }
@keyframes flash { from { opacity: 1; } to { opacity: 0; } }

/* ===== overlays ===== */
.overlay { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px; text-align: center; padding: clamp(20px, 6vw, 44px);
  background: radial-gradient(120% 100% at 50% 30%, rgba(12,10,26,0.6), rgba(6,5,14,0.92));
  -webkit-backdrop-filter: blur(7px); backdrop-filter: blur(7px); z-index: 3; }
.overlay.show { display: flex; animation: ov 0.45s cubic-bezier(.16,1,.3,1); }
@keyframes ov { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
.overlay .eyebrow { font-size: 11px; letter-spacing: 0.28em; text-transform: uppercase; font-weight: 700; color: var(--c5); }
.overlay h2 { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 9vw, 64px); line-height: 0.96; letter-spacing: -0.03em; margin: 0; text-wrap: balance; }
.overlay h2 .grad { background: linear-gradient(100deg, var(--c1), var(--c2) 45%, var(--c3)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.overlay h2 .win { background: linear-gradient(100deg, var(--c4), var(--c5) 55%, var(--c6)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.overlay p { color: var(--mut); margin: 0; font-size: clamp(13px, 2.4vw, 15.5px); max-width: 40ch; line-height: 1.5; }
.overlay .scoreline { font-family: var(--display); font-weight: 600; font-size: clamp(15px, 3vw, 19px); color: var(--ink); }
.overlay .scoreline b { background: linear-gradient(100deg, var(--c3), var(--c2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.btn { display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
  font: 600 14.5px var(--body); letter-spacing: 0.01em; color: #0a0814;
  padding: 13px 26px; border: 0; border-radius: 999px; margin-top: 4px;
  background: linear-gradient(100deg, var(--c3), var(--c2));
  box-shadow: 0 16px 38px -14px var(--c2), inset 0 1px 0 rgba(255,255,255,0.4);
  transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s ease; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 22px 46px -14px var(--c2); }
.btn:focus-visible { outline: 3px solid var(--c5); outline-offset: 3px; }
.btn.alt { background: linear-gradient(100deg, var(--c4), var(--c5)); box-shadow: 0 16px 38px -14px var(--c5), inset 0 1px 0 rgba(255,255,255,0.4); }
.btn.alt:hover { box-shadow: 0 22px 46px -14px var(--c5); }
.kbd { display: inline-flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }
.kbd span { font: 600 11px var(--body); color: var(--mut); border: 1px solid var(--line); border-radius: 7px; padding: 4px 9px; background: rgba(255,255,255,0.03); }

/* ===== footer hint ===== */
.foot { display: flex; align-items: center; justify-content: center; gap: clamp(12px, 3vw, 24px); flex-wrap: wrap;
  margin-top: 16px; color: var(--faint); font-size: 12px; }
.foot span { display: inline-flex; align-items: center; gap: 7px; }
.foot b { color: var(--mut); font-weight: 600; }
.foot kbd { font: 600 10.5px var(--body); color: var(--mut); border: 1px solid var(--line); border-radius: 6px; padding: 3px 7px; background: rgba(255,255,255,0.03); }

@media (max-width: 820px) {
  .wrap { padding-left: clamp(12px, 3.5vw, 24px); padding-right: clamp(12px, 3.5vw, 24px); }
  .stage { max-height: 74vh; }
}
@media (max-width: 640px) {
  .hud { gap: 8px; }
  .hud .stat { padding: 9px 12px; }
  .hud .stat .k { letter-spacing: 0.08em; font-size: 9.5px; }
  .stat .v { font-size: clamp(19px, 6.4vw, 26px); }
  .stat .v small { font-size: 10px; }
  .stage { aspect-ratio: 4 / 5; max-height: 68vh; }
  .brand { font-size: clamp(15px, 4.6vw, 18px); }
  .brand small { display: none; }
  .badge { padding: 5px 10px; font-size: 11px; }
  .foot { gap: 8px 14px; font-size: 11px; }
  .kbd span { font-size: 10px; padding: 4px 8px; }
}
@media (max-width: 380px) {
  .hud .stat .k { font-size: 8.5px; }
  .top { gap: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .stage.shake { animation: none; }
  .overlay.show { animation: none; }
}
`.trim()

const HTML = `
<div class="wrap">
  <header class="top reveal" data-reveal="none">
    <span class="glyph" aria-hidden="true"></span>
    <span class="brand">Prism Breaker<small>Neon Arcade · Vol. 1</small></span>
    <span class="spacer"></span>
    <span class="badge"><i></i> Ready</span>
  </header>

  <div class="hud reveal" data-reveal="none">
    <div class="stat"><div class="k">Score</div><div class="v num"><span id="score">0</span></div></div>
    <div class="stat"><div class="k">Lives</div><div class="v"><span class="lives" id="lives" aria-label="lives remaining"></span></div></div>
    <div class="stat"><div class="k">Level</div><div class="v num"><span id="level">1</span><small id="bestline">best 0</small></div></div>
  </div>

  <div class="stage reveal" data-reveal="scale" id="stage">
    <canvas id="game" aria-label="Breakout game board"></canvas>

    <div class="overlay show" id="ovStart">
      <span class="eyebrow">Brick Breaker</span>
      <h2><span class="grad">Prism<br>Breaker</span></h2>
      <p>Clear every brick to advance. Steer the paddle and don't let the ball fall — each level breaks faster.</p>
      <button class="btn" id="btnStart" type="button">Launch ball &nbsp;&rarr;</button>
      <div class="kbd"><span>Move &nbsp;Mouse · Touch · &larr; &rarr;</span><span>Launch &nbsp;Click / Space</span></div>
    </div>

    <div class="overlay" id="ovLevel">
      <span class="eyebrow">Wall cleared</span>
      <h2><span class="win">Level<br><span id="ovLevelNum">1</span> done</span></h2>
      <p class="scoreline">Score <b class="num" id="ovLevelScore">0</b> · streak intact</p>
      <button class="btn alt" id="btnNext" type="button">Next wall &nbsp;&rarr;</button>
    </div>

    <div class="overlay" id="ovOver">
      <span class="eyebrow" id="ovOverKick">Game over</span>
      <h2><span class="grad" id="ovOverTitle">Out of<br>balls</span></h2>
      <p class="scoreline">You scored <b class="num" id="ovOverScore">0</b> · reached level <b class="num" id="ovOverLevel">1</b></p>
      <p id="ovOverNew" style="display:none;color:var(--c3);font-weight:600">New personal best!</p>
      <button class="btn" id="btnRestart" type="button">Play again &nbsp;&rarr;</button>
    </div>
  </div>

  <div class="foot reveal" data-reveal="none">
    <span><b>Move</b> mouse, drag, or <kbd>&larr;</kbd><kbd>&rarr;</kbd></span>
    <span><b>Launch</b> <kbd>click</kbd> / <kbd>space</kbd></span>
    <span><b>Pause</b> <kbd>P</kbd></span>
  </div>
</div>
`.trim()

// NOTE: page.js — string concatenation only, NO template literals, so the .ts
// file always compiles. Pure canvas 2D game; no external libraries.
const JS = `
(function () {
  var canvas = document.getElementById('game');
  var stage = document.getElementById('stage');
  if (!canvas || !stage) return;
  var ctx = canvas.getContext('2d');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- palette (per-row brick colors, top -> bottom) -----
  var ROWCOLORS = ['#ff4d8d', '#ff9a3c', '#ffe14d', '#44e0a8', '#3fc7ff', '#9b6bff'];

  // ----- logical (CSS-pixel) dimensions; physics runs in this space -----
  var W = 0, H = 0, dpr = 1;

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(240, r.width);
    H = Math.max(320, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutPaddle();
  }

  // ----- entities -----
  var paddle = { w: 96, h: 14, x: 0, y: 0, targetX: 0 };
  var ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8, stuck: true };
  var bricks = [];
  var particles = [];
  var trail = [];

  // ----- game state -----
  var STATE = { START: 0, PLAY: 1, LEVELCLR: 2, OVER: 3, PAUSE: 4 };
  var state = STATE.START;
  var score = 0, lives = 3, level = 1;
  var bestStore = window.moldableState('prism-breaker:v1');
  var best = 0;
  bestStore.get({ best: 0 }).then(function (saved) {
    best = Number(saved && saved.best) || 0;
    if (elBest) elBest.textContent = 'best ' + best;
  }, function () {});
  var baseSpeed = 6.2;       // ball speed in CSS px / step at level 1
  var SPEED_CAP = 13.5;

  // ----- HUD elements -----
  var elScore = document.getElementById('score');
  var elLives = document.getElementById('lives');
  var elLevel = document.getElementById('level');
  var elBest = document.getElementById('bestline');

  function renderLives() {
    if (!elLives) return;
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<span class="ball' + (i < lives ? '' : ' gone') + '"></span>';
    }
    elLives.innerHTML = html;
  }
  function renderHud() {
    if (elScore) elScore.textContent = String(score);
    if (elLevel) elLevel.textContent = String(level);
    if (elBest) elBest.textContent = 'best ' + best;
    renderLives();
  }

  // ----- paddle layout / placement -----
  function layoutPaddle() {
    paddle.w = Math.max(64, Math.min(132, W * 0.22));
    paddle.h = 14;
    paddle.y = H - 38;
    if (paddle.x === 0) paddle.x = (W - paddle.w) / 2;
    paddle.x = clamp(paddle.x, 0, W - paddle.w);
    paddle.targetX = paddle.x;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // ----- brick wall generation; each level a different pattern -----
  function buildLevel() {
    bricks = [];
    var cols = 9;
    var top = Math.max(48, H * 0.14);
    var sidepad = 14;
    var gap = 6;
    var bw = (W - sidepad * 2 - gap * (cols - 1)) / cols;
    var bh = Math.max(16, Math.min(26, H * 0.045));
    var rows = Math.min(8, 4 + Math.floor((level - 1) / 1.5));
    var pattern = (level - 1) % 5;

    for (var rIdx = 0; rIdx < rows; rIdx++) {
      for (var c = 0; c < cols; c++) {
        if (!cellOn(pattern, rIdx, c, rows, cols)) continue;
        var color = ROWCOLORS[rIdx % ROWCOLORS.length];
        // tougher bricks toward the top on higher levels (2 hits)
        var hp = (level >= 3 && rIdx < 2 && pattern !== 1) ? 2 : 1;
        bricks.push({
          x: sidepad + c * (bw + gap),
          y: top + rIdx * (bh + gap),
          w: bw, h: bh, color: color, hp: hp, max: hp, alive: true,
          pts: 10 + rIdx * 5
        });
      }
    }
  }

  // pattern masks -> which cells are filled
  function cellOn(pattern, r, c, rows, cols) {
    if (pattern === 0) return true;                                  // solid wall
    if (pattern === 1) return (r + c) % 2 === 0;                     // checker
    if (pattern === 2) {                                             // diamond
      var mc = (cols - 1) / 2, mr = (rows - 1) / 2;
      return (Math.abs(c - mc) / mc + Math.abs(r - mr) / Math.max(1, mr)) <= 1.05;
    }
    if (pattern === 3) return (c >= r) && (c <= cols - 1 - r) ? true : (r >= rows - 2); // pyramid + base
    if (pattern === 4) return !(c > 1 && c < cols - 2 && r > 0 && r < rows - 1);        // hollow frame
    return true;
  }

  // ----- launch / reset ball onto paddle -----
  function placeBallOnPaddle() {
    ball.r = Math.max(6, Math.min(9, W * 0.018));
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.r - 2;
    ball.vx = 0; ball.vy = 0; ball.stuck = true;
    trail = [];
  }
  function curSpeed() {
    return Math.min(SPEED_CAP, baseSpeed + (level - 1) * 0.65);
  }
  function launchBall() {
    if (!ball.stuck) return;
    ball.stuck = false;
    var sp = curSpeed();
    var ang = (-Math.PI / 2) + (Math.random() - 0.5) * 0.5; // mostly upward
    ball.vx = Math.cos(ang) * sp;
    ball.vy = Math.sin(ang) * sp;
  }

  // ----- particles -----
  function pop(x, y, color, n) {
    var count = reduce ? Math.min(4, n) : n;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1.5 + Math.random() * 4.5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
        life: 1, color: color, size: 1.6 + Math.random() * 3
      });
    }
    if (particles.length > 360) particles.splice(0, particles.length - 360);
  }

  // ----- screen feedback -----
  function shake() {
    if (reduce) return;
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
  }
  function flash() {
    stage.classList.remove('flash'); void stage.offsetWidth; stage.classList.add('flash');
  }

  // ----- overlays -----
  var ovStart = document.getElementById('ovStart');
  var ovLevel = document.getElementById('ovLevel');
  var ovOver = document.getElementById('ovOver');
  function hideOverlays() {
    [ovStart, ovLevel, ovOver].forEach(function (o) { if (o) o.classList.remove('show'); });
  }
  function show(o) { if (o) o.classList.add('show'); }

  // ----- level lifecycle -----
  function startGame() {
    score = 0; lives = 3; level = 1;
    baseSpeed = 6.2;
    hideOverlays();
    state = STATE.PLAY;
    buildLevel();
    placeBallOnPaddle();
    renderHud();
  }
  function nextLevel() {
    level += 1;
    hideOverlays();
    state = STATE.PLAY;
    buildLevel();
    placeBallOnPaddle();
    renderHud();
  }
  function loseLife() {
    lives -= 1;
    renderLives();
    flash();
    shake();
    if (lives <= 0) {
      gameOver();
    } else {
      placeBallOnPaddle();
    }
  }
  function gameOver() {
    state = STATE.OVER;
    var isNew = score > best;
    if (isNew) {
      best = score;
      bestStore.set({ best: best }).catch(function () {});
    }
    if (elBest) elBest.textContent = 'best ' + best;
    setText('ovOverScore', score);
    setText('ovOverLevel', level);
    var nw = document.getElementById('ovOverNew');
    if (nw) nw.style.display = isNew ? 'block' : 'none';
    show(ovOver);
  }
  function levelClear() {
    state = STATE.LEVELCLR;
    // bonus for remaining lives
    score += lives * 50;
    renderHud();
    setText('ovLevelNum', level);
    setText('ovLevelScore', score);
    show(ovLevel);
  }
  function setText(id, val) { var e = document.getElementById(id); if (e) e.textContent = String(val); }

  // ----- input: paddle target -----
  function pointerToTarget(clientX) {
    var r = canvas.getBoundingClientRect();
    var x = (clientX - r.left);
    paddle.targetX = clamp(x - paddle.w / 2, 0, W - paddle.w);
  }
  canvas.addEventListener('mousemove', function (e) { pointerToTarget(e.clientX); });
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches[0]) pointerToTarget(e.touches[0].clientX);
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (e.touches[0]) pointerToTarget(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });

  // click / tap to launch (and to start from the board)
  canvas.addEventListener('mousedown', primaryAction);
  canvas.addEventListener('touchend', function (e) { primaryAction(); }, { passive: true });
  function primaryAction() {
    if (state === STATE.START) { startGame(); return; }
    if (state === STATE.PLAY) { launchBall(); return; }
  }

  // keyboard
  var keyLeft = false, keyRight = false;
  window.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keyLeft = true; e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keyRight = true; e.preventDefault(); }
    else if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (state === STATE.START) startGame();
      else if (state === STATE.PLAY) launchBall();
      else if (state === STATE.PAUSE) { state = STATE.PLAY; }
    }
    else if (k === 'p' || k === 'P') {
      if (state === STATE.PLAY) state = STATE.PAUSE;
      else if (state === STATE.PAUSE) state = STATE.PLAY;
    }
    else if (k === 'Enter') {
      if (state === STATE.OVER) startGame();
      else if (state === STATE.LEVELCLR) nextLevel();
    }
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keyLeft = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keyRight = false;
  });

  // buttons
  bind('btnStart', startGame);
  bind('btnRestart', startGame);
  bind('btnNext', nextLevel);
  function bind(id, fn) { var b = document.getElementById(id); if (b) b.addEventListener('click', fn); }

  window.addEventListener('resize', resize);

  // ===== collision: ball vs paddle (angle depends on hit position) =====
  function ballPaddle() {
    if (ball.vy <= 0) return;
    if (ball.y + ball.r < paddle.y || ball.y - ball.r > paddle.y + paddle.h) return;
    if (ball.x < paddle.x - ball.r || ball.x > paddle.x + paddle.w + ball.r) return;
    // reflect; angle from where it struck (-1 left edge .. +1 right edge)
    var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    hit = clamp(hit, -1, 1);
    var sp = Math.min(SPEED_CAP, Math.hypot(ball.vx, ball.vy) * 1.012); // tiny ramp
    var maxBounce = Math.PI * 0.40; // ~72deg off vertical at the edges
    var ang = -Math.PI / 2 + hit * maxBounce;
    ball.vx = Math.cos(ang) * sp;
    ball.vy = Math.sin(ang) * sp;
    ball.y = paddle.y - ball.r - 0.5;
    pop(ball.x, ball.y, '#ffffff', 5);
  }

  // ===== collision: ball vs bricks =====
  function ballBricks() {
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (ball.x + ball.r < b.x || ball.x - ball.r > b.x + b.w) continue;
      if (ball.y + ball.r < b.y || ball.y - ball.r > b.y + b.h) continue;

      // determine bounce axis by smallest overlap
      var overL = (ball.x + ball.r) - b.x;
      var overR = (b.x + b.w) - (ball.x - ball.r);
      var overT = (ball.y + ball.r) - b.y;
      var overB = (b.y + b.h) - (ball.y - ball.r);
      var minX = Math.min(overL, overR);
      var minY = Math.min(overT, overB);
      if (minX < minY) {
        ball.vx = -ball.vx;
        ball.x += (overL < overR) ? -minX : minX;
      } else {
        ball.vy = -ball.vy;
        ball.y += (overT < overB) ? -minY : minY;
      }

      b.hp -= 1;
      if (b.hp <= 0) {
        b.alive = false;
        score += b.pts;
        pop(b.x + b.w / 2, b.y + b.h / 2, b.color, reduce ? 6 : 14);
      } else {
        score += 5;
        pop(ball.x, ball.y, b.color, 5);
      }
      renderHud();

      if (aliveCount() === 0) levelClear();
      return; // one brick per step keeps physics stable
    }
  }
  function aliveCount() {
    var n = 0;
    for (var i = 0; i < bricks.length; i++) if (bricks[i].alive) n++;
    return n;
  }

  // ===== fixed-timestep update =====
  function stepPhysics() {
    // paddle keyboard movement + smoothing toward pointer target
    var kbSpeed = W * 0.022;
    if (keyLeft) paddle.targetX -= kbSpeed;
    if (keyRight) paddle.targetX += kbSpeed;
    paddle.targetX = clamp(paddle.targetX, 0, W - paddle.w);
    paddle.x += (paddle.targetX - paddle.x) * 0.42;
    paddle.x = clamp(paddle.x, 0, W - paddle.w);

    if (state !== STATE.PLAY) return;

    if (ball.stuck) {
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.r - 2;
      return;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;

    // walls
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); pop(ball.x, ball.y, '#ffffff', 3); }
    else if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); pop(ball.x, ball.y, '#ffffff', 3); }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); pop(ball.x, ball.y, '#ffffff', 3); }

    ballPaddle();
    ballBricks();

    // trail
    if (!reduce) {
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 12) trail.shift();
    }

    // fell below
    if (ball.y - ball.r > H + 6) {
      loseLife();
    }
  }

  function stepParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.16;     // gravity
      p.vx *= 0.985;
      p.life -= 0.028;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ===== render =====
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // faint field grid
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    var gx = W / 9;
    for (var x = gx; x < W; x += gx) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.restore();

    // bricks
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      drawBrick(b);
    }

    // particles (additive glow)
    if (particles.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var j = 0; j < particles.length; j++) {
        var p = particles[j];
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + p.life * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ball trail
    if (trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var t = 0; t < trail.length; t++) {
        var tp = trail[t];
        var a = (t / trail.length);
        ctx.globalAlpha = a * 0.4;
        ctx.fillStyle = '#3fc7ff';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, ball.r * (0.3 + a * 0.7), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawPaddle();
    drawBall();
  }

  function drawBrick(b) {
    var r = 5;
    var dim = b.max > 1 && b.hp < b.max; // cracked (was 2hp, now 1)
    ctx.save();
    // glow
    ctx.shadowColor = b.color;
    ctx.shadowBlur = dim ? 4 : 12;
    var grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, shade(b.color, dim ? 0.45 : 1.18));
    grad.addColorStop(1, shade(b.color, dim ? 0.3 : 0.78));
    ctx.fillStyle = grad;
    roundRect(b.x, b.y, b.w, b.h, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    // top sheen
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(b.x + 2, b.y + 2, b.w - 4, Math.max(2, b.h * 0.26), 3);
    ctx.fill();
    ctx.restore();
  }

  function drawPaddle() {
    var x = paddle.x, y = paddle.y, w = paddle.w, h = paddle.h;
    ctx.save();
    ctx.shadowColor = '#9b6bff';
    ctx.shadowBlur = 18;
    var grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#f3f0ff');
    grad.addColorStop(0.5, '#c9b6ff');
    grad.addColorStop(1, '#9b6bff');
    ctx.fillStyle = grad;
    roundRect(x, y, w, h, h / 2);
    ctx.fill();
    // center accent
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#3fc7ff';
    roundRect(x + w * 0.42, y + h * 0.3, w * 0.16, h * 0.4, 3);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    if (state === STATE.OVER) return;
    ctx.save();
    ctx.shadowColor = '#3fc7ff';
    ctx.shadowBlur = 20;
    var g = ctx.createRadialGradient(ball.x - ball.r * 0.35, ball.y - ball.r * 0.4, ball.r * 0.1, ball.x, ball.y, ball.r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#bfeeff');
    g.addColorStop(1, '#3fc7ff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // rounded-rect path helper
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // lighten/darken a hex color by factor (>1 lighten, <1 darken)
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(Math.min(255, r * f));
    g = Math.round(Math.min(255, g * f));
    b = Math.round(Math.min(255, b * f));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ===== main loop: fixed-timestep accumulator =====
  var STEP = 1000 / 60;
  var acc = 0, last = performance.now();
  function loop(now) {
    var dt = now - last;
    last = now;
    if (dt > 100) dt = 100; // avoid spiral after tab switch
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard < 6) {
      stepPhysics();
      stepParticles();
      acc -= STEP;
      guard++;
    }
    if (acc > STEP) acc = 0;
    draw();
    requestAnimationFrame(loop);
  }

  // ===== boot =====
  resize();
  placeBallOnPaddle();
  renderHud();
  requestAnimationFrame(loop);
})();
`.trim()

export const breakout: Template = {
  id: 'breakout',
  kind: 'page',
  name: 'Breakout',
  tagline: 'A juicy brick-breaker arcade game',
  categories: ['Games'],
  audiences: ['game', 'fun', 'interactive'],
  description:
    'A fully playable, juicy brick-breaker arcade game on a single <canvas> — no libraries. Steer the paddle with the mouse, touch drag, or arrow keys; the ball reflects off the paddle at an angle set by where it lands, ramps gently up to a speed cap, and pops particle bursts as it shatters gradient brick walls. A clean neon HUD tracks score, three lives, and level; clearing every brick advances to a faster wall with a fresh layout, and game-over / level-clear overlays handle restart. DPR-aware, fixed-timestep, resize-safe, and reduced-motion friendly.',
  fonts: {
    display: 'Clash Display',
    body: 'Space Grotesk',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#07060f',
  notes:
    "Pure canvas-2D game in samplePage.js — no libraries, no image assets. Tuning knobs live near the top of the JS: `baseSpeed` (ball speed at level 1), `SPEED_CAP` (max speed), and per-row brick colors in `ROWCOLORS` (top→bottom; these mirror the --c1..--c6 CSS tokens). Level layouts come from `cellOn()` (patterns: 0 solid, 1 checker, 2 diamond, 3 pyramid, 4 frame — cycled by level); `buildLevel()` controls columns, rows, and which top rows are 2-hit bricks. Paddle width auto-scales with the board (clamped in `layoutPaddle`); paddle reflection angle is governed by `maxBounce` in `ballPaddle()`. The stage is a CSS aspect-ratio box, so the canvas is fully responsive and DPR-aware; recolor the chrome (HUD, overlays, glow) via the --c1..--c6 and --bg tokens. Particle counts and screen shake auto-reduce under prefers-reduced-motion. High score uses window.moldableState('prism-breaker:v1').",
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#07060f',
  },
}
