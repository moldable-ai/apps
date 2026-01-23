'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { sendToMoldable, useWorkspace } from '@moldable-ai/ui'
import { MAX_RECENT_PROJECTS } from '@/lib/constants'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ProjectTabs {
  openFiles: string[]
  activeFile: string | null
}

interface ProjectConfig {
  rootPath: string | null
  recentProjects: RecentProject[]
  previewUrl: string
  projectTabs: Record<string, ProjectTabs>
}

export function useProject() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  // Fetch config from API
  const { data: config, isLoading } = useQuery({
    queryKey: ['project-config', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/config')
      if (!res.ok) throw new Error('Failed to fetch config')
      return res.json() as Promise<ProjectConfig>
    },
  })

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<ProjectConfig>) => {
      const res = await fetchWithWorkspace('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })
      if (!res.ok) throw new Error('Failed to save config')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project-config', workspaceId],
      })
    },
  })

  const rootPath = config?.rootPath ?? null
  const recentProjects = useMemo(
    () => config?.recentProjects ?? [],
    [config?.recentProjects],
  )
  const previewUrl = config?.previewUrl ?? 'http://localhost:3000'
  const projectTabs = useMemo(
    () => config?.projectTabs ?? {},
    [config?.projectTabs],
  )

  // Select a folder using the native dialog
  const selectFolder = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const requestId = crypto.randomUUID()

      const handler = (event: MessageEvent) => {
        if (
          event.data?.type === 'moldable:folder-selected' &&
          event.data?.requestId === requestId
        ) {
          window.removeEventListener('message', handler)
          resolve(event.data.path ?? null)
        }
      }

      window.addEventListener('message', handler)
      sendToMoldable({
        type: 'moldable:select-folder',
        requestId,
        title: 'Select Project Folder',
      })

      // Timeout after 60 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve(null)
      }, 60000)
    })
  }, [])

  // Save tabs for the current project before switching away
  const saveCurrentProjectTabs = useCallback(
    async (openFilePaths: string[], activeFilePath: string | null) => {
      if (!rootPath) return

      // Deduplicate file paths before saving
      const uniqueOpenFiles = [...new Set(openFilePaths)]

      await saveConfigMutation.mutateAsync({
        projectTabs: {
          ...projectTabs,
          [rootPath]: {
            openFiles: uniqueOpenFiles,
            activeFile: activeFilePath,
          },
        },
      })
    },
    [rootPath, projectTabs, saveConfigMutation],
  )

  // Open a project (either from recent or new selection)
  // Returns the saved tabs for the project (if any)
  const openProject = useCallback(
    async (path: string): Promise<ProjectTabs | null> => {
      const name = path.split('/').pop() ?? 'Project'

      // Update recent projects
      const filtered = recentProjects.filter((p) => p.path !== path)
      const updated: RecentProject[] = [
        { path, name, lastOpened: new Date().toISOString() },
        ...filtered,
      ].slice(0, MAX_RECENT_PROJECTS)

      await saveConfigMutation.mutateAsync({
        rootPath: path,
        recentProjects: updated,
      })

      // Return saved tabs for this project
      return projectTabs[path] ?? null
    },
    [recentProjects, projectTabs, saveConfigMutation],
  )

  // Open folder picker and then open the selected project
  const openFolderPicker = useCallback(async () => {
    const path = await selectFolder()
    if (path) {
      await openProject(path)
    }
  }, [selectFolder, openProject])

  // Close the current project
  const closeProject = useCallback(async () => {
    await saveConfigMutation.mutateAsync({ rootPath: null })
  }, [saveConfigMutation])

  // Update preview URL
  const setPreviewUrl = useCallback(
    async (url: string) => {
      await saveConfigMutation.mutateAsync({ previewUrl: url })
    },
    [saveConfigMutation],
  )

  // Get saved tabs for a specific project
  const getSavedTabs = useCallback(
    (projectPath: string): ProjectTabs | null => {
      return projectTabs[projectPath] ?? null
    },
    [projectTabs],
  )

  return {
    rootPath,
    recentProjects,
    previewUrl,
    isLoading,
    openProject,
    openFolderPicker,
    closeProject,
    setPreviewUrl,
    saveCurrentProjectTabs,
    getSavedTabs,
  }
}
