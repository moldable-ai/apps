import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { Folder, FoldersResponse } from '../shared/folder'

export type { Folder } from '../shared/folder'

export function useFolders() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = ['folders', workspaceId] as const

  const foldersQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/folders')
      if (!res.ok) throw new Error('Failed to load folders')
      return (await res.json()) as FoldersResponse
    },
  })

  const folders = foldersQuery.data?.folders ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })

  const addFolderMutation = useMutation({
    mutationFn: async (input: { name: string; tone?: string }) => {
      const res = await fetchWithWorkspace('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Failed to create folder')
      }
      return (await res.json()) as Folder
    },
    onSuccess: invalidate,
  })

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetchWithWorkspace(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to rename folder')
      return (await res.json()) as Folder
    },
    onSuccess: invalidate,
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/folders/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete folder')
      return true
    },
    onSuccess: invalidate,
  })

  const moveSongMutation = useMutation({
    mutationFn: async ({
      songId,
      folderId,
    }: {
      songId: string
      folderId: string | null
    }) => {
      const res = await fetchWithWorkspace('/api/folders/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, folderId }),
      })
      if (!res.ok) throw new Error('Failed to move song')
      return (await res.json()) as FoldersResponse
    },
    // Optimistic update so the card moves instantly
    onMutate: async ({ songId, folderId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FoldersResponse>(queryKey)
      if (previous) {
        const next: FoldersResponse = {
          folders: previous.folders.map((folder) => {
            const had = folder.songIds.includes(songId)
            const willHave = folder.id === folderId
            if (had === willHave) return folder
            return {
              ...folder,
              songIds: willHave
                ? [...folder.songIds.filter((id) => id !== songId), songId]
                : folder.songIds.filter((id) => id !== songId),
            }
          }),
        }
        queryClient.setQueryData(queryKey, next)
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: invalidate,
  })

  return {
    folders,
    isLoading: foldersQuery.isLoading,
    isError: foldersQuery.isError,
    addFolder: (name: string, tone?: string) =>
      addFolderMutation.mutateAsync({ name, tone }),
    renameFolder: (id: string, name: string) =>
      renameFolderMutation.mutateAsync({ id, name }),
    deleteFolder: (id: string) => deleteFolderMutation.mutateAsync(id),
    moveSong: (songId: string, folderId: string | null) =>
      moveSongMutation.mutateAsync({ songId, folderId }),
  }
}
