import type { PianoCourse } from '../../shared/course'

export const keysModesColorCourse: PianoCourse = {
  id: 'keys-modes-color',
  title: 'Keys, Modes & Color',
  subtitle: '10 lessons · Build harmonic vocabulary',
  description:
    'You know your scales and triads. Now learn what makes a key, how modes color the same notes differently, and how to add 7ths and inversions to make chords sing instead of clunk. By the end you will understand the circle of fifths and play music that breathes.',
  difficulty: 'intermediate',
  estimatedMinutes: 75,
  tone: '#3b82f6',
  modules: [
    {
      id: 'scales-keys',
      title: 'Scales & Keys',
      description:
        'Every major scale is built from the same recipe. Once you learn it, you can play in any key.',
      lessons: [
        {
          id: 'i1',
          songId: 'tutorial-major-scale-recipe',
          teaser: 'W-W-H-W-W-W-H — the formula behind every major scale',
        },
        {
          id: 'i2',
          songId: 'tutorial-c-vs-g-major',
          teaser: 'Two keys, six shared notes, one F♯ of difference',
        },
        {
          id: 'i3',
          songId: 'tutorial-black-keys-take-over',
          teaser: 'E major: when four sharps make the white keys outsiders',
        },
      ],
    },
    {
      id: 'major-minor-modes',
      title: 'Modes & Color',
      description:
        'Same notes, different "home" — every mode of the major scale has its own emotional flavor.',
      lessons: [
        {
          id: 'i4',
          songId: 'tutorial-major-vs-minor',
          teaser: 'One note flips the entire mood',
        },
        {
          id: 'i5',
          songId: 'tutorial-mode-dorian',
          teaser: 'White keys from D — minor with a brighter 6th',
        },
        {
          id: 'i6',
          songId: 'tutorial-mode-mixolydian',
          teaser: 'White keys from G — major with a flat 7th, the bluesy color',
        },
      ],
    },
    {
      id: 'circle-and-voicing',
      title: 'The Circle of Fifths & Voicing',
      description:
        'How keys relate, and how to make chords flow smoothly into each other.',
      lessons: [
        {
          id: 'i7',
          songId: 'tutorial-circle-of-fifths',
          teaser: 'A 5th up = one more sharp. Every key, mapped.',
        },
        {
          id: 'i8',
          songId: 'tutorial-triad-inversions',
          teaser: 'Same chord, three voicings — and smoother transitions',
        },
        {
          id: 'i9',
          songId: 'tutorial-seventh-chords',
          teaser: 'Add a 7th: dreamy, dominant, or jazzy',
        },
        {
          id: 'i10',
          songId: 'tutorial-voice-leading',
          teaser:
            'Move each note as little as possible — the secret of good harmony',
        },
      ],
    },
  ],
}
