import type { RawTutorial } from '../../tutorial-builder'

export const minorTriadTutorial: RawTutorial = {
  id: 'tutorial-minor-triad',
  title: 'The Minor Triad',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: A minor triad — A C E
    ['A3', 0.0, 1.6, 0.9],
    ['C4', 0.0, 1.6, 0.9],
    ['E4', 0.0, 1.6, 0.9],
    ['A3', 2.0, 0.5],
    ['C4', 2.5, 0.5],
    ['E4', 3.0, 0.5],
    ['A4', 3.5, 1.0],
    // 6–11s: C major right after — same root style, brighter sound
    ['C4', 6.0, 1.6, 0.9],
    ['E4', 6.0, 1.6, 0.9],
    ['G4', 6.0, 1.6, 0.9],
    ['C4', 8.0, 0.5],
    ['E4', 8.5, 0.5],
    ['G4', 9.0, 0.5],
    ['C5', 9.5, 1.0],
    // 12–17s: C minor — same root as C major, but Eb instead of E
    ['C4', 12.0, 1.6, 0.9],
    ['D#4', 12.0, 1.6, 0.9],
    ['G4', 12.0, 1.6, 0.9],
    ['C4', 14.0, 0.5],
    ['D#4', 14.5, 0.5],
    ['G4', 15.0, 0.5],
    ['C5', 15.5, 1.0],
    // 18–22s: Compare side by side — C major vs C minor
    ['C4', 18.0, 1.0, 0.95],
    ['E4', 18.0, 1.0, 0.95],
    ['G4', 18.0, 1.0, 0.95],
    ['C4', 19.5, 1.0, 0.95],
    ['D#4', 19.5, 1.0, 0.95],
    ['G4', 19.5, 1.0, 0.95],
    ['C4', 21.0, 1.0, 0.95],
    ['E4', 21.0, 1.0, 0.95],
    ['G4', 21.0, 1.0, 0.95],
    // 24–30s: Two minor chords — A minor and E minor
    ['A3', 24.0, 1.4, 0.9],
    ['C4', 24.0, 1.4, 0.9],
    ['E4', 24.0, 1.4, 0.9],
    ['E4', 25.6, 1.4, 0.9],
    ['G4', 25.6, 1.4, 0.9],
    ['B4', 25.6, 1.4, 0.9],
    ['A3', 27.2, 2.0, 0.95],
    ['C4', 27.2, 2.0, 0.95],
    ['E4', 27.2, 2.0, 0.95],
  ],
  tutorial: {
    title: 'The Minor Triad',
    summary:
      'Lower the middle note of a major triad by a half step and you get a minor triad. C–E–G (bright) becomes C–E♭–G (sad). One note changes the entire emotional color of music.',
    level: 'Beginner',
    objectives: [
      'Build a minor triad from any root (root + minor 3rd + 5th)',
      'Hear the difference between major and minor',
      'Switch between major and minor on the same root',
    ],
    sections: [
      {
        id: 'a-minor',
        title: 'A minor — A C E',
        start: 0,
        end: 6,
        focus:
          'All white keys, but the middle note (C) is closer to A than E is',
        learn: [
          'A minor has the same shape as C major but starts on A',
          'The 3rd above A is C — only 3 half-steps (a minor 3rd)',
        ],
        tryThis: [
          'Hold the A minor chord — listen to its mellow, slightly sad color',
          'Compare to a C major chord you played in the previous lesson',
        ],
      },
      {
        id: 'c-major-recall',
        title: 'C major (reminder)',
        start: 6,
        end: 12,
        focus: 'C E G — bright',
        learn: [
          'The 3rd above C is E — 4 half-steps (a major 3rd)',
          'Major = bigger 3rd; minor = smaller 3rd',
        ],
      },
      {
        id: 'c-minor',
        title: 'C minor — C E♭ G',
        start: 12,
        end: 18,
        focus: 'Same root, same 5th — but now E♭ instead of E',
        learn: [
          'Lowering the middle note by ONE key turns C major into C minor',
          'On the keyboard, you play the black key just to the left of E',
        ],
        tryThis: [
          "Hold C major. Slide your middle finger one key left. That's C minor.",
          'Toggle back and forth — feel the mood flip',
        ],
      },
      {
        id: 'side-by-side',
        title: 'Major then minor then major',
        start: 18,
        end: 22,
        focus: 'The "switch" played explicitly',
        learn: [
          'You can change the emotional character with a single key',
          'This is the core of harmonic storytelling',
        ],
      },
      {
        id: 'other-minors',
        title: 'A minor + E minor',
        start: 24,
        end: 30,
        focus: 'Two more minor triads — paired progression',
        learn: [
          'Like majors, you can build minor triads from any root',
          'A, D, and E minor are common in many songs',
        ],
        reinforce: [
          'Try building a minor triad from G (G B♭ D)',
          'Then from D (D F A) — both are entirely on white keys + one black',
        ],
      },
    ],
  },
}
