import { Info } from 'lucide-react'
import { Markdown } from '@moldable-ai/ui'
import type { ProjectWithTasks } from '@/shared/types'

export function ReadmeTab({ project }: { project: ProjectWithTasks }) {
  return (
    <div className="space-y-6">
      {project.description ? (
        <Markdown
          className="px-4"
          markdown={project.description}
          proseSize="sm"
        />
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 py-4">
          <Info className="size-4" />
          <p className="text-sm italic">No description provided yet.</p>
        </div>
      )}
    </div>
  )
}
