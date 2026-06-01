import type { RawTutorial } from '../../tutorial-builder'

export const openCScaleTutorial: RawTutorial = {
  id: 'tutorial-open-c-scale',
  title: 'The Open C Major Scale',
  beatsPerBar: 4,
  phrase: [
    // Up: C D E F G A B C
    ['C3', 0.0, 1.0],
    ['D3', 1.0, 1.0],
    ['E3', 2.0, 1.0],
    ['F3', 3.0, 1.0],
    ['G3', 4.0, 1.0],
    ['A3', 5.0, 1.0],
    ['B3', 6.0, 1.0],
    ['C4', 7.0, 2.0],
    // Down: C B A G F E D C
    ['C4', 10.0, 1.0],
    ['B3', 11.0, 1.0],
    ['A3', 12.0, 1.0],
    ['G3', 13.0, 1.0],
    ['F3', 14.0, 1.0],
    ['E3', 15.0, 1.0],
    ['D3', 16.0, 1.0],
    ['C3', 17.0, 2.0],
  ],
  tutorial: {
    title: 'The Open C Major Scale',
    summary:
      'The C major scale is the friendliest scale on the instrument — all natural notes, no sharps or flats. In open position it runs C D E F G A B C, using a mix of open strings and low frets on the A, D, G, and B strings. Play it up to the higher C, then back down. Listen for the satisfying "arrival" when you land on the top and bottom C — that is the home note (the tonic) of the scale.',
    level: 'Beginner',
    objectives: [
      'Play the C major scale up and down in open position',
      'Recognize that C major uses only natural notes',
      'Hear the tonic C resolve at the top and bottom',
    ],
    sections: [
      {
        id: 'up-the-scale',
        title: 'Up the scale',
        start: 0,
        end: 10,
        focus: 'ascending from low C to high C',
        learn: [
          'The notes are C D E F G A B C — eight notes, an octave apart at the ends.',
          'No sharps or flats: C major is all natural notes.',
          'Notice the small half-step gaps between E-F and B-C.',
        ],
        tryThis: ['Sing the note names as you ascend.'],
      },
      {
        id: 'down-the-scale',
        title: 'Down the scale',
        start: 10,
        end: 19,
        focus: 'descending back to the home note',
        learn: [
          'Coming down reverses the order: C B A G F E D C.',
          'Landing on the low C feels like coming home — that is resolution.',
        ],
        reinforce: ['Keep the timing even both up and down.'],
      },
    ],
  },
}
