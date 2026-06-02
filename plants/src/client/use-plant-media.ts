import { useCallback, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type { MediaResult } from '../lib/types'

/**
 * Image upload for the Plants app. Browser uploads go through
 * POST /api/plants/media; desktop Finder drops (absolute paths) go through
 * POST /api/plants/media-paths. Both return MediaResult(s) including the
 * absolute on-disk `absPath`, which the client hands to the desktop chat for
 * vision-based identification. `uploading` is true while any request is in
 * flight so the caller can show progress.
 */
export function usePlantMedia(): {
  uploadFile(file: File): Promise<MediaResult>
  importPaths(paths: string[]): Promise<MediaResult[]>
  uploading: boolean
} {
  const { fetchWithWorkspace } = useWorkspace()
  const [pending, setPending] = useState(0)

  const uploadFile = useCallback(
    async (file: File): Promise<MediaResult> => {
      setPending((n) => n + 1)
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetchWithWorkspace('/api/plants/media', {
          method: 'POST',
          body,
        })
        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(detail?.error ?? 'Failed to upload image')
        }
        return (await res.json()) as MediaResult
      } finally {
        setPending((n) => Math.max(0, n - 1))
      }
    },
    [fetchWithWorkspace],
  )

  const importPaths = useCallback(
    async (paths: string[]): Promise<MediaResult[]> => {
      setPending((n) => n + 1)
      try {
        const res = await fetchWithWorkspace('/api/plants/media-paths', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        })
        if (!res.ok) {
          const detail = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(detail?.error ?? 'Failed to import images')
        }
        return (await res.json()) as MediaResult[]
      } finally {
        setPending((n) => Math.max(0, n - 1))
      }
    },
    [fetchWithWorkspace],
  )

  return { uploadFile, importPaths, uploading: pending > 0 }
}
