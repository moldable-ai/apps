import type { PianoSong } from '../shared/song'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { Midi } = require('@tonejs/midi') as typeof import('@tonejs/midi')

function midiToPitch(midi: number) {
  const names = [
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
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`
}

function round(value: number, places = 3) {
  return Number(value.toFixed(places))
}

export interface MidiSongMetadata {
  id: string
  title: string
  source?: string
  sourceInfo?: PianoSong['sourceInfo']
  createdAt?: string
  updatedAt?: string
}

export function midiBytesToSong(
  bytes: Buffer | Uint8Array | ArrayBuffer,
  metadata: MidiSongMetadata,
): PianoSong {
  const midi = new Midi(bytes)
  const secondsPerBeat = midi.header.tempos[0]?.bpm
    ? 60 / midi.header.tempos[0].bpm
    : 0.5
  const bpm = Math.round(60 / secondsPerBeat)
  const beatsPerBar = midi.header.timeSignatures[0]?.timeSignature?.[0] ?? 4
  const notes = midi.tracks
    .flatMap((track) => track.notes)
    .filter(
      (note) => note.midi >= 21 && note.midi <= 108 && note.duration > 0.02,
    )
    .sort(
      (a, b) => a.time - b.time || a.midi - b.midi || b.duration - a.duration,
    )
    .map((note, index) => ({
      id: `n-${String(index + 1).padStart(5, '0')}`,
      pitch: midiToPitch(note.midi),
      midi: note.midi,
      start: round(note.time),
      duration: round(note.duration),
      velocity: round(Math.max(0.25, Math.min(1, note.velocity)), 2),
    }))

  const now = new Date().toISOString()

  return {
    id: metadata.id,
    title: metadata.title,
    source: metadata.source,
    sourceInfo: metadata.sourceInfo,
    bpm,
    beatsPerBar,
    defaultSecondsPerBeat: round(secondsPerBeat, 4),
    createdAt: metadata.createdAt ?? now,
    updatedAt: metadata.updatedAt ?? now,
    notes,
  }
}
