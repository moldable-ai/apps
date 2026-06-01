import type { RawTutorial } from '../../tutorial-builder'

export const seventhChordsTutorial: RawTutorial = {
  id: 'tutorial-seventh-chords',
  title: '7th Chords — Adding Color',
  bpm: 60,
  beatsPerBar: 4,
  phrase: [
    // Cmaj7: C E G B
    ['C3', 0.0, 0.5],
    ['E3', 0.5, 0.5],
    ['G3', 1.0, 0.5],
    ['B3', 1.5, 0.5],
    ['C3', 2.0, 1.5],
    ['E3', 2.0, 1.5],
    ['G3', 2.0, 1.5],
    ['B3', 2.0, 1.5],
    // C7: C E G A#
    ['C3', 5.0, 0.5],
    ['E3', 5.5, 0.5],
    ['G3', 6.0, 0.5],
    ['A#3', 6.5, 0.5],
    ['C3', 7.0, 1.5],
    ['E3', 7.0, 1.5],
    ['G3', 7.0, 1.5],
    ['A#3', 7.0, 1.5],
    // Cm7: C D# G A#
    ['C3', 10.0, 0.5],
    ['D#3', 10.5, 0.5],
    ['G3', 11.0, 0.5],
    ['A#3', 11.5, 0.5],
    ['C3', 12.0, 1.5],
    ['D#3', 12.0, 1.5],
    ['G3', 12.0, 1.5],
    ['A#3', 12.0, 1.5],
    // Cdim7: C D# F# A
    ['C3', 15.0, 0.5],
    ['D#3', 15.5, 0.5],
    ['F#3', 16.0, 0.5],
    ['A3', 16.5, 0.5],
    ['C3', 17.0, 1.5],
    ['D#3', 17.0, 1.5],
    ['F#3', 17.0, 1.5],
    ['A3', 17.0, 1.5],
  ],
  tutorial: {
    title: '7th Chords — Adding Color',
    summary:
      'Add a fourth note on top of a triad and the chord gains color. Built on C you get Cmaj7 (C E G B, dreamy), C7 (C E G Bb, bluesy and restless), Cm7 (C Eb G Bb, smooth and sad), and Cdim7 (C Eb Gb Bbb, tense and unstable). Arpeggiate each, then let all four notes ring so you can hear how the top note changes the whole flavor. (This sharp-only fretboard shows those flats as Bb=A#, Eb=D#, Gb=F#, Bbb=A.)',
    level: 'Intermediate',
    objectives: [
      'Arpeggiate Cmaj7 and hear its dreamy color',
      'Play C7 with the flat-7 (Bb)',
      'Play Cm7 with the minor 3rd (Eb)',
      'Play Cdim7 and hear its tension',
    ],
    sections: [
      {
        id: 'maj7-dom7',
        title: 'Cmaj7 and C7',
        start: 0,
        end: 10,
        focus: 'Major 7th vs dominant 7th',
        learn: [
          'Cmaj7 is C E G B; the B (major 7th) sounds lush.',
          'C7 lowers that to Bb, giving a bluesy dominant pull.',
        ],
        tryThis: ['Hold each full chord and compare the top note.'],
      },
      {
        id: 'm7',
        title: 'Cm7',
        start: 10,
        end: 15,
        focus: 'Minor 3rd plus flat-7',
        learn: [
          'Cm7 is C Eb G Bb; the Eb is the minor 3rd.',
          'It blends a minor triad with a smooth flat-7.',
        ],
      },
      {
        id: 'dim7',
        title: 'Cdim7',
        start: 15,
        end: 18.5,
        focus: 'Stacked minor thirds, all tension',
        learn: [
          'Cdim7 is C Eb Gb Bbb, three minor thirds piled up.',
          'It sounds unstable and wants to resolve somewhere.',
        ],
        reinforce: ['The added 4th note is what colors each chord.'],
      },
    ],
  },
}
