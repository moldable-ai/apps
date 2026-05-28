import type { RawTutorial } from '../../tutorial-builder'
import { keyboardPatternTutorial } from './a-keyboard-pattern'
import { octavesAndNamesTutorial } from './a-octaves-and-names'
import { countingFourTutorial } from './b-counting-four'
import { oneNoteInTimeTutorial } from './b-one-note-in-time'
import { cPositionTutorial } from './c-c-position'
import { firstMelodiesTutorial } from './c-first-melodies'
import { cIsHomeTutorial } from './d-c-is-home'
import { cMajorUpDownTutorial } from './d-c-major-up-down'
import { stepsVsSkipsTutorial } from './e-steps-vs-skips'
import { thirdsAndFifthsTutorial } from './e-thirds-and-fifths'
import { majorTriadTutorial } from './f-major-triad'
import { minorTriadTutorial } from './f-minor-triad'
import { leadingToneTutorial } from './g-leading-tone'
import { pentatonicSafetyTutorial } from './g-pentatonic-safety'

export const beginnerTutorials: RawTutorial[] = [
  keyboardPatternTutorial,
  octavesAndNamesTutorial,
  oneNoteInTimeTutorial,
  countingFourTutorial,
  cPositionTutorial,
  firstMelodiesTutorial,
  cMajorUpDownTutorial,
  cIsHomeTutorial,
  stepsVsSkipsTutorial,
  thirdsAndFifthsTutorial,
  majorTriadTutorial,
  minorTriadTutorial,
  pentatonicSafetyTutorial,
  leadingToneTutorial,
]
