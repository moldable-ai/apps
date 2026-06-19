# Status Report — style guide

Disciplined, executive program-status report in the RAG idiom. The bundled
sample is a complete 17-slide steering-committee update for an "Atlas ERP"
program — retitle the program, swap owners/dates, and keep the colors honest
(red/amber/green mean status, never decoration).

- Palette: neutral slate ink `#1f2937` on white `#ffffff`, muted `#6b7280`.
  Status language: red `#dc2626`, amber `#f59e0b`, green `#16a34a` (with soft
  tinted backgrounds). The slate doubles as `--accent` so chrome stays neutral
  and color carries meaning.
- Type: display **Inter** at a tight 800 weight, body **Inter**, and **IBM Plex
  Mono** for eyebrows, risk IDs, dates, and metadata chips. One family, two
  voices — reads like an operations report, not a marketing deck.
- Imagery: one calm slate architectural full-bleed (`status-report-cover.jpg`)
  used on both the cover and close. Section breaks are dark slate `.divider`s
  carrying a mono section number and a row of RAG dots.

## Signature decoration (when to use)

- `.ragbanner` (+`.is-red`/`.is-amber`/`.is-green`) — the cornerstone overall-
  status banner: a colored `.rag-orb`, `.rag-label`, and a one-line `.rag-line`.
  One per deck, right after the cover.
- `.pill-rag` (+`.red`/`.amber`/`.green`) — small status pills for table rows,
  flow steps, and inline use. `.trend` (+`.up`/`.down`/`.flat`) for direction.
- `.risk` (+`.red`/`.amber`) — risk/issue callout cards with `.risk-id`,
  `.risk-sev`, `.risk-title`, `.risk-body`, and a bold `.risk-mit` mitigation
  line. Lay them out in `.cols-2`; also reused inside `.flow` for dependencies.
- `.decisions`/`.decision` — auto-numbered decisions-needed list; each ask gets
  `.dec-chip` owner / by-when / impact metadata. Bold the `<b>` red phrase.
- `.divider`/`.divider-num`/`.divider-title`/`.divider-sub`/`.divider-dots` —
  dark slate section breaks.
- Schedule helpers: `.milestone-flag` (+`.done`/`.now`/`.next`) tags on
  `.timeline` rows; `.legend-rag` for the RAG key.

## Shared components used

`.full-bleed` (cover/close), `.stats` (exec summary), `.table` (workstream
scorecard + scope/quality, with `.pill-rag` cells), `.timeline` (milestones),
`.bars` (budget — color bars by RAG), `.flow` (dependencies), `.checks` (next-
period focus), `.quote`/`.cite` (sponsor note), `.runner` footer everywhere.

## Arc (17 slides)

cover → overall status (RAG banner) → executive summary (stats) → §By workstream
→ workstream scorecard (table+pills) → schedule & milestones (timeline) → budget
& scope (bars) → scope & quality (table) → §Attention → top risks & issues
(risk cards) → decisions needed (numbered) → dependencies (flow) → §Ahead →
next-period focus (checks) → sponsor note (quote) → close.

## Density notes

Keep figures tabular and right-aligned (`.num`). Every content slide carries a
`.runner` footer (brand left, section right). Resist adding color for emphasis —
if it isn't a status signal, it stays slate.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
