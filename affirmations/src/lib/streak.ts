import { getDayKey } from './affirmations'

export interface StreakState {
  /** Number of consecutive days the app has been opened, including today. */
  count: number
  /** The day key of the most recent visit. */
  lastVisit: string
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
