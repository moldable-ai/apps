import type { RawTutorial } from '../../tutorial-builder'

export const majorVsMinorTutorial: RawTutorial = {
  id: 'tutorial-major-vs-minor',
  title: 'Major vs Minor',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // A major: A2 B2 C#3 D3 E3 F#3 G#3 A3
    ['A2', 0.0, 0.5],
    ['B2', 0.5, 0.5],
    ['C#3', 1.0, 0.5],
    ['D3', 1.5, 0.5],
    ['E3', 2.0, 0.5],
    ['F#3', 2.5, 0.5],
    ['G#3', 3.0, 0.5],
    ['A3', 3.5, 1.5],
    // A natural minor: A2 B2 C3 D3 E3 F3 G3 A3
    ['A2', 6.0, 0.5],
    ['B2', 6.5, 0.5],
    ['C3', 7.0, 0.5],
    ['D3', 7.5, 0.5],
    ['E3', 8.0, 0.5],
    ['F3', 8.5, 0.5],
    ['G3', 9.0, 0.5],
    ['A3', 9.5, 1.5],
    // The one-note flip: third only
    ['A2', 12.0, 1.0],
    ['C#3', 12.0, 1.0],
    ['A2', 14.0, 1.0],
    ['C3', 14.0, 1.0],
    ['A2', 16.0, 1.5],
    ['C#3', 16.0, 1.5],
  ],
  tutorial: {
    title: 'Major vs Minor',
    summary:
      'Major sounds bright, minor sounds dark, and the single note that flips the mood is the 3rd. Play A major (with C#) then A natural minor (with C natural). Minor also lowers the 6th and 7th, but the 3rd is the emotional switch. The last section isolates A with C# against A with C so you hear the flip directly.',
    level: 'Intermediate',
    objectives: [
      'Play the A major scale',
      'Play the A natural minor scale',
      'Identify the lowered 3rd, 6th, and 7th of minor',
      'Hear the major-to-minor flip on a single note',
    ],
    sections: [
      {
        id: 'a-major',
        title: 'A Major',
        start: 0,
        end: 6,
        focus: 'The bright sound with C#, F#, G#',
        learn: [
          'A major is A B C# D E F# G# A with three sharps.',
          'The C# (the 3rd) is what makes it sound happy.',
        ],
        tryThis: ['Hold the final A and hum the major mood.'],
      },
      {
        id: 'a-minor',
        title: 'A Minor',
        start: 6,
        end: 12,
        focus: 'Lowering 3rd, 6th, and 7th',
        learn: [
          'A natural minor is A B C D E F G A, all naturals.',
          'C, F, and G replace C#, F#, G# to darken the scale.',
        ],
        breakIt: ['Raise the C back to C# and the sadness vanishes.'],
      },
      {
        id: 'the-flip',
        title: 'The One-Note Flip',
        start: 12,
        end: 17.5,
        focus: 'The 3rd alone decides major or minor',
        learn: [
          'A with C# is major; A with C natural is minor.',
          'Notes sharing a start ring together as a tiny chord.',
        ],
        reinforce: ['Move just the 3rd to switch the whole mood.'],
      },
    ],
  },
}
