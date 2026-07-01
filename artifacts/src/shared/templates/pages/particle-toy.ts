import type { Template } from '../types'

// A full-viewport interactive PARTICLE PLAYGROUND on a plain 2D <canvas> — no
// libraries. Thousands of particles advect along a hand-rolled flow field
// (layered sines + a hashed value-noise gradient), leaving soft fading trails
// drawn with additive 'lighter' compositing. The cursor warps the field and
// gently swirls particles toward it; clicking emits a radial burst. Colors cycle
// through curated gradient palettes by particle age. A minimal glass overlay
// carries the title, a one-line hint, and a Palette button. DPR-aware, resize-
// safe, particle-count capped for perf, and honors prefers-reduced-motion.

const CSS = `
:root {
  --ink: #f3f1ff;
  --mut: rgba(220,216,240,0.66);
  --glass: rgba(10,9,20,0.40);
  --line: rgba(255,255,255,0.12);
  --accent: #7df9ff;
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: #04040a; color: var(--ink); overflow: hidden; }

/* the playground canvas fills the viewport behind everything */
#field {
  position: fixed; inset: 0; z-index: 0;
  display: block; width: 100vw; height: 100vh;
  touch-action: none; cursor: crosshair;
  background:
    radial-gradient(120% 95% at 50% 30%, rgba(125,249,255,0.11), transparent 62%),
    radial-gradient(90% 80% at 82% 88%, rgba(255,92,200,0.09), transparent 66%),
    radial-gradient(80% 70% at 18% 78%, rgba(125,107,255,0.08), transparent 64%),
    #04040a;
}
/* vignette so the field sinks into deep space at the edges (kept light so the
   additive particle glow isn't crushed near the corners) */
.veil {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(140% 115% at 50% 44%, transparent 62%, rgba(4,4,10,0.42) 88%, rgba(3,3,8,0.7) 100%);
  mix-blend-mode: multiply;
}

/* ===== overlay layer (everything but the canvas ignores pointer) ===== */
.stage {
  position: relative; z-index: 2;
  min-height: 100vh;
  display: flex; flex-direction: column;
  pointer-events: none;
}
.stage button, .stage a { pointer-events: auto; }

/* top bar */
.top {
  display: flex; align-items: center; justify-content: space-between;
  padding: clamp(18px, 3.2vw, 36px) clamp(18px, 4vw, 54px);
  gap: 16px;
}
.mark {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--display); font-weight: 600; letter-spacing: -0.01em;
  font-size: clamp(15px, 1.5vw, 18px);
}
.glyph {
  width: 28px; height: 28px; border-radius: 9px; flex: none; position: relative;
  background: conic-gradient(from 200deg, #7df9ff, #b06bff, #ff5cc8, #7df9ff);
  box-shadow: 0 0 22px -4px var(--accent), inset 0 0 10px rgba(255,255,255,0.4);
  animation: spin 9s linear infinite;
}
.glyph::after { content: ''; position: absolute; inset: 7px; border-radius: 5px; background: #06050d; }
@keyframes spin { to { transform: rotate(360deg); } }
.pill {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: var(--mut);
  padding: 8px 13px; border-radius: 999px;
  background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
.pill .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 10px var(--accent);
}

/* hero block, bottom-left */
.hero {
  margin-top: auto;
  padding: 0 clamp(18px, 4vw, 58px) clamp(28px, 5vw, 64px);
  max-width: 760px;
}
.glass {
  display: inline-flex; flex-direction: column; gap: clamp(14px, 1.8vw, 20px);
  padding: clamp(20px, 2.8vw, 34px) clamp(22px, 3.2vw, 40px);
  border-radius: 24px;
  background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 30px 80px -42px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08);
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 11px;
  font-size: clamp(10.5px, 1.05vw, 12px); font-weight: 600;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--accent);
}
.eyebrow::before { content: ''; width: 26px; height: 1px; background: linear-gradient(90deg, var(--accent), transparent); }
.title {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(38px, 7.6vw, 92px); line-height: 0.94; letter-spacing: -0.035em;
  margin: 0; text-wrap: balance;
}
.title .grad {
  background: linear-gradient(106deg, #7df9ff 6%, #b06bff 52%, #ff5cc8 96%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hint {
  font-size: clamp(14px, 1.5vw, 17px); line-height: 1.5; color: var(--mut);
  max-width: 42ch; margin: 0; font-weight: 400;
}
.hint b { color: var(--ink); font-weight: 600; }

/* controls */
.controls { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 12px 18px; border-radius: 999px; border: 1px solid var(--line);
  font-family: var(--body); font-size: 13.5px; font-weight: 600; letter-spacing: 0.01em;
  color: var(--ink); cursor: pointer;
  background: rgba(255,255,255,0.05);
  transition: transform .3s cubic-bezier(.16,1,.3,1), background .3s ease, border-color .3s ease;
}
.btn:hover { transform: translateY(-2px); background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.24); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn .swatch {
  display: inline-flex; gap: 3px; align-items: center;
}
.btn .swatch i { width: 9px; height: 9px; border-radius: 50%; display: block; }
.btn.primary {
  color: #06050d; border-color: transparent;
  background: linear-gradient(106deg, var(--accent), #b06bff);
  box-shadow: 0 14px 32px -14px var(--accent);
}
.btn.primary:hover { background: linear-gradient(106deg, #9bfbff, #c089ff); }
.kbd {
  font-family: var(--body); font-size: 11px; font-weight: 600; color: var(--mut);
  padding: 3px 7px; border-radius: 6px; border: 1px solid var(--line);
  background: rgba(255,255,255,0.04);
}

/* corner palette readout */
.readout {
  margin-left: auto; align-self: flex-end;
  display: inline-flex; align-items: center; gap: 10px;
  padding: 9px 14px; border-radius: 999px;
  background: var(--glass); border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  font-size: 11.5px; letter-spacing: 0.04em; color: var(--mut);
  font-variant-numeric: tabular-nums;
}
.readout #pname { color: var(--ink); font-weight: 600; }

@media (max-width: 820px) {
  .pill { display: none; }
  .glass { display: flex; width: 100%; max-width: 100%; min-width: 0;
    padding: clamp(18px, 5vw, 26px); border-radius: 22px; }
  .hint { max-width: 100%; min-width: 0; }
  .readout { display: none; }
  #field { cursor: default; }
}
@media (max-width: 480px) {
  .controls .kbd { display: none; }
}
`.trim()

const HTML = `
<canvas id="field"></canvas>
<div class="veil" aria-hidden="true"></div>

<div class="stage">
  <header class="top">
    <span class="mark"><span class="glyph"></span> FLUX / Playground</span>
    <span class="pill"><span class="dot"></span> live · canvas 2d</span>
  </header>

  <section class="hero">
    <div class="glass">
      <span class="eyebrow">Flow field · Real-time · No libraries</span>
      <h1 class="title">Particle<br><span class="grad">Playground.</span></h1>
      <p class="hint"><b>Move</b> to stir the current · <b>Click</b> to burst a flare of light. Thousands of points drift along a living flow field, painted with additive glow.</p>
      <div class="controls">
        <button class="btn primary" id="palBtn" type="button" aria-label="Cycle color palette">
          <span class="swatch" id="palSwatch" aria-hidden="true"></span>
          Palette
        </button>
        <button class="btn" id="burstBtn" type="button">Burst</button>
        <span class="kbd">P</span><span class="kbd" style="margin-left:-6px">space</span>
      </div>
    </div>
  </section>

  <footer class="top readout-wrap" style="padding-top:0;">
    <span class="readout">scheme <span id="pname">Aurora</span> · <span id="pcount">0</span> pts</span>
  </footer>
</div>
`.trim()

// page.js — string concatenation only, NO template literals, so the TS module
// always compiles. Pure 2D canvas; the flow field + noise are hand-rolled.
const JS = `
(function () {
  var canvas = document.getElementById('field');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- curated palettes (stops sampled by particle age 0..1) ----------
  var PALETTES = [
    { name: 'Aurora',  trail: 'rgba(4,4,10,0.040)',  stops: ['#0a4d68','#39d0c8','#7df9ff','#caffff'] },
    { name: 'Ember',   trail: 'rgba(10,4,4,0.042)',  stops: ['#3a0d2a','#b3145e','#ff5c4d','#ffd479'] },
    { name: 'Iris',    trail: 'rgba(6,4,14,0.038)',  stops: ['#241a6e','#7b3ff2','#c44dff','#ff8ce0'] },
    { name: 'Spectra', trail: 'rgba(3,6,12,0.040)',  stops: ['#0846a8','#27c4d6','#9be15d','#fff07a'] }
  ];
  var palIndex = 0;

  // pre-parse palette stops into rgb arrays and build a fast 256-entry LUT
  function hexToRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  var LUT = [];   // current palette LUT: 256 'r,g,b' strings
  function buildLUT() {
    var stops = PALETTES[palIndex].stops.map(hexToRgb);
    var seg = stops.length - 1;
    LUT = [];
    for (var i = 0; i < 256; i++) {
      var t = i / 255 * seg;
      var k = Math.min(Math.floor(t), seg - 1);
      var f = t - k;
      var a = stops[k], b = stops[k + 1];
      var r = Math.round(a[0] + (b[0] - a[0]) * f);
      var g = Math.round(a[1] + (b[1] - a[1]) * f);
      var bl = Math.round(a[2] + (b[2] - a[2]) * f);
      LUT.push(r + ',' + g + ',' + bl);
    }
  }
  buildLUT();

  // ---------- hand-rolled value noise (hashed lattice, smooth interpolation) ----------
  function hash2(ix, iy) {
    var n = ix * 374761393 + iy * 668265263;       // two large primes
    n = (n ^ (n >> 13)) * 1274126177;
    n = (n ^ (n >> 16)) >>> 0;
    return n / 4294967295;                          // 0..1
  }
  function smooth(t) { return t * t * (3 - 2 * t); } // smoothstep
  function valNoise(x, y) {
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = smooth(fx), uy = smooth(fy);
    var a = hash2(ix, iy);
    var b = hash2(ix + 1, iy);
    var c = hash2(ix, iy + 1);
    var d = hash2(ix + 1, iy + 1);
    var top = a + (b - a) * ux;
    var bot = c + (d - c) * ux;
    return top + (bot - top) * uy;                  // 0..1
  }

  // ---------- flow field: noise angle + layered sines, warped by the cursor ----------
  var NSCALE = 0.0016;     // spatial frequency of the base noise
  var TWO_PI = Math.PI * 2;
  var time = 0;
  function fieldAngle(x, y) {
    // base swirling angle from drifting value noise (two octaves)
    var n = valNoise(x * NSCALE + time * 0.05, y * NSCALE - time * 0.04);
    n += valNoise(x * NSCALE * 2.3 - time * 0.03, y * NSCALE * 2.3 + time * 0.06) * 0.5;
    var ang = n * TWO_PI * 1.8;
    // a gentle large-scale sine roll so the whole field breathes
    ang += Math.sin((x + y) * 0.0011 + time * 0.2) * 0.6;
    return ang;
  }

  // ---------- particle pool ----------
  var W = 0, H = 0, DPR = 1;
  var COUNT = 0;
  var px, py, vx, vy, age, life;   // typed arrays, allocated on (re)size
  var seedAge = false;             // spread initial ages on first fill (cold-frame color)
  var pointer = { x: -9999, y: -9999, active: false, vx: 0, vy: 0, lx: 0, ly: 0 };

  function targetCount() {
    var area = W * H;                                 // CSS px area
    var n = Math.round(area / 520);                   // density
    return Math.max(1400, Math.min(reduce ? 3600 : 9000, n));
  }

  function spawn(i, fromBurst, bx, by, bang, bspd) {
    if (fromBurst) {
      px[i] = bx; py[i] = by;
      vx[i] = Math.cos(bang) * bspd;
      vy[i] = Math.sin(bang) * bspd;
      age[i] = 0; life[i] = 40 + Math.random() * 70;
    } else {
      px[i] = Math.random() * W;
      py[i] = Math.random() * H;
      vx[i] = 0; vy[i] = 0;
      life[i] = 120 + Math.random() * 220;
      // seedAge spreads ages across the lifetime so the very first cold frame
      // already shows the full color ramp (not just the dark young end)
      age[i] = seedAge ? Math.random() * life[i] : Math.random() * 0.6;
    }
  }

  function allocate() {
    COUNT = targetCount();
    px = new Float32Array(COUNT); py = new Float32Array(COUNT);
    vx = new Float32Array(COUNT); vy = new Float32Array(COUNT);
    age = new Float32Array(COUNT); life = new Float32Array(COUNT);
    seedAge = true;
    for (var i = 0; i < COUNT; i++) spawn(i, false);
    seedAge = false;
    var pc = document.getElementById('pcount');
    if (pc) pc.textContent = COUNT.toLocaleString();
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // paint the base so the first trail frame isn't transparent
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, W, H);
    allocate();
  }

  // ---------- burst on click / tap ----------
  var burstQueue = [];
  function queueBurst(x, y) { burstQueue.push({ x: x, y: y }); }
  function emitBursts() {
    if (!burstQueue.length) return;
    var b = burstQueue.shift();
    var n = Math.min(reduce ? 80 : 220, Math.floor(COUNT * 0.06));
    // recycle the oldest-feeling particles for the burst
    var start = (burstStart % COUNT);
    for (var j = 0; j < n; j++) {
      var i = (start + j) % COUNT;
      var ang = Math.random() * TWO_PI;
      var spd = 2.4 + Math.random() * 5.5;
      spawn(i, true, b.x, b.y, ang, spd);
    }
    burstStart = (start + n) % COUNT;
  }
  var burstStart = 0;

  // ---------- pointer ----------
  function setPointer(x, y) {
    pointer.vx = x - pointer.lx;
    pointer.vy = y - pointer.ly;
    pointer.lx = x; pointer.ly = y;
    pointer.x = x; pointer.y = y; pointer.active = true;
  }
  canvas.addEventListener('pointermove', function (e) { setPointer(e.clientX, e.clientY); });
  canvas.addEventListener('pointerleave', function () { pointer.active = false; pointer.x = -9999; pointer.y = -9999; });
  canvas.addEventListener('pointerdown', function (e) {
    setPointer(e.clientX, e.clientY);
    queueBurst(e.clientX, e.clientY);
  });

  // ---------- palette UI ----------
  function renderSwatch() {
    var el = document.getElementById('palSwatch');
    if (!el) return;
    var stops = PALETTES[palIndex].stops;
    var html = '';
    for (var s = 0; s < stops.length; s++) html += '<i style="background:' + stops[s] + '"></i>';
    el.innerHTML = html;
    var pn = document.getElementById('pname');
    if (pn) pn.textContent = PALETTES[palIndex].name;
  }
  function cyclePalette() {
    palIndex = (palIndex + 1) % PALETTES.length;
    buildLUT();
    buildSprites();
    renderSwatch();
  }
  renderSwatch();

  var palBtn = document.getElementById('palBtn');
  if (palBtn) palBtn.addEventListener('click', cyclePalette);
  var burstBtn = document.getElementById('burstBtn');
  if (burstBtn) burstBtn.addEventListener('click', function () {
    // burst from a lively spot near the center if no pointer
    var cx = pointer.active ? pointer.x : W * (0.4 + Math.random() * 0.2);
    var cy = pointer.active ? pointer.y : H * (0.4 + Math.random() * 0.2);
    queueBurst(cx, cy);
  });
  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    var k = e.key.toLowerCase();
    if (k === 'p') { cyclePalette(); }
    else if (k === ' ' || k === 'spacebar') {
      e.preventDefault();
      var cx = pointer.active ? pointer.x : W * 0.5;
      var cy = pointer.active ? pointer.y : H * 0.5;
      queueBurst(cx, cy);
    }
  });

  // ---------- animation knobs ----------
  var SPEED = reduce ? 0.55 : 1.0;
  var STR = 0.22;          // how strongly particles steer toward the field angle
  var DRAG = 0.955;        // velocity damping
  var ATTRACT = 0.9;       // cursor pull strength
  var SWIRL = 0.7;         // tangential swirl around the cursor

  // ---------- soft glowing sprites, pre-tinted per palette-age bucket ----------
  // Drawing a radial-gradient sprite per particle gives real additive glow.
  // We bake one sprite per BUCKET color sampled from the current palette LUT so
  // the points keep their per-age color without per-frame gradient cost.
  var SPR = 32;            // sprite size in px
  var BUCKETS = 24;        // color resolution along the age ramp
  var SPRITES = [];        // BUCKETS small canvases
  function buildSprites() {
    SPRITES = [];
    for (var bI = 0; bI < BUCKETS; bI++) {
      var ci = Math.min(255, Math.round(bI / (BUCKETS - 1) * 255));
      var rgb = LUT[ci];
      var cv = document.createElement('canvas');
      cv.width = SPR; cv.height = SPR;
      var c = cv.getContext('2d');
      var g = c.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
      g.addColorStop(0, 'rgba(' + rgb + ',1)');
      g.addColorStop(0.22, 'rgba(' + rgb + ',0.78)');
      g.addColorStop(0.55, 'rgba(' + rgb + ',0.28)');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      c.fillStyle = g;
      c.fillRect(0, 0, SPR, SPR);
      SPRITES.push(cv);
    }
  }
  buildSprites();

  // ---------- one simulation + draw step (shared by rAF and pre-warm) ----------
  function step() {
    time += (reduce ? 0.0035 : 0.008);
    emitBursts();

    // motion-blur trail: stamp a translucent dark rect instead of clearing
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = PALETTES[palIndex].trail;
    ctx.fillRect(0, 0, W, H);

    // additive glow for the particles themselves
    ctx.globalCompositeOperation = 'lighter';

    var pxr = pointer.x, pyr = pointer.y, pActive = pointer.active;
    var pspeed = Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy);

    for (var i = 0; i < COUNT; i++) {
      var x = px[i], y = py[i];

      // --- flow-field steering ---
      var ang = fieldAngle(x, y);
      var fx = Math.cos(ang), fy = Math.sin(ang);
      vx[i] += fx * STR; vy[i] += fy * STR;

      // --- cursor influence: attract + swirl, falls off with distance ---
      if (pActive) {
        var dx = pxr - x, dy = pyr - y;
        var d2 = dx * dx + dy * dy;
        var R = 180;
        if (d2 < R * R) {
          var d = Math.sqrt(d2) || 1;
          var falloff = 1 - d / R;
          var nx = dx / d, ny = dy / d;
          // pull toward the pointer
          vx[i] += nx * ATTRACT * falloff;
          vy[i] += ny * ATTRACT * falloff;
          // tangential swirl (perpendicular), scaled by pointer motion
          var sw = SWIRL * falloff * (1 + Math.min(pspeed * 0.08, 2.2));
          vx[i] += -ny * sw;
          vy[i] += nx * sw;
        }
      }

      vx[i] *= DRAG; vy[i] *= DRAG;

      // clamp speed so flares stay graceful
      var sp = vx[i] * vx[i] + vy[i] * vy[i];
      var MAX = 7.5;
      if (sp > MAX * MAX) {
        var inv = MAX / Math.sqrt(sp);
        vx[i] *= inv; vy[i] *= inv;
      }

      x += vx[i] * SPEED;
      y += vy[i] * SPEED;

      // --- age + respawn ---
      age[i] += 1;
      var dead = age[i] > life[i] || x < -40 || x > W + 40 || y < -40 || y > H + 40;
      if (dead) { spawn(i, false); x = px[i]; y = py[i]; }

      px[i] = x; py[i] = y;

      // --- draw: color by age, brightness fades in/out over the lifetime ---
      var a01 = age[i] / life[i];                  // 0..1 lifetime progress
      // alpha envelope: rise quickly, hold, fade out
      var env = a01 < 0.15 ? a01 / 0.15 : (a01 > 0.7 ? (1 - a01) / 0.3 : 1);
      var alpha = 0.95 * env;
      if (alpha <= 0.01) continue;

      // pick the pre-tinted glow sprite for this particle's age color
      var bi = (a01 * (BUCKETS - 1)) | 0; if (bi > BUCKETS - 1) bi = BUCKETS - 1; if (bi < 0) bi = 0;
      var speedMag = Math.sqrt(sp);
      // soft radial sprite; a touch larger when moving fast for streaky flares
      var size = 3.6 + Math.min(speedMag * 0.6, 6.0);
      ctx.globalAlpha = alpha;
      ctx.drawImage(SPRITES[bi], x - size * 0.5, y - size * 0.5, size, size);
    }
    ctx.globalAlpha = 1;

    // decay pointer velocity each frame so swirl relaxes when still
    pointer.vx *= 0.82; pointer.vy *= 0.82;
  }

  // pre-warm: silently advance the sim so trails are already built up on the
  // very first painted frame (so stills / thumbnails show the full field).
  function prewarm(frames) {
    for (var f = 0; f < frames; f++) step();
  }

  function frame() {
    step();
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  prewarm(reduce ? 110 : 240);
  requestAnimationFrame(frame);
})();
`.trim()

export const particleToy: Template = {
  id: 'particle-toy',
  kind: 'page',
  name: 'Particle Playground',
  tagline: 'An interactive flow-field particle canvas',
  categories: ['3D'],
  audiences: ['creative', 'interactive', 'design'],
  description:
    'A mesmerizing, full-viewport particle playground on a plain 2D canvas — thousands of points drift along a hand-rolled flow field (layered drifting value-noise plus a breathing sine roll), leaving soft fading trails painted with additive glow. The cursor warps the current and swirls particles toward it; clicking emits a radial flare. Four curated gradient palettes (Aurora, Ember, Iris, Spectra) cycle on a button, P, or the swatch. DPR-aware, resize-safe, particle-count capped for smooth performance, and calmer under prefers-reduced-motion. No libraries, no image assets.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#04040a',
  notes:
    'Everything lives in page.js on a single 2D <canvas> (id "field") — no libraries, no images. Tune the FEEL through the knobs near the top of the loop: STR (how hard particles steer into the flow field), DRAG (velocity damping), ATTRACT / SWIRL (cursor pull + tangential spin), SPEED (global pace), and the speed clamp MAX. Field character is set by NSCALE (noise frequency — smaller = larger, lazier swirls) and the octave mix inside fieldAngle(); the cursor influence radius is the local var R (=180). Density is COUNT, derived in targetCount() from viewport area and capped for perf (raise the cap for denser fields on strong machines). Trail length = the alpha of the per-palette "trail" rgba (more opaque = shorter trails). COLORS: edit the PALETTES array — each scheme is a name, a trail color, and 4 hex "stops" sampled by particle age into a 256-entry LUT; add or reorder schemes freely and the Palette button cycles them. Keep the canvas background near-black so the additive "lighter" compositing glows. Motion is gentler and auto-churn is reduced under prefers-reduced-motion (lower SPEED, smaller bursts).',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#04040a',
  },
}
