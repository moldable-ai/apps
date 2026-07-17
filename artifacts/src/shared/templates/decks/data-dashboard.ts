import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER = 'assets/data-dashboard-cover.jpg'

const RUNTIME_JS = `
(function () {
  var revenue = {
    '6m': { total: '$1.84M', insight: 'Expansion supplied 63% of MRR growth.', values: [54,62,70,78,88,97], labels: ['$1.38M','$1.49M','$1.58M','$1.66M','$1.73M','$1.84M'] },
    '12m': { total: '$1.84M', insight: 'MRR grew 58% across the trailing year.', values: [34,47,64,76,91,97], labels: ['$1.16M','$1.31M','$1.48M','$1.61M','$1.78M','$1.84M'] },
    plan: { total: '104%', insight: 'May closed four points above operating plan.', values: [82,86,89,93,98,104], labels: ['82%','86%','89%','93%','98%','104%'] }
  };

  function renderRevenue(root, key) {
    var data = revenue[key] || revenue['6m'];
    var bars = root.querySelectorAll('[data-revenue-bar]');
    bars.forEach(function (bar, index) {
      var value = data.values[index % data.values.length];
      var label = data.labels[index % data.labels.length];
      bar.style.setProperty('--h', value + '%');
      var fill = bar.querySelector('.bar-fill');
      if (fill) fill.setAttribute('data-val', label);
    });
    var total = root.querySelector('[data-revenue-total]');
    var insight = root.querySelector('[data-revenue-insight]');
    if (total) total.textContent = data.total;
    if (insight) insight.textContent = data.insight;
    root.querySelectorAll('[data-revenue-period]').forEach(function (button) {
      button.classList.toggle('on', button.getAttribute('data-revenue-period') === key);
    });
  }

  function renderScenario(root) {
    var leads = Number(root.querySelector('[name="leads"]')?.value || 1800);
    var conversion = Number(root.querySelector('[name="conversion"]')?.value || 7.5);
    var arpa = Number(root.querySelector('[name="arpa"]')?.value || 420);
    var customers = leads * conversion / 100;
    var newMrr = customers * arpa;
    var payback = customers > 0 ? 120000 / customers / arpa : 0;
    var set = function (name, value) {
      var el = root.querySelector('[data-output="' + name + '"]');
      if (el) el.textContent = value;
    };
    set('leads', leads.toLocaleString('en-US'));
    set('conversion', conversion.toFixed(1) + '%');
    set('arpa', '$' + arpa.toLocaleString('en-US'));
    set('customers', Math.round(customers).toLocaleString('en-US'));
    set('mrr', '$' + Math.round(newMrr).toLocaleString('en-US'));
    set('payback', payback.toFixed(1) + ' mo');
  }

  document.addEventListener('click', function (event) {
    var period = event.target.closest('[data-revenue-period]');
    if (period) {
      renderRevenue(period.closest('.slide'), period.getAttribute('data-revenue-period'));
      return;
    }
    var sort = event.target.closest('[data-sort-column]');
    if (sort) {
      var table = sort.closest('table');
      var body = table && table.querySelector('tbody');
      if (!body) return;
      var column = Number(sort.getAttribute('data-sort-column'));
      var direction = sort.getAttribute('data-direction') === 'desc' ? 'asc' : 'desc';
      sort.setAttribute('data-direction', direction);
      var rows = Array.prototype.slice.call(body.rows);
      rows.sort(function (a, b) {
        var av = parseFloat((a.cells[column]?.textContent || '').replace(/[^0-9.-]/g, '')) || 0;
        var bv = parseFloat((b.cells[column]?.textContent || '').replace(/[^0-9.-]/g, '')) || 0;
        return direction === 'asc' ? av - bv : bv - av;
      });
      rows.forEach(function (row) { body.appendChild(row); });
    }
  });

  document.addEventListener('input', function (event) {
    var lab = event.target.closest('[data-scenario-lab]');
    if (lab) renderScenario(lab.closest('.slide'));
  });

  function init() {
    document.querySelectorAll('[data-revenue-chart]').forEach(function (root) {
      if (!root.dataset.ready) { root.dataset.ready = '1'; renderRevenue(root.closest('.slide'), '6m'); }
    });
    document.querySelectorAll('[data-scenario-lab]').forEach(function (root) { renderScenario(root.closest('.slide')); });
  }
  document.addEventListener('deck:slidechange', init);
  document.addEventListener('deck:slidepatch', init);
  init();
})();
`.trim()

export const dataDashboard: Template = {
  id: 'data-dashboard',
  kind: 'deck',
  categories: ['Decks'],
  name: 'Data Dashboard',
  tagline: 'Dark, instrument-panel metrics review',
  audiences: ['product', 'growth', 'analytics', 'leadership'],
  description:
    'An analytic dark "instrument panel" deck on deep slate, with a grotesk-and-mono type pairing, cyan and lime data accents, KPI tiles with delta chips, dense tabular tables, and restyled donut and bar charts. A complete monthly product-metrics review you retune with your own numbers.',
  fonts: {
    display: 'Space Grotesk',
    body: 'Space Grotesk',
    mono: 'IBM Plex Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    ],
  },
  tokens: {
    '--bg': '#0b1220',
    '--text': '#e8eef7',
    '--muted': '#8294ad',
    '--accent': '#22d3ee',
    '--accent-2': '#a3e635',
    '--display': "'Space Grotesk', sans-serif",
    '--body': "'Space Grotesk', sans-serif",
    '--mono': "'IBM Plex Mono', monospace",
    '--display-weight': '600',
    '--title-size': '120px',
    '--display-size': '150px',
    '--headline-size': '74px',
    '--subhead-size': '46px',
    '--lead-size': '36px',
    '--bullet-size': '34px',
    '--kicker-font': "'IBM Plex Mono', monospace",
    '--kicker-tracking': '0.26em',
    '--kicker-size': '21px',
    '--card-bg': 'rgba(255,255,255,0.035)',
    '--card-border': 'rgba(140,170,210,0.16)',
    '--radius': '14px',
    '--stat-size': '104px',
    '--metric-size': '118px',
    '--th-border': 'rgba(140,170,210,0.4)',
    '--table-border': 'rgba(140,170,210,0.12)',
    '--table-size': '28px',
    '--rule-color': 'rgba(140,170,210,0.16)',
    '--track': 'rgba(140,170,210,0.14)',
    '--donut-hole': '#0b1220',
    '--bullet-color': '#22d3ee',
    '--chip-bg': 'rgba(34,211,238,0.1)',
    '--media-border': '1px solid rgba(140,170,210,0.18)',
    '--media-shadow': '0 60px 120px -45px rgba(0,0,0,0.85)',
    '--scrim':
      'linear-gradient(180deg, rgba(11,18,32,0.30) 0%, rgba(11,18,32,0.55) 48%, rgba(11,18,32,0.96) 100%)',
    '--pos': '#a3e635',
    '--neg': '#fb7185',
  },
  stageBg: '#070c16',
  assets: ['data-dashboard-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.tag { color: var(--accent); }
.runner-brand::before { border-radius: 3px; background: var(--accent); }

/* ---- Hairline instrument grid behind content slides ---- */
.grid-bg { position: absolute; inset: 0; background-image:
    linear-gradient(rgba(140,170,210,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(140,170,210,0.05) 1px, transparent 1px);
  background-size: 96px 96px; pointer-events: none; }

/* ---- Lede line (mono-flavoured intro) ---- */
.lede { font-family: var(--display); font-weight: 600; font-size: 60px; line-height: 1.1; letter-spacing: -0.02em; color: var(--text); max-width: 20ch; }

/* ---- KPI tiles with delta chips ---- */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
.kpi { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 36px 34px; display: flex; flex-direction: column; gap: 12px; }
.kpi-label { font-family: var(--mono); font-size: 20px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.kpi-val { font-family: var(--display); font-weight: 600; font-size: 78px; line-height: 1; letter-spacing: -0.03em; color: var(--text); font-variant-numeric: tabular-nums; }
.delta { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-weight: 600; font-size: 23px; }
.delta.up { color: var(--accent-2); }
.delta.down { color: var(--neg); }
.delta.flat { color: var(--muted); }
.delta.up::before { content: '\\25B2'; font-size: 14px; }
.delta.down::before { content: '\\25BC'; font-size: 14px; }
.delta.flat::before { content: '\\2192'; font-size: 16px; }

/* ---- Legend row with colored dots ---- */
.legend { display: flex; flex-direction: column; gap: 22px; }
.legend-row { display: flex; align-items: center; gap: 18px; font-family: var(--body); font-size: 30px; color: var(--text); }
.legend-dot { width: 16px; height: 16px; border-radius: 4px; flex: 0 0 auto; }
.legend-row .v { margin-left: auto; font-family: var(--mono); font-variant-numeric: tabular-nums; color: var(--muted); }

/* ---- Data callouts (anomalies / risks) ---- */
.callout { border-left: 3px solid var(--accent); background: rgba(34,211,238,0.07); padding: 30px 36px; border-radius: 0 12px 12px 0; }
.callout.warn { border-color: var(--accent-2); background: rgba(163,230,53,0.07); }
.callout.crit { border-color: var(--neg); background: rgba(251,113,133,0.08); }
.callout-k { font-family: var(--mono); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; font-size: 19px; color: var(--accent); margin-bottom: 10px; }
.callout.warn .callout-k { color: var(--accent-2); }
.callout.crit .callout-k { color: var(--neg); }
.callout-t { font-family: var(--display); font-weight: 600; font-size: 34px; color: var(--text); }
.callout-d { font-family: var(--body); font-size: 25px; color: var(--muted); line-height: 1.4; margin-top: 6px; }

/* ---- Status pills for tables ---- */
.status { display: inline-flex; align-items: center; gap: 10px; font-family: var(--mono); font-weight: 500; font-size: 23px; }
.status::before { content: ''; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); }
.status.ok::before { background: var(--accent-2); }
.status.watch::before { background: #f5b942; }
.status.bad::before { background: var(--neg); }

/* ---- Spark bars (tiny inline trend) ---- */
.spark { display: inline-flex; align-items: flex-end; gap: 4px; height: 34px; }
.spark i { width: 8px; background: var(--accent); border-radius: 2px 2px 0 0; display: block; opacity: 0.85; }

/* ---- Section divider treatment ---- */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--mono); font-weight: 600; letter-spacing: 0.18em; font-size: 24px; color: var(--accent); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.96; letter-spacing: -0.03em; color: var(--text); }
.divider-rule { width: 120px; height: 3px; background: var(--accent); margin-top: 10px; }
.divider-meta { font-family: var(--mono); font-size: 24px; color: var(--muted); margin-top: 8px; }

/* ---- Funnel flow steps ---- */
.flow-step .stage { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 14px; padding: 30px 28px; text-align: center; }
.stage-val { font-family: var(--display); font-weight: 600; font-size: 60px; line-height: 1; letter-spacing: -0.02em; color: var(--accent); font-variant-numeric: tabular-nums; }
.stage-t { font-family: var(--body); font-size: 25px; color: var(--text); margin-top: 12px; }
.stage-pct { font-family: var(--mono); font-size: 20px; color: var(--muted); margin-top: 4px; }
.flow-arrow::after { border-color: var(--accent); }

/* ---- Live controls (the deck runtime owns these interactions) ---- */
.control-row { display: flex; gap: 10px; align-items: center; margin-bottom: 24px; }
.control-row button { appearance: none; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--muted); font: 600 20px var(--mono); padding: 10px 18px; border-radius: 999px; cursor: pointer; }
.control-row button.on, .control-row button:hover { color: #071018; background: var(--accent); border-color: var(--accent); }
.live-total { margin-left: auto; font: 600 32px var(--display); color: var(--text); }
.sort-button { appearance: none; border: 0; background: transparent; color: inherit; font: inherit; text-transform: inherit; letter-spacing: inherit; cursor: pointer; }
.sort-button::after { content: ' ↕'; color: var(--accent); }
.scenario-lab { display: grid; grid-template-columns: 1.15fr .85fr; gap: 52px; align-items: stretch; }
.scenario-controls, .scenario-output { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 36px 40px; }
.range-row { display: grid; grid-template-columns: 180px 1fr 110px; gap: 22px; align-items: center; padding: 20px 0; border-bottom: 1px solid var(--card-border); }
.range-row:last-child { border-bottom: 0; }
.range-row label { font: 500 24px var(--body); color: var(--text); }
.range-row output { text-align: right; font: 600 24px var(--mono); color: var(--accent); }
.range-row input { width: 100%; accent-color: var(--accent); cursor: ew-resize; }
.scenario-output { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.scenario-metric { padding: 24px; border: 1px solid var(--card-border); border-radius: 14px; }
.scenario-metric b { display: block; font: 600 48px var(--display); color: var(--accent); font-variant-numeric: tabular-nums; }
.scenario-metric span { display: block; margin-top: 8px; font: 500 18px var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: .1em; }

/* ---- Agenda rows ---- */
.ag { display: flex; gap: 24px; align-items: baseline; padding: 22px 0; border-top: 1px solid var(--card-border); }
.ag-n { font-family: var(--mono); font-weight: 600; font-size: 28px; color: var(--accent); flex: 0 0 auto; }
.ag-t { font-family: var(--display); font-weight: 600; font-size: 38px; color: var(--text); }
.ag-d { font-family: var(--body); font-size: 24px; color: var(--muted); margin-top: 3px; }

/* ---- Phone reflow: scale bespoke decoration calibrated for the 1920px stage ---- */
@media (max-width: 640px) {
  html.deck-can-flow .lede { font-size: min(36px, 10vw) !important; line-height: 1.1 !important; max-width: 100% !important; }
  html.deck-can-flow .kpi-grid { grid-template-columns: 1fr 1fr !important; gap: 14px !important; }
  html.deck-can-flow .kpi { padding: 24px 20px !important; }
  html.deck-can-flow .kpi-val { font-size: min(44px, 12vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .legend-row { flex-wrap: wrap; gap: 6px 14px; }
  html.deck-can-flow .legend-row .v { margin-left: 0; flex-basis: 100%; padding-left: 30px; }
  html.deck-can-flow .callout { padding: 24px 22px !important; }
  html.deck-can-flow .callout-t { font-size: min(30px, 8vw) !important; line-height: 1.1 !important; }
  html.deck-can-flow .divider { padding: 56px 28px !important; }
  html.deck-can-flow .divider-title { font-size: min(51px, 14vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .flow-step .stage { padding: 24px 20px !important; }
  html.deck-can-flow .stage-val { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .ag-t { font-size: min(30px, 8vw) !important; line-height: 1.1 !important; }
  html.deck-can-flow .control-row { flex-wrap: wrap; }
  html.deck-can-flow .live-total { margin-left: 0; flex-basis: 100%; }
  html.deck-can-flow .scenario-lab { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .scenario-controls, html.deck-can-flow .scenario-output { padding: 22px 18px !important; }
  html.deck-can-flow .range-row { grid-template-columns: 1fr !important; gap: 8px !important; }
  html.deck-can-flow .range-row output { text-align: left; }
  html.deck-can-flow .scenario-metric b { font-size: 34px !important; }
}`,
  runtime: {
    libs: [],
    js: RUNTIME_JS,
    connectOrigins: [],
    frameOrigins: [],
  },
  notes:
    'A complete monthly product-metrics review for a fictional analytics product. It includes working runtime examples: a period-filtered revenue chart, sortable cohort columns, a live growth-scenario calculator, and click-build content. Preserve data-deck-interactive around controls, use delegated listeners in runtime.js, and keep authored behavior scoped to the current slide. Dark slate "instrument panel": Space Grotesk display + IBM Plex Mono eyebrows, ONE cyan accent with lime (.accent-2) as the positive/secondary data color, fuchsia (.neg) for declines.',
  sampleSlides: [
    s({
      id: 'dd-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Monthly Metrics Review · May 2026</div>
    <h1 class="display reveal" style="--display-size:138px;margin-top:10px">The numbers,<br/>read closely.</h1>
    <p class="lead reveal">Halo Analytics · Product &amp; Growth</p>
  </div>
</div>`,
    }),
    s({
      id: 'dd-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">On the panel today</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">What the dashboard says.</h2>
  <div class="cols-2 reveal" style="gap:0 90px">
    <div class="ag"><div class="ag-n">01</div><div><div class="ag-t">Headline KPIs</div><div class="ag-d">The month at a glance</div></div></div>
    <div class="ag"><div class="ag-n">04</div><div><div class="ag-t">Engagement</div><div class="ag-d">Depth, frequency, stickiness</div></div></div>
    <div class="ag"><div class="ag-n">02</div><div><div class="ag-t">Growth</div><div class="ag-d">Revenue, users, retention, funnel</div></div></div>
    <div class="ag"><div class="ag-n">05</div><div><div class="ag-t">Health</div><div class="ag-d">Reliability, segments, anomalies</div></div></div>
    <div class="ag"><div class="ag-n">03</div><div><div class="ag-t">Cohorts</div><div class="ag-d">How each month is aging</div></div></div>
    <div class="ag"><div class="ag-n">06</div><div><div class="ag-t">Next focus</div><div class="ag-d">Where we point the team</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Metrics Review · May 2026</span></div>
</div>`,
    }),
    s({
      id: 'dd-kpis',
      name: 'Executive KPI summary',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Headline KPIs</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The month at a glance.</h2>
  <div class="kpi-grid reveal">
    <div class="kpi"><div class="kpi-label">MRR</div><div class="kpi-val">$1.84M</div><div class="delta up">+6.2% MoM</div></div>
    <div class="kpi"><div class="kpi-label">Active accounts</div><div class="kpi-val">14,820</div><div class="delta up">+4.1% MoM</div></div>
    <div class="kpi"><div class="kpi-label">Net retention</div><div class="kpi-val">114%</div><div class="delta up">+2 pts</div></div>
    <div class="kpi"><div class="kpi-label">Gross churn</div><div class="kpi-val">2.1%</div><div class="delta down">+0.3 pts</div></div>
  </div>
  <div class="kpi-grid reveal" style="margin-top:22px">
    <div class="kpi"><div class="kpi-label">Activation rate</div><div class="kpi-val">41%</div><div class="delta up">+3 pts</div></div>
    <div class="kpi"><div class="kpi-label">DAU / MAU</div><div class="kpi-val">38%</div><div class="delta flat">flat</div></div>
    <div class="kpi"><div class="kpi-label">P95 latency</div><div class="kpi-val">214ms</div><div class="delta up">−18ms</div></div>
    <div class="kpi"><div class="kpi-label">Uptime</div><div class="kpi-val">99.94%</div><div class="delta down">−0.03 pts</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Headline KPIs</span></div>
</div>`,
    }),
    s({
      id: 'dd-summary',
      name: 'Read of the month',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">The read</div>
      <p class="lede" style="margin-top:16px">Healthy top-line growth, with one churn signal worth watching.</p>
    </div>
    <div>
      <ul class="bullets" style="--gap:24px">
        <li class="bullet"><span><b>MRR up 6.2%</b> — expansion outran a slightly heavier churn month.</span></li>
        <li class="bullet"><span><b>Activation crossed 41%</b> as the new onboarding flow rolled to 100%.</span></li>
        <li class="bullet"><span><b>Watch item:</b> gross churn ticked up in the self-serve tier — see anomalies.</span></li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">The read</span></div>
</div>`,
    }),
    s({
      id: 'dd-sec-growth',
      name: 'Section · Growth',
      transition: 'fade',
      bodyHtml: `<div class="grid-bg"></div>
<div class="divider">
  <div class="divider-num reveal">01 — Growth</div>
  <div class="divider-title reveal">Revenue,<br/>users, funnel.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-meta reveal">MRR · active accounts · retention · activation</div>
</div>`,
    }),
    s({
      id: 'dd-revenue',
      name: 'Revenue trend',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Recurring revenue</div>
      <h2 class="headline" style="margin-top:8px">Six months of compounding MRR.</h2>
      <div class="callout" style="margin-top:26px">
        <div class="callout-k">Signal</div>
        <div class="callout-t">Expansion is the engine.</div>
        <div class="callout-d">Net-new from existing accounts was <b>63%</b> of MRR growth this month.</div>
      </div>
    </div>
    <div data-revenue-chart data-deck-interactive>
      <div class="control-row"><button class="on" data-revenue-period="6m">6 months</button><button data-revenue-period="12m">12 months</button><button data-revenue-period="plan">vs plan</button><span class="live-total" data-revenue-total>$1.84M</span></div>
      <div class="bars" style="--bars-height:330px;--bar-gap:26px">
        <div class="bar" data-revenue-bar style="--h:54%"><div class="bar-fill" data-val="$1.38M"></div><div class="bar-label">Dec</div></div>
        <div class="bar" data-revenue-bar style="--h:62%"><div class="bar-fill" data-val="$1.49M"></div><div class="bar-label">Jan</div></div>
        <div class="bar" data-revenue-bar style="--h:70%"><div class="bar-fill" data-val="$1.58M"></div><div class="bar-label">Feb</div></div>
        <div class="bar" data-revenue-bar style="--h:78%"><div class="bar-fill" data-val="$1.66M"></div><div class="bar-label">Mar</div></div>
        <div class="bar" data-revenue-bar style="--h:88%"><div class="bar-fill" data-val="$1.73M"></div><div class="bar-label">Apr</div></div>
        <div class="bar" data-revenue-bar style="--h:97%"><div class="bar-fill" data-val="$1.84M" style="background:var(--accent-2)"></div><div class="bar-label">May</div></div>
      </div>
      <p class="fine" data-revenue-insight style="margin-top:18px">Expansion supplied 63% of MRR growth.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Growth · Revenue</span></div>
</div>`,
    }),
    s({
      id: 'dd-retention',
      name: 'Users & retention',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="two-col reveal" style="--col-gap:110px;align-items:center">
    <div style="display:grid;place-items:center">
      <div class="donut" style="--donut-size:340px;background:conic-gradient(#22d3ee 0 68%, #a3e635 68% 86%, rgba(140,170,210,0.22) 86% 100%)"><div class="donut-label">68%</div></div>
    </div>
    <div>
      <div class="kicker">12-month retention</div>
      <h2 class="headline" style="margin-top:8px;margin-bottom:24px">Most accounts stay and grow.</h2>
      <div class="legend">
        <div class="legend-row"><span class="legend-dot" style="background:#22d3ee"></span>Retained &amp; expanded<span class="v">68%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#a3e635"></span>Retained, flat<span class="v">18%</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:rgba(140,170,210,0.5)"></span>Churned<span class="v">14%</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Growth · Retention</span></div>
</div>`,
    }),
    s({
      id: 'dd-funnel',
      name: 'Activation funnel',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Activation funnel</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">From signup to activated.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="stage"><div class="stage-val">100%</div><div class="stage-t">Signed up</div><div class="stage-pct">8,400 this month</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="stage"><div class="stage-val">74%</div><div class="stage-t">Onboarded</div><div class="stage-pct">−26% drop</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="stage"><div class="stage-val">58%</div><div class="stage-t">First report</div><div class="stage-pct">−16% drop</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="stage"><div class="stage-val">41%</div><div class="stage-t">Activated</div><div class="stage-pct">+3 pts MoM</div></div></div>
  </div>
  <div class="callout warn reveal" style="margin-top:36px">
    <div class="callout-k">Biggest leak</div>
    <div class="callout-d" style="color:var(--text)">The signup-to-onboarded step still loses a quarter of new accounts — the next onboarding test targets it directly.</div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Growth · Funnel</span></div>
</div>`,
    }),
    s({
      id: 'dd-cohorts',
      name: 'Cohort retention',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Cohort retention</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:8px">How each month is aging.</h2>
  <table class="table reveal" style="margin-top:8px">
    <thead><tr><th>Signup cohort</th><th class="num"><button class="sort-button" data-sort-column="1">M1</button></th><th class="num"><button class="sort-button" data-sort-column="2">M3</button></th><th class="num"><button class="sort-button" data-sort-column="3">M6</button></th><th class="num"><button class="sort-button" data-sort-column="4">M12</button></th><th>Trend</th></tr></thead>
    <tbody>
      <tr><td>Dec 2025</td><td class="num">88%</td><td class="num">79%</td><td class="num">71%</td><td class="num">66%</td><td><span class="spark"><i style="height:60%"></i><i style="height:78%"></i><i style="height:70%"></i><i style="height:66%"></i></span></td></tr>
      <tr><td>Jan 2026</td><td class="num">90%</td><td class="num">82%</td><td class="num">74%</td><td class="num pos">—</td><td><span class="spark"><i style="height:64%"></i><i style="height:82%"></i><i style="height:74%"></i><i style="height:74%"></i></span></td></tr>
      <tr><td>Feb 2026</td><td class="num">91%</td><td class="num">84%</td><td class="num pos">77%</td><td class="num">—</td><td><span class="spark"><i style="height:66%"></i><i style="height:84%"></i><i style="height:77%"></i><i style="height:77%"></i></span></td></tr>
      <tr class="row-em"><td>Mar 2026</td><td class="num">93%</td><td class="num pos">86%</td><td class="num">—</td><td class="num">—</td><td><span class="spark"><i style="height:70%;background:var(--accent-2)"></i><i style="height:86%;background:var(--accent-2)"></i><i style="height:86%;background:var(--accent-2)"></i><i style="height:86%;background:var(--accent-2)"></i></span></td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">Newer cohorts retain better at every checkpoint — the onboarding change is compounding.</p>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Growth · Cohorts</span></div>
</div>`,
    }),
    s({
      id: 'dd-engagement',
      name: 'Engagement',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Engagement</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Depth, not just logins.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">38%</div><div class="stat-label">DAU / MAU stickiness</div></div>
    <div class="stat"><div class="stat-num">5.2</div><div class="stat-label">Reports per active week</div></div>
    <div class="stat"><div class="stat-num">12.4k</div><div class="stat-label">Dashboards shared</div></div>
    <div class="stat"><div class="stat-num">+27%</div><div class="stat-label">API calls MoM</div></div>
  </div>
  <div class="callout reveal" style="margin-top:40px">
    <div class="callout-k">Leading indicator</div>
    <div class="callout-d" style="color:var(--text)">Accounts that share a dashboard in week one retain <b>1.9×</b> better at six months — sharing is now an activation goal.</div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Engagement</span></div>
</div>`,
    }),
    s({
      id: 'dd-quote',
      name: 'Pull-quote',
      transition: 'zoom',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad center">
  <div class="kicker reveal">From the field</div>
  <blockquote class="quote reveal" style="margin-top:14px;max-width:26ch">"The dashboards finally tell us where to look before the week falls apart."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Dana Okafor</span><span class="cite-role">VP Operations, Meridian Logistics</span></div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Voice of customer</span></div>
</div>`,
    }),
    s({
      id: 'dd-sec-health',
      name: 'Section · Health',
      transition: 'fade',
      bodyHtml: `<div class="grid-bg"></div>
<div class="divider">
  <div class="divider-num reveal">02 — Health</div>
  <div class="divider-title reveal">Reliability,<br/>segments, risk.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-meta reveal">uptime · latency · regions · anomalies</div>
</div>`,
    }),
    s({
      id: 'dd-reliability',
      name: 'Reliability & performance',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Reliability &amp; performance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:8px">The platform held up.</h2>
  <table class="table reveal" style="margin-top:8px">
    <thead><tr><th>Service</th><th class="num">Uptime</th><th class="num">P95</th><th class="num">Error rate</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>API gateway</td><td class="num">99.97%</td><td class="num">142ms</td><td class="num">0.04%</td><td><span class="status ok">Healthy</span></td></tr>
      <tr><td>Query engine</td><td class="num">99.94%</td><td class="num">214ms</td><td class="num">0.11%</td><td><span class="status ok">Healthy</span></td></tr>
      <tr><td>Ingestion pipeline</td><td class="num">99.81%</td><td class="num">388ms</td><td class="num neg">0.42%</td><td><span class="status watch">Watch</span></td></tr>
      <tr><td>Exports / webhooks</td><td class="num neg">99.62%</td><td class="num">510ms</td><td class="num neg">0.71%</td><td><span class="status bad">Degraded</span></td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:24px">One four-minute ingestion incident on May 14 accounts for most of the month's lost uptime.</p>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Health · Reliability</span></div>
</div>`,
    }),
    s({
      id: 'dd-regions',
      name: 'Revenue by region',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">Revenue by region</div>
      <h2 class="headline" style="margin-top:8px">Growth is broadening.</h2>
      <div class="legend" style="margin-top:28px">
        <div class="legend-row"><span class="legend-dot" style="background:#22d3ee"></span>North America<span class="v">$1.02M</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#a3e635"></span>EMEA<span class="v">$486k</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:#5eead4"></span>APAC<span class="v">$248k</span></div>
        <div class="legend-row"><span class="legend-dot" style="background:rgba(140,170,210,0.6)"></span>LATAM<span class="v">$86k</span></div>
      </div>
    </div>
    <div class="bars" style="--bars-height:360px;--bar-gap:34px">
      <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$1.02M"></div><div class="bar-label">N. America</div></div>
      <div class="bar" style="--h:48%"><div class="bar-fill" data-val="$486k" style="background:var(--accent-2)"></div><div class="bar-label">EMEA</div></div>
      <div class="bar" style="--h:26%"><div class="bar-fill" data-val="$248k" style="background:#5eead4"></div><div class="bar-label">APAC</div></div>
      <div class="bar" style="--h:10%"><div class="bar-fill" data-val="$86k" style="background:rgba(140,170,210,0.6)"></div><div class="bar-label">LATAM</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Health · Segments</span></div>
</div>`,
    }),
    s({
      id: 'dd-anomalies',
      name: 'Anomalies & risks',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="kicker reveal">Anomalies &amp; risks</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Three things the data flagged.</h2>
  <div class="cols-3 reveal" style="gap:28px">
    <div class="callout crit"><div class="callout-k">Critical</div><div class="callout-t">Self-serve churn +0.3 pts</div><div class="callout-d">Concentrated in accounts under 5 seats. Card-failure dunning is the leading cause.</div></div>
    <div class="callout warn"><div class="callout-k">Watch</div><div class="callout-t">Ingestion lag spikes</div><div class="callout-d">P95 on the pipeline drifted up 22% late-month under peak load. Capacity review scheduled.</div></div>
    <div class="callout"><div class="callout-k">Opportunity</div><div class="callout-t">EMEA outpacing plan</div><div class="callout-d">EMEA grew 19% MoM, well ahead of plan — a case for earlier regional investment.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Health · Anomalies</span></div>
</div>`,
    }),
    s({
      id: 'dd-scenario',
      name: 'Interactive scenario lab',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="control-row reveal"><div class="kicker">Scenario lab · drag the assumptions</div><button data-deck-advance style="margin-left:auto">Reveal analysis →</button></div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">What would move June?</h2>
  <div class="scenario-lab reveal" data-scenario-lab data-deck-interactive>
    <div class="scenario-controls">
      <div class="range-row"><label for="leads">Qualified leads</label><input id="leads" name="leads" type="range" min="400" max="4000" step="50" value="1800"><output data-output="leads">1,800</output></div>
      <div class="range-row"><label for="conversion">Conversion</label><input id="conversion" name="conversion" type="range" min="2" max="18" step="0.5" value="7.5"><output data-output="conversion">7.5%</output></div>
      <div class="range-row"><label for="arpa">New ARPA</label><input id="arpa" name="arpa" type="range" min="100" max="900" step="10" value="420"><output data-output="arpa">$420</output></div>
    </div>
    <div class="scenario-output">
      <div class="scenario-metric"><b data-output="customers">135</b><span>New customers</span></div>
      <div class="scenario-metric"><b data-output="mrr">$56,700</b><span>New MRR</span></div>
      <div class="scenario-metric" data-build="1"><b data-output="payback">2.1 mo</b><span>Payback</span></div>
      <div class="scenario-metric" data-build="2"><b>+3.1%</b><span>Portfolio lift</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Interactive scenario</span></div>
</div>`,
    }),
    s({
      id: 'dd-next',
      name: 'Next focus',
      transition: 'slide',
      bodyHtml: `<div class="grid-bg"></div>
<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Where we point the team</div>
      <h2 class="headline" style="margin-top:8px">Three bets for June.</h2>
      <p class="lead" style="margin-top:18px">Each ties to a number on this dashboard — we review the same panel next month.</p>
    </div>
    <ol class="steps" style="--gap:30px">
      <li class="step"><span><b>Fix self-serve dunning</b> — recover lapsed cards before they churn.</span></li>
      <li class="step"><span><b>Attack the onboarding leak</b> — ship the activation test targeting the 26% drop.</span></li>
      <li class="step"><span><b>Harden ingestion</b> — add capacity headroom ahead of peak load.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">Halo Analytics</span><span class="runner-label">Next focus</span></div>
</div>`,
    }),
    s({
      id: 'dd-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Discussion</div>
    <h2 class="display reveal" style="--display-size:124px">Read it with us.</h2>
    <p class="lead reveal">metrics@haloanalytics.io · dashboards refresh nightly</p>
  </div>
</div>`,
    }),
  ],
}
