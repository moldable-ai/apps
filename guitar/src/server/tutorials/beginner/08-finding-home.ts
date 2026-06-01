import type { RawTutorial } from '../../tutorial-builder'

export const findingHomeTutorial: RawTutorial = {
  id: 'tutorial-finding-home',
  title: 'E is Home',
  beatsPerBar: 4,
  phrase: [
    // Phrase 1: wander up and resolve to E
    ['E3', 0.0, 1.0],
    ['F#3', 1.0, 1.0],
    ['G3', 2.0, 1.0],
    ['E3', 3.0, 1.0],
    ['G3', 4.0, 1.0],
    ['A3', 5.0, 1.0],
    ['B3', 6.0, 1.0],
    ['E3', 7.0, 2.0],
    // Phrase 2: descend from above and resolve back to low E
    ['B3', 9.0, 1.0],
    ['A3', 10.0, 1.0],
    ['G3', 11.0, 1.0],
    ['F#3', 12.0, 1.0],
    ['E3', 13.0, 1.0],
    ['D3', 14.0, 1.0],
    ['E3', 15.0, 1.0],
    ['E2', 16.0, 2.0],
  ],
  tutorial: {
    title: 'E is Home',
    summary:
      'Every key has a note that feels like home — the tonic. In E minor that note is E. These short phrases wander through E minor tones such as E, F#, G, A, B, and D, but always pull back to an E. Listen to how the music feels unsettled until it lands on E, then relaxes. By ending on the low open E (E2), the second phrase makes the sense of arrival unmistakable.',
    level: 'Beginner',
    objectives: [
      'Understand the tonic as the "home" note of a key',
      'Hear tension build and then resolve onto E',
      'Recognize E as home in the key of E minor',
    ],
    sections: [
      {
        id: 'reaching-up',
        title: 'Reaching up to home',
        start: 0,
        end: 9,
        focus: 'phrases that climb and settle back on E',
        learn: [
          'The tonic is the note a key is built around — here, E.',
          'Notes that are not the tonic create gentle tension.',
          'Landing on E releases that tension — that is resolution.',
        ],
        tryThis: ['Pause on each E and notice how settled it feels.'],
      },
      {
        id: 'falling-home',
        title: 'Falling home',
        start: 9,
        end: 18,
        focus: 'descending into the low open E',
        learn: [
          'Ending on the low open E (E2) gives the strongest sense of home.',
          'The same note name an octave lower still feels like the tonic.',
        ],
        reinforce: [
          'Try stopping one note short of E — feel how unfinished it sounds.',
        ],
      },
    ],
  },
}
