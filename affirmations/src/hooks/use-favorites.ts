import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'

export function useFavorites() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['affirmations-favorites', workspaceId],
    queryFn: async (): Promise<string[]> => {
      const res = await fetchWithWorkspace('/api/favorites')
      if (!res.ok) throw new Error('Failed to fetch favorite affirmations')

      const data: unknown = await res.json()
      return Array.isArray(data)
        ? data.filter((item): item is string => typeof item === 'string')
        : []
    },
  })
}

export function useSaveFavorites() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useMutation({
    scope: { id: `affirmations-favorites-${workspaceId ?? 'default'}` },
    mutationFn: async (favorites: string[]): Promise<void> => {
      const res = await fetchWithWorkspace('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(favorites),
      })

      if (!res.ok) throw new Error('Failed to save favorite affirmations')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['affirmations-favorites', workspaceId],
      })
    },
  })
}

export function useSetFavorite() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useMutation({
    scope: { id: `affirmations-favorites-${workspaceId ?? 'default'}` },
    mutationFn: async ({
      text,
      favorite,
    }: {
      text: string
      favorite: boolean
    }): Promise<string[]> => {
      const res = await fetchWithWorkspace('/api/favorites/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, favorite }),
      })

      if (!res.ok) throw new Error('Failed to update favorite affirmation')

      const data: unknown = await res.json()
      return Array.isArray(data)
        ? data.filter((item): item is string => typeof item === 'string')
        : []
    },
    onSuccess: (favorites) => {
      queryClient.setQueryData(
        ['affirmations-favorites', workspaceId],
        favorites,
      )
    },
  })
}

export function useUpdateFavoritesCache() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()

  return (updater: (prev: string[]) => string[]) => {
    queryClient.setQueryData<string[]>(
      ['affirmations-favorites', workspaceId],
      (prev) => updater(prev ?? []),
    )
  }
}
