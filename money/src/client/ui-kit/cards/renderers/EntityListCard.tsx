import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDate, formatScalar } from '../../lib/format'
import type { EntityListEntity, MoneyValueFormat } from '../../lib/types'
import { CardShell } from '../CardShell'
import { MerchantChip } from '../MerchantChip'
import { firstEntityList, iconForCard } from '../helpers'
import { type RendererProps, shellPropsFor } from '../renderer-types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function cleanSubtitle(s: string | undefined): string | undefined {
  if (!s) return undefined
  if (ISO_DATE.test(s)) return formatDate(s, { year: undefined })
  if (/[_]/.test(s)) {
    return s
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return s
}

function fieldString(e: EntityListEntity, key: string): string | undefined {
  const v = e.fields?.[key]
  return typeof v === 'string' ? v : undefined
}

/**
 * An entity-list card (subscriptions, largest expenses, reimbursements): brand
 * chip + label + subtitle + right-aligned amount, as divided rows on the card
 * surface (no nested card). Expandable past the initial window.
 */
export function EntityListCard({
  card,
  index,
  state,
  onRetry,
  action,
}: RendererProps) {
  const entities = firstEntityList(card) ?? []
  const [expanded, setExpanded] = useState(false)
  const limit = expanded ? Math.min(entities.length, 14) : 5
  const shown = entities.slice(0, limit)
  const valueFormat: MoneyValueFormat =
    card.format === 'number' ? 'currency' : card.format

  return (
    <CardShell
      {...shellPropsFor(card, index, state, onRetry, action)}
      icon={iconForCard(card)}
    >
      {entities.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 items-center text-sm">
          Nothing to show here.
        </div>
      ) : (
        <ul className="divide-border/50 -mx-1 divide-y">
          {shown.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-1 py-2.5">
              <MerchantChip
                name={e.label}
                size={34}
                color={fieldString(e, 'brandColor')}
                logoUrl={fieldString(e, 'logoUrl')}
              />
              <div className="min-w-0 flex-1">
                <div className="text-foreground/90 truncate text-sm font-medium">
                  {e.label}
                </div>
                {cleanSubtitle(e.subtitle) ? (
                  <div className="text-muted-foreground truncate text-xs">
                    {cleanSubtitle(e.subtitle)}
                  </div>
                ) : null}
              </div>
              <div className="uk-nums shrink-0 text-sm font-medium">
                {formatScalar(e.value, valueFormat)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {entities.length > 5 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-0.5 self-start text-xs font-medium"
        >
          {expanded ? 'Show less' : `View all ${entities.length}`}
          <ChevronRight
            className={`size-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      ) : null}
    </CardShell>
  )
}
