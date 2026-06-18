# OKR Review — style guide

Structured quarterly OKR review for a leadership audience. The bundled sample is a
complete 17-slide "grade-the-quarter" deck — tailor the team, objectives, KRs, and
scores. Honest over rosy: show the amber and the red, and say why.

- Palette: ink `#161433`, muted `#6b6890`, on white `#ffffff`; primary indigo
  `#4338ca`; amber `#f59e0b` reserved for at-risk/milestone marks (never decoration).
  Status colors: green `#16a34a`, amber `#f59e0b`, red `#dc2626`.
- Type: display **Plus Jakarta Sans** (700/800 for objectives + dividers), body
  **Inter**, mono **JetBrains Mono** — every score, range, and KR value is mono +
  tabular. Reference via `var(--display)/var(--body)/var(--mono)`.
- Imagery: `okr-review-cover.jpg` — abstract indigo target rings + progress meters
  with amber milestone dots on off-white. Used for cover and close (`.full-bleed`).
- Scoring convention: every objective and KR is graded **0.0–1.0** (0.7 = the stretch
  target). Keep all grades in this convention.
- Bespoke decoration:
  - `.obj` objective card — `.obj-head` splits `.obj-meta` (`.obj-owner`, `.obj-title`,
    `.scale` + `.conf`) from `.obj-donut` (a `.donut` set to `--p` = score×100). Body is
    `.krs` of `.kr` rows: `.kr-label` / `.kr-track`>`.kr-fill` / `.kr-val`. Recolor the
    fill with `.kr-fill.amber` or `.kr-fill.red` when a KR is off track; for a red
    objective, tint the donut with `style="--p:38;--accent:#dc2626"`.
  - `.rag green|amber|red` — RAG status pills (dot + label).
  - `.scale` — the 0.0–1.0 scoring chip (`.v` value + `.l` label); `.scaleband`/`.scalecard`
    for the "how to read this" legend.
  - `.conf` — confidence chip with four `.dot`s (add `.on` to fill).
  - `.prop`/`.pcard` — proposed next-quarter objective cards (indigo left rule).
  - `.divider*` section breaks; `.callout` (+`.warn` for amber) risk callouts.
- Shared used: `.stats`, `.bars`, `.table` (`.row-em`), `.checks`, `.steps`, `.quote`,
  `.donut`, `.full-bleed`, `.runner` on every content slide (`Northwind` left, section right).
- Arc: cover → how to read this (scoring scale) → quarter at a glance (`.stats`) →
  §Objectives → Objective 1 (green) → Objective 2 (green) → Objective 3 (red) →
  cross-cutting progress (`.bars`) → full scorecard (`.table`) → what we learned
  (`.checks`) → §Next quarter → proposed objectives (`.pcard`) → focus & bets (`.steps`)
  → risks (`.callout`) → leadership quote → close.
- Density: one objective per slide so the donut + KR rows breathe. Keep the runner on
  content slides, dividers and cover/quote/close clean.
