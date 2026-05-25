export interface PianoKey {
  midi: number
  pitch: string
  label: string
  octave: number
  isBlack: boolean
  whiteIndex: number
  left: number
}

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]
const BLACK_NOTES = new Set(['C#', 'D#', 'F#', 'G#', 'A#'])

export const WHITE_KEY_WIDTH = 24
export const BLACK_KEY_WIDTH = 14
export const KEYBOARD_HEIGHT = 168
export const BLACK_KEY_HEIGHT = 106

export function midiToPitch(midi: number): string {
  const name = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function buildPianoKeys(): PianoKey[] {
  const keys: PianoKey[] = []
  let whiteIndex = 0

  for (let midi = 21; midi <= 108; midi += 1) {
    const pitch = midiToPitch(midi)
    const label = pitch.replace(/\d+$/, '')
    const octave = Math.floor(midi / 12) - 1
    const isBlack = BLACK_NOTES.has(label)
    const key: PianoKey = {
      midi,
      pitch,
      label,
      octave,
      isBlack,
      whiteIndex,
      left: isBlack
        ? whiteIndex * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
        : whiteIndex * WHITE_KEY_WIDTH,
    }
    keys.push(key)
    if (!isBlack) whiteIndex += 1
  }

  return keys
}

export const PIANO_KEYS = buildPianoKeys()
export const WHITE_KEY_COUNT = PIANO_KEYS.filter((key) => !key.isBlack).length
export const KEYBOARD_WIDTH = WHITE_KEY_COUNT * WHITE_KEY_WIDTH

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.max(0, Math.floor(totalSeconds % 60))
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const NOTE_TONES = [
  '#ec4899', // C  – magenta-pink
  '#f43f5e', // C# – rose
  '#f97316', // D  – orange
  '#f59e0b', // D# – amber
  '#eab308', // E  – yellow
  '#84cc16', // F  – lime
  '#22c55e', // F# – green
  '#14b8a6', // G  – teal
  '#06b6d4', // G# – cyan
  '#3b82f6', // A  – blue
  '#6366f1', // A# – indigo
  '#a855f7', // B  – violet
]

export function midiToTone(midi: number): string {
  return NOTE_TONES[midi % 12] ?? '#6366f1'
}

export function hand(midi: number): 'left' | 'right' {
  return midi < 60 ? 'left' : 'right'
}
