import type { RawTutorial } from '../../tutorial-builder'

export const firstRiffTutorial: RawTutorial = {
  id: 'tutorial-first-riff',
  title: 'Your First Riff',
  beatsPerBar: 4,
  phrase: [
    // Bar 1: E pedal with pentatonic moves
    ['E2', 0.0, 0.5, 0.9],
    ['E2', 0.5, 0.5],
    ['G2', 1.0, 0.5],
    ['A2', 1.5, 0.5],
    ['E2', 2.0, 0.5, 0.9],
    ['E2', 2.5, 0.5],
    ['B2', 3.0, 0.5],
    ['A2', 3.5, 0.5],
    // Bar 2: answer phrase up to D3
    ['E2', 4.0, 0.5, 0.9],
    ['G2', 4.5, 0.5],
    ['A2', 5.0, 0.5],
    ['B2', 5.5, 0.5],
    ['D3', 6.0, 1.0],
    ['B2', 7.0, 0.5],
    ['A2', 7.5, 0.5],
    // Bar 3: repeat the hook
    ['E2', 8.0, 0.5, 0.9],
    ['E2', 8.5, 0.5],
    ['G2', 9.0, 0.5],
    ['A2', 9.5, 0.5],
    ['E2', 10.0, 0.5, 0.9],
    ['E2', 10.5, 0.5],
    ['B2', 11.0, 0.5],
    ['A2', 11.5, 0.5],
    // Bar 4: turnaround landing on E
    ['G2', 12.0, 0.5],
    ['A2', 12.5, 0.5],
    ['B2', 13.0, 0.5],
    ['D3', 13.5, 0.5],
    ['A2', 14.0, 0.5],
    ['G2', 14.5, 0.5],
    ['E2', 15.0, 1.0, 0.95],
  ],
  tutorial: {
    title: 'Your First Riff',
    summary:
      'Time to put it all together in an original rock riff. It lives in E minor pentatonic (E, G, A, B, D) on the low strings, anchored by a repeating low-E pulse. The riff has a hook in bars 1 and 3 and an answering phrase in bars 2 and 4 that climbs up to D before settling home on E. Keep the eighth notes even and dig into the accented low E. Loop it once it feels solid — this is how real riffs are born.',
    level: 'Beginner',
    objectives: [
      'Play a complete four-bar riff from memory',
      'Use the E minor pentatonic notes in a musical phrase',
      'Keep a steady eighth-note pulse with accents',
    ],
    sections: [
      {
        id: 'the-hook',
        title: 'The hook',
        start: 0,
        end: 8,
        focus: 'the repeating low-E groove and its answer',
        learn: [
          'The riff is built entirely from E minor pentatonic notes.',
          'The low E acts as a pedal — a repeating anchor note.',
          'Bar 2 answers the bar-1 hook by climbing to D3.',
        ],
        tryThis: ['Count "1 and 2 and" to keep the eighth notes even.'],
      },
      {
        id: 'repeat-and-turnaround',
        title: 'Repeat & turnaround',
        start: 8,
        end: 16,
        focus: 'restating the hook and resolving home',
        learn: [
          'Bar 3 repeats the hook so the listener latches on.',
          'Bar 4 is a turnaround that lands firmly back on E.',
        ],
        reinforce: [
          'Loop the whole riff once it flows — repetition makes it stick.',
        ],
      },
    ],
  },
}
