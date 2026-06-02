import type { Alarm, Weekday } from './types'

function parseAlarmTime(
  time: string,
): { hours: number; minutes: number } | null {
  const match = time.match(/^(\d{2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

export function firstOneShotAlarmFireAt(alarm: Alarm): Date | null {
  if (alarm.repeat.length > 0) return null
  const parts = parseAlarmTime(alarm.time)
  if (!parts) return null

  const createdAt = new Date(alarm.createdAt)
  const base = Number.isFinite(createdAt.getTime()) ? createdAt : new Date()
  const fireAt = new Date(base)
  fireAt.setHours(parts.hours, parts.minutes, 0, 0)
  if (fireAt.getTime() <= base.getTime()) {
    fireAt.setDate(fireAt.getDate() + 1)
  }
  return fireAt
}

export function nextAlarmOccurrenceAfter(
  alarm: Alarm,
  after: Date,
): Date | null {
  const parts = parseAlarmTime(alarm.time)
  if (!parts) return null

  if (alarm.repeat.length === 0) {
    const fireAt = firstOneShotAlarmFireAt(alarm)
    return fireAt !== null && fireAt.getTime() > after.getTime() ? fireAt : null
  }

  const createdAt = new Date(alarm.createdAt)
  const createdAtMs = Number.isFinite(createdAt.getTime())
    ? createdAt.getTime()
    : after.getTime()
  const start = new Date(Math.max(after.getTime(), createdAtMs))

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(start)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setHours(parts.hours, parts.minutes, 0, 0)
    if (candidate.getTime() <= start.getTime()) continue
    if (alarm.repeat.includes(candidate.getDay() as Weekday)) return candidate
  }

  return null
}

export function isOneShotAlarmExpired(
  alarm: Alarm,
  at: Date,
  graceMs = 60_000,
): boolean {
  const fireAt = firstOneShotAlarmFireAt(alarm)
  return fireAt !== null && at.getTime() >= fireAt.getTime() + graceMs
}
