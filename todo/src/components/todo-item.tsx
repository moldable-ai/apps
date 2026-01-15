'use client'

import {
  Calendar,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Trash2,
} from 'lucide-react'
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Button, Checkbox, cn } from '@moldable-ai/ui'
import type { Priority, Todo } from '@/lib/types'

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-destructive',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_ICONS: Record<Priority, typeof SignalLow> = {
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
}

export interface TodoItemHandle {
  focus: () => void
}

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdateTitle: (id: string, title: string) => void
  onUpdatePriority: (id: string, priority: Priority) => void
  onInsertAfter?: (id: string) => void
  onDeleteAndFocusPrevious?: (id: string) => void
  onFocusNext?: (id: string) => void
  onFocusPrevious?: (id: string) => void
}

export const TodoItem = forwardRef<TodoItemHandle, TodoItemProps>(
  function TodoItem(
    {
      todo,
      onToggle,
      onDelete,
      onUpdateTitle,
      onUpdatePriority,
      onInsertAfter,
      onDeleteAndFocusPrevious,
      onFocusNext,
      onFocusPrevious,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus()
      },
    }))
    const formatDate = (date: Date | null) => {
      if (!date) return null
      const now = new Date()
      const diff = date.getTime() - now.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (days < 0) return 'Overdue'
      if (days === 0) return 'Today'
      if (days === 1) return 'Tomorrow'
      if (days < 7) return `${days} days`
      return date.toLocaleDateString()
    }

    const cyclePriority = () => {
      const priorities: Priority[] = ['low', 'medium', 'high']
      const currentIndex = priorities.indexOf(todo.priority)
      const nextPriority = priorities[(currentIndex + 1) % priorities.length]!
      onUpdatePriority(todo.id, nextPriority)
    }

    return (
      <div
        className={cn(
          'border-border bg-card hover:bg-muted/50 group flex items-center gap-3 rounded-lg border p-3 transition-colors',
          todo.completed && 'opacity-60',
        )}
      >
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          className="cursor-pointer"
        />

        <input
          ref={inputRef}
          type="text"
          value={todo.title}
          onChange={(e) => onUpdateTitle(todo.id, e.target.value)}
          onKeyDown={(e) => {
            // Enter: create new todo below
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onInsertAfter?.(todo.id)
            }
            // Escape: blur the input
            else if (e.key === 'Escape') {
              e.preventDefault()
              inputRef.current?.blur()
            }
            // Backspace on empty: delete and focus previous
            else if (e.key === 'Backspace' && todo.title === '') {
              e.preventDefault()
              onDeleteAndFocusPrevious?.(todo.id)
            }
            // Arrow Down: focus next todo
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              onFocusNext?.(todo.id)
            }
            // Arrow Up: focus previous todo
            else if (e.key === 'ArrowUp') {
              e.preventDefault()
              onFocusPrevious?.(todo.id)
            }
          }}
          onBlur={() => {
            // Clean up empty todos on blur (with small delay to allow delete action)
            if (todo.title.trim() === '') {
              setTimeout(() => {
                onDelete(todo.id)
              }, 100)
            }
          }}
          className={cn(
            'placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none',
            todo.completed && 'text-muted-foreground line-through',
          )}
          placeholder="Todo title..."
        />

        <div className="flex items-center gap-2">
          {todo.dueDate && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                formatDate(todo.dueDate) === 'Overdue'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              <Calendar className="size-3" />
              {formatDate(todo.dueDate)}
            </span>
          )}

          <button
            onClick={cyclePriority}
            className={cn(
              'hover:bg-muted cursor-pointer rounded p-1 transition-colors',
              PRIORITY_COLORS[todo.priority],
            )}
            title={`Priority: ${PRIORITY_LABELS[todo.priority]}`}
          >
            {(() => {
              const Icon = PRIORITY_ICONS[todo.priority]
              return <Icon className="size-4" />
            })()}
          </button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onDelete(todo.id)}
          >
            <Trash2 className="text-muted-foreground size-4" />
          </Button>
        </div>
      </div>
    )
  },
)
