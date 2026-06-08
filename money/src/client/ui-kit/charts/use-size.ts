import { useEffect, useRef, useState } from 'react'

/**
 * Measure an element's content width with a ResizeObserver so SVG charts can
 * render at real device pixels (crisp strokes, round dots — no aspect-ratio
 * stretching). Returns a ref to attach and the measured width.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(
  fallback = 320,
): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (w > 0) setWidth(w)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width]
}
