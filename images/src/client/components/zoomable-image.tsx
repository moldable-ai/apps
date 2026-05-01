import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { cn } from '@moldable-ai/ui'

type ZoomableImageProps = {
  src: string
  alt: string
  zoomScale?: number
  className?: string
  imageClassName?: string
  style?: CSSProperties
}

export function ZoomableImage({
  src,
  alt,
  zoomScale = 2.35,
  className,
  imageClassName,
  style,
}: ZoomableImageProps) {
  const [transformOrigin, setTransformOrigin] = useState('50% 50%')
  const [isZoomed, setIsZoomed] = useState(false)
  const [hasMoved, setHasMoved] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsMounted(true), 100)
    return () => window.clearTimeout(timer)
  }, [])

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!containerRef.current || !isMounted) return

    if (!hasMoved) setHasMoved(true)

    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect()
    const x = ((event.clientX - left) / width) * 100
    const y = ((event.clientY - top) / height) * 100

    setTransformOrigin(`${x}% ${y}%`)
  }

  const shouldZoom = isZoomed && isMounted && hasMoved

  return (
    <div
      ref={containerRef}
      className={cn(
        'inline-flex max-w-full overflow-hidden rounded-sm align-middle shadow-none',
        shouldZoom ? 'cursor-zoom-out' : 'cursor-zoom-in',
        className,
      )}
      style={style}
      onMouseEnter={() => setIsZoomed(true)}
      onMouseLeave={() => {
        setIsZoomed(false)
        setHasMoved(false)
      }}
      onMouseMove={handleMouseMove}
    >
      <img
        src={src}
        alt={alt}
        draggable="false"
        className={cn(
          'block transition-transform duration-200 ease-out will-change-transform motion-reduce:transition-none',
          imageClassName,
        )}
        style={{
          transformOrigin,
          transform: shouldZoom ? `scale(${zoomScale})` : 'scale(1)',
        }}
      />
    </div>
  )
}
