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
 * 6. Generates manifest.json
 * 7. Commits all changes (but does NOT push)
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'scripts',
  '.next',
  '.turbo',
])

function exec(cmd, options = {}) {
  console.log(`  $ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...options })
}

function execQuiet(cmd, options = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: rootDir, ...options }).trim()
}

function hasChanges() {
  try {
    execSync('git diff-index --quiet HEAD --', { cwd: rootDir })
    return false
  } catch {
    return true
  }
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
    const next = versionKinds.has(versionArg)
      ? bumpSemver(current, versionArg)
      : versionArg

    updates.push({ id: app.id, manifestPath: app.manifestPath, current, next })
  }

  if (dryRun) {
    console.log(`  Would bump ${updates.length} public apps:`)
    updates
      .slice(0, 10)
      .forEach((u) => console.log(`    - ${u.id}: ${u.current} -> ${u.next}`))
    if (updates.length > 10) {
      console.log(`    ... and ${updates.length - 10} more`)
    }
    console.log('')
    return
  }

  for (const update of updates) {
    const raw = readFileSync(update.manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)
    manifest.version = update.next
    writeFileSync(update.manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  }

  console.log(`  Bumped ${updates.length} public apps\n`)
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipCopy = args.includes('--skip-copy')
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

Steps performed:
  1. Copy public apps from ~/.moldable/shared/apps
  2. Optionally bump public app versions in moldable.json
  3. Run prettier (format)
  4. Run eslint (lint)
  5. Run typescript type checking
  6. Generate manifest.json
  7. Commit all changes (does NOT push)

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
        exec('node scripts/copy-apps.js --all')
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
  if (shouldBumpVersion) {
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
  } else {
    console.log('🔢 Step 2: Skipping version bump (no version argument)\n')
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

  // Step 6: Generate manifest
  console.log('📋 Step 6: Generating manifest.json...')
  if (dryRun) {
    console.log('  Would run: pnpm generate-manifest\n')
  } else {
    try {
      exec('pnpm generate-manifest')
      console.log('')
    } catch {
      console.error('❌ Manifest generation failed')
      process.exit(1)
    }
  }

  // Step 7: Commit
  console.log('💾 Step 7: Committing changes...')
  if (dryRun) {
    const changedFiles = getChangedFiles()
    if (changedFiles.length > 0) {
      console.log('  Would commit the following files:')
      changedFiles.slice(0, 10).forEach((f) => console.log(`    - ${f}`))
      if (changedFiles.length > 10) {
        console.log(`    ... and ${changedFiles.length - 10} more`)
      }
    } else {
      console.log('  No changes to commit')
    }
    console.log('')
  } else {
    if (!hasChanges()) {
      console.log('  No changes to commit\n')
    } else {
      try {
        exec('git add -A')
        const timestamp = new Date().toISOString().split('T')[0]
        exec(`git commit -m "release: update apps (${timestamp})"`)
        console.log('')
      } catch {
        console.error('❌ Commit failed')
        process.exit(1)
      }
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
