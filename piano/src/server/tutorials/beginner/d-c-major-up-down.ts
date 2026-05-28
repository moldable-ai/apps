import type { RawTutorial } from '../../tutorial-builder'

export const cMajorUpDownTutorial: RawTutorial = {
  id: 'tutorial-diatonic-world',
  title: 'C Major, Up and Down',
  bpm: 80,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: C major scale up — slow
    ['C4', 0.0, 0.7],
    ['D4', 0.75, 0.7],
    ['E4', 1.5, 0.7],
    ['F4', 2.25, 0.7],
    ['G4', 3.0, 0.7],
    ['A4', 3.75, 0.7],
    ['B4', 4.5, 0.7],
    ['C5', 5.25, 1.4],
    // 7–13s: C major scale down
    ['C5', 7.5, 0.7],
    ['B4', 8.25, 0.7],
    ['A4', 9.0, 0.7],
    ['G4', 9.75, 0.7],
    ['F4', 10.5, 0.7],
    ['E4', 11.25, 0.7],
    ['D4', 12.0, 0.7],
    ['C4', 12.75, 1.6],
    // 15–22s: A minor — same notes, but landing on A
    ['A3', 15.0, 0.7],
    ['B3', 15.75, 0.7],
    ['C4', 16.5, 0.7],
    ['D4', 17.25, 0.7],
    ['E4', 18.0, 0.7],
    ['F4', 18.75, 0.7],
    ['G4', 19.5, 0.7],
    ['A4', 20.25, 1.6],
    // 24–30s: White-key noodle — proves every white note fits
    ['G4', 24.0, 0.45],
    ['E4', 24.5, 0.45],
    ['C4', 25.0, 0.45],
    ['F4', 25.5, 0.45],
    ['A4', 26.0, 0.45],
    ['D4', 26.5, 0.45],
    ['G4', 27.0, 0.45],
    ['E4', 27.5, 0.45],
    ['C5', 28.0, 1.5],
  ],
  tutorial: {
    title: 'C Major, Up and Down',
    summary:
      "The C major scale is the alphabet of music. Seven white keys in a row, then you arrive at C an octave higher. Every melody you'll meet for a long time is built from these notes.",
    level: 'Beginner',
    objectives: [
      'Play the C major scale up and down without looking',
      'Hear that all white keys belong to one family',
      'Recognize the difference between scale "up" and scale "down"',
    ],
    sections: [
      {
        id: 'scale-up',
        title: 'Up: C D E F G A B C',
        start: 0,
        end: 7,
        focus: 'One note per key — all seven white keys then back to C',
        learn: [
          'Use fingers 1-2-3 then pass thumb under to 1-2-3-4-5',
          'The last C is the same letter but an octave higher',
        ],
        tryThis: [
          'Practice the thumb-under: after E, tuck the thumb to play F',
          'Slow this section to 0.5× while you learn the fingering',
        ],
      },
      {
        id: 'scale-down',
        title: 'Down: C B A G F E D C',
        start: 7,
        end: 15,
        focus: 'Reverse the journey — now cross 3 over the thumb',
        learn: [
          'Going down: start with pinky, finger 3 crosses over the thumb after F',
          'The shape mirrors the way up',
        ],
      },
      {
        id: 'a-minor',
        title: 'Same notes, A is home',
        start: 15,
        end: 24,
        focus: 'Eight white keys but starting and ending on A',
        learn: [
          'A natural minor uses the exact same notes as C major',
          'The mood shifts entirely because A — not C — feels like home',
        ],
        tryThis: [
          'Listen for the moment your ear shifts — somewhere in the climb up',
          'Land on the high A and notice how complete it feels',
        ],
      },
      {
        id: 'safe-noodle',
        title: 'White-key freedom',
        start: 24,
        end: 30,
        focus: 'Random order of white keys — still feels coherent',
        learn: [
          'No white key is "outside" the family',
          'This is the safest improvisation space on the keyboard',
        ],
        reinforce: [
          'Improvise for 30 seconds using only white keys',
          'Try to always end on C — feel the resolution',
        ],
      },
    ],
  },
}
