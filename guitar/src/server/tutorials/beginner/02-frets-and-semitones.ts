import type { RawTutorial } from '../../tutorial-builder'

export const fretsAndSemitonesTutorial: RawTutorial = {
  id: 'tutorial-frets-and-semitones',
  title: 'Frets & Semitones',
  beatsPerBar: 4,
  phrase: [
    // Climb frets 0-5 on the low E string
    ['E2', 0.0, 0.75],
    ['F2', 1.0, 0.75],
    ['F#2', 2.0, 0.75],
    ['G2', 3.0, 0.75],
    ['G#2', 4.0, 0.75],
    ['A2', 5.0, 1.0],
    // Descend back down
    ['A2', 7.0, 0.75],
    ['G#2', 8.0, 0.75],
    ['G2', 9.0, 0.75],
    ['F#2', 10.0, 0.75],
    ['F2', 11.0, 0.75],
    ['E2', 12.0, 1.5],
  ],
  tutorial: {
    title: 'Frets & Semitones',
    summary:
      'Stay on the low E string and walk up the first five frets one at a time. Each fret you press raises the pitch by exactly one semitone — the smallest step in Western music, also called a half step. Open E becomes F, F#, G, G#, then A at the fifth fret (the same pitch as the open A string). Then we walk back down. Watch your fretting finger land just behind each fret wire for a clean note.',
    level: 'Beginner',
    objectives: [
      'Understand that one fret equals one semitone (half step)',
      'Climb the low E string from open through the 5th fret',
      'Notice that the 5th fret of E matches the open A string',
    ],
    sections: [
      {
        id: 'climbing-the-frets',
        title: 'Climbing the frets',
        start: 0,
        end: 7,
        focus: 'one fret at a time, one semitone at a time',
        learn: [
          'Open low E = E2. Pressing fret 1 gives F2, fret 2 gives F#2, and so on.',
          'Every fret raises the pitch by one semitone.',
          'Press just behind the fret wire and keep the note ringing.',
        ],
        tryThis: ['Count the frets out loud: 0, 1, 2, 3, 4, 5.'],
      },
      {
        id: 'coming-back-down',
        title: 'Coming back down',
        start: 7,
        end: 14,
        focus: 'descending semitones back to the open string',
        learn: [
          'Going down a fret lowers the pitch by one semitone.',
          'The note at fret 5 (A2) is the same as the open A string.',
        ],
        reinforce: [
          'Lift one finger at a time as you descend so each note stays clean.',
        ],
      },
    ],
  },
}
