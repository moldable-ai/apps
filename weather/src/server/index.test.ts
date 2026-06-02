import { resolveStaticFilePath } from './index'
import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

test('static file resolution keeps asset paths inside dist', () => {
  const resolved = resolveStaticFilePath('/assets/app.js')

  assert.equal(
    resolved,
    path.resolve(process.cwd(), 'dist', 'assets', 'app.js'),
  )
})

test('static file resolution rejects traversal outside dist', () => {
  assert.equal(resolveStaticFilePath('/../package.json'), null)
  assert.equal(resolveStaticFilePath('/assets/../../package.json'), null)
})

test('extensionless app routes resolve to index.html', () => {
  assert.equal(
    resolveStaticFilePath('/forecast'),
    path.resolve(process.cwd(), 'dist', 'index.html'),
  )
})
