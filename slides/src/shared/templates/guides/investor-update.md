# Investor Update — style guide

Restrained, letter-like monthly investor update. The bundled sample is a complete
16-slide month-in-review for a fictional startup (Lattice Systems) — tailor the
company, month, numbers, and asks. It should read like a thoughtful founder letter,
never a sales pitch: honest, specific, calm.

- Palette: warm off-white `#fbfaf8`, ink `#1c1a17`, muted `#6f6a62`, ONE navy
  accent `#1e3a5f` (with a lighter navy `#4a6b8a` and warm grey `#b9b2a6` only as
  donut segments). Positive `#2f6e4f`, negative `#a23b2e`. No gradients anywhere.
- Type: **Source Serif 4** for everything (display + body) — sets the letter-like,
  editorial tone; **Inter** as the mono/label face for eyebrows, deltas, table-like
  markers. Tabular numerals throughout.
- Imagery: a single quiet navy-on-paper abstract `investor-update-cover.jpg`, used
  full-bleed on the cover and the close. Section breaks are image-free ruled pages.
- Bespoke decoration:
  - `.tldr / .tldr-row / .tldr-mk / .tldr-txt` — three lettered lines on hairlines,
    the memo opener.
  - `.dash / .dash-cell / .dash-val / .dash-label` + `.delta.up/.down/.flat` — the
    hairline-divided metric dashboard with triangle deltas.
  - `.hlcols / .hl-col.good / .hl-col.hard / .hl-head / .hl-item` — the honest
    highlights vs. lowlights two-column.
  - `.note / .note-k` — navy-keyline callout for "what's hard / what we're doing".
  - `.gauge / .gauge-track / .gauge-fill / .gauge-scale / .gauge-cap` — the runway bar.
  - `.asks / .ask / .ask-n / .ask-t / .ask-d` — numbered ledger of requests.
  - `.ucards / .ucard` — flat product & GTM update cards; `.divider*` ruled section
    pages; `.signoff` for the founder sign-off.
- Shared used: `.bars` (growth), `.donut` + legend (burn split), `.table` (KPI
  scorecard, use `.pos`/`.neg`/`.row-em`), `.stats` (team & hiring), `.checks`
  (highlights), `.quote` (founder note), `.full-bleed` (cover/close).
- Arc: cover → TL;DR → metrics dashboard → §Progress → highlights → lowlights/what's
  hard → growth chart → KPI table → §Business → product & GTM → team & hiring →
  runway & burn → §How you can help → asks → founder note → close.
- Density: keep numbers tabular and specific; one idea per slide; let whitespace and
  the serif carry the calm. Eyebrows and deltas in Inter, everything else in serif.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
