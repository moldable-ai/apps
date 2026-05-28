import type { RawTutorial } from '../../tutorial-builder'

export const stepsVsSkipsTutorial: RawTutorial = {
  id: 'tutorial-steps-vs-skips',
  title: 'Steps vs Skips',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: Steps — adjacent notes
    ['C4', 0.0, 0.6],
    ['D4', 0.7, 0.6],
    ['E4', 1.4, 0.6],
    ['F4', 2.1, 0.6],
    ['G4', 2.8, 0.6],
    ['F4', 3.5, 0.6],
    ['E4', 4.2, 0.6],
    ['D4', 4.9, 0.6],
    ['C4', 5.6, 1.2],
    // 8–14s: Skips — every other note (chord tones)
    ['C4', 8.0, 0.6],
    ['E4', 8.7, 0.6],
    ['G4', 9.4, 0.6],
    ['E4', 10.1, 0.6],
    ['C4', 10.8, 0.6],
    ['G4', 11.5, 0.6],
    ['E4', 12.2, 0.6],
    ['C4', 12.9, 1.4],
    // 16–22s: Mix — Twinkle Twinkle uses both steps and skips
    ['C4', 16.0, 0.5],
    ['C4', 16.6, 0.5],
    ['G4', 17.2, 0.5],
    ['G4', 17.8, 0.5],
    ['A4', 18.4, 0.5],
    ['A4', 19.0, 0.5],
    ['G4', 19.6, 1.0],
    ['F4', 20.7, 0.5],
    ['F4', 21.3, 0.5],
    ['E4', 21.9, 0.5],
    ['E4', 22.5, 0.5],
    ['D4', 23.1, 0.5],
    ['D4', 23.7, 0.5],
    ['C4', 24.3, 1.4],
  ],
  tutorial: {
    title: 'Steps vs Skips',
    summary:
      'Steps move to the very next key (C → D). Skips skip a note (C → E). Songs almost always blend both — steps feel smooth, skips feel open. Once you can hear the difference, you can hear melodic shape.',
    level: 'Beginner',
    objectives: [
      'Distinguish a step from a skip by ear',
      'Hear that scales are made of steps',
      'Hear that chord arpeggios are made of skips',
    ],
    sections: [
      {
        id: 'steps',
        title: 'Steps — smooth and tight',
        start: 0,
        end: 8,
        focus: 'C, D, E, F, G, F, E, D, C — every adjacent white key',
        learn: [
          'A "step" = the very next key (white or black, doesn\'t matter)',
          'Scales are stairs of steps',
        ],
        tryThis: [
          'Play 5 stepwise notes from any starting point on the keyboard',
          'They should all "lean into" each other smoothly',
        ],
      },
      {
        id: 'skips',
        title: 'Skips — open and arpeggiated',
        start: 8,
        end: 16,
        focus: 'C, E, G — skipping a note each time',
        learn: [
          'A "skip" jumps over a note',
          'These notes are the building blocks of chords (more in lesson 11)',
        ],
        tryThis: [
          'Play C, E, G one at a time — hear the open, "chordy" feel',
          'Now press them together — same notes, now a chord',
        ],
      },
      {
        id: 'mix',
        title: 'Songs mix both — Twinkle, Twinkle',
        start: 16,
        end: 26,
        focus: 'Real melody: some steps, some skips',
        learn: [
          '"Twinkle" jumps from C to G — that\'s a skip of 4 (a 5th)',
          '"Up above the world so high" uses small steps to come back down',
        ],
        reinforce: [
          'Hum a melody you know — try to identify the steps and skips',
          'Most catchy melodies have just a few big skips and lots of small steps',
        ],
      },
    ],
  },
}
