'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Play, Square } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useWorkspace,
} from '@moldable-ai/ui'
import { formatDuration } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTimeTracker } from './time-tracker-context'

export function Timer() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const {
    activeProjects,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    timer,
    refreshTimer,
  } = useTimeTracker()

  const [elapsed, setElapsed] = useState(0)
  const [description, setDescription] = useState('')
  const [projectOpen, setProjectOpen] = useState(false)

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          description,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      refreshTimer()
    },
  })

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace('/api/timer', {
        method: 'DELETE',
      })
      return res.json()
    },
    onSuccess: async () => {
      setDescription('')
      setElapsed(0)
      // Invalidate timer and entries, then wait for refetch to complete
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['timer', workspaceId] }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'entries' &&
            query.queryKey[1] === workspaceId,
        }),
      ])
    },
  })

  // Update timer mutation (description)
  const updateMutation = useMutation({
    mutationFn: async (data: { description?: string }) => {
      const res = await fetchWithWorkspace('/api/timer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
  })

  // Sync description from server when timer is running
  useEffect(() => {
    if (timer?.isRunning && timer.description) {
      setDescription(timer.description)
    }
  }, [timer?.isRunning, timer?.description])

  // Update elapsed time every second when running
  useEffect(() => {
    if (!timer?.isRunning || !timer?.startTime) {
      setElapsed(0)
      return
    }

    const updateElapsed = () => {
      const start = new Date(timer.startTime!).getTime()
      const now = Date.now()
      setElapsed(Math.floor((now - start) / 1000))
    }

    updateElapsed()
    const interval = setInterval(updateElapsed, 1000)
    return () => clearInterval(interval)
  }, [timer?.isRunning, timer?.startTime])

  // Debounced description update
  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value)
      if (timer?.isRunning) {
        updateMutation.mutate({ description: value })
      }
    },
    [timer?.isRunning, updateMutation],
  )

  const handleStart = () => {
    if (!selectedProjectId) return
    startMutation.mutate()
  }

  const handleStop = () => {
    stopMutation.mutate()
  }

  return (
    <div className="flex flex-1 items-center gap-3">
      {/* Project selector */}
      <Popover open={projectOpen} onOpenChange={setProjectOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-48 justify-between"
            disabled={timer?.isRunning}
          >
            <div className="flex items-center gap-2 truncate">
              {selectedProject ? (
                <>
                  <div
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <span className="truncate">{selectedProject.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Select project</span>
              )}
            </div>
            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {activeProjects.length === 0 ? (
            <p className="text-muted-foreground p-2 text-center text-sm">
              No projects yet
            </p>
          ) : (
            activeProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSelectedProjectId(project.id)
                  setProjectOpen(false)
                }}
                className={cn(
                  'hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm',
                  selectedProjectId === project.id && 'bg-muted',
                )}
              >
                <div
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>

      {/* Description input */}
      <Input
        placeholder="What are you working on?"
        value={description}
        onChange={(e) => handleDescriptionChange(e.target.value)}
        className="flex-1"
      />

      {/* Timer display */}
      <div className="text-foreground w-28 text-center font-mono text-xl font-semibold tabular-nums">
        {formatDuration(elapsed)}
      </div>

      {/* Start/Stop button */}
      {timer?.isRunning ? (
        <Button
          onClick={handleStop}
          variant="destructive"
          size="icon"
          className="size-10 rounded-full"
          disabled={stopMutation.isPending}
        >
          <Square className="size-4" />
        </Button>
      ) : (
        <Button
          onClick={handleStart}
          size="icon"
          className="size-10 rounded-full"
          disabled={!selectedProjectId || startMutation.isPending}
        >
          <Play className="size-4" />
        </Button>
      )}
    </div>
  )
}
