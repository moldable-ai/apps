import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/pricing-proposal-cover.jpg'

export const pricingProposal: Template = {
  id: 'pricing-proposal',
  categories: ['Sales'],
  name: 'Pricing Proposal',
  tagline: 'Clean, professional client proposal & SOW',
  audiences: ['sales', 'client', 'agency', 'consulting'],
  description:
    'A calm, professional client proposal and statement of work in slate-and-teal on white. Scope in/out tables, deliverables cards, recommended-tier pricing, a milestone timeline, fine-print terms, and a signature block carry a complete proposal you tailor to the client.',
  fonts: {
    display: 'Albert Sans',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#ffffff',
    '--text': '#1e293b',
    '--muted': '#64748b',
    '--accent': '#0d9488',
    '--accent-2': '#0d9488',
    '--display': "'Albert Sans', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '700',
    '--title-size': '124px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#e2e8f0',
    '--card-shadow': '0 18px 44px -30px rgba(30,41,59,0.24)',
    '--radius': '16px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--th-border': '#334155',
    '--table-border': '#e2e8f0',
    '--track': '#e6efee',
    '--donut-hole': '#ffffff',
    '--bar-gap': '34px',
    '--media-shadow': '0 50px 110px -48px rgba(30,41,59,0.42)',
    '--media-radius': '18px',
    '--scrim':
      'linear-gradient(180deg, rgba(15,30,44,0.12) 0%, rgba(15,30,44,0.46) 55%, rgba(15,30,44,0.88) 100%)',
    '--pos': '#0d9488',
    '--neg': '#dc2626',
  },
  stageBg: '#eef2f6',
  assets: ['pricing-proposal-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label, .tl-when { color: var(--accent); }
.bar-fill { background: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }

/* Section divider — quiet slate frame on white with a teal rule */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.24em; font-size: 22px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 700; font-size: 148px; line-height: 0.96; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 124px; height: 5px; border-radius: 3px; background: var(--accent); margin-top: 14px; }
.divider-sub { font-family: var(--body); font-size: 32px; color: var(--muted); max-width: 40ch; margin-top: 6px; }

/* Scope in/out table — included rows tinted teal, excluded rows muted */
.scope .in td:first-child { box-shadow: inset 4px 0 0 var(--accent); }
.scope-tag { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 700; font-size: 24px; letter-spacing: 0.02em; }
.scope-tag.yes { color: var(--accent); }
.scope-tag.yes::before { content: '\\2713'; font-size: 0.92em; }
.scope-tag.no { color: var(--muted); }
.scope-tag.no::before { content: '\\2014'; font-size: 0.92em; }

/* Deliverables cards — accent left-rule signature */
.deliv { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 28px; }
.dcard { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 38px 34px; box-shadow: var(--card-shadow); position: relative; overflow: hidden; }
.dcard::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 5px; background: var(--accent); }
.dcard-n { font-family: var(--body); font-weight: 700; letter-spacing: 0.06em; font-size: 22px; color: var(--accent); }
.dcard-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.06; color: var(--text); margin-top: 14px; }
.dcard-d { font-family: var(--body); font-size: 24px; line-height: 1.42; color: var(--muted); margin-top: 12px; }
.dcard-meta { font-family: var(--body); font-weight: 600; font-size: 22px; color: var(--text); margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--card-border); }

/* Pricing tiers — recommended column highlighted teal */
.tier-head { font-family: var(--display); font-weight: 600; }
.tier-price { font-family: var(--display); font-weight: 700; color: var(--text); font-variant-numeric: tabular-nums; }
.col-rec { background: rgba(13,148,136,0.06); }
.rec-badge { display: inline-flex; align-items: center; padding: 6px 16px; border-radius: 999px; background: var(--accent); color: #fff; font-family: var(--body); font-weight: 700; font-size: 18px; letter-spacing: 0.08em; text-transform: uppercase; margin-left: 14px; vertical-align: middle; }

/* Terms — fine-print block */
.terms { columns: 2; column-gap: 70px; }
.term { break-inside: avoid; margin-bottom: 26px; }
.term-k { font-family: var(--display); font-weight: 600; font-size: 27px; color: var(--text); margin-bottom: 7px; }
.term-d { font-family: var(--body); font-size: 22px; line-height: 1.42; color: var(--muted); }

/* Signature block */
.signblock { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; }
.sign { border-top: 2px solid var(--text); padding-top: 22px; }
.sign-line { height: 64px; border-bottom: 1.5px solid var(--card-border); margin-bottom: 18px; }
.sign-name { font-family: var(--display); font-weight: 600; font-size: 32px; color: var(--text); }
.sign-role { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 4px; }
.sign-meta { font-family: var(--body); font-size: 22px; color: var(--muted); margin-top: 10px; }

/* Quiet callout for the headline understanding */
.callout { border-left: 5px solid var(--accent); background: rgba(13,148,136,0.05); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.callout-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }`,
  notes:
    'A complete client proposal / statement of work: Albert Sans display + Inter body, slate #1e293b ink on white, ONE teal (#0d9488) accent, generous whitespace, no gradients. Open and close on the calm slate-and-teal abstract full-bleed (assets/pricing-proposal-cover.jpg). Signature pieces: the .scope in/out table (included rows carry a teal left-rule + .scope-tag chips), .deliv deliverables cards (accent left-rule), the pricing .table with a recommended column highlighted via .col-rec and a .rec-badge, a .timeline of milestones, the two-column .terms fine-print block, and the .signblock signature lines. Use .flow for the phased approach, .stats for team & roles, .checks + .quote for why-us, .callout for the headline understanding. Professional and trustworthy, never flashy — keep figures tabular and the language client-ready.',
  sampleSlides: [
    s({
      id: 'pp-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Proposal &amp; Statement of Work · Prepared for Northwind Group</div>
    <h1 class="display reveal" style="--display-size:130px;margin-top:8px">A partnership<br/>built to deliver.</h1>
    <p class="lead reveal">Brand &amp; digital platform engagement · Presented by Meridian Studio · June 2026</p>
  </div>
</div>`,
    }),
    s({
      id: 'pp-understanding',
      name: 'Our understanding',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Our understanding of your goals</div>
      <h2 class="headline" style="margin-top:8px">You're ready to scale, and the platform needs to keep up.</h2>
      <div class="callout" style="margin-top:28px">
        <div class="callout-k">What we heard</div>
        <p class="body" style="max-width:none">Northwind wants a <b>refreshed brand</b> and a <b>faster digital platform</b> live before the Q4 launch — without disrupting the team mid-flight.</p>
      </div>
    </div>
    <ul class="bullets" style="--gap:26px">
      <li class="bullet"><span>Your <b>brand</b> no longer reflects where the company is headed.</span></li>
      <li class="bullet"><span>The current site is <b>slow to update</b> and hard for the team to own.</span></li>
      <li class="bullet"><span>You need a partner who can <b>move with you</b>, not hand off and disappear.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Understanding</span></div>
</div>`,
    }),
    s({
      id: 'pp-div1',
      name: 'Section · Approach',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Approach</div>
  <div class="divider-title reveal">How we'll<br/>work together.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">A clear method, a defined scope, and the deliverables you'll own at the end.</p>
</div>`,
    }),
    s({
      id: 'pp-approach',
      name: 'Recommended approach',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Recommended approach</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Four phases, one continuous engagement.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="dcard"><div class="dcard-n">PHASE 01</div><div class="dcard-t">Discover</div><div class="dcard-d">Stakeholder interviews, audit, and a shared definition of success.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="dcard"><div class="dcard-n">PHASE 02</div><div class="dcard-t">Design</div><div class="dcard-d">Brand system and platform UX, reviewed in weekly working sessions.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="dcard"><div class="dcard-n">PHASE 03</div><div class="dcard-t">Build</div><div class="dcard-d">Production-grade implementation with QA against agreed criteria.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="dcard"><div class="dcard-n">PHASE 04</div><div class="dcard-t">Launch</div><div class="dcard-d">Go-live, handover, and a 30-day stabilization window.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Approach</span></div>
</div>`,
    }),
    s({
      id: 'pp-scope',
      name: 'Scope of work',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Scope of work</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">What's included — and what's not.</h2>
  <table class="table scope reveal">
    <thead><tr><th>Work item</th><th>Included</th><th>Notes</th></tr></thead>
    <tbody>
      <tr class="in"><td>Brand identity &amp; visual system</td><td><span class="scope-tag yes">In scope</span></td><td class="muted">Logo refinement, palette, type, usage</td></tr>
      <tr class="in"><td>Marketing website (up to 12 pages)</td><td><span class="scope-tag yes">In scope</span></td><td class="muted">Design, build, CMS, QA</td></tr>
      <tr class="in"><td>Content management training</td><td><span class="scope-tag yes">In scope</span></td><td class="muted">Two sessions, recorded</td></tr>
      <tr><td>Ongoing content writing</td><td><span class="scope-tag no">Not included</span></td><td class="muted">Available as a separate retainer</td></tr>
      <tr><td>Paid media &amp; ad management</td><td><span class="scope-tag no">Not included</span></td><td class="muted">Out of scope for this SOW</td></tr>
      <tr><td>Native mobile applications</td><td><span class="scope-tag no">Not included</span></td><td class="muted">Future phase, if desired</td></tr>
    </tbody>
  </table>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Scope</span></div>
</div>`,
    }),
    s({
      id: 'pp-deliverables',
      name: 'Deliverables',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Deliverables</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">What you'll own at the end.</h2>
  <div class="deliv reveal" style="--cols:3">
    <div class="dcard"><div class="dcard-n">01</div><div class="dcard-t">Brand guidelines</div><div class="dcard-d">A complete, editable identity system with logo, color, and type.</div><div class="dcard-meta">PDF + source files</div></div>
    <div class="dcard"><div class="dcard-n">02</div><div class="dcard-t">Design system</div><div class="dcard-d">A reusable component library your team can extend without us.</div><div class="dcard-meta">Figma library</div></div>
    <div class="dcard"><div class="dcard-n">03</div><div class="dcard-t">Production website</div><div class="dcard-d">A fast, accessible platform on a CMS your team can manage.</div><div class="dcard-meta">Deployed + documented</div></div>
    <div class="dcard"><div class="dcard-n">04</div><div class="dcard-t">Content playbook</div><div class="dcard-d">Voice, templates, and patterns for keeping the site current.</div><div class="dcard-meta">Living document</div></div>
    <div class="dcard"><div class="dcard-n">05</div><div class="dcard-t">Training &amp; handover</div><div class="dcard-d">Two recorded enablement sessions and a 30-day support window.</div><div class="dcard-meta">Sessions + recordings</div></div>
    <div class="dcard"><div class="dcard-n">06</div><div class="dcard-t">Launch report</div><div class="dcard-d">Baseline metrics and a recommended roadmap for the next quarter.</div><div class="dcard-meta">Summary deck</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Deliverables</span></div>
</div>`,
    }),
    s({
      id: 'pp-div2',
      name: 'Section · Plan',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Plan</div>
  <div class="divider-title reveal">The timeline<br/>and the team.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">A fourteen-week engagement with named owners and clear checkpoints.</p>
</div>`,
    }),
    s({
      id: 'pp-timeline',
      name: 'Timeline & milestones',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Timeline &amp; milestones</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Fourteen weeks to launch.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Weeks 1–2</div><div class="tl-what"><b>Discovery</b> — interviews, audit, and a signed-off success definition.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 3–6</div><div class="tl-what"><b>Brand &amp; UX design</b> — identity system and platform direction approved.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 7–11</div><div class="tl-what"><b>Build &amp; QA</b> — production implementation against agreed acceptance criteria.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 12–13</div><div class="tl-what"><b>Launch &amp; training</b> — go-live, enablement, and content handover.</div></div>
    <div class="tl-row"><div class="tl-when">Week 14</div><div class="tl-what"><b>Stabilize &amp; review</b> — 30-day support begins, launch report delivered.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Timeline</span></div>
</div>`,
    }),
    s({
      id: 'pp-team',
      name: 'Team & roles',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Team &amp; roles</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">Who you'll work with.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="subhead">Engagement lead</div><div class="body">Single point of contact, owns scope, timeline, and weekly status.</div></div>
    <div class="stat"><div class="subhead">Design director</div><div class="body">Leads brand and platform design through every review.</div></div>
    <div class="stat"><div class="subhead">Senior engineer</div><div class="body">Builds the production platform and runs QA against criteria.</div></div>
    <div class="stat"><div class="subhead">Content strategist</div><div class="body">Shapes the playbook and runs your training sessions.</div></div>
  </div>
  <p class="fine reveal" style="margin-top:30px">A dedicated four-person pod for the full engagement, with specialist support on call as needed.</p>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Team</span></div>
</div>`,
    }),
    s({
      id: 'pp-effort',
      name: 'Effort allocation',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#0d9488 0 42%, #334155 42% 70%, #94a3b8 70% 88%, #cbd5e1 88% 100%)"><div class="donut-label">42%</div></div>
    </div>
    <div>
      <div class="kicker">Where the effort goes</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Weighted toward build.</h2>
      <div class="legend" style="display:flex;flex-direction:column;gap:18px">
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px;color:var(--text)"><span style="width:18px;height:18px;border-radius:5px;background:#0d9488"></span>Build &amp; QA<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">42%</span></div>
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px;color:var(--text)"><span style="width:18px;height:18px;border-radius:5px;background:#334155"></span>Design<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">28%</span></div>
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px;color:var(--text)"><span style="width:18px;height:18px;border-radius:5px;background:#94a3b8"></span>Discovery<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">18%</span></div>
        <div class="legend-row" style="display:flex;align-items:center;gap:18px;font-family:var(--body);font-size:30px;color:var(--text)"><span style="width:18px;height:18px;border-radius:5px;background:#cbd5e1"></span>Launch &amp; support<span style="margin-left:auto;color:var(--muted);font-variant-numeric:tabular-nums">12%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Effort</span></div>
</div>`,
    }),
    s({
      id: 'pp-div3',
      name: 'Section · Investment',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">03 — Investment</div>
  <div class="divider-title reveal">What it costs,<br/>and what's fair.</div>
  <div class="divider-rule reveal"></div>
  <p class="divider-sub reveal">Three transparent tiers with a clear recommendation for Northwind.</p>
</div>`,
    }),
    s({
      id: 'pp-pricing',
      name: 'Pricing tiers',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Investment</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">Three ways to engage.</h2>
  <table class="table reveal">
    <thead><tr><th>Tier</th><th>Scope</th><th>Timeline</th><th class="num">Fixed fee</th></tr></thead>
    <tbody>
      <tr><td class="tier-head">Essential</td><td class="muted">Brand refresh + 6-page site</td><td class="muted">8 weeks</td><td class="num tier-price">$48,000</td></tr>
      <tr class="col-rec"><td class="tier-head">Partnership<span class="rec-badge">Recommended</span></td><td class="muted">Full brand + 12-page platform + training</td><td class="muted">14 weeks</td><td class="num tier-price">$96,000</td></tr>
      <tr><td class="tier-head">Enterprise</td><td class="muted">Partnership + ongoing quarterly retainer</td><td class="muted">14 weeks + retainer</td><td class="num tier-price">Custom</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Fees are fixed for the defined scope and billed 40% on kickoff, 40% at design sign-off, 20% on launch. We recommend the <b>Partnership</b> tier for Northwind's Q4 goals.</p>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Investment</span></div>
</div>`,
    }),
    s({
      id: 'pp-terms',
      name: 'Assumptions & terms',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Assumptions &amp; terms</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The fine print, in plain language.</h2>
  <div class="terms reveal">
    <div class="term"><div class="term-k">Validity</div><div class="term-d">This proposal is valid for 30 days from the date above. Pricing assumes a kickoff within that window.</div></div>
    <div class="term"><div class="term-k">Payment</div><div class="term-d">Invoiced per the schedule on the investment page. Net-15 terms. Expenses billed at cost with prior approval.</div></div>
    <div class="term"><div class="term-k">Revisions</div><div class="term-d">Two rounds of revision are included per deliverable. Additional rounds are billed at our standard hourly rate.</div></div>
    <div class="term"><div class="term-k">Client responsibilities</div><div class="term-d">Timely feedback within three business days, a named decision-maker, and access to brand and platform assets.</div></div>
    <div class="term"><div class="term-k">Change control</div><div class="term-d">Work outside this scope is documented in a written change order before it begins, with its own estimate.</div></div>
    <div class="term"><div class="term-k">Ownership &amp; IP</div><div class="term-d">All final deliverables transfer to the client on receipt of final payment. We retain the right to portfolio use.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Terms</span></div>
</div>`,
    }),
    s({
      id: 'pp-why-us',
      name: 'Why us',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Why work with us</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">A partner, not a vendor.</h2>
      <ul class="checks" style="--gap:24px">
        <li class="check"><span>Twelve years shipping <b>brand and platform</b> work for growth-stage teams.</span></li>
        <li class="check"><span>A <b>fixed fee</b> and a fixed scope — no surprises mid-engagement.</span></li>
        <li class="check"><span>We hand over a platform your team can <b>own and extend</b>, not depend on us for.</span></li>
      </ul>
    </div>
    <div>
      <blockquote class="quote" style="--quote-size:54px">"They felt like part of our team from week one — and we still run the site they built two years on."</blockquote>
      <div class="cite"><span class="cite-dot"></span><span class="cite-name">Priya Anand</span><span class="cite-role">VP Marketing, Halcyon Foods</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Why us</span></div>
</div>`,
    }),
    s({
      id: 'pp-signature',
      name: 'Next steps & signature',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Next steps &amp; acceptance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Ready when you are.</h2>
  <p class="lead reveal" style="max-width:48ch;margin-bottom:40px">Sign below to accept the Partnership tier and we'll send a kickoff calendar within one business day.</p>
  <div class="signblock reveal">
    <div class="sign"><div class="sign-line"></div><div class="sign-name">For Northwind Group</div><div class="sign-role">Authorized signatory</div><div class="sign-meta">Name · Title · Date</div></div>
    <div class="sign"><div class="sign-line"></div><div class="sign-name">For Meridian Studio</div><div class="sign-role">Jordan Reyes, Principal</div><div class="sign-meta">jordan@meridianstudio.com · Date</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Meridian Studio</span><span class="runner-label">Acceptance</span></div>
</div>`,
    }),
    s({
      id: 'pp-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Thank you</div>
    <h2 class="display reveal" style="--display-size:120px">Let's build<br/>something lasting.</h2>
    <p class="lead reveal">Jordan Reyes · jordan@meridianstudio.com · meridianstudio.com/northwind</p>
  </div>
</div>`,
    }),
  ],
}
