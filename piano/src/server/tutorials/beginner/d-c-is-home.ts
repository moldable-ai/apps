import type { RawTutorial } from '../../tutorial-builder'

export const cIsHomeTutorial: RawTutorial = {
  id: 'tutorial-finding-home',
  title: 'C is Home',
  bpm: 72,
  beatsPerBar: 4,
  phrase: [
    // 0–6s: Phrase that lands clearly on C
    ['C4', 0.0, 0.55],
    ['E4', 0.625, 0.55],
    ['G4', 1.25, 0.55],
    ['E4', 1.875, 0.55],
    ['F4', 2.5, 0.55],
    ['E4', 3.125, 0.55],
    ['D4', 3.75, 0.55],
    ['C4', 4.375, 1.4],
    // 8–14s: Same notes but stopping on D — feels unfinished
    ['C4', 8.0, 0.55],
    ['E4', 8.625, 0.55],
    ['G4', 9.25, 0.55],
    ['E4', 9.875, 0.55],
    ['F4', 10.5, 0.55],
    ['E4', 11.125, 0.55],
    ['D4', 11.75, 1.6, 0.85],
    // 16–22s: Same notes but landing on G — feels different
    ['G4', 16.0, 0.55],
    ['F4', 16.625, 0.55],
    ['E4', 17.25, 0.55],
    ['D4', 17.875, 0.55],
    ['G4', 18.5, 0.55],
    ['A4', 19.125, 0.55],
    ['G4', 19.75, 1.4],
    // 24–30s: Land on A — now feels like A minor
    ['A3', 24.0, 0.55],
    ['C4', 24.625, 0.55],
    ['E4', 25.25, 0.55],
    ['G4', 25.875, 0.55],
    ['F4', 26.5, 0.55],
    ['E4', 27.125, 0.55],
    ['D4', 27.75, 0.55],
    ['A3', 28.375, 1.6],
  ],
  tutorial: {
    title: 'C is Home',
    summary:
      '"Home" is the note your ear keeps wanting to return to. The same seven white keys can have C, G, or A as home — each gives a totally different feeling. Resolution is a feeling, not a rule.',
    level: 'Beginner',
    objectives: [
      'Hear how repeated landings on a note define the "home"',
      'Recognize the bright "major" feel when C is home',
      'Recognize the mellow "minor" feel when A is home',
    ],
    sections: [
      {
        id: 'land-on-c',
        title: 'C is home — bright',
        start: 0,
        end: 8,
        focus: 'The phrase cadences onto C',
        learn: [
          'Repetition + final landing = tonic',
          'C feels resolved because the music keeps choosing it',
        ],
        tryThis: [
          'Hum or sing along on the final C — feel the closure',
          'Try playing the same phrase but stop right before the last C — uncomfortable, right?',
        ],
      },
      {
        id: 'unfinished',
        title: 'Stop on D — feel unfinished',
        start: 8,
        end: 16,
        focus: 'Same opening, but the phrase ends on D instead of C',
        learn: [
          'D is one step away from C — close, but not "there"',
          'Your ear wants to push D up to E or down to C',
        ],
        breakIt: [
          'Stop the playback right after the long D',
          'Notice how badly your ear wants the music to keep going',
        ],
      },
      {
        id: 'land-on-g',
        title: 'G is home — modal twist',
        start: 16,
        end: 24,
        focus: 'Same white-key collection, G keeps winning',
        learn: [
          'G as home turns this into G Mixolydian — major-ish but with a flat 7',
          'Nothing else changed — only what we land on',
        ],
      },
      {
        id: 'land-on-a',
        title: 'A is home — natural minor',
        start: 24,
        end: 30,
        focus: 'A pulls everything toward itself',
        learn: [
          'A natural minor uses the exact same notes as C major',
          'The minor "feel" comes from where you rest, not the notes you use',
        ],
        reinforce: [
          'Play a long final A and feel the gravity',
          'Same seven white keys, three different worlds',
        ],
      },
    ],
  },
}
