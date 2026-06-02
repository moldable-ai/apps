import { AlarmClock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  useMoldableCommands,
} from '@moldable-ai/ui'
import { useAlarmWatch } from './hooks/use-alarm-watch'
import { useNow } from './hooks/use-now'
import { useTimerWatch } from './hooks/use-timer-watch'
import { AlarmsPane } from './components/alarms'
import { StopwatchPane } from './components/stopwatch'
import { TimersPane } from './components/timers'
import { WorldClockPane } from './components/world-clock'

type Tab = 'clock' | 'alarms' | 'timers' | 'stopwatch'

const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

function LocalTime() {
  const now = useNow(1000)
  const date = useMemo(() => new Date(now), [now])
  const time = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold tabular-nums">{time}</span>
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {date.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </span>
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('clock')
  const [addCity, setAddCity] = useState(0)
  const [addAlarm, setAddAlarm] = useState(0)
  const [addTimer, setAddTimer] = useState(0)
  const { ringing, dismiss } = useAlarmWatch()
  useTimerWatch()

  useEffect(() => {
    window.parent.postMessage(
      {
        type: 'moldable:set-chat-instructions',
        text: `User is in the Clock app on the ${tab} tab. To read or change alarms, timers, or world clocks, prefer the Clock app RPC methods (timers.*, alarms.*, worldclocks.*) over guessing.`,
      },
      '*',
    )
  }, [tab])

  useMoldableCommands({
    'clock:world': () => setTab('clock'),
    'clock:alarms': () => setTab('alarms'),
    'clock:timers': () => setTab('timers'),
    'clock:stopwatch': () => setTab('stopwatch'),
    'clock:add-city': () => {
      setTab('clock')
      setAddCity((n) => n + 1)
    },
    'clock:add-alarm': () => {
      setTab('alarms')
      setAddAlarm((n) => n + 1)
    },
    'clock:add-timer': () => {
      setTab('timers')
      setAddTimer((n) => n + 1)
    },
  })

  return (
    <main className="bg-background text-foreground flex h-full min-h-0 flex-col overflow-hidden">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <header className="border-border/70 grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-3">
          <div className="text-muted-foreground hidden min-w-0 sm:block">
            <span className="truncate text-xs">
              {LOCAL_ZONE.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="col-start-2 flex justify-center">
            <TabsList>
              <TabsTrigger value="clock">World Clock</TabsTrigger>
              <TabsTrigger value="alarms">Alarms</TabsTrigger>
              <TabsTrigger value="timers">Timers</TabsTrigger>
              <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
            </TabsList>
          </div>
          <div className="col-start-3 flex justify-end">
            <LocalTime />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'clock' && <WorldClockPane openAddSignal={addCity} />}
          {tab === 'alarms' && <AlarmsPane openAddSignal={addAlarm} />}
          {tab === 'timers' && <TimersPane openAddSignal={addTimer} />}
          {tab === 'stopwatch' && <StopwatchPane />}
        </div>
      </Tabs>

      {ringing.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4"
          role="alert"
        >
          {ringing.map((alarm) => (
            <div
              key={alarm.id}
              className="bg-card pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border px-4 py-2.5 shadow-xl"
            >
              <AlarmClock className="text-primary clock-ring size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {alarm.label || 'Alarm'}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {alarm.time}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 cursor-pointer rounded-full"
                onClick={() => dismiss(alarm.id)}
              >
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
