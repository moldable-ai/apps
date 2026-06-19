# Sales Deck — style guide

Confident, trustworthy B2B SaaS sales pitch — crisp and corporate, never flashy.
The bundled sample is a complete 18-slide enterprise pitch from a fictional
analytics SaaS (Helio) to an enterprise buyer (Northwind) — swap the company,
buyer, capabilities, numbers, and pricing for the real deal.

- Palette: white `#ffffff` background, ink `#0f172a` text, slate `#64748b` muted,
  ONE royal-blue accent `#1d4ed8`. No gradients, no second hue — restraint sells trust.
- Type: display **Space Grotesk** (grotesk, 700 for headlines), body **Inter**.
  Big confident headlines, calm body, tabular numbers in tables and stats.
- Imagery: `sales-deck-cover.jpg` (blue glass-architecture full-bleed — used on the
  cover and closing CTA), `sales-deck-product.jpg` (translucent-glass dashboard
  still-life — the product-overview `.split`). Section breaks are quiet white
  `.divider`s with a blue rule.
- Bespoke decoration:
  - `.divider/.divider-num/.divider-title/.divider-rule` — white section breaks.
  - `.vprop/.vp` — value-prop cards with a signature blue **top-rule** (capabilities).
  - `.proof/.proof-cell/.proof-num` — tinted full-width metric band (results).
  - `.pflow/.pcard` — numbered pill steps for "how it works".
  - `.logostrip/.logo` — muted social-proof logo row.
  - `.callout/.callout-k` — cost-of-status-quo callout.
  - `.yes/.no/.col-us` + `.tier-head/.tier-price` — comparison & pricing table cells.
- Shared used: `.full-bleed`, `.split`, `.bars`, `.timeline`, `.flow-arrow`, `.table`,
  `.stats`, `.steps`, `.bullets`, `.checks`, `.quote/.cite`, `.runner` footer.
- Arc: cover → problem (cost of status quo) → stakes (stat row) → §The solution →
  product overview (split + image) → how it works (numbered flow) → capabilities
  (value-prop cards) → §The proof → results (bars) → proof band + logo strip →
  customer quote → competitive comparison (table) → pricing tiers (table) →
  implementation timeline → the ask (next steps) → closing CTA.
- Density: one idea per slide, generous whitespace, a `.runner` footer
  ("Helio Analytics" left, section right) on every content slide. Sell the outcome,
  keep claims concrete and numbers tabular.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
