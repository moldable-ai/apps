import { useQuery } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { GuitarAudioOptionsResponse } from '../shared/audio'

export function useAudioOptions() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['audio-options', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/audio/options')
      if (!res.ok) throw new Error('Failed to load audio options')
      return (await res.json()) as GuitarAudioOptionsResponse
    },
    staleTime: 60_000,
  })
}
