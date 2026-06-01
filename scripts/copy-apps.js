#!/usr/bin/env node
/**
 * Copy apps from ~/.moldable/shared/apps to ~/moldable-apps
 *
 * Usage:
 *   pnpm app:copy scribo          # Copy single app
 *   pnpm app:copy scribo notes    # Copy multiple apps
 *   pnpm app:copy --all           # Copy all public apps
 *   pnpm app:copy --all --patch   # Copy all public apps and bump app versions
 *
 * Only apps with "visibility": "public" in their moldable.json will be copied
 * when using --all. Individual app names bypass the visibility check.
 */
import { execSync } from 'child_process'
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { homedir } from 'os'
import { basename, join, relative } from 'path'

const SOURCE_DIR =
  process.env.MOLDABLE_APPS_SOURCE_DIR ||
  join(homedir(), '.moldable', 'shared', 'apps')
const TARGET_DIR =
  process.env.MOLDABLE_APPS_TARGET_DIR || join(homedir(), 'moldable-apps')
const RELEASE_ESLINT_CONFIG_VERSION = '0.1.3'
const VERSION_BUMP_FLAGS = new Map([
  ['--patch', 'patch'],
  ['--minor', 'minor'],
  ['--major', 'major'],
])

// Local dependency, build, and Moldable runtime files to always exclude.
const ALWAYS_EXCLUDE = [
  'node_modules',
  'dist',
  '.vite',
  'out',
  'build',
  'coverage',
  '.turbo',
  '.moldable.port',
  '.moldable.instances.json',
  '.moldable.install.json',
  '.moldable.migrations.json',
]

/**
 * Parse a .gitignore file and return patterns to exclude
 */
function parseGitignore(gitignorePath) {
  if (!existsSync(gitignorePath)) {
    return []
  }

  const content = readFileSync(gitignorePath, 'utf-8')
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#')) // Remove comments and empty lines
    .map((pattern) => pattern.replace(/\/$/, '').replace(/^\//, '')) // Normalize simple root-relative patterns
}

/**
 * Check if a path matches any of the exclude patterns
 */
function shouldExclude(filePath, sourceRoot, patterns) {
  const name = basename(filePath)
  const relativePath = relative(sourceRoot, filePath)

  // Always exclude Moldable runtime files
  if (ALWAYS_EXCLUDE.includes(name)) {
    return true
  }

  // Check against gitignore patterns
  for (const pattern of patterns) {
    // Simple pattern matching (handles most common cases)
    if (pattern === name) return true
    if (pattern === relativePath) return true
    if (relativePath.startsWith(pattern + '/')) return true
    if (relativePath.includes('/' + pattern + '/')) return true
    if (relativePath.endsWith('/' + pattern)) return true
  }

  return false
}

/**
 * Read the moldable.json for an app and return its manifest
 */
function readAppManifest(appPath) {
  const manifestPath = join(appPath, 'moldable.json')
  if (!existsSync(manifestPath)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch {
    return null
  }
}

/**
 * Check if an app is public (has visibility: "public" in moldable.json)
 */
function isPublicApp(appPath) {
  const manifest = readAppManifest(appPath)
  return manifest?.visibility === 'public'
}

function rewriteReleaseDependencies(appPath) {
  const packageJsonPath = join(appPath, 'package.json')
  if (!existsSync(packageJsonPath)) return

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  if (
    pkg.devDependencies?.['@moldable-ai/eslint-config']?.startsWith('file:')
  ) {
    pkg.devDependencies['@moldable-ai/eslint-config'] =
      RELEASE_ESLINT_CONFIG_VERSION
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }
}

function preserveTargetManifestVersion(targetApp) {
  const targetManifest = readAppManifest(targetApp)
  return targetManifest?.version
}

function preserveTargetPackageVersion(targetApp) {
  const packageJsonPath = join(targetApp, 'package.json')
  if (!existsSync(packageJsonPath)) return undefined

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    return pkg.version
  } catch {
    return undefined
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
  } else {
    throw new Error(`Unsupported version bump: ${kind}`)
  }

  return `${major}.${minor}.${patch}${suffix}`
}

function setTargetManifestVersion(targetApp, version) {
  const manifestPath = join(targetApp, 'moldable.json')
  const manifest = readAppManifest(targetApp)
  if (!manifest || manifest.version === version) return

  manifest.version = version
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

function restoreTargetManifestVersion(targetApp, version) {
  if (!version) return

  setTargetManifestVersion(targetApp, version)
}

function restoreTargetPackageVersion(targetApp, version) {
  if (!version) return

  const packageJsonPath = join(targetApp, 'package.json')
  if (!existsSync(packageJsonPath)) return

  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  if (pkg.version === version) return

  pkg.version = version
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

function resolveTargetManifestVersion(targetApp, previousVersion, versionBump) {
  if (!versionBump) return previousVersion

  const copiedVersion = readAppManifest(targetApp)?.version || '0.1.0'
  const baseVersion = previousVersion || copiedVersion
  return bumpSemver(baseVersion, versionBump)
}

function copyApp(appId, { versionBump } = {}) {
  const sourceApp = join(SOURCE_DIR, appId)
  const targetApp = join(TARGET_DIR, appId)

  if (!existsSync(sourceApp)) {
    console.error(`❌ App '${appId}' not found in ${SOURCE_DIR}`)
    return false
  }

  // Parse the app's .gitignore for exclusion patterns
  const gitignorePath = join(sourceApp, '.gitignore')
  const excludePatterns = parseGitignore(gitignorePath)

  console.log(`📦 Copying ${appId}...`)
  console.log(`   From: ${sourceApp}`)
  console.log(`   To:   ${targetApp}`)
  if (excludePatterns.length > 0) {
    console.log(
      `   Excluding: ${excludePatterns.slice(0, 5).join(', ')}${excludePatterns.length > 5 ? '...' : ''}`,
    )
  }

  const previousTargetVersion = preserveTargetManifestVersion(targetApp)
  const targetPackageVersion = preserveTargetPackageVersion(targetApp)

  // Remove existing target if it exists
  if (existsSync(targetApp)) {
    console.log(`   Removing existing ${appId}...`)
    rmSync(targetApp, { recursive: true, force: true })
  }

  // Copy with filter based on .gitignore patterns
  cpSync(sourceApp, targetApp, {
    recursive: true,
    filter: (src) => {
      return !shouldExclude(src, sourceApp, excludePatterns)
    },
  })

  rewriteReleaseDependencies(targetApp)
  const targetVersion = resolveTargetManifestVersion(
    targetApp,
    previousTargetVersion,
    versionBump,
  )
  restoreTargetManifestVersion(targetApp, targetVersion)
  restoreTargetPackageVersion(targetApp, targetPackageVersion)

  if (versionBump && targetVersion) {
    console.log(
      `   Version: ${previousTargetVersion || readAppManifest(sourceApp)?.version || '0.1.0'} -> ${targetVersion}`,
    )
  }
  console.log(`   ✅ Done`)
  return true
}

function listAvailableApps() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`)
    return []
  }

  return readdirSync(SOURCE_DIR).filter((name) => {
    const fullPath = join(SOURCE_DIR, name)
    return statSync(fullPath).isDirectory() && !name.startsWith('.')
  })
}

function listPublicApps() {
  return listAvailableApps().filter((appId) => {
    const appPath = join(SOURCE_DIR, appId)
    return isPublicApp(appPath)
  })
}

function main() {
  const args = process.argv.slice(2)
  const versionBumps = args
    .map((arg) => VERSION_BUMP_FLAGS.get(arg))
    .filter(Boolean)

  if (versionBumps.length > 1) {
    console.error(
      '❌ Choose only one version bump: --patch, --minor, or --major',
    )
    process.exit(1)
  }
  const versionBump = versionBumps[0]

  if (args.length === 0) {
    const apps = listAvailableApps()
    const publicApps = listPublicApps()
    console.log(
      'Usage: pnpm app:copy <app-id> [app-id...] | --all [--patch|--minor|--major]',
    )
    console.log('')
    console.log('Available apps:')
    if (apps.length === 0) {
      console.log('  (none found)')
    } else {
      apps.forEach((app) => {
        const appPath = join(SOURCE_DIR, app)
        const isPublic = isPublicApp(appPath)
        console.log(`  - ${app}${isPublic ? ' (public)' : ' (private)'}`)
      })
    }
    console.log('')
    console.log(
      `Public apps (${publicApps.length}): ${publicApps.join(', ') || '(none)'}`,
    )
    process.exit(1)
  }

  if (!existsSync(TARGET_DIR)) {
    console.error(`❌ Target directory not found: ${TARGET_DIR}`)
    console.error('   Make sure you have the moldable-apps repo cloned there.')
    process.exit(1)
  }

  let appsToCopy = args.filter((a) => !a.startsWith('--'))

  if (args.includes('--all')) {
    appsToCopy = listPublicApps()
    if (appsToCopy.length === 0) {
      console.log('No public apps found to copy.')
      console.log(
        'Add "visibility": "public" to moldable.json for apps you want to release.',
      )
      process.exit(0)
    }
    console.log(`Copying ${appsToCopy.length} public apps...\n`)
  }

  let success = 0
  let failed = 0
  const copiedApps = []

  for (const appId of appsToCopy) {
    if (copyApp(appId, { versionBump })) {
      success++
      copiedApps.push(appId)
    } else {
      failed++
    }
  }

  console.log('')
  console.log(
    `✨ Copied ${success} app(s)${failed > 0 ? `, ${failed} failed` : ''}`,
  )

  // Format copied apps
  if (copiedApps.length > 0 && process.env.MOLDABLE_APPS_SKIP_FORMAT !== '1') {
    console.log('')
    console.log('✨ Formatting copied apps...')
    const appPaths = copiedApps.map((id) => join(TARGET_DIR, id)).join(' ')
    try {
      execSync(
        `pnpm prettier --write ${appPaths} --ignore-path .prettierignore --cache --cache-location .prettiercache`,
        {
          cwd: TARGET_DIR,
          stdio: 'inherit',
        },
      )
      console.log('   ✅ Formatted')
    } catch {
      console.error('   ⚠️  Format failed (non-fatal)')
    }
  }
}

main()
