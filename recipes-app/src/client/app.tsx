'use client'

import { useQueryClient } from '@tanstack/react-query'
import {
  ChefHat,
  FolderPlus,
  Heart,
  Plus,
  Search,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import type { Recipe } from '../lib/types'
import { FolderCard } from '@/components/folder-card'
import { NewFolderDialog } from '@/components/new-folder-dialog'
import { RecipeCard } from '@/components/recipe-card'
import { RecipeDetail } from '@/components/recipe-detail'
import { RecipeEditor } from '@/components/recipe-editor'
import { useFolders } from './use-folders'
import { useRecipes } from './use-recipes'

type Scope = 'library' | 'favorites'

export default function RecipesPage() {
  const queryClient = useQueryClient()
  const { workspaceId } = useWorkspace()
  const {
    recipes,
    isLoading,
    createRecipe,
    updateRecipe,
    setFavorite,
    deleteRecipe,
  } = useRecipes()
  const { folders, addFolder, deleteFolder, renameFolder, moveRecipe } =
    useFolders()

  const [scope, setScope] = useState<Scope>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const deferredQuery = useDeferredValue(searchQuery)
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [pendingMoveRecipeId, setPendingMoveRecipeId] = useState<string | null>(
    null,
  )
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState<
    string | null
  >(null)

  // --- Live updates: when chat mutates our data via RPC, the host posts
  // `moldable:app-api-changed` into this iframe. Refetch so the UI reflects it. ---
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'moldable:app-api-changed') return
      queryClient.invalidateQueries({ queryKey: ['recipes', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [queryClient, workspaceId])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  // --- Derived data ---
  const liveRecipes = useMemo(
    () => recipes.filter((r) => !r.isDeleted),
    [recipes],
  )

  const recipeFolderById = useMemo(() => {
    const map = new Map<string, string>()
    for (const folder of folders) {
      for (const id of folder.recipeIds) map.set(id, folder.id)
    }
    return map
  }, [folders])

  const openFolder = openFolderId
    ? (folders.find((f) => f.id === openFolderId) ?? null)
    : null

  const recipeById = useMemo(
    () => new Map(liveRecipes.map((r) => [r.id, r])),
    [liveRecipes],
  )

  const matchesQuery = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return (recipe: Recipe) => {
      if (!q) return true
      return [
        recipe.title,
        recipe.description,
        recipe.category,
        ...(recipe.tags ?? []),
        ...recipe.ingredients,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    }
  }, [deferredQuery])

  const hasQuery = deferredQuery.trim().length > 0

  // The set of recipes currently displayed as cards.
  const scopedRecipes = useMemo(() => {
    if (hasQuery) return liveRecipes.filter(matchesQuery)
    if (scope === 'favorites') return liveRecipes.filter((r) => r.isFavorite)
    if (openFolder) {
      return openFolder.recipeIds
        .map((id) => recipeById.get(id))
        .filter((r): r is Recipe => Boolean(r))
    }
    // Default library: recipes not in any folder.
    return liveRecipes.filter((r) => !recipeFolderById.has(r.id))
  }, [
    hasQuery,
    liveRecipes,
    matchesQuery,
    scope,
    openFolder,
    recipeById,
    recipeFolderById,
  ])

  const showFolders =
    !hasQuery && scope === 'library' && !openFolder && folders.length > 0

  const favoritesCount = liveRecipes.filter((r) => r.isFavorite).length

  // --- Navigation ---
  const openRecipe = (recipe: Recipe) => {
    pushMoldableNavigation({ id: `recipe:${recipe.id}`, title: recipe.title })
    setSelectedRecipe(recipe)
  }
  const closeRecipe = () => {
    popMoldableNavigation()
    setSelectedRecipe(null)
  }
  const openEditor = (recipe?: Recipe) => {
    if (recipe && selectedRecipe?.id === recipe.id) popMoldableNavigation()
    pushMoldableNavigation({
      id: recipe ? `edit:${recipe.id}` : 'create',
      title: recipe ? `Edit ${recipe.title}` : 'New recipe',
    })
    setEditingRecipe(recipe ?? null)
    setIsCreating(!recipe)
    setSelectedRecipe(null)
  }
  const closeEditor = () => {
    popMoldableNavigation()
    setIsCreating(false)
    setEditingRecipe(null)
  }
  const enterFolder = (id: string) => {
    pushMoldableNavigation({ id: `folder:${id}`, title: 'Folder' })
    setOpenFolderId(id)
    setSearchQuery('')
  }
  const exitFolder = () => {
    popMoldableNavigation()
    setOpenFolderId(null)
  }

  useMoldableNavigationPop(() => {
    if (isCreating || editingRecipe) {
      setIsCreating(false)
      setEditingRecipe(null)
      return
    }
    if (selectedRecipe) {
      setSelectedRecipe(null)
      return
    }
    if (openFolderId) {
      setOpenFolderId(null)
      return
    }
  })

  // --- Mutations ---
  const handleSave = async (update: Partial<Recipe>) => {
    if (editingRecipe) {
      await updateRecipe({ id: editingRecipe.id, ...update })
    } else {
      const created = await createRecipe({
        title: update.title ?? 'Untitled recipe',
        ...update,
      })
      // Creating inside an open folder drops it straight in.
      if (created && openFolderId) {
        await moveRecipe(created.id, openFolderId)
      }
    }
    closeEditor()
  }

  const toggleFavorite = (recipe: Recipe) => {
    void setFavorite(recipe.id, !recipe.isFavorite)
    if (selectedRecipe?.id === recipe.id) {
      setSelectedRecipe({ ...selectedRecipe, isFavorite: !recipe.isFavorite })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    const id = pendingDeleteId
    setPendingDeleteId(null)
    if (selectedRecipe?.id === id) closeRecipe()
    await deleteRecipe(id)
  }

  const handleMove = (recipeId: string, folderId: string | null) => {
    void moveRecipe(recipeId, folderId)
  }

  const requestNewFolder = (recipeId?: string) => {
    setPendingMoveRecipeId(recipeId ?? null)
    setNewFolderOpen(true)
  }

  const handleCreateFolder = async (name: string) => {
    const folder = await addFolder(name)
    if (pendingMoveRecipeId && folder) {
      await moveRecipe(pendingMoveRecipeId, folder.id)
      setPendingMoveRecipeId(null)
    }
  }

  const confirmDeleteFolder = async () => {
    if (!pendingDeleteFolderId) return
    const id = pendingDeleteFolderId
    setPendingDeleteFolderId(null)
    if (openFolderId === id) exitFolder()
    await deleteFolder(id)
  }

  const pendingDeleteRecipe = pendingDeleteId
    ? (recipes.find((r) => r.id === pendingDeleteId) ?? null)
    : null
  const pendingDeleteFolder = pendingDeleteFolderId
    ? (folders.find((f) => f.id === pendingDeleteFolderId) ?? null)
    : null

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Utensils className="text-primary size-10 animate-pulse" />
          <p className="text-muted-foreground animate-pulse text-sm font-medium">
            Opening cookbook…
          </p>
        </div>
      </div>
    )
  }

  const emptyLibrary = liveRecipes.length === 0

  return (
    <div className="bg-background text-foreground flex min-h-0 min-h-screen w-full flex-col">
      {/* Header */}
      <header className="border-border/70 bg-background/80 sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="animate-recipe-chrome-in mx-auto w-full max-w-6xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>
              <p className="text-muted-foreground text-sm">
                The dishes you love to cook — beautifully kept.
              </p>
            </div>
            <Button onClick={() => openEditor()} className="rounded-full px-5">
              <Plus className="mr-1.5 size-4" />
              New recipe
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes, ingredients, tags…"
                className="bg-muted/50 focus-visible:bg-background h-10 rounded-full border-transparent pl-10 shadow-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setScope('library')
                  setOpenFolderId(null)
                }}
                className={cn(
                  'h-10 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors',
                  scope === 'library' && !openFolder
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('favorites')
                  setOpenFolderId(null)
                }}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors',
                  scope === 'favorites'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Heart
                  className={cn(
                    'size-3.5',
                    scope === 'favorites' && 'fill-current',
                  )}
                />
                Favorites
                {favoritesCount > 0 && (
                  <span className="opacity-70">{favoritesCount}</span>
                )}
              </button>
              <Button
                variant="outline"
                onClick={() => requestNewFolder()}
                className="h-10 rounded-full"
              >
                <FolderPlus className="mr-1.5 size-4" />
                New folder
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 pb-[var(--chat-safe-padding)] pt-8">
          {/* Folder breadcrumb */}
          {openFolder && (
            <div className="animate-recipe-chrome-in mb-6">
              <button
                type="button"
                onClick={exitFolder}
                className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-xs"
              >
                ← All recipes
              </button>
              <div className="flex items-center gap-3">
                <span
                  className="size-3 rounded-full"
                  style={{ background: openFolder.tone }}
                />
                <input
                  defaultValue={openFolder.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== openFolder.name)
                      void renameFolder(openFolder.id, v)
                    else e.target.value = openFolder.name
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  className="bg-transparent text-2xl font-semibold tracking-tight outline-none"
                  aria-label="Folder name"
                />
              </div>
            </div>
          )}

          {emptyLibrary ? (
            <EmptyState onCreate={() => openEditor()} />
          ) : scopedRecipes.length === 0 && !showFolders ? (
            <div className="border-border bg-muted/20 mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed px-8 py-20 text-center">
              <ChefHat className="text-muted-foreground/40 size-12" />
              <p className="text-lg font-semibold">
                {hasQuery
                  ? `No recipes match “${deferredQuery.trim()}”`
                  : scope === 'favorites'
                    ? 'No favorites yet'
                    : 'This folder is empty'}
              </p>
              <p className="text-muted-foreground max-w-sm text-sm">
                {hasQuery
                  ? 'Try a different title, ingredient, or tag.'
                  : scope === 'favorites'
                    ? 'Tap the heart on any recipe to keep it here.'
                    : 'Move recipes in using the ⋯ menu on any card.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {showFolders &&
                folders.map((folder, i) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    recipes={liveRecipes}
                    index={i}
                    onOpen={() => enterFolder(folder.id)}
                    onDelete={() => setPendingDeleteFolderId(folder.id)}
                  />
                ))}
              {scopedRecipes.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  folders={folders}
                  currentFolderId={recipeFolderById.get(recipe.id) ?? null}
                  index={showFolders ? i + folders.length : i}
                  onClick={() => openRecipe(recipe)}
                  onToggleFavorite={() => toggleFavorite(recipe)}
                  onMove={(folderId) => handleMove(recipe.id, folderId)}
                  onNewFolder={() => requestNewFolder(recipe.id)}
                  onDelete={() => setPendingDeleteId(recipe.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail dialog */}
      <Dialog
        open={!!selectedRecipe}
        onOpenChange={(open) => !open && closeRecipe()}
      >
        <DialogContent
          className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden p-0 sm:max-w-4xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Recipe details</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <RecipeDetail
              recipe={selectedRecipe}
              folders={folders}
              currentFolderId={recipeFolderById.get(selectedRecipe.id) ?? null}
              onEdit={() => openEditor(selectedRecipe)}
              onDelete={() => setPendingDeleteId(selectedRecipe.id)}
              onToggleFavorite={() => toggleFavorite(selectedRecipe)}
              onMove={(folderId) => handleMove(selectedRecipe.id, folderId)}
              onNewFolder={() => requestNewFolder(selectedRecipe.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Editor dialog */}
      <Dialog
        open={isCreating || !!editingRecipe}
        onOpenChange={(open) => !open && closeEditor()}
      >
        <DialogContent
          className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden p-0 sm:max-w-3xl"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {editingRecipe ? 'Edit recipe' : 'New recipe'}
            </DialogTitle>
          </DialogHeader>
          <RecipeEditor
            recipe={editingRecipe}
            onSave={handleSave}
            onCancel={closeEditor}
          />
        </DialogContent>
      </Dialog>

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={(open) => {
          setNewFolderOpen(open)
          if (!open) setPendingMoveRecipeId(null)
        }}
        onCreate={handleCreateFolder}
      />

      {/* Delete recipe */}
      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recipe?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteRecipe ? (
                <>
                  This deletes{' '}
                  <span className="text-foreground font-semibold">
                    {pendingDeleteRecipe.title}
                  </span>
                  .
                </>
              ) : (
                'This deletes the selected recipe.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder */}
      <AlertDialog
        open={!!pendingDeleteFolderId}
        onOpenChange={(open) => !open && setPendingDeleteFolderId(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingDeleteFolder?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The folder is removed. Its recipes return to your library —
              nothing is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteFolder}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="animate-recipe-fade-in mt-10 flex flex-col items-center gap-5 rounded-3xl px-8 py-24 text-center">
      <div className="bg-primary/10 flex size-20 items-center justify-center rounded-3xl">
        <ChefHat className="text-primary size-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your cookbook is empty
        </h2>
        <p className="text-muted-foreground mx-auto max-w-md">
          Add your first recipe — drag in a photo, write the steps in Markdown,
          or just ask Moldable chat to add one for you.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreate} className="rounded-full px-5">
          <Plus className="mr-1.5 size-4" />
          New recipe
        </Button>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
          <Sparkles className="size-3.5" />
          or ask chat to add one
        </span>
      </div>
    </div>
  )
}
