import type { RawTutorial } from '../../tutorial-builder'

export const sixStringsTutorial: RawTutorial = {
  id: 'tutorial-six-strings',
  title: 'The Six Strings',
  beatsPerBar: 4,
  phrase: [
    // Low to high: E A D G B E
    ['E2', 0.0, 1.0],
    ['A2', 1.0, 1.0],
    ['D3', 2.0, 1.0],
    ['G3', 3.0, 1.0],
    ['B3', 4.0, 1.0],
    ['E4', 5.0, 1.0],
    // High to low: E B G D A E
    ['E4', 7.0, 1.0],
    ['B3', 8.0, 1.0],
    ['G3', 9.0, 1.0],
    ['D3', 10.0, 1.0],
    ['A2', 11.0, 1.0],
    ['E2', 12.0, 2.0],
  ],
  tutorial: {
    title: 'The Six Strings',
    summary:
      'Meet your guitar one string at a time. Played from the thickest, lowest string to the thinnest, highest string, the six open strings spell out the famous name EADGBE. Let every string ring fully before plucking the next so your ear learns each pitch. Then we climb back down, high to low, to seal the order in. No fretting hand needed yet — just pluck the open strings and listen.',
    level: 'Beginner',
    objectives: [
      'Name the six open strings in order: E A D G B E',
      'Hear how pitch rises from the thick low string to the thin high string',
      'Let each open string ring cleanly without muting it',
    ],
    sections: [
      {
        id: 'low-to-high',
        title: 'Low to High',
        start: 0,
        end: 7,
        focus: 'climbing from the thickest string to the thinnest',
        learn: [
          'The six strings, low to high, are E A D G B E.',
          'The lowest (thickest) string is E2; the highest (thinnest) is E4.',
          'A common memory phrase: "Eddie Ate Dynamite, Good Bye Eddie".',
        ],
        tryThis: ['Say each string name aloud as you pluck it.'],
      },
      {
        id: 'high-to-low',
        title: 'High to Low',
        start: 7,
        end: 14,
        focus: 'reversing the order back down the neck',
        learn: [
          'Going high to low reverses the order: E B G D A E.',
          'The two outer strings are both E — one high, one low, two octaves apart.',
        ],
        reinforce: [
          'Loop both directions until the names come without thinking.',
        ],
      },
    ],
  },
}
