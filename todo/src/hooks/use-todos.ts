import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable/ui'
import type { Todo } from '@/lib/types'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useTodos() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useQuery({
    queryKey: ['todos', workspaceId],
    queryFn: async (): Promise<Todo[]> => {
      const res = await fetchWithWorkspace('/api/todos')
      if (!res.ok) throw new Error('Failed to fetch todos')
      const data = await res.json()
      return data.map((todo: Todo) => ({
        ...todo,
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        createdAt: new Date(todo.createdAt),
        updatedAt: new Date(todo.updatedAt),
      }))
    },
  })
}

export function useSaveTodos() {
  const queryClient = useQueryClient()
  const { workspaceId, fetchWithWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (todos: Todo[]): Promise<void> => {
      const res = await fetchWithWorkspace('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(todos),
      })
      if (!res.ok) throw new Error('Failed to save todos')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', workspaceId] })
    },
  })
}

export function useUpdateTodosCache() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()

  return (updater: (prev: Todo[]) => Todo[]) => {
    queryClient.setQueryData<Todo[]>(['todos', workspaceId], (prev) =>
      updater(prev ?? []),
    )
  }
}
