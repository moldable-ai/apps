import { GraduationCap, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '@moldable-ai/ui'
import { type CourseSummary, DIFFICULTY_LABELS } from '../../shared/course'

interface CoursesRowProps {
  summaries: CourseSummary[]
  onOpenCourse: (courseId: string) => void
}

export function CoursesRow({ summaries, onOpenCourse }: CoursesRowProps) {
  if (summaries.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <CourseCard
          key={summary.course.id}
          summary={summary}
          onOpen={() => onOpenCourse(summary.course.id)}
        />
      ))}
    </div>
  )
}

function CourseCard({
  summary,
  onOpen,
}: {
  summary: CourseSummary
  onOpen: () => void
}) {
  const { course, totalLessons, completedCount } = summary
  const progress = totalLessons > 0 ? completedCount / totalLessons : 0
  const tone = course.tone
  const style = { ['--card-tone' as string]: tone } as CSSProperties
  const started = completedCount > 0
  const completed = completedCount >= totalLessons && totalLessons > 0

  return (
    <button
      type="button"
      onClick={onOpen}
      style={style}
      className={cn(
        'piano-card-tone group relative isolate flex h-36 cursor-pointer flex-col overflow-hidden rounded-2xl text-left',
        'border-border/50 border shadow-sm',
        'transition-all duration-300 ease-out',
        'focus-visible:ring-primary/40 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2',
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: tone }}
          >
            {DIFFICULTY_LABELS[course.difficulty]}
          </p>
          <GraduationCap
            className="size-3.5 opacity-60"
            style={{ color: tone }}
          />
        </div>
        <h3 className="piano-serif text-foreground line-clamp-1 text-xl font-semibold leading-tight tracking-tight">
          {course.title}
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-[12px] leading-4">
          {course.subtitle}
        </p>
      </div>
      <div className="bg-background/60 border-border/40 relative z-10 border-t px-4 pb-3 pt-2 backdrop-blur-sm">
        <div className="bg-muted/45 relative h-1 overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
            style={{
              width: `${progress * 100}%`,
              background: tone,
            }}
          />
        </div>
        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-[11px]">
          <span className="piano-mono">
            {completedCount} of {totalLessons} · ~{course.estimatedMinutes} min
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium',
              'bg-foreground/[0.04] text-foreground/70',
              'group-hover:bg-foreground group-hover:text-background transition-colors',
            )}
          >
            <Play className="size-2.5" />
            {completed ? 'Review' : started ? 'Continue' : 'Start'}
          </span>
        </div>
      </div>
    </button>
  )
}
