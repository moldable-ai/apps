'use client'

import { ChevronRight, PanelLeft, PanelRight } from 'lucide-react'
import { Button } from '@moldable-ai/ui'

interface HeaderProps {
  projectName: string
  activeFilePath: string | null
  rootPath: string
  isSidebarOpen: boolean
  isBrowserOpen: boolean
  onToggleSidebar: () => void
  onToggleBrowser: () => void
}

export function Header({
  projectName,
  activeFilePath,
  rootPath,
  isSidebarOpen,
  isBrowserOpen,
  onToggleSidebar,
  onToggleBrowser,
}: HeaderProps) {
  // Generate breadcrumbs from active file path
  const breadcrumbs = activeFilePath
    ? activeFilePath.replace(rootPath, '').replace(/^\//, '').split('/')
    : []

  return (
    <header className="bg-muted/30 flex h-10 shrink-0 items-center justify-between border-b px-2">
      <div className="flex items-center gap-2">
        {/* Sidebar toggle - Cmd/Ctrl+B */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onToggleSidebar}
          title={`${isSidebarOpen ? 'Hide' : 'Show'} sidebar (⌘B)`}
        >
          <PanelLeft className="size-4" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="text-muted-foreground flex items-center text-xs">
          <span className="text-foreground font-medium">{projectName}</span>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center">
              <ChevronRight className="mx-1 size-3 opacity-40" />
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : ''
                }
              >
                {part}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Browser toggle - Cmd/Ctrl+Option+B */}
      <Button
        variant={isBrowserOpen ? 'secondary' : 'ghost'}
        size="sm"
        className="inline-flex h-7 items-center gap-1.5 px-2 text-xs"
        onClick={onToggleBrowser}
        title={`${isBrowserOpen ? 'Hide' : 'Show'} browser (⌘⌥B)`}
      >
        <PanelRight className="size-3.5 shrink-0" />
        <span>Browser</span>
      </Button>
    </header>
  )
}
