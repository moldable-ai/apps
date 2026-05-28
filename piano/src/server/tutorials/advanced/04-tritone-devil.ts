import type { RawTutorial } from '../../tutorial-builder'

export const tritoneDevilTutorial: RawTutorial = {
  id: 'tutorial-tritone-devil',
  title: "The Tritone — The Devil's Interval",
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: The tritone — C and F# played together (raw clash)
    ['C4', 0.0, 1.6, 0.9],
    ['F#4', 0.0, 1.6, 0.9],
    ['C4', 2.0, 0.4],
    ['F#4', 2.4, 1.2],
    // 5–10s: Resolve to a 3rd — outward (C→B, F#→G)
    ['C4', 5.0, 1.4, 0.9],
    ['F#4', 5.0, 1.4, 0.9],
    ['B3', 6.6, 1.8, 0.95],
    ['G4', 6.6, 1.8, 0.95],
    // 11–17s: Or resolve inward (C→D♭, F#→F)
    ['C4', 11.0, 1.4, 0.9],
    ['F#4', 11.0, 1.4, 0.9],
    ['C#4', 12.6, 1.8, 0.95],
    ['F4', 12.6, 1.8, 0.95],
    // 18–24s: The tritone inside a dominant 7 chord — G7 contains B and F (a tritone)
    ['G3', 18.0, 1.6, 0.9],
    ['B3', 18.0, 1.6, 0.9],
    ['D4', 18.0, 1.6, 0.9],
    ['F4', 18.0, 1.6, 0.9],
    ['C4', 19.8, 1.8, 0.95],
    ['E4', 19.8, 1.8, 0.95],
    ['G4', 19.8, 1.8, 0.95],
  ],
  tutorial: {
    title: "The Tritone — The Devil's Interval",
    summary:
      'A tritone is exactly half an octave — six half-steps. It\'s the most unstable interval in music. Medieval theorists called it "diabolus in musica" (the devil in music). Today it\'s the engine inside every dominant 7th chord.',
    level: 'Advanced',
    objectives: [
      'Recognize a tritone by ear (it sounds harsh and unresolved)',
      'Hear the two natural resolutions (outward and inward)',
      'Spot the tritone inside any dominant 7th chord',
    ],
    sections: [
      {
        id: 'the-clash',
        title: 'The clash itself',
        start: 0,
        end: 5,
        focus: 'C and F♯ — exactly 6 half-steps apart',
        learn: [
          'A tritone divides the octave in half',
          'It\'s the most "dissonant" interval — neither consonant nor a half-step neighbor',
        ],
        tryThis: [
          'Hold C and F♯ together — your ear immediately wants the notes to move',
          "It almost hurts. That's the point — tritones demand resolution",
        ],
      },
      {
        id: 'outward',
        title: 'Resolve outward → C major',
        start: 5,
        end: 11,
        focus:
          'C → B (move down), F♯ → G (move up) — both move outward by a half-step',
        learn: [
          'The result: B + G = an open 6th (a stable, consonant interval)',
          'This is the V → I resolution in C major',
        ],
      },
      {
        id: 'inward',
        title: 'Resolve inward → F major (kind of)',
        start: 11,
        end: 18,
        focus: 'C → C♯, F♯ → F — both move inward',
        learn: [
          'Now the resolution lands on a different chord',
          'Same tritone, two possible homes — the context decides',
        ],
      },
      {
        id: 'in-dom7',
        title: 'The tritone lives inside V7',
        start: 18,
        end: 25,
        focus: 'G7 (G B D F) contains B + F — a tritone',
        learn: [
          'Every dominant 7th chord has a tritone built in',
          'That tritone is what makes V7 want to resolve to I',
        ],
        reinforce: [
          'Play G7 (G B D F) → C major (C E G)',
          'The B moves up to C, the F moves down to E — the tritone resolves outward',
          'This single move is the basis of nearly all Western harmony',
        ],
      },
    ],
  },
}
