'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { useTodos } from '@/hooks/use-todos'

const GHOST_EXAMPLES = [
  { title: 'Buy groceries', completed: false },
  { title: 'Review PRs', completed: true },
  { title: 'Call mom', completed: false },
]

export default function Widget() {
  const { data: todos = [] } = useTodos()

  // Show only active (incomplete) todos, sorted by priority
  const activeTodos = todos
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 5)

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <div className="flex h-full flex-col bg-background p-2">
      {/* Todo list */}
      <div className="scrollbar-hide flex-1 space-y-1 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-1">
              {GHOST_EXAMPLES.map((example, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-2.5 py-1.5 opacity-50"
                >
                  {example.completed ? (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  ) : (
                    <Circle className="size-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={`text-[13px] ${example.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {example.title}
                  </span>
                </div>
              ))}
            </div>
            <p className="pt-1.5 text-center text-[11px] text-muted-foreground">
              No todos yet. Click to start!
            </p>
          </div>
        ) : (
          <>
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
              >
                <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1 text-[13px] text-foreground">
                  {todo.title}
                </span>
              </div>
            ))}
            {activeTodos.length === 0 && totalCount > 0 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <CheckCircle2 className="size-5 text-primary" />
                <span className="text-sm text-muted-foreground">All done!</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      {totalCount > 0 && (
        <div className="border-t border-border/50 pt-1.5 text-center text-[11px] text-muted-foreground">
          {completedCount}/{totalCount} completed
        </div>
      )}
    </div>
  )
}
