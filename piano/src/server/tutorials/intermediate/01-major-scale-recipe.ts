import type { RawTutorial } from '../../tutorial-builder'

export const majorScaleRecipeTutorial: RawTutorial = {
  id: 'tutorial-major-scale-recipe',
  title: 'The Major Scale Recipe',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–7s: C major scale — labelled by interval (whole/half pattern)
    ['C4', 0.0, 0.6],
    ['D4', 0.7, 0.6],
    ['E4', 1.4, 0.6],
    ['F4', 2.1, 0.6],
    ['G4', 2.8, 0.6],
    ['A4', 3.5, 0.6],
    ['B4', 4.2, 0.6],
    ['C5', 4.9, 1.4],
    // 8–15s: D major scale — same WWHWWWH pattern, different root
    ['D4', 8.0, 0.6],
    ['E4', 8.7, 0.6],
    ['F#4', 9.4, 0.6],
    ['G4', 10.1, 0.6],
    ['A4', 10.8, 0.6],
    ['B4', 11.5, 0.6],
    ['C#5', 12.2, 0.6],
    ['D5', 12.9, 1.4],
    // 16–23s: G major scale — one sharp (F#)
    ['G3', 16.0, 0.6],
    ['A3', 16.7, 0.6],
    ['B3', 17.4, 0.6],
    ['C4', 18.1, 0.6],
    ['D4', 18.8, 0.6],
    ['E4', 19.5, 0.6],
    ['F#4', 20.2, 0.6],
    ['G4', 20.9, 1.4],
    // 24–31s: F major scale — one flat (Bb = A#)
    ['F4', 24.0, 0.6],
    ['G4', 24.7, 0.6],
    ['A4', 25.4, 0.6],
    ['A#4', 26.1, 0.6],
    ['C5', 26.8, 0.6],
    ['D5', 27.5, 0.6],
    ['E5', 28.2, 0.6],
    ['F5', 28.9, 1.4],
  ],
  tutorial: {
    title: 'The Major Scale Recipe',
    summary:
      'Every major scale follows the same recipe of whole steps and half steps: W-W-H-W-W-W-H. Memorize this pattern and you can build a major scale from any starting note on the keyboard.',
    level: 'Intermediate',
    objectives: [
      'Memorize the W-W-H-W-W-W-H pattern',
      'Recognize that C major fits the pattern using only white keys',
      'Build a major scale from a different starting note (D, G, F)',
    ],
    sections: [
      {
        id: 'c-major',
        title: 'C major — the model',
        start: 0,
        end: 8,
        focus: 'White keys: C-D-E-F-G-A-B-C',
        learn: [
          'Intervals: Whole-Whole-Half-Whole-Whole-Whole-Half',
          'The half-steps land between E-F and B-C (the two places with no black key)',
        ],
        tryThis: [
          'Count the half-steps as you climb: 2, 2, 1, 2, 2, 2, 1',
          'These numbers are the recipe',
        ],
      },
      {
        id: 'd-major',
        title: 'D major — apply the recipe',
        start: 8,
        end: 16,
        focus: 'D E F♯ G A B C♯ D',
        learn: [
          'Starting on D, the recipe forces F♯ and C♯ (both black keys)',
          'Same intervals as C major, but transposed up by a whole step',
        ],
        tryThis: [
          'Build it slowly: D + 2 = E. E + 2 = F♯ (skip F!). F♯ + 1 = G. G + 2 = A. ...',
        ],
      },
      {
        id: 'g-major',
        title: 'G major — one sharp (F♯)',
        start: 16,
        end: 24,
        focus: 'G A B C D E F♯ G',
        learn: [
          'G major has just one black key in it: F♯',
          'It\'s the "next" key after C in the cycle of fifths (lesson 7)',
        ],
      },
      {
        id: 'f-major',
        title: 'F major — one flat (B♭)',
        start: 24,
        end: 31,
        focus: 'F G A B♭ C D E F',
        learn: [
          'F major has one black key: B♭ (the same key as A♯, different name)',
          'Notes are usually spelled "in the key" — B♭ in F major, A♯ in B major',
        ],
        reinforce: [
          "Pick any starting key. Apply W-W-H-W-W-W-H. You've just built a major scale.",
          'Every major scale in music works this way',
        ],
      },
    ],
  },
}
