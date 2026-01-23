'use client'

import { FolderOpen, X } from 'lucide-react'
import { Button } from '@moldable-ai/ui'

interface SidebarHeaderProps {
  projectName: string
  onChangeProject?: () => void
  onCloseProject?: () => void
}

export function SidebarHeader({
  projectName,
  onChangeProject,
  onCloseProject,
}: SidebarHeaderProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold">{projectName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onChangeProject && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onChangeProject}
            title="Open different project"
          >
            <FolderOpen className="size-3.5" />
          </Button>
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
