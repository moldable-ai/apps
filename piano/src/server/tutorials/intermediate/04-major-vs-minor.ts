import type { RawTutorial } from '../../tutorial-builder'

export const majorVsMinorTutorial: RawTutorial = {
  id: 'tutorial-major-vs-minor',
  title: 'Major vs Minor — One Note Changes Everything',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: C major triad arpeggio (C E G C, descending)
    ['C4', 0.0, 0.45],
    ['E4', 0.5, 0.45],
    ['G4', 1.0, 0.45],
    ['C5', 1.5, 0.45],
    ['G4', 2.0, 0.45],
    ['E4', 2.5, 0.45],
    ['C4', 3.0, 1.2],
    // 5–9s: C minor triad arpeggio (C Eb G C) — same root, same 5th
    ['C4', 5.0, 0.45],
    ['D#4', 5.5, 0.45],
    ['G4', 6.0, 0.45],
    ['C5', 6.5, 0.45],
    ['G4', 7.0, 0.45],
    ['D#4', 7.5, 0.45],
    ['C4', 8.0, 1.2],
    // 10–14s: Toggle — C E G then C Eb G then C E G
    ['C4', 10.0, 0.4],
    ['E4', 10.4, 0.4],
    ['G4', 10.8, 0.9],
    ['C4', 11.8, 0.4],
    ['D#4', 12.2, 0.4],
    ['G4', 12.6, 0.9],
    ['C4', 13.6, 0.4],
    ['E4', 14.0, 0.4],
    ['G4', 14.4, 1.2],
  ],
  tutorial: {
    title: 'Major vs Minor',
    summary:
      'Major and minor chords share two of three notes. The 3rd — that one middle note — is what flips bright to dark. Hear how E vs E♭ rewires the entire mood.',
    level: 'Intermediate',
    objectives: [
      'Hear the major / minor "switch" on the same root note',
      'Identify the 3rd as the mood-defining interval',
      'Use the same root note to make both feelings on demand',
    ],
    sections: [
      {
        id: 'c-major',
        title: 'C major — C E G — bright',
        start: 0,
        end: 5,
        focus: 'The major triad: root, major 3rd, perfect 5th',
        learn: ['Major 3rd = 4 half-steps (C to E)', 'Bright, open, "happy"'],
      },
      {
        id: 'c-minor',
        title: 'C minor — C E♭ G — pensive',
        start: 5,
        end: 10,
        focus: 'Same root, same 5th, but a minor 3rd in the middle',
        learn: [
          'Minor 3rd = 3 half-steps (C to E♭)',
          'Same two outer notes, but the mood is completely different',
        ],
      },
      {
        id: 'toggle',
        title: 'Flip back and forth',
        start: 10,
        end: 15,
        focus: 'Major → minor → major on the same C',
        learn: [
          'You can change the entire emotional character with one note',
          'This is the core of harmonic storytelling',
        ],
        tryThis: [
          'Play C E G slowly. Then play C E♭ G. Then back to C E G.',
          'Try the same trick on G (G B D vs G B♭ D) and A (A C♯ E vs A C E)',
        ],
      },
    ],
  },
}
