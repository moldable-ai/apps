# Style: Data Dashboard

A dark "instrument panel" deck for a monthly product-metrics review — for product, growth, analytics, and leadership audiences. The sample deck reviews a fictional analytics product ("Halo Analytics") across two acts: **Growth** (revenue, users, retention, funnel, cohorts, engagement) and **Health** (reliability, segments, anomalies, next focus). Open and close on the same full-bleed network image; let the charts and tables carry the body.

## Story

Cover → executive KPI summary (tiles with deltas) → the read of the month → **SECTION: Growth** → MRR trend (.bars) → users + retention (.donut + legend) → activation funnel (.flow) → cohort retention (.table) → engagement (.stats) → pull-quote → **SECTION: Health** → reliability table (.table + status pills) → revenue by region (.bars) → anomalies & risks (callouts) → next focus (.steps) → close. 17 slides.

## Palette

- `--bg` deep slate `#0b1220`, stage letterbox `#070c16` (a touch darker).
- `--text` `#e8eef7`, `--muted` `#8294ad`.
- `--accent` cyan `#22d3ee` — the one confident accent (kickers, primary bars, donut lead, default callout).
- `--accent-2` lime `#a3e635` — the positive / secondary data color (up deltas, healthy status, "best month" bars).
- `--neg` fuchsia `#fb7185` — declines and degraded status. `#f5b942` amber for "watch".
- Restraint: no gradients, no rainbow. Most of every chart is dark; the cyan and lime read as precious points of light.

## Fonts

- Display **Space Grotesk** (600) — the geometric grotesk that gives the panel its technical confidence.
- Body **Space Grotesk** (400/500) — same family, lighter weights, for a tight system feel.
- Mono **IBM Plex Mono** — eyebrows (`--kicker-font`), delta chips, legend values, status pills, section numbers. Loaded via one Google Fonts `<link>`. Reference only through `var(--display)` / `var(--body)` / `var(--mono)`.

## Signature decoration

- **`.grid-bg`** — a faint hairline square grid pinned behind every content slide; the instrument-panel surface. Place it as the first child inside the slide.
- **`.kpi-grid` / `.kpi` / `.kpi-val` / `.kpi-label`** with **`.delta` (`.up` lime ▲ / `.down` fuchsia ▼ / `.flat` →)** — the headline dashboard tiles. Two rows of four reads as a real metrics board.
- **`.callout` (default cyan / `.warn` lime / `.crit` fuchsia)** with `.callout-k` / `.callout-t` / `.callout-d` — the signal/anomaly box. Use single callouts for "the read" and a `.cols-3` row of them for anomalies & risks.
- **`.legend` / `.legend-row` / `.legend-dot`** — a colored-dot legend with right-aligned mono values, paired with a multi-segment `.donut` or a `.bars` chart.
- **`.status` (`.ok` lime / `.watch` amber / `.bad` fuchsia)** — table status pills for reliability and scorecards.
- **`.spark`** — tiny inline trend bars inside a table cell (`<span class="spark"><i style="height:70%"></i>…</span>`).
- **`.divider` / `.divider-title` / `.divider-rule` / `.divider-meta`** — the section break: huge grotesk title, cyan rule, mono metadata line.
- **`.flow-step .stage` / `.stage-val` / `.stage-t` / `.stage-pct`** — funnel cards on the shared `.flow` arrow diagram.
- **`.ag` agenda rows** and the **`.lede`** intro line round out the system.

## Charts

Restyle the shared CSS charts to the data palette. For multi-segment donuts and bars, set explicit `conic-gradient` stops / per-bar `background` inline using `#22d3ee`, `#a3e635`, `#5eead4`, and `rgba(140,170,210,…)` for muted segments. Highlight the current/best period in lime. Keep all figures `font-variant-numeric: tabular-nums` (the base components and `.kpi-val` / `.stat-num` already do).

## Imagery

One generated image: `data-dashboard-cover.jpg` — an abstract dark data/network mesh, deep slate with sparse cyan and lime glints and a faint receding grid, no charts and no text. Used full-bleed on the cover and the close with the dark scrim. The deck is chart-heavy by design; the body relies on CSS charts and tables rather than photography.

## Density notes

Lead with numbers. Two `.kpi-grid` rows for the summary; dense `.table`s for cohorts and reliability; a `.stats` row for engagement. Keep prose to one `.lede` or `.lead` plus a single `.callout` per data slide — the panel should feel read, not narrated. Pin the `.runner` footer (brand left, section right) on every content slide for cohesion.
