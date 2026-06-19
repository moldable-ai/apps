# Course Curriculum — style guide

Warm, structured syllabus for an online course. The bundled sample is a complete
16-slide syllabus for an 8-week "Writing for the Web" course — tailor the course
title, modules, schedule, and weighting to your own subject.

- Palette: cream `#fdf6e3`, deep forest-green `#14532d` (ink + primary accent),
  antique gold `#ca8a04` (eyebrows, checks, rules). Type: display **Lora** serif,
  body **Inter**. Generous whitespace, no gradients — gold is the only flourish.
- Imagery: `course-curriculum-cover.jpg` (scholarly still-life — cover + enroll
  close), `course-curriculum-fig.jpg` (study workspace — module deep-dive split).
  Section breaks are clean cream `.divider`s with a gold rule.
- Bespoke decoration:
  - `.modules/.mod/.mod-n/.mod-t/.mod-d/.mod-meta` — numbered module cards with a
    gold-ring number. The signature element; also reused inside `.flow`.
  - `.level` difficulty pills (`.beginner`/`.intermediate`/`.advanced` recolor the dot).
  - `.reslist/.res/.res-ic/.res-t/.res-d/.res-tag` — gold-tab resource rows.
  - `.note/.note-k` gold left-rule callout; `.ag*` agenda rows; `.lede` oversized serif.
  - `.divider/.divider-num/.divider-title/.divider-rule`.
- Shared used: `.checks` (learning outcomes, tools, lessons), `.stats` (at a glance),
  `.timeline` (weekly schedule), `.table` (assessment weighting), `.bars` (workload),
  `.flow` (weekly path), `.quote` (instructor), `.cards` (FAQ), `.split.reverse` + `.hero`.
- Arc: cover → welcome &amp; who it's for → outcomes (checks) → §The curriculum →
  course at a glance (stats) → modules overview (cards) → module deep-dive (split) →
  weekly schedule (timeline) → assessment (table) → tools &amp; resources (reslist) →
  §Logistics → workload (bars) → instructor (quote) → good to know (cards) → your
  path (flow) → enroll/close.
- Density: one teaching idea per slide; keep level pills and resource tags short;
  let the gold accent stay sparse so the green and cream carry the calm.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
