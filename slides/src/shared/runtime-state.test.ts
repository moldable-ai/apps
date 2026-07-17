import { RUNTIME_STATE_CLIENT_JS } from './runtime-state'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

function directRuntime() {
  const values = new Map<string, string>()
  const listeners = new Map<string, (event: MessageEvent) => void>()
  const window = {
    location: { pathname: '/preview/deck-1', search: '' },
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    addEventListener: (type: string, listener: (event: MessageEvent) => void) =>
      listeners.set(type, listener),
  } as Record<string, unknown>
  window.parent = window
  vm.runInNewContext(RUNTIME_STATE_CLIENT_JS, {
    window,
    URLSearchParams,
    Promise,
    JSON,
    Error,
    setTimeout,
    clearTimeout,
  })
  return window as {
    moldableState: (namespace: string) => {
      get: (fallback: unknown) => Promise<unknown>
      set: (value: unknown) => Promise<unknown>
      clear: () => Promise<unknown>
    }
  }
}

describe('moldableState browser runtime', () => {
  it('persists through direct browser storage and clears cleanly', async () => {
    const window = directRuntime()
    const store = window.moldableState('demo:v1')
    expect(await store.get({ count: 0 })).toEqual({ count: 0 })
    await store.set({ count: 3 })
    expect(await store.get(null)).toEqual({ count: 3 })
    await store.clear()
    expect(await store.get('missing')).toBe('missing')
  })
})
