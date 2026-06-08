/**
 * Motion helpers — CSS/Web-Animations based, never framer-motion.
 *
 * (Vite 8's Rolldown statically rewrites framer-motion's optional
 * `@emotion/is-prop-valid` require into a broken stub, crashing prod builds, so
 * the kit uses CSS keyframes + a reduced-motion gate instead.)
 *
 * House easing: cubic-bezier(0.22, 1, 0.36, 1).
 */
import { type CSSProperties, useEffect, useRef, useState } from 'react'

export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Subscribe to the user's reduced-motion preference. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Staggered entrance style for a grid/list item. Returns the CSS custom prop
 * the `.uk-rise` utility consumes (see globals.css); honors reduced motion.
 */
export function riseStyle(
  index: number,
  step = 45,
  reduced = false,
): CSSProperties {
  if (reduced) return {}
  return { ['--uk-rise-delay' as string]: `${Math.min(index * step, 480)}ms` }
}

/**
 * Animate a number from 0 → target on mount (count-up). Returns the current
 * display number. Disabled (snaps to target) under reduced motion.
 */
export function useCountUp(
  target: number,
  durationMs = 900,
  enabled = true,
): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(enabled && !reduced ? 0 : target)
  const frame = useRef<number | null>(null)
  const startTs = useRef<number | null>(null)
  // Animate only the FIRST time; afterwards (e.g. on chart scrub or data
  // refresh) snap straight to the target so the hero never re-runs 0→value.
  const hasRun = useRef(false)

  useEffect(() => {
    if (!enabled || reduced || !Number.isFinite(target) || hasRun.current) {
      setValue(target)
      hasRun.current = true
      return
    }
    startTs.current = null
    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts
      const elapsed = ts - startTs.current
      const t = Math.min(1, elapsed / durationMs)
      // easeOutExpo — snappy fintech count-up
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setValue(target * eased)
      if (t < 1) {
        frame.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
        hasRun.current = true
      }
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [target, durationMs, enabled, reduced])

  return value
}
