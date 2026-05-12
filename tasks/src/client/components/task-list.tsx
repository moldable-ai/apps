import { Card, cn } from '@moldable-ai/ui'
import { formatDate } from '../lib/forms'
import { LabelPill, STATUS_META } from './status'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  taskKey,
} from '@/shared/task-utils'
import type { Project, Task } from '@/shared/types'

export function TaskList({
  project,
  tasks,
  onEditTask,
  onPatchTask,
  flat = false,
}: {
  project: Project
  tasks: Task[]
  onEditTask: (task: Task) => void
  onPatchTask: (task: Task, patch: Partial<Task>) => void
  onDeleteTask: (task: Task) => void
  flat?: boolean
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">
        No tasks match the current filters.
      </div>
    )
  }

  if (flat) {
    return (
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            project={project}
            task={task}
            onEditTask={onEditTask}
            onPatchTask={onPatchTask}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {STATUS_ORDER.map((status) => {
        const sectionTasks = tasks.filter((task) => task.status === status)
        if (sectionTasks.length === 0) return null
        const Icon = STATUS_META[status].icon
        return (
          <section key={status}>
            <div className="border-border/10 bg-background sticky top-0 z-10 mb-1 flex items-center gap-2 border-b py-1 pl-3 pr-1">
              <Icon className={cn('size-4', STATUS_META[status].iconClass)} />
              <span className="text-muted-foreground text-sm font-medium">
                {STATUS_LABELS[status]}
              </span>
              <span className="text-muted-foreground/50 text-sm">
                {sectionTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {sectionTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  project={project}
                  task={task}
                  onEditTask={onEditTask}
                  onPatchTask={onPatchTask}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TaskRow({
  project,
  task,
  onEditTask,
  onPatchTask,
}: {
  project: Project
  task: Task
  onEditTask: (task: Task) => void
  onPatchTask: (task: Task, patch: Partial<Task>) => void
}) {
  const Icon = STATUS_META[task.status].icon
  return (
    <Card className="border-border bg-card hover:border-primary/75 group flex min-h-[44px] flex-row items-center gap-3 rounded-lg px-3 py-4 shadow-md transition-all duration-300 hover:shadow-lg">
      <button
        type="button"
        className="cursor-pointer"
        onClick={() =>
          onPatchTask(task, {
            status: task.status === 'completed' ? 'open' : 'completed',
          })
        }
        aria-label="Toggle complete"
      >
        <Icon className={cn('size-3.5', STATUS_META[task.status].iconClass)} />
      </button>
      <span className="text-muted-foreground shrink-0 text-xs">
        {taskKey(project, task)}
      </span>
      <button
        type="button"
        onClick={() => onEditTask(task)}
        className="group-hover:text-primary min-w-0 flex-1 cursor-pointer truncate text-left text-sm transition-colors"
      >
        {task.title}
      </button>
      <span className="hidden shrink-0 items-center gap-1.5 lg:flex">
        {task.labels.slice(0, 3).map((label) => (
          <LabelPill key={label.id} label={label} />
        ))}
      </span>
      <span className="bg-muted text-muted-foreground hidden shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold sm:block">
        {PRIORITY_LABELS[task.priority]}
      </span>
      <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">
        {formatDate(task.updatedAt)}
      </span>
    </Card>
  )
}
