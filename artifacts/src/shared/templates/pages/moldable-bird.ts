import type { Template } from '../types'

// MoldableBird — a fully playable, polished Flappy-Bird-style game on a single
// full-viewport <canvas>. Everything is hand-drawn with canvas primitives: a
// stylized bird (body, flapping wing, eye, beak), rounded gradient pipes with
// caps, a subtly shifting gradient sky, parallax hills + clouds, flap particle
// puffs, a death screen-shake, and a scrolling ground stripe. Dark, vibrant,
// fun. State + loop live entirely in page.js (string concatenation, no inner
// template literals, so the TS compiles). No <img> assets.

const CSS = `
:root {
  --display: 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --ink: #f3f5ff;
  --c-accent: #ffd166;
  --c-accent-2: #4cc9f0;
}
html, body { height: 100%; }
body {
  margin: 0; overflow: hidden;
  background: #0a0a14;
  color: var(--ink);
  font-family: var(--body);
  overscroll-behavior: none; touch-action: none;
}

/* Full-viewport game stage */
.stage {
  position: fixed; inset: 0;
  display: block;
  width: 100vw; height: 100vh;
  height: 100dvh;
  overflow: hidden;
}
#game {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  display: block;
  cursor: pointer; outline: none;
  /* a soft vignette baked in via canvas; this just keeps crisp edges */
  image-rendering: optimizeQuality;
}

/* Brand mark, top-left — quiet, always present */
.brand {
  position: absolute; top: clamp(14px, 3vw, 26px); left: clamp(14px, 3vw, 28px);
  z-index: 4; pointer-events: none;
  display: flex; align-items: center; gap: 10px;
  font-family: var(--display); font-weight: 600;
  font-size: clamp(14px, 2.2vw, 18px); letter-spacing: -0.01em;
  color: rgba(243,245,255,0.9);
  text-shadow: 0 2px 14px rgba(0,0,0,0.45);
}
.brand .mark {
  width: 26px; height: 26px; border-radius: 8px;
  background: linear-gradient(135deg, var(--c-accent), #ff8e3c 65%, #ff5d8f);
  box-shadow: 0 6px 20px -6px rgba(255,142,60,0.7), inset 0 0 0 1px rgba(255,255,255,0.25);
  position: relative;
}
.brand .mark::after {
  content: ''; position: absolute; right: 5px; top: 9px;
  width: 5px; height: 5px; border-radius: 50%;
  background: #1a1320; box-shadow: 0 0 0 2px rgba(255,255,255,0.85);
}

/* Instruction line, bottom-center — fades while playing */
.hint {
  position: absolute; left: 50%; bottom: clamp(16px, 4vh, 34px);
  transform: translateX(-50%);
  z-index: 4; pointer-events: none;
  font-size: clamp(12px, 1.8vw, 14px); font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(243,245,255,0.74);
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center;
  transition: opacity 0.5s ease;
  text-align: center; padding: 0 16px;
}
.hint.dim { opacity: 0; }
.hint .kbd {
  font-family: var(--display); font-weight: 600;
  font-size: 0.92em; letter-spacing: 0.02em;
  padding: 3px 9px; border-radius: 7px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.25);
  color: var(--ink);
}
.hint .sep { opacity: 0.4; }

/* The canvas already renders score / overlays for pixel-perfect motion,
   but we keep a tiny accessible live region for the current score. */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (max-width: 820px) {
  .hint .desktop-only { display: none; }
}
`.trim()

const HTML = `
<div class="stage">
  <canvas id="game" aria-label="MoldableBird — a flappy-style game. Tap, click, or press space to flap."></canvas>
  <div class="brand"><span class="mark"></span> MoldableBird</div>
  <p class="hint" id="hint">
    <span><span class="kbd">Tap</span> / <span class="kbd">Click</span> to flap</span>
    <span class="sep desktop-only">·</span>
    <span class="desktop-only"><span class="kbd">Space</span> or <span class="kbd">↑</span> also work</span>
  </p>
  <div class="sr-only" id="srscore" aria-live="polite">Score 0</div>
</div>
`.trim()

const JS = `
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  // Make the canvas keyboard-focusable so Space / ArrowUp work (esp. when the
  // game is embedded in a preview iframe — a click focuses it; the published
  // page is focused on load).
  canvas.tabIndex = 0;
  var hintEl = document.getElementById('hint');
  var srScore = document.getElementById('srscore');

  // ---- sizing / devicePixelRatio ------------------------------------------
  var W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
  }

  // Layout values derived from current size (so it stays playable on phones).
  var GROUND_H, BIRD_X, BIRD_R, GAP, PIPE_W, gravity, flapV, baseSpeed;
  function layout() {
    GROUND_H = Math.max(64, Math.min(H * 0.14, 120));
    BIRD_X = Math.max(70, W * 0.26);
    BIRD_R = Math.max(13, Math.min(W, H) * 0.028);
    PIPE_W = Math.max(58, Math.min(W * 0.13, 92));
    GAP = Math.max(BIRD_R * 6.6, Math.min(H * 0.34, 250));
    // Physics scale with the playfield height so the FEEL is identical on any
    // screen. A flap gives a long, floaty arc (~0.25s to apex); gravity is gentle
    // so the bird is easy to control — classic forgiving flappy feel.
    gravity = H * 0.00052;
    flapV = -H * 0.0072;
    baseSpeed = Math.max(W * 0.0030, 2.1);
  }

  // ---- state ---------------------------------------------------------------
  var STATE_START = 0, STATE_PLAY = 1, STATE_DEAD = 2;
  var state = STATE_START;

  var bird = { y: 0, vy: 0, rot: 0, wing: 0 };
  var pipes = [];          // { x, gapY, scored }
  var particles = [];      // flap puffs + death burst
  var clouds = [];         // parallax background clouds
  var score = 0;
  var bestStore = window.moldableState('moldable-bird:v1');
  var best = 0;
  bestStore.get({ best: 0 }).then(function (saved) {
    best = Number(saved && saved.best) || 0;
  }, function () {});
  var spawnTimer = 0;
  var shake = 0;           // screen-shake magnitude (death)
  var flashAlpha = 0;      // white impact flash
  var skyPhase = 0;        // slow hue/gradient drift
  var groundScroll = 0;     // ground stripes — wraps at the 48px stripe period
  var worldX = 0;           // continuous world distance — drives hill parallax
  var deadAt = 0;          // timestamp of death (for overlay fade-in)
  var startedOnce = false;

  function saveBest() {
    bestStore.set({ best: best }).catch(function () {});
  }

  // Difficulty curve: gap narrows + speed rises gently with score, then plateaus.
  function curGap() { return Math.max(GAP * 0.62, GAP - score * (GAP * 0.012)); }
  function curSpeed() { return baseSpeed + Math.min(score * (baseSpeed * 0.028), baseSpeed * 1.25); }
  function pipeInterval() { return Math.max(PIPE_W * 3.1, (PIPE_W * 4.4) - score * 1.4); }

  // ---- init / reset --------------------------------------------------------
  function seedClouds() {
    clouds = [];
    var n = 7;
    for (var i = 0; i < n; i++) {
      clouds.push({
        x: Math.random() * (W + 200) - 100,
        y: (H * 0.12) + Math.random() * (H * 0.42),
        s: 0.5 + Math.random() * 1.1,
        spd: 0.08 + Math.random() * 0.16
      });
    }
  }

  function reset() {
    bird.y = H * 0.42; bird.vy = 0; bird.rot = 0; bird.wing = 0;
    pipes = [];
    particles = [];
    score = 0;
    spawnTimer = 0;
    shake = 0; flashAlpha = 0;
    if (srScore) srScore.textContent = 'Score 0';
  }

  function start() {
    reset();
    state = STATE_PLAY;
    startedOnce = true;
    bird.vy = flapV * 0.85;
    flap(true);
    setHintDim(true);
  }

  function die() {
    if (state !== STATE_PLAY) return;
    state = STATE_DEAD;
    deadAt = performance.now();
    shake = 16;
    flashAlpha = 0.55;
    if (score > best) { best = score; saveBest(); }
    burst(BIRD_X, bird.y, 26);
    setHintDim(false);
  }

  function setHintDim(dim) {
    if (!hintEl) return;
    if (dim) hintEl.classList.add('dim'); else hintEl.classList.remove('dim');
  }

  // ---- input ---------------------------------------------------------------
  function flap(silent) {
    if (state === STATE_START) { start(); return; }
    if (state === STATE_DEAD) {
      // Small grace period so the death tap doesn't instantly retry.
      if (performance.now() - deadAt > 280) start();
      return;
    }
    bird.vy = flapV;
    bird.wing = 1;            // wing-up, eased back down in update
    if (!silent) puff(BIRD_X - BIRD_R * 0.7, bird.y + BIRD_R * 0.5);
  }

  function onKey(e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'Up') {
      e.preventDefault();
      flap(false);
    }
  }
  function focusGame() {
    try { canvas.focus({ preventScroll: true }); } catch (e) { try { canvas.focus(); } catch (e2) {} }
  }
  function onPointer(e) {
    if (e.cancelable) e.preventDefault();
    focusGame();
    flap(false);
  }

  window.addEventListener('keydown', onKey, { passive: false });
  canvas.addEventListener('pointerdown', onPointer, { passive: false });
  // Prevent the page from scrolling / zooming on touch.
  canvas.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
  window.addEventListener('contextmenu', function (e) { if (state !== STATE_START) e.preventDefault(); });

  // ---- particles -----------------------------------------------------------
  function puff(x, y) {
    var n = 5 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var a = Math.PI * (0.6 + Math.random() * 0.8); // back-and-down
      var sp = 0.6 + Math.random() * 1.6;
      particles.push({
        x: x, y: y,
        vx: -Math.cos(a) * sp - 0.6,
        vy: Math.sin(a) * sp * 0.5,
        r: 3 + Math.random() * 4,
        life: 1, decay: 0.03 + Math.random() * 0.02,
        kind: 'puff'
      });
    }
  }
  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      var sp = 1.5 + Math.random() * 4;
      particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 2.5 + Math.random() * 4,
        life: 1, decay: 0.018 + Math.random() * 0.02,
        kind: 'spark'
      });
    }
  }
  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.kind === 'spark') { p.vy += 0.16; p.vx *= 0.98; }
      else { p.vy += 0.02; p.vx *= 0.96; p.r *= 1.012; }
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ---- spawn / world -------------------------------------------------------
  function spawnPipe() {
    var margin = GROUND_H + 24;
    var top = 40 + Math.random() * (H - margin - 40 - curGap());
    pipes.push({ x: W + PIPE_W, gapY: top, scored: false });
  }

  // ---- update --------------------------------------------------------------
  function update() {
    skyPhase += 0.0016;
    var adv = (state === STATE_PLAY ? curSpeed() : baseSpeed * 0.35);
    groundScroll = (groundScroll + adv) % 48;
    worldX += adv; // never wrapped here — drawHillBand wraps per-band by its wave period

    // clouds drift always (alive even on start screen for life)
    for (var c = 0; c < clouds.length; c++) {
      var cl = clouds[c];
      cl.x -= cl.spd * (state === STATE_PLAY ? curSpeed() * 0.4 : 0.6);
      if (cl.x < -140 * cl.s) { cl.x = W + 80 + Math.random() * 120; cl.y = (H * 0.12) + Math.random() * (H * 0.42); }
    }

    if (state === STATE_START) {
      // gentle bob on the start screen
      bird.y = H * 0.42 + Math.sin(performance.now() * 0.003) * (BIRD_R * 0.7);
      bird.rot = Math.sin(performance.now() * 0.003) * 0.08;
      bird.wing = (Math.sin(performance.now() * 0.012) * 0.5 + 0.5);
    } else if (state === STATE_PLAY) {
      bird.vy += gravity;
      bird.y += bird.vy;
      // rotate toward velocity for that satisfying dive/climb tilt
      var target = Math.max(-0.5, Math.min(1.1, bird.vy * 0.06));
      bird.rot += (target - bird.rot) * 0.18;
      bird.wing += (0 - bird.wing) * 0.15; // ease wing back to rest

      // spawn pipes on a spacing timer
      spawnTimer -= curSpeed();
      if (spawnTimer <= 0) { spawnPipe(); spawnTimer = pipeInterval(); }

      // move + score + cull pipes
      for (var i = pipes.length - 1; i >= 0; i--) {
        var p = pipes[i];
        p.x -= curSpeed();
        if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
          p.scored = true; score++;
          if (srScore) srScore.textContent = 'Score ' + score;
          puff(BIRD_X, bird.y); // tiny celebratory wisp
        }
        if (p.x + PIPE_W < -10) pipes.splice(i, 1);
      }

      checkCollisions();
    } else if (state === STATE_DEAD) {
      // bird falls and rests on the ground
      bird.vy += gravity;
      bird.y += bird.vy;
      bird.rot += (1.4 - bird.rot) * 0.12;
      var floor = H - GROUND_H - BIRD_R;
      if (bird.y > floor) { bird.y = floor; bird.vy = 0; }
    }

    if (shake > 0) shake *= 0.86;
    if (shake < 0.3) shake = 0;
    if (flashAlpha > 0) flashAlpha -= 0.04;

    updateParticles();
  }

  function checkCollisions() {
    // ground / ceiling
    if (bird.y + BIRD_R >= H - GROUND_H) { bird.y = H - GROUND_H - BIRD_R; die(); return; }
    if (bird.y - BIRD_R <= 0) { bird.y = BIRD_R; bird.vy = 0; }

    var gap = curGap();
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      if (BIRD_X + BIRD_R * 0.78 < p.x || BIRD_X - BIRD_R * 0.78 > p.x + PIPE_W) continue;
      // within the pipe column horizontally — check the gap
      if (bird.y - BIRD_R * 0.82 < p.gapY || bird.y + BIRD_R * 0.82 > p.gapY + gap) {
        die(); return;
      }
    }
  }

  // ---- drawing helpers -----------------------------------------------------
  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawSky() {
    // a deep, vibrant gradient that slowly shifts between two cool night palettes
    var t = (Math.sin(skyPhase) * 0.5 + 0.5);
    var topR = Math.round(18 + t * 14), topG = Math.round(14 + t * 10), topB = Math.round(40 + t * 26);
    var midR = Math.round(58 + t * 40), midG = Math.round(34 + t * 26), midB = Math.round(96 + t * 30);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgb(' + topR + ',' + topG + ',' + topB + ')');
    g.addColorStop(0.52, 'rgb(' + midR + ',' + midG + ',' + midB + ')');
    g.addColorStop(1, 'rgb(' + Math.round(150 + t * 30) + ',' + Math.round(78 + t * 24) + ',' + Math.round(120 + t * 20) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // a soft glow "moon" high-right
    var mx = W * 0.82, my = H * 0.2, mr = Math.max(40, Math.min(W, H) * 0.09);
    var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.4);
    mg.addColorStop(0, 'rgba(255,236,200,0.85)');
    mg.addColorStop(0.18, 'rgba(255,224,170,0.42)');
    mg.addColorStop(1, 'rgba(255,224,170,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr * 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,222,0.95)';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  function drawClouds() {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var s = c.s;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.globalAlpha = 0.14 + s * 0.07;
      ctx.fillStyle = '#fbe7ff';
      blob(0, 0, 26 * s);
      blob(24 * s, 6 * s, 20 * s);
      blob(-22 * s, 8 * s, 18 * s);
      blob(8 * s, -10 * s, 17 * s);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function blob(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function drawHills() {
    // two parallax hill bands behind the ground
    var baseY = H - GROUND_H;
    drawHillBand(baseY + 12, H * 0.16, 'rgba(40,26,72,0.55)', worldX * 0.2, 0.9);
    drawHillBand(baseY + 4, H * 0.11, 'rgba(58,36,98,0.7)', worldX * 0.45, 1.3);
  }
  function drawHillBand(y, amp, color, offset, freq) {
    var k = 0.006 * freq;
    // Wrap the scroll offset by the sine wavelength: sin is unchanged by a shift
    // of 2π/k, so the band scrolls perfectly seamlessly with no snap/jitter, and
    // the value stays small (float-safe over a long run).
    offset = offset % ((2 * Math.PI) / k);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, y);
    var step = 20;
    for (var x = -step; x <= W + step; x += step) {
      var hy = y - (Math.sin((x + offset) * k) * 0.5 + 0.5) * amp;
      ctx.lineTo(x, hy);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipe(p) {
    var gap = curGap();
    var x = p.x, w = PIPE_W;
    var capH = Math.max(20, w * 0.34);
    var capOver = 7;
    var topH = p.gapY;
    var botY = p.gapY + gap;
    var botH = H - GROUND_H - botY;

    // body gradient (left-lit) — green-teal with a vibrant edge
    var bg = ctx.createLinearGradient(x, 0, x + w, 0);
    bg.addColorStop(0, '#0e8f6e');
    bg.addColorStop(0.16, '#22c98f');
    bg.addColorStop(0.5, '#13b07e');
    bg.addColorStop(0.84, '#0c7a5c');
    bg.addColorStop(1, '#075a44');

    // top pipe (hanging down)
    ctx.fillStyle = bg;
    roundRect(x, -40, w, topH + 40, 10); ctx.fill();
    // bottom pipe (rising up)
    roundRect(x, botY, w, botH + 40, 10); ctx.fill();

    // glossy highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(x + w * 0.16, -40, w * 0.13, topH + 40, 6); ctx.fill();
    roundRect(x + w * 0.16, botY, w * 0.13, botH + 40, 6); ctx.fill();

    // caps (slightly wider, rounded, brighter top edge)
    var cg = ctx.createLinearGradient(x - capOver, 0, x + w + capOver, 0);
    cg.addColorStop(0, '#17b687');
    cg.addColorStop(0.5, '#2fe0a4');
    cg.addColorStop(1, '#0c8a66');
    ctx.fillStyle = cg;
    roundRect(x - capOver, topH - capH, w + capOver * 2, capH, 9); ctx.fill();
    roundRect(x - capOver, botY, w + capOver * 2, capH, 9); ctx.fill();
    // cap top sheen
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(x - capOver + 4, topH - capH + 4, w + capOver * 2 - 8, capH * 0.3, 5); ctx.fill();
    roundRect(x - capOver + 4, botY + 4, w + capOver * 2 - 8, capH * 0.3, 5); ctx.fill();
  }

  function drawBird() {
    var r = BIRD_R;
    var wf = bird.wing; // 0 rest .. 1 wing-up
    ctx.save();
    ctx.translate(BIRD_X, bird.y);
    ctx.rotate(bird.rot);

    // ---- tail feathers (behind the body, pointing back) ----
    ctx.fillStyle = '#ef8b1e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.18);
    ctx.lineTo(-r * 1.34, -r * 0.5);
    ctx.lineTo(-r * 1.12, -r * 0.08);
    ctx.lineTo(-r * 1.4, r * 0.16);
    ctx.lineTo(-r * 1.06, r * 0.4);
    ctx.lineTo(-r * 0.6, r * 0.22);
    ctx.closePath();
    ctx.fill();

    // ---- head crest (two small feathers on top) ----
    ctx.fillStyle = '#ffb23c';
    ctx.beginPath();
    ctx.moveTo(-r * 0.02, -r * 0.92);
    ctx.lineTo(-r * 0.34, -r * 1.34);
    ctx.lineTo(-r * 0.34, -r * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -r * 0.9);
    ctx.lineTo(r * 0.06, -r * 1.4);
    ctx.lineTo(-r * 0.18, -r * 0.84);
    ctx.closePath();
    ctx.fill();

    // ---- body — round, warm gradient sphere with a soft glow ----
    ctx.shadowColor = 'rgba(255,180,70,0.45)';
    ctx.shadowBlur = 16;
    var bg = ctx.createRadialGradient(-r * 0.28, -r * 0.38, r * 0.2, 0, 0, r * 1.28);
    bg.addColorStop(0, '#ffe487');
    bg.addColorStop(0.55, '#ffc63f');
    bg.addColorStop(1, '#ff9a26');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // belly + cheek (clipped to the body so it stays clean)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#fff1c6';
    ctx.beginPath();
    ctx.ellipse(r * 0.16, r * 0.46, r * 0.78, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- wing — flaps with bird.wing ----
    ctx.save();
    ctx.translate(-r * 0.04, r * 0.04);
    ctx.rotate(-0.32 - wf * 0.95);
    var wg = ctx.createLinearGradient(0, -r * 0.7, 0, r * 0.5);
    wg.addColorStop(0, '#fff0b0');
    wg.addColorStop(1, '#ffaf38');
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.ellipse(-r * 0.14, r * 0.04, r * 0.44, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,95,0,0.22)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // ---- beak — short, two-tone, pointing forward ----
    ctx.fillStyle = '#ff8a1e';
    ctx.beginPath();
    ctx.moveTo(r * 0.72, -r * 0.2);
    ctx.lineTo(r * 1.36, -r * 0.03);
    ctx.lineTo(r * 0.8, r * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8620f';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, r * 0.04);
    ctx.lineTo(r * 1.3, r * 0.12);
    ctx.lineTo(r * 0.74, r * 0.28);
    ctx.closePath();
    ctx.fill();

    // ---- eye — big and expressive ----
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath();
    ctx.arc(r * 0.44, -r * 0.3, r * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#23202b';
    ctx.beginPath();
    ctx.arc(r * 0.53, -r * 0.3, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.47, -r * 0.38, r * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawGround() {
    var y = H - GROUND_H;
    // ground base
    var g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#3a2a52');
    g.addColorStop(1, '#241834');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, GROUND_H);
    // top accent line
    ctx.fillStyle = 'rgba(255,209,102,0.55)';
    ctx.fillRect(0, y, W, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, y + 3, W, 2);
    // scrolling diagonal stripes
    ctx.save();
    ctx.beginPath(); ctx.rect(0, y + 5, W, GROUND_H - 5); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    var sw = 24;
    for (var x = -GROUND_H - groundScroll; x < W + GROUND_H; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x + sw, y + 5);
      ctx.lineTo(x + sw - GROUND_H, H);
      ctx.lineTo(x - GROUND_H, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life) * (p.kind === 'puff' ? 0.6 : 0.9);
      if (p.kind === 'puff') ctx.fillStyle = '#ffffff';
      else ctx.fillStyle = (i % 2 === 0) ? '#ffd166' : '#ff8e3c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- HUD / overlays drawn on canvas for pixel motion ---------------------
  function setFont(px, weight) {
    ctx.font = (weight || '700') + ' ' + px + "px 'Space Grotesk', sans-serif";
  }

  function drawScore() {
    if (state !== STATE_PLAY) return;
    var px = Math.max(40, Math.min(W * 0.12, 92));
    setFont(px, '700');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var x = W / 2, y = Math.max(20, H * 0.06);
    ctx.lineWidth = Math.max(4, px * 0.08);
    ctx.strokeStyle = 'rgba(20,12,30,0.55)';
    ctx.strokeText(String(score), x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(score), x, y);
  }

  function drawStartScreen() {
    dim(0.28);
    var cx = W / 2, cy = H * 0.5;
    ctx.textAlign = 'center';

    // title
    var tp = Math.max(34, Math.min(W * 0.085, 72));
    setFont(tp, '700');
    ctx.textBaseline = 'alphabetic';
    var grad = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
    grad.addColorStop(0, '#ffd166'); grad.addColorStop(0.5, '#ff8e3c'); grad.addColorStop(1, '#ff5d8f');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255,142,60,0.45)'; ctx.shadowBlur = 24;
    ctx.fillText('MoldableBird', cx, cy - tp * 0.2);
    ctx.shadowBlur = 0;

    // subtitle
    setFont(Math.max(15, Math.min(W * 0.026, 22)), '500');
    ctx.fillStyle = 'rgba(243,245,255,0.85)';
    ctx.fillText('Tap to start', cx, cy + tp * 0.9);

    // best chip if we have one
    if (best > 0) {
      setFont(Math.max(13, Math.min(W * 0.02, 16)), '600');
      ctx.fillStyle = 'rgba(255,209,102,0.9)';
      ctx.fillText('BEST  ' + best, cx, cy + tp * 1.7);
    }
  }

  function drawDeadScreen() {
    var fade = Math.min(1, (performance.now() - deadAt) / 380);
    dim(0.46 * fade);
    var cx = W / 2, cy = H * 0.42;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    var hp = Math.max(28, Math.min(W * 0.07, 58));
    setFont(hp, '700');
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = fade;
    ctx.fillText('Game Over', cx, cy);

    // score / best card values
    var np = Math.max(22, Math.min(W * 0.045, 38));
    setFont(np, '700');
    ctx.fillStyle = '#ffd166';
    ctx.fillText(String(score), cx - Math.min(W * 0.16, 110), cy + hp * 1.6);
    var isNew = (score >= best && score > 0);
    ctx.fillStyle = isNew ? '#4cc9f0' : '#ffd166';
    ctx.fillText(String(best), cx + Math.min(W * 0.16, 110), cy + hp * 1.6);

    setFont(Math.max(11, Math.min(W * 0.018, 14)), '600');
    ctx.fillStyle = 'rgba(243,245,255,0.6)';
    ctx.fillText('SCORE', cx - Math.min(W * 0.16, 110), cy + hp * 1.6 + np * 0.85);
    ctx.fillText(isNew ? 'NEW BEST' : 'BEST', cx + Math.min(W * 0.16, 110), cy + hp * 1.6 + np * 0.85);

    setFont(Math.max(14, Math.min(W * 0.026, 20)), '600');
    ctx.fillStyle = 'rgba(243,245,255,0.9)';
    if (fade >= 1) ctx.fillText('Tap to retry', cx, cy + hp * 3.4);
    ctx.globalAlpha = 1;
  }

  function dim(a) {
    ctx.fillStyle = 'rgba(10,8,18,' + a + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette() {
    var g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- render --------------------------------------------------------------
  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // screen shake offset
    var sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
    ctx.save();
    ctx.translate(sx, sy);

    drawSky();
    drawClouds();
    drawHills();
    for (var i = 0; i < pipes.length; i++) drawPipe(pipes[i]);
    drawGround();
    drawParticles();
    drawBird();
    drawVignette();

    drawScore();
    if (state === STATE_START) drawStartScreen();
    if (state === STATE_DEAD) drawDeadScreen();

    ctx.restore();

    // impact flash (drawn over everything, no shake)
    if (flashAlpha > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0, flashAlpha) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- loop (fixed-step, requestAnimationFrame) ----------------------------
  var last = 0, acc = 0;
  var STEP = 1000 / 60;
  function frame(now) {
    if (!last) last = now;
    var dt = now - last;
    last = now;
    if (dt > 250) dt = 250; // tab-switch guard
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard < 5) { update(); acc -= STEP; guard++; }
    render();
    requestAnimationFrame(frame);
  }

  // ---- boot ----------------------------------------------------------------
  resize();
  seedClouds();
  reset();
  window.addEventListener('resize', function () { resize(); seedClouds(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { resize(); seedClouds(); }, 150); });
  // Try to grab keyboard focus on load (works on the published page; in an
  // embedded preview the first click focuses it).
  try { window.focus(); } catch (e) {}
  focusGame();
  requestAnimationFrame(frame);
})();
`.trim()

export const moldableBird: Template = {
  id: 'moldable-bird',
  kind: 'page',
  name: 'MoldableBird Game',
  tagline: 'A polished, fully playable flappy-style canvas game',
  categories: ['Games'],
  audiences: ['everyone', 'developers', 'creative'],
  description:
    'A complete, playable Flappy-Bird-style arcade game on a single full-viewport <canvas>. Flap with tap / click / Spacebar / ArrowUp to fly a hand-drawn bird (flapping wing, beak, glinting eye) through rounded gradient pipes. Features a subtly shifting gradient sky, parallax hills + drifting clouds, flap particle puffs, a death screen-shake, a scrolling ground stripe, live score, and a game-over card with a durable Moldable runtime-state best. Difficulty ramps gently as you score. 60fps requestAnimationFrame loop, devicePixelRatio-aware, fully responsive from phones to desktop. All game state lives in page.js — tweak gravity, gap, speed, the palette, or the bird drawing to make it yours.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
    ],
  },
  stageBg: '#0a0a14',
  notes:
    "Single full-viewport canvas game; all logic is in page.js (string concatenation, no template literals). Tune the feel via the layout() function: `gravity`, `flapV`, `GAP`, `PIPE_W`, `baseSpeed`. Difficulty curve lives in curGap()/curSpeed()/pipeInterval(). The bird, pipes, sky, hills, clouds, ground, particles, and HUD are all hand-drawn canvas primitives — recolor the bird body gradient in drawBird(), the pipes in drawPipe(), and the sky in drawSky(). Best score uses window.moldableState('moldable-bird:v1'). Input (flap) is bound to pointerdown + keydown(Space/ArrowUp); page scroll/zoom on touch is prevented. The canvas resizes to the window and respects devicePixelRatio.",
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0a0a14',
  },
}
