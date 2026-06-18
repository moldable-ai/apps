# Onboarding — style guide

Warm, encouraging new-hire welcome deck for the first day through the first
month. The bundled sample is a complete 18-slide onboarding deck — tailor the
company name, people, tools, and timeline. Speak directly to the new hire
("you", "we"); the tone is friendly and reassuring, never corporate.

- Palette: white `#ffffff`, ink `#1c1917`, sunny-yellow `#f5b800` (the one
  accent). Headings/eyebrows use ink (`--accent-2`); yellow carries chips,
  underlines, bars, and the full-panel section dividers. No gradients.
- Type: display **Quicksand** (rounded, friendly) + body **Inter** (clean).
  Reference only via `var(--display)` / `var(--body)`.
- Imagery: `onboarding-cover.jpg` (bright sunny office abstract — cover + close
  full-bleed) and `onboarding-fig.jpg` (friendly team — the "you belong here"
  `.split.reverse`). Both object-fit:cover and crop at any orientation.
- Bespoke decoration:
  - `.divider/.divider-num/.divider-title/.divider-sub/.divider-rule` — full
    sunny-yellow section panels with ink type.
  - `.checklist/.cl/.cl-box/.cl-t/.cl-d` — first-day checklist cards (yellow
    check token).
  - `.tools/.tool/.tool-ic/.tool-t/.tool-d` — setup & tools grid.
  - `.people/.person/.avatar/.person-name/.person-role/.person-note` —
    people-to-meet cards with a round initial avatar.
  - `.norms/.norm/.norm-k/.norm-t/.norm-d` — "how we work" tiles (yellow top-rule).
  - `.help/.help-card/.help-tag/.help-t/.help-d` — "where to get help" cards.
  - `.note/.note-k` — warm tinted welcome callout.
- Shared used: `.stats` (who we are), `.timeline` (week-by-week), `.steps`
  (30-60-90), `.checks` (values), `.quote` (teammate voice), `.split`, `.full-bleed`.
- A `.runner` footer (brand left, section right) sits on every content slide.
- Arc: cover (Welcome!) → warm note → who we are (.stats) → §Your first day →
  first-day checklist → setup & tools → §Your first week → week-by-week
  (.timeline) → people to meet → how we work (norms) → you belong here (split) →
  §Ramping up → 30-60-90 (.steps) → where to get help → our values (.checks) →
  teammate quote → you've got this / close.
- Density note: keep copy short and human — one idea per card, generous
  whitespace. The yellow is loud, so use it as accent only; let white and ink
  carry the page.
