import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Circle, Clock, Folder } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { cn, useWorkspace } from '@moldable-ai/ui'
import { STATUS_LABELS, statusCount, taskKey } from '@/shared/task-utils'
import type { ProjectWithTasks, TaskStatus } from '@/shared/types'

interface ProjectsResponse {
  projects: ProjectWithTasks[]
}

const STATUS_DOT: Record<TaskStatus, string> = {
  backlog: 'bg-muted-foreground/50',
  open: 'bg-primary',
  in_progress: 'bg-amber-500',
  completed: 'bg-primary',
  closed: 'bg-muted-foreground/50',
}

const GHOST_EXAMPLES = [
  { text: 'Create the project', icon: Folder },
  { text: 'Add tasks', icon: Circle },
  { text: 'Ship completed work', icon: CheckCircle },
]

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const projectsQuery = useQuery({
    queryKey: ['tasks-projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      if (!res.ok) throw new Error('Failed to load tasks')
      return (await res.json()) as ProjectsResponse
    },
  })

  const invalidateProjects = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ['tasks-projects', workspaceId],
      }),
    [queryClient, workspaceId],
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      if (event.data?.targetAppId !== 'tasks') return
      if (event.data?.workspaceId && event.data.workspaceId !== workspaceId)
        return

      void invalidateProjects()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [invalidateProjects, workspaceId])

  const projects = projectsQuery.data?.projects ?? []
  const activeProject = projects[0] ?? null
  const openTasks =
    activeProject?.tasks.filter(
      (task) => !['completed', 'closed'].includes(task.status),
    ) ?? []

  return (
    <div className="flex h-full flex-col p-2">
      <div className="mb-2 flex items-center gap-2 px-1">
        <CheckCircle className="text-primary size-4" />
        <h2 className="text-foreground truncate text-sm font-semibold">
          Tasks
        </h2>
        {activeProject ? (
          <span className="text-muted-foreground ml-auto text-[11px]">
            {activeProject.key}
          </span>
        ) : null}
      </div>

      {projectsQuery.isLoading ? (
        <div className="text-muted-foreground py-4 text-center text-xs">
          Loading...
        </div>
      ) : !activeProject ? (
        <div className="space-y-1">
          {GHOST_EXAMPLES.map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.text}
                className="border-border/30 bg-muted/20 flex items-center gap-2 rounded-md border px-2 py-1.5 opacity-70"
              >
                <Icon className="text-muted-foreground size-3" />
                <span className="text-foreground/80 truncate text-[11px]">
                  {row.text}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-1">
            {(['open', 'in_progress', 'completed'] as const).map((status) => (
              <div
                key={status}
                className="border-border/40 bg-card rounded-md border px-2 py-1"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={cn('size-1.5 rounded-full', STATUS_DOT[status])}
                  />
                  <span className="text-muted-foreground truncate text-[9px]">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <div className="text-foreground mt-0.5 text-sm font-semibold">
                  {statusCount(activeProject.tasks, status)}
                </div>
              </div>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
            {openTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="border-border/50 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5"
              >
                {task.status === 'in_progress' ? (
                  <Clock className="size-3 shrink-0 text-amber-500" />
                ) : (
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      STATUS_DOT[task.status],
                    )}
                  />
                )}
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {taskKey(activeProject, task)}
                </span>
                <span className="text-foreground truncate text-[11px]">
                  {task.title}
                </span>
              </div>
            ))}
            {openTasks.length === 0 ? (
              <div className="text-muted-foreground py-3 text-center text-xs">
                No open tasks
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
