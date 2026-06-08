import { useReducedMotion } from '../lib/motion'

interface ProgressBarProps {
  /** 0..1 fill fraction. Clamped. */
  value: number
  color?: string
  /** 0..1 position of a target tick (turns this into a bullet chart). */
  target?: number
  height?: number
  className?: string
  animate?: boolean
}

/**
 * Thin horizontal progress with an optional target tick (utilization, budget
 * vs limit). Color the fill, not the track.
 */
export function ProgressBar({
  value,
  color = 'var(--chart-1)',
  target,
  height = 8,
  className,
  animate = true,
}: ProgressBarProps) {
  const reduced = useReducedMotion()
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

  return (
    <div
      className={`bg-muted/60 relative w-full overflow-hidden rounded-full ${className ?? ''}`}
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${v * 100}%`,
          backgroundColor: color,
          transition:
            reduced || !animate
              ? undefined
              : 'width 800ms cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      {target !== undefined ? (
        <span
          className="bg-foreground/70 absolute top-1/2 h-[140%] w-0.5 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${Math.max(0, Math.min(1, target)) * 100}% - 1px)`,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}
