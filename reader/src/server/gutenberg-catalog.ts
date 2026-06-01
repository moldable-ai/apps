import { readJson, safePath, writeJson } from '@moldable-ai/storage'
import type { BookMeta } from '../shared/book'
import { importBook } from './book-store'
import { gunzipSync, strFromU8 } from 'fflate'
import { mkdir } from 'node:fs/promises'

/**
 * In-app book store backed by direct-download public ebook sources.
 *
 * A source may only contribute results when the server can later download and
 * verify an EPUB/TXT payload before importing it into the local library.
 */

const CSV_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz'
const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json'
const ARCHIVE_METADATA_URL = 'https://archive.org/metadata'
const USER_AGENT = 'Moldable-Reader/0.1 (+https://moldable.sh)'
const OPEN_LIBRARY_PAGE_SIZE = 12

type StoreSource = 'gutenberg' | 'open-library'

export interface StoreBook {
  /** Stable install key: source:id */
  id: string
  source: StoreSource
  sourceLabel: string
  title: string
  author: string | null
  language: string
  coverUrl: string
}

interface IndexEntry {
  id: number
  title: string
  author: string | null
  language: string
}

interface StoredIndex {
  builtAt: string
  count: number
  books: IndexEntry[]
}

export interface StoreStatus {
  ready: boolean
  building: boolean
  count: number
  builtAt: string | null
}

export interface StoreSearchResponse {
  results: StoreBook[]
  total: number
  page: number
  pageSize: number
}

let indexCache: IndexEntry[] | null = null
let buildPromise: Promise<IndexEntry[]> | null = null

// ─── URLs ────────────────────────────────────────────────────────────

export function gutenbergCoverUrl(id: number): string {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`
}

function gutenbergEpubUrls(id: number): string[] {
  return [
    `https://www.gutenberg.org/ebooks/${id}.epub3.images`,
    `https://www.gutenberg.org/ebooks/${id}.epub.images`,
    `https://www.gutenberg.org/ebooks/${id}.epub.noimages`,
  ]
}

// ─── Paths ───────────────────────────────────────────────────────────

function storeDir(dataDir: string) {
  return safePath(dataDir, 'store')
}

function indexPath(dataDir: string) {
  return safePath(storeDir(dataDir), 'gutenberg-index.json')
}

function installedPath(dataDir: string) {
  return safePath(storeDir(dataDir), 'installed.json')
}

function gutenbergKey(id: number): string {
  return `gutenberg:${id}`
}

function openLibraryKey(identifier: string): string {
  return `open-library:${identifier}`
}

function parseInstallKey(
  raw: string | number,
): { source: StoreSource; id: string } | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0
      ? { source: 'gutenberg', id: String(raw) }
      : null
  }
  const value = raw.trim()
  if (/^\d+$/.test(value)) return { source: 'gutenberg', id: value }
  const separator = value.indexOf(':')
  if (separator <= 0) return null
  const source = value.slice(0, separator)
  const id = value.slice(separator + 1)
  if ((source === 'gutenberg' || source === 'open-library') && id) {
    return { source, id }
  }
  return null
}

// ─── CSV parsing ─────────────────────────────────────────────────────

/** RFC 4180-ish CSV parser: handles quotes, escaped quotes, embedded newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Convert a Gutenberg "Last, First, 1820-1910" author into "First Last". */
function cleanAuthor(raw: string): string | null {
  if (!raw) return null
  const first = raw.split(';')[0]?.trim() ?? ''
  if (!first) return null
  const noDates = first
    .replace(/,?\s*\d{3,4}\??\s*-?\s*\d{0,4}\??\s*$/, '')
    .trim()
  const parts = noDates
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) return `${parts[1]} ${parts[0]}`.trim()
  return noDates || null
}

// ─── Index build / load ──────────────────────────────────────────────

export async function buildGutenbergIndex(
  dataDir: string,
): Promise<IndexEntry[]> {
  const res = await fetch(CSV_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) {
    throw new Error(`Failed to fetch Gutenberg catalog (${res.status})`)
  }
  const gz = new Uint8Array(await res.arrayBuffer())
  const csv = strFromU8(gunzipSync(gz))
  const rows = parseCsvRows(csv)
  const books: IndexEntry[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i]
    if (!r || r[1] !== 'Text') continue
    const id = Number(r[0])
    if (!Number.isFinite(id)) continue
    const title = (r[3] ?? '').replace(/\s+/g, ' ').trim()
    if (!title) continue
    const language = (r[4] ?? '').split(/[;,]/)[0]?.trim() || 'en'
    books.push({ id, title, author: cleanAuthor(r[5] ?? ''), language })
  }
  await mkdir(storeDir(dataDir), { recursive: true })
  const stored: StoredIndex = {
    builtAt: new Date().toISOString(),
    count: books.length,
    books,
  }
  await writeJson(indexPath(dataDir), stored)
  indexCache = books
  return books
}

export async function ensureGutenbergIndex(
  dataDir: string,
): Promise<IndexEntry[]> {
  if (indexCache) return indexCache
  const stored = await readJson<StoredIndex | null>(indexPath(dataDir), null)
  if (stored && Array.isArray(stored.books) && stored.books.length > 0) {
    indexCache = stored.books
    return indexCache
  }
  if (!buildPromise) {
    buildPromise = buildGutenbergIndex(dataDir).finally(() => {
      buildPromise = null
    })
  }
  return buildPromise
}

export async function getStoreStatus(dataDir: string): Promise<StoreStatus> {
  if (indexCache) {
    return {
      ready: true,
      building: false,
      count: indexCache.length,
      builtAt: null,
    }
  }
  const stored = await readJson<StoredIndex | null>(indexPath(dataDir), null)
  if (stored && stored.count > 0) {
    return {
      ready: true,
      building: false,
      count: stored.count,
      builtAt: stored.builtAt,
    }
  }
  return {
    ready: false,
    building: buildPromise !== null,
    count: 0,
    builtAt: null,
  }
}

// ─── Featured ────────────────────────────────────────────────────────

/** Curated well-known public-domain classics shown when the store opens. */
const FEATURED: { id: number; title: string; author: string }[] = [
  { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen' },
  { id: 84, title: 'Frankenstein', author: 'Mary Shelley' },
  {
    id: 11,
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
  },
  {
    id: 1661,
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
  },
  { id: 2701, title: 'Moby Dick', author: 'Herman Melville' },
  { id: 64317, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
  { id: 174, title: 'The Picture of Dorian Gray', author: 'Oscar Wilde' },
  { id: 345, title: 'Dracula', author: 'Bram Stoker' },
  { id: 1260, title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { id: 768, title: 'Wuthering Heights', author: 'Emily Brontë' },
  { id: 98, title: 'A Tale of Two Cities', author: 'Charles Dickens' },
  { id: 1400, title: 'Great Expectations', author: 'Charles Dickens' },
  { id: 74, title: 'The Adventures of Tom Sawyer', author: 'Mark Twain' },
  { id: 76, title: 'Adventures of Huckleberry Finn', author: 'Mark Twain' },
  { id: 2542, title: "A Doll's House", author: 'Henrik Ibsen' },
  { id: 5200, title: 'Metamorphosis', author: 'Franz Kafka' },
  { id: 1184, title: 'The Count of Monte Cristo', author: 'Alexandre Dumas' },
  { id: 219, title: 'Heart of Darkness', author: 'Joseph Conrad' },
  { id: 16, title: 'Peter Pan', author: 'J. M. Barrie' },
  {
    id: 1952,
    title: 'The Yellow Wallpaper',
    author: 'Charlotte Perkins Gilman',
  },
  { id: 2814, title: 'Dubliners', author: 'James Joyce' },
  { id: 1232, title: 'The Prince', author: 'Niccolò Machiavelli' },
]

export function getFeatured(): StoreBook[] {
  return FEATURED.map((entry) => ({
    id: gutenbergKey(entry.id),
    source: 'gutenberg',
    sourceLabel: 'Project Gutenberg',
    title: entry.title,
    author: entry.author,
    language: 'en',
    coverUrl: gutenbergCoverUrl(entry.id),
  }))
}

// ─── Search ──────────────────────────────────────────────────────────

function toStoreBook(entry: IndexEntry): StoreBook {
  return {
    id: gutenbergKey(entry.id),
    source: 'gutenberg',
    sourceLabel: 'Project Gutenberg',
    title: entry.title,
    author: entry.author,
    language: entry.language,
    coverUrl: gutenbergCoverUrl(entry.id),
  }
}

export async function searchGutenberg(
  dataDir: string,
  query: string,
  page = 0,
  pageSize = 24,
): Promise<StoreSearchResponse> {
  const q = query.trim().toLowerCase()
  if (!q) {
    const featured = getFeatured()
    return {
      results: featured,
      total: featured.length,
      page: 0,
      pageSize: featured.length,
    }
  }
  const books = await ensureGutenbergIndex(dataDir)
  const tokens = q.split(/\s+/).filter(Boolean)
  const matches: IndexEntry[] = []
  for (const book of books) {
    const hay = `${book.title} ${book.author ?? ''}`.toLowerCase()
    if (tokens.every((token) => hay.includes(token))) matches.push(book)
  }
  matches.sort((a, b) => {
    // Prefer English editions, then title-prefix matches, then shorter titles.
    const aEn = a.language === 'en' ? 0 : 1
    const bEn = b.language === 'en' ? 0 : 1
    if (aEn !== bEn) return aEn - bEn
    const at = a.title.toLowerCase()
    const bt = b.title.toLowerCase()
    const aStarts = at.startsWith(q) ? 0 : 1
    const bStarts = bt.startsWith(q) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    if (at.length !== bt.length) return at.length - bt.length
    return at.localeCompare(bt)
  })
  const start = page * pageSize
  const slice = matches.slice(start, start + pageSize)
  return {
    results: slice.map(toStoreBook),
    total: matches.length,
    page,
    pageSize,
  }
}

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  language?: string[]
  ia?: string[]
  cover_i?: number
  public_scan_b?: boolean
  has_fulltext?: boolean
}

interface OpenLibrarySearchResponse {
  docs?: OpenLibraryDoc[]
  num_found?: number
}

interface ArchiveFile {
  name?: string
  format?: string
  size?: string
  private?: string
}

interface ArchiveMetadataResponse {
  files?: ArchiveFile[]
}

function openLibraryCoverUrl(doc: OpenLibraryDoc, identifier: string): string {
  if (typeof doc.cover_i === 'number') {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
  }
  return `https://archive.org/services/img/${encodeURIComponent(identifier)}`
}

function archiveDownloadUrl(identifier: string, filename: string): string {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`
}

function isPublicPlainEpub(file: ArchiveFile): boolean {
  const name = (file.name ?? '').toLowerCase()
  const format = (file.format ?? '').toLowerCase()
  return (
    name.endsWith('.epub') &&
    file.private !== 'true' &&
    format === 'epub' &&
    !name.includes('_lcp') &&
    !format.includes('encrypted') &&
    !name.includes('_textonly')
  )
}

async function canDownloadEpub(url: string): Promise<boolean> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Range: 'bytes=0-3',
    },
  })
  if (!res.ok) return false
  const reader = res.body?.getReader()
  if (!reader) return false
  try {
    const chunk = await reader.read()
    await reader.cancel()
    const value = chunk.value
    return Boolean(
      value && value.length >= 2 && value[0] === 0x50 && value[1] === 0x4b,
    )
  } finally {
    reader.releaseLock()
  }
}

async function findArchiveEpub(
  identifier: string,
  verifyDownload = false,
): Promise<string | null> {
  const res = await fetch(
    `${ARCHIVE_METADATA_URL}/${encodeURIComponent(identifier)}`,
    {
      headers: { 'User-Agent': USER_AGENT },
    },
  )
  if (!res.ok) return null
  const metadata = (await res.json()) as ArchiveMetadataResponse
  const files = Array.isArray(metadata.files) ? metadata.files : []
  for (const file of files) {
    if (!isPublicPlainEpub(file) || !file.name) continue
    const url = archiveDownloadUrl(identifier, file.name)
    if (!verifyDownload || (await canDownloadEpub(url))) return url
  }
  return null
}

async function searchOpenLibrary(
  query: string,
  page = 0,
): Promise<StoreSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    fields: 'title,author_name,language,ia,cover_i,public_scan_b,has_fulltext',
    limit: String(OPEN_LIBRARY_PAGE_SIZE),
    page: String(page + 1),
  })
  const res = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) {
    throw new Error(`Open Library search failed (${res.status})`)
  }
  const body = (await res.json()) as OpenLibrarySearchResponse
  const docs = Array.isArray(body.docs) ? body.docs : []
  const results: StoreBook[] = []

  for (const doc of docs) {
    if (!doc.public_scan_b && !doc.has_fulltext) continue
    const identifiers = Array.isArray(doc.ia) ? doc.ia : []
    for (const identifier of identifiers.slice(0, 4)) {
      const epubUrl = await findArchiveEpub(identifier, true)
      if (!epubUrl) continue
      results.push({
        id: openLibraryKey(identifier),
        source: 'open-library',
        sourceLabel: 'Open Library',
        title: doc.title?.trim() || identifier,
        author: doc.author_name?.[0] ?? null,
        language: doc.language?.[0] ?? 'en',
        coverUrl: openLibraryCoverUrl(doc, identifier),
      })
      break
    }
  }

  return {
    results,
    total: typeof body.num_found === 'number' ? body.num_found : results.length,
    page,
    pageSize: OPEN_LIBRARY_PAGE_SIZE,
  }
}

export async function searchStore(
  dataDir: string,
  query: string,
  page = 0,
): Promise<StoreSearchResponse> {
  const q = query.trim()
  if (!q) return searchGutenberg(dataDir, q, page)

  const [gutenberg, openLibrary] = await Promise.allSettled([
    searchGutenberg(dataDir, q, page, 16),
    searchOpenLibrary(q, page),
  ])

  const results: StoreBook[] = []
  let total = 0
  if (gutenberg.status === 'fulfilled') {
    results.push(...gutenberg.value.results)
    total += gutenberg.value.total
  }
  if (openLibrary.status === 'fulfilled') {
    results.push(...openLibrary.value.results)
    total += openLibrary.value.total
  }
  if (
    results.length === 0 &&
    gutenberg.status === 'rejected' &&
    openLibrary.status === 'rejected'
  ) {
    throw new Error('No ebook sources are available right now')
  }

  return {
    results,
    total,
    page,
    pageSize: results.length,
  }
}

// ─── Install ─────────────────────────────────────────────────────────

export async function getInstalledIds(dataDir: string): Promise<string[]> {
  const ids = await readJson<Array<number | string>>(installedPath(dataDir), [])
  if (!Array.isArray(ids)) return []
  return ids
    .map((id) => (typeof id === 'number' ? gutenbergKey(id) : id))
    .filter((id) => typeof id === 'string' && parseInstallKey(id) !== null)
}

async function recordInstalled(dataDir: string, id: string): Promise<void> {
  const ids = new Set(await getInstalledIds(dataDir))
  ids.add(id)
  await mkdir(storeDir(dataDir), { recursive: true })
  await writeJson(installedPath(dataDir), Array.from(ids))
}

export async function installFromGutenberg(
  dataDir: string,
  id: number,
): Promise<BookMeta> {
  let bytes: Uint8Array | null = null
  for (const url of gutenbergEpubUrls(id)) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) continue
      const buf = new Uint8Array(await res.arrayBuffer())
      // Verify it is a zip (EPUB), not an HTML error page.
      if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
        bytes = buf
        break
      }
    } catch {
      // Try the next URL variant.
    }
  }
  if (!bytes) {
    throw new Error('Could not download this book from Project Gutenberg')
  }
  const meta = await importBook(dataDir, `gutenberg-${id}.epub`, bytes)
  await recordInstalled(dataDir, gutenbergKey(id))
  return meta
}

async function downloadVerifiedEpub(
  urls: string[],
): Promise<Uint8Array | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!res.ok) continue
      const buf = new Uint8Array(await res.arrayBuffer())
      if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) return buf
    } catch {
      // Try the next URL.
    }
  }
  return null
}

async function installFromOpenLibrary(
  dataDir: string,
  identifier: string,
): Promise<BookMeta> {
  const epub = await findArchiveEpub(identifier)
  if (!epub)
    throw new Error('Open Library did not provide a direct EPUB for this book')
  const bytes = await downloadVerifiedEpub([epub])
  if (!bytes) throw new Error('Could not download this EPUB from Open Library')
  const meta = await importBook(
    dataDir,
    `open-library-${identifier}.epub`,
    bytes,
  )
  await recordInstalled(dataDir, openLibraryKey(identifier))
  return meta
}

export async function installFromStore(
  dataDir: string,
  rawId: string | number,
): Promise<BookMeta> {
  const key = parseInstallKey(rawId)
  if (!key) throw new Error('A valid book id is required')
  if (key.source === 'gutenberg')
    return installFromGutenberg(dataDir, Number(key.id))
  return installFromOpenLibrary(dataDir, key.id)
}
