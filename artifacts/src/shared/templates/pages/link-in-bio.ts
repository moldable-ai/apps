import type { Template } from '../types'

// A mobile-first "link in bio" hub — Linktree, but exquisite. A narrow glass
// column floats over a slowly-drifting mesh gradient (animated radial-gradients,
// frozen under prefers-reduced-motion). Gradient avatar orb with an SVG monogram,
// a verified badge, glassmorphism pill links with leading icons + a trailing
// arrow, and a row of round social buttons. Pure CSS/SVG — zero imagery needed.

const CSS = `
:root {
  /* ---- palette knobs ---- */
  --bg: #0b0a1a;
  --mesh-1: #7c5cff;   /* violet  */
  --mesh-2: #ff5d9e;   /* pink    */
  --mesh-3: #2dd4bf;   /* teal    */
  --mesh-4: #ffb347;   /* amber   */
  --ink: #f4f2ff;
  --mut: #b3aed6;
  --faint: #837ea8;
  --glass: rgba(255,255,255,0.06);
  --glass-strong: rgba(255,255,255,0.10);
  --hair: rgba(255,255,255,0.14);
  --hair-soft: rgba(255,255,255,0.08);
  --accent: #b7a6ff;
  --orb: linear-gradient(135deg, var(--mesh-1), var(--mesh-2) 52%, var(--mesh-4));
  --display: 'Clash Display', 'Space Grotesk', system-ui, sans-serif;
  --body: 'Inter', system-ui, -apple-system, sans-serif;
  --page-font: var(--body);
}

/* ---- animated mesh-gradient backdrop ---- */
body {
  position: relative;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
  overflow-x: hidden;
}
.mesh {
  position: fixed; inset: -20% -10% -10% -10%; z-index: -2;
  background:
    radial-gradient(42vw 42vw at 18% 14%, color-mix(in srgb, var(--mesh-1) 88%, transparent), transparent 64%),
    radial-gradient(46vw 46vw at 84% 22%, color-mix(in srgb, var(--mesh-2) 82%, transparent), transparent 62%),
    radial-gradient(50vw 50vw at 72% 86%, color-mix(in srgb, var(--mesh-3) 70%, transparent), transparent 64%),
    radial-gradient(40vw 40vw at 14% 88%, color-mix(in srgb, var(--mesh-4) 64%, transparent), transparent 60%);
  filter: blur(46px) saturate(126%);
  opacity: 0.92;
  animation: drift 26s ease-in-out infinite alternate;
}
@keyframes drift {
  0%   { transform: translate3d(0,0,0) scale(1);     }
  50%  { transform: translate3d(2.5%,-3%,0) scale(1.08); }
  100% { transform: translate3d(-2.5%,2%,0) scale(1.04); }
}
/* a second, counter-moving layer for organic depth */
.mesh.b {
  inset: -10% -16% -22% -16%; z-index: -3;
  background:
    radial-gradient(34vw 34vw at 60% 6%, color-mix(in srgb, var(--mesh-2) 60%, transparent), transparent 60%),
    radial-gradient(38vw 38vw at 6% 50%, color-mix(in srgb, var(--mesh-3) 56%, transparent), transparent 62%),
    radial-gradient(42vw 42vw at 96% 70%, color-mix(in srgb, var(--mesh-1) 64%, transparent), transparent 60%);
  filter: blur(60px) saturate(118%);
  opacity: 0.7;
  animation: drift2 34s ease-in-out infinite alternate;
}
@keyframes drift2 {
  0%   { transform: translate3d(0,0,0) rotate(0deg); }
  100% { transform: translate3d(3%,-2.5%,0) rotate(8deg); }
}
/* subtle grain/vignette so the glass reads */
.veil {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 0%, transparent 38%, rgba(8,7,18,0.55) 100%);
}
@media (prefers-reduced-motion: reduce) {
  .mesh, .mesh.b { animation: none !important; }
}

/* ---- centered narrow column ---- */
.wrap {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  padding: clamp(40px, 9vh, 84px) clamp(18px, 5vw, 30px) clamp(40px, 7vh, 64px);
  display: flex; flex-direction: column; align-items: center;
}

/* ---- profile ---- */
.profile { text-align: center; display: flex; flex-direction: column; align-items: center; }
.avatar {
  position: relative; width: clamp(96px, 26vw, 124px); aspect-ratio: 1;
  border-radius: 50%; display: grid; place-items: center;
  box-shadow:
    0 18px 50px -16px color-mix(in srgb, var(--mesh-1) 70%, transparent),
    0 0 0 6px rgba(255,255,255,0.05),
    inset 0 1px 0 rgba(255,255,255,0.4);
  animation: float 7s ease-in-out infinite;
}
.avatar svg { width: 100%; height: 100%; display: block; border-radius: 50%; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@media (prefers-reduced-motion: reduce) { .avatar { animation: none; } }

.namerow {
  display: inline-flex; align-items: center; gap: 9px;
  margin: clamp(18px, 3.4vh, 26px) 0 0;
}
.name {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(26px, 7.4vw, 34px); letter-spacing: -0.02em; line-height: 1.04;
  margin: 0; color: var(--ink); text-wrap: balance;
}
.badge {
  flex: none; width: 22px; height: 22px; color: #fff;
  filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--mesh-1) 60%, transparent));
}
.handle {
  margin: 7px 0 0; font-size: 14.5px; font-weight: 500; letter-spacing: 0.01em;
  color: var(--accent);
}
.bio {
  margin: clamp(12px, 2.4vh, 16px) auto 0; max-width: 30ch;
  font-size: clamp(14.5px, 3.6vw, 15.5px); line-height: 1.55; color: var(--mut);
  text-wrap: balance;
}
.meta {
  display: inline-flex; align-items: center; gap: 8px 16px; flex-wrap: wrap;
  justify-content: center; margin-top: 14px;
  font-size: 12.5px; font-weight: 500; color: var(--faint);
}
.meta span { display: inline-flex; align-items: center; gap: 6px; }
.meta svg { width: 14px; height: 14px; opacity: 0.85; }
.meta .live::before {
  content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--mesh-3);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--mesh-3) 60%, transparent);
  animation: ping 2.4s infinite;
}
@keyframes ping {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--mesh-3) 55%, transparent); }
  70% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--mesh-3) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--mesh-3) 0%, transparent); }
}
@media (prefers-reduced-motion: reduce) { .meta .live::before { animation: none; } }

/* ---- link stack ---- */
.links {
  width: 100%; margin-top: clamp(26px, 4.6vh, 38px);
  display: flex; flex-direction: column; gap: 13px;
}
.link {
  position: relative; display: flex; align-items: center; gap: 15px;
  padding: 16px 18px; border-radius: 18px;
  background: var(--glass);
  border: 1px solid var(--hair);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  backdrop-filter: blur(16px) saturate(150%);
  box-shadow: 0 10px 30px -18px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10);
  color: var(--ink); cursor: pointer; overflow: hidden;
  transition: transform 0.34s cubic-bezier(0.22,1,0.36,1),
              box-shadow 0.34s cubic-bezier(0.22,1,0.36,1),
              border-color 0.34s ease, background 0.34s ease;
}
/* pointer-following glow (driven by --mx/--my from JS) */
.link::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(160px 120px at var(--mx, 50%) var(--my, 50%),
    color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%);
  opacity: 0; transition: opacity 0.3s ease;
}
.link:hover::before, .link:focus-visible::before { opacity: 1; }
/* moving sheen */
.link::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.16) 48%, transparent 64%);
  transform: translateX(-130%); transition: transform 0.7s cubic-bezier(0.22,1,0.36,1);
}
.link:hover, .link:focus-visible {
  transform: translateY(-3px);
  background: var(--glass-strong);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--hair));
  box-shadow:
    0 22px 50px -20px color-mix(in srgb, var(--mesh-1) 60%, transparent),
    0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent),
    inset 0 1px 0 rgba(255,255,255,0.18);
  outline: none;
}
.link:hover::after, .link:focus-visible::after { transform: translateX(130%); }
.link:active { transform: translateY(-1px) scale(0.992); }
.link:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent), 0 22px 50px -20px color-mix(in srgb, var(--mesh-1) 60%, transparent); }

.ic {
  flex: none; width: 42px; height: 42px; border-radius: 13px;
  display: grid; place-items: center; color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -8px rgba(0,0,0,0.6);
}
.ic svg { width: 21px; height: 21px; }
.ic.g1 { background: linear-gradient(140deg, var(--mesh-1), #5b3fd6); }
.ic.g2 { background: linear-gradient(140deg, var(--mesh-2), #d6275f); }
.ic.g3 { background: linear-gradient(140deg, var(--mesh-3), #0f9e8c); }
.ic.g4 { background: linear-gradient(140deg, var(--mesh-4), #f0871f); }
.ic.g5 { background: linear-gradient(140deg, #6ea8ff, #3f6fe0); }

.ltext { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ltitle { display: block; font-weight: 600; font-size: 15.5px; letter-spacing: -0.005em; line-height: 1.2; }
.lsub { display: block; margin-top: 2px; font-size: 12.5px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tag {
  flex: none; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 999px; margin-right: 2px;
  color: #0c0a1a; background: linear-gradient(120deg, var(--mesh-4), var(--mesh-2));
}
.arrow { flex: none; width: 20px; height: 20px; color: var(--faint); transition: transform 0.34s cubic-bezier(0.22,1,0.36,1), color 0.34s ease; }
.link:hover .arrow, .link:focus-visible .arrow { transform: translateX(4px); color: var(--ink); }

/* featured link gets a gradient ring */
.link.feature {
  background: color-mix(in srgb, var(--mesh-1) 18%, var(--glass));
  border-color: color-mix(in srgb, var(--accent) 45%, var(--hair));
}

/* ---- social row ---- */
.socials {
  display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
  margin-top: clamp(24px, 4.2vh, 34px);
}
.soc {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
  color: var(--ink);
  background: var(--glass);
  border: 1px solid var(--hair);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}
.soc svg { width: 20px; height: 20px; }
.soc:hover, .soc:focus-visible {
  transform: translateY(-3px) scale(1.06);
  background: var(--glass-strong);
  border-color: color-mix(in srgb, var(--accent) 55%, var(--hair));
  box-shadow: 0 14px 30px -16px color-mix(in srgb, var(--mesh-2) 60%, transparent);
  color: #fff; outline: none;
}
.soc:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent); }

/* ---- subscribe strip ---- */
.subscribe {
  width: 100%; margin-top: clamp(24px, 4vh, 34px);
  display: flex; gap: 8px; padding: 7px;
  background: var(--glass); border: 1px solid var(--hair-soft); border-radius: 16px;
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
}
.subscribe input {
  flex: 1; min-width: 0; border: 0; background: transparent; color: var(--ink);
  font: 500 14px var(--body); padding: 9px 12px; letter-spacing: 0.01em;
}
.subscribe input::placeholder { color: var(--faint); }
.subscribe input:focus { outline: none; }
.subscribe button {
  flex: none; border: 0; cursor: pointer; color: #0c0a1a; font: 700 13.5px var(--body);
  letter-spacing: 0.01em; padding: 0 18px; border-radius: 11px;
  background: linear-gradient(120deg, var(--mesh-4), var(--mesh-2));
  box-shadow: 0 8px 20px -10px color-mix(in srgb, var(--mesh-2) 70%, transparent);
  transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), filter 0.25s ease;
}
.subscribe button:hover, .subscribe button:focus-visible { transform: translateY(-1px); filter: brightness(1.06); outline: none; }
.subscribe button:focus-visible { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent); }
.subscribe.done button { background: var(--mesh-3); color: #052b27; }

/* ---- footer ---- */
.foot {
  margin-top: clamp(34px, 6vh, 52px); text-align: center;
  font-size: 12px; color: var(--faint); letter-spacing: 0.01em;
}
.foot a { color: var(--mut); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--hair); }
.foot a:hover { color: var(--ink); }
.foot .mk { display: inline-flex; align-items: center; gap: 6px; }
.foot .mk svg { width: 13px; height: 13px; color: var(--mesh-2); }

/* ---- reveal cascade ---- */
.reveal { transition-delay: 0.02s; }

@media (max-width: 640px) {
  .wrap { max-width: 440px; padding-top: clamp(34px, 7vh, 64px); }
  .links { gap: 12px; }
  .name { font-size: clamp(25px, 8vw, 31px); }
  .bio { max-width: 28ch; }
}
@media (max-width: 480px) {
  .wrap { padding-left: 16px; padding-right: 16px; }
  .lsub { font-size: 12px; }
  .socials { gap: 10px; }
}
@media (max-width: 360px) {
  .ic { width: 38px; height: 38px; }
  .link { padding: 14px 14px; gap: 12px; }
  .name { font-size: 25px; }
}
`.trim()

const HTML = `
<div class="mesh" aria-hidden="true"></div>
<div class="mesh b" aria-hidden="true"></div>
<div class="veil" aria-hidden="true"></div>

<main class="wrap">
  <section class="profile reveal" data-reveal="scale">
    <div class="avatar">
      <svg viewBox="0 0 124 124" role="img" aria-label="Avatar for Mira Solé">
        <defs>
          <linearGradient id="orb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7c5cff"/>
            <stop offset="0.52" stop-color="#ff5d9e"/>
            <stop offset="1" stop-color="#ffb347"/>
          </linearGradient>
          <radialGradient id="orbHi" cx="0.32" cy="0.26" r="0.7">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
            <stop offset="0.4" stop-color="#ffffff" stop-opacity="0.08"/>
            <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="62" cy="62" r="62" fill="url(#orb)"/>
        <circle cx="62" cy="62" r="62" fill="url(#orbHi)"/>
        <text x="62" y="63" text-anchor="middle" dominant-baseline="central"
          font-family="Clash Display, Space Grotesk, sans-serif" font-weight="600"
          font-size="50" letter-spacing="-2" fill="#fff" fill-opacity="0.96">MS</text>
      </svg>
    </div>

    <div class="namerow">
      <h1 class="name">Mira Solé</h1>
      <svg class="badge" viewBox="0 0 24 24" role="img" aria-label="Verified">
        <path fill="currentColor" d="M12 1.6l2.5 1.9 3.1-.3 1 3 2.7 1.6-1 3 1 3-2.7 1.6-1 3-3.1-.3L12 22.4l-2.5-1.9-3.1.3-1-3L2.7 16.2l1-3-1-3 2.7-1.6 1-3 3.1.3z"/>
        <path fill="#0b0a1a" d="M16.7 8.6l-5.9 5.9-3.5-3.5 1.4-1.4 2.1 2.1 4.5-4.5z"/>
      </svg>
    </div>
    <p class="handle">@mirabuilds</p>
    <p class="bio">Designer &amp; founder. I build calm software and write about taste, tools, and the craft of shipping.</p>

    <div class="meta">
      <span class="live">Available for projects</span>
      <span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
        Lisbon · GMT+0
      </span>
    </div>
  </section>

  <nav class="links" aria-label="Links">
    <a class="link feature reveal" href="#" target="_self" rel="noopener">
      <span class="ic g1" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-6 0v4"/><rect x="4" y="9" width="16" height="11" rx="2.5"/><path d="M12 14v2"/></svg>
      </span>
      <span class="ltext">
        <span class="ltitle">Atlas — my design system</span>
        <span class="lsub">Now in early access</span>
      </span>
      <span class="tag">New</span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>

    <a class="link reveal" href="#" target="_self" rel="noopener">
      <span class="ic g2" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H17l3 3v11.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M8 8h6M8 12h8M8 16h5"/></svg>
      </span>
      <span class="ltext">
        <span class="ltitle">Read the newsletter</span>
        <span class="lsub">Fridays · 9,400 subscribers</span>
      </span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>

    <a class="link reveal" href="#" target="_self" rel="noopener">
      <span class="ic g3" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/><rect x="3" y="5" width="18" height="14" rx="3"/></svg>
      </span>
      <span class="ltext">
        <span class="ltitle">Latest talk — Designing for calm</span>
        <span class="lsub">28 min · Config 2025</span>
      </span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>

    <a class="link reveal" href="#" target="_self" rel="noopener">
      <span class="ic g4" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/></svg>
      </span>
      <span class="ltext">
        <span class="ltitle">Case studies &amp; portfolio</span>
        <span class="lsub">Selected work, 2019–today</span>
      </span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>

    <a class="link reveal" href="#" target="_self" rel="noopener">
      <span class="ic g5" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/></svg>
      </span>
      <span class="ltext">
        <span class="ltitle">Book a coffee chat</span>
        <span class="lsub">30 min · a few slots left</span>
      </span>
      <svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>
  </nav>

  <div class="socials reveal" aria-label="Social profiles">
    <a class="soc" href="#" aria-label="Instagram" rel="noopener">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5.4"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>
    </a>
    <a class="soc" href="#" aria-label="X" rel="noopener">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M17.7 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2 3h6.4l4.4 5.9zM16.6 19.1h1.7L7.5 4.8H5.7z"/></svg>
    </a>
    <a class="soc" href="#" aria-label="GitHub" rel="noopener">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>
    </a>
    <a class="soc" href="#" aria-label="LinkedIn" rel="noopener">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.94 8.5v10.5H3.6V8.5zM5.27 3.5a1.94 1.94 0 1 1 0 3.88 1.94 1.94 0 0 1 0-3.88zM20.4 19h-3.34v-5.13c0-1.22-.02-2.8-1.7-2.8-1.7 0-1.97 1.33-1.97 2.71V19H10.1V8.5h3.2v1.43h.05c.45-.84 1.54-1.73 3.17-1.73 3.39 0 4.02 2.23 4.02 5.13z"/></svg>
    </a>
    <a class="soc" href="#" aria-label="YouTube" rel="noopener">
      <svg viewBox="0 0 24 24"><path fill="currentColor" d="M22.5 7.2a2.8 2.8 0 0 0-1.96-1.98C18.8 4.75 12 4.75 12 4.75s-6.8 0-8.54.47A2.8 2.8 0 0 0 1.5 7.2 29.2 29.2 0 0 0 1.03 12c0 1.62.16 3.24.47 4.8a2.8 2.8 0 0 0 1.96 1.98c1.74.47 8.54.47 8.54.47s6.8 0 8.54-.47a2.8 2.8 0 0 0 1.96-1.98c.31-1.56.47-3.18.47-4.8s-.16-3.24-.47-4.8zM9.9 15.3V8.7l5.7 3.3z"/></svg>
    </a>
  </div>

  <form class="subscribe reveal" id="sub" autocomplete="off">
    <input type="email" id="subEmail" placeholder="you@example.com" aria-label="Email address" required>
    <button type="submit" id="subBtn">Subscribe</button>
  </form>

  <footer class="foot reveal" data-reveal="none">
    <p class="mk">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-9.2C1 8 3 4.5 6.4 4.5c1.9 0 3.4 1 4.6 2.6 1.2-1.6 2.7-2.6 4.6-2.6 3.4 0 5.4 3.5 3.7 7.3C19 16.4 12 21 12 21z"/></svg>
      Built with care · <a href="#">mira.so</a>
    </p>
  </footer>
</main>
`.trim()

const JS = `
// Glow-follow: tint each link's sheen toward the pointer for a tactile feel.
document.querySelectorAll('.link').forEach(function (el) {
  el.addEventListener('pointermove', function (e) {
    var r = el.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
    var y = ((e.clientY - r.top) / r.height * 100).toFixed(1);
    el.style.setProperty('--mx', x + '%');
    el.style.setProperty('--my', y + '%');
  });
});

// Subscribe — purely local, no network. Confirms inline.
(function () {
  var form = document.getElementById('sub');
  if (!form) return;
  var btn = document.getElementById('subBtn');
  var input = document.getElementById('subEmail');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = (input.value || '').trim();
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v)) {
      input.focus();
      return;
    }
    form.classList.add('done');
    btn.textContent = 'Subscribed ✓';
    input.value = '';
    input.placeholder = 'See you Friday';
    input.blur();
    setTimeout(function () {
      form.classList.remove('done');
      btn.textContent = 'Subscribe';
      input.placeholder = 'you@example.com';
    }, 2600);
  });
})();
`.trim()

export const linkInBio: Template = {
  id: 'link-in-bio',
  kind: 'page',
  name: 'Link in Bio',
  tagline: 'A gorgeous mobile-first link hub',
  categories: ['Personal'],
  audiences: ['creator', 'personal', 'social'],
  description:
    'A mobile-first "link in bio" hub — Linktree, but exquisite. A narrow glass column floats over a slowly-drifting mesh-gradient backdrop: a gradient avatar orb with an SVG monogram, a verified badge and live-status meta, glassmorphism pill links with leading icons and a trailing arrow, a row of round social buttons, and a working inline subscribe strip. Pure CSS/SVG — no images, and the gradient freezes under reduced-motion.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0b0a1a',
  notes:
    'Mesh-gradient hub. Recolor everything from the four `--mesh-1..4` tokens (the avatar orb, icon tiles `.ic.g1..g5`, tags, and subscribe button all derive from them) plus `--bg`, `--ink`, `--mut`, and `--accent` (focus/hover glow). The backdrop is two animated `.mesh` layers; slow it via the `drift`/`drift2` durations or freeze by removing the `animation` (it already freezes under prefers-reduced-motion). Edit the profile in `.profile` — swap the monogram by changing the `<text>` inside the avatar `<svg>` and the gradient stops in `#orb`. Each link is an `<a class="link">` with an `.ic gN` icon tile, an `.ltitle`/`.lsub`, an optional `.tag`, and the trailing arrow; add `feature` to highlight one. Replace the `href="#"`/`@handle`/social icons with real destinations. The subscribe strip is local-only (no network) — wire it to a real endpoint or delete the `<form>`.',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0b0a1a',
  },
}
