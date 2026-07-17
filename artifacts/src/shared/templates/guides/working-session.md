# Working Session — style guide

The deck that _becomes_ the whiteboard. The bundled sample is an 18-slide, 90-minute
Q3 planning session for a fictional product team ("Relay") — the exercises run inside
the slides on one facilitator screen. Everything is local state: no accounts, no
network, nothing multi-user.

- Palette: warm paper `#fbf8f1`, warm ink `#2b2624`, marker coral `#e8563f` (accent)
  and marker green `#2f9e77` (accent-2), with sticky pastels — yellow `#ffd66b`,
  coral `#ffa08c`, mint `#9fe3c0`, sky `#a5d8f3` — and `#5a9bd5` as a third chart
  hue. Rounded (18px), soft shadows, dashed rules. Playful, never childish.
- Type: **Gabarito** everywhere (800 display / 400–700 text); **Caveat** ONLY for
  `.hand` annotations and sticky-note text.
- Imagery: one photo — a wall of blank stickies (`working-session-cover.jpg`) used
  on the cover, close, and (taped, via `.tape`) the mission split.
- Interactive (runtime.js — keep `data-deck-interactive` on widget roots; drag
  surfaces need `touch-action:none`):
  - **Tap poll** `[data-poll]` — vote buttons bump counts, bars re-scale, reset chip.
  - **Sticky wall** `[data-board]` — add (input + Enter), drag (`[data-drag]` inside
    `[data-drag-area]`), edit (contenteditable), delete. Seeds from the authored
    `[data-seed-sticky]` notes, then renders from state.
  - **Dot voting** `[data-dotvote]` — ± steppers re-rank rows live via flex `order`;
    leader gets a star.
  - **2×2 board** `[data-quad]` — draggable `.magnet` pills; quadrant counts update
    on drop.
  - **Session timer** `[data-timer]` — 5/10/15 presets, start/pause/reset, conic-
    gradient progress ring. One shared interval in the runtime.
  - Click-builds on the ground-rules cards (+ `data-deck-advance` button).
- Bespoke decoration: `.paper-dots` (dot-grid paper), `.hand` (Caveat annotation),
  `.tape` (masking-tape chip), `.ag` agenda rows with `.ag-time` pills, `.divider*`
  with the marker `.divider-scribble`, `.ws-btn` tactile buttons, plus the widget
  kits (`.poll-*`, `.ws-sticky*`, `.dv-*`, `.quad*`/`.magnet`, `.timer*`).
- Shared used: `.cards` (rules), `.table` (decision log), `.timeline` (six-week
  map), `.stats` (session summary), `.quote`, `.split`, `.full-bleed`.
- Arc: cover → mission → agenda → §Warm up → rules → pulse poll → §Diverge →
  sticky wall → timer → §Converge → dot vote → 2×2 → §Commit → decision log →
  six-week map → summary stats → quote → close.

## Mobile / responsive

Auto-reflows on phones; the widgets carry a
`@media (max-width: 640px) { html.deck-can-flow … }` block (board 460px, smaller
stickies, stacked poll/vote rows, 240px timer ring). Dragging still works on touch.
If you resize widgets, update that block and re-verify at a true ~390px viewport.

## Durable persistence

The wall, poll, votes, and 2×2 positions use
`window.moldableState('working-session:v1')`. In Slides/Artifacts that state is
stored in the workspace filesystem; when published it is stored per browser by
the artifact host. Stickies therefore survive app restarts and hosted-link
revisits. The timer is deliberately transient, and thumbnails never read or
write state. The sticky wall remains scrollable as ideas pile up.
