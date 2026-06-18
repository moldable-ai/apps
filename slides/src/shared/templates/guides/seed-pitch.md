# Seed Pitch — style guide

Warm, optimistic, founder-personal seed-round deck. The bundled sample is a
complete 17-slide raise told in the founder's own voice — tailor the company,
numbers, and team. It is deliberately the _opposite_ of a dark bold-founder
pitch: cream and sunrise, calm and human.

- Palette: cream `#fff8f0` (bg), ink `#1c1917` (text), sunrise orange `#f97316`
  (the one accent), one teal `#14b8a6` for positives. Type: display **Sentient**
  serif, body **Satoshi** (both Fontshare).
- Imagery: `seed-pitch-cover.jpg` (warm sunrise abstract — cover + vision close),
  `seed-pitch-fig.jpg` (sunlit founding team — founder "why" full-bleed + product
  split). Section breaks are clean cream `.divider`s, never images.
- Bespoke: `.divider/.divider-num/.divider-title/.divider-sub/.divider-rule`;
  `.bigstate` oversized problem line (wrap one word in `<em>` for orange);
  `.fnote/.fnote-k/.fnote-sig` warm founder note; `.why/.why-card` "why now" tiles
  with a `.why-yr` year; `.tbars` traction-bars panel; `.legend/.legend-row/.legend-dot`
  for the market donut; `.team/.member/.face` headshots row (`.face.a/.b/.c/.d`
  cycle orange/teal/burnt/ink); the dark `.ask` callout (`.ask-amt` + `.unlock` list).
- Shared used: `.bars`, `.donut`, `.timeline`, `.table`, `.stats`, `.bullets`,
  `.steps`, `.split`, `.full-bleed`, `.quote`, `.pill`, `.runner`.
- Arc: cover → founder's why (full-bleed) → the problem (`.bigstate`) → why now
  (`.why` cards) → §The solution → solution (bullets + `.fnote`) → product (`.split`)
  → §Early signs → traction (`.tbars` bars) → market (`.donut` + legend) → business
  model (`.stats` + table) → team (`.team` row) → plan (`.timeline`) → founder quote
  → the ask (`.ask` callout) → vision close.
- Density notes: lean on cream whitespace; one idea per slide. Keep the founder
  voice first-person and warm. Numbers tabular. Never gradients, never more than
  the one orange accent (teal only for positive deltas / a single donut segment).
