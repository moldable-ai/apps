export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface CourseLesson {
  /** Stable lesson id for progress tracking. */
  id: string
  /** Song id this lesson points to. The song must have `song.tutorial`. */
  songId: string
  /** Optional override of the title shown in course context. */
  titleOverride?: string
  /** Short teaser shown in the course outline. */
  teaser: string
}

export interface CourseModule {
  id: string
  title: string
  description: string
  lessons: CourseLesson[]
}

export interface PianoCourse {
  id: string
  title: string
  subtitle: string
  description: string
  difficulty: CourseDifficulty
  estimatedMinutes: number
  tone: string
  modules: CourseModule[]
}

export interface CourseProgress {
  courseId: string
  completedLessonIds: string[]
  currentLessonId: string | null
  updatedAt: string
}

export interface CourseSummary {
  course: PianoCourse
  progress: CourseProgress
  totalLessons: number
  completedCount: number
}

export interface CoursesListResponse {
  courses: CourseSummary[]
}

export interface CourseDetailResponse {
  course: PianoCourse
  progress: CourseProgress
}

export const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function getTotalLessons(course: PianoCourse): number {
  return course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  )
}

export function getAllLessons(course: PianoCourse): CourseLesson[] {
  return course.modules.flatMap((module) => module.lessons)
}

export function findLesson(
  course: PianoCourse,
  lessonId: string,
): CourseLesson | null {
  for (const module of course.modules) {
    const found = module.lessons.find((lesson) => lesson.id === lessonId)
    if (found) return found
  }
  return null
}

export function findModuleForLesson(
  course: PianoCourse,
  lessonId: string,
): CourseModule | null {
  return (
    course.modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === lessonId),
    ) ?? null
  )
}

export function findNextLessonId(
  course: PianoCourse,
  lessonId: string,
): string | null {
  const lessons = getAllLessons(course)
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1 || index === lessons.length - 1) return null
  return lessons[index + 1].id
}

export function findPreviousLessonId(
  course: PianoCourse,
  lessonId: string,
): string | null {
  const lessons = getAllLessons(course)
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index <= 0) return null
  return lessons[index - 1].id
}

export function findFirstIncompleteLessonId(
  course: PianoCourse,
  progress: CourseProgress,
): string | null {
  const completed = new Set(progress.completedLessonIds)
  for (const lesson of getAllLessons(course)) {
    if (!completed.has(lesson.id)) return lesson.id
  }
  return null
}
