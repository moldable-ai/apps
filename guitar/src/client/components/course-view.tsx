import {
  ArrowLeft,
  Check,
  Circle,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  cn,
} from '@moldable-ai/ui'
import {
  type CourseLesson,
  DIFFICULTY_LABELS,
  findFirstIncompleteLessonId,
  getAllLessons,
  getTotalLessons,
} from '../../shared/course'
import { useCourse, useCourseProgressMutations } from '../use-courses'

interface CourseViewProps {
  courseId: string
  onBack: () => void
  onOpenLesson: (lesson: CourseLesson, courseId: string) => void
}

export function CourseView({
  courseId,
  onBack,
  onOpenLesson,
}: CourseViewProps) {
  const courseQuery = useCourse(courseId)
  const mutations = useCourseProgressMutations(courseId)
  const [confirmReset, setConfirmReset] = useState(false)

  const course = courseQuery.data?.course ?? null
  const progress = courseQuery.data?.progress ?? null

  const completed = useMemo(
    () => new Set(progress?.completedLessonIds ?? []),
    [progress?.completedLessonIds],
  )

  const totalLessons = course ? getTotalLessons(course) : 0
  const completedCount = completed.size
  const progressPct = totalLessons > 0 ? completedCount / totalLessons : 0

  const currentLessonId =
    progress?.currentLessonId ??
    (course && progress ? findFirstIncompleteLessonId(course, progress) : null)

  const tone = course?.tone ?? '#10b981'

  if (courseQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    )
  }

  if (!course || !progress) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-muted-foreground text-sm">
          Could not load this course.
        </p>
        <Button onClick={onBack} variant="outline" size="sm">
          Back
        </Button>
      </div>
    )
  }

  const style = { ['--card-tone' as string]: tone } as CSSProperties

  const handleContinue = () => {
    const lessonId = currentLessonId ?? getAllLessons(course)[0]?.id
    if (!lessonId) return
    const lesson = getAllLessons(course).find((l) => l.id === lessonId)
    if (lesson) onOpenLesson(lesson, course.id)
  }

  return (
    <div className="animate-guitar-view-forward relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="guitar-no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div
          className="mx-auto w-full max-w-3xl px-6 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6"
          style={style}
        >
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground -ml-1.5 mb-4 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Library
          </button>

          <section className="mb-8">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{ color: tone }}
            >
              {DIFFICULTY_LABELS[course.difficulty]} · ~
              {course.estimatedMinutes} min
            </p>
            <h1 className="guitar-serif text-foreground mt-2 text-4xl font-semibold leading-tight tracking-tight">
              {course.title}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
              {course.description}
            </p>

            <div className="mt-6 flex items-center gap-4">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer gap-1.5 rounded-full px-4 text-[12.5px]"
                onClick={handleContinue}
              >
                <Play className="size-3.5" />
                {completedCount === 0
                  ? 'Start course'
                  : completedCount === totalLessons
                    ? 'Review course'
                    : 'Continue'}
              </Button>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="bg-muted/40 relative h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                    style={{
                      width: `${progressPct * 100}%`,
                      background: tone,
                    }}
                  />
                </div>
                <span className="text-muted-foreground guitar-mono shrink-0 text-[11px] tabular-nums">
                  {completedCount} of {totalLessons}
                </span>
              </div>
              {completedCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer gap-1.5 rounded-full px-3 text-[11px]"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw className="size-3" />
                  Reset
                </Button>
              ) : null}
            </div>
          </section>

          <div className="space-y-8">
            {course.modules.map((module) => (
              <section key={module.id}>
                <div className="mb-3">
                  <p className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.18em]">
                    {module.title}
                  </p>
                  <p className="text-muted-foreground/85 mt-1 max-w-xl text-[12.5px] leading-5">
                    {module.description}
                  </p>
                </div>
                <div className="border-border/40 overflow-hidden rounded-2xl border">
                  {module.lessons.map((lesson, idx) => {
                    const isDone = completed.has(lesson.id)
                    const isCurrent = lesson.id === currentLessonId
                    return (
                      <div
                        key={lesson.id}
                        className={cn(
                          'group/lesson border-border/30 flex items-center gap-3 border-b px-4 py-3 transition-colors last:border-b-0',
                          isCurrent && 'bg-muted/20',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isDone) {
                              void mutations.uncomplete(lesson.id)
                            } else {
                              void mutations.complete(lesson.id)
                            }
                          }}
                          aria-label={
                            isDone ? 'Mark incomplete' : 'Mark complete'
                          }
                          className={cn(
                            'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors',
                            isDone
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border/70 hover:border-foreground/60',
                          )}
                          style={
                            isCurrent && !isDone
                              ? { borderColor: tone }
                              : undefined
                          }
                        >
                          {isDone ? (
                            <Check className="size-3" strokeWidth={3} />
                          ) : isCurrent ? (
                            <Circle
                              className="size-2 fill-current"
                              style={{ color: tone }}
                            />
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenLesson(lesson, course.id)}
                          className="hover:bg-muted/30 -my-2 -ml-1 flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground/70 guitar-mono shrink-0 text-[12px] tabular-nums leading-none">
                                {idx + 1}.
                              </span>
                              <span
                                className={cn(
                                  'guitar-serif text-foreground translate-y-[1px] truncate text-[15px] font-semibold leading-none tracking-tight',
                                  isDone && 'text-muted-foreground/75',
                                )}
                              >
                                {lesson.titleOverride ?? lesson.teaser}
                              </span>
                            </div>
                            {lesson.titleOverride ? (
                              <p className="text-muted-foreground mt-1 truncate text-[12px] leading-5">
                                {lesson.teaser}
                              </p>
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              'guitar-mono shrink-0 text-[10.5px] uppercase tracking-wider opacity-0 transition-opacity group-hover/lesson:opacity-100',
                              isCurrent && 'opacity-100',
                            )}
                            style={{ color: tone }}
                          >
                            {isDone
                              ? 'Review'
                              : isCurrent
                                ? 'Continue'
                                : 'Open'}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="guitar-serif text-lg">
              Reset course progress?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll go back to lesson 1. The lesson songs themselves stay
              in your library — only the completion marks are cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                event.preventDefault()
                await mutations.reset()
                setConfirmReset(false)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
