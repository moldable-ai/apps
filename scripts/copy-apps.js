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
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { homedir } from 'os'
import { tmpdir } from 'os'
import { basename, extname, join, relative } from 'path'

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
const REDECORATE_STYLE_THUMBNAIL_EXTENSIONS = new Set([
  '.webp',
  '.jpg',
  '.jpeg',
  '.png',
  '.avif',
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

function readRedecorateStylePresetIds(sourceApp) {
  const catalogPath = join(sourceApp, 'src', 'shared', 'catalog.ts')
  if (!existsSync(catalogPath)) return new Set()

  const catalog = readFileSync(catalogPath, 'utf-8')
  const ids = new Set()
  for (const match of catalog.matchAll(
    /(?:\bid\b|["']id["']):\s*['"]([^'"]+)['"]/g,
  )) {
    ids.add(match[1])
  }
  return ids
}

function shouldExcludeAppSpecific(filePath, sourceRoot, appId, context) {
  if (appId !== 'redecorate') return false

  const relativePath = relative(sourceRoot, filePath)
  if (relativePath === 'public' || relativePath === 'public/styles') {
    return false
  }
  if (relativePath.startsWith('public/styles/.generation')) {
    return true
  }
  if (!relativePath.startsWith('public/styles/')) {
    return false
  }

  const stat = statSync(filePath)
  if (stat.isDirectory()) return true
  if (relativePath === 'public/styles/README.md') return false

  const extension = extname(relativePath).toLowerCase()
  if (!REDECORATE_STYLE_THUMBNAIL_EXTENSIONS.has(extension)) return true

  const filename = basename(relativePath)
  const presetId = filename.slice(0, -extension.length)
  return !context.redecorateStylePresetIds.has(presetId)
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

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function formatCopiedApp(appPath) {
  if (process.env.MOLDABLE_APPS_SKIP_FORMAT === '1') return

  try {
    execSync(
      `pnpm prettier --write ${shellQuote(appPath)} --ignore-path .prettierignore --cache --cache-location .prettiercache`,
      {
        cwd: TARGET_DIR,
        stdio: 'inherit',
      },
    )
  } catch {
    console.error('   ⚠️  Format failed (non-fatal)')
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

function removeLocalInstallMetadata(targetApp) {
  const manifestPath = join(targetApp, 'moldable.json')
  const manifest = readAppManifest(targetApp)
  if (!manifest) return

  const hadInstallMetadata =
    Object.hasOwn(manifest, 'upstream') || Object.hasOwn(manifest, 'modified')
  if (!hadInstallMetadata) return

  delete manifest.upstream
  delete manifest.modified
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

function resolveBumpedManifestVersion(targetApp, previousVersion, versionBump) {
  const copiedVersion = readAppManifest(targetApp)?.version || '0.1.0'
  const baseVersion = previousVersion || copiedVersion
  return bumpSemver(baseVersion, versionBump)
}

function listComparableFiles(root, patterns = [], appId = null, context = {}) {
  if (!existsSync(root)) return []

  const files = []
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      const relativePath = relative(root, fullPath)
      if (shouldExclude(fullPath, root, patterns)) continue
      if (appId && shouldExcludeAppSpecific(fullPath, root, appId, context)) {
        continue
      }

      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        visit(fullPath)
      } else if (stat.isFile()) {
        files.push(relativePath)
      }
    }
  }

  visit(root)
  return files.sort()
}

function readComparableFile(root, relativePath) {
  const fullPath = join(root, relativePath)
  if (relativePath === 'moldable.json') {
    const manifest = JSON.parse(readFileSync(fullPath, 'utf-8'))
    delete manifest.version
    delete manifest.upstream
    delete manifest.modified
    return `${JSON.stringify(manifest, null, 2)}\n`
  }

  return readFileSync(fullPath)
}

function comparableContentEquals(leftRoot, rightRoot, relativePath) {
  const left = readComparableFile(leftRoot, relativePath)
  const right = readComparableFile(rightRoot, relativePath)
  if (Buffer.isBuffer(left) && Buffer.isBuffer(right)) {
    return left.equals(right)
  }
  return left === right
}

function hasMeaningfulChanges(
  previousTargetApp,
  targetApp,
  patterns = [],
  appId = null,
  context = {},
) {
  if (!previousTargetApp) return true

  const previousFiles = listComparableFiles(
    previousTargetApp,
    patterns,
    appId,
    context,
  )
  const currentFiles = listComparableFiles(targetApp, patterns, appId, context)
  if (previousFiles.length !== currentFiles.length) return true

  for (let index = 0; index < previousFiles.length; index += 1) {
    if (previousFiles[index] !== currentFiles[index]) return true
    if (
      !comparableContentEquals(
        previousTargetApp,
        targetApp,
        previousFiles[index],
      )
    ) {
      return true
    }
  }

  return false
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
  const copyContext = {
    redecorateStylePresetIds:
      appId === 'redecorate'
        ? readRedecorateStylePresetIds(sourceApp)
        : new Set(),
  }

  console.log(`📦 Copying ${appId}...`)
  console.log(`   From: ${sourceApp}`)
  console.log(`   To:   ${targetApp}`)
  if (excludePatterns.length > 0) {
    console.log(
      `   Excluding: ${excludePatterns.slice(0, 5).join(', ')}${excludePatterns.length > 5 ? '...' : ''}`,
    )
  }

  const hadPreviousTarget = existsSync(targetApp)
  const previousTargetVersion = preserveTargetManifestVersion(targetApp)
  const targetPackageVersion = preserveTargetPackageVersion(targetApp)
  const snapshotRoot = mkdtempSync(join(tmpdir(), 'moldable-app-copy-'))
  const previousTargetSnapshot = hadPreviousTarget
    ? join(snapshotRoot, appId)
    : null

  if (previousTargetSnapshot) {
    cpSync(targetApp, previousTargetSnapshot, { recursive: true })
  }

  // Remove existing target if it exists
  if (hadPreviousTarget) {
    console.log(`   Removing existing ${appId}...`)
    rmSync(targetApp, { recursive: true, force: true })
  }

  try {
    // Copy with filter based on .gitignore patterns
    cpSync(sourceApp, targetApp, {
      recursive: true,
      filter: (src) => {
        return (
          !shouldExclude(src, sourceApp, excludePatterns) &&
          !shouldExcludeAppSpecific(src, sourceApp, appId, copyContext)
        )
      },
    })

    rewriteReleaseDependencies(targetApp)
    removeLocalInstallMetadata(targetApp)
    restoreTargetManifestVersion(targetApp, previousTargetVersion)
    restoreTargetPackageVersion(targetApp, targetPackageVersion)
    formatCopiedApp(targetApp)

    const hasChanges = hasMeaningfulChanges(
      previousTargetSnapshot,
      targetApp,
      excludePatterns,
      appId,
      copyContext,
    )
    const targetVersion =
      versionBump && hasChanges
        ? resolveBumpedManifestVersion(
            targetApp,
            previousTargetVersion,
            versionBump,
          )
        : previousTargetVersion

    restoreTargetManifestVersion(targetApp, targetVersion)

    if (versionBump && targetVersion) {
      if (hasChanges) {
        console.log(
          `   Version: ${previousTargetVersion || readAppManifest(sourceApp)?.version || '0.1.0'} -> ${targetVersion}`,
        )
      } else {
        console.log(`   Version: unchanged (${targetVersion}; no app changes)`)
      }
    }
  } finally {
    rmSync(snapshotRoot, { recursive: true, force: true })
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

  if (copiedApps.length > 0 && process.env.MOLDABLE_APPS_SKIP_FORMAT !== '1') {
    console.log('')
    console.log('✨ Formatted copied apps before version checks')
  }
}

main()
