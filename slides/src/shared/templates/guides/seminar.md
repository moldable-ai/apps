# Seminar — style guide

Modern, design-forward lecture/course deck. The bundled sample is a complete
15-slide lecture — adapt to your topic.

- Palette: soft pink `#fdf1f5`, deep indigo `#322a52`, magenta `#d6447a`
  (primary), dusty teal `#5f9ea2` (secondary). Type: **General Sans** throughout.
- Imagery: `lecture-cover.jpg` (full-bleed cover), `seminar-fig.jpg` (pink
  staircase split), `seminar-section.jpg` (abstract split). Soft-pink `.divider`s.
- Bespoke: `.divider*`, `.reflect/.reflect-k` poll/reflection box, `.concept`
  cards inside the shared `.flow` arrow diagram, `.lede`. Magenta numbered `.step`s.
- Shared used: `.steps`, `.cards`, `.flow`, `.donut`, `.checks`, `.pill`,
  `.full-bleed/.split`.
- Arc: cover → roadmap → objectives → §Foundations → why it matters(split) →
  core concepts → how it fits(flow) → §In practice → worked example(split) →
  poll(donut+reflect) → pitfalls → §Wrap up → takeaways → going further(pills) → Q&A.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
