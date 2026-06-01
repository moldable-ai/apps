// Shared data model for Clock. These types describe what is persisted on the
// server and what crosses the wire to the client and over RPC.

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Alarm {
  id: string
  label: string
  /** 24h time of day, "HH:mm". */
  time: string
  enabled: boolean
  /** Days the alarm repeats (0 = Sunday). Empty means a one-shot alarm. */
  repeat: Weekday[]
  createdAt: string
}

/** Stored timer. Remaining time is derived from `endsAt` while running. */
export interface Timer {
  id: string
  label: string
  durationMs: number
  /** ISO time the timer will reach zero, set only while running. */
  endsAt: string | null
  /** Remaining time when paused/idle, in ms. */
  remainingMs: number
  running: boolean
  createdAt: string
}

export type TimerView = Timer & {
  state: 'running' | 'paused' | 'idle' | 'finished'
  /** Remaining ms at the moment the server answered. Never negative. */
  currentRemainingMs: number
}

export interface StopwatchState {
  running: boolean
  /** ISO time the current run segment started, set only while running. */
  startedAt: string | null
  /** Elapsed time captured from completed run segments, in ms. */
  accumulatedMs: number
  /** Lap marks, each an absolute elapsed time in ms. */
  laps: number[]
}

export interface WorldClock {
  id: string
  label: string
  /** IANA time zone, e.g. "Europe/London". */
  timeZone: string
  createdAt: string
}

export const DEFAULT_STOPWATCH: StopwatchState = {
  running: false,
  startedAt: null,
  accumulatedMs: 0,
  laps: [],
}
