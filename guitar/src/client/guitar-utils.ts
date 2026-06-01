// Shared coordinate system for the realistic 6-string guitar neck.
//
// Both the fretboard (guitar-fretboard.tsx) and the falling-note roll
// (falling-notes.tsx) derive every x position from the helpers here, so a
// note's falling bar lands exactly on its fretted dot. This is the single
// source of truth for the neck geometry.
import type { GuitarNote } from '../shared/song'

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

/** Standard tuning, low→high. index 0 = low E (6th string), index 5 = high E (1st string). */
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] // E2 A2 D3 G3 B3 E4

/** Classical guitar: frets 0 (open/nut) through 19. */
export const FRET_COUNT = 19

export const GUITAR_MIN_MIDI = 40
export const GUITAR_MAX_MIDI = 64 + FRET_COUNT // 83

/** Standard single-dot inlay positions. */
export const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19]
/** The double-dot octave marker. */
export const DOUBLE_INLAY_FRET = 12

// --- Neck geometry ---------------------------------------------------------

export const NECK_HEIGHT = 150
/** Left zone reserved for the nut + open-string note dots. */
export const OPEN_AREA = 34
/** Scale-length constant controlling how quickly frets compress toward the body. */
export const SCALE = 1320

/** x of the fret wire after `fret` semitones. wireX(0) === OPEN_AREA (the nut). */
export function wireX(fret: number): number {
  return OPEN_AREA + SCALE * (1 - 2 ** (-fret / 12))
}

export const NECK_WIDTH = Math.round(wireX(FRET_COUNT) + 26)

/** x of the playable spot for a fret: midway between its bounding wires (open = left zone). */
export function fretCenterX(fret: number): number {
  if (fret === 0) return OPEN_AREA / 2
  return (wireX(fret - 1) + wireX(fret)) / 2
}

const STRING_TOP_PAD = 16
const STRING_BOTTOM_PAD = 24 // room for fret-number labels
const STRING_ROW_GAP = (NECK_HEIGHT - STRING_TOP_PAD - STRING_BOTTOM_PAD) / 5

/** y of a string row. stringIndex 5 (high E) sits at the top, index 0 (low E) at the bottom. */
export function stringY(stringIndex: number): number {
  return STRING_TOP_PAD + (5 - stringIndex) * STRING_ROW_GAP
}

/**
 * Small horizontal nudge so two notes on the same fret but different strings
 * get a unique x — and so the falling bar lines up with the right neck dot.
 */
export function stringOffset(stringIndex: number): number {
  return (stringIndex - 2.5) * 3.2
}

/** Fold a midi value by octaves until it lands within the playable neck range. */
export function foldIntoRange(midi: number): number {
  let m = midi
  while (m < GUITAR_MIN_MIDI) m += 12
  while (m > GUITAR_MAX_MIDI) m -= 12
  return m
}

export interface FretPosition {
  stringIndex: number
  fret: number
}

/**
 * Canonical fretboard position for a midi note: the largest open-string midi
 * that is <= the (octave-folded) note gives the lowest non-negative fret.
 * Never returns null.
 */
export function midiToFretPosition(midi: number): FretPosition {
  const folded = foldIntoRange(midi)
  let best: FretPosition = {
    stringIndex: 0,
    fret: folded - OPEN_STRING_MIDI[0],
  }
  for (let s = OPEN_STRING_MIDI.length - 1; s >= 0; s -= 1) {
    const fret = folded - OPEN_STRING_MIDI[s]
    if (fret >= 0 && fret <= FRET_COUNT) {
      return { stringIndex: s, fret }
    }
  }
  // Fallback (shouldn't happen for in-range midi): clamp onto low E.
  best = {
    stringIndex: 0,
    fret: Math.max(0, Math.min(FRET_COUNT, folded - OPEN_STRING_MIDI[0])),
  }
  return best
}

/** x center for a note's bar/dot, combining its fret center with its string nudge. */
export function noteCenterX(midi: number): number {
  const pos = midiToFretPosition(midi)
  return fretCenterX(pos.fret) + stringOffset(pos.stringIndex)
}

/** x center for an explicit fret position (string + fret), with the string nudge. */
export function positionCenterX(pos: FretPosition): number {
  return fretCenterX(pos.fret) + stringOffset(pos.stringIndex)
}

// --- Per-string identity ---------------------------------------------------

/** Per-string colors. index 0 = low E … 5 = high E. */
export const STRING_COLORS = [
  '#ef4444', // low E – red
  '#f97316', // A     – orange
  '#eab308', // D     – yellow
  '#22c55e', // G     – green
  '#3b82f6', // B     – blue
  '#a855f7', // high e – purple
]

/** Per-string note-name labels. index 0 = low E … 5 = high E. */
export const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']

// --- Fingering optimizer ---------------------------------------------------

/** Every playable (string, fret) that sounds the given midi pitch. */
export function candidatesFor(midi: number): FretPosition[] {
  const m = foldIntoRange(midi)
  const out: FretPosition[] = []
  for (let s = 0; s < 6; s++) {
    const fret = m - OPEN_STRING_MIDI[s]
    if (fret >= 0 && fret <= FRET_COUNT) out.push({ stringIndex: s, fret })
  }
  return out
}

function authoredFretPosition(note: GuitarNote): FretPosition | null {
  const pos = note.fretPosition
  if (!pos) return null
  if (!Number.isInteger(pos.stringIndex) || !Number.isInteger(pos.fret))
    return null
  if (pos.stringIndex < 0 || pos.stringIndex >= OPEN_STRING_MIDI.length)
    return null
  if (pos.fret < 0 || pos.fret > FRET_COUNT) return null

  const playedMidi = OPEN_STRING_MIDI[pos.stringIndex] + pos.fret
  return playedMidi === foldIntoRange(note.midi) ? pos : null
}

/**
 * Assign each note a realistic, playable (string, fret). Greedy with a tracked
 * fretting-hand position: chords (near-simultaneous notes) go on DISTINCT
 * strings; melodies stay near the hand and climb the neck as pitch rises (so
 * notes do NOT collapse to the nut). Keyed by note.id.
 */
export function assignFingerings(
  notes: GuitarNote[],
): Map<string, FretPosition> {
  const result = new Map<string, FretPosition>()
  const sorted = [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi)
  const EPS = 0.04
  // init hand position from the first note's lowest candidate (fallback 2)
  let handFret = 0
  let i = 0
  while (i < sorted.length) {
    const group: GuitarNote[] = [sorted[i]]
    let j = i + 1
    while (j < sorted.length && sorted[j].start - sorted[i].start <= EPS) {
      group.push(sorted[j])
      j++
    }
    group.sort((a, b) => a.midi - b.midi) // low pitch first
    const used = new Set<number>()
    const chosenFrets: number[] = []
    for (const note of group) {
      const authored = authoredFretPosition(note)
      if (authored) {
        used.add(authored.stringIndex)
        result.set(note.id, authored)
        if (authored.fret > 0) chosenFrets.push(authored.fret)
        continue
      }

      const cands = candidatesFor(note.midi).filter(
        (c) => !used.has(c.stringIndex),
      )
      let best: FretPosition | null = null
      let bestCost = Infinity
      for (const c of cands) {
        // dominant term = continuity (stay near hand) so notes follow the music
        // up the neck; small absolute-fret term gently prefers lower frets to
        // break ties; open strings get a tiny bonus
        const cost =
          c.fret * 1.0 +
          Math.abs(c.fret - handFret) * 0.2 +
          (c.fret === 0 ? -0.5 : 0)
        if (cost < bestCost) {
          bestCost = cost
          best = c
        }
      }
      if (!best) {
        const all = candidatesFor(note.midi)
        best = all[0] ?? { stringIndex: 0, fret: 0 }
      }
      used.add(best.stringIndex)
      result.set(note.id, best)
      if (best.fret > 0) chosenFrets.push(best.fret)
    }
    if (chosenFrets.length)
      handFret = chosenFrets.reduce((a, b) => a + b, 0) / chosenFrets.length
    i = j
  }
  return result
}

// --- Aliases kept so practice-view keeps working unchanged -----------------

export const KEYBOARD_WIDTH = NECK_WIDTH
export const KEYBOARD_HEIGHT = NECK_HEIGHT

// --- Pitch / tone helpers (unchanged behavior) -----------------------------

export function midiToPitch(midi: number): string {
  const name = NOTE_NAMES[midi % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

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
