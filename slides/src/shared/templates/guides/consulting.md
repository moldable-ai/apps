# Consulting — style guide

Warm, premium professional-services deck for client kickoffs/proposals. The
bundled sample is a complete 16-slide engagement deck — tailor the client,
phases, and numbers.

- Palette: cream `#f7f6f0`, ink `#2a3325`, forest-green `#3d5a40` (primary),
  gold `#9a7c3f` (eyebrows). Type: display **Newsreader** serif, body **Satoshi**.
- Imagery: `engage-cover.jpg` (cover/hero), `consult-section.jpg` (situation split),
  `consult-team.jpg` (team split). Section breaks are clean cream `.divider`s.
- Bespoke: `.divider/.divider-num/.divider-title/.divider-rule`, `.ag*` agenda rows,
  `.phase` cards inside the shared `.flow` arrow diagram, `.note/.note-k` gold callout,
  `.gov/.gov-item/.gov-ic` governance grid, `.lede`.
- Shared used: `.flow`, `.timeline`, `.donut`, `.table`, `.stats`, `.checks`, `.hero/.split`.
- Arc: cover → agenda → situation → §Engagement → objectives → approach(flow) →
  workplan(timeline) → team → §Value → KPIs → effort(donut) → governance →
  §Getting started → risks(table) → next steps → close.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
