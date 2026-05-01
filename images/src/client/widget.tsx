import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useWorkspace } from '@moldable-ai/ui'

type ImageThread = {
  id: string
  title: string
  status: 'generating' | 'ready' | 'failed'
  latestImageUrl: string | null
  iterations: Array<{ id: string }>
  updatedAt: string
}

const GHOST_IMAGES = ['Product poster', 'Room concept', 'Album cover']

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const imagesQuery = useQuery({
    queryKey: ['images-widget', workspaceId],
    queryFn: async () => {
      const response = await fetchWithWorkspace('/api/images')
      if (!response.ok) throw new Error('Failed to load images')
      return (await response.json()) as ImageThread[]
    },
    refetchInterval: 2_000,
  })

  const images = imagesQuery.data ?? []

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="min-h-0 flex-1 overflow-hidden">
        {imagesQuery.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="grid h-full grid-cols-3 gap-1.5">
            {GHOST_IMAGES.map((title) => (
              <div
                key={title}
                className="border-border/40 bg-muted/20 flex min-h-0 min-w-0 flex-col rounded-md border p-1.5 opacity-50 grayscale"
              >
                <div className="bg-muted mb-1 min-h-0 flex-1 rounded-sm" />
                <p className="text-muted-foreground truncate text-[10px]">
                  {title}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid h-full grid-cols-3 gap-1.5">
            {images.slice(0, 6).map((image) => (
              <div
                key={image.id}
                className="border-border/50 bg-muted min-w-0 overflow-hidden rounded-md border"
              >
                {image.status === 'generating' ? (
                  <div
                    className="image-generation-loading relative size-full overflow-hidden rounded-md"
                    aria-label="Generating image"
                  >
                    <div className="image-generation-dots absolute inset-0" />
                    <div className="image-generation-sheen absolute inset-0" />
                  </div>
                ) : image.latestImageUrl ? (
                  <img
                    src={image.latestImageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="bg-muted size-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
