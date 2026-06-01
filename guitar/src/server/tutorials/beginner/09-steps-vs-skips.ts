import type { RawTutorial } from '../../tutorial-builder'

export const stepsVsSkipsTutorial: RawTutorial = {
  id: 'tutorial-steps-vs-skips',
  title: 'Steps vs Skips',
  beatsPerBar: 4,
  phrase: [
    // Steps: adjacent scale notes on D and G strings
    ['D3', 0.0, 1.0],
    ['E3', 1.0, 1.0],
    ['F#3', 2.0, 1.0],
    ['G3', 3.0, 1.0],
    ['A3', 4.0, 1.0],
    ['G3', 5.0, 1.0],
    ['F#3', 6.0, 1.0],
    ['E3', 7.0, 1.0],
    ['D3', 8.0, 2.0],
    // Skips: thirds and leaps on D and G strings
    ['D3', 10.0, 1.0],
    ['F#3', 11.0, 1.0],
    ['A3', 12.0, 1.0],
    ['F#3', 13.0, 1.0],
    ['D3', 14.0, 1.0],
    ['G3', 15.0, 1.0],
    ['B3', 16.0, 1.0],
    ['G3', 17.0, 1.0],
    ['D3', 18.0, 2.0],
  ],
  tutorial: {
    title: 'Steps vs Skips',
    summary:
      'Melodies move in two basic ways. A step goes to the very next note in the scale (a small move, like D to E). A skip jumps over a note or more (a bigger move, like D to F#, a third). First you play a smooth stepwise line on the D and G strings, then the same area using skips. Hear how steps feel connected and gentle while skips feel bolder and more open. Both are essential tools for writing melodies.',
    level: 'Beginner',
    objectives: [
      'Tell the difference between a step and a skip by ear',
      'Play smooth stepwise motion across two strings',
      'Play skips (thirds and small leaps) cleanly',
    ],
    sections: [
      {
        id: 'steps',
        title: 'Smooth steps',
        start: 0,
        end: 10,
        focus: 'moving to the very next scale note',
        learn: [
          'A step moves to the adjacent scale note — a small, connected motion.',
          'Stepwise lines sound smooth and singable.',
        ],
        tryThis: [
          'Keep your fingers close to the strings so steps stay legato.',
        ],
      },
      {
        id: 'skips',
        title: 'Bold skips',
        start: 10,
        end: 20,
        focus: 'jumping over notes for a wider sound',
        learn: [
          'A skip jumps past at least one scale note, like D to F# (a third).',
          'Skips sound more open and dramatic than steps.',
        ],
        reinforce: [
          'Aim for the same volume on every note, even across the jumps.',
        ],
      },
    ],
  },
}
