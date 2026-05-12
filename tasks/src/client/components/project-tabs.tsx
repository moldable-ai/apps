import { BookOpen, Plus, Target } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@moldable-ai/ui'
import { AppButton } from './app-button'
import { KanbanBoard } from './kanban-board'
import { ReadmeTab } from './readme-tab'
import { TaskFilters, type TaskFiltersState } from './task-filters'
import { TaskList } from './task-list'
import { type ViewMode, ViewToggle } from './toolbar'
import { activeTaskCount } from '@/shared/task-utils'
import type { ProjectWithTasks, Task, TaskLabel } from '@/shared/types'

type ProjectTab = 'tasks' | 'readme'

interface ProjectTabsProps {
  project: ProjectWithTasks
  labels: TaskLabel[]
  activeTab: ProjectTab
  onActiveTabChange: (tab: ProjectTab) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  filters: TaskFiltersState
  onFiltersChange: (filters: TaskFiltersState) => void
  visibleTasks: Task[]
  hasActiveFilters: boolean
  onCreateTask: () => void
  onEditTask: (task: Task) => void
  onPatchTask: (task: Task, patch: Partial<Task>) => void
  onDeleteTask: (task: Task) => void
}

export function ProjectTabs({
  project,
  labels,
  activeTab,
  onActiveTabChange,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  visibleTasks,
  hasActiveFilters,
  onCreateTask,
  onEditTask,
  onPatchTask,
  onDeleteTask,
}: ProjectTabsProps) {
  const tabs: Array<{
    value: ProjectTab
    label: string
    icon: ComponentType<{ className?: string }>
    count?: number
  }> = [
    {
      value: 'tasks',
      label: 'Tasks',
      icon: Target,
      count: activeTaskCount(project.tasks) || undefined,
    },
    {
      value: 'readme',
      label: 'Readme',
      icon: BookOpen,
    },
  ]

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="border-border shrink-0 border-b">
        <nav
          className="scrollbar-hide -mb-px flex gap-0.5 overflow-x-auto"
          aria-label="Project tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onActiveTabChange(tab.value)}
                className={cn(
                  'group relative flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors sm:gap-2 sm:px-4',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs font-medium',
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground group-hover:bg-accent',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="bg-primary absolute bottom-0 left-0 right-0 h-0.5 rounded-full" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="min-h-0 flex-1 pt-4">
        {activeTab === 'readme' ? (
          <div className="scrollbar-hide h-full overflow-y-auto pb-[calc(1.5rem+var(--chat-safe-padding))]">
            <ReadmeTab project={project} />
          </div>
        ) : project.tasks.length === 0 ? (
          <div className="border-border bg-card rounded-lg border py-12 text-center">
            <div className="mx-auto flex max-w-xs flex-col items-center">
              <div className="bg-primary/10 mb-3 flex size-12 items-center justify-center rounded-xl">
                <Target className="text-primary size-6" />
              </div>
              <h3 className="text-base font-semibold">No tasks yet</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Create your first task to start shaping this project.
              </p>
              <AppButton
                size="sm"
                className="mt-4 gap-1.5"
                onClick={onCreateTask}
              >
                <Plus className="size-3.5" />
                Create Task
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex shrink-0 flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <TaskFilters
                  labels={labels}
                  tasks={project.tasks}
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ViewToggle value={viewMode} onChange={onViewModeChange} />
                <AppButton
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={onCreateTask}
                >
                  <Plus className="size-3.5" />
                  Create
                </AppButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  project={project}
                  tasks={visibleTasks}
                  onEditTask={onEditTask}
                  onPatchTask={onPatchTask}
                  onDeleteTask={onDeleteTask}
                />
              ) : (
                <div className="scrollbar-hide h-full overflow-y-auto pb-[calc(1.5rem+var(--chat-safe-padding))]">
                  <TaskList
                    project={project}
                    tasks={visibleTasks}
                    flat={hasActiveFilters}
                    onEditTask={onEditTask}
                    onPatchTask={onPatchTask}
                    onDeleteTask={onDeleteTask}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
