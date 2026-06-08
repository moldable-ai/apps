import { type ReactNode } from 'react'
import { useReducedMotion } from '../lib/motion'

interface RingGaugeProps {
  /** 0..1 progress. Clamped. */
  value: number
  size?: number
  thickness?: number
  color?: string
  trackColor?: string
  center?: ReactNode
  className?: string
  animate?: boolean
}

/**
 * Single-value progress ring (savings rate, FIRE progress, goal completion).
 * Clockwise from 12 o'clock with a rounded cap.
 */
export function RingGauge({
  value,
  size = 132,
  thickness = 12,
  color = 'var(--chart-1)',
  trackColor = 'color-mix(in oklch, var(--muted-foreground) 16%, transparent)',
  center,
  className,
  animate = true,
}: RingGaugeProps) {
  const reduced = useReducedMotion()
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const dash = c * v

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
            stroke={trackColor}
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={
              reduced || !animate
                ? undefined
                : {
                    transition:
                      'stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)',
                  }
            }
          />
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
