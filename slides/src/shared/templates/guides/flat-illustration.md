# Flat Illustration

A bright, optimistic consumer-product deck built around **premium flat geometric
vector illustration**. The sample tells one story end to end: a consumer money /
budgeting app (**Penny**) pitch — money stress → the app → how it works →
features → traction → proof → market → pricing → roadmap → the ask. Swap in your
own product and numbers; keep the friendly, encouraging voice.

## The medium (this is the whole point)

Imagery is **flat geometric vector illustration**, never photographs. Bold clean
shapes, crisp sharp edges, flat solid fills with only simple geometric shading —
no gradients-as-noise, no 3D, no realism. Think premium startup/SaaS illustration:
friendly, modern, consumer. The cover (`assets/flat-illustration-cover.jpg`) is
the on-medium exemplar (diverse people happily using the app, geometric city +
money symbols behind); the product scene (`assets/flat-illustration-scene.jpg`)
is a single phone with a flat-vector budgeting UI and a peeking character. When
generating new art, repeat the medium keywords and end every prompt with
"no text, no words, no letters, no logos".

## Palette & type

- **Background** white `#ffffff`; **ink** text `#0f1222`; muted `#6b7090`.
- **Primary** indigo `#4f46e5`; **secondary** warm coral `#fb7185`; **mint**
  `#10b981` (success / third chart segment). Bright but restrained — one indigo
  carries it, coral for accents and bullets, mint sparingly.
- **Stage** sits on a soft lilac letterbox `#f4f4fb`.
- **Display** `Poppins` (700/800) — rounded, friendly. **Body** `Inter`. Both via
  `fonts.links`; reference only through `var(--display)` / `var(--body)`.
- Everything is **rounded**: `--radius: 28px`, pill chips, 999px step badges.

## Signature decoration (when to use it)

- `.fdiv` — friendly section divider on a soft lilac field, with a rounded indigo
  index chip and three colored dots. Use for the 2 act breaks.
- `.fcard` (`.fcards`, `--cols`) — rounded feature card with a pastel icon chip
  (set the chip `background` to indigo/coral/mint). Use for the features grid.
- `.pills` + `.pill-card` / `.pill-n` — numbered pill steps. Use for "how it
  works" (pair with `.flow-arrow` between steps).
- `.statband` — colorful full-width indigo band of big white stats. Use for the
  headline traction numbers.
- `.vs` + `.vs-old` / `.vs-new` — old-way vs new-way comparison tiles (new tile
  gets the 2px indigo border). Use to frame "why now".
- `.fcallout` — soft coral-tinted callout with a left rule. Use for the one
  killer stat on a problem/insight slide.

## Shared kit used here

`.bars` for growth, a 3-segment `.donut` for the market split, `.timeline` for
the roadmap, a `.table` (`.col-us` highlights the recommended plan, `.tier-price`)
for pricing, `.full-bleed` cover/close, `.split` for the product scene, `.quote`
for the user testimonial, `.steps` for the agenda, `.bullets` (coral by default).

## Density notes

One idea per slide, lots of whitespace. Keep numbers tabular. Don't crowd the
flat-vector art — let one image and a confident Poppins line carry each visual
slide. Pin the `.runner` footer (brand left, section right) on every content
slide; covers and dividers skip it. Headlines are sentence case and warm — sell
the feeling of calm, not a feature list.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
