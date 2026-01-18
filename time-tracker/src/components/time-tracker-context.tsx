'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { Project, TimerState } from '@/lib/types'

interface TimeTrackerContextValue {
  // Projects
  projects: Project[]
  activeProjects: Project[]
  isLoadingProjects: boolean

  // Selected project
  selectedProjectId: string | null
  selectedProject: Project | undefined
  setSelectedProjectId: (projectId: string | null) => void

  // Timer state
  timer: TimerState | undefined
  isLoadingTimer: boolean

  // Actions
  refreshProjects: () => void
  refreshTimer: () => void
}

const TimeTrackerContext = createContext<TimeTrackerContextValue | null>(null)

export function TimeTrackerProvider({ children }: { children: ReactNode }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectIdState] = useState<
    string | null
  >(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Fetch projects
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      return res.json() as Promise<Project[]>
    },
  })

  // Fetch timer state
  const { data: timer, isLoading: isLoadingTimer } = useQuery({
    queryKey: ['timer', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/timer')
      return res.json() as Promise<TimerState>
    },
  })

  const activeProjects = projects.filter((p) => !p.archived)
  const selectedProject = activeProjects.find((p) => p.id === selectedProjectId)

  // Set selected project and persist to server
  const setSelectedProjectId = useCallback(
    async (projectId: string | null) => {
      setSelectedProjectIdState(projectId)
      if (projectId) {
        // Persist to server
        await fetchWithWorkspace('/api/timer', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastProjectId: projectId }),
        })
      }
    },
    [fetchWithWorkspace],
  )

  // Initialize from server state
  useEffect(() => {
    if (hasInitialized || isLoadingTimer || isLoadingProjects) return

    if (timer) {
      if (timer.isRunning && timer.projectId) {
        // If timer is running, use its project
        setSelectedProjectIdState(timer.projectId)
      } else if (timer.lastProjectId) {
        // Otherwise use the last selected project
        setSelectedProjectIdState(timer.lastProjectId)
      } else if (activeProjects.length > 0) {
        // Auto-select first project if nothing saved
        const firstProject = activeProjects[0]
        setSelectedProjectId(firstProject.id)
      }
    }
    setHasInitialized(true)
  }, [
    timer,
    activeProjects,
    isLoadingTimer,
    isLoadingProjects,
    hasInitialized,
    setSelectedProjectId,
  ])

  // When projects change (e.g., a new one is added), check if we need to auto-select
  useEffect(() => {
    if (!hasInitialized) return

    // If no project is selected but we have active projects, select the first one
    if (!selectedProjectId && activeProjects.length > 0 && !timer?.isRunning) {
      const firstProject = activeProjects[0]
      setSelectedProjectId(firstProject.id)
    }
  }, [
    activeProjects,
    selectedProjectId,
    timer?.isRunning,
    hasInitialized,
    setSelectedProjectId,
  ])

  const refreshProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] })
  }, [queryClient, workspaceId])

  const refreshTimer = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['timer', workspaceId] })
  }, [queryClient, workspaceId])

  return (
    <TimeTrackerContext.Provider
      value={{
        projects,
        activeProjects,
        isLoadingProjects,
        selectedProjectId,
        selectedProject,
        setSelectedProjectId,
        timer,
        isLoadingTimer,
        refreshProjects,
        refreshTimer,
      }}
    >
      {children}
    </TimeTrackerContext.Provider>
  )
}

export function useTimeTracker() {
  const context = useContext(TimeTrackerContext)
  if (!context) {
    throw new Error('useTimeTracker must be used within a TimeTrackerProvider')
  }
  return context
}
