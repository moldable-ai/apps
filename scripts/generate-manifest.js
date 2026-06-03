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
const ROOT = process.env.MOLDABLE_APPS_MANIFEST_ROOT || join(__dirname, '..')

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'scripts',
  'dist',
  '.vite',
  '.turbo',
]

// Canonical app categories — modeled on the Apple App Store taxonomy so apps
// map to a known, fixed set instead of inventing their own. Ordered so the
// categories we actually use surface first; the store only renders non-empty
// ones. Keep this list in sync with scripts/lint-moldable-app.js in the
// moldable repo (the per-app validator that rejects unknown categories).
const CATEGORIES = [
  { id: 'productivity', name: 'Productivity', icon: '⚡' },
  { id: 'developer-tools', name: 'Developer Tools', icon: '🛠️' },
  { id: 'education', name: 'Education', icon: '🎓' },
  { id: 'graphics-design', name: 'Graphics & Design', icon: '🎨' },
  { id: 'photo-video', name: 'Photo & Video', icon: '🎬' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'health-fitness', name: 'Health & Fitness', icon: '❤️' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'reference', name: 'Reference', icon: '📚' },
  { id: 'entertainment', name: 'Entertainment', icon: '🍿' },
  { id: 'finance', name: 'Finance', icon: '💰' },
  { id: 'games', name: 'Games', icon: '🎮' },
  { id: 'lifestyle', name: 'Lifestyle', icon: '🌿' },
  { id: 'medical', name: 'Medical', icon: '🩺' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'social-networking', name: 'Social Networking', icon: '💬' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'utilities', name: 'Utilities', icon: '🧰' },
  { id: 'weather', name: 'Weather', icon: '🌤️' },
]

const ALLOWED_CATEGORIES = new Set(CATEGORIES.map((c) => c.id))

// Official, first-party apps. This is the ONLY place "official" is decided —
// app authors cannot mark themselves official via their moldable.json. Add a
// new first-party app's id here when it ships. Official apps are attributed to
// "Moldable" and get the verified badge in the store.
const OFFICIAL_APP_IDS = new Set([
  'affirmations',
  'calendar',
  'calculator',
  'clock',
  'code-editor',
  'db-browser',
  'git-flow',
  'guitar',
  'hello-moldables',
  'images',
  'mail',
  'meetings',
  'microscope',
  'notes',
  'piano',
  'plants',
  'reader',
  'recipes-app',
  'redecorate',
  'remotion',
  'scribo',
  'tasks',
  'time-tracker',
  'todo',
  'translate',
  'weather',
  'wiki',
])
const OFFICIAL_AUTHOR = 'Moldable'

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

function findPublicApps(dir) {
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
        if (manifest.visibility !== 'public') continue

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

// Validate/normalize an app's category against the canonical list. Unknown
// categories are coerced to 'productivity' with a loud warning so bogus values
// never reach the published manifest.
function normalizeCategory(app) {
  const category = app.category || 'productivity'
  if (!ALLOWED_CATEGORIES.has(category)) {
    console.warn(
      `⚠️  ${app.id}: unknown category "${category}" — coercing to "productivity". ` +
        `Valid: ${[...ALLOWED_CATEGORIES].join(', ')}`,
    )
    return 'productivity'
  }
  return category
}

function generateManifest() {
  console.log('🔍 Scanning for apps...')

  const apps = findPublicApps(ROOT)
  const commit = getGitCommitHash()

  console.log(`📦 Found ${apps.length} public apps`)
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

    const official = OFFICIAL_APP_IDS.has(app.id)

    return {
      id: app.id,
      name: app.name,
      version: app.version || '0.1.0',
      description: app.description || '',
      tagline: app.tagline || app.description || '',
      // Official apps are always attributed to "Moldable"; third-party authors
      // keep their own name. "official" is set here, never from app manifests.
      author: official ? OFFICIAL_AUTHOR : app.author || '',
      official,
      icon: app.icon || '📦',
      iconUrl: app.iconPath ? `${RAW_BASE}/${app.path}/${app.iconPath}` : null,
      screenshots: (app.screenshots || []).map(
        (rel) => `${RAW_BASE}/${app.path}/${rel}`,
      ),
      about,
      category: normalizeCategory(app),
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
