# Bold Founder — style guide

A near-black Series A VC pitch deck built to win the room. The bundled sample is a
complete 18-slide raise for a fictional AI-trust startup ("Oath") — tailor the
company, numbers, and ask. Design it like a product: one narrative thread, ruthless
restraint, confidence from scale and black space.

- Palette: near-black `#0a0b0f` (bg), off-white `#f5f6f8` (text), slate `#888fa3`
  (muted), ONE electric-blue accent `#5b8cff`. No gradient text, no gradient
  backgrounds — the only flourish is one whisper-quiet blue glow at the top of every
  slide (`radial-gradient` in `decoration`). Use the accent sparingly: a single key
  word via `.accent-text`, the `.accent-bar` / `.div-rule`, stat figures, chart fills.
- Type: display **Clash Display** (600), body **Satoshi** (Fontshare). Headlines run
  4–8 words at huge scale; bodies stay calm. Number the story in the eyebrow
  ("01 — The problem") and in `.div` section breaks.
- Imagery: `bold-founder-cover.jpg` — dark cinematic abstract, an electric-blue
  light-stream through a charcoal void; used full-bleed on cover and vision close.
  `bold-founder-product.jpg` — a sleek floating glass dashboard panel with cobalt
  edge-light; used full-bleed for the product reveal. Both ride the dark `--scrim`
  with bottom-anchored text.

## Signature decoration (the look — not in the shared kit)

- `.div` / `.div-num` / `.div-title` / `.div-rule` — numbered section dividers on
  near-black ("Section 01" + a huge title + a short blue rule).
- `.vcard` / `.vcard-n` / `.vcard-t` / `.vcard-d` — rule-topped, boxless value cards
  (a 2px blue top-rule, an eyebrow, a title, a line of body). Used for the agenda,
  the solution trio, and inside the `.flow` how-it-works steps.
- `.matrix` + `.quad` (`.us` for the winning quadrant) + `.m-axis-x` / `.m-axis-y` —
  a 2×2 competition matrix; the `Oath` quad is tinted blue.
- `.alloc` / `.alloc-row` / `.alloc-track` / `.alloc-bar` / `.alloc-pct` — use-of-funds
  allocation bars for "the ask".
- `.team` / `.member` / `.member-name` / `.member-role` / `.member-prev` — hairline
  founder chips.

## Shared components used

`.full-bleed`+`.scrim`, `.stats` (hairline-divided), `.bars` (growth), `.donut`
(TAM), `.table` (business model with `.pos` deltas), `.flow` (how it works),
`.timeline` (roadmap), `.bullets`, `.quote`/`.cite`, `.runner` footer on content slides.

## Story arc (18 slides)

cover → agenda → problem (stats) → why now → §The solution → solution(vcards) →
product(full-bleed) → how it works(flow) → §Momentum → traction(bars) →
market(donut TAM/SAM/SOM) → business model(table) → competition(2×2 matrix) →
team(chips+stats) → pull-quote → roadmap(timeline) → the ask(alloc bars) →
vision close(full-bleed). Keep numbers tabular, headlines short, the room leaning in.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
