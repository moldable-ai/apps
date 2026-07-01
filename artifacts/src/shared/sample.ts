// The seeded starter artifact — a self-contained welcome PAGE that doubles as a
// live demo of the page system (scroll-reveal, gradients, responsive layout).
// No external images, so it renders identically offline.
import type { Artifact } from './types'

const WELCOME_CSS = `
:root {
  --ink: #0b0b12;
  --paper: #f6f5f2;
  --accent: #6d5cff;
  --accent-2: #ff7a59;
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
}
body { background: var(--paper); color: var(--ink); font-family: var(--body); }
.wrap { max-width: 980px; margin: 0 auto; padding: 0 28px; }

.hero {
  min-height: 92vh; display: flex; flex-direction: column; justify-content: center;
  position: relative; overflow: hidden;
  background:
    radial-gradient(1100px 620px at 78% -8%, rgba(109,92,255,0.18), transparent 60%),
    radial-gradient(900px 560px at 8% 108%, rgba(255,122,89,0.16), transparent 60%),
    var(--paper);
}
.eyebrow {
  font-size: 13px; font-weight: 600; letter-spacing: 0.32em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 24px;
}
.hero h1 {
  font-family: var(--display); font-weight: 600; font-size: clamp(46px, 9vw, 104px);
  line-height: 0.98; letter-spacing: -0.025em; margin: 0; max-width: 14ch;
}
.hero h1 em { font-style: italic; color: var(--accent); }
.hero p {
  font-size: clamp(18px, 2.4vw, 23px); line-height: 1.5; color: #4a4a55;
  max-width: 46ch; margin: 30px 0 0;
}
.scrolltip { margin-top: 54px; font-size: 13px; letter-spacing: 0.06em; color: #8a8a96; display: flex; align-items: center; gap: 12px; }
.scrolltip::before { content: ''; width: 30px; height: 1px; background: #c9c7c0; }

.section { padding: 110px 0; }
.kick { font-size: 12px; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: var(--accent-2); }
.section h2 { font-family: var(--display); font-weight: 600; font-size: clamp(30px, 5vw, 52px); letter-spacing: -0.02em; margin: 14px 0 0; }
.section .sub { font-size: 19px; color: #54545f; margin: 18px 0 0; max-width: 52ch; line-height: 1.55; }

.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-top: 52px; }
.card {
  background: #fff; border: 1px solid rgba(11,11,18,0.07); border-radius: 20px; padding: 30px;
  box-shadow: 0 24px 60px -38px rgba(11,11,18,0.4);
}
.card .ic { font-size: 26px; }
.card h3 { font-family: var(--display); font-weight: 600; font-size: 23px; margin: 16px 0 8px; letter-spacing: -0.01em; }
.card p { font-size: 15px; line-height: 1.55; color: #5a5a64; margin: 0; }

.cta { text-align: center; padding: 130px 0; background: var(--ink); color: var(--paper); border-radius: 36px; margin: 40px 0 64px; }
.cta h2 { font-family: var(--display); font-weight: 600; font-size: clamp(32px, 6vw, 60px); letter-spacing: -0.02em; margin: 0; }
.cta p { color: #b6b6c4; font-size: 19px; margin: 22px auto 0; max-width: 40ch; line-height: 1.5; }
.chip { display: inline-flex; gap: 10px; align-items: center; margin-top: 38px; padding: 14px 24px; border-radius: 999px; background: linear-gradient(100deg, var(--accent), var(--accent-2)); color: #fff; font-weight: 600; font-size: 15px; }

footer { text-align: center; color: #9a9aa4; font-size: 13px; padding: 0 0 60px; }
`.trim()

const WELCOME_HTML = `
<header class="hero">
  <div class="wrap">
    <div class="eyebrow reveal">Moldable · Artifacts</div>
    <h1 class="reveal" data-reveal="none">Turn a chat into something<br><em>worth publishing.</em></h1>
    <p class="reveal">Dashboards, landing pages, specs, charts, games, 3D scenes, decks — describe what you want and watch it become a real, shareable web page.</p>
    <div class="scrolltip reveal">Scroll to explore</div>
  </div>
</header>

<section class="section">
  <div class="wrap">
    <div class="kick reveal">What you can make</div>
    <h2 class="reveal">One canvas, endless artifacts.</h2>
    <p class="sub reveal">Every artifact is a self-contained page (or a slide deck) you can publish to a link in one click. Pick a template to start, then steer it entirely from chat.</p>
    <div class="grid">
      <div class="card reveal"><div class="ic">📊</div><h3>Dashboards</h3><p>Live-looking analytics and financial charts, hand-built in SVG.</p></div>
      <div class="card reveal" data-reveal="scale"><div class="ic">🚀</div><h3>Landing pages</h3><p>Polished product sites with scroll animation and real type.</p></div>
      <div class="card reveal"><div class="ic">📐</div><h3>Specs & docs</h3><p>Crisp product specs with a sticky outline and status pills.</p></div>
      <div class="card reveal" data-reveal="scale"><div class="ic">🎮</div><h3>Games & 3D</h3><p>Canvas games and WebGL scenes that actually run.</p></div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="cta reveal" data-reveal="scale">
      <h2>Ready when you are.</h2>
      <p>Ask the assistant in chat: "Make me a landing page for…" or "Build a metrics dashboard from this data."</p>
      <div class="chip">Start in chat →</div>
    </div>
    <footer>Edit or replace this welcome page anytime — it's a regular Artifact.</footer>
  </div>
</section>
`.trim()

export function createWelcomeArtifact(id: string, now: string): Artifact {
  return {
    id,
    title: 'Welcome to Artifacts',
    subtitle: 'Turn a chat into something worth publishing',
    kind: 'page',
    density: 'low',
    templateId: undefined,
    theme: { fontLinks: [], css: '', stageBg: '#f6f5f2' },
    slides: [],
    page: {
      fontLinks: [
        'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap',
      ],
      libs: [],
      css: WELCOME_CSS,
      html: WELCOME_HTML,
      js: '',
      background: '#f6f5f2',
    },
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: now,
    updatedAt: now,
  }
}
