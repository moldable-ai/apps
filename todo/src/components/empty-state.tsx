import { CheckCircle2 } from 'lucide-react'
import { Button, cn } from '@moldable/ui'

interface EmptyStateProps {
  onCreateTodo: () => void
  className?: string
}

export function EmptyState({ onCreateTodo, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-8',
        className,
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-8 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">No todos yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first todo to get started
        </p>
      </div>
      <Button onClick={onCreateTodo} className="cursor-pointer">
        Create Todo
      </Button>
    </div>
  )
}
