'use client'

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Settings,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, ScrollArea } from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import { ExportDialog } from '@/components/export-dialog'
import { ProjectManager } from '@/components/project-manager'
import { TimeList } from '@/components/time-list'
import { Timer } from '@/components/timer'
import { WeekCalendar } from '@/components/week-calendar'
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'

type ViewMode = 'list' | 'calendar'

export default function HomePage() {
  const [currentWeek, setCurrentWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  )
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [showSettings, setShowSettings] = useState(false)

  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })
  const startDate = format(currentWeek, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  // For filtered list view when a date is selected in calendar
  const listDates = useMemo(() => {
    if (viewMode === 'calendar' && selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      return { startDate: dateStr, endDate: dateStr }
    }
    return { startDate, endDate }
  }, [viewMode, selectedDate, startDate, endDate])

  const goToToday = () => {
    const today = new Date()
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }))
    setSelectedDate(today)
  }

  const goToPrevWeek = () => {
    setCurrentWeek((prev) => subWeeks(prev, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeek((prev) => addWeeks(prev, 1))
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header with Timer */}
      <header className="border-border shrink-0 border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Timer />
          <div className="bg-border h-8 w-px shrink-0" />
          <div className="flex items-center gap-2">
            <ExportDialog />
            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex min-h-0 flex-1">
        {/* Main area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* View controls */}
          <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-2">
              {/* Week navigation */}
              <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[180px] text-center text-sm font-medium">
                {format(currentWeek, 'MMM d')} –{' '}
                {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>

            {/* View toggle */}
            <div className="bg-muted flex rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors',
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <List className="size-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <CalendarDays className="size-4" />
                Week
              </button>
            </div>
          </div>

          {/* Content area */}
          <ScrollArea className="flex-1">
            <div className="p-6 pb-[var(--chat-safe-padding)]">
              {viewMode === 'calendar' && (
                <div className="mb-6">
                  <WeekCalendar
                    weekStart={currentWeek}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                </div>
              )}

              {viewMode === 'calendar' && selectedDate && (
                <div className="mb-4">
                  <h3 className="text-muted-foreground text-sm font-medium">
                    Entries for {format(selectedDate, 'EEEE, MMMM d')}
                  </h3>
                </div>
              )}

              <TimeList
                startDate={listDates.startDate}
                endDate={listDates.endDate}
              />
            </div>
          </ScrollArea>
        </main>

        {/* Settings sidebar */}
        {showSettings && (
          <aside className="border-border w-80 shrink-0 overflow-y-auto border-l p-6">
            <ProjectManager />
          </aside>
        )}
      </div>
    </div>
  )
}
