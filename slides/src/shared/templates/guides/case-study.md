# Case Study — style guide

Warm, results-driven customer success story for sales and marketing. The bundled
sample is a complete 17-slide case study of "Rowan & Field × Cadence" — a corner
bakery that scaled to a four-location brand. Tailor the customer, story, and numbers.

- Palette: warm cream `#f5f1ea`, ink `#26211b`, soft muted `#8a8175`, ONE bright
  sky-blue accent `#0ea5e9`. White cards (`#fff`) on cream, hairline borders
  `#e6dfd2`. No gradients, no second accent — let the blue do all the pointing.
- Type: display **Instrument Serif** (Google), body **Inter** (Google). The serif
  is light and editorial — lean on big display sizes (150–176px) for headlines,
  section titles, and the pull-quote; keep Inter calm and tabular for data.

- Narrative arc (three labelled acts): cover (Customer × You) → customer at a
  glance → the headline result → §Challenge → what wasn't working (bars) → the
  stakes (stat row) → §Approach → what we did (steps) → the rollout (timeline) →
  §Result → outcomes (before/after pairs) → impact by the numbers (band + donut) →
  the customer's words (quote + figure split) → results scorecard (table) →
  what's next (checks) → close CTA.

- Signature decoration:
  - `.cs-section` / `.cs-phase` / `.cs-section-title` / `.cs-section-sub` — the
    Challenge / Approach / Result act dividers (rule-led "Act 0X" eyebrow + serif title).
  - `.cust` / `.cust-mark` / `.cust-name` / `.cust-meta` + `.fact`/`.fact-k`/`.fact-v`
    — the customer logo + context card with at-a-glance fact rows.
  - `.ba` / `.ba-cell` (`.before` dashed, `.after` solid) / `.ba-num` / `.ba-arrow`
    — before → after metric pairs.
  - `.band` / `.band-cell` / `.band-num` / `.band-label` — the full-width results stat band.
  - `.cs-quote` — oversized serif quotation-mark wrapper around a `.quote`.
  - `.note` / `.note-k` — soft blue inset callout for the headline insight.

- Shared used: `.bars` (the rising pain), `.steps` (what we did), `.timeline`
  (rollout), `.donut` (revenue mix), `.stats` (the stakes), `.table` (scorecard,
  `.pos` deltas), `.checks` (what's next), `.split`/`.full-bleed` for imagery.

- Imagery: `case-study-cover.jpg` — warm golden-hour bakery interior (cover + close
  full-bleed). `case-study-fig.jpg` — bright warm-neutral workspace still life (the
  customer-voice split). Art-directed to cream/oak with one sky-blue accent.

- Density: one idea per slide; lead with the customer, end every claim in a number.
  Keep the `.runner` footer on content slides (brand left, act/section right).

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
