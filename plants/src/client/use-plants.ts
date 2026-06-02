import {
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type { Plant } from '../lib/types'
import { dueState, nextDueAt } from '../lib/types'

// Re-export the shared watering helpers so client components can import them
// from one place alongside the data hooks.
export { dueState, nextDueAt }

/**
 * Resolve a stored hero-image ref ("assets/<uuid>.<ext>") into a served,
 * workspace-scoped URL. External URLs (http/https/data/blob) pass through
 * untouched. Returns undefined when there is nothing to resolve.
 */
export function resolveMediaUrl(
  workspaceId: string | undefined,
  path?: string | null,
): string | undefined {
  if (!path) return undefined
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path
  }
  if (path.startsWith('/') && !path.startsWith('/assets/')) {
    return undefined
  }
  const clean = path.replace(/^\//, '')
  const params = new URLSearchParams({ path: clean })
  if (workspaceId) params.set('workspace', workspaceId)
  return `/api/plants/media?${params.toString()}`
}

const QUERY_ROOT = 'plants' as const

/** GET /api/plants — non-deleted plants for the active workspace. */
export function usePlants(): UseQueryResult<Plant[]> {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery<Plant[]>({
    queryKey: [QUERY_ROOT, workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/plants')
      if (!res.ok) throw new Error('Failed to fetch plants')
      return (await res.json()) as Plant[]
    },
  })
}

function useInvalidatePlants() {
  const { workspaceId } = useWorkspace()
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_ROOT, workspaceId] })
}

async function readPlantOrThrow(res: Response, action: string): Promise<Plant> {
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(detail?.error ?? `Failed to ${action}`)
  }
  return (await res.json()) as Plant
}

export type PlantCreateInput = Partial<
  Omit<Plant, 'id' | 'createdAt' | 'updatedAt' | 'heroImageUrl'>
> & {
  commonName: string
  heroImagePath?: string
}

/** POST /api/plants — create a plant; care auto-generates server-side. */
export function useCreatePlant() {
  const { fetchWithWorkspace } = useWorkspace()
  const invalidate = useInvalidatePlants()
  return useMutation({
    mutationFn: async (input: PlantCreateInput) => {
      const res = await fetchWithWorkspace('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      return readPlantOrThrow(res, 'create plant')
    },
    onSuccess: invalidate,
  })
}

export function useIdentifyPlantFromImage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      heroImagePath: string
      imagePath?: string
      room?: string
      location?: string
      notes?: string
    }) => {
      const res = await fetchWithWorkspace('/api/plants/identify-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      return readPlantOrThrow(res, 'identify plant from image')
    },
    onSuccess: (plant) => {
      queryClient.setQueryData<Plant[]>(
        [QUERY_ROOT, workspaceId],
        (current) => [
          plant,
          ...(current ?? []).filter((p) => p.id !== plant.id),
        ],
      )
      void queryClient.invalidateQueries({
        queryKey: [QUERY_ROOT, workspaceId],
      })
    },
  })
}

export type PlantUpdateInput = Partial<
  Omit<Plant, 'createdAt' | 'updatedAt'>
> & {
  id: string
}

/** PATCH /api/plants/:id — patch fields; optimistic for instant edits. */
export function useUpdatePlant() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = [QUERY_ROOT, workspaceId] as const
  return useMutation({
    mutationFn: async ({ id, ...patch }: PlantUpdateInput) => {
      const res = await fetchWithWorkspace(`/api/plants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      return readPlantOrThrow(res, 'update plant')
    },
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Plant[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Plant[]>(
          queryKey,
          previous.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_ROOT, workspaceId] }),
  })
}

/**
 * POST /api/plants/:id/water — mark watered (optional `at`). Optimistic so a
 * quick tap on a gallery card flips the watering status instantly; watering is
 * the highest-frequency action, so it must feel immediate.
 */
export function useWaterPlant() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = [QUERY_ROOT, workspaceId] as const
  return useMutation({
    mutationFn: async ({ id, at }: { id: string; at?: string }) => {
      const res = await fetchWithWorkspace(`/api/plants/${id}/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(at ? { at } : {}),
      })
      return readPlantOrThrow(res, 'water plant')
    },
    onMutate: async ({ id, at }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Plant[]>(queryKey)
      const when = at ?? new Date().toISOString()
      if (previous) {
        queryClient.setQueryData<Plant[]>(
          queryKey,
          previous.map((p) =>
            p.id === id
              ? {
                  ...p,
                  lastWateredAt: when,
                  waterHistory: [...(p.waterHistory ?? []), { at: when }].slice(
                    -50,
                  ),
                }
              : p,
          ),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_ROOT, workspaceId] }),
  })
}

/** POST /api/plants/:id/generate-care — (re)generate AI care profile. */
export function useGenerateCare() {
  const { fetchWithWorkspace } = useWorkspace()
  const invalidate = useInvalidatePlants()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/plants/${id}/generate-care`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      return readPlantOrThrow(res, 'generate care')
    },
    onSuccess: invalidate,
  })
}

/** DELETE /api/plants/:id — soft delete. */
export function useDeletePlant() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = [QUERY_ROOT, workspaceId] as const
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/plants/${id}`, {
        method: 'DELETE',
      })
      return readPlantOrThrow(res, 'delete plant')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Plant[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Plant[]>(
          queryKey,
          previous.map((p) => (p.id === id ? { ...p, isDeleted: true } : p)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_ROOT, workspaceId] }),
  })
}

/** PATCH /api/plants/:id — toggle favorite (optimistic). */
export function useFavoritePlant() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const queryKey = [QUERY_ROOT, workspaceId] as const
  return useMutation({
    mutationFn: async ({
      id,
      isFavorite,
    }: {
      id: string
      isFavorite: boolean
    }) => {
      const res = await fetchWithWorkspace(`/api/plants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite }),
      })
      return readPlantOrThrow(res, 'update favorite')
    },
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Plant[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<Plant[]>(
          queryKey,
          previous.map((p) => (p.id === id ? { ...p, isFavorite } : p)),
        )
      }
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_ROOT, workspaceId] }),
  })
}
