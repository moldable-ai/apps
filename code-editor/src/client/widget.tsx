'use client'

import { useQuery } from '@tanstack/react-query'
import { FileCode, FolderOpen, Globe } from 'lucide-react'
import { useWorkspace } from '@moldable-ai/ui'

interface ProjectConfig {
  rootPath: string | null
}

const GHOST_EXAMPLES = [
  { icon: '📂', text: 'Open my-vite-app project' },
  { icon: '📄', text: 'Edit src/client/app.tsx' },
  { icon: '🔍', text: 'Search for Button component' },
]

export default function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const { data: config, isLoading } = useQuery({
    queryKey: ['project-config', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/config')
      if (!res.ok) return null
      return res.json() as Promise<ProjectConfig>
    },
  })

  const hasProject = !!config?.rootPath
  const projectName = config?.rootPath?.split('/').pop() ?? 'No project'

  return (
    <div className="flex h-full flex-col p-3">
      {isLoading ? (
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-muted/50 h-10 animate-pulse rounded-md"
            />
          ))}
        </div>
      ) : hasProject ? (
        <div className="flex-1 space-y-2">
          <div className="border-border/50 bg-muted/30 flex items-center gap-2 rounded-md border px-2.5 py-2">
            <FolderOpen className="text-primary/70 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{projectName}</div>
              <div className="text-muted-foreground truncate text-[10px]">
                Current project
              </div>
            </div>
          </div>

          <div className="border-border/30 flex items-center gap-2 rounded-md border px-2.5 py-2">
            <FileCode className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-xs">
              Monaco Editor with syntax highlighting
            </span>
          </div>

          <div className="border-border/30 flex items-center gap-2 rounded-md border px-2.5 py-2">
            <Globe className="text-muted-foreground size-4 shrink-0" />
            <span className="text-muted-foreground text-xs">
              Live browser preview panel
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-1.5">
          {GHOST_EXAMPLES.map((item, idx) => (
            <div
              key={idx}
              className="border-border/30 bg-muted/20 flex items-center gap-2 rounded-md border px-2.5 py-2 opacity-60"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-muted-foreground truncate text-xs">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="text-muted-foreground mt-2 text-center text-[10px]">
        Press <kbd className="bg-muted rounded px-1 font-mono">⌘P</kbd> to
        search files
      </div>
    </div>
  )
}
