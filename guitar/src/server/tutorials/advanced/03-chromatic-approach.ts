import type { RawTutorial } from '../../tutorial-builder'

export const chromaticApproachTutorial: RawTutorial = {
  id: 'tutorial-chromatic-approach',
  title: 'Chromatic Approach Notes',
  bpm: 84,
  beatsPerBar: 4,
  phrase: [
    // Section 1: a plain arpeggio of chord tones over C (C E G), no chromatics
    ['C3', 0.0, 0.45],
    ['E3', 0.45, 0.45],
    ['G3', 0.9, 0.45],
    ['C4', 1.35, 0.45],
    ['G3', 1.8, 0.45],
    ['E3', 2.25, 0.45],
    ['C3', 2.7, 0.9],
    // Section 2: approach each chord tone by a semitone from below
    ['B2', 4.0, 0.25], // approach to C
    ['C3', 4.25, 0.4],
    ['D#3', 4.65, 0.25], // approach to E
    ['E3', 4.9, 0.4],
    ['F#3', 5.3, 0.25], // approach to G
    ['G3', 5.55, 0.4],
    ['B3', 5.95, 0.25], // approach to C4
    ['C4', 6.2, 0.6],
    ['A#3', 6.8, 0.25], // approach to B... resolving down
    ['G3', 7.05, 0.4],
    ['F#3', 7.45, 0.25], // approach to G
    ['G3', 7.7, 0.4],
    ['C3', 8.1, 0.9],
    // Section 3: bebop line mixing approaches from below and above
    ['G3', 9.5, 0.3],
    ['G#3', 9.8, 0.25], // chromatic from below to A
    ['A3', 10.05, 0.3],
    ['B3', 10.35, 0.25], // from above to A#... passing
    ['A#3', 10.6, 0.25],
    ['A3', 10.85, 0.3], // from above to G#
    ['G#3', 11.15, 0.25],
    ['G3', 11.4, 0.4],
    ['F#3', 11.8, 0.25], // from below to G
    ['G3', 12.05, 0.3],
    ['D#3', 12.35, 0.25], // from below to E
    ['E3', 12.6, 0.3],
    ['F3', 12.9, 0.25], // from above to E
    ['E3', 13.15, 0.3],
    ['C3', 13.5, 1.4],
    ['E3', 13.5, 1.4],
    ['G3', 13.5, 1.4],
  ],
  tutorial: {
    title: 'Chromatic Approach Notes',
    summary:
      'A chromatic approach note is a tone a half-step away from a target chord tone, used as a springboard. Approach from below (F# to G, G# to A) or from above (F to E). It is the central bebop trick for making fast lead lines flow smoothly across the fretboard while still outlining the harmony. The approach tones never sit — they snap into the target.',
    level: 'Advanced',
    objectives: [
      'Identify the chord tones you want to target',
      'Approach a target from a semitone below',
      'Approach a target from a semitone above',
      'Keep approach notes short so the chord tones stay strong',
    ],
    sections: [
      {
        id: 'targets',
        title: 'The chord tones',
        start: 0,
        end: 4.0,
        focus: 'C E G — the targets we will decorate',
        learn: [
          'First hear the bare arpeggio: clean, but a little plain',
          'These three tones are the landing spots for every approach',
        ],
      },
      {
        id: 'below',
        title: 'Approach from below',
        start: 4.0,
        end: 9.5,
        focus: 'A semitone under each target (F# to G)',
        learn: [
          'Each chromatic note resolves up by a half step into a chord tone',
          'The short approach note creates pull; the target releases it',
        ],
        tryThis: [
          'Play F# then G and feel the magnetic snap upward',
          'Slow to 0.5x to hear that the approach tone is never the goal',
        ],
      },
      {
        id: 'bebop',
        title: 'The bebop line',
        start: 9.5,
        end: 14.9,
        focus: 'Mixing approaches from below and above',
        learn: [
          'Approaching from above (F to E) sounds like a sigh downward',
          'Alternating directions makes the line weave like a horn solo',
        ],
        reinforce: [
          'Any chromatic note works if it resolves to a chord tone',
          'Keep approaches quick — the harmony lives in the targets',
        ],
      },
    ],
  },
}
