'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import { CreateProjectInput, Project, UpdateProjectInput } from './types'

export function useProjects() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json() as Promise<Project[]>
    },
    enabled: !!workspaceId,
  })
}

export function useProject(projectId: string | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['project', workspaceId, projectId],
    queryFn: async () => {
      if (!projectId) return null
      const res = await fetchWithWorkspace(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      return res.json() as Promise<Project>
    },
    enabled: !!workspaceId && !!projectId,
    // Poll every 1.5s to pick up external file changes (e.g., AI edits)
    refetchInterval: 1500,
  })
}

export function useCreateProject() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const res = await fetchWithWorkspace('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to create project')
      return res.json() as Promise<Project>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
    },
  })
}

export function useUpdateProject() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      input,
    }: {
      projectId: string
      input: UpdateProjectInput
    }) => {
      const res = await fetchWithWorkspace(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to update project')
      return res.json() as Promise<Project>
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
      queryClient.invalidateQueries({
        queryKey: ['project', workspaceId, projectId],
      })
    },
  })
}

export function useDeleteProject() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetchWithWorkspace(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete project')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
    },
  })
}

type RenderResult = {
  success: boolean
  outputPath: string
  fileName: string
}

type RenderParams = {
  projectId: string
  signal?: AbortSignal
}

export function useRenderProject() {
  const { fetchWithWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async ({ projectId, signal }: RenderParams) => {
      const res = await fetchWithWorkspace(
        `/api/projects/${projectId}/render`,
        {
          method: 'POST',
          signal,
        },
      )
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.details || error.error || 'Render failed')
      }
      return res.json() as Promise<RenderResult>
    },
  })
}
