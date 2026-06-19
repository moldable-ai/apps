# Moodboard — style guide

A collage, editorial art-direction moodboard for a brand campaign. The bundled
sample is a complete 18-slide mood for a warm artisanal homeware brand,
"Maren & Field" — tailor the brand, keywords, palette names, and imagery. This
is a _feeling-first_ deck: copy is short and evocative, imagery and one serif
line carry each slide. It is NOT a data deck — keep numbers minimal.

- Palette: bone `#efe9e0` (ground), clay `#b85c38` (the ONE accent — used once,
  never twice), sage `#7d8471` (secondary/quiet), ink `#2b2825` (type + deepest
  shadow). Muted `#8a8276`. No gradients, no glow.
- Type: display **Spectral** serif (weight 500, with a characterful _italic_ for
  warmth) + body **Inter**. Lean on the Spectral italic in display lines via
  `<span class="ital">…</span>`; keep Inter for kickers, labels, captions, tables.
- Imagery: `moodboard-cover.jpg` (bone still-life flat-lay — cover, collage hero,
  composition hero, all `.full-bleed`/`.hero`), `moodboard-mood1.jpg` (clay +
  linen + sage material macro — collage tile, swatch chip), `moodboard-mood2.jpg`
  (curtain-and-light study — photography split, close). All `object-fit:cover`,
  crop cleanly at any orientation.
- Section breaks are quiet bone `.divider`s (`.divider-num/.divider-title/.divider-rule`),
  numbered in the eyebrow (01 — The visual world, 02 — Application).
- Signature decoration:
  - `.collage` — asymmetric offset 2×2 image grid (areas a/b/c/d); mix image
    `.tile` and solid `.tile.swatch` color blocks, label each with `.tile-cap`.
  - `.colorstory` + `.cchip` — the color-story chip row; set each chip's
    `background` + text `color` inline, with `.cchip-name/.cchip-hex/.cchip-role`.
  - `.swatches` + `.matswatch` (`.matchip` / `.matchip.img>img`, `.mat-name`,
    `.mat-desc`) — texture & material swatches.
  - `.keywords` + `.keyword` (`.fill` clay, `.sage`, `.ital`) — the keyword tags
    that define the feeling.
  - `.direction` (`.direction-k`/`.direction-t`) — the clay-ruled statement block.
  - Plus `.specimen` type specimen, `.dd-yes`/`.dd-no` do/don't cards, `.lede`.
- Shared used: `.full-bleed`, `.hero`/`.split`, `.cards`, `.donut` (color balance),
  `.timeline` (campaign rollout), `.table` (frame-test checklist),
  `.bullets`/`.checks`, `.quote`, `.runner`.
- Arc: cover → the brief in one line → the feeling (keyword tags) →
  §Visual world → image collage → color story → texture & materials → typography
  → photography (split) → motion & light → §Application → sample compositions
  (hero) → campaign rollout (timeline) → color balance (donut) → do/don't →
  mood checklist (table) → north star (quote) → close. A `.runner` footer pins
  the content slides.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
