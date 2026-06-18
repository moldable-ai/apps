# Team Retrospective — style guide

Friendly, soft deck for running a sprint (or project) retrospective with a team.
The bundled sample is a complete 17-slide retro for a fictional "Team Aurora,
Sprint 24" — retheme the team, sprint number, notes, votes, and action owners.
The shared `.flow` arrow diagram carries the retro process (Surface → Group →
Vote → Commit), wrapping `.theme` cards as its steps.

- Palette: warm off-white `#faf7f2` (bg), plum-ink `#221f2e` (text), muted
  `#6b6678`, indigo `#4f46e5` (primary accent), soft coral `#fb7185` (secondary).
  Cards are pure white with a soft shadow. ONE indigo + one coral — no third color,
  no gradients. Type: display **Cabinet Grotesk** (800), body **Inter**.
- Tone: human and blame-free. Celebrate wins, name what slowed the team, leave
  with clear owners. Rounded corners everywhere; generous whitespace.
- Imagery: `team-retrospective-cover.jpg` (full-bleed cover + close) — soft warm
  torn-paper collage in the palette; `team-retrospective-fig.jpg` (the team
  `.split` moment) — a candid workshop photo of a team around sticky notes.
  Section breaks are image-free warm `.divider`s with a faint coral wash.
- Bespoke decoration:
  - `.note` sticky cards — slightly rotated, soft shadow, dog-eared tape corner;
    auto-rotate and recolor per column position. Add `.note-t` / `.note-d` /
    `.note-meta` (the author chip). Use for wins and "what slowed us down" on `.notes`.
  - `.mood` meter — `.mood-scale` of `.mood-seg`/`.mood-seg.fill`(`.alt` for coral),
    `.mood-faces`, and a big `.mood-score`. Use for the opening check-in.
  - `.ssc` board — three `.ssc-col` (`.start` green / `.stop` coral / `.cont` indigo)
    with an `.ssc-h` heading and an `.ssc-list`. The improve-phase centerpiece.
  - `.theme` cards with `.theme-rank` + a `.votes` row of `.vdot` (`.muted` = empty)
    and a `.vcount` — for the prioritized, voted-on themes.
  - `.action` rows — `.action-box` checkbox, `.action-t`, an `.action-owner` with an
    `.action-av` avatar (`.alt` = coral), and an `.action-due` tag. The commitments.
  - `.softchip` — a small friendly white pill for counts/notes.
- Shared used: `.full-bleed`, `.split`, `.bars` (velocity), `.stats`, `.flow`
  (retro process), `.table` (action register), `.steps`, `.quote`, `.divider`,
  `.runner` footer on content slides.
- Arc: cover → how it felt (mood meter) → sprint at a glance (stats) →
  §What happened → wins (sticky notes) → what slowed us down (sticky notes) →
  the data (velocity bars) → team moment (photo split) → §Let's improve →
  how we turn talk into change (flow) → start/stop/continue → top themes
  (vote dots) → action items (owners) → action register (table) → team quote →
  commitments & close.
- Density: keep it warm and airy — one idea per slide, six sticky notes max per
  board, real owner names and due dates on every action. Resist a third color.
