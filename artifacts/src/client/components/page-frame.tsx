// Renders a page artifact in an iframe.
//
// - thumb mode: a static, non-interactive preview. The page is rendered at a
//   fixed desktop width and uniformly scaled down to fill the card, so the
//   thumbnail shows the real desktop design (not a cramped mobile crop).
// - interactive mode: the live, scrollable canvas at the real viewport width.
import { useEffect, useRef, useState } from 'react'
import { useRuntimeStateBridge } from '../lib/runtime-state-bridge'

interface PageFrameProps {
  workspaceId?: string
  artifactId: string
  /** Bump to force a reload after edits (e.g. artifact.updatedAt). */
  version: string | number
  thumb?: boolean
  /** Logical width the page is rendered at in thumb mode before scaling down. */
  thumbWidth?: number
  className?: string
  title?: string
}

export function PageFrame({
  workspaceId,
  artifactId,
  version,
  thumb = false,
  thumbWidth = 1280,
  className,
  title = 'Page preview',
}: PageFrameProps) {
  const ws = workspaceId || 'default'
  const params = new URLSearchParams({ v: String(version) })
  if (thumb) params.set('thumb', '1')
  const src = `/api/preview/${encodeURIComponent(ws)}/${encodeURIComponent(artifactId)}/index.html?${params.toString()}`

  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0.3)

  useRuntimeStateBridge({
    frameRef,
    workspaceId: ws,
    artifactId,
    clientHeader: 'x-artifacts-client',
    enabled: !thumb,
  })

  useEffect(() => {
    if (!thumb) return
    const el = boxRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / thumbWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [thumb, thumbWidth])

  if (thumb) {
    // Fixed-width page scaled to fill the (16:9) card; top-aligned to show the hero.
    return (
      <div
        ref={boxRef}
        className={`relative overflow-hidden ${className ?? ''}`}
      >
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          scrolling="no"
          sandbox="allow-scripts allow-popups"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: thumbWidth,
            height: thumbWidth, // tall; the card clips to its aspect ratio
            transform: `scale(${scale})`,
          }}
        />
      </div>
    )
  }

  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className={className}
      sandbox="allow-scripts allow-popups"
      allow="fullscreen"
      allowFullScreen
    />
  )
}
