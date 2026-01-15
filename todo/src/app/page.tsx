'use client'

import { ListFilter, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, ScrollArea, useMoldableCommands } from '@moldable/ui'
import type { Priority, Todo } from '@/lib/types'
import {
  generateId,
  useSaveTodos,
  useTodos,
  useUpdateTodosCache,
} from '@/hooks/use-todos'
import { AddTodo, type AddTodoHandle } from '@/components/add-todo'
import { EmptyState } from '@/components/empty-state'
import { TodoItem, TodoItemHandle } from '@/components/todo-item'

type FilterType = 'all' | 'active' | 'completed'

export default function Home() {
  const { data: todos = [], isLoading } = useTodos()
  const { mutate: saveTodos } = useSaveTodos()
  const updateCache = useUpdateTodosCache()

  const [filter, setFilter] = useState<FilterType>('all')

  // Track refs for each todo item for focus management
  const todoRefs = useRef<Map<string, TodoItemHandle>>(new Map())
  // Ref for the add todo input
  const addTodoRef = useRef<AddTodoHandle>(null)
  // Track which todo should receive focus after render
  const pendingFocusId = useRef<string | null>(null)

  // Focus the pending todo after render
  useEffect(() => {
    if (pendingFocusId.current) {
      const ref = todoRefs.current.get(pendingFocusId.current)
      if (ref) {
        ref.focus()
      }
      pendingFocusId.current = null
    }
  })

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  // Sort: incomplete first, then by priority (high > medium > low), then by creation date
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const priorityOrder: Record<Priority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  const addTodo = useCallback(
    (title: string) => {
      const newTodo: Todo = {
        id: generateId(),
        title,
        completed: false,
        priority: 'medium',
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      updateCache((prev) => {
        const newTodos = [newTodo, ...prev]
        saveTodos(newTodos)
        return newTodos
      })
    },
    [updateCache, saveTodos],
  )

  const toggleTodo = useCallback(
    (id: string) => {
      updateCache((prev) => {
        const newTodos = prev.map((t) =>
          t.id === id
            ? { ...t, completed: !t.completed, updatedAt: new Date() }
            : t,
        )
        saveTodos(newTodos)
        return newTodos
      })
    },
    [updateCache, saveTodos],
  )

  const deleteTodo = useCallback(
    (id: string) => {
      updateCache((prev) => {
        const newTodos = prev.filter((t) => t.id !== id)
        saveTodos(newTodos)
        return newTodos
      })
    },
    [updateCache, saveTodos],
  )

  const updateTitle = useCallback(
    (id: string, title: string) => {
      updateCache((prev) => {
        const newTodos = prev.map((t) =>
          t.id === id ? { ...t, title, updatedAt: new Date() } : t,
        )
        saveTodos(newTodos)
        return newTodos
      })
    },
    [updateCache, saveTodos],
  )

  const updatePriority = useCallback(
    (id: string, priority: Priority) => {
      updateCache((prev) => {
        const newTodos = prev.map((t) =>
          t.id === id ? { ...t, priority, updatedAt: new Date() } : t,
        )
        saveTodos(newTodos)
        return newTodos
      })
    },
    [updateCache, saveTodos],
  )

  // Insert a new todo after a specific todo (visually)
  const insertTodoAfter = useCallback(
    (id: string) => {
      // Find the current todo to inherit its properties for proper sorting
      const currentTodo = sortedTodos.find((t) => t.id === id)
      if (!currentTodo) return

      // Create new todo with same priority and completion status
      // Set createdAt slightly before current to sort immediately after it
      const newTodo: Todo = {
        id: generateId(),
        title: '',
        completed: currentTodo.completed,
        priority: currentTodo.priority,
        dueDate: null,
        createdAt: new Date(currentTodo.createdAt.getTime() - 1),
        updatedAt: new Date(),
      }

      updateCache((prev) => {
        const newTodos = [...prev, newTodo]
        saveTodos(newTodos)
        return newTodos
      })

      // Schedule focus for the new todo
      pendingFocusId.current = newTodo.id
    },
    [updateCache, saveTodos, sortedTodos],
  )

  // Delete a todo and focus the previous one (visually)
  const deleteAndFocusPrevious = useCallback(
    (id: string) => {
      // Find the visually previous todo before deleting
      const index = sortedTodos.findIndex((t) => t.id === id)
      const previousTodo = index > 0 ? sortedTodos[index - 1] : null

      updateCache((prev) => {
        const newTodos = prev.filter((t) => t.id !== id)
        saveTodos(newTodos)
        return newTodos
      })

      // Focus the previous todo visually
      if (previousTodo) {
        pendingFocusId.current = previousTodo.id
      }
    },
    [updateCache, saveTodos, sortedTodos],
  )

  // Focus the next todo in the list
  const focusNext = useCallback(
    (id: string) => {
      const index = sortedTodos.findIndex((t) => t.id === id)
      if (index < sortedTodos.length - 1) {
        const nextTodo = sortedTodos[index + 1]
        if (nextTodo) {
          todoRefs.current.get(nextTodo.id)?.focus()
        }
      }
    },
    [sortedTodos],
  )

  // Focus the previous todo in the list
  const focusPrevious = useCallback(
    (id: string) => {
      const index = sortedTodos.findIndex((t) => t.id === id)
      if (index > 0) {
        const prevTodo = sortedTodos[index - 1]
        if (prevTodo) {
          todoRefs.current.get(prevTodo.id)?.focus()
        }
      }
    },
    [sortedTodos],
  )

  // Clear all completed todos
  const clearCompleted = useCallback(() => {
    updateCache((prev) => {
      const newTodos = prev.filter((t) => !t.completed)
      saveTodos(newTodos)
      return newTodos
    })
  }, [updateCache, saveTodos])

  // Handle commands from Moldable desktop (Cmd+K)
  const commandHandlers = useMemo(
    () => ({
      'add-todo': () => addTodoRef.current?.focus(),
      'filter-all': () => setFilter('all'),
      'filter-active': () => setFilter('active'),
      'filter-completed': () => setFilter('completed'),
      'clear-completed': () => clearCompleted(),
    }),
    [clearCompleted],
  )
  useMoldableCommands(commandHandlers)

  const activeTodoCount = todos.filter((t) => !t.completed).length
  const completedTodoCount = todos.filter((t) => t.completed).length

  if (isLoading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="bg-background flex h-screen">
        <EmptyState
          onCreateTodo={() => addTodo('My first todo')}
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Todos</h1>
          <p className="text-muted-foreground text-sm">
            {activeTodoCount} active, {completedTodoCount} completed
          </p>
        </div>

        {/* Filter buttons */}
        <div className="border-border flex items-center gap-1 rounded-lg border p-1">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="cursor-pointer capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden pt-6">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6">
          {/* Add todo form */}
          <div className="mb-4">
            <AddTodo ref={addTodoRef} onAdd={addTodo} />
          </div>

          {/* Todo list */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pb-[var(--chat-safe-padding)] pr-4">
              {sortedTodos.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <ListFilter className="mx-auto mb-2 size-8" />
                  <p>No {filter !== 'all' ? filter : ''} todos</p>
                </div>
              ) : (
                sortedTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    ref={(handle) => {
                      if (handle) {
                        todoRefs.current.set(todo.id, handle)
                      } else {
                        todoRefs.current.delete(todo.id)
                      }
                    }}
                    todo={todo}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onUpdateTitle={updateTitle}
                    onUpdatePriority={updatePriority}
                    onInsertAfter={insertTodoAfter}
                    onDeleteAndFocusPrevious={deleteAndFocusPrevious}
                    onFocusNext={focusNext}
                    onFocusPrevious={focusPrevious}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  )
}
