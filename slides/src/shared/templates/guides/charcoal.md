# Charcoal — style guide

A monochrome, hand-drawn deck for an architecture-and-design studio. The bundled
sample is a complete 18-slide philosophy-and-portfolio story for a fictional
practice, _Atelier Graphite_. Tailor the studio name, the project names, the
numbers, and the contact line to your own narrative.

- **Palette**: warm cold-press paper `#f4f0e8`, charcoal ink `#1c1a17`,
  soft graphite grey muted `#6b655b`, and ONE restrained ember accent `#b4541f`
  used sparingly like a signature (kickers, section numbers, the drop cap,
  data figures, the sketch-frame corner ticks, the short rule). Cards/specimens
  sit on warm white `#fbf8f1`. No gradients, no second accent — let the ink,
  one charcoal drawing, and whitespace carry it.
- **Type**: display **Fraunces** serif (weight 500; use _italics_ for warmth via
  `.lede`, `.plate-title`, and `em` inside `.idx-name`/`.spec-t`), body **Inter**.
  Sharp 3–4px corners, generous margins, square bullets, hairline rules.
- **Imagery** (BOTH charcoal/graphite hand drawings, never photographs):
  - `charcoal-cover.jpg` — the full-bleed cover and close: a dramatic structure
    (spiral stair + glass facade) in expressive charcoal with deep chiaroscuro.
  - `charcoal-fig.jpg` — a serene charcoal interior (arched window, raking light),
    used inside the `.sketch` frame for the selected-work `.split` and the
    featured-project `.hero.reverse`.
  - Regenerating? Repeat the medium keywords: _fine-art charcoal and graphite
    hand drawing, expressive smudged strokes, visible cold-press paper grain,
    dramatic chiaroscuro, monochrome, warm off-white paper_ — and end every prompt
    with "no text, no words, no letters, no logos".
- **Bespoke decoration**:
  - `.plate` / `.plate-num` / `.plate-title` / `.plate-meta` — section dividers:
    an italic Fraunces title, an ember section number, a short rule, a meta line.
  - `.dropcap` — the philosophy statement (oversized ember drop cap via
    `::first-letter`).
  - `.sketch` — the signature figure frame: a double hairline on warm white with
    ember corner ticks; wrap a `<figure class="media">` inside it.
  - `.index` / `.idx-row` / `.idx-no` / `.idx-name` / `.idx-meta` / `.idx-year` —
    the refined portfolio register (no. / name / type / year). Also reused, with
    an inline `grid-template-columns` override, as the donut legend.
  - `.spec` / `.spec-k` / `.spec-t` / `.spec-d` — quiet specimen cards for the
    process flow steps and the recognition cards.
  - `.lede` — a large composed italic-serif statement.
  - `.hair` (full-width 1px graphite rule) and `.hair-short` (96px ember rule).
- **Shared components used**: `.full-bleed`, `.plate` (in place of `.section`),
  `.two-col`, `.flow`, `.checks`, `.split`, `.hero.reverse`, `.bars` (monochrome
  graphite), `.donut` (ink/grey/ember), `.timeline`, `.table`, `.stats`, `.cards`,
  `.logos`, `.quote`, `.runner`.
- **Density note**: keep charts monochrome graphite (`--bar-fill`, `--track`) so
  data reads as a quiet _interlude_, not a dashboard; reserve ember for accents.
  One idea per slide, hairlines over boxes. Runner footer = studio name left,
  section right.
- **Arc**: cover → studio at a glance (stats) → philosophy (drop cap) →
  §How we work → the process (flow) → principles (checks) → selected work (split +
  sketch) → §The work → portfolio index → featured project (hero + sketch) →
  by the numbers (bars) → discipline mix (donut) → recognition (specimen cards +
  logos) → client quote → §Ahead → what's next (timeline) → engage us (table) →
  contact / CTA close on the cover drawing.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
