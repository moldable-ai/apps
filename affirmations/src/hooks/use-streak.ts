'use client'

import { useEffect, useState } from 'react'
import { getDayKey } from '@/lib/affirmations'

export interface StreakState {
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
      Number.isInteger((parsed as StreakState).count) &&
      (parsed as StreakState).count > 0 &&
      typeof (parsed as StreakState).lastVisit === 'string'
    ) {
      return parsed as StreakState
    }
    return null
  } catch {
    return null
  }
}

function previousDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  return getDayKey(date)
}

export function calculateStreakCount(
  previous: StreakState | null,
  dayKey: string,
): number {
  if (!previous) return 1
  if (previous.lastVisit === dayKey) return previous.count
  if (previous.lastVisit === previousDayKey(dayKey)) return previous.count + 1
  return 1
}

/**
 * Tracks a lightweight daily-visit streak in localStorage. Opening the app on
 * consecutive days increments the count; a skipped day resets it to 1.
 */
export function useStreak(
  workspaceId: string | undefined,
  dayKey: string = getDayKey(),
): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!workspaceId) return

    const today = dayKey
    const previous = readStreak(workspaceId)

    const nextCount = calculateStreakCount(previous, today)

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
  }, [dayKey, workspaceId])

  return count
}
