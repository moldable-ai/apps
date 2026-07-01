import type { Template } from '../types'

// A full-viewport WebGL globe in deep space: a dotted point-cloud sphere with a
// faint wireframe graticule, a soft additive atmosphere halo, and animated
// great-circle ARCS between major cities — each with a bright pulse that travels
// along the curve. A subtle starfield sits behind. Interaction: auto-rotate,
// drag-to-spin with inertial decay (pointer events, auto-rotate pauses while
// dragging), and gentle mouse parallax. DPR capped at 2, resize-aware,
// prefers-reduced-motion respected. A minimal glass overlay floats above. Pure
// WebGL via the pinned three.js r128 UMD build (global `THREE`) — no <img> assets.

const CSS = `
:root {
  --ink: #eaf4ff;
  --mut: rgba(186,209,235,0.62);
  --cyan: #4fd6ff;   /* point / atmosphere accent */
  --deep: #1d6cff;   /* deep ocean blue          */
  --warm: #ff9d5c;   /* arc accent (warm)        */
  --gold: #ffd27a;   /* arc pulse highlight      */
  --glass: rgba(9,16,30,0.40);
  --line: rgba(120,170,230,0.14);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background: #03060f; color: var(--ink); overflow-x: hidden; }

/* the WebGL canvas fills the viewport behind everything */
#scene {
  position: fixed; inset: 0; z-index: 0;
  display: block; width: 100vw; height: 100vh;
  cursor: grab;
  background:
    radial-gradient(120% 95% at 50% 42%, rgba(31,108,255,0.12), transparent 58%),
    radial-gradient(80% 70% at 78% 16%, rgba(79,214,255,0.08), transparent 62%),
    radial-gradient(90% 80% at 18% 92%, rgba(255,157,92,0.05), transparent 60%),
    #03060f;
}
#scene.dragging { cursor: grabbing; }

/* vignette so the globe sits deep in space, never flat */
.veil {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(135% 105% at 50% 46%, transparent 44%, rgba(3,6,15,0.5) 76%, rgba(2,4,10,0.94) 100%);
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
  width: 28px; height: 28px; border-radius: 50%; flex: none; position: relative;
  background: radial-gradient(circle at 32% 30%, var(--cyan), var(--deep) 70%, #0a1d44);
  box-shadow: 0 0 20px -3px var(--cyan), inset 0 0 9px rgba(255,255,255,0.35);
}
.glyph::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  border: 1px solid rgba(79,214,255,0.4);
}
.nav { display: flex; gap: clamp(16px, 2.2vw, 30px); font-size: 13.5px; color: var(--mut); font-weight: 500; }
.nav a { transition: color 0.3s ease; position: relative; }
.nav a:hover { color: var(--ink); }
.live {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mut);
}
.dot {
  width: 7px; height: 7px; border-radius: 50%; background: var(--cyan);
  box-shadow: 0 0 0 0 rgba(79,214,255,0.6); animation: ping 2.4s ease-out infinite;
}
@keyframes ping {
  0% { box-shadow: 0 0 0 0 rgba(79,214,255,0.55); }
  70%,100% { box-shadow: 0 0 0 10px rgba(79,214,255,0); }
}

/* hero block, bottom-left */
.hero {
  margin-top: auto;
  padding: 0 clamp(20px, 4vw, 60px) clamp(30px, 5vw, 64px);
  max-width: 880px;
}
.glass {
  display: inline-flex; flex-direction: column; gap: clamp(15px, 2vw, 22px);
  padding: clamp(22px, 3vw, 38px) clamp(24px, 3.4vw, 44px);
  border-radius: 26px;
  background: var(--glass);
  border: 1px solid var(--line);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
  backdrop-filter: blur(18px) saturate(135%);
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.07);
}
.eyebrow {
  display: inline-flex; align-items: center; gap: 11px;
  font-size: clamp(11px, 1.1vw, 12.5px); font-weight: 600;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--cyan);
}
.eyebrow::before { content: ''; width: 28px; height: 1px; background: linear-gradient(90deg, var(--cyan), transparent); }
.title {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(40px, 8vw, 98px); line-height: 0.94; letter-spacing: -0.035em;
  margin: 0; text-wrap: balance;
}
.title .grad {
  background: linear-gradient(106deg, var(--cyan) 6%, var(--deep) 54%, var(--warm) 98%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.caption {
  font-size: clamp(15px, 1.7vw, 19px); line-height: 1.5; color: var(--mut);
  max-width: 48ch; margin: 0; font-weight: 400;
}

/* tiny legend */
.legend { display: flex; flex-wrap: wrap; gap: 18px; }
.leg { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mut); }
.leg .sw { width: 22px; height: 3px; border-radius: 2px; }
.leg .sw.arc { background: linear-gradient(90deg, var(--warm), var(--gold)); }
.leg .sw.net { background: var(--cyan); height: 8px; width: 8px; border-radius: 50%; box-shadow: 0 0 8px var(--cyan); }
.leg .sw.grat { background: rgba(120,170,230,0.5); }

/* bottom meta strip */
.meta {
  display: flex; flex-wrap: wrap; gap: clamp(18px, 3vw, 40px);
  padding: 0 clamp(20px, 4vw, 60px) clamp(26px, 4vw, 46px);
  color: var(--mut);
}
.stat { display: flex; flex-direction: column; gap: 4px; }
.stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 2.4vw, 28px); letter-spacing: -0.02em; color: var(--ink); font-variant-numeric: tabular-nums; }
.stat .l { font-size: 11.5px; letter-spacing: 0.14em; text-transform: uppercase; }
.hint {
  margin-left: auto; align-self: flex-end;
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 11.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--mut);
}
.hint svg { width: 16px; height: 16px; opacity: 0.8; animation: nudge 2.6s ease-in-out infinite; }
@keyframes nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(5px); } }

@media (max-width: 820px) {
  .nav { display: none; }
  /* inline-flex sizes to content, so width:100% won't constrain it — switch to
     flex + min-width:0 so the panel fits the gutter and the caption wraps. */
  .glass { display: flex; width: 100%; max-width: 100%; min-width: 0;
    padding: clamp(20px, 5vw, 30px) clamp(20px, 5vw, 30px); }
  .caption { max-width: 100%; min-width: 0; }
  .title { font-size: clamp(38px, 12vw, 64px); }
  .hint { display: none; }
  .meta { gap: 22px; }
}
@media (prefers-reduced-motion: reduce) {
  .dot, .hint svg { animation: none; }
}
`.trim()

const HTML = `
<canvas id="scene"></canvas>
<div class="veil" aria-hidden="true"></div>

<div class="stage">
  <header class="top">
    <span class="mark"><span class="glyph"></span> MERIDIAN</span>
    <nav class="nav">
      <a href="#">Network</a>
      <a href="#">Latency</a>
      <a href="#">Regions</a>
      <span class="live"><span class="dot"></span> Live</span>
    </nav>
  </header>

  <section class="hero">
    <div class="glass reveal" data-reveal="scale">
      <span class="eyebrow">Real-time · Edge network · WebGL</span>
      <h1 class="title">The world,<br><span class="grad">one hop away.</span></h1>
      <p class="caption">Forty-two edge regions, drawn live as great-circle arcs across a point-cloud Earth. Every pulse is a request finding the closest node. Drag to spin the planet — it keeps its momentum.</p>
      <div class="legend">
        <span class="leg"><span class="sw net"></span> Edge node</span>
        <span class="leg"><span class="sw arc"></span> Live route</span>
        <span class="leg"><span class="sw grat"></span> Graticule</span>
      </div>
    </div>
  </section>

  <footer class="meta reveal" data-reveal="none">
    <div class="stat"><span class="n">42</span><span class="l">Edge regions</span></div>
    <div class="stat"><span class="n">19 ms</span><span class="l">Median latency</span></div>
    <div class="stat"><span class="n">99.99%</span><span class="l">Uptime</span></div>
    <div class="hint">Drag to spin
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M14 5l7 7-7 7"/></svg>
    </div>
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

  // ===== palette knobs =====
  var COL_POINT = new THREE.Color(0xbfe9ff); // sphere points (cool white-cyan)
  var COL_LAND  = new THREE.Color(0x4fd6ff); // denser land points (cyan)
  var COL_GRAT  = new THREE.Color(0x2f74c8); // graticule wireframe
  var COL_ATMO  = new THREE.Color(0x2f8fff); // atmosphere glow
  var COL_ARC_A = new THREE.Color(0xff9d5c); // arc base (warm)
  var COL_ARC_B = new THREE.Color(0xffd27a); // arc pulse (gold)
  var R = 12;                                 // globe radius

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03060f, 0.012);

  var camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 2, 40);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  // group holds everything that spins; tilt the whole thing slightly.
  var world = new THREE.Group();
  scene.add(world);
  var globe = new THREE.Group();      // spins on drag / auto-rotate
  world.add(globe);
  world.rotation.z = 0.34;            // axial tilt

  var tmp = new THREE.Color();

  // soft round sprite (canvas-drawn, no external image)
  function makeSprite(soft) {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,' + (soft ? '0.7' : '0.9') + ')');
    grad.addColorStop(0.6, 'rgba(255,255,255,' + (soft ? '0.18' : '0.32') + ')');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var sprite = makeSprite(false);

  // lat/lng -> 3D position on a sphere of radius rad
  function latLngToVec(lat, lng, rad) {
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -rad * Math.sin(phi) * Math.cos(theta),
       rad * Math.cos(phi),
       rad * Math.sin(phi) * Math.sin(theta)
    );
  }

  // ===== 1. dotted point-cloud Earth =====
  // A "continent mask" faked from a handful of rectangular lat/lng landmass
  // boxes — points inside a box are brighter & cyan; ocean points are sparse
  // and dim, so the silhouette of the continents emerges in the dot density.
  var LAND = [
    // [latMin, latMax, lngMin, lngMax]  (rough continental footprints)
    [  8,  72, -170,  -52],  // North America
    [-56,  12,  -82,  -34],  // South America
    [ 34,  71,  -11,   42],  // Europe
    [-35,  37,  -18,   52],  // Africa
    [  6,  77,   42,  150],  // Asia
    [-44, -11,  113,  154],  // Australia
    [ 60,  84,  -55,  -12],  // Greenland
  ];
  function inLand(lat, lng) {
    for (var b = 0; b < LAND.length; b++) {
      var L = LAND[b];
      if (lat >= L[0] && lat <= L[1] && lng >= L[2] && lng <= L[3]) return true;
    }
    return false;
  }

  var GP = []; var GC = [];
  var SAMPLES = 26000;
  for (var i = 0; i < SAMPLES; i++) {
    // even sphere distribution via golden spiral
    var t = i / SAMPLES;
    var y = 1 - 2 * t;
    var rxy = Math.sqrt(Math.max(0, 1 - y * y));
    var th = Math.PI * (1 + Math.sqrt(5)) * i;
    var px = Math.cos(th) * rxy, pz = Math.sin(th) * rxy;
    // derive lat/lng of this sample to test the land mask
    var lat = Math.asin(y) * 180 / Math.PI;
    var lng = Math.atan2(pz, px) * 180 / Math.PI;
    var land = inLand(lat, lng);
    // keep all land points; thin out ocean points to ~22% so land reads
    if (!land && Math.random() > 0.22) continue;
    var jit = 1 + (Math.random() - 0.5) * 0.012;
    GP.push(px * R * jit, y * R * jit, pz * R * jit);
    if (land) tmp.copy(COL_LAND); else tmp.copy(COL_POINT);
    GC.push(tmp.r, tmp.g, tmp.b);
  }
  var gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GP), 3));
  gGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(GC), 3));
  var gMat = new THREE.PointsMaterial({
    size: 0.165, map: sprite, vertexColors: true,
    transparent: true, opacity: 0.95, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  var globePts = new THREE.Points(gGeo, gMat);
  globe.add(globePts);

  // a near-black solid sphere just under the points so back-side dots are
  // occluded — the globe reads as a real body, not a transparent cloud.
  var coreGeo = new THREE.SphereGeometry(R * 0.985, 48, 48);
  var coreMat = new THREE.MeshBasicMaterial({ color: 0x040a18 });
  globe.add(new THREE.Mesh(coreGeo, coreMat));

  // ===== 2. faint wireframe graticule =====
  var gratGeo = new THREE.SphereGeometry(R * 1.002, 36, 24);
  var gratMat = new THREE.MeshBasicMaterial({
    color: COL_GRAT, wireframe: true, transparent: true,
    opacity: 0.10, depthWrite: false, blending: THREE.AdditiveBlending
  });
  globe.add(new THREE.Mesh(gratGeo, gratMat));

  // ===== 3. atmosphere glow (additive shell, viewed edge-on -> rim light) =====
  var atmoGeo = new THREE.SphereGeometry(R * 1.16, 48, 48);
  var atmoMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: COL_ATMO } },
    vertexShader:
      'varying vec3 vN;' +
      'void main(){ vN = normalize(normalMatrix * normal);' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'uniform vec3 uColor; varying vec3 vN;' +
      'void main(){' +
      '  float intensity = pow(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 3.0);' +
      '  intensity = clamp(intensity, 0.0, 1.0);' +
      '  gl_FragColor = vec4(uColor, 1.0) * intensity;' +
      '}',
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  world.add(new THREE.Mesh(atmoGeo, atmoMat));

  // ===== 4. city nodes + great-circle arcs =====
  var CITIES = [
    { n: 'SFO', lat: 37.62,  lng: -122.38 },
    { n: 'NYC', lat: 40.64,  lng: -73.78 },
    { n: 'LON', lat: 51.47,  lng: -0.45 },
    { n: 'FRA', lat: 50.04,  lng: 8.56 },
    { n: 'SIN', lat: 1.36,   lng: 103.99 },
    { n: 'TYO', lat: 35.55,  lng: 139.78 },
    { n: 'SYD', lat: -33.95, lng: 151.18 },
    { n: 'SAO', lat: -23.43, lng: -46.47 },
    { n: 'JNB', lat: -26.13, lng: 28.24 },
    { n: 'DXB', lat: 25.25,  lng: 55.36 },
    { n: 'MUM', lat: 19.09,  lng: 72.87 },
    { n: 'LAX', lat: 33.94,  lng: -118.41 }
  ];
  var ROUTES = [
    [0,1],[1,2],[2,3],[0,5],[1,7],[3,9],[9,4],[4,5],[5,6],[3,8],[10,4],[11,5],[2,8],[1,6],[0,11]
  ];

  // glowing node markers
  var nPos = [];
  for (var ci = 0; ci < CITIES.length; ci++) {
    var v = latLngToVec(CITIES[ci].lat, CITIES[ci].lng, R * 1.005);
    nPos.push(v.x, v.y, v.z);
  }
  var nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nPos), 3));
  var nMat = new THREE.PointsMaterial({
    size: 0.62, map: sprite, color: 0xeaffff,
    transparent: true, opacity: 0.95, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  globe.add(new THREE.Points(nGeo, nMat));

  // build each arc as a quadratic bezier lifted above the surface; store the
  // curve so we can also animate a bright pulse sliding along it.
  var arcs = [];
  var ARC_SEG = 90;
  for (var ri = 0; ri < ROUTES.length; ri++) {
    var a = CITIES[ROUTES[ri][0]], b = CITIES[ROUTES[ri][1]];
    var va = latLngToVec(a.lat, a.lng, R);
    var vb = latLngToVec(b.lat, b.lng, R);
    // lift the control point above the midpoint, scaled by the gap distance
    var mid = va.clone().add(vb).multiplyScalar(0.5);
    var dist = va.distanceTo(vb);
    var lift = 1 + dist * 0.42 / R;
    var ctrl = mid.normalize().multiplyScalar(R * lift);
    var curve = new THREE.QuadraticBezierCurve3(va, ctrl, vb);
    var pts = curve.getPoints(ARC_SEG);

    // arc line geometry, colored with a soft fade toward the ends
    var lp = new Float32Array((ARC_SEG + 1) * 3);
    var lc = new Float32Array((ARC_SEG + 1) * 3);
    for (var s = 0; s <= ARC_SEG; s++) {
      lp[s * 3] = pts[s].x; lp[s * 3 + 1] = pts[s].y; lp[s * 3 + 2] = pts[s].z;
      var edge = Math.sin((s / ARC_SEG) * Math.PI); // 0 at ends, 1 mid
      tmp.copy(COL_ARC_A).lerp(COL_ARC_B, edge * 0.6);
      var f = 0.25 + edge * 0.75;
      lc[s * 3] = tmp.r * f; lc[s * 3 + 1] = tmp.g * f; lc[s * 3 + 2] = tmp.b * f;
    }
    var lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    lGeo.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    var lMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var line = new THREE.Line(lGeo, lMat);
    globe.add(line);

    // a single bright pulse point that rides the curve
    var pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    var pulseMat = new THREE.PointsMaterial({
      size: 1.5, map: sprite, color: 0xfff0d8,
      transparent: true, opacity: 0.0, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    var pulse = new THREE.Points(pulseGeo, pulseMat);
    globe.add(pulse);

    arcs.push({
      curve: curve,
      pulse: pulse,
      phase: Math.random(),                 // 0..1 progress
      speed: 0.16 + Math.random() * 0.18,    // per-second
      delay: Math.random() * 2.4             // staggered start
    });
  }

  // ===== 5. starfield (fixed behind, not part of the globe group) =====
  var STARS = 1400;
  var sPos = new Float32Array(STARS * 3);
  var sCol = new Float32Array(STARS * 3);
  for (var st = 0; st < STARS; st++) {
    // shell well outside the globe
    var u = Math.random() * 2 - 1;
    var ang = Math.random() * Math.PI * 2;
    var rr = Math.sqrt(1 - u * u);
    var rad = 90 + Math.random() * 130;
    sPos[st * 3] = Math.cos(ang) * rr * rad;
    sPos[st * 3 + 1] = u * rad;
    sPos[st * 3 + 2] = Math.sin(ang) * rr * rad;
    var w = 0.5 + Math.random() * 0.5;
    tmp.setRGB(w, w, Math.min(1, w + 0.18));
    sCol[st * 3] = tmp.r; sCol[st * 3 + 1] = tmp.g; sCol[st * 3 + 2] = tmp.b;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  var starMat = new THREE.PointsMaterial({
    size: 0.7, map: sprite, vertexColors: true,
    transparent: true, opacity: 0.85, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true
  });
  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ===== interaction: drag-to-spin with inertia + mouse parallax =====
  var dragging = false;
  var lastX = 0, lastY = 0;
  var velY = 0, velX = 0;          // angular velocity from dragging
  var autoSpin = reduce ? 0 : 0.085;
  var parX = 0, parY = 0;          // smoothed parallax target
  var pointerNX = 0, pointerNY = 0;

  function onDown(e) {
    dragging = true;
    canvas.classList.add('dragging');
    lastX = e.clientX; lastY = e.clientY;
    velY = 0; velX = 0;
    if (canvas.setPointerCapture && e.pointerId != null) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }
  function onMove(e) {
    pointerNX = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNY = (e.clientY / window.innerHeight) * 2 - 1;
    if (!dragging) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.0045;
    velX = dy * 0.0035;
    globe.rotation.y += velY;
    globe.rotation.x += velX;
    globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x));
  }
  function onUp(e) {
    dragging = false;
    canvas.classList.remove('dragging');
    if (canvas.releasePointerCapture && e && e.pointerId != null) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

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
  var pulseVec = new THREE.Vector3();

  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    // ---- rotation: auto-spin + inertial drag decay ----
    if (!dragging) {
      globe.rotation.y += autoSpin * dt;
      // inertia: keep the released momentum, decay smoothly
      globe.rotation.y += velY;
      globe.rotation.x += velX;
      globe.rotation.x = Math.max(-0.9, Math.min(0.9, globe.rotation.x));
      velY *= 0.95;
      velX *= 0.95;
      // ease x back toward level once inertia is spent
      if (Math.abs(velX) < 0.0004) globe.rotation.x += (0 - globe.rotation.x) * 0.01;
    }

    // ---- gentle mouse parallax on the whole world (not the spin) ----
    parX += (pointerNX - parX) * 0.05;
    parY += (pointerNY - parY) * 0.05;
    var pAmt = reduce ? 0.6 : 1.0;
    world.position.x += ((parX * 1.6 * pAmt) - world.position.x) * 0.06;
    world.position.y += ((-parY * 1.0 * pAmt) - world.position.y) * 0.06;
    camera.position.x += ((parX * 2.4 * pAmt) - camera.position.x) * 0.04;
    camera.lookAt(0, 0, 0);

    // ---- animate arc pulses along their curves ----
    for (var i = 0; i < arcs.length; i++) {
      var A = arcs[i];
      if (A.delay > 0) { A.delay -= dt; continue; }
      A.phase += (reduce ? A.speed * 0.5 : A.speed) * dt;
      if (A.phase > 1) { A.phase -= 1; A.delay = Math.random() * 1.6; }
      A.curve.getPoint(A.phase, pulseVec);
      var pa = A.pulse.geometry.getAttribute('position');
      pa.array[0] = pulseVec.x; pa.array[1] = pulseVec.y; pa.array[2] = pulseVec.z;
      pa.needsUpdate = true;
      // fade in/out at the ends so pulses appear to launch and land
      var env = Math.sin(A.phase * Math.PI);
      A.pulse.material.opacity = env * (reduce ? 0.7 : 0.95);
      A.pulse.material.size = 1.1 + env * 0.9;
    }

    // ---- slow star drift + twinkle ----
    if (!reduce) {
      stars.rotation.y += dt * 0.005;
      starMat.opacity = 0.72 + Math.sin(t * 0.6) * 0.12;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
`.trim()

export const threeGlobe: Template = {
  id: 'three-globe',
  kind: 'page',
  name: '3D Globe',
  tagline: 'An interactive WebGL globe with glowing arcs',
  categories: ['3D'],
  audiences: ['data', 'tech', 'marketing'],
  description:
    'A full-viewport WebGL globe set in deep space: thousands of points map the Earth as a dotted point cloud (continents emerge from the dot density), wrapped in a faint wireframe graticule and a soft additive atmosphere rim-glow. Great-circle arcs connect twelve major cities, each carrying a bright pulse that travels and re-launches on a stagger, over a drifting starfield. The planet auto-rotates, responds to drag-to-spin with inertial decay (auto-rotate pauses while dragging), and follows the cursor with gentle parallax — DPR capped at 2, resize-aware, prefers-reduced-motion respected. A minimal glass overlay (title, subtitle, legend, three stats) floats above. Built on a pinned three.js r128 UMD build — no image assets.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#03060f',
  notes:
    'The globe lives entirely in page.js using the global `THREE` (pinned r128 UMD via samplePage.libs). Main knobs near the top of the IIFE: R (globe radius), SAMPLES (point-cloud density), and the COL_* palette colors (COL_POINT/COL_LAND = sphere dots, COL_GRAT = graticule, COL_ATMO = atmosphere rim, COL_ARC_A/COL_ARC_B = arc + pulse). Continents are faked by the LAND array of [latMin,latMax,lngMin,lngMax] boxes — edit/add boxes to reshape the landmasses; ocean points are thinned to ~22% so land reads brighter. Cities live in the CITIES array (name/lat/lng) and connections in ROUTES (index pairs); add a city then a route to draw a new arc. Arc curvature is the `lift` factor; pulse speed/stagger are per-arc speed/delay. Auto-rotate speed is `autoSpin`; drag inertia decays via the 0.95 velocity factor. Motion is gated on prefers-reduced-motion (no auto-spin, calmer pulses, no twinkle). devicePixelRatio is capped at 2. The overlay text is a separate z-index:2 glass layer — recolor it via the --cyan/--deep/--warm/--gold CSS vars. No <img> assets — every point uses a canvas-drawn radial sprite.',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#03060f',
  },
}
