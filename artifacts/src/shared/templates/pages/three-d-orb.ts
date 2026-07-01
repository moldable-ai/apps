import type { Template } from '../types'

// A full-viewport WebGL "wow" page: a slowly rotating icosahedron wireframe
// nested inside a large additive-blended particle nebula that forms a glowing
// sphere — deep violet → cyan → magenta. Auto-rotation + subtle mouse parallax,
// a continuous rAF loop, DPR capped at 2, resize-aware, prefers-reduced-motion
// respected. A minimal glass text layer floats above the scene. Pure WebGL via a
// pinned three.js r128 UMD build (global `THREE`) — no <img> assets.

const CSS = `
:root {
  --ink: #f4f1ff;
  --mut: rgba(214,210,236,0.62);
  --c1: #b06bff;   /* violet */
  --c2: #3fe0ff;   /* cyan   */
  --c3: #ff5cc8;   /* magenta */
  --glass: rgba(12,10,24,0.34);
  --line: rgba(255,255,255,0.10);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: #05060a; color: var(--ink); overflow-x: hidden; }

/* the WebGL canvas fills the viewport behind everything */
#scene {
  position: fixed; inset: 0; z-index: 0;
  display: block; width: 100vw; height: 100vh;
  background:
    radial-gradient(120% 90% at 50% 38%, rgba(176,107,255,0.10), transparent 60%),
    radial-gradient(90% 70% at 80% 80%, rgba(63,224,255,0.07), transparent 65%),
    #05060a;
}
/* vignette + grain so the orb sits in deep space, never flat */
.veil {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(130% 100% at 50% 42%, transparent 46%, rgba(5,6,10,0.55) 78%, rgba(3,3,6,0.92) 100%);
  mix-blend-mode: multiply;
}

/* ===== overlay text layer ===== */
.stage {
  position: relative; z-index: 2;
  min-height: 100vh;
  display: flex; flex-direction: column;
  pointer-events: none;
}
.stage * { pointer-events: auto; }

/* top bar */
.top {
  display: flex; align-items: center; justify-content: space-between;
  padding: clamp(20px, 3.4vw, 38px) clamp(20px, 4vw, 56px);
  gap: 16px;
}
.mark { display: inline-flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; letter-spacing: -0.01em; font-size: clamp(15px, 1.5vw, 18px); }
.glyph {
  width: 28px; height: 28px; border-radius: 9px; flex: none; position: relative;
  background: conic-gradient(from 210deg, var(--c1), var(--c2), var(--c3), var(--c1));
  box-shadow: 0 0 22px -4px var(--c1), inset 0 0 10px rgba(255,255,255,0.35);
}
.glyph::after { content: ''; position: absolute; inset: 7px; border-radius: 5px; background: #07060d; }
.nav { display: flex; gap: clamp(16px, 2.2vw, 30px); font-size: 13.5px; color: var(--mut); font-weight: 500; }
.nav a { transition: color 0.3s ease; }
.nav a:hover { color: var(--ink); }

/* hero block, bottom-left */
.hero {
  margin-top: auto;
  padding: 0 clamp(20px, 4vw, 60px) clamp(34px, 6vw, 76px);
  max-width: 880px;
}
.glass {
  display: inline-flex; flex-direction: column; gap: clamp(16px, 2vw, 22px);
  padding: clamp(22px, 3vw, 38px) clamp(24px, 3.4vw, 44px);
  border-radius: 26px;
  background: var(--glass);
  border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  backdrop-filter: blur(16px) saturate(140%);
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08);
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 11px;
  font-size: clamp(11px, 1.1vw, 12.5px); font-weight: 600;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--c2);
}
.eyebrow::before { content: ''; width: 28px; height: 1px; background: linear-gradient(90deg, var(--c2), transparent); }
.title {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(40px, 8.4vw, 104px); line-height: 0.94; letter-spacing: -0.035em;
  margin: 0; text-wrap: balance;
}
.title .grad {
  background: linear-gradient(108deg, var(--c1) 8%, var(--c2) 52%, var(--c3) 96%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.caption {
  font-size: clamp(15px, 1.7vw, 19px); line-height: 1.5; color: var(--mut);
  max-width: 46ch; margin: 0; font-weight: 400;
}
.cta {
  display: inline-flex; align-items: center; gap: 12px; align-self: flex-start;
  margin-top: 2px;
  padding: 13px 22px; border-radius: 999px;
  font-size: 14px; font-weight: 600; letter-spacing: 0.01em; color: #07060d;
  background: linear-gradient(108deg, var(--c2), var(--c1));
  box-shadow: 0 14px 34px -12px var(--c1);
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
}
.cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px -12px var(--c1); }
.cta svg { width: 15px; height: 15px; transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); }
.cta:hover svg { transform: translateX(4px); }

/* bottom meta strip */
.meta {
  display: flex; flex-wrap: wrap; gap: clamp(18px, 3vw, 40px);
  padding: 0 clamp(20px, 4vw, 60px) clamp(26px, 4vw, 46px);
  color: var(--mut);
}
.stat { display: flex; flex-direction: column; gap: 4px; }
.stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 2.4vw, 28px); letter-spacing: -0.02em; color: var(--ink); font-variant-numeric: tabular-nums; }
.stat .l { font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; }
.scrollhint {
  margin-left: auto; align-self: flex-end;
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mut);
}
.scrollhint .rail { width: 1px; height: 30px; background: linear-gradient(180deg, var(--c2), transparent); position: relative; overflow: hidden; }
.scrollhint .rail::after { content: ''; position: absolute; top: -8px; left: 0; width: 1px; height: 8px; background: var(--ink); animation: fall 1.9s ease-in-out infinite; }
@keyframes fall { 0% { top: -8px; } 70%,100% { top: 30px; } }

@media (max-width: 820px) {
  .nav { display: none; }
  /* inline-flex sizes to content, so width:100% won't constrain it — switch to
     flex + min-width:0 so the panel fits the gutter and the caption wraps. */
  .glass { display: flex; width: 100%; max-width: 100%; min-width: 0;
    padding: clamp(20px, 5vw, 30px) clamp(20px, 5vw, 30px); }
  .caption { max-width: 100%; min-width: 0; }
  .scrollhint { display: none; }
  .meta { gap: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .scrollhint .rail::after { animation: none; }
}
`.trim()

const HTML = `
<canvas id="scene"></canvas>
<div class="veil" aria-hidden="true"></div>

<div class="stage">
  <header class="top">
    <span class="mark"><span class="glyph"></span> AURA / Studio</span>
    <nav class="nav">
      <a href="#">Work</a>
      <a href="#">Process</a>
      <a href="#">Lab</a>
      <a href="#">Contact</a>
    </nav>
  </header>

  <section class="hero">
    <div class="glass reveal" data-reveal="scale">
      <span class="eyebrow">Generative · Real-time · WebGL</span>
      <h1 class="title">Light, made<br><span class="grad">to orbit.</span></h1>
      <p class="caption">A living particle field — sixty thousand points drawn every frame, blended into a single glowing body. It breathes with the cursor and never renders the same instant twice.</p>
      <a class="cta" href="#">Enter the field
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </section>

  <footer class="meta reveal" data-reveal="none">
    <div class="stat"><span class="n">60,000</span><span class="l">Particles</span></div>
    <div class="stat"><span class="n">60 fps</span><span class="l">Continuous</span></div>
    <div class="stat"><span class="n">3</span><span class="l">Color fields</span></div>
    <div class="scrollhint"><span class="rail"></span>Move to orbit</div>
  </footer>
</div>
`.trim()

// NOTE: page.js — string concatenation only, NO template literals (keeps the TS
// file compiling). The pinned three.js r128 UMD build attaches `window.THREE`.
const JS = `
(function () {
  if (typeof THREE === 'undefined') return;
  var canvas = document.getElementById('scene');
  if (!canvas) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.018);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 46);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  // ---- color palette (violet -> cyan -> magenta) ----
  var COL_A = new THREE.Color(0x9b4dff); // violet
  var COL_B = new THREE.Color(0x3fe0ff); // cyan
  var COL_C = new THREE.Color(0xff5cc8); // magenta

  var group = new THREE.Group();
  scene.add(group);

  // ===== 1. particle nebula forming a glowing sphere shell =====
  var COUNT = 60000;
  var positions = new Float32Array(COUNT * 3);
  var colors = new Float32Array(COUNT * 3);
  var seeds = new Float32Array(COUNT); // per-point phase for the breathing shimmer
  var R = 15;
  var tmp = new THREE.Color();

  for (var i = 0; i < COUNT; i++) {
    // even distribution on a sphere via the golden-spiral mapping, with a soft
    // radial scatter so it reads as a volumetric shell rather than a hard ball.
    var t = i / COUNT;
    var phi = Math.acos(1 - 2 * t);
    var theta = Math.PI * (1 + Math.sqrt(5)) * i;
    var jitter = 1 + (Math.random() - 0.5) * 0.32;
    var rr = R * jitter;

    var x = rr * Math.sin(phi) * Math.cos(theta);
    var y = rr * Math.sin(phi) * Math.sin(theta);
    var z = rr * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    seeds[i] = Math.random() * Math.PI * 2;

    // color by vertical band: violet (bottom) -> cyan (mid) -> magenta (top),
    // so the additive blend paints a rich gradient across the sphere.
    var m = (y / R + 1) / 2; // 0..1
    if (m < 0.5) {
      tmp.copy(COL_A).lerp(COL_B, m * 2);
    } else {
      tmp.copy(COL_B).lerp(COL_C, (m - 0.5) * 2);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // round, soft sprite drawn into a canvas texture (no external image)
  function makeSprite() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  var pMat = new THREE.PointsMaterial({
    size: 0.42,
    map: makeSprite(),
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  var points = new THREE.Points(pGeo, pMat);
  group.add(points);

  // ===== 2. icosahedron wireframe core =====
  var icoGeo = new THREE.IcosahedronGeometry(7.4, 1);
  var icoMat = new THREE.MeshBasicMaterial({
    color: 0x6fe9ff,
    wireframe: true,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var ico = new THREE.Mesh(icoGeo, icoMat);
  group.add(ico);

  // a brighter inner solid icosahedron for a molten-glass core glow
  var coreGeo = new THREE.IcosahedronGeometry(4.4, 0);
  var coreMat = new THREE.MeshBasicMaterial({
    color: 0xb06bff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // faint outer halo ring of larger soft points for depth
  var HALO = 1200;
  var hPos = new Float32Array(HALO * 3);
  var hCol = new Float32Array(HALO * 3);
  for (var k = 0; k < HALO; k++) {
    var ang = Math.random() * Math.PI * 2;
    var rad = 24 + Math.random() * 22;
    var hy = (Math.random() - 0.5) * 30;
    hPos[k * 3] = Math.cos(ang) * rad;
    hPos[k * 3 + 1] = hy;
    hPos[k * 3 + 2] = Math.sin(ang) * rad;
    tmp.copy(COL_A).lerp(COL_C, Math.random());
    hCol[k * 3] = tmp.r; hCol[k * 3 + 1] = tmp.g; hCol[k * 3 + 2] = tmp.b;
  }
  var hGeo = new THREE.BufferGeometry();
  hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
  hGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
  var hMat = new THREE.PointsMaterial({
    size: 0.9, map: makeSprite(), vertexColors: true,
    transparent: true, opacity: 0.5, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  var halo = new THREE.Points(hGeo, hMat);
  scene.add(halo);

  // ---- mouse parallax target ----
  var mouseX = 0, mouseY = 0;     // normalized -1..1
  var curX = 0, curY = 0;         // smoothed
  function onPointer(nx, ny) {
    mouseX = nx; mouseY = ny;
  }
  window.addEventListener('pointermove', function (e) {
    onPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) {
      onPointer((e.touches[0].clientX / window.innerWidth) * 2 - 1, (e.touches[0].clientY / window.innerHeight) * 2 - 1);
    }
  }, { passive: true });

  // ---- breathing shimmer applied to the particle radii ----
  var basePos = positions.slice(0);
  var posAttr = pGeo.getAttribute('position');

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', onResize);
  onResize();

  var clock = new THREE.Clock();

  function frame() {
    var dt = clock.getDelta();
    var t = clock.getElapsedTime();

    // smooth the camera/object toward the pointer (subtle parallax)
    curX += (mouseX - curX) * 0.045;
    curY += (mouseY - curY) * 0.045;

    if (!reduce) {
      group.rotation.y += dt * 0.16;
      group.rotation.x = Math.sin(t * 0.18) * 0.12;
      ico.rotation.y -= dt * 0.22;
      ico.rotation.x += dt * 0.12;
      core.rotation.x -= dt * 0.3;
      core.rotation.z += dt * 0.18;
      halo.rotation.y += dt * 0.03;
    }

    // parallax: nudge the whole group toward the cursor and tilt the camera
    var px = curX * (reduce ? 1.2 : 3.4);
    var py = -curY * (reduce ? 1.2 : 2.4);
    group.position.x += (px - group.position.x) * 0.06;
    group.position.y += (py - group.position.y) * 0.06;
    camera.position.x += (curX * 5 - camera.position.x) * 0.04;
    camera.position.y += (-curY * 4 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    // gentle breathing: ripple the shell radius so the nebula feels alive
    if (!reduce) {
      var arr = posAttr.array;
      var freq = 1.4, amp = 0.6;
      for (var i = 0; i < COUNT; i++) {
        var ix = i * 3;
        var bx = basePos[ix], by = basePos[ix + 1], bz = basePos[ix + 2];
        var len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
        var wave = Math.sin(t * freq + seeds[i]) * amp;
        var s = (len + wave) / len;
        arr[ix] = bx * s;
        arr[ix + 1] = by * s;
        arr[ix + 2] = bz * s;
      }
      posAttr.needsUpdate = true;
    }

    // subtle pulse on the core glow
    core.material.opacity = 0.12 + (reduce ? 0.04 : Math.abs(Math.sin(t * 0.9)) * 0.12);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`.trim()

export const threeDOrb: Template = {
  id: 'three-d-orb',
  kind: 'page',
  name: '3D Showcase',
  tagline: 'A live WebGL particle orb with mouse parallax',
  categories: ['3D'],
  audiences: ['creative', 'developers', 'design', 'marketing'],
  description:
    'A full-viewport generative-art landing page: 60k additive-blended particles form a glowing violet→cyan→magenta sphere around a rotating icosahedron wireframe core, with a soft halo, depth fog, and a breathing shimmer. The scene auto-rotates, follows the cursor with subtle parallax, runs a continuous 60fps rAF loop, caps devicePixelRatio at 2, handles resize, and respects prefers-reduced-motion. A minimal glass text layer (eyebrow, oversized gradient title, caption, CTA, stat strip) floats above. Built on a pinned three.js r128 UMD build — no image assets.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#05060a',
  notes:
    'The 3D scene lives entirely in page.js using the global `THREE` (pinned r128 UMD via samplePage.libs). Tune the look through a few knobs near the top: COUNT (particle density), R (sphere radius), COL_A/COL_B/COL_C (the violet→cyan→magenta palette), and the per-section rotation speeds in frame(). All visuals are additive-blended so colors paint over the dark #05060a backdrop — keep the background near-black. The overlay text is a separate z-index:2 layer; recolor it via --c1/--c2/--c3. Motion is gated on prefers-reduced-motion (still renders, no auto-spin / breathing). devicePixelRatio is capped at 2 for performance. No <img> assets — the particle sprite is a canvas-drawn radial gradient.',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#05060a',
  },
}
