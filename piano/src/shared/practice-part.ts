import type { PianoNote } from './song'

export type PracticePart = 'all' | 'bass' | 'melody'

export const MIDDLE_C_MIDI = 60

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
    description: 'Below middle C (C4) — a simple left-hand practice split.',
  },
  {
    id: 'melody',
    label: 'Melody',
    shortLabel: 'Melody',
    description:
      'Middle C (C4) and above — a simple right-hand practice split.',
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
): boolean {
  if (part === 'bass') return note.midi < MIDDLE_C_MIDI
  if (part === 'melody') return note.midi >= MIDDLE_C_MIDI
  return true
}
