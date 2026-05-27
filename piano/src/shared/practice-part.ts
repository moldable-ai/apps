import type { PianoNote } from './song'

export type PracticePart = 'all' | 'bass' | 'melody'

export const DEFAULT_SPLIT_MIDI = 60

export interface PracticePartOption {
  id: PracticePart
  label: string
  shortLabel: string
  description: string
}

export const PRACTICE_PART_OPTIONS: PracticePartOption[] = [
  {
    id: 'all',
    label: 'All notes',
    shortLabel: 'All notes',
    description: 'Show and play the whole arrangement.',
  },
  {
    id: 'bass',
    label: 'Bass',
    shortLabel: 'Bass',
    description: 'Below the split note — a simple left-hand practice split.',
  },
  {
    id: 'melody',
    label: 'Melody',
    shortLabel: 'Melody',
    description:
      'The split note and above — a simple right-hand practice split.',
  },
]

export function getPracticePartOption(part: PracticePart): PracticePartOption {
  return (
    PRACTICE_PART_OPTIONS.find((option) => option.id === part) ??
    PRACTICE_PART_OPTIONS[0]
  )
}

export function noteMatchesPracticePart(
  note: Pick<PianoNote, 'midi'>,
  part: PracticePart,
  splitMidi = DEFAULT_SPLIT_MIDI,
): boolean {
  if (part === 'bass') return note.midi < splitMidi
  if (part === 'melody') return note.midi >= splitMidi
  return true
}

export function suggestSplitMidi(notes: Pick<PianoNote, 'midi'>[]): number {
  if (notes.length === 0) return DEFAULT_SPLIT_MIDI

  const midiValues = notes.map((note) => note.midi).sort((a, b) => a - b)
  const minMidi = midiValues[0] ?? DEFAULT_SPLIT_MIDI - 12
  const maxMidi = midiValues[midiValues.length - 1] ?? DEFAULT_SPLIT_MIDI + 12
  const minSplit = Math.max(22, minMidi + 1)
  const maxSplit = Math.min(108, maxMidi)

  let bestSplit = DEFAULT_SPLIT_MIDI
  let bestScore = Number.POSITIVE_INFINITY

  for (let split = minSplit; split <= maxSplit; split += 1) {
    const bassCount = midiValues.filter((midi) => midi < split).length
    const melodyCount = midiValues.length - bassCount
    if (bassCount === 0 || melodyCount === 0) continue

    const balanceScore = Math.abs(bassCount - melodyCount) / midiValues.length
    // Prefer musically familiar split points if the balance is similar.
    const familiarPitchPenalty = [0, 2, 4, 5, 7, 9, 11].includes(split % 12)
      ? 0
      : 0.015
    const middleDistancePenalty = Math.abs(split - DEFAULT_SPLIT_MIDI) * 0.001
    const score = balanceScore + familiarPitchPenalty + middleDistancePenalty

    if (score < bestScore) {
      bestScore = score
      bestSplit = split
    }
  }

  return bestSplit
}
