import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { SongSummary } from '../shared/song'

export interface CatalogResult {
  provider: 'mutopia'
  id: string
  mutopiaId: string
  title: string
  composer: string
  opus?: string
  style?: string
  license: string
  sourceUrl: string
  midiUrl?: string
  lilypondUrl?: string
  installed: boolean
}

export interface CatalogSearchResponse {
  provider: string
  repository: string
  repositoryCommit: string
  generatedAt: string
  results: CatalogResult[]
}

export interface CatalogStatus {
  indexed: boolean
  indexPath: string
  repository: string
  repositoryCommit: string
  generatedAt: string
  entryCount: number
}

export interface InstallSongResponse {
  installed: boolean
  song: SongSummary
}

export function useCatalogStatus(enabled = true) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['catalog-status', workspaceId],
    enabled,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/song-catalog/mutopia/status')
      if (!res.ok) throw new Error('Failed to load catalog status')
      return (await res.json()) as CatalogStatus
    },
    staleTime: 60_000,
  })
}

export function useCatalogSearch(query: string, limit = 40) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const trimmed = query.trim()
  return useQuery({
    queryKey: ['catalog-search', workspaceId, trimmed, limit],
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({ q: trimmed, limit: String(limit) })
      const res = await fetchWithWorkspace(
        `/api/song-catalog/search?${params.toString()}`,
      )
      if (!res.ok) throw new Error('Failed to search catalog')
      return (await res.json()) as CatalogSearchResponse
    },
    staleTime: 30_000,
  })
}

export function useInstallCatalogSong() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      provider: 'mutopia'
      id?: string
      mutopiaId?: string
    }) => {
      const res = await fetchWithWorkspace('/api/song-catalog/install', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Failed to install song')
      }
      return (await res.json()) as InstallSongResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['songs', workspaceId] })
      void queryClient.invalidateQueries({
        queryKey: ['song-previews', workspaceId],
      })
      void queryClient.invalidateQueries({ queryKey: ['catalog-search'] })
    },
  })
}
