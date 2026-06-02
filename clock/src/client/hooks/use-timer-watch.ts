import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { type Fetcher, getJson } from '../lib/api'
import { playChime } from '../lib/sound'
import type { TimerView } from '@/lib/types'
import { useNow } from './use-now'

export function useTimerWatch() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const now = useNow(250)
  const chimedRef = useRef<Set<string>>(new Set())

  const { data } = useQuery({
    queryKey: ['timers', workspaceId],
    queryFn: () => getJson<{ timers: TimerView[] }>(fetcher, '/api/timers'),
    refetchInterval: 10_000,
  })

  const finishedKey = useMemo(() => {
    return (data?.timers ?? [])
      .filter((timer) => {
        if (timer.state === 'finished') return true
        if (timer.state !== 'running' || !timer.endsAt) return false
        return Date.parse(timer.endsAt) <= now
      })
      .map((timer) => timer.id)
      .join(',')
  }, [data, now])

  useEffect(() => {
    const finishedIds = new Set(finishedKey ? finishedKey.split(',') : [])
    let shouldChime = false

    for (const id of finishedIds) {
      if (!chimedRef.current.has(id)) {
        chimedRef.current.add(id)
        shouldChime = true
      }
    }

    for (const id of [...chimedRef.current]) {
      if (!finishedIds.has(id)) chimedRef.current.delete(id)
    }

    if (shouldChime) playChime(4)
  }, [finishedKey])
}
