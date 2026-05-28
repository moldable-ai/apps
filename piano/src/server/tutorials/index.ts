import type { PianoSong } from '../../shared/song'
import { type RawTutorial, buildTutorialSong } from '../tutorial-builder'
import { advancedTutorials } from './advanced'
import { beginnerTutorials } from './beginner'
import { intermediateTutorials } from './intermediate'

const ALL_RAW_TUTORIALS: RawTutorial[] = [
  ...beginnerTutorials,
  ...intermediateTutorials,
  ...advancedTutorials,
]

export const allTutorialSongs: PianoSong[] =
  ALL_RAW_TUTORIALS.map(buildTutorialSong)

export const allTutorialIds: string[] = allTutorialSongs.map((song) => song.id)

export { beginnerTutorials, intermediateTutorials, advancedTutorials }
