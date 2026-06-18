import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const BG_COVER = 'assets/brand-guidelines-cover.jpg'
const BG_STYLE = 'assets/brand-guidelines-style.jpg'

export const brandGuidelines: Template = {
  id: 'brand-guidelines',
  categories: ['Creative'],
  name: 'Brand Guidelines',
  tagline: 'Type-driven, high-contrast editorial brand book',
  audiences: ['brand', 'design', 'marketing', 'agency'],
  description:
    "A bold black-and-white brand book with one vivid vermilion accent, a massive condensed display face, swatch chips, logo clearspace, type specimens, and do/don't panels. A complete identity guide you rename and recolor for any brand.",
  fonts: {
    display: 'Anton',
    body: 'Archivo',
    mono: 'Archivo',
    links: [
      'https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700;800&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0b0b0b',
    '--muted': '#7c7c7c',
    '--accent': '#ff3b1f',
    '--accent-2': '#ff3b1f',
    '--display': "'Anton', sans-serif",
    '--body': "'Archivo', sans-serif",
    '--mono': "'Archivo', sans-serif",
    '--display-weight': '400',
    '--title-size': '170px',
    '--display-size': '220px',
    '--headline-size': '92px',
    '--section-size': '210px',
    '--subhead-size': '56px',
    '--lead-size': '38px',
    '--lead-weight': '500',
    '--body-size': '32px',
    '--kicker-size': '24px',
    '--kicker-tracking': '0.3em',
    '--bullet-size': '36px',
    '--bullet-radius': '0px',
    '--card-bg': '#f4f4f2',
    '--card-border': '#0b0b0b',
    '--radius': '0px',
    '--card-pad': '46px',
    '--th-border': '#0b0b0b',
    '--table-border': '#e3e3df',
    '--table-size': '32px',
    '--track': '#ececea',
    '--donut-hole': '#ffffff',
    '--metric-size': '128px',
    '--stat-size': '108px',
    '--media-radius': '0px',
    '--media-border': '1px solid #0b0b0b',
    '--media-shadow': 'none',
    '--scrim':
      'linear-gradient(180deg, rgba(11,11,11,0.05) 0%, rgba(11,11,11,0.35) 55%, rgba(11,11,11,0.9) 100%)',
  },
  stageBg: '#0b0b0b',
  assets: ['brand-guidelines-cover.jpg', 'brand-guidelines-style.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--text); }
.bar-fill { background: var(--accent); border-radius: 0; }
.bar-fill::before { font-family: var(--body); font-weight: 800; }
.bar-label { text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
.accent-bar { border-radius: 0; background: var(--accent); }
.display, .title, .headline, .section-title { text-transform: uppercase; }
.title b, .display b, .accent-text { color: var(--accent); }
.lead { color: var(--text); max-width: 30ch; }
.bullet b { color: var(--accent); }
.table th { font-family: var(--body); }

/* full-bleed dark slides flip the body so kickers/runner read on black */
.is-dark { background: var(--text); color: var(--bg); }
.is-dark .headline, .is-dark .display, .is-dark .subhead, .is-dark .lead, .is-dark .body, .is-dark .section-title { color: var(--bg); }
.is-dark .runner { border-top-color: rgba(255,255,255,0.18); }
.is-dark .runner-brand { color: var(--bg); }
.is-dark .runner, .is-dark .runner-label { color: rgba(255,255,255,0.6); }
.is-dark .rule { background: rgba(255,255,255,0.2); }

/* ── signature 01: giant ghost letterform behind a slide ── */
.ghost { position: absolute; font-family: var(--display); font-weight: 400; line-height: 0.7; pointer-events: none; user-select: none; }
.ghost.edge { right: -40px; bottom: -120px; font-size: 1080px; color: var(--text); opacity: 0.05; }
.ghost.accent { color: var(--accent); opacity: 1; }

/* ── signature 02: a numbered eyebrow lockup for content slides ── */
.eyebrow { display: flex; align-items: baseline; gap: 22px; }
.eyebrow-num { font-family: var(--display); font-weight: 400; font-size: 30px; color: var(--accent); letter-spacing: 0.04em; }
.eyebrow-txt { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.28em; font-size: 22px; color: var(--text); }

/* ── signature 03: color swatch chips with hex + usage ── */
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--text); }
.swatch { aspect-ratio: 1 / 1.18; padding: 28px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; border-right: 1px solid var(--text); }
.swatch:last-child { border-right: 0; }
.swatch-name { font-family: var(--body); font-weight: 700; font-size: 27px; }
.swatch-hex { font-family: var(--mono); font-weight: 600; font-size: 23px; letter-spacing: 0.04em; opacity: 0.72; }
.swatch-use { font-family: var(--body); font-size: 21px; line-height: 1.3; opacity: 0.6; margin-top: 4px; }
.sw-ink { background: var(--text); color: var(--bg); }
.sw-ink .swatch-hex, .sw-ink .swatch-use { opacity: 0.7; }
.sw-red { background: var(--accent); color: #fff; }
.sw-red .swatch-hex, .sw-red .swatch-use { opacity: 0.82; }
.sw-paper { background: var(--bg); color: var(--text); }
.sw-grey { background: var(--card-bg); color: var(--text); }

/* ── signature 04: logo clearspace box (dashed inset) ── */
.clearbox { position: relative; border: 1px solid var(--text); background: var(--card-bg); aspect-ratio: 16 / 9; display: grid; place-items: center; }
.clearbox::before { content: ''; position: absolute; inset: 14%; border: 2px dashed var(--accent); }
.clear-mark { position: relative; display: flex; align-items: center; gap: 18px; }
.clear-dot { width: 56px; height: 56px; background: var(--accent); }
.clear-word { font-family: var(--display); font-weight: 400; font-size: 88px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--text); }
.clear-cap { position: absolute; top: 5%; left: 5%; font-family: var(--mono); font-weight: 600; font-size: 19px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }

/* ── signature 05: type specimen rows (weight / size ladder) ── */
.specimen { display: flex; flex-direction: column; }
.spec-row { display: grid; grid-template-columns: 230px 1fr; gap: 40px; align-items: baseline; padding: 30px 0; border-top: 1px solid var(--table-border); }
.spec-row:last-child { border-bottom: 1px solid var(--table-border); }
.spec-meta { font-family: var(--mono); font-weight: 600; font-size: 22px; letter-spacing: 0.04em; color: var(--muted); text-transform: uppercase; }
.spec-meta b { display: block; color: var(--text); font-size: 25px; letter-spacing: 0.02em; }
.spec-glyph-d { font-family: var(--display); font-weight: 400; line-height: 0.9; color: var(--text); text-transform: uppercase; }
.spec-sample-b { font-family: var(--body); line-height: 1; color: var(--text); }

/* ── signature 06: do / don't tinted panels ── */
.judge { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
.panel { border: 1px solid var(--text); padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.panel-media { aspect-ratio: 4 / 3; position: relative; overflow: hidden; }
.panel-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.panel.dont .panel-media img { filter: grayscale(1) contrast(0.7) brightness(1.18); }
.panel-foot { display: flex; align-items: center; gap: 18px; padding: 26px 30px; }
.panel-mark { flex: 0 0 auto; width: 50px; height: 50px; display: grid; place-items: center; font-family: var(--body); font-weight: 800; font-size: 30px; color: #fff; }
.panel.do .panel-mark { background: var(--accent); }
.panel.dont .panel-mark { background: var(--text); }
.panel-label { font-family: var(--body); font-weight: 700; font-size: 28px; }
.panel-sub { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 2px; }

/* ── signature 07: voice tone scale + principle cards ── */
.tone { display: flex; align-items: center; gap: 0; border: 1px solid var(--text); }
.tone-cell { flex: 1; padding: 26px 30px; border-right: 1px solid var(--text); }
.tone-cell:last-child { border-right: 0; }
.tone-cell.on { background: var(--accent); color: #fff; }
.tone-from { font-family: var(--mono); font-size: 20px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.6; }
.tone-word { font-family: var(--display); font-weight: 400; font-size: 46px; text-transform: uppercase; margin-top: 6px; }
.princ { border-left: 4px solid var(--accent); padding-left: 30px; }
.princ-t { font-family: var(--display); font-weight: 400; font-size: 44px; text-transform: uppercase; color: var(--text); }
.princ-d { font-family: var(--body); font-size: 26px; line-height: 1.4; color: var(--muted); margin-top: 8px; }`,
  notes:
    'A complete brand book: massive uppercase Anton on white, clean Archivo body, ONE vivid vermilion (#ff3b1f) accent — no second hue. Type and giant letterforms carry it. Use the dark full-bleed cover/close (assets/brand-guidelines-cover.jpg) with .is-dark on the section + closing slides; the .split imagery slide uses assets/brand-guidelines-style.jpg. Signature components: .swatches/.swatch (color chips with hex + usage), .clearbox (dashed logo clearspace), .specimen/.spec-row (type ladder), .judge/.panel.do/.panel.dont (photography do & don\'t), .tone (voice scale), .princ (voice principles), .ghost (giant background letterform), .eyebrow numbered lockup. Keep it loud but disciplined — black, white, one red. Set bespoke sizes inline via style="--display-size:…" on .spec-glyph-d rows.',
  sampleSlides: [
    // ── 1. Cover ──────────────────────────────────────────────
    s({
      id: 'bg-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed is-dark">
  <img class="bleed" src="${BG_COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Brand Guidelines · Edition 01</div>
    <h1 class="display reveal" style="--display-size:200px;margin-top:10px">Monolith</h1>
    <p class="lead reveal" style="color:#fff;opacity:0.86">The identity system for everyone who builds the brand.</p>
  </div>
</div>`,
    }),
    // ── 2. Contents ───────────────────────────────────────────
    s({
      id: 'bg-contents',
      name: 'Contents',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="ghost edge">B</div>
  <div class="kicker reveal">Contents</div>
  <h2 class="headline reveal" style="margin-top:4px;margin-bottom:18px">What's inside.</h2>
  <div class="cols-2 reveal" style="gap:0 110px">
    <div class="specimen" style="--table-border:#e3e3df">
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>01</b></div><div class="princ-t" style="font-size:38px">The brand</div></div>
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>02</b></div><div class="princ-t" style="font-size:38px">Logo</div></div>
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>03</b></div><div class="princ-t" style="font-size:38px">Color</div></div>
    </div>
    <div class="specimen" style="--table-border:#e3e3df">
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>04</b></div><div class="princ-t" style="font-size:38px">Type</div></div>
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>05</b></div><div class="princ-t" style="font-size:38px">Voice &amp; imagery</div></div>
      <div class="spec-row" style="grid-template-columns:90px 1fr;padding:22px 0"><div class="spec-meta"><b>06</b></div><div class="princ-t" style="font-size:38px">In the wild</div></div>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">Brand Guidelines</span></div>
</div>`,
    }),
    // ── 3. Brand at a glance ──────────────────────────────────
    s({
      id: 'bg-glance',
      name: 'At a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">01</span><span class="eyebrow-txt">The brand</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:24px">The brand at a glance.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num" style="--stat-size:82px;color:var(--accent)">1</div><div class="stat-label">Idea — built to last</div></div>
    <div class="stat"><div class="stat-num" style="--stat-size:82px">3</div><div class="stat-label">Colors, no more</div></div>
    <div class="stat"><div class="stat-num" style="--stat-size:82px">2</div><div class="stat-label">Typefaces</div></div>
    <div class="stat"><div class="stat-num" style="--stat-size:82px">0</div><div class="stat-label">Compromises</div></div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">01 · The Brand</span></div>
</div>`,
    }),
    // ── 4. Our story / mission ────────────────────────────────
    s({
      id: 'bg-story',
      name: 'Mission',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:100px;align-items:center">
    <div>
      <div class="eyebrow"><span class="eyebrow-num">01</span><span class="eyebrow-txt">Our story</span></div>
      <h2 class="title" style="--title-size:128px;margin-top:14px">Make the<br/><b>permanent</b><br/>things.</h2>
    </div>
    <div>
      <p class="lead">Monolith began with a stubborn belief: that the things worth making are the things built to outlast the brief.</p>
      <p class="body" style="margin-top:24px;max-width:36ch">Our mission is to design tools, spaces, and objects with the weight of permanence — confident, honest, and unmistakably ours. This book is how we keep that promise consistent.</p>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">01 · The Brand</span></div>
</div>`,
    }),
    // ── 5. Section · Logo ─────────────────────────────────────
    s({
      id: 'bg-sec-logo',
      name: 'Section · Logo',
      transition: 'fade',
      bodyHtml: `<div class="section is-dark">
  <div class="ghost edge accent" style="opacity:0.16">02</div>
  <div class="section-num reveal">02</div>
  <div class="section-title reveal">Logo</div>
  <div class="accent-bar reveal" style="margin-top:24px;width:140px;height:8px"></div>
</div>`,
    }),
    // ── 6. Logo & clearspace ──────────────────────────────────
    s({
      id: 'bg-logo',
      name: 'Logo & clearspace',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div class="clearbox">
      <span class="clear-cap">Minimum clearspace = cap height</span>
      <div class="clear-mark"><span class="clear-dot"></span><span class="clear-word">Monolith</span></div>
    </div>
    <div>
      <div class="eyebrow"><span class="eyebrow-num">02</span><span class="eyebrow-txt">Logo</span></div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:18px">Give it room.</h2>
      <ul class="bullets" style="--gap:20px">
        <li class="bullet"><span>Keep clearspace equal to the <b>cap height</b> of the wordmark on every side.</span></li>
        <li class="bullet"><span>Never set the logo below <b>32px</b> tall in digital use.</span></li>
        <li class="bullet"><span>Use the <b>red mark</b> on light; reverse to white on dark.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">02 · Logo</span></div>
</div>`,
    }),
    // ── 7. Section · Color ────────────────────────────────────
    s({
      id: 'bg-sec-color',
      name: 'Section · Color',
      transition: 'fade',
      bodyHtml: `<div class="section">
  <div class="ghost edge">03</div>
  <div class="section-num reveal">03</div>
  <div class="section-title reveal">Color</div>
  <div class="accent-bar reveal" style="margin-top:24px;width:140px;height:8px"></div>
</div>`,
    }),
    // ── 8. Color palette ──────────────────────────────────────
    s({
      id: 'bg-color',
      name: 'Color palette',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">03</span><span class="eyebrow-txt">Palette</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">Three colors. One of them shouts.</h2>
  <div class="swatches reveal">
    <div class="swatch sw-ink"><div class="swatch-name">Ink</div><div class="swatch-hex">#0B0B0B</div><div class="swatch-use">Type, lines, dark fields</div></div>
    <div class="swatch sw-paper"><div class="swatch-name">Paper</div><div class="swatch-hex">#FFFFFF</div><div class="swatch-use">Default ground</div></div>
    <div class="swatch sw-red"><div class="swatch-name">Vermilion</div><div class="swatch-hex">#FF3B1F</div><div class="swatch-use">The single accent — use sparingly</div></div>
    <div class="swatch sw-grey"><div class="swatch-name">Fog</div><div class="swatch-hex">#F4F4F2</div><div class="swatch-use">Panels, quiet fills</div></div>
  </div>
  <p class="fine reveal" style="margin-top:8px">Vermilion is for emphasis, never for surfaces. If everything is red, nothing is.</p>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">03 · Color</span></div>
</div>`,
    }),
    // ── 9. Color usage (donut) ────────────────────────────────
    s({
      id: 'bg-color-mix',
      name: 'Color balance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#0b0b0b 0 60%, #ececea 60% 90%, #ff3b1f 90% 100%)"><div class="donut-label" style="font-size:54px">90/10</div></div>
    </div>
    <div>
      <div class="eyebrow"><span class="eyebrow-num">03</span><span class="eyebrow-txt">Balance</span></div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:22px">Mostly mono.</h2>
      <div class="legend" style="display:flex;flex-direction:column;gap:18px">
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px"><span style="width:18px;height:18px;background:#0b0b0b;flex:0 0 auto"></span>Ink &amp; paper<span style="margin-left:auto;color:var(--muted)">60%</span></div>
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px"><span style="width:18px;height:18px;background:#ececea;flex:0 0 auto"></span>Fog &amp; neutrals<span style="margin-left:auto;color:var(--muted)">30%</span></div>
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px"><span style="width:18px;height:18px;background:#ff3b1f;flex:0 0 auto"></span>Vermilion accent<span style="margin-left:auto;color:var(--muted)">10%</span></div>
      </div>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">03 · Color</span></div>
</div>`,
    }),
    // ── 10. Section · Type ────────────────────────────────────
    s({
      id: 'bg-sec-type',
      name: 'Section · Type',
      transition: 'fade',
      bodyHtml: `<div class="section is-dark">
  <div class="ghost edge accent" style="opacity:0.16">Aa</div>
  <div class="section-num reveal">04</div>
  <div class="section-title reveal">Type</div>
  <div class="accent-bar reveal" style="margin-top:24px;width:140px;height:8px"></div>
</div>`,
    }),
    // ── 11. Typography specimen ───────────────────────────────
    s({
      id: 'bg-type',
      name: 'Typography',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">04</span><span class="eyebrow-txt">Typefaces</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Anton, then Archivo.</h2>
  <div class="specimen reveal">
    <div class="spec-row">
      <div class="spec-meta">Display<b>Anton · 400</b></div>
      <div class="spec-glyph-d" style="font-size:150px">Headlines that hit</div>
    </div>
    <div class="spec-row">
      <div class="spec-meta">Subhead<b>Archivo · 700</b></div>
      <div class="spec-sample-b" style="font-size:64px;font-weight:700">Confident sub-heads</div>
    </div>
    <div class="spec-row">
      <div class="spec-meta">Body<b>Archivo · 400</b></div>
      <div class="spec-sample-b" style="font-size:34px;font-weight:400;line-height:1.3;color:var(--muted)">Set body copy in Archivo Regular at a comfortable measure. Keep lines short, leading generous, and let the page breathe.</div>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">04 · Type</span></div>
</div>`,
    }),
    // ── 12. Type scale table ──────────────────────────────────
    s({
      id: 'bg-type-scale',
      name: 'Type scale',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">04</span><span class="eyebrow-txt">The scale</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">One ladder, used everywhere.</h2>
  <table class="table reveal">
    <thead><tr><th>Role</th><th>Family / weight</th><th class="num">Size</th><th class="num">Tracking</th></tr></thead>
    <tbody>
      <tr><td>Display</td><td>Anton · 400</td><td class="num">160–220</td><td class="num">−2%</td></tr>
      <tr><td>Headline</td><td>Anton · 400</td><td class="num">88–96</td><td class="num">0</td></tr>
      <tr><td>Subhead</td><td>Archivo · 700</td><td class="num">48–56</td><td class="num">0</td></tr>
      <tr><td>Body</td><td>Archivo · 400</td><td class="num">30–34</td><td class="num">0</td></tr>
      <tr class="row-em"><td>Caption</td><td>Archivo · 600</td><td class="num">20–24</td><td class="num">+8%</td></tr>
    </tbody>
  </table>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">04 · Type</span></div>
</div>`,
    }),
    // ── 13. Voice & tone ──────────────────────────────────────
    s({
      id: 'bg-voice',
      name: 'Voice & tone',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">05</span><span class="eyebrow-txt">Voice &amp; tone</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">Plain-spoken, never plain.</h2>
  <div class="tone reveal" style="margin-bottom:34px">
    <div class="tone-cell"><div class="tone-from">Not</div><div class="tone-word" style="color:var(--muted)">Corporate</div></div>
    <div class="tone-cell on"><div class="tone-from">We are</div><div class="tone-word">Direct</div></div>
    <div class="tone-cell"><div class="tone-from">Not</div><div class="tone-word" style="color:var(--muted)">Clever</div></div>
    <div class="tone-cell on"><div class="tone-from">We are</div><div class="tone-word">Clear</div></div>
  </div>
  <div class="cols-3 reveal" style="gap:48px">
    <div class="princ"><div class="princ-t">Say it once</div><div class="princ-d">One idea per sentence. Cut the windup.</div></div>
    <div class="princ"><div class="princ-t">Earn the bold</div><div class="princ-d">Strong claims, backed by something real.</div></div>
    <div class="princ"><div class="princ-t">Human, not cute</div><div class="princ-d">Warm and plain — never a pun for its own sake.</div></div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">05 · Voice</span></div>
</div>`,
    }),
    // ── 14. Imagery style (split) ─────────────────────────────
    s({
      id: 'bg-imagery',
      name: 'Imagery style',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="eyebrow reveal"><span class="eyebrow-num">05</span><span class="eyebrow-txt">Imagery</span></div>
    <h2 class="headline reveal">High contrast,<br/>one accent.</h2>
    <p class="lead reveal">Photography is graphic, not decorative: hard light, deep shadow, generous negative space, and a single vermilion note in frame.</p>
    <ul class="checks reveal" style="--gap:16px;margin-top:8px">
      <li class="check"><span>One subject, one light, one accent.</span></li>
      <li class="check"><span>Crop bravely; let black do the work.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${BG_STYLE}" alt=""></figure>
</div>`,
    }),
    // ── 15. Photography do & don't ────────────────────────────
    s({
      id: 'bg-dodont',
      name: "Do & don't",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">05</span><span class="eyebrow-txt">Photography</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:20px">Do, and don't.</h2>
  <div class="judge reveal">
    <div class="panel do">
      <div class="panel-media"><img src="${BG_STYLE}" alt=""></div>
      <div class="panel-foot"><span class="panel-mark">&#10003;</span><div><div class="panel-label">Do — hard light, deep black</div><div class="panel-sub">Keep contrast high and the accent intentional.</div></div></div>
    </div>
    <div class="panel dont">
      <div class="panel-media"><img src="${BG_STYLE}" alt=""></div>
      <div class="panel-foot"><span class="panel-mark">&#10007;</span><div><div class="panel-label">Don't — flat &amp; washed out</div><div class="panel-sub">No grey mush, no muddied, off-brand color.</div></div></div>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">05 · Imagery</span></div>
</div>`,
    }),
    // ── 16. Applications / collateral ─────────────────────────
    s({
      id: 'bg-applications',
      name: 'Applications',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">06</span><span class="eyebrow-txt">In the wild</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">The system, applied.</h2>
  <div class="cards reveal" style="--cols:3;--card-gap:30px">
    <div class="card"><div class="card-num">01</div><div class="card-title">Stationery</div><div class="card-body">Letterhead and cards: ink on paper, a single red rule, nothing else.</div></div>
    <div class="card"><div class="card-num">02</div><div class="card-title">Packaging</div><div class="card-body">Matte black, debossed wordmark, one vermilion seal per box.</div></div>
    <div class="card"><div class="card-num">03</div><div class="card-title">Digital</div><div class="card-body">White canvas, Anton headers, red reserved for the primary action.</div></div>
    <div class="card"><div class="card-num">04</div><div class="card-title">Signage</div><div class="card-body">Oversized type, edge-to-edge, legible from across the room.</div></div>
    <div class="card"><div class="card-num">05</div><div class="card-title">Social</div><div class="card-body">One idea per post; the accent earns its place or stays home.</div></div>
    <div class="card"><div class="card-num">06</div><div class="card-title">Apparel</div><div class="card-body">Black tee, white mark, red tab. The uniform is the brand.</div></div>
  </div>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">06 · Applications</span></div>
</div>`,
    }),
    // ── 17. Motion & accent (flow) + pull quote ───────────────
    s({
      id: 'bg-motion',
      name: 'Motion & accent',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="eyebrow reveal"><span class="eyebrow-num">06</span><span class="eyebrow-txt">Motion</span></div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:24px">Decisive, never fussy.</h2>
  <div class="flow reveal" style="margin-bottom:40px">
    <div class="flow-step"><div class="princ" style="border-left-width:6px"><div class="princ-t" style="font-size:36px">Cut</div><div class="princ-d">Hard cuts over slow fades.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="princ" style="border-left-width:6px"><div class="princ-t" style="font-size:36px">Snap</div><div class="princ-d">Fast ease-out, 200ms.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="princ" style="border-left-width:6px"><div class="princ-t" style="font-size:36px">Accent</div><div class="princ-d">Red wipes in last, once.</div></div></div>
  </div>
  <blockquote class="quote reveal" style="--quote-size:64px;max-width:30ch">A brand is what's left when you remove everything you could.</blockquote>
  <div class="runner"><span class="runner-brand">Monolith</span><span class="runner-label">06 · Motion</span></div>
</div>`,
    }),
    // ── 18. Closing / CTA ─────────────────────────────────────
    s({
      id: 'bg-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed is-dark">
  <img class="bleed" src="${BG_COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The brand in one line</div>
    <h2 class="display reveal" style="--display-size:150px;margin-top:8px">Built to <b>last.</b></h2>
    <p class="lead reveal" style="color:#fff;opacity:0.86">brand@monolith.co · monolith.co/brand</p>
  </div>
</div>`,
    }),
  ],
}
