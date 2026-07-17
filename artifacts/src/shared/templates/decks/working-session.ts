import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER = 'assets/working-session-cover.jpg'

// Deck-wide behavior: a local sticky wall (add / drag / edit / delete), a tap
// poll, dot voting with live re-ranking, a draggable 2×2 board, and a session
// timer. Everything is local state in this closure — no network, no libraries,
// no accounts. Widgets seed themselves from the authored fallback HTML on first
// init, then re-render from state so slide changes and live edits stay stable.
const RUNTIME_JS = `
(function () {
  var state = { poll: null, votes: null, stickies: null, magnets: null };
  var timer = { total: 600, left: 600, running: false, handle: null };
  var stickyColors = ['yellow', 'coral', 'mint', 'sky'];
  var stickySpawn = [[8, 12], [38, 8], [66, 14], [22, 52], [52, 46], [78, 56], [12, 30], [58, 26]];
  var stickySeq = 0;
  function nextStickyId() { stickySeq += 1; return 'sticky-' + stickySeq; }

  function esc(target) { return target && target.closest ? target : null; }

  /* ---------- Durable host-backed persistence ----------
     The local apps store this in the workspace filesystem; published artifacts
     store it in the outer host page's localStorage. The timer stays transient. */
  var stateStore = window.moldableState('working-session:v1');
  var saved = null;
  var hydrated = false;
  var persistQueued = false;
  var hydration = stateStore.get(null).then(function (value) {
    saved = value;
    hydrated = true;
  }, function () { hydrated = true; });
  function persist() {
    if (!hydrated) { persistQueued = true; return; }
    stateStore.set({
      poll: state.poll, votes: state.votes, stickies: state.stickies, magnets: state.magnets
    }).catch(function () {});
  }

  /* ---------- Poll ---------- */
  function seedPoll(root) {
    if (state.poll) return;
    if (saved && saved.poll) { state.poll = saved.poll; return; }
    state.poll = {};
    root.querySelectorAll('[data-poll-count]').forEach(function (el) {
      state.poll[el.getAttribute('data-poll-count')] = Number(el.textContent) || 0;
    });
  }
  function renderPoll(root) {
    seedPoll(root);
    var total = 0, max = 1;
    Object.keys(state.poll).forEach(function (key) {
      total += state.poll[key];
      max = Math.max(max, state.poll[key]);
    });
    Object.keys(state.poll).forEach(function (key) {
      var count = root.querySelector('[data-poll-count="' + key + '"]');
      var bar = root.querySelector('[data-poll-bar="' + key + '"]');
      if (count) count.textContent = state.poll[key];
      if (bar) bar.style.width = Math.max(4, Math.round(state.poll[key] / max * 100)) + '%';
    });
    var totalEl = root.querySelector('[data-poll-total]');
    if (totalEl) totalEl.textContent = total + (total === 1 ? ' vote' : ' votes');
  }

  /* ---------- Dot voting ---------- */
  function seedVotes(root) {
    if (state.votes) return;
    if (saved && saved.votes) { state.votes = saved.votes; return; }
    state.votes = {};
    root.querySelectorAll('[data-vote-count]').forEach(function (el) {
      state.votes[el.getAttribute('data-vote-count')] = Number(el.textContent) || 0;
    });
  }
  function renderVotes(root) {
    seedVotes(root);
    var entries = Object.keys(state.votes).map(function (key) { return [key, state.votes[key]]; });
    entries.sort(function (a, b) { return b[1] - a[1]; });
    var max = Math.max(1, entries.length ? entries[0][1] : 1);
    var spent = 0;
    entries.forEach(function (entry, rank) {
      spent += entry[1];
      var row = root.querySelector('[data-vote-row="' + entry[0] + '"]');
      if (!row) return;
      row.style.order = rank;
      row.classList.toggle('lead', rank === 0 && entry[1] > 0);
      var count = row.querySelector('[data-vote-count]');
      var bar = row.querySelector('[data-vote-bar]');
      if (count) count.textContent = entry[1];
      if (bar) bar.style.width = Math.max(5, Math.round(entry[1] / max * 100)) + '%';
    });
    var scope = root.closest('.slide') || root;
    var spentEl = scope.querySelector('[data-vote-spent]');
    if (spentEl) spentEl.textContent = spent + ' dots placed';
  }

  /* ---------- Sticky wall ---------- */
  function seedStickies(root) {
    if (state.stickies) return;
    if (saved && saved.stickies) {
      state.stickies = saved.stickies;
      saved.stickies.forEach(function (item) {
        var n = Number(String(item.id).replace('sticky-', ''));
        if (n > stickySeq) stickySeq = n;
      });
      return;
    }
    state.stickies = [];
    root.querySelectorAll('[data-seed-sticky]').forEach(function (el) {
      state.stickies.push({
        id: nextStickyId(),
        text: (el.textContent || '').trim(),
        color: el.getAttribute('data-color') || 'yellow',
        x: Number(el.getAttribute('data-x')) || 10,
        y: Number(el.getAttribute('data-y')) || 10
      });
    });
  }
  function stickyNode(item) {
    var note = document.createElement('div');
    note.className = 'ws-sticky c-' + item.color;
    note.setAttribute('data-drag', 'sticky');
    note.setAttribute('data-sticky-id', item.id);
    note.style.left = item.x + '%';
    note.style.top = item.y + '%';
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ws-sticky-x';
    remove.setAttribute('data-sticky-remove', item.id);
    remove.setAttribute('aria-label', 'Remove note');
    remove.textContent = '×';
    var text = document.createElement('div');
    text.className = 'ws-sticky-text';
    text.setAttribute('contenteditable', 'true');
    text.setAttribute('spellcheck', 'false');
    text.textContent = item.text;
    note.appendChild(remove);
    note.appendChild(text);
    return note;
  }
  function renderStickies(root) {
    seedStickies(root);
    var layer = root.querySelector('[data-sticky-layer]');
    if (!layer) return;
    layer.innerHTML = '';
    state.stickies.forEach(function (item) { layer.appendChild(stickyNode(item)); });
    var scope = root.closest('.slide') || root;
    var countEl = scope.querySelector('[data-sticky-count]');
    if (countEl) countEl.textContent = state.stickies.length + ' ideas on the wall';
  }
  function addSticky(root) {
    var input = root.querySelector('[data-sticky-input]');
    if (!input || !input.value.trim()) return;
    seedStickies(root);
    var spawn = stickySpawn[state.stickies.length % stickySpawn.length];
    state.stickies.push({
      id: nextStickyId(),
      text: input.value.trim(),
      color: stickyColors[state.stickies.length % stickyColors.length],
      x: spawn[0], y: spawn[1]
    });
    input.value = '';
    renderStickies(root);
    persist();
    var added = root.querySelector('[data-sticky-id="sticky-' + stickySeq + '"]');
    if (added && added.scrollIntoView) added.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    input.focus();
  }

  /* ---------- 2×2 magnets ---------- */
  function seedMagnets(root) {
    if (state.magnets) return;
    if (saved && saved.magnets) { state.magnets = saved.magnets; return; }
    state.magnets = [];
    root.querySelectorAll('[data-magnet]').forEach(function (el) {
      state.magnets.push({
        id: el.getAttribute('data-magnet'),
        x: Number(el.getAttribute('data-x')) || 50,
        y: Number(el.getAttribute('data-y')) || 50
      });
    });
  }
  function renderMagnets(root) {
    seedMagnets(root);
    var counts = { q1: 0, q2: 0, q3: 0, q4: 0 };
    state.magnets.forEach(function (item) {
      var el = root.querySelector('[data-magnet="' + item.id + '"]');
      if (el) { el.style.left = item.x + '%'; el.style.top = item.y + '%'; }
      var top = item.y < 50, left = item.x < 50;
      var quadrant = top ? (left ? 'q1' : 'q2') : (left ? 'q3' : 'q4');
      counts[quadrant] += 1;
    });
    Object.keys(counts).forEach(function (key) {
      var el = root.querySelector('[data-quad-count="' + key + '"]');
      if (el) el.textContent = counts[key];
    });
  }

  /* ---------- Shared drag (stickies + magnets) ---------- */
  var drag = null;
  document.addEventListener('pointerdown', function (event) {
    if (!hydrated) return;
    var target = esc(event.target);
    if (!target) return;
    if (target.closest('[contenteditable], button, input')) return;
    var el = target.closest('[data-drag]');
    if (!el) return;
    var area = el.closest('[data-drag-area]');
    if (!area) return;
    var box = area.getBoundingClientRect();
    var elBox = el.getBoundingClientRect();
    drag = {
      el: el, area: area, box: box,
      offsetX: event.clientX - elBox.left,
      offsetY: event.clientY - elBox.top,
      width: elBox.width, height: elBox.height
    };
    el.classList.add('dragging');
    if (el.setPointerCapture) { try { el.setPointerCapture(event.pointerId); } catch (e) {} }
    event.preventDefault();
  });
  document.addEventListener('pointermove', function (event) {
    if (!drag) return;
    var x = (event.clientX - drag.offsetX - drag.box.left) / (drag.box.width - drag.width) * 100;
    var y = (event.clientY - drag.offsetY - drag.box.top) / (drag.box.height - drag.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    drag.el.style.left = x * (drag.box.width - drag.width) / drag.box.width + '%';
    drag.el.style.top = y * (drag.box.height - drag.height) / drag.box.height + '%';
    drag.x = x; drag.y = y;
  });
  document.addEventListener('pointerup', function () {
    if (!drag) return;
    var el = drag.el;
    el.classList.remove('dragging');
    var left = parseFloat(el.style.left) || 0;
    var top = parseFloat(el.style.top) || 0;
    var stickyId = el.getAttribute('data-sticky-id');
    if (stickyId && state.stickies) {
      state.stickies.forEach(function (item) {
        if (item.id === stickyId) { item.x = left; item.y = top; }
      });
    }
    var magnetId = el.getAttribute('data-magnet');
    if (magnetId && state.magnets) {
      state.magnets.forEach(function (item) {
        if (item.id === magnetId) { item.x = left; item.y = top; }
      });
      var quadRoot = el.closest('[data-quad]');
      if (quadRoot) renderMagnets(quadRoot);
    }
    persist();
    drag = null;
  });

  /* ---------- Timer ---------- */
  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var sec = seconds % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function renderTimer() {
    document.querySelectorAll('[data-timer]').forEach(function (root) {
      var out = root.querySelector('[data-timer-out]');
      var ring = root.querySelector('[data-timer-ring]');
      var toggle = root.querySelector('[data-timer-toggle]');
      if (out) out.textContent = formatTime(timer.left);
      if (ring) {
        var pct = timer.total > 0 ? (timer.total - timer.left) / timer.total * 100 : 0;
        ring.style.background = 'conic-gradient(var(--accent) ' + pct + '%, rgba(43,38,36,0.08) 0)';
      }
      if (toggle) toggle.textContent = timer.running ? 'Pause' : (timer.left < timer.total && timer.left > 0 ? 'Resume' : 'Start');
      root.classList.toggle('done', timer.left === 0);
      root.querySelectorAll('[data-timer-set]').forEach(function (chip) {
        chip.classList.toggle('on', Number(chip.getAttribute('data-timer-set')) === timer.total);
      });
    });
  }
  function tickTimer() {
    if (!timer.running) return;
    timer.left = Math.max(0, timer.left - 1);
    if (timer.left === 0) timer.running = false;
    renderTimer();
  }
  function ensureTimerLoop() {
    if (timer.handle) return;
    timer.handle = setInterval(tickTimer, 1000);
  }

  /* ---------- Delegated events ---------- */
  document.addEventListener('click', function (event) {
    if (!hydrated) return;
    var target = esc(event.target);
    if (!target) return;
    var pollVote = target.closest('[data-poll-vote]');
    if (pollVote) {
      var pollRoot = pollVote.closest('[data-poll]');
      if (pollRoot) {
        seedPoll(pollRoot);
        var key = pollVote.getAttribute('data-poll-vote');
        state.poll[key] = (state.poll[key] || 0) + 1;
        renderPoll(pollRoot);
        persist();
      }
      return;
    }
    var pollReset = target.closest('[data-poll-reset]');
    if (pollReset) {
      var resetRoot = pollReset.closest('[data-poll]');
      if (resetRoot && state.poll) {
        Object.keys(state.poll).forEach(function (key) { state.poll[key] = 0; });
        renderPoll(resetRoot);
        persist();
      }
      return;
    }
    var voteUp = target.closest('[data-vote-up]');
    var voteDown = target.closest('[data-vote-down]');
    if (voteUp || voteDown) {
      var voteRoot = (voteUp || voteDown).closest('[data-dotvote]');
      if (voteRoot) {
        seedVotes(voteRoot);
        var voteKey = (voteUp || voteDown).getAttribute(voteUp ? 'data-vote-up' : 'data-vote-down');
        var next = (state.votes[voteKey] || 0) + (voteUp ? 1 : -1);
        state.votes[voteKey] = Math.max(0, next);
        renderVotes(voteRoot);
        persist();
      }
      return;
    }
    var stickyAdd = target.closest('[data-sticky-add]');
    if (stickyAdd) {
      var boardRoot = stickyAdd.closest('[data-board]');
      if (boardRoot) addSticky(boardRoot);
      return;
    }
    var stickyRemove = target.closest('[data-sticky-remove]');
    if (stickyRemove) {
      var removeRoot = stickyRemove.closest('[data-board]');
      var removeId = stickyRemove.getAttribute('data-sticky-remove');
      if (removeRoot && state.stickies) {
        state.stickies = state.stickies.filter(function (item) { return item.id !== removeId; });
        renderStickies(removeRoot);
        persist();
      }
      return;
    }
    var timerSet = target.closest('[data-timer-set]');
    if (timerSet) {
      timer.total = Number(timerSet.getAttribute('data-timer-set')) || 600;
      timer.left = timer.total;
      timer.running = false;
      renderTimer();
      return;
    }
    var timerToggle = target.closest('[data-timer-toggle]');
    if (timerToggle) {
      if (timer.left === 0) timer.left = timer.total;
      timer.running = !timer.running;
      ensureTimerLoop();
      renderTimer();
      return;
    }
    var timerReset = target.closest('[data-timer-reset]');
    if (timerReset) {
      timer.left = timer.total;
      timer.running = false;
      renderTimer();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!hydrated) return;
    if (event.key !== 'Enter') return;
    var target = esc(event.target);
    if (!target) return;
    var input = target.closest('[data-sticky-input]');
    if (input) {
      event.preventDefault();
      var boardRoot = input.closest('[data-board]');
      if (boardRoot) addSticky(boardRoot);
    }
  });

  document.addEventListener('input', function (event) {
    if (!hydrated) return;
    var target = esc(event.target);
    if (!target) return;
    var text = target.closest('.ws-sticky-text');
    if (!text || !state.stickies) return;
    var host = text.closest('[data-sticky-id]');
    if (!host) return;
    var id = host.getAttribute('data-sticky-id');
    state.stickies.forEach(function (item) {
      if (item.id === id) item.text = text.textContent || '';
    });
    persist();
  });

  function init() {
    // The desktop filesystem bridge is asynchronous. Do not seed the in-memory
    // widgets from authored fallback HTML before its saved state has arrived.
    if (!hydrated) return;
    document.querySelectorAll('[data-poll]').forEach(renderPoll);
    document.querySelectorAll('[data-dotvote]').forEach(renderVotes);
    document.querySelectorAll('[data-board]').forEach(renderStickies);
    document.querySelectorAll('[data-quad]').forEach(renderMagnets);
    renderTimer();
  }
  document.addEventListener('deck:slidechange', init);
  document.addEventListener('deck:slidepatch', init);
  hydration.then(function () { init(); if (persistQueued) persist(); });
})();
`.trim()

export const workingSession: Template = {
  id: 'working-session',
  kind: 'deck',
  categories: ['Decks'],
  name: 'Working Session',
  tagline: 'The deck that becomes the whiteboard',
  audiences: ['team lead', 'facilitator', 'product'],
  description:
    'A bright, paper-and-marker facilitation deck where the exercises actually run inside the slides: a sticky wall you add and drag notes on, a tap poll, dot voting that re-ranks live, a draggable 2×2 board, and a session timer. Everything is local to the room — one screen, one facilitator, zero setup.',
  fonts: {
    display: 'Gabarito',
    body: 'Gabarito',
    links: [
      'https://fonts.googleapis.com/css2?family=Gabarito:wght@400;500;600;700;800&family=Caveat:wght@500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fbf8f1',
    '--text': '#2b2624',
    '--muted': '#8a8177',
    '--accent': '#e8563f',
    '--accent-2': '#2f9e77',
    '--display': "'Gabarito', sans-serif",
    '--body': "'Gabarito', sans-serif",
    '--display-weight': '800',
    '--headline-weight': '700',
    '--title-size': '128px',
    '--display-size': '152px',
    '--headline-size': '80px',
    '--subhead-size': '48px',
    '--lead-size': '37px',
    '--bullet-size': '34px',
    '--kicker-font': "'Gabarito', sans-serif",
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': 'rgba(43,38,36,0.12)',
    '--card-shadow': '0 10px 26px -14px rgba(43,38,36,0.22)',
    '--radius': '18px',
    '--stat-size': '96px',
    '--metric-size': '120px',
    '--th-border': 'rgba(43,38,36,0.55)',
    '--table-border': 'rgba(43,38,36,0.12)',
    '--table-size': '29px',
    '--rule-color': 'rgba(43,38,36,0.16)',
    '--bullet-color': '#e8563f',
    '--chip-bg': 'rgba(232,86,63,0.1)',
    '--media-radius': '18px',
    '--media-border': '1px solid rgba(43,38,36,0.12)',
    '--media-shadow': '0 30px 60px -30px rgba(43,38,36,0.4)',
    '--scrim':
      'linear-gradient(180deg, rgba(30,26,24,0.08) 0%, rgba(30,26,24,0.4) 55%, rgba(30,26,24,0.85) 100%)',
    '--pos': '#2f9e77',
    '--neg': '#d64550',
  },
  stageBg: '#efe9dd',
  assets: ['working-session-cover.jpg'],
  decoration: `.kicker { color: var(--accent); }
.stat-num, .metric, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.runner-brand::before { border-radius: 50%; background: var(--accent); }

/* ---- Dot-grid paper background for content slides ---- */
.paper-dots { position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(43,38,36,0.1) 1.6px, transparent 1.6px);
  background-size: 46px 46px; }

/* ---- Hand-written annotation (Caveat) ---- */
.hand { font-family: 'Caveat', cursive; font-weight: 600; font-size: 42px; color: var(--accent); transform: rotate(-2deg); display: inline-block; }
.hand.green { color: var(--accent-2); }

/* ---- Masking-tape chip ---- */
.tape { position: relative; }
.tape::before { content: ''; position: absolute; top: -16px; left: 50%; width: 128px; height: 32px; transform: translateX(-50%) rotate(-3deg); background: rgba(224,205,160,0.75); box-shadow: 0 2px 5px rgba(43,38,36,0.12); z-index: 2; }

/* ---- Agenda rows with time chips ---- */
.ag { display: flex; gap: 26px; align-items: center; padding: 24px 0; border-top: 2px dashed rgba(43,38,36,0.14); }
.ag-time { flex: 0 0 auto; font: 700 24px var(--body); color: #fff; background: var(--accent-2); border-radius: 999px; padding: 8px 20px; }
.ag-t { font: 700 40px var(--display); color: var(--text); }
.ag-d { font: 400 25px var(--body); color: var(--muted); margin-top: 2px; }

/* ---- Divider treatment: giant marker underline ---- */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font: 800 24px var(--body); letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent-2); }
.divider-title { font: 800 150px var(--display); line-height: 0.98; letter-spacing: -0.02em; color: var(--text); }
.divider-scribble { width: 240px; height: 14px; border-radius: 8px; background: var(--accent); transform: rotate(-1deg); margin-top: 8px; }
.divider-meta { font: 500 27px var(--body); color: var(--muted); }

/* ---- Control buttons shared by the widgets ---- */
.ws-btn { appearance: none; cursor: pointer; border: 2px solid var(--text); background: #fff; color: var(--text); font: 700 22px var(--body); padding: 12px 26px; border-radius: 999px; box-shadow: 0 3px 0 var(--text); transition: transform 0.08s ease, box-shadow 0.08s ease; }
.ws-btn:active { transform: translateY(3px); box-shadow: 0 0 0 var(--text); }
.ws-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 3px 0 #a83e2d; }
.ws-btn.on { background: var(--accent-2); border-color: var(--accent-2); color: #fff; box-shadow: 0 3px 0 #1f6e52; }
.ws-btn:focus-visible { outline: 3px solid rgba(232,86,63,0.5); outline-offset: 2px; }

/* ---- Tap poll ---- */
.poll { display: flex; flex-direction: column; gap: 18px; }
.poll-row { display: grid; grid-template-columns: 340px 1fr 90px; gap: 22px; align-items: center; }
.poll-row button { text-align: left; appearance: none; cursor: pointer; border: 2px solid rgba(43,38,36,0.16); background: #fff; border-radius: 16px; padding: 18px 24px; font: 700 27px var(--body); color: var(--text); box-shadow: var(--card-shadow); }
.poll-row button:hover { border-color: var(--accent); }
.poll-row button:focus-visible { outline: 3px solid rgba(232,86,63,0.5); outline-offset: 2px; }
.poll-track { height: 44px; border-radius: 12px; background: rgba(43,38,36,0.06); overflow: hidden; }
.poll-fill { height: 100%; border-radius: 12px; background: var(--accent); transition: width 0.35s cubic-bezier(0.16,1,0.3,1); }
.poll-row:nth-child(2) .poll-fill { background: var(--accent-2); }
.poll-row:nth-child(3) .poll-fill { background: #eab308; }
.poll-row:nth-child(4) .poll-fill { background: #5a9bd5; }
.poll-n { font: 800 40px var(--display); color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }
.poll-total { font: 600 24px var(--body); color: var(--muted); }

/* ---- Sticky wall ----
   The visible frame is a scrollable viewport over a taller canvas, so the wall
   has room to grow as ideas pile up (wheel/touch inside data-deck-interactive
   scrolls the wall, never the deck). */
.ws-board-viewport { height: 620px; overflow-y: auto; border: 3px dashed rgba(43,38,36,0.2); border-radius: 22px; background: #fff; }
.ws-board-viewport::-webkit-scrollbar { width: 9px; }
.ws-board-viewport::-webkit-scrollbar-thumb { background: rgba(43,38,36,0.2); border-radius: 5px; }
.ws-board { position: relative; height: 980px; }
.ws-toolbar { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; }
.ws-toolbar input { flex: 1; border: 2px solid rgba(43,38,36,0.18); border-radius: 999px; background: #fff; font: 500 25px var(--body); color: var(--text); padding: 14px 28px; }
.ws-toolbar input:focus { outline: 3px solid rgba(232,86,63,0.4); outline-offset: 1px; }
.ws-sticky { position: absolute; width: 236px; min-height: 172px; padding: 34px 20px 18px; box-shadow: 0 12px 22px -10px rgba(43,38,36,0.35); cursor: grab; touch-action: none; }
.ws-sticky.dragging { cursor: grabbing; z-index: 30; box-shadow: 0 24px 40px -14px rgba(43,38,36,0.45); }
.ws-sticky::before { content: '⋮⋮'; position: absolute; top: 6px; left: 50%; transform: translateX(-50%) rotate(90deg); letter-spacing: 2px; color: rgba(43,38,36,0.3); font-size: 18px; }
.ws-sticky:nth-child(4n+1) { transform: rotate(-1.6deg); }
.ws-sticky:nth-child(4n+2) { transform: rotate(1.2deg); }
.ws-sticky:nth-child(4n+3) { transform: rotate(2deg); }
.ws-sticky:nth-child(4n) { transform: rotate(-0.8deg); }
.ws-sticky.c-yellow { background: #ffd66b; }
.ws-sticky.c-coral { background: #ffa08c; }
.ws-sticky.c-mint { background: #9fe3c0; }
.ws-sticky.c-sky { background: #a5d8f3; }
.ws-sticky-text { font: 600 26px 'Caveat', cursive; font-size: 30px; line-height: 1.15; color: #33302c; outline: none; min-height: 100px; cursor: text; }
.ws-sticky-x { position: absolute; top: 4px; right: 8px; appearance: none; border: 0; background: transparent; color: rgba(43,38,36,0.4); font-size: 26px; line-height: 1; cursor: pointer; padding: 4px; }
.ws-sticky-x:hover { color: var(--neg); }
.ws-hint { font: 500 22px var(--body); color: var(--muted); }

/* ---- Dot voting ---- */
.dv { display: flex; flex-direction: column; gap: 16px; }
.dv-row { display: grid; grid-template-columns: 300px 1fr 150px; gap: 20px; align-items: center; background: #fff; border: 2px solid rgba(43,38,36,0.1); border-radius: 16px; padding: 16px 22px; box-shadow: var(--card-shadow); transition: order 0s; }
.dv-row.lead { border-color: var(--accent-2); }
.dv-row.lead .dv-name::after { content: ' ★'; color: var(--accent-2); }
.dv-name { font: 700 28px var(--body); color: var(--text); }
.dv-track { height: 34px; border-radius: 10px; background: rgba(43,38,36,0.06); overflow: hidden; }
.dv-fill { height: 100%; border-radius: 10px; background: var(--accent-2); transition: width 0.35s cubic-bezier(0.16,1,0.3,1); }
.dv-controls { display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
.dv-controls button { appearance: none; cursor: pointer; width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--text); background: #fff; font: 800 24px var(--body); color: var(--text); }
.dv-controls button:hover { background: var(--accent-2); border-color: var(--accent-2); color: #fff; }
.dv-count { font: 800 34px var(--display); min-width: 40px; text-align: center; font-variant-numeric: tabular-nums; }

/* ---- 2×2 board ---- */
.quad-wrap { display: grid; grid-template-columns: 1fr 300px; gap: 40px; align-items: stretch; }
.quad { position: relative; height: 600px; background: #fff; border: 2px solid rgba(43,38,36,0.14); border-radius: 20px; }
.quad::before { content: ''; position: absolute; left: 50%; top: 16px; bottom: 16px; width: 2px; background: rgba(43,38,36,0.14); }
.quad::after { content: ''; position: absolute; top: 50%; left: 16px; right: 16px; height: 2px; background: rgba(43,38,36,0.14); }
.quad-label { position: absolute; font: 700 21px var(--body); letter-spacing: 0.14em; text-transform: uppercase; color: rgba(43,38,36,0.34); pointer-events: none; }
.quad-count { position: absolute; font: 800 30px var(--display); color: rgba(43,38,36,0.24); pointer-events: none; }
.magnet { position: absolute; padding: 12px 22px; border-radius: 999px; font: 700 24px var(--body); color: #fff; background: var(--accent); box-shadow: 0 8px 16px -8px rgba(43,38,36,0.5); cursor: grab; touch-action: none; white-space: nowrap; }
.magnet.dragging { cursor: grabbing; z-index: 30; }
.magnet.alt { background: var(--accent-2); }
.magnet.alt2 { background: #5a9bd5; }
.quad-side { display: flex; flex-direction: column; gap: 18px; justify-content: center; }
.axis { font: 700 23px var(--body); color: var(--muted); }

/* ---- Session timer ---- */
.timer { display: grid; grid-template-columns: 420px 1fr; gap: 70px; align-items: center; }
.timer-ring { width: 400px; height: 400px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--accent) 0%, rgba(43,38,36,0.08) 0); }
.timer-ring::before { content: ''; position: absolute; width: 336px; height: 336px; border-radius: 50%; background: var(--bg); }
.timer-digits { position: relative; font: 800 108px var(--display); color: var(--text); font-variant-numeric: tabular-nums; letter-spacing: 0; }
.timer.done .timer-digits { color: var(--accent); }
.timer-side { display: flex; flex-direction: column; gap: 26px; }
.timer-controls { display: flex; gap: 14px; flex-wrap: wrap; }

/* ---- Phone reflow: scale bespoke decoration for a ~390px canvas ---- */
@media (max-width: 640px) {
  html.deck-can-flow .divider { padding: 56px 26px !important; }
  html.deck-can-flow .divider-title { font-size: min(50px, 13.5vw) !important; }
  html.deck-can-flow .divider-scribble { width: 120px; height: 8px; }
  html.deck-can-flow .hand { font-size: 26px !important; }
  html.deck-can-flow .ag { gap: 12px; padding: 14px 0; flex-wrap: wrap; }
  html.deck-can-flow .ag-time { font-size: 14px; padding: 5px 12px; }
  html.deck-can-flow .ag-t { font-size: 22px !important; }
  html.deck-can-flow .ag-d { font-size: 16px !important; }
  html.deck-can-flow .poll-row { grid-template-columns: 1fr 64px; gap: 10px; }
  html.deck-can-flow .poll-row button { font-size: 18px; padding: 12px 16px; grid-column: 1 / -1; }
  html.deck-can-flow .poll-track { height: 26px; }
  html.deck-can-flow .poll-n { font-size: 22px !important; }
  html.deck-can-flow .ws-toolbar { flex-wrap: wrap; }
  html.deck-can-flow .ws-toolbar input { font-size: 17px; padding: 10px 18px; }
  html.deck-can-flow .ws-btn { font-size: 15px; padding: 9px 16px; }
  html.deck-can-flow .ws-board-viewport { height: 440px; }
  html.deck-can-flow .ws-board { height: 760px; }
  html.deck-can-flow .ws-sticky { width: 148px; min-height: 116px; padding: 24px 12px 10px; }
  html.deck-can-flow .ws-sticky-text { font-size: 20px; min-height: 64px; }
  html.deck-can-flow .ws-hint { font-size: 14px !important; }
  html.deck-can-flow .dv-row { grid-template-columns: 1fr; gap: 10px; padding: 12px 16px; }
  html.deck-can-flow .dv-name { font-size: 18px !important; }
  html.deck-can-flow .dv-track { height: 22px; }
  html.deck-can-flow .dv-controls { justify-content: flex-start; }
  html.deck-can-flow .dv-controls button { width: 38px; height: 38px; font-size: 18px; }
  html.deck-can-flow .dv-count { font-size: 22px !important; }
  html.deck-can-flow .quad-wrap { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .quad { height: 380px; }
  html.deck-can-flow .quad-label { font-size: 12px !important; letter-spacing: 0.08em; }
  html.deck-can-flow .quad-count { font-size: 18px !important; }
  html.deck-can-flow .magnet { font-size: 14px; padding: 8px 14px; }
  html.deck-can-flow .timer { grid-template-columns: 1fr !important; gap: 24px !important; justify-items: center; }
  html.deck-can-flow .timer-ring { width: 240px; height: 240px; }
  html.deck-can-flow .timer-ring::before { width: 198px; height: 198px; }
  html.deck-can-flow .timer-digits { font-size: 56px !important; }
  html.deck-can-flow .tape::before { width: 84px; height: 22px; top: -11px; }
}`,
  runtime: {
    libs: [],
    js: RUNTIME_JS,
    connectOrigins: [],
    frameOrigins: [],
  },
  notes:
    "A 90-minute Q3 planning session that runs inside the deck: a tap poll, a sticky wall (add, drag, edit, delete — seeded from the authored fallback notes), dot voting that re-ranks live, a draggable 2×2 priority board, and a session timer. All state is local to the open deck — one facilitator screen, no accounts, no network — and persists through window.moldableState('working-session:v1') (workspace filesystem in Slides/Artifacts; per-browser localStorage when published). The wall, votes, poll, and 2×2 survive reloads; the timer stays transient; thumbnails never touch state. Keep data-deck-interactive on widget roots, keep the drag surfaces touch-action:none, and keep listeners delegated. Look: warm paper, dot grid, marker coral + green, Gabarito everywhere with Caveat ONLY for hand annotations and sticky text. Rounded, tactile, playful — never childish.",
  sampleSlides: [
    s({
      id: 'ws-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#ffd66b">Q3 planning · 90 minutes · Relay team</div>
    <h1 class="title reveal" style="margin-top:10px;color:#fff">Working session.</h1>
    <p class="lead reveal" style="max-width:36ch">Bring opinions. Leave with a plan.</p>
  </div>
</div>`,
    }),
    s({
      id: 'ws-mission',
      name: 'The mission',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Why we're in a room</div>
    <h2 class="headline reveal">One decision<br/>by 3:30.</h2>
    <p class="lead reveal" style="max-width:30ch">What does Relay ship first in Q3 — and what do we deliberately <b>not</b> do?</p>
    <div class="hand reveal">no laptops — the deck is the whiteboard →</div>
  </div>
  <figure class="media tape reveal"><img src="${COVER}" alt="A wall of blank sticky notes"></figure>
</div>`,
    }),
    s({
      id: 'ws-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="kicker reveal">The next 90 minutes</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:20px">Four blocks, one output.</h2>
  <div class="reveal">
    <div class="ag"><span class="ag-time">10 min</span><div><div class="ag-t">Warm up</div><div class="ag-d">Ground rules + a pulse check on the room</div></div></div>
    <div class="ag"><span class="ag-time">25 min</span><div><div class="ag-t">Diverge</div><div class="ag-d">Silent writing — every idea goes on the wall</div></div></div>
    <div class="ag"><span class="ag-time">30 min</span><div><div class="ag-t">Converge</div><div class="ag-d">Dot vote, then place the top ideas on the 2×2</div></div></div>
    <div class="ag"><span class="ag-time">25 min</span><div><div class="ag-t">Commit</div><div class="ag-d">Owners, dates, and what we're saying no to</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'ws-sec-warmup',
      name: 'Section · Warm up',
      transition: 'fade',
      bodyHtml: `<div class="paper-dots"></div>
<div class="divider">
  <div class="divider-num reveal">Block 01 · 10 min</div>
  <div class="divider-title reveal">Warm up.</div>
  <div class="divider-scribble reveal"></div>
  <div class="divider-meta reveal">Rules of the room, then a pulse check</div>
</div>`,
    }),
    s({
      id: 'ws-rules',
      name: 'Ground rules',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">Ground rules</div>
      <h2 class="headline" style="margin-top:6px">Three rules, zero exceptions.</h2>
    </div>
    <button class="ws-btn primary" data-deck-advance>Next rule →</button>
  </div>
  <div class="cards" style="--cols:3;margin-top:30px">
    <div class="card tape" data-build="1"><div class="card-num" style="color:var(--accent)">Rule 01</div><div class="card-title">Loud drafts, quiet edits</div><div class="card-body">Half-formed ideas out loud; critique goes on stickies, not over people.</div></div>
    <div class="card tape" data-build="2"><div class="card-num" style="color:var(--accent-2)">Rule 02</div><div class="card-title">The timer is the boss</div><div class="card-body">When it rings, we move. Unfinished threads go to the parking lot.</div></div>
    <div class="card tape" data-build="3"><div class="card-num" style="color:#5a9bd5">Rule 03</div><div class="card-title">Disagree, then commit</div><div class="card-body">We leave with one plan — including the people who argued for the other one.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Warm up · Rules</span></div>
</div>`,
    }),
    s({
      id: 'ws-poll',
      name: 'Pulse check',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">Pulse check · tap to vote</div>
      <h2 class="headline" style="margin-top:6px">How are we walking in?</h2>
    </div>
    <span class="hand green">tap your answer ↓</span>
  </div>
  <div class="poll reveal" data-poll data-deck-interactive style="margin-top:26px" aria-live="polite">
    <div class="poll-row"><button type="button" data-poll-vote="fired">Fired up</button><div class="poll-track"><div class="poll-fill" data-poll-bar="fired" style="width:60%"></div></div><div class="poll-n" data-poll-count="fired">3</div></div>
    <div class="poll-row"><button type="button" data-poll-vote="optimistic">Cautiously optimistic</button><div class="poll-track"><div class="poll-fill" data-poll-bar="optimistic" style="width:100%"></div></div><div class="poll-n" data-poll-count="optimistic">5</div></div>
    <div class="poll-row"><button type="button" data-poll-vote="stretched">Stretched thin</button><div class="poll-track"><div class="poll-fill" data-poll-bar="stretched" style="width:40%"></div></div><div class="poll-n" data-poll-count="stretched">2</div></div>
    <div class="poll-row"><button type="button" data-poll-vote="coffee">Send coffee</button><div class="poll-track"><div class="poll-fill" data-poll-bar="coffee" style="width:20%"></div></div><div class="poll-n" data-poll-count="coffee">1</div></div>
    <div class="row" style="justify-content:space-between;margin-top:6px">
      <span class="poll-total" data-poll-total>11 votes</span>
      <button type="button" class="ws-btn" data-poll-reset>Reset</button>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Warm up · Pulse</span></div>
</div>`,
    }),
    s({
      id: 'ws-sec-diverge',
      name: 'Section · Diverge',
      transition: 'fade',
      bodyHtml: `<div class="paper-dots"></div>
<div class="divider">
  <div class="divider-num reveal">Block 02 · 25 min</div>
  <div class="divider-title reveal">Diverge.</div>
  <div class="divider-scribble reveal" style="background:var(--accent-2)"></div>
  <div class="divider-meta reveal">Every idea on the wall — volume first, judgment later</div>
</div>`,
    }),
    s({
      id: 'ws-board',
      name: 'Sticky wall',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end;margin-bottom:14px">
    <div>
      <div class="kicker">The wall · silent writing</div>
      <h2 class="headline" style="margin-top:6px">What should Relay ship first?</h2>
    </div>
    <span class="ws-hint" data-sticky-count>6 ideas on the wall</span>
  </div>
  <div data-board data-deck-interactive>
    <div class="ws-toolbar reveal">
      <input type="text" data-sticky-input placeholder="Type an idea, press Enter…" aria-label="New sticky note text">
      <button type="button" class="ws-btn primary" data-sticky-add>Add it</button>
      <span class="ws-hint">drag to move · click text to edit · × to remove</span>
    </div>
    <div class="ws-board-viewport reveal"><div class="ws-board" data-drag-area data-sticky-layer>
      <div class="ws-sticky c-yellow" data-seed-sticky data-color="yellow" data-x="6" data-y="10" style="left:6%;top:10%">Offline mode for field crews</div>
      <div class="ws-sticky c-coral" data-seed-sticky data-color="coral" data-x="30" data-y="34" style="left:30%;top:34%">Faster CSV import</div>
      <div class="ws-sticky c-mint" data-seed-sticky data-color="mint" data-x="54" data-y="12" style="left:54%;top:12%">Template gallery</div>
      <div class="ws-sticky c-sky" data-seed-sticky data-color="sky" data-x="76" data-y="40" style="left:76%;top:40%">API v2 + webhooks</div>
      <div class="ws-sticky c-yellow" data-seed-sticky data-color="yellow" data-x="16" data-y="62" style="left:16%;top:62%">Mobile quick-capture</div>
      <div class="ws-sticky c-mint" data-seed-sticky data-color="mint" data-x="52" data-y="64" style="left:52%;top:64%">Shared team inbox</div>
    </div></div>
  </div>
</div>`,
    }),
    s({
      id: 'ws-timer',
      name: 'Timer',
      transition: 'zoom',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad center">
  <div class="timer reveal" data-timer data-deck-interactive>
    <div style="position:relative;display:grid;place-items:center">
      <div class="timer-ring" data-timer-ring></div>
      <div class="timer-digits" style="position:absolute" data-timer-out>10:00</div>
    </div>
    <div class="timer-side">
      <div>
        <div class="kicker">Silent writing</div>
        <h2 class="headline" style="margin-top:6px">Heads down.<br/>Pens moving.</h2>
        <p class="lead" style="margin-top:12px;max-width:26ch">No talking until it rings — quantity now, quality in the next block.</p>
      </div>
      <div class="timer-controls">
        <button type="button" class="ws-btn" data-timer-set="300">5 min</button>
        <button type="button" class="ws-btn on" data-timer-set="600">10 min</button>
        <button type="button" class="ws-btn" data-timer-set="900">15 min</button>
        <button type="button" class="ws-btn primary" data-timer-toggle>Start</button>
        <button type="button" class="ws-btn" data-timer-reset>Reset</button>
      </div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'ws-sec-converge',
      name: 'Section · Converge',
      transition: 'fade',
      bodyHtml: `<div class="paper-dots"></div>
<div class="divider">
  <div class="divider-num reveal">Block 03 · 30 min</div>
  <div class="divider-title reveal">Converge.</div>
  <div class="divider-scribble reveal" style="background:#5a9bd5"></div>
  <div class="divider-meta reveal">Ten dots each — spend them like money</div>
</div>`,
    }),
    s({
      id: 'ws-dotvote',
      name: 'Dot voting',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end;margin-bottom:20px">
    <div>
      <div class="kicker">Dot vote · 10 dots per person</div>
      <h2 class="headline" style="margin-top:6px">Spend your dots.</h2>
    </div>
    <span class="ws-hint" data-vote-spent>20 dots placed</span>
  </div>
  <div class="dv reveal" data-dotvote data-deck-interactive aria-live="polite">
    <div class="dv-row lead" data-vote-row="offline" style="order:0"><div class="dv-name">Offline mode</div><div class="dv-track"><div class="dv-fill" data-vote-bar style="width:100%"></div></div><div class="dv-controls"><button type="button" data-vote-down="offline" aria-label="Remove a dot from Offline mode">−</button><span class="dv-count" data-vote-count="offline">6</span><button type="button" data-vote-up="offline" aria-label="Add a dot to Offline mode">+</button></div></div>
    <div class="dv-row" data-vote-row="templates" style="order:1"><div class="dv-name">Template gallery</div><div class="dv-track"><div class="dv-fill" data-vote-bar style="width:83%"></div></div><div class="dv-controls"><button type="button" data-vote-down="templates" aria-label="Remove a dot from Template gallery">−</button><span class="dv-count" data-vote-count="templates">5</span><button type="button" data-vote-up="templates" aria-label="Add a dot to Template gallery">+</button></div></div>
    <div class="dv-row" data-vote-row="import" style="order:2"><div class="dv-name">Faster import</div><div class="dv-track"><div class="dv-fill" data-vote-bar style="width:66%"></div></div><div class="dv-controls"><button type="button" data-vote-down="import" aria-label="Remove a dot from Faster import">−</button><span class="dv-count" data-vote-count="import">4</span><button type="button" data-vote-up="import" aria-label="Add a dot to Faster import">+</button></div></div>
    <div class="dv-row" data-vote-row="mobile" style="order:3"><div class="dv-name">Mobile capture</div><div class="dv-track"><div class="dv-fill" data-vote-bar style="width:50%"></div></div><div class="dv-controls"><button type="button" data-vote-down="mobile" aria-label="Remove a dot from Mobile capture">−</button><span class="dv-count" data-vote-count="mobile">3</span><button type="button" data-vote-up="mobile" aria-label="Add a dot to Mobile capture">+</button></div></div>
    <div class="dv-row" data-vote-row="api" style="order:4"><div class="dv-name">API v2</div><div class="dv-track"><div class="dv-fill" data-vote-bar style="width:33%"></div></div><div class="dv-controls"><button type="button" data-vote-down="api" aria-label="Remove a dot from API v2">−</button><span class="dv-count" data-vote-count="api">2</span><button type="button" data-vote-up="api" aria-label="Add a dot to API v2">+</button></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Converge · Dot vote</span></div>
</div>`,
    }),
    s({
      id: 'ws-quad',
      name: 'Impact vs effort',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end;margin-bottom:16px">
    <div>
      <div class="kicker">The 2×2 · drag the magnets</div>
      <h2 class="headline" style="margin-top:6px">Where does each bet land?</h2>
    </div>
    <span class="hand">argue with your hands →</span>
  </div>
  <div class="quad-wrap reveal" data-quad data-deck-interactive>
    <div class="quad" data-drag-area>
      <span class="quad-label" style="top:22px;left:26px">Do first</span>
      <span class="quad-label" style="top:22px;right:26px">Big bets</span>
      <span class="quad-label" style="bottom:22px;left:26px">Nice-to-haves</span>
      <span class="quad-label" style="bottom:22px;right:26px">Money pits</span>
      <span class="quad-count" style="top:52px;left:26px" data-quad-count="q1">2</span>
      <span class="quad-count" style="top:52px;right:26px" data-quad-count="q2">1</span>
      <span class="quad-count" style="bottom:52px;left:26px" data-quad-count="q3">1</span>
      <span class="quad-count" style="bottom:52px;right:26px" data-quad-count="q4">1</span>
      <div class="magnet" data-drag="magnet" data-magnet="offline" data-x="62" data-y="18" style="left:62%;top:18%">Offline mode</div>
      <div class="magnet alt" data-drag="magnet" data-magnet="templates" data-x="16" data-y="26" style="left:16%;top:26%">Template gallery</div>
      <div class="magnet alt2" data-drag="magnet" data-magnet="import" data-x="24" data-y="38" style="left:24%;top:38%">Faster import</div>
      <div class="magnet alt" data-drag="magnet" data-magnet="mobile" data-x="20" data-y="66" style="left:20%;top:66%">Mobile capture</div>
      <div class="magnet alt2" data-drag="magnet" data-magnet="api" data-x="70" data-y="70" style="left:70%;top:70%">API v2</div>
    </div>
    <div class="quad-side">
      <div class="axis">↑ Impact — higher is better</div>
      <div class="axis">→ Effort — right is heavier</div>
      <div class="card"><div class="card-title" style="font-size:32px">Read the room</div><div class="card-body">Anything left in "Do first" after five minutes of arguing is your Q3.</div></div>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'ws-sec-commit',
      name: 'Section · Commit',
      transition: 'fade',
      bodyHtml: `<div class="paper-dots"></div>
<div class="divider">
  <div class="divider-num reveal">Block 04 · 25 min</div>
  <div class="divider-title reveal">Commit.</div>
  <div class="divider-scribble reveal"></div>
  <div class="divider-meta reveal">Names and dates, or it didn't happen</div>
</div>`,
    }),
    s({
      id: 'ws-decisions',
      name: 'Decision log',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="kicker reveal">The decision log</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">Who's doing what by when.</h2>
  <table class="table reveal" style="margin-top:10px">
    <thead><tr><th>Decision</th><th>Owner</th><th>First milestone</th><th class="num">Due</th></tr></thead>
    <tbody>
      <tr class="row-em"><td>Ship offline mode as the Q3 bet</td><td>Priya</td><td>Sync-conflict spec reviewed</td><td class="num">Jul 24</td></tr>
      <tr><td>Template gallery as fast-follow</td><td>Marcus</td><td>Ten launch templates drafted</td><td class="num">Aug 7</td></tr>
      <tr><td>Faster import → quick win sprint</td><td>Jonah</td><td>Benchmark: 50k rows under 30s</td><td class="num">Jul 31</td></tr>
      <tr><td>API v2 parked until Q4</td><td>—</td><td>Revisit at September planning</td><td class="num">Sep 18</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Parked ≠ rejected. The parking lot gets read out loud at the next session.</p>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Commit · Decisions</span></div>
</div>`,
    }),
    s({
      id: 'ws-roadmap',
      name: 'Six-week map',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="kicker reveal">The next six weeks</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">From wall to demo day.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Week 1</div><div class="tl-what"><b>Specs & spikes</b> — sync-conflict design review; import benchmark rig.</div></div>
    <div class="tl-row"><div class="tl-when">Week 2–3</div><div class="tl-what"><b>Build</b> — offline core lands behind a flag; first template batch in review.</div></div>
    <div class="tl-row"><div class="tl-when">Week 4</div><div class="tl-what"><b>Field test</b> — five customer crews on the offline beta, daily check-ins.</div></div>
    <div class="tl-row"><div class="tl-when">Week 5</div><div class="tl-what"><b>Polish</b> — conflict UX, empty states, import at 30s for 50k rows.</div></div>
    <div class="tl-row"><div class="tl-when">Week 6</div><div class="tl-what"><b>Demo day</b> — ship review, then the wall comes back out for Q4.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Commit · Roadmap</span></div>
</div>`,
    }),
    s({
      id: 'ws-stats',
      name: 'What we committed',
      transition: 'slide',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad">
  <div class="kicker reveal">Out the door with</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">The session in four numbers.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">1</div><div class="stat-label">Big bet — offline mode, fully staffed</div></div>
    <div class="stat"><div class="stat-num">2</div><div class="stat-label">Fast follows with named owners</div></div>
    <div class="stat"><div class="stat-num">14</div><div class="stat-label">Ideas captured on the wall for later</div></div>
    <div class="stat"><div class="stat-num">6</div><div class="stat-label">Weeks to demo day</div></div>
  </div>
  <div class="note reveal" style="margin-top:40px;border-left:3px solid var(--accent-2);background:#fff;padding:26px 34px;border-radius:0 14px 14px 0"><span class="hand green" style="font-size:36px">the wall stays up — add stickies all quarter</span></div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Commit · Summary</span></div>
</div>`,
    }),
    s({
      id: 'ws-quote',
      name: 'Quote',
      transition: 'zoom',
      bodyHtml: `<div class="paper-dots"></div>
<div class="pad center">
  <div class="kicker reveal">Taped above the door</div>
  <blockquote class="quote reveal" style="margin-top:14px">"A good plan is one everyone can repeat in the hallway afterward."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Ana Duarte</span><span class="cite-role">Relay's favorite facilitator</span></div>
  <div class="runner reveal"><span class="runner-brand">Relay · Q3 planning</span><span class="runner-label">Warm up</span></div>
</div>`,
    }),
    s({
      id: 'ws-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#ffd66b">Same room · two weeks · bring the numbers</div>
    <h2 class="display reveal" style="--display-size:124px;color:#fff">Go build the thing.</h2>
    <p class="lead reveal">Decision log lives in this deck · parking lot reads out Sep 18</p>
  </div>
</div>`,
    }),
  ],
}
