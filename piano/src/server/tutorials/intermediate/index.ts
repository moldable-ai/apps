import type { RawTutorial } from '../../tutorial-builder'
import { majorScaleRecipeTutorial } from './01-major-scale-recipe'
import { cVsGMajorTutorial } from './02-c-vs-g-major'
import { eMajorTutorial } from './03-e-major'
import { majorVsMinorTutorial } from './04-major-vs-minor'
import { dorianTutorial } from './05-mode-dorian'
import { mixolydianTutorial } from './06-mode-mixolydian'
import { circleOfFifthsTutorial } from './07-circle-of-fifths'
import { triadInversionsTutorial } from './08-triad-inversions'
import { seventhChordsTutorial } from './09-seventh-chords'
import { voiceLeadingTutorial } from './10-voice-leading'

export const intermediateTutorials: RawTutorial[] = [
  majorScaleRecipeTutorial,
  cVsGMajorTutorial,
  eMajorTutorial,
  majorVsMinorTutorial,
  dorianTutorial,
  mixolydianTutorial,
  circleOfFifthsTutorial,
  triadInversionsTutorial,
  seventhChordsTutorial,
  voiceLeadingTutorial,
]
