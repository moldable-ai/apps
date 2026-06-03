import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const fixtures = []
const scriptPath = join(
  fileURLToPath(new URL('.', import.meta.url)),
  'generate-manifest.js',
)

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'generate-manifest-test-'))
  fixtures.push(root)
  return root
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function writeApp(root, appId, manifest = {}) {
  const appDir = join(root, appId)
  mkdirSync(appDir, { recursive: true })
  writeJson(join(appDir, 'moldable.json'), {
    name: appId,
    version: '0.1.0',
    runtime: 'vite_hono',
    visibility: 'public',
    description: `${appId} description`,
    author: 'Someone',
    category: 'productivity',
    ...manifest,
  })
}

function runGenerate(root) {
  execFileSync('node', [scriptPath], {
    cwd: root,
    env: {
      ...process.env,
      MOLDABLE_APPS_MANIFEST_ROOT: root,
    },
    encoding: 'utf-8',
  })
  return JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf-8'))
}

test('generate-manifest includes public apps and excludes private apps', () => {
  const root = makeFixture()
  writeApp(root, 'notes', {
    name: 'Notes',
    visibility: 'public',
  })
  writeApp(root, 'calculator', {
    name: 'Calculator',
    visibility: 'private',
  })

  const manifest = runGenerate(root)

  assert.deepEqual(
    manifest.apps.map((app) => app.id),
    ['notes'],
  )
})

test('generate-manifest excludes apps without explicit public visibility', () => {
  const root = makeFixture()
  writeApp(root, 'draft-app', {
    name: 'Draft App',
    visibility: undefined,
  })

  const manifest = runGenerate(root)

  assert.deepEqual(manifest.apps, [])
})

test('generate-manifest marks first-party app ids as official', () => {
  const root = makeFixture()
  writeApp(root, 'plants', { name: 'Plants', author: '' })
  writeApp(root, 'redecorate', { name: 'Redecorate', author: 'Someone' })

  const manifest = runGenerate(root)
  const byId = new Map(manifest.apps.map((app) => [app.id, app]))

  assert.equal(byId.get('plants')?.official, true)
  assert.equal(byId.get('plants')?.author, 'Moldable')
  assert.equal(byId.get('redecorate')?.official, true)
  assert.equal(byId.get('redecorate')?.author, 'Moldable')
})
