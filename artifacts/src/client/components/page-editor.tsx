import {
  ChevronDown,
  Copy,
  Image as ImageIcon,
  Loader2,
  Maximize,
  MessageSquarePlus,
  Monitor,
  Palette,
  RotateCcw,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Api } from '../lib/api'
import { Button } from '../lib/moldable-ui'
import {
  IMAGE_PRESETS,
  composeImagePrompt,
  defaultImageStyle,
  getImagePreset,
  getTemplate,
  presetImageStyle,
} from '../../shared/templates'
import type { Artifact } from '../../shared/types'
import {
  HistoryPanel,
  PublishMenu,
  type PublishState,
  ToolBtn,
  postToMoldable,
} from './editor-shared'
import { PageFrame } from './page-frame'
import { TemplatePicker } from './template-picker'

interface PageEditorProps {
  artifact: Artifact
  workspaceId?: string
  api: Api
  publishState: PublishState
  onChanged: () => void
  onPublish: (id: string) => Promise<{ url: string } | void>
  onUnpublish: (id: string) => void
}

type Device = 'desktop' | 'tablet' | 'phone'
const DEVICE_WIDTH: Record<Device, number | null> = {
  desktop: null,
  tablet: 834,
  phone: 390,
}

export function PageEditor({
  artifact,
  workspaceId,
  api,
  publishState,
  onChanged,
  onPublish,
  onUnpublish,
}: PageEditorProps) {
  const [title, setTitle] = useState(artifact.title)
  const [device, setDevice] = useState<Device>('desktop')
  const [fullscreen, setFullscreen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [stylePickerOpen, setStylePickerOpen] = useState(false)
  const [applyingStyle, setApplyingStyle] = useState(false)

  const template = getTemplate(artifact.templateId)
  const canPublish = Boolean(artifact.page?.html?.trim())

  useEffect(() => setTitle(artifact.title), [artifact.title])

  const commitTitle = async () => {
    const next = title.trim()
    if (!next || next === artifact.title) {
      setTitle(artifact.title)
      return
    }
    await api.updateArtifact(artifact.id, { title: next })
    onChanged()
  }

  const applyStyle = async (templateId: string | null) => {
    if (!templateId) {
      setStylePickerOpen(false)
      return
    }
    setApplyingStyle(true)
    try {
      await api.applyTemplate(artifact.id, templateId)
      onChanged()
    } finally {
      setApplyingStyle(false)
      setStylePickerOpen(false)
    }
  }

  const width = DEVICE_WIDTH[device]

  return (
    <div className="bg-background flex h-screen flex-col pb-[var(--chat-safe-padding)]">
      {/* Top bar — names the open artifact (scope), not the app. */}
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
          <div className="border-border bg-muted/40 flex items-center gap-0.5 rounded-full border p-1">
            <ToolBtn
              label={
                template ? `Template: ${template.name}` : 'Choose a template'
              }
              onClick={() => setStylePickerOpen(true)}
            >
              <Palette className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Edit in chat"
              onClick={() =>
                postToMoldable({
                  type: 'moldable:set-chat-input',
                  text: `Edit the "${artifact.title}" page: `,
                })
              }
            >
              <MessageSquarePlus className="size-4" />
            </ToolBtn>
            <ToolBtn
              label="Assets (images)"
              onClick={() => setAssetsOpen(true)}
            >
              <ImageIcon className="size-4" />
            </ToolBtn>
            <HistoryButton onClick={() => setHistoryOpen(true)} />
            <PublishMenu
              artifact={artifact}
              api={api}
              canPublish={canPublish}
              publishState={publishState}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
            />
          </div>

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            title="Preview full screen"
            className="bg-primary text-primary-foreground inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90"
          >
            <Maximize className="size-4" /> Preview
          </button>
        </div>
      </header>

      {publishState.error ? (
        <div className="bg-destructive/10 text-destructive border-destructive/20 border-b px-4 py-2 text-xs">
          {publishState.error}
        </div>
      ) : null}

      {/* Device sub-bar */}
      <div className="border-border bg-muted/20 flex items-center justify-center gap-1 border-b py-1.5">
        <DeviceTab
          label="Desktop"
          active={device === 'desktop'}
          onClick={() => setDevice('desktop')}
          icon={<Monitor className="size-3.5" />}
        />
        <DeviceTab
          label="Tablet"
          active={device === 'tablet'}
          onClick={() => setDevice('tablet')}
          icon={<Tablet className="size-3.5" />}
        />
        <DeviceTab
          label="Phone"
          active={device === 'phone'}
          onClick={() => setDevice('phone')}
          icon={<Smartphone className="size-3.5" />}
        />
      </div>

      {/* Canvas — near full-bleed (a hair of gap so the rounded corners read). */}
      <main className="bg-muted/30 min-h-0 flex-1 overflow-y-auto p-1">
        {!canPublish ? (
          <EmptyCanvas
            title={artifact.title}
            onChat={() =>
              postToMoldable({
                type: 'moldable:set-chat-input',
                text: `Build the "${artifact.title}" page: `,
              })
            }
          />
        ) : (
          <div
            className="mx-auto h-full overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/10 transition-[max-width] duration-300"
            style={{
              maxWidth: width ? `${width}px` : '100%',
              background: artifact.page?.background ?? '#fff',
            }}
          >
            <PageFrame
              workspaceId={workspaceId}
              artifactId={artifact.id}
              version={artifact.updatedAt}
              className="h-full w-full border-0"
              title="Page canvas"
            />
          </div>
        )}
      </main>

      {stylePickerOpen ? (
        <TemplatePicker
          title="Change template"
          confirmLabel="Use template"
          currentTemplateId={artifact.templateId}
          busy={applyingStyle}
          onPick={applyStyle}
          onClose={() => setStylePickerOpen(false)}
        />
      ) : null}

      {historyOpen ? (
        <HistoryPanel
          artifact={artifact}
          api={api}
          onClose={() => setHistoryOpen(false)}
          onReverted={() => {
            setHistoryOpen(false)
            onChanged()
          }}
        />
      ) : null}

      {assetsOpen ? (
        <PageAssetsPanel
          artifact={artifact}
          api={api}
          workspaceId={workspaceId}
          onClose={() => setAssetsOpen(false)}
          onChanged={onChanged}
        />
      ) : null}

      {fullscreen ? (
        <PagePresentOverlay
          workspaceId={workspaceId}
          artifactId={artifact.id}
          version={artifact.updatedAt}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </div>
  )
}

function HistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <ToolBtn label="Version history" onClick={onClick}>
      <RotateCcw className="size-4" />
    </ToolBtn>
  )
}

function DeviceTab({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EmptyCanvas({ title, onChat }: { title: string; onChat: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">🎨</div>
      <div>
        <p className="text-foreground font-medium">This page is empty</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask the assistant to build “{title}” — a dashboard, landing page,
          spec, chart, game, or anything else.
        </p>
      </div>
      <Button onClick={onChat} className="cursor-pointer">
        <MessageSquarePlus className="size-4" /> Build in chat
      </Button>
    </div>
  )
}

// Fullscreen, scrollable live preview.
function PagePresentOverlay({
  workspaceId,
  artifactId,
  version,
  onClose,
}: {
  workspaceId?: string
  artifactId: string
  version: string | number
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <PageFrame
        workspaceId={workspaceId}
        artifactId={artifactId}
        version={version}
        className="h-full w-full border-0"
        title="Page preview"
      />
      <button
        onClick={onClose}
        title="Exit (Esc)"
        className="absolute right-4 top-4 cursor-pointer rounded-full bg-black/45 p-2.5 text-white ring-1 ring-white/15 backdrop-blur-md hover:bg-black/65"
      >
        <X className="size-5" />
      </button>
    </div>
  )
}

// Right-side Assets drawer for pages: generate, browse, remix, and copy the
// `assets/<file>` reference to drop into chat (or the page CSS/HTML).
function PageAssetsPanel({
  artifact,
  api,
  workspaceId,
  onClose,
  onChanged,
}: {
  artifact: Artifact
  api: Api
  workspaceId?: string
  onClose: () => void
  onChanged: () => void
}) {
  const template = getTemplate(artifact.templateId)
  const [images, setImages] = useState<{ fileName: string; path: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [style, setStyle] = useState(
    artifact.imageStyle ?? defaultImageStyle(template),
  )
  const [activePreset, setActivePreset] = useState<string | null>(
    artifact.imagePresetId ??
      (getImagePreset(artifact.templateId)
        ? (artifact.templateId ?? null)
        : null),
  )
  const [subject, setSubject] = useState('')
  const [size, setSize] = useState<'landscape' | 'portrait' | 'square'>(
    'landscape',
  )
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [styleFromImage, setStyleFromImage] = useState<string | null>(null)
  const [tab, setTab] = useState<'generate' | 'images'>('generate')
  const [styleOpen, setStyleOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .listImages(artifact.id)
      .then((list) => active && setImages(list))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [api, artifact.id])

  useEffect(() => {
    if (!justAdded) return
    const t = setTimeout(() => setJustAdded(null), 5000)
    return () => clearTimeout(t)
  }, [justAdded])

  const assetUrl = (fileName: string) =>
    `/api/preview/${encodeURIComponent(workspaceId || 'default')}/${encodeURIComponent(artifact.id)}/assets/${encodeURIComponent(fileName)}`

  const refresh = async () => {
    try {
      setImages(await api.listImages(artifact.id))
    } catch {
      // ignore
    }
  }

  const pickPreset = (id: string) => {
    const preset = getImagePreset(id)
    if (!preset) return
    const next = activePreset === id ? null : id
    setActivePreset(next)
    const recipe = next ? presetImageStyle(preset) : defaultImageStyle(template)
    setStyle(recipe)
    void api.setImageStyle(artifact.id, { style: recipe, presetId: next ?? '' })
  }

  const generate = async () => {
    if (!subject.trim() || busy) return
    setBusy('gen')
    setError(null)
    try {
      const prompt = composeImagePrompt(style, subject)
      const res = styleFromImage
        ? await api.editImage(artifact.id, {
            source: styleFromImage,
            prompt,
            size,
          })
        : await api.generateImage(artifact.id, {
            prompt,
            size,
            styleRef: getImagePreset(activePreset ?? undefined)?.preview,
          })
      setSubject('')
      await refresh()
      setJustAdded(res.fileName)
      setTab('images')
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image generation failed.')
    } finally {
      setBusy(null)
    }
  }

  const copyRef = async (fileName: string) => {
    try {
      await navigator.clipboard.writeText(`assets/${fileName}`)
      setCopied(fileName)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // ignore
    }
  }

  const activePresetObj = getImagePreset(activePreset ?? undefined)
  const orderedImages = justAdded
    ? [
        ...images.filter((i) => i.fileName === justAdded),
        ...images.filter((i) => i.fileName !== justAdded),
      ]
    : images

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
                      title="Cancel"
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
                      <div className="border-border mt-2 grid grid-cols-3 gap-1.5 rounded-lg border p-2">
                        {IMAGE_PRESETS.map((p) => (
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
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

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
                <div className="text-muted-foreground mt-2.5 text-[11px]">
                  {busy === 'gen'
                    ? 'Generating — this can take up to a minute…'
                    : 'Generated images are saved as assets/<file>. Reference them in chat.'}
                </div>
              </div>
            </>
          ) : (
            <>
              {!loading && images.length === 0 ? (
                <div className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
                  No images yet — generate one above.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {orderedImages.map((img) => {
                    const isNew = justAdded === img.fileName
                    return (
                      <div
                        key={img.fileName}
                        className={`overflow-hidden rounded-lg border ${
                          isNew
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-border'
                        }`}
                      >
                        <button
                          onClick={() => setPreview(img.fileName)}
                          className="bg-muted relative block aspect-[4/3] w-full cursor-zoom-in"
                          title="Preview larger"
                        >
                          <img
                            src={assetUrl(img.fileName)}
                            alt={img.fileName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {isNew ? (
                            <span className="absolute right-1.5 top-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow">
                              New
                            </span>
                          ) : null}
                        </button>
                        <div className="flex gap-1 p-1.5">
                          <button
                            onClick={() => copyRef(img.fileName)}
                            title="Copy assets/ reference"
                            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors"
                          >
                            <Copy className="size-3" />
                            {copied === img.fileName ? 'Copied' : 'Copy ref'}
                          </button>
                          <button
                            onClick={() => {
                              setStyleFromImage(img.fileName)
                              setStyleOpen(false)
                              setTab('generate')
                            }}
                            title="Remix — generate a new image in this one's style"
                            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors"
                          >
                            <RotateCcw className="size-3" />
                            Remix
                          </button>
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
          <div className="text-xs text-white/70">assets/{preview}</div>
        </div>
      ) : null}
    </div>
  )
}
