import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CalendarDays,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MapPin,
  RotateCw,
  Search,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Skeleton,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
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
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

type ResponseStatus = 'accepted' | 'tentative' | 'declined' | 'needsAction'

interface Attendee {
  email?: string | null
  displayName?: string | null
  responseStatus?: string | null
  optional?: boolean | null
  organizer?: boolean | null
  self?: boolean | null
}

interface CalendarEvent {
  id: string
  iCalUID?: string
  title: string
  start: string
  end: string
  isAllDay?: boolean
  location?: string
  link?: string
  status?: string
  colorId?: string
  organizer?: {
    email?: string | null
    displayName?: string | null
    self?: boolean | null
  } | null
  attendees?: Attendee[]
  selfResponseStatus?: string | null
  conferenceUrl?: string | null
  conferenceProvider?: string | null
  // Derived client-side.
  isPastEvent?: boolean
}

// Google Calendar colorId mapping (standard colors). These are *data* — the hue
// belongs to the event — while all surrounding surfaces use design-system tokens.
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// All-day events arrive as a date-only string ('2026-05-29'). parseISO would
// read that as local midnight and can drift across timezones; parse the raw
// y-M-d into a local date so the event lands on the intended calendar cell.
function parseEventDay(event: Pick<CalendarEvent, 'start' | 'isAllDay'>): Date {
  if (event.isAllDay && /^\d{4}-\d{2}-\d{2}$/.test(event.start)) {
    return parse(event.start, 'yyyy-MM-dd', new Date())
  }
  return parseISO(event.start)
}

function eventColor(event: CalendarEvent): string | null {
  return event.colorId ? (GOOGLE_COLORS[event.colorId] ?? null) : null
}

function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || ''
  if (!source) return '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return source.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function attendeeName(attendee: Attendee): string {
  return attendee.displayName || attendee.email || 'Guest'
}

export default function FullPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [connectLoading, setConnectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDateStack, setSelectedDateStack] = useState<Date[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null)
  const [search, setSearch] = useState('')
  const [errorDismissed, setErrorDismissed] = useState(false)
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
    isFetching,
    error: queryError,
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
  // Distinguish a genuine fetch failure (banner-worthy) from "Unauthorized",
  // which routes to the connect screen instead.
  const isAuthError =
    queryError instanceof Error && queryError.message === 'Unauthorized'
  const loadError = queryError && !isAuthError ? queryError : null
  const showErrorBanner = Boolean(loadError) && !errorDismissed

  useEffect(() => {
    if (queryError) setErrorDismissed(false)
  }, [queryError])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  const selectDate = useCallback(
    (day: Date, sync: 'push' | 'none' = 'push') => {
      if (isSameDay(day, selectedDate)) return
      if (sync === 'push') {
        setSelectedDateStack((stack) => [...stack, selectedDate].slice(-50))
        pushMoldableNavigation({
          id: `date:${format(day, 'yyyy-MM-dd')}`,
          title: format(day, 'MMM d'),
        })
      }
      setSelectedDate(day)
    },
    [selectedDate],
  )

  useMoldableNavigationPop(() => {
    const previousDate = selectedDateStack[selectedDateStack.length - 1]
    if (!previousDate) return

    setSelectedDateStack((stack) => stack.slice(0, -1))
    setSelectedDate(previousDate)
    setCurrentMonth(previousDate)
  })

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

  const formatTime = (dateStr: string) => format(parseISO(dateStr), 'h:mm aa')

  const formatTimeRange = (start: string, end: string) =>
    `${formatTime(start)} – ${formatTime(end)}`

  // The connected account email surfaces from event organizers/attendees that
  // are flagged `self` — the cheapest reliable identity signal we have.
  const accountEmail = useMemo(() => {
    for (const event of events) {
      if (event.organizer?.self && event.organizer.email)
        return event.organizer.email
      const self = event.attendees?.find((a) => a.self)
      if (self?.email) return self.email
    }
    return null
  }, [events])

  const matchesSearch = useCallback(
    (event: CalendarEvent) => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      return [
        event.title,
        event.location,
        event.conferenceProvider,
        event.organizer?.displayName,
        event.organizer?.email,
        ...(event.attendees ?? []).flatMap((a) => [a.displayName, a.email]),
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase()
        .includes(q)
    },
    [search],
  )

  const dayEventsFor = useCallback(
    (day: Date) => {
      const now = new Date()
      return events
        .filter((e) => isSameDay(parseEventDay(e), day))
        .filter(matchesSearch)
        .map((e) => ({
          ...e,
          isPastEvent: !e.isAllDay && parseISO(e.end) < now,
        }))
        .sort((a, b) => {
          if (a.isAllDay && !b.isAllDay) return -1
          if (!a.isAllDay && b.isAllDay) return 1
          return a.start.localeCompare(b.start)
        })
    },
    [events, matchesSearch],
  )

  const selectedDayEvents = useMemo(
    () => dayEventsFor(selectedDate),
    [dayEventsFor, selectedDate],
  )
  const allDayEvents = useMemo(
    () => selectedDayEvents.filter((e) => e.isAllDay),
    [selectedDayEvents],
  )
  const timedEvents = useMemo(
    () => selectedDayEvents.filter((e) => !e.isAllDay),
    [selectedDayEvents],
  )

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentMonth])

  const nextMonth = useCallback(() => {
    setSlideDir('next')
    setCurrentMonth((m) => addMonths(m, 1))
  }, [])
  const prevMonth = useCallback(() => {
    setSlideDir('prev')
    setCurrentMonth((m) => subMonths(m, 1))
  }, [])
  const goToToday = () => {
    const today = new Date()
    setSlideDir(today > currentMonth ? 'next' : 'prev')
    setCurrentMonth(today)
    selectDate(today)
  }

  // Re-arm the slide animation by toggling the data attribute each navigation.
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    if (slideDir) setAnimKey((k) => k + 1)
  }, [currentMonth, slideDir])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return
    const deltaX = touchStartRef.current - e.changedTouches[0].clientX
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0) nextMonth()
      else prevMonth()
    }
    touchStartRef.current = null
  }

  // Keyboard navigation when the grid is focused — the accessible, discoverable
  // replacement for the old wheel-jacking. Wheel-to-change-month is removed so
  // the grid's own scrollbar works on busy months.
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault()
      prevMonth()
    } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      e.preventDefault()
      nextMonth()
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
    return <CalendarSkeleton />
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
      {/* Agenda sidebar — the product. Borrows the meetings app's "Coming up"
          editorial language: a big serif date, a today dot, and dashed rules. */}
      <aside className="border-border bg-card/30 flex min-h-0 w-72 flex-col border-r">
        <div
          className="cal-dashed-separator flex items-start gap-3 px-5 pb-4 pt-5"
          style={{ '--cal-dash-inset': '1.25rem' } as React.CSSProperties}
        >
          <span className="font-serif text-[2.75rem] leading-[0.8]">
            {format(selectedDate, 'd')}
          </span>
          <div className="pt-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-[1.7rem] leading-none">
                {format(selectedDate, 'MMMM')}
              </span>
              {isToday(selectedDate) && (
                <span
                  className="bg-primary size-1.5 shrink-0 rounded-full"
                  aria-hidden
                />
              )}
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')} ·{' '}
              {format(selectedDate, 'yyyy')}
            </p>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-5 pb-[calc(var(--chat-safe-padding,0px)+1.25rem)] pt-5">
            {/* All-day section, pinned at the top with no time label. */}
            {allDayEvents.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  All day
                </p>
                {allDayEvents.map((event) => {
                  const color = eventColor(event)
                  return (
                    <EventPopover
                      key={event.id}
                      event={event}
                      formatTimeRange={formatTimeRange}
                      openExternalLink={openExternalLink}
                    >
                      <button
                        className="hover:bg-muted/60 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors"
                        style={{
                          borderLeft: `3px solid ${color ?? 'var(--primary)'}`,
                        }}
                      >
                        <span className="text-foreground flex-1 truncate text-sm font-medium">
                          {event.title}
                        </span>
                        {event.conferenceUrl && (
                          <Video className="text-muted-foreground size-3.5 shrink-0" />
                        )}
                      </button>
                    </EventPopover>
                  )
                })}
              </div>
            )}

            {/* Timed events. */}
            {timedEvents.length === 0 && allDayEvents.length === 0 ? (
              <EmptyAgenda openExternalLink={openExternalLink} />
            ) : (
              timedEvents.length > 0 && (
                <div className="relative space-y-3">
                  {timedEvents.map((event) => {
                    const declined = event.selfResponseStatus === 'declined'
                    const cancelled = event.status === 'cancelled'
                    const dimmed = event.isPastEvent || declined
                    const color = eventColor(event)
                    return (
                      <EventPopover
                        key={event.id}
                        event={event}
                        formatTimeRange={formatTimeRange}
                        openExternalLink={openExternalLink}
                      >
                        <button
                          className={cn(
                            'group flex w-full gap-3 rounded-md px-1 py-1 text-left transition-colors',
                            'hover:bg-muted/50',
                            dimmed && 'opacity-60',
                          )}
                        >
                          <div className="flex w-14 shrink-0 flex-col pt-0.5">
                            <span
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                event.isPastEvent
                                  ? 'text-muted-foreground'
                                  : 'text-primary',
                              )}
                            >
                              {format(parseISO(event.start), 'h:mm')}
                            </span>
                            <span className="text-muted-foreground text-[11px] uppercase tabular-nums">
                              {format(parseISO(event.start), 'aa')}
                            </span>
                          </div>
                          <div
                            className="mt-1 w-0.5 shrink-0 self-stretch rounded-full"
                            style={{
                              backgroundColor: color ?? 'var(--primary)',
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-start gap-1.5">
                              <span
                                className={cn(
                                  'flex-1 text-sm font-medium leading-snug',
                                  (cancelled || declined) &&
                                    'decoration-muted-foreground/40 line-through',
                                )}
                              >
                                {event.title}
                              </span>
                              {event.conferenceUrl && (
                                <Video className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs tabular-nums">
                              {format(parseISO(event.start), 'h:mm')} –{' '}
                              {format(parseISO(event.end), 'h:mm aa')}
                            </p>
                            {event.location && (
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <MapPin className="size-3 shrink-0" />
                                <span className="truncate">
                                  {event.location}
                                </span>
                              </div>
                            )}
                            {event.attendees && event.attendees.length > 1 && (
                              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Users className="size-3 shrink-0" />
                                <span>{event.attendees.length} guests</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </EventPopover>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Grid column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Three-zone header: identity/search · navigation · account. */}
        <header className="border-border bg-card/50 relative flex h-14 shrink-0 items-center gap-4 border-b px-4 backdrop-blur-sm">
          {/* Subtle progress bar while a (background) fetch is in flight. */}
          {isFetching && !loading && (
            <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
              <div className="bg-primary/70 h-full w-1/4 animate-[cal-progress_1s_ease-in-out_infinite]" />
            </div>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative w-full max-w-64">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events"
                className="h-8 pl-8 pr-7 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              className="size-8"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-36 text-center text-sm font-semibold tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="size-8"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-1 h-8 px-3 text-xs font-medium"
            >
              Today
            </Button>
          </div>

          <div className="flex flex-1 items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ring-offset-background focus-visible:ring-ring cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label="Account menu"
                >
                  <Avatar size="sm" className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {accountEmail ? initials(null, accountEmail) : 'GC'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs font-normal">
                    Connected account
                  </span>
                  <span className="truncate text-sm font-medium">
                    {accountEmail ?? 'Google Calendar'}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    openExternalLink('https://calendar.google.com')
                  }
                  className="cursor-pointer"
                >
                  <ExternalLink className="size-3.5" />
                  Open Google Calendar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDisconnect}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Error banner — honest failure state with retry. */}
        {showErrorBanner && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-3 border-b px-4 py-2.5 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">
              Couldn’t load your calendar. Check your connection and try again.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setErrorDismissed(true)
                refetch()
              }}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 h-7 gap-1.5 px-2.5 text-xs"
            >
              <RotateCw className="size-3" />
              Retry
            </Button>
            <button
              onClick={() => setErrorDismissed(true)}
              className="hover:text-foreground cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Weekday header */}
          <div className="border-border bg-muted/20 grid grid-cols-7 border-b">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-muted-foreground py-2 text-center text-[11px] font-semibold uppercase tracking-widest"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="relative flex-1 overflow-auto">
            <div
              tabIndex={0}
              role="grid"
              aria-label="Month calendar — use arrow keys to change month"
              key={animKey}
              data-dir={slideDir ?? undefined}
              onKeyDown={handleGridKeyDown}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="cal-grid-anim grid min-h-full select-none auto-rows-fr grid-cols-7 pb-[var(--chat-safe-padding)] outline-none"
            >
              {calendarDays.map((day) => {
                const dayEvents = dayEventsFor(day)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    role="gridcell"
                    aria-selected={isSelected}
                    onClick={() => selectDate(day)}
                    className={cn(
                      'border-border hover:bg-muted/40 group relative flex min-h-[100px] flex-col border-b border-r p-2 text-left transition-colors focus:outline-none',
                      !isCurrentMonth && 'bg-muted/5 text-muted-foreground/40',
                      isSelected &&
                        'bg-primary/[0.07] ring-primary z-10 ring-2 ring-inset',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex size-7 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        today
                          ? 'bg-primary text-primary-foreground'
                          : isSelected
                            ? 'ring-primary text-primary font-semibold ring-2'
                            : isCurrentMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground/30',
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="mt-1.5 w-full flex-1 space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 4).map((event) => {
                        const color = eventColor(event)

                        // All-day: subtle full-width colored bar (not a loud fill).
                        if (event.isAllDay) {
                          return (
                            <EventPopover
                              key={event.id}
                              event={event}
                              formatTimeRange={formatTimeRange}
                              openExternalLink={openExternalLink}
                            >
                              <div
                                className="flex cursor-pointer items-center gap-1 truncate rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium"
                                style={{
                                  backgroundColor: color
                                    ? `${color}22`
                                    : 'var(--muted)',
                                  color: color ?? undefined,
                                  borderLeft: `3px solid ${color ?? 'var(--primary)'}`,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {event.conferenceUrl && (
                                  <Video className="size-2.5 shrink-0" />
                                )}
                                <span className="truncate">{event.title}</span>
                              </div>
                            </EventPopover>
                          )
                        }

                        return (
                          <EventPopover
                            key={event.id}
                            event={event}
                            formatTimeRange={formatTimeRange}
                            openExternalLink={openExternalLink}
                          >
                            <div
                              className={cn(
                                'flex cursor-pointer items-center gap-1.5 truncate rounded-[3px] px-1.5 py-0.5 text-[11px] transition-colors',
                                event.isPastEvent && 'opacity-55',
                                !color && 'hover:bg-muted/60',
                              )}
                              style={{
                                backgroundColor: color
                                  ? `${color}1f`
                                  : undefined,
                                color: color ?? undefined,
                                borderLeft: color
                                  ? `2px solid ${color}`
                                  : undefined,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!color && (
                                <div
                                  className={cn(
                                    'size-1.5 shrink-0 rounded-full',
                                    event.isPastEvent
                                      ? 'bg-muted-foreground'
                                      : 'bg-primary',
                                  )}
                                />
                              )}
                              {event.conferenceUrl && (
                                <Video className="size-2.5 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  'truncate',
                                  event.status === 'cancelled' &&
                                    'line-through',
                                )}
                              >
                                {event.title}
                              </span>
                            </div>
                          </EventPopover>
                        )
                      })}
                      {dayEvents.length > 4 && (
                        <div className="text-muted-foreground/70 pl-1 text-[11px] font-medium">
                          +{dayEvents.length - 4} more
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

// ── Event popover ──────────────────────────────────────────────────────────

function EventPopover({
  event,
  formatTimeRange,
  openExternalLink,
  children,
}: {
  event: CalendarEvent
  formatTimeRange: (start: string, end: string) => string
  openExternalLink: (url: string) => void
  children: React.ReactNode
}) {
  const { fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [optimisticRsvp, setOptimisticRsvp] = useState<ResponseStatus | null>(
    null,
  )

  const rsvp = useMutation({
    mutationFn: async (responseStatus: ResponseStatus) => {
      const res = await fetchWithWorkspace('/api/moldable/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'events.rsvp',
          params: { eventId: event.id, responseStatus },
        }),
      })
      if (!res.ok) throw new Error('Failed to update RSVP')
      const data = await res.json()
      if (!data.ok)
        throw new Error(data.error?.message ?? 'Failed to update RSVP')
      return responseStatus
    },
    onMutate: (responseStatus) => setOptimisticRsvp(responseStatus),
    onError: () => setOptimisticRsvp(null),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  const currentRsvp = (optimisticRsvp ??
    event.selfResponseStatus ??
    null) as ResponseStatus | null

  const attendees = event.attendees ?? []
  const accepted = attendees.filter(
    (a) => a.responseStatus === 'accepted',
  ).length
  const declined = attendees.filter(
    (a) => a.responseStatus === 'declined',
  ).length
  const canRsvp = attendees.some((a) => a.self)
  const color = eventColor(event)

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="border-border/60 w-80 overflow-hidden p-0 shadow-xl"
        align="start"
      >
        <ScrollArea className="max-h-[26rem]">
          <div className="space-y-3 p-4">
            {/* Title + time */}
            <div>
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color ?? 'var(--primary)' }}
                />
                <h4 className="text-foreground flex-1 text-sm font-semibold leading-tight">
                  {event.title}
                </h4>
              </div>
              <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span>{format(parseEventDay(event), 'EEEE, MMMM d')}</span>
              </div>
              <div className="text-foreground mt-1 flex items-center gap-1.5 text-xs font-medium">
                <Clock className="size-3.5 shrink-0" />
                <span>
                  {event.isAllDay
                    ? 'All day'
                    : formatTimeRange(event.start, event.end)}
                </span>
              </div>
            </div>

            {/* Join — the richest action, first. */}
            {event.conferenceUrl && (
              <Button
                size="sm"
                className="h-9 w-full cursor-pointer gap-2"
                onClick={() => openExternalLink(event.conferenceUrl!)}
              >
                <Video className="size-4" />
                Join {event.conferenceProvider ?? 'video call'}
              </Button>
            )}

            {/* RSVP */}
            {canRsvp && (
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Your response
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <RsvpButton
                    label="Yes"
                    icon={<Check className="size-3.5" />}
                    active={currentRsvp === 'accepted'}
                    activeClass="border-green-600/60 bg-green-600/10 text-green-700 dark:text-green-400"
                    disabled={rsvp.isPending}
                    onClick={() => rsvp.mutate('accepted')}
                  />
                  <RsvpButton
                    label="Maybe"
                    icon={<HelpCircle className="size-3.5" />}
                    active={currentRsvp === 'tentative'}
                    activeClass="border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    disabled={rsvp.isPending}
                    onClick={() => rsvp.mutate('tentative')}
                  />
                  <RsvpButton
                    label="No"
                    icon={<X className="size-3.5" />}
                    active={currentRsvp === 'declined'}
                    activeClass="border-destructive/60 bg-destructive/10 text-destructive"
                    disabled={rsvp.isPending}
                    onClick={() => rsvp.mutate('declined')}
                  />
                </div>
              </div>
            )}

            {/* Attendees */}
            {attendees.length > 0 && (
              <div className="border-border/60 space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Users className="size-3.5" />
                    {attendees.length}{' '}
                    {attendees.length === 1 ? 'guest' : 'guests'}
                  </p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {accepted} yes · {declined} no
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {attendees.slice(0, 6).map((attendee, i) => (
                    <Avatar
                      key={attendee.email ?? i}
                      size="sm"
                      className="ring-background size-6 ring-1"
                      title={attendeeName(attendee)}
                    >
                      <AvatarFallback
                        className={cn(
                          'text-[9px] font-semibold',
                          attendee.responseStatus === 'accepted'
                            ? 'bg-green-600/15 text-green-700 dark:text-green-400'
                            : attendee.responseStatus === 'declined'
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {initials(attendee.displayName, attendee.email)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {attendees.length > 6 && (
                    <span className="text-muted-foreground text-[11px]">
                      +{attendees.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Location + link */}
            {(event.location || event.link) && (
              <div className="border-border/60 space-y-1.5 border-t pt-3">
                {event.location && (
                  <div className="text-muted-foreground flex items-start gap-2 text-xs">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary hover:bg-primary/5 -ml-2 h-8 w-full cursor-pointer justify-start gap-2 px-2 text-xs"
                    onClick={() => openExternalLink(event.link!)}
                  >
                    <LinkIcon className="size-3.5" />
                    View in Google Calendar
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function RsvpButton({
  label,
  icon,
  active,
  activeClass,
  disabled,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  activeClass: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 cursor-pointer items-center justify-center gap-1 rounded-md border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? activeClass
          : 'border-border text-muted-foreground hover:bg-muted/50',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Empty + loading states ───────────────────────────────────────────────────

function EmptyAgenda({
  openExternalLink,
}: {
  openExternalLink: (url: string) => void
}) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="bg-muted/60 mb-3 rounded-full p-3">
        <CalendarDays className="text-muted-foreground size-6" />
      </div>
      <p className="text-foreground text-sm font-medium">
        Nothing on the calendar
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Enjoy the open day.
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          openExternalLink('https://calendar.google.com/calendar/r/eventedit')
        }
        className="text-primary hover:bg-primary/5 mt-3 h-7 gap-1.5 px-2 text-xs"
      >
        <ExternalLink className="size-3.5" />
        Add event
      </Button>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="bg-background flex h-screen flex-row overflow-hidden">
      <aside className="border-border bg-card/30 flex w-72 flex-col border-r">
        <div className="space-y-2 px-5 pb-3 pt-5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Separator />
        <div className="space-y-4 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-12 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-border bg-card/50 flex h-14 shrink-0 items-center justify-between border-b px-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="size-8 rounded-full" />
        </header>
        <div className="border-border bg-muted/20 grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground py-2 text-center text-[11px] font-semibold uppercase tracking-widest"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid flex-1 auto-rows-fr grid-cols-7">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="border-border flex min-h-[100px] flex-col gap-2 border-b border-r p-2"
            >
              <Skeleton className="size-7 rounded-full" />
              {i % 3 === 0 && <Skeleton className="h-3 w-3/4" />}
              {i % 4 === 0 && <Skeleton className="h-3 w-1/2" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
