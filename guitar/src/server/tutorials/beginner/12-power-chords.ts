import type { RawTutorial } from '../../tutorial-builder'

export const powerChordsTutorial: RawTutorial = {
  id: 'tutorial-power-chords',
  title: 'Power Chords',
  beatsPerBar: 4,
  phrase: [
    // Intro: each power chord stated cleanly
    // E5 = E2 + B2
    ['E2', 0.0, 1.0],
    ['B2', 0.0, 1.0],
    ['E2', 1.0, 1.0],
    ['B2', 1.0, 1.0],
    // A5 = A2 + E3
    ['A2', 2.0, 1.0],
    ['E3', 2.0, 1.0],
    ['A2', 3.0, 1.0],
    ['E3', 3.0, 1.0],
    // G5 = G2 + D3
    ['G2', 4.0, 1.0],
    ['D3', 4.0, 1.0],
    ['G2', 5.0, 1.0],
    ['D3', 5.0, 1.0],
    // E5 hold
    ['E2', 6.0, 2.0],
    ['B2', 6.0, 2.0],
    // Driving riff section
    ['E2', 8.0, 0.5, 0.9],
    ['B2', 8.0, 0.5, 0.9],
    ['E2', 8.5, 0.5],
    ['B2', 8.5, 0.5],
    ['G2', 9.0, 1.0],
    ['D3', 9.0, 1.0],
    ['A2', 10.0, 1.0],
    ['E3', 10.0, 1.0],
    ['E2', 11.0, 1.0, 0.9],
    ['B2', 11.0, 1.0, 0.9],
    ['E2', 12.0, 0.5],
    ['B2', 12.0, 0.5],
    ['E2', 12.5, 0.5],
    ['B2', 12.5, 0.5],
    ['G2', 13.0, 1.0],
    ['D3', 13.0, 1.0],
    ['A2', 14.0, 1.0],
    ['E3', 14.0, 1.0],
    ['E2', 15.0, 2.0, 0.95],
    ['B2', 15.0, 2.0, 0.95],
  ],
  tutorial: {
    title: 'Power Chords',
    summary:
      'Power chords are the engine of rock guitar. Each one uses just two notes — the root and its fifth — played together. They are neither major nor minor, which is why they sound so strong and flexible with distortion. Here you learn three shapes: E5 (E + B), A5 (A + E), and G5 (G + D). After stating each one, you drive them into a chugging riff. Keep your fretting hand firm and let both notes ring as one big sound.',
    level: 'Beginner',
    objectives: [
      'Play two-note power chords (root + fifth)',
      'Learn the E5, A5, and G5 shapes',
      'Build a driving riff by moving between them',
    ],
    sections: [
      {
        id: 'the-shapes',
        title: 'The shapes',
        start: 0,
        end: 8,
        focus: 'stating each power chord cleanly',
        learn: [
          'A power chord is just the root plus the fifth — two notes.',
          'E5 = E + B, A5 = A + E, G5 = G + D.',
          'Both notes share a start time, so they sound together.',
        ],
        tryThis: ['Press both notes firmly and strum just those two strings.'],
      },
      {
        id: 'driving-riff',
        title: 'The driving riff',
        start: 8,
        end: 17,
        focus: 'moving power chords in rhythm',
        learn: [
          'Moving the same shape between strings changes the chord.',
          'Accents on the downbeats give the riff its drive.',
        ],
        reinforce: [
          'Mute the strings briefly between chugs for a tight, punchy feel.',
        ],
      },
    ],
  },
}
