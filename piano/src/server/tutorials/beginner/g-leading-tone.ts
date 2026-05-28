import type { RawTutorial } from '../../tutorial-builder'

export const leadingToneTutorial: RawTutorial = {
  id: 'tutorial-power-of-d-sharp',
  title: "The Leading Tone — Für Elise's Secret",
  bpm: 60,
  beatsPerBar: 3,
  phrase: [
    // 0–4s: Für Elise opening (E D# E D# E B D C A)
    ['E5', 0.0, 0.35],
    ['D#5', 0.35, 0.35],
    ['E5', 0.7, 0.35],
    ['D#5', 1.05, 0.35],
    ['E5', 1.4, 0.35],
    ['B4', 1.75, 0.35],
    ['D5', 2.1, 0.35],
    ['C5', 2.45, 0.35],
    ['A4', 2.8, 1.4],
    // 5–10s: The "break it" version — D natural everywhere D# was
    ['E5', 5.0, 0.4, 0.85],
    ['D5', 5.4, 0.4, 0.85],
    ['E5', 5.8, 0.4, 0.85],
    ['D5', 6.2, 0.4, 0.85],
    ['E5', 6.6, 0.4, 0.85],
    ['B4', 7.0, 0.4, 0.85],
    ['D5', 7.4, 0.4, 0.85],
    ['C5', 7.8, 0.4, 0.85],
    ['A4', 8.2, 1.6, 0.85],
    // 11–16s: Reinforce — D# leans hard into E
    ['D#5', 11.0, 1.4],
    ['E5', 12.4, 1.4],
    ['D#5', 13.8, 0.8],
    ['E5', 14.6, 1.6],
    // 17–22s: Use it in a longer line — D# is the gravity well
    ['A4', 17.0, 0.4],
    ['B4', 17.4, 0.4],
    ['C5', 17.8, 0.4],
    ['D#5', 18.2, 0.5],
    ['E5', 18.7, 0.8],
    ['D#5', 19.5, 0.4],
    ['E5', 19.9, 0.4],
    ['B4', 20.3, 0.4],
    ['C5', 20.7, 0.4],
    ['A4', 21.1, 1.5],
  ],
  tutorial: {
    title: "The Leading Tone — Für Elise's Secret",
    summary:
      'Für Elise opens with E — D♯ — E. That tiny D♯ is a leading tone: it leans into E like a magnet. Once your ear hears the pull, it expects future notes to fit the same world.',
    level: 'Beginner',
    objectives: [
      'Hear D♯ as a "pulling" note rather than just another black key',
      'Feel why D natural sounds wrong once D♯ has been established',
      'Understand that one chromatic note can define an entire key center',
    ],
    sections: [
      {
        id: 'listen',
        title: 'Listen for the pull',
        start: 0,
        end: 5,
        focus: 'The famous opening: E D♯ E D♯ E B D C A',
        learn: [
          'D♯ is half a step below E — a leading tone',
          'Your ear hears D♯ as wanting to resolve up to E',
          'This little gesture anchors the piece in A minor with a raised 4th',
        ],
        tryThis: [
          'Slow this to 0.25× and play along on just E and D♯',
          'Feel the tiny tension on D♯ and the release back to E',
        ],
      },
      {
        id: 'break',
        title: 'Break it on purpose',
        start: 5,
        end: 11,
        focus: 'Same melody but using D natural instead of D♯',
        learn: [
          'D natural and D♯ are two versions of the same scale degree',
          'Once D♯ is implied, D natural feels deflated — the magnet pull is gone',
        ],
        breakIt: [
          'After the song establishes D♯, try playing D natural where it used to be',
          "Listen to the cringe — that's your ear demanding the leading tone back",
        ],
      },
      {
        id: 'reinforce',
        title: 'Reinforce the pull',
        start: 11,
        end: 17,
        focus: 'Long D♯, then E — feel the gravity',
        learn: [
          'A held D♯ feels suspended, like a question waiting for an answer',
          'E is the answer — full release of tension',
        ],
        reinforce: [
          'Hold D♯ and notice how badly it wants to move',
          'When E finally arrives, the tension releases',
        ],
      },
      {
        id: 'in-a-line',
        title: 'Use it in a phrase',
        start: 17,
        end: 23,
        focus: 'A walking line that uses D♯ → E as its destination',
        learn: [
          'Leading tones make lines feel directed instead of random',
          'Any time you want to reach a chord tone, a half-step below is the smoothest path',
        ],
        reinforce: [
          'Try improvising any short white-key line that ends on E',
          'Drop a D♯ in just before the E — feel the line tighten up',
        ],
      },
    ],
  },
}
