// Public surface of the style library. Importable by both the server (RPC,
// preview) and the client (picker, chat-instruction guides).
import { TEMPLATES } from './catalog'
import { paletteClause } from './image-presets'
import {
  type Template,
  type TemplateMeta,
  templateGuide,
  templateMeta,
  templateTheme,
} from './types'

export type { Template, TemplateMeta } from './types'
export { templateGuide, templateMeta, templateTheme } from './types'
export { COMPONENT_VOCABULARY } from './types'

export const DEFAULT_TEMPLATE_ID = 'landing-page'

export type { ImagePreset } from './image-presets'
export {
  IMAGE_PRESETS,
  getImagePreset,
  paletteClause,
  presetImageStyle,
} from './image-presets'

/** The fixed suffix every image prompt ends with (models otherwise hallucinate text). */
export const IMAGE_NO_TEXT_SUFFIX = 'No text, no words, no letters, no logos.'

/**
 * A coherent per-deck image "style recipe", derived from the template's palette
 * tokens. Prepended to every generated image's subject so a deck's imagery
 * shares one medium + palette + mood. Editable per-deck in the Assets panel.
 */
export function defaultImageStyle(template?: Template): string {
  return `Fine-art editorial photograph, soft natural light, shallow depth of field, gentle film grain. ${paletteClause(template)} Generous negative space, tasteful and on-brand.`
}

/** Compose the full prompt sent to the image model from a style recipe + subject. */
export function composeImagePrompt(style: string, subject: string): string {
  const parts = [style.trim(), subject.trim()].filter(Boolean)
  return `${parts.join(' ')} ${IMAGE_NO_TEXT_SUFFIX}`.trim()
}

export function listTemplates(): TemplateMeta[] {
  return TEMPLATES.map(templateMeta)
}

export function getTemplate(id: string | undefined): Template | undefined {
  if (!id) return undefined
  return TEMPLATES.find((t) => t.id === id)
}

/** Full template payload for RPC consumers (meta + theme + guide). */
export function getTemplateDetail(id: string) {
  const template = getTemplate(id)
  if (!template) return undefined
  return {
    ...templateMeta(template),
    theme: templateTheme(template),
    guide: templateGuide(template),
    sampleSlides: template.sampleSlides ?? [],
    samplePage: template.samplePage ?? null,
  }
}

/** A compact catalogue line per template for the creation-time chat prompt. */
export function templateCatalogSummary(): string {
  return TEMPLATES.map(
    (t) =>
      `- \`${t.id}\` — ${t.name}: ${t.tagline} (for ${t.audiences.join(', ')})`,
  ).join('\n')
}
