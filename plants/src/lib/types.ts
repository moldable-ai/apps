// Plant data model. Plain TypeScript types only (no enums) so the shape is
// shared verbatim between server and client.

export type WaterEvent = {
  at: string // ISO timestamp the plant was watered
}

// A dated photo in the plant's growth journal.
export type PlantPhoto = {
  path: string // workspace-relative assets path
  addedAt: string // ISO
  caption?: string
}

export type CareWater = {
  intervalDays?: number
  /** Longer cadence to use during winter dormancy (cold months). */
  winterIntervalDays?: number
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
  /** When/whether this plant goes dormant and how care changes (e.g. winter rest). */
  dormancy?: string
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
  snoozeUntil?: string // ISO — "still moist" skip: suppresses due until this time
  waterHistory?: WaterEvent[]
  photos?: PlantPhoto[] // growth journal — dated photos over time
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
 * Whether `now` falls in the cold, low-light dormancy window when most house
 * plants slow right down (Northern-hemisphere Nov–Feb). Used to stretch the
 * watering cadence so we don't overwater a resting plant.
 */
export function isDormantSeason(now: Date = new Date()): boolean {
  const m = now.getMonth() // 0 = Jan
  return m === 10 || m === 11 || m === 0 || m === 1 // Nov, Dec, Jan, Feb
}

/**
 * The watering interval to use *right now* — the user/AI cadence, automatically
 * swapped to the dormant-season cadence during winter when the plant's care
 * provides one. Returns null when there's no usable interval.
 */
export function currentWaterIntervalDays(
  p: Plant,
  now: Date = new Date(),
): number | null {
  const active = p.waterIntervalDays ?? p.care?.water?.intervalDays
  if (!active || active <= 0) return null
  const winter = p.care?.water?.winterIntervalDays
  if (isDormantSeason(now) && winter && winter > 0 && winter > active) {
    return winter
  }
  return active
}

/** True when the active cadence is currently the dormant-season one. */
export function isOnWinterSchedule(p: Plant, now: Date = new Date()): boolean {
  const active = p.waterIntervalDays ?? p.care?.water?.intervalDays
  const winter = p.care?.water?.winterIntervalDays
  return Boolean(isDormantSeason(now) && active && winter && winter > active)
}

/**
 * Compute when the plant is next due for water:
 *   (lastWateredAt ?? createdAt) + the season-appropriate interval.
 * Returns null when there is no effective interval.
 */
export function nextDueAt(p: Plant, now: Date = new Date()): string | null {
  const interval = currentWaterIntervalDays(p, now)
  if (!interval || interval <= 0) return null
  const base = p.lastWateredAt ?? p.createdAt
  const baseTime = new Date(base).getTime()
  if (Number.isNaN(baseTime)) return null
  let due = baseTime + interval * DAY_MS
  // A "still moist" skip pushes the next reminder out without logging a water,
  // so the plant drops off the due list until the user actually waters it.
  if (p.snoozeUntil) {
    const snooze = new Date(p.snoozeUntil).getTime()
    if (!Number.isNaN(snooze) && snooze > due) due = snooze
  }
  return new Date(due).toISOString()
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
  const due = nextDueAt(p, now)
  if (!due) return 'unknown'
  const diffMs = new Date(due).getTime() - now.getTime()
  if (diffMs < 0) return 'overdue'
  if (diffMs <= DAY_MS) return 'today'
  if (diffMs <= 2 * DAY_MS) return 'soon'
  return 'ok'
}
