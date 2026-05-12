import type { Project, Task, TaskLabel, TaskStatus } from './types'

export const PROJECT_KEY_LENGTH = 3 as const

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Done',
  closed: 'Closed',
}

export const STATUS_ORDER: TaskStatus[] = [
  'backlog',
  'open',
  'in_progress',
  'completed',
  'closed',
]

export const PRIORITY_LABELS: Record<Task['priority'], string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const PRIORITY_ORDER: Task['priority'][] = [
  'high',
  'medium',
  'low',
  'none',
]

export function normalizeProjectKey(input: string): string {
  return (input ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, PROJECT_KEY_LENGTH)
}

export function makeProjectKey(name: string, fallback = 'TSK'): string {
  const words = (name ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)

  if (words.length >= PROJECT_KEY_LENGTH) {
    return words
      .slice(0, PROJECT_KEY_LENGTH)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  const compact = normalizeProjectKey(words.join('') || name)
  if (compact.length === PROJECT_KEY_LENGTH) return compact

  return normalizeProjectKey(`${compact}${fallback}`)
}

export function taskKey(
  project: Pick<Project, 'key'>,
  task: Pick<Task, 'number'>,
) {
  return `${project.key}-${task.number}`
}

export function statusCount(tasks: Task[], status: TaskStatus): number {
  return tasks.filter((task) => task.status === status).length
}

export function getAllLabels(project: Project, tasks: Task[]): TaskLabel[] {
  const byId = new Map<string, TaskLabel>()
  for (const label of project.labels) byId.set(label.id, label)
  for (const task of tasks) {
    for (const label of task.labels) byId.set(label.id, label)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function activeTaskCount(tasks: Task[]): number {
  return tasks.filter((task) => !['completed', 'closed'].includes(task.status))
    .length
}

export function completedTaskCount(tasks: Task[]): number {
  return tasks.filter((task) => task.status === 'completed').length
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
