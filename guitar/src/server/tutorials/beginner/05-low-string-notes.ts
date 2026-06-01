import type { RawTutorial } from '../../tutorial-builder'

export const lowStringNotesTutorial: RawTutorial = {
  id: 'tutorial-low-string-notes',
  title: 'Notes on the Low Strings',
  beatsPerBar: 4,
  phrase: [
    // E string: E F G (open, 1st fret, 3rd fret)
    ['E2', 0.0, 1.0],
    ['F2', 1.0, 1.0],
    ['G2', 2.0, 1.0],
    ['E2', 3.0, 1.0],
    // A string: A B C (open, 2nd fret, 3rd fret)
    ['A2', 4.0, 1.0],
    ['B2', 5.0, 1.0],
    ['C3', 6.0, 1.0],
    ['A2', 7.0, 1.0],
    // D string: D E (open, 2nd fret)
    ['D3', 8.0, 1.0],
    ['E3', 9.0, 1.0],
    ['D3', 10.0, 1.0],
    ['E3', 11.0, 1.0],
    // little recap walk up E-A-D area
    ['G2', 12.0, 1.0],
    ['A2', 13.0, 1.0],
    ['B2', 14.0, 1.0],
    ['C3', 15.0, 1.0],
    ['D3', 16.0, 2.0],
  ],
  tutorial: {
    title: 'Notes on the Low Strings',
    summary:
      'Now we put names to the notes in first position on the three lowest strings. On the E string: E (open), F (1st fret), G (3rd fret). On the A string: A (open), B (2nd fret), C (3rd fret). On the D string: D (open) and E (2nd fret). These are all natural notes — no sharps — and they are the building blocks of countless riffs and bass lines. Say each note name as you play it.',
    level: 'Beginner',
    objectives: [
      'Name the natural notes on the E, A, and D strings in first position',
      'Connect open-string and fretted notes by name',
      'Play a smooth walk across three strings',
    ],
    sections: [
      {
        id: 'e-and-a-strings',
        title: 'The E & A strings',
        start: 0,
        end: 8,
        focus: 'naming notes on the two thickest strings',
        learn: [
          'E string: E (open), F (fret 1), G (fret 3).',
          'A string: A (open), B (fret 2), C (fret 3).',
          'These are all natural notes — no sharps or flats here.',
        ],
        tryThis: ['Name each note aloud as it sounds.'],
      },
      {
        id: 'onto-the-d-string',
        title: 'Onto the D string',
        start: 8,
        end: 18,
        focus: 'adding the D string and joining it all together',
        learn: [
          'D string: D (open), E (fret 2).',
          'The closing walk G-A-B-C-D links all three strings into one line.',
        ],
        reinforce: [
          'Aim for an even tone whether the note is open or fretted.',
        ],
      },
    ],
  },
}
