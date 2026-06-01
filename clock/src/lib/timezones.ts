// A curated set of common cities for the world-clock picker. Falls back to the
// full IANA list from the platform when available so users can find anywhere.

export interface ZoneOption {
  label: string
  timeZone: string
}

export const COMMON_ZONES: ZoneOption[] = [
  { label: 'Honolulu', timeZone: 'Pacific/Honolulu' },
  { label: 'Anchorage', timeZone: 'America/Anchorage' },
  { label: 'Los Angeles', timeZone: 'America/Los_Angeles' },
  { label: 'Denver', timeZone: 'America/Denver' },
  { label: 'Chicago', timeZone: 'America/Chicago' },
  { label: 'New York', timeZone: 'America/New_York' },
  { label: 'Mexico City', timeZone: 'America/Mexico_City' },
  { label: 'Bogotá', timeZone: 'America/Bogota' },
  { label: 'São Paulo', timeZone: 'America/Sao_Paulo' },
  { label: 'London', timeZone: 'Europe/London' },
  { label: 'Lisbon', timeZone: 'Europe/Lisbon' },
  { label: 'Paris', timeZone: 'Europe/Paris' },
  { label: 'Berlin', timeZone: 'Europe/Berlin' },
  { label: 'Madrid', timeZone: 'Europe/Madrid' },
  { label: 'Rome', timeZone: 'Europe/Rome' },
  { label: 'Athens', timeZone: 'Europe/Athens' },
  { label: 'Istanbul', timeZone: 'Europe/Istanbul' },
  { label: 'Moscow', timeZone: 'Europe/Moscow' },
  { label: 'Dubai', timeZone: 'Asia/Dubai' },
  { label: 'Karachi', timeZone: 'Asia/Karachi' },
  { label: 'Mumbai', timeZone: 'Asia/Kolkata' },
  { label: 'Dhaka', timeZone: 'Asia/Dhaka' },
  { label: 'Bangkok', timeZone: 'Asia/Bangkok' },
  { label: 'Singapore', timeZone: 'Asia/Singapore' },
  { label: 'Hong Kong', timeZone: 'Asia/Hong_Kong' },
  { label: 'Shanghai', timeZone: 'Asia/Shanghai' },
  { label: 'Tokyo', timeZone: 'Asia/Tokyo' },
  { label: 'Seoul', timeZone: 'Asia/Seoul' },
  { label: 'Sydney', timeZone: 'Australia/Sydney' },
  { label: 'Auckland', timeZone: 'Pacific/Auckland' },
]

/** Every IANA zone the platform knows, for free-form search. */
export function allZones(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf
    if (typeof supported === 'function') return supported('timeZone')
  } catch {
    // fall through
  }
  return COMMON_ZONES.map((z) => z.timeZone)
}

/** Best-effort "City" label from an IANA zone id. */
export function zoneToLabel(timeZone: string): string {
  const known = COMMON_ZONES.find((z) => z.timeZone === timeZone)
  if (known) return known.label
  const tail = timeZone.split('/').pop() ?? timeZone
  return tail.replace(/_/g, ' ')
}
