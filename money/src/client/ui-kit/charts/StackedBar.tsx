import { categoryColor } from '../lib/colors'
import { useReducedMotion } from '../lib/motion'
import type { DonutSegment } from './Donut'

interface StackedBarProps {
  segments: DonutSegment[]
  height?: number
  className?: string
  animate?: boolean
}

/**
 * A single horizontal bar split into proportional segments (e.g. essentials vs
 * lifestyle creep, needs vs wants). Pairs with a <Legend/>.
 */
export function StackedBar({
  segments,
  height = 12,
  className,
  animate = true,
}: StackedBarProps) {
  const reduced = useReducedMotion()
  const items = segments.filter((s) => s.value > 0)
  const total = items.reduce((sum, s) => sum + s.value, 0) || 1

  return (
    <div
      className={`bg-muted/60 flex w-full overflow-hidden rounded-full ${className ?? ''}`}
      style={{ height, gap: 2 }}
    >
      {items.map((s, i) => (
        <div
          key={`${s.label}-${i}`}
          className="h-full first:rounded-l-full last:rounded-r-full"
          style={{
            width: `${(s.value / total) * 100}%`,
            backgroundColor: s.color ?? categoryColor(i),
            transition:
              reduced || !animate
                ? undefined
                : 'width 700ms cubic-bezier(0.22,1,0.36,1)',
          }}
          title={s.label}
        />
      ))}
    </div>
  )
}
