import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/clean-minimal-cover.jpg'
const FIG_IMG = 'assets/clean-minimal-fig.jpg'

export const cleanMinimal: Template = {
  id: 'clean-minimal',
  categories: ['Strategy', 'Company', 'Consulting'],
  name: 'Clean Minimal',
  tagline: 'Swiss precision — white space, one confident accent',
  audiences: ['consulting', 'business', 'general', 'strategy'],
  description:
    'A restrained, editorial-grade light deck: generous white space, a precise type scale, hairline rules, and a single decisive blue. A complete quarterly strategy review you tailor to your own bets and numbers.',
  fonts: {
    display: 'General Sans',
    body: 'General Sans',
    links: [
      'https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fcfcfd',
    '--text': '#0b0b0d',
    '--muted': '#6b7280',
    '--accent': '#2f6df6',
    '--accent-2': '#2f6df6',
    '--display': "'General Sans', sans-serif",
    '--body': "'General Sans', sans-serif",
    '--display-weight': '600',
    '--title-size': '128px',
    '--headline-size': '78px',
    '--section-size': '150px',
    '--lead-size': '38px',
    '--subhead-size': '46px',
    '--card-bg': '#ffffff',
    '--card-border': '#ececf0',
    '--card-shadow': '0 1px 2px rgba(11,11,13,0.04)',
    '--radius': '14px',
    '--media-shadow': '0 50px 100px -40px rgba(11,11,13,0.30)',
    '--th-border': '#0b0b0d',
    '--table-border': '#ececf0',
    '--track': '#ececf0',
    '--donut-hole': '#fcfcfd',
    '--bar-gap': '40px',
    '--stat-size': '92px',
    '--metric-size': '108px',
    '--scrim':
      'linear-gradient(180deg, rgba(11,11,13,0.0) 38%, rgba(11,11,13,0.46) 100%)',
  },
  stageBg: '#f3f3f5',
  assets: ['clean-minimal-cover.jpg', 'clean-minimal-fig.jpg'],
  decoration: `.full-bleed .kicker { color: #fff; opacity: 0.86; }
.bar-fill { background: var(--accent); border-radius: 4px 4px 0 0; }
.donut-label { color: var(--text); }
/* Hairline section marker — quiet, numbered, ruled */
.mark { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.mark-num { font-family: var(--body); font-weight: 600; font-size: 24px; letter-spacing: 0.22em; color: var(--accent); }
.mark-title { font-family: var(--display); font-weight: 600; font-size: var(--section-size, 150px); line-height: 0.96; letter-spacing: -0.025em; color: var(--text); text-wrap: balance; }
.mark-rule { width: 84px; height: 2px; background: var(--text); margin-top: 14px; opacity: 0.85; }
/* Refined numbered agenda — tight rows on hairlines */
.idx { display: flex; flex-direction: column; }
.idx-row { display: grid; grid-template-columns: 88px 1fr auto; gap: 36px; align-items: baseline; padding: 26px 0; border-top: 1px solid var(--card-border); }
.idx-row:last-child { border-bottom: 1px solid var(--card-border); }
.idx-n { font-family: var(--body); font-weight: 600; font-size: 26px; color: var(--accent); letter-spacing: 0.04em; }
.idx-t { font-family: var(--display); font-weight: 600; font-size: 40px; letter-spacing: -0.01em; color: var(--text); }
.idx-d { font-family: var(--body); font-size: 25px; color: var(--muted); text-align: right; }
/* Quiet labelled note — a single hairline-left callout, no fill */
.aside { border-left: 2px solid var(--accent); padding: 6px 0 6px 30px; }
.aside-k { font-family: var(--body); font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 12px; }
.aside-t { font-family: var(--display); font-weight: 600; font-size: 36px; line-height: 1.18; letter-spacing: -0.01em; color: var(--text); max-width: 28ch; }
/* Bet cards — flat, hairline, one accent index */
.bet { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 40px 36px; display: flex; flex-direction: column; gap: 14px; height: 100%; }
.bet-n { font-family: var(--body); font-weight: 600; font-size: 22px; letter-spacing: 0.04em; color: var(--accent); }
.bet-t { font-family: var(--display); font-weight: 600; font-size: 38px; line-height: 1.04; letter-spacing: -0.01em; color: var(--text); }
.bet-d { font-family: var(--body); font-size: 25px; line-height: 1.4; color: var(--muted); }
.bet-foot { margin-top: auto; padding-top: 18px; border-top: 1px solid var(--card-border); font-family: var(--body); font-size: 22px; color: var(--text); }
.bet-foot b { color: var(--accent); }
/* Bar chart axis baseline + delicate labels */
.plot { border-bottom: 1px solid var(--text); padding-bottom: 0; }
.bar-label { color: var(--muted); }
/* Two-tone score chip for the table */
.score { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 600; font-size: 25px; }
.score::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
.score.up::before { background: var(--accent); }
.score.flat::before { background: #c8ccd2; }
.score.down::before { background: #0b0b0d; opacity: 0.5; }
@media (max-width: 640px) {
  html.deck-can-flow .mark-title { font-size: min(51px, 14vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .idx-row { grid-template-columns: 1fr !important; gap: 6px 0 !important; padding: 18px 0 !important; }
  html.deck-can-flow .idx-t { font-size: min(36px, 10vw) !important; line-height: 1.1 !important; }
  html.deck-can-flow .idx-d { text-align: left !important; font-size: min(22px, 6vw) !important; }
  html.deck-can-flow .bet { padding: 26px 22px !important; }
  html.deck-can-flow .bet-t { font-size: min(36px, 10vw) !important; }
  html.deck-can-flow .bet-d { font-size: min(22px, 6vw) !important; }
  html.deck-can-flow .aside-t { font-size: min(36px, 10vw) !important; max-width: 100% !important; }
}`,
  notes:
    'Restraint is the craft: lots of white space, ONE blue accent (#2f6df6), hairline rules, mostly left-aligned. Use .kicker.lockup for eyebrows, the .idx numbered-agenda for overviews, .mark/.mark-num/.mark-title/.mark-rule for quiet section breaks, .bet flat cards for the strategic bets, .aside for a single hairline callout, tight .table data with .score chips, and a .bars chart with the .plot baseline. Pin the .runner footer on content slides. Imagery is calm and architectural (clean-minimal-cover full-bleed, clean-minimal-fig in a split). Never add shadows beyond the subtle card/media defaults; never use gradient text or fills.',
  sampleSlides: [
    // 1 — Cover (full-bleed generated imagery)
    s({
      id: 'cm-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker lockup reveal">Quarterly Strategy Review · Q2 2026</div>
    <h1 class="title reveal" style="margin-top:10px">Focus is the<br/>only leverage.</h1>
    <p class="lead reveal">A clear, unsentimental plan for the next 90 days.</p>
  </div>
</div>`,
    }),
    // 2 — Agenda
    s({
      id: 'cm-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">Agenda</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">What we'll decide today.</h2>
  <div class="idx reveal">
    <div class="idx-row"><div class="idx-n">01</div><div class="idx-t">The honest baseline</div><div class="idx-d">Where the quarter actually landed</div></div>
    <div class="idx-row"><div class="idx-n">02</div><div class="idx-t">Working &amp; not working</div><div class="idx-d">What to keep, what to kill</div></div>
    <div class="idx-row"><div class="idx-n">03</div><div class="idx-t">The three bets</div><div class="idx-d">Where we concentrate effort</div></div>
    <div class="idx-row"><div class="idx-n">04</div><div class="idx-t">The 90-day plan</div><div class="idx-d">Roadmap, resourcing, risks</div></div>
    <div class="idx-row"><div class="idx-n">05</div><div class="idx-t">The ask</div><div class="idx-d">Decisions we need from you</div></div>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">Q2 Strategy Review</span></div>
</div>`,
    }),
    // 3 — Honest baseline: stat row + compact table
    s({
      id: 'cm-baseline',
      name: 'Baseline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">The honest baseline</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">Where the quarter landed.</h2>
  <div class="stats reveal" style="margin-bottom:46px">
    <div class="stat"><div class="stat-num">$4.8M</div><div class="stat-label">ARR, up 11% QoQ</div></div>
    <div class="stat"><div class="stat-num">112%</div><div class="stat-label">Net revenue retention</div></div>
    <div class="stat"><div class="stat-num">38</div><div class="stat-label">Active accounts</div></div>
    <div class="stat"><div class="stat-num">5.2mo</div><div class="stat-label">Runway buffer added</div></div>
  </div>
  <table class="table reveal">
    <thead><tr><th>Segment</th><th class="num">ARR</th><th class="num">QoQ</th><th>Read</th></tr></thead>
    <tbody>
      <tr><td>Core mid-market</td><td class="num">$3.1M</td><td class="num pos">+19%</td><td>Engine</td></tr>
      <tr><td>Enterprise pilots</td><td class="num">$1.0M</td><td class="num pos">+6%</td><td>Promising</td></tr>
      <tr><td>Self-serve</td><td class="num">$0.7M</td><td class="num neg">−4%</td><td>Distracting</td></tr>
      <tr class="row-em"><td>Total</td><td class="num">$4.8M</td><td class="num pos">+11%</td><td>On plan</td></tr>
    </tbody>
  </table>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">01 · Baseline</span></div>
</div>`,
    }),
    // 4 — What's working / what isn't
    s({
      id: 'cm-workingnot',
      name: 'Working & not',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">An honest read</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">What's working — and what isn't.</h2>
  <div class="two-col reveal" style="--col-gap:96px;align-items:start">
    <ul class="checks" style="--gap:24px">
      <li class="check"><span><b>Core mid-market</b> renews itself — word of mouth is doing the selling.</span></li>
      <li class="check"><span><b>Onboarding</b> below 7 days correlates with 90%+ retention.</span></li>
      <li class="check"><span><b>One lighthouse</b> deal is reshaping how the market sees us.</span></li>
    </ul>
    <ul class="bullets" style="--gap:24px;--bullet-color:#c8ccd2">
      <li class="bullet"><span><b>Self-serve</b> eats support hours and returns the least revenue.</span></li>
      <li class="bullet"><span><b>Three roadmaps</b> in flight means none of them ship fast.</span></li>
      <li class="bullet"><span><b>Pricing</b> still apologizes for the value we deliver.</span></li>
    </ul>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">01 · Baseline</span></div>
</div>`,
    }),
    // 5 — Section divider
    s({
      id: 'cm-sec-bets',
      name: 'Section · The bets',
      transition: 'fade',
      bodyHtml: `<div class="mark">
  <div class="mark-num reveal">02 — Strategy</div>
  <div class="mark-title reveal">The three bets<br/>that matter.</div>
  <div class="mark-rule reveal"></div>
</div>`,
    }),
    // 6 — Statement (restraint)
    s({
      id: 'cm-statement',
      name: 'Statement',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <h2 class="display reveal" style="--display-size:138px">Do less,<br/>but <span class="accent-text">unreasonably</span> well.</h2>
  <p class="lead reveal" style="margin-top:6px">Three bets. Everything else gets quieter or gets cut.</p>
</div>`,
    }),
    // 7 — The three bets (cards)
    s({
      id: 'cm-three-bets',
      name: 'Three bets',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">Where we concentrate</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Three bets, one team.</h2>
  <div class="cols-3 reveal">
    <div class="bet"><div class="bet-n">Bet 01</div><div class="bet-t">Win the core</div><div class="bet-d">Make mid-market the place we are unbeatable — depth, not breadth.</div><div class="bet-foot">Owner · <b>Maya</b></div></div>
    <div class="bet"><div class="bet-n">Bet 02</div><div class="bet-t">Prove the wedge</div><div class="bet-d">Turn one lighthouse account into a fully referenceable story.</div><div class="bet-foot">Owner · <b>Dev</b></div></div>
    <div class="bet"><div class="bet-n">Bet 03</div><div class="bet-t">Reset pricing</div><div class="bet-d">Charge for the value we already deliver. Stop discounting fear.</div><div class="bet-foot">Owner · <b>Priya</b></div></div>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">02 · Strategy</span></div>
</div>`,
    }),
    // 8 — Deep-dive on lead bet (split + image + bullets)
    s({
      id: 'cm-leadbet',
      name: 'Lead bet · deep-dive',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker lockup reveal">Bet 01 — the lead bet</div>
    <h2 class="headline reveal">Win the core,<br/>completely.</h2>
    <ul class="bullets reveal" style="--gap:20px;margin-top:6px">
      <li class="bullet"><span>Concentrate engineering on the <b>five workflows</b> mid-market lives in.</span></li>
      <li class="bullet"><span>Cut onboarding to <b>under five days</b> for every new account.</span></li>
      <li class="bullet"><span>Make the segment <b>self-evidently the best choice</b>, not the cheapest.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt="Focused, orderly workspace"></figure>
</div>`,
    }),
    // 9 — Market / data slide (bars chart)
    s({
      id: 'cm-market',
      name: 'Market · data',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">The opportunity</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:36px">The core segment is where the money compounds.</h2>
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div class="bars plot" style="--bars-height:330px">
      <div class="bar" style="--h:34%"><div class="bar-fill" data-val="$1.2M"></div><div class="bar-label">Self-serve</div></div>
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="$2.1M"></div><div class="bar-label">Enterprise</div></div>
      <div class="bar" style="--h:100%"><div class="bar-fill" data-val="$3.4M"></div><div class="bar-label">Core mid-mkt</div></div>
    </div>
    <div>
      <div class="aside">
        <div class="aside-k">Reachable ARR, 12 months</div>
        <div class="aside-t">Two thirds of the winnable revenue sits in one segment we already lead.</div>
      </div>
      <p class="body" style="margin-top:28px">Spreading thin across three has cost us the compounding we'd get from owning one.</p>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">02 · Strategy</span></div>
</div>`,
    }),
    // 10 — 90-day roadmap (timeline)
    s({
      id: 'cm-roadmap',
      name: 'Roadmap',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">The 90-day plan</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">What lands, and when.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Weeks 1–3</div><div class="tl-what"><b>Sunset &amp; refocus</b> — wind down self-serve, redeploy the team to the core.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 4–7</div><div class="tl-what"><b>Lighthouse live</b> — ship the referenceable deployment and capture the proof.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 6–9</div><div class="tl-what"><b>Pricing reset</b> — new packaging live, renewals repriced to value.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 10–12</div><div class="tl-what"><b>Core depth</b> — five workflows shipped, onboarding under five days.</div></div>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">03 · The plan</span></div>
</div>`,
    }),
    // 11 — What we STOP doing (checks)
    s({
      id: 'cm-stop',
      name: 'Stop doing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">Subtraction is strategy</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">What we stop doing, starting Monday.</h2>
  <div class="two-col reveal" style="--col-gap:96px;align-items:start">
    <ul class="checks" style="--gap:24px">
      <li class="check"><span>Stop <b>investing in self-serve</b> — freeze the roadmap, keep it on life support.</span></li>
      <li class="check"><span>Stop <b>chasing every enterprise RFP</b> — one lighthouse, done right.</span></li>
    </ul>
    <ul class="checks" style="--gap:24px">
      <li class="check"><span>Stop <b>discounting on instinct</b> — the new price is the price.</span></li>
      <li class="check"><span>Stop <b>shipping three roadmaps</b> — one queue, ruthlessly ordered.</span></li>
    </ul>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">03 · The plan</span></div>
</div>`,
    }),
    // 12 — Resourcing (stat row + table)
    s({
      id: 'cm-resourcing',
      name: 'Resourcing',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">Resourcing</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:30px">The same team, pointed differently.</h2>
  <div class="stats reveal" style="margin-bottom:44px">
    <div class="stat"><div class="stat-num">+30%</div><div class="stat-label">Engineering hours on the core</div></div>
    <div class="stat"><div class="stat-num">0</div><div class="stat-label">New hires required</div></div>
    <div class="stat"><div class="stat-num">2</div><div class="stat-label">Workstreams sunset</div></div>
  </div>
  <table class="table reveal">
    <thead><tr><th>Workstream</th><th>Owner</th><th class="num">Target</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Lighthouse rollout</td><td>Maya</td><td class="num">1 live</td><td><span class="score up">On track</span></td></tr>
      <tr><td>Pricing reset</td><td>Dev</td><td class="num">+18%</td><td><span class="score up">On track</span></td></tr>
      <tr><td>Core depth</td><td>Priya</td><td class="num">5 flows</td><td><span class="score flat">Scoping</span></td></tr>
      <tr><td>Self-serve sunset</td><td>Sam</td><td class="num">2 closed</td><td><span class="score down">Winding down</span></td></tr>
    </tbody>
  </table>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">03 · The plan</span></div>
</div>`,
    }),
    // 13 — Pull-quote on focus
    s({
      id: 'cm-quote',
      name: 'Quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal">Focus is about saying no to the hundred other good ideas.</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Steve Jobs</span><span class="cite-role">on what to leave out</span></div>
</div>`,
    }),
    // 14 — Risks / watch-items
    s({
      id: 'cm-risks',
      name: 'Risks',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">What we're watching</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:14px">Risks, with eyes open.</h2>
  <table class="table reveal">
    <thead><tr><th>Watch item</th><th>Likelihood</th><th>What we'll do</th></tr></thead>
    <tbody>
      <tr><td>Self-serve users churn loudly</td><td>Medium</td><td>Clear comms, graceful 90-day off-ramp</td></tr>
      <tr><td>Pricing reset stalls a renewal</td><td>Medium</td><td>Grandfather top accounts, hold the line</td></tr>
      <tr><td>Lighthouse slips</td><td>Low</td><td>Weekly checkpoint, named exec sponsor</td></tr>
      <tr><td>Team misses the old breadth</td><td>Low</td><td>Name the trade-off out loud, often</td></tr>
    </tbody>
  </table>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">03 · The plan</span></div>
</div>`,
    }),
    // 15 — Section divider
    s({
      id: 'cm-sec-ask',
      name: 'Section · The ask',
      transition: 'fade',
      bodyHtml: `<div class="mark">
  <div class="mark-num reveal">03 — Decisions</div>
  <div class="mark-title reveal">What we need<br/>from you.</div>
  <div class="mark-rule reveal"></div>
</div>`,
    }),
    // 16 — The ask / decisions needed
    s({
      id: 'cm-ask',
      name: 'The ask',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker lockup reveal">The ask</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:18px">Three decisions, today.</h2>
  <div class="two-col reveal" style="--col-gap:96px;align-items:start">
    <ol class="steps" style="--gap:30px">
      <li class="step"><span>Approve sunsetting <b>self-serve</b> and redeploying the team.</span></li>
      <li class="step"><span>Approve the <b>pricing reset</b> and renewal playbook.</span></li>
      <li class="step"><span>Endorse <b>one lighthouse</b> as the quarter's marquee proof.</span></li>
    </ol>
    <div class="aside" style="margin-top:8px">
      <div class="aside-k">If we say yes</div>
      <div class="aside-t">Net team focus on the core rises ~30% with no new headcount — by Monday.</div>
    </div>
  </div>
  <div class="runner"><span class="runner-brand">Northwind</span><span class="runner-label">Decisions</span></div>
</div>`,
    }),
    // 17 — Closing / CTA
    s({
      id: 'cm-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker lockup reveal">Next step</div>
  <h2 class="display reveal" style="--display-size:128px">Let's get to work.</h2>
  <p class="lead reveal">Decisions logged this week · first checkpoint Friday.</p>
</div>`,
    }),
  ],
}
