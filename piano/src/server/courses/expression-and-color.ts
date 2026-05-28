import type { PianoCourse } from '../../shared/course'

export const expressionAndColorCourse: PianoCourse = {
  id: 'expression-and-color',
  title: 'Expression & Color',
  subtitle: '8 lessons · Make every phrase feel intentional',
  description:
    'The notes are no longer the hard part — making them sing is. Borrowed chords, blue notes, tritone substitutions, and rubato. By the end you will recognize the techniques behind the music you love and know how to use them yourself.',
  difficulty: 'advanced',
  estimatedMinutes: 60,
  tone: '#a855f7',
  modules: [
    {
      id: 'color-notes',
      title: 'Color Notes',
      description:
        'How "outside" notes — used carefully — make music more expressive, not worse.',
      lessons: [
        {
          id: 'x1',
          songId: 'tutorial-blue-notes',
          teaser: 'Tension that does not need to resolve',
        },
        {
          id: 'x2',
          songId: 'tutorial-modal-interchange',
          teaser: 'Borrow a note from the parallel minor for cinematic warmth',
        },
        {
          id: 'x3',
          songId: 'tutorial-chromatic-approach',
          teaser: 'Half-step leans into chord tones — the bebop building block',
        },
      ],
    },
    {
      id: 'the-tritone',
      title: 'The Tritone & Its Sub',
      description:
        'The most unstable interval in music — and the most useful one.',
      lessons: [
        {
          id: 'x4',
          songId: 'tutorial-tritone-devil',
          teaser: 'Six half-steps of pure unresolved tension',
        },
        {
          id: 'x5',
          songId: 'tutorial-tritone-substitution',
          teaser:
            'Swap one V7 for another — and get the jazz chromatic bass line',
        },
      ],
    },
    {
      id: 'voicings-feel',
      title: 'Voicings & Feel',
      description:
        'Suspended, stacked, and stretched — chord choices and timing as expression.',
      lessons: [
        {
          id: 'x6',
          songId: 'tutorial-sus-chords',
          teaser: 'Replace the 3rd with the 4th or 2nd — chords that float',
        },
        {
          id: 'x7',
          songId: 'tutorial-polychords',
          teaser: "Two triads stacked — Stravinsky's open-sky harmony",
        },
        {
          id: 'x8',
          songId: 'tutorial-rubato',
          teaser: 'Steal time, give it back — make every phrase breathe',
        },
      ],
    },
  ],
}
