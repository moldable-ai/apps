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

  it('resolves widget routes to the built widget html entry', () => {
    expect(resolveStaticFilePath('/widget')).toBe(
      path.join(process.cwd(), 'dist', 'widget.html'),
    )
  })

  it('resolves bundled instrument assets from public', () => {
    expect(resolveStaticFilePath('/instruments/vcsl-keys/piano.sfz')).toBe(
      path.join(
        process.cwd(),
        'public',
        'instruments',
        'vcsl-keys',
        'piano.sfz',
      ),
    )
  })

  it('resolves instrument assets from workspace storage before bundled public assets', () => {
    expect(
      resolveInstrumentFilePaths(
        '/instruments/salamander-grand-piano/SalamanderGrandPianoV3_44.1khz16bit/44.1khz16bit/D%231v1.wav',
        'personal',
      ),
    ).toEqual([
      path.join(
        getAppDataDir('personal'),
        'instruments',
        'salamander-grand-piano',
        'SalamanderGrandPianoV3_44.1khz16bit',
        '44.1khz16bit',
        'D#1v1.wav',
      ),
      path.join(
        process.cwd(),
        'public',
        'instruments',
        'salamander-grand-piano',
        'SalamanderGrandPianoV3_44.1khz16bit',
        '44.1khz16bit',
        'D#1v1.wav',
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
    expect(body.defaultPresetId).toBe('classic-grand')
    expect(body.presets.length).toBeGreaterThan(8)
    expect(body.controls.length).toBeGreaterThan(6)
    expect(body.sampleSets.length).toBe(1)
    expect(body.instrumentPacks.length).toBeGreaterThanOrEqual(3)
    expect(
      body.instrumentPacks.find((pack) => pack.id === 'splendid-grand-piano'),
    ).toMatchObject({
      status: 'installed',
      playbackEngine: 'smplr-splendid-grand',
      redistribution: 'cleared',
      download: {
        enabled: false,
        strategy: 'bundled',
      },
    })
    const vcslPack = body.instrumentPacks.find(
      (pack) => pack.id === 'vcsl-keys',
    )
    expect(vcslPack).toMatchObject({
      playbackEngine: 'smplr-sfz',
      redistribution: 'cleared',
      download: {
        strategy: 'direct',
      },
    })
    expect(['downloadable', 'installed']).toContain(vcslPack?.status)
    const salamanderPack = body.instrumentPacks.find(
      (pack) => pack.id === 'salamander-grand-piano',
    )
    expect(salamanderPack).toMatchObject({
      playbackEngine: 'smplr-sfz',
      download: {
        strategy: 'direct',
      },
      license: {
        attributionRequired: true,
      },
      redistribution: 'attribution-required',
    })
    expect(['downloadable', 'installed']).toContain(salamanderPack?.status)
    expect(
      body.instrumentPacks.find((pack) => pack.id === 'piano-in-162'),
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
sample=Grand Piano, K/Sustains/GPiano_sus_F#2_v2_rr1_Player.flac
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
      'Grand Piano, K/Sustains/GPiano_sus_F#2_v2_rr1_Player':
        'Grand%20Piano%2C%20K/Sustains/GPiano_sus_F%232_v2_rr1_Player',
    })
    expect(preset.groups[0]?.regions[0]).toMatchObject({
      sample: 'Grand Piano, K/Sustains/GPiano_sus_F#2_v2_rr1_Player',
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
        'fur-elise',
        'clair-de-lune',
        'satie-gnossienne-no-1',
        'debussy-reverie',
        'chopin-nocturne-op-9-no-2',
        'chopin-raindrop-prelude',
        'beethoven-moonlight-sonata-1',
        'beethoven-symphony-no-5',
      ]),
    )
    expect(songs.every((song) => Boolean(song.sourceInfo?.provider))).toBe(true)
    expect(songs.every((song) => Boolean(song.sourceInfo?.license))).toBe(true)
    expect(songs.every((song) => song.notes.length > 100)).toBe(true)
  })
})
