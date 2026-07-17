// Workspace-scoped artifact storage.
//
// Each artifact is its own JSON file under data/artifacts/<id>.json so the AI
// chat can edit artifacts either through the RPC routes or by editing the file
// directly — the server always re-reads from disk. Image assets live under
// data/assets/<id>/, version snapshots under data/versions/<id>.json, and the
// publish bundle is staged under data/publish/<id>/. Everything for one artifact
// is keyed by its id, so deleting an artifact cleans up after itself.
import {
  ensureDir,
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { isValidRuntimeStateNamespace } from '../shared/runtime-state'
import { createWelcomeArtifact } from '../shared/sample'
import type { Artifact, ArtifactSummary, PageDoc, Slide } from '../shared/types'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SEED_MARKER = '.seeded'

function baseDir(workspaceId?: string): string {
  return getAppDataDir(workspaceId)
}

function artifactsDir(workspaceId?: string): string {
  return safePath(baseDir(workspaceId), 'artifacts')
}

function artifactPath(workspaceId: string | undefined, id: string): string {
  return safePath(artifactsDir(workspaceId), `${sanitizeId(id)}.json`)
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

function runtimeStateDir(workspaceId: string | undefined, id: string): string {
  return safePath(baseDir(workspaceId), 'runtime-state', sanitizeId(id))
}

function runtimeStatePath(
  workspaceId: string | undefined,
  id: string,
  namespace: string,
): string {
  if (!isValidRuntimeStateNamespace(namespace)) {
    throw new Error('Invalid runtime state namespace')
  }
  return safePath(
    runtimeStateDir(workspaceId, id),
    `${encodeURIComponent(namespace)}.json`,
  )
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

export function newArtifactId(): string {
  return `art-${randomUUID().slice(0, 8)}`
}

export function newSlideId(): string {
  return `s-${randomUUID().slice(0, 8)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

async function seedIfNeeded(workspaceId?: string): Promise<void> {
  const dir = artifactsDir(workspaceId)
  const marker = safePath(baseDir(workspaceId), SEED_MARKER)
  if (existsSync(marker)) return
  await ensureDir(dir)
  // Only seed when there are genuinely no artifacts yet (true first run).
  const existing = await readArtifactFiles(workspaceId)
  if (existing.length === 0) {
    const artifact = createWelcomeArtifact(newArtifactId(), nowIso())
    await writeJson(artifactPath(workspaceId, artifact.id), artifact)
  }
  await writeFile(marker, nowIso(), 'utf8')
}

async function readArtifactFiles(workspaceId?: string): Promise<Artifact[]> {
  const dir = artifactsDir(workspaceId)
  if (!existsSync(dir)) return []
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json'))
  const artifacts: Artifact[] = []
  for (const name of names) {
    const artifact = await readJson<Artifact | null>(safePath(dir, name), null)
    if (artifact && artifact.id) artifacts.push(normalizeArtifact(artifact))
  }
  return artifacts
}

function normalizePage(page: Partial<PageDoc> | undefined): PageDoc {
  return {
    fontLinks: Array.isArray(page?.fontLinks) ? page!.fontLinks : [],
    libs: Array.isArray(page?.libs) ? page!.libs : [],
    css: typeof page?.css === 'string' ? page!.css : '',
    html: typeof page?.html === 'string' ? page!.html : '',
    js: typeof page?.js === 'string' ? page!.js : '',
    background:
      typeof page?.background === 'string' ? page!.background : undefined,
  }
}

function normalizeArtifact(artifact: Artifact): Artifact {
  const kind = artifact.kind === 'page' ? 'page' : 'deck'
  return {
    ...artifact,
    kind,
    subtitle: artifact.subtitle ?? '',
    density: artifact.density === 'high' ? 'high' : 'low',
    templateId: artifact.templateId,
    theme: {
      fontLinks: Array.isArray(artifact.theme?.fontLinks)
        ? artifact.theme.fontLinks
        : [],
      css: artifact.theme?.css ?? '',
      stageBg: artifact.theme?.stageBg,
    },
    slides: Array.isArray(artifact.slides)
      ? artifact.slides.map(normalizeSlide)
      : [],
    page: kind === 'page' ? normalizePage(artifact.page) : artifact.page,
    published: artifact.published ?? null,
    publishPending: Boolean(artifact.publishPending),
    publishError: artifact.publishError ?? null,
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

export async function listArtifacts(workspaceId?: string): Promise<Artifact[]> {
  await seedIfNeeded(workspaceId)
  const artifacts = await readArtifactFiles(workspaceId)
  return artifacts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getArtifact(
  workspaceId: string | undefined,
  id: string,
): Promise<Artifact | null> {
  const path = artifactPath(workspaceId, id)
  if (!existsSync(path)) return null
  const artifact = await readJson<Artifact | null>(path, null)
  return artifact ? normalizeArtifact(artifact) : null
}

export async function saveArtifact(
  workspaceId: string | undefined,
  artifact: Artifact,
  label?: string,
): Promise<Artifact> {
  await ensureDir(artifactsDir(workspaceId))
  // Snapshot the pre-change state as a restore point before overwriting.
  if (label) {
    const existing = await getArtifact(workspaceId, artifact.id)
    if (existing) await snapshotArtifact(workspaceId, existing, label)
  }
  const next = { ...artifact, updatedAt: nowIso() }
  await writeJson(artifactPath(workspaceId, artifact.id), next)
  return next
}

/** Save without bumping updatedAt or snapshotting (publish/revert bookkeeping). */
export async function saveArtifactRaw(
  workspaceId: string | undefined,
  artifact: Artifact,
): Promise<Artifact> {
  await ensureDir(artifactsDir(workspaceId))
  await writeJson(artifactPath(workspaceId, artifact.id), artifact)
  return artifact
}

export async function deleteArtifact(
  workspaceId: string | undefined,
  id: string,
): Promise<boolean> {
  const path = artifactPath(workspaceId, id)
  if (!existsSync(path)) return false
  await rm(path, { force: true })
  await rm(assetsDir(workspaceId, id), { recursive: true, force: true })
  await rm(versionsPath(workspaceId, id), { force: true })
  await rm(publishStageDir(workspaceId, id), { recursive: true, force: true })
  await rm(runtimeStateDir(workspaceId, id), { recursive: true, force: true })
  return true
}

export async function readRuntimeState(
  workspaceId: string | undefined,
  id: string,
  namespace: string,
): Promise<unknown | null> {
  const path = runtimeStatePath(workspaceId, id, namespace)
  if (!existsSync(path)) return null
  return readJson<unknown | null>(path, null)
}

export async function writeRuntimeState(
  workspaceId: string | undefined,
  id: string,
  namespace: string,
  value: unknown,
): Promise<void> {
  await ensureDir(runtimeStateDir(workspaceId, id))
  await writeJson(runtimeStatePath(workspaceId, id, namespace), value)
}

export async function deleteRuntimeState(
  workspaceId: string | undefined,
  id: string,
  namespace: string,
): Promise<void> {
  await rm(runtimeStatePath(workspaceId, id, namespace), { force: true })
}

// ---- Version history -----------------------------------------------------

const MAX_VERSIONS = 40

interface VersionEntry {
  versionId: string
  createdAt: string
  label: string
  slideCount: number
  artifact: Artifact
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

/** Append a restore point (the given artifact state) to its history. */
export async function snapshotArtifact(
  workspaceId: string | undefined,
  artifact: Artifact,
  label: string,
): Promise<void> {
  await ensureDir(safePath(baseDir(workspaceId), 'versions'))
  const path = versionsPath(workspaceId, artifact.id)
  const list = await readJson<VersionEntry[]>(path, [])
  list.push({
    versionId: randomUUID().slice(0, 8),
    createdAt: nowIso(),
    label,
    slideCount: artifact.slides.length,
    artifact,
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

export async function getVersionArtifact(
  workspaceId: string | undefined,
  id: string,
  versionId: string,
): Promise<Artifact | null> {
  const list = await readJson<VersionEntry[]>(versionsPath(workspaceId, id), [])
  return list.find((v) => v.versionId === versionId)?.artifact ?? null
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
 * lightweight JPGs instead of a live iframe per card). Regenerate with
 * scripts/gen-thumbs.mjs after template covers change. */
export async function readTemplateThumb(id: string): Promise<Buffer | null> {
  const clean = id.replace(/[^A-Za-z0-9._-]/g, '')
  if (!clean) return null
  const path = join(TEMPLATE_THUMBS_DIR, `${clean}.jpg`)
  return existsSync(path) ? readFile(path) : null
}

/** Copy a template's bundled images into an artifact's asset dir (skips existing). */
export async function copyTemplateAssets(
  workspaceId: string | undefined,
  artifactId: string,
  files: string[],
): Promise<void> {
  for (const file of files) {
    const clean = file.replace(/[^A-Za-z0-9._-]/g, '')
    if (!clean) continue
    if (existsSync(assetPath(workspaceId, artifactId, clean))) continue
    const bytes = await readTemplateAsset(clean)
    if (bytes) await writeAsset(workspaceId, artifactId, clean, bytes)
  }
}

export function summarize(artifact: Artifact): ArtifactSummary {
  return {
    id: artifact.id,
    title: artifact.title,
    subtitle: artifact.subtitle,
    kind: artifact.kind,
    templateId: artifact.templateId,
    slideCount: artifact.slides.length,
    published: Boolean(artifact.published),
    publishedUrl: artifact.published?.url ?? null,
    publishPending: Boolean(artifact.publishPending),
    updatedAt: artifact.updatedAt,
    createdAt: artifact.createdAt,
  }
}
