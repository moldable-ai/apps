export const TASK_STATUSES = [
  'backlog',
  'open',
  'in_progress',
  'completed',
  'closed',
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface TaskAttachment {
  id: string
  name: string
  size: number
  type: string
  path?: string
  dataUrl?: string
  createdAt: string
}

export interface TaskComment {
  id: string
  content: string
  authorName: string
  authorInitial: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  key: string
  summary: string
  description: string
  logoUrl: string | null
  websiteUrl: string
  labels: TaskLabel[]
  nextTaskNumber: number
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  projectId: string
  number: number
  title: string
  description: string
  acceptanceCriteria: string
  attachments: TaskAttachment[]
  comments: TaskComment[]
  status: TaskStatus
  labels: TaskLabel[]
  priority: 'none' | 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface TasksData {
  projects: Project[]
  tasks: Task[]
}

export interface ProjectWithTasks extends Project {
  tasks: Task[]
}
