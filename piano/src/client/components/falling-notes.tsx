import { useMemo } from 'react'
import type { PianoNote } from '../../shared/song'
import {
  BLACK_KEY_WIDTH,
  KEYBOARD_WIDTH,
  PIANO_KEYS,
  WHITE_KEY_WIDTH,
  midiToTone,
} from '../piano-utils'

interface FallingNotesProps {
  notes: PianoNote[]
  cursor: number
  lookAheadSeconds?: number
  height?: number
}

const KEY_BY_MIDI = new Map(PIANO_KEYS.map((key) => [key.midi, key]))

function noteGeometry(midi: number) {
  const key = KEY_BY_MIDI.get(midi)
  if (!key) return { x: 0, width: WHITE_KEY_WIDTH - 4 }
  if (key.isBlack) {
    return { x: key.left + 1, width: BLACK_KEY_WIDTH - 2 }
  }
  return { x: key.left + 1.5, width: WHITE_KEY_WIDTH - 3 }
}

export function FallingNotes({
  notes,
  cursor,
  lookAheadSeconds = 5.5,
  height = 380,
}: FallingNotesProps) {
  const hitLine = height - 1
  const pixelsPerSecond = (hitLine - 8) / lookAheadSeconds

  const visibleNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.start + note.duration >= cursor - 0.15 &&
          note.start <= cursor + lookAheadSeconds,
      ),
    [notes, cursor, lookAheadSeconds],
  )

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: KEYBOARD_WIDTH, height }}
      aria-label="falling note practice roll"
    >
      <svg
        width={KEYBOARD_WIDTH}
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
        </defs>

        {/* stage backdrop */}
        <rect width={KEYBOARD_WIDTH} height={height} fill="var(--card)" />
        <rect
          width={KEYBOARD_WIDTH}
          height={height}
          fill="url(#stage-bg)"
          opacity="0.6"
        />

        {/* black key lanes — subtle vertical bands */}
        {PIANO_KEYS.filter((key) => key.isBlack).map((key) => (
          <rect
            key={`lane-${key.midi}`}
            x={key.left}
            y={0}
            width={BLACK_KEY_WIDTH}
            height={hitLine}
            fill="var(--foreground)"
            opacity="0.035"
          />
        ))}

        {/* octave dividers at every C */}
        {PIANO_KEYS.filter((key) => key.label === 'C' && !key.isBlack).map(
          (key) => (
            <line
              key={`div-${key.midi}`}
              x1={key.left}
              x2={key.left}
              y1={0}
              y2={hitLine}
              stroke="var(--border)"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
          ),
        )}

        {/* glow underlay for each note */}
        {visibleNotes.map((note) => {
          const { x, width } = noteGeometry(note.midi)
          const timeUntilStart = note.start - cursor
          const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
          const topRaw =
            hitLine - (timeUntilStart + note.duration) * pixelsPerSecond
          const top = topRaw
          const tone = note.color ?? midiToTone(note.midi)
          const active =
            cursor >= note.start && cursor < note.start + note.duration
          const opacity = active ? 0.5 : 0.22

          return (
            <rect
              key={`glow-${note.id}`}
              x={x - 3}
              y={top - 1}
              width={width + 6}
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
          const { x, width } = noteGeometry(note.midi)
          const timeUntilStart = note.start - cursor
          const noteHeight = Math.max(10, note.duration * pixelsPerSecond)
          const topRaw =
            hitLine - (timeUntilStart + note.duration) * pixelsPerSecond
          const top = topRaw
          const tone = note.color ?? midiToTone(note.midi)
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
                width={width}
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
                width={width - 2}
                height={Math.min(6, noteHeight - 2)}
                rx="3"
                fill="rgba(255,255,255,0.28)"
              />
              {active ? (
                <rect
                  x={x - 2}
                  y={top - 2}
                  width={width + 4}
                  height={noteHeight + 4}
                  rx="6"
                  fill="none"
                  stroke="rgba(255,255,255,0.85)"
                  strokeWidth="1.1"
                />
              ) : null}
              {/* pitch label, only if tall enough */}
              {noteHeight > 22 && width > 14 ? (
                <text
                  x={x + width / 2}
                  y={top + noteHeight - 6}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="600"
                  fill="white"
                  opacity="0.78"
                  style={{ letterSpacing: 0.2 }}
                >
                  {note.pitch.replace(/\d/, '')}
                </text>
              ) : null}
            </g>
          )
        })}

        {/* hit line — luminous bar */}
        <rect
          x="0"
          y={hitLine - 1}
          width={KEYBOARD_WIDTH}
          height="2"
          fill="var(--foreground)"
          opacity="0.85"
        />
        <rect
          x="0"
          y={hitLine - 12}
          width={KEYBOARD_WIDTH}
          height="12"
          fill="url(#hit-glow)"
        />

        {/* top fade so notes appear out of nothing */}
        <rect
          width={KEYBOARD_WIDTH}
          height={height * 0.35}
          fill="url(#top-fade)"
        />
      </svg>
    </div>
  )
}
