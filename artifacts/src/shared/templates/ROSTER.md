# Template roster

The Artifacts library has two kinds of template. **Page** templates (the primary
kind) are complete, self-contained scrolling web pages — a whole "showcase of what
a static site can be," from résumés to dashboards to games to WebGL. **Deck**
templates are 16:9 slide presentations (carried from Slides). Every template ships
a fully filled-in sample — a real artifact to tweak, not a skeleton.

Wiring: page modules live in `pages/<id>.ts`, deck modules in `decks/<id>.ts`,
each `export const <camelId>: Template`. After adding a module, add its id to
`ORDER` in `scripts/build-catalog.mjs` and run that script (regenerates
`catalog.ts`), then `node scripts/gen-thumbs.mjs` (regenerates gallery
thumbnails — needs the QA server on :8799). Authoring contract: `AUTHORING.md` +
the exemplar `pages/analytics-dashboard.ts` (and `pages/three-d-orb.ts` for
WebGL/canvas).

Picker categories (8): **Personal · Marketing · Business · Writing · Dashboards ·
Games · 3D · Decks** — a template's first `categories` entry is its primary chip.

## Page templates

### Personal

| id               | name             | what it is                                                                                                   |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `resume`         | Resume / CV      | Studio-grade one-page résumé: serif name, hand-rolled skill bars, hairline experience timeline, print-clean. |
| `personal-site`  | Personal Website | Warm "hi, I'm \_\_\_" homepage: portrait hero, about, now-list, work + writing cards.                        |
| `portfolio`      | Design Portfolio | Asymmetric work grid where every tile is its own CSS/SVG generative artwork with hover reveals.              |
| `link-in-bio`    | Link in Bio      | Mobile-first glass link hub over an animated mesh gradient.                                                  |
| `pet-page`       | Meet My Pet      | Adorable pastel pet page: big wordmark, photo gallery, fun-fact chips, daily-schedule timeline.              |
| `travel-journal` | Travel Journal   | Cinematic day-by-day trip recap: full-bleed parallax hero, alternating photo days, route map.                |
| `wedding`        | Wedding          | Elegant invite: full-bleed hero, live countdown, story, schedule, RSVP (visual), gallery.                    |

### Marketing

| id               | name            | what it is                                                                                   |
| ---------------- | --------------- | -------------------------------------------------------------------------------------------- |
| `landing-page`   | Landing Page    | SaaS product landing: sticky nav, hero image, features, pricing, testimonial, CTA.           |
| `pitch-onepager` | Pitch One-Pager | Startup one-pager: problem/solution, traction, market, team, the ask.                        |
| `agency`         | Creative Agency | Bold kinetic agency site: marquee, all-code work reel, big-number services, giant CTA.       |
| `pricing`        | Pricing         | Polished SaaS pricing: monthly/annual toggle, 3 plan cards, comparison table, FAQ accordion. |
| `coming-soon`    | Coming Soon     | Premium launch/waitlist page: animated background, live countdown, email capture (visual).   |
| `case-study`     | Case Study      | Visual scrollytelling case study: full-bleed imagery, parallax, pull quotes, results.        |

### Business

| id              | name           | what it is                                                                                           |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `business-home` | Local Business | Trustworthy local-business home: services, stats, star-rated testimonials, hours + map, booking CTA. |
| `restaurant`    | Restaurant     | Appetizing bistro page: full-bleed hero, leader-dot menu, featured plates, gallery, reservations.    |
| `course`        | Online Course  | Teaching/course landing: outcomes grid, curriculum accordion, instructor, pricing, FAQ.              |
| `event-conf`    | Conference     | High-energy conference site: countdown, speakers grid, tabbed schedule, sponsor tiers, tickets.      |

### Writing

| id             | name          | what it is                                                                               |
| -------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `blog`         | Blog          | Typography-forward blog index: featured post, latest list with tags, newsletter strip.   |
| `article`      | Article       | Sublime long-form reader: progress bar, drop cap, pull quotes, footnotes, author bio.    |
| `recipe`       | Recipe        | Beautiful usable recipe: meta chips, check-off ingredients, numbered steps, print-clean. |
| `docs`         | Documentation | Dev docs: sticky sidebar + scrollspy TOC, copy-button code blocks, admonitions, tabs.    |
| `changelog`    | Changelog     | Scannable release-notes timeline: version badges, colored tags, JS filters.              |
| `product-spec` | Product Spec  | PRD doc: sticky scrollspy TOC, status pills, requirements table, milestone timeline.     |

### Dashboards

| id                    | name                | what it is                                                                                         |
| --------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `analytics-dashboard` | Analytics Dashboard | Product metrics: KPI cards, gradient area chart, funnel, retention heatmap, table (SVG/CSS).       |
| `financial-report`    | Financial Report    | Investor report: revenue+growth combo chart, P&L table, waterfall, guidance.                       |
| `crypto-dashboard`    | Markets Dashboard   | Neon markets tracker: ticker sparklines, SVG price chart with range tabs, allocation donut, table. |
| `fitness-stats`       | Fitness Dashboard   | Activity dashboard: animated SVG rings, weekly bars, heart-rate line, streak heatmap.              |
| `weather`             | Weather             | Delightful weather page: animated SVG sky/icon, hourly curve, 7-day range bars, detail gauges.     |

### Games

| id              | name         | what it is                                                                              |
| --------------- | ------------ | --------------------------------------------------------------------------------------- |
| `moldable-bird` | MoldableBird | A polished, playable Flappy-Bird-style canvas game.                                     |
| `snake`         | Snake        | Polished neon Snake: rounded gradient body, glowing food, high score, keyboard + D-pad. |
| `breakout`      | Breakout     | Juicy brick-breaker: reflection physics, particle pops, lives, levels.                  |
| `2048`          | 2048         | The classic sliding-tile puzzle: smooth slide/merge, swipe + keys, best score, undo.    |
| `memory`        | Memory Match | Card-matching memory: 3D flips, moves + timer, 4×4/6×6 difficulty, win overlay.         |
| `quiz`          | Quiz         | Multiple-choice quiz: per-question feedback, progress, scoring, results recap.          |

### 3D / Motion

| id              | name        | what it is                                                                                         |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------- |
| `three-d-orb`   | 3D Showcase | three.js generative scene: 60k-particle glowing orb + icosahedron, mouse parallax.                 |
| `three-globe`   | 3D Globe    | Interactive WebGL globe: point-cloud Earth, animated great-circle arcs, drag-to-spin.              |
| `three-terrain` | 3D Terrain  | Synthwave terrain flythrough: infinite displaced wireframe, neon sun, fog, gradient sky.           |
| `particle-toy`  | Aurora      | Interactive flow-field particle canvas: additive-glow trails, cursor stir, click bursts, palettes. |

## Deck templates (carried from Slides)

| id                  | name              | what it is                                                                                                        |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bold-founder`      | Bold Founder      | A restrained, narrative VC pitch deck.                                                                            |
| `editorial`         | Editorial         | A magazine-grade editorial/brand deck.                                                                            |
| `dark-tech`         | Dark Tech         | A developer/technical product deck on near-black.                                                                 |
| `finance-pro`       | Finance Pro       | A board/finance review deck with charts + tables.                                                                 |
| `data-dashboard`    | Data Dashboard    | A dark instrument-panel metrics-review deck — interactive: filterable chart, sortable table, scenario sliders.    |
| `open-house`        | Open House        | Quiet-luxury listing pitch — interactive: floor-plan explorer, payment calculator, neighborhood map layers.       |
| `working-session`   | Working Session   | Facilitation deck that becomes the whiteboard — interactive: sticky wall, tap poll, dot vote, 2×2 board, timer.   |
| `security-training` | Security Training | Field-manual training drills — interactive: find-the-phish game, branching scenario, crack-time lab, scored quiz. |
