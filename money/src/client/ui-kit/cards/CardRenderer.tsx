import type { CardKind } from '../lib/types'
import { pickRenderer } from './helpers'
import type { RendererProps } from './renderer-types'
import { BreakdownCard } from './renderers/BreakdownCard'
import { ComparisonCard } from './renderers/ComparisonCard'
import { EntityListCard } from './renderers/EntityListCard'
import { ForecastCard } from './renderers/ForecastCard'
import { MetricCard } from './renderers/MetricCard'
import { OptimizerCard } from './renderers/OptimizerCard'
import { StatusCard } from './renderers/StatusCard'
import { TrendCard } from './renderers/TrendCard'

export interface CardRendererProps extends RendererProps {
  /** Force a specific renderer; otherwise dispatched by value shape → kind. */
  variant?: CardKind
}

/**
 * The central "lego" dispatcher. Given any evaluated card, it picks a renderer
 * from the runtime value shape first, then the card kind. This is the one place
 * to extend when a new card kind or value shape is added.
 */
export function CardRenderer({ variant, ...props }: CardRendererProps) {
  const key = pickRenderer(props.card, variant)
  switch (key) {
    case 'trend':
      return <TrendCard {...props} />
    case 'breakdown':
      return <BreakdownCard {...props} />
    case 'entity-list':
      return <EntityListCard {...props} />
    case 'status':
      return <StatusCard {...props} />
    case 'optimizer':
      return <OptimizerCard {...props} />
    case 'comparison':
      return <ComparisonCard {...props} />
    case 'forecast':
      return <ForecastCard {...props} />
    case 'metric':
    default:
      return <MetricCard {...props} />
  }
}
