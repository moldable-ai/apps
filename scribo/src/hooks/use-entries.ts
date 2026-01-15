import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable/ui'
import type { JournalEntry } from '@/lib/types'

export function useEntries() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['entries', workspaceId],
    queryFn: async (): Promise<JournalEntry[]> => {
      const response = await fetchWithWorkspace('/api/entries')
      if (!response.ok) {
        throw new Error('Failed to load entries')
      }
      const entries = await response.json()
      return entries.map((e: JournalEntry) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      }))
    },
  })
}

export function useSaveEntries() {
  const { fetchWithWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (entries: JournalEntry[]): Promise<void> => {
      const response = await fetchWithWorkspace('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      })
      if (!response.ok) {
        throw new Error('Failed to save entries')
      }
    },
    // Don't invalidate on success - we use optimistic updates
    // Invalidating causes refetch which can reset cursor position
  })
}

// Optimistic update helper - directly update cache without refetch
export function useUpdateEntriesCache() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()

  return (updater: (entries: JournalEntry[]) => JournalEntry[]) => {
    queryClient.setQueryData<JournalEntry[]>(
      ['entries', workspaceId],
      (old) => {
        if (!old) return old
        return updater(old)
      },
    )
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
