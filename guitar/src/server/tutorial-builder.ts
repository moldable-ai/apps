import type { GuitarNote, GuitarSong } from '../shared/song'

/**
 * Helpers shared by all default tutorial definitions.
 *
 * Tutorials use a small DSL for note phrases:
 *   ['C4', 0.0, 0.45]                  // pitch, start, duration
 *   ['D#4', 0.5, 0.45, 0.85]           // optional velocity (0..1)
 *
 * The builder converts them to GuitarNote objects and assembles a full
 * GuitarSong with all required metadata. Each tutorial uses 60 BPM so
 * the second-based start/end positions on tutorial sections match
 * exactly what you author in the phrase.
 */

const NOTE_TO_MIDI: Record<string, number> = {
  C2: 36,
  'C#2': 37,
  D2: 38,
  'D#2': 39,
  E2: 40,
  F2: 41,
  'F#2': 42,
  G2: 43,
  'G#2': 44,
  A2: 45,
  'A#2': 46,
  B2: 47,
  C3: 48,
  'C#3': 49,
  D3: 50,
  'D#3': 51,
  E3: 52,
  F3: 53,
  'F#3': 54,
  G3: 55,
  'G#3': 56,
  A3: 57,
  'A#3': 58,
  B3: 59,
  C4: 60,
  'C#4': 61,
  D4: 62,
  'D#4': 63,
  E4: 64,
  F4: 65,
  'F#4': 66,
  G4: 67,
  'G#4': 68,
  A4: 69,
  'A#4': 70,
  B4: 71,
  C5: 72,
  'C#5': 73,
  D5: 74,
  'D#5': 75,
  E5: 76,
  F5: 77,
  'F#5': 78,
  G5: 79,
  'G#5': 80,
  A5: 81,
  'A#5': 82,
  B5: 83,
  C6: 84,
  'C#6': 85,
  D6: 86,
  'D#6': 87,
  E6: 88,
  F6: 89,
  'F#6': 90,
  G6: 91,
}

export type Phrase = Array<
  [
    pitch: string,
    start: number,
    duration: number,
    velocity?: number,
    fretPosition?: GuitarNote['fretPosition'],
  ]
>

export function midiOf(pitch: string): number {
  const midi = NOTE_TO_MIDI[pitch]
  if (midi === undefined) throw new Error(`Unknown pitch: ${pitch}`)
  return midi
}

export function buildNotes(phrase: Phrase): GuitarNote[] {
  return phrase.map(
    ([pitch, start, duration, velocity, fretPosition], index) => {
      const midi = midiOf(pitch)
      return {
        id: `n-${String(index + 1).padStart(3, '0')}`,
        pitch,
        midi,
        start: Number(start.toFixed(3)),
        duration: Number(duration.toFixed(3)),
        velocity: velocity ?? 0.7,
        ...(fretPosition ? { fretPosition } : {}),
      }
    },
  )
}

export interface RawTutorial {
  id: string
  title: string
  bpm?: number
  beatsPerBar?: number
  beatUnit?: number
  phrase: Phrase
  tutorial: NonNullable<GuitarSong['tutorial']>
}

export function buildTutorialSong(raw: RawTutorial): GuitarSong {
  const bpm = raw.bpm ?? 60
  const beatsPerBar = raw.beatsPerBar ?? 4
  const secondsPerBeat = 60 / bpm
  const notes = buildNotes(raw.phrase)
  const sections = raw.tutorial.sections
  // Pause right after the LAST audible note of each section finishes,
  // not at the nominal section boundary — otherwise the cursor scrolls
  // through any silent gap before pausing.
  const pausePoints =
    sections.length > 1
      ? sections.slice(0, -1).map((section) => {
          const sectionNotes = notes.filter(
            (note) => note.start >= section.start && note.start < section.end,
          )
          if (sectionNotes.length === 0) return section.end
          return Number(
            Math.max(
              ...sectionNotes.map((note) => note.start + note.duration),
            ).toFixed(3),
          )
        })
      : undefined
  return {
    id: raw.id,
    title: raw.title,
    source: 'Guitar Tutorials',
    bpm,
    beatsPerBar,
    beatUnit: raw.beatUnit ?? 4,
    defaultSecondsPerBeat: secondsPerBeat,
    notes,
    tutorial: raw.tutorial,
    pausePoints,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}
