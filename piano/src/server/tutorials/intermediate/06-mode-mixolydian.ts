import type { RawTutorial } from '../../tutorial-builder'

export const mixolydianTutorial: RawTutorial = {
  id: 'tutorial-mode-mixolydian',
  title: 'Modes II — Mixolydian',
  bpm: 80,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: G Mixolydian scale (white keys from G)
    ['G3', 0.0, 0.5],
    ['A3', 0.55, 0.5],
    ['B3', 1.1, 0.5],
    ['C4', 1.65, 0.5],
    ['D4', 2.2, 0.5],
    ['E4', 2.75, 0.5],
    ['F4', 3.3, 0.5],
    ['G4', 3.85, 1.2],
    // 7–13s: A Mixolydian phrase — bluesy / rock feel
    ['G3', 7.0, 0.45],
    ['B3', 7.5, 0.45],
    ['D4', 8.0, 0.45],
    ['F4', 8.5, 0.45],
    ['D4', 9.0, 0.45],
    ['B3', 9.5, 0.45],
    ['G3', 10.0, 0.45],
    ['F4', 10.5, 0.45],
    ['G4', 11.0, 1.4],
    // 14–21s: Compare — G major uses F# instead of F natural
    ['G3', 14.0, 0.45],
    ['B3', 14.5, 0.45],
    ['D4', 15.0, 0.45],
    ['F#4', 15.5, 0.45, 0.85],
    ['D4', 16.0, 0.45],
    ['B3', 16.5, 0.45],
    ['G3', 17.0, 0.45],
    ['F#4', 17.5, 0.45],
    ['G4', 18.0, 1.4],
    // 22–30s: Back to Mixolydian — F natural is the flat 7
    ['G3', 22.0, 0.45],
    ['D4', 22.5, 0.45],
    ['F4', 23.0, 0.45],
    ['G4', 23.5, 0.45],
    ['F4', 24.0, 0.45],
    ['D4', 24.5, 0.45],
    ['C4', 25.0, 0.45],
    ['B3', 25.5, 0.45],
    ['G3', 26.0, 1.5],
  ],
  tutorial: {
    title: 'Modes II — Mixolydian',
    summary:
      'Mixolydian is a major scale with a flat 7th. Same white keys as C major, but home is G. The flat 7th gives it that bluesy, rock-and-roll, "Dear Prudence" quality.',
    level: 'Intermediate',
    objectives: [
      'Play the G Mixolydian scale (white keys from G to G)',
      'Hear the "flat 7" as the signature Mixolydian note',
      'Recognize the contrast with full G major',
    ],
    sections: [
      {
        id: 'g-mix',
        title: 'G Mixolydian — white keys from G',
        start: 0,
        end: 7,
        focus: 'G A B C D E F G — note that 7th is F natural, not F♯',
        learn: [
          'Mixolydian is the 5th mode of the major scale',
          'G Mixolydian and C major share all 7 notes',
        ],
      },
      {
        id: 'phrase',
        title: 'A Mixolydian phrase',
        start: 7,
        end: 14,
        focus: 'G arpeggio with F natural — the bluesy color',
        learn: [
          'F natural is a "flat 7" — F♯ would give plain G major',
          'This is the sound of Dorothy Brooke crooning, AC/DC riffs, and "Norwegian Wood"',
        ],
      },
      {
        id: 'vs-major',
        title: 'Vs G major (F♯ instead of F)',
        start: 14,
        end: 22,
        focus: 'Same melody but with the raised 7th — sounds tame and clean',
        learn: [
          'G major\'s F♯ is the "leading tone" — wants to resolve to G',
          "Mixolydian's F natural is more relaxed — doesn't pull as hard",
        ],
        breakIt: [
          "G major sounds 'correct' but loses the bluesy edge",
          'F natural is what gives Mixolydian its character',
        ],
      },
      {
        id: 'mix-back',
        title: 'Mixolydian feel',
        start: 22,
        end: 30,
        focus: 'F natural emphasized — the flat 7 dominates',
        learn: [
          'Mixolydian is everywhere in rock, country, and Celtic music',
          "It's a major scale with one foot in the blues",
        ],
        reinforce: [
          "Play G major chord, then drop to F major chord, then back — that's the Mixolydian color",
          'Try improvising on white keys but always end on G',
        ],
      },
    ],
  },
}
