'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'
import { Button, cn } from '@moldable-ai/ui'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

interface Event {
  start: string | Date
  title: string
}

interface CalendarViewProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onMonthChange?: (start: Date, end: Date) => void
  events?: Event[]
  className?: string
}

export function CalendarView({
  selectedDate,
  onDateSelect,
  onMonthChange,
  events = [],
  className,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    startOfMonth(selectedDate),
  )

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth)
    if (onMonthChange) {
      const start = startOfMonth(newMonth)
      const end = endOfMonth(newMonth)
      onMonthChange(start, end)
    }
  }

  const nextMonth = () => handleMonthChange(addMonths(currentMonth, 1))
  const prevMonth = () => handleMonthChange(subMonths(currentMonth, 1))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const hasEventOnDay = (day: Date) => {
    return events.some((event) => isSameDay(new Date(event.start), day))
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex items-center justify-between px-2 py-4">
        <h2 className="px-2 text-xl font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const today = new Date()
              handleMonthChange(startOfMonth(today))
              onDateSelect(today)
            }}
            className="cursor-pointer text-xs font-medium"
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="border-border grid grid-cols-7 border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-muted-foreground py-2 text-center text-xs font-medium uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isCurrentDay = isToday(day)
          const hasEvents = hasEventOnDay(day)

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                'border-border hover:bg-muted/50 relative flex h-full cursor-pointer flex-col items-center justify-center border-b border-r p-2 text-left transition-colors',
                !isCurrentMonth && 'text-muted-foreground/40 bg-muted/5',
                isSelected && 'bg-primary/5',
              )}
            >
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-sm font-medium',
                  isCurrentDay && !isSelected && 'text-primary font-bold',
                  isSelected && 'bg-primary text-primary-foreground',
                )}
              >
                {format(day, 'd')}
              </span>

              {hasEvents && (
                <div className="mt-1 flex gap-0.5">
                  <div
                    className={cn(
                      'size-1 rounded-full',
                      isSelected ? 'bg-primary-foreground/60' : 'bg-primary',
                    )}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
