import type { ReactNode } from 'react'
import type { DeltaSpec, EvaluatedCard } from '../lib/types'
import type { CardState } from './CardShell'

export interface RendererProps {
  card: EvaluatedCard
  index?: number
  delta?: DeltaSpec
  state?: CardState
  onRetry?: () => void
  /** Optional header control (e.g. a drilldown trigger) rendered by CardShell. */
  action?: ReactNode
  /** Tap a rolled-up row (e.g. a breakdown category) to drill into its values. */
  onDrillRow?: (key: string, label: string) => void
}

/** Shared CardShell props derived from a card (title, formula back, states). */
export function shellPropsFor(
  card: EvaluatedCard,
  index?: number,
  state?: CardState,
  onRetry?: () => void,
  action?: ReactNode,
) {
  return {
    title: card.title,
    formula: card.formula ?? card.primaryFormula,
    secondaryFormulas: card.secondaryFormulas,
    formulaExplain: card.description,
    index,
    state,
    onRetry,
    action,
  }
}

/** Sentiment of a series given polarity (inverse = spending, where down is good). */
export function seriesTone(
  values: number[],
  inverse = false,
): 'positive' | 'negative' | 'neutral' {
  if (values.length < 2) return 'neutral'
  const d = values[values.length - 1] - values[0]
  if (d === 0) return 'neutral'
  const up = d > 0
  const good = inverse ? !up : up
  return good ? 'positive' : 'negative'
}

export type { DeltaSpec }
