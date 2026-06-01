'use client'

import { useEffect, useState } from 'react'
import { getDayKey } from '@/lib/affirmations'

interface StreakState {
  /** Number of consecutive days the app has been opened, including today. */
  count: number
  /** The day key of the most recent visit. */
  lastVisit: string
}

function getStreakKey(workspaceId: string) {
  return `affirmations-streak-${workspaceId}`
}

function readStreak(workspaceId: string): StreakState | null {
  try {
    const raw = localStorage.getItem(getStreakKey(workspaceId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as StreakState).count === 'number' &&
      typeof (parsed as StreakState).lastVisit === 'string'
    ) {
      return parsed as StreakState
    }
    return null
  } catch {
    return null
  }
}

function yesterdayKey(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return getDayKey(date)
}

/**
 * Tracks a lightweight daily-visit streak in localStorage. Opening the app on
 * consecutive days increments the count; a skipped day resets it to 1.
 */
export function useStreak(workspaceId: string | undefined): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!workspaceId) return

    const today = getDayKey()
    const previous = readStreak(workspaceId)

    let nextCount: number
    if (!previous) {
      nextCount = 1
    } else if (previous.lastVisit === today) {
      nextCount = previous.count
    } else if (previous.lastVisit === yesterdayKey()) {
      nextCount = previous.count + 1
    } else {
      nextCount = 1
    }

    setCount(nextCount)

    if (!previous || previous.lastVisit !== today) {
      try {
        localStorage.setItem(
          getStreakKey(workspaceId),
          JSON.stringify({ count: nextCount, lastVisit: today }),
        )
      } catch {
        // localStorage unavailable — streak is best-effort only.
      }
    }
  }, [workspaceId])

  return count
}
