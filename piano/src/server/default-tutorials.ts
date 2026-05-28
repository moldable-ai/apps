import type { PianoNote, PianoSong } from '../shared/song'

/**
 * Short, single-hand piano exercises that pair a tiny musical phrase
 * with a tutorial panel teaching one concept about how notes interact.
 *
 * Each tutorial uses 60 BPM (1 beat = 1 second) so cursor-to-section
 * timing is easy to author and follow.
 */

const NOTE_TO_MIDI: Record<string, number> = {
  C3: 48,
  'C#3': 49,
  D3: 50,
  'D#3': 51,
  E3: 52,
  F3: 53,
  'F#3': 54,
  G3: 55,
  'G#3': 56,
  A3: 57,
  'A#3': 58,
  B3: 59,
  C4: 60,
  'C#4': 61,
  D4: 62,
  'D#4': 63,
  E4: 64,
  F4: 65,
  'F#4': 66,
  G4: 67,
  'G#4': 68,
  A4: 69,
  'A#4': 70,
  B4: 71,
  C5: 72,
  'C#5': 73,
  D5: 74,
  'D#5': 75,
  E5: 76,
  F5: 77,
  'F#5': 78,
  G5: 79,
  'G#5': 80,
  A5: 81,
  'A#5': 82,
  B5: 83,
  C6: 84,
}

type Phrase = Array<
  [pitch: string, start: number, duration: number, velocity?: number]
>

function buildNotes(phrase: Phrase): PianoNote[] {
  return phrase.map(([pitch, start, duration, velocity], index) => {
    const midi = NOTE_TO_MIDI[pitch]
    if (midi === undefined)
      throw new Error(`Unknown pitch in tutorial: ${pitch}`)
    return {
      id: `n-${String(index + 1).padStart(3, '0')}`,
      pitch,
      midi,
      start: Number(start.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      velocity: velocity ?? 0.7,
    }
  })
}

interface RawTutorial {
  id: string
  title: string
  bpm: number
  beatsPerBar: number
  beatUnit?: number
  phrase: Phrase
  tutorial: NonNullable<PianoSong['tutorial']>
}

const RAW_TUTORIALS: RawTutorial[] = [
  // ═════════════════════════════════════════════════════════════════════
  // BEGINNER
  // ═════════════════════════════════════════════════════════════════════

  // 1. The Diatonic World — all white keys, two homes
  {
    id: 'tutorial-diatonic-world',
    title: 'The Diatonic World',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: C major scale up — feel C as "home"
      ['C4', 0.0, 0.45],
      ['D4', 0.5, 0.45],
      ['E4', 1.0, 0.45],
      ['F4', 1.5, 0.45],
      ['G4', 2.0, 0.45],
      ['A4', 2.5, 0.45],
      ['B4', 3.0, 0.45],
      ['C5', 3.5, 0.9],
      // 5–9s: Same seven white keys, but landing on A makes A minor
      ['A3', 5.0, 0.45],
      ['B3', 5.5, 0.45],
      ['C4', 6.0, 0.45],
      ['D4', 6.5, 0.45],
      ['E4', 7.0, 0.45],
      ['F4', 7.5, 0.45],
      ['G4', 8.0, 0.45],
      ['A4', 8.5, 0.9],
      // 10–14s: White-key noodle — your ear accepts almost anything
      ['G4', 10.0, 0.4],
      ['E4', 10.4, 0.4],
      ['C4', 10.8, 0.4],
      ['F4', 11.2, 0.4],
      ['A4', 11.6, 0.4],
      ['D4', 12.0, 0.4],
      ['G4', 12.4, 0.4],
      ['C5', 12.8, 1.0],
    ],
    tutorial: {
      title: 'The Diatonic World',
      summary:
        'The seven white keys form one coherent collection. The note you "land on" decides which key feels like home — same notes, very different feelings.',
      level: 'Beginner',
      objectives: [
        'Hear how all seven white keys belong to one family',
        'Feel the difference between C as home (major) and A as home (minor)',
        'Notice that random white-key sequences still sound okay',
      ],
      sections: [
        {
          id: 'c-major',
          title: 'C major — C is home',
          start: 0,
          end: 5,
          focus: 'Climbing C → D → E → F → G → A → B → C',
          learn: [
            'Every white key belongs to the C major scale',
            'Landing on C feels resolved, complete, "home"',
          ],
          tryThis: [
            'Play along on the white keys around middle C',
            'Always end on C — notice how settled it feels',
          ],
        },
        {
          id: 'a-minor',
          title: 'A minor — same notes, sadder home',
          start: 5,
          end: 10,
          focus: 'Same seven white keys, but landing on A',
          learn: [
            'Nothing changed except where we land',
            'A as the tonic makes the same notes feel pensive instead of bright',
          ],
          tryThis: [
            'Improvise on white keys but always end on A',
            'Switch home to E or D — each gives a different mood',
          ],
        },
        {
          id: 'safe-noodle',
          title: 'Improvise freely',
          start: 10,
          end: 15,
          focus: 'Random white-key melody still feels coherent',
          learn: [
            'No white note is "outside" — they all share the same collection',
            'This is why white-key improv is the easiest starting point',
          ],
          reinforce: [
            'Try a fast random run of white keys — nothing clashes',
            'Add octave jumps — still consonant',
          ],
        },
      ],
    },
  },

  // 2. The Pentatonic Playground — all black keys
  {
    id: 'tutorial-pentatonic-playground',
    title: 'The Pentatonic Playground',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–3s: Climb all five black keys
      ['C#4', 0.0, 0.4],
      ['D#4', 0.4, 0.4],
      ['F#4', 0.8, 0.4],
      ['G#4', 1.2, 0.4],
      ['A#4', 1.6, 0.4],
      ['C#5', 2.0, 0.9],
      // 4–8s: Random pentatonic noodling — everything sounds okay
      ['F#4', 4.0, 0.4],
      ['A#4', 4.4, 0.4],
      ['D#5', 4.8, 0.4],
      ['G#4', 5.2, 0.4],
      ['C#5', 5.6, 0.4],
      ['F#4', 6.0, 0.4],
      ['A#4', 6.4, 0.4],
      ['D#4', 6.8, 0.4],
      ['C#5', 7.2, 0.9],
      // 9–13s: Compare — adding one white key (F) breaks the safety
      ['F#4', 9.0, 0.4],
      ['G#4', 9.4, 0.4],
      ['A#4', 9.8, 0.4],
      ['F4', 10.2, 0.6, 0.85], // <- the "outsider" white key
      ['A#4', 10.8, 0.4],
      ['G#4', 11.2, 0.4],
      ['F#4', 11.6, 1.0],
    ],
    tutorial: {
      title: 'The Pentatonic Playground',
      summary:
        'The five black keys form a pentatonic scale — five notes with no adjacent half-steps. Pentatonic scales are extraordinarily forgiving: almost any order sounds intentional.',
      level: 'Beginner',
      objectives: [
        'Hear why the black keys alone almost always sound good together',
        'Understand that pentatonic scales avoid the half-step clashes that cause tension',
        'Spot what happens the moment you mix in a "wrong" white key',
      ],
      sections: [
        {
          id: 'the-five',
          title: 'The five black notes',
          start: 0,
          end: 4,
          focus:
            'C♯ D♯ F♯ G♯ A♯ — the major pentatonic transposed to black keys',
          learn: [
            'No two of these notes are a half-step apart',
            'Half-step clashes (E–F, B–C) are what create real tension',
          ],
        },
        {
          id: 'no-wrong-notes',
          title: 'No wrong notes',
          start: 4,
          end: 9,
          focus: 'Random black-key order still sounds intentional',
          learn: [
            'Pentatonic = the safety net of improvisation',
            "You can't really pick a wrong order in this set",
          ],
          tryThis: [
            'Close your eyes and play random black keys at any speed',
            'Try mixing octaves — the pentatonic shape stays consonant',
          ],
        },
        {
          id: 'one-outsider',
          title: 'One outsider breaks it',
          start: 9,
          end: 14,
          focus: 'A single F natural snuck into the black-key world',
          learn: [
            'F natural sits a half-step from both F♯ and E',
            'Half-step neighbors are what introduce friction',
          ],
          breakIt: [
            'F natural creates instant friction in the pentatonic',
            'This is the moment your ear leaves the "safety bubble"',
          ],
        },
      ],
    },
  },

  // 3. Finding Home — the tonic concept
  {
    id: 'tutorial-finding-home',
    title: 'Finding Home',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–5s: Phrase that lands on C — C is clearly home
      ['C4', 0.0, 0.4],
      ['D4', 0.4, 0.4],
      ['E4', 0.8, 0.4],
      ['G4', 1.2, 0.4],
      ['E4', 1.6, 0.4],
      ['D4', 2.0, 0.4],
      ['C4', 2.4, 1.2],
      ['G3', 3.7, 0.4],
      ['C4', 4.1, 1.4],
      // 6–11s: Same notes, but every phrase pivots around G
      ['G4', 6.0, 0.4],
      ['F4', 6.4, 0.4],
      ['E4', 6.8, 0.4],
      ['D4', 7.2, 0.4],
      ['G4', 7.6, 0.6],
      ['A4', 8.2, 0.4],
      ['G4', 8.6, 1.2],
      ['F4', 9.9, 0.4],
      ['G4', 10.3, 1.4],
      // 12–16s: Land on A — sudden minor mood
      ['A3', 12.0, 0.4],
      ['C4', 12.4, 0.4],
      ['E4', 12.8, 0.4],
      ['G4', 13.2, 0.4],
      ['F4', 13.6, 0.4],
      ['E4', 14.0, 0.4],
      ['D4', 14.4, 0.4],
      ['A3', 14.8, 1.4],
    ],
    tutorial: {
      title: 'Finding Home',
      summary:
        '"Home" is the note your ear keeps wanting to return to. Same seven white keys can have C, G, or A as home — each gives a totally different feeling.',
      level: 'Beginner',
      objectives: [
        'Hear how repeated landings shape the sense of tonic',
        'Recognize the bright "major" feel when C is home',
        'Recognize the mellow "minor" feel when A is home',
      ],
      sections: [
        {
          id: 'land-on-c',
          title: 'C is home — bright major',
          start: 0,
          end: 6,
          focus: 'The phrase keeps cadencing onto C',
          learn: [
            'Repetition + final landing = tonic',
            'C feels resolved because the music keeps choosing it',
          ],
        },
        {
          id: 'land-on-g',
          title: 'G is home — modal twist',
          start: 6,
          end: 12,
          focus: 'Same white-key collection, but G keeps winning',
          learn: [
            'G as home turns this into G Mixolydian — major-ish but with a flat 7th',
            'Nothing else changed — only what we land on',
          ],
          tryThis: [
            'Improvise on white keys but only resolve on G',
            "Notice the slightly bluesy edge — that's the F natural acting as a flat 7th",
          ],
        },
        {
          id: 'land-on-a',
          title: 'A is home — natural minor',
          start: 12,
          end: 17,
          focus: 'Now A pulls everything toward itself',
          learn: [
            'A natural minor uses the exact same notes as C major',
            'The minor "feel" comes from where you rest, not the notes you use',
          ],
          reinforce: [
            'Play a long final A — feel the gravity',
            'Then play C against it — same notes, but C now feels like a guest',
          ],
        },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // INTERMEDIATE
  // ═════════════════════════════════════════════════════════════════════

  // 4. The Power of D♯ — Für Elise's secret
  {
    id: 'tutorial-power-of-d-sharp',
    title: "The Power of D♯ — Für Elise's Secret",
    bpm: 60,
    beatsPerBar: 3,
    phrase: [
      // 0–4s: Für Elise opening (E D# E D# E B D C A)
      ['E5', 0.0, 0.35],
      ['D#5', 0.35, 0.35],
      ['E5', 0.7, 0.35],
      ['D#5', 1.05, 0.35],
      ['E5', 1.4, 0.35],
      ['B4', 1.75, 0.35],
      ['D5', 2.1, 0.35],
      ['C5', 2.45, 0.35],
      ['A4', 2.8, 1.4],
      // 5–10s: The "break it" version — D natural everywhere D# was
      ['E5', 5.0, 0.4, 0.85],
      ['D5', 5.4, 0.4, 0.85],
      ['E5', 5.8, 0.4, 0.85],
      ['D5', 6.2, 0.4, 0.85],
      ['E5', 6.6, 0.4, 0.85],
      ['B4', 7.0, 0.4, 0.85],
      ['D5', 7.4, 0.4, 0.85],
      ['C5', 7.8, 0.4, 0.85],
      ['A4', 8.2, 1.6, 0.85],
      // 11–16s: Reinforce — D# leans hard into E, listen to it resolve
      ['D#5', 11.0, 1.4],
      ['E5', 12.4, 1.4],
      ['D#5', 13.8, 0.8],
      ['E5', 14.6, 1.6],
    ],
    tutorial: {
      title: "The Power of D♯ — Für Elise's Secret",
      summary:
        'Für Elise opens with E — D♯ — E. That tiny D♯ is a leading tone: it leans into E like a magnet. Once your ear hears the pull, it expects future notes to fit the same world.',
      level: 'Intermediate',
      objectives: [
        'Hear D♯ as a "pulling" note rather than just another black key',
        'Feel why D natural sounds wrong once D♯ has been established',
        'Understand that one chromatic note can define an entire key center',
      ],
      sections: [
        {
          id: 'listen',
          title: 'Listen for the pull',
          start: 0,
          end: 5,
          focus: 'The famous opening: E D♯ E D♯ E B D C A',
          learn: [
            'D♯ is half a step below E — a leading tone',
            'Your ear hears D♯ as wanting to resolve up to E',
            'This little gesture anchors the piece in A minor with a raised 4th',
          ],
          tryThis: [
            'Slow this section to 0.25× and play along on just E and D♯',
            'Feel the tiny tension on D♯ and the release back to E',
          ],
        },
        {
          id: 'break',
          title: 'Break it on purpose',
          start: 5,
          end: 11,
          focus: 'Same melody but using D natural instead of D♯',
          learn: [
            'D natural and D♯ are two versions of the same scale degree',
            'Once D♯ is implied, D natural feels deflated — the magnet pull is gone',
          ],
          breakIt: [
            'After the song establishes D♯, try playing D natural where it used to be',
            "Listen to the cringe — that's your ear demanding the leading tone back",
          ],
        },
        {
          id: 'reinforce',
          title: 'Reinforce the pull',
          start: 11,
          end: 17,
          focus: 'Long D♯, then E — feel the gravity',
          learn: [
            'A held D♯ feels suspended, like a question waiting for an answer',
            'E is the answer — full release of tension',
          ],
          reinforce: [
            'Hold D♯ and notice how badly it wants to move',
            'When E finally arrives, the tension releases',
            'This is exactly what a "leading tone" does in any key',
          ],
        },
      ],
    },
  },

  // 5. When Black Keys Take Over — E major commitment
  {
    id: 'tutorial-black-keys-take-over',
    title: 'When Black Keys Take Over',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: E major scale (E F# G# A B C# D# E)
      ['E4', 0.0, 0.45],
      ['F#4', 0.5, 0.45],
      ['G#4', 1.0, 0.45],
      ['A4', 1.5, 0.45],
      ['B4', 2.0, 0.45],
      ['C#5', 2.5, 0.45],
      ['D#5', 3.0, 0.45],
      ['E5', 3.5, 0.9],
      // 5–9s: Stay in the world — E major chord arpeggio
      ['E4', 5.0, 0.4],
      ['G#4', 5.4, 0.4],
      ['B4', 5.8, 0.4],
      ['E5', 6.2, 0.4],
      ['B4', 6.6, 0.4],
      ['G#4', 7.0, 0.4],
      ['E4', 7.4, 0.9],
      // 10–14s: The outsiders — F natural and C natural feel wrong now
      ['E4', 10.0, 0.4],
      ['F#4', 10.4, 0.4],
      ['F4', 10.8, 0.6, 0.85], // outsider
      ['G#4', 11.4, 0.4],
      ['A4', 11.8, 0.4],
      ['C5', 12.2, 0.6, 0.85], // outsider
      ['C#5', 12.8, 0.4],
      ['E5', 13.2, 1.0],
    ],
    tutorial: {
      title: 'When Black Keys Take Over',
      summary:
        'E major needs four sharps: F♯, G♯, C♯, D♯. Once your ear commits to this key, the "matching" white notes (F natural, C natural) become the outsiders.',
      level: 'Intermediate',
      objectives: [
        'Hear what E major sounds like — bright, four sharps',
        'Notice that pure white-key playing no longer "fits" once E major is established',
        'Understand that committing to a key forces a specific set of seven notes',
      ],
      sections: [
        {
          id: 'e-major',
          title: 'The E major scale',
          start: 0,
          end: 5,
          focus: 'E F♯ G♯ A B C♯ D♯ E',
          learn: [
            'Four of seven notes are black keys',
            'Your ear now expects all seven of these notes — not the C-major ones',
          ],
        },
        {
          id: 'stay-inside',
          title: 'Stay in the world',
          start: 5,
          end: 10,
          focus: 'E major chord (E G♯ B) — pure consonance',
          learn: [
            'Triads built from scale tones are the "anchors" inside a key',
            'These notes all reinforce E as home',
          ],
          tryThis: [
            'Improvise using only F♯, G♯, C♯, D♯ and the white keys A, B, E',
            'Try landing on E or B — both feel stable in this key',
          ],
        },
        {
          id: 'the-outsiders',
          title: 'The outsiders now sting',
          start: 10,
          end: 15,
          focus: 'F natural and C natural inside an E major phrase',
          learn: [
            'F natural conflicts with F♯; C natural conflicts with C♯',
            'These were "free" white keys before — now they sound jarring',
          ],
          breakIt: [
            'Drop in an F natural — the half-step clash against F♯ stings',
            'Try a C natural after a C♯ — same thing',
          ],
          reinforce: [
            'Switch back to the E major scale and notice the relief',
            'This is what "being in a key" means in practice',
          ],
        },
      ],
    },
  },

  // 6. Major vs Minor — Same root, different feeling
  {
    id: 'tutorial-major-vs-minor',
    title: 'Major vs Minor — One Note Changes Everything',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: C major triad arpeggio (C E G C, descending)
      ['C4', 0.0, 0.45],
      ['E4', 0.5, 0.45],
      ['G4', 1.0, 0.45],
      ['C5', 1.5, 0.45],
      ['G4', 2.0, 0.45],
      ['E4', 2.5, 0.45],
      ['C4', 3.0, 1.2],
      // 5–9s: C minor triad arpeggio (C Eb G C) — same root, same 5th
      ['C4', 5.0, 0.45],
      ['D#4', 5.5, 0.45],
      ['G4', 6.0, 0.45],
      ['C5', 6.5, 0.45],
      ['G4', 7.0, 0.45],
      ['D#4', 7.5, 0.45],
      ['C4', 8.0, 1.2],
      // 10–14s: Toggle — C E G then C Eb G then C E G
      ['C4', 10.0, 0.4],
      ['E4', 10.4, 0.4],
      ['G4', 10.8, 0.9],
      ['C4', 11.8, 0.4],
      ['D#4', 12.2, 0.4],
      ['G4', 12.6, 0.9],
      ['C4', 13.6, 0.4],
      ['E4', 14.0, 0.4],
      ['G4', 14.4, 1.2],
    ],
    tutorial: {
      title: 'Major vs Minor',
      summary:
        'Major and minor chords share two of three notes. The 3rd — that one middle note — is what flips bright to dark. Hear how E vs E♭ rewires the entire mood.',
      level: 'Intermediate',
      objectives: [
        'Hear the major / minor "switch" on the same root note',
        'Identify the 3rd as the mood-defining interval',
        'Use the same root note to make both feelings on demand',
      ],
      sections: [
        {
          id: 'c-major',
          title: 'C major — C E G — bright',
          start: 0,
          end: 5,
          focus: 'The major triad: root, major 3rd, perfect 5th',
          learn: ['Major 3rd = 4 half-steps (C to E)', 'Bright, open, "happy"'],
        },
        {
          id: 'c-minor',
          title: 'C minor — C E♭ G — pensive',
          start: 5,
          end: 10,
          focus: 'Same root, same 5th, but a minor 3rd in the middle',
          learn: [
            'Minor 3rd = 3 half-steps (C to E♭)',
            'Same two outer notes, but the mood is completely different',
          ],
        },
        {
          id: 'toggle',
          title: 'Flip back and forth',
          start: 10,
          end: 15,
          focus: 'Major → minor → major on the same C',
          learn: [
            'You can change the entire emotional character with one note',
            'This is the core of harmonic storytelling',
          ],
          tryThis: [
            'Play C E G slowly. Then play C E♭ G. Then back to C E G.',
            'Try the same trick on G (G B D vs G B♭ D) and A (A C♯ E vs A C E)',
          ],
        },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ADVANCED
  // ═════════════════════════════════════════════════════════════════════

  // 7. Blue Notes — tension that wants to stay
  {
    id: 'tutorial-blue-notes',
    title: 'Blue Notes — Tension That Wants to Stay',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: A minor blues scale (A C D D# E G)
      ['A4', 0.0, 0.4],
      ['C5', 0.4, 0.4],
      ['D5', 0.8, 0.4],
      ['D#5', 1.2, 0.4],
      ['E5', 1.6, 0.4],
      ['G5', 2.0, 0.4],
      ['A5', 2.4, 0.9],
      // 5–9s: The classic bluesy lick — the D# is the "blue note"
      ['A4', 5.0, 0.4],
      ['D5', 5.4, 0.3],
      ['D#5', 5.7, 0.3],
      ['E5', 6.0, 0.4],
      ['D5', 6.4, 0.3],
      ['D#5', 6.7, 0.3],
      ['E5', 7.0, 0.4],
      ['G5', 7.4, 0.3],
      ['A5', 7.7, 1.0],
      // 10–14s: Slide between — D natural and D# back and forth
      ['A4', 10.0, 0.3],
      ['D5', 10.3, 0.25],
      ['D#5', 10.55, 0.25],
      ['D5', 10.8, 0.25],
      ['D#5', 11.05, 0.25],
      ['E5', 11.3, 0.35],
      ['G5', 11.65, 0.35],
      ['E5', 12.0, 0.35],
      ['D#5', 12.35, 0.35],
      ['D5', 12.7, 0.35],
      ['C5', 13.05, 0.35],
      ['A4', 13.4, 1.2],
    ],
    tutorial: {
      title: 'Blue Notes',
      summary:
        'In a blues scale, D♯ sits between D (the minor 3rd above A) and E. It\'s a "blue note" — tension that doesn\'t need to resolve. The clash is the point.',
      level: 'Advanced',
      objectives: [
        'Hear what a blue note is and why it sounds smoky rather than wrong',
        'Notice the difference between a "leading tone" (must resolve) and a "blue note" (can stay)',
        'Use D and D♯ as neighbors to add expressive grit',
      ],
      sections: [
        {
          id: 'scale',
          title: 'The A minor blues scale',
          start: 0,
          end: 5,
          focus: 'A C D D♯ E G — six notes, one of them deliberately "wrong"',
          learn: [
            'The D♯ is between the minor 3rd (C above A) and the 5th (E)',
            'In jazz/blues, this in-between tone is welcomed, not avoided',
          ],
        },
        {
          id: 'lick',
          title: 'The bluesy lick',
          start: 5,
          end: 10,
          focus: 'D → D♯ → E — the classic "bent" sound',
          learn: [
            'D♯ acts as a colored neighbor between D and E',
            'It sounds intentional because it never sits still long enough to feel "wrong"',
          ],
          tryThis: [
            "Play D, then D♯, then E rapidly — that's the blue gesture",
            'Slow it to 0.5× and listen to how the D♯ "leans" without resolving',
          ],
        },
        {
          id: 'slide',
          title: 'Slide between',
          start: 10,
          end: 15,
          focus: 'Going back and forth — D, D♯, D, D♯ — never settling',
          learn: [
            'Same D♯ that was tense in Für Elise is welcome here',
            'Context — not the note itself — defines tension and release',
          ],
          reinforce: [
            'In Für Elise, D♯ had to resolve to E. In a blues, D♯ can sit there',
            'Same two notes, completely different musical job',
          ],
        },
      ],
    },
  },

  // 8. Modal Interchange — borrowing notes
  {
    id: 'tutorial-modal-interchange',
    title: 'Modal Interchange — Borrowing from the Other Side',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: Pure C major phrase
      ['C4', 0.0, 0.4],
      ['E4', 0.4, 0.4],
      ['G4', 0.8, 0.4],
      ['C5', 1.2, 0.4],
      ['B4', 1.6, 0.4],
      ['G4', 2.0, 0.4],
      ['E4', 2.4, 0.4],
      ['C4', 2.8, 1.2],
      // 5–10s: Slip in an Ab (borrowed from C minor) — cinematic warmth
      ['C4', 5.0, 0.4],
      ['E4', 5.4, 0.4],
      ['G4', 5.8, 0.4],
      ['G#4', 6.2, 0.7, 0.9], // borrowed note (Ab)
      ['G4', 6.9, 0.4],
      ['E4', 7.3, 0.4],
      ['C4', 7.7, 1.4],
      // 11–15s: Use the borrowed Eb too — true modal mixture
      ['C4', 11.0, 0.4],
      ['D#4', 11.4, 0.5, 0.9], // borrowed Eb
      ['G4', 11.9, 0.4],
      ['G#4', 12.3, 0.6, 0.9], // borrowed Ab
      ['G4', 12.9, 0.4],
      ['E4', 13.3, 0.4],
      ['C4', 13.7, 1.4],
    ],
    tutorial: {
      title: 'Modal Interchange',
      summary:
        'Modal interchange means borrowing a note (or chord) from the "parallel" key. Sprinkling a C minor note into a C major phrase creates that cinematic, slightly sad warmth you hear in film scores.',
      level: 'Advanced',
      objectives: [
        'Hear what "borrowing" sounds like — a flash of a different mode',
        'Recognize the iconic ♭6 borrowed sound (A♭ over C major)',
        'Combine ♭3 and ♭6 to evoke a Coldplay / Disney "wistful" color',
      ],
      sections: [
        {
          id: 'pure-major',
          title: 'Plain C major',
          start: 0,
          end: 5,
          focus: 'C, E, G, B — purely diatonic',
          learn: ['Stay inside the key — clean, sunny, no surprises'],
        },
        {
          id: 'borrow-flat-six',
          title: 'Borrow the ♭6 (A♭)',
          start: 5,
          end: 11,
          focus: 'A♭ from C minor, dropped into a C major phrase',
          learn: [
            "A♭ doesn't belong to C major, but it does belong to C minor",
            'That borrow creates a sudden warmth without changing key',
          ],
          tryThis: [
            'Play a C major arpeggio and slip an A♭ in before resolving back to G',
            'This is the "Pixar moment" — a flash of melancholy in a major piece',
          ],
        },
        {
          id: 'full-mixture',
          title: 'Full modal mixture',
          start: 11,
          end: 16,
          focus: 'Both ♭3 (E♭) and ♭6 (A♭) borrowed from C minor',
          learn: [
            'Multiple borrowed notes deepen the "minor color" while staying in C major',
            'You can return to the major 3rd whenever you want — the borrow is temporary',
          ],
          reinforce: [
            'Hold the borrowed E♭ — it almost wants to become C minor',
            'Then resolve to C and notice the relief — you came home',
          ],
        },
      ],
    },
  },

  // 9. Chromatic Approach Notes — jazz color
  {
    id: 'tutorial-chromatic-approach',
    title: 'Chromatic Approach Notes',
    bpm: 60,
    beatsPerBar: 4,
    phrase: [
      // 0–4s: Plain C major triad
      ['C4', 0.0, 0.45],
      ['E4', 0.5, 0.45],
      ['G4', 1.0, 0.45],
      ['E4', 1.5, 0.45],
      ['C4', 2.0, 1.5],
      // 5–10s: Each chord tone approached from a half-step below
      ['B3', 5.0, 0.3, 0.9],
      ['C4', 5.3, 0.4],
      ['D#4', 5.7, 0.3, 0.9],
      ['E4', 6.0, 0.4],
      ['F#4', 6.4, 0.3, 0.9],
      ['G4', 6.7, 0.4],
      ['F#4', 7.1, 0.3, 0.9],
      ['E4', 7.4, 0.4],
      ['D#4', 7.8, 0.3, 0.9],
      ['C4', 8.1, 1.4],
      // 11–16s: Mix approach notes freely — jazz line
      ['C4', 11.0, 0.3],
      ['B3', 11.3, 0.3],
      ['C4', 11.6, 0.3],
      ['D#4', 11.9, 0.3, 0.9],
      ['E4', 12.2, 0.3],
      ['F#4', 12.5, 0.3, 0.9],
      ['G4', 12.8, 0.4],
      ['F#4', 13.2, 0.3, 0.9],
      ['E4', 13.5, 0.3],
      ['D#4', 13.8, 0.3, 0.9],
      ['D4', 14.1, 0.3],
      ['C4', 14.4, 1.4],
    ],
    tutorial: {
      title: 'Chromatic Approach Notes',
      summary:
        'A chromatic approach note is a half-step neighbor that "leans" into a chord tone. Jazz musicians use them to spice up plain triads — the target note still wins, but the approach makes the phrase smile.',
      level: 'Advanced',
      objectives: [
        'Identify chord tones (C, E, G in a C major triad)',
        'Add half-step approaches from below (B → C, D♯ → E, F♯ → G)',
        'Use approaches from above too to land on the same chord tones',
      ],
      sections: [
        {
          id: 'plain',
          title: 'Plain C major triad',
          start: 0,
          end: 5,
          focus: 'C E G — the bare chord tones',
          learn: [
            'These three notes are the "anchors" — the most stable points',
          ],
        },
        {
          id: 'below',
          title: 'Approach from below',
          start: 5,
          end: 11,
          focus: 'B → C, D♯ → E, F♯ → G — each target gets a chromatic lead-in',
          learn: [
            'Each approach is a leading tone, half a step below its target',
            'The approach is intentionally outside the key — it resolves quickly',
          ],
          tryThis: [
            'Slow this to 0.5× and feel each chromatic note pulling up to its chord tone',
            'Then try approaching from above instead (D♭ → C, F → E, A♭ → G)',
          ],
        },
        {
          id: 'jazz-line',
          title: 'Mix the approaches into a line',
          start: 11,
          end: 16,
          focus: 'Stack approaches together to make a flowing jazz phrase',
          learn: [
            'Mixing chord tones with half-step approaches gives that smooth bop sound',
            'Always land on a chord tone — that\'s what keeps the line "inside"',
          ],
          reinforce: [
            'Play C E G on the downbeats and walk into each one chromatically',
            'This is the building block behind countless bebop lines',
          ],
        },
      ],
    },
  },
]

export const defaultTutorialSongs: PianoSong[] = RAW_TUTORIALS.map((raw) => {
  const notes = buildNotes(raw.phrase)
  const secondsPerBeat = 60 / raw.bpm
  return {
    id: raw.id,
    title: raw.title,
    source: 'Piano Tutorials',
    sourceInfo: {
      provider: 'Moldable Piano tutorials',
      sourceUrl: 'local://moldable/piano/default-tutorials',
      license: 'Bundled tutorial material for personal practice',
      composer: 'Moldable',
    },
    bpm: raw.bpm,
    beatsPerBar: raw.beatsPerBar,
    beatUnit: raw.beatUnit ?? 4,
    defaultSecondsPerBeat: secondsPerBeat,
    notes,
    tutorial: raw.tutorial,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } satisfies PianoSong
})

export const defaultTutorialIds = defaultTutorialSongs.map((song) => song.id)
