// Plant data model. Plain TypeScript types only (no enums) so the shape is
// shared verbatim between server and client.

export type WaterEvent = {
  at: string // ISO timestamp the plant was watered
}

export type CareWater = {
  intervalDays?: number
  amountMl?: number
  method?: string
  notes?: string
}

export type CareFeeding = {
  intervalDays?: number
  fertilizer?: string
  season?: string
  notes?: string
}

export type PlantCare = {
  summary?: string
  light?: string
  water?: CareWater
  humidity?: string
  temperatureF?: { min?: number; max?: number }
  soil?: string
  feeding?: CareFeeding
  toxicity?: string
  commonProblems?: string[]
  careMarkdown?: string // longer prose care guide (rendered read-only in right panel)
  generatedAt?: string
  model?: string
}

export type IdCandidate = {
  name: string
  commonName?: string
  confidence?: number
}

export type PlantIdentification = {
  confidence?: number // 0..1
  source?: 'chat' | 'manual' | 'vision'
  candidates?: IdCandidate[]
  confirmedAt?: string
  inaturalistUrl?: string
  wikipediaUrl?: string
}

export type Plant = {
  id: string
  commonName: string // required
  scientificName?: string
  family?: string
  nickname?: string
  heroImageUrl?: string // workspace-relative path "assets/<uuid>.jpg" (resolve via /api/plants/media?path=)
  room?: string // location grouping e.g. "Living room" (acts like a folder)
  location?: string // free text micro-location e.g. "south-facing window"
  notes?: string // user-authored Markdown (left panel)
  light?: string // user quick note about light
  care?: PlantCare // AI-generated (right panel)
  waterIntervalDays?: number // effective interval; defaults from care.water.intervalDays, user-overridable
  lastWateredAt?: string // ISO
  waterHistory?: WaterEvent[]
  identification?: PlantIdentification
  isFavorite?: boolean
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
}

// Media result type (matches recipes-app media.ts). `absPath` is the absolute
// on-disk path of the stored file, so the client can hand it to the desktop
// chat for vision-based identification.
export type MediaResult = {
  src: string
  path: string
  name: string
  altText: string
  kind: 'image'
  absPath: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Compute when the plant is next due for water:
 *   (lastWateredAt ?? createdAt) + waterIntervalDays days.
 * Returns null when there is no effective interval.
 */
export function nextDueAt(p: Plant): string | null {
  const interval = p.waterIntervalDays
  if (!interval || interval <= 0) return null
  const base = p.lastWateredAt ?? p.createdAt
  const baseTime = new Date(base).getTime()
  if (Number.isNaN(baseTime)) return null
  return new Date(baseTime + interval * DAY_MS).toISOString()
}

/**
 * Coarse watering state for a plant relative to `now`:
 *   overdue  — due date is in the past
 *   today    — due within the next day
 *   soon     — due within the next 2 days
 *   ok       — due further out
 *   unknown  — no interval to compute against
 */
export function dueState(
  p: Plant,
  now: Date = new Date(),
): 'overdue' | 'today' | 'soon' | 'ok' | 'unknown' {
  const due = nextDueAt(p)
  if (!due) return 'unknown'
  const diffMs = new Date(due).getTime() - now.getTime()
  if (diffMs < 0) return 'overdue'
  if (diffMs <= DAY_MS) return 'today'
  if (diffMs <= 2 * DAY_MS) return 'soon'
  return 'ok'
}
