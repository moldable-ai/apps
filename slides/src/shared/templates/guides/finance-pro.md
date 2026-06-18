# Finance Pro — style guide

Sober, authoritative light deck for board and investor financial reviews. The
bundled sample is a complete 17-slide CFO quarterly report — tailor the company,
periods, and numbers. Restrained color; let the figures carry it.

- Palette: white `#ffffff`, ink `#0e2236`, slate-muted `#5a6b7b`, deep-teal
  `#0d7a6f` (primary accent + positive deltas), navy `#123a6b` (secondary, used
  for big numerals), brick `#c0392b` (negative). Type: display **Fraunces** serif,
  body **IBM Plex Sans**, eyebrows + figures **IBM Plex Mono**.
- Numerics are tabular everywhere (`font-variant-numeric: tabular-nums`). Eyebrows
  are mono, uppercase, tracked.
- Imagery: `finance-pro-cover.jpg` (architectural glass-tower full-bleed, opens and
  closes the deck), `finance-pro-fig.jpg` (sober desk still-life, used for the CFO
  commentary split). Section breaks are clean white `.fdiv` dividers, not images.
- Bespoke: `.fdiv/.fdiv-num/.fdiv-title/.fdiv-rule/.fdiv-sub` section dividers;
  `.kband/.kcell/.kval/.klabel/.kdelta` (.up/.down/.flat) the hairline KPI dashboard
  with triangle delta chips; `.note/.note-k/.note-b` the left-ruled ledger callout
  for the headline read; `.trend` (.up/.down) small mono delta tag; `.legend*` rows
  for the segment donut; `.rgrid/.rcell/.rtag` (.med/.high) the risk grid with
  likelihood pills.
- Shared used: `.table` (`.num`/`.pos`/`.neg`/`.row-em`) for P&L, segments, cohorts,
  guidance; `.bars` for revenue; multi-segment `.donut`; `.stats` for unit economics;
  `.timeline` for initiatives; `.quote`/`.split` for commentary; `.cards` for the
  appendix; `.runner` footer on every content slide.
- Arc: cover → executive summary (KPI band) → revenue (.bars) → P&L (.table) →
  margins & unit economics (.stats) → §Segments → segment breakdown (.donut + table)
  → cohort retention (.table) → cash & runway → §Outlook → guidance (.table) →
  risks & sensitivities (.rgrid) → key initiatives (.timeline) → CFO commentary
  (.quote split) → appendix/definitions (.cards) → close.
- Density notes: P&L and guidance tables run wide (4–5 columns) — keep figures in
  parentheses for negatives and use `.row-em` only for subtotals/totals. The KPI
  band tops out at four cells; deltas read as YoY or vs-plan. Keep one idea per
  slide and the navy reserved for the largest numerals.
