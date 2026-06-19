# Literary — style guide

Warm, elegant book-report / humanities deck. The bundled sample is a complete
15-slide report — adapt to your title.

- Palette: cream `#faf6ef`, ink-brown `#2a211b`, terracotta `#c0633a`. Type:
  display **Playfair Display** serif (use <em> for italics), body **Hanken Grotesk**.
- Imagery: `book-cover.jpg` (cover/split), `book-fig.jpg` (desk illustration),
  `book-scene.jpg` (coastal watercolour). Chapter dividers are clean cream.
- Bespoke: `.chapter/.chapter-num` (italic roman numeral)/`.chapter-title`/`.chapter-rule`;
  `.facts/.fact/.fact-k/.fact-v` factsheet; `.prose.dropcap` set-the-scene narrative;
  `.rating` (★ row); `.note/.note-k` verdict callout.
- Shared used: big `.quote`, `.cards`, `.steps`, `.split`, `.cols-2`.
- Arc: cover → contents → meet the book(facts) → Ch.I Story → setting(dropcap) →
  characters → plot(steps) → conflict → Ch.II Meaning → themes → pull quote →
  symbolism → author's style → verdict(rating) → recommendation.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
