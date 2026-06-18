# Nonprofit Appeal — style guide

Humane, emotive annual fundraising appeal for a community nonprofit. The bundled
sample is a complete 17-slide appeal for the fictional Rootwell Community
Foundation — tailor the org, story, numbers, and the give details.

- Palette: cream `#f6efe2` (bg), ink `#2b2018` (text), deep-green `#14532d`
  (primary accent — charts, donut, give button), earth-brown `#6b4226`
  (secondary — eyebrows, dividers, the highlighted donor tier). Muted `#7a6a58`.
  Restraint: one green + one brown, generous cream whitespace, no gradients.
- Type: display **Bitter** serif (warm, bookish; italic for the story quote),
  body **Inter**. Reference via `var(--display)` / `var(--body)` only.
- Imagery (photographic, humane, golden-hour): `nonprofit-appeal-cover.jpg`
  (cover + give CTA full-bleed — intergenerational garden portrait),
  `nonprofit-appeal-story.jpg` (beneficiary portrait, used in the `.split`),
  `nonprofit-appeal-impact.jpg` (shared-meal scene, full-bleed behind the
  beneficiary quote). All crop cleanly via object-fit:cover.

## Signature decoration

- `.impact` — full-width forest-green stat band (`.impact-cell` / `.impact-num` /
  `.impact-label`); the headline "impact this year" lego.
- `.tier` / `.tcard` — donor-tier ledger cards with a brown top-rule; add
  `.feature` to mark the recommended tier (green rule). `.tcard-amt` / `.tcard-name`.
- `.statement` — one big serif human line for "the need"; `<b>` turns key words green.
- `.story-q` — large italic serif beneficiary quote, white over the full-bleed scrim.
- `.give` — warm pill give button (auto arrow); `.give-way` outline pills for
  alternate ways to give (text, phone) on the CTA.
- `.divider` (`-num/-title/-rule`) — cream section break with an inset hairline frame.
- `.note` / `.note-k` — earth-brown framed callout for the funding-gap stakes.
- `.legend` — donut legend rows for "where your gift goes".

## Shared components used

`.full-bleed` + `.split` (story), `.bars` (funding gap), `.donut` (allocation),
`.flow` (how we work), `.timeline` (matching milestones), `.table` (ways to give),
`.checks`, `.pill`, `.cite`, `.runner` footer on content slides.

## Narrative arc

cover → the need (statement) → §Who we serve → Maria's story (split) → impact
this year (stat band) → how we work (flow) → her words (full-bleed quote) →
§The gap → the funding gap (bars) → where your gift goes (donut + legend) →
donor tiers → ways to give (table) → matching & milestones (timeline) →
§Join us → why now (checks) → give CTA (full-bleed).

## Density notes

Let one photograph and one number carry each slide — emotive, never clinical.
Keep figures tabular. Eyebrows and dividers use the brown; charts and the ask
use the green so the call-to-action reads as the single loudest moment.
