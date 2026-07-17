import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER = 'assets/security-training-cover.jpg'

// Deck-wide behavior: a find-the-red-flags game on a mock email, a branching
// "make the call" scenario, a crack-time calculator, and a scored three-question
// quiz. All state is local to this closure; widgets re-render idempotently on
// slide change and live edits. No network, no libraries, nothing leaves the room.
const RUNTIME_JS = `
(function () {
  var FLAGS = {
    sender: "Look-alike domain. Real Northwind mail comes from northwind.example - this is nord-wind-secure.com.",
    urgency: "Manufactured urgency. Two-hour deadlines exist to stop you from thinking. Real IT gives you days.",
    greeting: "Generic greeting. Your own IT team knows your name - mass phish kits do not.",
    link: "Mismatched link. The text says SSO portal, the destination is security-login.net. Hover before you ever click.",
    attach: "Unexpected attachment. Password resets never arrive as .zip files. Never open it - report it."
  };
  var phish = { found: {} };

  var SCENARIO = {
    a: { verdict: "Risky", cls: "bad", text: "The cards are gone the moment you send the codes. This exact script costs companies thousands every week - the CEO's name and photo are public information." },
    b: { verdict: "Better", cls: "warn", text: "Good instinct to pause - but replying keeps the conversation on the attacker's channel. They will answer instantly, warmly, and with more pressure." },
    c: { verdict: "Right call", cls: "good", text: "Verify on a channel YOU choose - Slack, or their real number. Takes ninety seconds, and reporting it protects the next person on the list." }
  };
  var scenario = { picked: null };

  var crack = { length: 8, upper: true, digits: true, symbols: false };

  var QUIZ = [
    { q: "An email from your bank says: verify your account within 24 hours. What is the move?",
      options: [
        { t: "Click the link - the branding looks right", ok: false, why: "Branding is the easiest thing to fake. Perfect logos prove nothing." },
        { t: "Open the bank's app, or type the address yourself", ok: true, why: "Exactly. Go to the source on a path you control - never the path they hand you." },
        { t: "Reply and ask whether it is genuine", ok: false, why: "You would be asking the attacker. They will say yes, politely." }
      ] },
    { q: "Which of these is the strongest password?",
      options: [
        { t: "Tr0ub4d0r!", ok: false, why: "Substitutions are in every cracking dictionary. Ten characters falls in hours." },
        { t: "Four random words, e.g. plum-canoe-thunder-lamp", ok: true, why: "Right. Length beats cleverness - four random words outlast any symbol soup." },
        { t: "Your pet's name plus your birth year", ok: false, why: "Both are on your social profiles. This is a guess, not a crack." }
      ] },
    { q: "You clicked a link and typed your password before realizing. First move?",
      options: [
        { t: "Change the password and tell security now", ok: true, why: "Yes. Minutes matter, and nobody here gets in trouble for reporting." },
        { t: "Watch the account for a few days", ok: false, why: "Attackers automate the takeover - they are faster than your vigilance." },
        { t: "Delete the email and move on", ok: false, why: "That hides the one clue security needs to protect everyone else." }
      ] },
  ];
  var quiz = { index: 0, score: 0, answered: false, done: false };

  /* ---------- Durable host-backed persistence ---------- */
  var stateStore = window.moldableState('security-training:v1');
  var prefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hydrated = false;
  var persistQueued = false;
  function persist() {
    if (!hydrated) { persistQueued = true; return; }
    stateStore.set({
      found: phish.found, picked: scenario.picked, crack: crack, quiz: quiz
    }).catch(function () {});
  }
  var hydration = stateStore.get(null).then(function (saved) {
      if (!saved) { hydrated = true; return; }
      if (saved.found) phish.found = saved.found;
      if (saved.picked) scenario.picked = saved.picked;
      if (saved.crack) crack = saved.crack;
      if (saved.quiz) quiz = saved.quiz;
      hydrated = true;
    }, function () { hydrated = true; });

  /* ---------- Phish hotspot game ---------- */
  function phishCount() {
    var n = 0;
    Object.keys(FLAGS).forEach(function (key) { if (phish.found[key]) n += 1; });
    return n;
  }
  function renderPhish(root) {
    var found = phishCount();
    Object.keys(FLAGS).forEach(function (key) {
      var spot = root.querySelector('[data-flag="' + key + '"]');
      var item = root.querySelector('[data-flag-item="' + key + '"]');
      var isFound = !!phish.found[key];
      if (spot) spot.classList.toggle('found', isFound);
      if (item) item.classList.toggle('revealed', isFound);
    });
    var scope = root.closest('.slide') || root;
    var counter = scope.querySelector('[data-phish-found]');
    if (counter) counter.textContent = found + ' / 5 found';
    var done = root.querySelector('[data-phish-done]');
    if (done) done.style.display = found === 5 ? '' : 'none';
  }

  /* ---------- Scenario ---------- */
  function renderScenario(root) {
    root.querySelectorAll('[data-choice]').forEach(function (btn) {
      btn.classList.toggle('picked', btn.getAttribute('data-choice') === scenario.picked);
    });
    var out = root.querySelector('[data-scenario-out]');
    if (!out) return;
    if (!scenario.picked) {
      out.className = 'sc-out';
      out.innerHTML = '';
      var hint = document.createElement('div');
      hint.className = 'sc-hint';
      hint.textContent = 'Pick a response to see how it plays out.';
      out.appendChild(hint);
      return;
    }
    var data = SCENARIO[scenario.picked];
    out.className = 'sc-out ' + data.cls;
    out.innerHTML = '';
    var chip = document.createElement('div');
    chip.className = 'sc-verdict';
    chip.textContent = data.verdict;
    var text = document.createElement('p');
    text.className = 'sc-text';
    text.textContent = data.text;
    var more = document.createElement('div');
    more.className = 'sc-hint';
    more.textContent = 'Try the other responses too.';
    out.appendChild(chip); out.appendChild(text); out.appendChild(more);
  }

  /* ---------- Crack-time lab ---------- */
  function crackTime() {
    var pool = 26 + (crack.upper ? 26 : 0) + (crack.digits ? 10 : 0) + (crack.symbols ? 32 : 0);
    var seconds = Math.pow(pool, crack.length) / 1e10;
    return seconds;
  }
  function crackLabel(seconds) {
    if (seconds < 1) return 'instantly';
    if (seconds < 60) return Math.round(seconds) + ' seconds';
    if (seconds < 3600) return Math.round(seconds / 60) + ' minutes';
    if (seconds < 86400) return Math.round(seconds / 3600) + ' hours';
    if (seconds < 31557600) return Math.round(seconds / 86400) + ' days';
    var years = seconds / 31557600;
    if (years < 1000) return Math.round(years) + ' years';
    if (years < 1e6) return Math.round(years / 1000) + ' thousand years';
    if (years < 1e9) return Math.round(years / 1e6) + ' million years';
    if (years < 1e12) return Math.round(years / 1e9) + ' billion years';
    return 'longer than the universe has existed';
  }
  function renderCrack(root) {
    var lengthInput = root.querySelector('[name="pwlen"]');
    if (lengthInput && Number(lengthInput.value) !== crack.length) lengthInput.value = crack.length;
    ['upper', 'digits', 'symbols'].forEach(function (key) {
      var btn = root.querySelector('[data-charset="' + key + '"]');
      if (btn) {
        btn.classList.toggle('on', !!crack[key]);
        btn.setAttribute('aria-pressed', crack[key] ? 'true' : 'false');
      }
    });
    var seconds = crackTime();
    var out = root.querySelector('[data-crack-out]');
    if (out) out.textContent = crackLabel(seconds);
    var lenOut = root.querySelector('[data-crack-len]');
    if (lenOut) lenOut.textContent = crack.length + ' characters';
    var bar = root.querySelector('[data-crack-bar]');
    if (bar) {
      var pct = Math.max(2, Math.min(100, (Math.log(Math.max(seconds, 0.001)) / Math.LN10 + 3) / 21 * 100));
      bar.style.width = pct + '%';
    }
  }

  /* ---------- Quiz ---------- */
  function renderQuiz(root) {
    var qEl = root.querySelector('[data-quiz-q]');
    var optsEl = root.querySelector('[data-quiz-options]');
    var progressEl = root.querySelector('[data-quiz-progress]');
    var feedbackEl = root.querySelector('[data-quiz-feedback]');
    var nextEl = root.querySelector('[data-quiz-next]');
    var resultEl = root.querySelector('[data-quiz-result]');
    var cardEl = root.querySelector('[data-quiz-card]');
    if (!qEl || !optsEl) return;

    if (quiz.done) {
      if (cardEl) cardEl.style.display = 'none';
      if (resultEl) {
        resultEl.style.display = '';
        var scoreEl = resultEl.querySelector('[data-quiz-score]');
        var lineEl = resultEl.querySelector('[data-quiz-line]');
        if (scoreEl) scoreEl.textContent = quiz.score + ' / ' + QUIZ.length;
        if (lineEl) lineEl.textContent =
          quiz.score === 3 ? 'Hardest target in the building. Go be insufferable about it.' :
          quiz.score === 2 ? 'Solid. One more habit and the phish kits move on to easier water.' :
          'Worth a second run - the answers are habits, not trivia.';
      }
      return;
    }
    if (cardEl) cardEl.style.display = '';
    if (resultEl) resultEl.style.display = 'none';

    var item = QUIZ[quiz.index];
    qEl.textContent = item.q;
    if (progressEl) progressEl.textContent = 'Question ' + (quiz.index + 1) + ' of ' + QUIZ.length;
    optsEl.innerHTML = '';
    optsEl.classList.toggle('locked', quiz.answered);
    item.options.forEach(function (option, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'qz-opt';
      btn.setAttribute('data-quiz-answer', String(i));
      btn.textContent = option.t;
      if (quiz.answered) {
        if (option.ok) btn.classList.add('right');
        else if (quiz.lastPick === i) btn.classList.add('wrong');
      }
      optsEl.appendChild(btn);
    });
    if (feedbackEl) {
      if (quiz.answered) {
        var picked = item.options[quiz.lastPick];
        feedbackEl.textContent = picked.why;
        feedbackEl.className = 'qz-why ' + (picked.ok ? 'good' : 'bad');
      } else {
        feedbackEl.textContent = '';
        feedbackEl.className = 'qz-why';
      }
    }
    if (nextEl) nextEl.style.display = quiz.answered ? '' : 'none';
  }

  /* ---------- Delegated events ---------- */
  document.addEventListener('click', function (event) {
    if (!event.target || !event.target.closest) return;
    var spot = event.target.closest('[data-flag]');
    if (spot) {
      var phishRoot = spot.closest('[data-phish]');
      if (phishRoot) {
        phish.found[spot.getAttribute('data-flag')] = true;
        renderPhish(phishRoot);
        var item = phishRoot.querySelector('[data-flag-item="' + spot.getAttribute('data-flag') + '"]');
        if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'auto' : 'smooth' });
        persist();
      }
      return;
    }
    var phishReset = event.target.closest('[data-phish-reset]');
    if (phishReset) {
      var resetRoot = phishReset.closest('[data-phish]');
      if (resetRoot) { phish.found = {}; renderPhish(resetRoot); persist(); }
      return;
    }
    var choice = event.target.closest('[data-choice]');
    if (choice) {
      var scRoot = choice.closest('[data-scenario]');
      if (scRoot) {
        scenario.picked = choice.getAttribute('data-choice');
        renderScenario(scRoot);
        persist();
      }
      return;
    }
    var charset = event.target.closest('[data-charset]');
    if (charset) {
      var crackRoot = charset.closest('[data-crack]');
      if (crackRoot) {
        var key = charset.getAttribute('data-charset');
        crack[key] = !crack[key];
        renderCrack(crackRoot);
        persist();
      }
      return;
    }
    var answer = event.target.closest('[data-quiz-answer]');
    if (answer && !quiz.answered) {
      var quizRoot = answer.closest('[data-quiz]');
      if (quizRoot) {
        quiz.answered = true;
        quiz.lastPick = Number(answer.getAttribute('data-quiz-answer'));
        if (QUIZ[quiz.index].options[quiz.lastPick].ok) quiz.score += 1;
        renderQuiz(quizRoot);
        persist();
      }
      return;
    }
    var next = event.target.closest('[data-quiz-next]');
    if (next) {
      var nextRoot = next.closest('[data-quiz]');
      if (nextRoot) {
        if (quiz.index + 1 >= QUIZ.length) { quiz.done = true; }
        else { quiz.index += 1; quiz.answered = false; quiz.lastPick = null; }
        renderQuiz(nextRoot);
        persist();
      }
      return;
    }
    var retry = event.target.closest('[data-quiz-retry]');
    if (retry) {
      var retryRoot = retry.closest('[data-quiz]');
      if (retryRoot) {
        quiz.index = 0; quiz.score = 0; quiz.answered = false; quiz.done = false; quiz.lastPick = null;
        renderQuiz(retryRoot);
        persist();
      }
    }
  });

  document.addEventListener('input', function (event) {
    if (!event.target || !event.target.closest) return;
    var crackRoot = event.target.closest('[data-crack]');
    if (crackRoot && event.target.getAttribute('name') === 'pwlen') {
      crack.length = Number(event.target.value) || 8;
      renderCrack(crackRoot);
      persist();
    }
  });

  function init() {
    document.querySelectorAll('[data-phish]').forEach(renderPhish);
    document.querySelectorAll('[data-scenario]').forEach(renderScenario);
    document.querySelectorAll('[data-crack]').forEach(renderCrack);
    document.querySelectorAll('[data-quiz]').forEach(renderQuiz);
  }
  document.addEventListener('deck:slidechange', init);
  document.addEventListener('deck:slidepatch', init);
  hydration.then(function () { init(); if (persistQueued) persist(); });
})();
`.trim()

export const securityTraining: Template = {
  id: 'security-training',
  kind: 'deck',
  categories: ['Decks'],
  name: 'Security Training',
  tagline: 'The training deck people actually do',
  audiences: ['people ops', 'IT', 'trainer', 'all-hands'],
  description:
    'A utilitarian "field manual" on warm paper — condensed caps, mono labels, one hazard-orange accent. The drills run inside the slides: find the red flags on a mock phishing email, choose a response and see how it plays out, drag a slider to watch crack-times explode, and finish with a scored quiz. Training as a game, not a lecture.',
  fonts: {
    display: 'Barlow Condensed',
    body: 'Barlow',
    mono: 'Space Mono',
    links: [
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#f5f2ea',
    '--text': '#1d1e21',
    '--muted': '#7d7a70',
    '--accent': '#d4531e',
    '--accent-2': '#44618c',
    '--display': "'Barlow Condensed', sans-serif",
    '--body': "'Barlow', sans-serif",
    '--mono': "'Space Mono', monospace",
    '--display-weight': '700',
    '--headline-weight': '600',
    '--title-size': '140px',
    '--display-size': '168px',
    '--headline-size': '88px',
    '--subhead-size': '50px',
    '--lead-size': '36px',
    '--bullet-size': '33px',
    '--kicker-font': "'Space Mono', monospace",
    '--kicker-tracking': '0.2em',
    '--kicker-size': '20px',
    '--card-bg': '#fdfcf8',
    '--card-border': 'rgba(29,30,33,0.16)',
    '--radius': '10px',
    '--stat-size': '110px',
    '--metric-size': '124px',
    '--th-border': 'rgba(29,30,33,0.6)',
    '--table-border': 'rgba(29,30,33,0.12)',
    '--table-size': '28px',
    '--rule-color': 'rgba(29,30,33,0.16)',
    '--bullet-color': '#d4531e',
    '--chip-bg': 'rgba(212,83,30,0.08)',
    '--media-border': '1px solid rgba(29,30,33,0.16)',
    '--media-shadow': '0 30px 60px -30px rgba(29,30,33,0.35)',
    '--scrim':
      'linear-gradient(180deg, rgba(26,24,20,0.05) 0%, rgba(26,24,20,0.32) 55%, rgba(26,24,20,0.82) 100%)',
    '--pos': '#3c7a4e',
    '--neg': '#b3402e',
  },
  stageBg: '#191a17',
  assets: ['security-training-cover.jpg'],
  decoration: `.display, .title, .headline, .section-title, .divider-title { text-transform: uppercase; letter-spacing: 0.01em; }
.kicker { color: var(--accent); }
.stat-num, .metric, .donut-label { color: var(--accent); }
.bar-fill { background: var(--accent); }
.runner-brand::before { border-radius: 2px; background: var(--accent); }

/* ---- Hazard stripe rule ---- */
.hazard { height: 12px; width: 220px; background: repeating-linear-gradient(-45deg, var(--accent) 0 14px, transparent 14px 28px); }

/* ---- Spec label (mono, boxed) ---- */
.spec { display: inline-flex; align-items: center; gap: 12px; border: 1.5px solid var(--text); padding: 8px 18px; font: 700 19px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--text); background: var(--card-bg); }
.spec.orange { border-color: var(--accent); color: var(--accent); }

/* ---- Drill agenda rows ---- */
.drill { display: grid; grid-template-columns: 190px 1fr auto; gap: 34px; align-items: center; padding: 30px 0; border-top: 1.5px solid rgba(29,30,33,0.18); }
.drill:last-child { border-bottom: 1.5px solid rgba(29,30,33,0.18); }
.drill-n { font: 700 26px var(--mono); color: var(--accent); }
.drill-t { font: 600 52px var(--display); text-transform: uppercase; color: var(--text); line-height: 1; }
.drill-d { font: 400 25px var(--body); color: var(--muted); margin-top: 4px; }

/* ---- Divider treatment ---- */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.divider-num { font: 700 22px var(--mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); }
.divider-title { font: 700 170px var(--display); line-height: 0.92; color: var(--text); }
.divider-meta { font: 400 27px var(--body); color: var(--muted); }

/* ---- Field-manual buttons ---- */
.st-btn { appearance: none; cursor: pointer; border: 2px solid var(--text); background: var(--card-bg); color: var(--text); font: 700 21px var(--mono); letter-spacing: 0.08em; text-transform: uppercase; padding: 13px 26px; border-radius: 6px; }
.st-btn:hover { background: var(--text); color: var(--card-bg); }
.st-btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.st-btn.primary:hover { background: #b8451a; border-color: #b8451a; }
.st-btn.on { background: var(--text); color: var(--card-bg); }
.st-btn:focus-visible { outline: 3px solid rgba(212,83,30,0.55); outline-offset: 2px; }

/* ---- Mock email ---- */
/* Fixed height + internal scroll: revealed flag explanations grow the list past
   the stage, so the columns scroll inside the widget (wheel/touch inside
   data-deck-interactive never navigates the deck). */
.mail-wrap { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 40px; align-items: stretch; height: 700px; }
.mail { background: #fff; border: 1.5px solid rgba(29,30,33,0.2); border-radius: 12px; overflow-y: auto; box-shadow: 0 24px 48px -24px rgba(29,30,33,0.3); }
.mail::-webkit-scrollbar, .flag-list::-webkit-scrollbar { width: 8px; }
.mail::-webkit-scrollbar-thumb, .flag-list::-webkit-scrollbar-thumb { background: rgba(29,30,33,0.22); border-radius: 4px; }
.mail-bar { display: flex; align-items: center; gap: 10px; padding: 14px 22px; background: #eceae2; border-bottom: 1px solid rgba(29,30,33,0.12); }
.mail-bar i { width: 13px; height: 13px; border-radius: 50%; background: rgba(29,30,33,0.16); }
.mail-ext { margin-left: auto; font: 700 15px var(--mono); letter-spacing: 0.1em; color: var(--accent); border: 1.5px solid var(--accent); padding: 3px 10px; border-radius: 4px; }
.mail-head { padding: 20px 26px 14px; border-bottom: 1px solid rgba(29,30,33,0.1); display: flex; flex-direction: column; gap: 7px; }
.mail-row { display: flex; gap: 14px; font: 400 22px var(--body); color: var(--text); align-items: baseline; }
.mail-k { font: 700 15px var(--mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); width: 92px; flex: none; }
.mail-subject { font-weight: 700; }
.mail-body { padding: 22px 26px 26px; font: 400 23px var(--body); line-height: 1.5; color: var(--text); display: flex; flex-direction: column; gap: 16px; }
.mail-attach { display: inline-flex; align-items: center; gap: 10px; border: 1.5px dashed rgba(29,30,33,0.3); border-radius: 8px; padding: 10px 18px; font: 400 21px var(--body); color: var(--text); align-self: flex-start; }
.ph-spot { appearance: none; border: 0; background: transparent; font: inherit; color: inherit; padding: 0 2px; cursor: pointer; border-radius: 4px; border-bottom: 2px dotted transparent; }
.ph-spot:hover { border-bottom-color: var(--accent); background: rgba(212,83,30,0.07); }
.ph-spot:focus-visible { outline: 2.5px solid rgba(212,83,30,0.55); outline-offset: 1px; }
.ph-spot.found { background: rgba(212,83,30,0.16); border-bottom: 2px solid var(--accent); font-weight: 700; }
.flag-list { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; padding-right: 8px; }
.flag { border: 1.5px solid rgba(29,30,33,0.14); border-radius: 10px; padding: 18px 22px; background: var(--card-bg); }
.flag-k { display: flex; align-items: center; gap: 12px; font: 700 17px var(--mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.flag-k::before { content: '?'; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid rgba(29,30,33,0.25); font: 700 15px var(--mono); color: var(--muted); flex: none; }
.flag-d { font: 400 21px var(--body); line-height: 1.4; color: var(--muted); margin-top: 8px; max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.3s ease, opacity 0.3s ease; }
.flag.revealed { border-color: var(--accent); }
.flag.revealed .flag-k { color: var(--accent); }
.flag.revealed .flag-k::before { content: '✓'; border-color: var(--accent); background: var(--accent); color: #fff; }
.flag.revealed .flag-d { max-height: 200px; opacity: 1; color: var(--text); }
.phish-done { border: 2px solid var(--pos); background: rgba(60,122,78,0.08); border-radius: 10px; padding: 14px 20px; font: 700 22px var(--body); color: var(--pos); }

/* ---- Scenario ---- */
.sc { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: stretch; }
.sc-msg { background: #1d1e21; border-radius: 18px; padding: 40px 38px; color: #f5f2ea; display: flex; flex-direction: column; gap: 18px; }
.sc-msg-k { font: 700 17px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; color: rgba(245,242,234,0.55); }
.sc-bubble { background: #34363c; border-radius: 16px 16px 16px 4px; padding: 22px 26px; font: 400 25px var(--body); line-height: 1.45; max-width: 92%; }
.sc-side { display: flex; flex-direction: column; gap: 14px; }
.sc-choice { appearance: none; cursor: pointer; text-align: left; border: 2px solid rgba(29,30,33,0.2); background: var(--card-bg); border-radius: 10px; padding: 20px 24px; font: 600 25px var(--body); color: var(--text); }
.sc-choice:hover { border-color: var(--text); }
.sc-choice.picked { border-color: var(--accent); background: rgba(212,83,30,0.07); }
.sc-choice:focus-visible { outline: 3px solid rgba(212,83,30,0.5); outline-offset: 2px; }
.sc-out { border: 2px dashed rgba(29,30,33,0.2); border-radius: 10px; padding: 22px 26px; min-height: 170px; display: flex; flex-direction: column; gap: 10px; justify-content: center; }
.sc-out.good { border: 2px solid var(--pos); background: rgba(60,122,78,0.07); }
.sc-out.warn { border: 2px solid #b98a2e; background: rgba(185,138,46,0.08); }
.sc-out.bad { border: 2px solid var(--neg); background: rgba(179,64,46,0.07); }
.sc-verdict { font: 700 20px var(--mono); letter-spacing: 0.14em; text-transform: uppercase; }
.sc-out.good .sc-verdict { color: var(--pos); }
.sc-out.warn .sc-verdict { color: #9a7222; }
.sc-out.bad .sc-verdict { color: var(--neg); }
.sc-text { font: 400 24px var(--body); line-height: 1.45; color: var(--text); }
.sc-hint { font: 400 20px var(--body); color: var(--muted); }

/* ---- Crack-time lab ---- */
.crack { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: stretch; }
.crack-controls { background: var(--card-bg); border: 1.5px solid rgba(29,30,33,0.16); border-radius: 12px; padding: 36px 40px; display: flex; flex-direction: column; gap: 26px; }
.crack-len { display: flex; justify-content: space-between; align-items: baseline; font: 600 26px var(--body); color: var(--text); }
.crack-len output { font: 700 26px var(--mono); color: var(--accent); }
.crack-controls input[type="range"] { width: 100%; accent-color: var(--accent); cursor: ew-resize; }
.crack-sets { display: flex; gap: 12px; flex-wrap: wrap; }
.crack-result { background: #1d1e21; border-radius: 12px; padding: 40px 44px; color: #f5f2ea; display: flex; flex-direction: column; gap: 14px; justify-content: center; }
.crack-result-k { font: 700 18px var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(245,242,234,0.5); }
.crack-out { font: 700 76px var(--display); text-transform: uppercase; line-height: 1; color: #ff8a54; }
.crack-track { height: 16px; border-radius: 8px; background: rgba(245,242,234,0.12); overflow: hidden; margin-top: 10px; }
.crack-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #b3402e, #d4531e, #3c7a4e); transition: width 0.3s ease; }
.crack-note { font: 400 21px var(--body); color: rgba(245,242,234,0.65); }

/* ---- Quiz ---- */
.qz { max-width: 1280px; }
.qz-progress { font: 700 19px var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.qz-q { font: 600 54px var(--display); line-height: 1.05; color: var(--text); margin-top: 12px; }
.qz-opts { display: flex; flex-direction: column; gap: 14px; margin-top: 28px; }
.qz-opts.locked .qz-opt { pointer-events: none; }
.qz-opt { appearance: none; cursor: pointer; text-align: left; border: 2px solid rgba(29,30,33,0.2); background: var(--card-bg); border-radius: 10px; padding: 20px 26px; font: 600 27px var(--body); color: var(--text); }
.qz-opt:hover { border-color: var(--text); }
.qz-opt:focus-visible { outline: 3px solid rgba(212,83,30,0.5); outline-offset: 2px; }
.qz-opt.right { border-color: var(--pos); background: rgba(60,122,78,0.1); }
.qz-opt.wrong { border-color: var(--neg); background: rgba(179,64,46,0.08); }
.qz-why { min-height: 44px; font: 500 24px var(--body); margin-top: 18px; }
.qz-why.good { color: var(--pos); }
.qz-why.bad { color: var(--neg); }
.qz-score { font: 700 150px var(--display); color: var(--accent); line-height: 1; }
.qz-line { font: 500 30px var(--body); color: var(--text); margin-top: 12px; }

/* ---- "If you clicked" attack steps use shared timeline ---- */
.tl-when { text-transform: uppercase; }

/* ---- Phone reflow: scale bespoke decoration for a ~390px canvas ---- */
@media (max-width: 640px) {
  html.deck-can-flow .divider { padding: 56px 26px !important; }
  html.deck-can-flow .divider-title { font-size: min(58px, 15vw) !important; }
  html.deck-can-flow .hazard { width: 130px; height: 8px; }
  html.deck-can-flow .drill { grid-template-columns: 1fr; gap: 6px; padding: 16px 0; }
  html.deck-can-flow .drill-t { font-size: 28px !important; }
  html.deck-can-flow .drill-d { font-size: 16px !important; }
  html.deck-can-flow .drill-n { font-size: 15px !important; }
  html.deck-can-flow .spec { font-size: 13px; padding: 6px 12px; }
  html.deck-can-flow .st-btn { font-size: 14px; padding: 9px 14px; }
  html.deck-can-flow .mail-wrap { grid-template-columns: 1fr !important; gap: 16px !important; height: auto; }
  html.deck-can-flow .mail, html.deck-can-flow .flag-list { overflow-y: visible; max-height: none; }
  html.deck-can-flow .mail-row { font-size: 15px; flex-wrap: wrap; gap: 6px; }
  html.deck-can-flow .mail-k { width: 64px; font-size: 11px; }
  html.deck-can-flow .mail-body { font-size: 16px; padding: 14px 16px 18px; gap: 10px; }
  html.deck-can-flow .mail-head { padding: 12px 16px 10px; }
  html.deck-can-flow .mail-attach { font-size: 15px; padding: 8px 12px; }
  html.deck-can-flow .mail-ext { font-size: 11px; }
  html.deck-can-flow .flag { padding: 12px 14px; }
  html.deck-can-flow .flag-k { font-size: 12px; }
  html.deck-can-flow .flag-d { font-size: 15px !important; }
  html.deck-can-flow .phish-done { font-size: 16px !important; }
  html.deck-can-flow .sc { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .sc-msg { padding: 20px 18px; }
  html.deck-can-flow .sc-bubble { font-size: 17px; padding: 14px 16px; }
  html.deck-can-flow .sc-choice { font-size: 17px; padding: 13px 16px; }
  html.deck-can-flow .sc-text { font-size: 16px !important; }
  html.deck-can-flow .crack { grid-template-columns: 1fr !important; gap: 16px !important; }
  html.deck-can-flow .crack-controls { padding: 20px 18px; }
  html.deck-can-flow .crack-len { font-size: 17px; }
  html.deck-can-flow .crack-result { padding: 22px 20px; }
  html.deck-can-flow .crack-out { font-size: min(40px, 10.5vw) !important; }
  html.deck-can-flow .crack-note { font-size: 15px !important; }
  html.deck-can-flow .qz-q { font-size: min(28px, 7.5vw) !important; }
  html.deck-can-flow .qz-opt { font-size: 17px; padding: 13px 16px; }
  html.deck-can-flow .qz-why { font-size: 16px !important; }
  html.deck-can-flow .qz-score { font-size: 72px !important; }
  html.deck-can-flow .qz-line { font-size: 19px !important; }
}`,
  runtime: {
    libs: [],
    js: RUNTIME_JS,
    connectOrigins: [],
    frameOrigins: [],
  },
  notes:
    "A 45-minute security-awareness session for a fictional company (Northwind) built as three drills: find five red flags on a mock phishing email, choose a response to a CEO-impersonation text and see the outcome, drag a slider to watch password crack-times explode, then a scored three-question quiz. Widget state persists through window.moldableState('security-training:v1') (workspace filesystem in Slides/Artifacts; per-browser localStorage when published): found flags, scenario pick, crack settings, and quiz progress survive reloads; reset/retry writes the cleared state; thumbnails never touch it. Keep data-deck-interactive on widget roots and listeners delegated. The email/flag columns scroll internally as explanations expand. If you edit the mock email, keep the data-flag ids in sync with the FLAGS map in runtime.js. Look: warm paper field manual — Barlow Condensed caps, Space Mono labels, ONE hazard orange accent, steel blue (.accent-2) sparingly. The mock email is a TRAINING PROP for a fictional company: keep it clearly fictional (example domains), never a real brand.",
  sampleSlides: [
    s({
      id: 'st-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Northwind · Security field manual · v3</div>
    <h1 class="title reveal" style="margin-top:10px;color:#fff">Don't take the bait.</h1>
    <p class="lead reveal" style="max-width:38ch">Forty-five minutes that make you the hardest target in the building.</p>
  </div>
</div>`,
    }),
    s({
      id: 'st-why',
      name: 'Why this matters',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Why we run this every year</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The door they try first is you.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">74%</div><div class="stat-label">of breaches involve the human element — a click, a reply, a reused password</div></div>
    <div class="stat"><div class="stat-num">3.4B</div><div class="stat-label">phishing emails sent every day, most of them template kits</div></div>
    <div class="stat"><div class="stat-num">&lt;60s</div><div class="stat-label">median time from opening a phish to typing credentials into it</div></div>
    <div class="stat"><div class="stat-num">2 min</div><div class="stat-label">what reporting takes — and it protects everyone behind you</div></div>
  </div>
  <p class="fine reveal" style="margin-top:36px">Industry averages, 2025. The point isn't fear — it's that the fixes are small, boring habits.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Why it matters</span></div>
</div>`,
    }),
    s({
      id: 'st-agenda',
      name: 'Three drills',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The next 45 minutes</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Three drills, zero lectures.</h2>
  <div class="reveal">
    <div class="drill"><div class="drill-n">Drill 01</div><div><div class="drill-t">Spot it</div><div class="drill-d">Find five red flags on a live phish — sharpen the reflex</div></div><span class="spec">15 min</span></div>
    <div class="drill"><div class="drill-n">Drill 02</div><div><div class="drill-t">Call it</div><div class="drill-d">A scenario, three responses — see how each one plays out</div></div><span class="spec">15 min</span></div>
    <div class="drill"><div class="drill-n">Drill 03</div><div><div class="drill-t">Prove it</div><div class="drill-d">Three questions, scored on the spot — the quiz stays in the room</div></div><span class="spec">15 min</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">The drills</span></div>
</div>`,
    }),
    s({
      id: 'st-sec-spot',
      name: 'Section · Spot it',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Drill 01</div>
  <div class="divider-title reveal">Spot it.</div>
  <div class="hazard reveal"></div>
  <div class="divider-meta reveal">Five red flags are hiding on the next email. Find them.</div>
</div>`,
    }),
    s({
      id: 'st-anatomy',
      name: 'Anatomy of an attack',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end">
    <div>
      <div class="kicker">Know the play</div>
      <h2 class="headline" style="margin-top:6px">Every phish runs the same five steps.</h2>
    </div>
    <button class="st-btn primary" data-deck-advance>Next step →</button>
  </div>
  <div class="timeline" style="margin-top:26px">
    <div class="tl-row reveal"><div class="tl-when">Recon</div><div class="tl-what"><b>They read your public trail</b> — team page, social posts, press releases. The lure gets your org chart right.</div></div>
    <div class="tl-row" data-build="1"><div class="tl-when">The lure</div><div class="tl-what"><b>A plausible email arrives</b> — invoice, password reset, a boss in a hurry. Urgency is the tell.</div></div>
    <div class="tl-row" data-build="2"><div class="tl-when">The hook</div><div class="tl-what"><b>You click and land on a perfect clone</b> — the login page pixel-matches the real one.</div></div>
    <div class="tl-row" data-build="3"><div class="tl-when">The pivot</div><div class="tl-what"><b>One mailbox becomes many</b> — they mail your contacts from your address, and those phish land harder.</div></div>
    <div class="tl-row" data-build="4"><div class="tl-when">The payout</div><div class="tl-what"><b>Invoices redirect, data walks</b> — weeks later, quietly. The click was the cheap part.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 01 · The play</span></div>
</div>`,
    }),
    s({
      id: 'st-phish',
      name: 'Find the red flags',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end;margin-bottom:20px">
    <div>
      <div class="kicker">Live fire · click what looks off</div>
      <h2 class="headline" style="margin-top:6px">Five flags. Find them.</h2>
    </div>
    <span class="spec orange" data-phish-found>0 / 5 found</span>
  </div>
  <div class="mail-wrap reveal" data-phish data-deck-interactive>
    <div class="mail">
      <div class="mail-bar"><i></i><i></i><i></i><span class="mail-ext">External</span></div>
      <div class="mail-head">
        <div class="mail-row"><span class="mail-k">From</span><span>IT Helpdesk &lt;<button type="button" class="ph-spot" data-flag="sender">it-support@nord-wind-secure.com</button>&gt;</span></div>
        <div class="mail-row"><span class="mail-k">To</span><span>you@northwind.example</span></div>
        <div class="mail-row"><span class="mail-k">Subject</span><span class="mail-subject"><button type="button" class="ph-spot" data-flag="urgency">URGENT: password expires in 2 hours</button></span></div>
      </div>
      <div class="mail-body">
        <p><button type="button" class="ph-spot" data-flag="greeting">Dear Valued Employee,</button></p>
        <p>Our security system detected unusual activity. To avoid account suspension, verify your identity at the <button type="button" class="ph-spot" data-flag="link">Northwind SSO portal → nordwind-sso.security-login.net</button> immediately.</p>
        <p>A copy of the new password policy is attached for your records.</p>
        <div class="mail-attach" ><span>📎</span><button type="button" class="ph-spot" data-flag="attach">password_policy_update.zip</button></div>
        <p style="color:var(--muted)">IT Helpdesk · Northwind Corporation</p>
      </div>
    </div>
    <div class="flag-list">
      <div class="flag" data-flag-item="sender"><div class="flag-k">The sender</div><div class="flag-d">Look-alike domain. Real Northwind mail comes from northwind.example — this is nord-wind-secure.com.</div></div>
      <div class="flag" data-flag-item="urgency"><div class="flag-k">The deadline</div><div class="flag-d">Manufactured urgency. Two-hour deadlines exist to stop you thinking. Real IT gives you days.</div></div>
      <div class="flag" data-flag-item="greeting"><div class="flag-k">The greeting</div><div class="flag-d">Generic greeting. Your own IT team knows your name — mass phish kits don't.</div></div>
      <div class="flag" data-flag-item="link"><div class="flag-k">The link</div><div class="flag-d">Mismatched link. The text says SSO portal; the destination is security-login.net. Hover before you click.</div></div>
      <div class="flag" data-flag-item="attach"><div class="flag-k">The attachment</div><div class="flag-d">Unexpected attachment. Password policies never arrive as .zip files. Don't open — report.</div></div>
      <div class="phish-done" data-phish-done style="display:none">All five — sharp eyes. Now do it at inbox speed.</div>
      <button type="button" class="st-btn" data-phish-reset style="align-self:flex-start">Reset the drill</button>
    </div>
  </div>
</div>`,
    }),
    s({
      id: 'st-flags',
      name: 'The tells',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Field reference</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:12px">Four tells catch most of it.</h2>
  <table class="table reveal" style="margin-top:8px">
    <thead><tr><th>Tell</th><th>What it looks like</th><th>The habit</th></tr></thead>
    <tbody>
      <tr><td><b>Wrong sender</b></td><td>Look-alike domains, personal addresses "from" executives</td><td>Read the domain right-to-left, every time</td></tr>
      <tr><td><b>Manufactured urgency</b></td><td>"2 hours", "immediately", "before payroll closes"</td><td>Urgency = slow down, not speed up</td></tr>
      <tr><td><b>Mismatched links</b></td><td>Text says one domain, hover shows another</td><td>Hover first; on mobile, long-press to preview</td></tr>
      <tr class="row-em"><td><b>Unusual ask</b></td><td>Gift cards, bank-detail changes, "keep this between us"</td><td>Verify on a channel you choose — then report</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">None of these require technology. They require two seconds of suspicion.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 01 · Reference</span></div>
</div>`,
    }),
    s({
      id: 'st-sec-call',
      name: 'Section · Call it',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Drill 02</div>
  <div class="divider-title reveal">Call it.</div>
  <div class="hazard reveal"></div>
  <div class="divider-meta reveal">One message, three responses — only one is right.</div>
</div>`,
    }),
    s({
      id: 'st-scenario',
      name: 'Make the call',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="kicker reveal">Scenario · it's 4:55 on a Friday</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">A text from "the CEO."</h2>
  <div class="sc reveal" data-scenario data-deck-interactive>
    <div class="sc-msg">
      <div class="sc-msg-k">Unknown number · SMS</div>
      <div class="sc-bubble">Hi, it's Dana. I'm boarding a flight but need a favor before EOD — grab 4× $200 gift cards for a client thank-you. I'll approve reimbursement tonight. Text me the codes as soon as you have them. Keep it between us, it's a surprise for the team. 🙏</div>
      <div class="sc-msg-k" style="margin-top:auto">Dana Whitfield is Northwind's real CEO. This is not Dana's number.</div>
    </div>
    <div class="sc-side">
      <button type="button" class="sc-choice" data-choice="a">Buy the cards — it's the CEO, and it's urgent</button>
      <button type="button" class="sc-choice" data-choice="b">Reply and ask a question only Dana would know</button>
      <button type="button" class="sc-choice" data-choice="c">Verify on Slack or Dana's real number — and report it</button>
      <div class="sc-out" data-scenario-out aria-live="polite"><div class="sc-hint">Pick a response to see how it plays out.</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 02 · Scenario</span></div>
</div>`,
    }),
    s({
      id: 'st-crack',
      name: 'Crack-time lab',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="kicker reveal">The password lab · drag the slider</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:22px">Length is the whole game.</h2>
  <div class="crack reveal" data-crack data-deck-interactive>
    <div class="crack-controls">
      <div class="crack-len"><label for="st-pwlen">Password length</label><output data-crack-len>8 characters</output></div>
      <input id="st-pwlen" name="pwlen" type="range" min="4" max="24" step="1" value="8">
      <div class="crack-sets">
        <button type="button" class="st-btn on" data-charset="upper" aria-pressed="true">A–Z</button>
        <button type="button" class="st-btn on" data-charset="digits" aria-pressed="true">0–9</button>
        <button type="button" class="st-btn" data-charset="symbols" aria-pressed="false">!@#$</button>
      </div>
      <p class="fine" style="margin-top:auto">Assumes an offline attacker at 10 billion guesses per second — mid-range rig, rented by the hour.</p>
    </div>
    <div class="crack-result" aria-live="polite">
      <div class="crack-result-k">Time to crack</div>
      <div class="crack-out" data-crack-out>6 hours</div>
      <div class="crack-track"><div class="crack-fill" data-crack-bar style="width:35%"></div></div>
      <p class="crack-note">Every character you add multiplies the work. Four random words ≈ 25+ characters — that's the trick.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 02 · Passwords</span></div>
</div>`,
    }),
    s({
      id: 'st-passphrase',
      name: 'Passphrases win',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col" style="--col-gap:96px;align-items:center">
    <div class="reveal">
      <div class="kicker">Same attacker, three passwords</div>
      <h2 class="headline" style="margin-top:8px">Clever loses.<br/>Long wins.</h2>
      <ul class="bullets" style="margin-top:22px;--gap:20px">
        <li class="bullet"><span><b>Use a password manager</b> — one strong passphrase unlocks unique passwords everywhere.</span></li>
        <li class="bullet"><span><b>Never reuse</b> — one breached site becomes every site by lunchtime.</span></li>
      </ul>
    </div>
    <div class="reveal">
      <div class="bars" style="--bars-height:330px;--bar-gap:40px">
        <div class="bar" style="--h:6%"><div class="bar-fill" data-val="instant" style="background:var(--neg)"></div><div class="bar-label">hunter2</div></div>
        <div class="bar" style="--h:34%"><div class="bar-fill" data-val="~3 days" style="background:#b98a2e"></div><div class="bar-label">Tr0ub4d0r!</div></div>
        <div class="bar" style="--h:97%"><div class="bar-fill" data-val="centuries" style="background:var(--pos)"></div><div class="bar-label">4 random words</div></div>
      </div>
      <p class="fine" style="margin-top:16px">Log scale — the last bar is not to scale, because it can't be.</p>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 02 · Passphrases</span></div>
</div>`,
    }),
    s({
      id: 'st-mfa',
      name: 'MFA',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The seatbelt</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">MFA turns a stolen password into a dead end.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="card" style="text-align:center"><div class="card-title">Something you know</div><div class="card-body">Your passphrase — phishable, so never the only lock</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card" style="text-align:center"><div class="card-title">Something you have</div><div class="card-body">The Northwind app prompt or a hardware key</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="card" style="text-align:center;border-color:var(--pos)"><div class="card-title" style="color:var(--pos)">You're in</div><div class="card-body">A thief with your password alone gets nothing</div></div></div>
  </div>
  <div class="cols-2 reveal" style="margin-top:34px;gap:24px">
    <div class="card"><div class="card-title" style="font-size:34px">Approve only what you started</div><div class="card-body">A surprise MFA prompt means someone HAS your password. Deny it and report — that prompt is the alarm going off.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">99% fewer takeovers</div><div class="card-body">Accounts with MFA see automated credential attacks fail almost entirely. It's the single highest-leverage habit here.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 02 · MFA</span></div>
</div>`,
    }),
    s({
      id: 'st-sec-prove',
      name: 'Section · Prove it',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">Drill 03</div>
  <div class="divider-title reveal">Prove it.</div>
  <div class="hazard reveal"></div>
  <div class="divider-meta reveal">Three questions. Scored on the spot. Stays in the room.</div>
</div>`,
    }),
    s({
      id: 'st-quiz',
      name: 'The quiz',
      transition: 'slide',
      bodyHtml: `<div class="pad top">
  <div class="row reveal" style="justify-content:space-between;align-items:flex-end;margin-bottom:20px">
    <div>
      <div class="kicker">Final drill · tap an answer</div>
      <h2 class="headline" style="margin-top:6px">Prove it.</h2>
    </div>
  </div>
  <div class="qz reveal" data-quiz data-deck-interactive>
    <div data-quiz-card>
      <div class="qz-progress" data-quiz-progress>Question 1 of 3</div>
      <div class="qz-q" data-quiz-q>An email from your bank says: verify your account within 24 hours. What is the move?</div>
      <div class="qz-opts" data-quiz-options>
        <button type="button" class="qz-opt" data-quiz-answer="0">Click the link — the branding looks right</button>
        <button type="button" class="qz-opt" data-quiz-answer="1">Open the bank's app, or type the address yourself</button>
        <button type="button" class="qz-opt" data-quiz-answer="2">Reply and ask whether it is genuine</button>
      </div>
      <div class="qz-why" data-quiz-feedback aria-live="polite"></div>
      <button type="button" class="st-btn primary" data-quiz-next style="display:none;margin-top:10px">Next question →</button>
    </div>
    <div data-quiz-result style="display:none">
      <div class="qz-progress">Your score</div>
      <div class="qz-score" data-quiz-score>0 / 3</div>
      <div class="qz-line" data-quiz-line></div>
      <button type="button" class="st-btn" data-quiz-retry style="margin-top:26px">Run it again</button>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 03 · Quiz</span></div>
</div>`,
    }),
    s({
      id: 'st-report',
      name: 'Report it',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col" style="--col-gap:96px;align-items:center">
    <div class="reveal">
      <div class="kicker">The one habit that scales</div>
      <h2 class="headline" style="margin-top:8px">When in doubt, report.</h2>
      <p class="lead" style="margin-top:16px;max-width:30ch">You are not "bothering security." You are their early-warning system — the first report is the one that saves everyone else.</p>
    </div>
    <ol class="steps reveal" style="--gap:28px">
      <li class="step"><span><b>Hit "Report phish"</b> in the mail toolbar — or forward to <b>phish@northwind.example</b>.</span></li>
      <li class="step"><span><b>Don't test it yourself</b> — no clicking the link "to check." That's our job.</span></li>
      <li class="step"><span><b>Move on with your day</b> — median two minutes, no forms, no judgment.</span></li>
    </ol>
  </div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">Drill 03 · Report</span></div>
</div>`,
    }),
    s({
      id: 'st-incident',
      name: 'If you clicked',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">No shame, just speed</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:16px">Clicked anyway? Run this.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Minute 0</div><div class="tl-what"><b>Change that password</b> — from a device you trust, not the link you clicked.</div></div>
    <div class="tl-row"><div class="tl-when">Minute 5</div><div class="tl-what"><b>Tell security</b> — "I clicked, here's the email." Fastest sentence you'll ever be thanked for.</div></div>
    <div class="tl-row"><div class="tl-when">Same day</div><div class="tl-what"><b>Watch for MFA prompts you didn't start</b> — deny and report every one.</div></div>
    <div class="tl-row"><div class="tl-when">This week</div><div class="tl-what"><b>Rotate anywhere you reused it</b> — then let the password manager end reuse for good.</div></div>
  </div>
  <p class="fine reveal" style="margin-top:24px">Speed beats embarrassment. The only bad report is the one that never arrives.</p>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">If you clicked</span></div>
</div>`,
    }),
    s({
      id: 'st-quote',
      name: 'Quote',
      transition: 'zoom',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">House rule</div>
  <blockquote class="quote reveal" style="margin-top:14px">"Nobody here gets in trouble for reporting too much. People get in trouble for going quiet."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Elena Ruiz</span><span class="cite-role">Head of Security, Northwind</span></div>
  <div class="runner reveal"><span class="runner-brand">Northwind Security</span><span class="runner-label">House rule</span></div>
</div>`,
    }),
    s({
      id: 'st-close',
      name: 'Close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">That's the whole manual</div>
    <h2 class="display reveal" style="--display-size:150px;color:#fff">Report it. Every time.</h2>
    <p class="lead reveal">phish@northwind.example · the button in your mail toolbar · 2 minutes</p>
  </div>
</div>`,
    }),
  ],
}
