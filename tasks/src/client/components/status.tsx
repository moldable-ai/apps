import { Archive, CheckCircle, Circle, Clock, Slash } from 'lucide-react'
import type { ComponentType } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@moldable-ai/ui'
import { STATUS_LABELS, STATUS_ORDER } from '@/shared/task-utils'
import type { Task, TaskLabel, TaskStatus } from '@/shared/types'

export const STATUS_META: Record<
  TaskStatus,
  {
    icon: ComponentType<{ className?: string }>
    iconClass: string
    dotClass: string
  }
> = {
  backlog: {
    icon: Archive,
    iconClass: 'text-muted-foreground',
    dotClass: 'bg-muted-foreground/50',
  },
  open: {
    icon: Circle,
    iconClass: 'text-primary',
    dotClass: 'bg-primary',
  },
  in_progress: {
    icon: Clock,
    iconClass: 'text-yellow-500',
    dotClass: 'bg-yellow-500',
  },
  completed: {
    icon: CheckCircle,
    iconClass: 'text-primary',
    dotClass: 'bg-primary',
  },
  closed: {
    icon: Slash,
    iconClass: 'text-muted-foreground/50',
    dotClass: 'bg-muted-foreground/50',
  },
}

export function LabelPill({
  label,
  compact = false,
}: {
  label: TaskLabel
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'text-foreground inline-flex items-center gap-1.5 rounded-full border font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[10px]',
      )}
      style={{
        borderColor: `${isValidHexColor(label.color) ? label.color : '#6b7280'}40`,
      }}
    >
      <span
        className="size-2 rounded-full"
        style={{
          backgroundColor: isValidHexColor(label.color)
            ? label.color
            : '#6b7280',
        }}
      />
      {label.name}
    </span>
  )
}

function isValidHexColor(color: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

export function StatusSelect({
  task,
  onPatchTask,
}: {
  task: Task
  onPatchTask: (task: Task, patch: Partial<Task>) => void
}) {
  return (
    <Select
      value={task.status}
      onValueChange={(value) =>
        onPatchTask(task, { status: value as TaskStatus })
      }
    >
      <SelectTrigger
        size="sm"
        className="hidden h-7 w-32 shrink-0 text-xs sm:flex"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((status) => (
          <SelectItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
