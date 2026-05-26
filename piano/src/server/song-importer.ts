import type {
  PianoSong,
  TempoChange,
  TimeSignatureChange,
} from '../shared/song'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { Midi } = require('@tonejs/midi') as typeof import('@tonejs/midi')

type ParsedMidi = InstanceType<typeof Midi>

type MidiNote = ParsedMidi['tracks'][number]['notes'][number]

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

function getMidiDuration(notes: MidiNote[]) {
  return notes.reduce(
    (max, note) => Math.max(max, note.time + note.duration),
    0,
  )
}

function getDominantNumber<T extends { time: number; duration?: number }>(
  events: T[],
  getValue: (event: T) => number,
  fallback: number,
) {
  if (events.length === 0) return fallback

  const durations = new Map<number, number>()
  for (const event of events) {
    const value = getValue(event)
    durations.set(value, (durations.get(value) ?? 0) + (event.duration ?? 0))
  }

  return (
    [...durations.entries()].sort(
      (a, b) => b[1] - a[1] || a[0] - b[0],
    )[0]?.[0] ?? fallback
  )
}

function tempoMap(midi: ParsedMidi, durationSeconds: number): TempoChange[] {
  const tempos =
    midi.header.tempos.length > 0
      ? midi.header.tempos
      : [{ bpm: 120, ticks: 0, time: 0 }]

  return tempos.map((tempo, index) => {
    const time = round(tempo.time ?? midi.header.ticksToSeconds(tempo.ticks))
    const next = tempos[index + 1]
    const nextTime = next
      ? round(next.time ?? midi.header.ticksToSeconds(next.ticks))
      : durationSeconds
    return {
      bpm: round(tempo.bpm, 4),
      ticks: tempo.ticks,
      time,
      duration: round(Math.max(0, nextTime - time)),
    }
  })
}

function timeSignatureMap(
  midi: ParsedMidi,
  durationSeconds: number,
): TimeSignatureChange[] {
  const signatures =
    midi.header.timeSignatures.length > 0
      ? midi.header.timeSignatures
      : [{ ticks: 0, timeSignature: [4, 4] }]

  return signatures.map((signature, index) => {
    const [numerator = 4, denominator = 4] = signature.timeSignature
    const time = round(midi.header.ticksToSeconds(signature.ticks))
    const next = signatures[index + 1]
    const nextTime = next
      ? round(midi.header.ticksToSeconds(next.ticks))
      : durationSeconds

    return {
      numerator,
      denominator,
      ticks: signature.ticks,
      time,
      measures: signature.measures,
      duration: round(Math.max(0, nextTime - time)),
    }
  })
}

export interface MidiSongMetadata {
  id: string
  title: string
  source?: string
  sourceInfo?: PianoSong['sourceInfo']
  createdAt?: string
  updatedAt?: string
  sourceHash?: string
  sourceFileName?: string
}

export function midiBytesToSong(
  bytes: Buffer | Uint8Array | ArrayBuffer,
  metadata: MidiSongMetadata,
): PianoSong {
  const midi = new Midi(bytes)
  const midiNotes = midi.tracks.flatMap((track) => track.notes)
  const durationSeconds = round(getMidiDuration(midiNotes))
  const tempos = tempoMap(midi, durationSeconds)
  const timeSignatures = timeSignatureMap(midi, durationSeconds)
  const bpm = Math.round(
    getDominantNumber(tempos, (tempo) => tempo.bpm, tempos[0]?.bpm ?? 120),
  )
  const dominantSignature = getDominantNumber(
    timeSignatures,
    (signature) => signature.numerator * 100 + signature.denominator,
    404,
  )
  const beatsPerBar = Math.floor(dominantSignature / 100)
  const beatUnit = dominantSignature % 100
  const secondsPerBeat = 60 / bpm
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
    beatUnit,
    defaultSecondsPerBeat: round(secondsPerBeat, 4),
    tempoMap: tempos,
    timeSignatureMap: timeSignatures,
    midiInfo: {
      ppq: midi.header.ppq,
      name: midi.name || midi.header.name || undefined,
      durationSeconds,
      trackCount: midi.tracks.length,
      noteCount: notes.length,
      sourceHash: metadata.sourceHash,
      sourceFileName: metadata.sourceFileName,
    },
    createdAt: metadata.createdAt ?? now,
    updatedAt: metadata.updatedAt ?? now,
    notes,
  }
}
