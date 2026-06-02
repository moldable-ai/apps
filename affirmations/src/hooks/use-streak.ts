'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { getDayKey } from '@/lib/affirmations'
import { type StreakState, calculateStreakCount } from '@/lib/streak'

export { calculateStreakCount, type StreakState }

/**
 * Tracks a lightweight daily-visit streak in workspace-scoped app storage.
 * Opening the app on
 * consecutive days increments the count; a skipped day resets it to 1.
 */
export function useStreak(dayKey: string = getDayKey()): number {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    if (!workspaceId) {
      setCount(0)
      return () => {
        cancelled = true
      }
    }

    setCount(0)

    async function syncStreak() {
      try {
        const response = await fetchWithWorkspace('/api/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayKey }),
        })

        if (!response.ok) throw new Error('Failed to update streak')

        const data: unknown = await response.json()
        if (
          !cancelled &&
          data &&
          typeof data === 'object' &&
          Number.isInteger((data as StreakState).count)
        ) {
          setCount((data as StreakState).count)
        }
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void syncStreak()

    return () => {
      cancelled = true
    }
  }, [dayKey, fetchWithWorkspace, workspaceId])

  return count
}
