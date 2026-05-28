import type { RawTutorial } from '../../tutorial-builder'

export const rubatoTutorial: RawTutorial = {
  id: 'tutorial-rubato',
  title: 'Rubato — Time as Expression',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–7s: Strict time — each note exactly on the beat
    ['C4', 0.0, 0.5],
    ['E4', 0.6, 0.5],
    ['G4', 1.2, 0.5],
    ['C5', 1.8, 0.5],
    ['B4', 2.4, 0.5],
    ['G4', 3.0, 0.5],
    ['E4', 3.6, 0.5],
    ['C4', 4.2, 1.6],
    // 8–16s: Rubato version — slight push/pull on the same phrase
    ['C4', 8.0, 0.6],
    ['E4', 8.55, 0.4],
    ['G4', 9.0, 0.4],
    ['C5', 9.45, 0.7, 0.95],
    ['B4', 10.25, 0.5],
    ['G4', 10.8, 0.5],
    ['E4', 11.35, 0.7],
    ['C4', 12.15, 2.0],
    // 17–25s: Heavily rubato — long pauses, sudden rushes
    ['C4', 17.0, 1.0, 0.85],
    ['E4', 18.1, 0.3, 0.95],
    ['G4', 18.45, 0.3],
    ['C5', 18.8, 1.4, 0.95],
    ['B4', 20.3, 0.5, 0.9],
    ['G4', 20.85, 0.35],
    ['E4', 21.25, 0.4, 0.85],
    ['C4', 21.75, 2.5],
  ],
  tutorial: {
    title: 'Rubato — Time as Expression',
    summary:
      '"Rubato" literally means "stolen time" — slightly speeding up here, slowing down there, while keeping the overall pulse alive. It\'s how a phrase breathes. Without rubato, even the right notes can sound mechanical.',
    level: 'Advanced',
    objectives: [
      'Hear the difference between strict time and rubato',
      'Identify where to push (build tension) vs pull (relax)',
      'Apply small rubato to a familiar phrase',
    ],
    sections: [
      {
        id: 'strict',
        title: 'Strict time — the metronome',
        start: 0,
        end: 8,
        focus: 'Every note exactly on the beat',
        learn: [
          'A computer playing this is perfectly even — and slightly lifeless',
          'Strict time is the baseline, not the goal',
        ],
      },
      {
        id: 'gentle-rubato',
        title: 'Gentle rubato',
        start: 8,
        end: 17,
        focus: 'Slight delay on accented notes, slight rush on passing notes',
        learn: [
          'Notes leading INTO a climax can rush slightly',
          'The climax note itself can be held a beat longer',
          'You "steal" time from one beat and "give it back" later',
        ],
        tryThis: [
          'Play your favorite melody at 0.5×, hold the most important note an extra moment',
          'It should suddenly sound more "human"',
        ],
      },
      {
        id: 'expressive',
        title: 'Heavy rubato — Chopin style',
        start: 17,
        end: 26,
        focus: 'Sudden pauses, rushed scale fragments, long sustained climax',
        learn: [
          'Chopin and Rachmaninoff used dramatic rubato',
          "Listen for: a held note, a sudden flurry, a held note. That's rubato",
        ],
        reinforce: [
          "Rubato isn't slowing down or speeding up evenly — it's about ebb and flow",
          "If you wrote your rubato on paper, it'd look like irregular squiggles around a steady line",
          'The steady line never disappears, even when you stretch around it',
        ],
      },
    ],
  },
}
