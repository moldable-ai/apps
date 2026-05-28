import type { RawTutorial } from '../../tutorial-builder'

export const dorianTutorial: RawTutorial = {
  id: 'tutorial-mode-dorian',
  title: 'Modes I — Dorian',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: D Dorian scale (all white keys, starting on D)
    ['D4', 0.0, 0.55],
    ['E4', 0.625, 0.55],
    ['F4', 1.25, 0.55],
    ['G4', 1.875, 0.55],
    ['A4', 2.5, 0.55],
    ['B4', 3.125, 0.55],
    ['C5', 3.75, 0.55],
    ['D5', 4.375, 1.3],
    // 8–14s: A characteristic Dorian phrase — uses the bright 6th (B)
    ['D4', 8.0, 0.5],
    ['A4', 8.6, 0.5],
    ['G4', 9.2, 0.5],
    ['B4', 9.8, 0.5],
    ['A4', 10.4, 0.5],
    ['F4', 11.0, 0.5],
    ['E4', 11.6, 0.5],
    ['D4', 12.2, 1.4],
    // 15–22s: Compare — D minor (natural) uses B♭ instead of B
    ['D4', 15.0, 0.5],
    ['A4', 15.6, 0.5],
    ['G4', 16.2, 0.5],
    ['A#4', 16.8, 0.5, 0.85],
    ['A4', 17.4, 0.5],
    ['F4', 18.0, 0.5],
    ['E4', 18.6, 0.5],
    ['D4', 19.2, 1.4],
    // 23–30s: Back to Dorian — that bright 6th gives it the unique color
    ['D4', 23.0, 0.5],
    ['F4', 23.6, 0.5],
    ['A4', 24.2, 0.5],
    ['B4', 24.8, 0.5],
    ['A4', 25.4, 0.5],
    ['B4', 26.0, 0.5],
    ['A4', 26.6, 0.5],
    ['F4', 27.2, 0.5],
    ['D4', 27.8, 1.4],
  ],
  tutorial: {
    title: 'Modes I — Dorian',
    summary:
      'Play only white keys, but start and end on D. That\'s D Dorian — a minor-feeling scale with a curious "bright" sixth. It\'s the smoky sound of Carlos Santana, Miles Davis, and "Scarborough Fair."',
    level: 'Intermediate',
    objectives: [
      'Play the D Dorian scale (white keys from D to D)',
      'Hear what makes Dorian distinct from natural minor',
      'Identify the "raised 6th" as Dorian\'s signature note',
    ],
    sections: [
      {
        id: 'd-dorian-scale',
        title: 'D Dorian — white keys from D',
        start: 0,
        end: 8,
        focus: 'D E F G A B C D — same white keys, different "home"',
        learn: [
          'Dorian is the second mode of the major scale',
          'D Dorian and C major share all 7 notes — only the tonic differs',
        ],
      },
      {
        id: 'phrase',
        title: 'A Dorian phrase',
        start: 8,
        end: 15,
        focus: 'Notice the B natural — it makes the minor feel "lift" briefly',
        learn: [
          'D Dorian sounds minor-ish (D-F is a minor 3rd)',
          'But the B natural is a raised 6th — brighter than natural minor',
        ],
      },
      {
        id: 'vs-minor',
        title: 'Vs D natural minor',
        start: 15,
        end: 23,
        focus: 'Same melody but B♭ instead of B — feels darker',
        learn: [
          'D natural minor: D E F G A B♭ C D (one black key)',
          'B♭ is the natural 6th of D minor; B natural is the raised 6th of D Dorian',
        ],
        breakIt: [
          'Listen to how B♭ removes the "lift" — it sounds plainly sad',
          'B natural keeps the minor feel but adds hope or curiosity',
        ],
      },
      {
        id: 'dorian-back',
        title: 'Back to Dorian',
        start: 23,
        end: 30,
        focus: 'The same B natural now feels essential',
        learn: [
          "Once you hear the raised 6th, you can't unhear it",
          'Dorian appears in folk, jazz, prog rock — anywhere a "cool" minor is wanted',
        ],
        reinforce: [
          'Improvise on white keys but always end on D',
          "Try resolving on D after a phrase that uses A and B — that's Dorian",
        ],
      },
    ],
  },
}
