export interface Recipe {
  id: string
  title: string
  description: string
  imageUrl?: string
  ingredients: string[]
  instructions: string
  category: string
  cookingTime?: string
  /** Optional structured prep/cook split — purely cosmetic if absent. */
  prepTime?: string
  /** Free-form yield, e.g. "Serves 4" or "12 cookies". */
  servings?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  /** Where the recipe came from (URL or attribution). */
  sourceUrl?: string
  /** Lightweight free-form tags, distinct from the single `category`. */
  tags?: string[]
  isFavorite: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

/**
 * A collection of recipes. Modeled on the Piano app's folders: the folder owns
 * an ordered list of recipe ids, so a recipe lives in at most one folder and
 * "uncollected" recipes simply appear in no folder. Reordering is persisted via
 * `sortOrder`.
 */
export interface Folder {
  id: string
  name: string
  /** Accent color (hex) used for the folder chip + card tone. */
  tone: string
  recipeIds: string[]
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export interface FoldersResponse {
  folders: Folder[]
}

const FOLDER_TONES = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
]

/** Deterministically pick a warm accent tone from a folder's name. */
export function toneFromSeed(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return FOLDER_TONES[Math.abs(hash) % FOLDER_TONES.length] ?? FOLDER_TONES[0]
}
