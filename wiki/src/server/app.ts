import {
  ensureDir,
  getAppDataDir,
  getWorkspaceFromRequest,
  safePath,
} from '@moldable-ai/storage'
import type {
  WikiEntry,
  WikiGraphResponse,
  WikiHeading,
  WikiHealthIssue,
  WikiHealthResponse,
  WikiNoteFont,
  WikiPropertiesResponse,
  WikiProperty,
  WikiPropertyDefinition,
  WikiPropertyType,
  WikiPropertyTypesResponse,
  WikiSearchResult,
  WikiTabsResponse,
  WikiTrashItem,
  WikiTreeResponse,
  WikiVault,
  WikiVaultSettings,
  WikiVaultsResponse,
} from '../shared/types'
import { type Context, Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

export const app = new Hono()

app.use('/api/moldable/today', async (c, next) => {
  if (c.req.method !== 'GET') {
    await next()
    return
  }

  await next()

  const response = c.res
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return

  const data = (await response
    .clone()
    .json()
    .catch(() => null)) as unknown
  if (!isMoldableTodayResponse(data)) return

  const dismissals = await readMoldableTodayDismissals(c.req.raw)
  const items = filterMoldableTodayDismissedItems(data.items, dismissals)
  if (items.length === data.items.length) return

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify({ ...data, items }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
app.use('/api/*', cors())

const notePathSchema = z.object({
  path: z.string().min(1),
})

const mediaPathSchema = z.object({
  path: z.string().min(1),
  vault: z.string().trim().min(1).optional(),
  workspace: z.string().trim().min(1).optional(),
})

const importMediaPathsSchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(50),
})

const applyTemplateSchema = z.object({
  templatePath: z.string().min(1),
  targetPath: z.string().min(1).optional(),
})

const propertyTypeSchema = z.enum([
  'text',
  'list',
  'tags',
  'number',
  'checkbox',
  'date',
  'datetime',
])

const updatePropertyTypeSchema = z.object({
  key: z.string().trim().min(1).max(80),
  oldKey: z.string().trim().min(1).max(80).optional(),
  type: propertyTypeSchema,
})

const renamePropertySchema = z.object({
  oldKey: z.string().trim().min(1).max(80),
  newKey: z.string().trim().min(1).max(80),
})

const propertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number(), z.boolean()])),
])

const updateNotePropertySchema = z.object({
  path: z.string().min(1),
  key: z.string().trim().min(1).max(80),
  value: propertyValueSchema,
  type: propertyTypeSchema.optional(),
})

const deleteNotePropertySchema = z.object({
  path: z.string().min(1),
  key: z.string().trim().min(1).max(80),
})

const reorderNotePropertiesSchema = z.object({
  path: z.string().min(1),
  orderedKeys: z.array(z.string().trim().min(1).max(80)).min(1),
})

const noteFontSchema = z.enum([
  'system',
  'georgia',
  'charter',
  'serif',
  'dyslexic',
] satisfies WikiNoteFont[])

const updateVaultSettingsSchema = z.object({
  showPropertiesInNotes: z.boolean().optional(),
  noteFont: noteFontSchema.optional(),
})

const saveNoteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    folder: z.string().optional(),
    content: z.string().optional(),
    path: z.string().trim().min(1).max(240).optional(),
  })
  .refine((body) => body.title || body.path, {
    message: 'Title or path is required',
  })

const createFolderSchema = z.object({
  path: z.string().trim().min(1).max(240),
})

const bootstrapTemplateIdSchema = z.enum([
  'knowledge',
  'project',
  'journal',
  'health',
])

const createVaultSchema = z.object({
  name: z.string().trim().min(1).max(80),
  template: bootstrapTemplateIdSchema.optional(),
})

const updateVaultSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

const bootstrapTemplateSchema = z.object({
  template: bootstrapTemplateIdSchema,
})

const switchVaultSchema = z.object({
  id: z.string().trim().min(1).max(80),
})

const trashItemSchema = z.object({
  id: z.string().min(1),
})

const moveSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(['folder', 'note']),
  content: z.string().optional(),
  contentPath: z.string().optional(),
})

const rpcRequestSchema = z.object({
  method: z.string(),
  params: z.unknown().optional(),
})

const tabStateSchema = z.object({
  activePath: z.string().nullable(),
  tabs: z
    .array(
      z.object({
        path: z.string().min(1),
        title: z.string().min(1).max(200),
        isActive: z.boolean(),
      }),
    )
    .max(64),
})

type MarkdownDocument = {
  path: string
  title: string
  content: string
  updatedAt: string
  size: number
  wordCount: number
  headings: WikiHeading[]
  properties: WikiProperty[]
}

type LinkRewrite = {
  from: string
  to: string
  kind: 'folder' | 'note'
}

function defaultVault(): WikiVault {
  return {
    id: 'default',
    name: 'Wiki',
    createdAt: new Date(0).toISOString(),
  }
}

function getVaultsConfigPath(workspaceId?: string) {
  return safePath(getAppDataDir(workspaceId), 'vaults.json')
}

function getVaultDir(workspaceId?: string, vaultId = 'default') {
  if (vaultId === 'default')
    return safePath(getAppDataDir(workspaceId), 'vault')
  return safePath(getAppDataDir(workspaceId), 'vaults', vaultId)
}

function getTrashDir(workspaceId: string | undefined, vaultId = 'default') {
  return safePath(getVaultDir(workspaceId, vaultId), '.trash')
}

function getTrashIndexPath(
  workspaceId: string | undefined,
  vaultId = 'default',
) {
  return safePath(getTrashDir(workspaceId, vaultId), 'index.json')
}

function getWikiConfigDir(
  workspaceId: string | undefined,
  vaultId = 'default',
) {
  return safePath(getVaultDir(workspaceId, vaultId), '.wiki')
}

function getPropertyTypesPath(
  workspaceId: string | undefined,
  vaultId = 'default',
) {
  return safePath(getWikiConfigDir(workspaceId, vaultId), 'property-types.json')
}

function getVaultSettingsPath(
  workspaceId: string | undefined,
  vaultId = 'default',
) {
  return safePath(getWikiConfigDir(workspaceId, vaultId), 'settings.json')
}

function getTabsStatePath(
  workspaceId: string | undefined,
  vaultId = 'default',
) {
  return safePath(getWikiConfigDir(workspaceId, vaultId), 'tabs.json')
}

function slugifyVaultId(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'vault'
}

async function readVaults(workspaceId?: string): Promise<WikiVaultsResponse> {
  const configPath = getVaultsConfigPath(workspaceId)

  try {
    const parsed = JSON.parse(
      await fs.readFile(configPath, 'utf-8'),
    ) as Partial<WikiVaultsResponse>
    const vaults =
      Array.isArray(parsed.vaults) && parsed.vaults.length > 0
        ? parsed.vaults.filter(
            (vault): vault is WikiVault =>
              typeof vault?.id === 'string' &&
              typeof vault.name === 'string' &&
              typeof vault.createdAt === 'string',
          )
        : [defaultVault()]
    const activeVaultId =
      typeof parsed.activeVaultId === 'string' &&
      vaults.some((vault) => vault.id === parsed.activeVaultId)
        ? parsed.activeVaultId
        : (vaults[0]?.id ?? 'default')

    return { activeVaultId, vaults }
  } catch {
    const response = {
      activeVaultId: 'default',
      vaults: [defaultVault()],
    }
    await writeVaults(workspaceId, response)
    return response
  }
}

async function writeVaults(
  workspaceId: string | undefined,
  response: WikiVaultsResponse,
) {
  const configPath = getVaultsConfigPath(workspaceId)
  await ensureDir(path.dirname(configPath))
  await fs.writeFile(configPath, JSON.stringify(response, null, 2), 'utf-8')
}

async function readTabsState(
  workspaceId: string | undefined,
  vaultId = 'default',
): Promise<WikiTabsResponse> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(getTabsStatePath(workspaceId, vaultId), 'utf-8'),
    )
    const state = tabStateSchema
      .extend({ updatedAt: z.string().nullable().optional() })
      .parse(parsed)

    return {
      activePath: state.activePath,
      tabs: state.tabs.map((tab) => ({
        ...tab,
        isActive: tab.path === state.activePath || tab.isActive,
      })),
      updatedAt: state.updatedAt ?? null,
    }
  } catch {
    return { activePath: null, tabs: [], updatedAt: null }
  }
}

async function writeTabsState(
  workspaceId: string | undefined,
  vaultId: string,
  state: z.infer<typeof tabStateSchema>,
): Promise<WikiTabsResponse> {
  const tabs = state.tabs.map((tab) => ({
    path: normalizeWikiPath(tab.path),
    title: tab.title.trim() || titleFromNotePath(tab.path),
  }))
  const requestedActivePath = state.activePath
    ? normalizeWikiPath(state.activePath)
    : null
  const activePath =
    requestedActivePath && tabs.some((tab) => tab.path === requestedActivePath)
      ? requestedActivePath
      : null
  const response: WikiTabsResponse = {
    activePath,
    tabs: tabs.map((tab) => ({
      ...tab,
      isActive: activePath === tab.path,
    })),
    updatedAt: new Date().toISOString(),
  }

  await ensureDir(getWikiConfigDir(workspaceId, vaultId))
  await fs.writeFile(
    getTabsStatePath(workspaceId, vaultId),
    JSON.stringify(response, null, 2),
    'utf-8',
  )

  return response
}

async function getActiveVaultId(workspaceId?: string) {
  return (await readVaults(workspaceId)).activeVaultId
}

async function createVault(
  workspaceId: string | undefined,
  name: string,
  template?: z.infer<typeof bootstrapTemplateIdSchema>,
) {
  const response = await readVaults(workspaceId)
  const baseId = slugifyVaultId(name)
  const ids = new Set(response.vaults.map((vault) => vault.id))
  let id = baseId
  let index = 2

  while (ids.has(id)) {
    id = `${baseId}-${index}`
    index += 1
  }

  const vault: WikiVault = {
    id,
    name,
    createdAt: new Date().toISOString(),
  }
  const next = {
    activeVaultId: id,
    vaults: [...response.vaults, vault],
  }

  await ensureVaultDir(workspaceId, id)
  if (template) await bootstrapVault(workspaceId, id, template)
  await writeVaults(workspaceId, next)
  return next
}

async function updateVault(
  workspaceId: string | undefined,
  id: string,
  name: string,
) {
  const response = await readVaults(workspaceId)

  if (!response.vaults.some((vault) => vault.id === id)) {
    throw new Error('Vault not found')
  }

  const next = {
    ...response,
    vaults: response.vaults.map((vault) =>
      vault.id === id ? { ...vault, name } : vault,
    ),
  }

  await writeVaults(workspaceId, next)
  return next
}

async function deleteVault(workspaceId: string | undefined, id: string) {
  const response = await readVaults(workspaceId)

  if (!response.vaults.some((vault) => vault.id === id)) {
    throw new Error('Vault not found')
  }

  await fs.rm(getVaultDir(workspaceId, id), { force: true, recursive: true })

  const remainingVaults = response.vaults.filter((vault) => vault.id !== id)
  const next =
    remainingVaults.length > 0
      ? {
          activeVaultId:
            response.activeVaultId === id
              ? (remainingVaults[0]?.id ?? 'default')
              : response.activeVaultId,
          vaults: remainingVaults,
        }
      : {
          activeVaultId: 'default',
          vaults: [defaultVault()],
        }

  await ensureVaultDir(workspaceId, next.activeVaultId)
  await writeVaults(workspaceId, next)
  return next
}

function normalizeWikiPath(value: string, options: { note?: boolean } = {}) {
  const trimmed = value.trim().replace(/^\/+/, '')
  const normalized = path.posix.normalize(trimmed)

  if (!trimmed || normalized === '.' || normalized === '..') {
    throw new Error('Path is required')
  }

  if (
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized) ||
    normalized.includes('\0') ||
    normalized.includes('\\')
  ) {
    throw new Error('Invalid path')
  }

  const clean = normalized.split('/').filter(Boolean).join('/')
  if (!clean) throw new Error('Path is required')

  if (options.note && !clean.endsWith('.md')) {
    return `${clean}.md`
  }

  return clean
}

function resolveVaultPath(
  workspaceId: string | undefined,
  relativePath = '',
  vaultId = 'default',
) {
  return relativePath
    ? safePath(getVaultDir(workspaceId, vaultId), relativePath)
    : getVaultDir(workspaceId, vaultId)
}

function getFolderPath(
  workspaceId: string | undefined,
  folder: string | undefined,
  vaultId: string,
) {
  if (!folder?.trim()) return getVaultDir(workspaceId, vaultId)
  return resolveVaultPath(workspaceId, normalizeWikiPath(folder), vaultId)
}

function titleFromMarkdown(relativePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading

  return path.basename(relativePath, '.md').replaceAll('-', ' ')
}

function titleFromNotePath(relativePath: string) {
  return path.basename(relativePath, '.md')
}

function replaceMarkdownTitle(content: string, title: string) {
  if (/^#\s+.+$/m.test(content)) {
    return content.replace(/^#\s+.+$/m, `# ${title}`)
  }

  return [`# ${title}`, '', content.trimStart()].join('\n')
}

function normalizeMaybeNoteLinkTarget(
  value: string,
  sourcePath: string,
  notePaths: Set<string>,
  rewrite?: LinkRewrite,
) {
  const withoutHash = value.trim().split('#')[0]
  let decoded: string
  try {
    decoded = decodeURIComponent(withoutHash)
      .replace(/^wiki:(\/\/)?/, '')
      .replace(/^\/+/, '')
  } catch {
    return null
  }

  if (
    !decoded ||
    decoded.startsWith('http:') ||
    decoded.startsWith('https:') ||
    decoded.startsWith('mailto:') ||
    decoded.includes('\0') ||
    decoded.includes('\\')
  ) {
    return null
  }

  const extension = path.posix.extname(decoded)
  if (extension && extension !== '.md') return null

  const sourceFolder = folderNameFromPath(sourcePath)
  const candidate =
    decoded.startsWith('./') || decoded.startsWith('../')
      ? path.posix.normalize(path.posix.join(sourceFolder, decoded))
      : decoded.replace(/^\.\//, '')

  if (candidate.startsWith('../') || candidate === '..') return null

  const normalized = normalizeWikiPath(candidate, { note: true })
  if (notePaths.has(normalized)) return normalized

  if (sourceFolder && !candidate.includes('/')) {
    const siblingPath = normalizeWikiPath(`${sourceFolder}/${candidate}`, {
      note: true,
    })
    if (notePaths.has(siblingPath)) return siblingPath
    if (rewrite && remapLinkedPath(siblingPath, rewrite) !== siblingPath) {
      return siblingPath
    }
  }

  if (candidate.includes('/')) return normalized

  const basename = normalized
    .split('/')
    .pop()
    ?.replace(/\.md$/, '')
    .toLowerCase()
  if (
    rewrite?.kind === 'note' &&
    rewrite.from.split('/').pop()?.replace(/\.md$/, '').toLowerCase() ===
      basename
  ) {
    return rewrite.from
  }

  const basenameMatches = [...notePaths].filter(
    (notePath) =>
      notePath.split('/').pop()?.replace(/\.md$/, '').toLowerCase() ===
      basename,
  )

  return basenameMatches.length === 1 ? basenameMatches[0] : normalized
}

function remapLinkedPath(targetPath: string, rewrite: LinkRewrite) {
  if (rewrite.kind === 'note') {
    return targetPath === rewrite.from ? rewrite.to : targetPath
  }

  return targetPath === rewrite.from ||
    targetPath.startsWith(`${rewrite.from}/`)
    ? `${rewrite.to}${targetPath.slice(rewrite.from.length)}`
    : targetPath
}

function formatWikiTarget(nextPath: string, originalTarget: string) {
  return originalTarget.trim().endsWith('.md')
    ? nextPath
    : nextPath.replace(/\.md$/, '')
}

function replaceWikiLinkBody(
  body: string,
  sourcePath: string,
  notePaths: Set<string>,
  rewrite: LinkRewrite,
) {
  const targetEndCandidates = [body.indexOf('#'), body.indexOf('|')].filter(
    (index) => index >= 0,
  )
  const targetEnd =
    targetEndCandidates.length > 0
      ? Math.min(...targetEndCandidates)
      : body.length
  const target = body.slice(0, targetEnd).trim()
  if (!target) return body

  const normalized = normalizeMaybeNoteLinkTarget(
    target,
    sourcePath,
    notePaths,
    rewrite,
  )
  if (!normalized) return body

  const remapped = remapLinkedPath(normalized, rewrite)
  if (remapped === normalized) return body

  return `${formatWikiTarget(remapped, target)}${body.slice(targetEnd)}`
}

function replaceMarkdownLinkTarget(
  href: string,
  sourcePath: string,
  notePaths: Set<string>,
  rewrite: LinkRewrite,
) {
  const [pathPart, ...fragmentParts] = href.split('#')
  const normalized = normalizeMaybeNoteLinkTarget(
    pathPart,
    sourcePath,
    notePaths,
    rewrite,
  )
  if (!normalized) return href

  const remapped = remapLinkedPath(normalized, rewrite)
  if (remapped === normalized) return href

  const fragment = fragmentParts.length > 0 ? `#${fragmentParts.join('#')}` : ''
  return `${encodeURI(remapped)}${fragment}`
}

export function rewriteInternalLinksInMarkdown(
  content: string,
  sourcePath: string,
  notePaths: string[],
  rewrite: LinkRewrite,
) {
  const notePathSet = new Set(notePaths)
  const withWikiLinks = content.replace(
    /(!?)\[\[([^\]]+)\]\]/g,
    (match, embedPrefix: string, body: string) => {
      const nextBody = replaceWikiLinkBody(
        body,
        sourcePath,
        notePathSet,
        rewrite,
      )
      return nextBody === body ? match : `${embedPrefix}[[${nextBody}]]`
    },
  )

  return withWikiLinks.replace(
    /(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+["'][^"']*["'])?)\)/g,
    (
      match,
      embedPrefix: string,
      label: string,
      href: string,
      title: string,
    ) => {
      const nextHref = replaceMarkdownLinkTarget(
        href,
        sourcePath,
        notePathSet,
        rewrite,
      )
      return nextHref === href
        ? match
        : `${embedPrefix}[${label}](${nextHref}${title})`
    },
  )
}

function wordCount(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length
}

function headingId(text: string) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[`*_~[\]()]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'heading'
  )
}

function extractHeadings(content: string): WikiHeading[] {
  return content.split('\n').flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line)
    if (!match) return []
    const text = match[2]?.trim()
    if (!text) return []
    return [
      {
        id: headingId(text),
        level: match[1]?.length ?? 1,
        line: index + 1,
        text,
      },
    ]
  })
}

function parseFrontmatterValue(value: string): string {
  const clean = value.trim().replace(/^['"]|['"]$/g, '')
  if (clean.startsWith('[') && clean.endsWith(']')) {
    return clean
      .slice(1, -1)
      .split(',')
      .map((item) => parseFrontmatterValue(item))
      .filter(Boolean)
      .join(', ')
  }
  return clean
}

function inferPropertyType(key: string, value: string): WikiPropertyType {
  const lowerKey = key.toLowerCase()
  const cleanValue = value.trim()
  if (lowerKey === 'tags' || lowerKey === 'tag') return 'tags'
  if (lowerKey === 'aliases' || lowerKey === 'cssclasses') return 'list'
  if (cleanValue.includes(',')) return 'list'
  if (cleanValue === 'true' || cleanValue === 'false') return 'checkbox'
  if (/^-?\d+(\.\d+)?$/.test(cleanValue)) return 'number'
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(cleanValue)) return 'datetime'
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) return 'date'
  return 'text'
}

function parseProperties(content: string): WikiProperty[] {
  if (!content.startsWith('---\n')) return []
  const end = content.indexOf('\n---', 4)
  if (end === -1) return []

  const properties: WikiProperty[] = []
  const lines = content.slice(4, end).split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!match) continue

    const key = match[1] ?? ''
    const rawValue = match[2] ?? ''
    if (!key) continue

    if (rawValue.trim()) {
      properties.push({
        key,
        type: inferPropertyType(key, parseFrontmatterValue(rawValue)),
        value: parseFrontmatterValue(rawValue),
      })
      continue
    }

    const values: string[] = []
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? ''
      if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) break
      const listMatch = /^\s*-\s*(.+)$/.exec(nextLine)
      if (listMatch?.[1]) values.push(parseFrontmatterValue(listMatch[1]))
      index += 1
    }

    const value = values.join(', ')
    properties.push({ key, type: inferPropertyType(key, value), value })
  }

  return properties
}

function normalizePropertyValueForStorage(
  value: z.infer<typeof propertyValueSchema>,
) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ')
  }

  return String(value).trim()
}

function propertyLines(key: string, value: string, type: WikiPropertyType) {
  if (type === 'list' || type === 'tags') {
    const values = value
      .split(',')
      .map((item) => item.trim().replace(/^#/, ''))
      .filter(Boolean)
    if (values.length === 0) return [`${key}: []`]
    return [`${key}:`, ...values.map((item) => `  - ${item}`)]
  }

  if (type === 'checkbox')
    return [`${key}: ${/^(true|yes|1|checked)$/i.test(value)}`]
  if (type === 'number') return [`${key}: ${value || '0'}`]
  if (type === 'date' || type === 'datetime') return [`${key}: ${value}`]

  return [`${key}: ${value}`]
}

function frontmatterEndLineIndex(lines: string[]) {
  if (lines[0] !== '---') return -1
  return lines.findIndex((line, index) => index > 0 && line === '---')
}

function replaceFrontmatterPropertyBlock(
  content: string,
  key: string,
  replacement: string[] | null,
) {
  const cleanKey = key.trim()
  if (!cleanKey) return content

  if (!content.startsWith('---\n')) {
    if (!replacement) return content
    return ['---', ...replacement, '---', '', content.trimStart()].join('\n')
  }

  const lines = content.split('\n')
  const endLine = frontmatterEndLineIndex(lines)
  if (endLine <= 0) {
    if (!replacement) return content
    return ['---', ...replacement, '---', '', content.trimStart()].join('\n')
  }

  let start = -1
  for (let index = 1; index < endLine; index += 1) {
    const line = lines[index] ?? ''
    if (line.toLowerCase().startsWith(`${cleanKey.toLowerCase()}:`)) {
      start = index
      break
    }
  }

  const nextLines = [...lines]
  if (start === -1) {
    if (!replacement) return content
    nextLines.splice(endLine, 0, ...replacement)
    return nextLines.join('\n')
  }

  let end = start + 1
  while (end < endLine && !/^[A-Za-z0-9_-]+:\s*/.test(lines[end] ?? '')) {
    end += 1
  }

  nextLines.splice(start, end - start, ...(replacement ?? []))
  return nextLines.join('\n')
}

function setFrontmatterProperty(
  content: string,
  key: string,
  value: string,
  type: WikiPropertyType,
) {
  return replaceFrontmatterPropertyBlock(
    content,
    key,
    propertyLines(key, value, type),
  )
}

function deleteFrontmatterProperty(content: string, key: string) {
  return replaceFrontmatterPropertyBlock(content, key, null)
}

function reorderFrontmatterProperties(content: string, orderedKeys: string[]) {
  if (!content.startsWith('---\n')) return content
  const lines = content.split('\n')
  const endLine = frontmatterEndLineIndex(lines)
  if (endLine <= 0) return content

  const keyedBlocks: Array<{ key: string; lines: string[] }> = []
  const otherLines: string[] = []
  for (let index = 1; index < endLine; index += 1) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z0-9_-]+):\s*/.exec(line)
    if (!match) {
      otherLines.push(line)
      continue
    }

    const block = [line]
    index += 1
    while (index < endLine) {
      const nextLine = lines[index] ?? ''
      if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) {
        index -= 1
        break
      }
      block.push(nextLine)
      index += 1
    }
    keyedBlocks.push({ key: match[1] ?? '', lines: block })
  }

  const blockByKey = new Map(
    keyedBlocks.map((block) => [block.key.toLowerCase(), block]),
  )
  const orderedKeySet = new Set(orderedKeys.map((key) => key.toLowerCase()))
  const nextBlocks = [
    ...orderedKeys
      .map((key) => blockByKey.get(key.toLowerCase()))
      .filter((block): block is { key: string; lines: string[] } =>
        Boolean(block),
      ),
    ...keyedBlocks.filter(
      (block) => !orderedKeySet.has(block.key.toLowerCase()),
    ),
  ]

  return [
    '---',
    ...otherLines,
    ...nextBlocks.flatMap((block) => block.lines),
    ...lines.slice(endLine),
  ].join('\n')
}

function normalizePropertyTypes(
  value: unknown,
): Record<string, WikiPropertyType> {
  if (!value || typeof value !== 'object') return {}
  const source =
    'types' in value && typeof (value as { types?: unknown }).types === 'object'
      ? (value as { types: unknown }).types
      : value
  if (!source || typeof source !== 'object') return {}

  const entries = Object.entries(source).filter(
    (entry): entry is [string, WikiPropertyType] =>
      typeof entry[0] === 'string' &&
      propertyTypeSchema.safeParse(entry[1]).success,
  )
  return Object.fromEntries(entries)
}

async function readPropertyTypes(
  workspaceId: string | undefined,
  vaultId: string,
): Promise<WikiPropertyTypesResponse> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(getPropertyTypesPath(workspaceId, vaultId), 'utf-8'),
    )
    return { types: normalizePropertyTypes(parsed) }
  } catch {
    return { types: {} }
  }
}

async function writePropertyTypes(
  workspaceId: string | undefined,
  vaultId: string,
  types: Record<string, WikiPropertyType>,
) {
  await ensureDir(getWikiConfigDir(workspaceId, vaultId))
  await fs.writeFile(
    getPropertyTypesPath(workspaceId, vaultId),
    JSON.stringify({ types }, null, 2),
    'utf-8',
  )
  return { types }
}

async function listVaultProperties(
  workspaceId: string | undefined,
  vaultId: string,
): Promise<WikiPropertiesResponse> {
  const [documents, propertyTypes] = await Promise.all([
    getAllDocuments(workspaceId, vaultId),
    readPropertyTypes(workspaceId, vaultId),
  ])
  const counts = new Map<string, number>()
  const inferredTypes = new Map<string, WikiPropertyType>()

  for (const document of documents) {
    for (const property of document.properties) {
      counts.set(property.key, (counts.get(property.key) ?? 0) + 1)
      if (!inferredTypes.has(property.key)) {
        inferredTypes.set(
          property.key,
          property.type ?? inferPropertyType(property.key, property.value),
        )
      }
    }
  }

  const keys = new Set([...Object.keys(propertyTypes.types), ...counts.keys()])
  const properties: WikiPropertyDefinition[] = [...keys]
    .map((key) => ({
      key,
      type: propertyTypes.types[key] ?? inferredTypes.get(key) ?? 'text',
      count: counts.get(key) ?? 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.key.localeCompare(b.key)
    })

  return { properties, types: propertyTypes.types }
}

function renameFrontmatterPropertyKey(
  content: string,
  oldKey: string,
  newKey: string,
) {
  const cleanOldKey = oldKey.trim()
  const cleanNewKey = newKey.trim()
  if (!cleanOldKey || !cleanNewKey || cleanOldKey === cleanNewKey)
    return content
  if (!content.startsWith('---\n')) return content
  const endIndex = content.indexOf('\n---', 4)
  if (endIndex === -1) return content

  const lines = content.split('\n')
  const frontmatterEndLine = lines.findIndex(
    (line, index) => index > 0 && line === '---',
  )
  if (frontmatterEndLine <= 0) return content

  for (let index = 1; index < frontmatterEndLine; index += 1) {
    const line = lines[index] ?? ''
    if (!line.toLowerCase().startsWith(`${cleanOldKey.toLowerCase()}:`))
      continue
    lines[index] = `${cleanNewKey}:${line.slice(line.indexOf(':') + 1)}`
    return lines.join('\n')
  }

  return content
}

async function renamePropertyAcrossVault(
  workspaceId: string | undefined,
  vaultId: string,
  oldKey: string,
  newKey: string,
) {
  const documents = await getAllDocuments(workspaceId, vaultId)
  const propertyTypes = await readPropertyTypes(workspaceId, vaultId)
  const nextTypes = { ...propertyTypes.types }

  if (nextTypes[oldKey]) {
    nextTypes[newKey] = nextTypes[oldKey]
    delete nextTypes[oldKey]
    await writePropertyTypes(workspaceId, vaultId, nextTypes)
  }

  await Promise.all(
    documents.map(async (document) => {
      const nextContent = renameFrontmatterPropertyKey(
        document.content,
        oldKey,
        newKey,
      )
      if (nextContent === document.content) return
      await fs.writeFile(
        resolveVaultPath(workspaceId, document.path, vaultId),
        nextContent,
        'utf-8',
      )
    }),
  )

  return listVaultProperties(workspaceId, vaultId)
}

function defaultVaultSettings(): WikiVaultSettings {
  return { noteFont: 'system', showPropertiesInNotes: true }
}

function normalizeVaultSettings(value: unknown): WikiVaultSettings {
  const defaults = defaultVaultSettings()
  if (!value || typeof value !== 'object') return defaults
  const source = value as Partial<WikiVaultSettings>
  const parsedNoteFont = noteFontSchema.safeParse(source.noteFont)
  return {
    showPropertiesInNotes:
      typeof source.showPropertiesInNotes === 'boolean'
        ? source.showPropertiesInNotes
        : defaults.showPropertiesInNotes,
    noteFont: parsedNoteFont.success ? parsedNoteFont.data : defaults.noteFont,
  }
}

async function readVaultSettings(
  workspaceId: string | undefined,
  vaultId: string,
): Promise<WikiVaultSettings> {
  try {
    const parsed = JSON.parse(
      await fs.readFile(getVaultSettingsPath(workspaceId, vaultId), 'utf-8'),
    )
    return normalizeVaultSettings(parsed)
  } catch {
    return defaultVaultSettings()
  }
}

async function writeVaultSettings(
  workspaceId: string | undefined,
  vaultId: string,
  settings: WikiVaultSettings,
) {
  await ensureDir(getWikiConfigDir(workspaceId, vaultId))
  await fs.writeFile(
    getVaultSettingsPath(workspaceId, vaultId),
    JSON.stringify(settings, null, 2),
    'utf-8',
  )
  return settings
}

function tagsFromContent(content: string) {
  const properties = parseProperties(content)
  const frontmatterTags = properties
    .filter((property) => property.key.toLowerCase() === 'tags')
    .flatMap((property) =>
      property.value
        .replace(/^\[|\]$/g, '')
        .split(/[,\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean),
    )
  const inlineTags = [...content.matchAll(/(^|\s)#([A-Za-z0-9_/-]+)/g)].map(
    (match) => match[2] ?? '',
  )
  return new Set(
    [...frontmatterTags, ...inlineTags].map((tag) => tag.toLowerCase()),
  )
}

function makeSnippet(content: string, needle: string) {
  const lower = content.toLowerCase()
  const index = lower.indexOf(needle.toLowerCase())
  if (index === -1) return content.replace(/\s+/g, ' ').trim().slice(0, 180)
  const start = Math.max(0, index - 80)
  return content
    .slice(start, index + needle.length + 120)
    .replace(/\s+/g, ' ')
    .trim()
}

function makeSnippets(content: string, needles: string[]) {
  const snippets = needles
    .map((needle) => needle.trim())
    .filter(Boolean)
    .map((needle) => makeSnippet(content, needle))
    .filter(Boolean)
  return [...new Set(snippets)].slice(0, 3)
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'untitled'
}

function sanitizeAssetName(value: string) {
  const parsed = path.parse(value)
  const baseName =
    parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'media'
  const extension = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, '')
  return `${baseName}${extension}`
}

function uniqueId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function mediaKindForFile(file: File) {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

function contentTypeForPath(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    '.aac': 'audio/aac',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.m4a': 'audio/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'audio/ogg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
  }
  return types[extension] ?? 'application/octet-stream'
}

function mediaKindForMimeType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

function isSupportedMediaPath(filePath: string) {
  return mediaKindForMimeType(contentTypeForPath(filePath)) !== 'file'
}

function folderNameFromPath(relativePath: string) {
  const folder = path.posix.dirname(relativePath)
  return folder === '.' ? '' : folder
}

async function directorySize(dirPath: string): Promise<number> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) return directorySize(entryPath)
      const stat = await fs.stat(entryPath)
      return stat.size
    }),
  )

  return sizes.reduce((total, size) => total + size, 0)
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readMarkdownDocument(
  workspaceId: string | undefined,
  relativePath: string,
  vaultId = 'default',
): Promise<MarkdownDocument> {
  const normalized = normalizeWikiPath(relativePath, { note: true })
  const filePath = resolveVaultPath(workspaceId, normalized, vaultId)
  const [content, stat] = await Promise.all([
    fs.readFile(filePath, 'utf-8'),
    fs.stat(filePath),
  ])

  return {
    path: normalized,
    title: titleFromMarkdown(normalized, content),
    content,
    updatedAt: stat.mtime.toISOString(),
    size: stat.size,
    wordCount: wordCount(content),
    headings: extractHeadings(content),
    properties: parseProperties(content),
  }
}

async function writeMarkdownDocument(
  workspaceId: string | undefined,
  relativePath: string,
  content: string,
  vaultId = 'default',
) {
  const normalized = normalizeWikiPath(relativePath, { note: true })
  const filePath = resolveVaultPath(workspaceId, normalized, vaultId)
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, content, 'utf-8')
  return readMarkdownDocument(workspaceId, normalized, vaultId)
}

async function uniqueNotePath(
  workspaceId: string | undefined,
  title: string,
  folder?: string,
  vaultId = 'default',
) {
  const baseFolder = folder?.trim() ? normalizeWikiPath(folder) : ''
  const baseName = slugify(title)
  let candidate = baseFolder ? `${baseFolder}/${baseName}.md` : `${baseName}.md`
  let index = 2

  while (await exists(resolveVaultPath(workspaceId, candidate, vaultId))) {
    candidate = baseFolder
      ? `${baseFolder}/${baseName}-${index}.md`
      : `${baseName}-${index}.md`
    index += 1
  }

  return candidate
}

async function uniqueAssetPath(
  workspaceId: string | undefined,
  fileName: string,
  vaultId = 'default',
) {
  const date = new Date().toISOString().slice(0, 10)
  const parsed = path.parse(sanitizeAssetName(fileName))
  const baseName = parsed.name || 'media'
  const extension = parsed.ext
  let candidate = `.assets/${date}/${baseName}${extension}`
  let index = 2

  while (await exists(resolveVaultPath(workspaceId, candidate, vaultId))) {
    candidate = `.assets/${date}/${baseName}-${index}${extension}`
    index += 1
  }

  return candidate
}

async function uniqueTrashPath(
  workspaceId: string | undefined,
  vaultId: string,
  originalPath: string,
  kind: 'folder' | 'note',
) {
  const parsed = path.posix.parse(originalPath)
  const baseName = sanitizeAssetName(
    parsed.base || entryName(originalPath) || kind,
  )
  let candidate = `${uniqueId()}-${baseName}`
  let index = 2

  while (await exists(safePath(getTrashDir(workspaceId, vaultId), candidate))) {
    candidate = `${uniqueId()}-${index}-${baseName}`
    index += 1
  }

  return `.trash/${candidate}`
}

function entryName(relativePath: string) {
  return relativePath.split('/').filter(Boolean).pop() ?? relativePath
}

function validTrashItems(value: unknown): WikiTrashItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is WikiTrashItem =>
      item &&
      typeof item === 'object' &&
      typeof (item as WikiTrashItem).id === 'string' &&
      ((item as WikiTrashItem).kind === 'note' ||
        (item as WikiTrashItem).kind === 'folder') &&
      typeof (item as WikiTrashItem).originalPath === 'string' &&
      typeof (item as WikiTrashItem).trashPath === 'string' &&
      typeof (item as WikiTrashItem).title === 'string' &&
      typeof (item as WikiTrashItem).deletedAt === 'string',
  )
}

async function readTrashIndex(
  workspaceId: string | undefined,
  vaultId: string,
) {
  try {
    return validTrashItems(
      JSON.parse(
        await fs.readFile(getTrashIndexPath(workspaceId, vaultId), 'utf-8'),
      ),
    )
  } catch {
    return []
  }
}

async function writeTrashIndex(
  workspaceId: string | undefined,
  vaultId: string,
  items: WikiTrashItem[],
) {
  await ensureDir(getTrashDir(workspaceId, vaultId))
  await fs.writeFile(
    getTrashIndexPath(workspaceId, vaultId),
    JSON.stringify(items, null, 2),
    'utf-8',
  )
}

async function ensureVaultDir(workspaceId?: string, vaultId = 'default') {
  await ensureDir(getVaultDir(workspaceId, vaultId))
}

async function isVaultEmpty(workspaceId: string | undefined, vaultId: string) {
  await ensureVaultDir(workspaceId, vaultId)
  const entries = await fs.readdir(getVaultDir(workspaceId, vaultId), {
    withFileTypes: true,
  })
  return entries.every((entry) => entry.name.startsWith('.'))
}

const bootstrapTemplates: Record<
  z.infer<typeof bootstrapTemplateIdSchema>,
  { folders: string[]; files: Record<string, string> }
> = {
  knowledge: {
    folders: ['notes', 'sources', 'topics', 'maps'],
    files: {
      'index.md': [
        '# Knowledge Base',
        '',
        '- [[maps/Map of Content]]',
        '- [[notes/README]]',
        '- [[sources/README]]',
        '- [[topics/README]]',
        '',
      ].join('\n'),
      'maps/Map of Content.md': [
        '# Map of Content',
        '',
        '- [[index]]',
        '- [[notes/README]]',
        '- [[sources/README]]',
        '- [[topics/README]]',
        '',
      ].join('\n'),
      'notes/README.md': '# Notes\n\nUse this folder for durable notes.\n',
      'sources/README.md':
        '# Sources\n\nKeep source material and references here.\n',
      'topics/README.md':
        '# Topics\n\nGroup long-running concepts and subject areas here.\n',
    },
  },
  project: {
    folders: ['briefs', 'decisions', 'research', 'outputs'],
    files: {
      'index.md': [
        '# Project Wiki',
        '',
        '- [[briefs/README]]',
        '- [[decisions/README]]',
        '- [[research/README]]',
        '- [[outputs/README]]',
        '',
      ].join('\n'),
      'briefs/README.md':
        '# Briefs\n\nCapture project goals, constraints, and current scope here.\n',
      'decisions/README.md':
        '# Decisions\n\nRecord important decisions and the reasoning behind them.\n',
      'research/README.md':
        '# Research\n\nCollect notes, links, and findings here.\n',
      'outputs/README.md':
        '# Outputs\n\nStore deliverables, drafts, and generated artifacts here.\n',
    },
  },
  journal: {
    folders: ['daily', 'people', 'places', 'references'],
    files: {
      'index.md': [
        '# Journal',
        '',
        '- [[daily/README]]',
        '- [[people/README]]',
        '- [[places/README]]',
        '- [[references/README]]',
        '',
      ].join('\n'),
      'daily/README.md': '# Daily\n\nCreate dated notes here.\n',
      'people/README.md':
        '# People\n\nKeep notes about people, conversations, and follow-ups here.\n',
      'places/README.md':
        '# Places\n\nTrack place-based notes and context here.\n',
      'references/README.md':
        '# References\n\nKeep reusable reference material here.\n',
    },
  },
  health: {
    folders: ['timeline', 'symptoms', 'appointments', 'records', 'questions'],
    files: {
      'index.md': [
        '# Health',
        '',
        '- [[timeline/README]]',
        '- [[symptoms/README]]',
        '- [[appointments/README]]',
        '- [[records/README]]',
        '- [[questions/README]]',
        '',
      ].join('\n'),
      'timeline/README.md':
        '# Timeline\n\nTrack dated health events and changes here.\n',
      'symptoms/README.md':
        '# Symptoms\n\nKeep symptom notes, patterns, and context here.\n',
      'appointments/README.md':
        '# Appointments\n\nStore visit notes and follow-ups here.\n',
      'records/README.md':
        '# Records\n\nKeep lab notes, reports, medications, and files to review here.\n',
      'questions/README.md':
        '# Questions\n\nCollect questions for clinicians or future research here.\n',
    },
  },
}

async function bootstrapVault(
  workspaceId: string | undefined,
  vaultId: string,
  template: keyof typeof bootstrapTemplates,
) {
  if (!(await isVaultEmpty(workspaceId, vaultId))) {
    throw new Error('Vault is not empty')
  }

  const selected = bootstrapTemplates[template]
  await Promise.all(
    selected.folders.map((folder) =>
      ensureDir(resolveVaultPath(workspaceId, folder, vaultId)),
    ),
  )
  await Promise.all(
    Object.entries(selected.files).map(async ([relativePath, content]) => {
      const filePath = resolveVaultPath(workspaceId, relativePath, vaultId)
      await ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, content, 'utf-8')
    }),
  )
}

async function listMarkdownPaths(
  workspaceId: string | undefined,
  relativeDir = '',
  vaultId = 'default',
): Promise<string[]> {
  const dirPath = resolveVaultPath(workspaceId, relativeDir, vaultId)
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const paths: string[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const relativePath = relativeDir
      ? `${relativeDir}/${entry.name}`
      : entry.name

    if (entry.isDirectory()) {
      paths.push(
        ...(await listMarkdownPaths(workspaceId, relativePath, vaultId)),
      )
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      paths.push(relativePath)
    }
  }

  return paths.sort((a, b) => a.localeCompare(b))
}

async function buildTree(
  workspaceId: string | undefined,
  relativeDir = '',
  vaultId = 'default',
): Promise<WikiEntry> {
  const dirPath = resolveVaultPath(workspaceId, relativeDir, vaultId)
  const dirName = relativeDir ? path.posix.basename(relativeDir) : 'Wiki'
  const children: WikiEntry[] = []
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const relativePath = relativeDir
      ? `${relativeDir}/${entry.name}`
      : entry.name
    const fullPath = resolveVaultPath(workspaceId, relativePath, vaultId)

    if (entry.isDirectory()) {
      children.push(await buildTree(workspaceId, relativePath, vaultId))
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.md')) continue

    const [content, stat] = await Promise.all([
      fs.readFile(fullPath, 'utf-8'),
      fs.stat(fullPath),
    ])
    children.push({
      kind: 'note',
      name: entry.name,
      path: relativePath,
      title: titleFromMarkdown(relativePath, content),
      updatedAt: stat.mtime.toISOString(),
      size: stat.size,
      wordCount: wordCount(content),
    })
  }

  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return a.title.localeCompare(b.title)
  })

  return {
    kind: 'folder',
    name: dirName,
    path: relativeDir,
    title: dirName,
    children,
  }
}

function countTree(entry: WikiEntry): WikiTreeResponse['totals'] {
  if (entry.kind === 'note') {
    return {
      notes: 1,
      folders: 0,
      words: entry.wordCount ?? 0,
    }
  }

  return (entry.children ?? []).reduce(
    (total, child) => {
      const next = countTree(child)
      return {
        notes: total.notes + next.notes,
        folders:
          total.folders + next.folders + (child.kind === 'folder' ? 1 : 0),
        words: total.words + next.words,
      }
    },
    { notes: 0, folders: 0, words: 0 },
  )
}

async function getTreeResponse(
  workspaceId: string | undefined,
  vaultId: string,
): Promise<WikiTreeResponse> {
  await ensureVaultDir(workspaceId, vaultId)
  const root = await buildTree(workspaceId, '', vaultId)
  return {
    root,
    totals: countTree(root),
  }
}

function wikiTargetsFromContent(
  content: string,
  sourcePath: string,
  notePaths: Set<string>,
) {
  const targets = new Set<string>()
  const wikiLinkPattern = /!?\[\[([^\]]+)\]\]/g
  const markdownLinkPattern = /\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/g

  for (const match of content.matchAll(wikiLinkPattern)) {
    const raw = match[1]?.trim()
    if (!raw) continue
    const targetEndCandidates = [raw.indexOf('#'), raw.indexOf('|')].filter(
      (index) => index >= 0,
    )
    const targetEnd =
      targetEndCandidates.length > 0
        ? Math.min(...targetEndCandidates)
        : raw.length
    const normalized = normalizeMaybeNoteLinkTarget(
      raw.slice(0, targetEnd),
      sourcePath,
      notePaths,
    )
    if (normalized) targets.add(normalized)
  }

  for (const match of content.matchAll(markdownLinkPattern)) {
    const raw = match[1]?.trim()
    const normalized = raw
      ? normalizeMaybeNoteLinkTarget(raw, sourcePath, notePaths)
      : null
    if (normalized) targets.add(normalized)
  }

  return [...targets]
}

async function getAllDocuments(
  workspaceId: string | undefined,
  vaultId: string,
) {
  await ensureVaultDir(workspaceId, vaultId)
  const paths = await listMarkdownPaths(workspaceId, '', vaultId)
  return Promise.all(
    paths.map((relativePath) =>
      readMarkdownDocument(workspaceId, relativePath, vaultId),
    ),
  )
}

async function rewriteVaultLinksAfterMove(
  workspaceId: string | undefined,
  vaultId: string,
  rewrite: LinkRewrite,
) {
  const documents = await getAllDocuments(workspaceId, vaultId)
  const notePaths = documents.map((document) => document.path)

  await Promise.all(
    documents.map(async (document) => {
      const nextContent = rewriteInternalLinksInMarkdown(
        document.content,
        document.path,
        notePaths,
        rewrite,
      )
      if (nextContent === document.content) return

      await fs.writeFile(
        resolveVaultPath(workspaceId, document.path, vaultId),
        nextContent,
        'utf-8',
      )
    }),
  )
}

async function moveEntryToTrash(
  workspaceId: string | undefined,
  vaultId: string,
  relativePath: string,
  kind: 'folder' | 'note',
) {
  const originalPath = normalizeWikiPath(relativePath, {
    note: kind === 'note',
  })
  if (originalPath.startsWith('.trash/'))
    throw new Error('Cannot trash trash contents')

  const sourcePath = resolveVaultPath(workspaceId, originalPath, vaultId)
  const stat = await fs.stat(sourcePath)
  const trashPath = await uniqueTrashPath(
    workspaceId,
    vaultId,
    originalPath,
    kind,
  )
  const destinationPath = resolveVaultPath(workspaceId, trashPath, vaultId)
  await ensureDir(path.dirname(destinationPath))
  await fs.rename(sourcePath, destinationPath)

  const item: WikiTrashItem = {
    id: uniqueId(),
    kind,
    originalPath,
    trashPath,
    title:
      kind === 'note'
        ? titleFromNotePath(originalPath)
        : entryName(originalPath),
    deletedAt: new Date().toISOString(),
    size: stat.isDirectory() ? await directorySize(destinationPath) : stat.size,
  }
  const items = await readTrashIndex(workspaceId, vaultId)
  await writeTrashIndex(workspaceId, vaultId, [item, ...items])
  return item
}

async function restoreTrashItem(
  workspaceId: string | undefined,
  vaultId: string,
  id: string,
) {
  const items = await readTrashIndex(workspaceId, vaultId)
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error('Trash item not found')

  const sourcePath = resolveVaultPath(workspaceId, item.trashPath, vaultId)
  const destinationPath = resolveVaultPath(
    workspaceId,
    item.originalPath,
    vaultId,
  )
  if (await exists(destinationPath)) {
    throw new Error('Original path already exists')
  }

  await ensureDir(path.dirname(destinationPath))
  await fs.rename(sourcePath, destinationPath)
  await writeTrashIndex(
    workspaceId,
    vaultId,
    items.filter((candidate) => candidate.id !== id),
  )

  return item
}

async function permanentlyDeleteTrashItem(
  workspaceId: string | undefined,
  vaultId: string,
  id: string,
) {
  const items = await readTrashIndex(workspaceId, vaultId)
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error('Trash item not found')

  await fs.rm(resolveVaultPath(workspaceId, item.trashPath, vaultId), {
    recursive: true,
    force: true,
  })
  await writeTrashIndex(
    workspaceId,
    vaultId,
    items.filter((candidate) => candidate.id !== id),
  )

  return item
}

async function listTemplates(workspaceId: string | undefined, vaultId: string) {
  const templatesDir = resolveVaultPath(workspaceId, 'templates', vaultId)
  if (!(await exists(templatesDir))) return []

  const paths = await listMarkdownPaths(workspaceId, 'templates', vaultId)
  return Promise.all(
    paths.map((relativePath) =>
      readMarkdownDocument(workspaceId, relativePath, vaultId),
    ),
  )
}

function applyTemplateVariables(content: string) {
  const today = new Date().toISOString().slice(0, 10)
  return content.replaceAll('{{date}}', today).replaceAll('{{title}}', today)
}

async function openOrCreateDailyNote(
  workspaceId: string | undefined,
  vaultId: string,
) {
  const today = new Date().toISOString().slice(0, 10)
  const notePath = `daily/${today}.md`
  const filePath = resolveVaultPath(workspaceId, notePath, vaultId)

  if (await exists(filePath))
    return readMarkdownDocument(workspaceId, notePath, vaultId)

  return writeMarkdownDocument(
    workspaceId,
    notePath,
    [`# ${today}`, '', ''].join('\n'),
    vaultId,
  )
}

async function getGraph(
  workspaceId: string | undefined,
  relativePath: string,
  vaultId: string,
): Promise<WikiGraphResponse> {
  const normalized = normalizeWikiPath(relativePath, { note: true })
  const documents = await getAllDocuments(workspaceId, vaultId)
  const active = documents.find((document) => document.path === normalized)
  const knownPaths = new Set(documents.map((document) => document.path))
  const outbound = active
    ? wikiTargetsFromContent(active.content, active.path, knownPaths)
    : []
  const activeTitle = active?.title ?? titleFromNotePath(normalized)
  const activeName = titleFromNotePath(normalized)
  const mentionNeedles = [...new Set([activeTitle, activeName].filter(Boolean))]
  const inboundDocuments = documents.filter(
    (document) =>
      document.path !== normalized &&
      wikiTargetsFromContent(
        document.content,
        document.path,
        knownPaths,
      ).includes(normalized),
  )

  return {
    outbound,
    inbound: inboundDocuments.map((document) => ({
      path: document.path,
      snippets: makeSnippets(document.content, [
        normalized,
        normalized.replace(/\.md$/, ''),
        activeTitle,
      ]),
      title: document.title,
    })),
    unlinked: active
      ? documents
          .filter(
            (document) =>
              document.path !== normalized &&
              !inboundDocuments.some(
                (inbound) => inbound.path === document.path,
              ) &&
              mentionNeedles.some((needle) =>
                document.content.toLowerCase().includes(needle.toLowerCase()),
              ),
          )
          .map((document) => ({
            path: document.path,
            snippets: makeSnippets(document.content, mentionNeedles),
            title: document.title,
          }))
      : [],
    broken: outbound.filter((target) => !knownPaths.has(target)),
  }
}

function parseSearchQuery(query: string) {
  const filters: Record<string, string[]> = {}
  const terms: string[] = []
  const pattern = /"([^"]+)"|(\S+)/g

  for (const match of query.matchAll(pattern)) {
    const token = (match[1] ?? match[2] ?? '').trim()
    if (!token) continue
    const filter = /^([a-zA-Z]+):(.+)$/.exec(token)
    if (filter) {
      const key = filter[1]?.toLowerCase() ?? ''
      const value = filter[2]?.toLowerCase() ?? ''
      filters[key] = [...(filters[key] ?? []), value]
    } else {
      terms.push(token.toLowerCase())
    }
  }

  return { filters, terms }
}

async function searchWiki(
  workspaceId: string | undefined,
  query: string,
  vaultId: string,
): Promise<WikiSearchResult[]> {
  const parsed = parseSearchQuery(query)
  if (parsed.terms.length === 0 && Object.keys(parsed.filters).length === 0)
    return []

  const documents = await getAllDocuments(workspaceId, vaultId)
  return documents
    .flatMap((document) => {
      const title = document.title.toLowerCase()
      const documentPath = document.path.toLowerCase()
      const content = document.content.toLowerCase()
      const folder = folderNameFromPath(document.path).toLowerCase()
      const tags = tagsFromContent(document.content)
      const propertyText = document.properties
        .map((property) => `${property.key}:${property.value}`)
        .join('\n')
        .toLowerCase()

      if (parsed.filters.path?.some((value) => !documentPath.includes(value)))
        return []
      if (
        parsed.filters.file?.some(
          (value) => !title.includes(value) && !documentPath.endsWith(value),
        )
      )
        return []
      if (parsed.filters.folder?.some((value) => !folder.includes(value)))
        return []
      if (
        parsed.filters.tag?.some((value) => !tags.has(value.replace(/^#/, '')))
      )
        return []
      if (
        parsed.filters.property?.some((value) => !propertyText.includes(value))
      )
        return []

      const haystack = `${title}\n${documentPath}\n${propertyText}\n${content}`
      if (parsed.terms.some((term) => !haystack.includes(term))) return []

      const primaryTerm =
        parsed.terms[0] ??
        parsed.filters.tag?.[0] ??
        parsed.filters.path?.[0] ??
        ''
      const matchField: WikiSearchResult['matchField'] = parsed.filters.tag
        ? 'tag'
        : parsed.filters.property
          ? 'property'
          : title.includes(primaryTerm)
            ? 'title'
            : documentPath.includes(primaryTerm)
              ? 'path'
              : 'content'

      return [
        {
          path: document.path,
          title: document.title,
          folder: folderNameFromPath(document.path),
          matchField,
          snippet:
            matchField === 'path'
              ? document.path
              : matchField === 'property'
                ? propertyText || document.path
                : makeSnippet(document.content, primaryTerm || document.title),
          updatedAt: document.updatedAt,
        },
      ]
    })
    .slice(0, 40)
}

async function getHealth(
  workspaceId: string | undefined,
  vaultId: string,
): Promise<WikiHealthResponse> {
  const documents = await getAllDocuments(workspaceId, vaultId)
  const knownPaths = new Set(documents.map((document) => document.path))
  const issues: WikiHealthIssue[] = []

  if (documents.length > 0 && !knownPaths.has('index.md')) {
    issues.push({
      id: 'missing-index',
      severity: 'warning',
      title: 'Missing root index',
      detail: 'Create index.md so the wiki has a navigable entry point.',
    })
  }

  for (const document of documents) {
    const titleCount = (document.content.match(/^#\s+/gm) ?? []).length
    if (titleCount === 0) {
      issues.push({
        id: `missing-title:${document.path}`,
        severity: 'info',
        title: 'Missing title',
        detail: 'Add a top-level heading so this note is easier to find.',
        path: document.path,
      })
    }

    for (const target of wikiTargetsFromContent(
      document.content,
      document.path,
      knownPaths,
    )) {
      if (!knownPaths.has(target)) {
        issues.push({
          id: `broken-link:${document.path}:${target}`,
          severity: 'warning',
          title: 'Broken wiki link',
          detail: `${document.path} links to ${target}, which does not exist.`,
          path: document.path,
        })
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    issues,
  }
}

type JsonStatus = 400 | 404 | 409 | 500

function jsonError(c: Context, message: string, status: JsonStatus = 400) {
  return c.json({ error: message }, status)
}

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'wiki',
    status: 'ok',
  })
})

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null
  const generatedAt = new Date().toISOString()

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)

    // RESUME: the note the user last had open.
    const tabs = await readTabsState(workspaceId, vaultId)
    if (tabs.activePath) {
      const activeTab = tabs.tabs.find((tab) => tab.path === tabs.activePath)
      const title = activeTab?.title ?? titleFromNotePath(tabs.activePath)
      const folder = folderNameFromPath(tabs.activePath)
      resume = {
        title,
        subtitle: folder || undefined,
        icon: '📝',
        deepLink: tabs.activePath,
        lastTouchedAt: tabs.updatedAt ?? generatedAt,
      }
    }

    // THRESHOLD: surface only broken-link warnings (skip info-severity health items).
    const health = await getHealth(workspaceId, vaultId)
    const brokenLinks = health.issues.filter(
      (issue) =>
        issue.severity === 'warning' && issue.id.startsWith('broken-link:'),
    )
    if (brokenLinks.length > 0) {
      const linkList = brokenLinks
        .slice(0, 12)
        .map(
          (issue) => `- ${(issue as { detail?: string }).detail ?? issue.id}`,
        )
        .join('\n')
      const prompt = `My Wiki vault has ${brokenLinks.length} broken link${
        brokenLinks.length === 1 ? '' : 's'
      } — links that point to notes which no longer exist:\n${linkList}\n\nFor each one, either repoint it to the correct existing note or remove the link, then tell me what you changed. When you're done, refresh the home view by calling the Moldable app API with targetAppId "today" and method "today.refresh".`
      items.push({
        id: 'wiki:broken-links',
        kind: 'threshold',
        surface: 'nudge',
        title:
          brokenLinks.length === 1
            ? '1 broken link in your vault'
            : `${brokenLinks.length} broken links in your vault`,
        subtitle: 'Links point to notes that no longer exist',
        icon: '🔗',
        priority: 70,
        actions: [
          { type: 'message', label: 'Fix links', prompt },
          { type: 'open-app', label: 'Open Wiki' },
        ],
      })
    }
  } catch {
    return c.json({ items: [], resume: null, generatedAt })
  }

  return c.json({ items, resume, generatedAt })
})

app.get('/api/moldable/commands', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  let vaultCommands: Array<{
    id: string
    label: string
    description: string
    icon: string
    group: string
    action: { type: 'message'; command: string; payload: { id: string } }
  }> = []
  let noteCommands: Array<{
    id: string
    label: string
    description: string
    icon: string
    group: string
    action: { type: 'message'; command: string; payload: { path: string } }
  }> = []

  try {
    const vaultsResponse = await readVaults(workspaceId)
    vaultCommands = vaultsResponse.vaults.map((vault) => ({
      id: `wiki-switch-vault:${vault.id}`,
      label: vault.name,
      description:
        vault.id === vaultsResponse.activeVaultId
          ? 'Current vault'
          : 'Switch vault',
      icon: 'database',
      group: 'Vaults',
      action: {
        type: 'message',
        command: 'wiki-switch-vault',
        payload: { id: vault.id },
      },
    }))

    const documents = await getAllDocuments(
      workspaceId,
      vaultsResponse.activeVaultId,
    )
    noteCommands = documents
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 12)
      .map((document) => ({
        id: `wiki-open-note:${document.path}`,
        label: document.title,
        description: document.path,
        icon: 'file-text',
        group: 'Recent notes',
        action: {
          type: 'message',
          command: 'wiki-open-file',
          payload: { path: document.path },
        },
      }))
  } catch (error) {
    console.error('Failed to load wiki vault commands:', error)
  }

  return c.json({
    commands: [
      {
        id: 'wiki-new-note',
        label: 'New Note',
        shortcut: 'n',
        icon: 'plus',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-new-note' },
      },
      {
        id: 'wiki-new-folder',
        label: 'New Folder',
        icon: 'folder',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-new-folder' },
      },
      {
        id: 'wiki-daily-note',
        label: 'Daily Note',
        icon: 'calendar',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-daily-note' },
      },
      ...noteCommands,
      ...vaultCommands,
    ],
  })
})

app.get('/api/wiki/vaults', async (c) => {
  try {
    return c.json(await readVaults(getWorkspaceFromRequest(c.req.raw)))
  } catch (error) {
    console.error('Failed to load wiki vaults:', error)
    return jsonError(c, 'Failed to load vaults', 500)
  }
})

app.post('/api/wiki/vaults', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = createVaultSchema.parse(await c.req.json())
    return c.json(await createVault(workspaceId, body.name, body.template), 201)
  } catch (error) {
    console.error('Failed to create wiki vault:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create vault',
      400,
    )
  }
})

app.post('/api/wiki/vaults/active', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = switchVaultSchema.parse(await c.req.json())
    const response = await readVaults(workspaceId)

    if (!response.vaults.some((vault) => vault.id === body.id)) {
      return jsonError(c, 'Vault not found', 404)
    }

    const next = { ...response, activeVaultId: body.id }
    await writeVaults(workspaceId, next)
    await ensureVaultDir(workspaceId, body.id)
    return c.json(next)
  } catch (error) {
    console.error('Failed to switch wiki vault:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to switch vault',
      400,
    )
  }
})

app.patch('/api/wiki/vaults/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const id = switchVaultSchema.parse({ id: c.req.param('id') }).id
    const body = updateVaultSchema.parse(await c.req.json())
    return c.json(await updateVault(workspaceId, id, body.name))
  } catch (error) {
    console.error('Failed to update wiki vault:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update vault',
      400,
    )
  }
})

app.delete('/api/wiki/vaults/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const id = switchVaultSchema.parse({ id: c.req.param('id') }).id
    return c.json(await deleteVault(workspaceId, id))
  } catch (error) {
    console.error('Failed to delete wiki vault:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete vault',
      400,
    )
  }
})

app.post('/api/wiki/bootstrap', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = bootstrapTemplateSchema.parse(await c.req.json())
    await bootstrapVault(workspaceId, vaultId, body.template)
    return c.json(await getTreeResponse(workspaceId, vaultId), 201)
  } catch (error) {
    console.error('Failed to bootstrap wiki vault:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to bootstrap vault',
      400,
    )
  }
})

app.get('/api/wiki/tree', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await getTreeResponse(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to load wiki tree:', error)
    return jsonError(c, 'Failed to load wiki tree', 500)
  }
})

app.get('/api/wiki/summary', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const [tree, health, documents] = await Promise.all([
      getTreeResponse(workspaceId, vaultId),
      getHealth(workspaceId, vaultId),
      getAllDocuments(workspaceId, vaultId),
    ])

    const recent = documents
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map<WikiEntry>((document) => ({
        kind: 'note',
        name: path.basename(document.path),
        path: document.path,
        title: document.title,
        updatedAt: document.updatedAt,
        size: document.size,
        wordCount: document.wordCount,
      }))

    return c.json({ recent, totals: tree.totals, health })
  } catch (error) {
    console.error('Failed to load wiki summary:', error)
    return jsonError(c, 'Failed to load wiki summary', 500)
  }
})

app.get('/api/wiki/file', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const query = notePathSchema.parse({ path: c.req.query('path') })
    return c.json(await readMarkdownDocument(workspaceId, query.path, vaultId))
  } catch (error) {
    console.error('Failed to read wiki file:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read note',
      404,
    )
  }
})

app.post('/api/wiki/file', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = saveNoteSchema.parse(await c.req.json())
    return c.json(
      await writeMarkdownDocument(
        workspaceId,
        body.path,
        body.content,
        vaultId,
      ),
    )
  } catch (error) {
    console.error('Failed to save wiki file:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to save note',
      400,
    )
  }
})

app.post('/api/wiki/media', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const form = await c.req.raw.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return jsonError(c, 'Media file is required', 400)
    }

    const assetPath = await uniqueAssetPath(workspaceId, file.name, vaultId)
    const filePath = resolveVaultPath(workspaceId, assetPath, vaultId)
    await ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()))

    return c.json(
      {
        altText: file.name,
        kind: mediaKindForFile(file),
        name: file.name,
        path: assetPath,
        src: assetPath,
      },
      201,
    )
  } catch (error) {
    console.error('Failed to upload wiki media:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to upload media',
      400,
    )
  }
})

app.post('/api/wiki/media-paths', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = importMediaPathsSchema.parse(await c.req.json())
    const imported = []

    for (const sourcePath of body.paths.filter(isSupportedMediaPath)) {
      if (!path.isAbsolute(sourcePath)) continue
      const bytes = await fs.readFile(sourcePath)
      const assetPath = await uniqueAssetPath(
        workspaceId,
        path.basename(sourcePath),
        vaultId,
      )
      const filePath = resolveVaultPath(workspaceId, assetPath, vaultId)
      const mimeType = contentTypeForPath(sourcePath)
      await ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, bytes)
      imported.push({
        altText: path.basename(sourcePath),
        kind: mediaKindForMimeType(mimeType),
        name: path.basename(sourcePath),
        path: assetPath,
        src: assetPath,
      })
    }

    if (imported.length === 0) {
      return jsonError(c, 'No supported media files were provided', 400)
    }

    return c.json(imported, 201)
  } catch (error) {
    console.error('Failed to import wiki media paths:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to import media',
      400,
    )
  }
})

app.get('/api/wiki/media', async (c) => {
  try {
    const query = mediaPathSchema.parse({
      path: c.req.query('path'),
      vault: c.req.query('vault'),
      workspace: c.req.query('workspace'),
    })
    const workspaceId = query.workspace ?? getWorkspaceFromRequest(c.req.raw)
    const vaultId = query.vault ?? (await getActiveVaultId(workspaceId))
    const mediaPath = normalizeWikiPath(query.path)
    const filePath = resolveVaultPath(workspaceId, mediaPath, vaultId)
    const stat = await fs.stat(filePath)
    const contentType = contentTypeForPath(filePath)
    const range = c.req.header('range')

    if (range) {
      const match = range.match(/^bytes=(\d*)-(\d*)$/)
      if (!match) {
        return new Response(null, {
          headers: {
            'Content-Range': `bytes */${stat.size}`,
          },
          status: 416,
        })
      }

      const start = match[1] ? Number.parseInt(match[1], 10) : 0
      const end = match[2]
        ? Number.parseInt(match[2], 10)
        : Math.max(0, stat.size - 1)

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        start >= stat.size
      ) {
        return new Response(null, {
          headers: {
            'Content-Range': `bytes */${stat.size}`,
          },
          status: 416,
        })
      }

      const chunk = await fs.readFile(filePath)
      const boundedEnd = Math.min(end, stat.size - 1)
      const bytes = chunk.subarray(start, boundedEnd + 1)

      return new Response(bytes, {
        headers: {
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=3600',
          'Content-Length': String(bytes.byteLength),
          'Content-Range': `bytes ${start}-${boundedEnd}/${stat.size}`,
          'Content-Type': contentType,
        },
        status: 206,
      })
    }

    const bytes = await fs.readFile(filePath)

    return new Response(bytes, {
      headers: {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(stat.size),
        'Content-Type': contentType,
      },
    })
  } catch (error) {
    console.error('Failed to read wiki media:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read media',
      404,
    )
  }
})

app.post('/api/wiki/notes', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = createNoteSchema.parse(await c.req.json())
    const notePath = body.path
      ? normalizeWikiPath(body.path, { note: true })
      : await uniqueNotePath(
          workspaceId,
          body.title ?? 'Untitled',
          body.folder,
          vaultId,
        )
    if (await exists(resolveVaultPath(workspaceId, notePath, vaultId))) {
      return c.json(await readMarkdownDocument(workspaceId, notePath, vaultId))
    }
    const title = body.title?.trim() || titleFromNotePath(notePath)
    return c.json(
      await writeMarkdownDocument(
        workspaceId,
        notePath,
        body.content ?? [`# ${title}`, '', ''].join('\n'),
        vaultId,
      ),
      201,
    )
  } catch (error) {
    console.error('Failed to create wiki note:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create note',
      400,
    )
  }
})

app.post('/api/wiki/daily', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await openOrCreateDailyNote(workspaceId, vaultId), 201)
  } catch (error) {
    console.error('Failed to create daily note:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create daily note',
      400,
    )
  }
})

app.get('/api/wiki/templates', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await listTemplates(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to list wiki templates:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to list templates',
      400,
    )
  }
})

app.get('/api/wiki/property-types', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await readPropertyTypes(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to read wiki property types:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read property types',
      400,
    )
  }
})

app.get('/api/wiki/properties', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await listVaultProperties(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to list wiki properties:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to list properties',
      400,
    )
  }
})

app.post('/api/wiki/property-types', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = updatePropertyTypeSchema.parse(await c.req.json())
    const response = await readPropertyTypes(workspaceId, vaultId)
    const nextTypes = { ...response.types }
    if (body.oldKey && body.oldKey !== body.key) delete nextTypes[body.oldKey]
    nextTypes[body.key] = body.type
    return c.json(await writePropertyTypes(workspaceId, vaultId, nextTypes))
  } catch (error) {
    console.error('Failed to update wiki property type:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update property type',
      400,
    )
  }
})

app.post('/api/wiki/properties/rename', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = renamePropertySchema.parse(await c.req.json())
    return c.json(
      await renamePropertyAcrossVault(
        workspaceId,
        vaultId,
        body.oldKey,
        body.newKey,
      ),
    )
  } catch (error) {
    console.error('Failed to rename wiki property:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to rename property',
      400,
    )
  }
})

app.get('/api/wiki/settings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await readVaultSettings(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to read wiki settings:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read settings',
      400,
    )
  }
})

app.post('/api/wiki/settings', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = updateVaultSettingsSchema.parse(await c.req.json())
    const current = await readVaultSettings(workspaceId, vaultId)
    return c.json(
      await writeVaultSettings(workspaceId, vaultId, { ...current, ...body }),
    )
  } catch (error) {
    console.error('Failed to update wiki settings:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to update settings',
      400,
    )
  }
})

app.get('/api/wiki/tabs', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await readTabsState(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to read wiki tabs:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read tabs',
      400,
    )
  }
})

app.post('/api/wiki/tabs', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = tabStateSchema.parse(await c.req.json())
    return c.json(await writeTabsState(workspaceId, vaultId, body))
  } catch (error) {
    console.error('Failed to sync wiki tabs:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to sync tabs',
      400,
    )
  }
})

app.post('/api/wiki/templates/apply', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = applyTemplateSchema.parse(await c.req.json())
    const template = await readMarkdownDocument(
      workspaceId,
      body.templatePath,
      vaultId,
    )
    const targetPath =
      body.targetPath?.trim() ||
      (await uniqueNotePath(
        workspaceId,
        titleFromNotePath(template.path),
        undefined,
        vaultId,
      ))

    return c.json(
      await writeMarkdownDocument(
        workspaceId,
        targetPath,
        applyTemplateVariables(template.content),
        vaultId,
      ),
      201,
    )
  } catch (error) {
    console.error('Failed to apply wiki template:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to apply template',
      400,
    )
  }
})

app.post('/api/wiki/folders', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = createFolderSchema.parse(await c.req.json())
    await ensureDir(getFolderPath(workspaceId, body.path, vaultId))
    return c.json({ ok: true, path: normalizeWikiPath(body.path) }, 201)
  } catch (error) {
    console.error('Failed to create wiki folder:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to create folder',
      400,
    )
  }
})

app.post('/api/wiki/move', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const body = moveSchema.parse(await c.req.json())
    const from = normalizeWikiPath(body.from, { note: body.kind === 'note' })
    const to = normalizeWikiPath(body.to, { note: body.kind === 'note' })

    if (body.kind === 'folder' && to.startsWith(`${from}/`)) {
      return jsonError(c, 'Cannot move a folder inside itself', 400)
    }

    const fromPath = resolveVaultPath(workspaceId, from, vaultId)
    const toPath = resolveVaultPath(workspaceId, to, vaultId)
    if (await exists(toPath))
      return jsonError(c, 'Destination already exists', 409)

    await ensureDir(path.dirname(toPath))
    await fs.rename(fromPath, toPath)

    const rewrite: LinkRewrite = { from, to, kind: body.kind }
    if (body.kind === 'note') {
      const content =
        typeof body.content === 'string'
          ? body.content
          : await fs.readFile(toPath, 'utf-8')
      await fs.writeFile(
        toPath,
        replaceMarkdownTitle(content, titleFromNotePath(to)),
        'utf-8',
      )
    } else if (typeof body.content === 'string' && body.contentPath) {
      const contentPath = normalizeWikiPath(body.contentPath, { note: true })
      const nextContentPath = remapLinkedPath(contentPath, rewrite)
      await fs.writeFile(
        resolveVaultPath(workspaceId, nextContentPath, vaultId),
        body.content,
        'utf-8',
      )
    }

    await rewriteVaultLinksAfterMove(workspaceId, vaultId, rewrite)

    return c.json({ ok: true, path: to })
  } catch (error) {
    console.error('Failed to move wiki entry:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to move entry',
      400,
    )
  }
})

app.delete('/api/wiki/file', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const query = notePathSchema.parse({ path: c.req.query('path') })
    const item = await moveEntryToTrash(
      workspaceId,
      vaultId,
      query.path,
      'note',
    )
    return c.json({ ok: true, item })
  } catch (error) {
    console.error('Failed to delete wiki file:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete note',
      400,
    )
  }
})

app.delete('/api/wiki/folder', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const query = notePathSchema.parse({ path: c.req.query('path') })
    const item = await moveEntryToTrash(
      workspaceId,
      vaultId,
      query.path,
      'folder',
    )
    return c.json({ ok: true, item })
  } catch (error) {
    console.error('Failed to delete wiki folder:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete folder',
      400,
    )
  }
})

app.get('/api/wiki/trash', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await readTrashIndex(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to read wiki trash:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to read trash',
      400,
    )
  }
})

app.post('/api/wiki/trash/:id/restore', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const params = trashItemSchema.parse({ id: c.req.param('id') })
    const item = await restoreTrashItem(workspaceId, vaultId, params.id)
    return c.json({ ok: true, item })
  } catch (error) {
    console.error('Failed to restore wiki trash item:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to restore item',
      400,
    )
  }
})

app.delete('/api/wiki/trash/:id', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const params = trashItemSchema.parse({ id: c.req.param('id') })
    const item = await permanentlyDeleteTrashItem(
      workspaceId,
      vaultId,
      params.id,
    )
    return c.json({ ok: true, item })
  } catch (error) {
    console.error('Failed to permanently delete wiki trash item:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to delete item',
      400,
    )
  }
})

app.get('/api/wiki/search', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(
      await searchWiki(workspaceId, c.req.query('q') ?? '', vaultId),
    )
  } catch (error) {
    console.error('Failed to search wiki:', error)
    return jsonError(c, 'Failed to search wiki', 500)
  }
})

app.get('/api/wiki/graph', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    const query = notePathSchema.parse({ path: c.req.query('path') })
    return c.json(await getGraph(workspaceId, query.path, vaultId))
  } catch (error) {
    console.error('Failed to load wiki graph:', error)
    return jsonError(
      c,
      error instanceof Error ? error.message : 'Failed to load graph',
      400,
    )
  }
})

app.get('/api/wiki/health', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const vaultId = await getActiveVaultId(workspaceId)
    return c.json(await getHealth(workspaceId, vaultId))
  } catch (error) {
    console.error('Failed to inspect wiki health:', error)
    return jsonError(c, 'Failed to inspect wiki health', 500)
  }
})

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)

  try {
    const vaultId = await getActiveVaultId(workspaceId)
    const body = rpcRequestSchema.parse(await c.req.json())
    const params =
      body.params && typeof body.params === 'object'
        ? (body.params as Record<string, unknown>)
        : {}

    const rpcOk = (result: unknown) => c.json({ ok: true, result })
    const methodDescriptions = [
      'wiki.context',
      'wiki.list',
      'wiki.listTabs',
      'wiki.read',
      'wiki.write',
      'wiki.search',
      'wiki.health',
      'wiki.graph',
      'wiki.vaults.list',
      'wiki.vaults.create',
      'wiki.vaults.switch',
      'wiki.vaults.update',
      'wiki.vaults.delete',
      'wiki.vaults.bootstrap',
      'wiki.settings.get',
      'wiki.settings.update',
      'wiki.tabs.list',
      'wiki.notes.create',
      'wiki.notes.read',
      'wiki.notes.write',
      'wiki.notes.delete',
      'wiki.folders.create',
      'wiki.folders.delete',
      'wiki.entries.move',
      'wiki.daily.open',
      'wiki.templates.list',
      'wiki.templates.apply',
      'wiki.properties.list',
      'wiki.properties.set',
      'wiki.properties.delete',
      'wiki.properties.rename',
      'wiki.properties.type.set',
      'wiki.properties.reorder',
      'wiki.trash.list',
      'wiki.trash.restore',
      'wiki.trash.purge',
      'wiki.media.importPaths',
    ]

    if (body.method === 'wiki.methods' || body.method === 'wiki.rpc.describe') {
      return rpcOk({ methods: methodDescriptions })
    }

    if (body.method === 'wiki.context') {
      const [vaults, tree, settings, properties, health, tabs] =
        await Promise.all([
          readVaults(workspaceId),
          getTreeResponse(workspaceId, vaultId),
          readVaultSettings(workspaceId, vaultId),
          listVaultProperties(workspaceId, vaultId),
          getHealth(workspaceId, vaultId),
          readTabsState(workspaceId, vaultId),
        ])
      return rpcOk({
        activeVaultId: vaultId,
        vaults,
        tree,
        settings,
        properties,
        health,
        tabs,
      })
    }

    if (body.method === 'wiki.list') {
      return rpcOk(await getTreeResponse(workspaceId, vaultId))
    }

    if (body.method === 'wiki.tabs.list' || body.method === 'wiki.listTabs') {
      return rpcOk(await readTabsState(workspaceId, vaultId))
    }

    if (body.method === 'wiki.read' || body.method === 'wiki.notes.read') {
      const parsed = notePathSchema.parse(params)
      return rpcOk(
        await readMarkdownDocument(workspaceId, parsed.path, vaultId),
      )
    }

    if (body.method === 'wiki.write' || body.method === 'wiki.notes.write') {
      const parsed = saveNoteSchema.parse(params)
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          parsed.path,
          parsed.content,
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.search') {
      const query =
        typeof params.query === 'string'
          ? params.query
          : typeof params.q === 'string'
            ? params.q
            : ''
      return rpcOk(await searchWiki(workspaceId, query, vaultId))
    }

    if (body.method === 'wiki.health') {
      return rpcOk(await getHealth(workspaceId, vaultId))
    }

    if (body.method === 'wiki.graph') {
      const parsed = notePathSchema.parse(params)
      return rpcOk(await getGraph(workspaceId, parsed.path, vaultId))
    }

    if (body.method === 'wiki.vaults.list') {
      return rpcOk(await readVaults(workspaceId))
    }

    if (body.method === 'wiki.vaults.create') {
      const parsed = createVaultSchema.parse(params)
      return rpcOk(await createVault(workspaceId, parsed.name, parsed.template))
    }

    if (body.method === 'wiki.vaults.switch') {
      const parsed = switchVaultSchema.parse(params)
      const response = await readVaults(workspaceId)
      if (!response.vaults.some((vault) => vault.id === parsed.id)) {
        throw new Error('Vault not found')
      }
      const next = { ...response, activeVaultId: parsed.id }
      await writeVaults(workspaceId, next)
      await ensureVaultDir(workspaceId, parsed.id)
      return rpcOk(next)
    }

    if (body.method === 'wiki.vaults.update') {
      const parsed = switchVaultSchema.merge(updateVaultSchema).parse(params)
      return rpcOk(await updateVault(workspaceId, parsed.id, parsed.name))
    }

    if (body.method === 'wiki.vaults.delete') {
      const parsed = switchVaultSchema.parse(params)
      return rpcOk(await deleteVault(workspaceId, parsed.id))
    }

    if (body.method === 'wiki.vaults.bootstrap') {
      const parsed = bootstrapTemplateSchema.parse(params)
      await bootstrapVault(workspaceId, vaultId, parsed.template)
      return rpcOk(await getTreeResponse(workspaceId, vaultId))
    }

    if (body.method === 'wiki.settings.get') {
      return rpcOk(await readVaultSettings(workspaceId, vaultId))
    }

    if (body.method === 'wiki.settings.update') {
      const parsed = updateVaultSettingsSchema.parse(params)
      const current = await readVaultSettings(workspaceId, vaultId)
      return rpcOk(
        await writeVaultSettings(workspaceId, vaultId, {
          ...current,
          ...parsed,
        }),
      )
    }

    if (body.method === 'wiki.notes.create') {
      const parsed = createNoteSchema.parse(params)
      const notePath = parsed.path
        ? normalizeWikiPath(parsed.path, { note: true })
        : await uniqueNotePath(
            workspaceId,
            parsed.title ?? 'Untitled',
            parsed.folder,
            vaultId,
          )
      if (await exists(resolveVaultPath(workspaceId, notePath, vaultId))) {
        return rpcOk(await readMarkdownDocument(workspaceId, notePath, vaultId))
      }
      const title = parsed.title?.trim() || titleFromNotePath(notePath)
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          notePath,
          parsed.content ?? [`# ${title}`, '', ''].join('\n'),
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.notes.delete') {
      const parsed = notePathSchema.parse(params)
      return rpcOk({
        ok: true,
        item: await moveEntryToTrash(workspaceId, vaultId, parsed.path, 'note'),
      })
    }

    if (body.method === 'wiki.folders.create') {
      const parsed = createFolderSchema.parse(params)
      await ensureDir(getFolderPath(workspaceId, parsed.path, vaultId))
      return rpcOk({ ok: true, path: normalizeWikiPath(parsed.path) })
    }

    if (body.method === 'wiki.folders.delete') {
      const parsed = notePathSchema.parse(params)
      return rpcOk({
        ok: true,
        item: await moveEntryToTrash(
          workspaceId,
          vaultId,
          parsed.path,
          'folder',
        ),
      })
    }

    if (body.method === 'wiki.entries.move' || body.method === 'wiki.move') {
      const parsed = moveSchema.parse(params)
      const from = normalizeWikiPath(parsed.from, {
        note: parsed.kind === 'note',
      })
      const to = normalizeWikiPath(parsed.to, { note: parsed.kind === 'note' })
      if (parsed.kind === 'folder' && to.startsWith(`${from}/`)) {
        throw new Error('Cannot move a folder inside itself')
      }

      const fromPath = resolveVaultPath(workspaceId, from, vaultId)
      const toPath = resolveVaultPath(workspaceId, to, vaultId)
      if (await exists(toPath)) throw new Error('Destination already exists')

      await ensureDir(path.dirname(toPath))
      await fs.rename(fromPath, toPath)

      const rewrite: LinkRewrite = { from, kind: parsed.kind, to }
      if (parsed.kind === 'note') {
        const content =
          typeof parsed.content === 'string'
            ? parsed.content
            : await fs.readFile(toPath, 'utf-8')
        await fs.writeFile(
          toPath,
          replaceMarkdownTitle(content, titleFromNotePath(to)),
          'utf-8',
        )
      } else if (typeof parsed.content === 'string' && parsed.contentPath) {
        const contentPath = normalizeWikiPath(parsed.contentPath, {
          note: true,
        })
        await fs.writeFile(
          resolveVaultPath(
            workspaceId,
            remapLinkedPath(contentPath, rewrite),
            vaultId,
          ),
          parsed.content,
          'utf-8',
        )
      }

      await rewriteVaultLinksAfterMove(workspaceId, vaultId, rewrite)
      return rpcOk({ ok: true, path: to })
    }

    if (body.method === 'wiki.daily.open') {
      return rpcOk(await openOrCreateDailyNote(workspaceId, vaultId))
    }

    if (body.method === 'wiki.templates.list') {
      return rpcOk(await listTemplates(workspaceId, vaultId))
    }

    if (body.method === 'wiki.templates.apply') {
      const parsed = applyTemplateSchema.parse(params)
      const template = await readMarkdownDocument(
        workspaceId,
        parsed.templatePath,
        vaultId,
      )
      const targetPath =
        parsed.targetPath?.trim() ||
        (await uniqueNotePath(
          workspaceId,
          titleFromNotePath(template.path),
          undefined,
          vaultId,
        ))
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          targetPath,
          applyTemplateVariables(template.content),
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.properties.list') {
      return rpcOk(await listVaultProperties(workspaceId, vaultId))
    }

    if (body.method === 'wiki.properties.set') {
      const parsed = updateNotePropertySchema.parse(params)
      const document = await readMarkdownDocument(
        workspaceId,
        parsed.path,
        vaultId,
      )
      const value = normalizePropertyValueForStorage(parsed.value)
      const propertyTypes = await readPropertyTypes(workspaceId, vaultId)
      const type =
        parsed.type ??
        propertyTypes.types[parsed.key] ??
        inferPropertyType(parsed.key, value)
      const nextContent = setFrontmatterProperty(
        document.content,
        parsed.key,
        value,
        type,
      )
      if (parsed.type) {
        await writePropertyTypes(workspaceId, vaultId, {
          ...propertyTypes.types,
          [parsed.key]: parsed.type,
        })
      }
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          parsed.path,
          nextContent,
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.properties.delete') {
      const parsed = deleteNotePropertySchema.parse(params)
      const document = await readMarkdownDocument(
        workspaceId,
        parsed.path,
        vaultId,
      )
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          parsed.path,
          deleteFrontmatterProperty(document.content, parsed.key),
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.properties.rename') {
      const parsed = renamePropertySchema.parse(params)
      return rpcOk(
        await renamePropertyAcrossVault(
          workspaceId,
          vaultId,
          parsed.oldKey,
          parsed.newKey,
        ),
      )
    }

    if (body.method === 'wiki.properties.type.set') {
      const parsed = updatePropertyTypeSchema.parse(params)
      const response = await readPropertyTypes(workspaceId, vaultId)
      const nextTypes = { ...response.types }
      if (parsed.oldKey && parsed.oldKey !== parsed.key)
        delete nextTypes[parsed.oldKey]
      nextTypes[parsed.key] = parsed.type
      return rpcOk(await writePropertyTypes(workspaceId, vaultId, nextTypes))
    }

    if (body.method === 'wiki.properties.reorder') {
      const parsed = reorderNotePropertiesSchema.parse(params)
      const document = await readMarkdownDocument(
        workspaceId,
        parsed.path,
        vaultId,
      )
      return rpcOk(
        await writeMarkdownDocument(
          workspaceId,
          parsed.path,
          reorderFrontmatterProperties(document.content, parsed.orderedKeys),
          vaultId,
        ),
      )
    }

    if (body.method === 'wiki.trash.list') {
      return rpcOk(await readTrashIndex(workspaceId, vaultId))
    }

    if (body.method === 'wiki.trash.restore') {
      const parsed = trashItemSchema.parse(params)
      return rpcOk({
        ok: true,
        item: await restoreTrashItem(workspaceId, vaultId, parsed.id),
      })
    }

    if (body.method === 'wiki.trash.purge') {
      const parsed = trashItemSchema.parse(params)
      return rpcOk({
        ok: true,
        item: await permanentlyDeleteTrashItem(workspaceId, vaultId, parsed.id),
      })
    }

    if (body.method === 'wiki.media.importPaths') {
      const parsed = importMediaPathsSchema.parse(params)
      const imported = []
      for (const sourcePath of parsed.paths.filter(isSupportedMediaPath)) {
        if (!path.isAbsolute(sourcePath)) continue
        const bytes = await fs.readFile(sourcePath)
        const assetPath = await uniqueAssetPath(
          workspaceId,
          path.basename(sourcePath),
          vaultId,
        )
        const filePath = resolveVaultPath(workspaceId, assetPath, vaultId)
        const mimeType = contentTypeForPath(sourcePath)
        await ensureDir(path.dirname(filePath))
        await fs.writeFile(filePath, bytes)
        imported.push({
          altText: path.basename(sourcePath),
          kind: mediaKindForMimeType(mimeType),
          name: path.basename(sourcePath),
          path: assetPath,
          src: assetPath,
        })
      }
      return rpcOk(imported)
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'unknown_method',
          message: `Unknown Wiki RPC method: ${body.method}`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Wiki RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'wiki_rpc_error',
          message: error instanceof Error ? error.message : 'Wiki RPC failed',
        },
      },
      400,
    )
  }
})

app.post('/api/moldable/today/dismiss', async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown
  if (!isMoldableTodayDismissalRequest(body)) {
    return c.json({ error: 'Invalid Today dismissal payload.' }, 400)
  }

  const dismissals = await recordMoldableTodayDismissal(c.req.raw, {
    id: body.id,
    dismissalKey: body.dismissalKey,
    materialDismissalKey: body.materialDismissalKey,
    dismissedAt: body.dismissedAt ?? new Date().toISOString(),
    item: body.item,
  })

  return c.json({ ok: true, dismissals: dismissals.length })
})

type MoldableTodayItem = {
  id?: unknown
  kind?: unknown
  title?: unknown
  subtitle?: unknown
  groupHint?: unknown
}

type MoldableTodayDismissal = {
  id: string
  dismissalKey?: string
  materialDismissalKey?: string
  dismissedAt: string
  item?: {
    kind?: string
    title?: string
    subtitle?: string
    groupHint?: string
  }
}

function isMoldableTodayResponse(value: unknown): value is {
  items: MoldableTodayItem[]
  [key: string]: unknown
} {
  return isMoldableTodayRecord(value) && Array.isArray(value.items)
}

function isMoldableTodayDismissalRequest(
  value: unknown,
): value is MoldableTodayDismissal {
  if (!isMoldableTodayRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    optionalMoldableTodayString(value.dismissalKey) &&
    optionalMoldableTodayString(value.materialDismissalKey) &&
    optionalMoldableTodayString(value.dismissedAt) &&
    (value.item === undefined || isMoldableTodayDismissalItem(value.item))
  )
}

function isMoldableTodayDismissalItem(value: unknown): value is {
  kind?: string
  title?: string
  subtitle?: string
  groupHint?: string
} {
  if (!isMoldableTodayRecord(value)) return false
  return (
    optionalMoldableTodayString(value.kind) &&
    optionalMoldableTodayString(value.title) &&
    optionalMoldableTodayString(value.subtitle) &&
    optionalMoldableTodayString(value.groupHint)
  )
}

function optionalMoldableTodayString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isMoldableTodayRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function recordMoldableTodayDismissal(
  request: Request,
  dismissal: MoldableTodayDismissal,
): Promise<MoldableTodayDismissal[]> {
  const current = await readMoldableTodayDismissals(request)
  const key = dismissal.dismissalKey ?? dismissal.id
  const next = [
    ...current.filter((entry) => (entry.dismissalKey ?? entry.id) !== key),
    dismissal,
  ].sort((a, b) => a.id.localeCompare(b.id))
  await writeMoldableTodayDismissals(request, next)
  return next
}

async function readMoldableTodayDismissals(
  request: Request,
): Promise<MoldableTodayDismissal[]> {
  const filePath = await moldableTodayDismissalsPath(request)
  const { readFile } = await import('node:fs/promises')
  try {
    const data = JSON.parse(await readFile(filePath, 'utf8')) as unknown
    return Array.isArray(data)
      ? data.filter(isMoldableTodayDismissalRequest)
      : []
  } catch (error) {
    if (isNodeFileNotFound(error)) return []
    throw error
  }
}

async function writeMoldableTodayDismissals(
  request: Request,
  dismissals: MoldableTodayDismissal[],
): Promise<void> {
  const filePath = await moldableTodayDismissalsPath(request)
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = path.join(
    path.dirname(filePath),
    '.' +
      path.basename(filePath) +
      '.' +
      process.pid +
      '.' +
      Date.now() +
      '.tmp',
  )
  await fs.writeFile(tempPath, JSON.stringify(dismissals, null, 2), 'utf8')
  await fs.rename(tempPath, filePath)
}

async function moldableTodayDismissalsPath(request: Request): Promise<string> {
  const path = await import('node:path')
  return path.join(moldableTodayDataDir(request), 'today-dismissals.json')
}

function moldableTodayDataDir(request: Request): string {
  const workspaceId =
    request.headers.get('x-moldable-workspace') ??
    request.headers.get('x-moldable-workspace-id') ??
    process.env.MOLDABLE_WORKSPACE_ID ??
    'personal'
  const appId = process.env.MOLDABLE_APP_ID

  if (appId) {
    const home =
      process.env.MOLDABLE_HOME ??
      (process.env.HOME ?? process.cwd()) + '/.moldable'
    return home + '/workspaces/' + workspaceId + '/apps/' + appId + '/data'
  }

  return process.env.MOLDABLE_APP_DATA_DIR ?? process.cwd() + '/data'
}

function filterMoldableTodayDismissedItems<T extends MoldableTodayItem>(
  items: T[],
  dismissals: MoldableTodayDismissal[],
): T[] {
  if (dismissals.length === 0) return items
  const dismissedIds = new Set(dismissals.map((entry) => entry.id))
  const dismissedMaterialKeys = new Set(
    dismissals
      .map((entry) => entry.materialDismissalKey)
      .filter((key): key is string => Boolean(key)),
  )

  return items.filter((item) => {
    if (typeof item.id === 'string' && dismissedIds.has(item.id)) return false
    return !dismissedMaterialKeys.has(moldableTodayMaterialKey(item))
  })
}

function moldableTodayMaterialKey(item: MoldableTodayItem): string {
  return [
    'material',
    process.env.MOLDABLE_APP_ID ?? '',
    typeof item.kind === 'string' ? item.kind : '',
    'text',
    normalizeMoldableTodayText(item.title),
    normalizeMoldableTodayText(item.subtitle),
    typeof item.groupHint === 'string' ? item.groupHint : '',
    '',
  ].join('\u001e')
}

function normalizeMoldableTodayText(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLowerCase()
    : ''
}

function isNodeFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}
