// Renders a deck preview in an iframe. The deck self-scales its fixed
// 1920x1080 stage to the iframe box, so we just give it a 16:9 container.
//
// - thumb mode: static, shows one slide, no interaction (used in rails/cards).
// - interactive mode: the live canvas; selection is driven via postMessage
//   (`deck:goto`) and the deck reports its current slide back (`deck:slide`).
import { useEffect, useRef } from 'react'
import type { Slide } from '../../shared/types'

export interface SlideFramePatch {
  revision: string | number
  slide: Slide
}

interface SlideFrameProps {
  workspaceId?: string
  deckId: string
  /** Bump to force a reload after edits (e.g. deck.updatedAt). */
  version: string | number
  active: number
  thumb?: boolean
  interactive?: boolean
  /** Editor canvas only: enable image-click → `deck:image-click` to the host. */
  edit?: boolean
  /** Editor canvas only: patch one slide without reloading the iframe. */
  slidePatch?: SlideFramePatch | null
  /** Presentation mode: move keyboard focus into the iframe on mount/load. */
  autoFocusFrame?: boolean
  onSlideChange?: (index: number) => void
  className?: string
  title?: string
}

export function SlideFrame({
  workspaceId,
  deckId,
  version,
  active,
  thumb = false,
  interactive = false,
  edit = false,
  slidePatch = null,
  autoFocusFrame = false,
  onSlideChange,
  className,
  title = 'Slide preview',
}: SlideFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null)
  const ws = workspaceId || 'default'

  const params = new URLSearchParams()
  if (thumb) {
    params.set('thumb', '1')
    params.set('active', String(active))
  }
  if (edit) params.set('edit', '1')
  params.set('v', String(version))
  const src = `/api/preview/${encodeURIComponent(ws)}/${encodeURIComponent(deckId)}/index.html?${params.toString()}`

  const focusFrame = () => {
    if (!autoFocusFrame) return
    requestAnimationFrame(() => ref.current?.focus())
  }

  const postSlidePatch = () => {
    if (thumb || !interactive || !slidePatch) return
    ref.current?.contentWindow?.postMessage(
      {
        type: 'deck:update-slide',
        slideId: slidePatch.slide.id,
        bodyHtml: slidePatch.slide.bodyHtml,
        slideClass: slidePatch.slide.slideClass ?? '',
        transition: slidePatch.slide.transition ?? 'fade',
        notes: slidePatch.slide.notes ?? '',
      },
      '*',
    )
  }

  // Drive the live canvas to the selected slide without reloading.
  useEffect(() => {
    if (thumb || !interactive) return
    ref.current?.contentWindow?.postMessage(
      { type: 'deck:goto', index: active },
      '*',
    )
  }, [active, interactive, thumb])

  useEffect(() => {
    postSlidePatch()
    // The revision is the stable signal that a patch has changed; the slide
    // object can be a fresh reference from the query cache on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidePatch?.revision, interactive, thumb])

  useEffect(() => {
    focusFrame()
    // Focus is tied to this iframe instance; src changes create a new load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusFrame, src])

  // Reflect the deck's current slide back to the host (arrow-key nav, etc).
  useEffect(() => {
    if (thumb || !interactive || !onSlideChange) return
    const handler = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return
      const data = event.data as { type?: string; index?: number }
      if (data?.type === 'deck:slide' && typeof data.index === 'number') {
        onSlideChange(data.index)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [interactive, onSlideChange, thumb])

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      className={className}
      onLoad={() => {
        focusFrame()
        postSlidePatch()
        if (!thumb && interactive) {
          ref.current?.contentWindow?.postMessage(
            { type: 'deck:goto', index: active },
            '*',
          )
        }
      }}
      // Keep preview scripts in an opaque origin; the deck controller still runs,
      // but authored slide HTML cannot reach same-origin app APIs.
      sandbox="allow-scripts allow-popups"
      tabIndex={autoFocusFrame ? 0 : undefined}
      allow="fullscreen"
      allowFullScreen
      scrolling="no"
    />
  )
}
