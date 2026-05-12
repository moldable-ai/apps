export interface CalendarInvite {
  uid: string
  method: string
  title: string
  start: Date | null
  end: Date | null
  location: string
  description: string
  organizer: InvitePerson | null
  attendees: InvitePerson[]
}

export interface InvitePerson {
  name: string
  email: string
}

interface IcsProperty {
  name: string
  params: Record<string, string>
  value: string
}

const WINDOWS_TIME_ZONES: Record<string, string> = {
  'Dateline Standard Time': 'Etc/GMT+12',
  'UTC-11': 'Etc/GMT+11',
  'Aleutian Standard Time': 'America/Adak',
  'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Marquesas Standard Time': 'Pacific/Marquesas',
  'Alaskan Standard Time': 'America/Anchorage',
  'UTC-09': 'Etc/GMT+9',
  'Pacific Standard Time (Mexico)': 'America/Tijuana',
  'UTC-08': 'Etc/GMT+8',
  'Pacific Standard Time': 'America/Los_Angeles',
  'US Mountain Standard Time': 'America/Phoenix',
  'Mountain Standard Time (Mexico)': 'America/Chihuahua',
  'Mountain Standard Time': 'America/Denver',
  'Central America Standard Time': 'America/Guatemala',
  'Central Standard Time': 'America/Chicago',
  'Easter Island Standard Time': 'Pacific/Easter',
  'Central Standard Time (Mexico)': 'America/Mexico_City',
  'Canada Central Standard Time': 'America/Regina',
  'SA Pacific Standard Time': 'America/Bogota',
  'Eastern Standard Time (Mexico)': 'America/Cancun',
  'Eastern Standard Time': 'America/New_York',
  'Haiti Standard Time': 'America/Port-au-Prince',
  'Cuba Standard Time': 'America/Havana',
  'US Eastern Standard Time': 'America/Indianapolis',
  'Turks And Caicos Standard Time': 'America/Grand_Turk',
  'Paraguay Standard Time': 'America/Asuncion',
  'Atlantic Standard Time': 'America/Halifax',
  'Venezuela Standard Time': 'America/Caracas',
  'Central Brazilian Standard Time': 'America/Cuiaba',
  'SA Western Standard Time': 'America/La_Paz',
  'Pacific SA Standard Time': 'America/Santiago',
  'Newfoundland Standard Time': 'America/St_Johns',
  'Tocantins Standard Time': 'America/Araguaina',
  'E. South America Standard Time': 'America/Sao_Paulo',
  'SA Eastern Standard Time': 'America/Cayenne',
  'Argentina Standard Time': 'America/Argentina/Buenos_Aires',
  'Greenland Standard Time': 'America/Godthab',
  'Montevideo Standard Time': 'America/Montevideo',
  'Magallanes Standard Time': 'America/Punta_Arenas',
  'Saint Pierre Standard Time': 'America/Miquelon',
  'Bahia Standard Time': 'America/Bahia',
  'UTC-02': 'Etc/GMT+2',
  'Azores Standard Time': 'Atlantic/Azores',
  'Cape Verde Standard Time': 'Atlantic/Cape_Verde',
  UTC: 'UTC',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Romance Standard Time': 'Europe/Paris',
  'Morocco Standard Time': 'Africa/Casablanca',
  'Central European Standard Time': 'Europe/Warsaw',
  'W. Central Africa Standard Time': 'Africa/Lagos',
}

export function parseCalendarInvite(ics: string): CalendarInvite | null {
  const lines = unfoldIcsLines(ics)
  const method =
    lines
      .map(parseIcsProperty)
      .find((property) => property?.name === 'METHOD')
      ?.value.toUpperCase() ?? ''

  if (method && method !== 'REQUEST') return null

  const eventLines = veventLines(lines)
  if (eventLines.length === 0) return null

  const properties = eventLines
    .map(parseIcsProperty)
    .filter((property): property is IcsProperty => Boolean(property))
  const property = (name: string) =>
    properties.find((item) => item.name === name)
  const uid = property('UID')?.value.trim()

  if (!uid) return null

  const start = property('DTSTART')
  const end = property('DTEND')

  return {
    uid,
    method: method || 'REQUEST',
    title: property('SUMMARY')?.value.trim() || 'Untitled event',
    start: start ? parseIcsDate(start.value, start.params) : null,
    end: end ? parseIcsDate(end.value, end.params) : null,
    location: property('LOCATION')?.value.trim() ?? '',
    description: property('DESCRIPTION')?.value.trim() ?? '',
    organizer: parsePerson(property('ORGANIZER')),
    attendees: properties
      .filter((item) => item.name === 'ATTENDEE')
      .map(parsePerson)
      .filter((person): person is InvitePerson => Boolean(person)),
  }
}

function unfoldIcsLines(ics: string) {
  return ics
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

function veventLines(lines: string[]) {
  const start = lines.findIndex((line) => line.toUpperCase() === 'BEGIN:VEVENT')
  if (start === -1) return []

  const end = lines.findIndex(
    (line, index) => index > start && line.toUpperCase() === 'END:VEVENT',
  )

  return lines.slice(start + 1, end === -1 ? undefined : end)
}

function parseIcsProperty(line: string): IcsProperty | null {
  const separator = line.indexOf(':')
  if (separator === -1) return null

  const rawNameAndParams = line.slice(0, separator)
  const value = decodeIcsText(line.slice(separator + 1))
  const [rawName, ...rawParams] = rawNameAndParams.split(';')
  const name = rawName?.toUpperCase()
  if (!name) return null

  const params: Record<string, string> = {}
  for (const rawParam of rawParams) {
    const paramSeparator = rawParam.indexOf('=')
    if (paramSeparator === -1) continue

    const paramName = rawParam.slice(0, paramSeparator).toUpperCase()
    const paramValue = rawParam.slice(paramSeparator + 1).replace(/^"|"$/g, '')
    params[paramName] = decodeIcsText(paramValue)
  }

  return { name, params, value }
}

function parseIcsDate(value: string, params: Record<string, string>) {
  const trimmed = value.trim()
  const dateMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed)
  if (dateMatch || params.VALUE?.toUpperCase() === 'DATE') {
    const match = dateMatch ?? /^(\d{4})(\d{2})(\d{2})/.exec(trimmed)
    if (!match) return null

    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(
    trimmed,
  )
  if (!match) return null

  const [, year, month, day, hour, minute, second, utc] = match
  const dateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }

  if (utc) {
    return new Date(
      Date.UTC(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        dateParts.hour,
        dateParts.minute,
        dateParts.second,
      ),
    )
  }

  const timeZone = resolveTimeZone(params.TZID)
  if (timeZone) return zonedTimeToDate(dateParts, timeZone)

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
  )
}

function resolveTimeZone(tzid: string | undefined) {
  if (!tzid) return null

  const normalized = tzid.trim().replace(/^"|"$/g, '')
  const mapped = WINDOWS_TIME_ZONES[normalized] ?? normalized
  if (isValidTimeZone(mapped)) return mapped

  const pathMatch = /([A-Za-z_]+\/[A-Za-z_/-]+)$/.exec(normalized)
  if (pathMatch?.[1] && isValidTimeZone(pathMatch[1])) return pathMatch[1]

  return null
}

function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

function zonedTimeToDate(
  parts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
  },
  timeZone: string,
) {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  let date = new Date(localAsUtc)

  for (let index = 0; index < 3; index += 1) {
    const offset = timeZoneOffsetMs(date, timeZone)
    const next = new Date(localAsUtc - offset)
    if (next.getTime() === date.getTime()) return next
    date = next
  }

  return date
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((item) => item.type === type)?.value ?? 0)

  const zonedAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  )

  return zonedAsUtc - date.getTime()
}

function parsePerson(property: IcsProperty | undefined | null) {
  if (!property) return null

  const email = property.value.replace(/^mailto:/i, '').trim()
  const name = property.params.CN?.trim() || email
  if (!email && !name) return null

  return { name, email }
}

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}
