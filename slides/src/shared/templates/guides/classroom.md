# Classroom — style guide

Warm, friendly, ultra-legible K-12 lesson deck on cream paper. The bundled sample
is a complete 18-slide Grade 5 science lesson on **ecosystems & food webs** —
retitle the unit, objectives, vocabulary, data, and quiz for any subject or grade.

- Palette: cream paper `#fffdf7`, warm ink `#332c26` text, soft brown `#8a7d70`
  muted, ONE coral accent `#ef6c4d`, teal secondary `#1f9c8f` (--accent-2) for
  checks, callouts, and answer pills. No gradients — restraint keeps it calm and
  readable for kids.
- Type: display **and** body both **Lexend** (chosen for legibility), 700 for big
  friendly headlines, 400–500 for body. Generous type, lots of whitespace, rounded
  everything (30px radius, soft warm shadows).
- Imagery: `classroom-cover.jpg` (a bright woodland-meadow ecosystem illustration —
  used on the cover and the homework close), `classroom-fig.jpg` (a labelled-style
  tree/soil cross-section — the diagram `.split`). Both are soft gouache/cut-paper
  children's-book illustration, not photos.
- Bespoke decoration:
  - `.divider/.divider-num/.divider-title/.divider-rule` — sunny section breaks.
  - `.bigq` — the oversized lesson-hook question.
  - `.vocab/.vcard/.vchip/.vterm/.vdef` — emoji-chip vocabulary cards.
  - `.trophic` chips dropped inside the shared `.flow` for the food chain.
  - `.callout/.callout-k` — teal "Notice" / "Think · Pair · Share" callout.
  - `.figdot` — colored label tags beside the diagram figure.
  - `.quiz/.qcard/.qnum/.qq/.qa` — quiz question cards with answer pills.
- Shared used: `.full-bleed`, `.split`, `.cards`, `.checks`, `.steps`, `.flow`,
  `.bars`, `.table` (with `.pos`/`.neg`), `.quote/.cite`, `.pill`, `.runner` footer.
- Arc: cover → today's big question (`.bigq`) → objectives (`.checks`) →
  §The basics → three roles (`.cards`) → key vocabulary (`.vcard`) → labelled
  diagram (`.split` + figure) → energy flow (`.flow` + `.trophic`) → population
  data (`.bars` + `.callout`) → §Let's explore → hands-on activity (`.steps`) →
  think-pair-share (`.callout`) → quiz (`.qcard`) → answer key (`.table`) →
  key takeaways (`.checks`) → naturalist quote → homework & close (full-bleed).
- Density: one idea per slide, big type, never crowd. A `.runner` footer
  ("Mr. Rivera · Grade 5 Science" left, lesson step right) on every content slide.
  Use emoji sparingly as friendly icons; keep claims and the data simple and concrete.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
