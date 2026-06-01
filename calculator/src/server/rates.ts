// Live currency exchange rates. Fetched from the free, key-less Exchange Rate
// API (open.er-api.com — daily ECB-style rates, expressed as units per 1 USD)
// and cached on disk per workspace so we hit the network at most once per
// refresh window. Local-first: rates land on the user's machine; we never send
// their data anywhere.
import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { CURRENCY_CODES, type RateTable } from '../lib/units'

const RATES_URL = 'https://open.er-api.com/v6/latest/USD'
const CACHE_FILE = 'rates-cache.json'
// Floor on how often we re-fetch even if the upstream "next update" is sooner.
const MIN_REFRESH_MS = 60 * 60 * 1000 // 1 hour

export interface RatesPayload {
  base: 'USD'
  rates: RateTable
  // ISO timestamps describing the upstream data freshness.
  updatedAt: string | null
  nextUpdateAt: string | null
  // When we last successfully fetched from the network.
  fetchedAt: string
}

interface UpstreamResponse {
  result?: string
  time_last_update_utc?: string
  time_next_update_utc?: string
  rates?: Record<string, number>
}

function ratesCachePath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), CACHE_FILE)
}

// Keep only the currencies the app offers, so the cache stays small and stable.
function pickSupported(rates: Record<string, number>): RateTable {
  const out: RateTable = {}
  for (const code of CURRENCY_CODES) {
    if (typeof rates[code] === 'number') out[code] = rates[code]
  }
  // The base is always 1; the upstream omits it from `rates` in some responses.
  out.USD = 1
  return out
}

function toIso(value?: string): string | null {
  if (!value) return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null
}

async function fetchUpstream(): Promise<RatesPayload> {
  const res = await fetch(RATES_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    throw new Error(`Rate provider returned ${res.status}`)
  }
  const data = (await res.json()) as UpstreamResponse
  if (data.result !== 'success' || !data.rates) {
    throw new Error('Rate provider returned an unexpected payload')
  }
  return {
    base: 'USD',
    rates: pickSupported(data.rates),
    updatedAt: toIso(data.time_last_update_utc),
    nextUpdateAt: toIso(data.time_next_update_utc),
    fetchedAt: new Date().toISOString(),
  }
}

function isFresh(cache: RatesPayload): boolean {
  const fetchedMs = Date.parse(cache.fetchedAt)
  if (!Number.isFinite(fetchedMs)) return false
  const now = Date.now()
  // Respect the upstream's next-update hint, but never refetch more than once
  // an hour and always serve cache that's under an hour old.
  if (now - fetchedMs < MIN_REFRESH_MS) return true
  if (cache.nextUpdateAt) {
    const next = Date.parse(cache.nextUpdateAt)
    if (Number.isFinite(next) && now < next) return true
  }
  return false
}

/**
 * Return live rates, fetching from the network when the cache is missing or
 * stale. On a network failure we fall back to the last cached rates (marked via
 * a thrown error only when there is nothing cached at all).
 */
export async function getRates(workspaceId?: string): Promise<RatesPayload> {
  const path = ratesCachePath(workspaceId)
  const cached = await readJson<RatesPayload | null>(path, null)

  if (cached && isFresh(cached)) return cached

  try {
    const fresh = await fetchUpstream()
    await writeJson(path, fresh)
    return fresh
  } catch (error) {
    // Network down / provider error: serve stale cache if we have any.
    if (cached) return cached
    throw error instanceof Error
      ? error
      : new Error('Failed to load exchange rates')
  }
}
