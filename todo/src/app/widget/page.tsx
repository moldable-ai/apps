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
    <div className="bg-background flex h-full flex-col p-2">
      {/* Todo list */}
      <div className="scrollbar-hide flex-1 space-y-1 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-1">
              {GHOST_EXAMPLES.map((example, idx) => (
                <div
                  key={idx}
                  className="border-border/40 bg-muted/20 flex items-center gap-2 rounded-md border px-2.5 py-1.5 opacity-50"
                >
                  {example.completed ? (
                    <CheckCircle2 className="text-primary size-3.5" />
                  ) : (
                    <Circle className="text-muted-foreground size-3.5" />
                  )}
                  <span
                    className={`text-[13px] ${example.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {example.title}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground pt-1.5 text-center text-[11px]">
              No todos yet. Click to start!
            </p>
          </div>
        ) : (
          <>
            {activeTodos.map((todo) => (
              <div
                key={todo.id}
                className="bg-muted/50 flex items-center gap-2 rounded-md px-2.5 py-1.5"
              >
                <Circle className="text-muted-foreground size-3.5 shrink-0" />
                <span className="text-foreground line-clamp-1 text-[13px]">
                  {todo.title}
                </span>
              </div>
            ))}
            {activeTodos.length === 0 && totalCount > 0 && (
              <div className="flex items-center justify-center gap-2 py-4">
                <CheckCircle2 className="text-primary size-5" />
                <span className="text-muted-foreground text-sm">All done!</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      {totalCount > 0 && (
        <div className="border-border/50 text-muted-foreground border-t pt-1.5 text-center text-[11px]">
          {completedCount}/{totalCount} completed
        </div>
      )}
    </div>
  )
}
