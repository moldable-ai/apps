import type { RawTutorial } from '../../tutorial-builder'

export const keyboardPatternTutorial: RawTutorial = {
  id: 'tutorial-keyboard-pattern',
  title: "The Keyboard's Pattern",
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: Walk up every C across the keyboard
    ['C2', 0.0, 0.6],
    ['C3', 0.7, 0.6],
    ['C4', 1.4, 0.6],
    ['C5', 2.1, 0.6],
    ['C6', 2.8, 1.4],
    // 5–9s: Show each C surrounded by its 2-black-key group (low octave)
    ['C#4', 5.0, 0.35],
    ['D#4', 5.35, 0.35],
    ['C4', 5.7, 0.8],
    ['C#5', 6.5, 0.35],
    ['D#5', 6.85, 0.35],
    ['C5', 7.2, 0.8],
    // 10–14s: Then the 3-black-key group lives a few keys higher (F is just left)
    ['F#4', 10.0, 0.35],
    ['G#4', 10.35, 0.35],
    ['A#4', 10.7, 0.35],
    ['F4', 11.05, 0.8],
    ['F#5', 11.85, 0.35],
    ['G#5', 12.2, 0.35],
    ['A#5', 12.55, 0.35],
    ['F5', 12.9, 1.0],
    // 15–19s: Finger walk — pattern of 2 then 3 then 2 then 3 black keys
    ['C#4', 15.0, 0.25],
    ['D#4', 15.25, 0.25],
    ['F#4', 15.5, 0.25],
    ['G#4', 15.75, 0.25],
    ['A#4', 16.0, 0.25],
    ['C#5', 16.25, 0.25],
    ['D#5', 16.5, 0.25],
    ['F#5', 16.75, 0.25],
    ['G#5', 17.0, 0.25],
    ['A#5', 17.25, 0.25],
    ['C#6', 17.5, 0.9],
  ],
  tutorial: {
    title: "The Keyboard's Pattern",
    summary:
      "Every piano repeats the same pattern: groups of 2 and 3 black keys, side by side, over and over. Find the 2-black-key group and the white key just to its left is C. That's your anchor on the entire keyboard.",
    level: 'Beginner',
    objectives: [
      'Recognize the repeating 2 + 3 black-key pattern',
      'Find any C on the keyboard',
      'Find any F (just left of the 3-black-key group)',
    ],
    sections: [
      {
        id: 'every-c',
        title: 'Every C, top to bottom',
        start: 0,
        end: 5,
        focus: 'Listen — same note name, different heights',
        learn: [
          "The piano has 7 (or 8) C's on it — they all sound related",
          'Each C is the white key directly left of a 2-black-key group',
        ],
        tryThis: [
          'Look at the keyboard and find every 2-black-key group with your eyes',
          'The white key just to the left is C — every single time',
        ],
      },
      {
        id: 'two-group',
        title: 'The 2-black-key group',
        start: 5,
        end: 10,
        focus: 'C♯ and D♯ are the 2-group; C sits just to the left',
        learn: [
          'The two adjacent black keys are C♯ and D♯',
          'Think of them as your "C landmark" — they make C easy to find without looking',
        ],
        tryThis: [
          'Close your eyes, put a finger anywhere on the keyboard',
          'Open your eyes and find the nearest 2-black-key group — C is right next to it',
        ],
      },
      {
        id: 'three-group',
        title: 'The 3-black-key group',
        start: 10,
        end: 15,
        focus: 'F♯, G♯, A♯ — three black keys in a row; F is just to the left',
        learn: [
          'The 3-black-key group sits a few keys to the right of every 2-group',
          'The white key directly left of the 3-group is F',
        ],
      },
      {
        id: 'pattern',
        title: 'The pattern repeats',
        start: 15,
        end: 19,
        focus: 'Walking up every black key in one octave',
        learn: [
          '2-group + 3-group = one octave (12 keys total)',
          'This same pattern repeats across the entire keyboard',
        ],
        reinforce: [
          'Trace the pattern with your eyes from low to high',
          "You're now able to find any C or any F instantly — that's 14 of the 52 white keys, named",
        ],
      },
    ],
  },
}
