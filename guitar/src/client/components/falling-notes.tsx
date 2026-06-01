import { useMemo } from 'react'
import type { GuitarNote } from '../../shared/song'
import {
  FRET_COUNT,
  NECK_WIDTH,
  STRING_COLORS,
  midiToFretPosition,
  positionCenterX,
  wireX,
} from '../guitar-utils'
import type { FretPosition } from '../guitar-utils'

interface FallingNotesProps {
  notes: GuitarNote[]
  cursor: number
  /** Single source of truth for where each note is played; keyed by note.id. */
  fingerings: Map<string, FretPosition>
  lookAheadSeconds?: number
  height?: number
  /** Bumps the reveal-animation key — set to song id to retrigger on lesson change. */
  revealKey?: string
}

// A touch wider than before so the fret number reads clearly.
const BAR_WIDTH = 16

function noteGeometry(pos: FretPosition) {
  return { x: positionCenterX(pos) - BAR_WIDTH / 2, width: BAR_WIDTH }
}

function ActiveKeyEffect({
  centerX,
  hitLine,
  tone,
}: {
  centerX: number
  hitLine: number
  tone: string
}) {
  return (
    <g className="guitar-active-key-effect" aria-hidden>
      <ellipse
        cx={centerX}
        cy={hitLine - 1}
        rx="9"
        ry="4"
        fill="white"
        opacity="0.65"
        filter="url(#hit-bloom)"
      />
      <ellipse
        cx={centerX}
        cy={hitLine - 10}
        rx="16"
        ry="18"
        fill={tone}
        opacity="0.18"
        filter="url(#hit-bloom)"
      />
      <rect
        x={centerX - 1}
        y={hitLine - 54}
        width="2"
        height="44"
        rx="1"
        fill={tone}
        opacity="0.18"
        filter="url(#hit-bloom)"
      />
    </g>
  )
}

export function FallingNotes({
  notes,
  cursor,
  fingerings,
  lookAheadSeconds = 5.5,
  height = 380,
  revealKey,
}: FallingNotesProps) {
  const hitLine = height - 1
  const pixelsPerSecond = (hitLine - 8) / lookAheadSeconds
  const width = NECK_WIDTH
  const posFor = (note: GuitarNote): FretPosition =>
    fingerings.get(note.id) ?? midiToFretPosition(note.midi)
  const fretGuides = useMemo(
    () => Array.from({ length: FRET_COUNT }, (_, i) => wireX(i + 1)),
    [],
  )

  const visibleNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.start + note.duration >= cursor - 0.15 &&
          note.start <= cursor + lookAheadSeconds,
      ),
    [notes, cursor, lookAheadSeconds],
  )

  const activeNotes = useMemo(() => {
    return notes.filter(
      (note) => cursor >= note.start && cursor < note.start + note.duration,
    )
  }, [cursor, notes])

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width, height }}
      aria-label="falling note practice roll"
    >
      <svg
        width={width}
        height={height}
        role="img"
        className="block"
        shapeRendering="geometricPrecision"
      >
        <defs>
          {/* deep stage background */}
          <linearGradient id="stage-bg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--card)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--card)" stopOpacity="1" />
          </linearGradient>

          {/* fade at top so notes appear out of darkness */}
          <linearGradient id="top-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--background)" stopOpacity="1" />
            <stop offset="35%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>

          {/* hit line glow */}
          <linearGradient id="hit-glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0" />
            <stop
              offset="100%"
              stopColor="var(--foreground)"
              stopOpacity="0.18"
            />
          </linearGradient>

          <filter id="note-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="hit-bloom" x="-160%" y="-160%" width="420%" height="420%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.65 0"
              result="bright"
            />
            <feMerge>
              <feMergeNode in="bright" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* stage backdrop */}
        <rect width={width} height={height} fill="var(--card)" />
        <rect
          width={width}
          height={height}
          fill="url(#stage-bg)"
          opacity="0.6"
        />

        {/* faint vertical guides echoing the fret wires */}
        {fretGuides.map((x, i) => (
          <line
            key={`guide-${i}`}
            x1={x}
            x2={x}
            y1={0}
            y2={hitLine}
            stroke="var(--border)"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
        ))}

        {/* The note bars + their glows are wrapped in a group keyed by
            revealKey so they re-fire the reveal animation on lesson change.
            The grid, hit-line, and guides stay still. */}
        <g key={revealKey} className="animate-guitar-notes-reveal">
          {/* glow underlay for each note */}
          {visibleNotes.map((note) => {
            const pos = posFor(note)
            const { x, width: barWidth } = noteGeometry(pos)
            const timeUntilStart = note.start - cursor
            const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
            const top =
              hitLine - (timeUntilStart + note.duration) * pixelsPerSecond
            // Color by STRING (animated-tab style), not by pitch.
            const tone = STRING_COLORS[pos.stringIndex] ?? '#9ca3af'
            const active =
              cursor >= note.start && cursor < note.start + note.duration
            const opacity = active ? 0.5 : 0.22

            return (
              <rect
                key={`glow-${note.id}`}
                x={x - 3}
                y={top - 1}
                width={barWidth + 6}
                height={noteHeight + 2}
                rx="9"
                fill={tone}
                opacity={opacity}
                filter="url(#note-glow)"
              />
            )
          })}

          {/* notes */}
          {visibleNotes.map((note) => {
            const pos = posFor(note)
            const { x, width: barWidth } = noteGeometry(pos)
            const timeUntilStart = note.start - cursor
            const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
            const top =
              hitLine - (timeUntilStart + note.duration) * pixelsPerSecond
            const tone = STRING_COLORS[pos.stringIndex] ?? '#9ca3af'
            const active =
              cursor >= note.start && cursor < note.start + note.duration

            const gradientId = `note-grad-${note.id}`

            return (
              <g key={note.id}>
                <defs>
                  <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={tone} stopOpacity="0.98" />
                    <stop offset="100%" stopColor={tone} stopOpacity="0.78" />
                  </linearGradient>
                </defs>
                <rect
                  x={x}
                  y={top}
                  width={barWidth}
                  height={noteHeight}
                  rx="5"
                  fill={`url(#${gradientId})`}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.6"
                />
                {/* glossy highlight */}
                <rect
                  x={x + 1}
                  y={top + 1}
                  width={barWidth - 2}
                  height={Math.min(6, noteHeight - 2)}
                  rx="3"
                  fill="rgba(255,255,255,0.28)"
                />
                {active ? (
                  <rect
                    x={x - 2}
                    y={top - 2}
                    width={barWidth + 4}
                    height={noteHeight + 4}
                    rx="6"
                    fill="none"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth="1.1"
                  />
                ) : null}
                {/* fret number, centered on the bar — reads like animated tab.
                  Shown whenever the bar is tall enough to fit the digit(s). */}
                {noteHeight >= 14 ? (
                  <text
                    x={x + barWidth / 2}
                    y={top + noteHeight / 2 + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="white"
                    style={{ letterSpacing: 0.2 }}
                  >
                    {pos.fret}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>

        {/* hit line — luminous bar */}
        <rect
          x="0"
          y={hitLine}
          width={width}
          height="1"
          fill="rgba(255,255,255,0.92)"
        />
        <rect
          x="0"
          y={hitLine - 12}
          width={width}
          height="12"
          fill="url(#hit-glow)"
        />

        {activeNotes.map((note) => {
          const pos = posFor(note)
          return (
            <ActiveKeyEffect
              key={`active-effect-${note.id}`}
              centerX={positionCenterX(pos)}
              hitLine={hitLine}
              tone={STRING_COLORS[pos.stringIndex] ?? '#9ca3af'}
            />
          )
        })}

        {/* top fade so notes appear out of nothing */}
        <rect width={width} height={height * 0.35} fill="url(#top-fade)" />
      </svg>
    </div>
  )
}
