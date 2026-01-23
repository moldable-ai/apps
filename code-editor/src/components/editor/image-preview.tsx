'use client'

import {
  AlertCircle,
  ImageIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner, useWorkspace } from '@moldable-ai/ui'
import { Button } from '@moldable-ai/ui'
import { getFileName } from '@/lib/file-utils'

interface ImagePreviewProps {
  path: string
}

export function ImagePreview({ path }: ImagePreviewProps) {
  const { workspaceId } = useWorkspace()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{
    width: number
    height: number
  } | null>(null)
  const [zoom, setZoom] = useState(1)

  const fileName = getFileName(path)

  // Build image URL with workspace header workaround (use query param since img tags can't set headers)
  const imageUrl = `/api/image?path=${encodeURIComponent(path)}${workspaceId ? `&workspace=${encodeURIComponent(workspaceId)}` : ''}`

  useEffect(() => {
    // Reset state when path changes
    setIsLoading(true)
    setError(null)
    setDimensions(null)
    setZoom(1)
  }, [path])

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setIsLoading(false)
  }

  const handleError = () => {
    setError('Failed to load image')
    setIsLoading(false)
  }

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 5))
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 0.1))
  const handleResetZoom = () => setZoom(1)

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-border bg-muted/30 flex items-center justify-between border-b px-4 py-2">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <ImageIcon className="size-4" />
          <span>{fileName}</span>
          {dimensions && (
            <span className="text-xs">
              ({dimensions.width} × {dimensions.height})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.1}
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="text-muted-foreground min-w-[4rem] text-center text-xs">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 5}
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            disabled={zoom === 1}
            title="Reset zoom"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
      </div>

      {/* Image container */}
      <div className="relative flex-1 overflow-auto">
        {/* Checkerboard background for transparency */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
              linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
              linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {/* Centered content container */}
        <div className="relative flex min-h-full items-center justify-center p-8">
          {isLoading && (
            <div className="flex flex-col items-center gap-2">
              <Spinner className="size-8" />
              <span className="text-muted-foreground text-sm">
                Loading image...
              </span>
            </div>
          )}

          {error && (
            <div className="text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="size-8" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <img
            src={imageUrl}
            alt={fileName}
            onLoad={handleLoad}
            onError={handleError}
            className={`max-w-none transition-transform ${isLoading ? 'invisible' : 'visible'}`}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
