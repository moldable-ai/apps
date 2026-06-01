import type { RawTutorial } from '../../tutorial-builder'

export const rubatoTutorial: RawTutorial = {
  id: 'tutorial-rubato',
  title: 'Rubato — Time as Expression',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // Section 1: the phrase played strictly in time — even quarter-ish notes
    ['A3', 0.0, 0.5],
    ['C4', 0.5, 0.5],
    ['E4', 1.0, 0.5],
    ['D4', 1.5, 0.5],
    ['C4', 2.0, 0.5],
    ['B3', 2.5, 0.5],
    ['A3', 3.0, 0.5],
    ['E4', 3.5, 1.0],
    // Section 2: the same phrase with rubato — stretched, compressed, with gaps
    ['A3', 6.0, 0.8], // lingered start
    ['C4', 6.9, 0.35],
    ['E4', 7.25, 0.3], // hurried mid-phrase
    ['D4', 7.55, 0.9], // leaning on the peak
    // small breath gap here
    ['C4', 8.9, 0.45],
    ['B3', 9.35, 0.7], // pull back
    ['A3', 10.2, 0.4],
    ['E4', 10.7, 1.6], // long expressive arrival
    // Section 3: an even freer reading — bigger gaps, more give and take
    ['A3', 13.5, 1.1], // very slow, savored
    // breath
    ['C4', 15.0, 0.3],
    ['E4', 15.3, 0.3], // sudden rush upward
    ['D4', 15.6, 1.2], // sit on the tension
    // breath
    ['C4', 17.4, 0.35],
    ['B3', 17.75, 0.35],
    ['A3', 18.1, 0.5], // gentle settle
    ['E4', 18.7, 2.0], // final note allowed to bloom and fade
  ],
  tutorial: {
    title: 'Rubato — Time as Expression',
    summary:
      'Rubato (Italian for "robbed time") means bending the tempo for expression: stretch a note here, hurry a run there, leave a breath of silence before a key arrival. The pitches never change — only the timing does. Hear one short lead line three ways: first strict and metronomic, then gently rubato, then very free, so you can feel how time itself becomes a phrasing tool.',
    level: 'Advanced',
    objectives: [
      'Distinguish strict time from rubato',
      'Stretch important notes and hurry passing ones',
      'Use small silences as breaths before arrivals',
      'Shape the same phrase three different ways',
    ],
    sections: [
      {
        id: 'strict',
        title: 'Strict time',
        start: 0,
        end: 6.0,
        focus: 'Even notes, locked to the beat',
        learn: [
          'Every note gets the same length — clean but mechanical',
          'This is your reference; the pitches stay identical throughout',
        ],
      },
      {
        id: 'rubato',
        title: 'A little give and take',
        start: 6.0,
        end: 13.5,
        focus: 'Stretch the peaks, hurry the passing tones',
        learn: [
          'The high note is lingered on; the climb to it is rushed',
          'A short silence before the final note becomes a breath',
        ],
        tryThis: [
          'Play it slow into the peak, then ease off the gas afterward',
          'Compare to the strict version — same notes, new feeling',
        ],
      },
      {
        id: 'free',
        title: 'Fully free',
        start: 13.5,
        end: 20.7,
        focus: 'Bigger gaps, dramatic stretching',
        learn: [
          'Long held notes and real silences let the line breathe',
          'The final note is allowed to bloom and fade in its own time',
        ],
        reinforce: [
          'Rubato changes timing, never pitch',
          'Expressive time is borrowed and paid back across the phrase',
        ],
      },
    ],
  },
}
