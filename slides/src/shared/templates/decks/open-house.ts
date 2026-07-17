import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER = 'assets/open-house-cover.jpg'
const LIVING = 'assets/open-house-living.jpg'
const KITCHEN = 'assets/open-house-kitchen.jpg'
const GARDEN = 'assets/open-house-garden.jpg'

// Deck-wide behavior: floor-plan explorer, payment calculator, neighborhood
// layers. All local math and local state — no network, no libraries. State is
// kept on the widget roots (attributes / control classes) and re-derived in
// init(), so live slide patches and slide changes re-render idempotently.
const RUNTIME_JS = `
(function () {
  var ROOMS = {
    living: { name: 'Living room', dims: "21' × 16'", note: 'South-facing bay window, original 1926 oak floors, wood-burning fireplace with limestone surround.' },
    dining: { name: 'Dining room', dims: "16' × 13'", note: 'Opens to both the kitchen and living room. Plaster ceiling medallion and picture rail intact.' },
    kitchen: { name: 'Kitchen', dims: "17' × 15'", note: 'Renovated 2023: sage cabinetry, honed marble, 36-inch range, brass fittings. Pantry wall with pull-outs.' },
    study: { name: 'Study', dims: "14' × 12'", note: 'Quiet street-side room with built-in shelving — works as a fifth bedroom or office.' },
    entry: { name: 'Entry & stair', dims: "12' × 10'", note: 'Original staircase with walnut handrail; coat closet under the landing.' },
    mud: { name: 'Mudroom + half bath', dims: "11' × 8'", note: 'Side-door drop zone with bench and cubbies; renovated half bath.' },
    porch: { name: 'Screened porch', dims: "16' × 12'", note: 'Three-season porch off the kitchen, wired for lighting and ceiling fan. Steps to the garden.' },
    primary: { name: 'Primary suite', dims: "19' × 15'", note: 'Treetop corner with morning light from the east; reading nook in the gable.' },
    pbath: { name: 'Primary bath', dims: "12' × 9'", note: 'Double vanity, honed marble, heated floor, walk-in shower with bench.' },
    dressing: { name: 'Dressing room', dims: "12' × 9'", note: 'Fitted wardrobe wall — converts back to a small fourth bedroom if needed.' },
    bed2: { name: 'Bedroom two', dims: "14' × 12'", note: 'West light, deep closet, original fir floors.' },
    bed3: { name: 'Bedroom three', dims: "14' × 12'", note: 'Garden view; currently used as a guest room and studio.' },
    hbath: { name: 'Hall bath', dims: "10' × 8'", note: 'Renovated with a cast-iron tub and zellige tile.' },
    laundry: { name: 'Laundry + linen', dims: "10' × 8'", note: 'Upstairs laundry with counter and drying rail; linen wall.' }
  };
  var FLOOR_DEFAULT = { main: 'living', upper: 'primary' };

  /* ---------- Durable host-backed persistence ---------- */
  var stateStore = window.moldableState('open-house:v1');
  var saved = null;
  var hydrated = false;
  var persistQueued = false;
  var hydration = stateStore.get(null).then(function (value) {
    saved = value;
    hydrated = true;
  }, function () { hydrated = true; });
  function persist() {
    if (!hydrated) { persistQueued = true; return; }
    var data = {};
    var plan = document.querySelector('[data-floorplan]');
    if (plan) data.plan = { floor: plan.getAttribute('data-floor-active'), room: plan.getAttribute('data-room-selected') };
    var calc = document.querySelector('[data-calc]');
    if (calc) data.calc = {
      price: (calc.querySelector('[name="price"]') || {}).value,
      down: (calc.querySelector('[name="down"]') || {}).value,
      rate: (calc.querySelector('[name="rate"]') || {}).value,
      term: calc.getAttribute('data-term-active')
    };
    var map = document.querySelector('[data-map]');
    if (map) {
      data.layers = {};
      map.querySelectorAll('[data-layer]').forEach(function (chip) {
        data.layers[chip.getAttribute('data-layer')] = chip.classList.contains('on');
      });
    }
    stateStore.set(data).catch(function () {});
  }
  function restoreWidgets() {
    if (!saved) return;
    var plan = document.querySelector('[data-floorplan]');
    if (plan && !plan.dataset.restored && saved.plan) {
      plan.dataset.restored = '1';
      if (saved.plan.floor) plan.setAttribute('data-floor-active', saved.plan.floor);
      if (saved.plan.room) plan.setAttribute('data-room-selected', saved.plan.room);
    }
    var calc = document.querySelector('[data-calc]');
    if (calc && !calc.dataset.restored && saved.calc) {
      calc.dataset.restored = '1';
      ['price', 'down', 'rate'].forEach(function (key) {
        var input = calc.querySelector('[name="' + key + '"]');
        if (input && saved.calc[key]) input.value = saved.calc[key];
      });
      if (saved.calc.term) calc.setAttribute('data-term-active', saved.calc.term);
    }
    var map = document.querySelector('[data-map]');
    if (map && !map.dataset.restored && saved.layers) {
      map.dataset.restored = '1';
      map.querySelectorAll('[data-layer]').forEach(function (chip) {
        var key = chip.getAttribute('data-layer');
        if (key in saved.layers) {
          chip.classList.toggle('on', !!saved.layers[key]);
          chip.setAttribute('aria-pressed', saved.layers[key] ? 'true' : 'false');
        }
      });
    }
  }

  function renderPlan(root) {
    var floor = root.getAttribute('data-floor-active') || 'main';
    var selected = root.getAttribute('data-room-selected') || FLOOR_DEFAULT[floor];
    root.querySelectorAll('[data-floor]').forEach(function (chip) {
      chip.classList.toggle('on', chip.getAttribute('data-floor') === floor);
    });
    root.querySelectorAll('[data-floor-group]').forEach(function (group) {
      group.style.display = group.getAttribute('data-floor-group') === floor ? '' : 'none';
    });
    root.querySelectorAll('[data-room]').forEach(function (room) {
      var on = room.getAttribute('data-room') === selected;
      room.classList.toggle('on', on);
      room.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var data = ROOMS[selected] || ROOMS.living;
    var set = function (attr, value) {
      var el = root.querySelector('[data-room-out="' + attr + '"]');
      if (el) el.textContent = value;
    };
    set('name', data.name);
    set('dims', data.dims);
    set('note', data.note);
  }

  function money(value) { return '$' + Math.round(value).toLocaleString('en-US'); }

  function renderCalc(root) {
    var price = Number((root.querySelector('[name="price"]') || {}).value || 1285000);
    var downPct = Number((root.querySelector('[name="down"]') || {}).value || 20);
    var rate = Number((root.querySelector('[name="rate"]') || {}).value || 6.25);
    var years = Number(root.getAttribute('data-term-active') || 30);
    var down = price * downPct / 100;
    var loan = price - down;
    var r = rate / 100 / 12;
    var n = years * 12;
    var monthly = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
    var interest = monthly * n - loan;
    root.querySelectorAll('[data-term]').forEach(function (chip) {
      chip.classList.toggle('on', Number(chip.getAttribute('data-term')) === years);
    });
    var set = function (name, value) {
      var el = root.querySelector('[data-calc-out="' + name + '"]');
      if (el) el.textContent = value;
    };
    set('price', money(price));
    set('down', downPct.toFixed(0) + '% · ' + money(down));
    set('rate', rate.toFixed(2) + '%');
    set('monthly', money(monthly));
    set('loan', money(loan));
    set('interest', money(interest));
  }

  function renderMap(root) {
    root.querySelectorAll('[data-layer]').forEach(function (chip) {
      var layer = chip.getAttribute('data-layer');
      var on = chip.classList.contains('on');
      root.querySelectorAll('[data-pin-layer="' + layer + '"]').forEach(function (group) {
        group.style.display = on ? '' : 'none';
      });
      root.querySelectorAll('[data-poi-layer="' + layer + '"]').forEach(function (list) {
        list.style.display = on ? '' : 'none';
      });
    });
  }

  function selectRoom(target) {
    var room = target.closest('[data-room]');
    if (!room) return false;
    var root = room.closest('[data-floorplan]');
    if (!root) return false;
    root.setAttribute('data-room-selected', room.getAttribute('data-room'));
    renderPlan(root);
    persist();
    return true;
  }

  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    var floorChip = event.target.closest('[data-floor]');
    if (floorChip) {
      var planRoot = floorChip.closest('[data-floorplan]');
      if (planRoot) {
        var floor = floorChip.getAttribute('data-floor');
        planRoot.setAttribute('data-floor-active', floor);
        planRoot.setAttribute('data-room-selected', FLOOR_DEFAULT[floor]);
        renderPlan(planRoot);
        persist();
        return;
      }
    }
    if (selectRoom(event.target)) return;
    var term = event.target.closest('[data-term]');
    if (term) {
      var calcRoot = term.closest('[data-calc]');
      if (calcRoot) {
        calcRoot.setAttribute('data-term-active', term.getAttribute('data-term'));
        renderCalc(calcRoot);
        persist();
        return;
      }
    }
    var layerChip = event.target.closest('[data-layer]');
    if (layerChip) {
      var mapRoot = layerChip.closest('[data-map]');
      if (mapRoot) {
        layerChip.classList.toggle('on');
        layerChip.setAttribute('aria-pressed', layerChip.classList.contains('on') ? 'true' : 'false');
        renderMap(mapRoot);
        persist();
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (!event.target || !event.target.closest) return;
    if (selectRoom(event.target)) event.preventDefault();
  });

  document.addEventListener('input', function (event) {
    if (!event.target || !event.target.closest) return;
    var calcRoot = event.target.closest('[data-calc]');
    if (calcRoot) { renderCalc(calcRoot); persist(); }
  });

  function init() {
    restoreWidgets();
    document.querySelectorAll('[data-floorplan]').forEach(renderPlan);
    document.querySelectorAll('[data-calc]').forEach(renderCalc);
    document.querySelectorAll('[data-map]').forEach(renderMap);
  }
  document.addEventListener('deck:slidechange', init);
  document.addEventListener('deck:slidepatch', init);
  hydration.then(function () { init(); if (persistQueued) persist(); });
})();
`.trim()

export const openHouse: Template = {
  id: 'open-house',
  categories: ['Sales'],
  name: 'Open House',
  tagline: 'A listing pitch buyers can explore',
  audiences: ['realtor', 'sales', 'client pitch'],
  description:
    'A quiet-luxury property presentation on warm ivory — estate serif, pine and brass, hairline rules. The pitch is explorable: a clickable floor plan with room details, a live payment calculator with a 15/30-year toggle, and a neighborhood map with toggleable layers. Swap in your own listing and numbers.',
  fonts: {
    display: 'DM Serif Display',
    body: 'Karla',
    links: [
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Karla:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f7f4ec',
    '--text': '#23281f',
    '--muted': '#78776a',
    '--accent': '#2e5941',
    '--accent-2': '#a9853e',
    '--display': "'DM Serif Display', serif",
    '--body': "'Karla', sans-serif",
    '--display-weight': '400',
    '--headline-weight': '400',
    '--title-size': '124px',
    '--display-size': '148px',
    '--headline-size': '78px',
    '--subhead-size': '48px',
    '--lead-size': '37px',
    '--bullet-size': '34px',
    '--quote-weight': '400',
    '--kicker-font': "'Karla', sans-serif",
    '--kicker-tracking': '0.3em',
    '--kicker-size': '20px',
    '--card-bg': 'rgba(255,255,255,0.72)',
    '--card-border': 'rgba(64,72,52,0.16)',
    '--radius': '4px',
    '--stat-size': '92px',
    '--metric-size': '116px',
    '--th-border': 'rgba(35,40,31,0.5)',
    '--table-border': 'rgba(64,72,52,0.14)',
    '--table-size': '29px',
    '--rule-color': 'rgba(64,72,52,0.2)',
    '--bullet-color': '#a9853e',
    '--chip-bg': 'rgba(46,89,65,0.08)',
    '--media-border': '1px solid rgba(64,72,52,0.18)',
    '--media-radius': '4px',
    '--media-shadow': '0 34px 70px -34px rgba(35,40,31,0.5)',
    '--scrim':
      'linear-gradient(180deg, rgba(21,26,19,0.12) 0%, rgba(21,26,19,0.42) 55%, rgba(21,26,19,0.88) 100%)',
    '--pos': '#2f6e4f',
    '--neg': '#a23b2e',
  },
  stageBg: '#1a1e17',
  assets: [
    'open-house-cover.jpg',
    'open-house-living.jpg',
    'open-house-kitchen.jpg',
    'open-house-garden.jpg',
  ],
  decoration: `.kicker { color: var(--accent-2); font-weight: 600; }
.stat-num, .metric { color: var(--accent); }
.donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.runner { border-top-color: rgba(64,72,52,0.18); }
.runner-brand::before { border-radius: 50%; background: var(--accent-2); }

/* ---- Estate frame (cover + close): double hairline over the photograph ---- */
.estate-frame { position: absolute; inset: 34px; border: 1px solid rgba(247,244,236,0.55); pointer-events: none; }
.estate-frame::after { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(247,244,236,0.3); }

/* ---- Price lockup ---- */
.price-eyebrow { font: 600 22px var(--body); letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent-2); }
.price { font-family: var(--display); font-size: 150px; line-height: 1; letter-spacing: -0.01em; color: var(--text); font-variant-numeric: tabular-nums; }
.price small { font-size: 44px; color: var(--muted); letter-spacing: 0; }

/* ---- Small-caps brass badge ---- */
.badge { display: inline-flex; align-items: center; gap: 12px; padding: 10px 24px; border: 1px solid rgba(169,133,62,0.5); color: var(--accent-2); font: 700 21px var(--body); letter-spacing: 0.22em; text-transform: uppercase; background: rgba(169,133,62,0.06); }

/* ---- Keyline note ---- */
.note { border-left: 2px solid var(--accent-2); padding: 26px 34px; background: rgba(255,255,255,0.55); }
.note-k { font: 700 19px var(--body); letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent-2); margin-bottom: 10px; }
.note-t { font-family: var(--display); font-size: 36px; line-height: 1.15; color: var(--text); }
.note-d { font: 400 25px var(--body); line-height: 1.45; color: var(--muted); margin-top: 8px; }
.note-d b { color: var(--text); }

/* ---- Tour agenda rows (roman numerals on hairlines) ---- */
.tour { display: flex; flex-direction: column; }
.tour-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 30px; align-items: baseline; padding: 30px 0; border-top: 1px solid rgba(64,72,52,0.16); }
.tour-row:last-child { border-bottom: 1px solid rgba(64,72,52,0.16); }
.tour-n { font-family: var(--display); font-size: 40px; color: var(--accent-2); }
.tour-t { font-family: var(--display); font-size: 46px; color: var(--text); }
.tour-d { font: 400 26px var(--body); color: var(--muted); }

/* ---- Divider treatment ---- */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font: 700 21px var(--body); letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent-2); }
.divider-title { font-family: var(--display); font-size: 152px; line-height: 0.98; color: var(--text); }
.divider-rule { width: 110px; height: 1px; background: var(--accent-2); margin-top: 14px; }
.divider-meta { font: 400 26px var(--body); color: var(--muted); }

/* ---- Shared control chips (floors, terms, map layers) ---- */
.chip-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.chip-row button { appearance: none; cursor: pointer; border: 1px solid rgba(64,72,52,0.28); background: rgba(255,255,255,0.7); color: var(--muted); font: 700 20px var(--body); letter-spacing: 0.14em; text-transform: uppercase; padding: 12px 24px; border-radius: 999px; }
.chip-row button.on { background: var(--accent); border-color: var(--accent); color: #f7f4ec; }
.chip-row button:focus-visible { outline: 3px solid rgba(169,133,62,0.65); outline-offset: 2px; }

/* ---- Floor-plan explorer ---- */
.fp { display: grid; grid-template-columns: 1.35fr 0.65fr; gap: 44px; align-items: stretch; }
.fp-stage { background: rgba(255,255,255,0.75); border: 1px solid rgba(64,72,52,0.18); padding: 26px; }
.fp-svg { width: 100%; height: auto; display: block; }
.fp-svg [data-room] { cursor: pointer; }
.fp-svg [data-room] rect { fill: rgba(46,89,65,0.045); stroke: rgba(35,40,31,0.55); stroke-width: 1.5; transition: fill 0.2s ease; }
.fp-svg [data-room]:hover rect { fill: rgba(169,133,62,0.14); }
.fp-svg [data-room].on rect { fill: rgba(46,89,65,0.16); stroke: var(--accent); stroke-width: 2.5; }
.fp-svg [data-room]:focus-visible { outline: none; }
.fp-svg [data-room]:focus-visible rect { stroke: var(--accent-2); stroke-width: 3; }
.fp-label { font: 600 19px var(--body); fill: rgba(35,40,31,0.78); pointer-events: none; }
.fp-dims { font: 400 15px var(--body); fill: rgba(35,40,31,0.45); pointer-events: none; }
.fp-panel { border: 1px solid rgba(64,72,52,0.18); background: rgba(255,255,255,0.75); padding: 40px 42px; display: flex; flex-direction: column; gap: 14px; }
.fp-room { font-family: var(--display); font-size: 52px; line-height: 1.02; color: var(--text); }
.fp-dim { font: 700 22px var(--body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent-2); }
.fp-note { font: 400 25px var(--body); line-height: 1.5; color: var(--muted); }
.fp-hint { margin-top: auto; padding-top: 18px; border-top: 1px solid rgba(64,72,52,0.14); font: 400 20px var(--body); color: var(--muted); }

/* ---- Payment calculator ---- */
.calc { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 44px; align-items: stretch; }
.calc-controls { background: rgba(255,255,255,0.75); border: 1px solid rgba(64,72,52,0.18); padding: 38px 42px; }
.calc-row { display: grid; grid-template-columns: 210px 1fr 190px; gap: 24px; align-items: center; padding: 22px 0; border-bottom: 1px solid rgba(64,72,52,0.12); }
.calc-row:last-of-type { border-bottom: 0; }
.calc-row label { font: 600 24px var(--body); color: var(--text); }
.calc-row output { text-align: right; font: 700 24px var(--body); color: var(--accent); font-variant-numeric: tabular-nums; }
.calc-row input { width: 100%; accent-color: var(--accent); cursor: ew-resize; }
.calc-result { background: var(--accent); color: #f2f0e6; padding: 44px 46px; display: flex; flex-direction: column; gap: 8px; }
.calc-monthly { font-family: var(--display); font-size: 108px; line-height: 1; font-variant-numeric: tabular-nums; color: #fff; }
.calc-monthly-label { font: 700 20px var(--body); letter-spacing: 0.24em; text-transform: uppercase; color: rgba(242,240,230,0.75); }
.calc-sub { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 26px; margin-top: 26px; padding-top: 24px; border-top: 1px solid rgba(242,240,230,0.3); }
.calc-sub b { display: block; font: 700 30px var(--body); font-variant-numeric: tabular-nums; color: #fff; }
.calc-sub span { display: block; font: 400 19px var(--body); color: rgba(242,240,230,0.72); margin-top: 2px; }

/* ---- Neighborhood map (stylized flat map: blocks, park blobs, avenue) ---- */
.map { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 44px; align-items: stretch; }
.map-stage { background: #f4eede; border: 1px solid rgba(64,72,52,0.2); padding: 18px; }
.map-svg { width: 100%; height: auto; display: block; border: 1px solid rgba(64,72,52,0.12); }
.mp-ground { fill: #f4eede; }
.mp-block { fill: #e6dfc9; }
.mp-bldg { fill: #d9d1ba; }
.mp-park { fill: #ccd8bd; stroke: #b7c8a1; stroke-width: 1.5; }
.mp-tree { fill: #a9bf93; }
.mp-pond { fill: #c2d3d7; stroke: #a7bfc4; stroke-width: 1; }
.mp-ave-casing { stroke: #d6cdb3; stroke-width: 34; fill: none; stroke-linecap: round; }
.mp-ave { stroke: #f4eede; stroke-width: 26; fill: none; stroke-linecap: round; }
.mp-rail { stroke: #99916f; stroke-width: 2.5; stroke-dasharray: 12 8; fill: none; }
.mp-name { font: 600 13px var(--body); letter-spacing: 0.22em; fill: #a59c84; }
.mp-ring { fill: none; stroke: rgba(169,133,62,0.55); stroke-width: 2; stroke-dasharray: 5 7; }
.mp-ring-label, .mp-home-label { font: 700 12px var(--body); letter-spacing: 0.2em; fill: var(--accent-2); }
.mp-home-glyph { fill: var(--accent-2); stroke: #fff; stroke-width: 2.5; stroke-linejoin: round; paint-order: stroke; }
.mp-compass circle { fill: #fbf8f0; stroke: #c8bfa5; stroke-width: 1.5; }
.mp-compass path { fill: var(--text); }
.mp-compass text { font: 700 11px var(--body); fill: var(--text); letter-spacing: 0.1em; }
.mp-scale line { stroke: #a59c84; stroke-width: 2; }
.map-pin path { stroke: #fff; stroke-width: 2; paint-order: stroke; }
.map-pin circle { fill: #fff; }
.map-pin.cafes path { fill: #a9853e; }
.map-pin.parks path { fill: #2e5941; }
.map-pin.schools path { fill: #23281f; }
.map-pin.transit path { fill: #5a6b8c; }
.map-list { display: flex; flex-direction: column; gap: 0; overflow: hidden; }
.poi-group { padding: 18px 0; border-top: 1px solid rgba(64,72,52,0.14); }
.poi-k { display: flex; align-items: center; gap: 12px; font: 700 20px var(--body); letter-spacing: 0.18em; text-transform: uppercase; color: var(--text); margin-bottom: 10px; }
.poi-dot { width: 13px; height: 13px; border-radius: 50%; }
.poi { display: flex; justify-content: space-between; gap: 18px; font: 400 24px var(--body); color: var(--muted); padding: 5px 0; }
.poi b { color: var(--text); font-weight: 600; }
.poi span { font-variant-numeric: tabular-nums; white-space: nowrap; }

/* ---- Phone reflow: scale bespoke decoration for a ~390px canvas ---- */
@media (max-width: 640px) {
  html.deck-can-flow .price { font-size: min(56px, 15vw) !important; }
  html.deck-can-flow .price small { font-size: 20px !important; }
  html.deck-can-flow .estate-frame { inset: 14px; }
  html.deck-can-flow .divider { padding: 56px 26px !important; }
  html.deck-can-flow .divider-title { font-size: min(48px, 13vw) !important; line-height: 1 !important; }
  html.deck-can-flow .tour-row { grid-template-columns: 54px 1fr; gap: 12px; padding: 18px 0; }
  html.deck-can-flow .tour-n { font-size: 22px !important; }
  html.deck-can-flow .tour-t { font-size: 25px !important; }
  html.deck-can-flow .tour-d { grid-column: 2; font-size: 17px !important; }
  html.deck-can-flow .note { padding: 18px 20px; }
  html.deck-can-flow .note-t { font-size: 24px !important; }
  html.deck-can-flow .note-d { font-size: 17px !important; }
  html.deck-can-flow .badge { font-size: 14px; padding: 8px 16px; letter-spacing: 0.16em; }
  html.deck-can-flow .fp { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .fp-stage { padding: 12px; }
  html.deck-can-flow .fp-panel { padding: 22px 20px; }
  html.deck-can-flow .fp-room { font-size: 30px !important; }
  html.deck-can-flow .fp-dim { font-size: 15px !important; }
  html.deck-can-flow .fp-note { font-size: 17px !important; }
  html.deck-can-flow .fp-hint { font-size: 14px !important; }
  html.deck-can-flow .chip-row button { font-size: 13px; padding: 8px 14px; }
  html.deck-can-flow .calc { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .calc-controls { padding: 20px 18px; }
  html.deck-can-flow .calc-row { grid-template-columns: 1fr; gap: 8px; padding: 14px 0; }
  html.deck-can-flow .calc-row label { font-size: 17px; }
  html.deck-can-flow .calc-row output { text-align: left; font-size: 17px; }
  html.deck-can-flow .calc-result { padding: 24px 22px; }
  html.deck-can-flow .calc-monthly { font-size: min(52px, 14vw) !important; }
  html.deck-can-flow .calc-sub b { font-size: 20px !important; }
  html.deck-can-flow .calc-sub span { font-size: 13px !important; }
  html.deck-can-flow .map { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .map-stage { padding: 10px; }
  html.deck-can-flow .poi { font-size: 16px !important; }
  html.deck-can-flow .poi-k { font-size: 14px !important; }
}`,
  runtime: {
    libs: [],
    js: RUNTIME_JS,
    connectOrigins: [],
    frameOrigins: [],
  },
  notes:
    "A private-showing listing presentation for a fictional 1926 craftsman. Working runtime examples: a clickable SVG floor plan with a room-detail panel and Main/Upper toggle, a live payment calculator with a 15/30-year term toggle, a neighborhood map with toggleable POI layers, and click-build financing notes. Keep data-deck-interactive on the widget roots, keep listeners delegated, and keep room/POI data in RUNTIME_JS in sync with the SVG. Widget state persists through window.moldableState('open-house:v1') (workspace filesystem in Slides/Artifacts; per-browser localStorage when published); thumbnails never touch it. Quiet-luxury look: DM Serif Display + Karla, ivory paper, ONE pine accent with brass (.accent-2) for eyebrows and badges — no gradients, sharp corners, hairlines.",
  sampleSlides: [
    s({
      id: 'oh-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="estate-frame"></div>
  <div class="pad end">
    <div class="kicker reveal">Private showing · Saturday, June 6</div>
    <h1 class="title reveal" style="margin-top:10px">24 Alder Lane.</h1>
    <p class="lead reveal" style="max-width:34ch">A 1926 craftsman, thoughtfully renewed · Maple Hill</p>
  </div>
</div>`,
    }),
    s({
      id: 'oh-glance',
      name: 'At a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col" style="--col-gap:100px;align-items:center">
    <div>
      <div class="badge reveal">Offered at</div>
      <div class="price reveal" style="margin-top:26px">$1,285,000</div>
      <p class="lead reveal" style="margin-top:22px">Four bedrooms on a quarter-acre corner lot, two blocks from the Green.</p>
    </div>
    <div class="reveal">
      <div class="stats" style="flex-direction:column">
        <div class="stat" style="padding:22px 0;border-left:0;border-top:1px solid var(--card-border)"><div class="stat-num" style="font-size:76px">4 <span style="font-size:30px;color:var(--muted)">bd</span> · 3 <span style="font-size:30px;color:var(--muted)">ba</span></div><div class="stat-label">Plus a study and dressing room that flex</div></div>
        <div class="stat" style="padding:22px 0;border-left:0;border-top:1px solid var(--card-border)"><div class="stat-num" style="font-size:76px">2,840 <span style="font-size:30px;color:var(--muted)">sq ft</span></div><div class="stat-label">$452 per square foot</div></div>
        <div class="stat" style="padding:22px 0;border-left:0;border-top:1px solid var(--card-border)"><div class="stat-num" style="font-size:76px">1926 <span style="font-size:30px;color:var(--muted)">built</span></div><div class="stat-label">Systems, roof, and kitchen renewed 2021–2023</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">At a glance</span></div>
</div>`,
    }),
    s({
      id: 'oh-agenda',
      name: 'The hour',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we'll spend the hour</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Walk it, then run the numbers.</h2>
  <div class="tour reveal">
    <div class="tour-row"><div class="tour-n">I.</div><div class="tour-t">The home</div><div class="tour-d">Rooms, light, and the floor plan — tap around</div></div>
    <div class="tour-row"><div class="tour-n">II.</div><div class="tour-t">The numbers</div><div class="tour-d">Payment scenarios, comparables, the market</div></div>
    <div class="tour-row"><div class="tour-n">III.</div><div class="tour-t">The neighborhood</div><div class="tour-d">What's a short walk away — you choose the layers</div></div>
    <div class="tour-row"><div class="tour-n">IV.</div><div class="tour-t">Your questions</div><div class="tour-d">And how to make a strong offer</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The hour</span></div>
</div>`,
    }),
    s({
      id: 'oh-sec-home',
      name: 'Section · The home',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part I</div>
  <div class="divider-title reveal">The home.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-meta reveal">Four bedrooms · three baths · 2,840 square feet</div>
</div>`,
    }),
    s({
      id: 'oh-living',
      name: 'Living room',
      transition: 'slide',
      bodyHtml: `<div class="hero">
  <div class="hero-text">
    <div class="kicker reveal">The living room</div>
    <h2 class="headline reveal">Morning light,<br/>original oak.</h2>
    <p class="lead reveal" style="max-width:30ch">The bay window faces south over the garden beds; the fireplace and picture rails are original to the house.</p>
    <ul class="checks reveal" style="margin-top:10px">
      <li class="check"><span>Wood-burning fireplace, limestone surround</span></li>
      <li class="check"><span>Quarter-sawn oak floors, refinished 2022</span></li>
    </ul>
  </div>
  <figure class="media"><img src="${LIVING}" alt="Living room with bay window and fireplace"></figure>
</div>`,
    }),
    s({
      id: 'oh-kitchen',
      name: 'Kitchen',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">The kitchen · renovated 2023</div>
    <h2 class="headline reveal">Sage, marble,<br/>and brass.</h2>
    <ul class="bullets reveal" style="--gap:22px;margin-top:6px">
      <li class="bullet"><span><b>Full renovation</b> — custom sage cabinetry with a pantry wall of pull-outs.</span></li>
      <li class="bullet"><span><b>Honed marble</b> counters and a 36-inch range.</span></li>
      <li class="bullet"><span><b>Opens to the porch</b> — coffee outside from April to October.</span></li>
    </ul>
  </div>
  <figure class="media"><img src="${KITCHEN}" alt="Kitchen with sage cabinetry and marble counters"></figure>
</div>`,
    }),
    s({
      id: 'oh-floorplan',
      name: 'Interactive floor plan',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">Walk the plan</div>
      <h2 class="headline" style="margin-top:6px">Tap any room.</h2>
    </div>
  </div>
  <div class="fp reveal" data-floorplan data-floor-active="main" data-room-selected="living" data-deck-interactive style="margin-top:18px">
    <div class="fp-stage">
      <div class="chip-row" style="margin-bottom:16px">
        <button type="button" data-floor="main" class="on">Main floor</button>
        <button type="button" data-floor="upper">Upper floor</button>
      </div>
      <svg class="fp-svg" viewBox="0 0 900 560" aria-label="Floor plan">
        <g data-floor-group="main">
          <g data-room="living" class="on" tabindex="0" role="button" aria-label="Living room"><rect x="20" y="20" width="340" height="280"/><text class="fp-label" x="40" y="56">Living</text><text class="fp-dims" x="40" y="80">21' × 16'</text></g>
          <g data-room="dining" tabindex="0" role="button" aria-label="Dining room"><rect x="360" y="20" width="260" height="200"/><text class="fp-label" x="380" y="56">Dining</text><text class="fp-dims" x="380" y="80">16' × 13'</text></g>
          <g data-room="kitchen" tabindex="0" role="button" aria-label="Kitchen"><rect x="620" y="20" width="260" height="280"/><text class="fp-label" x="640" y="56">Kitchen</text><text class="fp-dims" x="640" y="80">17' × 15'</text></g>
          <g data-room="study" tabindex="0" role="button" aria-label="Study"><rect x="20" y="300" width="220" height="240"/><text class="fp-label" x="40" y="336">Study</text><text class="fp-dims" x="40" y="360">14' × 12'</text></g>
          <g data-room="entry" tabindex="0" role="button" aria-label="Entry and stair"><rect x="240" y="300" width="200" height="240"/><text class="fp-label" x="260" y="336">Entry</text><text class="fp-dims" x="260" y="360">stair</text></g>
          <g data-room="mud" tabindex="0" role="button" aria-label="Mudroom and half bath"><rect x="440" y="300" width="180" height="240"/><text class="fp-label" x="458" y="336">Mud</text><text class="fp-dims" x="458" y="360">+ ½ bath</text></g>
          <g data-room="porch" tabindex="0" role="button" aria-label="Screened porch"><rect x="620" y="300" width="260" height="240" stroke-dasharray="7 5"/><text class="fp-label" x="640" y="336">Porch</text><text class="fp-dims" x="640" y="360">screened</text></g>
        </g>
        <g data-floor-group="upper" style="display:none">
          <g data-room="primary" tabindex="0" role="button" aria-label="Primary suite"><rect x="20" y="20" width="400" height="300"/><text class="fp-label" x="40" y="56">Primary suite</text><text class="fp-dims" x="40" y="80">19' × 15'</text></g>
          <g data-room="pbath" tabindex="0" role="button" aria-label="Primary bath"><rect x="20" y="320" width="200" height="220"/><text class="fp-label" x="40" y="356">Bath</text><text class="fp-dims" x="40" y="380">heated floor</text></g>
          <g data-room="dressing" tabindex="0" role="button" aria-label="Dressing room"><rect x="220" y="320" width="200" height="220"/><text class="fp-label" x="240" y="356">Dressing</text><text class="fp-dims" x="240" y="380">12' × 9'</text></g>
          <g data-room="bed2" tabindex="0" role="button" aria-label="Bedroom two"><rect x="420" y="20" width="230" height="260"/><text class="fp-label" x="440" y="56">Bed 2</text><text class="fp-dims" x="440" y="80">14' × 12'</text></g>
          <g data-room="bed3" tabindex="0" role="button" aria-label="Bedroom three"><rect x="650" y="20" width="230" height="260"/><text class="fp-label" x="670" y="56">Bed 3</text><text class="fp-dims" x="670" y="80">14' × 12'</text></g>
          <g data-room="hbath" tabindex="0" role="button" aria-label="Hall bath"><rect x="420" y="280" width="230" height="260"/><text class="fp-label" x="440" y="316">Hall bath</text><text class="fp-dims" x="440" y="340">zellige</text></g>
          <g data-room="laundry" tabindex="0" role="button" aria-label="Laundry and linen"><rect x="650" y="280" width="230" height="260"/><text class="fp-label" x="670" y="316">Laundry</text><text class="fp-dims" x="670" y="340">+ linen</text></g>
        </g>
      </svg>
    </div>
    <div class="fp-panel" aria-live="polite">
      <div class="fp-dim" data-room-out="dims">21' × 16'</div>
      <div class="fp-room" data-room-out="name">Living room</div>
      <p class="fp-note" data-room-out="note">South-facing bay window, original 1926 oak floors, wood-burning fireplace with limestone surround.</p>
      <div class="fp-hint">Tap rooms to explore · switch floors above</div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'oh-garden',
      name: 'Garden',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${GARDEN}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">The garden</div>
    <h2 class="headline reveal" style="max-width:16ch">Dusk is the argument.</h2>
    <p class="lead reveal" style="max-width:36ch">Bluestone patio, layered beds, and string lights on the cedar fence — the porch steps land right here.</p>
  </div>
</div>`,
    }),
    s({
      id: 'oh-sec-numbers',
      name: 'Section · The numbers',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part II</div>
  <div class="divider-title reveal">The numbers.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-meta reveal">Payment scenarios · comparables · the street's trajectory</div>
</div>`,
    }),
    s({
      id: 'oh-calc',
      name: 'Payment calculator',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">Your monthly number</div>
      <h2 class="headline" style="margin-top:6px">Move the sliders.</h2>
    </div>
    <button class="badge" data-deck-advance style="cursor:pointer">Financing notes →</button>
  </div>
  <div class="calc reveal" data-calc data-term-active="30" data-deck-interactive style="margin-top:18px">
    <div class="calc-controls">
      <div class="chip-row" style="margin-bottom:8px">
        <button type="button" data-term="30" class="on">30 year</button>
        <button type="button" data-term="15">15 year</button>
      </div>
      <div class="calc-row"><label for="oh-price">Purchase price</label><input id="oh-price" name="price" type="range" min="1100000" max="1450000" step="5000" value="1285000"><output data-calc-out="price">$1,285,000</output></div>
      <div class="calc-row"><label for="oh-down">Down payment</label><input id="oh-down" name="down" type="range" min="5" max="40" step="1" value="20"><output data-calc-out="down">20% · $257,000</output></div>
      <div class="calc-row"><label for="oh-rate">Rate</label><input id="oh-rate" name="rate" type="range" min="4.5" max="8" step="0.05" value="6.25"><output data-calc-out="rate">6.25%</output></div>
    </div>
    <div class="calc-result" aria-live="polite">
      <div class="calc-monthly-label">Principal &amp; interest</div>
      <div class="calc-monthly"><span data-calc-out="monthly">$6,330</span><small style="font-size:34px;color:rgba(242,240,230,0.7)">/mo</small></div>
      <div class="calc-sub">
        <div><b data-calc-out="loan">$1,028,000</b><span>Loan amount</span></div>
        <div><b data-calc-out="interest">$1,250,646</b><span>Lifetime interest</span></div>
      </div>
    </div>
  </div>
  <div class="cols-2 reveal" style="margin-top:20px;gap:20px">
    <div class="note" data-build="1"><div class="note-k">Carry cost</div><div class="note-d" style="margin-top:0">Taxes and insurance add roughly <b>$1,120/mo</b> at the current mill rate.</div></div>
    <div class="note" data-build="2"><div class="note-k">Worth asking</div><div class="note-d" style="margin-top:0">A <b>$12k seller credit</b> buys the rate to 5.75% — about <b>$330/mo</b> back.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The numbers · Payment</span></div>
</div>`,
    }),
    s({
      id: 'oh-comps',
      name: 'Comparables',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What the street has traded at</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Five comparables, one story.</h2>
  <table class="table reveal" style="margin-top:8px">
    <thead><tr><th>Address</th><th>Sold</th><th class="num">Beds</th><th class="num">Sq ft</th><th class="num">$ / sq ft</th><th class="num">Price</th></tr></thead>
    <tbody>
      <tr><td>18 Alder Lane</td><td>Mar 2026</td><td class="num">4</td><td class="num">2,690</td><td class="num">$446</td><td class="num">$1,200,000</td></tr>
      <tr><td>41 Rowan Street</td><td>Feb 2026</td><td class="num">4</td><td class="num">2,910</td><td class="num">$433</td><td class="num">$1,260,000</td></tr>
      <tr><td>7 Linden Court</td><td>Dec 2025</td><td class="num">3</td><td class="num">2,340</td><td class="num">$441</td><td class="num">$1,032,000</td></tr>
      <tr><td>66 Maple Hill Road</td><td>Oct 2025</td><td class="num">5</td><td class="num">3,180</td><td class="num">$421</td><td class="num">$1,340,000</td></tr>
      <tr class="row-em"><td>24 Alder Lane · asking</td><td>—</td><td class="num">4</td><td class="num">2,840</td><td class="num">$452</td><td class="num">$1,285,000</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Asking sits 2–4% over the street's recent $/sq ft — the 2023 kitchen and third bath are the delta.</p>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The numbers · Comparables</span></div>
</div>`,
    }),
    s({
      id: 'oh-value',
      name: 'Market trajectory',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col" style="--col-gap:96px;align-items:center">
    <div class="reveal">
      <div class="kicker">Maple Hill, five years</div>
      <h2 class="headline" style="margin-top:8px">A steady climb, not a spike.</h2>
      <div class="note" style="margin-top:26px">
        <div class="note-k">Why it holds</div>
        <div class="note-d" style="margin-top:0">Median $/sq ft is up <b>34% since 2021</b> — walkable blocks and almost no new inventory.</div>
      </div>
    </div>
    <div class="reveal">
      <div class="bars" style="--bars-height:330px;--bar-gap:28px">
        <div class="bar" style="--h:62%"><div class="bar-fill" data-val="$338"></div><div class="bar-label">2021</div></div>
        <div class="bar" style="--h:70%"><div class="bar-fill" data-val="$364"></div><div class="bar-label">2022</div></div>
        <div class="bar" style="--h:77%"><div class="bar-fill" data-val="$391"></div><div class="bar-label">2023</div></div>
        <div class="bar" style="--h:86%"><div class="bar-fill" data-val="$418"></div><div class="bar-label">2024</div></div>
        <div class="bar" style="--h:96%"><div class="bar-fill" data-val="$452" style="background:var(--accent-2)"></div><div class="bar-label">2025</div></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The numbers · Market</span></div>
</div>`,
    }),
    s({
      id: 'oh-sec-hood',
      name: 'Section · The neighborhood',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Part III</div>
  <div class="divider-title reveal">The neighborhood.</div>
  <div class="divider-rule reveal"></div>
  <div class="divider-meta reveal">Two blocks to the Green · nine minutes to the station</div>
</div>`,
    }),
    s({
      id: 'oh-map',
      name: 'Neighborhood map',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">What's a short walk</div>
      <h2 class="headline" style="margin-top:6px">Choose your layers.</h2>
    </div>
  </div>
  <div class="map reveal" data-map data-deck-interactive style="margin-top:18px">
    <div class="map-stage">
      <div class="chip-row" style="margin-bottom:14px">
        <button type="button" data-layer="cafes" class="on" aria-pressed="true">Cafés</button>
        <button type="button" data-layer="parks" class="on" aria-pressed="true">Parks</button>
        <button type="button" data-layer="schools" aria-pressed="false">Schools</button>
        <button type="button" data-layer="transit" aria-pressed="false">Transit</button>
      </div>
      <svg class="map-svg" viewBox="0 0 900 520" aria-label="Stylized map of the Maple Hill neighborhood">
        <rect class="mp-ground" x="0" y="0" width="900" height="520"/>
        <g class="mp-blocks">
          <rect class="mp-block" x="-20" y="-16" width="162" height="118" rx="8"/><rect class="mp-block" x="168" y="-16" width="149" height="118" rx="8"/><rect class="mp-block" x="343" y="-16" width="149" height="118" rx="8"/><rect class="mp-block" x="518" y="-16" width="149" height="118" rx="8"/><rect class="mp-block" x="693" y="-16" width="139" height="118" rx="8"/><rect class="mp-block" x="858" y="-16" width="62" height="118" rx="8"/>
          <rect class="mp-block" x="-20" y="128" width="162" height="114" rx="8"/><rect class="mp-block" x="168" y="128" width="149" height="114" rx="8"/><rect class="mp-block" x="343" y="128" width="149" height="114" rx="8"/><rect class="mp-block" x="518" y="128" width="149" height="114" rx="8"/><rect class="mp-block" x="693" y="128" width="139" height="114" rx="8"/><rect class="mp-block" x="858" y="128" width="62" height="114" rx="8"/>
          <rect class="mp-block" x="-20" y="268" width="162" height="114" rx="8"/><rect class="mp-block" x="168" y="268" width="149" height="114" rx="8"/><rect class="mp-block" x="343" y="268" width="149" height="114" rx="8"/><rect class="mp-block" x="518" y="268" width="149" height="114" rx="8"/><rect class="mp-block" x="693" y="268" width="139" height="114" rx="8"/><rect class="mp-block" x="858" y="268" width="62" height="114" rx="8"/>
          <rect class="mp-block" x="-20" y="408" width="162" height="128" rx="8"/><rect class="mp-block" x="168" y="408" width="149" height="128" rx="8"/><rect class="mp-block" x="343" y="408" width="149" height="128" rx="8"/><rect class="mp-block" x="518" y="408" width="149" height="128" rx="8"/><rect class="mp-block" x="693" y="408" width="139" height="128" rx="8"/><rect class="mp-block" x="858" y="408" width="62" height="128" rx="8"/>
        </g>
        <g class="mp-bldgs">
          <rect class="mp-bldg" x="190" y="150" width="16" height="10" rx="2"/><rect class="mp-bldg" x="212" y="150" width="10" height="10" rx="2"/><rect class="mp-bldg" x="190" y="166" width="10" height="8" rx="2"/>
          <rect class="mp-bldg" x="362" y="292" width="14" height="9" rx="2"/><rect class="mp-bldg" x="382" y="292" width="9" height="9" rx="2"/><rect class="mp-bldg" x="362" y="306" width="9" height="7" rx="2"/>
          <rect class="mp-bldg" x="542" y="150" width="12" height="9" rx="2"/><rect class="mp-bldg" x="560" y="150" width="9" height="9" rx="2"/>
          <rect class="mp-bldg" x="380" y="150" width="12" height="9" rx="2"/><rect class="mp-bldg" x="398" y="150" width="9" height="9" rx="2"/>
          <rect class="mp-bldg" x="212" y="300" width="12" height="9" rx="2"/>
        </g>
        <path class="mp-park" d="M672 -12 C650 40 662 104 706 140 C750 176 818 182 862 158 C902 136 912 70 906 -12 Z"/>
        <ellipse class="mp-pond" cx="806" cy="112" rx="28" ry="15"/>
        <circle class="mp-tree" cx="735" cy="40" r="8"/><circle class="mp-tree" cx="774" cy="74" r="7"/><circle class="mp-tree" cx="830" cy="42" r="9"/><circle class="mp-tree" cx="862" cy="100" r="7"/><circle class="mp-tree" cx="722" cy="104" r="7"/>
        <path class="mp-park" d="M28 436 C20 470 34 504 68 512 C104 520 142 506 150 476 C158 446 132 424 96 422 C64 420 36 414 28 436 Z"/>
        <circle class="mp-tree" cx="70" cy="470" r="6"/><circle class="mp-tree" cx="110" cy="464" r="6"/>
        <path class="mp-ave-casing" d="M30 510 L880 55"/>
        <path class="mp-ave" d="M30 510 L880 55"/>
        <path class="mp-rail" d="M30 510 L880 55"/>
        <text class="mp-name" x="210" y="119">ROWAN STREET</text>
        <text class="mp-name" x="185" y="259">ALDER LANE</text>
        <text class="mp-name" x="560" y="399">LINDEN COURT</text>
        <text class="mp-name" x="509" y="500" transform="rotate(-90 509 500)">MAPLE HILL RD</text>
        <text class="mp-name" x="240" y="348" transform="rotate(-28 240 348)">HILLCREST AVENUE</text>
        <circle class="mp-ring" cx="472" cy="255" r="140"/>
        <text class="mp-ring-label" x="508" y="122">5-MIN WALK</text>
        <g class="mp-compass" transform="translate(52 50)">
          <circle r="16"/>
          <path d="M0 -10 L4 6 L0 3 L-4 6 Z"/>
          <text x="-4" y="-22">N</text>
        </g>
        <g class="mp-scale" transform="translate(756 490)">
          <line x1="0" y1="0" x2="86" y2="0"/><line x1="0" y1="-5" x2="0" y2="5"/><line x1="86" y1="-5" x2="86" y2="5"/>
          <text class="mp-name" x="14" y="-10" style="letter-spacing:0.14em">400 FT</text>
        </g>
        <g data-pin-layer="cafes">
          <g class="map-pin cafes" transform="translate(365 242) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin cafes" transform="translate(585 100) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin cafes" transform="translate(700 382) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin cafes" transform="translate(255 380) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
        </g>
        <g data-pin-layer="parks">
          <g class="map-pin parks" transform="translate(790 95) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin parks" transform="translate(95 468) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
        </g>
        <g data-pin-layer="schools" style="display:none">
          <g class="map-pin schools" transform="translate(215 170) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin schools" transform="translate(745 320) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
        </g>
        <g data-pin-layer="transit" style="display:none">
          <g class="map-pin transit" transform="translate(250 392) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin transit" transform="translate(430 296) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
          <g class="map-pin transit" transform="translate(730 135) scale(1.7)"><path d="M0 0 C-2.4 -6.5 -9 -10.5 -9 -17 A9 9 0 1 1 9 -17 C9 -10.5 2.4 -6.5 0 0 Z"/><circle cx="0" cy="-17" r="3.4"/></g>
        </g>
        <g transform="translate(472 255)">
          <g class="mp-home-glyph"><path d="M-14 2 L0 -12 L14 2 Z"/><rect x="-10" y="1" width="20" height="14" rx="1.5"/><rect x="-3" y="7" width="6" height="8" rx="1" style="fill:#fff;stroke:none"/></g>
          <text class="mp-home-label" x="-24" y="34">24 ALDER</text>
        </g>
      </svg>
    </div>
    <div class="map-list">
      <div class="poi-group" data-poi-layer="cafes">
        <div class="poi-k"><span class="poi-dot" style="background:#a9853e"></span>Cafés</div>
        <div class="poi"><b>Fern &amp; Foam</b><span>4 min</span></div>
        <div class="poi"><b>Alder Bakehouse</b><span>6 min</span></div>
        <div class="poi"><b>The Green Cup</b><span>9 min</span></div>
      </div>
      <div class="poi-group" data-poi-layer="parks">
        <div class="poi-k"><span class="poi-dot" style="background:#2e5941"></span>Parks</div>
        <div class="poi"><b>Maple Hill Green</b><span>3 min</span></div>
        <div class="poi"><b>Rowan Pocket Park</b><span>7 min</span></div>
      </div>
      <div class="poi-group" data-poi-layer="schools" style="display:none">
        <div class="poi-k"><span class="poi-dot" style="background:#23281f"></span>Schools</div>
        <div class="poi"><b>Maple Hill Elementary</b><span>5 min</span></div>
        <div class="poi"><b>Rowan Middle</b><span>12 min</span></div>
      </div>
      <div class="poi-group" data-poi-layer="transit" style="display:none">
        <div class="poi-k"><span class="poi-dot" style="background:#5a6b8c"></span>Transit</div>
        <div class="poi"><b>Hillcrest station</b><span>9 min</span></div>
        <div class="poi"><b>Route 12 stop</b><span>2 min</span></div>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The neighborhood · Map</span></div>
</div>`,
    }),
    s({
      id: 'oh-timeline',
      name: 'Offer to keys',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">If you love it</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">Offer to keys in five weeks.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Day 0</div><div class="tl-what"><b>Offer submitted</b> — pre-approval letter and proof of funds attached.</div></div>
    <div class="tl-row"><div class="tl-when">Day 3</div><div class="tl-what"><b>Acceptance & escrow</b> — earnest money deposited, timelines locked.</div></div>
    <div class="tl-row"><div class="tl-when">Day 10</div><div class="tl-what"><b>Inspection</b> — sewer scope and chimney included; we negotiate credits, not surprises.</div></div>
    <div class="tl-row"><div class="tl-when">Day 21</div><div class="tl-what"><b>Appraisal</b> — comparables on the previous slide support the number.</div></div>
    <div class="tl-row"><div class="tl-when">Day 35</div><div class="tl-what"><b>Close</b> — final walk-through in the morning, keys by the afternoon.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">The neighborhood · Process</span></div>
</div>`,
    }),
    s({
      id: 'oh-quote',
      name: 'From the sellers',
      transition: 'zoom',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">From the sellers</div>
  <blockquote class="quote reveal" style="margin-top:14px">"Eighteen summers of dinners on that porch. We're not leaving the house — we're handing it on."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">The Hartley family</span><span class="cite-role">Owners since 2008</span></div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">From the sellers</span></div>
</div>`,
    }),
    s({
      id: 'oh-next',
      name: 'Making an offer',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col" style="--col-gap:96px;align-items:center">
    <div class="reveal">
      <div class="kicker">Making an offer</div>
      <h2 class="headline" style="margin-top:8px">Three moves that win here.</h2>
      <p class="lead" style="margin-top:16px">Offers are reviewed Tuesday at noon. Clean terms have beaten higher numbers on this street twice this spring.</p>
    </div>
    <ol class="steps reveal" style="--gap:30px">
      <li class="step"><span><b>Get underwritten, not pre-qualified</b> — it reads as cash-adjacent.</span></li>
      <li class="step"><span><b>Keep the inspection, shorten it</b> — five days signals serious and safe.</span></li>
      <li class="step"><span><b>Write the escalation honestly</b> — caps at your real number, not your hoped one.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">24 Alder Lane</span><span class="runner-label">Your questions · Offers</span></div>
</div>`,
    }),
    s({
      id: 'oh-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="estate-frame"></div>
  <div class="pad end">
    <div class="kicker reveal">Open house · Sat &amp; Sun, 11–2</div>
    <h2 class="display reveal" style="--display-size:120px">Come stand in the light.</h2>
    <p class="lead reveal">Mara Quinn · Quinn &amp; Co. Homes · mara@quinnhomes.example</p>
  </div>
</div>`,
    }),
  ],
}
