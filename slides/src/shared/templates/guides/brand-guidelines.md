# Brand Guidelines — style guide

Type-driven, high-contrast editorial brand book for a fictional brand ("Monolith").
The bundled sample is a complete 18-slide identity guide — rename the brand,
recolor the single accent, and swap the imagery. Loud but disciplined.

- Palette: ink `#0b0b0b`, paper `#ffffff`, one vivid vermilion `#ff3b1f` (the ONLY
  accent — never add a second hue), plus fog `#f4f4f2` for quiet panels.
  Type: display **Anton** (massive, all-caps condensed), body **Archivo**.
- Everything is square-cornered (`--radius:0`), hard-edged, and uppercase by default.
  Vermilion is for emphasis only — roughly a 90/10 mono-to-accent balance.
- Imagery: 2 images. `brand-guidelines-cover.jpg` (bold abstract red/black/white
  graphic) runs full-bleed on the cover + close under `.is-dark`;
  `brand-guidelines-style.jpg` (high-contrast studio portrait with a red gel) is the
  imagery-style `.split` and both do/don't panels (the don't panel is desaturated
  via CSS to demonstrate the rule).
- Bespoke decoration:
  - `.is-dark` — flips a full-bleed/section slide to black ground (cover, close,
    Logo + Type section dividers, so text + runner read on black).
  - `.ghost` / `.ghost.edge` / `.ghost.accent` — a giant Anton letterform bled off
    the slide edge as a watermark.
  - `.eyebrow` / `.eyebrow-num` / `.eyebrow-txt` — numbered section lockup for
    content slides.
  - `.swatches` / `.swatch` (`.sw-ink/.sw-paper/.sw-red/.sw-grey`) — color chips
    showing name, hex, and usage.
  - `.clearbox` / `.clear-mark` / `.clear-dot` / `.clear-word` / `.clear-cap` — logo
    clearspace box with a dashed vermilion inset.
  - `.specimen` / `.spec-row` / `.spec-meta` / `.spec-glyph-d` / `.spec-sample-b` —
    type-specimen ladder (set per-row sizes inline via `style="font-size:…"`).
  - `.judge` / `.panel.do` / `.panel.dont` / `.panel-mark` / `.panel-label` —
    photography do/don't pair (✓ red, ✕ black; the don't image is greyed out).
  - `.tone` / `.tone-cell.on` — a voice "we are / not" scale.
  - `.princ` / `.princ-t` / `.princ-d` — vermilion-ruled principle blocks (reused
    inside the motion `.flow` diagram).
- Shared used: `.full-bleed`, `.section`, `.split`, `.donut`, `.table`, `.stats`,
  `.cards`, `.flow`, `.bullets`, `.checks`, `.quote`, `.runner`.
- Arc: cover → contents → at-a-glance(stats) → mission → §Logo → logo+clearspace →
  §Color → palette(swatches) → color balance(donut) → §Type → typography(specimen) →
  type scale(table) → voice&tone → imagery(split) → photography do/don't → applications
  (cards) → motion+pull-quote(flow) → close.
- Density: one idea per slide; let the giant type and one red note carry it. Keep the
  accent rare — if everything is red, nothing is.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
