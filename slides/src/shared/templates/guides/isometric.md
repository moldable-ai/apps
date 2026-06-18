# Style: Isometric

A bright, modern deck for a **cloud developer platform**, built around clean
**isometric 3D** imagery — matte clay servers, tidy miniature dioramas, and
glowing cyan pipelines. The chrome stays crisp and contemporary; the _medium_
shows in the imagery, the indigo + cyan duo, and the layered "stack" decoration.

## The story it tells

A problem-to-platform pitch for **Strata**, a cloud platform that turns a `git push`
into a global deployment. Cover → the problem (infra eats the roadmap) → the stakes →
**Section: The platform** → what it is (split with the isometric product scene) →
how it works (the four-move step flow) → core capabilities → integrations →
**Section: The proof** → performance (bars) → reliability (table with status pills) →
a customer quote → scale metrics (the band) → pricing tiers → rollout (timeline) →
the ask → closing CTA. Swap "Strata" and the numbers for the real platform.

## Palette & type

- **Background** `#f7f8fb` off-white, **stage** `#eceef4`.
- **Ink** `#1e293b` slate; **muted** `#64748b`.
- **Accent (primary)** `#4338ca` indigo — kickers, metrics, bars, primary fills.
- **Accent-2** `#06b6d4` cyan — bullets, flow arrows, the second divider rule, node dots.
- One confident duo, no gradients on type. Let the isometric image carry the depth.
- **Display** Space Grotesk (700), **body** Inter, **mono** IBM Plex Mono for kickers,
  card glyphs, and tags. Reference everything via tokens (`var(--display)`, `var(--accent)`).

## Signature decoration (when to use it)

- **`.stackgrid` / `.stack`** — layered "stack" cards with two offset shadow plates
  behind each card for an isometric sense of depth. Use for core capabilities or any
  3-up / 6-up feature grid. The `.stack-ic` chip holds a mono glyph (`{}`, `>_`, `◉`).
- **`.nodes` / `.node`** (`.node.indigo`) — connector chips with a glowing dot. Use for
  integrations, supported runtimes, or an inline tech-tag cluster. Mix indigo and cyan dots.
- **`.band` / `.band-cell` / `.band-num`** — a full-width metrics strip with hairline
  cells; wrap the unit in `<span class="u">` to tint it cyan. Use for scale / "at a glance".
- **`.sflow` / `.scard`** — connected step cards joined by `.flow-arrow`. Use for the
  architecture / "how it works" sequence (keep it to 3–5 steps).
- **`.divider`** — section break over a faint isometric grid wash; `.divider-rule` ends
  in a short cyan tail. Number sections in the `.divider-num` eyebrow.
- **`.callout`** (cyan left-rule) for the cost of the status quo; **`.status`** pills
  (`.on` / `.watch`) for the reliability table; **`.col-us`** to highlight the recommended
  pricing row.

## Imagery (both clean isometric 3D)

Repeat the medium keywords in every prompt: _clean isometric 3D render, true 30°
isometric, soft studio lighting, matte clay/plastic materials, subtle ambient occlusion,
tidy miniature-diorama look, indigo + cyan on off-white_. End every prompt with
"no text, no words, no letters, no logos".

- **`isometric-cover.jpg`** — a glowing isometric data-center "city": stacked matte
  server racks and modular cloud towers, slim cyan data conduits and indigo connectors,
  a soft cyan halo at the center, generous off-white space. Full-bleed cover + closing CTA.
- **`isometric-scene.jpg`** — an isometric product/workflow scene: a central console
  block wired by cyan pipelines to service cubes (database, deploy pad, dashboard) on a
  clean isometric grid floor. Used in the "what it is" split.

## Density notes

Keep numbers tabular and one idea per slide. Pin the `.runner` footer (brand left,
section right) on every content slide; section dividers and the cover/close/quote omit it.
The two full-bleed bookends (`assets/isometric-cover.jpg`) frame the deck.
