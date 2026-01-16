#!/usr/bin/env node
/**
 * Release Script for Moldable Apps
 *
 * Usage:
 *   pnpm release              # Full release (copy, format, lint, types, manifest, commit)
 *   pnpm release --dry-run    # Show what would happen without making changes
 *   pnpm release --skip-copy  # Skip copying apps from ~/.moldable/shared/apps
 *
 * This script:
 * 1. Copies public apps from ~/.moldable/shared/apps (unless --skip-copy)
 * 2. Runs format (prettier)
 * 3. Runs lint (eslint)
 * 4. Checks types (typescript)
 * 5. Generates manifest.json
 * 6. Commits all changes (but does NOT push)
 */
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

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

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const skipCopy = args.includes('--skip-copy')

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Moldable Apps Release Script

Usage:
  pnpm release [options]

Options:
  --dry-run     Show what would happen without making changes
  --skip-copy   Skip copying apps from ~/.moldable/shared/apps

Steps performed:
  1. Copy public apps from ~/.moldable/shared/apps
  2. Run prettier (format)
  3. Run eslint (lint)
  4. Run typescript type checking
  5. Generate manifest.json
  6. Commit all changes (does NOT push)

Examples:
  pnpm release              # Full release
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
      } catch (error) {
        console.error('❌ Failed to copy apps')
        process.exit(1)
      }
    }
  } else {
    console.log('📦 Step 1: Skipping app copy (--skip-copy)\n')
  }

  // Step 2: Format
  console.log('✨ Step 2: Running prettier...')
  if (dryRun) {
    console.log('  Would run: pnpm format\n')
  } else {
    try {
      exec('pnpm format')
      console.log('')
    } catch (error) {
      console.error('❌ Format failed')
      process.exit(1)
    }
  }

  // Step 3: Lint
  console.log('🔍 Step 3: Running eslint...')
  if (dryRun) {
    console.log('  Would run: pnpm lint\n')
  } else {
    try {
      exec('pnpm lint')
      console.log('')
    } catch (error) {
      console.error('❌ Lint failed. Fix errors and try again.')
      process.exit(1)
    }
  }

  // Step 4: Type check
  console.log('📝 Step 4: Checking types...')
  if (dryRun) {
    console.log('  Would run: pnpm check-types\n')
  } else {
    try {
      exec('pnpm check-types')
      console.log('')
    } catch (error) {
      console.error('❌ Type check failed. Fix errors and try again.')
      process.exit(1)
    }
  }

  // Step 5: Generate manifest
  console.log('📋 Step 5: Generating manifest.json...')
  if (dryRun) {
    console.log('  Would run: pnpm generate-manifest\n')
  } else {
    try {
      exec('pnpm generate-manifest')
      console.log('')
    } catch (error) {
      console.error('❌ Manifest generation failed')
      process.exit(1)
    }
  }

  // Step 6: Commit
  console.log('💾 Step 6: Committing changes...')
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
      } catch (error) {
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
