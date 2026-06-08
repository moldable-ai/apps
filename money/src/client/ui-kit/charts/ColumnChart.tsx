import { useReducedMotion } from '../lib/motion'
import { useElementWidth } from './use-size'

interface ColumnChartProps {
  values: number[]
  labels?: string[]
  height?: number
  width?: number
  /** Color positive vs negative bars (cash-flow style). */
  signed?: boolean
  /** Highlight the final bar in the accent hue. */
  highlightLast?: boolean
  className?: string
  animate?: boolean
}

/**
 * Mini vertical column chart with a zero baseline. Used for monthly cash flow
 * (signed) and simple count/amount-per-period bars.
 */
export function ColumnChart({
  values,
  labels,
  height = 120,
  width,
  signed = false,
  highlightLast = false,
  className,
  animate = true,
}: ColumnChartProps) {
  const [ref, measured] = useElementWidth<HTMLDivElement>(width ?? 320)
  const reduced = useReducedMotion()
  const w = width ?? measured

  if (!values.length)
    return <div ref={ref} className={className} style={{ height }} />

  const padY = 6
  const innerH = height - padY * 2
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)
  const span = max - min || 1
  const zeroY = padY + (max / span) * innerH
  const n = values.length
  const slot = w / n
  const barW = Math.min(28, slot * 0.6)

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: width ?? '100%', height }}
    >
      <svg
        width={w}
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-hidden
      >
        {/* zero baseline */}
        <line
          x1={0}
          y1={zeroY}
          x2={w}
          y2={zeroY}
          stroke="var(--border)"
          strokeWidth={1}
          opacity={0.6}
        />
        {values.map((v, i) => {
          const x = i * slot + (slot - barW) / 2
          const h = (Math.abs(v) / span) * innerH
          const y = v >= 0 ? zeroY - h : zeroY
          const isLast = i === n - 1
          let fill =
            'color-mix(in oklch, var(--muted-foreground) 55%, transparent)'
          if (signed) fill = v >= 0 ? 'var(--success)' : 'var(--destructive)'
          if (highlightLast && isLast) fill = 'var(--chart-1)'
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(1, h)}
              rx={Math.min(4, barW / 2)}
              fill={fill}
              className={animate && !reduced ? 'uk-fade' : undefined}
              style={
                animate && !reduced
                  ? { animationDelay: `${i * 35}ms` }
                  : undefined
              }
            >
              {labels?.[i] ? <title>{labels[i]}</title> : null}
            </rect>
          )
        })}
      </svg>
    </div>
  )
}
