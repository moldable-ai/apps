import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/competitive-battlecard-cover.jpg'

export const competitiveBattlecard: Template = {
  id: 'competitive-battlecard',
  categories: ['Sales'],
  name: 'Competitive Battlecard',
  tagline: 'Sharp, decisive head-to-head battlecards',
  audiences: ['sales', 'enablement', 'account-executive', 'b2b'],
  description:
    'A sharp ink-on-white sales-enablement battlecard set with red/green decisioning. Vs-columns, ✓/✕ feature grids, objection-and-response cards, win/loss chips, and landmine callouts arm reps to win competitive deals — tailor the competitor, claims, and proof.',
  fonts: {
    display: 'Archivo',
    body: 'Inter',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#0f172a',
    '--muted': '#64748b',
    '--accent': '#dc2626',
    '--accent-2': '#0f172a',
    '--display': "'Archivo', sans-serif",
    '--body': "'Inter', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '800',
    '--title-size': '128px',
    '--headline-size': '74px',
    '--section-size': '150px',
    '--lead-size': '36px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--card-bg': '#ffffff',
    '--card-border': '#e2e8f0',
    '--card-shadow': '0 18px 44px -30px rgba(15,23,42,0.26)',
    '--radius': '14px',
    '--stat-size': '108px',
    '--metric-size': '118px',
    '--th-border': '#0f172a',
    '--table-border': '#e6eaf0',
    '--table-size': '29px',
    '--track': '#eef1f6',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -45px rgba(15,23,42,0.42)',
    '--media-radius': '16px',
    '--scrim':
      'linear-gradient(180deg, rgba(8,12,22,0.12) 0%, rgba(8,12,22,0.44) 52%, rgba(8,12,22,0.9) 100%)',
    '--pos': '#16a34a',
    '--neg': '#dc2626',
    '--bullet-color': '#dc2626',
    '--bullet-radius': '3px',
  },
  stageBg: '#eef1f6',
  assets: ['competitive-battlecard-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }
.tag { color: var(--accent); }

/* Section divider — hard ink slab with a single red slash */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 16px; background: var(--text); }
.divider .divider-num { font-family: var(--mono); font-weight: 600; letter-spacing: 0.16em; font-size: 24px; color: var(--accent); }
.divider .divider-title { font-family: var(--display); font-weight: 800; font-size: 152px; line-height: 0.92; letter-spacing: -0.03em; color: #fff; text-transform: uppercase; }
.divider .divider-rule { width: 150px; height: 8px; background: var(--accent); margin-top: 18px; }
.divider .divider-sub { font-family: var(--body); font-size: 32px; color: #94a3b8; margin-top: 12px; max-width: 30ch; }

/* VS-COLUMNS — us vs them head-to-head */
.vs { display: grid; grid-template-columns: 1fr 96px 1fr; align-items: stretch; gap: 0; }
.vs-col { border: 2px solid var(--card-border); border-radius: 16px; padding: 40px 40px 44px; display: flex; flex-direction: column; gap: 22px; }
.vs-col.us { border-color: var(--text); background: #fbfcfe; box-shadow: var(--card-shadow); }
.vs-col.them { border-style: dashed; }
.vs-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.vs-name { font-family: var(--display); font-weight: 800; font-size: 42px; letter-spacing: -0.02em; color: var(--text); }
.vs-tag { font-family: var(--mono); font-size: 19px; letter-spacing: 0.12em; text-transform: uppercase; padding: 7px 14px; border-radius: 999px; }
.vs-tag.win { color: var(--pos); background: rgba(22,163,74,0.1); }
.vs-tag.risk { color: var(--accent); background: rgba(220,38,38,0.09); }
.vs-row { display: flex; gap: 16px; align-items: flex-start; font-family: var(--body); font-size: 27px; line-height: 1.34; color: var(--text); }
.vs-row::before { content: ''; flex: 0 0 auto; width: 11px; height: 11px; margin-top: 0.5em; border-radius: 3px; }
.us .vs-row::before { background: var(--pos); }
.them .vs-row::before { background: #cbd5e1; }
.them .vs-row { color: var(--muted); }
.vs-mid { display: grid; place-items: center; }
.vs-badge { font-family: var(--display); font-weight: 800; font-size: 34px; color: #fff; background: var(--accent); width: 80px; height: 80px; border-radius: 50%; display: grid; place-items: center; box-shadow: 0 14px 30px -12px rgba(220,38,38,0.6); }

/* ✓ / ✕ comparison cells */
.tick { font-family: var(--body); font-weight: 800; font-size: 34px; color: var(--pos); }
.cross { font-family: var(--body); font-weight: 800; font-size: 32px; color: #cbd5e1; }
.partial { font-family: var(--mono); font-weight: 600; font-size: 22px; color: #d4a017; letter-spacing: 0.04em; }
.col-us { background: rgba(15,23,42,0.04); }
.col-us-th { color: var(--text); }

/* OBJECTION -> RESPONSE cards */
.obj { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 34px 36px 38px; box-shadow: var(--card-shadow); display: flex; flex-direction: column; gap: 18px; }
.obj-q { display: flex; gap: 16px; align-items: flex-start; }
.obj-q .obj-mark { font-family: var(--display); font-weight: 800; font-size: 30px; color: var(--accent); flex: 0 0 auto; line-height: 1; margin-top: 2px; }
.obj-q .obj-text { font-family: var(--display); font-weight: 600; font-size: 31px; line-height: 1.16; color: var(--text); }
.obj-sep { height: 1px; background: var(--card-border); }
.obj-a { display: flex; gap: 16px; align-items: flex-start; }
.obj-a .obj-mark { font-family: var(--display); font-weight: 800; font-size: 30px; color: var(--pos); flex: 0 0 auto; line-height: 1; margin-top: 2px; }
.obj-a .obj-text { font-family: var(--body); font-size: 25px; line-height: 1.42; color: var(--muted); }
.obj-a .obj-text b { color: var(--text); font-weight: 700; }

/* WIN / LOSS reason chips */
.chips { display: flex; flex-wrap: wrap; gap: 16px; }
.chip { display: inline-flex; align-items: center; gap: 12px; font-family: var(--body); font-weight: 600; font-size: 27px; padding: 14px 24px; border-radius: 999px; border: 1.5px solid var(--card-border); color: var(--text); }
.chip::before { content: ''; width: 13px; height: 13px; border-radius: 50%; flex: 0 0 auto; }
.chip.win { border-color: rgba(22,163,74,0.4); background: rgba(22,163,74,0.06); }
.chip.win::before { background: var(--pos); }
.chip.loss { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.05); }
.chip.loss::before { background: var(--accent); }
.chip .chip-pct { font-family: var(--mono); font-weight: 600; color: var(--muted); font-size: 22px; }

/* LANDMINE warning callout */
.mine { position: relative; border: 2px solid var(--accent); background: rgba(220,38,38,0.04); border-radius: 14px; padding: 30px 34px 32px 34px; display: flex; flex-direction: column; gap: 12px; }
.mine-k { display: inline-flex; align-items: center; gap: 12px; font-family: var(--mono); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; font-size: 20px; color: var(--accent); }
.mine-k::before { content: '\\26A0'; font-size: 26px; -webkit-text-fill-color: var(--accent); }
.mine-t { font-family: var(--display); font-weight: 700; font-size: 32px; line-height: 1.12; color: var(--text); }
.mine-d { font-family: var(--body); font-size: 25px; line-height: 1.4; color: var(--muted); }
.mine-d b { color: var(--text); font-weight: 700; }

/* Cheat-sheet quick-reference grid */
.cheat { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px 40px; }
.cheat-cell { border-left: 4px solid var(--accent); padding: 6px 0 6px 26px; }
.cheat-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 9px; }
.cheat-v { font-family: var(--body); font-size: 27px; line-height: 1.32; color: var(--text); }
.cheat-v b { font-weight: 700; }

.lede { font-family: var(--display); font-weight: 700; font-size: 58px; line-height: 1.08; letter-spacing: -0.02em; color: var(--text); max-width: 20ch; }`,
  notes:
    'A complete competitive sales-enablement battlecard set: Archivo display + Inter body + IBM Plex Mono eyebrows, ink #0f172a on white, red #dc2626 as the decisive accent with green #16a34a for "where we win". Sharp and confrontational, never decorative. Open and close on the high-contrast diagonal cover (assets/competitive-battlecard-cover.jpg); break acts with hard ink .divider slabs. Signature pieces: .vs vs-columns (.us vs .them) for head-to-head positioning, ✓/✕ tables (.tick/.cross/.partial + .col-us) for feature and pricing comparison, .obj objection→response cards, .chip win/loss reason chips, .mine "landmine" warning callouts to plant doubt, and a .cheat quick-reference grid. Use .steps for discovery questions, .checks for walk-away signals, .bars + .quote for proof. Keep claims specific and defensible — a rep should be able to read a card aloud in a live deal.',
  sampleSlides: [
    s({
      id: 'cb-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Competitive Battlecard · Sales Enablement</div>
    <h1 class="display reveal" style="--display-size:140px;text-transform:uppercase;margin-top:8px">Helix<br/>vs. Vault.</h1>
    <p class="lead reveal">How to win the cloud-storage deal when the buyer is also talking to Vaultline.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cb-landscape',
      name: 'The competitive landscape',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The matchup</div>
      <p class="lede" style="margin-top:16px">Vaultline is cheaper on the sticker. We win on the total cost of getting your data back.</p>
    </div>
    <div>
      <ul class="bullets" style="--gap:24px">
        <li class="bullet"><span><b>Who we meet them in:</b> mid-market and enterprise migrations, 50TB+.</span></li>
        <li class="bullet"><span><b>Their wedge:</b> a low headline price and an aggressive land motion.</span></li>
        <li class="bullet"><span><b>Our edge:</b> egress-free retrieval, sub-second restore, and a real SLA.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Landscape</span></div>
</div>`,
    }),
    s({
      id: 'cb-where-we-win',
      name: 'Where we win',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Where we win</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:36px">Lead with these three, every time.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">$0</div><div class="stat-label">Egress fees on retrieval — Vaultline charges per-GB to read your own data</div></div>
    <div class="stat"><div class="stat-num">0.4s</div><div class="stat-label">Median time-to-first-byte on restore vs. their 14s cold-tier wake</div></div>
    <div class="stat"><div class="stat-num">99.99%</div><div class="stat-label">Contractual uptime SLA with credits — they publish a target, not a promise</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Where we win</span></div>
</div>`,
    }),
    s({
      id: 'cb-div1',
      name: 'Section · Head to head',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Head to head</div>
  <div class="divider-title reveal">Position<br/>the gap.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">Frame every comparison around the cost of getting data back, not the cost of putting it in.</div>
</div>`,
    }),
    s({
      id: 'cb-vs',
      name: 'Us vs. Vaultline',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Head-to-head</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Helix vs. Vaultline, side by side.</h2>
  <div class="vs reveal">
    <div class="vs-col us">
      <div class="vs-head"><span class="vs-name">Helix</span><span class="vs-tag win">Our story</span></div>
      <div class="vs-row"><span>Flat, all-in pricing — retrieval and egress included</span></div>
      <div class="vs-row"><span>Hot, warm, and cold tiers with one-API restore</span></div>
      <div class="vs-row"><span>99.99% SLA backed by service credits</span></div>
      <div class="vs-row"><span>Named migration engineer for every 50TB+ move</span></div>
    </div>
    <div class="vs-mid"><div class="vs-badge">VS</div></div>
    <div class="vs-col them">
      <div class="vs-head"><span class="vs-name">Vaultline</span><span class="vs-tag risk">The catch</span></div>
      <div class="vs-row"><span>Low storage rate, but per-GB egress + retrieval fees</span></div>
      <div class="vs-row"><span>Cold tier wakes in 12+ hours; restores get expensive</span></div>
      <div class="vs-row"><span>Published uptime target, no contractual credits</span></div>
      <div class="vs-row"><span>Self-serve migration; support is a paid add-on</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Head to head</span></div>
</div>`,
    }),
    s({
      id: 'cb-features',
      name: 'Feature comparison',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Feature comparison</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Capability for capability.</h2>
  <table class="table reveal">
    <thead><tr><th>Capability</th><th class="col-us-th" style="text-align:center">Helix</th><th style="text-align:center">Vaultline</th></tr></thead>
    <tbody>
      <tr><td>Egress-free data retrieval</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="cross">&#10007;</span></td></tr>
      <tr><td>Sub-second restore from cold tier</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="cross">&#10007;</span></td></tr>
      <tr><td>Contractual 99.99% uptime SLA</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="partial">Target only</span></td></tr>
      <tr><td>Immutable / WORM compliance lock</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="tick">&#10003;</span></td></tr>
      <tr><td>Managed migration engineer</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="partial">Paid add-on</span></td></tr>
      <tr><td>Multi-region active-active replication</td><td class="col-us" style="text-align:center"><span class="tick">&#10003;</span></td><td style="text-align:center"><span class="cross">&#10007;</span></td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Features</span></div>
</div>`,
    }),
    s({
      id: 'cb-pricing',
      name: 'Pricing comparison',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Pricing comparison</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">The sticker lies. Run the real bill.</h2>
  <table class="table reveal">
    <thead><tr><th>Line item · 100TB, 1× monthly full restore</th><th class="num col-us-th">Helix</th><th class="num">Vaultline</th></tr></thead>
    <tbody>
      <tr><td>Storage / month</td><td class="num col-us">$2,300</td><td class="num">$1,800</td></tr>
      <tr><td>Retrieval (read) fees</td><td class="num col-us">$0</td><td class="num neg">$1,400</td></tr>
      <tr><td>Egress to your apps</td><td class="num col-us">$0</td><td class="num neg">$2,100</td></tr>
      <tr><td>Premium support / SLA</td><td class="num col-us">Included</td><td class="num neg">$900</td></tr>
      <tr class="row-em"><td>True monthly cost</td><td class="num col-us pos">$2,300</td><td class="num neg">$6,200</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px"><b>Use it:</b> "Their rate is lower — until you read your own data. Let's model your actual restore pattern together."</p>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Pricing</span></div>
</div>`,
    }),
    s({
      id: 'cb-div2',
      name: 'Section · The conversation',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — The conversation</div>
  <div class="divider-title reveal">Handle<br/>the room.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">What they'll say, what you say back, and the doubts to plant before they decide.</div>
</div>`,
    }),
    s({
      id: 'cb-objections',
      name: 'Common objections & responses',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Objections &amp; responses</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">When they push back on price.</h2>
  <div class="cols-3 reveal" style="gap:26px">
    <div class="obj">
      <div class="obj-q"><span class="obj-mark">"</span><span class="obj-text">Vaultline is 30% cheaper per terabyte.</span></div>
      <div class="obj-sep"></div>
      <div class="obj-a"><span class="obj-mark">&rarr;</span><span class="obj-text">Per terabyte to <b>store</b>, yes. The moment you <b>read</b> data, egress and retrieval fees flip the bill. Let's model your restore volume.</span></div>
    </div>
    <div class="obj">
      <div class="obj-q"><span class="obj-mark">"</span><span class="obj-text">We're already deep in their ecosystem.</span></div>
      <div class="obj-sep"></div>
      <div class="obj-a"><span class="obj-mark">&rarr;</span><span class="obj-text">Our <b>managed migration</b> moves 100TB in under a week with zero downtime — and lock-in is exactly the risk you're trying to avoid.</span></div>
    </div>
    <div class="obj">
      <div class="obj-q"><span class="obj-mark">"</span><span class="obj-text">Both of you say "four nines" — what's the difference?</span></div>
      <div class="obj-sep"></div>
      <div class="obj-a"><span class="obj-mark">&rarr;</span><span class="obj-text">Theirs is a <b>marketing target</b>. Ours is in the contract with <b>service credits</b> when we miss. Ask them to put it in writing.</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Objections</span></div>
</div>`,
    }),
    s({
      id: 'cb-landmines',
      name: 'Landmines to set',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Landmines to set</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Questions that surface their weak spots.</h2>
  <div class="cols-3 reveal" style="gap:26px">
    <div class="mine">
      <div class="mine-k">Plant this</div>
      <div class="mine-t">"What's your fully-loaded cost to restore 10TB?"</div>
      <div class="mine-d">Forces Vaultline to expose <b>retrieval + egress</b> fees they bury in the addendum.</div>
    </div>
    <div class="mine">
      <div class="mine-k">Plant this</div>
      <div class="mine-t">"Is the SLA contractual, with credits?"</div>
      <div class="mine-d">Their answer is a target, not a guarantee — let the buyer hear the hedge.</div>
    </div>
    <div class="mine">
      <div class="mine-k">Plant this</div>
      <div class="mine-t">"How long to wake a cold object?"</div>
      <div class="mine-d">12+ hours. Frame it against your DR/RTO requirement — <b>that's the deal-breaker</b>.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Landmines</span></div>
</div>`,
    }),
    s({
      id: 'cb-proof',
      name: 'Proof points',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Proof points</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Switchers don't look back.</h2>
      <blockquote class="quote" style="--quote-size:48px">"We thought we were saving money on Vaultline until the first big restore. Helix cut our true bill in half."</blockquote>
      <div class="cite"><span class="cite-dot"></span><span class="cite-name">Priya Nandakumar</span><span class="cite-role">VP Infrastructure, Cartograph</span></div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:94%"><div class="bar-fill" data-val="$6.2K"></div><div class="bar-label">Vaultline true bill</div></div>
      <div class="bar" style="--h:35%"><div class="bar-fill" style="background:var(--pos)" data-val="$2.3K"></div><div class="bar-label">Helix true bill</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Proof</span></div>
</div>`,
    }),
    s({
      id: 'cb-div3',
      name: 'Section · Play',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — The play</div>
  <div class="divider-title reveal">Run<br/>the deal.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-sub reveal">The discovery questions, the disqualifiers, and the one-page cheat sheet to keep open in the call.</div>
</div>`,
    }),
    s({
      id: 'cb-discovery',
      name: 'Discovery questions',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Discovery questions</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Ask these to expose the gap.</h2>
  <ol class="steps reveal" style="--gap:22px">
    <li class="step"><span>How often do you <b>read or restore</b> archived data — and what does that cost you today?</span></li>
    <li class="step"><span>What's your <b>recovery-time objective</b> if a primary region goes down?</span></li>
    <li class="step"><span>Is your current uptime commitment <b>contractual</b>, or a published target?</span></li>
    <li class="step"><span>Who owns the <b>migration</b> if you switch — your team or theirs?</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Discovery</span></div>
</div>`,
    }),
    s({
      id: 'cb-sequence',
      name: 'The winning sequence',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The winning sequence</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Run the competitive deal in four moves.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="card"><div class="card-num">01</div><div class="card-title" style="font-size:34px">Qualify</div><div class="card-body">Confirm a real restore / DR need — that's where we win.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">02</div><div class="card-title" style="font-size:34px">Reframe</div><div class="card-body">Shift the metric from storage rate to true monthly bill.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">03</div><div class="card-title" style="font-size:34px">Plant</div><div class="card-body">Set the landmines on egress, SLA, and cold-tier wake time.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card"><div class="card-num">04</div><div class="card-title" style="font-size:34px">Prove</div><div class="card-body">Model their bill live, then close on the switcher story.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">The sequence</span></div>
</div>`,
    }),
    s({
      id: 'cb-walkaway',
      name: 'When to walk away',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">When to walk away</div>
      <h2 class="headline" style="margin-top:8px">Not every deal is ours.</h2>
      <p class="lead">Disqualify fast and protect your pipeline. If you see these signals, this is a Vaultline-shaped buyer — don't discount to chase it.</p>
    </div>
    <ul class="checks reveal" style="--gap:26px">
      <li class="check"><span>Write-once, <b>never-read</b> cold archive with no DR requirement.</span></li>
      <li class="check"><span>Under <b>10TB</b> with no growth — our value shows up at scale.</span></li>
      <li class="check"><span>Procurement scored <b>purely on storage rate</b>, restore cost ignored.</span></li>
      <li class="check"><span>Hard-committed to their ecosystem with <b>no migration budget</b>.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Walk away</span></div>
</div>`,
    }),
    s({
      id: 'cb-winloss',
      name: 'Why we win and lose',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Win / loss patterns</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">From the last 40 competitive deals.</h2>
  <div class="cols-2 reveal" style="gap:56px;align-items:start">
    <div>
      <div class="tag reveal" style="color:var(--pos);margin-bottom:18px">Why we win</div>
      <div class="chips">
        <span class="chip win">Total cost of restore <span class="chip-pct">41%</span></span>
        <span class="chip win">DR / restore speed <span class="chip-pct">27%</span></span>
        <span class="chip win">Contractual SLA <span class="chip-pct">18%</span></span>
        <span class="chip win">Migration support <span class="chip-pct">14%</span></span>
      </div>
    </div>
    <div>
      <div class="tag reveal" style="margin-bottom:18px">Why we lose</div>
      <div class="chips">
        <span class="chip loss">Lowest sticker price <span class="chip-pct">48%</span></span>
        <span class="chip loss">Incumbent lock-in <span class="chip-pct">31%</span></span>
        <span class="chip loss">No restore use case <span class="chip-pct">21%</span></span>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Win / loss</span></div>
</div>`,
    }),
    s({
      id: 'cb-cheatsheet',
      name: 'Quick-reference cheat sheet',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Quick-reference cheat sheet</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Keep this open in the call.</h2>
  <div class="cheat reveal">
    <div class="cheat-cell"><div class="cheat-k">One-liner</div><div class="cheat-v">"They're cheaper to store. We're cheaper to <b>use</b>."</div></div>
    <div class="cheat-cell"><div class="cheat-k">Lead metric</div><div class="cheat-v"><b>$0 egress</b> + 0.4s restore + 99.99% SLA.</div></div>
    <div class="cheat-cell"><div class="cheat-k">Reframe price as</div><div class="cheat-v">True monthly bill incl. <b>retrieval &amp; egress</b>, not storage rate.</div></div>
    <div class="cheat-cell"><div class="cheat-k">Set the landmine</div><div class="cheat-v">"Ask them: is your SLA <b>contractual</b>, with credits?"</div></div>
    <div class="cheat-cell"><div class="cheat-k">Best proof</div><div class="cheat-v">Cartograph cut their true bill <b>in half</b> after switching.</div></div>
    <div class="cheat-cell"><div class="cheat-k">Walk away if</div><div class="cheat-v">Write-once cold archive, &lt;10TB, no DR need.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Helix</span><span class="runner-label">Cheat sheet</span></div>
</div>`,
    }),
    s({
      id: 'cb-close',
      name: 'Closing CTA',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Go win it</div>
    <h2 class="display reveal" style="--display-size:120px;text-transform:uppercase">Sell the<br/>restore.</h2>
    <p class="lead reveal">Battlecard owner: enablement@helix.io · Updated quarterly from win/loss calls.</p>
  </div>
</div>`,
    }),
  ],
}
