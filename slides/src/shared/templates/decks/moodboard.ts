import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/moodboard-cover.jpg'
const MOOD1_IMG = 'assets/moodboard-mood1.jpg'
const MOOD2_IMG = 'assets/moodboard-mood2.jpg'

export const moodboard: Template = {
  id: 'moodboard',
  categories: ['Creative', 'Marketing'],
  name: 'Moodboard',
  tagline: 'An editorial art-direction moodboard',
  audiences: ['creative', 'brand', 'designer', 'marketing'],
  description:
    'A collage, editorial art-direction moodboard for a brand campaign. Asymmetric image grids, a color-story chip row, material swatches, keyword tags, and a typographic specimen carry the feeling end to end. Spectral serif on warm bone, with a clay accent and sage secondary — built to be re-pointed at your own campaign.',
  fonts: {
    display: 'Spectral',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#efe9e0',
    '--text': '#2b2825',
    '--muted': '#8a8276',
    '--accent': '#b85c38',
    '--accent-2': '#7d8471',
    '--display': "'Spectral', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '500',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--section-size': '150px',
    '--lead-size': '36px',
    '--subhead-size': '48px',
    '--body-size': '31px',
    '--kicker-tracking': '0.3em',
    '--kicker-size': '20px',
    '--kicker-font': "'Inter', sans-serif",
    '--card-bg': '#e6dfd2',
    '--card-border': 'rgba(43,40,37,0.14)',
    '--radius': '4px',
    '--stat-size': '92px',
    '--metric-size': '116px',
    '--th-border': 'rgba(43,40,37,0.5)',
    '--table-border': 'rgba(43,40,37,0.12)',
    '--rule-color': 'rgba(43,40,37,0.16)',
    '--track': 'rgba(43,40,37,0.1)',
    '--donut-hole': '#efe9e0',
    '--bar-gap': '30px',
    '--media-radius': '4px',
    '--media-border': '1px solid rgba(43,40,37,0.12)',
    '--media-shadow': '0 40px 90px -40px rgba(43,40,37,0.45)',
    '--scrim':
      'linear-gradient(180deg, rgba(28,24,20,0.08) 0%, rgba(28,24,20,0.34) 52%, rgba(28,24,20,0.82) 100%)',
    '--bleed-text': '#efe9e0',
    '--pos': '#7d8471',
    '--neg': '#b85c38',
  },
  stageBg: '#ddd5c7',
  assets: ['moodboard-cover.jpg', 'moodboard-mood1.jpg', 'moodboard-mood2.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.cite-dot { background: var(--accent); }
.tag { color: var(--text); }

/* Italic serif accent used in display lines */
.ital { font-style: italic; font-weight: 400; }

/* Section divider — quiet, large serif on bone */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--body); font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; font-size: 21px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 500; font-size: 148px; line-height: 0.94; letter-spacing: -0.02em; color: var(--text); text-wrap: balance; }
.divider-rule { width: 130px; height: 3px; background: var(--accent); margin-top: 16px; }

/* SIGNATURE 1 — asymmetric offset 2x2 image grid (the collage) */
.collage { position: absolute; inset: 0; padding: 90px 110px; display: grid; gap: 22px;
  grid-template-columns: 1.3fr 1fr 0.9fr; grid-template-rows: 1fr 1fr;
  grid-template-areas: "a a b" "a c d"; }
.collage .tile { position: relative; overflow: hidden; border-radius: 4px; border: 1px solid var(--card-border); background: var(--card-bg); }
.collage .tile.a { grid-area: a; } .collage .tile.b { grid-area: b; }
.collage .tile.c { grid-area: c; } .collage .tile.d { grid-area: d; }
.collage .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.collage .tile.swatch { display: grid; place-items: center; }
.tile-cap { position: absolute; left: 18px; bottom: 16px; font-family: var(--body); font-weight: 600; font-size: 19px; letter-spacing: 0.16em; text-transform: uppercase; color: #efe9e0; text-shadow: 0 1px 12px rgba(28,24,20,0.6); }

/* SIGNATURE 2 — color-story chips */
.colorstory { display: flex; gap: 0; border-radius: 4px; overflow: hidden; border: 1px solid var(--card-border); }
.cchip { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 30px 26px; min-height: 360px; }
.cchip-name { font-family: var(--display); font-weight: 500; font-size: 34px; line-height: 1.05; }
.cchip-hex { font-family: var(--body); font-weight: 500; font-size: 22px; letter-spacing: 0.08em; margin-top: 8px; opacity: 0.85; }
.cchip-role { font-family: var(--body); font-size: 21px; margin-top: 16px; opacity: 0.75; }

/* SIGNATURE 3 — texture / material swatches */
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 26px; }
.matswatch { display: flex; flex-direction: column; gap: 16px; }
.matchip { height: 230px; border-radius: 4px; border: 1px solid var(--card-border); position: relative; overflow: hidden; }
.matchip.img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mat-name { font-family: var(--display); font-weight: 500; font-size: 30px; line-height: 1.05; color: var(--text); }
.mat-desc { font-family: var(--body); font-size: 21px; line-height: 1.36; color: var(--muted); }

/* SIGNATURE 4 — keyword tags */
.keywords { display: flex; flex-wrap: wrap; gap: 18px 18px; }
.keyword { font-family: var(--display); font-weight: 500; font-size: 40px; line-height: 1; padding: 18px 30px; border: 1px solid var(--accent); border-radius: 999px; color: var(--text); }
.keyword.fill { background: var(--accent); color: #efe9e0; border-color: var(--accent); }
.keyword.sage { border-color: var(--accent-2); }
.keyword.ital { font-style: italic; font-weight: 400; }

/* SIGNATURE 5 — direction statement block */
.direction { border-left: 4px solid var(--accent); padding: 8px 0 8px 42px; }
.direction-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 18px; }
.direction-t { font-family: var(--display); font-weight: 500; font-size: 56px; line-height: 1.12; letter-spacing: -0.01em; color: var(--text); text-wrap: balance; }

/* Type specimen */
.specimen { border: 1px solid var(--card-border); border-radius: 4px; padding: 54px 56px; background: var(--card-bg); }
.spec-big { font-family: var(--display); font-weight: 500; font-size: 150px; line-height: 0.9; letter-spacing: -0.02em; color: var(--text); }
.spec-row { display: flex; align-items: baseline; gap: 28px; flex-wrap: wrap; margin-top: 26px; }
.spec-weight { font-family: var(--display); font-size: 44px; color: var(--text); }
.spec-meta { font-family: var(--body); font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }

/* Do / Don't cards */
.dd-yes { border-top: 4px solid var(--accent-2); }
.dd-no { border-top: 4px solid var(--accent); }
.dd-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 20px; }
.dd-yes .dd-k { color: var(--accent-2); } .dd-no .dd-k { color: var(--accent); }

/* Lede */
.lede { font-family: var(--display); font-weight: 500; font-size: 60px; line-height: 1.14; letter-spacing: -0.01em; color: var(--text); max-width: 20ch; text-wrap: balance; }

.runner-brand::before { background: var(--accent); border-radius: 999px; }`,
  notes:
    'A complete art-direction moodboard for a brand campaign (the sample campaign is a warm artisanal homeware brand, "Maren & Field"). Spectral serif (with italic accents) on warm bone #efe9e0, ONE clay accent #b85c38 with a sage #7d8471 secondary, generous negative space, no gradients. Open and close on the bone still-life full-bleed (assets/moodboard-cover.jpg); use the material macro (assets/moodboard-mood1.jpg) and the light-and-curtain study (assets/moodboard-mood2.jpg) across the collage, swatches, and photography split. Signature pieces: the asymmetric .collage offset image grid, the .colorstory chip row (set each .cchip background + text color inline), .swatches material chips, .keywords pill tags (mix default/.fill/.sage/.ital), the .direction statement block, plus the type .specimen and do/don\'t .dd cards. The whole thing is feeling-first — keep copy evocative and short, let imagery and one serif line carry each slide.',
  sampleSlides: [
    s({
      id: 'mb-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Art Direction · Spring Campaign 2026</div>
    <h1 class="display reveal" style="--display-size:140px;margin-top:10px">A quieter<br/><span class="ital">kind of warmth.</span></h1>
    <p class="lead reveal">Maren &amp; Field — visual world &amp; mood</p>
  </div>
</div>`,
    }),
    s({
      id: 'mb-brief',
      name: 'The brief',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">The brief, in one line</div>
  <p class="lede reveal" style="--display-size:72px;max-width:24ch;margin-top:18px;font-size:72px">Make handmade homeware feel like <span class="ital accent-text">a slow morning</span> — sunlit, tactile, unhurried.</p>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">The brief</span></div>
</div>`,
    }),
    s({
      id: 'mb-feeling',
      name: 'The feeling',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The feeling we're after</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">Seven words to design against.</h2>
  <div class="keywords reveal">
    <span class="keyword fill">Warm</span>
    <span class="keyword ital">unhurried</span>
    <span class="keyword">Tactile</span>
    <span class="keyword sage">Sun-washed</span>
    <span class="keyword ital">honest</span>
    <span class="keyword">Earthen</span>
    <span class="keyword sage ital">quiet</span>
  </div>
  <p class="lead reveal" style="margin-top:40px;max-width:40ch">If a frame doesn't feel like at least three of these, it isn't ours.</p>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">The feeling</span></div>
</div>`,
    }),
    s({
      id: 'mb-sec1',
      name: 'Section · Visual world',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The visual world</div>
  <div class="divider-title reveal">What it<br/><span class="ital">looks like.</span></div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'mb-collage',
      name: 'Image collage',
      transition: 'slide',
      bodyHtml: `<div class="collage reveal">
  <div class="tile a"><img src="${COVER_IMG}" alt=""><span class="tile-cap">Still life</span></div>
  <div class="tile b"><img src="${MOOD1_IMG}" alt=""><span class="tile-cap">Material</span></div>
  <div class="tile c swatch" style="background:var(--accent)"><span class="tile-cap">Clay</span></div>
  <div class="tile d"><img src="${MOOD2_IMG}" alt=""><span class="tile-cap">Light</span></div>
</div>`,
    }),
    s({
      id: 'mb-color',
      name: 'Color story',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The color story</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Bone, clay, sage, ink.</h2>
  <div class="colorstory reveal">
    <div class="cchip" style="background:#efe9e0;color:#2b2825"><div class="cchip-name">Bone</div><div class="cchip-hex">#EFE9E0</div><div class="cchip-role">The ground — every frame breathes from here.</div></div>
    <div class="cchip" style="background:#b85c38;color:#efe9e0"><div class="cchip-name">Clay</div><div class="cchip-hex">#B85C38</div><div class="cchip-role">The accent — used once, never twice.</div></div>
    <div class="cchip" style="background:#7d8471;color:#efe9e0"><div class="cchip-name">Sage</div><div class="cchip-hex">#7D8471</div><div class="cchip-role">The quiet — shadow, foliage, calm.</div></div>
    <div class="cchip" style="background:#2b2825;color:#efe9e0"><div class="cchip-name">Ink</div><div class="cchip-hex">#2B2825</div><div class="cchip-role">The line — type and the deepest shadow.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Color story</span></div>
</div>`,
    }),
    s({
      id: 'mb-texture',
      name: 'Texture & materials',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Texture &amp; materials</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Things you want to touch.</h2>
  <div class="swatches reveal">
    <div class="matswatch"><div class="matchip img"><img src="${MOOD1_IMG}" alt=""></div><div class="mat-name">Raw clay</div><div class="mat-desc">Unglazed, matte, fingerprints welcome.</div></div>
    <div class="matswatch"><div class="matchip" style="background:#efe9e0"></div><div class="mat-name">Undyed linen</div><div class="mat-desc">Coarse weave, soft drape, lived-in.</div></div>
    <div class="matswatch"><div class="matchip" style="background:#7d8471"></div><div class="mat-name">Eucalyptus</div><div class="mat-desc">Dusty sage, dried, never glossy green.</div></div>
    <div class="matswatch"><div class="matchip" style="background:#caa988"></div><div class="mat-name">Warm plaster</div><div class="mat-desc">Hand-troweled walls, sun-faded.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Materials</span></div>
</div>`,
    }),
    s({
      id: 'mb-type',
      name: 'Typography direction',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Typographic direction</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:20px">A serif with a soft voice.</h2>
      <ul class="bullets" style="--gap:22px">
        <li class="bullet"><span><b>Spectral</b> for headlines — set large, lean on the <i>italic</i> for warmth.</span></li>
        <li class="bullet"><span><b>Inter</b> for everything functional — labels, captions, fine print.</span></li>
        <li class="bullet"><span>Generous leading. Let the words sit in light, never crowd them.</span></li>
      </ul>
    </div>
    <div class="specimen">
      <div class="spec-big">Aa</div>
      <div class="spec-row">
        <span class="spec-weight">Spectral</span>
        <span class="spec-weight ital">Italic</span>
      </div>
      <div class="rule" style="margin:28px 0"></div>
      <div class="spec-meta">Inter · 400 / 500 / 600 / 700</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Typography</span></div>
</div>`,
    }),
    s({
      id: 'mb-photo',
      name: 'Photography direction',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Photography direction</div>
    <h2 class="headline reveal">Shot in real light.</h2>
    <p class="lead reveal">Natural window light, late afternoon. Shallow focus, room to breathe, a little grain. Hands and dust and shadow are features, not flaws.</p>
    <div class="stats reveal" style="margin-top:10px">
      <div class="stat"><div class="stat-num">3:4</div><div class="stat-label">Preferred crop</div></div>
      <div class="stat"><div class="stat-num">f/2</div><div class="stat-label">Shallow focus</div></div>
      <div class="stat"><div class="stat-num">3200K</div><div class="stat-label">Warm daylight</div></div>
    </div>
    <div class="row reveal wrap" style="--gap:14px;margin-top:6px">
      <span class="tag">No flash</span><span class="tag">No gloss</span><span class="tag">No stock</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${MOOD2_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'mb-motion',
      name: 'Motion & light',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Motion &amp; light</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">How the warmth moves.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-num">01</div><div class="card-title">Drift, don't cut</div><div class="card-body">Slow pans and long dissolves. Nothing snaps; everything settles.</div></div>
    <div class="card"><div class="card-num">02</div><div class="card-title">Chase the light</div><div class="card-body">Let sun move across the frame — flares, shadows lengthening, dust in the beam.</div></div>
    <div class="card"><div class="card-num">03</div><div class="card-title">Hold longer</div><div class="card-body">Linger a beat past comfortable. The pace is the point.</div></div>
  </div>
  <div class="direction reveal" style="margin-top:42px">
    <div class="direction-k">North-star feeling</div>
    <div class="direction-t">It should feel like the room <span class="ital">exhaling</span>.</div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Motion &amp; light</span></div>
</div>`,
    }),
    s({
      id: 'mb-sec2',
      name: 'Section · Application',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Application</div>
  <div class="divider-title reveal">Where it<br/><span class="ital">lives.</span></div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'mb-compositions',
      name: 'Sample compositions',
      transition: 'slide',
      bodyHtml: `<div class="hero reverse">
  <div class="hero-text">
    <div class="kicker reveal">Sample compositions</div>
    <h2 class="headline reveal">The look, applied.</h2>
    <p class="lead reveal">A single object, off-center, in honest light. Type tucked into the negative space. One clay note, never more.</p>
    <div class="row reveal wrap" style="--gap:14px;margin-top:6px">
      <span class="tag">Hero still</span><span class="tag">Social 4:5</span><span class="tag">Editorial spread</span>
    </div>
  </div>
  <figure class="media reveal"><img src="${COVER_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'mb-rollout',
      name: 'Campaign rollout',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where the mood shows up</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">A slow, warm arrival.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Phase 01</div><div class="tl-what"><b>Tease</b> — still-life crops and material macros, no product, just the feeling.</div></div>
    <div class="tl-row"><div class="tl-when">Phase 02</div><div class="tl-what"><b>Reveal</b> — hero compositions in sunlit rooms, one object holding each frame.</div></div>
    <div class="tl-row"><div class="tl-when">Phase 03</div><div class="tl-what"><b>Live</b> — editorial spreads, social 4:5, and slow-drift motion across channels.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Rollout</span></div>
</div>`,
    }),
    s({
      id: 'mb-balance',
      name: 'Color balance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#efe9e0 0 70%, #7d8471 70% 88%, #b85c38 88% 100%)"><div class="donut-label" style="color:var(--text)">70%</div></div>
    </div>
    <div>
      <div class="kicker">The balance rule</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Mostly bone. Barely clay.</h2>
      <div class="legend" style="display:flex;flex-direction:column;gap:20px;font-family:var(--body);font-size:30px">
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:4px;background:#efe9e0;border:1px solid var(--card-border)"></span>Bone &amp; light<span style="margin-left:auto;color:var(--muted)">70%</span></div>
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:4px;background:#7d8471"></span>Sage &amp; shadow<span style="margin-left:auto;color:var(--muted)">18%</span></div>
        <div style="display:flex;align-items:center;gap:18px"><span style="width:18px;height:18px;border-radius:4px;background:#b85c38"></span>Clay accent<span style="margin-left:auto;color:var(--muted)">12%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Color balance</span></div>
</div>`,
    }),
    s({
      id: 'mb-dodont',
      name: "Do / Don't",
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Staying on mood</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Do, and please don't.</h2>
  <div class="cols-2 reveal" style="gap:30px">
    <div class="card dd-yes"><div class="dd-k">Do</div>
      <ul class="checks" style="--gap:18px;--bullet-size:30px;margin-top:8px">
        <li class="check"><span>Shoot in real, raw daylight.</span></li>
        <li class="check"><span>Leave space — let one object hold the frame.</span></li>
        <li class="check"><span>Keep clay to a single, deliberate note.</span></li>
      </ul>
    </div>
    <div class="card dd-no"><div class="dd-k">Don't</div>
      <ul class="bullets" style="--gap:18px;--bullet-size:30px;--bullet-color:var(--accent);margin-top:8px">
        <li class="bullet"><span>Add gradients, glow, or studio gloss.</span></li>
        <li class="bullet"><span>Crowd the frame or center everything.</span></li>
        <li class="bullet"><span>Let bright color sneak past the palette.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">Do / Don't</span></div>
</div>`,
    }),
    s({
      id: 'mb-checklist',
      name: 'Mood checklist',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Before it ships</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:18px">The frame test.</h2>
  <table class="table reveal" style="margin-top:6px">
    <thead><tr><th>Check</th><th>What we want</th><th>On mood?</th></tr></thead>
    <tbody>
      <tr><td>Light</td><td>Natural, directional, late-day</td><td><span class="accent-text">Yes</span></td></tr>
      <tr><td>Palette</td><td>Bone-led, one clay note</td><td><span class="accent-text">Yes</span></td></tr>
      <tr><td>Texture</td><td>Matte, tactile, hand-made</td><td><span class="accent-text">Yes</span></td></tr>
      <tr><td>Negative space</td><td>Generous — room to breathe</td><td><span class="accent-text">Yes</span></td></tr>
      <tr class="row-em"><td>Feeling</td><td>Three of seven keywords, minimum</td><td><span class="accent-text">Yes</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">The frame test</span></div>
</div>`,
    }),
    s({
      id: 'mb-northstar',
      name: 'The north star',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:80px">"If it feels rushed, it isn't us. Make the viewer want to <span class="ital accent-text">slow down</span> and stay."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Maren Holt</span><span class="cite-role">Creative Director</span></div>
  <div class="runner reveal"><span class="runner-brand">Maren &amp; Field</span><span class="runner-label">North star</span></div>
</div>`,
    }),
    s({
      id: 'mb-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${MOOD2_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Now go make it</div>
    <h2 class="display reveal" style="--display-size:118px">Keep it <span class="ital">warm.</span></h2>
    <p class="lead reveal">studio@marenandfield.com · the mood lives here</p>
  </div>
</div>`,
    }),
  ],
}
