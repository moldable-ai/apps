'use client'

import { AlertCircle, ExternalLink, Globe, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input } from '@moldable-ai/ui'
import { sendToMoldable } from '@moldable-ai/ui'

interface BrowserPanelProps {
  defaultUrl?: string
  onUrlChange?: (url: string) => void
}

export function BrowserPanel({
  defaultUrl = 'http://localhost:3000',
  onUrlChange,
}: BrowserPanelProps) {
  const [url, setUrl] = useState(defaultUrl)
  const [inputUrl, setInputUrl] = useState(defaultUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleNavigate = useCallback(() => {
    setUrl(inputUrl)
    onUrlChange?.(inputUrl)
  }, [inputUrl, onUrlChange])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleOpenExternal = useCallback(() => {
    sendToMoldable({ type: 'moldable:open-url', url })
  }, [url])

  const handleIframeLoad = useCallback(() => {
    // Ignore load events from empty src
    if (iframeRef.current?.src && iframeRef.current.src !== 'about:blank') {
      setIsLoading(false)
    }
  }, [])

  // Check if the URL is reachable and load it
  useEffect(() => {
    if (!url) return

    setIsLoading(true)
    setHasError(false)

    const controller = new AbortController()

    // Race between fetch and a 3 second timeout
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 3000)

    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timeoutId)
        // Fetch succeeded - server is reachable, load in iframe
        if (iframeRef.current) {
          // Force reload by resetting src
          iframeRef.current.src = 'about:blank'
          // Use requestAnimationFrame to ensure the blank page is set first
          requestAnimationFrame(() => {
            if (iframeRef.current) {
              iframeRef.current.src = url
            }
          })
        }
      })
      .catch(() => {
        clearTimeout(timeoutId)
        // Fetch failed - either aborted (timeout) or network error
        setIsLoading(false)
        setHasError(true)
      })

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [url, refreshKey])

  return (
    <div className="bg-background flex h-full flex-col border-l">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
          className="h-7 flex-1 font-mono text-xs"
          placeholder="http://localhost:3000"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleRefresh}
          title="Refresh"
        >
          <RefreshCw
            className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={handleOpenExternal}
          title="Open in browser"
        >
          <ExternalLink className="size-3.5" />
        </Button>
      </div>

      {/* Content */}
      <div className="bg-background relative flex-1 overflow-hidden">
        {/* Error state */}
        {hasError && (
          <div className="bg-background text-muted-foreground/40 absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <Globe className="size-16" strokeWidth={1} />
              <div className="bg-background absolute -bottom-1 -right-1 rounded-full p-0.5">
                <AlertCircle
                  className="text-destructive/60 size-5"
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <h2 className="text-foreground/60 text-lg font-medium">
              Can&apos;t reach this page
            </h2>
            <p className="mt-1 max-w-[240px] text-center text-sm">
              {url.includes('localhost')
                ? 'Make sure the dev server is running'
                : 'Check the URL or your connection'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleRefresh}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Try again
            </Button>
          </div>
        )}

        {/* iframe - always render but hidden when error */}
        <iframe
          ref={iframeRef}
          className={`size-full border-none ${hasError ? 'invisible' : ''}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          title="Preview"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  )
}
