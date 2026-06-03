import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
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
  'copy-apps.js',
)

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'copy-apps-test-'))
  const source = join(root, 'source')
  const target = join(root, 'target')
  mkdirSync(source)
  mkdirSync(target)
  fixtures.push(root)
  return {
    root,
    source,
    target,
  }
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeApp(root, appId, manifest = {}, packageJson = {}) {
  const appDir = join(root, appId)
  rmSync(appDir, { recursive: true, force: true })
  mkdirSync(appDir, { recursive: true })
  writeFileSync(join(appDir, '.keep'), '')
  writeJson(join(appDir, 'moldable.json'), {
    name: appId,
    version: '0.1.0',
    runtime: 'vite_hono',
    visibility: 'public',
    ...manifest,
  })
  writeJson(join(appDir, 'package.json'), {
    name: appId,
    version: '0.1.0',
    ...packageJson,
  })
  writeFileSync(join(appDir, 'src.txt'), `source ${appId}\n`)
  return appDir
}

function runCopy({ source, target }, args, env = {}) {
  execFileSync('node', [scriptPath, ...args], {
    cwd: target,
    env: {
      ...process.env,
      MOLDABLE_APPS_SOURCE_DIR: source,
      MOLDABLE_APPS_TARGET_DIR: target,
      MOLDABLE_APPS_SKIP_FORMAT: '1',
      ...env,
    },
    encoding: 'utf-8',
  })
}

test('--all --patch copies public apps and bumps from the previous target manifest version', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.4.0' })
  const sourceApp = join(fixture.source, 'notes')
  writeFileSync(join(sourceApp, '.gitignore'), 'ignored.txt\n')
  writeFileSync(join(sourceApp, 'ignored.txt'), 'ignore me\n')
  writeApp(fixture.target, 'notes', { version: '1.2.3' }, { version: '9.9.9' })
  writeFileSync(join(fixture.target, 'notes', 'stale.txt'), 'remove me\n')

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'notes', 'moldable.json')).version,
    '1.2.4',
  )
  assert.equal(
    readJson(join(fixture.target, 'notes', 'package.json')).version,
    '9.9.9',
  )
  assert.equal(existsSync(join(fixture.target, 'notes', 'stale.txt')), false)
  assert.equal(existsSync(join(fixture.target, 'notes', 'ignored.txt')), false)
})

test('--patch bumps new apps from their copied source manifest version', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'calculator', { version: '0.1.0' })

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'calculator', 'moldable.json')).version,
    '0.1.1',
  )
})

test('--patch preserves the target version when only versions changed', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.4.0' }, { version: '7.7.7' })
  writeApp(fixture.target, 'notes', { version: '1.2.3' }, { version: '9.9.9' })

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'notes', 'moldable.json')).version,
    '1.2.3',
  )
  assert.equal(
    readJson(join(fixture.target, 'notes', 'package.json')).version,
    '9.9.9',
  )
})

test('--patch ignores app-specific ignored files when detecting changes', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.4.0' })
  writeFileSync(join(fixture.source, 'notes', '.gitignore'), 'local-cache\n')
  writeApp(fixture.target, 'notes', { version: '1.2.3' })
  writeFileSync(join(fixture.target, 'notes', '.gitignore'), 'local-cache\n')
  writeFileSync(join(fixture.target, 'notes', 'local-cache'), 'generated\n')

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'notes', 'moldable.json')).version,
    '1.2.3',
  )
})

test('--patch checks for changes after formatting copied app files', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.4.0' })
  writeFileSync(join(fixture.source, 'notes', 'src.txt'), 'same app code   \n')
  writeApp(fixture.target, 'notes', { version: '1.2.3' })
  writeFileSync(join(fixture.target, 'notes', 'src.txt'), 'same app code\n')

  const binDir = join(fixture.root, 'bin')
  mkdirSync(binDir)
  const fakePnpm = join(binDir, 'pnpm')
  writeFileSync(
    fakePnpm,
    `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const appPath = process.argv[4]
const file = join(appPath, 'src.txt')
writeFileSync(file, readFileSync(file, 'utf-8').trimEnd() + '\\n')
`,
  )
  chmodSync(fakePnpm, 0o755)

  runCopy(fixture, ['--all', '--patch'], {
    MOLDABLE_APPS_SKIP_FORMAT: '',
    PATH: `${binDir}:${process.env.PATH}`,
  })

  assert.equal(
    readJson(join(fixture.target, 'notes', 'moldable.json')).version,
    '1.2.3',
  )
})

test('--patch bumps the target version when app files changed', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'notes', { version: '0.4.0' })
  writeFileSync(join(fixture.source, 'notes', 'src.txt'), 'changed app code\n')
  writeApp(fixture.target, 'notes', { version: '1.2.3' })

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'notes', 'moldable.json')).version,
    '1.2.4',
  )
  assert.equal(
    readFileSync(join(fixture.target, 'notes', 'src.txt'), 'utf-8'),
    'changed app code\n',
  )
})

test('minor and major bumps are also conditional on app file changes', () => {
  const minorFixture = makeFixture()
  writeApp(minorFixture.source, 'notes', { version: '0.4.0' })
  writeFileSync(
    join(minorFixture.source, 'notes', 'src.txt'),
    'changed app code\n',
  )
  writeApp(minorFixture.target, 'notes', { version: '1.2.3' })

  runCopy(minorFixture, ['--all', '--minor'])

  assert.equal(
    readJson(join(minorFixture.target, 'notes', 'moldable.json')).version,
    '1.3.0',
  )

  const majorFixture = makeFixture()
  writeApp(majorFixture.source, 'tasks', { version: '0.4.0' })
  writeApp(majorFixture.target, 'tasks', { version: '1.2.3' })

  runCopy(majorFixture, ['--all', '--major'])

  assert.equal(
    readJson(join(majorFixture.target, 'tasks', 'moldable.json')).version,
    '1.2.3',
  )
})

test('--all skips private apps even when a version bump is requested', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'guitar', {
    version: '0.1.0',
    visibility: 'private',
  })

  runCopy(fixture, ['--all', '--patch'])

  assert.equal(existsSync(join(fixture.target, 'guitar')), false)
})

test('explicit app copy bypasses visibility and can patch a private app', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'guitar', {
    version: '0.1.0',
    visibility: 'private',
  })

  runCopy(fixture, ['guitar', '--patch'])

  assert.equal(
    readJson(join(fixture.target, 'guitar', 'moldable.json')).version,
    '0.1.1',
  )
})

test('copy without a bump preserves the previous target manifest version', () => {
  const fixture = makeFixture()
  writeApp(fixture.source, 'tasks', { version: '0.4.0' })
  writeApp(fixture.target, 'tasks', { version: '2.0.0' })

  runCopy(fixture, ['--all'])

  assert.equal(
    readJson(join(fixture.target, 'tasks', 'moldable.json')).version,
    '2.0.0',
  )
})

test('redecorate copy includes seeded preset thumbnails and excludes generation scratch files', () => {
  const fixture = makeFixture()
  const sourceApp = writeApp(fixture.source, 'redecorate', { version: '0.4.0' })
  mkdirSync(join(sourceApp, 'src', 'shared'), { recursive: true })
  writeFileSync(
    join(sourceApp, 'src', 'shared', 'catalog.ts'),
    `export const STYLE_PRESETS = [{ "id": "interior-modern" }]\n`,
  )
  mkdirSync(join(sourceApp, 'public', 'styles', '.generation'), {
    recursive: true,
  })
  writeFileSync(join(sourceApp, 'public', 'styles', 'README.md'), 'seed docs\n')
  writeFileSync(
    join(sourceApp, 'public', 'styles', 'interior-modern.webp'),
    'seed image\n',
  )
  writeFileSync(
    join(sourceApp, 'public', 'styles', 'personal-style.webp'),
    'do not ship\n',
  )
  writeFileSync(
    join(sourceApp, 'public', 'styles', '.generation', 'runs.jsonl'),
    'scratch\n',
  )
  writeFileSync(
    join(sourceApp, 'public', 'styles', '.generation', 'oauth-probe.webp'),
    'probe\n',
  )

  runCopy(fixture, ['redecorate'])

  const targetApp = join(fixture.target, 'redecorate')
  assert.equal(
    existsSync(join(targetApp, 'public', 'styles', 'interior-modern.webp')),
    true,
  )
  assert.equal(
    existsSync(join(targetApp, 'public', 'styles', 'README.md')),
    true,
  )
  assert.equal(
    existsSync(join(targetApp, 'public', 'styles', 'personal-style.webp')),
    false,
  )
  assert.equal(
    existsSync(join(targetApp, 'public', 'styles', '.generation')),
    false,
  )
})
