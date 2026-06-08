import { useId } from 'react'
import { useReducedMotion } from '../lib/motion'
import { approxLength, areaPath, scaleSeries, smoothPath } from './geometry'
import { useElementWidth } from './use-size'

export type Tone = 'positive' | 'negative' | 'neutral' | 'accent'

export function toneStroke(tone: Tone): string {
  switch (tone) {
    case 'positive':
      return 'var(--success)'
    case 'negative':
      return 'var(--destructive)'
    case 'accent':
      return 'var(--chart-1)'
    default:
      return 'var(--muted-foreground)'
  }
}

interface SparklineProps {
  values: number[]
  tone?: Tone
  height?: number
  /** Fixed width; omit to fill + measure the container. */
  width?: number
  strokeWidth?: number
  /** Faint area fill under the line (≤ ~10% per the spec). */
  fill?: boolean
  className?: string
  animate?: boolean
}

/**
 * Mute, axis-less trend texture for list rows and compact cards.
 * Single sentiment-driven color; no dots, axes, grid, or tooltip.
 */
export function Sparkline({
  values,
  tone = 'neutral',
  height = 32,
  width,
  strokeWidth = 1.5,
  fill = false,
  className,
  animate = true,
}: SparklineProps) {
  const [ref, measured] = useElementWidth<HTMLDivElement>(width ?? 96)
  const reduced = useReducedMotion()
  const w = width ?? measured
  const gid = useId()

  if (!values.length) {
    return <div ref={ref} className={className} style={{ height }} />
  }

  const stroke = toneStroke(tone)
  const { pts } = scaleSeries(values, {
    width: w,
    height,
    padX: strokeWidth,
    padY: strokeWidth + 1,
  })
  const d = smoothPath(pts, 0.18)
  const len = approxLength(pts)
  const drawStyle =
    animate && !reduced
      ? ({ ['--uk-draw-len' as string]: `${len}` } as React.CSSProperties)
      : undefined

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
        {fill ? (
          <>
            <defs>
              <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.16} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path
              d={areaPath(d, pts, height - strokeWidth)}
              fill={`url(#sp-${gid})`}
            />
          </>
        ) : null}
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animate && !reduced ? 'uk-draw' : undefined}
          style={drawStyle}
        />
      </svg>
    </div>
  )
}
