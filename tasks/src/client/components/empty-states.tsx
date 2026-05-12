import { Folder, Lightbulb, Plus } from 'lucide-react'
import { Button, Card } from '@moldable-ai/ui'

export function EmptyProjects({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="py-14 text-center">
      <div className="mx-auto flex max-w-xs flex-col items-center">
        <div className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-xl">
          <Folder className="size-6" />
        </div>
        <h3 className="text-base font-semibold">No projects yet</h3>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Create a project to start organizing tasks.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4 cursor-pointer gap-1.5"
          onClick={onCreate}
        >
          <Plus className="size-3.5" />
          Create Project
        </Button>
      </div>
    </Card>
  )
}

export function EmptyTasks({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="py-14 text-center">
      <div className="mx-auto flex max-w-xs flex-col items-center">
        <div className="bg-primary/10 text-primary mb-3 flex size-12 items-center justify-center rounded-xl">
          <Lightbulb className="size-6" />
        </div>
        <h3 className="text-base font-semibold">No tasks yet</h3>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Add the first task, then move it through list or board views.
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4 cursor-pointer gap-1.5"
          onClick={onCreate}
        >
          <Plus className="size-3.5" />
          Create Task
        </Button>
      </div>
    </Card>
  )
}
