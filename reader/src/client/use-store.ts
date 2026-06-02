import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { BookMeta } from '../shared/book'

export interface StoreBook {
  id: string
  source: 'gutenberg' | 'open-library'
  sourceLabel: string
  title: string
  author: string | null
  language: string
  coverUrl: string
}

export interface StoreListResponse {
  results: StoreBook[]
  total?: number
  page?: number
  pageSize?: number
  installed: string[]
}

/** Featured list when query is empty, full-text search otherwise. */
export function useStoreList(query: string) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['store', workspaceId, trimmed],
    queryFn: async () => {
      const url = trimmed
        ? `/api/store/search?q=${encodeURIComponent(trimmed)}`
        : '/api/store/featured'
      const res = await fetchWithWorkspace(url)
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'The store is unavailable right now')
      }
      return (await res.json()) as StoreListResponse
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useInstallFromStore() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace('/api/store/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Install failed')
      }
      return ((await res.json()) as { book: BookMeta }).book
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['books', workspaceId] })
      void queryClient.invalidateQueries({ queryKey: ['store', workspaceId] })
    },
  })
}
