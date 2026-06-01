/**
 * Keyless weather, server-side. IP geolocation → Open-Meteo
 * (current conditions + hourly + daily forecast). No API key, no account.
 *
 * Ported from the desktop ambient strip (desktop/src/lib/weather.ts) and
 * extended with a forecast. Runs on the Hono server so the result can be
 * cached, exposed over the App API (RPC), and read by the chat / other apps.
 * Best-effort: throws a typed error on failure so routes can return a clean
 * 502 rather than hanging.
 */
import {
  getAppDataDir,
  getMoldableHome,
  getWorkspaceId,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import type {
  CurrentConditions,
  ForecastDay,
  ForecastHour,
  LocationSearchResult,
  Unit,
  WeatherData,
  WeatherLocation,
} from '../lib/types'
import { weatherLabel } from '../lib/wmo'

const GEO_TTL_MS = 24 * 60 * 60 * 1000 // location rarely changes — cache a day
const GEO_RETRY_AFTER_MS = 15 * 60 * 1000 // avoid hammering ipapi after a 429/outage
const WX_TTL_MS = 10 * 60 * 1000 // conditions — cache ten minutes
const FETCH_TIMEOUT_MS = 8000

export class WeatherError extends Error {}

class UpstreamWeatherError extends WeatherError {
  constructor(
    public readonly status: number,
    public readonly url: string,
  ) {
    super(`Upstream ${status} for ${url}`)
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'user-agent': 'Moldable Weather/0.1 (+https://moldable.sh)',
      },
    })
    if (!res.ok) throw new UpstreamWeatherError(res.status, url)
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof WeatherError) throw err
    throw new WeatherError(
      err instanceof Error && err.name === 'AbortError'
        ? `Timed out fetching ${url}`
        : err instanceof Error
          ? err.message
          : 'Network request failed',
    )
  } finally {
    clearTimeout(timer)
  }
}

// ---- Geolocation (ipapi.co) -------------------------------------------------

interface GeoCacheEntry {
  value: WeatherLocation
  at: number
}

interface StoredGeoCache {
  version: 1
  location: WeatherLocation
  at: number
}

interface StoredLocationPreference {
  version: 1
  location: WeatherLocation | null
  updatedAt: string
}

const locationPreferenceByWorkspace = new Map<string, WeatherLocation | null>()
const geoCacheByWorkspace = new Map<string, GeoCacheEntry>()
const geoInflightByWorkspace = new Map<string, Promise<WeatherLocation>>()
const geoRetryAfterByWorkspace = new Map<string, number>()

function workspaceKey(workspaceId?: string): string {
  return workspaceId || '__default__'
}

function geoCachePath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'location-cache.json')
}

function locationPreferencePath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'location-preference.json')
}

function isLocation(value: unknown): value is WeatherLocation {
  if (!value || typeof value !== 'object') return false
  const loc = value as Record<string, unknown>
  return typeof loc.latitude === 'number' && typeof loc.longitude === 'number'
}

async function readStoredGeoCache(
  workspaceId?: string,
): Promise<GeoCacheEntry | null> {
  const stored = await readJson<StoredGeoCache | null>(
    geoCachePath(workspaceId),
    null,
  )
  if (!stored || stored.version !== 1 || !isLocation(stored.location))
    return null
  return { value: stored.location, at: stored.at }
}

export async function getLocationPreference(
  workspaceId?: string,
): Promise<WeatherLocation | null> {
  const key = workspaceKey(workspaceId)
  if (locationPreferenceByWorkspace.has(key)) {
    return locationPreferenceByWorkspace.get(key) ?? null
  }

  const stored = await readJson<StoredLocationPreference | null>(
    locationPreferencePath(workspaceId),
    null,
  )
  const location =
    stored?.version === 1 && isLocation(stored.location)
      ? stored.location
      : null
  locationPreferenceByWorkspace.set(key, location)
  return location
}

export async function setLocationPreference(
  workspaceId: string | undefined,
  location: WeatherLocation,
): Promise<WeatherLocation> {
  if (!isLocation(location)) throw new WeatherError('Invalid location')

  const normalized: WeatherLocation = {
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    region: location.region,
    country: location.country,
    timezone: location.timezone,
  }
  locationPreferenceByWorkspace.set(workspaceKey(workspaceId), normalized)
  await writeJson<StoredLocationPreference>(
    locationPreferencePath(workspaceId),
    {
      version: 1,
      location: normalized,
      updatedAt: new Date().toISOString(),
    },
  )
  wxCache = null
  return normalized
}

export async function clearLocationPreference(
  workspaceId?: string,
): Promise<void> {
  locationPreferenceByWorkspace.set(workspaceKey(workspaceId), null)
  await writeJson<StoredLocationPreference>(
    locationPreferencePath(workspaceId),
    {
      version: 1,
      location: null,
      updatedAt: new Date().toISOString(),
    },
  )
  wxCache = null
}

async function writeStoredGeoCache(
  workspaceId: string | undefined,
  entry: GeoCacheEntry,
): Promise<void> {
  try {
    await writeJson<StoredGeoCache>(geoCachePath(workspaceId), {
      version: 1,
      location: entry.value,
      at: entry.at,
    })
  } catch (err) {
    // Disk cache is an optimization. Weather should still work if it cannot be written.
    console.warn(
      'Weather location cache write failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

async function loadCachedLocation(
  workspaceId?: string,
): Promise<GeoCacheEntry | null> {
  const key = workspaceKey(workspaceId)
  const memory = geoCacheByWorkspace.get(key)
  if (memory) return memory

  const stored = await readStoredGeoCache(workspaceId)
  if (stored) geoCacheByWorkspace.set(key, stored)
  return stored
}

async function fetchLocationFromIpapi(): Promise<WeatherLocation> {
  const geo = await fetchJson<{
    latitude?: number
    longitude?: number
    city?: string
    region?: string
    country_name?: string
    timezone?: string
  }>('https://ipapi.co/json/')

  if (typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
    throw new WeatherError('Could not determine your location')
  }

  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    name: geo.city,
    region: geo.region,
    country: geo.country_name,
    timezone: geo.timezone,
  }
}

async function fetchLocationFromIpWhoIs(): Promise<WeatherLocation> {
  const geo = await fetchJson<{
    success?: boolean
    message?: string
    latitude?: number
    longitude?: number
    city?: string
    region?: string
    country?: string
    timezone?: { id?: string }
  }>('https://ipwho.is/')

  if (geo.success === false) {
    throw new WeatherError(geo.message || 'Fallback geolocation failed')
  }
  if (typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
    throw new WeatherError('Could not determine your location')
  }

  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    name: geo.city,
    region: geo.region,
    country: geo.country,
    timezone: geo.timezone?.id,
  }
}

async function fetchLocationFromFreeIpApi(): Promise<WeatherLocation> {
  const geo = await fetchJson<{
    latitude?: number
    longitude?: number
    cityName?: string
    regionName?: string
    countryName?: string
    timeZone?: string
  }>('https://freeipapi.com/api/json/')

  if (typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
    throw new WeatherError('Could not determine your location')
  }

  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    name: geo.cityName,
    region: geo.regionName,
    country: geo.countryName,
    timezone: geo.timeZone,
  }
}

async function fetchFreshLocation(): Promise<WeatherLocation> {
  const errors: string[] = []

  for (const fetcher of [
    fetchLocationFromIpapi,
    fetchLocationFromIpWhoIs,
    fetchLocationFromFreeIpApi,
  ]) {
    try {
      return await fetcher()
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  throw new WeatherError(`Geolocation failed: ${errors.join('; ')}`)
}

async function refreshLocation(
  workspaceId: string | undefined,
  stale: GeoCacheEntry | null,
): Promise<WeatherLocation> {
  const key = workspaceKey(workspaceId)
  try {
    const entry: GeoCacheEntry = {
      value: await fetchFreshLocation(),
      at: Date.now(),
    }

    geoCacheByWorkspace.set(key, entry)
    geoRetryAfterByWorkspace.delete(key)
    await writeStoredGeoCache(workspaceId, entry)
    return entry.value
  } catch (err) {
    if (stale) {
      geoRetryAfterByWorkspace.set(key, Date.now() + GEO_RETRY_AFTER_MS)
      console.warn(
        'Weather geolocation failed; using cached location:',
        err instanceof Error ? err.message : err,
      )
      return stale.value
    }
    throw err
  }
}

async function resolveLocation(workspaceId?: string): Promise<WeatherLocation> {
  const key = workspaceKey(workspaceId)
  const cached = await loadCachedLocation(workspaceId)
  const now = Date.now()

  if (cached && now - cached.at < GEO_TTL_MS) return cached.value
  if (cached && now < (geoRetryAfterByWorkspace.get(key) ?? 0)) {
    return cached.value
  }

  const inflight = geoInflightByWorkspace.get(key)
  if (inflight) return inflight

  const next = refreshLocation(workspaceId, cached).finally(() => {
    geoInflightByWorkspace.delete(key)
  })
  geoInflightByWorkspace.set(key, next)
  return next
}

// ---- Open-Meteo forecast ----------------------------------------------------

interface OpenMeteoResponse {
  current?: {
    time?: string
    temperature_2m?: number
    apparent_temperature?: number
    relative_humidity_2m?: number
    weather_code?: number
    is_day?: number
    wind_speed_10m?: number
  }
  hourly?: {
    time?: string[]
    temperature_2m?: number[]
    weather_code?: number[]
  }
  daily?: {
    time?: string[]
    weather_code?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
  }
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    id?: number
    name?: string
    latitude?: number
    longitude?: number
    country?: string
    admin1?: string
    timezone?: string
  }>
}

function displayName(location: WeatherLocation): string {
  return [location.name, location.region, location.country]
    .filter(Boolean)
    .join(', ')
}

export async function searchLocations(
  query: string,
): Promise<LocationSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const params = new URLSearchParams({
    name: trimmed,
    count: '8',
    language: 'en',
    format: 'json',
  })
  const res = await fetchJson<OpenMeteoGeocodingResponse>(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
  )

  return (res.results ?? [])
    .filter(
      (item) =>
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        typeof item.name === 'string',
    )
    .map((item) => {
      const location: WeatherLocation = {
        latitude: item.latitude!,
        longitude: item.longitude!,
        name: item.name,
        region: item.admin1,
        country: item.country,
        timezone: item.timezone,
      }
      return {
        ...location,
        id: String(
          item.id ??
            `${item.latitude},${item.longitude},${displayName(location)}`,
        ),
        displayName: displayName(location),
      }
    })
}

function buildUrl(loc: WeatherLocation, unit: Unit): string {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    temperature_unit: unit,
    wind_speed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '7',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

function parseCurrent(res: OpenMeteoResponse): CurrentConditions {
  const cur = res.current
  if (!cur || typeof cur.temperature_2m !== 'number') {
    throw new WeatherError('No current conditions available')
  }
  const code = cur.weather_code ?? 0
  return {
    temperature: Math.round(cur.temperature_2m),
    apparentTemperature: Math.round(
      cur.apparent_temperature ?? cur.temperature_2m,
    ),
    code,
    label: weatherLabel(code),
    isDay: cur.is_day !== 0,
    humidity: Math.round(cur.relative_humidity_2m ?? 0),
    windSpeed: Math.round(cur.wind_speed_10m ?? 0),
    time: cur.time ?? new Date().toISOString(),
  }
}

function parseHourly(res: OpenMeteoResponse): ForecastHour[] {
  const h = res.hourly
  if (!h?.time || !h.temperature_2m || !h.weather_code) return []
  const now = Date.now()
  const out: ForecastHour[] = []
  for (let i = 0; i < h.time.length; i++) {
    const t = new Date(h.time[i]).getTime()
    if (t < now) continue // only future hours
    const code = h.weather_code[i] ?? 0
    out.push({
      time: h.time[i],
      temperature: Math.round(h.temperature_2m[i]),
      code,
      label: weatherLabel(code),
    })
    if (out.length >= 12) break // next 12 hours is plenty for a strip
  }
  return out
}

function parseDaily(res: OpenMeteoResponse): ForecastDay[] {
  const d = res.daily
  if (
    !d?.time ||
    !d.weather_code ||
    !d.temperature_2m_max ||
    !d.temperature_2m_min
  ) {
    return []
  }
  return d.time.map((date, i) => {
    const code = d.weather_code![i] ?? 0
    return {
      date,
      code,
      label: weatherLabel(code),
      high: Math.round(d.temperature_2m_max![i]),
      low: Math.round(d.temperature_2m_min![i]),
      precipitationProbability: Math.round(
        d.precipitation_probability_max?.[i] ?? 0,
      ),
    }
  })
}

// ---- Desktop preferences ----------------------------------------------------

interface WorkspaceConfig {
  preferences?: Record<string, unknown>
}

function workspaceConfigPath(workspaceId?: string): string {
  return safePath(
    getMoldableHome(),
    'workspaces',
    getWorkspaceId(workspaceId),
    'config.json',
  )
}

async function resolveDefaultUnit(workspaceId?: string): Promise<Unit> {
  try {
    const config = await readJson<WorkspaceConfig>(
      workspaceConfigPath(workspaceId),
      {},
    )
    return config.preferences?.weatherUnit === 'c' ? 'celsius' : 'fahrenheit'
  } catch (err) {
    console.warn(
      'Weather unit preference read failed; using Fahrenheit:',
      err instanceof Error ? err.message : err,
    )
    return 'fahrenheit'
  }
}

// ---- Public surface ---------------------------------------------------------

let wxCache: { key: string; value: WeatherData; at: number } | null = null

export interface WeatherQuery {
  latitude?: number
  longitude?: number
  unit?: Unit
  workspaceId?: string
}

/**
 * Fetch (or return cached) weather. Resolves location via IP unless explicit
 * coordinates are supplied. Throws `WeatherError` on any failure.
 */
export async function getWeatherData(
  query: WeatherQuery = {},
): Promise<WeatherData> {
  const unit: Unit = query.unit ?? (await resolveDefaultUnit(query.workspaceId))

  const preferredLocation = await getLocationPreference(query.workspaceId)
  const location: WeatherLocation =
    typeof query.latitude === 'number' && typeof query.longitude === 'number'
      ? { latitude: query.latitude, longitude: query.longitude }
      : (preferredLocation ?? (await resolveLocation(query.workspaceId)))

  const key = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)},${unit}`
  if (wxCache && wxCache.key === key && Date.now() - wxCache.at < WX_TTL_MS) {
    return wxCache.value
  }

  const res = await fetchJson<OpenMeteoResponse>(buildUrl(location, unit))
  const value: WeatherData = {
    unit,
    location,
    current: parseCurrent(res),
    hourly: parseHourly(res),
    daily: parseDaily(res),
    updatedAt: new Date().toISOString(),
  }
  wxCache = { key, value, at: Date.now() }
  return value
}
