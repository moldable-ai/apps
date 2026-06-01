import {
  BookOpen,
  Check,
  ListChecks,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@moldable-ai/ui'
import type { GuitarInstrumentPack } from '../../shared/audio'
import {
  type GuitarNote,
  type GuitarSong,
  type SongTutorialSection,
  getMeterLabel,
  getTempoLabel,
} from '../../shared/song'
import {
  KEYBOARD_HEIGHT,
  KEYBOARD_WIDTH,
  assignFingerings,
  formatDuration,
  midiToFretPosition,
  midiToTone,
  positionCenterX,
} from '../guitar-utils'
import type { FretPosition } from '../guitar-utils'
import type { AudioLoadState } from '../use-guitar-audio'
import { FallingNotes } from './falling-notes'
import { GuitarFretboard } from './guitar-fretboard'
import { SoundPicker } from './sound-picker'

interface FretboardDot extends FretPosition {
  tone: string
}

interface PracticeViewProps {
  song: GuitarSong
  practiceNotes: GuitarNote[]
  duration: number
  cursor: number
  visualCursor: number
  isPlaying: boolean
  loadState: AudioLoadState
  soundLoadingLabel?: string | null
  isSongLoading: boolean
  isSongError: boolean
  onBack: () => void
  onTogglePlay: () => void
  onRestart: () => void
  onSeek: (cursor: number) => void
  onScrubStart: () => void
  onScrubEnd: (cursor: number) => void
  onPreviewKey: (midi: number) => void
  playbackSpeed: number
  onPlaybackSpeedChange: (speed: number) => void
  instrumentPacks: GuitarInstrumentPack[]
  activePackId: string | null
  activeInstrumentId: string | null
  onActiveInstrumentChange: (packId: string, instrumentId: string) => void
  onInstallPack: (packId: string) => Promise<void>
  installingPackIds: Set<string>
  isAudioOptionsLoading: boolean
  courseContext?: CourseContext | null
}

export interface CourseContext {
  courseId: string
  courseTitle: string
  courseTone: string
  lessonId: string
  lessonIndex: number
  lessonCount: number
  isLessonComplete: boolean
  isLastLesson: boolean
  /** Mark current complete (if not yet) and advance — or finish on last lesson. */
  onContinue: () => void
  /** Total tutorial parts in this lesson. */
  partCount: number
  /** Index of the part the cursor is currently inside. */
  currentPartIndex: number
  /** Seek to the start of the next tutorial part. */
  onNextPart: () => void
  /** Seek to the start of a specific tutorial part by index. */
  onSeekPart: (partIndex: number) => void
}

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5]
const TUTORIAL_PANEL_WIDTH = 352

function formatSpeed(speed: number) {
  if (Number.isInteger(speed)) return `${speed}x`
  return `${speed.toFixed(2).replace(/0$/, '').replace(/\.$/, '')}x`
}

function TutorialBullets({
  title,
  items,
  icon,
}: {
  title: string
  items: string[] | undefined
  icon: ReactNode
}) {
  if (!items?.length) return null
  return (
    <section className="space-y-2">
      <div className="text-muted-foreground flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="text-foreground/90 relative pl-4 text-[12px] leading-5 before:absolute before:left-1 before:top-2 before:size-1 before:rounded-full before:bg-current before:opacity-35"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CourseHeaderStrip({ context }: { context: CourseContext }) {
  const {
    isLessonComplete,
    isLastLesson,
    courseTone,
    partCount,
    currentPartIndex,
    onNextPart,
  } = context
  const hasParts = partCount > 1
  const onLastPart = !hasParts || currentPartIndex >= partCount - 1

  // The primary button walks the user part-by-part through the lesson, then
  // advances to the next lesson only once they've reached the last part.
  let label: string
  let onClick: () => void
  if (!onLastPart) {
    label = 'Next part →'
    onClick = onNextPart
  } else if (isLessonComplete && isLastLesson) {
    label = 'Back to course'
    onClick = context.onContinue
  } else if (isLastLesson) {
    label = 'Finish'
    onClick = context.onContinue
  } else {
    label = 'Next lesson →'
    onClick = context.onContinue
  }

  // On the final part the button advances the lesson, so render it as the
  // accent-filled CTA. While walking parts it's a quieter outline so it reads
  // as "keep going within this lesson".
  const filled = onLastPart && !isLessonComplete

  return (
    <div
      className="border-border/40 flex flex-col gap-2 border-b px-4 pb-3 pt-3"
      style={{ borderTopColor: courseTone }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="guitar-mono truncate text-[10px] font-medium uppercase tracking-[0.16em]"
          style={{ color: courseTone }}
        >
          {context.courseTitle}
        </p>
        <span className="text-muted-foreground/80 guitar-mono shrink-0 text-[10px] tabular-nums">
          Lesson {context.lessonIndex + 1} of {context.lessonCount}
        </span>
      </div>

      {hasParts ? (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1">
            {Array.from({ length: partCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => context.onSeekPart(i)}
                aria-label={`Go to part ${i + 1}`}
                aria-current={i === currentPartIndex ? 'step' : undefined}
                className="group/seg flex flex-1 cursor-pointer items-center py-1.5"
              >
                <span
                  className="h-1 w-full rounded-full transition-[background,opacity,height] group-hover/seg:h-1.5"
                  style={{
                    background:
                      i <= currentPartIndex
                        ? courseTone
                        : 'color-mix(in oklch, var(--muted-foreground) 28%, transparent)',
                    opacity:
                      i === currentPartIndex
                        ? 1
                        : i < currentPartIndex
                          ? 0.55
                          : 1,
                  }}
                />
              </button>
            ))}
          </div>
          <span className="text-muted-foreground/80 guitar-mono shrink-0 text-[10px] tabular-nums">
            Part {currentPartIndex + 1}/{partCount}
          </span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full text-[12.5px] font-medium transition-opacity hover:opacity-90"
        style={{
          background: filled ? courseTone : 'transparent',
          color: filled ? 'var(--background)' : courseTone,
          border: filled ? 'none' : `1px solid ${courseTone}`,
        }}
      >
        {label}
      </button>
    </div>
  )
}

function TutorialPanel({
  song,
  activeSection,
  cursor,
  onSeek,
  courseContext,
}: {
  song: GuitarSong
  activeSection: SongTutorialSection | null
  cursor: number
  onSeek: (cursor: number) => void
  courseContext?: CourseContext | null
}) {
  const tutorial = song.tutorial
  const currentSection = activeSection ?? tutorial?.sections[0] ?? null
  const courseTone = courseContext?.courseTone

  // Scroll the active part into view within the panel when it changes (e.g.
  // after "Next part" or when playback advances the cursor into a new part).
  const sectionRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const currentSectionId = currentSection?.id ?? null
  useEffect(() => {
    if (!currentSectionId) return
    const el = sectionRefs.current.get(currentSectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentSectionId])

  if (!tutorial) return null

  // Part-aware course context: tell the header strip which part the cursor is
  // inside and how to advance to the next part. The strip's primary button
  // walks parts before advancing the whole lesson.
  const sectionList = tutorial.sections
  const currentPartIndex = currentSection
    ? Math.max(
        0,
        sectionList.findIndex((section) => section.id === currentSection.id),
      )
    : 0
  const partAwareContext: CourseContext | null = courseContext
    ? {
        ...courseContext,
        partCount: sectionList.length,
        currentPartIndex,
        onNextPart: () => {
          const next = sectionList[currentPartIndex + 1]
          if (next) onSeek(next.start)
        },
        onSeekPart: (partIndex: number) => {
          const target = sectionList[partIndex]
          if (target) onSeek(target.start)
        },
      }
    : null

  return (
    <aside
      className="border-border/45 bg-background/58 shadow-foreground/10 z-20 hidden h-full shrink-0 flex-col border-l shadow-2xl backdrop-blur-2xl backdrop-saturate-150 lg:flex"
      style={{ width: TUTORIAL_PANEL_WIDTH }}
      aria-label="Tutorial notes"
    >
      {partAwareContext ? (
        <CourseHeaderStrip context={partAwareContext} />
      ) : null}
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <BookOpen className="text-muted-foreground size-3.5" />
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
            Tutorial
          </p>
        </div>
        {tutorial.level ? (
          <span className="border-border/60 bg-muted/25 text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] font-medium">
            {tutorial.level}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-4">
        <div key={song.id} className="animate-guitar-tutorial-swap space-y-5">
          <section>
            <h3 className="guitar-serif text-foreground text-base font-semibold leading-tight tracking-tight">
              {tutorial.title ?? song.title}
            </h3>
            <p className="text-foreground/85 mt-2 text-[12.5px] leading-5">
              {tutorial.summary}
            </p>
          </section>

          <TutorialBullets
            title="What to learn"
            items={tutorial.objectives}
            icon={<Target className="size-3" />}
          />

          <section className="space-y-2">
            <div className="text-muted-foreground flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider">
              <ListChecks className="size-3" />
              <span>Parts</span>
            </div>
            <div className="-mx-1 space-y-1">
              {tutorial.sections.map((section, index) => {
                const active = currentSection?.id === section.id
                const done = !active && cursor >= section.end
                const accent = courseTone ?? 'var(--foreground)'
                return (
                  <div
                    key={section.id}
                    ref={(el) => {
                      sectionRefs.current.set(section.id, el)
                    }}
                    className={cn(
                      'scroll-mt-2 rounded-md transition-colors',
                      active ? 'bg-muted/70' : '',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSeek(section.start)}
                      className={cn(
                        'group/section flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors',
                        active
                          ? 'text-foreground'
                          : done
                            ? 'text-muted-foreground/80 hover:bg-muted/45 hover:text-foreground'
                            : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-full text-[8px] tabular-nums transition-colors',
                          active
                            ? 'text-background'
                            : done
                              ? 'text-background'
                              : 'text-muted-foreground/70 border-border/70 border',
                        )}
                        style={
                          active || done ? { background: accent } : undefined
                        }
                        aria-label={
                          active ? 'Current part' : done ? 'Played' : 'Upcoming'
                        }
                      >
                        {done ? (
                          <Check className="size-2.5" strokeWidth={3} />
                        ) : (
                          <span className="guitar-mono">{index + 1}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {section.title}
                        </span>
                        {section.focus ? (
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 opacity-75">
                            {section.focus}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {active ? (
                      <div
                        key={`expanded-${section.id}`}
                        className="animate-guitar-section-expand space-y-3 px-2.5 pb-3 pt-1"
                      >
                        <TutorialBullets
                          title="Listen for"
                          items={section.learn}
                          icon={<BookOpen className="size-3" />}
                        />
                        <TutorialBullets
                          title="Try this"
                          items={section.tryThis}
                          icon={<Sparkles className="size-3" />}
                        />
                        <TutorialBullets
                          title="Break it on purpose"
                          items={section.breakIt}
                          icon={<RotateCcw className="size-3" />}
                        />
                        <TutorialBullets
                          title="Reinforce"
                          items={section.reinforce}
                          icon={<Check className="size-3" />}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}

function SpeedControl({
  speed,
  onChange,
}: {
  speed: number
  onChange: (speed: number) => void
}) {
  const [open, setOpen] = useState(false)
  const isCustom = !SPEED_OPTIONS.includes(speed)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Playback speed ${formatSpeed(speed)}`}
          className={cn(
            'guitar-mono inline-flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-[11.5px] font-medium tabular-nums',
            'hover:bg-muted/70 transition-colors',
            speed === 1
              ? 'text-muted-foreground/90 hover:text-foreground'
              : 'text-foreground',
          )}
        >
          {formatSpeed(speed)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-[140px] p-1"
      >
        <p className="text-muted-foreground/80 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em]">
          Playback speed
        </p>
        {SPEED_OPTIONS.map((option) => {
          const isActive = !isCustom && option === speed
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px]',
                'hover:bg-muted/55 transition-colors',
                isActive ? 'text-foreground' : 'text-foreground/80',
              )}
            >
              <span className="guitar-mono tabular-nums">
                {formatSpeed(option)}
              </span>
              {option === 1 ? (
                <span className="text-muted-foreground/70 text-[10px]">
                  Normal
                </span>
              ) : null}
              {isActive ? (
                <span className="text-foreground ml-2 text-[10px]">✓</span>
              ) : null}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

const MIN_FALL_HEIGHT = 240
const MAX_FALL_HEIGHT = 540

function clampScrollTarget(
  target: number,
  totalWidth: number,
  visibleWidth: number,
) {
  return Math.max(0, Math.min(totalWidth - visibleWidth, target))
}

export function PracticeView({
  song,
  practiceNotes,
  duration,
  cursor,
  visualCursor,
  isPlaying,
  loadState,
  soundLoadingLabel,
  isSongLoading,
  isSongError,
  onTogglePlay,
  onRestart,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onPreviewKey,
  playbackSpeed,
  onPlaybackSpeedChange,
  instrumentPacks,
  activePackId,
  activeInstrumentId,
  onActiveInstrumentChange,
  onInstallPack,
  installingPackIds,
  isAudioOptionsLoading,
  courseContext,
}: PracticeViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const [stageHeight, setStageHeight] = useState<number | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const noteTones = useMemo(() => {
    const map = new Map<number, string>()
    for (const note of practiceNotes) {
      map.set(note.midi, note.color ?? midiToTone(note.midi))
    }
    return map
  }, [practiceNotes])

  // Single source of truth for where every note is played in this song. The
  // arranger spreads notes across the neck (chords on distinct strings, melodies
  // climbing as pitch rises) instead of collapsing everything to the nut.
  const fingerings = useMemo(
    () => assignFingerings(practiceNotes),
    [practiceNotes],
  )

  // Active dots = notes currently sounding. Upcoming dots = notes starting
  // within ~1.5s. Both mapped to their real (string, fret) via the fingerings.
  const activePositions = useMemo<FretboardDot[]>(() => {
    return practiceNotes
      .filter(
        (n) => visualCursor >= n.start && visualCursor < n.start + n.duration,
      )
      .map((n) => ({
        ...(fingerings.get(n.id) ?? midiToFretPosition(n.midi)),
        tone: noteTones.get(n.midi) ?? midiToTone(n.midi),
      }))
  }, [practiceNotes, visualCursor, fingerings, noteTones])

  const upcomingPositions = useMemo<FretboardDot[]>(() => {
    return practiceNotes
      .filter(
        (n) =>
          n.start > visualCursor &&
          n.start <= visualCursor + 1.5 &&
          !(visualCursor >= n.start && visualCursor < n.start + n.duration),
      )
      .map((n) => ({
        ...(fingerings.get(n.id) ?? midiToFretPosition(n.midi)),
        tone: noteTones.get(n.midi) ?? midiToTone(n.midi),
      }))
  }, [practiceNotes, visualCursor, fingerings, noteTones])

  // Measure available falling-notes height (reserves space for keyboard + bottom dock)
  // useLayoutEffect + synchronous initial measure so the first paint is correct
  // and we don't see a height jump on app start.
  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const measure = () => {
      const available = el.clientHeight - KEYBOARD_HEIGHT - 100
      const next = Math.max(
        MIN_FALL_HEIGHT,
        Math.min(MAX_FALL_HEIGHT, available),
      )
      setStageHeight((current) => (current === next ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-scroll horizontally only when the played range nears the visible edge.
  // Track real fretboard positions (string, fret) so the view follows the music
  // up the neck rather than a pitch-derived column.
  useEffect(() => {
    if (!stageRef.current) return
    const tracked =
      activePositions.length > 0 ? activePositions : upcomingPositions
    if (tracked.length === 0) return
    const stage = stageRef.current
    const totalWidth = stage.scrollWidth
    const visibleWidth = stage.clientWidth
    if (totalWidth <= visibleWidth) return

    const centers = tracked.map((p) => positionCenterX(p))
    if (centers.length === 0) return

    const minX = Math.min(...centers)
    const maxX = Math.max(...centers)
    const currentLeft = stage.scrollLeft
    const currentRight = currentLeft + visibleWidth
    const edgePadding = Math.min(
      Math.max(visibleWidth * 0.18, 56),
      visibleWidth * 0.34,
    )
    const safeLeft = currentLeft + edgePadding
    const safeRight = currentRight - edgePadding

    let target: number | null = null
    if (minX < safeLeft) {
      target = minX - edgePadding
    } else if (maxX > safeRight) {
      target = maxX - visibleWidth + edgePadding
    }

    if (target === null) return
    const nextLeft = clampScrollTarget(target, totalWidth, visibleWidth)
    if (Math.abs(nextLeft - currentLeft) < 8) return

    stage.scrollTo({
      left: nextLeft,
      behavior:
        Math.abs(nextLeft - currentLeft) > visibleWidth * 0.6
          ? 'auto'
          : 'smooth',
    })
  }, [activePositions, upcomingPositions])

  // Netflix-style: auto-hide controls 2s after playback starts; show on activity
  useEffect(() => {
    const clearTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    if (!isPlaying) {
      clearTimer()
      setControlsVisible(true)
      return
    }

    const armHide = () => {
      clearTimer()
      hideTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false)
      }, 2000)
    }

    armHide()
    setControlsVisible(true)

    const onActivity = () => {
      setControlsVisible(true)
      armHide()
    }

    const root = rootRef.current
    if (root) {
      root.addEventListener('pointermove', onActivity)
      root.addEventListener('pointerdown', onActivity)
      root.addEventListener('focusin', onActivity)
    }
    return () => {
      clearTimer()
      if (root) {
        root.removeEventListener('pointermove', onActivity)
        root.removeEventListener('pointerdown', onActivity)
        root.removeEventListener('focusin', onActivity)
      }
    }
  }, [isPlaying])

  // Scroll to center the song's note range — smoothly when the song id
  // changes (lesson transition), instantly on first mount so there's no
  // initial scroll animation from 0. Based on the notes' real fretboard
  // positions, so the initial view reflects where the piece sits on the neck.
  const previousSongIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!stageRef.current || practiceNotes.length === 0) return
    const stage = stageRef.current
    const centers = practiceNotes.map((n) =>
      positionCenterX(fingerings.get(n.id) ?? midiToFretPosition(n.midi)),
    )
    const avgX = centers.reduce((s, x) => s + x, 0) / centers.length
    const totalWidth = stage.scrollWidth
    const visibleWidth = stage.clientWidth
    if (totalWidth <= visibleWidth) return
    const target = clampScrollTarget(
      avgX - visibleWidth / 2,
      totalWidth,
      visibleWidth,
    )
    const isLessonTransition =
      previousSongIdRef.current !== null &&
      previousSongIdRef.current !== song.id
    previousSongIdRef.current = song.id
    if (isLessonTransition) {
      stage.scrollTo({ left: target, behavior: 'smooth' })
    } else {
      stage.scrollLeft = target
    }
  }, [practiceNotes, song.id, fingerings])

  const loadingSamples =
    loadState.status === 'loading' && loadState.total > 0
      ? Math.round((loadState.loaded / loadState.total) * 100)
      : null
  const loadingSamplesLabel =
    loadingSamples === null
      ? 'Loading guitar samples…'
      : `Loading guitar samples · ${loadingSamples}%`

  const progress = duration > 0 ? Math.min(1, cursor / duration) : 0
  const activeTutorialSection = useMemo(() => {
    const sections = song.tutorial?.sections ?? []
    if (sections.length === 0) return null
    return (
      sections.find(
        (section) => cursor >= section.start && cursor < section.end,
      ) ??
      sections.find((section) => cursor < section.start) ??
      sections[sections.length - 1] ??
      null
    )
  }, [cursor, song.tutorial?.sections])
  const hasTutorial = Boolean(song.tutorial)

  return (
    <div
      ref={rootRef}
      className="animate-guitar-view-forward relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {/* Top chrome */}
      <header className="animate-guitar-chrome-in border-border/40 bg-background/85 z-20 flex h-12 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <h2 className="guitar-serif truncate text-[15px] font-semibold leading-tight tracking-tight">
            {song.title}
          </h2>
        </div>
        <div className="text-muted-foreground/80 guitar-mono hidden text-[11px] sm:block">
          {song.notes.length} notes · {getTempoLabel(song)} ·{' '}
          {getMeterLabel(song)}
        </div>
        <SoundPicker
          packs={instrumentPacks}
          activePackId={activePackId}
          activeInstrumentId={activeInstrumentId}
          onActiveInstrumentChange={onActiveInstrumentChange}
          onInstallPack={onInstallPack}
          installingPackIds={installingPackIds}
          isLoading={isAudioOptionsLoading}
        />
      </header>

      {/* Overlay toasts — absolute so they don't shift the stage layout */}
      {soundLoadingLabel || loadState.status === 'loading' ? (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-4">
          <div className="border-border/50 bg-background/90 text-muted-foreground pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
            <Loader2 className="size-3 animate-spin" />
            {soundLoadingLabel ?? loadingSamplesLabel}
          </div>
        </div>
      ) : null}

      {loadState.status === 'error' ? (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-4">
          <div className="border-destructive/40 bg-destructive/10 text-destructive pointer-events-auto inline-flex max-w-[28rem] items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
            {loadState.error}
          </div>
        </div>
      ) : null}

      {/* Stage: falling notes + keyboard, horizontally scrollable together */}
      <div
        ref={wrapRef}
        className="relative flex min-h-0 flex-1 overflow-hidden"
      >
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            ref={stageRef}
            className="guitar-no-scrollbar absolute inset-0 overflow-x-auto overflow-y-hidden"
          >
            {isSongLoading ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading song…
              </div>
            ) : isSongError ? (
              <div className="text-destructive flex h-full items-center justify-center text-sm">
                Could not load this song.
              </div>
            ) : (
              <div
                className="relative mx-auto flex h-full flex-col pb-[calc(var(--chat-safe-padding,0px)+4.5rem)]"
                style={{ width: KEYBOARD_WIDTH }}
              >
                <div className="flex-1" />
                {stageHeight !== null ? (
                  <FallingNotes
                    notes={practiceNotes}
                    cursor={visualCursor}
                    fingerings={fingerings}
                    height={stageHeight}
                    revealKey={song.id}
                  />
                ) : null}
                <div className="relative pb-3">
                  <GuitarFretboard
                    activePositions={activePositions}
                    upcomingPositions={upcomingPositions}
                    onKeyPress={onPreviewKey}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {hasTutorial ? (
          <TutorialPanel
            song={song}
            activeSection={activeTutorialSection}
            cursor={cursor}
            onSeek={onSeek}
            courseContext={courseContext ?? null}
          />
        ) : null}
      </div>

      {/* Floating control dock — fixed, chat-aware, auto-hide while playing */}
      <div
        className={cn(
          'pointer-events-none fixed left-0 z-30 flex justify-center px-4 transition-all duration-300 ease-out',
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
        )}
        style={{
          right: hasTutorial ? TUTORIAL_PANEL_WIDTH : 0,
          bottom:
            'calc(var(--guitar-action-dock-safe-padding, var(--chat-safe-padding, 0px)) + 0.75rem)',
        }}
      >
        <div className="bg-background/90 border-border/60 pointer-events-auto flex h-12 items-center gap-2 rounded-full border px-2 shadow-2xl shadow-black/15 backdrop-blur-xl">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground size-8 cursor-pointer rounded-full"
            onClick={onRestart}
            aria-label="Restart"
            title="Restart"
          >
            <SkipBack className="size-3.5" fill="currentColor" />
          </Button>
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, cursor - 10))}
            aria-label="Back 10 seconds"
            title="Back 10 seconds"
            className={cn(
              'text-muted-foreground hover:text-foreground inline-flex h-8 cursor-pointer items-center gap-0.5 rounded-full px-2 transition-colors',
              'hover:bg-muted/70',
            )}
          >
            <RotateCcw className="size-3.5" />
            <span className="guitar-mono text-[9px] font-semibold tabular-nums">
              10
            </span>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className={cn(
              'bg-foreground text-background flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12.5px] font-medium',
              'transition-transform hover:scale-[1.02] active:scale-95',
            )}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="size-3.5" />
            ) : (
              <Play className="-ml-0.5 size-3.5" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          {/* Inline scrubber */}
          <div className="relative mx-1 flex h-8 w-28 items-center sm:w-40">
            <div className="bg-muted/45 absolute inset-x-0 h-1 rounded-full" />
            <div
              className={cn(
                'bg-foreground/85 absolute left-0 h-1 rounded-full',
                !isScrubbing && 'transition-[width] duration-100 ease-linear',
              )}
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className={cn(
                'bg-foreground absolute size-2.5 -translate-x-1/2 rounded-full shadow-sm',
                !isScrubbing && 'transition-[left] duration-100 ease-linear',
              )}
              style={{ left: `${progress * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.01}
              value={Math.min(cursor, duration)}
              onChange={(event) => onSeek(Number(event.target.value))}
              onPointerDown={() => {
                setIsScrubbing(true)
                onScrubStart()
              }}
              onPointerUp={(event) => {
                setIsScrubbing(false)
                onScrubEnd(Number(event.currentTarget.value))
              }}
              onKeyDown={() => {
                setIsScrubbing(true)
                onScrubStart()
              }}
              onKeyUp={(event) => {
                setIsScrubbing(false)
                onScrubEnd(Number(event.currentTarget.value))
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Playback position"
            />
          </div>

          <div className="guitar-mono text-muted-foreground/90 flex min-w-[78px] items-center justify-center gap-1 px-1.5 text-[11px]">
            <span className="text-foreground">{formatDuration(cursor)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>

          <div className="bg-border/60 mx-0.5 h-5 w-px" />

          <SpeedControl
            speed={playbackSpeed}
            onChange={onPlaybackSpeedChange}
          />
        </div>
      </div>
    </div>
  )
}
