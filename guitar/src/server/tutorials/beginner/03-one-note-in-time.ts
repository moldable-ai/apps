import type { RawTutorial } from '../../tutorial-builder'

export const oneNoteInTimeTutorial: RawTutorial = {
  id: 'tutorial-one-note-in-time',
  title: 'One Note, In Time',
  beatsPerBar: 4,
  phrase: [
    // Whole notes (4 beats each)
    ['A2', 0.0, 4.0],
    ['A2', 4.0, 4.0],
    // Half notes (2 beats each)
    ['A2', 8.0, 2.0],
    ['A2', 10.0, 2.0],
    ['A2', 12.0, 2.0],
    ['A2', 14.0, 2.0],
    // Quarter notes (1 beat each)
    ['A2', 16.0, 1.0],
    ['A2', 17.0, 1.0],
    ['A2', 18.0, 1.0],
    ['A2', 19.0, 1.0],
    ['A2', 20.0, 1.0],
    ['A2', 21.0, 1.0],
    ['A2', 22.0, 1.0],
    ['A2', 23.0, 1.0],
  ],
  tutorial: {
    title: 'One Note, In Time',
    summary:
      'Rhythm is just as important as pitch, so we slow everything down to a single note: the open A string. First you hold whole notes that ring for four full beats, then half notes that last two beats, then quarter notes that tick by one beat at a time. Same pitch throughout — the only thing changing is how long the note lasts. Count steadily and let your ear feel each duration.',
    level: 'Beginner',
    objectives: [
      'Feel the difference between whole, half, and quarter notes',
      'Keep a steady count of 1-2-3-4 in each bar',
      'Hold each note for its full value before plucking again',
    ],
    sections: [
      {
        id: 'whole-notes',
        title: 'Whole notes (4 beats)',
        start: 0,
        end: 8,
        focus: 'one long ring per bar',
        learn: [
          'A whole note lasts a full bar — all four beats.',
          'Pluck once, then count 1-2-3-4 while it rings.',
        ],
        tryThis: ['Tap your foot on every beat while the note sustains.'],
      },
      {
        id: 'half-notes',
        title: 'Half notes (2 beats)',
        start: 8,
        end: 16,
        focus: 'two notes per bar',
        learn: [
          'A half note lasts two beats — two of them fill a bar.',
          'Pluck on beats 1 and 3.',
        ],
      },
      {
        id: 'quarter-notes',
        title: 'Quarter notes (1 beat)',
        start: 16,
        end: 24,
        focus: 'one note on every beat',
        learn: [
          'A quarter note lasts one beat — four of them fill a bar.',
          'This is the steady pulse you will count for most songs.',
        ],
        reinforce: [
          'Keep the gaps even; the metronome in your head should not rush.',
        ],
      },
    ],
  },
}
