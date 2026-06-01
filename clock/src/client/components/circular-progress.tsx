import type { ReactNode } from 'react'

/**
 * A thin circular progress ring, drawn like the iOS timer dial: a faint full
 * track with a rounded accent arc that depletes as `value` drops toward 0.
 * Children render centered inside the ring (typically the play/pause control).
 */
export function CircularProgress({
  value,
  size = 52,
  strokeWidth = 3,
  color = 'var(--primary)',
  trackColor = 'color-mix(in oklch, var(--border) 80%, transparent)',
  className,
  children,
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  className?: string
  children?: ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, value))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={`relative shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          style={{ stroke: trackColor }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            stroke: color,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.45s linear',
          }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  )
}
