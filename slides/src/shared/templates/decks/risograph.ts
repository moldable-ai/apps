import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/risograph-cover.jpg'
const FIG_IMG = 'assets/risograph-fig.jpg'

export const risograph: Template = {
  id: 'risograph',
  categories: ['Creative', 'Marketing'],
  name: 'Risograph',
  tagline: 'Bold two-ink screenprint, indie-zine warmth',
  audiences: ['creative', 'marketing', 'festival', 'community'],
  description:
    'A community arts-festival manifesto printed like a risograph poster — two spot inks (riso blue + fluoro coral) overprinting on warm cream paper, grainy halftone rules, and bold poster headlines. A complete festival story you re-letter with your own program, lineup, and tickets.',
  fonts: {
    display: 'Archivo',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f1e3',
    '--text': '#16130d',
    '--muted': '#6a6354',
    '--accent': '#2b4cf0',
    '--accent-2': '#ff5247',
    '--display': "'Archivo', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '900',
    '--headline-weight': '800',
    '--title-size': '146px',
    '--display-size': '178px',
    '--headline-size': '86px',
    '--section-size': '168px',
    '--lead-size': '38px',
    '--subhead-size': '50px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '22px',
    '--kicker-font': "'Archivo', sans-serif",
    '--card-bg': '#fbf7ec',
    '--card-border': '#16130d',
    '--radius': '6px',
    '--bullet-radius': '2px',
    '--stat-size': '108px',
    '--metric-size': '128px',
    '--th-border': '#16130d',
    '--table-border': 'rgba(22,19,13,0.18)',
    '--rule-color': '#16130d',
    '--track': 'rgba(43,76,240,0.16)',
    '--donut-hole': '#f7f1e3',
    '--bar-gap': '34px',
    '--bar-fill': '#2b4cf0',
    '--media-radius': '6px',
    '--media-border': '3px solid #16130d',
    '--media-shadow': '10px 10px 0 0 #ff5247',
    '--scrim':
      'linear-gradient(180deg, rgba(20,22,40,0.05) 0%, rgba(20,22,40,0.32) 48%, rgba(15,17,34,0.84) 100%)',
    '--bleed-text': '#f7f1e3',
    '--pos': '#1f8f4e',
    '--neg': '#ff5247',
  },
  stageBg: '#e7ddc6',
  assets: ['risograph-cover.jpg', 'risograph-fig.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.tl-when { color: var(--accent-2); }
.flow-arrow::after { border-color: var(--accent-2); }
.cite-dot { background: var(--accent-2); }

/* Halftone paper grain on every slide — the riso print texture */
.slide::before {
  content: ''; position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    radial-gradient(rgba(43,76,240,0.10) 1px, transparent 1.4px),
    radial-gradient(rgba(255,82,71,0.09) 1px, transparent 1.4px);
  background-size: 7px 7px, 7px 7px;
  background-position: 0 0, 3px 4px;
  mix-blend-mode: multiply; opacity: 0.65;
}
.pad, .split, .hero, .section, .full-bleed { z-index: 1; }

/* Overprint chip — a tag printed in one ink with a misregistered second-ink shadow */
.chip { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 11px 24px;
  font-family: var(--display); font-weight: 800; font-size: 24px; letter-spacing: 0.02em;
  text-transform: uppercase; color: var(--bg); background: var(--accent); border-radius: 999px; }
.chip::after { content: ''; position: absolute; inset: 0; border-radius: 999px;
  background: var(--accent-2); transform: translate(5px, 4px); z-index: -1; mix-blend-mode: multiply; }
.chip.coral { background: var(--accent-2); }
.chip.coral::after { background: var(--accent); }

/* Halftone rule — a thick dotted screenprint divider */
.halftone-rule { height: 14px; width: 100%; border-radius: 999px;
  background: radial-gradient(circle at center, var(--accent) 46%, transparent 47%);
  background-size: 22px 14px; opacity: 0.9; }

/* Bold poster headline — the festival voice, heavy and tight with a coral overshadow */
.poster {
  font-family: var(--display); font-weight: 900; line-height: 0.9; letter-spacing: -0.03em;
  font-size: var(--poster-size, 132px); color: var(--text); text-transform: uppercase; text-wrap: balance;
}
.poster .ink { color: var(--accent); }
.poster .pop { color: var(--accent-2); }

/* Riso poster card — flat panel with a hard offset overprint shadow */
.riso-card { position: relative; background: var(--card-bg); border: 3px solid var(--text);
  border-radius: var(--radius); padding: 40px 36px; display: flex; flex-direction: column; gap: 14px;
  box-shadow: 8px 8px 0 0 var(--accent); }
.riso-card.coral { box-shadow: 8px 8px 0 0 var(--accent-2); }
.riso-card .rc-num { font-family: var(--display); font-weight: 900; font-size: 30px; color: var(--accent-2); letter-spacing: 0.04em; }
.riso-card .rc-t { font-family: var(--display); font-weight: 800; font-size: 38px; line-height: 1.02; color: var(--text); }
.riso-card .rc-d { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); }

/* Duotone divider — a full-bleed two-ink colour-block section break */
.duo { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center;
  padding: var(--pad-y, 110px) var(--pad-x, 130px); background: var(--accent); overflow: hidden; }
.duo::after { content: ''; position: absolute; right: -8%; top: -20%; width: 62%; height: 150%;
  background: var(--accent-2); transform: rotate(12deg); mix-blend-mode: multiply; opacity: 0.92; }
.duo-num { position: relative; z-index: 1; font-family: var(--display); font-weight: 800; font-size: 30px;
  letter-spacing: 0.16em; color: var(--bg); text-transform: uppercase; }
.duo-title { position: relative; z-index: 1; font-family: var(--display); font-weight: 900; font-size: 152px;
  line-height: 0.9; letter-spacing: -0.03em; color: var(--bg); text-transform: uppercase; text-wrap: balance; }

/* Program / lineup tag list */
.taglist { display: flex; flex-wrap: wrap; gap: 16px 18px; }

/* Runner gets a printed-ink underline */
.runner { border-top: 3px solid var(--text); }
.runner-brand::before { border-radius: 2px; background: var(--accent-2); }
.runner-label { color: var(--accent); font-weight: 700; }

/* Numbers stay tabular and bold like a printed program */
.stat-num, .metric { font-variant-numeric: tabular-nums; }
.lede { font-family: var(--display); font-weight: 800; font-size: 58px; line-height: 1.06; letter-spacing: -0.02em; color: var(--text); max-width: 18ch; }
.col-em { background: rgba(43,76,240,0.08); }`,
  notes:
    'A community arts-festival manifesto printed like a two-ink risograph zine: Archivo (heavy 800/900) display + Inter body, ink #16130d on warm cream #f7f1e3, riso blue #2b4cf0 + fluoro coral #ff5247 as the two spot inks. Every slide carries a faint halftone grain via .slide::before. Open and close on the full-bleed riso poster (assets/risograph-cover.jpg); use the riso bass-player illustration (assets/risograph-fig.jpg) for the featured-moment split (its --media-shadow is a hard coral offset). Signature pieces: .poster headlines (.ink / .pop spans recolour words), .chip overprint tags (misregistered second-ink shadow), .halftone-rule dotted divider, .riso-card flat panels with a hard offset overprint shadow, and the .duo duotone colour-block section breaks. Use .steps/.riso-card for the program, .stats for by-the-numbers, .timeline for the schedule, .table for ticket tiers (.col-em highlights the festival pass), .bars for the data moment. Bold, warm, hand-made — let the two inks and grain carry it; keep type heavy and copy punchy.',
  sampleSlides: [
    s({
      id: 'riso-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Riverlight Arts Festival · 12–15 September</div>
    <h1 class="display reveal" style="--display-size:168px;margin-top:10px">Make<br/>something<br/>together.</h1>
    <p class="lead reveal" style="max-width:32ch">Four days of music, print, and public art on the south riverbank — made by the city, open to everyone.</p>
  </div>
</div>`,
    }),
    s({
      id: 'riso-about',
      name: 'What it is',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">What it is</div>
      <p class="lede" style="margin-top:14px">A festival you don't just watch — you help print, play, and build it.</p>
      <div class="halftone-rule reveal" style="margin-top:30px;max-width:360px"></div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span><b>Free to wander.</b> Open studios, stages, and a live print shop along the riverbank.</span></li>
      <li class="bullet"><span><b>Made by locals.</b> 80+ artists, makers, and musicians from the neighbourhoods around us.</span></li>
      <li class="bullet"><span><b>Hands-on.</b> Every venue runs workshops — pull a riso print, build a kite, join the choir.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">About</span></div>
</div>`,
    }),
    s({
      id: 'riso-sec1',
      name: 'Section · The idea',
      transition: 'fade',
      bodyHtml: `<div class="duo">
  <div class="duo-num reveal">01 — The idea</div>
  <div class="duo-title reveal">Art is<br/>a verb.</div>
</div>`,
    }),
    s({
      id: 'riso-manifesto',
      name: 'Our manifesto',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Our manifesto</div>
  <h2 class="poster reveal" style="--poster-size:140px;margin-top:18px">A city is most<br/>itself when it<br/><span class="ink">makes</span> in<br/><span class="pop">public.</span></h2>
  <p class="lead reveal" style="max-width:40ch;margin-top:30px">So we hand over the inks, open the doors, and let the work happen out loud — messy, communal, and free.</p>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Manifesto</span></div>
</div>`,
    }),
    s({
      id: 'riso-program',
      name: 'The program',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What's on</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Four ways in.</h2>
  <div class="cols-4 reveal" style="--card-gap:26px">
    <div class="riso-card"><div class="rc-num">01</div><div class="rc-t">Stages</div><div class="rc-d">Three open-air stages, dawn choirs to late brass bands.</div></div>
    <div class="riso-card coral"><div class="rc-num">02</div><div class="rc-t">Print shop</div><div class="rc-d">Pull your own two-ink riso poster at the live press.</div></div>
    <div class="riso-card"><div class="rc-num">03</div><div class="rc-t">Open studios</div><div class="rc-d">Forty makers throw their doors open across the quarter.</div></div>
    <div class="riso-card coral"><div class="rc-num">04</div><div class="rc-t">Public works</div><div class="rc-d">A riverside mural and kite-build the whole city finishes.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Program</span></div>
</div>`,
    }),
    s({
      id: 'riso-feature',
      name: 'Featured moment',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="chip reveal">Headliner</div>
    <h2 class="headline reveal" style="margin-top:6px">The Saturday<br/>night sessions.</h2>
    <p class="lead reveal">When the print shop quiets, the riverbank turns up — a rolling line-up of the city's bands, choirs, and one very loud double bass, free under the lights.</p>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'riso-numbers',
      name: 'By the numbers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Last year, by the numbers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:36px">A festival the city showed up for.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">42K</div><div class="stat-label">Visitors across four riverbank days</div></div>
    <div class="stat"><div class="stat-num">86</div><div class="stat-label">Local artists, makers &amp; musicians</div></div>
    <div class="stat"><div class="stat-num">3,100</div><div class="stat-label">Riso prints pulled by the public</div></div>
    <div class="stat"><div class="stat-num">£0</div><div class="stat-label">To wander, watch &amp; make</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">By the numbers</span></div>
</div>`,
    }),
    s({
      id: 'riso-sec2',
      name: 'Section · The details',
      transition: 'fade',
      bodyHtml: `<div class="duo" style="background:var(--accent-2)">
  <div class="duo-num reveal">02 — The details</div>
  <div class="duo-title reveal">When,<br/>who &amp; how.</div>
</div>`,
    }),
    s({
      id: 'riso-schedule',
      name: 'Schedule',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The four days</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">How the weekend runs.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Thu</div><div class="tl-what"><b>Opening &amp; first pulls</b> — ribbon cut at dusk, the live print shop fires up its presses.</div></div>
    <div class="tl-row"><div class="tl-when">Fri</div><div class="tl-what"><b>Open studios day</b> — forty makers open their doors; lunchtime brass on the main stage.</div></div>
    <div class="tl-row"><div class="tl-when">Sat</div><div class="tl-what"><b>Night sessions</b> — the headline line-up plays the riverbank until late, free under the lights.</div></div>
    <div class="tl-row"><div class="tl-when">Sun</div><div class="tl-what"><b>Build &amp; close</b> — the city finishes the riverside mural; kite launch sends us off.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Schedule</span></div>
</div>`,
    }),
    s({
      id: 'riso-lineup',
      name: 'Lineup & partners',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Line-up &amp; partners</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Made with the neighbourhood.</h2>
  <div class="taglist reveal" style="margin-bottom:38px">
    <span class="chip">The Riverside Brass</span>
    <span class="chip coral">Maya Okonkwo</span>
    <span class="chip">Southbank Choir</span>
    <span class="chip coral">Inkhouse Collective</span>
    <span class="chip">The Tidewater Trio</span>
    <span class="chip coral">Quartertone</span>
    <span class="chip">Folk &amp; Foundry</span>
  </div>
  <div class="halftone-rule reveal" style="margin-bottom:30px"></div>
  <div class="logos reveal">
    <span class="logo">City Arts Council</span><span class="logo">Riverside Mills</span><span class="logo">The Print Union</span><span class="logo">Harbour Library</span><span class="logo">Neighbourhood Trust</span>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Line-up</span></div>
</div>`,
    }),
    s({
      id: 'riso-tickets',
      name: 'Tickets & tiers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Tickets</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Pay what helps, or nothing at all.</h2>
  <table class="table reveal">
    <thead><tr><th>Pass</th><th>Gets you in to</th><th>Workshops</th><th class="num">Supporter price</th></tr></thead>
    <tbody>
      <tr><td><b>Wanderer</b></td><td class="muted">All stages, open studios &amp; the riverbank</td><td>Drop-in</td><td class="num">Free</td></tr>
      <tr class="col-em"><td><b>Maker</b></td><td class="muted">Everything, plus reserved press time</td><td>3 booked</td><td class="num">&pound;24</td></tr>
      <tr><td><b>Patron</b></td><td class="muted">Everything, plus the Saturday opening party</td><td>Unlimited</td><td class="num">&pound;75</td></tr>
      <tr><td><b>Studio</b></td><td class="muted">A weekend press slot &amp; ten editions of your print</td><td>Hosted</td><td class="num">&pound;140</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Every paid pass funds three free Wanderer days for the neighbourhood. No one is turned away.</p>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Tickets</span></div>
</div>`,
    }),
    s({
      id: 'riso-quote',
      name: 'Participant quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:80px">"I came to watch a band and left having printed my first poster. My kid still has it on the wall."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Priya Anand</span><span class="cite-role">Riverbank neighbour &amp; first-time printer</span></div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Voices</span></div>
</div>`,
    }),
    s({
      id: 'riso-data',
      name: 'Data moment',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Where the money goes</div>
      <h2 class="headline" style="margin-top:8px">Most of it stays local.</h2>
      <p class="lead">Every pound from passes and partners is split four ways — and three of them are paid straight to people in the city.</p>
      <div class="halftone-rule reveal" style="margin-top:26px;max-width:320px"></div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:88%"><div class="bar-fill" data-val="46%"></div><div class="bar-label">Artist fees</div></div>
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="24%" style="background:var(--accent-2)"></div><div class="bar-label">Free access</div></div>
      <div class="bar" style="--h:38%"><div class="bar-fill" data-val="19%"></div><div class="bar-label">Production</div></div>
      <div class="bar" style="--h:22%"><div class="bar-fill" data-val="11%" style="background:var(--accent-2)"></div><div class="bar-label">Outreach</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Where it goes</span></div>
</div>`,
    }),
    s({
      id: 'riso-join',
      name: 'Join us',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Join in</div>
      <h2 class="headline" style="margin-top:8px">Three ways to make it yours.</h2>
      <p class="lead">Whether you've got an hour or a whole weekend, there's a way to leave a mark on the riverbank.</p>
    </div>
    <ol class="steps reveal" style="--gap:26px">
      <li class="step"><span><b>Grab a pass</b> — or just turn up; the Wanderer days are always free.</span></li>
      <li class="step"><span><b>Pitch a workshop</b> — makers and musicians, the open call closes in June.</span></li>
      <li class="step"><span><b>Volunteer a shift</b> — run the press, steward a stage, paint a wall.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">Riverlight</span><span class="runner-label">Join in</span></div>
</div>`,
    }),
    s({
      id: 'riso-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">See you on the riverbank</div>
    <h2 class="display reveal" style="--display-size:150px">Come<br/>make<br/>something.</h2>
    <p class="lead reveal">riverlightfest.org · 12–15 September · South Riverbank</p>
  </div>
</div>`,
    }),
  ],
}
