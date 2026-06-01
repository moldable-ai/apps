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
  'update-apps.js',
)

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'update-apps-test-'))
  const source = join(root, 'source')
  const target = join(root, 'target')
  mkdirSync(source)
  mkdirSync(target)
  execFileSync('git', ['init'], { cwd: source, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: source,
  })
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: source })
  fixtures.push(root)
  return { root, source, target }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeApp(root, appId, manifest = {}) {
  const appDir = join(root, appId)
  mkdirSync(appDir, { recursive: true })
  writeJson(join(appDir, 'moldable.json'), {
    name: appId,
    version: '0.1.0',
    runtime: 'vite_hono',
    visibility: 'public',
    ...manifest,
  })
  writeJson(join(appDir, 'package.json'), {
    name: appId,
    scripts: { dev: 'vite' },
  })
  writeFileSync(join(appDir, 'src.txt'), `${appId} source\n`)
}

function commitSource(source) {
  execFileSync('git', ['add', '.'], { cwd: source })
  execFileSync('git', ['commit', '-m', 'fixture'], {
    cwd: source,
    stdio: 'ignore',
  })
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: source,
    encoding: 'utf-8',
  }).trim()
}

function runUpdate({ source, target }, args) {
  execFileSync('node', [scriptPath, ...args], {
    cwd: source,
    env: {
      ...process.env,
      MOLDABLE_APPS_SOURCE_DIR: source,
      MOLDABLE_APPS_TARGET_DIR: target,
    },
    encoding: 'utf-8',
  })
}

test('app:update stamps upstream version, commit, and file hashes', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.2.0' })
  const commit = commitSource(fixture.source)

  runUpdate(fixture, ['notes'])

  const manifest = readJson(join(fixture.target, 'notes', 'moldable.json'))
  assert.equal(manifest.modified, false)
  assert.equal(manifest.upstream.repo, 'moldable-ai/apps')
  assert.equal(manifest.upstream.path, 'notes')
  assert.equal(manifest.upstream.installedVersion, '0.2.0')
  assert.equal(manifest.upstream.installedCommit, commit)
  assert.deepEqual(Object.keys(manifest.upstream.fileHashes), [
    'package.json',
    'src.txt',
  ])
})

test('app:update refreshes baseline after replacing an existing app', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'meetings', { version: '0.3.0' })
  writeApp(fixture.target, 'meetings', {
    version: '0.2.0',
    modified: true,
  })
  writeFileSync(join(fixture.target, 'meetings', 'old.txt'), 'remove me\n')
  commitSource(fixture.source)

  runUpdate(fixture, ['meetings'])

  const manifest = readJson(join(fixture.target, 'meetings', 'moldable.json'))
  assert.equal(manifest.version, '0.3.0')
  assert.equal(manifest.modified, false)
  assert.equal(manifest.upstream.installedVersion, '0.3.0')
  assert.equal(manifest.upstream.fileHashes['old.txt'], undefined)
  assert.equal(typeof manifest.upstream.fileHashes['src.txt'], 'string')
})
