# Executive Review — style guide

A dark, authoritative board-review deck. Gravitas over decoration: warm
near-black, a single crimson accent, refined serif headlines, and a complete
QBR narrative. The bundled sample deck is a **complete 17-slide presentation** —
tailor the numbers and copy, don't rebuild from scratch.

## Design language

- **Palette:** background `#14110e` (warm near-black), text `#f1eae1`, muted
  `#a59a8c`, accent crimson `#cf4b3e`, positive `#5fb98b`, warning `#e0a23c`.
  One accent only — crimson marks figures, eyebrows, and the section rule.
- **Type:** display **Fraunces** (serif, weight 500–600), body **Satoshi**.
  Headlines are serif; numbers are tabular.
- **Imagery:** `qbr-cover.jpg` (carved walnut + amber) opens and closes the deck;
  `exec-section.jpg` (marble + amber veins) is the act-break full-bleed;
  `exec-team.jpg` (amber silk, portrait) is the team split. All under the dark
  scrim with bottom-anchored text.
- **Feel:** restrained, expensive, confident. Lots of black space.

## Narrative arc (the 17 slides)

cover → agenda → executive summary → **§1 Performance** → KPI dashboard →
revenue trend (bars + callout) → revenue mix (donut + legend) → **§2 Execution**
→ accomplishments → goal scorecard → team & resources → challenges & learnings →
**§3 Outlook** → roadmap (timeline) → financial guide (table) → decisions needed
→ thank-you.

## Bespoke components (in this template's CSS)

- `.kpi-grid` / `.kpi` / `.kpi-val` / `.kpi-label` + `.delta.up|.down` — the
  hairline-divided KPI dashboard with ▲/▼ delta chips.
- `.lede` — oversized serif intro sentence.
- `.ag` / `.ag-n` / `.ag-t` / `.ag-d` — the numbered agenda rows.
- `.callout` + `.callout-k` — crimson-ruled highlight box for the headline insight.
- `.status.on|.risk|.off` — dot status pills for the scorecard table.
- `.sec-rule` — short crimson bar under section-divider titles.
- `.legend` / `.legend-row` / `.legend-dot` — donut legend.
- Multi-segment donut: override `.donut` background with an inline
  `conic-gradient(#cf4b3e 0 58%, #e0a23c 58% 82%, #8a7d6e 82% 100%)`.

## Shared components used

`.full-bleed` (cover/sections/close), `.split` (team), `.bars` (revenue trend),
`.donut` (mix), `.table` + `.num`/`.row-em` (scorecard, financials), `.stats`,
`.cards` + `.metric` (accomplishments), `.timeline` (roadmap), `.checks` (asks).

## When tailoring

Swap the company, numbers, and segment colors; keep the act structure and the
one-accent restraint. Don't add a second accent color or gradient backgrounds.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
