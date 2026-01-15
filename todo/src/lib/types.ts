export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  title: string
  completed: boolean
  priority: Priority
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface TodoList {
  id: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}
