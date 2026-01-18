import { NextResponse } from 'next/server'
import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
  safePath,
} from '@moldable-ai/storage'
import { Project, TimeEntry, formatHoursDecimal } from '@/lib/types'
import { format } from 'date-fns'

function getEntriesPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'entries.json')
}

function getProjectsPath(workspaceId?: string): string {
  return safePath(getAppDataDir(workspaceId), 'projects.json')
}

export async function GET(request: Request) {
  const workspaceId = getWorkspaceFromRequest(request)
  const url = new URL(request.url)
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const exportFormat = url.searchParams.get('format') || 'csv'
  const projectId = url.searchParams.get('projectId')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'Start and end date are required' },
      { status: 400 },
    )
  }

  const entries = await readJson<TimeEntry[]>(getEntriesPath(workspaceId), [])
  const projects = await readJson<Project[]>(getProjectsPath(workspaceId), [])

  const projectMap = new Map(projects.map((p) => [p.id, p]))

  // Filter entries by date range (parse as local time)
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T23:59:59.999`)

  let filteredEntries = entries.filter((e) => {
    const entryDate = new Date(e.startTime)
    return entryDate >= start && entryDate <= end && e.endTime
  })

  // Filter by project if specified
  if (projectId) {
    filteredEntries = filteredEntries.filter((e) => e.projectId === projectId)
  }

  // Sort by date
  filteredEntries.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )

  if (exportFormat === 'json') {
    const jsonData = filteredEntries.map((entry) => {
      const project = projectMap.get(entry.projectId)
      return {
        date: format(new Date(entry.startTime), 'yyyy-MM-dd'),
        project: project?.name || 'Unknown',
        description: entry.description,
        startTime: format(new Date(entry.startTime), 'HH:mm'),
        endTime: entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
        hours: formatHoursDecimal(entry.duration || 0),
        durationSeconds: entry.duration || 0,
      }
    })

    return NextResponse.json(jsonData, {
      headers: {
        'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.json"`,
      },
    })
  }

  // CSV export
  const csvHeaders = [
    'Date',
    'Project',
    'Description',
    'Start Time',
    'End Time',
    'Hours',
  ]
  const csvRows = filteredEntries.map((entry) => {
    const project = projectMap.get(entry.projectId)
    return [
      format(new Date(entry.startTime), 'yyyy-MM-dd'),
      `"${(project?.name || 'Unknown').replace(/"/g, '""')}"`,
      `"${entry.description.replace(/"/g, '""')}"`,
      format(new Date(entry.startTime), 'HH:mm'),
      entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '',
      formatHoursDecimal(entry.duration || 0),
    ].join(',')
  })

  // Add totals row
  const totalSeconds = filteredEntries.reduce(
    (sum, e) => sum + (e.duration || 0),
    0,
  )
  csvRows.push('')
  csvRows.push(`Total,,,,,"${formatHoursDecimal(totalSeconds)}"`)

  const csv = [csvHeaders.join(','), ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="time-entries-${startDate}-${endDate}.csv"`,
    },
  })
}
