import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { type Fetcher, getJson, sendJson } from '../lib/api'
import { playChime } from '../lib/sound'
import { nextAlarmOccurrenceAfter } from '@/lib/alarms'
import type { Alarm } from '@/lib/types'
import { useNow } from './use-now'

const ALARM_CATCH_UP_WINDOW_MS = 5 * 60_000

/**
 * Watches enabled alarms once a second and surfaces any that fire. Lives at the
 * app root so alarms ring regardless of which tab is showing. One-shot alarms
 * disable themselves after firing, matching phone behavior.
 */
export function useAlarmWatch() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const queryClient = useQueryClient()
  const now = useNow(1000)
  const firedRef = useRef<Set<string>>(new Set())
  const lastCheckedRef = useRef(Date.now() - ALARM_CATCH_UP_WINDOW_MS)
  const [ringing, setRinging] = useState<Alarm[]>([])

  const { data } = useQuery({
    queryKey: ['alarms', workspaceId],
    queryFn: () => getJson<{ alarms: Alarm[] }>(fetcher, '/api/alarms'),
    refetchInterval: 30_000,
  })

  const disableAlarm = useMutation({
    mutationFn: (id: string) =>
      sendJson(fetcher, `/api/alarms/${id}`, 'PATCH', { enabled: false }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['alarms', workspaceId] }),
  })

  const alarms = data?.alarms

  useEffect(() => {
    if (!alarms) return
    const previousCheck = new Date(lastCheckedRef.current)
    const date = new Date(now)
    lastCheckedRef.current = now

    if (alarms.length === 0) return

    const newlyRinging: Alarm[] = []
    for (const alarm of alarms) {
      if (!alarm.enabled) continue
      const fireAt = nextAlarmOccurrenceAfter(alarm, previousCheck)
      if (!fireAt || fireAt.getTime() > now) continue
      const dayKey = `${fireAt.getFullYear()}-${fireAt.getMonth()}-${fireAt.getDate()}`
      const current = `${String(fireAt.getHours()).padStart(2, '0')}:${String(
        fireAt.getMinutes(),
      ).padStart(2, '0')}`
      const key = `${alarm.id}:${dayKey}:${current}`
      if (firedRef.current.has(key)) continue
      firedRef.current.add(key)
      newlyRinging.push(alarm)
      if (alarm.repeat.length === 0) disableAlarm.mutate(alarm.id)
    }

    if (newlyRinging.length > 0) {
      playChime()
      setRinging((prev) => {
        const ids = new Set(prev.map((a) => a.id))
        return [...prev, ...newlyRinging.filter((a) => !ids.has(a.id))]
      })
    }
    // disableAlarm is a stable mutation handle; intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, alarms])

  const dismiss = (id: string) =>
    setRinging((prev) => prev.filter((a) => a.id !== id))

  return { ringing, dismiss }
}
