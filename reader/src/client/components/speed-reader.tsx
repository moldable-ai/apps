import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
} from '@moldable-ai/ui'
import {
  READER_CHUNK,
  READER_FONT_STACKS,
  READER_WPM,
  resolveReaderTheme,
} from '../../shared/reader-settings'
import type { SpeedReaderProps } from '../reader-types'

/** Optimal Recognition Point: pivot letter index for a word of the given length. */
function orpIndex(length: number): number {
  if (length <= 1) return 0
  if (length <= 5) return 1
  if (length <= 9) return 2
  return 3
}

const SENTENCE_END = /[.!?:;]["')\]]?$/

function clampIndex(value: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(0, Math.round(value)), Math.max(0, length - 1))
}

function clampProgressIndex(value: number, length: number): number {
  if (length <= 0) return 0
  return Math.min(Math.max(0, Math.round(value)), length)
}

function formatReadingTime(minutes: number, scope: 'chapter' | 'book'): string {
  const rounded = Math.max(1, Math.ceil(minutes))
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  const time =
    hours > 0
      ? mins > 0
        ? `${hours}h ${mins}m`
        : `${hours}h`
      : `${rounded} min`
  return `${time} left in ${scope}`
}

export function SpeedReader(props: SpeedReaderProps) {
  const {
    open,
    onClose,
    title,
    words,
    startIndex,
    wordsBeforeChapter,
    bookWordCount,
    remainingWordsAfterChapter,
    settings,
    onSettingsChange,
    hasNextChapter = false,
    autoPlayOnSourceChange = false,
    onChapterComplete,
    onProgress,
  } = props

  const { resolvedTheme } = useTheme()
  const theme = resolveReaderTheme(
    settings.theme,
    resolvedTheme === 'dark' ? 'dark' : 'light',
  )
  const fontStack = READER_FONT_STACKS[settings.font]
  const total = words.length

  const [index, setIndex] = useState(() => clampIndex(startIndex, total))
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  // The word renders as a single text run (so kerning stays natural); we then
  // translate it horizontally so the colored pivot letter lands on the guide.
  const wordRef = useRef<HTMLSpanElement>(null)
  const pivotRef = useRef<HTMLSpanElement>(null)
  const [pivotOffset, setPivotOffset] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(index)
  indexRef.current = index

  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  const reportProgress = useCallback((next: number) => {
    onProgressRef.current?.(next)
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const previousOpenRef = useRef(open)
  const previousWordsRef = useRef(words)

  // Reset position only when the overlay opens or the source chapter changes.
  // The parent updates `startIndex` as speed-reading progress crosses visible
  // page boundaries; treating those progress updates as a reset pauses playback.
  useEffect(() => {
    const opened = open && !previousOpenRef.current
    const sourceChanged = previousWordsRef.current !== words

    previousOpenRef.current = open
    previousWordsRef.current = words

    if (!open || (!opened && !sourceChanged)) return

    clearTimer()
    setIndex(clampIndex(startIndex, total))
    setFinished(false)
    setPlaying(sourceChanged && autoPlayOnSourceChange && total > 0)
  }, [open, words, startIndex, total, autoPlayOnSourceChange, clearTimer])

  // Stop and report when the overlay closes or unmounts.
  useEffect(() => {
    if (!open) {
      clearTimer()
      setPlaying(false)
    }
    return () => clearTimer()
  }, [open, clearTimer])

  const chunkSize = settings.chunkSize

  // The current chunk of words (1..chunkSize consecutive words from index).
  const chunk = useMemo(
    () => words.slice(index, Math.min(total, index + chunkSize)),
    [words, index, total, chunkSize],
  )
  const displayChunk =
    chunk.length > 0
      ? chunk
      : words.slice(Math.max(0, total - chunkSize), total)
  const chunkText = displayChunk.join(' ')

  // Dwell time for the current chunk before advancing.
  const dwellFor = useCallback(
    (start: number): number => {
      const baseMs = 60000 / Math.max(1, settings.wpm)
      const slice = words.slice(start, Math.min(total, start + chunkSize))
      let ms = baseMs * Math.max(1, slice.length)
      const last = slice[slice.length - 1] ?? ''
      // Extra dwell for long words so the eye can resolve them.
      if (last.length >= 9) ms += baseMs * 0.4
      if (settings.punctuationPause && SENTENCE_END.test(last))
        ms += baseMs * 1.8
      return ms
    },
    [settings.wpm, settings.punctuationPause, chunkSize, words, total],
  )

  // Timing engine: one timeout per displayed chunk so each delay can vary.
  useEffect(() => {
    if (!open || !playing) return
    if (total <= 0) {
      setPlaying(false)
      return
    }
    if (index >= total) {
      setPlaying(false)
      setFinished(true)
      return
    }

    timerRef.current = setTimeout(() => {
      const current = clampProgressIndex(indexRef.current, total)
      const next = Math.min(current + chunkSize, total)
      setIndex(next)
      reportProgress(next)

      if (next < total) return

      if (hasNextChapter && onChapterComplete) {
        setFinished(false)
        onChapterComplete(total)
        return
      }

      setPlaying(false)
      setFinished(true)
    }, dwellFor(index))

    return () => clearTimer()
  }, [
    open,
    playing,
    index,
    chunkSize,
    dwellFor,
    total,
    hasNextChapter,
    onChapterComplete,
    reportProgress,
    clearTimer,
  ])

  const togglePlay = useCallback(() => {
    if (total === 0) return
    setPlaying((prev) => {
      const next = !prev
      if (next) {
        // Restart from the beginning if we were finished.
        if (finished || indexRef.current >= total) {
          setIndex(0)
          setFinished(false)
        }
      } else {
        reportProgress(clampProgressIndex(indexRef.current, total))
      }
      return next
    })
  }, [total, finished, reportProgress])

  const restart = useCallback(() => {
    clearTimer()
    setIndex(0)
    setFinished(false)
    setPlaying(false)
    reportProgress(0)
  }, [clearTimer, reportProgress])

  const skip = useCallback(
    (delta: number) => {
      setIndex((prev) => {
        const next = clampIndex(prev + delta, total)
        setFinished(false)
        reportProgress(next)
        return next
      })
    },
    [total, reportProgress],
  )

  const handleClose = useCallback(() => {
    clearTimer()
    setPlaying(false)
    onClose(clampProgressIndex(indexRef.current, total))
  }, [clearTimer, total, onClose])

  const changeWpm = useCallback(
    (delta: number) => {
      const next = Math.min(
        READER_WPM.max,
        Math.max(READER_WPM.min, settings.wpm + delta * READER_WPM.step),
      )
      if (next !== settings.wpm) onSettingsChange({ wpm: next })
    },
    [settings.wpm, onSettingsChange],
  )

  const changeChunk = useCallback(
    (delta: number) => {
      const next = Math.min(
        READER_CHUNK.max,
        Math.max(READER_CHUNK.min, settings.chunkSize + delta),
      )
      if (next !== settings.chunkSize) onSettingsChange({ chunkSize: next })
    },
    [settings.chunkSize, onSettingsChange],
  )

  // Keyboard: Space play/pause, arrows skip, Escape close.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        skip(-10)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        skip(10)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, togglePlay, skip, handleClose])

  // Center the pivot letter on the focal guide. Measured relative to the word's
  // own (layout-centered) box, so it converges in one step and never drifts.
  useLayoutEffect(() => {
    if (!open || settings.chunkSize !== 1) {
      if (pivotOffset !== 0) setPivotOffset(0)
      return
    }
    const wordEl = wordRef.current
    const pivotEl = pivotRef.current
    if (!wordEl || !pivotEl) return
    const wordRect = wordEl.getBoundingClientRect()
    const pivotRect = pivotEl.getBoundingClientRect()
    const wordCenter = wordRect.left + wordRect.width / 2
    const pivotCenter = pivotRect.left + pivotRect.width / 2
    const next = wordCenter - pivotCenter
    if (Math.abs(next - pivotOffset) > 0.25) setPivotOffset(next)
  }, [open, settings.chunkSize, settings.font, index, total, pivotOffset])

  if (!open) return null

  const displayIndex = total === 0 ? 0 : Math.min(index, total - 1)
  const progressIndex = clampProgressIndex(index, total)
  const absoluteWordIndex = Math.min(
    Math.max(0, wordsBeforeChapter + progressIndex),
    Math.max(0, bookWordCount),
  )
  const bookPercent =
    bookWordCount <= 0
      ? 0
      : Math.round((absoluteWordIndex / bookWordCount) * 100)
  const readingTimeLabel = (() => {
    if (!settings.showReadingTime || total === 0) return null
    const remainingInChapter = Math.max(0, total - progressIndex)
    const remainingWords =
      settings.readingTimeScope === 'book'
        ? remainingInChapter + Math.max(0, remainingWordsAfterChapter)
        : remainingInChapter
    if (remainingWords <= 0) return `Done with ${settings.readingTimeScope}`
    return formatReadingTime(
      remainingWords / Math.max(1, settings.wpm),
      settings.readingTimeScope,
    )
  })()

  // Render the focal word, with ORP pivot when chunkSize === 1.
  const renderStage = () => {
    if (total === 0) {
      return (
        <span
          style={{ color: theme.muted, fontSize: 'clamp(1.2rem, 3vw, 1.6rem)' }}
        >
          No words to read
        </span>
      )
    }
    if (chunkSize === 1) {
      const word = words[displayIndex] ?? ''
      const pivot = orpIndex(word.length)
      const before = word.slice(0, pivot)
      const focus = word.slice(pivot, pivot + 1)
      const after = word.slice(pivot + 1)
      return (
        <div
          aria-live="polite"
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            fontFamily: fontStack,
            fontSize: 'clamp(2.2rem, 6vw, 3rem)',
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '0.01em',
          }}
        >
          {/* One uninterrupted text run keeps kerning natural; only the pivot
              glyph is recolored, and the whole word is shifted so the pivot
              sits on the guide. */}
          <span
            ref={wordRef}
            style={{
              whiteSpace: 'pre',
              transform: `translateX(${pivotOffset}px)`,
              willChange: 'transform',
            }}
          >
            {before}
            <span ref={pivotRef} style={{ color: theme.accent }}>
              {focus}
            </span>
            {after}
          </span>
        </div>
      )
    }
    return (
      <div
        aria-live="polite"
        style={{
          fontFamily: fontStack,
          fontSize: 'clamp(2.2rem, 5.5vw, 3rem)',
          fontWeight: 500,
          lineHeight: 1.15,
          textAlign: 'center',
          letterSpacing: '0.01em',
        }}
      >
        {chunkText}
      </div>
    )
  }

  // Tick marks sit on the focal guide. The pivot letter is the center of the
  // 1fr/auto/1fr word grid (and chunk text is centered too), so the guide is at
  // 50% of the stage; translateX(-50%) centers the 2px tick on that line.
  const tick = (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        height: '0.7rem',
        width: 2,
        backgroundColor: theme.muted,
        opacity: 0.5,
      }}
    />
  )

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: theme.bg, color: theme.fg }}
        role="dialog"
        aria-modal="true"
        aria-label="Speed reader"
      >
        {/* Top bar: title + close */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <p
            className="truncate text-sm font-medium"
            style={{ color: theme.muted }}
            title={title}
          >
            {title}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close speed reader"
                className="cursor-pointer rounded-md p-1.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
                style={{ color: theme.muted }}
              >
                <X className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Close (Esc)</TooltipContent>
          </Tooltip>
        </div>

        {/* Stage: centered focal point with guide ticks */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-[36rem]">
            {/* top tick */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 flex justify-start"
              style={{ top: '-2.4rem' }}
            >
              {tick}
            </div>
            {renderStage()}
            {/* bottom tick */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 flex justify-start"
              style={{ bottom: '-2.4rem' }}
            >
              {tick}
            </div>
          </div>
        </div>

        {/* Controls dock */}
        <div
          className="flex flex-col items-center gap-4 px-6"
          style={{
            paddingBottom:
              'calc(var(--reader-control-safe-padding, var(--chat-safe-padding, 0px)) + var(--reader-speed-control-bottom-gutter, 1.75rem))',
          }}
        >
          {/* progress */}
          <div className="w-full max-w-[34rem]">
            <Progress
              value={bookPercent}
              className="h-1"
              style={{ backgroundColor: theme.muted + '33' }}
            />
            <div
              className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-xs tabular-nums"
              style={{ color: theme.muted }}
            >
              <span className="truncate">Book progress</span>
              {readingTimeLabel ? (
                <span className="max-w-[42vw] truncate text-center">
                  {readingTimeLabel}
                </span>
              ) : (
                <span aria-hidden />
              )}
              <span className="truncate text-right">{bookPercent}%</span>
            </div>
          </div>

          {/* transport */}
          <div className="flex items-center justify-center gap-2">
            {finished ? (
              <>
                <Button
                  onClick={restart}
                  className="cursor-pointer gap-2"
                  aria-label="Restart from beginning"
                >
                  <RotateCcw className="size-4" />
                  Restart
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="cursor-pointer gap-2"
                >
                  <X className="size-4" />
                  Close
                </Button>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={restart}
                      aria-label="Restart from beginning"
                      className="cursor-pointer"
                    >
                      <RotateCcw className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Restart</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(-10)}
                      aria-label="Skip back ten words"
                      className="cursor-pointer"
                    >
                      <ChevronLeft className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back 10 words</TooltipContent>
                </Tooltip>
                <Button
                  size="icon"
                  onClick={togglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="size-12 cursor-pointer rounded-full"
                  disabled={total === 0}
                >
                  {playing ? (
                    <Pause className="size-6" />
                  ) : (
                    <Play className="size-6" />
                  )}
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => skip(10)}
                      aria-label="Skip forward ten words"
                      className="cursor-pointer"
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Forward 10 words</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* settings: wpm + chunk size */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeWpm(-1)}
                aria-label="Decrease words per minute"
                disabled={settings.wpm <= READER_WPM.min}
                className="cursor-pointer rounded-md p-1 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: theme.fg }}
              >
                <Minus className="size-4" />
              </button>
              <span
                className="min-w-[5.5rem] text-center text-sm tabular-nums"
                style={{ color: theme.fg }}
              >
                {settings.wpm} wpm
              </span>
              <button
                type="button"
                onClick={() => changeWpm(1)}
                aria-label="Increase words per minute"
                disabled={settings.wpm >= READER_WPM.max}
                className="cursor-pointer rounded-md p-1 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: theme.fg }}
              >
                <Plus className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: theme.muted }}>
                chunk
              </span>
              <button
                type="button"
                onClick={() => changeChunk(-1)}
                aria-label="Fewer words per flash"
                disabled={settings.chunkSize <= READER_CHUNK.min}
                className="cursor-pointer rounded-md p-1 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: theme.fg }}
              >
                <Minus className="size-4" />
              </button>
              <span
                className="min-w-[1.5rem] text-center text-sm tabular-nums"
                style={{ color: theme.fg }}
              >
                {settings.chunkSize}
              </span>
              <button
                type="button"
                onClick={() => changeChunk(1)}
                aria-label="More words per flash"
                disabled={settings.chunkSize >= READER_CHUNK.max}
                className="cursor-pointer rounded-md p-1 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ color: theme.fg }}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
