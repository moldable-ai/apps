import { formatDay, formatHour, readWeatherUrlParams } from './weather-utils'
import assert from 'node:assert/strict'
import test from 'node:test'

test('formatDay treats Open-Meteo dates as local calendar dates', () => {
  const expected = new Date(2026, 5, 3).toLocaleDateString([], {
    weekday: 'short',
  })

  assert.equal(formatDay('2026-06-03', 1), expected)
})

test('formatDay preserves malformed dates', () => {
  assert.equal(formatDay('2026-02-31', 1), '2026-02-31')
  assert.equal(formatDay('not-a-date', 1), 'not-a-date')
})

test('formatDay labels the first daily forecast as Today', () => {
  assert.equal(formatDay('2026-06-03', 0), 'Today')
})

test('formatHour preserves malformed timestamps', () => {
  assert.equal(formatHour('not-a-time'), 'not-a-time')
})

test('readWeatherUrlParams accepts valid deep-link params', () => {
  assert.deepEqual(readWeatherUrlParams('?lat=45.5&lon=-73.6&unit=c'), {
    coords: '&lat=45.5&lon=-73.6',
    unitOverride: 'celsius',
  })
})

test('readWeatherUrlParams rejects out-of-range coordinates', () => {
  assert.deepEqual(readWeatherUrlParams('?lat=91&lon=0&unit=f'), {
    coords: '',
    unitOverride: 'fahrenheit',
  })
})
