import type { RawTutorial } from '../../tutorial-builder'

export const thirdsAndFifthsTutorial: RawTutorial = {
  id: 'tutorial-thirds-and-fifths',
  title: 'Hearing 3rds & 5ths',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: Thirds — C to E, then several thirds
    ['C4', 0.0, 0.6],
    ['E4', 0.7, 0.6],
    ['C4', 1.4, 0.4],
    ['E4', 1.85, 0.4],
    ['D4', 2.3, 0.6],
    ['F4', 3.0, 0.6],
    ['E4', 3.7, 0.6],
    ['G4', 4.4, 0.6],
    ['F4', 5.1, 0.6],
    ['A4', 5.8, 1.2],
    // 8–14s: Fifths — C to G
    ['C4', 8.0, 0.6],
    ['G4', 8.7, 0.6],
    ['C4', 9.4, 0.4],
    ['G4', 9.85, 0.4],
    ['D4', 10.3, 0.6],
    ['A4', 11.0, 0.6],
    ['E4', 11.7, 0.6],
    ['B4', 12.4, 0.6],
    ['F4', 13.1, 0.6],
    ['C5', 13.8, 1.2],
    // 16–22s: Stacked intervals — C E G as separate notes, then together
    ['C4', 16.0, 0.5],
    ['E4', 16.6, 0.5],
    ['G4', 17.2, 0.5],
    ['C4', 17.8, 0.4, 0.95],
    ['E4', 17.8, 0.4, 0.95],
    ['G4', 17.8, 0.4, 0.95],
    ['C4', 19.0, 0.5],
    ['G4', 19.6, 0.5],
    ['E4', 20.2, 0.5],
    ['C4', 20.8, 0.5],
    ['E4', 20.8, 0.5],
    ['G4', 20.8, 0.5],
    // 22–28s: Comparing — third vs fifth, played together
    ['C4', 22.0, 0.7, 0.9],
    ['E4', 22.0, 0.7, 0.9],
    ['C4', 23.0, 0.7, 0.9],
    ['G4', 23.0, 0.7, 0.9],
    ['C4', 24.0, 0.7, 0.9],
    ['E4', 24.0, 0.7, 0.9],
    ['G4', 24.0, 0.7, 0.9],
    ['C4', 25.2, 1.4],
  ],
  tutorial: {
    title: 'Hearing 3rds & 5ths',
    summary:
      'A 3rd skips one white key (C to E). A 5th skips three (C to G). These two intervals are the bones of harmony — almost every chord is made by stacking them.',
    level: 'Beginner',
    objectives: [
      'Identify a 3rd by ear and by sight',
      'Identify a 5th by ear and by sight',
      'Recognize that C–E–G stacked is a "triad"',
    ],
    sections: [
      {
        id: 'thirds',
        title: 'A 3rd: skip one key',
        start: 0,
        end: 8,
        focus: 'C to E — skip D. Several thirds in a row.',
        learn: [
          '"3rd" = skip one note in the alphabet (C-D-E counts three letters)',
          'It sounds sweet and consonant — almost cozy',
        ],
      },
      {
        id: 'fifths',
        title: 'A 5th: bigger, more open',
        start: 8,
        end: 16,
        focus: 'C to G — skip D, E, F',
        learn: [
          '"5th" = skip three notes (C-D-E-F-G counts five letters)',
          'Sounds strong, hollow, like rock guitar power chords',
        ],
        tryThis: [
          "Play C and G together — that's a 5th",
          'Try different roots: D and A, E and B, F and C',
        ],
      },
      {
        id: 'stack',
        title: 'Stack them = a chord',
        start: 16,
        end: 22,
        focus: 'C + E + G played as separate notes, then all together',
        learn: [
          'A 3rd plus another 3rd on top = a triad (a 3-note chord)',
          'C + E + G = C major triad — your first chord',
        ],
      },
      {
        id: 'compare',
        title: '3rd vs 5th, side by side',
        start: 22,
        end: 27,
        focus: 'Hear "third" (close), then "fifth" (open), then the full triad',
        learn: [
          'Thirds sound warm; fifths sound spacious',
          'Both together = the most stable chord in music',
        ],
        reinforce: [
          'Pick any white key. Play the 3rd above it (skip one). Play the 5th above it (skip three).',
          'You can build a triad from any of the seven white keys',
        ],
      },
    ],
  },
}
