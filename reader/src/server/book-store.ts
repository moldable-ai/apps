import { generateId, readJson, safePath, writeJson } from '@moldable-ai/storage'
import {
  type BookMeta,
  type BookSearchResponse,
  type BookSearchResult,
  type BookSummary,
  type ChapterContent,
  type ChapterRef,
  type EbookFormat,
  type ReadingProgress,
  countWords,
  coverColorFromSeed,
} from '../shared/book'
import {
  type Folder,
  type FoldersResponse,
  toneFromSeed,
} from '../shared/folder'
import {
  type ReaderSettings,
  normalizeReaderSettings,
} from '../shared/reader-settings'
import { DEFAULT_BOOKS } from './default-books'
import { htmlToText, parseEbook } from './epub-parser'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const RES_PLACEHOLDER = '__RES__/'

interface StoredChapter {
  index: number
  title: string
  href: string
  html: string
  text: string
  wordCount: number
}

// ─── Paths ───────────────────────────────────────────────────────────

function booksDir(dataDir: string) {
  return safePath(dataDir, 'books')
}

function bookDir(dataDir: string, bookId: string) {
  return safePath(booksDir(dataDir), bookId)
}

function bookMetaPath(dataDir: string, bookId: string) {
  return safePath(bookDir(dataDir, bookId), 'book.json')
}

function chaptersDir(dataDir: string, bookId: string) {
  return safePath(bookDir(dataDir, bookId), 'chapters')
}

function chapterPath(dataDir: string, bookId: string, index: number) {
  return safePath(chaptersDir(dataDir, bookId), `${index}.json`)
}

function resourcesDir(dataDir: string, bookId: string) {
  return safePath(bookDir(dataDir, bookId), 'resources')
}

function progressPath(dataDir: string, bookId: string) {
  return safePath(bookDir(dataDir, bookId), 'progress.json')
}

function foldersPath(dataDir: string) {
  return safePath(dataDir, 'folders.json')
}

function settingsPath(dataDir: string) {
  return safePath(dataDir, 'reader-settings.json')
}

function installedStorePath(dataDir: string) {
  return safePath(dataDir, 'store', 'installed.json')
}

function seedMarkerPath(dataDir: string) {
  return safePath(dataDir, '.seeded.json')
}

// ─── Helpers ─────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function extToContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'css':
      return 'text/css'
    default:
      return 'application/octet-stream'
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

function storedChapterText(chapter: StoredChapter): string {
  return chapter.html ? htmlToText(chapter.html) : chapter.text
}

async function listBookIds(dataDir: string): Promise<string[]> {
  try {
    const entries = await readdir(booksDir(dataDir), { withFileTypes: true })
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

async function removeStoreInstalledMarker(
  dataDir: string,
  source: string | null,
): Promise<void> {
  if (!source) return
  const installed = await readJson<Array<number | string>>(
    installedStorePath(dataDir),
    [],
  )
  if (!Array.isArray(installed) || installed.length === 0) return

  const gutenberg = source.match(/^gutenberg-(\d+)\.epub$/)
  const openLibrary = source.match(/^open-library-(.+)\.epub$/)
  const staleKeys = new Set<string>()
  let staleNumber: number | null = null

  if (gutenberg) {
    const id = Number(gutenberg[1])
    staleNumber = id
    staleKeys.add(`gutenberg:${id}`)
  } else if (openLibrary) {
    staleKeys.add(`open-library:${openLibrary[1]}`)
  } else {
    return
  }

  const next = installed.filter((id) => {
    if (typeof id === 'number') return id !== staleNumber
    return !staleKeys.has(id)
  })
  if (next.length !== installed.length) {
    await writeJson(installedStorePath(dataDir), next)
  }
}

// ─── Books ───────────────────────────────────────────────────────────

export async function getBookMeta(
  dataDir: string,
  bookId: string,
): Promise<BookMeta | null> {
  return readJson<BookMeta | null>(bookMetaPath(dataDir, bookId), null)
}

export async function getProgress(
  dataDir: string,
  bookId: string,
): Promise<ReadingProgress | null> {
  return readJson<ReadingProgress | null>(progressPath(dataDir, bookId), null)
}

export async function setProgress(
  dataDir: string,
  bookId: string,
  patch: Partial<ReadingProgress>,
): Promise<ReadingProgress> {
  const meta = await getBookMeta(dataDir, bookId)
  if (!meta) throw new Error('Book not found')
  const existing = await getProgress(dataDir, bookId)
  const chapterCount = meta.chapters.length
  const chapterIndex = Math.min(
    Math.max(0, patch.chapterIndex ?? existing?.chapterIndex ?? 0),
    Math.max(0, chapterCount - 1),
  )
  const rawReaderMode = patch.readerMode ?? existing?.readerMode
  const readerMode =
    rawReaderMode === 'speed' || rawReaderMode === 'standard'
      ? rawReaderMode
      : 'standard'
  const next: ReadingProgress = {
    bookId,
    chapterIndex,
    blockIndex: Math.max(0, patch.blockIndex ?? existing?.blockIndex ?? 0),
    wordIndex: Math.max(0, patch.wordIndex ?? existing?.wordIndex ?? 0),
    percent: Math.min(1, Math.max(0, patch.percent ?? existing?.percent ?? 0)),
    readerMode,
    updatedAt: new Date().toISOString(),
  }
  await mkdir(bookDir(dataDir, bookId), { recursive: true })
  await writeJson(progressPath(dataDir, bookId), next)
  return next
}

function toSummary(
  meta: BookMeta,
  progress: ReadingProgress | null,
): BookSummary {
  return {
    id: meta.id,
    title: meta.title,
    author: meta.author,
    format: meta.format,
    hasCover: meta.hasCover,
    coverColor: meta.coverColor,
    chapterCount: meta.chapters.length,
    wordCount: meta.wordCount,
    addedAt: meta.addedAt,
    updatedAt: meta.updatedAt,
    progress,
  }
}

export async function listBooks(dataDir: string): Promise<BookSummary[]> {
  const ids = await listBookIds(dataDir)
  const summaries: BookSummary[] = []
  for (const id of ids) {
    const meta = await getBookMeta(dataDir, id)
    if (!meta) continue
    const progress = await getProgress(dataDir, id)
    summaries.push(toSummary(meta, progress))
  }
  summaries.sort((a, b) => {
    const at = a.progress?.updatedAt ?? a.addedAt
    const bt = b.progress?.updatedAt ?? b.addedAt
    return bt.localeCompare(at)
  })
  return summaries
}

export async function findBookBySource(
  dataDir: string,
  source: string,
): Promise<BookMeta | null> {
  const ids = await listBookIds(dataDir)
  for (const id of ids) {
    const meta = await getBookMeta(dataDir, id)
    if (meta?.source === source) return meta
  }
  return null
}

export async function getChapter(
  dataDir: string,
  bookId: string,
  index: number,
  assetQuery = '',
): Promise<ChapterContent | null> {
  const stored = await readJson<StoredChapter | null>(
    chapterPath(dataDir, bookId, index),
    null,
  )
  if (!stored) return null
  const text = storedChapterText(stored)
  const resourcePrefix = `/api/books/${encodeURIComponent(bookId)}/resource/`
  const withQuery = stored.html.replace(
    /__RES__\/([^"'<>\n\r]+)/g,
    (_match, rawPath: string) => {
      const resourcePath = rawPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')
      const query = assetQuery ? `?${assetQuery}` : ''
      return `${resourcePrefix}${resourcePath}${query}`
    },
  )
  return {
    bookId,
    index: stored.index,
    title: stored.title,
    html: withQuery,
    text,
    wordCount: countWords(text),
  }
}

function compactSearchText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function searchSnippet(text: string, index: number, queryLength: number) {
  const beforeStart = Math.max(0, index - 120)
  const afterEnd = Math.min(text.length, index + queryLength + 160)
  const beforePrefix = beforeStart > 0 ? '…' : ''
  const afterSuffix = afterEnd < text.length ? '…' : ''
  return {
    before: `${beforePrefix}${compactSearchText(text.slice(beforeStart, index))}`,
    match: compactSearchText(text.slice(index, index + queryLength)),
    after: `${compactSearchText(text.slice(index + queryLength, afterEnd))}${afterSuffix}`,
  }
}

function normalizeForSearch(text: string): { text: string; map: number[] } {
  let normalized = ''
  const map: number[] = []
  let lastWasSpace = true

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? ''
    if (/\s/.test(char)) {
      if (!lastWasSpace) {
        normalized += ' '
        map.push(index)
        lastWasSpace = true
      }
      continue
    }

    normalized += char.toLocaleLowerCase()
    map.push(index)
    lastWasSpace = false
  }

  if (normalized.endsWith(' ')) {
    normalized = normalized.slice(0, -1)
    map.pop()
  }

  return { text: normalized, map }
}

export async function searchBook(
  dataDir: string,
  bookId: string,
  query: string,
  maxResults = 80,
): Promise<BookSearchResponse> {
  const normalizedQuery = compactSearchText(query)
  if (normalizedQuery.length < 2) {
    return { query: normalizedQuery, results: [], total: 0, truncated: false }
  }

  const meta = await getBookMeta(dataDir, bookId)
  if (!meta) throw new Error('Book not found')

  const needle = normalizedQuery.toLocaleLowerCase()
  const results: BookSearchResult[] = []
  let total = 0

  for (const chapterRef of meta.chapters) {
    const chapter = await readJson<StoredChapter | null>(
      chapterPath(dataDir, bookId, chapterRef.index),
      null,
    )
    if (!chapter) continue
    const text = storedChapterText(chapter)
    if (!text) continue

    const normalized = normalizeForSearch(text)
    let index = normalized.text.indexOf(needle)
    while (index >= 0) {
      const textStart = normalized.map[index] ?? 0
      const textEnd =
        normalized.map[
          Math.min(normalized.map.length - 1, index + needle.length)
        ] ?? textStart + normalizedQuery.length
      const textLength = Math.max(normalizedQuery.length, textEnd - textStart)

      total += 1
      if (results.length < maxResults) {
        const snippet = searchSnippet(text, textStart, textLength)
        results.push({
          id: `${bookId}:${chapter.index}:${textStart}`,
          bookId,
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          textStart,
          textLength,
          position:
            text.length > 0
              ? Math.min(1, Math.max(0, textStart / text.length))
              : 0,
          ...snippet,
        })
      }
      index = normalized.text.indexOf(
        needle,
        index + Math.max(1, needle.length),
      )
    }
  }

  return {
    query: normalizedQuery,
    results,
    total,
    truncated: total > results.length,
  }
}

export async function getResourcePath(
  dataDir: string,
  bookId: string,
  relPath: string,
): Promise<{ path: string; contentType: string } | null> {
  const segments = relPath
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
  if (segments.length === 0) return null
  const resolved = safePath(resourcesDir(dataDir, bookId), ...segments)
  if (!(await pathExists(resolved))) return null
  return { path: resolved, contentType: extToContentType(resolved) }
}

export async function getCover(
  dataDir: string,
  bookId: string,
): Promise<{ path: string; contentType: string } | null> {
  try {
    const entries = await readdir(bookDir(dataDir, bookId))
    const cover = entries.find((name) => name.startsWith('cover.'))
    if (!cover) return null
    const path = safePath(bookDir(dataDir, bookId), cover)
    return { path, contentType: extToContentType(path) }
  } catch {
    return null
  }
}

async function uniqueBookId(dataDir: string, seed: string): Promise<string> {
  const base = slugify(seed) || 'book'
  const ids = new Set(await listBookIds(dataDir))
  if (!ids.has(base)) return base
  let n = 2
  while (ids.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

async function writeBook(
  dataDir: string,
  bookId: string,
  data: {
    title: string
    author: string | null
    format: EbookFormat
    language: string | null
    description: string | null
    publisher: string | null
    source: string | null
    chapters: { title: string; href: string; html: string; text: string }[]
    resources?: { path: string; data: Uint8Array }[]
    cover?: { data: Uint8Array; ext: string } | null
  },
): Promise<BookMeta> {
  await mkdir(chaptersDir(dataDir, bookId), { recursive: true })

  const chapterRefs: ChapterRef[] = []
  let totalWords = 0
  for (let index = 0; index < data.chapters.length; index += 1) {
    const chapter = data.chapters[index]
    const wordCount = countWords(chapter.text)
    totalWords += wordCount
    const stored: StoredChapter = {
      index,
      title: chapter.title,
      href: chapter.href,
      html: chapter.html,
      text: chapter.text,
      wordCount,
    }
    await writeJson(chapterPath(dataDir, bookId, index), stored)
    chapterRefs.push({
      index,
      title: chapter.title,
      href: chapter.href,
      wordCount,
    })
  }

  for (const resource of data.resources ?? []) {
    const segments = resource.path
      .split('/')
      .filter((part) => part && part !== '.' && part !== '..')
    if (segments.length === 0) continue
    const target = safePath(resourcesDir(dataDir, bookId), ...segments)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, resource.data)
  }

  let hasCover = false
  if (data.cover) {
    const ext = data.cover.ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'img'
    await writeFile(
      safePath(bookDir(dataDir, bookId), `cover.${ext}`),
      data.cover.data,
    )
    hasCover = true
  }

  const now = new Date().toISOString()
  const meta: BookMeta = {
    id: bookId,
    title: data.title,
    author: data.author,
    format: data.format,
    language: data.language,
    description: data.description,
    publisher: data.publisher,
    hasCover,
    coverColor: coverColorFromSeed(bookId),
    chapters: chapterRefs,
    wordCount: totalWords,
    addedAt: now,
    updatedAt: now,
    source: data.source,
  }
  await writeJson(bookMetaPath(dataDir, bookId), meta)
  return meta
}

export async function importBook(
  dataDir: string,
  filename: string,
  buffer: Uint8Array,
): Promise<BookMeta> {
  const parsed = await parseEbook(filename, buffer)
  if (parsed.chapters.length === 0) {
    throw new Error('No readable content found in this file')
  }
  const id = await uniqueBookId(dataDir, parsed.title || filename)
  return writeBook(dataDir, id, {
    title: parsed.title || filename.replace(/\.[^.]+$/, ''),
    author: parsed.author,
    format: parsed.format,
    language: parsed.language,
    description: parsed.description,
    publisher: parsed.publisher,
    source: filename,
    chapters: parsed.chapters.map((chapter) => ({
      title: chapter.title,
      href: chapter.href,
      html: chapter.html,
      text: chapter.text,
    })),
    resources: parsed.resources.map((resource) => ({
      path: resource.path,
      data: resource.data,
    })),
    cover: parsed.cover
      ? { data: parsed.cover.data, ext: parsed.cover.ext }
      : null,
  })
}

export async function deleteBook(
  dataDir: string,
  bookId: string,
): Promise<void> {
  const meta = await getBookMeta(dataDir, bookId)
  await removeStoreInstalledMarker(dataDir, meta?.source ?? null)
  await rm(bookDir(dataDir, bookId), { recursive: true, force: true })
  // Drop the book from any folder it lived in.
  const folders = await readFolders(dataDir)
  let changed = false
  for (const folder of folders) {
    if (folder.bookIds.includes(bookId)) {
      folder.bookIds = folder.bookIds.filter((id) => id !== bookId)
      folder.updatedAt = new Date().toISOString()
      changed = true
    }
  }
  if (changed) await writeFolders(dataDir, folders)
}

// ─── Default books ───────────────────────────────────────────────────

export async function seedDefaultBooks(dataDir: string): Promise<void> {
  if (DEFAULT_BOOKS.length === 0) return
  const seeded = await readJson<string[]>(seedMarkerPath(dataDir), [])
  const seededSet = new Set(seeded)
  let changed = false
  for (const seed of DEFAULT_BOOKS) {
    if (seededSet.has(seed.id)) continue
    seededSet.add(seed.id)
    changed = true
    if (await pathExists(bookMetaPath(dataDir, seed.id))) continue
    await writeBook(dataDir, seed.id, {
      title: seed.title,
      author: seed.author,
      format: 'epub',
      language: seed.language ?? 'en',
      description: seed.description ?? null,
      publisher: null,
      source: null,
      chapters: seed.chapters.map((chapter) => ({
        title: chapter.title,
        href: '',
        html: chapter.html,
        text: htmlToText(chapter.html),
      })),
    })
  }
  if (changed) {
    await mkdir(dataDir, { recursive: true })
    await writeJson(seedMarkerPath(dataDir), Array.from(seededSet))
  }
}

// ─── Folders ─────────────────────────────────────────────────────────

function compareByName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name, undefined, {
    sensitivity: 'base',
    numeric: true,
  })
}

function sortFolders(folders: Folder[]) {
  const hasCustomOrder = folders.some(
    (folder) => typeof folder.sortOrder === 'number',
  )
  return [...folders].sort((a, b) => {
    if (!hasCustomOrder) return compareByName(a, b)
    const aOrder =
      typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY
    const bOrder =
      typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return compareByName(a, b)
  })
}

export async function readFolders(dataDir: string): Promise<Folder[]> {
  const raw = await readJson<Folder[] | null>(foldersPath(dataDir), null)
  if (!Array.isArray(raw)) return []
  const folders = raw
    .filter(
      (folder): folder is Folder =>
        !!folder &&
        typeof folder.id === 'string' &&
        typeof folder.name === 'string' &&
        Array.isArray(folder.bookIds),
    )
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      tone:
        typeof folder.tone === 'string' && folder.tone
          ? folder.tone
          : toneFromSeed(folder.name),
      bookIds: folder.bookIds.filter((id) => typeof id === 'string'),
      sortOrder:
        typeof folder.sortOrder === 'number' &&
        Number.isFinite(folder.sortOrder)
          ? folder.sortOrder
          : undefined,
      createdAt: folder.createdAt ?? new Date().toISOString(),
      updatedAt:
        folder.updatedAt ?? folder.createdAt ?? new Date().toISOString(),
    }))
  return sortFolders(folders)
}

export async function writeFolders(dataDir: string, folders: Folder[]) {
  await mkdir(dataDir, { recursive: true })
  await writeJson(foldersPath(dataDir), folders)
}

export async function addFolder(
  dataDir: string,
  name: string,
  tone?: string,
): Promise<Folder> {
  const folders = await readFolders(dataDir)
  const now = new Date().toISOString()
  const orders = folders
    .map((folder) => folder.sortOrder)
    .filter((order): order is number => typeof order === 'number')
  const folder: Folder = {
    id: generateId(),
    name: name.trim() || 'Untitled',
    tone: tone || toneFromSeed(name),
    bookIds: [],
    sortOrder: orders.length ? Math.max(...orders) + 1 : folders.length,
    createdAt: now,
    updatedAt: now,
  }
  await writeFolders(dataDir, [...folders, folder])
  return folder
}

export async function renameFolder(
  dataDir: string,
  id: string,
  name: string,
): Promise<Folder | null> {
  const folders = await readFolders(dataDir)
  const folder = folders.find((entry) => entry.id === id)
  if (!folder) return null
  folder.name = name.trim() || folder.name
  folder.updatedAt = new Date().toISOString()
  await writeFolders(dataDir, folders)
  return folder
}

export async function deleteFolder(dataDir: string, id: string): Promise<void> {
  const folders = await readFolders(dataDir)
  await writeFolders(
    dataDir,
    folders.filter((folder) => folder.id !== id),
  )
}

export async function reorderFolders(
  dataDir: string,
  folderIds: string[],
): Promise<Folder[]> {
  const folders = await readFolders(dataDir)
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const now = new Date().toISOString()
  let order = 0
  for (const id of folderIds) {
    const folder = byId.get(id)
    if (folder) {
      folder.sortOrder = order
      folder.updatedAt = now
      order += 1
    }
  }
  for (const folder of folders) {
    if (!folderIds.includes(folder.id)) {
      folder.sortOrder = order
      order += 1
    }
  }
  await writeFolders(dataDir, folders)
  return sortFolders(folders)
}

export async function moveBook(
  dataDir: string,
  bookId: string,
  folderId: string | null,
  inFolder = true,
): Promise<Folder[]> {
  const meta = await getBookMeta(dataDir, bookId)
  if (!meta) throw new Error('Book not found')
  const folders = await readFolders(dataDir)
  if (folderId !== null && !folders.some((folder) => folder.id === folderId)) {
    throw new Error('Folder not found')
  }

  const now = new Date().toISOString()
  let changed = false

  for (const folder of folders) {
    const had = folder.bookIds.includes(bookId)
    const shouldUpdate = folderId === null ? had : folder.id === folderId
    if (!shouldUpdate) continue

    const nextBookIds =
      folderId === null || !inFolder
        ? folder.bookIds.filter((id) => id !== bookId)
        : [...folder.bookIds.filter((id) => id !== bookId), bookId]

    if (nextBookIds.length === folder.bookIds.length && had === inFolder)
      continue

    folder.bookIds = nextBookIds
    folder.updatedAt = now
    changed = true
  }

  if (changed) await writeFolders(dataDir, folders)
  return sortFolders(folders)
}

export async function foldersResponse(
  dataDir: string,
): Promise<FoldersResponse> {
  return { folders: await readFolders(dataDir) }
}

// ─── Settings ────────────────────────────────────────────────────────

export async function getSettings(dataDir: string): Promise<ReaderSettings> {
  const raw = await readJson<Partial<ReaderSettings> | null>(
    settingsPath(dataDir),
    null,
  )
  return normalizeReaderSettings(raw)
}

export async function saveSettings(
  dataDir: string,
  patch: Partial<ReaderSettings>,
): Promise<ReaderSettings> {
  const current = await getSettings(dataDir)
  const next = normalizeReaderSettings({ ...current, ...patch })
  await mkdir(dataDir, { recursive: true })
  await writeJson(settingsPath(dataDir), next)
  return next
}
