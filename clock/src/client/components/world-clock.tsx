import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  useWorkspace,
} from '@moldable-ai/ui'
import { type Fetcher, getJson, sendJson } from '../lib/api'
import {
  clockParts,
  relativeDayLabel,
  zoneDeltaLabel,
  zoneOffsetLabel,
} from '@/lib/format'
import { COMMON_ZONES, allZones, zoneToLabel } from '@/lib/timezones'
import type { WorldClock } from '@/lib/types'
import { useNow } from '../hooks/use-now'

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function ContextLine(timeZone: string, at: Date) {
  const day = relativeDayLabel(timeZone, at)
  const delta = zoneDeltaLabel(timeZone, at)
  if (!delta || delta === 'Same time') return `${day} · Same time`
  return `${day} · ${delta}`
}

export function WorldClockPane({ openAddSignal }: { openAddSignal: number }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const queryClient = useQueryClient()
  const now = useNow(1000)
  const nowDate = useMemo(() => new Date(now), [now])
  const [adding, setAdding] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['worldclocks', workspaceId],
    queryFn: () =>
      getJson<{ worldClocks: WorldClock[] }>(fetcher, '/api/worldclocks'),
  })

  useEffect(() => {
    if (openAddSignal > 0) setAdding(true)
  }, [openAddSignal])

  const addClock = useMutation({
    mutationFn: (timeZone: string) =>
      sendJson(fetcher, '/api/worldclocks', 'POST', {
        timeZone,
        label: zoneToLabel(timeZone),
      }),
    onSuccess: () => {
      setAdding(false)
      void queryClient.invalidateQueries({
        queryKey: ['worldclocks', workspaceId],
      })
    },
  })

  const removeClock = useMutation({
    mutationFn: (id: string) =>
      sendJson(fetcher, `/api/worldclocks/${id}`, 'DELETE'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['worldclocks', workspaceId] }),
  })

  const clocks = data?.worldClocks ?? []
  const existingZones = new Set(clocks.map((c) => c.timeZone))
  const local = clockParts(nowDate, LOCAL_ZONE)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="clock-fade-in min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6">
        <div className="mx-auto w-full max-w-[40rem]">
          {/* Local time, the anchor every other zone is read against. */}
          <div className="px-1 pb-7">
            <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.14em]">
              {zoneToLabel(LOCAL_ZONE)} · Local
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl font-semibold tabular-nums leading-none tracking-tight">
                {local.hm}
              </span>
              <span className="text-muted-foreground text-2xl font-medium">
                {local.meridiem}
              </span>
            </div>
            <div className="text-muted-foreground mt-2.5 text-sm">
              {nowDate.toLocaleDateString([], {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pb-2.5">
            <h2 className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.14em]">
              World clocks
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 cursor-pointer rounded-full px-3"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-3.5" />
              Add city
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Loading clocks
            </p>
          ) : clocks.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-center">
              <Globe className="size-6 opacity-50" />
              <p className="text-sm">No cities yet</p>
              <Button
                type="button"
                size="sm"
                className="mt-1 cursor-pointer rounded-full"
                onClick={() => setAdding(true)}
              >
                Add a city
              </Button>
            </div>
          ) : (
            <div className="border-border bg-card divide-border/70 divide-y overflow-hidden rounded-2xl border">
              {clocks.map((clock) => {
                const parts = clockParts(nowDate, clock.timeZone)
                return (
                  <div
                    key={clock.id}
                    className="group flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium leading-tight">
                        {clock.label}
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        {ContextLine(clock.timeZone, nowDate)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${clock.label}`}
                      className="text-muted-foreground hover:text-foreground size-8 cursor-pointer opacity-0 transition group-hover:opacity-100"
                      onClick={() => removeClock.mutate(clock.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight">
                        {parts.hm}
                      </span>
                      <span className="text-muted-foreground w-6 text-xs font-medium">
                        {parts.meridiem}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AddCityDialog
        open={adding}
        onOpenChange={setAdding}
        existingZones={existingZones}
        onPick={(zone) => addClock.mutate(zone)}
      />
    </div>
  )
}

function AddCityDialog({
  open,
  onOpenChange,
  existingZones,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingZones: Set<string>
  onPick: (timeZone: string) => void
}) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return COMMON_ZONES.filter((z) => !existingZones.has(z.timeZone))
    }
    return allZones()
      .filter((tz) => tz.toLowerCase().replace(/_/g, ' ').includes(term))
      .filter((tz) => !existingZones.has(tz))
      .slice(0, 60)
      .map((tz) => ({ label: zoneToLabel(tz), timeZone: tz }))
  }, [query, existingZones])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-4 pr-12 pt-6">
          <DialogTitle>Add a city</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a city or time zone"
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {results.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              No matches
            </p>
          ) : (
            <ul>
              {results.map((zone) => (
                <li key={zone.timeZone}>
                  <button
                    type="button"
                    className="hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left"
                    onClick={() => onPick(zone.timeZone)}
                  >
                    <span className="text-sm">{zone.label}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {zoneOffsetLabel(zone.timeZone)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
