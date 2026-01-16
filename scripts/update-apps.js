#!/usr/bin/env node
/**
 * Update local apps from the moldable-apps repo (reverse of copy-apps.js)
 *
 * Usage:
 *   pnpm app:update scribo          # Update single app
 *   pnpm app:update scribo notes    # Update multiple apps
 *   pnpm app:update --all           # Update all apps that exist locally
 *
 * This syncs changes FROM ~/moldable-apps TO ~/.moldable/shared/apps
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'fs'
import { homedir } from 'os'
import { basename, join } from 'path'

const SOURCE_DIR = join(homedir(), 'moldable-apps')
const TARGET_DIR = join(homedir(), '.moldable', 'shared', 'apps')

// Files/folders to preserve in the target (not overwrite from source)
const PRESERVE = ['node_modules', '.next', '.turbo', 'pnpm-lock.yaml']

// Files that only exist in the repo, not in local apps
const REPO_ONLY = [
  '.git',
  '.github',
  'manifest.json',
  'scripts',
  'AGENTS.md',
  'README.md',
  'LICENSE',
]

/**
 * Check if a path should be preserved (not deleted/overwritten)
 */
function shouldPreserve(name) {
  return PRESERVE.includes(name)
}

/**
 * Check if a path is repo-only (shouldn't be copied to local apps)
 */
function isRepoOnly(name) {
  return REPO_ONLY.includes(name)
}

function updateApp(appId) {
  const sourceApp = join(SOURCE_DIR, appId)
  const targetApp = join(TARGET_DIR, appId)

  if (!existsSync(sourceApp)) {
    console.error(`❌ App '${appId}' not found in ${SOURCE_DIR}`)
    return false
  }

  // Check if this is actually an app directory (has moldable.json)
  if (!existsSync(join(sourceApp, 'moldable.json'))) {
    console.error(`❌ '${appId}' is not a valid app (no moldable.json)`)
    return false
  }

  console.log(`📦 Updating ${appId}...`)
  console.log(`   From: ${sourceApp}`)
  console.log(`   To:   ${targetApp}`)

  // If target doesn't exist, just copy the whole thing
  if (!existsSync(targetApp)) {
    console.log(`   Creating new app directory...`)
    cpSync(sourceApp, targetApp, { recursive: true })
    console.log(`   ✅ Done (new app)`)
    return true
  }

  // Remove files in target that aren't in source (except preserved ones)
  const targetEntries = readdirSync(targetApp)
  for (const entry of targetEntries) {
    if (shouldPreserve(entry)) continue
    const sourceEntry = join(sourceApp, entry)
    const targetEntry = join(targetApp, entry)
    if (!existsSync(sourceEntry)) {
      console.log(`   Removing: ${entry}`)
      rmSync(targetEntry, { recursive: true, force: true })
    }
  }

  // Copy from source to target (except preserved items in target)
  cpSync(sourceApp, targetApp, {
    recursive: true,
    filter: (src) => {
      const name = basename(src)
      // Don't overwrite preserved items
      if (shouldPreserve(name) && existsSync(join(targetApp, name))) {
        return false
      }
      return true
    },
  })

  console.log(`   ✅ Done`)
  return true
}

function listRepoApps() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`)
    return []
  }

  return readdirSync(SOURCE_DIR).filter((name) => {
    if (isRepoOnly(name)) return false
    const fullPath = join(SOURCE_DIR, name)
    if (!statSync(fullPath).isDirectory()) return false
    if (name.startsWith('.')) return false
    // Must have moldable.json to be an app
    return existsSync(join(fullPath, 'moldable.json'))
  })
}

function listLocalApps() {
  if (!existsSync(TARGET_DIR)) {
    return []
  }

  return readdirSync(TARGET_DIR).filter((name) => {
    const fullPath = join(TARGET_DIR, name)
    if (!statSync(fullPath).isDirectory()) return false
    if (name.startsWith('.')) return false
    return existsSync(join(fullPath, 'moldable.json'))
  })
}

function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    const repoApps = listRepoApps()
    const localApps = listLocalApps()
    console.log('Usage: pnpm app:update <app-id> [app-id...] | --all')
    console.log('')
    console.log('This updates ~/.moldable/shared/apps FROM ~/moldable-apps')
    console.log('')
    console.log('Apps in repo:')
    if (repoApps.length === 0) {
      console.log('  (none found)')
    } else {
      repoApps.forEach((app) => {
        const existsLocally = localApps.includes(app)
        console.log(`  - ${app}${existsLocally ? '' : ' (new)'}`)
      })
    }
    console.log('')
    console.log(`Preserved during update: ${PRESERVE.join(', ')}`)
    process.exit(1)
  }

  if (!existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`)
    process.exit(1)
  }

  if (!existsSync(TARGET_DIR)) {
    console.error(`❌ Target directory not found: ${TARGET_DIR}`)
    console.error('   Make sure Moldable is installed.')
    process.exit(1)
  }

  let appsToUpdate = args.filter((a) => !a.startsWith('--'))

  if (args.includes('--all')) {
    appsToUpdate = listRepoApps()
    if (appsToUpdate.length === 0) {
      console.log('No apps found to update.')
      process.exit(0)
    }
    console.log(`Updating ${appsToUpdate.length} apps...\n`)
  }

  let success = 0
  let failed = 0

  for (const appId of appsToUpdate) {
    if (updateApp(appId)) {
      success++
    } else {
      failed++
    }
  }

  console.log('')
  console.log(
    `✨ Updated ${success} app(s)${failed > 0 ? `, ${failed} failed` : ''}`,
  )
}

main()
