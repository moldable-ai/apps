import type { SystemAudioDataEvent } from '@/hooks/use-system-audio'

type NativeAudioSource = SystemAudioDataEvent['source']

const BYTES_PER_PCM16_SAMPLE = 2
const DEFAULT_OUTPUT_FRAMES = 960
const DEFAULT_MAX_LEAD_FRAMES = 4_800

class Pcm16Queue {
  private chunks: Int16Array[] = []
  private offset = 0
  frames = 0

  push(buffer: ArrayBuffer) {
    if (buffer.byteLength < BYTES_PER_PCM16_SAMPLE) return
    const alignedByteLength =
      buffer.byteLength - (buffer.byteLength % BYTES_PER_PCM16_SAMPLE)
    const samples = new Int16Array(buffer.slice(0, alignedByteLength))
    if (samples.length === 0) return

    this.chunks.push(samples)
    this.frames += samples.length
  }

  read(frameCount: number): Int16Array {
    const output = new Int16Array(frameCount)
    let outputOffset = 0

    while (outputOffset < frameCount && this.chunks.length > 0) {
      const chunk = this.chunks[0]
      const available = chunk.length - this.offset
      const count = Math.min(available, frameCount - outputOffset)
      output.set(chunk.subarray(this.offset, this.offset + count), outputOffset)
      outputOffset += count
      this.offset += count
      this.frames -= count

      if (this.offset >= chunk.length) {
        this.chunks.shift()
        this.offset = 0
      }
    }

    return output
  }

  clear() {
    this.chunks = []
    this.offset = 0
    this.frames = 0
  }
}

function clampPcm16(value: number) {
  if (value > 32767) return 32767
  if (value < -32768) return -32768
  return value
}

function int16ToArrayBuffer(samples: Int16Array): ArrayBuffer {
  const output = new ArrayBuffer(samples.byteLength)
  new Int16Array(output).set(samples)
  return output
}

function mixPcm16({
  microphone,
  system,
  hasMicrophone,
  hasSystem,
}: {
  microphone: Int16Array
  system: Int16Array
  hasMicrophone: boolean
  hasSystem: boolean
}) {
  if (hasMicrophone && !hasSystem) return int16ToArrayBuffer(microphone)
  if (!hasMicrophone && hasSystem) return int16ToArrayBuffer(system)

  const frameCount = Math.max(microphone.length, system.length)
  const mixed = new Int16Array(frameCount)

  for (let index = 0; index < frameCount; index += 1) {
    const microphoneSample = microphone[index] ?? 0
    const systemSample = system[index] ?? 0
    mixed[index] = clampPcm16(
      Math.round((microphoneSample + systemSample) * 0.75),
    )
  }

  return int16ToArrayBuffer(mixed)
}

export class NativePcmMixer {
  private readonly microphone = new Pcm16Queue()
  private readonly system = new Pcm16Queue()
  private readonly outputFrames: number
  private readonly maxLeadFrames: number

  constructor({
    outputFrames = DEFAULT_OUTPUT_FRAMES,
    maxLeadFrames = DEFAULT_MAX_LEAD_FRAMES,
  }: {
    outputFrames?: number
    maxLeadFrames?: number
  } = {}) {
    this.outputFrames = outputFrames
    this.maxLeadFrames = maxLeadFrames
  }

  push(event: Pick<SystemAudioDataEvent, 'data' | 'source'>): ArrayBuffer[] {
    this.queueForSource(event.source).push(event.data)
    return this.drain(false)
  }

  flush(): ArrayBuffer[] {
    const output = this.drain(true)
    this.microphone.clear()
    this.system.clear()
    return output
  }

  reset() {
    this.microphone.clear()
    this.system.clear()
  }

  private queueForSource(source: NativeAudioSource) {
    return source === 'microphone' ? this.microphone : this.system
  }

  private drain(flush: boolean) {
    const output: ArrayBuffer[] = []

    while (this.microphone.frames > 0 || this.system.frames > 0) {
      const hasMicrophone = this.microphone.frames > 0
      const hasSystem = this.system.frames > 0
      const bothSourcesReady =
        this.microphone.frames >= this.outputFrames &&
        this.system.frames >= this.outputFrames
      const leadFrames = Math.max(this.microphone.frames, this.system.frames)
      const oneSourceHasWaitedTooLong =
        leadFrames >= this.maxLeadFrames && (hasMicrophone || hasSystem)

      if (!flush && !bothSourcesReady && !oneSourceHasWaitedTooLong) {
        break
      }

      const frameCount = flush
        ? Math.min(this.outputFrames, leadFrames)
        : this.outputFrames
      const microphone = hasMicrophone
        ? this.microphone.read(frameCount)
        : new Int16Array(frameCount)
      const system = hasSystem
        ? this.system.read(frameCount)
        : new Int16Array(frameCount)

      output.push(
        mixPcm16({
          microphone,
          system,
          hasMicrophone,
          hasSystem,
        }),
      )
    }

    return output
  }
}
