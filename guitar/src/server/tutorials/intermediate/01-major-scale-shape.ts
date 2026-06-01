import type { RawTutorial } from '../../tutorial-builder'

const fret = (stringIndex: number, fret: number) => ({ stringIndex, fret })

export const majorScaleShapeTutorial: RawTutorial = {
  id: 'tutorial-major-scale-shape',
  title: 'The Movable Major Scale Shape',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // Ascending G major, one octave (G2 A2 B2 C3 D3 E3 F#3 G3)
    ['G2', 0.0, 0.5, undefined, fret(0, 3)],
    ['A2', 0.5, 0.5, undefined, fret(0, 5)],
    ['B2', 1.0, 0.5, undefined, fret(1, 2)],
    ['C3', 1.5, 0.5, undefined, fret(1, 3)],
    ['D3', 2.0, 0.5, undefined, fret(1, 5)],
    ['E3', 2.5, 0.5, undefined, fret(2, 2)],
    ['F#3', 3.0, 0.5, undefined, fret(2, 4)],
    ['G3', 3.5, 1.0, undefined, fret(2, 5)],
    // Descending
    ['G3', 5.0, 0.5, undefined, fret(2, 5)],
    ['F#3', 5.5, 0.5, undefined, fret(2, 4)],
    ['E3', 6.0, 0.5, undefined, fret(2, 2)],
    ['D3', 6.5, 0.5, undefined, fret(1, 5)],
    ['C3', 7.0, 0.5, undefined, fret(1, 3)],
    ['B2', 7.5, 0.5, undefined, fret(1, 2)],
    ['A2', 8.0, 0.5, undefined, fret(0, 5)],
    ['G2', 8.5, 1.0, undefined, fret(0, 3)],
    // Short melodic run drawn from the shape
    ['G2', 10.0, 0.5, undefined, fret(0, 3)],
    ['B2', 10.5, 0.5, undefined, fret(1, 2)],
    ['D3', 11.0, 0.5, undefined, fret(1, 5)],
    ['E3', 11.5, 0.5, undefined, fret(2, 2)],
    ['D3', 12.0, 0.5, undefined, fret(1, 5)],
    ['B2', 12.5, 0.5, undefined, fret(1, 2)],
    ['F#3', 13.0, 0.5, undefined, fret(2, 4)],
    ['G3', 13.5, 1.5, undefined, fret(2, 5)],
  ],
  tutorial: {
    title: 'The Movable Major Scale Shape',
    summary:
      'One closed fingering of the major scale unlocks every key. Here you play G major across one octave starting on the low E string, using only fretted notes, then turn the same box shape into a short melody. Because the pattern avoids open strings, you can slide the entire shape up the neck to land in a new key without changing the string-and-fret relationships.',
    level: 'Intermediate',
    objectives: [
      'Play the one-octave G major scale up and down',
      'Recognize the whole-half step pattern W-W-H-W-W-W-H',
      'Understand that a closed shape is movable to any key',
      'Build a small melody from scale tones',
    ],
    sections: [
      {
        id: 'ascend-descend',
        title: 'Up and Down',
        start: 0,
        end: 10,
        focus: 'A closed G major shape on the low strings',
        learn: [
          'G major is G A B C D E F# G; the only sharp is F#.',
          'The step pattern is whole-whole-half-whole-whole-whole-half.',
          'Watch the frets 2 through 5: the notes form a closed shape with no open strings.',
        ],
        tryThis: ['Loop the ascent until each note rings cleanly.'],
        breakIt: ['Play F natural instead of F#: it stops sounding major.'],
      },
      {
        id: 'movable',
        title: 'A Movable Melody',
        start: 10,
        end: 15,
        focus: 'Skipping through the shape to make music',
        learn: [
          'Notes from the same shape become a melody, not just a run.',
          'Slide the whole shape up two frets and the same relationships become A major.',
        ],
        reinforce: [
          'The string-and-fret pattern stays the same; only the starting fret changes.',
        ],
      },
    ],
  },
}
