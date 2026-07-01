import {
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Api, VersionMeta } from '../lib/api'
import { Button } from '../lib/moldable-ui'
import {
  IMAGE_PRESETS,
  composeImagePrompt,
  defaultImageStyle,
  getImagePreset,
  getTemplate,
  presetImageStyle,
} from '../../shared/templates'
import type { Artifact, Slide } from '../../shared/types'
import { ConfirmDialog } from './confirm-dialog'
import {
  HistoryPanel,
  PublishMenu,
  type PublishState,
  ToolBtn,
  postToMoldable,
} from './editor-shared'
import { PresentOverlay } from './present-overlay'
import { SlideFrame, type SlideFramePatch } from './slide-frame'
import { TemplatePicker } from './template-picker'

interface DeckEditorProps {
  deck: Artifact
  workspaceId?: string
  api: Api
  publishState: PublishState
  onChanged: () => void
  onDeckUpdated: (deck: Artifact) => void
  onPublish: (id: string) => Promise<{ url: string } | void>
  onUnpublish: (id: string) => void
}

function assetSlideSrc(fileName: string): string {
  return `assets/${fileName}`
}

function hashString(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function slideVersion(slide: Slide): string {
  return hashString(
    [
      slide.id,
      slide.name,
      slide.bodyHtml,
      slide.slideClass ?? '',
      slide.transition ?? '',
      slide.notes ?? '',
    ].join('\u0000'),
  )
}

function findPrimaryImageSrc(bodyHtml: string): string | null {
  if (!bodyHtml.trim()) return null

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(
      `<div id="slide-body">${bodyHtml}</div>`,
      'text/html',
    )
    const selectors = [
      '.full-bleed img[src], img.bleed[src]',
      '.hero img[src], .media img[src]',
      'img[src]',
    ]

    for (const selector of selectors) {
      const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>(selector))
      for (let i = imgs.length - 1; i >= 0; i -= 1) {
        const src = imgs[i]?.getAttribute('src')?.trim()
        if (src) return src
      }
    }
  }

  const imgMatches = Array.from(
    bodyHtml.matchAll(/<img\b[^>]*\bsrc=(["'])(.*?)\1/gi),
  )
  const imgMatch = imgMatches[imgMatches.length - 1]
  if (imgMatch?.[2]?.trim()) return imgMatch[2].trim()

  const urlMatches = Array.from(
    bodyHtml.matchAll(/url\((["']?)(assets\/[^"')]+)\1\)/gi),
  )
  const urlMatch = urlMatches[urlMatches.length - 1]
  return urlMatch?.[2]?.trim() ?? null
}

function isEmptyFullBleedLayer(el: Element): boolean {
  if ((el.textContent ?? '').trim()) return false
  const children = Array.from(el.children)
  return (
    children.length > 0 &&
    children.every(
      (child) =>
        child.tagName.toLowerCase() === 'img' ||
        child.classList.contains('scrim'),
    )
  )
}

function removeStaleFullBleedLayers(root: Element, targetSrc: string) {
  const fullBleeds = Array.from(root.querySelectorAll('.full-bleed'))
  if (fullBleeds.length < 2) return

  for (const bleed of fullBleeds) {
    const img = bleed.querySelector<HTMLImageElement>('img[src]')
    const src = img?.getAttribute('src')?.trim()
    if (src === targetSrc) continue
    if (isEmptyFullBleedLayer(bleed)) bleed.remove()
  }
}

function replaceImageSrc(
  bodyHtml: string,
  currentSrc: string,
  nextSrc: string,
): string | null {
  if (!currentSrc || currentSrc === nextSrc) return null
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(
      `<div id="slide-body">${bodyHtml}</div>`,
      'text/html',
    )
    const root = doc.getElementById('slide-body')
    if (root) {
      let replaced = false
      for (const img of Array.from(
        root.querySelectorAll<HTMLImageElement>('img[src]'),
      )) {
        if (img.getAttribute('src')?.trim() === currentSrc) {
          img.setAttribute('src', nextSrc)
          replaced = true
        }
      }
      if (replaced) {
        removeStaleFullBleedLayers(root, nextSrc)
        return root.innerHTML
      }
    }
  }

  const next = bodyHtml.split(currentSrc).join(nextSrc)
  return next === bodyHtml ? null : next
}

export function DeckEditor({
  deck,
  workspaceId,
  api,
  publishState,
  onChanged,
  onDeckUpdated,
  onPublish,
  onUnpublish,
}: DeckEditorProps) {
  const [selected, setSelected] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [swapTarget, setSwapTarget] = useState<{
    slideId: string
    src: string
  } | null>(null)
  const [stylePickerOpen, setStylePickerOpen] = useState(false)
  const [applyingStyle, setApplyingStyle] = useState(false)
  const [confirmDeleteSlideId, setConfirmDeleteSlideId] = useState<
    string | null
  >(null)
  const [title, setTitle] = useState(deck.title)
  const [busy, setBusy] = useState(false)
  const [canvasVersion, setCanvasVersion] = useState(deck.updatedAt)
  const [canvasPatch, setCanvasPatch] = useState<SlideFramePatch | null>(null)
  const locallyPatchedDeckVersion = useRef<string | null>(null)

  const template = getTemplate(deck.templateId)

  const applyStyle = async (templateId: string | null) => {
    if (!templateId) {
      setStylePickerOpen(false)
      return
    }
    setApplyingStyle(true)
    try {
      await api.applyTemplate(deck.id, templateId)
      onChanged()
    } finally {
      setApplyingStyle(false)
      setStylePickerOpen(false)
    }
  }

  const slides = deck.slides
  const clampedSelected = Math.min(selected, Math.max(0, slides.length - 1))

  useEffect(() => setTitle(deck.title), [deck.title])

  useEffect(() => {
    if (locallyPatchedDeckVersion.current === deck.updatedAt) {
      locallyPatchedDeckVersion.current = null
      return
    }
    setCanvasVersion(deck.updatedAt)
  }, [deck.id, deck.updatedAt])

  const applyLocalSlideUpdate = (nextDeck: Artifact, slide: Slide) => {
    locallyPatchedDeckVersion.current = nextDeck.updatedAt
    setCanvasPatch({
      revision: `${nextDeck.updatedAt}:${slideVersion(slide)}`,
      slide,
    })
    onDeckUpdated(nextDeck)
  }

  // The editor canvas posts deck:image-click when an image is tapped — open
  // the Assets panel targeting that image so the user can swap it out.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as { type?: string; src?: string; slideIndex?: number }
      if (d?.type !== 'deck:image-click' || typeof d.src !== 'string') return
      const idx = typeof d.slideIndex === 'number' ? d.slideIndex : 0
      const slide = slides[idx]
      if (!slide) return
      setSelected(idx)
      setSwapTarget({ slideId: slide.id, src: d.src })
      setAssetsOpen(true)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [slides])

  // Drive the deck from the app shell so arrow/space/Home/End work even when the
  // preview iframe isn't focused. When focus IS inside the iframe (tag IFRAME),
  // its own controller handles the keys and reports back via deck:slide.
  useEffect(() => {
    if (presenting) return
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const tag = el?.tagName
      if (
        el?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'IFRAME'
      ) {
        return
      }
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          setSelected((i) => Math.min(i + 1, slides.length - 1))
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          setSelected((i) => Math.max(i - 1, 0))
          break
        case 'Home':
          e.preventDefault()
          setSelected(0)
          break
        case 'End':
          e.preventDefault()
          setSelected(slides.length - 1)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presenting, slides.length])

  // The chat system-prompt context (deck + its style coding guide) is set
  // centrally in App so it stays correct across grid/editor transitions.

  const commitTitle = async () => {
    const next = title.trim()
    if (!next || next === deck.title) {
      setTitle(deck.title)
      return
    }
    await api.updateArtifact(deck.id, { title: next })
    onChanged()
  }

  const withBusy = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const addSlide = () =>
    withBusy(async () => {
      const { slide } = await api.addSlide(
        deck.id,
        {
          name: 'New slide',
          transition: 'fade',
          bodyHtml:
            '<div style="display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;gap:24px;font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a;background:#fff;text-align:center;padding:120px">' +
            '<h2 class="reveal" style="font-size:88px;font-weight:700;letter-spacing:-0.02em">New slide</h2>' +
            '<p class="reveal" style="font-size:34px;color:#64748b;max-width:1100px">Ask the assistant in chat to fill this in.</p></div>',
        },
        clampedSelected + 1,
      )
      const idx = deck.slides.findIndex((s) => s.id === slide.id)
      setSelected(idx >= 0 ? idx : clampedSelected + 1)
    })

  const removeSlide = (slideId: string) =>
    withBusy(() => api.removeSlide(deck.id, slideId))

  const moveSlide = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= slides.length) return
    setSelected(target)
    return withBusy(() => api.move(deck.id, slides[index].id, target))
  }

  return (
    <div className="bg-background flex h-screen flex-col pb-[var(--chat-safe-padding)]">
      {/* Top bar — names the open deck (scope), not the app. The host titlebar
          shows the app name and the back affordance. */}
      <header className="border-border flex items-center gap-3 border-b px-4 py-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="min-w-0 flex-1 truncate bg-transparent text-base font-semibold outline-none"
          aria-label="Artifact title"
        />

        <div className="flex shrink-0 items-center gap-2">
          {/* Grouped secondary actions — icon-only with tooltips, mirroring the
              Redecorate detail bar. */}
          <div className="border-border bg-muted/40 flex items-center gap-0.5 rounded-full border p-1">
            <ToolBtn
              label={template ? `Style: ${template.name}` : 'Choose a style'}
              onClick={() => setStylePickerOpen(true)}
            >
              <Palette className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Edit in chat"
              onClick={() =>
                postToMoldable({
                  type: 'moldable:set-chat-input',
                  text: `Edit the "${deck.title}" slide deck: `,
                })
              }
            >
              <MessageSquarePlus className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Version history"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Assets (images)"
              onClick={() => setAssetsOpen(true)}
            >
              <ImageIcon className="size-4" />
            </ToolBtn>
            <PublishMenu
              artifact={deck}
              api={api}
              canPublish={slides.length > 0}
              publishState={publishState}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
            />
          </div>

          {/* Primary action */}
          <button
            type="button"
            disabled={slides.length === 0}
            onClick={() => setPresenting(true)}
            title="Present full screen"
            className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
          >
            <Play className="size-4" /> Present
          </button>
        </div>
      </header>

      {publishState.error ? (
        <div className="bg-destructive/10 text-destructive border-destructive/20 border-b px-4 py-2 text-xs">
          {publishState.error}
        </div>
      ) : null}

      {/* Body: rail + canvas */}
      <div className="flex min-h-0 flex-1">
        <aside className="border-border bg-muted/30 w-56 shrink-0 overflow-y-auto border-r p-3">
          <div className="space-y-2">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={`group relative overflow-hidden rounded-lg border transition-all ${
                  i === clampedSelected
                    ? 'border-primary ring-primary/30 ring-2'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <button
                  onClick={() => setSelected(i)}
                  className="block w-full cursor-pointer text-left"
                >
                  <div className="bg-card relative aspect-[16/9] w-full">
                    <SlideFrame
                      workspaceId={workspaceId}
                      deckId={deck.id}
                      version={slideVersion(slide)}
                      active={i}
                      thumb
                      className="pointer-events-none h-full w-full border-0"
                      title={`Slide ${i + 1}`}
                    />
                    <span className="bg-background/80 text-foreground absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                      {i + 1}
                    </span>
                  </div>
                  <div className="text-foreground truncate px-2 py-1.5 text-xs font-medium">
                    {slide.name}
                  </div>
                </button>
                <div className="absolute right-1 top-1 hidden gap-0.5 group-hover:flex">
                  <RailIconButton
                    title="Move up"
                    disabled={i === 0 || busy}
                    onClick={() => moveSlide(i, -1)}
                  >
                    <ChevronUp className="size-3.5" />
                  </RailIconButton>
                  <RailIconButton
                    title="Move down"
                    disabled={i === slides.length - 1 || busy}
                    onClick={() => moveSlide(i, 1)}
                  >
                    <ChevronDown className="size-3.5" />
                  </RailIconButton>
                  <RailIconButton
                    title="Delete slide"
                    disabled={busy}
                    onClick={() => setConfirmDeleteSlideId(slide.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </RailIconButton>
                </div>
              </div>
            ))}

            <button
              onClick={addSlide}
              disabled={busy}
              className="border-border text-muted-foreground hover:border-primary/50 hover:text-foreground flex aspect-[16/9] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs transition-colors"
            >
              <Plus className="size-4" /> Add slide
            </button>
          </div>
        </aside>

        <main className="bg-muted/20 relative min-w-0 flex-1 p-6">
          {slides.length === 0 ? (
            <EmptyCanvas
              onAdd={addSlide}
              onChat={() =>
                postToMoldable({
                  type: 'moldable:set-chat-input',
                  text: `Add slides to the "${deck.title}" deck: `,
                })
              }
            />
          ) : (
            <div className="ring-border mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-2xl ring-1">
              <SlideFrame
                workspaceId={workspaceId}
                deckId={deck.id}
                version={canvasVersion}
                active={clampedSelected}
                interactive
                edit
                slidePatch={canvasPatch}
                onSlideChange={setSelected}
                className="h-full w-full border-0"
                title="Artifact canvas"
              />
            </div>
          )}
          {slides.length > 0 ? (
            <div className="text-muted-foreground mt-3 flex items-center justify-center gap-3 text-xs">
              <span className="tabular-nums">
                Slide {clampedSelected + 1} of {slides.length}
              </span>
              <span aria-hidden>·</span>
              <button
                className="hover:text-foreground inline-flex cursor-pointer items-center gap-1"
                onClick={() =>
                  postToMoldable({
                    type: 'moldable:set-chat-input',
                    text: `Generate an AI image for slide ${clampedSelected + 1} of the "${deck.title}" deck: `,
                  })
                }
              >
                <ImageIcon className="size-3.5" /> Add image
              </button>
            </div>
          ) : null}
        </main>
      </div>

      <ConfirmDialog
        open={confirmDeleteSlideId !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteSlideId(null)
        }}
        title="Delete this slide?"
        description="You can restore it later from version history."
        confirmLabel="Delete slide"
        destructive
        onConfirm={() => {
          const id = confirmDeleteSlideId
          setConfirmDeleteSlideId(null)
          if (id) void removeSlide(id)
        }}
      />

      {stylePickerOpen ? (
        <TemplatePicker
          title="Change deck style"
          confirmLabel="Apply style"
          currentTemplateId={deck.templateId}
          busy={applyingStyle}
          onPick={applyStyle}
          onClose={() => setStylePickerOpen(false)}
        />
      ) : null}

      {historyOpen ? (
        <HistoryPanel
          artifact={deck}
          api={api}
          onClose={() => setHistoryOpen(false)}
          onReverted={() => {
            setHistoryOpen(false)
            onChanged()
          }}
        />
      ) : null}

      {assetsOpen ? (
        <AssetsPanel
          deck={deck}
          api={api}
          workspaceId={workspaceId}
          selectedIndex={clampedSelected}
          swapTarget={swapTarget}
          onSwapDone={() => setSwapTarget(null)}
          onClose={() => {
            setAssetsOpen(false)
            setSwapTarget(null)
          }}
          onChanged={onChanged}
          onSlideUpdated={applyLocalSlideUpdate}
        />
      ) : null}

      {presenting ? (
        <PresentOverlay
          workspaceId={workspaceId}
          deckId={deck.id}
          version={deck.updatedAt}
          startIndex={clampedSelected}
          onClose={() => setPresenting(false)}
        />
      ) : null}
    </div>
  )
}

function RailIconButton({
  children,
  title,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  title: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="bg-background/90 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 shadow disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function EmptyCanvas({
  onAdd,
  onChat,
}: {
  onAdd: () => void
  onChat: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">🎞️</div>
      <div>
        <p className="text-foreground font-medium">This deck is empty</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask the assistant to generate slides, or add one manually.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onChat} className="cursor-pointer">
          <MessageSquarePlus className="size-4" /> Generate in chat
        </Button>
        <Button onClick={onAdd} variant="outline" className="cursor-pointer">
          <Plus className="size-4" /> Add blank slide
        </Button>
      </div>
    </div>
  )
}

// Right-side Assets drawer: generate / remix / preview deck images and drop one
// onto a slide. Generation runs as a direct client fetch (long timeout), so it
// no longer dies on the host chat→RPC bridge timeout. Style coherence: the deck's
// editable "image style" recipe is prepended to every prompt, and Remix riffs on
// an existing image (image-to-image) so it inherits the exact look.
function AssetsPanel({
  deck,
  api,
  workspaceId,
  selectedIndex,
  swapTarget,
  onSwapDone,
  onClose,
  onChanged,
  onSlideUpdated,
}: {
  deck: Artifact
  api: Api
  workspaceId?: string
  selectedIndex: number
  swapTarget?: { slideId: string; src: string } | null
  onSwapDone: () => void
  onClose: () => void
  onChanged: () => void
  onSlideUpdated: (deck: Artifact, slide: Slide) => void
}) {
  const template = getTemplate(deck.templateId)
  const [images, setImages] = useState<{ fileName: string; path: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [style, setStyle] = useState(
    deck.imageStyle ?? defaultImageStyle(template),
  )
  // Default to the deck's OWN template style; persisted choice (imagePresetId) wins.
  const [activePreset, setActivePreset] = useState<string | null>(
    deck.imagePresetId ??
      (getImagePreset(deck.templateId) ? (deck.templateId ?? null) : null),
  )
  const [subject, setSubject] = useState('')
  const [size, setSize] = useState<'landscape' | 'portrait' | 'square'>(
    'landscape',
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // Ephemeral "style from image": an existing asset used as the generation
  // reference (set by Remix). Not a saved/selectable preset.
  const [styleFromImage, setStyleFromImage] = useState<string | null>(null)
  const [tab, setTab] = useState<'generate' | 'images'>(
    swapTarget ? 'images' : 'generate',
  )
  const [styleOpen, setStyleOpen] = useState(false)
  const [styleQuery, setStyleQuery] = useState('')
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // Briefly highlight a freshly generated/remixed image.
  useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(null), 5000)
    return () => clearTimeout(t)
  }, [justAdded])

  // Clicking a slide image (swap mode) is about existing assets → Images tab.
  useEffect(() => {
    if (swapTarget) setTab('images')
  }, [swapTarget])

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .listImages(deck.id)
      .then((list) => active && setImages(list))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [api, deck.id])

  // Esc closes the larger image preview (capture + stop so it doesn't bubble
  // to other Escape handlers).
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setPreview(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [preview])

  const refresh = async () => {
    try {
      setImages(await api.listImages(deck.id))
    } catch {
      // ignore
    }
  }

  const assetUrl = (fileName: string) =>
    `/api/preview/${encodeURIComponent(workspaceId || 'default')}/${encodeURIComponent(deck.id)}/assets/${encodeURIComponent(fileName)}`

  const selectedSlide = deck.slides[selectedIndex]
  const swapSlide = swapTarget
    ? deck.slides.find((s) => s.id === swapTarget.slideId)
    : null
  const targetSlide = swapSlide ?? selectedSlide
  const targetImageSrc =
    swapTarget?.src ?? findPrimaryImageSrc(targetSlide?.bodyHtml ?? '')
  const hasReplaceTarget = !!targetImageSrc

  const saveStyle = (value: string) => {
    const next = value.trim()
    if (next && next !== (deck.imageStyle ?? defaultImageStyle(template))) {
      // Non-bumping save — doesn't reload the live canvas or flag dirty.
      void api.setImageStyle(deck.id, { style: next })
    }
  }

  const pickPreset = (id: string) => {
    const preset = getImagePreset(id)
    if (!preset) return
    const next = activePreset === id ? null : id
    setActivePreset(next)
    const recipe = next ? presetImageStyle(preset) : defaultImageStyle(template)
    setStyle(recipe)
    // Persist both the recipe and which preset is active (non-bumping).
    void api.setImageStyle(deck.id, { style: recipe, presetId: next ?? '' })
  }

  const generate = async () => {
    if (!subject.trim() || busy) return
    setBusy('gen')
    setError(null)
    try {
      const prompt = composeImagePrompt(style, subject)
      // Style from an existing image → image-to-image off it; otherwise the
      // active preset's reference cover, or plain text-to-image.
      const res = styleFromImage
        ? await api.editImage(deck.id, { source: styleFromImage, prompt, size })
        : await api.generateImage(deck.id, {
            prompt,
            size,
            styleRef: getImagePreset(activePreset ?? undefined)?.preview,
          })
      setSubject('')
      await refresh()
      // Show the result: jump to the Images tab and highlight the new image.
      setJustAdded(res.fileName)
      setTab('images')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed.')
    } finally {
      setBusy(null)
    }
  }

  // Remix = use this image as an ephemeral style reference in the Generate tab.
  const remixFrom = (fileName: string) => {
    setStyleFromImage(fileName)
    setStyleOpen(false)
    setTab('generate')
  }

  const handleUseImageOnSlide = async (fileName: string) => {
    const slide = targetSlide
    if (!slide || busy) return
    const nextSrc = assetSlideSrc(fileName)
    const currentSrc = targetImageSrc
    const mode = currentSrc ? 'swap' : 'add'
    setBusy(`${mode}:${fileName}`)
    setError(null)
    try {
      const bodyHtml = currentSrc
        ? replaceImageSrc(slide.bodyHtml, currentSrc, nextSrc)
        : null

      const result = await api.updateSlide(deck.id, slide.id, {
        bodyHtml:
          bodyHtml ??
          `<div class="full-bleed"><img class="bleed" src="${nextSrc}" alt=""><div class="scrim"></div></div>\n${slide.bodyHtml}`,
      })
      if (swapTarget) onSwapDone()
      onSlideUpdated(result.artifact, result.slide)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not use image.')
    } finally {
      setBusy(null)
    }
  }

  const slideLabel = deck.slides[selectedIndex]
    ? `slide ${selectedIndex + 1}`
    : 'the slide'

  const activePresetObj = getImagePreset(activePreset ?? undefined)

  // Show a freshly generated image first so it's immediately visible.
  const orderedImages = justAdded
    ? [
        ...images.filter((i) => i.fileName === justAdded),
        ...images.filter((i) => i.fileName !== justAdded),
      ]
    : images

  // Group the 47 styles by their template's primary category (browsable rows,
  // not one endless scroll), filtered by the style search.
  const STYLE_CAT_ORDER = [
    'Personal',
    'Marketing',
    'Business',
    'Writing',
    'Dashboards',
    'Games',
    '3D',
    'Decks',
  ]
  const styleGroups = (() => {
    const q = styleQuery.trim().toLowerCase()
    const map = new Map<string, typeof IMAGE_PRESETS>()
    for (const p of IMAGE_PRESETS) {
      if (q && !p.name.toLowerCase().includes(q)) continue
      const cat = getTemplate(p.id)?.categories?.[0] ?? 'Other'
      const arr = map.get(cat) ?? []
      arr.push(p)
      map.set(cat, arr)
    }
    return [...map.keys()]
      .sort((a, b) => {
        const ia = STYLE_CAT_ORDER.indexOf(a)
        const ib = STYLE_CAT_ORDER.indexOf(b)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })
      .map((cat) => ({ cat, items: map.get(cat)! }))
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-background border-border flex h-full w-96 flex-col border-l shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="size-4" /> Assets
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(var(--chat-safe-padding,0px)+0.75rem)]">
          {/* Tabs — separate creating new images from managing existing ones. */}
          <div className="border-border mb-3 flex rounded-lg border p-0.5 text-xs font-medium">
            {(['generate', 'images'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 cursor-pointer rounded-md px-2 py-1.5 transition-colors ${
                  tab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'images'
                  ? `Images${images.length ? ` (${images.length})` : ''}`
                  : 'Generate'}
              </button>
            ))}
          </div>

          {error ? (
            <div className="text-destructive mb-2 text-xs">{error}</div>
          ) : null}

          {tab === 'generate' ? (
            <>
              {/* Image style — active style as a card; tap to browse the grid. */}
              <div className="mb-3">
                <div className="text-muted-foreground mb-1.5 text-xs font-medium">
                  Image style
                </div>
                {styleFromImage ? (
                  <div className="border-primary/40 bg-primary/5 flex items-center gap-2 rounded-lg border p-1.5">
                    <img
                      src={assetUrl(styleFromImage)}
                      alt=""
                      className="h-10 w-16 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">
                        Style from image
                      </div>
                      <div className="text-muted-foreground truncate text-[11px]">
                        {styleFromImage}
                      </div>
                    </div>
                    <button
                      onClick={() => setStyleFromImage(null)}
                      title="Cancel — use the deck style"
                      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setStyleOpen((v) => !v)}
                      className="border-border hover:border-primary/40 flex w-full cursor-pointer items-center gap-2 rounded-lg border p-1.5 text-left transition-colors"
                    >
                      {activePresetObj ? (
                        <img
                          src={`/api/templates/preset/preview/assets/${activePresetObj.preview}`}
                          alt=""
                          className="h-10 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="bg-muted h-10 w-16 shrink-0 rounded" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">
                          {activePresetObj?.name ?? 'Custom style'}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {styleOpen ? 'Choose a style' : 'Tap to change'}
                        </div>
                      </div>
                      <ChevronDown
                        className={`text-muted-foreground size-4 shrink-0 transition-transform ${styleOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {styleOpen ? (
                      <div className="border-border mt-2 rounded-lg border p-2">
                        <input
                          value={styleQuery}
                          onChange={(e) => setStyleQuery(e.target.value)}
                          placeholder="Search styles…"
                          className="border-border bg-muted/40 placeholder:text-muted-foreground mb-2 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
                        />
                        <div className="max-h-72 overflow-y-auto pr-0.5">
                          {styleGroups.map((g) => (
                            <div key={g.cat} className="mb-2 last:mb-0">
                              <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
                                {g.cat}
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {g.items.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      pickPreset(p.id)
                                      setStyleOpen(false)
                                    }}
                                    title={p.name}
                                    className={`relative cursor-pointer overflow-hidden rounded-md border transition-all ${
                                      activePreset === p.id
                                        ? 'border-primary ring-primary/30 ring-2'
                                        : 'border-border hover:border-primary/40'
                                    }`}
                                  >
                                    <img
                                      src={`/api/templates/preset/preview/assets/${p.preview}`}
                                      alt={p.name}
                                      loading="lazy"
                                      className="aspect-[4/3] w-full object-cover"
                                    />
                                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[8px] text-white">
                                      {p.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                          {styleGroups.length === 0 ? (
                            <div className="text-muted-foreground py-4 text-center text-xs">
                              No styles match “{styleQuery}”.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Generate */}
              <div className="border-border bg-muted/20 rounded-xl border p-3">
                <textarea
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  rows={2}
                  placeholder="Describe an image to generate…"
                  className="placeholder:text-muted-foreground/70 w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="bg-muted inline-flex rounded-full p-0.5 text-[11px] font-medium">
                    {(['landscape', 'portrait', 'square'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`cursor-pointer rounded-full px-2.5 py-1 capitalize transition-colors ${
                          size === s
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!subject.trim() || busy === 'gen'}
                    onClick={generate}
                    className="bg-primary text-primary-foreground inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
                  >
                    {busy === 'gen' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ImageIcon className="size-4" />
                    )}
                    Generate
                  </button>
                </div>
                <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-[11px]">
                  {busy === 'gen' ? (
                    'Generating — this can take up to a minute…'
                  ) : styleFromImage ? (
                    'Styled from the selected image.'
                  ) : activePresetObj ? (
                    <>
                      <span>Styled as</span>
                      <span className="text-foreground font-medium">
                        {activePresetObj.name}
                      </span>
                    </>
                  ) : (
                    'Uses the deck’s image style.'
                  )}
                </div>
              </div>

              {/* Image style recipe (advanced) */}
              <div className="border-border mt-2 rounded-xl border">
                <button
                  onClick={() => setRecipeOpen((v) => !v)}
                  className="text-muted-foreground hover:text-foreground flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-medium"
                >
                  Image style recipe
                  <ChevronDown
                    className={`size-3.5 transition-transform ${recipeOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {recipeOpen ? (
                  <div className="px-3 pb-3">
                    <textarea
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      onBlur={() => saveStyle(style)}
                      rows={5}
                      placeholder="medium · palette · mood…"
                      className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 max-h-52 min-h-[5rem] w-full resize-none overflow-y-auto rounded-lg border p-2.5 text-xs leading-relaxed outline-none [field-sizing:content]"
                    />
                    <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">
                      Added to every image. With a style selected, the look
                      comes from its reference image — this just fine-tunes it.
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              {/* Replacement context */}
              {swapTarget || hasReplaceTarget ? (
                <div className="border-primary/40 bg-primary/5 mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0 text-xs">
                    <div className="font-medium">
                      Replace image on slide {selectedIndex + 1}
                    </div>
                    <div className="text-muted-foreground">
                      Tap an image to use it here, or generate a new one.
                    </div>
                  </div>
                  {swapTarget ? (
                    <button
                      onClick={onSwapDone}
                      className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!loading && images.length === 0 ? (
                <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
                  No images yet — generate one above.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {orderedImages.map((img) => {
                    const adding = busy === `add:${img.fileName}`
                    const swapping = busy === `swap:${img.fileName}`
                    const isNew = justAdded === img.fileName
                    const imageSrc = assetSlideSrc(img.fileName)
                    const isCurrent = targetImageSrc === imageSrc
                    // Consistent in both modes: tapping the cell USES the image
                    // (replace the selected slide image when one exists, otherwise
                    // set a new full-bleed background). Re-using the current image
                    // just opens the larger preview.
                    const canUse = !isCurrent
                    const usingNow = swapping || adding
                    return (
                      <div
                        key={img.fileName}
                        className={`overflow-hidden rounded-lg border ${
                          isNew
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : isCurrent
                              ? 'border-primary ring-primary/30 ring-2'
                              : 'border-border'
                        }`}
                      >
                        <button
                          onClick={() =>
                            canUse
                              ? handleUseImageOnSlide(img.fileName)
                              : setPreview(img.fileName)
                          }
                          disabled={!!busy}
                          title={
                            canUse
                              ? hasReplaceTarget
                                ? 'Use here'
                                : `Use on ${slideLabel}`
                              : 'Preview larger'
                          }
                          className={`group/thumb bg-muted relative block aspect-[4/3] w-full ${
                            canUse ? 'cursor-pointer' : 'cursor-zoom-in'
                          } disabled:opacity-60`}
                        >
                          <img
                            src={assetUrl(img.fileName)}
                            alt={img.fileName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {usingNow ? (
                            <span className="absolute inset-0 grid place-items-center bg-black/40">
                              <Loader2 className="size-5 animate-spin text-white" />
                            </span>
                          ) : null}
                          {isCurrent ? (
                            <span className="bg-primary text-primary-foreground absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold shadow">
                              Current
                            </span>
                          ) : null}
                          {isNew ? (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow">
                              New
                            </span>
                          ) : null}
                          {canUse && !usingNow ? (
                            <span className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover/thumb:bg-black/35 group-hover/thumb:opacity-100">
                              <span className="bg-background text-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold shadow">
                                {hasReplaceTarget ? 'Use here' : 'Use'}
                              </span>
                            </span>
                          ) : null}
                        </button>
                        <div className="p-1.5">
                          <div className="text-muted-foreground truncate text-[10px]">
                            {img.fileName}
                          </div>
                          <div className="mt-1 flex gap-1">
                            <button
                              onClick={() => setPreview(img.fileName)}
                              disabled={!!busy}
                              title="Preview larger"
                              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors disabled:opacity-50"
                            >
                              <Eye className="size-3" />
                              Preview
                            </button>
                            <button
                              onClick={() => remixFrom(img.fileName)}
                              disabled={!!busy}
                              title="Remix — use this image's style to generate a new one"
                              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="size-3" />
                              Remix
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Larger preview */}
      {preview ? (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/80 p-8 pb-[calc(var(--chat-safe-padding,0px)+2rem)]"
          onClick={(e) => {
            e.stopPropagation()
            setPreview(null)
          }}
        >
          <img
            src={assetUrl(preview)}
            alt={preview}
            className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="text-xs text-white/70">{preview}</div>
        </div>
      ) : null}
    </div>
  )
}

// Unified toolbar icon button — round, tooltip via native title, hover fill.
// Publish: a globe in the action cluster that opens a small panel — a publish
// toggle, the live link as an input + inline copy, and republish. Auto-copies
// the link to the clipboard the moment the deck goes live.
