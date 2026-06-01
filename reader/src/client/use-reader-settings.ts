import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import {
  DEFAULT_READER_SETTINGS,
  type ReaderSettings,
  type ReaderSettingsResponse,
  normalizeReaderSettings,
} from '../shared/reader-settings'

export function useReaderSettings() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = ['reader-settings', workspaceId] as const

  const settingsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      return (await res.json()) as ReaderSettingsResponse
    },
  })

  const settings = settingsQuery.data?.settings ?? DEFAULT_READER_SETTINGS

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<ReaderSettings>) => {
      const res = await fetchWithWorkspace('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      return (await res.json()) as ReaderSettingsResponse
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey })
      const previous =
        queryClient.getQueryData<ReaderSettingsResponse>(queryKey)
      const base = previous?.settings ?? DEFAULT_READER_SETTINGS
      queryClient.setQueryData<ReaderSettingsResponse>(queryKey, {
        settings: normalizeReaderSettings({ ...base, ...patch }),
      })
      return { previous }
    },
    onError: (_err, _patch, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: (data) => {
      if (data) queryClient.setQueryData(queryKey, data)
    },
  })

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    update: (patch: Partial<ReaderSettings>) => updateMutation.mutate(patch),
  }
}
