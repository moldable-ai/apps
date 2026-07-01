import { Maximize, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SlideFrame } from './slide-frame'

interface PresentOverlayProps {
  workspaceId?: string
  deckId: string
  version: string | number
  startIndex: number
  onClose: () => void
}

type FullscreenRequest = boolean | 'toggle'

function fullscreenRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `slides-fullscreen-${crypto.randomUUID()}`
  }
  return `slides-fullscreen-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function requestHostFullscreen(fullscreen: FullscreenRequest) {
  if (window.parent === window) return
  window.parent.postMessage(
    {
      type: 'moldable:set-window-fullscreen',
      requestId: fullscreenRequestId(),
      fullscreen,
    },
    '*',
  )
}

function isDeckShortcut(key: string): boolean {
  return (
    key === ' ' ||
    key === 'ArrowRight' ||
    key === 'ArrowDown' ||
    key === 'PageDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowUp' ||
    key === 'PageUp' ||
    key === 'Home' ||
    key === 'End' ||
    key === 'f' ||
    key === 'F' ||
    key === 's' ||
    key === 'S' ||
    key === 'j' ||
    key === 'l' ||
    key === 'k' ||
    key === 'h' ||
    /^[0-9]$/.test(key)
  )
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
  )
}

// Fullscreen presentation. The embedded deck runs its own controller, so arrow
// keys / space / F all work inside it; we add Escape-to-exit and a fade-out
// chrome bar for closing and entering native fullscreen.
export function PresentOverlay({
  workspaceId,
  deckId,
  version,
  startIndex,
  onClose,
}: PresentOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [chromeVisible, setChromeVisible] = useState(true)

  const closePresentation = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => undefined)
    }
    requestHostFullscreen(false)
    onClose()
  }, [onClose])

  const enterFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen()
        return
      } catch {
        // Moldable's host API covers iframe permissions-policy denials.
      }
    }
    requestHostFullscreen(true)
  }, [])

  const postDeckKey = useCallback((key: string) => {
    frameRef.current
      ?.querySelector('iframe')
      ?.contentWindow?.postMessage({ type: 'deck:key', key }, '*')
  }, [])

  // Escape closes from the parent, regardless of focus location.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePresentation()
        return
      }
      if (isTextEntryTarget(e.target) || !isDeckShortcut(e.key)) return
      e.preventDefault()
      if (e.key === 'f' || e.key === 'F') void enterFullscreen()
      else postDeckKey(e.key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closePresentation, enterFullscreen, postDeckKey])

  // Auto-hide the chrome bar after inactivity.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const show = () => {
      setChromeVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setChromeVisible(false), 2200)
    }
    show()
    window.addEventListener('mousemove', show)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', show)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] bg-black"
      role="dialog"
      aria-modal="true"
    >
      <div ref={frameRef} className="h-full w-full">
        <SlideFrame
          workspaceId={workspaceId}
          deckId={deckId}
          version={version}
          active={startIndex}
          interactive
          autoFocusFrame
          className="h-full w-full border-0"
          title="Presentation"
        />
      </div>

      <div
        className={`absolute right-4 top-4 flex gap-2 transition-opacity duration-300 ${
          chromeVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          onClick={() => void enterFullscreen()}
          title="Fullscreen (F inside deck)"
          className="cursor-pointer rounded-full bg-black/45 p-2.5 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-black/65"
        >
          <Maximize className="size-5" />
        </button>
        <button
          onClick={closePresentation}
          title="Exit (Esc)"
          className="cursor-pointer rounded-full bg-black/45 p-2.5 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-black/65"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>
  )
}
