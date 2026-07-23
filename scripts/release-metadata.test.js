import {
  computeAppFileHashes,
  stampReleasedAppMetadata,
} from './release-metadata.js'
import assert from 'node:assert/strict'
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

const fixtures = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function makeApp() {
  const appDir = mkdtempSync(join(tmpdir(), 'release-metadata-test-'))
  fixtures.push(appDir)
  mkdirSync(join(appDir, 'src'))
  writeFileSync(
    join(appDir, 'moldable.json'),
    `${JSON.stringify({ name: 'Notes', version: '0.1.0' }, null, 2)}\n`,
  )
  writeFileSync(join(appDir, 'package.json'), '{"scripts":{"dev":"vite"}}\n')
  writeFileSync(join(appDir, 'src', 'app.ts'), 'export {}\n')
  writeFileSync(join(appDir, '.moldable.port'), '4321\n')
  return appDir
}

test('stamps the released version and a baseline that includes app-authored manifest fields', () => {
  const appDir = makeApp()
  const commit = 'b'.repeat(40)

  const manifest = stampReleasedAppMetadata({
    appId: 'notes',
    commit,
    localAppDir: appDir,
    releasedVersion: '0.2.0',
  })

  assert.equal(manifest.version, '0.2.0')
  assert.equal(manifest.modified, false)
  assert.equal(manifest.upstream.installedVersion, '0.2.0')
  assert.equal(manifest.upstream.installedCommit, commit)
  assert.equal(typeof manifest.upstream.fileHashes['moldable.json'], 'string')
  assert.equal(manifest.upstream.fileHashes['.moldable.port'], undefined)
  assert.deepEqual(computeAppFileHashes(appDir), manifest.upstream.fileHashes)
})

test('manifest hashing ignores installer metadata and JSON key order', () => {
  const appDir = makeApp()
  const before = computeAppFileHashes(appDir)['moldable.json']
  const manifestPath = join(appDir, 'moldable.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  writeFileSync(
    manifestPath,
    JSON.stringify({
      upstream: { installedCommit: 'old' },
      version: manifest.version,
      name: manifest.name,
      modified: true,
    }),
  )

  const after = computeAppFileHashes(appDir)['moldable.json']
  assert.equal(after, before)
})
