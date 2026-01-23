'use client'

import { Code, FolderOpen } from 'lucide-react'
import { Button, Spinner } from '@moldable-ai/ui'
import { RecentProjects } from './recent-projects'

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ProjectSelectorProps {
  recentProjects: RecentProject[]
  isLoading?: boolean
  onSelectProject: (path: string) => void
  onOpenFolder: () => void
}

export function ProjectSelector({
  recentProjects,
  isLoading = false,
  onSelectProject,
  onOpenFolder,
}: ProjectSelectorProps) {
  if (isLoading) {
    return (
      <div className="bg-background flex h-full items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  return (
    <div className="bg-background flex h-full flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 flex size-20 items-center justify-center rounded-2xl">
            <Code className="text-primary size-10" />
          </div>
          <h1 className="text-xl font-semibold">Moldable Code</h1>
          <p className="text-muted-foreground text-sm">
            Open a project folder to get started
          </p>
        </div>

        {/* Open folder button */}
        <Button
          size="lg"
          onClick={onOpenFolder}
          className="h-12 gap-2 px-6 text-base"
        >
          <FolderOpen className="size-5" />
          Open Project
        </Button>

        {/* Recent projects */}
        {recentProjects.length > 0 && (
          <div className="mt-4">
            <RecentProjects
              projects={recentProjects}
              onSelect={onSelectProject}
            />
          </div>
        )}

        {/* Keyboard hint */}
        <p className="text-muted-foreground mt-4 text-xs">
          Tip: Use{' '}
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono">⌘P</kbd> to
          search files after opening a project
        </p>
      </div>
    </div>
  )
}
