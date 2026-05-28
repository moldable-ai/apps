import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '@moldable-ai/ui'
import type {
  CourseDetailResponse,
  CourseSummary,
  CoursesListResponse,
} from '../shared/course'

export function useCourses() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['courses', workspaceId],
    queryFn: async () => {
      const res = await fetchWithWorkspace('/api/courses')
      if (!res.ok) throw new Error('Failed to load courses')
      return (await res.json()) as CoursesListResponse
    },
    staleTime: 30_000,
  })
}

export function useCourse(courseId: string | null) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  return useQuery({
    queryKey: ['course', courseId, workspaceId],
    enabled: Boolean(courseId),
    queryFn: async () => {
      const res = await fetchWithWorkspace(`/api/courses/${courseId}`)
      if (!res.ok) throw new Error('Failed to load course')
      return (await res.json()) as CourseDetailResponse
    },
  })
}

export function useCourseProgressMutations(courseId: string) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ['course', courseId, workspaceId],
    })
    void queryClient.invalidateQueries({ queryKey: ['courses', workspaceId] })
  }

  const complete = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetchWithWorkspace(
        `/api/courses/${courseId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId }),
        },
      )
      if (!res.ok) throw new Error('Failed to mark lesson complete')
      return (await res.json()) as CourseDetailResponse
    },
    onSuccess: invalidate,
  })

  const uncomplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const res = await fetchWithWorkspace(
        `/api/courses/${courseId}/uncomplete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId }),
        },
      )
      if (!res.ok) throw new Error('Failed to undo completion')
      return (await res.json()) as CourseDetailResponse
    },
    onSuccess: invalidate,
  })

  const setCurrent = useMutation({
    mutationFn: async (lessonId: string | null) => {
      const res = await fetchWithWorkspace(`/api/courses/${courseId}/current`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      })
      if (!res.ok) throw new Error('Failed to set current lesson')
      return (await res.json()) as CourseDetailResponse
    },
    onSuccess: invalidate,
  })

  const reset = useMutation({
    mutationFn: async () => {
      const res = await fetchWithWorkspace(`/api/courses/${courseId}/reset`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to reset course')
      return (await res.json()) as CourseDetailResponse
    },
    onSuccess: invalidate,
  })

  return {
    complete: (lessonId: string) => complete.mutateAsync(lessonId),
    uncomplete: (lessonId: string) => uncomplete.mutateAsync(lessonId),
    setCurrent: (lessonId: string | null) => setCurrent.mutateAsync(lessonId),
    reset: () => reset.mutateAsync(),
    isPending:
      complete.isPending ||
      uncomplete.isPending ||
      setCurrent.isPending ||
      reset.isPending,
  }
}

export type { CourseSummary }
