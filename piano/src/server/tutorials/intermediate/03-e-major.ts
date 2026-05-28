import type { RawTutorial } from '../../tutorial-builder'

export const eMajorTutorial: RawTutorial = {
  id: 'tutorial-black-keys-take-over',
  title: 'When Black Keys Take Over (E major)',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: E major scale (E F# G# A B C# D# E)
    ['E4', 0.0, 0.45],
    ['F#4', 0.5, 0.45],
    ['G#4', 1.0, 0.45],
    ['A4', 1.5, 0.45],
    ['B4', 2.0, 0.45],
    ['C#5', 2.5, 0.45],
    ['D#5', 3.0, 0.45],
    ['E5', 3.5, 0.9],
    // 5–9s: Stay in the world — E major chord arpeggio
    ['E4', 5.0, 0.4],
    ['G#4', 5.4, 0.4],
    ['B4', 5.8, 0.4],
    ['E5', 6.2, 0.4],
    ['B4', 6.6, 0.4],
    ['G#4', 7.0, 0.4],
    ['E4', 7.4, 0.9],
    // 10–14s: The outsiders — F natural and C natural feel wrong now
    ['E4', 10.0, 0.4],
    ['F#4', 10.4, 0.4],
    ['F4', 10.8, 0.6, 0.85],
    ['G#4', 11.4, 0.4],
    ['A4', 11.8, 0.4],
    ['C5', 12.2, 0.6, 0.85],
    ['C#5', 12.8, 0.4],
    ['E5', 13.2, 1.0],
  ],
  tutorial: {
    title: 'When Black Keys Take Over',
    summary:
      'E major needs four sharps: F♯, G♯, C♯, D♯. Once your ear commits to this key, the "matching" white notes (F natural, C natural) become the outsiders.',
    level: 'Intermediate',
    objectives: [
      'Hear what E major sounds like — bright, four sharps',
      'Notice that pure white-key playing no longer "fits" once E major is established',
      'Understand that committing to a key forces a specific set of seven notes',
    ],
    sections: [
      {
        id: 'e-major',
        title: 'The E major scale',
        start: 0,
        end: 5,
        focus: 'E F♯ G♯ A B C♯ D♯ E',
        learn: [
          'Four of seven notes are black keys',
          'Your ear now expects all seven of these notes — not the C-major ones',
        ],
      },
      {
        id: 'stay-inside',
        title: 'Stay in the world',
        start: 5,
        end: 10,
        focus: 'E major chord (E G♯ B) — pure consonance',
        learn: [
          'Triads built from scale tones are the "anchors" inside a key',
          'These notes all reinforce E as home',
        ],
        tryThis: [
          'Improvise using only F♯, G♯, C♯, D♯ and the white keys A, B, E',
          'Try landing on E or B — both feel stable in this key',
        ],
      },
      {
        id: 'the-outsiders',
        title: 'The outsiders now sting',
        start: 10,
        end: 15,
        focus: 'F natural and C natural inside an E major phrase',
        learn: [
          'F natural conflicts with F♯; C natural conflicts with C♯',
          'These were "free" white keys before — now they sound jarring',
        ],
        breakIt: [
          'Drop in an F natural — the half-step clash against F♯ stings',
          'Try a C natural after a C♯ — same thing',
        ],
        reinforce: [
          'Switch back to the E major scale and notice the relief',
          'This is what "being in a key" means in practice',
        ],
      },
    ],
  },
}
