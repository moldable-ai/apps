import type { Unit } from '../lib/types'

export function formatHour(iso: string): string {
  const match = /T(\d{2})(?::\d{2})?/.exec(iso)
  const hour = match ? Number(match[1]) : Number.NaN
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return iso
  return new Date(2000, 0, 1, hour).toLocaleTimeString([], {
    hour: 'numeric',
  })
}

export function formatDay(iso: string, index: number): string {
  if (index === 0) return 'Today'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso

  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return iso
  }

  return date.toLocaleDateString([], { weekday: 'short' })
}

export function readWeatherUrlParams(search: string): {
  coords: string
  unitOverride: Unit | null
} {
  const p = new URLSearchParams(search)
  const lat = p.get('lat')
  const lon = p.get('lon')
  const latitude = Number(lat)
  const longitude = Number(lon)
  const coords =
    lat &&
    lon &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
      ? `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
      : ''
  const u = (p.get('unit') || '').toLowerCase()
  const unitOverride: Unit | null =
    u === 'c' || u === 'celsius'
      ? 'celsius'
      : u === 'f' || u === 'fahrenheit'
        ? 'fahrenheit'
        : null
  return { coords, unitOverride }
}
