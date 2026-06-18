# Company Overview — style guide

Confident modern "who we are" company profile, for corporate intros, investor
overviews, and recruiting. The bundled sample is a complete 18-slide profile of a
fictional commerce platform (Northbeam) — tailor the company, numbers, and team.

- Palette: white `#ffffff`, ink-navy `#0b1f3a` (text + dark bands), coral
  `#ff6b5e` (the one accent). Muted slate `#5a6b82`. No gradients, no second hue.
- Type: display **Bricolage Grotesque** (700/600), body **Inter**. Reference only
  through tokens (`var(--display)`, `var(--body)`).
- Imagery: `company-overview-cover.jpg` — a low-angle architectural navy facade with
  a single coral window glow (cover + closing full-bleed). `company-overview-fig.jpg`
  — a bright modern office with a coral accent chair (the "who we serve" split).

## Signature decoration (when to use)

- `.statement` — a full-bleed navy mission slide; one big white line with `<em>` on the
  coral phrase, over a coral `.statement-rule`. Use once, right after the cover.
- `.divider` / `.divider-num` / `.divider-title` / `.divider-rule` — clean white section
  breaks with a coral eyebrow + rule. Number the acts (01–03).
- `.bignums` / `.bignum` — the oversized key-number impact band (hairline-divided,
  coral figures). Use for "impact by the numbers".
- `.dowhat` / `.do-card` — "what we do" cards with a coral corner-tab (`::before`). Also
  reused (shadowless) as the panels inside the shared `.flow` for "how it works".
- `.footprint` / `.foot-cell` — a navy markets band; `<em>` tints a digit coral. Pairs
  with a markets `.table` + `.legend` region split.
- `.team` / `.person` / `.person-av` — leadership row of portrait-initial cards.
- `.callout` / `.callout-k` — coral left-rule callout for the cost-of-the-problem.
- `.legend` / `.legend-row` / `.legend-dot` — region share rows beside the table.

## Shared components used

`.full-bleed` (cover/close), `.steps` (agenda), `.bullets` + `.callout` (problem),
`.flow` (how it works), `.bars` (traction), `.split.reverse` (who we serve), `.table`
(markets), `.checks` (values), `.timeline` (where we're going), `.quote` (founder),
`.stats`, `.runner` footer on every content slide.

## Arc

cover → mission statement → agenda → §Why we exist → problem → §What we do →
what-we-do cards → how it works (flow) → §Our impact → impact bignums → who we serve
(split) → traction (bars) → footprint + markets table → team & leadership row →
values (checks) → where we're going (timeline) → founder quote → contact/close.

## Density notes

Restraint over decoration — generous whitespace, one idea per slide, tabular numbers.
Coral is for emphasis only (key figures, one phrase, rules); never tint whole blocks.
The two navy bands (mission, footprint) carry the dark contrast — don't add more.
