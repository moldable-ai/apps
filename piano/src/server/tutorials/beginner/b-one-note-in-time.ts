import type { RawTutorial } from '../../tutorial-builder'

export const oneNoteInTimeTutorial: RawTutorial = {
  id: 'tutorial-one-note-in-time',
  title: 'One Note, In Time',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // 0–4s: Four quarter notes on C4 — one per beat
    ['C4', 0.0, 0.9],
    ['C4', 1.0, 0.9],
    ['C4', 2.0, 0.9],
    ['C4', 3.0, 0.9],
    // 5–9s: Two half notes — each lasts 2 beats
    ['C4', 5.0, 1.9],
    ['C4', 7.0, 1.9],
    // 10–14s: One whole note — lasts 4 beats
    ['C4', 10.0, 3.9],
    // 15–24s: Mix — quarter quarter half / half quarter quarter / four quarters / whole
    ['C4', 15.0, 0.9],
    ['C4', 16.0, 0.9],
    ['C4', 17.0, 1.9],
    ['C4', 19.0, 1.9],
    ['C4', 21.0, 0.9],
    ['C4', 22.0, 0.9],
    ['C4', 23.0, 0.9],
  ],
  tutorial: {
    title: 'One Note, In Time',
    summary:
      'Before melody comes rhythm. A single note, played at steady, predictable intervals, is the foundation of every song. Lock the timing first — pitch comes next.',
    level: 'Beginner',
    objectives: [
      'Feel a steady beat',
      'Hear the difference between quarter, half, and whole notes',
      'Play in time without speeding up or slowing down',
    ],
    sections: [
      {
        id: 'quarters',
        title: 'Quarter notes — one per beat',
        start: 0,
        end: 5,
        focus: 'Four notes, one second each',
        learn: [
          'A "quarter note" lasts one beat',
          'At 60 BPM, each beat is exactly one second',
        ],
        tryThis: [
          'Count "1, 2, 3, 4" out loud as you play',
          'Try tapping the same beat with your free hand to feel the steady pulse',
        ],
      },
      {
        id: 'halves',
        title: 'Half notes — twice as long',
        start: 5,
        end: 10,
        focus: 'Two notes, two seconds each',
        learn: [
          'A "half note" lasts two beats — twice as long as a quarter',
          'Same pulse, fewer notes per bar',
        ],
        tryThis: [
          'Count "1, 2" for the first note, "3, 4" for the second',
          'Listen — the gap feels deliberate, not slow',
        ],
      },
      {
        id: 'whole',
        title: 'Whole note — hold for four beats',
        start: 10,
        end: 15,
        focus: 'One note, four seconds',
        learn: [
          'A "whole note" lasts an entire bar (four beats)',
          'Notice how much space a single sustained note can fill',
        ],
      },
      {
        id: 'mix',
        title: 'Mix the durations',
        start: 15,
        end: 25,
        focus: 'Quarters and halves combined — a real rhythm starts to emerge',
        learn: [
          'Combining note lengths is what gives music its phrasing',
          'A bar of four quarters feels driving; a bar of two halves feels patient',
        ],
        reinforce: [
          'Try the same pattern on a different note (E4 or G4)',
          "The rhythm should feel identical — pitch doesn't change time",
        ],
      },
    ],
  },
}
