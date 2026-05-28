import type { RawTutorial } from '../../tutorial-builder'

export const seventhChordsTutorial: RawTutorial = {
  id: 'tutorial-seventh-chords',
  title: '7th Chords — Adding Color',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: C major (triad) — pure
    ['C4', 0.0, 1.8, 0.9],
    ['E4', 0.0, 1.8, 0.9],
    ['G4', 0.0, 1.8, 0.9],
    // 5–9s: C major 7 — adds B (the 7th of C major)
    ['C4', 5.0, 2.6, 0.9],
    ['E4', 5.0, 2.6, 0.9],
    ['G4', 5.0, 2.6, 0.9],
    ['B4', 5.0, 2.6, 0.9],
    // 10–14s: C dominant 7 — adds B♭ (flat 7), wants to move to F
    ['C4', 10.0, 2.6, 0.9],
    ['E4', 10.0, 2.6, 0.9],
    ['G4', 10.0, 2.6, 0.9],
    ['A#4', 10.0, 2.6, 0.9],
    // 15–19s: Resolve C7 to F — the dominant pull
    ['C4', 15.0, 1.4, 0.9],
    ['E4', 15.0, 1.4, 0.9],
    ['G4', 15.0, 1.4, 0.9],
    ['A#4', 15.0, 1.4, 0.9],
    ['F4', 16.6, 1.8, 0.95],
    ['A4', 16.6, 1.8, 0.95],
    ['C5', 16.6, 1.8, 0.95],
    // 21–28s: C minor 7 (Cm7) — C E♭ G B♭
    ['C4', 21.0, 2.6, 0.9],
    ['D#4', 21.0, 2.6, 0.9],
    ['G4', 21.0, 2.6, 0.9],
    ['A#4', 21.0, 2.6, 0.9],
    // 26–30s: Resolve Cm7 → F (still tense, but less sharp)
    ['F4', 26.0, 2.0, 0.95],
    ['A4', 26.0, 2.0, 0.95],
    ['C5', 26.0, 2.0, 0.95],
  ],
  tutorial: {
    title: '7th Chords',
    summary:
      'Add a 4th note (a 7th above the root) to any triad and you get a 7th chord. The three flavors — major 7, dominant 7, minor 7 — each have their own emotional color. 7ths are the jazz vocabulary in a single note.',
    level: 'Intermediate',
    objectives: [
      'Build a major 7th (Cmaj7 = C E G B)',
      'Build a dominant 7th (C7 = C E G B♭)',
      'Hear the difference between maj7, dominant 7, and minor 7',
    ],
    sections: [
      {
        id: 'triad-recap',
        title: 'C major triad — the starting point',
        start: 0,
        end: 5,
        focus: 'C E G — bright and stable',
        learn: [
          'A plain triad sounds pure but a little "vanilla" in jazz',
          "Adding a 7th adds character without changing the chord's identity",
        ],
      },
      {
        id: 'maj7',
        title: 'Cmaj7 — C E G B (dreamy)',
        start: 5,
        end: 10,
        focus: 'Adds B — the 7th of the C major scale',
        learn: [
          'Major 7th = root + major 3rd + perfect 5th + major 7th',
          'Sounds dreamy, sophisticated, like a Steely Dan opening',
        ],
      },
      {
        id: 'dom7',
        title: 'C7 — C E G B♭ (wants to move)',
        start: 10,
        end: 15,
        focus: 'Lower the 7th to B♭ — tension creates a pull',
        learn: [
          'Dominant 7th = major triad + flat 7',
          'It feels unresolved — your ear wants it to go somewhere',
        ],
      },
      {
        id: 'resolve',
        title: 'C7 → F (the classic dominant pull)',
        start: 15,
        end: 21,
        focus: 'C7 is the V7 of F — it resolves down a 5th',
        learn: [
          'Dominant 7ths almost always want to resolve down a 5th',
          'This is the most common "cadence" in Western music',
        ],
      },
      {
        id: 'minor7',
        title: 'Cm7 — C E♭ G B♭',
        start: 21,
        end: 30,
        focus: 'Lower BOTH the 3rd and 7th',
        learn: [
          'Minor 7th = minor triad + flat 7',
          'Sounds soft, jazzy, soulful — the "70s soul" sound',
        ],
        reinforce: [
          'Try the three 7ths side by side on the same root: Cmaj7, C7, Cm7',
          "You've unlocked the basic jazz vocabulary",
        ],
      },
    ],
  },
}
