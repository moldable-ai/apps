import type { Template } from '../types'

// A warm, editorial personal homepage for one human. Circular portrait inside a
// slowly-rotating conic-gradient ring (with a gradient fallback so a missing
// photo still looks intentional), an Instrument/Fraunces serif "Hi, I'm ___"
// hero, social links with inline SVG icons, an About paragraph, a "Now" list,
// a Selected-work trio of gradient link cards, a Writing list, and a generous
// gradient footer with an email CTA. Pure CSS/SVG, one warm terracotta accent.

const CSS = `
:root {
  --bg: #faf9f7;
  --ink: #211d1a;        /* warm near-black */
  --soft: #6a615a;       /* muted body      */
  --faint: #9b9089;      /* captions/tags   */
  --line: #ece7e1;       /* hairlines       */
  --card: #ffffff;
  --accent: #d8623a;     /* warm terracotta */
  --accent-2: #e7a23a;   /* amber           */
  --accent-3: #b8587a;   /* dusk rose       */
  --ring: conic-gradient(from 210deg, var(--accent), var(--accent-2), var(--accent-3), var(--accent));
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --maxw: 720px;
}
body { background:
  radial-gradient(720px 420px at 88% -8%, rgba(216,98,58,0.10), transparent 62%),
  radial-gradient(560px 380px at -6% 12%, rgba(231,162,58,0.09), transparent 60%),
  var(--bg);
  color: var(--ink); line-height: 1.6; }
.wrap { max-width: var(--maxw); margin: 0 auto; padding: clamp(54px, 9vw, 104px) clamp(22px, 5vw, 32px) 0; }
.num { font-variant-numeric: tabular-nums; }
a { color: inherit; }
::selection { background: rgba(216,98,58,0.20); }

/* ---------- HERO ---------- */
.hero { display: grid; grid-template-columns: auto 1fr; gap: clamp(22px, 4.5vw, 40px); align-items: center; }
.avatar { position: relative; width: clamp(116px, 22vw, 156px); aspect-ratio: 1; flex: none; }
.avatar .ring {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--ring); padding: 4px;
  -webkit-mask: radial-gradient(circle, transparent 0, transparent calc(100% - 5px), #000 calc(100% - 5px));
          mask: radial-gradient(circle, transparent 0, transparent calc(100% - 5px), #000 calc(100% - 5px));
  animation: spin 14s linear infinite;
}
@media (prefers-reduced-motion: reduce) { .avatar .ring { animation: none; } }
@keyframes spin { to { transform: rotate(360deg); } }
.avatar .photo {
  position: absolute; inset: 9px; border-radius: 50%; overflow: hidden;
  /* gradient fallback shows if the portrait is missing */
  background: linear-gradient(150deg, #f6d8c4, #f0b59a 42%, #e7a23a 78%, var(--accent));
  box-shadow: 0 16px 40px -16px rgba(120,52,28,0.55), inset 0 0 0 1px rgba(255,255,255,0.5);
}
.avatar .photo::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 50% at 50% 22%, rgba(255,255,255,0.45), transparent 70%);
  mix-blend-mode: screen; pointer-events: none;
}
.avatar .photo img { width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 1; }
.avatar .badge {
  position: absolute; right: -2px; bottom: 6px; z-index: 3;
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--card); border: 1px solid var(--line);
  display: grid; place-items: center; font-size: 17px;
  box-shadow: 0 8px 22px -8px rgba(80,40,20,0.4);
  animation: wave 2.6s ease-in-out infinite; transform-origin: 70% 80%;
}
@media (prefers-reduced-motion: reduce) { .avatar .badge { animation: none; } }
@keyframes wave { 0%,60%,100%{ transform: rotate(0); } 10%{ transform: rotate(16deg);} 20%{ transform: rotate(-10deg);} 30%{ transform: rotate(16deg);} 40%{ transform: rotate(-6deg);} 50%{ transform: rotate(10deg);} }

.intro .avail {
  display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600;
  color: var(--accent); letter-spacing: 0.02em; margin-bottom: 12px;
}
.intro .avail::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 0 0 rgba(216,98,58,0.5); animation: glow 2.2s infinite; }
@keyframes glow { 70%{ box-shadow: 0 0 0 7px rgba(216,98,58,0); } 100%{ box-shadow: 0 0 0 0 rgba(216,98,58,0); } }
.intro h1 {
  font-family: var(--display); font-weight: 540; font-optical-sizing: auto;
  font-size: clamp(33px, 7.4vw, 56px); line-height: 1.02; letter-spacing: -0.015em;
  margin: 0; text-wrap: balance;
}
.intro h1 .em { font-style: italic; color: var(--accent); }
.intro h1 .dash { color: var(--faint); font-weight: 400; }
.intro .role { color: var(--soft); font-size: clamp(15px, 2.4vw, 18px); margin: 12px 0 0; max-width: 30ch; text-wrap: pretty; }

/* ---------- SOCIAL LINKS ---------- */
.socials { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 22px; }
.socials a {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
  font-size: 13.5px; font-weight: 550; color: var(--ink);
  padding: 8px 14px 8px 11px; border-radius: 999px; background: var(--card);
  border: 1px solid var(--line); transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, color .18s ease;
}
.socials a svg { width: 16px; height: 16px; }
.socials a:hover { transform: translateY(-2px); border-color: rgba(216,98,58,0.45); color: var(--accent);
  box-shadow: 0 10px 24px -14px rgba(120,52,28,0.5); }
.socials a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* ---------- SECTIONS ---------- */
.section { margin-top: clamp(54px, 9vw, 88px); }
.eyebrow {
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--accent); display: inline-flex; align-items: center; gap: 12px; margin: 0 0 20px;
}
.eyebrow::before { content: ''; width: 26px; height: 1.5px; background: currentColor; opacity: 0.6; }
.lead { font-size: clamp(18px, 3.1vw, 22px); line-height: 1.62; color: var(--ink); margin: 0 0 18px;
  font-family: var(--display); font-weight: 430; letter-spacing: -0.005em; text-wrap: pretty; }
.about p { color: var(--soft); margin: 0 0 14px; font-size: 15.5px; }
.about p:last-child { margin-bottom: 0; }
.about a.tx { color: var(--ink); text-decoration: none; border-bottom: 1.5px solid rgba(216,98,58,0.4); transition: border-color .18s; }
.about a.tx:hover { border-color: var(--accent); }

/* ---------- NOW LIST ---------- */
.now { display: flex; flex-direction: column; }
.now .item {
  display: grid; grid-template-columns: 30px 1fr auto; gap: 14px; align-items: baseline;
  padding: 16px 0; border-top: 1px solid var(--line);
}
.now .item:first-child { border-top: 0; }
.now .ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; font-size: 15px;
  background: linear-gradient(150deg, rgba(216,98,58,0.13), rgba(231,162,58,0.16)); align-self: center; }
.now .txt b { font-weight: 600; font-size: 15.5px; display: block; }
.now .txt span { color: var(--soft); font-size: 14px; }
.now .tag { font-size: 12px; font-weight: 600; color: var(--faint); white-space: nowrap; align-self: center;
  font-variant-numeric: tabular-nums; }

/* ---------- WORK CARDS ---------- */
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.cards .full { grid-column: 1 / -1; }
.card {
  position: relative; display: block; text-decoration: none; color: var(--ink);
  border-radius: 20px; overflow: hidden; background: var(--card); border: 1px solid var(--line);
  transition: transform .26s cubic-bezier(.22,1,.36,1), box-shadow .26s, border-color .26s;
}
.card:hover { transform: translateY(-4px); box-shadow: 0 26px 50px -28px rgba(90,45,22,0.5); border-color: rgba(216,98,58,0.35); }
.card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.card .cover { height: 152px; position: relative; overflow: hidden; }
.card.full .cover { height: 188px; }
.card .cover svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.card .body { padding: 16px 18px 18px; }
.card .kind { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
.card h3 { font-family: var(--display); font-weight: 540; font-size: 19px; letter-spacing: -0.01em; margin: 7px 0 5px; }
.card p { color: var(--soft); font-size: 13.8px; margin: 0; }
.card .go {
  position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,0.86); backdrop-filter: blur(6px); display: grid; place-items: center;
  color: var(--ink); transform: translateY(-6px) scale(0.86); opacity: 0; transition: transform .26s cubic-bezier(.22,1,.36,1), opacity .26s; z-index: 2;
}
.card:hover .go { transform: none; opacity: 1; }
.card .go svg { width: 16px; height: 16px; }

/* ---------- WRITING ---------- */
.posts { display: flex; flex-direction: column; }
.posts a {
  display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: baseline;
  text-decoration: none; color: var(--ink); padding: 17px 6px 17px 0; border-top: 1px solid var(--line);
  position: relative; transition: padding-left .22s ease;
}
.posts a:first-child { border-top: 0; }
.posts a::before { content: ''; position: absolute; left: -2px; top: 50%; width: 0; height: 1.5px;
  background: var(--accent); transform: translateY(-50%); transition: width .22s ease; }
.posts a:hover { padding-left: 22px; }
.posts a:hover::before { width: 14px; }
.posts a:hover .ptitle { color: var(--accent); }
.posts a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
.posts .ptitle { font-size: 16px; font-weight: 540; transition: color .2s; }
.posts .meta { color: var(--faint); font-size: 12.5px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.posts .meta .dot { opacity: 0.5; margin: 0 6px; }

/* ---------- FOOTER CTA ---------- */
.cta { margin-top: clamp(64px, 10vw, 104px); margin-bottom: clamp(40px, 7vw, 72px);
  border-radius: 28px; padding: clamp(34px, 6vw, 58px) clamp(26px, 5vw, 48px); position: relative; overflow: hidden;
  background: linear-gradient(135deg, #2a1410 0%, #5e2417 44%, var(--accent) 88%, var(--accent-2));
  color: #fff7f2; }
.cta::before { content: ''; position: absolute; inset: 0;
  background: radial-gradient(420px 280px at 84% 12%, rgba(255,210,150,0.42), transparent 60%); pointer-events: none; }
/* SVG is a replaced element: without explicit width/height it uses its intrinsic
   300×150 and inset:0 does NOT stretch it — it pins to the top-left as a hard
   rectangular noise patch. Force it to fill the whole card. */
.cta .grain { position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0.5; mix-blend-mode: overlay; pointer-events: none; }
.cta-in { position: relative; z-index: 1; }
.cta h2 { font-family: var(--display); font-weight: 540; font-size: clamp(26px, 5.4vw, 40px); line-height: 1.05;
  letter-spacing: -0.018em; margin: 0; text-wrap: balance; }
.cta h2 .em { font-style: italic; }
.cta p { color: rgba(255,247,242,0.82); font-size: clamp(14.5px, 2.3vw, 16px); margin: 14px 0 26px; max-width: 44ch; }
.cta .btn {
  display: inline-flex; align-items: center; gap: 10px; text-decoration: none;
  background: #fff7f2; color: #5e2417; font-weight: 650; font-size: 15px;
  padding: 13px 22px; border-radius: 999px; transition: transform .18s ease, box-shadow .18s ease;
  box-shadow: 0 14px 34px -14px rgba(0,0,0,0.6);
}
.cta .btn:hover { transform: translateY(-2px); box-shadow: 0 20px 44px -16px rgba(0,0,0,0.7); }
.cta .btn:focus-visible { outline: 2px solid #fff7f2; outline-offset: 3px; }
.cta .btn svg { width: 16px; height: 16px; }
.cta .sub { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 26px; padding-top: 22px;
  border-top: 1px solid rgba(255,247,242,0.18); font-size: 13px; color: rgba(255,247,242,0.74); }
.cta .sub a { color: rgba(255,247,242,0.92); text-decoration: none; border-bottom: 1px solid rgba(255,247,242,0.3); }
.cta .sub a:hover { border-color: rgba(255,247,242,0.85); }
.cta .sub .who { margin-left: auto; opacity: 0.7; }

/* ---------- REVEAL polish ---------- */
.reveal .card, .reveal .now .item, .reveal .posts a { will-change: transform; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 640px) {
  .hero { grid-template-columns: 1fr; gap: 18px; text-align: left; }
  .cards { grid-template-columns: 1fr; }
  .now .item { grid-template-columns: 28px 1fr; }
  .now .tag { grid-column: 2; padding-top: 2px; }
  .posts a { grid-template-columns: 1fr; gap: 4px; }
  .posts .meta { order: 2; }
  .cta .sub .who { margin-left: 0; width: 100%; }
}
`.trim()

const HTML = `
<div class="wrap">

  <header class="hero reveal" data-reveal="none">
    <div class="avatar">
      <div class="ring"></div>
      <div class="photo"><img src="assets/portrait.jpg" alt="Portrait of Maya Okonkwo, smiling in warm daylight" loading="lazy"/></div>
      <div class="badge" aria-hidden="true">&#128075;</div>
    </div>
    <div class="intro">
      <span class="avail">Open to new projects</span>
      <h1>Hi, I&rsquo;m <span class="em">Maya</span> <span class="dash">&mdash;</span> I design calm software for messy human problems.</h1>
      <p class="role">Product designer &amp; occasional code-poet, currently in Lisbon.</p>
      <nav class="socials" aria-label="Find me elsewhere">
        <a href="mailto:hi@mayaokonkwo.com">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>
          Email
        </a>
        <a href="https://github.com/maya" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05a9.3 9.3 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"/></svg>
          GitHub
        </a>
        <a href="https://dribbble.com/maya" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9.5"/><path d="M5 7c4 4 9 5 14 4.5M3.5 14c5-1.5 9 1 11.5 5M9 3c4 5 5.5 11 5 18" stroke-linecap="round"/></svg>
          Dribbble
        </a>
        <a href="https://read.cv/maya" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
          CV
        </a>
      </nav>
    </div>
  </header>

  <section class="section about reveal">
    <h2 class="eyebrow">About</h2>
    <p class="lead">I&rsquo;ve spent the last decade turning tangled workflows into interfaces that feel obvious in hindsight &mdash; the kind you stop noticing because they simply work.</p>
    <p>I started out as a print designer, took a hard left into front-end, and have been happiest ever since living in the seam between the two. These days I lead product design at a small fintech, where I get to obsess over latency, empty states, and the exact radius of a button. Before that I shipped design systems at two startups and one very large bank.</p>
    <p>Off the clock you&rsquo;ll find me letterpress-printing on a 1962 Vandercook, training for a half-marathon I keep postponing, or trying to make the perfect cup of <a class="tx" href="#">cortado</a>. I write about craft, calm, and the small decisions that add up to good software.</p>
  </section>

  <section class="section reveal">
    <h2 class="eyebrow">What I&rsquo;m doing now</h2>
    <div class="now">
      <div class="item">
        <span class="ic" aria-hidden="true">&#127919;</span>
        <span class="txt"><b>Leading design at Ledgerline</b><span>Rebuilding the money-movement flow from the ground up.</span></span>
        <span class="tag">Since 2024 &middot; Lisbon</span>
      </div>
      <div class="item">
        <span class="ic" aria-hidden="true">&#128214;</span>
        <span class="txt"><b>Writing a short field guide</b><span>&ldquo;Calm Defaults&rdquo; &mdash; notes on designing software that gets out of the way.</span></span>
        <span class="tag">In progress</span>
      </div>
      <div class="item">
        <span class="ic" aria-hidden="true">&#127912;</span>
        <span class="txt"><b>Open for one project this fall</b><span>Brand &amp; product design for early-stage, mission-led teams.</span></span>
        <span class="tag">Oct 2026</span>
      </div>
      <div class="item">
        <span class="ic" aria-hidden="true">&#127939;</span>
        <span class="txt"><b>Training, slowly</b><span>Half-marathon along the Tejo. The river does most of the convincing.</span></span>
        <span class="tag">Weekends</span>
      </div>
    </div>
  </section>

  <section class="section reveal">
    <h2 class="eyebrow">Selected work</h2>
    <div class="cards">
      <a class="card full" href="#" aria-label="Ledgerline — read the case study">
        <div class="cover">
          <svg viewBox="0 0 600 188" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="cv1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8623a"/><stop offset="0.55" stop-color="#b8587a"/><stop offset="1" stop-color="#7c3aa0"/></linearGradient></defs>
            <rect width="600" height="188" fill="url(#cv1)"/>
            <g fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2">
              <circle cx="470" cy="40" r="120"/><circle cx="470" cy="40" r="80"/><circle cx="470" cy="40" r="40"/>
            </g>
            <g fill="rgba(255,255,255,0.92)"><rect x="44" y="118" width="46" height="34" rx="5"/><rect x="100" y="96" width="46" height="56" rx="5"/><rect x="156" y="70" width="46" height="82" rx="5"/><rect x="212" y="104" width="46" height="48" rx="5"/></g>
          </svg>
        </div>
        <div class="go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></div>
        <div class="body"><div class="kind">Product &middot; Fintech</div><h3>Ledgerline &mdash; money that moves at the speed of trust</h3><p>Redesigned the transfer flow end-to-end. Error rates fell 38% and support tickets dropped by a third in the first quarter.</p></div>
      </a>

      <a class="card" href="#" aria-label="Northwind design system — read the case study">
        <div class="cover">
          <svg viewBox="0 0 300 152" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="cv2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f6f63"/><stop offset="1" stop-color="#3fb59b"/></linearGradient></defs>
            <rect width="300" height="152" fill="url(#cv2)"/>
            <g fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.4">
              <rect x="40" y="38" width="64" height="42" rx="8"/><rect x="120" y="38" width="64" height="42" rx="8"/><rect x="200" y="38" width="64" height="42" rx="8"/>
              <rect x="80" y="96" width="64" height="22" rx="11"/><rect x="160" y="96" width="64" height="22" rx="11"/>
            </g>
          </svg>
        </div>
        <div class="go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></div>
        <div class="body"><div class="kind">Design System</div><h3>Northwind UI</h3><p>A 180-component system adopted by nine teams, with zero-config theming.</p></div>
      </a>

      <a class="card" href="#" aria-label="Cortado — read the case study">
        <div class="cover">
          <svg viewBox="0 0 300 152" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="cv3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e7a23a"/><stop offset="1" stop-color="#d8623a"/></linearGradient></defs>
            <rect width="300" height="152" fill="url(#cv3)"/>
            <g fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2.6" stroke-linecap="round">
              <path d="M70 50h120v34a40 40 0 0 1-40 40h-40a40 40 0 0 1-40-40Z"/><path d="M190 60h22a18 18 0 0 1 0 36h-22"/><path d="M96 30c0 8-6 8-6 16M126 28c0 8-6 8-6 16M156 30c0 8-6 8-6 16"/>
            </g>
          </svg>
        </div>
        <div class="go" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></div>
        <div class="body"><div class="kind">Side project</div><h3>Cortado</h3><p>A tiny app that rates espresso by feel, not jargon. 12k happy sippers.</p></div>
      </a>
    </div>
  </section>

  <section class="section reveal">
    <h2 class="eyebrow">Writing</h2>
    <div class="posts">
      <a href="#"><span class="ptitle">Calm defaults: designing software that gets out of the way</span><span class="meta">Apr 2026<span class="dot">&middot;</span>8 min</span></a>
      <a href="#"><span class="ptitle">The empty state is the whole product</span><span class="meta">Feb 2026<span class="dot">&middot;</span>6 min</span></a>
      <a href="#"><span class="ptitle">What letterpress taught me about latency</span><span class="meta">Nov 2025<span class="dot">&middot;</span>5 min</span></a>
    </div>
  </section>

  <footer class="cta reveal" data-reveal="scale">
    <svg class="grain" aria-hidden="true"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"/></filter><rect width="100%" height="100%" filter="url(#gr)"/></svg>
    <div class="cta-in">
      <h2>Let&rsquo;s make something <span class="em">quietly good.</span></h2>
      <p>I take on a couple of focused projects each year. If you&rsquo;re building something humane and need a designer who codes, I&rsquo;d love to hear about it.</p>
      <a class="btn" href="mailto:hi@mayaokonkwo.com">
        Say hello
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>
      <div class="sub">
        <span>Replies within a day</span>
        <a href="mailto:hi@mayaokonkwo.com">hi@mayaokonkwo.com</a>
        <span class="who">&copy; 2026 Maya Okonkwo</span>
      </div>
    </div>
  </footer>

</div>
`.trim()

const JS = `
// Tilt the work cards toward the cursor — subtle, taste over flash.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
  var cards = document.querySelectorAll('.card');
  cards.forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      var rx = (py * -4).toFixed(2);
      var ry = (px * 6).toFixed(2);
      card.style.transform = 'translateY(-4px) perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });
})();
`.trim()

export const personalSite: Template = {
  id: 'personal-site',
  kind: 'page',
  name: 'Personal Website',
  tagline: 'A warm "hi, I\'m ___" homepage with portrait + work',
  categories: ['Personal'],
  audiences: ['personal', 'creative', 'developer'],
  description:
    'A warm, editorial personal homepage for one human: a circular portrait inside a slowly-rotating conic-gradient ring, a friendly Fraunces serif "Hi, I\'m ___" hero with social links, a personable About, a "What I\'m doing now" list, a Selected-work trio of gradient cover cards, a Writing list, and a generous gradient footer with an email CTA. Pure CSS/SVG, one warm terracotta accent, fully responsive with tasteful scroll-reveal.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#faf9f7',
  assets: ['portrait.jpg'],
  notes:
    'Make it yours by editing the copy directly in HTML — the name in the `<h1>` (two spots: hero + footer `&copy;`), the `.role` one-liner, the four `.now .item` rows, the three work `.card`s, and the three `.posts` links. Palette knobs live in `:root`: `--accent` (terracotta) is the single warm accent, with `--accent-2` (amber) and `--accent-3` (rose) feeding the conic portrait `--ring` and the work-card cover gradients; `--bg` is the off-white, `--ink`/`--soft`/`--faint` are the text ramp. Swap the portrait by replacing assets/portrait.jpg — the `.photo` figure has a warm gradient + sheen fallback so a missing image still looks intentional. Card covers are inline SVG (recolor the `#cv1..#cv3` gradients). The ring spin, badge wave, and card cursor-tilt all respect prefers-reduced-motion. Narrow the page with `--maxw`.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..600;1,9..144,400..600&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#faf9f7',
  },
}
