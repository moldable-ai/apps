'use client'

import { Folder, FolderOpen, X } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@moldable-ai/ui'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface SidebarHeaderProps {
  projectName: string
  recentProjects?: RecentProject[]
  onSelectProject?: (path: string) => void
  onOpenFolder?: () => void
  onCloseProject?: () => void
}

export function SidebarHeader({
  projectName,
  recentProjects = [],
  onSelectProject,
  onOpenFolder,
  onCloseProject,
}: SidebarHeaderProps) {
  // Filter out the current project from recent projects
  const otherProjects = recentProjects.filter((p) => p.name !== projectName)

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold">{projectName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {(onSelectProject || onOpenFolder) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                title="Open project"
              >
                <FolderOpen className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {otherProjects.length > 0 && (
                <>
                  <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                    Recent Projects
                  </div>
                  {otherProjects.slice(0, 10).map((project) => (
                    <DropdownMenuItem
                      key={project.path}
                      onClick={() => onSelectProject?.(project.path)}
                      className="focus:bg-muted flex items-center gap-2 focus:outline-none focus:ring-0"
                    >
                      <Folder className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {project.name}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {project.path}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={onOpenFolder}
                className="focus:bg-muted flex items-center gap-2 focus:outline-none focus:ring-0"
              >
                <FolderOpen className="size-4 shrink-0" />
                <span>Open folder...</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {onCloseProject && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onCloseProject}
            title="Close project"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
