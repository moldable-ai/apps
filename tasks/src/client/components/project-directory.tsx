import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Folder,
  ListChecks,
  Plus,
  Tags,
} from 'lucide-react'
import { formatDate } from '../lib/forms'
import { AppButton } from './app-button'
import { activeTaskCount } from '@/shared/task-utils'
import type { ProjectWithTasks } from '@/shared/types'

export function ProjectDirectory({
  projects,
  isLoading,
  onCreateProject,
  onSelectProject,
}: {
  projects: ProjectWithTasks[]
  isLoading: boolean
  onCreateProject: () => void
  onSelectProject: (projectId: string) => void
}) {
  return (
    <main className="scrollbar-hide bg-background text-foreground h-dvh overflow-y-auto pb-[var(--chat-safe-padding)]">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-foreground text-base font-semibold">Projects</h1>
          <AppButton size="sm" className="gap-1.5" onClick={onCreateProject}>
            <Plus className="size-3.5" />
            Create Project
          </AppButton>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-accent h-[118px] rounded-2xl border"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-accent rounded-2xl border py-12 text-center">
            <div className="mx-auto flex max-w-xs flex-col items-center">
              <div className="bg-primary/10 mb-3 flex size-12 items-center justify-center rounded-xl">
                <Folder className="text-primary size-6" />
              </div>
              <h2 className="text-base font-semibold">No projects yet</h2>
              <p className="text-muted-foreground mt-1.5 text-sm">
                Create a project to start organizing tasks.
              </p>
              <AppButton
                size="sm"
                className="mt-4 gap-1.5"
                onClick={onCreateProject}
              >
                <Plus className="size-3.5" />
                Create Project
              </AppButton>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <ProjectDirectoryCard
                key={project.id}
                project={project}
                onSelectProject={onSelectProject}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function ProjectDirectoryCard({
  project,
  onSelectProject,
}: {
  project: ProjectWithTasks
  onSelectProject: (projectId: string) => void
}) {
  const openTasks = activeTaskCount(project.tasks)

  return (
    <button
      type="button"
      onClick={() => onSelectProject(project.id)}
      className="bg-accent hover:border-primary/75 group block cursor-pointer rounded-2xl border text-left shadow-md transition-all duration-300 hover:shadow-lg"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt={project.name}
              className="size-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-lg text-base font-bold">
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{project.name}</p>
              <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {project.summary || 'No description'}
            </p>
          </div>
        </div>

        <div className="text-foreground mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <span className="inline-flex h-5 items-center gap-1">
            <ListChecks className="size-3.5 shrink-0 opacity-50" />
            <span
              className={openTasks > 0 ? 'text-primary' : 'text-foreground'}
            >
              {openTasks} {openTasks === 1 ? 'open task' : 'open tasks'}
            </span>
          </span>
          <span className="inline-flex h-5 items-center gap-1 font-medium">
            <Tags className="size-3.5 shrink-0 opacity-50" />
            {project.labels.length}{' '}
            {project.labels.length === 1 ? 'label' : 'labels'}
          </span>
          <span className="inline-flex h-5 items-center gap-1">
            <Calendar className="size-3.5 shrink-0 opacity-50" />
            {formatDate(project.updatedAt)}
          </span>
          <span className="text-muted-foreground inline-flex h-5 items-center gap-1">
            <CheckCircle className="size-3.5 shrink-0 opacity-50" />
            {
              project.tasks.filter((task) => task.status === 'completed').length
            }{' '}
            done
          </span>
        </div>
      </div>
    </button>
  )
}
