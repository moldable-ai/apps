import type { RawTutorial } from '../../tutorial-builder'

export const octavesOnTheNeckTutorial: RawTutorial = {
  id: 'tutorial-octaves-on-the-neck',
  title: 'Octaves on the Neck',
  beatsPerBar: 4,
  phrase: [
    // E octaves: E2 -> E3 -> E4
    ['E2', 0.0, 1.0],
    ['E3', 1.0, 1.0],
    ['E4', 2.0, 1.0],
    ['E3', 3.0, 1.0],
    ['E2', 4.0, 2.0],
    // A octaves: A2 -> A3
    ['A2', 6.0, 1.0],
    ['A3', 7.0, 1.0],
    ['A2', 8.0, 1.0],
    ['A3', 9.0, 2.0],
    // D octaves: D3 -> D4
    ['D3', 11.0, 1.0],
    ['D4', 12.0, 1.0],
    ['D3', 13.0, 1.0],
    ['D4', 14.0, 2.0],
    // Pair them as octave jumps to seal the shape
    ['E2', 16.0, 1.0],
    ['E3', 17.0, 1.0],
    ['A2', 18.0, 1.0],
    ['A3', 19.0, 1.0],
    ['D3', 20.0, 1.0],
    ['D4', 21.0, 2.0],
  ],
  tutorial: {
    title: 'Octaves on the Neck',
    summary:
      'An octave is the distance between a note and the next note of the same name — like E up to the next E. They sound so similar that we give them the same letter. Here you play octave pairs on the low strings: E2 to E3 to E4, then A2 to A3, then D3 to D4. Notice how the higher note feels like a bright echo of the lower one. Same name, same color, just higher. Spotting octaves helps you find any note all over the neck.',
    level: 'Beginner',
    objectives: [
      'Understand what an octave is',
      'Hear that octave notes share the same name',
      'Play octave pairs on the E, A, and D strings',
    ],
    sections: [
      {
        id: 'climbing-octaves',
        title: 'Climbing octaves',
        start: 0,
        end: 16,
        focus: 'same-name notes stacked higher',
        learn: [
          'An octave spans 12 semitones — the note repeats with the same name.',
          'E2, E3, and E4 are all "E", just in different octaves.',
          'The higher octave sounds like a bright copy of the lower one.',
        ],
        tryThis: [
          'Sing the low note, then the octave — your voice may jump easily.',
        ],
      },
      {
        id: 'octave-jumps',
        title: 'Octave jumps',
        start: 16,
        end: 23,
        focus: 'leaping straight from low to high',
        learn: [
          'Jumping a full octave is a big, satisfying leap.',
          'Recognizing octaves lets you find the same note elsewhere on the neck.',
        ],
        reinforce: ['Match the volume of both notes in each octave pair.'],
      },
    ],
  },
}
