import type { RawTutorial } from '../../tutorial-builder'

export const blueNotesTutorial: RawTutorial = {
  id: 'tutorial-blue-notes',
  title: 'Blue Notes',
  bpm: 80,
  beatsPerBar: 4,
  phrase: [
    // Section 1: E minor pentatonic ascending (E G A B D)
    ['E3', 0.0, 0.45],
    ['G3', 0.5, 0.45],
    ['A3', 1.0, 0.45],
    ['B3', 1.5, 0.45],
    ['D4', 2.0, 0.45],
    ['E4', 2.5, 0.45],
    ['D4', 3.0, 0.45],
    ['B3', 3.5, 0.45],
    ['A3', 4.0, 0.45],
    ['G3', 4.5, 0.45],
    ['E3', 5.0, 0.9],
    // Section 2: insert the blue note Bb / b5 (played as A#) on the way up
    ['E3', 6.5, 0.4],
    ['G3', 6.9, 0.4],
    ['A3', 7.3, 0.3],
    ['A#3', 7.6, 0.3],
    ['B3', 7.9, 0.5],
    ['D4', 8.4, 0.4],
    ['A#3', 8.8, 0.3],
    ['A3', 9.1, 0.4],
    ['G3', 9.5, 0.5],
    ['E3', 10.0, 1.0],
    // Section 3: a lick passing through Bb (b5, played A#) that resolves to E
    ['B3', 12.0, 0.3],
    ['D4', 12.3, 0.3],
    ['E4', 12.6, 0.4],
    ['D4', 13.0, 0.25],
    ['A#3', 13.25, 0.35],
    ['B3', 13.6, 0.25],
    ['A3', 13.85, 0.35],
    ['A#3', 14.2, 0.3],
    ['A3', 14.5, 0.3],
    ['G3', 14.8, 0.4],
    ['E3', 15.2, 1.4],
  ],
  tutorial: {
    title: 'Blue Notes',
    summary:
      'E minor pentatonic (E G A B D) is the bedrock of blues and rock lead guitar. Add one extra tone — the Bb (the flat-5, or "blue note," shown here as A#) — and the box lights up with smoky tension. The blue note is never a destination; it is a passing color that leans toward B or back toward A. Here you bend through it and resolve home to E.',
    level: 'Advanced',
    objectives: [
      'Map the E minor pentatonic box on the fretboard',
      'Hear how Bb (the b5) adds bluesy grit',
      'Pass through the blue note instead of landing on it',
      'Resolve a lick cleanly back to the root E',
    ],
    sections: [
      {
        id: 'pentatonic',
        title: 'The pentatonic box',
        start: 0,
        end: 6.5,
        focus: 'E G A B D — five notes, no wrong answers',
        learn: [
          'These five tones sit under one finger box at the 12th fret on guitar',
          'Notice there is no semitone clash yet — it sounds clean and open',
        ],
      },
      {
        id: 'add-blue',
        title: 'Adding the blue note',
        start: 6.5,
        end: 12.0,
        focus: 'Bb (the b5) wedged between A and B',
        learn: [
          'The Bb is a chromatic passing tone between A and B',
          'On guitar this is often a quick bend or slide, never a held note',
        ],
        tryThis: [
          'Play A → Bb → B as a fast three-note slur',
          'Slow to 0.5x and hear how Bb leans rather than settles',
        ],
      },
      {
        id: 'resolve',
        title: 'The bluesy lick',
        start: 12.0,
        end: 16.6,
        focus: 'Pass through A# and resolve home to E',
        learn: [
          'The lick brushes Bb twice but always moves off it',
          'Landing on E confirms the root and releases all the tension',
        ],
        reinforce: [
          'The blue note works because it keeps moving',
          'Tension is created by the b5 and released by the root E',
        ],
      },
    ],
  },
}
