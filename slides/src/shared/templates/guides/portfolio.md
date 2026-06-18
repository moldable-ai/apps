# Portfolio — style guide

Gallery-quiet, image-forward portfolio for a designer's selected work. The bundled
sample is a complete 16-slide selected-work deck — swap the name, projects, and
captions for your own. Let the work images carry it; keep everything else hairline.

- Palette: gallery white `#ffffff`, charcoal `#161616` (text + the single accent),
  warm grey `#8a847c` (muted/labels), with a paper hairline `#e7e3dc`. There is
  effectively ONE color besides white — use the warm greys for hierarchy.
- Type: display **Cormorant Garamond** (high-contrast serif), body **Inter**.
  Signature move: set ONE or TWO words of each heading in italic via `<em>` —
  `Selected <em>work</em>`, `Practice <em>mix</em>`. Keep it to a word, not a phrase.
- Imagery: `portfolio-cover.jpg` (gallery interior — cover, About split),
  `portfolio-work1.jpg` (product/identity still life — Project 01),
  `portfolio-work2.jpg` (spatial/architectural interior — Project 02 hero, Project 03).
  Images go full-bleed or edge-to-edge in `.hero`/`.split` — no borders, no shadows,
  square corners (`--radius:0`, `--media-border:0`, `--media-shadow:none`).

- Bespoke decoration:
  - `.lockup-name` / `.lockup-disc` / `.lockup-rule` — the generous title lockup.
  - `.index` / `.idx-row` / `.idx-no` / `.idx-title` / `.idx-tag` — the numbered
    project-index list (also reused for the chart legend on the practice-mix slide).
  - `.shot-cap` (+ `.dark`) / `.shot-no` / `.shot-meta` — thin hairline captions on
    big image slides; the light variant sits on the scrim, `.dark` on white.
  - `.credit*` / `.credits` — the labelled role/credits row (hairline columns).
  - `.plate` / `.plate-no` / `.plate-title` / `.plate-rule` — quiet project dividers.
- Shared used: `.full-bleed`, `.hero`, `.split` (+ `.reverse`), `.steps`, `.stats`,
  `.donut`, `.quote`, `.logos`, `.runner`.
- Arc: cover (name + discipline) → statement → §work index → §Project 01 plate →
  Project 01 full-bleed shot → Project 01 detail (split) → §Project 02 plate →
  Project 02 hero → process (steps) → results (stats) → practice mix (donut) →
  Project 03 full-bleed → recognition/clients → testimonial (quote) → about → contact.
- Density: low. Vast whitespace, hairline rules over boxes, captions factual
  (medium · year). One image per slide does most of the talking.
