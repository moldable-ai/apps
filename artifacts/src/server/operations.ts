// Artifact/slide mutations shared by the REST routes and the /api/moldable/rpc
// dispatcher. All validation/coercion lives here so chat (RPC) and the UI (REST)
// behave identically.
import { getTemplate, templateTheme } from '../shared/templates'
import {
  type Artifact,
  type ArtifactKind,
  type DeckTheme,
  type PageDoc,
  type PublishedInfo,
  type Slide,
  type SlideTransition,
  emptyPage,
  emptyTheme,
} from '../shared/types'
import {
  copyTemplateAssets,
  deleteArtifact,
  getArtifact,
  getVersionArtifact,
  newArtifactId,
  newSlideId,
  nowIso,
  saveArtifact,
  saveArtifactRaw,
  snapshotArtifact,
} from './store'
import { replaceExactText } from './text-replace'

const EMPTY_THEME: DeckTheme = { fontLinks: [], css: '', stageBg: undefined }
const ARTIFACT_TEXT_FIELDS = ['title', 'subtitle', 'imageStyle'] as const
const PAGE_TEXT_FIELDS = ['html', 'css', 'js', 'background'] as const
const SLIDE_TEXT_FIELDS = ['name', 'bodyHtml', 'slideClass', 'notes'] as const
const THEME_TEXT_FIELDS = ['css', 'stageBg'] as const
const ALL_TEXT_FIELDS = [
  ...ARTIFACT_TEXT_FIELDS,
  ...PAGE_TEXT_FIELDS,
  ...SLIDE_TEXT_FIELDS,
  ...THEME_TEXT_FIELDS,
] as const

type ArtifactTextField = (typeof ARTIFACT_TEXT_FIELDS)[number]
type PageTextField = (typeof PAGE_TEXT_FIELDS)[number]
type SlideTextField = (typeof SLIDE_TEXT_FIELDS)[number]
type ThemeTextField = (typeof THEME_TEXT_FIELDS)[number]
type TextTargetKind = 'artifact' | 'page' | 'slide' | 'theme'

type TextEditTarget =
  | { kind: 'artifact'; field: ArtifactTextField }
  | { kind: 'page'; field: PageTextField }
  | { kind: 'slide'; field: SlideTextField; slideId: string }
  | { kind: 'theme'; field: ThemeTextField }

interface TextEditFilter {
  kind?: TextTargetKind
  field?: string
  slideId?: string
}

interface TextCandidate {
  target: TextEditTarget
  get(): string
  set(value: string): void
  slideIndex?: number
}

export interface ArtifactTextReplaceResult {
  artifact: Artifact
  slide?: Slide
  target: TextEditTarget
  targets: TextEditTarget[]
  replacements: number
}

function cloneSampleSlides(slides: Slide[]): Slide[] {
  return slides.map((slide) => ({ ...slide, id: newSlideId() }))
}

export class OperationError extends Error {
  status: number
  code: string
  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

const TRANSITIONS: SlideTransition[] = ['fade', 'slide', 'zoom', 'none']

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function coerceKind(value: unknown): ArtifactKind | undefined {
  return value === 'page' ? 'page' : value === 'deck' ? 'deck' : undefined
}

function coerceTransition(value: unknown): SlideTransition | undefined {
  return typeof value === 'string' &&
    TRANSITIONS.includes(value as SlideTransition)
    ? (value as SlideTransition)
    : undefined
}

function coerceTheme(value: unknown, base: DeckTheme): DeckTheme {
  if (!value || typeof value !== 'object') return base
  const v = value as Record<string, unknown>
  return {
    fontLinks: Array.isArray(v.fontLinks)
      ? v.fontLinks.filter((x): x is string => typeof x === 'string')
      : base.fontLinks,
    css: typeof v.css === 'string' ? v.css : base.css,
    stageBg:
      typeof v.stageBg === 'string'
        ? v.stageBg
        : v.stageBg === null
          ? undefined
          : base.stageBg,
  }
}

function strArray(value: unknown, base: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === 'string')
    : base
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function isOneOf<T extends readonly string[]>(
  options: T,
  value: unknown,
): value is T[number] {
  return typeof value === 'string' && options.includes(value)
}

function isTextKind(value: unknown): value is TextTargetKind {
  return (
    value === 'artifact' ||
    value === 'page' ||
    value === 'slide' ||
    value === 'theme'
  )
}

function validateTextField(kind: TextTargetKind | undefined, field: string) {
  if (kind === 'artifact' && !isOneOf(ARTIFACT_TEXT_FIELDS, field)) {
    throw new OperationError(
      'invalid_text_field',
      `artifact text field must be one of: ${ARTIFACT_TEXT_FIELDS.join(', ')}`,
    )
  }
  if (kind === 'page' && !isOneOf(PAGE_TEXT_FIELDS, field)) {
    throw new OperationError(
      'invalid_text_field',
      `page text field must be one of: ${PAGE_TEXT_FIELDS.join(', ')}`,
    )
  }
  if (kind === 'slide' && !isOneOf(SLIDE_TEXT_FIELDS, field)) {
    throw new OperationError(
      'invalid_text_field',
      `slide text field must be one of: ${SLIDE_TEXT_FIELDS.join(', ')}`,
    )
  }
  if (kind === 'theme' && !isOneOf(THEME_TEXT_FIELDS, field)) {
    throw new OperationError(
      'invalid_text_field',
      `theme text field must be one of: ${THEME_TEXT_FIELDS.join(', ')}`,
    )
  }
  if (!kind && !isOneOf(ALL_TEXT_FIELDS, field)) {
    throw new OperationError(
      'invalid_text_field',
      `text field must be one of: ${[...new Set(ALL_TEXT_FIELDS)].join(', ')}`,
    )
  }
}

function textFilter(
  input: unknown,
  defaults: { kind?: string; field?: string; slideId?: string } = {},
): TextEditFilter {
  const v = record(input)
  const target = record(v.target)
  const rawKind =
    str(target.kind) ??
    str(target.scope) ??
    str(v.kind) ??
    str(v.scope) ??
    defaults.kind
  const field = str(target.field) ?? str(v.field) ?? defaults.field
  const slideId = str(target.slideId) ?? str(v.slideId) ?? defaults.slideId

  let kind: TextTargetKind | undefined
  if (rawKind) {
    if (!isTextKind(rawKind)) {
      throw new OperationError(
        'invalid_text_target',
        'text edit target kind must be artifact, page, slide, or theme',
      )
    }
    kind = rawKind
  }
  if (field) validateTextField(kind, field)
  if (slideId && kind && kind !== 'slide') {
    throw new OperationError(
      'invalid_text_target',
      'slideId can only be used with slide text edits',
    )
  }

  return { kind, field, slideId }
}

function textPatch(input: unknown): {
  oldString: string
  newString: string
  replaceAll: boolean
} {
  const v = record(input)
  const oldString = str(v.oldString)
  const newString = str(v.newString)
  if (oldString === undefined) {
    throw new OperationError('missing_old_string', 'oldString is required')
  }
  if (!oldString) {
    throw new OperationError('old_string_empty', 'oldString cannot be empty')
  }
  if (newString === undefined) {
    throw new OperationError('missing_new_string', 'newString is required')
  }
  return { oldString, newString, replaceAll: v.replaceAll === true }
}

function describeTextTarget(target: TextEditTarget): string {
  if (target.kind === 'slide') return `slide(${target.slideId}).${target.field}`
  return `${target.kind}.${target.field}`
}

function countOccurrences(value: string, oldString: string): number {
  return value.split(oldString).length - 1
}

function textCandidates(
  artifact: Artifact,
  filter: TextEditFilter,
): TextCandidate[] {
  if (filter.kind === 'page') mustBePage(artifact)
  if (filter.kind === 'slide') mustBeDeck(artifact)

  const candidates: TextCandidate[] = []
  const include = (kind: TextTargetKind, field: string) =>
    (!filter.kind || filter.kind === kind) &&
    (!filter.field || filter.field === field)

  for (const field of ARTIFACT_TEXT_FIELDS) {
    if (!include('artifact', field)) continue
    candidates.push({
      target: { kind: 'artifact', field },
      get: () =>
        (field === 'imageStyle' ? artifact.imageStyle : artifact[field]) ?? '',
      set: (value) => {
        artifact[field] = value
      },
    })
  }

  for (const field of THEME_TEXT_FIELDS) {
    if (!include('theme', field)) continue
    candidates.push({
      target: { kind: 'theme', field },
      get: () => artifact.theme[field] ?? '',
      set: (value) => {
        artifact.theme = { ...artifact.theme, [field]: value }
      },
    })
  }

  if (artifact.kind === 'page') {
    for (const field of PAGE_TEXT_FIELDS) {
      if (!include('page', field)) continue
      candidates.push({
        target: { kind: 'page', field },
        get: () => (artifact.page ?? emptyPage())[field] ?? '',
        set: (value) => {
          artifact.page = { ...(artifact.page ?? emptyPage()), [field]: value }
        },
      })
    }
  }

  if (artifact.kind === 'deck') {
    for (
      let slideIndex = 0;
      slideIndex < artifact.slides.length;
      slideIndex += 1
    ) {
      const slide = artifact.slides[slideIndex]
      if (filter.slideId && filter.slideId !== slide.id) continue
      for (const field of SLIDE_TEXT_FIELDS) {
        if (!include('slide', field)) continue
        candidates.push({
          target: { kind: 'slide', field, slideId: slide.id },
          slideIndex,
          get: () => artifact.slides[slideIndex]?.[field] ?? '',
          set: (value) => {
            artifact.slides[slideIndex] = {
              ...artifact.slides[slideIndex],
              [field]: value,
            }
          },
        })
      }
    }
  }

  if (
    filter.slideId &&
    !candidates.some((item) => item.target.kind === 'slide')
  ) {
    throw new OperationError(
      'slide_not_found',
      `No slide: ${filter.slideId}`,
      404,
    )
  }

  return candidates
}

/** Merge a partial page patch onto a base page doc (only provided fields win). */
function coercePage(value: unknown, base: PageDoc): PageDoc {
  if (!value || typeof value !== 'object') return base
  const v = value as Record<string, unknown>
  return {
    fontLinks:
      'fontLinks' in v ? strArray(v.fontLinks, base.fontLinks) : base.fontLinks,
    libs: 'libs' in v ? strArray(v.libs, base.libs) : base.libs,
    css: typeof v.css === 'string' ? v.css : base.css,
    html: typeof v.html === 'string' ? v.html : base.html,
    js: typeof v.js === 'string' ? v.js : base.js,
    background:
      typeof v.background === 'string'
        ? v.background
        : v.background === null
          ? undefined
          : base.background,
  }
}

function coerceSlide(value: unknown): Slide {
  const v = (value ?? {}) as Record<string, unknown>
  return {
    id: str(v.id) || newSlideId(),
    name: str(v.name) || 'Slide',
    bodyHtml: str(v.bodyHtml) ?? '',
    slideClass: str(v.slideClass),
    transition: coerceTransition(v.transition),
    notes: str(v.notes),
  }
}

async function mustGet(
  workspaceId: string | undefined,
  id: string,
): Promise<Artifact> {
  const artifact = await getArtifact(workspaceId, id)
  if (!artifact)
    throw new OperationError('artifact_not_found', `No artifact: ${id}`, 404)
  return artifact
}

function mustBePage(artifact: Artifact): void {
  if (artifact.kind !== 'page') {
    throw new OperationError(
      'not_a_page',
      `Artifact ${artifact.id} is a slide deck, not a page.`,
    )
  }
}

function mustBeDeck(artifact: Artifact): void {
  if (artifact.kind !== 'deck') {
    throw new OperationError(
      'not_a_deck',
      `Artifact ${artifact.id} is a page, not a slide deck.`,
    )
  }
}

// ---- Artifact-level ------------------------------------------------------

export async function createArtifact(
  workspaceId: string | undefined,
  input: unknown,
): Promise<Artifact> {
  const v = (input ?? {}) as Record<string, unknown>
  const now = nowIso()
  const template = getTemplate(str(v.templateId))
  const kind: ArtifactKind = coerceKind(v.kind) ?? template?.kind ?? 'deck'

  let theme: DeckTheme
  let slides: Slide[] = []
  let page: PageDoc | undefined

  if (kind === 'page') {
    theme = v.theme
      ? coerceTheme(v.theme, EMPTY_THEME)
      : template
        ? templateTheme(template)
        : EMPTY_THEME
    const basePage = template?.samplePage
      ? { ...template.samplePage }
      : emptyPage()
    page = v.page ? coercePage(v.page, basePage) : basePage
  } else {
    const explicitSlides = Array.isArray(v.slides)
      ? v.slides.map(coerceSlide)
      : null
    slides =
      explicitSlides ??
      (template?.sampleSlides ? cloneSampleSlides(template.sampleSlides) : [])
    theme = v.theme
      ? coerceTheme(v.theme, EMPTY_THEME)
      : template
        ? templateTheme(template)
        : EMPTY_THEME
  }

  const artifact: Artifact = {
    id: newArtifactId(),
    title:
      str(v.title) ||
      template?.name ||
      (kind === 'page' ? 'Untitled page' : 'Untitled deck'),
    subtitle: str(v.subtitle) ?? '',
    kind,
    density: v.density === 'high' ? 'high' : 'low',
    templateId: template?.id,
    theme,
    slides,
    page,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: now,
    updatedAt: now,
  }
  const saved = await saveArtifact(workspaceId, artifact)
  if (template?.assets?.length) {
    await copyTemplateAssets(workspaceId, saved.id, template.assets)
  }
  return saved
}

/**
 * Switch an artifact to a library template. For decks this re-skins the theme
 * (and seeds sample slides if empty). For pages it adopts the template's page
 * doc when the page is empty, and its fonts either way.
 */
export async function applyTemplate(
  workspaceId: string | undefined,
  id: string,
  templateId: string,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  const template = getTemplate(templateId)
  if (!template) {
    throw new OperationError(
      'template_not_found',
      `No template: ${templateId}`,
      404,
    )
  }

  let next: Artifact
  if (template.kind === 'page') {
    // Adopt the template's design (its page IS its design). The prior page is
    // snapshotted to history by saveArtifact below, so this stays undoable.
    next = {
      ...artifact,
      kind: 'page',
      templateId: template.id,
      theme: templateTheme(template),
      slides: [],
      page: template.samplePage
        ? { ...template.samplePage }
        : (artifact.page ?? emptyPage()),
    }
  } else {
    next = {
      ...artifact,
      kind: 'deck',
      templateId: template.id,
      theme: templateTheme(template),
      page: undefined,
      slides:
        artifact.slides.length === 0 && template.sampleSlides
          ? cloneSampleSlides(template.sampleSlides)
          : artifact.slides,
    }
  }
  const saved = await saveArtifact(workspaceId, next, 'Change template')
  if (template.assets?.length) {
    await copyTemplateAssets(workspaceId, saved.id, template.assets)
  }
  return saved
}

export async function updateArtifact(
  workspaceId: string | undefined,
  id: string,
  patch: unknown,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  const v = (patch ?? {}) as Record<string, unknown>
  const next: Artifact = {
    ...artifact,
    title: str(v.title) ?? artifact.title,
    subtitle: str(v.subtitle) ?? artifact.subtitle,
    density:
      v.density === 'high'
        ? 'high'
        : v.density === 'low'
          ? 'low'
          : artifact.density,
    imageStyle:
      'imageStyle' in v
        ? (str(v.imageStyle) ?? undefined)
        : artifact.imageStyle,
    theme: coerceTheme(v.theme, artifact.theme),
  }
  return saveArtifact(workspaceId, next, 'Edit artifact')
}

/** Update a page artifact's document (html / css / js / fonts / libs / bg). */
export async function setPage(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  mustBePage(artifact)
  const next: Artifact = {
    ...artifact,
    page: coercePage(input, artifact.page ?? emptyPage()),
  }
  return saveArtifact(workspaceId, next, 'Edit page')
}

export async function replaceArtifactText(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
  defaults?: { kind?: string; field?: string; slideId?: string },
): Promise<ArtifactTextReplaceResult> {
  const artifact = await mustGet(workspaceId, id)
  const filter = textFilter(input, defaults)
  const patch = textPatch(input)
  const candidates = textCandidates(artifact, filter)
  const matches = candidates
    .map((candidate) => ({
      candidate,
      occurrences: countOccurrences(candidate.get(), patch.oldString),
    }))
    .filter((match) => match.occurrences > 0)
  const totalOccurrences = matches.reduce(
    (total, match) => total + match.occurrences,
    0,
  )

  if (totalOccurrences === 0) {
    throw new OperationError('old_string_not_found', 'oldString not found')
  }
  if (!patch.replaceAll && totalOccurrences > 1) {
    const locations = matches
      .map(
        (match) =>
          `${describeTextTarget(match.candidate.target)} (${match.occurrences})`,
      )
      .join(', ')
    throw new OperationError(
      'old_string_not_unique',
      `oldString found ${totalOccurrences} times across ${locations} - must be unique or use replaceAll`,
    )
  }

  let replacements = 0
  let changedSlide: Slide | undefined
  const changedTargets: TextEditTarget[] = []

  for (const { candidate } of matches) {
    const result = replaceExactText({
      value: candidate.get(),
      oldString: patch.oldString,
      newString: patch.newString,
      replaceAll: patch.replaceAll,
    })
    candidate.set(result.value)
    replacements += result.replacements
    changedTargets.push(candidate.target)
    if (candidate.slideIndex !== undefined && !changedSlide) {
      changedSlide = artifact.slides[candidate.slideIndex]
    }
  }

  const saved = await saveArtifact(
    workspaceId,
    artifact,
    changedTargets.length === 1
      ? `Edit ${describeTextTarget(changedTargets[0])}`
      : 'Edit artifact text',
  )
  return {
    artifact: saved,
    slide: changedSlide,
    target: changedTargets[0],
    targets: changedTargets,
    replacements,
  }
}

/**
 * Persist the artifact's image-style recipe WITHOUT bumping updatedAt (it
 * doesn't affect rendered/published output), so saving it from the Assets panel
 * never reloads the live canvas or flags unpublished changes.
 */
export async function setImageStyle(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  const v = (input ?? {}) as Record<string, unknown>
  if ('style' in v) artifact.imageStyle = str(v.style)?.trim() || undefined
  if ('presetId' in v)
    artifact.imagePresetId = str(v.presetId)?.trim() || undefined
  return saveArtifactRaw(workspaceId, artifact)
}

/** Replace an entire artifact's content in one call (bulk generation). */
export async function replaceArtifact(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  const v = (input ?? {}) as Record<string, unknown>
  const kind = coerceKind(v.kind) ?? artifact.kind
  const next: Artifact = {
    ...artifact,
    kind,
    title: str(v.title) ?? artifact.title,
    subtitle: str(v.subtitle) ?? artifact.subtitle,
    density:
      v.density === 'high'
        ? 'high'
        : v.density === 'low'
          ? 'low'
          : artifact.density,
    theme: coerceTheme(v.theme, artifact.theme),
    slides:
      kind === 'deck' && Array.isArray(v.slides)
        ? v.slides.map(coerceSlide)
        : kind === 'deck'
          ? artifact.slides
          : [],
    page:
      kind === 'page'
        ? coercePage(v.page, artifact.page ?? emptyPage())
        : undefined,
  }
  return saveArtifact(workspaceId, next, 'Replace artifact')
}

export async function removeArtifact(
  workspaceId: string | undefined,
  id: string,
): Promise<void> {
  const ok = await deleteArtifact(workspaceId, id)
  if (!ok)
    throw new OperationError('artifact_not_found', `No artifact: ${id}`, 404)
}

// ---- Slide-level (deck artifacts) ----------------------------------------

export async function addSlide(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
  index?: number,
): Promise<{ artifact: Artifact; slide: Slide }> {
  const artifact = await mustGet(workspaceId, id)
  mustBeDeck(artifact)
  const slide = coerceSlide(input)
  slide.id = newSlideId() // always fresh on add
  const at =
    typeof index === 'number' && index >= 0 && index <= artifact.slides.length
      ? index
      : artifact.slides.length
  artifact.slides.splice(at, 0, slide)
  const saved = await saveArtifact(workspaceId, artifact, 'Add slide')
  return { artifact: saved, slide }
}

export async function updateSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
  patch: unknown,
): Promise<{ artifact: Artifact; slide: Slide }> {
  const artifact = await mustGet(workspaceId, id)
  mustBeDeck(artifact)
  const idx = artifact.slides.findIndex((s) => s.id === slideId)
  if (idx === -1)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  const v = (patch ?? {}) as Record<string, unknown>
  const current = artifact.slides[idx]
  const next: Slide = {
    ...current,
    name: str(v.name) ?? current.name,
    bodyHtml: str(v.bodyHtml) ?? current.bodyHtml,
    slideClass:
      'slideClass' in v ? (str(v.slideClass) ?? undefined) : current.slideClass,
    transition: coerceTransition(v.transition) ?? current.transition,
    notes: 'notes' in v ? (str(v.notes) ?? undefined) : current.notes,
  }
  artifact.slides[idx] = next
  const saved = await saveArtifact(workspaceId, artifact, 'Edit slide')
  return { artifact: saved, slide: next }
}

export async function removeSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  mustBeDeck(artifact)
  const before = artifact.slides.length
  artifact.slides = artifact.slides.filter((s) => s.id !== slideId)
  if (artifact.slides.length === before)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  return saveArtifact(workspaceId, artifact, 'Remove slide')
}

export async function reorderSlides(
  workspaceId: string | undefined,
  id: string,
  order: unknown,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  mustBeDeck(artifact)
  if (!Array.isArray(order))
    throw new OperationError('bad_order', 'order must be an array of slide ids')
  const ids = order.filter((x): x is string => typeof x === 'string')
  const map = new Map(artifact.slides.map((s) => [s.id, s]))
  const next: Slide[] = []
  for (const sid of ids) {
    const s = map.get(sid)
    if (s) {
      next.push(s)
      map.delete(sid)
    }
  }
  // Append any slides not mentioned in the order (keeps data safe).
  for (const s of artifact.slides) if (map.has(s.id)) next.push(s)
  artifact.slides = next
  return saveArtifact(workspaceId, artifact, 'Reorder slides')
}

export async function moveSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
  toIndex: number,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  mustBeDeck(artifact)
  const from = artifact.slides.findIndex((s) => s.id === slideId)
  if (from === -1)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  const [s] = artifact.slides.splice(from, 1)
  const at = Math.max(0, Math.min(toIndex, artifact.slides.length))
  artifact.slides.splice(at, 0, s)
  return saveArtifact(workspaceId, artifact, 'Move slide')
}

// ---- Publish bookkeeping -------------------------------------------------

export async function requestPublish(
  workspaceId: string | undefined,
  id: string,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  if (artifact.kind === 'deck' && artifact.slides.length === 0)
    throw new OperationError('empty_deck', 'Add a slide before publishing.')
  if (artifact.kind === 'page' && !artifact.page?.html.trim())
    throw new OperationError(
      'empty_page',
      'Add page content before publishing.',
    )
  artifact.publishPending = true
  artifact.publishError = null
  return saveArtifactRaw(workspaceId, artifact)
}

export async function applyPublishResult(
  workspaceId: string | undefined,
  id: string,
  info: PublishedInfo,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  artifact.published = info
  artifact.publishPending = false
  artifact.publishError = null
  return saveArtifactRaw(workspaceId, artifact)
}

export async function failPublish(
  workspaceId: string | undefined,
  id: string,
  message: string,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  artifact.publishPending = false
  artifact.publishError = message
  return saveArtifactRaw(workspaceId, artifact)
}

export async function unpublish(
  workspaceId: string | undefined,
  id: string,
): Promise<Artifact> {
  const artifact = await mustGet(workspaceId, id)
  artifact.published = null
  artifact.publishPending = false
  artifact.publishError = null
  return saveArtifactRaw(workspaceId, artifact)
}

// ---- Version revert ------------------------------------------------------

/**
 * Restore an artifact to a previous version. The current state is snapshotted
 * first (label "Before revert") so the revert is itself undoable. Publish state
 * is preserved — reverting content does not un-publish a live link.
 */
export async function revertArtifact(
  workspaceId: string | undefined,
  id: string,
  versionId: string,
): Promise<Artifact> {
  const current = await mustGet(workspaceId, id)
  const snapshot = await getVersionArtifact(workspaceId, id, versionId)
  if (!snapshot) {
    throw new OperationError(
      'version_not_found',
      `No version: ${versionId}`,
      404,
    )
  }
  await snapshotArtifact(workspaceId, current, 'Before revert')
  const restored: Artifact = {
    ...snapshot,
    id: current.id,
    published: current.published,
    publishPending: current.publishPending,
    publishError: current.publishError,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  }
  return saveArtifactRaw(workspaceId, restored)
}

// Re-export so callers (RPC layer) can build an empty theme if needed.
export { emptyTheme }
