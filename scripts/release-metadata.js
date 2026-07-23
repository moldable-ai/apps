import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'

const RUNTIME_FILES = new Set([
  '.moldable-install-state.json',
  '.moldable.install.json',
  '.moldable.migrations.json',
  '.moldable.instances.json',
  '.moldable.port',
])

const RUNTIME_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.turbo',
  '.vite',
])

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  )
}

function normalizedManifestBytes(manifest) {
  const normalized = { ...manifest }
  delete normalized.upstream
  delete normalized.modified
  return Buffer.from(JSON.stringify(canonicalizeJson(normalized)))
}

function shouldSkipHashPath(relativePath) {
  if (RUNTIME_FILES.has(relativePath)) return true
  return relativePath.split('/').some((part) => RUNTIME_DIRECTORIES.has(part))
}

export function computeAppFileHashes(appDir, manifestOverride) {
  const hashes = {}
  if (!existsSync(appDir)) return hashes

  const visit = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        visit(fullPath)
        continue
      }
      if (!stat.isFile()) continue

      const relativePath = relative(appDir, fullPath).split('\\').join('/')
      if (shouldSkipHashPath(relativePath)) continue

      const bytes =
        relativePath === 'moldable.json'
          ? normalizedManifestBytes(
              manifestOverride ?? JSON.parse(readFileSync(fullPath, 'utf-8')),
            )
          : readFileSync(fullPath)
      hashes[relativePath] = createHash('sha256').update(bytes).digest('hex')
    }
  }

  visit(appDir)
  return Object.fromEntries(
    Object.entries(hashes).sort(([left], [right]) => left.localeCompare(right)),
  )
}

function writeJsonAtomically(filePath, value) {
  const temporaryPath = join(
    dirname(filePath),
    `.moldable-release-${process.pid}-${Date.now()}.tmp`,
  )
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(temporaryPath, filePath)
}

export function prepareReleasedAppMetadata({
  appId,
  commit,
  localAppDir,
  releasedVersion,
  installedAt = new Date().toISOString(),
}) {
  const manifestPath = join(localAppDir, 'moldable.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`Local app '${appId}' has no moldable.json`)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  manifest.version = releasedVersion
  delete manifest.upstream
  delete manifest.modified
  const fileHashes = computeAppFileHashes(localAppDir, manifest)

  manifest.upstream = {
    repo: 'moldable-ai/apps',
    path: appId,
    installedVersion: releasedVersion,
    installedCommit: commit,
    installedAt,
    fileHashes,
  }
  manifest.modified = false

  return { manifest, manifestPath }
}

export function stampReleasedAppMetadata(options) {
  const prepared = prepareReleasedAppMetadata(options)
  writeJsonAtomically(prepared.manifestPath, prepared.manifest)
  return prepared.manifest
}
