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

  function handleMouseMove(event: MouseEvent<HTMLImageElement>) {
    if (!containerRef.current || !isMounted) return

    if (!hasMoved) setHasMoved(true)

    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((event.clientX - left) / width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - top) / height) * 100))

    setTransformOrigin(`${x}% ${y}%`)
  }

  const shouldZoom = isZoomed && isMounted && hasMoved

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex max-w-full overflow-visible rounded-sm align-middle shadow-none',
        shouldZoom ? 'z-20' : null,
        className,
      )}
      style={style}
    >
      <img
        src={src}
        alt={alt}
        draggable="false"
        className={cn(
          'block select-none rounded-sm transition-opacity duration-75 ease-out motion-reduce:transition-none',
          shouldZoom
            ? 'cursor-zoom-out opacity-0'
            : 'cursor-zoom-in opacity-100',
          imageClassName,
        )}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => {
          setIsZoomed(false)
          setHasMoved(false)
          setTransformOrigin('50% 50%')
        }}
        onMouseMove={handleMouseMove}
      />
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable="false"
        className={cn(
          'pointer-events-none absolute inset-0 block h-full w-full select-none rounded-sm object-contain transition-[opacity,transform] duration-200 ease-out will-change-transform motion-reduce:transition-none',
          shouldZoom ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transformOrigin,
          transform: shouldZoom ? `scale(${zoomScale})` : 'scale(1)',
        }}
      />
    </div>
  )
}
