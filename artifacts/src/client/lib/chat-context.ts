// Builds the app's chat system-prompt contribution (sent via
// moldable:set-chat-instructions). Two modes:
//   - grid: how to create an artifact (a page or a deck) and pick a template.
//   - artifact open: the artifact's template coding guide so edits stay on-brand.
// Template data is server-owned so the client does not bundle every sample just
// to build chat context.
import type { Artifact, ArtifactKind } from '../../shared/types'

interface TemplateMeta {
  id: string
  name: string
  kind: ArtifactKind
  tagline: string
  categories: string[]
  audiences: string[]
}

interface TemplateDetail extends TemplateMeta {
  guide: string
}

const PAGE_METHODS =
  'artifacts.page.set { html?, css?, js?, fontLinks?, libs?, background? }, ' +
  'artifacts.page.text.replace { oldString, newString, replaceAll?, field? }, ' +
  'artifacts.update/replace, artifacts.images.generate/edit/list, ' +
  'artifacts.versions.list + artifacts.revert, artifacts.applyTemplate, and ' +
  'artifacts.publish/unpublish'

const DECK_METHODS =
  'artifacts.slides.add/update/remove/reorder/move, artifacts.update/replace, ' +
  'artifacts.slides.text.replace { oldString, newString, replaceAll?, slideId?, field? }, ' +
  'artifacts.images.generate/edit/list, artifacts.versions.list + artifacts.revert, ' +
  'artifacts.applyTemplate, and artifacts.publish/unpublish'

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<T>
}

function catalog(templates: TemplateMeta[], kind: ArtifactKind): string {
  return templates
    .filter((t) => t.kind === kind)
    .map(
      (t) =>
        `- \`${t.id}\` — ${t.name}: ${t.tagline} (for ${t.audiences.join(', ')})`,
    )
    .join('\n')
}

export async function gridChatInstructions(): Promise<string> {
  const templates = (await fetchJson<TemplateMeta[]>('/api/templates')) ?? []
  return `The user is in the Artifacts app (the gallery). Artifacts turns a chat into a beautiful, self-contained, *publishable* web page (or slide deck). There are two kinds:

- **page** — ONE full, scrolling, responsive web page you fully control (HTML + CSS + JS): dashboards, charts, landing pages, product specs, data stories, games, 3D scenes. This is the primary kind.
- **deck** — a slide deck (fixed 16:9 stage, navigated like a presentation).

To CREATE, pick a template that fits, then build on it. Call \`artifacts.templates.list\` for the live list, or use these:

PAGE TEMPLATES
${catalog(templates, 'page')}

DECK TEMPLATES
${catalog(templates, 'deck')}

Rough mapping: analytics/metrics/KPIs → analytics-dashboard; revenue/finance/investor charts → financial-report; product/SaaS marketing site → landing-page; PRD/spec/requirements → product-spec; a startup one-pager → pitch-onepager; a visual story/portfolio → case-study; a year-in-review/recap → year-in-review; generative 3D art → three-d-orb; an arcade game → moldable-bird; a VC pitch presentation → bold-founder; a board/finance deck → finance-pro; a metrics review deck → data-dashboard. If unsure which kind or template, ask.

Create with \`artifacts.create { kind, title, templateId }\` — this clones the template's sample (a page or sample slides) so you can edit in place. Then refine with \`artifacts.page.text.replace { oldString, newString }\` / \`artifacts.slides.text.replace { oldString, newString }\` for small changes, adding \`field\` or \`slideId\` only to disambiguate; use \`artifacts.page.set\` / \`artifacts.slides.update\` for whole-field replacements, and slide structure calls for deck layout. End every image prompt with "No text, no words, no letters, no logos."`
}

export async function artifactChatInstructions(
  artifact: Artifact,
): Promise<string> {
  const template = artifact.templateId
    ? await fetchJson<TemplateDetail>(
        `/api/templates/${encodeURIComponent(artifact.templateId)}`,
      )
    : null

  const imageHelp =
    `Images: the user manages them in the Assets panel. Call \`artifacts.images.list\` to see existing files (reference them by their exact name as \`assets/<file>\`), \`artifacts.images.generate\` with timeoutMs 600000 to make a new one, or \`artifacts.images.edit\` with timeoutMs 600000 and { source: "<file>" } to remix an existing image (image-to-image — keeps its look). For coherence, reuse this artifact's image style and end every prompt with "No text, no words, no letters, no logos."` +
    (artifact.imageStyle
      ? ` This artifact's image style: "${artifact.imageStyle}".`
      : '')

  if (artifact.kind === 'page') {
    const header =
      `The user is editing the PAGE artifact "${artifact.title}" (id: ${artifact.id}). ` +
      `It is one self-contained, scrolling, responsive web page. Edit it with the artifacts RPC (POST /api/moldable/rpc): ${PAGE_METHODS}. ` +
      `Use \`artifacts.page.text.replace { oldString, newString }\` for small exact-string edits across the page document; \`oldString\` must be unique unless \`replaceAll: true\`. Add \`field\` only to disambiguate. Use \`artifacts.page.set\` only when replacing an entire field. ${imageHelp}`

    if (!template) {
      return `${header}

This page has no library template. Keep it studio-grade: a distinctive type system (load fonts via \`fontLinks\`), a committed palette, generous spacing, tasteful scroll-reveal motion (\`class="reveal"\`), and full responsiveness (380px → desktop). Hand-roll any charts in SVG/canvas.`
    }

    return `${header}

Stay on-brand with this template — read its sample page and mirror its structure, palette, type, and motion. To switch the whole look, call \`artifacts.applyTemplate { templateId }\` (see \`artifacts.templates.list\`).

${template.guide}`
  }

  // Deck artifact.
  const header =
    `The user is editing the DECK artifact "${artifact.title}" (id: ${artifact.id}, ` +
    `${artifact.slides.length} slide${artifact.slides.length === 1 ? '' : 's'}` +
    `${template ? `, style: ${template.name}` : ''}). ` +
    `Edit it with the artifacts RPC (POST /api/moldable/rpc): ${DECK_METHODS}. ` +
    `Use \`artifacts.slides.text.replace { oldString, newString }\` for small exact-string edits across deck slides; \`oldString\` must be unique unless \`replaceAll: true\`. Add \`slideId\` or \`field\` only to disambiguate. ` +
    `Each slide's bodyHtml is the inner HTML of a fixed 1920×1080 stage that auto-reflows into a tall, scrolling, full-width page on phones — keep new/edited slides mobile-friendly. Add class="reveal" for staggered entrances and set per-slide transition (fade/slide/zoom). ${imageHelp} ` +
    `To place an image, set it as a full-bleed background (<div class="full-bleed"><img class="bleed" src="assets/<file>"><div class="scrim"></div></div>) or a .media/.split/.hero figure in the target slide's bodyHtml.`

  if (!template) {
    return `${header}

This deck has no library style. To adopt a polished look, call \`artifacts.applyTemplate { templateId }\` (see \`artifacts.templates.list\`).`
  }

  return `${header}

Stay on-brand with this deck's style. Use its classes and design tokens — do NOT hardcode fonts or colors. To change the whole look, call \`artifacts.applyTemplate { templateId }\`: it re-skins any slides built from the shared component vocabulary instantly, then you refine custom slides.

${template.guide}`
}
