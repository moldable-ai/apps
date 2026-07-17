// Style/template library engine.
//
// Every template implements ONE shared, studio-grade component vocabulary
// (.title, .kicker, .bullets, .cards, .metric, .media/.split/.full-bleed/.hero,
// .table, .stats, .quote, .section …) by setting design tokens (CSS variables).
// The agent learns the vocabulary once; each template "skins" it. A template =
// tokens + fonts + signature decoration + a rich sample deck. The deck theme and
// the coding guide handed to the chat agent are both derived from this data.
import type {
  ArtifactKind,
  DeckRuntime,
  DeckTheme,
  PageDoc,
  Slide,
} from '../types'

export interface TemplateFonts {
  display: string
  body: string
  mono?: string
  /** Stylesheet <link> hrefs (Fontshare / Google Fonts). */
  links: string[]
}

export interface Template {
  id: string
  name: string
  /** 'deck' = a slide deck; 'page' = a single full-page web artifact. */
  kind: ArtifactKind
  /** One-line vibe shown in the picker. */
  tagline: string
  /** Picker filter chips, e.g. ['Dashboard','Marketing']. First entry is primary. */
  categories: string[]
  /** Who it's for, e.g. ['founder', 'pitch']. Drives chat suggestions. */
  audiences: string[]
  description: string
  fonts: TemplateFonts
  /** Background color (deck letterbox / page backdrop / editor canvas). */
  stageBg: string
  /** Template-specific guidance appended to the coding guide (markdown). */
  notes?: string
  /** Bundled image asset filenames the sample references (under template-assets/). */
  assets?: string[]

  // ---- deck templates -----------------------------------------------------
  /** CSS custom properties applied to :root (deck templates). */
  tokens?: Record<string, string>
  /** Signature decoration CSS (slide background, flourishes, per-style tweaks). */
  decoration?: string
  /** Optional working behavior included with the sample deck. */
  runtime?: DeckRuntime
  /** A full sample deck demonstrating the style's range (deck templates). */
  sampleSlides?: Slide[]

  // ---- page templates -----------------------------------------------------
  /** A complete, self-contained sample page (page templates). */
  samplePage?: PageDoc
}

export interface TemplateMeta {
  id: string
  name: string
  kind: ArtifactKind
  tagline: string
  categories: string[]
  audiences: string[]
  description: string
  stageBg: string
  slideCount: number
}

/**
 * Shared component CSS — studio-grade and token-driven. Authored at the
 * 1920×1080 stage size. Tokens carry sensible fallbacks so a template only sets
 * what it wants to change.
 */
export const BASE_COMPONENTS_CSS = `
/* ===== SHARED COMPONENT VOCABULARY (token-driven, premium) ===== */
.slide {
  background: var(--bg, #ffffff);
  color: var(--text, #0f172a);
  font-family: var(--body, system-ui, sans-serif);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
::selection { background: color-mix(in srgb, var(--accent, #6366f1) 28%, transparent); }

/* ---- Layout ----
   Content is vertically centered in the frame by default so slides read as
   composed, not top-stacked. Use .pad.top to anchor to the top edge. */
.pad {
  position: absolute; inset: 0;
  padding: var(--pad-y, 110px) var(--pad-x, 130px);
  display: flex; flex-direction: column; gap: var(--stack, 30px);
  justify-content: center;
}
.pad.top { justify-content: flex-start; }
.pad.center { justify-content: center; }
.pad.end { justify-content: flex-end; }
.spacer { flex: 1 1 auto; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--col-gap, 84px); align-items: center; }
.cols-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--card-gap, 30px); }
.cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--card-gap, 30px); }
.cols-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--card-gap, 24px); }
.row { display: flex; align-items: center; gap: var(--gap, 28px); }
.wrap { flex-wrap: wrap; }

/* ---- Type ---- */
.kicker {
  font-family: var(--kicker-font, var(--body)); font-weight: 700;
  letter-spacing: var(--kicker-tracking, 0.24em); text-transform: uppercase;
  font-size: var(--kicker-size, 22px);
  color: var(--accent-2, var(--accent, #6366f1));
}
.kicker.lockup { display: inline-flex; align-items: center; gap: 18px; }
.kicker.lockup::before { content: ''; width: 54px; height: 2px; background: currentColor; opacity: 0.55; }
.display {
  font-family: var(--display); font-weight: var(--display-weight, 700);
  font-size: var(--display-size, 172px); line-height: 0.94; letter-spacing: -0.025em;
  color: var(--text); text-wrap: balance;
}
.title {
  font-family: var(--display); font-weight: var(--display-weight, 700);
  font-size: var(--title-size, 132px); line-height: 0.99; letter-spacing: -0.02em;
  color: var(--text); text-wrap: balance;
}
.headline {
  font-family: var(--display); font-weight: var(--headline-weight, 600);
  font-size: var(--headline-size, 84px); line-height: 1.03; letter-spacing: -0.015em;
  color: var(--text); text-wrap: balance;
}
.subhead { font-family: var(--display); font-weight: 600; font-size: var(--subhead-size, 52px); line-height: 1.1; letter-spacing: -0.01em; color: var(--text); }
.lead { font-family: var(--body); font-size: var(--lead-size, 40px); font-weight: var(--lead-weight, 400); line-height: 1.32; color: var(--muted, #64748b); max-width: 26ch; }
.body { font-family: var(--body); font-size: var(--body-size, 32px); line-height: 1.5; color: var(--text); max-width: 34ch; }
.fine { font-family: var(--body); font-size: var(--fine-size, 24px); line-height: 1.4; color: var(--muted, #94a3b8); }
.muted { color: var(--muted, #64748b); }
.accent-text { color: var(--accent, #6366f1); }
.grad-text {
  background: var(--text-grad, linear-gradient(100deg, var(--accent, #6366f1), var(--accent-2, var(--accent, #6366f1))));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

/* ---- Lists ---- */
.bullets { display: flex; flex-direction: column; gap: var(--gap, 26px); margin: 0; padding: 0; list-style: none; }
.bullet { display: flex; gap: 26px; align-items: flex-start; font-family: var(--body); font-size: var(--bullet-size, 36px); line-height: 1.32; color: var(--text); }
.bullet::before { content: ''; flex: none; width: 14px; height: 14px; margin-top: 0.5em; border-radius: var(--bullet-radius, 50%); background: var(--bullet-color, var(--accent, #6366f1)); }
.bullet b, .bullet strong { color: var(--text); font-weight: 700; }
.checks { display: flex; flex-direction: column; gap: var(--gap, 24px); margin: 0; padding: 0; list-style: none; }
.check { display: flex; gap: 24px; align-items: flex-start; font-family: var(--body); font-size: var(--bullet-size, 34px); line-height: 1.32; color: var(--text); }
.check::before { content: '\\2713'; flex: none; color: var(--accent, #6366f1); font-weight: 800; font-size: 0.92em; line-height: 1.45; }
.steps { counter-reset: step; display: flex; flex-direction: column; gap: var(--gap, 26px); margin: 0; padding: 0; list-style: none; }
.step { counter-increment: step; display: flex; gap: 30px; align-items: center; font-family: var(--body); font-size: var(--bullet-size, 34px); line-height: 1.3; color: var(--text); }
.step::before {
  content: counter(step, decimal-leading-zero); flex: none; width: 76px; height: 76px; border-radius: 50%;
  display: grid; place-items: center; font-family: var(--display); font-weight: 700; font-size: 30px;
  color: var(--accent, #6366f1); background: var(--chip-bg, var(--card-bg, rgba(0,0,0,0.04))); border: 1px solid var(--card-border, rgba(0,0,0,0.08));
}

/* ---- Cards ---- */
.cards { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: var(--card-gap, 30px); }
.card {
  background: var(--card-bg, rgba(0,0,0,0.025));
  border: 1px solid var(--card-border, rgba(0,0,0,0.08));
  border-radius: var(--radius, 20px);
  padding: var(--card-pad, 44px);
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: var(--card-shadow, none);
}
.card-num { font-family: var(--mono, var(--body)); font-size: 26px; color: var(--accent, #6366f1); letter-spacing: 0.06em; }
.card-title { font-family: var(--display); font-weight: 600; font-size: var(--card-title-size, 40px); line-height: 1.06; color: var(--text); }
.card-body { font-family: var(--body); font-size: var(--card-body-size, 28px); line-height: 1.4; color: var(--muted, #64748b); }

/* ---- Metrics & stats ---- */
.metric { font-family: var(--display); font-weight: 700; font-size: var(--metric-size, 124px); line-height: 1; letter-spacing: -0.02em; color: var(--accent, #6366f1); font-variant-numeric: tabular-nums; }
.metric-label { font-family: var(--body); font-size: 26px; color: var(--muted, #64748b); text-transform: uppercase; letter-spacing: 0.08em; }
.stats { display: flex; align-items: stretch; }
.stat { flex: 1; padding: 0 56px; display: flex; flex-direction: column; gap: 14px; }
.stat:first-child { padding-left: 0; }
.stat + .stat { border-left: 1px solid var(--card-border, rgba(0,0,0,0.1)); }
.stat-num { font-family: var(--display); font-weight: 700; font-size: var(--stat-size, 100px); line-height: 1; letter-spacing: -0.02em; color: var(--accent, #6366f1); font-variant-numeric: tabular-nums; }
.stat-label { font-family: var(--body); font-size: 26px; color: var(--muted, #64748b); line-height: 1.3; }
/* In a hairline column, headings/copy shouldn't keep their narrow cap. */
.stat .subhead { margin-bottom: 4px; }
.stat .body, .stat .lead { max-width: none; }

/* ---- Media / figures ---- */
.media {
  position: relative; overflow: hidden;
  border-radius: var(--media-radius, var(--radius, 18px));
  border: var(--media-border, 1px solid var(--card-border, rgba(0,0,0,0.08)));
  box-shadow: var(--media-shadow, 0 40px 90px -30px rgba(15,23,42,0.45));
  background: var(--card-bg, #eef);
}
.media > img { display: block; width: 100%; height: 100%; object-fit: cover; }
.caption { font-family: var(--body); font-size: 24px; color: var(--muted, #94a3b8); margin-top: 18px; }
.split { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: grid; grid-template-columns: 1fr 1fr; gap: var(--col-gap, 90px); align-items: stretch; }
.split.wide-media { grid-template-columns: 1fr 1.18fr; }
.split-text { display: flex; flex-direction: column; justify-content: center; gap: var(--stack, 28px); }
.split.reverse .split-text { order: 2; }
.split .media { height: 100%; }
.hero { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1.08fr; align-items: stretch; }
.hero.reverse { grid-template-columns: 1.08fr 1fr; }
.hero-text { padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: var(--stack, 28px); }
.hero .media, .hero .bleed { height: 100%; width: 100%; border-radius: 0; border: 0; box-shadow: none; }
.full-bleed { position: absolute; inset: 0; }
.full-bleed > .bleed { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.full-bleed > .scrim { position: absolute; inset: 0; background: var(--scrim, linear-gradient(180deg, rgba(8,10,18,0.10) 0%, rgba(8,10,18,0.78) 100%)); }
/* Keep .pad absolute/filling (from base) so .end anchors content to the bottom;
   just lift it above the image + scrim. */
.full-bleed > .pad { z-index: 1; }
.full-bleed .title, .full-bleed .display, .full-bleed .headline, .full-bleed .lead, .full-bleed .body { color: var(--bleed-text, #fff); }
.full-bleed .lead, .full-bleed .body { opacity: 0.92; }

/* ---- Table ---- */
.table { width: 100%; border-collapse: collapse; font-family: var(--body); font-size: var(--table-size, 30px); }
.table th { text-align: left; text-transform: uppercase; letter-spacing: 0.08em; font-size: 22px; font-weight: 600; color: var(--muted, #64748b); padding: 0 30px 22px; border-bottom: 2px solid var(--th-border, var(--text)); }
.table td { padding: 26px 30px; border-bottom: 1px solid var(--table-border, var(--card-border, rgba(0,0,0,0.1))); color: var(--text); font-variant-numeric: tabular-nums; }
.table tr:last-child td { border-bottom: 0; }
.table .num { text-align: right; }
.table .pos { color: var(--pos, #16a34a); }
.table .neg { color: var(--neg, #dc2626); }
.table .row-em td { font-weight: 700; }

/* ---- Simple charts (CSS-only) ---- */
.donut {
  position: relative; width: var(--donut-size, 300px); height: var(--donut-size, 300px);
  border-radius: 50%;
  background: conic-gradient(var(--accent, #6366f1) calc(var(--p, 60) * 1%), var(--track, rgba(0,0,0,0.08)) 0);
  display: grid; place-items: center;
}
.donut::before { content: ''; position: absolute; inset: 24%; border-radius: 50%; background: var(--donut-hole, var(--card-bg, #fff)); }
.donut-label { position: relative; font-family: var(--display); font-weight: 700; font-size: var(--donut-label-size, 60px); letter-spacing: -0.02em; color: var(--text); }
.bars { display: flex; align-items: flex-end; gap: var(--bar-gap, 30px); height: var(--bars-height, 340px); }
.bar { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.bar-fill { width: 100%; min-height: 8px; height: var(--h, 50%); border-radius: 12px 12px 0 0; background: var(--bar-fill, var(--accent, #6366f1)); position: relative; }
.bar-fill::before { content: attr(data-val); position: absolute; left: 0; right: 0; top: -46px; text-align: center; font-family: var(--display); font-weight: 700; font-size: 30px; color: var(--text); }
.bar-label { margin-top: 16px; font-family: var(--body); font-size: 24px; color: var(--muted, #64748b); text-align: center; }

/* ---- Diagrams: arrow-flow + timeline ---- */
.flow { display: flex; align-items: center; }
.flow-step { flex: 1; }
.flow-arrow { flex: 0 0 auto; width: 60px; display: grid; place-items: center; }
.flow-arrow::after { content: ''; width: 16px; height: 16px; border-top: 3px solid var(--accent, #6366f1); border-right: 3px solid var(--accent, #6366f1); transform: rotate(45deg); }
.timeline { display: flex; flex-direction: column; }
.tl-row { display: grid; grid-template-columns: 230px 1fr; gap: 48px; padding: 28px 0; border-top: 1px solid var(--card-border, rgba(0,0,0,0.1)); align-items: baseline; }
.tl-row:last-child { border-bottom: 1px solid var(--card-border, rgba(0,0,0,0.1)); }
.tl-when { font-family: var(--display); font-weight: 600; font-size: 40px; letter-spacing: -0.01em; color: var(--accent, #6366f1); }
.tl-what { font-family: var(--body); font-size: 30px; line-height: 1.35; color: var(--text); }
.tl-what b { font-weight: 700; }

/* ---- Quote ---- */
.quote { position: relative; font-family: var(--display); font-weight: var(--quote-weight, 500); font-size: var(--quote-size, 78px); line-height: 1.14; letter-spacing: -0.01em; color: var(--text); max-width: 24ch; text-wrap: balance; }
.cite { display: flex; align-items: center; gap: 18px; margin-top: 44px; }
.cite-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--accent, #6366f1); }
.cite-name { font-family: var(--body); font-weight: 700; font-size: 30px; color: var(--text); }
.cite-role { font-family: var(--body); font-size: 28px; color: var(--muted, #64748b); }

/* ---- Section divider ---- */
.section { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 22px; }
.section-num { font-family: var(--mono, var(--body)); font-weight: 600; font-size: 32px; color: var(--accent, #6366f1); letter-spacing: 0.12em; }
.section-title { font-family: var(--display); font-weight: var(--display-weight, 600); font-size: var(--section-size, 156px); line-height: 0.95; letter-spacing: -0.02em; color: var(--text); text-wrap: balance; }

/* ---- Accents ---- */
.logos { display: flex; align-items: center; gap: 64px; flex-wrap: wrap; }
.logo { font-family: var(--display); font-weight: 600; font-size: 38px; color: var(--muted, #94a3b8); letter-spacing: -0.01em; opacity: 0.85; }
.pill { display: inline-flex; align-items: center; gap: 10px; padding: 12px 26px; border-radius: 999px; background: var(--pill-bg, var(--card-bg, rgba(0,0,0,0.05))); border: 1px solid var(--card-border, rgba(0,0,0,0.08)); font-family: var(--body); font-weight: 600; font-size: 26px; color: var(--text); }
.tag { font-family: var(--mono, var(--body)); font-size: 22px; letter-spacing: 0.04em; color: var(--accent, #6366f1); text-transform: uppercase; }
.kbd { font-family: var(--mono, var(--body)); font-weight: 600; background: var(--card-bg, rgba(0,0,0,0.06)); border: 1px solid var(--card-border, rgba(0,0,0,0.12)); border-radius: 10px; padding: 4px 16px; font-size: 28px; color: var(--text); }
.rule { height: 2px; background: var(--rule-color, var(--card-border, rgba(0,0,0,0.14))); border: 0; width: 100%; }
.accent-bar { width: 96px; height: 6px; border-radius: 3px; background: var(--accent, #6366f1); }

/* ---- Running footer (deck cohesion — brand left, section right) ---- */
.runner {
  position: absolute; left: var(--pad-x, 130px); right: var(--pad-x, 130px); bottom: 54px;
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 22px; border-top: 1px solid var(--card-border, rgba(0,0,0,0.10));
  font-family: var(--body); font-size: 24px; color: var(--muted, #64748b);
}
.runner-brand { font-weight: 700; letter-spacing: 0.01em; color: var(--text); display: inline-flex; align-items: center; gap: 13px; }
.runner-brand::before { content: ''; width: 15px; height: 15px; border-radius: 4px; background: var(--accent, #6366f1); }
.runner-label { text-transform: uppercase; letter-spacing: 0.14em; font-size: 20px; }
`.trim()

/** The vocabulary doc handed to the agent. Same for every template. */
export const COMPONENT_VOCABULARY = `Compose every slide from this shared, premium class vocabulary (each template skins it — stay within it so slides re-skin cleanly):

LAYOUT
- \`.pad\` = full-slide padded flex column (add \`.center\` to vertically center, \`.end\` to bottom-align). \`.spacer\` pushes content apart.
- \`.two-col\`, \`.cols-2/.cols-3/.cols-4\`, \`.row\` (+ \`.wrap\`).

TYPE
- \`.kicker\` (eyebrow; add \`.lockup\` for a leading rule), \`.display\` (XXL hero), \`.title\` (hero h1), \`.headline\` (section h2), \`.subhead\`, \`.lead\` (intro paragraph), \`.body\`, \`.fine\` (caption-size), \`.muted\`, \`.accent-text\`, \`.grad-text\` (gradient key words).

LISTS
- Bullets: \`<ul class="bullets"><li class="bullet"><span>… <b>emphasis</b></span></li></ul>\`.
- Checklist: \`<ul class="checks"><li class="check"><span>…</span></li></ul>\`.
- Numbered: \`<ol class="steps"><li class="step"><span>…</span></li></ol>\` (auto 01/02/03 badges).

CARDS & DATA
- \`<div class="cards"><div class="card"><div class="card-num">01</div><div class="card-title">…</div><div class="card-body">…</div></div></div>\` (set \`style="--cols:2"\`).
- Metrics: \`<div class="metric">87%</div><div class="metric-label">…</div>\`. Stat row: \`<div class="stats"><div class="stat"><div class="stat-num">$48M</div><div class="stat-label">…</div></div>…</div>\`.
- Table: \`<table class="table"><thead><tr><th>…</th><th class="num">…</th></tr></thead><tbody><tr><td>…</td><td class="num">…</td></tr><tr class="row-em">…</tr></tbody></table>\` (use \`.num\` for figures, \`.pos\`/\`.neg\` for deltas).
- Charts (CSS-only): Donut \`<div class="donut" style="--p:68"><div class="donut-label">68%</div></div>\` (\`--p\` = percent). Bars \`<div class="bars"><div class="bar" style="--h:62%"><div class="bar-fill" data-val="$4.2M"></div><div class="bar-label">Q3</div></div>…</div>\` (\`--h\` = bar height %).
- Diagrams: arrow-flow \`<div class="flow"><div class="flow-step">…</div><div class="flow-arrow"></div><div class="flow-step">…</div></div>\`; timeline \`<div class="timeline"><div class="tl-row"><div class="tl-when">Q3</div><div class="tl-what">…</div></div>…</div>\`.

IMAGES (use relative \`assets/<file>\` paths; the deck ships with \`assets/sample.jpg\`)
- Split: a top-level slide layout — \`<div class="split"><div class="split-text"><div class="kicker">…</div><h2 class="headline">…</h2><p class="lead">…</p></div><figure class="media"><img src="assets/sample.jpg" alt=""></figure></div>\`. Add \`.reverse\` to put text on the right, \`.wide-media\` for a larger image.
- Hero (image bleeds to the edge): \`<div class="hero"><div class="hero-text">…</div><figure class="media"><img src="assets/sample.jpg" alt=""></figure></div>\` (\`.hero.reverse\` flips sides).
- Full-bleed: \`<div class="full-bleed"><img class="bleed" src="assets/sample.jpg" alt=""><div class="scrim"></div><div class="pad end"><div class="kicker">…</div><h1 class="title">…</h1></div></div>\` (text is white on a dark scrim — works on any image).
- Inline figure with caption: \`<figure class="media"><img …></figure><figcaption class="caption">…</figcaption>\`.

QUOTE / SECTION / ACCENTS
- Quote: \`<blockquote class="quote">…</blockquote><div class="cite"><span class="cite-dot"></span><span class="cite-name">…</span><span class="cite-role">…</span></div>\`.
- Section divider: \`<div class="section"><div class="section-num">02</div><div class="section-title">…</div></div>\`.
- \`.logos\`/\`.logo\`, \`.pill\`, \`.tag\`, \`.kbd\`, \`.rule\`, \`.accent-bar\` (a short accent underline under a hero line).
- Running footer (for a cohesive, "designed-as-a-system" deck): \`<div class="runner"><span class="runner-brand">Company</span><span class="runner-label">Section</span></div>\` — pin it on content slides; brand left, section/narrative-step right.
- A hairline-divided value row (cleaner than boxed cards): reuse \`.stats\` with \`.stat\` containing a \`.subhead\` + \`.body\` instead of numbers.

Add \`class="reveal"\` to elements that should animate in; set per-slide \`transition\` (fade/slide/zoom). Reference fonts/colors only through tokens (\`var(--display)\`, \`var(--accent)\`, …), never hardcoded. Only write bespoke CSS when a slide truly needs something outside this kit.

MOBILE / RESPONSIVE — decks MUST look great on phones (the published artifact is viewed on mobile). On a narrow viewport the deck auto-reflows: the fixed 1920×1080 stage becomes a tall, scrolling, full-width page (each slide a section, columns stacked, type/spacing scaled down). This is automatic for anything built from the vocabulary above, so:
- COMPOSE FROM THIS KIT — \`.two-col\`/\`.cols-2/3/4\`/\`.cards\` collapse to one column on phones automatically. For a CUSTOM grid, drive its columns with \`grid-template-columns: repeat(var(--cols, N), 1fr)\` so it collapses too.
- Size type/spacing through TOKENS (\`var(--title-size)\`, \`var(--pad-x)\`, …); the reflow re-scales those. Avoid hardcoded \`font-size: NNNpx\` on custom elements — it won't shrink on a phone.
- If you DO write bespoke decoration with hardcoded px (big custom titles, cards, charts, dividers), add a phone override at the END of the deck/template CSS so it scales down — and keep every such rule INSIDE the media query so desktop is untouched:
  \`@media (max-width: 640px) { html.deck-can-flow .yourBigTitle { font-size: min(40px, 11vw) !important; } html.deck-can-flow .yourRowFlow { flex-direction: column !important; } }\`
- Never let content exceed the slide width (wide tables already scroll horizontally). A slide that reads well at 1920 should reflow cleanly on a phone — verify at a true ~390px mobile viewport.`

/** Optional behavior contract for decks that should act like small web apps. */
export const DECK_RUNTIME_AUTHORING = `INTERACTIVE DECKS (opt in only when the content benefits):
- Put shared authored JavaScript in \`runtime.js\`; it runs after the deck controller and any HTTPS \`runtime.libs\` have loaded. Keep behavior data-driven and use delegated listeners so live slide edits continue to work.
- Mark any interactive region with \`data-deck-interactive\`. Links, buttons, inputs, selects, textareas, and contenteditable elements are protected automatically. Keyboard, wheel, swipe, and tap events inside these regions belong to the interaction instead of slide navigation.
- Listen for \`deck:slidechange\` when a slide becomes active and \`deck:slidepatch\` after the live editor replaces slide HTML. Re-initialize idempotently.
- Use \`data-build="1"\`, \`data-build="2"\`, … for staged reveals. Next/Space reveals the next build before advancing; Previous rewinds builds first. Add \`data-deck-advance\` to an explicit button when the slide should offer a click-to-reveal control.
- Add only the minimum CSP permissions needed: HTTPS origins in \`runtime.connectOrigins\` for fetch/WebSocket endpoints and \`runtime.frameOrigins\` for embeds. Leave both empty for local calculations, filters, charts, tables, and games.
- Static decks need no runtime. Prefer semantic HTML and CSS when JavaScript adds no real audience value.`

function rootCss(tokens: Record<string, string>): string {
  const entries = Object.entries(tokens)
  return `:root {\n${entries.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`
}

/** Derive the deck theme (fontLinks + css + stageBg) from a deck template. For
 * a page template the "theme" is just its fonts — the page owns its CSS. */
export function templateTheme(template: Template): DeckTheme {
  if (template.kind === 'page') {
    return {
      fontLinks: template.fonts.links,
      stageBg: template.stageBg,
      css: '',
    }
  }
  const baseTokens = template.tokens ?? {}
  const tokens: Record<string, string> = {
    '--slide-bg': baseTokens['--bg'] ?? '#ffffff',
    ...baseTokens,
  }
  return {
    fontLinks: template.fonts.links,
    stageBg: template.stageBg ?? baseTokens['--bg'],
    css: [rootCss(tokens), BASE_COMPONENTS_CSS, template.decoration ?? '']
      .filter(Boolean)
      .join('\n\n'),
  }
}

export function templateMeta(template: Template): TemplateMeta {
  return {
    id: template.id,
    name: template.name,
    kind: template.kind,
    tagline: template.tagline,
    categories: template.categories,
    audiences: template.audiences,
    description: template.description,
    stageBg: template.stageBg,
    slideCount: template.sampleSlides?.length ?? 0,
  }
}

/** The page-authoring contract handed to the chat agent for page artifacts. */
export const PAGE_AUTHORING = `A PAGE artifact is one self-contained, scrolling, responsive web page — you own the entire design (HTML + CSS + JS). It is NOT a slide deck. The document is built from three fields:
- \`page.html\` — the full <body> inner HTML.
- \`page.css\` — all page CSS (a thin reset is provided; your CSS comes after and wins).
- \`page.js\` — JavaScript that runs after the DOM is parsed (charts, a game loop, a 3D scene, interactions).
- \`page.fontLinks\` — Google/Fontshare stylesheet <link> hrefs (https).
- \`page.libs\` — optional external <script> srcs (https only, e.g. a pinned three.js CDN); they load before \`page.js\`.

PROVIDED FOR FREE (don't re-implement):
- A reset + sensible defaults. \`--page-bg\` is set from the artifact's background.
- Scroll-reveal: add \`class="reveal"\` (optionally \`data-reveal="left|right|scale"\`) to fade elements in as they enter the viewport.
- Scroll progress: \`var(--scroll)\` (0→1 down the page) and \`var(--scroll-y)\` (px) on :root, updated on scroll — use them for scroll-driven effects (parallax, progress bars).
- \`prefers-reduced-motion\` is respected automatically (reveals show instantly, animations are neutralized).

CRAFT BAR (this is a flagship — every page must look studio-grade):
- Real type system: load a distinctive display + text font via \`fontLinks\`; commit to a confident scale and tight tracking on headings.
- A committed palette and a cohesive visual language; generous spacing; intentional hierarchy. No generic Bootstrap/Tailwind-default look.
- Tasteful motion: scroll-reveals, hover states, micro-interactions — never gratuitous.
- Fully responsive: it must look great from 380px phones to wide desktops. Use clamp(), fluid grids, and media queries.
- Charts/visuals: hand-roll SVG or <canvas> (no chart libs needed); use tabular numerals for figures.

IMAGES: reference generated images by relative \`assets/<file>\` path (manage them in the Assets panel / via the images RPC). End every image prompt with "No text, no words, no letters, no logos."`

/** Build the markdown coding guide embedded into the chat system prompt. */
export function templateGuide(template: Template): string {
  const fonts = [
    `display **${template.fonts.display}**`,
    `body **${template.fonts.body}**`,
    template.fonts.mono ? `mono **${template.fonts.mono}**` : '',
  ]
    .filter(Boolean)
    .join(', ')

  if (template.kind === 'page') {
    return `# Page template: ${template.name}

${template.tagline} — for ${template.audiences.join(', ')}.

Fonts: ${fonts}. This template ships a complete sample page (\`page.html\` / \`page.css\` / \`page.js\`) — read it, mirror its structure, palette, and motion, and edit in place. Stay on-brand.

${PAGE_AUTHORING}
${template.notes ? `\n## ${template.name} specifics\n${template.notes}\n` : ''}
For small changes, edit the page with \`artifacts.page.text.replace { oldString, newString, replaceAll?, field? }\`; \`oldString\` must be unique across the page document unless \`replaceAll: true\`. Add \`field\` only to disambiguate. Use \`artifacts.page.set { html?, css?, js?, fontLinks?, libs?, background? }\` only when replacing an entire field, or \`artifacts.replace\` for a full rewrite.`
  }

  const tokenLines = Object.entries(template.tokens ?? {})
    .map(([k, v]) => `- \`${k}\`: ${v}`)
    .join('\n')

  return `# Style: ${template.name}

${template.tagline} — for ${template.audiences.join(', ')}.

Fonts: ${fonts}. Loaded via the deck's \`theme.fontLinks\`; reference them through the tokens below (\`var(--display)\` / \`var(--body)\` / \`var(--mono)\`), never hardcode font names.

## Design tokens (CSS variables on :root, already applied)
${tokenLines}

## Component vocabulary
${COMPONENT_VOCABULARY}

## Optional deck runtime
${DECK_RUNTIME_AUTHORING}
${template.notes ? `\n## ${template.name} specifics\n${template.notes}\n` : ''}
This deck includes sample slides built from these components — mirror their structure and density. Keep it on-brand; only write bespoke CSS when a slide truly needs it. Keep it mobile-friendly (see MOBILE / RESPONSIVE above): new slides should reflow on phones — compose from the kit, drive custom grids with \`var(--cols)\`, and if you add bespoke hardcoded-px decoration, give it a matching \`@media (max-width: 640px) { html.deck-can-flow … }\` override.`
}
