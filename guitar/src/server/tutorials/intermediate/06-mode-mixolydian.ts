import type { RawTutorial } from '../../tutorial-builder'

export const mixolydianTutorial: RawTutorial = {
  id: 'tutorial-mode-mixolydian',
  title: 'Modes II — Mixolydian',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // G Mixolydian: G A B C D E F G (flat-7 = F natural)
    ['G2', 0.0, 0.5],
    ['A2', 0.5, 0.5],
    ['B2', 1.0, 0.5],
    ['C3', 1.5, 0.5],
    ['D3', 2.0, 0.5],
    ['E3', 2.5, 0.5],
    ['F3', 3.0, 0.5],
    ['G3', 3.5, 1.0],
    ['G3', 5.0, 0.5],
    ['F3', 5.5, 0.5],
    ['E3', 6.0, 0.5],
    ['D3', 6.5, 0.5],
    ['C3', 7.0, 0.5],
    ['B2', 7.5, 0.5],
    ['A2', 8.0, 0.5],
    ['G2', 8.5, 1.5],
    // G major: G A B C D E F# G
    ['G2', 11.0, 0.5],
    ['A2', 11.5, 0.5],
    ['B2', 12.0, 0.5],
    ['C3', 12.5, 0.5],
    ['D3', 13.0, 0.5],
    ['E3', 13.5, 0.5],
    ['F#3', 14.0, 0.5],
    ['G3', 14.5, 1.5],
    // The signature flat-7 vs major-7
    ['G3', 17.0, 0.75],
    ['F3', 17.75, 0.75],
    ['G3', 18.5, 0.75],
    ['F#3', 19.25, 1.25],
  ],
  tutorial: {
    title: 'Modes II — Mixolydian',
    summary:
      'Mixolydian is the rock and blues major: it sounds bright like a major scale but drops the 7th. G Mixolydian is G A B C D E F G, where the natural F (a flat-7) gives it that dominant, bluesy swagger heard in countless rock riffs. Compare it with G major, whose 7th is F#. The flat-7 is the whole story.',
    level: 'Intermediate',
    objectives: [
      'Play the G Mixolydian mode up and down',
      'Identify the flat-7 (F natural) as the signature note',
      'Play G major for contrast',
      'Hear the 7th switch between F and F#',
    ],
    sections: [
      {
        id: 'mixolydian',
        title: 'G Mixolydian',
        start: 0,
        end: 11,
        focus: 'Major sound with a flat-7',
        learn: [
          'G Mixolydian is G A B C D E F G: major except for F natural.',
          'The flat-7 gives the dominant, bluesy rock flavor.',
        ],
        tryThis: ['Resolve riffs from F up to G to feel the pull.'],
      },
      {
        id: 'g-major',
        title: 'G Major',
        start: 11,
        end: 17,
        focus: 'Raising the 7th back to F#',
        learn: [
          'G major has F# as its leading tone, the natural major 7th.',
          'That F# pulls strongly home and sounds more resolved.',
        ],
        breakIt: ['Use F# in a rock riff and it loses its grit.'],
      },
      {
        id: 'the-seventh',
        title: 'The Seventh Decides',
        start: 17,
        end: 20.5,
        focus: 'F vs F# over G',
        learn: [
          'Alternating F and F# over G is the Mixolydian-vs-major test.',
          'A single semitone on the 7th flips the mode.',
        ],
        reinforce: ['Mixolydian = major with a flat-7.'],
      },
    ],
  },
}
