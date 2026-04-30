import { useQuery } from '@tanstack/react-query'
import { Plus, Server } from 'lucide-react'
import { useWorkspace } from '@moldable-ai/ui'
import { apiJson } from './lib/api'
import type { ConnectionSummary } from '../shared/types'

const GHOST_CONNECTIONS = [
  {
    name: 'Production warehouse',
    meta: 'analytics.company.com / events',
    color: 'var(--muted-foreground)',
  },
  {
    name: 'Local app',
    meta: '127.0.0.1:5432 / postgres',
    color: 'var(--primary)',
  },
  {
    name: 'Staging replica',
    meta: 'staging.internal / app',
    color: 'var(--muted-foreground)',
  },
]

export function Widget() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const connectionsQuery = useQuery({
    queryKey: ['db-browser-connections', workspaceId],
    queryFn: async () => {
      return apiJson<ConnectionSummary[]>(
        fetchWithWorkspace,
        '/api/connections',
      )
    },
  })

  const connections = connectionsQuery.data ?? []

  if (connectionsQuery.isLoading) {
    return <WidgetLoading />
  }

  if (connections.length === 0) {
    return <WidgetEmpty />
  }

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
        {connections.slice(0, 6).map((connection) => (
          <ConnectionRow key={connection.id} connection={connection} />
        ))}
      </div>
    </div>
  )
}

function ConnectionRow({ connection }: { connection: ConnectionSummary }) {
  return (
    <div className="bg-muted/45 flex min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: connection.color ?? 'var(--primary)' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12px] font-semibold leading-4">
            {connection.name}
          </span>
          {connection.environment ? (
            <span className="text-muted-foreground/80 bg-background/70 shrink-0 rounded px-1 text-[9px] leading-4">
              {connection.environment}
            </span>
          ) : null}
        </div>
        <div className="text-muted-foreground truncate font-mono text-[10px] leading-4">
          {connection.host}:{connection.port} / {connection.database}
        </div>
      </div>
    </div>
  )
}

function WidgetEmpty() {
  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
        {GHOST_CONNECTIONS.map((connection) => (
          <div
            key={connection.name}
            className="border-border/40 bg-muted/20 flex min-w-0 items-center gap-2 rounded-md border px-2.5 py-1.5 opacity-45 grayscale"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: connection.color }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold leading-4">
                {connection.name}
              </div>
              <div className="text-muted-foreground truncate font-mono text-[10px] leading-4">
                {connection.meta}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-border/50 bg-muted/20 mt-2 flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2">
        <span className="bg-background text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
          <Plus className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold">
            Add a connection
          </div>
          <div className="text-muted-foreground truncate text-[10px]">
            Store credentials in aivault.
          </div>
        </div>
      </div>
    </div>
  )
}

function WidgetLoading() {
  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-muted/25 flex items-center gap-2 rounded-md px-2.5 py-1.5"
          >
            <Server className="text-muted-foreground/40 size-3.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="bg-muted/60 h-3 w-2/3 animate-pulse rounded" />
              <div className="bg-muted/45 h-2.5 w-4/5 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
