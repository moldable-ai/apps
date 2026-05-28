import type { CSSProperties } from 'react'
import { cn } from '@moldable-ai/ui'
import {
  BLACK_KEY_HEIGHT,
  BLACK_KEY_WIDTH,
  KEYBOARD_HEIGHT,
  KEYBOARD_WIDTH,
  PIANO_KEYS,
  WHITE_KEY_WIDTH,
  midiToTone,
} from '../piano-utils'

const BLACK_KEY_FLAT_LABELS: Record<string, string> = {
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
}

interface PianoKeyboardProps {
  activeMidi: Set<number>
  upcomingMidi?: Set<number>
  noteTones?: Map<number, string>
  onKeyPress?: (midi: number) => void
}

export function PianoKeyboard({
  activeMidi,
  upcomingMidi = new Set<number>(),
  noteTones,
  onKeyPress,
}: PianoKeyboardProps) {
  const whiteKeys = PIANO_KEYS.filter((key) => !key.isBlack)
  const blackKeys = PIANO_KEYS.filter((key) => key.isBlack)

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: KEYBOARD_WIDTH, height: KEYBOARD_HEIGHT }}
      aria-label="88 key piano keyboard"
    >
      {/* white keys */}
      <div className="absolute inset-0 flex">
        {whiteKeys.map((key) => {
          const active = activeMidi.has(key.midi)
          const upcoming = upcomingMidi.has(key.midi)
          const tone = noteTones?.get(key.midi) ?? midiToTone(key.midi)
          const isC = key.label === 'C'

          const baseStyle: CSSProperties = {
            width: WHITE_KEY_WIDTH,
            ['--key-tone' as string]: tone,
          }

          const activeStyle: CSSProperties = active
            ? {
                background: `linear-gradient(180deg, color-mix(in oklch, ${tone} 28%, white) 0%, color-mix(in oklch, ${tone} 55%, white) 100%)`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 0 22px color-mix(in oklch, ${tone} 55%, transparent), 0 4px 12px color-mix(in oklch, ${tone} 35%, transparent)`,
              }
            : {}

          return (
            <button
              key={key.midi}
              type="button"
              className={cn(
                'group relative flex cursor-pointer items-end justify-center pb-2 transition-[transform,box-shadow] duration-100 ease-out focus-visible:outline-none disabled:cursor-default',
                'bg-gradient-to-b from-white to-neutral-100 text-neutral-500',
                'border-r border-neutral-300/80 last:border-r-0',
                "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-3 after:bg-gradient-to-t after:from-black/[0.07] after:to-transparent after:content-['']",
                active && 'translate-y-px',
                isC && !active && 'shadow-[inset_1px_0_0_rgba(0,0,0,0.04)]',
              )}
              style={{ ...baseStyle, ...activeStyle }}
              onClick={() => onKeyPress?.(key.midi)}
              aria-label={key.pitch}
              aria-pressed={active}
            >
              {/* upcoming pulse */}
              {upcoming && !active ? (
                <span
                  className="pointer-events-none absolute top-2 size-1.5 rounded-full opacity-80"
                  style={{ background: tone, boxShadow: `0 0 8px ${tone}` }}
                />
              ) : null}
              {/* C label */}
              {isC ? (
                <span
                  className={cn(
                    'piano-mono absolute bottom-1.5 text-[8.5px] font-medium tracking-wide transition-colors',
                    active ? 'text-neutral-900/80' : 'text-neutral-400',
                  )}
                >
                  {key.pitch}
                </span>
              ) : null}
              {/* hover note label */}
              {!isC ? (
                <span
                  className={cn(
                    'piano-mono pointer-events-none absolute bottom-1.5 z-10 text-[8.5px] font-semibold tracking-wide opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100',
                    active ? 'text-neutral-900/85' : 'text-neutral-700',
                  )}
                >
                  {key.pitch}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* black keys */}
      {blackKeys.map((key) => {
        const active = activeMidi.has(key.midi)
        const upcoming = upcomingMidi.has(key.midi)
        const tone = noteTones?.get(key.midi) ?? midiToTone(key.midi)
        const flatLabel = BLACK_KEY_FLAT_LABELS[key.label]
        const hoverLabel = flatLabel
          ? `${key.pitch} / ${flatLabel}${key.octave}`
          : key.pitch

        const baseStyle: CSSProperties = {
          left: key.left,
          width: BLACK_KEY_WIDTH,
          height: BLACK_KEY_HEIGHT,
        }

        const activeStyle: CSSProperties = active
          ? {
              background: `linear-gradient(180deg, color-mix(in oklch, ${tone} 78%, black) 0%, color-mix(in oklch, ${tone} 90%, black) 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 18px color-mix(in oklch, ${tone} 60%, transparent), 0 4px 10px rgba(0,0,0,0.4)`,
            }
          : {}

        return (
          <button
            key={key.midi}
            type="button"
            className={cn(
              'group absolute top-0 z-10 flex cursor-pointer items-end justify-center pb-1.5 transition-[transform,box-shadow] duration-100 ease-out hover:z-30 focus-visible:z-30 focus-visible:outline-none',
              'rounded-b-[3px]',
              active
                ? 'translate-y-px'
                : 'bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-950 shadow-[inset_0_-3px_0_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.4)]',
            )}
            style={{ ...baseStyle, ...activeStyle }}
            onClick={() => onKeyPress?.(key.midi)}
            aria-label={key.pitch}
            aria-pressed={active}
          >
            {upcoming && !active ? (
              <span
                className="pointer-events-none absolute top-1.5 size-1 rounded-full"
                style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
              />
            ) : null}
            <span className="piano-mono bg-background/95 text-foreground pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[8px] font-semibold leading-none opacity-0 shadow-sm transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100">
              {hoverLabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
