import type { RawTutorial } from '../../tutorial-builder'

const fret = (stringIndex: number, fret: number) => ({ stringIndex, fret })

export const upTheNeckTutorial: RawTutorial = {
  id: 'tutorial-up-the-neck',
  title: 'Moving Up the Neck',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // E major higher register: E3 F#3 G#3 A3 B3 C#4 D#4 E4
    ['E3', 0.0, 0.5, undefined, fret(1, 7)],
    ['F#3', 0.5, 0.5, undefined, fret(1, 9)],
    ['G#3', 1.0, 0.5, undefined, fret(2, 6)],
    ['A3', 1.5, 0.5, undefined, fret(2, 7)],
    ['B3', 2.0, 0.5, undefined, fret(2, 9)],
    ['C#4', 2.5, 0.5, undefined, fret(3, 6)],
    ['D#4', 3.0, 0.5, undefined, fret(3, 8)],
    ['E4', 3.5, 1.0, undefined, fret(3, 9)],
    ['E4', 5.0, 0.5, undefined, fret(3, 9)],
    ['D#4', 5.5, 0.5, undefined, fret(3, 8)],
    ['C#4', 6.0, 0.5, undefined, fret(3, 6)],
    ['B3', 6.5, 0.5, undefined, fret(2, 9)],
    ['A3', 7.0, 0.5, undefined, fret(2, 7)],
    ['G#3', 7.5, 0.5, undefined, fret(2, 6)],
    ['F#3', 8.0, 0.5, undefined, fret(1, 9)],
    ['E3', 8.5, 1.5, undefined, fret(1, 7)],
    // Run using the upper shape
    ['E3', 10.0, 0.5, undefined, fret(1, 7)],
    ['G#3', 10.5, 0.5, undefined, fret(2, 6)],
    ['B3', 11.0, 0.5, undefined, fret(2, 9)],
    ['E4', 11.5, 0.5, undefined, fret(3, 9)],
    ['D#4', 12.0, 0.5, undefined, fret(3, 8)],
    ['B3', 12.5, 0.5, undefined, fret(2, 9)],
    ['C#4', 13.0, 0.5, undefined, fret(3, 6)],
    ['E4', 13.5, 1.5, undefined, fret(3, 9)],
  ],
  tutorial: {
    title: 'Moving Up the Neck',
    summary:
      'The same major scale logic works higher on the neck. Here E major lives around the 6th through 9th frets, using four sharps: F#, G#, C#, and D#. Because every note is fretted, you can hear and see how a closed position keeps the scale compact while the brighter register changes the color.',
    level: 'Intermediate',
    objectives: [
      'Play the E major scale in a higher register',
      'Read and play four sharps cleanly',
      'Play a closed scale position up the neck with confidence',
      'Use the upper octave for a brighter melodic run',
    ],
    sections: [
      {
        id: 'e-major-up',
        title: 'E Major Up High',
        start: 0,
        end: 10,
        focus: 'Four sharps in a higher position',
        learn: [
          'E major is E F# G# A B C# D# E; four notes are sharp.',
          'No open strings here: every note sits between the 6th and 9th frets.',
        ],
        tryThis: ['Play slowly and check each sharp lands in tune.'],
      },
      {
        id: 'upper-run',
        title: 'Run in the Upper Octave',
        start: 10,
        end: 15,
        focus: 'Skipping through the high shape',
        learn: [
          'The brighter register gives skips and leaps more sparkle.',
          'Move the same interval pattern to a new starting note to reach another major key.',
        ],
        reinforce: [
          'Closed positions make it easier to move scale patterns across the fretboard.',
        ],
      },
    ],
  },
}
