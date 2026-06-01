import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { Folder, FoldersResponse } from '../lib/types'

export type { Folder } from '../lib/types'

/**
 * Folder organisation for the recipe library, mirroring the Piano app's
 * folders hook: create / rename / delete / reorder folders, and move a recipe
 * into a folder (or back to the library with folderId = null). Moves and
 * reorders are optimistic so the UI responds instantly.
 */
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
        const byId = new Map(previous.folders.map((f) => [f.id, f]))
        const seen = new Set<string>()
        const requested = folderIds
          .map((id) => {
            if (seen.has(id)) return null
            seen.add(id)
            return byId.get(id) ?? null
          })
          .filter((f): f is Folder => Boolean(f))
        const remaining = previous.folders.filter((f) => !seen.has(f.id))
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

  const moveRecipeMutation = useMutation({
    mutationFn: async ({
      recipeId,
      folderId,
    }: {
      recipeId: string
      folderId: string | null
    }) => {
      const res = await fetchWithWorkspace('/api/folders/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, folderId }),
      })
      if (!res.ok) throw new Error('Failed to move recipe')
      return (await res.json()) as FoldersResponse
    },
    onMutate: async ({ recipeId, folderId }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<FoldersResponse>(queryKey)
      if (previous) {
        const next: FoldersResponse = {
          folders: previous.folders.map((folder) => {
            const had = folder.recipeIds.includes(recipeId)
            const willHave = folder.id === folderId
            if (had === willHave) return folder
            return {
              ...folder,
              recipeIds: willHave
                ? [
                    ...folder.recipeIds.filter((id) => id !== recipeId),
                    recipeId,
                  ]
                : folder.recipeIds.filter((id) => id !== recipeId),
            }
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
    moveRecipe: (recipeId: string, folderId: string | null) =>
      moveRecipeMutation.mutateAsync({ recipeId, folderId }),
  }
}
