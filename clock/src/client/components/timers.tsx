import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer as TimerIcon,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useWorkspace,
} from '@moldable-ai/ui'
import { type Fetcher, getJson, sendJson } from '../lib/api'
import { formatDuration } from '@/lib/format'
import type { TimerView } from '@/lib/types'
import { useNow } from '../hooks/use-now'
import { CircularProgress } from './circular-progress'

const PRESETS = [
  { label: '1 min', ms: 60_000 },
  { label: '3 min', ms: 180_000 },
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
  { label: '15 min', ms: 900_000 },
  { label: '25 min', ms: 1_500_000 },
]

type LiveTimer = TimerView & {
  liveRemainingMs: number
  liveState: TimerView['state']
}

export function TimersPane({ openAddSignal }: { openAddSignal: number }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const queryClient = useQueryClient()
  const now = useNow(250)
  const [customOpen, setCustomOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['timers', workspaceId],
    queryFn: () => getJson<{ timers: TimerView[] }>(fetcher, '/api/timers'),
    refetchInterval: 10_000,
  })

  useEffect(() => {
    if (openAddSignal > 0) setCustomOpen(true)
  }, [openAddSignal])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['timers', workspaceId] })

  const createTimer = useMutation({
    mutationFn: (value: { label: string; durationMs: number }) =>
      sendJson(fetcher, '/api/timers', 'POST', { ...value, start: true }),
    onSuccess: () => {
      setCustomOpen(false)
      void invalidate()
    },
  })

  const action = useMutation({
    mutationFn: ({
      id,
      verb,
    }: {
      id: string
      verb: 'start' | 'pause' | 'reset'
    }) => sendJson(fetcher, `/api/timers/${id}/${verb}`, 'POST'),
    onSuccess: invalidate,
  })

  const removeTimer = useMutation({
    mutationFn: (id: string) =>
      sendJson(fetcher, `/api/timers/${id}`, 'DELETE'),
    onSuccess: invalidate,
  })

  const timers = useMemo<LiveTimer[]>(() => {
    return (data?.timers ?? []).map((t) => {
      const liveRemainingMs =
        t.state === 'running' && t.endsAt
          ? Math.max(0, Date.parse(t.endsAt) - now)
          : t.currentRemainingMs
      const liveState: TimerView['state'] =
        t.state === 'running' && liveRemainingMs <= 0 ? 'finished' : t.state
      return { ...t, liveRemainingMs, liveState }
    })
  }, [data, now])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="clock-fade-in min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6">
        <div className="mx-auto w-full max-w-[40rem] space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.ms}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 cursor-pointer rounded-full px-3.5"
                disabled={createTimer.isPending}
                onClick={() =>
                  createTimer.mutate({ label: '', durationMs: preset.ms })
                }
              >
                {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 cursor-pointer rounded-full px-3.5"
              onClick={() => setCustomOpen(true)}
            >
              <Plus className="size-3.5" />
              Custom
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Loading timers
            </p>
          ) : timers.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-center">
              <TimerIcon className="size-6 opacity-50" />
              <p className="text-sm">No timers</p>
              <p className="text-xs">Pick a preset above to start one.</p>
            </div>
          ) : (
            <div className="border-border bg-card divide-border/70 divide-y overflow-hidden rounded-2xl border">
              {timers.map((timer) => {
                const finished = timer.liveState === 'finished'
                const running = timer.liveState === 'running'
                const paused = timer.liveState === 'paused'
                const ringValue = finished
                  ? 100
                  : timer.durationMs > 0
                    ? (timer.liveRemainingMs / timer.durationMs) * 100
                    : 0
                const subtitle = finished
                  ? 'Time is up'
                  : `${timer.label || formatDuration(timer.durationMs)}${paused ? ' · Paused' : ''}`
                return (
                  <div
                    key={timer.id}
                    className="group flex items-center gap-4 px-4 py-3.5"
                  >
                    <CircularProgress
                      value={ringValue}
                      size={52}
                      className={finished ? 'clock-ring' : undefined}
                    >
                      <button
                        type="button"
                        aria-label={
                          finished
                            ? 'Dismiss timer'
                            : running
                              ? 'Pause timer'
                              : 'Start timer'
                        }
                        className="text-foreground hover:text-primary flex size-full cursor-pointer items-center justify-center transition-colors"
                        onClick={() =>
                          action.mutate({
                            id: timer.id,
                            verb: finished
                              ? 'reset'
                              : running
                                ? 'pause'
                                : 'start',
                          })
                        }
                      >
                        {finished ? (
                          <RotateCcw className="size-[18px]" />
                        ) : running ? (
                          <Pause className="size-[18px]" />
                        ) : (
                          <Play className="size-[18px] translate-x-px" />
                        )}
                      </button>
                    </CircularProgress>

                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          finished
                            ? 'text-primary clock-ring text-[2rem] font-semibold tabular-nums leading-none tracking-tight'
                            : paused
                              ? 'text-muted-foreground text-[2rem] font-semibold tabular-nums leading-none tracking-tight'
                              : 'text-[2rem] font-semibold tabular-nums leading-none tracking-tight'
                        }
                      >
                        {formatDuration(timer.liveRemainingMs)}
                      </div>
                      <div className="text-muted-foreground mt-1.5 truncate text-xs">
                        {subtitle}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                      {!finished && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Reset timer"
                          className="text-muted-foreground hover:text-foreground size-8 cursor-pointer rounded-full"
                          onClick={() =>
                            action.mutate({ id: timer.id, verb: 'reset' })
                          }
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Delete timer"
                        className="text-muted-foreground hover:text-foreground size-8 cursor-pointer rounded-full"
                        onClick={() => removeTimer.mutate(timer.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CustomTimerDialog
        open={customOpen}
        saving={createTimer.isPending}
        onOpenChange={setCustomOpen}
        onCreate={(value) => createTimer.mutate(value)}
      />
    </div>
  )
}

function CustomTimerDialog({
  open,
  saving,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  saving: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (value: { label: string; durationMs: number }) => void
}) {
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('5')
  const [seconds, setSeconds] = useState('0')
  const [label, setLabel] = useState('')

  const durationMs =
    (Number(hours) || 0) * 3_600_000 +
    (Number(minutes) || 0) * 60_000 +
    (Number(seconds) || 0) * 1000

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-4 pr-12 pt-6">
          <DialogTitle>Custom timer</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          <div className="flex items-end gap-3">
            <NumberField
              label="Hours"
              value={hours}
              onChange={setHours}
              max={99}
            />
            <NumberField
              label="Minutes"
              value={minutes}
              onChange={setMinutes}
              max={59}
            />
            <NumberField
              label="Seconds"
              value={seconds}
              onChange={setSeconds}
              max={59}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timer-label">Label</Label>
            <Input
              id="timer-label"
              value={label}
              placeholder="Tea"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="border-border/70 shrink-0 gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={saving || durationMs < 1000}
            onClick={() => onCreate({ label, durationMs })}
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  max: number
}) {
  return (
    <div className="flex-1 space-y-2">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-center text-lg tabular-nums"
      />
    </div>
  )
}
