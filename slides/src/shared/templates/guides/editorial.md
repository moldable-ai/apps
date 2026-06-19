# Editorial — style guide

A photo-forward long-form magazine feature. The bundled sample is a complete
18-slide feature story ("The Slow Hand," a piece on craft and patience) — a
fictional magazine, _The Long Form_. Tailor the magazine name, the feature
subject, the byline, and the numbers to your own narrative.

- Palette: paper `#f7f3ec`, ink `#171513`, warm-grey muted `#6e655a`, a single
  burnt-rust accent `#b4471f` used sparingly like a signature (kickers, drop
  cap, pull-quote mark, data figures). Cards/asides sit on warm white `#fffdf9`.
- Type: display **Fraunces** serif (weight 500; wrap key words in `<em>` for the
  signature italic accent), body **Satoshi**. Tight leading, sharp 3px corners,
  big margins. No gradients, no rainbow — let the serif and one photo carry it.
- Imagery: `editorial-cover.jpg` (full-bleed cover — figure in warm light, lots
  of negative space for the title), `editorial-feature.jpg` (the reported-spread
  `.split` and the full-bleed photo essay — a tactile workbench), and
  `editorial-essay.jpg` (the profile `.hero` portrait, portrait-oriented).
- Bespoke decoration:
  - `.masthead` / `.masthead-name` / `.masthead-meta` — the magazine wordmark +
    issue line (white on the cover, ink on the colophon).
  - `.byline` — author/credit line with a leading rust rule.
  - `.dropcap` — the lede paragraph (oversized rust drop cap via `::first-letter`).
  - `.contents` / `.toc-row` / `.toc-no` / `.toc-title` / `.toc-pg` — the
    numbered table of contents.
  - `.folio` — small caps section marker on the full-bleed-free `.section` dividers.
  - `.aside` / `.aside-k` / `.aside-t` / `.aside-d` — boxed editorial sidebar.
  - `.pullstat` / `.pullstat-n` / `.pullstat-l` — oversized serif data callouts
    (used inside the shared `.stats` row).
  - `.credits` / `.credit-k` / `.credit-v` — the masthead-style colophon close.
- Shared components used: `.full-bleed`, `.section`, `.split.wide-media`,
  `.hero.reverse`, `.cards`, `.timeline`, `.checks`, `.bars` (monochrome ink),
  `.table`, `.stats`, `.quote`, `.rule`, `.runner`.
- Density note: keep charts monochrome ink (`--bar-fill`/`--track`) so data reads
  as a quiet _interlude_, not a dashboard. One big idea per spread; let whitespace
  and the photo breathe. Runner footer = magazine name left, section right.
- Arc: cover → contents → §The lede → lede (drop cap) → thesis (pillars) →
  §The workshop → reported spread (split) → the method (timeline) →
  §By the numbers → data interlude (bars) → findings (stat row) → pull quote →
  §The profile → profile (hero) → sidebar (aside + table) → photo essay
  (full-bleed) → takeaways (checks) → masthead/colophon close.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
