'use client'

import { CalendarDays, Clock, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkspace } from '@moldable/ui'

const GHOST_EXAMPLES = [
  { title: 'Weekly Sync', time: '10:00 AM', color: 'bg-blue-500' },
  { title: 'Lunch with Team', time: '12:00 PM', color: 'bg-green-500' },
  { title: 'Product Review', time: '2:30 PM', color: 'bg-purple-500' },
]

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  location?: string
  link?: string
}

export default function WidgetPage() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const now = new Date()
        // Set to start of today (local time)
        const timeMin = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        ).toISOString()
        // Set to end of today (local time)
        const timeMax = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        ).toISOString()

        const res = await fetchWithWorkspace(
          `/api/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        )
        if (res.status === 401) {
          setAuthenticated(false)
          setEvents([])
        } else {
          const data = await res.json()
          setEvents(data.events || [])
          setAuthenticated(true)
        }
      } catch (err) {
        console.error('Failed to fetch events', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    // Poll every 5 minutes
    const interval = setInterval(fetchEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [workspaceId, fetchWithWorkspace])

  // Listen for OAuth success from popup window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        // Refresh events after successful auth
        setLoading(true)
        const now = new Date()
        const timeMin = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
        ).toISOString()
        const timeMax = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        ).toISOString()
        const res = await fetchWithWorkspace(
          `/api/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        )
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
          setAuthenticated(true)
        }
        setLoading(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [fetchWithWorkspace])

  const handleConnect = async () => {
    const res = await fetchWithWorkspace('/api/auth/login')
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const getDuration = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60))
    if (diff >= 60) {
      const hours = Math.floor(diff / 60)
      const mins = diff % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${diff}m`
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="bg-background flex h-full select-none flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-muted-foreground size-3" />
          <span className="text-xs font-semibold">Today</span>
        </div>
        <span className="text-muted-foreground text-[11px]">{today}</span>
      </div>

      <div className="scrollbar-hide flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <div className="text-muted-foreground flex h-32 animate-pulse items-center justify-center text-[11px]">
            Loading events...
          </div>
        ) : !authenticated ||
          events.filter((e) => new Date(e.end) > new Date()).length === 0 ? (
          <>
            {GHOST_EXAMPLES.map((example, idx) => (
              <div
                key={idx}
                className="border-border/40 bg-muted/10 flex flex-col gap-1 rounded-lg border p-2 opacity-40"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-[13px] font-medium leading-none">
                    {example.title}
                  </span>
                  <div className={`size-1.5 rounded-full ${example.color}`} />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="size-3" />
                  <span>{example.time}</span>
                </div>
              </div>
            ))}
            <div className="text-muted-foreground pt-2 text-center text-[11px]">
              {!authenticated
                ? 'Connect to see your schedule'
                : 'No events left today'}
            </div>
          </>
        ) : (
          events
            .filter((event) => new Date(event.end) > new Date())
            .map((event) => (
              <div
                key={event.id}
                className="border-border/50 bg-muted/30 hover:bg-muted/50 group flex flex-col gap-1 rounded-lg border p-2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate pr-2 text-[13px] font-medium leading-none">
                    {event.title}
                  </span>
                  <div className="size-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Clock className="size-3" />
                    <span>{formatTime(event.start)}</span>
                    <span>•</span>
                    <span>{getDuration(event.start, event.end)}</span>
                  </div>
                  {event.link && (
                    <a
                      href={event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ExternalLink className="text-primary hover:text-primary/80 size-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
        )}
      </div>

      {!authenticated && (
        <button
          onClick={handleConnect}
          className="bg-primary text-primary-foreground mt-3 w-full cursor-pointer rounded-md py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
        >
          Connect Google Calendar
        </button>
      )}
    </div>
  )
}
