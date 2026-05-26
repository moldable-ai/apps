import { ArrowLeft, Loader2, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, cn } from '@moldable-ai/ui'
import type { PianoInstrumentPack } from '../../shared/audio'
import { type PianoSong, getMeterLabel, getTempoLabel } from '../../shared/song'
import { PIANO_PRESETS, type PianoPresetId } from '../audio-presets'
import {
  BLACK_KEY_WIDTH,
  KEYBOARD_HEIGHT,
  KEYBOARD_WIDTH,
  PIANO_KEYS,
  WHITE_KEY_WIDTH,
  formatDuration,
  midiToTone,
} from '../piano-utils'
import type { AudioLoadState } from '../use-piano-audio'
import { FallingNotes } from './falling-notes'
import { PianoKeyboard } from './piano-keyboard'
import { SoundPicker } from './sound-picker'

interface PracticeViewProps {
  song: PianoSong
  duration: number
  cursor: number
  visualCursor: number
  isPlaying: boolean
  activeMidi: Set<number>
  upcomingMidi: Set<number>
  presetId: PianoPresetId
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
  onPresetChange: (preset: PianoPresetId) => void
  onPreviewKey: (midi: number) => void
  instrumentPacks: PianoInstrumentPack[]
  activePackId: string | null
  activeInstrumentId: string | null
  onActiveInstrumentChange: (packId: string, instrumentId: string) => void
  onInstallPack: (packId: string) => Promise<void>
  installingPackIds: Set<string>
  isAudioOptionsLoading: boolean
}

const MIN_FALL_HEIGHT = 240
const MAX_FALL_HEIGHT = 540
const KEY_CENTER_BY_MIDI = new Map(
  PIANO_KEYS.map((key) => [
    key.midi,
    key.left + (key.isBlack ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH) / 2,
  ]),
)

function clampScrollTarget(
  target: number,
  totalWidth: number,
  visibleWidth: number,
) {
  return Math.max(0, Math.min(totalWidth - visibleWidth, target))
}

export function PracticeView({
  song,
  duration,
  cursor,
  visualCursor,
  isPlaying,
  activeMidi,
  upcomingMidi,
  presetId,
  loadState,
  soundLoadingLabel,
  isSongLoading,
  isSongError,
  onBack,
  onTogglePlay,
  onRestart,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onPresetChange,
  onPreviewKey,
  instrumentPacks,
  activePackId,
  activeInstrumentId,
  onActiveInstrumentChange,
  onInstallPack,
  installingPackIds,
  isAudioOptionsLoading,
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
    for (const note of song.notes) {
      map.set(note.midi, note.color ?? midiToTone(note.midi))
    }
    return map
  }, [song.notes])

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
  useEffect(() => {
    if (!stageRef.current) return
    const trackedMidi =
      activeMidi.size > 0 ? [...activeMidi] : [...upcomingMidi]
    if (trackedMidi.length === 0) return
    const stage = stageRef.current
    const totalWidth = stage.scrollWidth
    const visibleWidth = stage.clientWidth
    if (totalWidth <= visibleWidth) return

    const centers = trackedMidi
      .map((midi) => KEY_CENTER_BY_MIDI.get(midi))
      .filter((center): center is number => center !== undefined)
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
  }, [activeMidi, upcomingMidi])

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

  // On mount, scroll to center the song's note range
  useEffect(() => {
    if (!stageRef.current || song.notes.length === 0) return
    const stage = stageRef.current
    const midiValues = song.notes.map((n) => n.midi)
    const avgMidi = midiValues.reduce((s, m) => s + m, 0) / midiValues.length
    const ratio = (avgMidi - 21) / (108 - 21)
    const totalWidth = stage.scrollWidth
    const visibleWidth = stage.clientWidth
    if (totalWidth <= visibleWidth) return
    stage.scrollLeft = clampScrollTarget(
      ratio * totalWidth - visibleWidth / 2,
      totalWidth,
      visibleWidth,
    )
  }, [song.id, song.notes])

  const loadingSamples =
    loadState.status === 'loading' && loadState.total > 0
      ? Math.round((loadState.loaded / loadState.total) * 100)
      : null
  const loadingSamplesLabel =
    loadingSamples === null
      ? 'Loading piano samples…'
      : `Loading piano samples · ${loadingSamples}%`

  const progress = duration > 0 ? Math.min(1, cursor / duration) : 0

  return (
    <div
      ref={rootRef}
      className="animate-piano-view-forward relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      {/* Top chrome */}
      <header className="animate-piano-chrome-in border-border/40 bg-background/85 z-20 flex h-12 shrink-0 items-center gap-3 border-b px-3 backdrop-blur-xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -ml-1 h-7 cursor-pointer gap-1.5 rounded-full pl-1.5 pr-2.5 text-[12px]"
          onClick={onBack}
        >
          <ArrowLeft className="size-3.5" />
          Library
        </Button>
        <div className="bg-border/70 h-4 w-px" />
        <div className="min-w-0 flex-1">
          <h2 className="piano-serif truncate text-[15px] font-semibold leading-tight tracking-tight">
            {song.title}
          </h2>
        </div>
        <div className="text-muted-foreground/80 piano-mono hidden text-[11px] sm:block">
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
        <div className="border-border/50 bg-muted/15 flex shrink-0 items-center rounded-full border p-0.5">
          {PIANO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={cn(
                'h-6 cursor-pointer rounded-full px-2.5 text-[11px] font-medium transition-colors',
                preset.id === presetId
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title={preset.description}
              onClick={() => onPresetChange(preset.id)}
            >
              {preset.name}
            </button>
          ))}
        </div>
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
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={stageRef}
          className="piano-no-scrollbar absolute inset-0 overflow-x-auto overflow-y-hidden"
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
                  notes={song.notes}
                  cursor={visualCursor}
                  height={stageHeight}
                />
              ) : null}
              <div className="relative pb-3">
                <PianoKeyboard
                  activeMidi={activeMidi}
                  upcomingMidi={upcomingMidi}
                  noteTones={noteTones}
                  onKeyPress={onPreviewKey}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating control dock — fixed, chat-aware, auto-hide while playing */}
      <div
        className={cn(
          'pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 transition-all duration-300 ease-out',
          controlsVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0',
        )}
        style={{
          bottom:
            'calc(var(--piano-action-dock-safe-padding, var(--chat-safe-padding, 0px)) + 0.75rem)',
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
          >
            <RotateCcw className="size-3.5" />
          </Button>
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
          <div className="relative mx-1 flex h-8 w-40 items-center sm:w-56">
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

          <div className="piano-mono text-muted-foreground/90 flex min-w-[78px] items-center justify-center gap-1 px-1.5 text-[11px]">
            <span className="text-foreground">{formatDuration(cursor)}</span>
            <span>/</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
