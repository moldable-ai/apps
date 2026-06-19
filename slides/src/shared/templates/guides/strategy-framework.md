# Strategy Framework — style guide

Austere, top-tier-consulting frameworks toolkit. The bundled sample is a complete
18-slide problem-solving deck — a fictional regional grocer ("Meridian Grocers")
deciding how to defend against online entrants. Tailor the client, the levers, and
the numbers; keep the framework scaffolding.

- Palette: cream `#faf8f3`, charcoal `#1f2937`, ONE accent ochre `#b45309`.
  Muted grey `#6b7280`, hairline borders `#e3ddd0`. No gradients, no second hue.
  Type: display **Source Serif 4** (Google), body **Inter** (Google).
- Imagery: `strategy-framework-cover.jpg` — a brutalist-architecture full-bleed used
  for the cover and the close. Generate to your palette; everything else is
  structure, not photos.
- Restraint is the whole point: heavy white space, hairline rules, tabular numbers,
  one ochre accent reserved for the _answer_ (the priority quadrant, the recommended
  option, the lead value-chain links).

## Story arc (diagnose → decide → act)

cover → SCQ (situation/complication/question) → the governing thought →
§Diagnose → issue tree → 2×2 matrix → value chain → §Decide → strategic options
(cards) → options scored (table) → recommendation pyramid → hypotheses → §Act →
initiatives (timeline) → expected impact (bars/stats) → risks & assumptions (checks)
→ partner quote → close. Number sections in the eyebrows; pin the `.runner` footer
(brand left, framework name right) on every content slide.

## Bespoke decoration (signature pieces)

- `.scq` / `.scq-row` / `.scq-tag` / `.scq-text` — the situation-complication-question
  ladder. Add `.q` to the question row to tint it ochre.
- `.thought` / `.thought-k` / `.thought-t` — the bordered governing-thought plate
  (one statement, ochre left rule). Use it once, early.
- `.tree` (+ `.tree-root`, `.tree-elbow`, `.tree-branches`, `.branch`, `.branch-box`)
  — the MECE issue/driver tree: one root question, 2–4 hairline branch boxes.
- `.matrix-wrap` / `.matrix` / `.quad` — the 2×2 prioritization matrix with
  rotated axis labels; add `.quad.win` to highlight the priority quadrant. Items use
  `.quad-item` with a leading `.quad-dot`.
- `.pyramid` / `.tier` (`.tier-1/.tier-2/.tier-3`) — the top-down recommendation
  pyramid: answer on top (ochre), reasons, then supports.
- `.hyp` cards — hypothesis + falsifiable test, ochre left edge.
- `.vc` value-chain link cards sit inside the shared `.flow`; mark the durable-edge
  links with `.vc.lead-link`.
- `.note` / `.note-k` ochre callout, `.lede` oversized serif lead.

## Shared components used

`.flow` (value chain), `.timeline` (initiatives), `.bars` + `.stats` (impact),
`.table` for scored options (`.row-rec` + `.pick` mark the recommendation; `.score`
keeps figures tabular), `.checks` and `.bullets` (assumptions / watch items),
`.cards` (options), `.quote`, `.full-bleed` (cover/close), `.divider*` (sections).

## Density notes

One framework per slide — never two. Keep copy short and declarative; let the
structure do the talking. Reserve ochre for the conclusion on each slide so the eye
lands on the answer. Headlines are assertions ("Where to play first."), not topics.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
