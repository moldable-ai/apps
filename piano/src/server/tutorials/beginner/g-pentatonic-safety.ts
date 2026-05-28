import type { RawTutorial } from '../../tutorial-builder'

export const pentatonicSafetyTutorial: RawTutorial = {
  id: 'tutorial-pentatonic-playground',
  title: 'The Black-Key Safety Net',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–3s: Climb all five black keys
    ['C#4', 0.0, 0.4],
    ['D#4', 0.4, 0.4],
    ['F#4', 0.8, 0.4],
    ['G#4', 1.2, 0.4],
    ['A#4', 1.6, 0.4],
    ['C#5', 2.0, 0.9],
    // 4–8s: Random pentatonic noodling — everything sounds okay
    ['F#4', 4.0, 0.4],
    ['A#4', 4.4, 0.4],
    ['D#5', 4.8, 0.4],
    ['G#4', 5.2, 0.4],
    ['C#5', 5.6, 0.4],
    ['F#4', 6.0, 0.4],
    ['A#4', 6.4, 0.4],
    ['D#4', 6.8, 0.4],
    ['C#5', 7.2, 0.9],
    // 9–13s: One white key (F) breaks the safety
    ['F#4', 9.0, 0.4],
    ['G#4', 9.4, 0.4],
    ['A#4', 9.8, 0.4],
    ['F4', 10.2, 0.6, 0.85],
    ['A#4', 10.8, 0.4],
    ['G#4', 11.2, 0.4],
    ['F#4', 11.6, 1.0],
    // 14–18s: Return to safety, mix octaves
    ['C#4', 14.0, 0.35],
    ['F#4', 14.35, 0.35],
    ['A#4', 14.7, 0.35],
    ['C#5', 15.05, 0.35],
    ['A#4', 15.4, 0.35],
    ['F#4', 15.75, 0.35],
    ['D#5', 16.1, 0.35],
    ['G#5', 16.45, 0.35],
    ['C#5', 16.8, 1.2],
  ],
  tutorial: {
    title: 'The Black-Key Safety Net',
    summary:
      'The five black keys form a pentatonic scale — no half-step clashes anywhere. That makes them extraordinarily forgiving: almost any order sounds intentional.',
    level: 'Beginner',
    objectives: [
      'Hear why the black keys alone almost always sound good together',
      'Understand that pentatonic scales avoid the half-step clashes that cause tension',
      'Spot what happens the moment you mix in a "wrong" white key',
    ],
    sections: [
      {
        id: 'the-five',
        title: 'The five black notes',
        start: 0,
        end: 4,
        focus: 'C♯ D♯ F♯ G♯ A♯ — the major pentatonic transposed to black keys',
        learn: [
          'No two of these notes are a half-step apart',
          'Half-step clashes (E–F, B–C) are what create real tension',
        ],
      },
      {
        id: 'no-wrong-notes',
        title: 'No wrong notes',
        start: 4,
        end: 9,
        focus: 'Random black-key order still sounds intentional',
        learn: [
          'Pentatonic = the safety net of improvisation',
          'You can\'t really pick a "wrong" order in this set',
        ],
        tryThis: [
          'Close your eyes and play random black keys at any speed',
          'Try mixing octaves — the pentatonic shape stays consonant',
        ],
      },
      {
        id: 'one-outsider',
        title: 'One outsider breaks it',
        start: 9,
        end: 14,
        focus: 'A single F natural snuck into the black-key world',
        learn: [
          'F natural sits a half-step from both F♯ and E',
          'Half-step neighbors are what introduce friction',
        ],
        breakIt: [
          'F natural creates instant friction in the pentatonic',
          "This is the moment your ear leaves the 'safety bubble'",
        ],
      },
      {
        id: 'reinforce',
        title: 'Back to the safety net',
        start: 14,
        end: 18,
        focus: 'Long arpeggio across the black keys, ending on C♯',
        learn: [
          'Pentatonic patterns are the simplest improvisation tool you have',
          'You will return to them throughout your playing life',
        ],
        reinforce: [
          'Try this arpeggio with both hands, an octave apart',
          'Add accents on the higher notes — even simple patterns feel musical',
        ],
      },
    ],
  },
}
