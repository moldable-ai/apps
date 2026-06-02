import { app } from './app'
import assert from 'node:assert/strict'
import test from 'node:test'

function mockFetchJson(payload: unknown): () => void {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch

  return () => {
    globalThis.fetch = originalFetch
  }
}

test('RPC rejects unknown methods before any weather lookup', async () => {
  const res = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'weather.nope', params: {} }),
  })

  assert.equal(res.status, 404)
  const body = (await res.json()) as { ok: boolean }
  assert.equal(body.ok, false)
})

test('location preference rejects out-of-range coordinates', async () => {
  const res = await app.request('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: 91, longitude: 0 }),
  })

  assert.equal(res.status, 400)
})

test('weather requests reject invalid explicit coordinates', async () => {
  const res = await app.request('/api/weather?lat=Infinity&lon=0')

  assert.equal(res.status, 400)
  const body = (await res.json()) as { error?: string }
  assert.equal(body.error, 'Invalid coordinates')
})

test('RPC rejects invalid explicit coordinates as invalid params', async () => {
  const res = await app.request('/api/moldable/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'weather.get',
      params: { lat: 91, lon: 0 },
    }),
  })

  assert.equal(res.status, 400)
  const body = (await res.json()) as {
    ok: boolean
    error?: { code?: string; message?: string }
  }
  assert.equal(body.ok, false)
  assert.equal(body.error?.code, 'invalid_params')
  assert.equal(body.error?.message, 'Invalid coordinates')
})

test('location preference rejects invalid JSON as a client error', async () => {
  const res = await app.request('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  })

  assert.equal(res.status, 400)
  const body = (await res.json()) as { error?: string }
  assert.equal(body.error, 'Invalid JSON body')
})

test('weather parser skips invalid forecast slots and normalizes optional values', async () => {
  const restoreFetch = mockFetchJson({
    utc_offset_seconds: -18_000,
    current: {
      time: '2026-06-02T08:00',
      temperature_2m: 22.4,
      apparent_temperature: Number.NaN,
      relative_humidity_2m: Number.NaN,
      weather_code: Number.NaN,
      is_day: 1,
      wind_speed_10m: Number.NaN,
    },
    hourly: {
      time: [
        '2026-06-02T08:00',
        'not-a-time',
        '2099-06-02T09:00',
        '2099-06-02T10:00',
      ],
      temperature_2m: [Number.NaN, 24.1, 24.6, 25.2],
      weather_code: [1, 2, Number.NaN, 0],
      is_day: [1, 1, 0, 1],
    },
    daily: {
      time: ['2099-06-02', '2099-06-03'],
      weather_code: [Number.NaN, 1],
      temperature_2m_max: [30.2, Number.NaN],
      temperature_2m_min: [18.4, 19.1],
      precipitation_probability_max: [Number.NaN, 60],
    },
  })

  try {
    const res = await app.request(
      '/api/weather?lat=12.34567&lon=23.45678&unit=celsius',
    )

    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      current: {
        apparentTemperature: number
        code: number
        humidity: number
        windSpeed: number
      }
      hourly: Array<{ temperature: number; code: number; isDay?: boolean }>
      daily: Array<{
        high: number
        low: number
        code: number
        precipitationProbability: number
      }>
    }

    assert.equal(body.current.apparentTemperature, 22)
    assert.equal(body.current.code, 0)
    assert.equal(body.current.humidity, 0)
    assert.equal(body.current.windSpeed, 0)
    assert.deepEqual(
      body.hourly.map(({ temperature, code, isDay }) => ({
        temperature,
        code,
        isDay,
      })),
      [
        { temperature: 25, code: 0, isDay: false },
        { temperature: 25, code: 0, isDay: true },
      ],
    )
    assert.deepEqual(
      body.daily.map(({ high, low, code, precipitationProbability }) => ({
        high,
        low,
        code,
        precipitationProbability,
      })),
      [{ high: 30, low: 18, code: 0, precipitationProbability: 0 }],
    )
  } finally {
    restoreFetch()
  }
})
