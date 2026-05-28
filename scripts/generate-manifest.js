#!/usr/bin/env node
/**
 * Generate manifest.json from all moldable.json files in the apps directory.
 * Run from the root of the moldable-apps repo.
 */
import { execSync } from 'child_process'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'scripts',
  'dist',
  '.vite',
  '.turbo',
]

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
    return execSync('git rev-parse HEAD', {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim()
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
  const RAW_BASE = 'https://raw.githubusercontent.com/moldable-ai/apps/main'
  const manifestApps = apps.map((app) => {
    // Apps declare secrets via either `vault` or legacy `env`.
    const secrets = app.vault || app.env || []
    const required = secrets.filter((e) => e.required)

    // Long-form, store-facing markdown lives in STORE.md at the app root.
    let about = null
    try {
      about = readFileSync(join(ROOT, app.path, 'STORE.md'), 'utf-8').trim()
    } catch {
      // No STORE.md, leave null
    }

    return {
      id: app.id,
      name: app.name,
      version: app.version || '0.1.0',
      description: app.description || '',
      author: app.author || 'Moldable Team',
      icon: app.icon || '📦',
      iconUrl: app.iconPath
        ? `${RAW_BASE}/${app.path}/${app.iconPath}`
        : null,
      screenshots: (app.screenshots || []).map(
        (rel) => `${RAW_BASE}/${app.path}/${rel}`,
      ),
      about,
      widgetSize: app.widgetSize || 'medium',
      category: app.category || 'productivity',
      tags: app.tags || [],
      path: app.path,
      requiredEnv: required.map((e) => e.key),
      credentials: required.map((e) => ({
        key: e.key,
        name: e.name || e.key,
        description: e.description || '',
        url: e.url || null,
      })),
      moldableDependencies: app.moldableDependencies || {},
      commit: commit,
    }
  })

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
