import { categoryColor } from '../lib/colors'
import { useReducedMotion } from '../lib/motion'

export interface BarItem {
  label: string
  value: number
  displayValue?: string
  color?: string
  /** Optional secondary caption under the label (e.g. count, category). */
  caption?: string
  /** Stable key for drill-down (e.g. the raw category key). */
  key?: string
}

interface BarListProps {
  items: BarItem[]
  /** Format a raw value when `displayValue` is absent. */
  format?: (n: number) => string
  /** Colorize each bar from the chart ramp; otherwise a neutral accent. */
  colorize?: boolean
  className?: string
  animate?: boolean
  /** When set, each bar becomes a button that drills into that row. */
  onItemClick?: (item: BarItem, index: number) => void
}

/**
 * Horizontal category bars (Copilot/Vercel "bar list"): label + proportional
 * track + right-aligned value. Bars share a max so lengths are comparable.
 */
export function BarList({
  items,
  format = (n) => String(n),
  colorize = true,
  className,
  animate = true,
  onItemClick,
}: BarListProps) {
  const reduced = useReducedMotion()
  const max = Math.max(1, ...items.map((it) => Math.abs(it.value)))

  return (
    <div className={className}>
      {items.map((it, i) => {
        const pct = Math.max(2, (Math.abs(it.value) / max) * 100)
        const color =
          it.color ?? (colorize ? categoryColor(i) : 'var(--chart-1)')
        const body = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-foreground/90 min-w-0 truncate text-sm">
                {it.label}
              </span>
              <span className="uk-nums text-foreground/90 shrink-0 text-sm">
                {it.displayValue ?? format(it.value)}
              </span>
            </div>
            <div className="bg-muted/60 h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: color,
                  transition:
                    reduced || !animate
                      ? undefined
                      : 'width 700ms cubic-bezier(0.22,1,0.36,1)',
                }}
              />
            </div>
            {it.caption ? (
              <div className="text-muted-foreground mt-0.5 text-xs">
                {it.caption}
              </div>
            ) : null}
          </>
        )
        if (onItemClick && it.key) {
          return (
            <button
              key={`${it.label}-${i}`}
              type="button"
              onClick={() => onItemClick(it, i)}
              className="hover:bg-muted/40 focus-visible:ring-ring -mx-1.5 block w-[calc(100%+0.75rem)] rounded-lg px-1.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
            >
              {body}
            </button>
          )
        }
        return (
          <div key={`${it.label}-${i}`} className="group/bar py-1.5">
            {body}
          </div>
        )
      })}
    </div>
  )
}
