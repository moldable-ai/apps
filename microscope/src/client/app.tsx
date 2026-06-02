import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Box,
  Check,
  ChevronDown,
  EllipsisVertical,
  FolderInput,
  ImageIcon,
  Info,
  Loader2,
  Plus,
  Rotate3D,
  RotateCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AppCommand,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Slider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableAppCommands,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import { parseJson } from './lib/api'
import { type SceneLighting, SceneViewer } from './components/scene-viewer'
import { CATEGORIES, SPECIMENS } from '../shared/library'
import type {
  Category,
  Exploration,
  GenerateExplorationResponse,
  GeneratedExploration,
  ImageQuality,
  LibraryResponse,
  MicroscopeSettings,
  ModelProvider,
  ModelVariant,
  Specimen,
} from '../shared/types'

type ViewKind = 'worlds' | 'world' | 'specimen'
type PromptGenerateHandler = (prompt: string, categoryId?: string) => void
type NavigationSync = 'push' | 'pop' | 'reset' | 'none'

const QUALITY_OPTIONS: Array<{
  id: MicroscopeSettings['quality']
  name: string
  description: string
}> = [
  {
    id: 'medium',
    name: 'Normal',
    description:
      'Good everyday quality. Faster, cheaper, and usually enough for quick exploration.',
  },
  {
    id: 'high',
    name: 'High',
    description:
      'Uses the higher-detail 3D mode. Slower and may cost more, but better for complex subjects.',
  },
]
const MODEL_PROVIDER_OPTIONS: Array<{
  id: ModelProvider
  name: string
  description: string
}> = [
  {
    id: 'fal',
    name: 'fal Hunyuan3D',
    description: 'Fast image-to-3D generation with solid textured results.',
  },
  {
    id: 'tripo',
    name: 'Tripo P1',
    description: 'Cleaner low-poly topology with structured mesh output.',
  },
]

const DEFAULT_SETTINGS: MicroscopeSettings = {
  modelProvider: 'fal',
  quality: 'medium',
  autoRotate: true,
}

const DEFAULT_SCENE_LIGHTING: SceneLighting = {
  brightness: 1.15,
  warmth: 0.05,
  direction: 0.2,
  height: 0.65,
}

function interleavedCategoryPrompts(): string[] {
  const maxLength = Math.max(
    ...CATEGORIES.map((category) => category.prompts.length),
  )
  const prompts: string[] = []
  for (let index = 0; index < maxLength; index += 1) {
    for (const category of CATEGORIES) {
      const prompt = category.prompts[index]
      if (prompt) prompts.push(prompt)
    }
  }
  return prompts
}

const PROMPT_SAMPLES = interleavedCategoryPrompts()

const FALLBACK_TONE =
  'linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--muted)))'
const ACTION_DOCK_BOTTOM =
  'calc(var(--microscope-action-dock-safe-padding, var(--chat-safe-padding, 0px)) + 1.25rem)'
const INSPECTOR_WIDTH = '340px'
const GENERATIONS_DOCK_BOTTOM = '0.75rem'

function sendToChatInput(text: string) {
  window.parent.postMessage({ type: 'moldable:set-chat-input', text }, '*')
}

function setChatInstructions(text: string) {
  window.parent.postMessage(
    { type: 'moldable:set-chat-instructions', text },
    '*',
  )
}

function compactScale(scale: Exploration['scale']) {
  return scale.charAt(0).toUpperCase() + scale.slice(1)
}

function preferredModelProviderFor(
  variants: ModelVariant[],
  currentProvider: ModelProvider | undefined,
  selectedProvider: ModelProvider | undefined,
) {
  const selectedVariant = variants.find(
    (variant) => variant.provider === selectedProvider,
  )
  const currentVariant = variants.find(
    (variant) => variant.provider === currentProvider,
  )
  const readyProvider =
    (selectedVariant?.status === 'ready'
      ? selectedVariant.provider
      : undefined) ??
    (currentVariant?.status === 'ready'
      ? currentVariant.provider
      : undefined) ??
    variants.find((variant) => variant.status === 'ready')?.provider

  return (
    readyProvider ??
    selectedVariant?.provider ??
    currentProvider ??
    variants[0]?.provider ??
    null
  )
}

function isGenerated(
  exploration: Exploration,
): exploration is GeneratedExploration {
  return exploration.source === 'generated'
}

function isExplorationWorking(exploration: GeneratedExploration) {
  return (
    exploration.status === 'generating' ||
    exploration.backgroundStatus === 'removing' ||
    exploration.modelStatus === 'rendering'
  )
}

function statusLabel(exploration: GeneratedExploration): string | null {
  if (exploration.status === 'generating') return 'Generating image'
  if (exploration.status === 'canceled') return 'Canceled'
  if (exploration.backgroundStatus === 'removing') return 'Removing background'
  if (
    exploration.backgroundStatus === 'failed' &&
    exploration.modelStatus !== 'failed'
  ) {
    return 'Original image'
  }
  if (exploration.modelStatus === 'rendering') return 'Rendering 3D'
  if (exploration.modelStatus === 'failed') return 'Image only'
  return null
}

function displayErrorMessage(message: string | undefined | null) {
  if (!message) return null
  if (/aivault timed out after \d+ms/i.test(message)) {
    return 'The request took too long to complete. Please try again.'
  }
  if (/fal\/image-to-3d request failed with (502|503|504)\b/i.test(message)) {
    return 'fal did not return the 3D model in time. You can keep using the 2D image or regenerate the 3D model.'
  }
  return message
}

function explorationErrorMessage(exploration: GeneratedExploration) {
  return displayErrorMessage(
    exploration.errorMessage ??
      exploration.backgroundErrorMessage ??
      exploration.modelErrorMessage,
  )
}

function categoryById(id: string, categories: Category[]) {
  return categories.find((category) => category.id === id)
}

function modelProviderName(provider: ModelProvider) {
  return (
    MODEL_PROVIDER_OPTIONS.find((option) => option.id === provider)?.name ??
    provider
  )
}

function variantLabel(variant: ModelVariant) {
  return `${modelProviderName(variant.provider)}${
    variant.modelDetail ? ` ${variant.modelDetail}` : ''
  }`
}

function explorationWithModelVariant(
  exploration: GeneratedExploration,
  variant: ModelVariant | undefined,
): GeneratedExploration {
  if (!variant) return exploration
  return {
    ...exploration,
    modelProvider: variant.provider,
    modelStatus: variant.status,
    modelTaskId: variant.taskId,
    modelFileName: variant.fileName,
    modelMaterialFileName: variant.materialFileName,
    modelTextureFileName: variant.textureFileName,
    modelUrl: variant.url ?? null,
    modelMaterialUrl: variant.materialUrl ?? null,
    modelTextureUrl: variant.textureUrl ?? null,
    modelErrorMessage: variant.errorMessage,
  }
}

function specimensInCategory(id: string, specimens: Specimen[]) {
  return specimens.filter((specimen) => specimen.categoryId === id)
}

function categoryTone(id: string, specimens: Specimen[]) {
  const first = specimensInCategory(id, specimens)[0]
  return first?.previewTone ?? FALLBACK_TONE
}

function generatedPreviewImagesInCategory(
  id: string,
  generated: GeneratedExploration[],
) {
  return generated
    .filter((item) => item.categoryId === id && item.imageUrl)
    .map((item) => item.imageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 8)
}

function PreviewImage({
  src,
  fallbackSrc,
  className,
}: {
  src: string
  fallbackSrc?: string | null
  className?: string
}) {
  const [usingFallback, setUsingFallback] = useState(false)
  const displaySrc = usingFallback && fallbackSrc ? fallbackSrc : src

  useEffect(() => {
    setUsingFallback(false)
  }, [fallbackSrc, src])

  return (
    <img
      src={displaySrc}
      alt=""
      className={className}
      onError={() => {
        if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
          setUsingFallback(true)
        }
      }}
    />
  )
}

function PreviewArt({
  exploration,
  className,
}: {
  exploration: Exploration
  className?: string
}) {
  if (isGenerated(exploration) && exploration.imageUrl) {
    return (
      <PreviewImage
        src={exploration.imageUrl}
        fallbackSrc={exploration.sourceImageUrl}
        className={cn('size-full object-cover', className)}
      />
    )
  }

  const tone =
    exploration.source === 'library' ? exploration.previewTone : FALLBACK_TONE

  return (
    <div
      className={cn('relative size-full overflow-hidden', className)}
      style={{ background: tone }}
      aria-hidden="true"
    >
      <div className="border-background/55 bg-background/20 absolute left-1/2 top-1/2 size-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
      <div className="bg-background/40 absolute left-1/2 top-1/2 size-1/6 -translate-x-1/2 -translate-y-1/2 rounded-full" />
    </div>
  )
}

function WorldCard({
  category,
  specimens,
  generatedCount,
  generatedPreviews,
  onSelect,
  index,
}: {
  category: Category
  specimens: Specimen[]
  generatedCount: number
  generatedPreviews: string[]
  onSelect: () => void
  index: number
}) {
  const tone = categoryTone(category.id, specimens)
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const count =
    specimensInCategory(category.id, specimens).length + generatedCount
  const previewCount = generatedPreviews.length

  useEffect(() => {
    setActivePreviewIndex(0)
  }, [category.id, previewCount])

  useEffect(() => {
    if (previewCount < 2) return undefined

    let interval: number | undefined
    const timeout = window.setTimeout(
      () => {
        setActivePreviewIndex((current) => (current + 1) % previewCount)
        interval = window.setInterval(() => {
          setActivePreviewIndex((current) => (current + 1) % previewCount)
        }, 5000)
      },
      5000 + (index % 5) * 450,
    )

    return () => {
      window.clearTimeout(timeout)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }, [index, previewCount])

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${index * 28}ms` }}
      className="animate-card-in bg-card focus-visible:ring-primary/40 group relative isolate flex h-44 cursor-pointer flex-col overflow-hidden rounded-xl text-left transition-all duration-300 ease-out [will-change:transform] hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2"
    >
      <div
        className="absolute inset-0 z-0 transition-transform duration-700 ease-out [will-change:transform] group-hover:scale-110"
        style={{ background: tone }}
        aria-hidden="true"
      />
      {generatedPreviews.length > 0 ? (
        <div
          className="bg-card absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          {generatedPreviews.map((src, imageIndex) => (
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                'world-card-preview absolute inset-0 size-full object-contain px-8 pb-16 pt-6 transition-opacity duration-1000 ease-out',
                imageIndex === activePreviewIndex % generatedPreviews.length
                  ? 'opacity-100'
                  : 'opacity-0',
              )}
              style={{ animationDelay: `${index * -360}ms` }}
              draggable={false}
            />
          ))}
          <div className="to-background/20 absolute inset-0 bg-gradient-to-b from-transparent via-transparent" />
        </div>
      ) : null}
      <div className="relative z-10 mt-auto flex flex-col gap-1 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-4 pt-12">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold tracking-tight text-white drop-shadow-sm">
            {category.name}
          </h3>
          <span className="text-[11px] font-medium text-white/65">{count}</span>
        </div>
        <p className="line-clamp-2 text-xs leading-4 text-white/85">
          {category.description}
        </p>
      </div>
    </button>
  )
}

function GeneratedPill({
  exploration,
  onSelect,
  index,
}: {
  exploration: GeneratedExploration
  onSelect: () => void
  index: number
}) {
  const label = statusLabel(exploration)
  const hardPending =
    exploration.status === 'generating' && !exploration.imageUrl

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${index * 30}ms` }}
      className="animate-card-in bg-card border-border/60 group relative isolate flex h-32 w-44 shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-300 ease-out [will-change:transform] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="bg-muted/20 absolute inset-0 z-0" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-[3.25rem] top-0 z-0 overflow-hidden">
        <div className="size-full transition-transform duration-700 ease-out [will-change:transform] group-hover:scale-105">
          <PreviewArt
            exploration={exploration}
            className="object-contain object-center"
          />
        </div>
      </div>
      {hardPending ? (
        <div className="bg-background/80 absolute inset-0 z-30 flex items-center justify-center">
          <Loader2 className="text-primary size-4 animate-spin" />
        </div>
      ) : null}
      {label && !hardPending ? (
        <div className="bg-background/80 text-foreground absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] shadow-sm backdrop-blur-md">
          {isExplorationWorking(exploration) ? (
            <Loader2 className="text-primary size-3 animate-spin" />
          ) : null}
          <span>{label}</span>
        </div>
      ) : null}
      <div className="border-border/50 bg-card/95 relative z-20 mt-auto h-[3.25rem] border-t px-2.5 py-2 shadow-[0_-8px_18px_rgba(0,0,0,0.06)] backdrop-blur">
        <p className="text-foreground truncate text-[12px] font-semibold leading-4">
          {exploration.title}
        </p>
        <p className="text-muted-foreground truncate text-[10px] leading-4">
          {exploration.subtitle}
        </p>
      </div>
    </button>
  )
}

function SpecimenCard({
  exploration,
  onSelect,
  index,
}: {
  exploration: Exploration
  onSelect: () => void
  index: number
}) {
  const generated = isGenerated(exploration) ? exploration : null
  const label = generated ? statusLabel(generated) : null
  const hardPending = generated?.status === 'generating' && !generated.imageUrl

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ animationDelay: `${index * 24}ms` }}
      className="animate-card-in bg-card focus-visible:ring-primary/40 group relative isolate flex h-40 cursor-pointer flex-col overflow-hidden rounded-xl text-left transition-all duration-300 ease-out [will-change:transform] hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2"
    >
      <div className="absolute inset-0 z-0 transition-transform duration-700 ease-out [will-change:transform] group-hover:scale-110">
        <PreviewArt exploration={exploration} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/95 via-black/45 via-35% to-transparent"
        aria-hidden="true"
      />
      {hardPending ? (
        <div className="bg-background/80 absolute inset-0 z-30 flex items-center justify-center">
          <Loader2 className="text-primary size-5 animate-spin" />
        </div>
      ) : null}
      {generated && label && !hardPending ? (
        <div className="bg-background/80 text-foreground absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] shadow-sm backdrop-blur-md">
          {isExplorationWorking(generated) ? (
            <Loader2 className="text-primary size-3 animate-spin" />
          ) : null}
          <span>{label}</span>
        </div>
      ) : null}
      <div className="relative z-20 mt-auto flex flex-col gap-0.5 px-3 pb-3 pt-10">
        <p className="truncate text-sm font-semibold leading-4 text-white drop-shadow-sm">
          {exploration.title}
        </p>
        <p className="truncate text-[11px] leading-4 text-white/80">
          {exploration.subtitle}
        </p>
      </div>
    </button>
  )
}

function ViewShell({
  children,
  direction,
  keyId,
}: {
  children: ReactNode
  direction: 'forward' | 'back'
  keyId: string
}) {
  return (
    <div
      key={keyId}
      className={cn(
        'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
        direction === 'forward' ? 'animate-view-forward' : 'animate-view-back',
      )}
    >
      {children}
    </div>
  )
}

function WorldsView({
  categories,
  specimens,
  generated,
  search,
  onSearch,
  onWorld,
  onSpecimen,
  onGenerate,
  samplePrompt,
}: {
  categories: Category[]
  specimens: Specimen[]
  generated: GeneratedExploration[]
  search: string
  onSearch: (value: string) => void
  onWorld: (id: string) => void
  onSpecimen: (id: string) => void
  onGenerate: () => void
  samplePrompt: string
}) {
  const q = search.trim().toLowerCase()
  const filteredCategories = useMemo(() => {
    if (!q) return categories
    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(q) ||
        category.description.toLowerCase().includes(q),
    )
  }, [categories, q])

  const matchingSpecimens = useMemo(() => {
    if (!q) return [] as Exploration[]
    return [
      ...generated.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q),
      ),
      ...specimens.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q)),
      ),
    ]
  }, [specimens, generated, q])

  const recentGenerated = generated.slice(0, 6)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7 flex items-center gap-2">
          <div className="bg-muted/40 focus-within:bg-muted/60 relative flex-1 rounded-full transition-colors">
            <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search worlds, specimens, ideas..."
              className="placeholder:text-muted-foreground/80 h-10 w-full bg-transparent pl-10 pr-4 text-[13px] focus:outline-none"
            />
          </div>
        </div>

        {recentGenerated.length > 0 && !q ? (
          <section className="mb-8">
            <h2 className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wider">
              Recent
            </h2>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {recentGenerated.map((item, index) => (
                <GeneratedPill
                  key={item.id}
                  exploration={item}
                  index={index}
                  onSelect={() => onSpecimen(item.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {q ? (
          <section>
            <h2 className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wider">
              {matchingSpecimens.length === 0 && filteredCategories.length === 0
                ? 'Nothing matches'
                : 'Matches'}
            </h2>
            {filteredCategories.length > 0 ? (
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCategories.map((category, index) => (
                  <WorldCard
                    key={category.id}
                    category={category}
                    specimens={specimens}
                    generatedCount={
                      generated.filter(
                        (item) => item.categoryId === category.id,
                      ).length
                    }
                    generatedPreviews={generatedPreviewImagesInCategory(
                      category.id,
                      generated,
                    )}
                    onSelect={() => onWorld(category.id)}
                    index={index}
                  />
                ))}
              </div>
            ) : null}
            {matchingSpecimens.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {matchingSpecimens.map((item, index) => (
                  <SpecimenCard
                    key={item.id}
                    exploration={item}
                    index={index}
                    onSelect={() => onSpecimen(item.id)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section>
            <h2 className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wider">
              Worlds
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((category, index) => (
                <WorldCard
                  key={category.id}
                  category={category}
                  specimens={specimens}
                  generatedCount={
                    generated.filter((item) => item.categoryId === category.id)
                      .length
                  }
                  generatedPreviews={generatedPreviewImagesInCategory(
                    category.id,
                    generated,
                  )}
                  onSelect={() => onWorld(category.id)}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}
      </div>
      <FloatingGenerate onClick={onGenerate} sample={samplePrompt} />
    </div>
  )
}

function WorldView({
  category,
  specimens,
  generated,
  onBack,
  onSpecimen,
  onGenerate,
  onPromptGenerate,
  samplePrompt,
}: {
  category: Category
  specimens: Specimen[]
  generated: GeneratedExploration[]
  onBack: () => void
  onSpecimen: (id: string) => void
  onGenerate: () => void
  onPromptGenerate: PromptGenerateHandler
  samplePrompt: string
}) {
  const inWorld = useMemo<Exploration[]>(
    () => [
      ...generated.filter((item) => item.categoryId === category.id),
      ...specimensInCategory(category.id, specimens),
    ],
    [category.id, generated, specimens],
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(var(--chat-safe-padding,0px)+5rem)] pt-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="animate-chrome-in mb-6">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground -ml-1.5 mb-2 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Worlds
          </button>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {category.name}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-5">
            {category.description}
          </p>
        </div>

        {inWorld.length === 0 ? (
          <div className="border-border/60 mt-6 rounded-xl border border-dashed p-10 text-center">
            <p className="text-foreground text-sm">Nothing here yet.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Generate the first exploration for {category.name.toLowerCase()}.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerate}
              className="mt-4 cursor-pointer"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Generate
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {inWorld.map((item, index) => (
              <SpecimenCard
                key={item.id}
                exploration={item}
                index={index}
                onSelect={() => onSpecimen(item.id)}
              />
            ))}
          </div>
        )}

        {category.prompts.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-wider">
              Try
            </h2>
            <div className="flex flex-col">
              {category.prompts.slice(0, 18).map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPromptGenerate(item, category.id)}
                  style={{ animationDelay: `${index * 20}ms` }}
                  className="animate-card-in text-foreground/85 hover:text-foreground hover:bg-muted/50 group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-[13px] leading-5 transition-colors"
                >
                  <Sparkles className="text-muted-foreground/70 group-hover:text-primary size-3.5 shrink-0 transition-colors" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <FloatingGenerate onClick={onGenerate} sample={samplePrompt} />
    </div>
  )
}

function SpecimenView({
  exploration,
  category,
  categories,
  onBack,
  onGenerate,
  onPromptGenerate,
  onRegenerateAll,
  onRegenerateModel,
  onRetryBackground,
  onMoveCategory,
  onDelete,
  onCancel,
  autoRotate,
  onAutoRotateChange,
  onModelProviderPreference,
  regenerating,
  retryingBackground,
  moving,
  deleting,
  canceling,
}: {
  exploration: Exploration
  category: Category | undefined
  categories: Category[]
  onBack: () => void
  onGenerate: () => void
  onPromptGenerate: PromptGenerateHandler
  onRegenerateAll?: () => void
  onRegenerateModel?: (provider?: ModelProvider) => void
  onRetryBackground?: () => void
  onMoveCategory?: (categoryId: string) => void
  onDelete?: () => void
  onCancel?: () => void
  autoRotate: boolean
  onAutoRotateChange: (value: boolean) => void
  onModelProviderPreference?: (
    explorationId: string,
    provider: ModelProvider,
  ) => void
  regenerating?: boolean
  retryingBackground?: boolean
  moving?: boolean
  deleting?: boolean
  canceling?: boolean
}) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [lightingOpen, setLightingOpen] = useState(false)
  const [lighting, setLighting] = useState<SceneLighting>(
    DEFAULT_SCENE_LIGHTING,
  )
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [activeModelProvider, setActiveModelProvider] =
    useState<ModelProvider | null>(null)

  const generated = isGenerated(exploration) ? exploration : null
  const generatedId = generated?.id
  const generatedModelProvider = generated?.modelProvider
  const modelVariants = useMemo(
    () => generated?.modelVariants ?? [],
    [generated?.modelVariants],
  )
  const activeVariant =
    generated && activeModelProvider
      ? modelVariants.find(
          (variant) => variant.provider === activeModelProvider,
        )
      : undefined
  const viewedExploration =
    generated && activeVariant
      ? explorationWithModelVariant(generated, activeVariant)
      : exploration
  const generating = generated?.status === 'generating' && !generated.imageUrl
  const failed = isGenerated(exploration) && exploration.status === 'failed'
  const failedMessage = generated ? explorationErrorMessage(generated) : null
  const nonBlockingIssue =
    generated && !failed && !generating && failedMessage ? failedMessage : null
  const canToggleLayer = isGenerated(exploration) && !!exploration.imageUrl
  const canShow3d =
    !generated ||
    (generated.modelStatus === 'ready' && !!generated.modelUrl) ||
    modelVariants.some((variant) => variant.status === 'ready')
  const active3dReady =
    !generated ||
    (activeVariant
      ? activeVariant.status === 'ready'
      : generated.modelStatus === 'ready' && !!generated.modelUrl)
  const sidePanelOpen = inspectorOpen || lightingOpen
  const detailsButtonActive = inspectorOpen && !lightingOpen
  const detailsButtonLabel =
    lightingOpen || !inspectorOpen ? 'Show details' : 'Hide details'

  useEffect(() => {
    if (!canToggleLayer && viewMode === '2d') setViewMode('3d')
  }, [canToggleLayer, viewMode])

  useEffect(() => {
    if (!generated?.imageUrl) return
    if (!active3dReady) setViewMode('2d')
  }, [active3dReady, generated?.id, generated?.imageUrl])

  useEffect(() => {
    if (active3dReady) {
      setViewMode('3d')
    }
  }, [active3dReady, generated?.id])

  useEffect(() => {
    if (viewMode === '2d') setLightingOpen(false)
  }, [viewMode])

  useEffect(() => {
    setInspectorOpen(true)
    setLightingOpen(false)
  }, [exploration.id])

  useEffect(() => {
    if (!generatedId) {
      setActiveModelProvider(null)
      setModelMenuOpen(false)
      return
    }

    setActiveModelProvider(
      preferredModelProviderFor(
        modelVariants,
        generatedModelProvider,
        generated?.selectedModelProvider,
      ),
    )
    setModelMenuOpen(false)
  }, [
    generated?.selectedModelProvider,
    generatedId,
    generatedModelProvider,
    modelVariants,
  ])

  useEffect(() => {
    if (!modelVariants.length || !activeModelProvider) return
    if (
      !modelVariants.some((variant) => variant.provider === activeModelProvider)
    ) {
      setActiveModelProvider(
        generatedId
          ? preferredModelProviderFor(
              modelVariants,
              generatedModelProvider,
              generated?.selectedModelProvider,
            )
          : (generatedModelProvider ?? modelVariants[0]?.provider ?? null),
      )
    }
  }, [
    activeModelProvider,
    generated?.selectedModelProvider,
    generatedId,
    generatedModelProvider,
    modelVariants,
  ])

  function toggleAutoRotate() {
    onAutoRotateChange(!autoRotate)
  }

  function showDetailsPanel() {
    if (lightingOpen) {
      setLightingOpen(false)
      setInspectorOpen(true)
      return
    }

    setLightingOpen(false)
    setInspectorOpen((value) => !value)
  }

  function showLightingPanel() {
    setLightingOpen((value) => !value)
  }

  function handle3dViewClick() {
    if (!canShow3d) return

    if (viewMode !== '3d') {
      setViewMode('3d')
      setModelMenuOpen(false)
      return
    }

    if (modelVariants.length > 1) {
      setModelMenuOpen((value) => !value)
    }
  }

  function selectModelProvider(provider: ModelProvider) {
    setActiveModelProvider(provider)
    if (generated) {
      onModelProviderPreference?.(generated.id, provider)
    }
    setViewMode('3d')
    setModelMenuOpen(false)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <div
        className="bg-muted/10 absolute bottom-0 left-0 top-0 transition-[right] duration-300 ease-out"
        style={{ right: sidePanelOpen ? INSPECTOR_WIDTH : 0 }}
      >
        <SceneViewer
          exploration={viewedExploration}
          autoRotate={autoRotate}
          viewMode={viewMode}
          lighting={lighting}
        />
      </div>

      <div className="animate-chrome-in pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto flex min-w-0 max-w-[60%] items-start gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="bg-background/70 hover:bg-background/95 size-8 shrink-0 cursor-pointer rounded-full backdrop-blur-md"
                onClick={onBack}
                aria-label="Back"
              >
                <ArrowLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Back to {category?.name ?? 'library'}
            </TooltipContent>
          </Tooltip>
          <div className="min-w-0">
            {category ? (
              <p className="text-muted-foreground mb-0.5 truncate text-[10px] font-medium uppercase tracking-wider">
                {category.name}
              </p>
            ) : null}
            <h1 className="text-foreground truncate text-lg font-semibold tracking-tight">
              {exploration.title}
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'bg-background/70 hover:bg-background/95 size-8 cursor-pointer rounded-full backdrop-blur-md',
                  detailsButtonActive && 'text-primary',
                )}
                onClick={showDetailsPanel}
                aria-label={detailsButtonLabel}
              >
                <Info className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {detailsButtonLabel === 'Hide details'
                ? 'Hide details'
                : 'About this'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {generating ? (
        <div
          className="animate-chrome-in pointer-events-none absolute left-0 top-20 z-20 flex justify-center px-4 transition-[right] duration-300 ease-out"
          style={{ right: sidePanelOpen ? INSPECTOR_WIDTH : 0 }}
        >
          <div className="border-border/70 bg-background/90 text-muted-foreground pointer-events-auto flex max-w-[min(28rem,calc(100vw-2rem))] items-center gap-3 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
            <Loader2 className="text-primary size-5 animate-spin" />
            <span className="truncate">Generating image...</span>
            {onCancel ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-full px-2 text-xs"
                onClick={onCancel}
                disabled={canceling}
              >
                {canceling ? 'Canceling' : 'Cancel'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {failed ? (
        <div
          className="animate-chrome-in pointer-events-none absolute left-0 top-20 z-20 flex justify-center px-4 transition-[right] duration-300 ease-out"
          style={{ right: sidePanelOpen ? INSPECTOR_WIDTH : 0 }}
        >
          <div className="border-destructive/45 bg-destructive/12 text-destructive-foreground max-w-[min(28rem,calc(100vw-2rem))] rounded-md border p-3 text-center shadow-lg backdrop-blur-xl">
            <p className="text-destructive text-xs font-semibold">
              Generation failed
            </p>
            <p className="text-foreground/90 mt-1 text-[11px] leading-4">
              {failedMessage ?? 'The image request failed. Please try again.'}
            </p>
          </div>
        </div>
      ) : null}

      {nonBlockingIssue ? (
        <div
          className="animate-chrome-in pointer-events-none absolute left-0 top-20 z-20 flex justify-center px-4 transition-[right] duration-300 ease-out"
          style={{ right: sidePanelOpen ? INSPECTOR_WIDTH : 0 }}
        >
          <div className="border-destructive/35 bg-background/90 text-foreground pointer-events-auto flex max-w-[min(34rem,calc(100vw-2rem))] items-start gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-xl">
            <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Image available with issue</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-2 leading-4">
                {nonBlockingIssue}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {generated?.modelStatus === 'rendering' && generated.imageUrl ? (
        <div
          className="animate-chrome-in pointer-events-none absolute left-0 top-20 z-10 flex justify-center px-4 transition-[right] duration-300 ease-out"
          style={{ right: sidePanelOpen ? INSPECTOR_WIDTH : 0 }}
        >
          <div className="border-border/70 bg-background/85 text-muted-foreground pointer-events-auto inline-flex max-w-[min(32rem,calc(100vw-2rem))] items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur-xl">
            <Loader2 className="text-primary size-3.5 animate-spin" />
            <span className="truncate">
              3D model rendering in the background.
            </span>
          </div>
        </div>
      ) : null}

      <div
        className="animate-chrome-in pointer-events-none absolute left-0 z-10 flex justify-center px-4 transition-[right] duration-300 ease-out"
        style={{
          right: sidePanelOpen ? INSPECTOR_WIDTH : 0,
          bottom: ACTION_DOCK_BOTTOM,
        }}
      >
        <div className="bg-background/85 border-border/70 shadow-foreground/10 pointer-events-auto flex h-11 max-w-[calc(100vw-2rem)] items-center gap-0.5 rounded-full border px-1.5 shadow-xl backdrop-blur-xl">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-8 cursor-pointer rounded-full',
                  viewMode === '3d' && autoRotate && 'text-primary',
                  viewMode === '2d' && 'text-muted-foreground/40',
                )}
                onClick={toggleAutoRotate}
                disabled={viewMode === '2d'}
                aria-label="Toggle rotation"
              >
                <Rotate3D className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {autoRotate ? 'Pause rotation' : 'Auto-rotate'}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-8 cursor-pointer rounded-full',
                  viewMode === '2d' && canToggleLayer && 'text-primary',
                  !canToggleLayer && 'text-muted-foreground/40',
                )}
                onClick={() => canToggleLayer && setViewMode('2d')}
                disabled={!canToggleLayer}
                aria-label="2D view"
              >
                <ImageIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canToggleLayer ? '2D view' : 'No 2D image'}
            </TooltipContent>
          </Tooltip>
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 cursor-pointer rounded-full',
                    modelVariants.length > 1 ? 'w-11 gap-1 px-2' : 'size-8',
                    viewMode === '3d' && 'text-primary',
                    !canShow3d && 'text-muted-foreground/40',
                  )}
                  onClick={handle3dViewClick}
                  disabled={!canShow3d}
                  aria-label="3D view"
                >
                  <Box className="size-4" />
                  {modelVariants.length > 1 ? (
                    <ChevronDown className="size-3" />
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent>3D view</TooltipContent>
            </Tooltip>
            {modelMenuOpen && modelVariants.length > 1 ? (
              <div className="border-border/70 bg-background/95 absolute bottom-11 left-1/2 z-40 w-48 -translate-x-1/2 rounded-lg border p-1 text-xs shadow-xl backdrop-blur-xl">
                {modelVariants.map((variant) => {
                  const selected =
                    (activeModelProvider ?? generated?.modelProvider) ===
                    variant.provider
                  return (
                    <button
                      key={variant.provider}
                      type="button"
                      disabled={variant.status !== 'ready'}
                      onClick={() => selectModelProvider(variant.provider)}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span>{variantLabel(variant)}</span>
                      {variant.status === 'rendering' ||
                      variant.status === 'pending' ? (
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      ) : variant.status === 'ready' ? null : (
                        <span className="text-[10px] capitalize">
                          {variant.status}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-8 cursor-pointer rounded-full',
                  lightingOpen && 'text-primary',
                  viewMode === '2d' && 'text-muted-foreground/40',
                )}
                onClick={showLightingPanel}
                disabled={viewMode === '2d'}
                aria-label="Lighting controls"
              >
                <Sun className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lights</TooltipContent>
          </Tooltip>
          <div className="bg-border/70 mx-0.5 h-5 w-px" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 cursor-pointer rounded-full"
                onClick={onGenerate}
                aria-label="Generate exploration"
              >
                <Sparkles className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generate another</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 cursor-pointer rounded-full px-3 text-xs"
                onClick={() =>
                  sendToChatInput(`Tell me more about: ${exploration.title}`)
                }
              >
                Ask
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ask Moldable about this</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className={cn(
          'border-border/45 bg-background/58 shadow-foreground/10 absolute right-0 top-0 z-30 flex h-full flex-col border-l shadow-2xl backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-out',
          sidePanelOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ width: INSPECTOR_WIDTH }}
      >
        {lightingOpen ? (
          <LightingPanel
            lighting={lighting}
            onLighting={setLighting}
            onReset={() => setLighting(DEFAULT_SCENE_LIGHTING)}
            onClose={() => setLightingOpen(false)}
          />
        ) : (
          <Inspector
            exploration={exploration}
            categories={categories}
            onClose={() => setInspectorOpen(false)}
            onPromptGenerate={onPromptGenerate}
            onRegenerateAll={onRegenerateAll}
            onRegenerateModel={(provider) => {
              if (generated && provider) {
                setActiveModelProvider(provider)
                onModelProviderPreference?.(generated.id, provider)
              }
              onRegenerateModel?.(provider)
            }}
            onRetryBackground={onRetryBackground}
            onMoveCategory={onMoveCategory}
            onDelete={onDelete}
            onCancel={onCancel}
            regenerating={regenerating}
            retryingBackground={retryingBackground}
            moving={moving}
            deleting={deleting}
            canceling={canceling}
          />
        )}
      </div>
    </div>
  )
}

function LightingPanel({
  lighting,
  onLighting,
  onReset,
  onClose,
}: {
  lighting: SceneLighting
  onLighting: (value: SceneLighting) => void
  onReset: () => void
  onClose: () => void
}) {
  function update(next: Partial<SceneLighting>) {
    onLighting({ ...lighting, ...next })
  }

  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-muted-foreground size-3.5" />
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
            Lights
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer rounded-full px-2 text-[11px]"
                onClick={onReset}
              >
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset lighting</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer"
                onClick={onClose}
                aria-label="Close lights"
              >
                <X className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-5">
        <div className="space-y-5">
          <LightingSlider
            label="Brightness"
            value={lighting.brightness}
            min={0.45}
            max={2.4}
            step={0.05}
            valueLabel={`${Math.round(lighting.brightness * 100)}%`}
            onChange={(value) => update({ brightness: value })}
          />

          <LightingSlider
            label="Warmth"
            value={lighting.warmth}
            min={-1}
            max={1}
            step={0.05}
            valueLabel={
              lighting.warmth < -0.15
                ? 'Cool'
                : lighting.warmth > 0.15
                  ? 'Warm'
                  : 'Neutral'
            }
            onChange={(value) => update({ warmth: value })}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-foreground text-xs font-medium">Side</p>
              <p className="text-muted-foreground text-[11px]">
                {lighting.direction < -0.35
                  ? 'Left'
                  : lighting.direction > 0.35
                    ? 'Right'
                    : 'Front'}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Left', value: -0.75 },
                { label: 'Front', value: 0 },
                { label: 'Right', value: 0.75 },
              ].map((item) => {
                const selected = Math.abs(lighting.direction - item.value) < 0.2
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={cn(
                      'border-border/70 hover:bg-muted/70 h-9 cursor-pointer rounded-md border text-xs transition-colors',
                      selected && 'bg-muted text-primary border-primary/35',
                    )}
                    onClick={() => update({ direction: item.value })}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <LightingSlider
            label="Height"
            value={lighting.height}
            min={0}
            max={1}
            step={0.05}
            valueLabel={
              lighting.height < 0.35
                ? 'Low'
                : lighting.height > 0.7
                  ? 'High'
                  : 'Middle'
            }
            onChange={(value) => update({ height: value })}
          />

          <div>
            <p className="text-foreground mb-2 text-xs font-medium">Looks</p>
            <div className="grid gap-1.5">
              {[
                {
                  label: 'Bright',
                  value: {
                    brightness: 1.75,
                    warmth: 0.05,
                    direction: 0.15,
                    height: 0.7,
                  },
                },
                {
                  label: 'Soft',
                  value: {
                    brightness: 1.2,
                    warmth: 0.25,
                    direction: 0,
                    height: 0.55,
                  },
                },
                {
                  label: 'Cool',
                  value: {
                    brightness: 1.45,
                    warmth: -0.45,
                    direction: -0.65,
                    height: 0.75,
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="border-border/70 hover:bg-muted/70 flex h-9 cursor-pointer items-center justify-between rounded-md border px-3 text-left text-xs transition-colors"
                  onClick={() => onLighting(preset.value)}
                >
                  <span>{preset.label}</span>
                  <Sun className="text-muted-foreground size-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function LightingSlider({
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  valueLabel: string
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between">
        <span className="text-foreground text-xs font-medium">{label}</span>
        <span className="text-muted-foreground text-[11px]">{valueLabel}</span>
      </span>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(values) => {
          const nextValue = values[0]
          if (typeof nextValue === 'number') {
            onChange(nextValue)
          }
        }}
        className="cursor-pointer"
      />
    </label>
  )
}

function Inspector({
  exploration,
  categories,
  onClose,
  onPromptGenerate,
  onRegenerateAll,
  onRegenerateModel,
  onRetryBackground,
  onMoveCategory,
  onDelete,
  onCancel,
  regenerating = false,
  retryingBackground = false,
  moving = false,
  deleting = false,
  canceling = false,
}: {
  exploration: Exploration
  categories: Category[]
  onClose: () => void
  onPromptGenerate: PromptGenerateHandler
  onRegenerateAll?: () => void
  onRegenerateModel?: (provider?: ModelProvider) => void
  onRetryBackground?: () => void
  onMoveCategory?: (categoryId: string) => void
  onDelete?: () => void
  onCancel?: () => void
  regenerating?: boolean
  retryingBackground?: boolean
  moving?: boolean
  deleting?: boolean
  canceling?: boolean
}) {
  const generated = isGenerated(exploration) ? exploration : null
  const modelVariants = generated?.modelVariants ?? []
  const working = generated ? isExplorationWorking(generated) : false
  const errorNote = generated ? explorationErrorMessage(generated) : null
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const canRegenerate = !!onRegenerateAll && !working
  const showRetryBackground =
    !!generated &&
    generated.backgroundStatus === 'failed' &&
    !!generated.sourceImageUrl &&
    !!onRetryBackground
  const canRetryBackground = showRetryBackground && !working
  const canRegenerateModel =
    !!generated && !!generated.imageUrl && !!onRegenerateModel && !working
  const canMove = !!generated && !!onMoveCategory && !working
  const canDelete = !!generated && !!onDelete
  const actionPending = regenerating || retryingBackground || moving || deleting

  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
          Details
        </p>
        <div className="flex items-center gap-1">
          {onRegenerateAll ? (
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 cursor-pointer"
                    onClick={() => {
                      if (!generated) {
                        onRegenerateAll()
                        return
                      }
                      setActionsMenuOpen((value) => !value)
                    }}
                    disabled={(!generated && !canRegenerate) || actionPending}
                    aria-label="More actions"
                  >
                    {actionPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <EllipsisVertical className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>More actions</TooltipContent>
              </Tooltip>
              {generated && actionsMenuOpen ? (
                <div className="border-border/70 bg-background/95 absolute right-0 top-8 z-50 w-64 rounded-lg border p-1 text-xs shadow-xl backdrop-blur-xl">
                  <button
                    type="button"
                    disabled={!canRegenerate}
                    className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                    onClick={() => {
                      setActionsMenuOpen(false)
                      onRegenerateAll()
                    }}
                  >
                    <RotateCw className="size-3.5" />
                    <span>Regenerate all</span>
                  </button>
                  {showRetryBackground ? (
                    <button
                      type="button"
                      disabled={!canRetryBackground}
                      className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => {
                        setActionsMenuOpen(false)
                        onRetryBackground?.()
                      }}
                    >
                      {retryingBackground ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="size-3.5" />
                      )}
                      <span>Retry removing bg</span>
                    </button>
                  ) : null}
                  <div className="text-muted-foreground px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider">
                    Regenerate 3D model
                  </div>
                  {MODEL_PROVIDER_OPTIONS.map((option) => {
                    const variant = modelVariants.find(
                      (item) => item.provider === option.id,
                    )
                    const ready = variant?.status === 'ready'
                    const workingVariant =
                      variant?.status === 'pending' ||
                      variant?.status === 'rendering'
                    const note =
                      variant?.status === 'failed'
                        ? 'Previous attempt failed'
                        : ready
                          ? null
                          : 'Generate with this provider'
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={!canRegenerateModel}
                        className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          setActionsMenuOpen(false)
                          onRegenerateModel?.(option.id)
                        }}
                      >
                        <Box className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.name}</span>
                          {note ? (
                            <span className="text-muted-foreground block truncate text-[10px]">
                              {note}
                            </span>
                          ) : null}
                        </span>
                        {workingVariant ? (
                          <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />
                        ) : ready ? (
                          <Check className="text-primary size-3.5 shrink-0" />
                        ) : null}
                      </button>
                    )
                  })}
                  <div className="bg-border/70 my-1 h-px" />
                  <button
                    type="button"
                    disabled={!canMove}
                    className="text-foreground hover:bg-muted/60 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      setActionsMenuOpen(false)
                      setMoveOpen(true)
                    }}
                  >
                    <FolderInput className="size-3.5" />
                    <span>Move</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => {
                      setActionsMenuOpen(false)
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {working && onCancel ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 cursor-pointer"
                  onClick={onCancel}
                  disabled={canceling}
                  aria-label="Cancel generation"
                >
                  {canceling ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Ban className="size-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cancel generation</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer"
                onClick={onClose}
                aria-label="Close details"
              >
                <X className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {generated ? (
        <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
          <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex h-[min(32rem,calc(100dvh-var(--chat-safe-padding,0px)-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
            <DialogHeader className="shrink-0 px-5 pb-3 pt-5">
              <DialogTitle>Move exploration</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              <div className="grid gap-1">
                {categories.map((category) => {
                  const selectedCategory = category.id === generated.categoryId
                  return (
                    <button
                      key={category.id}
                      type="button"
                      disabled={moving || selectedCategory}
                      className={cn(
                        'hover:bg-muted/60 flex cursor-pointer items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:cursor-not-allowed',
                        selectedCategory && 'bg-muted/45',
                      )}
                      onClick={() => {
                        setMoveOpen(false)
                        onMoveCategory?.(category.id)
                      }}
                    >
                      <span>
                        <span className="text-foreground block text-sm font-medium">
                          {category.name}
                        </span>
                        <span className="text-muted-foreground mt-0.5 block text-xs leading-4">
                          {category.description}
                        </span>
                      </span>
                      {selectedCategory ? (
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {generated ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {generated.title}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the exploration and its generated image and 3D
                model files from this workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer" disabled={deleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="cursor-pointer"
                disabled={deleting}
                onClick={() => onDelete?.()}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(var(--chat-safe-padding,0px)+1.5rem)] pt-2">
        <p className="text-foreground/90 text-[13px] leading-6">
          {exploration.description}
        </p>

        <div className="mt-5 space-y-1.5">
          {exploration.details.map((detail) => (
            <div
              key={`${detail.label}-${detail.value}`}
              className="grid grid-cols-[80px_1fr] items-baseline gap-2 text-[12px]"
            >
              <div className="text-muted-foreground">{detail.label}</div>
              <div className="text-foreground/90">{detail.value}</div>
            </div>
          ))}
        </div>

        {errorNote ? (
          <section className="border-destructive/45 bg-destructive/10 mt-5 rounded-lg border p-3">
            <p className="text-destructive mb-1 text-[10px] font-semibold uppercase tracking-wider">
              Error
            </p>
            <p className="text-foreground/90 text-[12px] leading-5">
              {errorNote}
            </p>
          </section>
        ) : null}

        {exploration.observations.length > 0 ? (
          <section className="mt-6">
            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
              Observations
            </p>
            <ul className="space-y-1.5">
              {exploration.observations.map((item) => (
                <li
                  key={item}
                  className="text-foreground/90 relative pl-4 text-[12px] leading-5 before:absolute before:left-1 before:top-2 before:size-1 before:rounded-full before:bg-current before:opacity-40"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {exploration.prompts.length > 0 ? (
          <section className="mt-6">
            <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
              Try next
            </p>
            <div className="-mx-2 flex flex-col">
              {exploration.prompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPromptGenerate(item, exploration.categoryId)}
                  className="text-foreground/80 hover:bg-muted/60 hover:text-foreground group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-left text-[12px] leading-5 transition-colors"
                >
                  <Sparkles className="text-muted-foreground group-hover:text-primary mt-0.5 size-3 shrink-0 transition-colors" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}

function FloatingGenerate({
  onClick,
  sample,
}: {
  onClick: () => void
  sample: string
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: ACTION_DOCK_BOTTOM }}
    >
      <button
        type="button"
        onClick={onClick}
        className="bg-foreground text-background pointer-events-auto inline-flex h-10 max-w-[min(32rem,calc(100vw-2rem))] cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-medium shadow-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl"
      >
        <Plus className="size-3.5" />
        <span className="shrink-0">Generate</span>
        <span className="text-background/60 max-w-72 truncate text-xs font-normal">
          {sample}
        </span>
      </button>
    </div>
  )
}

function GenerateDialog({
  open,
  onOpenChange,
  prompt,
  onPrompt,
  quality,
  onQuality,
  samplePrompt,
  samples,
  onSubmit,
  pending,
  modelProvider,
  onModelProvider,
  providerPending,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  prompt: string
  onPrompt: (value: string) => void
  quality: ImageQuality
  onQuality: (value: ImageQuality) => void
  samplePrompt: string
  samples: string[]
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  pending: boolean
  modelProvider: ModelProvider
  onModelProvider: (provider: ModelProvider) => void
  providerPending: boolean
}) {
  const [optionsOpen, setOptionsOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc((100dvh-var(--chat-safe-padding,0px))/2)] flex max-h-[calc(100dvh-var(--chat-safe-padding,0px)-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-5 pb-3 pr-12 pt-5">
          <DialogTitle className="text-base font-semibold">
            Generate exploration
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-[11px] font-medium">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(event) => onPrompt(event.target.value)}
                placeholder={samplePrompt}
                rows={3}
                autoFocus
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm leading-5 focus-visible:outline-none focus-visible:ring-1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-muted-foreground text-[11px] font-medium">
                Try
              </label>
              <div className="grid gap-1.5">
                {samples.slice(0, 4).map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => onPrompt(sample)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] leading-5 transition-colors"
                  >
                    <Sparkles className="size-3 shrink-0" />
                    <span>{sample}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-border/70 rounded-lg border">
              <button
                type="button"
                onClick={() => setOptionsOpen((value) => !value)}
                className="flex h-10 w-full cursor-pointer items-center justify-between px-3 text-left text-xs font-medium"
              >
                <span>Options</span>
                <span className="text-muted-foreground inline-flex items-center gap-2 font-normal">
                  {modelProviderName(modelProvider)} ·{' '}
                  {
                    QUALITY_OPTIONS.find((option) => option.id === quality)
                      ?.name
                  }
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform',
                      optionsOpen && 'rotate-180',
                    )}
                  />
                </span>
              </button>

              {optionsOpen ? (
                <div className="border-border/70 space-y-4 border-t px-3 py-3">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-medium">
                      3D model provider
                    </label>
                    <div className="grid gap-1.5">
                      {MODEL_PROVIDER_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={providerPending}
                          onClick={() => onModelProvider(option.id)}
                          className={cn(
                            'border-border/70 flex cursor-pointer items-start justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            modelProvider === option.id
                              ? 'border-primary/60 bg-primary/5'
                              : 'hover:bg-muted/50',
                          )}
                        >
                          <span>
                            <span className="text-foreground block text-xs font-medium">
                              {option.name}
                            </span>
                            <span className="text-muted-foreground mt-0.5 block text-[11px] leading-4">
                              {option.description}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'border-border mt-0.5 size-3 rounded-full border',
                              modelProvider === option.id &&
                                'border-primary bg-primary',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-[11px] font-medium">
                      Render quality
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {QUALITY_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onQuality(option.id)}
                          className={cn(
                            'h-8 cursor-pointer rounded-md text-xs transition-colors',
                            quality === option.id
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                          )}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                    <p className="text-muted-foreground/80 text-[11px] leading-4">
                      {
                        QUALITY_OPTIONS.find((option) => option.id === quality)
                          ?.description
                      }
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="border-border/70 shrink-0 gap-2 border-t px-5 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="cursor-pointer"
              disabled={pending || prompt.trim().length < 3}
            >
              {pending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <ImageIcon className="mr-1.5 size-3.5" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onProvider,
  onQuality,
  pending,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  settings: MicroscopeSettings
  onProvider: (provider: ModelProvider) => void
  onQuality: (quality: MicroscopeSettings['quality']) => void
  pending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="text-foreground text-sm font-medium">
              3D model provider
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              New generations, regenerations, and library materializations use
              this provider.
            </p>
          </div>
          <div className="grid gap-2">
            {MODEL_PROVIDER_OPTIONS.map((option) => {
              const selected = settings.modelProvider === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={pending}
                  onClick={() => onProvider(option.id)}
                  className={cn(
                    'border-border/70 bg-background hover:bg-muted/50 flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    selected && 'border-primary/60 bg-primary/5',
                  )}
                >
                  <span>
                    <span className="text-foreground block text-sm font-medium">
                      {option.name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                      {option.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'border-border mt-0.5 size-3 rounded-full border',
                      selected && 'border-primary bg-primary',
                    )}
                  />
                </button>
              )
            })}
          </div>
          <div>
            <p className="text-foreground text-sm font-medium">
              Default quality
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Normal is faster. High uses the more detailed 3D mode for complex
              subjects.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUALITY_OPTIONS.map((option) => {
              const selected = settings.quality === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={pending}
                  onClick={() => onQuality(option.id)}
                  className={cn(
                    'border-border/70 bg-background hover:bg-muted/50 flex h-14 cursor-pointer flex-col justify-center rounded-lg border px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    selected && 'border-primary/60 bg-primary/5',
                  )}
                >
                  <span className="text-foreground text-sm font-medium">
                    {option.name}
                  </span>
                  <span className="text-muted-foreground mt-0.5 text-[11px]">
                    {option.id === 'high' ? 'More detail' : 'Faster default'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GenerationsDock({
  items,
  pendingPrompts,
  open,
  onOpenChange,
  onSelect,
  onDismiss,
  onClearReady,
}: {
  items: GeneratedExploration[]
  pendingPrompts: string[]
  open: boolean
  onOpenChange: (value: boolean) => void
  onSelect: (id: string) => void
  onDismiss: (id: string) => void
  onClearReady: () => void
}) {
  const workingCount =
    items.filter(isExplorationWorking).length + pendingPrompts.length
  const readyItems = items.filter((item) => !isExplorationWorking(item))
  const total = items.length + pendingPrompts.length

  if (total === 0) return null

  return (
    <div
      className="animate-chrome-in pointer-events-none fixed left-4 z-40 flex flex-col items-start"
      style={{ bottom: GENERATIONS_DOCK_BOTTOM }}
    >
      <div
        className={cn(
          'bg-background/90 border-border/70 pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 ease-out',
          open ? 'w-72' : 'w-auto',
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="hover:bg-muted/40 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left"
        >
          <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full">
            {workingCount > 0 ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </span>
          <span className="text-foreground shrink-0 text-[12px] font-medium">
            {workingCount > 0
              ? `${workingCount} generating`
              : `${readyItems.length} ready`}
          </span>
          {!open && readyItems.length > 0 && workingCount > 0 ? (
            <span className="text-muted-foreground shrink-0 text-[11px]">
              · {readyItems.length} ready
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'text-muted-foreground ml-auto size-3.5 shrink-0 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>

        {open ? (
          <div className="border-border/60 max-h-72 space-y-1 overflow-y-auto border-t p-1.5">
            {pendingPrompts.map((text, index) => (
              <div
                key={`pending-${index}-${text}`}
                className="bg-muted/40 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded">
                  <Loader2 className="text-primary size-3.5 animate-spin" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-[12px] font-medium leading-4">
                    Submitting
                  </p>
                  <p className="text-muted-foreground truncate text-[10px] leading-4">
                    {text}
                  </p>
                </div>
              </div>
            ))}
            {items.map((item) => (
              <DockItem
                key={item.id}
                item={item}
                onSelect={() => onSelect(item.id)}
                onDismiss={() => onDismiss(item.id)}
              />
            ))}
            {readyItems.length > 1 ? (
              <button
                type="button"
                onClick={onClearReady}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/40 mt-1 inline-flex h-7 w-full cursor-pointer items-center justify-center rounded-md text-[11px] transition-colors"
              >
                Clear finished
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DockItem({
  item,
  onSelect,
  onDismiss,
}: {
  item: GeneratedExploration
  onSelect: () => void
  onDismiss: () => void
}) {
  const working = isExplorationWorking(item)
  const label = statusLabel(item)
  const ready = !working && item.status === 'ready'
  const failed =
    item.status === 'failed' ||
    item.status === 'canceled' ||
    item.modelStatus === 'failed'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      className="hover:bg-muted/40 group relative flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors"
    >
      <div className="bg-muted relative size-9 shrink-0 overflow-hidden rounded">
        <PreviewArt exploration={item} />
        {working ? (
          <div className="bg-background/55 absolute inset-0 flex items-center justify-center">
            <Loader2 className="text-primary size-3.5 animate-spin" />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-[12px] font-medium leading-4">
          {item.title}
        </p>
        <p
          className={cn(
            'truncate text-[10px] leading-4',
            ready
              ? 'text-primary'
              : failed
                ? 'text-destructive'
                : 'text-muted-foreground',
          )}
        >
          {ready
            ? 'Ready · tap to view'
            : failed
              ? (label ?? 'Failed')
              : (label ?? 'Working')}
        </p>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDismiss()
        }}
        aria-label="Dismiss"
        className="text-muted-foreground/60 hover:bg-muted/70 hover:text-foreground flex size-6 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function FloatingSettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border/70 fixed right-4 top-4 z-20 flex size-9 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur transition-colors"
        >
          <Settings className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Settings</TooltipContent>
    </Tooltip>
  )
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()

  const [view, setView] = useState<ViewKind>('worlds')
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [generateOpen, setGenerateOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [pinnedCategoryId, setPinnedCategoryId] = useState<string | null>(null)
  const [quality, setQuality] = useState<ImageQuality>('medium')
  const [dialogModelProvider, setDialogModelProvider] =
    useState<ModelProvider>('fal')
  const [sampleIndex, setSampleIndex] = useState(0)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [retryingBackgroundId, setRetryingBackgroundId] = useState<
    string | null
  >(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => new Set())
  const [pendingSubmissions, setPendingSubmissions] = useState<string[]>([])
  const [dockOpen, setDockOpen] = useState(false)

  const libraryQuery = useQuery({
    queryKey: ['microscope-library', workspaceId],
    queryFn: async () =>
      parseJson<LibraryResponse>(
        await fetchWithWorkspace('/api/library'),
        'Microscope library could not be loaded.',
      ),
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.generated.some((item) => isExplorationWorking(item))
        ? 2500
        : false
    },
  })

  const settingsQuery = useQuery({
    queryKey: ['microscope-settings', workspaceId],
    queryFn: async () =>
      parseJson<MicroscopeSettings>(
        await fetchWithWorkspace('/api/settings'),
        'Microscope settings could not be loaded.',
      ),
  })

  const settings = { ...DEFAULT_SETTINGS, ...settingsQuery.data }

  useEffect(() => {
    if (!generateOpen) {
      setQuality(settings.quality)
      setDialogModelProvider(settings.modelProvider)
    }
  }, [generateOpen, settings.modelProvider, settings.quality])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:chat-state') return
      const safePadding = Number(event.data.safePadding)
      if (!Number.isFinite(safePadding)) return
      document.documentElement.style.setProperty(
        '--microscope-action-dock-safe-padding',
        `${Math.max(0, safePadding)}px`,
      )
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const settingsMutation = useMutation({
    mutationFn: async (next: MicroscopeSettings) =>
      parseJson<MicroscopeSettings>(
        await fetchWithWorkspace('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        }),
        'Microscope settings could not be saved.',
      ),
    onMutate: (next) => {
      queryClient.setQueryData(['microscope-settings', workspaceId], next)
    },
    onSuccess: (next) => {
      queryClient.setQueryData(['microscope-settings', workspaceId], next)
    },
  })

  const modelProviderPreferenceMutation = useMutation({
    mutationFn: async (input: {
      explorationId: string
      modelProvider: ModelProvider
    }) =>
      parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(
            input.explorationId,
          )}/model-provider`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelProvider: input.modelProvider }),
          },
        ),
        'Microscope model provider preference could not be saved.',
      ),
    onSuccess: (response) => {
      queryClient.setQueryData<LibraryResponse>(
        ['microscope-library', workspaceId],
        (current) =>
          current
            ? {
                ...current,
                generated: current.generated.map((item) =>
                  item.id === response.exploration.id
                    ? response.exploration
                    : item,
                ),
              }
            : current,
      )
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (input: {
      prompt: string
      quality: ImageQuality
      modelProvider: ModelProvider
      categoryId?: string
    }) => {
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace('/api/explorations/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: input.prompt,
            categoryId: input.categoryId,
            quality: input.quality,
            modelProvider: input.modelProvider,
          }),
        }),
        'Microscope could not start image generation.',
      )
    },
    onSuccess: (response) => {
      setTrackedIds((prev) => {
        const next = new Set(prev)
        next.add(response.exploration.id)
        return next
      })
      setPendingSubmissions((prev) => (prev.length > 0 ? prev.slice(1) : prev))
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
    },
    onError: () => {
      setPendingSubmissions((prev) => (prev.length > 0 ? prev.slice(1) : prev))
    },
  })

  const materializeMutation = useMutation({
    mutationFn: async (specimen: Specimen) => {
      setRegeneratingId(specimen.id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/specimens/${encodeURIComponent(specimen.id)}/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quality: settings.quality,
              modelProvider: settings.modelProvider,
            }),
          },
        ),
        'Microscope could not start image generation.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setRegeneratingId(null),
  })

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      setRegeneratingId(id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(id)}/regenerate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quality: settings.quality,
              modelProvider: settings.modelProvider,
            }),
          },
        ),
        'Microscope could not restart generation.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setRegeneratingId(null),
  })

  const regenerateModelMutation = useMutation({
    mutationFn: async (input: {
      id: string
      modelProvider?: ModelProvider
    }) => {
      setRegeneratingId(input.id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(input.id)}/regenerate-model`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quality: settings.quality,
              modelProvider: input.modelProvider ?? settings.modelProvider,
            }),
          },
        ),
        'Microscope could not restart 3D model generation.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setRegeneratingId(null),
  })

  const retryBackgroundMutation = useMutation({
    mutationFn: async (id: string) => {
      setRetryingBackgroundId(id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(id)}/retry-background`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quality: settings.quality,
              modelProvider: settings.modelProvider,
            }),
          },
        ),
        'Microscope could not retry background removal.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setRetryingBackgroundId(null),
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      setCancelingId(id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(id)}/cancel`,
          {
            method: 'POST',
          },
        ),
        'Microscope could not cancel generation.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setCancelingId(null),
  })

  const moveMutation = useMutation({
    mutationFn: async (input: { id: string; categoryId: string }) => {
      setMovingId(input.id)
      return parseJson<GenerateExplorationResponse>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(input.id)}/move`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: input.categoryId }),
          },
        ),
        'Microscope could not move the exploration.',
      )
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      selectExploration(response.exploration, 'none')
    },
    onSettled: () => setMovingId(null),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingId(id)
      return parseJson<{ ok: boolean }>(
        await fetchWithWorkspace(
          `/api/explorations/${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
          },
        ),
        'Microscope could not delete the exploration.',
      )
    },
    onSuccess: (_response, id) => {
      setTrackedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setSelectedId(null)
      void queryClient.invalidateQueries({
        queryKey: ['microscope-library', workspaceId],
      })
      if (activeCategoryId) goWorld(activeCategoryId, 'pop')
      else goWorlds('reset')
    },
    onSettled: () => setDeletingId(null),
  })

  const data = libraryQuery.data ?? {
    categories: CATEGORIES,
    specimens: SPECIMENS,
    generated: [],
  }

  const allExplorations = useMemo<Exploration[]>(
    () => [...data.generated, ...data.specimens],
    [data.generated, data.specimens],
  )

  const trackedExplorations = useMemo<GeneratedExploration[]>(
    () => data.generated.filter((item) => trackedIds.has(item.id)),
    [data.generated, trackedIds],
  )

  const visibleDockExplorations = useMemo<GeneratedExploration[]>(() => {
    if (view !== 'specimen' || !selectedId) return trackedExplorations
    return trackedExplorations.filter((item) => item.id !== selectedId)
  }, [selectedId, trackedExplorations, view])

  useEffect(() => {
    if (
      visibleDockExplorations.length === 0 &&
      pendingSubmissions.length === 0
    ) {
      setDockOpen(false)
    }
  }, [visibleDockExplorations.length, pendingSubmissions.length])

  function dismissTracked(id: string) {
    setTrackedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function clearReadyTracked() {
    setTrackedIds((prev) => {
      const next = new Set<string>()
      for (const item of data.generated) {
        if (prev.has(item.id) && isExplorationWorking(item)) {
          next.add(item.id)
        }
      }
      return next
    })
  }

  function handleDockSelect(id: string) {
    dismissTracked(id)
    goSpecimen(id)
  }

  const activeCategory = activeCategoryId
    ? categoryById(activeCategoryId, data.categories)
    : undefined

  const selected = selectedId
    ? allExplorations.find((item) => item.id === selectedId)
    : undefined

  useEffect(() => {
    if (!selected) return
    setChatInstructions(
      `User is exploring "${selected.title}" (${categoryById(selected.categoryId, data.categories)?.name ?? 'Microscope'}, ${compactScale(selected.scale)}). Help them inspect it further, suggest related specimens, or propose new prompts.`,
    )
  }, [selected, data.categories])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSampleIndex((index) => (index + 1) % PROMPT_SAMPLES.length)
    }, 20_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (view === 'specimen') setSettingsOpen(false)
  }, [view])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  const samplePrompt = PROMPT_SAMPLES[sampleIndex] ?? PROMPT_SAMPLES[0]
  const visibleSamples = useMemo(
    () =>
      Array.from(
        { length: Math.min(4, PROMPT_SAMPLES.length) },
        (_, index) =>
          PROMPT_SAMPLES[(sampleIndex + index) % PROMPT_SAMPLES.length],
      ),
    [sampleIndex],
  )

  const goWorlds = useCallback((sync: NavigationSync = 'reset') => {
    if (sync === 'pop') popMoldableNavigation()
    if (sync === 'reset') resetMoldableNavigation()
    setDirection('back')
    setView('worlds')
    setActiveCategoryId(null)
    setSelectedId(null)
  }, [])

  const goWorld = useCallback(
    (id: string, sync: NavigationSync = 'push') => {
      if (sync === 'push') {
        pushMoldableNavigation({
          id: `world:${id}`,
          title: categoryById(id, data.categories)?.name ?? 'World',
        })
      } else if (sync === 'pop') {
        popMoldableNavigation()
      }

      setDirection(view === 'specimen' ? 'back' : 'forward')
      setActiveCategoryId(id)
      setView('world')
    },
    [data.categories, view],
  )

  const selectExploration = useCallback(
    (exploration: Exploration, sync: NavigationSync = 'push') => {
      if (sync === 'push') {
        if (view === 'worlds' || exploration.categoryId !== activeCategoryId) {
          pushMoldableNavigation({
            id: `world:${exploration.categoryId}`,
            title:
              categoryById(exploration.categoryId, data.categories)?.name ??
              'World',
          })
        }
        pushMoldableNavigation({
          id: `specimen:${exploration.id}`,
          title: exploration.title,
        })
      }

      setDirection('forward')
      setSelectedId(exploration.id)
      if (exploration.categoryId !== activeCategoryId) {
        setActiveCategoryId(exploration.categoryId)
      }
      setView('specimen')
    },
    [activeCategoryId, data.categories, view],
  )

  const goSpecimen = useCallback(
    (id: string) => {
      const exploration = allExplorations.find((item) => item.id === id)
      if (!exploration) return
      selectExploration(exploration)
    },
    [allExplorations, selectExploration],
  )

  useMoldableNavigationPop((message) => {
    const entryId = message.entry?.id ?? ''

    if (entryId.startsWith('specimen:')) {
      if (activeCategoryId) goWorld(activeCategoryId, 'none')
      else goWorlds('none')
      return
    }

    if (entryId.startsWith('world:')) {
      goWorlds('none')
      return
    }

    if (view === 'specimen' && activeCategoryId) {
      goWorld(activeCategoryId, 'none')
      return
    }

    goWorlds('none')
  })

  const microscopeCommands = useMemo<AppCommand[]>(() => {
    const base: AppCommand[] = [
      {
        id: 'microscope.generate',
        label: 'Generate exploration',
        description: 'Open the generate dialog and create a new specimen',
        icon: 'plus',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'microscope.generate',
          payload: null,
        },
      },
      {
        id: 'microscope.settings',
        label: '3D model settings',
        description: 'Image quality, 3D model provider, and other defaults',
        icon: 'settings',
        group: 'Actions',
        action: {
          type: 'message',
          command: 'microscope.settings',
          payload: null,
        },
      },
      {
        id: 'microscope.show-worlds',
        label: 'Browse worlds',
        description: 'Return to the worlds overview',
        icon: 'folder',
        group: 'Navigation',
        action: {
          type: 'message',
          command: 'microscope.show-worlds',
          payload: null,
        },
      },
    ]

    const worldCommands: AppCommand[] = data.categories
      .filter((category) => category.id !== activeCategoryId)
      .map((category) => ({
        id: `microscope.open-world.${category.id}`,
        label: category.name,
        description: `Open world • ${category.description}`,
        icon: 'folder',
        group: 'Worlds',
        action: {
          type: 'message',
          command: 'microscope.open-world',
          payload: { categoryId: category.id },
        },
      }))

    const specimenCommands: AppCommand[] = allExplorations
      .filter((item) => item.id !== selectedId)
      .map((item) => {
        const categoryName =
          categoryById(item.categoryId, data.categories)?.name ?? 'Microscope'
        const isGen = isGenerated(item)
        return {
          id: `microscope.open-specimen.${item.id}`,
          label: item.title,
          description: `${isGen ? 'Generated' : 'Library'} • ${categoryName}`,
          icon: isGen ? 'sparkles' : 'box',
          group: 'Objects',
          action: {
            type: 'message',
            command: 'microscope.open-specimen',
            payload: { explorationId: item.id },
          },
        }
      })

    return [...base, ...worldCommands, ...specimenCommands]
  }, [data.categories, allExplorations, activeCategoryId, selectedId])

  useMoldableAppCommands('microscope', microscopeCommands)
  useMoldableCommands({
    'microscope.generate': () => openGenerate(),
    'microscope.settings': () => setSettingsOpen(true),
    'microscope.show-worlds': () => goWorlds('none'),
    'microscope.open-world': (payload?: unknown) => {
      const categoryId =
        payload && typeof payload === 'object' && 'categoryId' in payload
          ? String((payload as { categoryId?: string }).categoryId ?? '')
          : ''
      if (categoryId) goWorld(categoryId, 'push')
    },
    'microscope.open-specimen': (payload?: unknown) => {
      const explorationId =
        payload && typeof payload === 'object' && 'explorationId' in payload
          ? String((payload as { explorationId?: string }).explorationId ?? '')
          : ''
      if (explorationId) goSpecimen(explorationId)
    },
  })

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = prompt.trim()
    if (trimmed.length < 3) return
    setPendingSubmissions((prev) => [...prev, trimmed])
    generateMutation.mutate({
      prompt: trimmed,
      quality,
      modelProvider: dialogModelProvider,
      categoryId: pinnedCategoryId ?? undefined,
    })
    setPrompt('')
    setPinnedCategoryId(null)
    setGenerateOpen(false)
    setDockOpen(true)
  }

  function openGenerate() {
    setPinnedCategoryId(null)
    setQuality(settings.quality)
    setDialogModelProvider(settings.modelProvider)
    setGenerateOpen(true)
  }

  function openGenerateWithPrompt(nextPrompt: string, categoryId?: string) {
    setPrompt(nextPrompt)
    setPinnedCategoryId(categoryId ?? null)
    setQuality(settings.quality)
    setDialogModelProvider(settings.modelProvider)
    setGenerateOpen(true)
  }

  function updateModelProvider(modelProvider: ModelProvider) {
    settingsMutation.mutate({
      ...settings,
      modelProvider,
    })
  }

  function updateDefaultQuality(quality: MicroscopeSettings['quality']) {
    settingsMutation.mutate({
      ...settings,
      quality,
    })
    if (!generateOpen) {
      setQuality(quality)
    }
  }

  function updateAutoRotate(autoRotate: boolean) {
    settingsMutation.mutate({
      ...settings,
      autoRotate,
    })
  }

  function updateExplorationModelProvider(
    explorationId: string,
    modelProvider: ModelProvider,
  ) {
    modelProviderPreferenceMutation.mutate({ explorationId, modelProvider })
  }

  return (
    <main className="bg-background text-foreground flex h-full min-h-0 overflow-hidden">
      {view === 'worlds' ? (
        <ViewShell direction={direction} keyId="worlds">
          <WorldsView
            categories={data.categories}
            specimens={data.specimens}
            generated={data.generated}
            search={search}
            onSearch={setSearch}
            onWorld={goWorld}
            onSpecimen={goSpecimen}
            onGenerate={openGenerate}
            samplePrompt={samplePrompt}
          />
        </ViewShell>
      ) : null}

      {view === 'world' && activeCategory ? (
        <ViewShell direction={direction} keyId={`world-${activeCategory.id}`}>
          <WorldView
            category={activeCategory}
            specimens={data.specimens}
            generated={data.generated}
            onBack={() => goWorlds('pop')}
            onSpecimen={goSpecimen}
            onGenerate={openGenerate}
            onPromptGenerate={openGenerateWithPrompt}
            samplePrompt={samplePrompt}
          />
        </ViewShell>
      ) : null}

      {view === 'specimen' && selected ? (
        <ViewShell direction={direction} keyId={`specimen-${selected.id}`}>
          <SpecimenView
            exploration={selected}
            category={categoryById(selected.categoryId, data.categories)}
            categories={data.categories}
            onBack={() => {
              if (activeCategoryId) goWorld(activeCategoryId, 'pop')
              else goWorlds('pop')
            }}
            onGenerate={openGenerate}
            onPromptGenerate={openGenerateWithPrompt}
            onRegenerateAll={
              isGenerated(selected)
                ? () => regenerateMutation.mutate(selected.id)
                : () => materializeMutation.mutate(selected)
            }
            onRegenerateModel={
              isGenerated(selected)
                ? (modelProvider) =>
                    regenerateModelMutation.mutate({
                      id: selected.id,
                      modelProvider,
                    })
                : undefined
            }
            onRetryBackground={
              isGenerated(selected)
                ? () => retryBackgroundMutation.mutate(selected.id)
                : undefined
            }
            onMoveCategory={
              isGenerated(selected)
                ? (categoryId) =>
                    moveMutation.mutate({ id: selected.id, categoryId })
                : undefined
            }
            onDelete={
              isGenerated(selected)
                ? () => deleteMutation.mutate(selected.id)
                : undefined
            }
            onCancel={
              isGenerated(selected) && isExplorationWorking(selected)
                ? () => cancelMutation.mutate(selected.id)
                : undefined
            }
            autoRotate={settings.autoRotate}
            onAutoRotateChange={updateAutoRotate}
            onModelProviderPreference={updateExplorationModelProvider}
            regenerating={
              regeneratingId === selected.id &&
              (regenerateMutation.isPending ||
                regenerateModelMutation.isPending ||
                materializeMutation.isPending)
            }
            retryingBackground={
              retryingBackgroundId === selected.id &&
              retryBackgroundMutation.isPending
            }
            moving={movingId === selected.id && moveMutation.isPending}
            deleting={deletingId === selected.id && deleteMutation.isPending}
            canceling={cancelingId === selected.id && cancelMutation.isPending}
          />
        </ViewShell>
      ) : null}

      <GenerateDialog
        open={generateOpen}
        onOpenChange={(open) => {
          setGenerateOpen(open)
          if (!open) setPinnedCategoryId(null)
        }}
        prompt={prompt}
        onPrompt={setPrompt}
        quality={quality}
        onQuality={setQuality}
        samplePrompt={samplePrompt}
        samples={visibleSamples}
        onSubmit={handleGenerate}
        pending={generateMutation.isPending}
        modelProvider={dialogModelProvider}
        onModelProvider={(provider) => {
          setDialogModelProvider(provider)
          updateModelProvider(provider)
        }}
        providerPending={settingsMutation.isPending}
      />
      {view !== 'specimen' ? (
        <FloatingSettingsButton onClick={() => setSettingsOpen(true)} />
      ) : null}
      <GenerationsDock
        items={visibleDockExplorations}
        pendingPrompts={pendingSubmissions}
        open={dockOpen}
        onOpenChange={setDockOpen}
        onSelect={handleDockSelect}
        onDismiss={dismissTracked}
        onClearReady={clearReadyTracked}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onProvider={updateModelProvider}
        onQuality={updateDefaultQuality}
        pending={settingsMutation.isPending}
      />
    </main>
  )
}
