import type { RawTutorial } from '../../tutorial-builder'

export const modalInterchangeTutorial: RawTutorial = {
  id: 'tutorial-modal-interchange',
  title: 'Modal Interchange — Borrowing from the Other Side',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    ['C4', 0.0, 0.4],
    ['E4', 0.4, 0.4],
    ['G4', 0.8, 0.4],
    ['C5', 1.2, 0.4],
    ['B4', 1.6, 0.4],
    ['G4', 2.0, 0.4],
    ['E4', 2.4, 0.4],
    ['C4', 2.8, 1.2],
    ['C4', 5.0, 0.4],
    ['E4', 5.4, 0.4],
    ['G4', 5.8, 0.4],
    ['G#4', 6.2, 0.7, 0.9],
    ['G4', 6.9, 0.4],
    ['E4', 7.3, 0.4],
    ['C4', 7.7, 1.4],
    ['C4', 11.0, 0.4],
    ['D#4', 11.4, 0.5, 0.9],
    ['G4', 11.9, 0.4],
    ['G#4', 12.3, 0.6, 0.9],
    ['G4', 12.9, 0.4],
    ['E4', 13.3, 0.4],
    ['C4', 13.7, 1.4],
  ],
  tutorial: {
    title: 'Modal Interchange',
    summary:
      'Modal interchange means borrowing a note (or chord) from the "parallel" key. Sprinkling a C minor note into a C major phrase creates that cinematic, slightly sad warmth you hear in film scores.',
    level: 'Advanced',
    objectives: [
      'Hear what "borrowing" sounds like — a flash of a different mode',
      'Recognize the iconic ♭6 borrowed sound (A♭ over C major)',
      'Combine ♭3 and ♭6 to evoke a Coldplay / Disney "wistful" color',
    ],
    sections: [
      {
        id: 'pure-major',
        title: 'Plain C major',
        start: 0,
        end: 5,
        focus: 'C, E, G, B — purely diatonic',
        learn: ['Stay inside the key — clean, sunny, no surprises'],
      },
      {
        id: 'borrow-flat-six',
        title: 'Borrow the ♭6 (A♭)',
        start: 5,
        end: 11,
        focus: 'A♭ from C minor, dropped into a C major phrase',
        learn: [
          "A♭ doesn't belong to C major, but it does belong to C minor",
          'That borrow creates a sudden warmth without changing key',
        ],
        tryThis: [
          'Play a C major arpeggio and slip an A♭ in before resolving back to G',
          'This is the "Pixar moment" — a flash of melancholy in a major piece',
        ],
      },
      {
        id: 'full-mixture',
        title: 'Full modal mixture',
        start: 11,
        end: 16,
        focus: 'Both ♭3 (E♭) and ♭6 (A♭) borrowed from C minor',
        learn: [
          'Multiple borrowed notes deepen the "minor color" while staying in C major',
          'You can return to the major 3rd whenever you want — the borrow is temporary',
        ],
        reinforce: [
          'Hold the borrowed E♭ — it almost wants to become C minor',
          'Then resolve to C and notice the relief — you came home',
        ],
      },
    ],
  },
}
