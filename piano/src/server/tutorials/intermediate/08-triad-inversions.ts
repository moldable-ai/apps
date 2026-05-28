import type { RawTutorial } from '../../tutorial-builder'

export const triadInversionsTutorial: RawTutorial = {
  id: 'tutorial-triad-inversions',
  title: 'Triad Inversions',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: Root position — C E G
    ['C4', 0.0, 1.8, 0.9],
    ['E4', 0.0, 1.8, 0.9],
    ['G4', 0.0, 1.8, 0.9],
    ['C4', 2.2, 0.4],
    ['E4', 2.6, 0.4],
    ['G4', 3.0, 0.8],
    // 5–9s: First inversion — E G C
    ['E4', 5.0, 1.8, 0.9],
    ['G4', 5.0, 1.8, 0.9],
    ['C5', 5.0, 1.8, 0.9],
    ['E4', 7.2, 0.4],
    ['G4', 7.6, 0.4],
    ['C5', 8.0, 0.8],
    // 10–14s: Second inversion — G C E
    ['G4', 10.0, 1.8, 0.9],
    ['C5', 10.0, 1.8, 0.9],
    ['E5', 10.0, 1.8, 0.9],
    ['G4', 12.2, 0.4],
    ['C5', 12.6, 0.4],
    ['E5', 13.0, 0.8],
    // 15–22s: Walking the inversions up — smooth voice leading
    ['C4', 15.0, 1.4, 0.9],
    ['E4', 15.0, 1.4, 0.9],
    ['G4', 15.0, 1.4, 0.9],
    ['E4', 16.6, 1.4, 0.9],
    ['G4', 16.6, 1.4, 0.9],
    ['C5', 16.6, 1.4, 0.9],
    ['G4', 18.2, 1.4, 0.9],
    ['C5', 18.2, 1.4, 0.9],
    ['E5', 18.2, 1.4, 0.9],
    ['C5', 19.8, 1.6, 0.95],
    ['E5', 19.8, 1.6, 0.95],
    ['G5', 19.8, 1.6, 0.95],
  ],
  tutorial: {
    title: 'Triad Inversions',
    summary:
      'A triad has three notes. You can play them in three different orders by moving the bottom note up an octave. Same chord — same name — but a different "voicing." Inversions let you connect chords smoothly without big jumps.',
    level: 'Intermediate',
    objectives: [
      'Recognize root position vs 1st vs 2nd inversion',
      'Play C major in all three positions',
      'Use inversions to walk up the keyboard smoothly',
    ],
    sections: [
      {
        id: 'root',
        title: 'Root position — C E G',
        start: 0,
        end: 5,
        focus: 'Root note (C) is on the bottom',
        learn: [
          'The "root" is the chord\'s name note',
          'Root position is the most stable — feels grounded',
        ],
      },
      {
        id: 'first',
        title: 'First inversion — E G C',
        start: 5,
        end: 10,
        focus: 'Move the C up an octave; E is now on the bottom',
        learn: [
          'Same three pitches (C, E, G) — just C is on top now',
          'It still sounds like a C major chord, but more "active"',
        ],
      },
      {
        id: 'second',
        title: 'Second inversion — G C E',
        start: 10,
        end: 15,
        focus: 'Move E up too; G is on the bottom',
        learn: [
          'Same chord, third voicing',
          'Has a slightly suspended, transitional feel',
        ],
      },
      {
        id: 'walking',
        title: 'Walking up with inversions',
        start: 15,
        end: 22,
        focus: 'Root → 1st → 2nd → next octave root',
        learn: [
          'By using inversions you can keep the top note moving smoothly',
          'Top voices stay close — that\'s "voice leading" (more in lesson 10)',
        ],
        reinforce: [
          'Try the same idea on F major: F-A-C → A-C-F → C-F-A → F-A-C',
          "It's the trick behind almost every arpeggio in classical and jazz",
        ],
      },
    ],
  },
}
