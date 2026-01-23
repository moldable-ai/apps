'use client'

import { Folder } from 'lucide-react'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface RecentProjectsProps {
  projects: RecentProject[]
  onSelect: (path: string) => void
}

export function RecentProjects({ projects, onSelect }: RecentProjectsProps) {
  // Format path for display (shorten home directory)
  const formatPath = (path: string) => {
    return path.replace(/^\/Users\/[^/]+/, '~')
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="w-full max-w-md">
      <h3 className="text-muted-foreground mb-3 text-sm font-medium">
        Recent Projects
      </h3>
      <div className="space-y-1">
        {projects.map((project) => (
          <button
            key={project.path}
            onClick={() => onSelect(project.path)}
            className="hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors"
          >
            <Folder className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{project.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {formatPath(project.path)}
              </div>
            </div>
            <div className="text-muted-foreground shrink-0 text-xs">
              {formatDate(project.lastOpened)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
