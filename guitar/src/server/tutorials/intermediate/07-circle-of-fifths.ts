import type { RawTutorial } from '../../tutorial-builder'

export const circleOfFifthsTutorial: RawTutorial = {
  id: 'tutorial-circle-of-fifths',
  title: 'The Circle of Fifths',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // Walk roots a fifth apart: C G D A E
    ['C3', 0.0, 0.75],
    ['G3', 0.75, 0.75],
    ['D3', 1.5, 0.75],
    ['A3', 2.25, 0.75],
    ['E3', 3.0, 0.75],
    ['B3', 3.75, 1.25],
    // I-IV-V-I cadence in C: C, F, G, C triads
    ['C3', 6.0, 1.0],
    ['E3', 6.0, 1.0],
    ['G3', 6.0, 1.0],
    ['F3', 7.0, 1.0],
    ['A3', 7.0, 1.0],
    ['C4', 7.0, 1.0],
    ['G3', 8.0, 1.0],
    ['B3', 8.0, 1.0],
    ['D4', 8.0, 1.0],
    ['C3', 9.0, 1.5],
    ['E3', 9.0, 1.5],
    ['G3', 9.0, 1.5],
    // I-IV-V-I cadence in G: G, C, D, G triads
    ['G2', 12.0, 1.0],
    ['B2', 12.0, 1.0],
    ['D3', 12.0, 1.0],
    ['C3', 13.0, 1.0],
    ['E3', 13.0, 1.0],
    ['G3', 13.0, 1.0],
    ['D3', 14.0, 1.0],
    ['F#3', 14.0, 1.0],
    ['A3', 14.0, 1.0],
    ['G2', 15.0, 1.5],
    ['B2', 15.0, 1.5],
    ['D3', 15.0, 1.5],
  ],
  tutorial: {
    title: 'The Circle of Fifths',
    summary:
      'Move up by fifths and you tour every key in order: C, G, D, A, E, and onward. Each step adds one sharp. The fifth is the strongest pull in music, which is why the V chord wants to resolve to I. Here you walk a chain of fifth-related roots, then play a I-IV-V-I cadence in C and again in G to feel fifths pulling chords home.',
    level: 'Intermediate',
    objectives: [
      'Walk a chain of roots a fifth apart',
      'Understand that each fifth adds one sharp',
      'Play a I-IV-V-I cadence in two keys',
      'Hear the V chord resolve strongly to I',
    ],
    sections: [
      {
        id: 'walk-fifths',
        title: 'Walking by Fifths',
        start: 0,
        end: 6,
        focus: 'C to G to D to A to E',
        learn: [
          'Each root is a perfect fifth above the last: C, G, D, A, E.',
          'Every move clockwise around the circle adds one sharp.',
        ],
        tryThis: ['Count up seven frets to find the next fifth.'],
      },
      {
        id: 'cadence-c',
        title: 'I-IV-V-I in C',
        start: 6,
        end: 12,
        focus: 'The strongest chord motion',
        learn: [
          'C-F-G-C is I-IV-V-I; notes sharing a start ring as chords.',
          'The G (V) chord pulls hard back to C (I).',
        ],
      },
      {
        id: 'cadence-g',
        title: 'I-IV-V-I in G',
        start: 12,
        end: 16.5,
        focus: 'Same motion one fifth over',
        learn: [
          'G-C-D-G is the same cadence shifted up a fifth.',
          'The D (V) chord uses F# and resolves home to G.',
        ],
        reinforce: ['Fifths are the glue connecting every key.'],
      },
    ],
  },
}
