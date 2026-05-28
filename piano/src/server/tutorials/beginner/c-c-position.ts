import type { RawTutorial } from '../../tutorial-builder'

export const cPositionTutorial: RawTutorial = {
  id: 'tutorial-c-position',
  title: 'The C Position',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–5s: Walk thumb → pinky on C D E F G
    ['C4', 0.0, 0.55],
    ['D4', 0.6, 0.55],
    ['E4', 1.2, 0.55],
    ['F4', 1.8, 0.55],
    ['G4', 2.4, 1.2],
    // 6–11s: Walk back pinky → thumb
    ['G4', 6.0, 0.55],
    ['F4', 6.6, 0.55],
    ['E4', 7.2, 0.55],
    ['D4', 7.8, 0.55],
    ['C4', 8.4, 1.4],
    // 12–17s: Mix the five fingers — short phrase
    ['C4', 12.0, 0.5],
    ['E4', 12.5, 0.5],
    ['G4', 13.0, 0.5],
    ['E4', 13.5, 0.5],
    ['D4', 14.0, 0.5],
    ['F4', 14.5, 0.5],
    ['E4', 15.0, 0.5],
    ['C4', 15.5, 1.2],
    // 18–24s: Two-step jumps within the position
    ['C4', 18.0, 0.4],
    ['G4', 18.4, 0.4],
    ['D4', 18.8, 0.4],
    ['F4', 19.2, 0.4],
    ['E4', 19.6, 0.4],
    ['G4', 20.0, 0.4],
    ['C4', 20.4, 0.4],
    ['E4', 20.8, 0.4],
    ['G4', 21.2, 0.4],
    ['C4', 21.6, 1.4],
  ],
  tutorial: {
    title: 'The C Position',
    summary:
      'Put your right thumb on C4 (middle C). Index on D, middle on E, ring on F, pinky on G. Five fingers, five white keys, no thumb-passes yet. This is your launchpad — most beginner songs live entirely in this shape.',
    level: 'Beginner',
    objectives: [
      'Place all five right-hand fingers correctly on C D E F G',
      'Play each finger one at a time without looking',
      'Mix fingers in short phrases',
    ],
    sections: [
      {
        id: 'place-fingers',
        title: 'Place the hand',
        start: 0,
        end: 6,
        focus: 'Thumb=1, index=2, middle=3, ring=4, pinky=5',
        learn: [
          'Right thumb on middle C (C4)',
          'The next four fingers fall naturally on D, E, F, G',
          'Each finger should rest on its key — no reaching',
        ],
        tryThis: [
          'Press each key in sequence: 1, 2, 3, 4, 5',
          'Keep all five fingers touching their keys even when not playing',
        ],
      },
      {
        id: 'walk-back',
        title: 'Walk back down',
        start: 6,
        end: 12,
        focus: '5, 4, 3, 2, 1 — pinky to thumb',
        learn: [
          'Going down trains finger independence in the opposite direction',
          'Watch that fingers stay curved, not flat',
        ],
        tryThis: [
          'Repeat at 0.5× speed and feel each finger lift cleanly',
          "Whisper finger numbers as you play: '5, 4, 3, 2, 1'",
        ],
      },
      {
        id: 'short-phrase',
        title: 'Mix the fingers',
        start: 12,
        end: 18,
        focus: 'C E G E D F E C — short phrase within the position',
        learn: [
          'You can already play hundreds of melodies without moving your hand',
          'Any 5-note phrase in C major is reachable from this position',
        ],
      },
      {
        id: 'jumps',
        title: 'Two-step jumps',
        start: 18,
        end: 24,
        focus: 'Train fingers 1, 3, 5 — the chord-tone fingers',
        learn: [
          'Thumb (1), middle (3), and pinky (5) play the most stable notes',
          'These three fingers will become your "chord hand"',
        ],
        reinforce: [
          "Hold thumb + middle + pinky together — that's C major triad with one hand",
          "You'll meet that chord again in lesson 11",
        ],
      },
    ],
  },
}
