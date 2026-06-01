import type { RawTutorial } from '../../tutorial-builder'

export const dorianTutorial: RawTutorial = {
  id: 'tutorial-mode-dorian',
  title: 'Modes I — Dorian',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // D Dorian: D E F G A B C D (raised 6th = B natural)
    ['D3', 0.0, 0.5],
    ['E3', 0.5, 0.5],
    ['F3', 1.0, 0.5],
    ['G3', 1.5, 0.5],
    ['A3', 2.0, 0.5],
    ['B3', 2.5, 0.5],
    ['C4', 3.0, 0.5],
    ['D4', 3.5, 1.0],
    ['D4', 5.0, 0.5],
    ['C4', 5.5, 0.5],
    ['B3', 6.0, 0.5],
    ['A3', 6.5, 0.5],
    ['G3', 7.0, 0.5],
    ['F3', 7.5, 0.5],
    ['E3', 8.0, 0.5],
    ['D3', 8.5, 1.5],
    // D natural minor: D E F G A Bb C D — b6 = Bb, played as A# (sharps-only engine)
    ['D3', 11.0, 0.5],
    ['E3', 11.5, 0.5],
    ['F3', 12.0, 0.5],
    ['G3', 12.5, 0.5],
    ['A3', 13.0, 0.5],
    ['A#3', 13.5, 0.5],
    ['C4', 14.0, 0.5],
    ['D4', 14.5, 1.5],
    // The defining note side by side
    ['A3', 17.0, 0.75],
    ['B3', 17.75, 0.75],
    ['A3', 18.5, 0.75],
    ['A#3', 19.25, 1.25],
  ],
  tutorial: {
    title: 'Modes I — Dorian',
    summary:
      'Dorian is a minor mode with one bright surprise: a raised 6th. D Dorian runs D E F G A B C D, and that natural B is what gives it a hopeful, jazzy lift over a plain minor. Compare it with D natural minor, whose 6th is lowered to Bb. The whole flavor of Dorian lives in that one raised note.',
    level: 'Intermediate',
    objectives: [
      'Play the D Dorian mode up and down',
      'Identify the raised 6th (B natural) as Dorian color',
      'Play D natural minor for contrast',
      'Hear the 6th switch between B and Bb',
    ],
    sections: [
      {
        id: 'dorian',
        title: 'D Dorian',
        start: 0,
        end: 11,
        focus: 'Minor with a raised 6th',
        learn: [
          'D Dorian is D E F G A B C D, like D minor but with B natural.',
          'The raised 6th gives a smooth, hopeful minor color.',
        ],
        tryThis: ['Linger on the B; it is the signature note.'],
      },
      {
        id: 'natural-minor',
        title: 'D Natural Minor',
        start: 11,
        end: 17,
        focus: 'The lowered 6th, Bb',
        learn: [
          'D natural minor lowers the 6th to Bb, a flat-6 (the same fret shown here as A#).',
          'This darker 6th is the everyday minor sound.',
        ],
        breakIt: ['Swap Bb for B and you have slipped into Dorian.'],
      },
      {
        id: 'the-sixth',
        title: 'The Sixth Decides',
        start: 17,
        end: 20.5,
        focus: 'B vs Bb over the same root',
        learn: [
          'Alternating B and Bb over D is the Dorian-vs-minor test.',
          'One semitone on the 6th changes the entire mode.',
        ],
        reinforce: ['Dorian = minor with a major 6th.'],
      },
    ],
  },
}
