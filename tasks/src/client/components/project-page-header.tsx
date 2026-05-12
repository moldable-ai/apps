import { Edit3, MoreVertical, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@moldable-ai/ui'
import { AppButton } from './app-button'
import type { ProjectWithTasks } from '@/shared/types'

export function ProjectPageHeader({
  selectedProject,
  onBackToProjects,
  onEditProject,
  onDeleteProject,
}: {
  selectedProject: ProjectWithTasks
  onBackToProjects: () => void
  onEditProject: () => void
  onDeleteProject: () => void
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm sm:text-base">
            <button
              type="button"
              onClick={onBackToProjects}
              className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 font-medium transition-colors"
            >
              Projects
            </button>
            <span className="text-muted-foreground/50">/</span>
            <div className="flex items-center gap-1.5">
              {selectedProject.logoUrl ? (
                <img
                  src={selectedProject.logoUrl}
                  alt={selectedProject.name}
                  className="size-5 shrink-0 rounded-sm object-cover"
                />
              ) : (
                <div className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-sm text-xs font-bold">
                  {selectedProject.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-foreground font-semibold">
                {selectedProject.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AppButton
                variant="outline"
                size="sm"
                className="border-border bg-secondary hover:bg-accent size-8 p-0"
                aria-label="Project actions"
              >
                <MoreVertical className="size-4" />
              </AppButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onEditProject}
                className="cursor-pointer"
              >
                <Edit3 className="mr-2 size-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteProject}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="mr-2 size-4" />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
