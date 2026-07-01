// Builds the app's chat system-prompt contribution (sent via
// moldable:set-chat-instructions). Two modes:
//   - grid: how to create a deck and pick a style.
//   - deck open: the deck's template coding guide so edits stay on-brand.
// Template data is server-owned so the client does not bundle every sample deck
// just to build chat context.
import { COMPONENT_VOCABULARY } from '../../shared/templates/types'
import type { Deck } from '../../shared/types'

interface TemplateMeta {
  id: string
  name: string
  tagline: string
  audiences: string[]
}

interface TemplateDetail extends TemplateMeta {
  guide: string
}

const EDIT_METHODS =
  'slides.text.replace { oldString, newString, replaceAll?, field?, slideId? }, ' +
  'slides.slides.add/update/remove/reorder/move, slides.decks.update/replace, ' +
  'slides.images.generate/edit/list, slides.versions.list + slides.deck.revert, ' +
  'slides.decks.applyTemplate, and slides.deck.publish/unpublish'

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<T>
}

function templateCatalogSummary(templates: TemplateMeta[]): string {
  return templates
    .map(
      (t) =>
        `- \`${t.id}\` — ${t.name}: ${t.tagline} (for ${t.audiences.join(', ')})`,
    )
    .join('\n')
}

export async function gridChatInstructions(): Promise<string> {
  const templates = (await fetchJson<TemplateMeta[]>('/api/templates')) ?? []
  return `The user is in the Slides app (deck gallery). To CREATE a deck, first pick a style, then build it.

1. Choose a style that fits the use case (call \`slides.templates.list\` for the live list, or use these):
${templateCatalogSummary(templates)}
   Rough mapping: teacher/lesson → clean classroom; founder/pitch/fundraise → bold-founder; finance/board/investor → finance-pro; PM/product/spec → product-brief; design/brand/marketing → editorial; developer/technical talk → dark-tech; creative/workshop/community → pastel-creative; general business/strategy → clean-minimal. If unsure, ask the user which they prefer.
2. Create with \`slides.decks.create { title, templateId, density }\` — this seeds the template's theme and sample slides. Then refine with \`slides.text.replace { oldString, newString }\` for small changes, adding \`field\` or \`slideId\` only to disambiguate; use \`slides.slides.add/update\` for whole-slide changes, or \`slides.decks.replace\` for a full rewrite.

Each slide's \`bodyHtml\` is the inner HTML of a fixed 1920×1080 stage that auto-reflows into a tall, scrolling, full-width page on phones — keep every deck mobile-friendly. ${COMPONENT_VOCABULARY}`
}

export async function deckChatInstructions(deck: Deck): Promise<string> {
  const template = deck.templateId
    ? await fetchJson<TemplateDetail>(
        `/api/templates/${encodeURIComponent(deck.templateId)}`,
      )
    : null
  const header =
    `The user is editing the Slides deck "${deck.title}" (deckId: ${deck.id}, ` +
    `${deck.slides.length} slide${deck.slides.length === 1 ? '' : 's'}` +
    `${template ? `, style: ${template.name}` : ''}). ` +
    `Edit it with the slides RPC (POST /api/moldable/rpc): ${EDIT_METHODS}. ` +
    `Use \`slides.text.replace { oldString, newString }\` for small exact-string edits across the deck; \`oldString\` must be unique unless \`replaceAll: true\`. Add \`field\` or \`slideId\` only to disambiguate. ` +
    `Each slide's bodyHtml is the inner HTML of a fixed 1920×1080 stage that auto-reflows into a tall, scrolling, full-width page on phones — keep new/edited slides mobile-friendly (compose from the kit; see MOBILE / RESPONSIVE in the vocabulary). Add class="reveal" for staggered entrances and set per-slide transition (fade/slide/zoom). ` +
    `Images: the user manages them in the Assets panel. Call slides.images.list to see existing files (reference them by their exact name as assets/<file>), slides.images.generate with timeoutMs 600000 to make a new one, or slides.images.edit with timeoutMs 600000 and { source: "<file>" } to remix an existing image (image-to-image — keeps its exact look). For a coherent deck, reuse this deck's image style and end every prompt with "No text, no words, no letters, no logos."` +
    (deck.imageStyle ? ` This deck's image style: "${deck.imageStyle}".` : '') +
    ` To place an image, set it as a full-bleed background (<div class="full-bleed"><img class="bleed" src="assets/<file>"><div class="scrim"></div></div>) or a .media/.split/.hero figure in the target slide's bodyHtml.`

  if (!template) {
    return `${header}

This deck has no library style. ${COMPONENT_VOCABULARY}

To adopt a polished look, call \`slides.decks.applyTemplate { templateId }\` (see \`slides.templates.list\`).`
  }

  return `${header}

Stay on-brand with this deck's style. Use its classes and design tokens below — do NOT hardcode fonts or colors. To change the whole look, call \`slides.decks.applyTemplate { templateId }\`: it re-skins any slides built from the shared component vocabulary instantly, then you refine any custom slides.

${template.guide}`
}
