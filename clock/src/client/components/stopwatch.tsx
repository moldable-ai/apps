import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, Pause, Play, RotateCcw } from 'lucide-react'
import { Button, useWorkspace } from '@moldable-ai/ui'
import { type Fetcher, getJson, sendJson } from '../lib/api'
import { formatStopwatch } from '@/lib/format'
import type { StopwatchState } from '@/lib/types'
import { DEFAULT_STOPWATCH } from '@/lib/types'
import { useNow } from '../hooks/use-now'

export function StopwatchPane() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const fetcher = fetchWithWorkspace as Fetcher
  const queryClient = useQueryClient()
  const now = useNow(50)

  const { data } = useQuery({
    queryKey: ['stopwatch', workspaceId],
    queryFn: () =>
      getJson<{ stopwatch: StopwatchState }>(fetcher, '/api/stopwatch'),
  })

  const state = data?.stopwatch ?? DEFAULT_STOPWATCH

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['stopwatch', workspaceId] })

  const act = useMutation({
    mutationFn: (verb: 'start' | 'stop' | 'lap' | 'reset') =>
      sendJson(fetcher, `/api/stopwatch/${verb}`, 'POST'),
    onSuccess: invalidate,
  })

  const elapsed =
    state.running && state.startedAt
      ? state.accumulatedMs + Math.max(0, now - Date.parse(state.startedAt))
      : state.accumulatedMs

  const laps = state.laps
  const lastLapMark = laps.length > 0 ? laps[laps.length - 1]! : 0
  const currentLap = elapsed - lastLapMark
  const hasActivity = elapsed > 0 || laps.length > 0

  // Lap splits, plus fastest/slowest markers across completed laps.
  const splits = laps.map((mark, index) => mark - (laps[index - 1] ?? 0))
  const minSplit = splits.length > 1 ? Math.min(...splits) : -1
  const maxSplit = splits.length > 1 ? Math.max(...splits) : -1

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="clock-fade-in flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-12">
        <div
          className="text-[clamp(3.5rem,12vw,6rem)] font-semibold tabular-nums leading-none tracking-tight"
          aria-live="off"
        >
          {formatStopwatch(elapsed)}
        </div>

        <div className="mt-10 flex items-center gap-5">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="size-16 cursor-pointer rounded-full"
            aria-label={state.running ? 'Lap' : 'Reset'}
            disabled={!state.running && !hasActivity}
            onClick={() => act.mutate(state.running ? 'lap' : 'reset')}
          >
            {state.running ? (
              <Flag className="size-5" />
            ) : (
              <RotateCcw className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            className="size-16 cursor-pointer rounded-full shadow-sm"
            aria-label={state.running ? 'Stop' : 'Start'}
            onClick={() => act.mutate(state.running ? 'stop' : 'start')}
          >
            {state.running ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6 translate-x-px" />
            )}
          </Button>
        </div>

        {(laps.length > 0 || state.running) && (
          <div className="mt-10 w-full max-w-[26rem]">
            <div className="border-border bg-card divide-border/70 divide-y overflow-hidden rounded-2xl border">
              {state.running && (
                <LapRow
                  index={laps.length + 1}
                  split={currentLap}
                  highlight="current"
                />
              )}
              {[...laps]
                .map((_mark, index) => ({
                  index: index + 1,
                  split: splits[index]!,
                }))
                .reverse()
                .map((lap) => (
                  <LapRow
                    key={lap.index}
                    index={lap.index}
                    split={lap.split}
                    highlight={
                      lap.split === minSplit
                        ? 'fast'
                        : lap.split === maxSplit
                          ? 'slow'
                          : 'none'
                    }
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LapRow({
  index,
  split,
  highlight,
}: {
  index: number
  split: number
  highlight: 'fast' | 'slow' | 'current' | 'none'
}) {
  const splitColor =
    highlight === 'fast'
      ? 'text-primary'
      : highlight === 'slow' || highlight === 'current'
        ? 'text-muted-foreground'
        : 'text-foreground'
  const tag =
    highlight === 'fast' ? 'Fastest' : highlight === 'slow' ? 'Slowest' : ''
  return (
    <div className="flex items-center px-4 py-2.5 text-sm tabular-nums">
      <span className="text-muted-foreground w-14">Lap {index}</span>
      {tag ? (
        <span className="text-muted-foreground/70 flex-1 text-xs">{tag}</span>
      ) : (
        <span className="flex-1" />
      )}
      <span className={`${splitColor} text-right font-medium`}>
        {formatStopwatch(split)}
      </span>
    </div>
  )
}
