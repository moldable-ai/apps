export type ScaleLevel =
  | 'atomic'
  | 'molecular'
  | 'microscopic'
  | 'organ'
  | 'organism'
  | 'ecosystem'
  | 'planetary'
  | 'cosmic'
  | 'system'

export type ModelKind =
  | 'cell'
  | 'organism'
  | 'branching'
  | 'terrain'
  | 'molecule'
  | 'weather'
  | 'astronomy'
  | 'machine'
  | 'image-relief'

export type ModelRecipe = {
  kind: ModelKind
  seed: number
  palette: string[]
  density: number
  layers: number
  complexity: number
}

export type Category = {
  id: string
  name: string
  description: string
  scale: ScaleLevel
  prompts: string[]
}

export type Specimen = {
  id: string
  source: 'library'
  title: string
  subtitle: string
  description: string
  categoryId: string
  scale: ScaleLevel
  model: ModelRecipe
  tags: string[]
  previewTone: string
  observations: string[]
  details: Array<{ label: string; value: string }>
  prompts: string[]
}

export type VisualStyle = 'educational' | 'realistic'

export type GeneratedExploration = {
  id: string
  source: 'generated'
  title: string
  subtitle: string
  description: string
  prompt: string
  categoryId: string
  scale: ScaleLevel
  visualStyle?: VisualStyle
  status: 'generating' | 'ready' | 'failed' | 'canceled'
  backgroundStatus?: 'pending' | 'removing' | 'ready' | 'failed' | 'skipped'
  modelStatus?: 'pending' | 'rendering' | 'ready' | 'failed' | 'skipped'
  errorMessage?: string
  backgroundErrorMessage?: string
  modelErrorMessage?: string
  sourceImageFileName?: string
  sourceImageUrl?: string | null
  imageFileName?: string
  imageUrl: string | null
  modelFileName?: string
  modelMaterialFileName?: string
  modelTextureFileName?: string
  modelUrl?: string | null
  modelMaterialUrl?: string | null
  modelTextureUrl?: string | null
  modelProvider?: ModelProvider
  selectedModelProvider?: ModelProvider
  modelVariants?: ModelVariant[]
  modelTaskId?: string
  model: ModelRecipe
  quality: ImageQuality
  createdAt: string
  updatedAt: string
  observations: string[]
  details: Array<{ label: string; value: string }>
  prompts: string[]
}

export type Exploration = Specimen | GeneratedExploration

export type ImageQuality = 'low' | 'medium' | 'high' | 'auto'

export type ModelProvider = 'fal' | 'tripo'

export type ModelVariant = {
  provider: ModelProvider
  status: 'pending' | 'rendering' | 'ready' | 'failed' | 'skipped'
  taskId?: string
  fileName?: string
  materialFileName?: string
  textureFileName?: string
  url?: string | null
  materialUrl?: string | null
  textureUrl?: string | null
  modelDetail?: string
  errorMessage?: string
  updatedAt: string
}

export type MicroscopeSettings = {
  modelProvider: ModelProvider
  quality: Extract<ImageQuality, 'medium' | 'high'>
  autoRotate: boolean
}

export type GenerateExplorationInput = {
  prompt: string
  categoryId?: string
  quality?: ImageQuality
  modelProvider?: ModelProvider
  visualStyle?: VisualStyle
}

export type GenerateExplorationResponse = {
  exploration: GeneratedExploration
}

export type LibraryResponse = {
  categories: Category[]
  specimens: Specimen[]
  generated: GeneratedExploration[]
}
