export interface Project {
  id: string
  name: string
  color: string
  createdAt: string
  archived?: boolean
}

export interface TimeEntry {
  id: string
  projectId: string
  description: string
  startTime: string // ISO string
  endTime?: string // ISO string, undefined if running
  duration?: number // calculated duration in seconds
}

export interface TimerState {
  isRunning: boolean
  projectId: string | null
  description: string
  startTime: string | null
  lastProjectId?: string | null // Remember last used project
}

// Color palette for projects
export const PROJECT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#0ea5e9', // sky
]

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function formatDurationHuman(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0 && minutes === 0) {
    return '< 1m'
  }
  if (hours === 0) {
    return `${minutes}m`
  }
  if (minutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${minutes}m`
}

export function formatHoursDecimal(seconds: number): string {
  const hours = seconds / 3600
  return hours.toFixed(2)
}
