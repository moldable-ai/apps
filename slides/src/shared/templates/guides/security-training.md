# Security Training — style guide

Training as a game, not a lecture. The bundled sample is an 18-slide, 45-minute
security-awareness session for a fictional company ("Northwind") built as three
drills the audience _does_ inside the deck. Keep every prop clearly fictional
(example domains) — never a real brand.

- Palette: warm paper `#f5f2ea`, near-black ink `#1d1e21`, ONE hazard orange
  `#d4531e` accent, steel blue `#44618c` sparingly. Positive `#3c7a4e`, negative
  `#b3402e`, amber `#b98a2e` for the "warn" middle ground. Dark panels (`#1d1e21`)
  for the SMS mock and crack-time readout.
- Type: **Barlow Condensed** display (headings are uppercase via decoration),
  **Barlow** body, **Space Mono** for kickers/labels/spec chips.
- Imagery: one still life — brass padlock + orange cord (`security-training-cover.jpg`)
  on cover and close. Everything else is typographic.
- Interactive (runtime.js — keep `data-deck-interactive` on widget roots):
  - **Find-the-flags game** `[data-phish]` — five `.ph-spot` buttons hidden in a
    mock email; clicks reveal the matching `.flag` explanations, counter + done
    banner + reset. If you edit the email, keep `data-flag` ids in sync with the
    `FLAGS` map in runtime.js.
  - **Branching scenario** `[data-scenario]` — three `.sc-choice` responses to a
    CEO-impersonation text; each shows a verdict panel (Risky / Better / Right call).
  - **Crack-time lab** `[data-crack]` — length slider + charset toggles → time-to-
    crack label and log-scale bar (local math, 1e10 guesses/sec assumption).
  - **Scored quiz** `[data-quiz]` — three questions rendered from the `QUIZ` array,
    instant right/wrong + why, score panel with retry.
  - Click-builds on the anatomy-of-an-attack timeline (+ `data-deck-advance`).
- Bespoke decoration: `.hazard` stripe rule, `.spec` mono chips, `.drill` agenda
  rows, `.divider*`, `.st-btn` manual buttons, the mock-email kit (`.mail*`,
  `.ph-spot`, `.flag*`), scenario kit (`.sc-*`), crack kit (`.crack-*`), quiz kit
  (`.qz-*`).
- Shared used: `.stats` (why it matters), `.table` (the four tells), `.timeline`
  (attack anatomy + if-you-clicked), `.flow` (MFA), `.bars` (passphrase compare),
  `.quote`, `.full-bleed`.
- Arc: cover → why it matters → three drills → §Spot it → attack anatomy → find the
  flags → the tells → §Call it → scenario → crack lab → passphrases → MFA →
  §Prove it → quiz → report it → if you clicked → quote → close.

## Mobile / responsive

Auto-reflows on phones; the widget kits carry a
`@media (max-width: 640px) { html.deck-can-flow … }` block (stacked email/flags,
stacked scenario and crack lab, smaller quiz type). If you change widget layouts,
update that block and re-verify at a true ~390px viewport.

## Durable persistence

Found flags, the scenario pick, crack-lab settings, and quiz progress use
`window.moldableState('security-training:v1')`. Local app state lives in the
active workspace filesystem; published state lives per browser in the artifact
host. Reset and retry write the cleared state back. Thumbnails never read or
write state. The email and flag-list columns scroll internally as explanations
expand.
