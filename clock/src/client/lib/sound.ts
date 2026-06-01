// A small synthesized chime so the app needs no bundled audio assets.

let context: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  void context.resume()
  return context
}

function tone(
  ctx: AudioContext,
  startAt: number,
  frequency: number,
  duration: number,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration)
}

/** Play a short rising two-note chime, repeated a few times. */
export function playChime(repeats = 3): void {
  const ctx = getContext()
  if (!ctx) return
  const base = ctx.currentTime
  for (let i = 0; i < repeats; i += 1) {
    const at = base + i * 0.6
    tone(ctx, at, 880, 0.18)
    tone(ctx, at + 0.2, 1175, 0.22)
  }
}
