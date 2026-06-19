# GTM Strategy — style guide

A sharp, modern go-to-market plan for a product launch. The bundled sample is a
complete 18-slide opportunity-to-execution story for a fictional workflow-automation
product ("Helio Flow") — tailor the company, segments, channels, and numbers.

- Palette: white `#ffffff`, ink `#16121f`, deep-purple `#5b21b6` (primary),
  electric-lime `#a3e635` (the spark — use sparingly, never as a wash). Muted
  `#6b647a`. Type: display **Sora** (Google), body **Inter** (Google).
- Imagery: `gtm-strategy-cover.jpg` (cover + closing full-bleed, a purple-and-lime
  strategic trajectory) and `gtm-strategy-fig.jpg` (the wedge split, a converging
  market figure). Section breaks are full-purple `.divider`s with a lime num + lime-bar.
- The lime accent: reach for it only as a highlight — the cover/close kicker, the
  one-line opportunity highlight (`.lime-hl`), the winning matrix quadrant's tag,
  the "Lead" channel pill (`.ch-tier.now`), the `.fn-metric.lime-on` paid stage,
  and the lime-bar under each divider. Everything else carries on purple + ink.

## Bespoke decoration (signature pieces)

- `.divider` / `.divider-num` / `.divider-title` / `.divider-sub` / `.lime-bar` —
  full-purple act breaks; div3 carries a pull-quote (`.quote` inherits white on purple).
- `.funnel` / `.fn-row` / `.fn-bar.s1–s5` / `.fn-stage` / `.fn-motion` / `.fn-metric`
  — the stacked-funnel GTM motion, widest (Aware) to narrowest (Expand).
- `.matrix` / `.qd` (+ `.qd.win`) / `.qd-tag` / `.qd-t` / `.qd-d` / `.mx-axis-x` /
  `.mx-axis-y` — the segment 2×2; highlight the beachhead quadrant with `.qd.win`.
- `.ch` / `.ch-head` / `.ch-t` / `.ch-tier` (+ `.ch-tier.now`) / `.ch-d` — channel
  cards with an accent left-rule and a priority pill.
- `.posbox` (`POSITIONING` tab) + `.pos-line` with `.fill` / `.fill.on-lime` fill-ins
  — the positioning statement box.
- `.wedge` / `.wedge-mark` — the unfair-advantage callout (lime left-rule).
- `.icp` / `.icp-ic` / `.icp-t` / `.icp-d` / `.icp-trait` — ideal-customer-profile cards.
- `.risk` / `.risk-k` / `.risk-t` / `.risk-d` — risk-and-mitigation callouts.
- `.lime` / `.lime-hl` / `.lime-bar` — lime accent helpers.

## Shared components used

`.full-bleed`, `.split`/`.media`, `.stats`, `.bars`, `.donut`, `.table`, `.timeline`,
`.steps`, `.bullets`, `.cards`, `.quote`/`.cite`, `.runner` (on every content slide).

## Arc (18 slides)

cover → the opportunity (one line) → market & timing (`.stats` + `.wedge`) →
§Who & what → target segments (`.matrix`) → ICP (`.icp` cards) → positioning
(`.posbox`) → our wedge (`.split`) → §How we win → the funnel & motion (`.funnel`) →
channel mix (`.ch` cards + `.bars`) → pricing & packaging (`.table`) → §Execute
(divider pull-quote) → launch plan (`.timeline`) → goals & metrics (`.donut` + `.stats`) →
risks (`.risk` callouts) → the first 90 days (`.steps`) → closing CTA.

## Density notes

Confident and strategic, generous whitespace. Keep numbers tabular. One idea per
slide. Restraint on color — purple carries the deck, lime is the spark, nothing else.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
