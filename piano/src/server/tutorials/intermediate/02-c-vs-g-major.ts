import type { RawTutorial } from '../../tutorial-builder'

export const cVsGMajorTutorial: RawTutorial = {
  id: 'tutorial-c-vs-g-major',
  title: 'C Major vs G Major',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: C major phrase
    ['C4', 0.0, 0.45],
    ['E4', 0.5, 0.45],
    ['G4', 1.0, 0.45],
    ['C5', 1.5, 0.45],
    ['B4', 2.0, 0.45],
    ['G4', 2.5, 0.45],
    ['E4', 3.0, 0.45],
    ['C4', 3.5, 1.2],
    // 7–13s: G major — same shape but transposed; needs F# instead of F
    ['G3', 7.0, 0.45],
    ['B3', 7.5, 0.45],
    ['D4', 8.0, 0.45],
    ['G4', 8.5, 0.45],
    ['F#4', 9.0, 0.45],
    ['D4', 9.5, 0.45],
    ['B3', 10.0, 0.45],
    ['G3', 10.5, 1.2],
    // 14–20s: Break it on purpose — use F natural in G major
    ['G3', 14.0, 0.45],
    ['B3', 14.5, 0.45],
    ['D4', 15.0, 0.45],
    ['F4', 15.5, 0.6, 0.85],
    ['D4', 16.1, 0.45],
    ['B3', 16.6, 0.45],
    ['G3', 17.1, 1.4],
    // 22–29s: Both keys side by side — recognize the bright sameness
    ['C4', 22.0, 0.4],
    ['E4', 22.4, 0.4],
    ['G4', 22.8, 0.4],
    ['C5', 23.2, 0.4],
    ['G3', 24.0, 0.4],
    ['B3', 24.4, 0.4],
    ['D4', 24.8, 0.4],
    ['G4', 25.2, 0.4],
    ['F#4', 25.6, 0.4],
    ['D4', 26.0, 0.4],
    ['B3', 26.4, 0.4],
    ['G3', 26.8, 1.4],
  ],
  tutorial: {
    title: 'C Major vs G Major',
    summary:
      'C major and G major are neighbors in the cycle of fifths — they share six of seven notes. The only difference: G major needs F♯ instead of F. That single black key is what shifts the entire key center up a fifth.',
    level: 'Intermediate',
    objectives: [
      'Hear C major and G major as related but distinct',
      'Identify F♯ as the one note unique to G major',
      'Recognize that F natural sounds wrong in G major',
    ],
    sections: [
      {
        id: 'c-major',
        title: 'A C major phrase',
        start: 0,
        end: 7,
        focus: 'C E G C B G E C — all white keys',
        learn: [
          'C major has zero sharps or flats',
          'It\'s the most common starting "home" in beginner music',
        ],
      },
      {
        id: 'g-major',
        title: 'Same shape, in G major',
        start: 7,
        end: 14,
        focus: 'G B D G F♯ D B G — note the F♯',
        learn: [
          'Same melodic shape, transposed up a 5th',
          'The recipe (W-W-H-W-W-W-H) forces F♯ instead of F natural',
        ],
        tryThis: [
          'Compare the two phrases — they sound like the same idea in a brighter key',
        ],
      },
      {
        id: 'break',
        title: "Try F natural — it's wrong",
        start: 14,
        end: 21,
        focus: 'Same G major phrase, but F natural instead of F♯',
        learn: [
          'F natural is the leading tone of C major, not G',
          "In G major, F doesn't pull anywhere — it just sounds out of place",
        ],
        breakIt: [
          'Hear how F natural feels deflated inside the G major phrase',
          'F♯ is what makes G feel like home',
        ],
      },
      {
        id: 'side-by-side',
        title: 'Both keys, back to back',
        start: 22,
        end: 28,
        focus: 'C major arpeggio, then G major arpeggio',
        learn: [
          "C and G are 'one step away' in the cycle of fifths (one sharp difference)",
          'You can already move smoothly between them by adjusting one note',
        ],
        reinforce: [
          'Try D major next: it adds C♯ on top of F♯ (two sharps total)',
          'Each step around the cycle adds one more sharp',
        ],
      },
    ],
  },
}
