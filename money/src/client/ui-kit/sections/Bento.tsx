import type { DashboardCard } from '../lib/types'
import { CardRenderer } from '../cards'

function spanClass(span: 1 | 2 | 3 | 4 = 1): string {
  switch (span) {
    case 4:
      return 'sm:col-span-2 lg:col-span-4'
    case 3:
      return 'sm:col-span-2 lg:col-span-3'
    case 2:
      return 'sm:col-span-2'
    default:
      return ''
  }
}

/**
 * The bento grid. Cards are sized by importance via `span`, reflow to one column
 * on narrow panes, and stagger their entrance by index.
 */
export function Bento({ cards }: { cards: DashboardCard[] }) {
  return (
    <div className="grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((dc, i) => (
        <div key={`${dc.card.id}-${i}`} className={spanClass(dc.span)}>
          <CardRenderer
            card={dc.card}
            index={i}
            delta={dc.delta}
            variant={dc.variant}
            action={dc.action}
          />
        </div>
      ))}
    </div>
  )
}
