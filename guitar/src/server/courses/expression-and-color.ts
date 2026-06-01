import type { GuitarCourse } from '../../shared/course'

export const expressionAndColorCourse: GuitarCourse = {
  id: 'expression-and-color',
  title: 'Expression & Color',
  subtitle: '8 lessons · Make every phrase intentional',
  description:
    'This is where playing becomes saying something. In eight lessons you will reach for the colors that make a line memorable: blue notes and chromatic approaches, borrowed chords, the restless tritone and its famous substitution, suspended chords, dense polychords, and the freedom of rubato. The goal is not just to hit the right notes but to choose them — so every phrase carries tension, release, and intent.',
  difficulty: 'advanced',
  estimatedMinutes: 60,
  tone: '#a855f7',
  modules: [
    {
      id: 'the-blues-palette',
      title: 'The Blues Palette',
      description:
        'Add grit and color with blue notes, borrowed chords, and chromatic moves.',
      lessons: [
        {
          id: 'x1',
          songId: 'tutorial-blue-notes',
          teaser: 'The bent, in-between notes that give the blues its ache',
        },
        {
          id: 'x2',
          songId: 'tutorial-modal-interchange',
          teaser: 'Borrow a chord from a parallel key for instant color',
        },
        {
          id: 'x3',
          songId: 'tutorial-chromatic-approach',
          teaser: 'Slide in from a half-step away to target any note',
        },
      ],
    },
    {
      id: 'tension-and-release',
      title: 'Tension & Release',
      description:
        'Build and resolve tension with the tritone, its substitution, and sus chords.',
      lessons: [
        {
          id: 'x4',
          songId: 'tutorial-tritone',
          teaser: 'The most restless interval — and why it begs to resolve',
        },
        {
          id: 'x5',
          songId: 'tutorial-tritone-substitution',
          teaser: 'Swap one dominant for another a tritone away',
        },
        {
          id: 'x6',
          songId: 'tutorial-sus-chords',
          teaser: 'Suspend the 3rd to hang a chord between bright and dark',
        },
      ],
    },
    {
      id: 'beyond-triads',
      title: 'Beyond Triads',
      description:
        'Stretch past three-note chords and free your phrasing from the grid.',
      lessons: [
        {
          id: 'x7',
          songId: 'tutorial-polychords',
          teaser: 'Stack two chords at once for rich, ambiguous color',
        },
        {
          id: 'x8',
          songId: 'tutorial-rubato',
          teaser: 'Bend time itself — phrasing freely instead of on the grid',
        },
      ],
    },
  ],
}
