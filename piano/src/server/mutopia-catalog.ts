import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import extractZip from 'extract-zip'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MUTOPIA_REPO = 'MutopiaProject/MutopiaProject'
const MUTOPIA_BRANCH = 'master'
const MUTOPIA_GITHUB_API = `https://api.github.com/repos/${MUTOPIA_REPO}`
const MUTOPIA_RAW_BASE = `https://raw.githubusercontent.com/${MUTOPIA_REPO}`
const MUTOPIA_SITE_BASE = 'https://www.mutopiaproject.org'
const INDEX_VERSION = 1
const MAX_ZIP_BYTES = 80 * 1024 * 1024

export interface MutopiaCatalogEntry {
  provider: 'mutopia'
  id: string
  mutopiaId: string
  title: string
  composer: string
  composerCode: string
  opus?: string
  instrument: 'Piano'
  style?: string
  date?: string
  source?: string
  license: string
  updatedAt?: string
  sourceUrl: string
  midiUrl: string
  lilypondPath: string
  lilypondUrl: string
  repository: string
  repositoryCommit: string
}

export interface MutopiaIndex {
  version: number
  provider: 'mutopia'
  repository: string
  repositoryCommit: string
  generatedAt: string
  entries: MutopiaCatalogEntry[]
}

type HeaderFields = Record<string, string>

const rebuilds = new Map<string, Promise<MutopiaIndex>>()

function catalogDir(dataDir: string) {
  return safePath(dataDir, 'song-catalog', 'mutopia')
}

function checkoutDir(dataDir: string) {
  return safePath(catalogDir(dataDir), 'checkout')
}

function zipPath(dataDir: string) {
  return safePath(catalogDir(dataDir), 'mutopia.zip')
}

function indexPath(dataDir: string) {
  return safePath(catalogDir(dataDir), 'mutopia-piano-index.json')
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function slugify(value: string) {
  return normalizeSpace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function decodeLilypondString(value: string) {
  return value.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
}

function parseHeaderFields(source: string): HeaderFields {
  const fields: HeaderFields = {}
  const pattern = /(^|\n)\s*([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*"((?:\\"|[^"])*)"/g

  for (const match of source.matchAll(pattern)) {
    fields[match[2] ?? ''] = normalizeSpace(
      decodeLilypondString(match[3] ?? ''),
    )
  }

  return fields
}

function parseFooter(source: string) {
  const match = source.match(/footer\s*=\s*"Mutopia-([^"]*)-(\d+)"/)
  if (!match?.[1] || !match[2]) return null

  return {
    updatedAt: match[1],
    mutopiaId: match[2],
  }
}

function inferLicense(source: string, fields: HeaderFields) {
  const explicitLicense =
    fields.license || fields.mutopiacopyright || fields.copyright
  if (explicitLicense) return explicitLicense
  if (/Creative Commons Attribution-ShareAlike 4\.0/i.test(source)) {
    return 'Creative Commons Attribution-ShareAlike 4.0'
  }
  if (/Creative Commons Attribution ShareAlike 4\.0/i.test(source)) {
    return 'Creative Commons Attribution-ShareAlike 4.0'
  }
  if (/Creative Commons Attribution-ShareAlike 3\.0/i.test(source)) {
    return 'Creative Commons Attribution-ShareAlike 3.0'
  }
  if (/Creative Commons Attribution-ShareAlike 2\.5/i.test(source)) {
    return 'Creative Commons Attribution-ShareAlike 2.5'
  }
  if (/Creative Commons Attribution 3\.0/i.test(source)) {
    return 'Creative Commons Attribution 3.0'
  }
  if (/public domain/i.test(source)) return 'Public Domain'
  return 'Unknown'
}

function isDirectSoloPianoEntry(relativePath: string, source: string) {
  if (!relativePath.startsWith('ftp/')) return false
  if (!relativePath.endsWith('.ly')) return false
  if (relativePath.includes('-lys/')) return false
  if (!/\\midi\b/.test(source)) return false

  const fields = parseHeaderFields(source)
  return fields.mutopiainstrument === 'Piano'
}

function entryFromSource(
  relativePath: string,
  source: string,
  repositoryCommit: string,
): MutopiaCatalogEntry | null {
  if (!isDirectSoloPianoEntry(relativePath, source)) return null

  const footer = parseFooter(source)
  if (!footer) return null

  const fields = parseHeaderFields(source)
  const title = fields.mutopiatitle || fields.title
  if (!title) return null

  const composerCode =
    fields.mutopiacomposer || relativePath.split('/')[1] || ''
  const composer = fields.composer || composerCode
  const midiPath = relativePath.replace(/\.ly$/, '.mid')
  const songId = `mutopia-${footer.mutopiaId}-${slugify(title) || 'song'}`

  return {
    provider: 'mutopia',
    id: songId,
    mutopiaId: footer.mutopiaId,
    title,
    composer,
    composerCode,
    opus: fields.mutopiaopus || fields.opus || undefined,
    instrument: 'Piano',
    style: fields.style || undefined,
    date: fields.date || undefined,
    source: fields.source || undefined,
    license: inferLicense(source, fields),
    updatedAt: footer.updatedAt,
    sourceUrl: `${MUTOPIA_SITE_BASE}/cgibin/piece-info.cgi?id=${footer.mutopiaId}`,
    midiUrl: `${MUTOPIA_SITE_BASE}/${midiPath}`,
    lilypondPath: relativePath,
    lilypondUrl: `${MUTOPIA_RAW_BASE}/${repositoryCommit}/${relativePath}`,
    repository: `https://github.com/${MUTOPIA_REPO}`,
    repositoryCommit,
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'moldable-piano-song-catalog',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json() as Promise<T>
}

async function fetchBytes(url: string, maxBytes = MAX_ZIP_BYTES) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'moldable-piano-song-catalog',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Download is too large (${contentLength} bytes)`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.byteLength > maxBytes) {
    throw new Error(`Download is too large (${bytes.byteLength} bytes)`)
  }
  return bytes
}

async function getLatestCommit() {
  const data = await fetchJson<{ sha: string }>(
    `${MUTOPIA_GITHUB_API}/commits/${MUTOPIA_BRANCH}`,
  )
  return data.sha
}

async function findExtractedRoot(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  const root = entries.find((entry) => entry.isDirectory())
  if (!root) throw new Error('Mutopia archive did not contain a root folder')
  return safePath(dir, root.name)
}

async function listLilypondFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = safePath(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listLilypondFiles(entryPath)))
    } else if (entry.isFile() && entry.name.endsWith('.ly')) {
      files.push(entryPath)
    }
  }

  return files
}

export async function buildMutopiaPianoIndex(dataDir: string) {
  const commit = await getLatestCommit()
  const dir = catalogDir(dataDir)
  const checkout = checkoutDir(dataDir)
  await mkdir(dir, { recursive: true })
  await rm(checkout, { force: true, recursive: true })
  await mkdir(checkout, { recursive: true })

  const archiveUrl = `https://codeload.github.com/${MUTOPIA_REPO}/zip/${commit}`
  await writeFile(zipPath(dataDir), await fetchBytes(archiveUrl))
  await extractZip(zipPath(dataDir), { dir: checkout })

  const root = await findExtractedRoot(checkout)
  const ftpRoot = safePath(root, 'ftp')
  const files = await listLilypondFiles(ftpRoot)
  const byMutopiaId = new Map<string, MutopiaCatalogEntry>()

  for (const file of files) {
    const source = await readFile(file, 'utf8')
    const relativePath = path.relative(root, file).split(path.sep).join('/')
    const entry = entryFromSource(relativePath, source, commit)
    if (entry) byMutopiaId.set(entry.mutopiaId, entry)
  }

  const index: MutopiaIndex = {
    version: INDEX_VERSION,
    provider: 'mutopia',
    repository: `https://github.com/${MUTOPIA_REPO}`,
    repositoryCommit: commit,
    generatedAt: new Date().toISOString(),
    entries: [...byMutopiaId.values()].sort((a, b) =>
      `${a.composer} ${a.title}`.localeCompare(`${b.composer} ${b.title}`),
    ),
  }

  await writeJson(indexPath(dataDir), index)
  await rm(zipPath(dataDir), { force: true })
  await rm(checkout, { force: true, recursive: true })
  return index
}

export async function ensureMutopiaPianoIndex(dataDir: string) {
  const existing = await readJson<MutopiaIndex | null>(indexPath(dataDir), null)
  if (existing?.version === INDEX_VERSION && Array.isArray(existing.entries)) {
    return existing
  }

  const current = rebuilds.get(dataDir)
  if (current) return current

  const rebuild = buildMutopiaPianoIndex(dataDir).finally(() => {
    rebuilds.delete(dataDir)
  })
  rebuilds.set(dataDir, rebuild)
  return rebuild
}

export async function rebuildMutopiaPianoIndex(dataDir: string) {
  const current = rebuilds.get(dataDir)
  if (current) return current

  const rebuild = buildMutopiaPianoIndex(dataDir).finally(() => {
    rebuilds.delete(dataDir)
  })
  rebuilds.set(dataDir, rebuild)
  return rebuild
}

export async function readMutopiaPianoIndexStatus(dataDir: string) {
  const existing = await readJson<MutopiaIndex | null>(indexPath(dataDir), null)

  return {
    indexed: Boolean(existing?.entries),
    indexPath: indexPath(dataDir),
    repository: existing?.repository ?? `https://github.com/${MUTOPIA_REPO}`,
    repositoryCommit: existing?.repositoryCommit,
    generatedAt: existing?.generatedAt,
    entryCount: existing?.entries.length ?? 0,
  }
}

function searchableText(entry: MutopiaCatalogEntry) {
  return [
    entry.title,
    entry.composer,
    entry.composerCode,
    entry.opus,
    entry.style,
    entry.date,
    entry.source,
    entry.license,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function searchMutopiaPianoIndex(
  index: MutopiaIndex,
  query: string,
  limit = 40,
) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)

  const entries =
    terms.length === 0
      ? index.entries
      : index.entries.filter((entry) => {
          const text = searchableText(entry)
          return terms.every((term) => text.includes(term))
        })

  const safeLimit = Number.isFinite(limit) ? limit : 40
  return entries.slice(0, Math.max(1, Math.min(safeLimit, 100)))
}

export async function fetchMutopiaMidi(entry: MutopiaCatalogEntry) {
  return fetchBytes(entry.midiUrl, 20 * 1024 * 1024)
}

export const mutopiaCatalogInternals = {
  entryFromSource,
  parseHeaderFields,
}
