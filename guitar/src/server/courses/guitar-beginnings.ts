import type { GuitarCourse } from '../../shared/course'

export const guitarBeginningsCourse: GuitarCourse = {
  id: 'guitar-beginnings',
  title: 'Guitar Beginnings',
  subtitle: '14 lessons · From open strings to your first riff',
  description:
    'Start here if you have never held a guitar. In fourteen short, hands-on lessons you will get to know the six strings and the frets, lock in a steady beat, play your first melodies, and build the major scale that anchors almost everything you will ever play. From there you will meet intervals, your first chords and power chords, and finish by playing a real riff. Every lesson pairs a quick musical exercise with a tutorial panel that explains exactly what to listen for.',
  difficulty: 'beginner',
  estimatedMinutes: 90,
  tone: '#10b981',
  modules: [
    {
      id: 'a-meet-the-guitar',
      title: 'Meet the Guitar',
      description:
        'Get oriented: the six strings, the frets, and how the neck is laid out.',
      lessons: [
        {
          id: 'a1',
          songId: 'tutorial-six-strings',
          teaser: 'Name all six open strings and hear how each one sounds',
        },
        {
          id: 'a2',
          songId: 'tutorial-frets-and-semitones',
          teaser: 'One fret = one semitone — the smallest step on the neck',
        },
      ],
    },
    {
      id: 'b-rhythm',
      title: 'Rhythm & Time',
      description:
        'Time comes before pitch. Feel the beat and the bar before adding notes.',
      lessons: [
        {
          id: 'b1',
          songId: 'tutorial-one-note-in-time',
          teaser: 'Play a single note in steady quarter, half, and whole notes',
        },
        {
          id: 'b2',
          songId: 'tutorial-counting-four',
          teaser: 'Count "1-2-3-4" and find the downbeat of every bar',
        },
      ],
    },
    {
      id: 'c-first-notes',
      title: 'First Notes',
      description:
        'Turn frets into notes and string your first short melodies together.',
      lessons: [
        {
          id: 'c1',
          songId: 'tutorial-low-string-notes',
          teaser: 'Find your first real notes on the low strings',
        },
        {
          id: 'c2',
          songId: 'tutorial-first-melodies',
          teaser: 'Play simple tunes you already know by ear',
        },
      ],
    },
    {
      id: 'd-the-major-scale',
      title: 'The Major Scale',
      description:
        'The major scale is the map under almost every song. Learn it and find "home".',
      lessons: [
        {
          id: 'd1',
          songId: 'tutorial-open-c-scale',
          teaser: 'Climb the open C major scale, one note at a time',
        },
        {
          id: 'd2',
          songId: 'tutorial-finding-home',
          teaser: 'Hear why the root note feels like coming home',
        },
      ],
    },
    {
      id: 'e-intervals',
      title: 'Intervals',
      description:
        'The distance between two notes gives music its shape and feeling.',
      lessons: [
        {
          id: 'e1',
          songId: 'tutorial-steps-vs-skips',
          teaser:
            'Smooth steps versus open skips — the building blocks of melody',
        },
        {
          id: 'e2',
          songId: 'tutorial-octaves-on-the-neck',
          teaser: 'Spot the same note an octave higher all over the neck',
        },
      ],
    },
    {
      id: 'f-first-chords',
      title: 'First Chords',
      description:
        'Stack notes together to play your first chords and power chords.',
      lessons: [
        {
          id: 'f1',
          songId: 'tutorial-first-chords',
          teaser: 'Shape and strum your very first open chords',
        },
        {
          id: 'f2',
          songId: 'tutorial-power-chords',
          teaser: 'Two fingers, huge sound — the rock power chord',
        },
      ],
    },
    {
      id: 'g-lead-basics',
      title: 'Lead Basics',
      description:
        'Step into lead playing with the pentatonic box and a first riff.',
      lessons: [
        {
          id: 'g1',
          songId: 'tutorial-pentatonic-box',
          teaser: 'The five-note box shape every solo starts from',
        },
        {
          id: 'g2',
          songId: 'tutorial-first-riff',
          teaser: 'Put it together and play a riff that actually rocks',
        },
      ],
    },
  ],
}
