import type { RawTutorial } from '../../tutorial-builder'

export const connectingPositionsTutorial: RawTutorial = {
  id: 'tutorial-connecting-positions',
  title: 'Connecting Positions',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // C major (C E G) -> Am (A C E): common tones C and E
    ['C3', 0.0, 0.5],
    ['E3', 0.5, 0.5],
    ['G3', 1.0, 0.5],
    ['C3', 1.5, 1.0],
    ['E3', 1.5, 1.0],
    ['G3', 1.5, 1.0],
    ['A2', 3.0, 0.5],
    ['C3', 3.5, 0.5],
    ['E3', 4.0, 0.5],
    ['A2', 4.5, 1.0],
    ['C3', 4.5, 1.0],
    ['E3', 4.5, 1.0],
    // Am (A C E) -> F (F A C): common tones A and C
    ['F2', 6.0, 0.5],
    ['A2', 6.5, 0.5],
    ['C3', 7.0, 0.5],
    ['F2', 7.5, 1.0],
    ['A2', 7.5, 1.0],
    ['C3', 7.5, 1.0],
    // F (F A C) -> G (G B D): all notes move stepwise
    ['G2', 9.0, 0.5],
    ['B2', 9.5, 0.5],
    ['D3', 10.0, 0.5],
    ['G2', 10.5, 1.0],
    ['B2', 10.5, 1.0],
    ['D3', 10.5, 1.0],
    // Resolve back to C
    ['C3', 12.0, 0.5],
    ['E3', 12.5, 0.5],
    ['G3', 13.0, 0.5],
    ['C3', 13.5, 1.5],
    ['E3', 13.5, 1.5],
    ['G3', 13.5, 1.5],
  ],
  tutorial: {
    title: 'Connecting Positions',
    summary:
      'Smooth chord changes come from voice leading: keep common tones and move other notes the shortest distance. Through C - Am - F - G - C, watch how shared notes stay put while the rest step gently to their nearest neighbor. C and Am share C and E; Am and F share A and C. Moving the least keeps progressions fluid and easy under the fingers.',
    level: 'Intermediate',
    objectives: [
      'Move between chords keeping common tones',
      'Use stepwise motion for the notes that must change',
      'Play C - Am - F - G - C smoothly',
      'Hear how minimal motion sounds connected',
    ],
    sections: [
      {
        id: 'common-tones',
        title: 'Keeping Common Tones',
        start: 0,
        end: 6,
        focus: 'C to Am shares C and E',
        learn: [
          'C major (C E G) and Am (A C E) share two notes: C and E.',
          'C and E stay put while G gives way to A, so the harmony changes with very little motion.',
        ],
        tryThis: ['Spot which finger never has to move.'],
      },
      {
        id: 'stepwise',
        title: 'Stepwise Motion',
        start: 6,
        end: 12,
        focus: 'Am to F to G with small moves',
        learn: [
          'Am to F shares A and C; only E steps down to F.',
          'F to G moves each voice up by just a step.',
        ],
      },
      {
        id: 'resolve',
        title: 'Resolving Home',
        start: 12,
        end: 15,
        focus: 'G back to C',
        learn: [
          'G (G B D) leads back to C: B rises to C, D rises to E, and G stays as a common tone.',
          'Short moves keep a progression feeling connected.',
        ],
        reinforce: ['Move the least and changes sound seamless.'],
      },
    ],
  },
}
