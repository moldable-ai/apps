'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Clock, Play, Square } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useWorkspace,
} from '@moldable-ai/ui'
import {
  Project,
  TimeEntry,
  TimerState,
  formatDuration,
  formatDurationHuman,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const GHOST_EXAMPLES = [
  { project: 'Website Redesign', time: '2h 15m', color: '#3b82f6' },
  { project: 'Client Meeting', time: '1h 30m', color: '#22c55e' },
  { project: 'Code Review', time: '45m', color: '#8b5cf6' },
]

export default function WidgetPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [elapsed, setElapsed] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [projectOpen, setProjectOpen] = useState(false)

  // Fetch timer state
  const { data: timer, isLoading: timerLoading } = useQuery({
    queryKey: ['timer', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/timer')
      return res.json() as Promise<TimerState>
    },
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      return res.json() as Promise<Project[]>
    },
  })

  // Fetch today's entries
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['entries', workspaceId, today, today],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate: today, endDate: today })
      const res = await fetchWithWorkspace(`/api/entries?${params}`)
      return res.json() as Promise<TimeEntry[]>
    },
  })

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetchWithWorkspace('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, description: '' }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer', workspaceId] })
    },
  })

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/timer', { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timer', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['entries', workspaceId] })
      setElapsed(0)
    },
  })

  // Sync selected project with timer
  useEffect(() => {
    if (timer?.isRunning && timer.projectId) {
      setSelectedProjectId(timer.projectId)
    } else if (timer?.lastProjectId && !selectedProjectId) {
      // Restore last used project when not running
      setSelectedProjectId(timer.lastProjectId)
    }
  }, [timer, selectedProjectId])

  // Update elapsed time
  useEffect(() => {
    if (!timer?.isRunning || !timer?.startTime) {
      setElapsed(0)
      return
    }

    const updateElapsed = () => {
      const start = new Date(timer.startTime!).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [timer?.isRunning, timer?.startTime])

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects],
  )

  // Derive effective selected project - if selected is archived/gone, fall back to first active
  const effectiveSelectedProjectId = useMemo(() => {
    if (selectedProjectId) {
      const project = projectMap.get(selectedProjectId)
      if (project && !project.archived) {
        return selectedProjectId
      }
    }
    // Fall back to first active project
    return activeProjects.length > 0 ? activeProjects[0].id : null
  }, [selectedProjectId, projectMap, activeProjects])

  const selectedProject = effectiveSelectedProjectId
    ? projectMap.get(effectiveSelectedProjectId)
    : null

  const runningProject = timer?.projectId
    ? projectMap.get(timer.projectId)
    : null

  // Calculate today's total (excluding running timer)
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0)

  const handleStart = () => {
    if (!effectiveSelectedProjectId) return
    startMutation.mutate(effectiveSelectedProjectId)
  }

  const handleStop = () => {
    stopMutation.mutate()
  }

  if (timerLoading) {
    return (
      <div className="bg-background flex h-full items-center justify-center p-3">
        <Clock className="text-muted-foreground size-5 animate-pulse" />
      </div>
    )
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="bg-background flex h-full select-none flex-col p-3">
        <div className="mb-3">
          <span className="text-xs font-semibold">Today</span>
        </div>

        <div className="flex-1 space-y-2 opacity-40">
          {GHOST_EXAMPLES.map((example, idx) => (
            <div
              key={idx}
              className="border-border/40 bg-muted/10 flex items-center justify-between rounded-lg border p-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: example.color }}
                />
                <span className="text-xs">{example.project}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {example.time}
              </span>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mt-3 text-center text-[11px]">
          Open app to create projects
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-full select-none flex-col p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold">Today</span>
        <span className="text-muted-foreground text-[11px]">
          {formatDurationHuman(todayTotal + (timer?.isRunning ? elapsed : 0))}
        </span>
      </div>

      {/* Timer control */}
      <div className="border-border mb-3 rounded-lg border p-2">
        {timer?.isRunning ? (
          // Running timer
          <div className="flex items-center gap-2">
            <div
              className="size-3 shrink-0 animate-pulse rounded-full"
              style={{ backgroundColor: runningProject?.color || '#6b7280' }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">
                {runningProject?.name || 'Unknown'}
              </div>
              <div className="text-primary font-mono text-sm font-semibold tabular-nums">
                {formatDuration(elapsed)}
              </div>
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="size-8 shrink-0"
              onClick={handleStop}
              disabled={stopMutation.isPending}
            >
              <Square className="size-3" />
            </Button>
          </div>
        ) : (
          // Quick start
          <div className="flex items-center gap-2">
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'hover:bg-muted/50 flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors',
                    !selectedProject && 'text-muted-foreground',
                  )}
                >
                  {selectedProject ? (
                    <>
                      <div
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      <span className="truncate text-xs">
                        {selectedProject.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs">Select project</span>
                  )}
                  <ChevronDown className="text-muted-foreground ml-auto size-3 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="start">
                {activeProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setProjectOpen(false)
                    }}
                    className={cn(
                      'hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs',
                      effectiveSelectedProjectId === project.id && 'bg-muted',
                    )}
                  >
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              className="size-8 shrink-0"
              onClick={handleStart}
              disabled={!effectiveSelectedProjectId || startMutation.isPending}
            >
              <Play className="size-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Recent entries */}
      <div className="scrollbar-hide flex-1 space-y-1.5 overflow-y-auto">
        {todayEntries.slice(0, 4).map((entry) => {
          const project = projectMap.get(entry.projectId)
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between text-[11px]"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project?.color || '#6b7280' }}
                />
                <span className="text-muted-foreground truncate">
                  {project?.name || 'Unknown'}
                </span>
              </div>
              <span className="text-muted-foreground shrink-0">
                {formatDurationHuman(entry.duration || 0)}
              </span>
            </div>
          )
        })}
        {todayEntries.length === 0 && !timer?.isRunning && (
          <p className="text-muted-foreground py-4 text-center text-[11px]">
            No entries today
          </p>
        )}
      </div>
    </div>
  )
}
