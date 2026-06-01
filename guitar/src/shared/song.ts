export interface GuitarNote {
  id: string
  pitch: string
  midi: number
  start: number
  duration: number
  velocity?: number
  fretPosition?: {
    stringIndex: number
    fret: number
  }
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

export interface SongTutorialSection {
  id: string
  title: string
  start: number
  end: number
  focus?: string
  learn: string[]
  tryThis?: string[]
  breakIt?: string[]
  reinforce?: string[]
}

export interface SongTutorial {
  title?: string
  summary: string
  level?: string
  objectives: string[]
  sections: SongTutorialSection[]
}

export interface SongWorkspacePracticeSettings {
  songId: string
  playbackSpeed?: number
  createdAt: string
  updatedAt: string
}

export interface GuitarSong {
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
  tutorial?: SongTutorial
  /**
   * Sorted ascending times (seconds) where playback should auto-pause.
   * Independent of `tutorial.sections` so any song can carry pause/checkpoint
   * metadata without needing a full tutorial — e.g. for "wait for the user
   * to read this" moments in any piece.
   */
  pausePoints?: number[]
  notes: GuitarNote[]
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
  isTutorial?: boolean
  tutorialSummary?: string
  noteCount: number
  duration: number
  updatedAt: string
}

export function getSongDuration(song: Pick<GuitarSong, 'notes'>): number {
  return song.notes.reduce(
    (max, note) => Math.max(max, note.start + note.duration),
    0,
  )
}

export function getTempoLabel(
  song:
    | Pick<GuitarSong, 'bpm' | 'tempoMap'>
    | Pick<SongSummary, 'bpm' | 'tempoMap'>,
): string {
  const tempoCount = song.tempoMap?.length ?? 0
  if (tempoCount > 1) return `${song.bpm} bpm · ${tempoCount} tempos`
  return `${song.bpm} bpm`
}

export function getMeterLabel(
  song:
    | Pick<GuitarSong, 'beatsPerBar' | 'beatUnit' | 'timeSignatureMap'>
    | Pick<SongSummary, 'beatsPerBar' | 'beatUnit' | 'timeSignatureMap'>,
): string {
  const denominator = song.beatUnit ?? 4
  const signatureCount = song.timeSignatureMap?.length ?? 0
  const primary = `${song.beatsPerBar}/${denominator}`
  if (signatureCount > 1) return `${primary} · ${signatureCount} meters`
  return primary
}
