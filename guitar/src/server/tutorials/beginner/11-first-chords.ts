import type { RawTutorial } from '../../tutorial-builder'

export const firstChordsTutorial: RawTutorial = {
  id: 'tutorial-first-chords',
  title: 'Your First Chords',
  beatsPerBar: 4,
  phrase: [
    // Em arpeggio: E2 B2 E3 G3 B3 E4 one at a time
    ['E2', 0.0, 1.0],
    ['B2', 1.0, 1.0],
    ['E3', 2.0, 1.0],
    ['G3', 3.0, 1.0],
    ['B3', 4.0, 1.0],
    ['E4', 5.0, 2.0],
    // G arpeggio: G2 B2 D3 G3 B3 G4 one at a time
    ['G2', 7.0, 1.0],
    ['B2', 8.0, 1.0],
    ['D3', 9.0, 1.0],
    ['G3', 10.0, 1.0],
    ['B3', 11.0, 1.0],
    ['G4', 12.0, 2.0],
    // Strum Em as a block chord (shared start)
    ['E2', 14.0, 2.0],
    ['B2', 14.0, 2.0],
    ['E3', 14.0, 2.0],
    ['G3', 14.0, 2.0],
    ['B3', 14.0, 2.0],
    ['E4', 14.0, 2.0],
    // Strum G as a block chord (shared start)
    ['G2', 16.0, 2.0],
    ['B2', 16.0, 2.0],
    ['D3', 16.0, 2.0],
    ['G3', 16.0, 2.0],
    ['B3', 16.0, 2.0],
    ['G4', 16.0, 2.0],
  ],
  tutorial: {
    title: 'Your First Chords',
    summary:
      'A chord is several notes ringing together. Here are two of the most-used beginner chords: E minor (Em) and G major. First you play each one as an arpeggio — the notes one at a time, low to high — so your ear hears every voice. Then you strum each chord as a block, with all the notes sounding at once. Hold the shape down and let everything ring. Em sounds dark and moody; G sounds bright and open.',
    level: 'Beginner',
    objectives: [
      'Play the Em and G chord shapes as arpeggios',
      'Strum each chord so all notes ring together',
      'Hear the difference between a minor and a major chord',
    ],
    sections: [
      {
        id: 'em-arpeggio',
        title: 'Em arpeggio',
        start: 0,
        end: 7,
        focus: 'the Em notes one at a time',
        learn: [
          'Em is built from E, B, E, G, B, E across the six strings.',
          'Playing the notes one at a time is called an arpeggio.',
          'Let each note keep ringing into the next.',
        ],
        tryThis: ['Hold the whole shape down while you pick each string.'],
      },
      {
        id: 'g-arpeggio',
        title: 'G arpeggio',
        start: 7,
        end: 14,
        focus: 'the G major notes one at a time',
        learn: [
          'G major uses G, B, D, G, B, G — a bright, open sound.',
          'Compare its mood to the darker Em you just played.',
        ],
      },
      {
        id: 'strum-them',
        title: 'Strum them',
        start: 14,
        end: 18,
        focus: 'all notes at once as a block chord',
        learn: [
          'Notes that share a start time ring together as a strummed chord.',
          'A single brush across the strings sounds them all at once.',
        ],
        reinforce: ['Strum slowly so every string speaks clearly.'],
      },
    ],
  },
}
