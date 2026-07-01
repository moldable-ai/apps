import type { Template } from '../types'

// A full-viewport synthwave WebGL terrain flythrough. An endless wireframe
// heightfield plane stretches to the horizon, displaced by a cheap layered
// sine/pseudo-noise height function with a valley kept down the middle (the
// "road"). Each frame the terrain scrolls toward the camera and rows wrap so it
// reads as infinite. A big neon scanline SUN sits on the horizon, FOG blends the
// grid into a vertical gradient sky (deep purple -> magenta -> orange), and the
// camera bobs gently. A minimal glass overlay floats above. Pure WebGL via a
// pinned three.js r128 UMD build (global `THREE`) — no <img> assets.

const CSS = `
:root {
  --ink: #fef0ff;
  --mut: rgba(255,210,250,0.66);
  --c1: #ff2fb9;   /* hot magenta */
  --c2: #29e7ff;   /* electric cyan */
  --c3: #ff8a2b;   /* hot orange */
  --c4: #b14bff;   /* electric purple */
  --glass: rgba(20,6,34,0.42);
  --line: rgba(255,120,230,0.22);
  --display: 'Orbitron', 'Space Grotesk', sans-serif;
  --body: 'Space Grotesk', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: #0a0314; color: var(--ink); overflow-x: hidden; }

/* the WebGL canvas fills the viewport behind everything */
#scene {
  position: fixed; inset: 0; z-index: 0;
  display: block; width: 100vw; height: 100vh;
  background:
    linear-gradient(180deg, #1a0838 0%, #3a0a4e 34%, #7a0f55 58%, #c41e63 74%, #ff6a2b 100%);
}
/* vignette + faint scanline grain so the scene sits in deep night */
.veil {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(140% 110% at 50% 30%, transparent 52%, rgba(10,3,20,0.5) 82%, rgba(6,2,14,0.92) 100%);
}
.scan {
  position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.16;
  background: repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
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
.mark {
  display: inline-flex; align-items: center; gap: 12px;
  font-family: var(--display); font-weight: 700;
  letter-spacing: 0.16em; font-size: clamp(13px, 1.4vw, 16px);
  text-transform: uppercase;
}
.glyph {
  width: 30px; height: 30px; border-radius: 8px; flex: none; position: relative;
  background: conic-gradient(from 200deg, var(--c1), var(--c4), var(--c2), var(--c3), var(--c1));
  box-shadow: 0 0 24px -4px var(--c1), inset 0 0 10px rgba(255,255,255,0.4);
}
.glyph::after {
  content: ''; position: absolute; inset: 6px; border-radius: 4px; background: #0a0314;
  box-shadow: inset 0 0 8px rgba(255,80,210,0.6);
}
.nav { display: flex; gap: clamp(16px, 2.2vw, 30px); font-size: 12.5px; color: var(--mut); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.nav a { transition: color 0.3s ease, text-shadow 0.3s ease; }
.nav a:hover { color: var(--ink); text-shadow: 0 0 14px var(--c2); }

/* hero block, bottom-left */
.hero {
  margin-top: auto;
  padding: 0 clamp(20px, 4vw, 60px) clamp(30px, 5vw, 64px);
  max-width: 920px;
}
.glass {
  display: inline-flex; flex-direction: column; gap: clamp(15px, 2vw, 22px);
  padding: clamp(22px, 3vw, 38px) clamp(24px, 3.4vw, 46px);
  border-radius: 22px;
  background: var(--glass);
  border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow:
    0 30px 90px -40px rgba(0,0,0,0.85),
    inset 0 1px 0 rgba(255,180,250,0.14),
    0 0 60px -30px rgba(255,47,185,0.5);
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 11px;
  font-size: clamp(11px, 1.1vw, 12.5px); font-weight: 600;
  letter-spacing: 0.3em; text-transform: uppercase; color: var(--c2);
  text-shadow: 0 0 16px rgba(41,231,255,0.55);
}
.eyebrow::before { content: ''; width: 30px; height: 1px; background: linear-gradient(90deg, var(--c2), transparent); }
.title {
  font-family: var(--display); font-weight: 800;
  font-size: clamp(48px, 11vw, 132px); line-height: 0.9; letter-spacing: 0.01em;
  margin: 0; text-wrap: balance; text-transform: uppercase;
  text-shadow: 0 0 40px rgba(255,47,185,0.4);
}
.title .grad {
  background: linear-gradient(100deg, var(--c3) 4%, var(--c1) 46%, var(--c4) 78%, var(--c2) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 26px rgba(255,138,43,0.45));
}
.caption {
  font-size: clamp(14px, 1.7vw, 18px); line-height: 1.55; color: var(--mut);
  max-width: 44ch; margin: 0; font-weight: 400;
}
.cta {
  display: inline-flex; align-items: center; gap: 12px; align-self: flex-start;
  margin-top: 2px;
  padding: 13px 24px; border-radius: 999px;
  font-family: var(--display); font-size: 12.5px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #0a0314;
  background: linear-gradient(100deg, var(--c2), var(--c1));
  box-shadow: 0 14px 40px -12px var(--c1), 0 0 0 1px rgba(255,255,255,0.12) inset;
  transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s ease;
}
.cta:hover { transform: translateY(-2px); box-shadow: 0 22px 52px -12px var(--c1); }
.cta svg { width: 15px; height: 15px; transition: transform 0.35s cubic-bezier(0.16,1,0.3,1); }
.cta:hover svg { transform: translateX(4px); }
.cta:focus-visible, .nav a:focus-visible { outline: 2px solid var(--c2); outline-offset: 4px; border-radius: 8px; }

/* bottom meta strip — fake speed / BPM telemetry */
.meta {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: clamp(18px, 3vw, 44px);
  padding: 0 clamp(20px, 4vw, 60px) clamp(24px, 4vw, 42px);
  color: var(--mut);
}
.stat { display: flex; flex-direction: column; gap: 4px; }
.stat .n {
  font-family: var(--display); font-weight: 700; font-size: clamp(20px, 2.5vw, 30px);
  letter-spacing: 0.02em; color: var(--ink); font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px rgba(41,231,255,0.4);
}
.stat .l { font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; }
.stat .n .u { font-size: 0.5em; color: var(--mut); margin-left: 3px; letter-spacing: 0.1em; }
.scrollhint {
  margin-left: auto; align-self: flex-end;
  display: inline-flex; align-items: center; gap: 9px;
  font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--mut);
  font-family: var(--display);
}
.scrollhint .rail { width: 1px; height: 32px; background: linear-gradient(180deg, var(--c2), transparent); position: relative; overflow: hidden; }
.scrollhint .rail::after { content: ''; position: absolute; top: -8px; left: 0; width: 1px; height: 8px; background: var(--ink); animation: fall 1.9s ease-in-out infinite; }
@keyframes fall { 0% { top: -8px; } 70%,100% { top: 32px; } }

@media (max-width: 820px) {
  .nav { display: none; }
  /* inline-flex sizes to content; switch to flex + min-width:0 so the panel fits
     the gutter and the caption wraps cleanly on phones. */
  .glass { display: flex; width: 100%; max-width: 100%; min-width: 0;
    padding: clamp(20px, 5vw, 30px) clamp(20px, 5vw, 30px); }
  .caption { max-width: 100%; min-width: 0; }
  .scrollhint { display: none; }
  .meta { gap: 20px 26px; }
  .title { font-size: clamp(46px, 17vw, 92px); }
}
@media (max-width: 460px) {
  .stat:nth-child(3) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .scrollhint .rail::after { animation: none; }
}
`.trim()

const HTML = `
<canvas id="scene"></canvas>
<div class="scan" aria-hidden="true"></div>
<div class="veil" aria-hidden="true"></div>

<div class="stage">
  <header class="top">
    <span class="mark"><span class="glyph"></span> NEON&nbsp;//&nbsp;DRIVE</span>
    <nav class="nav">
      <a href="#">Tracks</a>
      <a href="#">Grid</a>
      <a href="#">Sun</a>
      <a href="#">Mixtape</a>
    </nav>
  </header>

  <section class="hero">
    <div class="glass reveal" data-reveal="scale">
      <span class="eyebrow">Endless · Procedural · WebGL</span>
      <h1 class="title">Night<br><span class="grad">Drive</span></h1>
      <p class="caption">A wireframe horizon that never stops unspooling. The terrain is born one row at a time, scrolls under the chassis, and wraps forever — a chrome valley carved straight at a sun that never sets.</p>
      <a class="cta" href="#">Hit the gas
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
    </div>
  </section>

  <footer class="meta reveal" data-reveal="none">
    <div class="stat"><span class="n">188<span class="u">km/h</span></span><span class="l">Velocity</span></div>
    <div class="stat"><span class="n">124<span class="u">bpm</span></span><span class="l">Synthwave</span></div>
    <div class="stat"><span class="n">&#8734;</span><span class="l">Horizon</span></div>
    <div class="scrollhint"><span class="rail"></span>Cruise on</div>
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

  // ---- palette knobs (synthwave) ----
  var SKY_TOP = 0x140428;     // deep night purple (fog far)
  var GRID_HI = new THREE.Color(0x29e7ff);  // electric cyan (high peaks)
  var GRID_LO = new THREE.Color(0xff2fb9);  // hot magenta  (low valleys)
  var FOG_COL = 0x3a0a4e;     // magenta-purple haze the grid melts into

  // ---- terrain dimensions ----
  var COLS = 64;    // points across (x)
  var ROWS = 90;    // rows into the distance (z)
  var SPACING = 4;  // world units between grid points
  var SPEED = 9;    // world units / second the terrain scrolls toward camera
  var WIDTH = COLS * SPACING;
  var DEPTH = ROWS * SPACING;

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG_COL, DEPTH * 0.34, DEPTH * 0.92);

  var camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, DEPTH * 1.6);
  camera.position.set(0, 11, 24);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  // ===== height field =====
  // cheap layered sine/pseudo-noise. A valley is carved down the middle (x≈0)
  // so it reads as a road we fly along. 'worldZ' is the absolute distance of a
  // row so peaks slide smoothly as we recycle rows (no popping).
  function heightAt(worldX, worldZ) {
    var n = 0;
    n += Math.sin(worldX * 0.055 + worldZ * 0.045) * 5.0;
    n += Math.sin(worldX * 0.13 - worldZ * 0.07) * 2.6;
    n += Math.sin((worldX + worldZ) * 0.21) * 1.3;
    n += Math.sin(worldX * 0.31 + worldZ * 0.17 + 1.7) * 0.7;
    // ridge multiplier rising with distance from center -> tall walls, flat road
    var dx = Math.abs(worldX);
    var valley = Math.min(1, dx / (WIDTH * 0.26)); // 0 in middle -> 1 at edges
    valley = valley * valley;                       // smooth ease toward center
    var base = n * (0.18 + valley * 1.0);
    // keep the very center near-flat (the road) regardless of noise sign
    var road = Math.max(0, 1 - dx / (SPACING * 6));
    base *= (1 - road * 0.82);
    return base;
  }

  // build the grid geometry (a wireframe of horizontal + longitudinal lines via
  // an indexed line set). We store, per vertex, its column index + a per-row
  // offset so we can re-displace every frame as rows scroll & wrap.
  var vcount = COLS * ROWS;
  var positions = new Float32Array(vcount * 3);
  var colors = new Float32Array(vcount * 3);

  function vidx(c, r) { return r * COLS + c; }

  // 'scrollZ' grows over time; each row r sits at worldZ = (r * SPACING) - (scrollZ mod SPACING)
  // and its absolute-noise coordinate is rowWorldZ so terrain content moves with us.
  var scrollZ = 0;

  function rebuild() {
    var tmp = new THREE.Color();
    for (var r = 0; r < ROWS; r++) {
      // row's local Z: nearest row (r=0) close to camera, far rows recede. The
      // grid slides toward the camera by the fractional scroll, then recycles a
      // whole row each SPACING.
      var frac = scrollZ % SPACING;
      var localZ = camera.position.z - 8 - r * SPACING + frac;
      // Absolute world Z for the height function must use the FLOORED scroll
      // (scrollZ - frac), not the raw scrollZ: the visual position already
      // carries +frac, so the height must not double-count it — otherwise the
      // content at a fixed screen slot jumps one row every wrap (a visible
      // repeat/pop). With the floored scroll the recycle is seamless.
      var worldZ = r * SPACING + (scrollZ - frac);
      for (var c = 0; c < COLS; c++) {
        var worldX = (c - (COLS - 1) / 2) * SPACING;
        var h = heightAt(worldX, worldZ);
        var i = vidx(c, r);
        positions[i * 3] = worldX;
        positions[i * 3 + 1] = h;
        positions[i * 3 + 2] = localZ;
        // color by height: magenta valleys -> cyan peaks, with a hot-orange kiss
        // near the horizon glow handled by fog. clamp height into 0..1.
        var hn = Math.max(0, Math.min(1, (h + 4) / 14));
        tmp.copy(GRID_LO).lerp(GRID_HI, hn);
        colors[i * 3] = tmp.r;
        colors[i * 3 + 1] = tmp.g;
        colors[i * 3 + 2] = tmp.b;
      }
    }
  }
  rebuild();

  // index buffer: connect each point to its right neighbor (lat lines) and its
  // forward neighbor (long lines) -> a clean wireframe lattice.
  var segs = [];
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (c < COLS - 1) { segs.push(vidx(c, r), vidx(c + 1, r)); }
      if (r < ROWS - 1) { segs.push(vidx(c, r), vidx(c, r + 1)); }
    }
  }
  var indexArr = new Uint32Array(segs);

  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indexArr, 1));
  var posAttr = geo.getAttribute('position');
  var colAttr = geo.getAttribute('color');

  var gridMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var grid = new THREE.LineSegments(geo, gridMat);
  scene.add(grid);

  // a dim filled plane just under the grid so the lattice reads as a surface,
  // not floating lines — subtle magenta glow that fades into fog.
  var fillGeo = new THREE.PlaneGeometry(WIDTH * 1.4, DEPTH, 1, 1);
  var fillMat = new THREE.MeshBasicMaterial({
    color: 0x2a0640, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide, depthWrite: false
  });
  var fill = new THREE.Mesh(fillGeo, fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.set(0, -3.4, camera.position.z - 8 - DEPTH / 2);
  scene.add(fill);

  // ===== the neon sun with horizontal scanline gaps =====
  // drawn into a canvas texture: a vertical magenta->orange gradient disc with
  // black horizontal bands cut into the lower half (classic outrun sun).
  function makeSun() {
    var s = 256;
    var cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    var g = cv.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0.0, '#fff1a8');
    grad.addColorStop(0.18, '#ffd23f');
    grad.addColorStop(0.42, '#ff8a2b');
    grad.addColorStop(0.66, '#ff2fb9');
    grad.addColorStop(1.0, '#b14bff');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2);
    g.fill();
    // scanline gaps cut into the bottom half, gaps widening toward the base
    g.globalCompositeOperation = 'destination-out';
    var y = s * 0.5;
    var gap = 4;
    var step = 9;
    while (y < s) {
      g.fillRect(0, y, s, gap);
      y += step;
      gap += 1.1;     // gaps grow toward the base
      step += 1.6;
    }
    g.globalCompositeOperation = 'source-over';
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  var sunMat = new THREE.SpriteMaterial({
    map: makeSun(), transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, opacity: 0.96
  });
  var sun = new THREE.Sprite(sunMat);
  var SUN_SIZE = 120;
  sun.scale.set(SUN_SIZE, SUN_SIZE, 1);
  // park it far down the road, sitting on the horizon line
  sun.position.set(0, 26, camera.position.z - DEPTH * 0.96);
  scene.add(sun);

  // soft glow halo behind the sun
  function makeGlow() {
    var s = 256;
    var cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,120,180,0.9)');
    grad.addColorStop(0.4, 'rgba(255,60,150,0.35)');
    grad.addColorStop(1, 'rgba(255,60,150,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }
  var glowMat = new THREE.SpriteMaterial({
    map: makeGlow(), transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending, opacity: 0.8
  });
  var glow = new THREE.Sprite(glowMat);
  glow.scale.set(SUN_SIZE * 2.4, SUN_SIZE * 2.4, 1);
  glow.position.copy(sun.position);
  glow.position.z += 1;
  scene.add(glow);

  // a sprinkle of stars high in the sky for depth
  var STARS = 260;
  var sPos = new Float32Array(STARS * 3);
  for (var k = 0; k < STARS; k++) {
    sPos[k * 3] = (Math.random() - 0.5) * WIDTH * 2.2;
    sPos[k * 3 + 1] = 30 + Math.random() * 80;
    sPos[k * 3 + 2] = camera.position.z - DEPTH * (0.4 + Math.random() * 0.6);
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  var starMat = new THREE.PointsMaterial({
    color: 0xfff0ff, size: 0.7, transparent: true, opacity: 0.8,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

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
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // scroll the terrain toward the camera; reduced-motion crawls almost still.
    scrollZ += (reduce ? SPEED * 0.06 : SPEED) * dt;

    // re-displace + recolor the whole field each frame (rows effectively wrap
    // because worldZ keeps growing while localZ stays within the frustum).
    rebuild();
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // subtle camera bob + sway, like a low chassis humming down the road
    if (!reduce) {
      camera.position.y = 11 + Math.sin(t * 1.1) * 0.5;
      camera.position.x = Math.sin(t * 0.5) * 1.1;
      camera.rotation.z = Math.sin(t * 0.4) * 0.006;
    }
    camera.lookAt(0, 9, camera.position.z - DEPTH * 0.5);

    // sun pulse + glow shimmer
    var pulse = reduce ? 1 : (1 + Math.sin(t * 1.6) * 0.03);
    sun.scale.set(SUN_SIZE * pulse, SUN_SIZE * pulse, 1);
    glowMat.opacity = 0.72 + (reduce ? 0 : Math.abs(Math.sin(t * 0.9)) * 0.18);

    // twinkle the stars
    starMat.opacity = 0.6 + (reduce ? 0.2 : Math.abs(Math.sin(t * 2.0)) * 0.35);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`.trim()

export const threeTerrain: Template = {
  id: 'three-terrain',
  kind: 'page',
  name: '3D Terrain',
  tagline: 'A synthwave procedural terrain flythrough',
  categories: ['3D'],
  audiences: ['creative', 'tech', 'music'],
  description:
    'A full-viewport synthwave flythrough: an endless wireframe heightfield unspools toward a giant scanline-cut neon sun, with a chrome valley carved down the middle as the road. Vertices are displaced by a cheap layered-sine height function and the rows scroll + recycle every frame so the horizon is truly infinite, all blended into a deep-purple→magenta→orange fog sky. The camera bobs gently, the sun pulses, devicePixelRatio is capped at 2, the scene is resize-aware, and prefers-reduced-motion slows the scroll to a crawl. Built on a pinned three.js r128 UMD build — no image assets, a glass OUTRUN-style overlay floats above.',
  fonts: {
    display: 'Orbitron',
    body: 'Space Grotesk',
    links: [
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0a0314',
  notes:
    'The whole scene lives in page.js using the global `THREE` (pinned r128 UMD via samplePage.libs). Palette knobs sit at the very top of the JS: GRID_HI / GRID_LO are the peak (cyan) and valley (magenta) line colors, FOG_COL is the haze the grid melts into, and the CSS #scene gradient + .glass shadow carry the deep-purple→magenta→orange sky — recolor those together for a new mood. Terrain feel is controlled by COLS/ROWS (density), SPACING (grid scale), and SPEED (how fast the road rushes — raise for more velocity). The `heightAt()` function is the procedural generator: edit the layered Math.sin() terms for different ridges, and the `valley`/`road` math keeps the center flat (widen `WIDTH * 0.26` for a broader road, shrink `SPACING * 6` for a tighter one). The neon sun is a canvas-drawn sprite in makeSun() — its scanline gaps come from the `gap`/`step` loop; move it via sun.position. Motion is gated on prefers-reduced-motion (terrain crawls, sun stops pulsing) and devicePixelRatio is capped at 2. The overlay is a separate z-index:2 layer; retheme it via --c1..--c4. No <img> assets — the sun, glow, and star sprites are all canvas gradients.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
    ],
    libs: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0a0314',
  },
}
