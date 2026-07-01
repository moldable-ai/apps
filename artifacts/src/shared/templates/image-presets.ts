// Image-style presets for the Assets panel — ONE per template. Every deck
// template ships its own unique, art-directed imagery, so every template is a
// selectable image style: its cover image is both the gallery thumbnail AND the
// image-to-image style source when generating, so the medium/palette/mood
// transfer from a proven, hand-tuned look rather than a throwaway prompt.
import { TEMPLATES } from './catalog'
import type { Template } from './types'

export interface ImagePreset {
  id: string
  name: string
  /** Reinforces the look in text alongside the reference image. Medium-neutral —
   * the reference cover carries the actual medium. */
  recipe: string
  /** A real image in template-assets/ (thumbnail + image-to-image style source). */
  preview: string
}

/** The on-brand palette clause derived from a template's tokens. */
export function paletteClause(template?: {
  tokens?: Record<string, string>
}): string {
  const bg = template?.tokens?.['--bg'] ?? '#0f172a'
  const text = template?.tokens?.['--text'] ?? '#f8fafc'
  const accent =
    template?.tokens?.['--accent'] ??
    template?.tokens?.['--accent-2'] ??
    '#6366f1'
  return `Palette of ${bg} and ${text} with a single ${accent} accent.`
}

/** The image a template uses on its cover (its signature visual). */
function coverAsset(t: Template): string | undefined {
  const assets = t.assets ?? []
  return assets.find((a) => /cover/i.test(a)) ?? assets[0]
}

// One preset per template that has a cover image.
export const IMAGE_PRESETS: ImagePreset[] = TEMPLATES.flatMap((t) => {
  const preview = coverAsset(t)
  if (!preview) return []
  return [
    {
      id: t.id,
      name: t.name,
      recipe: `${paletteClause(t)} Cohesive, tasteful imagery with generous negative space, matching this deck's signature look.`,
      preview,
    },
  ]
})

export function getImagePreset(
  id: string | undefined,
): ImagePreset | undefined {
  return id ? IMAGE_PRESETS.find((p) => p.id === id) : undefined
}

/** A preset's deck style recipe (its reference cover carries the actual medium). */
export function presetImageStyle(preset: ImagePreset): string {
  return preset.recipe
}
