import type { GuitarSong } from '../shared/song'
import { defaultSongLibrary } from './default-song-library'
import {
  allTutorialIds as defaultTutorialIds,
  allTutorialSongs as defaultTutorialSongs,
} from './tutorials'

export const retiredDefaultSongIds = [
  'the-entertainer',
  'maple-leaf-rag',
  'chopin-prelude-op-28-no-4',
  'chopin-prelude-op-28-no-20',
  'gymnopedie-no-2',
  'bach-wtc-i-fugue-no-1',
  'beethoven-moonlight-sonata-1',
  'beethoven-symphony-no-5',
  'chopin-nocturne-op-9-no-2',
  'chopin-raindrop-prelude',
  'clair-de-lune',
  'debussy-reverie',
  'fur-elise',
  'satie-gnossienne-no-1',
] as const

export { defaultTutorialIds }

export const defaultClassicsIds = defaultSongLibrary.map((song) => song.id)

export function defaultSongs(now = new Date().toISOString()): GuitarSong[] {
  const fromLibrary = defaultSongLibrary.map((song) => ({
    ...song,
    createdAt: now,
    updatedAt: now,
  }))
  const fromTutorials = defaultTutorialSongs.map((song) => ({
    ...song,
    createdAt: now,
    updatedAt: now,
  }))
  return [...fromTutorials, ...fromLibrary]
}
