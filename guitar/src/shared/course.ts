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

export interface GuitarCourse {
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
  course: GuitarCourse
  progress: CourseProgress
  totalLessons: number
  completedCount: number
}

export interface CoursesListResponse {
  courses: CourseSummary[]
}

export interface CourseDetailResponse {
  course: GuitarCourse
  progress: CourseProgress
}

export const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function getTotalLessons(course: GuitarCourse): number {
  return course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  )
}

export function getAllLessons(course: GuitarCourse): CourseLesson[] {
  return course.modules.flatMap((module) => module.lessons)
}

export function findLesson(
  course: GuitarCourse,
  lessonId: string,
): CourseLesson | null {
  for (const module of course.modules) {
    const found = module.lessons.find((lesson) => lesson.id === lessonId)
    if (found) return found
  }
  return null
}

export function findModuleForLesson(
  course: GuitarCourse,
  lessonId: string,
): CourseModule | null {
  return (
    course.modules.find((module) =>
      module.lessons.some((lesson) => lesson.id === lessonId),
    ) ?? null
  )
}

export function findNextLessonId(
  course: GuitarCourse,
  lessonId: string,
): string | null {
  const lessons = getAllLessons(course)
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index === -1 || index === lessons.length - 1) return null
  return lessons[index + 1].id
}

export function findPreviousLessonId(
  course: GuitarCourse,
  lessonId: string,
): string | null {
  const lessons = getAllLessons(course)
  const index = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (index <= 0) return null
  return lessons[index - 1].id
}

export function findFirstIncompleteLessonId(
  course: GuitarCourse,
  progress: CourseProgress,
): string | null {
  const completed = new Set(progress.completedLessonIds)
  for (const lesson of getAllLessons(course)) {
    if (!completed.has(lesson.id)) return lesson.id
  }
  return null
}
