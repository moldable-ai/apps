import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/investor-update-cover.jpg'

export const investorUpdate: Template = {
  id: 'investor-update',
  categories: ['Fundraising', 'Reporting'],
  name: 'Investor Update',
  tagline: 'Restrained, letter-like monthly investor update',
  audiences: ['founder', 'investor', 'board', 'angel'],
  description:
    'A calm, stationery-grade monthly investor letter in off-white and ink with a single navy accent. A clean metric dashboard, highlights / lowlights, KPI table, a runway gauge, and numbered asks carry an honest month-in-review you fill in with your own numbers.',
  fonts: {
    display: 'Source Serif 4',
    body: 'Source Serif 4',
    mono: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fbfaf8',
    '--text': '#1c1a17',
    '--muted': '#6f6a62',
    '--accent': '#1e3a5f',
    '--accent-2': '#1e3a5f',
    '--display': "'Source Serif 4', serif",
    '--body': "'Source Serif 4', serif",
    '--mono': "'Inter', sans-serif",
    '--display-weight': '600',
    '--title-size': '120px',
    '--headline-size': '70px',
    '--subhead-size': '44px',
    '--lead-size': '36px',
    '--body-size': '31px',
    '--kicker-font': "'Inter', sans-serif",
    '--kicker-tracking': '0.22em',
    '--kicker-size': '20px',
    '--card-bg': '#ffffff',
    '--card-border': 'rgba(28,26,23,0.12)',
    '--card-shadow': '0 22px 50px -34px rgba(28,26,23,0.30)',
    '--radius': '8px',
    '--stat-size': '88px',
    '--metric-size': '104px',
    '--bullet-color': '#1e3a5f',
    '--bullet-radius': '2px',
    '--th-border': '#1c1a17',
    '--table-border': 'rgba(28,26,23,0.12)',
    '--table-size': '29px',
    '--track': 'rgba(28,26,23,0.10)',
    '--donut-hole': '#fbfaf8',
    '--bar-fill': '#1e3a5f',
    '--bar-gap': '36px',
    '--media-radius': '8px',
    '--media-border': '1px solid rgba(28,26,23,0.12)',
    '--media-shadow': '0 44px 90px -42px rgba(28,26,23,0.45)',
    '--scrim':
      'linear-gradient(180deg, rgba(251,250,248,0) 0%, rgba(251,250,248,0.05) 45%, rgba(28,26,23,0.55) 100%)',
    '--quote-size': '64px',
    '--quote-weight': '500',
    '--pos': '#2f6e4f',
    '--neg': '#a23b2e',
  },
  stageBg: '#efece6',
  assets: ['investor-update-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }

/* Letterhead rule on the cover scrim text */
.full-bleed .kicker { color: #e9eef4; }
.full-bleed .lead, .full-bleed .body { color: #efeeea; }

/* Section divider — a quiet ruled page, no image */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider::before { content: ''; position: absolute; left: var(--pad-x, 130px); top: 50%; transform: translateY(-50%); width: 4px; height: 200px; background: var(--accent); }
.divider-inner { padding-left: 52px; }
.divider-num { font-family: var(--mono); font-weight: 600; letter-spacing: 0.22em; font-size: 21px; color: var(--accent); text-transform: uppercase; }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 132px; line-height: 0.98; letter-spacing: -0.02em; color: var(--text); margin-top: 14px; }
.divider-sub { font-family: var(--body); font-size: 34px; color: var(--muted); margin-top: 18px; max-width: 30ch; }

/* TL;DR — three lettered lines on hairlines, reads like a memo opener */
.tldr { display: flex; flex-direction: column; }
.tldr-row { display: grid; grid-template-columns: 60px 1fr; gap: 34px; align-items: baseline; padding: 30px 0; border-top: 1px solid var(--card-border); }
.tldr-row:last-child { border-bottom: 1px solid var(--card-border); }
.tldr-mk { font-family: var(--mono); font-weight: 700; font-size: 22px; letter-spacing: 0.04em; color: var(--accent); }
.tldr-txt { font-family: var(--display); font-weight: 400; font-size: 44px; line-height: 1.18; letter-spacing: -0.01em; color: var(--text); }
.tldr-txt b { font-weight: 600; }

/* Metric dashboard row — the numbers that matter, hairline-divided */
.dash { display: grid; grid-template-columns: repeat(var(--cols, 4), 1fr); }
.dash-cell { padding: 0 46px; }
.dash-cell:first-child { padding-left: 0; }
.dash-cell + .dash-cell { border-left: 1px solid var(--card-border); }
.dash-val { font-family: var(--display); font-weight: 600; font-size: 84px; line-height: 1; letter-spacing: -0.025em; color: var(--text); font-variant-numeric: tabular-nums; }
.dash-label { font-family: var(--mono); font-weight: 500; font-size: 21px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-top: 16px; }
.delta { display: inline-flex; align-items: center; gap: 7px; font-family: var(--mono); font-weight: 600; font-size: 22px; margin-top: 14px; }
.delta.up { color: var(--pos); } .delta.down { color: var(--neg); } .delta.flat { color: var(--muted); }
.delta.up::before { content: '\\25B2'; font-size: 13px; } .delta.down::before { content: '\\25BC'; font-size: 13px; }

/* Highlights / lowlights — honest two-column */
.hlcols { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; }
.hl-col { display: flex; flex-direction: column; gap: 22px; }
.hl-head { font-family: var(--mono); font-weight: 600; font-size: 21px; letter-spacing: 0.14em; text-transform: uppercase; padding-bottom: 16px; border-bottom: 2px solid var(--text); }
.hl-col.good .hl-head { color: var(--pos); border-color: var(--pos); }
.hl-col.hard .hl-head { color: var(--neg); border-color: var(--neg); }
.hl-item { font-family: var(--body); font-size: 31px; line-height: 1.34; color: var(--text); }
.hl-item b { font-weight: 600; }
.hl-item span { color: var(--muted); }

/* What's hard — bordered callout, navy keyline */
.note { border-left: 4px solid var(--accent); background: rgba(30,58,95,0.05); padding: 30px 38px; border-radius: 0 8px 8px 0; }
.note-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 12px; }
.note p { font-family: var(--body); font-size: 30px; line-height: 1.4; color: var(--text); margin: 0; }

/* Update cards — flat, hairline, mono index */
.ucards { display: grid; grid-template-columns: repeat(var(--cols, 2), 1fr); gap: 30px; }
.ucard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 38px 40px; box-shadow: var(--card-shadow); }
.ucard-tag { font-family: var(--mono); font-weight: 600; font-size: 18px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.ucard-t { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.06; color: var(--text); margin-top: 14px; }
.ucard-d { font-family: var(--body); font-size: 27px; line-height: 1.4; color: var(--muted); margin-top: 12px; }

/* Runway gauge — a horizontal track with a marker */
.gauge { width: 100%; }
.gauge-track { position: relative; height: 26px; border-radius: 13px; background: rgba(28,26,23,0.08); overflow: hidden; }
.gauge-fill { position: absolute; inset: 0 auto 0 0; width: var(--g, 60%); background: var(--accent); border-radius: 13px; }
.gauge-fill.thin { background: rgba(30,58,95,0.32); }
.gauge-scale { display: flex; justify-content: space-between; margin-top: 16px; font-family: var(--mono); font-size: 20px; color: var(--muted); letter-spacing: 0.04em; }
.gauge-cap { font-family: var(--display); font-weight: 600; font-size: 56px; letter-spacing: -0.02em; color: var(--text); }
.gauge-cap span { color: var(--accent); }

/* Numbered asks — generous, ledger-like */
.asks { display: flex; flex-direction: column; }
.ask { display: grid; grid-template-columns: 84px 1fr; gap: 32px; align-items: baseline; padding: 32px 0; border-top: 1px solid var(--card-border); }
.asks .ask:last-child { border-bottom: 1px solid var(--card-border); }
.ask-n { font-family: var(--mono); font-weight: 700; font-size: 30px; color: var(--accent); }
.ask-t { font-family: var(--display); font-weight: 600; font-size: 40px; line-height: 1.08; color: var(--text); }
.ask-d { font-family: var(--body); font-size: 28px; line-height: 1.36; color: var(--muted); margin-top: 8px; }

/* Quiet running footer */
.runner-brand::before { border-radius: 2px; }

/* Signature lettered card / signoff for the founder note */
.signoff { font-family: var(--display); font-weight: 500; font-size: 38px; color: var(--text); margin-top: 40px; }
.signoff span { color: var(--muted); font-size: 28px; display: block; margin-top: 6px; font-weight: 400; }

@media (max-width: 640px) {
  /* Section dividers are absolutely positioned and not in the shared un-absolute list — un-absolute so they don't collapse to zero height, and shrink the oversized title */
  html.deck-can-flow .divider { position: relative !important; inset: auto !important; min-height: 280px; padding: 56px var(--pad-x, 28px) !important; justify-content: center; }
  html.deck-can-flow .divider::before { left: var(--pad-x, 28px); height: 120px; }
  html.deck-can-flow .divider-inner { padding-left: 26px !important; }
  html.deck-can-flow .divider-title { font-size: min(45px, 12vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .divider-sub { font-size: min(30px, 8vw) !important; max-width: 100% !important; }
  html.deck-can-flow .divider-num { font-size: 16px !important; }
  /* Memo opener — fixed 60px/1fr grid + 44px text overflow the phone */
  html.deck-can-flow .tldr-row { grid-template-columns: 34px 1fr !important; gap: 0 16px; padding: 18px 0; }
  html.deck-can-flow .tldr-txt { font-size: min(19px, 5vw) !important; }
  html.deck-can-flow .tldr-mk { font-size: 15px !important; }
  /* Metric dashboard — bespoke cell padding/borders and 84px values */
  html.deck-can-flow .dash-cell { padding: 0 !important; }
  html.deck-can-flow .dash-cell + .dash-cell { border-left: 0 !important; }
  html.deck-can-flow .dash-val { font-size: min(40px, 11vw) !important; }
  html.deck-can-flow .dash-label { font-size: 13px !important; }
  /* Highlights/lowlights item text */
  html.deck-can-flow .hl-item { font-size: min(20px, 5vw) !important; }
  /* Navy callout — large horizontal padding and 30px body */
  html.deck-can-flow .note { padding: 22px 22px !important; }
  html.deck-can-flow .note p { font-size: min(20px, 5vw) !important; }
  /* Update cards — large padding and 38px titles */
  html.deck-can-flow .ucard { padding: 26px 22px !important; }
  html.deck-can-flow .ucard-t { font-size: min(25px, 7vw) !important; }
  html.deck-can-flow .ucard-d { font-size: min(18px, 5vw) !important; }
  /* Runway gauge cap */
  html.deck-can-flow .gauge-cap { font-size: min(28px, 8vw) !important; }
  /* Numbered asks — fixed 84px/1fr grid + 40px titles */
  html.deck-can-flow .ask { grid-template-columns: 38px 1fr !important; gap: 0 16px; padding: 20px 0; }
  html.deck-can-flow .ask-n { font-size: 20px !important; }
  html.deck-can-flow .ask-t { font-size: min(23px, 6vw) !important; }
  html.deck-can-flow .ask-d { font-size: min(18px, 5vw) !important; }
  /* Founder signoff */
  html.deck-can-flow .signoff { font-size: min(26px, 7vw) !important; }
  html.deck-can-flow .signoff span { font-size: min(19px, 5vw) !important; }
}`,
  notes:
    'A complete monthly investor update written as a letter: Source Serif 4 throughout with Inter for mono labels/eyebrows, ink #1c1a17 on warm off-white #fbfaf8, ONE navy accent (#1e3a5f), tabular numbers, generous whitespace, zero gradients. Open and close on the quiet navy-on-paper full-bleed (assets/investor-update-cover.jpg); break the three acts (Progress / Business / How you can help) with the ruled .divider (no image). Signature pieces: .tldr three-line memo opener, the .dash hairline metric dashboard with .delta arrows, .hlcols highlights/lowlights two-column, the .note navy callout for what is hard, .gauge runway bar, .ucards flat update cards, and .asks numbered ledger for requests. Use .bars for the growth chart, the .table as the KPI table, .donut for burn split, .stats for team & hiring, and .quote for the founder note. Honest, calm, and specific — keep it letter-like, never salesy.',
  sampleSlides: [
    s({
      id: 'iu-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Investor Update &middot; March 2026</div>
    <h1 class="display reveal" style="--display-size:128px;margin-top:10px;color:#fbfaf8">Steady build,<br/>compounding.</h1>
    <p class="lead reveal" style="max-width:34ch">Lattice Systems &middot; Monthly note to investors &amp; advisors, from the founders.</p>
  </div>
</div>`,
    }),
    s({
      id: 'iu-tldr',
      name: 'TL;DR',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">TL;DR &middot; three lines</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">If you only read this far.</h2>
  <div class="tldr reveal">
    <div class="tldr-row"><div class="tldr-mk">01</div><div class="tldr-txt">Revenue grew <b>+19% MoM</b> to <b>$214K</b> — fourth straight month above plan.</div></div>
    <div class="tldr-row"><div class="tldr-mk">02</div><div class="tldr-txt">Closed our <b>first two enterprise pilots</b>; sales cycle is the thing to watch.</div></div>
    <div class="tldr-row"><div class="tldr-mk">03</div><div class="tldr-txt"><b>18 months</b> of runway; we&rsquo;re asking for two intros, below.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">TL;DR</span></div>
</div>`,
    }),
    s({
      id: 'iu-dash',
      name: 'Metrics that matter',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The numbers that matter</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">March at a glance.</h2>
  <div class="dash reveal" style="--cols:4">
    <div class="dash-cell"><div class="dash-val">$214K</div><div class="dash-label">Net MRR</div><div class="delta up">19% MoM</div></div>
    <div class="dash-cell"><div class="dash-val">$2.57M</div><div class="dash-label">ARR run-rate</div><div class="delta up">21% MoM</div></div>
    <div class="dash-cell"><div class="dash-val">118%</div><div class="dash-label">Net revenue retention</div><div class="delta up">3 pts</div></div>
    <div class="dash-cell"><div class="dash-val">2.1%</div><div class="dash-label">Logo churn</div><div class="delta down">0.4 pts</div></div>
  </div>
  <div class="dash reveal" style="--cols:4;margin-top:54px">
    <div class="dash-cell"><div class="dash-val">412</div><div class="dash-label">Paying accounts</div><div class="delta up">+38</div></div>
    <div class="dash-cell"><div class="dash-val">$1.9K</div><div class="dash-label">Avg. monthly contract</div><div class="delta up">11%</div></div>
    <div class="dash-cell"><div class="dash-val">$248K</div><div class="dash-label">Monthly burn</div><div class="delta flat">flat</div></div>
    <div class="dash-cell"><div class="dash-val">18 mo</div><div class="dash-label">Runway</div><div class="delta down">1 mo</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Metrics</span></div>
</div>`,
    }),
    s({
      id: 'iu-div1',
      name: 'Section · Progress',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-inner">
    <div class="divider-num reveal">01 &mdash; The month</div>
    <div class="divider-title reveal">Progress.</div>
    <p class="divider-sub reveal">What moved, what worked, and the parts that were genuinely hard.</p>
  </div>
</div>`,
    }),
    s({
      id: 'iu-highlights',
      name: 'Highlights',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Highlights</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Things that went well.</h2>
  <ul class="checks reveal" style="--gap:30px">
    <li class="check"><span><b>$214K net MRR</b> &mdash; the self-serve funnel hit a 4.1% paid-conversion record.</span></li>
    <li class="check"><span><b>Two enterprise pilots signed</b> (Meridian, Halcyon Freight) at $40K ACV each.</span></li>
    <li class="check"><span><b>Shipped the audit-log &amp; SSO suite</b> &mdash; the top blocker in six enterprise deals.</span></li>
    <li class="check"><span><b>Hired a Head of Sales</b> (ex-Northwind) starting in April; closed the leadership gap.</span></li>
  </ul>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Highlights</span></div>
</div>`,
    }),
    s({
      id: 'iu-lowlights',
      name: 'Lowlights / what is hard',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Lowlights &middot; what&rsquo;s hard</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">The honest part.</h2>
  <div class="hlcols reveal">
    <div class="hl-col good">
      <div class="hl-head">Working</div>
      <div class="hl-item"><b>Self-serve motion</b> is efficient &mdash; CAC payback under 6 months.<span> Repeatable, low-touch.</span></div>
      <div class="hl-item"><b>Retention is strong</b> at 118% NRR.<span> Expansion is carrying the curve.</span></div>
    </div>
    <div class="hl-col hard">
      <div class="hl-head">Hard</div>
      <div class="hl-item"><b>Enterprise sales cycles</b> are running 90+ days &mdash; longer than modeled.<span> Procurement, not product.</span></div>
      <div class="hl-item"><b>Eng velocity dipped</b> during the SSO build.<span> Two roles open longer than we&rsquo;d like.</span></div>
    </div>
  </div>
  <div class="note reveal" style="margin-top:40px">
    <div class="note-k">What we&rsquo;re doing about it</div>
    <p>We&rsquo;ve added a pilot-to-paid playbook with fixed 45-day success criteria, and we&rsquo;re prioritizing the two senior eng hires over net-new feature work in April.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Lowlights</span></div>
</div>`,
    }),
    s({
      id: 'iu-growth',
      name: 'Growth chart',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Net MRR &middot; trailing 6 months</div>
      <h2 class="headline" style="margin-top:8px">Compounding, not spiking.</h2>
      <div class="note" style="margin-top:28px">
        <div class="note-k">Read</div>
        <p>Growth is broad-based: <b>62%</b> from expansion within existing accounts, not a single large logo.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:40%"><div class="bar-fill" data-val="$118K"></div><div class="bar-label">Oct</div></div>
      <div class="bar" style="--h:50%"><div class="bar-fill" data-val="$139K"></div><div class="bar-label">Nov</div></div>
      <div class="bar" style="--h:60%"><div class="bar-fill" data-val="$161K"></div><div class="bar-label">Dec</div></div>
      <div class="bar" style="--h:70%"><div class="bar-fill" data-val="$179K"></div><div class="bar-label">Jan</div></div>
      <div class="bar" style="--h:82%"><div class="bar-fill" data-val="$201K"></div><div class="bar-label">Feb</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$214K"></div><div class="bar-label">Mar</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Growth</span></div>
</div>`,
    }),
    s({
      id: 'iu-kpi',
      name: 'KPI table',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">KPI table</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">The full scorecard.</h2>
  <table class="table reveal">
    <thead><tr><th>Metric</th><th class="num">Feb</th><th class="num">Mar</th><th class="num">MoM</th><th class="num">Plan</th></tr></thead>
    <tbody>
      <tr><td>Net MRR</td><td class="num">$201K</td><td class="num">$214K</td><td class="num pos">+6.5%</td><td class="num">$205K</td></tr>
      <tr><td>New logos</td><td class="num">31</td><td class="num">38</td><td class="num pos">+23%</td><td class="num">34</td></tr>
      <tr><td>Net revenue retention</td><td class="num">115%</td><td class="num">118%</td><td class="num pos">+3 pts</td><td class="num">115%</td></tr>
      <tr><td>Logo churn</td><td class="num">2.5%</td><td class="num">2.1%</td><td class="num pos">&minus;0.4 pts</td><td class="num">2.0%</td></tr>
      <tr><td>CAC payback (mo)</td><td class="num">6.4</td><td class="num">5.8</td><td class="num pos">&minus;0.6</td><td class="num">7.0</td></tr>
      <tr class="row-em"><td>Monthly burn</td><td class="num">$248K</td><td class="num">$248K</td><td class="num">flat</td><td class="num">$260K</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">KPIs</span></div>
</div>`,
    }),
    s({
      id: 'iu-div2',
      name: 'Section · Business',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-inner">
    <div class="divider-num reveal">02 &mdash; The business</div>
    <div class="divider-title reveal">Business.</div>
    <p class="divider-sub reveal">Product, go-to-market, the team, and where the cash goes.</p>
  </div>
</div>`,
    }),
    s({
      id: 'iu-product',
      name: 'Product & GTM',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Product &amp; go-to-market</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What shipped, what we&rsquo;re selling.</h2>
  <div class="ucards reveal" style="--cols:2">
    <div class="ucard"><div class="ucard-tag">Product &middot; shipped</div><div class="ucard-t">SSO &amp; audit logs</div><div class="ucard-d">Enterprise security suite went GA, unblocking six stalled deals in the pipeline.</div></div>
    <div class="ucard"><div class="ucard-tag">Product &middot; in flight</div><div class="ucard-t">Usage-based billing</div><div class="ucard-d">Metering live in beta with 12 accounts; full rollout targeted for late April.</div></div>
    <div class="ucard"><div class="ucard-tag">GTM &middot; motion</div><div class="ucard-t">Two-track funnel</div><div class="ucard-d">Self-serve drives volume; a light-touch sales-assist tier converts the upper end.</div></div>
    <div class="ucard"><div class="ucard-tag">GTM &middot; channel</div><div class="ucard-t">First partner referrals</div><div class="ucard-d">Two integration partners sent inbound; building a formal co-sell motion next quarter.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Product &amp; GTM</span></div>
</div>`,
    }),
    s({
      id: 'iu-team',
      name: 'Team & hiring',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Team &amp; hiring</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">Growing deliberately.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">23</div><div class="stat-label">Full-time team members</div></div>
    <div class="stat"><div class="stat-num">+3</div><div class="stat-label">Net new hires in March</div></div>
    <div class="stat"><div class="stat-num">4</div><div class="stat-label">Open roles &mdash; 2 senior eng, 1 AE, 1 designer</div></div>
    <div class="stat"><div class="stat-num">61%</div><div class="stat-label">Of headcount in product &amp; engineering</div></div>
  </div>
  <div class="note reveal" style="margin-top:46px">
    <div class="note-k">Key hire</div>
    <p>Head of Sales (ex-Northwind, scaled $4M&rarr;$30M ARR) starts April 7. This was our top leadership gap last quarter.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Team</span></div>
</div>`,
    }),
    s({
      id: 'iu-runway',
      name: 'Runway & burn',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:104px;align-items:center">
    <div>
      <div class="kicker">Runway &amp; burn</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:30px">18 months in the bank.</h2>
      <div class="gauge-cap" style="margin-bottom:18px"><span>$4.46M</span> cash &middot; 18 mo at current burn</div>
      <div class="gauge">
        <div class="gauge-track">
          <div class="gauge-fill thin" style="--g:100%"></div>
          <div class="gauge-fill" style="--g:33%"></div>
        </div>
        <div class="gauge-scale"><span>Now</span><span>6 mo</span><span>12 mo</span><span>18 mo</span></div>
      </div>
      <p class="body" style="margin-top:30px;max-width:30ch">Burn is flat at <b>$248K/mo</b>. Default-alive at the current growth rate by Q3 &mdash; no near-term raise required.</p>
    </div>
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#1e3a5f 0 64%, #4a6b8a 64% 86%, #b9b2a6 86% 100%)"><div class="donut-label">64%</div></div>
      <div class="legend" style="margin-top:36px;display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;align-items:center;gap:16px;font-family:var(--body);font-size:28px;color:var(--text)"><span style="width:16px;height:16px;border-radius:3px;background:#1e3a5f"></span>Team &amp; payroll<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">64%</span></div>
        <div style="display:flex;align-items:center;gap:16px;font-family:var(--body);font-size:28px;color:var(--text)"><span style="width:16px;height:16px;border-radius:3px;background:#4a6b8a"></span>Infra &amp; tooling<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">22%</span></div>
        <div style="display:flex;align-items:center;gap:16px;font-family:var(--body);font-size:28px;color:var(--text)"><span style="width:16px;height:16px;border-radius:3px;background:#b9b2a6"></span>G&amp;A &amp; marketing<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">14%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Runway &amp; burn</span></div>
</div>`,
    }),
    s({
      id: 'iu-div3',
      name: 'Section · How you can help',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-inner">
    <div class="divider-num reveal">03 &mdash; The asks</div>
    <div class="divider-title reveal">How you<br/>can help.</div>
    <p class="divider-sub reveal">Specific, time-boxed requests. The more concrete, the easier to act on.</p>
  </div>
</div>`,
    }),
    s({
      id: 'iu-asks',
      name: 'Our asks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Our asks &middot; three this month</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">Where you can move the needle.</h2>
  <div class="asks reveal">
    <div class="ask"><div class="ask-n">01</div><div><div class="ask-t">Two intros to logistics-sector CFOs</div><div class="ask-d">Our enterprise pilots are in freight &mdash; warm intros to mid-market logistics finance leaders would compress the cycle.</div></div></div>
    <div class="ask"><div class="ask-n">02</div><div><div class="ask-t">Senior backend referrals</div><div class="ask-d">Hiring two senior eng (distributed systems). A referral from your portfolio network beats any job board for us right now.</div></div></div>
    <div class="ask"><div class="ask-n">03</div><div><div class="ask-t">Feedback on usage-based pricing</div><div class="ask-d">If you&rsquo;ve seen metered billing land (or fail) at this stage, 20 minutes on the model would be invaluable.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Asks</span></div>
</div>`,
    }),
    s({
      id: 'iu-note',
      name: 'A note from the founders',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal" style="margin-bottom:30px">A note from the founders</div>
  <blockquote class="quote reveal">&ldquo;We&rsquo;d rather show you the rough edges than a polished story. This month proved the engine works &mdash; now it&rsquo;s about widening the enterprise door without losing the discipline that got us here.&rdquo;</blockquote>
  <div class="signoff reveal">&mdash; Priya &amp; Marcus<span>Co-founders, Lattice Systems</span></div>
  <div class="runner reveal"><span class="runner-brand">Lattice Systems</span><span class="runner-label">Founder note</span></div>
</div>`,
    }),
    s({
      id: 'iu-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Until next month</div>
    <h2 class="display reveal" style="--display-size:108px;color:#fbfaf8">Thank you for<br/>backing us.</h2>
    <p class="lead reveal" style="max-width:36ch">Questions, intros, and hard feedback all welcome &mdash; founders@latticesystems.com</p>
  </div>
</div>`,
    }),
  ],
}
