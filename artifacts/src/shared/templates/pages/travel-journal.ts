import type { Template } from '../types'

// A cinematic, film-like travel-journal recap. Full-bleed parallaxing hero photo,
// a day-by-day rhythm with alternating photo/text layouts, an itinerary with a
// hand-drawn SVG dotted route, a closing photo grid, and a stats row. Warm muted
// editorial palette, a refined serif display (Fraunces) + clean sans (Inter).
// Every photo container carries a gradient fallback so a missing image still
// looks intentional. No chart libs — the route line is hand-rolled SVG.

const CSS = `
:root {
  --paper: #f3ede2;       /* warm paper */
  --paper-2: #ece3d4;     /* deeper card paper */
  --ink: #2c2722;         /* near-black warm */
  --ink-soft: #5c544a;    /* muted body */
  --faint: #8a8073;       /* captions / meta */
  --line: #d6cab4;        /* warm hairline */
  --accent: #b1572f;      /* terracotta */
  --gold: #c19a52;        /* brass */
  --sky: #6f7d6a;         /* sage */
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --measure: 62ch;
}
* { box-sizing: border-box; }
body { background: var(--paper); color: var(--ink); -webkit-font-smoothing: antialiased; }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 60px); }

/* ===== full-bleed cinematic hero ===== */
.hero { position: relative; height: clamp(560px, 98svh, 980px); min-height: 540px; overflow: hidden; display: flex; }
.hero__media {
  position: absolute; inset: -9% 0 0 0; width: 100%; height: 118%;
  /* warm gradient fallback shows through if the photo is missing */
  background:
    radial-gradient(120% 90% at 72% 18%, #d9874f 0%, transparent 55%),
    radial-gradient(120% 120% at 18% 92%, #5d6b63 0%, transparent 58%),
    linear-gradient(150deg, #c8703d 0%, #7d5236 46%, #34302b 100%);
  transform: translateY(calc(var(--scroll-y, 0px) * 0.10));
  will-change: transform;
}
.hero__media img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.hero__scrim {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(20,16,12,0.46) 0%, rgba(20,16,12,0.06) 30%, rgba(20,16,12,0.10) 56%, rgba(20,16,12,0.78) 100%);
}
.hero__grain { position: absolute; inset: 0; opacity: 0.5; mix-blend-mode: overlay; pointer-events: none;
  background-image: var(--grain); }
.hero__inner { position: relative; align-self: flex-end; width: 100%; padding-bottom: clamp(40px, 7vw, 92px); }
.hero__eyebrow {
  display: inline-flex; align-items: center; gap: 14px;
  color: #f4e7d4; font: 700 12.5px/1 var(--body); letter-spacing: 0.34em; text-transform: uppercase;
}
.hero__eyebrow::before { content: ''; width: 44px; height: 1px; background: var(--gold); opacity: 0.95; }
.hero__title {
  font-family: var(--display); font-weight: 380; font-optical-sizing: auto;
  font-size: clamp(50px, 11vw, 158px); line-height: 0.92; letter-spacing: -0.02em;
  color: #fbf3e6; margin: 20px 0 0; text-wrap: balance; text-shadow: 0 3px 44px rgba(0,0,0,0.32);
}
.hero__title em { font-style: italic; font-weight: 400; color: #f0cfa1; }
.hero__meta { margin: 26px 0 0; display: flex; flex-wrap: wrap; gap: 12px 26px; align-items: center;
  color: rgba(251,243,230,0.92); font: 500 clamp(14px,1.5vw,17px)/1 var(--body); letter-spacing: 0.02em; }
.hero__meta span { display: inline-flex; align-items: center; gap: 10px; }
.hero__meta span + span::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: var(--gold); margin-right: 16px; }
.hero__sub { margin: 18px 0 0; max-width: 50ch; font: 400 clamp(15px,1.5vw,19px)/1.55 var(--body); color: rgba(251,243,230,0.84); }
.scrollcue { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); color: rgba(251,243,230,0.7);
  font: 600 10.5px/1 var(--body); letter-spacing: 0.28em; text-transform: uppercase; display: inline-flex; flex-direction: column; align-items: center; gap: 9px; }
.scrollcue::after { content: ''; width: 1px; height: 36px; background: linear-gradient(rgba(251,243,230,0.7), transparent); animation: cue 2.2s ease-in-out infinite; transform-origin: top; }
@keyframes cue { 0%,100% { transform: scaleY(0.4); opacity: 0.5; } 50% { transform: scaleY(1); opacity: 1; } }

/* ===== lede / intro ===== */
.lede { margin: clamp(58px, 9vw, 124px) 0 clamp(46px, 7vw, 96px); display: grid; grid-template-columns: 0.9fr 1.4fr; gap: clamp(28px, 5vw, 72px); align-items: start; }
.lede__kicker { font: 700 12px/1 var(--body); letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); }
.lede__head { font-family: var(--display); font-weight: 360; font-optical-sizing: auto; font-size: clamp(28px, 4.4vw, 54px); line-height: 1.08; letter-spacing: -0.018em; margin: 16px 0 0; text-wrap: balance; }
.lede__head em { font-style: italic; color: var(--accent); }
.lede__copy { font: 400 clamp(16px,1.35vw,19px)/1.74 var(--body); color: var(--ink-soft); }
.lede__copy p + p { margin-top: 20px; }
.lede__copy .drop::first-letter { font-family: var(--display); font-weight: 400; font-size: 3.4em; line-height: 0.78; float: left; padding: 8px 12px 0 0; color: var(--accent); }

/* ===== day section ===== */
.day { padding: clamp(40px, 6vw, 78px) 0; border-top: 1px solid var(--line); }
.day__grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(28px, 5vw, 70px); align-items: center; }
.day.flip .day__grid { direction: rtl; }
.day.flip .day__grid > * { direction: ltr; }
.day__marker { display: flex; align-items: baseline; gap: 16px; }
.day__no { font-family: var(--display); font-weight: 300; font-size: clamp(54px, 8vw, 104px); line-height: 0.8; letter-spacing: -0.03em; color: var(--accent); }
.day__place { }
.day__place .tag { font: 700 11.5px/1 var(--body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--faint); }
.day__place h2 { font-family: var(--display); font-weight: 400; font-size: clamp(26px, 3.6vw, 42px); line-height: 1.0; letter-spacing: -0.015em; margin: 10px 0 0; }
.day__body { margin: 22px 0 0; font: 400 clamp(15px,1.3vw,18px)/1.7 var(--body); color: var(--ink-soft); max-width: 46ch; }
.chips { display: flex; flex-wrap: wrap; gap: 9px; margin: 24px 0 0; }
.chip { font: 600 12.5px/1 var(--body); color: var(--ink); background: var(--paper-2); border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 8px; }
.chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }

/* photo figure with gradient fallback tile + film frame */
.figure { position: relative; border-radius: 14px; overflow: hidden; box-shadow: 0 28px 60px -34px rgba(44,34,24,0.55); }
.figure::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(44,34,24,0.10); border-radius: 14px; pointer-events: none; }
.figure--a { background: linear-gradient(150deg, #c97b46 0%, #8a5a3a 52%, #4a4038 100%); }
.figure--b { background: linear-gradient(150deg, #6f7d6a 0%, #4f5e54 54%, #2e352f 100%); }
.figure--c { background: linear-gradient(150deg, #c9a45a 0%, #9c7c3e 52%, #4a3f2c 100%); }
.figure img { width: 100%; height: 100%; object-fit: cover; display: block; aspect-ratio: 4 / 5; }
.figure .cap { position: absolute; left: 14px; bottom: 12px; right: 14px; color: #f6ecdb; font: 500 12.5px/1.3 var(--body); letter-spacing: 0.01em; text-shadow: 0 1px 8px rgba(0,0,0,0.45); }
.figure .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 52%, rgba(20,16,12,0.5) 100%); }
.figure--wide img { aspect-ratio: 3 / 2; }

/* reveal motion for figures + markers */
.reveal .figure { opacity: 0; transform: translateY(26px) scale(0.985); transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1); }
.reveal.in .figure { opacity: 1; transform: none; }
.reveal .day__no { opacity: 0; transform: translateY(14px); transition: opacity 0.8s ease 0.05s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.05s; }
.reveal.in .day__no { opacity: 1; transform: none; }

/* ===== itinerary / route ===== */
.route { padding: clamp(50px, 8vw, 110px) 0; border-top: 1px solid var(--line); }
.route__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: clamp(26px, 4vw, 48px); }
.route__head h2 { font-family: var(--display); font-weight: 380; font-size: clamp(28px, 4vw, 50px); line-height: 1; letter-spacing: -0.02em; margin: 0; }
.route__head h2 em { font-style: italic; color: var(--accent); }
.route__head p { color: var(--faint); font: 500 13px/1 var(--body); letter-spacing: 0.04em; }
.routebox { position: relative; }
.routepath { width: 100%; height: auto; display: block; overflow: visible; }
.routepath .trail { fill: none; stroke: var(--accent); stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 2 11;
  stroke-dashoffset: 0; opacity: 0.55; }
.routepath .trail-draw { fill: none; stroke: var(--accent); stroke-width: 2.4; stroke-linecap: round;
  stroke-dasharray: 1600; stroke-dashoffset: 1600; opacity: 0; }
.routepath .stop { fill: var(--paper); stroke: var(--accent); stroke-width: 2.4; }
.routepath .stop-core { fill: var(--accent); }
.routepath .lbl { fill: var(--ink); font: 700 15px var(--display); }
.routepath .sub { fill: var(--faint); font: 500 11.5px var(--body); }
.routelist { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px clamp(28px, 5vw, 64px); margin-top: clamp(26px, 4vw, 44px); }
.stoprow { display: grid; grid-template-columns: 30px 1fr auto; align-items: baseline; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--line); }
.stoprow .i { font: 700 12px var(--body); color: var(--gold); letter-spacing: 0.04em; }
.stoprow .nm { font-family: var(--display); font-weight: 420; font-size: clamp(17px, 1.8vw, 21px); }
.stoprow .nm small { display: block; font-family: var(--body); font-weight: 400; font-size: 13px; color: var(--faint); margin-top: 3px; letter-spacing: 0.01em; }
.stoprow .ni { font: 600 13px var(--body); color: var(--ink-soft); white-space: nowrap; }

/* ===== closing photo grid ===== */
.gallery { padding: clamp(40px, 6vw, 80px) 0 0; }
.gallery h2 { font-family: var(--display); font-weight: 380; font-size: clamp(26px, 3.6vw, 44px); letter-spacing: -0.02em; margin: 0 0 clamp(22px, 3vw, 38px); }
.gallery h2 em { font-style: italic; color: var(--accent); }
.gallery__grid { display: grid; grid-template-columns: repeat(6, 1fr); grid-auto-rows: clamp(110px, 13vw, 170px); gap: 12px; }
.gtile { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 18px 40px -28px rgba(44,34,24,0.5); }
.gtile::after { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 0 1px rgba(44,34,24,0.10); border-radius: 12px; }
.gtile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gtile--g1 { background: linear-gradient(150deg, #c97b46, #5d4633); }
.gtile--g2 { background: linear-gradient(150deg, #6f7d6a, #303a32); }
.gtile--g3 { background: linear-gradient(150deg, #c9a45a, #5a4a2c); }
.gtile--g4 { background: linear-gradient(150deg, #a85c5c, #3d2c2c); }
.gtile--g5 { background: linear-gradient(150deg, #5b6b78, #2b3540); }
.span2c { grid-column: span 2; } .span3c { grid-column: span 3; } .span2r { grid-row: span 2; }

/* ===== stats row + footer ===== */
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(18px, 3vw, 40px); margin: clamp(52px, 8vw, 110px) 0 0; padding-top: clamp(36px, 5vw, 60px); border-top: 2px solid var(--ink); }
.stat .k { font: 700 11.5px/1 var(--body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
.stat .v { font-family: var(--display); font-weight: 340; font-size: clamp(40px, 5.6vw, 76px); line-height: 0.9; letter-spacing: -0.03em; margin: 14px 0 0; }
.stat .v .u { font-size: 0.42em; color: var(--faint); letter-spacing: 0; margin-left: 4px; }
.stat .d { margin: 10px 0 0; font: 400 13.5px/1.4 var(--body); color: var(--ink-soft); }
.colophon { margin: clamp(52px, 7vw, 96px) 0 clamp(40px, 6vw, 80px); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  font: 500 13px/1 var(--body); color: var(--faint); letter-spacing: 0.03em; }
.colophon .sig { font-family: var(--display); font-style: italic; font-weight: 400; font-size: 22px; color: var(--ink); letter-spacing: 0; }

/* ===== responsive ===== */
@media (max-width: 820px) {
  .lede { grid-template-columns: 1fr; gap: 18px; }
  .day__grid, .day.flip .day__grid { grid-template-columns: 1fr; direction: ltr; gap: 26px; }
  .day__grid > * { direction: ltr; }
  .day.flip .day__media { order: -1; }
  .day__media { order: -1; }
  .routelist { grid-template-columns: 1fr; }
  .gallery__grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: clamp(130px, 34vw, 200px); }
  .span2c, .span3c { grid-column: span 2; } .span2r { grid-row: span 1; }
  .stats { grid-template-columns: repeat(2, 1fr); gap: 28px 20px; }
  .routepath { display: none; }
  /* the centered scroll cue collides with the wrapped hero deck on narrow widths */
  .scrollcue { display: none; }
}
@media (max-width: 480px) {
  .hero__meta span + span::before { display: none; }
  .hero__meta { gap: 6px 16px; }
  .stats { grid-template-columns: 1fr 1fr; }
  .figure img { aspect-ratio: 1 / 1; }
}
`.trim()

const HTML = `
<header class="hero reveal" data-reveal="none">
  <div class="hero__media">
    <img src="assets/travel-1.jpg" alt="A quiet lantern-lit alley in Kyoto at dusk, wet cobblestones reflecting warm light">
  </div>
  <div class="hero__scrim"></div>
  <div class="hero__grain"></div>
  <div class="wrap hero__inner">
    <span class="hero__eyebrow">A Travel Journal</span>
    <h1 class="hero__title">Ten Days in <em>Japan</em></h1>
    <div class="hero__meta">
      <span class="num">Apr 4 — Apr 13, 2026</span>
      <span>Tokyo · Hakone · Kyoto · Naoshima</span>
    </div>
    <p class="hero__sub">Cherry blossoms past their peak, slow trains, too much ramen, and the kind of quiet that only old cities keep. Here is how it went, day by day.</p>
  </div>
  <span class="scrollcue">Scroll</span>
</header>

<main class="wrap">
  <section class="lede reveal">
    <div>
      <div class="lede__kicker">The trip, in brief</div>
      <h2 class="lede__head">We came for the blossoms and stayed for <em>everything underneath</em> them.</h2>
    </div>
    <div class="lede__copy">
      <p class="drop">Ten days is not enough for Japan, and everyone tells you so. You go anyway, and you let the country set the pace — the heated train seats, the vending machines glowing at the end of empty streets, the way a bowl of noodles can feel like the whole point of a morning. We started loud in Tokyo and ended barefoot on an art island in the Seto Inland Sea.</p>
      <p>What follows is the unedited version: the great meals and the wrong turns, the temple we lined up an hour for and the tiny bar we found by accident and loved more. Photographs by us, on a camera that fogged up every time we stepped inside.</p>
    </div>
  </section>

  <section class="day reveal">
    <div class="day__grid">
      <div class="day__text">
        <div class="day__marker">
          <div class="day__no num">01</div>
          <div class="day__place"><div class="tag">Tokyo · Shibuya</div><h2>Landing into the noise</h2></div>
        </div>
        <p class="day__body">Off the plane jet-lagged and straight into Shibuya at golden hour, which is exactly the wrong and exactly the right way to begin. We crossed the scramble four times for no reason, ate standing up at a counter that sat eight, and watched the whole city change colour from a rooftop we weren't sure we were allowed on.</p>
        <div class="chips">
          <span class="chip">Shibuya Crossing</span>
          <span class="chip">Standing sushi</span>
          <span class="chip">Golden-hour rooftop</span>
        </div>
      </div>
      <figure class="figure figure--a day__media">
        <img src="assets/travel-2.jpg" alt="Neon-lit Shibuya street at night, crowds crossing under glowing signs">
        <div class="scrim"></div>
        <figcaption class="cap">Shibuya, the first night — neon and rain.</figcaption>
      </figure>
    </div>
  </section>

  <section class="day flip reveal">
    <div class="day__grid">
      <div class="day__text">
        <div class="day__marker">
          <div class="day__no num">04</div>
          <div class="day__place"><div class="tag">Hakone · Lake Ashi</div><h2>Steam, cedar, and a mountain</h2></div>
        </div>
        <p class="day__body">A slow change of gears. The mountain railway switchbacks up through the cedars, you soak in an onsen until you forget your own name, and on a clear afternoon Fuji finally shows itself across the lake — for exactly long enough to feel earned, then gone behind cloud.</p>
        <div class="chips">
          <span class="chip">Open-air onsen</span>
          <span class="chip">Black eggs at Owakudani</span>
          <span class="chip">Fuji, briefly</span>
        </div>
      </div>
      <figure class="figure figure--b day__media">
        <img src="assets/travel-3.jpg" alt="Mist over Lake Ashi in Hakone with cedar forest and a red torii gate at the water's edge">
        <div class="scrim"></div>
        <figcaption class="cap">Lake Ashi at dawn, before the cloud closed in.</figcaption>
      </figure>
    </div>
  </section>

  <section class="day reveal">
    <div class="day__grid">
      <div class="day__text">
        <div class="day__marker">
          <div class="day__no num">07</div>
          <div class="day__place"><div class="tag">Kyoto · Higashiyama</div><h2>The old city wakes early</h2></div>
        </div>
        <p class="day__body">We learned the trick: be at the temples by seven, before the tour buses, when the gravel is just raked and the light comes sideways through the maples. Fushimi Inari at dawn was ours alone for a hundred gates. By noon we'd retreated to a tea house and a long, wordless lunch.</p>
        <div class="chips">
          <span class="chip">Fushimi Inari at dawn</span>
          <span class="chip">Philosopher's Path</span>
          <span class="chip">Kaiseki lunch</span>
        </div>
      </div>
      <figure class="figure figure--c day__media">
        <div class="scrim"></div>
        <figcaption class="cap">Endless vermilion gates, Fushimi Inari.</figcaption>
      </figure>
    </div>
  </section>

  <section class="route reveal">
    <div class="route__head">
      <h2>The <em>route</em> we took</h2>
      <p class="num">4 cities · ~1,180 km of trains</p>
    </div>
    <div class="routebox">
      <svg class="routepath" viewBox="0 0 1080 220" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path class="trail" d="M70,150 C200,70 320,70 430,140 C540,210 640,210 720,130 C800,55 920,55 1010,120"/>
        <path class="trail-draw" d="M70,150 C200,70 320,70 430,140 C540,210 640,210 720,130 C800,55 920,55 1010,120"/>
        <g>
          <circle class="stop" cx="70" cy="150" r="9"/><circle class="stop-core" cx="70" cy="150" r="3.4"/>
          <text class="lbl" x="70" y="184" text-anchor="middle">Tokyo</text>
          <text class="sub" x="70" y="202" text-anchor="middle">days 1–3</text>
        </g>
        <g>
          <circle class="stop" cx="430" cy="140" r="9"/><circle class="stop-core" cx="430" cy="140" r="3.4"/>
          <text class="lbl" x="430" y="174" text-anchor="middle">Hakone</text>
          <text class="sub" x="430" y="192" text-anchor="middle">days 4–5</text>
        </g>
        <g>
          <circle class="stop" cx="720" cy="130" r="9"/><circle class="stop-core" cx="720" cy="130" r="3.4"/>
          <text class="lbl" x="720" y="108" text-anchor="middle">Kyoto</text>
          <text class="sub" x="720" y="90" text-anchor="middle">days 6–8</text>
        </g>
        <g>
          <circle class="stop" cx="1010" cy="120" r="9"/><circle class="stop-core" cx="1010" cy="120" r="3.4"/>
          <text class="lbl" x="1010" y="154" text-anchor="middle">Naoshima</text>
          <text class="sub" x="1010" y="172" text-anchor="middle">days 9–10</text>
        </g>
      </svg>
    </div>
    <div class="routelist">
      <div class="stoprow"><span class="i num">01</span><span class="nm">Tokyo<small>Shibuya · Shinjuku · Yanaka</small></span><span class="ni num">3 nights</span></div>
      <div class="stoprow"><span class="i num">02</span><span class="nm">Hakone<small>Lake Ashi · Owakudani onsen</small></span><span class="ni num">2 nights</span></div>
      <div class="stoprow"><span class="i num">03</span><span class="nm">Kyoto<small>Higashiyama · Arashiyama · Gion</small></span><span class="ni num">3 nights</span></div>
      <div class="stoprow"><span class="i num">04</span><span class="nm">Naoshima<small>Benesse House · Chichu Art Museum</small></span><span class="ni num">2 nights</span></div>
    </div>
  </section>

  <section class="gallery reveal">
    <h2>A few <em>frames</em> that stayed with us</h2>
    <div class="gallery__grid">
      <div class="gtile gtile--g1 span3c span2r"><div class="scrim"></div></div>
      <div class="gtile gtile--g2 span3c"></div>
      <div class="gtile gtile--g3"></div>
      <div class="gtile gtile--g4"></div>
      <div class="gtile gtile--g5 span2c"></div>
      <div class="gtile gtile--g2 span2c"></div>
      <div class="gtile gtile--g1"></div>
      <div class="gtile gtile--g3"></div>
      <div class="gtile gtile--g5"></div>
    </div>
  </section>

  <section class="stats reveal">
    <div class="stat"><div class="k">Miles flown</div><div class="v num">11,640</div><div class="d">Round trip, two long-haul legs and one wrong gate.</div></div>
    <div class="stat"><div class="k">Cities</div><div class="v num">4</div><div class="d">Plus a dozen places we wish we'd booked longer.</div></div>
    <div class="stat"><div class="k">Days</div><div class="v num">10</div><div class="d">Not enough. It is never enough.</div></div>
    <div class="stat"><div class="k">Photos kept</div><div class="v num">2,418<span class="u">of 9k</span></div><div class="d">After three honest, ruthless edits.</div></div>
  </section>

  <div class="colophon">
    <span>Tokyo → Hakone → Kyoto → Naoshima · Spring 2026</span>
    <span class="sig">— back again, soon</span>
  </div>
</main>
`.trim()

const JS = `
// Subtle grain texture (data-URI SVG noise) — set once on :root.
(function () {
  var noise = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">' +
    '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/></filter>' +
    '<rect width="160" height="160" filter="url(#n)" opacity="0.5"/></svg>');
  document.documentElement.style.setProperty('--grain', "url('" + noise + "')");
})();

// Draw the route trail when it scrolls into view (replays on re-entry).
(function () {
  var draw = document.querySelector('.trail-draw');
  if (!draw) return;
  var len = 0;
  try { len = draw.getTotalLength(); } catch (e) { len = 1600; }
  draw.style.strokeDasharray = len;
  draw.style.strokeDashoffset = len;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var section = draw.closest('.route');
  function run() {
    draw.style.transition = 'none';
    draw.style.strokeDashoffset = len;
    draw.style.opacity = '0.85';
    // force reflow so the transition takes
    void draw.getBoundingClientRect();
    draw.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.22,1,0.36,1)';
    draw.style.strokeDashoffset = '0';
  }
  if (reduce || !('IntersectionObserver' in window)) { draw.style.opacity = '0.85'; draw.style.strokeDashoffset = '0'; return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) run(); });
  }, { threshold: 0.4 });
  if (section) io.observe(section);
})();
`.trim()

export const travelJournal: Template = {
  id: 'travel-journal',
  kind: 'page',
  name: 'Travel Journal',
  tagline: 'A photo-rich, day-by-day trip recap',
  categories: ['Personal'],
  audiences: ['personal', 'travel', 'storytelling'],
  description:
    'A cinematic, film-like travel journal that recaps a trip day by day. A full-bleed parallaxing hero photo opens onto an editorial lede, alternating photo/text day sections with highlight chips, an itinerary with a hand-drawn SVG dotted route that draws itself on scroll, a closing photo grid, and a stats row. Warm muted palette, a Fraunces serif display paired with Inter — swap in your own destination, dates, and three photos.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#f3ede2',
  assets: ['travel-1.jpg', 'travel-2.jpg', 'travel-3.jpg'],
  notes:
    'Warm film-editorial travel recap. PALETTE KNOBS (in :root): --paper / --paper-2 (backgrounds), --ink / --ink-soft / --faint (text), --accent terracotta, --gold brass, --sky sage; recolor the whole piece from these. The display face is Fraunces (use <em> for italic emphasis — it tints --accent) and body is Inter with tabular numerals on every figure (.num). STRUCTURE: edit the hero (.hero__title / .hero__meta / .hero__sub) for destination + dates + tagline; each trip day is a <section class="day"> (add class "flip" to alternate the photo to the other side — it auto-stacks photo-first on mobile). Update .day__no, the .tag/h2, the journal paragraph, and the .chips. PHOTOS: only three are wired — assets/travel-1.jpg (full-bleed hero), travel-2.jpg (Day 01 figure) and travel-3.jpg (Day 04 figure); every photo container has a gradient fallback (.figure--a/b/c, .gtile--g1..g5, the hero gradient) so a missing image still looks intentional. To use a real photo on Day 07 or in the gallery tiles, drop an <img> inside that .figure/.gtile. The route is hand-rolled SVG — move the stop circles + labels and the connecting path to change the map; it draws itself via page.js on scroll. Update the closing .stats numbers (keep .num and unit glyphs in <span class="u">).',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..500;1,9..144,300..500&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f3ede2',
  },
}
