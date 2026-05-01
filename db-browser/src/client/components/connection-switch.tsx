import { Check, ChevronDown, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, cn } from '@moldable-ai/ui'
import type { ConnectionSummary } from '../../shared/types'

function policyLabel(policyMode: ConnectionSummary['policyMode']) {
  if (policyMode === 'read-only') return 'read'
  return policyMode
}

function policyBadgeClass(policyMode: ConnectionSummary['policyMode']) {
  if (policyMode === 'read-only') {
    return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
  }

  if (policyMode === 'write') {
    return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
  }

  return 'bg-destructive/10 text-destructive dark:bg-destructive/15'
}

function environmentBadgeClass(environment: string) {
  const normalized = environment.trim().toLowerCase()

  if (['local', 'localhost'].includes(normalized)) {
    return 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400'
  }

  if (['dev', 'development'].includes(normalized)) {
    return 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
  }

  if (['staging', 'stage'].includes(normalized)) {
    return 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
  }

  if (['prod', 'production'].includes(normalized)) {
    return 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
  }

  if (['test', 'testing', 'qa'].includes(normalized)) {
    return 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400'
  }

  return 'bg-muted text-muted-foreground/80'
}

export function ConnectionSwitch({
  connections,
  value,
  disabled,
  onChange,
  onNew,
  onEdit,
}: {
  connections: ConnectionSummary[]
  value: string | null
  disabled?: boolean
  onChange: (connectionId: string) => void
  onNew: () => void
  onEdit: (connectionId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const activeConnection = connections.find(
    (connection) => connection.id === value,
  )

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'hover:bg-muted/35 border-border/60 bg-background text-foreground flex h-9 w-fit min-w-0 max-w-[min(52vw,560px)] cursor-pointer items-center justify-between gap-3 rounded-[15px] border px-3 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {activeConnection?.color ? (
              <span
                className="border-border size-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: activeConnection.color }}
              />
            ) : null}
            <span className="truncate">
              {activeConnection?.name ?? 'Open connection'}
            </span>
            {activeConnection?.environment ? (
              <span
                className={cn(
                  'shrink-0 rounded px-1 text-[9px] font-medium leading-4',
                  environmentBadgeClass(activeConnection.environment),
                )}
              >
                {activeConnection.environment}
              </span>
            ) : null}
            {activeConnection ? (
              <span
                className={cn(
                  'shrink-0 rounded px-1 text-[9px] font-medium leading-4',
                  policyBadgeClass(activeConnection.policyMode),
                )}
              >
                {policyLabel(activeConnection.policyMode)}
              </span>
            ) : null}
          </span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <div className="bg-muted/10 border-b p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onNew()
            }}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] font-bold transition-colors"
          >
            <Plus className="size-3.5" />
            New connection...
          </button>
        </div>
        {connections.map((connection) => (
          <div
            key={connection.id}
            className={cn(
              'hover:bg-accent hover:text-accent-foreground focus-within:bg-accent focus-within:text-accent-foreground group flex w-full items-center transition-colors',
              connection.id === value && 'bg-accent/60 text-accent-foreground',
            )}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onChange(connection.id)
              }}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left"
            >
              {connection.color ? (
                <span
                  className="border-border size-2.5 shrink-0 rounded-full border"
                  style={{ backgroundColor: connection.color }}
                />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block max-w-[190px] truncate text-xs font-semibold leading-none">
                  {connection.name}
                </span>
                <span className="mt-1.5 flex items-center gap-1 leading-none">
                  {connection.environment ? (
                    <span
                      className={cn(
                        'shrink-0 rounded px-1.5 text-[10px] font-medium leading-4',
                        environmentBadgeClass(connection.environment),
                      )}
                    >
                      {connection.environment}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'shrink-0 rounded px-1.5 text-[10px] font-medium leading-4',
                      policyBadgeClass(connection.policyMode),
                    )}
                  >
                    {policyLabel(connection.policyMode)}
                  </span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit(connection.id)
              }}
              className="text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-ring mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity focus:opacity-100 focus-visible:outline-none focus-visible:ring-[3px] group-hover:opacity-100"
              aria-label={`Edit ${connection.name}`}
              title={`Edit ${connection.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
            {connection.id === value ? (
              <Check className="text-muted-foreground mr-3 size-3.5 shrink-0" />
            ) : null}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
