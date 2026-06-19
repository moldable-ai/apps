# All-Hands — style guide

Warm, confident company all-hands for a full team. The bundled sample is a
complete 17-slide Q2 quarter-in-review — tailor the company name, quarter, wins,
goals, roadmap, and people to your own.

- Palette: cream `#f7f4ec` background, near-black ink `#1a1c1a`, deep-teal
  `#0f4c4c` (primary), warm-amber `#f0a830` (secondary, for eyebrows + accents).
  Type: display **Clash Display** (Fontshare), body **Satoshi** (Fontshare).
- Imagery: `all-hands-cover.jpg` (warm office gathering — cover + close),
  `all-hands-culture.jpg` (diverse team in conversation — shout-outs split).
  Both crop cleanly at any orientation via `.full-bleed`/`.media`.
- Bespoke signatures:
  - `.numsec` + `.numcircle` (add `.amber`) — big circled section numbers for dividers.
  - `.wins` + `.win` / `.win-tick` / `.win-metric` — amber-tick "win" cards.
  - `.goals` + `.goal-track` / `.goal-fill` (add `.amber`) — OKR progress bars.
  - `.team-grid` + `.tcard` / `.tcard-photo` `.ini` — new-joiner / shout-out photo grid
    (the `.ini` initials placeholder; swap in real headshots via `<img>` if you have them).
  - `.atl` agenda timeline — dotted spine with numbered stops.
  - `.oneline` — oversized one-liner statement of the quarter.
- Shared used: `.stats` (headline metrics), `.bars` (growth deep-dive), `.table`
  (scorecard), `.steps` (priorities), `.timeline` (roadmap), `.checks` (values),
  `.quote` (customer love), `.split` (shout-outs), `.full-bleed` (cover/close).
- Tone: warm and human, celebrate the team. ONE teal accent + amber secondary, no
  gradients on type, generous whitespace. Keep numbers tabular and copy plain-spoken.
- Arc: cover → agenda → quarter-in-one-line + metrics → §01 Our wins → top wins
  (amber-tick cards) → growth deep-dive (bars) → scorecard (table) → customer love
  (quote) → §02 Our focus → priorities (steps) → goals & progress (bars) →
  roadmap (timeline) → §03 Our people → new joiners (photo grid) → shout-outs
  (split) → living our values (checks) → Q&A / thank-you close.
- A `.runner` footer pins on every content slide: brand left, section right.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
