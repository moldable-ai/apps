import type { RawTutorial } from '../../tutorial-builder'

export const octavesAndNamesTutorial: RawTutorial = {
  id: 'tutorial-octaves-and-names',
  title: 'Octaves & Note Names',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: A–B–C–D–E–F–G repeating up in C4..B4
    ['A3', 0.0, 0.45],
    ['B3', 0.5, 0.45],
    ['C4', 1.0, 0.45],
    ['D4', 1.5, 0.45],
    ['E4', 2.0, 0.45],
    ['F4', 2.5, 0.45],
    ['G4', 3.0, 0.45],
    ['A4', 3.5, 0.45],
    ['B4', 4.0, 0.45],
    ['C5', 4.5, 0.9],
    // 6–10s: Same letters again in next octave — same names!
    ['C5', 6.0, 0.45],
    ['D5', 6.5, 0.45],
    ['E5', 7.0, 0.45],
    ['F5', 7.5, 0.45],
    ['G5', 8.0, 0.45],
    ['A5', 8.5, 0.45],
    ['B5', 9.0, 0.45],
    ['C6', 9.5, 1.0],
    // 11–14s: Two C's together — same note, different heights (octaves)
    ['C4', 11.0, 0.6],
    ['C5', 11.7, 0.6],
    ['C4', 12.4, 0.4],
    ['C5', 12.8, 0.4],
    ['C4', 13.2, 0.4],
    ['C6', 13.6, 1.2],
    // 15–19s: Same melody, two octaves apart
    ['C4', 15.0, 0.4],
    ['E4', 15.4, 0.4],
    ['G4', 15.8, 0.6],
    ['C5', 16.5, 0.4],
    ['E5', 16.9, 0.4],
    ['G5', 17.3, 0.6],
    ['C5', 18.0, 0.4],
    ['G5', 18.4, 1.2],
  ],
  tutorial: {
    title: 'Octaves & Note Names',
    summary:
      'Music uses only seven letter names: A B C D E F G. Once you reach G, the pattern starts over. The "same note in a different octave" is the same letter, played higher or lower — they sound like the same note, just brighter or warmer.',
    level: 'Beginner',
    objectives: [
      'Memorize the seven letter names',
      'Understand what an "octave" is (the distance between same-name notes)',
      'Read note names like "C4" or "G5"',
    ],
    sections: [
      {
        id: 'the-seven',
        title: 'Only seven names',
        start: 0,
        end: 6,
        focus: 'A B C D E F G — then it loops back to A',
        learn: [
          "There are no other letters — that's it",
          'After G comes A again, one octave higher',
        ],
        tryThis: [
          'Say the names out loud as you play each white key',
          'When you get to A, start over: A B C D E F G',
        ],
      },
      {
        id: 'octave',
        title: "What's an octave?",
        start: 6,
        end: 11,
        focus: 'Same melody, one octave higher',
        learn: [
          'An octave = the distance from one note to the next note with the same letter name',
          "It's 12 piano keys total (white + black)",
          'Octaves sound like "the same note" because they share half their frequency',
        ],
      },
      {
        id: 'same-note',
        title: 'Same note, different octave',
        start: 11,
        end: 15,
        focus: 'C4 and C5 — both C, just different heights',
        learn: [
          'C4 is "middle C" — the C closest to the middle of the keyboard',
          'C5 is one octave higher, C3 is one octave lower',
          'When we write "C4", the number tells you which octave',
        ],
      },
      {
        id: 'transpose',
        title: 'Play it higher or lower',
        start: 15,
        end: 19,
        focus: 'C–E–G arpeggio, twice — once in octave 4, once in octave 5',
        learn: [
          'The shape sounds the same — only the height changes',
          'This is the principle behind playing melodies anywhere on the keyboard',
        ],
        reinforce: [
          'Try playing the same little three-note pattern in three different octaves',
          'They\'re recognizably "the same idea" because the intervals stay constant',
        ],
      },
    ],
  },
}
