'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import { cn } from '@moldable-ai/ui'

interface EnhancingEditorProps {
  originalNotes: string
  enhancedContent: string
  isEnhancing: boolean
  className?: string
  scrollContainer?: HTMLElement | null
}

export function EnhancingEditor({
  originalNotes,
  enhancedContent,
  isEnhancing,
  className,
  scrollContainer,
}: EnhancingEditorProps) {
  const [showIndicator, setShowIndicator] = useState(false)
  const [enhancingBarPosition, setEnhancingBarPosition] = useState(0)
  const [barBounds, setBarBounds] = useState({ left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const enhancedContentRef = useRef<HTMLDivElement>(null)
  const enhancingBarRef = useRef<HTMLDivElement>(null)
  const previousContentLengthRef = useRef(0)

  useEffect(() => {
    if (!isEnhancing) {
      setShowIndicator(false)
      return
    }

    setShowIndicator(true)

    const updatePosition = () => {
      const contentElement = enhancedContentRef.current ?? rootRef.current
      if (!contentElement) return

      const rect = contentElement.getBoundingClientRect()
      const contentHeight = contentElement.scrollHeight
      const containerRect =
        scrollContainer?.getBoundingClientRect() ??
        ({
          top: 0,
          bottom: window.innerHeight,
          left: 0,
          right: window.innerWidth,
        } as DOMRect)
      const measuredBarHeight =
        enhancingBarRef.current?.getBoundingClientRect().height ?? 96

      const topPinBuffer = 8
      const bottomPinBuffer = 12
      const topGradientOffset = 36
      const initialOffset = 20
      const minAllowedPosition =
        containerRect.top + topGradientOffset + topPinBuffer
      const maxAllowedPosition =
        containerRect.bottom -
        bottomPinBuffer -
        measuredBarHeight +
        topGradientOffset
      const safeMaxAllowedPosition = Math.max(
        maxAllowedPosition,
        minAllowedPosition,
      )

      const maxBarWidth = 896
      const horizontalPadding = 16
      const availableWidth = Math.max(
        containerRect.width - horizontalPadding * 2,
        0,
      )
      const barWidth = Math.min(availableWidth, maxBarWidth)
      const barLeft = containerRect.left + (containerRect.width - barWidth) / 2

      setBarBounds({
        left: barLeft,
        width: barWidth,
      })

      const minPosition = rect.top - initialOffset
      const contentPosition = rect.top + contentHeight
      const trimmedContentLength = enhancedContent.trim().length
      const targetPosition =
        trimmedContentLength === 0
          ? minAllowedPosition + 84
          : trimmedContentLength < 50
            ? contentPosition - initialOffset
            : Math.max(minPosition, contentPosition)

      setEnhancingBarPosition(
        Math.min(
          Math.max(targetPosition, minAllowedPosition),
          safeMaxAllowedPosition,
        ),
      )
    }

    updatePosition()
    const interval = window.setInterval(updatePosition, 50)
    const resizeObserver = new ResizeObserver(updatePosition)
    const observedElement = enhancedContentRef.current ?? rootRef.current
    if (observedElement) {
      resizeObserver.observe(observedElement)
    }

    return () => {
      window.clearInterval(interval)
      resizeObserver.disconnect()
    }
  }, [enhancedContent, isEnhancing, scrollContainer])

  useEffect(() => {
    if (!isEnhancing || !scrollContainer || enhancingBarPosition <= 0) {
      return
    }

    const currentContentLength = enhancedContent.length
    const wasContentReset =
      currentContentLength < previousContentLengthRef.current - 10
    previousContentLengthRef.current = currentContentLength
    if (wasContentReset) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const barHeight =
      enhancingBarRef.current?.getBoundingClientRect().height ?? 96
    const barTop = enhancingBarPosition - 36
    const barBottom = barTop + barHeight
    const scrollBuffer = 200

    if (barBottom > containerRect.bottom - scrollBuffer) {
      scrollContainer.scrollTo({
        top:
          scrollContainer.scrollTop +
          barBottom -
          containerRect.bottom +
          scrollBuffer,
        behavior: 'smooth',
      })
    }
  }, [enhancedContent, enhancingBarPosition, isEnhancing, scrollContainer])

  return (
    <div
      ref={rootRef}
      className={cn('pointer-events-none relative min-h-full', className)}
      data-testid="enhancing-editor"
    >
      <div className="relative z-10 opacity-55">
        <MarkdownEditor
          value={originalNotes}
          onChange={() => undefined}
          placeholder="Manual notes will appear here..."
          disabled
          minHeight="100%"
          maxHeight="none"
          className="meetings-document-editor"
          contentClassName="meetings-document-content"
          hideMarkdownHint
        />
      </div>

      <div
        ref={enhancedContentRef}
        className="bg-background absolute inset-x-0 top-0 z-20"
      >
        <div className="meetings-enhanced-content">
          <MarkdownEditor
            value={enhancedContent}
            onChange={() => undefined}
            placeholder=""
            minHeight="100%"
            maxHeight="none"
            className="meetings-document-editor"
            contentClassName="meetings-document-content meetings-enhanced-document-content"
            hideMarkdownHint
          />
        </div>
      </div>

      {showIndicator && isEnhancing && barBounds.width > 0 ? (
        <div
          ref={enhancingBarRef}
          className="meetings-enhance-follow-bar"
          style={{
            left: barBounds.left,
            width: barBounds.width,
            top: enhancingBarPosition - 36,
          }}
        >
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 px-2">
              <div className="from-background/90 via-background/75 h-full w-full rounded-lg bg-gradient-to-t to-transparent" />
            </div>
            <div className="relative px-2 pb-4 pt-4">
              <div className="meetings-enhance-bar border-border/70 bg-foreground/10 text-foreground shadow-lg shadow-black/10">
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
                <span>Enhancing notes...</span>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 px-2">
              <div className="from-background/90 via-background/75 h-full w-full rounded-lg bg-gradient-to-b to-transparent" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
