import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide

const COVER_IMG = 'assets/course-curriculum-cover.jpg'
const FIG_IMG = 'assets/course-curriculum-fig.jpg'

export const courseCurriculum: Template = {
  id: 'course-curriculum',
  categories: ['Education'],
  name: 'Course Curriculum',
  tagline: 'Structured, welcoming online-course syllabus',
  audiences: ['educator', 'instructor', 'student', 'course'],
  description:
    'A warm, studio-grade syllabus for an online course — deep-green serif headlines on cream, gold accents, numbered module cards, learning-outcome checklists, a weekly schedule timeline, and an assessment table. A complete syllabus narrative you tailor to your own course.',
  fonts: {
    display: 'Lora',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#fdf6e3',
    '--text': '#14532d',
    '--muted': '#6b7a5e',
    '--accent': '#14532d',
    '--accent-2': '#ca8a04',
    '--display': "'Lora', serif",
    '--body': "'Inter', sans-serif",
    '--display-weight': '600',
    '--title-size': '124px',
    '--headline-size': '76px',
    '--lead-size': '37px',
    '--subhead-size': '46px',
    '--kicker-tracking': '0.22em',
    '--kicker-size': '21px',
    '--card-bg': '#fbf0d3',
    '--card-border': 'rgba(20,83,45,0.16)',
    '--card-shadow': '0 22px 50px -34px rgba(20,83,45,0.35)',
    '--radius': '18px',
    '--stat-size': '104px',
    '--metric-size': '116px',
    '--bullet-color': '#ca8a04',
    '--th-border': '#14532d',
    '--table-border': 'rgba(20,83,45,0.16)',
    '--rule-color': 'rgba(20,83,45,0.18)',
    '--track': 'rgba(20,83,45,0.12)',
    '--donut-hole': '#fdf6e3',
    '--bar-fill': '#14532d',
    '--bar-gap': '34px',
    '--media-radius': '18px',
    '--media-border': '1px solid rgba(20,83,45,0.16)',
    '--media-shadow': '0 50px 110px -45px rgba(20,83,45,0.5)',
    '--scrim':
      'linear-gradient(180deg, rgba(8,32,18,0.12) 0%, rgba(8,32,18,0.45) 52%, rgba(8,32,18,0.86) 100%)',
    '--pos': '#15803d',
    '--neg': '#b91c1c',
  },
  stageBg: '#f3ead0',
  assets: ['course-curriculum-cover.jpg', 'course-curriculum-fig.jpg'],
  decoration: `.kicker { color: var(--accent-2); }
.check::before { color: var(--accent-2); }
.metric, .stat-num, .donut-label { color: var(--accent); }
.tl-when { color: var(--accent-2); }

/* Section divider — quiet gold rule on cream */
.divider { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
.divider-num { font-family: var(--body); font-weight: 700; letter-spacing: 0.22em; font-size: 22px; color: var(--accent-2); }
.divider-title { font-family: var(--display); font-weight: 600; font-size: 148px; line-height: 0.96; letter-spacing: -0.02em; color: var(--text); }
.divider-rule { width: 132px; height: 5px; border-radius: 3px; background: var(--accent-2); margin-top: 14px; }

/* Numbered module cards — gold module number in a circle */
.modules { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 30px; }
.mod { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 38px 34px 34px; box-shadow: var(--card-shadow); position: relative; }
.mod-n { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; border: 2px solid var(--accent-2); color: var(--accent-2); font-family: var(--display); font-weight: 600; font-size: 30px; font-variant-numeric: tabular-nums; }
.mod-t { font-family: var(--display); font-weight: 600; font-size: 34px; line-height: 1.08; color: var(--text); margin-top: 22px; }
.mod-d { font-family: var(--body); font-size: 23px; line-height: 1.42; color: var(--muted); margin-top: 10px; }
.mod-meta { font-family: var(--body); font-weight: 600; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--accent-2); margin-top: 18px; }

/* Difficulty / level pills */
.level { display: inline-flex; align-items: center; gap: 11px; padding: 11px 24px; border-radius: 999px; background: rgba(20,83,45,0.06); border: 1px solid var(--card-border); font-family: var(--body); font-weight: 600; font-size: 25px; color: var(--text); }
.level::before { content: ''; width: 12px; height: 12px; border-radius: 50%; background: var(--muted); }
.level.beginner::before { background: var(--pos); }
.level.intermediate::before { background: var(--accent-2); }
.level.advanced::before { background: var(--neg); }

/* Resource list — gold-tab rows */
.reslist { display: flex; flex-direction: column; gap: 18px; }
.res { display: flex; align-items: center; gap: 26px; padding: 24px 30px; background: var(--card-bg); border: 1px solid var(--card-border); border-left: 5px solid var(--accent-2); border-radius: 0 14px 14px 0; }
.res-ic { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 12px; background: rgba(202,138,4,0.14); display: grid; place-items: center; color: var(--accent-2); font-family: var(--display); font-weight: 600; font-size: 24px; }
.res-t { font-family: var(--display); font-weight: 600; font-size: 30px; color: var(--text); }
.res-d { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 2px; }
.res-tag { margin-left: auto; font-family: var(--body); font-weight: 600; font-size: 20px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-2); }

/* Welcome callout — gold left rule */
.note { border-left: 5px solid var(--accent-2); background: rgba(202,138,4,0.08); padding: 30px 38px; border-radius: 0 14px 14px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent-2); margin-bottom: 10px; }

/* Agenda rows */
.ag { display: flex; gap: 26px; align-items: baseline; padding: 22px 0; border-top: 1px solid var(--card-border); }
.ag-n { font-family: var(--display); font-weight: 600; font-size: 36px; color: var(--accent-2); flex: 0 0 auto; }
.ag-t { font-family: var(--display); font-weight: 500; font-size: 40px; color: var(--text); }
.ag-d { font-family: var(--body); font-size: 23px; color: var(--muted); margin-top: 4px; }

.lede { font-family: var(--display); font-weight: 500; font-size: 58px; line-height: 1.18; letter-spacing: -0.01em; color: var(--text); max-width: 22ch; }

@media (max-width: 640px) {
  html.deck-can-flow .divider { position: relative !important; inset: auto !important; min-height: 280px; padding: 56px 22px !important; justify-content: center; }
  html.deck-can-flow .divider-num { font-size: 15px !important; }
  html.deck-can-flow .divider-title { font-size: min(50px, 14vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .divider-rule { width: 88px; height: 4px; }
  html.deck-can-flow .modules { grid-template-columns: 1fr !important; gap: 16px 0; }
  html.deck-can-flow .mod { padding: 26px 22px !important; }
  html.deck-can-flow .mod-t { font-size: min(26px, 7vw) !important; }
  html.deck-can-flow .mod-d { font-size: 17px !important; }
  html.deck-can-flow .res { flex-wrap: wrap; padding: 20px 22px !important; }
  html.deck-can-flow .res > div:not(.res-ic) { flex: 1 1 200px; min-width: 0; }
  html.deck-can-flow .res-tag { margin-left: 0 !important; flex-basis: 100%; }
  html.deck-can-flow .note { padding: 24px 24px !important; }
  html.deck-can-flow .flow { grid-template-columns: 1fr !important; }
  html.deck-can-flow .flow-arrow { transform: rotate(90deg); }
  html.deck-can-flow .lede { font-size: min(34px, 9vw) !important; line-height: 1.2 !important; max-width: 100% !important; }
}`,
  notes:
    'A complete online-course syllabus: Lora serif display + Inter body, deep forest-green (#14532d) ink on cream (#fdf6e3), ONE gold accent (#ca8a04) for eyebrows, checks, and rules. Open and close on the scholarly still-life full-bleed (assets/course-curriculum-cover.jpg); use the study-workspace figure (assets/course-curriculum-fig.jpg) for the module deep-dive split. Signature pieces: .modules numbered cards (gold ring) for the module overview, .level difficulty pills (beginner/intermediate/advanced), .reslist gold-tab resource rows, .note welcome callout, .ag agenda rows. Use .checks for learning outcomes and tools, .stats for course-at-a-glance, .timeline for the weekly schedule, .table for assessment weighting, .bars for workload, .quote for the instructor voice. Warm and structured, never busy — keep the story one module at a time.',
  sampleSlides: [
    s({
      id: 'cc-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Online Course · 8 Weeks · Self-Paced</div>
    <h1 class="display reveal" style="--display-size:130px;margin-top:8px">Writing for<br/>the Web.</h1>
    <p class="lead reveal">A practical course in clear, persuasive digital writing — from first draft to published page.</p>
  </div>
</div>`,
    }),
    s({
      id: 'cc-welcome',
      name: 'Welcome',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Welcome to the course</div>
      <p class="lede" style="margin-top:14px">Eight weeks to write words that get read, shared, and remembered.</p>
    </div>
    <div>
      <div class="note">
        <div class="note-k">Who this is for</div>
        <p class="body" style="max-width:none">Marketers, founders, and creators who write online and want it to <b>land</b> — no prior writing background needed.</p>
      </div>
      <div class="row wrap" style="margin-top:26px;--gap:16px">
        <span class="level beginner">Beginner friendly</span>
        <span class="level">~4 hrs / week</span>
        <span class="level">Certificate on completion</span>
      </div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Welcome</span></div>
</div>`,
    }),
    s({
      id: 'cc-outcomes',
      name: 'Learning outcomes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">What you'll be able to do</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:26px">By the end, you will&hellip;</h2>
  <div class="cols-2 reveal" style="gap:22px 90px">
    <ul class="checks" style="--gap:26px">
      <li class="check"><span>Draft a <b>clear, scannable page</b> in half the time it takes you now.</span></li>
      <li class="check"><span>Open with a <b>hook</b> that earns the next sentence.</span></li>
      <li class="check"><span>Edit your own work with a <b>repeatable checklist</b>.</span></li>
    </ul>
    <ul class="checks" style="--gap:26px">
      <li class="check"><span>Write <b>headlines and CTAs</b> that convert without hype.</span></li>
      <li class="check"><span>Adapt one idea across <b>email, landing, and social</b>.</span></li>
      <li class="check"><span>Build a <b>personal style guide</b> you'll keep using.</span></li>
    </ul>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Outcomes</span></div>
</div>`,
    }),
    s({
      id: 'cc-div1',
      name: 'Section · The curriculum',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">01 — The curriculum</div>
  <div class="divider-title reveal">Eight weeks,<br/>one skill at a time.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cc-glance',
      name: 'Course at a glance',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Course at a glance</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:34px">What you're signing up for.</h2>
  <div class="stats reveal">
    <div class="stat"><div class="stat-num">8</div><div class="stat-label">Weekly modules, released on a steady cadence</div></div>
    <div class="stat"><div class="stat-num">32</div><div class="stat-label">Short video lessons plus written notes</div></div>
    <div class="stat"><div class="stat-num">~30h</div><div class="stat-label">Total time, including the eight writing labs</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">At a glance</span></div>
</div>`,
    }),
    s({
      id: 'cc-modules',
      name: 'Modules overview',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The modules</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Six core modules, two labs.</h2>
  <div class="modules reveal" style="--cols:3">
    <div class="mod"><div class="mod-n">01</div><div class="mod-t">Foundations</div><div class="mod-d">How people read online and why most writing fails to hold them.</div><div class="mod-meta">4 lessons · Week 1</div></div>
    <div class="mod"><div class="mod-n">02</div><div class="mod-t">Structure</div><div class="mod-d">Outlines, hierarchy, and the scannable page that respects attention.</div><div class="mod-meta">5 lessons · Week 2</div></div>
    <div class="mod"><div class="mod-n">03</div><div class="mod-t">Voice &amp; clarity</div><div class="mod-d">Cutting fluff, finding rhythm, and sounding like a human.</div><div class="mod-meta">6 lessons · Weeks 3–4</div></div>
    <div class="mod"><div class="mod-n">04</div><div class="mod-t">Persuasion</div><div class="mod-d">Headlines, hooks, and calls to action that convert honestly.</div><div class="mod-meta">5 lessons · Week 5</div></div>
    <div class="mod"><div class="mod-n">05</div><div class="mod-t">Channels</div><div class="mod-d">Adapting one message across email, landing pages, and social.</div><div class="mod-meta">6 lessons · Weeks 6–7</div></div>
    <div class="mod"><div class="mod-n">06</div><div class="mod-t">Editing &amp; ship</div><div class="mod-d">A self-editing system and your final published piece.</div><div class="mod-meta">6 lessons · Week 8</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Modules</span></div>
</div>`,
    }),
    s({
      id: 'cc-deepdive',
      name: 'Module deep-dive',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <span class="level intermediate reveal" style="align-self:flex-start">Module 03 · Intermediate</span>
    <h2 class="headline reveal" style="margin-top:6px">Voice &amp; clarity.</h2>
    <p class="lead reveal">The module where most students have their breakthrough — when writing stops feeling stiff.</p>
    <ul class="checks reveal" style="--gap:18px;--bullet-size:30px">
      <li class="check"><span>3.1 — Cut the fluff: a line-edit workout</span></li>
      <li class="check"><span>3.2 — Rhythm, cadence, and the read-aloud test</span></li>
      <li class="check"><span>3.3 — Lab: rewrite a page in your own voice</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${FIG_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'cc-schedule',
      name: 'Weekly schedule',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Weekly schedule</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:10px">How the eight weeks flow.</h2>
  <div class="timeline reveal">
    <div class="tl-row"><div class="tl-when">Weeks 1–2</div><div class="tl-what"><b>Foundations &amp; structure</b> — learn how readers behave, then build a scannable page.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 3–4</div><div class="tl-what"><b>Voice &amp; clarity</b> — the core craft module, with your first writing lab.</div></div>
    <div class="tl-row"><div class="tl-when">Week 5</div><div class="tl-what"><b>Persuasion</b> — headlines, hooks, and CTAs, plus peer feedback.</div></div>
    <div class="tl-row"><div class="tl-when">Weeks 6–7</div><div class="tl-what"><b>Channels</b> — adapt one idea across formats; second lab due.</div></div>
    <div class="tl-row"><div class="tl-when">Week 8</div><div class="tl-what"><b>Editing &amp; ship</b> — self-edit, polish, and publish your final piece.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Schedule</span></div>
</div>`,
    }),
    s({
      id: 'cc-assessment',
      name: 'Assessment',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">How you'll be assessed</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:14px">Graded on what you make.</h2>
  <table class="table reveal">
    <thead><tr><th>Component</th><th>What it is</th><th>Due</th><th class="num">Weight</th></tr></thead>
    <tbody>
      <tr><td>Weekly exercises</td><td class="muted">Short prompts after each module</td><td>Ongoing</td><td class="num">20%</td></tr>
      <tr><td>Writing Lab 1</td><td class="muted">Rewrite a page in your own voice</td><td>Week 4</td><td class="num">20%</td></tr>
      <tr><td>Writing Lab 2</td><td class="muted">One message across three channels</td><td>Week 7</td><td class="num">20%</td></tr>
      <tr><td>Peer feedback</td><td class="muted">Two thoughtful reviews of classmates</td><td>Weeks 5–8</td><td class="num">10%</td></tr>
      <tr class="row-em"><td>Final published piece</td><td class="muted">A polished article, edited and shipped</td><td>Week 8</td><td class="num">30%</td></tr>
    </tbody>
  </table>
  <p class="fine reveal" style="margin-top:22px">A passing grade is 70%. Certificates are issued within one week of the final submission.</p>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Assessment</span></div>
</div>`,
    }),
    s({
      id: 'cc-resources',
      name: 'Tools & resources',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Tools &amp; resources</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">Everything you'll need.</h2>
  <div class="reslist reveal">
    <div class="res"><div class="res-ic">PDF</div><div><div class="res-t">The Course Workbook</div><div class="res-d">A printable companion with every exercise and checklist.</div></div><span class="res-tag">Included</span></div>
    <div class="res"><div class="res-ic">DOC</div><div><div class="res-t">Any writing app</div><div class="res-d">Docs, a notes app, or plain text — whatever you draft in.</div></div><span class="res-tag">Bring your own</span></div>
    <div class="res"><div class="res-ic">VID</div><div><div class="res-t">Lesson video library</div><div class="res-d">32 short lessons, captioned, downloadable for offline study.</div></div><span class="res-tag">Streaming</span></div>
    <div class="res"><div class="res-ic">FRM</div><div><div class="res-t">Student community</div><div class="res-d">A private space for questions, feedback, and weekly office hours.</div></div><span class="res-tag">Live</span></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Resources</span></div>
</div>`,
    }),
    s({
      id: 'cc-div2',
      name: 'Section · Logistics',
      transition: 'fade',
      bodyHtml: `<div class="divider">
  <div class="divider-num reveal">02 — Logistics</div>
  <div class="divider-title reveal">The practical<br/>details.</div>
  <div class="divider-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'cc-workload',
      name: 'Expectations & workload',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="two-col reveal" style="--col-gap:96px;align-items:center">
    <div>
      <div class="kicker">Expectations &amp; workload</div>
      <h2 class="headline" style="margin-top:8px">About four hours a week.</h2>
      <div class="note" style="margin-top:26px">
        <div class="note-k">Set yourself up to finish</div>
        <p class="body" style="max-width:none">Students who block <b>one regular session</b> each week are far likelier to complete the course.</p>
      </div>
    </div>
    <div class="bars" style="--bars-height:340px">
      <div class="bar" style="--h:38%"><div class="bar-fill" data-val="1.5h"></div><div class="bar-label">Lessons</div></div>
      <div class="bar" style="--h:62%"><div class="bar-fill" data-val="2.0h"></div><div class="bar-label">Practice</div></div>
      <div class="bar" style="--h:14%"><div class="bar-fill" data-val="0.5h"></div><div class="bar-label">Community</div></div>
    </div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Workload</span></div>
</div>`,
    }),
    s({
      id: 'cc-instructor',
      name: 'Meet your instructor',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal" style="text-align:center;align-self:center">Meet your instructor</div>
  <blockquote class="quote reveal" style="--quote-size:66px;max-width:26ch;text-align:center;align-self:center">"Good web writing isn't about talent. It's a craft with a checklist — and I'll hand you mine."</blockquote>
  <div class="cite reveal" style="align-self:center"><span class="cite-dot"></span><span class="cite-name">Maya Ellison</span><span class="cite-role">Editor &amp; writing coach, 12 years in digital</span></div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Instructor</span></div>
</div>`,
    }),
    s({
      id: 'cc-faq',
      name: 'Good to know',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Good to know</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:24px">A few common questions.</h2>
  <div class="cards reveal" style="--cols:3">
    <div class="card"><div class="card-title" style="font-size:34px">Do I keep access?</div><div class="card-body">Yes — lifetime access to all lessons and every future update.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">What if I fall behind?</div><div class="card-body">It's self-paced. Deadlines are guides, not gates; finish on your schedule.</div></div>
    <div class="card"><div class="card-title" style="font-size:34px">Is there a refund?</div><div class="card-body">A full refund within 14 days, no questions asked, if it's not for you.</div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Good to know</span></div>
</div>`,
    }),
    s({
      id: 'cc-flow',
      name: 'Your path through',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Your path through</div>
  <h2 class="headline reveal" style="margin-top:8px;margin-bottom:30px">Four moves, every week.</h2>
  <div class="flow reveal">
    <div class="flow-step"><div class="mod" style="text-align:center"><div class="mod-t" style="margin-top:0">Watch</div><div class="mod-d">Short lessons you can do in one sitting.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="mod" style="text-align:center"><div class="mod-t" style="margin-top:0">Practice</div><div class="mod-d">A focused exercise that builds the week's skill.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="mod" style="text-align:center"><div class="mod-t" style="margin-top:0">Share</div><div class="mod-d">Post your work and read two classmates'.</div></div></div>
    <div class="flow-arrow"></div>
    <div class="flow-step"><div class="mod" style="text-align:center"><div class="mod-t" style="margin-top:0">Refine</div><div class="mod-d">Apply the feedback to your final piece.</div></div></div>
  </div>
  <div class="runner reveal"><span class="runner-brand">Writing for the Web</span><span class="runner-label">Your path</span></div>
</div>`,
    }),
    s({
      id: 'cc-enroll',
      name: 'Enroll',
      transition: 'fade',
      bodyHtml: `<div class="full-bleed">
  <img class="bleed" src="${COVER_IMG}" alt="">
  <div class="scrim"></div>
  <div class="pad end">
    <div class="kicker reveal">Enrollment open · Next cohort starts Monday</div>
    <h2 class="display reveal" style="--display-size:118px">Start writing<br/>better, this week.</h2>
    <p class="lead reveal">enroll@writingfortheweb.com · writingfortheweb.com/start</p>
  </div>
</div>`,
    }),
  ],
}
