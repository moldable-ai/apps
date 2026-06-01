import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { BookMeta, ChapterContent, ReadingProgress } from '../shared/book'

interface BookResponse {
  book: BookMeta
  progress: ReadingProgress | null
}

export function useBook(bookId: string | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['book', workspaceId, bookId],
    enabled: Boolean(bookId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(`/api/books/${bookId}`)
      if (!res.ok) throw new Error('Failed to load book')
      return (await res.json()) as BookResponse
    },
  })
}

export function useChapter(bookId: string | null, index: number | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['chapter', workspaceId, bookId, index],
    enabled: Boolean(bookId) && index !== null && index >= 0,
    queryFn: async () => {
      const res = await fetchWithWorkspace(
        `/api/books/${bookId}/chapter/${index}`,
      )
      if (!res.ok) throw new Error('Failed to load chapter')
      return (await res.json()) as ChapterContent
    },
  })
}
