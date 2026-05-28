import type { RawTutorial } from '../../tutorial-builder'

export const circleOfFifthsTutorial: RawTutorial = {
  id: 'tutorial-circle-of-fifths',
  title: 'The Circle of Fifths',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: C major chord
    ['C4', 0.0, 1.6, 0.9],
    ['E4', 0.0, 1.6, 0.9],
    ['G4', 0.0, 1.6, 0.9],
    ['C5', 1.8, 1.6, 0.9],
    ['E5', 1.8, 1.6, 0.9],
    ['G5', 1.8, 1.6, 0.9],
    // 6–11s: G major (one sharp)
    ['G3', 6.0, 1.6, 0.9],
    ['B3', 6.0, 1.6, 0.9],
    ['D4', 6.0, 1.6, 0.9],
    ['G4', 7.8, 1.6, 0.9],
    ['B4', 7.8, 1.6, 0.9],
    ['D5', 7.8, 1.6, 0.9],
    // 12–17s: D major (two sharps)
    ['D4', 12.0, 1.6, 0.9],
    ['F#4', 12.0, 1.6, 0.9],
    ['A4', 12.0, 1.6, 0.9],
    ['D5', 13.8, 1.6, 0.9],
    ['F#5', 13.8, 1.6, 0.9],
    ['A5', 13.8, 1.6, 0.9],
    // 18–23s: A major (three sharps)
    ['A3', 18.0, 1.6, 0.9],
    ['C#4', 18.0, 1.6, 0.9],
    ['E4', 18.0, 1.6, 0.9],
    ['A4', 19.8, 1.6, 0.9],
    ['C#5', 19.8, 1.6, 0.9],
    ['E5', 19.8, 1.6, 0.9],
    // 24–29s: E major (four sharps)
    ['E4', 24.0, 1.6, 0.9],
    ['G#4', 24.0, 1.6, 0.9],
    ['B4', 24.0, 1.6, 0.9],
    ['E5', 25.8, 1.6, 0.9],
    ['G#5', 25.8, 1.6, 0.9],
    // 30–35s: Walk back C → F (flat side)
    ['C4', 30.0, 1.6, 0.9],
    ['E4', 30.0, 1.6, 0.9],
    ['G4', 30.0, 1.6, 0.9],
    ['F4', 31.8, 1.6, 0.9],
    ['A4', 31.8, 1.6, 0.9],
    ['C5', 31.8, 1.6, 0.9],
  ],
  tutorial: {
    title: 'The Circle of Fifths',
    summary:
      'Move up by a fifth from any key and you add exactly one sharp. C → G → D → A → E → B → F♯ → C♯, each step a 5th higher and one more sharp. The "circle of fifths" is the map of how all keys relate.',
    level: 'Intermediate',
    objectives: [
      'Understand that moving up a 5th adds one sharp',
      'Recognize the sharp side (C→G→D→A→E) vs the flat side (C→F→B♭→E♭)',
      "Use the circle to predict any key's sharps and flats",
    ],
    sections: [
      {
        id: 'c-zero',
        title: 'C major — zero sharps',
        start: 0,
        end: 6,
        focus: 'Pure white keys, the starting point',
        learn: [
          'C major is the "zero point" of the circle',
          'From here we move clockwise (sharps) or counter-clockwise (flats)',
        ],
      },
      {
        id: 'g-one',
        title: 'G major — one sharp (F♯)',
        start: 6,
        end: 12,
        focus: 'Up a 5th from C',
        learn: [
          'Each 5th up adds the next sharp in the order: F♯, C♯, G♯, D♯, A♯, E♯',
        ],
      },
      {
        id: 'd-two',
        title: 'D major — two sharps (F♯, C♯)',
        start: 12,
        end: 18,
        focus: 'Up a 5th from G',
        learn: [
          'The new sharp each time is the leading tone of the new key',
          "D major's new sharp (C♯) is the 7th note of D major",
        ],
      },
      {
        id: 'a-three',
        title: 'A major — three sharps',
        start: 18,
        end: 24,
        focus: 'F♯, C♯, G♯',
        learn: ['Three sharps total. The newest is G♯'],
      },
      {
        id: 'e-four',
        title: 'E major — four sharps',
        start: 24,
        end: 30,
        focus: 'F♯, C♯, G♯, D♯',
        learn: [
          'Same key you met in "When Black Keys Take Over"',
          'The pattern is consistent — each fifth adds the next sharp',
        ],
      },
      {
        id: 'flat-side',
        title: 'The flat side: down a 5th',
        start: 30,
        end: 35,
        focus: 'C → F: down a fifth (or up a 4th) adds one flat',
        learn: [
          'F major has one flat: B♭',
          'Going further: B♭ major has 2 flats, E♭ major has 3, and so on',
        ],
        reinforce: [
          'Memorize the order of sharps: F C G D A E B (or "Father Charles Goes Down And Ends Battle")',
          'The order of flats is the reverse: B E A D G C F',
        ],
      },
    ],
  },
}
