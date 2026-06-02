import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import type { BookMeta, ReadingProgress } from '../shared/book'

interface BookResponse {
  book: BookMeta
  progress: ReadingProgress | null
}

/**
 * Persist reading position. Returns a stable `save` that PUTs progress and
 * refreshes the book list so the library + Today view reflect the new percent.
 */
export function useProgressWriter(bookId: string | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useCallback(
    async (patch: Partial<ReadingProgress>) => {
      if (!bookId) return
      try {
        const res = await fetchWithWorkspace(`/api/books/${bookId}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error('Failed to save progress')
        const data = (await res.json()) as { progress: ReadingProgress }
        queryClient.setQueryData<BookResponse>(
          ['book', workspaceId, bookId],
          (previous) =>
            previous ? { ...previous, progress: data.progress } : previous,
        )
        void queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
      } catch {
        // Best-effort; position will resync on next save.
      }
    },
    [bookId, fetchWithWorkspace, queryClient, workspaceId],
  )
}
