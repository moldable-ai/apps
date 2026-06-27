import type { EbookFormat } from '../shared/book'
import type {
  ParsedBook,
  ParsedChapter,
  ParsedCover,
  ParsedResource,
} from './parsed-book'
import { XMLParser } from 'fast-xml-parser'
import { strFromU8, unzipSync } from 'fflate'
import sanitizeHtml from 'sanitize-html'

/**
 * Parses an ebook file buffer into a normalized ParsedBook. Supports EPUB
 * (`.epub`, a zip) and plain text (`.txt`). Throws clear Errors on corrupt or
 * unsupported input.
 */
export async function parseEbook(
  filename: string,
  buffer: Uint8Array,
): Promise<ParsedBook> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.txt')) {
    return parseText(filename, buffer)
  }
  return parseEpub(filename, buffer)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function contentTypeFromPath(path: string): string {
  const ext = extFromPath(path)
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
    default:
      return 'application/octet-stream'
  }
}

function extFromPath(path: string): string {
  const clean = path.split(/[?#]/)[0] ?? path
  const dot = clean.lastIndexOf('.')
  if (dot < 0) return ''
  return clean.slice(dot + 1).toLowerCase()
}

/** Resolve an href relative to a base directory into a clean root-relative path. */
function resolveRelative(baseDir: string, href: string): string {
  let target = href.split(/[?#]/)[0] ?? href
  try {
    target = decodeURIComponent(target)
  } catch {
    // leave as-is if it is not valid percent-encoding
  }
  target = target.replace(/\\/g, '/')

  if (target.startsWith('/')) {
    return normalizeSegments(target.replace(/^\/+/, ''))
  }

  const base = baseDir.replace(/\\/g, '/').replace(/\/+$/, '')
  const combined = base ? `${base}/${target}` : target
  return normalizeSegments(combined)
}

function normalizeSegments(path: string): string {
  const out: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      out.pop()
      continue
    }
    out.push(segment)
  }
  return out.join('/')
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx < 0 ? '' : path.slice(0, idx)
}

const BLOCK_TAG_NAMES =
  'address|article|aside|blockquote|body|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul'
const BLOCK_TAG = new RegExp(
  `<\\s*\\/?\\s*(?:${BLOCK_TAG_NAMES})(?:\\s+[^>]*)?\\/?\\s*>`,
  'gi',
)

/**
 * Convert readable/sanitized HTML to plain text while preserving rendered word
 * boundaries. Block elements produce line breaks; inline elements (span, em,
 * a, etc.) do not introduce artificial spaces, so EPUB drop caps like
 * `<span class="dropcap">O</span>n` become `On`, not `O n`.
 */
export function htmlToText(html: string): string {
  if (!html) return ''
  let text = html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '\n')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*img\b[^>]*>/gi, '\n')
    .replace(BLOCK_TAG, '\n')
    .replace(/<[^>]+>/g, '')

  text = decodeEntities(text)

  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
}

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const code = Number.parseInt(body.slice(2), 16)
        return Number.isFinite(code) ? String.fromCodePoint(code) : match
      }
      if (body.startsWith('#')) {
        const code = Number.parseInt(body.slice(1), 10)
        return Number.isFinite(code) ? String.fromCodePoint(code) : match
      }
      const named = NAMED_ENTITIES[body]
      return named !== undefined ? named : match
    },
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function collapseInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function readableDocumentHtml(rawHtml: string): string {
  const bodyMatch = rawHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return bodyMatch[1] ?? ''
  return rawHtml.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, ' ')
}

// ---------------------------------------------------------------------------
// XML helpers (tolerant of arrays vs single objects)
// ---------------------------------------------------------------------------

type XmlNode = Record<string, unknown>

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

/** Look up a child by local name, ignoring any namespace prefix. */
function getChild(node: unknown, localName: string): unknown {
  if (!node || typeof node !== 'object') return undefined
  const obj = node as XmlNode
  if (localName in obj) return obj[localName]
  const lowered = localName.toLowerCase()
  for (const key of Object.keys(obj)) {
    const bare = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key
    if (bare.toLowerCase() === lowered) return obj[key]
  }
  return undefined
}

function getAttr(node: unknown, attr: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  const value = (node as XmlNode)[`@_${attr}`]
  return value === undefined || value === null ? undefined : String(value)
}

/** Extract text content from an XML node that may be a string or have #text. */
function nodeText(node: unknown): string {
  if (node === undefined || node === null) return ''
  if (typeof node === 'string') return node.trim()
  if (typeof node === 'number' || typeof node === 'boolean') {
    return String(node)
  }
  if (typeof node === 'object') {
    const text = (node as XmlNode)['#text']
    if (text !== undefined && text !== null) return String(text).trim()
  }
  return ''
}

// ---------------------------------------------------------------------------
// EPUB parsing
// ---------------------------------------------------------------------------

interface ManifestItem {
  id: string
  href: string
  mediaType: string
  properties: string
  /** root-relative resolved path */
  path: string
}

async function parseEpub(
  filename: string,
  buffer: Uint8Array,
): Promise<ParsedBook> {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(buffer)
  } catch {
    throw new Error('Unsupported or corrupt file')
  }

  // Build a case-sensitive lookup that also tolerates leading slashes.
  const fileMap = new Map<string, Uint8Array>()
  for (const [name, data] of Object.entries(files)) {
    fileMap.set(name.replace(/^\/+/, ''), data)
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  })

  // 1. Locate the OPF via META-INF/container.xml
  const containerBytes = fileMap.get('META-INF/container.xml')
  if (!containerBytes) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml')
  }
  const containerDoc = parser.parse(strFromU8(containerBytes)) as XmlNode
  const container = getChild(containerDoc, 'container')
  const rootfiles = getChild(container, 'rootfiles')
  const rootfileList = asArray(getChild(rootfiles, 'rootfile'))
  let opfPath = ''
  for (const rootfile of rootfileList) {
    const full = getAttr(rootfile, 'full-path')
    if (full) {
      opfPath = normalizeSegments(full.replace(/^\/+/, ''))
      break
    }
  }
  if (!opfPath) {
    throw new Error('Invalid EPUB: no rootfile in container.xml')
  }

  const opfBytes = fileMap.get(opfPath)
  if (!opfBytes) {
    throw new Error(`Invalid EPUB: OPF not found at ${opfPath}`)
  }
  const opfDir = dirname(opfPath)
  const opfDoc = parser.parse(strFromU8(opfBytes)) as XmlNode
  const pkg = getChild(opfDoc, 'package')
  if (!pkg) {
    throw new Error('Invalid EPUB: malformed OPF package')
  }

  // 2. Metadata
  const metadata = getChild(pkg, 'metadata')
  const title =
    collapseInlineWhitespace(htmlToText(firstMetaText(metadata, 'title'))) ||
    prettifyFilename(filename)
  const author =
    collapseInlineWhitespace(htmlToText(firstMetaText(metadata, 'creator'))) ||
    null
  const language =
    collapseInlineWhitespace(htmlToText(firstMetaText(metadata, 'language'))) ||
    null
  const description =
    collapseInlineWhitespace(
      htmlToText(firstMetaText(metadata, 'description')),
    ) || null
  const publisher =
    collapseInlineWhitespace(
      htmlToText(firstMetaText(metadata, 'publisher')),
    ) || null

  // 3. Manifest + spine
  const manifestNode = getChild(pkg, 'manifest')
  const manifestById = new Map<string, ManifestItem>()
  const manifestByPath = new Map<string, ManifestItem>()
  for (const raw of asArray(getChild(manifestNode, 'item'))) {
    const id = getAttr(raw, 'id')
    const href = getAttr(raw, 'href')
    if (!id || !href) continue
    const path = resolveRelative(opfDir, href)
    const item: ManifestItem = {
      id,
      href,
      mediaType: getAttr(raw, 'media-type') ?? '',
      properties: getAttr(raw, 'properties') ?? '',
      path,
    }
    manifestById.set(id, item)
    manifestByPath.set(path, item)
  }

  const spineNode = getChild(pkg, 'spine')
  const spineRefs = asArray(getChild(spineNode, 'itemref'))
  const spineItems: ManifestItem[] = []
  for (const ref of spineRefs) {
    const idref = getAttr(ref, 'idref')
    if (!idref) continue
    const item = manifestById.get(idref)
    if (item) spineItems.push(item)
  }

  // 5. Title map from nav / ncx
  const titleByPath = buildTitleMap(
    parser,
    fileMap,
    manifestById,
    spineNode,
    opfDir,
  )

  // Track resources, deduped by path.
  const resourceMap = new Map<string, ParsedResource>()
  const addResource = (path: string): boolean => {
    if (resourceMap.has(path)) return true
    const data = fileMap.get(path)
    if (!data) return false
    resourceMap.set(path, {
      path,
      data,
      contentType: contentTypeFromPath(path),
    })
    return true
  }

  // 4. Build chapters from spine
  const chapters: ParsedChapter[] = []
  for (const item of spineItems) {
    if (!isHtmlMediaType(item.mediaType, item.path)) continue
    const bytes = fileMap.get(item.path)
    if (!bytes) continue
    const rawHtml = strFromU8(bytes)
    const chapterDir = dirname(item.path)
    const html = sanitizeChapterHtml(rawHtml, chapterDir, addResource)
    const text = htmlToText(html)

    // 7. Skip spine items that are empty after stripping.
    if (!text.trim()) continue

    const title = titleByPath.get(item.path) ?? firstHeading(rawHtml) ?? ''
    chapters.push({
      index: chapters.length,
      title: title || `Chapter ${chapters.length + 1}`,
      href: item.href,
      html,
      text,
    })
  }

  // Never return zero chapters if any text exists: retry including empties.
  if (chapters.length === 0) {
    for (const item of spineItems) {
      if (!isHtmlMediaType(item.mediaType, item.path)) continue
      const bytes = fileMap.get(item.path)
      if (!bytes) continue
      const rawHtml = strFromU8(bytes)
      const chapterDir = dirname(item.path)
      const html = sanitizeChapterHtml(rawHtml, chapterDir, addResource)
      const text = htmlToText(html)
      if (!text.trim() && !html.trim()) continue
      const title = titleByPath.get(item.path) ?? firstHeading(rawHtml) ?? ''
      chapters.push({
        index: chapters.length,
        title: title || `Chapter ${chapters.length + 1}`,
        href: item.href,
        html,
        text,
      })
    }
  }

  // 8. Cover
  const cover = findCover(metadata, manifestById, manifestByPath, fileMap)

  return {
    title,
    author,
    language,
    description,
    publisher,
    format: 'epub' satisfies EbookFormat,
    chapters,
    resources: [...resourceMap.values()],
    cover,
  }
}

function isHtmlMediaType(mediaType: string, path: string): boolean {
  const mt = mediaType.toLowerCase()
  if (mt.includes('xhtml') || mt === 'text/html' || mt.includes('html')) {
    return true
  }
  if (!mediaType) {
    const ext = extFromPath(path)
    return ext === 'xhtml' || ext === 'html' || ext === 'htm'
  }
  return false
}

function firstMetaText(metadata: unknown, localName: string): string {
  const node = getChild(metadata, localName)
  const entries = asArray(node)
  for (const entry of entries) {
    const text = nodeText(entry)
    if (text) return text
  }
  return ''
}

/** Sanitize chapter HTML, rewriting image refs to __RES__/<path> placeholders. */
function sanitizeChapterHtml(
  rawHtml: string,
  chapterDir: string,
  addResource: (path: string) => boolean,
): string {
  const readableHtml = readableDocumentHtml(rawHtml)
  return sanitizeHtml(readableHtml, {
    allowedTags: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'em',
      'i',
      'strong',
      'b',
      'blockquote',
      'ul',
      'ol',
      'li',
      'br',
      'hr',
      'a',
      'img',
      'figure',
      'figcaption',
      'span',
      'sup',
      'sub',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
      'pre',
      'code',
    ],
    allowedAttributes: {
      a: ['href'],
      img: ['src', 'alt'],
      '*': ['class', 'id'],
    },
    disallowedTagsMode: 'discard',
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src
        if (!src) {
          return { tagName, attribs }
        }
        const resolved = resolveRelative(chapterDir, src)
        if (resolved && addResource(resolved)) {
          return {
            tagName,
            attribs: { ...attribs, src: `__RES__/${resolved}` },
          }
        }
        // Image missing in zip: drop the src.
        const next = { ...attribs }
        delete next.src
        return { tagName, attribs: next }
      },
    },
  })
}

/** First h1/h2/h3 text from raw chapter HTML, or undefined. */
function firstHeading(rawHtml: string): string | undefined {
  const match = rawHtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)
  if (!match) return undefined
  const text = collapseInlineWhitespace(htmlToText(match[1] ?? ''))
  return text || undefined
}

function buildTitleMap(
  parser: XMLParser,
  fileMap: Map<string, Uint8Array>,
  manifestById: Map<string, ManifestItem>,
  spineNode: unknown,
  opfDir: string,
): Map<string, string> {
  const map = new Map<string, string>()

  // EPUB3 nav document
  for (const item of manifestById.values()) {
    if (/\bnav\b/.test(item.properties)) {
      const bytes = fileMap.get(item.path)
      if (bytes) {
        parseNavDocument(bytes, dirname(item.path), map)
      }
      break
    }
  }

  // toc.ncx via spine @toc -> manifest item
  const tocId = getAttr(spineNode, 'toc')
  if (tocId) {
    const ncxItem = manifestById.get(tocId)
    if (ncxItem) {
      const bytes = fileMap.get(ncxItem.path)
      if (bytes) {
        parseNcx(parser, bytes, dirname(ncxItem.path), map)
      }
    }
  }

  // Fallback: any manifest item that looks like an ncx.
  if (map.size === 0) {
    for (const item of manifestById.values()) {
      if (item.mediaType.includes('ncx') || extFromPath(item.path) === 'ncx') {
        const bytes = fileMap.get(item.path)
        if (bytes) {
          parseNcx(parser, bytes, dirname(item.path), map)
        }
        break
      }
    }
  }

  return map
}

function parseNavDocument(
  bytes: Uint8Array,
  navDir: string,
  map: Map<string, string>,
): void {
  const html = strFromU8(bytes)
  // Find anchors inside the nav; match href + inner text.
  const anchorRe =
    /<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchorRe.exec(html)) !== null) {
    const href = match[2] ?? match[3] ?? ''
    const label = collapseInlineWhitespace(htmlToText(match[4] ?? ''))
    if (!href || !label) continue
    const path = resolveRelative(navDir, href)
    if (path && !map.has(path)) {
      map.set(path, label)
    }
  }
}

function parseNcx(
  parser: XMLParser,
  bytes: Uint8Array,
  ncxDir: string,
  map: Map<string, string>,
): void {
  const doc = parser.parse(strFromU8(bytes)) as XmlNode
  const ncx = getChild(doc, 'ncx')
  const navMap = getChild(ncx, 'navMap')
  walkNavPoints(getChild(navMap, 'navPoint'), ncxDir, map)
}

function walkNavPoints(
  node: unknown,
  ncxDir: string,
  map: Map<string, string>,
): void {
  for (const point of asArray(node)) {
    const navLabel = getChild(point, 'navLabel')
    const label = collapseInlineWhitespace(
      htmlToText(nodeText(getChild(navLabel, 'text'))),
    )
    const content = getChild(point, 'content')
    const src = getAttr(content, 'src')
    if (src && label) {
      const path = resolveRelative(ncxDir, src)
      if (path && !map.has(path)) {
        map.set(path, label)
      }
    }
    // Nested navPoints
    walkNavPoints(getChild(point, 'navPoint'), ncxDir, map)
  }
}

function findCover(
  metadata: unknown,
  manifestById: Map<string, ManifestItem>,
  manifestByPath: Map<string, ManifestItem>,
  fileMap: Map<string, Uint8Array>,
): ParsedCover | null {
  let coverItem: ManifestItem | undefined

  // <meta name="cover" content="ID">
  for (const meta of asArray(getChild(metadata, 'meta'))) {
    if (getAttr(meta, 'name') === 'cover') {
      const id = getAttr(meta, 'content')
      if (id) {
        coverItem = manifestById.get(id)
      }
      break
    }
  }

  // manifest item with properties="cover-image"
  if (!coverItem) {
    for (const item of manifestById.values()) {
      if (/\bcover-image\b/.test(item.properties)) {
        coverItem = item
        break
      }
    }
  }

  if (!coverItem) {
    void manifestByPath
    return null
  }

  const data = fileMap.get(coverItem.path)
  if (!data) return null
  return {
    data,
    contentType: contentTypeFromPath(coverItem.path),
    ext: extFromPath(coverItem.path) || 'bin',
  }
}

// ---------------------------------------------------------------------------
// Plain text parsing
// ---------------------------------------------------------------------------

const CHAPTER_MARKER = /^\s*(chapter\s+\w+|[IVXLC]+\.)\s*$/i
const SPLIT_WORD_THRESHOLD = 3500
const TARGET_CHAPTER_WORDS = 3000

function parseText(filename: string, buffer: Uint8Array): ParsedBook {
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(buffer).replace(/\r\n?/g, '\n')
  const title = prettifyFilename(filename)

  const lines = text.split('\n')
  const markerIndexes: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    if (CHAPTER_MARKER.test(lines[i] ?? '')) {
      markerIndexes.push(i)
    }
  }

  let chapters: ParsedChapter[]
  if (markerIndexes.length > 0) {
    chapters = splitByMarkers(lines, markerIndexes)
  } else {
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
    if (wordCount > SPLIT_WORD_THRESHOLD) {
      chapters = splitByWordCount(text)
    } else {
      chapters = [makeTextChapter(0, 'Text', text)]
    }
  }

  if (chapters.length === 0) {
    chapters = [makeTextChapter(0, 'Text', text)]
  }

  return {
    title,
    author: null,
    language: 'en',
    description: null,
    publisher: null,
    format: 'txt' satisfies EbookFormat,
    chapters,
    resources: [],
    cover: null,
  }
}

function splitByMarkers(
  lines: string[],
  markerIndexes: number[],
): ParsedChapter[] {
  const chapters: ParsedChapter[] = []

  // Preamble before the first marker, if it has content.
  const firstMarker = markerIndexes[0] ?? lines.length
  if (firstMarker > 0) {
    const preamble = lines.slice(0, firstMarker).join('\n')
    if (preamble.trim()) {
      chapters.push(makeTextChapter(chapters.length, 'Text', preamble))
    }
  }

  for (let i = 0; i < markerIndexes.length; i += 1) {
    const start = markerIndexes[i] ?? 0
    const end = markerIndexes[i + 1] ?? lines.length
    const markerLine = collapseInlineWhitespace(lines[start] ?? '')
    const body = lines.slice(start + 1, end).join('\n')
    const title = markerLine || `Chapter ${chapters.length + 1}`
    chapters.push(makeTextChapter(chapters.length, title, body))
  }

  return chapters.filter((chapter) => chapter.text.trim().length > 0)
}

function splitByWordCount(text: string): ParsedChapter[] {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0)
  const chapters: ParsedChapter[] = []
  let current: string[] = []
  let currentWords = 0

  const flush = (): void => {
    if (current.length === 0) return
    const body = current.join('\n\n')
    chapters.push(
      makeTextChapter(chapters.length, `Part ${chapters.length + 1}`, body),
    )
    current = []
    currentWords = 0
  }

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).length
    current.push(paragraph)
    currentWords += words
    if (currentWords >= TARGET_CHAPTER_WORDS) {
      flush()
    }
  }
  flush()

  return chapters
}

function makeTextChapter(
  index: number,
  title: string,
  body: string,
): ParsedChapter {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => collapseInlineWhitespace(p))
    .filter((p) => p.length > 0)

  const html = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
  const text = paragraphs.join('\n\n')

  return {
    index,
    title,
    href: `text-${index}`,
    html,
    text,
  }
}

function prettifyFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename
  const noExt = base.replace(/\.[^.]+$/, '')
  const pretty = noExt.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return pretty || 'Untitled'
}
