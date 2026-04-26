'use client'

import { CalendarDays, MoreHorizontal, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ScrollArea,
  Skeleton,
  cn,
} from '@moldable-ai/ui'
import { MeetingCard } from './meeting-card'
import type { Meeting } from '@/types'

export interface CalendarEvent {
  id?: string | null
  title?: string
  start?: string
  end?: string
  isAllDay?: boolean
  location?: string
}

interface CalendarEventDay {
  key: string
  date: Date
  events: CalendarEvent[]
}

export type CalendarEventsState =
  | { status: 'loading'; events: CalendarEvent[]; message?: undefined }
  | { status: 'ready'; events: CalendarEvent[]; message?: undefined }
  | {
      status: 'error'
      events: CalendarEvent[]
      message: string
      action?: 'grant-calendar-access'
    }

interface MeetingDayGroup {
  label: string
  sortTime: number
  meetings: Meeting[]
}

interface MeetingsListProps {
  meetings: Meeting[]
  calendarEvents: CalendarEventsState
  onStartEvent: (event: CalendarEvent) => void
  onGrantCalendarAccess: () => void
  onSelectMeeting: (meeting: Meeting) => void
  onDeleteMeeting: (meetingId: string) => void
}

const UPCOMING_EVENTS_LOADING_HEIGHT = 'h-[220px]'
const UPCOMING_EVENTS_SKELETON_ROWS = [0, 1, 2]

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDateGroup(date: Date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (getDateKey(date) === getDateKey(today)) return 'Today'
  if (getDateKey(date) === getDateKey(yesterday)) return 'Yesterday'

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const ageDays = Math.floor(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  )

  if (ageDays > 1 && ageDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' })
  }

  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

function groupMeetingsByDay(meetings: Meeting[]): MeetingDayGroup[] {
  const groups = new Map<string, Meeting[]>()

  for (const meeting of meetings) {
    const date = meeting.createdAt
    const key = getDateKey(date)
    const existing = groups.get(key) ?? []
    groups.set(key, [...existing, meeting])
  }

  return Array.from(groups.entries())
    .map(([, items]) => {
      const sortedItems = [...items].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )

      return {
        label: formatDateGroup(sortedItems[0]?.createdAt ?? new Date()),
        sortTime: sortedItems[0]?.createdAt.getTime() ?? 0,
        meetings: sortedItems,
      }
    })
    .sort((a, b) => b.sortTime - a.sortTime)
}

function eventStartDate(event: CalendarEvent) {
  if (!event.start) return null
  if (event.isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(event.start)) {
    const [year, month, day] = event.start.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const date = new Date(event.start)
  return Number.isNaN(date.getTime()) ? null : date
}

function calendarDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function upcomingCalendarRange() {
  const now = new Date()
  const end = new Date(now)
  end.setDate(now.getDate() + 7)
  end.setHours(23, 59, 59, 999)

  return {
    timeMin: now.toISOString(),
    timeMax: end.toISOString(),
  }
}

function groupCalendarEventsByDay(events: CalendarEvent[]): CalendarEventDay[] {
  const days = new Map<string, CalendarEventDay>()

  for (const event of events) {
    const start = eventStartDate(event)
    if (!start) continue

    const dayDate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    )
    const key = calendarDateKey(dayDate)
    const day = days.get(key) ?? { key, date: dayDate, events: [] }
    day.events.push(event)
    days.set(key, day)
  }

  return Array.from(days.values())
    .map((day) => ({
      ...day,
      events: day.events.sort((a, b) => {
        const aStart = eventStartDate(a)?.getTime() ?? 0
        const bStart = eventStartDate(b)?.getTime() ?? 0
        return aStart - bStart
      }),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

function buildUpcomingDays(events: CalendarEvent[]): CalendarEventDay[] {
  const today = new Date()
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )
  const groupedDays = groupCalendarEventsByDay(events)
  const days = new Map<string, CalendarEventDay>()

  days.set(calendarDateKey(todayDate), {
    key: calendarDateKey(todayDate),
    date: todayDate,
    events: [],
  })

  for (const day of groupedDays) {
    days.set(day.key, day)
  }

  return Array.from(days.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
}

function formatEventTime(event: CalendarEvent) {
  if (event.isAllDay) return 'All day'
  if (!event.start) return ''

  const start = new Date(event.start)
  const end = event.end ? new Date(event.end) : null
  const startText = start.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (!end) return startText

  return `${startText} - ${end.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function formatUpcomingDay(date: Date) {
  return {
    dayNumber: date.getDate(),
    month: date.toLocaleDateString([], { month: 'long' }),
    weekday: date.toLocaleDateString([], { weekday: 'short' }),
  }
}

function isToday(date: Date) {
  return calendarDateKey(date) === calendarDateKey(new Date())
}

export function MeetingsList({
  meetings,
  calendarEvents,
  onStartEvent,
  onGrantCalendarAccess,
  onSelectMeeting,
  onDeleteMeeting,
}: MeetingsListProps) {
  const groupedMeetings = useMemo(
    () => groupMeetingsByDay(meetings),
    [meetings],
  )

  return (
    <ScrollArea className="h-full px-5 pt-3">
      <div className="mx-auto w-full max-w-[44rem] space-y-8 pb-[calc(var(--chat-safe-padding,0px)+10rem)]">
        <UpcomingEvents
          state={calendarEvents}
          onStartEvent={onStartEvent}
          onGrantCalendarAccess={onGrantCalendarAccess}
        />
        {groupedMeetings.map((group) => (
          <section key={group.label}>
            <h2 className="text-muted-foreground mb-2 text-xs font-medium">
              {group.label}
            </h2>
            <div className="space-y-2">
              {group.meetings.map((meeting) => (
                <MeetingListRow
                  key={meeting.id}
                  meeting={meeting}
                  onSelect={() => onSelectMeeting(meeting)}
                  onDelete={() => onDeleteMeeting(meeting.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}

function UpcomingEvents({
  state,
  onStartEvent,
  onGrantCalendarAccess,
}: {
  state: CalendarEventsState
  onStartEvent: (event: CalendarEvent) => void
  onGrantCalendarAccess: () => void
}) {
  const today = new Date()
  const upcomingDays = buildUpcomingDays(state.events)
  const todayLabel = formatUpcomingDay(today)

  return (
    <section className="space-y-3">
      <h2 className="text-foreground pl-4 font-serif text-2xl tracking-normal">
        Coming up
      </h2>
      <div className="border-border/70 bg-muted/35 dark:bg-muted/25 overflow-hidden rounded-2xl border">
        {state.status === 'loading' ? (
          <UpcomingEventsSkeleton />
        ) : state.status === 'error' ? (
          <UpcomingStatusRow
            label={todayLabel}
            isToday
            icon={CalendarDays}
            message={state.message}
            action={state.action}
            onAction={onGrantCalendarAccess}
          />
        ) : (
          <div className="max-h-[220px] overflow-y-auto">
            {upcomingDays.map((day) => (
              <UpcomingDay
                key={day.key}
                day={day}
                onStartEvent={onStartEvent}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function UpcomingEventsSkeleton() {
  return (
    <div
      className={cn(UPCOMING_EVENTS_LOADING_HEIGHT, 'overflow-hidden')}
      aria-busy="true"
      aria-label="Loading upcoming events"
    >
      <span className="sr-only">Loading upcoming events</span>
      {UPCOMING_EVENTS_SKELETON_ROWS.map((row) => (
        <div
          key={row}
          className="meetings-dashed-separator grid h-[73.333px] grid-cols-[132px_1fr]"
        >
          <div className="flex items-start gap-2 px-5 py-4">
            <Skeleton className="bg-foreground/10 h-8 w-9 rounded-md" />
            <div className="space-y-1 pt-1">
              <Skeleton className="bg-foreground/10 h-3 w-12 rounded-sm" />
              <Skeleton className="bg-foreground/10 h-3 w-9 rounded-sm" />
            </div>
          </div>
          <div className="flex items-center gap-6 px-7 py-4">
            <Skeleton className="bg-primary/30 h-8 w-[3px] rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="bg-foreground/10 h-4 w-2/5 rounded-sm" />
              <Skeleton className="bg-foreground/10 h-3 w-1/4 rounded-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function UpcomingStatusRow({
  label,
  isToday: today,
  icon: Icon,
  message,
  action,
  onAction,
}: {
  label: ReturnType<typeof formatUpcomingDay>
  isToday?: boolean
  icon?: typeof CalendarDays
  message: string
  action?: 'grant-calendar-access'
  onAction?: () => void
}) {
  return (
    <div className="grid grid-cols-[132px_1fr]">
      <UpcomingDateCell label={label} isToday={Boolean(today)} />
      <div className="text-muted-foreground flex items-center gap-5 px-7 py-4 text-xs">
        <span className="bg-muted-foreground/40 h-6 w-[3px] rounded-full" />
        {Icon ? <Icon className="size-3.5" /> : null}
        <span className="min-w-0 flex-1">{message}</span>
        {action === 'grant-calendar-access' && onAction ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onAction}
            className="h-7 shrink-0 cursor-pointer px-2 text-xs"
          >
            Grant access
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function UpcomingDay({
  day,
  onStartEvent,
}: {
  day: CalendarEventDay
  onStartEvent: (event: CalendarEvent) => void
}) {
  const label = formatUpcomingDay(day.date)
  const today = isToday(day.date)

  return (
    <div className="meetings-dashed-separator grid grid-cols-[132px_1fr]">
      <UpcomingDateCell label={label} isToday={today} />
      <div className="py-2 pr-4">
        {day.events.length === 0 ? (
          <div className="text-muted-foreground flex min-h-11 items-center gap-6 pl-3 text-xs">
            <span className="bg-muted-foreground/40 h-7 w-[3px] rounded-full" />
            <span>{today ? 'No events today' : 'No events'}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {day.events.map((event, index) => (
              <button
                key={`${event.id ?? day.key}-${event.start ?? index}`}
                type="button"
                onClick={() => onStartEvent(event)}
                className="hover:bg-background/90 dark:hover:bg-background/25 group grid w-full cursor-pointer grid-cols-[3px_1fr_auto] items-center gap-6 rounded-xl px-3 py-2.5 text-left transition-colors"
              >
                <span className="bg-primary/45 group-hover:bg-primary/75 h-8 w-[3px] rounded-full transition-colors" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">
                    {event.title || 'Untitled event'}
                  </span>
                  <span className="text-muted-foreground/65 mt-0.5 block truncate text-xs">
                    {formatEventTime(event)}
                    {event.location ? ` - ${event.location}` : null}
                  </span>
                </span>
                <span className="text-muted-foreground pr-2 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-70">
                  Start meeting
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function UpcomingDateCell({
  label,
  isToday: today,
  className,
}: {
  label: ReturnType<typeof formatUpcomingDay>
  isToday?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-2 px-5 py-4', className)}>
      <span className="font-serif text-[1.7rem] leading-none">
        {label.dayNumber}
      </span>
      <div className="pt-0.5 text-[13px] leading-tight">
        <div className="flex items-center gap-1.5">
          <span>{label.month}</span>
          {today ? <span className="bg-primary size-1.5 rounded-full" /> : null}
        </div>
        <div className="text-muted-foreground">{label.weekday}</div>
      </div>
    </div>
  )
}

function MeetingListRow({
  meeting,
  onSelect,
  onDelete,
}: {
  meeting: Meeting
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div className="group relative">
      <MeetingCard meeting={meeting} onClick={onSelect} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'absolute right-3 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100',
              'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={(event) => event.stopPropagation()}
            aria-label={`More actions for ${meeting.title || 'Untitled meeting'}`}
            title="More actions"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={(event) => {
              event.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Move to trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
