import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/editorial-cover.jpg'
const FEATURE_IMG = 'assets/editorial-feature.jpg'
const ESSAY_IMG = 'assets/editorial-essay.jpg'

export const editorial: Template = {
  id: 'editorial',
  kind: 'deck',
  categories: ['Decks'],
  name: 'Editorial',
  tagline: 'Magazine serif — oversized, photo-forward, elegant',
  audiences: ['design', 'brand', 'marketing', 'keynote'],
  description:
    'A paper-toned, photo-forward long-form feature: oversized Fraunces serif, full-bleed imagery, drop caps and pull quotes, a reported spread and a profile. Elegant magazine storytelling with real craft.',
  fonts: {
    display: 'Fraunces',
    body: 'Satoshi',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,400;9..144,0,500;9..144,0,600;9..144,1,500&display=swap',
      'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f3ec',
    '--text': '#171513',
    '--muted': '#6e655a',
    '--accent': '#b4471f',
    '--accent-2': '#171513',
    '--display': "'Fraunces', serif",
    '--body': "'Satoshi', sans-serif",
    '--display-weight': '500',
    '--title-size': '152px',
    '--display-size': '200px',
    '--headline-size': '100px',
    '--lead-size': '40px',
    '--quote-size': '104px',
    '--quote-weight': '500',
    '--card-bg': '#fffdf9',
    '--card-border': '#e7ddcd',
    '--radius': '3px',
    '--media-radius': '3px',
    '--media-border': '1px solid rgba(23,21,19,0.10)',
    '--media-shadow': '0 60px 110px -40px rgba(23,21,19,0.42)',
    '--section-size': '188px',
    '--rule-color': '#171513',
    '--th-border': '#171513',
    '--table-border': '#e7ddcd',
    '--bar-fill': '#171513',
    '--track': '#e7ddcd',
    '--donut-hole': '#f7f3ec',
    '--scrim':
      'linear-gradient(180deg, rgba(20,16,12,0.05) 0%, rgba(20,16,12,0.30) 45%, rgba(20,16,12,0.85) 100%)',
  },
  stageBg: '#efe9df',
  assets: [
    'editorial-cover.jpg',
    'editorial-feature.jpg',
    'editorial-essay.jpg',
  ],
  decoration: `.kicker { color: var(--accent); }
.quote::before { color: var(--accent); }
.title em, .display em, .headline em, .subhead em, .lead em, .section-title em { font-style: italic; font-weight: 500; }

/* Masthead lockup — the magazine wordmark + issue line on the cover */
.masthead { display: flex; align-items: baseline; gap: 28px; flex-wrap: wrap; }
.masthead-name { font-family: var(--display); font-weight: 600; font-size: 40px; letter-spacing: 0.42em; text-transform: uppercase; color: #fff; }
.masthead-meta { font-family: var(--body); font-weight: 500; font-size: 26px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.82); }

/* Byline — author / role line under a feature head */
.byline { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 27px; color: var(--muted); }
.byline b { color: var(--text); font-weight: 700; }
.byline::before { content: ''; width: 44px; height: 1px; background: var(--accent); flex: 0 0 auto; }

/* Drop cap — the lede paragraph opener */
.dropcap { font-family: var(--body); font-size: 40px; line-height: 1.5; color: var(--text); max-width: 30ch; }
.dropcap::first-letter {
  font-family: var(--display); font-weight: 500; float: left; font-size: 188px; line-height: 0.74;
  padding: 14px 22px 0 0; color: var(--accent);
}

/* Contents list — numbered table-of-contents rows */
.contents { display: flex; flex-direction: column; }
.toc-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 36px; align-items: baseline; padding: 17px 0; border-top: 1px solid var(--card-border); }
.toc-row:last-child { border-bottom: 1px solid var(--card-border); }
.toc-no { font-family: var(--display); font-weight: 500; font-size: 40px; color: var(--accent); font-variant-numeric: tabular-nums; }
.toc-title { font-family: var(--display); font-weight: 500; font-size: 46px; letter-spacing: -0.01em; color: var(--text); }
.toc-title span { display: block; font-family: var(--body); font-weight: 400; font-size: 24px; color: var(--muted); margin-top: 6px; letter-spacing: 0; }
.toc-pg { font-family: var(--body); font-size: 28px; color: var(--muted); font-variant-numeric: tabular-nums; }

/* Folio — magazine-style numbered section marker */
.folio { font-family: var(--body); font-weight: 700; font-size: 24px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); }

/* Sidebar card — boxed editorial aside with a hairline top rule */
.aside { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 3px; padding: 44px 44px 40px; }
.aside-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; font-size: 21px; color: var(--accent); margin-bottom: 18px; }
.aside-t { font-family: var(--display); font-weight: 500; font-size: 42px; line-height: 1.04; color: var(--text); }
.aside-d { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); margin-top: 12px; }

/* Pull-stat — oversized serif figure with a label, magazine data callout */
.pullstat { display: flex; flex-direction: column; gap: 8px; }
.pullstat-n { font-family: var(--display); font-weight: 500; font-size: 132px; line-height: 0.9; letter-spacing: -0.02em; color: var(--accent); font-variant-numeric: tabular-nums; }
.pullstat-l { font-family: var(--body); font-size: 27px; line-height: 1.34; color: var(--muted); max-width: 22ch; }

/* Credits grid — masthead-style colophon at the close */
.credits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 46px 64px; }
.credit-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 10px; }
.credit-v { font-family: var(--display); font-weight: 500; font-size: 34px; line-height: 1.12; color: var(--text); }
.credit-v span { display: block; font-family: var(--body); font-weight: 400; font-size: 23px; color: var(--muted); margin-top: 4px; }

@media (max-width: 640px) {
  html.deck-can-flow .masthead-name { font-size: min(28px, 7vw) !important; letter-spacing: 0.28em !important; }
  html.deck-can-flow .dropcap::first-letter { font-size: min(96px, 26vw) !important; padding: 8px 14px 0 0 !important; }
  html.deck-can-flow .toc-row { grid-template-columns: 48px 1fr auto !important; gap: 16px !important; }
  html.deck-can-flow .toc-no { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .toc-title { font-size: min(36px, 10vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .aside { padding: 26px 22px 24px !important; }
  html.deck-can-flow .aside-t { font-size: min(36px, 10vw) !important; line-height: 1.06 !important; }
  html.deck-can-flow .pullstat-n { font-size: min(64px, 17vw) !important; }
  html.deck-can-flow .pullstat-l { max-width: 100% !important; }
  html.deck-can-flow .credits { grid-template-columns: 1fr !important; gap: 28px 0 !important; }
  html.deck-can-flow .credit-v { font-size: min(32px, 9vw) !important; }
}`,
  notes:
    'A long-form magazine feature with real craft. Oversized Fraunces serif (use <em> for italic accents), tight leading, sharp 3px corners, big margins, ONE rust accent used like a signature. Lead with imagery: full-bleed cover and edge-to-edge .hero/.split spreads. Open the body with a .dropcap lede paragraph; break acts with full-bleed .section dividers carrying a .folio. Signature pieces: .masthead wordmark, .byline author line, .contents table-of-contents, .aside sidebar boxes, .pullstat serif data callouts, and the .credits colophon close. Use big .quote pull quotes, .rule as an editorial divider, and keep charts monochrome ink (bars/donut) so data reads as a quiet interlude, not a dashboard. Runner footer = magazine name left, section right.',
  sampleSlides: [
    s({
      id: 'ed-cover',
      name: 'Cover — magazine',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad top">
    <div class="masthead reveal"><span class="masthead-name">The Long Form</span><span class="masthead-meta">Issue 14 · The Craft Number</span></div>
  </div>
  <div class="pad end">
    <div class="kicker reveal">The Feature</div>
    <h1 class="display reveal" style="--display-size:172px;margin-top:6px">The slow<br/><em>hand.</em></h1>
    <p class="lead reveal" style="max-width:30ch">Why the most modern thing a maker can do is take their time.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ed-contents',
      name: 'Contents',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">In this issue</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Contents.</h2>
  <div class="contents reveal">
    <div class="toc-row"><span class="toc-no">01</span><span class="toc-title">The lede<span>An argument for the unhurried</span></span><span class="toc-pg">p. 03</span></div>
    <div class="toc-row"><span class="toc-no">02</span><span class="toc-title">In the workshop<span>A reported spread from the bench</span></span><span class="toc-pg">p. 07</span></div>
    <div class="toc-row"><span class="toc-no">03</span><span class="toc-title">By the numbers<span>What patience actually buys</span></span><span class="toc-pg">p. 11</span></div>
    <div class="toc-row"><span class="toc-no">04</span><span class="toc-title">A profile<span>The maker who refused to scale</span></span><span class="toc-pg">p. 14</span></div>
    <div class="toc-row"><span class="toc-no">05</span><span class="toc-title">The field guide<span>Takeaways &amp; the colophon</span></span><span class="toc-pg">p. 18</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">Contents</span></div>
</div>`,
    }),
    s({
      id: 'ed-section-1',
      name: 'Section · The lede',
      transition: 'fade',
      bodyHtml: `<div class="section">
  <div class="folio reveal">Chapter One</div>
  <h2 class="section-title reveal" style="--section-size:172px">An argument<br/>for the <em>unhurried.</em></h2>
  <hr class="rule reveal" style="max-width:420px;height:3px;margin-top:30px" />
</div>`,
    }),
    s({
      id: 'ed-lede',
      name: 'The lede — drop cap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:104px;align-items:start">
    <div>
      <div class="kicker">The lede</div>
      <h2 class="headline" style="margin-top:8px">There is a kind<br/>of speed that<br/>is really <em>noise.</em></h2>
      <div class="byline" style="margin-top:30px"><span>Words by <b>Mara Elling</b> · Photographs by <b>J. Aoki</b></span></div>
    </div>
    <div>
      <p class="dropcap">Begin in the only place that matters — at the bench, before anything is finished. The maker does not rush. She measures twice, sets the blade down, and waits for the light to fall the right way. In an economy that prizes the fast answer, the unhurried hand has become a quiet act of resistance, and a surprisingly good business.</p>
      <p class="body" style="margin-top:26px;max-width:30ch">What follows is a report from the slow side of the trade — and the case that taking your time is not nostalgia. It is strategy.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">The lede</span></div>
</div>`,
    }),
    s({
      id: 'ed-thesis',
      name: 'The thesis — pillars',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The argument, in three parts</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">What the slow hand <em>knows.</em></h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-num">I</div><div class="card-title">It edits</div><div class="card-body">Time is the cheapest editor. What survives a week of looking is rarely the first idea.</div></div>
    <div class="card"><div class="card-num">II</div><div class="card-title">It compounds</div><div class="card-body">A reputation for care is the one moat that competitors cannot simply buy faster.</div></div>
    <div class="card"><div class="card-num">III</div><div class="card-title">It lasts</div><div class="card-body">The unhurried object outlives the trend that would have dated it. Patience is durability.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">The thesis</span></div>
</div>`,
    }),
    s({
      id: 'ed-section-2',
      name: 'Section · The workshop',
      transition: 'fade',
      bodyHtml: `<div class="section">
  <div class="folio reveal">Chapter Two</div>
  <h2 class="section-title reveal" style="--section-size:172px">In the<br/><em>workshop.</em></h2>
  <hr class="rule reveal" style="max-width:420px;height:3px;margin-top:30px" />
</div>`,
    }),
    s({
      id: 'ed-feature',
      name: 'Reported spread — split',
      transition: 'slide',
      bodyHtml: `<div class="split wide-media">
  <div class="split-text">
    <div class="kicker reveal">A reported spread</div>
    <h2 class="headline reveal">Thirty hours,<br/>one <em>vessel.</em></h2>
    <p class="lead reveal">On the bench, the work is never the part you can see. It is the waiting between the parts.</p>
    <p class="body reveal" style="max-width:30ch">She turns the piece a quarter and lets it dry overnight before the next pass — a rhythm the catalogue can describe but never sell. The result is not faster. It is simply better, and the customer can feel the difference without being told.</p>
  </div>
  <figure class="media reveal"><img src="${FEATURE_IMG}" alt="The maker's bench"></figure>
</div>`,
    }),
    s({
      id: 'ed-process',
      name: 'The method — timeline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">From the field notes</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">The method, observed.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Day 1</div><div class="tl-what"><b>Source slowly.</b> The right material is chosen for the piece, never for the schedule.</div></div>
    <div class="tl-row"><div class="tl-when">Day 2</div><div class="tl-what"><b>Rough, then rest.</b> The form is blocked out, then left alone overnight to be reconsidered.</div></div>
    <div class="tl-row"><div class="tl-when">Day 5</div><div class="tl-what"><b>Refine by hand.</b> The last ten percent is all touch — the part no machine returns.</div></div>
    <div class="tl-row"><div class="tl-when">Day 8</div><div class="tl-what"><b>Sign and let go.</b> Nothing leaves the bench until it would survive the maker's own shelf.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">The method</span></div>
</div>`,
    }),
    s({
      id: 'ed-section-3',
      name: 'Section · By the numbers',
      transition: 'fade',
      bodyHtml: `<div class="section">
  <div class="folio reveal">Chapter Three</div>
  <h2 class="section-title reveal" style="--section-size:172px">By the<br/><em>numbers.</em></h2>
  <hr class="rule reveal" style="max-width:420px;height:3px;margin-top:30px" />
</div>`,
    }),
    s({
      id: 'ed-data',
      name: 'Data interlude — bars',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:100px;align-items:center">
    <div>
      <div class="kicker">A data interlude</div>
      <h2 class="headline" style="margin-top:6px">What patience<br/>actually <em>buys.</em></h2>
      <p class="lead" style="margin-top:14px">A survey of two hundred independent makers, sorted by how long a typical piece spends on the bench.</p>
      <div class="byline" style="margin-top:24px"><span>Source: <b>The Long Form Reader Study, 2026</b></span></div>
    </div>
    <div>
      <div class="bars" style="--bars-height:360px">
        <div class="bar" style="--h:38%"><div class="bar-fill" data-val="$140"></div><div class="bar-label">Under a day</div></div>
        <div class="bar" style="--h:58%"><div class="bar-fill" data-val="$320"></div><div class="bar-label">2–4 days</div></div>
        <div class="bar" style="--h:80%"><div class="bar-fill" data-val="$610"></div><div class="bar-label">1–2 weeks</div></div>
        <div class="bar" style="--h:98%"><div class="bar-fill" data-val="$940"></div><div class="bar-label">Over a month</div></div>
      </div>
      <p class="fine reveal" style="margin-top:14px;text-align:center">Median price a buyer will pay, by time on the bench</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">By the numbers</span></div>
</div>`,
    }),
    s({
      id: 'ed-stats',
      name: 'Stat row + pull-stat',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The margins of care</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:34px">Three findings.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="pullstat"><div class="pullstat-n">3.4×</div><div class="pullstat-l">Price premium on hand-finished work over machine-made equivalents</div></div></div>
    <div class="stat"><div class="pullstat"><div class="pullstat-n">71%</div><div class="pullstat-l">Of buyers say "made slowly" changes what they will pay</div></div></div>
    <div class="stat"><div class="pullstat"><div class="pullstat-n">9 yrs</div><div class="pullstat-l">Median age of a maker's longest-running collector relationship</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">By the numbers</span></div>
</div>`,
    }),
    s({
      id: 'ed-quote-2',
      name: 'Pull quote — spread',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:96px">I never wanted to make more. I wanted to make the same thing, better, for the rest of my life.</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Inez Caldera</span><span class="cite-role">Furniture maker, est. 2009</span></div>
</div>`,
    }),
    s({
      id: 'ed-section-4',
      name: 'Section · The profile',
      transition: 'fade',
      bodyHtml: `<div class="section">
  <div class="folio reveal">Chapter Four</div>
  <h2 class="section-title reveal" style="--section-size:172px">The maker who<br/>refused to <em>scale.</em></h2>
  <hr class="rule reveal" style="max-width:420px;height:3px;margin-top:30px" />
</div>`,
    }),
    s({
      id: 'ed-profile',
      name: 'Profile — hero',
      transition: 'slide',
      bodyHtml: `<div class="hero reverse">
  <div class="hero-text">
    <div class="kicker reveal">A profile</div>
    <h2 class="headline reveal">Inez<br/><em>Caldera.</em></h2>
    <div class="byline reveal" style="margin-top:18px"><span>Furniture maker · Workshop of one · Seventeen years</span></div>
    <p class="lead reveal" style="margin-top:18px">She has turned down three offers to franchise her name. The waitlist, she says, is the whole point.</p>
  </div>
  <figure class="media reveal"><img src="${ESSAY_IMG}" alt="Portrait of Inez Caldera"></figure>
</div>`,
    }),
    s({
      id: 'ed-sidebar',
      name: 'Sidebar — aside + table',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:start">
    <div>
      <div class="kicker">The sidebar</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:20px">The shape of a small life's work.</h2>
      <table class="table">
        <thead><tr><th>Year</th><th>What changed</th><th class="num">Pieces / yr</th></tr></thead>
        <tbody>
          <tr><td>2009</td><td>Opened the workshop</td><td class="num">18</td></tr>
          <tr><td>2014</td><td>First gallery commission</td><td class="num">26</td></tr>
          <tr><td>2019</td><td>Closed the online shop</td><td class="num">22</td></tr>
          <tr class="row-em"><td>2026</td><td>By waitlist only</td><td class="num">24</td></tr>
        </tbody>
      </table>
    </div>
    <div class="aside">
      <div class="aside-k">In her words</div>
      <div class="aside-t">"Growth was the easy temptation. Staying the same size was the hard, interesting one."</div>
      <div class="aside-d">Caldera caps output at roughly two dozen pieces a year and has for over a decade — a deliberate ceiling that, paradoxically, raised both her prices and her peace.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">The profile</span></div>
</div>`,
    }),
    s({
      id: 'ed-essay',
      name: 'Photo essay — full bleed',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${FEATURE_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The photo essay</div>
    <h2 class="display reveal" style="--display-size:128px">Where the<br/><em>hours go.</em></h2>
    <p class="lead reveal" style="max-width:34ch">A morning at the bench, told in light and grain — the part of the work that never makes the catalogue.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ed-takeaways',
      name: 'Key takeaways — checks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The field guide</div>
      <h2 class="headline" style="margin-top:6px">What to take<br/>back to your <em>bench.</em></h2>
    </div>
    <ul class="checks" style="--gap:30px">
      <li class="check"><span>Make <b>fewer things</b>, and make the waiting visible.</span></li>
      <li class="check"><span>Let <b>time edit</b> the work before the market does.</span></li>
      <li class="check"><span>Price the <b>care</b>, not the hours — buyers can tell the difference.</span></li>
      <li class="check"><span>Treat your <b>ceiling as a feature</b>, not a limit.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">The field guide</span></div>
</div>`,
    }),
    s({
      id: 'ed-colophon',
      name: 'Masthead / credits — close',
      transition: 'fade',
      bodyHtml: `<div class="pad">
  <div class="masthead reveal" style="margin-bottom:8px"><span class="masthead-name" style="color:var(--text)">The Long Form</span><span class="masthead-meta" style="color:var(--muted)">Issue 14 · The Craft Number</span></div>
  <h2 class="display reveal" style="--display-size:120px;margin-bottom:10px">Made to <em>last.</em></h2>
  <hr class="rule reveal" style="height:3px;margin:8px 0 40px" />
  <div class="credits reveal">
    <div><div class="credit-k">Words</div><div class="credit-v">Mara Elling<span>Features editor</span></div></div>
    <div><div class="credit-k">Photography</div><div class="credit-v">J. Aoki<span>On assignment</span></div></div>
    <div><div class="credit-k">With thanks</div><div class="credit-v">Inez Caldera<span>&amp; the workshop of one</span></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">The Long Form</span><span class="runner-label">Colophon</span></div>
</div>`,
    }),
  ],
}
