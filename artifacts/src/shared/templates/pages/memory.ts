import type { Template } from '../types'

// A snappy, premium MEMORY MATCH game — pure JS/DOM, zero libraries. Cards have a
// patterned gradient back and flip in real 3D (rotateY + preserve-3d). Match logic
// locks input during the check, celebrates matches with a pulse, and flips back on
// a miss. HUD tracks moves, an mm:ss timer, and matched pairs; an Easy 4×4 / Hard
// 6×6 toggle reshuffles. Win overlay shows final time + moves. Pure CSS/SVG art.

const CSS = `
:root {
  --bg: #0e1020;
  --bg-2: #14172e;
  --ink: #f3f1ff;
  --mut: #9aa0c8;
  --faint: #6b7099;
  --card-edge: rgba(255,255,255,0.08);
  --c1: #ff7eb6;      /* pink   */
  --c2: #7c5cff;      /* violet */
  --c3: #45e0c4;      /* mint   */
  --c4: #ffd166;      /* amber  */
  --back-1: #2a2150;  /* card-back gradient */
  --back-2: #4530a6;
  --face: #f7f6ff;    /* matched/face surface */
  --good: #45e0c4;
  --grad: linear-gradient(125deg, var(--c2), var(--c1));
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 620px at 78% -12%, rgba(124,92,255,0.22), transparent 62%),
    radial-gradient(900px 560px at 8% 108%, rgba(255,126,182,0.16), transparent 60%),
    var(--bg);
  color: var(--ink);
}
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

.wrap { max-width: 760px; margin: 0 auto; padding: clamp(20px, 5vw, 48px) clamp(16px, 4vw, 28px) 72px; }

/* ---- masthead ---- */
.top { display: flex; align-items: center; gap: 14px; }
.mark { width: 42px; height: 42px; border-radius: 13px; flex: none; position: relative; background: var(--grad);
  box-shadow: 0 10px 30px -10px var(--c2), inset 0 1px 0 rgba(255,255,255,0.3); }
.mark svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.brand { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 5vw, 26px); letter-spacing: -0.02em; line-height: 1; }
.brand small { display: block; font-family: var(--body); font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; font-size: 10.5px; color: var(--c3); margin-top: 5px; }
.top .spacer { flex: 1; }

/* difficulty segmented control */
.seg { display: inline-flex; background: rgba(255,255,255,0.05); border: 1px solid var(--card-edge); border-radius: 999px; padding: 4px; }
.seg button { border: 0; background: transparent; color: var(--mut); font: 700 13px var(--body); padding: 8px 16px; border-radius: 999px; cursor: pointer; transition: color .2s; }
.seg button.on { background: var(--ink); color: #15132a; }
.seg button:focus-visible { outline: 2px solid var(--c3); outline-offset: 2px; }

.lede { margin: clamp(18px,4vw,26px) 0 clamp(14px,3vw,20px); }
.lede h1 { font-family: var(--display); font-weight: 600; font-size: clamp(28px, 7vw, 44px); letter-spacing: -0.03em; line-height: 1.02; margin: 0; }
.lede h1 em { font-style: normal; background: var(--grad); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.lede p { color: var(--mut); margin: 10px 0 0; font-size: clamp(14px, 3.4vw, 15.5px); max-width: 48ch; }

/* ---- HUD ---- */
.hud { display: grid; grid-template-columns: repeat(3, 1fr) auto; gap: 10px; align-items: stretch; margin-bottom: 18px; }
.stat { background: linear-gradient(180deg, var(--bg-2), rgba(20,23,46,0.5)); border: 1px solid var(--card-edge); border-radius: 16px; padding: 12px 14px; }
.stat .k { font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
.stat .v { font-family: var(--display); font-weight: 600; font-size: clamp(20px, 5.5vw, 27px); letter-spacing: -0.02em; margin-top: 4px; line-height: 1; }
.stat.timer .v { color: var(--c3); }
.stat.pairs .v { color: var(--c1); }
.restart { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--card-edge); background: rgba(255,255,255,0.05);
  color: var(--ink); font: 700 13px var(--body); border-radius: 16px; padding: 0 18px; cursor: pointer; transition: background .2s, transform .15s; }
.restart:hover { background: rgba(255,255,255,0.1); }
.restart:active { transform: scale(0.96); }
.restart:focus-visible { outline: 2px solid var(--c3); outline-offset: 2px; }
.restart svg { width: 16px; height: 16px; }

/* ---- board ---- */
.board-wrap { position: relative; }
.board { display: grid; gap: clamp(7px, 1.8vw, 13px); perspective: 1100px; }
.board.cols-4 { grid-template-columns: repeat(4, 1fr); }
.board.cols-6 { grid-template-columns: repeat(6, 1fr); }

.card { position: relative; aspect-ratio: 1; cursor: pointer; border: 0; background: transparent; padding: 0; border-radius: clamp(10px, 2.4vw, 18px); }
.card:focus-visible { outline: 2px solid var(--c3); outline-offset: 3px; }
.card[disabled] { cursor: default; }
.inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform .52s cubic-bezier(0.34, 1.4, 0.5, 1); }
.card.flip .inner, .card.matched .inner { transform: rotateY(180deg); }
.face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: inherit;
  display: flex; align-items: center; justify-content: center; overflow: hidden; }

/* back of card */
.back { background:
    radial-gradient(120% 120% at 30% 18%, rgba(255,255,255,0.16), transparent 52%),
    linear-gradient(150deg, var(--back-2), var(--back-1));
  border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 10px 26px -14px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.16); }
.back svg { width: 64%; height: 64%; opacity: 0.92; }
.back::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.22) 50%, transparent 62%);
  transform: translateX(-100%); }
.card:hover .back::after { animation: sheen .9s ease; }
@keyframes sheen { to { transform: translateX(100%); } }
.card:hover .inner { transform: translateY(-3px); }
.card.flip .inner, .card.matched .inner { transform: rotateY(180deg) translateY(0); }

/* front (symbol) */
.front { transform: rotateY(180deg); background: var(--face); color: #15132a;
  border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 12px 30px -16px rgba(124,92,255,0.6), inset 0 1px 0 rgba(255,255,255,0.7); }
.front .sym { font-size: clamp(26px, 8.5vw, 46px); line-height: 1; filter: saturate(1.1); }

/* matched state */
.card.matched { cursor: default; }
.card.matched .front { box-shadow: 0 0 0 2px var(--good), 0 14px 34px -14px var(--good); }
.card.celebrate .front { animation: pop .5s cubic-bezier(0.34,1.5,0.5,1); }
@keyframes pop { 0%{ transform: rotateY(180deg) scale(1);} 40%{ transform: rotateY(180deg) scale(1.12);} 100%{ transform: rotateY(180deg) scale(1);} }
.card.miss .inner { animation: shake .4s ease; }
@keyframes shake { 0%,100%{ transform: rotateY(180deg) translateX(0);} 25%{ transform: rotateY(180deg) translateX(-5px);} 75%{ transform: rotateY(180deg) translateX(5px);} }

.foot { margin-top: 20px; text-align: center; color: var(--faint); font-size: 12.5px; }
.foot b { color: var(--mut); font-weight: 600; }

/* ---- win overlay ---- */
.win { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: radial-gradient(120% 120% at 50% 0%, rgba(124,92,255,0.22), transparent 60%), rgba(14,16,32,0.78);
  backdrop-filter: blur(7px); border-radius: 24px; opacity: 0; pointer-events: none; transition: opacity .4s; z-index: 5; }
.win.show { opacity: 1; pointer-events: auto; }
.card-win { width: min(420px, 100%); text-align: center; background: linear-gradient(180deg, var(--bg-2), #0f1124);
  border: 1px solid var(--card-edge); border-radius: 22px; padding: 30px 26px; box-shadow: 0 40px 90px -30px rgba(0,0,0,0.9);
  transform: translateY(14px) scale(0.96); transition: transform .45s cubic-bezier(0.34,1.4,0.5,1); }
.win.show .card-win { transform: translateY(0) scale(1); }
.win .crown { width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 16px; background: var(--grad); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 14px 34px -12px var(--c2); }
.win .crown svg { width: 30px; height: 30px; }
.win h2 { font-family: var(--display); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; margin: 0; }
.win p { color: var(--mut); margin: 8px 0 18px; font-size: 14px; }
.win .scores { display: flex; gap: 12px; justify-content: center; margin-bottom: 22px; }
.win .score { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid var(--card-edge); border-radius: 14px; padding: 12px 8px; }
.win .score .k { font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
.win .score .v { font-family: var(--display); font-weight: 600; font-size: 24px; margin-top: 4px; }
.win .again { width: 100%; border: 0; background: var(--grad); color: #fff; font: 700 15px var(--body); padding: 14px; border-radius: 14px; cursor: pointer;
  box-shadow: 0 14px 30px -12px var(--c2); transition: transform .15s, filter .2s; }
.win .again:hover { filter: brightness(1.07); }
.win .again:active { transform: scale(0.97); }
.win .again:focus-visible { outline: 2px solid var(--c3); outline-offset: 2px; }

/* confetti layer */
.confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: 24px; z-index: 4; }
.confetti i { position: absolute; top: -12px; width: 9px; height: 13px; border-radius: 2px; opacity: 0; }

@media (max-width: 640px) {
  .hud { grid-template-columns: repeat(3, 1fr); }
  .restart { grid-column: 1 / -1; padding: 12px; }
  .lede p { max-width: none; }
  .board.cols-6 { gap: 6px; }
  .front .sym { font-size: clamp(20px, 9vw, 34px); }
  .win .scores { gap: 8px; }
  .win h2 { font-size: 26px; }
}
@media (max-width: 380px) {
  .seg button { padding: 7px 12px; font-size: 12px; }
}
`.trim()

const HTML = `
<div class="wrap">
  <div class="top reveal" data-reveal="none">
    <span class="mark">
      <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="2" fill="#fff" opacity="0.95"/><rect x="13" y="4" width="7" height="7" rx="2" fill="#fff" opacity="0.55"/><rect x="4" y="13" width="7" height="7" rx="2" fill="#fff" opacity="0.55"/><rect x="13" y="13" width="7" height="7" rx="2" fill="#fff" opacity="0.95"/></svg>
    </span>
    <div class="brand">Memory<small>Match · Pairs</small></div>
    <span class="spacer"></span>
    <div class="seg" id="diff" role="group" aria-label="Difficulty">
      <button data-cols="4" class="on" aria-pressed="true">Easy</button>
      <button data-cols="6" aria-pressed="false">Hard</button>
    </div>
  </div>

  <div class="lede reveal">
    <h1>Flip, remember,<br><em>find the pair.</em></h1>
    <p>A snappy little memory game. Match every pair in as few moves as you can — then chase a faster time on Hard.</p>
  </div>

  <div class="hud reveal">
    <div class="stat"><div class="k">Moves</div><div class="v num" id="moves">0</div></div>
    <div class="stat timer"><div class="k">Time</div><div class="v num" id="time">0:00</div></div>
    <div class="stat pairs"><div class="k">Pairs</div><div class="v num" id="pairs">0/8</div></div>
    <button class="restart" id="restart" type="button">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/></svg>
      Shuffle
    </button>
  </div>

  <div class="board-wrap reveal" data-reveal="scale">
    <div class="board cols-4" id="board" aria-label="Memory board"></div>
    <div class="confetti" id="confetti" aria-hidden="true"></div>
    <div class="win" id="win" role="dialog" aria-modal="true" aria-labelledby="win-h">
      <div class="card-win">
        <div class="crown"><svg viewBox="0 0 24 24" fill="#fff"><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8L3 7z"/></svg></div>
        <h2 id="win-h">Cleared!</h2>
        <p id="win-sub">Every pair found. Nicely done.</p>
        <div class="scores">
          <div class="score"><div class="k">Time</div><div class="v num" id="win-time">0:00</div></div>
          <div class="score"><div class="k">Moves</div><div class="v num" id="win-moves">0</div></div>
        </div>
        <button class="again" id="again" type="button">Play again</button>
      </div>
    </div>
  </div>

  <p class="foot reveal">Click a card to flip it. Match two and they stay. <b>Tip:</b> Hard is a 6×6 grid — 18 pairs.</p>
</div>
`.trim()

const JS = `
(function () {
  var SYMBOLS = ['🍑','🪐','🌵','🦊','🍄','🌊','🔮','🎲','🍋','🐙','🌶️','🎸','🪻','🧊','🍓','🦋','🌙','🍒'];

  var board = document.getElementById('board');
  var movesEl = document.getElementById('moves');
  var timeEl = document.getElementById('time');
  var pairsEl = document.getElementById('pairs');
  var winEl = document.getElementById('win');
  var winTime = document.getElementById('win-time');
  var winMoves = document.getElementById('win-moves');
  var winSub = document.getElementById('win-sub');
  var confetti = document.getElementById('confetti');

  var cols = 4;
  var moves = 0, matched = 0, totalPairs = 8;
  var first = null, lock = false;
  var seconds = 0, timer = null, started = false;

  // SVG used on the back of every card (a subtle inlaid diamond crest)
  var BACK_SVG = '<svg viewBox="0 0 48 48" fill="none">' +
    '<defs><linearGradient id="bk" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#ff7eb6"/><stop offset="1" stop-color="#45e0c4"/></linearGradient></defs>' +
    '<path d="M24 6 38 24 24 42 10 24Z" stroke="url(#bk)" stroke-width="2" opacity="0.85"/>' +
    '<path d="M24 14 31 24 24 34 17 24Z" fill="url(#bk)" opacity="0.5"/>' +
    '<circle cx="24" cy="24" r="2.6" fill="#fff" opacity="0.9"/></svg>';

  function fmt(s) {
    var m = Math.floor(s / 60);
    var ss = s % 60;
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function startTimer() {
    if (started) return;
    started = true;
    timer = setInterval(function () { seconds++; timeEl.textContent = fmt(seconds); }, 1000);
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  // Fisher–Yates shuffle (runtime Math.random is fine inside page JS)
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function buildDeck() {
    var pairs = (cols * cols) / 2;
    totalPairs = pairs;
    var pool = SYMBOLS.slice(0, pairs);
    var deck = pool.concat(pool);
    return shuffle(deck);
  }

  function reset() {
    stopTimer();
    seconds = 0; moves = 0; matched = 0; first = null; lock = false; started = false;
    timeEl.textContent = '0:00';
    movesEl.textContent = '0';
    winEl.classList.remove('show');
    confetti.innerHTML = '';

    var deck = buildDeck();
    pairsEl.textContent = '0/' + totalPairs;

    board.className = 'board cols-' + cols;
    board.innerHTML = '';
    deck.forEach(function (sym, idx) {
      var btn = document.createElement('button');
      btn.className = 'card';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Hidden card');
      btn.dataset.sym = sym;
      btn.dataset.idx = String(idx);
      btn.innerHTML =
        '<div class="inner">' +
          '<div class="face back">' + BACK_SVG + '</div>' +
          '<div class="face front"><span class="sym">' + sym + '</span></div>' +
        '</div>';
      btn.addEventListener('click', function () { onFlip(btn); });
      board.appendChild(btn);
    });
  }

  function onFlip(card) {
    if (lock) return;
    if (card.classList.contains('flip') || card.classList.contains('matched')) return;
    startTimer();

    card.classList.add('flip');
    card.setAttribute('aria-label', card.dataset.sym);

    if (!first) { first = card; return; }

    // second card
    lock = true;
    moves++;
    movesEl.textContent = String(moves);
    var a = first, b = card;

    if (a.dataset.sym === b.dataset.sym) {
      // match
      setTimeout(function () {
        a.classList.add('matched', 'celebrate');
        b.classList.add('matched', 'celebrate');
        a.setAttribute('disabled', 'true');
        b.setAttribute('disabled', 'true');
        setTimeout(function () { a.classList.remove('celebrate'); b.classList.remove('celebrate'); }, 520);
        matched++;
        pairsEl.textContent = matched + '/' + totalPairs;
        first = null; lock = false;
        if (matched === totalPairs) finish();
      }, 360);
    } else {
      // miss — flip back after a beat
      setTimeout(function () {
        a.classList.add('miss'); b.classList.add('miss');
      }, 360);
      setTimeout(function () {
        a.classList.remove('flip', 'miss');
        b.classList.remove('flip', 'miss');
        a.setAttribute('aria-label', 'Hidden card');
        b.setAttribute('aria-label', 'Hidden card');
        first = null; lock = false;
      }, 820);
    }
  }

  function finish() {
    stopTimer();
    winTime.textContent = fmt(seconds);
    winMoves.textContent = String(moves);
    var perfect = moves === totalPairs;
    winSub.textContent = perfect
      ? 'A flawless run — every flip a match.'
      : 'Every pair found in ' + fmt(seconds) + '. Beat it next round.';
    setTimeout(function () { winEl.classList.add('show'); burst(); }, 420);
  }

  // confetti burst on win
  function burst() {
    var colors = ['#ff7eb6', '#7c5cff', '#45e0c4', '#ffd166', '#ffffff'];
    confetti.innerHTML = '';
    var n = 70;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      var c = colors[Math.floor(Math.random() * colors.length)];
      var left = Math.random() * 100;
      var delay = Math.random() * 0.5;
      var dur = 1.3 + Math.random() * 1.1;
      var rot = Math.floor(Math.random() * 360);
      var drift = (Math.random() * 2 - 1) * 60;
      p.style.background = c;
      p.style.left = left + '%';
      p.style.borderRadius = (Math.random() < 0.3 ? '50%' : '2px');
      p.animate(
        [
          { transform: 'translate(0,0) rotate(' + rot + 'deg)', opacity: 1 },
          { transform: 'translate(' + drift + 'px, 460px) rotate(' + (rot + 540) + 'deg)', opacity: 0 }
        ],
        { duration: dur * 1000, delay: delay * 1000, easing: 'cubic-bezier(0.2,0.6,0.3,1)', fill: 'forwards' }
      );
      confetti.appendChild(p);
    }
  }

  // difficulty toggle
  var diff = document.getElementById('diff');
  diff.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var nc = parseInt(b.dataset.cols, 10);
    diff.querySelectorAll('button').forEach(function (x) {
      var on = x === b;
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (nc !== cols) { cols = nc; reset(); }
  });

  document.getElementById('restart').addEventListener('click', reset);
  document.getElementById('again').addEventListener('click', reset);

  reset();
})();
`.trim()

export const memory: Template = {
  id: 'memory',
  kind: 'page',
  name: 'Memory Match',
  tagline: 'A snappy card-matching memory game',
  categories: ['Games'],
  audiences: ['game', 'puzzle', 'fun'],
  description:
    'A snappy, premium memory-match game built in pure JS/DOM — no libraries. Cards flip in real 3D over a patterned gradient back, matches celebrate with a pulse and confetti, and a live HUD tracks moves, an mm:ss timer, and matched pairs. Toggle Easy 4×4 or Hard 6×6 to reshuffle, and a win overlay shows your final time and move count.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap',
    ],
  },
  stageBg: '#0e1020',
  notes:
    'Pure JS/DOM memory game — no libraries. Knobs live in the `:root` palette: `--c1..--c4` are the accent colors, `--back-1/--back-2` color the card-back gradient, `--face` is the flipped card surface, and `--grad` is the shared pink→violet gradient (logo, win button, title). Card symbols are the `SYMBOLS` array at the top of the JS — swap in any emoji (each game uses the first N for an N-pair board); keep at least 18 so Hard 6×6 has enough. Difficulty grids are set by the segmented control buttons via `data-cols` (4 or 6); change `cols` defaults in JS or add another button (e.g. data-cols="8") for a bigger board. Flip speed = the `.inner` transition; match/miss timings are the `setTimeout` delays in `onFlip`. Win confetti count/colors are in `burst()`.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0e1020',
  },
}
