import {
  DOUBLE_INLAY_FRET,
  FRET_COUNT,
  INLAY_FRETS,
  NECK_HEIGHT,
  NECK_WIDTH,
  OPEN_AREA,
  OPEN_STRING_MIDI,
  STRING_COLORS,
  STRING_LABELS,
  fretCenterX,
  midiToPitch,
  positionCenterX,
  stringY,
  wireX,
} from '../guitar-utils'

const FLAT_LABELS: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
}

const STRING_COUNT = OPEN_STRING_MIDI.length
const FRET_NUMBER_LABELS = [3, 5, 7, 9, 12, 15, 17, 19]

interface FretboardDot {
  stringIndex: number
  fret: number
  tone: string
}

interface GuitarFretboardProps {
  activePositions: FretboardDot[]
  upcomingPositions?: FretboardDot[]
  onKeyPress?: (midi: number) => void
}

/** Blend two hex colors. t=0 → a, t=1 → b. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a)
  const pb = parseHex(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r}, ${g}, ${bl})`
}

function parseHex(h: string): [number, number, number] {
  const v = h.replace('#', '')
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ]
}

function hoverLabel(midi: number): string {
  const pitch = midiToPitch(midi)
  const label = pitch.replace(/-?\d+$/, '')
  const flat = FLAT_LABELS[label]
  if (!flat) return pitch
  const octave = pitch.slice(label.length)
  return `${pitch} / ${flat}${octave}`
}

/**
 * A realistic horizontal 6-string guitar neck: wood, nut on the left, fret
 * wires that compress toward the body, six strings (high E on top) each tinted
 * with its own identity color, and standard position inlays. Active notes light
 * up as fretted dots (with the fret number inside) at their real (string, fret)
 * positions, sharing the falling-notes coordinate system so they stay aligned.
 */
export function GuitarFretboard({
  activePositions,
  upcomingPositions = [],
  onKeyPress,
}: GuitarFretboardProps) {
  const width = NECK_WIDTH
  const height = NECK_HEIGHT
  const frets = Array.from({ length: FRET_COUNT }, (_, i) => i + 1)
  const strings = Array.from({ length: STRING_COUNT }, (_, i) => i)
  const inlayY = (stringY(0) + stringY(5)) / 2

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width, height }}
      aria-label="guitar fretboard"
    >
      <svg
        width={width}
        height={height}
        role="img"
        className="block"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id="fret-wood" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3d2718" />
            <stop offset="50%" stopColor="#2f1d12" />
            <stop offset="100%" stopColor="#23150c" />
          </linearGradient>
          <filter id="fret-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* fretboard wood */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="6"
          fill="url(#fret-wood)"
        />

        {/* nut bar at the left */}
        <rect
          x={OPEN_AREA - 1.5}
          y={stringY(5) - 6}
          width={3}
          height={stringY(0) - stringY(5) + 12}
          rx="1"
          fill="#e8e4d8"
          opacity="0.92"
        />

        {/* fret wires — thinner toward the body */}
        {frets.map((fret) => {
          const x = wireX(fret)
          const w = Math.max(0.8, 1.6 - fret * 0.04)
          return (
            <rect
              key={`fret-${fret}`}
              x={x - w / 2}
              y={stringY(5) - 6}
              width={w}
              height={stringY(0) - stringY(5) + 12}
              rx="0.5"
              fill="#9aa0a6"
              opacity="0.75"
            />
          )
        })}

        {/* inlays — single dots, vertically centered between the outer strings */}
        {INLAY_FRETS.map((fret) => (
          <circle
            key={`inlay-${fret}`}
            cx={fretCenterX(fret)}
            cy={inlayY}
            r="4"
            fill="#ece5d2"
            opacity="0.5"
          />
        ))}

        {/* double dot at the 12th fret */}
        <circle
          cx={fretCenterX(DOUBLE_INLAY_FRET)}
          cy={stringY(4)}
          r="4"
          fill="#ece5d2"
          opacity="0.5"
        />
        <circle
          cx={fretCenterX(DOUBLE_INLAY_FRET)}
          cy={stringY(1)}
          r="4"
          fill="#ece5d2"
          opacity="0.5"
        />

        {/* strings — lower (thicker) strings at the bottom, each tinted toward
            its identity color so every string reads as distinct. */}
        {strings.map((s) => {
          const y = stringY(s)
          const thickness = 0.9 + (STRING_COUNT - 1 - s) * 0.45
          return (
            <rect
              key={`string-${s}`}
              x={OPEN_AREA}
              y={y - thickness / 2}
              width={width - OPEN_AREA - 8}
              height={Math.max(thickness, 1.4)}
              rx="1"
              fill={mixHex('#caa86a', STRING_COLORS[s], 0.55)}
              opacity="0.85"
            />
          )
        })}

        {/* string-name labels at the left, in the open area, colored to match.
            stringY puts low E at the bottom and high E at the top. */}
        {strings.map((s) => (
          <text
            key={`string-label-${s}`}
            x={OPEN_AREA / 2}
            y={stringY(s) + 3.5}
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill={STRING_COLORS[s]}
            className="guitar-mono"
          >
            {STRING_LABELS[s]}
          </text>
        ))}

        {/* upcoming hints (faint) at their real positions */}
        {upcomingPositions.map((p, idx) => (
          <circle
            key={`upcoming-${p.stringIndex}-${p.fret}-${idx}`}
            cx={positionCenterX(p)}
            cy={stringY(p.stringIndex)}
            r="3.5"
            fill={p.tone}
            opacity="0.4"
          />
        ))}

        {/* active fretted dots, glowing, with the fret number inside */}
        {activePositions.map((p, idx) => {
          const cx = positionCenterX(p)
          const cy = stringY(p.stringIndex)
          return (
            <g key={`active-${p.stringIndex}-${p.fret}-${idx}`}>
              <circle
                cx={cx}
                cy={cy}
                r="9"
                fill={p.tone}
                opacity="0.95"
                filter="url(#fret-glow)"
              />
              <circle
                cx={cx}
                cy={cy}
                r="9"
                fill="none"
                stroke="white"
                strokeWidth="1.4"
                opacity="0.85"
              />
              <text
                x={cx}
                y={cy + 3.2}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="white"
                className="guitar-mono"
                style={{ pointerEvents: 'none' }}
              >
                {p.fret}
              </text>
            </g>
          )
        })}

        {/* fret-number labels beneath the neck */}
        {FRET_NUMBER_LABELS.map((fret) => (
          <text
            key={`fret-num-${fret}`}
            x={fretCenterX(fret)}
            y={height - 8}
            textAnchor="middle"
            fontSize="8"
            fontWeight="600"
            fill="#ece5d2"
            opacity="0.55"
            className="guitar-mono"
          >
            {fret}
          </text>
        ))}
      </svg>

      {/* interaction layer — one transparent button per string×fret cell */}
      <div className="absolute inset-0">
        {strings.map((s) =>
          Array.from({ length: FRET_COUNT + 1 }, (_, f) => f).map((f) => {
            const midi = OPEN_STRING_MIDI[s] + f
            const cx = fretCenterX(f)
            const cy = stringY(s)
            const cellLeft = f === 0 ? 0 : wireX(f - 1)
            const cellRight = f === 0 ? OPEN_AREA : wireX(f)
            const cellWidth = Math.max(8, cellRight - cellLeft)
            const cellHeight = (stringY(0) - stringY(5)) / 5
            return (
              <button
                key={`cell-${s}-${f}`}
                type="button"
                className="group absolute cursor-pointer focus-visible:outline-none"
                style={{
                  left: cellLeft,
                  top: cy - cellHeight / 2,
                  width: cellWidth,
                  height: cellHeight,
                }}
                onClick={() => onKeyPress?.(midi)}
                aria-label={midiToPitch(midi)}
              >
                <span
                  className="guitar-mono pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-sm bg-black/80 px-1 py-0.5 text-[8px] font-semibold leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ left: cx - cellLeft, top: '50%' }}
                >
                  {hoverLabel(midi)}
                </span>
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}
