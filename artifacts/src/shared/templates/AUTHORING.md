# Authoring a template

A template is **not** a theme — it is a **complete, fully-filled-in artifact** that
a coding agent will later _tweak_ rather than invent from scratch. Every template
has its **own** design language and looks like a design studio made it. There are
two kinds.

## Page templates (`pages/<id>.ts`) — the primary kind

A page is one self-contained, scrolling, responsive web page (HTML + CSS + JS).
The exemplar is **`pages/analytics-dashboard.ts`** — read it first; it shows the
module shape and the quality bar.

Module shape:

```ts
import type { Template } from '../types'
const CSS = `…`; const HTML = `…`; const JS = `…`
export const myPage: Template = {
  id: 'my-page', kind: 'page', name, tagline, categories, audiences, description,
  fonts: { display, body, links: ['https://fonts.googleapis.com/…'] },
  stageBg: '#0a0b0f', notes?, assets?,
  samplePage: { fontLinks: [...], libs: [], css: CSS, html: HTML, js: JS, background: '#0a0b0f' },
}
```

What the renderer provides for free (see `../render.ts`): a CSS reset, `--page-bg`
from `background`, scroll-reveal (`class="reveal"` + `data-reveal="left|right|scale"`,
the controller adds `.in` — key animations off `.reveal.in <sel>`), scroll progress
vars `--scroll`/`--scroll-y`, and `prefers-reduced-motion` handling. The CSP allows
https CDN `<script>` libs (declare in `samplePage.libs`) + inline scripts.

Rules:

- Hand-roll charts/visuals in SVG or `<canvas>` (no chart libs). Tabular numerals
  for figures. Distinctive type, committed palette, generous spacing, tasteful motion.
- **Fully responsive** (380px → wide desktop): `clamp()`, fluid grids, a
  `@media (max-width:~820px)` block collapsing columns.
- **TypeScript-safe strings**: inside the backtick `const`s escape any literal
  backtick (`` \` ``) and any literal `${` (`\${`). In `js` prefer string
  concatenation over template literals so the file always compiles.
- Images: reference generated images as `assets/<file>` and list them in `assets`;
  they live in `template-assets/` and are copied into an artifact on create.

## Deck templates (`decks/<id>.ts`) — carried from Slides

A deck is a 16:9 slide presentation built from the shared component vocabulary in
`types.ts` (`BASE_COMPONENTS_CSS` / `COMPONENT_VOCABULARY`). Set `kind: 'deck'`,
design tokens (`tokens`), bespoke `decoration` CSS, and a rich `sampleSlides`
array. Each slide's `bodyHtml` is the inner HTML of a 1920×1080 stage; it
auto-reflows on phones. See an existing deck (e.g. `decks/bold-founder.ts`).

## Wiring (don't hand-edit generated files)

Drop your module in `pages/` or `decks/`, then run
`node scripts/build-catalog.mjs` (regenerates `catalog.ts`) and add the id to the
`ORDER` list in that script. Regenerate gallery thumbnails with
`node scripts/gen-thumbs.mjs` (needs the QA server: `MOLDABLE_PORT=8799 npx tsx
src/server/index.ts`). Do **not** hand-edit `catalog.ts`, `index.ts`, `types.ts`,
or the picker.
