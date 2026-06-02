import { reciprocal, toggleSign } from './client/lib/keypad'
import { CalcError, evaluate, formatResult } from './lib/calc'
import { ConvertError, convert } from './lib/units'
import { app } from './server/app'
import assert from 'node:assert/strict'

function assertApprox(actual: number, expected: number, epsilon = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

function assertThrowsCalc(fn: () => unknown, message: RegExp) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof CalcError)
    assert.match(error.message, message)
    return true
  })
}

function assertThrowsConvert(fn: () => unknown, message: RegExp) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ConvertError)
    assert.match(error.message, message)
    return true
  })
}

assert.equal(evaluate('-2^2'), -4)
assert.equal(evaluate('(-2)^2'), 4)
assert.equal(evaluate('2^-2'), 0.25)
assert.equal(evaluate('2--3'), 5)
assert.equal(evaluate('--2'), 2)
assert.equal(evaluate('---2'), -2)
assert.equal(evaluate('2^3^2'), 512)
assert.equal(evaluate('2*-3'), -6)
assert.equal(evaluate('-3!'), -6)
assert.equal(evaluate('3!!'), 720)
assert.equal(evaluate('2^3!'), 64)
assert.equal(evaluate('1e−3'), 0.001)
assert.equal(evaluate('1E+3'), 1000)
assert.equal(evaluate('5%2'), 1)
assertApprox(evaluate('sin(30)', 'deg'), 0.5)
assert.equal(formatResult(evaluate('sin(90)^2+cos(90)^2', 'deg')), '1')
assertThrowsCalc(() => evaluate('1/0'), /Division by zero/)
assertThrowsCalc(() => evaluate('5%0'), /Modulo by zero/)
assertThrowsCalc(() => evaluate('tan(90)'), /undefined/)
assertThrowsCalc(() => evaluate('asin(2)'), /-1 to 1/)
assertThrowsCalc(() => evaluate('ln(0)'), /positive/)
assertThrowsCalc(() => evaluate('sqrt(-1)'), /non-negative/)
assertThrowsCalc(() => evaluate('1.2.3'), /Malformed number/)

assert.equal(toggleSign('1e-3'), '-1e-3')
assert.equal(toggleSign('-1e-3'), '1e-3')
assert.equal(toggleSign('1e−3'), '-1e−3')
assert.equal(toggleSign('2-3'), '2--3')
assert.equal(toggleSign('2--3'), '2-3')
assert.equal(reciprocal(''), '1/(')
assert.equal(reciprocal('2'), '1/(2)')
assert.equal(evaluate(reciprocal('2+3')), 0.2)

assert.equal(convert(1, 'm', 'cm', 'length').result, 100)
assert.equal(convert(32, 'F', 'C', 'temperature').result, 0)
assert.equal(
  convert(1, 'USD', 'EUR', 'currency', { USD: 1, EUR: 0.9 }).result,
  0.9,
)
assertThrowsConvert(() => convert(1, 'm', 'USD'), /Unknown unit "USD"/)

const invalidHistoryResponse = await app.fetch(
  new Request('http://calculator.test/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  }),
)
assert.equal(invalidHistoryResponse.status, 400)

console.log('calculator tests passed')
