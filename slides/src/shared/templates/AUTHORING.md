# Authoring a template (read this fully before writing code)

A template is **not** a theme — it is a **complete, fully-filled-in presentation**
that a coding agent will later _tweak_ rather than invent from scratch. If a deck
looks basic, agents assume the deck is meant to stay basic. So every template must
be **comprehensive (15–18 slides), tells one clear story, and looks like a design
studio made it.** Each template has its **own** design language. We do **not** want
templates to be re-skins of one another — only utility components (charts, diagrams)
are shared.

## Where things go

- **Module**: `src/shared/templates/decks/<id>.ts` — `export const <camelName>: Template = { … }`.
- **Style guide**: `src/shared/templates/guides/<id>.md` — the design rationale (see below).
- **Images**: optimized JPGs in `template-assets/`, referenced from slides as `assets/<file>`.
- **Do NOT edit** `catalog.ts`, `index.ts`, `types.ts`, or the picker. The lead wires
  your module into `catalog.ts` after review. This keeps parallel work collision-free.

## The `Template` shape (see `../types.ts`)

```ts
export const myTemplate: Template = {
  id: 'kebab-id', // must equal the filename
  name: 'Title Case Name',
  tagline: 'one evocative line shown in the picker',
  categories: ['Reporting', 'Strategy'], // from the taxonomy below; first = primary
  audiences: ['exec', 'board'], // drives chat suggestions
  description: 'one or two sentences for the picker detail',
  fonts: {
    display: 'Fraunces',
    body: 'Inter',
    mono: 'IBM Plex Mono', // optional
    links: ['https://fonts.googleapis.com/css2?family=...&display=swap'],
  },
  tokens: {
    '--bg': '#0d0f14',
    '--text': '#f5f3ee',
    '--accent': '#c2453d' /* … */,
  },
  stageBg: '#07080b', // letterbox color around the 16:9 stage
  decoration: `/* bespoke CSS — your signature look */`,
  notes: 'guidance appended to the chat coding-prompt for decks on this style',
  assets: ['<id>-cover.jpg', '<id>-fig.jpg'],
  sampleSlides: [
    /* 15–18 Slide objects */
  ],
}
```

Taxonomy for `categories` (use these exact strings): **Company, Creative, Education,
Reporting, Project Management, Fundraising, Sales, Marketing, Consulting, People,
Strategy**. A template may list 1–3.

### Slide objects

```ts
const s = (slide: Slide): Slide => slide
// …
s({ id: '<id>-1', name: 'Cover', slideClass: 'title-slide', transition: 'fade',
    bodyHtml: `<div class="full-bleed">…</div>` }),
```

`bodyHtml` is the **inner HTML of one `<section class="slide">`** authored at
**1920×1080**. Slide ids must be unique within the deck (`<id>-1`, `<id>-2`, …).
Set `transition` per slide (`fade` / `slide` / `zoom`). Add `class="reveal"` to
elements that should animate in.

## The component vocabulary (compose from this — see `../types.ts` `BASE_COMPONENTS_CSS`)

Use these classes; they are token-driven so your tokens restyle them:

- **Layout**: `.pad` (`.center`/`.top`/`.end`), `.two-col`, `.cols-2/3/4`, `.row`, `.spacer`.
- **Type**: `.kicker` (`.lockup`), `.display`, `.title`, `.headline`, `.subhead`, `.lead`, `.body`, `.fine`, `.muted`, `.accent-text`.
- **Lists**: `.bullets>.bullet`, `.checks>.check`, `.steps>.step` (auto-numbered).
- **Cards/data**: `.cards>.card` (`--cols`), `.metric`/`.metric-label`, `.stats>.stat`, `.table` (`.num`/`.pos`/`.neg`/`.row-em`).
- **Charts (CSS-only)**: `.donut` (`--p` percent), `.bars>.bar>.bar-fill` (`--h` height %).
- **Diagrams**: `.flow>.flow-step`/`.flow-arrow`, `.timeline>.tl-row>.tl-when`/`.tl-what`.
- **Media**: `.split` (`.reverse`/`.wide-media`), `.hero` (`.reverse`), `.full-bleed`+`.bleed`+`.scrim`, `.media>img`, `.caption`.
- **Quote/section/accents**: `.quote`+`.cite`, `.section`+`.section-num`/`.section-title`, `.pill`, `.tag`, `.kbd`, `.rule`, `.accent-bar`, `.runner` (cohesive footer).

Reference colors/fonts **only through tokens** (`var(--accent)`, `var(--display)`),
never hardcoded. Write **bespoke CSS in `decoration`** for your signature elements.

## The richness bar (a deck MUST have all of these)

1. **A narrative arc**, not a pile of slides. Pick a real subject for this template's
   use case and tell its story start→finish. Number sections in the eyebrows.
2. **15–18 slides** including: a **full-bleed cover** with generated imagery; an
   agenda/overview; **2–3 section dividers**; content slides mixing bullets, steps,
   and cards; **≥1 data slide with a chart** (donut or bars) and **≥1 table**; **≥1
   diagram** (flow or timeline); **≥1 stat row**; **≥1 image layout** (split/hero);
   **≥1 pull-quote**; a closing/CTA slide.
3. **Bespoke `decoration`** — at least 4–6 signature classes unique to this template
   (e.g. a custom card style, a divider treatment, a chip, a data callout). This is
   what makes it _not_ a re-skin.
4. **Generated imagery** (2–4 images) — see below. Cover + at least one in-body figure.
5. **A `.runner` footer** on content slides for system cohesion (brand left, section right).

## Design quality (non-negotiable)

- **Restraint.** No gradient text, no gradient backgrounds, no rainbow. One confident
  accent (maybe a secondary). Generous whitespace. Let type and one image carry it.
- **Type scale with contrast** — a big confident display, calm body. Use real type
  pairings (a characterful display + a clean body).
- **Each template must look distinct** from the others — different fonts, palette,
  and decoration. Study two exemplars before starting:
  `decks/executive-review.ts` (dark, editorial, data-dense) and `decks/consulting.ts`
  (warm light, serif, structured). Match _that level of finish_, not their look.
- Principles to internalize (pitch-deck craft): cohesive narrative, one idea per
  slide, treat the deck as a product, ruthless editing.

## Generated imagery (the proxy)

Generate real art — never ship placeholder boxes. Use this Node script pattern
(save as `/tmp/gen-<id>.mjs`, run with `node`):

```js
import fs from 'node:fs'

const token = JSON.parse(
  fs.readFileSync(process.env.HOME + '/.moldable/cache/app-tokens.json'),
).images
async function gen(prompt, size, out) {
  const r = await fetch('http://127.0.0.1:39200/api/llm/images', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-moldable-app-id': 'images',
      'x-moldable-app-token': token,
    },
    body: JSON.stringify({
      appId: 'images',
      purpose: 'presentation-image-generation',
      path: '/v1/images/generations',
      body: {
        model: 'gpt-image-2',
        prompt,
        n: 1,
        size,
        quality: 'medium',
        output_format: 'png',
      },
      timeoutMs: 900000,
    }),
  })
  const j = await r.json()
  fs.writeFileSync(out, Buffer.from(j.response.json.data[0].b64_json, 'base64'))
  console.log('wrote', out)
}
await gen('<your art-direction prompt>', '1536x1024', '/tmp/<id>-cover.png')
```

- ~50s per image. Sizes: `1536x1024` (landscape/cover), `1024x1536` (portrait), `1024x1024` (square).
- **Art-direct the prompt**: name the medium, palette (match your tokens), mood,
  composition, and "no text, no words, no logos". Aim for fine-art / editorial photography,
  not clip-art.
- **Optimize before committing**: convert PNG→JPG ~1536px wide, q85, into
  `template-assets/<id>-<role>.jpg` (use `sips` or `magick`). Then reference `assets/<id>-<role>.jpg`
  and declare each in the module's `assets: []`.
- Asset filenames are **prefixed with the template id** to avoid collisions
  (`<id>-cover.jpg`, `<id>-fig.jpg`, `<id>-section.jpg`).

## The style guide (`guides/<id>.md`)

Short and practical: the story the deck tells, the palette + fonts (with hexes/names),
the signature `decoration` components and when to use them, the image art-direction,
and any density notes. ~30–60 lines. Mirror the existing guides in `guides/`.

## Before you hand off — self-check

- `npm run check-types` passes (your module compiles).
- No hardcoded font names / colors outside `tokens` + `decoration`.
- Unique slide ids; 15–18 slides; every richness-bar item present.
- Imagery generated, optimized, in `template-assets/`, declared in `assets:[]`.
- Never name or reference any third-party presentation product (legal). Real-world
  subject matter (e.g. "Quarterly Business Review") is fine; product names are not.
- You did **not** edit `catalog.ts`/`index.ts`/`types.ts`/picker.

Report back: the `id`, camel export name, categories, slide count, asset filenames,
and a one-line description of the story — so the lead can wire it in and review.
