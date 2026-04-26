export interface SnoozeOption {
  id: string
  label: string
  until: number
}

function atTime(date: Date, hour: number, minute = 0) {
  const target = new Date(date)
  target.setHours(hour, minute, 0, 0)
  return target
}

function addDays(date: Date, days: number) {
  const target = new Date(date)
  target.setDate(target.getDate() + days)
  return target
}

function laterToday(now: Date) {
  const evening = atTime(now, 18)
  if (evening.getTime() > now.getTime() + 30 * 60_000) return evening
  return atTime(addDays(now, 1), 8)
}

function tomorrowMorning(now: Date) {
  return atTime(addDays(now, 1), 8)
}

function nextWeekMorning(now: Date) {
  const day = now.getDay()
  const daysUntilMonday = (1 - day + 7) % 7 || 7
  return atTime(addDays(now, daysUntilMonday), 8)
}

export function getSnoozeOptions(now = new Date()): SnoozeOption[] {
  return [
    {
      id: '20-minutes',
      label: 'In 20 minutes',
      until: now.getTime() + 20 * 60_000,
    },
    {
      id: '1-hour',
      label: 'In 1 hour',
      until: now.getTime() + 60 * 60_000,
    },
    {
      id: '3-hours',
      label: 'In 3 hours',
      until: now.getTime() + 3 * 60 * 60_000,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      until: tomorrowMorning(now).getTime(),
    },
    {
      id: 'next-week',
      label: 'Next week',
      until: nextWeekMorning(now).getTime(),
    },
  ]
}

export function getDefaultCustomSnooze(now = new Date()) {
  return laterToday(now)
}
