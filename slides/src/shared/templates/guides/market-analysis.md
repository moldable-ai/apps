# Market Analysis — style guide

Analytic, evidence-led market study for strategy, marketing, and investment
audiences. The bundled sample is a complete 17-slide study of a residential
energy-management market — tailor the market, players, numbers, and the
recommendation.

- Palette: navy `#0c2340` (ground), amber `#f59e0b` (single accent, eyebrows &
  figures), white `#f4f7fb` text, slate `#93a4bd` muted. Positive `#34d399`,
  negative `#f87171`. No gradients, no second accent — let navy + amber carry it.
- Type: display & body both **IBM Plex Sans**; **IBM Plex Mono** for kickers,
  section indices, ranks, and tabular figures. Reference via `var(--display)` /
  `var(--body)` / `var(--mono)` — never hardcode.
- Imagery: `market-analysis-cover.jpg` — an abstract navy data-grid/market-map
  used full-bleed on the cover and the closing recommendation.
- Bespoke decoration:
  - `.tss` + `.tss-tam/.tss-sam/.tss-som/.tss-center/.tss-cap/.tss-val` — the
    concentric TAM/SAM/SOM rings (nested circles) for market sizing.
  - `.fcol` (+`.drive`/`.head`) with `.fcol-k`/`.fitem` — drivers-vs-headwinds
    columns (green top-rule for drivers, red for headwinds).
  - `.matrix` 2×2 positioning map: place players with inline `top:%;left:%` on
    `.matrix-pt`; add `.us` for the subject's open quadrant. `.axis-cap` labels
    the four axes.
  - `.legend`/`.legend-row`/`.legend-dot` beside `.bars` and `.donut`.
  - `.callout`/`.callout-k` amber headline-read box; `.divider*` section breaks;
    `.play-rank` mono rank on where-to-play cards.
- Shared used: `.bars`, `.donut`, `.flow`, `.table`, `.stats`, `.checks`,
  `.steps`, `.cards`, `.full-bleed`, `.runner`.
- Arc: cover → the question → executive takeaways → §Size → TAM/SAM/SOM rings →
  growth & trends (bars) → §Dynamics → drivers & headwinds → value chain (flow) →
  §Players → competitor landscape (table) → positioning map (2×2) → customer
  segments (donut + table) → §Implications → where to play (cards) → strategist
  quote → close (recommendation).
- Density: analytic and tabular. Keep figures in mono, every claim earns its
  place, and let the navy breathe — generous whitespace between charts.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
