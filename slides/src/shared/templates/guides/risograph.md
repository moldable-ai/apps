# Risograph — style guide

A community arts-festival manifesto printed like a two-ink risograph zine — bold,
warm, hand-made. The bundled sample is a complete 16-slide story for the fictional
**Riverlight Arts Festival**: a free, locals-made festival of music, print, and
public art on a city riverbank. Swap the festival, dates, line-up, schedule, and
ticket tiers for the real event; keep the screenprint voice.

- Palette: warm cream paper `#f7f1e3` background, near-black ink `#16130d` text,
  warm grey `#6a6354` muted, and the TWO spot inks — riso blue `#2b4cf0` (`--accent`)
  and fluorescent coral-red `#ff5247` (`--accent-2`). Treat them as two ink runs that
  overprint; let them collide rather than blend. No gradients beyond the photo scrim.
- Type: display **Archivo** (heavy 800/900, tight, often uppercase for poster voice),
  body **Inter**. Big confident headlines, punchy short copy, tabular festival numbers.
- Texture: every slide carries a faint two-ink **halftone grain** via `.slide::before`
  (multiply blend) — the printed-paper feel. Don't remove it; it ties the deck together.
- Imagery (both unmistakably risograph): `risograph-cover.jpg` — a bold riso festival
  poster (sun, hills, figures with instruments, blue+coral overprint on cream), used
  full-bleed on the **cover and closing CTA**; `risograph-fig.jpg` — a riso double-bass
  player illustration, used in the featured-moment `.split`. The cover doubles as the
  style preset. Media frames get a hard coral offset shadow (`--media-shadow`).
- Bespoke decoration:
  - `.poster` (+ `.ink` / `.pop` spans) — heavy uppercase poster headline; the spans
    recolour single words into blue / coral.
  - `.chip` (+ `.coral`) — overprint tags: one ink with a misregistered second-ink
    drop shadow. Use for headliner tags and the line-up `.taglist`.
  - `.halftone-rule` — a thick dotted screenprint divider rule.
  - `.riso-card` (+ `.coral`) — flat panels with a hard offset overprint box-shadow,
    alternate the ink per card (the program grid).
  - `.duo` / `.duo-num` / `.duo-title` — full-bleed two-ink colour-block section breaks
    (blue base with a rotated coral wedge; flip the base to coral on the second break).
  - `.lede` — heavy Archivo lead statement; `.col-em` highlights the festival pass row.
- Shared used: `.full-bleed`, `.split.reverse`, `.stats`, `.timeline`, `.bars`,
  `.table`, `.steps`, `.bullets`, `.cols-4`, `.logos`, `.quote/.cite`, `.runner` footer.
- Arc: poster cover → what it is → §The idea (duo) → manifesto (poster statement) →
  the program (riso-card grid) → featured moment (split + bass illustration) → by the
  numbers (stats) → §The details (duo) → schedule (timeline) → line-up & partners
  (chips + logos) → ticket tiers (table) → participant quote → where the money goes
  (bars) → join in (steps) → closing CTA.
- Density: one idea per slide, generous cream negative space, a `.runner` footer
  ("Riverlight" left, section right) on every content slide. Keep type heavy, copy
  warm and concrete, numbers tabular — and let the two inks and the grain do the work.

## Mobile / responsive

The published deck auto-reflows on phones: the fixed 1920×1080 stage becomes a tall,
scrolling, full-width page — columns stack, type/spacing scale down (desktop, tablet,
and landscape are untouched). Most of this is automatic because the deck composes from
the shared vocabulary. This template's bespoke decoration carries a
`@media (max-width: 640px) { html.deck-can-flow … }` block that scales its
hardcoded-px pieces (big titles, custom cards/charts/dividers) down to fit ~390px — if
you change those bespoke sizes or layouts, update that block so the slide still looks
great on a phone. See the Mobile / responsive section of `AUTHORING.md`.
