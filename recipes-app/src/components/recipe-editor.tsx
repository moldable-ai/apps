'use client'

import { ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import {
  type ClipboardEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MarkdownEditor } from '@moldable-ai/editor'
import { Button, Input, Label, cn } from '@moldable-ai/ui'
import type { Recipe } from '@/lib/types'
import { useRecipeMedia } from '@/client/use-recipe-media'

interface RecipeEditorProps {
  recipe?: Recipe | null
  onSave: (recipe: Partial<Recipe>) => Promise<void> | void
  onCancel: () => void
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const

function imageFilesFromList(list: FileList | File[]): File[] {
  return Array.from(list).filter((file) => file.type.startsWith('image/'))
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

// ---------------------------------------------------------------------------
// Hero image field — drag, drop, paste, or click to upload.
// ---------------------------------------------------------------------------

function HeroImageField({
  value,
  onChange,
}: {
  value: string
  onChange: (src: string) => void
}) {
  const { resolveMediaUrl, uploadFile, uploadPaths } = useRecipeMedia()
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const upload = useCallback(
    async (file: File) => {
      setBusy(true)
      setError(null)
      try {
        const media = await uploadFile(file)
        onChange(media.src)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that image")
      } finally {
        setBusy(false)
      }
    },
    [onChange, uploadFile],
  )

  // Desktop (Finder) drops arrive as absolute paths via postMessage, the same
  // protocol the Images and Piano apps use.
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.type === 'moldable:file-drag-over') {
        setDragging(true)
        return
      }
      if (data.type === 'moldable:file-drag-leave') {
        dragDepth.current = 0
        setDragging(false)
        return
      }
      if (data.type !== 'moldable:file-drop') return
      dragDepth.current = 0
      setDragging(false)
      const paths = Array.isArray(data.paths) ? (data.paths as string[]) : []
      if (paths.length === 0) return
      setBusy(true)
      setError(null)
      try {
        const media = await uploadPaths(paths)
        if (media[0]) onChange(media[0].src)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add that image")
      } finally {
        setBusy(false)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onChange, uploadPaths])

  const onDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const file = imageFilesFromList(event.dataTransfer.files)[0]
    if (file) void upload(file)
  }

  const onPaste = (event: ClipboardEvent) => {
    const file = imageFilesFromList(
      Array.from(event.clipboardData.files ?? []),
    )[0]
    if (file) {
      event.preventDefault()
      void upload(file)
    }
  }

  const preview = resolveMediaUrl(value)

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        dragDepth.current = Math.max(0, dragDepth.current - 1)
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={onDrop}
      onPaste={onPaste}
      className="group relative"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      {preview ? (
        <div className="border-border relative aspect-[16/9] w-full overflow-hidden rounded-2xl border">
          <img src={preview} alt="Recipe" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 size-3.5" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => onChange('')}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Remove
            </Button>
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/30 hover:border-foreground/30 hover:bg-muted/50',
          )}
        >
          {busy ? (
            <Loader2 className="text-muted-foreground size-7 animate-spin" />
          ) : (
            <ImagePlus className="text-muted-foreground size-7" />
          )}
          <span className="text-foreground text-sm font-medium">
            {dragging ? 'Drop to add photo' : 'Add a photo'}
          </span>
          <span className="text-muted-foreground text-xs">
            Drag &amp; drop, paste, or click to upload
          </span>
        </button>
      )}
      {error && <p className="text-destructive mt-2 text-xs">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export function RecipeEditor({ recipe, onSave, onCancel }: RecipeEditorProps) {
  const { resolveMediaUrl, uploadFile } = useRecipeMedia()

  const [title, setTitle] = useState(recipe?.title ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl ?? '')
  const [category, setCategory] = useState(recipe?.category ?? '')
  const [cookingTime, setCookingTime] = useState(recipe?.cookingTime ?? '')
  const [prepTime, setPrepTime] = useState(recipe?.prepTime ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? '')
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? '')
  const [tags, setTags] = useState(recipe?.tags?.join(', ') ?? '')
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>(
    recipe?.difficulty ?? 'Medium',
  )
  const [ingredients, setIngredients] = useState(
    recipe?.ingredients?.join('\n') ?? '',
  )
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const onMediaUpload = useCallback(
    async (file: File) => {
      const media = await uploadFile(file)
      return { src: media.src, kind: 'image' as const, altText: media.altText }
    },
    [uploadFile],
  )

  const handleSubmit = async () => {
    if (!title.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl || undefined,
        category: category.trim() || 'Uncategorized',
        cookingTime: cookingTime.trim() || undefined,
        prepTime: prepTime.trim() || undefined,
        servings: servings.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        difficulty,
        ingredients: ingredients
          .split('\n')
          .map((i) => i.trim())
          .filter(Boolean),
        instructions: instructions.trim(),
      })
    } catch (error) {
      console.error('Failed to save recipe:', error)
    } finally {
      if (mountedRef.current) setIsSaving(false)
    }
  }

  const ingredientCount = ingredients.split('\n').filter((i) => i.trim()).length

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <div className="border-border flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {recipe ? 'Edit recipe' : 'New recipe'}
          </h2>
          <p className="text-muted-foreground text-xs">
            Capture the dish, then make it beautiful.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
          className="mx-auto max-w-3xl space-y-8 px-6 pb-[var(--chat-safe-padding)] pt-6"
        >
          <HeroImageField value={imageUrl} onChange={setImageUrl} />

          <div className="space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe title"
              required
              className="h-12 rounded-xl border-transparent bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short, tempting description…"
              rows={2}
              className="placeholder:text-muted-foreground w-full resize-none border-0 bg-transparent px-0 text-base leading-relaxed outline-none"
            />
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs">
                Category
              </Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Pasta"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="servings" className="text-xs">
                Servings
              </Label>
              <Input
                id="servings"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="Serves 4"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prep" className="text-xs">
                Prep time
              </Label>
              <Input
                id="prep"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="15 min"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cook" className="text-xs">
                Cook time
              </Label>
              <Input
                id="cook"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                placeholder="45 min"
              />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label className="text-xs">Difficulty</Label>
              <div className="flex gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'h-9 flex-1 cursor-pointer rounded-lg border text-xs font-medium transition-colors',
                      difficulty === d
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="ingredients">Ingredients</Label>
              <span className="text-muted-foreground text-xs">
                {ingredientCount} {ingredientCount === 1 ? 'item' : 'items'} ·
                one per line
              </span>
            </div>
            <textarea
              id="ingredients"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder={'2 cups flour\n1 tsp salt\n3 large eggs'}
              className="border-input bg-background focus-visible:ring-ring min-h-[180px] w-full rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none focus-visible:ring-2"
            />
          </div>

          {/* Instructions — rich markdown with inline step images */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Instructions</Label>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Sparkles className="size-3" />
                Markdown · drag images into steps
              </span>
            </div>
            <div className="border-input focus-within:ring-ring overflow-hidden rounded-xl border focus-within:ring-2">
              <MarkdownEditor
                value={instructions}
                onChange={setInstructions}
                onMediaUpload={onMediaUpload}
                resolveMediaUrl={resolveMediaUrl}
                placeholder="1. Preheat the oven to 200°C…"
                minHeight="200px"
                className="px-4 py-3 text-sm"
                hideMarkdownHint
              />
            </div>
          </div>

          {/* Source + tags */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-xs">
                Source (optional)
              </Label>
              <Input
                id="source"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https:// or who it's from"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags" className="text-xs">
                Tags (optional)
              </Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vegetarian, quick, comfort"
              />
            </div>
          </div>
        </form>
      </div>

      <div className="border-border flex shrink-0 items-center justify-end gap-2 border-t px-6 py-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!title.trim() || isSaving}
          className="rounded-full px-5"
        >
          {recipe ? 'Save changes' : 'Add recipe'}
        </Button>
      </div>
    </div>
  )
}
