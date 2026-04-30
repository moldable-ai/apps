import { Check, ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger, cn } from '@moldable-ai/ui'
import type { ConnectionSummary } from '../../shared/types'

export function ConnectionSwitch({
  connections,
  value,
  disabled,
  onChange,
  onNew,
}: {
  connections: ConnectionSummary[]
  value: string | null
  disabled?: boolean
  onChange: (connectionId: string) => void
  onNew: () => void
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
              <span className="text-muted-foreground/80 bg-muted shrink-0 rounded px-1 text-[9px] font-medium leading-4">
                {activeConnection.environment}
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
          <button
            key={connection.id}
            type="button"
            onClick={() => {
              setOpen(false)
              onChange(connection.id)
            }}
            className={cn(
              'hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors',
              connection.id === value && 'bg-accent/60 text-accent-foreground',
            )}
          >
            {connection.color ? (
              <span
                className="border-border size-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: connection.color }}
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <span className="block max-w-[220px] truncate text-xs font-semibold leading-none">
                {connection.name}
              </span>
              {connection.environment ? (
                <span className="text-muted-foreground mt-1 block text-[10px] leading-none">
                  {connection.environment}
                </span>
              ) : null}
            </span>
            {connection.id === value ? (
              <Check className="text-muted-foreground size-3.5 shrink-0" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
