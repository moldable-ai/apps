// Workspace-scoped deck storage.
//
// Each deck is its own JSON file under data/decks/<id>.json so the AI chat can
// edit decks either through the RPC routes or by editing the file directly — the
// server always re-reads from disk. Image assets live under data/assets/<id>/.
import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { createWelcomeDeck } from '../shared/sample'
import type { Deck, DeckSummary, Slide } from '../shared/types'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SEED_MARKER = '.seeded'

function baseDir(workspaceId?: string): string {
  return getAppDataDir(workspaceId)
}

function decksDir(workspaceId?: string): string {
  return safePath(baseDir(workspaceId), 'decks')
}

function deckPath(workspaceId: string | undefined, id: string): string {
  return safePath(decksDir(workspaceId), `${sanitizeId(id)}.json`)
}

export function assetsDir(workspaceId: string | undefined, id: string): string {
  return safePath(baseDir(workspaceId), 'assets', sanitizeId(id))
}

export function assetPath(
  workspaceId: string | undefined,
  id: string,
  fileName: string,
): string {
  return safePath(assetsDir(workspaceId, id), fileName)
}

function publishStageDir(workspaceId: string | undefined, id: string): string {
  return safePath(baseDir(workspaceId), 'publish', sanitizeId(id))
}

/**
 * Write the composed index.html to a staging folder on disk and return its
 * absolute path. The publish host reads files by absolute `sourcePath`, so the
 * generated bundle must exist as real files under this staging directory.
 */
export async function stageIndexHtml(
  workspaceId: string | undefined,
  id: string,
  html: string,
): Promise<string> {
  const dir = publishStageDir(workspaceId, id)
  await rm(dir, { recursive: true, force: true })
  await ensureDir(dir)
  const path = safePath(dir, 'index.html')
  await writeFile(path, html, 'utf8')
  return path
}

export async function stageAsset(
  workspaceId: string | undefined,
  id: string,
  fileName: string,
): Promise<string> {
  const source = assetPath(workspaceId, id, fileName)
  const assetsStageDir = safePath(publishStageDir(workspaceId, id), 'assets')
  await ensureDir(assetsStageDir)
  const staged = safePath(assetsStageDir, fileName)
  await copyFile(source, staged)
  return staged
}

function sanitizeId(id: string): string {
  const clean = id.replace(/[^A-Za-z0-9_-]/g, '')
  if (!clean) throw new Error('Invalid id')
  return clean
}

export function newDeckId(): string {
  return `deck-${randomUUID().slice(0, 8)}`
}

export function newSlideId(): string {
  return `s-${randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

async function seedIfNeeded(workspaceId?: string): Promise<void> {
  const dir = decksDir(workspaceId)
  const marker = safePath(baseDir(workspaceId), SEED_MARKER)
  if (existsSync(marker)) return
  await ensureDir(dir)
  // Only seed when there are genuinely no decks yet (true first run).
  const existing = await readDeckFiles(workspaceId)
  if (existing.length === 0) {
    const deck = createWelcomeDeck(newDeckId(), nowIso())
    await writeJson(deckPath(workspaceId, deck.id), deck)
  }
  await writeFile(marker, nowIso(), 'utf8')
}

async function readDeckFiles(workspaceId?: string): Promise<Deck[]> {
  const dir = decksDir(workspaceId)
  if (!existsSync(dir)) return []
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json'))
  const decks: Deck[] = []
  for (const name of names) {
    const deck = await readJson<Deck | null>(safePath(dir, name), null)
    if (deck && deck.id) decks.push(normalizeDeck(deck))
  }
  return decks
}

function normalizeDeck(deck: Deck): Deck {
  return {
    ...deck,
    subtitle: deck.subtitle ?? '',
    density: deck.density === 'high' ? 'high' : 'low',
    templateId: deck.templateId,
    theme: {
      fontLinks: Array.isArray(deck.theme?.fontLinks)
        ? deck.theme.fontLinks
        : [],
      css: deck.theme?.css ?? '',
      stageBg: deck.theme?.stageBg,
    },
    slides: Array.isArray(deck.slides) ? deck.slides.map(normalizeSlide) : [],
    published: deck.published ?? null,
    publishPending: Boolean(deck.publishPending),
    publishError: deck.publishError ?? null,
  }
}

function normalizeSlide(slide: Slide): Slide {
  return {
    id: slide.id || newSlideId(),
    name: slide.name || 'Slide',
    bodyHtml: slide.bodyHtml ?? '',
    slideClass: slide.slideClass,
    transition: slide.transition,
    notes: slide.notes,
  }
}

export async function listDecks(workspaceId?: string): Promise<Deck[]> {
  await seedIfNeeded(workspaceId)
  const decks = await readDeckFiles(workspaceId)
  return decks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getDeck(
  workspaceId: string | undefined,
  id: string,
): Promise<Deck | null> {
  const path = deckPath(workspaceId, id)
  if (!existsSync(path)) return null
  const deck = await readJson<Deck | null>(path, null)
  return deck ? normalizeDeck(deck) : null
}

export async function saveDeck(
  workspaceId: string | undefined,
  deck: Deck,
  label?: string,
): Promise<Deck> {
  await ensureDir(decksDir(workspaceId))
  // Snapshot the pre-change state as a restore point before overwriting.
  if (label) {
    const existing = await getDeck(workspaceId, deck.id)
    if (existing) await snapshotDeck(workspaceId, existing, label)
  }
  const next = { ...deck, updatedAt: nowIso() }
  await writeJson(deckPath(workspaceId, deck.id), next)
  return next
}

/** Save without bumping updatedAt or snapshotting (publish/revert bookkeeping). */
export async function saveDeckRaw(
  workspaceId: string | undefined,
  deck: Deck,
): Promise<Deck> {
  await ensureDir(decksDir(workspaceId))
  await writeJson(deckPath(workspaceId, deck.id), deck)
  return deck
}

export async function deleteDeck(
  workspaceId: string | undefined,
  id: string,
): Promise<boolean> {
  const path = deckPath(workspaceId, id)
  if (!existsSync(path)) return false
  await rm(path, { force: true })
  await rm(assetsDir(workspaceId, id), { recursive: true, force: true })
  await rm(versionsPath(workspaceId, id), { force: true })
  return true
}

// ---- Version history -----------------------------------------------------

const MAX_VERSIONS = 40

interface VersionEntry {
  versionId: string
  createdAt: string
  label: string
  slideCount: number
  deck: Deck
}

export interface VersionMeta {
  versionId: string
  createdAt: string
  label: string
  slideCount: number
}

function versionsPath(workspaceId: string | undefined, id: string): string {
  return safePath(baseDir(workspaceId), 'versions', `${sanitizeId(id)}.json`)
}

/** Append a restore point (the given deck state) to a deck's history. */
export async function snapshotDeck(
  workspaceId: string | undefined,
  deck: Deck,
  label: string,
): Promise<void> {
  await ensureDir(safePath(baseDir(workspaceId), 'versions'))
  const path = versionsPath(workspaceId, deck.id)
  const list = await readJson<VersionEntry[]>(path, [])
  list.push({
    versionId: randomUUID().slice(0, 8),
    createdAt: nowIso(),
    label,
    slideCount: deck.slides.length,
    deck,
  })
  await writeJson(path, list.slice(-MAX_VERSIONS))
}

export async function listVersions(
  workspaceId: string | undefined,
  id: string,
): Promise<VersionMeta[]> {
  const list = await readJson<VersionEntry[]>(versionsPath(workspaceId, id), [])
  // newest first
  return list
    .map(({ versionId, createdAt, label, slideCount }) => ({
      versionId,
      createdAt,
      label,
      slideCount,
    }))
    .reverse()
}

export async function getVersionDeck(
  workspaceId: string | undefined,
  id: string,
  versionId: string,
): Promise<Deck | null> {
  const list = await readJson<VersionEntry[]>(versionsPath(workspaceId, id), [])
  return list.find((v) => v.versionId === versionId)?.deck ?? null
}

export async function listAssets(
  workspaceId: string | undefined,
  id: string,
): Promise<string[]> {
  const dir = assetsDir(workspaceId, id)
  if (!existsSync(dir)) return []
  return (await readdir(dir)).filter((n) => !n.startsWith('.'))
}

export async function readAsset(
  workspaceId: string | undefined,
  id: string,
  fileName: string,
): Promise<Buffer | null> {
  const path = assetPath(workspaceId, id, fileName)
  if (!existsSync(path)) return null
  return readFile(path)
}

export async function writeAsset(
  workspaceId: string | undefined,
  id: string,
  fileName: string,
  bytes: Buffer,
): Promise<void> {
  await ensureDir(assetsDir(workspaceId, id))
  await writeFile(assetPath(workspaceId, id, fileName), bytes)
}

// ---- Bundled template assets ---------------------------------------------

const TEMPLATE_ASSETS_DIR = join(process.cwd(), 'template-assets')

export async function readTemplateAsset(
  fileName: string,
): Promise<Buffer | null> {
  const clean = fileName.replace(/[^A-Za-z0-9._-]/g, '')
  if (!clean) return null
  const path = join(TEMPLATE_ASSETS_DIR, clean)
  return existsSync(path) ? readFile(path) : null
}

/** Absolute path of a bundled template image (used as image-to-image style refs
 * for the Assets panel's style presets), or null if it doesn't exist. */
export function templateAssetPath(fileName: string): string | null {
  const clean = fileName.replace(/[^A-Za-z0-9._-]/g, '')
  if (!clean) return null
  const path = join(TEMPLATE_ASSETS_DIR, clean)
  return existsSync(path) ? path : null
}

const TEMPLATE_THUMBS_DIR = join(process.cwd(), 'template-thumbs')

/** Pre-rendered cover thumbnail for a template (the picker gallery uses these
 * lightweight JPGs instead of a live deck iframe per card). Regenerate with
 * scripts/gen-thumbs.mjs after template covers change. */
export async function readTemplateThumb(id: string): Promise<Buffer | null> {
  const clean = id.replace(/[^A-Za-z0-9._-]/g, '')
  if (!clean) return null
  const path = join(TEMPLATE_THUMBS_DIR, `${clean}.jpg`)
  return existsSync(path) ? readFile(path) : null
}

/** Copy a template's bundled images into a deck's asset dir (skips existing). */
export async function copyTemplateAssets(
  workspaceId: string | undefined,
  deckId: string,
  files: string[],
): Promise<void> {
  for (const file of files) {
    const clean = file.replace(/[^A-Za-z0-9._-]/g, '')
    if (!clean) continue
    if (existsSync(assetPath(workspaceId, deckId, clean))) continue
    const bytes = await readTemplateAsset(clean)
    if (bytes) await writeAsset(workspaceId, deckId, clean, bytes)
  }
}

export function summarize(deck: Deck): DeckSummary {
  return {
    id: deck.id,
    title: deck.title,
    subtitle: deck.subtitle,
    templateId: deck.templateId,
    slideCount: deck.slides.length,
    published: Boolean(deck.published),
    publishedUrl: deck.published?.url ?? null,
    publishPending: Boolean(deck.publishPending),
    updatedAt: deck.updatedAt,
    createdAt: deck.createdAt,
  }
}
