# Product Brief — style guide

Crisp, modern SaaS product deck for PRDs, specs, reviews, and roadmaps. The bundled
sample is a complete 18-slide PRD for a new "instant onboarding" feature — tailor the
feature, owner, metrics, scope, and risks to your own.

- Palette: near-white `#fafafb`, ink `#0d0f15`, indigo `#5b5bd6` (primary accent),
  sky-blue `#0ea5e9` (secondary, for "later"/P1 signals), muted slate `#6b7280`.
  ONE confident indigo accent — no gradients, no rainbow.
- Type: display + body both **General Sans** (Fontshare), mono eyebrows/labels
  **Space Mono**. Mono is the signature: every `.kicker`, card tag, and table chip
  is monospace.
- Imagery: `product-brief-cover.jpg` (frosted-glass product composition — cover &
  close, full-bleed), `product-brief-fig.jpg` (abstract onboarding-checklist mock —
  the concept `.split`). Both crop cleanly at any orientation.
- Bespoke (`decoration`): `.meta` mono document line (PRD/owner/status/target) on the
  cover; numbered `.divider`/`.divider-num`/`.divider-title`/`.divider-rule` section
  slabs; `.spec`/`.scard` spec cards with a mono `.scard-tag` (also drop them inside
  `.flow` for the user journey); `.colpair` + `.colhd` (`.is-out`) goals-vs-non-goals
  split; `.pillv` (`.in`/`.out`/`.later`) scope status pills; `.prio` (`.p0`/`.p1`/`.p2`)
  priority/likelihood chips; the indigo `.callout`/`.callout-k`; `.legend` beside the donut.
- Shared used: `.steps`, `.stats`, `.bars`, `.flow`, `.timeline`, `.donut`, `.table`,
  `.bullets`, `.quote`, `.split`, `.full-bleed`, `.runner` footer on content slides.
- Arc: cover → overview → problem (who has it) → evidence (stat row) → funnel drop-off
  (bars) → goals & non-goals (colpair) → §The solution → concept (split) → user flow
  (flow) → key requirements (spec cards) → scope in/out (table + pillv) → §How we measure
  → success metrics (donut + legend + guardrail) → milestones (timeline) → risks & open
  questions (table + prio) → user quote → next steps close.
- Density: reading-first. Keep numbers tabular, mono labels short and uppercase, one
  idea per slide, generous whitespace. Pin the `.runner` (brand left, section right)
  on every content slide for system cohesion.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
