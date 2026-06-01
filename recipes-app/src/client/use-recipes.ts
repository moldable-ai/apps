import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { Recipe } from '../lib/types'

/**
 * Recipe data access. Reads come from GET /api/recipes; every write goes
 * through the server's atomic RPC endpoint (recipes.create / update / favorite
 * / delete) — the SAME path the host chat uses. This means UI edits and
 * chat-driven edits can't clobber each other (the old whole-array POST did),
 * and one code path stays authoritative for both surfaces.
 */
export type RecipeCreateInput = Partial<
  Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
> & {
  title: string
}
export type RecipeUpdateInput = Partial<
  Omit<Recipe, 'createdAt' | 'updatedAt'>
> & {
  id: string
}

type RpcEnvelope<T> = {
  ok: boolean
  result?: T
  error?: { code: string; message: string }
}

export function useRecipes() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = ['recipes', workspaceId] as const

  const recipesQuery = useQuery<Recipe[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/recipes')
      if (!res.ok) throw new Error('Failed to fetch recipes')
      return res.json()
    },
  })

  const rpc = async <T>(method: string, params: unknown): Promise<T> => {
    const res = await fetchWithWorkspace('/api/moldable/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
    })
    const body = (await res.json().catch(() => null)) as RpcEnvelope<T> | null
    if (!res.ok || !body?.ok) {
      throw new Error(body?.error?.message ?? `Recipes ${method} failed`)
    }
    return body.result as T
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] })

  const createMutation = useMutation({
    mutationFn: (input: RecipeCreateInput) =>
      rpc<Recipe>('recipes.create', input),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...patch }: RecipeUpdateInput) =>
      rpc<Recipe>('recipes.update', { id, ...patch }),
    // Optimistically patch the cached recipe so edits feel instant.
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Recipe[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Recipe[]>(
          queryKey,
          previous.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: invalidate,
  })

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      rpc<Recipe>('recipes.favorite', { id, isFavorite }),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Recipe[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Recipe[]>(
          queryKey,
          previous.map((r) => (r.id === id ? { ...r, isFavorite } : r)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rpc<Recipe>('recipes.delete', { id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Recipe[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Recipe[]>(
          queryKey,
          previous.map((r) => (r.id === id ? { ...r, isDeleted: true } : r)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
    },
  })

  return {
    recipes: recipesQuery.data ?? [],
    isLoading: recipesQuery.isLoading,
    isError: recipesQuery.isError,
    createRecipe: (input: RecipeCreateInput) =>
      createMutation.mutateAsync(input),
    updateRecipe: (input: RecipeUpdateInput) =>
      updateMutation.mutateAsync(input),
    setFavorite: (id: string, isFavorite: boolean) =>
      favoriteMutation.mutateAsync({ id, isFavorite }),
    deleteRecipe: (id: string) => deleteMutation.mutateAsync(id),
  }
}
