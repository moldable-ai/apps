import { useQuery } from '@tanstack/react-query'
import { Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useWorkspace } from '@moldable-ai/ui'
import {
  type CourseSummary,
  type CoursesListResponse,
  DIFFICULTY_LABELS,
  findFirstIncompleteLessonId,
  findLesson,
  getAllLessons,
} from '../shared/course'

interface CoursesQueryResult {
  data?: CoursesListResponse
  isLoading: boolean
  isError: boolean
}

function useCourses(): CoursesQueryResult {
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

function pickPrimary(summaries: CourseSummary[]): CourseSummary | null {
  if (summaries.length === 0) return null
  // Prefer in-progress (started but not finished)
  const inProgress = summaries.find(
    (s) => s.completedCount > 0 && s.completedCount < s.totalLessons,
  )
  if (inProgress) return inProgress
  // Otherwise the first not-yet-finished one (likely Beginnings)
  const notFinished = summaries.find((s) => s.completedCount < s.totalLessons)
  if (notFinished) return notFinished
  // Everything done — show the first
  return summaries[0]
}

function nextLessonInfo(summary: CourseSummary): {
  title: string
  teaser: string
} | null {
  const target =
    summary.progress.currentLessonId ??
    findFirstIncompleteLessonId(summary.course, summary.progress)
  if (!target) return null
  const lesson = findLesson(summary.course, target)
  if (!lesson) return null
  return {
    title: lesson.titleOverride ?? lesson.teaser,
    teaser: lesson.teaser,
  }
}

function PrimaryCourseBlock({ summary }: { summary: CourseSummary }) {
  const { course, progress, totalLessons, completedCount } = summary
  const tone = course.tone
  const style = { ['--card-tone' as string]: tone } as CSSProperties
  const next = nextLessonInfo(summary)
  const pct = totalLessons > 0 ? completedCount / totalLessons : 0
  const started = completedCount > 0
  const finished = completedCount >= totalLessons && totalLessons > 0
  const ctaLabel = finished ? 'Review' : started ? 'Continue' : 'Start'

  return (
    <div
      className="piano-card-tone border-border/50 relative isolate flex flex-col gap-2 overflow-hidden rounded-xl border p-3"
      style={style}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="piano-mono truncate text-[9px] font-medium uppercase tracking-[0.18em]"
          style={{ color: tone }}
        >
          {DIFFICULTY_LABELS[course.difficulty]} · {completedCount}/
          {totalLessons}
        </p>
        <span className="piano-mono text-muted-foreground/85 shrink-0 text-[9px]">
          ~{course.estimatedMinutes}m
        </span>
      </div>
      <h3 className="piano-serif text-foreground line-clamp-1 text-[14px] font-semibold leading-tight tracking-tight">
        {course.title}
      </h3>

      <div className="bg-muted/45 relative h-1 w-full overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${pct * 100}%`, background: tone }}
        />
      </div>

      {next ? (
        <div className="mt-1">
          <p
            className="piano-mono text-[8.5px] font-medium uppercase tracking-[0.16em]"
            style={{ color: tone }}
          >
            {finished ? 'Last lesson' : started ? 'Next' : 'Start with'}
          </p>
          <p className="piano-serif text-foreground line-clamp-2 text-[11.5px] font-semibold leading-4">
            {next.title}
          </p>
        </div>
      ) : null}

      <div
        className="mt-1 inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ background: tone, color: 'var(--background)' }}
      >
        <Play className="size-2.5" />
        {ctaLabel}
      </div>
    </div>
  )
}

function MiniCourseRow({ summary }: { summary: CourseSummary }) {
  const { course, totalLessons, completedCount } = summary
  const tone = course.tone
  const pct = totalLessons > 0 ? completedCount / totalLessons : 0
  return (
    <div className="flex min-w-0 items-center gap-2 px-2.5 py-1.5">
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: tone }}
      />
      <span className="piano-serif text-foreground/90 min-w-0 flex-1 truncate text-[11.5px] font-semibold leading-tight">
        {course.title}
      </span>
      <div className="bg-muted/45 relative h-1 w-12 shrink-0 overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct * 100}%`, background: tone }}
        />
      </div>
      <span className="piano-mono text-muted-foreground/85 w-9 shrink-0 text-right text-[9.5px] tabular-nums">
        {completedCount}/{totalLessons}
      </span>
    </div>
  )
}

export function Widget() {
  const coursesQuery = useCourses()
  const summaries = coursesQuery.data?.courses ?? []
  const primary = pickPrimary(summaries)
  const others = primary
    ? summaries.filter((s) => s.course.id !== primary.course.id)
    : summaries

  return (
    <div className="bg-background flex h-full flex-col overflow-hidden p-2">
      {coursesQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-2.5 py-2 text-[11px]">
          Could not load courses
        </div>
      ) : coursesQuery.isLoading ? (
        <div className="bg-muted/40 h-[120px] animate-pulse rounded-xl" />
      ) : primary ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <PrimaryCourseBlock summary={primary} />
          {others.length > 0 ? (
            <div className="border-border/40 flex flex-col overflow-hidden rounded-lg border">
              {others.slice(0, 3).map((summary) => (
                <MiniCourseRow key={summary.course.id} summary={summary} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-muted-foreground/85 piano-serif flex h-full items-center justify-center text-[12px] italic">
          No courses yet
        </div>
      )}
    </div>
  )
}
