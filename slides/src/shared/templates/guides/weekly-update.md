# Weekly Update — style guide

Ultra-minimal, information-dense team update. The bundled sample is a complete
17-slide week-in-review for a "Platform Team" — tailor the team, week, owners,
metrics, and status. Quiet and scannable: restraint over decoration.

- Palette: near-white `#fafafa`, slate `#334155` text, muted `#94a3b8`, ONE green
  `#16a34a` accent. Reserve muted red `#b91c1c` for blockers/regressions only;
  amber `#ca8a04` reads as "at risk". No gradients, no second hero color.
- Type: body + display both **Inter** (700/800 for headlines), with **JetBrains
  Mono** carrying every label, eyebrow, delta, owner handle, and metric tag.
- Imagery: a single calm minimal abstract `weekly-update-cover.jpg` — used full-bleed
  on the cover and reused as the highlight `.split` figure. Section breaks are quiet
  near-white `.wdiv`s, not images.

## Signature decoration

- `.mlabel` — the mono section eyebrow with a green tick and `.idx` step number;
  put it at the top of every content slide. Anchors the system.
- `.spill` status pills — `.on` (green / on track), `.risk` (amber / at risk),
  `.blocked` (red). Use inline in the in-flight table or anywhere status reads.
- `.mrow` / `.mcell` compact metric strip with `.mdelta` `.up`/`.down`/`.flat`
  mono arrows. Green = improving, red = attention — keep numbers tabular.
- `.board` three-column shipped/in-flight/next (`.bcol shipped|flight|next`,
  `.bcol-h`, `.btask` with a `.who` mono handle and a color-coded dot).
- `.spark` tiny inline bars — drop beside a label for a micro-trend; mark the
  latest bar with `i.a` for the green accent.
- `.bnote` callout cards — `.block` (red ask), `.ask` (green), neutral default —
  for blockers and asks. `.tldr` oversized numbered list for the opener.
- `.wdiv` quiet section divider (`.wdiv-num`, `.wdiv-title`, `.wdiv-rule`).

## Shared components used

`.checks` (what shipped), `.table` with `.spill` pills (in flight), `.bars` +
`.spark` (trend), `.steps` (next week), `.stats` + `.metric` (highlight/focus),
`.quote` (notable mention), `.split` figure, `.runner` footer on every content slide.

## Arc

cover (week of) → TL;DR → metrics (mrow) → §Progress → shipped (checks) →
board → in flight (table + pills) → §Risks → blockers & asks (bnote) →
trend (bars + spark) → highlight (split) → §Ahead → next-week plan (steps) →
one focus → notable mention (quote) → links & close.

## Density notes

Lean dense and grid-aligned: two-column check lists, four-up metric strips,
three-column board. Keep copy terse and operational. Mono for anything
machine-flavored (IDs, handles, links like `go/...`, deltas); Inter for prose.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
