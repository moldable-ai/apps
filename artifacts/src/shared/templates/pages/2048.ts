import type { Template } from '../types'

// A fully-playable 2048 sliding-tile puzzle — pure JS/DOM, zero libraries.
// Tiles are absolutely positioned over a 4x4 grid and CSS-transition their
// transform between board states (tracked by tile id) for smooth slide+merge.
// Warm canonical 2048 color ramp, score + best (localStorage), undo + new game.
// Move with Arrow keys, WASD, or swipe. Pure CSS art — no imagery needed.

const CSS = `
:root {
  --bg: #faf8ef;
  --board: #bbada0;
  --cell: #cdc1b4;
  --ink: #6b5e51;
  --ink-strong: #4b4339;
  --btn: #8f7a66;
  --btn-ink: #f9f6f2;
  --accent: #edc22e;
  --display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
  /* tile ramp — each value its own warm shade */
  --t2:   #eee4da; --t2-ink:   #6b5e51;
  --t4:   #ede0c8; --t4-ink:   #6b5e51;
  --t8:   #f2b179; --t8-ink:   #f9f6f2;
  --t16:  #f59563; --t16-ink:  #f9f6f2;
  --t32:  #f67c5f; --t32-ink:  #f9f6f2;
  --t64:  #f65e3b; --t64-ink:  #f9f6f2;
  --t128: #edcf72; --t128-ink: #f9f6f2;
  --t256: #edcc61; --t256-ink: #f9f6f2;
  --t512: #edc850; --t512-ink: #f9f6f2;
  --t1024:#edc53f; --t1024-ink:#f9f6f2;
  --t2048:#edc22e; --t2048-ink:#f9f6f2;
  --tbig: #3c3a32; --tbig-ink:  #f9f6f2;
}
body {
  background:
    radial-gradient(900px 500px at 82% -8%, rgba(237,194,46,0.10), transparent 60%),
    radial-gradient(700px 480px at 8% 108%, rgba(242,177,121,0.12), transparent 60%),
    var(--bg);
  color: var(--ink-strong);
  font-family: var(--body);
}
.num { font-variant-numeric: tabular-nums; }

.wrap {
  width: min(520px, 100vw - 32px);
  margin: 0 auto;
  padding: clamp(22px, 5vw, 46px) 0 56px;
}

/* ---- header ---- */
.top { display: flex; align-items: flex-start; gap: 16px; }
.brand h1 {
  font-family: var(--display); font-weight: 800;
  font-size: clamp(46px, 14vw, 78px); line-height: 0.9;
  letter-spacing: -0.04em; margin: 0;
  color: var(--ink-strong);
}
.brand p { margin: 8px 0 0; color: var(--ink); font-size: clamp(12.5px, 3.4vw, 14.5px); max-width: 22ch; }
.brand .accent { color: #d9a91f; }
.scores { margin-left: auto; display: flex; gap: 10px; }
.score {
  background: var(--board); color: var(--btn-ink);
  border-radius: 12px; padding: 9px clamp(12px, 3.6vw, 18px) 10px;
  text-align: center; min-width: clamp(70px, 19vw, 92px); position: relative; overflow: hidden;
}
.score .lab { font-size: 10.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(249,246,242,0.72); }
.score .val { font-family: var(--display); font-weight: 800; font-size: clamp(20px, 5.4vw, 27px); margin-top: 2px; }
.score .pop {
  position: absolute; left: 0; right: 0; top: 8px; text-align: center;
  font-family: var(--display); font-weight: 800; font-size: 17px; color: var(--accent);
  opacity: 0; pointer-events: none;
}
.score .pop.go { animation: scorepop 0.62s ease-out; }
@keyframes scorepop { 0% { opacity: 0; transform: translateY(2px); } 18% { opacity: 1; } 100% { opacity: 0; transform: translateY(-24px); } }

/* ---- controls ---- */
.bar { display: flex; align-items: center; gap: 10px; margin: clamp(16px, 4vw, 22px) 0 clamp(12px, 3vw, 16px); }
.hint { color: var(--ink); font-size: 13px; line-height: 1.45; }
.hint b { color: var(--ink-strong); font-weight: 700; }
.actions { margin-left: auto; display: flex; gap: 8px; }
button.act {
  font-family: var(--display); font-weight: 700; font-size: 13.5px;
  color: var(--btn-ink); background: var(--btn);
  border: 0; border-radius: 9px; padding: 10px 15px; cursor: pointer;
  transition: transform 0.12s ease, filter 0.15s ease;
}
button.act:hover { filter: brightness(1.06); }
button.act:active { transform: translateY(1px) scale(0.98); }
button.act.ghost { background: transparent; color: var(--btn); box-shadow: inset 0 0 0 2px rgba(143,122,102,0.4); }
button.act:disabled { opacity: 0.42; cursor: not-allowed; }
button.act:focus-visible { outline: 3px solid rgba(237,194,46,0.7); outline-offset: 2px; }

/* ---- board ---- */
.board {
  position: relative; width: 100%; aspect-ratio: 1 / 1;
  background: var(--board); border-radius: 14px;
  padding: var(--gap); box-sizing: border-box;
  --gap: clamp(9px, 2.6vw, 14px);
  touch-action: none; user-select: none;
  box-shadow: 0 24px 60px -28px rgba(75,67,57,0.55);
  outline: none;
}
.board:focus-visible { box-shadow: 0 24px 60px -28px rgba(75,67,57,0.55), 0 0 0 4px rgba(237,194,46,0.6); }
.cells { position: absolute; inset: var(--gap); display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: var(--gap); }
.cell { background: var(--cell); border-radius: 9px; }

.tiles { position: absolute; inset: var(--gap); }
.tile {
  position: absolute; width: var(--ts); height: var(--ts);
  border-radius: 9px; display: flex; align-items: center; justify-content: center;
  font-family: var(--display); font-weight: 800; letter-spacing: -0.02em;
  background: var(--t2); color: var(--t2-ink);
  transform: translate(var(--x), var(--y));
  transition: transform 0.13s cubic-bezier(0.3, 0.7, 0.4, 1);
  will-change: transform; font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 0 rgba(0,0,0,0.04);
}
.tile .v { line-height: 1; }
.tile.new { animation: appear 0.18s ease 0.08s backwards; }
@keyframes appear { from { transform: translate(var(--x), var(--y)) scale(0.1); } to { transform: translate(var(--x), var(--y)) scale(1); } }
.tile.merged { animation: pop 0.18s ease; }
@keyframes pop { 0% { transform: translate(var(--x), var(--y)) scale(1); } 50% { transform: translate(var(--x), var(--y)) scale(1.22); } 100% { transform: translate(var(--x), var(--y)) scale(1); } }

/* per-value skins */
.tile[data-v="2"]    { background: var(--t2);    color: var(--t2-ink); }
.tile[data-v="4"]    { background: var(--t4);    color: var(--t4-ink); }
.tile[data-v="8"]    { background: var(--t8);    color: var(--t8-ink); }
.tile[data-v="16"]   { background: var(--t16);   color: var(--t16-ink); }
.tile[data-v="32"]   { background: var(--t32);   color: var(--t32-ink); }
.tile[data-v="64"]   { background: var(--t64);   color: var(--t64-ink); }
.tile[data-v="128"]  { background: var(--t128);  color: var(--t128-ink);  box-shadow: 0 0 22px -2px rgba(237,207,114,0.55); }
.tile[data-v="256"]  { background: var(--t256);  color: var(--t256-ink);  box-shadow: 0 0 24px -1px rgba(237,204,97,0.6); }
.tile[data-v="512"]  { background: var(--t512);  color: var(--t512-ink);  box-shadow: 0 0 26px 0 rgba(237,200,80,0.62); }
.tile[data-v="1024"] { background: var(--t1024); color: var(--t1024-ink); box-shadow: 0 0 28px 1px rgba(237,197,63,0.66); }
.tile[data-v="2048"] { background: var(--t2048); color: var(--t2048-ink); box-shadow: 0 0 34px 2px rgba(237,194,46,0.78); }
.tile.big { background: var(--tbig); color: var(--tbig-ink); }
/* digit-count font scale */
.tile { font-size: clamp(26px, 9vw, 46px); }
.tile.d3 { font-size: clamp(22px, 7.4vw, 38px); }
.tile.d4 { font-size: clamp(17px, 6vw, 31px); }
.tile.d5 { font-size: clamp(14px, 5vw, 26px); }

/* ---- overlay (win / lose) ---- */
.overlay {
  position: absolute; inset: 0; border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: rgba(250,248,239,0.78); backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none; transition: opacity 0.28s ease;
  text-align: center; padding: 24px;
}
.overlay.show { opacity: 1; pointer-events: auto; }
.overlay.win { background: rgba(237,194,46,0.62); }
.overlay h2 { font-family: var(--display); font-weight: 800; font-size: clamp(34px, 9vw, 52px); margin: 0; letter-spacing: -0.03em; color: var(--ink-strong); }
.overlay.win h2 { color: #7a5c00; }
.overlay p { margin: 0; color: var(--ink-strong); font-weight: 600; font-size: 14px; }
.overlay .ov-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* ---- footer note ---- */
.foot { margin-top: 22px; color: var(--ink); font-size: 12.5px; line-height: 1.5; }
.foot b { color: var(--ink-strong); }
.keys { display: inline-flex; gap: 4px; vertical-align: -2px; }
.keys kbd {
  font-family: var(--display); font-size: 10.5px; font-weight: 700;
  background: #fff; color: var(--ink-strong); border-radius: 5px;
  box-shadow: inset 0 0 0 1.5px rgba(143,122,102,0.32), 0 1px 0 rgba(143,122,102,0.25);
  padding: 2px 6px; min-width: 14px; text-align: center;
}

@media (max-width: 640px) {
  .wrap { padding: clamp(16px, 5vw, 28px) 0 40px; }
  .top { flex-wrap: wrap; gap: 12px; }
  .scores { margin-left: 0; width: 100%; }
  .score { flex: 1; }
  .bar { flex-direction: column; align-items: stretch; gap: 12px; }
  .actions { margin-left: 0; }
  .actions button { flex: 1; }
}
@media (max-width: 390px) {
  .brand h1 { font-size: clamp(40px, 16vw, 56px); }
  .board { --gap: clamp(7px, 2.4vw, 11px); }
}
`.trim()

const HTML = `
<div class="wrap">
  <div class="top">
    <div class="brand">
      <h1>20<span class="accent">48</span></h1>
      <p>Join the tiles, reach <b>2048</b>. Slide, merge, repeat.</p>
    </div>
    <div class="scores">
      <div class="score"><div class="lab">Score</div><div class="val num" id="score">0</div><div class="pop num" id="scorePop"></div></div>
      <div class="score"><div class="lab">Best</div><div class="val num" id="best">0</div></div>
    </div>
  </div>

  <div class="bar">
    <div class="hint" id="hint">Reach the <b>2048</b> tile to win — but you can keep going.</div>
    <div class="actions">
      <button class="act ghost" id="undo" type="button" aria-label="Undo last move" disabled>Undo</button>
      <button class="act" id="new" type="button">New game</button>
    </div>
  </div>

  <div class="board" id="board" role="application" aria-label="2048 game board" tabindex="0">
    <div class="cells" id="cells"></div>
    <div class="tiles" id="tilesLayer"></div>
    <div class="overlay" id="overlay">
      <h2 id="ovTitle">Game over</h2>
      <p id="ovText">No more moves.</p>
      <div class="ov-btns">
        <button class="act" id="ovKeep" type="button" style="display:none">Keep going</button>
        <button class="act" id="ovNew" type="button">Try again</button>
      </div>
    </div>
  </div>

  <div class="foot">
    <b>How to play.</b> Use
    <span class="keys"><kbd>&larr;</kbd><kbd>&darr;</kbd><kbd>&uarr;</kbd><kbd>&rarr;</kbd></span>
    or <span class="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
    to slide every tile. Two tiles of the same number <b>merge into one</b>. After each move a new tile appears. Press <span class="keys"><kbd>U</kbd></span> to undo, <span class="keys"><kbd>R</kbd></span> for a new game. On touch, just swipe.
  </div>
</div>
`.trim()

const JS = `
(function () {
  var SIZE = 4;
  var WIN = 2048;
  var KEY = 'artifact-2048-best';

  var boardEl = document.getElementById('board');
  var cellsEl = document.getElementById('cells');
  var layerEl = document.getElementById('tilesLayer');
  var scoreEl = document.getElementById('score');
  var scorePopEl = document.getElementById('scorePop');
  var bestEl = document.getElementById('best');
  var undoBtn = document.getElementById('undo');
  var newBtn = document.getElementById('new');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var ovKeep = document.getElementById('ovKeep');
  var ovNew = document.getElementById('ovNew');

  // Backing grid holds tile OBJECTS: { id, value, r, c, merged }
  var grid = [];
  var score = 0;
  var best = 0;
  var nextId = 1;
  var won = false;        // reached 2048 at least once
  var keepGoing = false;  // dismissed the win overlay
  var dead = false;
  var prevState = null;    // single-step undo snapshot
  var els = {};            // tileId -> DOM element

  try { best = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) { best = 0; }

  // ---- grid helpers ----
  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) { g.push([]); for (var c = 0; c < SIZE; c++) g[r].push(null); }
    return g;
  }
  function eachTile(g, fn) {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) { if (g[r][c]) fn(g[r][c], r, c); }
  }
  function emptyCells(g) {
    var out = [];
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) { if (!g[r][c]) out.push({ r: r, c: c }); }
    return out;
  }

  function snapshot() {
    var tiles = [];
    eachTile(grid, function (t) { tiles.push({ id: t.id, value: t.value, r: t.r, c: t.c }); });
    return { tiles: tiles, score: score, nextId: nextId, won: won, keepGoing: keepGoing };
  }
  function cloneStateForUndo() {
    return JSON.parse(JSON.stringify(snapshot()));
  }

  function addRandomTile() {
    var cells = emptyCells(grid);
    if (!cells.length) return null;
    var spot = cells[Math.floor(Math.random() * cells.length)];
    var value = Math.random() < 0.9 ? 2 : 4;
    var t = { id: nextId++, value: value, r: spot.r, c: spot.c, isNew: true };
    grid[spot.r][spot.c] = t;
    return t;
  }

  function digitsClass(v) {
    var n = ('' + v).length;
    if (n >= 5) return 'd5';
    if (n === 4) return 'd4';
    if (n === 3) return 'd3';
    return '';
  }

  // Build the 16 background cells once
  function buildCells() {
    cellsEl.innerHTML = '';
    for (var i = 0; i < SIZE * SIZE; i++) {
      var d = document.createElement('div');
      d.className = 'cell';
      cellsEl.appendChild(d);
    }
    // size tiles relative to a cell: each tile fills one cell minus the gap.
    // We position the tiles layer to match cells; tile width set via --ts below.
  }

  function tileEl(t) {
    var el = document.createElement('div');
    el.className = 'tile num';
    el.setAttribute('data-v', t.value);
    var inner = document.createElement('span');
    inner.className = 'v';
    inner.textContent = t.value;
    el.appendChild(inner);
    return el;
  }

  // Each tile is exactly one grid track wide (--ts is a % of the parent layer,
  // matching the 4x4 CSS grid behind it). Position is a translate(): inside a
  // translate() a % is relative to the ELEMENT's own box, so 100% == one track.
  // Moving to column c means shifting c tracks plus c literal gaps.
  function applyTileGeometry(el, t, opts) {
    el.style.setProperty('--ts', 'calc((100% - ' + (SIZE - 1) + ' * var(--gap)) / ' + SIZE + ')');
    el.style.setProperty('--x', 'calc(' + t.c + ' * (100% + var(--gap)))');
    el.style.setProperty('--y', 'calc(' + t.r + ' * (100% + var(--gap)))');
    el.setAttribute('data-v', t.value);
    var dc = digitsClass(t.value);
    el.className = 'tile num' + (dc ? ' ' + dc : '') + (t.value > 2048 ? ' big' : '');
    if (opts && opts.isNew) el.classList.add('new');
    if (opts && opts.merged) el.classList.add('merged');
    var v = el.querySelector('.v');
    if (v && v.textContent !== ('' + t.value)) v.textContent = t.value;
  }

  // Full render from the grid model. Reuses DOM nodes by tile id so CSS
  // transitions animate position changes; removes departed nodes.
  function render(removed, mergedIds, newIds) {
    var seen = {};
    eachTile(grid, function (t) {
      seen[t.id] = true;
      var el = els[t.id];
      if (!el) {
        el = tileEl(t);
        els[t.id] = el;
        layerEl.appendChild(el);
        // initial geometry without transition jank: set position first
        applyTileGeometry(el, t, { isNew: newIds && newIds[t.id] });
      } else {
        applyTileGeometry(el, t, { merged: mergedIds && mergedIds[t.id] });
      }
    });
    // remove nodes whose tiles merged away / no longer exist
    Object.keys(els).forEach(function (id) {
      if (!seen[id]) {
        var el = els[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
        delete els[id];
      }
    });
    // clear transient animation classes after they play
    if (mergedIds) {
      setTimeout(function () {
        Object.keys(mergedIds).forEach(function (id) { if (els[id]) els[id].classList.remove('merged'); });
      }, 200);
    }
    if (newIds) {
      setTimeout(function () {
        Object.keys(newIds).forEach(function (id) { if (els[id]) els[id].classList.remove('new'); });
      }, 280);
    }
  }

  // ---- movement ----
  // direction vectors
  var DIRS = {
    left:  { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
    up:    { dr: -1, dc: 0 },
    down:  { dr: 1, dc: 0 }
  };

  // Build traversal order so we always process from the far edge inward.
  function traversals(dir) {
    var rs = [], cs = [];
    for (var i = 0; i < SIZE; i++) { rs.push(i); cs.push(i); }
    if (dir.dr === 1) rs.reverse();
    if (dir.dc === 1) cs.reverse();
    return { rs: rs, cs: cs };
  }

  function findFarthest(g, r, c, dir) {
    var pr = r, pc = c, nr = r + dir.dr, nc = c + dir.dc;
    while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !g[nr][nc]) {
      pr = nr; pc = nc; nr += dir.dr; nc += dir.dc;
    }
    return { far: { r: pr, c: pc }, next: { r: nr, c: nc } };
  }

  function move(dirName) {
    if (dead) return;
    var dir = DIRS[dirName];
    if (!dir) return;
    var before = cloneStateForUndo();

    var moved = false;
    var gained = 0;
    var mergedIds = {};
    // reset merged flags
    eachTile(grid, function (t) { t.merged = false; t.isNew = false; });

    var tr = traversals(dir);
    tr.rs.forEach(function (r) {
      tr.cs.forEach(function (c) {
        var t = grid[r][c];
        if (!t) return;
        var info = findFarthest(grid, r, c, dir);
        var nextCell = info.next;
        var other = (nextCell.r >= 0 && nextCell.r < SIZE && nextCell.c >= 0 && nextCell.c < SIZE)
          ? grid[nextCell.r][nextCell.c] : null;

        if (other && other.value === t.value && !other.merged) {
          // merge t into other
          var newVal = t.value * 2;
          other.value = newVal;
          other.merged = true;
          mergedIds[other.id] = true;
          grid[r][c] = null;
          // animate t sliding onto other's cell, then remove (handled by render: t gone)
          t.r = nextCell.r; t.c = nextCell.c;
          grid[nextCell.r][nextCell.c] = other; // keep other (already there)
          // move the surviving 'other' tile object: its position unchanged
          gained += newVal;
          moved = true;
          if (newVal === WIN && !won) { won = true; }
        } else {
          // just slide to farthest empty
          if (info.far.r !== r || info.far.c !== c) {
            grid[r][c] = null;
            t.r = info.far.r; t.c = info.far.c;
            grid[info.far.r][info.far.c] = t;
            moved = true;
          }
        }
      });
    });

    if (!moved) return; // invalid move: no snapshot saved, nothing changes

    prevState = before;
    undoBtn.disabled = false;

    score += gained;
    if (gained > 0) bumpScore(gained);
    if (score > best) { best = score; persistBest(); }

    // render slide + merges first, then spawn the new tile a beat later
    render(null, mergedIds, null);
    var nt = addRandomTile();
    var newIds = {};
    if (nt) newIds[nt.id] = true;
    // spawn after slide settles
    setTimeout(function () { render(null, null, newIds); checkState(); }, 100);

    syncScore();
  }

  function bumpScore(amt) {
    scorePopEl.textContent = '+' + amt;
    scorePopEl.classList.remove('go');
    void scorePopEl.offsetWidth; // reflow to restart animation
    scorePopEl.classList.add('go');
  }

  function syncScore() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
  }
  function persistBest() {
    try { localStorage.setItem(KEY, '' + best); } catch (e) {}
  }

  // ---- win / lose detection ----
  function hasMoves() {
    if (emptyCells(grid).length) return true;
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var t = grid[r][c];
        if (!t) continue;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === t.value) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === t.value) return true;
      }
    }
    return false;
  }

  function checkState() {
    if (won && !keepGoing) {
      showOverlay('win');
      return;
    }
    if (!hasMoves()) {
      dead = true;
      showOverlay('lose');
    }
  }

  function showOverlay(kind) {
    if (kind === 'win') {
      overlay.className = 'overlay win show';
      ovTitle.textContent = 'You win!';
      ovText.textContent = 'You reached 2048. Keep going for a higher score?';
      ovKeep.style.display = '';
      ovNew.textContent = 'New game';
    } else {
      overlay.className = 'overlay show';
      ovTitle.textContent = 'Game over';
      ovText.textContent = 'No moves left — final score ' + score + '.';
      ovKeep.style.display = 'none';
      ovNew.textContent = 'Try again';
    }
  }
  function hideOverlay() { overlay.className = 'overlay'; }

  // ---- undo ----
  function undo() {
    if (!prevState) return;
    var s = prevState;
    // rebuild grid from snapshot
    grid = emptyGrid();
    els = wipeTiles();
    s.tiles.forEach(function (d) {
      var t = { id: d.id, value: d.value, r: d.r, c: d.c, merged: false, isNew: false };
      grid[d.r][d.c] = t;
    });
    score = s.score;
    nextId = s.nextId;
    won = s.won;
    keepGoing = s.keepGoing;
    dead = false;
    prevState = null;
    undoBtn.disabled = true;
    hideOverlay();
    render();
    syncScore();
  }

  function wipeTiles() {
    Object.keys(els).forEach(function (id) {
      var el = els[id];
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    return {};
  }

  // ---- new game ----
  function newGame() {
    grid = emptyGrid();
    els = wipeTiles();
    score = 0; nextId = 1; won = false; keepGoing = false; dead = false;
    prevState = null; undoBtn.disabled = true;
    hideOverlay();
    addRandomTile();
    addRandomTile();
    render(null, null, allNew());
    syncScore();
  }
  function allNew() {
    var n = {};
    eachTile(grid, function (t) { n[t.id] = true; });
    return n;
  }

  // ---- input ----
  var keymap = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down',
    A: 'left', D: 'right', W: 'up', S: 'down',
    h: 'left', l: 'right', k: 'up', j: 'down' // vim niceties
  };
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'u' || k === 'U') { e.preventDefault(); undo(); return; }
    if (k === 'r' || k === 'R') { e.preventDefault(); newGame(); return; }
    var dir = keymap[k];
    if (dir) {
      e.preventDefault();
      if (overlay.classList.contains('show') && !overlay.classList.contains('win')) return;
      move(dir);
    }
  });

  // swipe (touch + pointer drag)
  var sx = 0, sy = 0, tracking = false;
  function onStart(x, y) { sx = x; sy = y; tracking = true; }
  function onEnd(x, y) {
    if (!tracking) return;
    tracking = false;
    var dx = x - sx, dy = y - sy;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    var THRESH = 24;
    if (Math.max(ax, ay) < THRESH) return;
    if (overlay.classList.contains('show') && !overlay.classList.contains('win')) return;
    if (ax > ay) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  }
  boardEl.addEventListener('touchstart', function (e) {
    var t = e.changedTouches[0]; onStart(t.clientX, t.clientY);
  }, { passive: true });
  boardEl.addEventListener('touchmove', function (e) {
    if (tracking) e.preventDefault();
  }, { passive: false });
  boardEl.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0]; onEnd(t.clientX, t.clientY);
  }, { passive: true });
  // mouse drag (desktop, optional)
  boardEl.addEventListener('mousedown', function (e) { onStart(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function (e) { if (tracking) onEnd(e.clientX, e.clientY); });

  // buttons
  newBtn.addEventListener('click', newGame);
  undoBtn.addEventListener('click', undo);
  ovNew.addEventListener('click', newGame);
  ovKeep.addEventListener('click', function () { keepGoing = true; hideOverlay(); boardEl.focus(); });

  // focus board so keys work immediately
  boardEl.focus();
  window.addEventListener('load', function () { try { boardEl.focus(); } catch (e) {} });

  // ---- boot ----
  buildCells();
  newGame();
})();
`.trim()

export const game2048: Template = {
  id: '2048',
  kind: 'page',
  name: '2048',
  tagline: 'The classic 2048 sliding-tile puzzle',
  categories: ['Games'],
  audiences: ['game', 'puzzle', 'fun'],
  description:
    'A fully-playable 2048: a warm 4×4 sliding-tile puzzle with the canonical color ramp, smooth slide-and-pop animation, score plus a localStorage best, one-step undo, and win/keep-going detection. Move with Arrow keys, WASD, or swipe. Pure JS/DOM and CSS — no libraries, no network.',
  fonts: {
    display: 'Plus Jakarta Sans',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#faf8ef',
  notes:
    'Pure JS/DOM 2048 — no libraries. Tweak the **tile color ramp** via the `--t2`…`--t2048` (background) and matching `--t…-ink` (text) CSS variables in `:root`; the page bg is `--bg`, the board is `--board`, button color is `--btn`. The `--accent` token tints the win overlay and score pop. To change the board size, edit `SIZE` in the JS (the grid, positioning and font-scaling all key off it) and the win target via `WIN`. Movement is the canonical traversal-from-the-far-edge algorithm with a per-move `merged` flag so no tile double-merges. Tiles are absolutely positioned and CSS-transition their `--x`/`--y` transforms; new tiles use the `.new` (appear) animation and merges use `.merged` (pop). Best score persists under the `KEY` localStorage key. Undo keeps a single-step snapshot.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#faf8ef',
  },
}
