import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/pastel-creative-cover.jpg'
const FIG_IMG = 'assets/pastel-creative-fig.jpg'

export const pastelCreative: Template = {
  id: 'pastel-creative',
  categories: ['Creative'],
  name: 'Pastel Creative',
  tagline: 'Soft gradients, rounded, joyfully optimistic',
  audiences: ['creative', 'community', 'workshop', 'brand'],
  description:
    'A soft, joyful deck with pastel gradient washes, very rounded cards, and friendly geometry. A complete creative-concept pitch — big idea, insight, experience, rollout — that you retheme for any campaign or brand.',
  fonts: {
    display: 'Cabinet Grotesk',
    body: 'Satoshi',
    links: [
      'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800&f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fdf4ff',
    '--text': '#241c40',
    '--muted': '#6f6790',
    '--accent': '#ff5fa2',
    '--accent-2': '#7c5cff',
    '--display': "'Cabinet Grotesk', sans-serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '800',
    '--title-size': '142px',
    '--display-size': '176px',
    '--headline-size': '88px',
    '--lead-size': '38px',
    '--card-bg': '#ffffff',
    '--card-border': '#f0e3f7',
    '--card-shadow': '0 18px 50px -18px rgba(124,92,255,0.20)',
    '--radius': '32px',
    '--media-radius': '32px',
    '--media-shadow': '0 40px 90px -30px rgba(124,92,255,0.35)',
    '--chip-bg': '#fbeeff',
    '--track': '#f0e3f7',
    '--donut-hole': '#fdf4ff',
    '--bar-gap': '34px',
    '--bullet-color': '#ff5fa2',
    '--scrim':
      'linear-gradient(180deg, rgba(36,28,64,0.05) 0%, rgba(36,28,64,0.35) 45%, rgba(36,28,64,0.82) 100%)',
  },
  stageBg: '#f7e9fb',
  assets: ['pastel-creative-cover.jpg', 'pastel-creative-fig.jpg'],
  decoration: `.slide {
  background:
    radial-gradient(1000px 640px at 86% 8%, rgba(255,95,162,0.20), transparent 60%),
    radial-gradient(1000px 760px at 6% 96%, rgba(124,92,255,0.20), transparent 62%),
    #fdf4ff;
}
.kicker { color: var(--accent-2); }
.bar-fill { background: var(--accent); border-radius: 18px 18px 0 0; }
.donut-label { color: var(--text); }
.flow-arrow::after { border-color: var(--accent-2); }
.step::before { color: var(--accent-2); background: var(--chip-bg); border-color: var(--card-border); }
.tl-when { color: var(--accent); }

/* ---- Section divider — soft pastel wash, no image needed ---- */
.bloom-divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 22px; }
.bloom-divider::before { content: ''; position: absolute; right: -120px; top: 50%; transform: translateY(-50%); width: 620px; height: 620px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, rgba(255,95,162,0.28), rgba(124,92,255,0.16) 60%, transparent 72%); filter: blur(2px); }
.bloom-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; font-size: 24px; color: var(--accent); }
.bloom-title { font-family: var(--display); font-weight: 800; font-size: 158px; line-height: 0.92; letter-spacing: -0.025em; color: var(--text); position: relative; }
.bloom-sub { font-family: var(--body); font-size: 36px; color: var(--muted); max-width: 26ch; position: relative; }

/* ---- Soft rounded chip (bigger, friendlier than .pill) ---- */
.softchip { display: inline-flex; align-items: center; gap: 12px; padding: 16px 30px; border-radius: 999px; background: var(--card-bg); border: 1px solid var(--card-border); box-shadow: 0 10px 30px -16px rgba(124,92,255,0.30); font-family: var(--body); font-weight: 700; font-size: 30px; color: var(--text); }
.softchip .dot { width: 16px; height: 16px; border-radius: 50%; background: var(--accent); }
.softchip .dot.alt { background: var(--accent-2); }

/* ---- Bloom card — pastel-tinted rounded card with a soft glyph badge ---- */
.bloom { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 46px 42px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 16px; position: relative; overflow: hidden; }
.bloom::after { content: ''; position: absolute; right: -70px; top: -70px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle at 40% 40%, rgba(255,95,162,0.16), transparent 70%); }
.bloom-badge { width: 78px; height: 78px; border-radius: 24px; display: grid; place-items: center; font-size: 40px; background: var(--chip-bg); border: 1px solid var(--card-border); }
.bloom-t { font-family: var(--display); font-weight: 700; font-size: 40px; line-height: 1.04; color: var(--text); }
.bloom-d { font-family: var(--body); font-size: 27px; line-height: 1.42; color: var(--muted); }

/* ---- Big pull-statement (the idea) ---- */
.idea { font-family: var(--display); font-weight: 800; font-size: 120px; line-height: 0.98; letter-spacing: -0.02em; color: var(--text); text-wrap: balance; }

/* ---- Legend for the playful data moment ---- */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-weight: 500; font-size: 32px; color: var(--text); }
.legend-dot { width: 20px; height: 20px; border-radius: 7px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-family: var(--display); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--muted); }

/* ---- Mood swatch row (mood & feeling) ---- */
.swatches { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
.sw { border-radius: 26px; padding: 30px 28px; min-height: 220px; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; box-shadow: 0 18px 50px -24px rgba(124,92,255,0.30); }
.sw-name { font-family: var(--display); font-weight: 700; font-size: 30px; }
.sw-hex { font-family: var(--body); font-weight: 500; font-size: 22px; opacity: 0.8; }

/* ---- Runner footer — rounded brand tile ---- */
.runner { border-top: 1px solid var(--card-border); }
.runner-brand::before { border-radius: 50%; background: var(--accent); }
.runner-label { color: var(--accent-2); }

@media (max-width: 640px) {
  html.deck-can-flow .bloom-divider { position: relative !important; inset: auto !important; padding: 64px var(--pad-x, 26px) !important; min-height: 340px; overflow: hidden; }
  html.deck-can-flow .bloom-divider::before { width: 320px !important; height: 320px !important; right: -120px !important; }
  html.deck-can-flow .bloom-title { font-size: min(54px, 15vw) !important; line-height: 0.98 !important; }
  html.deck-can-flow .bloom-sub { font-size: min(30px, 8vw) !important; max-width: 100% !important; }
  html.deck-can-flow .idea { font-size: min(41px, 11vw) !important; line-height: 1.02 !important; }
  html.deck-can-flow .swatches { grid-template-columns: 1fr 1fr !important; gap: 14px; }
  html.deck-can-flow .bloom { padding: 30px 24px !important; }
}`,
  notes:
    'Playful and optimistic. Soft gradient washes, very rounded cards, friendly geometry, ONE pink accent (#ff5fa2) with a violet secondary (#7c5cff) — no hard edges, no third color. Open and close on the pastel abstract full-bleed (assets/pastel-creative-cover.jpg); use the dreamy concept still-life (assets/pastel-creative-fig.jpg) for the .split and .hero. Signature pieces: .bloom-divider section breaks (soft radial wash, no image), .bloom cards with emoji-glyph badges for key elements, .softchip rounded tags, .idea XXL statement for the big idea, .swatches mood row, and a pink/violet .donut + .bars for the playful data moment. Use .grad-text only on a few key words. Keep it warm and human; let whitespace and one soft image carry each slide.',
  sampleSlides: [
    s({
      id: 'pc-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'zoom',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Concept Pitch · Bloom Yogurt · Spring 2026</div>
    <h1 class="display reveal" style="--display-size:150px;margin-top:8px">Soft<br/>Serve<br/>Feelings.</h1>
    <p class="lead reveal">A campaign that makes a snack feel like a small, kind moment to yourself.</p>
  </div>
</div>`,
    }),
    s({
      id: 'pc-idea',
      name: 'The big idea',
      transition: 'fade',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The big idea</div>
  <h2 class="idea reveal" style="margin-top:14px">Treat your<br/><span class="grad-text">tender feelings</span><br/>like dessert.</h2>
  <p class="lead reveal" style="--lead-size:40px;max-width:30ch;margin-top:18px">Bloom isn't selling yogurt. It's selling the two minutes you take to be soft with yourself.</p>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">The idea</span></div>
</div>`,
    }),
    s({
      id: 'pc-insight',
      name: 'The insight',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The insight behind it</div>
      <h2 class="headline" style="margin-top:8px">Everyone's tired of being optimized.</h2>
      <p class="lead" style="margin-top:18px">Our audience is exhausted by hustle, hacks, and hard edges. They crave permission to slow down for one small, unproductive, lovely thing.</p>
    </div>
    <ul class="bullets" style="--gap:30px">
      <li class="bullet"><span><b>71%</b> of 18–34s say wellness feels like another chore.</span></li>
      <li class="bullet"><span>They reward brands that feel <b>gentle, not preachy</b>.</span></li>
      <li class="bullet"><span>"Soft life" is up <b>4×</b> in cultural search over two years.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">The insight</span></div>
</div>`,
    }),
    s({
      id: 'pc-sec1',
      name: 'Section · The concept',
      transition: 'fade',
      bodyHtml: `<div class="bloom-divider">
  <div class="bloom-num reveal">01 — The concept</div>
  <div class="bloom-title reveal">A little<br/>softness,<br/>on purpose.</div>
  <div class="bloom-sub reveal">How the idea becomes a world people want to live inside.</div>
</div>`,
    }),
    s({
      id: 'pc-concept',
      name: 'The concept',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The concept</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Permission, in a pastel package.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="bloom"><div class="bloom-badge">🌸</div><div class="bloom-t">A feeling, not a feature</div><div class="bloom-d">We never lead with protein or probiotics — we lead with a soft exhale.</div></div>
    <div class="bloom"><div class="bloom-badge">🫧</div><div class="bloom-t">A whole soft world</div><div class="bloom-d">Rounded shapes, gentle motion, blush-and-lilac everything — instantly Bloom.</div></div>
    <div class="bloom"><div class="bloom-badge">💌</div><div class="bloom-t">An invitation, not an ad</div><div class="bloom-d">Every touchpoint quietly says: this small moment is allowed to just be nice.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">The concept</span></div>
</div>`,
    }),
    s({
      id: 'pc-mood',
      name: 'Mood & feeling',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Mood &amp; feeling</div>
    <h2 class="headline reveal">Warm light, soft edges, slow breath.</h2>
    <p class="lead reveal">A sunlit afternoon nap, a friend who never rushes you, the first spoonful before the day begins. Everything rounded, nothing sharp.</p>
    <div class="row wrap reveal" style="gap:14px;margin-top:4px">
      <span class="softchip"><span class="dot"></span>tender</span>
      <span class="softchip"><span class="dot alt"></span>unhurried</span>
      <span class="softchip"><span class="dot"></span>playful</span>
    </div>
    <div class="swatches reveal" style="grid-template-columns:repeat(4,1fr);margin-top:18px">
      <div class="sw" style="background:#ff5fa2;color:#fff;min-height:120px"><div class="sw-name" style="font-size:24px">Pink</div><div class="sw-hex" style="font-size:18px">#FF5FA2</div></div>
      <div class="sw" style="background:#7c5cff;color:#fff;min-height:120px"><div class="sw-name" style="font-size:24px">Violet</div><div class="sw-hex" style="font-size:18px">#7C5CFF</div></div>
      <div class="sw" style="background:#fbeeff;color:#241c40;min-height:120px"><div class="sw-name" style="font-size:24px">Lilac</div><div class="sw-hex" style="font-size:18px">#FBEEFF</div></div>
      <div class="sw" style="background:#241c40;color:#fdf4ff;min-height:120px"><div class="sw-name" style="font-size:24px">Plum</div><div class="sw-hex" style="font-size:18px">#241C40</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pc-experience',
      name: 'The experience',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The experience</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">How a person meets Bloom.</h2>
  <ol class="steps reveal" style="--gap:30px">
    <li class="step"><span><b>Notice</b> — a soft-pink film moment catches them mid-scroll, no hard sell.</span></li>
    <li class="step"><span><b>Smile</b> — the line "be soft with yourself" lands like a small gift.</span></li>
    <li class="step"><span><b>Reach</b> — the rounded tub on shelf feels like the same calm, in their hand.</span></li>
    <li class="step"><span><b>Return</b> — the ritual repeats; the brand becomes their two-minute kindness.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">The experience</span></div>
</div>`,
    }),
    s({
      id: 'pc-sec2',
      name: 'Section · The build',
      transition: 'fade',
      bodyHtml: `<div class="bloom-divider">
  <div class="bloom-num reveal">02 — The build</div>
  <div class="bloom-title reveal">Where the<br/>idea shows<br/>up.</div>
  <div class="bloom-sub reveal">The elements, the proof it resonates, and the executions that bring it to life.</div>
</div>`,
    }),
    s({
      id: 'pc-elements',
      name: 'Key elements',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Key elements</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Six soft signatures.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="bloom"><div class="bloom-badge">✍️</div><div class="bloom-t">The line</div><div class="bloom-d">"Be soft with yourself." — our whole brand in four words.</div></div>
    <div class="bloom"><div class="bloom-badge">🌀</div><div class="bloom-t">The shape</div><div class="bloom-d">A rounded blob mark that morphs gently across every frame.</div></div>
    <div class="bloom"><div class="bloom-badge">🎨</div><div class="bloom-t">The wash</div><div class="bloom-d">Blush-to-lilac gradients on everything, edge to edge.</div></div>
    <div class="bloom"><div class="bloom-badge">🎵</div><div class="bloom-t">The hum</div><div class="bloom-d">A four-note sonic signature — a tiny, warm exhale.</div></div>
    <div class="bloom"><div class="bloom-badge">🥄</div><div class="bloom-t">The ritual</div><div class="bloom-d">The slow first spoonful, always shot in real, golden light.</div></div>
    <div class="bloom"><div class="bloom-badge">💬</div><div class="bloom-t">The voice</div><div class="bloom-d">Gentle, never preachy — talks to you like a kind friend.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Key elements</span></div>
</div>`,
    }),
    s({
      id: 'pc-data',
      name: 'Playful data moment',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:360px;background:conic-gradient(#ff5fa2 0 64%, #7c5cff 64% 88%, #fbeeff 88% 100%)"><div class="donut-label" style="font-size:72px">64%</div></div>
    </div>
    <div>
      <div class="kicker">The feeling test</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:22px">People felt it before we explained it.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:#ff5fa2"></span>"Calm / soft"<span class="v">64%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#7c5cff"></span>"Playful / happy"<span class="v">24%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#fbeeff;border:1px solid #f0e3f7"></span>Other / unsure<span class="v">12%</span></div>
      </div>
      <p class="fine reveal" style="margin-top:22px">Unprompted reactions to the moodfilm, n=240 in-target.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">A playful data moment</span></div>
</div>`,
    }),
    s({
      id: 'pc-resonance',
      name: 'Concept testing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Concept testing</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">It outperformed the brief.</h2>
  <div class="bars reveal" style="--bars-height:360px">
    <div class="bar" style="--h:42%"><div class="bar-fill" data-val="42"></div><div class="bar-label">Category norm</div></div>
    <div class="bar" style="--h:61%"><div class="bar-fill" data-val="61"></div><div class="bar-label">Concept A</div></div>
    <div class="bar" style="--h:74%"><div class="bar-fill" data-val="74"></div><div class="bar-label">Concept B</div></div>
    <div class="bar" style="--h:93%"><div class="bar-fill" data-val="93" style="background:#7c5cff"></div><div class="bar-label">Soft Serve</div></div>
  </div>
  <p class="fine reveal" style="margin-top:24px">Emotional resonance score (0–100) vs. category benchmark and earlier routes.</p>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Concept testing</span></div>
</div>`,
    }),
    s({
      id: 'pc-stats',
      name: 'Why it can work',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The size of the soft</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">A small idea with real reach.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">8.4M</div><div class="stat-label">In-target reach across launch channels</div></div>
    <div class="stat"><div class="stat-num">+38%</div><div class="stat-label">Lift in unaided brand warmth in test</div></div>
    <div class="stat"><div class="stat-num">2 min</div><div class="stat-label">The exact moment we're selling back</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Why it works</span></div>
</div>`,
    }),
    s({
      id: 'pc-executions',
      name: 'Sample executions',
      transition: 'fade',
      bodyHtml: `<div class="hero reverse">
  <div class="hero-text">
    <div class="kicker reveal">Sample executions</div>
    <h2 class="headline reveal">One world, many soft surfaces.</h2>
    <ul class="checks reveal" style="--gap:22px;margin-top:6px">
      <li class="check"><span><b>:30 moodfilm</b> — the slow first spoonful, golden light.</span></li>
      <li class="check"><span><b>OOH &amp; social</b> — a single line on a blush wash.</span></li>
      <li class="check"><span><b>Packaging</b> — the rounded tub as a calm object.</span></li>
      <li class="check"><span><b>A "soft minute"</b> filter that slows your feed down.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'pc-rollout',
      name: 'The rollout',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The rollout</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">From whisper to wave.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Mar</div><div class="tl-what"><b>Tease</b> — the blob mark and four-note hum appear with no explanation.</div></div>
    <div class="tl-row"><div class="tl-when">Apr</div><div class="tl-what"><b>Launch</b> — moodfilm goes wide, OOH blooms across three cities.</div></div>
    <div class="tl-row"><div class="tl-when">May</div><div class="tl-what"><b>Invite</b> — the "soft minute" filter and creator partnerships go live.</div></div>
    <div class="tl-row"><div class="tl-when">Jun</div><div class="tl-what"><b>Sustain</b> — always-on social and shelf, measured on brand warmth.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">The rollout</span></div>
</div>`,
    }),
    s({
      id: 'pc-plan',
      name: 'Channel plan',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Channel plan</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">Where the budget blooms.</h2>
  <table class="table reveal">
    <thead><tr><th>Channel</th><th>Role</th><th class="num">Share</th><th class="num">Flight</th></tr></thead>
    <tbody>
      <tr><td>Online video &amp; social</td><td class="muted">Carry the feeling, at scale</td><td class="num">46%</td><td class="num">Mar–Jun</td></tr>
      <tr><td>Out-of-home</td><td class="muted">Make the world feel real</td><td class="num">24%</td><td class="num">Apr–May</td></tr>
      <tr><td>Creator partnerships</td><td class="muted">Borrow trusted softness</td><td class="num">18%</td><td class="num">May–Jun</td></tr>
      <tr class="row-em"><td>Packaging &amp; shelf</td><td class="muted">Close the loop in hand</td><td class="num">12%</td><td class="num">Ongoing</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Channel plan</span></div>
</div>`,
    }),
    s({
      id: 'pc-why',
      name: 'Why it works',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why it works</div>
      <h2 class="headline" style="margin-top:8px">It's true, it's ownable, it lasts.</h2>
      <p class="lead" style="margin-top:18px">The idea is bigger than a flight — it gives Bloom a feeling to own for years, not a slogan to retire next season.</p>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span><b>True</b> to a real, growing cultural need for gentleness.</span></li>
      <li class="check"><span><b>Ownable</b> — no one in the aisle sells the feeling, only the product.</span></li>
      <li class="check"><span><b>Elastic</b> — flexes to film, shelf, social, and sound.</span></li>
      <li class="check"><span><b>Kind</b> — the audience thanks you instead of skipping you.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Why it works</span></div>
</div>`,
    }),
    s({
      id: 'pc-quote',
      name: 'Quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:74px">"It didn't feel like an ad. It felt like someone telling me it's okay to slow down."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Maya R.</span><span class="cite-role">In-target respondent, concept test</span></div>
  <div class="runner reveal"><span class="runner-brand">Bloom</span><span class="runner-label">Creative voice</span></div>
</div>`,
    }),
    s({
      id: 'pc-close',
      name: 'Close',
      transition: 'zoom',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Let's make it</div>
    <h2 class="display reveal" style="--display-size:130px">Be soft<br/>with yourself.</h2>
    <p class="lead reveal">studio@bloom.co · the full world, when you're ready.</p>
  </div>
</div>`,
    }),
  ],
}
