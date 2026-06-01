import type { RawTutorial } from '../../tutorial-builder'

export const pentatonicBoxTutorial: RawTutorial = {
  id: 'tutorial-pentatonic-box',
  title: 'The Minor Pentatonic Box',
  beatsPerBar: 4,
  phrase: [
    // Ascending E minor pentatonic: E2 G2 A2 B2 D3 E3 G3 A3
    ['E2', 0.0, 1.0],
    ['G2', 1.0, 1.0],
    ['A2', 2.0, 1.0],
    ['B2', 3.0, 1.0],
    ['D3', 4.0, 1.0],
    ['E3', 5.0, 1.0],
    ['G3', 6.0, 1.0],
    ['A3', 7.0, 1.0],
    ['E3', 8.0, 2.0],
    // Descending: A3 G3 E3 D3 B2 A2 G2 E2
    ['A3', 10.0, 1.0],
    ['G3', 11.0, 1.0],
    ['E3', 12.0, 1.0],
    ['D3', 13.0, 1.0],
    ['B2', 14.0, 1.0],
    ['A2', 15.0, 1.0],
    ['G2', 16.0, 1.0],
    ['E2', 17.0, 2.0],
  ],
  tutorial: {
    title: 'The Minor Pentatonic Box',
    summary:
      "The minor pentatonic is the lead guitarist's safety net — five notes per octave that sound great over a huge range of songs. In E minor those notes are E, G, A, B, and D. Here you play them as a smooth line up and back down, reaching up to G and A in the next octave. Once your fingers know this shape, you can improvise solos that almost always sound right. Take it slow first, then let it sing.",
    level: 'Beginner',
    objectives: [
      'Learn the five notes of the E minor pentatonic scale',
      'Play the scale ascending and descending',
      'Understand why it is a reliable scale for soloing',
    ],
    sections: [
      {
        id: 'ascending',
        title: 'Up the box',
        start: 0,
        end: 10,
        focus: 'climbing the five pentatonic notes',
        learn: [
          'E minor pentatonic is E, G, A, B, D — five notes per octave.',
          '"Penta" means five; we skip two notes of the full scale.',
          'These notes rarely clash, which is why solos lean on them.',
        ],
        tryThis: ['Keep one finger per fret and stay relaxed.'],
      },
      {
        id: 'descending',
        title: 'Down the box',
        start: 10,
        end: 19,
        focus: 'coming back down to the root',
        learn: [
          'Descending reinforces the shape in your hand and ear.',
          'Landing on the low E roots the whole pattern.',
        ],
        reinforce: [
          'Once comfortable, try playing the notes in a free, melodic order.',
        ],
      },
    ],
  },
}
