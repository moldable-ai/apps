import type { Template } from '../types'

// An editorial, image-forward CASE STUDY / scrollytelling page for a fictional
// fragrance relaunch ("Aera"). Warm-neutral cream + ink palette with a
// terracotta/gold accent, a high-contrast Fraunces serif display over a clean
// Inter body. Full-bleed scrimmed hero, hairline meta row, large-measure intro,
// a big pull quote, a two-up image section with one parallax image (driven by
// var(--scroll-y)), a tabular results band, and a credits footer. Reveals key
// off `.reveal.in`; image hover-zoom + parallax are pure CSS. Uses the three
// bundled case-study images — no generated imagery beyond what's listed.

const CSS = `
:root {
  --cream: #f6f1ea;
  --cream-2: #efe7db;
  --ink: #1a1714;
  --ink-soft: #423b34;
  --mut: #8a7f72;
  --faint: #b6a999;
  --line: rgba(26,23,20,0.14);
  --accent: #b9603a;     /* terracotta */
  --gold: #c8964e;       /* warm gold  */
  --display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  --measure: 62ch;
}
body { background: var(--cream); color: var(--ink); }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 64px); }
.narrow { max-width: 760px; }

/* ===== HERO (full-bleed image + soft dark scrim + bottom-aligned title) ===== */
.hero { position: relative; height: clamp(560px, 96svh, 940px); min-height: 520px; overflow: hidden; display: flex; }
.hero__img {
  position: absolute; inset: -8% 0 0 0; width: 100%; height: 116%;
  background: url('assets/case-study-hero.jpg') center 38% / cover no-repeat;
  /* gentle parallax — image drifts slower than the page */
  transform: translateY(calc(var(--scroll-y, 0px) * 0.08));
  will-change: transform;
}
.hero__scrim {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(16,12,9,0.34) 0%, rgba(16,12,9,0.06) 34%, rgba(16,12,9,0.30) 66%, rgba(16,12,9,0.74) 100%);
}
.hero__inner { position: relative; align-self: flex-end; width: 100%; padding-bottom: clamp(40px, 7vw, 84px); }
.hero__eyebrow {
  display: inline-flex; align-items: center; gap: 14px;
  color: #f3e7d8; font: 700 13px/1 var(--body);
  letter-spacing: 0.32em; text-transform: uppercase;
}
.hero__eyebrow::before { content: ''; width: 46px; height: 1px; background: var(--gold); opacity: 0.9; }
.hero__title {
  font-family: var(--display); font-weight: 340; font-optical-sizing: auto;
  font-size: clamp(48px, 10vw, 150px); line-height: 0.94; letter-spacing: -0.02em;
  color: #fbf6ee; margin: 22px 0 0; text-wrap: balance;
  text-shadow: 0 2px 40px rgba(0,0,0,0.28);
}
.hero__title em { font-style: italic; font-weight: 360; color: #f0d8ba; }
.hero__sub {
  margin: 22px 0 0; max-width: 46ch;
  font: 400 clamp(16px, 1.5vw, 21px)/1.5 var(--body);
  color: rgba(251,246,238,0.86);
}

/* ===== META ROW (hairline-divided label/value pairs) ===== */
.meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin: clamp(46px, 6vw, 84px) 0 clamp(40px, 5vw, 70px); border-top: 1px solid var(--line); }
.meta__cell { padding: 26px 30px 4px 0; border-right: 1px solid var(--line); }
.meta__cell:last-child { border-right: 0; }
.meta__cell:not(:first-child) { padding-left: 30px; }
.meta__k { font: 700 11.5px/1 var(--body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
.meta__v { margin-top: 12px; font: 500 clamp(16px, 1.5vw, 19px)/1.4 var(--body); color: var(--ink); }
.meta__v span { display: block; color: var(--ink-soft); font-weight: 400; }

/* ===== INTRO / CHALLENGE ===== */
.intro { margin: 0 0 clamp(56px, 8vw, 110px); }
.intro__kicker { font: 700 12px/1 var(--body); letter-spacing: 0.22em; text-transform: uppercase; color: var(--mut); }
.lede {
  font-family: var(--display); font-weight: 380; font-optical-sizing: auto;
  font-size: clamp(26px, 3.6vw, 44px); line-height: 1.22; letter-spacing: -0.015em;
  color: var(--ink); margin: 22px 0 0; text-wrap: balance; max-width: 20ch;
}
.lede em { font-style: italic; color: var(--accent); }
.copy {
  margin: 30px 0 0; max-width: var(--measure);
  font: 400 clamp(16px, 1.35vw, 19px)/1.72 var(--body); color: var(--ink-soft);
}
.copy + .copy { margin-top: 22px; }
.copy strong { color: var(--ink); font-weight: 600; }
.copy.drop::first-letter {
  font-family: var(--display); font-weight: 360; float: left;
  font-size: 4.4em; line-height: 0.78; padding: 6px 14px 0 0; color: var(--accent);
}

/* ===== PULL QUOTE ===== */
.pull { margin: clamp(46px, 7vw, 96px) 0; text-align: center; }
.pull blockquote {
  font-family: var(--display); font-weight: 360; font-optical-sizing: auto;
  font-size: clamp(30px, 5vw, 68px); line-height: 1.1; letter-spacing: -0.02em;
  color: var(--ink); margin: 0 auto; max-width: 18ch; text-wrap: balance;
}
.pull blockquote em { font-style: italic; color: var(--accent); }
.pull .mark { font-family: var(--display); font-size: clamp(54px, 9vw, 120px); line-height: 0.4; color: var(--gold); display: block; height: 0.5em; }
.pull cite { display: block; margin-top: 34px; font: 600 13px/1 var(--body); letter-spacing: 0.16em; text-transform: uppercase; color: var(--mut); font-style: normal; }

/* ===== IMAGE SECTION (two-up: landscape + portrait) ===== */
.gallery { display: grid; grid-template-columns: 1.42fr 1fr; gap: clamp(20px, 3vw, 44px); align-items: end; margin: clamp(40px, 5vw, 72px) 0; }
.shot { margin: 0; }
.shot__frame {
  position: relative; overflow: hidden; border-radius: 4px;
  background: var(--cream-2); box-shadow: 0 30px 70px -34px rgba(26,18,12,0.5);
}
.shot__frame img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform 1.1s cubic-bezier(0.2,0.8,0.2,1); }
.shot__frame:hover img { transform: scale(1.045); }
.shot--wide .shot__frame { aspect-ratio: 4 / 3; }
.shot--tall .shot__frame { aspect-ratio: 3 / 4; }
/* parallax on the tall portrait image's inner picture */
.shot--tall .shot__frame img { transform: translateY(calc(var(--scroll-y, 0px) * -0.018)) scale(1.06); }
.shot--tall .shot__frame:hover img { transform: translateY(calc(var(--scroll-y, 0px) * -0.018)) scale(1.1); }
.shot figcaption { display: flex; gap: 14px; margin-top: 16px; font: 400 13.5px/1.45 var(--body); color: var(--mut); }
.shot figcaption b { color: var(--accent); font-weight: 700; flex: none; }

/* second narrative beat between gallery and results */
.beat { margin: clamp(48px, 7vw, 96px) 0; }
.beat h2 {
  font-family: var(--display); font-weight: 360; font-size: clamp(28px, 4vw, 52px);
  line-height: 1.06; letter-spacing: -0.018em; color: var(--ink); margin: 0 0 26px; max-width: 16ch; text-wrap: balance;
}
.beat h2 em { font-style: italic; color: var(--accent); }

/* ===== RESULTS BAND (big tabular metrics) ===== */
.results { background: var(--ink); color: var(--cream); margin: clamp(60px, 9vw, 130px) 0 0; padding: clamp(64px, 9vw, 128px) 0; position: relative; overflow: hidden; }
.results::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(900px 460px at 82% -8%, rgba(200,150,78,0.22), transparent 62%);
  pointer-events: none;
}
.results__head { position: relative; }
.results__kicker { font: 700 12px/1 var(--body); letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold); }
.results__title { font-family: var(--display); font-weight: 360; font-size: clamp(28px, 4vw, 52px); line-height: 1.04; letter-spacing: -0.018em; color: var(--cream); margin: 18px 0 0; max-width: 18ch; text-wrap: balance; }
.results__grid { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(28px, 4vw, 64px); margin-top: clamp(48px, 6vw, 86px); }
.stat { border-top: 1px solid rgba(246,241,234,0.18); padding-top: 26px; }
.stat__num { font-family: var(--display); font-weight: 340; font-size: clamp(50px, 8vw, 104px); line-height: 0.92; letter-spacing: -0.03em; color: var(--cream); }
.stat__num .u { color: var(--gold); }
.stat__label { margin-top: 16px; font: 500 14.5px/1.5 var(--body); color: rgba(246,241,234,0.62); max-width: 26ch; }
.stat__label b { color: var(--cream); font-weight: 600; }

/* ===== CLOSING + FOOTER ===== */
.closing { padding: clamp(72px, 10vw, 140px) 0 clamp(40px, 6vw, 70px); }
.closing__q {
  font-family: var(--display); font-weight: 360; font-size: clamp(26px, 3.8vw, 46px);
  line-height: 1.2; letter-spacing: -0.015em; color: var(--ink); margin: 0; max-width: 24ch; text-wrap: balance;
}
.closing__q em { font-style: italic; color: var(--accent); }
.credits { margin-top: clamp(48px, 6vw, 78px); padding-top: 30px; border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 28px 30px; align-items: start; }
.credit__k { font: 700 11px/1 var(--body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--mut); }
.credit__v { margin-top: 11px; font: 500 15px/1.55 var(--body); color: var(--ink-soft); }
.credit__v span { display: block; }
.next {
  justify-self: end; text-align: right; align-self: center;
  display: inline-flex; flex-direction: column; gap: 4px;
}
.next__k { font: 700 11px/1 var(--body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--mut); }
.next__t { font-family: var(--display); font-weight: 360; font-style: italic; font-size: clamp(22px, 3vw, 34px); line-height: 1; color: var(--ink); transition: color 0.25s ease; }
.next__t::after { content: ' \\2192'; font-style: normal; color: var(--accent); }
.next:hover .next__t { color: var(--accent); }
.colophon { margin-top: 42px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font: 400 12.5px/1.5 var(--body); color: var(--faint); letter-spacing: 0.01em; }
.colophon .brand { font-family: var(--display); font-style: italic; color: var(--mut); }

/* reveal flourish — quote mark + lede lift a touch more */
.reveal.in .pull .mark { animation: rise 1s cubic-bezier(0.2,0.8,0.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

/* ===== RESPONSIVE ===== */
@media (max-width: 820px) {
  .meta { grid-template-columns: 1fr 1fr; }
  .meta__cell { border-right: 0; padding-right: 16px; }
  .meta__cell:nth-child(odd) { border-right: 1px solid var(--line); }
  .meta__cell:not(:first-child) { padding-left: 0; }
  .meta__cell:nth-child(even) { padding-left: 24px; }
  .meta__cell:nth-child(n+3) { border-top: 1px solid var(--line); margin-top: -1px; padding-top: 22px; }
  .gallery { grid-template-columns: 1fr; align-items: stretch; }
  .results__grid { grid-template-columns: 1fr; gap: 0; }
  .stat { padding: 24px 0; border-top: 1px solid rgba(246,241,234,0.18); }
  .credits { grid-template-columns: 1fr 1fr; }
  .next { grid-column: 1 / -1; justify-self: start; text-align: left; margin-top: 6px; }
  .lede { max-width: none; }
}
@media (max-width: 480px) {
  .meta { grid-template-columns: 1fr; }
  .meta__cell { border-right: 0 !important; padding-left: 0 !important; border-top: 1px solid var(--line); margin-top: 0; }
  .meta__cell:first-child { border-top: 0; }
  .credits { grid-template-columns: 1fr; }
}
`.trim()

const HTML = `
<header class="hero">
  <div class="hero__img" aria-hidden="true"></div>
  <div class="hero__scrim" aria-hidden="true"></div>
  <div class="hero__inner">
    <div class="wrap">
      <span class="hero__eyebrow reveal" data-reveal="none">Case Study — Brand Relaunch</span>
      <h1 class="hero__title reveal" data-reveal="none">Aera</h1>
      <p class="hero__sub reveal" data-reveal="none">A modern fragrance, reintroduced — a quiet heritage house brought back to life for a generation that buys with its eyes.</p>
    </div>
  </div>
</header>

<div class="wrap">
  <section class="meta reveal" data-reveal="none">
    <div class="meta__cell"><div class="meta__k">Client</div><div class="meta__v">Aera Parfums<span>est. 1974, Grasse</span></div></div>
    <div class="meta__cell"><div class="meta__k">Role</div><div class="meta__v">Brand identity<span>Art direction &amp; web</span></div></div>
    <div class="meta__cell"><div class="meta__k">Year</div><div class="meta__v">2025<span>16-week engagement</span></div></div>
    <div class="meta__cell"><div class="meta__k">Services</div><div class="meta__v">Strategy, Identity<span>Packaging, DTC site</span></div></div>
  </section>

  <section class="intro narrow reveal">
    <div class="intro__kicker">The Challenge</div>
    <p class="lede">A fifty-year-old house with a beautiful scent and an <em>invisible</em> brand.</p>
    <p class="copy drop">Aera had everything except presence. The juice was extraordinary — a cedar-and-bergamot signature beloved by a small, ageing clientele — but the bottle hadn't changed since 1989, the logo was set in a typeface nobody could name, and the brand had no real home online. New customers never found it; the ones who did couldn't tell it apart from the duty-free shelf.</p>
    <p class="copy">Our brief was deceptively simple: <strong>make Aera feel as considered as it smells</strong> — without erasing the half-century of craft underneath. No reinvention for its own sake. A re-introduction. We rebuilt the identity from the type up, redrew the bottle, and shipped a direct-to-consumer experience designed to make a scent legible through a screen.</p>
  </section>

  <section class="pull reveal" data-reveal="scale">
    <span class="mark" aria-hidden="true">&ldquo;</span>
    <blockquote>You can't smell a website. So we made the <em>page</em> the perfume.</blockquote>
    <cite>Creative Direction — Studio Brief</cite>
  </section>

  <section class="gallery">
    <figure class="shot shot--wide reveal" data-reveal="left">
      <div class="shot__frame"><img src="assets/case-study-1.jpg" alt="Aera packaging and brand collateral laid out on a warm neutral surface"></div>
      <figcaption><b>01</b><span>The new system — a custom serif wordmark, a terracotta-and-cream palette drawn from the bottle glass, and a tactile, uncoated stock for every printed touchpoint.</span></figcaption>
    </figure>
    <figure class="shot shot--tall reveal" data-reveal="right">
      <div class="shot__frame"><img src="assets/case-study-2.jpg" alt="The redesigned Aera fragrance bottle photographed in soft directional light"></div>
      <figcaption><b>02</b><span>The redrawn flacon — heavier base, softer shoulder, a single foil line. Shot in raking light to make the scent feel like an object.</span></figcaption>
    </figure>
  </section>

  <section class="beat narrow reveal">
    <h2>We treated the website like a <em>gallery</em>, not a store.</h2>
    <p class="copy">Every product page opens with full-bleed photography and a single, slow line of copy — the way you'd encounter the scent in a boutique. Cart and checkout were stripped to the essentials and pushed to the edges, so nothing competed with the imagery. Page weight dropped, dwell time climbed, and the brand finally read as premium at first scroll rather than first purchase.</p>
    <p class="copy">The result was a site that did the selling the old sales associate used to do: set a mood, build trust, and get out of the way.</p>
  </section>
</div>

<section class="results reveal" data-reveal="none">
  <div class="wrap">
    <div class="results__head">
      <div class="results__kicker">The Outcome</div>
      <h2 class="results__title">Twelve months after relaunch.</h2>
    </div>
    <div class="results__grid">
      <div class="stat reveal">
        <div class="stat__num num"><span class="u">+</span>212<span class="u">%</span></div>
        <div class="stat__label"><b>DTC revenue</b> year over year, with online overtaking wholesale for the first time in the brand's history.</div>
      </div>
      <div class="stat reveal">
        <div class="stat__num num">3.1<span class="u">×</span></div>
        <div class="stat__label"><b>Time on product pages</b> — the new image-first layout more than tripled average dwell.</div>
      </div>
      <div class="stat reveal">
        <div class="stat__num num">41<span class="u">%</span></div>
        <div class="stat__label"><b>Younger buyers</b> — share of customers under 35, up from single digits at launch.</div>
      </div>
    </div>
  </div>
</section>

<div class="wrap">
  <section class="closing narrow">
    <p class="closing__q reveal">Aera didn't need to become something new. It needed to be <em>seen</em> — and now it is.</p>
    <div class="credits reveal">
      <div class="credit"><div class="credit__k">Direction</div><div class="credit__v"><span>Mara Velez</span><span>Jonah Reine</span></div></div>
      <div class="credit"><div class="credit__k">Design</div><div class="credit__v"><span>Studio Atelier</span><span>Lou Marchetti</span></div></div>
      <div class="credit"><div class="credit__k">Photography</div><div class="credit__v"><span>Iris Køhl</span><span>Grasse &amp; Studio</span></div></div>
      <a class="next" href="#">
        <span class="next__k">Next Project</span>
        <span class="next__t">Maison Solène</span>
      </a>
    </div>
    <div class="colophon">
      <span class="brand">Aera Parfums — Relaunch, 2025</span>
      <span>&copy; Studio Brief. Selected work, for portfolio use.</span>
    </div>
  </section>
</div>
`.trim()

const JS = `
// Bind the parallax driver to the actual scrolled distance of each element so the
// hero and the portrait image stay in range no matter the page height. The base
// controller already sets --scroll-y on :root; here we just clamp the hero's
// transform once it has scrolled fully past, to avoid drift on very tall phones.
(function () {
  var hero = document.querySelector('.hero');
  var img = document.querySelector('.hero__img');
  if (!hero || !img) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { img.style.transform = 'none'; return; }
  function update() {
    var rect = hero.getBoundingClientRect();
    // progress: 0 when hero top at viewport top, grows as it scrolls away
    var passed = Math.max(0, -rect.top);
    var shift = Math.min(passed * 0.18, hero.offsetHeight * 0.12);
    img.style.transform = 'translateY(' + shift.toFixed(1) + 'px) scale(1.04)';
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();

// Prevent the placeholder "next project" / footer links from jumping the page.
(function () {
  document.querySelectorAll('a[href="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); });
  });
})();
`.trim()

export const caseStudy: Template = {
  id: 'case-study',
  kind: 'page',
  name: 'Case Study',
  tagline: 'An editorial, image-forward project story',
  categories: ['Marketing'],
  audiences: ['design', 'marketing', 'agency', 'brand'],
  description:
    'A scrollytelling case-study page for a design portfolio or brand launch: a full-bleed scrimmed hero, a hairline-divided project meta row (Client / Role / Year / Services), a large-measure intro with a drop cap, a centered pull quote, a two-up image section (landscape + a parallax portrait), a dark results band with big tabular metrics, and a closing statement with credits + a next-project link. Warm cream-and-ink palette, a high-contrast Fraunces serif over Inter, scroll-reveals (left/right/scale), parallax, and image hover-zoom. Swap the three photos and rewrite the story for any project.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f6f1ea',
  assets: ['case-study-hero.jpg', 'case-study-1.jpg', 'case-study-2.jpg'],
  notes:
    'Editorial, image-first. The display face is Fraunces (use italics for emphasis — set them with <em> and the --accent terracotta); body is Inter with tabular numerals on every figure (.num). The hero and the portrait image parallax off var(--scroll-y); the hero is additionally refined in page.js (clamped so it never drifts on tall phones). To swap imagery, replace assets/case-study-hero.jpg (full-bleed background in CSS), case-study-1.jpg (landscape) and case-study-2.jpg (portrait). To add a metric, copy a .stat in the results band; keep the unit glyphs in <span class="u"> so they tint gold. Recolor via --accent / --gold / --ink / --cream.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f6f1ea',
  },
}
