import type { RawTutorial } from '../../tutorial-builder'

export const triadShapesTutorial: RawTutorial = {
  id: 'tutorial-triad-shapes',
  title: 'Triad Shapes & Inversions',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // Root position: C E G arpeggio, then chord
    ['C3', 0.0, 0.5],
    ['E3', 0.5, 0.5],
    ['G3', 1.0, 0.5],
    ['C3', 1.5, 1.0],
    ['E3', 1.5, 1.0],
    ['G3', 1.5, 1.0],
    ['C3', 3.0, 0.5],
    ['E3', 3.5, 0.5],
    ['G3', 4.0, 1.0],
    // 1st inversion: E G C climbing
    ['E3', 6.0, 0.5],
    ['G3', 6.5, 0.5],
    ['C4', 7.0, 0.5],
    ['E3', 7.5, 1.0],
    ['G3', 7.5, 1.0],
    ['C4', 7.5, 1.0],
    ['E3', 9.0, 0.5],
    ['G3', 9.5, 0.5],
    ['C4', 10.0, 1.0],
    // 2nd inversion: G C E higher up the neck
    ['G3', 12.0, 0.5],
    ['C4', 12.5, 0.5],
    ['E4', 13.0, 0.5],
    ['G3', 13.5, 1.0],
    ['C4', 13.5, 1.0],
    ['E4', 13.5, 1.0],
    ['G3', 15.0, 0.5],
    ['C4', 15.5, 0.5],
    ['E4', 16.0, 1.5],
  ],
  tutorial: {
    title: 'Triad Shapes & Inversions',
    summary:
      'A triad is just three notes, but you can stack them in three orders and climb the neck. The C major triad is C E G. Root position puts C on the bottom, first inversion starts on E (E G C), and second inversion starts on G (G C E). Each inversion is a new shape higher up the fretboard, letting you voice the same chord all over the neck.',
    level: 'Intermediate',
    objectives: [
      'Arpeggiate the C major triad in root position',
      'Play the first inversion (E G C)',
      'Play the second inversion (G C E)',
      'Climb the neck through all three voicings',
    ],
    sections: [
      {
        id: 'root',
        title: 'Root Position',
        start: 0,
        end: 6,
        focus: 'C on the bottom',
        learn: [
          'The C major triad is C E G, root C lowest.',
          'Notes sharing a start ring together as the full chord.',
        ],
        tryThis: ['Arpeggiate, then strum all three at once.'],
      },
      {
        id: 'first-inv',
        title: 'First Inversion',
        start: 6,
        end: 12,
        focus: 'E on the bottom (E G C)',
        learn: [
          'First inversion stacks the 3rd lowest: E G C.',
          'Same notes, new shape, higher on the neck.',
        ],
      },
      {
        id: 'second-inv',
        title: 'Second Inversion',
        start: 12,
        end: 17.5,
        focus: 'G on the bottom (G C E)',
        learn: [
          'Second inversion puts the 5th lowest: G C E.',
          'Three voicings let you play C major across the fretboard.',
        ],
        reinforce: ['Same chord, three positions up the neck.'],
      },
    ],
  },
}
