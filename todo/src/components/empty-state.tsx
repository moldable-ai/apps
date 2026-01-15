import { CheckCircle2 } from 'lucide-react'
import { Button, cn } from '@moldable-ai/ui'

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
      <div className="bg-primary/10 flex size-16 items-center justify-center rounded-full">
        <CheckCircle2 className="text-primary size-8" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">No todos yet</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Create your first todo to get started
        </p>
      </div>
      <Button onClick={onCreateTodo} className="cursor-pointer">
        Create Todo
      </Button>
    </div>
  )
}
