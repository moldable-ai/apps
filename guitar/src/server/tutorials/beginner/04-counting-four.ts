import type { RawTutorial } from '../../tutorial-builder'

export const countingFourTutorial: RawTutorial = {
  id: 'tutorial-counting-four',
  title: 'Counting to Four',
  beatsPerBar: 4,
  phrase: [
    // Bar 1 - accent on beat 1
    ['E2', 0.0, 1.0, 0.9],
    ['E2', 1.0, 1.0],
    ['E2', 2.0, 1.0],
    ['E2', 3.0, 1.0],
    // Bar 2 - accent on beat 1
    ['E2', 4.0, 1.0, 0.9],
    ['E2', 5.0, 1.0],
    ['E2', 6.0, 1.0],
    ['E2', 7.0, 1.0],
    // Bar 3 - move to A string, accent on beat 1
    ['A2', 8.0, 1.0, 0.9],
    ['A2', 9.0, 1.0],
    ['A2', 10.0, 1.0],
    ['A2', 11.0, 1.0],
    // Bar 4 - back to E, accent on beat 1
    ['E2', 12.0, 1.0, 0.9],
    ['E2', 13.0, 1.0],
    ['E2', 14.0, 1.0],
    ['E2', 15.0, 1.0],
  ],
  tutorial: {
    title: 'Counting to Four',
    summary:
      'This is a steady four-on-the-floor groove built from quarter notes on the low E string, with a short move to the A string in the third bar. Beat 1 of every bar gets a little extra punch (an accent) so you can always feel where the bar begins. Count out loud — "1, 2, 3, 4" — and dig in slightly on the 1. This is the heartbeat under almost every rock and pop song.',
    level: 'Beginner',
    objectives: [
      'Count a steady 1-2-3-4 in 4/4 time',
      'Accent beat 1 to mark the start of each bar',
      'Keep even spacing between every pluck',
    ],
    sections: [
      {
        id: 'eight-on-e',
        title: 'Eight beats on E',
        start: 0,
        end: 8,
        focus: 'steady quarter notes with an accented downbeat',
        learn: [
          'Each bar is four quarter notes: 1-2-3-4.',
          'Beat 1 is played a little louder — that is the accent.',
          'Keep your picking hand moving like a clock.',
        ],
        tryThis: ['Say the count out loud, stressing the "1".'],
      },
      {
        id: 'switch-and-return',
        title: 'Switch and return',
        start: 8,
        end: 16,
        focus: 'changing strings without losing the beat',
        learn: [
          'Bar 3 moves to the A string, then bar 4 returns to E.',
          'Change strings exactly on beat 1 so the pulse never stutters.',
        ],
        reinforce: [
          'If you rush the string change, slow down until it lands on the beat.',
        ],
      },
    ],
  },
}
