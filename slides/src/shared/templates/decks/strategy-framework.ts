import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/strategy-framework-cover.jpg'

export const strategyFramework: Template = {
  id: 'strategy-framework',
  categories: ['Consulting', 'Strategy'],
  name: 'Strategy Framework',
  tagline: 'Austere, top-tier consulting frameworks',
  audiences: ['consultant', 'executive', 'strategy', 'partner'],
  description:
    'A crisp, structured strategy toolkit in charcoal-on-cream with one ochre accent and a Source Serif 4 / Inter pairing. SCQ, governing thought, an issue tree, a 2×2 matrix, value chain, a recommendation pyramid, and scored options carry a complete diagnose-decide-act argument you tailor to the problem.',
  fonts: {
    display: 'Source Serif 4',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#faf8f3',
    '--text': '#1f2937',
    '--muted': '#6b7280',
    '--accent': '#b45309',
    '--accent-2': '#b45309',
    '--display': "'Source Serif 4', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '600',
    '--title-size': '120px',
    '--headline-size': '74px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.26em',
    '--kicker-size': '20px',
    '--bullet-radius': '2px',
    '--card-bg': '#fdfcf9',
    '--card-border': '#e3ddd0',
    '--radius': '6px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--th-border': '#1f2937',
    '--table-border': '#e3ddd0',
    '--rule-color': '#dad3c4',
    '--track': '#e7e1d4',
    '--donut-hole': '#faf8f3',
    '--bar-gap': '36px',
    '--media-radius': '6px',
    '--media-border': '1px solid #e3ddd0',
    '--media-shadow': '0 44px 96px -42px rgba(31,41,55,0.42)',
    '--scrim':
      'linear-gradient(180deg, rgba(31,41,55,0.18) 0%, rgba(31,41,55,0.46) 52%, rgba(31,41,55,0.9) 100%)',
    '--pos': '#3f6212',
    '--neg': '#b45309',
  },
  stageBg: '#efe9dd',
  assets: ['strategy-framework-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label, .tl-when { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.bullet::before { background: var(--accent); }

/* ===== Section divider — austere ruled cream ===== */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font-family: var(--body); font-weight: 600; letter-spacing: 0.26em; font-size: 21px; text-transform: uppercase; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.96; letter-spacing: -0.02em; color: var(--text); }
.divider-rule { width: 132px; height: 4px; background: var(--accent); margin-top: 16px; }
.divider-sub { font-family: var(--body); font-size: 30px; color: var(--muted); max-width: 30ch; margin-top: 8px; }

/* ===== SCQ ladder — situation / complication / question ===== */
.scq { display: flex; flex-direction: column; gap: 0; }
.scq-row { display: grid; grid-template-columns: 320px 1fr; gap: 56px; align-items: start; padding: 38px 0; border-top: 1px solid var(--card-border); }
.scq-row:last-child { border-bottom: 1px solid var(--card-border); }
.scq-tag { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 22px; color: var(--accent); padding-top: 8px; }
.scq-tag .n { display: block; font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); letter-spacing: -0.01em; margin-top: 8px; text-transform: none; }
.scq-text { font-family: var(--display); font-weight: 500; font-size: 42px; line-height: 1.22; color: var(--text); }
.scq-row.q .scq-text { color: var(--accent); }

/* ===== Governing thought — bordered statement plate ===== */
.thought { border: 1px solid var(--card-border); border-left: 5px solid var(--accent); background: var(--card-bg); padding: 60px 70px; border-radius: 0 6px 6px 0; }
.thought-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; font-size: 21px; color: var(--accent); margin-bottom: 24px; }
.thought-t { font-family: var(--display); font-weight: 500; font-size: 64px; line-height: 1.16; letter-spacing: -0.01em; color: var(--text); }

/* ===== Issue / driver tree ===== */
.tree { display: grid; grid-template-columns: 360px 60px 1fr; align-items: center; gap: 0; }
.tree-root { border: 1px solid var(--card-border); border-left: 5px solid var(--accent); background: var(--card-bg); border-radius: 0 6px 6px 0; padding: 34px 36px; }
.tree-root .rk { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; font-size: 19px; color: var(--accent); }
.tree-root .rt { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.08; color: var(--text); margin-top: 10px; }
.tree-elbow { position: relative; height: 100%; }
.tree-elbow::before { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: var(--card-border); }
.tree-branches { display: flex; flex-direction: column; gap: 22px; }
.branch { display: grid; grid-template-columns: 60px 1fr; align-items: center; }
.branch-line { position: relative; height: 100%; }
.branch-line::before { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 2px; background: var(--card-border); }
.branch-box { border: 1px solid var(--card-border); background: var(--card-bg); border-radius: 6px; padding: 22px 28px; }
.branch-box .bk { font-family: var(--body); font-weight: 700; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.branch-box .bt { font-family: var(--display); font-weight: 500; font-size: 30px; color: var(--text); line-height: 1.1; margin-top: 6px; }
.branch-box .bd { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 6px; line-height: 1.32; }

/* ===== 2×2 prioritization matrix ===== */
.matrix-wrap { display: grid; grid-template-columns: 56px 1fr; grid-template-rows: 1fr 56px; gap: 0; }
.matrix-yaxis { grid-column: 1; grid-row: 1; display: grid; place-items: center; }
.matrix-yaxis span { writing-mode: vertical-rl; transform: rotate(180deg); font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; font-size: 20px; color: var(--muted); }
.matrix { grid-column: 2; grid-row: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; border: 2px solid var(--text); }
.matrix-xaxis { grid-column: 2; grid-row: 2; display: grid; place-items: center; }
.matrix-xaxis span { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; font-size: 20px; color: var(--muted); }
.quad { position: relative; padding: 34px 38px; border-right: 1px solid var(--card-border); border-bottom: 1px solid var(--card-border); display: flex; flex-direction: column; gap: 12px; }
.quad:nth-child(2), .quad:nth-child(4) { border-right: 0; }
.quad:nth-child(3), .quad:nth-child(4) { border-bottom: 0; }
.quad-k { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; font-size: 18px; color: var(--muted); }
.quad-t { font-family: var(--display); font-weight: 600; font-size: 32px; line-height: 1.04; color: var(--text); }
.quad-items { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.quad-item { font-family: var(--body); font-size: 23px; color: var(--text); line-height: 1.25; }
.quad.win { background: rgba(180,83,9,0.08); }
.quad.win .quad-k { color: var(--accent); }
.quad-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: var(--accent); margin-right: 12px; vertical-align: middle; }

/* ===== Recommendation pyramid (3-tier) ===== */
.pyramid { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.tier { border: 1px solid var(--card-border); background: var(--card-bg); border-radius: 6px; padding: 28px 44px; text-align: center; }
.tier-1 { width: 46%; border-color: var(--accent); border-width: 2px; background: rgba(180,83,9,0.07); }
.tier-2 { width: 70%; }
.tier-3 { width: 100%; }
.tier-k { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; font-size: 18px; color: var(--accent); }
.tier-2 .tier-k, .tier-3 .tier-k { color: var(--muted); }
.tier-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.08; color: var(--text); margin-top: 6px; }
.tier-3 .tier-t, .tier-2 .tier-t { font-size: 28px; font-weight: 500; }
.tier-row { display: flex; justify-content: center; gap: 60px; flex-wrap: wrap; margin-top: 4px; }
.tier-row span { font-family: var(--body); font-size: 24px; color: var(--text); }

/* ===== Hypothesis cards ===== */
.hyp { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; padding: 36px 38px; display: flex; flex-direction: column; gap: 14px; position: relative; }
.hyp::before { content: ''; position: absolute; top: 0; left: 0; width: 5px; height: 100%; background: var(--accent); border-radius: 6px 0 0 6px; }
.hyp-h { display: flex; align-items: baseline; gap: 16px; }
.hyp-n { font-family: var(--display); font-weight: 700; font-size: 28px; color: var(--accent); }
.hyp-lab { font-family: var(--body); font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; font-size: 18px; color: var(--muted); }
.hyp-t { font-family: var(--display); font-weight: 600; font-size: 33px; line-height: 1.12; color: var(--text); }
.hyp-test { font-family: var(--body); font-size: 23px; line-height: 1.36; color: var(--muted); }
.hyp-test b { color: var(--text); font-weight: 600; }

/* ===== Value-chain link cards (sit inside shared .flow) ===== */
.vc { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 6px; padding: 28px 22px; text-align: center; height: 100%; display: flex; flex-direction: column; gap: 10px; }
.vc-t { font-family: var(--display); font-weight: 600; font-size: 27px; color: var(--text); line-height: 1.06; }
.vc-d { font-family: var(--body); font-size: 20px; color: var(--muted); line-height: 1.28; }
.vc.lead-link { border-color: var(--accent); border-width: 2px; background: rgba(180,83,9,0.07); }

/* ===== Lede + ruled callout ===== */
.lede { font-family: var(--display); font-weight: 500; font-size: 58px; line-height: 1.16; letter-spacing: -0.01em; color: var(--text); max-width: 20ch; }
.note { border-left: 4px solid var(--accent); background: rgba(180,83,9,0.06); padding: 28px 36px; border-radius: 0 6px 6px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 10px; }

/* ===== Table scoring marks ===== */
.score { font-family: var(--display); font-weight: 700; font-variant-numeric: tabular-nums; }
.row-rec { background: rgba(180,83,9,0.07); }
.row-rec td { font-weight: 600; }
.pick { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 700; font-size: 24px; color: var(--accent); }
.pick::before { content: '\\2713'; font-weight: 800; }`,
  notes:
    'A complete strategy-frameworks toolkit applied to one fictional problem (a regional grocer, "Meridian Grocers", deciding how to defend against online entrants). Source Serif 4 display + Inter body, charcoal #1f2937 on cream #faf8f3, ONE ochre (#b45309) accent, austere and heavily white-spaced — let the structure carry it. Open and close on the brutalist-architecture full-bleed (assets/strategy-framework-cover.jpg). Signature frameworks: the .scq situation-complication-question ladder, the bordered .thought governing statement, the .tree issue/driver tree, the 2×2 .matrix (with .quad.win highlighting the priority quadrant), value-chain .vc cards inside the shared .flow, the 3-tier .pyramid recommendation, and .hyp hypothesis cards. Use .table for scored options (.row-rec + .pick mark the recommendation), .timeline for initiatives, .bars/.stats for impact, .checks for risks/assumptions. Pin the .runner footer (brand left, framework name right) on content slides. Keep numbers tabular and every argument MECE.',
  sampleSlides: [
    s({
      id: 'sf-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Strategy Review · Meridian Grocers</div>
    <h1 class="display reveal" style="--display-size:128px;margin-top:8px">Defend the<br/>aisle.</h1>
    <p class="lead reveal">A framework-led case for where Meridian competes — and where it must not.</p>
  </div>
</div>`,
    }),
    s({
      id: 'sf-scq',
      name: 'Situation · Complication · Question',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Framing the problem</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Situation, complication, question.</h2>
  <div class="scq reveal">
    <div class="scq-row"><div class="scq-tag">Situation<span class="n">Where we stand</span></div><div class="scq-text">Meridian is the #1 regional grocer with <b>118 stores</b> and a loyal, high-frequency shopper base.</div></div>
    <div class="scq-row"><div class="scq-tag">Complication<span class="n">What changed</span></div><div class="scq-text">Two online-first entrants now offer same-day delivery, and our 35-and-under basket has fallen three years running.</div></div>
    <div class="scq-row q"><div class="scq-tag">Question<span class="n">What to decide</span></div><div class="scq-text">How should Meridian defend its core while building a credible digital offer — without eroding margin?</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">SCQ</span></div>
</div>`,
    }),
    s({
      id: 'sf-thought',
      name: 'The governing thought',
      transition: 'slide',
      bodyHtml: `<div class="pad center">
  <div class="thought reveal">
    <div class="thought-k">The governing thought</div>
    <p class="thought-t">Win on <b>proximity and freshness</b> — the two advantages entrants can't copy — and digitize around them rather than chasing price.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Governing thought</span></div>
</div>`,
    }),
    s({
      id: 'sf-div1',
      name: 'Section · Diagnose',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Diagnose</div>
  <div class="divider-title reveal">Break the<br/>problem down.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Where is value won and lost — and which levers actually move the answer?</p>
</div>`,
    }),
    s({
      id: 'sf-tree',
      name: 'The issue tree',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Issue tree · MECE</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:26px;font-size:62px">What drives shopper retention?</h2>
  <div class="tree reveal">
    <div class="tree-root"><div class="rk">Root question</div><div class="rt">Why are younger shoppers leaving?</div></div>
    <div class="tree-elbow"></div>
    <div class="tree-branches">
      <div class="branch"><div class="branch-line"></div><div class="branch-box"><div class="bk">Convenience</div><div class="bt">No same-day digital order</div><div class="bd">62% of lapsed shoppers cite delivery and pickup gaps.</div></div></div>
      <div class="branch"><div class="branch-line"></div><div class="branch-box"><div class="bk">Assortment</div><div class="bt">Thin prepared &amp; specialty range</div><div class="bd">Fresh-prepared SKUs lag entrants by roughly 40%.</div></div></div>
      <div class="branch"><div class="branch-line"></div><div class="branch-box"><div class="bk">Value perception</div><div class="bt">Loyalty rewards feel dated</div><div class="bd">Program engagement among under-35s down 11 pts.</div></div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Issue tree</span></div>
</div>`,
    }),
    s({
      id: 'sf-matrix',
      name: '2×2 prioritization matrix',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Prioritization · impact vs. effort</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px;font-size:60px">Where to play first.</h2>
  <div class="matrix-wrap reveal" style="height:560px">
    <div class="matrix-yaxis"><span>Impact &rarr;</span></div>
    <div class="matrix">
      <div class="quad win"><div class="quad-k">Do now · quick wins</div><div class="quad-t">High impact, low effort</div><div class="quad-items"><div class="quad-item"><span class="quad-dot"></span>Launch same-day pickup</div><div class="quad-item"><span class="quad-dot"></span>Refresh loyalty tiers</div></div></div>
      <div class="quad"><div class="quad-k">Major bets</div><div class="quad-t">High impact, high effort</div><div class="quad-items"><div class="quad-item"><span class="quad-dot"></span>Build delivery network</div><div class="quad-item"><span class="quad-dot"></span>Expand fresh-prepared lines</div></div></div>
      <div class="quad"><div class="quad-k">Fill-ins</div><div class="quad-t">Low impact, low effort</div><div class="quad-items"><div class="quad-item"><span class="quad-dot"></span>App UI polish</div></div></div>
      <div class="quad"><div class="quad-k">Avoid</div><div class="quad-t">Low impact, high effort</div><div class="quad-items"><div class="quad-item"><span class="quad-dot"></span>Match entrant price head-on</div></div></div>
    </div>
    <div class="matrix-xaxis"><span>Effort &rarr;</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Prioritization</span></div>
</div>`,
    }),
    s({
      id: 'sf-valuechain',
      name: 'The value chain',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Value chain · where margin lives</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:28px;font-size:58px">Our advantage compounds downstream.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="vc"><div class="vc-t">Sourcing</div><div class="vc-d">Regional grower network, parity cost</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vc"><div class="vc-t">Distribution</div><div class="vc-d">Dense store footprint, short hauls</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vc lead-link"><div class="vc-t">In-store fresh</div><div class="vc-d">Hard to replicate — our edge</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vc lead-link"><div class="vc-t">Last mile</div><div class="vc-d">Stores double as fulfillment hubs</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="vc"><div class="vc-t">Loyalty</div><div class="vc-d">First-party data, repeat baskets</div></div></div>
  </div>
  <div class="note reveal" style="margin-top:36px">
    <div class="note-k">Read it this way</div>
    <p class="body" style="max-width:none">Entrants compete on the first two links; <b>our durable edge is the last three</b>. Strategy should concentrate spend there.</p>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Value chain</span></div>
</div>`,
    }),
    s({
      id: 'sf-div2',
      name: 'Section · Decide',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Decide</div>
  <div class="divider-title reveal">Choose the<br/>winning move.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Generate real options, score them on the same axes, and commit to one.</p>
</div>`,
    }),
    s({
      id: 'sf-options',
      name: 'Strategic options',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Strategic options · three roads</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:24px;font-size:60px">Three credible ways to play.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-num">Option A</div><div class="card-title">Price fighter</div><div class="card-body">Match entrant pricing across the basket and absorb the margin hit to hold share.</div></div>
    <div class="card"><div class="card-num">Option B</div><div class="card-title">Fresh + fast</div><div class="card-body">Lean into fresh and proximity; turn stores into same-day fulfillment hubs.</div></div>
    <div class="card"><div class="card-num">Option C</div><div class="card-title">Platform play</div><div class="card-body">Build a full marketplace and third-party delivery network from scratch.</div></div>
  </div>
  <p class="lead reveal" style="margin-top:30px;max-width:54ch">Each is internally coherent. The test is which one best fits our advantages and the economics we can sustain.</p>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Options</span></div>
</div>`,
    }),
    s({
      id: 'sf-scored',
      name: 'Options scored',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Options scored · weighted criteria (1–5)</div>
  <table class="table reveal" style="margin-top:14px">
    <thead><tr><th>Option</th><th class="num">Fit to edge</th><th class="num">Margin</th><th class="num">Speed</th><th class="num">Risk</th><th>Verdict</th></tr></thead>
    <tbody>
      <tr><td>A · Price fighter</td><td class="num score">2</td><td class="num score neg">1</td><td class="num score">4</td><td class="num score">2</td><td class="muted">Erodes the moat</td></tr>
      <tr class="row-rec"><td>B · Fresh + fast</td><td class="num score">5</td><td class="num score pos">4</td><td class="num score">4</td><td class="num score">4</td><td><span class="pick">Recommend</span></td></tr>
      <tr><td>C · Platform play</td><td class="num score">3</td><td class="num score">3</td><td class="num score neg">1</td><td class="num score neg">1</td><td class="muted">Too slow, too costly</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Scores are weighted: fit-to-edge 30%, margin 25%, speed 25%, execution risk 20%. Higher is better on every axis.</p>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Scoring</span></div>
</div>`,
    }),
    s({
      id: 'sf-pyramid',
      name: 'The recommendation',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The recommendation · top-down</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:28px;font-size:58px">One answer, three pillars.</h2>
  <div class="pyramid reveal">
    <div class="tier tier-1"><div class="tier-k">Recommendation</div><div class="tier-t">Become the fresh, fast neighborhood grocer.</div></div>
    <div class="tier tier-2"><div class="tier-k">Because</div><div class="tier-row"><span><b>Defends</b> the proximity moat</span><span><b>Protects</b> margin</span><span><b>Wins</b> the under-35 basket</span></div></div>
    <div class="tier tier-3"><div class="tier-k">Supported by</div><div class="tier-row"><span>Same-day pickup &amp; delivery</span><span>Expanded fresh-prepared range</span><span>Modern loyalty &amp; data</span></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Recommendation</span></div>
</div>`,
    }),
    s({
      id: 'sf-hypotheses',
      name: 'Hypotheses to test',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Working hypotheses · what would prove us right</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:24px;font-size:58px">Three bets, three tests.</h2>
  <div class="cols-3 reveal">
    <div class="hyp"><div class="hyp-h"><span class="hyp-n">H1</span><span class="hyp-lab">Convenience</span></div><div class="hyp-t">Same-day pickup recovers lapsed shoppers.</div><div class="hyp-test">Test: <b>10-store pilot</b> lifts under-35 visit frequency by 15% in 90 days.</div></div>
    <div class="hyp"><div class="hyp-h"><span class="hyp-n">H2</span><span class="hyp-lab">Assortment</span></div><div class="hyp-t">Fresh-prepared range raises basket size.</div><div class="hyp-test">Test: new range lifts <b>average basket +8%</b> with stable food cost.</div></div>
    <div class="hyp"><div class="hyp-h"><span class="hyp-n">H3</span><span class="hyp-lab">Loyalty</span></div><div class="hyp-t">Modern rewards re-engage the cohort.</div><div class="hyp-test">Test: relaunch lifts <b>active members +20%</b> within two quarters.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Hypotheses</span></div>
</div>`,
    }),
    s({
      id: 'sf-div3',
      name: 'Section · Act',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Act</div>
  <div class="divider-title reveal">Turn it into<br/>motion.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Sequence the initiatives, size the prize, and name the risks before they bite.</p>
</div>`,
    }),
    s({
      id: 'sf-initiatives',
      name: 'Initiatives roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Initiatives · the next four quarters</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px;font-size:62px">Sequenced for early proof.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Q1</div><div class="tl-what"><b>Pilot same-day pickup</b> in ten flagship stores and relaunch the loyalty tiers.</div></div>
    <div class="tl-row"><div class="tl-when">Q2</div><div class="tl-what"><b>Scale pickup chain-wide</b> and stand up the first three fresh-prepared kitchens.</div></div>
    <div class="tl-row"><div class="tl-when">Q3</div><div class="tl-what"><b>Launch store-fulfilled delivery</b> in the two densest metros.</div></div>
    <div class="tl-row"><div class="tl-when">Q4</div><div class="tl-what"><b>Roll out the data platform</b> and measure cohort retention against baseline.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Initiatives</span></div>
</div>`,
    }),
    s({
      id: 'sf-impact',
      name: 'Expected impact',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Expected impact · 3-year</div>
      <h2 class="headline" style="margin-top:6px;font-size:62px">The prize, sized.</h2>
      <div class="stats" style="margin-top:30px">
        <div class="stat"><div class="stat-num">+$210M</div><div class="stat-label">Incremental annual revenue by Year 3</div></div>
        <div class="stat"><div class="stat-num">+90bps</div><div class="stat-label">Net margin from store-led fulfillment</div></div>
      </div>
    </div>
    <div class="bars" style="--bars-height:380px">
      <div class="bar" style="--h:30%"><div class="bar-fill" data-val="$0.9B"></div><div class="bar-label">Today</div></div>
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="$1.0B"></div><div class="bar-label">Year 1</div></div>
      <div class="bar" style="--h:72%"><div class="bar-fill" data-val="$1.06B"></div><div class="bar-label">Year 2</div></div>
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$1.11B"></div><div class="bar-label">Year 3</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Expected impact</span></div>
</div>`,
    }),
    s({
      id: 'sf-risks',
      name: 'Risks & assumptions',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:start">
    <div>
      <div class="kicker">Key assumptions</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:22px;font-size:54px">What must hold true.</h2>
      <ul class="checks" style="--gap:24px">
        <li class="check"><span>Store labor can flex to fulfill pickup without new headcount above plan.</span></li>
        <li class="check"><span>Fresh-prepared food cost stays within <b>two points</b> of target.</span></li>
        <li class="check"><span>Entrants don't drop below cost to buy share for more than two quarters.</span></li>
      </ul>
    </div>
    <div>
      <div class="kicker">Watch items</div>
      <h2 class="headline" style="margin-top:6px;margin-bottom:22px;font-size:54px">Where it could break.</h2>
      <ul class="bullets" style="--gap:24px">
        <li class="bullet"><span><b>Cannibalization</b> — pickup pulls from higher-margin in-store trips.</span></li>
        <li class="bullet"><span><b>Execution</b> — kitchen rollout slips and starves the assortment story.</span></li>
        <li class="bullet"><span><b>Price war</b> — a prolonged entrant subsidy compresses the whole category.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Risks &amp; assumptions</span></div>
</div>`,
    }),
    s({
      id: 'sf-quote',
      name: 'Partner quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"Strategy is choosing what not to do. Meridian's edge was never price — it was the half-mile to the front door."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Helena Vargas</span><span class="cite-role">Engagement Partner</span></div>
  <div class="runner reveal"><span class="runner-brand">Meridian Grocers</span><span class="runner-label">Point of view</span></div>
</div>`,
    }),
    s({
      id: 'sf-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The decision</div>
    <h2 class="display reveal" style="--display-size:116px">Fresh, fast,<br/>and ours.</h2>
    <p class="lead reveal">Commit to the pilot this quarter — the proof points follow within ninety days.</p>
  </div>
</div>`,
    }),
  ],
}
