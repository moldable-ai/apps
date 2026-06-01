import type { Meeting } from '../types'
import {
  appendMeetingAudioChunk,
  appendMeetingAudioSourceChunk,
  deleteMeeting,
  finalizeMeetingAudio,
  mergeMeetingForSave,
  saveMeeting,
} from './storage.server'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let tempDataDir: string | undefined
let previousDataDir: string | undefined

beforeEach(async () => {
  previousDataDir = process.env.MOLDABLE_APP_DATA_DIR
  tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'meetings-test-'))
  process.env.MOLDABLE_APP_DATA_DIR = tempDataDir
})

afterEach(async () => {
  if (previousDataDir === undefined) {
    delete process.env.MOLDABLE_APP_DATA_DIR
  } else {
    process.env.MOLDABLE_APP_DATA_DIR = previousDataDir
  }

  if (tempDataDir) {
    await fs.rm(tempDataDir, { recursive: true, force: true })
  }

  tempDataDir = undefined
  previousDataDir = undefined
})

function meeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 'meeting-1',
    title: 'Meeting',
    createdAt: new Date('2026-06-01T15:00:00.000Z'),
    updatedAt: new Date('2026-06-01T15:00:00.000Z'),
    duration: 0,
    segments: [],
    ...overrides,
  }
}

describe('mergeMeetingForSave', () => {
  it('keeps finalized recording state when an older active save arrives late', () => {
    const existing = meeting({
      updatedAt: new Date('2026-06-01T15:15:00.000Z'),
      endedAt: new Date('2026-06-01T15:15:00.000Z'),
      duration: 900,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          endedAt: new Date('2026-06-01T15:15:00.000Z'),
          audioPath: 'audio/meeting-1-session-1.wav',
          audioMimeType: 'audio/wav',
          audioSourceManifestPath: 'audio/meeting-1-session-1.sources.json',
          audioSources: {
            microphone: {
              audioPath: 'audio/meeting-1-session-1-microphone.wav',
              audioMimeType: 'audio/wav',
            },
          },
        },
      ],
    })
    const lateActiveSave = meeting({
      updatedAt: new Date('2026-06-01T15:14:59.000Z'),
      duration: 899,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
        },
      ],
      segments: [
        {
          id: 'segment-1',
          text: 'late transcript',
          startTime: 1,
          endTime: 2,
          isFinal: true,
          createdAt: new Date('2026-06-01T15:14:58.000Z'),
        },
      ],
    })

    const merged = mergeMeetingForSave(existing, lateActiveSave)

    expect(merged.endedAt?.toISOString()).toBe('2026-06-01T15:15:00.000Z')
    expect(merged.duration).toBe(900)
    expect(merged.segments).toHaveLength(1)
    expect(merged.recordingSessions?.[0]).toMatchObject({
      id: 'session-1',
      audioPath: 'audio/meeting-1-session-1.wav',
      audioMimeType: 'audio/wav',
      audioSourceManifestPath: 'audio/meeting-1-session-1.sources.json',
      audioSources: {
        microphone: {
          audioPath: 'audio/meeting-1-session-1-microphone.wav',
          audioMimeType: 'audio/wav',
        },
      },
    })
    expect(merged.recordingSessions?.[0]?.endedAt?.toISOString()).toBe(
      '2026-06-01T15:15:00.000Z',
    )
  })

  it('allows a newer resume save to reopen a meeting with a new active session', () => {
    const existing = meeting({
      updatedAt: new Date('2026-06-01T15:15:00.000Z'),
      endedAt: new Date('2026-06-01T15:15:00.000Z'),
      duration: 900,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          endedAt: new Date('2026-06-01T15:15:00.000Z'),
        },
      ],
    })
    const resumeSave = meeting({
      updatedAt: new Date('2026-06-01T15:20:00.000Z'),
      duration: 900,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          endedAt: new Date('2026-06-01T15:15:00.000Z'),
        },
        {
          id: 'session-2',
          startedAt: new Date('2026-06-01T15:20:00.000Z'),
        },
      ],
    })

    const merged = mergeMeetingForSave(existing, resumeSave)

    expect(merged.endedAt).toBeUndefined()
    expect(merged.recordingSessions).toHaveLength(2)
    expect(merged.recordingSessions?.[1]).toMatchObject({ id: 'session-2' })
  })

  it('does not reopen an ended meeting from a newer stale save for the same session', () => {
    const existing = meeting({
      updatedAt: new Date('2026-06-01T15:15:00.000Z'),
      endedAt: new Date('2026-06-01T15:15:00.000Z'),
      duration: 900,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          endedAt: new Date('2026-06-01T15:15:00.000Z'),
          audioPath: 'audio/meeting-1-session-1.wav',
          audioMimeType: 'audio/wav',
        },
      ],
    })
    const staleSameSessionSave = meeting({
      updatedAt: new Date('2026-06-01T15:16:00.000Z'),
      duration: 901,
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
        },
      ],
    })

    const merged = mergeMeetingForSave(existing, staleSameSessionSave)

    expect(merged.endedAt?.toISOString()).toBe('2026-06-01T15:15:00.000Z')
    expect(merged.recordingSessions?.[0]?.endedAt?.toISOString()).toBe(
      '2026-06-01T15:15:00.000Z',
    )
    expect(merged.recordingSessions?.[0]?.audioPath).toBe(
      'audio/meeting-1-session-1.wav',
    )
  })

  it('keeps recording recovery lease metadata monotonic across saves', () => {
    const existing = meeting({
      updatedAt: new Date('2026-06-01T15:00:10.000Z'),
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          captureSource: 'both',
          nativeCaptureSessionId: 'native-session-1',
          lastNativeSequence: 400,
          leaseUpdatedAt: new Date('2026-06-01T15:00:10.000Z'),
        },
      ],
    })
    const lateLowerSequenceSave = meeting({
      updatedAt: new Date('2026-06-01T15:00:11.000Z'),
      recordingSessions: [
        {
          id: 'session-1',
          startedAt: new Date('2026-06-01T15:00:00.000Z'),
          lastNativeSequence: 250,
          leaseUpdatedAt: new Date('2026-06-01T15:00:09.000Z'),
        },
      ],
    })

    const merged = mergeMeetingForSave(existing, lateLowerSequenceSave)

    expect(merged.recordingSessions?.[0]).toMatchObject({
      captureSource: 'both',
      nativeCaptureSessionId: 'native-session-1',
      lastNativeSequence: 400,
    })
    expect(merged.recordingSessions?.[0]?.leaseUpdatedAt?.toISOString()).toBe(
      '2026-06-01T15:00:10.000Z',
    )
  })
})

describe('finalizeMeetingAudio', () => {
  it('writes a per-source sidecar manifest next to the finalized mixed asset', async () => {
    await appendMeetingAudioChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([1, 0, 2, 0]),
    })
    await appendMeetingAudioSourceChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      source: 'microphone',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([3, 0, 4, 0]),
    })
    await appendMeetingAudioSourceChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      source: 'system',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([5, 0, 6, 0]),
    })

    const saved = await finalizeMeetingAudio({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      contentType: 'audio/l16;rate=48000;channels=1',
      sourceContentTypes: {
        microphone: 'audio/l16;rate=48000;channels=1',
        system: 'audio/l16;rate=48000;channels=1',
      },
      sourceManifest: {
        version: 1,
        captureSource: 'both',
        nativeCaptureSessionId: 'native-session-1',
        sampleRate: 48000,
        channels: 1,
        mixedAudio: true,
        sources: {
          microphone: {
            chunks: 2,
            bytes: 4,
            frames: 2,
            firstSequence: 10,
            lastSequence: 12,
          },
          system: {
            chunks: 1,
            bytes: 2,
            frames: 1,
            firstSequence: 11,
            lastSequence: 11,
          },
        },
      },
    })

    expect(saved).toMatchObject({
      audioPath: 'audio/meeting-1-session-1.wav',
      audioMimeType: 'audio/wav',
      audioSourceManifestPath: 'audio/meeting-1-session-1.sources.json',
      audioSources: {
        microphone: {
          audioPath: 'audio/meeting-1-session-1-microphone.wav',
          audioMimeType: 'audio/wav',
        },
        system: {
          audioPath: 'audio/meeting-1-session-1-system.wav',
          audioMimeType: 'audio/wav',
        },
      },
    })

    const manifestPath = path.join(
      tempDataDir!,
      'audio',
      'meeting-1-session-1.sources.json',
    )
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))

    expect(manifest).toMatchObject({
      version: 1,
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      audioPath: 'audio/meeting-1-session-1.wav',
      audioMimeType: 'audio/wav',
      audioSources: {
        microphone: {
          audioPath: 'audio/meeting-1-session-1-microphone.wav',
          audioMimeType: 'audio/wav',
        },
        system: {
          audioPath: 'audio/meeting-1-session-1-system.wav',
          audioMimeType: 'audio/wav',
        },
      },
      captureSource: 'both',
      nativeCaptureSessionId: 'native-session-1',
      mixedAudio: true,
      sources: {
        microphone: {
          chunks: 2,
          bytes: 4,
          frames: 2,
          firstSequence: 10,
          lastSequence: 12,
        },
        system: {
          chunks: 1,
          bytes: 2,
          frames: 1,
          firstSequence: 11,
          lastSequence: 11,
        },
      },
    })
    expect(typeof manifest.finalizedAt).toBe('string')

    const microphoneAudio = await fs.readFile(
      path.join(tempDataDir!, 'audio', 'meeting-1-session-1-microphone.wav'),
    )
    const systemAudio = await fs.readFile(
      path.join(tempDataDir!, 'audio', 'meeting-1-session-1-system.wav'),
    )

    expect(microphoneAudio.subarray(0, 4).toString('utf8')).toBe('RIFF')
    expect(systemAudio.subarray(0, 4).toString('utf8')).toBe('RIFF')
  })
})

describe('deleteMeeting', () => {
  it('removes mixed audio, source audio, and source manifests for the deleted meeting', async () => {
    await appendMeetingAudioChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([1, 0, 2, 0]),
    })
    await appendMeetingAudioSourceChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      source: 'microphone',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([3, 0, 4, 0]),
    })
    await appendMeetingAudioSourceChunk({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      source: 'system',
      contentType: 'audio/l16;rate=48000;channels=1',
      data: Buffer.from([5, 0, 6, 0]),
    })

    const savedAudio = await finalizeMeetingAudio({
      meetingId: 'meeting-1',
      sessionId: 'session-1',
      contentType: 'audio/l16;rate=48000;channels=1',
      sourceContentTypes: {
        microphone: 'audio/l16;rate=48000;channels=1',
        system: 'audio/l16;rate=48000;channels=1',
      },
      sourceManifest: {
        version: 1,
        sampleRate: 48000,
        channels: 1,
        mixedAudio: true,
        sources: {
          microphone: { chunks: 1, bytes: 4, frames: 2 },
          system: { chunks: 1, bytes: 4, frames: 2 },
        },
      },
    })

    await saveMeeting(
      meeting({
        recordingSessions: [
          {
            id: 'session-1',
            startedAt: new Date('2026-06-01T15:00:00.000Z'),
            audioPath: savedAudio?.audioPath,
            audioMimeType: savedAudio?.audioMimeType,
            audioSourceManifestPath: savedAudio?.audioSourceManifestPath,
            audioSources: savedAudio?.audioSources,
          },
        ],
      }),
    )

    await deleteMeeting('meeting-1')

    await expect(
      fs.readdir(path.join(tempDataDir!, 'audio')),
    ).resolves.not.toEqual(
      expect.arrayContaining([
        'meeting-1-session-1.wav',
        'meeting-1-session-1-microphone.wav',
        'meeting-1-session-1-system.wav',
        'meeting-1-session-1.sources.json',
      ]),
    )
    await expect(
      fs.access(path.join(tempDataDir!, 'meetings', 'meeting-1.json')),
    ).rejects.toThrow()
  })
})
