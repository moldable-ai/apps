# Research — style guide

Bright, structured STEM report for experiments/science-fair. The bundled sample
is a complete 15-slide write-up — swap in your own question and data.

- Palette: white, ink-green `#1d2418`, green `#4f9b2e` (primary), sunflower
  `#f2b705` (secondary, fills only). Type: **Hanken Grotesk** throughout.
- Imagery: `experiment-cover.jpg` (geometric mosaic cover), `research-fig.jpg`
  (seedlings under coloured light), `research-section.jpg` (data shapes). Clean
  white `.divider` section breaks.
- Bespoke: `.divider*`, `.var/.var.dep` variable cards (alternating green/yellow
  top borders), `.mat` two-column materials checklist, `.finding/.finding-k`
  callout, `.lede`. Cards alternate green/yellow top borders.
- Shared used: `.steps`, `.bars` (alternating colours), `.donut`, `.table`,
  `.checks`, `.hero/.split`.
- Arc: cover → 4-step overview → why it matters(split) → background(split) →
  §Method → hypothesis → variables → materials → procedure → §Findings → raw
  data(table) → results(bars) → interpretation(donut+finding) → challenges →
  conclusion.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
