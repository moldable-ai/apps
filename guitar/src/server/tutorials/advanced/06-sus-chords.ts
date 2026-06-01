import type { RawTutorial } from '../../tutorial-builder'

export const susChordsTutorial: RawTutorial = {
  id: 'tutorial-sus-chords',
  title: 'Sus Chords',
  bpm: 80,
  beatsPerBar: 4,
  phrase: [
    // Section 1: Dsus4 (D G A) arpeggio then block, resolving 4->3 to D major (D F# A)
    ['D3', 0.0, 0.5],
    ['G3', 0.5, 0.5],
    ['A3', 1.0, 0.5],
    ['D3', 1.6, 1.0],
    ['G3', 1.6, 1.0],
    ['A3', 1.6, 1.0],
    ['G3', 2.7, 0.5], // the suspended 4th
    ['F#3', 3.2, 0.8], // resolves down to the 3rd
    ['D3', 4.1, 1.0],
    ['F#3', 4.1, 1.0],
    ['A3', 4.1, 1.0],
    // Section 2: Dsus2 (D E A) arpeggio then block, resolving 2->3 to D major
    ['D3', 5.7, 0.5],
    ['E3', 6.2, 0.5],
    ['A3', 6.7, 0.5],
    ['D3', 7.3, 1.0],
    ['E3', 7.3, 1.0],
    ['A3', 7.3, 1.0],
    ['E3', 8.4, 0.5], // the suspended 2nd
    ['F#3', 8.9, 0.8], // resolves up to the 3rd
    ['D3', 9.8, 1.0],
    ['F#3', 9.8, 1.0],
    ['A3', 9.8, 1.0],
    // Section 3: the full gesture — sus4, sus2, then settle on D major
    ['D3', 11.4, 0.8],
    ['G3', 11.4, 0.8],
    ['A3', 11.4, 0.8],
    ['D3', 12.3, 0.8],
    ['E3', 12.3, 0.8],
    ['A3', 12.3, 0.8],
    ['G3', 13.2, 0.4], // 4
    ['E3', 13.6, 0.4], // 2
    ['F#3', 14.0, 0.6], // 3 — the resolution
    ['D3', 14.7, 1.6],
    ['F#3', 14.7, 1.6],
    ['A3', 14.7, 1.6],
    ['D4', 14.7, 1.6],
  ],
  tutorial: {
    title: 'Sus Chords',
    summary:
      'A suspended chord replaces the 3rd with a neighbor: sus4 uses the 4th (Dsus4 = D G A) and sus2 uses the 2nd (Dsus2 = D E A). With no 3rd, the chord is neither major nor minor — it floats, unresolved, wanting to move. The 4th leans down and the 2nd leans up, both arriving at F# to complete a bright D major triad (D F# A).',
    level: 'Advanced',
    objectives: [
      'Voice Dsus4 (D G A) and Dsus2 (D E A)',
      'Hear how a missing 3rd creates suspense',
      'Resolve the 4th down to the 3rd',
      'Resolve the 2nd up to the 3rd',
    ],
    sections: [
      {
        id: 'sus4',
        title: 'Dsus4 and its pull',
        start: 0,
        end: 5.7,
        focus: 'D G A — the 4th replaces the 3rd',
        learn: [
          'The G (4th) sits where the F# (3rd) normally lives',
          'It sounds open and unfinished until the G falls to F#',
        ],
      },
      {
        id: 'sus2',
        title: 'Dsus2 and its pull',
        start: 5.7,
        end: 11.4,
        focus: 'D E A — the 2nd replaces the 3rd',
        learn: [
          'The E (2nd) gives a brighter, more spacious suspension',
          'Here the E rises up to F# to resolve into D major',
        ],
        tryThis: [
          'Hold Dsus2, then add F# and remove E to feel the resolution',
          'Common on guitar: lift and add a finger on the high strings',
        ],
      },
      {
        id: 'resolve',
        title: 'Floating to ground',
        start: 11.4,
        end: 16.3,
        focus: 'sus4 and sus2 both melting into D major',
        learn: [
          'The 4th descends and the 2nd ascends — both arrive at F#',
          'Adding the 3rd is what finally makes the chord feel settled',
        ],
        reinforce: [
          'Suspension is tension; the 3rd is the release',
          'No third means no mood — the resolution decides major',
        ],
      },
    ],
  },
}
