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

  const reorderFoldersMutation = useMutation({
    mutationFn: async (folderIds: string[]) => {
      const res = await fetchWithWorkspace('/api/folders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderIds }),
      })
      if (!res.ok) throw new Error('Failed to reorder folders')
      return (await res.json()) as FoldersResponse
    },
    onMutate: async (folderIds) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FoldersResponse>(queryKey)
      if (previous) {
        const byId = new Map(
          previous.folders.map((folder) => [folder.id, folder]),
        )
        const seen = new Set<string>()
        const requested = folderIds
          .map((id) => {
            if (seen.has(id)) return null
            seen.add(id)
            return byId.get(id) ?? null
          })
          .filter((folder): folder is Folder => Boolean(folder))
        const remaining = previous.folders.filter(
          (folder) => !seen.has(folder.id),
        )
        queryClient.setQueryData<FoldersResponse>(queryKey, {
          folders: [...requested, ...remaining],
        })
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: invalidate,
  })

  const moveBookMutation = useMutation({
    mutationFn: async ({
      bookId,
      folderId,
      inFolder = true,
    }: {
      bookId: string
      folderId: string | null
      inFolder?: boolean
    }) => {
      const res = await fetchWithWorkspace('/api/folders/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, folderId, inFolder }),
      })
      if (!res.ok) throw new Error('Failed to update book folders')
      return (await res.json()) as FoldersResponse
    },
    onMutate: async ({ bookId, folderId, inFolder = true }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FoldersResponse>(queryKey)
      if (previous) {
        const next: FoldersResponse = {
          folders: previous.folders.map((folder) => {
            const had = folder.bookIds.includes(bookId)
            const shouldUpdate =
              folderId === null ? had : folder.id === folderId
            if (!shouldUpdate) return folder
            const bookIds =
              folderId === null || !inFolder
                ? folder.bookIds.filter((id) => id !== bookId)
                : [...folder.bookIds.filter((id) => id !== bookId), bookId]
            return { ...folder, bookIds }
          }),
        }
        queryClient.setQueryData(queryKey, next)
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous)
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
    reorderFolders: (folderIds: string[]) =>
      reorderFoldersMutation.mutateAsync(folderIds),
    moveBook: (bookId: string, folderId: string | null, inFolder = true) =>
      moveBookMutation.mutateAsync({ bookId, folderId, inFolder }),
  }
}
