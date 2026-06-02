'use client'

import {
  Droplet,
  Droplets,
  Lightbulb,
  Minus,
  Plus,
  Snowflake,
} from 'lucide-react'
import { type JSX, useState } from 'react'
import { Button, Spinner, cn } from '@moldable-ai/ui'
import {
  type Plant,
  currentWaterIntervalDays,
  dueState,
  isOnWinterSchedule,
  nextDueAt,
} from '../../lib/types'

const DAY_MS = 24 * 60 * 60 * 1000

type WaterState = 'overdue' | 'today' | 'soon' | 'ok' | 'unknown'

/** Ring stroke + drop tint per urgency. Subtle field tint laid over the card. */
const TONE: Record<WaterState, { ring: string; field: string }> = {
  overdue: { ring: 'oklch(0.66 0.19 28)', field: 'oklch(0.66 0.19 28 / 0.13)' },
  today: { ring: 'oklch(0.78 0.16 78)', field: 'oklch(0.78 0.16 78 / 0.13)' },
  soon: { ring: 'oklch(0.80 0.15 128)', field: 'oklch(0.80 0.15 128 / 0.11)' },
  ok: { ring: 'oklch(0.72 0.15 152)', field: 'oklch(0.72 0.15 152 / 0.10)' },
  unknown: {
    ring: 'color-mix(in oklab, var(--muted-foreground) 70%, transparent)',
    field: 'color-mix(in oklab, var(--muted) 55%, transparent)',
  },
}

function headline(plant: Plant, state: WaterState): string {
  const due = nextDueAt(plant)
  if (!due) return 'No watering schedule yet'
  const days = Math.round((new Date(due).getTime() - Date.now()) / DAY_MS)
  switch (state) {
    case 'overdue': {
      const n = Math.max(1, Math.abs(days))
      return `Thirsty — ${n} day${n === 1 ? '' : 's'} overdue`
    }
    case 'today':
      return 'Water today'
    case 'soon':
      return days === 1 ? 'Water tomorrow' : 'Water in a couple of days'
    default:
      return days <= 6
        ? `Happy for ${days} more day${days === 1 ? '' : 's'}`
        : 'Happy and hydrated'
  }
}

function lastWateredLabel(plant: Plant): string | null {
  const iso = plant.lastWateredAt
  if (!iso) return null
  const days = Math.round((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (days <= 0) return 'Watered today'
  if (days === 1) return 'Watered yesterday'
  if (days < 14) return `Watered ${days} days ago`
  return `Watered ${new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`
}

/**
 * The watering centerpiece — the maintenance heartbeat of the app. An
 * urgency-tinted card with a cycle ring, a plain-language status, and one big
 * satisfying Water button (a droplet bounces, a ripple blooms). When there's no
 * schedule yet, it invites you to set one or let AI suggest it.
 */
export function WaterStatus(props: {
  plant: Plant
  onWater: () => void
  onSetInterval: (days: number) => void
  onSnooze: (untilISO: string) => void
  onGenerateCare?: () => void
  generating?: boolean
}): JSX.Element {
  const {
    plant,
    onWater,
    onSetInterval,
    onSnooze,
    onGenerateCare,
    generating,
  } = props

  // Seasonal-aware: `currentInterval` is the cadence in effect right now
  // (stretched in winter dormancy); `activeInterval` is the editable warm-season
  // base the stepper tunes.
  const currentInterval = currentWaterIntervalDays(plant)
  const activeInterval =
    plant.waterIntervalDays ?? plant.care?.water?.intervalDays ?? null
  const onWinter = isOnWinterSchedule(plant)
  // A plant that's never been watered hasn't started its cycle — don't shame a
  // brand-new addition with "overdue". The first watering kicks things off.
  const neverWatered = !plant.lastWateredAt
  const state = neverWatered ? 'unknown' : dueState(plant)
  const due = nextDueAt(plant)
  const tone = TONE[state]

  // Cycle progress 0..1 (full + breathing when overdue).
  let progress = 0
  if (!neverWatered && currentInterval && due) {
    const span = currentInterval * DAY_MS
    const remaining = new Date(due).getTime() - Date.now()
    progress = Math.min(1, Math.max(0, 1 - remaining / span))
  }
  const R = 26
  const C = 2 * Math.PI * R

  // Splash + bounce key — bumps on each water tap to replay the animation.
  const [pulse, setPulse] = useState(0)

  const water = () => {
    setPulse((p) => p + 1)
    // First watering of an AI-suggested-but-unset cadence locks it in so the
    // rest of the app (gallery, Today) agrees on the schedule.
    if (!plant.waterIntervalDays && plant.care?.water?.intervalDays) {
      onSetInterval(plant.care.water.intervalDays)
    }
    onWater()
  }

  // ── No schedule: a friendly setup, not an empty void ──
  if (!currentInterval) {
    return (
      <NoSchedule
        onSetInterval={onSetInterval}
        onGenerateCare={onGenerateCare}
        generating={generating}
      />
    )
  }

  const last = lastWateredLabel(plant)
  const now = Date.now()
  // "Still moist" skip: only offered when the plant is actually due (so we never
  // nudge toward overwatering), and hidden once a skip is in effect.
  const snoozed =
    !!plant.snoozeUntil && new Date(plant.snoozeUntil).getTime() > now
  const isDue = state === 'overdue' || state === 'today'
  const skipDays = Math.max(2, Math.round(currentInterval / 3))
  const snoozeDaysLeft = plant.snoozeUntil
    ? Math.max(
        0,
        Math.round((new Date(plant.snoozeUntil).getTime() - now) / DAY_MS),
      )
    : 0
  const skip = () => onSnooze(new Date(now + skipDays * DAY_MS).toISOString())

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 ring-1 transition-colors"
      style={{
        background: `linear-gradient(180deg, ${tone.field}, transparent), var(--card)`,
        // @ts-expect-error -- tint the ring to the urgency colour
        '--tw-ring-color': `color-mix(in oklab, ${tone.ring} 32%, transparent)`,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Cycle ring + drop */}
        <div className="relative grid size-[68px] shrink-0 place-items-center">
          <svg viewBox="0 0 64 64" className="size-[68px] -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke="currentColor"
              className="text-border/60"
              strokeWidth="5"
            />
            <circle
              cx="32"
              cy="32"
              r={R}
              fill="none"
              stroke={tone.ring}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className={cn(
                'plant-ring-track',
                state === 'overdue' && 'plant-breathe',
              )}
            />
          </svg>
          {/* Ripple on water */}
          {pulse > 0 && (
            <span
              key={pulse}
              aria-hidden
              className="plant-splash pointer-events-none absolute inset-0 rounded-full"
              style={{ border: `2px solid ${tone.ring}` }}
            />
          )}
          <span
            key={`drop-${pulse}`}
            className={cn(
              'absolute grid place-items-center',
              pulse > 0 && 'plant-drop-bounce',
            )}
            style={{ color: tone.ring }}
          >
            <Droplet className="size-[26px] fill-current" />
          </span>
        </div>

        {/* Status copy */}
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[15px] font-semibold leading-tight">
            {neverWatered
              ? 'Ready when you are'
              : snoozed
                ? 'Still moist — checked recently'
                : headline(plant, state)}
          </p>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
            {neverWatered ? (
              <span>Tap to start the schedule</span>
            ) : snoozed ? (
              <span>
                {snoozeDaysLeft <= 0
                  ? 'Check again today'
                  : `Checking again in ${snoozeDaysLeft} ${snoozeDaysLeft === 1 ? 'day' : 'days'}`}
              </span>
            ) : last ? (
              <span>{last}</span>
            ) : null}
            {(neverWatered || snoozed || last) && <span aria-hidden>·</span>}
            {onWinter ? (
              <span className="inline-flex items-center gap-1">
                <Snowflake className="size-3.5 text-sky-400/80" />
                winter rhythm · every{' '}
                <span className="text-foreground plant-tnum font-medium">
                  {currentInterval}
                </span>{' '}
                days
              </span>
            ) : (
              <IntervalStepper
                days={activeInterval ?? currentInterval}
                onChange={onSetInterval}
              />
            )}
          </p>
        </div>
      </div>

      {/* The one big action */}
      <Button
        type="button"
        onClick={water}
        className={cn(
          'mt-3.5 h-11 w-full cursor-pointer gap-2 rounded-xl text-[15px] font-semibold transition-transform active:scale-[0.99]',
          state === 'ok'
            ? 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1] shadow-none'
            : '',
        )}
        variant={state === 'ok' ? 'ghost' : 'default'}
      >
        <Droplets className="size-[18px]" />
        {state === 'ok' ? 'Water early' : 'Water now'}
      </Button>

      {/* Honest escape hatch: overwatering is the #1 killer, so when it's "due"
          but the soil is still wet, let the user skip instead of forcing a log. */}
      {isDue && !snoozed && (
        <button
          type="button"
          onClick={skip}
          className="text-muted-foreground hover:text-foreground mx-auto mt-2.5 block cursor-pointer text-xs font-medium"
        >
          Soil still moist? Wait {skipDays} more{' '}
          {skipDays === 1 ? 'day' : 'days'}
        </button>
      )}

      <WaterLog plant={plant} />
    </div>
  )
}

/** A quiet log of the days you last watered — one chip per day, newest first.
 *  Hidden until there are at least two distinct days, so it never just echoes
 *  the headline's "watered yesterday". */
function WaterLog({ plant }: { plant: Plant }): JSX.Element | null {
  const seen = new Set<string>()
  const days: number[] = []
  for (const e of plant.waterHistory ?? []) {
    const t = e?.at ? new Date(e.at).getTime() : NaN
    if (Number.isNaN(t)) continue
    const dayKey = new Date(e.at).toISOString().slice(0, 10)
    if (seen.has(dayKey)) continue
    seen.add(dayKey)
    days.push(t)
  }
  days.sort((a, b) => b - a)
  if (days.length < 2) return null

  const now = Date.now()
  const label = (t: number) => {
    const d = Math.round((now - t) / DAY_MS)
    if (d <= 0) return 'Today'
    if (d === 1) return 'Yesterday'
    return new Date(t).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="border-border/40 mt-3.5 border-t pt-3">
      <div className="text-muted-foreground/70 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]">
        Recent waterings
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {days.slice(0, 5).map((t, i) => (
          <span
            key={i}
            className="bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5 text-[11px]"
          >
            {label(t)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Compact "every N days" with subtle steppers. Maintenance, made effortless. */
function IntervalStepper(props: {
  days: number
  onChange: (days: number) => void
}): JSX.Element {
  const { days, onChange } = props
  const clamp = (n: number) => Math.min(120, Math.max(1, n))
  return (
    <span className="inline-flex items-center gap-0.5">
      <span>every</span>
      <button
        type="button"
        aria-label="Fewer days between watering"
        onClick={() => onChange(clamp(days - 1))}
        className="text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-ring ml-0.5 grid size-4 cursor-pointer place-items-center rounded focus-visible:outline-none focus-visible:ring-2"
      >
        <Minus className="size-3" />
      </button>
      <span className="text-foreground plant-tnum font-medium">{days}</span>
      <button
        type="button"
        aria-label="More days between watering"
        onClick={() => onChange(clamp(days + 1))}
        className="text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-ring grid size-4 cursor-pointer place-items-center rounded focus-visible:outline-none focus-visible:ring-2"
      >
        <Plus className="size-3" />
      </button>
      <span>{days === 1 ? 'day' : 'days'}</span>
    </span>
  )
}

/** Setup state — invite a schedule, or let AI suggest one. */
function NoSchedule(props: {
  onSetInterval: (days: number) => void
  onGenerateCare?: () => void
  generating?: boolean
}): JSX.Element {
  const { onSetInterval, onGenerateCare, generating } = props
  const [days, setDays] = useState(7)
  const clamp = (n: number) => Math.min(120, Math.max(1, n))
  return (
    <div className="bg-card ring-border relative overflow-hidden rounded-2xl p-4 ring-1">
      <div className="flex items-center gap-3">
        <span className="bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-full">
          <Droplet className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[15px] font-semibold leading-tight">
            Set a watering rhythm
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            How often does this one like a drink?
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        <div className="bg-muted/60 flex h-11 flex-1 items-center justify-center gap-3 rounded-xl">
          <button
            type="button"
            aria-label="Fewer days"
            onClick={() => setDays((d) => clamp(d - 1))}
            className="text-muted-foreground hover:text-foreground grid size-7 cursor-pointer place-items-center rounded-full"
          >
            <Minus className="size-4" />
          </button>
          <span className="text-foreground plant-tnum min-w-[5.5rem] text-center text-sm font-medium">
            every {days} {days === 1 ? 'day' : 'days'}
          </span>
          <button
            type="button"
            aria-label="More days"
            onClick={() => setDays((d) => clamp(d + 1))}
            className="text-muted-foreground hover:text-foreground grid size-7 cursor-pointer place-items-center rounded-full"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          type="button"
          onClick={() => onSetInterval(days)}
          className="h-11 shrink-0 cursor-pointer rounded-xl px-5 font-semibold"
        >
          Start
        </Button>
      </div>

      {onGenerateCare && (
        <button
          type="button"
          onClick={onGenerateCare}
          disabled={generating}
          className="text-muted-foreground hover:text-foreground mx-auto mt-3 flex cursor-pointer items-center gap-1.5 text-xs font-medium disabled:opacity-60"
        >
          {generating ? (
            <Spinner className="size-3.5" />
          ) : (
            <Lightbulb className="size-3.5" />
          )}
          Suggest a schedule with AI
        </button>
      )}
    </div>
  )
}
