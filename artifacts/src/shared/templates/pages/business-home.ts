import type { Template } from '../types'

// Northside Dental — a warm, trustworthy local-business homepage. Deep teal +
// warm sand neutrals with a single coral accent. Sticky header, a photo hero
// (assets/business-hero.jpg) over a calm gradient fallback, an SVG-icon services
// grid, a stats band, a JS testimonial carousel, an hours/location card with a
// hand-drawn SVG map + pin, and a booking CTA. Pure CSS/SVG — no chart libs.

const CSS = `
:root {
  --bg: #f6f2ea;            /* warm sand canvas */
  --ink: #11302f;           /* deep teal-ink for text */
  --teal: #0e3b39;          /* brand deep teal */
  --teal-2: #18514d;        /* lighter teal */
  --teal-soft: #e4eeea;     /* tint */
  --sand: #efe7d8;          /* card warm neutral */
  --paper: #fffdf8;         /* card surface */
  --line: rgba(14,59,57,0.12);
  --mut: #5b6f6c;           /* muted teal-grey */
  --faint: #8a9794;
  --accent: #f0623f;        /* coral */
  --accent-soft: #fce3da;
  --gold: #e7a83a;          /* star gold */
  --display: 'Fraunces', Georgia, serif;
  --body: 'Plus Jakarta Sans', system-ui, sans-serif;
  --page-font: var(--body);
  --shadow: 0 24px 60px -28px rgba(14,59,57,0.5);
  --r: 22px;
}
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); font-family: var(--body); line-height: 1.55; }
.num { font-variant-numeric: tabular-nums; }
.wrap { max-width: 1160px; margin: 0 auto; padding: 0 clamp(18px, 4vw, 40px); }
a { color: inherit; text-decoration: none; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; letter-spacing: -0.02em; line-height: 1.04; margin: 0; }
.eyebrow { font-family: var(--body); font-weight: 700; font-size: 12.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); display: inline-flex; align-items: center; gap: 10px; }
.eyebrow::before { content: ''; width: 26px; height: 2px; background: currentColor; border-radius: 2px; }

/* ---- buttons ---- */
.btn { display: inline-flex; align-items: center; gap: 9px; font-family: var(--body); font-weight: 700; font-size: 15px; padding: 13px 22px; border-radius: 999px; border: 1.5px solid transparent; cursor: pointer; transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .25s, background .2s; white-space: nowrap; }
.btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.btn-primary { background: var(--accent); color: #fff; box-shadow: 0 14px 30px -12px rgba(240,98,63,0.7); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 20px 36px -12px rgba(240,98,63,0.75); }
.btn-ghost { background: transparent; color: var(--teal); border-color: var(--line); }
.btn-ghost:hover { border-color: var(--teal); transform: translateY(-2px); }
.btn-dark { background: var(--teal); color: #fff; }
.btn-dark:hover { background: var(--teal-2); transform: translateY(-2px); }

/* ---- sticky header ---- */
.head { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(14px) saturate(1.2); border-bottom: 1px solid transparent; transition: border-color .3s, background .3s; }
.head.stuck { border-color: var(--line); background: color-mix(in srgb, var(--bg) 94%, transparent); }
.head .wrap { display: flex; align-items: center; gap: 18px; height: 76px; }
.logo { display: inline-flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; font-size: 21px; letter-spacing: -0.01em; }
.mark { width: 38px; height: 38px; flex: none; }
.nav { display: flex; gap: 6px; margin-left: 14px; }
.nav a { font-weight: 600; font-size: 14.5px; color: var(--mut); padding: 8px 13px; border-radius: 999px; transition: color .2s, background .2s; }
.nav a:hover { color: var(--teal); background: var(--teal-soft); }
.head .spacer { flex: 1; }
.phone { display: inline-flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px; color: var(--teal); }
.phone svg { width: 17px; height: 17px; }
.menu-toggle { display: none; }

/* ---- hero ---- */
.hero { padding: clamp(38px, 6vw, 76px) 0 clamp(40px, 6vw, 70px); }
.hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(28px, 5vw, 64px); align-items: center; }
.hero h1 { font-size: clamp(40px, 6.6vw, 70px); letter-spacing: -0.035em; }
.hero h1 .ac { color: var(--accent); font-style: italic; }
.hero .lede { font-size: clamp(16px, 1.9vw, 19px); color: var(--mut); max-width: 30em; margin: 22px 0 30px; }
.hero-cta { display: flex; gap: 13px; flex-wrap: wrap; }
.trust-row { display: flex; align-items: center; gap: clamp(18px, 3vw, 34px); margin-top: 38px; flex-wrap: wrap; }
.trust { display: flex; flex-direction: column; gap: 3px; }
.trust .big { font-family: var(--display); font-weight: 600; font-size: 26px; letter-spacing: -0.02em; display: inline-flex; align-items: center; gap: 6px; }
.trust .lab { font-size: 12.5px; color: var(--faint); font-weight: 600; }
.stars { display: inline-flex; gap: 2px; color: var(--gold); }
.stars svg { width: 17px; height: 17px; }
.trust-div { width: 1px; align-self: stretch; background: var(--line); }

/* hero image w/ gradient fallback */
.hero-fig { position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 4 / 4.4; box-shadow: var(--shadow);
  background: linear-gradient(155deg, #1c5450 0%, #0e3b39 48%, #13403c 100%); }
.hero-fig::after { content: ''; position: absolute; inset: 0; background: radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.16), transparent 55%); pointer-events: none; }
.hero-fig img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.badge { position: absolute; left: 18px; bottom: 18px; z-index: 2; display: flex; align-items: center; gap: 12px; background: color-mix(in srgb, var(--paper) 92%, transparent); backdrop-filter: blur(8px); border-radius: 16px; padding: 13px 16px; box-shadow: 0 16px 34px -20px rgba(0,0,0,0.5); }
.badge .av { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 14px; flex: none; }
.badge .t { font-weight: 700; font-size: 14px; line-height: 1.3; }
.badge .s { font-size: 12px; color: var(--mut); }

/* reveal helpers */
.reveal { opacity: 0; transform: translateY(22px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
.reveal.in { opacity: 1; transform: none; }
.reveal[data-reveal="right"] { transform: translateX(26px); }
.reveal[data-reveal="right"].in { transform: none; }
.reveal[data-reveal="scale"] { transform: scale(.96); }
.reveal[data-reveal="scale"].in { transform: none; }

/* ---- section heads ---- */
.sec { padding: clamp(46px, 7vw, 90px) 0; }
.sec-head { max-width: 38rem; margin-bottom: clamp(28px, 4vw, 46px); }
.sec-head.center { margin-left: auto; margin-right: auto; text-align: center; }
.sec-head.center .eyebrow::before { display: none; }
.sec-head h2 { font-size: clamp(30px, 4.4vw, 46px); margin-top: 14px; }
.sec-head p { color: var(--mut); font-size: 17px; margin: 14px 0 0; }

/* ---- services ---- */
.services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.svc { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r); padding: 26px 24px 24px; transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, border-color .25s; position: relative; overflow: hidden; }
.svc:hover { transform: translateY(-5px); box-shadow: var(--shadow); border-color: transparent; }
.svc-ic { width: 50px; height: 50px; border-radius: 14px; background: var(--teal-soft); color: var(--teal); display: grid; place-items: center; margin-bottom: 18px; transition: background .25s, color .25s; }
.svc:hover .svc-ic { background: var(--accent); color: #fff; }
.svc-ic svg { width: 26px; height: 26px; }
.svc h3 { font-size: 21px; }
.svc p { color: var(--mut); font-size: 14.5px; margin: 9px 0 0; }
.svc .more { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; font-weight: 700; font-size: 13.5px; color: var(--accent); }
.svc .more svg { width: 14px; height: 14px; transition: transform .2s; }
.svc:hover .more svg { transform: translateX(4px); }

/* ---- stats band ---- */
.band { background: var(--teal); color: #fff; border-radius: clamp(22px, 4vw, 34px); padding: clamp(34px, 5vw, 56px) clamp(26px, 5vw, 56px); position: relative; overflow: hidden; }
.band::before { content: ''; position: absolute; right: -80px; top: -80px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(240,98,63,0.28), transparent 65%); }
.band-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 30px; position: relative; }
.band-head h2 { color: #fff; font-size: clamp(26px, 3.6vw, 38px); }
.band-head .eyebrow { color: #f2a48f; }
.band-head p { color: rgba(255,255,255,0.72); max-width: 26em; margin: 12px 0 0; font-size: 15.5px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(16px, 3vw, 30px); position: relative; }
.stat { border-left: 2px solid rgba(255,255,255,0.18); padding-left: 18px; }
.stat .n { font-family: var(--display); font-weight: 600; font-size: clamp(34px, 4.6vw, 50px); letter-spacing: -0.03em; line-height: 1; }
.stat .n small { font-size: 0.55em; color: var(--accent); margin-left: 2px; font-weight: 600; }
.stat .l { font-size: 13.5px; color: rgba(255,255,255,0.68); margin-top: 9px; font-weight: 500; }

/* ---- testimonials carousel ---- */
.tcarousel { position: relative; }
.ttrack { display: flex; gap: 20px; overflow: hidden; }
.tcard { flex: 0 0 100%; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r); padding: clamp(26px, 4vw, 40px); box-shadow: 0 20px 50px -34px rgba(14,59,57,0.55); }
@media (min-width: 821px) { .tcard { flex-basis: calc((100% - 40px) / 3); } }
.tcard .stars { margin-bottom: 16px; }
.quote { font-family: var(--display); font-weight: 500; font-size: clamp(17px, 1.8vw, 20px); line-height: 1.42; letter-spacing: -0.01em; color: var(--ink); }
.quote::before { content: '\\201C'; color: var(--accent); }
.quote::after { content: '\\201D'; color: var(--accent); }
.tperson { display: flex; align-items: center; gap: 13px; margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--line); }
.tperson .av { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 15px; color: #fff; flex: none; }
.tperson .nm { font-weight: 700; font-size: 15px; }
.tperson .rl { font-size: 13px; color: var(--mut); }
.tnav { display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 28px; }
.tnav button { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--paper); color: var(--teal); cursor: pointer; display: grid; place-items: center; transition: background .2s, color .2s, transform .2s, border-color .2s; }
.tnav button:hover { background: var(--teal); color: #fff; border-color: var(--teal); transform: translateY(-2px); }
.tnav button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.tnav svg { width: 18px; height: 18px; }
.tdots { display: flex; gap: 8px; }
.tdots button { width: 9px; height: 9px; padding: 0; border-radius: 50%; border: 0; background: var(--line); cursor: pointer; transition: background .2s, width .25s; }
.tdots button.on { background: var(--accent); width: 24px; border-radius: 999px; }

/* ---- hours & location ---- */
.locate { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 0; border-radius: clamp(22px, 4vw, 30px); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow); }
.map { position: relative; min-height: 360px; background:
  radial-gradient(140% 120% at 70% 10%, #cfe0db 0%, #bcd2cc 40%, #a9c4bd 100%); }
.map svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.hours-card { background: var(--paper); padding: clamp(26px, 4vw, 40px); }
.hours-card h3 { font-size: 25px; }
.addr { display: flex; gap: 12px; margin: 18px 0 22px; font-size: 15px; color: var(--mut); line-height: 1.5; }
.addr svg { width: 20px; height: 20px; color: var(--accent); flex: none; margin-top: 2px; }
.htable { width: 100%; border-collapse: collapse; font-size: 14.5px; }
.htable td { padding: 11px 0; border-bottom: 1px solid var(--line); }
.htable tr:last-child td { border-bottom: 0; }
.htable td:first-child { color: var(--mut); font-weight: 500; }
.htable td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.htable tr.today td { color: var(--teal); }
.htable tr.today td:first-child::after { content: 'Today'; margin-left: 9px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 2px 8px; border-radius: 999px; vertical-align: middle; }
.htable .closed { color: var(--faint); font-weight: 600; }

/* ---- booking CTA band ---- */
.cta { text-align: center; background:
  linear-gradient(150deg, #0e3b39, #18514d 60%, #0e3b39); color: #fff; border-radius: clamp(24px, 4vw, 36px); padding: clamp(44px, 7vw, 80px) clamp(24px, 5vw, 40px); position: relative; overflow: hidden; box-shadow: var(--shadow); }
.cta::before { content: ''; position: absolute; inset: 0; background:
  radial-gradient(80% 60% at 50% -10%, rgba(240,98,63,0.32), transparent 60%); }
.cta-inner { position: relative; }
.cta h2 { color: #fff; font-size: clamp(30px, 5vw, 52px); }
.cta p { color: rgba(255,255,255,0.78); font-size: 17px; max-width: 32em; margin: 18px auto 30px; }
.cta-cta { display: flex; gap: 13px; justify-content: center; flex-wrap: wrap; }
.cta .btn-ghost { color: #fff; border-color: rgba(255,255,255,0.3); }
.cta .btn-ghost:hover { border-color: #fff; }
.cta .micro { margin-top: 22px; font-size: 13.5px; color: rgba(255,255,255,0.6); display: inline-flex; align-items: center; gap: 8px; }

/* ---- footer ---- */
.foot { padding: clamp(40px, 6vw, 64px) 0 40px; }
.foot-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 32px; }
.foot .logo { margin-bottom: 16px; }
.foot p { color: var(--mut); font-size: 14px; max-width: 24em; }
.foot h4 { font-family: var(--body); font-weight: 700; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); margin: 0 0 14px; }
.foot ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.foot ul a { color: var(--mut); font-size: 14.5px; transition: color .2s; }
.foot ul a:hover { color: var(--teal); }
.foot-bot { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: clamp(34px, 5vw, 52px); padding-top: 22px; border-top: 1px solid var(--line); font-size: 13px; color: var(--faint); }
.socials { display: flex; gap: 10px; }
.socials a { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--line); display: grid; place-items: center; color: var(--mut); transition: background .2s, color .2s, border-color .2s; }
.socials a:hover { background: var(--teal); color: #fff; border-color: var(--teal); }
.socials svg { width: 16px; height: 16px; }

/* ---- responsive ---- */
@media (max-width: 980px) {
  .foot-grid { grid-template-columns: 1fr 1fr; gap: 28px 24px; }
  .foot-grid > div:first-child { grid-column: 1 / -1; }
}
@media (max-width: 820px) {
  .nav, .phone { display: none; }
  .menu-toggle { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--paper); color: var(--teal); cursor: pointer; }
  .menu-toggle svg { width: 22px; height: 22px; }
  .hero-grid { grid-template-columns: 1fr; }
  .hero-fig { aspect-ratio: 16 / 12; order: -1; }
  .services { grid-template-columns: 1fr 1fr; }
  .stats { grid-template-columns: 1fr 1fr; gap: 24px 22px; }
  .locate { grid-template-columns: 1fr; }
  .map { min-height: 240px; }
}
@media (max-width: 560px) {
  .services { grid-template-columns: 1fr; }
  .stats { grid-template-columns: 1fr 1fr; }
  .trust-div { display: none; }
  .head .wrap { height: 66px; }
  .btn { padding: 12px 18px; font-size: 14.5px; }
  .hero-cta .btn { flex: 1 1 auto; justify-content: center; }
  .foot-grid { grid-template-columns: 1fr; }
  .foot-bot { justify-content: center; text-align: center; }
}
`.trim()

const HTML = `
<header class="head" id="head">
  <div class="wrap">
    <a class="logo" href="#top">
      <svg class="mark" viewBox="0 0 38 38" fill="none" aria-hidden="true">
        <rect width="38" height="38" rx="11" fill="#0e3b39"/>
        <path d="M19 9c-3.4 0-4.6 1.6-7 1.6-1.6 0-2.5 1.2-2.5 3.7 0 5.6 2.4 12.2 4.4 12.2 1.3 0 1.6-2.4 3.1-2.4h2c1.5 0 1.8 2.4 3.1 2.4 2 0 4.4-6.6 4.4-12.2 0-2.5-.9-3.7-2.5-3.7-2.4 0-3.6-1.6-5-1.6Z" fill="#fffdf8"/>
        <path d="M19 9c-3.4 0-4.6 1.6-7 1.6" stroke="#f0623f" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
      Northside Dental
    </a>
    <nav class="nav" aria-label="Primary">
      <a href="#services">Services</a>
      <a href="#why">Why us</a>
      <a href="#reviews">Reviews</a>
      <a href="#visit">Visit</a>
    </nav>
    <span class="spacer"></span>
    <a class="phone" href="tel:+15035550148">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
      (503) 555-0148
    </a>
    <a class="btn btn-primary" href="#visit">Book now</a>
    <button class="menu-toggle" id="menuToggle" aria-label="Open menu">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
</header>

<a id="top"></a>
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy reveal">
      <span class="eyebrow">Family &amp; cosmetic dentistry · Northeast Portland</span>
      <h1>Dental care that finally feels <span class="ac">calm.</span></h1>
      <p class="lede">Gentle, judgment-free dentistry for the whole family — same-week appointments, transparent pricing, and a team that actually remembers your name.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#visit">Book an appointment
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <a class="btn btn-ghost" href="#services">See our services</a>
      </div>
      <div class="trust-row">
        <div class="trust">
          <span class="big num">4.9
            <span class="stars" aria-label="4.9 out of 5 stars">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg>
            </span>
          </span>
          <span class="lab">1,240+ Google reviews</span>
        </div>
        <span class="trust-div"></span>
        <div class="trust"><span class="big num">18</span><span class="lab">Years in the neighborhood</span></div>
        <span class="trust-div"></span>
        <div class="trust"><span class="big num">9,500+</span><span class="lab">Smiles cared for</span></div>
      </div>
    </div>
    <figure class="hero-fig reveal" data-reveal="scale">
      <img src="assets/business-hero.jpg" alt="A bright, plant-filled dental office reception with a smiling team member">
      <div class="badge">
        <span class="av">DR</span>
        <div>
          <div class="t">Dr. Renata Alvarez</div>
          <div class="s">Lead dentist · DDS, 18 yrs</div>
        </div>
      </div>
    </figure>
  </div>
</section>

<section class="sec" id="services">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">What we do</span>
      <h2>Everything your smile needs, under one roof.</h2>
      <p>From routine cleanings to a brand-new smile — we keep referrals rare and visits comfortable.</p>
    </div>
    <div class="services">
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c-2.4 0-3.2 1.1-4.9 1.1-1.1 0-1.7.8-1.7 2.6 0 3.9 1.7 8.5 3.1 8.5.9 0 1.1-1.7 2.2-1.7h2.6c1.1 0 1.3 1.7 2.2 1.7 1.4 0 3.1-4.6 3.1-8.5 0-1.8-.6-2.6-1.7-2.6-1.7 0-2.5-1.1-4.9-1.1Z"/></svg>
        </div>
        <h3>Checkups &amp; cleanings</h3>
        <p>Thorough, low-stress hygiene visits with digital X-rays and a same-day plan you'll actually understand.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.1 4.5.5-3.4 3 1 4.4L12 16.9 8 17l1-4.4-3.4-3 4.5-.5L12 3Z"/><path d="M6 20h12"/></svg>
        </div>
        <h3>Cosmetic &amp; whitening</h3>
        <p>Veneers, bonding, and pro whitening — natural-looking results designed around your face, not a template.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="6" width="14" height="9" rx="2"/><path d="M9 6V4h6v2M8 19h8M12 15v4"/></svg>
        </div>
        <h3>Clear aligners</h3>
        <p>Invisible orthodontics with at-home scans and check-ins — straighter teeth without the metal-mouth years.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M12 3c-2 2-3 4-3 7s1 5 3 7M12 3c2 2 3 4 3 7s-1 5-3 7"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <h3>Implants &amp; crowns</h3>
        <p>Same-day crowns milled in-house and durable implants that look, feel, and chew like the real thing.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13a9 9 0 0 1 18 0"/><path d="M3 13v3a2 2 0 0 0 2 2h1v-5M21 13v3a2 2 0 0 1-2 2h-1v-5"/><path d="M12 18v2a2 2 0 0 0 2 2h2"/></svg>
        </div>
        <h3>Kids &amp; teens</h3>
        <p>Friendly first visits, sealants, and a no-shame approach that turns nervous kids into easy patients.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
      <article class="svc reveal">
        <div class="svc-ic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 4.5C19 16.5 12 21 12 21Z"/></svg>
        </div>
        <h3>Emergency care</h3>
        <p>Knocked-out tooth or sudden pain? Call us — we hold same-day slots open for urgent care every weekday.</p>
        <span class="more">Learn more <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </article>
    </div>
  </div>
</section>

<section class="sec" id="why" style="padding-top:0">
  <div class="wrap">
    <div class="band reveal" data-reveal="scale">
      <div class="band-head">
        <div>
          <span class="eyebrow">Why neighbors choose us</span>
          <h2>Care you can feel good about.</h2>
        </div>
        <p>We invest in gentle technology and an unhurried chair-side manner — because dental visits should be the easy part of your week.</p>
      </div>
      <div class="stats">
        <div class="stat"><div class="n num">98<small>%</small></div><div class="l">Patients who'd recommend us to a friend</div></div>
        <div class="stat"><div class="n num">2<small>day</small></div><div class="l">Average wait for a new-patient appointment</div></div>
        <div class="stat"><div class="n num">0<small>%</small></div><div class="l">Financing available on treatment plans</div></div>
        <div class="stat"><div class="n num">12</div><div class="l">Insurance plans accepted in-network</div></div>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="reviews" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head center reveal">
      <span class="eyebrow" style="justify-content:center">Loved by the neighborhood</span>
      <h2>What our patients say.</h2>
      <p>Real reviews from real Northeast Portland families.</p>
    </div>
    <div class="tcarousel reveal">
      <div class="ttrack" id="ttrack">
        <article class="tcard">
          <span class="stars" aria-label="5 out of 5 stars">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg>
          </span>
          <p class="quote">I used to dread the dentist. Dr. Alvarez talked me through every step, never made me feel bad about the gap since my last visit, and the cleaning was painless. I've already booked my whole family.</p>
          <div class="tperson"><span class="av" style="background:#0e3b39">MK</span><div><div class="nm">Marcus Kim</div><div class="rl">Patient · 2 years</div></div></div>
        </article>
        <article class="tcard">
          <span class="stars" aria-label="5 out of 5 stars">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg>
          </span>
          <p class="quote">My 7-year-old asks when she gets to go back. They turned what used to be a meltdown into something she looks forward to — and they texted me a reminder so I didn't have to chase the appointment.</p>
          <div class="tperson"><span class="av" style="background:#f0623f">PT</span><div><div class="nm">Priya Tran</div><div class="rl">Parent of two patients</div></div></div>
        </article>
        <article class="tcard">
          <span class="stars" aria-label="5 out of 5 stars">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z"/></svg>
          </span>
          <p class="quote">I cracked a molar on a Friday and they fit me in within two hours. Same-day crown, fair price, no upsell. After years of feeling like a number, this finally feels like a real neighborhood practice.</p>
          <div class="tperson"><span class="av" style="background:#18514d">JB</span><div><div class="nm">Jordan Bell</div><div class="rl">Patient · 4 years</div></div></div>
        </article>
      </div>
      <div class="tnav">
        <button id="tprev" aria-label="Previous review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <div class="tdots" id="tdots" role="tablist" aria-label="Choose review"></div>
        <button id="tnext" aria-label="Next review"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
    </div>
  </div>
</section>

<section class="sec" id="visit" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Drop by</span>
      <h2>Hours &amp; location.</h2>
      <p>Free parking out front, and we're a two-minute walk from the Alberta streetcar stop.</p>
    </div>
    <div class="locate reveal" data-reveal="scale">
      <div class="map" aria-hidden="true">
        <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice">
          <rect width="600" height="420" fill="none"/>
          <g stroke="#9bbab2" stroke-width="2" fill="none" opacity="0.7">
            <path d="M-20 90 H620 M-20 220 H620 M-20 330 H620"/>
            <path d="M120 -20 V440 M300 -20 V440 M460 -20 V440"/>
          </g>
          <path d="M-20 155 C140 150 180 250 300 250 S520 200 620 240" stroke="#e9efe9" stroke-width="22" fill="none" stroke-linecap="round"/>
          <path d="M-20 155 C140 150 180 250 300 250 S520 200 620 240" stroke="#cdded7" stroke-width="3" fill="none" stroke-dasharray="2 12" stroke-linecap="round"/>
          <g fill="#b6cfc7" opacity="0.85">
            <rect x="40" y="110" width="60" height="34" rx="4"/>
            <rect x="150" y="60" width="80" height="40" rx="4"/>
            <rect x="350" y="290" width="90" height="46" rx="4"/>
            <rect x="480" y="120" width="70" height="38" rx="4"/>
            <rect x="60" y="280" width="74" height="40" rx="4"/>
          </g>
          <g transform="translate(300 196)">
            <ellipse cx="0" cy="52" rx="20" ry="6" fill="rgba(14,59,57,0.18)"/>
            <path d="M0 50 C-22 18 -22 -2 -22 -14 A22 22 0 1 1 22 -14 C22 -2 22 18 0 50Z" fill="#f0623f"/>
            <circle cx="0" cy="-13" r="9" fill="#fffdf8"/>
          </g>
        </svg>
      </div>
      <div class="hours-card">
        <h3>Northside Dental</h3>
        <div class="addr">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>1428 NE Alberta Street, Suite 200<br>Portland, OR 97211</span>
        </div>
        <table class="htable">
          <tbody>
            <tr class="today"><td>Monday</td><td>8:00 – 5:00</td></tr>
            <tr><td>Tuesday</td><td>8:00 – 5:00</td></tr>
            <tr><td>Wednesday</td><td>9:00 – 6:00</td></tr>
            <tr><td>Thursday</td><td>8:00 – 5:00</td></tr>
            <tr><td>Friday</td><td>8:00 – 2:00</td></tr>
            <tr><td>Sat — Sun</td><td><span class="closed">Closed</span></td></tr>
          </tbody>
        </table>
        <a class="btn btn-dark" href="#visit" style="margin-top:22px;width:100%;justify-content:center">Get directions</a>
      </div>
    </div>
  </div>
</section>

<section class="sec" style="padding-top:0">
  <div class="wrap">
    <div class="cta reveal" data-reveal="scale">
      <div class="cta-inner">
        <span class="eyebrow" style="color:#f2a48f;justify-content:center">Ready when you are</span>
        <h2>Let's get you in the chair — comfortably.</h2>
        <p>New patients welcome. Book online in under a minute, or call and a real human will pick up.</p>
        <div class="cta-cta">
          <a class="btn btn-primary" href="#visit">Book online</a>
          <a class="btn btn-ghost" href="tel:+15035550148">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
            (503) 555-0148
          </a>
        </div>
        <div class="micro">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Most major insurance accepted · 0% financing available
        </div>
      </div>
    </div>
  </div>
</section>

<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="#top">
          <svg class="mark" viewBox="0 0 38 38" fill="none" aria-hidden="true">
            <rect width="38" height="38" rx="11" fill="#0e3b39"/>
            <path d="M19 9c-3.4 0-4.6 1.6-7 1.6-1.6 0-2.5 1.2-2.5 3.7 0 5.6 2.4 12.2 4.4 12.2 1.3 0 1.6-2.4 3.1-2.4h2c1.5 0 1.8 2.4 3.1 2.4 2 0 4.4-6.6 4.4-12.2 0-2.5-.9-3.7-2.5-3.7-2.4 0-3.6-1.6-5-1.6Z" fill="#fffdf8"/>
          </svg>
          Northside Dental
        </a>
        <p>Gentle family &amp; cosmetic dentistry on NE Alberta Street. Caring for Northeast Portland smiles since 2008.</p>
      </div>
      <div>
        <h4>Practice</h4>
        <ul><li><a href="#services">Services</a></li><li><a href="#why">Why us</a></li><li><a href="#reviews">Reviews</a></li><li><a href="#visit">Hours &amp; location</a></li></ul>
      </div>
      <div>
        <h4>Patients</h4>
        <ul><li><a href="#visit">Book online</a></li><li><a href="#visit">New patient forms</a></li><li><a href="#visit">Insurance</a></li><li><a href="#visit">Financing</a></li></ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul><li><a href="tel:+15035550148">(503) 555-0148</a></li><li><a href="mailto:hello@northsidedental.com">hello@northsidedental.com</a></li><li><a href="#visit">1428 NE Alberta St</a></li></ul>
      </div>
    </div>
    <div class="foot-bot">
      <span>© 2008–2026 Northside Dental · Dr. Renata Alvarez, DDS</span>
      <div class="socials">
        <a href="#top" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
        <a href="#top" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V7c0-1 .5-1.5 1.5-1.5H17V2.5h-2.5C12 2.5 11 4 11 6.5V9H9v3h2v9.5h3V12h2.2l.3-3H14Z"/></svg></a>
        <a href="#top" aria-label="Google reviews"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.2c0 5-3.5 8.3-8.7 8.3A8.5 8.5 0 1 1 18 5.4l-2.6 2.5A4.9 4.9 0 1 0 17 13H12.3"/></svg></a>
      </div>
    </div>
  </div>
</footer>
`.trim()

const JS = `
// Sticky-header shadow on scroll
(function () {
  var head = document.getElementById('head');
  if (head) {
    var onScroll = function () { head.classList.toggle('stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();

// Mobile menu toggle — smooth-scrolls to the services section as a simple jump-to
(function () {
  var t = document.getElementById('menuToggle');
  if (t) t.addEventListener('click', function () {
    var el = document.getElementById('services');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
})();

// Testimonials carousel — responsive: shows 3 cards on desktop, 1 on phone.
(function () {
  var track = document.getElementById('ttrack');
  var prev = document.getElementById('tprev');
  var next = document.getElementById('tnext');
  var dotsWrap = document.getElementById('tdots');
  if (!track || !prev || !next || !dotsWrap) return;
  var cards = Array.prototype.slice.call(track.children);
  var index = 0, timer = null;

  function perView() { return window.innerWidth <= 820 ? 1 : 3; }
  function maxIndex() { return Math.max(0, cards.length - perView()); }

  function buildDots() {
    dotsWrap.innerHTML = '';
    var pages = maxIndex() + 1;
    for (var i = 0; i < pages; i++) {
      var d = document.createElement('button');
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Go to review ' + (i + 1));
      (function (n) { d.addEventListener('click', function () { go(n, true); }); })(i);
      dotsWrap.appendChild(d);
    }
  }

  function render() {
    if (index > maxIndex()) index = maxIndex();
    var card = cards[0];
    var step = card ? (card.getBoundingClientRect().width + 20) : 0;
    track.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
    track.style.transform = 'translateX(' + (-index * step) + 'px)';
    var dots = dotsWrap.children;
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === index);
  }

  function go(n, stop) {
    var m = maxIndex();
    index = n < 0 ? m : (n > m ? 0 : n);
    if (stop) restart();
    render();
  }
  function restart() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () { go(index + 1); }, 6000);
  }

  prev.addEventListener('click', function () { go(index - 1, true); });
  next.addEventListener('click', function () { go(index + 1, true); });

  var rt = null;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { buildDots(); render(); }, 150);
  });

  buildDots();
  render();
  restart();
})();

// Scroll-reveal fallback (host controller also handles .reveal; this is harmless if it already ran)
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
})();
`.trim()

export const businessHome: Template = {
  id: 'business-home',
  kind: 'page',
  name: 'Local Business',
  tagline: 'A trustworthy local-business site with testimonials',
  categories: ['Business'],
  audiences: ['small-business', 'local', 'services'],
  description:
    'A warm, trustworthy homepage for a real local business (sampled as a neighborhood dental practice). It has a sticky header with phone + "Book now", a photo hero with a value prop and a rating/years/clients trust row, an SVG-icon services grid, a teal stats band, a self-running testimonial carousel, an hours-and-location card with a hand-drawn SVG map and pin, a booking CTA, and a clean footer. Deep teal + warm sand with a single coral accent; fully responsive and built entirely from CSS/SVG.',
  fonts: {
    display: 'Fraunces',
    body: 'Plus Jakarta Sans',
    links: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    ],
  },
  stageBg: '#f6f2ea',
  notes:
    'Rebrand by editing the business name (search "Northside Dental"), the logo SVG mark in the header/footer, the phone number ("(503) 555-0148" and the tel: hrefs), and the address/hours in the Hours & Location card. Palette knobs live in :root — `--teal` is the brand color (stats band, dark buttons, map roads), `--accent` (coral) is the single accent used on CTAs, stars-adjacent highlights, the map pin and active dots; `--bg`/`--sand`/`--paper` are the warm neutrals. The hero photo is assets/business-hero.jpg over a teal gradient fallback on .hero-fig — swap the file or recolor the gradient. Services are .svc cards (icon + title + one-liner); add/remove by copying a card. Stats are the four .stat blocks in the band. Testimonials are .tcard articles inside #ttrack — the carousel auto-paginates (3-up desktop, 1-up phone) with dots; change copy/initials/avatar color inline. To turn the auto-advance off, remove the restart() call in the JS. Every figure uses tabular-nums (.num).',
  assets: ['business-hero.jpg'],
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#f6f2ea',
  },
}
