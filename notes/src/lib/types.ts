export interface Note {
  id: string
  title: string
  content: string
  isPinned: boolean
  isArchived: boolean
  isDeleted: boolean
  labels: string[]
  color?: string
  createdAt: string
  updatedAt: string
}
