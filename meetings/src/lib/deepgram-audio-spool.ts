export type DeepgramAudioChunk = ArrayBuffer | Blob

export type DeepgramAudioSpoolStats = {
  queuedChunks: number
  queuedBytes: number
  queuedTotalChunks: number
  queuedTotalBytes: number
  droppedChunks: number
  droppedBytes: number
  replayedChunks: number
  replayedBytes: number
  maxQueuedChunks: number
}

function chunkBytes(chunk: DeepgramAudioChunk) {
  return chunk instanceof Blob ? chunk.size : chunk.byteLength
}

export class BoundedDeepgramAudioSpool {
  private readonly maxQueuedChunks: number
  private queue: DeepgramAudioChunk[] = []
  private queuedTotalChunks = 0
  private queuedTotalBytes = 0
  private droppedChunks = 0
  private droppedBytes = 0
  private replayedChunks = 0
  private replayedBytes = 0

  constructor(maxQueuedChunks: number) {
    this.maxQueuedChunks = Math.max(0, Math.floor(maxQueuedChunks))
  }

  enqueue(chunk: DeepgramAudioChunk) {
    const bytes = chunkBytes(chunk)

    if (this.maxQueuedChunks === 0) {
      this.droppedChunks += 1
      this.droppedBytes += bytes
      return
    }

    this.queue.push(chunk)
    this.queuedTotalChunks += 1
    this.queuedTotalBytes += bytes

    while (this.queue.length > this.maxQueuedChunks) {
      const dropped = this.queue.shift()
      if (!dropped) break
      this.droppedChunks += 1
      this.droppedBytes += chunkBytes(dropped)
    }
  }

  drain() {
    const chunks = this.queue
    this.queue = []

    for (const chunk of chunks) {
      this.replayedChunks += 1
      this.replayedBytes += chunkBytes(chunk)
    }

    return chunks
  }

  clear(options: { resetCounters?: boolean } = {}) {
    this.queue = []

    if (options.resetCounters) {
      this.queuedTotalChunks = 0
      this.queuedTotalBytes = 0
      this.droppedChunks = 0
      this.droppedBytes = 0
      this.replayedChunks = 0
      this.replayedBytes = 0
    }
  }

  snapshot(): DeepgramAudioSpoolStats {
    return {
      queuedChunks: this.queue.length,
      queuedBytes: this.queue.reduce(
        (total, chunk) => total + chunkBytes(chunk),
        0,
      ),
      queuedTotalChunks: this.queuedTotalChunks,
      queuedTotalBytes: this.queuedTotalBytes,
      droppedChunks: this.droppedChunks,
      droppedBytes: this.droppedBytes,
      replayedChunks: this.replayedChunks,
      replayedBytes: this.replayedBytes,
      maxQueuedChunks: this.maxQueuedChunks,
    }
  }
}
