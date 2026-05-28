import type { PianoCourse } from '../../shared/course'

export const pianoBeginningsCourse: PianoCourse = {
  id: 'piano-beginnings',
  title: 'Piano Beginnings',
  subtitle: '14 lessons · From zero to your first songs',
  description:
    'Start here if you have never touched a piano. By the end you will recognize every key by name, play your first real songs, and understand why some notes feel "at home" while others lean and pull. Each lesson is a short musical exercise paired with a tutorial panel that explains what to listen for.',
  difficulty: 'beginner',
  estimatedMinutes: 90,
  tone: '#10b981',
  modules: [
    {
      id: 'a-meet-the-keyboard',
      title: 'Meet the Keyboard',
      description:
        'Before pitch or melody, the keyboard itself. Find any C, any F, and understand the repeating pattern that makes the rest of the piano knowable.',
      lessons: [
        {
          id: 'a1',
          songId: 'tutorial-keyboard-pattern',
          teaser:
            'Black keys come in groups of 2 and 3 — find any C using them',
        },
        {
          id: 'a2',
          songId: 'tutorial-octaves-and-names',
          teaser: 'Only seven letter names exist — and they repeat in octaves',
        },
      ],
    },
    {
      id: 'b-rhythm',
      title: 'Rhythm Before Pitch',
      description:
        'Time comes first. Lock the beat, feel the bar, then add notes on top.',
      lessons: [
        {
          id: 'b1',
          songId: 'tutorial-one-note-in-time',
          teaser: 'Quarter, half, and whole notes on a single key',
        },
        {
          id: 'b2',
          songId: 'tutorial-counting-four',
          teaser: 'Bars, downbeats, and the difference between 4/4 and 3/4',
        },
      ],
    },
    {
      id: 'c-c-position',
      title: 'Your First Hand Position',
      description:
        'Five fingers, five white keys. The "C position" is the most important hand shape you will ever learn — most beginner songs live entirely inside it.',
      lessons: [
        {
          id: 'c1',
          songId: 'tutorial-c-position',
          teaser: 'Thumb on middle C — five fingers, five keys',
        },
        {
          id: 'c2',
          songId: 'tutorial-first-melodies',
          teaser:
            'Hot Cross Buns and Mary Had a Little Lamb, all in C position',
        },
      ],
    },
    {
      id: 'd-finding-home',
      title: 'The Scale & Finding Home',
      description:
        'The white keys are not random — they form the C major scale. Where you "land" decides whether the music feels bright or pensive.',
      lessons: [
        {
          id: 'd1',
          songId: 'tutorial-diatonic-world',
          teaser: 'Climb all the white keys; meet the C major scale',
        },
        {
          id: 'd2',
          songId: 'tutorial-finding-home',
          teaser: 'Same notes, three different "homes" — C, G, and A',
        },
      ],
    },
    {
      id: 'e-intervals',
      title: 'Intervals',
      description:
        'The space between two notes carries musical meaning. Steps feel smooth; skips feel open. Recognizing intervals is the first step toward "hearing" what you play.',
      lessons: [
        {
          id: 'e1',
          songId: 'tutorial-steps-vs-skips',
          teaser: 'Steps (next key) vs skips (skip one) — the building blocks',
        },
        {
          id: 'e2',
          songId: 'tutorial-thirds-and-fifths',
          teaser: 'Stack two skips and you have a chord',
        },
      ],
    },
    {
      id: 'f-chords',
      title: 'First Chords',
      description:
        'Three notes stacked in thirds make a triad. Major triads sound bright; minor triads sound pensive. One note decides which.',
      lessons: [
        {
          id: 'f1',
          songId: 'tutorial-major-triad',
          teaser: 'Build C, F, and G major chords — and your first progression',
        },
        {
          id: 'f2',
          songId: 'tutorial-minor-triad',
          teaser: 'Lower the middle note: C major becomes C minor',
        },
      ],
    },
    {
      id: 'g-mixing',
      title: 'White + Black Together',
      description:
        "Black keys alone are forgiving. White keys alone are forgiving. The interesting moment is when you mix them — that's where every great melody lives.",
      lessons: [
        {
          id: 'g1',
          songId: 'tutorial-pentatonic-playground',
          teaser: 'Black keys alone — the pentatonic safety net',
        },
        {
          id: 'g2',
          songId: 'tutorial-power-of-d-sharp',
          teaser: "Für Elise's D♯ — why one note can redefine a whole key",
        },
      ],
    },
  ],
}
