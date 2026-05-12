import { normalizeProjectKey } from '@/shared/task-utils'
import type {
  Project,
  Task,
  TaskAttachment,
  TaskLabel,
  TaskStatus,
} from '@/shared/types'

export interface ProjectFormState {
  name: string
  key: string
  summary: string
  description: string
  logoUrl: string | null
  websiteUrl: string
  labelsText: string
  draftLabels: TaskLabel[]
}

export interface TaskFormState {
  title: string
  description: string
  acceptanceCriteria: string
  attachments: TaskAttachment[]
  status: TaskStatus
  priority: Task['priority']
  labelsText: string
  draftLabels: TaskLabel[]
}

const DEFAULT_LABEL_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
]

export function emptyProjectForm(): ProjectFormState {
  return {
    name: '',
    key: '',
    summary: '',
    description: '',
    logoUrl: null,
    websiteUrl: '',
    labelsText: '',
    draftLabels: [],
  }
}

export function projectToForm(project: Project): ProjectFormState {
  return {
    name: project.name,
    key: normalizeProjectKey(project.key),
    summary: project.summary,
    description: project.description,
    logoUrl: project.logoUrl ?? null,
    websiteUrl: project.websiteUrl ?? '',
    labelsText: project.labels.map((label) => label.name).join(', '),
    draftLabels: project.labels,
  }
}

export function emptyTaskForm(): TaskFormState {
  return {
    title: '',
    description: '',
    acceptanceCriteria: '',
    attachments: [],
    status: 'open',
    priority: 'none',
    labelsText: '',
    draftLabels: [],
  }
}

export function taskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description,
    acceptanceCriteria: task.acceptanceCriteria ?? '',
    attachments: task.attachments ?? [],
    status: task.status,
    priority: task.priority,
    labelsText: task.labels.map((label) => label.name).join(', '),
    draftLabels: task.labels,
  }
}

export function parseLabels(
  value: string,
  existing: TaskLabel[] = [],
): TaskLabel[] {
  const existingByName = new Map(
    existing.map((label) => [label.name.toLowerCase(), label]),
  )

  return value
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((name, index) => {
      const existingLabel = existingByName.get(name.toLowerCase())
      return (
        existingLabel ?? {
          id: `label-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name,
          color: DEFAULT_LABEL_COLORS[index % DEFAULT_LABEL_COLORS.length],
        }
      )
    })
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}
