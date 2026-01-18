'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Calendar as CalendarIcon,
  Download,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { useState } from 'react'
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  downloadFile,
  useWorkspace,
} from '@moldable-ai/ui'
import { Project } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'

type DatePreset =
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'custom'

export function ExportDialog() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const [preset, setPreset] = useState<DatePreset>('this-week')
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined)
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined)
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/projects')
      return res.json() as Promise<Project[]>
    },
  })

  const getDateRange = (): { start: string; end: string } => {
    const now = new Date()

    switch (preset) {
      case 'this-week': {
        const start = startOfWeek(now, { weekStartsOn: 0 })
        const end = endOfWeek(now, { weekStartsOn: 0 })
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
        }
      }
      case 'last-week': {
        const lastWeek = subWeeks(now, 1)
        const start = startOfWeek(lastWeek, { weekStartsOn: 0 })
        const end = endOfWeek(lastWeek, { weekStartsOn: 0 })
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
        }
      }
      case 'this-month': {
        const start = startOfMonth(now)
        const end = endOfMonth(now)
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
        }
      }
      case 'last-month': {
        const lastMonth = subMonths(now, 1)
        const start = startOfMonth(lastMonth)
        const end = endOfMonth(lastMonth)
        return {
          start: format(start, 'yyyy-MM-dd'),
          end: format(end, 'yyyy-MM-dd'),
        }
      }
      case 'custom':
        return {
          start: customStart ? format(customStart, 'yyyy-MM-dd') : '',
          end: customEnd ? format(customEnd, 'yyyy-MM-dd') : '',
        }
      default:
        return { start: '', end: '' }
    }
  }

  const handleExport = async () => {
    const { start, end } = getDateRange()
    if (!start || !end) return

    setIsExporting(true)

    try {
      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
        format: exportFormat,
      })

      if (selectedProject !== 'all') {
        params.set('projectId', selectedProject)
      }

      const res = await fetchWithWorkspace(`/api/export?${params}`)
      const filename = `time-entries-${start}-${end}.${exportFormat}`

      if (exportFormat === 'csv') {
        const csvData = await res.text()
        await downloadFile({
          filename,
          data: csvData,
          mimeType: 'text/csv',
        })
      } else {
        const jsonData = await res.json()
        await downloadFile({
          filename,
          data: JSON.stringify(jsonData, null, 2),
          mimeType: 'application/json',
        })
      }

      setIsOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const { start, end } = getDateRange()
  const canExport = start && end

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Time Entries</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date range preset */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Select
              value={preset}
              onValueChange={(v) => setPreset(v as DatePreset)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom date inputs */}
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customStart && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {customStart
                        ? format(customStart, 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !customEnd && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {customEnd
                        ? format(customEnd, 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Project filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
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

          {/* Format selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={cn(
                  'border-border hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition-colors',
                  exportFormat === 'csv' && 'border-primary bg-primary/5',
                )}
              >
                <FileSpreadsheet className="size-5" />
                <span className="font-medium">CSV</span>
              </button>
              <button
                onClick={() => setExportFormat('json')}
                className={cn(
                  'border-border hover:bg-muted/50 flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 transition-colors',
                  exportFormat === 'json' && 'border-primary bg-primary/5',
                )}
              >
                <FileJson className="size-5" />
                <span className="font-medium">JSON</span>
              </button>
            </div>
          </div>

          {/* Export button */}
          <Button
            onClick={handleExport}
            className="w-full"
            disabled={!canExport || isExporting}
          >
            {isExporting ? 'Exporting...' : 'Download Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
