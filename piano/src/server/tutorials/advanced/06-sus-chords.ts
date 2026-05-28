import type { RawTutorial } from '../../tutorial-builder'

export const susChordsTutorial: RawTutorial = {
  id: 'tutorial-sus-chords',
  title: 'Sus Chords — Suspended Tension',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: C major (the resolved chord)
    ['C4', 0.0, 1.8, 0.9],
    ['E4', 0.0, 1.8, 0.9],
    ['G4', 0.0, 1.8, 0.9],
    // 6–11s: Csus4 — replace the E with F
    ['C4', 6.0, 1.8, 0.9],
    ['F4', 6.0, 1.8, 0.9],
    ['G4', 6.0, 1.8, 0.9],
    // 12–17s: Sus4 → major (the resolution)
    ['C4', 12.0, 1.4, 0.9],
    ['F4', 12.0, 1.4, 0.9],
    ['G4', 12.0, 1.4, 0.9],
    ['C4', 13.6, 1.8, 0.95],
    ['E4', 13.6, 1.8, 0.95],
    ['G4', 13.6, 1.8, 0.95],
    // 18–22s: Sus2 — replace the E with D
    ['C4', 18.0, 1.8, 0.9],
    ['D4', 18.0, 1.8, 0.9],
    ['G4', 18.0, 1.8, 0.9],
    // 23–28s: Sus2 → major (D moves to E)
    ['C4', 23.0, 1.4, 0.9],
    ['D4', 23.0, 1.4, 0.9],
    ['G4', 23.0, 1.4, 0.9],
    ['C4', 24.6, 1.8, 0.95],
    ['E4', 24.6, 1.8, 0.95],
    ['G4', 24.6, 1.8, 0.95],
    // 29–34s: Sus4 → Sus2 → major (full color sequence)
    ['C4', 29.0, 1.0, 0.9],
    ['F4', 29.0, 1.0, 0.9],
    ['G4', 29.0, 1.0, 0.9],
    ['C4', 30.1, 1.0, 0.9],
    ['D4', 30.1, 1.0, 0.9],
    ['G4', 30.1, 1.0, 0.9],
    ['C4', 31.2, 2.0, 0.95],
    ['E4', 31.2, 2.0, 0.95],
    ['G4', 31.2, 2.0, 0.95],
  ],
  tutorial: {
    title: 'Sus Chords',
    summary:
      'A "sus" chord replaces the 3rd of a triad with the 4th (sus4) or 2nd (sus2). The 3rd is what makes a chord major or minor — remove it and the chord floats, waiting to resolve. Sus chords are the "anticipation" sound in pop and gospel.',
    level: 'Advanced',
    objectives: [
      'Build Csus4 (C F G) and Csus2 (C D G)',
      'Hear the suspended quality — neither major nor minor',
      'Use the sus → resolved-chord motion as an expressive device',
    ],
    sections: [
      {
        id: 'c-major',
        title: 'C major — the resolution',
        start: 0,
        end: 6,
        focus: 'C E G — bright, stable',
        learn: ['The E (the major 3rd) is what defines this as "major"'],
      },
      {
        id: 'csus4',
        title: 'Csus4 — C F G (suspended)',
        start: 6,
        end: 12,
        focus: 'Replace E with F — the 4th',
        learn: [
          'Sus4 = root + 4th + 5th (no 3rd!)',
          'F sits a half-step above E and wants to drop down',
        ],
      },
      {
        id: 'resolve-down',
        title: 'Sus4 resolves down — F → E',
        start: 12,
        end: 18,
        focus: 'Hold Csus4, then move F → E for plain C major',
        learn: [
          'This is the classic "Pinball Wizard" / Coldplay opening',
          'The unresolved chord builds anticipation; the major answer feels earned',
        ],
      },
      {
        id: 'csus2',
        title: 'Csus2 — C D G',
        start: 18,
        end: 23,
        focus: 'Replace E with D — the 2nd',
        learn: [
          'Sus2 = root + 2nd + 5th',
          'D sits a half-step below E and wants to lift up',
        ],
      },
      {
        id: 'resolve-up',
        title: 'Sus2 resolves up — D → E',
        start: 23,
        end: 29,
        focus: 'Csus2 → C major',
        learn: ['Open and shimmery — common in U2 and ambient music'],
      },
      {
        id: 'full-arc',
        title: 'Sus4 → Sus2 → resolved',
        start: 29,
        end: 33,
        focus: 'A sequence that delays gratification',
        learn: ['Stacking suspensions creates a long arc of "almost arriving"'],
        reinforce: [
          'Try playing a song you know, but replace each chord with its sus4 version on beat 1',
          'Listen to how the chord breathes before settling',
        ],
      },
    ],
  },
}
