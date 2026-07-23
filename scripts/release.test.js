import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const sourceScripts = dirname(fileURLToPath(import.meta.url))
const fixtures = []

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function writeApp(root, appId, version, source = 'export {}\n') {
  const appDir = join(root, appId)
  mkdirSync(join(appDir, 'src'), { recursive: true })
  writeJson(join(appDir, 'moldable.json'), {
    name: appId,
    version,
    runtime: 'vite_hono',
    visibility: 'public',
    category: 'productivity',
  })
  writeJson(join(appDir, 'package.json'), {
    name: appId,
    scripts: { dev: 'vite' },
  })
  writeFileSync(join(appDir, 'src', 'app.ts'), source)
}

test('release commits app content before its manifest and backfills the local baseline', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'release-test-'))
  fixtures.push(fixture)
  const repo = join(fixture, 'repo')
  const localApps = join(fixture, 'local-apps')
  const scripts = join(repo, 'scripts')
  const bin = join(fixture, 'bin')
  mkdirSync(scripts, { recursive: true })
  mkdirSync(localApps)
  mkdirSync(bin)

  for (const name of [
    'generate-manifest.js',
    'release.js',
    'release-metadata.js',
  ]) {
    copyFileSync(join(sourceScripts, name), join(scripts, name))
  }
  writeJson(join(repo, 'package.json'), { type: 'module' })
  const fakePnpm = join(bin, 'pnpm')
  writeFileSync(
    fakePnpm,
    `#!/bin/sh
if [ "$1" = "generate-manifest" ]; then
  if [ -n "$MOLDABLE_RELEASE_TEST_FAIL_ONCE" ] && [ ! -e "$MOLDABLE_RELEASE_TEST_FAIL_ONCE" ]; then
    touch "$MOLDABLE_RELEASE_TEST_FAIL_ONCE"
    exit 1
  fi
  exec node scripts/generate-manifest.js
fi
exit 0
`,
  )
  chmodSync(fakePnpm, 0o755)

  writeApp(repo, 'notes', '1.0.0')
  writeApp(repo, 'tasks', '2.0.0')
  writeApp(localApps, 'notes', '0.9.0', 'export const local = true\n')
  writeApp(localApps, 'tasks', '1.0.0')
  execFileSync('git', ['init'], { cwd: repo, stdio: 'ignore' })
  execFileSync('git', ['config', 'user.email', 'test@example.com'], {
    cwd: repo,
  })
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: repo })
  execFileSync('git', ['add', '.'], { cwd: repo })
  execFileSync('git', ['commit', '-m', 'initial'], {
    cwd: repo,
    stdio: 'ignore',
  })

  writeApp(repo, 'notes', '1.0.1', 'export const released = true\n')
  const failOnce = join(fixture, 'fail-once')
  const releaseOptions = {
    cwd: repo,
    env: {
      ...process.env,
      MOLDABLE_RELEASE_TEST_FAIL_ONCE: failOnce,
      MOLDABLE_APPS_SOURCE_DIR: localApps,
      PATH: `${bin}:${process.env.PATH}`,
    },
    stdio: 'ignore',
  }
  assert.throws(() =>
    execFileSync(
      'node',
      [join(scripts, 'release.js'), '--skip-copy', '--stamp-all-local'],
      releaseOptions,
    ),
  )
  execFileSync(
    'node',
    [join(scripts, 'release.js'), '--skip-copy', '--stamp-all-local'],
    releaseOptions,
  )

  const commits = execFileSync('git', ['log', '--format=%H', '-3'], {
    cwd: repo,
    encoding: 'utf-8',
  })
    .trim()
    .split('\n')
  assert.equal(commits.length, 3)
  const appContentCommit = commits[1]
  const registry = JSON.parse(
    readFileSync(join(repo, 'manifest.json'), 'utf-8'),
  )
  assert.equal(registry.apps[0].commit, appContentCommit)

  const localManifest = JSON.parse(
    readFileSync(join(localApps, 'notes', 'moldable.json'), 'utf-8'),
  )
  assert.equal(localManifest.version, '1.0.1')
  assert.equal(localManifest.modified, false)
  assert.equal(localManifest.upstream.installedVersion, '1.0.1')
  assert.equal(localManifest.upstream.installedCommit, appContentCommit)
  assert.equal(
    typeof localManifest.upstream.fileHashes['moldable.json'],
    'string',
  )

  const unchangedLocalManifest = JSON.parse(
    readFileSync(join(localApps, 'tasks', 'moldable.json'), 'utf-8'),
  )
  assert.equal(unchangedLocalManifest.version, '2.0.0')
  assert.equal(unchangedLocalManifest.upstream.installedVersion, '2.0.0')
  assert.equal(
    unchangedLocalManifest.upstream.installedCommit,
    appContentCommit,
  )
})
