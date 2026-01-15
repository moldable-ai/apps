'use client'

import { CheckCircle2, GitBranch } from 'lucide-react'
import { useEffect, useState } from 'react'
import { WidgetLayout, useWorkspace } from '@moldable/ui'
import { cn } from '@/lib/utils'

interface GitFile {
  path: string
  index?: string
}

interface GitData {
  currentBranch: string
  repoName: string
  files: GitFile[]
}

const GHOST_EXAMPLES = [
  { path: 'src/components/ui/button.tsx', type: 'M' },
  { path: 'package.json', type: 'M' },
  { path: 'src/lib/utils.ts', type: '?' },
]

export default function GitWidgetPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [data, setData] = useState<GitData | null>(null)

  useEffect(() => {
    fetchWithWorkspace('/api/git')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
  }, [workspaceId, fetchWithWorkspace])

  if (!data || data.files.length === 0) {
    return (
      <WidgetLayout>
        <div className="bg-background flex h-full flex-col overflow-hidden rounded-xl p-2">
          <div className="flex-1 space-y-1">
            {GHOST_EXAMPLES.map((file, idx) => (
              <div
                key={idx}
                className="border-border/40 bg-muted/20 group flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5 opacity-40 grayscale"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground truncate font-mono text-[11px]">
                    {file.path}
                  </span>
                  <span className="text-muted-foreground/50 text-[10px]">
                    {file.type}
                  </span>
                </div>
                <div className="bg-border/30 h-1 w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1.5 opacity-60">
            <CheckCircle2 className="text-muted-foreground size-3" />
            <p className="text-muted-foreground text-center text-[11px] font-medium">
              Clear for takeoff · Workspace clean
            </p>
          </div>
        </div>
      </WidgetLayout>
    )
  }

  return (
    <WidgetLayout>
      <div className="bg-background flex h-full flex-col overflow-hidden rounded-xl p-2">
        <div className="scrollbar-hide flex-1 space-y-1 overflow-y-auto">
          {data.files.slice(0, 5).map((file) => (
            <div
              key={file.path}
              className="bg-muted/50 hover:bg-muted group flex flex-col gap-0.5 rounded-md px-2.5 py-1.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground truncate font-mono text-[11px]">
                  {file.path.split('/').pop()}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-bold uppercase',
                    file.index === '?'
                      ? 'text-amber-500/70'
                      : 'text-blue-500/70',
                  )}
                >
                  {file.index === '?' ? 'U' : 'M'}
                </span>
              </div>
              <div className="text-muted-foreground line-clamp-1 text-[10px] opacity-60">
                {file.path}
              </div>
            </div>
          ))}
          {data.files.length > 5 && (
            <p className="text-muted-foreground/60 pt-1 text-center text-[10px] font-medium uppercase tracking-tighter">
              + {data.files.length - 5} more changes
            </p>
          )}
        </div>

        <div className="flex items-center justify-between px-1 pt-2">
          <div className="flex min-w-0 shrink-0 items-center gap-1.5">
            <GitBranch className="text-primary/60 size-3 shrink-0" />
            <span className="text-muted-foreground/80 truncate text-[10px] font-bold">
              {data.currentBranch}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-muted-foreground/40 text-[9px] font-bold uppercase tracking-widest">
              {data.repoName}
            </span>
          </div>
        </div>
      </div>
    </WidgetLayout>
  )
}
