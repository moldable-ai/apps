import { type ReactNode } from 'react'
import { categoryColor } from '../lib/colors'
import { useReducedMotion } from '../lib/motion'

export interface DonutSegment {
  label: string
  value: number
  color?: string
}

interface DonutProps {
  segments: DonutSegment[]
  size?: number
  /** Cap distinct colored slices; the tail buckets into a muted "Other". */
  maxSlices?: number
  center?: ReactNode
  className?: string
  animate?: boolean
}

/** Resolve segments → colored, capped, sorted slices (largest first). */
export function resolveSegments(
  segments: DonutSegment[],
  maxSlices = 5,
): DonutSegment[] {
  const sorted = [...segments]
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
  if (sorted.length <= maxSlices) {
    return sorted.map((s, i) => ({ ...s, color: s.color ?? categoryColor(i) }))
  }
  const head = sorted
    .slice(0, maxSlices - 1)
    .map((s, i) => ({ ...s, color: s.color ?? categoryColor(i) }))
  const tail = sorted.slice(maxSlices - 1)
  const otherValue = tail.reduce((sum, s) => sum + s.value, 0)
  return [
    ...head,
    {
      label: 'Other',
      value: otherValue,
      color: 'color-mix(in oklch, var(--muted-foreground) 45%, transparent)',
    },
  ]
}

/**
 * Thin allocation ring (innerR 62% / outerR 90%), rounded caps, clockwise from
 * 12 o'clock, with a center total. Legend is rendered separately.
 */
export function Donut({
  segments,
  size = 184,
  maxSlices = 5,
  center,
  className,
  animate = true,
}: DonutProps) {
  const reduced = useReducedMotion()
  const slices = resolveSegments(segments, maxSlices)
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  const outerR = (size / 2) * 0.9
  const innerR = (size / 2) * 0.62
  const r = (outerR + innerR) / 2
  const strokeW = outerR - innerR
  const c = 2 * Math.PI * r
  const gap = total > 0 ? (2.5 / 360) * c : 0

  let offset = 0
  const arcs = slices.map((s, i) => {
    const frac = total > 0 ? s.value / total : 0
    const segLen = Math.max(0, frac * c - gap)
    const arc = {
      key: `${s.label}-${i}`,
      color: s.color ?? categoryColor(i),
      dash: `${segLen} ${c - segLen}`,
      offset: -offset,
      delay: i * 60,
    }
    offset += frac * c
    return arc
  })

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-hidden
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="color-mix(in oklch, var(--muted-foreground) 12%, transparent)"
            strokeWidth={strokeW}
          />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={strokeW}
              strokeDasharray={a.dash}
              strokeDashoffset={a.offset}
              strokeLinecap="round"
              className={animate && !reduced ? 'uk-fade' : undefined}
              style={
                animate && !reduced
                  ? { animationDelay: `${a.delay}ms` }
                  : undefined
              }
            />
          ))}
        </g>
      </svg>
      {center ? (
        <div
          style={{ position: 'absolute', inset: 0 }}
          className="flex flex-col items-center justify-center text-center"
        >
          {center}
        </div>
      ) : null}
    </div>
  )
}
