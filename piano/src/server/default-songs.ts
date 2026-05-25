import type { PianoSong } from '../shared/song'
import { defaultSongLibrary } from './default-song-library'

export const retiredDefaultSongIds = [
  'the-entertainer',
  'maple-leaf-rag',
  'chopin-prelude-op-28-no-4',
  'chopin-prelude-op-28-no-20',
  'gymnopedie-no-2',
  'bach-wtc-i-fugue-no-1',
] as const

export function defaultSongs(now = new Date().toISOString()): PianoSong[] {
  return defaultSongLibrary.map((song) => ({
    ...song,
    createdAt: now,
    updatedAt: now,
  }))
}
