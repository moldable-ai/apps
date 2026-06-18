# Sprint Review — style guide

Crisp, engineering-room deck for a two-week product sprint demo and review. The
bundled sample is a complete 18-slide review of "Sprint 24" — tailor the sprint
number, squad, features, and numbers.

- Palette: near-black `#0c0c0d` background, off-white text `#f4f5f1`, muted
  `#8b8d86`, a single lime accent `#84cc16` (also used for positive deltas). A
  warm red `#f06d5a` carries the rare negative/blocker. No gradients, no second
  brand color — restraint is the look.
- Type: display **Sora** (700), body **Inter**, accents/kickers in **JetBrains
  Mono** (`--mono`). Kickers, ticket tags, URLs, and section indices are mono so
  the deck reads like a build log.
- Imagery: `sprint-review-cover.jpg` (dark product-UI abstract — cover + close)
  and `sprint-review-product.jpg` (a product/screenshot-style figure — used both
  inside the `.frame` chrome mock and the Feature B `.split`).

## Signature decoration (when to use it)

- `.frame` + `.frame-bar`/`.frame-dots`/`.frame-url`/`.frame-shot` — a browser/app
  **screenshot chrome mock** around a demo image. Use on the Feature A slide; swap
  the `.frame-url` to the demoed screen.
- `.chip.up`/`.chip.down`/`.chip.flat` — **metric delta chips** with ▲/▼/– glyphs.
  Pair with `.dtile` metric tiles on the impact slide.
- `.shiplist` + `.ship`/`.ship-box`/`.ship-t`/`.ship-d`/`.ship-tag` — the boxed
  **shipped checklist** (two-column), one row per shipped story with its ticket tag.
- `.verdict.hit` — the **goal verdict banner** ("Goal hit"). Drop on the sprint-goal slide.
- `.dtile`/`.dtile-num`/`.dtile-label` — metric tile that holds a number + a delta chip.
- `.risk`/`.risk.warn` — top-ruled **blocker/watch callouts** (red vs amber) for risks.
- `.divider`/`.divider-num`/`.divider-title`/`.divider-rule` — mono-indexed section breaks.
- `.callout`/`.callout-k` — lime-ruled "under the hood / read" note. `.status` pills (on/warn/off) for tables.

## Shared vocabulary used

`.bars` (burndown + velocity), `.table` (quality scorecard with `.status`),
`.flow` (carry-over chain), `.stats`, `.steps` (next plan), `.split`/`.media`,
`.full-bleed`, `.quote`, `.runner` footer (squad left, section right).

## Story arc

cover → sprint goal + verdict → agenda → what shipped (`.shiplist`) →
§Demo → Feature A (`.frame` + bullets) → Feature B (`.split`) → impact (`.dtile` + `.chip`) →
§The numbers → burndown (`.bars`) → velocity (`.stats`) → quality (`.table`) → carry-over (`.flow`) →
§Next → Sprint 25 plan (`.steps`) → risks/blockers (`.risk`) → team quote → close.

## Density notes

Keep numbers tabular and small (mono ticket tags, mono URLs). Make ship/cut and
hit/miss decisions explicit — a sprint review is a status, not a pitch. One idea
per slide; let the lime accent mark only what changed.
