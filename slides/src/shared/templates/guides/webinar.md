# Webinar — style guide

Friendly, speaker-led deck for a live online session — webinars, community
talks, teaching hours. The bundled sample is a complete 18-slide
welcome-to-thank-you session ("Write less, ship more"); tailor the topic,
host, polls, and numbers.

- Palette: white `#ffffff` + soft cream `#f6f7fb` (stage/divider field), ink
  `#15233b`, muted `#647189`, one warm cobalt-blue accent `#2563eb`. No
  gradients, no second hue — let the blue and one image carry it.
- Type: display **Plus Jakarta Sans** (rounded, friendly, weight 800 for hooks),
  body **Inter**. Loaded from Google Fonts via `theme.fontLinks`; reference only
  through `var(--display)` / `var(--body)`.
- Imagery: `webinar-cover.jpg` — a friendly abstract blue/cream illustration for
  the full-bleed cover and the thank-you close. `webinar-fig.jpg` — a warm
  candid photo of the speaker presenting from a bright studio, used in the
  `.speaker` card and a key-concept `.split`.

## Signature decoration (when to use)

- `.hook` + `.hook-rule` — the oversized welcome / "your turn" line with an
  accent underline. Use sparingly on the cover-adjacent and Q&A moments.
- `.speaker` / `.speaker-photo` / `.speaker-name` / `.speaker-role` /
  `.speaker-bio` / `.socials` + `.social` — the meet-your-host card (portrait
  left, bio + social pills right).
- `.takes` / `.take` (`--cols`) — friendly rounded key-takeaway cards with a
  numbered chip; also reused as labelled nodes inside the shared `.flow`.
- `.callout` + `.callout-k` — the live poll / Q&A / "try this" callout; the
  eyebrow has a pulsing accent dot for "we're live" energy.
- `.poll` / `.poll-row` / `.poll-bar` / `.poll-fill` / `.poll-pct` — horizontal
  live-vote bars (`--v` = fill %).
- `.reslist` / `.res` / `.res-ic` / `.res-tag` — the resources / next-reads rows.
- `.cta` / `.cta-k` / `.cta-line` — the bordered invitation block on the close
  (white-on-image).
- `.divider*` — quiet cream section field with a soft blue rule.

## Shared components used

`.full-bleed` (cover + close), `.steps` (agenda + framework), `.stats` (the
problem), `.bars` (the data point), `.table` (before/after results), `.flow`
(the decision-loop concept), `.split` (key concept + figure), `.quote` (a real
example), `.checks` / `.bullets`, `.runner` footer on every content slide.

## Arc

cover → housekeeping (`.checks`) → meet your speaker (`.speaker`) → what you'll
learn (`.steps`) → §The topic → the problem (`.stats`) → concept 1 (`.split`) →
concept 2 (`.flow`) → a data point (`.bars`) → before & after (`.table`) → a real
example (`.quote`) → live poll (`.poll`) → §Apply it → three takeaways
(`.takes`) → a quick framework (`.steps`) → resources (`.reslist`) → live Q&A
(`.callout`) → thank-you + CTA (`.cta`) close.

## Density notes

Warm and spacious — write like you're talking to the room, not pitching a board.
Keep numbers tabular, one idea per slide, and let the rounded corners and cream
field keep it light. Polls and the Q&A callout are what make it feel _live_ —
keep at least one of each.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
