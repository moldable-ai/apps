// Time formatting helpers shared by the client and server.

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "1:23:04" style clock from milliseconds. Hours drop when zero. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}`
    : `${mm}:${ss}`
}

/** Stopwatch display with tenths: "1:02.3". */
export function formatStopwatch(ms: number): string {
  const total = Math.max(0, ms)
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const tenths = Math.floor((total % 1000) / 100)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

/** Compact "in 2h 5m" / "in 45s" relative label. */
export function formatRelative(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) {
    const secs = total % 60
    return secs ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `${hours}h ${mins}m` : `${hours}h`
}

export function repeatLabel(repeat: number[]): string {
  if (repeat.length === 0) return 'Once'
  const sorted = [...repeat].sort((a, b) => a - b)
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1)
  const isWeekend = sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6
  const isEveryDay = sorted.length === 7
  if (isEveryDay) return 'Every day'
  if (isWeekdays) return 'Weekdays'
  if (isWeekend) return 'Weekends'
  return sorted.map((d) => WEEKDAY_LABELS[d]).join(' ')
}

/** UTC offset for an IANA zone right now, e.g. "+09:00" or "-04:00". */
export function zoneOffsetLabel(
  timeZone: string,
  at: Date = new Date(),
): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(at)
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    const match = name.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/)
    if (!match) return 'GMT'
    const hours = match[1]!.padStart(match[1]!.startsWith('-') ? 3 : 2, '0')
    const sign = hours.startsWith('-') ? '-' : '+'
    const hh = hours.replace(/[+-]/, '').padStart(2, '0')
    return `${sign}${hh}:${match[2] ?? '00'}`
  } catch {
    return ''
  }
}

/** Difference between a zone and the local zone, e.g. "+3h" or "+5h 30m". */
export function zoneDeltaLabel(
  timeZone: string,
  at: Date = new Date(),
): string {
  try {
    const local = zoneMinutesOffset(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      at,
    )
    const target = zoneMinutesOffset(timeZone, at)
    const diff = target - local
    if (diff === 0) return 'Same time'
    const sign = diff > 0 ? '+' : '-'
    const absolute = Math.abs(diff)
    const hours = Math.floor(absolute / 60)
    const minutes = absolute % 60
    return minutes === 0 ? `${sign}${hours}h` : `${sign}${hours}h ${minutes}m`
  } catch {
    return ''
  }
}

function zoneMinutesOffset(timeZone: string, at: Date): number {
  const local = new Date(at.toLocaleString('en-US', { timeZone }))
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}

/** Split a wall-clock time into its digits and meridiem, e.g. `{ hm: '7:05', meridiem: 'AM' }`. */
export function clockParts(
  date: Date,
  timeZone?: string,
): { hm: string; meridiem: string } {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  const [hm, meridiem = ''] = formatted.split(' ')
  return { hm: hm ?? formatted, meridiem }
}

/** Split a 24h "HH:mm" string into 12h digits and meridiem for display. */
export function clockPartsFromTime(time: string): {
  hm: string
  meridiem: string
} {
  const [h, m] = time.split(':').map(Number)
  if (h === undefined || m === undefined) return { hm: time, meridiem: '' }
  const meridiem = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return { hm: `${hour}:${String(m).padStart(2, '0')}`, meridiem }
}

/** "Today" / "Tomorrow" / "Yesterday" / weekday — a zone's calendar day vs. local. */
export function relativeDayLabel(
  timeZone: string,
  at: Date = new Date(),
): string {
  const isoDay = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at)
  try {
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const target = Date.parse(`${isoDay(timeZone)}T00:00:00Z`)
    const local = Date.parse(`${isoDay(localZone)}T00:00:00Z`)
    const diff = Math.round((target - local) / 86_400_000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === -1) return 'Yesterday'
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
    }).format(at)
  } catch {
    return ''
  }
}
