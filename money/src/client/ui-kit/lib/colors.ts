/**
 * Chart color helpers. We only ever reference *semantic theme tokens*
 * (`--chart-1..5`, `--success`, `--destructive`, …) so the kit re-themes for
 * free in light/dark and matches the host. No raw hex palettes.
 *
 * In this theme `--chart-1` is the orange accent and `--chart-4` is violet —
 * the orange→violet gradient used across the hero line/area charts.
 */

export const CHART_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

export const ACCENT = 'var(--chart-1)' // orange
export const ACCENT_2 = 'var(--chart-4)' // violet
export const POSITIVE = 'var(--success)'
export const NEGATIVE = 'var(--destructive)'
export const WARNING = 'var(--warning)'
export const MUTED = 'var(--muted-foreground)'

/**
 * Categorical hue order for breakdowns/splits. Leads with non-alarm hues
 * (orange, violet, amber) so small splits read orange+violet and reserve the
 * green/rose tokens for later slices rather than implying good/bad.
 */
const CATEGORY_ORDER = [
  'var(--chart-1)', // orange
  'var(--chart-4)', // violet
  'var(--chart-3)', // amber
  'var(--chart-2)', // emerald
  'var(--chart-5)', // rose
] as const

/** Stable category color by index (cycles the categorical hue order). */
export function categoryColor(index: number): string {
  return CATEGORY_ORDER[
    ((index % CATEGORY_ORDER.length) + CATEGORY_ORDER.length) %
      CATEGORY_ORDER.length
  ]
}

/** A palette of N category colors. */
export function categoryPalette(n: number): string[] {
  return Array.from({ length: n }, (_, i) => categoryColor(i))
}

export interface GradientStops {
  from: string
  to: string
}

/** The signature hero gradient (orange → violet). */
export const HERO_GRADIENT: GradientStops = { from: ACCENT, to: ACCENT_2 }

/** A tone-appropriate gradient for up/down series. */
export function toneGradient(
  tone: 'positive' | 'negative' | 'neutral',
): GradientStops {
  if (tone === 'positive')
    return { from: 'var(--chart-2)', to: 'var(--success)' }
  if (tone === 'negative')
    return { from: 'var(--chart-5)', to: 'var(--destructive)' }
  return HERO_GRADIENT
}
