import { Circle, Filter, Flag, Tag, X } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  cn,
} from '@moldable-ai/ui'
import { STATUS_META } from './status'
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  statusCount,
} from '@/shared/task-utils'
import type { Task, TaskLabel, TaskStatus } from '@/shared/types'

export interface TaskFiltersState {
  statuses: TaskStatus[]
  labelIds: string[]
  priorities: Task['priority'][]
}

export function emptyTaskFilters(): TaskFiltersState {
  return {
    statuses: [],
    labelIds: [],
    priorities: [],
  }
}

export function hasActiveTaskFilters(filters: TaskFiltersState) {
  return (
    filters.statuses.length > 0 ||
    filters.labelIds.length > 0 ||
    filters.priorities.length > 0
  )
}

export function applyTaskFilters({
  tasks,
  labels,
  filters,
  search,
}: {
  tasks: Task[]
  labels: TaskLabel[]
  filters: TaskFiltersState
  search: string
}) {
  const labelIds = new Set(labels.map((label) => label.id))
  const query = search.trim().toLowerCase()

  return tasks.filter((task) => {
    const matchesStatus =
      filters.statuses.length === 0 || filters.statuses.includes(task.status)
    const matchesPriority =
      filters.priorities.length === 0 ||
      filters.priorities.includes(task.priority)
    const matchesLabels =
      filters.labelIds.length === 0 ||
      task.labels.some(
        (label) =>
          filters.labelIds.includes(label.id) ||
          (labelIds.has(label.id) && filters.labelIds.includes(label.id)),
      )
    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.labels.some((label) => label.name.toLowerCase().includes(query))

    return matchesStatus && matchesPriority && matchesLabels && matchesSearch
  })
}

export function TaskFilters({
  labels,
  tasks,
  filters,
  onFiltersChange,
}: {
  labels: TaskLabel[]
  tasks: Task[]
  filters: TaskFiltersState
  onFiltersChange: (filters: TaskFiltersState) => void
}) {
  const hasActiveFilters = hasActiveTaskFilters(filters)
  const activeFilterCount =
    filters.statuses.length +
    filters.labelIds.length +
    filters.priorities.length

  const toggleStatus = (status: TaskStatus) => {
    onFiltersChange({
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((item) => item !== status)
        : [...filters.statuses, status],
    })
  }

  const toggleLabel = (labelId: string) => {
    onFiltersChange({
      ...filters,
      labelIds: filters.labelIds.includes(labelId)
        ? filters.labelIds.filter((item) => item !== labelId)
        : [...filters.labelIds, labelId],
    })
  }

  const togglePriority = (priority: Task['priority']) => {
    onFiltersChange({
      ...filters,
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((item) => item !== priority)
        : [...filters.priorities, priority],
    })
  }

  const activeLabels = labels.filter((label) =>
    filters.labelIds.includes(label.id),
  )
  const clearAll = () => onFiltersChange(emptyTaskFilters())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
              hasActiveFilters
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Filter className="size-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Circle className="size-3.5" />
              <span className="flex-1">Status</span>
              {filters.statuses.length > 0 && (
                <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  {filters.statuses.length}
                </span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {STATUS_ORDER.map((status) => {
                const count = statusCount(tasks, status)
                const checked = filters.statuses.includes(status)
                return (
                  <DropdownMenuItem
                    key={status}
                    onClick={(event) => {
                      event.preventDefault()
                      toggleStatus(status)
                    }}
                    disabled={count === 0}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none size-3.5"
                    />
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        STATUS_META[status].dotClass,
                      )}
                    />
                    <span className="flex-1">{STATUS_LABELS[status]}</span>
                    <span className="text-muted-foreground text-xs">
                      {count}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Flag className="size-3.5" />
              <span className="flex-1">Priority</span>
              {filters.priorities.length > 0 && (
                <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                  {filters.priorities.length}
                </span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {PRIORITY_ORDER.map((priority) => {
                const count = tasks.filter(
                  (task) => task.priority === priority,
                ).length
                const checked = filters.priorities.includes(priority)
                return (
                  <DropdownMenuItem
                    key={priority}
                    onClick={(event) => {
                      event.preventDefault()
                      togglePriority(priority)
                    }}
                    disabled={count === 0}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none size-3.5"
                    />
                    <span className="flex-1">{PRIORITY_LABELS[priority]}</span>
                    <span className="text-muted-foreground text-xs">
                      {count}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {labels.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Tag className="size-3.5" />
                <span className="flex-1">Labels</span>
                {filters.labelIds.length > 0 && (
                  <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                    {filters.labelIds.length}
                  </span>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-64 w-48 overflow-y-auto">
                {labels.map((label) => {
                  const checked = filters.labelIds.includes(label.id)
                  return (
                    <DropdownMenuItem
                      key={label.id}
                      onClick={(event) => {
                        event.preventDefault()
                        toggleLabel(label.id)
                      }}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        className="pointer-events-none size-3.5"
                      />
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 truncate">{label.name}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearAll} className="cursor-pointer">
                <X className="size-3.5" />
                Clear all filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {filters.statuses.map((status) => (
        <FilterChip
          key={status}
          onRemove={() =>
            onFiltersChange({
              ...filters,
              statuses: filters.statuses.filter((item) => item !== status),
            })
          }
          dotClass={STATUS_META[status].dotClass}
        >
          {STATUS_LABELS[status]}
        </FilterChip>
      ))}

      {filters.priorities.map((priority) => (
        <FilterChip
          key={priority}
          onRemove={() =>
            onFiltersChange({
              ...filters,
              priorities: filters.priorities.filter(
                (item) => item !== priority,
              ),
            })
          }
        >
          {PRIORITY_LABELS[priority]}
        </FilterChip>
      ))}

      {activeLabels.map((label) => (
        <FilterChip
          key={label.id}
          onRemove={() =>
            onFiltersChange({
              ...filters,
              labelIds: filters.labelIds.filter((item) => item !== label.id),
            })
          }
          dotColor={label.color}
        >
          {label.name}
        </FilterChip>
      ))}

      {hasActiveFilters ? (
        <button
          type="button"
          onClick={clearAll}
          className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}

function FilterChip({
  children,
  onRemove,
  dotClass,
  dotColor,
}: {
  children: ReactNode
  onRemove: () => void
  dotClass?: string
  dotColor?: string
}) {
  return (
    <span className="border-border bg-accent/50 inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-1 text-xs font-medium">
      {dotClass || dotColor ? (
        <span
          className={cn('size-2 rounded-full', dotClass)}
          style={dotColor ? { backgroundColor: dotColor } : undefined}
        />
      ) : null}
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer rounded-full p-0.5 transition-colors"
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
