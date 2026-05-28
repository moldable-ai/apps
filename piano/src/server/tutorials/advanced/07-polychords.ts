import type { RawTutorial } from '../../tutorial-builder'

export const polychordsTutorial: RawTutorial = {
  id: 'tutorial-polychords',
  title: 'Polychords — Stacking Triads',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: C major triad — plain
    ['C4', 0.0, 1.8, 0.9],
    ['E4', 0.0, 1.8, 0.9],
    ['G4', 0.0, 1.8, 0.9],
    // 6–11s: D major triad on top of C major
    ['C4', 6.0, 2.4, 0.85],
    ['E4', 6.0, 2.4, 0.85],
    ['G4', 6.0, 2.4, 0.85],
    ['D5', 6.0, 2.4, 0.9],
    ['F#5', 6.0, 2.4, 0.9],
    ['A5', 6.0, 2.4, 0.9],
    // 12–17s: F♯ on top of C — the "Petrushka chord"
    ['C4', 12.0, 2.4, 0.85],
    ['E4', 12.0, 2.4, 0.85],
    ['G4', 12.0, 2.4, 0.85],
    ['F#5', 12.0, 2.4, 0.9],
    ['A#5', 12.0, 2.4, 0.9],
    ['C#6', 12.0, 2.4, 0.9],
    // 18–23s: B♭ over C — the "Phrygian" sound
    ['C4', 18.0, 2.4, 0.85],
    ['E4', 18.0, 2.4, 0.85],
    ['G4', 18.0, 2.4, 0.85],
    ['A#4', 18.0, 2.4, 0.9],
    ['D5', 18.0, 2.4, 0.9],
    ['F5', 18.0, 2.4, 0.9],
    // 24–29s: Resolve to plain C major
    ['C4', 24.0, 2.4, 0.95],
    ['E4', 24.0, 2.4, 0.95],
    ['G4', 24.0, 2.4, 0.95],
    ['C5', 24.0, 2.4, 0.95],
    ['E5', 24.0, 2.4, 0.95],
    ['G5', 24.0, 2.4, 0.95],
  ],
  tutorial: {
    title: 'Polychords',
    summary:
      'A polychord is two triads played at the same time, with one stacked on top of the other. The combined sound is richer and more ambiguous than either chord alone. It\'s how Stravinsky and modern film composers create their "wide-open-sky" colors.',
    level: 'Advanced',
    objectives: [
      'Combine two triads into one polychord',
      'Hear how stacked triads create a richer, sometimes ambiguous harmony',
      'Recognize the iconic "Petrushka" polychord (C major + F♯ major)',
    ],
    sections: [
      {
        id: 'baseline',
        title: 'Plain C major triad',
        start: 0,
        end: 6,
        focus: 'C E G',
        learn: ['A single triad: clean, unambiguous'],
      },
      {
        id: 'd-over-c',
        title: 'D / C — bright, lifted',
        start: 6,
        end: 12,
        focus: 'D major triad in the right hand, C major in the left',
        learn: [
          'D major on top adds F♯ and A — notes outside C major',
          'The result floats — both bright and slightly unsettled',
        ],
      },
      {
        id: 'petrushka',
        title: 'F♯ / C — the Petrushka chord',
        start: 12,
        end: 18,
        focus: 'F♯ major over C major — two triads a tritone apart',
        learn: [
          'Stravinsky used this exact stack in "Petrushka" (1911)',
          "It's the sound of two keys fighting — both equally valid",
        ],
      },
      {
        id: 'b-flat-over-c',
        title: 'B♭ / C — Phrygian color',
        start: 18,
        end: 24,
        focus: 'B♭ major over C major',
        learn: [
          'The combination evokes Spanish or Middle-Eastern flavor',
          'Used in film scores for desert / exotic landscapes',
        ],
      },
      {
        id: 'resolve',
        title: 'Resolve to plain C',
        start: 24,
        end: 30,
        focus: 'Big bright C major across the keyboard',
        learn: ['After polychord ambiguity, a clean triad feels enormous'],
        reinforce: [
          'Try left-hand C major while right hand plays any other triad',
          "Find one that sounds 'soundtrack' to your ear and remember it",
        ],
      },
    ],
  },
}
