import { isLocation } from './weather'
import assert from 'node:assert/strict'
import test from 'node:test'

test('isLocation accepts finite coordinates within valid ranges', () => {
  assert.equal(isLocation({ latitude: 45.5017, longitude: -73.5673 }), true)
})

test('isLocation rejects invalid coordinate values', () => {
  assert.equal(isLocation({ latitude: Number.NaN, longitude: 0 }), false)
  assert.equal(isLocation({ latitude: Infinity, longitude: 0 }), false)
  assert.equal(isLocation({ latitude: 91, longitude: 0 }), false)
  assert.equal(isLocation({ latitude: 0, longitude: -181 }), false)
})
