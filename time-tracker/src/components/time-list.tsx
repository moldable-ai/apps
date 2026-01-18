'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar as CalendarIcon, Clock, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useWorkspace,
} from '@moldable-ai/ui'
import { Project, TimeEntry, formatDurationHuman } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday, parseISO } from 'date-fns'

interface TimeListProps {
  startDate: string
  endDate: string
}

interface EditingEntry {
  id: string
  projectId: string
  description: string
  startTime: string
  endTime: string
}

export function TimeList({ startDate, endDate }: TimeListProps) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  // Fetch entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (entry: EditingEntry) => {
      const res = await fetchWithWorkspace(`/api/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: entry.projectId,
          description: entry.description,
          startTime: entry.startTime,
          endTime: entry.endTime,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', workspaceId] })
      setEditingEntry(null)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithWorkspace(`/api/entries/${id}`, {
        method: 'DELETE',
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', workspaceId] })
      setDeletingEntryId(null)
    },
  })

  const handleDelete = () => {
    if (deletingEntryId) {
      deleteMutation.mutate(deletingEntryId)
    }
  }

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  )

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, TimeEntry[]>()

    entries.forEach((entry) => {
      const dateKey = format(parseISO(entry.startTime), 'yyyy-MM-dd')
      const existing = groups.get(dateKey) || []
      existing.push(entry)
      groups.set(dateKey, existing)
    })

    // Sort each group by time (newest first) and convert to array
    return Array.from(groups.entries())
      .map(([date, items]) => ({
        date,
        entries: items.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        ),
        totalDuration: items.reduce((sum, e) => sum + (e.duration || 0), 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [entries])

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d')
  }

  const openEditDialog = (entry: TimeEntry) => {
    setEditingEntry({
      id: entry.id,
      projectId: entry.projectId,
      description: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime || '',
    })
  }

  const handleSaveEdit = () => {
    if (!editingEntry) return
    updateMutation.mutate(editingEntry)
  }

  // Extract date from ISO string
  const getDateFromISO = (isoString: string): Date | undefined => {
    if (!isoString) return undefined
    return parseISO(isoString)
  }

  // Extract time (HH:mm) from ISO string
  const getTimeFromISO = (isoString: string): string => {
    if (!isoString) return ''
    return format(parseISO(isoString), 'HH:mm')
  }

  // Combine date and time into ISO string
  const combineDateTime = (date: Date | undefined, time: string): string => {
    if (!date || !time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(hours, minutes, 0, 0)
    return combined.toISOString()
  }

  // Update date while keeping time
  const updateDate = (
    field: 'startTime' | 'endTime',
    newDate: Date | undefined,
  ) => {
    if (!editingEntry || !newDate) return
    const currentTime = getTimeFromISO(editingEntry[field]) || '09:00'
    setEditingEntry({
      ...editingEntry,
      [field]: combineDateTime(newDate, currentTime),
    })
  }

  // Update time while keeping date
  const updateTime = (field: 'startTime' | 'endTime', newTime: string) => {
    if (!editingEntry) return
    const currentDate = getDateFromISO(editingEntry[field]) || new Date()
    setEditingEntry({
      ...editingEntry,
      [field]: combineDateTime(currentDate, newTime),
    })
  }

  if (entriesLoading) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center">
        Loading entries...
      </div>
    )
  }

  if (groupedEntries.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2">
        <Clock className="size-8 opacity-50" />
        <p className="text-sm">No time entries for this period</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {groupedEntries.map(({ date, entries, totalDuration }) => (
          <div key={date}>
            {/* Date header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{formatDateHeader(date)}</h3>
              <span className="text-muted-foreground text-sm">
                {formatDurationHuman(totalDuration)}
              </span>
            </div>

            {/* Entries */}
            <div className="space-y-2">
              {entries.map((entry) => {
                const project = projectMap.get(entry.projectId)
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'border-border hover:bg-muted/30 group flex items-center gap-3 rounded-lg border p-3 transition-colors',
                    )}
                  >
                    {/* Project color */}
                    <div
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: project?.color || '#6b7280' }}
                    />

                    {/* Project name */}
                    <div className="w-32 shrink-0">
                      <span className="text-muted-foreground truncate text-sm">
                        {project?.name || 'Unknown'}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="flex-1 truncate">
                      <span
                        className={cn(
                          !entry.description && 'text-muted-foreground italic',
                        )}
                      >
                        {entry.description || 'No description'}
                      </span>
                    </div>

                    {/* Time range */}
                    <div className="text-muted-foreground shrink-0 text-sm">
                      {format(parseISO(entry.startTime), 'h:mm a')}
                      {entry.endTime && (
                        <> – {format(parseISO(entry.endTime), 'h:mm a')}</>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="w-16 shrink-0 text-right font-mono text-sm">
                      {formatDurationHuman(entry.duration || 0)}
                    </div>

                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => setDeletingEntryId(entry.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingEntry}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              {/* Project */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Project</label>
                <Select
                  value={editingEntry.projectId}
                  onValueChange={(value) =>
                    setEditingEntry({ ...editingEntry, projectId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editingEntry.description}
                  onChange={(e) =>
                    setEditingEntry({
                      ...editingEntry,
                      description: e.target.value,
                    })
                  }
                  placeholder="What were you working on?"
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !editingEntry.startTime && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {editingEntry.startTime
                        ? format(
                            parseISO(editingEntry.startTime),
                            'EEEE, MMMM d, yyyy',
                          )
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={getDateFromISO(editingEntry.startTime)}
                      onSelect={(date) => {
                        updateDate('startTime', date)
                        // Also update end date to match
                        if (editingEntry.endTime) {
                          const endTime = getTimeFromISO(editingEntry.endTime)
                          setEditingEntry((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  startTime: combineDateTime(
                                    date,
                                    getTimeFromISO(prev.startTime) || '09:00',
                                  ),
                                  endTime: combineDateTime(date, endTime),
                                }
                              : prev,
                          )
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input
                    type="time"
                    value={getTimeFromISO(editingEntry.startTime)}
                    onChange={(e) => updateTime('startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input
                    type="time"
                    value={getTimeFromISO(editingEntry.endTime)}
                    onChange={(e) => updateTime('endTime', e.target.value)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingEntryId}
        onOpenChange={(open) => !open && setDeletingEntryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              time entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
