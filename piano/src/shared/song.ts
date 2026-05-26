export interface PianoNote {
  id: string
  pitch: string
  midi: number
  start: number
  duration: number
  velocity?: number
  color?: string
  label?: string
}

export interface TempoChange {
  bpm: number
  ticks: number
  time: number
  duration?: number
}

export interface TimeSignatureChange {
  numerator: number
  denominator: number
  ticks: number
  time: number
  measures?: number
  duration?: number
}

export interface MidiSongInfo {
  ppq: number
  name?: string
  durationSeconds: number
  trackCount: number
  noteCount: number
  sourceHash?: string
  sourceFileName?: string
}

export interface PianoSong {
  id: string
  title: string
  source?: string
  sourceInfo?: {
    provider: string
    sourceUrl: string
    midiUrl?: string
    license: string
    composer?: string
    artist?: string
    editor?: string
    mutopiaId?: string
    lilypondPath?: string
    lilypondUrl?: string
    sourceRepository?: string
  }
  bpm: number
  beatsPerBar: number
  beatUnit?: number
  defaultSecondsPerBeat: number
  tempoMap?: TempoChange[]
  timeSignatureMap?: TimeSignatureChange[]
  midiInfo?: MidiSongInfo
  notes: PianoNote[]
  createdAt: string
  updatedAt: string
}

export interface SongSummary {
  id: string
  title: string
  source?: string
  composer?: string
  artist?: string
  bpm: number
  beatsPerBar: number
  beatUnit?: number
  tempoMap?: TempoChange[]
  timeSignatureMap?: TimeSignatureChange[]
  noteCount: number
  duration: number
  updatedAt: string
}

export function getSongDuration(song: Pick<PianoSong, 'notes'>): number {
  return song.notes.reduce(
    (max, note) => Math.max(max, note.start + note.duration),
    0,
  )
}

export function getTempoLabel(
  song:
    | Pick<PianoSong, 'bpm' | 'tempoMap'>
    | Pick<SongSummary, 'bpm' | 'tempoMap'>,
): string {
  const tempoCount = song.tempoMap?.length ?? 0
  if (tempoCount > 1) return `${song.bpm} bpm · ${tempoCount} tempos`
  return `${song.bpm} bpm`
}

export function getMeterLabel(
  song:
    | Pick<PianoSong, 'beatsPerBar' | 'beatUnit' | 'timeSignatureMap'>
    | Pick<SongSummary, 'beatsPerBar' | 'beatUnit' | 'timeSignatureMap'>,
): string {
  const denominator = song.beatUnit ?? 4
  const signatureCount = song.timeSignatureMap?.length ?? 0
  const primary = `${song.beatsPerBar}/${denominator}`
  if (signatureCount > 1) return `${primary} · ${signatureCount} meters`
  return primary
}
