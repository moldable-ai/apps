import type { RawTutorial } from '../../tutorial-builder'

export const countingFourTutorial: RawTutorial = {
  id: 'tutorial-counting-four',
  title: 'Counting to Four',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: Bar 1 — accent on beat 1
    ['C4', 0.0, 0.9, 0.95],
    ['C4', 1.0, 0.9, 0.55],
    ['C4', 2.0, 0.9, 0.6],
    ['C4', 3.0, 0.9, 0.55],
    // 5–9s: Bar 2 — beats 1 and 3 stand out (strong / weak)
    ['C4', 5.0, 0.9, 0.95],
    ['C4', 6.0, 0.9, 0.55],
    ['C4', 7.0, 0.9, 0.8],
    ['C4', 8.0, 0.9, 0.55],
    // 10–14s: Bar 3 — vary pitch but keep the accent pattern
    ['C4', 10.0, 0.9, 0.95],
    ['E4', 11.0, 0.9, 0.55],
    ['G4', 12.0, 0.9, 0.8],
    ['E4', 13.0, 0.9, 0.55],
    // 15–22s: Two bars in 3/4 — three beats per bar, accent on 1
    ['C4', 15.0, 0.9, 0.95],
    ['E4', 16.0, 0.9, 0.55],
    ['G4', 17.0, 0.9, 0.55],
    ['C4', 18.0, 0.9, 0.95],
    ['E4', 19.0, 0.9, 0.55],
    ['G4', 20.0, 0.9, 0.55],
    ['C5', 21.0, 1.0],
  ],
  tutorial: {
    title: 'Counting to Four',
    summary:
      'A "bar" groups beats into a repeating cycle — most music is in 4. Beat 1 always gets the strongest accent, beat 3 a smaller one, and beats 2 and 4 are the light "ands." Once you feel that pattern, you have time signature.',
    level: 'Beginner',
    objectives: [
      'Feel the 1–2–3–4 pulse with beat 1 emphasized',
      'Distinguish "strong" and "weak" beats',
      'Hear how 3/4 differs from 4/4',
    ],
    sections: [
      {
        id: 'four-on-the-floor',
        title: 'One bar of 4 — feel the downbeat',
        start: 0,
        end: 5,
        focus: 'Beat 1 is louder than beats 2, 3, 4',
        learn: [
          'A "bar" is a recurring group of beats',
          'Beat 1 is the "downbeat" — the strongest pulse',
        ],
        tryThis: [
          'Count "ONE two three four" with extra weight on ONE',
          'Tap with your foot only on the ONE',
        ],
      },
      {
        id: 'strong-weak',
        title: 'Strong / weak / mid / weak',
        start: 5,
        end: 10,
        focus: 'In 4/4 the pattern is strong–weak–medium–weak',
        learn: [
          'Beat 3 is a "secondary downbeat" — stronger than 2 or 4 but weaker than 1',
          'This is why 4/4 feels balanced even though only beat 1 is the loudest',
        ],
      },
      {
        id: 'melody',
        title: 'Add pitch — the rhythm stays',
        start: 10,
        end: 15,
        focus: 'C–E–G–E with the same accent shape',
        learn: [
          "Changing pitches doesn't change which beat is strong",
          'The downbeat is independent of melody',
        ],
      },
      {
        id: 'in-three',
        title: 'Now in 3 — waltz time',
        start: 15,
        end: 22,
        focus: '1–2–3, 1–2–3 — only three beats per bar',
        learn: [
          '3/4 (waltz) groups beats in threes instead of fours',
          'You still emphasize beat 1; there\'s no "mid" accent because there\'s no beat 3',
        ],
        reinforce: [
          'Count "ONE two three, ONE two three" out loud',
          'Most familiar piano pieces are in 4/4 — Für Elise is in 3/8 (a fast waltz feel)',
        ],
      },
    ],
  },
}
