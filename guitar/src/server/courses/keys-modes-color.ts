import type { GuitarCourse } from '../../shared/course'

export const keysModesColorCourse: GuitarCourse = {
  id: 'keys-modes-color',
  title: 'Keys, Modes & Color',
  subtitle: '10 lessons · Build fretboard vocabulary',
  description:
    'You can play a scale and a few chords — now learn what ties them together. Across ten lessons you will turn the major scale into a movable shape, play the same melody in different keys and positions, and hear how major and minor split the mood. Then you will explore modes like Dorian and Mixolydian, map the circle of fifths, and add triad shapes and seventh chords so you can move confidently anywhere on the neck.',
  difficulty: 'intermediate',
  estimatedMinutes: 75,
  tone: '#3b82f6',
  modules: [
    {
      id: 'scales-and-keys',
      title: 'Scales & Keys',
      description:
        'Make the major scale movable and learn to play it in any key, anywhere on the neck.',
      lessons: [
        {
          id: 'i1',
          songId: 'tutorial-major-scale-shape',
          teaser:
            'One movable shape that gives you the major scale in every key',
        },
        {
          id: 'i2',
          songId: 'tutorial-two-keys-two-shapes',
          teaser: 'Slide the same shape to play in two different keys',
        },
        {
          id: 'i3',
          songId: 'tutorial-up-the-neck',
          teaser: 'Connect positions and keep going up the neck',
        },
        {
          id: 'i4',
          songId: 'tutorial-major-vs-minor',
          teaser: 'One note flips a scale from bright major to moody minor',
        },
      ],
    },
    {
      id: 'modes-and-the-circle',
      title: 'Modes & the Circle',
      description:
        'Same notes, different home — explore modal color and how the keys all connect.',
      lessons: [
        {
          id: 'i5',
          songId: 'tutorial-mode-dorian',
          teaser: 'Minor with a brighter 6th — the Dorian sound',
        },
        {
          id: 'i6',
          songId: 'tutorial-mode-mixolydian',
          teaser: 'Major with a flat 7th — the bluesy Mixolydian color',
        },
        {
          id: 'i7',
          songId: 'tutorial-circle-of-fifths',
          teaser: 'A 5th up adds a sharp — every key, mapped in a circle',
        },
      ],
    },
    {
      id: 'chords-in-motion',
      title: 'Chords in Motion',
      description:
        'Move chords smoothly with triad shapes, seventh colors, and linked positions.',
      lessons: [
        {
          id: 'i8',
          songId: 'tutorial-triad-shapes',
          teaser: 'Compact three-note chord shapes you can move anywhere',
        },
        {
          id: 'i9',
          songId: 'tutorial-seventh-chords',
          teaser: 'Add a 7th for dreamy, dominant, or jazzy color',
        },
        {
          id: 'i10',
          songId: 'tutorial-connecting-positions',
          teaser: 'Link chord positions so changes flow up and down the neck',
        },
      ],
    },
  ],
}
