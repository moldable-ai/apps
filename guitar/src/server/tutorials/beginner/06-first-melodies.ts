import type { RawTutorial } from '../../tutorial-builder'

export const firstMelodiesTutorial: RawTutorial = {
  id: 'tutorial-first-melodies',
  title: 'First Melodies',
  beatsPerBar: 4,
  phrase: [
    // "Ode to Joy" main phrase, in the B3-D4 register
    // E E F G | G F E D | C C D E | E D D
    ['B3', 0.0, 1.0],
    ['B3', 1.0, 1.0],
    ['C4', 2.0, 1.0],
    ['D4', 3.0, 1.0],
    ['D4', 4.0, 1.0],
    ['C4', 5.0, 1.0],
    ['B3', 6.0, 1.0],
    ['A3', 7.0, 1.0],
    ['G3', 8.0, 1.0],
    ['G3', 9.0, 1.0],
    ['A3', 10.0, 1.0],
    ['B3', 11.0, 1.0],
    ['B3', 12.0, 1.5],
    ['A3', 13.5, 0.5],
    ['A3', 14.0, 2.0],
    // "Mary Had a Little Lamb" second tune, same register
    // E D C D | E E E | D D D | E G G
    ['B3', 16.0, 1.0],
    ['A3', 17.0, 1.0],
    ['G3', 18.0, 1.0],
    ['A3', 19.0, 1.0],
    ['B3', 20.0, 1.0],
    ['B3', 21.0, 1.0],
    ['B3', 22.0, 2.0],
    ['A3', 24.0, 1.0],
    ['A3', 25.0, 1.0],
    ['A3', 26.0, 2.0],
    ['B3', 28.0, 1.0],
    ['D4', 29.0, 1.0],
    ['D4', 30.0, 2.0],
  ],
  tutorial: {
    title: 'First Melodies',
    summary:
      'Time to play real tunes you already know by ear. First comes the main theme of Beethoven\'s "Ode to Joy", a mostly stepwise melody that is gentle on the fingers. Then a familiar nursery melody to reinforce reading single notes in time. Both sit in a comfortable middle register around the G, B, and high E strings. Sing along while you play — matching your voice to the notes trains your ear fast.',
    level: 'Beginner',
    objectives: [
      'Play two recognizable melodies one note at a time',
      'Keep a steady rhythm through a longer phrase',
      'Match what you hear in your head to the notes you play',
    ],
    sections: [
      {
        id: 'ode-to-joy',
        title: 'Ode to Joy',
        start: 0,
        end: 16,
        focus: 'a smooth, mostly stepwise melody',
        learn: [
          'Most of this melody moves by step — to the next note up or down.',
          'Listen for the gentle rise and fall of the phrase.',
        ],
        tryThis: ['Hum the tune first, then find it on the strings.'],
      },
      {
        id: 'second-tune',
        title: 'A second tune',
        start: 16,
        end: 32,
        focus: 'reinforcing single-note playing in time',
        learn: [
          'This nursery melody repeats short patterns — spot the repeats.',
          'Keep counting so the longer held notes get their full value.',
        ],
        reinforce: ['Loop each tune until it flows without stopping.'],
      },
    ],
  },
}
