// Deck/slide mutations shared by the REST routes and the /api/moldable/rpc
// dispatcher. All validation/coercion lives here so chat (RPC) and the UI (REST)
// behave identically.
import { getTemplate, templateTheme } from '../shared/templates'
import type {
  Deck,
  DeckTheme,
  PublishedInfo,
  Slide,
  SlideTransition,
} from '../shared/types'
import {
  copyTemplateAssets,
  deleteDeck,
  getDeck,
  getVersionDeck,
  newDeckId,
  newSlideId,
  nowIso,
  saveDeck,
  saveDeckRaw,
  snapshotDeck,
} from './store'

const EMPTY_THEME: DeckTheme = { fontLinks: [], css: '', stageBg: undefined }

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
): Promise<Deck> {
  const deck = await getDeck(workspaceId, id)
  if (!deck) throw new OperationError('deck_not_found', `No deck: ${id}`, 404)
  return deck
}

// ---- Deck-level ----------------------------------------------------------

export async function createDeck(
  workspaceId: string | undefined,
  input: unknown,
): Promise<Deck> {
  const v = (input ?? {}) as Record<string, unknown>
  const now = nowIso()
  const template = getTemplate(str(v.templateId))

  // Explicit slides/theme win; otherwise fall back to the template's.
  const explicitSlides = Array.isArray(v.slides)
    ? v.slides.map(coerceSlide)
    : null
  const slides =
    explicitSlides ?? (template ? cloneSampleSlides(template.sampleSlides) : [])
  const theme = v.theme
    ? coerceTheme(v.theme, EMPTY_THEME)
    : template
      ? templateTheme(template)
      : EMPTY_THEME

  const deck: Deck = {
    id: newDeckId(),
    title: str(v.title) || 'Untitled deck',
    subtitle: str(v.subtitle) ?? '',
    density: v.density === 'high' ? 'high' : 'low',
    templateId: template?.id,
    theme,
    slides,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: now,
    updatedAt: now,
  }
  const saved = await saveDeck(workspaceId, deck)
  if (template?.assets?.length) {
    await copyTemplateAssets(workspaceId, saved.id, template.assets)
  }
  return saved
}

/**
 * Switch a deck to a library template: applies its theme tokens (which re-skins
 * any slides built from the shared component vocabulary) and, if the deck is
 * empty, seeds the template's sample slides.
 */
export async function applyTemplate(
  workspaceId: string | undefined,
  id: string,
  templateId: string,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const template = getTemplate(templateId)
  if (!template) {
    throw new OperationError(
      'template_not_found',
      `No template: ${templateId}`,
      404,
    )
  }
  const next: Deck = {
    ...deck,
    templateId: template.id,
    theme: templateTheme(template),
    slides:
      deck.slides.length === 0
        ? cloneSampleSlides(template.sampleSlides)
        : deck.slides,
  }
  const saved = await saveDeck(workspaceId, next, 'Change template')
  if (template.assets?.length) {
    await copyTemplateAssets(workspaceId, saved.id, template.assets)
  }
  return saved
}

export async function updateDeck(
  workspaceId: string | undefined,
  id: string,
  patch: unknown,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const v = (patch ?? {}) as Record<string, unknown>
  const next: Deck = {
    ...deck,
    title: str(v.title) ?? deck.title,
    subtitle: str(v.subtitle) ?? deck.subtitle,
    density:
      v.density === 'high'
        ? 'high'
        : v.density === 'low'
          ? 'low'
          : deck.density,
    imageStyle:
      'imageStyle' in v ? (str(v.imageStyle) ?? undefined) : deck.imageStyle,
    theme: coerceTheme(v.theme, deck.theme),
  }
  return saveDeck(workspaceId, next, 'Edit deck')
}

/**
 * Persist the deck's image-style recipe WITHOUT bumping updatedAt (it doesn't
 * affect rendered/published output), so saving it from the Assets panel never
 * reloads the live canvas or flags unpublished changes.
 */
export async function setImageStyle(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const v = (input ?? {}) as Record<string, unknown>
  if ('style' in v) deck.imageStyle = str(v.style)?.trim() || undefined
  if ('presetId' in v) deck.imagePresetId = str(v.presetId)?.trim() || undefined
  return saveDeckRaw(workspaceId, deck)
}

/** Replace the entire deck content (title/subtitle/density/theme/slides). */
export async function replaceDeck(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const v = (input ?? {}) as Record<string, unknown>
  const next: Deck = {
    ...deck,
    title: str(v.title) ?? deck.title,
    subtitle: str(v.subtitle) ?? deck.subtitle,
    density:
      v.density === 'high'
        ? 'high'
        : v.density === 'low'
          ? 'low'
          : deck.density,
    theme: coerceTheme(v.theme, deck.theme),
    slides: Array.isArray(v.slides) ? v.slides.map(coerceSlide) : deck.slides,
  }
  return saveDeck(workspaceId, next, 'Replace deck')
}

export async function removeDeck(
  workspaceId: string | undefined,
  id: string,
): Promise<void> {
  const ok = await deleteDeck(workspaceId, id)
  if (!ok) throw new OperationError('deck_not_found', `No deck: ${id}`, 404)
}

// ---- Slide-level ---------------------------------------------------------

export async function addSlide(
  workspaceId: string | undefined,
  id: string,
  input: unknown,
  index?: number,
): Promise<{ deck: Deck; slide: Slide }> {
  const deck = await mustGet(workspaceId, id)
  const slide = coerceSlide(input)
  slide.id = newSlideId() // always fresh on add
  const at =
    typeof index === 'number' && index >= 0 && index <= deck.slides.length
      ? index
      : deck.slides.length
  deck.slides.splice(at, 0, slide)
  const saved = await saveDeck(workspaceId, deck, 'Add slide')
  return { deck: saved, slide }
}

export async function updateSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
  patch: unknown,
): Promise<{ deck: Deck; slide: Slide }> {
  const deck = await mustGet(workspaceId, id)
  const idx = deck.slides.findIndex((s) => s.id === slideId)
  if (idx === -1)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  const v = (patch ?? {}) as Record<string, unknown>
  const current = deck.slides[idx]
  const next: Slide = {
    ...current,
    name: str(v.name) ?? current.name,
    bodyHtml: str(v.bodyHtml) ?? current.bodyHtml,
    slideClass:
      'slideClass' in v ? (str(v.slideClass) ?? undefined) : current.slideClass,
    transition: coerceTransition(v.transition) ?? current.transition,
    notes: 'notes' in v ? (str(v.notes) ?? undefined) : current.notes,
  }
  deck.slides[idx] = next
  const saved = await saveDeck(workspaceId, deck, 'Edit slide')
  return { deck: saved, slide: next }
}

export async function removeSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const before = deck.slides.length
  deck.slides = deck.slides.filter((s) => s.id !== slideId)
  if (deck.slides.length === before)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  return saveDeck(workspaceId, deck, 'Remove slide')
}

export async function reorderSlides(
  workspaceId: string | undefined,
  id: string,
  order: unknown,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  if (!Array.isArray(order))
    throw new OperationError('bad_order', 'order must be an array of slide ids')
  const ids = order.filter((x): x is string => typeof x === 'string')
  const map = new Map(deck.slides.map((s) => [s.id, s]))
  const next: Slide[] = []
  for (const sid of ids) {
    const s = map.get(sid)
    if (s) {
      next.push(s)
      map.delete(sid)
    }
  }
  // Append any slides not mentioned in the order (keeps data safe).
  for (const s of deck.slides) if (map.has(s.id)) next.push(s)
  deck.slides = next
  return saveDeck(workspaceId, deck, 'Reorder slides')
}

export async function moveSlide(
  workspaceId: string | undefined,
  id: string,
  slideId: string,
  toIndex: number,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  const from = deck.slides.findIndex((s) => s.id === slideId)
  if (from === -1)
    throw new OperationError('slide_not_found', `No slide: ${slideId}`, 404)
  const [s] = deck.slides.splice(from, 1)
  const at = Math.max(0, Math.min(toIndex, deck.slides.length))
  deck.slides.splice(at, 0, s)
  return saveDeck(workspaceId, deck, 'Move slide')
}

// ---- Publish bookkeeping -------------------------------------------------

export async function requestPublish(
  workspaceId: string | undefined,
  id: string,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  if (deck.slides.length === 0)
    throw new OperationError('empty_deck', 'Add a slide before publishing.')
  deck.publishPending = true
  deck.publishError = null
  return saveDeckRaw(workspaceId, deck)
}

export async function applyPublishResult(
  workspaceId: string | undefined,
  id: string,
  info: PublishedInfo,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  deck.published = info
  deck.publishPending = false
  deck.publishError = null
  return saveDeckRaw(workspaceId, deck)
}

export async function failPublish(
  workspaceId: string | undefined,
  id: string,
  message: string,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  deck.publishPending = false
  deck.publishError = message
  return saveDeckRaw(workspaceId, deck)
}

export async function unpublish(
  workspaceId: string | undefined,
  id: string,
): Promise<Deck> {
  const deck = await mustGet(workspaceId, id)
  deck.published = null
  deck.publishPending = false
  deck.publishError = null
  return saveDeckRaw(workspaceId, deck)
}

// ---- Version revert ------------------------------------------------------

/**
 * Restore a deck to a previous version. The current state is snapshotted first
 * (label "Before revert") so the revert is itself undoable. Publish state is
 * preserved — reverting content does not un-publish a live link.
 */
export async function revertDeck(
  workspaceId: string | undefined,
  id: string,
  versionId: string,
): Promise<Deck> {
  const current = await mustGet(workspaceId, id)
  const snapshot = await getVersionDeck(workspaceId, id, versionId)
  if (!snapshot) {
    throw new OperationError(
      'version_not_found',
      `No version: ${versionId}`,
      404,
    )
  }
  await snapshotDeck(workspaceId, current, 'Before revert')
  const restored: Deck = {
    ...snapshot,
    id: current.id,
    published: current.published,
    publishPending: current.publishPending,
    publishError: current.publishError,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  }
  return saveDeckRaw(workspaceId, restored)
}
