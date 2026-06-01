import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface AnimatedNumberProps {
  /** Target value to display. */
  value: number
  /** ms; ignored when the user prefers reduced motion. */
  durationMs?: number
  className?: string
}

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3) // cubic ease-out

/**
 * Rolls a number from its previous value to the next one — the hero temperature
 * counts up/down when weather refreshes or the unit toggles. Implemented with a
 * plain requestAnimationFrame tween (no framer-motion MotionValue internals, so
 * it survives production minification) and snaps instantly under
 * prefers-reduced-motion.
 */
export function AnimatedNumber({
  value,
  durationMs = 700,
  className,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value)
      fromRef.current = value
      return
    }

    const from = fromRef.current
    if (from === value) return

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = EASE_OUT(progress)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [value, durationMs, reduceMotion])

  return <span className={className}>{display}</span>
}
