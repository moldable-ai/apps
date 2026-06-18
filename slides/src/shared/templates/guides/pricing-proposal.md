# Pricing Proposal — style guide

Clean, professional client proposal / statement of work for agency, studio, or
consulting engagements. The bundled sample is a complete 16-slide proposal —
tailor the client, scope, deliverables, tiers, and numbers.

- Palette: slate ink `#1e293b` on white `#ffffff`, with muted slate `#64748b`
  for secondary text and ONE teal accent `#0d9488` (eyebrows, rules, chart fills,
  the recommended pricing column). Supporting neutrals `#334155` / `#94a3b8` /
  `#cbd5e1` only inside the donut. No gradients, no second accent — restraint
  carries it.
- Type: display **Albert Sans** (Google), body **Inter** (Google). Big confident
  Albert Sans display + calm Inter body. Reference via `var(--display)` /
  `var(--body)`, never hardcode.
- Imagery: `pricing-proposal-cover.jpg` — a calm, professional slate-and-teal
  abstract — opens the cover and closes the deck (full-bleed + scrim).
- Section breaks are clean white `.divider`s with a teal `.divider-rule` and a
  one-line `.divider-sub`, numbered 01–03 (Approach / Plan / Investment).

## Signature decoration

- `.scope` table — included rows carry a teal left-rule (`.in`) plus `.scope-tag`
  chips (`.yes` checkmark in teal, `.no` em-dash in muted). Use it for the
  in-scope / out-of-scope split.
- `.deliv` / `.dcard` — deliverables cards with an accent left-rule, a small
  index `.dcard-n`, a `.dcard-t` title, body, and a `.dcard-meta` footer (the
  artifact format). Also reused as the phase cards inside the shared `.flow`.
- Pricing `.table` — highlight the recommended tier's row with `.col-rec` (a
  faint teal wash) and a `.rec-badge` pill next to the tier name.
- `.terms` / `.term` / `.term-k` / `.term-d` — a two-column fine-print block for
  assumptions and terms; `break-inside: avoid` keeps each term whole.
- `.signblock` / `.sign` / `.sign-line` — paired signature blocks with a ruled
  line, name, role, and a `Name · Title · Date` meta line.
- `.callout` / `.callout-k` — a teal left-bar callout for the headline
  "what we heard" understanding.

## Shared components used

`.flow` (phased approach), `.timeline` (milestones), `.donut` + legend (effort
allocation), `.table` (scope + pricing), `.stats` with `.subhead`/`.body`
(team & roles), `.checks` + `.quote`/`.cite` (why us), `.bullets`, `.full-bleed`.

## Arc

cover → our understanding (callout + bullets) → §Approach → recommended approach
(`.flow` phases) → scope in/out (`.scope` table) → deliverables (`.deliv` cards) →
§Plan → timeline & milestones (`.timeline`) → team & roles (`.stats`) → effort
allocation (`.donut`) → §Investment → pricing tiers (recommended highlighted) →
assumptions & terms (`.terms`) → why us (`.checks` + `.quote`) → next steps &
signature (`.signblock`) → close.

## Density notes

Keep all figures tabular and the language client-ready and plain. One idea per
slide; let the teal accent appear sparingly so the recommended tier and the
in-scope rows actually read as emphasis. A `.runner` footer sits on every content
slide (brand left, section label right).
