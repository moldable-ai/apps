import type { Template } from '../types'

// A print-perfect, studio-grade one-page résumé. Two columns: a narrow ink
// sidebar (name in a Fraunces display serif, contact stack with inline SVG
// icons, hand-rolled proficiency bars, languages, education) and a wide right
// column (summary lede, a hairline-rail experience timeline with dot markers,
// a selected-projects mini-grid, and an awards row). Deep ink on warm paper
// with a single oxblood accent. Pure CSS/SVG — no imagery, no chart libs.
// Includes an @media print block that holds it to one page.

const CSS = `
:root {
  --paper: #faf8f4;       /* warm paper */
  --paper-2: #f4f1ea;     /* faint tint for chips/tracks */
  --ink: #14171f;         /* deep ink text */
  --ink-2: #3a3f4b;       /* secondary ink */
  --mut: #767b87;         /* muted labels */
  --faint: #a7abb4;       /* hairlines / de-emphasis */
  --line: #e6e1d6;        /* warm hairline */
  --accent: #7a2230;      /* oxblood accent (swap to #16504a for teal) */
  --accent-soft: rgba(122,34,48,0.10);
  --sidebar: #14171f;     /* ink sidebar panel */
  --sidebar-ink: #f3efe7; /* text on sidebar */
  --sidebar-mut: #9aa0ab; /* muted on sidebar */
  --sidebar-line: rgba(243,239,231,0.14);
  --display: 'Fraunces', Georgia, serif;
  --body: 'Inter', system-ui, sans-serif;
  --page-font: var(--body);
}
body { background:
  radial-gradient(900px 520px at 88% -8%, rgba(122,34,48,0.05), transparent 62%),
  var(--paper);
  color: var(--ink); }
.num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1; }

/* ---- sheet ---- */
.sheet {
  max-width: 1060px; margin: clamp(18px, 4vw, 56px) auto; background: var(--paper);
  border: 1px solid var(--line); border-radius: 22px; overflow: hidden;
  box-shadow: 0 1px 0 rgba(20,23,31,0.02), 0 40px 90px -50px rgba(20,23,31,0.45);
  display: grid; grid-template-columns: 312px 1fr;
}

/* ===== LEFT SIDEBAR ===== */
.side {
  background: var(--sidebar); color: var(--sidebar-ink);
  padding: clamp(28px, 3.2vw, 44px) clamp(24px, 2.6vw, 34px);
  display: flex; flex-direction: column; gap: 30px; position: relative;
}
.side::after {
  content: ''; position: absolute; right: 0; top: 8%; bottom: 8%; width: 1px;
  background: linear-gradient(180deg, transparent, var(--sidebar-line) 18%, var(--sidebar-line) 82%, transparent);
}
.name {
  font-family: var(--display); font-weight: 600; font-optical-sizing: auto;
  font-size: clamp(34px, 4.6vw, 46px); line-height: 0.98; letter-spacing: -0.02em;
  margin: 0; text-wrap: balance;
}
.name .b2 { display: block; color: var(--accent); }
.name .b2 { color: #d98b96; } /* lifted oxblood for dark bg legibility */
.role {
  margin: 14px 0 0; font-size: 13px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--sidebar-mut);
}
.role .pin { color: #d98b96; }

.s-group { display: flex; flex-direction: column; gap: 13px; }
.s-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--sidebar-mut); display: inline-flex; align-items: center; gap: 12px;
}
.s-label::after { content: ''; flex: 1; height: 1px; background: var(--sidebar-line); }

/* contact stack */
.contact { display: flex; flex-direction: column; gap: 11px; }
.contact a, .contact span {
  display: inline-flex; align-items: center; gap: 11px; color: var(--sidebar-ink);
  text-decoration: none; font-size: 13.5px; line-height: 1.3; transition: color 0.18s ease;
}
.contact a:hover { color: #f0c3ca; }
.contact a:focus-visible { outline: 2px solid #d98b96; outline-offset: 3px; border-radius: 4px; }
.contact svg { width: 16px; height: 16px; flex: none; color: #d98b96; }

/* skill bars */
.skills { display: flex; flex-direction: column; gap: 13px; }
.skill .top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.skill .k { font-size: 13px; font-weight: 500; color: var(--sidebar-ink); }
.skill .lv { font-size: 11px; font-weight: 600; color: var(--sidebar-mut); letter-spacing: 0.04em; }
.bar { height: 6px; border-radius: 999px; background: rgba(243,239,231,0.10); overflow: hidden; }
.bar i {
  display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, #c66b78, #e2a8b1);
  transition: width 1.1s cubic-bezier(0.22,1,0.36,1);
}
.reveal.in .bar i { width: var(--w); }

/* languages */
.langs { display: flex; flex-direction: column; gap: 10px; }
.lang { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px; }
.lang .k { color: var(--sidebar-ink); }
.lang .dots { display: inline-flex; gap: 5px; }
.lang .dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(243,239,231,0.18); }
.lang .dots i.on { background: #d98b96; }

/* education (sidebar) */
.edu { display: flex; flex-direction: column; gap: 16px; }
.edu .it .d { font-size: 14px; font-weight: 600; color: var(--sidebar-ink); letter-spacing: -0.005em; }
.edu .it .s { font-size: 12.5px; color: var(--sidebar-mut); margin-top: 3px; }
.edu .it .y { font-size: 11.5px; color: var(--sidebar-mut); margin-top: 5px; letter-spacing: 0.04em; }

/* ===== RIGHT MAIN ===== */
.main { padding: clamp(30px, 3.6vw, 50px) clamp(28px, 3.4vw, 48px); }

.lede {
  font-family: var(--display); font-optical-sizing: auto; font-weight: 400;
  font-size: clamp(18px, 2.1vw, 23px); line-height: 1.42; letter-spacing: -0.012em;
  color: var(--ink); margin: 0; text-wrap: pretty;
}
.lede b { font-weight: 600; }
.lede .hl { color: var(--accent); font-style: italic; }

.sec { margin-top: clamp(30px, 3.4vw, 42px); }
.sec-h {
  display: flex; align-items: baseline; gap: 14px; margin-bottom: 22px;
}
.sec-h h2 {
  font-family: var(--display); font-optical-sizing: auto; font-weight: 600;
  font-size: 18px; letter-spacing: 0.02em; text-transform: uppercase; margin: 0;
  color: var(--ink);
}
.sec-h .ln { flex: 1; height: 1px; background: var(--line); }
.sec-h .meta { font-size: 12px; color: var(--mut); letter-spacing: 0.04em; }

/* timeline */
.tl { position: relative; padding-left: 26px; }
.tl::before {
  content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1.5px;
  background: linear-gradient(180deg, var(--accent) 0%, var(--line) 88%, transparent);
}
.job { position: relative; padding-bottom: 26px; }
.job:last-child { padding-bottom: 0; }
.job::before {
  content: ''; position: absolute; left: -26px; top: 5px; width: 11px; height: 11px;
  border-radius: 50%; background: var(--paper); border: 2.5px solid var(--accent);
  box-shadow: 0 0 0 4px var(--paper); transform: scale(0.4); opacity: 0;
  transition: transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s ease;
}
.reveal.in .job::before { transform: scale(1); opacity: 1; }
.job:first-child::before { background: var(--accent); }

.job-top {
  display: flex; align-items: baseline; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
}
.job-top .rc { font-size: 15.5px; line-height: 1.35; }
.job-top .rc b { font-weight: 700; color: var(--ink); letter-spacing: -0.01em; }
.job-top .rc .at { color: var(--mut); }
.job-top .rc .co { color: var(--accent); font-weight: 600; }
.job-top .when {
  font-size: 12.5px; font-weight: 600; color: var(--mut); letter-spacing: 0.02em;
  white-space: nowrap;
}
.job .place { font-size: 12.5px; color: var(--mut); margin-top: 3px; }
.job ul {
  list-style: none; margin: 11px 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 7px;
}
.job li {
  position: relative; padding-left: 18px; font-size: 14px; line-height: 1.5;
  color: var(--ink-2);
}
.job li::before {
  content: ''; position: absolute; left: 2px; top: 9px; width: 5px; height: 5px;
  border-radius: 50%; background: var(--accent); opacity: 0.85;
}
.job li b { color: var(--ink); font-weight: 700; }

/* projects grid */
.proj { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.pcard {
  border: 1px solid var(--line); border-radius: 14px; padding: 16px 17px;
  background: linear-gradient(180deg, #fffefb, var(--paper)); position: relative;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.pcard:hover {
  transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  box-shadow: 0 14px 30px -20px rgba(20,23,31,0.5);
}
.pcard .pt { font-size: 14.5px; font-weight: 700; letter-spacing: -0.01em; display: flex; align-items: center; gap: 8px; }
.pcard .pt .gl { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex: none; }
.pcard .pd { font-size: 12.8px; line-height: 1.45; color: var(--ink-2); margin-top: 7px; }
.pcard .pm { font-size: 11.5px; color: var(--mut); margin-top: 9px; letter-spacing: 0.02em; font-weight: 600; }

/* awards row */
.awards { display: flex; flex-direction: column; gap: 12px; }
.award {
  display: flex; align-items: flex-start; gap: 13px; padding-bottom: 12px;
  border-bottom: 1px solid var(--line); font-size: 13.5px; line-height: 1.4;
}
.award:last-child { border-bottom: 0; padding-bottom: 0; }
.award .ico {
  flex: none; width: 30px; height: 30px; border-radius: 9px; background: var(--accent-soft);
  display: grid; place-items: center; color: var(--accent);
}
.award .ico svg { width: 16px; height: 16px; }
.award .at { font-weight: 700; color: var(--ink); }
.award .as { color: var(--mut); }
.award .ay { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--mut); white-space: nowrap; }

/* footnote */
.foot {
  margin-top: clamp(26px, 3vw, 38px); padding-top: 16px; border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  font-size: 12px; color: var(--mut); flex-wrap: wrap;
}
.foot .ref { color: var(--ink-2); }

/* ===== RESPONSIVE ===== */
@media (max-width: 820px) {
  .sheet { grid-template-columns: 1fr; border-radius: 18px; }
  .side { gap: 26px; }
  .side::after { display: none; }
  .side { border-bottom: 1px solid var(--sidebar-line); }
  .proj { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .sheet { margin: 12px; border-radius: 16px; }
  .main { padding: 26px 20px 30px; }
  .side { padding: 28px 22px; }
  .job-top { gap: 4px; }
  .job-top .when { order: 3; }
  .foot { gap: 8px; }
}

/* ===== PRINT — hold to one page ===== */
@media print {
  @page { margin: 12mm; size: A4; }
  html, body { background: #fff !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet {
    margin: 0; max-width: none; border: 0; border-radius: 0; box-shadow: none;
    grid-template-columns: 270px 1fr;
  }
  .side::after, .side { border: 0; }
  body, .sheet, .pcard { box-shadow: none !important; }
  .pcard { background: #fff; }
  .reveal { opacity: 1 !important; transform: none !important; }
  .reveal.in .bar i, .bar i { width: var(--w) !important; transition: none; }
  .job::before { opacity: 1 !important; transform: scale(1) !important; transition: none; }
  .sec, .job, .pcard, .award { break-inside: avoid; page-break-inside: avoid; }
  .sec-h h2 { break-after: avoid; }
}
`.trim()

const HTML = `
<div class="sheet">

  <!-- ===== SIDEBAR ===== -->
  <aside class="side">
    <header class="reveal" data-reveal="none">
      <h1 class="name">Marguerite<span class="b2">Vasquez</span></h1>
      <p class="role">Senior Product Designer <span class="pin">·</span> Design Systems</p>
    </header>

    <section class="s-group reveal" data-reveal="left">
      <span class="s-label">Contact</span>
      <div class="contact">
        <a href="mailto:hello@margueritevasquez.com">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>
          hello@margueritevasquez.com
        </a>
        <a href="tel:+14155550148">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h3l1.6 4.2-2 1.4a12 12 0 0 0 5.4 5.4l1.4-2L23 20.5V23a2 2 0 0 1-2 2A18 18 0 0 1 3 7a2 2 0 0 1 2-3Z" transform="translate(-1 -2)"/></svg>
          +1 (415) 555-0148
        </a>
        <span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.1 7-11.5A7 7 0 0 0 5 10.5C5 15.9 12 22 12 22Z"/><circle cx="12" cy="10.5" r="2.5"/></svg>
          San Francisco, CA
        </span>
        <a href="https://margueritevasquez.com">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"/></svg>
          margueritevasquez.com
        </a>
      </div>
    </section>

    <section class="s-group reveal" data-reveal="left">
      <span class="s-label">Skills</span>
      <div class="skills">
        <div class="skill"><div class="top"><span class="k">Design systems</span><span class="lv">Expert</span></div><div class="bar"><i style="--w:96%"></i></div></div>
        <div class="skill"><div class="top"><span class="k">Interaction &amp; prototyping</span><span class="lv">Expert</span></div><div class="bar"><i style="--w:92%"></i></div></div>
        <div class="skill"><div class="top"><span class="k">Product strategy</span><span class="lv">Advanced</span></div><div class="bar"><i style="--w:84%"></i></div></div>
        <div class="skill"><div class="top"><span class="k">User research</span><span class="lv">Advanced</span></div><div class="bar"><i style="--w:78%"></i></div></div>
        <div class="skill"><div class="top"><span class="k">Front-end (React / CSS)</span><span class="lv">Proficient</span></div><div class="bar"><i style="--w:70%"></i></div></div>
      </div>
    </section>

    <section class="s-group reveal" data-reveal="left">
      <span class="s-label">Languages</span>
      <div class="langs">
        <div class="lang"><span class="k">English</span><span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span></div>
        <div class="lang"><span class="k">Spanish</span><span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i></span></div>
        <div class="lang"><span class="k">Portuguese</span><span class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></span></div>
      </div>
    </section>

    <section class="s-group reveal" data-reveal="left">
      <span class="s-label">Education</span>
      <div class="edu">
        <div class="it"><div class="d">M.S. Human–Computer Interaction</div><div class="s">Carnegie Mellon University</div><div class="y num">2013 — 2015</div></div>
        <div class="it"><div class="d">B.F.A. Graphic Design</div><div class="s">Rhode Island School of Design</div><div class="y num">2009 — 2013</div></div>
      </div>
    </section>
  </aside>

  <!-- ===== MAIN ===== -->
  <main class="main">
    <p class="lede reveal" data-reveal="none">
      Senior product designer with <b>10+ years</b> shipping calm, considered software at scale —
      from <span class="hl">zero-to-one</span> bets to mature platforms. I build the systems and rituals
      that let teams move fast <b>without</b> the design fraying at the edges.
    </p>

    <section class="sec reveal">
      <div class="sec-h"><h2>Experience</h2><span class="ln"></span><span class="meta">2015 — Present</span></div>
      <div class="tl">

        <article class="job">
          <div class="job-top">
            <div class="rc"><b>Principal Product Designer</b> <span class="at">at</span> <span class="co">Linear</span></div>
            <div class="when num">2021 — Present</div>
          </div>
          <div class="place">San Francisco, CA · Hybrid</div>
          <ul>
            <li>Founded and led the design-systems practice; <b>Polaris DS</b> now powers <b>9 product surfaces</b> and cut new-feature design time by <b>40%</b>.</li>
            <li>Drove the redesign of the core planning canvas, lifting weekly active usage <b>+27%</b> and trimming time-to-first-value to <b>under 4 minutes</b>.</li>
            <li>Grew and mentored a team of <b>6 designers</b>; introduced a critique cadence adopted org-wide.</li>
          </ul>
        </article>

        <article class="job">
          <div class="job-top">
            <div class="rc"><b>Senior Product Designer</b> <span class="at">at</span> <span class="co">Notion</span></div>
            <div class="when num">2018 — 2021</div>
          </div>
          <div class="place">New York, NY</div>
          <ul>
            <li>Designed the collaborative comments and mentions system, shipped to <b>20M+ users</b> with a <b>4.8★</b> satisfaction score.</li>
            <li>Led accessibility overhaul to <b>WCAG 2.1 AA</b>, reducing reported friction tickets by <b>34%</b>.</li>
          </ul>
        </article>

        <article class="job">
          <div class="job-top">
            <div class="rc"><b>Product Designer</b> <span class="at">at</span> <span class="co">Stripe</span></div>
            <div class="when num">2015 — 2018</div>
          </div>
          <div class="place">San Francisco, CA</div>
          <ul>
            <li>Owned end-to-end design for Stripe Dashboard onboarding, raising activation <b>+19%</b> across <b>40+ countries</b>.</li>
            <li>Built the first shared Figma component library, later seeding the company-wide system.</li>
          </ul>
        </article>

      </div>
    </section>

    <section class="sec reveal">
      <div class="sec-h"><h2>Selected Projects</h2><span class="ln"></span></div>
      <div class="proj">
        <div class="pcard"><div class="pt"><span class="gl"></span>Polaris Design System</div><div class="pd">An open, themeable token + component system spanning web, mobile, and docs.</div><div class="pm num">340+ components · 9 surfaces</div></div>
        <div class="pcard"><div class="pt"><span class="gl"></span>Motion Guidelines</div><div class="pd">A living spec for purposeful motion — durations, easing, and reduced-motion rules.</div><div class="pm">Adopted org-wide</div></div>
        <div class="pcard"><div class="pt"><span class="gl"></span>Field Notes</div><div class="pd">A self-published essay series on craft and design systems; 12k subscribers.</div><div class="pm num">12k readers</div></div>
        <div class="pcard"><div class="pt"><span class="gl"></span>Type Scale Tool</div><div class="pd">An open-source fluid typography calculator used by 30k designers.</div><div class="pm num">30k users · MIT</div></div>
      </div>
    </section>

    <section class="sec reveal">
      <div class="sec-h"><h2>Awards &amp; Certifications</h2><span class="ln"></span></div>
      <div class="awards">
        <div class="award">
          <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg></span>
          <div><span class="at">Awwwards — Site of the Day</span><br><span class="as">Polaris documentation site</span></div>
          <span class="ay num">2023</span>
        </div>
        <div class="award">
          <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 6v6c0 5 3.8 8.5 9 10 5.2-1.5 9-5 9-10V6l-9-4Z"/><path d="m9 12 2 2 4-4"/></svg></span>
          <div><span class="at">Nielsen Norman — UX Certification</span><br><span class="as">Interaction Design specialty</span></div>
          <span class="ay num">2020</span>
        </div>
        <div class="award">
          <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/></svg></span>
          <div><span class="at">Speaker — Config &amp; Smashing Conf</span><br><span class="as">"Systems that scale with care"</span></div>
          <span class="ay num">2022</span>
        </div>
      </div>
    </section>

    <div class="foot">
      <span>Portfolio &amp; case studies available on request.</span>
      <span class="ref num">References: 3 available</span>
    </div>
  </main>
</div>
`.trim()

const JS = `
// Print affordance: pressing P (when not typing in a field) opens the print dialog,
// which renders the one-page print stylesheet above.
document.addEventListener('keydown', function (e) {
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    window.print();
  }
});

// Gentle stagger: as each skill section reveals, let the bars fill in sequence
// for a more deliberate, hand-built feel (purely cosmetic; CSS already handles
// the base reveal so this degrades gracefully).
(function () {
  var groups = document.querySelectorAll('.skills');
  groups.forEach(function (g) {
    var bars = g.querySelectorAll('.bar i');
    bars.forEach(function (bar, i) {
      bar.style.transitionDelay = (0.08 * i).toFixed(2) + 's';
    });
  });
})();
`.trim()

export const resume: Template = {
  id: 'resume',
  kind: 'page',
  name: 'Resume / CV',
  tagline: 'A print-perfect, studio-grade one-page résumé',
  categories: ['Personal'],
  audiences: ['job-seeker', 'personal', 'professional'],
  description:
    'A studio-grade, print-perfect one-page résumé: a deep-ink sidebar (display-serif name, contact stack with inline SVG icons, hand-rolled proficiency bars, languages, and education) beside a wide column with a serif summary lede, a hairline-rail experience timeline with dot markers, a selected-projects mini-grid, and an awards row. Deep ink on warm paper with one oxblood accent. Pure CSS/SVG, fully responsive, with an @media print block that holds it to a single page.',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  stageBg: '#14171f',
  notes:
    'Swap the persona text directly in the HTML. PALETTE KNOBS (in :root): `--accent` is the single accent — oxblood `#7a2230` by default; for the teal variant set it to `#16504a` and also adjust the lifted-on-dark shades (`.name .b2`, `.role .pin`, `.contact svg`, `.skill .bar i` gradient, `.lang .dots i.on`) which use `#d98b96`/`#c66b78` so the accent stays legible on the dark sidebar. `--paper` is the page color, `--ink` the text. Proficiency bars are hand-rolled: edit each `.skill` `--w` (0–100%) and the `.lv` label. Language fluency is dot-based — add/remove `.on` classes. The experience timeline auto-draws its rail and dots; copy a `.job` block to add a role (keep role/company on the `.rc` line and dates in `.when`). Projects are a 2-up grid of `.pcard`s; awards are `.award` rows. The @media print block forces one A4 page, strips shadows/tints, and prevents awkward breaks — tune `@page size`/`margin` there. Press P to preview the print layout.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#faf8f4',
  },
}
