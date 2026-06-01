import { BoundedDeepgramAudioSpool } from './deepgram-audio-spool'
import { describe, expect, it } from 'vitest'

function buffer(bytes: number) {
  return new ArrayBuffer(bytes)
}

describe('BoundedDeepgramAudioSpool', () => {
  it('keeps only the newest chunks and counts dropped audio', () => {
    const spool = new BoundedDeepgramAudioSpool(2)

    spool.enqueue(buffer(10))
    spool.enqueue(buffer(20))
    spool.enqueue(buffer(30))

    expect(spool.snapshot()).toMatchObject({
      queuedChunks: 2,
      queuedBytes: 50,
      queuedTotalChunks: 3,
      queuedTotalBytes: 60,
      droppedChunks: 1,
      droppedBytes: 10,
      replayedChunks: 0,
      replayedBytes: 0,
      maxQueuedChunks: 2,
    })
  })

  it('drains queued audio as provider replay and preserves counters', () => {
    const spool = new BoundedDeepgramAudioSpool(3)

    const first = buffer(12)
    const second = new Blob([buffer(8)])
    spool.enqueue(first)
    spool.enqueue(second)

    expect(spool.drain()).toEqual([first, second])
    expect(spool.snapshot()).toMatchObject({
      queuedChunks: 0,
      queuedBytes: 0,
      queuedTotalChunks: 2,
      queuedTotalBytes: 20,
      droppedChunks: 0,
      replayedChunks: 2,
      replayedBytes: 20,
    })
  })

  it('can clear queued audio without erasing historical counters', () => {
    const spool = new BoundedDeepgramAudioSpool(1)

    spool.enqueue(buffer(4))
    spool.enqueue(buffer(6))
    spool.clear()

    expect(spool.snapshot()).toMatchObject({
      queuedChunks: 0,
      queuedTotalChunks: 2,
      droppedChunks: 1,
      droppedBytes: 4,
    })

    spool.clear({ resetCounters: true })

    expect(spool.snapshot()).toMatchObject({
      queuedChunks: 0,
      queuedTotalChunks: 0,
      droppedChunks: 0,
      replayedChunks: 0,
    })
  })
})
