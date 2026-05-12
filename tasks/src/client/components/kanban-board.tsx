import { cn } from '@moldable-ai/ui'
import { STATUS_META } from './status'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  taskKey,
} from '@/shared/task-utils'
import type { Project, Task } from '@/shared/types'

export function KanbanBoard({
  project,
  tasks,
  onEditTask,
}: {
  project: Project
  tasks: Task[]
  onEditTask: (task: Task) => void
  onPatchTask: (task: Task, patch: Partial<Task>) => void
  onDeleteTask: (task: Task) => void
}) {
  const visibleStatuses = STATUS_ORDER.filter(
    (status) =>
      ['open', 'in_progress'].includes(status) ||
      tasks.some((task) => task.status === status),
  )

  return (
    <div className="scrollbar-hide flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden">
      {visibleStatuses.map((status) => {
        const Icon = STATUS_META[status].icon
        const columnTasks = tasks.filter((task) => task.status === status)
        return (
          <div
            key={status}
            className="bg-accent/30 flex h-full min-h-0 w-72 shrink-0 flex-col rounded-lg"
          >
            <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2.5">
              <span className={cn('size-4', STATUS_META[status].iconClass)}>
                <Icon className="size-4" />
              </span>
              <span className="text-sm font-medium">
                {STATUS_LABELS[status]}
              </span>
              <span className="bg-muted text-muted-foreground ml-auto rounded-full px-1.5 py-0.5 text-xs font-medium">
                {columnTasks.length}
              </span>
            </div>
            <div className="scrollbar-hide flex flex-1 flex-col gap-2 overflow-y-auto p-2 pb-[calc(0.5rem+var(--chat-safe-padding))]">
              {columnTasks.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center text-xs">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    project={project}
                    task={task}
                    onEditTask={onEditTask}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({
  project,
  task,
  onEditTask,
}: {
  project: Project
  task: Task
  onEditTask: (task: Task) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onEditTask(task)}
      className="border-border bg-card hover:border-primary/50 group block w-full cursor-pointer rounded-lg border p-3 text-left shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground text-[10px] font-medium">
          {taskKey(project, task)}
        </span>
      </div>
      <h4 className="text-foreground group-hover:text-primary mb-2 line-clamp-2 text-sm font-medium leading-snug transition-colors">
        {task.title}
      </h4>
      {task.labels.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="text-foreground inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
            >
              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(label.color)
                    ? label.color
                    : '#6b7280',
                }}
              />
              {label.name}
            </span>
          ))}
          {task.labels.length > 2 ? (
            <span className="text-muted-foreground text-[10px]">
              +{task.labels.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center">
        <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-semibold">
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
    </button>
  )
}
