import { getAppDataDir } from '@moldable-ai/storage'
import { app } from './app'
import { defaultSongs } from './default-songs'
import { sfzToSmplrPreset } from './sfz-preset'
import { resolveInstrumentFilePaths, resolveStaticFilePath } from './static'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('resolveStaticFilePath', () => {
  it('resolves built asset paths under dist', () => {
    const filePath = resolveStaticFilePath('/assets/index-abc123.js')
    const expectedPath = path.join(
      process.cwd(),
      'dist',
      'assets/index-abc123.js',
    )

    expect(filePath).toBe(expectedPath)
    expect(path.relative(path.join(process.cwd(), 'dist'), filePath)).toBe(
      'assets/index-abc123.js',
    )
  })

  it('resolves instrument assets from workspace storage before bundled public assets', () => {
    expect(
      resolveInstrumentFilePaths(
        '/instruments/freepats-clean-electric-small/EGuitarFSBS-bridge-clean-small-SFZ+FLAC-20220911/samples/C%232_s1_01.flac',
        'personal',
      ),
    ).toEqual([
      path.join(
        getAppDataDir('personal'),
        'instruments',
        'freepats-clean-electric-small',
        'EGuitarFSBS-bridge-clean-small-SFZ+FLAC-20220911',
        'samples',
        'C#2_s1_01.flac',
      ),
      path.join(
        process.cwd(),
        'public',
        'instruments',
        'freepats-clean-electric-small',
        'EGuitarFSBS-bridge-clean-small-SFZ+FLAC-20220911',
        'samples',
        'C#2_s1_01.flac',
      ),
    ])
  })
})

describe('audio options api', () => {
  it('exposes preset and settings metadata for the frontend', async () => {
    const res = await app.request('/api/audio/options')
    const body = (await res.json()) as {
      defaultPresetId: string
      instrumentPacks: Array<{
        id: string
        status: string
        playbackEngine: string
        copyProtection?: string
        redistribution: string
        download: {
          enabled: boolean
          strategy: string
        }
        license: {
          attributionRequired: boolean
        }
      }>
      presets: unknown[]
      controls: unknown[]
      sampleSets: unknown[]
    }

    expect(res.status).toBe(200)
    expect(body.defaultPresetId).toBe('natural-guitar')
    expect(body.presets.length).toBe(1)
    expect(body.controls.length).toBeGreaterThan(6)
    expect(body.sampleSets.length).toBe(0)
    expect(body.instrumentPacks.length).toBeGreaterThanOrEqual(5)
    expect(body.instrumentPacks[0]?.id).toBe('smplr-gm-soundfont-guitars')
    expect(
      body.instrumentPacks.find((pack) => pack.id === 'freepats-nylon-guitar'),
    ).toMatchObject({
      playbackEngine: 'smplr-sfz',
      redistribution: 'cleared',
      download: {
        strategy: 'direct',
      },
    })
    expect(['downloadable', 'installed']).toContain(
      body.instrumentPacks.find((pack) => pack.id === 'freepats-nylon-guitar')
        ?.status,
    )
    const cleanPack = body.instrumentPacks.find(
      (pack) => pack.id === 'freepats-clean-electric-small',
    )
    expect(cleanPack).toMatchObject({
      playbackEngine: 'smplr-sfz',
      redistribution: 'cleared',
      download: {
        strategy: 'direct',
      },
      license: {
        attributionRequired: false,
      },
    })
    expect(['downloadable', 'installed']).toContain(cleanPack?.status)
    const soundfontPack = body.instrumentPacks.find(
      (pack) => pack.id === 'smplr-gm-soundfont-guitars',
    )
    expect(soundfontPack).toMatchObject({
      status: 'installed',
      playbackEngine: 'smplr-soundfont',
      download: {
        enabled: false,
        strategy: 'cdn',
      },
      license: {
        attributionRequired: true,
      },
      redistribution: 'attribution-required',
    })
    const vcslPack = body.instrumentPacks.find(
      (pack) => pack.id === 'vcsl-strumstick',
    )
    expect(vcslPack).toMatchObject({
      status: 'installed',
      playbackEngine: 'smplr-versilian',
      download: {
        enabled: false,
        strategy: 'cdn',
      },
      license: {
        attributionRequired: false,
      },
      redistribution: 'cleared',
    })
    expect(
      body.instrumentPacks.find((pack) => pack.id === 'karoryfer-emilyguitar'),
    ).toBeUndefined()
    expect(
      body.instrumentPacks.find((pack) => pack.id === 'guitar-in-162'),
    ).toBeUndefined()
  })

  it('rejects unknown instrument pack installs without attempting a download', async () => {
    const res = await app.request('/api/audio/instrument-packs/nope/install', {
      method: 'POST',
    })
    const body = (await res.json()) as { error: string }

    expect(res.status).toBe(404)
    expect(body.error).toBe('Instrument pack not found')
  })
})

describe('sfz preset conversion', () => {
  it('maps SFZ regions to encoded local sample URLs', () => {
    const preset = sfzToSmplrPreset(
      `<global>
ampeg_release=0.4
<group>
trigger=attack
<region>
sample=Grand Guitar, K/Sustains/GGuitar_sus_F#2_v2_rr1_Player.flac
pitch_keycenter=42
lokey=40
hikey=44
lovel=0
hivel=80
volume=2
`,
      { baseUrl: '/instruments/vcsl-keys', formats: ['flac'] },
    )

    expect(preset.samples.baseUrl).toBe('/instruments/vcsl-keys')
    expect(preset.samples.formats).toEqual(['flac'])
    expect(preset.samples.map).toMatchObject({
      'Grand Guitar, K/Sustains/GGuitar_sus_F#2_v2_rr1_Player':
        'Grand%20Guitar%2C%20K/Sustains/GGuitar_sus_F%232_v2_rr1_Player',
    })
    expect(preset.groups[0]?.regions[0]).toMatchObject({
      sample: 'Grand Guitar, K/Sustains/GGuitar_sus_F#2_v2_rr1_Player',
      keyRange: [40, 44],
      pitch: 42,
      velRange: [0, 80],
      volume: 2,
      ampRelease: 0.4,
    })
  })
})

describe('default songs', () => {
  it('seeds the bundled starter song library', () => {
    const songs = defaultSongs('2026-05-25T00:00:00.000Z')

    expect(songs.length).toBeGreaterThanOrEqual(8)
    expect(songs.map((song) => song.id)).toEqual(
      expect.arrayContaining([
        'tutorial-six-strings',
        'tutorial-frets-and-semitones',
        'anonymous-spanish-romance',
        'sor-andantino',
        'carcassi-op60-no7-etude',
        'giuliani-op50-no1',
        'aguado-study-a-minor',
        'bach-menuet-in-g-bwv-anh-114',
      ]),
    )
    const repertoire = songs.filter((song) => !song.tutorial)
    expect(repertoire.every((song) => Boolean(song.sourceInfo?.provider))).toBe(
      true,
    )
    expect(repertoire.every((song) => Boolean(song.sourceInfo?.license))).toBe(
      true,
    )
    expect(repertoire.every((song) => song.notes.length > 100)).toBe(true)
  })
})
