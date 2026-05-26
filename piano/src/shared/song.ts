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
  defaultSecondsPerBeat: number
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
