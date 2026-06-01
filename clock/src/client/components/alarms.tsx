import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlarmClock, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  useWorkspace,
} from '@moldable-ai/ui'
import { type Fetcher, getJson, sendJson } from '../lib/api'
import { clockPartsFromTime, repeatLabel } from '@/lib/format'
import type { Alarm, Weekday } from '@/lib/types'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

interface AlarmDraft {
  id: string | null
  time: string
  label: string
  repeat: Weekday[]
}

function emptyDraft(): AlarmDraft {
  return { id: null, time: '07:00', label: '', repeat: [] }
}

export function AlarmsPane({ openAddSignal }: { openAddSignal: number }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<AlarmDraft | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['alarms', workspaceId],
    queryFn: () => getJson<{ alarms: Alarm[] }>(fetcher, '/api/alarms'),
  })

  useEffect(() => {
    if (openAddSignal > 0) setDraft(emptyDraft())
  }, [openAddSignal])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['alarms', workspaceId] })

  const saveAlarm = useMutation({
    mutationFn: (value: AlarmDraft) =>
      value.id
        ? sendJson(fetcher, `/api/alarms/${value.id}`, 'PATCH', {
            time: value.time,
            label: value.label,
            repeat: value.repeat,
          })
        : sendJson(fetcher, '/api/alarms', 'POST', {
            time: value.time,
            label: value.label,
            repeat: value.repeat,
            enabled: true,
          }),
    onSuccess: () => {
      setDraft(null)
      void invalidate()
    },
  })

  const toggleAlarm = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      sendJson(fetcher, `/api/alarms/${id}`, 'PATCH', { enabled }),
    onSuccess: invalidate,
  })

  const deleteAlarm = useMutation({
    mutationFn: (id: string) =>
      sendJson(fetcher, `/api/alarms/${id}`, 'DELETE'),
    onSuccess: invalidate,
  })

  const alarms = [...(data?.alarms ?? [])].sort((a, b) =>
    a.time.localeCompare(b.time),
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="clock-fade-in min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6">
        <div className="mx-auto w-full max-w-[40rem] space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.14em]">
              Alarms
            </h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 cursor-pointer rounded-full px-3"
              onClick={() => setDraft(emptyDraft())}
            >
              <Plus className="size-3.5" />
              New alarm
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Loading alarms
            </p>
          ) : alarms.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-center">
              <AlarmClock className="size-6 opacity-50" />
              <p className="text-sm">No alarms</p>
              <Button
                type="button"
                size="sm"
                className="mt-1 cursor-pointer rounded-full"
                onClick={() => setDraft(emptyDraft())}
              >
                Add an alarm
              </Button>
            </div>
          ) : (
            <div className="border-border bg-card divide-border/70 divide-y overflow-hidden rounded-2xl border">
              {alarms.map((alarm) => {
                const parts = clockPartsFromTime(alarm.time)
                return (
                  <div
                    key={alarm.id}
                    className="group flex items-center gap-3 px-4 py-3.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() =>
                        setDraft({
                          id: alarm.id,
                          time: alarm.time,
                          label: alarm.label,
                          repeat: alarm.repeat,
                        })
                      }
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={
                            alarm.enabled
                              ? 'text-[2rem] font-semibold tabular-nums leading-none tracking-tight'
                              : 'text-muted-foreground text-[2rem] font-semibold tabular-nums leading-none tracking-tight'
                          }
                        >
                          {parts.hm}
                        </span>
                        <span
                          className={
                            alarm.enabled
                              ? 'text-muted-foreground text-sm font-medium'
                              : 'text-muted-foreground/70 text-sm font-medium'
                          }
                        >
                          {parts.meridiem}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-1 truncate text-xs">
                        {alarm.label ? `${alarm.label} · ` : ''}
                        {repeatLabel(alarm.repeat)}
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${alarm.label || 'alarm'}`}
                      className="text-muted-foreground hover:text-foreground size-8 shrink-0 cursor-pointer rounded-full opacity-0 transition group-hover:opacity-100"
                      onClick={() => deleteAlarm.mutate(alarm.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Switch
                      checked={alarm.enabled}
                      aria-label={
                        alarm.enabled ? 'Disable alarm' : 'Enable alarm'
                      }
                      onCheckedChange={(enabled) =>
                        toggleAlarm.mutate({ id: alarm.id, enabled })
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AlarmDialog
        draft={draft}
        saving={saveAlarm.isPending}
        onClose={() => setDraft(null)}
        onSave={(value) => saveAlarm.mutate(value)}
      />
    </div>
  )
}

function AlarmDialog({
  draft,
  saving,
  onClose,
  onSave,
}: {
  draft: AlarmDraft | null
  saving: boolean
  onClose: () => void
  onSave: (value: AlarmDraft) => void
}) {
  const [local, setLocal] = useState<AlarmDraft>(emptyDraft())

  useEffect(() => {
    if (draft) setLocal(draft)
  }, [draft])

  const toggleDay = (day: Weekday) =>
    setLocal((prev) => ({
      ...prev,
      repeat: prev.repeat.includes(day)
        ? prev.repeat.filter((d) => d !== day)
        : [...prev.repeat, day].sort((a, b) => a - b),
    }))

  return (
    <Dialog
      open={draft !== null}
      onOpenChange={(open) => (!open ? onClose() : undefined)}
    >
      <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pb-4 pr-12 pt-6">
          <DialogTitle>{local.id ? 'Edit alarm' : 'New alarm'}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          <div className="space-y-2">
            <Label htmlFor="alarm-time">Time</Label>
            <Input
              id="alarm-time"
              type="time"
              value={local.time}
              onChange={(e) =>
                setLocal((p) => ({ ...p, time: e.target.value }))
              }
              className="w-40 text-lg tabular-nums"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alarm-label">Label</Label>
            <Input
              id="alarm-label"
              value={local.label}
              placeholder="Wake up"
              onChange={(e) =>
                setLocal((p) => ({ ...p, label: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Repeat</Label>
            <div className="flex gap-1.5">
              {DAY_LETTERS.map((letter, index) => {
                const day = index as Weekday
                const active = local.repeat.includes(day)
                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(day)}
                    className={
                      active
                        ? 'bg-primary text-primary-foreground flex size-9 cursor-pointer items-center justify-center rounded-full text-sm font-medium'
                        : 'border-border text-muted-foreground hover:bg-accent flex size-9 cursor-pointer items-center justify-center rounded-full border text-sm'
                    }
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter className="border-border/70 shrink-0 gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            className="cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={saving || !local.time}
            onClick={() => onSave(local)}
          >
            {local.id ? 'Save' : 'Add alarm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
