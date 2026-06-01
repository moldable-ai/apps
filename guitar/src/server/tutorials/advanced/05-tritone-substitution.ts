import type { RawTutorial } from '../../tutorial-builder'

export const tritoneSubstitutionTutorial: RawTutorial = {
  id: 'tutorial-tritone-substitution',
  title: 'Tritone Substitution',
  bpm: 76,
  beatsPerBar: 4,
  phrase: [
    // Section 1: the standard V-I — G7 (G B D F) resolving to C major
    ['G2', 0.0, 1.2],
    ['B2', 0.0, 1.2],
    ['D3', 0.0, 1.2],
    ['F3', 0.0, 1.2],
    ['C3', 1.5, 1.4],
    ['E3', 1.5, 1.4],
    ['G3', 1.5, 1.4],
    ['C4', 1.5, 1.4],
    ['G2', 3.4, 0.5],
    ['B2', 3.9, 0.5],
    ['D3', 4.4, 0.5],
    ['F3', 4.9, 0.5],
    ['C3', 5.4, 1.0],
    ['E3', 5.4, 1.0],
    ['G3', 5.4, 1.0],
    // Section 2: the sub — Db7 (Db F Ab Cb), played as C# F G# B, sharing the same B/F tritone
    ['C#3', 7.0, 1.2],
    ['F3', 7.0, 1.2],
    ['G#3', 7.0, 1.2],
    ['B3', 7.0, 1.2],
    ['C3', 8.5, 1.4],
    ['E3', 8.5, 1.4],
    ['G3', 8.5, 1.4],
    ['C4', 8.5, 1.4],
    // Section 3: hear them side by side — both contain B and F, both resolve to C
    ['G2', 10.5, 0.7],
    ['B2', 10.5, 0.7],
    ['F3', 10.5, 0.7],
    ['C#3', 11.3, 0.7], // chromatic bass slide G -> C# region; sub voicing
    ['F3', 11.3, 0.7],
    ['G#3', 11.3, 0.7],
    ['B3', 11.3, 0.7],
    ['C3', 12.2, 1.6],
    ['E3', 12.2, 1.6],
    ['G3', 12.2, 1.6],
    ['C4', 12.2, 1.6],
    ['C3', 12.2, 1.6], // root C in the bass to seal the resolution
  ],
  tutorial: {
    title: 'Tritone Substitution',
    summary:
      'A tritone substitution swaps a dominant chord for the dominant a tritone away. G7 (G B D F) resolves to C. So does Db7 (Db F Ab Cb) — shown here with the fretboard enharmonic names C# F G# B — because it shares the very same tritone (B and F). The difference is the bass: instead of leaping down a fifth, the root slides chromatically down a half step into the tonic. It is the smoothest, jazziest way home.',
    level: 'Advanced',
    objectives: [
      'Build a standard G7 to C resolution',
      'Find the shared B/F tritone inside G7',
      'Spell Db7 (Db F Ab Cb), shown here as C# F G# B',
      'Hear the chromatic bass slide into C',
    ],
    sections: [
      {
        id: 'standard',
        title: 'The standard V-I',
        start: 0,
        end: 7.0,
        focus: 'G7 (G B D F) pulling to C',
        learn: [
          'G7 contains the tritone B and F, which wants to resolve to C and E',
          'The bass jumps down a fifth from G to C — the classic cadence',
        ],
      },
      {
        id: 'sub',
        title: 'The substitution',
        start: 7.0,
        end: 10.5,
        focus: 'Db7 (Db F Ab Cb), shown as C# F G# B, same B/F tritone',
        learn: [
          'C# F G# B is how this fretboard shows Db7 (Db F Ab Cb)',
          'It holds the identical B/F tritone, so it resolves to C just as strongly',
        ],
        tryThis: [
          'Play G7 then the C# F G# B voicing — notice B and F never move',
          'Both chords resolve to the same C major target',
        ],
      },
      {
        id: 'slide',
        title: 'The chromatic bass',
        start: 10.5,
        end: 13.9,
        focus: 'Root slides C# down a half step to C',
        learn: [
          'Instead of leaping a fifth, the bass glides chromatically into the tonic',
          'That smooth half-step descent is the signature of the tritone sub',
        ],
        reinforce: [
          'Two chords, one tritone, two ways home',
          'The shared tritone is what makes the substitution work',
        ],
      },
    ],
  },
}
