# Project Timeline — style guide

Blueprint-blue product roadmap deck for program/product planning reviews. The
bundled sample is a complete 18-slide plan for shipping "Atlas Platform" in three
phases over two quarters — re-time the phases, dates, owners, and numbers.

- Palette: white `#ffffff`, ink-navy `#0f1c3f`, blueprint blue `#1e3a8a` (primary
  accent), cyan `#0ea5e9` (secondary — grid lines, milestones, alternating bands).
  No gradients, no gradient text — one navy with a cyan partner.
- Type: display **Sora**, body **Inter**, labels/dates **IBM Plex Mono**. Keep all
  dates and lane tags in mono (`var(--mono)`); it reads like a drafting sheet.
- Imagery: `project-timeline-cover.jpg` — an abstract architectural blueprint used
  full-bleed on the cover and closing CTA (white text on the navy scrim).

## Signature decoration (and when to use it)

- `.grid-slide` — add to a content `.pad` wrapper for the faint cyan drafting grid
  behind everything. Use on most content slides for cohesion.
- `.bp-divider / .bp-num / .bp-title / .bp-rule / .bp-lead` — the navy section
  break with its own grid wash and cyan tick rule. One per act.
- `.roadmap` — the horizontal phase timeline: a `.roadmap-track` rail, then
  `.roadmap-phases` (`--phases`) of `.rm-phase` (add `.cyan` to alternate) each
  with a `.rm-dot` milestone marker and a `.rm-band` card. The at-a-glance view.
- `.gantt` — phase-level scheduling rows: `.gantt-row` = `.gantt-label` (with a
  `<small>` lane) + `.gantt-lane` holding a `.gantt-fill` positioned by `--start`
  and `--len` (percent). Add `.cyan` to the fill for the secondary lane.
- `.lanes / .lane / .lane-name / .chip` — workstream swimlanes (add `.lane.cyan`
  to alternate accent). `.diamond` is an inline milestone marker.
- `.flow` + `.fnode` cards — the dependency / critical-path diagram (Gate A→B→C→D).
- `.note` (+`.risk`) callouts — buffers (cyan) and risks (amber). `.status`
  pills (`.done` / `.now` / `.next`) drive the milestone `.table`.

## Shared components used

`.full-bleed`, `.checks`, `.cards`, `.two-col`, `.stats`, `.donut`, `.table`,
`.bullets`, `.quote/.cite`, `.runner` (footer on every content slide).

## Arc

cover → destination (one-line vision) → guiding principles (.checks) →
§The plan → roadmap at a glance (.roadmap) → Phase 1 (cards + .gantt) →
Phase 2 → Phase 3 → dependencies (.flow + .fnode) → milestones & dates (.table) →
§Execution → workstreams (.lanes) → resourcing (.stats) → risks & buffers (.note) →
success metrics (.donut) → pull-quote → close.

## Density notes

Phase-detail slides pair a single-column `.cards` stack (the _what_) with a `.gantt`
(the _when_) — keep to three rows each so the lanes stay legible. Anchor content
slides with `.pad.top` and a tightened `--pad-y` when a slide carries a timeline or
gantt, so the chart breathes. Keep the story phase-ordered and the buffers honest.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
