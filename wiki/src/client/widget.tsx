import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FileText, FolderTree, RefreshCw } from 'lucide-react'
import { useWorkspace } from '@moldable-ai/ui'
import type { WikiSummaryResponse } from '../shared/types'

const GHOST_EXAMPLES = [
  { title: 'Map of Content', meta: 'indexes / 8 links' },
  { title: 'Raw Sources', meta: 'raw / clipped articles' },
  { title: 'Research Outputs', meta: 'outputs / filed answers' },
]

function apiJson<T>(fetchWithWorkspace: typeof fetch, url: string) {
  return fetchWithWorkspace(url).then(async (response) => {
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return (await response.json()) as T
  })
}

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const summaryQuery = useQuery({
    queryKey: ['wiki-summary', workspaceId],
    queryFn: () =>
      apiJson<WikiSummaryResponse>(fetchWithWorkspace, '/api/wiki/summary'),
  })

  if (summaryQuery.isLoading) {
    return <WidgetShell state="loading" />
  }

  if (!summaryQuery.data) {
    return <WidgetShell state="empty" />
  }

  const { recent, totals, health } = summaryQuery.data
  const warningCount = health.issues.filter(
    (issue) => issue.severity === 'warning',
  ).length

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <Metric label="Notes" value={String(totals.notes)} />
        <Metric label="Words" value={String(totals.words)} />
        <Metric
          label="Issues"
          value={String(warningCount)}
          tone={warningCount ? 'warn' : 'ok'}
        />
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden">
        {recent.slice(0, 4).map((note) => (
          <div
            key={note.path}
            className="bg-muted/35 flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5"
          >
            <FileText className="text-muted-foreground size-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold leading-4">
                {note.title}
              </div>
              <div className="text-muted-foreground truncate font-mono text-[10px] leading-4">
                {note.path}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WidgetShell({ state }: { state: 'loading' | 'empty' }) {
  const items =
    state === 'loading'
      ? Array.from({ length: 3 }, () => ({
          title: 'Loading note',
          meta: 'wiki vault',
        }))
      : GHOST_EXAMPLES

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <Metric label="Notes" value="0" />
        <Metric label="Words" value="0" />
        <Metric label="Issues" value="0" />
      </div>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-hidden">
        {items.map((item, index) => (
          <div
            key={index}
            className="border-border/40 bg-muted/20 flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 opacity-60"
          >
            {state === 'loading' ? (
              <RefreshCw className="text-muted-foreground/60 size-3.5 shrink-0 animate-spin" />
            ) : (
              <FolderTree className="text-muted-foreground/60 size-3.5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold leading-4">
                {item.title}
              </div>
              <div className="text-muted-foreground truncate font-mono text-[10px] leading-4">
                {item.meta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'ok' | 'warn'
}) {
  return (
    <div className="bg-muted/35 min-w-0 rounded-md px-2 py-1.5">
      <div className="text-muted-foreground flex items-center gap-1 text-[9px] uppercase leading-3">
        {tone === 'warn' ? <AlertTriangle className="size-2.5" /> : null}
        {label}
      </div>
      <div className="truncate text-[13px] font-semibold leading-4">
        {value}
      </div>
    </div>
  )
}
