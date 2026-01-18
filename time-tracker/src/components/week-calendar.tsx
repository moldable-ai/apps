'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import { Project, TimeEntry, formatDurationHuman } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'

interface WeekCalendarProps {
  weekStart: Date
  onSelectDate?: (date: Date) => void
  selectedDate?: Date
}

export function WeekCalendar({
  weekStart,
  onSelectDate,
  selectedDate,
}: WeekCalendarProps) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  // Fetch entries for the week
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', workspaceId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate })
      const res = await fetchWithWorkspace(`/api/entries?${params}`)
      return res.json() as Promise<TimeEntry[]>
    },
  })

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      return res.json() as Promise<Project[]>
    },
  })

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  // Group entries by day and project
  const dayData = useMemo(() => {
    return days.map((day) => {
      const dayEntries = entries.filter((e) =>
        isSameDay(parseISO(e.startTime), day),
      )

      // Group by project
      const byProject = new Map<string, number>()
      dayEntries.forEach((entry) => {
        const current = byProject.get(entry.projectId) || 0
        byProject.set(entry.projectId, current + (entry.duration || 0))
      })

      const totalDuration = dayEntries.reduce(
        (sum, e) => sum + (e.duration || 0),
        0,
      )

      return {
        day,
        entries: dayEntries,
        byProject: Array.from(byProject.entries()).map(
          ([projectId, duration]) => ({
            projectId,
            project: projectMap.get(projectId),
            duration,
          }),
        ),
        totalDuration,
      }
    })
  }, [days, entries, projectMap])

  // Calculate week total
  const weekTotal = dayData.reduce((sum, d) => sum + d.totalDuration, 0)

  // Find max duration for scaling
  const maxDuration = Math.max(...dayData.map((d) => d.totalDuration), 3600) // min 1 hour for scale

  return (
    <div className="space-y-4">
      {/* Week header with total */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          Week of {format(weekStart, 'MMMM d')}
        </span>
        <span className="font-semibold">
          {formatDurationHuman(weekTotal)} total
        </span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-2">
        {dayData.map(({ day, byProject, totalDuration }) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate?.(day)}
              className={cn(
                'border-border hover:border-primary/50 flex min-h-[120px] cursor-pointer flex-col rounded-lg border p-2 transition-colors',
                isSelected && 'border-primary bg-primary/5',
                isToday(day) && 'ring-primary/30 ring-1',
              )}
            >
              {/* Day header */}
              <div className="mb-2 text-center">
                <div className="text-muted-foreground text-[10px] uppercase">
                  {format(day, 'EEE')}
                </div>
                <div
                  className={cn(
                    'text-sm font-medium',
                    isToday(day) && 'text-primary',
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>

              {/* Time bar */}
              <div className="flex flex-1 flex-col justify-end">
                {totalDuration > 0 && (
                  <div
                    className="w-full space-y-0.5 overflow-hidden rounded"
                    style={{
                      height: `${Math.max(
                        (totalDuration / maxDuration) * 60,
                        12,
                      )}px`,
                    }}
                  >
                    {byProject.map(({ projectId, project, duration }) => (
                      <div
                        key={projectId}
                        className="w-full"
                        style={{
                          backgroundColor: project?.color || '#6b7280',
                          height: `${(duration / totalDuration) * 100}%`,
                          minHeight: '4px',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="text-muted-foreground mt-2 text-center text-xs">
                {totalDuration > 0 ? formatDurationHuman(totalDuration) : '—'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
