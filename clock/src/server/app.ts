import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { formatRelative, zoneDeltaLabel, zoneOffsetLabel } from '@/lib/format'
import { zoneToLabel } from '@/lib/timezones'
import {
  type Alarm,
  DEFAULT_STOPWATCH,
  type StopwatchState,
  type Timer,
  type TimerView,
  type Weekday,
  type WorldClock,
} from '@/lib/types'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function alarmsPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'alarms.json')
}

function timersPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'timers.json')
}

function stopwatchPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'stopwatch.json')
}

function worldClocksPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'world-clocks.json')
}

function readAlarms(workspaceId?: string) {
  return readJson<Alarm[]>(alarmsPath(workspaceId), [])
}

function writeAlarms(alarms: Alarm[], workspaceId?: string) {
  return writeJson(alarmsPath(workspaceId), alarms)
}

function readTimers(workspaceId?: string) {
  return readJson<Timer[]>(timersPath(workspaceId), [])
}

function writeTimers(timers: Timer[], workspaceId?: string) {
  return writeJson(timersPath(workspaceId), timers)
}

async function readStopwatch(workspaceId?: string) {
  const state = await readJson<StopwatchState>(
    stopwatchPath(workspaceId),
    DEFAULT_STOPWATCH,
  )
  return { ...DEFAULT_STOPWATCH, ...state }
}

function writeStopwatch(state: StopwatchState, workspaceId?: string) {
  return writeJson(stopwatchPath(workspaceId), state)
}

function readWorldClocks(workspaceId?: string) {
  return readJson<WorldClock[]>(worldClocksPath(workspaceId), [])
}

function writeWorldClocks(clocks: WorldClock[], workspaceId?: string) {
  return writeJson(worldClocksPath(workspaceId), clocks)
}

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

function viewTimer(timer: Timer, now: number): TimerView {
  if (timer.running && timer.endsAt) {
    const remaining = Date.parse(timer.endsAt) - now
    if (remaining <= 0) {
      return { ...timer, state: 'finished', currentRemainingMs: 0 }
    }
    return { ...timer, state: 'running', currentRemainingMs: remaining }
  }
  if (timer.remainingMs <= 0) {
    return { ...timer, state: 'finished', currentRemainingMs: 0 }
  }
  if (timer.remainingMs >= timer.durationMs) {
    return { ...timer, state: 'idle', currentRemainingMs: timer.durationMs }
  }
  return { ...timer, state: 'paused', currentRemainingMs: timer.remainingMs }
}

function remainingNow(timer: Timer, now: number): number {
  if (timer.running && timer.endsAt) {
    return Math.max(0, Date.parse(timer.endsAt) - now)
  }
  return Math.max(0, timer.remainingMs)
}

function startTimer(timer: Timer, now: number): Timer {
  let remaining = remainingNow(timer, now)
  if (remaining <= 0) remaining = timer.durationMs
  return {
    ...timer,
    running: true,
    endsAt: new Date(now + remaining).toISOString(),
    remainingMs: remaining,
  }
}

function pauseTimer(timer: Timer, now: number): Timer {
  const remaining = remainingNow(timer, now)
  return { ...timer, running: false, endsAt: null, remainingMs: remaining }
}

function resetTimer(timer: Timer): Timer {
  return {
    ...timer,
    running: false,
    endsAt: null,
    remainingMs: timer.durationMs,
  }
}

function elapsedStopwatch(state: StopwatchState, now: number): number {
  return state.running && state.startedAt
    ? state.accumulatedMs + Math.max(0, now - Date.parse(state.startedAt))
    : state.accumulatedMs
}

function normalizeTime(time: unknown): string | null {
  if (typeof time !== 'string') return null
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function normalizeRepeat(repeat: unknown): Weekday[] {
  if (!Array.isArray(repeat)) return []
  const days = new Set<Weekday>()
  for (const value of repeat) {
    if (typeof value === 'number' && value >= 0 && value <= 6) {
      days.add(value as Weekday)
    }
  }
  return [...days].sort((a, b) => a - b)
}

/** Next time an alarm will fire, scanning the coming week. */
function nextAlarmFire(alarm: Alarm, from: Date): Date | null {
  const [hours, minutes] = alarm.time.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(from)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setHours(hours, minutes, 0, 0)
    if (candidate.getTime() <= from.getTime()) continue
    if (alarm.repeat.length === 0) return candidate
    if (alarm.repeat.includes(candidate.getDay() as Weekday)) return candidate
  }
  return null
}

function nextAlarm(alarms: Alarm[], now: Date) {
  let best: { alarm: Alarm; fireAt: Date } | null = null
  for (const alarm of alarms) {
    if (!alarm.enabled) continue
    const fireAt = nextAlarmFire(alarm, now)
    if (!fireAt) continue
    if (!best || fireAt.getTime() < best.fireAt.getTime()) {
      best = { alarm, fireAt }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'clock',
      port: portRaw ? Number(portRaw) : null,
      status: 'ok',
      ts: Date.now(),
    },
    200,
    { 'Cache-Control': 'no-store' },
  )
})

// ---------------------------------------------------------------------------
// Cmd+K commands
// ---------------------------------------------------------------------------

app.get('/api/moldable/commands', (c) => {
  return c.json({
    commands: [
      {
        id: 'clock:add-alarm',
        label: 'New alarm',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:add-timer',
        label: 'New timer',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:add-city',
        label: 'Add city to world clock',
        icon: 'plus',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:stopwatch',
        label: 'Open stopwatch',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:world',
        label: 'Open world clock',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:alarms',
        label: 'Open alarms',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
      {
        id: 'clock:timers',
        label: 'Open timers',
        group: 'Clock',
        action: { type: 'message', payload: {} },
      },
    ],
  })
})

// ---------------------------------------------------------------------------
// Alarms HTTP API
// ---------------------------------------------------------------------------

app.get('/api/alarms', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  return c.json({ alarms: await readAlarms(workspaceId) })
})

app.post('/api/alarms', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const time = normalizeTime(body.time)
  if (!time) return c.json({ error: 'A valid HH:mm time is required.' }, 400)

  const alarm: Alarm = {
    id: crypto.randomUUID(),
    label: typeof body.label === 'string' ? body.label : '',
    time,
    enabled: body.enabled !== false,
    repeat: normalizeRepeat(body.repeat),
    createdAt: new Date().toISOString(),
  }
  const alarms = await readAlarms(workspaceId)
  await writeAlarms([...alarms, alarm], workspaceId)
  return c.json({ alarm })
})

app.patch('/api/alarms/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const alarms = await readAlarms(workspaceId)
  const index = alarms.findIndex((a) => a.id === id)
  if (index === -1) return c.json({ error: 'Alarm not found.' }, 404)

  const current = alarms[index]!
  const time = body.time === undefined ? current.time : normalizeTime(body.time)
  if (!time) return c.json({ error: 'A valid HH:mm time is required.' }, 400)

  alarms[index] = {
    ...current,
    time,
    label: typeof body.label === 'string' ? body.label : current.label,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
    repeat:
      body.repeat === undefined ? current.repeat : normalizeRepeat(body.repeat),
  }
  await writeAlarms(alarms, workspaceId)
  return c.json({ alarm: alarms[index] })
})

app.delete('/api/alarms/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const alarms = await readAlarms(workspaceId)
  const filtered = alarms.filter((a) => a.id !== id)
  if (filtered.length === alarms.length) {
    return c.json({ error: 'Alarm not found.' }, 404)
  }
  await writeAlarms(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Timers HTTP API
// ---------------------------------------------------------------------------

app.get('/api/timers', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const now = Date.now()
  const timers = await readTimers(workspaceId)
  return c.json({
    timers: timers.map((t) => viewTimer(t, now)),
    serverNow: new Date(now).toISOString(),
  })
})

app.post('/api/timers', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const durationMs = Number(body.durationMs)
  if (!Number.isFinite(durationMs) || durationMs < 1000) {
    return c.json({ error: 'durationMs must be at least 1000.' }, 400)
  }

  const now = Date.now()
  const base: Timer = {
    id: crypto.randomUUID(),
    label: typeof body.label === 'string' ? body.label : '',
    durationMs: Math.round(durationMs),
    endsAt: null,
    remainingMs: Math.round(durationMs),
    running: false,
    createdAt: new Date(now).toISOString(),
  }
  const timer = body.start ? startTimer(base, now) : base
  const timers = await readTimers(workspaceId)
  await writeTimers([...timers, timer], workspaceId)
  return c.json({ timer: viewTimer(timer, now) })
})

async function mutateTimer(
  workspaceId: string | undefined,
  id: string,
  mutate: (timer: Timer, now: number) => Timer,
): Promise<TimerView | null> {
  const now = Date.now()
  const timers = await readTimers(workspaceId)
  const index = timers.findIndex((t) => t.id === id)
  if (index === -1) return null
  timers[index] = mutate(timers[index]!, now)
  await writeTimers(timers, workspaceId)
  return viewTimer(timers[index]!, now)
}

app.post('/api/timers/:id/:action', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const action = c.req.param('action')
  const mutator =
    action === 'start'
      ? startTimer
      : action === 'pause'
        ? pauseTimer
        : action === 'reset'
          ? (timer: Timer) => resetTimer(timer)
          : null
  if (!mutator) return c.json({ error: `Unknown action ${action}.` }, 400)

  const timer = await mutateTimer(workspaceId, id, mutator)
  if (!timer) return c.json({ error: 'Timer not found.' }, 404)
  return c.json({ timer })
})

app.delete('/api/timers/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const timers = await readTimers(workspaceId)
  const filtered = timers.filter((t) => t.id !== id)
  if (filtered.length === timers.length) {
    return c.json({ error: 'Timer not found.' }, 404)
  }
  await writeTimers(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Stopwatch HTTP API
// ---------------------------------------------------------------------------

app.get('/api/stopwatch', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  return c.json({
    stopwatch: await readStopwatch(workspaceId),
    serverNow: new Date().toISOString(),
  })
})

app.post('/api/stopwatch/:action', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const action = c.req.param('action')
  const now = Date.now()
  const state = await readStopwatch(workspaceId)

  let next: StopwatchState = state
  if (action === 'start') {
    next = state.running
      ? state
      : { ...state, running: true, startedAt: new Date(now).toISOString() }
  } else if (action === 'stop') {
    next = state.running
      ? {
          ...state,
          running: false,
          startedAt: null,
          accumulatedMs: elapsedStopwatch(state, now),
        }
      : state
  } else if (action === 'lap') {
    next = { ...state, laps: [...state.laps, elapsedStopwatch(state, now)] }
  } else if (action === 'reset') {
    next = { ...DEFAULT_STOPWATCH }
  } else {
    return c.json({ error: `Unknown action ${action}.` }, 400)
  }

  await writeStopwatch(next, workspaceId)
  return c.json({ stopwatch: next, serverNow: new Date(now).toISOString() })
})

// ---------------------------------------------------------------------------
// World clocks HTTP API
// ---------------------------------------------------------------------------

app.get('/api/worldclocks', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  return c.json({ worldClocks: await readWorldClocks(workspaceId) })
})

app.post('/api/worldclocks', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const body = await c.req.json().catch(() => ({}))
  const timeZone = typeof body.timeZone === 'string' ? body.timeZone : ''
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
  } catch {
    return c.json({ error: 'Unknown time zone.' }, 400)
  }

  const clock: WorldClock = {
    id: crypto.randomUUID(),
    label:
      typeof body.label === 'string' && body.label.trim()
        ? body.label.trim()
        : zoneToLabel(timeZone),
    timeZone,
    createdAt: new Date().toISOString(),
  }
  const clocks = await readWorldClocks(workspaceId)
  if (clocks.some((existing) => existing.timeZone === timeZone)) {
    return c.json({ worldClock: clocks.find((x) => x.timeZone === timeZone) })
  }
  await writeWorldClocks([...clocks, clock], workspaceId)
  return c.json({ worldClock: clock })
})

app.delete('/api/worldclocks/:id', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const id = c.req.param('id')
  const clocks = await readWorldClocks(workspaceId)
  const filtered = clocks.filter((x) => x.id !== id)
  if (filtered.length === clocks.length) {
    return c.json({ error: 'World clock not found.' }, 404)
  }
  await writeWorldClocks(filtered, workspaceId)
  return c.json({ ok: true })
})

// ---------------------------------------------------------------------------
// Today contribution
// ---------------------------------------------------------------------------

app.get('/api/moldable/today', async (c) => {
  const workspaceId =
    c.req.header('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(c.req.raw) ??
    'personal'

  const now = Date.now()
  const [timers, alarms, stopwatch] = await Promise.all([
    readTimers(workspaceId),
    readAlarms(workspaceId),
    readStopwatch(workspaceId),
  ])

  const views = timers.map((t) => viewTimer(t, now))
  const items: unknown[] = []
  let resume: unknown = null

  const finished = views.filter((t) => t.state === 'finished')
  const running = views
    .filter((t) => t.state === 'running')
    .sort((a, b) => a.currentRemainingMs - b.currentRemainingMs)

  if (finished.length > 0) {
    // A finished timer is the one clock event that always earns attention.
    const first = finished[0]!
    const more = finished.length - 1
    const name = first.label || 'Timer'
    items.push({
      id: 'timer:finished',
      kind: 'timely',
      surface: 'nudge',
      title:
        finished.length > 1
          ? `${finished.length} timers finished`
          : `${name} finished`,
      subtitle: more > 0 ? 'Dismiss to clear them' : 'Time is up',
      icon: '⏰',
      priority: 97,
      dismissible: false,
      actions:
        finished.length === 1
          ? [
              {
                type: 'rpc',
                label: 'Dismiss',
                method: 'timers.reset',
                params: { id: first.id },
              },
              { type: 'open-app', label: 'Open' },
            ]
          : [{ type: 'open-app', label: 'Open' }],
    })
  } else if (running.length > 0) {
    // The soonest-ending running timer, shown as a live, non-dismissible card.
    const soonest = running[0]!
    const name = soonest.label || 'Timer'
    items.push({
      id: 'timer:running',
      kind: 'active',
      surface: 'text',
      title: `${name} · ${formatRelative(soonest.currentRemainingMs)} left`,
      subtitle:
        running.length > 1 ? `${running.length} timers running` : undefined,
      icon: '⏳',
      priority: 88,
      dismissible: false,
      actions: [
        {
          type: 'rpc',
          label: 'Pause',
          method: 'timers.pause',
          params: { id: soonest.id },
        },
        { type: 'open-app', label: 'Open' },
      ],
    })
  }

  // An imminent alarm (within 5 minutes) is worth a quiet heads-up.
  if (finished.length === 0) {
    const next = nextAlarm(alarms, new Date(now))
    if (next) {
      const inMs = next.fireAt.getTime() - now
      if (inMs > 0 && inMs <= 5 * 60_000) {
        items.push({
          id: 'alarm:imminent',
          kind: 'timely',
          surface: 'nudge',
          title: `${next.alarm.label || 'Alarm'} in ${formatRelative(inMs)}`,
          subtitle: next.alarm.time,
          icon: '⏰',
          priority: 84,
          actions: [{ type: 'open-app', label: 'Open' }],
        })
      }
    }
  }

  // A running stopwatch is genuine in-progress work to pick back up.
  if (stopwatch.running && stopwatch.startedAt) {
    resume = {
      title: 'Stopwatch running',
      subtitle: `Started ${formatRelative(now - Date.parse(stopwatch.startedAt))} ago`,
      icon: '⏱️',
      lastTouchedAt: stopwatch.startedAt,
    }
  }

  return c.json({ items, resume, generatedAt: new Date(now).toISOString() })
})

// ---------------------------------------------------------------------------
// App-to-app RPC
// ---------------------------------------------------------------------------

type RpcParams = Record<string, unknown>

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function rpcOk(result: unknown) {
  return { ok: true as const, result }
}

function rpcErr(code: string, message: string) {
  return { ok: false as const, error: { code, message } }
}

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId =
    c.req.header('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(c.req.raw) ??
    'personal'

  try {
    const body = (await c.req.json()) as { method?: unknown; params?: unknown }
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)
    const now = Date.now()

    // -- Timers ------------------------------------------------------------
    if (method === 'timers.list') {
      const stateFilter = stringParam(params, 'state')
      const views = (await readTimers(workspaceId)).map((t) =>
        viewTimer(t, now),
      )
      return c.json(
        rpcOk(
          stateFilter ? views.filter((t) => t.state === stateFilter) : views,
        ),
      )
    }

    if (method === 'timers.create') {
      const durationMs = Number(params.durationMs)
      if (!Number.isFinite(durationMs) || durationMs < 1000) {
        return c.json(
          rpcErr('invalid_params', 'durationMs must be at least 1000.'),
          400,
        )
      }
      const base: Timer = {
        id: crypto.randomUUID(),
        label: stringParam(params, 'label') ?? '',
        durationMs: Math.round(durationMs),
        endsAt: null,
        remainingMs: Math.round(durationMs),
        running: false,
        createdAt: new Date(now).toISOString(),
      }
      const timer = params.start === true ? startTimer(base, now) : base
      const timers = await readTimers(workspaceId)
      await writeTimers([...timers, timer], workspaceId)
      return c.json(rpcOk(viewTimer(timer, now)))
    }

    if (
      method === 'timers.start' ||
      method === 'timers.pause' ||
      method === 'timers.reset'
    ) {
      const id = stringParam(params, 'id')
      if (!id) return c.json(rpcErr('invalid_params', 'id is required.'), 400)
      const mutator =
        method === 'timers.start'
          ? startTimer
          : method === 'timers.pause'
            ? pauseTimer
            : (timer: Timer) => resetTimer(timer)
      const timer = await mutateTimer(workspaceId, id, mutator)
      if (!timer)
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      return c.json(rpcOk(timer))
    }

    if (method === 'timers.delete') {
      const id = stringParam(params, 'id')
      const timers = await readTimers(workspaceId)
      const filtered = timers.filter((t) => t.id !== id)
      if (!id || filtered.length === timers.length) {
        return c.json(rpcErr('timer_not_found', 'Timer was not found.'), 404)
      }
      await writeTimers(filtered, workspaceId)
      return c.json(rpcOk({ deleted: true, id }))
    }

    // -- Alarms ------------------------------------------------------------
    if (method === 'alarms.list') {
      const alarms = await readAlarms(workspaceId)
      const enabledOnly = params.enabledOnly === true
      return c.json(
        rpcOk(enabledOnly ? alarms.filter((a) => a.enabled) : alarms),
      )
    }

    if (method === 'alarms.next') {
      const alarms = await readAlarms(workspaceId)
      const next = nextAlarm(alarms, new Date(now))
      if (!next) return c.json(rpcOk(null))
      return c.json(
        rpcOk({
          alarm: next.alarm,
          fireAt: next.fireAt.toISOString(),
          inMs: next.fireAt.getTime() - now,
        }),
      )
    }

    if (method === 'alarms.create') {
      const time = normalizeTime(params.time)
      if (!time)
        return c.json(
          rpcErr('invalid_params', 'A valid HH:mm time is required.'),
          400,
        )
      const alarm: Alarm = {
        id: crypto.randomUUID(),
        label: stringParam(params, 'label') ?? '',
        time,
        enabled: params.enabled !== false,
        repeat: normalizeRepeat(params.repeat),
        createdAt: new Date(now).toISOString(),
      }
      const alarms = await readAlarms(workspaceId)
      await writeAlarms([...alarms, alarm], workspaceId)
      return c.json(rpcOk(alarm))
    }

    if (method === 'alarms.update') {
      const id = stringParam(params, 'id')
      const alarms = await readAlarms(workspaceId)
      const index = alarms.findIndex((a) => a.id === id)
      if (index === -1)
        return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
      const current = alarms[index]!
      const time =
        params.time === undefined ? current.time : normalizeTime(params.time)
      if (!time)
        return c.json(
          rpcErr('invalid_params', 'A valid HH:mm time is required.'),
          400,
        )
      alarms[index] = {
        ...current,
        time,
        label: stringParam(params, 'label') ?? current.label,
        enabled:
          typeof params.enabled === 'boolean'
            ? params.enabled
            : current.enabled,
        repeat:
          params.repeat === undefined
            ? current.repeat
            : normalizeRepeat(params.repeat),
      }
      await writeAlarms(alarms, workspaceId)
      return c.json(rpcOk(alarms[index]))
    }

    if (method === 'alarms.delete') {
      const id = stringParam(params, 'id')
      const alarms = await readAlarms(workspaceId)
      const filtered = alarms.filter((a) => a.id !== id)
      if (!id || filtered.length === alarms.length) {
        return c.json(rpcErr('alarm_not_found', 'Alarm was not found.'), 404)
      }
      await writeAlarms(filtered, workspaceId)
      return c.json(rpcOk({ deleted: true, id }))
    }

    // -- World clocks ------------------------------------------------------
    if (method === 'worldclocks.list') {
      const clocks = await readWorldClocks(workspaceId)
      const at = new Date(now)
      return c.json(
        rpcOk(
          clocks.map((clock) => ({
            id: clock.id,
            label: clock.label,
            timeZone: clock.timeZone,
            localTime: at.toLocaleString('en-US', {
              timeZone: clock.timeZone,
              hour: 'numeric',
              minute: '2-digit',
              weekday: 'short',
            }),
            offset: zoneOffsetLabel(clock.timeZone, at),
            delta: zoneDeltaLabel(clock.timeZone, at),
          })),
        ),
      )
    }

    return c.json(
      rpcErr('method_not_found', `Clock does not expose ${method}.`),
      404,
    )
  } catch (error) {
    console.error('Clock RPC failed:', error)
    return c.json(
      rpcErr(
        'clock_rpc_failed',
        error instanceof Error
          ? error.message
          : 'Clock could not complete the request.',
      ),
      500,
    )
  }
})
