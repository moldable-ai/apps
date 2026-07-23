#!/usr/bin/env node
/**
 * Release Script for Moldable Apps
 *
 * Usage:
 *   pnpm release patch        # Bump patch version, then release
 *   pnpm release minor        # Bump minor version, then release
 *   pnpm release 1.2.3        # Set explicit version, then release
 *   pnpm release              # Full release (no version bump)
 *   pnpm release --dry-run    # Show what would happen without making changes
 *   pnpm release --skip-copy  # Skip copying apps from ~/.moldable/shared/apps
 *
 * This script:
 * 1. Copies public apps from ~/.moldable/shared/apps (unless --skip-copy)
 * 2. Optionally bumps app versions in moldable.json (patch|minor|major|<version>)
 * 3. Runs format (prettier)
 * 4. Runs lint (eslint)
 * 5. Checks types (typescript)
 * 6. Commits app source so it has a stable release commit
 * 7. Generates and commits manifest.json against that exact commit
 * 8. Backfills released versions and hashes into the local app baselines
 */
import { stampReleasedAppMetadata } from './release-metadata.js'
import { execSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const localAppsDir =
  process.env.MOLDABLE_APPS_SOURCE_DIR ||
  path.join(homedir(), '.moldable', 'shared', 'apps')
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'scripts',
  'dist',
  '.vite',
  '.turbo',
])

function exec(cmd, options = {}) {
  console.log(`  $ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...options })
}

function execQuiet(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: rootDir, ...options }).trim()
}

function getChangedFiles() {
  try {
    const staged = execQuiet('git diff --cached --name-only')
    const unstaged = execQuiet('git diff --name-only')
    const untracked = execQuiet('git ls-files --others --exclude-standard')
    return [
      ...new Set([
        ...staged.split('\n'),
        ...unstaged.split('\n'),
        ...untracked.split('\n'),
      ]),
    ].filter(Boolean)
  } catch {
    return []
  }
}

function gitStatusForPath(relativePath) {
  return execQuiet(
    `git status --porcelain=v1 --untracked-files=all -- ${shellQuote(relativePath)}`,
  )
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function getChangedPublicApps() {
  return findPublicApps().filter((app) => gitStatusForPath(app.id).length > 0)
}

function getHeadCommit() {
  return execQuiet('git rev-parse HEAD')
}

function getReleaseStatePath() {
  const gitPath = execQuiet(
    'git rev-parse --git-path moldable-release-state.json',
  )
  return path.resolve(rootDir, gitPath)
}

function readReleaseState() {
  const statePath = getReleaseStatePath()
  if (!existsSync(statePath)) return null

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf-8'))
    if (!Array.isArray(state.appIds)) throw new Error('missing appIds')
    if (state.commit !== null && typeof state.commit !== 'string') {
      throw new Error('invalid commit')
    }
    return state
  } catch (error) {
    throw new Error(
      `Invalid pending release state at ${statePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function writeReleaseState(state) {
  writeFileSync(getReleaseStatePath(), `${JSON.stringify(state, null, 2)}\n`)
}

function clearReleaseState() {
  rmSync(getReleaseStatePath(), { force: true })
}

function manifestReferencesCommit(apps, commit) {
  const manifestPath = path.join(rootDir, 'manifest.json')
  if (!existsSync(manifestPath)) return false

  try {
    const registry = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    const registryApps = new Map(registry.apps.map((app) => [app.id, app]))
    return apps.every((app) => registryApps.get(app.id)?.commit === commit)
  } catch {
    return false
  }
}

function commitPaths(paths, message) {
  if (paths.length === 0) return false

  const quotedPaths = paths.map(shellQuote).join(' ')
  exec(`git add -- ${quotedPaths}`)
  exec(
    `git commit --no-verify --only -m ${shellQuote(message)} -- ${quotedPaths}`,
  )
  return true
}

function stampLocalApps(apps, commit) {
  const installedAt = new Date().toISOString()
  let stamped = 0

  for (const app of apps) {
    const localAppDir = path.join(localAppsDir, app.id)
    if (!existsSync(path.join(localAppDir, 'moldable.json'))) {
      console.warn(`  ⚠️  Skipping ${app.id}: no local app at ${localAppDir}`)
      continue
    }

    const releasedManifest = JSON.parse(readFileSync(app.manifestPath, 'utf-8'))
    stampReleasedAppMetadata({
      appId: app.id,
      commit,
      installedAt,
      localAppDir,
      releasedVersion: releasedManifest.version || '0.1.0',
    })
    console.log(
      `  ✅ ${app.id} -> v${releasedManifest.version || '0.1.0'} @ ${commit.slice(0, 7)}`,
    )
    stamped += 1
  }

  return stamped
}

function bumpSemver(current, kind) {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)(.*)?$/)
  if (!match) {
    throw new Error(`Unsupported version format: ${current}`)
  }

  let major = Number(match[1])
  let minor = Number(match[2])
  let patch = Number(match[3])
  const suffix = match[4] || ''

  if (kind === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (kind === 'minor') {
    minor += 1
    patch = 0
  } else if (kind === 'patch') {
    patch += 1
  }

  return `${major}.${minor}.${patch}${suffix}`
}

function findPublicApps() {
  const apps = []
  const entries = readdirSync(rootDir)

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue

    const entryPath = path.join(rootDir, entry)
    const stat = statSync(entryPath)
    if (!stat.isDirectory()) continue

    const manifestPath = path.join(entryPath, 'moldable.json')
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      if (manifest.visibility !== 'public') continue
      apps.push({ id: entry, manifestPath, manifest })
    } catch {
      // Not an app or invalid JSON, skip
    }
  }

  return apps
}

function bumpAppVersions(versionArg, { dryRun }) {
  const apps = findPublicApps()
  const versionKinds = new Set(['patch', 'minor', 'major'])

  if (apps.length === 0) {
    console.log('  No public apps found to bump\n')
    return
  }

  const updates = []
  for (const app of apps) {
    const current = app.manifest.version || '0.1.0'
    const targetVersion = versionKinds.has(versionArg)
      ? bumpSemver(current, versionArg)
      : versionArg

    updates.push({
      id: app.id,
      manifestPath: app.manifestPath,
      current,
      targetVersion,
    })
  }

  if (dryRun) {
    console.log(`  Would bump ${updates.length} public apps:`)
    updates
      .slice(0, 10)
      .forEach((u) =>
        console.log(`    - ${u.id}: ${u.current} -> ${u.targetVersion}`),
      )
    if (updates.length > 10) {
      console.log(`    ... and ${updates.length - 10} more`)
    }
    console.log('')
    return
  }

  for (const update of updates) {
    const raw = readFileSync(update.manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)
    manifest.version = update.targetVersion
    writeFileSync(update.manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  }

  console.log(`  Bumped ${updates.length} public apps\n`)
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipCopy = args.includes('--skip-copy')
  const stampLocal = !args.includes('--no-stamp-local')
  const stampAllLocal = args.includes('--stamp-all-local')
  const filtered = args.filter((arg) => !arg.startsWith('--'))
  const versionArg = filtered[0]
  const shouldBumpVersion = Boolean(versionArg)
  const versionKinds = new Set(['patch', 'minor', 'major'])

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Moldable Apps Release Script

Usage:
  pnpm release [patch|minor|major|<version>] [options]

Options:
  --dry-run     Show what would happen without making changes
  --skip-copy   Skip copying apps from ~/.moldable/shared/apps
  --no-stamp-local  Do not adopt the release as the local apps' clean baseline
  --stamp-all-local  Adopt the release as every public local app's baseline

Steps performed:
  1. Copy public apps from ~/.moldable/shared/apps
  2. Optionally bump public app versions in moldable.json
  3. Run prettier (format)
  4. Run eslint (lint)
  5. Run typescript type checking
  6. Commit app source changes
  7. Generate and commit manifest.json against the app commit
  8. Backfill released versions and hashes into local apps

Examples:
  pnpm release patch        # Bump patch version, then release
  pnpm release minor        # Bump minor version, then release
  pnpm release 1.2.3        # Set explicit version, then release
  pnpm release --dry-run    # Preview changes
  pnpm release --skip-copy  # Skip app copy step
`)
    process.exit(0)
  }

  console.log('\n🚀 Moldable Apps Release\n')

  if (dryRun) {
    console.log('[DRY RUN] Would perform the following steps:\n')
  }

  // Step 1: Copy public apps
  if (!skipCopy) {
    console.log(
      '📦 Step 1: Copying public apps from ~/.moldable/shared/apps...',
    )
    if (dryRun) {
      console.log('  Would run: node scripts/copy-apps.js --all\n')
    } else {
      try {
        const copyBump = versionKinds.has(versionArg) ? ` --${versionArg}` : ''
        exec(`node scripts/copy-apps.js --all${copyBump}`)
        console.log('')
      } catch {
        console.error('❌ Failed to copy apps')
        process.exit(1)
      }
    }
  } else {
    console.log('📦 Step 1: Skipping app copy (--skip-copy)\n')
  }

  // Step 2: Optionally bump version
  if (shouldBumpVersion && (skipCopy || !versionKinds.has(versionArg))) {
    const bumpLabel = versionKinds.has(versionArg)
      ? `${versionArg}`
      : `to ${versionArg}`

    console.log(`🔢 Step 2: Bumping public app versions (${bumpLabel})...`)
    try {
      bumpAppVersions(versionArg, { dryRun })
    } catch (error) {
      console.error('❌ Version bump failed')
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`,
      )
      process.exit(1)
    }
  } else if (!shouldBumpVersion) {
    console.log('🔢 Step 2: Skipping version bump (no version argument)\n')
  } else {
    console.log('🔢 Step 2: Versions bumped conditionally during copy\n')
  }

  // Step 3: Format
  console.log('✨ Step 3: Running prettier...')
  if (dryRun) {
    console.log('  Would run: pnpm format\n')
  } else {
    try {
      exec('pnpm format')
      console.log('')
    } catch {
      console.error('❌ Format failed')
      process.exit(1)
    }
  }

  // Step 4: Lint
  console.log('🔍 Step 4: Running eslint...')
  if (dryRun) {
    console.log('  Would run: pnpm lint\n')
  } else {
    try {
      exec('pnpm lint')
      console.log('')
    } catch {
      console.error('❌ Lint failed. Fix errors and try again.')
      process.exit(1)
    }
  }

  // Step 5: Type check
  console.log('📝 Step 5: Checking types...')
  if (dryRun) {
    console.log('  Would run: pnpm check-types\n')
  } else {
    try {
      exec('pnpm check-types')
      console.log('')
    } catch {
      console.error('❌ Type check failed. Fix errors and try again.')
      process.exit(1)
    }
  }

  const discoveredChangedApps = getChangedPublicApps()
  const pendingState = dryRun ? null : readReleaseState()
  const publicAppsById = new Map(findPublicApps().map((app) => [app.id, app]))
  const changedApps = pendingState
    ? pendingState.appIds.map((appId) => {
        const app = publicAppsById.get(appId)
        if (!app) {
          throw new Error(
            `Pending release app '${appId}' is no longer a public app. Resolve or remove ${getReleaseStatePath()} manually.`,
          )
        }
        return app
      })
    : discoveredChangedApps
  const timestamp = new Date().toISOString().split('T')[0]

  if (pendingState && discoveredChangedApps.length > 0) {
    const pendingIds = new Set(pendingState.appIds)
    const unexpected = discoveredChangedApps.filter(
      (app) => !pendingIds.has(app.id),
    )
    if (unexpected.length > 0) {
      console.error(
        `❌ Finish the pending release before adding new app changes: ${unexpected.map((app) => app.id).join(', ')}`,
      )
      process.exit(1)
    }
  }

  // Step 6: Commit app content before generating the registry. A registry
  // commit can only safely reference content that already exists in Git.
  console.log('💾 Step 6: Committing app source changes...')
  if (dryRun) {
    const changedFiles = getChangedFiles().filter((file) =>
      changedApps.some(
        (app) => file === app.id || file.startsWith(`${app.id}/`),
      ),
    )
    if (changedFiles.length > 0) {
      console.log('  Would commit the following app files:')
      changedFiles.slice(0, 10).forEach((file) => console.log(`    - ${file}`))
      if (changedFiles.length > 10) {
        console.log(`    ... and ${changedFiles.length - 10} more`)
      }
    } else {
      console.log('  No app changes to commit')
    }
    console.log('')
  } else {
    if (!pendingState && gitStatusForPath('manifest.json')) {
      console.error('❌ manifest.json already has uncommitted changes.')
      console.error(
        '   Restore it, then rerun release so the manifest can be generated after the app commit.',
      )
      process.exit(1)
    }

    try {
      if (pendingState?.commit) {
        console.log(
          `  Resuming app source commit ${pendingState.commit.slice(0, 7)}\n`,
        )
      } else if (changedApps.length > 0) {
        if (!pendingState) {
          writeReleaseState({
            appIds: changedApps.map((app) => app.id),
            commit: null,
          })
        }
        commitPaths(
          changedApps.map((app) => app.id),
          `release: update app sources (${timestamp})`,
        )
        writeReleaseState({
          appIds: changedApps.map((app) => app.id),
          commit: getHeadCommit(),
        })
        console.log('')
      } else {
        console.log('  No app changes to commit\n')
      }
    } catch {
      console.error('❌ App source commit failed')
      process.exit(1)
    }
  }

  const releaseState = dryRun ? null : readReleaseState()
  const appContentCommit = dryRun
    ? null
    : releaseState?.commit || getHeadCommit()
  const appsToStamp = stampAllLocal ? findPublicApps() : changedApps

  // Step 7: Generate the manifest only after the source commit exists, then
  // commit the derived registry separately. Its entries keep pointing to the
  // app-content commit rather than to an earlier, unrelated tree.
  console.log('📋 Step 7: Generating and committing manifest.json...')
  if (dryRun) {
    console.log('  Would generate manifest.json from the app content commit')
    console.log('  Would commit manifest.json separately\n')
  } else {
    try {
      if (
        releaseState?.commit &&
        manifestReferencesCommit(changedApps, releaseState.commit)
      ) {
        console.log(
          `  Reusing manifest for app commit ${releaseState.commit.slice(0, 7)}`,
        )
      } else {
        exec('pnpm generate-manifest')
      }
      if (gitStatusForPath('manifest.json')) {
        commitPaths(
          ['manifest.json'],
          `release: update app registry (${timestamp})`,
        )
      } else {
        console.log('  Manifest unchanged')
      }
      console.log('')
    } catch {
      console.error('❌ Manifest generation or commit failed')
      process.exit(1)
    }
  }

  // Step 8: The local source apps authored this release, so record the exact
  // released version and content commit as their new clean baseline.
  console.log('🔗 Step 8: Backfilling local release baselines...')
  if (!stampLocal) {
    console.log('  Skipped (--no-stamp-local)\n')
    if (!dryRun) clearReleaseState()
  } else if (dryRun) {
    console.log(
      `  Would stamp ${appsToStamp.length} local app(s) with released versions, hashes, and the app content commit\n`,
    )
  } else if (appsToStamp.length === 0) {
    console.log('  No changed local apps to stamp\n')
  } else {
    try {
      const stamped = stampLocalApps(appsToStamp, appContentCommit)
      console.log(`  Stamped ${stamped} local app(s)\n`)
      clearReleaseState()
    } catch (error) {
      console.error('❌ Release commits succeeded, but local backfill failed')
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`,
      )
      process.exit(1)
    }
  }

  // Done
  console.log('✅ Release complete!\n')

  if (!dryRun) {
    console.log('Next steps:')
    console.log('  git push origin main')
    console.log('')
  }
}

main()
