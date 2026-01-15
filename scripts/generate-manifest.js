#!/usr/bin/env node
/**
 * Generate manifest.json from all moldable.json files in the apps directory.
 * Run from the root of the moldable-apps repo.
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Directories to ignore
const IGNORE_DIRS = ['node_modules', '.git', 'scripts', '.next', '.turbo']

// Categories with display info
const CATEGORIES = [
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'finance', name: 'Finance', icon: '💰' },
  { id: 'health', name: 'Health', icon: '❤️' },
  { id: 'developer', name: 'Developer Tools', icon: '🛠️' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
  { id: 'social', name: 'Social', icon: '👥' },
]

/**
 * Get the current git commit hash
 */
function getGitCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf-8' }).trim()
  } catch {
    console.warn('⚠️  Could not get git commit hash')
    return null
  }
}

function findApps(dir) {
  const apps = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue

    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      const manifestPath = join(entryPath, 'moldable.json')
      try {
        const manifestContent = readFileSync(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestContent)

        apps.push({
          id: entry,
          path: entry,
          ...manifest,
        })
      } catch {
        // No moldable.json or invalid JSON, skip
      }
    }
  }

  return apps
}

function generateManifest() {
  console.log('🔍 Scanning for apps...')

  const apps = findApps(ROOT)
  const commit = getGitCommitHash()

  console.log(`📦 Found ${apps.length} apps`)
  if (commit) {
    console.log(`📌 Commit: ${commit.substring(0, 7)}`)
  }

  // Transform apps for the manifest
  const manifestApps = apps.map((app) => ({
    id: app.id,
    name: app.name,
    version: app.version || '0.1.0',
    description: app.description || '',
    icon: app.icon || '📦',
    iconUrl: app.iconPath
      ? `https://raw.githubusercontent.com/moldable-ai/apps/main/${app.path}/${app.iconPath}`
      : null,
    widgetSize: app.widgetSize || 'medium',
    category: app.category || 'productivity',
    tags: app.tags || [],
    path: app.path,
    requiredEnv: (app.env || []).filter((e) => e.required).map((e) => e.key),
    moldableDependencies: app.moldableDependencies || {},
    commit: commit,
  }))

  // Sort by name
  manifestApps.sort((a, b) => a.name.localeCompare(b.name))

  const manifest = {
    $schema: 'https://moldable.sh/schemas/manifest.json',
    version: '1',
    generatedAt: new Date().toISOString(),
    registry: 'moldable-ai/apps',
    apps: manifestApps,
    categories: CATEGORIES,
  }

  const outputPath = join(ROOT, 'manifest.json')
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2))

  console.log(`✅ Generated manifest.json with ${manifestApps.length} apps`)
  console.log('')
  console.log('Apps:')
  for (const app of manifestApps) {
    console.log(`  ${app.icon} ${app.name} v${app.version} [${app.category}]`)
  }
}

generateManifest()
