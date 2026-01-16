'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  useWorkspace,
} from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay?: boolean
  location?: string
  link?: string
  colorId?: string
  isPastEvent?: boolean
}

// Google Calendar colorId mapping (standard colors)
const GOOGLE_COLORS: Record<string, string> = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#fbc02d', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
}

export default function FullPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const queryClient = useQueryClient()
  const touchStartRef = useRef<number | null>(null)

  const visibleRange = useMemo(() => {
    return {
      start: startOfWeek(startOfMonth(currentMonth)),
      end: endOfWeek(endOfMonth(currentMonth)),
    }
  }, [currentMonth])

  const {
    data: eventsData,
    isLoading: queryLoading,
    error: _queryError,
    refetch,
  } = useQuery({
    queryKey: [
      'events',
      workspaceId,
      visibleRange.start.toISOString(),
      visibleRange.end.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeMin: visibleRange.start.toISOString(),
        timeMax: visibleRange.end.toISOString(),
      })
      const res = await fetchWithWorkspace(`/api/events?${params.toString()}`)
      if (res.status === 401) {
        setAuthenticated(false)
        throw new Error('Unauthorized')
      }
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setAuthenticated(true)
      return data.events as CalendarEvent[]
    },
    retry: false,
  })

  const events = useMemo(() => eventsData || [], [eventsData])
  const loading = queryLoading && !eventsData

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        refetch()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [refetch])

  const handleConnect = async () => {
    setConnectLoading(true)
    setError(null)

    try {
      const response = await fetchWithWorkspace('/api/auth/login')
      const data = await response.json()

      if (data.error) {
        setError(data.details || data.error)
        return
      }

      if (window.parent !== window) {
        window.parent.postMessage(
          { type: 'moldable:open-url', url: data.url },
          '*',
        )
      } else {
        window.open(data.url, '_blank')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get auth URL')
    } finally {
      setConnectLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await fetchWithWorkspace('/api/auth/logout', { method: 'POST' })
      setAuthenticated(false)
      queryClient.setQueryData(['events', workspaceId], [])
      queryClient.invalidateQueries({ queryKey: ['events', workspaceId] })
    } catch (err) {
      console.error('Failed to disconnect', err)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr)
    return format(date, 'h:mm aa')
  }

  const formatTimeRange = (start: string, end: string) => {
    return `${formatTime(start)} – ${formatTime(end)}`
  }

  const selectedDateEvents = useMemo(() => {
    const now = new Date()
    return events
      .filter((event) => {
        const eventDate = parseISO(event.start)
        return isSameDay(eventDate, selectedDate)
      })
      .map((event) => {
        const eventEnd = parseISO(event.end)
        const isPast = eventEnd < now
        return { ...event, isPastEvent: isPast }
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [events, selectedDate])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const isScrollingRef = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return

    const touchEnd = e.changedTouches[0].clientY
    const deltaY = touchStartRef.current - touchEnd
    const minSwipeDistance = 50

    if (Math.abs(deltaY) > minSwipeDistance) {
      if (deltaY > 0) {
        nextMonth()
      } else {
        prevMonth()
      }
    }

    touchStartRef.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    // If we're already processing a scroll event, ignore subsequent ones
    if (isScrollingRef.current) return

    // Requirement: Vertical scroll, threshold of 50 to avoid sensitive trackpad triggers
    if (Math.abs(e.deltaY) > 50 && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      isScrollingRef.current = true

      if (e.deltaY > 0) {
        nextMonth()
      } else {
        prevMonth()
      }

      // Reset the scroll lock after a short delay
      setTimeout(() => {
        isScrollingRef.current = false
      }, 500) // 500ms debounce
    }
  }

  const openExternalLink = (url: string) => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'moldable:open-url', url }, '*')
    } else {
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="bg-background flex h-screen flex-col items-center justify-center p-8 text-center">
        <div className="bg-primary/10 mb-6 rounded-full p-4">
          <CalendarDays className="text-primary size-12" />
        </div>
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          Calendar
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Connect your Google Calendar to sync your meetings and see your daily
          agenda at a glance.
        </p>

        {error && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive mb-4 rounded-lg border p-4 text-sm">
            {error}
          </div>
        )}

        {connectLoading ? (
          <Button size="lg" disabled className="gap-2">
            <Loader2 className="size-4 animate-spin" />
            Connecting...
          </Button>
        ) : (
          <button
            onClick={handleConnect}
            className="flex h-10 cursor-pointer items-center gap-3 rounded-sm border border-[#747775] bg-white px-3 font-['Roboto',sans-serif] text-sm font-medium text-[#1f1f1f] shadow-sm transition-shadow hover:shadow-md active:bg-[#f8f8f8]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        )}

        <p className="text-muted-foreground mt-6 max-w-xs text-center text-xs">
          Your calendar data is stored locally on your device.{' '}
          <a
            href="https://moldable.sh/legal/privacy#7-google-api-services"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-background flex h-screen flex-row overflow-hidden">
      {/* Left Side Panel - Agenda stays on the very left */}
      <aside className="border-border bg-card/30 flex w-64 flex-col border-r">
        <div className="p-5 pb-3">
          <h3 className="text-2xl font-bold tracking-tight">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-5 pt-0">
            {selectedDateEvents.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-muted-foreground text-xs italic">
                  No events scheduled
                </p>
              </div>
            ) : (
              <div className="before:bg-border relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'relative pl-5 transition-opacity duration-300',
                      event.isPastEvent && 'opacity-40 grayscale-[0.5]',
                    )}
                  >
                    <div
                      className={cn(
                        'border-background absolute left-0 top-1 size-3 rounded-full border-2 shadow-sm',
                        event.isPastEvent
                          ? 'bg-muted-foreground'
                          : 'bg-primary',
                      )}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wider',
                          event.isPastEvent
                            ? 'text-muted-foreground'
                            : 'text-primary',
                        )}
                      >
                        {formatTime(event.start)}
                      </span>
                      <h4 className="group flex items-start gap-1 text-xs font-semibold leading-snug">
                        <span
                          className={cn(
                            'flex-1',
                            event.isPastEvent &&
                              'decoration-muted-foreground/30 line-through',
                          )}
                        >
                          {event.title}
                        </span>
                        {event.link && (
                          <button
                            onClick={() => openExternalLink(event.link!)}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="text-primary size-2.5 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-40" />
                          </button>
                        )}
                      </h4>
                      {event.location && (
                        <div className="text-muted-foreground flex items-center gap-1 text-[10px]">
                          <MapPin className="size-2.5" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <span className="text-muted-foreground/60 text-[10px] italic">
                        to {formatTime(event.end)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Container Container (Header + Content) for the Grid section specifically */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header - now part of the grid stack, so its center is the grid center */}
        <header className="border-border bg-card/50 flex h-14 shrink-0 items-center justify-between border-b px-6 backdrop-blur-sm">
          <div className="flex-1" /> {/* Spacer */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevMonth}
                className="size-8"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <h2 className="min-w-32 text-center text-sm font-semibold tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextMonth}
                className="size-8"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3 text-xs font-medium"
            >
              Today
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-2 text-xs"
            >
              <LogOut className="size-3" />
              Disconnect
            </Button>
          </div>
        </header>

        {/* Calendar Grid stack */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Weekdays header */}
          <div className="border-border bg-muted/20 grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-muted-foreground py-2 text-center text-[10px] font-bold uppercase tracking-widest"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto">
            <div
              className="grid min-h-full select-none auto-rows-fr grid-cols-7 pb-[var(--chat-safe-padding)]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
            >
              {calendarDays.map((day) => {
                const now = new Date()
                const dayEvents = events
                  .filter((e) => isSameDay(parseISO(e.start), day))
                  .map((e) => ({
                    ...e,
                    isPastEvent: parseISO(e.end) < now,
                  }))
                  .sort((a, b) => {
                    if (a.isAllDay && !b.isAllDay) return -1
                    if (!a.isAllDay && b.isAllDay) return 1
                    return a.start.localeCompare(b.start)
                  })

                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'border-border hover:bg-muted/50 group relative flex min-h-[100px] flex-col border-b border-r p-2 text-left transition-all focus:outline-none',
                      !isCurrentMonth && 'bg-muted/5 text-muted-foreground/40',
                      isSelected &&
                        'bg-primary/[0.03] ring-primary/20 z-10 ring-1 ring-inset',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        isToday(day)
                          ? 'bg-primary text-primary-foreground'
                          : isSelected
                            ? 'text-primary font-bold'
                            : isCurrentMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground/30',
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="mt-2 w-full flex-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 5).map((event) => {
                        const color = event.colorId
                          ? GOOGLE_COLORS[event.colorId]
                          : null

                        return (
                          <Popover key={event.id}>
                            <PopoverTrigger asChild>
                              <div
                                className={cn(
                                  'flex cursor-pointer items-center gap-1.5 truncate rounded-sm px-1.5 py-0.5 text-[10px] transition-all',
                                  event.isAllDay
                                    ? 'bg-primary text-primary-foreground mb-1 py-1 font-semibold shadow-sm'
                                    : event.isPastEvent
                                      ? 'opacity-40 grayscale-[0.5]'
                                      : 'hover:bg-muted/50',
                                )}
                                style={{
                                  backgroundColor:
                                    !event.isAllDay &&
                                    !event.isPastEvent &&
                                    color
                                      ? `${color}15`
                                      : undefined,
                                  color:
                                    !event.isAllDay &&
                                    !event.isPastEvent &&
                                    color
                                      ? color
                                      : undefined,
                                  borderLeft:
                                    !event.isAllDay &&
                                    !event.isPastEvent &&
                                    color
                                      ? `2px solid ${color}`
                                      : undefined,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!event.isAllDay && !color && (
                                  <div
                                    className={cn(
                                      'size-1.5 shrink-0 rounded-full',
                                      event.isPastEvent
                                        ? 'bg-muted-foreground'
                                        : 'bg-primary',
                                    )}
                                  />
                                )}
                                <span
                                  className={cn(
                                    'truncate',
                                    event.isPastEvent &&
                                      'decoration-muted-foreground/30 line-through',
                                  )}
                                >
                                  {event.title}
                                </span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent
                              className="border-border/50 w-72 overflow-hidden p-0 shadow-xl"
                              align="start"
                            >
                              <div className="space-y-3 p-4">
                                <div>
                                  <h4 className="text-foreground text-sm font-bold leading-tight">
                                    {event.title}
                                  </h4>
                                  <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[11px]">
                                    <Clock className="size-3" />
                                    <span>
                                      {format(
                                        parseISO(event.start),
                                        'EEEE, MMMM d',
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-primary mt-1 flex items-center gap-1.5 text-[11px] font-medium">
                                    <span>
                                      {formatTimeRange(event.start, event.end)}
                                    </span>
                                  </div>
                                </div>

                                {(event.location || event.link) && (
                                  <div className="border-border/50 space-y-2 border-t pt-2">
                                    {event.location && (
                                      <div className="text-muted-foreground flex items-start gap-2 text-[11px]">
                                        <MapPin className="mt-0.5 size-3 shrink-0" />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                    {event.link && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-primary hover:bg-primary/5 -ml-2 h-8 w-full cursor-pointer justify-start gap-2 px-2 text-[11px]"
                                        onClick={() =>
                                          openExternalLink(event.link!)
                                        }
                                      >
                                        <LinkIcon className="size-3" />
                                        View in Google Calendar
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )
                      })}
                      {dayEvents.length > 5 && (
                        <div className="text-muted-foreground/70 pl-1 text-[10px] font-medium italic">
                          + {dayEvents.length - 5} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
