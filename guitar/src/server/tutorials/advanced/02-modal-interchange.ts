import type { RawTutorial } from '../../tutorial-builder'

export const modalInterchangeTutorial: RawTutorial = {
  id: 'tutorial-modal-interchange',
  title: 'Modal Interchange',
  bpm: 76,
  beatsPerBar: 4,
  phrase: [
    // Section 1: home in C major — C major triad and a bright C scale fragment
    ['C3', 0.0, 0.9],
    ['E3', 0.0, 0.9],
    ['G3', 0.0, 0.9],
    ['C3', 1.2, 0.4],
    ['D3', 1.6, 0.4],
    ['E3', 2.0, 0.4],
    ['F3', 2.4, 0.4],
    ['G3', 2.8, 0.4],
    ['E3', 3.2, 0.4],
    ['C3', 3.6, 0.9],
    ['E3', 3.6, 0.9],
    ['G3', 3.6, 0.9],
    // Section 2: borrow from C minor — bVII (Bb major = Bb D F, played A# D F) and b3 (Eb, played D#)
    ['A#2', 5.5, 1.0],
    ['D3', 5.5, 1.0],
    ['F3', 5.5, 1.0],
    ['A#3', 6.6, 0.4],
    ['D#4', 7.0, 0.5],
    ['D4', 7.5, 0.4],
    ['A#3', 7.9, 0.4],
    ['G3', 8.3, 0.4],
    ['A#2', 8.8, 1.0],
    ['D3', 8.8, 1.0],
    ['F3', 8.8, 1.0],
    // Section 3: borrowed color resolving back home to C major
    ['G3', 10.5, 0.4],
    ['D#4', 10.9, 0.45],
    ['D4', 11.35, 0.35],
    ['C4', 11.7, 0.45],
    ['A#3', 12.15, 0.35],
    ['A3', 12.5, 0.45],
    ['G3', 12.95, 0.45],
    ['C3', 13.6, 1.4],
    ['E3', 13.6, 1.4],
    ['G3', 13.6, 1.4],
    ['C4', 13.6, 1.4],
  ],
  tutorial: {
    title: 'Modal Interchange',
    summary:
      'Modal interchange means borrowing chords and notes from a parallel key. Sitting in C major, we reach over into C minor and steal two flavors: the bVII chord (Bb major = Bb D F) and the flat-3rd (Eb). These borrowed tones cast a darker, soulful shadow over the bright major home, then melt back into C major. (On this sharp-only fretboard, Bb shows as A# and Eb as D#.)',
    level: 'Advanced',
    objectives: [
      'Understand borrowing from the parallel minor',
      'Voice the bVII (Bb major, Bb D F) on guitar',
      'Hear the b3 (Eb) color against a major center',
      'Resolve borrowed tension back to C major',
    ],
    sections: [
      {
        id: 'home',
        title: 'Home in C major',
        start: 0,
        end: 5.5,
        focus: 'C E G — the bright diatonic center',
        learn: [
          'Every note here belongs to C major — clean and consonant',
          'Establish the key clearly so the borrowed color stands out later',
        ],
      },
      {
        id: 'borrow',
        title: 'Borrowing from C minor',
        start: 5.5,
        end: 10.5,
        focus: 'bVII chord (Bb D F) and the b3 (Eb)',
        learn: [
          'Bb D F is Bb major — the bVII borrowed from C minor (shown here as A# D F)',
          'Eb is the flat-3rd, instantly turning the mood smoky',
        ],
        tryThis: [
          'A-B between a C major and the Bb major voicing to feel the lift',
          'Play E natural then Eb to hear major vs borrowed minor color',
        ],
      },
      {
        id: 'resolve',
        title: 'Back to the light',
        start: 10.5,
        end: 15.0,
        focus: 'Borrowed line melting into a C major chord',
        learn: [
          'The descending line slides Eb down through D to C',
          'The final C major chord absorbs the borrowed shadow',
        ],
        reinforce: [
          'Borrowed tones work because the home key is strong',
          'Parallel-key color is a loan, not a key change',
        ],
      },
    ],
  },
}
