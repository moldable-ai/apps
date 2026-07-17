# Open House — style guide

Quiet-luxury listing presentation a buyer can _explore_. The bundled sample is an
18-slide private showing for a fictional 1926 craftsman ("24 Alder Lane") — swap the
address, photos, rooms, and numbers. It demonstrates the deck runtime used for a
customer pitch: the audience touches the deck, the deck answers.

- Palette: warm ivory `#f7f4ec`, ink-green `#23281f`, muted `#78776a`, ONE pine
  accent `#2e5941` with brass `#a9853e` for eyebrows/badges/brass moments. Positive
  `#2f6e4f`, negative `#a23b2e`. No gradients; sharp 4px corners; hairlines.
- Type: **DM Serif Display** for display (weight 400 — it carries the estate voice),
  **Karla** for everything else. Kickers are Karla 600 at 0.3em tracking.
- Imagery: dusk exterior `open-house-cover.jpg` (cover + close), living room
  (`-living`), kitchen (`-kitchen`, portrait — used in a split), garden (`-garden`,
  full-bleed). Editorial interiors-magazine mood, ivory/pine/brass palette.
- Interactive (runtime.js — keep `data-deck-interactive` on the widget roots):
  - **Floor-plan explorer** `.fp` — SVG rooms (`[data-room]`, focusable) + detail
    panel + Main/Upper `[data-floor]` chips. Room copy lives in the `ROOMS` map in
    runtime.js; keep ids in sync with the SVG.
  - **Payment calculator** `.calc` — price/down/rate sliders + `[data-term]` 15/30
    toggle → monthly P&I, loan, lifetime interest (all local math).
  - **Neighborhood map** `.map` — `[data-layer]` chips toggle SVG pin groups and the
    walking-time list.
  - Click-builds on the calculator slide (`data-build` notes + a `.badge`
    `data-deck-advance` button).
- Bespoke decoration: `.estate-frame` (double hairline over cover photos),
  `.price` lockup, `.badge`, `.note/.note-k/.note-t/.note-d`, `.tour/.tour-row`
  (roman-numeral agenda), `.divider*`, `.chip-row` control chips, plus the `.fp-*`,
  `.calc-*`, `.map-*/.poi-*` widget kits.
- Shared used: `.stats` (specs), `.table` (comparables, `.row-em` on the subject
  home), `.bars` ($/sq ft trend), `.timeline` (offer→keys), `.quote`, `.split`,
  `.hero`, `.full-bleed`.
- Arc: cover → at a glance → the hour → §The home → living → kitchen → floor plan →
  garden → §The numbers → calculator → comparables → market → §The neighborhood →
  map → process timeline → sellers' quote → offer advice → close.

## Mobile / responsive

Auto-reflows on phones; the bespoke widgets carry a
`@media (max-width: 640px) { html.deck-can-flow … }` block that stacks `.fp`,
`.calc`, and `.map` to one column and rescales the price/panel type. If you change
widget layouts or hardcoded sizes, update that block and re-verify at a true ~390px
viewport (see AUTHORING.md).

## Durable persistence

Calculator inputs, selected room/floor, and map layers use
`window.moldableState('open-house:v1')`. The local apps persist to the active
workspace filesystem; the published artifact host persists per browser. A
buyer's numbers survive desktop app restarts and hosted-link revisits.
Thumbnail renders never read or write state.
