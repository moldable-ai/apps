import type { Template } from '../types'

// A friendly, self-contained multiple-choice quiz with a satisfying flow:
// start screen → one-card-at-a-time questions with instant correct/incorrect
// locking + explanations → a results screen with an SVG score ring, a grade
// message, and a per-question recap. Pure JS state machine, hand-rolled SVG —
// no libraries, no imagery. Topic: world capitals & geography.

const CSS = `
:root {
  --bg: #0e1320;
  --bg-2: #131a2c;
  --card: #182238;
  --card-2: #1d2942;
  --line: rgba(255,255,255,0.08);
  --ink: #f3f6fc;
  --mut: #97a3bd;
  --faint: #5f6b85;
  --accent: #6c8bff;       /* primary accent (indigo-blue) */
  --accent-2: #a78bfa;     /* secondary accent (violet)    */
  --accent-soft: rgba(108,139,255,0.14);
  --good: #34d39a;         /* correct  */
  --good-soft: rgba(52,211,154,0.13);
  --bad: #fb6f8a;          /* incorrect */
  --bad-soft: rgba(251,111,138,0.13);
  --grad: linear-gradient(120deg, var(--accent), var(--accent-2));
  --shadow: 0 24px 60px -30px rgba(8,12,24,0.9);
  --display: 'Clash Display', 'Space Grotesk', sans-serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body {
  background:
    radial-gradient(1100px 620px at 18% -8%, rgba(108,139,255,0.16), transparent 60%),
    radial-gradient(900px 560px at 92% 8%, rgba(167,139,250,0.13), transparent 62%),
    var(--bg);
  color: var(--ink);
  min-height: 100vh;
}
.num { font-variant-numeric: tabular-nums; }
.wrap {
  max-width: 660px;
  margin: 0 auto;
  padding: clamp(20px, 5vw, 56px) clamp(16px, 4vw, 28px) 64px;
  min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center;
}

/* shared card surface */
.stage { position: relative; }
.scene { display: none; }
.scene.active { display: block; animation: scene-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
@keyframes scene-in { from { opacity: 0; transform: translateY(14px) scale(0.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .scene.active { animation: none; } }

.panel {
  background: linear-gradient(180deg, var(--card), var(--bg-2));
  border: 1px solid var(--line);
  border-radius: clamp(20px, 4vw, 28px);
  padding: clamp(24px, 5vw, 40px);
  box-shadow: var(--shadow);
}

/* brand chip */
.brand { display: inline-flex; align-items: center; gap: 11px; font-weight: 600; font-size: 14px; letter-spacing: -0.01em; color: var(--mut); }
.brand .glyph { width: 30px; height: 30px; border-radius: 9px; background: var(--grad); box-shadow: 0 8px 22px -8px var(--accent); display: grid; place-items: center; color: #fff; font-size: 15px; }

/* ===== START SCENE ===== */
.start { text-align: center; }
.start .brand { justify-content: center; margin-bottom: clamp(20px, 5vw, 30px); }
.kicker { font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; font-size: 12px; color: var(--accent-2); }
.start h1 {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(33px, 8.5vw, 56px); line-height: 1.02; letter-spacing: -0.025em;
  margin: 14px 0 0; text-wrap: balance;
}
.start p.lede { color: var(--mut); font-size: clamp(15px, 3.4vw, 17px); line-height: 1.55; margin: 16px auto 0; max-width: 42ch; }
.facts { display: inline-flex; align-items: center; gap: 14px; margin: clamp(22px,5vw,30px) 0 clamp(26px,5vw,34px); color: var(--ink); font-weight: 600; font-size: 14px; }
.facts .pill { display: inline-flex; align-items: center; gap: 8px; padding: 9px 15px; background: var(--accent-soft); border: 1px solid var(--line); border-radius: 999px; }
.facts .pill svg { width: 15px; height: 15px; stroke: var(--accent); }
.facts .sep { width: 5px; height: 5px; border-radius: 50%; background: var(--faint); }

/* primary button */
.btn {
  appearance: none; border: 0; cursor: pointer; font-family: var(--body);
  font-weight: 600; font-size: 16px; color: #0c1020;
  padding: 15px 34px; border-radius: 14px; background: var(--grad);
  box-shadow: 0 16px 34px -16px var(--accent); transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 22px 42px -16px var(--accent); filter: brightness(1.04); }
.btn:active { transform: translateY(0); }
.btn:focus-visible { outline: 3px solid var(--accent-2); outline-offset: 3px; }
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); box-shadow: none; }
.btn.ghost:hover { background: var(--card-2); }

/* ===== QUESTION SCENE ===== */
.qhead { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.qcount { font-weight: 600; font-size: 13.5px; color: var(--mut); letter-spacing: 0.01em; }
.qcount b { color: var(--ink); }
.qscore { font-size: 13px; font-weight: 700; color: var(--accent-2); display: inline-flex; align-items: center; gap: 7px; }
.qscore::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--accent-2); box-shadow: 0 0 0 4px var(--accent-soft); }

.progress { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; margin-bottom: clamp(20px, 5vw, 28px); }
.progress > i { display: block; height: 100%; width: 0; border-radius: 999px; background: var(--grad); transition: width 0.6s cubic-bezier(0.22,1,0.36,1); }

.qtext { font-family: var(--display); font-weight: 600; font-size: clamp(22px, 5.2vw, 30px); line-height: 1.18; letter-spacing: -0.018em; margin: 0 0 clamp(20px,5vw,26px); text-wrap: balance; }

.options { display: grid; gap: 11px; }
.opt {
  position: relative; display: flex; align-items: center; gap: 14px; width: 100%; text-align: left;
  appearance: none; cursor: pointer; font-family: var(--body); color: var(--ink); font-size: clamp(15px, 3.6vw, 16.5px); font-weight: 500;
  padding: 16px 18px; border-radius: 15px; background: var(--card-2); border: 1.5px solid var(--line);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.12s ease;
}
.opt:hover:not(:disabled) { border-color: var(--accent); background: #21314f; }
.opt:active:not(:disabled) { transform: scale(0.992); }
.opt:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.opt:disabled { cursor: default; }
.opt .key {
  flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  font-weight: 700; font-size: 13px; color: var(--mut); background: rgba(255,255,255,0.05); border: 1px solid var(--line);
  transition: all 0.18s ease;
}
.opt .label { flex: 1; }
.opt .mark { flex: none; width: 22px; height: 22px; opacity: 0; transform: scale(0.4); transition: opacity 0.22s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.opt .mark svg { width: 100%; height: 100%; display: block; }

.opt.correct { border-color: var(--good); background: var(--good-soft); }
.opt.correct .key { background: var(--good); color: #06150f; border-color: var(--good); }
.opt.correct .mark { opacity: 1; transform: scale(1); }
.opt.correct .mark svg { stroke: var(--good); }
.opt.wrong { border-color: var(--bad); background: var(--bad-soft); }
.opt.wrong .key { background: var(--bad); color: #1a0509; border-color: var(--bad); }
.opt.wrong .mark { opacity: 1; transform: scale(1); }
.opt.wrong .mark svg { stroke: var(--bad); }
.opt.dim { opacity: 0.55; }

/* explanation + next */
.explain {
  display: grid; grid-template-rows: 0fr; opacity: 0; margin-top: 0;
  transition: grid-template-rows 0.42s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease, margin-top 0.42s ease;
}
.explain.show { grid-template-rows: 1fr; opacity: 1; margin-top: 18px; }
.explain > div { overflow: hidden; }
.explain .inner { display: flex; gap: 13px; align-items: flex-start; padding: 16px 18px; border-radius: 14px; background: rgba(255,255,255,0.035); border: 1px solid var(--line); }
.explain .verdict { font-weight: 700; font-size: 14px; }
.explain .verdict.good { color: var(--good); }
.explain .verdict.bad { color: var(--bad); }
.explain p { margin: 4px 0 0; color: var(--mut); font-size: 14px; line-height: 1.5; }
.explain .icon { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; margin-top: 1px; }
.explain .icon.good { background: var(--good-soft); color: var(--good); }
.explain .icon.bad { background: var(--bad-soft); color: var(--bad); }
.explain .icon svg { width: 15px; height: 15px; }

.qfoot { display: flex; justify-content: flex-end; margin-top: clamp(18px,4vw,22px); min-height: 4px; }
.qfoot .btn { display: none; padding: 13px 30px; }
.qfoot.ready .btn { display: inline-flex; align-items: center; gap: 9px; animation: scene-in 0.34s ease both; }
.qfoot .btn svg { width: 16px; height: 16px; }

/* ===== RESULTS SCENE ===== */
.results { text-align: center; }
.results .brand { justify-content: center; margin-bottom: 20px; }
.ringwrap { position: relative; width: clamp(180px, 50vw, 220px); height: clamp(180px, 50vw, 220px); margin: 6px auto clamp(18px,4vw,24px); }
.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring .track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 9; }
.ring .meter { fill: none; stroke: url(#ringgrad); stroke-width: 9; stroke-linecap: round; stroke-dasharray: 0 999; transition: stroke-dasharray 1.3s cubic-bezier(0.22,1,0.36,1); }
.ringcenter { position: absolute; inset: 0; display: grid; place-items: center; }
.ringcenter .big { font-family: var(--display); font-weight: 600; font-size: clamp(40px, 11vw, 58px); letter-spacing: -0.03em; line-height: 1; }
.ringcenter .big sub { font-size: 0.42em; color: var(--mut); font-weight: 500; vertical-align: baseline; letter-spacing: 0; }
.ringcenter .pct { color: var(--mut); font-size: 13px; font-weight: 600; margin-top: 6px; letter-spacing: 0.02em; }

.grade { font-family: var(--display); font-weight: 600; font-size: clamp(24px, 6vw, 32px); letter-spacing: -0.02em; margin: 0; }
.results .msg { color: var(--mut); font-size: clamp(14.5px, 3.4vw, 16px); line-height: 1.55; margin: 10px auto 0; max-width: 40ch; }

.recap { margin-top: clamp(24px,5vw,30px); text-align: left; }
.recap .rh { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); margin-bottom: 12px; }
.recap ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.recap li { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 13px; background: var(--card-2); border: 1px solid var(--line); }
.recap .badge { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; font-weight: 700; }
.recap .badge svg { width: 15px; height: 15px; }
.recap .badge.good { background: var(--good-soft); color: var(--good); }
.recap .badge.bad { background: var(--bad-soft); color: var(--bad); }
.recap .rq { flex: 1; font-size: 14px; font-weight: 500; line-height: 1.35; }
.recap .ra { font-size: 12.5px; color: var(--mut); font-weight: 600; flex: none; max-width: 38%; text-align: right; }
.recap .ra b { color: var(--ink); }

.again { margin-top: clamp(24px,5vw,30px); display: flex; flex-direction: column; align-items: center; gap: 14px; }

.confetti { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 40; }
.confetti i { position: absolute; top: -12px; width: 9px; height: 14px; border-radius: 2px; opacity: 0.9; animation: fall linear forwards; }
@keyframes fall { to { transform: translateY(108vh) rotate(640deg); opacity: 0.2; } }
@media (prefers-reduced-motion: reduce) { .confetti { display: none; } }

@media (max-width: 640px) {
  .wrap { padding: clamp(16px, 6vw, 32px) 14px 48px; }
  .panel { padding: clamp(20px, 6vw, 30px); }
  .facts { flex-direction: column; gap: 10px; }
  .facts .sep { display: none; }
  .recap .ra { display: none; }
  .recap .rq { font-size: 13.5px; }
  .qhead { gap: 10px; flex-wrap: wrap; }
  .opt { padding: 14px 14px; gap: 11px; }
  .opt .key { width: 27px; height: 27px; }
}
@media (max-width: 390px) {
  .wrap { padding: 14px 11px 40px; }
  .start h1 { font-size: clamp(28px, 9vw, 34px); }
  .facts .pill { padding: 8px 13px; }
}
`.trim()

const HTML = `
<div class="wrap">
  <div class="stage">

    <!-- ===== START ===== -->
    <section class="scene active" id="scene-start" aria-labelledby="quiz-title">
      <div class="panel start">
        <span class="brand"><span class="glyph">◆</span> Atlas Quiz</span>
        <span class="kicker">World Geography</span>
        <h1 id="quiz-title">Capitals of the World</h1>
        <p class="lede">Ten questions on the capital cities, flags, and famous landmarks that map our planet. No streaks, no pressure — just see how far your atlas takes you.</p>
        <div class="facts">
          <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg> 10 questions</span>
          <span class="sep"></span>
          <span class="pill"><svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 4 minutes</span>
        </div>
        <div>
          <button class="btn" id="start-btn" type="button">Start quiz</button>
        </div>
      </div>
    </section>

    <!-- ===== QUESTION ===== -->
    <section class="scene" id="scene-quiz" aria-live="polite">
      <div class="panel">
        <div class="qhead">
          <span class="qcount">Question <b id="q-now">1</b> of <span id="q-total">10</span></span>
          <span class="qscore num"><span id="q-score">0</span> correct</span>
        </div>
        <div class="progress"><i id="q-bar"></i></div>
        <h2 class="qtext" id="q-text">…</h2>
        <div class="options" id="q-options" role="group" aria-label="Answer choices"></div>
        <div class="explain" id="q-explain">
          <div><div class="inner">
            <span class="icon" id="ex-icon"></span>
            <div>
              <div class="verdict" id="ex-verdict"></div>
              <p id="ex-text"></p>
            </div>
          </div></div>
        </div>
        <div class="qfoot" id="q-foot">
          <button class="btn" id="next-btn" type="button">
            <span id="next-label">Next</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ===== RESULTS ===== -->
    <section class="scene" id="scene-results" aria-labelledby="result-grade">
      <div class="panel results">
        <span class="brand"><span class="glyph">◆</span> Atlas Quiz</span>
        <div class="ringwrap">
          <svg class="ring" viewBox="0 0 120 120">
            <defs><linearGradient id="ringgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6c8bff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
            <circle class="track" cx="60" cy="60" r="52"/>
            <circle class="meter" id="ring-meter" cx="60" cy="60" r="52"/>
          </svg>
          <div class="ringcenter">
            <div class="big num"><span id="r-score">0</span><sub>/<span id="r-total">10</span></sub></div>
            <div class="pct num" id="r-pct">0%</div>
          </div>
        </div>
        <h2 class="grade" id="result-grade">—</h2>
        <p class="msg" id="result-msg">—</p>

        <div class="recap">
          <div class="rh">Question recap</div>
          <ol id="recap-list"></ol>
        </div>

        <div class="again">
          <button class="btn" id="again-btn" type="button">Try again</button>
          <span style="color:var(--faint);font-size:12.5px">Your score isn’t saved anywhere.</span>
        </div>
      </div>
    </section>

  </div>
</div>
`.trim()

const JS = `
(function () {
  'use strict';

  // ---- Quiz data (real world-capitals & geography trivia) ----
  var QUESTIONS = [
    {
      q: 'What is the capital of Australia?',
      options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'],
      answer: 1,
      why: 'Canberra was purpose-built as a compromise between rival cities Sydney and Melbourne, becoming the capital in 1913.'
    },
    {
      q: 'Which country has Brasília as its capital?',
      options: ['Argentina', 'Portugal', 'Brazil', 'Colombia'],
      answer: 2,
      why: 'Brasília was carved out of the highlands and inaugurated in 1960 to pull development inland from the coast.'
    },
    {
      q: 'The city of Cairo sits along which great river?',
      options: ['The Congo', 'The Niger', 'The Zambezi', 'The Nile'],
      answer: 3,
      why: 'Cairo straddles the Nile near its delta — the river has anchored Egyptian life for over five thousand years.'
    },
    {
      q: 'What is the capital of Canada?',
      options: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'],
      answer: 2,
      why: 'Queen Victoria chose Ottawa in 1857 — a quiet town safely inland and balanced between English and French Canada.'
    },
    {
      q: 'Which country is NOT crossed by the Equator?',
      options: ['Ecuador', 'Kenya', 'Egypt', 'Indonesia'],
      answer: 2,
      why: 'Egypt lies well north of the Equator. Ecuador (it is even named for it), Kenya, and Indonesia all straddle the line.'
    },
    {
      q: 'Mount Fuji is the highest peak of which country?',
      options: ['South Korea', 'Japan', 'Nepal', 'China'],
      answer: 1,
      why: 'At 3,776 m, Mount Fuji is Japan’s tallest mountain — an active volcano and a sacred national symbol.'
    },
    {
      q: 'What is the most populous city in the world?',
      options: ['Delhi', 'Shanghai', 'São Paulo', 'Tokyo'],
      answer: 3,
      why: 'Greater Tokyo holds roughly 37 million people, making it the largest metropolitan area on Earth.'
    },
    {
      q: 'The Sahara Desert covers most of which continent’s north?',
      options: ['Asia', 'Africa', 'Australia', 'South America'],
      answer: 1,
      why: 'The Sahara blankets North Africa — about 9.2 million km², close to the size of the entire United States.'
    },
    {
      q: 'Which European capital is split by the Bosphorus strait... almost?',
      options: ['Athens', 'Lisbon', 'Istanbul', 'Vienna'],
      answer: 2,
      why: 'Istanbul spans the Bosphorus, sitting on two continents — though Turkey’s official capital is actually Ankara.'
    },
    {
      q: 'What is the capital of New Zealand?',
      options: ['Auckland', 'Wellington', 'Christchurch', 'Queenstown'],
      answer: 1,
      why: 'Wellington, at the windy southern tip of the North Island, has been the capital since 1865 — Auckland is just the largest city.'
    }
  ];

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var KEYS = ['A', 'B', 'C', 'D'];

  // ---- State ----
  var idx = 0;
  var score = 0;
  var locked = false;
  var history = []; // { picked, correct, q }

  // ---- DOM ----
  var $ = function (id) { return document.getElementById(id); };
  var sceneStart = $('scene-start');
  var sceneQuiz = $('scene-quiz');
  var sceneResults = $('scene-results');

  var elQNow = $('q-now'), elQTotal = $('q-total'), elScore = $('q-score');
  var elBar = $('q-bar'), elText = $('q-text'), elOptions = $('q-options');
  var elExplain = $('q-explain'), elExIcon = $('ex-icon'), elExVerdict = $('ex-verdict'), elExText = $('ex-text');
  var elFoot = $('q-foot'), elNextBtn = $('next-btn'), elNextLabel = $('next-label');

  var TOTAL = QUESTIONS.length;
  elQTotal.textContent = String(TOTAL);
  $('r-total').textContent = String(TOTAL);

  function show(scene) {
    [sceneStart, sceneQuiz, sceneResults].forEach(function (s) { s.classList.remove('active'); });
    scene.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion() {
    locked = false;
    var item = QUESTIONS[idx];

    elQNow.textContent = String(idx + 1);
    elScore.textContent = String(score);
    elBar.style.width = (idx / TOTAL * 100) + '%';
    elText.textContent = item.q;

    // collapse explanation + hide next
    elExplain.classList.remove('show');
    elFoot.classList.remove('ready');
    elNextLabel.textContent = (idx === TOTAL - 1) ? 'See results' : 'Next';

    // build options
    elOptions.innerHTML = '';
    item.options.forEach(function (text, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt';
      b.setAttribute('data-i', String(i));
      b.innerHTML =
        '<span class="key">' + KEYS[i] + '</span>' +
        '<span class="label"></span>' +
        '<span class="mark"></span>';
      b.querySelector('.label').textContent = text;
      b.addEventListener('click', function () { choose(i); });
      elOptions.appendChild(b);
    });
  }

  function choose(picked) {
    if (locked) return;
    locked = true;
    var item = QUESTIONS[idx];
    var correct = item.answer;
    var isRight = picked === correct;

    if (isRight) { score++; elScore.textContent = String(score); }
    history.push({ picked: picked, correct: correct, q: item.q, ans: item.options[correct] });

    var btns = elOptions.querySelectorAll('.opt');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      b.disabled = true;
      var bi = parseInt(b.getAttribute('data-i'), 10);
      var mark = b.querySelector('.mark');
      if (bi === correct) {
        b.classList.add('correct');
        mark.innerHTML = ICON_CHECK;
      } else if (bi === picked) {
        b.classList.add('wrong');
        mark.innerHTML = ICON_X;
      } else {
        b.classList.add('dim');
      }
    }

    // explanation
    if (isRight) {
      elExIcon.className = 'icon good'; elExIcon.innerHTML = ICON_CHECK;
      elExVerdict.className = 'verdict good'; elExVerdict.textContent = 'Correct';
    } else {
      elExIcon.className = 'icon bad'; elExIcon.innerHTML = ICON_X;
      elExVerdict.className = 'verdict bad'; elExVerdict.textContent = 'Not quite — it’s ' + item.options[correct];
    }
    elExText.textContent = item.why;
    elExplain.classList.add('show');
    elFoot.classList.add('ready');
    elBar.style.width = ((idx + 1) / TOTAL * 100) + '%';
    elNextBtn.focus();
  }

  function next() {
    if (idx < TOTAL - 1) {
      idx++;
      renderQuestion();
    } else {
      renderResults();
    }
  }

  function gradeFor(pct) {
    if (pct === 100) return { g: 'Flawless. A true cartographer.', m: 'A perfect ten. You didn’t just pass — you redrew the map. Genuinely impressive.' };
    if (pct >= 80) return { g: 'Globetrotter', m: 'You clearly know your way around an atlas. A couple of tricky ones slipped past, but this is a strong run.' };
    if (pct >= 60) return { g: 'Seasoned traveler', m: 'Solid footing across the continents. A little revision on the capitals and you’ll be unbeatable.' };
    if (pct >= 40) return { g: 'Finding your bearings', m: 'You’ve got the big landmarks down. Spend some time with the world map and watch this climb.' };
    return { g: 'Pack a compass', m: 'Everyone starts somewhere. Give it another go — the capitals stick faster the second time around.' };
  }

  function renderResults() {
    var pct = Math.round(score / TOTAL * 100);
    $('r-score').textContent = String(score);
    $('r-pct').textContent = pct + '%';

    var grade = gradeFor(pct);
    $('result-grade').textContent = grade.g;
    $('result-msg').textContent = grade.m;

    // recap list
    var list = $('recap-list');
    list.innerHTML = '';
    history.forEach(function (h, i) {
      var ok = h.picked === h.correct;
      var li = document.createElement('li');
      var badge = '<span class="badge ' + (ok ? 'good' : 'bad') + '">' + (ok ? ICON_CHECK : ICON_X) + '</span>';
      li.innerHTML = badge +
        '<span class="rq"></span>' +
        '<span class="ra">' + (ok ? 'Got it' : 'Answer: <b></b>') + '</span>';
      li.querySelector('.rq').textContent = (i + 1) + '. ' + h.q;
      if (!ok) { li.querySelector('.ra b').textContent = h.ans; }
      list.appendChild(li);
    });

    show(sceneResults);

    // animate the ring (circumference for r=52)
    var meter = $('ring-meter');
    var C = 2 * Math.PI * 52;
    meter.style.strokeDasharray = '0 ' + C;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var on = C * (score / TOTAL);
        meter.style.strokeDasharray = on + ' ' + (C - on);
      });
    });

    if (pct >= 80) { setTimeout(burst, 380); }
  }

  function burst() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colors = ['#6c8bff', '#a78bfa', '#34d39a', '#ffd166', '#fb6f8a'];
    var box = document.createElement('div');
    box.className = 'confetti';
    for (var i = 0; i < 70; i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (2.4 + Math.random() * 1.8) + 's';
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 5000);
  }

  function reset() {
    idx = 0; score = 0; locked = false; history = [];
    renderQuestion();
    show(sceneQuiz);
  }

  // ---- Wire up ----
  $('start-btn').addEventListener('click', function () {
    renderQuestion();
    show(sceneQuiz);
  });
  elNextBtn.addEventListener('click', next);
  $('again-btn').addEventListener('click', reset);

  // keyboard: 1-4 / A-D to answer, Enter/→ to advance
  document.addEventListener('keydown', function (e) {
    if (!sceneQuiz.classList.contains('active')) return;
    var k = e.key.toLowerCase();
    if (!locked) {
      var map = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
      if (map[k] !== undefined) { e.preventDefault(); choose(map[k]); }
    } else if (k === 'enter' || k === 'arrowright') {
      e.preventDefault(); next();
    }
  });
})();
`.trim()

export const quiz: Template = {
  id: 'quiz',
  kind: 'page',
  name: 'Quiz',
  tagline: 'An interactive multiple-choice quiz with results',
  categories: ['Games'],
  audiences: ['education', 'fun', 'interactive'],
  description:
    'A friendly, fully self-contained multiple-choice quiz with a satisfying flow: a start screen, one-question-at-a-time cards that instantly lock and reveal the correct answer plus an explanation, a live score and progress bar, and a results screen with an animated SVG score ring, a grade message that varies by score, a per-question recap, and confetti on a strong run. Pure JS state machine, hand-rolled SVG, keyboard-playable — swap in your own questions to re-theme it for any topic.',
  fonts: {
    display: 'Clash Display',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#0e1320',
  notes:
    'Edit the `QUESTIONS` array in the JS to change the quiz — each item is `{ q, options:[4 strings], answer: 0-3 index, why }`. The number of questions is read automatically (no hard-coded 10), so add or remove freely. Tune the grade tiers and copy in `gradeFor(pct)`. Palette knobs live in `:root`: `--accent`/`--accent-2` drive the gradient (button, ring, progress, brand), and `--good`/`--bad` are the correct/incorrect colors — keep their `*-soft` rgba variants in sync. Confetti fires at >=80%; change the threshold in `renderResults`. The start-screen facts ("10 questions • 4 minutes") are plain HTML in #scene-start. Keyboard: 1-4 / A-D to answer, Enter or → to advance. Fonts: Clash Display (display) + Inter (body).',
  samplePage: {
    fontLinks: [
      'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#0e1320',
  },
}
