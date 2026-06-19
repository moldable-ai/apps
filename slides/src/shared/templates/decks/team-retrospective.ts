import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/team-retrospective-cover.jpg'
const FIG_IMG = 'assets/team-retrospective-fig.jpg'

export const teamRetrospective: Template = {
  id: 'team-retrospective',
  categories: ['Company', 'People'],
  name: 'Team Retrospective',
  tagline: 'Friendly, soft sprint-retro workshop',
  audiences: ['team', 'agile', 'people', 'engineering'],
  description:
    'A warm off-white retro deck with indigo and coral, Cabinet Grotesk over Inter. Slightly tilted sticky notes, a mood meter, a start/stop/continue board, vote dots, and owned action items carry a full sprint retrospective you fill in with your own team.',
  fonts: {
    display: 'Cabinet Grotesk',
    body: 'Inter',
    links: [
      'https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&display=swap',
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#faf7f2',
    '--text': '#221f2e',
    '--muted': '#6b6678',
    '--accent': '#4f46e5',
    '--accent-2': '#fb7185',
    '--display': "'Cabinet Grotesk', sans-serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '800',
    '--title-size': '126px',
    '--headline-size': '74px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.2em',
    '--kicker-size': '21px',
    '--card-bg': '#ffffff',
    '--card-border': '#ece7df',
    '--card-shadow': '0 22px 48px -30px rgba(34,31,46,0.28)',
    '--radius': '22px',
    '--stat-size': '100px',
    '--metric-size': '116px',
    '--bullet-color': '#fb7185',
    '--th-border': '#221f2e',
    '--table-border': '#ece7df',
    '--track': '#ece7df',
    '--donut-hole': '#faf7f2',
    '--bar-gap': '32px',
    '--bar-fill': '#4f46e5',
    '--media-radius': '24px',
    '--media-shadow': '0 50px 110px -45px rgba(34,31,46,0.4)',
    '--scrim':
      'linear-gradient(180deg, rgba(34,31,46,0.05) 0%, rgba(34,31,46,0.34) 52%, rgba(34,31,46,0.82) 100%)',
    '--pos': '#16a34a',
    '--neg': '#fb7185',
  },
  stageBg: '#f1ece3',
  assets: ['team-retrospective-cover.jpg', 'team-retrospective-fig.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.tl-when { color: var(--accent); }
.flow-arrow::after { border-color: var(--accent); }

/* Section divider — image-free, warm paper with a soft coral wash */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; background: radial-gradient(120% 120% at 88% 18%, rgba(251,113,133,0.14), transparent 56%); }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.2em; font-size: 22px; color: var(--accent); text-transform: uppercase; }
.divider-title { font-family: var(--display); font-weight: 800; font-size: 150px; line-height: 0.94; letter-spacing: -0.025em; color: var(--text); }
.divider-rule { width: 132px; height: 6px; border-radius: 4px; background: var(--accent-2); margin-top: 14px; }

/* Sticky notes — slightly rotated, soft shadow, dog-eared corner */
.notes { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 38px; }
.note { position: relative; background: var(--note-bg, #fff4d6); border-radius: 6px; padding: 38px 36px 40px; box-shadow: 0 24px 44px -22px rgba(34,31,46,0.34); transform: rotate(var(--rot, -1.6deg)); }
.note:nth-child(2n) { transform: rotate(var(--rot, 1.8deg)); background: var(--note-bg, #ffe1e7); }
.note:nth-child(3n) { transform: rotate(var(--rot, -1deg)); background: var(--note-bg, #e2e0ff); }
.note::after { content: ''; position: absolute; left: 50%; top: -13px; transform: translateX(-50%) rotate(2deg); width: 92px; height: 26px; border-radius: 3px; background: rgba(255,255,255,0.55); box-shadow: 0 4px 10px -4px rgba(34,31,46,0.25); }
.note-t { font-family: var(--display); font-weight: 700; font-size: 33px; line-height: 1.08; color: var(--text); }
.note-d { font-family: var(--body); font-size: 23px; line-height: 1.4; color: #4a4656; margin-top: 12px; }
.note-meta { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 600; font-size: 19px; color: #57536a; margin-top: 18px; }
.note-meta::before { content: ''; width: 13px; height: 13px; border-radius: 50%; background: var(--accent); }

/* Mood meter — segmented warm-to-cool scale with a pin */
.mood { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 24px; box-shadow: var(--card-shadow); padding: 46px 50px; }
.mood-scale { display: flex; gap: 10px; margin-top: 6px; }
.mood-seg { flex: 1; height: 26px; border-radius: 8px; background: var(--seg, #ece7df); }
.mood-seg.fill { background: var(--accent); }
.mood-seg.fill.alt { background: var(--accent-2); }
.mood-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: 22px; }
.mood-faces { display: flex; justify-content: space-between; font-size: 30px; margin-top: 16px; opacity: 0.85; }
.mood-score { font-family: var(--display); font-weight: 800; font-size: 92px; line-height: 1; letter-spacing: -0.02em; color: var(--accent); }
.mood-score small { font-family: var(--body); font-weight: 600; font-size: 30px; color: var(--muted); }

/* Start / Stop / Continue — three labeled columns */
.ssc { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.ssc-col { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; box-shadow: var(--card-shadow); padding: 36px 34px 38px; border-top: 6px solid var(--col, var(--accent)); }
.ssc-col.start { --col: #16a34a; }
.ssc-col.stop { --col: var(--accent-2); }
.ssc-col.cont { --col: var(--accent); }
.ssc-h { display: flex; align-items: center; gap: 14px; font-family: var(--display); font-weight: 800; font-size: 34px; color: var(--text); }
.ssc-h::before { content: ''; width: 16px; height: 16px; border-radius: 5px; background: var(--col, var(--accent)); }
.ssc-list { list-style: none; margin: 24px 0 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
.ssc-list li { font-family: var(--body); font-size: 25px; line-height: 1.34; color: #4a4656; padding-left: 28px; position: relative; }
.ssc-list li::before { content: ''; position: absolute; left: 0; top: 0.6em; width: 11px; height: 11px; border-radius: 50%; background: var(--col, var(--accent)); }

/* Vote dots — little tally chips for theme prioritization */
.votes { display: inline-flex; align-items: center; gap: 7px; }
.vdot { width: 17px; height: 17px; border-radius: 50%; background: var(--accent-2); box-shadow: inset 0 0 0 0; }
.vdot.muted { background: #ddd6cc; }
.vcount { font-family: var(--display); font-weight: 800; font-size: 28px; color: var(--accent); margin-left: 12px; font-variant-numeric: tabular-nums; }

/* Theme cards with a vote header */
.theme { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 22px; box-shadow: var(--card-shadow); padding: 34px 36px 36px; }
.theme-top { display: flex; align-items: center; justify-content: space-between; }
.theme-rank { font-family: var(--display); font-weight: 800; font-size: 30px; color: var(--accent-2); }
.theme-t { font-family: var(--display); font-weight: 700; font-size: 34px; line-height: 1.06; color: var(--text); margin-top: 18px; }
.theme-d { font-family: var(--body); font-size: 24px; line-height: 1.4; color: var(--muted); margin-top: 10px; }

/* Action-item checks with owners */
.actions { display: flex; flex-direction: column; gap: 18px; }
.action { display: flex; align-items: center; gap: 24px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; box-shadow: var(--card-shadow); padding: 26px 32px; }
.action-box { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 11px; border: 2px solid var(--accent); display: grid; place-items: center; color: var(--accent); font-weight: 800; font-size: 26px; font-family: var(--body); }
.action-t { font-family: var(--body); font-weight: 600; font-size: 28px; color: var(--text); flex: 1; }
.action-owner { display: inline-flex; align-items: center; gap: 12px; font-family: var(--body); font-weight: 600; font-size: 23px; color: #57536a; }
.action-av { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 20px; }
.action-av.alt { background: var(--accent-2); }
.action-due { font-family: var(--body); font-weight: 700; font-size: 20px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-2); }

/* Soft pill (warm) */
.softchip { display: inline-flex; align-items: center; gap: 10px; padding: 12px 26px; border-radius: 999px; background: #fff; border: 1px solid var(--card-border); box-shadow: var(--card-shadow); font-family: var(--body); font-weight: 600; font-size: 25px; color: var(--text); }
.softchip::before { content: ''; width: 13px; height: 13px; border-radius: 50%; background: var(--accent-2); }

@media (max-width: 640px) {
  html.deck-can-flow .divider-title { font-size: min(51px, 14vw) !important; line-height: 1.0 !important; }
  html.deck-can-flow .mood-score { font-size: min(44px, 12vw) !important; }
  html.deck-can-flow .notes { grid-template-columns: 1fr !important; gap: 22px; }
  html.deck-can-flow .note, html.deck-can-flow .note:nth-child(2n), html.deck-can-flow .note:nth-child(3n) { transform: none !important; padding: 26px 22px 28px !important; }
  html.deck-can-flow .ssc { grid-template-columns: 1fr !important; gap: 20px; }
  html.deck-can-flow .ssc-col { padding: 26px 22px 28px !important; }
  html.deck-can-flow .mood { padding: 28px 24px !important; }
  html.deck-can-flow .theme { padding: 26px 22px 26px !important; }
  html.deck-can-flow .action { flex-wrap: wrap; gap: 12px 16px; padding: 22px 22px !important; }
  html.deck-can-flow .action-t { flex: 1 1 100% !important; order: 2; }
  html.deck-can-flow .action-box { order: 1; }
  html.deck-can-flow .action-owner { order: 3; }
  html.deck-can-flow .action-due { order: 4; margin-left: auto; }
}`,
  notes:
    'A complete, friendly sprint-retrospective workshop deck: Cabinet Grotesk display + Inter body, warm off-white #faf7f2 with ONE indigo accent (#4f46e5) and a soft coral secondary (#fb7185), rounded everything, generous whitespace, no gradients. Open and close on the soft warm collage full-bleed (assets/team-retrospective-cover.jpg); use the candid workshop photo (assets/team-retrospective-fig.jpg) for the team split. Signature pieces: tilted .note sticky cards (with .note-meta owner + auto-rotation per column) for wins and what slowed us down; the .mood meter (segmented scale + .mood-faces + .mood-score) for how the sprint felt; the start/stop/continue board (.ssc / .ssc-col.start|.stop|.cont); .vote/.vdot/.vcount tally dots on .theme cards for prioritized themes; and .action rows (.action-box check, .action-av owner avatar, .action-due) for owned action items. Use .bars for velocity/burndown, .stats for the sprint at a glance, .table for the action register, .quote for a team voice. Keep it warm and human — celebrate wins, name what slowed the team, leave with clear owners.',
  sampleSlides: [
    s({
      id: 'tr-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.9">Sprint 24 Retrospective · Team Aurora</div>
    <h1 class="display reveal" style="--display-size:142px;margin-top:8px">How did<br/>that feel?</h1>
    <p class="lead reveal">A warm, honest look back — so the next sprint runs smoother.</p>
  </div>
</div>`,
    }),
    s({
      id: 'tr-agenda',
      name: 'Agenda',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How we'll spend the hour</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:22px">Look back, then look forward.</h2>
  <ol class="steps reveal" style="--gap:24px">
    <li class="step"><span><b>Check in</b> — how the sprint felt, by the numbers.</span></li>
    <li class="step"><span><b>What happened</b> — the wins, and what slowed us down.</span></li>
    <li class="step"><span><b>Let's improve</b> — start, stop, continue, and our top themes.</span></li>
    <li class="step"><span><b>Commit</b> — owned action items we'll carry into Sprint 25.</span></li>
  </ol>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Agenda</span></div>
</div>`,
    }),
    s({
      id: 'tr-mood',
      name: 'How the sprint felt',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">The check-in</div>
      <h2 class="headline" style="margin-top:8px">How did the sprint feel?</h2>
      <p class="lead">We polled the team before we dug into the details. Energy held up, but the end-of-sprint crunch is showing.</p>
      <div class="softchip reveal" style="margin-top:22px">8 of 9 teammates voted</div>
    </div>
    <div class="mood reveal">
      <div class="mood-row">
        <span class="kicker" style="color:var(--muted)">Team mood</span>
        <span class="mood-score">6.8<small>/10</small></span>
      </div>
      <div class="mood-scale">
        <div class="mood-seg fill alt"></div>
        <div class="mood-seg fill alt"></div>
        <div class="mood-seg fill"></div>
        <div class="mood-seg fill"></div>
        <div class="mood-seg fill"></div>
        <div class="mood-seg fill"></div>
        <div class="mood-seg fill"></div>
        <div class="mood-seg"></div>
        <div class="mood-seg"></div>
        <div class="mood-seg"></div>
      </div>
      <div class="mood-faces"><span>😣</span><span>😐</span><span>🙂</span><span>😄</span><span>🤩</span></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Check-in</span></div>
</div>`,
    }),
    s({
      id: 'tr-glance',
      name: 'Sprint at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Sprint 24, by the numbers</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">The sprint at a glance.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">38</div><div class="stat-label">Story points completed of 42 committed</div></div>
    <div class="stat"><div class="stat-num">90%</div><div class="stat-label">Of the sprint goal delivered on time</div></div>
    <div class="stat"><div class="stat-num">3</div><div class="stat-label">Unplanned interruptions mid-sprint</div></div>
    <div class="stat"><div class="stat-num">6.8</div><div class="stat-label">Average team mood out of ten</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Check-in</span></div>
</div>`,
    }),
    s({
      id: 'tr-div1',
      name: 'Section · What happened',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — Looking back</div>
  <div class="divider-title reveal">What<br/>happened.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'tr-wins',
      name: 'Wins',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What went well</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Wins worth celebrating.</h2>
  <div class="notes reveal" style="--cols:3">
    <div class="note"><div class="note-t">Checkout shipped early</div><div class="note-d">The new flow went live two days ahead of plan with zero rollbacks.</div><div class="note-meta">Priya</div></div>
    <div class="note"><div class="note-t">Pairing paid off</div><div class="note-d">Daily pairing on the payments service leveled up two teammates fast.</div><div class="note-meta">Marco</div></div>
    <div class="note"><div class="note-t">On-call was quiet</div><div class="note-d">Last quarter's reliability work meant a calm, uneventful rotation.</div><div class="note-meta">Sam</div></div>
    <div class="note"><div class="note-t">Design unblocked us</div><div class="note-d">Specs landed before kickoff — no waiting on mockups this time.</div><div class="note-meta">Lena</div></div>
    <div class="note"><div class="note-t">Demo got applause</div><div class="note-d">Stakeholders loved the live walkthrough and asked for more.</div><div class="note-meta">Priya</div></div>
    <div class="note"><div class="note-t">Docs kept current</div><div class="note-d">We updated runbooks as we went instead of at the end.</div><div class="note-meta">Devon</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">What happened</span></div>
</div>`,
    }),
    s({
      id: 'tr-slowed',
      name: 'What slowed us down',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What slowed us down</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:28px">Where we got stuck.</h2>
  <div class="notes reveal" style="--cols:3">
    <div class="note"><div class="note-t">Flaky CI</div><div class="note-d">Re-runs ate hours; a third of builds failed on the same two tests.</div><div class="note-meta">Marco</div></div>
    <div class="note"><div class="note-t">Late scope change</div><div class="note-d">A new requirement landed in week two and reshuffled priorities.</div><div class="note-meta">Sam</div></div>
    <div class="note"><div class="note-t">Slow PR reviews</div><div class="note-d">Reviews sat for a day or more; work piled up waiting to merge.</div><div class="note-meta">Lena</div></div>
    <div class="note"><div class="note-t">Unclear ticket</div><div class="note-d">One story had fuzzy acceptance criteria and bounced back twice.</div><div class="note-meta">Devon</div></div>
    <div class="note"><div class="note-t">Meeting overload</div><div class="note-d">Three new syncs fragmented focus time mid-week.</div><div class="note-meta">Priya</div></div>
    <div class="note"><div class="note-t">Staging drift</div><div class="note-d">Staging didn't match prod, so one bug only showed up after release.</div><div class="note-meta">Sam</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">What happened</span></div>
</div>`,
    }),
    s({
      id: 'tr-velocity',
      name: 'The data',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:90px;align-items:center">
    <div>
      <div class="kicker">The data</div>
      <h2 class="headline" style="margin-top:8px">Velocity is steadying.</h2>
      <p class="lead">Four sprints of completed points. We dipped during the on-call quarter and have climbed back toward a sustainable pace.</p>
      <div class="softchip reveal" style="margin-top:22px">Committed 42 · delivered 38</div>
    </div>
    <div class="bars" style="--bars-height:360px">
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="31"></div><div class="bar-label">S21</div></div>
      <div class="bar" style="--h:50%"><div class="bar-fill" data-val="25"></div><div class="bar-label">S22</div></div>
      <div class="bar" style="--h:72%"><div class="bar-fill" data-val="36"></div><div class="bar-label">S23</div></div>
      <div class="bar" style="--h:76%"><div class="bar-fill" data-val="38"></div><div class="bar-label">S24</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">The data</span></div>
</div>`,
    }),
    s({
      id: 'tr-photo',
      name: 'Team moment',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">In the room</div>
    <h2 class="headline reveal">We did this together.</h2>
    <p class="lead reveal">Every note on the board came from someone on the team. The point of the hour isn't blame — it's getting honest so the next sprint treats us better.</p>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'tr-div2',
      name: 'Section · Let’s improve',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Looking forward</div>
  <div class="divider-title reveal">Let's<br/>improve.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'tr-howloop',
      name: 'How we turn talk into change',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">From notes to next steps</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">How we turn talk into change.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="theme"><div class="theme-rank" style="color:var(--accent)">01</div><div class="theme-t">Surface</div><div class="theme-d">Everyone adds sticky notes — wins and friction, no filter.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="theme"><div class="theme-rank" style="color:var(--accent)">02</div><div class="theme-t">Group</div><div class="theme-d">Cluster the notes into a handful of shared themes.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="theme"><div class="theme-rank" style="color:var(--accent)">03</div><div class="theme-t">Vote</div><div class="theme-d">Spend our dots on what matters most this sprint.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="theme"><div class="theme-rank" style="color:var(--accent)">04</div><div class="theme-t">Commit</div><div class="theme-d">Turn the top themes into owned, dated actions.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Let's improve</span></div>
</div>`,
    }),
    s({
      id: 'tr-ssc',
      name: 'Start / Stop / Continue',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The classic three columns</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Start, stop, continue.</h2>
  <div class="ssc reveal">
    <div class="ssc-col start">
      <div class="ssc-h">Start</div>
      <ul class="ssc-list">
        <li>Tagging PRs as "needs review" in the team channel.</li>
        <li>A 30-minute scope-change huddle before re-planning.</li>
        <li>Writing acceptance criteria with the reviewer present.</li>
      </ul>
    </div>
    <div class="ssc-col stop">
      <div class="ssc-h">Stop</div>
      <ul class="ssc-list">
        <li>Re-running CI by hand instead of fixing flaky tests.</li>
        <li>Adding mid-week syncs without dropping another.</li>
        <li>Merging to staging without a prod-parity check.</li>
      </ul>
    </div>
    <div class="ssc-col cont">
      <div class="ssc-h">Continue</div>
      <ul class="ssc-list">
        <li>Daily pairing on unfamiliar parts of the codebase.</li>
        <li>Updating runbooks as work happens, not after.</li>
        <li>Getting design specs in before sprint kickoff.</li>
      </ul>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Let's improve</span></div>
</div>`,
    }),
    s({
      id: 'tr-themes',
      name: 'Top themes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we voted on</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">Our top themes to fix.</h2>
  <div class="cols-3 reveal">
    <div class="theme">
      <div class="theme-top"><div class="theme-rank">#1</div><div class="votes"><span class="vdot"></span><span class="vdot"></span><span class="vdot"></span><span class="vdot"></span><span class="vdot"></span><span class="vcount">7</span></div></div>
      <div class="theme-t">Tame the CI flakiness</div>
      <div class="theme-d">The single biggest drain on focus — quarantine and fix the two worst tests.</div>
    </div>
    <div class="theme">
      <div class="theme-top"><div class="theme-rank">#2</div><div class="votes"><span class="vdot"></span><span class="vdot"></span><span class="vdot"></span><span class="vdot muted"></span><span class="vdot muted"></span><span class="vcount">5</span></div></div>
      <div class="theme-t">Speed up PR reviews</div>
      <div class="theme-d">Set a same-day review norm so work stops piling up waiting to merge.</div>
    </div>
    <div class="theme">
      <div class="theme-top"><div class="theme-rank">#3</div><div class="votes"><span class="vdot"></span><span class="vdot"></span><span class="vdot"></span><span class="vdot muted"></span><span class="vdot muted"></span><span class="vcount">4</span></div></div>
      <div class="theme-t">Protect focus time</div>
      <div class="theme-d">Audit recurring meetings and reclaim two no-meeting mornings a week.</div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Let's improve</span></div>
</div>`,
    }),
    s({
      id: 'tr-actions',
      name: 'Action items',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What we'll actually do</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Action items, with owners.</h2>
  <div class="actions reveal">
    <div class="action"><span class="action-box">&#10003;</span><span class="action-t">Quarantine the two flakiest tests and open fix tickets.</span><span class="action-owner"><span class="action-av">MA</span>Marco</span><span class="action-due">Sprint 25</span></div>
    <div class="action"><span class="action-box">&#10003;</span><span class="action-t">Adopt a same-day PR-review norm with channel tagging.</span><span class="action-owner"><span class="action-av alt">LE</span>Lena</span><span class="action-due">This week</span></div>
    <div class="action"><span class="action-box">&#10003;</span><span class="action-t">Audit recurring meetings and block two no-meeting mornings.</span><span class="action-owner"><span class="action-av">PR</span>Priya</span><span class="action-due">Sprint 25</span></div>
    <div class="action"><span class="action-box">&#10003;</span><span class="action-t">Add a prod-parity check to the staging deploy pipeline.</span><span class="action-owner"><span class="action-av alt">SA</span>Sam</span><span class="action-due">Sprint 25</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Let's improve</span></div>
</div>`,
    }),
    s({
      id: 'tr-register',
      name: 'Action register',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Last sprint's follow-through</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:8px">Did we do what we said?</h2>
  <table class="table reveal" style="margin-top:12px">
    <thead><tr><th>Action from Sprint 23</th><th>Owner</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Write runbooks for the payments service</td><td>Devon</td><td><span class="accent-text" style="color:var(--pos);font-weight:700">Done</span></td></tr>
      <tr><td>Get design specs in before kickoff</td><td>Lena</td><td><span class="accent-text" style="color:var(--pos);font-weight:700">Done</span></td></tr>
      <tr><td>Reduce on-call alert noise</td><td>Sam</td><td><span class="accent-text" style="color:var(--pos);font-weight:700">Done</span></td></tr>
      <tr class="row-em"><td>Stabilize the CI pipeline</td><td>Marco</td><td><span class="accent-text" style="color:var(--accent-2);font-weight:700">Carried over</span></td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">Three of four closed. The carry-over is exactly why CI tops this sprint's themes.</p>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">Let's improve</span></div>
</div>`,
    }),
    s({
      id: 'tr-quote',
      name: 'Team quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal" style="--quote-size:72px">"The best part of this sprint was how much we helped each other. The worst part was waiting on the robots."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">Devon Rhys</span><span class="cite-role">Engineer · anonymous retro card</span></div>
  <div class="runner reveal"><span class="runner-brand">Team Aurora</span><span class="runner-label">In our words</span></div>
</div>`,
    }),
    s({
      id: 'tr-commit',
      name: 'Commitments & close',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal" style="color:#fff;opacity:0.9">Into Sprint 25</div>
    <h2 class="display reveal" style="--display-size:112px">Four fixes,<br/>four owners.</h2>
    <p class="lead reveal">We'll check in on these next retro. Thanks for being honest, team — see you in two weeks.</p>
  </div>
</div>`,
    }),
  ],
}
