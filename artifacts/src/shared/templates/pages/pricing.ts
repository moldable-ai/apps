import type { Template } from '../types'

// A polished, light-mode SaaS pricing page with one confident indigo accent.
// Header with a real monthly/annual toggle (JS swaps prices with a count + fade),
// three plan cards (Pro elevated + "Most popular"), a full feature-comparison
// table, a trust/logos strip, and an FAQ accordion. Pure CSS/SVG — no images,
// no chart libs. Every figure uses tabular numerals.

const CSS = `
:root {
  --bg: #fbfbfd;
  --surface: #ffffff;
  --ink: #14151a;
  --ink-2: #41444f;
  --mut: #6c7080;
  --faint: #9aa0b0;
  --line: #ececf2;
  --line-2: #e2e3ec;
  --accent: #4f46e5;       /* indigo */
  --accent-2: #6d63ff;
  --accent-ink: #ffffff;
  --accent-wash: #eef0ff;
  --accent-edge: #d9dbff;
  --pos: #0f9d6e;
  --shadow: 0 1px 2px rgba(20,21,26,0.04), 0 12px 32px -16px rgba(20,21,26,0.18);
  --shadow-pop: 0 2px 6px rgba(79,70,229,0.10), 0 30px 60px -28px rgba(79,70,229,0.45);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --r: 20px;
}
body { background:
  radial-gradient(900px 480px at 84% -8%, rgba(109,99,255,0.10), transparent 62%),
  radial-gradient(720px 420px at 6% 4%, rgba(79,70,229,0.06), transparent 60%),
  var(--bg);
  color: var(--ink); font-family: var(--body); }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1140px; margin: 0 auto; padding: clamp(40px, 6vw, 88px) clamp(18px, 4vw, 40px) 96px; }
a { color: inherit; }
:focus-visible { outline: 2.5px solid var(--accent); outline-offset: 3px; border-radius: 10px; }

/* ---------- Header ---------- */
.head { text-align: center; max-width: 720px; margin: 0 auto; }
.kicker { display: inline-flex; align-items: center; gap: 9px; font-size: 12.5px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent);
  background: var(--accent-wash); border: 1px solid var(--accent-edge);
  padding: 7px 14px; border-radius: 999px; }
.kicker .pip { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px rgba(79,70,229,0.14); }
.head h1 { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 6.2vw, 60px);
  line-height: 1.02; letter-spacing: -0.03em; margin: 22px 0 0; text-wrap: balance; }
.head h1 em { font-style: normal; color: var(--accent); }
.head p { color: var(--mut); font-size: clamp(15.5px, 2vw, 18px); line-height: 1.6; margin: 16px auto 0; max-width: 560px; }

/* ---------- Billing toggle ---------- */
.billing { display: inline-flex; align-items: center; gap: 16px; margin: 30px auto 0; }
.billing .lab { font-size: 14.5px; font-weight: 600; color: var(--mut); transition: color .25s; cursor: pointer; }
.billing .lab.on { color: var(--ink); }
.switch { position: relative; width: 60px; height: 32px; border: 0; padding: 0; cursor: pointer;
  border-radius: 999px; background: #d7d9e4; transition: background .35s cubic-bezier(.22,1,.36,1); }
.switch[aria-checked="true"] { background: var(--accent); }
.switch .knob { position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 6px rgba(20,21,26,0.28);
  transition: transform .35s cubic-bezier(.22,1,.36,1); }
.switch[aria-checked="true"] .knob { transform: translateX(28px); }
.save { font-size: 12.5px; font-weight: 700; color: var(--pos); background: rgba(15,157,110,0.10);
  border: 1px solid rgba(15,157,110,0.20); padding: 5px 11px; border-radius: 999px;
  opacity: 0; transform: translateY(-3px); transition: opacity .3s, transform .3s; pointer-events: none; }
.save.show { opacity: 1; transform: none; }

/* ---------- Plan cards ---------- */
.plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: clamp(40px, 6vw, 64px); align-items: start; }
.plan { position: relative; background: var(--surface); border: 1px solid var(--line-2); border-radius: 24px;
  padding: 30px 28px 28px; box-shadow: var(--shadow); display: flex; flex-direction: column; }
.plan.pop { border-color: transparent; box-shadow: var(--shadow-pop);
  background: linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(135deg, var(--accent), var(--accent-2)) border-box;
  border: 1.5px solid transparent; transform: translateY(-10px); z-index: 2; }
.badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); white-space: nowrap;
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent-ink); background: linear-gradient(135deg, var(--accent), var(--accent-2));
  padding: 7px 15px; border-radius: 999px; box-shadow: 0 8px 20px -8px var(--accent); }
.plan .pname { font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; }
.plan .who { color: var(--mut); font-size: 13.5px; margin-top: 5px; min-height: 38px; line-height: 1.45; }
.price { display: flex; align-items: baseline; gap: 4px; margin: 20px 0 2px; }
.price .cur { font-family: var(--display); font-weight: 600; font-size: 26px; color: var(--ink); transform: translateY(-14px); }
.price .amt { font-family: var(--display); font-weight: 600; font-size: clamp(46px, 6vw, 56px); line-height: 1;
  letter-spacing: -0.035em; color: var(--ink); }
.price .per { color: var(--mut); font-size: 14px; font-weight: 500; align-self: flex-end; margin-bottom: 9px; }
.price .amt.flip { animation: flip .4s cubic-bezier(.22,1,.36,1); }
@keyframes flip { 0% { opacity: 0; transform: translateY(7px); } 100% { opacity: 1; transform: none; } }
.billed { font-size: 12.5px; color: var(--faint); min-height: 17px; }
.cta { margin: 22px 0 24px; display: block; width: 100%; text-align: center; text-decoration: none;
  font-weight: 700; font-size: 14.5px; padding: 13px 18px; border-radius: 13px; cursor: pointer; border: 1px solid var(--line-2);
  background: #fff; color: var(--ink); transition: transform .15s, box-shadow .25s, background .2s, border-color .2s; }
.cta:hover { transform: translateY(-2px); border-color: var(--accent-edge); background: var(--accent-wash); color: var(--accent); }
.cta.primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: var(--accent-ink); border-color: transparent;
  box-shadow: 0 12px 26px -12px var(--accent); }
.cta.primary:hover { transform: translateY(-2px); box-shadow: 0 18px 34px -12px var(--accent); color: var(--accent-ink); background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
.flabel { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--faint); margin-bottom: 13px; }
.feats { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.feats li { display: flex; align-items: flex-start; gap: 11px; font-size: 14px; color: var(--ink-2); line-height: 1.4; }
.feats li svg { flex: none; margin-top: 1px; }
.feats li .ck { color: var(--accent); }
.feats li.off { color: var(--faint); }
.feats li.off .ck { color: var(--faint); opacity: 0.5; }
.feats li b { color: var(--ink); font-weight: 700; font-variant-numeric: tabular-nums; }

/* ---------- Comparison table ---------- */
.cmp { margin-top: clamp(64px, 9vw, 110px); }
.sec-head { text-align: center; max-width: 600px; margin: 0 auto clamp(28px, 4vw, 44px); }
.sec-head h2 { font-family: var(--display); font-weight: 600; font-size: clamp(26px, 4vw, 38px); letter-spacing: -0.025em; margin: 0; }
.sec-head p { color: var(--mut); font-size: 15.5px; line-height: 1.55; margin: 12px 0 0; }
.tbl-card { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--r); box-shadow: var(--shadow); overflow: hidden; }
.cmp table { width: 100%; border-collapse: collapse; }
.cmp th, .cmp td { text-align: center; padding: 16px 14px; font-size: 14px; }
.cmp thead th { position: sticky; top: 0; background: var(--surface); z-index: 1; border-bottom: 1px solid var(--line-2); }
.cmp thead .pn { font-family: var(--display); font-weight: 600; font-size: 16px; letter-spacing: -0.01em; }
.cmp thead .pn small { display: block; font-family: var(--body); font-weight: 600; font-size: 12px; color: var(--mut); margin-top: 3px; letter-spacing: 0; text-transform: none; }
.cmp thead th.col-pop { color: var(--accent); }
.cmp thead th.col-pop .pn small { color: var(--accent); opacity: 0.8; }
.cmp tbody th { text-align: left; font-weight: 600; color: var(--ink); padding-left: 24px; }
.cmp td.col-pop { background: linear-gradient(var(--accent-wash), var(--accent-wash)); }
.cmp tbody tr:not(:last-child) th, .cmp tbody tr:not(:last-child) td { border-bottom: 1px solid var(--line); }
.cmp .grp th { background: #f5f6fb; font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mut); padding: 11px 24px; }
.cmp td .yes { display: inline-flex; color: var(--accent); }
.cmp td.col-pop .yes { color: var(--accent); }
.cmp td .no { color: var(--faint); font-weight: 600; }
.cmp td .val { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }

/* ---------- Trust strip ---------- */
.trust { margin-top: clamp(56px, 8vw, 96px); text-align: center; }
.trust .cap { font-size: 12.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
.logos { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: clamp(28px, 5vw, 56px); margin-top: 24px; opacity: 0.78; }
.logos .lg { display: inline-flex; align-items: center; gap: 9px; color: var(--ink-2); font-weight: 700; font-size: 17px; letter-spacing: -0.01em; }
.logos .lg svg { color: var(--accent); flex: none; }
.metrics { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(18px, 4vw, 40px); margin-top: 36px; }
.metric { text-align: center; }
.metric .n { font-family: var(--display); font-weight: 600; font-size: clamp(26px, 4vw, 34px); letter-spacing: -0.02em; }
.metric .l { color: var(--mut); font-size: 13px; margin-top: 2px; }

/* ---------- FAQ ---------- */
.faq { margin-top: clamp(64px, 9vw, 110px); max-width: 780px; margin-left: auto; margin-right: auto; }
.acc { background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--r); box-shadow: var(--shadow); overflow: hidden; }
.q { border: 0; border-top: 1px solid var(--line); background: transparent; width: 100%; text-align: left; cursor: pointer;
  display: flex; align-items: center; gap: 16px; padding: 20px 24px; font: inherit; color: var(--ink); }
.q:first-child { border-top: 0; }
.q .qt { font-weight: 600; font-size: 16px; flex: 1; }
.q .ic { flex: none; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: var(--accent-wash); color: var(--accent); transition: transform .35s cubic-bezier(.22,1,.36,1), background .25s; }
.q[aria-expanded="true"] .ic { transform: rotate(45deg); background: var(--accent); color: #fff; }
.a { overflow: hidden; max-height: 0; transition: max-height .4s cubic-bezier(.22,1,.36,1); }
.a-inner { padding: 0 24px 22px 24px; color: var(--ink-2); font-size: 14.5px; line-height: 1.65; }

/* ---------- Final CTA ---------- */
.final { margin-top: clamp(64px, 9vw, 104px); position: relative; overflow: hidden; border-radius: 28px;
  padding: clamp(40px, 6vw, 64px) clamp(24px, 5vw, 56px); text-align: center; color: #fff;
  background: linear-gradient(135deg, #2a249a 0%, var(--accent) 48%, var(--accent-2) 100%); box-shadow: var(--shadow-pop); }
.final::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(600px 300px at 16% -20%, rgba(255,255,255,0.22), transparent 60%); }
.final h2 { font-family: var(--display); font-weight: 600; font-size: clamp(26px, 4vw, 40px); letter-spacing: -0.025em; margin: 0; position: relative; }
.final p { color: rgba(255,255,255,0.85); font-size: 16px; line-height: 1.55; margin: 14px auto 0; max-width: 480px; position: relative; }
.final .acts { display: inline-flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 28px; position: relative; }
.final .b1 { background: #fff; color: var(--accent); font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 13px; text-decoration: none; transition: transform .15s; }
.final .b1:hover { transform: translateY(-2px); }
.final .b2 { background: rgba(255,255,255,0.12); color: #fff; font-weight: 700; font-size: 15px; padding: 14px 26px; border-radius: 13px; text-decoration: none; border: 1px solid rgba(255,255,255,0.3); transition: background .2s; }
.final .b2:hover { background: rgba(255,255,255,0.2); }

/* ---------- Reveal ---------- */
.reveal .plan { transition: transform .7s cubic-bezier(.22,1,.36,1), opacity .7s; }

@media (max-width: 940px) {
  .plans { grid-template-columns: 1fr; max-width: 440px; margin-left: auto; margin-right: auto; gap: 26px; }
  .plan.pop { transform: none; order: -1; }
  .plan .who { min-height: 0; }
}
@media (max-width: 820px) {
  .cmp .tbl-card { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .cmp table { min-width: 600px; }
}
@media (max-width: 560px) {
  .billing { gap: 11px; flex-wrap: wrap; }
  .billing .lab { font-size: 13.5px; }
  .q { padding: 17px 18px; }
  .q .qt { font-size: 15px; }
  .a-inner { padding: 0 18px 20px 18px; }
}
`.trim()

const HTML = `
<div class="wrap">

  <header class="head reveal" data-reveal="none">
    <span class="kicker"><span class="pip"></span> Pricing</span>
    <h1>Simple, <em>honest</em> pricing</h1>
    <p>One flat platform price — no per-seat surprises, no setup fees. Start free, upgrade when your team is ready. Cancel anytime.</p>

    <div class="billing" role="group" aria-label="Billing period">
      <span class="lab on" id="lab-m">Monthly</span>
      <button class="switch" id="billing-switch" role="switch" aria-checked="false" aria-label="Toggle annual billing"><span class="knob"></span></button>
      <span class="lab" id="lab-a">Annual</span>
      <span class="save" id="save-hint">Save 20%</span>
    </div>
  </header>

  <section class="plans reveal" aria-label="Plans">
    <!-- Starter -->
    <div class="plan">
      <div class="pname">Starter</div>
      <div class="who">For side projects and solo builders shipping their first product.</div>
      <div class="price"><span class="cur">$</span><span class="amt num" data-m="0" data-a="0">0</span><span class="per">/mo</span></div>
      <div class="billed">Free forever — no card required</div>
      <a class="cta" href="#" tabindex="0">Get started</a>
      <div class="flabel">Includes</div>
      <ul class="feats">
        <li><span class="ck">CHK</span> Up to <b>3</b> projects</li>
        <li><span class="ck">CHK</span> <b>1,000</b> events / month</li>
        <li><span class="ck">CHK</span> Community support</li>
        <li><span class="ck">CHK</span> <b>7-day</b> data history</li>
        <li class="off"><span class="ck">CHK</span> No team roles</li>
      </ul>
    </div>

    <!-- Pro (popular) -->
    <div class="plan pop">
      <span class="badge">Most popular</span>
      <div class="pname">Pro</div>
      <div class="who">For growing teams who need collaboration, history, and real support.</div>
      <div class="price"><span class="cur">$</span><span class="amt num" data-m="29" data-a="23">29</span><span class="per">/mo</span></div>
      <div class="billed" data-billed>Billed monthly per workspace</div>
      <a class="cta primary" href="#" tabindex="0">Start 14-day trial</a>
      <div class="flabel">Everything in Starter, plus</div>
      <ul class="feats">
        <li><span class="ck">CHK</span> <b>Unlimited</b> projects</li>
        <li><span class="ck">CHK</span> <b>250,000</b> events / month</li>
        <li><span class="ck">CHK</span> Up to <b>10</b> teammates</li>
        <li><span class="ck">CHK</span> <b>12-month</b> data history</li>
        <li><span class="ck">CHK</span> Priority email support</li>
      </ul>
    </div>

    <!-- Scale -->
    <div class="plan">
      <div class="pname">Scale</div>
      <div class="who">For larger orgs with security, SSO, and volume requirements.</div>
      <div class="price"><span class="cur">$</span><span class="amt num" data-m="89" data-a="71">89</span><span class="per">/mo</span></div>
      <div class="billed" data-billed>Billed monthly per workspace</div>
      <a class="cta" href="#" tabindex="0">Talk to sales</a>
      <div class="flabel">Everything in Pro, plus</div>
      <ul class="feats">
        <li><span class="ck">CHK</span> <b>Unlimited</b> events</li>
        <li><span class="ck">CHK</span> <b>Unlimited</b> teammates</li>
        <li><span class="ck">CHK</span> SSO &amp; SAML</li>
        <li><span class="ck">CHK</span> <b>99.99%</b> uptime SLA</li>
        <li><span class="ck">CHK</span> Dedicated success manager</li>
      </ul>
    </div>
  </section>

  <!-- Comparison -->
  <section class="cmp">
    <div class="sec-head reveal">
      <h2>Compare every plan</h2>
      <p>The full breakdown — pick the row that matters most to your team.</p>
    </div>
    <div class="tbl-card reveal">
      <table>
        <thead>
          <tr>
            <th></th>
            <th><span class="pn">Starter<small>Free</small></span></th>
            <th class="col-pop"><span class="pn">Pro<small>Most popular</small></span></th>
            <th><span class="pn">Scale<small>Advanced</small></span></th>
          </tr>
        </thead>
        <tbody>
          <tr class="grp"><th colspan="4">Usage</th></tr>
          <tr><th>Projects</th><td><span class="val num">3</span></td><td class="col-pop"><span class="val">Unlimited</span></td><td><span class="val">Unlimited</span></td></tr>
          <tr><th>Events / month</th><td><span class="val num">1,000</span></td><td class="col-pop"><span class="val num">250,000</span></td><td><span class="val">Unlimited</span></td></tr>
          <tr><th>Data history</th><td><span class="val num">7 days</span></td><td class="col-pop"><span class="val num">12 months</span></td><td><span class="val">Unlimited</span></td></tr>
          <tr><th>Team members</th><td><span class="val num">1</span></td><td class="col-pop"><span class="val num">10</span></td><td><span class="val">Unlimited</span></td></tr>

          <tr class="grp"><th colspan="4">Collaboration</th></tr>
          <tr><th>Shared dashboards</th><td><span class="no">–</span></td><td class="col-pop"><span class="yes">YES</span></td><td><span class="yes">YES</span></td></tr>
          <tr><th>Roles &amp; permissions</th><td><span class="no">–</span></td><td class="col-pop"><span class="yes">YES</span></td><td><span class="yes">YES</span></td></tr>
          <tr><th>Audit log</th><td><span class="no">–</span></td><td class="col-pop"><span class="no">–</span></td><td><span class="yes">YES</span></td></tr>

          <tr class="grp"><th colspan="4">Security &amp; support</th></tr>
          <tr><th>SSO &amp; SAML</th><td><span class="no">–</span></td><td class="col-pop"><span class="no">–</span></td><td><span class="yes">YES</span></td></tr>
          <tr><th>Uptime SLA</th><td><span class="no">–</span></td><td class="col-pop"><span class="val num">99.9%</span></td><td><span class="val num">99.99%</span></td></tr>
          <tr><th>Support</th><td><span class="val">Community</span></td><td class="col-pop"><span class="val">Priority</span></td><td><span class="val">Dedicated</span></td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Trust -->
  <section class="trust reveal">
    <div class="cap">Trusted by 4,000+ product teams</div>
    <div class="logos">
      <span class="lg">LOGO_NOVA Nova</span>
      <span class="lg">LOGO_DRIFT Driftline</span>
      <span class="lg">LOGO_HEX Hexel</span>
      <span class="lg">LOGO_ARC Arcadia</span>
      <span class="lg">LOGO_LUMEN Lumen</span>
    </div>
    <div class="metrics">
      <div class="metric"><div class="n num">4,200+</div><div class="l">teams onboard</div></div>
      <div class="metric"><div class="n num">99.99%</div><div class="l">uptime in 2025</div></div>
      <div class="metric"><div class="n num">4.9/5</div><div class="l">average rating</div></div>
      <div class="metric"><div class="n num">&lt;2h</div><div class="l">median support reply</div></div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq">
    <div class="sec-head reveal">
      <h2>Questions, answered</h2>
      <p>Everything you might want to know before you pick a plan.</p>
    </div>
    <div class="acc reveal" id="faq">
      <button class="q" aria-expanded="true">
        <span class="qt">Can I switch plans or cancel anytime?</span><span class="ic">PLUS</span>
      </button>
      <div class="a"><div class="a-inner">Yes. Upgrade, downgrade, or cancel from your billing settings whenever you like. Changes are prorated to the day, so you only ever pay for what you use — no lock-in, no cancellation fees.</div></div>

      <button class="q" aria-expanded="false">
        <span class="qt">How does the annual discount work?</span><span class="ic">PLUS</span>
      </button>
      <div class="a"><div class="a-inner">Switching to annual billing saves you 20% versus paying month to month. You&rsquo;re charged once per year and the lower effective monthly rate is locked in for the term.</div></div>

      <button class="q" aria-expanded="false">
        <span class="qt">What counts as an event?</span><span class="ic">PLUS</span>
      </button>
      <div class="a"><div class="a-inner">An event is any tracked action your product sends us — a page view, a button click, a server-side log line. Identify calls and metadata never count toward your limit, and you&rsquo;ll get an alert well before you hit it.</div></div>

      <button class="q" aria-expanded="false">
        <span class="qt">Do you offer a discount for startups or nonprofits?</span><span class="ic">PLUS</span>
      </button>
      <div class="a"><div class="a-inner">We do. Early-stage startups, students, and registered nonprofits get 50% off Pro for the first year. Reach out from your dashboard with a short note about what you&rsquo;re building and we&rsquo;ll set you up.</div></div>

      <button class="q" aria-expanded="false">
        <span class="qt">Is there a free trial of Pro?</span><span class="ic">PLUS</span>
      </button>
      <div class="a"><div class="a-inner">Every workspace gets a full 14-day Pro trial — all features, no credit card. When it ends you&rsquo;ll drop back to Starter automatically unless you choose to upgrade. Nothing is ever charged without your say-so.</div></div>
    </div>
  </section>

  <!-- Final CTA -->
  <section class="final reveal" data-reveal="scale">
    <h2>Ready to ship faster?</h2>
    <p>Join thousands of teams who replaced their spreadsheet with a single source of truth. Free to start, takes two minutes.</p>
    <div class="acts">
      <a class="b1" href="#">Start for free</a>
      <a class="b2" href="#">Book a demo</a>
    </div>
  </section>

</div>
`.trim()

const JS = `
(function () {
  var CHK = '<svg class="ck" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.12"/>' +
    '<path d="M7.5 12.4l3 3 6-6.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var YES = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M5 12.5l4 4 10-10.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PLUS = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';

  // Swap text placeholders for real inline SVGs (keeps the HTML string clean).
  document.querySelectorAll('.ck').forEach(function (el) { if (el.textContent.trim() === 'CHK') el.innerHTML = CHK; });
  document.querySelectorAll('.cmp .yes').forEach(function (el) { if (el.textContent.trim() === 'YES') el.innerHTML = YES; });
  document.querySelectorAll('.q .ic').forEach(function (el) { if (el.textContent.trim() === 'PLUS') el.innerHTML = PLUS; });

  // Brand glyphs for the logo strip — each prefix maps to a small mark.
  var marks = {
    LOGO_NOVA: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z" fill="currentColor"/></svg>',
    LOGO_DRIFT: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 16c5-1 6-9 16-10-2 7-6 12-16 10z" fill="currentColor"/></svg>',
    LOGO_HEX: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l8.7 5v10L12 22l-8.7-5V7z" fill="currentColor"/></svg>',
    LOGO_ARC: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 19a9 9 0 0118 0" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="19" r="2.2" fill="currentColor"/></svg>',
    LOGO_LUMEN: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g></svg>'
  };
  document.querySelectorAll('.logos .lg').forEach(function (el) {
    var t = el.textContent.trim();
    var key = t.split(' ')[0];
    if (marks[key]) el.innerHTML = marks[key] + ' ' + t.slice(key.length).trim();
  });

  // ---- Billing toggle with a quick count + flip animation ----
  var sw = document.getElementById('billing-switch');
  var labM = document.getElementById('lab-m');
  var labA = document.getElementById('lab-a');
  var hint = document.getElementById('save-hint');
  var amts = Array.prototype.slice.call(document.querySelectorAll('.amt'));
  var annual = false;

  function tween(el, to) {
    var from = parseInt(el.textContent.replace(/[^0-9]/g, ''), 10) || 0;
    if (from === to) { el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); return; }
    var start = performance.now(), dur = 420;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = to;
    }
    requestAnimationFrame(step);
  }

  function apply() {
    sw.setAttribute('aria-checked', annual ? 'true' : 'false');
    labM.classList.toggle('on', !annual);
    labA.classList.toggle('on', annual);
    hint.classList.toggle('show', annual);
    amts.forEach(function (el) {
      var to = parseInt(el.getAttribute(annual ? 'data-a' : 'data-m'), 10) || 0;
      tween(el, to);
    });
    document.querySelectorAll('[data-billed]').forEach(function (el) {
      el.textContent = annual ? 'Billed annually per workspace' : 'Billed monthly per workspace';
    });
  }

  function toggle() { annual = !annual; apply(); }
  sw.addEventListener('click', toggle);
  labM.addEventListener('click', function () { if (annual) toggle(); });
  labA.addEventListener('click', function () { if (!annual) toggle(); });

  // ---- FAQ accordion ----
  var faq = document.getElementById('faq');
  function setOpen(btn, open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var panel = btn.nextElementSibling;
    panel.style.maxHeight = open ? (panel.scrollHeight + 'px') : '0px';
  }
  faq.querySelectorAll('.q').forEach(function (btn) {
    // init: open the first one
    setOpen(btn, btn.getAttribute('aria-expanded') === 'true');
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      faq.querySelectorAll('.q').forEach(function (b) { if (b !== btn) setOpen(b, false); });
      setOpen(btn, !isOpen);
    });
  });
  // keep an open panel sized correctly on resize
  window.addEventListener('resize', function () {
    faq.querySelectorAll('.q[aria-expanded="true"]').forEach(function (b) {
      b.nextElementSibling.style.maxHeight = b.nextElementSibling.scrollHeight + 'px';
    });
  });
})();
`.trim()

export const pricing: Template = {
  id: 'pricing',
  kind: 'page',
  name: 'Pricing',
  tagline: 'A polished SaaS pricing & plans page',
  categories: ['Marketing'],
  audiences: ['saas', 'marketing', 'startup'],
  description:
    'A clean, light-mode SaaS pricing page built around one confident indigo accent: a header with a real monthly↔annual toggle that counts the prices up/down, three plan cards (Pro elevated and badged "Most popular"), a full feature-comparison table, a trust/logos strip with headline metrics, and a smooth FAQ accordion. Every figure is tabular, every visual is hand-rolled CSS/SVG — fully self-contained and responsive down to 380px.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    ],
  },
  stageBg: '#fbfbfd',
  notes:
    'Light SaaS pricing page. PALETTE KNOBS (in :root): --accent / --accent-2 are the indigo gradient — recolor both to rebrand; --accent-wash / --accent-edge are the soft tints behind chips, the popular column, and the FAQ icons. --bg/--surface/--ink/--mut/--line drive the neutral chrome. PRICES: each `.amt` carries data-m (monthly) and data-a (annual, already the 20%-off number) — edit both, and update the "Save 20%" hint (#save-hint) and the FAQ copy if the discount changes. The middle `.plan.pop` is the highlighted tier; move the `pop` class and `Most popular` badge to a different card to feature another plan, and match the `col-pop` cells in the comparison table. Plan features are plain `<li>` items — add `class="off"` for an excluded/greyed line. The comparison table uses CHK/YES/PLUS/LOGO_* text placeholders that JS swaps for inline SVGs; keep those tokens if you add rows. FAQ items are `<button class="q">` + sibling `.a` pairs; the first is open by default (aria-expanded="true").',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#fbfbfd',
  },
}
