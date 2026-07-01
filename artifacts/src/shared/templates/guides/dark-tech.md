# Dark Tech — style guide

Cinematic, terminal-grade product-launch keynote on near-black. The bundled
sample is a complete 16-slide launch for a fictional edge-inference engine
("Halo Edge") — tailor the product, specs, benchmarks, and pricing.

- Palette: near-black `#0a0d13` (bg), off-white `#e8eef5` (text), slate `#8a97a8`
  (muted), terminal-green `#4ade80` (primary accent), electric-blue `#60a5fa`
  (secondary, used for the faint dot-grid + a few highlights). Type: display +
  body **Space Grotesk**, mono **JetBrains Mono** for eyebrows, commands, console.
- Identity: every slide carries a faint blue radial dot-grid (46px). Eyebrows are
  mono `// section` or `$ command`. Square bullet markers. Keep deep blacks; let
  one neon line carry each frame. No gradients, no rainbow — ONE green accent.
- Imagery: `dark-tech-cover.jpg` (device silhouette in data-fog — cover + close),
  `dark-tech-product.jpg` (sleek machined slab with green light line — full-bleed
  reveal + the deep-feature split). Both crop cleanly under `.full-bleed`/`.media`.
- Bespoke: `.act/.act-num/.act-title/.act-rule` terminal section dividers;
  `.spec/.spec-cell/.spec-val/.spec-unit/.spec-label` spec cards (green hairline
  top); `.term/.term-bar/.term-dot/.term-body` console panel (`.p` prompt,
  `.o` flag, `.c` comment); `.fstrip/.frow/.frow-k/.frow-v` labelled hairline rows
  in the feature split; `.col-us` recommended-tier highlight + `.tier-name`/
  `.tier-price`; `.omt` "one more thing" pulse badge.
- Shared used: `.full-bleed` (dark scrim), `.flow` pipeline, `.bars` benchmarks
  (mute the comparison bars to `#2a3340`/`--accent-2`, leave the hero bar green),
  `.table` lineup, `.timeline` availability, `.stats`, `.cards`, `.quote`, `.kbd`
  for commands/keys, `.runner` footer (brand left, section right).
- Arc: cover → the shift → problem today → §Introducing → product reveal
  (full-bleed) → how it works (flow + console) → specs (spec cards) → deep feature
  (split) → §The proof → benchmarks (bars) → quote → lineup/pricing (table) →
  availability (timeline) → one more thing → CTA close.
- Density: terse, technical, confident keynote copy. Numbers tabular and mono.
  One idea per slide; let the dark imagery and the green accent do the talking.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
