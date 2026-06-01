import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { BookMeta, BooksResponse } from '../shared/book'

export function useBooks() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = ['books', workspaceId] as const

  const booksQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/books')
      if (!res.ok) throw new Error('Failed to load books')
      return (await res.json()) as BooksResponse
    },
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
    void queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
  }

  const importFilesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const imported: BookMeta[] = []
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetchWithWorkspace('/api/books/import', {
          method: 'POST',
          body: form,
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(body?.error ?? `Failed to import ${file.name}`)
        }
        const data = (await res.json()) as { book: BookMeta }
        imported.push(data.book)
      }
      return imported
    },
    onSuccess: invalidate,
  })

  const importPathMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const res = await fetchWithWorkspace('/api/books/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Failed to import book')
      }
      return ((await res.json()) as { book: BookMeta }).book
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const res = await fetchWithWorkspace(`/api/books/${bookId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete book')
      return true
    },
    onSuccess: invalidate,
  })

  return {
    books: booksQuery.data?.books ?? [],
    isLoading: booksQuery.isLoading,
    isError: booksQuery.isError,
    refetch: booksQuery.refetch,
    importFiles: (files: File[]) => importFilesMutation.mutateAsync(files),
    importByPath: (filePath: string) =>
      importPathMutation.mutateAsync(filePath),
    isImporting: importFilesMutation.isPending || importPathMutation.isPending,
    importError:
      (importFilesMutation.error as Error | null)?.message ??
      (importPathMutation.error as Error | null)?.message ??
      null,
    deleteBook: (bookId: string) => deleteMutation.mutateAsync(bookId),
  }
}
