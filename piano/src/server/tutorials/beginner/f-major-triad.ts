import type { RawTutorial } from '../../tutorial-builder'

export const majorTriadTutorial: RawTutorial = {
  id: 'tutorial-major-triad',
  title: 'The Major Triad',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: C major triad — block chord, then arpeggio
    ['C4', 0.0, 1.6, 0.9],
    ['E4', 0.0, 1.6, 0.9],
    ['G4', 0.0, 1.6, 0.9],
    ['C4', 2.0, 0.5],
    ['E4', 2.5, 0.5],
    ['G4', 3.0, 0.5],
    ['C5', 3.5, 1.0],
    // 6–10s: F major triad (F A C)
    ['F4', 6.0, 1.6, 0.9],
    ['A4', 6.0, 1.6, 0.9],
    ['C5', 6.0, 1.6, 0.9],
    ['F4', 8.0, 0.5],
    ['A4', 8.5, 0.5],
    ['C5', 9.0, 0.5],
    ['F5', 9.5, 1.0],
    // 12–16s: G major triad (G B D)
    ['G3', 12.0, 1.6, 0.9],
    ['B3', 12.0, 1.6, 0.9],
    ['D4', 12.0, 1.6, 0.9],
    ['G3', 14.0, 0.5],
    ['B3', 14.5, 0.5],
    ['D4', 15.0, 0.5],
    ['G4', 15.5, 1.0],
    // 18–24s: Three chords in sequence — C, F, G, C (the "I-IV-V-I" progression)
    ['C4', 18.0, 1.4, 0.9],
    ['E4', 18.0, 1.4, 0.9],
    ['G4', 18.0, 1.4, 0.9],
    ['F4', 19.6, 1.4, 0.9],
    ['A4', 19.6, 1.4, 0.9],
    ['C5', 19.6, 1.4, 0.9],
    ['G3', 21.2, 1.4, 0.9],
    ['B3', 21.2, 1.4, 0.9],
    ['D4', 21.2, 1.4, 0.9],
    ['C4', 22.8, 2.0, 0.95],
    ['E4', 22.8, 2.0, 0.95],
    ['G4', 22.8, 2.0, 0.95],
  ],
  tutorial: {
    title: 'The Major Triad',
    summary:
      'A triad is three notes stacked in thirds. A major triad sounds bright, open, "happy." C–E–G is the most famous one. Once you can build a major triad anywhere on the keyboard, you can already play thousands of songs.',
    level: 'Beginner',
    objectives: [
      'Build a major triad from any root (root + 3rd + 5th)',
      'Recognize the bright sound of a major chord',
      'Play three major chords in sequence (C, F, G)',
    ],
    sections: [
      {
        id: 'c-major',
        title: 'C major triad — C E G',
        start: 0,
        end: 6,
        focus:
          'Press all three together, then play them one at a time (arpeggio)',
        learn: [
          'Root (C), major 3rd (E), perfect 5th (G)',
          'Fingers 1, 3, 5 on the right hand',
        ],
        tryThis: [
          'Hold the chord down for 4 beats — feel its weight',
          'Then arpeggiate: 1 (thumb), 3 (middle), 5 (pinky)',
        ],
      },
      {
        id: 'f-major',
        title: 'F major triad — F A C',
        start: 6,
        end: 12,
        focus: 'Same shape, different root',
        learn: [
          'The hand makes the same shape — fingers 1, 3, 5 on F, A, C',
          'It sounds "the same family" as C major, just transposed',
        ],
      },
      {
        id: 'g-major',
        title: 'G major triad — G B D',
        start: 12,
        end: 18,
        focus: 'Now in the lower octave',
        learn: [
          'G major has the same hand shape — root, 3rd, 5th',
          'These three chords (C, F, G) are the most common in all of pop music',
        ],
      },
      {
        id: 'progression',
        title: 'String them together',
        start: 18,
        end: 25,
        focus: 'C → F → G → C (the most common progression in music)',
        learn: [
          'This is the I–IV–V–I progression',
          "You'll find it in thousands of songs across every genre",
        ],
        reinforce: [
          'Play the four chords slowly, holding each',
          'Try humming a melody on top — your ear already knows what fits',
        ],
      },
    ],
  },
}
