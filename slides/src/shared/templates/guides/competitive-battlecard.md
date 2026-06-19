# Competitive Battlecard — style guide

Sharp, decisive sales-enablement battlecards for winning head-to-head deals. The
bundled sample is a complete 18-slide "Helix vs. Vaultline" cloud-storage battlecard
set — tailor the competitor name, claims, pricing, and proof to your own matchup.

- Palette: ink `#0f172a`, white `#ffffff`, red `#dc2626` (the decisive accent), green
  `#16a34a` (`--pos`, "where we win"). Red and green carry meaning — use them for
  decisioning (their catch / our edge), not decoration. Muted `#64748b`.
- Type: display **Archivo** (heavy, condensed-feeling, set UPPERCASE on covers and
  dividers), body **Inter**, mono **IBM Plex Mono** for eyebrows/labels. Display weight 800.
- Imagery: `competitive-battlecard-cover.jpg` — a high-contrast diagonal black/red/green
  abstract used for both the cover and the close (full-bleed on a dark scrim).
- Section breaks are hard ink `.divider` slabs (black background, white uppercase title,
  red rule and slash, muted sub-line).

Signature decoration (when to use each):

- `.vs` / `.vs-col.us` / `.vs-col.them` / `.vs-badge` — the head-to-head columns.
  Solid border + shadow on `.us`, dashed border on `.them`; green dots on our rows,
  grey on theirs. `.vs-tag.win` / `.vs-tag.risk` label each column.
- `.tick` (green ✓) / `.cross` (grey ✕) / `.partial` (amber qualifier) inside a `.table`
  with `.col-us` shading on our column — for feature and pricing comparison.
- `.obj` cards: a red `"` objection on top, an `obj-sep` hairline, a green `→` response
  below. Three across with `.cols-3`.
- `.mine` landmine callouts: red-bordered boxes with a ⚠ `.mine-k` label — the questions
  a rep plants to expose the competitor's weak spots.
- `.chip.win` / `.chip.loss` — win/loss reason chips with a `.chip-pct` percentage.
- `.cheat` quick-reference grid — red left-rule cells, mono `.cheat-k` labels, the
  one-page "keep it open in the call" summary.
- `.lede` — oversized Archivo statement line.

Shared used: `.stats` (where we win), `.steps` (discovery questions), `.checks`
(walk-away signals), `.bars` (true-bill comparison, green vs. red), `.quote`, `.table`.

Density notes: keep every claim specific and defensible — a rep should be able to read
a card aloud mid-deal. Pricing table reframes "their lower sticker" into a true monthly
bill; the `.neg`/`.pos` colors do the persuading. Pin the `.runner` (brand left, section
right) on all content slides.

Arc: cover → landscape one-liner → where we win (stats) → §Head to head → us vs. them
(vs-columns) → feature comparison (✓/✕) → pricing comparison (true bill) → §The
conversation → objections & responses (cards) → landmines to set (callouts) → proof
(bars + quote) → §The play → discovery questions (steps) → when to walk away (checks) →
win/loss chips → quick-reference cheat sheet → close.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
