import type { RawTutorial } from '../../tutorial-builder'

export const tritoneTutorial: RawTutorial = {
  id: 'tutorial-tritone',
  title: 'The Tritone',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // Section 1: build the interval one note at a time, then together
    ['B2', 0.0, 0.6],
    ['F3', 0.9, 0.6],
    ['B2', 1.8, 1.0],
    ['F3', 1.8, 1.0],
    ['E3', 3.2, 0.6],
    ['A#3', 4.1, 0.6],
    ['E3', 5.0, 1.0],
    ['A#3', 5.0, 1.0],
    // Section 2: the stab — hit it hard, let it ring as pure tension
    ['B2', 6.5, 1.2, 0.95],
    ['F3', 6.5, 1.2, 0.95],
    ['B2', 8.0, 1.2, 0.95],
    ['F3', 8.0, 1.2, 0.95],
    ['B2', 9.5, 1.4, 1.0],
    ['F3', 9.5, 1.4, 1.0],
    // Section 3: resolve inward — voices converge to a consonant C/E (a major third)
    ['B2', 11.5, 0.8],
    ['F3', 11.5, 0.8],
    ['C3', 12.4, 1.4],
    ['E3', 12.4, 1.4],
    ['E3', 14.0, 0.6],
    ['A#3', 14.0, 0.6],
    ['D3', 14.7, 1.6],
    ['A3', 14.7, 1.6],
  ],
  tutorial: {
    title: 'The Tritone',
    summary:
      'The tritone splits the octave exactly in half — three whole tones, six frets apart on the guitar. B against F, or E against A#, produces maximum harmonic tension; medieval musicians nicknamed it "diabolus in musica," the devil in music. Stabbed and held it sounds unstable and grinding; let the two voices step inward by a half-step each — B up to C, F down to E — and it resolves into sweet consonance.',
    level: 'Advanced',
    objectives: [
      'Locate a tritone as six frets / three whole tones',
      'Hear why the interval feels unstable and grinding',
      'Stab the tritone for dramatic tension',
      'Resolve it inward into a consonant interval',
    ],
    sections: [
      {
        id: 'build',
        title: 'Building the interval',
        start: 0,
        end: 6.5,
        focus: 'B + F, then E + A# — both are tritones',
        learn: [
          'A tritone is six semitones — dead center of the octave',
          'On guitar it spans six frets on one string, or adjacent strings nearby',
        ],
      },
      {
        id: 'stab',
        title: 'The devil’s stab',
        start: 6.5,
        end: 11.5,
        focus: 'Hit it hard and let it ring',
        learn: [
          'Held alone the interval refuses to settle — pure tension',
          'There is no root implied, so the ear cannot rest',
        ],
        tryThis: [
          'Strike B and F together and let them sustain — feel the unease',
          'Compare it to a plain power chord to hear how restless it is',
        ],
      },
      {
        id: 'resolve',
        title: 'Resolving inward',
        start: 11.5,
        end: 16.3,
        focus: 'Each voice moves a half step inward',
        learn: [
          'B rises to C while F falls to E, closing into a consonant third',
          'The converging motion is what releases the tension',
        ],
        reinforce: [
          'Tension and release: the tritone is the engine, resolution is the payoff',
          'This inward resolution is the heart of every dominant-7 chord',
        ],
      },
    ],
  },
}
