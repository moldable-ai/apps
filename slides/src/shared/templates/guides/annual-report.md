# Annual Report — style guide

Stately, classic shareholder annual report. The bundled sample is a complete
17-slide year-in-review for a fictional company (Meridian Industries) — tailor the
company, year, numbers, and leadership names.

- Palette: warm cream `#f5f0e6` (background), deep navy `#0a1e3f` (text/ink),
  antique gold `#b08d3a` (the single accent — eyebrows, charts, rules). Greens/reds
  reserved for table deltas (`--pos` `#3f7d52`, `--neg` `#a23b2e`).
- Type: display **Libre Caslon Display** (a high-contrast classical serif, weight 400)
  paired with body **Inter**. Numbers are tabular throughout. Gravitas over decoration.
- Imagery: `annual-report-cover.jpg` (stately classical architecture — cover and close
  full-bleeds) and `annual-report-fig.jpg` (people/community figure — CEO-letter and
  sustainability splits). Both crop cleanly via `.media`/`.full-bleed`.
- Bespoke decoration:
  - `.fdiv` / `.fdiv-num` / `.fdiv-title` / `.fdiv-rule` — formal numbered section
    dividers with an oversized roman numeral set in the serif.
  - `.bignum` / `.bignum-cap` — an oversized year or headline figure.
  - `.letter` / `.letter-lede` / `.signature` / `.signature-role` — the CEO-letter layout.
  - `.ledger` / `.ledger-val` / `.ledger-label` / `.ledger-delta` — hairline-ruled
    financial figure cards.
  - `.note` / `.note-k` — gold top-rule callout for the headline insight.
  - `.legend` — segment legend beside the donut. `.board` — leadership row. `.toc` — contents.
- Shared used: `.bars` (revenue trend), `.table` (financial highlights, segment detail),
  `.donut` (segment mix), `.timeline` (milestones), `.stats` (year at a glance, people),
  `.checks` (sustainability), `.split` (CEO letter, sustainability), `.quote`, `.cards`.
- Arc: cover (year) → contents → letter from the CEO → year at a glance → §Performance →
  revenue & growth (bars) → financial highlights (table) → segment results (donut + table) →
  §Our impact → milestones (timeline) → sustainability & community (split + checks) →
  our people (bignum + stats) → §The year ahead → outlook & strategy (cards) → closing
  reflection (quote) → board & leadership (row) → close.
- Density: one idea per slide, generous cream whitespace, a `.runner` footer on every
  content slide (brand left, section right). Section dividers stay quiet — just the numeral,
  kicker, title, and a short gold rule.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
